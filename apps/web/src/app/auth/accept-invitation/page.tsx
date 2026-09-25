'use client';

import { Suspense, useEffect, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { api, ApiError, setToken } from '@/lib/apiClient';

/**
 * Accepting an account invitation.
 *
 * Reached from the link in the email sent when an account is provisioned.
 * Deliberately unauthenticated: the recipient has no credential yet, and the
 * token in the URL is the authorisation. It is single-use, expires, and is
 * revoked as soon as a newer one is issued.
 *
 * No password is ever emailed. One mailed out stays in the recipient's inbox,
 * the sending server's queue and any forward of it, cannot be withdrawn and
 * does not expire.
 */

interface InviteeDetails {
  fullName: string;
  email: string;
  roleLabel: string;
}

function AcceptInvitation() {
  const router = useRouter();
  const params = useSearchParams();
  const errorId = useId();
  const token = params?.get('token') ?? '';

  const [checking, setChecking] = useState(true);
  const [invitee, setInvitee] = useState<InviteeDetails | null>(null);
  const [linkError, setLinkError] = useState('');

  const [secret, setSecret] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [problems, setProblems] = useState<string[]>([]);

  // Check the link before showing a form, so an expired one says so instead of
  // being discovered only after a password has been chosen and typed twice.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setLinkError('This link is missing its invitation code. Use the link from your email exactly as it was sent.');
        setChecking(false);
        return;
      }
      try {
        const { data } = await api.post('auth.php', { action: 'check_invitation', token });
        if (cancelled) return;
        setInvitee({ fullName: data.fullName, email: data.email, roleLabel: data.roleLabel });
      } catch (err) {
        if (cancelled) return;
        setLinkError(
          err instanceof ApiError
            ? err.message
            : 'This invitation could not be checked. Try again, or ask your administrator for a new link.'
        );
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const mismatch = confirm.length > 0 && secret !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProblems([]);

    if (secret !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post('auth.php', {
        action: 'accept_invitation',
        token,
        newSecret: secret,
      });

      // The server signs them in on acceptance — asking someone to type a
      // password they set two seconds ago serves nobody.
      setToken(data.token);
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        const list = err.body?.problems;
        if (Array.isArray(list)) setProblems(list);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setSaving(false);
    }
  };

  const field =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 '
    + 'transition focus:border-navy focus:outline-none focus:ring-4 focus:ring-navy/10 '
    + 'disabled:bg-slate-50';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <main id="main-content" className="w-full max-w-[25rem]">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-mono text-lg font-bold text-slate-950">
            B
          </span>
          <span className="font-display text-base font-bold text-slate-900">Bueno Logistics</span>
        </Link>

        {checking ? (
          <p role="status" className="text-sm text-slate-600">Checking your invitation…</p>
        ) : linkError ? (
          <div role="alert" className="space-y-4">
            <h1 className="font-display text-[1.6rem] font-bold tracking-tight text-slate-900">
              This link cannot be used
            </h1>
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="text-xs font-semibold leading-relaxed text-amber-900">{linkError}</p>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Invitations can only be used once and expire after a few days. Ask whoever set up
              your account to send a new one — it takes them a moment.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:underline"
            >
              Go to sign in
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="font-display text-[1.6rem] font-bold tracking-tight text-slate-900">
                Choose your password
              </h1>
              <p className="text-sm leading-relaxed text-slate-600">
                Welcome, {invitee?.fullName}. Set a password and you will be signed in.
              </p>
            </div>

            <dl className="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs">
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-slate-500">Sign-in address</dt>
                <dd className="font-semibold text-slate-900">{invitee?.email}</dd>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <dt className="text-slate-500">Role</dt>
                <dd className="font-semibold text-slate-900">{invitee?.roleLabel}</dd>
              </div>
            </dl>

            {error && (
              <div
                id={errorId}
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3"
              >
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
                <div className="text-xs leading-relaxed text-rose-900">
                  <p className="font-semibold">{error}</p>
                  {problems.length > 0 && (
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {problems.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <div className="space-y-2">
                <label htmlFor="invite-password" className="block text-xs font-semibold text-slate-700">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="invite-password"
                    name="new-password"
                    type={show ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className={`${field} pr-11 font-mono`}
                    autoComplete="new-password"
                    autoFocus
                    required
                    disabled={saving}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? 'Hide password' : 'Show password'}
                    aria-pressed={show}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                <p className="text-2xs text-slate-500">At least 8 characters. Avoid anything obvious.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="invite-confirm" className="block text-xs font-semibold text-slate-700">
                  Confirm password
                </label>
                <input
                  id="invite-confirm"
                  name="confirm-password"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`${field} font-mono`}
                  autoComplete="new-password"
                  required
                  disabled={saving}
                  aria-invalid={mismatch}
                />
                {mismatch && (
                  <p className="text-2xs font-semibold text-rose-700">These do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || !secret || mismatch}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
              >
                {saving ? 'Setting your password…' : <>Set password and sign in <Check size={16} aria-hidden="true" /></>}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div role="status" className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <AcceptInvitation />
    </Suspense>
  );
}
