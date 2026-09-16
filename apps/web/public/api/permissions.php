<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Ensure bueno_role_permissions table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_role_permissions (
        roleKey VARCHAR(100) PRIMARY KEY,
        permissionsJson TEXT NOT NULL,
        updatedAt VARCHAR(100)
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_system_settings (
        settingKey VARCHAR(100) PRIMARY KEY,
        settingValue TEXT NOT NULL,
        updatedAt VARCHAR(100)
    )");
} catch (Exception $e) {}

$ALL_CAPABILITIES = [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'terminal_info', 'moniya', 'telemetry', 'manifest', 'billing', 'users', 'permissions',
    'deals.create', 'deals.approve', 'deals.delete',
    'ops.dispatch', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit',
    'finance.requisitions_approve', 'finance.invoices_issue', 'finance.payments_record',
    'system.permissions_edit'
];

$DEFAULT_PERMISSIONS = [
    'ADMIN' => $ALL_CAPABILITIES,
    'CEO' => $ALL_CAPABILITIES,
    'MD' => $ALL_CAPABILITIES,
    'HEAD_OF_OPERATIONS' => [
        'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'terminal_info', 'moniya', 'telemetry', 'manifest',
        'deals.approve', 'ops.dispatch', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit', 'finance.requisitions_approve'
    ],
    'HEAD_OF_FINANCE' => [
        'analytics', 'deals', 'negotiations', 'fund_requisitions', 'billing',
        'finance.requisitions_approve', 'finance.invoices_issue', 'finance.payments_record'
    ],
    'ACCOUNTANT' => [
        'analytics', 'deals', 'negotiations', 'fund_requisitions', 'billing',
        'finance.requisitions_approve', 'finance.invoices_issue', 'finance.payments_record'
    ],
    'CARGO_OFFICER' => [
        'deals', 'fleet', 'terminal_info', 'moniya', 'telemetry', 'manifest', 'fund_requisitions',
        'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit'
    ],
    'CUSTOMER' => [
        'negotiations', 'telemetry', 'manifest', 'billing', 'finance.invoices_issue'
    ],
    'CONSIGNEE' => [
        'negotiations', 'telemetry', 'manifest', 'billing', 'finance.invoices_issue'
    ]
];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM bueno_role_permissions");
        $rows = $stmt->fetchAll();
        $matrix = [];

        if ($rows && count($rows) > 0) {
            foreach ($rows as $r) {
                $matrix[$r['roleKey']] = json_decode($r['permissionsJson'] ?? '[]', true);
            }
        }

        // Fill any missing roles from defaults
        $needsSeed = false;
        foreach ($DEFAULT_PERMISSIONS as $role => $perms) {
            if (!isset($matrix[$role]) || !is_array($matrix[$role]) || count($matrix[$role]) === 0) {
                $matrix[$role] = $perms;
                $needsSeed = true;
            }
        }

        if ($needsSeed) {
            $insert = $pdo->prepare("REPLACE INTO bueno_role_permissions (roleKey, permissionsJson, updatedAt) VALUES (?, ?, ?)");
            $date = date('Y-m-d H:i:s');
            foreach ($matrix as $role => $perms) {
                $insert->execute([$role, json_encode(array_values($perms)), $date]);
            }
        }

        // Fetch system settings
        $sStmt = $pdo->query("SELECT * FROM bueno_system_settings");
        $sRows = $sStmt->fetchAll();
        $settings = ['allowAdminClientNegotiations' => true];
        foreach ($sRows as $sr) {
            $settings[$sr['settingKey']] = json_decode($sr['settingValue'] ?? 'true', true);
        }

        echo json_encode([
            'status' => 'success',
            'matrix' => $matrix,
            'settings' => $settings
        ]);
    } catch (Exception $e) {
        echo json_encode(['status' => 'success', 'matrix' => $DEFAULT_PERMISSIONS, 'settings' => ['allowAdminClientNegotiations' => true]]);
    }
    exit();
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid permissions payload']);
        exit();
    }

    $date = date('Y-m-d H:i:s');

    // Handle Reset to Defaults
    if (isset($data['action']) && $data['action'] === 'RESET_DEFAULTS') {
        $stmt = $pdo->prepare("REPLACE INTO bueno_role_permissions (roleKey, permissionsJson, updatedAt) VALUES (?, ?, ?)");
        foreach ($DEFAULT_PERMISSIONS as $role => $perms) {
            $stmt->execute([$role, json_encode(array_values($perms)), $date]);
        }
        echo json_encode(['status' => 'success', 'message' => 'Permissions reset to defaults in SQL database', 'matrix' => $DEFAULT_PERMISSIONS]);
        exit();
    }

    // If matrix is passed
    if (isset($data['matrix']) && is_array($data['matrix'])) {
        $stmt = $pdo->prepare("REPLACE INTO bueno_role_permissions (roleKey, permissionsJson, updatedAt) VALUES (?, ?, ?)");
        foreach ($data['matrix'] as $role => $perms) {
            $stmt->execute([$role, json_encode(array_values($perms)), $date]);
        }
    }

    // If direct role toggle is passed
    if (isset($data['roleKey']) && isset($data['permissions'])) {
        $stmt = $pdo->prepare("REPLACE INTO bueno_role_permissions (roleKey, permissionsJson, updatedAt) VALUES (?, ?, ?)");
        $stmt->execute([$data['roleKey'], json_encode(array_values($data['permissions'])), $date]);
    }

    // If settings are passed
    if (isset($data['settings']) && is_array($data['settings'])) {
        $stmt = $pdo->prepare("REPLACE INTO bueno_system_settings (settingKey, settingValue, updatedAt) VALUES (?, ?, ?)");
        foreach ($data['settings'] as $key => $val) {
            $stmt->execute([$key, json_encode($val), $date]);
        }
    }

    echo json_encode(['status' => 'success', 'message' => 'Permissions saved to SQL database']);
    exit();
}
