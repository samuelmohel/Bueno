<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_wagons ORDER BY id ASC");
    $raw = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $raw]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid wagon data']);
        exit();
    }

    $wagons = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("REPLACE INTO bueno_wagons (id, wagonType, payloadCapacity, capacity, status, currentStation, gauge, addedBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($wagons as $w) {
        $id = $w['id'] ?? ('PXG-' . rand(1000, 9999));
        $wagonType = htmlspecialchars($w['wagonType'] ?? 'Covered Hopper Wagon');
        $payloadCapacity = htmlspecialchars($w['payloadCapacity'] ?? '60 MT (1,200 Bags)');
        $capacity = intval($w['capacity'] ?? 1200);
        $status = htmlspecialchars($w['status'] ?? 'AVAILABLE');
        $currentStation = htmlspecialchars($w['currentStation'] ?? 'EWK');
        $gauge = htmlspecialchars($w['gauge'] ?? 'STANDARD_GAUGE');
        $addedBy = htmlspecialchars($w['addedBy'] ?? 'System Registry');
        $createdAt = htmlspecialchars($w['createdAt'] ?? date('d/m/Y'));

        $stmt->execute([
            $id, $wagonType, $payloadCapacity, $capacity, $status, $currentStation, $gauge, $addedBy, $createdAt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Wagons updated successfully in database', 'count' => count($wagons)]);
    exit();
}
