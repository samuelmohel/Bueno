<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_negotiations ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    $result = array_map(function($r) {
        $r['messages'] = json_decode($r['messagesText'] ?? '[]', true);
        unset($r['messagesText']);
        return $r;
    }, $raw);
    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data || !isset($data['id'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid negotiation data']);
        exit();
    }

    $id = htmlspecialchars($data['id']);
    $companyName = htmlspecialchars($data['companyName'] ?? '');
    $contactName = htmlspecialchars($data['contactName'] ?? '');
    $loadingStation = htmlspecialchars($data['loadingStation'] ?? 'EWK');
    $destination = htmlspecialchars($data['destination'] ?? 'MNY');
    $cargoType = htmlspecialchars($data['cargoType'] ?? '');
    $quantity = htmlspecialchars($data['quantity'] ?? '5000');
    $targetDate = htmlspecialchars($data['targetDate'] ?? '');
    $status = htmlspecialchars($data['status'] ?? 'UNDER_NEGOTIATION');
    $messagesText = json_encode($data['messages'] ?? []);
    $createdAt = date('d/m/Y');

    $stmt = $pdo->prepare("INSERT INTO bueno_negotiations (id, companyName, contactName, loadingStation, destination, cargoType, quantity, targetDate, status, messagesText, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET status=?, messagesText=?");

    $stmt->execute([
        $id, $companyName, $contactName, $loadingStation, $destination, $cargoType, $quantity, $targetDate, $status, $messagesText, $createdAt,
        $status, $messagesText
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Negotiation thread updated']);
    exit();
}
