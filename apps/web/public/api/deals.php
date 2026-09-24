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

    /**
     * The statuses a deal actually moves through.
     *
     * This list previously read ACTIVE, PARTIALLY_DISPATCHED, COMPLETED,
     * CANCELLED — a vocabulary the application does not use. Creating a deal
     * sets APPROVED and dispatching the last tranche sets
     * ALL_TRANCHES_DISPATCHED, so every deal written from the interface failed
     * validation with 422 and no deal could be created at all. Nothing
     * surfaced it, because a failed collection write was reported to an event
     * listener that did not exist.
     *
     * PARTIALLY_DISPATCHED is kept although the client never sets it, so any
     * row already carrying it stays valid.
     */
    'validate' => static function (array $input, array $actor): array {
        $STATUSES = [
            'APPROVED',                 // registered, cleared to load
            'ACTIVE',                   // tranches being dispatched
            'PARTIALLY_DISPATCHED',     // legacy, retained for existing rows
            'ALL_TRANCHES_DISPATCHED',  // every planned trip has gone
            'COMPLETED',
            'CANCELLED',
        ];

        $clean = Validator::for($input)
            ->identifier('dealNumber', false, 100)
            ->string('company', true, 191)
            ->string('companyName', false, 191)
            ->identifier('loadingStation', false, 50)
            ->identifier('destination', false, 50)
            ->string('cargoType', false, 191)
            ->string('quantity', false, 100)
            ->enum('status', $STATUSES, false, 'APPROVED')
            ->identifier('tripId', false, 100)
            ->string('createdBy', false, 191)
            ->string('createdAt', false, 64)

            // Contract structure. Without these a monthly master contract came
            // back from the next poll with no idea how many trips it covered
            // or how much each tranche carried — which is precisely what the
            // dispatch button reads to build the next trip.
            ->identifier('dealType', false, 50)
            ->integer('totalPlannedTrips', false, 1, 500)
            ->integer('dispatchedTripsCount', false, 0, 500)
            ->integer('completedTripsCount', false, 0, 500)
            ->number('trancheTonnage', false, 0)
            ->number('remainingTonnage', false, 0)
            ->string('cadence', false, 100)
            ->string('contractMonth', false, 20)
            ->string('unitOfMeasure', false, 100)
            ->string('wagonType', false, 100)
            ->identifier('gauge', false, 50)

            // Commercial terms, written when finance costs the deal.
            ->number('tariffRatePerTon', false, 0)
            ->number('totalContractValue', false, 0)
            ->number('budgetExpensePerTrip', false, 0)
            ->identifier('paymentTerms', false, 50)
            ->identifier('financeStatus', false, 50)
            ->string('costedBy', false, 191)
            ->string('costedAt', false, 64)
            ->validated();

        // Clearing a deal to load is an authorization, not a data entry, so it
        // needs the approval capability rather than plain create rights.
        // APPROVED is the state the interface actually uses for it; ACTIVE and
        // ALL_TRANCHES_DISPATCHED follow from dispatching, which only an
        // account that could approve it can reach.
        $clearsForLoading = ['APPROVED', 'ACTIVE', 'ALL_TRANCHES_DISPATCHED'];
        if (in_array($clean['status'] ?? null, $clearsForLoading, true)
            && !Rbac::can($actor, 'deals.approve')) {
            $existingStatus = $input['__existingStatus'] ?? null;
            if (!in_array($existingStatus, $clearsForLoading, true)) {
                Response::error('Clearing a deal for loading requires the deals.approve capability.', 403);
            }
        }

        // Record who raised it, from the session rather than the payload.
        if (($clean['createdBy'] ?? null) === null) {
            $clean['createdBy'] = (string) ($actor['fullName'] ?? $actor['id'] ?? 'system');
        }

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
