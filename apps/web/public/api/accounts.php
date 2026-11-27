<?php
/**
 * Bueno Freight OS — Chart of accounts
 *
 *   GET  /api/accounts.php[?id=|code=|since=]
 *   GET  /api/accounts.php?trialBalance=1[&asOf=YYYY-MM-DD]
 *   POST /api/accounts.php {action:"upsert", record:{...}}
 *
 * The accounts the ledger posts against. Previously this lived in a seeded
 * array in the browser's localStorage, so every user had their own chart and
 * clearing site data destroyed it.
 *
 * Balances are not stored and cannot be written. They are derived from the
 * posted journal lines, so a balance can never disagree with the entries that
 * produced it. Changing one means posting an entry.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';
require_once __DIR__ . '/_lib/ledger.php';

$method = Http::method();

// ── Trial balance ───────────────────────────────────────────────────────────
if ($method === 'GET' && isset($_GET['trialBalance'])) {
    Rbac::requireAny('finance.statements_view', 'finance.coa_view');

    $asOf = isset($_GET['asOf']) ? substr((string) $_GET['asOf'], 0, 10) : null;
    $rows = Ledger::trialBalance($asOf);

    $totals = ['debit' => 0.0, 'credit' => 0.0];
    foreach ($rows as $r) {
        $totals['debit']  += (float) $r['totalDebit'];
        $totals['credit'] += (float) $r['totalCredit'];
    }

    Response::json([
        'status'     => 'success',
        'data'       => $rows,
        'count'      => count($rows),
        'totals'     => [
            'debit'  => round($totals['debit'], 2),
            'credit' => round($totals['credit'], 2),
        ],
        // Said out loud rather than left for the reader to total: a trial
        // balance that does not balance is the one thing it exists to reveal.
        'integrity'  => Ledger::integrity(),
        'asOf'       => $asOf,
        'serverTime' => gmdate('Y-m-d\TH:i:s\Z'),
    ], 200);
}

// ── Standard collection handling ────────────────────────────────────────────
Collection::handle([
    'table'  => 'bueno_chart_of_accounts',
    'entity' => 'account',

    'capabilities' => [
        'read'   => 'finance.coa_view',
        'write'  => 'finance.coa_manage',
        'delete' => 'finance.coa_manage',
        'purge'  => 'system.purge_data',
    ],

    'orderBy'   => '`code` ASC',
    'versioned' => true,

    'beforeRead' => static function (array $actor): void {
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Customer accounts cannot read the chart of accounts.', 403);
        }
    },

    'validate' => static function (array $input, array $actor): array {
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Customer accounts cannot edit the chart of accounts.', 403);
        }

        $clean = Validator::for($input)
            ->identifier('code', true, 32)
            ->string('name', true, 191, 2)
            ->enum('type', Ledger::TYPES, true)
            ->string('subType', false, 100)
            ->number('openingBalance', false)
            ->string('description', false, 255)
            ->boolean('isEnabled', true)
            ->validated();

        $id = (string) ($input['id'] ?? '');

        // One code, one account. Two accounts sharing 4010 makes every report
        // that groups by code wrong, and silently.
        $dupe = Db::conn()->prepare(
            'SELECT id FROM bueno_chart_of_accounts WHERE code = ? AND id <> ? LIMIT 1'
        );
        $dupe->execute([$clean['code'], $id]);
        if ($dupe->fetchColumn() !== false) {
            Response::error("Account code {$clean['code']} is already in use.", 409);
        }

        if ($id !== '') {
            $existing = Ledger::account($id);

            if ($existing !== null) {
                /*
                 * An account's type decides which side increases it, so
                 * changing it silently reinterprets every entry already posted
                 * against it: a revenue account turned into an expense flips
                 * the sign of its whole history.
                 */
                if (strtoupper((string) $existing['type']) !== strtoupper($clean['type'])) {
                    $posted = Db::conn()->prepare(
                        'SELECT COUNT(*) FROM bueno_journal_lines WHERE accountId = ?'
                    );
                    $posted->execute([$existing['id']]);
                    if ((int) $posted->fetchColumn() > 0) {
                        Response::error(
                            'This account already has postings against it, so its type cannot be '
                          . 'changed. Disable it and open a new account instead.',
                            409
                        );
                    }
                }

                /*
                 * Likewise the opening balance: moving it moves every balance
                 * derived from it with no entry to explain the change. Post
                 * an adjusting entry instead.
                 */
                if (isset($clean['openingBalance'])
                    && abs((float) $clean['openingBalance'] - (float) $existing['openingBalance']) > Ledger::EPSILON) {
                    $posted = Db::conn()->prepare(
                        'SELECT COUNT(*) FROM bueno_journal_lines WHERE accountId = ?'
                    );
                    $posted->execute([$existing['id']]);
                    if ((int) $posted->fetchColumn() > 0) {
                        Response::error(
                            'This account has postings against it, so its opening balance cannot be '
                          . 'edited. Post an adjusting journal entry instead.',
                            409
                        );
                    }
                }
            }
        }

        if (($clean['createdBy'] ?? null) === null) {
            $clean['createdBy'] = (string) ($actor['fullName'] ?? $actor['id'] ?? 'system');
        }

        // Derived, never written.
        unset($clean['balance'], $clean['movement'], $clean['totalDebit'], $clean['totalCredit']);

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
