<?php
/**
 * Bueno Freight OS — Commercial freight invoices
 *
 *   GET  /api/invoices.php[?id=|tripId=|since=]
 *   POST /api/invoices.php {action:"upsert", record:{...}}
 *   POST /api/invoices.php {action:"record_payment", id:"...", amount:n, reference:"..."}
 *   POST /api/invoices.php {action:"delete", id:"..."}
 *
 * Read access is capability-gated two ways: staff with the billing capability
 * see everything, while a consignee holds only finance.invoices_view_own and
 * is scoped in SQL to their own organisation. Previously any caller could read
 * every invoice, and both old permission matrices granted customers
 * finance.invoices_issue — the right to generate invoices against themselves.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

// ── Record a payment against an invoice ─────────────────────────────────────
//
// Money movement is its own capability and its own audited action; it is not
// an ordinary field update, so it does not go through the generic upsert.
if ($action === 'RECORD_PAYMENT') {
    $actor = Rbac::require('finance.payments_record');

    $data = Validator::for($body)
        ->identifier('id', true, 100)
        ->number('amount', true, 0.01)
        ->string('reference', false, 128)
        ->validated();

    $result = Db::transaction(static function (PDO $pdo) use ($data, $actor): array {
        $stmt = $pdo->prepare('SELECT * FROM bueno_invoices WHERE id = ? OR invoiceNumber = ? LIMIT 1');
        $stmt->execute([$data['id'], $data['id']]);
        $invoice = $stmt->fetch();

        if ($invoice === false) {
            Response::error('Invoice not found.', 404);
        }

        $total    = (float) ($invoice['totalAmount'] ?? 0);
        $paidSoFar = (float) ($invoice['amountPaid'] ?? 0);
        $newPaid  = $paidSoFar + (float) $data['amount'];

        // Overpayment is nearly always a keying error, and silently accepting
        // it produces a negative balance that reconciliation has to chase.
        if ($newPaid > $total + 0.01) {
            Response::error(
                sprintf(
                    'Payment of %.2f exceeds the outstanding balance of %.2f.',
                    $data['amount'],
                    $total - $paidSoFar
                ),
                422
            );
        }

        $balance = round($total - $newPaid, 2);
        $status  = $balance <= 0.01 ? 'PAID' : 'PART_PAID';

        $history   = json_decode((string) ($invoice['paymentHistoryJson'] ?? '[]'), true);
        $history   = is_array($history) ? $history : [];
        $history[] = [
            'amount'     => (float) $data['amount'],
            'reference'  => $data['reference'] ?? null,
            'recordedBy' => (string) ($actor['fullName'] ?? $actor['id']),
            'recordedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        ];

        $pdo->prepare(
            'UPDATE bueno_invoices
                SET amountPaid = ?, balance = ?, status = ?, paymentRef = ?,
                    paymentHistoryJson = ?, updated_at = ?, version = version + 1
              WHERE id = ?'
        )->execute([
            $newPaid,
            $balance,
            $status,
            $data['reference'] ?? ($invoice['paymentRef'] ?? null),
            json_encode($history),
            gmdate('Y-m-d\TH:i:s\Z'),
            $invoice['id'],
        ]);

        return ['id' => $invoice['id'], 'amountPaid' => $newPaid, 'balance' => $balance, 'status' => $status];
    });

    Audit::record('invoice.payment', 'invoice', (string) $result['id'], Audit::SUCCESS, [
        'amount'    => $data['amount'],
        'reference' => $data['reference'] ?? null,
        'balance'   => $result['balance'],
    ], $actor);

    Response::ok($result);
}

// ── Standard collection handling ────────────────────────────────────────────
Collection::handle([
    'table'  => 'bueno_invoices',
    'entity' => 'invoice',

    'capabilities' => [
        // Staff reach the invoice ledger through 'billing'; a consignee
        // reaches only their own through finance.invoices_view_own, and the
        // scope clause below confines them to their organisation.
        'read'   => ['billing', 'finance.invoices_view_own'],
        'write'  => 'finance.invoices_issue',
        'delete' => 'finance.invoices_issue',
        'purge'  => 'system.purge_data',
    ],

    'scope'     => ['company' => 'companyName'],
    'orderBy'   => '`updated_at` DESC, `id` DESC',
    'versioned' => true,

    'jsonColumns' => [
        'damageDetails'  => 'damageDetailsJson',
        'paymentHistory' => 'paymentHistoryJson',
        'items'          => 'itemsText',
    ],

    'validate' => static function (array $input, array $actor): array {
        // Reading an invoice is not issuing one. The generic handler already
        // required the write capability to get here, but be explicit: a
        // consignee must never reach this path.
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Consignee accounts cannot issue or modify invoices.', 403);
        }

        $clean = Validator::for($input)
            ->identifier('invoiceNumber', false, 100)
            ->identifier('tripId', false, 100)
            ->identifier('dealId', false, 100)
            ->string('companyName', true, 191)
            ->email('clientEmail', false)
            ->string('cargoType', false, 191)
            ->string('route', false, 191)
            ->integer('totalBags', false, 0)
            ->number('totalTonnes', false, 0)
            ->number('ratePerTonne', false, 0)
            ->number('subtotal', false, 0)
            ->integer('damageUnits', false, 0)
            ->number('damageDeduction', false, 0)
            ->number('tax', false, 0)
            ->number('totalAmount', false, 0)
            ->number('amountPaid', false, 0)
            ->number('balance', false)
            /*
             * The lifecycle an invoice actually moves through.
             *
             * This read UNPAID / PART_PAID / PAID / CANCELLED — a vocabulary
             * with no overlap at all with the application's. Issuing an
             * invoice sets ISSUED, recording a part payment sets
             * PARTIALLY_PAID and clearing the balance sets SETTLED, so every
             * invoice ever issued was refused with 422 and billing never
             * persisted a single row.
             *
             * The three original values are retained so any row already
             * carrying one stays valid.
             */
            ->enum('status', [
                'ISSUED',          // raised against a completed trip
                'PARTIALLY_PAID',  // payment recorded, balance outstanding
                'SETTLED',         // balance cleared
                'CANCELLED',
                'UNPAID', 'PART_PAID', 'PAID',  // legacy, retained for existing rows
            ], false, 'ISSUED')
            ->string('paymentRef', false, 100)
            ->string('issueDate', false, 64)
            ->string('dueDate', false, 64)
            ->validated();

        // amountPaid is only ever moved by record_payment, which audits it and
        // checks it against the balance. Accepting it here would let an
        // invoice be marked paid with no payment record behind it.
        unset($clean['amountPaid']);

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
