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
    'bueno_rate_limits', 'bueno_migrations',
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

// ── Records not attached to the company registry ────────────────────────────

heading('Company registry');

try {
    $companies = (int) $pdo->query(
        'SELECT COUNT(*) FROM bueno_companies WHERE mergedIntoId IS NULL'
    )->fetchColumn();
    line('Organisations on file: ' . $companies);

    /*
     * A record with no companyId still matches by name, so nothing is broken
     * — but it is matching on a spelling, which is what the registry exists
     * to stop. These are the rows that would detach if someone renamed the
     * organisation.
     */
    $orphans = 0;
    foreach ([
        'bueno_trips'    => 'company',
        'bueno_deals'    => 'company',
        'bueno_invoices' => 'companyName',
        'bueno_users'    => 'companyName',
    ] as $table => $column) {
        try {
            $where = "companyId IS NULL AND `$column` IS NOT NULL AND `$column` <> ''";
            if ($table === 'bueno_users') {
                $where .= " AND (UPPER(COALESCE(userType,'STAFF')) = 'CUSTOMER'"
                        . " OR UPPER(COALESCE(role,'')) IN ('CUSTOMER','CONSIGNEE'))";
            }
            $n = (int) $pdo->query("SELECT COUNT(*) FROM `$table` WHERE $where")->fetchColumn();
            if ($n > 0) {
                line(sprintf('  %-18s %d record(s) still matched by name only', $table, $n));
                $orphans += $n;
            }
        } catch (Throwable $e) {
            // Table or column absent on an older schema.
        }
    }

    if ($orphans === 0) {
        line('Every customer record is attached to a registered organisation.');
    } else {
        line();
        line('Re-run the backfill to attach them:');
        line('  php apps/web/public/api/_lib/migrate.php up');
    }

    // Organisations whose names are close enough to be worth a look.
    $dupes = $pdo->query(
        'SELECT a.name AS a, b.name AS b
           FROM bueno_companies a
           JOIN bueno_companies b ON b.id > a.id
          WHERE a.mergedIntoId IS NULL AND b.mergedIntoId IS NULL
            AND (a.matchKey LIKE b.matchKey || \'%\' OR b.matchKey LIKE a.matchKey || \'%\')
          LIMIT 20'
    )->fetchAll(PDO::FETCH_ASSOC);

    if ($dupes !== []) {
        line();
        line('Possible duplicates — check whether each pair is one organisation:');
        foreach ($dupes as $d) {
            line(sprintf('  %s  <->  %s', $d['a'], $d['b']));
        }
        line('Merge from the company registry screen, which repoints the records.');
    }
} catch (Throwable $e) {
    line('  could not read: ' . $e->getMessage());
}

// ── The books ───────────────────────────────────────────────────────────────

heading('Ledger');

try {
    $row = $pdo->query(
        "SELECT COALESCE(SUM(l.debit),0) d, COALESCE(SUM(l.credit),0) c
           FROM bueno_journal_lines l
           JOIN bueno_journal_entries e ON e.id = l.entryId
          WHERE e.status = 'POSTED'"
    )->fetch(PDO::FETCH_ASSOC);

    $d = round((float) ($row['d'] ?? 0), 2);
    $c = round((float) ($row['c'] ?? 0), 2);

    $entries  = (int) $pdo->query("SELECT COUNT(*) FROM bueno_journal_entries WHERE status = 'POSTED'")->fetchColumn();
    $accounts = (int) $pdo->query('SELECT COUNT(*) FROM bueno_chart_of_accounts')->fetchColumn();

    line('Accounts in the chart: ' . $accounts);
    line('Posted journal entries: ' . $entries);
    line(sprintf('Total debits:  %18s', number_format($d, 2)));
    line(sprintf('Total credits: %18s', number_format($c, 2)));

    if (abs($d - $c) <= 0.005) {
        line('The ledger balances.');
    } else {
        // Should be impossible: journal.php refuses an unbalanced entry and
        // writes the lines in one transaction. If it happens, say so loudly
        // rather than letting a statement be drawn from it.
        line(sprintf('THE LEDGER DOES NOT BALANCE. Difference: %s', number_format($d - $c, 2)));
        line('Do not rely on any financial statement until this is explained.');
    }
} catch (Throwable $e) {
    line('  could not read: ' . $e->getMessage());
}

// ── Terminals sharing a position ────────────────────────────────────────────

heading('Corridor map');

/*
 * Two terminals at one position make every distance, progress percentage and
 * ETA between them meaningless, and draw a departing train at the wrong
 * siding. Reported rather than corrected here, because the fix is a surveyed
 * coordinate and not a plausible-looking one.
 */
$mapFile = __DIR__ . '/../apps/web/src/components/LiveGpsMap.tsx';
if (is_file($mapFile)) {
    $src = (string) file_get_contents($mapFile);
    preg_match_all(
        "/^\s*(\w+):\s*\{\s*code:\s*'([A-Z0-9]+)',\s*name:\s*'([^']*)'.*?lat:\s*([\d.\-]+),\s*lng:\s*([\d.\-]+)/m",
        $src,
        $m,
        PREG_SET_ORDER
    );

    $positions = [];
    foreach ($m as $hit) {
        $positions[$hit[4] . ',' . $hit[5]][] = ['code' => $hit[2], 'name' => $hit[3]];
    }

    /*
     * Two codes for one place is normal — MNY and MONI are both Moniya yard.
     * Two codes for two DIFFERENT places at one position is the fault, and
     * the display name is what distinguishes them.
     */
    $suspect = [];
    foreach ($positions as $pos => $entries) {
        if (count($entries) < 2) {
            continue;
        }
        $names = array_unique(array_map(static fn($e) => $e['name'], $entries));
        if (count($names) > 1) {
            $suspect[$pos] = $entries;
        }
    }

    if ($suspect === []) {
        line('Every distinct terminal has its own position.');
        line('(Codes that share one, such as MNY and MONI, name the same yard.)');
    } else {
        line('DIFFERENT terminals sharing one position — these need a surveyed coordinate:');
        foreach ($suspect as $pos => $entries) {
            line(sprintf('  %-22s %s', $pos, implode('  |  ', array_map(
                static fn($e) => $e['code'] . ' ' . $e['name'],
                $entries
            ))));
        }
        line();
        line('Any distance, progress percentage or ETA between these is meaningless,');
        line('and a train departing one is drawn at the other. A single GPS reading');
        line('taken standing at each siding fixes it; a plausible guess does not.');
    }
} else {
    line('  map source not found; skipped.');
}

line();
line('Done.');
