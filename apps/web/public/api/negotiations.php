<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (!$pdo) {
        echo json_encode(['status' => 'success', 'data' => []]);
        exit();
    }
    try {
        $stmt = $pdo->query("SELECT * FROM bueno_negotiations ORDER BY id DESC");
        $raw = $stmt->fetchAll();
        $result = array_map(function($r) {
            $r['messages'] = json_decode($r['messagesText'] ?? '[]', true);
            unset($r['messagesText']);
            return $r;
        }, $raw);
        echo json_encode(['status' => 'success', 'data' => $result]);
    } catch (Exception $e) {
        echo json_encode(['status' => 'success', 'data' => []]);
    }
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid negotiation data']);
        exit();
    }

    if (isset($data['action']) && $data['action'] === 'PURGE_ALL') {
        if ($pdo) {
            try { $pdo->exec("DELETE FROM bueno_negotiations"); } catch (Exception $e) {}
        }
        echo json_encode(['status' => 'success', 'message' => 'All negotiations purged']);
        exit();
    }

    $items = isset($data[0]) ? $data : [$data];

    if ($pdo) {
        try {
            $stmt = $pdo->prepare("REPLACE INTO bueno_negotiations (id, companyName, contactName, email, loadingStation, destination, cargoType, quantity, targetDate, status, messagesText, createdAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($items as $item) {
                if (!isset($item['id'])) continue;
                $id = htmlspecialchars($item['id']);
                $companyName = htmlspecialchars($item['companyName'] ?? ($item['company'] ?? ''));
                $contactName = htmlspecialchars($item['contactName'] ?? '');
                $email = htmlspecialchars(strtolower($item['email'] ?? ''));
                $loadingStation = htmlspecialchars($item['loadingStation'] ?? 'EWK');
                $destination = htmlspecialchars($item['destination'] ?? 'MNY');
                $cargoType = htmlspecialchars($item['cargoType'] ?? '');
                $quantity = htmlspecialchars($item['quantity'] ?? '5000');
                $targetDate = htmlspecialchars($item['targetDate'] ?? '');
                $status = htmlspecialchars($item['status'] ?? 'UNDER_NEGOTIATION');
                $messagesText = json_encode($item['messages'] ?? []);
                $createdAt = $item['createdAt'] ?? date('d/m/Y');

                $stmt->execute([
                    $id, $companyName, $contactName, $email, $loadingStation, $destination, $cargoType, $quantity, $targetDate, $status, $messagesText, $createdAt
                ]);
            }
        } catch (Exception $e) {}
    }

    echo json_encode(['status' => 'success', 'message' => 'Negotiations updated']);
    exit();
}
