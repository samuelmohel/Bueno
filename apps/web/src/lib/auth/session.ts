/**
 * BUENO FREIGHT OS — SESSION STORE
 *
 * Holds who is signed in and what they may do, as told by the server.
 *
 * The important change from the previous design: capabilities are no longer
 * computed in the browser from a localStorage matrix. They arrive from the
 * same server code that enforces them, so what the UI shows and what the API
 * permits cannot drift apart — and a user editing localStorage grants
 * themselves nothing, because the server never consults it.
 */

import {
  authApi,
  setUnauthenticatedHandler,
  getToken,
  type Session,
  type SessionUser,
} from '@/lib/apiClient';
import { resolveTabCapability } from '@/lib/rbac/capabilities';

const EMPTY: Session = { authenticated: false, user: null, capabilities: [], scope: null };

let current: Session = EMPTY;
let loaded = false;
let inFlight: Promise<Session> | null = null;

type Listener = (session: Session) => void;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    try {
      listener(current);
    } catch (err) {
      console.error('[session] listener failed', err);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('bueno_session_updated'));
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession(): Session {
  return current;
}

export function getUser(): SessionUser | null {
  return current.user;
}

export function isAuthenticated(): boolean {
  return current.authenticated;
}

export function isLoaded(): boolean {
  return loaded;
}

function setSession(session: Session): void {
  current = session;
  loaded = true;
  emit();
}

/**
 * Load the session from the server.
 *
 * Concurrent callers share one request — several portal components mount at
 * once and would otherwise each fire their own.
 */
export async function loadSession(force = false): Promise<Session> {
  if (!force && loaded && current.authenticated) return current;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // No token means there is nothing to ask about.
    if (!getToken()) {
      setSession(EMPTY);
      return current;
    }
    const session = await authApi.me();
    setSession(session);
    return session;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function signIn(identifier: string, secret: string): Promise<Session> {
  const session = await authApi.login(identifier, secret);
  setSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  await authApi.logout();
  setSession(EMPTY);
}

// ─── Authorization helpers ───────────────────────────────────────────────────

/**
 * Does the signed-in user hold this capability?
 *
 * This is a UI affordance only. The server checks the same capability on every
 * request, so hiding a control here is a courtesy, not a security boundary —
 * which is exactly the distinction the old implementation blurred.
 */
export function can(capability: string): boolean {
  return current.capabilities.includes(capability);
}

export function canAny(...capabilities: string[]): boolean {
  return capabilities.some((c) => current.capabilities.includes(c));
}

export function canAll(...capabilities: string[]): boolean {
  return capabilities.every((c) => current.capabilities.includes(c));
}

/** May the user open this portal tab? Accepts portal-local aliases. */
export function canAccessTab(tabId: string): boolean {
  return can(resolveTabCapability(tabId));
}

/** Filter a list of tabs down to the ones the user may open. */
export function visibleTabs<T extends { id: string }>(tabs: T[]): T[] {
  return tabs.filter((t) => canAccessTab(t.id));
}

export function capabilities(): string[] {
  return current.capabilities;
}

/** Row scope the server will apply, useful for explaining an empty list. */
export function scope(): Session['scope'] {
  return current.scope;
}

// ─── Wiring ──────────────────────────────────────────────────────────────────

/**
 * Install the global handler that reacts to the server rejecting our session,
 * e.g. after an administrator deactivates the account or resets its password.
 */
export function installSessionExpiryHandler(onExpired: () => void): () => void {
  setUnauthenticatedHandler(() => {
    setSession(EMPTY);
    onExpired();
  });
  return () => setUnauthenticatedHandler(null);
}
