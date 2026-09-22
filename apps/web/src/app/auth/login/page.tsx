'use client';

import { Suspense, useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertTriangle, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { signIn } from '@/lib/auth/session';
import { ApiError } from '@/lib/apiClient';

/**
 * Sign-in.
 *
 * Authentication happens on the server. The previous implementation matched a
 * user out of a localStorage list in the browser, accepted any of a hardcoded
 * set of PINs ('demo1234', '1111', '9999', …) for *any* account, and minted its
 * own token — so anyone who knew a colleague's email could sign in as them,
 * including as the CEO.
 *
 * ── On the claims this page used to make ──────────────────────────────────
 *
 * It advertised "RBAC 256-Bit", "256-Bit SSL Encrypted Enterprise Gateway", a
 * pulsing "CORRIDOR ONLINE" status that checked nothing, a "96 KM" corridor
 * shorter than the straight-line distance between the two stations it names,
 * a "Remember this workstation" checkbox wired to nothing, and a password
 * reset that promised a token it never sent.
 *
 * None of that is harmless decoration. RBAC has no bit length; SSL is the
 * deprecated name for TLS and every site has it; a status indicator that
 * cannot report a fault is worse than no indicator. The people evaluating this
 * platform are the ones who will notice, and a page that overstates the small
 * things invites doubt about the large ones. Everything here is now either
 * true or absent.
 */
function LoginForm() {
  const router = useRouter();
  const errorId = useId();

  const [emailOrId, setEmailOrId] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryIn, setRetryIn] = useState(0);

  // If a valid session already exists, don't make the user sign in again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { loadSession } = await import('@/lib/auth/session');
      const s = await loadSession(true);
      if (!cancelled && s.authenticated) {
        router.replace('/dashboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /**
   * Count the rate-limit wait down.
   *
   * The server returns how long to wait and the page used to state it once,
   * then leave it stale — so the only way to know whether the wait was over
   * was to try and be refused again.
   */
  useEffect(() => {
    if (retryIn <= 0) return;
    const id = setInterval(() => setRetryIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(id);
  }, [retryIn]);

  const blocked = loading || retryIn > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const identifier = emailOrId.trim();
    const secret = passwordOrPin;

    if (!identifier) {
      setError('Enter your work email, staff ID, or phone number.');
      return;
    }
    if (!secret) {
      setError('Enter your password or security PIN.');
      return;
    }

    setLoading(true);
    try {
      const session = await signIn(identifier, secret);

      // Accounts still on a one-time credential must set a real one first.
      if (session.user?.mustChangeCredentials) {
        router.push('/auth/change-password?reason=first-sign-in');
        return;
      }

      if (session.user?.role === 'HEAD_OF_FINANCE' || session.user?.role === 'ACCOUNTANT') {
        router.push('/dashboard?tab=billing');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          setError(
            'This account is temporarily locked after repeated failed attempts. '
            + 'Wait a few minutes, or ask an administrator to reset your password.'
          );
        } else if (err.status === 429) {
          const wait = Number(err.body?.retryAfter) || 60;
          setRetryIn(wait);
          setError('Too many sign-in attempts from this connection.');
        } else if (err.status === 0) {
          setError('Cannot reach the server. Check your connection and try again.');
        } else {
          // The server deliberately does not say whether the account exists.
          setError(err.message || 'Those details were not recognised.');
        }
      } else {
        setError('Something went wrong signing in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 '
    + 'placeholder:text-slate-400 transition-colors focus:border-navy focus:outline-none '
    + 'focus:ring-2 focus:ring-navy/40 disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 font-sans lg:flex-row">
      {/* ── Left: who this is and what it governs ───────────────────────── */}
      <div className="relative flex flex-col justify-between overflow-hidden border-b border-slate-800 bg-slate-900 p-8 text-white sm:p-12 lg:w-1/2 lg:border-b-0 lg:border-r lg:p-16">
        {/* Decorative only — hidden from assistive technology. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-navy/25 blur-3xl"
        />

        <Link href="/" className="relative z-10 flex items-center gap-3 self-start rounded-xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand font-mono text-xl font-black text-slate-950">
            B
          </span>
          <span>
            <span className="font-display block text-lg font-black tracking-wide text-white">
              BUENO <span className="text-brand">LOGISTICS</span>
            </span>
            <span className="block text-3xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Enterprise Freight OS
            </span>
          </span>
        </Link>

        <div className="relative z-10 my-12 space-y-8">
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
              Rail freight operations,
              <br />
              <span className="text-brand">end to end.</span>
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-slate-300">
              Loading, dispatch, telemetry, manifests and settlement for standard-gauge bulk
              freight across the Ewekoro, Moniya Yard and Apapa Port sidings.
            </p>
          </div>

          {/*
            Three statements that are true and checkable, replacing a set that
            was not: a corridor distance shorter than the straight line between
            its own endpoints, and "RBAC 256-Bit" — a measure that does not
            exist for access control.
          */}
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              { term: 'Corridor', detail: 'Ewekoro ⇄ Moniya Yard, Ibadan' },
              { term: 'Dedicated fleet', detail: '46 PXG covered hopper wagons' },
              { term: 'Access control', detail: 'Per-role capabilities, enforced server-side' },
            ].map((item) => (
              <div
                key={item.term}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <dt className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                  {item.term}
                </dt>
                <dd className="mt-1 text-xs font-semibold leading-snug text-slate-200">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative z-10 border-t border-slate-800 pt-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Back to the public site
          </Link>
        </div>
      </div>

      {/* ── Right: the form ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-slate-950 p-6 sm:p-10 lg:w-1/2 lg:p-16">
        <main id="main-content" className="w-full max-w-md">
          <div className="rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-black tracking-tight text-slate-900">
                Sign in
              </h2>
              <p className="text-sm text-slate-600">
                Use the work email or staff ID your administrator issued.
              </p>
            </div>

            {/*
              role="alert" so a screen reader announces a failed sign-in. Before
              this, the message appeared silently and a non-sighted user had no
              indication the attempt had been refused at all.
            */}
            {error && (
              <div
                id={errorId}
                role="alert"
                className="mt-6 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-700" aria-hidden="true" />
                <div className="text-xs font-semibold leading-relaxed text-rose-900">
                  <p>{error}</p>
                  {retryIn > 0 && (
                    <p className="mt-1 font-mono font-bold">
                      You can try again in {retryIn}s.
                    </p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="login-identifier" className="block text-xs font-bold text-slate-700">
                  Work email or staff ID
                </label>
                <input
                  id="login-identifier"
                  name="username"
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="name@bueno.ng"
                  className={inputClass}
                  // Lets a password manager fill this. Its absence is a real
                  // obstacle in an organisation that mandates one.
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  required
                  disabled={blocked}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="login-password" className="block text-xs font-bold text-slate-700">
                    Password or security PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="rounded text-2xs font-bold text-navy underline-offset-2 transition-colors hover:underline"
                  >
                    Forgotten it?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="current-password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordOrPin}
                    onChange={(e) => setPasswordOrPin(e.target.value)}
                    className={`${inputClass} pr-12 font-mono`}
                    autoComplete="current-password"
                    required
                    disabled={blocked}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? errorId : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    // The old control had only a `title`, which is not an
                    // accessible name and is never read aloud.
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    {showPassword
                      ? <EyeOff size={16} aria-hidden="true" />
                      : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              {/*
                brand-700 rather than brand: the brand green on white measures
                2.4:1, well under the 4.5:1 WCAG AA needs for text. This tone
                measures 5.0:1 and is the same hue. The green stays as-is on the
                dark panel, where it already passes at 7.5:1.
              */}
              <button
                type="submit"
                disabled={blocked}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {loading ? (
                  <>
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                      aria-hidden="true"
                    />
                    <span>Signing in…</span>
                  </>
                ) : retryIn > 0 ? (
                  <span>Try again in {retryIn}s</span>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {/*
              Replaces "256-Bit SSL Encrypted Enterprise Gateway". SSL is the
              deprecated name for TLS, every site has it, and advertising it
              tells a reader nothing they can act on. This tells them something
              they can.
            */}
            <p className="mt-6 flex items-start gap-2 border-t border-slate-200 pt-5 text-2xs leading-relaxed text-slate-600">
              <Lock size={13} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
              <span>
                Sessions end automatically after a period of inactivity. If you did not expect to
                be asked to sign in, tell your administrator.
              </span>
            </p>
          </div>
        </main>
      </div>

      {/* ── Forgotten password ──────────────────────────────────────────── */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <h3 id="forgot-title" className="font-display text-lg font-black text-slate-900">
              Forgotten password
            </h3>

            {/*
              This screen used to collect an email, say the platform would
              "dispatch a one-time password reset authorization token", and
              offer a "Send Reset Link" button. Nothing was ever sent — there is
              no self-service reset — so it left people waiting for a message
              that was never coming. It now says what actually happens.
            */}
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                Password resets are carried out by an administrator. There is no self-service
                reset, and no email will be sent.
              </p>
              <p>
                Contact your systems administrator or the operations desk. They can issue a new
                one-time password for your account, which you will be asked to change when you
                next sign in.
              </p>
            </div>

            {forgotMessage && (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-700">
                Quote your work email address when you contact them, so they can find the right
                account.
              </p>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotMessage(false);
                }}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-2xs font-black uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setForgotMessage(true)}
                className="rounded-xl bg-navy px-5 py-2.5 text-2xs font-black uppercase tracking-wider text-white transition-colors hover:bg-navy-600"
              >
                What do I tell them?
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-screen items-center justify-center bg-slate-950 text-xs font-semibold text-slate-400"
          role="status"
        >
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
