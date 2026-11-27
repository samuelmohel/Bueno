<?php
/**
 * Bueno Freight OS — Terminal and gauge registry
 *
 * One authority for which terminals exist and which gauge each one sits on.
 *
 * There were three disagreeing copies of this before:
 *
 *   - AdminPortal.tsx held NARROW_SET / STANDARD_SET and blocked an
 *     incompatible deal in the browser.
 *   - StateEngine.dispatchDealTranche derived the gauge from a *different*,
 *     shorter narrow-gauge list, so a trip could be stamped STANDARD_GAUGE
 *     for an origin the deal screen considered narrow.
 *   - public_track.php held a fourth list, of display names only.
 *
 * None of them ran on the server, so the gauge rule was advice rather than a
 * constraint: anything posting straight to /api/deals.php could register
 * Ewekoro (narrow, 1,067mm) to Moniya (standard, 1,435mm) — a contract for a
 * train that cannot physically run.
 *
 * Apapa (APT) appeared in the display list but in neither gauge set, so it
 * passed the browser check by being unknown to it.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

final class Corridor
{
    public const NARROW   = 'NARROW_GAUGE';
    public const STANDARD = 'STANDARD_GAUGE';

    /**
     * Terminal code => [display name, gauge].
     *
     * Codes are matched case-insensitively. A code that is not listed is
     * treated as unknown rather than quietly assumed to be standard gauge —
     * see gaugeOf().
     */
    public const TERMINALS = [
        // ── Narrow gauge (1,067mm) — the old Western line ──────────────────
        'EWK'  => ['Ewekoro Terminal',          self::NARROW],
        'ITO'  => ['Itori Junction',            self::NARROW],
        'DGB'  => ['Ibadan (Dugbe)',            self::NARROW],
        'OSB'  => ['Osogbo',                    self::NARROW],
        'ILR'  => ['Ilorin Freight Hub',        self::NARROW],
        'IDD'  => ['Iddo Terminal',             self::NARROW],
        'EBJ'  => ['Ebute Metta Junction',      self::NARROW],
        'IGS'  => ['Ifo Goods Siding',          self::NARROW],
        'INS'  => ['Inisha',                    self::NARROW],
        'OKK'  => ['Okuku',                     self::NARROW],
        'FFA'  => ['Offa',                      self::NARROW],
        'JBB'  => ['Jebba',                     self::NARROW],

        // ── Standard gauge (1,435mm) — Lagos–Ibadan and northward ──────────
        'PAPA' => ['Papalanto Terminal',        self::STANDARD],
        'MNY'  => ['Moniya Yard (Ibadan)',      self::STANDARD],
        'MONI' => ['Moniya Yard (Ibadan)',      self::STANDARD],
        'ENL'  => ['ENL Terminal',              self::STANDARD],
        'APT'  => ['Apapa Maritime Port',       self::STANDARD],
        'APL'  => ['Apapa Lagos Port',          self::STANDARD],
        'MBJ'  => ['Mobolaji Johnson (Ebute)',  self::STANDARD],
        'MU'   => ['Mushin',                    self::STANDARD],
        'SH'   => ['Shogunle',                  self::STANDARD],
        'SG'   => ['Agege',                     self::STANDARD],
        'IK'   => ['Ikeja',                     self::STANDARD],
        'GE'   => ['Agbado',                    self::STANDARD],
        'UJ'   => ['Kajola',                    self::STANDARD],
        'GD'   => ['Abeokuta',                  self::STANDARD],
        'IT'   => ['Omi Adio',                  self::STANDARD],
        'JK'   => ['Jaji',                      self::STANDARD],
        'KA'   => ['Kaduna',                    self::STANDARD],
        'AB'   => ['Abuja (Idu)',               self::STANDARD],
        'AD'   => ['Agbado Junction',           self::STANDARD],
    ];

    public static function normalize(?string $code): string
    {
        return strtoupper(trim((string) $code));
    }

    public static function exists(?string $code): bool
    {
        return isset(self::TERMINALS[self::normalize($code)]);
    }

    /** Display name, or the code itself when it is not in the registry. */
    public static function nameOf(?string $code): string
    {
        $c = self::normalize($code);
        return self::TERMINALS[$c][0] ?? $c;
    }

    /** Gauge of a terminal, or null when the code is not in the registry. */
    public static function gaugeOf(?string $code): ?string
    {
        $c = self::normalize($code);
        return self::TERMINALS[$c][1] ?? null;
    }

    /**
     * Can a train run from $origin to $destination?
     *
     * An unknown code answers null — "cannot say" — rather than true. Letting
     * an unrecognised terminal through was how Apapa bypassed the check.
     *
     * @return array{ok:bool, reason:?string, gauge:?string}
     */
    public static function checkRoute(?string $origin, ?string $destination): array
    {
        $o = self::normalize($origin);
        $d = self::normalize($destination);

        if ($o === '' || $d === '') {
            return ['ok' => true, 'reason' => null, 'gauge' => null];
        }

        if (!self::exists($o)) {
            return [
                'ok'     => false,
                'reason' => "\"{$o}\" is not a terminal on the corridor registry.",
                'gauge'  => null,
            ];
        }
        if (!self::exists($d)) {
            return [
                'ok'     => false,
                'reason' => "\"{$d}\" is not a terminal on the corridor registry.",
                'gauge'  => null,
            ];
        }

        if ($o === $d) {
            return [
                'ok'     => false,
                'reason' => 'Origin and destination are the same terminal.',
                'gauge'  => self::gaugeOf($o),
            ];
        }

        $go = self::gaugeOf($o);
        $gd = self::gaugeOf($d);

        if ($go !== $gd) {
            return [
                'ok'     => false,
                'reason' => sprintf(
                    'Gauge incompatibility: %s (%s) is %s and %s (%s) is %s. '
                  . 'Rolling stock cannot run between the two.',
                    self::nameOf($o), $o, self::label($go),
                    self::nameOf($d), $d, self::label($gd)
                ),
                'gauge'  => null,
            ];
        }

        return ['ok' => true, 'reason' => null, 'gauge' => $go];
    }

    public static function label(?string $gauge): string
    {
        return $gauge === self::NARROW
            ? 'narrow gauge (1,067mm)'
            : ($gauge === self::STANDARD ? 'standard gauge (1,435mm)' : 'an unknown gauge');
    }

    /** @return string[] every terminal code, for a validator enum. */
    public static function codes(): array
    {
        return array_keys(self::TERMINALS);
    }
}
