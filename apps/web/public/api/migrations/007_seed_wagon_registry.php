<?php
/**
 * 007 — Seed the wagon registry
 *
 * bueno_wagons is empty in production, so the fleet page has nothing to show
 * and a cargo officer cannot allocate a wagon to a trip.
 *
 * The 46 PXG covered hopper wagons were never server-side data: they lived as
 * an OFFICIAL_PXG_CODES array in the browser bundle, and the client fell back
 * to that list whenever the API returned nothing. The fleet therefore appeared
 * to exist while the database knew nothing about it — allocations referenced
 * wagon ids the server had never heard of.
 *
 * This puts the registry where it belongs. It is the last of the hard-coded
 * operational data to move out of the frontend.
 *
 * Idempotent: seeds only when the table is empty, so it will not resurrect
 * wagons an administrator has deliberately decommissioned, and re-running a
 * deployment does not duplicate or overwrite live fleet state.
 */

declare(strict_types=1);

return static function (PDO $pdo): void {
    $existing = (int) $pdo->query('SELECT COUNT(*) FROM bueno_wagons')->fetchColumn();
    if ($existing > 0) {
        error_log('[bueno][migration 007] wagon registry already populated (' . $existing . ' rows) — leaving it alone');
        return;
    }

    // The official NRC-registered consist, in the order the operations team
    // records it. Physical asset identifiers, not a generated sequence: the
    // numbers are not contiguous and must match the plates on the wagons.
    $codes = [
        'PXG 09029', 'PXG 09033', 'PXG 09037', 'PXG 09022', 'PXG 09001',
        'PXG 09031', 'PXG 09036', 'PXG 09023', 'PXG 09021', 'PXG 09025',
        'PXG 09008', 'PXG 09019', 'PXG 09055', 'PXG 09038', 'PXG 09004',
        'PXG 09015', 'PXG 09040', 'PXG 09056', 'PXG 09016', 'PXG 09009',
        'PXG 09028', 'PXG 09030', 'PXG 09017', 'PXG 09059', 'PXG 09003',
        'PXG 09013', 'PXG 09014', 'PXG 09039', 'PXG 09012', 'PXG 09010',
        'PXG 09026', 'PXG 09005', 'PXG 09041', 'PXG 09007', 'PXG 09061',
        'PXG 09062', 'PXG 09020', 'PXG 09002', 'PXG 09066', 'PXG 09018',
        'PXG 09035', 'PXG 09032', 'PXG 09060', 'PXG 09011', 'PXG 09024',
        'PXG 09034',
    ];

    $insert = $pdo->prepare(
        'INSERT INTO bueno_wagons
            (id, wagonType, payloadCapacity, capacity, status, currentStation, gauge, addedBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    $now = gmdate('Y-m-d\TH:i:s\Z');

    // No explicit transaction here: the migration runner already wraps each
    // migration in one and commits or rolls back around it, so opening another
    // fails with "There is already an active transaction".
    foreach ($codes as $index => $code) {
        $insert->execute([
            $code,
            'PXG Covered Hopper Wagon',
            '60 MT (1,200 Bags)',
            1200,
            'AVAILABLE',
            // Split across the two loading terminals, matching how the fleet
            // is actually stabled.
            $index < 23 ? 'PAPA' : 'MNY',
            'STANDARD_GAUGE',
            'System Registry',
            $now,
        ]);
    }

    error_log('[bueno][migration 007] seeded ' . count($codes) . ' wagons into the registry');
};
