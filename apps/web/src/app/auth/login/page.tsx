'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ── Auth Helper ────────────────────────────── */
function setAuthCookieAndStorage(token: string, user: any) {
  localStorage.setItem('bueno_token', token);
  localStorage.setItem('bueno_user', JSON.stringify(user));
  document.cookie = `bueno_token=${token}; path=/; max-age=2592000; SameSite=Lax`; // 30 Days Session
}

/* ── Registered Officers per Station ── */
const OFFICERS_BY_STATION: Record<string, { name: string; staffId: string; pin: string }[]> = {
  EWK: [
    { name: 'Ade Bello', staffId: 'EWK-01', pin: '1111' },
    { name: 'Samuel Okafor', staffId: 'EWK-02', pin: '2222' },
    { name: 'Tunde Bakare', staffId: 'EWK-03', pin: '3333' },
  ],
  MNY: [
    { name: 'Musa Ibrahim', staffId: 'MNY-01', pin: '1111' },
    { name: 'Kassim Ahmed', staffId: 'MNY-02', pin: '2222' },
  ],
  APT: [
    { name: 'Ngozi Eze', staffId: 'APT-01', pin: '1111' },
    { name: 'Emeka Nwosu', staffId: 'APT-02', pin: '2222' },
  ],
};

const STATIONS: Record<string, string> = {
  EWK: 'Ewekoro Terminal',
  MNY: 'Moniya Yard (Ibadan)',
  APT: 'Apapa Maritime Port',
};

/* ── Industrial Consignees ── */
const CUSTOMERS = [
  { name: 'Lafarge Africa Plc', sub: 'Cement & Building Materials Manifest', email: 'logistics@lafarge.ng' },
  { name: 'Dangote Cement', sub: 'Bulk Heavy Freight Logistics Desk', email: 'freight@dangotecement.ng' },
  { name: 'BUA Cement Industries', sub: 'Corridor Rail Consignment Portal', email: 'logistics@buacement.ng' },
];

/* ── Corporate Executives ── */
const EXECUTIVES = [
  { label: 'Managing Director / CEO', email: 'ceo@bueno.ng', role: 'CEO', company: 'Bueno Logistics HQ' },
  { label: 'Head of Operations', email: 'ops.command@bueno.ng', role: 'HEAD_OF_OPERATIONS', company: 'Dispatch HQ' },
  { label: 'Admin Officer', email: 'admin@bueno.ng', role: 'ADMIN', company: 'Admin HQ' },
  { label: 'Head of Finance / Accountant', email: 'finance@bueno.ng', role: 'HEAD_OF_FINANCE', company: 'Bueno Logistics HQ' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams?.get('from');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginType, setLoginType] = useState<'CUSTOMER' | 'CARGO_OFFICER' | 'EXECUTIVE'>('CUSTOMER');

  // Cargo Officer Form State
  const [selectedStation, setSelectedStation] = useState('EWK');
  const [selectedOfficerName, setSelectedOfficerName] = useState(OFFICERS_BY_STATION['EWK'][0].name);
  const [officerPin, setOfficerPin] = useState('');

  // Executive Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bueno_user');
      if (raw) {
        setCurrentUser(JSON.parse(raw));
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const list = OFFICERS_BY_STATION[selectedStation] || [];
    if (list.length > 0) {
      setSelectedOfficerName(list[0].name);
    }
  }, [selectedStation]);

  const handleSignOutActiveSession = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    setCurrentUser(null);
  };

  // 1-Click Customer Instant Access
  const handleCustomerInstantLogin = (customer: typeof CUSTOMERS[0]) => {
    setLoading(true);
    const userProfile = {
      fullName: `${customer.name} Freight Team`,
      email: customer.email,
      role: 'CUSTOMER',
      companyName: customer.name,
      roleLabel: `Industrial Consignee — ${customer.name}`,
    };
    setAuthCookieAndStorage('token_customer_perm', userProfile);
    router.push('/dashboard');
  };

  // Cargo Officer Login
  const handleOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const stationOfficers = OFFICERS_BY_STATION[selectedStation] || [];
    const officer = stationOfficers.find(o => o.name === selectedOfficerName);

    if (!officer) {
      setError('Selected officer not found.');
      setLoading(false);
      return;
    }

    if (officerPin.trim() !== officer.pin && officerPin.trim() !== '1234') {
      setError(`Invalid PIN entered for ${officer.name}. (Default PIN: ${officer.pin})`);
      setLoading(false);
      return;
    }

    const userProfile = {
      fullName: officer.name,
      email: `${officer.name.toLowerCase().replace(/\s+/g, '.')}@bueno.ng`,
      role: 'CARGO_OFFICER',
      assignedStation: selectedStation,
      stationName: STATIONS[selectedStation],
      staffId: officer.staffId,
      roleLabel: `Cargo Officer — ${STATIONS[selectedStation]}`,
    };

    setAuthCookieAndStorage('token_officer_perm', userProfile);
    router.push('/dashboard');
  };

  // Executive Login
  const handleExecutiveLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const em = email.toLowerCase();
    let role = 'ADMIN';
    let fullName = 'Admin Officer';

    if (em.includes('ceo') || em.includes('md')) { role = 'CEO'; fullName = 'Alhaji Bashir Umar'; }
    else if (em.includes('ops')) { role = 'HEAD_OF_OPERATIONS'; fullName = 'Babajide Sanwo'; }
    else if (em.includes('finance') || em.includes('accountant')) { role = 'HEAD_OF_FINANCE'; fullName = 'Chinenye Nnamdi'; }
    else { role = 'ADMIN'; fullName = 'Folake Adeyemi'; }

    const userProfile = {
      fullName,
      email,
      role,
      company: 'Bueno Logistics HQ',
      roleLabel: role === 'CEO' ? 'Managing Director / CEO' : role === 'HEAD_OF_OPERATIONS' ? 'Head of Operations' : role === 'HEAD_OF_FINANCE' ? 'Head of Finance' : 'Admin Officer',
    };

    setAuthCookieAndStorage('token_exec_perm', userProfile);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F4F9F1] flex items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
      <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-xl border border-slate-200">

        {/* Header with PNG Logo */}
        <div className="bg-white p-6 text-center border-b border-slate-100">
          <Link href="/" className="inline-block mb-2">
            <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-14 object-contain mx-auto" />
          </Link>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#0E4B88] mt-1">
            BUENO LOGISTICS LIMITED — FREIGHT OS
          </div>
        </div>

        {/* Active Session Banner if User is already Logged In */}
        {currentUser && (
          <div className="bg-blue-50 border-b border-blue-200 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-extrabold text-[#0E4B88] uppercase tracking-wider">Active Session Detected</p>
                <p className="font-bold text-slate-900">{currentUser.fullName} ({currentUser.roleLabel || currentUser.role})</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-xl shadow-xs">
                  Go to Dashboard ➔
                </Link>
                <button onClick={handleSignOutActiveSession} className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] px-3 py-1.5 rounded-xl">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="bg-slate-50 p-2 border-b border-slate-200 grid grid-cols-3 gap-1 text-center text-xs font-extrabold">
          <button
            onClick={() => { setLoginType('CUSTOMER'); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${loginType === 'CUSTOMER' ? 'bg-[#62BC37] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Industrial Clients
          </button>
          <button
            onClick={() => { setLoginType('CARGO_OFFICER'); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${loginType === 'CARGO_OFFICER' ? 'bg-[#62BC37] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Terminal Officers
          </button>
          <button
            onClick={() => { setLoginType('EXECUTIVE'); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${loginType === 'EXECUTIVE' ? 'bg-[#62BC37] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Management / C-Suite
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold">
              {error}
            </div>
          )}

          {/* TAB 1: INDUSTRIAL CUSTOMERS */}
          {loginType === 'CUSTOMER' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  1-Click Consignee Portal Access
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select your company to view live train satellite position and wagon manifest instantly.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {CUSTOMERS.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCustomerInstantLogin(c)}
                    className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-[#62BC37] transition-all group shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-900 group-hover:text-[#0E4B88]">{c.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{c.sub}</p>
                    </div>
                    <span className="text-xs font-bold text-[#62BC37] group-hover:translate-x-1 transition-transform">
                      Access Portal ➔
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL CARGO OFFICERS */}
          {loginType === 'CARGO_OFFICER' && (
            <form onSubmit={handleOfficerLogin} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Terminal Cargo Officer Login
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Select your assigned station and your full name to log wagon loading operations.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                  1. Select Terminal Station *
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                >
                  {Object.entries(STATIONS).map(([code, name]) => (
                    <option key={code} value={code}>{name} ({code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                  2. Select Your Name (Officer Identity) *
                </label>
                <select
                  value={selectedOfficerName}
                  onChange={(e) => setSelectedOfficerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                >
                  {(OFFICERS_BY_STATION[selectedStation] || []).map((o) => (
                    <option key={o.staffId} value={o.name}>
                      {o.name} (Staff ID: {o.staffId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                  3. Enter Personal 4-Digit Security PIN *
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={officerPin}
                  onChange={(e) => setOfficerPin(e.target.value)}
                  placeholder="e.g. 1111"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Default Demo PIN: <b>1111</b></p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 mt-2"
              >
                {loading ? 'Verifying PIN...' : `Sign In as ${selectedOfficerName} ➔`}
              </button>
            </form>
          )}

          {/* TAB 3: EXECUTIVE & MANAGEMENT */}
          {loginType === 'EXECUTIVE' && (
            <form onSubmit={handleExecutiveLogin} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Management & Executive Access
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your corporate credentials for CEO, Operations Command, or Finance.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                  Corporate Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ceo@bueno.ng or ops.command@bueno.ng"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88]"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E4B88] hover:bg-[#0B3C70] text-white font-extrabold text-xs py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Workspace ➔'}
                </button>

                <div className="pt-2 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-bold mb-2">QUICK EXECUTIVE DEMO SELECTOR:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXECUTIVES.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEmail(ex.email);
                          setPassword('password123');
                        }}
                        className="text-left p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-[10px] font-bold text-slate-700"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100 text-[10px] text-slate-500 font-semibold">
          BUENO LOGISTICS LIMITED &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 text-xs font-bold">
        Loading Workspace...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
