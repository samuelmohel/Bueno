<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Ensure bueno_gps_logs table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_gps_logs (
        id VARCHAR(100) PRIMARY KEY,
        tripId VARCHAR(100),
        locomotiveId VARCHAR(100),
        lat REAL,
        lng REAL,
        speed INT DEFAULT 0,
        heading REAL DEFAULT 0,
        accuracy REAL DEFAULT 3,
        batteryLevel INT DEFAULT 100,
        officerPhone VARCHAR(50),
        signalQuality VARCHAR(50) DEFAULT 'MOBILE_PHONE_GPS_LIVE',
        timestamp VARCHAR(100)
    )");
} catch (Exception $e) {}

if ($method === 'GET') {
    $locoId = $_GET['locomotiveId'] ?? $_GET['locoId'] ?? '';
    $tripId = $_GET['tripId'] ?? '';

    if ($locoId !== '') {
        $stmt = $pdo->prepare("SELECT * FROM bueno_gps_logs WHERE locomotiveId = ? ORDER BY id DESC LIMIT 50");
        $stmt->execute([$locoId]);
        $logs = $stmt->fetchAll();
        $latest = $logs[0] ?? null;
        echo json_encode(['status' => 'success', 'latest' => $latest, 'breadcrumbs' => array_reverse($logs)]);
        exit();
    }

    if ($tripId !== '') {
        $stmt = $pdo->prepare("SELECT * FROM bueno_gps_logs WHERE tripId = ? ORDER BY id DESC LIMIT 50");
        $stmt->execute([$tripId]);
        $logs = $stmt->fetchAll();
        $latest = $logs[0] ?? null;
        echo json_encode(['status' => 'success', 'latest' => $latest, 'breadcrumbs' => array_reverse($logs)]);
        exit();
    }

    $stmt = $pdo->query("SELECT * FROM bueno_gps_logs ORDER BY id DESC LIMIT 100");
    $logs = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $logs]);
    exit();
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid GPS telemetry payload']);
        exit();
    }

    $id = 'gps_' . time() . '_' . rand(100, 999);
    $locomotiveId = $data['locomotiveId'] ?? $_GET['locomotiveId'] ?? 'L2205';
    $tripId = $data['tripId'] ?? '';
    $lat = floatval($data['lat'] ?? 6.8974);
    $lng = floatval($data['lng'] ?? 3.2141);
    $speed = intval($data['speed'] ?? 68);
    $heading = floatval($data['heading'] ?? 45);
    $accuracy = floatval($data['accuracy'] ?? 2.8);
    $battery = intval($data['batteryLevel'] ?? 92);
    $officerPhone = $data['officerPhone'] ?? '';
    $signal = $data['signalQuality'] ?? 'MOBILE_PHONE_GPS_LIVE';
    $timeStr = date('H:i:s');

    // 1. Insert into telemetry log
    try {
        $stmt = $pdo->prepare("INSERT INTO bueno_gps_logs (id, tripId, locomotiveId, lat, lng, speed, heading, accuracy, batteryLevel, officerPhone, signalQuality, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $tripId, $locomotiveId, $lat, $lng, $speed, $heading, $accuracy, $battery, $officerPhone, $signal, $timeStr]);
    } catch (Exception $e) {}

    // 2. Update current position in active trip
    try {
        if ($tripId !== '') {
            $stmt = $pdo->prepare("UPDATE bueno_trips SET curLat = ?, curLng = ? WHERE id = ? OR tripId = ?");
            $stmt->execute([$lat, $lng, $tripId, $tripId]);
        } else {
            $stmt = $pdo->prepare("UPDATE bueno_trips SET curLat = ?, curLng = ? WHERE locomotiveId = ? AND status = 'IN_TRANSIT'");
            $stmt->execute([$lat, $lng, $locomotiveId]);
        }
    } catch (Exception $e) {}

    echo json_encode([
        'status' => 'success',
        'message' => 'GPS ping ingested successfully',
        'ping' => [
            'locomotiveId' => $locomotiveId,
            'lat' => $lat,
            'lng' => $lng,
            'speed' => $speed,
            'battery' => $battery,
            'timestamp' => $timeStr
        ]
    ]);
    exit();
}
