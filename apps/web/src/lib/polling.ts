'use client';

/**
 * Background-polling guards.
 *
 * The portals polled unconditionally — every 5 seconds for cargo officers and
 * consignees, every 12 for administrators, every 4 for the GPS map. A tab left
 * open on a forgotten screen kept issuing requests all day and all night, and
 * each one spins up a PHP process on shared hosting. A handful of abandoned
 * tabs cost more than the people actually using the system.
 *
 * Reads are ETagged, so an unchanged collection already answers 304 with no
 * body — but the request itself is the expensive part here, not the payload.
 */

/**
 * Whether a scheduled refresh should actually go to the network.
 *
 * False while the tab is hidden, and while the browser reports itself offline —
 * which matters on Nigerian mobile networks, where connectivity comes and goes
 * and a queue of doomed requests helps nobody.
 */
export function shouldPoll(): boolean {
  if (typeof document === 'undefined') return false;
  if (document.hidden) return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  return true;
}

/**
 * Calls `refresh` when the tab becomes visible again, or the connection comes
 * back. Returns an unsubscribe function for the effect's cleanup.
 *
 * Without this, a tab that stopped polling while hidden would show data up to a
 * full interval stale at the moment someone looks at it — which is precisely
 * when it needs to be right.
 */
export function onReturnToForeground(refresh: () => void): () => void {
  if (typeof document === 'undefined') return () => {};

  const handler = () => {
    if (shouldPoll()) refresh();
  };

  document.addEventListener('visibilitychange', handler);
  window.addEventListener('online', handler);

  return () => {
    document.removeEventListener('visibilitychange', handler);
    window.removeEventListener('online', handler);
  };
}
