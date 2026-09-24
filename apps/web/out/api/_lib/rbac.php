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
     * @return array{scope:'all'|'company'|'station',company:?string,station:?string}
     */
    public static function scopeFor(array $user): array
    {
        $role = (string) ($user['role'] ?? '');

        if (Capabilities::isExternalRole($role)) {
            return [
                'scope'   => 'company',
                'company' => (string) ($user['companyName'] ?? ''),
                'station' => null,
            ];
        }

        // Cargo officers work a terminal, not the whole network. They keep
        // full visibility of trips touching their station (origin or
        // destination) but are not a network-wide reporting account.
        if ($role === 'CARGO_OFFICER') {
            return [
                'scope'   => 'station',
                'company' => null,
                'station' => (string) ($user['assignedStation'] ?? ''),
            ];
        }

        return ['scope' => 'all', 'company' => null, 'station' => null];
    }

    /**
     * Build a SQL fragment restricting a query to the caller's scope.
     *
     * @param  array<string,mixed> $user
     * @param  array{company?:string,station?:string[]} $columns column names to match against
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
            if ($col === null) {
                // No company column to scope by: deny rather than leak.
                return ['sql' => ' AND 1 = 0', 'params' => []];
            }
            /*
             * Compared case- and whitespace-insensitively.
             *
             * A consignee is linked to their trips, deals and invoices by the
             * company NAME on their account matching the company name stored
             * on each record. A strict comparison means "HBM Nig Plc " and
             * "HBM Nig Plc" are different organisations, and the consignee
             * signs in to an empty portal with nothing to say why.
             *
             * This narrows the gap; it does not close it. The durable answer
             * is a company registry with a stable id that records point at, so
             * renaming an organisation cannot detach its history. Until then
             * scripts/verify-deployment.php reports records whose company
             * matches no account.
             *
             * Note this cannot use an index on the column. At this data volume
             * that is not worth trading a silent correctness fault for.
             */
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
        $rowCompany  = strtolower(trim((string) ($row[$companyColumn] ?? '')));
        $ownCompany  = strtolower(trim((string) $scope['company']));
        if ($rowCompany !== $ownCompany) {
            Audit::record('authz.scope_denied', 'row', (string) ($row['id'] ?? ''), Audit::DENIED, null, $user);
            Response::error('You do not have permission to access this record.', 403);
        }
    }
}
