<?php
/**
 * Bueno Freight OS — import legacy data into the new database
 *
 * The previous version had no MySQL configured on this deployment, so it fell
 * back to writing into files inside the web-served api directory:
 *
 *   api/bueno.sqlite               the real fallback database
 *   api/bueno_trips_store.json     a redundant mirror of trips
 *   api/bueno_deals_store.json     a redundant mirror of deals
 *
 * Creating a .env with MySQL credentials points the platform at an empty
 * database, so this moves the existing records across first.
 *
 * Usage:
 *   php scripts/import-legacy-data.php --from=/path/to/old/api          # preview
 *   php scripts/import-legacy-data.php --from=/path/to/old/api --apply  # write
 *
 * It is safe to run twice: a record whose id already exists is skipped rather
 * than overwritten, so an interrupted run can simply be repeated.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/apps/web/public/api/_lib/db.php';
require_once $root . '/apps/web/public/api/_lib/migrate.php';

// ── Arguments ───────────────────────────────────────────────────────────────

$options = getopt('', ['from:', 'apply', 'help']);

if (isset($options['help']) || !isset($options['from'])) {
    echo <<<TXT
Import legacy Bueno data into the configured database.

  --from=PATH   Directory holding the old bueno.sqlite and/or *_store.json
                files (the old api/ directory).
  --apply       Actually write. Without it, this only reports what it would do.

Example:
  php scripts/import-legacy-data.php --from=./legacy-api
  php scripts/import-legacy-data.php --from=./legacy-api --apply

TXT;
    exit(isset($options['help']) ? 0 : 1);
}

$sourceDir = rtrim((string) $options['from'], "/\\");
$apply     = isset($options['apply']);

if (!is_dir($sourceDir)) {
    fwrite(STDERR, "ERROR: not a directory: $sourceDir\n");
    exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function heading(string $text): void
{
    echo "\n" . $text . "\n" . str_repeat('-', max(4, strlen($text))) . "\n";
}

/** @return array<int,array<string,mixed>> */
function read_json_store(string $path): array
{
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? array_values(array_filter($decoded, 'is_array')) : [];
}

/** Columns that actually exist on a table in the target database. */
function target_columns(PDO $pdo, string $table): array
{
    static $cache = [];
    if (isset($cache[$table])) {
        return $cache[$table];
    }
    $names = [];
    try {
        if (Db::isMysql()) {
            $stmt = $pdo->prepare(
                'SELECT COLUMN_NAME FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
            );
            $stmt->execute([$table]);
            $names = array_map(static fn($r) => (string) $r['COLUMN_NAME'], $stmt->fetchAll());
        } else {
            foreach ($pdo->query("PRAGMA table_info(`$table`)")->fetchAll() as $r) {
                $names[] = (string) $r['name'];
            }
        }
    } catch (Throwable $e) {
        // Table missing entirely.
    }
    return $cache[$table] = $names;
}

function table_exists(PDO $pdo, string $table): bool
{
    return target_columns($pdo, $table) !== [];
}

/** Ids already present in the target, so a rerun does not duplicate or clobber. */
function existing_ids(PDO $pdo, string $table, string $idColumn): array
{
    if (!table_exists($pdo, $table)) {
        return [];
    }
    try {
        $rows = $pdo->query("SELECT `$idColumn` FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
        return array_flip(array_map('strval', $rows));
    } catch (Throwable $e) {
        return [];
    }
}

// ── Connect and make sure the schema is there ───────────────────────────────

try {
    $pdo = Db::conn();
} catch (Throwable $e) {
    fwrite(STDERR, "ERROR: cannot connect to the target database: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Check that .env has DB_NAME / DB_USER / DB_PASS set.\n");
    exit(1);
}

echo "Target database : " . Db::driver() . "\n";
echo "Legacy source   : $sourceDir\n";
echo "Mode            : " . ($apply ? "APPLY (will write)" : "DRY RUN (no changes)") . "\n";

// Migrations run in both modes. A dry run cannot report anything useful
// against a database with no tables, and the schema has to exist for the
// platform to work regardless — the deploy applies these too. They are
// additive and idempotent, so this is safe to repeat.
$migrator = Migrator::make();
$pending  = $migrator->pending();
if ($pending !== []) {
    heading('Creating the schema');
    echo "  " . count($pending) . " migration(s) pending; applying now so the\n";
    echo "  import has tables to read and write. This is additive: no existing\n";
    echo "  column is dropped or altered.\n\n";
    foreach ($migrator->up() as $done) {
        echo "  applied $done\n";
    }
}

// ── What to import ──────────────────────────────────────────────────────────
//
// The legacy SQLite schema is the same shape as migration 001, because that
// migration was written to adopt it, so most tables copy straight across.

$TABLES = [
    'bueno_users'           => 'id',
    'bueno_wagons'          => 'id',
    'bueno_deals'           => 'id',
    'bueno_trips'           => 'id',
    'bueno_fund_requests'   => 'id',
    'bueno_invoices'        => 'id',
    'bueno_trip_costs'      => 'id',
    'bueno_negotiations'    => 'id',
    'bueno_client_requests' => 'id',
    'bueno_notifications'   => 'id',
    'bueno_gps_logs'        => 'id',
    'bueno_role_permissions' => 'roleKey',
    'bueno_system_settings'  => 'settingKey',
];

$legacySqlite = $sourceDir . '/bueno.sqlite';
$summary      = [];
$totalWritten = 0;
$totalSkipped = 0;

/**
 * Copy rows into the target, keeping only columns the target has and skipping
 * ids that already exist.
 */
function import_rows(PDO $pdo, string $table, string $idColumn, array $rows, bool $apply, array &$summary, int &$totalWritten, int &$totalSkipped): void
{
    if ($rows === []) {
        return;
    }
    if (!table_exists($pdo, $table)) {
        $summary[] = sprintf('  %-24s SKIPPED (table not in target schema)', $table);
        return;
    }

    $targetCols = target_columns($pdo, $table);
    $present    = existing_ids($pdo, $table, $idColumn);

    $written = 0;
    $skipped = 0;

    foreach ($rows as $row) {
        $id = (string) ($row[$idColumn] ?? '');
        if ($id === '') {
            $skipped++;
            continue;
        }
        if (isset($present[$id])) {
            $skipped++;   // already there; a rerun must not clobber newer data
            continue;
        }

        // Keep only columns the new schema actually has. Legacy rows carry
        // fields the new tables do not define, and vice versa.
        $data = [];
        foreach ($row as $col => $value) {
            if (!in_array($col, $targetCols, true)) {
                continue;
            }
            // Nested structures were stored as JSON text; re-encode anything
            // that arrived already decoded.
            $data[$col] = is_array($value) ? json_encode($value) : $value;
        }
        if ($data === []) {
            $skipped++;
            continue;
        }
        $data[$idColumn] = $id;

        // Bookkeeping columns the legacy rows predate.
        if (in_array('updated_at', $targetCols, true) && !isset($data['updated_at'])) {
            $data['updated_at'] = gmdate('Y-m-d\TH:i:s\Z');
        }

        if ($apply) {
            $cols   = array_keys($data);
            $names  = implode(', ', array_map(static fn($c) => "`$c`", $cols));
            $marks  = implode(', ', array_fill(0, count($cols), '?'));
            try {
                $pdo->prepare("INSERT INTO `$table` ($names) VALUES ($marks)")
                    ->execute(array_values($data));
            } catch (Throwable $e) {
                $summary[] = sprintf('  %-24s row %s FAILED: %s', $table, $id, $e->getMessage());
                $skipped++;
                continue;
            }
        }
        $written++;
    }

    $totalWritten += $written;
    $totalSkipped += $skipped;
    $summary[] = sprintf(
        '  %-24s %4d to import, %4d already present or unusable',
        $table,
        $written,
        $skipped
    );
}

// ── Source 1: the legacy SQLite fallback database ───────────────────────────

heading('Reading legacy data');

if (is_file($legacySqlite)) {
    echo "  found bueno.sqlite\n";
    try {
        $legacy = new PDO('sqlite:' . $legacySqlite, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        foreach ($TABLES as $table => $idColumn) {
            try {
                $rows = $legacy->query("SELECT * FROM `$table`")->fetchAll();
            } catch (Throwable $e) {
                continue; // table absent in the legacy file
            }
            import_rows($pdo, $table, $idColumn, $rows, $apply, $summary, $totalWritten, $totalSkipped);
        }
    } catch (Throwable $e) {
        fwrite(STDERR, "  WARNING: could not read bueno.sqlite: " . $e->getMessage() . "\n");
    }
} else {
    echo "  no bueno.sqlite in $sourceDir\n";
}

// ── Source 2: the JSON mirrors ──────────────────────────────────────────────
//
// These duplicate trips and deals. Anything already imported from SQLite is
// skipped by id, so this only fills gaps — which matters when the JSON mirror
// is the only copy that survived.

foreach ([
    'bueno_trips_store.json' => ['bueno_trips', 'id'],
    'bueno_deals_store.json' => ['bueno_deals', 'id'],
] as $file => [$table, $idColumn]) {
    $path = $sourceDir . '/' . $file;
    if (!is_file($path)) {
        continue;
    }
    $rows = read_json_store($path);
    echo "  found $file (" . count($rows) . " record(s))\n";
    import_rows($pdo, $table, $idColumn, $rows, $apply, $summary, $totalWritten, $totalSkipped);
}

// ── Report ──────────────────────────────────────────────────────────────────

heading('Per table');
foreach ($summary as $line) {
    echo $line . "\n";
}

// ── Credentials ─────────────────────────────────────────────────────────────
//
// Legacy user rows carry a plaintext PIN. Hash it so the imported accounts can
// sign in to the new platform, and flag well-known defaults for mandatory
// reset — exactly what migration 003 does for an existing MySQL deployment.

if ($apply && table_exists($pdo, 'bueno_users')) {
    heading('Credentials');
    $run = require $root . '/apps/web/public/api/migrations/003_hash_existing_credentials.php';
    $run($pdo);
}

heading('Result');
if ($apply) {
    printf("  imported %d record(s); %d skipped as already present.\n", $totalWritten, $totalSkipped);
    echo "\n  Next:\n";
    echo "    1. Sign in and confirm your trips, deals and users are there.\n";
    echo "    2. DELETE the legacy files from the live api directory:\n";
    echo "         bueno.sqlite, bueno_*_store.json\n";
    echo "       They were downloadable over HTTP and are no longer read.\n";
} else {
    printf("  would import %d record(s); %d already present or unusable.\n", $totalWritten, $totalSkipped);
    echo "\n  Nothing was written. Re-run with --apply to perform the import.\n";
}
echo "\n";
