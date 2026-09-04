<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM bueno_fund_requests ORDER BY id DESC");
    $raw = $stmt->fetchAll();
    $result = array_map(function($r) {
        $stage = $r['stage'] ?? 'Admin';
        $status = !empty($r['status']) ? $r['status'] : (
            $stage === 'Paid' ? 'DISBURSED' : (
                $stage === 'CEO' ? 'CEO_APPROVED' : (
                    ($stage === 'Head of Operations' || $stage === 'Accountant') ? 'APPROVED' : 'PENDING'
                )
            )
        );

        $r['status'] = $status;
        $r['stage'] = $stage;
        $r['requisitionNo'] = !empty($r['requisitionNo']) ? $r['requisitionNo'] : $r['id'];
        $r['requestedBy'] = !empty($r['requestedBy']) ? $r['requestedBy'] : ($r['officerName'] ?? 'Ade Bello (Cargo Officer)');
        $r['tripNo'] = !empty($r['tripNo']) ? $r['tripNo'] : 'TRIP-001';
        $r['vesselNo'] = !empty($r['vesselNo']) ? $r['vesselNo'] : 'VSL-APMT-992';
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

    $stmt = $pdo->prepare("REPLACE INTO bueno_fund_requests (
        id, requisitionNo, title, officerName, requestedBy, officerId, station, tripNo, tripId, vesselNo, amount, category, description, stage, status, conversationText, paymentDetailsText, date, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    foreach ($requests as $r) {
        $id = $r['id'] ?? ('REQ-' . time());
        $reqNo = $r['requisitionNo'] ?? $id;
        $title = htmlspecialchars($r['title'] ?? 'Operational Fund Requisition');
        $officerName = htmlspecialchars($r['officerName'] ?? $r['requestedBy'] ?? 'Cargo Officer');
        $requestedBy = htmlspecialchars($r['requestedBy'] ?? $officerName);
        $officerId = htmlspecialchars($r['officerId'] ?? 'usr_1');
        $station = htmlspecialchars($r['station'] ?? 'EWK');
        $tripNo = htmlspecialchars($r['tripNo'] ?? 'TRIP-001');
        $tripId = htmlspecialchars($r['tripId'] ?? $tripNo);
        $vesselNo = htmlspecialchars($r['vesselNo'] ?? 'VSL-APMT-992');
        $amount = floatval($r['amount'] ?? 0);
        $category = htmlspecialchars($r['category'] ?? 'Operational Expense');
        $description = htmlspecialchars($r['description'] ?? '');
        $stage = htmlspecialchars($r['stage'] ?? 'Admin');
        $status = htmlspecialchars($r['status'] ?? ($stage === 'Paid' ? 'DISBURSED' : ($stage === 'CEO' ? 'CEO_APPROVED' : ($stage === 'Head of Operations' || $stage === 'Accountant' ? 'APPROVED' : 'PENDING'))));
        $conversationText = json_encode($r['conversation'] ?? []);
        $paymentDetailsText = json_encode($r['paymentDetails'] ?? null);
        $date = htmlspecialchars($r['date'] ?? date('d/m/Y'));
        $createdAt = htmlspecialchars($r['createdAt'] ?? date('Y-m-d H:i:s'));

        $stmt->execute([
            $id, $reqNo, $title, $officerName, $requestedBy, $officerId, $station, $tripNo, $tripId, $vesselNo, $amount, $category, $description, $stage, $status, $conversationText, $paymentDetailsText, $date, $createdAt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Fund requests saved to database']);
    exit();
}
