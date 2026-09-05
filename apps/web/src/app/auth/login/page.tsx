'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';
import { StateEngine } from '@/lib/services/StateEngine';

function setAuthCookieAndStorage(token: string, user: any) {
  localStorage.setItem('bueno_token', token);
  localStorage.setItem('bueno_user', JSON.stringify(user));
  document.cookie = `bueno_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
}

function tryParse(key: string, fallback: any) {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/* Default Initial Users */
const DEFAULT_PROVISIONED_USERS = [
  // Cargo Officers
  { id: 'usr_1', fullName: 'Ade Bello', email: 'ade.bello@bueno.ng', phone: '08031112233', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_2', fullName: 'Samuel Okafor', email: 'samuel.okafor@bueno.ng', phone: '08032223344', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-02', pin: '2222', status: 'ACTIVE' },
  { id: 'usr_3', fullName: 'Tunde Bakare', email: 'tunde.bakare@bueno.ng', phone: '08033334455', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-03', pin: '3333', status: 'ACTIVE' },
  { id: 'usr_4', fullName: 'Musa Ibrahim', email: 'musa.ibrahim@bueno.ng', phone: '08034445566', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)', staffId: 'MNY-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_5', fullName: 'Kassim Ahmed', email: 'kassim.ahmed@bueno.ng', phone: '08035556677', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)', staffId: 'MNY-02', pin: '2222', status: 'ACTIVE' },
  { id: 'usr_6', fullName: 'Ngozi Eze', email: 'ngozi.eze@bueno.ng', phone: '08036667788', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'APT', stationName: 'Apapa Maritime Port', staffId: 'APT-01', pin: '1111', status: 'ACTIVE' },

  // Executives
  { id: 'usr_7', fullName: 'Alhaji Bashir Umar', email: 'ceo@bueno.ng', phone: '08030000001', role: 'CEO', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Bueno HQ Command', staffId: 'EXEC-01', pin: '9999', status: 'ACTIVE' },
  { id: 'usr_8', fullName: 'Babajide Sanwo', email: 'ops.command@bueno.ng', phone: '08030000002', role: 'HEAD_OF_OPERATIONS', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Dispatch HQ', staffId: 'EXEC-02', pin: '8888', status: 'ACTIVE' },
  { id: 'usr_9', fullName: 'Folake Adeyemi', email: 'admin@bueno.ng', phone: '08030000003', role: 'ADMIN', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Admin HQ', staffId: 'EXEC-03', pin: '7777', status: 'ACTIVE' },
  { id: 'usr_10', fullName: 'Chinenye Nnamdi', email: 'finance@bueno.ng', phone: '08030000004', role: 'HEAD_OF_FINANCE', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Finance HQ', staffId: 'EXEC-04', pin: '6666', status: 'ACTIVE' },

  // Industrial Customers
  { id: 'usr_11', fullName: 'Huaxin Logistics Desk', companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', email: 'logistics@hbm.ng', phone: '08037778899', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_12', fullName: 'Dangote Freight Team', companyName: 'Dangote Cement', email: 'freight@dangotecement.ng', phone: '08038889900', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_13', fullName: 'BUA Logistics Desk', companyName: 'BUA Cement Industries', email: 'logistics@buacement.ng', phone: '08039990011', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
];

const STATIONS: Record<string, string> = {
  EWK: 'Ewekoro Terminal',
  MNY: 'Moniya Yard (Ibadan)',
  APT: 'Apapa Maritime Port',
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const catParam = searchParams ? searchParams.get('category') : null;

  useEffect(() => {
    if (catParam === 'CUSTOMER') {
      setUserCategory('CUSTOMER');
      setStep(3);
    }
  }, [catParam]);

  const handleBack = () => {
    setError('');
    if (step === 3 && userCategory === 'CUSTOMER') {
      setStep(1);
    } else if (step > 1) {
      setStep((step - 1) as any);
    }
  };

  // Enterprise Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Wizard Step State: 1 (User Type), 2 (Staff Sub-role), 3 (Auth Form)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userCategory, setUserCategory] = useState<'STAFF' | 'CUSTOMER'>('STAFF');
  const [staffRole, setStaffRole] = useState<'CARGO_OFFICER' | 'EXECUTIVE'>('CARGO_OFFICER');

  // Dynamic Users
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Quick PIN Input State
  const [quickPin, setQuickPin] = useState('');

  // Cargo Officer Form State
  const [selectedStation, setSelectedStation] = useState('EWK');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [officerPin, setOfficerPin] = useState('');

  // Executive & Customer Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // 1.2s Splash Timer
    const splashTimer = setTimeout(() => setShowSplash(false), 1200);

    // Auto-cleanse any legacy Lafarge or Elephant cache on login screen
    StateEngine.cleanseLafargeAndMigrateHbm();

    const syncUsers = () => {
      const storedLocal = StateEngine.getUsers();
      setAllUsers(storedLocal);

      try {
        const raw = localStorage.getItem('bueno_user');
        if (raw) setCurrentUser(JSON.parse(raw));
      } catch {
        setCurrentUser(null);
      }
    };

    syncUsers();

    window.addEventListener('storage', syncUsers);
    window.addEventListener('bueno_state_updated', syncUsers);
    const interval = setInterval(syncUsers, 5000);

    return () => {
      clearTimeout(splashTimer);
      window.removeEventListener('storage', syncUsers);
      window.removeEventListener('bueno_state_updated', syncUsers);
      clearInterval(interval);
    };
  }, []);

  const stationOfficers = allUsers.filter(
    u => (u.userType === 'STAFF' || u.role === 'CARGO_OFFICER') &&
         (u.role === 'CARGO_OFFICER') &&
         (u.assignedStation === selectedStation || u.assignedStation === STATIONS[selectedStation] || (!u.assignedStation && selectedStation === 'EWK')) &&
         u.status !== 'DEACTIVATED'
  );

  useEffect(() => {
    if (stationOfficers.length > 0) {
      if (!selectedOfficerId || !stationOfficers.some(u => u.id === selectedOfficerId)) {
        setSelectedOfficerId(stationOfficers[0].id);
      }
    } else {
      setSelectedOfficerId('');
    }
  }, [selectedStation, allUsers, selectedOfficerId]);

  const customerAccounts = allUsers.filter(u => u.userType === 'CUSTOMER' && u.status === 'ACTIVE');

  const handleFullSignOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    setCurrentUser(null);
    setQuickPin('');
    setStep(1);
  };

  const handleSelectCategory = (cat: 'STAFF' | 'CUSTOMER') => {
    setUserCategory(cat);
    setError('');
    if (cat === 'STAFF') {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleSelectStaffRole = (r: 'CARGO_OFFICER' | 'EXECUTIVE') => {
    setStaffRole(r);
    setError('');
    setStep(3);
  };

  const handleQuickPinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError('');
    const expectedPin = currentUser.pin || '1111';

    if (quickPin.trim() === expectedPin || quickPin.trim() === '1234') {
      setLoading(true);
      setTimeout(() => router.push('/dashboard'), 300);
    } else {
      setError(`Invalid PIN entered. (Demo PIN: ${expectedPin})`);
    }
  };

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const officer = allUsers.find(u => u.id === selectedOfficerId);
    if (!officer) {
      setError('Selected officer account not found.');
      setLoading(false);
      return;
    }

    if (officer.pin !== officerPin.trim() && officerPin.trim() !== '1234') {
      setError(`Invalid PIN entered for ${officer.fullName}. (Demo PIN: ${officer.pin})`);
      setLoading(false);
      return;
    }

    const fallbackEmail = selectedStation === 'EWK' ? 'cargo.ewekoro@bueno.ng' : 'cargo.moniya@bueno.ng';
    const emailToUse = officer.email || fallbackEmail;

    let token = 'token_officer_perm';
    try {
      const res = await authApi.login(emailToUse, 'demo1234');
      if (res.data?.accessToken) {
        token = res.data.accessToken;
      }
    } catch {
      // Fallback for offline presentation
    }

    const userProfile = {
      fullName: officer.fullName,
      email: emailToUse,
      phone: officer.phone,
      role: 'CARGO_OFFICER',
      assignedStation: officer.assignedStation || selectedStation,
      stationName: STATIONS[officer.assignedStation || selectedStation] || officer.assignedStation,
      staffId: officer.staffId,
      pin: officer.pin,
      roleLabel: `Cargo Officer — ${STATIONS[officer.assignedStation || selectedStation] || officer.assignedStation}`,
    };

    setAuthCookieAndStorage(token, userProfile);
    router.push('/dashboard');
  };

  const handleExecutiveLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const iden = loginIdentifier.trim().toLowerCase();
    const user = allUsers.find(
      u => u.userType === 'STAFF' && u.role !== 'CARGO_OFFICER' && (u.email.toLowerCase() === iden || u.phone === iden)
    );

    if (!user) {
      setError('No executive account found matching that Email Address or Phone Number.');
      setLoading(false);
      return;
    }

    const emailToUse = user.email.includes('ops') ? 'ops@bueno.ng' : user.email.includes('admin') ? 'admin@bueno.ng' : 'admin@bueno.ng';
    let token = 'token_exec_perm';
    try {
      const res = await authApi.login(emailToUse, 'demo1234');
      if (res.data?.accessToken) {
        token = res.data.accessToken;
      }
    } catch {
      // Fallback for offline demo
    }

    const userProfile = {
      fullName: user.fullName,
      email: emailToUse,
      phone: user.phone,
      role: user.role === 'HEAD_OF_OPERATIONS' ? 'HEAD_OF_OPERATIONS' : 'ADMIN',
      pin: user.pin,
      company: 'Bueno Logistics HQ',
      roleLabel: user.role === 'CEO' ? 'Managing Director / CEO' : user.role === 'HEAD_OF_OPERATIONS' ? 'Head of Operations' : user.role === 'HEAD_OF_FINANCE' ? 'Head of Finance' : 'Admin Officer',
    };

    setAuthCookieAndStorage(token, userProfile);
    router.push('/dashboard');
  };

  const handleUniversalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const input = loginIdentifier.trim().toLowerCase();
    const pin = passwordOrPin.trim();

    const latestUsers = StateEngine.getUsers();
    const foundUser = latestUsers.find(u => {
      const matchEmail = u.email && u.email.toLowerCase() === input;
      const matchPhone = u.phone && u.phone.includes(input);
      const matchStaffId = u.staffId && u.staffId.toLowerCase() === input;
      const matchName = u.fullName && u.fullName.toLowerCase().includes(input);
      const matchCompany = u.companyName && u.companyName.toLowerCase().includes(input);
      return matchEmail || matchPhone || matchStaffId || matchName || matchCompany;
    });

    if (!foundUser) {
      setError(`No account found matching "${loginIdentifier}". Please check your Email Address, Staff/Client ID, or Phone number.`);
      setLoading(false);
      return;
    }

    const expectedPin = foundUser.pin || '1111';
    if (pin && pin !== expectedPin && pin !== '1234' && pin !== '1111') {
      setError(`Incorrect 4-digit PIN for ${foundUser.fullName || foundUser.companyName}. (Security PIN: ${expectedPin})`);
      setLoading(false);
      return;
    }

    let token = `token_${foundUser.id || Date.now()}`;
    try {
      const authPromise = authApi.login(foundUser.email || 'admin@bueno.ng', 'demo1234');
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 300));
      const res: any = await Promise.race([authPromise, timeoutPromise]);
      if (res && res.data?.accessToken) {
        token = res.data.accessToken;
      }
    } catch {
      // Offline fallback
    }

    const userProfile = {
      ...foundUser,
      roleLabel: foundUser.roleLabel || (foundUser.role === 'CARGO_OFFICER' ? `Cargo Officer — ${STATIONS[foundUser.assignedStation] || foundUser.assignedStation || 'Ewekoro'}` : foundUser.role === 'CEO' ? 'Managing Director / CEO' : foundUser.role === 'HEAD_OF_OPERATIONS' ? 'Head of Operations' : foundUser.role === 'HEAD_OF_FINANCE' ? 'Head of Finance' : foundUser.role === 'ADMIN' ? 'Admin Officer' : `Industrial Consignee — ${foundUser.companyName || foundUser.fullName}`),
    };

    setAuthCookieAndStorage(token, userProfile);
    router.push('/dashboard');
  };

  const handleCustomerLogin = async (cust: any) => {
    setLoading(true);
    const emailToUse = cust.companyName?.includes('Dangote') ? 'dangote@bueno.ng' : 'customer@bueno.ng';
    let token = 'token_customer_perm';
    try {
      const res = await authApi.login(emailToUse, 'demo1234');
      if (res.data?.accessToken) {
        token = res.data.accessToken;
      }
    } catch {
      // Fallback for offline demo
    }

    const userProfile = {
      fullName: cust.fullName || `${cust.companyName} Logistics Desk`,
      email: emailToUse,
      phone: cust.phone,
      role: 'CUSTOMER',
      companyName: cust.companyName || cust.fullName,
      pin: cust.pin || '1111',
      roleLabel: `Industrial Consignee — ${cust.companyName || cust.fullName}`,
    };
    setAuthCookieAndStorage(token, userProfile);
    router.push('/dashboard');
  };

  /* ─────────────────────────────────────────────────────────
     ENTERPRISE SPLASH SCREEN RENDER
  ───────────────────────────────────────────────────────── */
  if (showSplash) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-[#62BC37]/10 via-transparent to-transparent animate-pulse" />
        <div className="z-10 text-center space-y-6 max-w-sm">
          <div className="w-24 h-24 mx-auto bg-white rounded-3xl p-4 shadow-2xl border-4 border-[#62BC37] flex items-center justify-center animate-bounce">
            <img src="/bueno_logo.png" alt="Bueno Logistics" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Bueno Logistics
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-widest uppercase mt-1">Enterprise Freight OS</p>
          </div>
          <div className="space-y-2">
            <div className="w-48 h-1 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div className="w-full h-full bg-[#62BC37] animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Initializing Rail Corridor Telemetry & Database Engine...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans text-slate-900 selection:bg-[#62BC37] selection:text-white overflow-hidden">
      
      {/* ── LEFT SHOWCASE PANEL (Branding, Live Corridor Satellite Map & Status) ────── */}
      <div className="lg:w-1/2 bg-slate-900 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-800 text-white overflow-hidden">
        {/* Glow Circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#62BC37]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#0E4B88]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 inline-flex group">
            <div className="w-12 h-12 rounded-2xl bg-[#62BC37] p-0.5 shadow-xl group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-xl text-white font-mono">
                B
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
                BUENO <span className="text-[#62BC37]">LOGISTICS</span>
              </h1>
              <span className="text-[10px] font-mono text-slate-400 block -mt-1 uppercase tracking-widest font-semibold">FREIGHT CORRIDOR DESK</span>
            </div>
          </Link>
        </div>

        {/* Middle Showcase Content */}
        <div className="my-12 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-xs font-mono font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CORRIDOR TELEMETRY & AUTHENTICATION GUARD
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Command Control & Terminal Cargo Operations
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed max-w-lg font-normal">
            Secure role-based portal for Ewekoro Terminal, Moniya Yard Ibadan, and Apapa Port Cargo Officers, Head of Operations, CEO, Finance, and Industrial Consignees.
          </p>

          {/* Mini Live Status Pills */}
          <div className="grid grid-cols-3 gap-3 pt-4 font-mono text-xs text-slate-300">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-center">
              <span className="text-[9px] uppercase text-slate-500 block font-bold">Primary Route</span>
              <span className="font-black text-emerald-400">EWK ➔ MNY</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-center">
              <span className="text-[9px] uppercase text-slate-500 block font-bold">Active Wagons</span>
              <span className="font-black text-amber-400">46 PXG Code</span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-center">
              <span className="text-[9px] uppercase text-slate-500 block font-bold">Security Scope</span>
              <span className="font-black text-[#0E4B88]">Spatie Guard</span>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>© 2026 Bueno Logistics Ltd</span>
          <Link href="/" className="text-slate-300 hover:text-white font-bold transition-colors">
            ← Return to Website
          </Link>
        </div>
      </div>

      {/* ── RIGHT AUTHENTICATION CARD PANEL ───────────────────────────── */}
      <div className="lg:w-1/2 bg-[#F8FAFC] p-6 sm:p-10 lg:p-16 flex flex-col justify-center items-center relative overflow-y-auto">
        <div className="max-w-md w-full my-auto">
        
        {/* BANK APP STYLE QUICK PIN UNLOCK SCREEN FOR REMEMBERED ACCOUNT */}
        {currentUser ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
            <div className="space-y-2">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-900 text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-[#62BC37]">
                {currentUser.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#62BC37] block">WELCOME BACK</span>
              <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {currentUser.fullName}
              </h2>
              <p className="text-xs text-slate-500 font-medium">{currentUser.roleLabel}</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 rounded-2xl text-xs font-bold">
                {error}
              </div>
            )}

            <form onSubmit={handleQuickPinUnlock} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Enter 4-Digit Quick Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={quickPin}
                  onChange={e => setQuickPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3.5 text-center text-2xl font-mono tracking-widest rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#62BC37] bg-slate-50"
                  autoFocus
                  required
                />
              </div>

              {/* Touch Numeric Keypad Quick Buttons */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto pt-1">
                {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(btn => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (btn === 'C') setQuickPin('');
                      else if (btn === '⌫') setQuickPin(quickPin.slice(0, -1));
                      else if (quickPin.length < 4) setQuickPin(quickPin + btn);
                    }}
                    className="h-10 rounded-xl bg-slate-100 hover:bg-slate-200 font-extrabold text-slate-800 text-sm active:scale-95 transition-all"
                  >
                    {btn}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || quickPin.length < 4}
                className="w-full py-3.5 px-4 bg-[#62BC37] hover:bg-[#52A02D] disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all"
              >
                {loading ? 'Unlocking Dashboard...' : 'Unlock Dashboard ➔'}
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleFullSignOut}
                className="text-xs font-extrabold text-slate-500 hover:text-slate-900 transition-colors"
              >
                🔄 Switch Account / Full Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* PRIMARY 3-STEP LOGIN WIZARD */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
            
            <div className="p-6 sm:p-8 text-center border-b border-slate-100 relative">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="absolute left-6 top-8 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors"
                >
                  ← Back
                </button>
              )}
              <h1 className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Bueno Logistics Freight OS
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {step === 1 && 'Step 1: Select your user classification'}
                {step === 2 && 'Step 2: Select your operational role'}
                {step === 3 && (userCategory === 'STAFF' ? (staffRole === 'CARGO_OFFICER' ? 'Terminal Cargo Officer Sign In' : 'Management Sign In') : 'Industrial Client Sign In')}
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-bold">
                  {error}
                </div>
              )}

              {/* STEP 1: UNIVERSAL CREDENTIALS DIRECT LOGIN + SHORTCUTS */}
              {step === 1 && (
                <div className="space-y-5">
                  <form onSubmit={handleUniversalLogin} className="space-y-3.5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#62BC37] block">UNIVERSAL CREDENTIALS LOGIN</span>
                      <h4 className="text-xs font-black text-slate-900 mt-0.5">Sign In with Email, Staff ID, or Phone</h4>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 block">Email / Staff ID / Phone *</label>
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={e => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. ade.bello@bueno.ng, admin@bueno.ng, EWK-01"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-extrabold text-slate-700 block">4-Digit Security PIN *</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={passwordOrPin}
                        onChange={e => setPasswordOrPin(e.target.value)}
                        placeholder="••••"
                        className="w-full px-3.5 py-2.5 text-center font-mono text-lg tracking-widest rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#62BC37] bg-white"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all"
                    >
                      {loading ? 'Authenticating...' : 'Sign In to Account ➔'}
                    </button>
                  </form>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">or quick role wizard</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSelectCategory('STAFF')}
                      className="p-3.5 rounded-2xl border-2 border-slate-200 hover:border-[#62BC37] hover:bg-slate-50 text-left transition-all group"
                    >
                      <span className="text-[9px] font-mono font-extrabold uppercase text-[#62BC37] block">INTERNAL</span>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-[#62BC37]">Staff Wizard ➔</p>
                    </button>

                    <button
                      onClick={() => handleSelectCategory('CUSTOMER')}
                      className="p-3.5 rounded-2xl border-2 border-slate-200 hover:border-[#0E4B88] hover:bg-slate-50 text-left transition-all group"
                    >
                      <span className="text-[9px] font-mono font-extrabold uppercase text-[#0E4B88] block">CLIENT</span>
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-[#0E4B88]">Consignee Wizard ➔</p>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: STAFF ROLE SELECTION */}
              {step === 2 && (
                <div className="space-y-4">
                  <button
                    onClick={() => handleSelectStaffRole('CARGO_OFFICER')}
                    className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-[#62BC37] hover:bg-slate-50 text-left transition-all group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-extrabold uppercase text-[#62BC37] block">FIELD CORRIDOR SUPERVISION</span>
                      <p className="font-extrabold text-slate-900 group-hover:text-[#62BC37]">Terminal Cargo Officer</p>
                      <p className="text-xs text-slate-500">Ewekoro, Moniya Yard, Apapa Port Loading/Unloading</p>
                    </div>
                    <span className="text-slate-400 group-hover:text-[#62BC37] font-bold">➔</span>
                  </button>

                  <button
                    onClick={() => handleSelectStaffRole('EXECUTIVE')}
                    className="w-full p-5 rounded-2xl border-2 border-slate-200 hover:border-[#0E4B88] hover:bg-slate-50 text-left transition-all group flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-extrabold uppercase text-[#0E4B88] block">HQ COMMAND & CONTROL</span>
                      <p className="font-extrabold text-slate-900 group-hover:text-[#0E4B88]">Executive / Admin / Finance</p>
                      <p className="text-xs text-slate-500">CEO, Head of Operations, Admin, Finance</p>
                    </div>
                    <span className="text-slate-400 group-hover:text-[#0E4B88] font-bold">➔</span>
                  </button>
                </div>
              )}

              {/* STEP 3: AUTH FORMS */}
              {step === 3 && (
                userCategory === 'STAFF' ? (
                  staffRole === 'CARGO_OFFICER' ? (
                    /* CARGO OFFICER FORM */
                    <form onSubmit={handleOfficerLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Select Rail Terminal Station</label>
                        <select
                          value={selectedStation}
                          onChange={e => setSelectedStation(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#62BC37] bg-slate-50"
                        >
                          <option value="EWK">Ewekoro Terminal (HBM Cement)</option>
                          <option value="MNY">Moniya Yard (Ibadan Destination)</option>
                          <option value="APT">Apapa Maritime Port (Lagos)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Select Officer Name</label>
                        <select
                          value={selectedOfficerId}
                          onChange={e => setSelectedOfficerId(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#62BC37] bg-slate-50"
                        >
                          {stationOfficers.map(off => (
                            <option key={off.id} value={off.id}>{off.fullName} ({off.staffId})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Enter Security PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={officerPin}
                          onChange={e => setOfficerPin(e.target.value)}
                          placeholder="••••"
                          className="w-full px-4 py-3 text-center font-mono text-xl tracking-widest rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#62BC37] bg-slate-50"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all"
                      >
                        {loading ? 'Authenticating...' : 'Sign In to Cargo Terminal ➔'}
                      </button>
                    </form>
                  ) : (
                    /* EXECUTIVE FORM */
                    <form onSubmit={handleExecutiveLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Email Address or Phone Number</label>
                        <input
                          type="text"
                          value={loginIdentifier}
                          onChange={e => setLoginIdentifier(e.target.value)}
                          placeholder="e.g. admin@bueno.ng or 08030000003"
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] bg-slate-50"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Enter Security PIN</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={passwordOrPin}
                          onChange={e => setPasswordOrPin(e.target.value)}
                          placeholder="••••"
                          className="w-full px-4 py-3 text-center font-mono text-xl tracking-widest rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] bg-slate-50"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-[#0E4B88] hover:bg-[#0A3866] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all"
                      >
                        {loading ? 'Authenticating...' : 'Sign In to HQ Command ➔'}
                      </button>
                    </form>
                  )
                ) : (
                  /* CUSTOMER FORM */
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500 font-medium">Select your company account for instant portal access:</p>
                    {customerAccounts.map(cust => (
                      <button
                        key={cust.id}
                        onClick={() => handleCustomerLogin(cust)}
                        className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="font-extrabold text-xs text-slate-900">{cust.companyName}</p>
                          <p className="text-[10px] text-slate-500">{cust.fullName} • {cust.email}</p>
                        </div>
                        <span className="text-[#62BC37] font-bold text-xs">Access ➔</span>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        )}
        </div>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-mono text-xs">
        Loading Freight OS...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
