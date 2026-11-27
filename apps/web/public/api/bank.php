<?php
/**
 * Bueno Freight OS — Bank accounts and reconciliation
 *
 *   GET  /api/bank.php[?id=|since=]
 *   POST /api/bank.php {action:"upsert", record:{...}}
 *   POST /api/bank.php {action:"reconcile", id, statementBalance, statementDate}
 *
 * Reconciliation compares a bank statement against what the ledger says the
 * account holds. Previously it set a status flag on a number held in the
 * browser, which compared nothing against anything.
 *
 * Marking an account reconciled when the two disagree is refused: a tick on
 * a reconciliation screen that does not mean the figures agree is worse than
 * no tick at all.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';
require_once __DIR__ . '/_lib/ledger.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

// ── Reconcile against the ledger ────────────────────────────────────────────
if ($action === 'RECONCILE') {
    $actor = Rbac::require('finance.bank_reconciliation');

    $data = Validator::for($body)
        ->identifier('id', true, 100)
        ->number('statementBalance', true)
        ->string('statementDate', false, 32)
        ->string('note', false, 500)
        ->validated();

    $stmt = Db::conn()->prepare('SELECT * FROM bueno_bank_accounts WHERE id = ? LIMIT 1');
    $stmt->execute([$data['id']]);
    $bank = $stmt->fetch();
    if ($bank === false) {
        Response::error('Bank account not found.', 404);
    }

    $ledgerAccountId = (string) ($bank['ledgerAccountId'] ?? '');
    if ($ledgerAccountId === '') {
        Response::error(
            'This bank account is not linked to an account in the chart of accounts, '
          . 'so there is nothing to reconcile it against. Set ledgerAccountId first.',
            422
        );
    }

    $account = Ledger::account($ledgerAccountId);
    if ($account === null) {
        Response::error('The linked ledger account no longer exists.', 422);
    }

    $asOf = $data['statementDate'] !== null ? substr($data['statementDate'], 0, 10) : null;

    $ledgerBalance = 0.0;
    foreach (Ledger::trialBalance($asOf) as $row) {
        if ((string) $row['id'] === (string) $account['id']) {
            $ledgerBalance = (float) $row['balance'];
            break;
        }
    }

    $statement  = round((float) $data['statementBalance'], 2);
    $difference = round($statement - $ledgerBalance, 2);
    $agrees     = abs($difference) <= Ledger::EPSILON;

    $now = gmdate('Y-m-d\TH:i:s\Z');

    Db::conn()->prepare(
        'UPDATE bueno_bank_accounts
            SET statementBalance = ?, statementDate = ?, status = ?,
                lastReconciledAt = ?, lastReconciledBy = ?, updated_at = ?, version = version + 1
          WHERE id = ?'
    )->execute([
        $statement,
        $asOf,
        $agrees ? 'RECONCILED' : 'PENDING_REVIEW',
        $agrees ? $now : ($bank['lastReconciledAt'] ?? null),
        $agrees ? (string) ($actor['fullName'] ?? $actor['id']) : ($bank['lastReconciledBy'] ?? null),
        $now,
        $bank['id'],
    ]);

    Audit::record('bank.reconciled', 'bank_account', (string) $bank['id'], Audit::SUCCESS, [
        'statementBalance' => $statement,
        'ledgerBalance'    => $ledgerBalance,
        'difference'       => $difference,
        'agrees'           => $agrees,
        'note'             => $data['note'] ?? null,
    ], $actor);

    if (!$agrees) {
        /*
         * Not an error: an unreconciled account is an ordinary finding, and
         * the comparison has been recorded. But it is not reconciled, and the
         * response says so rather than returning a bare success the screen
         * might render as a tick.
         */
        Response::json([
            'status'           => 'success',
            'reconciled'       => false,
            'statementBalance' => $statement,
            'ledgerBalance'    => round($ledgerBalance, 2),
            'difference'       => $difference,
            'message'          => sprintf(
                'The statement and the ledger differ by %.2f. The account stays unreconciled '
              . 'until the difference is explained or an adjusting entry is posted.',
                $difference
            ),
        ], 200);
    }

    Response::ok([
        'reconciled'       => true,
        'statementBalance' => $statement,
        'ledgerBalance'    => round($ledgerBalance, 2),
        'difference'       => 0,
        'reconciledAt'     => $now,
    ]);
}

// ── Standard collection handling ────────────────────────────────────────────
Collection::handle([
    'table'  => 'bueno_bank_accounts',
    'entity' => 'bank',

    'capabilities' => [
        'read'   => ['finance.bank_reconciliation', 'finance.statements_view'],
        'write'  => 'finance.bank_reconciliation',
        'delete' => 'finance.coa_manage',
        'purge'  => 'system.purge_data',
    ],

    'orderBy'   => '`bankName` ASC',
    'versioned' => true,

    'beforeRead' => static function (array $actor): void {
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Customer accounts cannot read bank accounts.', 403);
        }
    },

    'validate' => static function (array $input, array $actor): array {
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Customer accounts cannot edit bank accounts.', 403);
        }

        $clean = Validator::for($input)
            ->string('bankName', true, 191, 2)
            ->string('accountName', false, 191)
            ->string('accountNumberTail', false, 8)
            ->identifier('currency', false, 8)
            ->identifier('ledgerAccountId', false, 100)
            ->string('statementDate', false, 32)
            ->validated();

        /*
         * Only the last four digits are kept.
         *
         * A full account number has no use on a reconciliation screen, and
         * holding one makes this table worth stealing. If a caller sends a
         * whole number, keep the tail rather than refusing the record.
         */
        if (($clean['accountNumberTail'] ?? null) === null && isset($input['accountNumber'])) {
            $digits = preg_replace('/\D+/', '', (string) $input['accountNumber']) ?? '';
            if ($digits !== '') {
                $clean['accountNumberTail'] = substr($digits, -4);
            }
        }

        if (($clean['ledgerAccountId'] ?? null) !== null) {
            $account = Ledger::account($clean['ledgerAccountId']);
            if ($account === null) {
                Response::error('That ledger account does not exist.', 422);
            }
            if (strtoupper((string) $account['type']) !== 'ASSET') {
                // A bank balance is an asset. Pointing one at a revenue
                // account would compare a statement against a figure that
                // moves the other way.
                Response::error(
                    "Account {$account['code']} is a " . strtolower((string) $account['type'])
                  . ' account. A bank account must be linked to an asset account.',
                    422
                );
            }
            $clean['ledgerAccountId'] = (string) $account['id'];
        }

        // Balances and reconciliation state are set by the reconcile action,
        // which records what was compared against what.
        unset(
            $clean['statementBalance'],
            $clean['status'],
            $clean['lastReconciledAt'],
            $clean['lastReconciledBy'],
            $clean['balance']
        );

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
