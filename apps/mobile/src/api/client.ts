/**
 * Bueno Logistics API client
 * Patterns borrowed from Loka: request queuing, exponential backoff, retry on 429,
 * role isolation in SecureStore, timeout on auth calls.
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ── Request throttle (max 10 req / 10s) ──────────────────────────────────────
let lastRequestTime = 0;
const MIN_REQUEST_GAP = 120; // ms — conservative for our own server (not Xano free tier)

async function waitForSlot() {
  const now = Date.now();
  const gap = now - lastRequestTime;
  if (gap < MIN_REQUEST_GAP) {
    await new Promise(r => setTimeout(r, MIN_REQUEST_GAP - gap));
  }
  lastRequestTime = Date.now();
}

// ── Token helpers (SecureStore, not localStorage) ─────────────────────────────
export const TokenStore = {
  get:     () => SecureStore.getItemAsync('bueno_token'),
  set:     (t: string) => SecureStore.setItemAsync('bueno_token', t),
  clear:   () => SecureStore.deleteItemAsync('bueno_token'),
  getUser: () => SecureStore.getItemAsync('bueno_user'),
  setUser: (u: object) => SecureStore.setItemAsync('bueno_user', JSON.stringify(u)),
  clearUser: () => SecureStore.deleteItemAsync('bueno_user'),
  // Role isolation — prevents loading the wrong portal's data
  getRole: () => SecureStore.getItemAsync('bueno_role'),
  setRole: (r: string) => SecureStore.setItemAsync('bueno_role', r),
  clearRole: () => SecureStore.deleteItemAsync('bueno_role'),
  clearAll: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('bueno_token'),
      SecureStore.deleteItemAsync('bueno_user'),
      SecureStore.deleteItemAsync('bueno_role'),
    ]);
  },
};

// ── Axios instance ─────────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use(async (config) => {
  await waitForSlot();
  const token = await TokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor with retry on 429 and auto-logout on 401 ─────────────
const MAX_RETRIES = 3;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError & { _retryCount?: number }) => {
    const status = error.response?.status;

    // Retry on 429 with exponential backoff (borrowed from Loka)
    if (status === 429) {
      error._retryCount = (error._retryCount ?? 0) + 1;
      if (error._retryCount <= MAX_RETRIES) {
        const delay = Math.pow(2, error._retryCount) * 1000 + Math.random() * 500;
        console.warn(`Rate limited — retry ${error._retryCount}/${MAX_RETRIES} in ${Math.round(delay)}ms`);
        await new Promise(r => setTimeout(r, delay));
        return api(error.config as AxiosRequestConfig);
      }
    }

    // Auto-clear session on 401
    if (status === 401) {
      await TokenStore.clearAll();
    }

    return Promise.reject(error);
  }
);

// ── Sequential loader helper (prevents stampede on app startup) ───────────────
export async function loadSequentially<T extends readonly (() => Promise<any>)[]>(
  loaders: T,
  delayMs = 300
): Promise<{ [K in keyof T]: T[K] extends () => Promise<infer R> ? R : never }> {
  const results: any[] = [];
  for (const loader of loaders) {
    try {
      results.push(await loader());
    } catch (e) {
      console.warn('Sequential loader error (continuing):', e);
      results.push(null);
    }
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs));
  }
  return results as any;
}

// ── Auth call with timeout (from Loka's 12s pattern) ─────────────────────────
export async function authRequest<T>(
  fn: () => Promise<T>,
  timeoutMs = 12000
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('AUTH_TIMEOUT')), timeoutMs)
  );
  return Promise.race([fn(), timeout]);
}
