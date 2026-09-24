/**
 * BUENO FREIGHT OS — RECORD COMPARISON
 *
 * Deciding whether a record the browser holds still matches the one the server
 * returned. Kept dependency-free and in its own module so it can be unit
 * tested without dragging in the API client — the defect it exists to prevent
 * is entirely a question of value equality, and was expensive enough to be
 * worth testing directly.
 */

export type Row = Record<string, any>;

/**
 * Are these the same value, allowing for the round trip through the database?
 *
 * MySQL hands back VARCHAR and DECIMAL columns as strings, so a quantity the
 * browser wrote as the number 2000 returns as "2000", and a tranche tonnage
 * as "2000.00". A strict `!==` therefore reported every record as edited the
 * moment it had been saved once.
 *
 * That was not a cosmetic inefficiency. saveAll resends whatever it believes
 * changed, so one new deal caused every other deal to be resent too — each
 * carrying the version from whichever React snapshot the caller happened to
 * hold. Those go stale within a single twelve-second poll, so the server
 * refused them as conflicts, and the resync that follows a failure wiped the
 * new record off the screen. "Changed by someone else" for a record nobody
 * had touched.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // null, undefined and absent all mean "no value here".
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Boolean(a) === Boolean(b);
  }

  const aScalar = typeof a === 'number' || typeof a === 'string';
  const bScalar = typeof b === 'number' || typeof b === 'string';
  if (aScalar && bScalar) {
    if (String(a) === String(b)) return true;
    // "2000.00" and 2000 are the same number, written differently.
    const na = Number(a);
    const nb = Number(b);
    return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
  }

  return false;
}

export function rowsDiffer(a: Row, b: Row): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    // Server-managed bookkeeping is not a user edit.
    if (k === 'updated_at' || k === 'version' || k === 'createdAt') continue;
    const av = a[k];
    const bv = b[k];
    if ((typeof av === 'object' && av !== null) || (typeof bv === 'object' && bv !== null)) {
      if (JSON.stringify(av ?? null) !== JSON.stringify(bv ?? null)) return true;
    } else if (!sameValue(av, bv)) {
      return true;
    }
  }
  return false;
}
