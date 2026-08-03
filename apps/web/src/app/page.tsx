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
      const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic
      setVal(Math.floor(eased * to));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = setTimeout(() => requestAnimationFrame(tick), 400);
    return () => clearTimeout(id);
  }, [to, duration]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

/* ── Status colour helper ────────────────────────── */
function statusClasses(s: string) {
  if (s === 'IN_TRANSIT') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'LOADING') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'ARRIVED') return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

/* ── Live Telemetry Card ─────────────────────────── */
function TelemetryCard() {
  const [speed, setSpeed] = useState(74);
  useEffect(() => {
    const id = setInterval(() => setSpeed(70 + Math.floor(Math.random() * 10)), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl shadow-slate-200/60">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700">LIVE TELEMETRY</span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">4s refresh</span>
      </div>

      {/* Tracking ID + Client */}
      <div className="mb-5">
        <div className="font-mono text-lg font-black text-slate-900 tracking-wide">BU-TRK-8839</div>
        <div className="text-xs font-bold text-slate-500 mt-0.5">Lafarge Africa Plc · Batch #LC-0451</div>
      </div>

      {/* Route visualization */}
      <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase text-slate-400">ORIGIN</div>
            <div className="text-xs font-black text-slate-900 mt-0.5">EWK</div>
            <div className="text-[10px] text-slate-500">Ewekoro</div>
          </div>

          {/* Track */}
          <div className="flex-1 mx-4 relative">
            <div className="h-1 bg-slate-200 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" style={{ width: '58%' }} />
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 bg-amber-500 rounded-full w-4 h-4 flex items-center justify-center shadow-md shadow-amber-300" style={{ left: '55%' }}>
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
            <div className="text-center mt-2">
              <div className="text-[10px] font-bold text-amber-600 font-mono">{speed} km/h</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-extrabold uppercase text-slate-400">DESTINATION</div>
            <div className="text-xs font-black text-slate-900 mt-0.5">MNY</div>
            <div className="text-[10px] text-slate-500">Moniya Yard</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">Status</div>
          <div className="text-xs font-black text-emerald-700 mt-0.5">IN TRANSIT</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-amber-600 uppercase">Cargo</div>
          <div className="text-xs font-black text-amber-700 mt-0.5">1,600 bags</div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">ETA</div>
          <div className="text-xs font-black text-slate-800 mt-0.5">14:30 WAT</div>
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
export default function CargoTraceHomePage() {

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
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm" style={{ fontFamily: "'Outfit', sans-serif" }}>CT</span>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Cargo<span className="text-amber-500">Trace</span>
              </span>
              <span className="ml-2 text-[9px] font-extrabold uppercase tracking-widest text-slate-400 hidden sm:inline">
                NIGERIAN RAIL FREIGHT OS
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-500">
            <a href="#how" className="hover:text-slate-900 transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">System Roles</a>
            <a href="#corridors" className="hover:text-slate-900 transition-colors">Rail Corridors</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="hidden sm:block text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all">
              Staff Sign In
            </Link>
            <Link href="/auth/login" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm">
              Access Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ──────────────────────────────────── */}
      <section className="relative pt-16 pb-24 px-6 lg:px-10 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        {/* Background grid decoration */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-16 items-center relative">
          {/* Left column */}
          <div className="lg:col-span-7 animate-fade-up">
            {/* Live badge */}
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold px-4 py-2 rounded-full uppercase tracking-wider mb-7">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse-dot" />
              Live Operational System · Nigeria
            </div>

            <h1
              className="text-4xl sm:text-5xl xl:text-6xl font-black leading-[1.08] text-slate-900 tracking-tight mb-6"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Nigeria's industrial rail freight,{' '}
              <span className="text-amber-500">tracked end-to-end.</span>
            </h1>

            <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl font-medium">
              CargoTrace connects terminal officers, operations command, and industrial consignees with real-time wagon allocation, loading timestamps, GPS telemetry, and automated manifest auditing — across every corridor.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link
                href="/auth/login"
                className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-slate-900/20"
              >
                Access Staff Portal
              </Link>
              <Link
                href="/tracking"
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/30"
              >
                Track a Shipment
              </Link>
            </div>

            {/* Trust strip */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-3">
                Serving Nigeria's freight leaders
              </div>
              <div className="flex flex-wrap gap-2">
                {partners.map((p) => (
                  <span key={p} className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — live telemetry card */}
          <div className="lg:col-span-5 animate-fade-up delay-300">
            <TelemetryCard />
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ───────────────────────────── */}
      <section className="bg-slate-900 py-14 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { val: 580000, suffix: '+', label: 'Tonnes Moved Annually', prefix: '' },
            { val: 5, suffix: '', label: 'Terminal Stations Active', prefix: '' },
            { val: 99, suffix: '.8%', label: 'Manifest Accuracy Rate', prefix: '' },
            { val: 18, suffix: '+', label: 'Industrial Clients Served', prefix: '' },
          ].map(({ val, suffix, label, prefix }, i) => (
            <div key={i} className="text-center animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div
                className="text-4xl lg:text-5xl font-black text-white mb-2"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                <Counter to={val} suffix={suffix} prefix={prefix} />
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────── */}
      <section id="how" className="py-20 px-6 lg:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 mb-3">THE LIFECYCLE</div>
            <h2
              className="text-3xl sm:text-4xl font-black text-slate-900"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              From deal to delivered — every step tracked.
            </h2>
            <p className="text-slate-500 mt-3 max-w-xl mx-auto text-sm leading-relaxed">
              A 7-stage pipeline connects your commercial deal to final consignment clearance, with every officer accountable at every stage.
            </p>
          </div>

          {/* Steps grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:bg-amber-50/30 transition-all group animate-fade-up"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-black text-sm mb-4 group-hover:scale-110 transition-transform" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {step.n}
                </div>
                <h3 className="text-sm font-black text-slate-900 mb-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}

            {/* Final cleared card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '0.56s' }}>
              <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center font-black text-sm mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                ✓
              </div>
              <h3 className="text-sm font-black text-white mb-1.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Fully Automated
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every stage generates timestamps, audit logs, and discrepancy alerts automatically — no manual records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── RAIL CORRIDORS ────────────────────────── */}
      <section id="corridors" className="py-20 px-6 lg:px-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 mb-3">ACTIVE CORRIDORS</div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Five terminal stations. One network.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { code: 'EWK', name: 'Ewekoro Terminal', region: 'South-West', role: 'Origin' },
              { code: 'ITO', name: 'Itori Junction', region: 'South-West', role: 'Junction' },
              { code: 'MNY', name: 'Moniya Yard', region: 'Central Hub', role: 'Central Hub' },
              { code: 'ILR', name: 'Ilorin Freight Hub', region: 'Middle Belt', role: 'Distribution' },
              { code: 'APT', name: 'Apapa Port Terminal', region: 'Coastal', role: 'Port Terminal' },
            ].map((s) => (
              <div key={s.code} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 transition-all">
                <div className="font-mono font-black text-2xl text-amber-500 mb-2">{s.code}</div>
                <div className="text-sm font-bold text-slate-900 mb-1">{s.name}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">{s.region}</div>
                <div className="mt-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg inline-block">
                  {s.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SYSTEM ROLES ──────────────────────────── */}
      <section id="roles" className="py-20 px-6 lg:px-10 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 mb-3">BUILT FOR EVERY ROLE</div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              One platform. Three command points.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((r, i) => (
              <div
                key={i}
                className={`${r.bg} border-l-4 ${r.color} rounded-2xl p-7 hover:shadow-lg transition-all animate-fade-up`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className={`text-[10px] font-extrabold uppercase tracking-widest mb-3 ${r.tagColor}`}>
                  {r.tag}
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {r.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
                <Link
                  href="/auth/login"
                  className="inline-block mt-6 text-xs font-extrabold text-slate-800 hover:text-amber-600 transition-colors"
                >
                  Sign In to this role →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ────────────────────────────── */}
      <section className="py-20 px-6 lg:px-10 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl sm:text-4xl font-black text-white mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Ready to track your freight?
          </h2>
          <p className="text-slate-400 text-base mb-8 leading-relaxed">
            Contact your Bueno Logistics account manager to get your organisation registered on CargoTrace, or access the system with your assigned credentials.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-amber-500/30"
            >
              Sign In to CargoTrace
            </Link>
            <Link
              href="/tracking"
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-8 py-3.5 rounded-2xl transition-all border border-white/10"
            >
              Track a Shipment
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-900 py-10 px-6 lg:px-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>CT</span>
            </div>
            <span className="text-sm font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Cargo<span className="text-amber-500">Trace</span>
            </span>
            <span className="text-slate-600 text-xs">· Nigerian Rail Freight OS</span>
          </div>
          <div className="flex gap-6 text-xs font-semibold text-slate-500">
            <Link href="/auth/login" className="hover:text-white transition-colors">Staff Portal</Link>
            <Link href="/tracking" className="hover:text-white transition-colors">Track Shipment</Link>
          </div>
          <div className="text-xs text-slate-600">
            © 2026 Bueno Logistics Ltd. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
