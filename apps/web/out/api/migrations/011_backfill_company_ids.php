<?php
/**
 * 011 — Populate the company registry from the names already recorded
 *
 * 010 added bueno_companies and a companyId beside every company name. This
 * fills them in from what is already there.
 *
 * The matching rule is the one the scope clause has been using — lowercase,
 * trimmed — widened to also fold the punctuation and legal-form noise that
 * makes the same organisation look like two:
 *
 *     "HBM Nig Plc"         -> hbm nig plc
 *     "HBM Nig. PLC "       -> hbm nig plc
 *     "H.B.M Nig Plc (HBM)" -> hbm nig plc
 *
 * Folding is deliberately confined to this backfill and to finding an
 * existing company by name. It is NOT used for authorization: once a record
 * carries a companyId, access is decided by that id alone. Folding two
 * genuinely different organisations together would be a disclosure, so the
 * report printed at the end names every company created and how many records
 * attached to it, and scripts/check-consignee-links.php remains the tool for
 * reviewing the result.
 *
 * Nothing is deleted and no name is rewritten. A record whose name matches no
 * account still gets a company of its own, because a trip belonging to an
 * organisation with no portal account is still that organisation's trip.
 */

declare(strict_types=1);

return static function (PDO $pdo): void {
    $now = gmdate('Y-m-d\TH:i:s\Z');

    /** Fold a display name down to the key two spellings of it share. */
    $foldName = static function (?string $raw): string {
        $s = strtolower(trim((string) $raw));
        if ($s === '') {
            return '';
        }
        // A trailing parenthesised short form -- "... Nig Plc (HBM)".
        $s = (string) preg_replace('/\s*\([^)]*\)\s*$/', '', $s);
        // Punctuation that varies between keyings.
        $s = (string) preg_replace('/[.,\'"`]/', '', $s);
        $s = (string) preg_replace('/[^a-z0-9]+/', ' ', $s);
        $s = trim((string) preg_replace('/\s+/', ' ', $s));

        // Legal forms, which get abbreviated inconsistently. Only stripped
        // from the end, so "Plc Industries Ltd" keeps its distinguishing word.
        $suffixes = ['plc', 'ltd', 'limited', 'nig', 'nigeria', 'incorporated', 'inc', 'company', 'co'];
        $words    = $s === '' ? [] : explode(' ', $s);
        while (count($words) > 1 && in_array(end($words), $suffixes, true)) {
            array_pop($words);
        }

        return implode(' ', $words);
    };

    // ── Gather every company name recorded anywhere ─────────────────────────
    //
    // Longest spelling wins as the display name: "HBM Nig Plc (HBM)" is more
    // informative than "HBM", and an operator can rename it afterwards.

    /** @var array<string,array{name:string,count:int}> */
    $registry = [];

    /*
     * Staff accounts are excluded.
     *
     * An internal account often carries the operator's own business name in
     * companyName -- "Bueno Logistics". That is not a customer, and
     * registering it would put the operator in its own customer registry and
     * leave a company nothing legitimately points at. Only the external
     * accounts, and the records themselves, describe organisations the
     * business hauls for.
     */
    $EXTERNAL_ONLY = "UPPER(COALESCE(userType, 'STAFF')) = 'CUSTOMER'
                      OR UPPER(COALESCE(role, '')) IN ('CUSTOMER', 'CONSIGNEE')";

    // [table, column, extra WHERE]
    $sources = [
        ['bueno_users',           'companyName', $EXTERNAL_ONLY],
        ['bueno_trips',           'company',     null],
        ['bueno_deals',           'company',     null],
        ['bueno_deals',           'companyName', null],
        ['bueno_invoices',        'companyName', null],
        ['bueno_client_requests', 'companyName', null],
    ];

    $columnExists = static function (PDO $pdo, string $table, string $column): bool {
        try {
            $pdo->query("SELECT `$column` FROM `$table` LIMIT 0");
            return true;
        } catch (Throwable $e) {
            return false;
        }
    };

    foreach ($sources as [$table, $column, $extraWhere]) {
        if (!$columnExists($pdo, $table, $column)) {
            continue;
        }
        $where = "`$column` IS NOT NULL AND `$column` <> ''";
        if ($extraWhere !== null) {
            $where .= " AND ($extraWhere)";
        }
        $rows = $pdo->query("SELECT DISTINCT `$column` AS n FROM `$table` WHERE $where")
                    ->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $r) {
            $name = trim((string) $r['n']);
            $key  = $foldName($name);
            if ($key === '') {
                continue;
            }
            if (!isset($registry[$key]) || strlen($name) > strlen($registry[$key]['name'])) {
                $registry[$key] = ['name' => $name, 'count' => ($registry[$key]['count'] ?? 0)];
            }
            $registry[$key]['count']++;
        }
    }

    // ── Create a company per distinct organisation ──────────────────────────

    $existing = [];
    foreach ($pdo->query('SELECT id, matchKey FROM bueno_companies')->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $existing[(string) $r['matchKey']] = (string) $r['id'];
    }

    $insert = $pdo->prepare(
        'INSERT INTO bueno_companies
            (id, name, matchKey, status, isExternal, createdAt, createdBy, updated_at, version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)'
    );

    $created = 0;
    foreach ($registry as $key => $info) {
        if (isset($existing[$key])) {
            continue;
        }
        $id = 'cmp_' . bin2hex(random_bytes(8));
        $insert->execute([$id, $info['name'], $key, 'ACTIVE', 1, $now, 'migration 011', $now]);
        $existing[$key] = $id;
        $created++;
    }

    // ── Point every record at its company ───────────────────────────────────

    $targets = [
        // Same exclusion: linking a staff account to a company would give an
        // internal user one customer's scope.
        ['bueno_users',           'companyName', $EXTERNAL_ONLY],
        ['bueno_trips',           'company',     null],
        ['bueno_deals',           'company',     null],
        ['bueno_invoices',        'companyName', null],
        ['bueno_client_requests', 'companyName', null],
    ];

    $attached = [];
    foreach ($targets as [$table, $column, $extraWhere]) {
        if (!$columnExists($pdo, $table, $column) || !$columnExists($pdo, $table, 'companyId')) {
            continue;
        }

        $where = "companyId IS NULL AND `$column` IS NOT NULL AND `$column` <> ''";
        if ($extraWhere !== null) {
            $where .= " AND ($extraWhere)";
        }

        $rows = $pdo->query("SELECT id, `$column` AS n FROM `$table` WHERE $where")
                    ->fetchAll(PDO::FETCH_ASSOC);

        $upd = $pdo->prepare("UPDATE `$table` SET companyId = ? WHERE id = ?");
        $n = 0;
        foreach ($rows as $r) {
            $key = $foldName((string) $r['n']);
            if ($key === '' || !isset($existing[$key])) {
                continue;
            }
            $upd->execute([$existing[$key], $r['id']]);
            $n++;
        }
        $attached[$table] = $n;
    }

    // Staff accounts are not consignees. Leaving a companyId on an internal
    // account would hand it a company scope it should not have.
    $pdo->exec(
        "UPDATE bueno_users SET companyId = NULL
          WHERE UPPER(COALESCE(userType, 'STAFF')) = 'STAFF'
            AND UPPER(COALESCE(role, '')) NOT IN ('CUSTOMER', 'CONSIGNEE')"
    );

    // ── Report, because a wrong merge here is a disclosure ──────────────────

    error_log(sprintf('[bueno][migration 011] registered %d compan(ies)', $created));
    echo sprintf("         registered %d compan(y/ies) from existing records\n", $created);
    foreach ($attached as $table => $n) {
        echo sprintf("         %-24s %d record(s) linked\n", $table, $n);
    }

    $multi = $pdo->query(
        "SELECT c.name, COUNT(DISTINCT u.companyName) AS spellings
           FROM bueno_companies c
           JOIN bueno_users u ON u.companyId = c.id
          GROUP BY c.id, c.name
         HAVING COUNT(DISTINCT u.companyName) > 1"
    )->fetchAll(PDO::FETCH_ASSOC);

    if ($multi !== []) {
        echo "         NOTE: these companies were matched from more than one spelling.\n";
        echo "               Confirm each is genuinely one organisation:\n";
        foreach ($multi as $m) {
            echo sprintf("                 %s (%d spellings)\n", $m['name'], $m['spellings']);
        }
    }
};
