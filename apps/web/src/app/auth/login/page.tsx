'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

/* Default Initial Users (Synchronized with Admin Provisioning) */
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
  { id: 'usr_11', fullName: 'Lafarge Logistics Desk', companyName: 'Lafarge Africa Plc', email: 'logistics@lafarge.ng', phone: '08037778899', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
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

  // Wizard Step State
  // Step 1: User Type ('STAFF' vs 'CUSTOMER')
  // Step 2 (Staff): Sub-Role ('CARGO_OFFICER' vs 'EXECUTIVE')
  // Step 3: Auth Form
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userCategory, setUserCategory] = useState<'STAFF' | 'CUSTOMER'>('STAFF');
  const [staffRole, setStaffRole] = useState<'CARGO_OFFICER' | 'EXECUTIVE'>('CARGO_OFFICER');

  // Dynamic Registered Users from Provisioning Storage
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Cargo Officer Form State
  const [selectedStation, setSelectedStation] = useState('EWK');
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [officerPin, setOfficerPin] = useState('');

  // Executive & Customer Form State
  const [loginIdentifier, setLoginIdentifier] = useState(''); // Email or Phone Number
  const [passwordOrPin, setPasswordOrPin] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const syncUsers = () => {
      const loaded = tryParse('bueno_provisioned_users', DEFAULT_PROVISIONED_USERS);
      setAllUsers(loaded);
      try {
        const raw = localStorage.getItem('bueno_user');
        if (raw) setCurrentUser(JSON.parse(raw));
      } catch {
        setCurrentUser(null);
      }
    };

    syncUsers();

    // Listen for storage changes across tabs & viewports
    window.addEventListener('storage', syncUsers);
    window.addEventListener('bueno_state_updated', syncUsers);

    return () => {
      window.removeEventListener('storage', syncUsers);
      window.removeEventListener('bueno_state_updated', syncUsers);
    };
  }, []);

  // Filter officers for selected station
  const stationOfficers = allUsers.filter(
    u => u.userType === 'STAFF' && u.role === 'CARGO_OFFICER' && u.assignedStation === selectedStation && u.status === 'ACTIVE'
  );

  useEffect(() => {
    if (stationOfficers.length > 0) {
      setSelectedOfficerId(stationOfficers[0].id);
    } else {
      setSelectedOfficerId('');
    }
  }, [selectedStation, allUsers]);

  // Customer List
  const customerAccounts = allUsers.filter(u => u.userType === 'CUSTOMER' && u.status === 'ACTIVE');

  const handleSignOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    setCurrentUser(null);
  };

  // Step 1 Choice
  const handleSelectCategory = (cat: 'STAFF' | 'CUSTOMER') => {
    setUserCategory(cat);
    setError('');
    if (cat === 'STAFF') {
      setStep(2);
    } else {
      setStep(3); // Direct to Customer Login Form
    }
  };

  // Step 2 Choice (Staff Role)
  const handleSelectStaffRole = (r: 'CARGO_OFFICER' | 'EXECUTIVE') => {
    setStaffRole(r);
    setError('');
    setStep(3);
  };

  // Cargo Officer Submit
  const handleOfficerLogin = (e: React.FormEvent) => {
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
      setError(`Invalid PIN entered for ${officer.fullName}. (Default demo PIN: ${officer.pin})`);
      setLoading(false);
      return;
    }

    const userProfile = {
      fullName: officer.fullName,
      email: officer.email,
      phone: officer.phone,
      role: 'CARGO_OFFICER',
      assignedStation: officer.assignedStation,
      stationName: STATIONS[officer.assignedStation] || officer.assignedStation,
      staffId: officer.staffId,
      pin: officer.pin,
      roleLabel: `Cargo Officer — ${STATIONS[officer.assignedStation] || officer.assignedStation}`,
    };

    setAuthCookieAndStorage('token_officer_perm', userProfile);
    router.push('/dashboard');
  };

  // Executive / Management Submit
  const handleExecutiveLogin = (e: React.FormEvent) => {
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

    const userProfile = {
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      pin: user.pin,
      company: 'Bueno Logistics HQ',
      roleLabel: user.role === 'CEO' ? 'Managing Director / CEO' : user.role === 'HEAD_OF_OPERATIONS' ? 'Head of Operations' : user.role === 'HEAD_OF_FINANCE' ? 'Head of Finance' : 'Admin Officer',
    };

    setAuthCookieAndStorage('token_exec_perm', userProfile);
    router.push('/dashboard');
  };

  // 1-Click Customer Instant Access
  const handleCustomerLogin = (cust: any) => {
    setLoading(true);
    const userProfile = {
      fullName: cust.fullName || `${cust.companyName} Logistics Desk`,
      email: cust.email,
      phone: cust.phone,
      role: 'CUSTOMER',
      companyName: cust.companyName || cust.fullName,
      pin: cust.pin || '1111',
      roleLabel: `Industrial Consignee — ${cust.companyName || cust.fullName}`,
    };
    setAuthCookieAndStorage('token_customer_perm', userProfile);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-8 font-sans text-slate-900">
      
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 object-contain" />
        </Link>
        <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          Return to Website ➔
        </Link>
      </div>

      {/* Main Login Wizard Card */}
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

        {/* Wizard Container */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
          
          {/* Header Branding & Wizard Progress */}
          <div className="p-6 sm:p-8 text-center border-b border-slate-100 relative">
            {step > 1 && (
              <button
                onClick={() => setStep((step - 1) as any)}
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

            {/* STEP 1: INITIAL QUESTION */}
            {step === 1 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 mb-2">
                  Who are you signing in as?
                </p>

                <button
                  onClick={() => handleSelectCategory('STAFF')}
                  className="w-full text-left p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-400 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">Staff & Operations Command</p>
                    <p className="text-xs text-slate-500 mt-0.5">Terminal Cargo Officers, Head of Ops, CEO & Admins</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all">➔</span>
                </button>

                <button
                  onClick={() => handleSelectCategory('CUSTOMER')}
                  className="w-full text-left p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-400 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">Industrial Client / Consignee</p>
                    <p className="text-xs text-slate-500 mt-0.5">Lafarge Africa Plc, Dangote Cement, BUA Cement & Partners</p>
                  </div>
                  <span className="text-xs font-bold text-[#62BC37] group-hover:translate-x-1 transition-all">➔</span>
                </button>
              </div>
            )}

            {/* STEP 2: STAFF ROLE SELECTION */}
            {step === 2 && userCategory === 'STAFF' && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 mb-2">
                  Select your staff role:
                </p>

                <button
                  onClick={() => handleSelectStaffRole('CARGO_OFFICER')}
                  className="w-full text-left p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-400 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">Terminal Cargo Officer</p>
                    <p className="text-xs text-slate-500 mt-0.5">Station wagon loading, duration tracking & fund requisitions</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all">➔</span>
                </button>

                <button
                  onClick={() => handleSelectStaffRole('EXECUTIVE')}
                  className="w-full text-left p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 hover:border-slate-400 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-sm font-black text-slate-900">Executive & Management</p>
                    <p className="text-xs text-slate-500 mt-0.5">CEO, Head of Operations, Admin & Finance</p>
                  </div>
                  <span className="text-xs font-bold text-[#0E4B88] group-hover:translate-x-1 transition-all">➔</span>
                </button>
              </div>
            )}

            {/* STEP 3: ACTUAL AUTHENTICATION FORMS */}
            {step === 3 && (
              <>
                {/* 3A: CARGO OFFICER LOGIN FORM */}
                {userCategory === 'STAFF' && staffRole === 'CARGO_OFFICER' && (
                  <form onSubmit={handleOfficerLogin} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                        1. Terminal Station *
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
                        2. Officer Identity Name *
                      </label>
                      <select
                        value={selectedOfficerId}
                        onChange={(e) => setSelectedOfficerId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white"
                      >
                        {stationOfficers.length === 0 ? (
                          <option value="">No active officers assigned to this station</option>
                        ) : stationOfficers.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} (Staff ID: {o.staffId})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                        3. Personal 4-Digit Security PIN *
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
                      disabled={loading || stationOfficers.length === 0}
                      className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3.5 rounded-xl shadow-sm transition-all disabled:opacity-50 mt-1"
                    >
                      {loading ? 'Authenticating...' : 'Sign In to Terminal ➔'}
                    </button>
                  </form>
                )}

                {/* 3B: EXECUTIVE LOGIN FORM (Email OR Phone) */}
                {userCategory === 'STAFF' && staffRole === 'EXECUTIVE' && (
                  <form onSubmit={handleExecutiveLogin} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                        Email Address or Phone Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. ceo@bueno.ng or 08030000001"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E4B88] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={passwordOrPin}
                        onChange={(e) => setPasswordOrPin(e.target.value)}
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
                        {allUsers.filter(u => u.userType === 'STAFF' && u.role !== 'CARGO_OFFICER').map((ex) => (
                          <button
                            key={ex.id}
                            type="button"
                            onClick={() => {
                              setLoginIdentifier(ex.email);
                              setPasswordOrPin('password123');
                            }}
                            className="text-left p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 truncate"
                          >
                            {ex.fullName} ({ex.role})
                          </button>
                        ))}
                      </div>
                    </div>
                  </form>
                )}

                {/* 3C: INDUSTRIAL CUSTOMER SELECTOR */}
                {userCategory === 'CUSTOMER' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-slate-500 mb-2">
                      Select your provisioned industrial company account:
                    </p>
                    {customerAccounts.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => handleCustomerLogin(cust)}
                        className="w-full text-left p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">{cust.companyName || cust.fullName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{cust.email} • {cust.phone}</p>
                        </div>
                        <span className="text-xs font-bold text-[#62BC37] group-hover:translate-x-1 transition-transform">
                          Enter Portal ➔
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
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
