'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ── Animated Counter ────────────────────────────── */
function Counter({ to, suffix = '', prefix = '', duration = 2000 }: { to: number; suffix?: string; prefix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), 400);
    return () => clearTimeout(id);
  }, [to, duration]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

/* ── Live Telemetry Card ─────────────────────────── */
function TelemetryCard() {
  const [speed, setSpeed] = useState(74);
  useEffect(() => {
    const id = setInterval(() => setSpeed(70 + Math.floor(Math.random() * 10)), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 font-mono">LIVE SATELLITE GPS TELEMETRY</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">4s real pings</span>
      </div>

      {/* Tracking ID + Client */}
      <div className="mb-5">
        <div className="font-mono text-lg font-black text-amber-400 tracking-wide">BU-TRK-8839</div>
        <div className="text-xs font-bold text-slate-300 mt-0.5">Lafarge Africa Plc · Batch #LC-0451</div>
      </div>

      {/* Route visualization */}
      <div className="bg-slate-950 rounded-2xl p-4 mb-5 border border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase text-slate-400">ORIGIN</div>
            <div className="text-xs font-black text-emerald-400 mt-0.5">EWK</div>
            <div className="text-[10px] text-slate-400">Ewekoro</div>
          </div>

          {/* Track */}
          <div className="flex-1 mx-4 relative">
            <div className="h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full" style={{ width: '58%' }} />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 bg-amber-400 rounded-full w-4 h-4 flex items-center justify-center shadow-md shadow-amber-400/50" style={{ left: '55%' }}>
              <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
            </div>
            <div className="text-center mt-2">
              <div className="text-[10px] font-bold text-emerald-400 font-mono">{speed} km/h</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase text-slate-400">DESTINATION</div>
            <div className="text-xs font-black text-purple-400 mt-0.5">MNY</div>
            <div className="text-[10px] text-slate-400">Moniya Yard</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-emerald-400 uppercase">Status</div>
          <div className="text-xs font-black text-emerald-300 mt-0.5">IN TRANSIT</div>
        </div>
        <div className="bg-amber-950/80 border border-amber-800 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-amber-400 uppercase">Cargo</div>
          <div className="text-xs font-black text-amber-300 mt-0.5">1,600 bags</div>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase">ETA</div>
          <div className="text-xs font-black text-white mt-0.5">14:30 WAT</div>
        </div>
      </div>

      {/* GPS badge */}
      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
        GPS Satellite Lock · L2205 General Electric
      </div>
    </div>
  );
}

/* ── Main Landing Page ───────────────────────────── */
export default function BuenoLogisticsHomePage() {

  const steps = [
    { n: '01', title: 'Deal Registered', desc: 'Admin registers client contract, auto-generates Consignment ID and tracking reference.' },
    { n: '02', title: 'Wagon Allocation', desc: 'Matching locomotive and box/hopper wagons allocated to the cargo manifest.' },
    { n: '03', title: 'Loading at Origin', desc: 'Cargo Officer logs loading start time, wagon manifest, and commodity volume.' },
    { n: '04', title: 'Corridor Transit', desc: 'GPS satellite + railway checkpoint beacon streams live train position.' },
    { n: '05', title: 'Arrival at Yard', desc: 'Destination supervisor alerted. Offloading slot assigned immediately.' },
    { n: '06', title: 'Unloading Audit', desc: 'Actual bag count compared to manifest. Discrepancies flagged instantly.' },
    { n: '07', title: 'Manifest Cleared', desc: 'Automated discrepancy report filed. Consignment officially completed.' },
  ];

  const roles = [
    {
      tag: 'TERMINAL OPERATIONS',
      title: 'Cargo Officer',
      desc: 'Manage loading operations at your assigned terminal station. Record wagon allocation, log start and end loading times, and dispatch trains with full manifest documentation.',
      color: 'border-amber-400',
      bg: 'bg-amber-50',
      tagColor: 'text-amber-700',
    },
    {
      tag: 'NETWORK COMMAND',
      title: 'Head of Operations',
      desc: 'Full network visibility across all active corridors. Monitor every trip in real-time, view loading exceptions, generate daily intelligence reports, and export operational data.',
      color: 'border-slate-700',
      bg: 'bg-slate-50',
      tagColor: 'text-slate-700',
    },
    {
      tag: 'INDUSTRIAL CONSIGNEE',
      title: 'Your Company Portal',
      desc: 'Track your freight in real time from origin to destination. See live position, cargo status, loading duration, and get automated discrepancy alerts — all from one dashboard.',
      color: 'border-emerald-400',
      bg: 'bg-emerald-50',
      tagColor: 'text-emerald-700',
    },
  ];

  const partners = [
    'Lafarge Africa Plc', 'Dangote Cement', 'BUA Cement Industries', 'Nigerian Railway Corporation', 'Ibeto Industries',
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ─── STICKY NAVIGATION ─────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-10 sm:h-12 object-contain" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#how" className="hover:text-blue-900 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-blue-900 transition-colors">System Roles</a>
            <a href="#corridors" className="hover:text-blue-900 transition-colors">Rail Corridors</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="bg-[#62BC37] hover:bg-[#52A02D] text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all shadow-sm">
              Sign In to Freight OS ➔
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ──────────────────────────────────── */}
      <section className="relative pt-16 pb-24 px-6 lg:px-10 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-extrabold">
              <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-pulse" />
              BUENO LOGISTICS LIMITED — NIGERIAN RAIL FREIGHT OPERATING SYSTEM
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1]" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Heavy Rail Freight <br />
              <span className="text-[#62BC37]">
                Tracking & Logistics.
              </span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg max-w-xl font-normal leading-relaxed">
              Real-time wagon allocation, GPS satellite tracking, loading duration audits, and fund management for heavy rail corridors across Nigeria.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/auth/login" className="bg-[#62BC37] hover:bg-[#52A02D] text-white text-sm font-extrabold px-7 py-3.5 rounded-2xl shadow-md transition-all">
                Access Freight Workspace ➔
              </Link>
              <Link href="/tracking" className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-7 py-3.5 rounded-2xl transition-all shadow-sm">
                Public Consignment Tracking
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-100">
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Counter to={46} prefix="+" />
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Master Fleet Wagons</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Counter to={1600} suffix=" Bags" />
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Typical Train Capacity</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-black text-[#62BC37]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Counter to={100} suffix="%" />
                </div>
                <div className="text-xs font-semibold text-slate-500 mt-1">Live Satellite Lock</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <TelemetryCard />
          </div>
        </div>
      </section>

      {/* ─── CLIENTS ────────────────────────────────── */}
      <section className="py-12 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-center text-slate-400 mb-8">
            POWERING INDUSTRIAL LOGISTICS FOR NIGERIA'S LEADING MANUFACTURERS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
            {partners.map(p => (
              <span key={p} className="text-sm font-extrabold text-slate-300 hover:text-white transition-colors">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────── */}
      <section id="how" className="py-24 px-6 lg:px-10 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-extrabold text-[#0E4B88] uppercase tracking-widest">End-to-End Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              7 Steps from Deal Registration to Unloading
            </h2>
            <p className="text-slate-600 text-sm">
              Standardized procedure enforced across all terminal stations in Nigeria.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.slice(0, 4).map(s => (
              <div key={s.n} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                <span className="font-mono text-2xl font-black text-[#0E4B88]">{s.n}</span>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {steps.slice(4).map(s => (
              <div key={s.n} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
                <span className="font-mono text-2xl font-black text-[#62BC37]">{s.n}</span>
                <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SYSTEM ROLES ────────────────────────────── */}
      <section id="roles" className="py-24 px-6 lg:px-10 bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-extrabold text-[#0E4B88] uppercase tracking-widest">Role-Based Access</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Built for Every Operational Level
            </h2>
            <p className="text-slate-600 text-sm">
              Customized interfaces for Cargo Officers, Operations Heads, CEOs, Accountants, and Industrial Clients.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roles.map(r => (
              <div key={r.title} className={`rounded-3xl p-8 border-2 ${r.color} ${r.bg} space-y-5 shadow-sm`}>
                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${r.tagColor}`}>{r.tag}</span>
                <h3 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>{r.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{r.desc}</p>
                <Link href="/auth/login" className="inline-block text-xs font-bold text-slate-900 hover:text-blue-900 border-b border-slate-900 pb-0.5">
                  Access Role Portal ➔
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────── */}
      <footer className="bg-slate-950 text-white py-16 px-6 lg:px-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-10">
          <div className="space-y-4 max-w-sm">
            <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-12 object-contain bg-white/10 p-2 rounded-xl" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Bueno Logistics Limited — Nigeria's heavy rail logistics operating platform.
            </p>
          </div>
          <div className="flex gap-12 text-xs text-slate-400 font-semibold">
            <div>
              <p className="text-white font-bold mb-3">Portals</p>
              <ul className="space-y-2">
                <li><Link href="/auth/login" className="hover:text-white">Staff Sign In</Link></li>
                <li><Link href="/tracking" className="hover:text-white">Consignment Tracking</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-white font-bold mb-3">Company</p>
              <p className="text-slate-400">Bueno Logistics Limited</p>
              <p className="text-slate-500 mt-1">Lagos & Ibadan, Nigeria</p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-900 text-center text-[10px] text-slate-600 font-mono">
          &copy; {new Date().getFullYear()} BUENO LOGISTICS LIMITED. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
