<?php
/**
 * Bueno Freight OS — Company registry
 *
 *   GET  /api/companies.php[?id=|q=|since=]
 *   POST /api/companies.php {action:"upsert", record:{...}}
 *   POST /api/companies.php {action:"merge",  sourceId, targetId}
 *
 * The organisations the platform does business with, each with a stable id
 * that trips, deals, invoices and accounts point at. Replaces matching
 * customers by the spelling of their name, which meant a rename detached a
 * company's entire history and the same organisation keyed two ways was two
 * organisations.
 *
 * Merging is the repair for the second case. It is deliberately an explicit,
 * audited action rather than something the matcher does on its own: folding
 * two genuinely different organisations together would show one customer the
 * other's freight and invoices.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';
require_once __DIR__ . '/_lib/company.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

// ── Merge one organisation into another ─────────────────────────────────────
if ($action === 'MERGE') {
    // Repointing every record of one company onto another is destructive in
    // the sense that matters here: it changes who can see what. It needs the
    // same authority as editing the permissions matrix.
    $actor = Rbac::require('system.permissions_edit');

    $data = Validator::for($body)
        ->identifier('sourceId', true, 100)
        ->identifier('targetId', true, 100)
        ->validated();

    $result = Company::merge($data['sourceId'], $data['targetId'], $actor);

    Response::ok([
        'merged' => $data['sourceId'],
        'into'   => $data['targetId'],
        'moved'  => $result['moved'],
    ]);
}

// ── Suggest likely duplicates ───────────────────────────────────────────────
//
// Surfaces organisations whose folded names are close enough to be worth a
// human deciding about. It proposes; it never merges.
if ($method === 'GET' && isset($_GET['duplicates'])) {
    Rbac::require('users.view');

    $rows = Db::conn()->query(
        'SELECT id, name, matchKey FROM bueno_companies
          WHERE mergedIntoId IS NULL ORDER BY name ASC'
    )->fetchAll();

    $pairs = [];
    $count = count($rows);
    for ($i = 0; $i < $count; $i++) {
        for ($j = $i + 1; $j < $count; $j++) {
            $a = (string) $rows[$i]['matchKey'];
            $b = (string) $rows[$j]['matchKey'];
            if ($a === '' || $b === '') {
                continue;
            }

            // One name containing the other, or a small edit apart.
            $contains = str_contains($a, $b) || str_contains($b, $a);
            $distance = levenshtein(substr($a, 0, 100), substr($b, 0, 100));
            $close    = $distance > 0 && $distance <= 3;

            if ($contains || $close) {
                $pairs[] = [
                    'a'      => ['id' => $rows[$i]['id'], 'name' => $rows[$i]['name']],
                    'b'      => ['id' => $rows[$j]['id'], 'name' => $rows[$j]['name']],
                    'reason' => $contains ? 'one name contains the other' : "{$distance} character(s) apart",
                ];
            }
            if (count($pairs) >= 50) {
                break 2;
            }
        }
    }

    Response::json([
        'status'     => 'success',
        'data'       => $pairs,
        'count'      => count($pairs),
        'serverTime' => gmdate('Y-m-d\TH:i:s\Z'),
    ], 200);
}

// ── Standard collection handling ────────────────────────────────────────────
Collection::handle([
    'table'  => 'bueno_companies',
    'entity' => 'company',

    'capabilities' => [
        /*
         * users.view alone, and deliberately not deals.view.
         *
         * Every consignee holds deals.view, so including it made the whole
         * registry readable by any customer -- handing one customer the names
         * and contact details of every other organisation the business works
         * with. The client list is commercially sensitive on its own.
         *
         * users.view is held by the administrative and commercial roles that
         * actually maintain the registry.
         */
        'read'   => 'users.view',
        'write'  => 'users.create',
        'delete' => 'users.delete',
        'purge'  => 'system.purge_data',
    ],

    'orderBy'   => '`name` ASC',
    'versioned' => true,

    // Belt and braces: no capability grant, present or future, should make
    // the client list readable by a client.
    'beforeRead' => static function (array $actor): void {
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Customer accounts cannot read the company registry.', 403);
        }
    },

    'validate' => static function (array $input, array $actor): array {
        if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
            Response::error('Customer accounts cannot edit the company registry.', 403);
        }

        $clean = Validator::for($input)
            ->string('name', true, 191, 2)
            ->string('rcNumber', false, 100)
            ->string('industry', false, 100)
            ->string('contactName', false, 191)
            ->email('contactEmail', false)
            ->string('contactPhone', false, 32)
            ->string('address', false, 255)
            ->enum('status', ['ACTIVE', 'DORMANT', 'MERGED'], false, 'ACTIVE')
            ->boolean('isExternal', true)
            ->validated();

        /*
         * The match key is derived, never submitted.
         *
         * It is what decides which organisation a name refers to, so letting
         * a caller set it directly would let them point one company's key at
         * another's records.
         */
        $clean['matchKey'] = Company::matchKey($clean['name']);
        if ($clean['matchKey'] === '') {
            Response::error('That company name does not contain anything to match on.', 422);
        }

        // A second row on the same key would make "which company is this?"
        // ambiguous, which is the fault this table exists to remove.
        $existing = Db::conn()->prepare(
            'SELECT id FROM bueno_companies WHERE matchKey = ? AND id <> ? LIMIT 1'
        );
        $existing->execute([$clean['matchKey'], (string) ($input['id'] ?? '')]);
        if ($existing->fetchColumn() !== false) {
            Response::error(
                'Another company is already registered under that name. '
              . 'Merge them instead of creating a second record.',
                409
            );
        }

        // Merge state is set by the merge action, which repoints the records
        // at the same time. Accepting it here would strand them.
        unset($clean['mergedIntoId']);

        if (($clean['createdBy'] ?? null) === null) {
            $clean['createdBy'] = (string) ($actor['fullName'] ?? $actor['id'] ?? 'system');
        }

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
