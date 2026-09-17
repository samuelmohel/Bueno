<?php
/**
 * Bueno Freight OS — Client rate negotiations
 *
 *   GET  /api/negotiations.php[?since=]
 *   POST /api/negotiations.php {action:"upsert",  record:{...}}
 *   POST /api/negotiations.php {action:"message", id:"...", text:"..."}
 *   POST /api/negotiations.php {action:"lock",    id:"..."}
 *
 * A consignee sees and posts to their own threads only; staff need the
 * negotiation capabilities. Previously every thread, including other
 * customers' rate discussions, was readable by anyone.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

/** @return array<string,mixed> */
function load_thread(string $id): array
{
    $stmt = Db::conn()->prepare('SELECT * FROM bueno_negotiations WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if ($row === false) {
        Response::error('Negotiation thread not found.', 404);
    }
    return $row;
}

// ── Post a message into a thread ────────────────────────────────────────────
if ($action === 'MESSAGE') {
    $actor = Rbac::require('negotiation.message');

    $data = Validator::for($body)
        ->identifier('id', true, 100)
        ->string('text', true, 4000, 1)
        ->validated();

    $thread = load_thread($data['id']);

    // A consignee may only post into their own organisation's thread.
    Rbac::assertCanTouchRow($actor, $thread, 'companyName');

    if ((string) ($thread['status'] ?? '') === 'LOCKED') {
        Response::error('This negotiation has been concluded and is locked.', 409);
    }

    $messages   = json_decode((string) ($thread['messagesText'] ?? '[]'), true);
    $messages   = is_array($messages) ? $messages : [];
    $messages[] = [
        'text'     => $data['text'],
        'senderId' => (string) $actor['id'],
        'sender'   => (string) ($actor['fullName'] ?? $actor['id']),
        'role'     => (string) ($actor['role'] ?? ''),
        'at'       => gmdate('Y-m-d\TH:i:s\Z'),
    ];

    Db::conn()->prepare(
        'UPDATE bueno_negotiations SET messagesText = ?, updated_at = ? WHERE id = ?'
    )->execute([json_encode($messages), gmdate('Y-m-d\TH:i:s\Z'), $thread['id']]);

    Audit::record('negotiation.message', 'negotiation', (string) $thread['id'], Audit::SUCCESS, null, $actor);
    Response::ok(['messages' => $messages]);
}

// ── Conclude a negotiation ──────────────────────────────────────────────────
if ($action === 'LOCK') {
    $actor  = Rbac::require('negotiation.lock');
    $data   = Validator::for($body)->identifier('id', true, 100)->validated();
    $thread = load_thread($data['id']);

    Db::conn()->prepare(
        'UPDATE bueno_negotiations SET status = ?, updated_at = ? WHERE id = ?'
    )->execute(['LOCKED', gmdate('Y-m-d\TH:i:s\Z'), $thread['id']]);

    Audit::record('negotiation.lock', 'negotiation', (string) $thread['id'], Audit::SUCCESS, null, $actor);
    Response::ok(['message' => 'Negotiation locked at the agreed rate.']);
}

Collection::handle([
    'table'  => 'bueno_negotiations',
    'entity' => 'negotiation',

    'capabilities' => [
        'read'   => 'negotiation.view',
        'write'  => 'negotiation.message',
        'delete' => 'system.purge_data',
        'purge'  => 'system.purge_data',
    ],

    'scope'   => ['company' => 'companyName'],
    'orderBy' => '`updated_at` DESC, `id` DESC',

    'jsonColumns' => ['messages' => 'messagesText'],

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->string('companyName', true, 191)
            ->string('contactName', false, 191)
            ->email('email', false)
            ->identifier('loadingStation', false, 50)
            ->identifier('destination', false, 50)
            ->string('cargoType', false, 191)
            ->string('quantity', false, 100)
            ->string('targetDate', false, 64)
            ->enum('status', ['UNDER_NEGOTIATION', 'LOCKED', 'DECLINED'], false, 'UNDER_NEGOTIATION')
            ->string('createdAt', false, 64)
            ->validated();

        // A consignee cannot open a thread in another company's name.
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            $clean['companyName'] = (string) ($actor['companyName'] ?? '');
        }

        // Locking is its own audited action with its own capability.
        unset($clean['status']);

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
