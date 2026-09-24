<?php
/**
 * Bueno Freight OS — consignee linkage report
 *
 *   BUENO_ENV_FILE=/home/speckles/.env php scripts/check-consignee-links.php
 *
 * A consignee is joined to their trips, deals, invoices and negotiations by
 * the company NAME on their account matching the company name stored on each
 * record. There is no identifier holding the two together — which means a
 * record whose company name differs by a word, a suffix or a space belongs to
 * nobody, and the consignee signs in to an empty portal with nothing on screen
 * to say why.
 *
 * This reports, for every consignee account, what they will actually see; and
 * then every company name present in the data that matches no account at all.
 * Those are the orphans: work that exists but no customer can see.
 *
 * Read-only. It changes nothing.
 */

declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/apps/web/public/api/_lib/db.php';

function line(string $t = ''): void { echo $t . PHP_EOL; }
function rule(string $t): void { line(); line($t); line(str_repeat('-', max(4, strlen($t)))); }

/** Same normalisation the API scopes by. */
function company_key(?string $s): string { return strtolower(trim((string) $s)); }

try {
    $pdo = Db::conn();
} catch (Throwable $e) {
    line('CANNOT CONNECT: ' . $e->getMessage());
    exit(1);
}

line('Consignee linkage report');
line('driver: ' . Db::driver());

// The collections a consignee sees, and the column each stores the company in.
$SOURCES = [
    'trips'        => ['bueno_trips',        'company'],
    'deals'        => ['bueno_deals',        'company'],
    'invoices'     => ['bueno_invoices',     'companyName'],
    'negotiations' => ['bueno_negotiations', 'companyName'],
];

// ── Accounts ────────────────────────────────────────────────────────────────

$accounts = $pdo->query(
    "SELECT id, fullName, email, companyName, status
       FROM bueno_users
      WHERE role IN ('CUSTOMER','CONSIGNEE')
      ORDER BY companyName"
)->fetchAll();

rule('Consignee accounts, and what each will see');

if ($accounts === []) {
    line('No consignee accounts exist. Every record below is therefore invisible');
    line('to any customer until an account is provisioned for it.');
}

$claimed = [];
foreach ($accounts as $a) {
    $name = (string) ($a['companyName'] ?? '');
    $k    = company_key($name);
    $claimed[$k] = true;

    line();
    line(sprintf('  %s  <%s>  [%s]', $a['fullName'], $a['email'], $a['status']));
    if ($name === '') {
        line('     !! No company name on this account. Company scoping matches on that');
        line('        name, so this user sees NOTHING at all. Set it in User Directory.');
        continue;
    }
    line('     company: "' . $name . '"');

    foreach ($SOURCES as $label => [$table, $column]) {
        try {
            $stmt = $pdo->prepare(
                "SELECT COUNT(*) FROM `$table` WHERE LOWER(TRIM(`$column`)) = ?"
            );
            $stmt->execute([$k]);
            $n = (int) $stmt->fetchColumn();
            line(sprintf('     %-14s %d', $label, $n));
        } catch (Throwable $e) {
            line(sprintf('     %-14s could not read (%s)', $label, $e->getMessage()));
        }
    }
}

// ── Orphans ─────────────────────────────────────────────────────────────────

rule('Company names in the data that match no account');

$orphans = [];
foreach ($SOURCES as $label => [$table, $column]) {
    try {
        $rows = $pdo->query(
            "SELECT `$column` AS name, COUNT(*) AS n
               FROM `$table`
              WHERE `$column` IS NOT NULL AND `$column` <> ''
              GROUP BY `$column`"
        )->fetchAll();
    } catch (Throwable $e) {
        continue;
    }

    foreach ($rows as $r) {
        if (isset($claimed[company_key($r["name"])])) {
            continue;
        }
        $orphans[(string) $r['name']][$label] = (int) $r['n'];
    }
}

if ($orphans === []) {
    line('None. Every record belongs to a consignee account.');
} else {
    line('These records exist but no consignee can see them. Either the account');
    line('company name needs correcting to match, or an account needs creating.');
    line();
    foreach ($orphans as $name => $counts) {
        $parts = [];
        foreach ($counts as $label => $n) {
            $parts[] = "$label: $n";
        }
        line(sprintf('  "%s"', $name));
        line('      ' . implode(',  ', $parts));
    }
    line();
    line('To attach them, set the account company name to match exactly — or');
    line('correct the records. Matching ignores case and surrounding spaces.');
}

line();
line('Done. Nothing was changed.');
