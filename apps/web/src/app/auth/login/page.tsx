'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

/* ── Auth Cookie Helper ────────────────────────────── */
function setAuthCookieAndStorage(token: string, user: any) {
  localStorage.setItem('bueno_token', token);
  localStorage.setItem('bueno_user', JSON.stringify(user));
  document.cookie = `bueno_token=${token}; path=/; max-age=86400; SameSite=Lax`;
}

/* ── Corporate Demo Accounts List (Tucked in collapsible drawer) ── */
const DEMO_PERSONAS = [
  // C-Suite & Executives
  { label: 'Managing Director / CEO', sub: 'Full Network & Financial Clearance', email: 'ceo@bueno.ng', role: 'CEO', company: 'Bueno Logistics HQ' },
  { label: 'Head of Finance / Accountant', sub: 'Disbursements & Financial Audit', email: 'finance@bueno.ng', role: 'HEAD_OF_FINANCE', company: 'Bueno Logistics HQ' },
  { label: 'Head of Operations', sub: 'Corridor Command & Dispatch', email: 'ops.command@bueno.ng', role: 'HEAD_OF_OPERATIONS', company: 'Dispatch HQ' },
  { label: 'Admin Officer', sub: 'Master Settings & Requisitions', email: 'admin@bueno.ng', role: 'ADMIN', company: 'Admin HQ' },

  // Terminal Cargo Officers
  { label: 'Cargo Officer — Ewekoro', sub: 'Origin Loading Station (EWK)', email: 'ade.bello.ewk@bueno.ng', role: 'CARGO_OFFICER', station: 'EWK', stationName: 'Ewekoro Terminal' },
  { label: 'Cargo Officer — Moniya', sub: 'Destination Yard (MNY)', email: 'musa.ibrahim.mny@bueno.ng', role: 'CARGO_OFFICER', station: 'MNY', stationName: 'Moniya Yard (Ibadan)' },
  { label: 'Cargo Officer — Apapa Port', sub: 'Maritime Hub (APT)', email: 'ngozi.eze.apt@bueno.ng', role: 'CARGO_OFFICER', station: 'APT', stationName: 'Apapa Maritime Port' },

  // Industrial Consignees (Customers)
  { label: 'Lafarge Africa Plc', sub: 'Industrial Consignee Portal', email: 'logistics@lafarge.ng', role: 'CUSTOMER', companyName: 'Lafarge Africa Plc' },
  { label: 'Dangote Cement', sub: 'Industrial Consignee Portal', email: 'freight@dangotecement.ng', role: 'CUSTOMER', companyName: 'Dangote Cement' },
  { label: 'BUA Cement Industries', sub: 'Industrial Consignee Portal', email: 'logistics@buacement.ng', role: 'CUSTOMER', companyName: 'BUA Cement Industries' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams?.get('from');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoPersonas, setShowDemoPersonas] = useState(false);

  const executeLogin = async (targetEmail: string, targetPass: string, fallbackProfile?: any) => {
    setLoading(true);
    setError('');

    try {
      const res = await authApi.login(targetEmail, targetPass);
      const token = res.data.accessToken;
      const user = res.data.user;
      setAuthCookieAndStorage(token, user);
      router.push(from ?? '/dashboard');
    } catch {
      // Demo fallback session
      let user = fallbackProfile;

      if (!user) {
        const e = targetEmail.toLowerCase();
        if (e.includes('ceo') || e.includes('md')) {
          user = { fullName: 'Alhaji Bashir Umar', email: targetEmail, role: 'CEO', company: 'Bueno Logistics HQ' };
        } else if (e.includes('finance') || e.includes('accountant')) {
          user = { fullName: 'Chinenye Nnamdi', email: targetEmail, role: 'HEAD_OF_FINANCE', company: 'Bueno HQ' };
        } else if (e.includes('ops')) {
          user = { fullName: 'Babajide Sanwo', email: targetEmail, role: 'HEAD_OF_OPERATIONS' };
        } else if (e.includes('admin')) {
          user = { fullName: 'Folake Adeyemi', email: targetEmail, role: 'ADMIN' };
        } else if (e.includes('ewk') || e.includes('ade')) {
          user = { fullName: 'Ade Bello', email: targetEmail, role: 'CARGO_OFFICER', assignedStation: 'EWK', stationName: 'Ewekoro Terminal' };
        } else if (e.includes('mny') || e.includes('musa')) {
          user = { fullName: 'Musa Ibrahim', email: targetEmail, role: 'CARGO_OFFICER', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)' };
        } else if (e.includes('apt') || e.includes('ngozi')) {
          user = { fullName: 'Ngozi Eze', email: targetEmail, role: 'CARGO_OFFICER', assignedStation: 'APT', stationName: 'Apapa Maritime Port' };
        } else if (e.includes('lafarge')) {
          user = { fullName: 'Lafarge Logistics Team', email: targetEmail, role: 'CUSTOMER', companyName: 'Lafarge Africa Plc' };
        } else if (e.includes('dangote')) {
          user = { fullName: 'Dangote Freight Desk', email: targetEmail, role: 'CUSTOMER', companyName: 'Dangote Cement' };
        } else if (e.includes('bua')) {
          user = { fullName: 'BUA Logistics Coordinator', email: targetEmail, role: 'CUSTOMER', companyName: 'BUA Cement Industries' };
        } else {
          user = { fullName: 'Cargo Officer', email: targetEmail, role: 'CARGO_OFFICER', assignedStation: 'EWK', stationName: 'Ewekoro Terminal' };
        }
      }

      setAuthCookieAndStorage('token_demo_valid', user);
      router.push(from ?? '/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your company email address.'); return; }
    if (!password.trim()) { setError('Please enter your password.'); return; }
    executeLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">

        {/* Corporate Header */}
        <div className="bg-slate-950 p-8 text-center border-b border-slate-800">
          <Link href="/" className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-slate-950 font-black text-base" style={{ fontFamily: "'Outfit', sans-serif" }}>CT</span>
            </div>
            <span className="text-2xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Cargo<span className="text-amber-400">Trace</span>
            </span>
          </Link>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            NIGERIAN RAIL LOGISTICS ENTERPRISE OS
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Sign In to Your Workspace
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Enter your corporate credentials to access your dashboard.
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                Corporate Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. ade.bello.ewk@bueno.ng"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In to Enterprise Workspace ➔'
              )}
            </button>
          </form>

          {/* Quick Demo Access Drawer (Collapsible) */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <button
              onClick={() => setShowDemoPersonas(!showDemoPersonas)}
              className="w-full text-center text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{showDemoPersonas ? 'Hide Quick Demo Sign-In Personas' : 'Quick Demo Sign-In Personas'}</span>
              <span className="text-[10px]">{showDemoPersonas ? '▲' : '▼'}</span>
            </button>

            {showDemoPersonas && (
              <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-2xl">
                {DEMO_PERSONAS.map((p) => (
                  <button
                    key={p.email}
                    onClick={() => {
                      setEmail(p.email);
                      setPassword('demo1234');
                      executeLogin(p.email, 'demo1234', p);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-amber-50 border border-slate-100 hover:border-amber-300 transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">{p.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.email}</div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-600">Select ➔</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-center mt-6">
            <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to Landing Page
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">Loading login...</div>}>
      <LoginForm />
    </Suspense>
  );
}
