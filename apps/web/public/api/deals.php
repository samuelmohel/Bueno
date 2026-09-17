<?php
/**
 * Bueno Freight OS — Commercial freight deals
 *
 *   GET  /api/deals.php[?id=|since=]
 *   POST /api/deals.php {action:"upsert", record:{...}}
 *   POST /api/deals.php {action:"delete", id:"..."}
 *   POST /api/deals.php {action:"purge_all", confirm:"bueno_deals"}
 *
 * The previous version returned every consignee's contracts to anyone, and
 * rewrote company and cargo names on every read through a chain of
 * rebranding rules that contradicted the ones in db.php. That rewriting is now
 * a one-off data migration, not a per-request transform.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

Collection::handle([
    'table'  => 'bueno_deals',
    'entity' => 'deal',

    'capabilities' => [
        'read'   => 'deals.view',
        'write'  => 'deals.create',
        'delete' => 'deals.delete',
        'purge'  => 'system.purge_data',
    ],

    'scope'     => ['company' => 'company'],
    'orderBy'   => '`updated_at` DESC, `id` DESC',
    'versioned' => true,

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->identifier('dealNumber', false, 100)
            ->string('company', true, 191)
            ->identifier('loadingStation', false, 50)
            ->identifier('destination', false, 50)
            ->string('cargoType', false, 191)
            ->string('quantity', false, 100)
            ->enum('status', ['ACTIVE', 'PARTIALLY_DISPATCHED', 'COMPLETED', 'CANCELLED'], false, 'ACTIVE')
            ->identifier('tripId', false, 100)
            ->string('createdBy', false, 191)
            ->string('createdAt', false, 64)
            ->validated();

        // Moving a deal to ACTIVE is the authorization to start loading it, so
        // it needs the approval capability rather than plain create rights.
        if (($clean['status'] ?? null) === 'ACTIVE' && !Rbac::can($actor, 'deals.approve')) {
            $existingStatus = $input['__existingStatus'] ?? null;
            if ($existingStatus !== 'ACTIVE') {
                Response::error('Approving a deal for loading requires the deals.approve capability.', 403);
            }
        }

        // Record who raised it, from the session rather than the payload.
        if (($clean['createdBy'] ?? null) === null) {
            $clean['createdBy'] = (string) ($actor['fullName'] ?? $actor['id'] ?? 'system');
        }

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
