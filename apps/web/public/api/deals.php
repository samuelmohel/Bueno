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
        $current = getDealsFromFile($file);
        $map = [];
        foreach ($current as $item) {
            $key = $item['id'] ?? ($item['dealNumber'] ?? '');
            if ($key) $map[$key] = $item;
        }
        foreach ($deals as $item) {
            $key = $item['id'] ?? ($item['dealNumber'] ?? '');
            if ($key) $map[$key] = $item;
        }
        file_put_contents($file, json_encode(array_values($map), JSON_PRETTY_PRINT));
    } catch (Exception $e) {}
}

if ($method === 'GET') {
    $result = [];
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT * FROM bueno_deals ORDER BY id DESC");
            $result = $stmt->fetchAll();
        } catch (Exception $e) {}
    }

    if (empty($result)) {
        $result = getDealsFromFile($storeFile);
    }

    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid deal data']);
        exit();
    }

    // Check if single deletion request { action: 'DELETE', id: 'DEAL-001' }
    if (isset($data['action']) && $data['action'] === 'DELETE' && isset($data['id'])) {
        try {
            $existing = getDealsFromFile($storeFile);
            $filtered = array_filter($existing, function($d) use ($data) {
                return ($d['id'] ?? '') !== $data['id'];
            });
            file_put_contents($storeFile, json_encode(array_values($filtered), JSON_PRETTY_PRINT));
        } catch (Exception $e) {}

        if ($pdo) {
            try {
                $stmt = $pdo->prepare("DELETE FROM bueno_deals WHERE id = ?");
                $stmt->execute([$data['id']]);
            } catch (Exception $e) {}
        }
        echo json_encode(['status' => 'success', 'message' => 'Deal deleted successfully']);
        exit();
    }

    $deals = isset($data[0]) ? $data : [$data];

    // 1. Save to JSON file store
    saveDealsToFile($storeFile, $deals);

    // 2. Save to SQL Database if available
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

    echo json_encode(['status' => 'success', 'message' => 'Deals updated successfully']);
    exit();
}
