<?php
/**
 * Bueno Freight OS — double-entry ledger
 *
 * The books have exactly two rules, and every assertion here is one of them
 * or a consequence:
 *
 *   1. An entry's debits equal its credits.
 *   2. A posted entry is never edited or deleted; it is reversed.
 *
 * Also covers the things that quietly break a ledger: a revenue account
 * reported with the sign of an expense, an opening balance moved under
 * entries already posted, an account type changed after it has history, and
 * a reconciliation ticked while the figures disagree.
 *
 * Usage:
 *   BUENO_E2E_URL=http://127.0.0.1:8777 \
 *   BUENO_E2E_ADMIN=admin@example.com BUENO_E2E_PASS=secret \
 *   php scripts/tests/accounting-ledger.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("CLI only.\n");
}

$BASE  = rtrim(getenv('BUENO_E2E_URL') ?: 'http://127.0.0.1:8777', '/');
$ADMIN = getenv('BUENO_E2E_ADMIN') ?: 'admin@e2e.local';
$PASS  = getenv('BUENO_E2E_PASS') ?: '';

if ($PASS === '') {
    fwrite(STDERR, "Set BUENO_E2E_PASS.\n");
    exit(2);
}

$pass = 0;
$fail = 0;
$failures = [];

function section(string $s): void
{
    echo PHP_EOL . "\033[1;36m── {$s}\033[0m" . PHP_EOL;
}

function check(string $name, bool $cond, string $detail = ''): bool
{
    global $pass, $fail, $failures;
    if ($cond) {
        $pass++;
        echo "  \033[32mPASS\033[0m  {$name}" . PHP_EOL;
    } else {
        $fail++;
        $failures[] = "{$name}\n      {$detail}";
        echo "  \033[31mFAIL\033[0m  {$name}" . PHP_EOL;
        if ($detail !== '') {
            echo "        \033[31m{$detail}\033[0m" . PHP_EOL;
        }
    }
    return $cond;
}

function http(string $method, string $path, ?array $body = null, ?string $token = null): array
{
    global $BASE;
    $ch = curl_init($BASE . $path);
    $headers = ['Accept: application/json'];
    if ($body !== null) $headers[] = 'Content-Type: application/json';
    if ($token !== null) $headers[] = 'Authorization: Bearer ' . $token;
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 20,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $raw = (string) curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = json_decode($raw, true);
    return ['status' => $status, 'json' => is_array($json) ? $json : [], 'raw' => $raw];
}

function login(string $id, string $secret): ?string
{
    $r = http('POST', '/api/auth.php', ['action' => 'login', 'identifier' => $id, 'secret' => $secret]);
    return $r['json']['token'] ?? null;
}

function brief(array $r, int $n = 200): string
{
    return 'HTTP ' . $r['status'] . ': ' . (strlen($r['raw']) > $n ? substr($r['raw'], 0, $n) . '…' : $r['raw']);
}

$stamp = substr((string) time(), -6);

echo PHP_EOL . "\033[1mDouble-entry ledger\033[0m" . PHP_EOL;

$admin = login($ADMIN, $PASS);
if ($admin === null) {
    check('administrator can sign in', false, 'no token');
    exit(1);
}

// ── The chart of accounts exists on the server ──────────────────────────────

section('Chart of accounts');

$r = http('GET', '/api/accounts.php', null, $admin);
$accounts = $r['json']['data'] ?? [];
check('the chart of accounts is served from the database', $r['status'] === 200 && count($accounts) > 20,
    brief($r) . ' — ' . count($accounts) . ' account(s)');

$byCode = [];
foreach ($accounts as $a) {
    $byCode[(string) $a['code']] = $a;
}
check('it includes freight revenue (4010)', isset($byCode['4010']));
check('it includes trade debtors (1110)', isset($byCode['1110']));

check('every seeded account opens at zero',
    !array_filter($accounts, static fn($a) => abs((float) $a['openingBalance']) > 0.005),
    'an account was seeded with a non-zero opening balance — the illustrative '
  . 'figures from the browser array must not become real books');

$r = http('POST', '/api/accounts.php', [
    'action' => 'upsert',
    'record' => ['code' => '4010', 'name' => 'Duplicate Revenue', 'type' => 'REVENUE', 'isEnabled' => true],
], $admin);
check('an account code cannot be used twice', $r['status'] === 409, brief($r));

// ── Rule 1: debits equal credits ────────────────────────────────────────────

section('Rule 1 — an entry must balance');

$unbalanced = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'narration' => "Unbalanced attempt {$stamp}",
        'lines'     => [
            ['account' => '1110', 'debit' => 500000],
            ['account' => '4010', 'credit' => 400000],
        ],
    ],
], $admin);
check('an unbalanced entry is refused', $unbalanced['status'] === 422, brief($unbalanced));
check('and the refusal says by how much',
    str_contains(strtolower($unbalanced['raw']), 'does not balance')
    && str_contains($unbalanced['raw'], '100000'),
    $unbalanced['raw']);

$single = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => ['narration' => "Single line {$stamp}", 'lines' => [['account' => '1110', 'debit' => 1000]]],
], $admin);
check('a one-sided entry is refused', $single['status'] === 422, brief($single));

$negative = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'narration' => "Negative {$stamp}",
        'lines'     => [
            ['account' => '1110', 'debit' => -1000],
            ['account' => '4010', 'credit' => -1000],
        ],
    ],
], $admin);
check('negative amounts are refused', $negative['status'] === 422, brief($negative));

$both = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'narration' => "Both sides {$stamp}",
        'lines'     => [
            ['account' => '1110', 'debit' => 1000, 'credit' => 1000],
            ['account' => '4010', 'credit' => 1000],
        ],
    ],
], $admin);
check('a line cannot be both a debit and a credit', $both['status'] === 422, brief($both));

$unknown = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'narration' => "Unknown account {$stamp}",
        'lines'     => [
            ['account' => '9999', 'debit' => 1000],
            ['account' => '4010', 'credit' => 1000],
        ],
    ],
], $admin);
check('an entry naming an unknown account is refused', $unknown['status'] === 422, brief($unknown));

$noNarration = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'lines' => [
            ['account' => '1110', 'debit' => 1000],
            ['account' => '4010', 'credit' => 1000],
        ],
    ],
], $admin);
check('an entry without a narration is refused', $noNarration['status'] === 422, brief($noNarration));

// ── A real posting ──────────────────────────────────────────────────────────

section('Posting freight revenue');

$invoiceAmount = 5700000.00;

$posted = http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'entryDate'  => gmdate('Y-m-d'),
        'narration'  => "Freight invoiced to consignee {$stamp}",
        'reference'  => "INV-{$stamp}",
        'sourceType' => 'invoice',
        'sourceId'   => "INV-{$stamp}",
        'lines'      => [
            ['account' => '1110', 'debit'  => $invoiceAmount, 'description' => 'Trade debtors'],
            ['account' => '4010', 'credit' => $invoiceAmount, 'description' => 'Freight haulage revenue'],
        ],
    ],
], $admin);
check('a balanced entry posts', $posted['status'] === 201, brief($posted));

$entry = $posted['json']['entry'] ?? [];
$entryId = $entry['id'] ?? null;

check('it is given a sequential entry number',
    isset($entry['entryNumber']) && preg_match('/^JE-\d{4}-\d{5}$/', (string) $entry['entryNumber']) === 1,
    'got ' . var_export($entry['entryNumber'] ?? null, true));
check('it records who posted it', !empty($entry['postedBy']), json_encode($entry));
check('it carries both lines', count($entry['lines'] ?? []) === 2);
check('its totals are stored', abs((float) ($entry['totalDebit'] ?? 0) - $invoiceAmount) < 0.005);

// ── Balances are derived with the right sign ────────────────────────────────

section('Balances follow the account type');

$r = http('GET', '/api/accounts.php?trialBalance=1', null, $admin);
check('a trial balance is served', $r['status'] === 200, brief($r));

$tb = [];
foreach (($r['json']['data'] ?? []) as $row) {
    $tb[(string) $row['code']] = $row;
}

check('the asset account is debit-normal', ($tb['1110']['normalSide'] ?? '') === 'DEBIT');
check('the revenue account is credit-normal', ($tb['4010']['normalSide'] ?? '') === 'CREDIT');

check('the debtor balance went UP by the invoice',
    abs((float) ($tb['1110']['balance'] ?? 0) - $invoiceAmount) < 0.005,
    'got ' . ($tb['1110']['balance'] ?? 'nothing'));

/*
 * The sign test that matters. A credit-normal account whose balance is
 * computed as debits-minus-credits reports earned revenue as a negative
 * number, and every statement built on it is wrong.
 */
check('the revenue balance is POSITIVE, not negative',
    abs((float) ($tb['4010']['balance'] ?? 0) - $invoiceAmount) < 0.005,
    'got ' . ($tb['4010']['balance'] ?? 'nothing')
  . ' — a credit-normal account must not be reported as debits minus credits');

check('the ledger balances overall',
    ($r['json']['integrity']['balanced'] ?? false) === true,
    json_encode($r['json']['integrity'] ?? []));

check('total debits equal total credits',
    abs((float) ($r['json']['totals']['debit'] ?? 0) - (float) ($r['json']['totals']['credit'] ?? -1)) < 0.005,
    json_encode($r['json']['totals'] ?? []));

// ── Rule 2: posted entries are immutable ────────────────────────────────────

section('Rule 2 — a posted entry is never edited');

$r = http('POST', '/api/journal.php', [
    'action' => 'upsert',
    'record' => ['id' => $entryId, 'narration' => 'Quietly changed'],
], $admin);
check('the journal refuses an update', $r['status'] === 405, brief($r));

$r = http('POST', '/api/journal.php', ['action' => 'delete', 'id' => $entryId], $admin);
check('the journal refuses a delete', $r['status'] === 405, brief($r));

$r = http('GET', '/api/journal.php?id=' . urlencode((string) $entryId), null, $admin);
$still = $r['json']['data'][0] ?? [];
check('the entry is unchanged',
    str_contains((string) ($still['narration'] ?? ''), (string) $stamp),
    'narration is now ' . ($still['narration'] ?? 'missing'));

// ── Reversal ────────────────────────────────────────────────────────────────

section('Correcting by reversal');

$r = http('POST', '/api/journal.php', ['action' => 'reverse', 'id' => $entryId], $admin);
check('a reversal without a reason is refused', $r['status'] === 422, brief($r));

$rev = http('POST', '/api/journal.php', [
    'action' => 'reverse', 'id' => $entryId, 'reason' => 'Invoice cancelled by agreement',
], $admin);
check('a reversal posts', $rev['status'] === 201, brief($rev));

$reversal = $rev['json']['entry'] ?? [];
check('the reversal mirrors the original',
    count($reversal['lines'] ?? []) === 2
    && abs((float) ($reversal['totalDebit'] ?? 0) - $invoiceAmount) < 0.005,
    json_encode($reversal['lines'] ?? []));

check('the reversal points back at the original',
    ($reversal['reversesId'] ?? '') === $entryId,
    'reversesId is ' . ($reversal['reversesId'] ?? 'unset'));

$r = http('GET', '/api/journal.php?id=' . urlencode((string) $entryId), null, $admin);
$orig = $r['json']['data'][0] ?? [];
check('the original is marked reversed', strtoupper((string) ($orig['status'] ?? '')) === 'REVERSED',
    'status is ' . ($orig['status'] ?? 'unset'));
check('and records why', !empty($orig['reversalReason']), json_encode($orig));

$r = http('POST', '/api/journal.php', [
    'action' => 'reverse', 'id' => $entryId, 'reason' => 'again',
], $admin);
check('it cannot be reversed twice', $r['status'] === 409, brief($r));

$r = http('GET', '/api/accounts.php?trialBalance=1', null, $admin);
$tb2 = [];
foreach (($r['json']['data'] ?? []) as $row) {
    $tb2[(string) $row['code']] = $row;
}
check('the reversal takes the revenue back off the books',
    abs((float) ($tb2['4010']['balance'] ?? -1)) < 0.005,
    'revenue is now ' . ($tb2['4010']['balance'] ?? 'nothing') . ', expected 0');
check('and the ledger still balances',
    ($r['json']['integrity']['balanced'] ?? false) === true);

// ── Accounts with history are protected ─────────────────────────────────────

section('An account with postings cannot be redefined');

$r = http('POST', '/api/accounts.php', [
    'action' => 'upsert',
    'record' => ['id' => 'acc_4010', 'code' => '4010', 'name' => 'Freight Haulage Revenue',
                 'type' => 'EXPENSE', 'isEnabled' => true],
], $admin);
check('its type cannot be changed once it has entries', $r['status'] === 409, brief($r));

$r = http('POST', '/api/accounts.php', [
    'action' => 'upsert',
    'record' => ['id' => 'acc_4010', 'code' => '4010', 'name' => 'Freight Haulage Revenue',
                 'type' => 'REVENUE', 'openingBalance' => 9999999, 'isEnabled' => true],
], $admin);
check('its opening balance cannot be moved under them', $r['status'] === 409, brief($r));

$r = http('POST', '/api/accounts.php', [
    'action' => 'upsert',
    'record' => ['id' => 'acc_4010', 'code' => '4010', 'name' => 'Rail Freight Revenue',
                 'type' => 'REVENUE', 'isEnabled' => true],
], $admin);
check('but it can be renamed', in_array($r['status'], [200, 201], true), brief($r));

// ── Bank reconciliation ─────────────────────────────────────────────────────

section('Bank reconciliation compares against the ledger');

$bankId = "bank_{$stamp}";
$r = http('POST', '/api/bank.php', [
    'action' => 'upsert',
    'record' => [
        'id' => $bankId, 'bankName' => "Test Bank {$stamp}", 'accountName' => 'Operations',
        'accountNumber' => '0123456789', 'ledgerAccountId' => '1020',
    ],
], $admin);
check('a bank account can be registered', in_array($r['status'], [200, 201], true), brief($r));

$saved = $r['json']['record'] ?? [];
check('only the last four digits are kept',
    ($saved['accountNumberTail'] ?? '') === '6789'
    && !str_contains(json_encode($saved), '0123456789'),
    json_encode($saved));

$r = http('POST', '/api/bank.php', [
    'action' => 'upsert',
    'record' => ['id' => "bank_bad_{$stamp}", 'bankName' => 'Wrong Link', 'ledgerAccountId' => '4010'],
], $admin);
check('a bank account cannot point at a revenue account', $r['status'] === 422, brief($r));

// Put something through the bank account so there is a ledger balance.
http('POST', '/api/journal.php', [
    'action' => 'post',
    'entry'  => [
        'narration' => "Consignee remittance {$stamp}",
        'lines'     => [
            ['account' => '1020', 'debit'  => 2500000],
            ['account' => '1110', 'credit' => 2500000],
        ],
    ],
], $admin);

$r = http('POST', '/api/bank.php', [
    'action' => 'reconcile', 'id' => $bankId,
    'statementBalance' => 2400000, 'statementDate' => gmdate('Y-m-d'),
], $admin);
check('a statement that disagrees does NOT mark the account reconciled',
    $r['status'] === 200 && ($r['json']['reconciled'] ?? true) === false,
    brief($r));
check('and the difference is reported',
    abs((float) ($r['json']['difference'] ?? 0) + 100000) < 0.005,
    'difference reported as ' . ($r['json']['difference'] ?? 'nothing'));

$r = http('GET', '/api/bank.php?id=' . urlencode($bankId), null, $admin);
$bank = $r['json']['data'][0] ?? [];
check('the account stays pending review',
    strtoupper((string) ($bank['status'] ?? '')) === 'PENDING_REVIEW',
    'status is ' . ($bank['status'] ?? 'unset'));

$r = http('POST', '/api/bank.php', [
    'action' => 'reconcile', 'id' => $bankId,
    'statementBalance' => 2500000, 'statementDate' => gmdate('Y-m-d'),
], $admin);
check('a statement that agrees reconciles it',
    $r['status'] === 200 && ($r['json']['reconciled'] ?? false) === true,
    brief($r));

// ── Customers must not reach any of it ──────────────────────────────────────

section('The books are not customer-readable');

$custEmail = "ledger.cust.{$stamp}@e2e.local";
$r = http('POST', '/api/users.php', [
    'action' => 'create', 'fullName' => 'Ledger Customer', 'email' => $custEmail,
    'role' => 'CONSIGNEE', 'userType' => 'CUSTOMER', 'companyName' => "Ledger Co {$stamp}",
], $admin);
$cust = isset($r['json']['initialSecret']) ? login($custEmail, $r['json']['initialSecret']) : null;

if (check('a customer account exists', $cust !== null, 'could not sign in')) {
    foreach ([
        ['/api/accounts.php',                    'the chart of accounts'],
        ['/api/accounts.php?trialBalance=1',     'the trial balance'],
        ['/api/journal.php',                     'the journal'],
        ['/api/bank.php',                        'the bank accounts'],
    ] as [$path, $what]) {
        $r = http('GET', $path, null, $cust);
        check("a customer cannot read {$what}", $r['status'] === 403, brief($r));
    }

    $r = http('POST', '/api/journal.php', [
        'action' => 'post',
        'entry'  => [
            'narration' => 'Customer posting',
            'lines' => [['account' => '1110', 'credit' => 1000000], ['account' => '4010', 'debit' => 1000000]],
        ],
    ], $cust);
    check('a customer cannot post to the ledger', $r['status'] === 403, brief($r));
}

// ── Summary ─────────────────────────────────────────────────────────────────

echo PHP_EOL . str_repeat('─', 72) . PHP_EOL;
printf("  %d checks:  \033[32m%d passed\033[0m", $pass + $fail, $pass);
if ($fail > 0) {
    printf(",  \033[31m%d failed\033[0m", $fail);
    echo PHP_EOL . PHP_EOL . "\033[1;31mFAILURES\033[0m" . PHP_EOL;
    foreach ($failures as $f) {
        echo "    - {$f}" . PHP_EOL;
    }
}
echo PHP_EOL . PHP_EOL;

exit($fail === 0 ? 0 : 1);
