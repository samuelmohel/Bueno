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

$needle = strtolower(trim($from));

line($apply ? 'Consolidating company name' : 'DRY RUN — nothing will be written');
line('  from : "' . $from . '"');
line('  to   : "' . $to . '"');
line();

$counts = [];
$total  = 0;
foreach ($TARGETS as $label => [$table, $column]) {
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE LOWER(TRIM(`$column`)) = ?");
        $stmt->execute([$needle]);
        $n = (int) $stmt->fetchColumn();
    } catch (Throwable $e) {
        line(sprintf('  %-14s could not read (%s)', $label, $e->getMessage()));
        continue;
    }
    $counts[$label] = [$table, $column, $n];
    $total += $n;
    line(sprintf('  %-14s %d', $label, $n));
}

line();
if ($total === 0) {
    line('No records carry that name. Check the spelling with');
    line('scripts/check-consignee-links.php — matching ignores case and');
    line('surrounding spaces, but nothing else.');
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
    foreach ($counts as $label => [$table, $column, $n]) {
        if ($n === 0) continue;
        $stmt = $pdo->prepare("UPDATE `$table` SET `$column` = ? WHERE LOWER(TRIM(`$column`)) = ?");
        $stmt->execute([$to, $needle]);
        line(sprintf('  %-14s %d updated', $label, $stmt->rowCount()));
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
