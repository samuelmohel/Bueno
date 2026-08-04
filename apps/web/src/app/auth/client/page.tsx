'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function setAuthCookieAndStorage(token: string, user: any) {
  localStorage.setItem('bueno_token', token);
  localStorage.setItem('bueno_user', JSON.stringify(user));
  document.cookie = `bueno_token=${token}; path=/; max-age=2592000; SameSite=Lax`; // 30 Days Permanent Session
}

const CUSTOMERS = [
  {
    id: 'lafarge',
    name: 'Lafarge Africa Plc',
    tagline: 'Cement & Industrial Freight Division',
    email: 'logistics@lafarge.ng',
    activeShipments: '2 Active Rail Convoys (1,600 Bags Each)',
    badge: 'Premier Client',
    bgColor: 'from-emerald-50 to-white',
    borderColor: 'border-emerald-200 hover:border-[#62BC37]',
  },
  {
    id: 'dangote',
    name: 'Dangote Cement',
    tagline: 'Bulk Freight & Railway Logistics Desk',
    email: 'freight@dangotecement.ng',
    activeShipments: '1 Active Rail Convoy (Moniya Hub)',
    badge: 'Industrial Partner',
    bgColor: 'from-blue-50 to-white',
    borderColor: 'border-blue-200 hover:border-[#0E4B88]',
  },
  {
    id: 'bua',
    name: 'BUA Cement Industries',
    tagline: 'North-South Corridor Logistics Division',
    email: 'logistics@buacement.ng',
    activeShipments: '1 Active Rail Convoy (Apapa Port)',
    badge: 'Corridor Partner',
    bgColor: 'from-purple-50 to-white',
    borderColor: 'border-purple-200 hover:border-purple-500',
  },
];

function ClientLoginForm() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bueno_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u.role === 'CUSTOMER') setCurrentUser(u);
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const handleCustomerLogin = (customer: typeof CUSTOMERS[0]) => {
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

  const handleSignOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    setCurrentUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F9F1] via-white to-[#F4F9F1] flex flex-col justify-between p-4 sm:p-8 font-sans text-slate-800">
      
      {/* Top Brand Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 sm:h-14 object-contain" />
        </Link>
        <Link href="/auth/staff" className="text-xs font-bold text-[#0E4B88] hover:text-[#0B3C70] bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs transition-all">
          Staff & Operations Login ➔
        </Link>
      </div>

      {/* Main Spacious Container */}
      <div className="max-w-3xl mx-auto w-full my-auto py-8 space-y-8">
        
        {/* Title Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#62BC37]/15 border border-[#62BC37]/30 text-[#48A81B] text-xs font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-pulse" />
            INDUSTRIAL CLIENT FREIGHT PORTAL
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Select Your Company to Access <br />
            <span className="bg-gradient-to-r from-[#0E4B88] to-[#62BC37] bg-clip-text text-transparent">
              Live Satellite GPS Tracking
            </span>
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto font-medium">
            Zero friction. Tap your company card below to view live train movement, live speed, and wagon manifest. Your phone browser stays signed in permanently.
          </p>
        </div>

        {/* Active Session Alert Banner */}
        {currentUser && (
          <div className="bg-gradient-to-r from-emerald-50 to-white border-2 border-[#62BC37] rounded-3xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold text-[#48A81B] uppercase tracking-widest block">ACTIVE PERMANENT SESSION</span>
              <p className="text-base font-black text-slate-900">{currentUser.fullName}</p>
              <p className="text-xs text-slate-500">{currentUser.roleLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-md transition-all">
                Go to Dashboard ➔
              </Link>
              <button onClick={handleSignOut} className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-3 rounded-2xl border border-rose-200">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Vibrant Glovo-Style Company Cards */}
        <div className="grid gap-4 sm:gap-5">
          {CUSTOMERS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCustomerLogin(c)}
              className={`w-full text-left p-6 sm:p-7 rounded-3xl bg-gradient-to-r ${c.bgColor} border-2 ${c.borderColor} shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group relative overflow-hidden`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-[#0E4B88]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {c.name}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#62BC37] text-white text-[10px] font-extrabold uppercase tracking-widest shadow-xs">
                      {c.badge}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600">{c.tagline}</p>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#48A81B] pt-1">
                    <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-ping" />
                    {c.activeShipments}
                  </div>
                </div>
                <div className="bg-[#62BC37] group-hover:bg-[#52A02D] text-white font-black text-xs px-6 py-3.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap">
                  <span>Enter Live Portal</span>
                  <span className="group-hover:translate-x-1 transition-transform">➔</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-slate-500 font-medium">
            Are you a Bueno Logistics Terminal Cargo Officer or Executive?
          </p>
          <Link href="/auth/staff" className="inline-block text-xs font-bold text-[#0E4B88] hover:underline">
            Go to Staff & Operations Login Portal ➔
          </Link>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 font-semibold py-4 border-t border-slate-200">
        BUENO LOGISTICS LIMITED &copy; {new Date().getFullYear()} — Industrial Rail Freight OS
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F9F1] flex items-center justify-center text-slate-900 text-xs font-bold">
        Loading Client Freight Portal...
      </div>
    }>
      <ClientLoginForm />
    </Suspense>
  );
}
