<?php
/**
 * Bueno Freight OS — Authorization
 *
 * Capability enforcement, and the row-level scoping that decides *which*
 * records a caller may see. Previously neither existed on the server: the
 * permission matrix only hid buttons in the browser, and every endpoint
 * returned the entire table to anyone who asked.
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
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/capabilities.php';
require_once __DIR__ . '/company.php';

final class Rbac
{
    /** @var array<string,string[]>|null */
    private static ?array $matrix = null;

    /**
     * The effective permission matrix, read once per request.
     *
     * @return array<string,string[]>
     */
    public static function matrix(): array
    {
        if (self::$matrix !== null) {
            return self::$matrix;
        }

        $stored = [];
        try {
            $rows = Db::conn()->query('SELECT roleKey, permissionsJson FROM bueno_role_permissions')->fetchAll();
            foreach ($rows as $r) {
                $decoded = json_decode((string) $r['permissionsJson'], true);
                if (is_array($decoded)) {
                    $stored[(string) $r['roleKey']] = $decoded;
                }
            }
        } catch (Throwable $e) {
            error_log('[bueno][rbac] matrix load failed: ' . $e->getMessage());
        }

        // normalizeMatrix drops unknown keys and strips sensitive capabilities
        // from external roles, so a tampered or stale row cannot widen access.
        self::$matrix = Capabilities::normalizeMatrix($stored);
        return self::$matrix;
    }

    /** Invalidate the request-local cache after a write. */
    public static function forgetMatrix(): void
    {
        self::$matrix = null;
    }

    /**
     * Capabilities held by a user.
     *
     * @param  array<string,mixed>|null $user
     * @return string[]
     */
    public static function capabilitiesFor(?array $user): array
    {
        if ($user === null) {
            return [];
        }
        $role = (string) ($user['role'] ?? '');
        return self::matrix()[$role] ?? [];
    }

    /** @param array<string,mixed>|null $user */
    public static function can(?array $user, string $capability): bool
    {
        return in_array($capability, self::capabilitiesFor($user), true);
    }

    /**
     * Require authentication plus a capability, or stop the request.
     *
     * @return array<string,mixed> the authenticated user
     */
    public static function require(string $capability): array
    {
        $user = Auth::require();

        if (!self::can($user, $capability)) {
            Audit::record(
                'authz.denied',
                'capability',
                $capability,
                Audit::DENIED,
                ['role' => $user['role'] ?? null],
                $user
            );
            Response::error(
                'You do not have permission to perform this action.',
                403,
                ['requiredCapability' => $capability]
            );
        }

        return $user;
    }

    /** Require any one of several capabilities. */
    public static function requireAny(string ...$capabilities): array
    {
        $user = Auth::require();

        foreach ($capabilities as $cap) {
            if (self::can($user, $cap)) {
                return $user;
            }
        }

        Audit::record(
            'authz.denied',
            'capability',
            implode('|', $capabilities),
            Audit::DENIED,
            ['role' => $user['role'] ?? null],
            $user
        );
        Response::error(
            'You do not have permission to perform this action.',
            403,
            ['requiredCapability' => implode(' or ', $capabilities)]
        );
    }

    // ── Row-level scoping ───────────────────────────────────────────────────

    /**
     * Describes which rows a caller may see.
     *
     * Holding the 'deals' capability says a consignee may open the deals
     * screen; it must not mean they see every other consignee's contracts.
     * That distinction did not exist before — customer portals filtered client
     * side, so the data was already in the browser.
     *
     * @param  array<string,mixed> $user
     * @return array{scope:'all'|'company'|'station',company:?string,companyId:?string,station:?string}
     */
    public static function scopeFor(array $user): array
    {
        $role = (string) ($user['role'] ?? '');

        if (Capabilities::isExternalRole($role)) {
            /*
             * companyId is the authority; the name is the fallback.
             *
             * Matching on the name alone meant a rename detached a customer
             * from their own history, and the comparison could not use an
             * index. Accounts created before migration 011, or by a call site
             * not yet carrying the id, still match by name — so this returns
             * both and scopeClause uses whichever it has.
             */
            $companyId = trim((string) ($user['companyId'] ?? ''));
            if ($companyId !== '') {
                $resolved  = Company::find($companyId);
                $companyId = $resolved === null ? '' : (string) $resolved['id'];
            }

            return [
                'scope'     => 'company',
                'company'   => (string) ($user['companyName'] ?? ''),
                'companyId' => $companyId !== '' ? $companyId : null,
                'station'   => null,
            ];
        }

        // Cargo officers work a terminal, not the whole network. They keep
        // full visibility of trips touching their station (origin or
        // destination) but are not a network-wide reporting account.
        if ($role === 'CARGO_OFFICER') {
            return [
                'scope'     => 'station',
                'company'   => null,
                'companyId' => null,
                'station'   => (string) ($user['assignedStation'] ?? ''),
            ];
        }

        return ['scope' => 'all', 'company' => null, 'companyId' => null, 'station' => null];
    }

    /**
     * Build a SQL fragment restricting a query to the caller's scope.
     *
     * @param  array<string,mixed> $user
     * @param  array{company?:string,companyId?:string|false,station?:string[]} $columns
     *         Column names to match against. companyId defaults to the column
     *         of that name; pass false for a table that has none.
     * @return array{sql:string,params:array<int,mixed>}
     */
    public static function scopeClause(array $user, array $columns): array
    {
        $scope = self::scopeFor($user);

        if ($scope['scope'] === 'all') {
            return ['sql' => '', 'params' => []];
        }

        if ($scope['scope'] === 'company') {
            $col = $columns['company'] ?? null;
            $idCol = $columns['companyId'] ?? 'companyId';

            /*
             * Scope by the stable id where both sides have one.
             *
             * This is an indexed equality on companyId rather than the
             * LOWER(TRIM(...)) name comparison it replaces, so it survives a
             * rename and does not force a table scan.
             *
             * The name clause is still OR'd in, because a record written
             * before migration 011 — or by a call site that has not started
             * sending companyId — carries only a name. Dropping it would
             * empty those customers' portals. Once verify-deployment reports
             * no rows with a NULL companyId, the name half can go.
             */
            if ($scope['companyId'] !== null && $idCol !== false && $idCol !== null) {
                if ($col === null) {
                    return ['sql' => " AND `$idCol` = ?", 'params' => [$scope['companyId']]];
                }
                return [
                    'sql' => " AND (`$idCol` = ? OR (`$idCol` IS NULL AND LOWER(TRIM(`$col`)) = LOWER(TRIM(?))))",
                    'params' => [$scope['companyId'], $scope['company']],
                ];
            }

            if ($col === null) {
                // No company column to scope by: deny rather than leak.
                return ['sql' => ' AND 1 = 0', 'params' => []];
            }

            // No id on the account yet: fall back to the name comparison.
            return [
                'sql'    => " AND LOWER(TRIM(`$col`)) = LOWER(TRIM(?))",
                'params' => [$scope['company']],
            ];
        }

        // station scope
        $cols = $columns['station'] ?? [];
        if ($cols === []) {
            return ['sql' => '', 'params' => []];
        }
        $parts  = [];
        $params = [];
        foreach ($cols as $col) {
            $parts[]  = "`$col` = ?";
            $params[] = $scope['station'];
        }
        return ['sql' => ' AND (' . implode(' OR ', $parts) . ')', 'params' => $params];
    }

    /**
     * Do two company names refer to the same organisation?
     *
     * The single place this comparison is defined. scopeClause() does the
     * same thing in SQL (LOWER(TRIM(...))), and anything comparing company
     * names in PHP must come through here — gps.php previously compared raw
     * bytes, so a consignee whose record carried a trailing space or
     * different capitalisation saw their consignment listed in the portal and
     * was then told "trip not found" when they tried to track it.
     */
    public static function companyMatches(?string $a, ?string $b): bool
    {
        return strtolower(trim((string) $a)) === strtolower(trim((string) $b));
    }

    /**
     * Confirm a caller may act on a specific record.
     *
     * @param array<string,mixed> $user
     * @param array<string,mixed> $row
     */
    public static function assertCanTouchRow(array $user, array $row, string $companyColumn = 'company'): void
    {
        $scope = self::scopeFor($user);
        if ($scope['scope'] !== 'company') {
            return;
        }
        // Same comparison as scopeClause, or a record a consignee can see in a
        // list would be refused when they open it.
        if (!self::rowBelongsToCompany($row, $scope, $companyColumn)) {
            Audit::record('authz.scope_denied', 'row', (string) ($row['id'] ?? ''), Audit::DENIED, null, $user);
            Response::error('You do not have permission to access this record.', 403);
        }
    }

    /**
     * Does a row belong to the company a scope describes?
     *
     * The id decides it whenever both the row and the account carry one; the
     * name comparison is the fallback for records written before the registry
     * existed. Mirrors the SQL in scopeClause, and the two must stay in step
     * or a record will list but refuse to open.
     *
     * @param array<string,mixed> $row
     * @param array{company:?string,companyId:?string} $scope
     */
    private static function rowBelongsToCompany(array $row, array $scope, string $companyColumn): bool
    {
        $rowId   = trim((string) ($row['companyId'] ?? ''));
        $scopeId = $scope['companyId'] ?? null;

        if ($scopeId !== null && $rowId !== '') {
            // Follow a merge: a record still pointing at a company that was
            // merged into the caller's is theirs.
            $resolved = Company::find($rowId);
            $rowId    = $resolved === null ? $rowId : (string) $resolved['id'];
            return $rowId === $scopeId;
        }

        return self::companyMatches($row[$companyColumn] ?? '', $scope['company']);
    }

    /**
     * May this caller see or touch a trip at all?
     *
     * Trips are scoped three ways and every endpoint that reaches a trip
     * outside the collection handler needs the same answer.
     *
     * @param array<string,mixed> $user
     * @param array<string,mixed> $trip
     */
    public static function canReachTrip(array $user, array $trip): bool
    {
        $scope = self::scopeFor($user);

        if ($scope['scope'] === 'all') {
            return true;
        }

        if ($scope['scope'] === 'company') {
            return self::rowBelongsToCompany($trip, $scope, 'company');
        }

        // Station scope: the trip must touch this officer's terminal at one
        // end or the other. An officer with no posting is not a network-wide
        // account, so they reach nothing until they are assigned one.
        $station = strtoupper(trim((string) $scope['station']));
        if ($station === '') {
            return false;
        }
        $origin      = strtoupper(trim((string) ($trip['origin'] ?? '')));
        $destination = strtoupper(trim((string) ($trip['destination'] ?? '')));

        return $station === $origin || $station === $destination;
    }
}
