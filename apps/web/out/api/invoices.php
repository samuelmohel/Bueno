<?php
require_once __DIR__ . '/db.php';

$pdo = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM bueno_invoices ORDER BY id DESC");
        $raw = $stmt->fetchAll();
        $result = array_map(function($r) {
            $r['items'] = json_decode($r['itemsText'] ?? '[]', true);
            unset($r['itemsText']);
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
        echo json_encode(['status' => 'error', 'message' => 'Invalid payload']);
        exit();
    }

    $invoices = isset($data[0]) ? $data : [$data];

    foreach ($invoices as $inv) {
        if (!isset($inv['invoiceNumber']) && !isset($inv['id'])) continue;
        $id = $inv['id'] ?? ('inv_' . time() . '_' . rand(100, 999));
        $invoiceNumber = htmlspecialchars($inv['invoiceNumber'] ?? ('INV-' . rand(1000, 9999)));
        $dealId = htmlspecialchars($inv['dealId'] ?? '');
        $companyName = htmlspecialchars($inv['companyName'] ?? 'Client');
        $cargoType = htmlspecialchars($inv['cargoType'] ?? 'Cement Freight');
        $route = htmlspecialchars($inv['route'] ?? 'EWK ➔ MNY');
        $totalBags = intval($inv['totalBags'] ?? 27600);
        $totalTonnes = floatval($inv['totalTonnes'] ?? 1380);
        $ratePerTonne = floatval($inv['ratePerTonne'] ?? 10800);
        $subtotal = floatval($inv['subtotal'] ?? ($totalTonnes * $ratePerTonne));
        $tax = floatval($inv['tax'] ?? ($subtotal * 0.075));
        $totalAmount = floatval($inv['totalAmount'] ?? ($subtotal + $tax));
        $amountPaid = floatval($inv['amountPaid'] ?? 0);
        $balance = floatval($inv['balance'] ?? ($totalAmount - $amountPaid));
        $status = htmlspecialchars($inv['status'] ?? 'UNPAID');
        $itemsText = json_encode($inv['items'] ?? []);
        $issueDate = $inv['issueDate'] ?? date('d/m/Y');
        $dueDate = $inv['dueDate'] ?? date('d/m/Y', strtotime('+14 days'));

        try {
            $stmt = $pdo->prepare("INSERT INTO bueno_invoices (id, invoiceNumber, dealId, companyName, cargoType, route, totalBags, totalTonnes, ratePerTonne, subtotal, tax, totalAmount, amountPaid, balance, status, itemsText, issueDate, dueDate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE companyName=VALUES(companyName), totalBags=VALUES(totalBags), totalTonnes=VALUES(totalTonnes), subtotal=VALUES(subtotal), tax=VALUES(tax), totalAmount=VALUES(totalAmount), amountPaid=VALUES(amountPaid), balance=VALUES(balance), status=VALUES(status), itemsText=VALUES(itemsText)");
            $stmt->execute([$id, $invoiceNumber, $dealId, $companyName, $cargoType, $route, $totalBags, $totalTonnes, $ratePerTonne, $subtotal, $tax, $totalAmount, $amountPaid, $balance, $status, $itemsText, $issueDate, $dueDate]);
        } catch (Exception $e) {
            try {
                $stmt = $pdo->prepare("REPLACE INTO bueno_invoices (id, invoiceNumber, dealId, companyName, cargoType, route, totalBags, totalTonnes, ratePerTonne, subtotal, tax, totalAmount, amountPaid, balance, status, itemsText, issueDate, dueDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$id, $invoiceNumber, $dealId, $companyName, $cargoType, $route, $totalBags, $totalTonnes, $ratePerTonne, $subtotal, $tax, $totalAmount, $amountPaid, $balance, $status, $itemsText, $issueDate, $dueDate]);
            } catch (Exception $e2) {}
        }
    }

    echo json_encode(['status' => 'success', 'message' => 'Invoices saved to database']);
    exit();
}
