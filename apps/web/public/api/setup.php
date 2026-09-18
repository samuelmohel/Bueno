<?php
/**
 * Bueno Freight OS — browser-based setup runner
 *
 *   GET  /api/setup.php   a small form
 *   POST /api/setup.php   run migrations (and optionally import legacy data)
 *
 * Many cPanel plans ship with Terminal disabled and SSH limited to key
 * management, which leaves no way to run the migration command. This does the
 * same job from a browser.
 *
 * It is INERT unless SETUP_TOKEN is set in .env. With no token configured it
 * refuses every request, so it cannot be used against a normal deployment even
 * though the file is present. The token is compared in constant time, attempts
 * are rate limited and audited, and the page tells you to remove the token
 * once you are done.
 *
 * To use it:
 *   1. Add a line to /home/<cpanel-user>/.env, e.g.
 *        SETUP_TOKEN=<paste a long random string>
 *   2. Visit /api/setup.php and paste the same string.
 *   3. Delete the SETUP_TOKEN line afterwards.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/http.php';
require_once __DIR__ . '/_lib/ratelimit.php';
require_once __DIR__ . '/_lib/migrate.php';

// ── Inert unless explicitly enabled ─────────────────────────────────────────

$configured = Config::get('SETUP_TOKEN');

function page(string $bodyHtml, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bueno Freight OS — Setup</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; font:14px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;
         background:#f8fafc; color:#0f172a; padding:24px; }
  .card { max-width:720px; margin:32px auto; background:#fff; border:1px solid #e2e8f0;
          border-radius:16px; padding:28px; box-shadow:0 4px 12px rgba(0,0,0,.04); }
  h1 { font-size:20px; margin:0 0 4px; }
  .sub { color:#64748b; font-size:13px; margin:0 0 20px; }
  label { display:block; font-weight:700; font-size:12px; margin:16px 0 6px; }
  input[type=password], input[type=text] { width:100%; box-sizing:border-box; padding:10px 12px;
          border:1px solid #cbd5e1; border-radius:10px; font:13px monospace; }
  button { margin-top:18px; background:#62BC37; color:#fff; border:0; border-radius:10px;
           padding:12px 20px; font-weight:800; font-size:13px; cursor:pointer; }
  button:hover { background:#52A02D; }
  pre { background:#0f172a; color:#e2e8f0; padding:16px; border-radius:12px;
        overflow-x:auto; font-size:12px; line-height:1.5; }
  .ok { background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; padding:12px 14px; border-radius:10px; }
  .bad { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; padding:12px 14px; border-radius:10px; }
  .warn { background:#fffbeb; border:1px solid #fde68a; color:#92400e; padding:12px 14px; border-radius:10px; }
  code { background:#f1f5f9; padding:1px 5px; border-radius:4px; font-size:12px; }
  label.check { font-weight:500; font-size:13px; display:flex; gap:8px; align-items:flex-start; }
</style></head><body><div class="card">$bodyHtml</div></body></html>
HTML;
    exit;
}

if ($configured === null || strlen($configured) < 16) {
    page(
        '<h1>Setup is disabled</h1>'
        . '<p class="sub">This page does nothing unless it is explicitly enabled.</p>'
        . '<div class="warn">To enable it, add a line to your <code>.env</code> file:<br><br>'
        . '<code>SETUP_TOKEN=a-long-random-string-at-least-16-characters</code><br><br>'
        . 'Then reload this page and paste the same value. '
        . '<strong>Remove the line once you have finished.</strong></div>',
        403
    );
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// ── Form ────────────────────────────────────────────────────────────────────

if ($method !== 'POST') {
    page(
        '<h1>Bueno Freight OS — Setup</h1>'
        . '<p class="sub">Creates the database schema. Safe to run more than once: '
        . 'migrations already applied are skipped.</p>'
        . '<form method="post">'
        . '<label for="t">Setup token</label>'
        . '<input id="t" name="token" type="password" autocomplete="off" '
        . 'placeholder="the SETUP_TOKEN value from your .env" required autofocus>'
        . '<label class="check" style="margin-top:16px;">'
        . '<input type="checkbox" name="import" value="1">'
        . '<span>Also import legacy data from <code>bueno.sqlite</code> and '
        . '<code>bueno_*_store.json</code> in this folder, if present. '
        . 'Records that already exist are skipped.</span></label>'
        . '<button type="submit">Run setup</button>'
        . '</form>'
    );
}

// ── Verify ──────────────────────────────────────────────────────────────────

RateLimit::enforce('setup:' . Http::clientIp(), 10, 900);

$supplied = (string) ($_POST['token'] ?? '');

if (!hash_equals($configured, $supplied)) {
    error_log('[bueno][setup] rejected token from ' . Http::clientIp());
    page(
        '<h1>Incorrect token</h1>'
        . '<div class="bad">That does not match <code>SETUP_TOKEN</code> in your .env file.</div>'
        . '<p class="sub" style="margin-top:16px;"><a href="setup.php">Try again</a></p>',
        403
    );
}

// ── Run ─────────────────────────────────────────────────────────────────────

$output = [];
$failed = false;

try {
    $pdo    = Db::conn();
    $driver = Db::driver();

    $output[] = 'Database driver : ' . $driver;

    if ($driver === 'sqlite') {
        $output[] = '';
        $output[] = '!! WARNING: connected to SQLite, not MySQL.';
        $output[] = '   Tables will be created in a local file, NOT in your cPanel database,';
        $output[] = '   and will not appear in phpMyAdmin.';
        $output[] = '   Check that DB_NAME, DB_USER and DB_PASS are all set in .env, and that';
        $output[] = '   the user is assigned to the database in cPanel > MySQL Databases.';
    }

    $output[] = '';
    $output[] = '--- Migrations ---';

    $migrator = Migrator::make();
    $before   = $migrator->status();
    $output[] = 'Pending before  : ' . ($before['pending'] === [] ? '(none)' : implode(', ', $before['pending']));

    $applied = $migrator->up();
    if ($applied === []) {
        $output[] = 'Nothing to apply; schema already up to date.';
    } else {
        foreach ($applied as $name) {
            $output[] = 'applied  ' . $name;
        }
    }

    $after    = $migrator->status();
    $output[] = 'Applied total   : ' . $after['applied'];
    $output[] = 'Pending after   : ' . ($after['pending'] === [] ? '(none)' : implode(', ', $after['pending']));

    // ── Optional legacy import ──────────────────────────────────────────────

    if (($_POST['import'] ?? '') === '1') {
        $output[] = '';
        $output[] = '--- Legacy data import ---';

        $imported = 0;
        $skipped  = 0;

        $tables = [
            'bueno_users' => 'id', 'bueno_wagons' => 'id', 'bueno_deals' => 'id',
            'bueno_trips' => 'id', 'bueno_fund_requests' => 'id', 'bueno_invoices' => 'id',
            'bueno_trip_costs' => 'id', 'bueno_negotiations' => 'id',
            'bueno_client_requests' => 'id', 'bueno_notifications' => 'id',
            'bueno_role_permissions' => 'roleKey', 'bueno_system_settings' => 'settingKey',
        ];

        $columnsOf = static function (string $table) use ($pdo): array {
            try {
                if (Db::isMysql()) {
                    $s = $pdo->prepare('SELECT COLUMN_NAME FROM information_schema.COLUMNS
                                         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?');
                    $s->execute([$table]);
                    return array_map(static fn($r) => (string) $r['COLUMN_NAME'], $s->fetchAll());
                }
                return array_map(
                    static fn($r) => (string) $r['name'],
                    $pdo->query("PRAGMA table_info(`$table`)")->fetchAll()
                );
            } catch (Throwable $e) {
                return [];
            }
        };

        $insertRows = static function (string $table, string $idCol, array $rows)
            use ($pdo, $columnsOf, &$imported, &$skipped, &$output): void {
            if ($rows === []) return;
            $cols = $columnsOf($table);
            if ($cols === []) return;

            $have = [];
            try {
                foreach ($pdo->query("SELECT `$idCol` FROM `$table`")->fetchAll(PDO::FETCH_COLUMN) as $v) {
                    $have[(string) $v] = true;
                }
            } catch (Throwable $e) {}

            $n = 0;
            foreach ($rows as $row) {
                $id = (string) ($row[$idCol] ?? '');
                if ($id === '' || isset($have[$id])) { $skipped++; continue; }

                $data = [];
                foreach ($row as $k => $v) {
                    if (in_array($k, $cols, true)) {
                        $data[$k] = is_array($v) ? json_encode($v) : $v;
                    }
                }
                if ($data === []) { $skipped++; continue; }
                $data[$idCol] = $id;

                try {
                    $names = implode(', ', array_map(static fn($c) => "`$c`", array_keys($data)));
                    $marks = implode(', ', array_fill(0, count($data), '?'));
                    $pdo->prepare("INSERT INTO `$table` ($names) VALUES ($marks)")
                        ->execute(array_values($data));
                    $imported++; $n++;
                } catch (Throwable $e) {
                    $skipped++;
                }
            }
            if ($n > 0) $output[] = sprintf('  %-24s %d imported', $table, $n);
        };

        $sqlitePath = __DIR__ . '/bueno.sqlite';
        if (is_file($sqlitePath)) {
            $output[] = 'Reading bueno.sqlite';
            try {
                $legacy = new PDO('sqlite:' . $sqlitePath, null, null, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ]);
                foreach ($tables as $table => $idCol) {
                    try {
                        $insertRows($table, $idCol, $legacy->query("SELECT * FROM `$table`")->fetchAll());
                    } catch (Throwable $e) {}
                }
            } catch (Throwable $e) {
                $output[] = '  could not read bueno.sqlite: ' . $e->getMessage();
            }
        } else {
            $output[] = 'No bueno.sqlite in this folder.';
        }

        foreach (['bueno_trips_store.json' => 'bueno_trips',
                  'bueno_deals_store.json' => 'bueno_deals'] as $file => $table) {
            $path = __DIR__ . '/' . $file;
            if (!is_file($path)) continue;
            $decoded = json_decode((string) file_get_contents($path), true);
            if (is_array($decoded)) {
                $output[] = 'Reading ' . $file . ' (' . count($decoded) . ' record(s))';
                $insertRows($table, 'id', array_values(array_filter($decoded, 'is_array')));
            }
        }

        // Hash any plaintext PINs the imported accounts carry.
        try {
            $run = require __DIR__ . '/migrations/003_hash_existing_credentials.php';
            $run($pdo);
            $output[] = 'Credentials hashed for imported accounts.';
        } catch (Throwable $e) {
            $output[] = 'Credential hashing failed: ' . $e->getMessage();
        }

        $output[] = sprintf('Imported %d record(s); %d already present or unusable.', $imported, $skipped);
    }
} catch (Throwable $e) {
    $failed   = true;
    $output[] = '';
    $output[] = 'ERROR: ' . $e->getMessage();
}

$log = htmlspecialchars(implode("\n", $output), ENT_QUOTES, 'UTF-8');

page(
    '<h1>' . ($failed ? 'Setup did not complete' : 'Setup finished') . '</h1>'
    . ($failed
        ? '<div class="bad">Something failed. The output below says what.</div>'
        : '<div class="ok">Schema is up to date. Check phpMyAdmin — you should now see the '
          . '<code>bueno_</code> tables.</div>')
    . "<pre>$log</pre>"
    . '<div class="warn"><strong>Now remove <code>SETUP_TOKEN</code> from your .env file.</strong><br>'
    . 'Leaving it in place keeps this page usable by anyone who learns the token.</div>'
    . '<p class="sub" style="margin-top:16px;">'
    . '<a href="health.php">View the health check</a> &middot; '
    . '<a href="setup.php">Run again</a></p>',
    $failed ? 500 : 200
);
