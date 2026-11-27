<?php
/**
 * Bueno Freight OS — staff credential provisioning and rotation
 *
 * Rotating a credential has one job beyond setting a new password: it has to
 * end the access the old one opened. A rotation that leaves existing sessions
 * alive has not rotated anything, because whoever is already signed in stays
 * signed in — which is precisely the case rotation exists to close.
 *
 * Asserts that, plus the things that make the issued credentials usable: each
 * role gets an account with the right scope, the password works exactly once
 * before it must be changed, and the same password is never issued twice.
 *
 * Usage (its own disposable database):
 *   BUENO_ENV_FILE=/path/to/scratch.env BUENO_E2E_URL=http://127.0.0.1:8777 \
 *   php scripts/tests/staff-credentials.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("CLI only.\n");
}

require_once __DIR__ . '/../../apps/web/public/api/_lib/config.php';
require_once __DIR__ . '/../../apps/web/public/api/_lib/db.php';

$BASE = rtrim(getenv('BUENO_E2E_URL') ?: 'http://127.0.0.1:8777', '/');

$pass = 0;
$fail = 0;

function t(string $name, bool $cond, string $detail = ''): bool
{
    global $pass, $fail;
    if ($cond) {
        $pass++;
        echo "  [PASS] {$name}" . PHP_EOL;
    } else {
        $fail++;
        echo "  [FAIL] {$name}" . ($detail !== '' ? " ({$detail})" : '') . PHP_EOL;
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

function login(string $id, string $secret): array
{
    return http('POST', '/api/auth.php', ['action' => 'login', 'identifier' => $id, 'secret' => $secret]);
}

/** Run provision-staff.php and parse the table it prints. */
function provision(array $flags): array
{
    $root = dirname(__DIR__, 2);
    $cmd  = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($root . '/scripts/provision-staff.php');
    foreach ($flags as $f) {
        $cmd .= ' ' . escapeshellarg($f);
    }

    $out = [];
    exec($cmd . ' 2>&1', $out);
    $text = implode("\n", $out);

    $creds = [];
    foreach ($out as $lineText) {
        // ROLE  email@domain  XXXXX-XXXXX-XXXXX  STATION
        if (preg_match('/^\s{2}([A-Z_]+)\s+(\S+@\S+)\s+([A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5})\s+(\S+)/', $lineText, $m) === 1) {
            $creds[$m[2]] = ['role' => $m[1], 'secret' => $m[3], 'station' => $m[4]];
        }
    }

    return ['creds' => $creds, 'output' => $text];
}

echo PHP_EOL . '=== Provisioning the staff set ===' . PHP_EOL;

$first = provision(['--domain=e2etest.local']);
t('an account was issued for every internal role', count($first['creds']) >= 6,
    count($first['creds']) . ' issued');

$secrets = array_column($first['creds'], 'secret');
t('no two accounts got the same password', count($secrets) === count(array_unique($secrets)));

t('passwords are long enough to resist guessing',
    !array_filter($secrets, static fn($s) => strlen($s) < 16));

t('and avoid characters that are misread when dictated',
    !array_filter($secrets, static fn($s) => preg_match('/[O0Il1]/', $s) === 1),
    'a password contains O, 0, I, l or 1');

$roles = array_column($first['creds'], 'role');
foreach (['ADMIN', 'CEO', 'HEAD_OF_OPERATIONS', 'HEAD_OF_FINANCE', 'ACCOUNTANT', 'CARGO_OFFICER'] as $r) {
    t("{$r} has an account", in_array($r, $roles, true));
}

$sidings = array_filter($first['creds'], static fn($c) => $c['role'] === 'CARGO_OFFICER');
$stations = array_unique(array_column($sidings, 'station'));
t('cargo officers are posted to different stations', count($stations) >= 2,
    implode(', ', $stations));

echo PHP_EOL . '=== The credentials work ===' . PHP_EOL;

$adminEmail = null;
foreach ($first['creds'] as $email => $c) {
    if ($c['role'] === 'ADMIN') $adminEmail = $email;
}

if (t('an administrator account was issued', $adminEmail !== null)) {
    $r = login($adminEmail, $first['creds'][$adminEmail]['secret']);
    t('the issued password signs in', $r['status'] === 200, 'HTTP ' . $r['status'] . ': ' . $r['raw']);
    $oldToken = $r['json']['token'] ?? null;

    t('and the account is told to change it',
        ($r['json']['user']['mustChangeCredentials'] ?? false) === true,
        'mustChangeCredentials was not set');

    $r = login($adminEmail, 'not-the-password');
    t('a wrong password does not', $r['status'] === 401, 'HTTP ' . $r['status']);

    echo PHP_EOL . '=== Re-running leaves existing accounts alone ===' . PHP_EOL;

    $second = provision(['--domain=e2etest.local']);
    t('a second run issues nothing', count($second['creds']) === 0,
        count($second['creds']) . ' credential(s) were reissued without --rotate');
    t('and says why', str_contains($second['output'], '--rotate'));

    $r = login($adminEmail, $first['creds'][$adminEmail]['secret']);
    t('the original password still works', $r['status'] === 200, 'HTTP ' . $r['status']);

    echo PHP_EOL . '=== Rotation replaces the credential AND ends the session ===' . PHP_EOL;

    t('the old session is still live before rotating',
        $oldToken !== null && http('GET', '/api/users.php', null, $oldToken)['status'] === 200);

    $third = provision(['--domain=e2etest.local', '--rotate', '--only=ADMIN']);
    $newSecret = $third['creds'][$adminEmail]['secret'] ?? null;

    t('rotation issues a new password', $newSecret !== null && $newSecret !== $first['creds'][$adminEmail]['secret'],
        'got ' . var_export($newSecret, true));

    $r = login($adminEmail, $first['creds'][$adminEmail]['secret']);
    t('the OLD password no longer works', $r['status'] === 401, 'HTTP ' . $r['status']);

    $r = login($adminEmail, (string) $newSecret);
    t('the new password does', $r['status'] === 200, 'HTTP ' . $r['status'] . ': ' . $r['raw']);

    /*
     * The assertion that matters. A new password that leaves the old session
     * alive has changed nothing for anyone already signed in.
     */
    $r = http('GET', '/api/users.php', null, (string) $oldToken);
    t('the session opened with the old password is REVOKED', $r['status'] === 401,
        'HTTP ' . $r['status'] . ' - whoever was signed in on the old credential is still signed in');

    t('rotation says the sessions were ended',
        str_contains(strtolower($third['output']), 'revoked'));
}

echo PHP_EOL . '=== Nothing is stored in readable form ===' . PHP_EOL;

$pdo = Db::conn();
$rows = $pdo->query(
    "SELECT email, pin, password_hash FROM bueno_users
      WHERE email LIKE '%@e2etest.local'"
)->fetchAll(PDO::FETCH_ASSOC);

$plaintext = 0;
foreach ($rows as $row) {
    if (($row['pin'] ?? '') !== '') $plaintext++;
    if (!str_starts_with((string) $row['password_hash'], '$2y$')) $plaintext++;
}
t('every credential is bcrypt-hashed and no plaintext pin is kept', $plaintext === 0,
    "{$plaintext} field(s) hold something readable");

$issuedSecrets = array_column($first['creds'], 'secret');
$leaked = 0;
foreach ($rows as $row) {
    foreach ($issuedSecrets as $sec) {
        if (str_contains(json_encode($row), $sec)) $leaked++;
    }
}
t('no issued password appears anywhere in the user row', $leaked === 0);

echo PHP_EOL;
if ($fail === 0) {
    echo "All {$pass} staff-credential assertions passed." . PHP_EOL . PHP_EOL;
    exit(0);
}
echo "{$fail} of " . ($pass + $fail) . " assertions FAILED." . PHP_EOL . PHP_EOL;
exit(1);
