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

    $stmt = $pdo->prepare("INSERT INTO bueno_deals (id, dealNumber, company, loadingStation, destination, cargoType, quantity, createdBy, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET dealNumber=?, company=?, loadingStation=?, destination=?, cargoType=?, quantity=?, createdBy=?");

    foreach ($deals as $d) {
        $id = $d['id'] ?? ('DEAL-' . rand(100, 999));
        $dealNumber = htmlspecialchars($d['dealNumber'] ?? '001');
        $company = htmlspecialchars($d['company'] ?? 'Client');
        $loadingStation = htmlspecialchars($d['loadingStation'] ?? 'EWK');
        $destination = htmlspecialchars($d['destination'] ?? 'MNY');
        $cargoType = htmlspecialchars($d['cargoType'] ?? 'Cement');
        $quantity = htmlspecialchars($d['quantity'] ?? '1610');
        $createdBy = htmlspecialchars($d['createdBy'] ?? 'Admin');
        $createdAt = htmlspecialchars($d['createdAt'] ?? date('d/m/Y H:i'));

        $stmt->execute([
            $id, $dealNumber, $company, $loadingStation, $destination, $cargoType, $quantity, $createdBy, $createdAt,
            $dealNumber, $company, $loadingStation, $destination, $cargoType, $quantity, $createdBy
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Deals updated successfully in database']);
    exit();
}
