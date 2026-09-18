<?php
/**
 * Bueno Freight OS — Authentication
 *
 * Replaces the previous model, in which the browser decided who you were:
 * login matched a user out of a localStorage list and accepted any of a
 * hardcoded set of PINs, then minted its own token string. Identity is now
 * established and held by the server.
 *
 * Sessions are opaque random tokens. Only a keyed hash is stored, so leaking
 * the session table does not hand out usable logins and writing to it does
 * not let anyone mint one; keeping sessions server-side is what makes
 * immediate revocation possible.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}


require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/ratelimit.php';

final class Auth
{
    private const MAX_FAILED_ATTEMPTS = 5;
    private const LOCKOUT_SECONDS     = 900;   // 15 minutes

    /** @var array<string,mixed>|null|false false = not yet resolved */
    private static array|null|false $current = false;

    private static function sessionTtl(): int
    {
        return Config::int('SESSION_TTL_SECONDS', 43200); // 12 hours
    }

    private static function now(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    private static function at(int $ts): string
    {
        return gmdate('Y-m-d\TH:i:s\Z', $ts);
    }

    /**
     * Derive the stored form of a session token.
     *
     * Keyed with APP_SECRET rather than a bare hash. A plain SHA-256 of a
     * random token is already irreversible, so this is not about protecting
     * the token from a database *read* — it is about a database *write*. An
     * attacker who can insert a row into bueno_sessions (through an injection
     * flaw, a compromised backup restore, or shared-hosting neighbour access)
     * could otherwise mint themselves a valid administrator session by
     * inserting the hash of a token they chose. Without the secret they
     * cannot compute one.
     */
    private static function hashToken(string $token): string
    {
        return hash_hmac('sha256', $token, Config::appSecret());
    }

    // ── Credential verification ─────────────────────────────────────────────

    /**
     * Find a user by login identifier.
     *
     * Deliberately exact-match only. The previous implementation also matched
     * on a *substring* of fullName and companyName, so entering a single
     * common letter would resolve to whichever user happened to contain it.
     *
     * @return array<string,mixed>|null
     */
    private static function findByIdentifier(string $identifier): ?array
    {
        $id = trim($identifier);
        if ($id === '') {
            return null;
        }

        $stmt = Db::conn()->prepare(
            'SELECT * FROM bueno_users
              WHERE LOWER(email) = LOWER(?)
                 OR LOWER(staffId) = LOWER(?)
                 OR phone = ?
              LIMIT 1'
        );
        $stmt->execute([$id, $id, $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /**
     * Attempt a login.
     *
     * @return array{token:string,expiresAt:string,user:array<string,mixed>}
     */
    public static function login(string $identifier, string $secret): array
    {
        $ip = Http::clientIp();

        // Two limits: one per source address, one per account. The per-account
        // limit stops a distributed attack from walking one executive's PIN;
        // the per-IP limit stops one host walking every account.
        RateLimit::enforce('login:ip:' . $ip, Config::int('LOGIN_RATE_IP', 20), 300);
        RateLimit::enforce('login:id:' . strtolower(trim($identifier)), Config::int('LOGIN_RATE_ID', 10), 300);

        $user = self::findByIdentifier($identifier);

        // Uniform failure response: never reveal whether the account exists.
        $genericFailure = static function (string $reason) use ($identifier): never {
            Audit::record(
                'auth.login',
                'user',
                $identifier,
                Audit::FAILURE,
                ['reason' => $reason],
                null
            );
            Response::error('Invalid credentials.', 401);
        };

        if ($user === null) {
            // Spend comparable time so a missing account is not detectably
            // faster than a wrong password.
            password_verify($secret, '$2y$10$usesomesillystringfageaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa');
            $genericFailure('unknown_identifier');
        }

        if (strtoupper((string) ($user['status'] ?? 'ACTIVE')) !== 'ACTIVE') {
            $genericFailure('account_inactive');
        }

        $lockedUntil = $user['locked_until'] ?? null;
        if ($lockedUntil !== null && $lockedUntil !== '' && strtotime((string) $lockedUntil) > time()) {
            Audit::record('auth.login', 'user', (string) $user['id'], Audit::DENIED, ['reason' => 'locked'], null);
            Response::error(
                'Account temporarily locked after repeated failed sign-in attempts.',
                423,
                ['lockedUntil' => $lockedUntil]
            );
        }

        $hash = (string) ($user['password_hash'] ?? '');
        if ($hash === '' || !password_verify($secret, $hash)) {
            self::registerFailedAttempt($user);
            $genericFailure('bad_secret');
        }

        // Success — clear the failure counter and rehash if the cost factor
        // has since been raised.
        if (password_needs_rehash($hash, PASSWORD_BCRYPT)) {
            Db::conn()
                ->prepare('UPDATE bueno_users SET password_hash = ? WHERE id = ?')
                ->execute([password_hash($secret, PASSWORD_BCRYPT), $user['id']]);
        }

        Db::conn()
            ->prepare('UPDATE bueno_users SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?')
            ->execute([self::now(), $user['id']]);

        $session = self::createSession((string) $user['id']);

        Audit::record('auth.login', 'user', (string) $user['id'], Audit::SUCCESS, null, [
            'id'   => $user['id'],
            'role' => $user['role'],
        ]);

        return [
            'token'     => $session['token'],
            'expiresAt' => $session['expiresAt'],
            'user'      => self::publicUser($user),
        ];
    }

    /** @param array<string,mixed> $user */
    private static function registerFailedAttempt(array $user): void
    {
        $attempts = ((int) ($user['failed_attempts'] ?? 0)) + 1;

        if ($attempts >= self::MAX_FAILED_ATTEMPTS) {
            Db::conn()
                ->prepare('UPDATE bueno_users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
                ->execute([$attempts, self::at(time() + self::LOCKOUT_SECONDS), $user['id']]);

            Audit::record('auth.lockout', 'user', (string) $user['id'], Audit::DENIED, [
                'attempts' => $attempts,
            ], null);
            return;
        }

        Db::conn()
            ->prepare('UPDATE bueno_users SET failed_attempts = ? WHERE id = ?')
            ->execute([$attempts, $user['id']]);
    }

    // ── Sessions ────────────────────────────────────────────────────────────

    /** @return array{token:string,expiresAt:string} */
    private static function createSession(string $userId): array
    {
        $token     = bin2hex(random_bytes(32));
        $expiresAt = self::at(time() + self::sessionTtl());

        Db::conn()->prepare(
            'INSERT INTO bueno_sessions
                (token_hash, user_id, issued_at, expires_at, last_seen, ip, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            self::hashToken($token),
            $userId,
            self::now(),
            $expiresAt,
            self::now(),
            Http::clientIp(),
            substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255),
        ]);

        return ['token' => $token, 'expiresAt' => $expiresAt];
    }

    /**
     * Resolve the caller from their bearer token, or null.
     *
     * @return array<string,mixed>|null
     */
    public static function userOrNull(): ?array
    {
        if (self::$current !== false) {
            return self::$current;
        }
        self::$current = null;

        $token = Http::bearerToken();
        if ($token === null || $token === '') {
            return null;
        }

        try {
            $stmt = Db::conn()->prepare(
                // u.* last so user columns win on any name collision; the
                // session columns are aliased out of the way and stripped
                // before the row is handed back.
                'SELECT s.token_hash  AS _sess_token_hash,
                        s.expires_at  AS _sess_expires_at,
                        s.revoked_at  AS _sess_revoked_at,
                        s.last_seen   AS _sess_last_seen,
                        u.*
                   FROM bueno_sessions s
                   JOIN bueno_users u ON u.id = s.user_id
                  WHERE s.token_hash = ?
                  LIMIT 1'
            );
            $stmt->execute([self::hashToken($token)]);
            $row = $stmt->fetch();

            if ($row === false) {
                return null;
            }
            if (!empty($row['_sess_revoked_at'])) {
                return null;
            }
            if (strtotime((string) $row['_sess_expires_at']) <= time()) {
                return null;
            }
            if (strtoupper((string) ($row['status'] ?? 'ACTIVE')) !== 'ACTIVE') {
                return null;
            }

            // Sliding expiry, written at most once a minute so a busy client
            // does not generate a write per request.
            if (strtotime((string) $row['_sess_last_seen']) < time() - 60) {
                Db::conn()->prepare(
                    'UPDATE bueno_sessions SET last_seen = ?, expires_at = ? WHERE token_hash = ?'
                )->execute([
                    self::now(),
                    self::at(time() + self::sessionTtl()),
                    $row['_sess_token_hash'],
                ]);
            }

            unset(
                $row['_sess_token_hash'],
                $row['_sess_expires_at'],
                $row['_sess_revoked_at'],
                $row['_sess_last_seen']
            );
            self::$current = $row;
            return self::$current;
        } catch (Throwable $e) {
            // Treating any failure here as "not signed in" is the safe outcome
            // in production, but it also hides real defects: a typo in the
            // session query looks exactly like an expired token. Outside
            // production, surface it.
            error_log('[bueno][auth] session resolution failed: ' . $e->getMessage());
            if (!Config::isProduction()) {
                throw $e;
            }
            return null;
        }
    }

    /**
     * Resolve the caller, or answer 401 and stop.
     *
     * @return array<string,mixed>
     */
    public static function require(): array
    {
        $user = self::userOrNull();
        if ($user === null) {
            Response::error('Authentication required.', 401);
        }
        return $user;
    }

    public static function logout(): void
    {
        $token = Http::bearerToken();
        if ($token === null) {
            return;
        }
        $user = self::userOrNull();

        Db::conn()
            ->prepare('UPDATE bueno_sessions SET revoked_at = ? WHERE token_hash = ?')
            ->execute([self::now(), self::hashToken($token)]);

        if ($user !== null) {
            Audit::record('auth.logout', 'user', (string) $user['id'], Audit::SUCCESS, null, $user);
        }
        self::$current = null;
    }

    /** Revoke every session belonging to a user (deactivation, credential reset). */
    public static function revokeAllSessions(string $userId, string $reason): void
    {
        Db::conn()
            ->prepare('UPDATE bueno_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
            ->execute([self::now(), $userId]);

        Audit::record('auth.sessions_revoked', 'user', $userId, Audit::SUCCESS, ['reason' => $reason]);
    }

    /** Delete sessions that expired long ago. */
    public static function sweepSessions(): void
    {
        try {
            Db::conn()
                ->prepare('DELETE FROM bueno_sessions WHERE expires_at < ?')
                ->execute([self::at(time() - 604800)]);
        } catch (Throwable $e) {
            error_log('[bueno][auth.sweep] ' . $e->getMessage());
        }
    }

    // ── Credential management ───────────────────────────────────────────────

    public static function setPassword(string $userId, string $newSecret, bool $mustChange = false): void
    {
        Db::conn()->prepare(
            'UPDATE bueno_users
                SET password_hash = ?, must_change_credentials = ?, failed_attempts = 0,
                    locked_until = NULL, token_version = token_version + 1, updated_at = ?
              WHERE id = ?'
        )->execute([
            password_hash($newSecret, PASSWORD_BCRYPT),
            $mustChange ? 1 : 0,
            self::now(),
            $userId,
        ]);
    }

    /**
     * Validate a proposed credential.
     *
     * @return string[] list of problems; empty means acceptable
     */
    public static function validateSecretStrength(string $secret): array
    {
        $problems = [];
        $min = Config::int('MIN_PASSWORD_LENGTH', 8);

        if (strlen($secret) < $min) {
            $problems[] = "Must be at least {$min} characters.";
        }
        $wellKnown = ['1111', '2222', '3333', '4444', '6666', '7777', '8888', '9999', '1234', 'demo1234', 'password', 'admin'];
        if (in_array(strtolower($secret), $wellKnown, true)) {
            $problems[] = 'That value is a well-known default and cannot be used.';
        }
        if (preg_match('/^(.)\1*$/', $secret) === 1) {
            $problems[] = 'Cannot be a single repeated character.';
        }
        return $problems;
    }

    // ── Shaping ─────────────────────────────────────────────────────────────

    /**
     * Strip everything that must never leave the server.
     *
     * @param  array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function publicUser(array $row): array
    {
        unset(
            $row['pin'],
            $row['password_hash'],
            $row['failed_attempts'],
            $row['locked_until'],
            $row['token_version'],
            $row['permissionsText']
        );

        $row['mustChangeCredentials'] = (int) ($row['must_change_credentials'] ?? 0) === 1;
        unset($row['must_change_credentials']);

        return $row;
    }
}
