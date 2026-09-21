<?php
/**
 * Verifies that migration 006 resolves duplicate sign-in addresses without
 * destroying an account, and then makes the situation impossible.
 *
 * Migration 005 created this problem in production: it rewrote both
 * '%lafarge%' and '%dangote%' onto 'logistics@hbm.ng', so two real accounts
 * ended up sharing one address. Authentication takes the first matching row,
 * which silently locks the other person out.
 *
 * Tested explicitly because the wrong repair — deleting a duplicate — would
 * orphan that account's trips, deals and audit history.
 */

declare(strict_types=1);

$root = dirname(__DIR__, 2);
require_once $root . '/apps/web/public/api/_lib/migrate.php';

$failures = 0;

function check(string $label, bool $ok): void
{
    global $failures;
    if (!$ok) {
        $failures++;
    }
    printf("  [%s] %s\n", $ok ? 'PASS' : 'FAIL', $label);
}

$pdo = Db::conn();

// ── Reach the state the live database is in: migrated through 005, with the
//    duplicate that migration created still present. ────────────────────────

$migrator = Migrator::make();
$migrator->up('005_email_log_and_rebrand_cleanup');

$insert = $pdo->prepare(
    'INSERT INTO bueno_users (id, fullName, email, role, userType, status, password_hash, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

// Two accounts on one address. The second has no usable credential and has
// never signed in, so it is the one that should be moved aside.
$insert->execute(['usr_a', 'Huaxin Logistics Desk', 'logistics@hbm.ng', 'CUSTOMER', 'CUSTOMER', 'ACTIVE', password_hash('realpassword', PASSWORD_BCRYPT), '2026-09-20T09:00:00Z']);
$insert->execute(['usr_b', 'Legacy Dangote Desk',   'logistics@hbm.ng', 'CUSTOMER', 'CUSTOMER', 'ACTIVE', '', null]);
// A third, on its own address, must be left completely alone.
$insert->execute(['usr_c', 'APMT Rail Desk', 'rail@apmt.com', 'CUSTOMER', 'CUSTOMER', 'ACTIVE', password_hash('another', PASSWORD_BCRYPT), '2026-09-19T08:00:00Z']);
// Two accounts with no address recorded. A unique index allows any number of
// NULLs but only one empty string, so without normalisation these two alone
// would abort the migration and take the deployment down.
$insert->execute(['usr_e', 'Blank One', '', 'CARGO_OFFICER', 'STAFF', 'ACTIVE', '', null]);
$insert->execute(['usr_f', 'Blank Two', '', 'CARGO_OFFICER', 'STAFF', 'ACTIVE', '', null]);
// Same identity, different casing — sign-in compares case-insensitively.
$insert->execute(['usr_g', 'Mixed Case Desk', 'Cargo@Maersk.com', 'CUSTOMER', 'CUSTOMER', 'ACTIVE', password_hash('third', PASSWORD_BCRYPT), '2026-09-18T08:00:00Z']);
$insert->execute(['usr_h', 'Lower Case Desk', 'cargo@maersk.com', 'CUSTOMER', 'CUSTOMER', 'ACTIVE', '', null]);

echo "\nBefore migration 006 — two accounts share one sign-in address:\n";
foreach ($pdo->query('SELECT id, email, status FROM bueno_users ORDER BY id') as $r) {
    printf("    %-8s %-26s %s\n", $r['id'], $r['email'], $r['status']);
}

// ── Apply 006 ───────────────────────────────────────────────────────────────

echo "\nApplying 006_unique_user_emails…\n";
$migrator->up();

echo "\nAfter:\n";
foreach ($pdo->query('SELECT id, email, status, must_change_credentials FROM bueno_users ORDER BY id') as $r) {
    printf("    %-8s %-26s %-10s must_change=%s\n", $r['id'], $r['email'], $r['status'], $r['must_change_credentials']);
}

echo "\n=== The account that can actually sign in keeps the address ===\n";

$a = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_a'")->fetch();
$b = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_b'")->fetch();
$c = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_c'")->fetch();

check('the account with a credential keeps logistics@hbm.ng', $a['email'] === 'logistics@hbm.ng');
check('it is left active', $a['status'] === 'ACTIVE');
check('it is not forced to reset', (int) $a['must_change_credentials'] === 0);

echo "\n=== The duplicate is moved aside, not deleted ===\n";

check('the duplicate account still exists', $b !== false);
check('it no longer holds the shared address', $b['email'] !== 'logistics@hbm.ng');
check('its new address is recognisable as a duplicate', str_contains((string) $b['email'], '+duplicate'));
check('it is suspended pending review', $b['status'] === 'SUSPENDED');
check('it must set a credential before use', (int) $b['must_change_credentials'] === 1);

echo "\n=== Unrelated accounts are untouched ===\n";

check('rail@apmt.com is unchanged', $c['email'] === 'rail@apmt.com');
check('and still active', $c['status'] === 'ACTIVE');

echo "\n=== Blank addresses become NULL rather than colliding ===\n";

$e = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_e'")->fetch();
$f = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_f'")->fetch();
check('the first blank address is NULL, not an empty string', $e['email'] === null);
check('so is the second — the index tolerates repeated NULLs', $f['email'] === null);
check('neither account was suspended for it', $e['status'] === 'ACTIVE' && $f['status'] === 'ACTIVE');

echo "\n=== Case differences are treated as the same identity ===\n";

$g = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_g'")->fetch();
$h = $pdo->query("SELECT * FROM bueno_users WHERE id = 'usr_h'")->fetch();
check('the account with a credential keeps cargo@maersk.com', $g['email'] === 'cargo@maersk.com');
check('the casing variant was moved aside', str_contains((string) $h['email'], '+duplicate'));

echo "\n=== It cannot happen again ===\n";

// NULL is excluded deliberately: "no address recorded" is not a claim on an
// address, and any number of accounts may be in that state.
$duplicatesNow = (int) $pdo->query(
    "SELECT COUNT(*) FROM (
        SELECT email FROM bueno_users WHERE email IS NOT NULL GROUP BY email HAVING COUNT(*) > 1
     ) d"
)->fetchColumn();
check('no address is claimed twice', $duplicatesNow === 0);

$rejected = false;
try {
    $insert->execute(['usr_d', 'Impostor', 'logistics@hbm.ng', 'CUSTOMER', 'CUSTOMER', 'ACTIVE', '', null]);
} catch (Throwable $e) {
    $rejected = true;
}
check('the database now rejects a second account on the same address', $rejected);

echo "\n";
if ($failures > 0) {
    printf("FAILED: %d assertion(s)\n", $failures);
    exit(1);
}
echo "All email-uniqueness assertions passed.\n";
