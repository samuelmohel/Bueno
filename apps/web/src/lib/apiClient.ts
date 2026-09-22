/**
 * BUENO FREIGHT OS — API CLIENT
 *
 * Single place that talks to the PHP API. Attaches the session token, gives
 * errors a usable shape, and handles the 401/403/409 cases the server now
 * returns properly instead of the old "always HTTP 200, inspect the body"
 * contract.
 */

const TOKEN_KEY = 'bueno_token';

/** Where the API lives. Same origin in production; overridable for local dev. */
const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE) || '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: any = null
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is gone or was never valid. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** Authenticated, but not permitted. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Someone else changed this record first. */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** Field-level validation errors, when the server supplied them. */
  get fieldErrors(): Record<string, string> {
    return (this.body && typeof this.body.errors === 'object' && this.body.errors) || {};
  }

  /** The capability the caller was missing, if the server named one. */
  get requiredCapability(): string | null {
    return this.body?.requiredCapability ?? null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    /* private browsing / storage disabled */
  }
}

/** Called when the server rejects our session, so the app can send the user to sign in. */
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(fn: (() => void) | null): void {
  onUnauthenticated = fn;
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Send the previous ETag so an unchanged list answers 304. */
  etag?: string | null;
  signal?: AbortSignal;
  /** Suppress the global sign-out on 401 (used by the session probe itself). */
  allowUnauthenticated?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  etag: string | null;
  /** True when the server answered 304 and `data` is therefore unchanged. */
  notModified: boolean;
}

export async function request<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, etag, signal, allowUnauthenticated } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (etag) headers['If-None-Match'] = etag;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${path.replace(/^\//, '')}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: 'no-store',
    });
  } catch (err) {
    // Network failure, not an API error: the caller decides whether to keep
    // showing cached data or surface it.
    throw new ApiError(
      'Cannot reach the server. Check your connection.',
      0,
      { cause: String(err) }
    );
  }

  if (response.status === 304) {
    return { data: undefined as T, etag: etag ?? null, notModified: true };
  }

  const responseEtag = response.headers.get('ETag');

  let payload: any = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 500) };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !allowUnauthenticated) {
      setToken(null);
      onUnauthenticated?.();
    }
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      payload
    );
  }

  return { data: payload as T, etag: responseEtag, notModified: false };
}

/** Convenience wrappers. */
export const api = {
  get: <T = any>(path: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T = any>(path: string, body: unknown, opts: Omit<RequestOptions, 'method'> = {}) =>
    request<T>(path, { ...opts, method: 'POST', body }),
};

// ─── Authentication ──────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  userType?: string;
  assignedStation?: string | null;
  companyName?: string | null;
  staffId?: string | null;
  status?: string;
  mustChangeCredentials?: boolean;
  roleLabel?: string;
}

export interface Session {
  authenticated: boolean;
  user: SessionUser | null;
  capabilities: string[];
  scope: { scope: 'all' | 'company' | 'station'; company: string | null; station: string | null } | null;
}

export const authApi = {
  /**
   * @param remember Ask the server for a longer-lived session. It controls how
   *                 long the session lasts, never what it may do.
   */
  async login(identifier: string, secret: string, remember = false): Promise<Session> {
    const { data } = await api.post('auth.php', { action: 'login', identifier, secret, remember });
    setToken(data.token);
    return {
      authenticated: true,
      user: data.user,
      capabilities: data.capabilities ?? [],
      scope: data.scope ?? null,
    };
  },

  /** Resolve the current session, or an unauthenticated one. Never throws on 401. */
  async me(): Promise<Session> {
    try {
      const { data } = await api.get('auth.php', { allowUnauthenticated: true });
      return {
        authenticated: Boolean(data?.authenticated),
        user: data?.user ?? null,
        capabilities: data?.capabilities ?? [],
        scope: data?.scope ?? null,
      };
    } catch {
      return { authenticated: false, user: null, capabilities: [], scope: null };
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('auth.php', { action: 'logout' });
    } catch {
      // Revoking server-side is best effort; dropping the local token is what
      // actually ends the session for this browser.
    }
    setToken(null);
  },

  async changePassword(currentSecret: string, newSecret: string): Promise<void> {
    await api.post('auth.php', { action: 'change_password', currentSecret, newSecret });
    // The server revokes every session on a credential change, this one included.
    setToken(null);
  },
};
