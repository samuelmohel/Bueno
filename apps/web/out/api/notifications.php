<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_notifications ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    $result = array_map(function($r) {
        $r['read'] = (bool)$r['readInt'];
        unset($r['readInt']);
        return $r;
    }, $raw);
    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid notification data']);
        exit();
    }

    $notifs = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("REPLACE INTO bueno_notifications (id, title, body, time, type, targetId, targetTab, readInt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($notifs as $n) {
        $id = $n['id'] ?? ('notif_' . time() . '_' . rand(100, 999));
        $title = htmlspecialchars($n['title'] ?? 'Notification');
        $body = htmlspecialchars($n['body'] ?? $n['message'] ?? '');
        $timeStr = htmlspecialchars($n['time'] ?? $n['createdAt'] ?? 'Just now');
        $type = htmlspecialchars($n['type'] ?? 'GENERAL');
        $targetId = htmlspecialchars($n['targetId'] ?? '');
        $targetTab = htmlspecialchars($n['targetTab'] ?? '');
        $readInt = !empty($n['read']) ? 1 : 0;

        $stmt->execute([
            $id, $title, $body, $timeStr, $type, $targetId, $targetTab, $readInt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Notifications saved to database']);
    exit();
}
