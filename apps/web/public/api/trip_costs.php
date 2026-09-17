<?php
/**
 * Bueno Freight OS — Direct trip operating costs (COGS)
 *
 *   GET  /api/trip_costs.php[?tripId=|since=]
 *   POST /api/trip_costs.php {action:"upsert", record:{...}}
 *   POST /api/trip_costs.php {action:"delete", id:"..."}
 *
 * These feed trip profitability, so writing them is a finance capability
 * rather than an operations one.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/collection.php';

Collection::handle([
    'table'  => 'bueno_trip_costs',
    'entity' => 'cost',

    'capabilities' => [
        'read'   => 'analytics',
        'write'  => 'finance.deal_costing',
        'delete' => 'finance.deal_costing',
        'purge'  => 'system.purge_data',
    ],

    'orderBy' => '`updated_at` DESC, `id` DESC',

    'validate' => static function (array $input, array $actor): array {
        $clean = Validator::for($input)
            ->identifier('tripId', true, 100)
            ->enum('category', [
                'NRC_TRACK_ACCESS', 'DIESEL_AGO', 'LOCOMOTIVE_HIRE',
                'STEVEDORING', 'SECURITY_ESCORT', 'TARPAULIN', 'OTHER',
            ], false, 'OTHER')
            ->string('title', true, 191, 2)
            ->string('vendor', false, 191)
            ->number('amount', true, 0)
            ->identifier('voucherNo', false, 100)
            ->enum('paymentStatus', ['PAID', 'PENDING', 'DISPUTED'], false, 'PAID')
            ->string('date', false, 64)
            ->validated();

        $clean['recordedBy'] = (string) ($actor['fullName'] ?? $actor['id']);

        return array_filter($clean, static fn($v) => $v !== null);
    },
]);
