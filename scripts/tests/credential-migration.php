<?php
/**
 * Verifies that migration 003 converts legacy plaintext PINs to bcrypt hashes
 * without locking out any existing user.
 *
 * This is the migration most likely to cause a production incident — it
 * changes how every person on the platform signs in — so it gets an explicit
 * test rather than a manual check.
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

// Full migration run on an empty database.
$migrator = Migrator::make();
$migrator->up();

// Seed users exactly the way the legacy system stored them: plaintext PIN,
// no password_hash. This is the state a live database is in right now.
$insert = $pdo->prepare(
    'INSERT INTO bueno_users (id, fullName, email, role, userType, pin, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$insert->execute(['usr_9', 'Folake Adeyemi', 'admin@bueno.ng', 'ADMIN', 'STAFF', '7777', 'ACTIVE']);
$insert->execute(['usr_1', 'Ade Bello', 'ade.bello@bueno.ng', 'CARGO_OFFICER', 'STAFF', '1111', 'ACTIVE']);
$insert->execute(['usr_x', 'Real User', 'real@bueno.ng', 'HEAD_OF_FINANCE', 'STAFF', 'Tr0ubad0ur!42', 'ACTIVE']);

echo "\nBefore migration — what GET /api/users.php used to return to anyone:\n";
foreach ($pdo->query('SELECT id, email, pin FROM bueno_users') as $r) {
    printf("    %-8s %-22s pin=%s\n", $r['id'], $r['email'], $r['pin']);
}

// Re-run the 003 closure directly; it is written to skip rows that already
// carry a hash, so running it against newly inserted legacy rows is exactly
// what happens on a live cutover.
echo "\nRunning 003_hash_existing_credentials...\n";
$run = require $root . '/apps/web/public/api/migrations/003_hash_existing_credentials.php';
$run($pdo);

echo "\nAfter migration:\n";
foreach ($pdo->query('SELECT id, pin, password_hash, must_change_credentials FROM bueno_users') as $r) {
    printf(
        "    %-8s pin=%-6s must_change=%d hash=%s...\n",
        $r['id'],
        var_export($r['pin'], true),
        (int) $r['must_change_credentials'],
        substr((string) $r['password_hash'], 0, 18)
    );
}

echo "\nAssertions:\n";

$hashOf = static function (string $email) use ($pdo): string {
    $s = $pdo->prepare('SELECT password_hash FROM bueno_users WHERE email = ?');
    $s->execute([$email]);
    return (string) $s->fetchColumn();
};
$plainOf = static function (string $email) use ($pdo): string {
    $s = $pdo->prepare('SELECT pin FROM bueno_users WHERE email = ?');
    $s->execute([$email]);
    return (string) $s->fetchColumn();
};
$flagOf = static function (string $email) use ($pdo): int {
    $s = $pdo->prepare('SELECT must_change_credentials FROM bueno_users WHERE email = ?');
    $s->execute([$email]);
    return (int) $s->fetchColumn();
};

// The whole point: existing users must still be able to sign in.
check('admin@bueno.ng still authenticates with its original PIN 7777',
    password_verify('7777', $hashOf('admin@bueno.ng')));
check('ade.bello@bueno.ng still authenticates with its original PIN 1111',
    password_verify('1111', $hashOf('ade.bello@bueno.ng')));
check('real@bueno.ng still authenticates with its real password',
    password_verify('Tr0ubad0ur!42', $hashOf('real@bueno.ng')));

// And wrong credentials must not.
check('a wrong PIN is rejected',
    !password_verify('9999', $hashOf('admin@bueno.ng')));
check('the old hardcoded bypass "demo1234" is rejected',
    !password_verify('demo1234', $hashOf('real@bueno.ng')));

// Plaintext must be gone.
check('plaintext PIN is cleared for every user',
    $plainOf('admin@bueno.ng') === ''
    && $plainOf('ade.bello@bueno.ng') === ''
    && $plainOf('real@bueno.ng') === '');

check('stored value is a bcrypt hash, not the plaintext',
    str_starts_with($hashOf('admin@bueno.ng'), '$2y$'));

// Well-known defaults get flagged; a real password does not.
check('account on a well-known default PIN is flagged for mandatory reset',
    $flagOf('admin@bueno.ng') === 1 && $flagOf('ade.bello@bueno.ng') === 1);
check('account with a genuine password is NOT forced to reset',
    $flagOf('real@bueno.ng') === 0);

// Idempotency: running it twice must not re-hash (which would invalidate the
// hash of anyone who changed their password between runs).
$before = $hashOf('real@bueno.ng');
$run($pdo);
check('re-running the migration leaves existing hashes untouched',
    $hashOf('real@bueno.ng') === $before);

echo "\n";
if ($failures > 0) {
    printf("%d assertion(s) FAILED\n", $failures);
    exit(1);
}
echo "All credential-migration assertions passed.\n";
exit(0);
