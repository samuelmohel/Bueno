<?php
/**
 * Bueno Freight OS — create the first administrator
 *
 *   php scripts/create-admin.php "Full Name" email@example.com [role]
 *
 * A fresh deployment has no accounts at all. Every route that provisions a
 * user requires the users.create capability, which requires being signed in,
 * which requires an account — so without this there is no way in except
 * importing a legacy database that already contains one.
 *
 * Deliberately CLI-only and deliberately refuses to run once a privileged
 * account exists, so it cannot become a back door on a live deployment.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script is command-line only.\n");
}

require_once __DIR__ . '/../apps/web/public/api/_lib/config.php';
require_once __DIR__ . '/../apps/web/public/api/_lib/db.php';
require_once __DIR__ . '/../apps/web/public/api/_lib/capabilities.php';

$PRIVILEGED = ['ADMIN', 'CEO', 'MD'];

$fullName = $argv[1] ?? '';
$email    = $argv[2] ?? '';
$role     = strtoupper($argv[3] ?? 'ADMIN');

if ($fullName === '' || $email === '') {
    fwrite(STDERR, "Usage: php scripts/create-admin.php \"Full Name\" email@example.com [ADMIN|CEO|MD]\n");
    exit(1);
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    fwrite(STDERR, "ERROR: \"$email\" is not a valid email address.\n");
    exit(1);
}
if (!in_array($role, $PRIVILEGED, true)) {
    fwrite(STDERR, "ERROR: role must be one of: " . implode(', ', $PRIVILEGED) . "\n");
    exit(1);
}

$pdo = Db::conn();

/*
 * Say which database this is about to write to.
 *
 * Db::conn() falls back to a local SQLite file when no MySQL is configured,
 * and Config walks up looking for a .env. Both are reasonable on their own,
 * and together they mean a mistyped BUENO_ENV_FILE lands an administrator in
 * the repository's bundled bueno.sqlite while reporting success. The operator
 * then cannot sign in, and a live account exists in a file nobody is watching.
 */
$driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$target = $driver === 'mysql'
    ? sprintf('MySQL %s on %s', Config::get('DB_NAME') ?? '?', Config::get('DB_HOST', 'localhost'))
    : sprintf('SQLite %s', realpath(Config::get('SQLITE_PATH', '')) ?: Config::get('SQLITE_PATH', '(default)'));

fwrite(STDERR, "Target database: {$target}" . PHP_EOL);

// The schema has to be there, or this is not the database the app serves.
try {
    $pdo->query('SELECT 1 FROM bueno_users LIMIT 1');
} catch (Throwable $e) {
    fwrite(STDERR,
        "ERROR: that database has no bueno_users table.\n"
      . "       Run the migrations first:  php apps/web/public/api/_lib/migrate.php up\n"
    );
    exit(1);
}

// Refuse on a deployment that already has someone who could do this from the
// interface. Bootstrapping is for an empty system only.
$existing = (int) $pdo->query(
    "SELECT COUNT(*) FROM bueno_users
      WHERE UPPER(role) IN ('ADMIN','CEO','MD')
        AND UPPER(COALESCE(status,'ACTIVE')) = 'ACTIVE'"
)->fetchColumn();

if ($existing > 0) {
    fwrite(STDERR,
        "ERROR: this deployment already has {$existing} active privileged account(s).\n"
      . "       Provision further accounts from the User Directory instead.\n"
    );
    exit(1);
}

$dupe = $pdo->prepare('SELECT COUNT(*) FROM bueno_users WHERE LOWER(email) = LOWER(?)');
$dupe->execute([$email]);
if ((int) $dupe->fetchColumn() > 0) {
    fwrite(STDERR, "ERROR: an account with that email already exists.\n");
    exit(1);
}

// A generated credential, shown once. Not emailed, not stored in plaintext,
// and flagged so it must be changed at first sign-in.
$alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
$password = '';
for ($i = 0; $i < 20; $i++) {
    $password .= $alphabet[random_int(0, strlen($alphabet) - 1)];
}

$now = gmdate('Y-m-d\TH:i:s\Z');
$id  = 'usr_' . bin2hex(random_bytes(8));

$columns = [];
foreach ($pdo->query('SELECT * FROM bueno_users LIMIT 0')->fetchAll(PDO::FETCH_ASSOC) as $r) {
    $columns = array_keys($r);
}
if ($columns === []) {
    for ($i = 0; $i < $pdo->query('SELECT * FROM bueno_users LIMIT 0')->columnCount(); $i++) {
        $columns[] = $pdo->query('SELECT * FROM bueno_users LIMIT 0')->getColumnMeta($i)['name'];
    }
}

$row = [
    'id'                      => $id,
    'fullName'                => $fullName,
    'email'                   => $email,
    'role'                    => $role,
    'userType'                => 'STAFF',
    'status'                  => 'ACTIVE',
    'password_hash'           => password_hash($password, PASSWORD_BCRYPT),
    'must_change_credentials' => 1,
    'failed_attempts'         => 0,
    'createdAt'               => $now,
    'updated_at'              => $now,
];
$row = array_intersect_key($row, array_flip($columns));

$cols   = implode(', ', array_map(static fn($c) => "`$c`", array_keys($row)));
$marks  = implode(', ', array_fill(0, count($row), '?'));
$pdo->prepare("INSERT INTO bueno_users ($cols) VALUES ($marks)")->execute(array_values($row));

echo PHP_EOL;
echo "Administrator created." . PHP_EOL . PHP_EOL;
echo "  Name:      {$fullName}" . PHP_EOL;
echo "  Sign in:   {$email}" . PHP_EOL;
echo "  Password:  {$password}" . PHP_EOL;
echo "  Role:      {$role}" . PHP_EOL . PHP_EOL;
echo "This password is shown once and is not recoverable." . PHP_EOL;
echo "You will be required to change it at first sign-in." . PHP_EOL . PHP_EOL;
