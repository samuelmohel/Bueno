<?php
/**
 * Bueno Freight OS — account invitations
 *
 * Issuing, emailing and redeeming the single-use link that lets a new user set
 * their own password.
 *
 * Why a link rather than the password itself: a password mailed out sits in
 * the recipient's inbox, the sending server's queue and any forward of it,
 * cannot be withdrawn, and never expires. A token can be used once, lapses on
 * its own, and is superseded the moment a new one is issued.
 *
 * Only the hash of the token is stored, the same reasoning as session tokens:
 * a copy of the database must not hand over working invitations.
 */

declare(strict_types=1);

if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';    // Response
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/mailer.php';

final class Invitation
{
    /** How long a new user has to accept. */
    private static function ttlSeconds(): int
    {
        return Config::int('INVITATION_TTL_SECONDS', 604800); // 7 days
    }

    private static function hash(string $token): string
    {
        // Keyed with APP_SECRET, so a stolen table of hashes cannot be
        // attacked offline without it.
        return hash_hmac('sha256', $token, Config::appSecret());
    }

    private static function now(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

    /**
     * Issue an invitation, superseding any outstanding one for the account.
     *
     * @return array{token:string,url:string,expiresAt:string}
     */
    public static function issue(string $userId, string $email, ?string $issuedBy = null): array
    {
        // Only one invitation may be live per account: a reissued link must
        // make the previous one useless, or a forwarded old email still works.
        Db::conn()
            ->prepare('DELETE FROM bueno_invitations WHERE user_id = ? AND used_at IS NULL')
            ->execute([$userId]);

        $token     = bin2hex(random_bytes(32));
        $expiresAt = gmdate('Y-m-d\TH:i:s\Z', time() + self::ttlSeconds());

        Db::conn()->prepare(
            'INSERT INTO bueno_invitations
                (token_hash, user_id, email, created_at, expires_at, created_by)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([
            self::hash($token),
            $userId,
            $email,
            self::now(),
            $expiresAt,
            $issuedBy,
        ]);

        return [
            'token'     => $token,
            'url'       => Mailer::appUrl() . '/auth/accept-invitation/?token=' . urlencode($token),
            'expiresAt' => $expiresAt,
        ];
    }

    /**
     * Email the invitation.
     *
     * Returns whether the transport accepted it. A false here is not a reason
     * to fail provisioning — the account exists and the administrator still
     * has the link — but it must be reported rather than assumed.
     */
    public static function sendEmail(
        string $email,
        string $fullName,
        string $roleLabel,
        string $url,
        string $expiresAt,
        ?string $companyName = null
    ): bool {
        $rows = [
            'Name' => Mailer::e($fullName),
            'Role' => Mailer::e($roleLabel),
        ];
        if ($companyName !== null && $companyName !== '') {
            $rows['Organisation'] = Mailer::e($companyName);
        }
        $rows['Sign-in address'] = Mailer::e($email);

        $days = max(1, (int) round(self::ttlSeconds() / 86400));

        $html = Mailer::layout(
            'Set up your Bueno Logistics account',
            'An account has been created for you on the Bueno Logistics freight platform. '
            . 'Choose a password to finish setting it up.',
            $rows,
            ['label' => 'Choose your password', 'url' => $url],
            'This link works once and expires in ' . $days . ' day' . ($days === 1 ? '' : 's') . '. '
            . 'If it lapses, ask your administrator to send another. '
            . 'If you were not expecting this, you can ignore it — the account cannot be used '
            . 'until a password is set.'
        );

        return Mailer::send(
            $email,
            'Set up your Bueno Logistics account',
            $html,
            'ACCOUNT_INVITATION',
            // Deliberately no token, and no URL — the log must not become a
            // second place the invitation can be read from.
            ['fullName' => $fullName, 'role' => $roleLabel]
        );
    }

    /** Record what the mail transport said, against the live invitation. */
    public static function recordMailStatus(string $userId, bool $sent): void
    {
        try {
            Db::conn()->prepare(
                'UPDATE bueno_invitations SET mail_status = ? WHERE user_id = ? AND used_at IS NULL'
            )->execute([$sent ? 'SENT' : 'FAILED', $userId]);
        } catch (Throwable $e) {
            error_log('[bueno][invite] could not record mail status: ' . $e->getMessage());
        }
    }

    /**
     * Resolve a token to its account, or null.
     *
     * Null covers unknown, already used and expired alike: distinguishing them
     * to an unauthenticated caller would confirm which tokens once existed.
     *
     * @return array<string,mixed>|null
     */
    public static function resolve(string $token): ?array
    {
        if ($token === '') {
            return null;
        }

        $stmt = Db::conn()->prepare(
            'SELECT i.*, u.fullName, u.email AS accountEmail, u.role, u.status
               FROM bueno_invitations i
               JOIN bueno_users u ON u.id = i.user_id
              WHERE i.token_hash = ?
              LIMIT 1'
        );
        $stmt->execute([self::hash($token)]);
        $row = $stmt->fetch();

        if ($row === false) return null;
        if (($row['used_at'] ?? null) !== null) return null;
        if (strtotime((string) $row['expires_at']) < time()) return null;
        if (($row['status'] ?? '') === 'DEACTIVATED') return null;

        return $row;
    }

    /**
     * Redeem an invitation by setting the account's password.
     *
     * @return array<string,mixed> the user row
     */
    public static function redeem(string $token, string $newSecret): array
    {
        $invite = self::resolve($token);
        if ($invite === null) {
            Response::error(
                'This invitation link is no longer valid. It may have been used already or '
                . 'expired. Ask your administrator to send a new one.',
                410
            );
        }

        // The same policy the change-password flow applies. setPassword only
        // hashes and stores — it does not judge — so an invited account would
        // otherwise be the one route to a weaker password than every other.
        $problems = Auth::validateSecretStrength($newSecret);
        if ($problems !== []) {
            Response::error('That password cannot be used.', 422, ['problems' => $problems]);
        }

        Auth::setPassword((string) $invite['user_id'], $newSecret, false);

        Db::conn()
            ->prepare('UPDATE bueno_invitations SET used_at = ? WHERE token_hash = ?')
            ->execute([self::now(), self::hash($token)]);

        // Any session opened before the password was set belongs to nobody.
        Auth::revokeAllSessions((string) $invite['user_id'], 'invitation_redeemed');

        Audit::record(
            'users.invitation_redeemed',
            'user',
            (string) $invite['user_id'],
            Audit::SUCCESS,
            ['email' => $invite['email']],
            ['id' => $invite['user_id'], 'role' => $invite['role']]
        );

        $stmt = Db::conn()->prepare('SELECT * FROM bueno_users WHERE id = ? LIMIT 1');
        $stmt->execute([$invite['user_id']]);
        return $stmt->fetch() ?: [];
    }

    /** Remove used and lapsed invitations. Called opportunistically. */
    public static function sweep(): void
    {
        try {
            Db::conn()->prepare(
                'DELETE FROM bueno_invitations WHERE used_at IS NOT NULL OR expires_at < ?'
            )->execute([self::now()]);
        } catch (Throwable $e) {
            error_log('[bueno][invite] sweep failed: ' . $e->getMessage());
        }
    }
}
