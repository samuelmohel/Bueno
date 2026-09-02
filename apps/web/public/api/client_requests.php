<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM bueno_client_requests ORDER BY id DESC");
        $raw = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $raw]);
    } catch (Exception $e) {
        echo json_encode(['status' => 'success', 'data' => []]);
    }
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid client request data']);
        exit();
    }

    $requests = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("REPLACE INTO bueno_client_requests (id, companyName, industry, contactName, email, phone, volume, route, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($requests as $r) {
        $id = $r['id'] ?? ('CRQ-' . time() . '-' . rand(100, 999));
        $companyName = htmlspecialchars($r['companyName'] ?? $r['company'] ?? 'Industrial Consignee Client');
        $industry = htmlspecialchars($r['industry'] ?? 'Manufacturing & Construction');
        $contactName = htmlspecialchars($r['contactName'] ?? 'Logistics Manager');
        $email = htmlspecialchars($r['email'] ?? '');
        $phone = htmlspecialchars($r['phone'] ?? '');
        $volume = htmlspecialchars($r['volume'] ?? ($r['quantity'] ?? '2,000 Bags'));
        $route = htmlspecialchars($r['route'] ?? 'Ewekoro ➔ Moniya Siding');
        $status = htmlspecialchars($r['status'] ?? 'PENDING');
        $createdAt = htmlspecialchars($r['createdAt'] ?? date('d/m/Y, H:i'));

        $stmt->execute([
            $id, $companyName, $industry, $contactName, $email, $phone, $volume, $route, $status, $createdAt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Client request saved to SQL database']);
    exit();
}
