<?php
/**
 * Bueno Freight OS — company registry
 *
 * The registry exists so that a customer is identified by a stable id rather
 * than by the spelling of their name. These assert the three things that
 * follow from that, each of which was a real fault before it:
 *
 *   - renaming an organisation keeps its history attached
 *   - the same organisation keyed two ways is one company, not two
 *   - merging two records moves the freight and closes the duplicate
 *
 * and the one thing that must NOT follow: folding names together must never
 * show one customer another's consignments.
 *
 * Usage:
 *   BUENO_E2E_URL=http://127.0.0.1:8777 \
 *   BUENO_E2E_ADMIN=admin@example.com BUENO_E2E_PASS=secret \
 *   php scripts/tests/company-registry.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("CLI only.\n");
}

require_once __DIR__ . '/../../apps/web/public/api/_lib/company.php';

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

function ok(string $name): void
{
    global $pass;
    $pass++;
    echo "  \033[32mPASS\033[0m  {$name}" . PHP_EOL;
}

function bad(string $name, string $detail): void
{
    global $fail, $failures;
    $fail++;
    $failures[] = "{$name}\n      {$detail}";
    echo "  \033[31mFAIL\033[0m  {$name}" . PHP_EOL;
    echo "        \033[31m{$detail}\033[0m" . PHP_EOL;
}

function check(string $name, bool $cond, string $detail = ''): bool
{
    $cond ? ok($name) : bad($name, $detail);
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

$stamp = substr((string) time(), -6);

echo PHP_EOL . "\033[1mCompany registry\033[0m" . PHP_EOL;

$admin = login($ADMIN, $PASS);
if ($admin === null) {
    bad('administrator can sign in', 'no token');
    exit(1);
}

// ── Name folding ────────────────────────────────────────────────────────────

echo PHP_EOL . "\033[1;36m── Name folding\033[0m" . PHP_EOL;

$sameOrg = [
    ['HBM Nig Plc',          'HBM Nig. PLC '],
    ['Huaxin Cement Ltd',    'huaxin cement limited'],
    ['Dangote Agro',         'Dangote Agro (DAG)'],
];
foreach ($sameOrg as [$a, $b]) {
    check(
        "\"{$a}\" and \"{$b}\" are the same organisation",
        Company::matchKey($a) === Company::matchKey($b),
        Company::matchKey($a) . ' vs ' . Company::matchKey($b)
    );
}

$differentOrg = [
    ['Huaxin Cement',  'Huaxin Steel'],
    ['Lafarge Nig',    'Dangote Nig'],
    ['BUA Foods',      'BUA Cement'],
];
foreach ($differentOrg as [$a, $b]) {
    check(
        "\"{$a}\" and \"{$b}\" stay separate organisations",
        Company::matchKey($a) !== Company::matchKey($b),
        'both folded to ' . Company::matchKey($a)
    );
}

check(
    'a name with nothing to match on is rejected',
    Company::matchKey('   ') === '' && Company::matchKey('...') === '',
    'folding produced a key for an empty name'
);

// ── A rename keeps the history ──────────────────────────────────────────────

echo PHP_EOL . "\033[1;36m── A rename keeps the history attached\033[0m" . PHP_EOL;

$originalName = "Keystone Cement {$stamp}";
$renamedTo    = "Keystone Building Materials {$stamp}";
$email        = "keystone.{$stamp}@e2e.local";

$r = http('POST', '/api/users.php', [
    'action' => 'create', 'fullName' => 'Keystone Desk', 'email' => $email,
    'role' => 'CONSIGNEE', 'userType' => 'CUSTOMER', 'companyName' => $originalName,
], $admin);
$secret = $r['json']['initialSecret'] ?? null;
check('consignee provisioned', $secret !== null, $r['raw']);

$companyId = $r['json']['user']['companyId'] ?? null;
check('the account is attached to a registered company', !empty($companyId),
    'companyId was not set on the new account: ' . json_encode($r['json']['user'] ?? []));

$tripId = "TRP-KEY-{$stamp}";
$r = http('POST', '/api/trips.php', [
    'action' => 'upsert',
    'record' => [
        'id' => $tripId, 'tripId' => $tripId, 'company' => $originalName,
        'origin' => 'PAPA', 'destination' => 'MNY', 'status' => 'IN_TRANSIT',
    ],
], $admin);
check('a consignment is recorded for them', in_array($r['status'], [200, 201], true), $r['raw']);

$cust = $secret !== null ? login($email, $secret) : null;
check('the customer can sign in', $cust !== null, 'login failed');

$seesIt = static function (?string $token, string $tripId): bool {
    if ($token === null) return false;
    $r = http('GET', '/api/trips.php', null, $token);
    foreach (($r['json']['data'] ?? []) as $row) {
        if (($row['id'] ?? '') === $tripId) return true;
    }
    return false;
};

check('they see their consignment before the rename', $seesIt($cust, $tripId),
    'the trip is not in the customer portal');

// Rename the organisation in the registry.
if (!empty($companyId)) {
    $r = http('POST', '/api/companies.php', [
        'action' => 'upsert',
        'record' => ['id' => $companyId, 'name' => $renamedTo, 'isExternal' => true],
    ], $admin);
    check('the organisation can be renamed', in_array($r['status'], [200, 201], true), $r['raw']);
}

/*
 * The assertion this whole table exists for.
 *
 * Before the registry, the customer's trips were found by matching their
 * account's companyName against the name stored on each trip. Renaming
 * either side silently emptied their portal, with nothing to say why.
 */
check(
    'they STILL see it after the rename',
    $seesIt($cust, $tripId),
    'renaming the organisation detached its history — this is the fault the '
  . 'registry exists to prevent'
);

// ── Two spellings are one organisation ──────────────────────────────────────

echo PHP_EOL . "\033[1;36m── Two spellings, one organisation\033[0m" . PHP_EOL;

$spellingA = "Ogun Minerals Nig Plc {$stamp}";
$spellingB = "ogun minerals nig. plc {$stamp}";

$r = http('POST', '/api/users.php', [
    'action' => 'create', 'fullName' => 'Ogun Desk A', 'email' => "ogun.a.{$stamp}@e2e.local",
    'role' => 'CONSIGNEE', 'userType' => 'CUSTOMER', 'companyName' => $spellingA,
], $admin);
$idA = $r['json']['user']['companyId'] ?? null;

$r = http('POST', '/api/users.php', [
    'action' => 'create', 'fullName' => 'Ogun Desk B', 'email' => "ogun.b.{$stamp}@e2e.local",
    'role' => 'CONSIGNEE', 'userType' => 'CUSTOMER', 'companyName' => $spellingB,
], $admin);
$idB = $r['json']['user']['companyId'] ?? null;

check('two spellings resolve to one company', !empty($idA) && $idA === $idB,
    "got {$idA} and {$idB}");

$r = http('POST', '/api/companies.php', [
    'action' => 'upsert',
    'record' => ['name' => $spellingA . ' duplicate attempt', 'isExternal' => true],
], $admin);
$r2 = http('POST', '/api/companies.php', [
    'action' => 'upsert',
    'record' => ['name' => $spellingA, 'isExternal' => true],
], $admin);
check('a second company cannot be registered under the same name', $r2['status'] === 409,
    "HTTP {$r2['status']}: {$r2['raw']}");

// ── Merging ─────────────────────────────────────────────────────────────────

echo PHP_EOL . "\033[1;36m── Merging two records of one organisation\033[0m" . PHP_EOL;

$leftName  = "Riverbed Industries {$stamp}";
$rightName = "Riverbed Holdings {$stamp}";

$mk = static function (string $name) use ($admin): ?string {
    $r = http('POST', '/api/companies.php', [
        'action' => 'upsert', 'record' => ['name' => $name, 'isExternal' => true],
    ], $admin);
    return $r['json']['record']['id'] ?? $r['json']['company']['id'] ?? null;
};

$leftId  = $mk($leftName);
$rightId = $mk($rightName);
check('two companies registered for the merge test', !empty($leftId) && !empty($rightId),
    "left={$leftId} right={$rightId}");

$mergeTrip = "TRP-MERGE-{$stamp}";
http('POST', '/api/trips.php', [
    'action' => 'upsert',
    'record' => [
        'id' => $mergeTrip, 'tripId' => $mergeTrip, 'company' => $leftName,
        'origin' => 'PAPA', 'destination' => 'MNY', 'status' => 'LOADING',
    ],
], $admin);

if (!empty($leftId) && !empty($rightId)) {
    $r = http('POST', '/api/companies.php', [
        'action' => 'merge', 'sourceId' => $leftId, 'targetId' => $rightId,
    ], $admin);
    check('the merge is accepted', $r['status'] === 200, "HTTP {$r['status']}: {$r['raw']}");

    $r = http('GET', '/api/trips.php?id=' . urlencode($mergeTrip), null, $admin);
    $trip = $r['json']['data'][0] ?? [];
    check('the consignment moved to the surviving company',
        ($trip['companyId'] ?? '') === $rightId,
        'trip companyId is ' . ($trip['companyId'] ?? 'unset') . ', expected ' . $rightId);

    check('and now shows the surviving name',
        ($trip['company'] ?? '') === $rightName,
        'trip company is ' . ($trip['company'] ?? 'unset'));

    $r = http('POST', '/api/companies.php', [
        'action' => 'merge', 'sourceId' => $rightId, 'targetId' => $rightId,
    ], $admin);
    check('a company cannot be merged into itself', $r['status'] === 422, "HTTP {$r['status']}");
}

// ── Merging must not leak ───────────────────────────────────────────────────

echo PHP_EOL . "\033[1;36m── Folding never crosses organisations\033[0m" . PHP_EOL;

$outsiderEmail = "outsider.{$stamp}@e2e.local";
$r = http('POST', '/api/users.php', [
    'action' => 'create', 'fullName' => 'Outsider Desk', 'email' => $outsiderEmail,
    'role' => 'CONSIGNEE', 'userType' => 'CUSTOMER', 'companyName' => "Unrelated Traders {$stamp}",
], $admin);
$outsider = isset($r['json']['initialSecret']) ? login($outsiderEmail, $r['json']['initialSecret']) : null;

check('an unrelated customer sees none of it',
    $outsider !== null && !$seesIt($outsider, $tripId) && !$seesIt($outsider, $mergeTrip),
    'a customer of a different organisation could see another company\'s consignments');

if ($outsider !== null) {
    $r = http('GET', '/api/companies.php', null, $outsider);
    check('a customer cannot read the company registry', $r['status'] === 403,
        "HTTP {$r['status']}");

    $r = http('POST', '/api/companies.php', [
        'action' => 'merge', 'sourceId' => (string) $leftId, 'targetId' => (string) $rightId,
    ], $outsider);
    check('a customer cannot merge companies', $r['status'] === 403, "HTTP {$r['status']}");
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
