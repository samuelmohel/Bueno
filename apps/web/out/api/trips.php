<?php
/**
 * Bueno Freight OS — Freight haulage trips
 *
 *   GET  /api/trips.php[?id=|since=|limit=|offset=]
 *   POST /api/trips.php {action:"upsert", record:{...}}
 *   POST /api/trips.php {action:"delete", id:"..."}
 *   POST /api/trips.php {action:"purge_all", confirm:"bueno_trips"}
 *
 * Replaces a version that answered an unauthenticated GET with every trip,
 * accepted an unauthenticated PURGE_ALL, wrote the whole collection on each
 * save, and mirrored everything into a world-readable JSON file next to
 * itself. It also had a real defect in the list mapper: `unset($row[...])`
 * inside a closure over `$r`, so the raw *Text columns were never stripped.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

const TRIP_STATUSES = [
    'LOADING', 'PENDING_DISPATCH', 'IN_TRANSIT', 'ARRIVED',
    'UNLOADING', 'COMPLETED', 'RETURNING_EMPTY', 'CANCELLED',
];

Collection::handle([
    'table'  => 'bueno_trips',
    'entity' => 'trip',

    'capabilities' => [
        // Staff reach trips through the deals desk; a consignee tracking their
        // own consignment holds deals.view without the desk itself.
        'read'   => ['deals', 'deals.view'],
        'write'  => 'ops.loading_update',
        'delete' => 'deals.delete',
        'purge'  => 'system.purge_data',
    ],

    // A consignee sees only their own company's trips; a cargo officer sees
    // trips touching their station at either end.
    'scope' => [
        'company' => 'company',
        'station' => ['origin', 'destination'],
    ],

    'orderBy'   => '`updated_at` DESC, `id` DESC',
    'versioned' => true,

    'jsonColumns' => [
        'wagonLogs'    => 'wagonLogsText',
        'feederTrucks' => 'feederTrucksText',
        'damages'      => 'damagesText',
        'unloadLogs'   => 'unloadLogsText',
    ],

    'validate' => static function (array $input, array $actor): array {
        $v = Validator::for($input)
            ->identifier('tripId', false, 100)
            ->identifier('dealNumber', false, 100)
            ->identifier('locomotiveId', false, 100)
            ->string('cargoOfficerName', false, 191)
            ->string('unloadingOfficerName', false, 191)
            ->string('escortOfficerName', false, 191)
            ->string('escortPhone', false, 32)
            ->identifier('escortWagonId', false, 100)
            ->string('company', true, 191)
            ->email('clientEmail', false)
            ->string('cargoType', false, 191)
            ->string('unitOfMeasure', false, 50)
            ->string('wagonType', false, 100)
            ->string('quantity', false, 100)
            ->identifier('origin', false, 16)
            ->identifier('destination', false, 16)
            ->enum('status', TRIP_STATUSES, false, 'LOADING')
            // Coordinates are bounded: an out-of-range value silently breaks
            // the tracking map rather than failing visibly.
            ->number('curLat', false, -90, 90)
            ->number('curLng', false, -180, 180)
            ->integer('speed', false, 0, 400)
            ->string('departedAt', false, 64)
            ->string('completedAt', false, 64)
            ->string('dispatchTime', false, 64)
            ->number('tripRevenue', false, 0)
            ->number('tripCost', false, 0)
            ->string('createdAt', false, 64);

        $clean = $v->validated();

        // Money is a finance decision, not an operations one. A cargo officer
        // may log bags and seals but must not be able to set what the trip
        // earned or cost by including the field in their payload.
        if (!Rbac::can($actor, 'finance.deal_costing')) {
            unset($clean['tripRevenue'], $clean['tripCost']);
        }

        // Drop nulls so an upsert never blanks a column the caller omitted.
        return array_filter($clean, static fn($value) => $value !== null);
    },
]);
