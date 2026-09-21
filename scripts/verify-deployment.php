<?php
/**
 * Bueno Freight OS — post-deployment verification
 *
 * Reports what is actually in the live database, so a deployment can be
 * confirmed rather than assumed.
 *
 * Usage:
 *   BUENO_ENV_FILE=/home/speckles/.env php scripts/verify-deployment.php
 *
 * Exists as a script rather than a one-liner because cron treats % as a
 * newline, which mangles any command containing printf format strings.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/apps/web/public/api/_lib/db.php';

function line(string $text = ''): void
{
    echo $text . PHP_EOL;
}

function heading(string $text): void
{
    line();
    line($text);
    line(str_repeat('-', max(4, strlen($text))));
}

// ── Connection ──────────────────────────────────────────────────────────────

try {
    $pdo = Db::conn();
} catch (Throwable $e) {
    line('CANNOT CONNECT');
    line($e->getMessage());
    exit(1);
}

$driver = Db::driver();

line('Bueno Freight OS — deployment verification');
line('Database driver : ' . $driver);

if ($driver !== 'mysql') {
    line();
    line('WARNING: not connected to MySQL. Data is going to a local file and will');
    line('         not appear in phpMyAdmin. Check DB_NAME / DB_USER / DB_PASS.');
}

// ── Build ───────────────────────────────────────────────────────────────────

$buildPath = $root . '/apps/web/public/api/build-info.json';
if (is_file($buildPath)) {
    $b = json_decode((string) file_get_contents($buildPath), true);
    if (is_array($b)) {
        line('Repository build: ' . ($b['commit'] ?? '?') . ' built ' . ($b['builtAt'] ?? '?'));
    }
}

// ── Schema ──────────────────────────────────────────────────────────────────

heading('Schema');

try {
    $applied = (int) $pdo->query('SELECT COUNT(*) FROM bueno_migrations')->fetchColumn();
    line('Migrations applied: ' . $applied);
} catch (Throwable $e) {
    line('Migrations applied: NONE — the schema has not been created.');
}

// ── Record counts ───────────────────────────────────────────────────────────

heading('Records');

$tables = [
    'bueno_users', 'bueno_trips', 'bueno_deals', 'bueno_wagons',
    'bueno_invoices', 'bueno_fund_requests', 'bueno_trip_costs',
    'bueno_negotiations', 'bueno_sessions', 'bueno_audit_log',
];

foreach ($tables as $table) {
    try {
        $count = (int) $pdo->query('SELECT COUNT(*) FROM `' . $table . '`')->fetchColumn();
        line(str_pad($table, 22) . $count);
    } catch (Throwable $e) {
        line(str_pad($table, 22) . 'MISSING');
    }
}

// ── Operational data ────────────────────────────────────────────────────────

heading('Trips');
try {
    $rows = $pdo->query('SELECT tripId, company, origin, destination, status FROM bueno_trips ORDER BY id')->fetchAll();
    if ($rows === []) {
        line('(none)');
    }
    foreach ($rows as $r) {
        line(sprintf(
            '  %-12s %-34s %s -> %-5s %s',
            (string) ($r['tripId'] ?? ''),
            substr((string) ($r['company'] ?? ''), 0, 34),
            (string) ($r['origin'] ?? ''),
            (string) ($r['destination'] ?? ''),
            (string) ($r['status'] ?? '')
        ));
    }
} catch (Throwable $e) {
    line('  could not read: ' . $e->getMessage());
}

heading('Deals');
try {
    $rows = $pdo->query('SELECT dealNumber, company, cargoType, quantity, status FROM bueno_deals ORDER BY id')->fetchAll();
    if ($rows === []) {
        line('(none)');
    }
    foreach ($rows as $r) {
        line(sprintf(
            '  %-14s %-34s %-28s %s %s',
            (string) ($r['dealNumber'] ?? ''),
            substr((string) ($r['company'] ?? ''), 0, 34),
            substr((string) ($r['cargoType'] ?? ''), 0, 28),
            (string) ($r['quantity'] ?? ''),
            (string) ($r['status'] ?? '')
        ));
    }
} catch (Throwable $e) {
    line('  could not read: ' . $e->getMessage());
}

// ── Accounts ────────────────────────────────────────────────────────────────
//
// Credentials are never printed. What matters operationally is who can sign
// in and which accounts are still on a credential that was public before this
// release.

heading('Accounts');
try {
    $rows = $pdo->query(
        'SELECT email, role, status, must_change_credentials, password_hash
           FROM bueno_users ORDER BY role, email'
    )->fetchAll();

    $needReset = 0;
    $noHash    = 0;

    foreach ($rows as $r) {
        $hashed = ((string) ($r['password_hash'] ?? '')) !== '';
        $must   = (int) ($r['must_change_credentials'] ?? 0) === 1;
        if ($must)    $needReset++;
        if (!$hashed) $noHash++;

        line(sprintf(
            '  %-28s %-20s %-12s %s',
            (string) ($r['email'] ?? ''),
            (string) ($r['role'] ?? ''),
            (string) ($r['status'] ?? ''),
            $hashed ? ($must ? 'must set password' : 'ready') : 'NO CREDENTIAL'
        ));
    }

    line();
    line('Accounts requiring a password change at next sign-in: ' . $needReset);
    if ($noHash > 0) {
        line('Accounts with no usable credential: ' . $noHash . ' — these cannot sign in.');
    }
} catch (Throwable $e) {
    line('  could not read: ' . $e->getMessage());
}

// ── Leftover legacy files ───────────────────────────────────────────────────

heading('Cleanup');

$docroot = getenv('DEPLOYPATH') ?: '/home/speckles/360.specklessinnovations.com';
$legacy  = [];
foreach (['bueno.sqlite', 'bueno_trips_store.json', 'bueno_deals_store.json'] as $f) {
    if (is_file($docroot . '/api/' . $f)) {
        $legacy[] = $f;
    }
}

if ($legacy === []) {
    line('No legacy data files left in the document root.');
} else {
    line('Legacy files still present in ' . $docroot . '/api :');
    foreach ($legacy as $f) {
        line('  ' . $f);
    }
    line();
    line('Nothing reads them any more. Once the data above looks right, delete them:');
    line('  rm -f ' . $docroot . '/api/bueno.sqlite ' . $docroot . '/api/bueno_*_store.json');
}

line();
line('Done.');
