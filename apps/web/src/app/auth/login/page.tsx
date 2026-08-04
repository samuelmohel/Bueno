'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F9F1] via-white to-[#F4F9F1] flex flex-col justify-between p-4 sm:p-8 font-sans text-slate-800">
      
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 sm:h-14 object-contain" />
        </Link>
        <Link href="/" className="text-xs font-bold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-all">
          ← Back to Homepage
        </Link>
      </div>

      {/* Main Choice Gateway */}
      <div className="max-w-3xl mx-auto w-full my-auto py-8 space-y-8">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#62BC37]/15 border border-[#62BC37]/30 text-[#48A81B] text-xs font-black uppercase tracking-widest">
            BUENO LOGISTICS FREIGHT OS
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Select Workspace Portal
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-lg mx-auto font-medium">
            Choose your dedicated entry portal for Industrial Freight Tracking or Operational Command.
          </p>
        </div>

        {/* 2 Big Glowing Gateway Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Card 1: Industrial Client Portal */}
          <Link
            href="/auth/client"
            className="group text-left p-8 rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border-2 border-[#62BC37]/40 hover:border-[#62BC37] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center text-2xl font-black shadow-md group-hover:scale-110 transition-transform">
                🏢
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 group-hover:text-[#48A81B] transition-colors" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Industrial Client Portal
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  For Lafarge Africa Plc, Dangote Cement & BUA Cement.
                </p>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Instant 1-click access to live satellite train tracking, wagon manifests, and delivery status. Permanent browser session.
              </p>
            </div>
            <div className="mt-8 bg-[#62BC37] group-hover:bg-[#52A02D] text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl text-center shadow-md transition-all flex items-center justify-center gap-2">
              <span>Enter Client Portal</span>
              <span className="group-hover:translate-x-1 transition-transform">➔</span>
            </div>
          </Link>

          {/* Card 2: Staff & Terminal Operations */}
          <Link
            href="/auth/staff"
            className="group text-left p-8 rounded-3xl bg-gradient-to-br from-blue-50 via-white to-blue-50/30 border-2 border-[#0E4B88]/40 hover:border-[#0E4B88] shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0E4B88] text-white flex items-center justify-center text-2xl font-black shadow-md group-hover:scale-110 transition-transform">
                🚉
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 group-hover:text-[#0E4B88] transition-colors" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Staff & Operations Portal
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  For Terminal Cargo Officers & Executive Command.
                </p>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Log station wagon loading, track timing audits, manage corridor dispatch, approve funds, and command fleet operations.
              </p>
            </div>
            <div className="mt-8 bg-[#0E4B88] group-hover:bg-[#0B3C70] text-white font-extrabold text-xs py-3.5 px-6 rounded-2xl text-center shadow-md transition-all flex items-center justify-center gap-2">
              <span>Enter Staff Workspace</span>
              <span className="group-hover:translate-x-1 transition-transform">➔</span>
            </div>
          </Link>

        </div>

      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full text-center text-xs text-slate-400 font-semibold py-4 border-t border-slate-200">
        BUENO LOGISTICS LIMITED &copy; {new Date().getFullYear()} — Freight Operating System
      </div>
    </div>
  );
}
