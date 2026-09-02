<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_deals ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    echo json_encode(['status' => 'success', 'data' => $raw]);
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
        $stmt = $pdo->prepare("DELETE FROM bueno_deals WHERE id = ?");
        $stmt->execute([$data['id']]);
        echo json_encode(['status' => 'success', 'message' => 'Deal deleted successfully from database']);
        exit();
    }

    $deals = isset($data[0]) ? $data : [$data];

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

    echo json_encode(['status' => 'success', 'message' => 'Deals updated successfully in database']);
    exit();
}
