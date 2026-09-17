<?php
/**
 * Bueno Freight OS — In-app notifications
 *
 *   GET  /api/notifications.php[?since=]
 *   POST /api/notifications.php {action:"upsert",   record:{...}}
 *   POST /api/notifications.php {action:"mark_read", id:"..."}
 *   POST /api/notifications.php {action:"mark_all_read"}
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

$method = Http::method();
$body   = $method === 'POST' ? Http::jsonBody() : [];
$action = strtoupper((string) ($body['action'] ?? ''));

if ($action === 'MARK_READ' || $action === 'MARK_ALL_READ') {
    $actor = Auth::require();
    $now   = gmdate('Y-m-d\TH:i:s\Z');

    if ($action === 'MARK_ALL_READ') {
        Db::conn()->prepare('UPDATE bueno_notifications SET readInt = 1, updated_at = ?')->execute([$now]);
        Response::ok(['message' => 'All notifications marked read.']);
    }

    $data = Validator::for($body)->identifier('id', true, 100)->validated();
    $stmt = Db::conn()->prepare('UPDATE bueno_notifications SET readInt = 1, updated_at = ? WHERE id = ?');
    $stmt->execute([$now, $data['id']]);

    if ($stmt->rowCount() === 0) {
        Response::error('Notification not found.', 404);
    }
    Response::ok(['message' => 'Marked read.']);
}

Collection::handle([
    'table'  => 'bueno_notifications',
    'entity' => 'notification',

    'capabilities' => [
        // Any signed-in user may read their notification feed; 'account' is
        // held by every role including consignees.
        'read'   => 'account',
        'write'  => 'analytics',
        'delete' => 'system.purge_data',
        'purge'  => 'system.purge_data',
    ],

    'orderBy' => '`id` DESC',

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->string('title', true, 191, 2)
            ->string('body', false, 2000)
            ->string('time', false, 64)
            ->identifier('type', false, 64)
            ->identifier('targetId', false, 191)
            ->identifier('targetTab', false, 64)
            ->integer('readInt', false, 0, 1)
            ->validated();

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
