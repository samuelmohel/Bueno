<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $tripId = $_GET['tripId'] ?? '';
    $id = $_GET['id'] ?? '';
    $company = $_GET['company'] ?? '';

    if ($id !== '') {
        $stmt = $pdo->prepare("SELECT * FROM bueno_invoices WHERE id = ? OR invoiceNumber = ? LIMIT 1");
        $stmt->execute([$id, $id]);
        $row = $stmt->fetch();
        if ($row) {
            $row['damageDetails'] = json_decode($row['damageDetailsJson'] ?? '[]', true);
            $row['paymentHistory'] = json_decode($row['paymentHistoryJson'] ?? '[]', true);
            $row['items'] = json_decode($row['itemsText'] ?? '[]', true);
            unset($row['damageDetailsJson'], $row['paymentHistoryJson'], $row['itemsText']);
            echo json_encode(['status' => 'success', 'data' => $row]);
            exit();
        }
    }

    if ($tripId !== '') {
        $stmt = $pdo->prepare("SELECT * FROM bueno_invoices WHERE tripId = ? LIMIT 1");
        $stmt->execute([$tripId]);
        $row = $stmt->fetch();
        if ($row) {
            $row['damageDetails'] = json_decode($row['damageDetailsJson'] ?? '[]', true);
            $row['paymentHistory'] = json_decode($row['paymentHistoryJson'] ?? '[]', true);
            $row['items'] = json_decode($row['itemsText'] ?? '[]', true);
            unset($row['damageDetailsJson'], $row['paymentHistoryJson'], $row['itemsText']);
            echo json_encode(['status' => 'success', 'data' => $row]);
            exit();
        }
    }

    $sql = "SELECT * FROM bueno_invoices";
    $params = [];
    if ($company !== '') {
        $sql .= " WHERE companyName LIKE ?";
        $params[] = "%$company%";
    }
    $sql .= " ORDER BY id DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $raw = $stmt->fetchAll();

    $result = array_map(function($r) {
        $r['damageDetails'] = json_decode($r['damageDetailsJson'] ?? '[]', true);
        $r['paymentHistory'] = json_decode($r['paymentHistoryJson'] ?? '[]', true);
        $r['items'] = json_decode($r['itemsText'] ?? '[]', true);
        unset($r['damageDetailsJson'], $r['paymentHistoryJson'], $r['itemsText']);
        return $r;
    }, $raw);

    echo json_encode(['status' => 'success', 'data' => $result]);
    exit();
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (!$data) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid invoice payload']);
        exit();
    }

    $invoices = isset($data[0]) ? $data : [$data];

    $stmt = $pdo->prepare("REPLACE INTO bueno_invoices (
        id, invoiceNumber, tripId, dealId, companyName, clientEmail, cargoType, route,
        totalBags, totalTonnes, ratePerTonne, subtotal, damageUnits, damageDeduction, tax,
        totalAmount, amountPaid, balance, status, paymentRef, damageDetailsJson, paymentHistoryJson,
        itemsText, issueDate, dueDate, createdAt
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?
    )");

    foreach ($invoices as $inv) {
        $id = $inv['id'] ?? ('INV-' . time());
        $invNo = $inv['invoiceNumber'] ?? $id;
        $tripId = $inv['tripId'] ?? '';
        $dealId = $inv['dealId'] ?? '';
        $companyName = htmlspecialchars($inv['companyName'] ?? $inv['company'] ?? 'Client');
        $clientEmail = htmlspecialchars($inv['clientEmail'] ?? '');
        $cargoType = htmlspecialchars($inv['cargoType'] ?? 'Bagged Cement (50kg)');
        $route = htmlspecialchars($inv['route'] ?? 'Ewekoro ➔ Moniya Siding');
        $totalBags = intval($inv['totalBags'] ?? $inv['quantity'] ?? 1600);
        $totalTonnes = floatval($inv['totalTonnes'] ?? ($totalBags * 0.05));
        $ratePerTonne = floatval($inv['ratePerTonne'] ?? 160000);
        $subtotal = floatval($inv['subtotal'] ?? $inv['grossAmount'] ?? ($totalBags * 8000));
        $damageUnits = intval($inv['damageUnits'] ?? 0);
        $damageDeduction = floatval($inv['damageDeduction'] ?? ($damageUnits * 8000));
        $tax = floatval($inv['tax'] ?? 0);
        $totalAmount = floatval($inv['totalAmount'] ?? $inv['netAmount'] ?? ($subtotal - $damageDeduction + $tax));
        $amountPaid = floatval($inv['amountPaid'] ?? $inv['paidAmount'] ?? 0);
        $balance = max(0, $totalAmount - $amountPaid);

        $status = $inv['status'] ?? (
            $balance <= 0 ? 'SETTLED' : ($amountPaid > 0 ? 'PARTIALLY_PAID' : 'ISSUED')
        );

        $paymentRef = htmlspecialchars($inv['paymentRef'] ?? '');
        $damageDetailsJson = json_encode($inv['damageDetails'] ?? []);
        $paymentHistoryJson = json_encode($inv['paymentHistory'] ?? []);
        $itemsText = json_encode($inv['items'] ?? []);
        $issueDate = htmlspecialchars($inv['issueDate'] ?? date('d/m/Y'));
        $dueDate = htmlspecialchars($inv['dueDate'] ?? date('d/m/Y', strtotime('+14 days')));
        $createdAt = htmlspecialchars($inv['createdAt'] ?? date('d/m/Y H:i'));

        $stmt->execute([
            $id, $invNo, $tripId, $dealId, $companyName, $clientEmail, $cargoType, $route,
            $totalBags, $totalTonnes, $ratePerTonne, $subtotal, $damageUnits, $damageDeduction, $tax,
            $totalAmount, $amountPaid, $balance, $status, $paymentRef, $damageDetailsJson, $paymentHistoryJson,
            $itemsText, $issueDate, $dueDate, $createdAt
        ]);
    }

    echo json_encode(['status' => 'success', 'message' => 'Commercial invoices saved successfully']);
    exit();
}
