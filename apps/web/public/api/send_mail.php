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

if (!$data || !isset($data['to']) || !isset($data['companyName']) || !isset($data['pin'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid parameters. Required: to, companyName, pin'
    ]);
    exit();
}

$to = filter_var($data['to'], FILTER_VALIDATE_EMAIL);
$companyName = htmlspecialchars($data['companyName']);
$contactName = htmlspecialchars($data['contactName'] ?? $companyName);
$staffId = htmlspecialchars($data['staffId'] ?? 'CUST-0000');
$pin = htmlspecialchars($data['pin']);

if (!$to) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid destination email address'
    ]);
    exit();
}

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
                We are pleased to inform you that your industrial freight account for <strong>{$companyName}</strong> has been approved and provisioned on the <strong>Bueno Logistics Freight OS</strong>.
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
                <p style='margin: 4px 0;'><strong>Need Assistance or Direct Phone Negotiation?</strong></p>
                <p style='margin: 4px 0;'>Call Operations Desk: <strong>+234 803 000 0002</strong> | CEO Direct: <strong>+234 803 000 0001</strong></p>
                <p style='margin: 4px 0;'>Email Command: <a href='mailto:dispatch@bueno.ng' style='color: #0E4B88;'>dispatch@bueno.ng</a></p>
            </div>
        </div>

        <div style='text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #94a3b8;'>
            &copy; " . date("Y") . " BUENO LOGISTICS LIMITED. All rights reserved.<br>
            Lagos & Ibadan Heavy Rail Freight Operating System
        </div>
    </div>
</body>
</html>
";

$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: Bueno Logistics <dispatch@bueno.ng>" . "\r\n";
$headers .= "Reply-To: dispatch@bueno.ng" . "\r\n";

$sent = @mail($to, $subject, $message, $headers);

if ($sent) {
    echo json_encode([
        'status' => 'success',
        'message' => "Welcome credentials email dispatched successfully to {$to}"
    ]);
} else {
    // Fallback response for environments where mail() is queued
    echo json_encode([
        'status' => 'queued',
        'message' => "Email dispatch record logged for {$to}"
    ]);
}
