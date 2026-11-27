<?php
/**
 * Bueno Freight OS — Company registry
 *
 * A consignee used to be linked to their freight by their company NAME
 * matching the name stored on each record. Renaming an organisation detached
 * its history, the same organisation keyed two ways was two organisations,
 * and row-level security rested on a string comparison that could not use an
 * index.
 *
 * Records now carry a companyId. The name stays on the row as the display
 * value and as the fallback for anything written before migration 011, but
 * access is decided by the id.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/audit.php';

final class Company
{
    /** @var array<string,array<string,mixed>|null> */
    private static array $cache = [];

    /**
     * Fold a display name to the key two spellings of it share.
     *
     * Must stay identical to the fold in migration 011, or a company created
     * here will not match the rows that migration linked. The parity is
     * covered by scripts/tests/company-registry.test.ts.
     */
    public static function matchKey(?string $raw): string
    {
        $s = strtolower(trim((string) $raw));
        if ($s === '') {
            return '';
        }
        $s = (string) preg_replace('/\s*\([^)]*\)\s*$/', '', $s);
        $s = (string) preg_replace('/[.,\'"`]/', '', $s);
        $s = (string) preg_replace('/[^a-z0-9]+/', ' ', $s);
        $s = trim((string) preg_replace('/\s+/', ' ', $s));

        $suffixes = ['plc', 'ltd', 'limited', 'nig', 'nigeria', 'incorporated', 'inc', 'company', 'co'];
        $words    = $s === '' ? [] : explode(' ', $s);
        while (count($words) > 1 && in_array(end($words), $suffixes, true)) {
            array_pop($words);
        }

        return implode(' ', $words);
    }

    /**
     * Resolve a company id, following any merge to the surviving row.
     *
     * A merged company's id stays valid for ever: historic records keep
     * pointing at it and reads land on the company it was merged into.
     *
     * @return array<string,mixed>|null
     */
    public static function find(?string $id): ?array
    {
        $id = trim((string) $id);
        if ($id === '') {
            return null;
        }
        if (array_key_exists($id, self::$cache)) {
            return self::$cache[$id];
        }

        $seen = [];
        $cur  = $id;

        // Follow mergedIntoId, with a guard: a cycle introduced by a bad
        // merge must not spin the request forever.
        while ($cur !== '' && !isset($seen[$cur]) && count($seen) < 16) {
            $seen[$cur] = true;

            $stmt = Db::conn()->prepare('SELECT * FROM bueno_companies WHERE id = ? LIMIT 1');
            $stmt->execute([$cur]);
            $row = $stmt->fetch();

            if ($row === false) {
                return self::$cache[$id] = null;
            }
            $next = trim((string) ($row['mergedIntoId'] ?? ''));
            if ($next === '' || $next === $cur) {
                return self::$cache[$id] = $row;
            }
            $cur = $next;
        }

        return self::$cache[$id] = null;
    }

    /**
     * The id a name refers to, or null.
     *
     * @return string|null
     */
    public static function idForName(?string $name): ?string
    {
        $key = self::matchKey($name);
        if ($key === '') {
            return null;
        }

        $stmt = Db::conn()->prepare('SELECT id FROM bueno_companies WHERE matchKey = ? LIMIT 1');
        $stmt->execute([$key]);
        $id = $stmt->fetchColumn();
        if ($id === false) {
            return null;
        }

        $resolved = self::find((string) $id);
        return $resolved === null ? null : (string) $resolved['id'];
    }

    /**
     * The id for a name, creating the company if it is new.
     *
     * Used where a company name arrives from outside the registry — a public
     * enquiry, or a deal typed against an organisation not yet on file. The
     * alternative is refusing the record, which loses a real enquiry.
     *
     * @param array<string,mixed>|null $actor
     */
    public static function ensure(?string $name, ?array $actor = null, array $extra = []): ?string
    {
        $display = trim((string) $name);
        $key     = self::matchKey($display);
        if ($key === '' || $display === '') {
            return null;
        }

        $found = self::idForName($display);
        if ($found !== null) {
            return $found;
        }

        $id  = 'cmp_' . bin2hex(random_bytes(8));
        $now = gmdate('Y-m-d\TH:i:s\Z');

        try {
            Db::conn()->prepare(
                'INSERT INTO bueno_companies
                    (id, name, matchKey, status, isExternal, industry, contactName,
                     contactEmail, contactPhone, createdAt, createdBy, updated_at, version)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
            )->execute([
                $id,
                $display,
                $key,
                'ACTIVE',
                1,
                $extra['industry']     ?? null,
                $extra['contactName']  ?? null,
                $extra['contactEmail'] ?? null,
                $extra['contactPhone'] ?? null,
                $now,
                (string) ($actor['fullName'] ?? $actor['id'] ?? 'system'),
                $now,
            ]);
        } catch (Throwable $e) {
            // Another request inserted the same matchKey between the lookup
            // and the insert. The unique index is what makes that safe to
            // recover from rather than a duplicate.
            $again = self::idForName($display);
            if ($again !== null) {
                return $again;
            }
            error_log('[bueno][company] could not register "' . $display . '": ' . $e->getMessage());
            return null;
        }

        Audit::record('company.registered', 'company', $id, Audit::SUCCESS, [
            'name' => $display,
        ], $actor);

        return $id;
    }

    /** Display name for an id, or '' when unknown. */
    public static function nameOf(?string $id): string
    {
        $row = self::find($id);
        return $row === null ? '' : (string) $row['name'];
    }

    /**
     * Merge one company into another.
     *
     * Repoints every record, then marks the source merged rather than
     * deleting it so that ids already handed out keep resolving.
     *
     * @param array<string,mixed> $actor
     * @return array{moved:array<string,int>}
     */
    public static function merge(string $sourceId, string $targetId, array $actor): array
    {
        $source = self::find($sourceId);
        $target = self::find($targetId);

        if ($source === null) {
            Response::error('The company being merged was not found.', 404);
        }
        if ($target === null) {
            Response::error('The company being merged into was not found.', 404);
        }
        if ((string) $source['id'] === (string) $target['id']) {
            Response::error('A company cannot be merged into itself.', 422);
        }

        $sid = (string) $source['id'];
        $tid = (string) $target['id'];

        $moved = Db::transaction(static function (PDO $pdo) use ($sid, $tid, $target): array {
            $now   = gmdate('Y-m-d\TH:i:s\Z');
            $moved = [];

            // Repoint the records, and bring the display name with them so the
            // two spellings stop appearing side by side on screens that show
            // the stored name.
            foreach ([
                ['bueno_users',           'companyName'],
                ['bueno_trips',           'company'],
                ['bueno_deals',           'company'],
                ['bueno_invoices',        'companyName'],
                ['bueno_client_requests', 'companyName'],
            ] as [$table, $column]) {
                $stmt = $pdo->prepare(
                    "UPDATE `$table` SET companyId = ?, `$column` = ? WHERE companyId = ?"
                );
                $stmt->execute([$tid, $target['name'], $sid]);
                $moved[$table] = $stmt->rowCount();
            }

            // bueno_deals carries a second display column.
            try {
                $pdo->prepare('UPDATE bueno_deals SET companyName = ? WHERE companyId = ?')
                    ->execute([$target['name'], $tid]);
            } catch (Throwable $e) {
                // Older schema without the column: nothing to do.
            }

            $pdo->prepare(
                'UPDATE bueno_companies
                    SET mergedIntoId = ?, status = ?, updated_at = ?, version = version + 1
                  WHERE id = ?'
            )->execute([$tid, 'MERGED', $now, $sid]);

            return $moved;
        });

        self::$cache = [];

        Audit::record('company.merged', 'company', $sid, Audit::SUCCESS, [
            'into'  => $tid,
            'name'  => $source['name'],
            'moved' => $moved,
        ], $actor);

        return ['moved' => $moved];
    }
}
