/**
 * Bueno Freight OS — tally timing
 *
 * Loading and unloading durations, and trip transit time.
 *
 * These sheets are what demurrage, detention and insurance claims are argued
 * from, so the numbers on them have to be derived from what was recorded —
 * not from how long a browser tab happened to be open, which is what the
 * portals did before:
 *
 *     const mins = Math.round((Date.now() - w.startTimestamp) / 60000)
 *
 * That ignored the start and end times the officer actually entered. Correct
 * the times on the form and the duration beside them still showed the
 * wall-clock gap since the Start button; leave the tab open over lunch and a
 * forty-minute load was recorded as three hours.
 *
 * The authority here is a pair of ISO timestamps. Clock strings are for
 * display and for the officer to edit; every stored duration is recomputed
 * from the timestamps those edits produce.
 */

/** Render a timestamp as the 12-hour clock string the sheets display. */
export function toClock(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Render a timestamp as the date the sheets display. */
export function toSheetDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Apply an edited clock string to the day an event actually happened on.
 *
 * Accepts "14:05", "2:05 PM", "02:05 pm". Returns null if it cannot be read,
 * so a mistyped time is rejected rather than silently becoming midnight.
 */
export function applyClock(baseIso: string | null | undefined, clock: string): string | null {
  const text = (clock || '').trim();
  if (!text) return null;

  const m = text.match(/^(\d{1,2})[:.](\d{2})\s*([AaPp][Mm])?$/);
  if (!m) return null;

  let hour = Number(m[1]);
  const min = Number(m[2]);
  const mer = (m[3] || '').toUpperCase();

  if (min > 59) return null;
  if (mer === 'PM' && hour < 12) hour += 12;
  if (mer === 'AM' && hour === 12) hour = 0;
  if (hour > 23) return null;

  const base = baseIso ? new Date(baseIso) : new Date();
  const d = Number.isNaN(base.getTime()) ? new Date() : base;

  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, min, 0, 0);
  return out.toISOString();
}

/** "1h 24m", "47 min", or "" when the pair cannot be read. */
export function formatMinutes(mins: number | null): string {
  if (mins === null || !Number.isFinite(mins) || mins < 0) return '';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m} min`;
}

/**
 * Minutes between two timestamps.
 *
 * An end before the start is read as the operation having run past midnight —
 * a night shift at the siding is ordinary — and a day is added once. Anything
 * still negative, or more than a week apart, is treated as unreadable rather
 * than reported as a number nobody can defend.
 */
export function minutesBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined
): number | null {
  if (!startIso || !endIso) return null;

  const s = new Date(startIso).getTime();
  let e = new Date(endIso).getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return null;

  if (e < s) e += 24 * 60 * 60 * 1000;

  const mins = (e - s) / 60000;
  if (mins < 0 || mins > 7 * 24 * 60) return null;

  return mins;
}

/** Duration string for a start/end pair, or '' when it cannot be computed. */
export function durationBetween(
  startIso: string | null | undefined,
  endIso: string | null | undefined
): string {
  return formatMinutes(minutesBetween(startIso, endIso));
}

/**
 * Transit time for a trip.
 *
 * departedAt and completedAt used to be stored as display strings —
 * "Today, 02:31 PM", "26 Nov 2025, 14:32" — which no amount of parsing turns
 * reliably back into an instant, so transit time could not be derived at all
 * after the fact. They are ISO timestamps now; this still tolerates the old
 * strings so historic trips do not render as errors.
 */
export function tripDuration(
  departedAt: string | null | undefined,
  completedAt: string | null | undefined
): string {
  const mins = minutesBetween(normaliseLegacy(departedAt), normaliseLegacy(completedAt));
  return formatMinutes(mins);
}

/**
 * Best effort at reading a value that may be an ISO timestamp or one of the
 * legacy display strings. Returns null when it is not readable, which is the
 * honest answer for "Today, 02:31 PM" on a row written weeks ago.
 */
export function normaliseLegacy(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text;

  // "Today, …" and "Yesterday, …" record no date at all.
  if (/^(today|yesterday)\b/i.test(text)) return null;

  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/**
 * A timestamp as "26 Nov 2026, 14:32", or '' when it cannot be read.
 *
 * Used where a row may hold either a real timestamp or one of the legacy
 * display strings, and the screen wants one consistent rendering.
 */
export function toSheetClock(value: string | null | undefined): string {
  const iso = normaliseLegacy(value);
  if (!iso) return '';
  return `${toSheetDate(iso)}, ${toClock(iso)}`;
}

/** Something recorded, or a dash — never an invented value. */
export function recorded(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === '' ? fallback : text;
}

/** A wagon's loading window, as the sheets show it. */
export function loadWindow(w: any): { range: string; duration: string } {
  const startIso = w?.startedAtIso ?? null;
  const endIso = w?.endedAtIso ?? null;

  const start = toClock(startIso) || recorded(w?.startTime, '');
  const end = toClock(endIso) || recorded(w?.endTime, '');

  const duration = durationBetween(startIso, endIso) || recorded(w?.durationStr, '');

  if (!start && !end) return { range: '—', duration: duration || '—' };
  if (start && !end) return { range: `${start} → in progress`, duration: duration || '—' };

  return { range: `${start} → ${end}`, duration: duration || '—' };
}

/** A wagon's unloading window, as the sheets show it. */
export function unloadWindow(w: any): { range: string; duration: string } {
  const startIso = w?.unloadStartedAtIso ?? null;
  const endIso = w?.unloadEndedAtIso ?? null;

  const start = toClock(startIso) || recorded(w?.unloadStartTime, '');
  const end = toClock(endIso) || recorded(w?.unloadEndTime, '');

  const duration = durationBetween(startIso, endIso) || recorded(w?.unloadDurationStr, '');

  if (!start && !end) return { range: '—', duration: duration || '—' };
  if (start && !end) return { range: `${start} → in progress`, duration: duration || '—' };

  return { range: `${start} → ${end}`, duration: duration || '—' };
}
