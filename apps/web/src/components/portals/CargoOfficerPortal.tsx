'use client';

import React, { useState, useEffect } from 'react';
import { StateEngine, SEED_WAGONS, OFFICIAL_PXG_CODES } from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';
import { MoniyaContainerView } from '@/components/MoniyaContainerView';
import { TerminalInformationView } from '@/components/TerminalInformationView';
import {
  Train,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  FileText,
  ShieldCheck,
  Play,
  Square,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  MapPin,
  Building2,
  Package,
  Search,
  DollarSign,
  MessageSquare,
  X,
  Radio,
  Compass,
  Layers,
  LogOut,
  Menu,
  Check,
  Send,
  UserCheck,
  Calendar
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   STATIONS & NOMENCLATURE
───────────────────────────────────────────────────────── */
const STATIONS: Record<string, string> = {
  EWK: 'Ewekoro Terminal',
  ITO: 'Itori Junction',
  MNY: 'Moniya Yard (Ibadan)',
  MONI: 'Moniya Yard (Ibadan)',
  ILR: 'Ilorin Freight Hub',
  APT: 'Apapa Maritime Port',
  APQ: 'Apapa Port',
  KAD: 'Kaduna Inland Dry Port',
  KAN: 'Kano Dala Port',
  PAPA: 'Papalanto Terminal',
};

const sName = (c: string) => STATIONS[c] || c || 'Station';

const WAGON_TYPES = [
  { code: 'PXG', name: 'PXG Covered Hopper (Cement / Bags)' },
  { code: 'GND', name: 'Open Top Gondola Wagon (Gypsum / Minerals)' },
  { code: 'BTM', name: 'Bottom Dumper Wagon (Limestone / Raw Ore)' },
  { code: 'FLT', name: 'Flatbed Container Wagon (20ft / 40ft TEU)' },
  { code: 'TNK', name: 'Tanker Wagon (Diesel / Liquid Fuel)' },
];

function getOccupiedWagonIds(trips: any[]): Set<string> {
  const occupied = new Set<string>();
  (trips || []).forEach((t: any) => {
    if (t.status === 'LOADING' || t.status === 'IN_TRANSIT' || t.status === 'UNLOADING') {
      (t.wagonLogs || []).forEach((w: any) => {
        if (w.wagonId && w.unloadStatus !== 'UNLOADED') {
          occupied.add(w.wagonId);
        }
      });
      if (t.wagonId1) occupied.add(t.wagonId1);
      if (t.wagonId2) occupied.add(t.wagonId2);
    }
  });
  return occupied;
}

const ic = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]';
const lc = 'block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1';

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color || 'amber';
  const cls: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cls[c] || cls.amber}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {text}
    </span>
  );
}

function stageColor(s: string) {
  if (s === 'Paid' || s === 'Approved' || s === 'DISBURSED') return 'green';
  if (s === 'Accountant' || s === 'Finance') return 'purple';
  if (s === 'CEO') return 'blue';
  if (s === 'Operations' || s === 'Admin') return 'amber';
  return 'slate';
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
        {children}
      </div>
    </div>
  );
}

function CustomAlertModal({
  isOpen,
  title,
  message,
  onClose,
}: {
  isOpen: boolean;
  title?: string;
  message: string | null;
  onClose: () => void;
}) {
  if (!isOpen || !message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 font-sans text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#62BC37] mx-auto flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {title || 'System Notification'}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
        >
          Acknowledge & Continue
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
            {title}
          </h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function TableWrap({
  headers,
  children,
  mobileCard,
  data = [],
}: {
  headers: string[];
  children: React.ReactNode;
  mobileCard?: (item: any, i: number) => React.ReactNode;
  data?: any[];
}) {
  return (
    <div className="space-y-3">
      {/* Desktop View */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-900 text-white">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="text-left p-4 text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      {mobileCard && data.length > 0 && (
        <div className="md:hidden space-y-3">
          {data.map((item, i) => (
            <div key={item.id || i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              {mobileCard(item, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   LIVE STOPWATCH TIMER COMPONENT (ticks seconds in real-time)
───────────────────────────────────────────────────────── */
export function LiveTimer({ ts }: { ts: number }) {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    const tick = () => setSec(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ts]);

  const hh = String(Math.floor(sec / 3600)).padStart(2, '0');
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  return (
    <span className="font-mono font-black text-emerald-600 text-base sm:text-lg tracking-wider flex items-center gap-1.5">
      <Clock className="w-4 h-4 animate-spin text-[#62BC37]" />
      {hh}:{mm}:{ss}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN CARGO OFFICER PORTAL COMPONENT
───────────────────────────────────────────────────────── */
export function CargoOfficerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<
    'deals' | 'trips' | 'in_transit' | 'incoming_unload' | 'moniya' | 'wagons' | 'funds' | 'terminal_info'
  >('deals');

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedUnloadTripId, setSelectedUnloadTripId] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  const [deals, setDeals] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [wagons, setWagons] = useState<any[]>([]);

  const [createDeal, setCreateDeal] = useState<any | null>(null);
  const [addWagonModal, setAddWagonModal] = useState(false);
  const [fundsModal, setFundsModal] = useState(false);

  const [newWagonId, setNewWagonId] = useState('');
  const [tripForm, setTripForm] = useState({
    locomotiveId: 'L2205',
    selectedWagon: '',
    loadingDate: '',
    qty: '27600',
    startTime: '',
    driverName: 'Engr. Kabiru Usman (NRC-DRV-102)',
    crewMembers: 'Sani Bello, Timothy Danjuma',
    monitoringOfficer: user?.fullName || 'Ade Bello',
  });

  const [fundForm, setFundForm] = useState({
    title: '',
    amount: '350000',
    category: 'Tarpaulin Covering & Lashing (₦350,000)',
    tripNo: 'TRIP-001',
    vesselNo: 'VSL-APMT-992',
    description: '',
  });

  const station = user?.assignedStation || 'EWK';

  // Sync state from StateEngine & remote cPanel backend
  const syncData = () => {
    const liveDeals = StateEngine.getDeals();
    const liveTrips = StateEngine.getTrips();
    const liveWagons = StateEngine.getWagons();
    const liveRequests = StateEngine.getRequests();

    setDeals(liveDeals);
    setTrips(liveTrips);
    setWagons(liveWagons.length > 0 ? liveWagons : SEED_WAGONS);
    setRequests(liveRequests);
  };

  useEffect(() => {
    syncData();
    StateEngine.syncRemote();
    const interval = setInterval(() => {
      StateEngine.syncRemote();
      syncData();
    }, 5000);

    const handleUpdate = () => syncData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('bueno_state_updated', handleUpdate);

    const now = new Date();
    setTripForm((f) => ({
      ...f,
      loadingDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('bueno_state_updated', handleUpdate);
    };
  }, []);

  const occupiedWagonIds = getOccupiedWagonIds(trips);
  const availableWagons = wagons.filter((w) => !occupiedWagonIds.has(w.id));

  // Station filtering
  const myDeals = deals.filter((d) => !d.origin || d.origin === station || d.status === 'APPROVED');
  const myTrips = trips.filter((t) => t.status === 'LOADING' || t.origin === station);
  const myInTransit = trips.filter((t) => t.status === 'IN_TRANSIT');
  const myIncomingUnload = trips.filter(
    (t) => t.status === 'IN_TRANSIT' || t.status === 'UNLOADING' || t.destination === station
  );

  const saveTrips = (updated: any[]) => {
    setTrips(updated);
    StateEngine.saveTrips(updated);
  };

  const saveDeals = (updated: any[]) => {
    setDeals(updated);
    StateEngine.saveDeals(updated);
  };

  const saveWagons = (updated: any[]) => {
    setWagons(updated);
    StateEngine.saveWagons(updated);
  };

  const saveRequests = (updated: any[]) => {
    setRequests(updated);
    StateEngine.saveRequests(updated);
  };

  // 1. Create Trip from Deal
  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDeal) return;

    const seqNum = String(trips.length + 1).padStart(3, '0');
    const formattedTripId = `TRIP-${seqNum}`;
    const now = new Date();
    const formattedCreated = `${now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const isMonthly = createDeal.dealType === 'MONTHLY_CONTRACT' || createDeal.isMonthlyContract;
    const totalPlannedTrips = createDeal.totalPlannedTrips || 10;
    const totalBags = isMonthly
      ? createDeal.trancheTonnage || Math.round((Number(createDeal.quantity) || 27600) / totalPlannedTrips)
      : Number(createDeal.quantity) || 27600;

    const targetWagonsCount = Math.min(23, Math.max(1, Math.ceil(totalBags / 1200)));

    const newTrip = {
      id: formattedTripId,
      tripId: formattedTripId,
      tripSequenceNumber: trips.length + 1,
      dealId: createDeal.id,
      locomotiveId: tripForm.locomotiveId || 'L2205',
      driverName: tripForm.driverName || 'Engr. Kabiru Usman (NRC-DRV-102)',
      crewMembers: tripForm.crewMembers || 'Sani Bello, Timothy Danjuma',
      monitoringOfficer: tripForm.monitoringOfficer || user?.fullName || 'Ade Bello',
      cargoOfficerName: user?.fullName || 'Ade Bello',
      company: createDeal.company,
      origin: station,
      destination: createDeal.destination || 'MNY',
      cargoType: createDeal.cargoType || 'Bagged Cement (50kg)',
      quantity: totalBags,
      targetWagonsCount,
      status: 'LOADING',
      createdAt: formattedCreated,
      wagonLogs: [],
    };

    // Save trip
    const updatedTrips = [newTrip, ...trips];
    saveTrips(updatedTrips);

    // Update deal dispatched status
    const updatedDeals = deals.map((d) => {
      if (d.id === createDeal.id) {
        const nextDispatched = (d.dispatchedTripsCount || 0) + 1;
        const isComplete = nextDispatched >= (d.totalPlannedTrips || 1);
        return {
          ...d,
          dispatchedTripsCount: nextDispatched,
          status: isComplete ? 'COMPLETED' : 'PARTIALLY_DISPATCHED',
        };
      }
      return d;
    });
    saveDeals(updatedDeals);

    // Send notifications
    try {
      const notifPayload = {
        id: `ntf_${Date.now()}`,
        title: `Trip Initiated: ${newTrip.tripId}`,
        message: `Locomotive ${newTrip.locomotiveId} assigned for ${newTrip.company}. Wagon loading initiated at ${sName(station)}.`,
        targetId: newTrip.id,
        targetTab: 'trips',
        read: false,
        createdAt: formattedCreated,
      };
      const existing = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      localStorage.setItem('bueno_notifications', JSON.stringify([notifPayload, ...existing]));
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPayload),
      }).catch(() => {});
    } catch {}

    setCreateDeal(null);
    // Immediately open the Trip Wagon Loading Dashboard!
    setSelectedTripId(newTrip.id);
  };

  // 2. Register New Wagon to Fleet
  const handleRegisterWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = newWagonId.trim().toUpperCase() || `PXG ${Math.floor(9000 + Math.random() * 999)}`;
    if (wagons.some((w) => w.id === wId)) {
      setCustomAlert({
        title: 'Wagon Already Registered',
        message: `Wagon ${wId} is already registered in the station fleet inventory!`,
      });
      return;
    }
    const newW = {
      id: wId,
      wagonType: 'PXG Covered Hopper Wagon',
      capacity: 1200,
      payloadCapacity: '60 MT (1,200 Bags)',
      status: 'AVAILABLE',
      currentStation: station,
      gauge: 'STANDARD_GAUGE',
      addedBy: user?.fullName || 'Ade Bello',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    saveWagons([...wagons, newW]);
    setNewWagonId('');
    setAddWagonModal(false);
    setCustomAlert({
      title: 'Wagon Registered',
      message: `Wagon ${wId} registered successfully at ${sName(station)} Terminal!`,
    });
  };

  // 3. Fund Request Submission
  const handleFundRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const req = {
      id: `REQ-${Date.now()}`,
      officerName: user?.fullName || 'Ade Bello',
      station,
      title: fundForm.title,
      category: fundForm.category,
      amount: parseFloat(fundForm.amount) || 0,
      tripNo: fundForm.tripNo || 'TRIP-001',
      vesselNo: fundForm.vesselNo || 'VSL-APMT-992',
      description: fundForm.description,
      stage: 'Admin',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      conversation: [
        {
          sender: user?.fullName || 'Ade Bello',
          role: 'Cargo Officer',
          msg: fundForm.description,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      paymentDetails: null,
    };
    saveRequests([req, ...requests]);
    setFundsModal(false);
    setFundForm({
      title: '',
      amount: '350000',
      category: 'Tarpaulin Covering & Lashing (₦350,000)',
      tripNo: 'TRIP-001',
      vesselNo: 'VSL-APMT-992',
      description: '',
    });
    setView('funds');
  };

  const navItems = [
    { key: 'deals', label: 'Latest Deals (Loading)', icon: FileText },
    { key: 'trips', label: 'Trips Created (Loading)', icon: Train },
    { key: 'in_transit', label: 'Trips on the Move', icon: Radio },
    { key: 'incoming_unload', label: 'Incoming Consignments (Unload)', icon: Truck },
    { key: 'moniya', label: 'Moniya Container Terminal', icon: Building2 },
    { key: 'wagons', label: `Wagon Fleet (${wagons.length})`, icon: Layers },
    { key: 'funds', label: 'Request Funds', icon: DollarSign },
    { key: 'terminal_info', label: 'Terminal Info Ledger', icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#62BC37] to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Train className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white font-mono">BUENO FREIGHT OS</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#62BC37]/20 text-[#62BC37] border border-[#62BC37]/30">
                  CARGO COMMAND
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-[#62BC37]" />
                Station: <strong className="text-white">{sName(station)}</strong> ({station})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-black text-white">{user?.fullName || 'Cargo Officer'}</span>
              <span className="text-[10px] font-semibold text-emerald-400 font-mono">ID: {user?.staffId || 'EWK-01'}</span>
            </div>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <div className="bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-xs overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view === item.key && !selectedTripId && !selectedUnloadTripId;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView(item.key as any);
                    setSelectedTripId(null);
                    setSelectedUnloadTripId(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#62BC37] text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex-1">
        {selectedTripId ? (
          /* ACTIVE PER-WAGON LOADING DASHBOARD (TIMED WAGONS & AUDIT) */
          <TripWagonView
            tripId={selectedTripId}
            trips={trips}
            wagons={wagons}
            onBack={() => setSelectedTripId(null)}
            onSaveTrips={saveTrips}
          />
        ) : selectedUnloadTripId ? (
          /* DESTINATION UNLOADING DASHBOARD (TIMED UNLOAD & DISCREPANCY AUDIT) */
          <TripUnloadWagonView
            tripId={selectedUnloadTripId}
            trips={trips}
            user={user}
            onBack={() => setSelectedUnloadTripId(null)}
            onSaveTrips={saveTrips}
          />
        ) : (
          <>
            {/* VIEW 1: LATEST DEALS (LOADING) — DEFAULT ENTRY POINT */}
            {view === 'deals' && (
              <Section
                title="Latest Deals (Origin Loading Station)"
                subtitle={`Approved freight deals allocated to ${sName(station)} — click 'Create Trip' to configure consist & start timed wagon loading`}
              >
                <TableWrap
                  headers={['Deal ID', 'Client / Consignor', 'Destination', 'Cargo Spec & Bags', 'Action']}
                  mobileCard={(d: any) => (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-[#0E4B88]">{d.dealNumber || d.id}</span>
                        <span className="text-xs font-bold text-slate-700">{sName(d.destination)}</span>
                      </div>
                      <p className="font-bold text-slate-900">{d.company}</p>
                      <p className="text-xs text-slate-600">
                        {d.cargoType} ({Number(d.quantity).toLocaleString()} Bags)
                      </p>
                      <button
                        onClick={() => {
                          setCreateDeal(d);
                          setTripForm((f) => ({
                            ...f,
                            selectedWagon: availableWagons[0]?.id || '',
                            qty: String(d.quantity || 27600),
                          }));
                        }}
                        className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs py-2.5 rounded-xl mt-2 shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <span>Create Trip & Start Loading</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  data={myDeals}
                >
                  {myDeals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center bg-gradient-to-b from-slate-50 to-emerald-50/20">
                        <div className="max-w-md mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#62BC37] mx-auto flex items-center justify-center shadow-xs">
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <h4 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {sName(station)} Siding Ready & Operational
                          </h4>
                          <p className="text-xs text-slate-500">
                            No pending freight deals allocated to this station right now. Deals registered in the Admin Portal will appear here immediately for trip creation.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    myDeals.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-black text-[#0E4B88]">{d.dealNumber || d.id}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{d.company}</p>
                          <p className="text-[10px] text-slate-400">Approved Commercial Contract</p>
                        </td>
                        <td className="p-4 text-slate-700 font-semibold">{sName(d.destination)}</td>
                        <td className="p-4 text-slate-700">
                          <div className="font-medium">{d.cargoType}</div>
                          <div className="font-mono font-bold text-emerald-700">
                            {Number(d.quantity).toLocaleString()} Bags ({((Number(d.quantity) || 0) * 0.05).toFixed(0)} MT)
                          </div>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => {
                              setCreateDeal(d);
                              setTripForm((f) => ({
                                ...f,
                                selectedWagon: availableWagons[0]?.id || '',
                                qty: String(d.quantity || 27600),
                              }));
                            }}
                            className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                          >
                            <span>Create Trip</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </TableWrap>
              </Section>
            )}

            {/* VIEW 2: TRIPS CREATED (LOADING) */}
            {view === 'trips' && (
              <Section
                title="Trips Created (Wagon Loading)"
                subtitle="Trips active at this terminal — click any trip row to enter the timed wagon loading dashboard"
              >
                <TableWrap
                  headers={['Trip ID', 'Cargo Officer', 'Company / Cargo', 'Route Corridor', 'Wagons Loaded', 'Action']}
                  mobileCard={(t: any) => {
                    const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                    return (
                      <div className="space-y-2 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                          <span className="font-mono font-bold text-[#62BC37] text-xs">
                            {loaded} / {t.targetWagonsCount || 23} Loaded
                          </span>
                        </div>
                        <p className="font-bold text-slate-900">{t.company}</p>
                        <p className="text-xs text-slate-600">
                          {sName(t.origin)} ➔ {sName(t.destination)}
                        </p>
                        <p className="text-xs font-bold text-[#0E4B88] pt-1 flex items-center gap-1">
                          <span>Open Wagon Loading Console</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </p>
                      </div>
                    );
                  }}
                  data={myTrips}
                >
                  {myTrips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        No active loading trips. Navigate to 'Latest Deals' to create a new trip.
                      </td>
                    </tr>
                  ) : (
                    myTrips.map((t) => {
                      const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTripId(t.id)}
                        >
                          <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                          <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900">{t.company}</p>
                            <p className="text-[10px] text-slate-500">{t.cargoType}</p>
                          </td>
                          <td className="p-4 text-slate-600 font-medium">
                            {sName(t.origin)} ➔ {sName(t.destination)}
                          </td>
                          <td className="p-4 font-mono font-bold text-[#62BC37]">
                            {loaded} / {t.targetWagonsCount || 23} Wagons
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-bold text-[#0E4B88] hover:underline flex items-center gap-1">
                              <span>Open Loading</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </TableWrap>
              </Section>
            )}

            {/* VIEW 3: TRIPS ON THE MOVE (IN TRANSIT) */}
            {view === 'in_transit' && (
              <div className="space-y-4">
                <Section
                  title="Trips on the Move (Live Corridor Transit)"
                  subtitle="Active train consists departed from your station currently running along the Lagos-Ibadan corridor"
                >
                  <TableWrap
                    headers={['Trip ID', 'Company', 'Locomotive', 'Route', 'Status', 'Action']}
                    mobileCard={(t: any) => (
                      <div className="space-y-2 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                          <Badge text={t.status} color="green" />
                        </div>
                        <p className="font-bold text-slate-900">{t.company}</p>
                        <p className="text-xs font-mono text-slate-700">Loco: {t.locomotiveId}</p>
                        <p className="text-xs text-slate-600">
                          {sName(t.origin)} ➔ {sName(t.destination)}
                        </p>
                        <p className="text-xs font-bold text-[#62BC37] pt-1 flex items-center gap-1">
                          <span>Inspect Consist & Telemetry</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </p>
                      </div>
                    )}
                    data={myInTransit}
                  >
                    {myInTransit.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                          No trains currently in corridor transit.
                        </td>
                      </tr>
                    ) : (
                      myInTransit.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedTripId(t.id)}
                        >
                          <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                          <td className="p-4 font-bold text-slate-900">{t.company}</td>
                          <td className="p-4 font-mono text-slate-800 font-bold">{t.locomotiveId}</td>
                          <td className="p-4 text-slate-600 font-medium">
                            {sName(t.origin)} ➔ {sName(t.destination)}
                          </td>
                          <td className="p-4">
                            <Badge text={t.status} color="green" />
                          </td>
                          <td className="p-4 font-bold text-[#62BC37] hover:underline">Inspect Consist & GPS ➔</td>
                        </tr>
                      ))
                    )}
                  </TableWrap>
                </Section>
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Live GPS Telemetry & Waypoint Corridor
                  </h3>
                  <LiveGpsMap trips={myInTransit} />
                </div>
              </div>
            )}

            {/* VIEW 4: INCOMING CONSIGNMENTS (UNLOAD) */}
            {view === 'incoming_unload' && (
              <Section
                title="Incoming Consignments (Destination Unloading Yard)"
                subtitle={`Consignments scheduled or arrived at ${sName(station)} — click 'Unload Consignment' to audit and discharge wagons`}
              >
                <TableWrap
                  headers={['Trip ID', 'Origin Station', 'Company & Cargo', 'Wagon Progress', 'Status', 'Action']}
                  mobileCard={(t: any) => {
                    const totalWagons = (t.wagonLogs || []).length;
                    const unloadedCount = (t.wagonLogs || []).filter((w: any) => w.unloadStatus === 'UNLOADED').length;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                          <Badge text={t.status} color={t.status === 'UNLOADING' ? 'purple' : 'blue'} />
                        </div>
                        <p className="font-bold text-slate-900">
                          {t.company} — {t.cargoType}
                        </p>
                        <p className="text-xs text-slate-600">
                          Origin: {sName(t.origin)} | Discharged: {unloadedCount} / {totalWagons || 23} Wagons
                        </p>
                        <button
                          onClick={() => setSelectedUnloadTripId(t.id)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 rounded-xl mt-1 shadow-xs flex items-center justify-center gap-1"
                        >
                          <span>Unload Consignment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }}
                  data={myIncomingUnload}
                >
                  {myIncomingUnload.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                        No incoming freight scheduled for {sName(station)}.
                      </td>
                    </tr>
                  ) : (
                    myIncomingUnload.map((t) => {
                      const totalWagons = (t.wagonLogs || []).length;
                      const unloadedCount = (t.wagonLogs || []).filter((w: any) => w.unloadStatus === 'UNLOADED').length;
                      return (
                        <tr key={t.id} className="hover:bg-purple-50/40 transition-colors">
                          <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                          <td className="p-4 font-bold text-slate-900">{sName(t.origin)}</td>
                          <td className="p-4 text-slate-700 font-medium">
                            {t.company} — {t.cargoType}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {unloadedCount} / {totalWagons || 23} Discharged
                          </td>
                          <td className="p-4">
                            <Badge text={t.status} color={t.status === 'UNLOADING' ? 'purple' : 'blue'} />
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedUnloadTripId(t.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1 transition-all"
                            >
                              <span>Unload Consignment</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </TableWrap>
              </Section>
            )}

            {/* VIEW 5: MONIYA CONTAINER TERMINAL */}
            {view === 'moniya' && <MoniyaContainerView user={user} />}

            {/* VIEW 6: WAGON FLEET INVENTORY */}
            {view === 'wagons' && (
              <Section
                title="Wagon Fleet Inventory (46+ Registered Wagons)"
                subtitle="Enterprise rolling stock registry — occupied wagons are locked system-wide across loading, corridor transit, and discharge"
                action={
                  <button
                    onClick={() => setAddWagonModal(true)}
                    className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register New Wagon</span>
                  </button>
                }
              >
                <TableWrap
                  headers={['Wagon ID', 'Carriage Spec', 'Capacity (Bags / MT)', 'Live Status', 'Current Station', 'Added By']}
                  mobileCard={(w: any) => {
                    const isOccupied = occupiedWagonIds.has(w.id);
                    return (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-slate-900 text-sm">{w.id}</span>
                          <Badge text={isOccupied ? 'LOCKED (IN USE)' : 'AVAILABLE'} color={isOccupied ? 'amber' : 'green'} />
                        </div>
                        <p className="text-xs text-slate-600">
                          Capacity: {w.capacity || 1200} Bags (60 MT) | Station: {sName(w.currentStation || station)}
                        </p>
                      </div>
                    );
                  }}
                  data={wagons}
                >
                  {wagons.map((w) => {
                    const isOccupied = occupiedWagonIds.has(w.id);
                    return (
                      <tr key={w.id} className="hover:bg-slate-50 text-xs">
                        <td className="p-4 font-mono font-black text-slate-900 text-sm">{w.id}</td>
                        <td className="p-4 text-slate-700 font-semibold">{w.wagonType || 'Covered Hopper'}</td>
                        <td className="p-4 font-mono font-bold text-slate-700">
                          {Number(w.capacity || 1200).toLocaleString()} Bags (60 MT)
                        </td>
                        <td className="p-4">
                          <Badge text={isOccupied ? 'IN_ACTIVE_USE (LOCKED)' : 'AVAILABLE'} color={isOccupied ? 'amber' : 'green'} />
                        </td>
                        <td className="p-4 font-semibold text-slate-800">{sName(w.currentStation || station)}</td>
                        <td className="p-4 text-slate-500">{w.addedBy || 'System Registry'}</td>
                      </tr>
                    );
                  })}
                </TableWrap>
              </Section>
            )}

            {/* VIEW 7: REQUEST FUNDS */}
            {view === 'funds' && (
              <Section
                title="Station Expense Requisitions"
                subtitle="Field operating expense requisitions — submit tarpaulin covering, crane handling, or fuel expense requests"
                action={
                  <button
                    onClick={() => setFundsModal(true)}
                    className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Request Funds</span>
                  </button>
                }
              >
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
                      <p className="text-xs font-bold text-[#0E4B88] pt-1 flex items-center gap-1">
                        <span>Inspect Conversation & Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </p>
                    </div>
                  )}
                  data={requests.filter((r) => r.station === station)}
                >
                  {requests.filter((r) => r.station === station).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                        No fund requisitions submitted yet.
                      </td>
                    </tr>
                  ) : (
                    requests
                      .filter((r) => r.station === station)
                      .map((r) => (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedReq(r)}
                        >
                          <td className="p-4 font-mono font-black text-[#0E4B88]">{r.id}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900">{r.title}</p>
                            <p className="text-[10px] text-slate-500">{r.category}</p>
                          </td>
                          <td className="p-4 font-mono font-black text-slate-900">
                            ₦{Number(r.amount).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Badge text={r.stage} color={stageColor(r.stage)} />
                          </td>
                          <td className="p-4 font-bold text-[#0E4B88] hover:underline">Inspect Details & Chat ➔</td>
                        </tr>
                      ))
                  )}
                </TableWrap>
              </Section>
            )}

            {/* VIEW 8: TERMINAL INFO LEDGER */}
            {view === 'terminal_info' && <TerminalInformationView user={user} />}
          </>
        )}
      </main>

      {/* CREATE TRIP MODAL (FROM APPROVED DEAL) */}
      {createDeal && (
        <Modal onClose={() => setCreateDeal(null)}>
          <div className="p-6 space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Configure Consist & Initiate Trip
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Commercial Deal: <strong className="text-slate-800">{createDeal.company}</strong> ({createDeal.dealNumber || createDeal.id})
                </p>
              </div>
              <button onClick={() => setCreateDeal(null)} className="text-slate-400 hover:text-slate-700 font-bold p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Route Corridor:</span>
                  <span className="font-bold text-slate-900">{sName(station)} ➔ {sName(createDeal.destination)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consignment Cargo:</span>
                  <span className="font-bold text-slate-900">{createDeal.cargoType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Volume:</span>
                  <span className="font-bold text-emerald-700 font-mono">{Number(createDeal.quantity).toLocaleString()} Bags</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                  <span className="text-slate-500">Target Wagon Consist:</span>
                  <span className="font-mono font-black text-[#0E4B88]">
                    {Math.min(23, Math.max(1, Math.ceil((Number(createDeal.quantity) || 27600) / 1200)))} Covered Wagons (Max 23)
                  </span>
                </div>
              </div>

              <div>
                <label className={lc}>Assigned Locomotive ID *</label>
                <input
                  required
                  value={tripForm.locomotiveId}
                  onChange={(e) => setTripForm({ ...tripForm, locomotiveId: e.target.value })}
                  placeholder="e.g. L2205"
                  className={`${ic} font-mono font-black uppercase`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Loading Date *</label>
                  <input
                    required
                    value={tripForm.loadingDate}
                    onChange={(e) => setTripForm({ ...tripForm, loadingDate: e.target.value })}
                    className={`${ic} font-mono`}
                  />
                </div>
                <div>
                  <label className={lc}>Start Time *</label>
                  <input
                    required
                    value={tripForm.startTime}
                    onChange={(e) => setTripForm({ ...tripForm, startTime: e.target.value })}
                    className={`${ic} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={lc}>Locomotive Train Driver *</label>
                <input
                  required
                  value={tripForm.driverName}
                  onChange={(e) => setTripForm({ ...tripForm, driverName: e.target.value })}
                  placeholder="e.g. Engr. Kabiru Usman (NRC-DRV-102)"
                  className={ic}
                />
              </div>

              <div>
                <label className={lc}>Train Crew Members *</label>
                <input
                  required
                  value={tripForm.crewMembers}
                  onChange={(e) => setTripForm({ ...tripForm, crewMembers: e.target.value })}
                  placeholder="e.g. Sani Bello, Timothy Danjuma"
                  className={ic}
                />
              </div>

              <div>
                <label className={lc}>Monitoring Cargo Officer *</label>
                <input
                  required
                  value={tripForm.monitoringOfficer}
                  onChange={(e) => setTripForm({ ...tripForm, monitoringOfficer: e.target.value })}
                  className={ic}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateDeal(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <span>Initiate Trip & Open Wagon Loading</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* REGISTER NEW WAGON MODAL */}
      {addWagonModal && (
        <Modal onClose={() => setAddWagonModal(false)}>
          <div className="p-6 space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Register Freight Wagon to Fleet
              </h3>
              <button onClick={() => setAddWagonModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterWagon} className="space-y-4">
              <div>
                <label className={lc}>Wagon Identification Code *</label>
                <input
                  required
                  placeholder="e.g. PXG 09070"
                  value={newWagonId}
                  onChange={(e) => setNewWagonId(e.target.value)}
                  className={`${ic} font-mono uppercase font-bold`}
                />
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to auto-generate standard PXG registration.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Carriage Type</label>
                  <input readOnly value="PXG Covered Hopper Wagon" className={`${ic} bg-slate-100 text-slate-600`} />
                </div>
                <div>
                  <label className={lc}>Standard Capacity</label>
                  <input readOnly value="1,200 Bags (60 MT)" className={`${ic} bg-slate-100 text-slate-600 font-mono`} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddWagonModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  Register to Fleet Inventory
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* REQUEST FUNDS MODAL */}
      {fundsModal && (
        <Modal onClose={() => setFundsModal(false)}>
          <div className="p-6 space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Submit Field Expense Requisition
              </h3>
              <button onClick={() => setFundsModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFundRequest} className="space-y-3">
              <div>
                <label className={lc}>Requisition Title *</label>
                <input
                  required
                  placeholder="e.g. Tarpaulin Covering & Lashing Consignment"
                  value={fundForm.title}
                  onChange={(e) => setFundForm({ ...fundForm, title: e.target.value })}
                  className={ic}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Category *</label>
                  <select
                    value={fundForm.category}
                    onChange={(e) => setFundForm({ ...fundForm, category: e.target.value })}
                    className={ic}
                  >
                    <option value="Tarpaulin Covering & Lashing (₦350,000)">Tarpaulin Covering & Lashing</option>
                    <option value="Equipment & Maintenance">Equipment & Maintenance</option>
                    <option value="Shunting & Siding Handling">Shunting & Siding Handling</option>
                    <option value="Locomotive Fueling">Locomotive Fueling</option>
                    <option value="Terminal Security & Escort">Terminal Security & Escort</option>
                  </select>
                </div>
                <div>
                  <label className={lc}>Amount Requested (₦) *</label>
                  <input
                    required
                    type="number"
                    value={fundForm.amount}
                    onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                    className={`${ic} font-mono font-bold`}
                  />
                </div>
              </div>
              <div>
                <label className={lc}>Associated Trip Number</label>
                <input
                  value={fundForm.tripNo}
                  onChange={(e) => setFundForm({ ...fundForm, tripNo: e.target.value })}
                  placeholder="e.g. TRIP-001"
                  className={`${ic} font-mono`}
                />
              </div>
              <div>
                <label className={lc}>Justification & Operational Details *</label>
                <textarea
                  required
                  rows={3}
                  value={fundForm.description}
                  onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                  placeholder="Describe operational necessity for field clearance..."
                  className={`${ic} resize-none`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFundsModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* FUND REQUEST DETAIL & CONVERSATION MODAL */}
      {selectedReq && (
        <FundRequestDetailModal
          req={selectedReq}
          user={user}
          onClose={() => setSelectedReq(null)}
          onSaveRequests={saveRequests}
          allRequests={requests}
        />
      )}

      {/* SYSTEM ALERTS MODAL */}
      <CustomAlertModal
        isOpen={!!customAlert}
        message={customAlert?.message || null}
        title={customAlert?.title}
        onClose={() => setCustomAlert(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRIP WAGON LOADING DASHBOARD (Origin Loading Station)
───────────────────────────────────────────────────────── */
function TripWagonView({
  tripId,
  trips,
  wagons,
  onBack,
  onSaveTrips,
}: {
  tripId: string;
  trips: any[];
  wagons: any[];
  onBack: () => void;
  onSaveTrips: (updated: any[]) => void;
}) {
  const trip = trips.find((t: any) => t.id === tripId || t.tripId === tripId);
  const [logs, setLogs] = useState<any[]>(trip?.wagonLogs || []);
  const [adding, setAdding] = useState(false);
  const [selWagon, setSelWagon] = useState('');
  const [stoppingWagon, setStoppingWagon] = useState<any | null>(null);
  const [bagsLoadedInput, setBagsLoadedInput] = useState('1200');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  const [loadingLogForm, setLoadingLogForm] = useState({
    sourceEnv: 'Silo Bay 1 - Loading Siding',
    truckRegNo: 'KJA-482-XY',
    driverDetails: 'Ibrahim Garba (08031112233)',
    transporter: 'HBM Logistics Fleet',
    startTimeEdit: '',
    endTimeEdit: '',
  });

  if (!trip) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Trip not found.{' '}
        <button onClick={onBack} className="underline text-[#62BC37] font-bold">
          Go back
        </button>
      </div>
    );
  }

  const totalBags = Number(trip.quantity) || 27600;
  const targetCount = trip.targetWagonsCount || Math.min(23, Math.max(1, Math.ceil(totalBags / 1200)));

  const loadedLogs = logs.filter((w: any) => w.status === 'LOADED');
  const loadedCount = loadedLogs.length;
  const active = logs.find((w: any) => w.status === 'LOADING');
  const totalBagsLoadedSoFar = loadedLogs.reduce((acc: number, w: any) => acc + (Number(w.qty) || 0), 0);
  const allDone = loadedCount >= targetCount;
  const pct = Math.min(100, Math.round((loadedCount / targetCount) * 100));

  const occupiedWagonIds = getOccupiedWagonIds(trips);
  const usedInThisTrip = new Set(logs.map((w: any) => w.wagonId));
  const available = (wagons || SEED_WAGONS).filter(
    (w: any) => !occupiedWagonIds.has(w.id) && !usedInThisTrip.has(w.id)
  );

  const isTripInTransit =
    trip.status === 'IN_TRANSIT' || trip.status === 'UNLOADING' || trip.status === 'COMPLETED' || trip.status === 'ARRIVED';

  const commitLogs = (updated: any[], tripStatusOverride?: string) => {
    setLogs(updated);
    const updatedTrips = trips.map((t: any) =>
      t.id === trip.id ? { ...t, wagonLogs: updated, status: tripStatusOverride || t.status } : t
    );
    onSaveTrips(updatedTrips);
  };

  // Start Loading Stopwatch for Wagon
  const startLoadingWagon = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTripInTransit) {
      setCustomAlert({
        title: 'Loading Locked',
        message: 'Trip is already in transit or completed! Wagon loading is locked.',
      });
      return;
    }
    const wId = selWagon || available[0]?.id || 'PXG 09029';
    if (!wId) {
      setCustomAlert({
        title: 'No Wagon Selected',
        message: 'No available wagon selected for loading!',
      });
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLog = {
      id: `wl_${Date.now()}`,
      wagonId: wId,
      startTimestamp: Date.now(),
      startDate: formattedDate,
      startTime: formattedTime,
      endDate: null,
      endTime: null,
      durationStr: null,
      qty: null,
      sourceEnv: loadingLogForm.sourceEnv || 'Silo Bay 1 - Loading Siding',
      truckRegNo: loadingLogForm.truckRegNo || 'KJA-482-XY',
      driverDetails: loadingLogForm.driverDetails || 'Ibrahim Garba (08031112233)',
      transporter: loadingLogForm.transporter || 'HBM Logistics Fleet',
      status: 'LOADING',
      unloadStatus: 'PENDING_UNLOAD',
    };

    commitLogs([...logs, newLog], 'LOADING');
    setAdding(false);
    setSelWagon('');
  };

  // Open Stop Loading Audit Modal
  const handleOpenStopModal = (w: any) => {
    const remainingBags = Math.max(0, totalBags - totalBagsLoadedSoFar);
    const defaultQty = remainingBags > 0 && remainingBags < 1200 ? remainingBags : 1200;
    setBagsLoadedInput(String(defaultQty));
    setLoadingLogForm({
      sourceEnv: w.sourceEnv || 'Silo Bay 1 - Loading Siding',
      truckRegNo: w.truckRegNo || 'KJA-482-XY',
      driverDetails: w.driverDetails || 'Ibrahim Garba (08031112233)',
      transporter: w.transporter || 'HBM Logistics Fleet',
      startTimeEdit: w.startTime || '08:30 AM',
      endTimeEdit: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setStoppingWagon(w);
  };

  // Confirm Stop Loading and Record Audit
  const confirmStopLoading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingWagon) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = loadingLogForm.endTimeEdit || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mins = Math.max(1, Math.round((Date.now() - stoppingWagon.startTimestamp) / 60000));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationStr = hours > 0 ? `${hours}h ${remMins}m` : `${mins} Minutes`;

    const bagsQty = Number(bagsLoadedInput) || 1200;

    const updated = logs.map((w: any) => {
      if (w.id !== stoppingWagon.id) return w;
      return {
        ...w,
        startTime: loadingLogForm.startTimeEdit || w.startTime,
        endDate: formattedDate,
        endTime: formattedTime,
        durationStr,
        qty: bagsQty,
        sourceEnv: loadingLogForm.sourceEnv,
        truckRegNo: loadingLogForm.truckRegNo,
        driverDetails: loadingLogForm.driverDetails,
        transporter: loadingLogForm.transporter,
        status: 'LOADED',
        unloadStatus: 'PENDING_UNLOAD',
      };
    });

    commitLogs(updated);
    setStoppingWagon(null);
  };

  // Depart Train & Activate Live GPS Tracker
  const dispatchAndActivateGps = async () => {
    if (active) {
      setCustomAlert({
        title: 'Wagon Still Loading',
        message: `Wagon ${active.wagonId} is currently being loaded! Please stop loading before dispatching the train.`,
      });
      return;
    }
    if (loadedCount < 1) {
      setCustomAlert({
        title: 'No Wagons Loaded',
        message: 'Please load at least 1 wagon before dispatching the train!',
      });
      return;
    }

    const now = new Date();
    const departureTimeStr = `${now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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
    } catch {}

    const notifPayload = {
      id: `ntf_${Date.now()}`,
      title: 'Train Departed Origin Station',
      message: `Locomotive ${trip.locomotiveId} with ${loadedCount} wagons (${totalBagsLoadedSoFar.toLocaleString()} bags) departed ${sName(
        trip.origin
      )} heading to ${sName(trip.destination)}.`,
      targetId: trip.id,
      targetTab: 'in_transit',
      read: false,
      createdAt: departureTimeStr,
    };

    try {
      const existingNotifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      localStorage.setItem('bueno_notifications', JSON.stringify([notifPayload, ...existingNotifs]));
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPayload),
      }).catch(() => {});
    } catch {}

    const updatedTrips = trips.map((t: any) =>
      t.id === trip.id
        ? {
            ...t,
            status: 'IN_TRANSIT',
            gpsActive: true,
            departedAt: departureTimeStr,
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
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Trips</span>
        </button>
        <div className="flex items-center gap-2">
          {isTripInTransit && (
            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              LOADING LOCKED (IN TRANSIT)
            </span>
          )}
          <span className="text-xs font-bold text-[#62BC37] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-mono">
            {loadedCount} / {targetCount} Wagons Loaded ({totalBagsLoadedSoFar.toLocaleString()} / {totalBags.toLocaleString()} Bags)
          </span>
        </div>
      </div>

      {/* Origin Loading Details Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#62BC37] flex items-center gap-1.5">
            <Train className="w-3.5 h-3.5" />
            <span>TRIP {trip.tripId} — ORIGIN LOADING SIDING CONSOLE</span>
          </p>
          <Badge text={trip.status} color={trip.status === 'IN_TRANSIT' ? 'green' : 'amber'} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            ['Locomotive ID', trip.locomotiveId],
            ['Cargo Officer', trip.cargoOfficerName],
            ['Loading Station', trip.origin ? sName(trip.origin) : 'Ewekoro'],
            ['Destination', trip.destination ? sName(trip.destination) : 'Moniya'],
            ['Consignor Company', trip.company],
            ['Cargo Type', trip.cargoType],
            ['Quantity Requisitioned', `${Number(trip.quantity).toLocaleString()} Bags`],
            ['Trip Created', trip.createdAt || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{label}</span>
              <span className="font-bold text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Live GPS Tracker & Corridor Dispatch Banner */}
      {!isTripInTransit && (
        <div className="bg-[#62BC37] text-slate-950 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-slate-950 animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider font-mono text-slate-950">
                  LIVE GPS TRACKER & CORRIDOR DISPATCH
                </p>
              </div>
              <p className="text-base font-black text-slate-950 mt-1">
                Locomotive Consist: <span className="font-mono text-slate-900">{trip.locomotiveId}</span>
              </p>
              <p className="text-xs text-slate-900/80 mt-0.5 max-w-2xl">
                Clicking 'Depart Train &amp; Activate Live GPS' locks the loading phase, notifies destination officer at {sName(trip.destination)}, and initiates real-time GPS telemetry tracking.
              </p>
            </div>
            <button
              onClick={dispatchAndActivateGps}
              disabled={loadedCount < 1 || !!active}
              className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Depart Train & Activate Live GPS Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Wagon Loading Progress Metrics */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
          Consist Loading Progress
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Max Target Wagons', `${targetCount} Wagons`, 'text-slate-900'],
            ['Loaded Wagons', String(loadedCount), 'text-[#62BC37]'],
            ['Bags Loaded', totalBagsLoadedSoFar.toLocaleString(), 'text-emerald-700'],
            ['Progress', `${pct}%`, 'text-[#0E4B88]'],
          ].map(([label, val, col]) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{label}</span>
              <span className={`text-xl font-black font-mono ${col}`}>{val}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#0E4B88] to-[#62BC37] h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Wagon Loading Logs & Active Timer Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Wagon Loading Logs & Stopwatch Timer
            </h3>
            <p className="text-xs text-slate-500">
              Each covered hopper carries up to 1,200 bags (60 MT). Cargo Officer starts and stops loading timer per wagon.
            </p>
          </div>
          {!isTripInTransit && !active && !allDone && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Select Wagon to Load</span>
            </button>
          )}
        </div>

        {/* Wagon Selector Form */}
        {!isTripInTransit && adding && (
          <form onSubmit={startLoadingWagon} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <label className={lc}>
                Select Available Wagon from Fleet ({available.length} Available at {sName(trip.origin)})
              </label>
              <select
                value={selWagon}
                onChange={(e) => setSelWagon(e.target.value)}
                className={ic}
              >
                {available.length === 0 ? (
                  <option value="">No available wagons right now at {sName(trip.origin)}</option>
                ) : (
                  available.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.id} (Capacity: {w.capacity || 1200} Bags / 60 MT)
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={available.length === 0}
                className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-5 py-2 rounded-xl disabled:opacity-50 shadow-xs flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Loading Wagon</span>
              </button>
            </div>
          </form>
        )}

        {/* Live Active Wagon Stopwatch Card */}
        {active && (
          <div className="bg-emerald-50 border-2 border-[#62BC37] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div>
              <p className="text-[10px] font-extrabold text-[#62BC37] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-ping" />
                <span>LOADING IN PROGRESS (TIMING)</span>
              </p>
              <p className="text-xl font-mono font-black text-slate-900 mt-1">{active.wagonId}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Started: <strong className="text-slate-800">{active.startDate} at {active.startTime}</strong>
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div>
                <span className={lc}>Live Stopwatch</span>
                <LiveTimer ts={active.startTimestamp} />
              </div>
              {!isTripInTransit && (
                <button
                  onClick={() => handleOpenStopModal(active)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Loading</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Wagon Logs Feed */}
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
              No wagons loaded yet. Click '+ Select Wagon to Load' to start the live loading stopwatch.
            </div>
          ) : (
            logs.map((w: any, i: number) => (
              <div
                key={w.id || i}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="text-[10px] font-mono text-slate-400 mr-2">Wagon #{i + 1}</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                  {w.status === 'LOADED' && (
                    <span className="ml-3 font-bold text-emerald-700 font-mono">
                      ({Number(w.qty || 1200).toLocaleString()} Bags Loaded)
                    </span>
                  )}
                </div>
                <div className="font-mono text-slate-600">
                  <span>
                    Started: <strong>{w.startDate} {w.startTime}</strong>
                  </span>
                  {w.endDate && (
                    <span className="ml-3">
                      Ended: <strong>{w.endDate} {w.endTime}</strong>
                    </span>
                  )}
                  <span className="ml-3 font-bold text-slate-900">Duration: {w.durationStr || 'Running...'}</span>
                </div>
                <Badge text={w.status} color={w.status === 'LOADED' ? 'green' : 'blue'} />

                {w.status === 'LOADED' && (
                  <div className="w-full mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Source Environment</span>
                      <span className="font-bold text-slate-800">{w.sourceEnv || 'Plant Siding'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Truck Reg No.</span>
                      <span className="font-mono font-black text-[#0E4B88]">{w.truckRegNo || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Driver Details</span>
                      <span className="font-bold text-slate-800">{w.driverDetails || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Transporter Company</span>
                      <span className="font-bold text-slate-800">{w.transporter || 'HBM Logistics Fleet'}</span>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stop Loading Audit Modal */}
      {stoppingWagon && (
        <Modal onClose={() => setStoppingWagon(null)}>
          <div className="p-6 space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Wagon Loading Source Logistics & Time Audit
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Complete loading log for Wagon <strong>{stoppingWagon.wagonId}</strong>. Verify start/concluding times, feeder truck, and bag count.
                </p>
              </div>
              <button onClick={() => setStoppingWagon(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmStopLoading} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Loading Start Time</label>
                  <input
                    type="text"
                    value={loadingLogForm.startTimeEdit}
                    onChange={(e) => setLoadingLogForm({ ...loadingLogForm, startTimeEdit: e.target.value })}
                    className={`${ic} font-mono`}
                    placeholder="08:30 AM"
                  />
                </div>
                <div>
                  <label className={lc}>Concluding Time</label>
                  <input
                    type="text"
                    value={loadingLogForm.endTimeEdit}
                    onChange={(e) => setLoadingLogForm({ ...loadingLogForm, endTimeEdit: e.target.value })}
                    className={`${ic} font-mono`}
                    placeholder="10:15 AM"
                  />
                </div>
              </div>

              <div>
                <label className={lc}>Source for Loading Wagon *</label>
                <input
                  required
                  value={loadingLogForm.sourceEnv}
                  onChange={(e) => setLoadingLogForm({ ...loadingLogForm, sourceEnv: e.target.value })}
                  placeholder="e.g. Silo Bay 1 - Loading Siding"
                  className={ic}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Feeder Truck Registration Number *</label>
                  <input
                    required
                    value={loadingLogForm.truckRegNo}
                    onChange={(e) => setLoadingLogForm({ ...loadingLogForm, truckRegNo: e.target.value })}
                    placeholder="e.g. KJA-482-XY"
                    className={`${ic} font-mono uppercase font-bold`}
                  />
                </div>
                <div>
                  <label className={lc}>Transporter / Haulage Company *</label>
                  <input
                    required
                    value={loadingLogForm.transporter}
                    onChange={(e) => setLoadingLogForm({ ...loadingLogForm, transporter: e.target.value })}
                    placeholder="e.g. HBM Logistics Fleet"
                    className={ic}
                  />
                </div>
              </div>

              <div>
                <label className={lc}>Driver Name & Phone Number *</label>
                <input
                  required
                  value={loadingLogForm.driverDetails}
                  onChange={(e) => setLoadingLogForm({ ...loadingLogForm, driverDetails: e.target.value })}
                  placeholder="e.g. Ibrahim Garba (08031112233)"
                  className={ic}
                />
              </div>

              <div>
                <label className={lc}>Actual Quantity Loaded (Bags, max 1,200) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="1200"
                  value={bagsLoadedInput}
                  onChange={(e) => setBagsLoadedInput(e.target.value)}
                  className={`${ic} font-mono text-base font-bold text-emerald-800`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoppingWagon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-6 py-2.5 rounded-xl shadow-md"
                >
                  Save & Complete Wagon Load
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      <CustomAlertModal
        isOpen={!!customAlert}
        message={customAlert?.message || null}
        title={customAlert?.title}
        onClose={() => setCustomAlert(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   TRIP WAGON UNLOADING DASHBOARD (Destination Unload Station)
───────────────────────────────────────────────────────── */
function TripUnloadWagonView({
  tripId,
  trips,
  user,
  onBack,
  onSaveTrips,
}: {
  tripId: string;
  trips: any[];
  user: any;
  onBack: () => void;
  onSaveTrips: (updated: any[]) => void;
}) {
  const trip = trips.find((t: any) => t.id === tripId || t.tripId === tripId);
  const [logs, setLogs] = useState<any[]>(trip?.wagonLogs || []);
  const [stoppingUnloadWagon, setStoppingUnloadWagon] = useState<any | null>(null);
  const [bagsUnloadedInput, setBagsUnloadedInput] = useState('1200');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);
  const [unloadForm, setUnloadForm] = useState({
    correctQty: '1192',
    damageQty: '0',
    burstBags: '0',
    hasComplaint: false,
    complaintNotes: '',
    unloadStartTimeEdit: '',
    unloadEndTimeEdit: '',
  });

  if (!trip) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Trip not found.{' '}
        <button onClick={onBack} className="underline text-[#62BC37]">
          Go back
        </button>
      </div>
    );
  }

  const total = logs.length;
  const unloaded = logs.filter((w: any) => w.unloadStatus === 'UNLOADED').length;
  const allUnloaded = unloaded >= total && total > 0;
  const activeUnload = logs.find((w: any) => w.unloadStatus === 'UNLOADING');
  const pct = total > 0 ? Math.min(100, Math.round((unloaded / total) * 100)) : 0;

  const commitLogs = (updated: any[], statusOverride?: string) => {
    setLogs(updated);
    onSaveTrips(
      trips.map((t: any) =>
        t.id === trip.id
          ? {
              ...t,
              status: statusOverride || (allUnloaded ? 'ARRIVED' : 'UNLOADING'),
              wagonLogs: updated,
            }
          : t
      )
    );
  };

  const startUnloading = (wagonId: string) => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const updated = logs.map((w: any) => {
      if (w.wagonId !== wagonId) return w;
      return {
        ...w,
        unloadStartTimestamp: Date.now(),
        unloadStartDate: formattedDate,
        unloadStartTime: formattedTime,
        unloadStatus: 'UNLOADING',
        unloadingOfficer: user?.fullName || 'Destination Officer',
      };
    });
    commitLogs(updated, 'UNLOADING');
  };

  const handleOpenStopUnloadModal = (w: any) => {
    const defaultLoadedQty = Number(w.qty || 1200);
    setBagsUnloadedInput(String(defaultLoadedQty));
    setUnloadForm({
      correctQty: String(defaultLoadedQty),
      damageQty: '0',
      burstBags: '0',
      hasComplaint: false,
      complaintNotes: '',
      unloadStartTimeEdit: w.unloadStartTime || '02:15 PM',
      unloadEndTimeEdit: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setStoppingUnloadWagon(w);
  };

  const confirmStopUnloading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingUnloadWagon) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime =
      unloadForm.unloadEndTimeEdit || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mins = Math.max(
      1,
      Math.round((Date.now() - (stoppingUnloadWagon.unloadStartTimestamp || Date.now())) / 60000)
    );
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationStr = hours > 0 ? `${hours}h ${remMins}m` : `${mins} Minutes`;
    const bagsUnloaded = Number(bagsUnloadedInput) || stoppingUnloadWagon.qty || 1200;

    const updated = logs.map((w: any) => {
      if (w.wagonId !== stoppingUnloadWagon.wagonId) return w;
      return {
        ...w,
        unloadStartTime: unloadForm.unloadStartTimeEdit || w.unloadStartTime,
        unloadEndDate: formattedDate,
        unloadEndTime: formattedTime,
        unloadDurationStr: durationStr,
        unloadedQty: bagsUnloaded,
        correctQty: Number(unloadForm.correctQty) || bagsUnloaded,
        damageQty: Number(unloadForm.damageQty) || 0,
        burstBags: Number(unloadForm.burstBags) || 0,
        hasComplaint: unloadForm.hasComplaint,
        complaintNotes: unloadForm.hasComplaint ? unloadForm.complaintNotes : null,
        unloadStatus: 'UNLOADED',
      };
    });

    if (unloadForm.hasComplaint) {
      const insuranceNotif = {
        id: `ntf_ins_${Date.now()}`,
        title: `Wagon Discrepancy Alert — ${stoppingUnloadWagon.wagonId}`,
        message: `Discrepancy logged for Wagon ${stoppingUnloadWagon.wagonId} on Trip ${trip.tripId}: ${unloadForm.damageQty} damaged, ${unloadForm.burstBags} burst bags. Notes: "${unloadForm.complaintNotes}"`,
        targetId: trip.id,
        targetTab: 'trips',
        read: false,
        createdAt: `${formattedDate}, ${formattedTime}`,
      };
      try {
        const existingNotifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
        localStorage.setItem('bueno_notifications', JSON.stringify([insuranceNotif, ...existingNotifs]));
        fetch('/api/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(insuranceNotif),
        }).catch(() => {});
      } catch {}
    }

    commitLogs(updated);
    setStoppingUnloadWagon(null);
  };

  const completeTrip = () => {
    const now = new Date();
    const completedTimestamp = `${now.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const updatedTrips = trips.map((t: any) =>
      t.id === trip.id
        ? {
            ...t,
            status: 'COMPLETED',
            completedAt: completedTimestamp,
            unloadingOfficerName: user?.fullName || 'Destination Officer',
            wagonLogs: logs,
          }
        : t
    );
    onSaveTrips(updatedTrips);

    // Release wagons back to destination station fleet
    try {
      const storedWagons = JSON.parse(localStorage.getItem('bueno_wagons') || '[]');
      const loadedWagonIds = new Set(logs.map((w: any) => w.wagonId));
      const updatedWagons = storedWagons.map((w: any) => {
        if (loadedWagonIds.has(w.id)) {
          return { ...w, status: 'AVAILABLE', currentStation: trip.destination };
        }
        return w;
      });
      localStorage.setItem('bueno_wagons', JSON.stringify(updatedWagons));
      window.dispatchEvent(new Event('bueno_state_updated'));
    } catch {}

    setCustomAlert({
      title: 'Consignment Unloading Completed',
      message: `Trip ${trip.tripId} successfully COMPLETED!\n\nAll ${logs.length} wagons marked UNLOADED and returned to ${sName(
        trip.destination
      )} fleet inventory.`,
    });
    setTimeout(() => onBack(), 1800);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Incoming Consignments</span>
        </button>
        <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl font-mono">
          {unloaded} / {total} Wagons Discharged
        </span>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700">
          TRIP {trip.tripId} — DESTINATION DISCHARGE &amp; AUDIT CONSOLE
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            ['Locomotive ID', trip.locomotiveId],
            ['Origin Loading Station', trip.origin ? sName(trip.origin) : 'Ewekoro'],
            ['Destination Yard', trip.destination ? sName(trip.destination) : 'Moniya'],
            ['Unloading Officer', user?.fullName || 'Destination Officer'],
            ['Consignor Company', trip.company],
            ['Cargo Type', trip.cargoType],
            ['Quantity Requisitioned', `${Number(trip.quantity).toLocaleString()} Bags`],
            ['Status', trip.status],
          ].map(([l, v]) => (
            <div key={l}>
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span>
              <span className="font-bold text-slate-900">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
          Wagon Discharge Progress
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            ['Total Consist Wagons', String(total), 'text-slate-900'],
            ['Discharged', String(unloaded), 'text-[#62BC37]'],
            ['Pending Discharge', String(total - unloaded), 'text-amber-600'],
            ['Discharge Ratio', `${pct}%`, 'text-purple-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span>
              <span className={`text-xl font-black font-mono ${c}`}>{v}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-[#62BC37] h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {activeUnload && (
        <div className="bg-purple-50 border-2 border-purple-400 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div>
            <p className="text-[10px] font-extrabold text-purple-800 uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
              <span>CURRENTLY DISCHARGING WAGON</span>
            </p>
            <p className="text-xl font-mono font-black text-slate-900 mt-1">{activeUnload.wagonId}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Started: <strong className="text-slate-800">{activeUnload.unloadStartDate} at {activeUnload.unloadStartTime}</strong>
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <span className={lc}>Unloading Timer</span>
              <LiveTimer ts={activeUnload.unloadStartTimestamp} />
            </div>
            <button
              onClick={() => handleOpenStopUnloadModal(activeUnload)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Unloading</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Consignment Wagons (Loaded at {sName(trip.origin)})
          </h3>
          <p className="text-xs text-slate-500">
            Unload each wagon arriving from {sName(trip.origin)} and record discharged bag count and any discrepancy notes.
          </p>
        </div>

        <div className="space-y-3">
          {logs.map((w: any, i: number) => {
            const isUnloading = w.unloadStatus === 'UNLOADING';
            const isUnloaded = w.unloadStatus === 'UNLOADED';
            return (
              <div
                key={w.id || i}
                className={`border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${
                  isUnloaded
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isUnloading
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono text-slate-400 mr-2">Wagon #{i + 1}</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Loaded Bags: <strong className="text-slate-800">{Number(w.qty || 1200).toLocaleString()}</strong> | Origin Load Time: <strong className="text-slate-800">{w.durationStr || '—'}</strong>
                  </p>
                </div>
                <div className="font-mono text-slate-600 text-right">
                  {isUnloaded ? (
                    <div>
                      <p className="text-emerald-700 font-bold">
                        Unloaded ({Number(w.unloadedQty || w.qty || 1200).toLocaleString()} Bags) in {w.unloadDurationStr || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {w.unloadStartDate} {w.unloadStartTime} ➔ {w.unloadEndDate} {w.unloadEndTime}
                      </p>
                    </div>
                  ) : isUnloading ? (
                    <p className="text-purple-700 font-bold animate-pulse">Discharge in progress...</p>
                  ) : (
                    <p className="text-slate-400">Ready to unload</p>
                  )}
                </div>
                <div>
                  {isUnloaded ? (
                    <Badge
                      text={w.hasComplaint ? 'DISCREPANCY FLAGGED' : 'DISCHARGED INTACT'}
                      color={w.hasComplaint ? 'rose' : 'green'}
                    />
                  ) : isUnloading ? (
                    <button
                      onClick={() => handleOpenStopUnloadModal(w)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
                    >
                      Stop Unload
                    </button>
                  ) : !activeUnload ? (
                    <button
                      onClick={() => startUnloading(w.wagonId)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1"
                    >
                      <span>Start Unload</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Waiting for active wagon</span>
                  )}
                </div>

                {isUnloaded && (
                  <div className="w-full mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 bg-white p-3 rounded-xl border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Verified Delivered</span>
                      <span className="font-mono font-bold text-emerald-800">
                        {w.correctQty || w.unloadedQty || w.qty || 1200} Bags
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Damaged Units</span>
                      <span className="font-mono font-bold text-rose-600">{w.damageQty || 0} Units</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Burst Bags</span>
                      <span className="font-mono font-bold text-amber-700">{w.burstBags || 0} Bags</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Complaint Audit</span>
                      <span className={`font-extrabold ${w.hasComplaint ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {w.hasComplaint ? 'DISCREPANCY' : 'CLEAN DISCHARGE'}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Notes / Reason</span>
                      <span className="text-slate-700 font-medium truncate block">
                        {w.complaintNotes || 'Clean discharge verified'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allUnloaded && (
          <div className="bg-[#62BC37] text-slate-950 rounded-2xl p-5 space-y-3 mt-4 shadow-md">
            <p className="text-sm font-black text-slate-950">
              All {logs.length} Wagons Successfully Discharged at {sName(trip.destination)}!
            </p>
            <button
              onClick={completeTrip}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black text-sm py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Complete Consignment & Return Wagons to Fleet Inventory</span>
            </button>
          </div>
        )}
      </div>

      {stoppingUnloadWagon && (
        <Modal onClose={() => setStoppingUnloadWagon(null)}>
          <div className="p-6 space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Unloading Discrepancy &amp; Inspection Audit
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Wagon <strong>{stoppingUnloadWagon.wagonId}</strong> arrived from <strong>{sName(trip.origin)}</strong>. Record delivered bags, damages, burst bags, and notes.
                </p>
              </div>
              <button onClick={() => setStoppingUnloadWagon(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmStopUnloading} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Unload Start Time</label>
                  <input
                    type="text"
                    value={unloadForm.unloadStartTimeEdit}
                    onChange={(e) => setUnloadForm({ ...unloadForm, unloadStartTimeEdit: e.target.value })}
                    className={`${ic} font-mono`}
                    placeholder="02:15 PM"
                  />
                </div>
                <div>
                  <label className={lc}>Concluding Time</label>
                  <input
                    type="text"
                    value={unloadForm.unloadEndTimeEdit}
                    onChange={(e) => setUnloadForm({ ...unloadForm, unloadEndTimeEdit: e.target.value })}
                    className={`${ic} font-mono`}
                    placeholder="04:00 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lc}>Delivered Intact *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={unloadForm.correctQty}
                    onChange={(e) => setUnloadForm({ ...unloadForm, correctQty: e.target.value })}
                    className={`${ic} font-mono font-bold text-emerald-700`}
                  />
                </div>
                <div>
                  <label className={lc}>Damaged Quantity *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={unloadForm.damageQty}
                    onChange={(e) => setUnloadForm({ ...unloadForm, damageQty: e.target.value })}
                    className={`${ic} font-mono font-bold text-rose-600`}
                  />
                </div>
                <div>
                  <label className={lc}>Burst Bags Count *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={unloadForm.burstBags}
                    onChange={(e) => setUnloadForm({ ...unloadForm, burstBags: e.target.value })}
                    className={`${ic} font-mono font-bold text-amber-700`}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900">Flag Discrepancy for this Wagon?</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="complaint"
                        checked={!unloadForm.hasComplaint}
                        onChange={() => setUnloadForm({ ...unloadForm, hasComplaint: false })}
                      />
                      <span className="text-emerald-700">NO (Clean Discharge)</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="complaint"
                        checked={unloadForm.hasComplaint}
                        onChange={() => setUnloadForm({ ...unloadForm, hasComplaint: true })}
                      />
                      <span className="text-rose-600">YES (Log Discrepancy)</span>
                    </label>
                  </div>
                </div>

                {unloadForm.hasComplaint && (
                  <div>
                    <label className={lc}>Reason for Wagon Complaint / Discrepancy *</label>
                    <textarea
                      required
                      rows={2}
                      value={unloadForm.complaintNotes}
                      onChange={(e) => setUnloadForm({ ...unloadForm, complaintNotes: e.target.value })}
                      placeholder="Describe exact cause of damage/burst bags for insurance audit..."
                      className={`${ic} resize-none`}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoppingUnloadWagon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md"
                >
                  Save &amp; Complete Unload
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      <CustomAlertModal
        isOpen={!!customAlert}
        message={customAlert?.message || null}
        title={customAlert?.title}
        onClose={() => setCustomAlert(null)}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FUND REQUEST DETAIL & CONVERSATION MODAL
───────────────────────────────────────────────────────── */
function FundRequestDetailModal({
  req,
  user,
  onClose,
  onSaveRequests,
  allRequests,
}: {
  req: any;
  user: any;
  onClose: () => void;
  onSaveRequests: (r: any[]) => void;
  allRequests: any[];
}) {
  const [chatInput, setChatInput] = useState('');

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: user?.fullName || 'Cargo Officer',
      role: 'Cargo Officer',
      msg: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = allRequests.map((r: any) =>
      r.id === req.id
        ? {
            ...r,
            conversation: [...(r.conversation || []), newMsg],
          }
        : r
    );

    onSaveRequests(updated);
    setChatInput('');
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6 space-y-4 font-sans">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-[#0E4B88] text-sm">{req.id}</span>
              <Badge text={req.stage} color={stageColor(req.stage)} />
            </div>
            <h3 className="text-base font-black text-slate-900 mt-1">{req.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Amount</span>
            <span className="font-mono font-black text-slate-900 text-base">₦{Number(req.amount).toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Category</span>
            <span className="font-bold text-slate-800">{req.category}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Originating Station</span>
            <span className="font-bold text-slate-800">{sName(req.station)}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-extrabold text-slate-400 block">Associated Trip</span>
            <span className="font-mono font-bold text-[#0E4B88]">{req.tripNo || 'TRIP-001'}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-slate-900 mb-2">Audit &amp; Approval Conversation Log</h4>
          <div className="bg-slate-50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 border border-slate-200 text-xs">
            {(req.conversation || []).map((m: any, idx: number) => (
              <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                  <span className="font-bold text-slate-800">
                    {m.sender} <span className="font-medium text-slate-400">({m.role})</span>
                  </span>
                  <span>{m.time}</span>
                </div>
                <p className="text-slate-700 text-xs">{m.msg}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type field reply or message to Head of Finance..."
            className={`${ic} flex-1`}
          />
          <button
            type="submit"
            className="bg-[#62BC37] hover:bg-[#52A02D] text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </Modal>
  );
}
