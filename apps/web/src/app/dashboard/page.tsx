'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────────────────
   MASTER DATA
───────────────────────────────────────────────────────── */
const STATIONS: Record<string, string> = {
  EWK: 'Ewekoro Terminal',
  ITO: 'Itori Junction',
  MNY: 'Moniya Yard (Ibadan)',
  ILR: 'Ilorin Freight Hub',
  APT: 'Apapa Maritime Port',
};
const sName = (c: string) => STATIONS[c] || c;
const MASTER_WAGONS = Array.from({ length: 46 }, (_, i) => `WG${String(i + 1).padStart(3, '0')}`);

const SEED_DEALS: any[] = [];   // Admin creates deals — starts empty

const SEED_TRIPS: any[] = [];

const SEED_REQUESTS: any[] = [
  {
    id: 'REQ-2026-0001',
    officerName: 'Ade Bello', station: 'EWK',
    title: 'Hydraulic Jacks & Crane Slings', category: 'Equipment',
    amount: 85000, description: 'Bay crane replacement parts.',
    stage: 'Admin', date: '31 Jul 2026',
    conversation: [
      { sender: 'Ade Bello', role: 'Cargo Officer', msg: 'Need 3 hydraulic jacks urgently.', time: '09:00 AM' },
    ],
    paymentDetails: null,
  },
];

/* ─────────────────────────────────────────────────────────
   SHARED UTILS
───────────────────────────────────────────────────────── */
const ic = 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400';
const lc = 'block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1';

function tryParse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color || 'amber';
  const cls: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:  'bg-sky-50 text-sky-700 border-sky-200',
    red:   'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cls[c] || cls.amber}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />{text}
    </span>
  );
}

function stageColor(stage: string) {
  if (stage === 'Completed' || stage === 'Paid') return 'green';
  if (stage === 'Admin') return 'amber';
  if (stage === 'Head of Operations') return 'blue';
  if (stage === 'CEO') return 'slate';
  if (stage === 'Accountant') return 'red';
  return 'amber';
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LIVE TIMER
───────────────────────────────────────────────────────── */
function LiveTimer({ ts }: { ts: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const tick = () => setSec(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [ts]);
  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return <span className="font-mono font-black text-amber-600 text-lg">{hh}:{mm}:{ss}</span>;
}

/* ═══════════════════════════════════════════════════════════
   PORTAL SHELLS  (logo + nav + sign-out)
═══════════════════════════════════════════════════════════ */
function Shell({
  user, navItems, activeKey, onNav, children, onSignOut, menuOpen, setMenuOpen,
}: {
  user: any; navItems: { key: string; label: string }[];
  activeKey: string; onNav: (k: string) => void;
  children: React.ReactNode; onSignOut: () => void;
  menuOpen: boolean; setMenuOpen: (v: boolean) => void;
}) {
  const Nav = () => (
    <div className="h-full bg-slate-900 flex flex-col" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="p-6 border-b border-slate-800 bg-slate-950">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl p-1 flex-shrink-0 flex items-center justify-center shadow">
            <img src="/bueno_logo.png" alt="Bueno" className="w-full h-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-black text-white" style={{ fontFamily: "'Outfit',sans-serif" }}>
              BUENO <span className="text-amber-400">LOGISTICS</span>
            </p>
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">LIMITED</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map(item => (
          <button key={item.key} onClick={() => { onNav(item.key); setMenuOpen(false); }}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeKey === item.key ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-2">
        <div className="px-2">
          <p className="text-[10px] font-extrabold uppercase text-slate-500 mb-0.5">Signed in as</p>
          <p className="text-xs font-black text-white">{user?.fullName}</p>
          <p className="text-[11px] text-amber-400 font-semibold mt-0.5">{user?.roleLabel}</p>
        </div>
        <Link href="/" className="block px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white">← Home</Link>
        <button onClick={onSignOut} className="w-full text-left px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-rose-900/40 hover:text-rose-300">Sign Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex" style={{ fontFamily: "'Inter',sans-serif" }}>
      <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col sticky top-0 h-screen"><Nav /></aside>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/60" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 w-64 flex-shrink-0"><Nav /></div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 flex-shrink-0">
          <button onClick={() => setMenuOpen(true)} className="lg:hidden text-slate-700 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 p-0.5 flex items-center justify-center">
              <img src="/bueno_logo.png" alt="" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
                BUENO <span className="text-amber-500">LOGISTICS LIMITED</span>
              </p>
              <p className="text-[10px] text-slate-500 font-semibold">
                Welcome, <span className="font-bold text-slate-900">{user?.fullName}</span>
                {user?.assignedStation ? ` — ${sName(user.assignedStation)}` : ''}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 1 — CARGO OFFICER
═══════════════════════════════════════════════════════════ */
function CargoOfficerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'deals' | 'trips' | 'in_transit' | 'funds'>('deals');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const [deals, setDeals]         = useState<any[]>([]);
  const [trips, setTrips]         = useState<any[]>([]);
  const [requests, setRequests]   = useState<any[]>([]);

  // Modals
  const [createDeal, setCreateDeal]   = useState<any>(null);   // deal chosen to create trip
  const [fundsModal, setFundsModal]   = useState(false);

  const [tripForm, setTripForm] = useState({ locomotiveId: '', selectedWagon: MASTER_WAGONS[0], loadingDate: '', qty: '70', startTime: '' });
  const [fundForm, setFundForm] = useState({ title: '', amount: '', category: 'Equipment', description: '' });

  const station = user?.assignedStation || 'EWK';

  useEffect(() => {
    setDeals(tryParse('bueno_deals', SEED_DEALS));
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
    const now = new Date();
    setTripForm(f => ({ ...f,
      loadingDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, []);

  const persist = (key: string, val: any[]) => { localStorage.setItem(key, JSON.stringify(val)); };

  const saveDeals    = (v: any[]) => { setDeals(v);    persist('bueno_deals', v);    };
  const saveTrips    = (v: any[]) => { setTrips(v);    persist('bueno_trips', v);    };
  const saveRequests = (v: any[]) => { setRequests(v); persist('bueno_requests', v); };

  // Only show deals assigned to this officer's station
  const myDeals    = deals.filter(d => d.loadingStation === station);
  const myTrips    = trips.filter(t => t.origin === station && t.status === 'LOADING');
  const myInTransit = trips.filter(t => t.origin === station && (t.status === 'IN_TRANSIT' || t.status === 'ARRIVED'));

  /* ── Create Trip ── */
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDeal) return;
    const num = String(Date.now()).slice(-4);
    const now = new Date();
    const newTrip = {
      id: `TRIP-${num}`,
      tripId: num,
      dealId: createDeal.id,
      locomotiveId: tripForm.locomotiveId,
      cargoOfficerName: user.fullName,
      company: createDeal.company,
      origin: station,
      destination: createDeal.destination,
      cargoType: createDeal.cargoType,
      quantity: createDeal.quantity,
      status: 'LOADING',
      createdAt: now.toLocaleString(),
      wagonLogs: [{
        id: `wl_${Date.now()}`,
        wagonId: tripForm.selectedWagon,
        startTimestamp: Date.now(),
        startDate: tripForm.loadingDate,
        startTime: tripForm.startTime,
        endDate: null, endTime: null, durationStr: null,
        qty: tripForm.qty,
        status: 'LOADING',
      }],
    };
    const updatedTrips = [newTrip, ...trips];
    const updatedDeals = deals.filter(d => d.id !== createDeal.id);
    saveTrips(updatedTrips);
    saveDeals(updatedDeals);
    setCreateDeal(null);
    setSelectedTripId(newTrip.id);
    setView('trips');
  };

  /* ── Submit Fund Request ── */
  const handleFundRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req = {
      id: `REQ-${Date.now()}`,
      officerName: user.fullName,
      station,
      ...fundForm,
      amount: parseFloat(fundForm.amount) || 0,
      stage: 'Admin',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      conversation: [{ sender: user.fullName, role: 'Cargo Officer', msg: fundForm.description, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
      paymentDetails: null,
    };
    saveRequests([req, ...requests]);
    setFundsModal(false);
    setFundForm({ title: '', amount: '', category: 'Equipment', description: '' });
    setView('funds');
  };

  const navItems = [
    { key: 'deals',      label: '📋 Latest Deals' },
    { key: 'trips',      label: '🚆 Trips Created' },
    { key: 'in_transit', label: '🚚 Trips on the Move' },
    { key: 'funds',      label: '💵 Request Funds' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: `Cargo Officer — ${sName(station)}` }} navItems={navItems} activeKey={view} onNav={k => { setView(k as any); setSelectedTripId(null); }} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>

      {/* ── TRIP DETAIL (WAGON LOADING) ── */}
      {selectedTripId ? (
        <TripWagonView
          tripId={selectedTripId}
          trips={trips}
          onBack={() => setSelectedTripId(null)}
          onSaveTrips={saveTrips}
        />
      ) : (
        <>
          {/* VIEW: Latest Deals */}
          {view === 'deals' && (
            <Section title="Latest Deals" subtitle={`Deals assigned to ${sName(station)} — click Create Trip to begin loading`}>
              <TableWrap headers={['Deal ID', 'Company', 'Destination', 'Cargo & Qty', 'Action']}>
                {myDeals.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No deals assigned to {sName(station)} yet. The Admin Officer will create and assign deals.</td></tr>
                ) : myDeals.map(d => (
                  <tr key={d.id} className="hover:bg-amber-50 transition-colors">
                    <td className="p-4 font-mono font-black text-amber-700">{d.dealNumber || d.id}</td>
                    <td className="p-4 font-bold text-slate-900">{d.company}</td>
                    <td className="p-4 text-slate-700 font-semibold">{sName(d.destination)}</td>
                    <td className="p-4 text-slate-700">{d.cargoType} <b>({d.quantity} Bags)</b></td>
                    <td className="p-4">
                      <button onClick={() => { setCreateDeal(d); setTripForm(f => ({ ...f, selectedWagon: MASTER_WAGONS[0] })); }}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl">
                        Create Trip ➔
                      </button>
                    </td>
                  </tr>
                ))}
              </TableWrap>
            </Section>
          )}

          {/* VIEW: Trips Created */}
          {view === 'trips' && (
            <Section title="Trips Created" subtitle="Click a trip to continue wagon loading">
              <TableWrap headers={['Trip ID', 'Cargo Officer', 'Company', 'Route', 'Wagons Loaded', 'Action']}>
                {myTrips.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No trips in loading stage yet.</td></tr>
                ) : myTrips.map(t => {
                  const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                  return (
                    <tr key={t.id} className="hover:bg-amber-50 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                      <td className="p-4 font-mono font-black text-amber-700">{t.tripId}</td>
                      <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                      <td className="p-4 text-slate-700">{t.company}</td>
                      <td className="p-4 text-slate-600">{sName(t.origin)} → {sName(t.destination)}</td>
                      <td className="p-4 font-mono font-bold text-slate-900">{loaded} / 23</td>
                      <td className="p-4 font-bold text-amber-600">Open ➔</td>
                    </tr>
                  );
                })}
              </TableWrap>
            </Section>
          )}

          {/* VIEW: Trips on the Move */}
          {view === 'in_transit' && (
            <Section title="Trips on the Move" subtitle="Dispatched trips currently in corridor transit">
              <TableWrap headers={['Trip ID', 'Company', 'Locomotive', 'Route', 'Status']}>
                {myInTransit.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No trips in transit from {sName(station)} yet.</td></tr>
                ) : myInTransit.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-black text-amber-700">{t.tripId}</td>
                    <td className="p-4 font-bold text-slate-900">{t.company}</td>
                    <td className="p-4 font-mono text-slate-800">{t.locomotiveId}</td>
                    <td className="p-4 text-slate-600">{sName(t.origin)} → {sName(t.destination)}</td>
                    <td className="p-4"><Badge text={t.status} color="green" /></td>
                  </tr>
                ))}
              </TableWrap>
            </Section>
          )}

          {/* VIEW: Request Funds */}
          {view === 'funds' && (
            <Section title="Request Funds" subtitle="Submit and track petty cash requests for station needs" action={<button onClick={() => setFundsModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl">+ Request Funds</button>}>
              <TableWrap headers={['Req ID', 'Title & Category', 'Amount (₦)', 'Current Stage', 'Date']}>
                {requests.filter(r => r.station === station).length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No fund requests submitted yet.</td></tr>
                ) : requests.filter(r => r.station === station).map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-black text-amber-700">{r.id}</td>
                    <td className="p-4"><p className="font-bold text-slate-900">{r.title}</p><p className="text-[10px] text-slate-500">{r.category}</p></td>
                    <td className="p-4 font-mono font-black text-slate-900">₦{Number(r.amount).toLocaleString()}</td>
                    <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                    <td className="p-4 text-slate-500 font-mono">{r.date}</td>
                  </tr>
                ))}
              </TableWrap>
            </Section>
          )}
        </>
      )}

      {/* ── TRIP CREATION MODAL ── */}
      {createDeal && (
        <Modal onClose={() => setCreateDeal(null)}>
          <div className="p-6 space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-[10px] font-extrabold uppercase text-amber-600 mb-1">DEAL {createDeal.dealNumber} — {createDeal.company}</p>
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Trip Creation Form</h3>
              <p className="text-xs text-slate-500">{sName(station)} ⟶ {sName(createDeal.destination)}</p>
            </div>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div><label className={lc}>Trip ID (Auto-Generated)</label><input readOnly value={`T-${Date.now().toString().slice(-4)}`} className={`${ic} bg-slate-100 cursor-not-allowed`} /></div>
              <div><label className={lc}>Locomotive ID *</label><input required value={tripForm.locomotiveId} onChange={e => setTripForm({ ...tripForm, locomotiveId: e.target.value })} placeholder="e.g. L2205 (General Electric)" className={ic} /></div>
              <div><label className={lc}>Cargo Officer Name</label><input readOnly value={user.fullName} className={`${ic} bg-slate-100`} /></div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-black text-slate-800">First Wagon Loading</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={lc}>Select Wagon</label>
                    <select value={tripForm.selectedWagon} onChange={e => setTripForm({ ...tripForm, selectedWagon: e.target.value })} className={ic}>
                      {MASTER_WAGONS.map(w => <option key={w}>{w}</option>)}
                    </select>
                  </div>
                  <div><label className={lc}>Loading Date</label><input value={tripForm.loadingDate} onChange={e => setTripForm({ ...tripForm, loadingDate: e.target.value })} className={ic} /></div>
                  <div><label className={lc}>Quantity (Bags/MT)</label><input type="number" value={tripForm.qty} onChange={e => setTripForm({ ...tripForm, qty: e.target.value })} className={ic} /></div>
                  <div><label className={lc}>Start Time</label><input value={tripForm.startTime} onChange={e => setTripForm({ ...tripForm, startTime: e.target.value })} className={ic} /></div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setCreateDeal(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl">Begin Wagon Loading & Create Trip ➔</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* ── FUND REQUEST MODAL ── */}
      {fundsModal && (
        <Modal onClose={() => setFundsModal(false)}>
          <div className="p-6 space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Request Funds for Station</h3>
              <p className="text-xs text-slate-500">Petty cash request for tools, equipment, or fuel.</p>
            </div>
            <form onSubmit={handleFundRequest} className="space-y-4">
              <div><label className={lc}>Purpose / Title *</label><input required value={fundForm.title} onChange={e => setFundForm({ ...fundForm, title: e.target.value })} placeholder="e.g. Loading Bay Crane Slings" className={ic} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Amount (₦) *</label><input required type="number" value={fundForm.amount} onChange={e => setFundForm({ ...fundForm, amount: e.target.value })} className={`${ic} font-mono`} placeholder="85000" /></div>
                <div><label className={lc}>Category</label>
                  <select value={fundForm.category} onChange={e => setFundForm({ ...fundForm, category: e.target.value })} className={ic}>
                    {['Equipment', 'Fuel', 'Repairs', 'Maintenance', 'Emergency Purchase', 'Operational Expenses', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lc}>Description *</label><textarea required rows={3} value={fundForm.description} onChange={e => setFundForm({ ...fundForm, description: e.target.value })} className={`${ic} resize-none`} placeholder="Full justification for the request..." /></div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setFundsModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl">Submit Request ➔</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────
   WAGON LOADING VIEW (inside Cargo Officer portal)
───────────────────────────────────────────────────────── */
function TripWagonView({ tripId, trips, onBack, onSaveTrips }: any) {
  const trip = trips.find((t: any) => t.id === tripId);
  const [logs, setLogs] = useState<any[]>(trip?.wagonLogs || []);
  const [adding, setAdding] = useState(false);
  const [selWagon, setSelWagon] = useState('');
  const [qty, setQty] = useState('70');

  if (!trip) return <div className="p-8 text-center text-xs text-slate-400">Trip not found. <button onClick={onBack} className="underline text-amber-600">Go back</button></div>;

  const loaded = logs.filter((w: any) => w.status === 'LOADED').length;
  const allDone = loaded >= 23;
  const active  = logs.find((w: any) => w.status === 'LOADING');
  const usedIds = new Set(logs.map((w: any) => w.wagonId));
  const available = MASTER_WAGONS.filter(w => !usedIds.has(w));
  const pct = Math.min(100, Math.round((loaded / 23) * 100));

  const commitLogs = (updated: any[]) => {
    setLogs(updated);
    onSaveTrips(trips.map((t: any) => t.id === trip.id ? { ...t, wagonLogs: updated } : t));
  };

  const startLoading = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = selWagon || available[0] || 'WG001';
    const now = new Date();
    const log = { id: `wl_${Date.now()}`, wagonId: wId, startTimestamp: Date.now(),
      startDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      endDate: null, endTime: null, durationStr: null, qty, status: 'LOADING' };
    commitLogs([...logs, log]);
    setAdding(false); setSelWagon('');
  };

  const stopLoading = (id: string) => {
    const now = new Date();
    commitLogs(logs.map((w: any) => {
      if (w.id !== id) return w;
      const mins = Math.round((Date.now() - w.startTimestamp) / 60000);
      return { ...w, endDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        endTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationStr: `${mins || 1} Minutes`, status: 'LOADED' };
    }));
  };

  const dispatch = () => {
    onSaveTrips(trips.map((t: any) => t.id === trip.id ? { ...t, status: 'IN_TRANSIT', wagonLogs: logs } : t));
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        <button onClick={onBack} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl">← Back to Trips Created</button>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">{loaded} / 23 Loaded</span>
      </div>

      {/* Trip summary */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 mb-3">TRIP {trip.tripId} — ONGOING DETAILS</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[['Locomotive ID', trip.locomotiveId], ['Cargo Officer', trip.cargoOfficerName], ['Loading Station', trip.origin ? sName(trip.origin) : ''], ['Destination', trip.destination ? sName(trip.destination) : ''], ['Company', trip.company], ['Cargo Type', trip.cargoType], ['Quantity', `${trip.quantity} Bags`], ['Created', trip.createdAt || '—']].map(([l, v]) => (
            <div key={l}><span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span><span className="font-bold">{v}</span></div>
          ))}
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Loading Progress</h3>
        <div className="grid grid-cols-4 gap-3 text-center">
          {[['Required', '23', 'text-white'], ['Loaded', String(loaded), 'text-emerald-400'], ['Remaining', String(23 - loaded), 'text-amber-400'], ['Progress', `${pct}%`, 'text-sky-400']].map(([l, v, c]) => (
            <div key={l} className="bg-slate-900 rounded-xl p-3">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span>
              <span className={`text-xl font-black font-mono ${c}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-amber-400 to-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Wagon controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Loading</h3>
          {!active && !allDone && !adding && (
            <button onClick={() => setAdding(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl">+ Add Wagon to Load</button>
          )}
        </div>

        {adding && (
          <form onSubmit={startLoading} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={lc}>Select Wagon ID</label>
                <select value={selWagon} onChange={e => setSelWagon(e.target.value)} className={ic}>
                  {available.map(w => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div><label className={lc}>Quantity (Bags)</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} className={ic} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl">Begin Loading ➔</button>
            </div>
          </form>
        )}

        {active && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold text-amber-800 uppercase">Currently Loading</p>
              <p className="text-xl font-mono font-black text-slate-900">{active.wagonId}</p>
              <p className="text-xs text-slate-600 mt-0.5">Started: {active.startDate} at {active.startTime}</p>
            </div>
            <div className="flex items-center gap-5">
              <div><span className={lc}>Live Timer</span><LiveTimer ts={active.startTimestamp} /></div>
              <button onClick={() => stopLoading(active.id)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl">Stop Loading ✓</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {logs.map((w: any, i: number) => (
            <div key={w.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div><span className="text-[10px] font-mono text-slate-400 mr-2">#{i + 1}</span><span className="font-mono font-black text-slate-900">{w.wagonId}</span></div>
              <div className="flex gap-3 font-mono text-slate-600">
                <span>Start: {w.startTime}</span>
                <span>End: {w.endTime || '—'}</span>
                <span className="font-bold">Duration: {w.durationStr || 'Running...'}</span>
              </div>
              <Badge text={w.status} color={w.status === 'LOADED' ? 'green' : 'amber'} />
            </div>
          ))}
        </div>

        {!active && !allDone && loaded > 0 && !adding && (
          <button onClick={() => setAdding(true)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl">
            + Add Another Wagon ({loaded + 1} / 23)
          </button>
        )}

        {allDone && (
          <div className="bg-emerald-900 text-white rounded-2xl p-5 space-y-3">
            <p className="text-sm font-bold text-emerald-300">✅ All 23 Wagons Loaded — Train is Ready to Move!</p>
            <button onClick={dispatch} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm py-3.5 rounded-xl">
              Start Trip / Dispatch Journey ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 2 — ADMIN OFFICER
═══════════════════════════════════════════════════════════ */
function AdminPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'deals' | 'trips' | 'requests'>('deals');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deals, setDeals]       = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [createDealModal, setCreateDealModal] = useState(false);
  const [dealForm, setDealForm] = useState({ company: '', loadingStation: 'EWK', destination: 'MNY', cargoType: '', quantity: '' });

  useEffect(() => {
    setDeals(tryParse('bueno_deals', SEED_DEALS));
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
  }, []);

  const persist = (key: string, val: any[]) => localStorage.setItem(key, JSON.stringify(val));
  const saveDeals    = (v: any[]) => { setDeals(v); persist('bueno_deals', v); };
  const saveRequests = (v: any[]) => { setRequests(v); persist('bueno_requests', v); };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const num = String(deals.length + 1).padStart(3, '0');
    const newDeal = { id: `DEAL-${num}`, dealNumber: num, ...dealForm, quantity: dealForm.quantity, createdAt: new Date().toLocaleString(), createdBy: user.fullName };
    saveDeals([newDeal, ...deals]);
    setCreateDealModal(false);
    setDealForm({ company: '', loadingStation: 'EWK', destination: 'MNY', cargoType: '', quantity: '' });
  };

  const advanceRequest = (id: string, nextStage: string) => {
    saveRequests(requests.map(r => r.id === id ? { ...r, stage: nextStage } : r));
  };

  const navItems = [
    { key: 'deals',    label: '📋 Manage Deals' },
    { key: 'trips',    label: '🚆 All Active Trips' },
    { key: 'requests', label: '📝 Fund Requests (Approve)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Admin Officer' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'deals' && (
        <Section title="Manage Deals" subtitle="Create deals and assign them to terminal stations. Cargo Officers will see them under 'Latest Deals'." action={<button onClick={() => setCreateDealModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl">+ Create New Deal</button>}>
          <TableWrap headers={['Deal ID', 'Company', 'Loading Station', 'Destination', 'Cargo & Qty', 'Created']}>
            {deals.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No deals created yet. Click "Create New Deal" to begin.</td></tr>
            ) : deals.map(d => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="p-4 font-mono font-black text-amber-700">{d.dealNumber}</td>
                <td className="p-4 font-bold text-slate-900">{d.company}</td>
                <td className="p-4 font-semibold text-slate-700">{sName(d.loadingStation)}</td>
                <td className="p-4 font-semibold text-slate-700">{sName(d.destination)}</td>
                <td className="p-4 text-slate-700">{d.cargoType} <b>({d.quantity} Bags)</b></td>
                <td className="p-4 text-slate-500 font-mono text-[11px]">{d.createdAt}</td>
              </tr>
            ))}
          </TableWrap>
        </Section>
      )}

      {view === 'trips' && (
        <Section title="All Active Trips" subtitle="Overview of all trips created across all terminals">
          <TableWrap headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons', 'Status']}>
            {trips.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No trips yet.</td></tr>
              : trips.map(t => {
                const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-black text-amber-700">{t.tripId}</td>
                    <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                    <td className="p-4 text-slate-700">{t.company}</td>
                    <td className="p-4 text-slate-600">{sName(t.origin)} → {sName(t.destination)}</td>
                    <td className="p-4 font-mono font-bold">{loaded} / 23</td>
                    <td className="p-4"><Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'amber'} /></td>
                  </tr>
                );
              })}
          </TableWrap>
        </Section>
      )}

      {view === 'requests' && (
        <Section title="Fund Requests — Admin Review" subtitle="Review and approve requests to send to Head of Operations">
          <TableWrap headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Action']}>
            {requests.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No requests yet.</td></tr>
              : requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-amber-700">{r.id}</td>
                  <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                  <td className="p-4 font-bold text-slate-900">{r.title}</td>
                  <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                  <td className="p-4">
                    {r.stage === 'Admin' && <button onClick={() => advanceRequest(r.id, 'Head of Operations')} className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg">Approve → Ops</button>}
                    {r.stage !== 'Admin' && <span className="text-[10px] text-slate-400 font-bold">Forwarded ✓</span>}
                  </td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}

      {createDealModal && (
        <Modal onClose={() => setCreateDealModal(false)}>
          <div className="p-6 space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Create New Deal</h3>
              <p className="text-xs text-slate-500">This deal will appear on the assigned terminal's Cargo Officer portal under "Latest Deals".</p>
            </div>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div><label className={lc}>Company / Client Name *</label><input required value={dealForm.company} onChange={e => setDealForm({ ...dealForm, company: e.target.value })} placeholder="e.g. Lafarge Africa Plc" className={ic} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Loading Station (Origin)</label>
                  <select value={dealForm.loadingStation} onChange={e => setDealForm({ ...dealForm, loadingStation: e.target.value })} className={ic}>
                    {Object.entries(STATIONS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>
                <div><label className={lc}>Destination</label>
                  <select value={dealForm.destination} onChange={e => setDealForm({ ...dealForm, destination: e.target.value })} className={ic}>
                    {Object.entries(STATIONS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>
                <div><label className={lc}>Cargo Type *</label><input required value={dealForm.cargoType} onChange={e => setDealForm({ ...dealForm, cargoType: e.target.value })} placeholder="e.g. Elephant Cement (50kg bags)" className={ic} /></div>
                <div><label className={lc}>Total Quantity (Bags/MT)</label><input type="number" value={dealForm.quantity} onChange={e => setDealForm({ ...dealForm, quantity: e.target.value })} className={ic} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setCreateDealModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl">Create Deal ➔</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 3 — HEAD OF OPERATIONS
═══════════════════════════════════════════════════════════ */
function OpsPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView]   = useState<'trips' | 'requests'>('trips');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trips, setTrips]     = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
  }, []);

  const saveRequests = (v: any[]) => { setRequests(v); localStorage.setItem('bueno_requests', JSON.stringify(v)); };
  const advance = (id: string) => saveRequests(requests.map(r => r.id === id ? { ...r, stage: 'CEO' } : r));

  const navItems = [
    { key: 'trips',    label: '🚆 All Trips Overview' },
    { key: 'requests', label: '📝 Fund Requests (Ops Approval)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Head of Operations' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'trips' && (
        <Section title="All Trips — Operations Overview" subtitle="Network-wide trip and loading status">
          <TableWrap headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons Loaded', 'Status']}>
            {trips.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No trips yet.</td></tr>
              : trips.map(t => {
                const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-black text-amber-700">{t.tripId}</td>
                    <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                    <td className="p-4 text-slate-700">{t.company}</td>
                    <td className="p-4 text-slate-600">{sName(t.origin)} → {sName(t.destination)}</td>
                    <td className="p-4 font-mono font-bold">{loaded} / 23</td>
                    <td className="p-4"><Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'amber'} /></td>
                  </tr>
                );
              })}
          </TableWrap>
        </Section>
      )}
      {view === 'requests' && (
        <Section title="Fund Requests — Operations Approval" subtitle="Approve requests forwarded from Admin to send to MD/CEO">
          <TableWrap headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Action']}>
            {requests.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No requests.</td></tr>
              : requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-amber-700">{r.id}</td>
                  <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                  <td className="p-4 font-bold text-slate-900">{r.title}</td>
                  <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                  <td className="p-4">
                    {r.stage === 'Head of Operations' && <button onClick={() => advance(r.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg">Approve → CEO</button>}
                    {r.stage !== 'Head of Operations' && <span className="text-[10px] text-slate-400 font-bold">{r.stage === 'CEO' || r.stage === 'Accountant' || r.stage === 'Paid' ? 'Forwarded ✓' : 'Pending Admin'}</span>}
                  </td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 4 — MD / CEO
═══════════════════════════════════════════════════════════ */
function CEOPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'trips' | 'requests'>('trips');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trips, setTrips]   = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
  }, []);

  const saveRequests = (v: any[]) => { setRequests(v); localStorage.setItem('bueno_requests', JSON.stringify(v)); };
  const advance = (id: string) => saveRequests(requests.map(r => r.id === id ? { ...r, stage: 'Accountant' } : r));

  const navItems = [
    { key: 'trips',    label: '🚆 All Trips' },
    { key: 'requests', label: '📝 Fund Requests (CEO Clearance)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Managing Director / CEO' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'trips' && (
        <Section title="All Trips — Executive Overview">
          <TableWrap headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons Loaded', 'Status']}>
            {trips.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No trips yet.</td></tr>
              : trips.map(t => {
                const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-4 font-mono font-black text-amber-700">{t.tripId}</td>
                    <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                    <td className="p-4 text-slate-700">{t.company}</td>
                    <td className="p-4 text-slate-600">{sName(t.origin)} → {sName(t.destination)}</td>
                    <td className="p-4 font-mono font-bold">{loaded} / 23</td>
                    <td className="p-4"><Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'amber'} /></td>
                  </tr>
                );
              })}
          </TableWrap>
        </Section>
      )}
      {view === 'requests' && (
        <Section title="Fund Requests — CEO Executive Clearance" subtitle="Final executive approval before payment disbursement">
          <TableWrap headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Action']}>
            {requests.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No requests.</td></tr>
              : requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-amber-700">{r.id}</td>
                  <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                  <td className="p-4 font-bold text-slate-900">{r.title}</td>
                  <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                  <td className="p-4">
                    {r.stage === 'CEO' && <button onClick={() => advance(r.id)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg">CEO Approve → Accountant</button>}
                    {r.stage !== 'CEO' && <span className="text-[10px] text-slate-400">{r.stage === 'Accountant' || r.stage === 'Paid' ? 'Approved ✓' : 'Pending'}</span>}
                  </td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 5 — ACCOUNTANT / HEAD OF FINANCE
═══════════════════════════════════════════════════════════ */
function AccountantPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'requests' | 'records'>('requests');
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [records,  setRecords]  = useState<any[]>([]);
  const [payRef, setPayRef] = useState('');

  useEffect(() => {
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
    setRecords(tryParse('bueno_finance_records', []));
  }, []);

  const disburse = (req: any) => {
    const ref = payRef || `TRF-GTB-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const updated = requests.map(r => r.id === req.id ? { ...r, stage: 'Paid', paymentDetails: { ref, date: now, method: 'Bank Transfer', paidBy: user.fullName } } : r);
    const newRecord = { id: `FIN-${Date.now()}`, reqId: req.id, beneficiary: req.officerName, station: req.station, amount: req.amount, ref, date: now, approvedBy: 'MD/CEO', accountant: user.fullName };
    const updatedRecords = [newRecord, ...records];
    setRequests(updated); localStorage.setItem('bueno_requests', JSON.stringify(updated));
    setRecords(updatedRecords); localStorage.setItem('bueno_finance_records', JSON.stringify(updatedRecords));
    setPayRef('');
  };

  const navItems = [
    { key: 'requests', label: '💵 Approved Requests (Disburse)' },
    { key: 'records',  label: '📒 Financial Transaction Records' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Head of Finance / Accountant' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'requests' && (
        <Section title="Approved Requests — Disburse Payment" subtitle="CEO-approved requests ready for payment disbursement">
          <TableWrap headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Payment Reference', 'Action']}>
            {requests.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-xs">No requests yet.</td></tr>
              : requests.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-amber-700">{r.id}</td>
                  <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                  <td className="p-4 font-bold text-slate-900">{r.title}</td>
                  <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                  <td className="p-4">
                    {r.stage === 'Accountant' && <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="e.g. TRF-GTB-998301" className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-mono w-40" />}
                    {r.stage === 'Paid' && <span className="text-[11px] font-mono text-slate-500">{r.paymentDetails?.ref}</span>}
                  </td>
                  <td className="p-4">
                    {r.stage === 'Accountant' && <button onClick={() => disburse(r)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg">Disburse ✓</button>}
                    {r.stage === 'Paid' && <span className="text-[10px] font-bold text-emerald-700">PAID ✓</span>}
                    {r.stage !== 'Accountant' && r.stage !== 'Paid' && <span className="text-[10px] text-slate-400">Pending</span>}
                  </td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}
      {view === 'records' && (
        <Section title="Financial Transaction Records" subtitle="Permanent ledger of all disbursed payments">
          <TableWrap headers={['Record ID', 'Request ID', 'Beneficiary / Station', 'Amount (₦)', 'Date', 'Reference', 'Accountant']}>
            {records.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-xs">No records yet.</td></tr>
              : records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-amber-700">{r.id}</td>
                  <td className="p-4 font-mono font-bold text-slate-900">{r.reqId}</td>
                  <td className="p-4"><p className="font-bold text-slate-900">{r.beneficiary}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                  <td className="p-4 font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</td>
                  <td className="p-4 font-mono text-slate-600">{r.date}</td>
                  <td className="p-4 font-mono font-bold text-slate-800">{r.ref}</td>
                  <td className="p-4 text-slate-700 font-semibold">{r.accountant}</td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────
   SHARED TABLE / SECTION COMPONENTS
───────────────────────────────────────────────────────── */
function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TableWrap({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <table className="w-full text-xs">
        <thead className="bg-slate-900 text-white">
          <tr>{headers.map(h => <th key={h} className="text-left p-4 text-[10px] font-extrabold uppercase tracking-widest">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT — reads role from localStorage and renders correct portal
═══════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bueno_user');
      if (!raw) { router.push('/auth/login'); return; }
      setUser(JSON.parse(raw));
    } catch {
      router.push('/auth/login');
    } finally {
      setReady(true);
    }
  }, [router]);

  const signOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    router.push('/auth/login');
  };

  if (!ready || !user) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center text-white space-y-3">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-400">Loading your workspace...</p>
      </div>
    </div>
  );

  const role = user.role;

  if (role === 'CARGO_OFFICER')      return <CargoOfficerPortal user={user} onSignOut={signOut} />;
  if (role === 'ADMIN')              return <AdminPortal         user={user} onSignOut={signOut} />;
  if (role === 'HEAD_OF_OPERATIONS') return <OpsPortal           user={user} onSignOut={signOut} />;
  if (role === 'CEO' || role === 'MD') return <CEOPortal          user={user} onSignOut={signOut} />;
  if (role === 'HEAD_OF_FINANCE')    return <AccountantPortal    user={user} onSignOut={signOut} />;

  // Fallback
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-white text-center">
      <div>
        <p className="font-bold text-amber-400 text-lg mb-2">Unknown Role: {role}</p>
        <p className="text-xs text-slate-400 mb-4">Your account role is not recognised. Please contact Admin.</p>
        <button onClick={signOut} className="bg-amber-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs">Sign Out</button>
      </div>
    </div>
  );
}
