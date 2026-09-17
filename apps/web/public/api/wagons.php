<?php
/**
 * Bueno Freight OS — Rolling stock registry
 *
 *   GET  /api/wagons.php[?since=]
 *   POST /api/wagons.php {action:"upsert", record:{...}}
 *   POST /api/wagons.php {action:"delete", id:"PXG 09029"}
 *
 * Adding or retiring a wagon changes the official fleet register, so it needs
 * fleet.register rather than the everyday fleet.assign used when allocating
 * wagons to a consist.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

Collection::handle([
    'table'  => 'bueno_wagons',
    'entity' => 'wagon',

    'capabilities' => [
        'read'   => 'fleet.view',
        'write'  => 'fleet.register',
        'delete' => 'fleet.register',
        'purge'  => 'system.purge_data',
    ],

    'orderBy'   => '`id` ASC',
    'versioned' => true,

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->identifier('id', false, 64)
            ->string('wagonType', false, 100)
            ->string('payloadCapacity', false, 100)
            ->integer('capacity', false, 1, 100000)
            ->enum('status', [
                'AVAILABLE', 'LOADING', 'LOADED', 'IN_USE', 'IN_TRANSIT',
                'UNLOADING', 'RETURNING_EMPTY', 'EMPTY', 'MAINTENANCE',
            ], false, 'AVAILABLE')
            ->identifier('currentStation', false, 64)
            ->enum('gauge', ['STANDARD_GAUGE', 'NARROW_GAUGE'], false, 'STANDARD_GAUGE')
            ->string('createdAt', false, 64)
            ->validated();

        // Flagging a wagon out of service is a maintenance decision.
        if (($clean['status'] ?? null) === 'MAINTENANCE' && !Rbac::can($actor, 'fleet.maintenance')) {
            Response::error('Flagging rolling stock for maintenance requires the fleet.maintenance capability.', 403);
        }

        $clean['addedBy'] = (string) ($actor['fullName'] ?? 'System Registry');

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
