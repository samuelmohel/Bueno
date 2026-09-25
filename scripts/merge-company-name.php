<?php
/**
 * Bueno Freight OS — consolidate one company name onto another
 *
 *   php scripts/merge-company-name.php --from="OLD NAME" --to="NEW NAME"
 *   php scripts/merge-company-name.php --from="OLD NAME" --to="NEW NAME" --apply
 *
 * A consignee is joined to their work by company name, so the same customer
 * recorded under two spellings is two customers as far as the system is
 * concerned: one account matches one spelling, and the rest of their history
 * is invisible to them with nothing on screen to say so.
 *
 * This rewrites every record carrying one name to carry another, across trips,
 * deals, invoices and negotiations.
 *
 * Reports what it would change and writes nothing unless --apply is given.
 * With --apply it runs in a transaction: either every table is updated or none
 * is, so a failure halfway cannot leave a customer's history split across two
 * names in a new way.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/apps/web/public/api/_lib/db.php';
require_once __DIR__ . '/_company_names.php';

function line(string $t = ''): void { echo $t . PHP_EOL; }



// ── Arguments ───────────────────────────────────────────────────────────────

$from = null;
$to   = null;
$apply = false;

foreach (array_slice($argv, 1) as $arg) {
    if ($arg === '--apply') { $apply = true; continue; }
    if (str_starts_with($arg, '--from=')) { $from = substr($arg, 7); continue; }
    if (str_starts_with($arg, '--to='))   { $to   = substr($arg, 5); continue; }
}

if ($from === null || $to === null || trim($from) === '' || trim($to) === '') {
    line('Usage:');
    line('  php scripts/merge-company-name.php --from="OLD NAME" --to="NEW NAME" [--apply]');
    line();
    line('Run scripts/check-consignee-links.php first to see the exact names in use.');
    exit(1);
}

if (strtolower(trim($from)) === strtolower(trim($to))) {
    line('Nothing to do: those are already the same name.');
    exit(0);
}

// ── Where a company name is stored ──────────────────────────────────────────

$TARGETS = [
    'trips'        => ['bueno_trips',        'company'],
    'deals'        => ['bueno_deals',        'company'],
    'invoices'     => ['bueno_invoices',     'companyName'],
    'negotiations' => ['bueno_negotiations', 'companyName'],
    // The account itself, so a consignee already provisioned under the old
    // spelling follows the records rather than being orphaned by this.
    'accounts'     => ['bueno_users',        'companyName'],
];

try {
    $pdo = Db::conn();
} catch (Throwable $e) {
    line('CANNOT CONNECT: ' . $e->getMessage());
    exit(1);
}

$needle = company_key($from);

line($apply ? 'Consolidating company name' : 'DRY RUN — nothing will be written');
line('  from : "' . $from . '"');
line('  to   : "' . $to . '"');
line();

$counts = [];
$total  = 0;
foreach ($TARGETS as $label => [$table, $column]) {
    try {
        $variants = [];
        foreach (distinct_company_names($pdo, [$label => [$table, $column]]) as $value => $counts) {
            if (company_key($value) === $needle) {
                $variants[$value] = (int) ($counts[$label] ?? 0);
            }
        }
    } catch (Throwable $e) {
        line(sprintf('  %-14s could not read (%s)', $label, $e->getMessage()));
        continue;
    }
    $n = array_sum($variants);
    $counts[$label] = [$table, $column, $variants];
    $total += $n;
    line(sprintf('  %-14s %d', $label, $n));

    // Name each stored spelling that matched, so it is clear what is moving.
    foreach ($variants as $value => $count) {
        if ($value !== $to) {
            line(sprintf('                   from "%s" (%d)', $value, $count));
        }
    }
}

line();
if ($total === 0) {
    // A dead end is not an answer. Show every company name that IS stored, so
    // the exact one can be copied, with invisible characters named.
    line('Nothing carries that name. These are the company names actually stored:');
    line();

    $all = distinct_company_names($pdo, $TARGETS);
    if ($all === []) {
        line('  (none — there are no records with a company name at all)');
    }
    foreach ($all as $value => $counts) {
        $parts = [];
        foreach ($counts as $label => $n) {
            $parts[] = "$label: $n";
        }
        line('  "' . reveal($value) . '"');
        line('      ' . implode(',  ', $parts));
    }

    line();
    line('Copy one of the names above into --from exactly as it reads, ignoring');
    line('the [n chars] note and any <MARKER>. Matching ignores case and all');
    line('whitespace differences, so the markers do not need reproducing.');
    exit(0);
}

if (!$apply) {
    line($total . ' record(s) would be rewritten.');
    line();
    line('Re-run with --apply to do it.');
    exit(0);
}

// ── Apply ───────────────────────────────────────────────────────────────────

$pdo->beginTransaction();
try {
    foreach ($counts as $label => [$table, $column, $variants]) {
        if ($variants === []) continue;
        $moved = 0;
        // Each stored spelling is updated by exact value, so only rows that
        // genuinely carry one of the matched names are touched.
        $stmt = $pdo->prepare("UPDATE `$table` SET `$column` = ? WHERE `$column` = ?");
        foreach (array_keys($variants) as $value) {
            if ($value === $to) continue;
            $stmt->execute([$to, $value]);
            $moved += $stmt->rowCount();
        }
        line(sprintf('  %-14s %d updated', $label, $moved));
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    line();
    line('FAILED — nothing was changed: ' . $e->getMessage());
    exit(1);
}

line();
line('Done. Run scripts/check-consignee-links.php to confirm the customer now');
line('sees the whole of their history.');
