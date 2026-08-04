'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────────────────
   MASTER DATA & STATIONS
───────────────────────────────────────────────────────── */
const STATIONS: Record<string, string> = {
  EWK: 'Ewekoro Terminal',
  ITO: 'Itori Junction',
  MNY: 'Moniya Yard (Ibadan)',
  ILR: 'Ilorin Freight Hub',
  APT: 'Apapa Maritime Port',
};
const sName = (c: string) => STATIONS[c] || c;

const STATION_COORDS: Record<string, [number, number]> = {
  EWK: [6.8974, 3.2141],
  ITO: [6.9333, 3.3833],
  MNY: [7.4610, 3.9470],
  ILR: [8.4966, 4.5426],
  APT: [6.4550, 3.3610],
};

// Initial 46 Registered Wagons
const SEED_WAGONS: any[] = Array.from({ length: 46 }, (_, i) => {
  const id = `WG${String(i + 1).padStart(3, '0')}`;
  const isInUse = id === 'WG001' || id === 'WG002';
  return {
    id,
    capacity: 70,
    status: isInUse ? 'IN_TRANSIT' : 'AVAILABLE',
    currentStation: isInUse ? 'MNY' : 'EWK',
    addedBy: 'System Registry',
    createdAt: '31 Jul 2026',
  };
});

const SEED_DEALS: any[] = [];

const SEED_TRIPS: any[] = [];

const SEED_REQUESTS: any[] = [
  {
    id: 'REQ-2026-0001',
    officerName: 'Ade Bello', station: 'EWK',
    title: 'Hydraulic Jacks & Crane Slings', category: 'Equipment',
    amount: 85000, description: 'Bay crane replacement parts for wagon maintenance bay.',
    stage: 'Admin', date: '31 Jul 2026',
    conversation: [
      { sender: 'Ade Bello', role: 'Cargo Officer', msg: 'Need 3 hydraulic jacks urgently for loading bay crane.', time: '09:00 AM' },
    ],
    paymentDetails: null,
  },
];

/* ─────────────────────────────────────────────────────────
   SHARED UTILS
───────────────────────────────────────────────────────── */
const ic = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37] focus:bg-white';
const lc = 'block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1';

function tryParse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}

function getOccupiedWagonIds(trips: any[]): Set<string> {
  const occupied = new Set<string>();
  trips.forEach((t: any) => {
    if (t.status === 'LOADING' || t.status === 'IN_TRANSIT' || t.status === 'UNLOADING') {
      (t.wagonLogs || []).forEach((w: any) => {
        if (w.wagonId && w.unloadStatus !== 'UNLOADED') {
          occupied.add(w.wagonId);
        }
      });
    }
  });
  return occupied;
}

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color || 'green';
  const cls: Record<string, string> = {
    green:  'bg-emerald-50 text-emerald-800 border-emerald-200',
    blue:   'bg-blue-50 text-[#0E4B88] border-blue-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
    red:    'bg-rose-50 text-rose-800 border-rose-200',
    amber:  'bg-amber-50 text-amber-800 border-amber-200',
    slate:  'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${cls[c] || cls.green}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />{text}
    </span>
  );
}

function stageColor(stage: string) {
  if (stage === 'Completed' || stage === 'Paid') return 'green';
  if (stage === 'Admin') return 'blue';
  if (stage === 'Head of Operations') return 'purple';
  if (stage === 'CEO') return 'amber';
  if (stage === 'Accountant') return 'red';
  return 'green';
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function LiveTimer({ ts }: { ts: number }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const tick = () => setSec(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [ts]);
  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');
  return <span className="font-mono font-black text-[#62BC37] text-base sm:text-lg">{hh}:{mm}:{ss}</span>;
}

/* ─────────────────────────────────────────────────────────
   HIGH-PRECISION INTERACTIVE RAIL CORRIDOR MAP (LIGHT UI)
───────────────────────────────────────────────────────── */
function RailCorridorGpsMap({ trip }: { trip: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  const originCoords: [number, number] = STATION_COORDS[trip?.origin] || [6.8974, 3.2141];
  const destCoords: [number, number]   = STATION_COORDS[trip?.destination] || [7.4610, 3.9470];

  const [progressRatio, setProgressRatio] = useState(
    trip?.status === 'ARRIVED' || trip?.status === 'UNLOADING' || trip?.status === 'COMPLETED' ? 1.0 : 0.58
  );
  const [speed, setSpeed] = useState(trip?.status === 'IN_TRANSIT' ? 74 : 0);

  const curLat = originCoords[0] + (destCoords[0] - originCoords[0]) * progressRatio;
  const curLng = originCoords[1] + (destCoords[1] - originCoords[1]) * progressRatio;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (trip?.status === 'IN_TRANSIT') {
      const id = setInterval(() => {
        setSpeed(70 + Math.floor(Math.random() * 10));
        setProgressRatio(r => (r >= 0.95 ? 0.95 : r + 0.003));
      }, 3000);
      return () => clearInterval(id);
    }
  }, [trip?.status]);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const currentPoint: [number, number] = [curLat, curLng];
      const elem = containerRef.current;
      if (!elem) return;

      if (!mapRef.current) {
        const map = L.map(elem, { zoomControl: true }).setView(currentPoint, 9);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Track polyline
        const track = L.polyline([originCoords, destCoords], {
          color: '#62BC37',
          weight: 6,
          dashArray: '8, 8',
          opacity: 0.9,
        }).addTo(map);

        // Station markers
        Object.entries(STATION_COORDS).forEach(([code, coords]) => {
          const isOrigin = code === trip?.origin;
          const isDest   = code === trip?.destination;
          L.circleMarker(coords, {
            radius: isOrigin || isDest ? 9 : 6,
            color: isOrigin ? '#62BC37' : isDest ? '#8B5CF6' : '#0E4B88',
            fillColor: '#FFFFFF',
            fillOpacity: 1,
            weight: 3,
          }).addTo(map).bindPopup(`<b>${sName(code)} (${code})</b><br/>GPS: ${coords[0]}°N, ${coords[1]}°E`);
        });

        // Train locomotive marker
        const trainIcon = L.divIcon({
          html: `
            <div style="background:#0E4B88; color:#FFFFFF; font-family:'JetBrains Mono', monospace; font-size:10px; font-weight:800; padding:5px 10px; border-radius:16px; border:2px solid #62BC37; box-shadow:0 4px 14px rgba(14,75,136,0.3); display:inline-flex; items-center; gap:6px; white-space:nowrap;">
              <span style="width:8px; height:8px; border-radius:50%; background:#62BC37; display:inline-block;" class="animate-pulse"></span>
              ${trip?.locomotiveId || 'L2205'} (${trip?.company || 'Consignment'})
            </div>
          `,
          className: 'custom-train-marker',
          iconSize: [160, 32],
          iconAnchor: [80, 16],
        });

        markerRef.current = L.marker(currentPoint, { icon: trainIcon }).addTo(map);
        map.fitBounds(track.getBounds(), { padding: [40, 40] });
        mapRef.current = map;
      } else {
        if (markerRef.current) {
          markerRef.current.setLatLng(currentPoint);
        }
      }
    });
  }, [mounted, curLat, curLng, trip]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="p-4 sm:p-5 bg-slate-50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#62BC37] animate-pulse" />
            <span className="text-[11px] font-mono font-black uppercase text-[#62BC37]">LIVE SATELLITE GPS TELEMETRY</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit',sans-serif" }}>
            {sName(trip?.origin)} <span className="text-[#62BC37]">➔</span> {sName(trip?.destination)}
          </h3>
          <p className="text-xs text-slate-500">Locomotive: <b className="text-slate-800">{trip?.locomotiveId}</b> • {trip?.company}</p>
        </div>
        <div className="flex gap-4 sm:gap-6 text-right font-mono text-xs">
          <div><span className="block text-[9px] uppercase font-extrabold text-slate-400">Live Speed</span><span className="text-sm sm:text-base font-black text-[#62BC37]">{speed} km/h</span></div>
          <div><span className="block text-[9px] uppercase font-extrabold text-slate-400">Progress</span><span className="text-sm sm:text-base font-black text-[#0E4B88]">{(progressRatio * 100).toFixed(0)}%</span></div>
          <div><span className="block text-[9px] uppercase font-extrabold text-slate-400">GPS Position</span><span className="text-xs font-bold text-slate-700">{curLat.toFixed(4)}°N, {curLng.toFixed(4)}°E</span></div>
        </div>
      </div>
      <div ref={containerRef} className="h-80 sm:h-96 w-full bg-slate-100" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FUND REQUEST DETAILED INSPECTION MODAL
───────────────────────────────────────────────────────── */
function FundRequestDetailModal({
  req, user, onClose, onSaveRequests, allRequests,
}: {
  req: any; user: any; onClose: () => void; onSaveRequests: (v: any[]) => void; allRequests: any[];
}) {
  const [chatMsg, setChatMsg] = useState('');
  const [disburseRef, setDisburseRef] = useState(req.paymentDetails?.ref || '');

  const stages = [
    { key: 'Admin', label: '1. Admin Review' },
    { key: 'Head of Operations', label: '2. Ops Review' },
    { key: 'CEO', label: '3. CEO Clearance' },
    { key: 'Accountant', label: '4. Finance Disburse' },
    { key: 'Paid', label: '5. Paid' },
  ];
  const currentStageIndex = stages.findIndex(s => s.key === req.stage);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { sender: user.fullName, role: user.roleLabel || user.role, msg: chatMsg.trim(), time: now };
    const updated = allRequests.map((r: any) => r.id === req.id ? { ...r, conversation: [...(r.conversation || []), newMsg] } : r);
    onSaveRequests(updated);
    setChatMsg('');
  };

  const advanceStage = (nextStage: string) => {
    const updated = allRequests.map((r: any) => r.id === req.id ? { ...r, stage: nextStage } : r);
    onSaveRequests(updated);
    onClose();
  };

  const disbursePayment = () => {
    const ref = disburseRef || `TRF-GTB-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const updated = allRequests.map((r: any) => r.id === req.id ? { ...r, stage: 'Paid', paymentDetails: { ref, date: now, method: 'Bank Transfer', paidBy: user.fullName } } : r);
    const records = tryParse('bueno_finance_records', []);
    const newRecord = { id: `FIN-${Date.now()}`, reqId: req.id, beneficiary: req.officerName, station: req.station, amount: req.amount, ref, date: now, approvedBy: 'MD/CEO', accountant: user.fullName };
    localStorage.setItem('bueno_finance_records', JSON.stringify([newRecord, ...records]));
    onSaveRequests(updated);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap justify-between items-start border-b border-slate-100 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-[#0E4B88] text-sm">{req.id}</span>
              <Badge text={req.stage} color={stageColor(req.stage)} />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit',sans-serif" }}>{req.title}</h3>
            <p className="text-xs text-slate-500">Submitted by <b className="text-slate-800">{req.officerName}</b> ({sName(req.station)}) • {req.date}</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="block text-[10px] font-extrabold uppercase text-slate-400">Requested Amount</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700">₦{Number(req.amount).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Approval Progression Stepper</p>
          <div className="grid grid-cols-5 gap-1.5 text-center text-[9px] sm:text-[10px]">
            {stages.map((s, idx) => {
              const isActive = idx === currentStageIndex;
              const isPassed = idx < currentStageIndex;
              return (
                <div key={s.key} className={`p-1.5 sm:p-2 rounded-xl border transition-all ${isActive ? 'bg-[#62BC37] border-[#52A02D] text-white font-black shadow-sm' : isPassed ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <span className="block truncate">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700">Category: <b className="text-slate-900">{req.category}</b></span>
            <span className="font-mono text-slate-500">Station: {sName(req.station)}</span>
          </div>
          <div>
            <span className={lc}>Justification / Description</span>
            <p className="text-xs text-slate-800 font-medium bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">{req.description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center"><h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Approval Conversation & Clarifications ({req.conversation?.length || 0})</h4></div>
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 max-h-56 overflow-y-auto border border-slate-200">
            {(!req.conversation || req.conversation.length === 0) ? (
              <p className="text-center text-xs text-slate-400 py-4">No questions or notes added yet.</p>
            ) : (
              req.conversation.map((m: any, i: number) => {
                const isMe = m.sender === user.fullName;
                return (
                  <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-xs space-y-1 ${isMe ? 'bg-[#0E4B88] text-white font-semibold' : 'bg-white text-slate-900 border border-slate-200 shadow-xs'}`}>
                      <div className="flex justify-between items-center gap-3 text-[10px] opacity-80 border-b border-current/10 pb-1">
                        <span className="font-bold">{m.sender} ({m.role})</span><span className="font-mono">{m.time}</span>
                      </div>
                      <p className="leading-snug">{m.msg}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Ask a question or clarify details before approving..." className={`${ic} flex-1`} />
            <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-4 py-2.5 rounded-xl whitespace-nowrap shadow-sm">Send Q&A</button>
          </form>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl">Close View</button>
          {user.role === 'ADMIN' && req.stage === 'Admin' && <button onClick={() => advanceStage('Head of Operations')} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md">Approve & Forward to Operations Head ➔</button>}
          {user.role === 'HEAD_OF_OPERATIONS' && req.stage === 'Head of Operations' && <button onClick={() => advanceStage('CEO')} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md">Approve & Forward to MD / CEO ➔</button>}
          {(user.role === 'CEO' || user.role === 'MD') && req.stage === 'CEO' && <button onClick={() => advanceStage('Accountant')} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md">CEO Executive Clearance → Send to Accountant ➔</button>}
          {user.role === 'HEAD_OF_FINANCE' && req.stage === 'Accountant' && (
            <div className="flex items-center gap-2">
              <input value={disburseRef} onChange={e => setDisburseRef(e.target.value)} placeholder="Payment Ref (e.g. TRF-GTB-998120)" className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono w-48" />
              <button onClick={disbursePayment} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md">Disburse Payment</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 6 — CUSTOMER / INDUSTRIAL CONSIGNEE
═══════════════════════════════════════════════════════════ */
function CustomerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'tracking' | 'alerts' | 'history'>('tracking');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);

  const companyName = user?.companyName || 'Lafarge Africa Plc';

  useEffect(() => {
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
  }, []);

  const myTrips = trips.filter(t => t.company?.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(t.company?.toLowerCase()));
  const activeTrip = myTrips.find(t => t.status === 'IN_TRANSIT' || t.status === 'LOADING' || t.status === 'UNLOADING') || myTrips[0] || SEED_TRIPS[0];

  const navItems = [
    { key: 'tracking', label: 'Live Consignment Tracking' },
    { key: 'alerts',   label: 'Live Shipment Notifications' },
    { key: 'history',  label: 'Consignment Delivery History' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: `Industrial Consignee — ${companyName}` }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'tracking' && (
        <div className="space-y-6">
          <Section title={`Live Consignment Tracking — ${companyName}`} subtitle="Real-time satellite GPS telemetry and wagon manifest for your company's freight">
            {activeTrip ? (
              <div className="space-y-6">
                <RailCorridorGpsMap trip={activeTrip} />
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs">
                  <h4 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Manifest Breakdown ({activeTrip.wagonLogs?.length || 23} Wagons)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {(activeTrip.wagonLogs || []).map((w: any, idx: number) => (
                      <div key={w.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <span className="text-[10px] font-mono text-slate-400 block">Wagon #{idx + 1}</span>
                        <span className="font-mono font-black text-slate-900">{w.wagonId}</span>
                        <span className="block text-[11px] text-slate-600 mt-1">{w.qty || 70} Bags • {w.durationStr || 'Loaded'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">No active consignments currently in transit for {companyName}.</div>
            )}
          </Section>
        </div>
      )}

      {view === 'alerts' && (
        <Section title="Live Consignment Notifications" subtitle="Real-time milestone alerts pushed from terminal operations">
          <div className="space-y-3">
            {myTrips.map(t => (
              <div key={t.id} className="bg-white border-l-4 border-[#62BC37] rounded-2xl p-5 shadow-sm space-y-2 border border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88] text-sm">TRIP #{t.tripId} — {t.company}</span>
                  <Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} />
                </div>
                <p className="text-xs text-slate-800 font-medium">
                  Locomotive <b className="font-mono">{t.locomotiveId}</b> carrying <b>{t.quantity} Bags</b> of {t.cargoType} from <b>{sName(t.origin)}</b> to <b>{sName(t.destination)}</b> is currently <b>{t.status}</b>.
                </p>
                <p className="text-[10px] font-mono text-slate-400">GPS Signal: Live Satellite Stream • Officer: {t.cargoOfficerName}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {view === 'history' && (
        <Section title="Consignment Delivery History" subtitle="Completed and audited freight shipments for your account">
          <TableWrap
            headers={['Trip ID', 'Origin ➔ Destination', 'Cargo Type', 'Wagons', 'Status', 'Date']}
            mobileCard={(t: any) => (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                  <Badge text={t.status} color={t.status === 'ARRIVED' ? 'green' : 'blue'} />
                </div>
                <p className="font-bold text-slate-900">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                <p className="text-xs text-slate-600">{t.cargoType} ({t.quantity} Bags)</p>
                <p className="text-[10px] font-mono text-slate-400">{t.createdAt}</p>
              </div>
            )}
            data={myTrips}
          >
            {myTrips.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No consignment history yet.</td></tr>
              : myTrips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                  <td className="p-4 font-bold text-slate-900">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                  <td className="p-4 text-slate-700">{t.cargoType} <b>({t.quantity} Bags)</b></td>
                  <td className="p-4 font-mono font-bold text-slate-800">{t.wagonLogs?.length || 23} Wagons</td>
                  <td className="p-4"><Badge text={t.status} color={t.status === 'ARRIVED' ? 'green' : 'blue'} /></td>
                  <td className="p-4 text-slate-400 font-mono">{t.createdAt}</td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL SHELL (LIGHT & USER FRIENDLY UI)
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
    <div className="h-full bg-white flex flex-col border-r border-slate-200" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-10 object-contain" />
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const isActive = activeKey === item.key;
          return (
            <button key={item.key} onClick={() => { onNav(item.key); setMenuOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-extrabold transition-all ${isActive ? 'bg-[#62BC37] text-white shadow-md shadow-[#62BC37]/20' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200 space-y-2 bg-slate-50">
        <div className="px-2">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 mb-0.5">Signed in as</p>
          <p className="text-xs font-black text-slate-900">{user?.fullName}</p>
          <p className="text-[11px] text-[#0E4B88] font-bold mt-0.5">{user?.roleLabel}</p>
        </div>
        <Link href="/" className="block px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900">← Home Page</Link>
        <button onClick={onSignOut} className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50">Sign Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F9F1]/60 flex" style={{ fontFamily: "'Inter',sans-serif" }}>
      <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col sticky top-0 h-screen"><Nav /></aside>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 w-64 flex-shrink-0"><Nav /></div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-slate-700 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-8 sm:h-9 object-contain" />
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-900 truncate max-w-[150px] sm:max-w-none">{user?.fullName}</p>
            <p className="text-[10px] text-[#0E4B88] font-bold truncate max-w-[150px] sm:max-w-none">{user?.roleLabel || user?.role}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 1 — CARGO OFFICER
═══════════════════════════════════════════════════════════ */
function CargoOfficerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'deals' | 'trips' | 'in_transit' | 'incoming_unload' | 'wagons' | 'funds'>('deals');
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedUnloadTripId, setSelectedUnloadTripId] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  const [deals, setDeals]         = useState<any[]>([]);
  const [trips, setTrips]         = useState<any[]>([]);
  const [requests, setRequests]   = useState<any[]>([]);
  const [wagons, setWagons]       = useState<any[]>([]);

  const [createDeal, setCreateDeal]     = useState<any>(null);
  const [addWagonModal, setAddWagonModal] = useState(false);
  const [fundsModal, setFundsModal]     = useState(false);

  const [newWagonId, setNewWagonId] = useState('');
  const [tripForm, setTripForm]     = useState({ locomotiveId: '', selectedWagon: '', loadingDate: '', qty: '70', startTime: '' });
  const [fundForm, setFundForm]     = useState({ title: '', amount: '', category: 'Equipment', description: '' });

  const station = user?.assignedStation || 'EWK';

  useEffect(() => {
    setDeals(tryParse('bueno_deals', SEED_DEALS));
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
    setWagons(tryParse('bueno_wagons', SEED_WAGONS));
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
  const saveWagons   = (v: any[]) => { setWagons(v);   persist('bueno_wagons', v);   };

  const occupiedWagonIds = getOccupiedWagonIds(trips);
  const availableWagons = wagons.filter(w => !occupiedWagonIds.has(w.id));

  const myDeals       = deals.filter(d => d.loadingStation === station);
  const myTrips       = trips.filter(t => t.origin === station && t.status === 'LOADING');
  const myInTransit   = trips.filter(t => t.origin === station && t.status === 'IN_TRANSIT');
  const myIncomingUnload = trips.filter(t => t.destination === station && (t.status === 'IN_TRANSIT' || t.status === 'UNLOADING'));

  const handleRegisterWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = newWagonId.trim().toUpperCase() || `WG${String(wagons.length + 1).padStart(3, '0')}`;
    if (wagons.some(w => w.id === wId)) { alert(`Wagon ${wId} is already registered!`); return; }
    saveWagons([...wagons, { id: wId, capacity: 70, status: 'AVAILABLE', currentStation: station, addedBy: user.fullName, createdAt: new Date().toLocaleDateString('en-GB') }]);
    setNewWagonId(''); setAddWagonModal(false);
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDeal) return;
    const firstWagon = tripForm.selectedWagon || availableWagons[0]?.id || 'WG001';
    const num = String(Date.now()).slice(-4);
    const now = new Date();
    const newTrip = {
      id: `TRIP-${num}`, tripId: num, dealId: createDeal.id, locomotiveId: tripForm.locomotiveId, cargoOfficerName: user.fullName, company: createDeal.company, origin: station, destination: createDeal.destination, cargoType: createDeal.cargoType, quantity: createDeal.quantity, status: 'LOADING', createdAt: now.toLocaleString(),
      wagonLogs: [{ id: `wl_${Date.now()}`, wagonId: firstWagon, startTimestamp: Date.now(), startDate: tripForm.loadingDate, startTime: tripForm.startTime, endDate: null, endTime: null, durationStr: null, qty: tripForm.qty, status: 'LOADED', unloadStatus: 'PENDING_UNLOAD' }],
    };
    saveTrips([newTrip, ...trips]);
    saveDeals(deals.filter(d => d.id !== createDeal.id));
    setCreateDeal(null); setSelectedTripId(newTrip.id); setView('trips');
  };

  const handleFundRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req = { id: `REQ-${Date.now()}`, officerName: user.fullName, station, ...fundForm, amount: parseFloat(fundForm.amount) || 0, stage: 'Admin', date: new Date().toLocaleDateString('en-GB'), conversation: [{ sender: user.fullName, role: 'Cargo Officer', msg: fundForm.description, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }], paymentDetails: null };
    saveRequests([req, ...requests]);
    setFundsModal(false); setFundForm({ title: '', amount: '', category: 'Equipment', description: '' }); setView('funds');
  };

  const navItems = [
    { key: 'deals',           label: 'Latest Deals (Loading)' },
    { key: 'trips',           label: 'Trips Created (Loading)' },
    { key: 'in_transit',      label: 'Trips on the Move' },
    { key: 'incoming_unload', label: 'Incoming Consignments (Unload)' },
    { key: 'wagons',          label: `Wagon Fleet (${wagons.length})` },
    { key: 'funds',           label: 'Request Funds' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: `Cargo Officer — ${sName(station)}` }} navItems={navItems} activeKey={view} onNav={k => { setView(k as any); setSelectedTripId(null); setSelectedUnloadTripId(null); }} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {selectedTripId ? (
        <TripWagonView tripId={selectedTripId} trips={trips} wagons={wagons} onBack={() => setSelectedTripId(null)} onSaveTrips={saveTrips} />
      ) : selectedUnloadTripId ? (
        <TripUnloadWagonView tripId={selectedUnloadTripId} trips={trips} user={user} onBack={() => setSelectedUnloadTripId(null)} onSaveTrips={saveTrips} />
      ) : (
        <>
          {view === 'deals' && (
            <Section title="Latest Deals (Origin Loading Station)" subtitle={`Deals assigned to ${sName(station)} — click Create Trip to begin wagon loading`}>
              <TableWrap
                headers={['Deal ID', 'Company', 'Destination', 'Cargo & Qty', 'Action']}
                mobileCard={(d: any) => (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-[#0E4B88]">{d.dealNumber || d.id}</span>
                      <span className="text-xs font-bold text-slate-700">{sName(d.destination)}</span>
                    </div>
                    <p className="font-bold text-slate-900">{d.company}</p>
                    <p className="text-xs text-slate-600">{d.cargoType} ({d.quantity} Bags)</p>
                    <button onClick={() => { setCreateDeal(d); setTripForm(f => ({ ...f, selectedWagon: availableWagons[0]?.id || '' })); }} className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs py-2 rounded-xl mt-2 shadow-sm">Create Trip ➔</button>
                  </div>
                )}
                data={myDeals}
              >
                {myDeals.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No loading deals assigned to {sName(station)}.</td></tr>
                  : myDeals.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-black text-[#0E4B88]">{d.dealNumber || d.id}</td>
                      <td className="p-4 font-bold text-slate-900">{d.company}</td>
                      <td className="p-4 text-slate-700 font-semibold">{sName(d.destination)}</td>
                      <td className="p-4 text-slate-700">{d.cargoType} <b>({d.quantity} Bags)</b></td>
                      <td className="p-4"><button onClick={() => { setCreateDeal(d); setTripForm(f => ({ ...f, selectedWagon: availableWagons[0]?.id || '' })); }} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">Create Trip ➔</button></td>
                    </tr>
                  ))}
              </TableWrap>
            </Section>
          )}

          {view === 'trips' && (
            <Section title="Trips Created (Wagon Loading)" subtitle="Click a trip to manage loading times for each wagon">
              <TableWrap
                headers={['Trip ID', 'Cargo Officer', 'Company', 'Route', 'Wagons Loaded', 'Action']}
                mobileCard={(t: any) => (
                  <div className="space-y-2 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                      <span className="font-mono font-bold text-[#62BC37] text-xs">{(t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length} / 23 Loaded</span>
                    </div>
                    <p className="font-bold text-slate-900">{t.company}</p>
                    <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                    <p className="text-xs font-bold text-[#0E4B88] pt-1">Open Wagon Loading ➔</p>
                  </div>
                )}
                data={myTrips}
              >
                {myTrips.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No trips loading.</td></tr>
                  : myTrips.map(t => {
                    const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                        <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                        <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                        <td className="p-4 text-slate-700">{t.company}</td>
                        <td className="p-4 text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                        <td className="p-4 font-mono font-bold text-[#62BC37]">{loaded} / 23</td>
                        <td className="p-4 font-bold text-[#0E4B88]">Open Wagon Loading ➔</td>
                      </tr>
                    );
                  })}
              </TableWrap>
            </Section>
          )}

          {view === 'in_transit' && (
            <Section title="Trips on the Move (Live GPS Corridor Stream)" subtitle="Dispatched trips currently in corridor transit from your station">
              <TableWrap
                headers={['Trip ID', 'Company', 'Locomotive', 'Route', 'Status']}
                mobileCard={(t: any) => (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                      <Badge text={t.status} color="green" />
                    </div>
                    <p className="font-bold text-slate-900">{t.company}</p>
                    <p className="text-xs font-mono text-slate-700">{t.locomotiveId}</p>
                    <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                  </div>
                )}
                data={myInTransit}
              >
                {myInTransit.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No trips currently in transit.</td></tr>
                  : myInTransit.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                      <td className="p-4 font-bold text-slate-900">{t.company}</td>
                      <td className="p-4 font-mono text-slate-800">{t.locomotiveId}</td>
                      <td className="p-4 text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                      <td className="p-4"><Badge text={t.status} color="green" /></td>
                    </tr>
                  ))}
              </TableWrap>
            </Section>
          )}

          {view === 'incoming_unload' && (
            <Section title="Incoming Consignments (Unloading Station)" subtitle={`Trips arriving at ${sName(station)} — click Unload Consignment`}>
              <TableWrap
                headers={['Trip ID', 'Origin Station', 'Company & Cargo', 'Total Wagons', 'Status', 'Action']}
                mobileCard={(t: any) => {
                  const totalWagons = (t.wagonLogs || []).length;
                  const unloadedCount = (t.wagonLogs || []).filter((w: any) => w.unloadStatus === 'UNLOADED').length;
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                        <Badge text={t.status} color={t.status === 'UNLOADING' ? 'purple' : 'blue'} />
                      </div>
                      <p className="font-bold text-slate-900">{t.company} — {t.cargoType}</p>
                      <p className="text-xs text-slate-600">Origin: {sName(t.origin)} | Unloaded: {unloadedCount} / {totalWagons || 23}</p>
                      <button onClick={() => setSelectedUnloadTripId(t.id)} className="w-full bg-purple-600 text-white font-bold text-xs py-2 rounded-xl mt-1 shadow-sm">Unload Consignment ➔</button>
                    </div>
                  );
                }}
                data={myIncomingUnload}
              >
                {myIncomingUnload.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No incoming freight.</td></tr>
                  : myIncomingUnload.map(t => {
                    const totalWagons = (t.wagonLogs || []).length;
                    const unloadedCount = (t.wagonLogs || []).filter((w: any) => w.unloadStatus === 'UNLOADED').length;
                    return (
                      <tr key={t.id} className="hover:bg-purple-50/50">
                        <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                        <td className="p-4 font-bold text-slate-900">{sName(t.origin)}</td>
                        <td className="p-4 text-slate-700">{t.company} — {t.cargoType}</td>
                        <td className="p-4 font-mono font-bold text-slate-900">{unloadedCount} / {totalWagons || 23} Unloaded</td>
                        <td className="p-4"><Badge text={t.status} color={t.status === 'UNLOADING' ? 'purple' : 'blue'} /></td>
                        <td className="p-4"><button onClick={() => setSelectedUnloadTripId(t.id)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">Unload Consignment ➔</button></td>
                      </tr>
                    );
                  })}
              </TableWrap>
            </Section>
          )}

          {view === 'wagons' && (
            <Section title="Wagon Fleet Inventory (46+ Registered)" subtitle="Real-time availability lock — wagons in use locked system-wide" action={<button onClick={() => setAddWagonModal(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Register New Wagon</button>}>
              <TableWrap
                headers={['Wagon ID', 'Capacity (Bags)', 'Live Status', 'Current Station', 'Added By', 'Date']}
                mobileCard={(w: any) => {
                  const isOccupied = occupiedWagonIds.has(w.id);
                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-slate-900 text-sm">{w.id}</span>
                        <Badge text={isOccupied ? 'LOCKED (IN USE)' : 'AVAILABLE'} color={isOccupied ? 'amber' : 'green'} />
                      </div>
                      <p className="text-xs text-slate-600">Capacity: {w.capacity || 70} Bags | Station: {sName(w.currentStation || station)}</p>
                    </div>
                  );
                }}
                data={wagons}
              >
                {wagons.map(w => {
                  const isOccupied = occupiedWagonIds.has(w.id);
                  return (
                    <tr key={w.id} className="hover:bg-slate-50 text-xs">
                      <td className="p-4 font-mono font-black text-slate-900 text-sm">{w.id}</td>
                      <td className="p-4 font-mono font-bold text-slate-700">{w.capacity || 70} Bags</td>
                      <td className="p-4"><Badge text={isOccupied ? 'IN_ACTIVE_USE (LOCKED)' : 'AVAILABLE'} color={isOccupied ? 'amber' : 'green'} /></td>
                      <td className="p-4 font-semibold text-slate-800">{sName(w.currentStation || station)}</td>
                      <td className="p-4 text-slate-600">{w.addedBy || 'System'}</td>
                      <td className="p-4 font-mono text-slate-400">{w.createdAt || '—'}</td>
                    </tr>
                  );
                })}
              </TableWrap>
            </Section>
          )}

          {view === 'funds' && (
            <Section title="Request Funds" subtitle="Click any request row to view details, progression, and Q&A conversation" action={<button onClick={() => setFundsModal(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Request Funds</button>}>
              <TableWrap
                headers={['Req ID', 'Title & Category', 'Amount (₦)', 'Current Stage', 'Action']}
                mobileCard={(r: any) => (
                  <div className="space-y-2 cursor-pointer" onClick={() => setSelectedReq(r)}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-[#0E4B88]">{r.id}</span>
                      <Badge text={r.stage} color={stageColor(r.stage)} />
                    </div>
                    <p className="font-bold text-slate-900">{r.title}</p>
                    <p className="text-xs font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</p>
                    <p className="text-xs font-bold text-[#0E4B88] pt-1">Inspect Details & Q&A ➔</p>
                  </div>
                )}
                data={requests.filter(r => r.station === station)}
              >
                {requests.filter(r => r.station === station).length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400 text-xs">No fund requests yet.</td></tr>
                  : requests.filter(r => r.station === station).map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReq(r)}>
                      <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
                      <td className="p-4"><p className="font-bold text-slate-900">{r.title}</p><p className="text-[10px] text-slate-500">{r.category}</p></td>
                      <td className="p-4 font-mono font-black text-slate-900">₦{Number(r.amount).toLocaleString()}</td>
                      <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                      <td className="p-4 font-bold text-[#0E4B88]">Inspect Details & Q&A ➔</td>
                    </tr>
                  ))}
              </TableWrap>
            </Section>
          )}
        </>
      )}

      {selectedReq && <FundRequestDetailModal req={selectedReq} user={user} onClose={() => setSelectedReq(null)} onSaveRequests={saveRequests} allRequests={requests} />}
      {addWagonModal && (
        <Modal onClose={() => setAddWagonModal(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Register New Wagon</h3>
            <form onSubmit={handleRegisterWagon} className="space-y-4">
              <div><label className={lc}>Wagon ID *</label><input required value={newWagonId} onChange={e => setNewWagonId(e.target.value)} placeholder="e.g. WG047" className={`${ic} uppercase font-mono`} /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setAddWagonModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button><button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">Register Wagon ➔</button></div>
            </form>
          </div>
        </Modal>
      )}
      {createDeal && (
        <Modal onClose={() => setCreateDeal(null)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Trip Creation Form</h3>
            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div><label className={lc}>Locomotive ID *</label><input required value={tripForm.locomotiveId} onChange={e => setTripForm({ ...tripForm, locomotiveId: e.target.value })} placeholder="e.g. L2205 (General Electric)" className={ic} /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreateDeal(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button><button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">Begin Wagon Loading ➔</button></div>
            </form>
          </div>
        </Modal>
      )}
      {fundsModal && (
        <Modal onClose={() => setFundsModal(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Request Funds for Station</h3>
            <form onSubmit={handleFundRequest} className="space-y-4">
              <div><label className={lc}>Purpose / Title *</label><input required value={fundForm.title} onChange={e => setFundForm({ ...fundForm, title: e.target.value })} placeholder="e.g. Loading Bay Crane Slings" className={ic} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Amount (₦) *</label><input required type="number" value={fundForm.amount} onChange={e => setFundForm({ ...fundForm, amount: e.target.value })} className={`${ic} font-mono`} placeholder="85000" /></div>
                <div><label className={lc}>Category</label><select value={fundForm.category} onChange={e => setFundForm({ ...fundForm, category: e.target.value })} className={ic}>{['Equipment', 'Fuel', 'Repairs', 'Maintenance', 'Emergency Purchase', 'Operational Expenses', 'Other'].map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label className={lc}>Description *</label><textarea required rows={3} value={fundForm.description} onChange={e => setFundForm({ ...fundForm, description: e.target.value })} className={`${ic} resize-none`} placeholder="Full justification..." /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setFundsModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button><button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">Submit Request ➔</button></div>
            </form>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

/* ─────────────────────────────────────────────────────────
   WAGON LOADING VIEW (at Origin Loading Station)
───────────────────────────────────────────────────────── */
function TripWagonView({ tripId, trips, wagons, onBack, onSaveTrips }: any) {
  const trip = trips.find((t: any) => t.id === tripId);
  const [logs, setLogs] = useState<any[]>(trip?.wagonLogs || []);
  const [adding, setAdding] = useState(false);
  const [selWagon, setSelWagon] = useState('');
  const [qty, setQty] = useState('70');

  if (!trip) return <div className="p-8 text-center text-xs text-slate-400">Trip not found. <button onClick={onBack} className="underline text-[#62BC37]">Go back</button></div>;

  const loaded = logs.filter((w: any) => w.status === 'LOADED').length;
  const allDone = loaded >= 23;
  const active  = logs.find((w: any) => w.status === 'LOADING');

  const occupiedWagonIds = getOccupiedWagonIds(trips);
  const usedInThisTrip   = new Set(logs.map((w: any) => w.wagonId));
  const available        = (wagons || SEED_WAGONS).filter((w: any) => !occupiedWagonIds.has(w.id) && !usedInThisTrip.has(w.id));
  const pct = Math.min(100, Math.round((loaded / 23) * 100));

  const commitLogs = (updated: any[]) => {
    setLogs(updated);
    onSaveTrips(trips.map((t: any) => t.id === trip.id ? { ...t, wagonLogs: updated } : t));
  };

  const startLoading = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = selWagon || available[0]?.id || 'WG001';
    const now = new Date();
    const log = { id: `wl_${Date.now()}`, wagonId: wId, startTimestamp: Date.now(),
      startDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      endDate: null, endTime: null, durationStr: null, qty, status: 'LOADED', unloadStatus: 'PENDING_UNLOAD' };
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

  const dispatchAndActivateGps = async () => {
    const now = new Date();
    const startLat = 6.8974;
    const startLng = 3.2141;

    try {
      await fetch(`/api/tracking/gps/${encodeURIComponent(trip.locomotiveId || 'L2205')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: startLat,
          lng: startLng,
          speed: 74,
          heading: 45,
          signalQuality: 'GPS_SATELLITE_LIVE',
        }),
      });
    } catch (e) {
      console.log('GPS Hardware API Ingestion Triggered:', e);
    }

    const updatedTrips = trips.map((t: any) =>
      t.id === trip.id
        ? {
            ...t,
            status: 'IN_TRANSIT',
            gpsActive: true,
            gpsStartedAt: now.toISOString(),
            lastGpsPing: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            currentSpeed: 74,
            currentCoords: { lat: startLat, lng: startLng },
            signalStatus: 'GPS Satellite Live',
            wagonLogs: logs,
          }
        : t
    );

    onSaveTrips(updatedTrips);
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button onClick={onBack} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl">← Back to Trips Created</button>
        <span className="text-xs font-bold text-[#62BC37] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">{loaded} / 23 Loaded</span>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#62BC37]">TRIP {trip.tripId} — ORIGIN LOADING DETAILS</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[['Locomotive ID', trip.locomotiveId], ['Cargo Officer', trip.cargoOfficerName], ['Loading Station', trip.origin ? sName(trip.origin) : ''], ['Destination', trip.destination ? sName(trip.destination) : ''], ['Company', trip.company], ['Cargo Type', trip.cargoType], ['Quantity', `${trip.quantity} Bags`], ['Created', trip.createdAt || '—']].map(([l, v]) => (
            <div key={l}><span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span><span className="font-bold text-slate-900">{v}</span></div>
          ))}
        </div>
      </div>

      <div className="bg-[#62BC37] text-white rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
              <p className="text-xs font-black uppercase tracking-wider font-mono">GPS HARDWARE TELEMETRY BACKEND — READY</p>
            </div>
            <p className="text-base font-black text-white mt-1">Locomotive: <span className="font-mono text-white/90">{trip.locomotiveId}</span></p>
            <p className="text-xs text-white/80 mt-0.5">Clicking 'Start Trip & Activate GPS' connects directly to GPS hardware backend & launches corridor satellite tracking.</p>
          </div>
          <button onClick={dispatchAndActivateGps} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
            <span>Start Trip & Activate Live GPS Tracker ➔</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Loading Progress</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[['Required', '23', 'text-slate-900'], ['Loaded', String(loaded), 'text-[#62BC37]'], ['Remaining', String(23 - loaded), 'text-amber-600'], ['Progress', `${pct}%`, 'text-[#0E4B88]']].map(([l, v, c]) => (
            <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span>
              <span className={`text-xl font-black font-mono ${c}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-[#0E4B88] to-[#62BC37] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Loading</h3>
          {!active && !allDone && !adding && (
            <button onClick={() => setAdding(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Add Wagon to Load</button>
          )}
        </div>

        {adding && (
          <form onSubmit={startLoading} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className={lc}>Select Available Wagon ({available.length} Available)</label>
                <select value={selWagon} onChange={e => setSelWagon(e.target.value)} className={ic}>
                  {available.length === 0 ? <option value="">No available wagons right now</option> : available.map((w: any) => <option key={w.id} value={w.id}>{w.id} (Available)</option>)}
                </select>
              </div>
              <div><label className={lc}>Quantity (Bags)</label><input type="number" value={qty} onChange={e => setQty(e.target.value)} className={ic} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={available.length === 0} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2 rounded-xl disabled:opacity-50 shadow-sm">Begin Loading ➔</button>
            </div>
          </form>
        )}

        {active && (
          <div className="bg-emerald-50 border-2 border-[#62BC37] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold text-[#62BC37] uppercase">Currently Loading</p>
              <p className="text-xl font-mono font-black text-slate-900">{active.wagonId}</p>
              <p className="text-xs text-slate-600 mt-0.5">Started: {active.startDate} at {active.startTime}</p>
            </div>
            <div className="flex items-center gap-5">
              <div><span className={lc}>Live Timer</span><LiveTimer ts={active.startTimestamp} /></div>
              <button onClick={() => stopLoading(active.id)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">Stop Loading ✓</button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {logs.map((w: any, i: number) => (
            <div key={w.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div><span className="text-[10px] font-mono text-slate-400 mr-2">#{i + 1}</span><span className="font-mono font-black text-slate-900">{w.wagonId}</span></div>
              <div className="flex gap-3 font-mono text-slate-600">
                <span>Start: {w.startTime}</span>
                <span>End: {w.endTime || '—'}</span>
                <span className="font-bold text-slate-800">Duration: {w.durationStr || 'Running...'}</span>
              </div>
              <Badge text={w.status} color={w.status === 'LOADED' ? 'green' : 'blue'} />
            </div>
          ))}
        </div>

        {!active && !allDone && loaded > 0 && !adding && (
          <button onClick={() => setAdding(true)} className="w-full bg-[#0E4B88] hover:bg-[#0B3C70] text-white font-bold text-xs py-3 rounded-xl shadow-sm">+ Add Another Wagon ({loaded + 1} / 23)</button>
        )}

        {allDone && (
          <div className="bg-emerald-800 text-white rounded-2xl p-5 space-y-3">
            <p className="text-sm font-bold text-emerald-100">All 23 Wagons Loaded — Train is Ready to Move!</p>
            <button onClick={dispatchAndActivateGps} className="w-full bg-white text-slate-900 font-black text-sm py-3.5 rounded-xl shadow-md hover:bg-slate-100">
              Start Trip & Activate Live GPS Tracker ➔
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   WAGON UNLOADING VIEW (at Destination Unloading Station)
───────────────────────────────────────────────────────── */
function TripUnloadWagonView({ tripId, trips, user, onBack, onSaveTrips }: any) {
  const trip = trips.find((t: any) => t.id === tripId);
  const [logs, setLogs] = useState<any[]>(trip?.wagonLogs || []);

  if (!trip) return <div className="p-8 text-center text-xs text-slate-400">Trip not found. <button onClick={onBack} className="underline text-[#62BC37]">Go back</button></div>;

  const total = logs.length || 23;
  const unloaded = logs.filter((w: any) => w.unloadStatus === 'UNLOADED').length;
  const allUnloaded = unloaded >= total && total > 0;
  const activeUnload = logs.find((w: any) => w.unloadStatus === 'UNLOADING');
  const pct = Math.min(100, Math.round((unloaded / total) * 100));

  const commitLogs = (updated: any[], statusOverride?: string) => {
    setLogs(updated);
    onSaveTrips(trips.map((t: any) => t.id === trip.id ? { ...t, status: statusOverride || (allUnloaded ? 'ARRIVED' : 'UNLOADING'), wagonLogs: updated } : t));
  };

  const startUnloading = (wagonId: string) => {
    const now = new Date();
    const updated = logs.map((w: any) => {
      if (w.wagonId !== wagonId) return w;
      return {
        ...w,
        unloadStartTimestamp: Date.now(),
        unloadStartDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        unloadStartTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        unloadStatus: 'UNLOADING',
      };
    });
    commitLogs(updated, 'UNLOADING');
  };

  const stopUnloading = (wagonId: string) => {
    const now = new Date();
    const updated = logs.map((w: any) => {
      if (w.wagonId !== wagonId) return w;
      const mins = Math.round((Date.now() - (w.unloadStartTimestamp || Date.now())) / 60000);
      return {
        ...w,
        unloadEndDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        unloadEndTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unloadDurationStr: `${mins || 1} Minutes`,
        unloadStatus: 'UNLOADED',
      };
    });
    commitLogs(updated);
  };

  const completeTrip = () => {
    onSaveTrips(trips.map((t: any) => t.id === trip.id ? { ...t, status: 'ARRIVED', wagonLogs: logs } : t));
    onBack();
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button onClick={onBack} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl">← Back to Incoming Consignments</button>
        <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">{unloaded} / {total} Unloaded</span>
      </div>

      <div className="bg-white text-slate-900 rounded-2xl p-5 border border-slate-200 shadow-xs">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700 mb-3">TRIP {trip.tripId} — DESTINATION UNLOADING DETAILS</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[['Locomotive ID', trip.locomotiveId], ['Origin Loading Station', trip.origin ? sName(trip.origin) : ''], ['Destination Station', trip.destination ? sName(trip.destination) : ''], ['Unloading Officer', user.fullName], ['Company', trip.company], ['Cargo Type', trip.cargoType], ['Quantity', `${trip.quantity} Bags`], ['Status', trip.status]].map(([l, v]) => (
            <div key={l}><span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span><span className="font-bold text-slate-900">{v}</span></div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Unloading Progress</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[['Total Wagons', String(total), 'text-slate-900'], ['Unloaded', String(unloaded), 'text-[#62BC37]'], ['Pending Unload', String(total - unloaded), 'text-amber-600'], ['Progress', `${pct}%`, 'text-purple-600']].map(([l, v, c]) => (
            <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span>
              <span className={`text-xl font-black font-mono ${c}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-[#62BC37] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {activeUnload && (
        <div className="bg-purple-50 border-2 border-purple-400 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-purple-800 uppercase">Currently Unloading Wagon</p>
            <p className="text-xl font-mono font-black text-slate-900">{activeUnload.wagonId}</p>
            <p className="text-xs text-slate-600 mt-0.5">Started: {activeUnload.unloadStartDate} at {activeUnload.unloadStartTime}</p>
          </div>
          <div className="flex items-center gap-5">
            <div><span className={lc}>Unloading Live Timer</span><LiveTimer ts={activeUnload.unloadStartTimestamp} /></div>
            <button onClick={() => stopUnloading(activeUnload.wagonId)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">Stop Unloading ✓</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Consignment Wagons (Loaded at Origin)</h3>
            <p className="text-xs text-slate-500">Unload each wagon arriving from {sName(trip.origin)}.</p>
          </div>
        </div>

        <div className="space-y-3">
          {logs.map((w: any, i: number) => {
            const isUnloading = w.unloadStatus === 'UNLOADING';
            const isUnloaded  = w.unloadStatus === 'UNLOADED';
            return (
              <div key={w.id || i} className={`border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${isUnloaded ? 'bg-emerald-50/50 border-emerald-200' : isUnloading ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200'}`}>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 mr-2">Wagon #{i + 1}</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Loaded Bags: <b className="text-slate-800">{w.qty || 70}</b> | Origin Duration: {w.durationStr || '—'}</p>
                </div>
                <div className="font-mono text-slate-600 text-right">
                  {isUnloaded ? <div><p className="text-emerald-700 font-bold">Unloaded in {w.unloadDurationStr || '—'}</p><p className="text-[10px] text-slate-400">{w.unloadStartTime} ➔ {w.unloadEndTime}</p></div> : isUnloading ? <p className="text-purple-700 font-bold animate-pulse">Unloading in progress...</p> : <p className="text-slate-400">Ready to unload</p>}
                </div>
                <div>
                  {isUnloaded ? <Badge text="UNLOADED ✓" color="green" /> : isUnloading ? <button onClick={() => stopUnloading(w.wagonId)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl">Stop Unload ✓</button> : !activeUnload ? <button onClick={() => startUnloading(w.wagonId)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">Start Unload ➔</button> : <span className="text-[10px] text-slate-400">Waiting for active wagon</span>}
                </div>
              </div>
            );
          })}
        </div>

        {allUnloaded && (
          <div className="bg-[#62BC37] text-white rounded-2xl p-5 space-y-3 mt-4 shadow-md">
            <p className="text-sm font-bold text-white">All Wagons Successfully Unloaded at {sName(trip.destination)}!</p>
            <button onClick={completeTrip} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm py-3.5 rounded-xl">
              Complete Consignment & Mark Arrived ✓
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
  const [view, setView] = useState<'deals' | 'trips' | 'wagons' | 'requests'>('deals');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deals, setDeals]       = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [wagons, setWagons]     = useState<any[]>([]);

  const [createDealModal, setCreateDealModal] = useState(false);
  const [addWagonModal, setAddWagonModal]     = useState(false);
  const [selectedReq, setSelectedReq]         = useState<any | null>(null);

  const [newWagonId, setNewWagonId] = useState('');
  const [newWagonStation, setNewWagonStation] = useState('EWK');
  const [dealForm, setDealForm] = useState({ company: '', loadingStation: 'EWK', destination: 'MNY', cargoType: '', quantity: '' });

  useEffect(() => {
    setDeals(tryParse('bueno_deals', SEED_DEALS));
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
    setWagons(tryParse('bueno_wagons', SEED_WAGONS));
  }, []);

  const persist = (key: string, val: any[]) => localStorage.setItem(key, JSON.stringify(val));
  const saveDeals    = (v: any[]) => { setDeals(v); persist('bueno_deals', v); };
  const saveRequests = (v: any[]) => { setRequests(v); persist('bueno_requests', v); };
  const saveWagons   = (v: any[]) => { setWagons(v); persist('bueno_wagons', v); };

  const occupiedWagonIds = getOccupiedWagonIds(trips);

  const handleRegisterWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = newWagonId.trim().toUpperCase() || `WG${String(wagons.length + 1).padStart(3, '0')}`;
    if (wagons.some(w => w.id === wId)) { alert(`Wagon ${wId} is already registered!`); return; }
    saveWagons([...wagons, { id: wId, capacity: 70, status: 'AVAILABLE', currentStation: newWagonStation, addedBy: user.fullName, createdAt: new Date().toLocaleDateString('en-GB') }]);
    setNewWagonId(''); setAddWagonModal(false);
  };

  const handleCreateDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const num = String(deals.length + 1).padStart(3, '0');
    saveDeals([{ id: `DEAL-${num}`, dealNumber: num, ...dealForm, quantity: dealForm.quantity, createdAt: new Date().toLocaleString(), createdBy: user.fullName }, ...deals]);
    setCreateDealModal(false); setDealForm({ company: '', loadingStation: 'EWK', destination: 'MNY', cargoType: '', quantity: '' });
  };

  const navItems = [
    { key: 'deals',    label: 'Manage Deals' },
    { key: 'trips',    label: 'All Active Trips & GPS' },
    { key: 'wagons',   label: `Wagon Fleet Inventory (${wagons.length})` },
    { key: 'requests', label: 'Fund Requests (Review & Approve)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Admin Officer' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'deals' && (
        <Section title="Manage Deals" subtitle="Create deals and assign them to terminal stations" action={<button onClick={() => setCreateDealModal(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Create New Deal</button>}>
          <TableWrap
            headers={['Deal ID', 'Company', 'Loading Station', 'Destination', 'Cargo & Qty', 'Created']}
            mobileCard={(d: any) => (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{d.dealNumber}</span>
                  <span className="text-xs text-slate-500 font-mono">{d.createdAt}</span>
                </div>
                <p className="font-bold text-slate-900">{d.company}</p>
                <p className="text-xs text-slate-600">{sName(d.loadingStation)} ➔ {sName(d.destination)}</p>
                <p className="text-xs text-slate-500">{d.cargoType} ({d.quantity} Bags)</p>
              </div>
            )}
            data={deals}
          >
            {deals.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No deals created yet.</td></tr>
              : deals.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{d.dealNumber}</td>
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
        <Section title="All Active Trips (Corridor GPS Satellite Map)" subtitle="High-precision interactive map of all active rail corridor trips">
          <div className="space-y-6">
            <RailCorridorGpsMap trip={trips[0] || SEED_TRIPS[0]} />
            <TableWrap
              headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons', 'Status']}
              mobileCard={(t: any) => (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                    <Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} />
                  </div>
                  <p className="font-bold text-slate-900">{t.company}</p>
                  <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                  <p className="text-xs text-slate-500">Officer: {t.cargoOfficerName} | {(t.wagonLogs || []).length} Wagons</p>
                </div>
              )}
              data={trips}
            >
              {trips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                  <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                  <td className="p-4 text-slate-700">{t.company}</td>
                  <td className="p-4 text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                  <td className="p-4 font-mono font-bold">{(t.wagonLogs || []).length} Wagons</td>
                  <td className="p-4"><Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} /></td>
                </tr>
              ))}
            </TableWrap>
          </div>
        </Section>
      )}

      {view === 'wagons' && (
        <Section title="Wagon Fleet Inventory (Admin Control)" subtitle="System-wide inventory of all wagons" action={<button onClick={() => setAddWagonModal(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Register New Wagon</button>}>
          <TableWrap
            headers={['Wagon ID', 'Capacity', 'Status', 'Current Station', 'Registered By', 'Date']}
            mobileCard={(w: any) => {
              const isOccupied = occupiedWagonIds.has(w.id);
              return (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-slate-900 text-sm">{w.id}</span>
                    <Badge text={isOccupied ? 'LOCKED (IN USE)' : 'AVAILABLE'} color={isOccupied ? 'amber' : 'green'} />
                  </div>
                  <p className="text-xs text-slate-600">Capacity: {w.capacity || 70} Bags | Station: {sName(w.currentStation || 'EWK')}</p>
                </div>
              );
            }}
            data={wagons}
          >
            {wagons.map(w => (
              <tr key={w.id} className="hover:bg-slate-50 text-xs">
                <td className="p-4 font-mono font-black text-slate-900 text-sm">{w.id}</td>
                <td className="p-4 font-mono text-slate-700">{w.capacity || 70} Bags</td>
                <td className="p-4"><Badge text={occupiedWagonIds.has(w.id) ? 'IN_ACTIVE_USE (LOCKED)' : 'AVAILABLE'} color={occupiedWagonIds.has(w.id) ? 'amber' : 'green'} /></td>
                <td className="p-4 font-semibold text-slate-800">{sName(w.currentStation || 'EWK')}</td>
                <td className="p-4 text-slate-600">{w.addedBy || 'Admin'}</td>
                <td className="p-4 font-mono text-slate-400">{w.createdAt || '—'}</td>
              </tr>
            ))}
          </TableWrap>
        </Section>
      )}

      {view === 'requests' && (
        <Section title="Fund Requests — Admin Review" subtitle="Click any request to inspect & ask questions">
          <TableWrap
            headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Action']}
            mobileCard={(r: any) => (
              <div className="space-y-2 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{r.id}</span>
                  <Badge text={r.stage} color={stageColor(r.stage)} />
                </div>
                <p className="font-bold text-slate-900">{r.title}</p>
                <p className="text-xs font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</p>
                <p className="text-xs font-bold text-[#62BC37] pt-1">Inspect & Q&A / Approve ➔</p>
              </div>
            )}
            data={requests}
          >
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
                <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                <td className="p-4 font-bold text-slate-900">{r.title}</td>
                <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                <td className="p-4 font-bold text-[#62BC37]">Inspect & Q&A / Approve ➔</td>
              </tr>
            ))}
          </TableWrap>
        </Section>
      )}

      {selectedReq && <FundRequestDetailModal req={selectedReq} user={user} onClose={() => setSelectedReq(null)} onSaveRequests={saveRequests} allRequests={requests} />}
      {addWagonModal && (
        <Modal onClose={() => setAddWagonModal(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Register New Wagon (Admin)</h3>
            <form onSubmit={handleRegisterWagon} className="space-y-4">
              <div><label className={lc}>Wagon ID *</label><input required value={newWagonId} onChange={e => setNewWagonId(e.target.value)} placeholder="e.g. WG047" className={`${ic} uppercase font-mono`} /></div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setAddWagonModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button><button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">Add Wagon ➔</button></div>
            </form>
          </div>
        </Modal>
      )}
      {createDealModal && (
        <Modal onClose={() => setCreateDealModal(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Create New Deal</h3>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div><label className={lc}>Company Name *</label><input required value={dealForm.company} onChange={e => setDealForm({ ...dealForm, company: e.target.value })} placeholder="e.g. Lafarge Africa Plc" className={ic} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Loading Station</label><select value={dealForm.loadingStation} onChange={e => setDealForm({ ...dealForm, loadingStation: e.target.value })} className={ic}>{Object.entries(STATIONS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div>
                <div><label className={lc}>Destination</label><select value={dealForm.destination} onChange={e => setDealForm({ ...dealForm, destination: e.target.value })} className={ic}>{Object.entries(STATIONS).map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></div>
                <div><label className={lc}>Cargo Type *</label><input required value={dealForm.cargoType} onChange={e => setDealForm({ ...dealForm, cargoType: e.target.value })} placeholder="e.g. Elephant Cement" className={ic} /></div>
                <div><label className={lc}>Quantity (Bags)</label><input type="number" value={dealForm.quantity} onChange={e => setDealForm({ ...dealForm, quantity: e.target.value })} className={ic} /></div>
              </div>
              <div className="flex justify-end gap-3"><button type="button" onClick={() => setCreateDealModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button><button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">Create Deal ➔</button></div>
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
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  useEffect(() => {
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
  }, []);

  const saveRequests = (v: any[]) => { setRequests(v); localStorage.setItem('bueno_requests', JSON.stringify(v)); };

  const navItems = [
    { key: 'trips',    label: 'Corridor Live GPS Command Map' },
    { key: 'requests', label: 'Fund Requests (Ops Review)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Head of Operations' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'trips' && (
        <div className="space-y-6">
          <Section title="Network Operations Command — Corridor Live GPS Map" subtitle="High-precision interactive train telemetry map across all Nigerian rail corridors">
            <RailCorridorGpsMap trip={trips[0] || SEED_TRIPS[0]} />
            <TableWrap
              headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons Loaded', 'Status']}
              mobileCard={(t: any) => (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                    <Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} />
                  </div>
                  <p className="font-bold text-slate-900">{t.company}</p>
                  <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                </div>
              )}
              data={trips}
            >
              {trips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                  <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                  <td className="p-4 text-slate-700">{t.company}</td>
                  <td className="p-4 text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                  <td className="p-4 font-mono font-bold">{(t.wagonLogs || []).length} / 23</td>
                  <td className="p-4"><Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} /></td>
                </tr>
              ))}
            </TableWrap>
          </Section>
        </div>
      )}

      {view === 'requests' && (
        <Section title="Fund Requests — Operations Approval" subtitle="Click any request to view details, ask questions, or approve to MD/CEO">
          <TableWrap
            headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Action']}
            mobileCard={(r: any) => (
              <div className="space-y-2 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{r.id}</span>
                  <Badge text={r.stage} color={stageColor(r.stage)} />
                </div>
                <p className="font-bold text-slate-900">{r.title}</p>
                <p className="text-xs font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</p>
                <p className="text-xs font-bold text-[#62BC37] pt-1">Inspect & Q&A / Approve ➔</p>
              </div>
            )}
            data={requests}
          >
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
                <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                <td className="p-4 font-bold text-slate-900">{r.title}</td>
                <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                <td className="p-4 font-bold text-[#62BC37]">Inspect & Q&A / Approve ➔</td>
              </tr>
            ))}
          </TableWrap>
        </Section>
      )}

      {selectedReq && <FundRequestDetailModal req={selectedReq} user={user} onClose={() => setSelectedReq(null)} onSaveRequests={saveRequests} allRequests={requests} />}
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
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  useEffect(() => {
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
  }, []);

  const saveRequests = (v: any[]) => { setRequests(v); localStorage.setItem('bueno_requests', JSON.stringify(v)); };

  const navItems = [
    { key: 'trips',    label: 'Executive Corridor GPS Map' },
    { key: 'requests', label: 'Fund Requests (CEO Clearance)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Managing Director / CEO' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'trips' && (
        <div className="space-y-6">
          <Section title="Executive Overview — Corridor GPS Live Satellite Telemetry" subtitle="High-precision interactive train movement map across all Nigerian rail corridors">
            <RailCorridorGpsMap trip={trips[0] || SEED_TRIPS[0]} />
            <TableWrap
              headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons Loaded', 'Status']}
              mobileCard={(t: any) => (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                    <Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} />
                  </div>
                  <p className="font-bold text-slate-900">{t.company}</p>
                  <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                </div>
              )}
              data={trips}
            >
              {trips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                  <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                  <td className="p-4 text-slate-700">{t.company}</td>
                  <td className="p-4 text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                  <td className="p-4 font-mono font-bold">{(t.wagonLogs || []).length} / 23</td>
                  <td className="p-4"><Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} /></td>
                </tr>
              ))}
            </TableWrap>
          </Section>
        </div>
      )}

      {view === 'requests' && (
        <Section title="Fund Requests — CEO Executive Clearance" subtitle="Click any request to inspect details, ask questions, or clear for payment">
          <TableWrap
            headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Action']}
            mobileCard={(r: any) => (
              <div className="space-y-2 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{r.id}</span>
                  <Badge text={r.stage} color={stageColor(r.stage)} />
                </div>
                <p className="font-bold text-slate-900">{r.title}</p>
                <p className="text-xs font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</p>
                <p className="text-xs font-bold text-[#62BC37] pt-1">Inspect & Q&A / Clear ➔</p>
              </div>
            )}
            data={requests}
          >
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
                <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                <td className="p-4 font-bold text-slate-900">{r.title}</td>
                <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                <td className="p-4 font-bold text-[#62BC37]">Inspect & Q&A / Clear ➔</td>
              </tr>
            ))}
          </TableWrap>
        </Section>
      )}

      {selectedReq && <FundRequestDetailModal req={selectedReq} user={user} onClose={() => setSelectedReq(null)} onSaveRequests={saveRequests} allRequests={requests} />}
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
  const [selectedReq, setSelectedReq] = useState<any | null>(null);

  useEffect(() => {
    setRequests(tryParse('bueno_requests', SEED_REQUESTS));
    setRecords(tryParse('bueno_finance_records', []));
  }, []);

  const saveRequests = (v: any[]) => { setRequests(v); localStorage.setItem('bueno_requests', JSON.stringify(v)); };

  const navItems = [
    { key: 'requests', label: 'Approved Requests (Review & Disburse)' },
    { key: 'records',  label: 'Financial Transaction Records' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Head of Finance / Accountant' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {view === 'requests' && (
        <Section title="Approved Requests — Disburse Payment" subtitle="Click any request to view full details, ask questions, or disburse">
          <TableWrap
            headers={['Req ID', 'Officer / Station', 'Title', 'Amount (₦)', 'Stage', 'Payment Reference', 'Action']}
            mobileCard={(r: any) => (
              <div className="space-y-2 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{r.id}</span>
                  <Badge text={r.stage} color={stageColor(r.stage)} />
                </div>
                <p className="font-bold text-slate-900">{r.title}</p>
                <p className="text-xs font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</p>
                <p className="text-xs font-bold text-[#62BC37] pt-1">Inspect & Q&A / Disburse ➔</p>
              </div>
            )}
            data={requests}
          >
            {requests.map(r => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedReq(r)}>
                <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
                <td className="p-4"><p className="font-bold text-slate-900">{r.officerName}</p><p className="text-[10px] text-slate-500">{sName(r.station)}</p></td>
                <td className="p-4 font-bold text-slate-900">{r.title}</td>
                <td className="p-4 font-mono font-black">₦{Number(r.amount).toLocaleString()}</td>
                <td className="p-4"><Badge text={r.stage} color={stageColor(r.stage)} /></td>
                <td className="p-4 font-mono text-slate-600">{r.paymentDetails?.ref || '—'}</td>
                <td className="p-4 font-bold text-[#62BC37]">Inspect & Q&A / Disburse ➔</td>
              </tr>
            ))}
          </TableWrap>
        </Section>
      )}

      {view === 'records' && (
        <Section title="Financial Transaction Records" subtitle="Permanent ledger of all disbursed payments">
          <TableWrap
            headers={['Record ID', 'Request ID', 'Beneficiary / Station', 'Amount (₦)', 'Date', 'Reference', 'Accountant']}
            mobileCard={(r: any) => (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{r.id}</span>
                  <span className="font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</span>
                </div>
                <p className="font-bold text-slate-900">{r.beneficiary} ({sName(r.station)})</p>
                <p className="text-xs font-mono text-slate-600">Ref: {r.ref} | Date: {r.date}</p>
              </div>
            )}
            data={records}
          >
            {records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
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

      {selectedReq && <FundRequestDetailModal req={selectedReq} user={user} onClose={() => setSelectedReq(null)} onSaveRequests={saveRequests} allRequests={requests} />}
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

function TableWrap({ headers, children, mobileCard, data }: { headers: string[]; children: React.ReactNode; mobileCard?: (item: any) => React.ReactNode; data?: any[] }) {
  return (
    <div>
      {/* Mobile Card List View (Phones) */}
      {mobileCard && data && (
        <div className="sm:hidden space-y-3">
          {data.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">No records available.</div>
          ) : (
            data.map((item, idx) => (
              <div key={item.id || idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                {mobileCard(item)}
              </div>
            ))
          )}
        </div>
      )}

      {/* Responsive Table View (Tablets & Desktops, Scrollable on Small Screens) */}
      <div className={`${mobileCard && data ? 'hidden sm:block' : 'block'} bg-white rounded-2xl border border-slate-200 overflow-x-auto max-w-full shadow-sm`}>
        <table className="w-full text-xs min-w-[600px]">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>{headers.map(h => <th key={h} className="text-left p-3.5 text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT
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
    }
    setReady(true);
  }, [router]);

  const signOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    router.push('/auth/login');
  };

  if (!ready || !user) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center text-slate-900 space-y-3">
        <div className="w-10 h-10 border-3 border-[#62BC37] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading your workspace...</p>
      </div>
    </div>
  );

  const role = user.role;

  if (role === 'CARGO_OFFICER')      return <CargoOfficerPortal user={user} onSignOut={signOut} />;
  if (role === 'ADMIN')              return <AdminPortal         user={user} onSignOut={signOut} />;
  if (role === 'HEAD_OF_OPERATIONS') return <OpsPortal           user={user} onSignOut={signOut} />;
  if (role === 'CEO' || role === 'MD') return <CEOPortal          user={user} onSignOut={signOut} />;
  if (role === 'HEAD_OF_FINANCE')    return <AccountantPortal    user={user} onSignOut={signOut} />;
  if (role === 'CUSTOMER' || role === 'CONSIGNEE') return <CustomerPortal user={user} onSignOut={signOut} />;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-900 text-center">
      <div>
        <p className="font-bold text-rose-600 text-lg mb-2">Unknown Role: {role}</p>
        <p className="text-xs text-slate-500 mb-4">Your account role is not recognised. Please contact Admin.</p>
        <button onClick={signOut} className="bg-[#62BC37] text-white font-bold px-6 py-2.5 rounded-xl text-xs">Sign Out</button>
      </div>
    </div>
  );
}
