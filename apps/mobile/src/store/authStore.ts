/**
 * Auth store — role isolation, timeout on login, sequential data loading.
 * Patterns from Loka: role-gated data load, login timeout, clearAll on logout.
 */
import { create } from 'zustand';
import { authApi } from '../api/auth';
import { TokenStore, authRequest, loadSequentially } from '../api/client';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login:          (email: string, password: string) => Promise<void>;
  register:       (data: RegisterData) => Promise<void>;
  logout:         () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError:     () => void;
}

interface RegisterData {
  fullName: string; email: string; phone: string; password: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  clearError: () => set({ error: null }),

  restoreSession: async () => {
    try {
      const [token, userStr, role] = await Promise.all([
        TokenStore.get(),
        TokenStore.getUser(),
        TokenStore.getRole(),
      ]);
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        // Role isolation — only restore if role matches stored role
        if (role && user.role !== role) {
          await TokenStore.clearAll();
          return;
        }
        set({ token, user, isAuthenticated: true });
      }
    } catch {
      await TokenStore.clearAll();
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // 12-second timeout (from Loka — prevents hanging on slow networks)
      const { data } = await authRequest(
        () => authApi.login(email, password),
        12000
      );

      await Promise.all([
        TokenStore.set(data.accessToken),
        TokenStore.setUser(data.user),
        TokenStore.setRole(data.user.role),
      ]);

      set({ token: data.accessToken, user: data.user, isAuthenticated: true });
    } catch (e: any) {
      const msg = e.message === 'AUTH_TIMEOUT'
        ? 'Connection timed out — check your network and try again'
        : e.response?.data?.message || 'Invalid email or password';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authRequest(
        () => authApi.register(formData),
        12000
      );
      await Promise.all([
        TokenStore.set(data.accessToken),
        TokenStore.setUser(data.user),
        TokenStore.setRole(data.user.role),
      ]);
      set({ token: data.accessToken, user: data.user, isAuthenticated: true });
    } catch (e: any) {
      const msg = e.message === 'AUTH_TIMEOUT'
        ? 'Connection timed out — check your network and try again'
        : e.response?.data?.message || 'Registration failed';
      set({ error: msg });
      throw new Error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    await TokenStore.clearAll();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },
}));
