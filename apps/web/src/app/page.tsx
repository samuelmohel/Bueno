'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ── Animated Counter Component ────────────────────── */
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

/* ── Interactive Live Satellite Telemetry Card ───────── */
function HeroTelemetryWidget() {
  const [speed, setSpeed] = useState(74);
  const [progress, setProgress] = useState(62);

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed(71 + Math.floor(Math.random() * 8));
      setProgress(p => p >= 95 ? 20 : p + 1);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white font-sans overflow-hidden group hover:border-[#62BC37]/50 transition-all duration-300">
      {/* Glow Effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#62BC37]/20 rounded-full blur-3xl group-hover:bg-[#62BC37]/30 transition-all" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#0E4B88]/20 rounded-full blur-3xl" />

      {/* Card Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono">LIVE SATELLITE GPS TELEMETRY</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">Pings: 4s Lock</span>
      </div>

      {/* Active Train Consignment Info */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xl font-black text-amber-400 tracking-wider">TRIP-001 • L2205 GE</span>
          <span className="text-xs font-mono font-bold text-slate-400 bg-amber-950/80 border border-amber-800/80 px-2.5 py-0.5 rounded-full text-amber-300">23 Wagons</span>
        </div>
        <p className="text-xs font-bold text-slate-300 mt-1">
          Consignee: <span className="text-white">Dangote Cement Plc</span> &nbsp;|&nbsp; <span className="text-slate-400">27,600 Bags (1,380 T)</span>
        </p>
      </div>

      {/* Rail Corridor Track Progress */}
      <div className="bg-slate-950/90 rounded-2xl p-4.5 mb-6 border border-slate-800 relative z-10">
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="text-left">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">ORIGIN HUB</span>
            <span className="font-black text-emerald-400 text-sm">EWK</span>
            <span className="text-[11px] text-slate-400 block font-medium">Ewekoro Terminal</span>
          </div>
          <div className="text-center font-mono">
            <span className="text-xs font-black text-emerald-400 block">{speed} km/h</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Escort Speed</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">DESTINATION YARD</span>
            <span className="font-black text-purple-400 text-sm">MNY</span>
            <span className="text-[11px] text-slate-400 block font-medium">Moniya Yard</span>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#0E4B88] via-[#62BC37] to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>Departed: 08:30 WAT</span>
          <span className="text-amber-300 font-bold">{progress}% Corridor Completed</span>
          <span>ETA: 14:15 WAT</span>
        </div>
      </div>

      {/* Operational Badges */}
      <div className="grid grid-cols-3 gap-2.5 relative z-10 text-center font-mono text-xs">
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[9px] uppercase text-slate-500 block font-bold">Escort Officer</span>
          <span className="font-black text-white text-[11px] truncate block">Ade Bello</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[9px] uppercase text-slate-500 block font-bold">Phone GPS Lock</span>
          <span className="font-black text-emerald-400 text-[11px] block">08031112233</span>
        </div>
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          <span className="text-[9px] uppercase text-slate-500 block font-bold">Transit Status</span>
          <span className="font-black text-amber-400 text-[11px] block">IN TRANSIT</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Modernized Landing Page Component ──────────── */
export default function BuenoLogisticsHomePage() {
  const [requestModal, setRequestModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    industry: 'Cement & Construction',
    contactName: '',
    email: '',
    phone: '',
    volume: '2,000 - 10,000 Bags/Month',
    route: 'EWK ➔ MNY (Ewekoro to Moniya)',
    notes: '',
  });

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existingReqs = JSON.parse(localStorage.getItem('bueno_client_requests') || '[]');
      const newReq = {
        id: `REQ-${Date.now()}`,
        ...form,
        status: 'PENDING',
        createdAt: new Date().toLocaleString(),
      };
      localStorage.setItem('bueno_client_requests', JSON.stringify([newReq, ...existingReqs]));

      const existingNotifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      const newNotif = {
        id: `notif_${Date.now()}`,
        title: 'New Client Service Requisition',
        body: `${form.companyName} (${form.contactName}) requested ${form.route} [${form.volume}]`,
        time: 'Just now',
        type: 'CLIENT_REQUEST',
        reqId: newReq.id,
        read: false,
      };
      localStorage.setItem('bueno_notifications', JSON.stringify([newNotif, ...existingNotifs]));
    } catch {}

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setRequestModal(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#62BC37] selection:text-white">
      
      {/* ── TOP BRAND HEADER & NAVIGATION BAR ──────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Network Status */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0E4B88] to-[#62BC37] p-0.5 shadow-lg group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-lg text-white font-mono">
                  B<span className="text-[#62BC37]">360</span>
                </div>
              </div>
              <div>
                <span className="text-lg font-black text-white tracking-wider block" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  BUENO <span className="text-[#62BC37]">LOGISTICS</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400 block -mt-1 uppercase tracking-widest font-semibold">FREIGHT OS 360</span>
              </div>
            </Link>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-[11px] font-mono font-bold text-emerald-400 ml-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              CORRIDOR NETWORK LIVE
            </span>
          </div>

          {/* Navigation Links & Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRequestModal(true)}
              className="hidden md:inline-flex items-center gap-2 bg-[#62BC37] hover:bg-[#52A02D] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#62BC37]/20 transition-all hover:scale-105"
            >
              + Client Requisition
            </button>

            <Link
              href="/auth/login"
              className="bg-[#0E4B88] hover:bg-[#0A3866] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-[#0E4B88]/20 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Command Portal Login</span>
              <span>➔</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────── */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0E4B88]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#62BC37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-amber-400">
                <span className="text-base">🚆</span> WEST AFRICA HEAVY RAIL FREIGHT NETWORK
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Next-Gen Rail Cargo <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#62BC37] via-emerald-400 to-[#0E4B88]">
                  Logistics & Escort GPS
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
                Bueno Logistics 360 powers industrial cement and bulk freight movement across Nigerian rail corridors. Seamlessly manage deals, track PXG wagons, supervise stopwatch loading/offloading, and stream phone GPS telemetry in real-time.
              </p>

              {/* CTA Group */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => setRequestModal(true)}
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-sm px-7 py-4 rounded-2xl shadow-xl shadow-[#62BC37]/25 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Request Freight Transit</span>
                  <span>➔</span>
                </button>
                <Link
                  href="/auth/login"
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-extrabold text-sm px-7 py-4 rounded-2xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <span>Staff & Officer PIN Login</span>
                  <span className="font-mono text-amber-400">🔑</span>
                </Link>
              </div>

              {/* Key Trust Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 font-mono text-xs text-slate-400">
                <div>
                  <span className="font-bold text-white block">Ewekoro ➔ Moniya</span>
                  <span>Primary Rail Corridor</span>
                </div>
                <div>
                  <span className="font-bold text-white block">46 PXG Wagons</span>
                  <span>Active Rail Fleet</span>
                </div>
                <div>
                  <span className="font-bold text-white block">100% Verified</span>
                  <span>Manifest Reconciliation</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Satellite Telemetry Widget */}
            <div className="lg:col-span-5">
              <HeroTelemetryWidget />
            </div>
          </div>
        </div>
      </section>

      {/* ── ANIMATED PERFORMANCE COUNTERS ──────────────────── */}
      <section className="py-12 bg-slate-900/60 border-y border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            
            <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Net Volume Delivered</span>
              <div className="text-3xl sm:text-4xl font-black text-[#62BC37] font-mono">
                <Counter to={27600} suffix=" Bags" />
              </div>
              <span className="text-xs text-slate-400 block font-medium">(1,380 Metric Tonnes)</span>
            </div>

            <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">PXG Fleet Inventory</span>
              <div className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                <Counter to={46} suffix=" Wagons" />
              </div>
              <span className="text-xs text-slate-400 block font-medium">Registered Fleet Assets</span>
            </div>

            <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Corridor Network Nodes</span>
              <div className="text-3xl sm:text-4xl font-black text-[#0E4B88] font-mono">
                <Counter to={3} suffix=" Hubs" />
              </div>
              <span className="text-xs text-slate-400 block font-medium">EWK, MNY, APT Stations</span>
            </div>

            <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Escort GPS Accuracy</span>
              <div className="text-3xl sm:text-4xl font-black text-purple-400 font-mono">
                <Counter to={100} suffix="%" />
              </div>
              <span className="text-xs text-slate-400 block font-medium">Verified Phone Telemetry</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── INDUSTRIAL CORRIDOR SHOWCASE ───────────────────── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#62BC37] bg-[#62BC37]/10 px-3 py-1 rounded-full border border-[#62BC37]/20">
              NETWORK TERMINAL HUBS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Heavy Freight Rail Corridors
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Strategically connected freight stations serving Dangote Cement, Lafarge Africa, BUA Cement, and maritime importers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Card 1: Ewekoro Terminal */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-[#0E4B88] transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0E4B88]/20 border border-[#0E4B88]/40 flex items-center justify-center text-xl font-bold font-mono text-[#0E4B88]">
                EWK
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">ORIGIN LOADING TERMINAL</span>
                <h3 className="text-xl font-black text-white mt-0.5">Ewekoro Terminal</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Primary industrial loading hub for cement tonnage. Features automated wagon loading timers, PXG fleet allocation, and cargo supervision.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-300 flex justify-between">
                <span>Active Officers: <b>2 Staff</b></span>
                <span className="text-[#62BC37] font-bold">Hub Operational ✓</span>
              </div>
            </div>

            {/* Card 2: Moniya Yard */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-[#62BC37] transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#62BC37]/20 border border-[#62BC37]/40 flex items-center justify-center text-xl font-bold font-mono text-[#62BC37]">
                MNY
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">DESTINATION RECEIVING YARD</span>
                <h3 className="text-xl font-black text-white mt-0.5">Moniya Yard (Ibadan)</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Destination offloading yard. Handles wagon unloading supervision, automatic fleet station transfers, and official offload manifest printing.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-300 flex justify-between">
                <span>Active Officers: <b>2 Staff</b></span>
                <span className="text-[#62BC37] font-bold">Hub Operational ✓</span>
              </div>
            </div>

            {/* Card 3: Apapa Maritime Port */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-purple-600 transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-900/30 border border-purple-700/50 flex items-center justify-center text-xl font-bold font-mono text-purple-400">
                APT
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">INTERMODAL MARITIME PORT</span>
                <h3 className="text-xl font-black text-white mt-0.5">Apapa Maritime Port</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Intermodal freight gateway connecting maritime container cargo and bulk imports directly onto national rail wagons for inland dispatch.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono text-slate-300 flex justify-between">
                <span>Active Officers: <b>1 Staff</b></span>
                <span className="text-[#62BC37] font-bold">Hub Operational ✓</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CLIENT REQUISITION MODAL ────────────────────────── */}
      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setRequestModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white font-bold text-sm bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center"
            >
              ✕
            </button>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-[#62BC37] tracking-widest block">FREIGHT TRANSIT REQUISITION</span>
              <h3 className="text-xl font-black text-white mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Request Freight Rail Tonnage
              </h3>
              <p className="text-xs text-slate-400 mt-1">Submit your company consignment request. Admin and Operations will process your deal immediately.</p>
            </div>

            {submitted ? (
              <div className="bg-emerald-950/90 border border-emerald-800 text-emerald-300 rounded-2xl p-6 text-center space-y-2 font-mono text-xs">
                <div className="text-2xl">✅</div>
                <div className="font-bold text-white text-sm">Requisition Submitted Successfully!</div>
                <p className="text-slate-300">Your freight transit request has been dispatched to Admin & Operations Command.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Company / Organization Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. BUA Cement Industries"
                    value={form.companyName}
                    onChange={e => setForm({ ...form, companyName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-[#62BC37]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Contact Officer Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Engr. Lawson"
                      value={form.contactName}
                      onChange={e => setForm({ ...form, contactName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-[#62BC37]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Phone Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="0803XXXXXXX"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-[#62BC37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Official Email Address *</label>
                  <input
                    required
                    type="email"
                    placeholder="logistics@company.ng"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-[#62BC37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Target Route Corridor *</label>
                  <select
                    value={form.route}
                    onChange={e => setForm({ ...form, route: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-[#62BC37]"
                  >
                    <option value="EWK ➔ MNY (Ewekoro to Moniya)">EWK ➔ MNY (Ewekoro Terminal to Moniya Yard)</option>
                    <option value="APT ➔ MNY (Apapa Port to Moniya)">APT ➔ MNY (Apapa Port to Moniya Yard)</option>
                    <option value="APT ➔ EWK (Apapa Port to Ewekoro)">APT ➔ EWK (Apapa Port to Ewekoro Terminal)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRequestModal(false)}
                    className="px-4 py-2.5 font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-black px-6 py-2.5 rounded-xl shadow-md"
                  >
                    Submit Requisition ➔
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 text-center text-xs font-mono text-slate-500">
        <p>© 2026 Bueno Logistics Limited. Freight OS 360 Platform. All rights reserved.</p>
      </footer>

    </div>
  );
}
