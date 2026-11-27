/**
 * Bueno Freight OS — terminal and gauge registry (client)
 *
 * Mirrors apps/web/public/api/_lib/corridor.php, which is the authority: the
 * server refuses an impossible route whatever the browser believes. This copy
 * exists so the deal form can say "these two ends do not connect" while
 * someone is still typing, rather than after a round trip.
 *
 * scripts/tests/corridor-parity.test.ts fails the build if the two drift.
 *
 * Before this there were three disagreeing lists:
 *   - AdminPortal's NARROW_SET / STANDARD_SET, used to block a deal
 *   - StateEngine.dispatchDealTranche's own, shorter narrow list, used to
 *     stamp a gauge on the trip — so a deal the form accepted as narrow could
 *     produce a trip labelled standard
 *   - public_track.php's terminal names, which covered codes neither set knew
 */

export const NARROW_GAUGE = 'NARROW_GAUGE';
export const STANDARD_GAUGE = 'STANDARD_GAUGE';

export type Gauge = typeof NARROW_GAUGE | typeof STANDARD_GAUGE;

export const TERMINALS: Record<string, { name: string; gauge: Gauge }> = {
  // Narrow gauge (1,067mm) — the old Western line
  EWK: { name: 'Ewekoro Terminal', gauge: NARROW_GAUGE },
  ITO: { name: 'Itori Junction', gauge: NARROW_GAUGE },
  DGB: { name: 'Ibadan (Dugbe)', gauge: NARROW_GAUGE },
  OSB: { name: 'Osogbo', gauge: NARROW_GAUGE },
  ILR: { name: 'Ilorin Freight Hub', gauge: NARROW_GAUGE },
  IDD: { name: 'Iddo Terminal', gauge: NARROW_GAUGE },
  EBJ: { name: 'Ebute Metta Junction', gauge: NARROW_GAUGE },
  IGS: { name: 'Ifo Goods Siding', gauge: NARROW_GAUGE },
  INS: { name: 'Inisha', gauge: NARROW_GAUGE },
  OKK: { name: 'Okuku', gauge: NARROW_GAUGE },
  FFA: { name: 'Offa', gauge: NARROW_GAUGE },
  JBB: { name: 'Jebba', gauge: NARROW_GAUGE },

  // Standard gauge (1,435mm) — Lagos–Ibadan and northward
  PAPA: { name: 'Papalanto Terminal', gauge: STANDARD_GAUGE },
  MNY: { name: 'Moniya Yard (Ibadan)', gauge: STANDARD_GAUGE },
  MONI: { name: 'Moniya Yard (Ibadan)', gauge: STANDARD_GAUGE },
  ENL: { name: 'ENL Terminal', gauge: STANDARD_GAUGE },
  APT: { name: 'Apapa Maritime Port', gauge: STANDARD_GAUGE },
  APL: { name: 'Apapa Lagos Port', gauge: STANDARD_GAUGE },
  MBJ: { name: 'Mobolaji Johnson (Ebute)', gauge: STANDARD_GAUGE },
  MU: { name: 'Mushin', gauge: STANDARD_GAUGE },
  SH: { name: 'Shogunle', gauge: STANDARD_GAUGE },
  SG: { name: 'Agege', gauge: STANDARD_GAUGE },
  IK: { name: 'Ikeja', gauge: STANDARD_GAUGE },
  GE: { name: 'Agbado', gauge: STANDARD_GAUGE },
  UJ: { name: 'Kajola', gauge: STANDARD_GAUGE },
  GD: { name: 'Abeokuta', gauge: STANDARD_GAUGE },
  IT: { name: 'Omi Adio', gauge: STANDARD_GAUGE },
  JK: { name: 'Jaji', gauge: STANDARD_GAUGE },
  KA: { name: 'Kaduna', gauge: STANDARD_GAUGE },
  AB: { name: 'Abuja (Idu)', gauge: STANDARD_GAUGE },
  AD: { name: 'Agbado Junction', gauge: STANDARD_GAUGE },
};

export function normalizeCode(code: string | null | undefined): string {
  return String(code ?? '').trim().toUpperCase();
}

export function terminalExists(code: string | null | undefined): boolean {
  return normalizeCode(code) in TERMINALS;
}

export function terminalName(code: string | null | undefined): string {
  const c = normalizeCode(code);
  return TERMINALS[c]?.name ?? c;
}

export function gaugeOf(code: string | null | undefined): Gauge | null {
  return TERMINALS[normalizeCode(code)]?.gauge ?? null;
}

export function gaugeLabel(gauge: Gauge | null): string {
  if (gauge === NARROW_GAUGE) return 'narrow gauge (1,067mm)';
  if (gauge === STANDARD_GAUGE) return 'standard gauge (1,435mm)';
  return 'an unknown gauge';
}

export interface RouteCheck {
  ok: boolean;
  reason: string | null;
  gauge: Gauge | null;
}

/**
 * Can a train run between these two terminals?
 *
 * An unknown code is refused rather than assumed compatible — Apapa used to
 * pass the browser check purely by being absent from both gauge sets.
 */
export function checkRoute(
  origin: string | null | undefined,
  destination: string | null | undefined
): RouteCheck {
  const o = normalizeCode(origin);
  const d = normalizeCode(destination);

  if (o === '' || d === '') return { ok: true, reason: null, gauge: null };

  if (!terminalExists(o)) {
    return { ok: false, reason: `"${o}" is not a terminal on the corridor registry.`, gauge: null };
  }
  if (!terminalExists(d)) {
    return { ok: false, reason: `"${d}" is not a terminal on the corridor registry.`, gauge: null };
  }
  if (o === d) {
    return { ok: false, reason: 'Origin and destination are the same terminal.', gauge: gaugeOf(o) };
  }

  const go = gaugeOf(o);
  const gd = gaugeOf(d);

  if (go !== gd) {
    return {
      ok: false,
      reason:
        `Gauge incompatibility: ${terminalName(o)} (${o}) is ${gaugeLabel(go)} and ` +
        `${terminalName(d)} (${d}) is ${gaugeLabel(gd)}. ` +
        'Rolling stock cannot run between the two.',
      gauge: null,
    };
  }

  return { ok: true, reason: null, gauge: go };
}

/** Every terminal code, for a dropdown. */
export function terminalCodes(): string[] {
  return Object.keys(TERMINALS);
}
