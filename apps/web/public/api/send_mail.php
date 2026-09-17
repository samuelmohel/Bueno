<?php
/**
 * Bueno Freight OS — Transactional email
 *
 *   POST /api/send_mail.php {type:"TRIP_DISPATCH", tripId:"…"}
 *
 * Previously this was an open relay: unauthenticated, it accepted any
 * recipient address and sent branded HTML mail from the company domain. That
 * is a spam-relay and phishing vector against your own customers, and gets the
 * sending domain blacklisted. It also wrote the entire raw request — including
 * the account PIN it was mailing out — into bueno_email_logs in plaintext.
 *
 * Now: authenticated, capability-gated, rate limited, and the recipient is
 * resolved from the trip record rather than accepted from the caller, so it
 * can only ever mail the consignee actually attached to the consignment.
 *
 * Credentials are never emailed. users.php returns a one-time password to the
 * administrator performing the provisioning, to be shared over a channel they
 * choose.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';

if (Http::method() !== 'POST') {
    Response::error('Method not allowed.', 405);
}

$actor = Rbac::require('ops.dispatch');
$body  = Http::jsonBody();

$data = Validator::for($body)
    ->identifier('tripId', true, 100)
    ->enum('type', ['TRIP_DISPATCH', 'TRIP_ARRIVAL'], false, 'TRIP_DISPATCH')
    ->validated();

RateLimit::enforce('mail:' . $actor['id'], Config::int('MAIL_RATE', 30), 3600);

// The recipient comes from the trip, never from the request body.
$stmt = Db::conn()->prepare('SELECT * FROM bueno_trips WHERE id = ? OR tripId = ? LIMIT 1');
$stmt->execute([$data['tripId'], $data['tripId']]);
$trip = $stmt->fetch();

if ($trip === false) {
    Response::error('Trip not found.', 404);
}

$recipient = trim((string) ($trip['clientEmail'] ?? ''));
if ($recipient === '' || filter_var($recipient, FILTER_VALIDATE_EMAIL) === false) {
    Response::error('This trip has no valid consignee email on record.', 422);
}

$e = static fn(?string $v, string $fallback = ''): string
    => htmlspecialchars((string) ($v ?? '') !== '' ? (string) $v : $fallback, ENT_QUOTES, 'UTF-8');

$company     = $e($trip['company'], 'Valued Consignee');
$tripRef     = $e($trip['tripId'] ?? $trip['id']);
$loco        = $e($trip['locomotiveId'], 'L2205');
$origin      = $e($trip['origin'], 'EWK');
$destination = $e($trip['destination'], 'MNY');
$cargo       = $e($trip['cargoType'], 'Freight consignment');
$quantity    = $e($trip['quantity']);
$escort      = $e($trip['escortOfficerName']);
$escortPhone = $e($trip['escortPhone']);

$arrival = $data['type'] === 'TRIP_ARRIVAL';
$subject = $arrival
    ? "Arrival notice: trip {$tripRef} has reached {$destination}"
    : "Departure notice: trip {$tripRef} has departed {$origin}";

$headline = $arrival
    ? 'Your consignment has arrived'
    : 'Your consignment has departed';

$lead = $arrival
    ? "Locomotive <strong>{$loco}</strong> carrying your consignment has arrived at <strong>{$destination}</strong>. Unloading and tally will begin shortly."
    : "Locomotive <strong>{$loco}</strong> carrying your consignment has completed loading and departed <strong>{$origin}</strong> for <strong>{$destination}</strong>.";

$trackingBase = rtrim((string) Config::get('APP_URL', ''), '/');
$trackingUrl  = $trackingBase !== ''
    ? htmlspecialchars($trackingBase . '/tracking', ENT_QUOTES, 'UTF-8')
    : '';

$rows = [
    'Trip reference' => $tripRef,
    'Locomotive'     => $loco,
    'Route'          => "{$origin} &rarr; {$destination}",
    'Consignment'    => $quantity !== '' ? "{$cargo} ({$quantity})" : $cargo,
];
if ($escort !== '') {
    $rows['Escort officer'] = $escortPhone !== '' ? "{$escort} ({$escortPhone})" : $escort;
}

$rowsHtml = '';
foreach ($rows as $label => $value) {
    $rowsHtml .= "<tr>"
        . "<td style=\"padding:6px 0;color:#64748b;font-weight:bold;\">" . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . "</td>"
        . "<td style=\"padding:6px 0;font-weight:bold;\">{$value}</td>"
        . "</tr>";
}

$ctaHtml = $trackingUrl !== ''
    ? "<div style=\"text-align:center;margin-top:28px;\">
         <a href=\"{$trackingUrl}\" style=\"background-color:#62BC37;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:12px;display:inline-block;\">Track this consignment &rarr;</a>
       </div>"
    : '';

$message = "<!DOCTYPE html>
<html><head><meta charset=\"utf-8\"><title>" . htmlspecialchars($subject, ENT_QUOTES, 'UTF-8') . "</title></head>
<body style=\"font-family:Arial,sans-serif;background-color:#f8fafc;margin:0;padding:20px;color:#0f172a;\">
  <div style=\"max-width:620px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:32px;\">
    <div style=\"text-align:center;padding-bottom:20px;border-bottom:1px solid #f1f5f9;\">
      <h2 style=\"color:#0E4B88;margin:0;font-size:22px;\">BUENO LOGISTICS LIMITED</h2>
      <p style=\"color:#62BC37;font-weight:bold;margin-top:4px;font-size:12px;letter-spacing:1px;\">RAIL FREIGHT CORRIDOR OPERATIONS</p>
    </div>
    <div style=\"padding:24px 0;\">
      <h3 style=\"font-size:18px;margin-top:0;\">{$headline}</h3>
      <p style=\"font-size:14px;color:#475569;line-height:1.6;\">Dear {$company} logistics team,<br>{$lead}</p>
      <div style=\"background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin:20px 0;\">
        <table style=\"width:100%;font-size:13px;border-collapse:collapse;\">{$rowsHtml}</table>
      </div>
      {$ctaHtml}
    </div>
    <div style=\"text-align:center;border-top:1px solid #f1f5f9;padding-top:16px;font-size:11px;color:#94a3b8;\">
      &copy; " . date('Y') . " Bueno Logistics Limited
    </div>
  </div>
</body></html>";

$fromEmail = (string) Config::get('MAIL_FROM', 'dispatch@' . preg_replace('/^www\./', '', explode(':', (string) ($_SERVER['HTTP_HOST'] ?? 'bueno.ng'))[0]));

$headers = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: Bueno Rail Freight Operations <' . $fromEmail . '>',
    'Reply-To: ' . $fromEmail,
    'X-Mailer: Bueno Freight OS',
]);

$sent = @mail($recipient, $subject, $message, $headers, '-f' . $fromEmail);

// Log metadata only. The previous version stored the whole request body,
// which meant every provisioning email left a plaintext PIN in the database.
try {
    Db::conn()->prepare(
        'INSERT INTO bueno_email_logs (id, recipient, subject, mailType, status, createdAt, payloadText)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        'mail_' . bin2hex(random_bytes(8)),
        $recipient,
        $subject,
        $data['type'],
        $sent ? 'SENT' : 'FAILED',
        gmdate('Y-m-d\TH:i:s\Z'),
        json_encode(['tripId' => $data['tripId'], 'sentBy' => $actor['id']]),
    ]);
} catch (Throwable $ex) {
    error_log('[bueno][mail] log write failed: ' . $ex->getMessage());
}

Audit::record('mail.send', 'trip', (string) $data['tripId'], $sent ? Audit::SUCCESS : Audit::FAILURE, [
    'type'      => $data['type'],
    'recipient' => $recipient,
], $actor);

if (!$sent) {
    Response::error('The mail transport rejected the message. Operations have been notified.', 502);
}

Response::ok(['recipient' => $recipient, 'subject' => $subject]);
