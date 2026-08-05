<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_users ORDER BY id DESC");
    $users = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $users]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data || !isset($data['fullName'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid user data']);
        exit();
    }

    $id = $data['id'] ?? ('usr_' . time());
    $fullName = htmlspecialchars($data['fullName']);
    $email = htmlspecialchars($data['email'] ?? '');
    $phone = htmlspecialchars($data['phone'] ?? '');
    $role = htmlspecialchars($data['role'] ?? 'CUSTOMER');
    $userType = htmlspecialchars($data['userType'] ?? 'CUSTOMER');
    $assignedStation = htmlspecialchars($data['assignedStation'] ?? '');
    $companyName = htmlspecialchars($data['companyName'] ?? '');
    $staffId = htmlspecialchars($data['staffId'] ?? ('CUST-' . rand(1000, 9999)));
    $pin = htmlspecialchars($data['pin'] ?? '1111');
    $status = htmlspecialchars($data['status'] ?? 'ACTIVE');
    $createdAt = date('d/m/Y');

    // Insert or replace user
    $stmt = $pdo->prepare("INSERT INTO bueno_users (id, fullName, email, phone, role, userType, assignedStation, companyName, staffId, pin, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET fullName=?, email=?, phone=?, role=?, userType=?, assignedStation=?, companyName=?, staffId=?, pin=?, status=?");

    $stmt->execute([
        $id, $fullName, $email, $phone, $role, $userType, $assignedStation, $companyName, $staffId, $pin, $status, $createdAt,
        $fullName, $email, $phone, $role, $userType, $assignedStation, $companyName, $staffId, $pin, $status
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'User saved successfully to database',
        'data' => [
            'id' => $id, 'fullName' => $fullName, 'email' => $email, 'phone' => $phone,
            'role' => $role, 'userType' => $userType, 'companyName' => $companyName, 'staffId' => $staffId, 'pin' => $pin
        ]
    ]);
    exit();
}
