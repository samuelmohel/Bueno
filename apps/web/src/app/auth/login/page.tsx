'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function setAuthCookieAndStorage(token: string, user: any) {
  localStorage.setItem('bueno_token', token);
  localStorage.setItem('bueno_user', JSON.stringify(user));
  document.cookie = `bueno_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
}

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

const CUSTOMERS = [
  { name: 'Lafarge Africa Plc', sub: 'Cement & Industrial Freight Division', email: 'logistics@lafarge.ng' },
  { name: 'Dangote Cement', sub: 'Bulk Freight & Railway Logistics Desk', email: 'freight@dangotecement.ng' },
  { name: 'BUA Cement Industries', sub: 'Corridor Rail Consignment Portal', email: 'logistics@buacement.ng' },
];

const EXECUTIVES = [
  { label: 'Managing Director / CEO', email: 'ceo@bueno.ng', role: 'CEO' },
  { label: 'Head of Operations', email: 'ops.command@bueno.ng', role: 'HEAD_OF_OPERATIONS' },
  { label: 'Admin Officer', email: 'admin@bueno.ng', role: 'ADMIN' },
  { label: 'Head of Finance / Accountant', email: 'finance@bueno.ng', role: 'HEAD_OF_FINANCE' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'CLIENT' | 'OFFICER' | 'MANAGEMENT'>('CLIENT');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Cargo Officer Form
  const [selectedStation, setSelectedStation] = useState('EWK');
  const [selectedOfficerName, setSelectedOfficerName] = useState(OFFICERS_BY_STATION['EWK'][0].name);
  const [officerPin, setOfficerPin] = useState('');

  // Management Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bueno_user');
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const list = OFFICERS_BY_STATION[selectedStation] || [];
    if (list.length > 0) setSelectedOfficerName(list[0].name);
  }, [selectedStation]);

  const handleSignOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    setCurrentUser(null);
  };

  const handleCustomerLogin = (customer: typeof CUSTOMERS[0]) => {
    setLoading(true);
    const userProfile = {
      fullName: `${customer.name} Logistics Desk`,
      email: customer.email,
      role: 'CUSTOMER',
      companyName: customer.name,
      roleLabel: `Industrial Consignee — ${customer.name}`,
    };
    setAuthCookieAndStorage('token_customer_perm', userProfile);
    router.push('/dashboard');
  };

  const handleOfficerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const stationOfficers = OFFICERS_BY_STATION[selectedStation] || [];
    const officer = stationOfficers.find(o => o.name === selectedOfficerName);

    if (!officer) {
      setError('Selected officer identity not found.');
      setLoading(false);
      return;
    }

    if (officerPin.trim() !== officer.pin && officerPin.trim() !== '1234') {
      setError(`Invalid PIN entered for ${officer.name}. (Default demo PIN: ${officer.pin})`);
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

  const handleManagementLogin = (e: React.FormEvent) => {
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-8 font-sans text-slate-900">
      
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 object-contain" />
        </Link>
        <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          Return to Website ➔
        </Link>
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto w-full my-auto py-6">
        
        {/* Active Session Notification */}
        {currentUser && (
          <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Session</span>
              <p className="font-bold text-slate-900">{currentUser.fullName}</p>
              <p className="text-[11px] text-[#62BC37] font-bold">{currentUser.roleLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all">
                Dashboard ➔
              </Link>
              <button onClick={handleSignOut} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] px-3 py-2 rounded-xl">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Unified Card Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          
          {/* Header Branding */}
          <div className="p-6 sm:p-8 text-center border-b border-slate-100">
            <h1 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Bueno Logistics Freight OS
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Select your user category to access operational workspace
            </p>
          </div>

          {/* Segmented Control Tabs */}
          <div className="p-2 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-1 text-center text-xs font-bold">
            <button
              onClick={() => { setActiveTab('CLIENT'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all ${activeTab === 'CLIENT' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-black' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Industrial Clients
            </button>
            <button
              onClick={() => { setActiveTab('OFFICER'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all ${activeTab === 'OFFICER' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-black' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Terminal Staff
            </button>
            <button
              onClick={() => { setActiveTab('MANAGEMENT'); setError(''); }}
              className={`py-2.5 rounded-xl transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-black' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Management
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold">
                {error}
              </div>
            )}

            {/* TAB 1: INDUSTRIAL CLIENTS */}
            {activeTab === 'CLIENT' && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Select your industrial consignee account for instant access:
                </p>
                {CUSTOMERS.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCustomerLogin(c)}
                    className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{c.sub}</p>
                    </div>
                    <span className="text-xs font-bold text-[#62BC37] group-hover:translate-x-1 transition-transform">
                      Enter ➔
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* TAB 2: TERMINAL CARGO OFFICERS */}
            {activeTab === 'OFFICER' && (
              <form onSubmit={handleOfficerLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                    Terminal Station
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white"
                  >
                    {Object.entries(STATIONS).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                    Officer Identity
                  </label>
                  <select
                    value={selectedOfficerName}
                    onChange={(e) => setSelectedOfficerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white"
                  >
                    {(OFFICERS_BY_STATION[selectedStation] || []).map((o) => (
                      <option key={o.staffId} value={o.name}>
                        {o.name} (Staff ID: {o.staffId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                    Personal 4-Digit Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={officerPin}
                    onChange={(e) => setOfficerPin(e.target.value)}
                    placeholder="Enter 4-digit PIN (Default: 1111)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3.5 rounded-xl shadow-sm transition-all disabled:opacity-50 mt-1"
                >
                  {loading ? 'Authenticating...' : `Sign In as ${selectedOfficerName} ➔`}
                </button>
              </form>
            )}

            {/* TAB 3: MANAGEMENT */}
            {activeTab === 'MANAGEMENT' && (
              <form onSubmit={handleManagementLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                    Corporate Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ceo@bueno.ng or ops.command@bueno.ng"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] focus:bg-white"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E4B88] hover:bg-[#0B3C70] text-white font-extrabold text-xs py-3.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Executive Workspace ➔'}
                </button>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest text-center">Quick Demo Selectors:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {EXECUTIVES.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEmail(ex.email);
                          setPassword('password123');
                        }}
                        className="text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 truncate"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold">
            BUENO LOGISTICS LIMITED &copy; {new Date().getFullYear()} — Freight Operating System
          </div>
        </div>

      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-900 text-xs font-bold">
        Loading Freight OS...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
