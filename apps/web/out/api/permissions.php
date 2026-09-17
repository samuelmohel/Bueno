<?php
/**
 * Bueno Freight OS — Permissions matrix
 *
 *   GET  /api/permissions.php                       read the matrix + settings
 *   POST /api/permissions.php {matrix:{...}}        replace the matrix
 *   POST /api/permissions.php {roleKey, permissions} update one role
 *   POST /api/permissions.php {action:"RESET_DEFAULTS"}
 *   POST /api/permissions.php {settings:{...}}      update system settings
 *
 * Previously this endpoint accepted an unauthenticated POST from anyone and
 * rewrote the entire authorization matrix — and separately maintained its own
 * hand-copied duplicate of the capability list, which had already drifted from
 * the client's. Both problems are gone: writes require the
 * system.permissions_edit capability, and the vocabulary comes from the
 * generated registry that the TypeScript client is built from.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';

/** @return array<string,mixed> */
function load_settings(): array
{
    $settings = [
        'allowAdminClientNegotiations' => true,
        'autoDispatchEmail'            => true,
    ];
    try {
        $rows = Db::conn()->query('SELECT settingKey, settingValue FROM bueno_system_settings')->fetchAll();
        foreach ($rows as $r) {
            $settings[(string) $r['settingKey']] = json_decode((string) $r['settingValue'], true);
        }
    } catch (Throwable $e) {
        error_log('[bueno][permissions] settings load: ' . $e->getMessage());
    }
    return $settings;
}

function persist_matrix(array $matrix): void
{
    $sql  = Db::upsertSql('bueno_role_permissions', ['roleKey', 'permissionsJson', 'updatedAt'], ['roleKey']);
    $now  = gmdate('Y-m-d\TH:i:s\Z');

    Db::transaction(static function (PDO $pdo) use ($matrix, $sql, $now): void {
        $stmt = $pdo->prepare($sql);
        foreach ($matrix as $role => $perms) {
            $stmt->execute([$role, json_encode(array_values($perms)), $now]);
        }
    });

    Rbac::forgetMatrix();
}

$method = Http::method();

// ── Read ────────────────────────────────────────────────────────────────────
//
// Requires a session: the matrix describes the platform's entire authorization
// model and is not public information.
if ($method === 'GET') {
    $user = Auth::require();

    Response::json([
        'status'       => 'success',
        'matrix'       => Rbac::matrix(),
        'settings'     => load_settings(),
        'capabilities' => Rbac::capabilitiesFor($user),
        'registry'     => [
            'capabilities' => Capabilities::META,
            'modules'      => Capabilities::MODULES,
            'roles'        => Capabilities::ROLES,
            'roleLabels'   => Capabilities::ROLE_LABELS,
            'sensitive'    => Capabilities::SENSITIVE,
        ],
        'serverTime'   => gmdate('Y-m-d\TH:i:s\Z'),
    ], 200);
}

if ($method !== 'POST') {
    Response::error('Method not allowed.', 405);
}

$actor = Rbac::require('system.permissions_edit');
$body  = Http::jsonBody();

/**
 * Guard against irreversible self-lockout.
 *
 * If the matrix that is about to be written leaves no active account able to
 * reach the permissions editor, nobody can ever undo the change without direct
 * database access. Refuse instead.
 */
function assert_not_locking_everyone_out(array $proposed, array $actor): void
{
    $rolesRetainingEdit = [];
    foreach ($proposed as $role => $perms) {
        if (in_array('system.permissions_edit', $perms, true) && in_array('permissions', $perms, true)) {
            $rolesRetainingEdit[] = $role;
        }
    }

    if ($rolesRetainingEdit === []) {
        Response::error(
            'This change would leave no role able to administer permissions, locking everyone out of the matrix. '
            . 'At least one role must keep both "permissions" and "system.permissions_edit".',
            422
        );
    }

    // There must also be a live account holding one of those roles.
    $placeholders = implode(',', array_fill(0, count($rolesRetainingEdit), '?'));
    $stmt = Db::conn()->prepare(
        "SELECT COUNT(*) FROM bueno_users WHERE status = 'ACTIVE' AND role IN ($placeholders)"
    );
    $stmt->execute($rolesRetainingEdit);

    if ((int) $stmt->fetchColumn() === 0) {
        Response::error(
            'This change would leave no active user able to administer permissions. '
            . 'Grant the capability to a role that has at least one active account.',
            422
        );
    }
}

$requestedAction = (string) ($body['action'] ?? '');

// ── Reset to defaults ───────────────────────────────────────────────────────
if ($requestedAction === 'RESET_DEFAULTS') {
    $defaults = Capabilities::normalizeMatrix(null);
    assert_not_locking_everyone_out($defaults, $actor);
    persist_matrix($defaults);

    Audit::record('permissions.reset', 'matrix', null, Audit::SUCCESS, null, $actor);
    Response::ok(['matrix' => $defaults, 'message' => 'Permissions reset to defaults.']);
}

// ── Whole-matrix replacement ────────────────────────────────────────────────
if (isset($body['matrix']) && is_array($body['matrix'])) {
    $before = Rbac::matrix();

    // normalizeMatrix drops unknown capability keys and strips sensitive ones
    // from external roles, so a crafted payload cannot invent a capability or
    // hand a customer account destructive powers.
    $proposed = Capabilities::normalizeMatrix($body['matrix']);

    assert_not_locking_everyone_out($proposed, $actor);
    persist_matrix($proposed);

    // Record the delta rather than the whole matrix, so the audit log stays
    // readable and shows what actually changed.
    $delta = [];
    foreach ($proposed as $role => $perms) {
        $wasSet = $before[$role] ?? [];
        $added   = array_values(array_diff($perms, $wasSet));
        $removed = array_values(array_diff($wasSet, $perms));
        if ($added !== [] || $removed !== []) {
            $delta[$role] = ['granted' => $added, 'revoked' => $removed];
        }
    }

    Audit::record('permissions.update', 'matrix', null, Audit::SUCCESS, ['changes' => $delta], $actor);
    Response::ok(['matrix' => $proposed, 'changes' => $delta]);
}

// ── Single-role update ──────────────────────────────────────────────────────
if (isset($body['roleKey'], $body['permissions'])) {
    $data = Validator::for($body)
        ->enum('roleKey', Capabilities::ROLES, true)
        ->jsonArray('permissions', 200)
        ->validated();

    $matrix                  = Rbac::matrix();
    $matrix[$data['roleKey']] = $data['permissions'];
    $proposed                = Capabilities::normalizeMatrix($matrix);

    assert_not_locking_everyone_out($proposed, $actor);
    persist_matrix($proposed);

    $before  = Rbac::matrix()[$data['roleKey']] ?? [];
    $after   = $proposed[$data['roleKey']];

    Audit::record('permissions.update_role', 'role', $data['roleKey'], Audit::SUCCESS, [
        'granted' => array_values(array_diff($after, $before)),
        'revoked' => array_values(array_diff($before, $after)),
    ], $actor);

    Response::ok(['matrix' => $proposed]);
}

// ── System settings ─────────────────────────────────────────────────────────
if (isset($body['settings']) && is_array($body['settings'])) {
    $allowed = ['allowAdminClientNegotiations', 'autoDispatchEmail'];
    $sql     = Db::upsertSql('bueno_system_settings', ['settingKey', 'settingValue', 'updatedAt'], ['settingKey']);
    $now     = gmdate('Y-m-d\TH:i:s\Z');
    $written = [];

    Db::transaction(static function (PDO $pdo) use ($body, $allowed, $sql, $now, &$written): void {
        $stmt = $pdo->prepare($sql);
        foreach ($body['settings'] as $key => $value) {
            if (!in_array($key, $allowed, true)) {
                continue; // ignore unknown keys rather than storing junk
            }
            $stmt->execute([$key, json_encode($value), $now]);
            $written[$key] = $value;
        }
    });

    Audit::record('permissions.settings', 'settings', null, Audit::SUCCESS, $written, $actor);
    Response::ok(['settings' => load_settings()]);
}

Response::error('Nothing to update. Supply matrix, roleKey + permissions, settings, or action.', 400);
