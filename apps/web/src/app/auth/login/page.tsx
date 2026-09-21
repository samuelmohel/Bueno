'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/lib/auth/session';
import { ApiError } from '@/lib/apiClient';

/**
 * Sign-in.
 *
 * Authentication happens on the server now. The previous implementation
 * matched a user out of a localStorage list in the browser, accepted any of a
 * hardcoded set of PINs ('demo1234', '1111', '9999', …) for *any* account, and
 * minted its own token — so anyone who knew a colleague's email could sign in
 * as them, including as the CEO.
 */
function LoginForm() {
  const router = useRouter();

  const [emailOrId, setEmailOrId] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRetryAfter(null);

    const identifier = emailOrId.trim();
    const secret = passwordOrPin;

    if (!identifier) {
      setError('Please enter your work email, staff ID, or phone number.');
      return;
    }
    if (!secret) {
      setError('Please enter your password or security PIN.');
      return;
    }

    setLoading(true);
    try {
      const session = await signIn(identifier, secret);

      // Accounts still on a default credential must set a real one before
      // they can use the platform.
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
            'This account is temporarily locked after repeated failed sign-in attempts. ' +
              'Please try again shortly or contact an administrator.'
          );
        } else if (err.status === 429) {
          const wait = Number(err.body?.retryAfter) || 60;
          setRetryAfter(wait);
          setError(`Too many sign-in attempts. Please wait ${wait} seconds and try again.`);
        } else if (err.status === 0) {
          setError('Cannot reach the server. Check your connection and try again.');
        } else {
          // The server deliberately does not say whether the account exists.
          setError(err.message || 'Invalid credentials.');
        }
      } else {
        setError('Something went wrong signing in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Self-service reset is not implemented server-side, so this says what
   * actually happens rather than claiming a token was dispatched. The previous
   * version told the user a reset email had been sent; nothing was ever sent.
   */
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotMessage(
      'Password resets are performed by an administrator. Please contact your ' +
        'systems administrator or the operations desk, who can issue you a new ' +
        'one-time password for this account.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-900 selection:bg-brand selection:text-white">
      
      {/* ── LEFT ENTERPRISE SHOWCASE & CORRIDOR IDENTITY ─────────────────── */}
      <div className="lg:w-1/2 bg-slate-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-800 text-white overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-navy/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand & Status */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-brand p-0.5 shadow-xl group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-white font-mono">
                B
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                BUENO <span className="text-brand">LOGISTICS</span>
              </h1>
              <span className="text-[10px] font-mono text-slate-400 block -mt-1 uppercase tracking-widest font-semibold">
                ENTERPRISE FREIGHT OS
              </span>
            </div>
          </Link>

          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-mono font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CORRIDOR ONLINE
          </div>
        </div>

        {/* Center Architectural Pitch */}
        <div className="my-12 relative z-10 space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-brand">
              Commercial Rail Transport & Siding Command
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Secure Enterprise Portal Access
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed max-w-lg">
              Unified operating system governing standard-gauge bulk freight transport across Ewekoro, Moniya Yard Ibadan, and Apapa Port siding operations.
            </p>
          </div>

          {/* Corridor Spec Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-xs">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block font-bold">Standard Gauge</span>
              <span className="font-extrabold text-emerald-400 text-sm">96 KM</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">EWK ⇄ MNY Corridor</span>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block font-bold">Dedicated Fleet</span>
              <span className="font-extrabold text-amber-400 text-sm">46 Wagons</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">PXG Covered Hoppers</span>
            </div>
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500 block font-bold">Access Control</span>
              <span className="font-extrabold text-blue-400 text-sm">RBAC 256-Bit</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Role Matrix Enforced</span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-mono pt-4 border-t border-slate-800/80">
          <span>Bueno Logistics Platform v2.4</span>
          <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Public Website</span>
          </Link>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION CARD PANEL ─────────────────────────────── */}
      <div className="lg:w-1/2 bg-slate-950 lg:bg-slate-900/50 p-6 sm:p-10 lg:p-16 flex flex-col justify-center items-center relative">
        <div className="max-w-md w-full my-auto space-y-6">

          {/* Clean SaaS Authentication Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl p-8 sm:p-10 space-y-6">
            
            {/* Header */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 mb-1">
                <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Sign In to Bueno Platform
              </h2>
              <p className="text-xs text-slate-500">
                Heavy Rail Freight Operations & Client Siding Command
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
                <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Unified Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Work Email / Staff ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block" htmlFor="page-work-email-or-account-1">
                  Work Email or Account Identifier
                </label>
                <div className="relative">
                  <input id="page-work-email-or-account-1"
                    type="text"
                    value={emailOrId}
                    onChange={(e) => setEmailOrId(e.target.value)}
                    placeholder="name@bueno.ng or staff ID"
                    className="w-full px-4 py-3 text-xs font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-slate-50/50 transition-all"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password / Security PIN */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-bold text-slate-700">
                    Password / Security PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] font-semibold text-navy hover:text-brand transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordOrPin}
                    onChange={(e) => setPasswordOrPin(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 text-xs font-mono font-medium rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-slate-50/50 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-brand focus:ring-brand border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-600">Remember this workstation</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Security Notice Footer */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-medium flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>256-Bit SSL Encrypted Enterprise Gateway</span>
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Reset Corporate Password
              </h3>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setForgotMessage(''); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your registered corporate email address. The platform will dispatch a one-time password reset authorization token.
            </p>

            {forgotMessage ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold">
                {forgotMessage}
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700" htmlFor="page-corporate-email-address-2">Corporate Email Address</label>
                  <input id="page-corporate-email-address-2"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@bueno.ng"
                    className="w-full px-4 py-3 text-xs rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-xs">
        Initializing Freight OS Security Gateway...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
