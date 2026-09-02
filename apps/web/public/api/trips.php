<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if (isset($_GET['purge']) && $_GET['purge'] === 'true') {
    try {
        $pdo->exec("DELETE FROM bueno_trips");
    } catch (Exception $e) {}
    echo json_encode(['status' => 'success', 'message' => 'All former trips purged from database']);
    exit();
}

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_trips ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    $result = array_map(function($r) {
        $r['wagonLogs'] = json_decode($r['wagonLogsText'] ?? '[]', true);
        unset($r['wagonLogsText']);
        return $r;
    }, $raw);
    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid trip data']);
        exit();
    }

    $trips = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("REPLACE INTO bueno_trips (id, tripId, locomotiveId, cargoOfficerName, unloadingOfficerName, company, cargoType, quantity, origin, destination, status, curLat, curLng, wagonLogsText, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($trips as $t) {
        $id = $t['id'] ?? ('trip_' . time());
        $tripId = $t['tripId'] ?? $id;
        $locomotiveId = $t['locomotiveId'] ?? 'L2205';
        $cargoOfficerName = $t['cargoOfficerName'] ?? 'Ade Bello (EWK-01)';
        $unloadingOfficerName = $t['unloadingOfficerName'] ?? 'Musa Ibrahim (MNY-01)';
        $company = $t['company'] ?? 'Lafarge Africa Plc';
        $cargoType = $t['cargoType'] ?? 'Elephant Cement (50kg bags)';
        $quantity = $t['quantity'] ?? '1600';
        $origin = $t['origin'] ?? 'EWK';
        $destination = $t['destination'] ?? 'MNY';
        $status = $t['status'] ?? 'LOADING';
        $curLat = floatval($t['curLat'] ?? 6.8974);
        $curLng = floatval($t['curLng'] ?? 3.2141);
        $wagonLogsText = json_encode($t['wagonLogs'] ?? []);
        $createdAt = $t['createdAt'] ?? date('d/m/Y');

        $stmt->execute([
            $id, $tripId, $locomotiveId, $cargoOfficerName, $unloadingOfficerName, $company, $cargoType, $quantity, $origin, $destination, $status, $curLat, $curLng, $wagonLogsText, $createdAt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Trips & GPS telemetry saved to database']);
    exit();
}
