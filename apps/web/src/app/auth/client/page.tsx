'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function setAuthCookieAndStorage(token: string, user: any) {
  localStorage.setItem('bueno_token', token);
  localStorage.setItem('bueno_user', JSON.stringify(user));
  document.cookie = `bueno_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
}

const CUSTOMERS = [
  {
    id: 'lafarge',
    name: 'Lafarge Africa Plc',
    tagline: 'Cement & Industrial Freight Division',
    email: 'logistics@lafarge.ng',
    activeShipments: '2 Active Rail Convoys (3,200 Bags Total)',
    badge: 'Premier Client',
    gradient: 'from-emerald-500/10 via-white to-emerald-500/5',
    accentColor: '#62BC37',
    iconBg: 'bg-[#62BC37] text-white',
    icon: '🏗️',
  },
  {
    id: 'dangote',
    name: 'Dangote Cement',
    tagline: 'Bulk Heavy Freight & Railway Logistics Desk',
    email: 'freight@dangotecement.ng',
    activeShipments: '1 Active Rail Convoy (Moniya Yard)',
    badge: 'Industrial Partner',
    gradient: 'from-blue-500/10 via-white to-blue-500/5',
    accentColor: '#0E4B88',
    iconBg: 'bg-[#0E4B88] text-white',
    icon: '🏭',
  },
  {
    id: 'bua',
    name: 'BUA Cement Industries',
    tagline: 'North-South Railway Corridor Logistics Division',
    email: 'logistics@buacement.ng',
    activeShipments: '1 Active Rail Convoy (Apapa Port Hub)',
    badge: 'Corridor Partner',
    gradient: 'from-purple-500/10 via-white to-purple-500/5',
    accentColor: '#8B5CF6',
    iconBg: 'bg-purple-600 text-white',
    icon: '🏢',
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
    <div className="min-h-screen bg-[#F4F9F1] text-slate-900 font-sans relative overflow-hidden flex flex-col justify-between p-4 sm:p-8">
      
      {/* Dynamic Glowing Background Orbs (Glovo Vibrancy) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#62BC37]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0E4B88]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between py-4 relative z-10">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 sm:h-14 object-contain drop-shadow-sm" />
        </Link>
        <Link href="/auth/staff" className="text-xs font-extrabold text-[#0E4B88] hover:text-[#0B3C70] bg-white/90 backdrop-blur border border-slate-200 hover:border-slate-400 px-5 py-2.5 rounded-2xl shadow-md transition-all">
          Staff & Operations Login ➔
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto w-full my-auto py-8 space-y-8 relative z-10">
        
        {/* Title Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#62BC37]/15 border-2 border-[#62BC37]/40 text-[#48A81B] text-xs font-black uppercase tracking-widest shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#62BC37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#62BC37]"></span>
            </span>
            INDUSTRIAL CLIENT FREIGHT PORTAL
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Live Rail Consignment <br />
            <span className="bg-gradient-to-r from-[#0E4B88] via-[#62BC37] to-[#48A81B] bg-clip-text text-transparent">
              Satellite Tracking
            </span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto font-semibold">
            Select your industrial company below for 1-click access to live train movement, wagon loading manifests, and real-time corridor telemetry.
          </p>
        </div>

        {/* Active Session Alert */}
        {currentUser && (
          <div className="bg-white/90 backdrop-blur border-2 border-[#62BC37] rounded-3xl p-6 shadow-xl shadow-[#62BC37]/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black text-[#48A81B] uppercase tracking-widest block">ACTIVE PERMANENT SESSION</span>
              <p className="text-lg font-black text-slate-900">{currentUser.fullName}</p>
              <p className="text-xs text-slate-500 font-semibold">{currentUser.roleLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-3.5 rounded-2xl shadow-lg transition-all transform hover:scale-105">
                Go to Dashboard ➔
              </Link>
              <button onClick={handleSignOut} className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-3.5 rounded-2xl border border-rose-200">
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Vibrant Glovo-Inspired Cards */}
        <div className="grid gap-5">
          {CUSTOMERS.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCustomerLogin(c)}
              className={`w-full text-left p-6 sm:p-8 rounded-3xl bg-gradient-to-r ${c.gradient} border-2 border-slate-200/80 hover:border-[#62BC37] shadow-lg hover:shadow-2xl hover:shadow-[#62BC37]/15 transition-all duration-300 transform hover:-translate-y-1.5 group relative overflow-hidden bg-white/80 backdrop-blur`}
            >
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${c.iconBg} flex items-center justify-center text-2xl font-black shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                    {c.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-2xl font-black text-slate-900 group-hover:text-[#48A81B] transition-colors" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {c.name}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-[#62BC37] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {c.badge}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-600">{c.tagline}</p>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#48A81B] pt-1">
                      <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-ping" />
                      {c.activeShipments}
                    </div>
                  </div>
                </div>

                <div className="bg-[#62BC37] group-hover:bg-[#52A02D] text-white font-black text-xs px-7 py-4 rounded-2xl shadow-lg transition-all flex items-center gap-2 shrink-0 group-hover:scale-105">
                  <span>Enter Portal</span>
                  <span className="group-hover:translate-x-1 transition-transform">➔</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="text-center pt-4">
          <Link href="/auth/staff" className="inline-flex items-center gap-2 text-xs font-black text-[#0E4B88] hover:text-[#0B3C70] bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <span>Terminal Cargo Officer or Executive? Switch to Staff Login</span>
            <span>➔</span>
          </Link>
        </div>

      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 font-extrabold py-4 border-t border-slate-200/80 relative z-10">
        BUENO LOGISTICS LIMITED &copy; {new Date().getFullYear()} — Heavy Rail Freight OS
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
