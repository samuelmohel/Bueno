'use client';

import { Suspense, useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
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
 * On the claims this page used to make: it advertised "RBAC 256-Bit", a
 * "256-Bit SSL Encrypted Enterprise Gateway", a pulsing "CORRIDOR ONLINE"
 * status that checked nothing, and a corridor distance shorter than the
 * straight line between the two stations it named. Access control has no bit
 * length, SSL is the deprecated name for TLS, and a status light that cannot
 * report a fault asserts health it never checked. Everything here is now
 * either true or absent.
 */

/** The three terminals this platform actually operates between. */
const TERMINALS = [
  { code: 'EWK', name: 'Ewekoro', role: 'Loading siding' },
  { code: 'MNY', name: 'Moniya Yard', role: 'Ibadan terminal' },
  { code: 'APT', name: 'Apapa', role: 'Maritime port' },
];

/**
 * The corridor, drawn as a line of terminals.
 *
 * Deliberately a diagram of what the platform covers rather than a map: the
 * page previously claimed a "96 KM" corridor, which is shorter than the
 * straight-line distance between the two stations it named, so it cannot have
 * been a rail distance. Naming the terminals is something that can be checked;
 * asserting a geography is not.
 */
function CorridorDiagram() {
  return (
    <div aria-hidden="true" className="select-none">
      <svg viewBox="0 0 340 74" className="h-auto w-full max-w-sm" role="presentation">
        {/* Sleepers under the rail, for texture rather than meaning. */}
        <g stroke="currentColor" className="text-slate-800" strokeWidth="6">
          {Array.from({ length: 24 }).map((_, i) => (
            <line key={i} x1={16 + i * 13} y1="14" x2={16 + i * 13} y2="26" />
          ))}
        </g>

        {/* Two rails. */}
        <line x1="8" y1="17" x2="332" y2="17" stroke="currentColor" className="text-slate-700" strokeWidth="1.5" />
        <line x1="8" y1="23" x2="332" y2="23" stroke="currentColor" className="text-slate-700" strokeWidth="1.5" />

        {TERMINALS.map((t, i) => {
          const x = 24 + i * 146;
          return (
            <g key={t.code}>
              <circle cx={x} cy="20" r="8" className="fill-slate-950" />
              <circle cx={x} cy="20" r="8" className="fill-none stroke-brand" strokeWidth="2.5" />
              <circle cx={x} cy="20" r="2.5" className="fill-brand" />
              <text
                x={x} y="48"
                className="fill-white font-mono text-[11px] font-bold"
                textAnchor={i === 0 ? 'start' : i === TERMINALS.length - 1 ? 'end' : 'middle'}
                transform={i === 0 ? 'translate(-16 0)' : i === TERMINALS.length - 1 ? 'translate(16 0)' : ''}
              >
                {t.code}
              </text>
              <text
                x={x} y="64"
                className="fill-slate-400 text-[10px]"
                textAnchor={i === 0 ? 'start' : i === TERMINALS.length - 1 ? 'end' : 'middle'}
                transform={i === 0 ? 'translate(-16 0)' : i === TERMINALS.length - 1 ? 'translate(16 0)' : ''}
              >
                {t.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const errorId = useId();

  const [emailOrId, setEmailOrId] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Off by default. A siding terminal is shared, and the safe assumption about
  // an unknown machine is that somebody else will use it next.
  const [remember, setRemember] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

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
   * The server returns how long to wait; the page used to state it once and
   * then leave it stale, so the only way to learn the wait was over was to try
   * and be refused again.
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
    if (!identifier) {
      setError('Enter your work email, staff ID, or phone number.');
      return;
    }
    if (!passwordOrPin) {
      setError('Enter your password or security PIN.');
      return;
    }

    setLoading(true);
    try {
      const session = await signIn(identifier, passwordOrPin, remember);

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
          setRetryIn(Number(err.body?.retryAfter) || 60);
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

  const field =
    'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 '
    + 'placeholder:text-slate-400 transition focus:border-navy focus:outline-none '
    + 'focus:ring-4 focus:ring-navy/10 disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* ── Left: identity and scope ────────────────────────────────────── */}
      <aside className="relative flex flex-col justify-between overflow-hidden bg-slate-950 px-8 py-10 text-white sm:px-12 lg:w-[46%] lg:px-14 lg:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 top-1/3 h-[28rem] w-[28rem] rounded-full bg-brand/[0.07] blur-3xl"
        />

        <Link href="/" className="relative z-10 flex items-center gap-3 self-start rounded-lg">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-mono text-lg font-bold text-slate-950">
            B
          </span>
          <span className="leading-tight">
            <span className="font-display block text-base font-bold tracking-wide">
              Bueno Logistics
            </span>
            <span className="block text-3xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Freight Operations
            </span>
          </span>
        </Link>

        <div className="relative z-10 my-14 space-y-10 lg:my-0">
          <div className="space-y-5">
            <h1 className="font-display max-w-md text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-[2.5rem]">
              One system, from loading siding to settlement.
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              Dispatch, wagon allocation, GPS telemetry, manifests and invoicing for
              standard-gauge bulk freight.
            </p>
          </div>

          <div className="space-y-3">
            <CorridorDiagram />
            <p className="text-2xs text-slate-500">
              {TERMINALS.map((t) => t.name).join(' · ')}
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="relative z-10 inline-flex items-center gap-2 self-start rounded-lg text-xs font-medium text-slate-500 transition-colors hover:text-slate-200"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to the public site
        </Link>
      </aside>

      {/* ── Right: the form ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12 sm:px-10 lg:px-14">
        <main id="main-content" className="w-full max-w-[25rem]">
          <div className="space-y-2">
            <h2 className="font-display text-[1.75rem] font-bold tracking-tight text-slate-900">
              Sign in
            </h2>
            <p className="text-sm text-slate-600">
              Use the work email or staff ID your administrator issued you.
            </p>
          </div>

          {/*
            role="alert" so a refused sign-in is announced. It was previously
            silent, leaving a screen-reader user with no indication the attempt
            had failed at all.
          */}
          {error && (
            <div
              id={errorId}
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3"
            >
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
              <div className="text-xs leading-relaxed text-rose-900">
                <p className="font-semibold">{error}</p>
                {retryIn > 0 && (
                  <p className="mt-0.5 font-mono">You can try again in {retryIn}s.</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
            <div className="space-y-2">
              <label htmlFor="login-identifier" className="block text-xs font-semibold text-slate-700">
                Work email or staff ID
              </label>
              <input
                id="login-identifier"
                name="username"
                type="text"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="name@bueno.ng"
                className={field}
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

            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700">
                  Password or security PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="rounded text-xs font-medium text-navy underline-offset-2 hover:underline"
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
                  className={`${field} pr-11 font-mono`}
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
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {showPassword
                    ? <EyeOff size={16} aria-hidden="true" />
                    : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/*
              This control now does something. It previously sat here ticked by
              default and read by nothing — signIn() took an identifier and a
              secret, and there was no third argument. The server issues a
              14-day session when it is set and a 12-hour one when it is not.
            */}
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={blocked}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 text-brand-700 focus:ring-brand"
              />
              <span className="text-xs leading-snug text-slate-600">
                <span className="font-semibold text-slate-800">Keep me signed in</span>
                <span className="mt-0.5 block text-slate-500">
                  Stays signed in for 14 days instead of 12 hours. Leave this off on a shared
                  terminal.
                </span>
              </span>
            </label>

            {/*
              brand-700, not brand: the brand green measures 2.4:1 against white
              text, well under the 4.5:1 WCAG AA requires of the primary action
              on the page. This is the same hue at 5.0:1. The brighter green
              stays on the dark panel, where it already passes at 7.5:1.
            */}
            <button
              type="submit"
              disabled={blocked}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {loading ? (
                <>
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    aria-hidden="true"
                  />
                  Signing in…
                </>
              ) : retryIn > 0 ? (
                <>Try again in {retryIn}s</>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/*
            Replaces "256-Bit SSL Encrypted Enterprise Gateway". SSL is the
            deprecated name for TLS, every site has it, and it tells a reader
            nothing they can act on. This tells them something they can.
          */}
          <p className="mt-8 border-t border-slate-200 pt-5 text-xs leading-relaxed text-slate-600">
            Sessions end automatically. If you did not expect to be asked to sign in, tell your
            administrator.
          </p>
        </main>
      </div>

      {/* ── Forgotten password ──────────────────────────────────────────── */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <h3 id="forgot-title" className="font-display text-lg font-bold text-slate-900">
              Forgotten password
            </h3>

            {/*
              This used to collect an email, promise a "one-time password reset
              authorization token", and offer a "Send Reset Link" button.
              Nothing was ever sent — there is no self-service reset — so it
              left people waiting for a message that was never coming.
            */}
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                Password resets are carried out by an administrator. There is no self-service
                reset and no email will be sent.
              </p>
              <p>
                Contact your systems administrator or the operations desk, quoting your work email
                address. They can issue a new one-time password, which you will be asked to change
                when you next sign in.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="mt-6 w-full rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Close
            </button>
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
          role="status"
          className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500"
        >
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
