<?php
/**
 * Bueno Freight OS — end-to-end process test
 *
 * Drives the whole commercial lifecycle over real HTTP against a running
 * instance, twice, as every role that touches it:
 *
 *   enquiry -> account -> negotiation -> deal -> costing -> dispatch ->
 *   loading -> departure -> GPS -> tracking -> arrival -> unload ->
 *   completion -> invoice -> payment -> settled
 *
 * Run 1: monthly master contract, standard gauge, clean delivery.
 * Run 2: single trip, narrow gauge, damaged consignment and a discrepancy.
 *
 * Negative cases are interleaved rather than grouped, because the point is to
 * confirm a refusal happens at the moment in the process where someone would
 * actually attempt it.
 *
 * Usage:
 *   BUENO_E2E_URL=http://127.0.0.1:8777 \
 *   BUENO_E2E_ADMIN=admin@example.com \
 *   BUENO_E2E_PASS=secret \
 *   php scripts/tests/e2e-full-process.php
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("CLI only.\n");
}

// ── Harness ─────────────────────────────────────────────────────────────────

final class E2E
{
    public static string $base = '';
    public static int $pass = 0;
    public static int $fail = 0;
    /** @var array<int,array{phase:string,name:string,detail:string}> */
    public static array $failures = [];
    public static string $phase = '';

    public static function phase(string $name): void
    {
        self::$phase = $name;
        echo PHP_EOL . "\033[1;36m── {$name}\033[0m" . PHP_EOL;
    }

    public static function ok(string $name, string $note = ''): void
    {
        self::$pass++;
        echo "  \033[32mPASS\033[0m  {$name}" . ($note !== '' ? "  \033[90m{$note}\033[0m" : '') . PHP_EOL;
    }

    public static function bad(string $name, string $detail): void
    {
        self::$fail++;
        self::$failures[] = ['phase' => self::$phase, 'name' => $name, 'detail' => $detail];
        echo "  \033[31mFAIL\033[0m  {$name}" . PHP_EOL;
        echo "        \033[31m{$detail}\033[0m" . PHP_EOL;
    }

    public static function check(string $name, bool $cond, string $detail = ''): bool
    {
        $cond ? self::ok($name) : self::bad($name, $detail);
        return $cond;
    }

    /** A create succeeded: 200 and 201 are both correct. */
    public static function created(array $r): bool
    {
        return $r['status'] === 200 || $r['status'] === 201;
    }

    /** Trim a response body so a failure message stays readable. */
    public static function brief(array $r, int $max = 220): string
    {
        $raw = $r['raw'];
        return strlen($raw) > $max ? substr($raw, 0, $max) . '…' : $raw;
    }

    /**
     * @param  array<string,mixed>|null $body
     * @return array{status:int,json:array<string,mixed>,raw:string}
     */
    public static function http(
        string $method,
        string $path,
        ?array $body = null,
        ?string $token = null,
        array $extraHeaders = []
    ): array {
        $ch = curl_init(self::$base . $path);

        $headers = ['Accept: application/json'];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
        }
        if ($token !== null) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }
        foreach ($extraHeaders as $h) {
            $headers[] = $h;
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 20,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $raw    = (string) curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err    = curl_error($ch);
        curl_close($ch);

        if ($err !== '') {
            self::bad('transport', "{$method} {$path}: {$err}");
            return ['status' => 0, 'json' => [], 'raw' => $err];
        }

        $json = json_decode($raw, true);
        return [
            'status' => $status,
            'json'   => is_array($json) ? $json : [],
            'raw'    => $raw,
        ];
    }

    public static function login(string $identifier, string $secret): ?string
    {
        $r = self::http('POST', '/api/auth.php', [
            'action'     => 'login',
            'identifier' => $identifier,
            'secret'     => $secret,
        ]);
        return $r['json']['token'] ?? null;
    }

    public static function summary(): int
    {
        $total = self::$pass + self::$fail;
        echo PHP_EOL . str_repeat('─', 72) . PHP_EOL;
        printf("  %d checks:  \033[32m%d passed\033[0m", $total, self::$pass);
        if (self::$fail > 0) {
            printf(",  \033[31m%d failed\033[0m", self::$fail);
        }
        echo PHP_EOL;

        if (self::$failures !== []) {
            echo PHP_EOL . "\033[1;31mFAILURES\033[0m" . PHP_EOL;
            $byPhase = [];
            foreach (self::$failures as $f) {
                $byPhase[$f['phase']][] = $f;
            }
            foreach ($byPhase as $phase => $items) {
                echo PHP_EOL . "  {$phase}" . PHP_EOL;
                foreach ($items as $f) {
                    echo "    - {$f['name']}" . PHP_EOL;
                    echo "      {$f['detail']}" . PHP_EOL;
                }
            }
        }
        echo PHP_EOL;
        return self::$fail === 0 ? 0 : 1;
    }
}

E2E::$base = rtrim(getenv('BUENO_E2E_URL') ?: 'http://127.0.0.1:8777', '/');
$adminEmail = getenv('BUENO_E2E_ADMIN') ?: 'admin@e2e.local';
$adminPass  = getenv('BUENO_E2E_PASS') ?: '';

if ($adminPass === '') {
    fwrite(STDERR, "Set BUENO_E2E_PASS to the administrator password.\n");
    exit(2);
}

$stamp = substr((string) time(), -6);

echo PHP_EOL . "\033[1mBueno Freight OS — end-to-end process test\033[0m" . PHP_EOL;
echo "  target: " . E2E::$base . PHP_EOL;

// ════════════════════════════════════════════════════════════════════════════
//  PRE-FLIGHT
// ════════════════════════════════════════════════════════════════════════════

E2E::phase('Pre-flight');

$h = E2E::http('GET', '/api/health.php');
E2E::check('health endpoint answers', $h['status'] === 200 || $h['status'] === 503,
    "got HTTP {$h['status']}");
E2E::check('schema is ready',
    ($h['json']['checks']['database']['schema_ready'] ?? false) === true,
    'migrations have not been applied');

$admin = E2E::login($adminEmail, $adminPass);
if ($admin === null) {
    E2E::bad('administrator can sign in', 'login returned no token — cannot continue');
    exit(E2E::summary());
}
E2E::ok('administrator can sign in');

// ════════════════════════════════════════════════════════════════════════════
//  AUTHENTICATION HARDENING
// ════════════════════════════════════════════════════════════════════════════

E2E::phase('Authentication');

$r = E2E::http('POST', '/api/auth.php', [
    'action' => 'login', 'identifier' => $adminEmail, 'secret' => 'definitely-wrong',
]);
E2E::check('wrong password is refused', $r['status'] === 401, "got HTTP {$r['status']}");

$r2 = E2E::http('POST', '/api/auth.php', [
    'action' => 'login', 'identifier' => 'nobody-' . $stamp . '@nowhere.test', 'secret' => 'x',
]);
E2E::check('unknown account gives the same answer as a wrong password',
    $r2['status'] === 401 && ($r2['json']['message'] ?? '') === ($r['json']['message'] ?? 'x'),
    'account existence is distinguishable from the response');

$r = E2E::http('GET', '/api/trips.php');
E2E::check('unauthenticated read is refused', $r['status'] === 401, "got HTTP {$r['status']}");

$r = E2E::http('GET', '/api/trips.php', null, 'not-a-real-token-' . $stamp);
E2E::check('forged bearer token is refused', $r['status'] === 401, "got HTTP {$r['status']}");

$r = E2E::http('GET', '/api/_lib/config.php');
E2E::check('internal library is not served', in_array($r['status'], [403, 404], true),
    "got HTTP {$r['status']} — _lib/config.php was reachable");

$r = E2E::http('GET', '/api/_lib/auth.php');
E2E::check('auth library is not served', in_array($r['status'], [403, 404], true),
    "got HTTP {$r['status']}");

// ════════════════════════════════════════════════════════════════════════════
//  THE TWO CONSIGNMENTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Each run is the same process with different cargo, gauge and outcome.
 */
$runs = [
    [
        'label'       => 'RUN 1 — Monthly master contract, standard gauge, clean delivery',
        'company'     => 'Huaxin Cement Nigeria Plc ' . $stamp,
        'contact'     => 'Adaeze Okonkwo',
        'email'       => "consignee1.{$stamp}@e2e.local",
        'industry'    => 'Cement Manufacturing',
        'route'       => 'Papalanto to Moniya',
        'origin'      => 'PAPA',
        'destination' => 'MNY',
        'officerSt'   => 'PAPA',
        'unloadSt'    => 'MNY',
        'cargo'       => 'Portland Cement (50kg bags)',
        'dealType'    => 'MONTHLY_CONTRACT',
        'totalTrips'  => 4,
        'quantity'    => 24000,
        'tranche'     => 6000,
        'tariff'      => 9500.0,
        'wagons'      => 5,
        'perWagon'    => 1200,
        'damage'      => 0,
        'burst'       => 0,
        'complaint'   => null,
    ],
    [
        'label'       => 'RUN 2 — Single trip, narrow gauge, damaged consignment',
        'company'     => 'Dangote Agro Mills ' . $stamp,
        'contact'     => 'Ibrahim Suleiman',
        'email'       => "consignee2.{$stamp}@e2e.local",
        'industry'    => 'Agro Processing',
        'route'       => 'Ewekoro to Dugbe',
        'origin'      => 'EWK',
        'destination' => 'DGB',
        'officerSt'   => 'EWK',
        'unloadSt'    => 'DGB',
        'cargo'       => 'Bagged Fertiliser (25kg)',
        'dealType'    => 'SINGLE_TRIP',
        'totalTrips'  => 1,
        'quantity'    => 3600,
        'tranche'     => 3600,
        'tariff'      => 12750.0,
        'wagons'      => 3,
        'perWagon'    => 1200,
        'damage'      => 14,
        'burst'       => 31,
        'complaint'   => 'Wagon roof hatch seal failed in transit; moisture ingress on upper tier.',
    ],
];

$results = [];

foreach ($runs as $runIndex => $run) {
    $n = $runIndex + 1;
    echo PHP_EOL . PHP_EOL . "\033[1;33m" . str_repeat('═', 72) . PHP_EOL
       . "  {$run['label']}" . PHP_EOL
       . str_repeat('═', 72) . "\033[0m" . PHP_EOL;

    // ── 1. Public enquiry ───────────────────────────────────────────────────
    E2E::phase("R{$n} · 1. Public enquiry (no account)");

    $r = E2E::http('POST', '/api/client_requests.php', [
        'action'      => 'submit',
        'companyName' => $run['company'],
        'industry'    => $run['industry'],
        'contactName' => $run['contact'],
        'email'       => $run['email'],
        'phone'       => '0803' . random_int(1000000, 9999999),
        'volume'      => (string) $run['quantity'],
        'route'       => $run['route'],
    ]);
    E2E::check('prospect can submit an enquiry without an account',
        $r['status'] === 200 || $r['status'] === 201, "HTTP {$r['status']}: {$r['raw']}");

    $r = E2E::http('GET', '/api/client_requests.php');
    E2E::check('enquiry list is NOT public', $r['status'] === 401,
        "HTTP {$r['status']} — anyone can read the enquiry pipeline");

    $r = E2E::http('POST', '/api/client_requests.php', [
        'action'      => 'submit',
        'companyName' => 'Status Forger ' . $stamp,
        'contactName' => 'Mallory',
        'email'       => "forge.{$stamp}@e2e.local",
        'status'      => 'CONVERTED',
    ]);
    $fr = E2E::http('GET', '/api/client_requests.php', null, $admin);
    $forged = null;
    foreach (($fr['json']['data'] ?? []) as $row) {
        if (($row['companyName'] ?? '') === 'Status Forger ' . $stamp) {
            $forged = $row;
        }
    }
    E2E::check('enquiry cannot set its own status',
        $forged !== null && strtoupper((string) ($forged['status'] ?? '')) !== 'CONVERTED',
        'a submitted enquiry arrived already marked CONVERTED');

    $r = E2E::http('GET', '/api/client_requests.php', null, $admin);
    $found = false;
    foreach (($r['json']['data'] ?? []) as $row) {
        if (($row['companyName'] ?? '') === $run['company']) {
            $found = true;
        }
    }
    E2E::check('staff see the enquiry in the pipeline', $found,
        'the submitted enquiry is not in the staff list');

    // ── 2. Provision the consignee ──────────────────────────────────────────
    E2E::phase("R{$n} · 2. Account provisioning");

    $r = E2E::http('POST', '/api/users.php', [
        'action'      => 'create',
        'fullName'    => $run['contact'],
        'email'       => $run['email'],
        'role'        => 'CONSIGNEE',
        'userType'    => 'CUSTOMER',
        'companyName' => $run['company'],
    ], $admin);
    E2E::check('consignee account is provisioned', $r['status'] === 200 || $r['status'] === 201,
        "HTTP {$r['status']}: {$r['raw']}");

    $consigneeSecret = $r['json']['initialSecret']
        ?? $r['json']['secret']
        ?? $r['json']['user']['initialSecret']
        ?? null;

    E2E::check('provisioning returns a usable first credential', $consigneeSecret !== null,
        'no initial secret returned — the operator has no way to let the customer in '
      . '(response keys: ' . implode(', ', array_keys($r['json'])) . ')');

    // Cargo officers at both ends of the corridor.
    $officerEmails = [];
    foreach ([['origin', $run['officerSt']], ['dest', $run['unloadSt']]] as [$which, $station]) {
        $email = "officer.{$which}.{$n}.{$stamp}@e2e.local";
        $cr = E2E::http('POST', '/api/users.php', [
            'action'          => 'create',
            'fullName'        => strtoupper($which) . " Officer {$station}",
            'email'           => $email,
            'role'            => 'CARGO_OFFICER',
            'userType'        => 'STAFF',
            'assignedStation' => $station,
        ], $admin);
        $officerEmails[$which] = [
            'email'  => $email,
            'secret' => $cr['json']['initialSecret'] ?? $cr['json']['secret'] ?? null,
        ];
        E2E::check("cargo officer provisioned at {$station}",
            $cr['status'] === 200 || $cr['status'] === 201, "HTTP {$cr['status']}: {$cr['raw']}");
    }

    // ── 3. Deal registration ────────────────────────────────────────────────
    E2E::phase("R{$n} · 3. Deal registration");

    // Gauge incompatibility, attempted server-side.
    $badGauge = E2E::http('POST', '/api/deals.php', [
        'action' => 'upsert',
        'record' => [
            'id'             => "DEAL-BADGAUGE-{$n}-{$stamp}",
            'dealNumber'     => "DEAL-BADGAUGE-{$n}-{$stamp}",
            'company'        => $run['company'],
            'companyName'    => $run['company'],
            'loadingStation' => 'EWK',   // narrow
            'destination'    => 'MNY',   // standard
            'cargoType'      => $run['cargo'],
            'quantity'       => '1000',
            'status'         => 'APPROVED',
        ],
    ], $admin);
    E2E::check('gauge-incompatible deal is refused by the server',
        $badGauge['status'] >= 400,
        "HTTP {$badGauge['status']} — a narrow-gauge origin was accepted with a "
      . 'standard-gauge destination. The check exists only in the browser.');

    $dealId = "DEAL-{$n}-{$stamp}";
    $r = E2E::http('POST', '/api/deals.php', [
        'action' => 'upsert',
        'record' => [
            'id'                => $dealId,
            'dealNumber'        => $dealId,
            'company'           => $run['company'],
            'companyName'       => $run['company'],
            'loadingStation'    => $run['origin'],
            'destination'       => $run['destination'],
            'cargoType'         => $run['cargo'],
            'quantity'          => (string) $run['quantity'],
            'status'            => 'APPROVED',
            'dealType'          => $run['dealType'],
            'totalPlannedTrips' => $run['totalTrips'],
            'trancheTonnage'    => $run['tranche'],
            'remainingTonnage'  => $run['quantity'],
            'unitOfMeasure'     => 'Bags',
            'wagonType'         => 'Covered Hopper Wagon',
        ],
    ], $admin);
    E2E::check('deal is registered', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    // ── 4. Finance costing ──────────────────────────────────────────────────
    E2E::phase("R{$n} · 4. Finance costing");

    $r = E2E::http('POST', '/api/deals.php', [
        'action' => 'upsert',
        'record' => [
            'id'                 => $dealId,
            'company'            => $run['company'],
            'tariffRatePerTon'   => $run['tariff'],
            'totalContractValue' => $run['tariff'] * $run['quantity'],
            'financeStatus'      => 'FINANCE_APPROVED_COSTED',
            'status'             => 'APPROVED',
        ],
    ], $admin);
    E2E::check('commercial terms are saved', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    // ── 5. Dispatch ─────────────────────────────────────────────────────────
    E2E::phase("R{$n} · 5. Dispatch a tranche");

    $tripId = "TRP-{$n}-{$stamp}";
    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => [
            'id'            => $tripId,
            'tripId'        => $tripId,
            'dealNumber'    => $dealId,
            'company'       => $run['company'],
            'cargoType'     => $run['cargo'],
            'unitOfMeasure' => 'Bags',
            'quantity'      => (string) $run['tranche'],
            'origin'        => $run['origin'],
            'destination'   => $run['destination'],
            'status'        => 'LOADING',
            'clientEmail'   => $run['email'],
        ],
    ], $admin);
    E2E::check('trip is created in LOADING', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    // ── 6. Loading ──────────────────────────────────────────────────────────
    E2E::phase("R{$n} · 6. Loading at origin");

    $officerToken = null;
    if ($officerEmails['origin']['secret'] !== null) {
        $officerToken = E2E::login($officerEmails['origin']['email'], $officerEmails['origin']['secret']);
    }
    E2E::check('origin cargo officer can sign in', $officerToken !== null,
        'could not sign the officer in with the credential provisioning returned');

    $wagonLogs = [];
    $loadStart = time() - 5400;
    for ($i = 0; $i < $run['wagons']; $i++) {
        $s = $loadStart + ($i * 900);
        $e = $s + 780;
        $wagonLogs[] = [
            'wagonId'        => sprintf('PXG %05d', 9001 + $i),
            'sealNumber'     => sprintf('SEAL-%s-%d%02d', $run['origin'], $stamp, $i),
            'startedAtIso'   => gmdate('Y-m-d\TH:i:s\Z', $s),
            'endedAtIso'     => gmdate('Y-m-d\TH:i:s\Z', $e),
            'startTime'      => gmdate('h:i A', $s),
            'endTime'        => gmdate('h:i A', $e),
            'durationStr'    => '13 Minutes',
            'qty'            => $run['perWagon'],
            'unitOfMeasure'  => 'Bags',
            'sourceEnv'      => $run['origin'] . ' Silo Bay ' . ($i % 3 + 1),
            'status'         => 'LOADED',
            'unloadStatus'   => 'PENDING_UNLOAD',
            'feederTrucks'   => [[
                'truckRegNo'     => sprintf('%s-%03d-XA', $run['origin'], 100 + $i),
                'driverName'     => 'Driver ' . ($i + 1),
                'phone'          => '0806' . random_int(1000000, 9999999),
                'transporter'    => 'Corridor Haulage Ltd',
                'qtyContributed' => $run['perWagon'],
            ]],
        ];
    }

    $tokenForOps = $officerToken ?? $admin;
    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => [
            'id'           => $tripId,
            'company'      => $run['company'],
            'locomotiveId' => 'LOCO-' . (2100 + $n),
            'wagonLogs'    => $wagonLogs,
            'status'       => 'LOADING',
        ],
    ], $tokenForOps);
    E2E::check('per-wagon loading tallies are saved', E2E::created($r),
        'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $r = E2E::http('GET', '/api/trips.php?id=' . urlencode($tripId), null, $admin);
    $trip = ($r['json']['data'][0] ?? $r['json']['data'] ?? null);
    if (is_array($trip) && isset($trip[0])) {
        $trip = $trip[0];
    }
    $savedLogs = $trip['wagonLogs'] ?? [];
    E2E::check('wagon tallies survive a round trip',
        is_array($savedLogs) && count($savedLogs) === $run['wagons'],
        'expected ' . $run['wagons'] . ' wagon logs, got ' . (is_array($savedLogs) ? count($savedLogs) : 'none'));

    E2E::check('seal numbers persist',
        is_array($savedLogs) && ($savedLogs[0]['sealNumber'] ?? '') !== '',
        'the seal number recorded at loading was not stored on the trip');

    E2E::check('loading timestamps persist',
        is_array($savedLogs) && ($savedLogs[0]['startedAtIso'] ?? '') !== '',
        'machine-readable loading times were not stored — duration cannot be audited later');

    // Operations must not be able to set money.
    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => [
            'id' => $tripId, 'company' => $run['company'],
            'tripRevenue' => 999999999, 'tripCost' => 1,
        ],
    ], $tokenForOps);
    $check = E2E::http('GET', '/api/trips.php?id=' . urlencode($tripId), null, $admin);
    $t2 = $check['json']['data'][0] ?? [];
    E2E::check('a cargo officer cannot set trip revenue',
        (float) ($t2['tripRevenue'] ?? 0) !== 999999999.0,
        'operations wrote a commercial figure onto the trip');

    // ── 7. Departure and GPS ────────────────────────────────────────────────
    E2E::phase("R{$n} · 7. Departure and GPS telemetry");

    $departedAt = gmdate('Y-m-d\TH:i:s\Z', time() - 3600);
    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => [
            'id'          => $tripId,
            'company'     => $run['company'],
            'status'      => 'IN_TRANSIT',
            'departedAt'  => $departedAt,
        ],
    ], $tokenForOps);
    E2E::check('trip moves to IN_TRANSIT', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $corridor = [
        [6.8974, 3.2141], [6.9420, 3.1890], [7.0150, 3.1320],
        [7.1180, 3.0910], [7.2460, 3.0420], [7.3775, 3.9470],
    ];
    $gpsOk = 0;
    foreach ($corridor as $idx => [$lat, $lng]) {
        $g = E2E::http('POST', '/api/gps.php', [
            'tripId'        => $tripId,
            'locomotiveId'  => 'LOCO-' . (2100 + $n),
            'lat'           => $lat,
            'lng'           => $lng,
            'speed'         => 60 + $idx * 3,
            'heading'       => 45,
            'signalQuality' => 'GPS_SATELLITE_LIVE',
        ], $tokenForOps);
        if ($g['status'] === 200) {
            $gpsOk++;
        } elseif ($idx === 0) {
            E2E::bad('GPS position is accepted', "HTTP {$g['status']}: {$g['raw']}");
        }
    }
    E2E::check('corridor positions are recorded', $gpsOk === count($corridor),
        "only {$gpsOk} of " . count($corridor) . ' positions were accepted');

    $g = E2E::http('GET', '/api/gps.php?tripId=' . urlencode($tripId), null, $admin);
    E2E::check('breadcrumb trail reads back',
        ($g['json']['count'] ?? 0) >= count($corridor),
        'expected at least ' . count($corridor) . ' fixes, got ' . ($g['json']['count'] ?? 0));

    $g = E2E::http('GET', '/api/gps.php?tripId=' . urlencode($tripId));
    E2E::check('GPS trail is not public', $g['status'] === 401, "HTTP {$g['status']}");

    $bad = E2E::http('POST', '/api/gps.php', [
        'tripId' => 'TRP-DOES-NOT-EXIST-' . $stamp, 'lat' => 1.0, 'lng' => 1.0,
    ], $tokenForOps);
    E2E::check('GPS for a non-existent trip is refused', $bad['status'] >= 400,
        "HTTP {$bad['status']} — telemetry was accepted for a trip that does not exist");

    $oob = E2E::http('POST', '/api/gps.php', [
        'tripId' => $tripId, 'lat' => 991.0, 'lng' => 3.0,
    ], $tokenForOps);
    E2E::check('out-of-range coordinates are refused', $oob['status'] >= 400,
        "HTTP {$oob['status']}");

    // An officer posted to one terminal should not be able to move a train
    // that never touches their station. trips.php scopes reads and writes by
    // station; gps.php checks only the capability.
    if ($runIndex === 1 && isset($results[1]['trip'])) {
        $foreign = E2E::http('POST', '/api/gps.php', [
            'tripId' => $results[1]['trip'], 'lat' => 9.05, 'lng' => 7.49, 'speed' => 120,
        ], $tokenForOps);
        E2E::check('an officer cannot report positions for another station\'s train',
            $foreign['status'] >= 400,
            'HTTP ' . $foreign['status'] . ' — a cargo officer at ' . $run['officerSt']
          . ' moved a train belonging to a different corridor on the live map');
    }

    // ── 8. Public tracking ──────────────────────────────────────────────────
    E2E::phase("R{$n} · 8. Public tracking");

    $t = E2E::http('GET', '/api/public_track.php?ref=' . urlencode($tripId));
    E2E::check('consignment is publicly trackable by reference', $t['status'] === 200,
        "HTTP {$t['status']}: {$t['raw']}");

    $payload = json_encode($t['json']['data'] ?? []);
    foreach ([
        'tariffRatePerTon' => 'the tariff',
        'tripRevenue'      => 'trip revenue',
        'clientEmail'      => "the consignee's email",
        'escortPhone'      => 'escort contact details',
        'cargoOfficerName' => 'the officer name',
    ] as $field => $what) {
        E2E::check("public tracking withholds {$what}",
            stripos((string) $payload, $field) === false,
            "{$field} is exposed on the public tracking endpoint");
    }

    $t = E2E::http('GET', '/api/public_track.php?ref=TRP-NOPE-' . $stamp);
    E2E::check('unknown reference gives 404', $t['status'] === 404, "HTTP {$t['status']}");

    // ── 9. Consignee portal and data isolation ──────────────────────────────
    E2E::phase("R{$n} · 9. Consignee view and isolation");

    $consignee = null;
    if ($consigneeSecret !== null) {
        $consignee = E2E::login($run['email'], $consigneeSecret);
    }
    E2E::check('consignee can sign in', $consignee !== null,
        'the provisioned customer could not sign in');

    if ($consignee !== null) {
        $r = E2E::http('GET', '/api/trips.php', null, $consignee);
        $rows = $r['json']['data'] ?? [];
        $mine = 0;
        $theirs = 0;
        foreach ($rows as $row) {
            if (strcasecmp(trim((string) ($row['company'] ?? '')), trim($run['company'])) === 0) {
                $mine++;
            } else {
                $theirs++;
            }
        }
        E2E::check('consignee sees their own consignment', $mine >= 1,
            'the consignee cannot see their own trip');
        E2E::check('consignee sees nobody else\'s consignments', $theirs === 0,
            "{$theirs} trip(s) belonging to other companies were returned");

        $r = E2E::http('GET', '/api/users.php', null, $consignee);
        E2E::check('consignee cannot read the staff directory', $r['status'] === 403,
            "HTTP {$r['status']}");

        $r = E2E::http('POST', '/api/users.php', [
            'action' => 'create', 'fullName' => 'Escalated', 'email' => "esc.{$n}.{$stamp}@e2e.local",
            'role' => 'ADMIN', 'userType' => 'STAFF',
        ], $consignee);
        E2E::check('consignee cannot create an administrator', $r['status'] === 403,
            "HTTP {$r['status']} — privilege escalation succeeded");

        $r = E2E::http('POST', '/api/deals.php', [
            'action' => 'purge_all', 'confirm' => 'bueno_deals',
        ], $consignee);
        E2E::check('consignee cannot purge data', $r['status'] === 403, "HTTP {$r['status']}");

        $g = E2E::http('GET', '/api/gps.php?tripId=' . urlencode($tripId), null, $consignee);
        E2E::check('consignee can track their own consignment', $g['status'] === 200,
            "HTTP {$g['status']}: {$g['raw']} — the customer cannot see their own freight on the map");
    }

    // ── 10. Arrival, unloading, damage audit ────────────────────────────────
    E2E::phase("R{$n} · 10. Arrival and unloading");

    $unloadToken = $admin;
    if ($officerEmails['dest']['secret'] !== null) {
        $ut = E2E::login($officerEmails['dest']['email'], $officerEmails['dest']['secret']);
        if ($ut !== null) {
            $unloadToken = $ut;
        }
    }

    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => ['id' => $tripId, 'company' => $run['company'], 'status' => 'ARRIVED'],
    ], $unloadToken);
    E2E::check('trip is marked ARRIVED', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $unloadStart = time() - 1200;
    foreach ($wagonLogs as $i => &$w) {
        $us = $unloadStart + ($i * 300);
        $ue = $us + 240;
        $dmg   = $i === 0 ? $run['damage'] : 0;
        $burst = $i === 0 ? $run['burst'] : 0;
        $w['unloadStartedAtIso'] = gmdate('Y-m-d\TH:i:s\Z', $us);
        $w['unloadEndedAtIso']   = gmdate('Y-m-d\TH:i:s\Z', $ue);
        $w['unloadStartTime']    = gmdate('h:i A', $us);
        $w['unloadEndTime']      = gmdate('h:i A', $ue);
        $w['unloadDurationStr']  = '4 Minutes';
        $w['damageQty']          = $dmg;
        $w['burstBags']          = $burst;
        $w['correctQty']         = $run['perWagon'] - $dmg - $burst;
        $w['unloadedQty']        = $run['perWagon'];
        $w['unloadStatus']       = 'UNLOADED';
        $w['hasComplaint']       = $i === 0 && $run['complaint'] !== null;
        $w['complaintNotes']     = ($i === 0) ? $run['complaint'] : null;
    }
    unset($w);

    $completedAt = gmdate('Y-m-d\TH:i:s\Z');
    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => [
            'id'          => $tripId,
            'company'     => $run['company'],
            'status'      => 'COMPLETED',
            'wagonLogs'   => $wagonLogs,
            'completedAt' => $completedAt,
            'damages'     => [
                'damagedUnits'   => $run['damage'],
                'burstBags'      => $run['burst'],
                'complaintNotes' => $run['complaint'] !== null ? [$run['complaint']] : [],
            ],
        ],
    ], $unloadToken);
    E2E::check('trip completes with the unload tally', E2E::created($r),
        'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $r = E2E::http('GET', '/api/trips.php?id=' . urlencode($tripId), null, $admin);
    $final = $r['json']['data'][0] ?? [];
    $finalLogs = $final['wagonLogs'] ?? [];

    E2E::check('unload durations persist',
        is_array($finalLogs) && ($finalLogs[0]['unloadDurationStr'] ?? '') !== '',
        'unload timing was not stored');

    E2E::check('damage audit persists',
        (int) (($finalLogs[0]['burstBags'] ?? 0)) === $run['burst'],
        'burst bag count did not survive: expected ' . $run['burst']
      . ', got ' . (($finalLogs[0]['burstBags'] ?? 'nothing')));

    $hasDeparted  = ($final['departedAt'] ?? '') !== '';
    $hasCompleted = ($final['completedAt'] ?? '') !== '';
    E2E::check('departure and completion are both recorded',
        $hasDeparted && $hasCompleted,
        'departedAt=' . var_export($final['departedAt'] ?? null, true)
      . ' completedAt=' . var_export($final['completedAt'] ?? null, true));

    $durationOk = false;
    if ($hasDeparted && $hasCompleted) {
        $d = strtotime((string) $final['departedAt']);
        $c = strtotime((string) $final['completedAt']);
        $durationOk = $d !== false && $c !== false && $c > $d;
    }
    E2E::check('trip duration can be computed from stored values', $durationOk,
        'departedAt/completedAt are not both machine-readable timestamps, so '
      . 'transit time cannot be derived — got '
      . var_export($final['departedAt'] ?? null, true) . ' and '
      . var_export($final['completedAt'] ?? null, true));

    // ── 11. Invoice and settlement ──────────────────────────────────────────
    E2E::phase("R{$n} · 11. Invoice and settlement");

    $delivered = ($run['wagons'] * $run['perWagon']) - $run['damage'] - $run['burst'];
    $amount    = $run['tariff'] * $run['tranche'];
    $invoiceId = "INV-{$n}-{$stamp}";

    $r = E2E::http('POST', '/api/invoices.php', [
        'action' => 'upsert',
        'record' => [
            'id'            => $invoiceId,
            'invoiceNumber' => $invoiceId,
            'tripId'        => $tripId,
            'dealId'        => $dealId,
            'companyName'   => $run['company'],
            'clientEmail'   => $run['email'],
            'cargoType'     => $run['cargo'],
            'route'         => $run['route'],
            'totalBags'     => $run['wagons'] * $run['perWagon'],
            'ratePerTonne'  => $run['tariff'],
            'damageUnits'   => $run['damage'] + $run['burst'],
            'totalAmount'   => $amount,
            'balance'       => $amount,
            'status'        => 'ISSUED',
        ],
    ], $admin);
    E2E::check('invoice is issued', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $half = round($amount / 2, 2);
    $r = E2E::http('POST', '/api/invoices.php', [
        'action'    => 'RECORD_PAYMENT',
        'id'        => $invoiceId,
        'amount'    => $half,
        'reference' => 'PAY-HALF-' . $stamp,
    ], $admin);
    E2E::check('part payment is recorded', $r['status'] === 200, 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $r = E2E::http('GET', '/api/invoices.php?id=' . urlencode($invoiceId), null, $admin);
    $inv = $r['json']['data'][0] ?? [];
    E2E::check('part payment leaves a balance outstanding',
        abs((float) ($inv['balance'] ?? -1) - ($amount - $half)) < 0.02,
        'balance=' . var_export($inv['balance'] ?? null, true) . ' expected ' . ($amount - $half));

    E2E::check('part-paid status matches the vocabulary the interface reads',
        strtoupper((string) ($inv['status'] ?? '')) === 'PARTIALLY_PAID',
        'status=' . ($inv['status'] ?? 'none') . ' — record_payment writes the legacy '
      . 'PART_PAID/PAID vocabulary while the rest of the platform uses '
      . 'ISSUED/PARTIALLY_PAID/SETTLED, so a paid invoice does not read as paid');

    $r = E2E::http('POST', '/api/invoices.php', [
        'action'    => 'RECORD_PAYMENT',
        'id'        => $invoiceId,
        'amount'    => $amount - $half,
        'reference' => 'PAY-REST-' . $stamp,
    ], $admin);
    E2E::check('final payment is recorded', $r['status'] === 200, 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

    $r = E2E::http('GET', '/api/invoices.php?id=' . urlencode($invoiceId), null, $admin);
    $inv = $r['json']['data'][0] ?? [];
    E2E::check('invoice balance clears', abs((float) ($inv['balance'] ?? -1)) < 0.02,
        'balance=' . var_export($inv['balance'] ?? null, true));
    E2E::check('settled status matches the vocabulary the interface reads',
        strtoupper((string) ($inv['status'] ?? '')) === 'SETTLED',
        'status=' . ($inv['status'] ?? 'none') . ' — the billing screen looks for SETTLED');

    $over = E2E::http('POST', '/api/invoices.php', [
        'action' => 'RECORD_PAYMENT', 'id' => $invoiceId,
        'amount' => 1000, 'reference' => 'OVERPAY-' . $stamp,
    ], $admin);
    E2E::check('overpayment is refused', $over['status'] === 422,
        'HTTP ' . $over['status'] . ' — payment beyond the balance was accepted');

    if ($consignee !== null) {
        $r = E2E::http('GET', '/api/invoices.php', null, $consignee);
        $leaked = 0;
        foreach (($r['json']['data'] ?? []) as $row) {
            if (strcasecmp(trim((string) ($row['companyName'] ?? '')), trim($run['company'])) !== 0) {
                $leaked++;
            }
        }
        E2E::check('consignee sees only their own invoices', $leaked === 0,
            "{$leaked} invoice(s) from other companies were visible");

        $r = E2E::http('POST', '/api/invoices.php', [
            'action' => 'upsert',
            'record' => ['id' => 'INV-SELF-' . $n . '-' . $stamp, 'companyName' => $run['company'],
                         'totalAmount' => 1, 'status' => 'SETTLED'],
        ], $consignee);
        E2E::check('consignee cannot issue an invoice to themselves', $r['status'] === 403,
            'HTTP ' . $r['status']);
    }

    $results[$n] = [
        'deal' => $dealId, 'trip' => $tripId, 'invoice' => $invoiceId,
        'company' => $run['company'], 'consignee' => $consignee,
    ];
}

// ════════════════════════════════════════════════════════════════════════════
//  CROSS-TENANT ISOLATION
// ════════════════════════════════════════════════════════════════════════════

E2E::phase('Company-name tolerance');

// A consignee is linked to their freight by company NAME. Trips and invoices
// compare it case- and whitespace-insensitively on purpose; the GPS endpoint
// compares raw bytes. A record keyed with a trailing space therefore appears
// in the customer's list but refuses to track.
if (isset($results[1]['consignee']) && $results[1]['consignee'] !== null) {
    $c1      = $results[1]['consignee'];
    $spacedId = 'TRP-SPACED-' . $stamp;

    $r = E2E::http('POST', '/api/trips.php', [
        'action' => 'upsert',
        'record' => [
            'id'          => $spacedId,
            'tripId'      => $spacedId,
            'company'     => '  ' . strtoupper($results[1]['company']) . ' ',
            'origin'      => 'PAPA',
            'destination' => 'MNY',
            'status'      => 'IN_TRANSIT',
        ],
    ], $admin);

    if (E2E::created($r)) {
        E2E::http('POST', '/api/gps.php', [
            'tripId' => $spacedId, 'lat' => 7.0, 'lng' => 3.1, 'speed' => 50,
        ], $admin);

        $list = E2E::http('GET', '/api/trips.php', null, $c1);
        $visible = false;
        foreach (($list['json']['data'] ?? []) as $row) {
            if (($row['id'] ?? '') === $spacedId) {
                $visible = true;
            }
        }
        E2E::check('a trip stored with a differently-cased company is still the customer\'s',
            $visible, 'the consignee cannot see a trip whose company name differs only by case/spacing');

        if ($visible) {
            $g = E2E::http('GET', '/api/gps.php?tripId=' . urlencode($spacedId), null, $c1);
            E2E::check('that same trip is trackable on the map', $g['status'] === 200,
                'HTTP ' . $g['status'] . ' — the trip is listed in the portal but GPS says '
              . '"not found", because gps.php compares the company name byte-for-byte '
              . 'while trips.php compares it case- and whitespace-insensitively');
        }
    }
}

E2E::phase('Cross-tenant isolation');

if (isset($results[1]['consignee'], $results[2]) && $results[1]['consignee'] !== null) {
    $c1 = $results[1]['consignee'];

    $r = E2E::http('GET', '/api/trips.php?id=' . urlencode($results[2]['trip']), null, $c1);
    $rows = $r['json']['data'] ?? [];
    E2E::check("run 1's customer cannot fetch run 2's trip by id",
        count($rows) === 0,
        'a consignee read another company\'s consignment by guessing its reference');

    $g = E2E::http('GET', '/api/gps.php?tripId=' . urlencode($results[2]['trip']), null, $c1);
    E2E::check("run 1's customer cannot track run 2's trip", $g['status'] === 404,
        "HTTP {$g['status']} — cross-tenant GPS access");

    $r = E2E::http('GET', '/api/invoices.php?id=' . urlencode($results[2]['invoice']), null, $c1);
    $rows = $r['json']['data'] ?? [];
    E2E::check("run 1's customer cannot read run 2's invoice", count($rows) === 0,
        'cross-tenant invoice disclosure');
}

// ════════════════════════════════════════════════════════════════════════════
//  FUND REQUISITION CHAIN
// ════════════════════════════════════════════════════════════════════════════

E2E::phase('Fund requisition approval chain');

// Raised by a cargo officer, so the approvers are not the raiser — nobody is
// allowed to sign off their own spending.
$raiser = null;
$raiserEmail = "requester.{$stamp}@e2e.local";
$cr = E2E::http('POST', '/api/users.php', [
    'action' => 'create', 'fullName' => 'Siding Requester', 'email' => $raiserEmail,
    'role' => 'CARGO_OFFICER', 'userType' => 'STAFF', 'assignedStation' => 'PAPA',
], $admin);
if (($cr['json']['initialSecret'] ?? null) !== null) {
    $raiser = E2E::login($raiserEmail, $cr['json']['initialSecret']);
}
E2E::check('a requesting officer account exists', $raiser !== null, 'could not sign in the raiser');

$reqId = 'REQ-' . $stamp;
$r = E2E::http('POST', '/api/requests.php', [
    'action' => 'upsert',
    'record' => [
        'id'       => $reqId,
        'title'    => 'Siding diesel and wagon tarpaulins',
        'purpose'  => 'Refuelling the yard loader and replacing three torn wagon sheets',
        'amount'   => 450000,
        'category' => 'TARPAULIN',
    ],
], $raiser ?? $admin);
E2E::check('requisition is raised', E2E::created($r), 'HTTP ' . $r['status'] . ': ' . E2E::brief($r));

$r = E2E::http('POST', '/api/requests.php', [
    'action' => 'upsert',
    'record' => ['id' => 'REQ-SKIP-' . $stamp, 'title' => 'Straight to cash',
                 'amount' => 999000, 'category' => 'GENERAL',
                 'stage' => 'DISBURSED', 'status' => 'DISBURSED'],
], $raiser ?? $admin);
$chk = E2E::http('GET', '/api/requests.php?id=' . urlencode('REQ-SKIP-' . $stamp), null, $admin);
$skipRow = $chk['json']['data'][0] ?? [];
E2E::check('a requisition cannot be submitted pre-disbursed',
    strtoupper((string) ($skipRow['stage'] ?? '')) !== 'DISBURSED'
    && strtoupper((string) ($skipRow['status'] ?? '')) !== 'DISBURSED',
    'accepted already marked DISBURSED, skipping every approver: stage='
  . ($skipRow['stage'] ?? '?') . ' status=' . ($skipRow['status'] ?? '?'));

if ($raiser !== null) {
    $self = E2E::http('POST', '/api/requests.php', [
        'action' => 'advance', 'id' => $reqId, 'decision' => 'APPROVE', 'note' => 'me again',
    ], $raiser);
    E2E::check('the raiser cannot approve their own requisition',
        $self['status'] === 403 || $self['status'] === 404,
        'HTTP ' . $self['status'] . ' — self-approval was permitted');
}

$stages = [];
for ($i = 0; $i < 6; $i++) {
    $before = E2E::http('GET', '/api/requests.php?id=' . urlencode($reqId), null, $admin);
    $stageNow = (string) (($before['json']['data'][0]['stage'] ?? ''));
    $r = E2E::http('POST', '/api/requests.php', [
        'action' => 'advance', 'id' => $reqId, 'decision' => 'APPROVE', 'note' => 'approved at ' . $stageNow,
    ], $admin);
    if ($r['status'] !== 200) {
        break;
    }
    $stages[] = $stageNow;
}
E2E::check('requisition advances through the approval chain', count($stages) >= 3,
    'advanced ' . count($stages) . ' stage(s): ' . implode(' -> ', $stages));

$r = E2E::http('GET', '/api/requests.php?id=' . urlencode($reqId), null, $admin);
$req = $r['json']['data'][0] ?? [];
E2E::check('requisition reaches DISBURSED',
    strtoupper((string) ($req['stage'] ?? '')) === 'DISBURSED',
    'ended at stage: ' . ($req['stage'] ?? 'unknown') . ' status: ' . ($req['status'] ?? 'unknown'));

$r = E2E::http('POST', '/api/requests.php', [
    'action' => 'advance', 'id' => $reqId, 'decision' => 'APPROVE',
], $admin);
E2E::check('a disbursed requisition cannot be advanced again', $r['status'] === 409,
    'HTTP ' . $r['status']);

// ════════════════════════════════════════════════════════════════════════════
//  AUDIT TRAIL
// ════════════════════════════════════════════════════════════════════════════

E2E::phase('Audit trail');

$r = E2E::http('GET', '/api/permissions.php?audit=1', null, $admin);
$auditReachable = $r['status'] === 200;
if (!$auditReachable) {
    $r = E2E::http('GET', '/api/users.php?audit=1', null, $admin);
    $auditReachable = $r['status'] === 200 && isset($r['json']['audit']);
}
E2E::check('the audit log is readable by an administrator', $auditReachable,
    'no endpoint exposes the audit log, so recorded actions cannot be reviewed in the product');

exit(E2E::summary());
