'use client';

import dynamic from 'next/dynamic';

import { shouldPoll, onReturnToForeground } from '@/lib/polling';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StateEngine, SEED_WAGONS, OFFICIAL_PXG_CODES } from '@/lib/services/StateEngine';
import {
  Train,
  Search,
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
  MapPin,
  Building2,
  DollarSign,
  X,
  Radio,
  Compass,
  Layers,
  LogOut,
  Menu,
  Check,
  Send,
} from 'lucide-react';

/*
 * The heavy shared views load on demand.
 *
 * A cargo officer opens the GPS map or the container yard occasionally, not on
 * every sign-in, and the map pulls in Leaflet. Importing them statically here
 * would also undo the splitting done in AdminPortal, because a static import
 * anywhere pulls the module into the common chunk for everyone.
 */
const ViewLoading = () => (
  <div className="flex h-48 items-center justify-center" role="status" aria-live="polite">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
    <span className="sr-only">Loading view…</span>
  </div>
);

const LiveGpsMap = dynamic(() => import('@/components/LiveGpsMap').then((m) => m.LiveGpsMap), { ssr: false, loading: ViewLoading });
const MoniyaContainerView = dynamic(() => import('@/components/MoniyaContainerView').then((m) => m.MoniyaContainerView), { loading: ViewLoading });
const TerminalInformationView = dynamic(() => import('@/components/TerminalInformationView').then((m) => m.TerminalInformationView), { loading: ViewLoading });

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

const ic = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand';
const lc = 'block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1';

function Badge({ text, color }: { text: string; color?: string }) {
  const c = color || 'amber';
  const cls: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 font-sans text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-brand mx-auto flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {title || 'System Notification'}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{message}</p>
        <button
          onClick={onClose}
          className="w-full bg-brand hover:bg-brand-dark text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
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
      <Clock className="w-4 h-4 animate-spin text-brand" />
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedUnloadTripId, setSelectedUnloadTripId] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  const [deals, setDeals] = useState<any[]>(() => StateEngine.getDeals());
  const [trips, setTrips] = useState<any[]>(() => StateEngine.getTrips());
  const [requests, setRequests] = useState<any[]>(() => StateEngine.getRequests());
  const [wagons, setWagons] = useState<any[]>(() => {
    const w = StateEngine.getWagons();
    return w && w.length > 0 ? w : SEED_WAGONS;
  });

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

  const syncData = () => {
    const liveDeals = StateEngine.getDeals();
    const liveTrips = StateEngine.getTrips();
    const liveWagons = StateEngine.getWagons();
    const liveRequests = StateEngine.getRequests();

    setDeals(liveDeals);
    setTrips(liveTrips);
    setWagons(liveWagons && liveWagons.length > 0 ? liveWagons : SEED_WAGONS);
    setRequests(liveRequests);
  };

  useEffect(() => {
    syncData();
    StateEngine.syncRemote();
    const refresh = () => {
      StateEngine.syncRemote();
      syncData();
    };

    // Skipped while the tab is hidden or the browser is offline; see lib/polling.
    const interval = setInterval(() => {
      if (!shouldPoll()) return;
      refresh();
    }, 5000);
    const stopForegroundWatch = onReturnToForeground(refresh);

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
      stopForegroundWatch();
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('bueno_state_updated', handleUpdate);
    };
  }, []);

  // Fleet calculation — dynamically computes live availability from active trips
  const dynamicFleet = StateEngine.getDynamicWagonFleet(trips);
  const fleetWagons = dynamicFleet.wagons;

  // Inclusive deal and trip views — ensures NO deal created from Admin is ever hidden
  const myDeals = deals.filter((d) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED');
  const myTrips = trips.filter((t) => t.status === 'LOADING' || t.status === 'PENDING_DISPATCH');
  const myInTransit = trips.filter((t) => t.status === 'IN_TRANSIT' || t.status === 'RETURNING_EMPTY');
  const myIncomingUnload = trips.filter(
    (t) => (t.status === 'IN_TRANSIT' || t.status === 'UNLOADING' || t.status === 'ARRIVED' || t.destination === station) && !t.isReturnLeg
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
      origin: createDeal.loadingStation || createDeal.origin || station,
      destination: createDeal.destination || 'MNY',
      cargoType: createDeal.cargoType || 'Bagged Cement (50kg)',
      quantity: totalBags,
      targetWagonsCount,
      status: 'LOADING',
      createdAt: formattedCreated,
      wagonLogs: [],
    };

    const updatedTrips = [newTrip, ...trips];
    saveTrips(updatedTrips);

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

    try {
      const notifPayload = {
        id: `ntf_${Date.now()}`,
        title: `Trip Initiated: ${newTrip.tripId}`,
        message: `Locomotive ${newTrip.locomotiveId} assigned for ${newTrip.company}. Wagon loading initiated.`,
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
    setSelectedTripId(newTrip.id);
  };

  // 2. Register New Wagon
  const handleRegisterWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = newWagonId.trim().toUpperCase() || `PXG ${Math.floor(9000 + Math.random() * 999)}`;
    if (fleetWagons.some((w: any) => w.id === wId)) {
      setCustomAlert({
        title: 'Wagon Already Registered',
        message: `Wagon ${wId} is already registered in the fleet inventory!`,
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
    saveWagons([...fleetWagons, newW]);
    setNewWagonId('');
    setAddWagonModal(false);
    setCustomAlert({
      title: 'Wagon Registered',
      message: `Wagon ${wId} registered successfully at ${sName(station)} Terminal!`,
    });
  };

  // 3. Fund Request
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
    { key: 'wagons', label: `Wagon Fleet (${fleetWagons.length})`, icon: Layers },
    { key: 'funds', label: 'Request Funds', icon: DollarSign },
    { key: 'terminal_info', label: 'Terminal Info Ledger', icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* ── CLEAN CORPORATE WHITE HEADER (MATCHING BUENO OS IDENTITY) ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-slate-600 hover:text-slate-900 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src="/bueno_logo.png"
                alt="Bueno Logistics"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-sm font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  BUENO LOGISTICS
                </h1>
                <span className="text-[10px] font-mono text-slate-400 block -mt-0.5 uppercase tracking-widest font-bold">
                  CARGO COMMAND DISPATCH
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="text-xs font-black text-slate-700">{sName(station)}</span>
              <span className="text-[10px] font-mono text-slate-400">({station})</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-black text-slate-900 block">{user?.fullName || 'Cargo Officer'}</span>
              <span className="text-[10px] font-mono text-brand font-bold block">
                {user?.staffId ? `ID: ${user.staffId}` : 'Station Field Officer'}
              </span>
            </div>

            <button
              onClick={onSignOut}
              className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-extrabold text-xs px-4 py-2 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── TWO-COLUMN WORKSPACE: LEFT SIDEBAR + MAIN VIEW ── */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-64px)]">
        {/* LEFT SIDEBAR NAVIGATION */}
        {sidebarOpen && (
          <aside className="w-64 sm:w-72 bg-white border-r border-slate-200 p-4 space-y-4 shrink-0 transition-all sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
            <div className="px-2 pt-1">
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-slate-400">
                OPERATIONAL DESK
              </span>
            </div>

            <nav className="space-y-1">
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
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'bg-brand text-white shadow-sm font-black'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1 mt-6">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <MapPin className="w-3.5 h-3.5 text-brand" />
                <span>Station Duty Node</span>
              </div>
              <p className="text-xs font-black text-slate-900">{sName(station)}</p>
              <p className="text-[10px] text-slate-400">Rolling Stock: 46 Covered Wagons</p>
            </div>
          </aside>
        )}

        {/* MAIN OPERATIONAL WORKSPACE */}
        <main id="main-content" className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
          {selectedTripId ? (
            /* ACTIVE PER-WAGON TIMED LOADING DASHBOARD */
            <TripWagonView
              tripId={selectedTripId}
              trips={trips}
              wagons={fleetWagons}
              onBack={() => setSelectedTripId(null)}
              onSaveTrips={saveTrips}
            />
          ) : selectedUnloadTripId ? (
            /* DESTINATION DISCHARGE & AUDIT DASHBOARD */
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
                  subtitle={`Approved freight deals allocated for loading — click 'Create Trip' to configure consist & start timed wagon loading`}
                >
                  <TableWrap
                    headers={['Deal ID', 'Client / Consignor', 'Route Corridor', 'Cargo Spec & Bags', 'Action']}
                    mobileCard={(d: any) => (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-navy">{d.dealNumber || d.id}</span>
                          <span className="text-xs font-bold text-slate-700">
                            {sName(d.loadingStation || d.origin || station)} ➔ {sName(d.destination || 'MNY')}
                          </span>
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
                              selectedWagon: fleetWagons[0]?.id || 'PXG 09029',
                              qty: String(d.quantity || 27600),
                            }));
                          }}
                          className="w-full bg-brand hover:bg-brand-dark text-white font-black text-xs py-2.5 rounded-xl mt-2 shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
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
                        <td colSpan={5} className="p-12 text-center bg-white">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-brand mx-auto flex items-center justify-center shadow-xs">
                              <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h4 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              Loading Siding Ready & Operational
                            </h4>
                            <p className="text-xs text-slate-500">
                              No active freight deals in queue right now. Deals registered in the Admin Portal will appear here immediately for trip creation.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      myDeals.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-mono font-black text-navy">{d.dealNumber || d.id}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900">{d.company}</p>
                            <p className="text-[10px] text-slate-400">Approved Commercial Contract</p>
                          </td>
                          <td className="p-4 text-slate-700 font-semibold">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-slate-800">{sName(d.loadingStation || d.origin || station)}</span>
                              <span className="text-slate-400">➔</span>
                              <span className="font-bold text-navy">{sName(d.destination || 'MNY')}</span>
                            </div>
                          </td>
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
                                  selectedWagon: fleetWagons[0]?.id || 'PXG 09029',
                                  qty: String(d.quantity || 27600),
                                }));
                              }}
                              className="bg-brand hover:bg-brand-dark text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
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
                  subtitle="Active trips in loading phase — click any trip row to enter the timed wagon loading dashboard"
                >
                  <TableWrap
                    headers={['Trip ID', 'Cargo Officer', 'Company / Cargo', 'Route Corridor', 'Wagons Loaded', 'Action']}
                    mobileCard={(t: any) => {
                      const loaded = (t.wagonLogs || []).filter((w: any) => w.status === 'LOADED').length;
                      return (
                        <button type="button" className="space-y-2 cursor-pointer w-full text-left" onClick={() => setSelectedTripId(t.id)}>
                          <span className="flex justify-between items-center">
                            <span className="font-mono font-black text-navy">{t.tripId}</span>
                            <span className="font-mono font-bold text-brand text-xs">
                              {loaded} / {t.targetWagonsCount || 23} Loaded
                            </span>
                          </span>
                          <span className="block font-bold text-slate-900">{t.company}</span>
                          <span className="block text-xs text-slate-600">
                            {sName(t.origin)} ➔ {sName(t.destination)}
                          </span>
                          <span className="text-xs font-bold text-navy pt-1 flex items-center gap-1">
                            <span>Open Wagon Loading Console</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
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
                            <td className="p-4 font-mono font-black text-navy">{t.tripId}</td>
                            <td className="p-4 font-bold text-slate-900">{t.cargoOfficerName}</td>
                            <td className="p-4">
                              <p className="font-bold text-slate-900">{t.company}</p>
                              <p className="text-[10px] text-slate-500">{t.cargoType}</p>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">
                              {sName(t.origin)} ➔ {sName(t.destination)}
                            </td>
                            <td className="p-4 font-mono font-bold text-brand">
                              {loaded} / {t.targetWagonsCount || 23} Wagons
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-bold text-navy hover:underline flex items-center gap-1">
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
                    subtitle="Active train consists currently running along the Lagos-Ibadan corridor"
                  >
                    <TableWrap
                      headers={['Trip ID', 'Company', 'Locomotive', 'Route', 'Status', 'Action']}
                      mobileCard={(t: any) => (
                        <button type="button" className="space-y-2 cursor-pointer w-full text-left" onClick={() => setSelectedTripId(t.id)}>
                          <span className="flex justify-between items-center">
                            <span className="font-mono font-black text-navy">{t.tripId}</span>
                            <Badge text={t.status} color="green" />
                          </span>
                          <span className="block font-bold text-slate-900">{t.company}</span>
                          <span className="block text-xs font-mono text-slate-700">Loco: {t.locomotiveId}</span>
                          <span className="block text-xs text-slate-600">
                            {sName(t.origin)} ➔ {sName(t.destination)}
                          </span>
                          <span className="text-xs font-bold text-brand pt-1 flex items-center gap-1">
                            <span>Inspect Consist &amp; Telemetry</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
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
                            <td className="p-4 font-mono font-black text-navy">{t.tripId}</td>
                            <td className="p-4 font-bold text-slate-900">{t.company}</td>
                            <td className="p-4 font-mono text-slate-800 font-bold">{t.locomotiveId}</td>
                            <td className="p-4 text-slate-600 font-medium">
                              {sName(t.origin)} ➔ {sName(t.destination)}
                            </td>
                            <td className="p-4">
                              <Badge text={t.status} color="green" />
                            </td>
                            <td className="p-4 font-bold text-brand hover:underline">Inspect Consist & GPS ➔</td>
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
                            <span className="font-mono font-black text-navy">{t.tripId}</span>
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
                            <td className="p-4 font-mono font-black text-navy">{t.tripId}</td>
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
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1 transition-all cursor-pointer"
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
                  title={`Wagon Fleet Inventory (${dynamicFleet.totalCount} Registered Wagons)`}
                  subtitle="Enterprise rolling stock fleet — official PXG covered hoppers dynamically synchronized with active corridor trips"
                  action={
                    <button
                      onClick={() => setAddWagonModal(true)}
                      className="bg-brand hover:bg-brand-dark text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register New Wagon</span>
                    </button>
                  }
                >
                  {/* DYNAMIC FLEET KPI CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 shadow-xs">
                      <span className="text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider block">
                        Available for Loading
                      </span>
                      <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                        {dynamicFleet.availableCount}{' '}
                        <span className="text-xs font-bold text-emerald-700 font-sans">Wagons Ready</span>
                      </p>
                    </div>
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 shadow-xs">
                      <span className="text-[10px] font-mono font-bold text-amber-800 uppercase tracking-wider block">
                        Coupled / In-Use on Trips
                      </span>
                      <p className="text-2xl font-black text-amber-900 mt-1 font-mono">
                        {dynamicFleet.inUseCount}{' '}
                        <span className="text-xs font-bold text-amber-700 font-sans">Wagons Engaged</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
                      <span className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider block">
                        Total Fleet Inventory
                      </span>
                      <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                        {dynamicFleet.totalCount}{' '}
                        <span className="text-xs font-bold text-slate-600 font-sans">Covered Hoppers</span>
                      </p>
                    </div>
                  </div>

                  <TableWrap
                    headers={['Wagon ID', 'Carriage Spec', 'Capacity (Bags / MT)', 'Live Status', 'Active Corridor Assignment', 'Current Station', 'Added By']}
                    mobileCard={(w: any) => {
                      const isAvail = w.status === 'AVAILABLE';
                      const badgeColor = isAvail
                        ? 'green'
                        : w.status === 'RETURNING_EMPTY'
                        ? 'blue'
                        : w.status === 'UNLOADING'
                        ? 'purple'
                        : 'amber';
                      const badgeText = isAvail
                        ? 'AVAILABLE'
                        : w.activeTripId
                        ? `${w.status} (${w.activeTripId})`
                        : w.status;

                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-mono font-black text-slate-900 text-sm">{w.id}</span>
                            <Badge text={badgeText} color={badgeColor as any} />
                          </div>
                          <p className="text-xs text-slate-600">
                            Capacity: {w.capacity || 1200} Bags (60 MT) | Station: {sName(w.currentStation || station)}
                          </p>
                          {w.activeTripId && (
                            <p className="text-[11px] font-mono text-amber-800 font-bold bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              Trip {w.activeTripId}: {w.activeRoute} ({w.activeCargo})
                            </p>
                          )}
                        </div>
                      );
                    }}
                    data={fleetWagons}
                  >
                    {fleetWagons.map((w: any) => {
                      const isAvail = w.status === 'AVAILABLE';
                      const badgeColor = isAvail
                        ? 'green'
                        : w.status === 'RETURNING_EMPTY'
                        ? 'blue'
                        : w.status === 'UNLOADING'
                        ? 'purple'
                        : 'amber';
                      const badgeText = isAvail
                        ? 'AVAILABLE'
                        : w.activeTripId
                        ? `${w.status} (${w.activeTripId})`
                        : w.status;

                      return (
                        <tr key={w.id} className="hover:bg-slate-50 text-xs">
                          <td className="p-4 font-mono font-black text-slate-900 text-sm">{w.id}</td>
                          <td className="p-4 text-slate-700 font-semibold">{w.wagonType || 'Covered Hopper'}</td>
                          <td className="p-4 font-mono font-bold text-slate-700">
                            {Number(w.capacity || 1200).toLocaleString()} Bags (60 MT)
                          </td>
                          <td className="p-4">
                            <Badge text={badgeText} color={badgeColor as any} />
                          </td>
                          <td className="p-4 font-mono">
                            {w.activeTripId ? (
                              <span className="text-[11px] font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 block">
                                {w.activeTripId} • {w.activeRoute}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Standing at Siding (Uncoupled)</span>
                            )}
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
                      className="bg-brand hover:bg-brand-dark text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Request Funds</span>
                    </button>
                  }
                >
                  <TableWrap
                    headers={['Req ID', 'Title & Category', 'Amount (₦)', 'Current Stage', 'Action']}
                    mobileCard={(r: any) => (
                      <button type="button" className="space-y-2 cursor-pointer w-full text-left" onClick={() => setSelectedReq(r)}>
                        <span className="flex justify-between items-center">
                          <span className="font-mono font-black text-navy">{r.id}</span>
                          <Badge text={r.stage} color={stageColor(r.stage)} />
                        </span>
                        <span className="block font-bold text-slate-900">{r.title}</span>
                        <span className="block text-xs font-mono font-black text-emerald-700">₦{Number(r.amount).toLocaleString()}</span>
                        <span className="text-xs font-bold text-navy pt-1 flex items-center gap-1">
                          <span>Inspect Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </button>
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
                            <td className="p-4 font-mono font-black text-navy">{r.id}</td>
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
                            <td className="p-4 font-bold text-navy hover:underline">Inspect Details & Chat ➔</td>
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
      </div>

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
                  <span className="font-bold text-slate-900">
                    {sName(createDeal.loadingStation || createDeal.origin || station)} ➔ {sName(createDeal.destination || 'MNY')}
                  </span>
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
                  <span className="font-mono font-black text-navy">
                    {Math.min(23, Math.max(1, Math.ceil((Number(createDeal.quantity) || 27600) / 1200)))} Covered Wagons (Max 23)
                  </span>
                </div>
              </div>

              <div>
                <label className={lc} htmlFor="cargo-officer-port-assigned-locomotive-id-1">Assigned Locomotive ID *</label>
                <input id="cargo-officer-port-assigned-locomotive-id-1"
                  required
                  value={tripForm.locomotiveId}
                  onChange={(e) => setTripForm({ ...tripForm, locomotiveId: e.target.value })}
                  placeholder="e.g. L2205"
                  className={`${ic} font-mono font-black uppercase`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc} htmlFor="cargo-officer-port-loading-date-2">Loading Date *</label>
                  <input id="cargo-officer-port-loading-date-2"
                    required
                    value={tripForm.loadingDate}
                    onChange={(e) => setTripForm({ ...tripForm, loadingDate: e.target.value })}
                    className={`${ic} font-mono`}
                  />
                </div>
                <div>
                  <label className={lc} htmlFor="cargo-officer-port-start-time-3">Start Time *</label>
                  <input id="cargo-officer-port-start-time-3"
                    required
                    value={tripForm.startTime}
                    onChange={(e) => setTripForm({ ...tripForm, startTime: e.target.value })}
                    className={`${ic} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={lc} htmlFor="cargo-officer-port-locomotive-train-driver-4">Locomotive Train Driver *</label>
                <input id="cargo-officer-port-locomotive-train-driver-4"
                  required
                  value={tripForm.driverName}
                  onChange={(e) => setTripForm({ ...tripForm, driverName: e.target.value })}
                  placeholder="e.g. Engr. Kabiru Usman (NRC-DRV-102)"
                  className={ic}
                />
              </div>

              <div>
                <label className={lc} htmlFor="cargo-officer-port-train-crew-members-5">Train Crew Members *</label>
                <input id="cargo-officer-port-train-crew-members-5"
                  required
                  value={tripForm.crewMembers}
                  onChange={(e) => setTripForm({ ...tripForm, crewMembers: e.target.value })}
                  placeholder="e.g. Sani Bello, Timothy Danjuma"
                  className={ic}
                />
              </div>

              <div>
                <label className={lc} htmlFor="cargo-officer-port-monitoring-cargo-officer-6">Monitoring Cargo Officer *</label>
                <input id="cargo-officer-port-monitoring-cargo-officer-6"
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
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
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
              <button onClick={() => setAddWagonModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRegisterWagon} className="space-y-4">
              <div>
                <label className={lc} htmlFor="cargo-officer-port-wagon-identification-code-7">Wagon Identification Code *</label>
                <input id="cargo-officer-port-wagon-identification-code-7"
                  required
                  placeholder="e.g. PXG 09070"
                  value={newWagonId}
                  onChange={(e) => setNewWagonId(e.target.value)}
                  className={`${ic} font-mono uppercase font-bold`}
                />
                <p className="text-[10px] text-slate-400 mt-1">Enter PXG wagon identification code.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc} htmlFor="cargo-officer-port-carriage-type-8">Carriage Type</label>
                  <input id="cargo-officer-port-carriage-type-8" readOnly value="PXG Covered Hopper Wagon" className={`${ic} bg-slate-100 text-slate-600`} />
                </div>
                <div>
                  <label className={lc} htmlFor="cargo-officer-port-standard-capacity-9">Standard Capacity</label>
                  <input id="cargo-officer-port-standard-capacity-9" readOnly value="1,200 Bags (60 MT)" className={`${ic} bg-slate-100 text-slate-600 font-mono`} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddWagonModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
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
              <button onClick={() => setFundsModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleFundRequest} className="space-y-3">
              <div>
                <label className={lc} htmlFor="cargo-officer-port-requisition-title-10">Requisition Title *</label>
                <input id="cargo-officer-port-requisition-title-10"
                  required
                  placeholder="e.g. Tarpaulin Covering & Lashing Consignment"
                  value={fundForm.title}
                  onChange={(e) => setFundForm({ ...fundForm, title: e.target.value })}
                  className={ic}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc} htmlFor="cargo-officer-port-category-11">Category *</label>
                  <select id="cargo-officer-port-category-11"
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
                  <label className={lc} htmlFor="cargo-officer-port-amount-requested-12">Amount Requested (₦) *</label>
                  <input id="cargo-officer-port-amount-requested-12"
                    required
                    type="number"
                    value={fundForm.amount}
                    onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                    className={`${ic} font-mono font-bold`}
                  />
                </div>
              </div>
              <div>
                <label className={lc} htmlFor="cargo-officer-port-associated-trip-number-13">Associated Trip Number</label>
                <input id="cargo-officer-port-associated-trip-number-13"
                  value={fundForm.tripNo}
                  onChange={(e) => setFundForm({ ...fundForm, tripNo: e.target.value })}
                  placeholder="e.g. TRIP-001"
                  className={`${ic} font-mono`}
                />
              </div>
              <div>
                <label className={lc} htmlFor="cargo-officer-port-justification-operational-details-14">Justification & Operational Details *</label>
                <textarea id="cargo-officer-port-justification-operational-details-14"
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
                  className="px-4 py-2 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md cursor-pointer"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* FUND REQUEST DETAIL MODAL */}
      {selectedReq && (
        <FundRequestDetailModal
          req={selectedReq}
          user={user}
          onClose={() => setSelectedReq(null)}
          onSaveRequests={saveRequests}
          allRequests={requests}
        />
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
   TRIP WAGON LOADING DASHBOARD (Origin Loading Station)
   Concurrent Multi-Wagon Loading & Multi-Feeder Truck Audit
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
  const [wagonSearch, setWagonSearch] = useState('');
  const [isCustomWagon, setIsCustomWagon] = useState(false);
  const [customWagonId, setCustomWagonId] = useState('');
  const [stoppingWagon, setStoppingWagon] = useState<any | null>(null);
  const [bagsLoadedInput, setBagsLoadedInput] = useState('1200');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // Commodity unit detection
  const isBulkTonnes =
    trip?.cargoType?.toLowerCase().includes('gypsum') ||
    trip?.cargoType?.toLowerCase().includes('limestone') ||
    trip?.cargoType?.toLowerCase().includes('clinker') ||
    trip?.unitOfMeasure?.includes('MT') ||
    trip?.unitOfMeasure?.includes('Tonne');
  const unitLabel = isBulkTonnes ? 'Metric Tonnes (MT)' : 'Bags';
  const unitShort = isBulkTonnes ? 'MT' : 'Bags';
  const defaultCapacity = isBulkTonnes ? 60 : 1200;

  // Multi-feeder trucks form state for current wagon
  const [sourceBay, setSourceBay] = useState('Silo Bay 1 - Loading Siding');
  const [startTimeEdit, setStartTimeEdit] = useState('');
  const [endTimeEdit, setEndTimeEdit] = useState('');
  const [feederTrucks, setFeederTrucks] = useState<
    Array<{
      truckRegNo: string;
      driverName: string;
      phone: string;
      transporter: string;
      qtyContributed: string;
    }>
  >([
    {
      truckRegNo: 'KJA-482-XY',
      driverName: 'Ibrahim Garba',
      phone: '08031112233',
      transporter: 'Dangote Logistics Fleet',
      qtyContributed: String(defaultCapacity),
    },
  ]);

  if (!trip) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Trip not found.{' '}
        <button onClick={onBack} className="underline text-brand font-bold">
          Go back
        </button>
      </div>
    );
  }

  const totalReqQty = Number(trip.quantity) || (isBulkTonnes ? 1380 : 27600);
  const targetCount = trip.targetWagonsCount || Math.min(23, Math.max(1, Math.ceil(totalReqQty / defaultCapacity)));

  const loadedLogs = logs.filter((w: any) => w.status === 'LOADED');
  const loadedCount = loadedLogs.length;
  const activeLoadingWagons = logs.filter((w: any) => w.status === 'LOADING');
  const totalQtyLoadedSoFar = loadedLogs.reduce((acc: number, w: any) => acc + (Number(w.qty) || 0), 0);
  const allDone = loadedCount >= targetCount;
  const pct = Math.min(100, Math.round((loadedCount / targetCount) * 100));

  // Full 46 PXG Covered Hoppers Rolling Stock Fleet
  const baseFleet =
    wagons && wagons.length > 0
      ? wagons
      : OFFICIAL_PXG_CODES.map((id) => ({
          id,
          capacity: defaultCapacity,
          wagonType: 'Covered Hopper Wagon',
          currentStation: trip.origin || 'EWK',
        }));

  const usedInThisTrip = new Set(logs.map((w: any) => w.wagonId));
  const availableFleetWagons = baseFleet.filter((w: any) => !usedInThisTrip.has(w.id));

  const filteredWagons = availableFleetWagons.filter(
    (w: any) =>
      w.id.toLowerCase().includes(wagonSearch.toLowerCase()) ||
      (w.currentStation && w.currentStation.toLowerCase().includes(wagonSearch.toLowerCase()))
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

  const startLoadingWagon = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTripInTransit) {
      setCustomAlert({
        title: 'Loading Locked',
        message: 'Trip is already in transit or completed! Wagon loading is locked.',
      });
      return;
    }

    let targetWagonId = '';
    if (isCustomWagon) {
      targetWagonId = customWagonId.trim().toUpperCase();
      if (!targetWagonId) {
        setCustomAlert({
          title: 'Wagon ID Required',
          message: 'Please enter a valid custom wagon registration number!',
        });
        return;
      }
      // Register custom wagon to SQL StateEngine
      StateEngine.registerWagon({
        id: targetWagonId,
        wagonType: isBulkTonnes ? 'Open Top Gondola Wagon' : 'Covered Hopper Wagon',
        payloadCapacity: `${defaultCapacity} ${unitShort}`,
        capacity: defaultCapacity,
        status: 'IN_USE',
        currentStation: trip.origin || 'EWK',
        gauge: 'STANDARD_GAUGE',
        addedBy: 'Cargo Officer (Field)',
        createdAt: new Date().toLocaleDateString('en-GB'),
      });
    } else {
      targetWagonId = selWagon || availableFleetWagons[0]?.id;
    }

    if (!targetWagonId) {
      setCustomAlert({
        title: 'No Wagon Selected',
        message: 'Please select an available wagon or enter a custom wagon number.',
      });
      return;
    }

    if (logs.some((w: any) => w.wagonId === targetWagonId)) {
      setCustomAlert({
        title: 'Wagon Already Added',
        message: `Wagon ${targetWagonId} is already in the loading queue for this trip.`,
      });
      return;
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newLog = {
      id: `wl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      wagonId: targetWagonId,
      startTimestamp: Date.now(),
      startDate: formattedDate,
      startTime: formattedTime,
      endDate: null,
      endTime: null,
      durationStr: null,
      qty: null,
      unitOfMeasure: unitShort,
      sourceEnv: sourceBay,
      feederTrucks: [],
      status: 'LOADING',
      unloadStatus: 'PENDING_UNLOAD',
    };

    commitLogs([...logs, newLog], 'LOADING');
    setAdding(false);
    setSelWagon('');
    setCustomWagonId('');
    setIsCustomWagon(false);
    setWagonSearch('');
  };

  const handleOpenStopModal = (w: any) => {
    const remaining = Math.max(0, totalReqQty - totalQtyLoadedSoFar);
    const defaultQty = remaining > 0 && remaining < defaultCapacity ? remaining : defaultCapacity;
    setBagsLoadedInput(String(defaultQty));
    setSourceBay(w.sourceEnv || 'Silo Bay 1 - Loading Siding');
    setStartTimeEdit(w.startTime || '08:30 AM');
    setEndTimeEdit(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    if (w.feederTrucks && Array.isArray(w.feederTrucks) && w.feederTrucks.length > 0) {
      setFeederTrucks(
        w.feederTrucks.map((ft: any) => ({
          truckRegNo: ft.truckRegNo || '',
          driverName: ft.driverName || '',
          phone: ft.phone || '',
          transporter: ft.transporter || '',
          qtyContributed: String(ft.qtyContributed || ''),
        }))
      );
    } else {
      setFeederTrucks([
        {
          truckRegNo: w.truckRegNo || 'KJA-482-XY',
          driverName: w.driverDetails?.split('(')[0]?.trim() || 'Ibrahim Garba',
          phone: w.driverDetails?.match(/\((.*?)\)/)?.[1] || '08031112233',
          transporter: w.transporter || 'Dangote Logistics Fleet',
          qtyContributed: String(defaultQty),
        },
      ]);
    }
    setStoppingWagon(w);
  };

  const handleAddFeederTruck = () => {
    setFeederTrucks([
      ...feederTrucks,
      {
        truckRegNo: '',
        driverName: '',
        phone: '',
        transporter: 'Bueno Logistics Fleet',
        qtyContributed: '',
      },
    ]);
  };

  const handleRemoveFeederTruck = (idx: number) => {
    if (feederTrucks.length <= 1) return;
    setFeederTrucks(feederTrucks.filter((_, i) => i !== idx));
  };

  const handleUpdateFeederTruck = (idx: number, field: string, value: string) => {
    const updated = [...feederTrucks];
    updated[idx] = { ...updated[idx], [field]: value };
    setFeederTrucks(updated);

    // Auto-recalculate total wagon payload from the sum of feeder trucks
    const sum = updated.reduce((acc, t) => acc + (Number(t.qtyContributed) || 0), 0);
    if (sum > 0) {
      setBagsLoadedInput(String(sum));
    }
  };

  const confirmStopLoading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingWagon) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = endTimeEdit || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mins = Math.max(1, Math.round((Date.now() - (stoppingWagon.startTimestamp || Date.now())) / 60000));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationStr = hours > 0 ? `${hours}h ${remMins}m` : `${mins} Minutes`;

    const finalLoadedQty = Number(bagsLoadedInput) || defaultCapacity;

    const formattedFeederTrucks = feederTrucks.map((ft) => ({
      truckRegNo: ft.truckRegNo.trim().toUpperCase() || 'N/A',
      driverName: ft.driverName.trim() || 'N/A',
      phone: ft.phone.trim() || 'N/A',
      transporter: ft.transporter.trim() || 'Logistics Fleet',
      qtyContributed: Number(ft.qtyContributed) || Math.round(finalLoadedQty / feederTrucks.length),
    }));

    const primaryTruck = formattedFeederTrucks[0];

    const updated = logs.map((w: any) => {
      if (w.id !== stoppingWagon.id) return w;
      return {
        ...w,
        startTime: startTimeEdit || w.startTime,
        endDate: formattedDate,
        endTime: formattedTime,
        durationStr,
        qty: finalLoadedQty,
        unitOfMeasure: unitShort,
        sourceEnv: sourceBay,
        truckRegNo: formattedFeederTrucks.map((t) => t.truckRegNo).join(', '),
        driverDetails: formattedFeederTrucks.map((t) => `${t.driverName} (${t.phone})`).join('; '),
        transporter: primaryTruck?.transporter || 'Rail Haulage Fleet',
        feederTrucks: formattedFeederTrucks,
        status: 'LOADED',
        unloadStatus: 'PENDING_UNLOAD',
      };
    });

    commitLogs(updated);
    setStoppingWagon(null);
  };

  const dispatchAndActivateGps = async () => {
    if (activeLoadingWagons.length > 0) {
      setCustomAlert({
        title: 'Wagons Still Loading',
        message: `There are ${activeLoadingWagons.length} wagon(s) currently loading (${activeLoadingWagons.map((w) => w.wagonId).join(', ')}). Please finalize all active wagons before dispatching the train.`,
      });
      return;
    }
    if (loadedCount < 1) {
      setCustomAlert({
        title: 'No Wagons Loaded',
        message: 'Please load at least 1 wagon before dispatching the trip!',
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
    } catch (e) {}

    const notifPayload = {
      id: `ntf_${Date.now()}`,
      title: 'Train Departed Origin Station',
      message: `Locomotive ${trip.locomotiveId} with ${loadedCount} wagons (${totalQtyLoadedSoFar.toLocaleString()} ${unitShort}) departed ${sName(
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
      });
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
    <div className="space-y-5 font-sans">
      {/* HEADER CONTROLS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operational Desk</span>
        </button>
        <div className="flex items-center gap-2">
          {isTripInTransit && (
            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
              LOADING LOCKED (IN TRANSIT)
            </span>
          )}
          <span className="text-xs font-bold text-brand bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            {loadedCount} / {targetCount} Wagons ({totalQtyLoadedSoFar.toLocaleString()} / {totalReqQty.toLocaleString()} {unitShort})
          </span>
        </div>
      </div>

      {/* TRIP SUMMARY INFO CARD */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand">
              TRIP {trip.tripId} — ORIGIN SIDING LOADING MANIFEST
            </p>
            <h3 className="text-base font-black text-slate-900">{trip.company}</h3>
          </div>
          <span className="bg-blue-50 text-navy font-mono font-bold text-xs px-3 py-1 rounded-xl border border-blue-200">
            {sName(trip.origin)} ➔ {sName(trip.destination)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Locomotive</span>
            <span className="font-mono font-black text-slate-900">{trip.locomotiveId || 'L2205'}</span>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Cargo Officer</span>
            <span className="font-bold text-slate-900">{trip.cargoOfficerName || trip.monitoringOfficer || 'Field Officer'}</span>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Consignment</span>
            <span className="font-bold text-slate-900">{trip.cargoType}</span>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Target Volume</span>
            <span className="font-mono font-bold text-emerald-700">
              {totalReqQty.toLocaleString()} {unitLabel}
            </span>
          </div>
        </div>
      </div>

      {/* LIVE DISPATCH BANNER */}
      {!isTripInTransit && (
        <div className="bg-brand text-white rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider font-mono">LIVE GPS CORRIDOR DISPATCH GATE</p>
              </div>
              <p className="text-base font-black text-white mt-1">
                Locomotive: <span className="font-mono text-white/90">{trip.locomotiveId || 'L2205'}</span> ({loadedCount} Wagons Finalized)
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                Finalize all active loading wagons to unlock corridor departure & satellite telemetry.
              </p>
            </div>
            <button
              onClick={dispatchAndActivateGps}
              disabled={loadedCount < 1 || activeLoadingWagons.length > 0}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Depart Train & Activate Live GPS Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PROGRESS OVERVIEW */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
          Consist Loading Metrics & Progress
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Target Consist</span>
            <span className="text-xl font-black font-mono text-slate-900">{targetCount} Wagons</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Finalized Wagons</span>
            <span className="text-xl font-black font-mono text-brand">{loadedCount}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Volume Loaded</span>
            <span className="text-xl font-black font-mono text-emerald-700">
              {totalQtyLoadedSoFar.toLocaleString()} {unitShort}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Loading Ratio</span>
            <span className="text-xl font-black font-mono text-navy">{pct}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-navy to-brand h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ACTIVE SIMULTANEOUS MULTI-WAGON LOADING DECK */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Active Simultaneous Loading Deck ({activeLoadingWagons.length} Wagons Timing)
            </h3>
            <p className="text-xs text-slate-500">
              Initiate multiple wagons concurrently. Stop and audit each wagon independently when filled.
            </p>
          </div>
          {!isTripInTransit && (
            <button
              onClick={() => {
                setAdding(true);
                if (availableFleetWagons.length > 0 && !selWagon) {
                  setSelWagon(availableFleetWagons[0].id);
                }
              }}
              className="bg-brand hover:bg-brand-dark text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Wagon to Loading Deck</span>
            </button>
          )}
        </div>

        {/* WAGON SELECTION FORM / MODAL */}
        {!isTripInTransit && adding && (
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 border-2 border-navy/20 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
              <div>
                <h4 className="font-black text-slate-900 text-sm">Wagon Allocation & Siding Dispatch</h4>
                <p className="text-xs text-slate-500">
                  Pick from the 46 dedicated PXG covered hoppers or enter a custom external wagon number.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomWagon(!isCustomWagon)}
                className="text-xs font-bold text-navy bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                {isCustomWagon ? 'Pick from 46 Fleet Wagons' : 'Write Custom / External Wagon ID'}
              </button>
            </div>

            <form onSubmit={startLoadingWagon} className="space-y-4">
              {isCustomWagon ? (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700" htmlFor="cargo-officer-port-enter-external-custom-wagon-15">Enter External / Custom Wagon Number *</label>
                  <input id="cargo-officer-port-enter-external-custom-wagon-15"
                    type="text"
                    required
                    value={customWagonId}
                    onChange={(e) => setCustomWagonId(e.target.value)}
                    placeholder="e.g. PXG 09048, GND 4410, NRC-HPR-88"
                    className="w-full font-mono text-sm font-bold uppercase p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand"
                  />
                  <span className="text-[11px] text-slate-500 block">
                    This custom wagon will be automatically saved and registered to the live SQL database.
                  </span>
                </div>
              ) : (
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center">
                    <label htmlFor="wagon-search" className="text-xs font-bold text-slate-700">
                      Select from 46 Dedicated Covered Hopper Wagons ({availableFleetWagons.length} Available at {sName(trip.origin)})
                    </label>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="wagon-search"
                      type="text"
                      value={wagonSearch}
                      onChange={(e) => setWagonSearch(e.target.value)}
                      placeholder="Filter wagons by number (e.g. PXG 09001)..."
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                    {filteredWagons.length === 0 ? (
                      <p className="col-span-full text-center text-xs text-slate-400 py-4">
                        No wagons match "{wagonSearch}". Switch to custom input above.
                      </p>
                    ) : (
                      filteredWagons.map((w: any) => {
                        const isSelected = selWagon === w.id || (!selWagon && filteredWagons[0]?.id === w.id);
                        return (
                          <button
                            type="button"
                            key={w.id}
                            onClick={() => setSelWagon(w.id)}
                            className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 border-2 border-brand text-slate-900 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="font-mono font-bold block">{w.id}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {w.currentStation || trip.origin || 'EWK'} • 60 MT
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-loading-siding-silo-bay-16">Loading Siding / Silo Bay Location</label>
                <input id="cargo-officer-port-loading-siding-silo-bay-16"
                  type="text"
                  value={sourceBay}
                  onChange={(e) => setSourceBay(e.target.value)}
                  placeholder="e.g. Silo Bay 1 - Loading Siding"
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Loading Wagon</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ACTIVE WAGONS GRID (CONCURRENT SIMULTANEOUS LOADING) */}
        {activeLoadingWagons.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLoadingWagons.map((active: any) => (
              <div
                key={active.id}
                className="bg-emerald-50/60 border-2 border-brand rounded-2xl p-4 space-y-3 shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold text-brand uppercase tracking-wider block">
                      LOADING IN PROGRESS
                    </span>
                    <h4 className="text-xl font-mono font-black text-slate-900">{active.wagonId}</h4>
                    <p className="text-[11px] text-slate-500">
                      Started: {active.startDate} at {active.startTime}
                    </p>
                  </div>
                  <span className="w-3 h-3 rounded-full bg-brand animate-ping" />
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Live Stopwatch</span>
                    <LiveTimer ts={active.startTimestamp} />
                  </div>
                  {!isTripInTransit && (
                    <button
                      onClick={() => handleOpenStopModal(active)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop & Finalize</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FINALIZED WAGON LOADING MANIFEST TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div>
          <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Finalized Wagon Loading Manifest
          </h3>
          <p className="text-xs text-slate-500">
            Complete detailed loading audit per wagon, including all feeder trucks and time records.
          </p>
        </div>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
              No wagons loaded yet. Click '+ Add Wagon to Loading Deck' to start loading.
            </div>
          ) : (
            logs.map((w: any, i: number) => {
              const isLoaded = w.status === 'LOADED';
              const truckCount = w.feederTrucks?.length || 1;

              return (
                <div key={w.id || i} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                      {isLoaded && (
                        <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-2.5 py-0.5 rounded-lg text-xs">
                          {Number(w.qty || defaultCapacity).toLocaleString()} {w.unitOfMeasure || unitShort} Loaded
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-slate-600 flex items-center gap-3">
                      <span>
                        Started: <b>{w.startDate} {w.startTime}</b>
                      </span>
                      {w.endDate && (
                        <span>
                          Ended: <b>{w.endDate} {w.endTime}</b>
                        </span>
                      )}
                      <span className="font-bold text-slate-900">Duration: {w.durationStr || 'In Progress'}</span>
                      <Badge text={w.status} color={isLoaded ? 'green' : 'blue'} />
                    </div>
                  </div>

                  {isLoaded && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400">
                          Feeder Trucks Audit ({truckCount} Truck{truckCount > 1 ? 's' : ''} Completed Loading)
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Siding: <b>{w.sourceEnv || 'Plant Siding'}</b>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {w.feederTrucks && w.feederTrucks.length > 0 ? (
                          w.feederTrucks.map((ft: any, ftIdx: number) => (
                            <div key={ftIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-bold text-navy text-xs flex items-center gap-1">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>{ft.truckRegNo}</span>
                                </span>
                                <span className="font-mono font-bold text-emerald-700 text-xs">
                                  {Number(ft.qtyContributed).toLocaleString()} {w.unitOfMeasure || unitShort}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-700 truncate">
                                {ft.driverName} ({ft.phone})
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{ft.transporter}</p>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-full bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                            <div>
                              <span className="font-mono font-bold text-navy text-xs flex items-center gap-1">
                                <Truck className="w-3.5 h-3.5" />
                                <span>{w.truckRegNo || 'N/A'}</span>
                              </span>
                              <p className="text-[11px] text-slate-700">{w.driverDetails || 'N/A'}</p>
                            </div>
                            <span className="font-mono font-bold text-emerald-700 text-xs">
                              {Number(w.qty || defaultCapacity).toLocaleString()} {w.unitOfMeasure || unitShort}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* STOP & FINALIZE WAGON MODAL (DYNAMIC MULTI-FEEDER TRUCKS SUPPORT) */}
      {stoppingWagon && (
        <Modal onClose={() => setStoppingWagon(null)}>
          <div className="p-6 space-y-4 font-sans max-w-2xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Finalize Loading Audit for Wagon {stoppingWagon.wagonId}
                </h3>
                <p className="text-xs text-slate-600">
                  Record all feeder trucks that completed filling this wagon (e.g. 1 truck or truck & a half).
                </p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
                {unitLabel}
              </span>
            </div>

            <form onSubmit={confirmStopLoading} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-loading-start-time-17">Loading Start Time</label>
                  <input id="cargo-officer-port-loading-start-time-17"
                    type="text"
                    value={startTimeEdit}
                    onChange={(e) => setStartTimeEdit(e.target.value)}
                    className="w-full font-mono p-2.5 rounded-xl border border-slate-300"
                    placeholder="08:30 AM"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-concluding-time-18">Concluding Time</label>
                  <input id="cargo-officer-port-concluding-time-18"
                    type="text"
                    value={endTimeEdit}
                    onChange={(e) => setEndTimeEdit(e.target.value)}
                    className="w-full font-mono p-2.5 rounded-xl border border-slate-300"
                    placeholder="10:15 AM"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-source-loading-siding-silo-19">Source Loading Siding / Silo Bay *</label>
                <input id="cargo-officer-port-source-loading-siding-silo-19"
                  required
                  value={sourceBay}
                  onChange={(e) => setSourceBay(e.target.value)}
                  placeholder="e.g. Silo Bay 1 - Loading Siding"
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              {/* DYNAMIC MULTI-TRUCK FEEDER ENTRIES */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs">Feeder Trucks Discharged into this Wagon</h4>
                    <p className="text-[11px] text-slate-500">
                      Add each truck details that discharged cargo to complete this wagon.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFeederTruck}
                    className="text-xs font-bold text-navy bg-white hover:bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Feeder Truck</span>
                  </button>
                </div>

                {feederTrucks.map((ft, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5" />
                        <span>Feeder Truck #{idx + 1}</span>
                      </span>
                      {feederTrucks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFeederTruck(idx)}
                          className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                        >
                          ✕ Remove Truck
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="cargo-officer-port-truck-license-plate-reg-20">
                          Truck License Plate / Reg No *
                        </label>
                        <input id="cargo-officer-port-truck-license-plate-reg-20"
                          required
                          value={ft.truckRegNo}
                          onChange={(e) => handleUpdateFeederTruck(idx, 'truckRegNo', e.target.value)}
                          placeholder="e.g. KJA-482-XY"
                          className="w-full font-mono uppercase font-bold p-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="cargo-officer-port-transporter-haulage-co-21">
                          Transporter / Haulage Co *
                        </label>
                        <input id="cargo-officer-port-transporter-haulage-co-21"
                          required
                          value={ft.transporter}
                          onChange={(e) => handleUpdateFeederTruck(idx, 'transporter', e.target.value)}
                          placeholder="e.g. Dangote Logistics Fleet"
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="cargo-officer-port-driver-name-22">Driver Name</label>
                        <input id="cargo-officer-port-driver-name-22"
                          value={ft.driverName}
                          onChange={(e) => handleUpdateFeederTruck(idx, 'driverName', e.target.value)}
                          placeholder="e.g. Ibrahim Garba"
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="cargo-officer-port-driver-phone-23">Driver Phone</label>
                        <input id="cargo-officer-port-driver-phone-23"
                          value={ft.phone}
                          onChange={(e) => handleUpdateFeederTruck(idx, 'phone', e.target.value)}
                          placeholder="e.g. 08031112233"
                          className="w-full p-2 rounded-lg border border-slate-300 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase" htmlFor="cargo-officer-port-quantity-loaded-from-this-24">
                        Quantity Loaded from this Truck ({unitShort}) *
                      </label>
                      <input id="cargo-officer-port-quantity-loaded-from-this-24"
                        required
                        type="number"
                        min="1"
                        value={ft.qtyContributed}
                        onChange={(e) => handleUpdateFeederTruck(idx, 'qtyContributed', e.target.value)}
                        placeholder={`e.g. ${Math.round(defaultCapacity / feederTrucks.length)}`}
                        className="w-full font-mono font-bold text-emerald-800 p-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-total-net-payload-for-25">
                  Total Net Payload for Wagon ({unitLabel}) *
                </label>
                <input id="cargo-officer-port-total-net-payload-for-25"
                  required
                  type="number"
                  min="1"
                  value={bagsLoadedInput}
                  onChange={(e) => setBagsLoadedInput(e.target.value)}
                  className="w-full font-mono text-base font-bold text-emerald-800 p-3 rounded-xl border border-slate-300 bg-emerald-50/40"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoppingWagon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save & Complete Wagon Load</span>
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
   WAGON UNLOADING VIEW (at Destination Unloading Station)
   Audit & Damage Discrepancy Reporting
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
    correctQty: '1200',
    damageQty: '0',
    burstBags: '0',
    hasComplaint: false,
    complaintNotes: '',
    unloadStartTimeEdit: '',
    unloadEndTimeEdit: '',
  });

  const isBulkTonnes =
    trip?.cargoType?.toLowerCase().includes('gypsum') ||
    trip?.cargoType?.toLowerCase().includes('limestone') ||
    trip?.cargoType?.toLowerCase().includes('clinker') ||
    trip?.unitOfMeasure?.includes('MT') ||
    trip?.unitOfMeasure?.includes('Tonne');
  const unitLabel = isBulkTonnes ? 'Metric Tonnes (MT)' : 'Bags';
  const unitShort = isBulkTonnes ? 'MT' : 'Bags';
  const defaultCapacity = isBulkTonnes ? 60 : 1200;

  if (!trip) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Trip not found.{' '}
        <button onClick={onBack} className="underline text-brand font-bold">
          Go back
        </button>
      </div>
    );
  }

  const total = logs.length;
  const unloaded = logs.filter((w: any) => w.unloadStatus === 'UNLOADED').length;
  const allUnloaded = unloaded >= total && total > 0;
  const activeUnloadingWagons = logs.filter((w: any) => w.unloadStatus === 'UNLOADING');
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
    const defaultLoadedQty = Number(w.qty || defaultCapacity);
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
    const formattedTime = unloadForm.unloadEndTimeEdit || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mins = Math.max(1, Math.round((Date.now() - (stoppingUnloadWagon.unloadStartTimestamp || Date.now())) / 60000));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationStr = hours > 0 ? `${hours}h ${remMins}m` : `${mins} Minutes`;
    const bagsUnloaded = Number(bagsUnloadedInput) || stoppingUnloadWagon.qty || defaultCapacity;

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
        title: `Wagon Discrepancy & Insurance Alert — ${stoppingUnloadWagon.wagonId}`,
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
        });
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

    // Release wagons back to fleet at destination station
    try {
      const storedWagons = JSON.parse(localStorage.getItem('bueno_wagons') || '[]');
      const wagonIdsInTrip = new Set(logs.map((w: any) => w.wagonId));
      const updatedWagons = storedWagons.map((w: any) =>
        wagonIdsInTrip.has(w.id) ? { ...w, status: 'AVAILABLE', currentStation: trip.destination } : w
      );
      localStorage.setItem('bueno_wagons', JSON.stringify(updatedWagons));
      window.dispatchEvent(new Event('bueno_state_updated'));
    } catch {}

    onBack();
  };

  const dispatchEmptyReturnRun = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const completedTimestamp = `${formattedDate}, ${formattedTime}`;
    const returnTripId = `${trip.tripId || trip.id}-RET`;

    const totalDamagedUnits = logs.reduce((acc: number, w: any) => acc + (Number(w.damageQty) || 0), 0);
    const totalBurstBags = logs.reduce((acc: number, w: any) => acc + (Number(w.burstBags) || 0), 0);
    const allComplaintNotes = Array.from(new Set(logs.map((w: any) => w.complaintNotes).filter(Boolean)));

    const completedLadenTrip = {
      ...trip,
      status: 'COMPLETED',
      completedAt: completedTimestamp,
      unloadingOfficerName: user?.fullName || 'Destination Officer',
      wagonLogs: logs,
      damages: {
        damagedUnits: totalDamagedUnits,
        burstBags: totalBurstBags,
        complaintNotes: allComplaintNotes.join('; '),
      },
    };

    // Build empty return trip navigating back to origin base
    const emptyReturnTrip = {
      id: returnTripId,
      tripId: returnTripId,
      tripSequenceNumber: trips.length + 1,
      dealId: `EMPTY-BACKHAUL-${trip.id}`,
      dealNumber: `EMPTY-BACKHAUL-${trip.dealNumber || trip.id}`,
      locomotiveId: trip.locomotiveId || 'L2205',
      driverName: trip.driverName || 'Engr. Kabiru Usman (NRC-DRV-102)',
      crewMembers: trip.crewMembers || 'Sani Bello, Timothy Danjuma',
      monitoringOfficer: user?.fullName || 'Ade Bello',
      cargoOfficerName: user?.fullName || 'Ade Bello',
      company: 'Bueno Rolling Stock (Empty Repositioning)',
      origin: trip.destination,
      destination: trip.origin,
      cargoType: 'Empty Rolling Stock (Repositioning)',
      quantity: 0,
      targetWagonsCount: logs.length,
      status: 'RETURNING_EMPTY',
      isReturnLeg: true,
      parentTripId: trip.id,
      dispatchDate: formattedDate,
      dispatchTime: formattedTime,
      createdAt: completedTimestamp,
      wagonLogs: logs.map((w: any) => ({
        ...w,
        status: 'EMPTY',
        unloadStatus: 'UNLOADED',
        qty: 0,
        bagsCount: 0,
      })),
      speed: 55,
      progressPercent: 10,
    };

    const updated = trips.map((t: any) => (t.id === trip.id ? completedLadenTrip : t));
    const allWithReturn = [emptyReturnTrip, ...updated];
    onSaveTrips(allWithReturn);

    // Update wagons to RETURNING_EMPTY
    try {
      const storedWagons = JSON.parse(localStorage.getItem('bueno_wagons') || '[]');
      const loadedWagonIds = new Set(logs.map((w: any) => w.wagonId));
      const updatedWagons = storedWagons.map((w: any) => {
        if (loadedWagonIds.has(w.id)) {
          return { ...w, status: 'RETURNING_EMPTY', currentStation: `${trip.destination} ➔ ${trip.origin}` };
        }
        return w;
      });
      localStorage.setItem('bueno_wagons', JSON.stringify(updatedWagons));
      window.dispatchEvent(new Event('bueno_state_updated'));
    } catch {}

    setCustomAlert({
      title: 'Empty Return Run Dispatched 🔄',
      message: `Consignment ${trip.tripId || trip.id} successfully COMPLETED!\n\nEmpty Return Trip ${returnTripId} dispatched from ${sName(trip.destination)} back to ${sName(trip.origin)}.\n\nLocomotive #${emptyReturnTrip.locomotiveId} is now tracked on live GPS heading back to base for the next loading batch!`,
    });
    setTimeout(() => onBack(), 2200);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* TOP CONTROLS */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={onBack}
          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Operational Desk</span>
        </button>
        <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl">
          Discharge: {unloaded} / {total} Wagons Offloaded
        </span>
      </div>

      {/* TRIP DESTINATION AUDIT SUMMARY */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700">
              TRIP {trip.tripId} — DESTINATION UNLOAD & AUDIT LEDGER
            </p>
            <h3 className="text-base font-black text-slate-900">{trip.company}</h3>
          </div>
          <span className="bg-purple-50 text-purple-700 font-mono font-bold text-xs px-3 py-1 rounded-xl border border-purple-200">
            Arrived at: {sName(trip.destination)}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Locomotive</span>
            <span className="font-mono font-black text-slate-900">{trip.locomotiveId || 'L2205'}</span>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Origin Station</span>
            <span className="font-bold text-slate-900">{sName(trip.origin)}</span>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Consignment</span>
            <span className="font-bold text-slate-900">{trip.cargoType}</span>
          </div>
          <div>
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Discharge Officer</span>
            <span className="font-bold text-purple-700">{user?.fullName || 'Destination Officer'}</span>
          </div>
        </div>
      </div>

      {/* UNLOAD DISCHARGE METRICS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
          Destination Offload Progress & Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Total Consist</span>
            <span className="text-xl font-black font-mono text-slate-900">{total} Wagons</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Discharged</span>
            <span className="text-xl font-black font-mono text-brand">{unloaded}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Pending Discharge</span>
            <span className="text-xl font-black font-mono text-amber-600">{total - unloaded}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400">Discharge Ratio</span>
            <span className="text-xl font-black font-mono text-purple-600">{pct}%</span>
          </div>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-500 to-brand h-full rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* UNLOAD CARDS FEED */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
              Wagon Discharge & Audit Cards
            </h3>
            <p className="text-xs text-slate-500">
              Start stopwatch when unloading starts at siding. Record damages and discrepancies upon conclusion.
            </p>
          </div>
          {allUnloaded && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={completeTrip}
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Complete Consignment & Keep in Yard</span>
              </button>
              <button
                onClick={dispatchEmptyReturnRun}
                className="bg-brand hover:bg-brand-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer animate-pulse"
              >
                <span>🔄 Dispatch Empty Return Run (Back to Base)</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {logs.map((w: any, idx: number) => {
            const isUnloaded = w.unloadStatus === 'UNLOADED';
            const isUnloading = w.unloadStatus === 'UNLOADING';

            return (
              <div
                key={w.id || idx}
                className={`p-4 rounded-2xl border transition-all text-xs space-y-3 ${
                  isUnloaded
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : isUnloading
                    ? 'bg-purple-50/40 border-purple-300 shadow-xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                    <span className="bg-slate-100 text-slate-700 font-mono px-2.5 py-0.5 rounded-lg text-xs">
                      Manifest: {Number(w.qty || defaultCapacity).toLocaleString()} {w.unitOfMeasure || unitShort}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {isUnloaded ? (
                      <span className="bg-brand text-white font-bold text-[10px] px-3 py-1 rounded-xl flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>DISCHARGED</span>
                      </span>
                    ) : isUnloading ? (
                      <button
                        onClick={() => handleOpenStopUnloadModal(w)}
                        className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Stop Unloading & Audit</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startUnloading(w.wagonId)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Unloading</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* TIMING & DAMAGE DETAILS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="block text-[9px] uppercase text-slate-400 font-extrabold">Unload Started</span>
                    <span className="font-mono font-bold text-slate-700">
                      {w.unloadStartDate ? `${w.unloadStartDate} ${w.unloadStartTime}` : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-slate-400 font-extrabold">Unload Concluded</span>
                    <span className="font-mono font-bold text-slate-700">
                      {w.unloadEndDate ? `${w.unloadEndDate} ${w.unloadEndTime}` : isUnloading ? 'Timing...' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-slate-400 font-extrabold">Discharge Time</span>
                    <span className="font-mono font-bold text-purple-800">{w.unloadDurationStr || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase text-slate-400 font-extrabold">Damages / Bursts</span>
                    <span
                      className={`font-mono font-black ${
                        (w.damageQty || 0) > 0 || (w.burstBags || 0) > 0 ? 'text-rose-600' : 'text-brand'
                      }`}
                    >
                      {w.damageQty || 0} Damaged / {w.burstBags || 0} Bursts
                    </span>
                  </div>
                </div>

                {w.hasComplaint && w.complaintNotes && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800">
                    <strong>Discrepancy Note:</strong> {w.complaintNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STOP UNLOAD & DAMAGE AUDIT MODAL */}
      {stoppingUnloadWagon && (
        <Modal onClose={() => setStoppingUnloadWagon(null)}>
          <div className="p-6 space-y-4 font-sans max-w-xl">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Record Offload Audit for Wagon {stoppingUnloadWagon.wagonId}
                </h3>
                <p className="text-xs text-slate-600">Verify discharge count, damaged items, and intact seal status.</p>
              </div>
              <span className="bg-purple-100 text-purple-800 font-mono font-bold px-2.5 py-1 rounded-lg text-xs">
                {unitLabel}
              </span>
            </div>

            <form onSubmit={confirmStopUnloading} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-unload-start-time-26">Unload Start Time</label>
                  <input id="cargo-officer-port-unload-start-time-26"
                    type="text"
                    value={unloadForm.unloadStartTimeEdit}
                    onChange={(e) => setUnloadForm({ ...unloadForm, unloadStartTimeEdit: e.target.value })}
                    className="w-full font-mono p-2.5 rounded-xl border border-slate-300"
                    placeholder="02:15 PM"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-unload-concluding-time-27">Unload Concluding Time</label>
                  <input id="cargo-officer-port-unload-concluding-time-27"
                    type="text"
                    value={unloadForm.unloadEndTimeEdit}
                    onChange={(e) => setUnloadForm({ ...unloadForm, unloadEndTimeEdit: e.target.value })}
                    className="w-full font-mono p-2.5 rounded-xl border border-slate-300"
                    placeholder="04:30 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-intact-count-28">Intact Count ({unitShort})</label>
                  <input id="cargo-officer-port-intact-count-28"
                    required
                    type="number"
                    min="0"
                    value={unloadForm.correctQty}
                    onChange={(e) => setUnloadForm({ ...unloadForm, correctQty: e.target.value })}
                    className="w-full font-mono font-bold text-emerald-800 p-2.5 rounded-xl border border-slate-300 bg-emerald-50/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-damaged-count-29">Damaged Count</label>
                  <input id="cargo-officer-port-damaged-count-29"
                    type="number"
                    min="0"
                    value={unloadForm.damageQty}
                    onChange={(e) => setUnloadForm({ ...unloadForm, damageQty: e.target.value })}
                    className="w-full font-mono font-bold text-amber-800 p-2.5 rounded-xl border border-slate-300 bg-amber-50/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1" htmlFor="cargo-officer-port-burst-bags-30">Burst Bags</label>
                  <input id="cargo-officer-port-burst-bags-30"
                    type="number"
                    min="0"
                    value={unloadForm.burstBags}
                    onChange={(e) => setUnloadForm({ ...unloadForm, burstBags: e.target.value })}
                    className="w-full font-mono font-bold text-rose-800 p-2.5 rounded-xl border border-slate-300 bg-rose-50/40"
                  />
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unloadForm.hasComplaint}
                    onChange={(e) => setUnloadForm({ ...unloadForm, hasComplaint: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span className="font-bold text-slate-800 text-xs">
                    File Discrepancy / Transit Damage Claim with Insurance
                  </span>
                </label>

                {unloadForm.hasComplaint && (
                  <textarea
                    rows={3}
                    required
                    value={unloadForm.complaintNotes}
                    onChange={(e) => setUnloadForm({ ...unloadForm, complaintNotes: e.target.value })}
                    placeholder="Enter explicit damage report: e.g. 8 bags punctured during siding offload; insurance survey requested..."
                    className="w-full text-xs p-2.5 rounded-xl border border-rose-300 bg-white"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStoppingUnloadWagon(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Offload Record</span>
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
              <span className="font-mono font-black text-navy text-sm">{req.id}</span>
              <Badge text={req.stage} color={stageColor(req.stage)} />
            </div>
            <h3 className="text-base font-black text-slate-900 mt-1">{req.title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
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
            <span className="font-mono font-bold text-navy">{req.tripNo || 'TRIP-001'}</span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-black text-slate-900 mb-2">Audit & Approval Conversation Log</h4>
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
            className="bg-brand hover:bg-brand-dark text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </Modal>
  );
}
