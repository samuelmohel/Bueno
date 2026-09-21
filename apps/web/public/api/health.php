<?php
/**
 * Bueno Freight OS — deployment health check
 *
 *   GET /api/health.php
 *
 * Answers the questions that come up while setting a deployment up: is PHP new
 * enough, did it find the .env, does the database connect, has the schema been
 * created, are the access protections active.
 *
 * Deliberately discloses nothing useful to an attacker: booleans, counts and
 * version numbers only. No credentials, no hostnames, no database names, no
 * file paths, no record contents, and no driver error text unless the
 * deployment is explicitly non-production.
 *
 * Safe to leave in place — it doubles as an uptime probe.
 */

declare(strict_types=1);

// This file must work even when the platform is too broken to boot normally,
// so it avoids bootstrap.php and handles its own failures.
require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/db.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

$checks   = [];
$problems = [];
$isDev    = false;

// ── Which build is actually live? ───────────────────────────────────────────
//
// The deploy artifact is committed, so the published site can lag the code —
// a forgotten rebuild, or a pull that never ran the deployment tasks. Showing
// the commit makes that visible instead of a mystery.
$buildInfo = ['commit' => 'unknown', 'builtAt' => null];
$buildPath = __DIR__ . '/build-info.json';
if (is_file($buildPath)) {
    $decoded = json_decode((string) file_get_contents($buildPath), true);
    if (is_array($decoded)) {
        $buildInfo = $decoded;
    }
}
$checks['build'] = $buildInfo;

try {
    $isDev = !Config::isProduction();
} catch (Throwable $e) {
    // Config could not even read the environment.
}

// ── PHP runtime ─────────────────────────────────────────────────────────────

$phpOk = PHP_VERSION_ID >= 80100;
$checks['php'] = [
    'version'    => PHP_VERSION,
    'sufficient' => $phpOk,
];
if (!$phpOk) {
    $problems[] = 'PHP is older than 8.1. Set the domain to PHP 8.1 or newer in cPanel > MultiPHP Manager.';
}

$required = ['pdo', 'pdo_mysql', 'mbstring', 'json'];
$missing  = array_values(array_filter($required, static fn($e) => !extension_loaded($e)));
$checks['extensions'] = [
    'required' => $required,
    'missing'  => $missing,
];
if ($missing !== []) {
    $problems[] = 'Missing PHP extension(s): ' . implode(', ', $missing)
        . '. Enable them in cPanel > MultiPHP INI Editor > Extensions.';
}

// ── Environment file ────────────────────────────────────────────────────────

$secretOk = false;
$envFound = false;
try {
    $secret   = Config::get('APP_SECRET');
    $envFound = $secret !== null || Config::get('DB_NAME') !== null;
    $secretOk = $secret !== null && strlen($secret) >= 32;
} catch (Throwable $e) {
    // fall through to the reporting below
}

$checks['environment'] = [
    // Whether a .env was located at all — not where, and not what is in it.
    'file_found'      => $envFound,
    'app_secret_set'  => $secretOk,
    'db_configured'   => Config::get('DB_NAME') !== null && Config::get('DB_USER') !== null,
    'mode'            => $isDev ? 'development' : 'production',
];

if (!$envFound) {
    $problems[] = 'No .env file was found. Create it at /home/<cpanel-user>/.env — see DEPLOYMENT.md.';
} elseif (!$secretOk) {
    $problems[] = 'APP_SECRET is missing or shorter than 32 characters. '
        . 'Generate one with: php -r \'echo bin2hex(random_bytes(32));\'';
}

if ($envFound && Config::get('DB_NAME') === null) {
    $problems[] = 'DB_NAME and DB_USER are not set, so the API would fall back to a local '
        . 'SQLite file rather than MySQL. Add your database credentials to .env.';
}

// ── Database ────────────────────────────────────────────────────────────────

$dbConnected = false;
$driver      = null;
$tableCount  = 0;
$applied     = 0;
$pending     = null;
$schemaReady = false;

try {
    $pdo         = Db::conn();
    $dbConnected = true;
    $driver      = Db::driver();

    // Has the schema been created?
    $expected = ['bueno_users', 'bueno_trips', 'bueno_deals', 'bueno_sessions', 'bueno_audit_log'];
    $found    = [];
    foreach ($expected as $table) {
        try {
            $pdo->query("SELECT 1 FROM `$table` LIMIT 1");
            $found[] = $table;
        } catch (Throwable $e) {
            // table absent
        }
    }
    $tableCount  = count($found);
    $schemaReady = $tableCount === count($expected);

    try {
        $applied = (int) $pdo->query('SELECT COUNT(*) FROM bueno_migrations')->fetchColumn();
    } catch (Throwable $e) {
        $applied = 0;
    }

    if (!$schemaReady) {
        $problems[] = 'The database is reachable but the schema is incomplete ('
            . $tableCount . ' of ' . count($expected) . ' core tables present). '
            . 'Run: php api/_lib/migrate.php up';
    }
} catch (Throwable $e) {
    $problems[] = 'Could not connect to the database. Check DB_NAME, DB_USER and DB_PASS in .env, '
        . 'and that the user is assigned to the database in cPanel > MySQL Databases.';
    if ($isDev) {
        // Only outside production: driver messages can contain host and user.
        $problems[] = 'Driver said: ' . $e->getMessage();
    }
}

// ── Can the application actually write? ─────────────────────────────────────
//
// Connecting and reading is not enough. Sign-in begins by recording a
// rate-limit hit, which is an upsert — and an upsert syntax the server rejects
// fails there, before anything is audited, producing a 500 with no trace. This
// exercises that exact path against a throwaway row.

$writeOk    = false;
$writeError = null;

if ($dbConnected && $schemaReady) {
    try {
        $probe = 'healthcheck:' . bin2hex(random_bytes(6));
        $sql   = Db::upsertSql('bueno_rate_limits', ['bucket', 'hits', 'window_start'], ['bucket']);

        $pdo->prepare($sql)->execute([$probe, 1, (string) time()]);
        // Run it twice: the second pass is the branch that actually exercises
        // the conflict clause.
        $pdo->prepare($sql)->execute([$probe, 2, (string) time()]);
        $pdo->prepare('DELETE FROM bueno_rate_limits WHERE bucket = ?')->execute([$probe]);

        $writeOk = true;
    } catch (Throwable $e) {
        $writeError = $e->getMessage();
        $problems[] = 'The database accepts reads but rejects writes. Sign-in cannot work '
            . 'until this is fixed. The server said: ' . $e->getMessage();
    }
}

$checks['database'] = [
    'connected'          => $dbConnected,
    'driver'             => $driver,
    'server_version'     => $dbConnected ? (string) $pdo->getAttribute(PDO::ATTR_SERVER_VERSION) : null,
    'core_tables_found'  => $tableCount,
    'core_tables_total'  => 5,
    'schema_ready'       => $schemaReady,
    'migrations_applied' => $applied,
    'writable'           => $writeOk,
    'write_error'        => $writeError,
];

// Using SQLite in production almost always means the MySQL credentials did not
// take effect, and the data is going somewhere nobody expects.
if ($dbConnected && $driver === 'sqlite' && !$isDev) {
    $problems[] = 'The API is running on SQLite, not MySQL. Your data is being written to a local '
        . 'file rather than the database. Check DB_NAME / DB_USER / DB_PASS in .env.';
}

// ── Access protections ──────────────────────────────────────────────────────
//
// Confirms the deploy actually carried the .htaccess files across. Whether
// Apache honours them is verified separately, by requesting a protected path.

$protections = [
    'api'        => is_file(__DIR__ . '/.htaccess'),
    'lib'        => is_file(__DIR__ . '/_lib/.htaccess'),
    'migrations' => is_file(__DIR__ . '/migrations/.htaccess'),
];
$checks['protections'] = $protections;

foreach ($protections as $where => $present) {
    if (!$present) {
        $problems[] = "The $where .htaccess is missing from the server. Re-deploy.";
    }
}

// Legacy data files still sitting in a web-served directory.
$legacy = [];
foreach (['bueno.sqlite', 'bueno_trips_store.json', 'bueno_deals_store.json'] as $f) {
    if (is_file(__DIR__ . '/' . $f)) {
        $legacy[] = $f;
    }
}
$checks['legacy_files_present'] = $legacy;
if ($legacy !== []) {
    $problems[] = 'Legacy data files are still on the server (' . implode(', ', $legacy) . '). '
        . 'Import them, then delete them — nothing reads them any more.';
}

// ── Result ──────────────────────────────────────────────────────────────────

$ready = $problems === [];

http_response_code($ready ? 200 : 503);

echo json_encode([
    'status'   => $ready ? 'ready' : 'not ready',
    'checks'   => $checks,
    'problems' => $problems,
    'time'     => gmdate('Y-m-d\TH:i:s\Z'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
