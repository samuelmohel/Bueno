<?php
/**
 * Bueno Freight OS — Operational fund requisitions
 *
 *   GET  /api/requests.php[?since=]
 *   POST /api/requests.php {action:"upsert",  record:{...}}   raise / edit
 *   POST /api/requests.php {action:"advance", id, decision:"APPROVE"|"REJECT", note}
 *   POST /api/requests.php {action:"delete",  id}
 *
 * The approval chain is Admin -> Head of Operations -> CEO -> Accountant ->
 * DISBURSED. Previously the stage was just a string the client wrote, so any
 * caller could POST a requisition already marked DISBURSED and skip every
 * approver. Stage transitions now move one step at a time, server-side, each
 * gated on a capability and recorded in the audit log.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

/**
 * The chain, in order. Each stage names the capability required to move the
 * requisition *out* of it.
 */
const REQUISITION_CHAIN = [
    'Admin'              => 'finance.requisitions_approve',
    'Head of Operations' => 'finance.requisitions_approve',
    'CEO'                => 'finance.requisitions_approve',
    'Accountant'         => 'finance.requisitions_disburse',
];

const REQUISITION_TERMINAL = ['DISBURSED', 'REJECTED'];

function next_stage(string $current): ?string
{
    $stages = array_keys(REQUISITION_CHAIN);
    $index  = array_search($current, $stages, true);
    if ($index === false) {
        return null;
    }
    return $stages[$index + 1] ?? 'DISBURSED';
}

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

// ── Advance one step through the approval chain ─────────────────────────────
if ($action === 'ADVANCE') {
    $data = Validator::for($body)
        ->identifier('id', true, 100)
        ->enum('decision', ['APPROVE', 'REJECT'], true)
        ->string('note', false, 1000)
        ->validated();

    $stmt = Db::conn()->prepare('SELECT * FROM bueno_fund_requests WHERE id = ? LIMIT 1');
    $stmt->execute([$data['id']]);
    $req = $stmt->fetch();

    if ($req === false) {
        Response::error('Requisition not found.', 404);
    }

    $stage  = (string) ($req['stage'] ?? 'Admin');
    $status = (string) ($req['status'] ?? 'PENDING_APPROVAL');

    if (in_array($status, REQUISITION_TERMINAL, true) || in_array($stage, REQUISITION_TERMINAL, true)) {
        Response::error('This requisition is already ' . strtolower($status) . ' and cannot be changed.', 409);
    }
    if (!isset(REQUISITION_CHAIN[$stage])) {
        Response::error('This requisition is at an unrecognised stage and needs manual correction.', 409);
    }

    // The capability required depends on the stage it is leaving: releasing
    // money at the Accountant stage is a different authority from approving.
    $actor = Rbac::require(REQUISITION_CHAIN[$stage]);

    // Nobody signs off their own spending request.
    if ((string) ($req['officerId'] ?? '') === (string) $actor['id']) {
        Audit::record('requisition.advance', 'requisition', (string) $req['id'], Audit::DENIED, [
            'reason' => 'self_approval',
        ], $actor);
        Response::error('You cannot approve a requisition you raised yourself.', 403);
    }

    $now = gmdate('Y-m-d\TH:i:s\Z');

    $conversation = json_decode((string) ($req['conversationText'] ?? '[]'), true);
    $conversation = is_array($conversation) ? $conversation : [];
    $conversation[] = [
        'stage'    => $stage,
        'decision' => $data['decision'],
        'note'     => $data['note'] ?? null,
        'byId'     => (string) $actor['id'],
        'byName'   => (string) ($actor['fullName'] ?? $actor['id']),
        'byRole'   => (string) ($actor['role'] ?? ''),
        'at'       => $now,
    ];

    if ($data['decision'] === 'REJECT') {
        $newStage  = 'REJECTED';
        $newStatus = 'REJECTED';
    } else {
        $newStage  = next_stage($stage) ?? 'DISBURSED';
        $newStatus = $newStage === 'DISBURSED' ? 'DISBURSED' : 'APPROVED';
    }

    Db::conn()->prepare(
        'UPDATE bueno_fund_requests
            SET stage = ?, status = ?, conversationText = ?, updated_at = ?, version = version + 1
          WHERE id = ?'
    )->execute([$newStage, $newStatus, json_encode($conversation), $now, $req['id']]);

    Audit::record('requisition.advance', 'requisition', (string) $req['id'], Audit::SUCCESS, [
        'from'     => $stage,
        'to'       => $newStage,
        'decision' => $data['decision'],
        'amount'   => $req['amount'] ?? null,
    ], $actor);

    Response::ok([
        'id'      => $req['id'],
        'stage'   => $newStage,
        'status'  => $newStatus,
        'message' => $data['decision'] === 'REJECT'
            ? 'Requisition rejected.'
            : ($newStage === 'DISBURSED' ? 'Funds released.' : "Approved; now with {$newStage}."),
    ]);
}

// ── Raise or edit a requisition ─────────────────────────────────────────────
//
// A requisition may only be edited while it is still at the first stage.
// Once an approver has signed it, changing the amount or purpose behind their
// signature must not be possible — and silently resetting it to pending would
// discard approvals that have already been given.
if ($action === 'UPSERT' || ($method === 'POST' && $action === '')) {
    $editingId = (string) (($body['record']['id'] ?? $body['requisition']['id'] ?? '') ?: '');

    if ($editingId !== '') {
        $stmt = Db::conn()->prepare('SELECT stage, status FROM bueno_fund_requests WHERE id = ? LIMIT 1');
        $stmt->execute([$editingId]);
        $existing = $stmt->fetch();

        if ($existing !== false && (string) $existing['stage'] !== 'Admin') {
            Response::error(
                'This requisition has already been signed at the '
                . $existing['stage'] . ' stage and can no longer be edited. '
                . 'Reject it and raise a replacement instead.',
                409
            );
        }
    }
}

Collection::handle([
    'table'  => 'bueno_fund_requests',
    'entity' => 'requisition',

    'capabilities' => [
        'read'   => 'fund_requisitions',
        'write'  => 'finance.requisitions_submit',
        'delete' => 'system.purge_data',
        'purge'  => 'system.purge_data',
    ],

    // Cargo officers see their own terminal's requisitions.
    'scope'     => ['station' => ['station']],
    'orderBy'   => '`updated_at` DESC, `id` DESC',
    'versioned' => true,

    'jsonColumns' => [
        'conversation'   => 'conversationText',
        'paymentDetails' => 'paymentDetailsText',
    ],

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->identifier('requisitionNo', false, 100)
            ->string('title', true, 191, 3)
            ->enum('category', ['TARPAULIN', 'PAYLOADER', 'FREIGHT', 'LOADERS', 'GENERAL'], false, 'GENERAL')
            ->string('description', false, 2000)
            ->number('amount', true, 1)
            ->identifier('station', false, 16)
            ->identifier('tripNo', false, 100)
            ->identifier('tripId', false, 100)
            ->identifier('vesselNo', false, 100)
            ->string('date', false, 64)
            ->validated();

        // Stage and status are decided by the advance action alone. Accepting
        // them from the payload is exactly how a requisition could arrive
        // already marked DISBURSED, skipping every approver. Anything still
        // editable is by definition at the first stage (enforced above).
        $clean['stage']  = 'Admin';
        $clean['status'] = 'PENDING_APPROVAL';

        // Attribute to the session, never to the payload.
        $clean['officerId']   = (string) $actor['id'];
        $clean['officerName'] = (string) ($actor['fullName'] ?? $actor['id']);
        $clean['requestedBy'] = (string) ($actor['fullName'] ?? $actor['id']);

        // A station officer raises requisitions for their own terminal.
        if (($clean['station'] ?? null) === null) {
            $clean['station'] = (string) ($actor['assignedStation'] ?? 'HQ');
        }

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
