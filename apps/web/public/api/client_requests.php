<?php
/**
 * Bueno Freight OS — Inbound freight enquiries
 *
 *   GET  /api/client_requests.php            staff only
 *   POST /api/client_requests.php {action:"submit", ...}   PUBLIC
 *   POST /api/client_requests.php {action:"update_status", id, status}
 *
 * The submit action is deliberately unauthenticated: it is the public "request
 * a quote" form, and a prospective customer has no account yet. That makes it
 * the one genuinely open write on the platform, so it is rate limited per
 * address, size capped, and cannot set its own status.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

// ── Public enquiry submission ───────────────────────────────────────────────
if ($action === 'SUBMIT') {
    // Without this, the endpoint is a free-form insert into your database for
    // anyone with curl.
    RateLimit::enforce('enquiry:' . Http::clientIp(), Config::int('ENQUIRY_RATE', 5), 3600);

    $data = Validator::for($body)
        ->string('companyName', true, 191, 2)
        ->string('industry', false, 100)
        ->string('contactName', true, 191, 2)
        ->email('email', true)
        ->string('phone', false, 32)
        ->string('volume', false, 100)
        ->string('route', false, 191)
        ->validated();

    $id  = 'creq_' . bin2hex(random_bytes(8));
    $now = gmdate('Y-m-d\TH:i:s\Z');

    Db::conn()->prepare(
        'INSERT INTO bueno_client_requests
            (id, companyName, industry, contactName, email, phone, volume, route, status, createdAt, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $id,
        $data['companyName'],
        $data['industry'],
        $data['contactName'],
        $data['email'],
        $data['phone'],
        $data['volume'],
        $data['route'],
        'PENDING',   // never taken from the payload
        $now,
        $now,
    ]);

    Audit::record('enquiry.submit', 'client_request', $id, Audit::SUCCESS, [
        'company' => $data['companyName'],
    ], null);

    // No account is provisioned here. The previous flow generated a staff ID
    // and PIN on submission and emailed them, which meant anyone could mint a
    // working login for an arbitrary address. Provisioning is now a deliberate
    // act performed through users.php by someone holding users.create.
    Response::json([
        'status'  => 'success',
        'id'      => $id,
        'message' => 'Thank you. Our commercial desk will be in touch shortly.',
    ], 201);
}

// ── Staff: triage an enquiry ────────────────────────────────────────────────
if ($action === 'UPDATE_STATUS') {
    $actor = Rbac::require('negotiation.view');

    $data = Validator::for($body)
        ->identifier('id', true, 100)
        ->enum('status', ['PENDING', 'CONTACTED', 'CONVERTED', 'DECLINED'], true)
        ->validated();

    $stmt = Db::conn()->prepare(
        'UPDATE bueno_client_requests SET status = ?, updated_at = ? WHERE id = ?'
    );
    $stmt->execute([$data['status'], gmdate('Y-m-d\TH:i:s\Z'), $data['id']]);

    if ($stmt->rowCount() === 0) {
        Response::error('Enquiry not found.', 404);
    }

    Audit::record('enquiry.triage', 'client_request', $data['id'], Audit::SUCCESS, [
        'status' => $data['status'],
    ], $actor);

    Response::ok(['message' => 'Enquiry updated.']);
}

Collection::handle([
    'table'  => 'bueno_client_requests',
    'entity' => 'enquiry',

    'capabilities' => [
        'read'   => 'negotiation.view',
        'write'  => 'negotiation.view',
        'delete' => 'system.purge_data',
        'purge'  => 'system.purge_data',
    ],

    'orderBy' => '`createdAt` DESC, `id` DESC',

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->string('companyName', true, 191, 2)
            ->string('industry', false, 100)
            ->string('contactName', false, 191)
            ->email('email', false)
            ->string('phone', false, 32)
            ->string('volume', false, 100)
            ->string('route', false, 191)
            ->enum('status', ['PENDING', 'CONTACTED', 'CONVERTED', 'DECLINED'], false, 'PENDING')
            ->validated();

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
