<?php
/**
 * Bueno Freight OS — Public consignment tracking
 *
 *   GET /api/public_track.php?ref=TRP-8841
 *
 * The one deliberately public read on the platform: a consignee with a
 * reference should be able to see where their freight is without an account,
 * which is what the landing page advertises.
 *
 * Because it is public, it is built narrowly:
 *
 *   - Lookup is by exact reference only. No listing, no wildcards, nothing
 *     that lets someone walk the table.
 *   - The response carries movement information only. Commercial terms,
 *     pricing, officer identities, escort contact details and the consignee's
 *     email are all withheld — a reference is not proof of identity, and
 *     references get forwarded in email threads.
 *   - Rate limited per address, so it cannot be used to guess references at
 *     volume.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/bootstrap.php';

if (Http::method() !== 'GET') {
    Response::error('Method not allowed.', 405);
}

// Guessing references is the obvious attack; make it slow.
RateLimit::enforce('track:' . Http::clientIp(), Config::int('TRACK_RATE', 30), 300);

$ref = trim((string) ($_GET['ref'] ?? $_GET['code'] ?? $_GET['id'] ?? ''));

if ($ref === '' || mb_strlen($ref) > 100) {
    Response::error('Provide a tracking or trip reference.', 422);
}

$stmt = Db::conn()->prepare(
    'SELECT id, tripId, dealNumber, company, cargoType, unitOfMeasure, quantity,
            origin, destination, status, curLat, curLng, speed,
            departedAt, completedAt, dispatchTime, updated_at
       FROM bueno_trips
      WHERE tripId = ? OR id = ? OR dealNumber = ?
      LIMIT 1'
);
$stmt->execute([$ref, $ref, $ref]);
$trip = $stmt->fetch();

if ($trip === false) {
    // Deliberately identical whether the reference is unknown or simply not
    // yours, so this cannot confirm that a reference exists.
    Response::error('No consignment found for that reference.', 404);
}

/** Terminal codes to names, for display. */
const TERMINALS = [
    'EWK'  => 'Ewekoro Terminal',
    'PAPA' => 'Papalanto Terminal',
    'ITO'  => 'Itori Junction',
    'MNY'  => 'Moniya Yard (Ibadan)',
    'MONI' => 'Moniya Yard (Ibadan)',
    'ILR'  => 'Ilorin Freight Hub',
    'APT'  => 'Apapa Maritime Port',
    'IDD'  => 'Iddo Terminal',
    'DGB'  => 'Ibadan (Dugbe)',
    'ENL'  => 'ENL Terminal',
];

function terminal_name(?string $code): string
{
    $code = (string) $code;
    return TERMINALS[$code] ?? $code;
}

// Recent breadcrumbs, so the map can draw the corridor progress.
$crumbs = [];
try {
    $c = Db::conn()->prepare(
        'SELECT lat, lng, speed, timestamp
           FROM bueno_gps_logs
          WHERE tripId = ?
          ORDER BY timestamp DESC
          LIMIT 50'
    );
    $c->execute([$trip['tripId'] ?: $trip['id']]);
    $crumbs = array_reverse($c->fetchAll());
} catch (Throwable $e) {
    error_log('[bueno][track] breadcrumbs unavailable: ' . $e->getMessage());
}

Response::json([
    'status' => 'success',
    'data'   => [
        'reference'    => $trip['tripId'] ?: $trip['id'],
        'dealNumber'   => $trip['dealNumber'] ?: null,
        // The consignee's organisation is shown because they are the party
        // holding the reference; their contact details are not.
        'consignee'    => $trip['company'],
        'cargoType'    => $trip['cargoType'],
        'quantity'     => $trip['quantity'],
        'unit'         => $trip['unitOfMeasure'],
        'origin'       => terminal_name($trip['origin']),
        'destination'  => terminal_name($trip['destination']),
        'originCode'      => $trip['origin'],
        'destinationCode' => $trip['destination'],
        'tripStatus'   => $trip['status'],
        'position'     => [
            'lat'   => $trip['curLat'] !== null ? (float) $trip['curLat'] : null,
            'lng'   => $trip['curLng'] !== null ? (float) $trip['curLng'] : null,
            'speed' => (int) ($trip['speed'] ?? 0),
        ],
        'departedAt'   => $trip['departedAt'] ?: ($trip['dispatchTime'] ?: null),
        'completedAt'  => $trip['completedAt'] ?: null,
        'lastUpdated'  => $trip['updated_at'] ?: null,
        'breadcrumbs'  => $crumbs,
    ],
    'serverTime' => gmdate('Y-m-d\TH:i:s\Z'),
], 200);
