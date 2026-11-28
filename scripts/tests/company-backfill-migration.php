<?php
/**
 * Migration 011 — company registry backfill
 *
 * Runs the migration against a database carrying the kind of mess it will
 * actually meet: one organisation keyed four different ways, a customer whose
 * account name differs from the name on their trips, a trip belonging to an
 * organisation with no portal account, and two genuinely different companies
 * whose names look similar.
 *
 * The failure that matters most here is not under-merging — that leaves a
 * customer's portal short, which is visible and repairable with a merge. It
 * is over-merging, which shows one customer another's freight. Both are
 * asserted.
 *
 * Usage (its own empty database):
 *   BUENO_ENV_FILE=/path/to/scratch.env php scripts/tests/company-backfill-migration.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("CLI only.\n");
}

require_once __DIR__ . '/../../apps/web/public/api/_lib/db.php';
require_once __DIR__ . '/../../apps/web/public/api/_lib/migrate.php';

$pass = 0;
$fail = 0;

function t(string $name, bool $cond, string $detail = ''): void
{
    global $pass, $fail;
    if ($cond) {
        $pass++;
        echo "  [PASS] {$name}" . PHP_EOL;
    } else {
        $fail++;
        echo "  [FAIL] {$name}" . ($detail !== '' ? " ({$detail})" : '') . PHP_EOL;
    }
}

$pdo = Db::conn();
$mig = Migrator::make();

// ── Bring the schema up to 009, the state before the registry existed ──────

echo PHP_EOL . '=== Migrating to 009 (pre-registry) ===' . PHP_EOL;
$mig->up('009_account_invitations');

$now = gmdate('Y-m-d\TH:i:s\Z');

// ── The mess ────────────────────────────────────────────────────────────────

echo PHP_EOL . '=== Seeding a realistic set of legacy records ===' . PHP_EOL;

$u = $pdo->prepare(
    'INSERT INTO bueno_users (id,fullName,email,role,userType,companyName,status,password_hash,must_change_credentials,pin)
     VALUES (?,?,?,?,?,?,?,?,0,"")'
);
// One organisation, two accounts, two spellings.
$u->execute(['usr_hbm1', 'HBM Desk', 'desk1@hbm.ng', 'CONSIGNEE', 'CUSTOMER', 'HBM Nig Plc', 'ACTIVE', 'x']);
$u->execute(['usr_hbm2', 'HBM Ops',  'ops@hbm.ng',   'CONSIGNEE', 'CUSTOMER', 'HBM Nig. PLC ', 'ACTIVE', 'x']);
// A genuinely different organisation with a similar name.
$u->execute(['usr_hbs',  'HBS Desk', 'desk@hbs.ng',  'CONSIGNEE', 'CUSTOMER', 'HBS Steel Ltd', 'ACTIVE', 'x']);
// Staff, who must not end up scoped to a company.
$u->execute(['usr_staff','Ops Lead', 'ops@bueno.ng', 'HEAD_OF_OPERATIONS', 'STAFF', 'Bueno Logistics', 'ACTIVE', 'x']);
$u->execute(['usr_cargo','Siding',   'cargo@bueno.ng','CARGO_OFFICER', 'STAFF', null, 'ACTIVE', 'x']);

$t = $pdo->prepare(
    'INSERT INTO bueno_trips (id,tripId,company,origin,destination,status) VALUES (?,?,?,?,?,?)'
);
// Same organisation, two more spellings again.
$t->execute(['trp_1', 'TRP-1', 'HBM Nig Plc',          'PAPA', 'MNY', 'COMPLETED']);
$t->execute(['trp_2', 'TRP-2', 'H.B.M Nig Plc (HBM)',  'PAPA', 'MNY', 'IN_TRANSIT']);
$t->execute(['trp_3', 'TRP-3', '  hbm nig plc  ',      'PAPA', 'MNY', 'LOADING']);
// The similar-but-different one.
$t->execute(['trp_4', 'TRP-4', 'HBS Steel Ltd',        'PAPA', 'MNY', 'LOADING']);
// An organisation with no portal account at all.
$t->execute(['trp_5', 'TRP-5', 'Orphan Quarries Ltd',  'EWK',  'DGB', 'COMPLETED']);

$d = $pdo->prepare('INSERT INTO bueno_deals (id,dealNumber,company,companyName,status) VALUES (?,?,?,?,?)');
$d->execute(['deal_1', 'DEAL-1', 'HBM Nig Plc', 'HBM Nig Plc', 'APPROVED']);

$i = $pdo->prepare('INSERT INTO bueno_invoices (id,invoiceNumber,companyName,status) VALUES (?,?,?,?)');
$i->execute(['inv_1', 'INV-1', 'HBM NIG PLC', 'ISSUED']);

echo '  seeded 5 accounts, 5 trips, 1 deal, 1 invoice' . PHP_EOL;

/*
 * Bulk rows, because the first version of this migration was fast only on an
 * empty database.
 *
 * It issued one UPDATE per row, and on MySQL the migrator runs without a
 * transaction, so every row became its own committed write with its own disk
 * flush. That is instantaneous against a handful of fixtures and minutes to
 * hours against a real database — which is how it timed out a cPanel deploy
 * part-way through, leaving the schema mid-migration and the deploy reporting
 * nothing at all.
 *
 * Volume is the only thing that catches it, so the fixtures carry some.
 */
$BULK = 4000;
$pdo->beginTransaction();
$bt = $pdo->prepare('INSERT INTO bueno_trips (id,tripId,company,origin,destination,status) VALUES (?,?,?,?,?,?)');
for ($i = 0; $i < $BULK; $i++) {
    $base = 'Bulk Consignee ' . ($i % 25) . ' Nig Plc';
    // Four spellings of each, as real data has.
    $name = [$base, strtoupper($base), '  ' . $base . ' ', str_replace('Nig Plc', 'Nig. PLC', $base)][$i % 4];
    $bt->execute(['bulk_trp_' . $i, 'BULK-' . $i, $name, 'PAPA', 'MNY', 'COMPLETED']);
}
$pdo->commit();
echo '  seeded ' . $BULK . ' further trips across 25 organisations' . PHP_EOL;

// ── Apply the registry ──────────────────────────────────────────────────────

echo PHP_EOL . '=== Applying 010 and 011 ===' . PHP_EOL;
$started = microtime(true);
$mig->up();
$elapsed = microtime(true) - $started;

// ── What should have happened ───────────────────────────────────────────────

echo PHP_EOL . '=== It finishes fast enough to survive a deploy timeout ===' . PHP_EOL;

printf("  %d records migrated in %.2f seconds%s", $BULK + 7, $elapsed, PHP_EOL);
t('the backfill completes in well under a deploy timeout', $elapsed < 15,
    sprintf('took %.1fs — a cPanel deploy would be killed part-way', $elapsed));

$bulkLinked = (int) $pdo->query(
    "SELECT COUNT(*) FROM bueno_trips WHERE id LIKE 'bulk_trp_%' AND companyId IS NOT NULL"
)->fetchColumn();
t('every bulk record was linked', $bulkLinked === $BULK,
    "{$bulkLinked} of {$BULK}");

$bulkCompanies = (int) $pdo->query(
    "SELECT COUNT(DISTINCT companyId) FROM bueno_trips WHERE id LIKE 'bulk_trp_%'"
)->fetchColumn();
t('the four spellings of each folded to one organisation', $bulkCompanies === 25,
    "{$bulkCompanies} companies for 25 organisations");

echo PHP_EOL . '=== One organisation, however it was spelled ===' . PHP_EOL;

$idOf = static function (string $table, string $id) use ($pdo): ?string {
    $s = $pdo->prepare("SELECT companyId FROM `$table` WHERE id = ?");
    $s->execute([$id]);
    $v = $s->fetchColumn();
    return $v === false || $v === null ? null : (string) $v;
};

$hbm = $idOf('bueno_users', 'usr_hbm1');
t('the first HBM account has a company', $hbm !== null);
t('the second spelling is the same company', $idOf('bueno_users', 'usr_hbm2') === $hbm,
    'got ' . var_export($idOf('bueno_users', 'usr_hbm2'), true));

foreach (['trp_1', 'trp_2', 'trp_3'] as $trip) {
    t("{$trip} is attached to the same company", $idOf('bueno_trips', $trip) === $hbm,
        'got ' . var_export($idOf('bueno_trips', $trip), true));
}
t('the deal is attached to it', $idOf('bueno_deals', 'deal_1') === $hbm);
t('the invoice is attached to it', $idOf('bueno_invoices', 'inv_1') === $hbm);

echo PHP_EOL . '=== A similar name is NOT the same organisation ===' . PHP_EOL;

$hbs = $idOf('bueno_users', 'usr_hbs');
t('HBS Steel has its own company', $hbs !== null && $hbs !== $hbm,
    "hbs={$hbs} hbm={$hbm}");
t('and its trip went with it', $idOf('bueno_trips', 'trp_4') === $hbs);

echo PHP_EOL . '=== An organisation with no account still gets one ===' . PHP_EOL;

$orphan = $idOf('bueno_trips', 'trp_5');
t('the orphan trip is attached to a company', $orphan !== null);
t('which is nobody else\'s', $orphan !== $hbm && $orphan !== $hbs);

echo PHP_EOL . '=== Staff are not scoped to a company ===' . PHP_EOL;

t('an internal account gets no company', $idOf('bueno_users', 'usr_staff') === null,
    'got ' . var_export($idOf('bueno_users', 'usr_staff'), true));
t('nor does a cargo officer', $idOf('bueno_users', 'usr_cargo') === null);

echo PHP_EOL . '=== The registry itself ===' . PHP_EOL;

// The bulk fixtures above exist to time the migration, not to be reasoned
// about here; this section is about the careful mess seeded earlier.
$companies = $pdo->query(
    "SELECT id, name, matchKey FROM bueno_companies
      WHERE name NOT LIKE 'Bulk Consignee%' ORDER BY name"
)->fetchAll(PDO::FETCH_ASSOC);
t('exactly three organisations were registered from the mess', count($companies) === 3,
    count($companies) . ' found: ' . implode(', ', array_column($companies, 'name')));

$keys = array_column($companies, 'matchKey');
t('no two share a match key', count($keys) === count(array_unique($keys)));

$hbmRow = null;
foreach ($companies as $c) {
    if ($c['id'] === $hbm) $hbmRow = $c;
}
t('the longest spelling became the display name',
    $hbmRow !== null && $hbmRow['name'] === 'H.B.M Nig Plc (HBM)',
    'got ' . var_export($hbmRow['name'] ?? null, true));

echo PHP_EOL . '=== Names were not rewritten ===' . PHP_EOL;

$s = $pdo->query("SELECT company FROM bueno_trips WHERE id = 'trp_3'")->fetchColumn();
t('the original spelling is left on the record', $s === '  hbm nig plc  ',
    'got ' . var_export($s, true));

echo PHP_EOL . '=== Re-running is harmless ===' . PHP_EOL;

$before = (int) $pdo->query('SELECT COUNT(*) FROM bueno_companies')->fetchColumn();
$fn = require __DIR__ . '/../../apps/web/public/api/migrations/011_backfill_company_ids.php';
$fn($pdo);
$after = (int) $pdo->query('SELECT COUNT(*) FROM bueno_companies')->fetchColumn();
t('no duplicate companies on a second run', $before === $after, "{$before} -> {$after}");

echo PHP_EOL;
if ($fail === 0) {
    echo "All {$pass} backfill assertions passed." . PHP_EOL . PHP_EOL;
    exit(0);
}
echo "{$fail} of " . ($pass + $fail) . " assertions FAILED." . PHP_EOL . PHP_EOL;
exit(1);
