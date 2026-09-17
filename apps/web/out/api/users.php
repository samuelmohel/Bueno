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

        // The one-time secret is returned once, to the provisioning
        // administrator, and never stored in retrievable form.
        Response::json([
            'status'        => 'success',
            'user'          => shape_user(array_merge($data, [
                'id'                      => $id,
                'status'                  => 'ACTIVE',
                'createdAt'               => $now,
                'must_change_credentials' => 1,
            ])),
            'initialSecret' => $initialSecret,
            'message'       => 'Account created. Share the initial password securely; the user must change it at first sign-in.',
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
