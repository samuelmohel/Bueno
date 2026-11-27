<?php
/**
 * Bueno Freight OS — Corridor GPS telemetry
 *
 *   GET  /api/gps.php?tripId=…        latest fix + breadcrumb trail
 *   GET  /api/gps.php?locomotiveId=…  same, by locomotive
 *   POST /api/gps.php {tripId, lat, lng, …}   record a position
 *
 * Append-only, so it does not use the generic collection handler.
 *
 * Position reports come from an escort officer's phone in the field, over a
 * mobile connection, every few seconds. That shapes two decisions: the write
 * is rate limited per trip rather than rejected outright when it arrives
 * faster than expected, and a consignee can read the trail for their own
 * consignment but not anyone else's.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';

$method = Http::method();

// ── Read ────────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $user = Rbac::require('ops.gps_telemetry');

    $tripId = (string) ($_GET['tripId'] ?? '');
    $locoId = (string) ($_GET['locomotiveId'] ?? $_GET['locoId'] ?? '');

    // Knowing where a train is reveals whose cargo is where, so a caller who
    // is scoped at all is confined to trips they can already reach.
    //
    // This previously applied to consignees only, and compared the company
    // name byte-for-byte. Two consequences: a cargo officer could watch every
    // train on the network regardless of posting, and a consignee whose
    // record carried a trailing space or different capitalisation could see
    // the consignment in their portal but never track it — the list query
    // compares case- and whitespace-insensitively, this did not.
    $scope = Rbac::scopeFor($user);
    if ($scope['scope'] !== 'all') {
        if ($tripId === '') {
            Response::error('Specify the trip you want to track.', 422);
        }
        $check = Db::conn()->prepare(
            'SELECT id, company, origin, destination FROM bueno_trips
              WHERE id = ? OR tripId = ? LIMIT 1'
        );
        $check->execute([$tripId, $tripId]);
        $trip = $check->fetch();

        if ($trip === false || !Rbac::canReachTrip($user, $trip)) {
            // Same answer whether the trip is someone else's or does not
            // exist, so this cannot be used to enumerate trips.
            Response::error('Trip not found.', 404);
        }
    }

    $limit = min(max((int) ($_GET['limit'] ?? 50), 1), 500);

    if ($tripId !== '') {
        $stmt = Db::conn()->prepare(
            "SELECT * FROM bueno_gps_logs WHERE tripId = ? ORDER BY timestamp DESC LIMIT $limit"
        );
        $stmt->execute([$tripId]);
    } elseif ($locoId !== '') {
        $stmt = Db::conn()->prepare(
            "SELECT * FROM bueno_gps_logs WHERE locomotiveId = ? ORDER BY timestamp DESC LIMIT $limit"
        );
        $stmt->execute([$locoId]);
    } else {
        $stmt = Db::conn()->query("SELECT * FROM bueno_gps_logs ORDER BY timestamp DESC LIMIT $limit");
    }

    $logs = $stmt->fetchAll();

    Response::json([
        'status'      => 'success',
        'latest'      => $logs[0] ?? null,
        'breadcrumbs' => array_reverse($logs),
        'count'       => count($logs),
        'serverTime'  => gmdate('Y-m-d\TH:i:s\Z'),
    ], 200);
}

if ($method !== 'POST') {
    Response::error('Method not allowed.', 405);
}

// ── Record a position ───────────────────────────────────────────────────────
$actor = Rbac::require('ops.loading_update');
$body  = Http::jsonBody();

$data = Validator::for($body)
    ->identifier('tripId', true, 100)
    ->identifier('locomotiveId', false, 100)
    ->number('lat', true, -90, 90)
    ->number('lng', true, -180, 180)
    ->integer('speed', false, 0, 400)
    ->number('heading', false, 0, 360)
    ->number('accuracy', false, 0, 10000)
    ->integer('batteryLevel', false, 0, 100)
    ->string('officerPhone', false, 32)
    ->string('signalQuality', false, 50)
    ->validated();

/*
 * The trip has to exist, and the reporter has to be connected to it.
 *
 * Neither was checked. The capability alone let any account holding
 * ops.loading_update write a position for any tripId at all — including one
 * that does not exist, which silently filled the telemetry table with
 * breadcrumbs belonging to nothing, and including another terminal's train,
 * which moved it on the live map for every viewer.
 */
$tripStmt = Db::conn()->prepare(
    'SELECT id, tripId, company, origin, destination, status
       FROM bueno_trips WHERE id = ? OR tripId = ? LIMIT 1'
);
$tripStmt->execute([$data['tripId'], $data['tripId']]);
$trip = $tripStmt->fetch();

if ($trip === false) {
    Response::error('No such consignment.', 404);
}

if (!Rbac::canReachTrip($actor, $trip)) {
    Audit::record('gps.scope_denied', 'trip', (string) $data['tripId'], Audit::DENIED, [
        'origin'      => $trip['origin'] ?? null,
        'destination' => $trip['destination'] ?? null,
    ], $actor);
    Response::error('You do not have permission to report positions for this consignment.', 403);
}

// One fix per trip every couple of seconds is plenty; this bounds how fast
// the table can grow if a handset gets stuck in a retry loop.
RateLimit::enforce('gps:' . $data['tripId'], Config::int('GPS_RATE', 60), 60);

Db::transaction(static function (PDO $pdo) use ($data): void {
    $now = gmdate('Y-m-d\TH:i:s\Z');

    $pdo->prepare(
        'INSERT INTO bueno_gps_logs
            (id, tripId, locomotiveId, lat, lng, speed, heading, accuracy,
             batteryLevel, officerPhone, signalQuality, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        'gps_' . bin2hex(random_bytes(10)),
        $data['tripId'],
        $data['locomotiveId'],
        $data['lat'],
        $data['lng'],
        $data['speed'] ?? 0,
        $data['heading'] ?? 0,
        $data['accuracy'] ?? 3,
        $data['batteryLevel'] ?? 100,
        $data['officerPhone'],
        $data['signalQuality'] ?? 'MOBILE_PHONE_GPS_LIVE',
        $now,
    ]);

    // Keep the trip's own last-known position in step, so the tracking list
    // does not need a correlated subquery per row.
    $pdo->prepare(
        'UPDATE bueno_trips SET curLat = ?, curLng = ?, speed = ?, updated_at = ?
          WHERE id = ? OR tripId = ?'
    )->execute([
        $data['lat'],
        $data['lng'],
        $data['speed'] ?? 0,
        $now,
        $data['tripId'],
        $data['tripId'],
    ]);
});

// Deliberately not audited: a position report every few seconds would drown
// the audit log without telling anyone anything they cannot read from the
// breadcrumb trail itself.
Response::ok(['recorded' => true, 'serverTime' => gmdate('Y-m-d\TH:i:s\Z')]);
