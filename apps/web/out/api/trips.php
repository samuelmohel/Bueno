<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$storeFile = __DIR__ . '/bueno_trips_store.json';

// Helper to read backup JSON
function getTripsFromFile($file) {
    if (file_exists($file) && is_readable($file)) {
        $content = file_get_contents($file);
        $decoded = json_decode($content, true);
        if (is_array($decoded)) return $decoded;
    }
    return [];
}

// Helper to save backup JSON
function saveTripsToFile($file, $trips) {
    try {
        $current = getTripsFromFile($file);
        $map = [];
        foreach ($current as $item) {
            $key = $item['id'] ?? ($item['tripId'] ?? '');
            if ($key) $map[$key] = $item;
        }
        foreach ($trips as $item) {
            $key = $item['id'] ?? ($item['tripId'] ?? '');
            if ($key) $map[$key] = $item;
        }
        file_put_contents($file, json_encode(array_values($map), JSON_PRETTY_PRINT));
    } catch (Exception $e) {}
}

if ($method === 'GET') {
    $tripId = $_GET['id'] ?? $_GET['tripId'] ?? '';
    
    $result = [];
    if ($pdo) {
        try {
            if ($tripId !== '') {
                $stmt = $pdo->prepare("SELECT * FROM bueno_trips WHERE id = ? OR tripId = ? LIMIT 1");
                $stmt->execute([$tripId, $tripId]);
                $row = $stmt->fetch();
                if ($row) {
                    $row['wagonLogs'] = json_decode($row['wagonLogsText'] ?? '[]', true);
                    $row['feederTrucks'] = json_decode($row['feederTrucksText'] ?? '[]', true);
                    $row['damages'] = json_decode($row['damagesText'] ?? '{}', true);
                    $row['unloadLogs'] = json_decode($row['unloadLogsText'] ?? '[]', true);
                    unset($row['wagonLogsText'], $row['feederTrucksText'], $row['damagesText'], $row['unloadLogsText']);
                    echo json_encode(['status' => 'success', 'trip' => $row]);
                    exit();
                }
            } else {
                $stmt = $pdo->query("SELECT * FROM bueno_trips ORDER BY id DESC");
                $raw = $stmt->fetchAll();
                $result = array_map(function($r) {
                    $r['wagonLogs'] = json_decode($r['wagonLogsText'] ?? '[]', true);
                    $r['feederTrucks'] = json_decode($r['feederTrucksText'] ?? '[]', true);
                    $r['damages'] = json_decode($r['damagesText'] ?? '{}', true);
                    $r['unloadLogs'] = json_decode($r['unloadLogsText'] ?? '[]', true);
                    unset($row['wagonLogsText'], $row['feederTrucksText'], $row['damagesText'], $row['unloadLogsText']);
                    return $r;
                }, $raw);
            }
        } catch (Exception $e) {}
    }

    // If SQL empty or unavailable, fallback to file storage
    if (empty($result)) {
        $fileTrips = getTripsFromFile($storeFile);
        if ($tripId !== '') {
            foreach ($fileTrips as $ft) {
                if (($ft['id'] ?? '') === $tripId || ($ft['tripId'] ?? '') === $tripId) {
                    echo json_encode(['status' => 'success', 'trip' => $ft]);
                    exit();
                }
            }
        }
        $result = $fileTrips;
    }

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

    // 1. Always persist to resilient JSON file store first
    saveTripsToFile($storeFile, $trips);

    // 2. Persist to SQL database if connection available
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("REPLACE INTO bueno_trips (
                id, tripId, dealNumber, locomotiveId, cargoOfficerName, unloadingOfficerName,
                escortOfficerName, escortPhone, escortWagonId, company, clientEmail, cargoType,
                unitOfMeasure, wagonType, quantity, origin, destination, status, curLat, curLng,
                speed, departedAt, completedAt, dispatchTime, tripRevenue, tripCost,
                wagonLogsText, feederTrucksText, damagesText, unloadLogsText, createdAt
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?
            )");

            foreach ($trips as $t) {
                $id = $t['id'] ?? ('trip_' . time() . '_' . rand(100, 999));
                $tripId = $t['tripId'] ?? $id;
                $dealNumber = $t['dealNumber'] ?? '';
                $locomotiveId = $t['locomotiveId'] ?? 'L2205';
                $cargoOfficerName = $t['cargoOfficerName'] ?? 'Ade Bello (EWK-01)';
                $unloadingOfficerName = $t['unloadingOfficerName'] ?? 'Musa Ibrahim (MNY-01)';
                $escortOfficerName = $t['escortOfficerName'] ?? 'Officer Segun Alabi';
                $escortPhone = $t['escortPhone'] ?? '08031112233';
                $escortWagonId = $t['escortWagonId'] ?? 'BV 01';
                $company = $t['company'] ?? 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)';
                $clientEmail = $t['clientEmail'] ?? ($t['email'] ?? 'logistics@hbm.ng');
                $cargoType = $t['cargoType'] ?? 'Elephant Cement (50kg bags)';
                $unitOfMeasure = $t['unitOfMeasure'] ?? (stripos($cargoType, 'Gypsum') !== false || stripos($cargoType, 'Limestone') !== false || stripos($cargoType, 'MT') !== false ? 'Metric Tonnes (MT)' : 'Bags');
                $wagonType = $t['wagonType'] ?? ($unitOfMeasure === 'Metric Tonnes (MT)' ? 'Open Top Gondola Wagon' : 'Covered Hopper Wagon');
                $quantity = strval($t['quantity'] ?? '1600');
                $origin = $t['origin'] ?? 'EWK';
                $destination = $t['destination'] ?? 'MNY';
                $status = $t['status'] ?? 'LOADING';
                $curLat = floatval($t['curLat'] ?? 6.8974);
                $curLng = floatval($t['curLng'] ?? 3.2141);
                $speed = intval($t['speed'] ?? 0);
                $departedAt = $t['departedAt'] ?? '';
                $completedAt = $t['completedAt'] ?? '';
                $dispatchTime = $t['dispatchTime'] ?? ($departedAt ?: ($t['createdAt'] ?? date('d/m/Y, H:i')));
                $tripRevenue = isset($t['tripRevenue']) && $t['tripRevenue'] !== '' && floatval($t['tripRevenue']) > 0 ? floatval($t['tripRevenue']) : null;
                $tripCost = isset($t['tripCost']) && $t['tripCost'] !== '' && floatval($t['tripCost']) > 0 ? floatval($t['tripCost']) : null;
                $wagonLogsText = json_encode($t['wagonLogs'] ?? []);
                $feederTrucksText = json_encode($t['feederTrucks'] ?? []);
                $damagesText = json_encode($t['damages'] ?? []);
                $unloadLogsText = json_encode($t['unloadLogs'] ?? []);
                $createdAt = $t['createdAt'] ?? date('d/m/Y');

                $stmt->execute([
                    $id, $tripId, $dealNumber, $locomotiveId, $cargoOfficerName, $unloadingOfficerName,
                    $escortOfficerName, $escortPhone, $escortWagonId, $company, $clientEmail, $cargoType,
                    $unitOfMeasure, $wagonType, $quantity, $origin, $destination, $status, $curLat, $curLng,
                    $speed, $departedAt, $completedAt, $dispatchTime, $tripRevenue, $tripCost,
                    $wagonLogsText, $feederTrucksText, $damagesText, $unloadLogsText, $createdAt
                ]);
            }
        } catch (Exception $e) {}
    }

    echo json_encode(['status' => 'success', 'message' => 'Trips, Consists & Audit Logs saved successfully']);
    exit();
}
