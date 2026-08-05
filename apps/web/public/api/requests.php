<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_fund_requests ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    $result = array_map(function($r) {
        $r['conversation'] = json_decode($r['conversationText'] ?? '[]', true);
        $r['paymentDetails'] = json_decode($r['paymentDetailsText'] ?? 'null', true);
        unset($r['conversationText'], $r['paymentDetailsText']);
        return $r;
    }, $raw);
    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid request data']);
        exit();
    }

    $requests = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("INSERT INTO bueno_fund_requests (id, title, officerName, station, amount, category, description, stage, conversationText, paymentDetailsText, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET stage=?, conversationText=?, paymentDetailsText=?");

    foreach ($requests as $r) {
        $id = $r['id'] ?? ('REQ-' . time());
        $title = htmlspecialchars($r['title'] ?? 'Fund Request');
        $officerName = htmlspecialchars($r['officerName'] ?? 'Cargo Officer');
        $station = htmlspecialchars($r['station'] ?? 'EWK');
        $amount = floatval($r['amount'] ?? 0);
        $category = htmlspecialchars($r['category'] ?? 'Equipment');
        $description = htmlspecialchars($r['description'] ?? '');
        $stage = htmlspecialchars($r['stage'] ?? 'Admin');
        $conversationText = json_encode($r['conversation'] ?? []);
        $paymentDetailsText = json_encode($r['paymentDetails'] ?? null);
        $date = htmlspecialchars($r['date'] ?? date('d/m/Y'));

        $stmt->execute([
            $id, $title, $officerName, $station, $amount, $category, $description, $stage, $conversationText, $paymentDetailsText, $date,
            $stage, $conversationText, $paymentDetailsText
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Fund requests saved to database']);
    exit();
}
