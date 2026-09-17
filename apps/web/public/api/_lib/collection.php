<?php
/**
 * Bueno Freight OS — Generic collection endpoint
 *
 * Most endpoints are the same shape: list rows the caller may see, upsert one
 * row, delete one, occasionally purge. Previously each was a hand-written copy
 * of the same file, which is how they ended up with divergent bugs — trips.php
 * referenced an out-of-scope variable in its list mapper, users.php applied a
 * contradictory rebranding rule, several returned 200 on failure.
 *
 * Declaring the differences and sharing the behaviour means a fix lands
 * everywhere at once.
 *
 * Writes are per-record. The old contract had the client POST the entire
 * collection on every change, so two people editing different records would
 * clobber each other; the last writer's stale snapshot won silently.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/bootstrap.php';

final class Collection
{
    /**
     * @param array{
     *   table: string,
     *   entity: string,
     *   capabilities: array{read:string,write?:string,delete?:string,purge?:string},
     *   scope?: array{company?:string,station?:string[]},
     *   idColumn?: string,
     *   orderBy?: string,
     *   jsonColumns?: array<string,string>,
     *   versioned?: bool,
     *   validate: callable(array<string,mixed>, array<string,mixed>):array<string,mixed>,
     *   onWrite?: callable(PDO, array<string,mixed>, array<string,mixed>):void
     * } $spec
     */
    public static function handle(array $spec): never
    {
        $method = Http::method();

        if ($method === 'GET') {
            self::list($spec);
        }
        if ($method === 'POST') {
            self::write($spec);
        }
        Response::error('Method not allowed.', 405);
    }

    /**
     * Resolve a capability slot that may name one capability or several
     * alternatives.
     *
     * Reads in particular often have two legitimate routes: staff reach
     * invoices through the `billing` screen, while a consignee reaches their
     * own through `finance.invoices_view_own`. Requiring a single key forced
     * one of those two groups out.
     *
     * @param  array<string,mixed> $capabilities
     * @return array<string,mixed> the authenticated user
     */
    private static function requireCapability(array $capabilities, string $slot, ?string $fallbackSlot = null): array
    {
        $required = $capabilities[$slot]
            ?? ($fallbackSlot !== null ? ($capabilities[$fallbackSlot] ?? null) : null)
            ?? $capabilities['read'];

        return is_array($required)
            ? Rbac::requireAny(...$required)
            : Rbac::require($required);
    }

    /** @param array<string,mixed> $spec */
    private static function list(array $spec): never
    {
        $user = self::requireCapability($spec['capabilities'], 'read');

        $table    = $spec['table'];
        $idColumn = $spec['idColumn'] ?? 'id';

        $sql    = "SELECT * FROM `$table` WHERE 1 = 1";
        $params = [];

        // Single record by id.
        $requestedId = $_GET['id'] ?? null;
        if (is_string($requestedId) && $requestedId !== '') {
            $sql     .= " AND `$idColumn` = ?";
            $params[] = $requestedId;
        }

        // Row-level scope: a consignee sees their own company's records, a
        // cargo officer sees their station's. Applied in SQL, so out-of-scope
        // rows never leave the database — the portals used to filter in the
        // browser, which meant every record was already on the client.
        if (isset($spec['scope'])) {
            $scope  = Rbac::scopeClause($user, $spec['scope']);
            $sql   .= $scope['sql'];
            $params = array_merge($params, $scope['params']);
        }

        // Delta sync: ?since=<iso8601> returns only what changed.
        $since = $_GET['since'] ?? null;
        if (is_string($since) && $since !== '' && self::hasColumn($table, 'updated_at')) {
            $sql     .= ' AND `updated_at` > ?';
            $params[] = $since;
        }

        $sql .= ' ORDER BY ' . ($spec['orderBy'] ?? '`' . $idColumn . '` DESC');

        $limit  = min(max((int) ($_GET['limit'] ?? 1000), 1), 5000);
        $offset = max((int) ($_GET['offset'] ?? 0), 0);
        $sql   .= " LIMIT $limit OFFSET $offset";

        $stmt = Db::conn()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Expand the *Text columns that hold JSON back into real structures.
        $jsonColumns = $spec['jsonColumns'] ?? [];
        $rows = array_map(static function (array $row) use ($jsonColumns): array {
            foreach ($jsonColumns as $field => $column) {
                $raw          = $row[$column] ?? null;
                $decoded      = $raw !== null && $raw !== '' ? json_decode((string) $raw, true) : null;
                $row[$field]  = is_array($decoded) ? $decoded : [];
                unset($row[$column]);
            }
            return $row;
        }, $rows);

        // ETag lets an unchanged poll answer 304 with no body. With the client
        // polling every 5s per tab, most responses are byte-identical.
        $etag = '"' . substr(hash('sha256', json_encode($rows) ?: ''), 0, 32) . '"';
        header('ETag: ' . $etag);
        if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
            http_response_code(304);
            exit;
        }

        Response::data($rows);
    }

    /** @param array<string,mixed> $spec */
    private static function write(array $spec): never
    {
        $body   = Http::jsonBody();
        $action = strtoupper((string) ($body['action'] ?? 'UPSERT'));

        $table    = $spec['table'];
        $entity   = $spec['entity'];
        $idColumn = $spec['idColumn'] ?? 'id';

        // ── Purge ───────────────────────────────────────────────────────────
        //
        // This used to be an unauthenticated POST that emptied the table.
        if ($action === 'PURGE_ALL') {
            $actor = self::requireCapability($spec['capabilities'], 'purge');

            // Destroying operational records should not be a single
            // mistyped request, so it takes an explicit confirmation.
            if (($body['confirm'] ?? null) !== $table) {
                Response::error(
                    'Purging is irreversible. Repeat the request with {"confirm":"' . $table . '"} to proceed.',
                    422
                );
            }

            $count = (int) Db::conn()->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
            Db::conn()->exec("DELETE FROM `$table`");

            Audit::record('collection.purge', $entity, null, Audit::SUCCESS, [
                'table'        => $table,
                'rowsDeleted'  => $count,
            ], $actor);

            Response::ok(['message' => "Purged $count record(s).", 'deleted' => $count]);
        }

        // ── Delete ──────────────────────────────────────────────────────────
        if ($action === 'DELETE') {
            $actor = self::requireCapability($spec['capabilities'], 'delete', 'write');

            $id = (string) ($body['id'] ?? '');
            if ($id === '') {
                Response::error('An id is required.', 422);
            }

            $existing = self::fetchRow($table, $idColumn, $id);
            if ($existing === null) {
                Response::error(ucfirst($entity) . ' not found.', 404);
            }
            if (isset($spec['scope']['company'])) {
                Rbac::assertCanTouchRow($actor, $existing, $spec['scope']['company']);
            }

            Db::conn()->prepare("DELETE FROM `$table` WHERE `$idColumn` = ?")->execute([$id]);

            Audit::record('collection.delete', $entity, $id, Audit::SUCCESS, null, $actor);
            Response::ok(['message' => ucfirst($entity) . ' deleted.']);
        }

        // ── Upsert ──────────────────────────────────────────────────────────
        if ($action !== 'UPSERT') {
            Response::error('Unknown action.', 400);
        }

        $actor = self::requireCapability($spec['capabilities'], 'write');

        // A single record, not the whole collection.
        $payload = $body['record'] ?? $body[$entity] ?? null;
        if (!is_array($payload)) {
            Response::error(
                'Send one record as {"action":"upsert","record":{...}}. '
                . 'Submitting the whole collection is no longer supported, because concurrent '
                . 'writers silently overwrote each other.',
                422
            );
        }

        $id       = (string) ($payload[$idColumn] ?? '');
        $existing = $id !== '' ? self::fetchRow($table, $idColumn, $id) : null;

        if ($existing !== null && isset($spec['scope']['company'])) {
            Rbac::assertCanTouchRow($actor, $existing, $spec['scope']['company']);
        }

        // Optimistic concurrency: if the caller tells us which version they
        // read, refuse to overwrite a newer one.
        $versioned = ($spec['versioned'] ?? false) && self::hasColumn($table, 'version');
        if ($versioned && $existing !== null && isset($payload['version'])) {
            $sent    = (int) $payload['version'];
            $current = (int) ($existing['version'] ?? 1);
            if ($sent !== $current) {
                Response::error(
                    'This record changed since you loaded it. Reload and reapply your edit.',
                    409,
                    ['expectedVersion' => $current, 'submittedVersion' => $sent, 'current' => $existing]
                );
            }
        }

        /** @var callable $validate */
        $validate = $spec['validate'];
        $clean    = $validate($payload, $actor);

        if ($id === '') {
            $id = strtolower(substr($entity, 0, 4)) . '_' . bin2hex(random_bytes(8));
        }
        $clean[$idColumn] = $id;

        // Fold structured fields back into their *Text storage columns.
        foreach (($spec['jsonColumns'] ?? []) as $field => $column) {
            if (array_key_exists($field, $payload)) {
                $clean[$column] = json_encode($payload[$field] ?? []);
            }
        }

        $now = gmdate('Y-m-d\TH:i:s\Z');
        if (self::hasColumn($table, 'updated_at')) {
            $clean['updated_at'] = $now;
        }
        if (self::hasColumn($table, 'createdAt') && $existing === null && !isset($clean['createdAt'])) {
            $clean['createdAt'] = $now;
        }
        if ($versioned) {
            $clean['version'] = $existing === null ? 1 : ((int) ($existing['version'] ?? 1)) + 1;
        }

        // Only write columns that actually exist, so a stray field in the
        // payload cannot fail the whole request.
        $columns = array_values(array_filter(
            array_keys($clean),
            static fn($c) => self::hasColumn($table, (string) $c)
        ));
        $values = array_map(static fn($c) => $clean[$c], $columns);

        $sql = Db::upsertSql($table, $columns, [$idColumn]);
        Db::conn()->prepare($sql)->execute($values);

        if (isset($spec['onWrite']) && is_callable($spec['onWrite'])) {
            $spec['onWrite'](Db::conn(), $clean, $actor);
        }

        Audit::record(
            $existing === null ? 'collection.create' : 'collection.update',
            $entity,
            $id,
            Audit::SUCCESS,
            null,
            $actor
        );

        $saved = self::fetchRow($table, $idColumn, $id);
        Response::json([
            'status' => 'success',
            'record' => $saved,
            $entity  => $saved,
        ], $existing === null ? 201 : 200);
    }

    /** @return array<string,mixed>|null */
    private static function fetchRow(string $table, string $idColumn, string $id): ?array
    {
        $stmt = Db::conn()->prepare("SELECT * FROM `$table` WHERE `$idColumn` = ? LIMIT 1");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    /** @var array<string,string[]> */
    private static array $columnCache = [];

    /** Column names of a table, cached per request. */
    public static function columns(string $table): array
    {
        if (isset(self::$columnCache[$table])) {
            return self::$columnCache[$table];
        }

        $names = [];
        try {
            if (Db::isMysql()) {
                $stmt = Db::conn()->prepare(
                    'SELECT COLUMN_NAME FROM information_schema.COLUMNS
                      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?'
                );
                $stmt->execute([$table]);
                $names = array_map(static fn($r) => (string) $r['COLUMN_NAME'], $stmt->fetchAll());
            } else {
                $rows  = Db::conn()->query("PRAGMA table_info(`$table`)")->fetchAll();
                $names = array_map(static fn($r) => (string) $r['name'], $rows);
            }
        } catch (Throwable $e) {
            error_log('[bueno][collection] column introspection failed for ' . $table . ': ' . $e->getMessage());
        }

        self::$columnCache[$table] = $names;
        return $names;
    }

    public static function hasColumn(string $table, string $column): bool
    {
        return in_array($column, self::columns($table), true);
    }
}
