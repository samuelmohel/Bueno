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
 * ── Why this file is written in old-fashioned PHP ──────────────────────────
 *
 * PHP parses a file completely before executing any of it. A single arrow
 * function or typed property anywhere in here would make the whole file a
 * parse error on an older interpreter — turning the one endpoint that exists
 * to explain a blank 500 into another blank 500.
 *
 * So: no `declare(strict_types=1)`, no arrow functions, no typed properties,
 * no `str_contains()`. Everything version-dependent lives in the files
 * required further down, which are only loaded after the runtime has been
 * checked. This file must stay parseable by PHP 5.4.
 *
 * Deliberately discloses nothing useful to an attacker: booleans, counts and
 * version numbers only. No credentials, no database names, no record
 * contents. Fatal-error detail is the exception — without it a broken
 * deployment is undiagnosable — and it is the site owner's own paths.
 *
 * Safe to leave in place — it doubles as an uptime probe.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// ── Report fatals instead of dying blank ────────────────────────────────────
//
// A missing function, a parse error in a required file, or an exhausted
// memory limit bypasses try/catch entirely: PHP just stops, and the browser
// shows a bare "HTTP ERROR 500" with the reason visible only in a log file
// most shared-hosting users cannot reach. This turns that into an answer.

$buenoHealthDone = false;

register_shutdown_function(function () use (&$buenoHealthDone) {
    if ($buenoHealthDone) {
        return;
    }

    $err = error_get_last();
    $fatal = array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR);
    if ($err === null || !in_array($err['type'], $fatal, true)) {
        return;
    }

    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(503);
    }

    $hint = 'The application could not start.';
    if (strpos($err['message'], 'undefined function') !== false
        || strpos($err['message'], 'Undefined function') !== false
        || strpos($err['message'], 'syntax error') !== false
        || strpos($err['message'], 'Unsupported operand') !== false) {
        $hint = 'This usually means the web server is running a PHP version older than 8.1. '
              . 'Check cPanel > MultiPHP Manager for THIS domain — it is a separate setting '
              . 'from the PHP used by cron and by the deployment script, so migrations can '
              . 'succeed while every web request fails.';
    }

    echo json_encode(array(
        'status'   => 'not ready',
        'checks'   => array(
            'php' => array('version' => PHP_VERSION, 'sufficient' => PHP_VERSION_ID >= 80100),
        ),
        'fatal'    => array(
            'message' => $err['message'],
            'at'      => $err['file'] . ':' . $err['line'],
        ),
        'problems' => array($hint),
        'time'     => gmdate('Y-m-d\TH:i:s\Z'),
    ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
});

// ── PHP runtime ─────────────────────────────────────────────────────────────
//
// Checked before anything is required. The library below uses str_contains(),
// typed properties and other 8.x constructs; loading it on an older runtime is
// an immediate fatal, which is exactly the failure this check must be able to
// describe rather than reproduce.

$phpOk = PHP_VERSION_ID >= 80100;

if (!$phpOk) {
    http_response_code(503);
    $buenoHealthDone = true;
    echo json_encode(array(
        'status' => 'not ready',
        'checks' => array(
            'php' => array('version' => PHP_VERSION, 'sufficient' => false),
        ),
        'problems' => array(
            'This domain is serving PHP ' . PHP_VERSION . '. The application requires 8.1 '
            . 'or newer and cannot start below it, so every endpoint returns a blank 500 '
            . '— including sign-in.',
            'Fix: cPanel > MultiPHP Manager, tick this domain, choose PHP 8.1 or newer '
            . '(8.3 recommended), Apply.',
            'Note: the PHP used by cron jobs and by the deployment script is a different '
            . 'setting. Database migrations can report success while the website stays '
            . 'broken, which is what makes this failure confusing.',
        ),
        'time' => gmdate('Y-m-d\TH:i:s\Z'),
    ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/db.php';

$checks   = array();
$problems = array();
$isDev    = false;

$checks['php'] = array(
    'version'    => PHP_VERSION,
    'sufficient' => true,
);

// ── Which build is actually live? ───────────────────────────────────────────
//
// The deploy artifact is committed, so the published site can lag the code —
// a forgotten rebuild, or a pull that never ran the deployment tasks. Showing
// the commit makes that visible instead of a mystery.
$buildInfo = array('commit' => 'unknown', 'builtAt' => null);
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

$required = array('pdo', 'pdo_mysql', 'mbstring', 'json');
$missing  = array();
foreach ($required as $ext) {
    if (!extension_loaded($ext)) {
        $missing[] = $ext;
    }
}
$checks['extensions'] = array(
    'required' => $required,
    'missing'  => $missing,
);
if ($missing !== array()) {
    $problems[] = 'Missing PHP extension(s): ' . implode(', ', $missing)
        . '. Enable them in cPanel > MultiPHP INI Editor > Extensions.';
}

// ── Environment file ────────────────────────────────────────────────────────

$secretOk  = false;
$envFound  = false;
$dbConfigd = false;
$dbNameSet = false;

try {
    $secret    = Config::get('APP_SECRET');
    $dbNameSet = Config::get('DB_NAME') !== null;
    $envFound  = $secret !== null || $dbNameSet;
    $secretOk  = $secret !== null && strlen($secret) >= 32;
    $dbConfigd = $dbNameSet && Config::get('DB_USER') !== null;
} catch (Throwable $e) {
    // fall through to the reporting below
}

$checks['environment'] = array(
    // Whether a .env was located at all — not where, and not what is in it.
    'file_found'     => $envFound,
    'app_secret_set' => $secretOk,
    'db_configured'  => $dbConfigd,
    'mode'           => $isDev ? 'development' : 'production',
);

if (!$envFound) {
    $problems[] = 'No .env file was found. Create it at /home/<cpanel-user>/.env — see DEPLOYMENT.md.';
} elseif (!$secretOk) {
    $problems[] = 'APP_SECRET is missing or shorter than 32 characters. '
        . 'Generate one with: php -r \'echo bin2hex(random_bytes(32));\'';
}

if ($envFound && !$dbNameSet) {
    $problems[] = 'DB_NAME and DB_USER are not set, so the API would fall back to a local '
        . 'SQLite file rather than MySQL. Add your database credentials to .env.';
}

// ── Database ────────────────────────────────────────────────────────────────

$dbConnected = false;
$driver      = null;
$serverVer   = null;
$tableCount  = 0;
$applied     = 0;
$schemaReady = false;
$pdo         = null;

try {
    $pdo         = Db::conn();
    $dbConnected = true;
    $driver      = Db::driver();
    $serverVer   = (string) $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);

    // Has the schema been created?
    $expected = array('bueno_users', 'bueno_trips', 'bueno_deals', 'bueno_sessions', 'bueno_audit_log');
    $found    = array();
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
        $sql   = Db::upsertSql('bueno_rate_limits', array('bucket', 'hits', 'window_start'), array('bucket'));

        $pdo->prepare($sql)->execute(array($probe, 1, (string) time()));
        // Run it twice: the second pass is the branch that actually exercises
        // the conflict clause.
        $pdo->prepare($sql)->execute(array($probe, 2, (string) time()));
        $pdo->prepare('DELETE FROM bueno_rate_limits WHERE bucket = ?')->execute(array($probe));

        $writeOk = true;
    } catch (Throwable $e) {
        $writeError = $e->getMessage();
        $problems[] = 'The database accepts reads but rejects writes. Sign-in cannot work '
            . 'until this is fixed. The server said: ' . $e->getMessage();
    }
}

$checks['database'] = array(
    'connected'          => $dbConnected,
    'driver'             => $driver,
    'server_version'     => $serverVer,
    'core_tables_found'  => $tableCount,
    'core_tables_total'  => 5,
    'schema_ready'       => $schemaReady,
    'migrations_applied' => $applied,
    'writable'           => $writeOk,
    'write_error'        => $writeError,
);

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

$protections = array(
    'api'        => is_file(__DIR__ . '/.htaccess'),
    'lib'        => is_file(__DIR__ . '/_lib/.htaccess'),
    'migrations' => is_file(__DIR__ . '/migrations/.htaccess'),
);
$checks['protections'] = $protections;

foreach ($protections as $where => $present) {
    if (!$present) {
        $problems[] = "The $where .htaccess is missing from the server. Re-deploy.";
    }
}

// Legacy data files still sitting in a web-served directory.
$legacy = array();
foreach (array('bueno.sqlite', 'bueno_trips_store.json', 'bueno_deals_store.json') as $f) {
    if (is_file(__DIR__ . '/' . $f)) {
        $legacy[] = $f;
    }
}
$checks['legacy_files_present'] = $legacy;
if ($legacy !== array()) {
    $problems[] = 'Legacy data files are still on the server (' . implode(', ', $legacy) . '). '
        . 'Import them, then delete them — nothing reads them any more.';
}

// ── Result ──────────────────────────────────────────────────────────────────

$ready = $problems === array();

http_response_code($ready ? 200 : 503);

$buenoHealthDone = true;

echo json_encode(array(
    'status'   => $ready ? 'ready' : 'not ready',
    'checks'   => $checks,
    'problems' => $problems,
    'time'     => gmdate('Y-m-d\TH:i:s\Z'),
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
