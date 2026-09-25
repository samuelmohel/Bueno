<?php
/**
 * Bueno Freight OS — Authentication endpoint
 *
 *   GET  /api/auth.php                      current session + effective capabilities
 *   POST /api/auth.php {action:"login"}     sign in
 *   POST /api/auth.php {action:"logout"}    revoke this session
 *   POST /api/auth.php {action:"change_password"}
 *
 * This is the only endpoint that accepts credentials. Everything else expects
 * the bearer token it issues.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/invitation.php';

$method = Http::method();

// ── GET: who am I, and what may I do? ───────────────────────────────────────
//
// The client no longer computes its own permissions from localStorage. It asks
// the server, and the server is the same code path that enforces them, so the
// UI cannot drift out of step with what is actually allowed.
if ($method === 'GET') {
    $user = Auth::userOrNull();

    if ($user === null) {
        Response::json([
            'status'        => 'success',
            'authenticated' => false,
            'user'          => null,
            'capabilities'  => [],
        ], 200);
    }

    Response::json([
        'status'         => 'success',
        'authenticated'  => true,
        'user'           => Auth::publicUser($user),
        'capabilities'   => Rbac::capabilitiesFor($user),
        'scope'          => Rbac::scopeFor($user),
        'serverTime'     => gmdate('Y-m-d\TH:i:s\Z'),
    ], 200);
}

if ($method !== 'POST') {
    Response::error('Method not allowed.', 405);
}

$body   = Http::jsonBody();
$action = (string) ($body['action'] ?? 'login');

switch ($action) {
    // ── Sign in ─────────────────────────────────────────────────────────────
    case 'login': {
        $data = Validator::for($body)
            ->string('identifier', true, 255)
            ->string('secret', true, 255)
            // "Keep me signed in". Absent or false gives the normal shift-length
            // session, which is the right default for a shared terminal.
            ->boolean('remember', false)
            ->validated();

        $result = Auth::login($data['identifier'], $data['secret'], (bool) $data['remember']);

        Response::json([
            'status'       => 'success',
            'token'        => $result['token'],
            'expiresAt'    => $result['expiresAt'],
            'user'         => $result['user'],
            'capabilities' => Rbac::capabilitiesFor($result['user']),
            'scope'        => Rbac::scopeFor($result['user']),
        ], 200);
    }

    // ── Invitations ─────────────────────────────────────────────────────────
    //
    // Both actions are deliberately unauthenticated: the whole point is that
    // the recipient has no credential yet. The token is the authorisation, and
    // it is single-use, expiring, and revoked the moment a newer one is
    // issued.
    case 'check_invitation': {
        $data = Validator::for($body)->string('token', true, 128, 16)->validated();

        // Rate limited by address: a token is 64 hex characters, so guessing
        // is not a realistic attack, but there is no reason to permit the
        // attempt at volume either.
        RateLimit::enforce('invite:' . Http::clientIp(), Config::int('INVITE_RATE_IP', 30), 600);

        $invite = Invitation::resolve($data['token']);
        if ($invite === null) {
            // One answer for unknown, used and expired alike. Telling them
            // apart would confirm which tokens once existed.
            Response::error(
                'This invitation link is no longer valid. It may have been used already or '
                . 'expired. Ask your administrator to send a new one.',
                410
            );
        }

        Response::ok([
            'fullName' => $invite['fullName'],
            'email'    => $invite['accountEmail'],
            'role'     => $invite['role'],
            'roleLabel' => Capabilities::ROLE_LABELS[(string) $invite['role']] ?? (string) $invite['role'],
        ]);
    }

    case 'accept_invitation': {
        $data = Validator::for($body)
            ->string('token', true, 128, 16)
            ->string('newSecret', true, 255, 1)
            ->validated();

        RateLimit::enforce('invite:' . Http::clientIp(), Config::int('INVITE_RATE_IP', 30), 600);

        $user = Invitation::redeem($data['token'], $data['newSecret']);
        if ($user === []) {
            Response::error('That account could not be found.', 404);
        }

        // Signed straight in: asking someone to type a password they set two
        // seconds ago serves nobody.
        $session = Auth::login((string) $user['email'], $data['newSecret'], false);

        Response::json([
            'status'       => 'success',
            'token'        => $session['token'],
            'expiresAt'    => $session['expiresAt'],
            'user'         => $session['user'],
            'capabilities' => Rbac::capabilitiesFor($session['user']),
            'scope'        => Rbac::scopeFor($session['user']),
            'message'      => 'Your password is set and you are signed in.',
        ], 200);
    }

    // ── Sign out ────────────────────────────────────────────────────────────
    case 'logout': {
        Auth::logout();
        Response::ok(['message' => 'Signed out.']);
    }

    // ── Change own credentials ──────────────────────────────────────────────
    case 'change_password': {
        $user = Auth::require();

        $data = Validator::for($body)
            ->string('currentSecret', true, 255)
            ->string('newSecret', true, 255)
            ->validated();

        // Re-verify the current credential even though the caller holds a
        // valid session: a borrowed or hijacked session must not be enough to
        // take permanent ownership of an account.
        $row = Db::conn()->prepare('SELECT password_hash FROM bueno_users WHERE id = ?');
        $row->execute([$user['id']]);
        $hash = (string) $row->fetchColumn();

        if ($hash === '' || !password_verify($data['currentSecret'], $hash)) {
            RateLimit::enforce('pwchange:' . $user['id'], 5, 900);
            Audit::record('auth.change_password', 'user', (string) $user['id'], Audit::FAILURE, [
                'reason' => 'current_secret_mismatch',
            ], $user);
            Response::error('Your current password is incorrect.', 401);
        }

        $problems = Auth::validateSecretStrength($data['newSecret']);
        if ($problems !== []) {
            Response::error('The new password is not acceptable.', 422, ['errors' => ['newSecret' => implode(' ', $problems)]]);
        }

        if (password_verify($data['newSecret'], $hash)) {
            Response::error('The new password must differ from the current one.', 422);
        }

        Auth::setPassword((string) $user['id'], $data['newSecret'], false);

        // Changing a credential invalidates every other session for that
        // account, which is the point of changing it.
        Auth::revokeAllSessions((string) $user['id'], 'password_changed');

        Audit::record('auth.change_password', 'user', (string) $user['id'], Audit::SUCCESS, null, $user);

        Response::ok(['message' => 'Password updated. Please sign in again.']);
    }

    default:
        Response::error('Unknown action.', 400);
}
