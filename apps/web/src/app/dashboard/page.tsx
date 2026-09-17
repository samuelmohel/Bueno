'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StateEngine } from '@/lib/services/StateEngine';
import {
  loadSession,
  signOut,
  installSessionExpiryHandler,
  type SessionUser,
} from '@/lib/auth/session';
import { CustomerPortal } from '@/components/portals/CustomerPortal';
import { CargoOfficerPortal } from '@/components/portals/CargoOfficerPortal';
import { AdminPortal } from '@/components/portals/AdminPortal';

/**
 * Portal shell.
 *
 * Identity comes from the server. Previously this read the user object out of
 * localStorage, which meant editing one value in devtools was enough to open
 * the executive portal.
 */
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  const goToLogin = useCallback(() => router.replace('/auth/login'), [router]);

  useEffect(() => {
    let cancelled = false;

    // If the server rejects our session mid-use — the account was deactivated,
    // its password was reset, or the session expired — return to sign-in
    // rather than leaving a dead screen.
    const uninstall = installSessionExpiryHandler(goToLogin);

    (async () => {
      try {
        const session = await loadSession(true);
        if (cancelled) return;

        if (!session.authenticated || !session.user) {
          goToLogin();
          return;
        }

        if (session.user.mustChangeCredentials) {
          router.replace('/auth/change-password?reason=first-sign-in');
          return;
        }

        setUser(session.user);
        setState('ready');

        // First data pull; portals refresh themselves thereafter.
        void StateEngine.syncRemote();
      } catch (err) {
        if (cancelled) return;
        setMessage(err instanceof Error ? err.message : 'Could not load your workspace.');
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
      uninstall();
    };
  }, [router, goToLogin]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    StateEngine.clearLocalCaches();
    goToLogin();
  }, [goToLogin]);

  if (state === 'loading' || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-slate-900 space-y-3">
          <div className="w-10 h-10 border-[3px] border-slate-300 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-lg font-black text-slate-900">Could not load your workspace</h2>
          <p className="text-xs text-slate-500">{message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#62BC37] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const role = user.role;

  if (role === 'CARGO_OFFICER') {
    return <CargoOfficerPortal user={user} onSignOut={handleSignOut} />;
  }

  if (role === 'CUSTOMER' || role === 'CONSIGNEE') {
    return <CustomerPortal user={user} onSignOut={handleSignOut} />;
  }

  // CEO, MD, Head of Operations, Head of Finance, Accountant and Admin share
  // the executive portal; which tabs they see is decided by their
  // server-issued capabilities, not by the role name.
  return <AdminPortal user={user} onSignOut={handleSignOut} />;
}
