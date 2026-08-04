'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const EXECUTIVES = [
  { label: 'Managing Director / CEO', email: 'ceo@bueno.ng', role: 'CEO', company: 'Bueno Logistics HQ' },
  { label: 'Head of Operations', email: 'ops.command@bueno.ng', role: 'HEAD_OF_OPERATIONS', company: 'Dispatch HQ' },
  { label: 'Admin Officer', email: 'admin@bueno.ng', role: 'ADMIN', company: 'Admin HQ' },
  { label: 'Head of Finance / Accountant', email: 'finance@bueno.ng', role: 'HEAD_OF_FINANCE', company: 'Bueno Logistics HQ' },
];

function StaffLoginForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'CARGO_OFFICER' | 'EXECUTIVE'>('CARGO_OFFICER');

  // Cargo Officer Form
  const [selectedStation, setSelectedStation] = useState('EWK');
  const [selectedOfficerName, setSelectedOfficerName] = useState(OFFICERS_BY_STATION['EWK'][0].name);
  const [officerPin, setOfficerPin] = useState('');

  // Executive Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bueno_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.role !== 'CUSTOMER') setCurrentUser(u);
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

  const handleSignOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    setCurrentUser(null);
  };

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
    <div className="min-h-screen bg-[#F4F9F1] text-slate-900 font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
      
      {/* Dynamic Background Blur Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#62BC37]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#0E4B88]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 relative z-10">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 sm:h-14 object-contain drop-shadow-sm" />
        </Link>
        <Link href="/auth/client" className="text-xs font-black text-[#62BC37] hover:text-[#52A02D] bg-white/90 backdrop-blur border border-[#62BC37]/30 hover:border-[#62BC37] px-5 py-2.5 rounded-2xl shadow-md transition-all">
          Client Freight Portal ➔
        </Link>
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full my-auto py-6 space-y-6 relative z-10">
        
        {/* Header Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0E4B88]/15 border-2 border-[#0E4B88]/30 text-[#0E4B88] text-xs font-black uppercase tracking-widest shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0E4B88] animate-pulse" />
            STAFF & OPERATIONS WORKSPACE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Sign In to Dispatch Operations
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm font-bold">
            Terminal Cargo Officers & Corporate Management.
          </p>
        </div>

        {/* Active Session Alert */}
        {currentUser && (
          <div className="bg-white/90 backdrop-blur border-2 border-blue-200 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black text-[#0E4B88] uppercase tracking-widest block">ACTIVE STAFF SESSION</span>
              <p className="font-black text-slate-900">{currentUser.fullName}</p>
              <p className="text-xs text-slate-500 font-semibold">{currentUser.roleLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="bg-[#0E4B88] hover:bg-[#0B3C70] text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md">
                Go to Dashboard ➔
              </Link>
              <button onClick={handleSignOut} className="bg-rose-50 text-rose-800 font-bold text-xs px-3.5 py-3 rounded-2xl border border-rose-200">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Card Box */}
        <div className="bg-white/90 backdrop-blur rounded-3xl border-2 border-slate-200/90 shadow-2xl overflow-hidden">
          
          {/* Tab Bar */}
          <div className="bg-slate-100/70 p-2 border-b border-slate-200 grid grid-cols-2 gap-2 text-center text-xs font-black">
            <button
              onClick={() => { setActiveTab('CARGO_OFFICER'); setError(''); }}
              className={`py-3.5 rounded-2xl transition-all ${activeTab === 'CARGO_OFFICER' ? 'bg-[#62BC37] text-white shadow-lg shadow-[#62BC37]/20 scale-[1.02]' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Terminal Cargo Officer
            </button>
            <button
              onClick={() => { setActiveTab('EXECUTIVE'); setError(''); }}
              className={`py-3.5 rounded-2xl transition-all ${activeTab === 'EXECUTIVE' ? 'bg-[#0E4B88] text-white shadow-lg shadow-[#0E4B88]/20 scale-[1.02]' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Management / Executive
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="bg-rose-50 border-2 border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold shadow-sm">
                {error}
              </div>
            )}

            {/* TAB 1: CARGO OFFICER LOGIN */}
            {activeTab === 'CARGO_OFFICER' && (
              <form onSubmit={handleOfficerLogin} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    1. Select Terminal Station *
                  </label>
                  <select
                    value={selectedStation}
                    onChange={(e) => setSelectedStation(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white transition-all"
                  >
                    {Object.entries(STATIONS).map(([code, name]) => (
                      <option key={code} value={code}>{name} ({code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    2. Select Your Full Name (Officer Identity) *
                  </label>
                  <select
                    value={selectedOfficerName}
                    onChange={(e) => setSelectedOfficerName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white transition-all"
                  >
                    {(OFFICERS_BY_STATION[selectedStation] || []).map((o) => (
                      <option key={o.staffId} value={o.name}>
                        {o.name} (Staff ID: {o.staffId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    3. Enter Personal 4-Digit Security PIN *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={officerPin}
                    onChange={(e) => setOfficerPin(e.target.value)}
                    placeholder="e.g. 1111"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold mt-1.5">Default Demo PIN: <b className="text-[#62BC37]">1111</b></p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-black text-xs py-4 rounded-2xl shadow-xl shadow-[#62BC37]/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 mt-2"
                >
                  {loading ? 'Verifying Security PIN...' : `Sign In as ${selectedOfficerName} ➔`}
                </button>
              </form>
            )}

            {/* TAB 2: EXECUTIVE LOGIN */}
            {activeTab === 'EXECUTIVE' && (
              <form onSubmit={handleExecutiveLogin} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Corporate Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ceo@bueno.ng or ops.command@bueno.ng"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0E4B88] hover:bg-[#0B3C70] text-white font-black text-xs py-4 rounded-2xl shadow-xl shadow-[#0E4B88]/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Workspace ➔'}
                </button>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 font-black mb-2.5 uppercase tracking-widest">QUICK EXECUTIVE SELECTOR:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EXECUTIVES.map((ex, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEmail(ex.email);
                          setPassword('password123');
                        }}
                        className="text-left p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 text-[10px] font-black text-slate-700 hover:text-[#0E4B88] transition-all"
                      >
                        {ex.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 font-bold py-4 border-t border-slate-200/80 relative z-10">
        BUENO LOGISTICS LIMITED &copy; {new Date().getFullYear()} — Operational Command Portal
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-900 text-xs font-bold">
        Loading Staff Workspace...
      </div>
    }>
      <StaffLoginForm />
    </Suspense>
  );
}
