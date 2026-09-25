<?php
/**
 * Bueno Freight OS — User directory
 *
 *   GET  /api/users.php                          list users (requires users.view)
 *   POST /api/users.php {action:"create"}        provision a user
 *   POST /api/users.php {action:"update"}        edit a profile
 *   POST /api/users.php {action:"deactivate"}    revoke access
 *   POST /api/users.php {action:"reactivate"}    restore access
 *   POST /api/users.php {action:"reset_credentials"}
 *
 * The previous version of this file answered an unauthenticated GET with every
 * user row including the plaintext `pin` column — a complete authentication
 * bypass for anyone who could load the URL. Credentials are now hashed, never
 * selected into a response, and the whole endpoint requires a capability.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/invitation.php';

/** Columns safe to return. Note the absence of pin and password_hash. */
const USER_PUBLIC_COLUMNS = 'id, fullName, email, phone, role, userType, assignedStation,
                             companyName, staffId, status, must_change_credentials,
                             last_login_at, createdAt, updated_at';

/** @param array<string,mixed> $row */
function shape_user(array $row): array
{
    $row['mustChangeCredentials'] = (int) ($row['must_change_credentials'] ?? 0) === 1;
    $row['lastLoginAt']           = $row['last_login_at'] ?? null;
    $row['updatedAt']             = $row['updated_at'] ?? null;
    unset($row['must_change_credentials'], $row['last_login_at'], $row['updated_at']);
    return $row;
}

function generate_initial_secret(): string
{
    // 10 chars from an unambiguous alphabet (no O/0, I/l/1) so it can be read
    // aloud or written down without transcription errors.
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    $out = '';
    for ($i = 0; $i < 10; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}

$method = Http::method();

// ── List ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $user = Rbac::require('users.view');

    $sql    = 'SELECT ' . USER_PUBLIC_COLUMNS . ' FROM bueno_users WHERE 1 = 1';
    $params = [];

    // An external role browsing the directory sees only its own organisation.
    $scope = Rbac::scopeClause($user, ['company' => 'companyName']);
    $sql   .= $scope['sql'];
    $params = array_merge($params, $scope['params']);

    $sql .= ' ORDER BY fullName ASC';

    $stmt = Db::conn()->prepare($sql);
    $stmt->execute($params);

    Response::data(array_map('shape_user', $stmt->fetchAll()));
}

if ($method !== 'POST') {
    Response::error('Method not allowed.', 405);
}

$body   = Http::jsonBody();
$action = (string) ($body['action'] ?? '');

switch ($action) {
    // ── Provision ───────────────────────────────────────────────────────────
    case 'create': {
        $actor = Rbac::require('users.create');

        $data = Validator::for($body)
            ->string('fullName', true, 191, 2)
            ->email('email', true)
            ->string('phone', false, 32)
            ->enum('role', Capabilities::ROLES, true)
            ->enum('userType', ['STAFF', 'CUSTOMER'], false, 'STAFF')
            ->identifier('assignedStation', false, 16)
            ->string('companyName', false, 191)
            ->identifier('staffId', false, 64)
            ->validated();

        // Only an account that may edit the permissions matrix can mint
        // another account holding sensitive capabilities — otherwise
        // users.create alone would be a privilege-escalation path to ADMIN.
        $targetCaps = Capabilities::defaultsFor($data['role']);
        $sensitive  = array_values(array_filter($targetCaps, [Capabilities::class, 'isSensitive']));
        if ($sensitive !== [] && !Rbac::can($actor, 'system.permissions_edit')) {
            Audit::record('users.create', 'user', $data['email'], Audit::DENIED, [
                'reason' => 'privilege_escalation_attempt',
                'role'   => $data['role'],
            ], $actor);
            Response::error(
                'You cannot provision an account with a role more privileged than your own.',
                403
            );
        }

        $exists = Db::conn()->prepare('SELECT id FROM bueno_users WHERE LOWER(email) = LOWER(?) LIMIT 1');
        $exists->execute([$data['email']]);
        if ($exists->fetchColumn() !== false) {
            Response::error('An account with that email address already exists.', 409);
        }

        $id           = 'usr_' . bin2hex(random_bytes(8));
        $initialSecret = generate_initial_secret();
        $now          = gmdate('Y-m-d\TH:i:s\Z');

        Db::conn()->prepare(
            'INSERT INTO bueno_users
                (id, fullName, email, phone, role, userType, assignedStation, companyName,
                 staffId, pin, status, password_hash, must_change_credentials, createdAt, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $id,
            $data['fullName'],
            $data['email'],
            $data['phone'],
            $data['role'],
            $data['userType'],
            $data['assignedStation'],
            $data['companyName'],
            $data['staffId'],
            '',                                     // plaintext pin column stays empty
            'ACTIVE',
            password_hash($initialSecret, PASSWORD_BCRYPT),
            1,                                      // must set their own on first sign-in
            $now,
            $now,
        ]);

        Audit::record('users.create', 'user', $id, Audit::SUCCESS, [
            'role'  => $data['role'],
            'email' => $data['email'],
        ], $actor);

        /*
         * Invite the new user to set their own password.
         *
         * The one-time secret still exists and is still returned, because the
         * administrator needs a way through if mail is not delivered — shared
         * hosting disables mail() often enough that provisioning must not
         * depend on it. But what travels by email is a single-use link that
         * expires, never the credential itself.
         */
        $invite = Invitation::issue($id, $data['email'], (string) $actor['id']);
        $mailed = Invitation::sendEmail(
            $data['email'],
            $data['fullName'],
            Capabilities::ROLE_LABELS[$data['role']] ?? $data['role'],
            $invite['url'],
            $invite['expiresAt'],
            $data['companyName'] ?? null
        );
        Invitation::recordMailStatus($id, $mailed);

        Response::json([
            'status'        => 'success',
            'user'          => shape_user(array_merge($data, [
                'id'                      => $id,
                'status'                  => 'ACTIVE',
                'createdAt'               => $now,
                'must_change_credentials' => 1,
            ])),
            // Returned once, never stored in retrievable form.
            'initialSecret' => $initialSecret,
            'invitation'    => [
                'emailed'   => $mailed,
                'sentTo'    => $data['email'],
                // So the administrator can pass the link on another way when
                // mail fails, rather than being stuck.
                'url'       => $invite['url'],
                'expiresAt' => $invite['expiresAt'],
            ],
            'message'       => $mailed
                ? 'Account created and an invitation emailed.'
                : 'Account created, but the invitation email could not be sent. Share the link or the one-time password directly.',
        ], 201);
    }

    // ── Edit profile ────────────────────────────────────────────────────────
    case 'update': {
        $actor = Rbac::require('users.edit');

        $data = Validator::for($body)
            ->identifier('id', true, 100)
            ->string('fullName', false, 191, 2)
            ->email('email', false)
            ->string('phone', false, 32)
            ->identifier('assignedStation', false, 16)
            ->string('companyName', false, 191)
            ->identifier('staffId', false, 64)
            ->validated();

        $find = Db::conn()->prepare('SELECT * FROM bueno_users WHERE id = ? LIMIT 1');
        $find->execute([$data['id']]);
        $target = $find->fetch();
        if ($target === false) {
            Response::error('User not found.', 404);
        }

        // Role changes are a privilege operation, not a profile edit, and are
        // deliberately not accepted here.
        if (isset($body['role']) && (string) $body['role'] !== (string) $target['role']) {
            if (!Rbac::can($actor, 'system.permissions_edit')) {
                Audit::record('users.update', 'user', (string) $target['id'], Audit::DENIED, [
                    'reason' => 'role_change_requires_permissions_edit',
                ], $actor);
                Response::error('Changing a user\'s role requires the permissions-matrix capability.', 403);
            }
        }

        $updates = [];
        $params  = [];
        foreach (['fullName', 'email', 'phone', 'assignedStation', 'companyName', 'staffId'] as $field) {
            if ($data[$field] !== null) {
                $updates[] = "`$field` = ?";
                $params[]  = $data[$field];
            }
        }

        if (isset($body['role']) && Rbac::can($actor, 'system.permissions_edit')) {
            $roleCheck = Validator::for($body)->enum('role', Capabilities::ROLES, true)->validated();
            $updates[] = '`role` = ?';
            $params[]  = $roleCheck['role'];
        }

        if ($updates === []) {
            Response::error('No changes supplied.', 422);
        }

        $updates[] = '`updated_at` = ?';
        $params[]  = gmdate('Y-m-d\TH:i:s\Z');
        $params[]  = $data['id'];

        Db::conn()
            ->prepare('UPDATE bueno_users SET ' . implode(', ', $updates) . ' WHERE id = ?')
            ->execute($params);

        Audit::record('users.update', 'user', (string) $data['id'], Audit::SUCCESS, [
            'fields' => array_keys(array_filter($data, static fn($v, $k) => $v !== null && $k !== 'id', ARRAY_FILTER_USE_BOTH)),
        ], $actor);

        $find->execute([$data['id']]);
        Response::ok(['user' => shape_user(Auth::publicUser($find->fetch()))]);
    }

    // ── Deactivate / reactivate ─────────────────────────────────────────────
    case 'deactivate':
    case 'reactivate': {
        $actor = Rbac::require('users.deactivate');

        $data = Validator::for($body)->identifier('id', true, 100)->validated();

        if ((string) $data['id'] === (string) $actor['id']) {
            Response::error('You cannot deactivate your own account.', 422);
        }

        $status = $action === 'deactivate' ? 'DEACTIVATED' : 'ACTIVE';

        $result = Db::conn()->prepare('UPDATE bueno_users SET status = ?, updated_at = ? WHERE id = ?');
        $result->execute([$status, gmdate('Y-m-d\TH:i:s\Z'), $data['id']]);

        if ($result->rowCount() === 0) {
            Response::error('User not found.', 404);
        }

        // Deactivation must take effect immediately, not whenever the user's
        // existing session happens to expire.
        if ($action === 'deactivate') {
            Auth::revokeAllSessions((string) $data['id'], 'account_deactivated');
        }

        Audit::record('users.' . $action, 'user', (string) $data['id'], Audit::SUCCESS, null, $actor);
        Response::ok(['message' => 'Account ' . strtolower($status) . '.']);
    }

    // ── Delete permanently ──────────────────────────────────────────────────
    //
    // Deactivation is the right answer almost every time: it ends access
    // immediately while keeping the account attached to the work it did. This
    // exists for the cases deactivation does not cover — an account created in
    // error, a duplicate, a test account, or an erasure request.
    //
    // What is deliberately NOT deleted:
    //
    //   - Audit log entries. They record what the account did while it
    //     existed, and an audit trail that can be edited by deleting the
    //     subject is not an audit trail. The rows keep the account id, which
    //     no longer resolves — that is correct, and the deletion is itself
    //     recorded with the email so the history stays readable.
    //
    //   - Trips, deals and manifests. These carry officer and creator NAMES as
    //     text rather than references, so operational history is unaffected by
    //     removing the account row.
    case 'delete': {
        $actor = Rbac::require('users.delete');

        $data = Validator::for($body)->identifier('id', true, 100)->validated();

        $find = Db::conn()->prepare('SELECT id, fullName, email, role, status FROM bueno_users WHERE id = ? LIMIT 1');
        $find->execute([$data['id']]);
        $target = $find->fetch();
        if ($target === false) {
            Response::error('User not found.', 404);
        }

        // Deleting the account you are signed in as would leave you holding a
        // session for a user that no longer exists.
        if ((string) $target['id'] === (string) $actor['id']) {
            Response::error(
                'You cannot delete the account you are signed in with. Ask another administrator.',
                422
            );
        }

        // Never allow the platform to be left with nobody able to administer
        // it. Same protection the permissions matrix has, applied to the other
        // way of reaching the same dead end — deleting the last administrator
        // rather than revoking the capability.
        if (Rbac::can($target, 'system.permissions_edit')) {
            $rolesWithEdit = [];
            foreach (Rbac::matrix() as $role => $perms) {
                if (in_array('system.permissions_edit', $perms, true)) {
                    $rolesWithEdit[] = $role;
                }
            }

            if ($rolesWithEdit !== []) {
                $placeholders = implode(',', array_fill(0, count($rolesWithEdit), '?'));
                $stmt = Db::conn()->prepare(
                    "SELECT COUNT(*) FROM bueno_users
                      WHERE status = 'ACTIVE' AND id <> ? AND role IN ($placeholders)"
                );
                $stmt->execute(array_merge([$target['id']], $rolesWithEdit));

                if ((int) $stmt->fetchColumn() === 0) {
                    Response::error(
                        'This is the only active account that can administer permissions. '
                        . 'Deleting it would lock everyone out. Provision a replacement administrator first.',
                        422
                    );
                }
            }
        }

        // End every session before the row goes, so a token cannot outlive the
        // account it belongs to.
        Auth::revokeAllSessions((string) $target['id'], 'account_deleted');

        Db::conn()->prepare('DELETE FROM bueno_users WHERE id = ?')->execute([$target['id']]);

        // Recorded with the identifying details, because after this the id
        // resolves to nothing and the entry would otherwise be unreadable.
        Audit::record('users.delete', 'user', (string) $target['id'], Audit::SUCCESS, [
            'email'    => $target['email'],
            'fullName' => $target['fullName'],
            'role'     => $target['role'],
            'status'   => $target['status'],
        ], $actor);

        Response::ok([
            'message' => 'Account permanently deleted. Audit history has been retained.',
        ]);
    }

    // ── Re-send an invitation ───────────────────────────────────────────────
    //
    // Mail fails, links expire, and people lose them. Without this the only
    // recovery was resetting the credential, which is a heavier action and
    // tells the user nothing about why they are being asked again.
    case 'resend_invitation': {
        $actor = Rbac::require('users.create');

        $data = Validator::for($body)->identifier('id', true, 100)->validated();

        $find = Db::conn()->prepare('SELECT id, fullName, email, role, companyName, status FROM bueno_users WHERE id = ? LIMIT 1');
        $find->execute([$data['id']]);
        $target = $find->fetch();
        if ($target === false) {
            Response::error('User not found.', 404);
        }
        if ((string) $target['status'] === 'DEACTIVATED') {
            Response::error('That account is deactivated. Reactivate it before inviting the user.', 422);
        }

        // Issuing supersedes any outstanding invitation, so an older link in a
        // forwarded email stops working.
        $invite = Invitation::issue((string) $target['id'], (string) $target['email'], (string) $actor['id']);
        $mailed = Invitation::sendEmail(
            (string) $target['email'],
            (string) $target['fullName'],
            Capabilities::ROLE_LABELS[(string) $target['role']] ?? (string) $target['role'],
            $invite['url'],
            $invite['expiresAt'],
            $target['companyName'] ?? null
        );
        Invitation::recordMailStatus((string) $target['id'], $mailed);

        Audit::record('users.resend_invitation', 'user', (string) $target['id'], Audit::SUCCESS, [
            'emailed' => $mailed,
        ], $actor);

        Response::ok([
            'invitation' => [
                'emailed'   => $mailed,
                'sentTo'    => $target['email'],
                'url'       => $invite['url'],
                'expiresAt' => $invite['expiresAt'],
            ],
            'message' => $mailed
                ? 'A new invitation has been emailed. Any previous link no longer works.'
                : 'The invitation email could not be sent. Share the link directly.',
        ]);
    }

    // ── Reset credentials ───────────────────────────────────────────────────
    case 'reset_credentials': {
        $actor = Rbac::require('users.reset_credentials');

        $data = Validator::for($body)->identifier('id', true, 100)->validated();

        $find = Db::conn()->prepare('SELECT id, email FROM bueno_users WHERE id = ? LIMIT 1');
        $find->execute([$data['id']]);
        $target = $find->fetch();
        if ($target === false) {
            Response::error('User not found.', 404);
        }

        $newSecret = generate_initial_secret();
        Auth::setPassword((string) $target['id'], $newSecret, true);
        Auth::revokeAllSessions((string) $target['id'], 'credentials_reset');

        Audit::record('users.reset_credentials', 'user', (string) $target['id'], Audit::SUCCESS, null, $actor);

        Response::ok([
            'initialSecret' => $newSecret,
            'message'       => 'Credentials reset. Share the new password securely; the user must change it at next sign-in.',
        ]);
    }

    default:
        Response::error('Unknown action.', 400);
}
