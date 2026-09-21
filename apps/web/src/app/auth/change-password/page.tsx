'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, ApiError } from '@/lib/apiClient';
import { loadSession, getUser } from '@/lib/auth/session';

/**
 * Set a new password.
 *
 * Reached automatically after signing in with an account still on a
 * well-known default credential (migration 003 flags those), and available
 * voluntarily from account settings.
 */
function ChangePasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const isFirstSignIn = params?.get('reason') === 'first-sign-in';

  const [currentSecret, setCurrentSecret] = useState('');
  const [newSecret, setNewSecret] = useState('');
  const [confirmSecret, setConfirmSecret] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await loadSession(true);
      if (cancelled) return;
      if (!session.authenticated) {
        router.replace('/auth/login');
        return;
      }
      setUserName(getUser()?.fullName ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const strengthProblems = (value: string): string[] => {
    const problems: string[] = [];
    if (value.length > 0 && value.length < 8) problems.push('At least 8 characters');
    const wellKnown = ['1111', '2222', '3333', '4444', '6666', '7777', '8888', '9999', '1234', 'demo1234', 'password', 'admin'];
    if (wellKnown.includes(value.toLowerCase())) problems.push('Not a well-known default');
    if (value.length > 0 && /^(.)\1*$/.test(value)) problems.push('Not a single repeated character');
    return problems;
  };

  const problems = strengthProblems(newSecret);
  const mismatch = confirmSecret.length > 0 && newSecret !== confirmSecret;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (newSecret !== confirmSecret) {
      setError('The two new passwords do not match.');
      return;
    }
    if (problems.length > 0) {
      setError('Please choose a stronger password.');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentSecret, newSecret);
      setDone(true);
      // Every session was revoked, including this one, so sign in again.
      setTimeout(() => router.replace('/auth/login'), 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.message);
      } else {
        setError('Could not update your password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 max-w-md w-full text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-900">Password updated</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            For security, every signed-in session for this account has been ended.
            Redirecting you to sign in again&hellip;
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-10 max-w-md w-full space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 mb-1">
            <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isFirstSignIn ? 'Set your password' : 'Change your password'}
          </h2>
          {isFirstSignIn ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              {userName ? `Welcome, ${userName}. ` : ''}
              This account is still using a default credential that others may know.
              Please choose a password only you have before continuing.
            </p>
          ) : (
            <p className="text-xs text-slate-500">Choose a new password for your account.</p>
          )}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block" htmlFor="page-field-1-1">
              {isFirstSignIn ? 'Current password or PIN' : 'Current password'}
            </label>
            <input id="page-field-1-1"
              type={show ? 'text' : 'password'}
              value={currentSecret}
              onChange={(e) => setCurrentSecret(e.target.value)}
              className="w-full px-4 py-3 text-xs font-mono rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand bg-slate-50/50"
              required
              autoFocus
            />
            {fieldErrors.currentSecret && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.currentSecret}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block" htmlFor="page-new-password-2">New password</label>
            <input id="page-new-password-2"
              type={show ? 'text' : 'password'}
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              className="w-full px-4 py-3 text-xs font-mono rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand bg-slate-50/50"
              required
            />
            {fieldErrors.newSecret && (
              <p className="text-[11px] text-rose-600 font-semibold">{fieldErrors.newSecret}</p>
            )}
            {newSecret.length > 0 && (
              <ul className="text-[11px] space-y-0.5 pt-1">
                {['At least 8 characters', 'Not a well-known default', 'Not a single repeated character'].map((rule) => {
                  const failing = problems.includes(rule);
                  return (
                    <li key={rule} className={failing ? 'text-slate-400' : 'text-emerald-600 font-semibold'}>
                      {failing ? '○' : '✓'} {rule}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block" htmlFor="page-confirm-new-password-3">Confirm new password</label>
            <input id="page-confirm-new-password-3"
              type={show ? 'text' : 'password'}
              value={confirmSecret}
              onChange={(e) => setConfirmSecret(e.target.value)}
              className={`w-full px-4 py-3 text-xs font-mono rounded-xl border text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand bg-slate-50/50 ${
                mismatch ? 'border-rose-300' : 'border-slate-200'
              }`}
              required
            />
            {mismatch && <p className="text-[11px] text-rose-600 font-semibold">Passwords do not match.</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={show}
              onChange={(e) => setShow(e.target.checked)}
              className="w-4 h-4 rounded text-brand focus:ring-brand border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-600">Show passwords</span>
          </label>

          <button
            type="submit"
            disabled={loading || problems.length > 0 || mismatch || !currentSecret || !newSecret}
            className="w-full py-3.5 px-4 bg-brand hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ChangePasswordForm />
    </Suspense>
  );
}
