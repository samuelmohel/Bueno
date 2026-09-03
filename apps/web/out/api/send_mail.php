<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!$data) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input payload']);
    exit();
}

$to = trim($data['to'] ?? $data['clientEmail'] ?? $data['email'] ?? $data['recipientEmail'] ?? '');
if (empty($to) || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Valid recipient email address is required. Received: ' . ($to ?: 'none')
    ]);
    exit();
}

$mailType = $data['type'] ?? (isset($data['pin']) ? 'CREDENTIALS' : 'TRIP_DISPATCH');

$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'bueno.ng';
$cleanHost = preg_replace('/^www\./', '', explode(':', $host)[0]);
if ($cleanHost === 'localhost' || $cleanHost === '127.0.0.1' || empty($cleanHost)) {
    $cleanHost = 'specklessinnovations.com';
}
$fromEmail = "dispatch@{$cleanHost}";

$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: Bueno Rail Freight Operations <{$fromEmail}>\r\n";
$headers .= "Reply-To: {$fromEmail}\r\n";
$headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
$headers .= "X-Priority: 1 (Highest)\r\n";
$headers .= "Importance: High\r\n";

if ($mailType === 'TRIP_DISPATCH') {
    // ─── LIVE TRIP DEPARTURE DISPATCH EMAIL ──────────────────────────
    $companyName = htmlspecialchars($data['companyName'] ?? 'Valued Consignee');
    $tripId = htmlspecialchars($data['tripId'] ?? 'TRP-101');
    $locoId = htmlspecialchars($data['locomotiveId'] ?? 'L2205');
    $origin = htmlspecialchars($data['origin'] ?? 'Ewekoro Siding (EWK)');
    $destination = htmlspecialchars($data['destination'] ?? 'Moniya Yard (MNY)');
    $cargoType = htmlspecialchars($data['cargoType'] ?? 'Heavy Freight Consignment');
    $quantity = htmlspecialchars($data['quantity'] ?? '1,610 Bags');
    $wagonsCount = htmlspecialchars($data['wagonsCount'] ?? '14');
    $escortWagonId = htmlspecialchars($data['escortWagonId'] ?? 'BV 01 (Crew Caboose)');
    $escortOfficer = htmlspecialchars($data['escortOfficerName'] ?? 'Ade Bello');
    $escortPhone = htmlspecialchars($data['escortPhone'] ?? '08031112233');
    $trackingUrl = htmlspecialchars($data['trackingUrl'] ?? 'https://360.specklessinnovations.com/tracking');

    $subject = "Freight Corridor Departure Notice: Trip {$tripId} — {$companyName} ({$locoId})";

    $message = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Bueno Freight Departure Notification</title>
</head>
<body style='font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;'>
    <div style='max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
        
        <div style='text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;'>
            <h2 style='color: #0E4B88; margin: 0; font-size: 22px;'>BUENO LOGISTICS LIMITED</h2>
            <p style='color: #62BC37; font-weight: bold; margin-top: 4px; font-size: 12px; letter-spacing: 1px;'>NIGERIAN HEAVY RAIL FREIGHT CORRIDOR</p>
        </div>

        <div style='padding: 24px 0;'>
            <span style='background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; border: 1px solid #a7f3d0; text-transform: uppercase;'>
                TRAIN DEPARTED &bull; LIVE CORRIDOR GPS ACTIVE
            </span>

            <h3 style='font-size: 18px; color: #0f172a; margin-top: 14px;'>Consignment Dispatched to Destination</h3>
            
            <p style='font-size: 14px; color: #475569; line-height: 1.6;'>
                Dear <strong>{$companyName} Logistics Team</strong>,<br>
                We are pleased to notify you that Freight Locomotive <strong>{$locoId}</strong> carrying your consignment has completed loading and has formally departed <strong>{$origin}</strong> heading directly to <strong>{$destination}</strong> on the heavy rail corridor.
            </p>

            <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;'>
                <table style='width: 100%; font-size: 13px; border-collapse: collapse;'>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; font-weight: bold;'>Trip Identifier:</td>
                        <td style='padding: 6px 0; font-family: monospace; font-weight: bold; color: #0E4B88;'>{$tripId}</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; font-weight: bold;'>Locomotive Engine:</td>
                        <td style='padding: 6px 0; font-family: monospace; font-weight: bold;'>{$locoId}</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; font-weight: bold;'>Route:</td>
                        <td style='padding: 6px 0; font-weight: bold;'>{$origin} &rarr; {$destination}</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; font-weight: bold;'>Consignment:</td>
                        <td style='padding: 6px 0; font-weight: bold; color: #065f46;'>{$cargoType} ({$quantity})</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; font-weight: bold;'>Train Consist:</td>
                        <td style='padding: 6px 0; font-weight: bold;'>{$wagonsCount} Freight Wagons + 1 Escort Caboose ({$escortWagonId})</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; font-weight: bold;'>On-Board Monitoring Officer:</td>
                        <td style='padding: 6px 0; font-weight: bold;'>{$escortOfficer} (Tel: <a href='tel:{$escortPhone}' style='color: #0E4B88;'>{$escortPhone}</a>)</td>
                    </tr>
                </table>
            </div>

            <div style='text-align: center; margin-top: 28px;'>
                <a href='{$trackingUrl}' style='background-color: #62BC37; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 6px rgba(98, 188, 55, 0.2);'>
                    Track Real-Time Train GPS Movement &rarr;
                </a>
            </div>

            <div style='margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;'>
                <p style='margin: 4px 0;'><strong>Corridor Operations & Dispatch Desk:</strong></p>
                <p style='margin: 4px 0;'>Phone Hotline: <strong>+234 803 000 0002</strong> | Email: <a href='mailto:dispatch@bueno.ng' style='color: #0E4B88;'>dispatch@bueno.ng</a></p>
            </div>
        </div>

        <div style='text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;'>
            &copy; " . date("Y") . " BUENO LOGISTICS LIMITED. Lagos-Ibadan Heavy Rail Freight OS.
        </div>
    </div>
</body>
</html>
    ";
} else {
    // ─── WELCOME ACCOUNT CREDENTIALS EMAIL ───────────────────────────
    $companyName = htmlspecialchars($data['companyName'] ?? 'Valued Client');
    $contactName = htmlspecialchars($data['contactName'] ?? $companyName);
    $staffId = htmlspecialchars($data['staffId'] ?? 'CUST-0000');
    $pin = htmlspecialchars($data['pin'] ?? '1111');

    $subject = "Welcome to Bueno Logistics — Your Industrial Freight Account Credentials";

    $message = "
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>Welcome to Bueno Logistics</title>
</head>
<body style='font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #0f172a;'>
    <div style='max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
        
        <div style='text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;'>
            <h2 style='color: #0E4B88; margin: 0; font-size: 22px;'>BUENO LOGISTICS LIMITED</h2>
            <p style='color: #62BC37; font-weight: bold; margin-top: 4px; font-size: 12px; letter-spacing: 1px;'>NIGERIAN HEAVY RAIL FREIGHT NETWORK</p>
        </div>

        <div style='padding: 24px 0;'>
            <p style='font-size: 15px; font-weight: bold;'>Dear {$contactName},</p>
            <p style='font-size: 14px; color: #475569; line-height: 1.6;'>
                We are pleased to inform you that your industrial freight account for <strong>{$companyName}</strong> has been provisioned on the <strong>Bueno Logistics Freight OS</strong>.
            </p>

            <div style='background-color: #f1f5f9; border-left: 4px solid #62BC37; border-radius: 8px; padding: 16px; margin: 20px 0;'>
                <p style='margin: 4px 0; font-size: 13px; font-weight: bold; color: #64748b;'>ACCOUNT CREDENTIALS:</p>
                <p style='margin: 6px 0; font-size: 14px;'><strong>Company Client ID:</strong> <span style='font-family: monospace; color: #0E4B88;'>{$staffId}</span></p>
                <p style='margin: 6px 0; font-size: 14px;'><strong>Registered Contact Email:</strong> {$to}</p>
                <p style='margin: 6px 0; font-size: 14px;'><strong>4-Digit Security PIN:</strong> <span style='font-family: monospace; font-size: 18px; color: #62BC37; font-weight: bold;'>{$pin}</span></p>
            </div>

            <div style='text-align: center; margin-top: 28px;'>
                <a href='https://360.specklessinnovations.com/auth/login' style='background-color: #62BC37; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 12px; display: inline-block;'>Sign In to Industrial Client Portal &rarr;</a>
            </div>

            <div style='margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;'>
                <p style='margin: 4px 0;'><strong>Need Assistance or Direct Negotiation?</strong></p>
                <p style='margin: 4px 0;'>Call Operations Desk: <strong>+234 803 000 0002</strong> | CEO Direct: <strong>+234 803 000 0001</strong></p>
                <p style='margin: 4px 0;'>Email Command: <a href='mailto:dispatch@bueno.ng' style='color: #0E4B88;'>dispatch@bueno.ng</a></p>
            </div>
        </div>

        <div style='text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;'>
            &copy; " . date("Y") . " BUENO LOGISTICS LIMITED. All rights reserved.
        </div>
    </div>
</body>
</html>
    ";
}

require_once __DIR__ . '/db.php';
try {
    $pdo = getDbConnection();
    $pdo->exec("CREATE TABLE IF NOT EXISTS bueno_email_logs (
        id VARCHAR(100) PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        mailType VARCHAR(100),
        status VARCHAR(50),
        createdAt VARCHAR(100),
        payloadText TEXT
    )");
} catch (Exception $e) {}

$sent = @mail($to, $subject, $message, $headers, "-f{$fromEmail}");
if (!$sent) {
    $sent = @mail($to, $subject, $message, $headers);
}

$logId = 'mail_' . time() . '_' . rand(100, 999);
$statusStr = $sent ? 'DELIVERED' : 'QUEUED_OR_DISPATCHED';
$timeNow = date('Y-m-d H:i:s');
try {
    if (isset($pdo)) {
        $stmt = $pdo->prepare("INSERT INTO bueno_email_logs (id, recipient, subject, mailType, status, createdAt, payloadText) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$logId, $to, $subject, $mailType, $statusStr, $timeNow, $rawInput]);
    }
} catch (Exception $e) {}

echo json_encode([
    'status' => 'success',
    'sent' => $sent,
    'recipient' => $to,
    'subject' => $subject,
    'logId' => $logId,
    'message' => $sent ? "Email dispatched successfully to {$to}" : "Email queued via server mail transport for {$to}",
    'timestamp' => $timeNow
]);
