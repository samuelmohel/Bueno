<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $tripId = $_GET['tripId'] ?? '';

    if ($tripId !== '') {
        $stmt = $pdo->prepare("SELECT * FROM bueno_trip_costs WHERE tripId = ? ORDER BY id DESC");
        $stmt->execute([$tripId]);
        $rows = $stmt->fetchAll();
        echo json_encode(['status' => 'success', 'data' => $rows]);
        exit();
    }

    $stmt = $pdo->query("SELECT * FROM bueno_trip_costs ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $raw]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid cost payload']);
        exit();
    }

    // Handle single item deletion request
    if (isset($data['action']) && $data['action'] === 'DELETE' && isset($data['id'])) {
        $stmt = $pdo->prepare("DELETE FROM bueno_trip_costs WHERE id = ?");
        $stmt->execute([$data['id']]);
        echo json_encode(['status' => 'success', 'message' => 'Trip cost voucher deleted']);
        exit();
    }

    $costs = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("REPLACE INTO bueno_trip_costs (
        id, tripId, category, title, vendor, amount, voucherNo, paymentStatus, recordedBy, date, createdAt
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )");

    foreach ($costs as $c) {
        $id = $c['id'] ?? ('CST-' . time() . '-' . rand(100, 999));
        $tripId = htmlspecialchars($c['tripId'] ?? 'TRP-101');
        $category = htmlspecialchars($c['category'] ?? 'OTHER');
        $title = htmlspecialchars($c['title'] ?? 'Direct Corridor Cost');
        $vendor = htmlspecialchars($c['vendor'] ?? 'Corridor Vendor');
        $amount = floatval($c['amount'] ?? 0);
        $voucherNo = htmlspecialchars($c['voucherNo'] ?? ('VCH-' . rand(1000, 9999)));
        $paymentStatus = htmlspecialchars($c['paymentStatus'] ?? 'PAID');
        $recordedBy = htmlspecialchars($c['recordedBy'] ?? 'Finance Officer');
        $date = htmlspecialchars($c['date'] ?? date('d/m/Y'));
        $createdAt = htmlspecialchars($c['createdAt'] ?? date('d/m/Y H:i'));

        $stmt->execute([
            $id, $tripId, $category, $title, $vendor, $amount, $voucherNo, $paymentStatus, $recordedBy, $date, $createdAt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Direct trip cost vouchers saved successfully']);
    exit();
}
