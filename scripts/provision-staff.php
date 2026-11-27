<?php
/**
 * Bueno Freight OS — provision or re-credential the staff accounts
 *
 *   php scripts/provision-staff.php --list
 *   php scripts/provision-staff.php --domain=bueno.ng
 *   php scripts/provision-staff.php --domain=bueno.ng --rotate
 *   php scripts/provision-staff.php --rotate --only=ADMIN,CEO
 *
 * Creates one account per internal role, or issues a fresh credential to the
 * accounts already there, and prints each password exactly once.
 *
 * Why this exists rather than a list of fixed credentials in a document:
 *
 *   - A password written into a repository, a handover note or a chat message
 *     is a password that outlives the person it was issued to. These are
 *     generated at run time, shown once, and stored only as a bcrypt hash.
 *   - Rotating a credential has to end the sessions it opened. Changing the
 *     password alone leaves anyone already signed in signed in, which is the
 *     opposite of what rotating it is for, so --rotate revokes every session
 *     belonging to the account.
 *   - Every new credential is marked must-change, so the person who receives
 *     it sets their own and the operator who ran this never knows it.
 *
 * CLI only, and it prints secrets to stdout. Run it where you can see the
 * screen, not into a log file.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script is command-line only.\n");
}

require_once __DIR__ . '/../apps/web/public/api/_lib/config.php';
require_once __DIR__ . '/../apps/web/public/api/_lib/db.php';
require_once __DIR__ . '/../apps/web/public/api/_lib/capabilities.php';
require_once __DIR__ . '/../apps/web/public/api/_lib/audit.php';

// ── Arguments ───────────────────────────────────────────────────────────────

$args = [];
foreach (array_slice($argv, 1) as $a) {
    if (preg_match('/^--([a-z-]+)(?:=(.*))?$/', $a, $m) === 1) {
        $args[$m[1]] = $m[2] ?? true;
    }
}

$domain  = is_string($args['domain'] ?? null) ? strtolower(trim($args['domain'])) : 'bueno.ng';
$rotate  = isset($args['rotate']);
$listing = isset($args['list']);
$only    = is_string($args['only'] ?? null)
    ? array_filter(array_map('strtoupper', array_map('trim', explode(',', $args['only']))))
    : null;

/**
 * The internal roles, and the account each one gets.
 *
 * Deliberately one account per role rather than per person: this is the
 * starting set for a deployment or a handover. Real people are added from the
 * User Directory afterwards, which is also where someone leaving gets
 * deactivated.
 */
$STAFF = [
    'ADMIN'              => ['System Administrator',   'admin',      null],
    'CEO'                => ['Managing Director',      'md',         null],
    'HEAD_OF_OPERATIONS' => ['Head of Operations',     'operations', null],
    'HEAD_OF_FINANCE'    => ['Head of Finance',        'finance',    null],
    'ACCOUNTANT'         => ['Accountant',             'accounts',   null],
    'CARGO_OFFICER'      => ['Cargo Officer — Papalanto', 'siding.papa', 'PAPA'],
    'CARGO_OFFICER:MNY'  => ['Cargo Officer — Moniya',    'siding.mny',  'MNY'],
];

// ── Where are we writing? ───────────────────────────────────────────────────

$pdo = Db::conn();

$driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$target = $driver === 'mysql'
    ? sprintf('MySQL %s on %s', Config::get('DB_NAME') ?? '?', Config::get('DB_HOST', 'localhost'))
    : sprintf('SQLite %s', realpath(Config::get('SQLITE_PATH', '')) ?: Config::get('SQLITE_PATH', '(default)'));

fwrite(STDERR, PHP_EOL . "Target database: {$target}" . PHP_EOL);

try {
    $pdo->query('SELECT 1 FROM bueno_users LIMIT 1');
} catch (Throwable $e) {
    fwrite(STDERR,
        "ERROR: that database has no bueno_users table.\n"
      . "       Run the migrations first:  php apps/web/public/api/_lib/migrate.php up\n"
    );
    exit(1);
}

// ── --list: show what is there, and change nothing ──────────────────────────

if ($listing) {
    $rows = $pdo->query(
        "SELECT id, fullName, email, role, assignedStation, status,
                must_change_credentials, last_login_at,
                CASE WHEN password_hash IS NULL OR password_hash = '' THEN 0 ELSE 1 END AS hasSecret
           FROM bueno_users
          WHERE UPPER(COALESCE(userType,'STAFF')) = 'STAFF'
          ORDER BY role, email"
    )->fetchAll(PDO::FETCH_ASSOC);

    echo PHP_EOL . 'Internal accounts' . PHP_EOL . str_repeat('-', 94) . PHP_EOL;
    printf("  %-22s %-30s %-10s %-8s %s\n", 'ROLE', 'SIGN IN', 'STATUS', 'STATION', 'CREDENTIAL');
    foreach ($rows as $r) {
        printf(
            "  %-22s %-30s %-10s %-8s %s\n",
            $r['role'],
            $r['email'] ?? '(none)',
            $r['status'],
            $r['assignedStation'] ?? '-',
            ((int) $r['hasSecret'] === 0)
                ? 'NONE - cannot sign in'
                : ((int) $r['must_change_credentials'] === 1 ? 'must be changed' : 'set')
        );
    }
    echo str_repeat('-', 94) . PHP_EOL;
    echo count($rows) . ' internal account(s). No changes made.' . PHP_EOL . PHP_EOL;
    exit(0);
}

// ── Credential generation ───────────────────────────────────────────────────

/**
 * A credential that can be read off a screen and typed without ambiguity.
 *
 * No O/0 or I/l/1, and grouped, because these get dictated over a phone to
 * someone standing at a siding. Entropy is still well over 70 bits.
 */
function issue_secret(): string
{
    $alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    $parts    = [];
    for ($g = 0; $g < 3; $g++) {
        $chunk = '';
        for ($i = 0; $i < 5; $i++) {
            $chunk .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        $parts[] = $chunk;
    }
    return implode('-', $parts);
}

$now     = gmdate('Y-m-d\TH:i:s\Z');
$issued  = [];
$skipped = [];

foreach ($STAFF as $key => [$fullName, $localPart, $station]) {
    $role  = explode(':', $key)[0];
    $email = $localPart . '@' . $domain;

    if ($only !== null && !in_array($role, $only, true) && !in_array($key, $only, true)) {
        continue;
    }

    $find = $pdo->prepare('SELECT * FROM bueno_users WHERE LOWER(email) = LOWER(?) LIMIT 1');
    $find->execute([$email]);
    $existing = $find->fetch(PDO::FETCH_ASSOC);

    $secret = issue_secret();
    $hash   = password_hash($secret, PASSWORD_BCRYPT);

    if ($existing !== false) {
        if (!$rotate) {
            $skipped[] = [$role, $email];
            continue;
        }

        $pdo->prepare(
            'UPDATE bueno_users
                SET password_hash = ?, must_change_credentials = 1, failed_attempts = 0,
                    locked_until = NULL, token_version = token_version + 1,
                    status = ?, updated_at = ?
              WHERE id = ?'
        )->execute([$hash, 'ACTIVE', $now, $existing['id']]);

        /*
         * End every session this account already has.
         *
         * A new password that leaves existing sessions alive has not rotated
         * anything: whoever is already signed in stays signed in, which is
         * exactly the case rotation is meant to close.
         */
        $pdo->prepare('UPDATE bueno_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
            ->execute([$now, $existing['id']]);

        Audit::record('users.credential_rotated', 'user', (string) $existing['id'], Audit::SUCCESS, [
            'role'   => $role,
            'by'     => 'provision-staff.php',
            'reason' => 'bulk re-credential',
        ], null);

        $issued[] = [$role, $fullName, $email, $secret, $station, 'rotated'];
        continue;
    }

    $id      = 'usr_' . bin2hex(random_bytes(8));
    $staffId = strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $role) ?? 'STAFF', 0, 3))
             . '-' . str_pad((string) random_int(1, 999), 3, '0', STR_PAD_LEFT);

    $pdo->prepare(
        'INSERT INTO bueno_users
            (id, fullName, email, role, userType, assignedStation, staffId, pin, status,
             password_hash, must_change_credentials, failed_attempts, createdAt, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)'
    )->execute([
        $id, $fullName, $email, $role, 'STAFF', $station, $staffId, '', 'ACTIVE',
        $hash, $now, $now,
    ]);

    Audit::record('users.create', 'user', $id, Audit::SUCCESS, [
        'role' => $role,
        'by'   => 'provision-staff.php',
    ], null);

    $issued[] = [$role, $fullName, $email, $secret, $station, 'created'];
}

// ── Report ──────────────────────────────────────────────────────────────────

if ($issued === []) {
    echo PHP_EOL . 'Nothing to do.' . PHP_EOL;
    if ($skipped !== []) {
        echo PHP_EOL . 'These accounts already exist and were left alone:' . PHP_EOL;
        foreach ($skipped as [$role, $email]) {
            printf("  %-22s %s\n", $role, $email);
        }
        echo PHP_EOL . 'To issue them fresh credentials, re-run with --rotate.' . PHP_EOL;
    }
    echo PHP_EOL;
    exit(0);
}

echo PHP_EOL;
echo str_repeat('=', 94) . PHP_EOL;
echo '  STAFF SIGN-IN DETAILS — shown once, not recoverable' . PHP_EOL;
echo str_repeat('=', 94) . PHP_EOL . PHP_EOL;

printf("  %-22s %-28s %-19s %s\n", 'ROLE', 'SIGN IN', 'PASSWORD', 'STATION');
echo '  ' . str_repeat('-', 90) . PHP_EOL;

foreach ($issued as [$role, $fullName, $email, $secret, $station, $what]) {
    printf("  %-22s %-28s %-19s %s\n", $role, $email, $secret, $station ?? '-');
}

echo PHP_EOL;
echo '  Each account must set its own password at first sign-in; after that' . PHP_EOL;
echo '  nobody — including whoever ran this — knows it.' . PHP_EOL . PHP_EOL;

if ($rotate) {
    echo '  Every existing session for the rotated accounts has been revoked.' . PHP_EOL;
    echo '  Anyone signed in on one of them is now signed out.' . PHP_EOL . PHP_EOL;
}

if ($skipped !== []) {
    echo '  Left alone (already existed; use --rotate to re-credential):' . PHP_EOL;
    foreach ($skipped as [$role, $email]) {
        printf("    %-22s %s\n", $role, $email);
    }
    echo PHP_EOL;
}

echo '  Hand each person their own line and nothing else. Do not paste this' . PHP_EOL;
echo '  table into a chat, a document or a ticket: these are live credentials' . PHP_EOL;
echo '  until each person changes them.' . PHP_EOL . PHP_EOL;
