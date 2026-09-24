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
            /*
             * The states a thread actually moves through.
             *
             * This read UNDER_NEGOTIATION / LOCKED / DECLINED — a vocabulary
             * with no overlap at all with the application's. A consignee
             * submitting a consignment note sets UNDER_OPERATIONS_REVIEW, an
             * admin-raised thread starts at PENDING_REVIEW, and exchanging
             * messages sets IN_NEGOTIATION. Every one of those failed the enum,
             * so no negotiation thread was ever saved.
             *
             * UNDER_NEGOTIATION is retained for rows already carrying it.
             */
            ->enum('status', [
                'PENDING_REVIEW',           // raised, not yet looked at
                'UNDER_OPERATIONS_REVIEW',  // consignment note submitted by a client
                'IN_NEGOTIATION',           // rates being discussed
                'DECLINED',
                'UNDER_NEGOTIATION',        // legacy, retained for existing rows
            ], false, 'PENDING_REVIEW')
            ->string('createdAt', false, 64)
            ->validated();

        // A consignee cannot open a thread in another company's name.
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            $clean['companyName'] = (string) ($actor['companyName'] ?? '');
        }

        /*
         * LOCKED is deliberately absent from the list above and cannot be set
         * here at all: concluding a negotiation at an agreed rate is its own
         * audited action behind negotiation.lock. Everything else is an
         * ordinary state the thread moves through, and stripping it — as this
         * did unconditionally — meant a thread's status silently reverted to
         * the column default on every save.
         *
         * The existing row is read directly rather than trusting an
         * "__existingStatus" field on the payload. Nothing supplies that
         * field, so a guard written against it would never fire — and a guard
         * that never fires is worse than none, because it reads as protection.
         */
        $id = (string) ($input['id'] ?? '');
        if ($id !== '') {
            $prior = Db::conn()->prepare('SELECT status FROM bueno_negotiations WHERE id = ? LIMIT 1');
            $prior->execute([$id]);
            if ((string) ($prior->fetchColumn() ?: '') === 'LOCKED') {
                Response::error('This negotiation is concluded and locked.', 409);
            }
        }

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
