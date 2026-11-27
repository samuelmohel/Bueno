<?php
/**
 * Bueno Freight OS — General journal
 *
 *   GET  /api/journal.php[?id=|from=&to=|account=|source=&sourceId=|limit=]
 *   POST /api/journal.php {action:"post",    entry:{narration, entryDate, lines:[...]}}
 *   POST /api/journal.php {action:"reverse", id, reason}
 *
 * The ledger itself. Append-only: there is no update and no delete, because
 * a posted entry is a statement about what the books said at a moment, and
 * editing one rewrites history that an auditor is entitled to see. A mistake
 * is corrected by posting its reversal.
 *
 * Previously the journal was an array in the browser's localStorage, so the
 * entries existed only on the machine that keyed them and nothing checked
 * that they balanced.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';
require_once __DIR__ . '/_lib/ledger.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

// ── Post an entry ───────────────────────────────────────────────────────────
if ($action === 'POST' || $action === 'CREATE') {
    $actor = Rbac::require('finance.journal_create');

    if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
        Response::error('Customer accounts cannot post to the ledger.', 403);
    }

    $entryInput = $body['entry'] ?? $body['record'] ?? null;
    if (!is_array($entryInput)) {
        Response::error('Send the entry as {"action":"post","entry":{...}}.', 422);
    }

    // Posting is cheap to do and expensive to undo, so an accidental retry
    // loop should not fill the ledger.
    RateLimit::enforce('journal:' . ($actor['id'] ?? 'anon'), Config::int('JOURNAL_RATE', 120), 300);

    $entry = Ledger::post($entryInput, $actor);

    Response::json([
        'status' => 'success',
        'entry'  => $entry,
        'record' => $entry,
    ], 201);
}

// ── Reverse an entry ────────────────────────────────────────────────────────
if ($action === 'REVERSE') {
    /*
     * Reversing is not an ordinary posting.
     *
     * It restates a figure that may already have been reported, so it needs
     * the authority that signs off on the books rather than the one that
     * keys them.
     */
    $actor = Rbac::require('finance.journal_create');
    if (!Rbac::can($actor, 'finance.statements_view') && !Rbac::can($actor, 'finance.coa_manage')) {
        Audit::record('ledger.reverse', 'journal_entry', (string) ($body['id'] ?? ''), Audit::DENIED, [
            'reason' => 'insufficient_authority',
        ], $actor);
        Response::error(
            'Reversing a posted entry restates the books and needs finance sign-off authority.',
            403
        );
    }

    $data = Validator::for($body)
        ->identifier('id', true, 100)
        ->string('reason', true, 500, 3)
        ->validated();

    $reversal = Ledger::reverse($data['id'], $data['reason'], $actor);

    Response::json(['status' => 'success', 'entry' => $reversal, 'record' => $reversal], 201);
}

if ($method === 'POST') {
    // Being explicit beats a generic 400: the absence of an update path is a
    // decision, not an oversight.
    Response::error(
        'The journal is append-only. Post a new entry, or reverse an existing one — '
      . 'posted entries are never edited or deleted.',
        405
    );
}

if ($method !== 'GET') {
    Response::error('Method not allowed.', 405);
}

// ── Read ────────────────────────────────────────────────────────────────────

$actor = Rbac::requireAny('finance.coa_view', 'finance.statements_view', 'finance.journal_create');

if (Capabilities::isExternalRole((string) ($actor['role'] ?? ''))) {
    Response::error('Customer accounts cannot read the ledger.', 403);
}

// A single entry, with its lines.
$one = trim((string) ($_GET['id'] ?? ''));
if ($one !== '') {
    $entry = Ledger::entry($one);
    if ($entry === null) {
        Response::error('Journal entry not found.', 404);
    }
    Response::json([
        'status'     => 'success',
        'data'       => [$entry],
        'count'      => 1,
        'serverTime' => gmdate('Y-m-d\TH:i:s\Z'),
    ], 200);
}

$sql    = 'SELECT * FROM bueno_journal_entries WHERE 1 = 1';
$params = [];

foreach ([['from', '>='], ['to', '<=']] as [$key, $op]) {
    $v = trim((string) ($_GET[$key] ?? ''));
    if ($v !== '') {
        $sql     .= " AND entryDate {$op} ?";
        $params[] = substr($v, 0, 10);
    }
}

$sourceType = trim((string) ($_GET['source'] ?? $_GET['sourceType'] ?? ''));
if ($sourceType !== '') {
    $sql     .= ' AND sourceType = ?';
    $params[] = $sourceType;
}
$sourceId = trim((string) ($_GET['sourceId'] ?? ''));
if ($sourceId !== '') {
    $sql     .= ' AND sourceId = ?';
    $params[] = $sourceId;
}

$since = trim((string) ($_GET['since'] ?? ''));
if ($since !== '') {
    $sql     .= ' AND updated_at > ?';
    $params[] = $since;
}

// Entries touching one account, for an account enquiry.
$account = trim((string) ($_GET['account'] ?? ''));
if ($account !== '') {
    $acc = Ledger::account($account);
    if ($acc === null) {
        Response::error('No such account.', 404);
    }
    $sql     .= ' AND id IN (SELECT entryId FROM bueno_journal_lines WHERE accountId = ?)';
    $params[] = $acc['id'];
}

$limit  = min(max((int) ($_GET['limit'] ?? 200), 1), 1000);
$offset = max((int) ($_GET['offset'] ?? 0), 0);
$sql   .= " ORDER BY entryDate DESC, entryNumber DESC LIMIT {$limit} OFFSET {$offset}";

$stmt = Db::conn()->prepare($sql);
$stmt->execute($params);
$entries = $stmt->fetchAll();

// Attach the lines in one query rather than one per entry.
if ($entries !== []) {
    $ids    = array_column($entries, 'id');
    $marks  = implode(',', array_fill(0, count($ids), '?'));
    $lines  = Db::conn()->prepare(
        "SELECT * FROM bueno_journal_lines WHERE entryId IN ($marks) ORDER BY entryId, lineNo ASC"
    );
    $lines->execute($ids);

    $byEntry = [];
    foreach ($lines->fetchAll() as $line) {
        $byEntry[(string) $line['entryId']][] = $line;
    }
    foreach ($entries as &$e) {
        $e['lines'] = $byEntry[(string) $e['id']] ?? [];
    }
    unset($e);
}

Response::json([
    'status'     => 'success',
    'data'       => $entries,
    'count'      => count($entries),
    'serverTime' => gmdate('Y-m-d\TH:i:s\Z'),
], 200);
