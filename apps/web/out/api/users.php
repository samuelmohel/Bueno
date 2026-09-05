<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_users ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    $result = array_map(function($r) {
        $r['permissions'] = json_decode($r['permissionsText'] ?? 'null', true);
        unset($r['permissionsText']);
        if (isset($r['companyName']) && stripos($r['companyName'], 'Lafarge') !== false) {
            $r['companyName'] = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)';
        }
        if (isset($r['fullName']) && stripos($r['fullName'], 'Lafarge') !== false) {
            $r['fullName'] = 'Huaxin Logistics Desk';
        }
        if (isset($r['email']) && stripos($r['email'], 'lafarge') !== false) {
            $r['email'] = 'logistics@hbm.ng';
        }
        if (isset($r['companyName']) && stripos($r['companyName'], 'Dangote') !== false) {
            $r['companyName'] = 'Purechem Cement Industries Ltd';
        }
        if (isset($r['fullName']) && stripos($r['fullName'], 'Dangote') !== false) {
            $r['fullName'] = 'Purechem Logistics Team';
        }
        if (isset($r['email']) && stripos($r['email'], 'dangote') !== false) {
            $r['email'] = 'logistics@purechem.ng';
        }
        return $r;
    }, $raw);
    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid payload']);
        exit();
    }

    $usersToSave = isset($data[0]) ? $data : [$data];

    foreach ($usersToSave as $u) {
        if (!isset($u['fullName']) && !isset($u['id'])) continue;
        $id = $u['id'] ?? ('usr_' . time() . '_' . rand(100, 999));
        $fullName = htmlspecialchars($u['fullName'] ?? 'User');
        $email = htmlspecialchars($u['email'] ?? '');
        $phone = htmlspecialchars($u['phone'] ?? '');
        $role = htmlspecialchars($u['role'] ?? 'CUSTOMER');
        $userType = htmlspecialchars($u['userType'] ?? 'CUSTOMER');
        $assignedStation = htmlspecialchars($u['assignedStation'] ?? '');
        $companyName = htmlspecialchars($u['companyName'] ?? '');
        $staffId = htmlspecialchars($u['staffId'] ?? ('CUST-' . rand(1000, 9999)));
        $pin = htmlspecialchars($u['pin'] ?? '1111');
        $status = htmlspecialchars($u['status'] ?? 'ACTIVE');
        $permissionsText = json_encode($u['permissions'] ?? null);
        $createdAt = date('d/m/Y');

        try {
            // MySQL & SQLite dual upsert compatible
            $stmt = $pdo->prepare("INSERT INTO bueno_users (id, fullName, email, phone, role, userType, assignedStation, companyName, staffId, pin, status, permissionsText, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE fullName=VALUES(fullName), email=VALUES(email), phone=VALUES(phone), role=VALUES(role), userType=VALUES(userType), assignedStation=VALUES(assignedStation), companyName=VALUES(companyName), staffId=VALUES(staffId), pin=VALUES(pin), status=VALUES(status), permissionsText=VALUES(permissionsText)");
            $stmt->execute([$id, $fullName, $email, $phone, $role, $userType, $assignedStation, $companyName, $staffId, $pin, $status, $permissionsText, $createdAt]);
        } catch (Exception $e) {
            // Fallback for SQLite or PDO driver variation
            try {
                $stmt = $pdo->prepare("REPLACE INTO bueno_users (id, fullName, email, phone, role, userType, assignedStation, companyName, staffId, pin, status, permissionsText, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$id, $fullName, $email, $phone, $role, $userType, $assignedStation, $companyName, $staffId, $pin, $status, $permissionsText, $createdAt]);
            } catch (Exception $e2) {}
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Users saved & updated successfully to database',
        'count' => count($usersToSave)
    ]);
    exit();
}
