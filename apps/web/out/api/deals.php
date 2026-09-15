<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];
$storeFile = __DIR__ . '/bueno_deals_store.json';

function getDealsFromFile($file) {
    if (file_exists($file) && is_readable($file)) {
        $content = file_get_contents($file);
        $decoded = json_decode($content, true);
        if (is_array($decoded)) return $decoded;
    }
    return [];
}

function saveDealsToFile($file, $deals) {
    try {
        file_put_contents($file, json_encode(array_values($deals), JSON_PRETTY_PRINT));
    } catch (Exception $e) {}
}

if ($method === 'GET') {
    $result = [];
    $hasDb = false;

    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM bueno_deals ORDER BY id DESC");
            $result = $stmt->fetchAll();
            $hasDb = true;
        } catch (Exception $e) {}
    }

    // Only fallback to file store if database connection failed entirely
    if (!$hasDb) {
        $result = getDealsFromFile($storeFile);
    }

    $sanitized = array_map(function($d) {
        if (isset($d['company']) && stripos($d['company'], 'Lafarge') !== false) {
            $d['company'] = 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)';
        }
        if (isset($d['company']) && stripos($d['company'], 'Dangote') !== false) {
            $d['company'] = 'Purechem Cement Industries Ltd';
        }
        if (isset($d['cargoType']) && stripos($d['cargoType'], 'Elephant') !== false) {
            $d['cargoType'] = 'Huaxin Portland Cement (50kg)';
        }
        return $d;
    }, $result);

    echo json_encode([
        'status' => 'success',
        'data' => array_values($sanitized),
        'serverTime' => gmdate('Y-m-d\\TH:i:s\\Z'),
        'count' => count($sanitized)
    ]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid deal data']);
        exit();
    }

    // Purge all deals
    if (isset($data['action']) && $data['action'] === 'PURGE_ALL') {
        @unlink($storeFile);
        if ($pdo) {
            try {
                $pdo->exec("DELETE FROM bueno_deals");
            } catch (Exception $e) {}
        }
        echo json_encode(['status' => 'success', 'message' => 'All deals purged successfully', 'data' => []]);
        exit();
    }

    // Delete single deal
    if (isset($data['action']) && $data['action'] === 'DELETE' && isset($data['id'])) {
        $existing = getDealsFromFile($storeFile);
        $filtered = array_filter($existing, function($d) use ($data) {
            return ($d['id'] ?? '') !== $data['id'] && ($d['dealNumber'] ?? '') !== $data['id'];
        });
        saveDealsToFile($storeFile, $filtered);

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM bueno_deals WHERE id = ? OR dealNumber = ?");
                $stmt->execute([$data['id'], $data['id']]);
            } catch (Exception $e) {}
        }
        echo json_encode(['status' => 'success', 'message' => 'Deal deleted successfully']);
        exit();
    }

    $deals = isset($data[0]) ? $data : [$data];

    // Save authoritative array to JSON file store
    saveDealsToFile($storeFile, $deals);

    // Save to SQL Database
    if ($pdo) {
        try {
            $stmt = $pdo->prepare("REPLACE INTO bueno_deals (id, dealNumber, company, loadingStation, destination, cargoType, quantity, status, tripId, createdBy, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($deals as $d) {
                $id = $d['id'] ?? ('DEAL-' . rand(100, 999));
                $dealNumber = htmlspecialchars($d['dealNumber'] ?? $id);
                $company = htmlspecialchars($d['company'] ?? $d['companyName'] ?? 'Client');
                $loadingStation = htmlspecialchars($d['loadingStation'] ?? 'EWK');
                $destination = htmlspecialchars($d['destination'] ?? 'MNY');
                $cargoType = htmlspecialchars($d['cargoType'] ?? 'Cement');
                $quantity = htmlspecialchars($d['quantity'] ?? '1610');
                $status = htmlspecialchars($d['status'] ?? 'ACTIVE');
                $tripId = isset($d['tripId']) ? htmlspecialchars($d['tripId']) : null;
                $createdBy = htmlspecialchars($d['createdBy'] ?? 'Admin');
                $createdAt = htmlspecialchars($d['createdAt'] ?? date('d/m/Y H:i'));

                $stmt->execute([
                    $id, $dealNumber, $company, $loadingStation, $destination, $cargoType, $quantity, $status, $tripId, $createdBy, $createdAt
                ]);
            }
        } catch (Exception $e) {}
    }

    echo json_encode(['status' => 'success', 'message' => 'Deals updated successfully', 'count' => count($deals)]);
    exit();
}
