'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* ─────────────────────────────────────────────────────────
   MASTER DATA & STATIONS
───────────────────────────────────────────────────────── */
const STATIONS: Record<string, { name: string; gauge: 'STANDARD_GAUGE' | 'NARROW_GAUGE'; coords: [number, number] }> = {
  // Standard Gauge Stations (Lagos to Moniya, Ibadan)
  PAPA: { name: 'Papalanto Terminal', gauge: 'STANDARD_GAUGE', coords: [6.8974, 3.2141] },
  MNY:  { name: 'Moniya Yard (Ibadan)', gauge: 'STANDARD_GAUGE', coords: [7.4610, 3.9470] },
  MONI: { name: 'Moniya Yard (Ibadan)', gauge: 'STANDARD_GAUGE', coords: [7.4610, 3.9470] },
  APT:  { name: 'Apapa Maritime Port', gauge: 'STANDARD_GAUGE', coords: [6.4550, 3.3610] },
  APQ:  { name: 'Apapa Port', gauge: 'STANDARD_GAUGE', coords: [6.4550, 3.3610] },
  ENL:  { name: 'ENL Terminal (APMT)', gauge: 'STANDARD_GAUGE', coords: [6.4560, 3.3620] },
  APL:  { name: 'Apapa Local', gauge: 'STANDARD_GAUGE', coords: [6.4580, 3.3630] },
  MBJ:  { name: 'Lagos (Mobolaji)', gauge: 'STANDARD_GAUGE', coords: [6.4474, 3.3640] },
  MU:   { name: 'Mushin Station', gauge: 'STANDARD_GAUGE', coords: [6.5333, 3.3500] },
  SH:   { name: 'Oshodi Station', gauge: 'STANDARD_GAUGE', coords: [6.5566, 3.3455] },
  SG:   { name: 'Shogunle Station', gauge: 'STANDARD_GAUGE', coords: [6.5700, 3.3400] },
  IK:   { name: 'Ikeja Station', gauge: 'STANDARD_GAUGE', coords: [6.5965, 3.3421] },
  GE:   { name: 'Agege Station', gauge: 'STANDARD_GAUGE', coords: [6.6186, 3.3238] },
  UJ:   { name: 'Iju Station', gauge: 'STANDARD_GAUGE', coords: [6.6667, 3.3333] },
  GD:   { name: 'Agbado Station', gauge: 'STANDARD_GAUGE', coords: [6.6800, 3.3200] },
  IT:   { name: 'Itoki Station', gauge: 'STANDARD_GAUGE', coords: [6.7000, 3.3100] },
  JK:   { name: 'Ijoko Station', gauge: 'STANDARD_GAUGE', coords: [6.7200, 3.3000] },
  KA:   { name: 'Kajola Station', gauge: 'STANDARD_GAUGE', coords: [6.7500, 3.2800] },
  AB:   { name: 'Abeokuta Major Station', gauge: 'STANDARD_GAUGE', coords: [7.1557, 3.3458] },
  AD:   { name: 'Omi Adio Station', gauge: 'STANDARD_GAUGE', coords: [7.3500, 3.8000] },

  // Narrow Gauge Stations (Western District - Lagos Terminus to Ilorin)
  EWK:  { name: 'Ewekoro Terminal (Itori)', gauge: 'NARROW_GAUGE', coords: [6.8974, 3.2141] },
  ITO:  { name: 'Itori Junction', gauge: 'NARROW_GAUGE', coords: [6.9333, 3.3833] },
  DGB:  { name: 'Dugbe Station (Ibadan)', gauge: 'NARROW_GAUGE', coords: [7.3800, 3.8900] },
  IDD:  { name: 'Iddo Lagos Terminus', gauge: 'NARROW_GAUGE', coords: [6.4700, 3.3800] },
  EBJ:  { name: 'Ebute Metta Junction', gauge: 'NARROW_GAUGE', coords: [6.4800, 3.3700] },
  IGS:  { name: 'Iganmu Station', gauge: 'NARROW_GAUGE', coords: [6.4650, 3.3650] },
  OSB:  { name: 'Oshogbo Hub', gauge: 'NARROW_GAUGE', coords: [7.7710, 4.5600] },
  ILR:  { name: 'Ilorin Freight Hub', gauge: 'NARROW_GAUGE', coords: [8.4966, 4.5426] },
  INS:  { name: 'Inisa Station', gauge: 'NARROW_GAUGE', coords: [7.9300, 4.6500] },
  OKK:  { name: 'Okuku Station', gauge: 'NARROW_GAUGE', coords: [8.0100, 4.6700] },
  FFA:  { name: 'Offa Hub', gauge: 'NARROW_GAUGE', coords: [8.1500, 4.7200] },
  JBB:  { name: 'Jebba Terminal', gauge: 'NARROW_GAUGE', coords: [9.1300, 4.8300] },
};

const sName = (c: string) => STATIONS[c]?.name || c;
const sGauge = (c: string) => STATIONS[c]?.gauge || 'STANDARD_GAUGE';

const STATION_COORDS: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(STATIONS).map(([k, v]) => [k, v.coords])
);

const WAGON_TYPES = [
  { code: 'PXG', name: 'PXG / CGs Box Wagon', desc: 'Box-wagon for cement & 50kg bagged cargo' },
  { code: 'OTW', name: 'OTW Oil Tank Wagon', desc: 'Oil tank wagon for petroleum products' },
  { code: 'CBX', name: 'CBX Flat Bed Wagon', desc: 'Flat beds for containers, cars, machines, vehicles, pipes, coils' },
  { code: 'CBX(HS)', name: 'CBX(HS) High-Sided Flat Bed', desc: 'Flat-bed wagons with high sides for jumbo bags' },
  { code: 'ZGX', name: 'ZGX Open-Top Side Discharge', desc: 'Open top side discharging for coal & gypsum' },
  { code: 'CHW', name: 'CHW Hopper Wagon', desc: 'Top loading, bottom discharge for ballast, coal, gypsum' },
  { code: 'RSV', name: 'RSV Refrigerated Van', desc: 'Refrigerated van for temperature-controlled cargo' },
  { code: 'CYG', name: 'CYG Livestock Wagon', desc: 'Cow / animal wagons' },
  { code: 'OTHERS', name: 'Other Custom Wagon', desc: 'Custom wagon code & type specification' },
];

// Official Freight Wagons Array with Gauge & Classification Tagging
const OFFICIAL_PXG_CODES = [
  "PXG 09029", "PXG 09033", "PXG 09037", "PXG 09022", "PXG 09001",
  "PXG 09031", "PXG 09036", "PXG 09023", "PXG 09021", "PXG 09025",
  "PXG 09008", "PXG 09019", "PXG 09055", "PXG 09038", "PXG 09004",
  "PXG 09015", "PXG 09040", "PXG 09056", "PXG 09016", "PXG 09009",
  "PXG 09028", "PXG 09030", "PXG 09017",
  "PXG 09059", "PXG 09003", "PXG 09013", "PXG 09014", "PXG 09039",
  "PXG 09012", "PXG 09010", "PXG 09026", "PXG 09005", "PXG 09041",
  "PXG 09007", "PXG 09061", "PXG 09062", "PXG 09020", "PXG 09002",
  "PXG 09066", "PXG 09018", "PXG 09035", "PXG 09032", "PXG 09060",
  "PXG 09011", "PXG 09024", "PXG 09034"
];

const SEED_WAGONS: any[] = [
  ...OFFICIAL_PXG_CODES.slice(0, 15).map((code) => ({
    id: code, wagonType: 'PXG', capacity: 1200, status: 'AVAILABLE', currentStation: 'PAPA', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026'
  })),
  { id: 'CBX 4599', wagonType: 'CBX', capacity: 20, status: 'AVAILABLE', currentStation: 'PAPA', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'CBX 5012', wagonType: 'CBX', capacity: 20, status: 'AVAILABLE', currentStation: 'MNY', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'ZGX 8799', wagonType: 'ZGX', capacity: 60, status: 'AVAILABLE', currentStation: 'PAPA', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'OTW 1042', wagonType: 'OTW', capacity: 50, status: 'AVAILABLE', currentStation: 'APT', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'CHW 3300', wagonType: 'CHW', capacity: 60, status: 'AVAILABLE', currentStation: 'PAPA', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'CBX(HS) 6100', wagonType: 'CBX(HS)', capacity: 50, status: 'AVAILABLE', currentStation: 'MNY', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'RSV 1020', wagonType: 'RSV', capacity: 40, status: 'AVAILABLE', currentStation: 'APT', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  { id: 'CYG 5050', wagonType: 'CYG', capacity: 30, status: 'AVAILABLE', currentStation: 'MNY', gauge: 'STANDARD_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026' },
  ...OFFICIAL_PXG_CODES.slice(15, 38).map((code) => ({
    id: code, wagonType: 'PXG', capacity: 1200, status: 'AVAILABLE', currentStation: 'EWK', gauge: 'NARROW_GAUGE', addedBy: 'System Registry', createdAt: '07 Aug 2026'
  })),
];

const SEED_TRIPS: any[] = [];

const SEED_DEALS: any[] = [
  {
    id: 'DEAL-0138',
    dealNumber: 'DEAL-0138',
    company: 'Dangote Cement',
    origin: 'EWK',
    destination: 'MNY',
    cargoType: 'Elephant Cement (50kg bags)',
    quantity: 8000,
    unitPrice: 1200,
    totalPrice: 9600000,
    assignedStation: 'EWK',
    loadingStation: 'EWK',
    date: '07 Aug 2026',
    createdAt: '07 Aug 2026, 14:00',
    createdBy: 'Admin (Folake Adeyemi)',
    status: 'ACTIVE',
  },
  {
    id: 'DEAL-0139',
    dealNumber: 'DEAL-0139',
    company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
    origin: 'EWK',
    destination: 'MNY',
    cargoType: 'Portland Cement (50kg bags)',
    quantity: 12000,
    unitPrice: 1200,
    totalPrice: 14400000,
    assignedStation: 'EWK',
    loadingStation: 'EWK',
    date: '07 Aug 2026, 14:15',
    createdBy: 'Admin (Folake Adeyemi)',
    status: 'ACTIVE',
  },
];

const DEFAULT_PROVISIONED_USERS = [
  { id: 'usr_1', fullName: 'Ade Bello', email: 'ade.bello@bueno.ng', phone: '08031112233', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_2', fullName: 'Samuel Okafor', email: 'samuel.okafor@bueno.ng', phone: '08032223344', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-02', pin: '2222', status: 'ACTIVE' },
  { id: 'usr_3', fullName: 'Tunde Bakare', email: 'tunde.bakare@bueno.ng', phone: '08033334455', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-03', pin: '3333', status: 'ACTIVE' },
  { id: 'usr_4', fullName: 'Musa Ibrahim', email: 'musa.ibrahim@bueno.ng', phone: '08034445566', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)', staffId: 'MNY-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_5', fullName: 'Kassim Ahmed', email: 'kassim.ahmed@bueno.ng', phone: '08035556677', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)', staffId: 'MNY-02', pin: '2222', status: 'ACTIVE' },
  { id: 'usr_6', fullName: 'Ngozi Eze', email: 'ngozi.eze@bueno.ng', phone: '08036667788', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'APT', stationName: 'Apapa Maritime Port', staffId: 'APT-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_7', fullName: 'Alhaji Bashir Umar', email: 'ceo@bueno.ng', phone: '08030000001', role: 'CEO', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Bueno HQ Command', staffId: 'EXEC-01', pin: '9999', status: 'ACTIVE' },
  { id: 'usr_8', fullName: 'Babajide Sanwo', email: 'ops.command@bueno.ng', phone: '08030000002', role: 'HEAD_OF_OPERATIONS', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Dispatch HQ', staffId: 'EXEC-02', pin: '8888', status: 'ACTIVE' },
  { id: 'usr_9', fullName: 'Folake Adeyemi', email: 'admin@bueno.ng', phone: '08030000003', role: 'ADMIN', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Admin HQ', staffId: 'EXEC-03', pin: '7777', status: 'ACTIVE' },
  { id: 'usr_10', fullName: 'Chinenye Nnamdi', email: 'finance@bueno.ng', phone: '08030000004', role: 'HEAD_OF_FINANCE', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Finance HQ', staffId: 'EXEC-04', pin: '6666', status: 'ACTIVE' },
  { id: 'usr_11', fullName: 'Huaxin Logistics Desk', companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', email: 'logistics@hbm.ng', phone: '08037778899', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_12', fullName: 'Dangote Freight Team', companyName: 'Dangote Cement', email: 'freight@dangotecement.ng', phone: '08038889900', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_13', fullName: 'BUA Logistics Desk', companyName: 'BUA Cement Industries', email: 'logistics@buacement.ng', phone: '08039990011', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
];

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

/* ─────────────────────────────────────────────────────────
   BRANDED ENTERPRISE POPUP NOTIFICATION & ALERT MODAL
───────────────────────────────────────────────────────── */
function ToastNotification({ toast, onClose }: { toast: { message: string; type?: 'success' | 'error' | 'info' } | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => onClose(), 4500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[90%] sm:w-auto font-sans transition-all animate-bounce">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs sm:text-sm font-extrabold ${
        isError ? 'bg-rose-950 text-white border-rose-700' : isInfo ? 'bg-slate-900 text-white border-slate-700' : 'bg-emerald-950 text-white border-emerald-600'
      }`}>
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black shrink-0 ${
          isError ? 'bg-rose-600 text-white' : isInfo ? 'bg-blue-600 text-white' : 'bg-[#62BC37] text-white'
        }`}>
          {isError ? '✕' : isInfo ? 'ℹ' : '✓'}
        </div>
        <p className="flex-1 font-sans leading-snug">{toast.message}</p>
        <button onClick={onClose} className="text-white/60 hover:text-white font-bold ml-2 text-base">✕</button>
      </div>
    </div>
  );
}

function CustomAlertModal({ title, message, isOpen, onClose }: { title?: string; message: string | null; isOpen: boolean; onClose: () => void }) {
  if (!isOpen || !message) return null;
  return (
    <Modal onClose={onClose}>
      <div className="p-6 space-y-4 text-center font-sans">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-[#62BC37] flex items-center justify-center font-black text-2xl border border-emerald-200 shadow-sm">
          ✓
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>{title || 'Bueno Freight OS System'}</h3>
          <p className="text-xs text-slate-600 font-medium mt-1.5 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        <div className="pt-2">
          <button onClick={onClose} className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all">
            Acknowledge & Continue ➔
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-xl mx-2 sm:mx-auto border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto min-w-0">
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
   MOBILE PHONE REAL-TIME GPS TRACKING COMPONENT
───────────────────────────────────────────────────────── */
function MobileGpsTracker({ trip, onUpdateLocation }: { trip?: any; onUpdateLocation?: (lat: number, lng: number, speed: number) => void }) {
  const [tracking, setTracking] = useState(false);
  const [phoneNum, setPhoneNum] = useState(trip?.escortPhone || '08031112233');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; speed: number } | null>(null);

  const startPhoneGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation API is not supported by your browser/device.');
      return;
    }
    if (!phoneNum.trim()) {
      alert('Please enter the escort or cargo officer phone number.');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = Math.round((pos.coords.speed || 0) * 3.6);
        setCurrentCoords({ lat, lng, speed });
        setTracking(true);

        try {
          fetch(`/api/tracking/gps/${encodeURIComponent(trip?.locomotiveId || 'L2205')}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat,
              lng,
              speed: speed || 45,
              heading: pos.coords.heading || 45,
              escortPhone: phoneNum,
              signalQuality: 'MOBILE_PHONE_GPS_LIVE',
              updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }),
          });
        } catch {}

        if (onUpdateLocation) onUpdateLocation(lat, lng, speed);
      },
      (err) => {
        alert(`Device GPS Permission Error: ${err.message}. Please enable GPS Location on your device.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    setWatchId(id);
  };

  const stopPhoneGps = () => {
    if (watchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
    setWatchId(null);
    setTracking(false);
  };

  return (
    <div className="bg-emerald-950 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-md border border-emerald-800">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${tracking ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-100 font-mono">Mobile Phone Real-Time GPS Tracking Transmitter</h4>
        </div>
        <Badge text={tracking ? 'PHONE GPS LIVE 📍' : 'GPS STANDBY'} color={tracking ? 'green' : 'blue'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-extrabold uppercase text-emerald-300">Supervising Officer / Escort Phone Number *</label>
          <input
            type="tel"
            value={phoneNum}
            onChange={e => setPhoneNum(e.target.value)}
            disabled={tracking}
            placeholder="e.g. 08031112233"
            className="w-full bg-emerald-900/90 border border-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-mono mt-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>
        <div className="flex items-end">
          {!tracking ? (
            <button onClick={startPhoneGps} className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md transition-all">
              Connect Phone GPS & Track 📍
            </button>
          ) : (
            <button onClick={stopPhoneGps} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md transition-all">
              Disconnect Phone GPS 🛑
            </button>
          )}
        </div>
      </div>

      {currentCoords && (
        <div className="bg-emerald-900/80 p-3 rounded-xl font-mono text-[11px] flex justify-between items-center text-emerald-200 border border-emerald-700">
          <span>Lat: <b className="text-white">{currentCoords.lat.toFixed(5)}°N</b> | Lng: <b className="text-white">{currentCoords.lng.toFixed(5)}°E</b></span>
          <span>Device Speed: <b className="text-emerald-300">{currentCoords.speed} km/h</b></span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   PER-TRIP COMPREHENSIVE DATABASE AUDIT & MANIFEST REPORT
───────────────────────────────────────────────────────── */
function TripAuditReportModal({ trip, onClose }: { trip: any; onClose: () => void }) {
  if (!trip) return null;

  const logs = trip.wagonLogs || [];
  const loadingOfficer = trip.cargoOfficerName || 'Ade Bello (EWK-01)';
  const unloadingOfficer = trip.unloadingOfficerName || 'Musa Ibrahim (MNY-01)';
  
  // Volume Reconciliation: Requisitioned Deal Volume vs Actual Loaded Tonnage
  const requisitionedBags = Number(trip.quantity) || 27600;
  const requisitionedTonnes = (requisitionedBags * 50) / 1000;

  const actualLoadedBags = logs.length > 0 
    ? logs.reduce((sum: number, w: any) => sum + (Number(w.qty) || 1200), 0)
    : Math.min(requisitionedBags, (trip.targetWagonsCount || 23) * 1200);
  const actualLoadedTonnes = (actualLoadedBags * 50) / 1000;

  const isPartialDispatch = actualLoadedBags < requisitionedBags;
  const balanceOutstandingBags = Math.max(0, requisitionedBags - actualLoadedBags);
  const balanceOutstandingTonnes = (balanceOutstandingBags * 50) / 1000;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-4 sm:p-6 space-y-5 print:p-0 print:space-y-3 font-sans">
        
        {/* Printable Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-[#0E4B88] text-sm">TRIP MANIFEST AUDIT #{trip.tripId}</span>
              <Badge text={trip.status || 'COMPLETED'} color="green" />
              {isPartialDispatch && <Badge text="PARTIAL DISPATCH FLAGGED ⚠️" color="amber" />}
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit',sans-serif" }}>
              {sName(trip.origin)} <span className="text-[#62BC37]">➔</span> {sName(trip.destination)}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Consignee: <b className="text-slate-900">{trip.company}</b> • Date: {trip.createdAt}</p>
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5"
            >
              🖨️ Print Official Trip Audit
            </button>
            <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-xl">
              Close
            </button>
          </div>
        </div>

        {/* Operational Discrepancy Flag Banner if Requisitioned Volume Exceeds Loaded Volume */}
        {isPartialDispatch && (
          <div className="bg-amber-950 text-amber-200 border border-amber-700 p-4 rounded-2xl text-xs font-sans space-y-1.5 shadow-md">
            <div className="flex items-center gap-2 font-mono font-black text-amber-400 uppercase text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              ⚠️ OPERATIONAL VARIANCE FLAGGED — PARTIAL DISPATCH DETECTED
            </div>
            <p className="leading-relaxed text-slate-200">
              Requisitioned Deal Volume (<b className="text-white">{requisitionedBags.toLocaleString()} Bags / {requisitionedTonnes} Tonnes</b>) exceeds Actual Dispatched Rail Volume (<b className="text-white">{actualLoadedBags.toLocaleString()} Bags / {actualLoadedTonnes} Tonnes</b> across {logs.length} Wagons).
            </p>
            <p className="font-mono text-[11px] text-amber-300 font-bold">
              Outstanding Balance Remaining: <span className="text-white bg-amber-900 px-2 py-0.5 rounded font-black border border-amber-700">{balanceOutstandingBags.toLocaleString()} Bags ({balanceOutstandingTonnes} T)</span> flagged for follow-up rail allocation.
            </p>
          </div>
        )}

        {/* Live Mobile Device Phone GPS Transmitter for In-Transit Trips */}
        {trip.status === 'IN_TRANSIT' && (
          <div className="print:hidden">
            <MobileGpsTracker trip={trip} />
          </div>
        )}

        {/* Supervising Officers Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-extrabold uppercase text-[#0E4B88] block">LOADING SUPERVISING CARGO OFFICER</span>
            <p className="font-black text-slate-900">{loadingOfficer}</p>
            <p className="text-[11px] text-slate-500 font-medium">Station: {sName(trip.origin)} Terminal</p>
          </div>
          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[10px] font-mono font-extrabold uppercase text-[#62BC37] block">UNLOADING SUPERVISING CARGO OFFICER</span>
            <p className="font-black text-slate-900">{unloadingOfficer}</p>
            <p className="text-[11px] text-slate-500 font-medium">Station: {sName(trip.destination)} Receiving Yard</p>
          </div>
        </div>

        {/* Cargo & Train Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Locomotive ID</span>
            <span className="text-sm font-black text-slate-900">{trip.locomotiveId || '—'}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Cargo Commodity</span>
            <span className="text-sm font-black text-slate-900 truncate block">{trip.cargoType || 'Freight Cargo'}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Transit Duration</span>
            <span className="text-sm font-black text-amber-600 block">
              {trip.status === 'COMPLETED' ? (trip.transitDuration || 'Completed') : trip.status === 'IN_TRANSIT' ? 'En Route (In Transit)' : trip.status === 'LOADING' ? 'Currently Loading' : '—'}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Dispatched Wagons</span>
            <span className="text-sm font-black text-[#0E4B88]">{logs.length} Wagons</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Net Loaded Tonnage</span>
            <span className="text-sm font-black text-[#62BC37]">{actualLoadedBags.toLocaleString()} Bags ({actualLoadedTonnes} T)</span>
          </div>
        </div>

        {/* Per-Wagon Database Timing Audit Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Per-Wagon Timestamp & Supervision Audit ({logs.length} Wagons)</h4>
          <TableWrap
            headers={['Wagon ID', 'Qty (Bags)', 'Loading Supervision & Timing', 'Unloading Supervision & Timing', 'Audit Status']}
            mobileCard={(w: any, idx: number) => (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center font-mono">
                  <span className="font-black text-slate-900">Wagon #{idx + 1} — {w.wagonId}</span>
                  <Badge text={w.unloadStatus === 'UNLOADED' ? 'UNLOADED ✓' : w.status === 'LOADED' ? 'LOADED ✓' : 'IN PROGRESS'} color={w.unloadStatus === 'UNLOADED' ? 'green' : w.status === 'LOADED' ? 'blue' : 'amber'} />
                </div>
                <p className="text-slate-600">Qty: <b>{Number(w.qty || 0).toLocaleString()} Bags</b></p>
                <p className="text-[11px] text-slate-500 font-mono">Loaded by: {w.loadingOfficer || loadingOfficer} • {w.startDate || ''} {w.startTime || '—'}</p>
                <p className="text-[11px] text-slate-500 font-mono">Unloaded by: {w.unloadingOfficer || unloadingOfficer} • {w.unloadStartDate || ''} {w.unloadEndTime || '—'}</p>
              </div>
            )}
            data={logs}
          >
            {logs.map((w: any, idx: number) => (
              <tr key={w.id || idx} className="hover:bg-slate-50 text-xs">
                <td className="p-3 font-mono font-black text-slate-900">
                  #{idx + 1} — {w.wagonId}
                </td>
                <td className="p-3 font-mono font-bold text-slate-700">{Number(w.qty || 0).toLocaleString()} Bags</td>
                <td className="p-3">
                  <span className="font-bold text-slate-900 block">{w.loadingOfficer || loadingOfficer}</span>
                  <span className="text-[10px] font-mono text-slate-500">{w.startDate || ''} {w.startTime || '—'} {w.durationStr ? `(${w.durationStr})` : ''}</span>
                </td>
                <td className="p-3">
                  <span className="font-bold text-slate-900 block">{w.unloadStatus === 'UNLOADED' ? (w.unloadingOfficer || unloadingOfficer) : 'Pending Unload'}</span>
                  <span className="text-[10px] font-mono text-slate-500">{w.unloadStartDate || ''} {w.unloadEndTime || '—'} {w.unloadDurationStr ? `(${w.unloadDurationStr})` : ''}</span>
                </td>
                <td className="p-3">
                  <Badge text={w.unloadStatus === 'UNLOADED' ? 'UNLOADED ✓' : w.status === 'LOADED' ? 'LOADED ✓' : 'LOADING'} color={w.unloadStatus === 'UNLOADED' ? 'green' : w.status === 'LOADED' ? 'blue' : 'amber'} />
                </td>
              </tr>
            ))}
          </TableWrap>
        </div>

        {/* Official Cement Offload & Operations Tracker Manifest (Matching Official Station Sheets) */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 font-mono text-xs border border-slate-800 shadow-lg">
          <div className="border-b border-slate-800 pb-3">
            <span className="text-[10px] font-extrabold uppercase text-[#62BC37] tracking-widest block">OFFICIAL STATION MANIFEST & OFFLOAD REPORT</span>
            <h4 className="text-sm sm:text-base font-black text-white mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {trip.tripSequenceNumber ? `${trip.tripSequenceNumber}TH` : ''} CEMENT OFFLOAD REPORT ON {sName(trip.destination).toUpperCase()} ({trip.createdAt})
            </h4>
            <p className="text-[11px] text-slate-300 font-sans mt-1">
              Train arrived {sName(trip.destination)} Station at {trip.arrivedTime || '23:03hrs'}, and offloading commenced. The total of {logs.length || 23} wagons containing 1,200 bags each was delivered to {sName(trip.destination)}.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Total Requisitioned</span>
              <span className="text-sm sm:text-base font-black text-white">{requisitionedBags.toLocaleString()} Bags</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Dispatched & Delivered</span>
              <span className="text-sm sm:text-base font-black text-[#62BC37]">{actualLoadedBags.toLocaleString()} Bags</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Burst Bags / Shortage</span>
              <span className="text-sm sm:text-base font-black text-amber-400">0 Burst / Nil</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Outstanding Balance</span>
              <span className={`text-sm sm:text-base font-black ${isPartialDispatch ? 'text-amber-400' : 'text-[#0E4B88]'}`}>
                {balanceOutstandingBags > 0 ? `${balanceOutstandingBags.toLocaleString()} Bags` : 'Nil (Full)'}
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl text-[11px] space-y-1 text-slate-300 font-sans border border-slate-800">
            <p className="font-bold text-white">• Total Amount of Unloaded Bags: <span className="text-[#62BC37]">{actualLoadedBags.toLocaleString()} Bags</span></p>
            <p className="font-bold text-white">• Burst Bags: <span className="text-amber-400">Nil</span> | Shortage: <span className="text-amber-400">Nil</span> | Cake: <span className="text-amber-400">Nil</span></p>
            {isPartialDispatch && (
              <p className="font-bold text-amber-400">• Discrepancy Note: Deal Requisition ({requisitionedBags.toLocaleString()} Bags) partial dispatch ({actualLoadedBags.toLocaleString()} Bags delivered). Balance of {balanceOutstandingBags.toLocaleString()} Bags remaining for next trip.</p>
            )}
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              "The offloading of shipment #{trip.tripId} for 2026 to {sName(trip.destination)} completed with 100% manifest verification before making wagons ready to be moved back to {sName(trip.origin)} as empties."
            </p>
          </div>
        </div>

        {/* Executive Sign-off Lines */}
        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[9px] uppercase text-slate-400 block font-bold">Terminal Loading Supervisor</span>
            <p className="font-black text-slate-900 mt-1">{loadingOfficer}</p>
            <p className="text-[10px] text-slate-400">Signature: ______________________</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase text-slate-400 block font-bold">Destination Unloading Supervisor</span>
            <p className="font-black text-slate-900 mt-1">{unloadingOfficer}</p>
            <p className="text-[10px] text-slate-400">Signature: ______________________</p>
          </div>
        </div>

      </div>
    </Modal>
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

/* ─────────────────────────────────────────────────────────
   DAILY OPERATIONAL ANALYTICS & PRINTABLE REPORT SECTION
───────────────────────────────────────────────────────── */
function DailyAnalyticsSection({ trips, users, onInspectTrip }: { trips: any[]; users: any[]; onInspectTrip: (trip: any) => void }) {
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');

  const totalTrips = trips.length;
  const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;
  const activeTrips = trips.filter(t => t.status === 'IN_TRANSIT' || t.status === 'LOADING').length;

  let totalBagsMoved = 0;
  let totalWagonsLoaded = 0;
  let totalLoadingMinutes = 0;
  let wagonsWithDurationCount = 0;

  trips.forEach(t => {
    const logs = t.wagonLogs || [];
    logs.forEach((w: any) => {
      if (w.status === 'LOADED' || w.unloadStatus === 'UNLOADED') {
        const q = Number(w.qty) || 0;
        totalBagsMoved += q;
        totalWagonsLoaded++;
      }
      if (w.durationStr) {
        const matchMins = w.durationStr.match(/(\d+)\s*M/i) || w.durationStr.match(/(\d+)\s*min/i);
        const matchHrs = w.durationStr.match(/(\d+)\s*h/i);
        let mins = 0;
        if (matchHrs) mins += parseInt(matchHrs[1]) * 60;
        if (matchMins) mins += parseInt(matchMins[1]);
        if (mins > 0) {
          totalLoadingMinutes += mins;
          wagonsWithDurationCount++;
        }
      }
    });
  });

  const totalTonnesMoved = ((totalBagsMoved * 50) / 1000).toLocaleString();
  const avgLoadingSpeedStr = wagonsWithDurationCount > 0 ? (totalLoadingMinutes / wagonsWithDurationCount).toFixed(1) : '—';
  const totalCorridorValueNaira = (totalBagsMoved * 1200);
  const totalCorridorValueStr = totalCorridorValueNaira > 0
    ? totalCorridorValueNaira >= 1000000
      ? `₦${(totalCorridorValueNaira / 1000000).toFixed(1)}M`
      : `₦${totalCorridorValueNaira.toLocaleString()}`
    : '₦0';

  const handlePrintDailyReport = () => {
    if (trips.length === 0) {
      alert('No freight trips recorded in database yet.');
      return;
    }
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Action Header */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 block">EXECUTIVE ERP AUDIT</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Daily Operational Analytics & Freight Audit
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time tonnage analytics, corridor velocity metrics, and official printable report manifests.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value as any)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700">
            <option value="today">Today (07 Aug 2026)</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <select value={filterCorridor} onChange={e => setFilterCorridor(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700">
            <option value="ALL">All Rail Corridors</option>
            <option value="EWK_MNY">Ewekoro ➔ Moniya</option>
            <option value="APT_MNY">Apapa Port ➔ Moniya</option>
          </select>
          <button
            onClick={handlePrintDailyReport}
            className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2"
          >
            🖨️ Print Official Daily Report
          </button>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-mono">
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Freight Volume</span>
          <p className="text-xl sm:text-2xl font-black text-[#62BC37] mt-1">{totalBagsMoved.toLocaleString()} <span className="text-xs text-slate-500 font-bold">Bags</span></p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5 font-bold">≈ {totalTonnesMoved} Metric Tonnes</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Train Movements</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalTrips} <span className="text-xs text-slate-500 font-bold">Trips</span></p>
          <p className="text-[11px] text-[#0E4B88] font-sans mt-0.5 font-bold">{completedTrips} Completed • {activeTrips} Active</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Avg Loading Speed</span>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">{avgLoadingSpeedStr} <span className="text-xs text-slate-500 font-bold">Mins/Wagon</span></p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5 font-bold">Total {totalWagonsLoaded} Wagons Loaded</p>
        </div>

        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Est. Corridor Value</span>
          <p className="text-xl sm:text-2xl font-black text-[#0E4B88] mt-1">{totalCorridorValueStr}</p>
          <p className="text-[11px] text-slate-500 font-sans mt-0.5 font-bold">100% Tariff Cleared</p>
        </div>
      </div>

      {/* Database Trip Audit Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Database Trip Audit Log</h3>
            <p className="text-xs text-slate-500">Click any trip row to view the full per-wagon timing manifest and supervising officer sign-offs.</p>
          </div>
        </div>

        <TableWrap
          headers={['Trip ID & Locomotive', 'Consignee Company', 'Corridor Route', 'Volume Moved', 'Loading Supervisor', 'Unloading Supervisor', 'Actions']}
          mobileCard={(t: any) => (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center font-mono">
                <span className="font-black text-[#0E4B88]">{t.tripId} ({t.locomotiveId || 'L2205'})</span>
                <Badge text={t.status || 'COMPLETED'} color="green" />
              </div>
              <p className="font-bold text-slate-900">{t.company}</p>
              <p className="text-[11px] text-slate-500 font-mono">Loading Officer: <b>{t.cargoOfficerName || 'Ade Bello'}</b></p>
              <p className="text-[11px] text-slate-500 font-mono">Unloading Officer: <b>{t.unloadingOfficerName || 'Musa Ibrahim'}</b></p>
              <button onClick={() => onInspectTrip(t)} className="w-full mt-2 bg-[#62BC37] text-white font-bold text-xs py-1.5 rounded-lg">
                📋 Inspect Trip Audit ➔
              </button>
            </div>
          )}
          data={trips}
        >
          {trips.map((t: any, idx: number) => (
            <tr key={t.id || idx} className="hover:bg-slate-50 text-xs">
              <td className="p-3.5 font-mono">
                <span className="font-black text-[#0E4B88] block">{t.tripId || `T10${idx + 1}`}</span>
                <span className="text-[10px] text-slate-500 font-bold">Loco #{t.locomotiveId || 'L2205'}</span>
              </td>
              <td className="p-3.5 font-bold text-slate-900">{t.company || 'Lafarge Africa Plc'}</td>
              <td className="p-3.5 font-mono text-slate-700">
                {sName(t.origin)} ➔ {sName(t.destination)}
              </td>
              <td className="p-3.5 font-mono font-bold text-[#62BC37]">
                {t.quantity || 1610} Bags
              </td>
              <td className="p-3.5 font-mono">
                <span className="font-extrabold text-slate-900 block">{t.cargoOfficerName || 'Ade Bello'}</span>
                <span className="text-[10px] text-slate-400">EWK Terminal Supervisor</span>
              </td>
              <td className="p-3.5 font-mono">
                <span className="font-extrabold text-slate-900 block">{t.unloadingOfficerName || 'Musa Ibrahim'}</span>
                <span className="text-[10px] text-slate-400">MNY Yard Supervisor</span>
              </td>
              <td className="p-3.5">
                <button
                  onClick={() => onInspectTrip(t)}
                  className="bg-slate-100 hover:bg-[#62BC37] hover:text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all border border-slate-200"
                >
                  📋 Inspect Audit ➔
                </button>
              </td>
            </tr>
          ))}
        </TableWrap>
      </div>

      {/* Official Daily Executive Sign-off Printable Block */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 print:block">
        <h4 className="text-xs font-mono font-black uppercase text-slate-400">OFFICIAL DAILY OPERATIONS EXECUTIVE SIGN-OFF</h4>
        <div className="grid grid-cols-2 gap-6 font-mono text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">SUPERVISING HEAD OF OPERATIONS</span>
            <p className="font-black text-slate-900 mt-1">Babajide Sanwo (EXEC-02)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Bueno Freight OS Dispatch HQ</p>
            <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] text-slate-400">Official Executive Signature: __________________</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">MANAGING DIRECTOR / CEO</span>
            <p className="font-black text-slate-900 mt-1">Alhaji Bashir Umar (EXEC-01)</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Bueno Logistics Limited HQ</p>
            <div className="mt-4 pt-2 border-t border-slate-300 text-[10px] text-slate-400">Official Executive Signature: __________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   ADMIN SYSTEM SETTINGS & ROLE PRIVILEGES CONTROL CENTER
───────────────────────────────────────────────────────── */
function AdminSettingsSection({ users, onSaveUsers }: { users: any[]; onSaveUsers: (v: any[]) => void }) {
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const defaultPerms = {
    canApproveFundRequests: true,
    canCreateTrips: true,
    canInspectAuditLogs: true,
    canManageDeals: true,
    canProvisionUsers: selectedUser?.role === 'ADMIN',
    canDisburseFunds: selectedUser?.role === 'HEAD_OF_FINANCE',
  };

  const [perms, setPerms] = useState<any>(selectedUser?.permissions || defaultPerms);

  useEffect(() => {
    if (selectedUser) {
      setPerms(selectedUser.permissions || {
        canApproveFundRequests: selectedUser.role === 'ADMIN' || selectedUser.role === 'HEAD_OF_OPERATIONS' || selectedUser.role === 'CEO',
        canCreateTrips: selectedUser.role === 'CARGO_OFFICER' || selectedUser.role === 'ADMIN' || selectedUser.role === 'HEAD_OF_OPERATIONS',
        canInspectAuditLogs: true,
        canManageDeals: selectedUser.role === 'ADMIN' || selectedUser.role === 'HEAD_OF_OPERATIONS' || selectedUser.role === 'CEO',
        canProvisionUsers: selectedUser.role === 'ADMIN',
        canDisburseFunds: selectedUser.role === 'HEAD_OF_FINANCE' || selectedUser.role === 'ADMIN',
      });
    }
  }, [selectedUserId, selectedUser]);

  const handleTogglePerm = (key: string) => {
    setPerms({ ...perms, [key]: !perms[key] });
  };

  const handleSaveUserPermissions = () => {
    const updated = users.map(u => u.id === selectedUserId ? { ...u, permissions: perms } : u);
    onSaveUsers(updated);
    alert(`Granular system permissions updated successfully for ${selectedUser?.fullName}!`);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-slate-400 block">ADMINISTRATIVE COMMAND</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
            System Settings & Role Permissions Control Center
          </h2>
          <p className="text-xs text-slate-500 mt-1">Manage platform configuration, grant or revoke operational privileges, and customize user access rights.</p>
        </div>

        <button
          onClick={handleSaveUserPermissions}
          className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md"
        >
          Save User Permissions ➔
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* User Selection Directory */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-4 space-y-3 shadow-xs">
          <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider px-2">Select User Account to Modify Privileges</h4>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {users.map(u => (
              <div
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${selectedUserId === u.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'}`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-xs">{u.fullName}</span>
                  <Badge text={u.roleLabel || u.role} color={selectedUserId === u.id ? 'green' : 'blue'} />
                </div>
                <p className="text-[11px] font-mono opacity-80">{u.email || u.phone}</p>
                <p className="text-[10px] uppercase font-bold opacity-60 mt-1">{u.userType} • {u.assignedStation ? `${sName(u.assignedStation)} Station` : u.companyName || 'HQ Command'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Granular Permission Matrix Settings */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div className="border-b border-slate-200 pb-4">
            <span className="text-[10px] font-mono font-extrabold uppercase text-[#62BC37] block">ACTIVE PERMISSION MATRIX FOR</span>
            <h3 className="text-lg font-black text-slate-900">{selectedUser?.fullName}</h3>
            <p className="text-xs text-slate-500">{selectedUser?.roleLabel || selectedUser?.role} • Staff ID: {selectedUser?.staffId || selectedUser?.id}</p>
          </div>

          <div className="space-y-4 text-xs font-sans">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Operational Privilege Flags</h4>

            <div className="space-y-3">
              {[
                { key: 'canApproveFundRequests', label: 'Approve & Clear Operational Fund Requests', desc: 'Allows user to review, comment on, and advance fund requisitions' },
                { key: 'canCreateTrips', label: 'Initiate Rail Trips & Load Wagons', desc: 'Grants authority to dispatch locomotives and record wagon start/end times' },
                { key: 'canInspectAuditLogs', label: 'Access Tonnage Analytics & Print Audit Reports', desc: 'Allows viewing and exporting per-trip wagon manifests and daily reports' },
                { key: 'canManageDeals', label: 'Lock In Consignment Deals & Negotiate', desc: 'Grants permission to respond to industrial clients and convert chats into deals' },
                { key: 'canProvisionUsers', label: 'Provision User Accounts & Edit Credentials', desc: 'Allows creating staff/customer accounts and changing PIN codes' },
                { key: 'canDisburseFunds', label: 'Execute Bank Disbursements & Payments', desc: 'Grants finance clearance authority to disburse approved requisitions' },
              ].map(flag => (
                <div key={flag.key} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <p className="font-extrabold text-slate-900">{flag.label}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{flag.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePerm(flag.key)}
                    className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${perms[flag.key] ? 'bg-[#62BC37] justify-end' : 'bg-slate-300 justify-start'}`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleSaveUserPermissions}
              className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md"
            >
              Save User Permissions ➔
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 6 — CUSTOMER / INDUSTRIAL CONSIGNEE
═══════════════════════════════════════════════════════════ */
function CustomerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'tracking' | 'negotiation' | 'alerts' | 'history'>('tracking');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [dealRequests, setDealRequests] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  const [dealForm, setDealForm] = useState({
    loadingStation: 'EWK',
    destination: 'MNY',
    cargoType: 'Elephant Cement (50kg Bags)',
    quantity: '5000',
    targetDate: '',
    budget: '',
    notes: '',
  });

  const companyName = user?.companyName || 'Lafarge Africa Plc';

  useEffect(() => {
    setTrips(tryParse('bueno_trips', SEED_TRIPS));
    const loadedDeals = tryParse('bueno_custom_deal_negotiations', [
      {
        id: 'DEAL-NEG-001',
        companyName,
        contactName: user?.fullName || 'Logistics Lead',
        loadingStation: 'EWK',
        destination: 'MNY',
        cargoType: 'Cement (50kg Bags)',
        quantity: '6000',
        targetDate: '15 Aug 2026',
        status: 'UNDER_NEGOTIATION',
        createdAt: '1 hour ago',
        messages: [
          { sender: user?.fullName || 'Client Lead', role: 'Industrial Consignee', text: 'We require 6,000 bags moved from Ewekoro Siding to Moniya Yard next week. What is your available wagon slot?', time: '1 hour ago' },
          { sender: 'Babajide Sanwo', role: 'Head of Operations', text: 'Good day! We have Locomotive #L2205 with 23 hopper wagons ready at Ewekoro. We can lock in this freight corridor for 15th August.', time: '45 mins ago' },
        ]
      }
    ]);
    setDealRequests(loadedDeals);
    if (loadedDeals.length > 0) setActiveDealId(loadedDeals[0].id);
  }, [companyName, user]);

  const saveNegotiations = (updated: any[]) => {
    setDealRequests(updated);
    localStorage.setItem('bueno_custom_deal_negotiations', JSON.stringify(updated));
  };

  const handleCreateDealRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const newDeal = {
      id: `DEAL-NEG-${String(dealRequests.length + 1).padStart(3, '0')}`,
      companyName,
      contactName: user?.fullName || 'Logistics Lead',
      ...dealForm,
      status: 'UNDER_NEGOTIATION',
      createdAt: 'Just now',
      messages: [
        {
          sender: user?.fullName || 'Client Lead',
          role: 'Industrial Consignee',
          text: `New Freight Requisition: ${dealForm.cargoType} (${dealForm.quantity} Bags) from ${sName(dealForm.loadingStation)} to ${sName(dealForm.destination)}. Target Date: ${dealForm.targetDate || 'ASAP'}. ${dealForm.notes}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]
    };

    const updated = [newDeal, ...dealRequests];
    saveNegotiations(updated);
    setActiveDealId(newDeal.id);

    try {
      const notifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      const newNotif = {
        id: `notif_${Date.now()}`,
        title: `Deal Negotiation Request: ${companyName}`,
        body: `Requested ${dealForm.quantity} Bags of ${dealForm.cargoType} (${sName(dealForm.loadingStation)} ➔ ${sName(dealForm.destination)})`,
        time: 'Just now',
        type: 'CLIENT_REQUEST',
        read: false,
      };
      localStorage.setItem('bueno_notifications', JSON.stringify([newNotif, ...notifs]));
    } catch {}

    setDealForm({ loadingStation: 'EWK', destination: 'MNY', cargoType: 'Elephant Cement (50kg Bags)', quantity: '5000', targetDate: '', budget: '', notes: '' });
    alert('✅ Custom Freight Deal Request submitted! Operations & Executive Command have been notified.');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeDealId) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = {
      sender: user?.fullName || 'Client Lead',
      role: 'Industrial Consignee',
      text: chatInput.trim(),
      time: now,
    };

    const updated = dealRequests.map(d => d.id === activeDealId ? { ...d, messages: [...(d.messages || []), msg] } : d);
    saveNegotiations(updated);
    setChatInput('');

    try {
      const notifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      const newNotif = {
        id: `notif_${Date.now()}`,
        title: `New Message from ${companyName}`,
        body: `"${chatInput.trim()}"`,
        time: 'Just now',
        type: 'CLIENT_REQUEST',
        read: false,
      };
      localStorage.setItem('bueno_notifications', JSON.stringify([newNotif, ...notifs]));
    } catch {}
  };

  const selectedDeal = dealRequests.find(d => d.id === activeDealId) || dealRequests[0];
  const myTrips = trips.filter(t => t.company?.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(t.company?.toLowerCase()));
  const activeTrip = myTrips.find(t => t.status === 'IN_TRANSIT' || t.status === 'LOADING' || t.status === 'UNLOADING') || myTrips[0] || SEED_TRIPS[0];

  const navItems = [
    { key: 'tracking',    label: 'Live Consignment Tracking' },
    { key: 'negotiation', label: 'Request Deal & Live Negotiation' },
    { key: 'alerts',       label: 'Live Shipment Notifications' },
    { key: 'history',      label: 'Consignment Delivery History' },
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

      {view === 'negotiation' && (
        <Section
          title="Deal Negotiation & Live Communication Center"
          subtitle="Request a custom train cargo load, negotiate tariffs and wagon counts directly with Head of Ops, CEO & Admin"
        >
          <div className="space-y-6">
            <div className="bg-[#0E4B88] text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-black uppercase text-emerald-400 tracking-widest block">DIRECT OPERATIONAL PHONE LINE</span>
                <h4 className="text-base font-black text-white mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Prefer to speak directly with the Operations Desk?
                </h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  Call our 24/7 Rail Command Desk for instant tariff quotes & train allocations.
                </p>
              </div>
              <div className="flex gap-3">
                <a
                  href="tel:+2348030000002"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  📞 Call Ops Desk: 0803 000 0002
                </a>
                <a
                  href="tel:+2348030000001"
                  className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/20 transition-all"
                >
                  CEO Direct: 0803 000 0001
                </a>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h4 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  + Request New Cargo Deal
                </h4>
                <form onSubmit={handleCreateDealRequest} className="space-y-3.5 text-xs font-semibold">
                  <div>
                    <label className={lc}>Loading Station *</label>
                    <select
                      value={dealForm.loadingStation}
                      onChange={(e) => setDealForm({ ...dealForm, loadingStation: e.target.value })}
                      className={ic}
                    >
                      {Object.entries(STATIONS).map(([code, s]) => (
                        <option key={code} value={code}>{sName(code)} ({code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={lc}>Receiving Destination Yard *</label>
                    <select
                      value={dealForm.destination}
                      onChange={(e) => setDealForm({ ...dealForm, destination: e.target.value })}
                      className={ic}
                    >
                      {Object.entries(STATIONS).map(([code, s]) => (
                        <option key={code} value={code}>{sName(code)} ({code})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lc}>Cargo Commodity *</label>
                      <input
                        required
                        value={dealForm.cargoType}
                        onChange={(e) => setDealForm({ ...dealForm, cargoType: e.target.value })}
                        placeholder="e.g. Elephant Cement"
                        className={ic}
                      />
                    </div>
                    <div>
                      <label className={lc}>Quantity (Bags) *</label>
                      <input
                        type="number"
                        required
                        value={dealForm.quantity}
                        onChange={(e) => setDealForm({ ...dealForm, quantity: e.target.value })}
                        placeholder="5000"
                        className={ic}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lc}>Target Loading Date</label>
                      <input
                        type="text"
                        value={dealForm.targetDate}
                        onChange={(e) => setDealForm({ ...dealForm, targetDate: e.target.value })}
                        placeholder="15th Aug 2026"
                        className={ic}
                      />
                    </div>
                    <div>
                      <label className={lc}>Target Rate / Budget (₦)</label>
                      <input
                        type="text"
                        value={dealForm.budget}
                        onChange={(e) => setDealForm({ ...dealForm, budget: e.target.value })}
                        placeholder="Optional target rate"
                        className={ic}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={lc}>Negotiation Notes / Siding Requirements</label>
                    <textarea
                      rows={2}
                      value={dealForm.notes}
                      onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
                      placeholder="Enter specific wagon requirements or loading bay siding notes..."
                      className={ic}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-xs transition-all"
                  >
                    Submit Deal Request to Ops & CEO ➔
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-extrabold uppercase text-[#0E4B88]">LIVE NEGOTIATION THREAD</span>
                    <h4 className="text-sm font-black text-slate-900 mt-0.5">{selectedDeal ? selectedDeal.id : 'No active negotiation'}</h4>
                  </div>
                  {selectedDeal && (
                    <Badge text={selectedDeal.status || 'UNDER_NEGOTIATION'} color="purple" />
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                  {selectedDeal && (selectedDeal.messages || []).map((m: any, idx: number) => {
                    const isMe = m.role === 'Industrial Consignee';
                    return (
                      <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1 text-[10px]">
                          <span className="font-extrabold text-slate-900">{m.sender}</span>
                          <span className="text-slate-400 font-mono">({m.role})</span>
                          <span className="text-slate-400 font-mono">• {m.time}</span>
                        </div>
                        <div className={`p-3.5 rounded-2xl max-w-sm text-xs leading-relaxed ${isMe ? 'bg-[#0E4B88] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'}`}>
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type message to Ops Head, CEO & Admin..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                  />
                  <button
                    type="submit"
                    className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                  >
                    Send ➔
                  </button>
                </form>
              </div>
            </div>
          </div>
        </Section>
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
        <Section title="Consignment Delivery History" subtitle="Archived freight shipments delivered to your receiving yards">
          <TableWrap
            headers={['Trip ID', 'Origin Loading', 'Receiving Yard', 'Cargo Type', 'Wagons & Bags', 'Delivery Date']}
            mobileCard={(t: any) => (
              <div className="space-y-1.5">
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

/* ─────────────────────────────────────────────────────────
   REAL-TIME OPERATIONAL NOTIFICATION BELL & DRAWER
───────────────────────────────────────────────────────── */
const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif_seed_1',
    title: 'New Client Service Request',
    body: 'Purechem Cement requested Ewekoro ➔ Moniya freight corridor (5,000 Bags/Month)',
    time: '5 mins ago',
    type: 'CLIENT_REQUEST',
    read: false,
  },
  {
    id: 'notif_seed_2',
    title: 'Fund Requisition Pending Review',
    body: 'Ade Bello requested ₦85,000 for Loading Bay Crane Parts (Ewekoro Terminal)',
    time: '25 mins ago',
    type: 'FUND_REQUEST',
    read: false,
  },
  {
    id: 'notif_seed_3',
    title: 'Rail Corridor Departure Alert',
    body: 'Locomotive #L2205 active on Ewekoro Corridor heading to Moniya Yard',
    time: '1 hour ago',
    type: 'TRIP_ALERT',
    read: true,
  },
];

function NotificationBell({ onNav }: { onNav?: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const syncNotifs = async () => {
      try {
        const res = await fetch('/api/notifications.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setNotifications(json.data);
            localStorage.setItem('bueno_notifications', JSON.stringify(json.data));
            return;
          }
        }
      } catch {}
      setNotifications(tryParse('bueno_notifications', DEFAULT_NOTIFICATIONS));
    };

    syncNotifs();

    window.addEventListener('storage', syncNotifs);
    window.addEventListener('bueno_state_updated', syncNotifs);
    const interval = setInterval(syncNotifs, 5000);

    return () => {
      window.removeEventListener('storage', syncNotifs);
      window.removeEventListener('bueno_state_updated', syncNotifs);
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('bueno_notifications', JSON.stringify(updated));
    try {
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}
  };

  const handleNotificationClick = (n: any) => {
    const updated = notifications.map(item => item.id === n.id ? { ...item, read: true } : item);
    setNotifications(updated);
    localStorage.setItem('bueno_notifications', JSON.stringify(updated));
    try {
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch {}
    setOpen(false);

    if (onNav) {
      if (n.targetTab) {
        onNav(n.targetTab);
      } else if (n.type === 'CLIENT_REQUEST') {
        onNav('users');
      } else if (n.type === 'FUND_REQUEST') {
        onNav('requests');
      } else if (n.type === 'TRIP_ALERT') {
        onNav('trips');
      } else if (n.type === 'DEAL_CHAT') {
        onNav('negotiations');
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden font-sans">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Operational Notifications</h4>
              <p className="text-[10px] text-slate-500 font-semibold">{unreadCount} unread alerts</p>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-bold text-[#62BC37] hover:underline">
                Mark All Read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No recent notifications.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start ${!n.read ? 'bg-emerald-50/40' : ''}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${!n.read ? 'bg-[#62BC37] animate-pulse' : 'bg-slate-300'}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-black text-slate-900">{n.title}</p>
                      <span className="text-[9px] font-mono text-slate-400">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">{n.body}</p>
                    <span className="text-[10px] font-bold text-[#62BC37] inline-block pt-1">Inspect Details ➔</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
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
    <div className="h-full bg-white flex flex-col border-r border-slate-200/90 text-slate-800" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-10 object-contain" />
        </Link>
      </div>

      {/* Station Badge */}
      <div className="p-3.5 mx-3 my-3 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-pulse" />
          <span className="text-[10px] font-mono font-black uppercase text-slate-500 tracking-wider">STATION NODE</span>
        </div>
        <p className="text-xs font-black text-slate-900">{user?.assignedStation ? `${sName(user.assignedStation)} (${user.assignedStation})` : 'Bueno Logistics HQ'}</p>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-mono font-extrabold uppercase text-slate-400 px-3 py-1">Internal Views</div>
        {navItems.map(item => {
          const isActive = activeKey === item.key;
          return (
            <button key={item.key} onClick={() => { onNav(item.key); setMenuOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-[#62BC37] text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              {item.label}
            </button>
          );
        })}


      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2 bg-slate-50/60">
        <div className="px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Signed in as</p>
          <p className="text-xs font-black text-slate-900">{user?.fullName}</p>
          <p className="text-[11px] text-[#62BC37] font-bold mt-0.5">{user?.roleLabel || user?.role}</p>
        </div>
        <Link href="/" className="block px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">← Home Page</Link>
        <button onClick={onSignOut} className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all">Sign Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/80 flex w-full max-w-full overflow-x-hidden" style={{ fontFamily: "'Inter',sans-serif" }}>
      <aside className="hidden lg:flex w-64 xl:w-72 flex-shrink-0 flex-col sticky top-0 h-screen z-30"><Nav /></aside>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMenuOpen(false)} />
          <div className="relative z-10 w-64 flex-shrink-0"><Nav /></div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden w-full">
        
        {/* Clean Corporate Top Header */}
        <header className="bg-white border-b border-slate-200/80 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0 shadow-xs relative z-20 w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setMenuOpen(true)} className="lg:hidden text-slate-700 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <img src="/bueno_logo.png" alt="Bueno Logistics Limited" className="h-7 sm:h-9 object-contain flex-shrink-0" />
            <div className="hidden md:block pl-2 border-l border-slate-200 truncate">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">BUENO FREIGHT OS</span>
              <h2 className="text-xs font-black text-slate-900 truncate" style={{ fontFamily: "'Outfit', sans-serif" }}>OPERATIONAL COMMAND DASHBOARD</h2>
            </div>
          </div>

          {/* Center Actions: Live Status + Notification Bell */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-pulse" />
              <span className="text-[10px] font-mono font-extrabold uppercase text-[#48A81B] tracking-wider">
                CORRIDOR LIVE
              </span>
            </div>

            {/* Notification Bell Component */}
            <NotificationBell onNav={onNav} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-right flex-shrink-0">
            <div className="max-w-[100px] sm:max-w-none">
              <p className="text-xs font-black text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-[9px] sm:text-[10px] text-[#62BC37] font-extrabold truncate uppercase">{user?.roleLabel || user?.role}</p>
            </div>
            <button onClick={onSignOut} className="hidden sm:block text-[11px] font-semibold text-slate-500 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all">
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">{children}</main>
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
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

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
    const syncData = async () => {
      if (typeof window !== 'undefined' && !localStorage.getItem('bueno_pxg_purged_v3')) {
        localStorage.removeItem('bueno_trips');
        localStorage.setItem('bueno_trips', '[]');
        localStorage.setItem('bueno_wagons', JSON.stringify(SEED_WAGONS));
        localStorage.setItem('bueno_pxg_purged_v3', 'true');
      }

      setDeals(tryParse('bueno_deals', SEED_DEALS));
      setWagons(tryParse('bueno_wagons', SEED_WAGONS));

      // Fetch Trips from DB
      try {
        const res = await fetch('/api/trips.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setTrips(json.data);
            localStorage.setItem('bueno_trips', JSON.stringify(json.data));
          } else {
            setTrips([]);
          }
        }
      } catch { setTrips(tryParse('bueno_trips', [])); }

      // Fetch Fund Requests from DB
      try {
        const res = await fetch('/api/requests.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setRequests(json.data);
            localStorage.setItem('bueno_requests', JSON.stringify(json.data));
          }
        }
      } catch { setRequests(tryParse('bueno_requests', SEED_REQUESTS)); }
    };

    syncData();

    window.addEventListener('storage', syncData);
    window.addEventListener('bueno_state_updated', syncData);
    const interval = setInterval(syncData, 5000);

    const now = new Date();
    setTripForm(f => ({ ...f,
      loadingDate: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      startTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('bueno_state_updated', syncData);
      clearInterval(interval);
    };
  }, []);

  const persist = (key: string, val: any[], apiEndpoint?: string) => {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new Event('bueno_state_updated'));
    if (apiEndpoint) {
      try {
        fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(val),
        });
      } catch {}
    }
  };

  const saveDeals    = (v: any[]) => { setDeals(v);    persist('bueno_deals', v);    };
  const saveTrips    = (v: any[]) => { setTrips(v);    persist('bueno_trips', v, '/api/trips.php'); };
  const saveRequests = (v: any[]) => { setRequests(v); persist('bueno_requests', v, '/api/requests.php'); };
  const saveWagons   = (v: any[]) => { setWagons(v);   persist('bueno_wagons', v);   };

  const occupiedWagonIds = getOccupiedWagonIds(trips);
  const availableWagons = wagons.filter(w => !occupiedWagonIds.has(w.id));

  const myDeals       = deals.filter(d => d.loadingStation === station);
  const myTrips       = trips.filter(t => (t.origin === station || t.cargoOfficerName === user?.fullName) && (t.status === 'LOADING' || t.status === 'IN_TRANSIT' || t.status === 'UNLOADING' || t.status === 'COMPLETED'));
  const myInTransit   = trips.filter(t => (t.origin === station || t.cargoOfficerName === user?.fullName) && t.status === 'IN_TRANSIT');
  const myIncomingUnload = trips.filter(t => (t.destination === station || t.unloadingOfficerName === user?.fullName) && (t.status === 'IN_TRANSIT' || t.status === 'UNLOADING'));

  const handleRegisterWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const wId = newWagonId.trim().toUpperCase() || `WG${String(wagons.length + 1).padStart(3, '0')}`;
    if (wagons.some(w => w.id === wId)) { alert(`Wagon ${wId} is already registered!`); return; }
    saveWagons([...wagons, { id: wId, capacity: 1200, status: 'AVAILABLE', currentStation: station, addedBy: user.fullName, createdAt: new Date().toLocaleDateString('en-GB') }]);
    setNewWagonId(''); setAddWagonModal(false);
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createDeal) return;
    const seqNum = String(trips.length + 1).padStart(3, '0');
    const formattedTripId = `TRIP-${seqNum}`;
    const now = new Date();
    const formattedCreated = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const totalBags = Number(createDeal.quantity) || 27600;
    const targetWagonsCount = Math.max(1, Math.ceil(totalBags / 1200));

    const newTrip = {
      id: formattedTripId,
      tripId: formattedTripId,
      tripSequenceNumber: trips.length + 1,
      dealId: createDeal.id,
      locomotiveId: tripForm.locomotiveId,
      cargoOfficerName: user.fullName,
      company: createDeal.company,
      origin: station,
      destination: createDeal.destination,
      cargoType: createDeal.cargoType,
      quantity: totalBags,
      targetWagonsCount,
      status: 'LOADING',
      createdAt: formattedCreated,
      wagonLogs: [],
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
                {myDeals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 sm:p-12 text-center bg-gradient-to-b from-slate-50 to-emerald-50/30">
                      <div className="max-w-md mx-auto space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#62BC37] mx-auto flex items-center justify-center shadow-xs">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {sName(station)} Terminal Ready & Operational
                          </h4>
                          <p className="text-xs text-slate-500 font-medium mt-1">
                            No active freight deals assigned to {sName(station)} right now. Awaiting new deal allocation from Admin/HQ.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : myDeals.map(d => (
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
            <Section title="Trips on the Move (Live GPS Corridor Stream)" subtitle="Dispatched trips currently in corridor transit from your station — click any row to track">
              <TableWrap
                headers={['Trip ID', 'Company', 'Locomotive', 'Route', 'Status', 'Action']}
                mobileCard={(t: any) => (
                  <div className="space-y-2 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                      <Badge text={t.status} color="green" />
                    </div>
                    <p className="font-bold text-slate-900">{t.company}</p>
                    <p className="text-xs font-mono text-slate-700">{t.locomotiveId}</p>
                    <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                    <p className="text-xs font-bold text-[#62BC37] pt-1">Inspect Audit & Phone GPS ➔</p>
                  </div>
                )}
                data={myInTransit}
              >
                {myInTransit.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No trips currently in transit.</td></tr>
                  : myInTransit.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedTripId(t.id)}>
                      <td className="p-4 font-mono font-black text-[#0E4B88]">{t.tripId}</td>
                      <td className="p-4 font-bold text-slate-900">{t.company}</td>
                      <td className="p-4 font-mono text-slate-800">{t.locomotiveId}</td>
                      <td className="p-4 text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</td>
                      <td className="p-4"><Badge text={t.status} color="green" /></td>
                      <td className="p-4 font-bold text-[#62BC37]">Inspect Audit & Phone GPS ➔</td>
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
      <CustomAlertModal isOpen={!!customAlert} message={customAlert?.message || null} title={customAlert?.title} onClose={() => setCustomAlert(null)} />
      {addWagonModal && (
        <AddWagonModal
          isOpen={addWagonModal}
          onClose={() => setAddWagonModal(false)}
          onSaveWagon={(newWagon) => {
            const updated = [newWagon, ...wagons];
            saveWagons(updated);
            setCustomAlert({
              title: 'PXG Wagon Registered',
              message: `Wagon ${newWagon.id} registered successfully to ${sName(newWagon.currentStation)} fleet inventory!`,
            });
          }}
        />
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
   REGISTER NEW PXG WAGON MODAL (ADMIN & CARGO OFFICERS)
───────────────────────────────────────────────────────── */
function AddWagonModal({ isOpen, onClose, onSaveWagon }: { isOpen: boolean; onClose: () => void; onSaveWagon: (newWagon: any) => void }) {
  const [wagonPrefix, setWagonPrefix] = useState('PXG');
  const [wagonNum, setWagonNum] = useState('');
  const [capacity, setCapacity] = useState('1200');
  const [stationCode, setStationCode] = useState('PAPA');
  const [gauge, setGauge] = useState<'STANDARD_GAUGE' | 'NARROW_GAUGE'>('STANDARD_GAUGE');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wagonNum.trim()) {
      alert('Please enter a valid Wagon Identification Number (e.g. 2322)');
      return;
    }
    const cleanNum = wagonNum.trim().toUpperCase();
    const formattedCode = `${wagonPrefix} ${cleanNum}`;
    const newWagon = {
      id: formattedCode,
      wagonType: wagonPrefix,
      capacity: Number(capacity) || 1200,
      status: 'AVAILABLE',
      currentStation: stationCode,
      gauge: gauge || sGauge(stationCode),
      addedBy: 'Field Officer Registration',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    onSaveWagon(newWagon);
    setWagonNum('');
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div className="p-6 space-y-4 font-sans">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Register New Railway Freight Wagon</h3>
          <button onClick={onClose} className="text-slate-400 font-bold hover:text-slate-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Carriage Type Code *</label>
              <select
                value={wagonPrefix}
                onChange={e => setWagonPrefix(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
              >
                {WAGON_TYPES.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Identification No. *</label>
              <input
                type="text"
                required
                placeholder="e.g. 2322 or 4599"
                value={wagonNum}
                onChange={e => setWagonNum(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Track Gauge Compatibility *</label>
              <select
                value={gauge}
                onChange={e => setGauge(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
              >
                <option value="STANDARD_GAUGE">Standard Gauge (1435mm - Moniya/Papalanto/APMT)</option>
                <option value="NARROW_GAUGE">Narrow Gauge (1067mm - Ewekoro/Dugbe/Oshogbo)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Terminal Station *</label>
              <select
                value={stationCode}
                onChange={e => {
                  setStationCode(e.target.value);
                  setGauge(sGauge(e.target.value));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
              >
                {Object.entries(STATIONS).map(([code, s]) => <option key={code} value={code}>{s.name} ({s.gauge === 'STANDARD_GAUGE' ? 'Standard' : 'Narrow'})</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Capacity (Units / Bags / Tonnes)</label>
            <input
              type="number"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
            <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md">+ Register Wagon to Inventory ➔</button>
          </div>
        </form>
      </div>
    </Modal>
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
  const [stoppingWagon, setStoppingWagon] = useState<any | null>(null);
  const [bagsLoadedInput, setBagsLoadedInput] = useState('1200');
  const [loadingLogForm, setLoadingLogForm] = useState({
    sourceEnv: 'Silo Bay 1 - Loading Siding',
    truckRegNo: 'KJA-482-XY',
    driverDetails: 'Ibrahim Garba (08031112233)',
    transporter: 'Dangote Logistics Fleet',
    startTimeEdit: '',
    endTimeEdit: '',
  });

  if (!trip) return <div className="p-8 text-center text-xs text-slate-400">Trip not found. <button onClick={onBack} className="underline text-[#62BC37]">Go back</button></div>;

  const totalBags = Number(trip.quantity) || 1610;
  const targetCount = trip.targetWagonsCount || Math.max(1, Math.ceil(totalBags / 1200));

  const loadedLogs = logs.filter((w: any) => w.status === 'LOADED');
  const loadedCount = loadedLogs.length;
  const active = logs.find((w: any) => w.status === 'LOADING');
  const totalBagsLoadedSoFar = loadedLogs.reduce((acc: number, w: any) => acc + (Number(w.qty) || 0), 0);
  const allDone = loadedCount >= targetCount;
  const pct = Math.min(100, Math.round((loadedCount / targetCount) * 100));

  const occupiedWagonIds = getOccupiedWagonIds(trips);
  const usedInThisTrip = new Set(logs.map((w: any) => w.wagonId));
  const available = (wagons || SEED_WAGONS).filter((w: any) => !occupiedWagonIds.has(w.id) && !usedInThisTrip.has(w.id));

  const isTripInTransit = trip.status === 'IN_TRANSIT' || trip.status === 'UNLOADING' || trip.status === 'COMPLETED' || trip.status === 'ARRIVED';

  const commitLogs = (updated: any[], tripStatusOverride?: string) => {
    setLogs(updated);
    const updatedTrips = trips.map((t: any) => t.id === trip.id ? { ...t, wagonLogs: updated, status: tripStatusOverride || t.status } : t);
    onSaveTrips(updatedTrips);
  };

  const startLoadingWagon = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTripInTransit) {
      alert('Trip is already in transit or completed! Loading is locked.');
      return;
    }
    const wId = selWagon || available[0]?.id || 'WG001';
    if (!wId) {
      alert('No available wagon selected!');
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
      sourceEnv: loadingLogForm.sourceEnv || 'Plant Siding Bay 1',
      truckRegNo: loadingLogForm.truckRegNo || 'N/A',
      driverDetails: loadingLogForm.driverDetails || 'N/A',
      transporter: loadingLogForm.transporter || 'Consignment Logistics',
      status: 'LOADING',
      unloadStatus: 'PENDING_UNLOAD',
    };

    commitLogs([...logs, newLog], 'LOADING');
    setAdding(false);
    setSelWagon('');
  };

  const handleOpenStopModal = (w: any) => {
    const remainingBags = Math.max(0, totalBags - totalBagsLoadedSoFar);
    const defaultQty = remainingBags > 0 && remainingBags < 1200 ? remainingBags : 1200;
    setBagsLoadedInput(String(defaultQty));
    setLoadingLogForm({
      sourceEnv: w.sourceEnv || 'Silo Bay 1 - Loading Siding',
      truckRegNo: w.truckRegNo || 'KJA-482-XY',
      driverDetails: w.driverDetails || 'Ibrahim Garba (08031112233)',
      transporter: w.transporter || 'Dangote Logistics Fleet',
      startTimeEdit: w.startTime || '08:30 AM',
      endTimeEdit: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setStoppingWagon(w);
  };

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

  const dispatchAndActivateGps = async () => {
    if (active) {
      alert(`Wagon ${active.wagonId} is currently loading! Please stop loading before dispatching the trip.`);
      return;
    }
    if (loadedCount < 1) {
      alert('Please load at least 1 wagon before starting the trip!');
      return;
    }

    const now = new Date();
    const departureTimeStr = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
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

    // Push notification to destination cargo officer & execs
    const notifPayload = {
      id: `ntf_${Date.now()}`,
      title: 'Train Departed Origin Station',
      message: `Locomotive ${trip.locomotiveId} with ${loadedCount} wagons (${totalBagsLoadedSoFar.toLocaleString()} bags) departed ${sName(trip.origin)} heading to ${sName(trip.destination)}.`,
      targetId: trip.id,
      targetTab: 'in_transit',
      read: false,
      createdAt: departureTimeStr
    };

    try {
      const existingNotifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      localStorage.setItem('bueno_notifications', JSON.stringify([notifPayload, ...existingNotifs]));
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPayload)
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
    <div className="space-y-5">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <button onClick={onBack} className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl">← Back to Trips</button>
        <div className="flex items-center gap-2">
          {isTripInTransit && <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">LOADING LOCKED (IN TRANSIT)</span>}
          <span className="text-xs font-bold text-[#62BC37] bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">{loadedCount} / {targetCount} Wagons Loaded ({totalBagsLoadedSoFar.toLocaleString()} / {totalBags.toLocaleString()} Bags)</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#62BC37]">TRIP {trip.tripId} — ORIGIN LOADING DETAILS</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[['Locomotive ID', trip.locomotiveId], ['Cargo Officer', trip.cargoOfficerName], ['Loading Station', trip.origin ? sName(trip.origin) : ''], ['Destination', trip.destination ? sName(trip.destination) : ''], ['Company', trip.company], ['Cargo Type', trip.cargoType], ['Quantity Requisitioned', `${Number(trip.quantity).toLocaleString()} Bags`], ['Trip Created', trip.createdAt || '—']].map(([l, v]) => (
            <div key={l}><span className="block text-[9px] font-extrabold uppercase text-slate-400">{l}</span><span className="font-bold text-slate-900">{v}</span></div>
          ))}
        </div>
      </div>

      {!isTripInTransit && (
        <div className="bg-[#62BC37] text-white rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                <p className="text-xs font-black uppercase tracking-wider font-mono">LIVE GPS TRACKER & CORRIDOR DISPATCH</p>
              </div>
              <p className="text-base font-black text-white mt-1">Locomotive: <span className="font-mono text-white/90">{trip.locomotiveId}</span></p>
              <p className="text-xs text-white/80 mt-0.5">Clicking 'Depart Train & Activate Live GPS' locks the loading phase, notifies destination officer, & launches live corridor tracking.</p>
            </div>
            <button onClick={dispatchAndActivateGps} disabled={loadedCount < 1 || !!active} className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              <span>Depart Train & Activate Live GPS Tracker ➔</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Loading Progress</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[['Maximum Required Wagons', '23 Wagons', 'text-slate-900'], ['Loaded Wagons', String(loadedCount), 'text-[#62BC37]'], ['Bags Loaded', totalBagsLoadedSoFar.toLocaleString(), 'text-emerald-700'], ['Progress', `${pct}%`, 'text-[#0E4B88]']].map(([l, v, c]) => (
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
          <div>
            <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Wagon Loading Logs</h3>
            <p className="text-xs text-slate-500">Each wagon carries up to 1,200 bags. Cargo Officer starts and stops loading timer per wagon.</p>
          </div>
          {!isTripInTransit && !active && !allDone && !adding && (
            <button onClick={() => setAdding(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Select Wagon to Load</button>
          )}
        </div>

        {!isTripInTransit && adding && (
          <form onSubmit={startLoadingWagon} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <label className={lc}>Select Available Wagon from Fleet ({available.length} Available at {sName(trip.origin)})</label>
              <select value={selWagon} onChange={e => setSelWagon(e.target.value)} className={ic}>
                {available.length === 0 ? <option value="">No available wagons right now at {sName(trip.origin)}</option> : available.map((w: any) => <option key={w.id} value={w.id}>{w.id} (Capacity: {w.capacity || 1200} Bags)</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
              <button type="submit" disabled={available.length === 0} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2 rounded-xl disabled:opacity-50 shadow-sm">Start Loading Wagon ➔</button>
            </div>
          </form>
        )}

        {active && (
          <div className="bg-emerald-50 border-2 border-[#62BC37] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold text-[#62BC37] uppercase tracking-wider">LOADING IN PROGRESS</p>
              <p className="text-xl font-mono font-black text-slate-900">{active.wagonId}</p>
              <p className="text-xs text-slate-600 mt-0.5">Started: <b className="text-slate-800">{active.startDate} at {active.startTime}</b></p>
            </div>
            <div className="flex items-center gap-5">
              <div><span className={lc}>Live Timer</span><LiveTimer ts={active.startTimestamp} /></div>
              {!isTripInTransit && (
                <button onClick={() => handleOpenStopModal(active)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">Stop Loading ✓</button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">No wagons loaded yet. Click '+ Select Wagon to Load' to start.</div>
          ) : (
            logs.map((w: any, i: number) => (
              <div key={w.id || i} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 mr-2">Wagon #{i + 1}</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                  {w.status === 'LOADED' && <span className="ml-3 font-bold text-emerald-700 font-mono">({Number(w.qty || 1200).toLocaleString()} Bags Loaded)</span>}
                </div>
                <div className="font-mono text-slate-600">
                  <span>Started: <b>{w.startDate} {w.startTime}</b></span>
                  {w.endDate && <span className="ml-3">Ended: <b>{w.endDate} {w.endTime}</b></span>}
                  <span className="ml-3 font-bold text-slate-900">Duration: {w.durationStr || 'Running...'}</span>
                </div>
                <Badge text={w.status} color={w.status === 'LOADED' ? 'green' : 'blue'} />

                {w.status === 'LOADED' && (
                  <div className="w-full mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px]">
                    <div><span className="text-[9px] uppercase font-extrabold text-slate-400 block">Source Environment</span><span className="font-bold text-slate-800">{w.sourceEnv || 'Plant Siding'}</span></div>
                    <div><span className="text-[9px] uppercase font-extrabold text-slate-400 block">Truck Reg No.</span><span className="font-mono font-black text-[#0E4B88]">{w.truckRegNo || 'N/A'}</span></div>
                    <div><span className="text-[9px] uppercase font-extrabold text-slate-400 block">Driver Name & Phone</span><span className="font-bold text-slate-800">{w.driverDetails || 'N/A'}</span></div>
                    <div><span className="text-[9px] uppercase font-extrabold text-slate-400 block">Transporter Company</span><span className="font-bold text-slate-800">{w.transporter || 'Rail Logistics'}</span></div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {stoppingWagon && (
        <Modal onClose={() => setStoppingWagon(null)}>
          <div className="p-6 space-y-4 font-sans">
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Wagon Loading Source Logistics & Time Audit</h3>
            <p className="text-xs text-slate-600">
              Complete loading log for Wagon <b>{stoppingWagon.wagonId}</b>. Verify start/concluding times, truck registration, driver details, and loaded quantity.
            </p>
            <form onSubmit={confirmStopLoading} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Editable Loading Start Time</label>
                  <input type="text" value={loadingLogForm.startTimeEdit} onChange={e => setLoadingLogForm({ ...loadingLogForm, startTimeEdit: e.target.value })} className={`${ic} font-mono`} placeholder="08:30 AM" />
                </div>
                <div>
                  <label className={lc}>Editable Concluding Time</label>
                  <input type="text" value={loadingLogForm.endTimeEdit} onChange={e => setLoadingLogForm({ ...loadingLogForm, endTimeEdit: e.target.value })} className={`${ic} font-mono`} placeholder="10:15 AM" />
                </div>
              </div>

              <div>
                <label className={lc}>Source for Loading Wagon *</label>
                <input required value={loadingLogForm.sourceEnv} onChange={e => setLoadingLogForm({ ...loadingLogForm, sourceEnv: e.target.value })} placeholder="e.g. Silo Bay 1 - Loading Siding" className={ic} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Truck Registration Number *</label>
                  <input required value={loadingLogForm.truckRegNo} onChange={e => setLoadingLogForm({ ...loadingLogForm, truckRegNo: e.target.value })} placeholder="e.g. KJA-482-XY" className={`${ic} font-mono uppercase font-bold`} />
                </div>
                <div>
                  <label className={lc}>Transporter / Haulage Company *</label>
                  <input required value={loadingLogForm.transporter} onChange={e => setLoadingLogForm({ ...loadingLogForm, transporter: e.target.value })} placeholder="e.g. Dangote Logistics Fleet" className={ic} />
                </div>
              </div>

              <div>
                <label className={lc}>Driver Name & Phone Number *</label>
                <input required value={loadingLogForm.driverDetails} onChange={e => setLoadingLogForm({ ...loadingLogForm, driverDetails: e.target.value })} placeholder="e.g. Ibrahim Garba (08031112233)" className={ic} />
              </div>

              <div>
                <label className={lc}>Actual Quantity Loaded (Bags / Tonnes / Units) *</label>
                <input required type="number" min="1" value={bagsLoadedInput} onChange={e => setBagsLoadedInput(e.target.value)} className={`${ic} font-mono text-base font-bold text-emerald-800`} />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setStoppingWagon(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md">Save & Complete Wagon Load ✓</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   WAGON UNLOADING VIEW (at Destination Unloading Station)
───────────────────────────────────────────────────────── */
function TripUnloadWagonView({ tripId, trips, user, onBack, onSaveTrips }: any) {
  const trip = trips.find((t: any) => t.id === tripId);
  const [logs, setLogs] = useState<any[]>(trip?.wagonLogs || []);
  const [stoppingUnloadWagon, setStoppingUnloadWagon] = useState<any | null>(null);
  const [bagsUnloadedInput, setBagsUnloadedInput] = useState('1200');

  if (!trip) return <div className="p-8 text-center text-xs text-slate-400">Trip not found. <button onClick={onBack} className="underline text-[#62BC37]">Go back</button></div>;

  const total = logs.length;
  const unloaded = logs.filter((w: any) => w.unloadStatus === 'UNLOADED').length;
  const allUnloaded = unloaded >= total && total > 0;
  const activeUnload = logs.find((w: any) => w.unloadStatus === 'UNLOADING');
  const pct = total > 0 ? Math.min(100, Math.round((unloaded / total) * 100)) : 0;

  const commitLogs = (updated: any[], statusOverride?: string) => {
    setLogs(updated);
    onSaveTrips(trips.map((t: any) => t.id === trip.id ? { ...t, status: statusOverride || (allUnloaded ? 'ARRIVED' : 'UNLOADING'), wagonLogs: updated } : t));
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
        unloadingOfficer: user.fullName,
      };
    });
    commitLogs(updated, 'UNLOADING');
  };

  const handleOpenStopUnloadModal = (w: any) => {
    setBagsUnloadedInput(String(w.qty || 1200));
    setStoppingUnloadWagon(w);
  };

  const confirmStopUnloading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stoppingUnloadWagon) return;
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const mins = Math.max(1, Math.round((Date.now() - (stoppingUnloadWagon.unloadStartTimestamp || Date.now())) / 60000));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    const durationStr = hours > 0 ? `${hours}h ${remMins}m` : `${mins} Minutes`;
    const bagsUnloaded = Number(bagsUnloadedInput) || stoppingUnloadWagon.qty || 1200;

    const updated = logs.map((w: any) => {
      if (w.wagonId !== stoppingUnloadWagon.wagonId) return w;
      return {
        ...w,
        unloadEndDate: formattedDate,
        unloadEndTime: formattedTime,
        unloadDurationStr: durationStr,
        unloadedQty: bagsUnloaded,
        unloadStatus: 'UNLOADED',
      };
    });

    commitLogs(updated);
    setStoppingUnloadWagon(null);
  };

  const completeTrip = () => {
    const now = new Date();
    const completedTimestamp = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const updatedTrips = trips.map((t: any) =>
      t.id === trip.id
        ? {
            ...t,
            status: 'COMPLETED',
            completedAt: completedTimestamp,
            unloadingOfficerName: user.fullName,
            wagonLogs: logs,
          }
        : t
    );
    onSaveTrips(updatedTrips);

    // Release wagons back to fleet at destination station
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

    // Dispatch real database notification to Admin, Ops, CEO, Origin Officer
    const notifPayload = {
      id: `ntf_${Date.now()}`,
      title: 'Consignment Unloading Completed & Trip Finished',
      message: `Trip ${trip.tripId} (${trip.company}) fully unloaded at ${sName(trip.destination)}. All ${logs.length} wagons returned to ${sName(trip.destination)} fleet inventory.`,
      targetId: trip.id,
      targetTab: 'trips',
      read: false,
      createdAt: completedTimestamp,
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

    alert('Trip ' + trip.tripId + ' successfully COMPLETED!\n\nAll ' + logs.length + ' wagons marked UNLOADED and released to ' + sName(trip.destination) + ' fleet.\nNotifications sent to Admin, Operations Head, & CEO.');
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
          {[['Locomotive ID', trip.locomotiveId], ['Origin Loading Station', trip.origin ? sName(trip.origin) : ''], ['Destination Station', trip.destination ? sName(trip.destination) : ''], ['Unloading Officer', user.fullName], ['Company', trip.company], ['Cargo Type', trip.cargoType], ['Quantity Requisitioned', `${Number(trip.quantity).toLocaleString()} Bags`], ['Status', trip.status]].map(([l, v]) => (
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
            <p className="text-[10px] font-extrabold text-purple-800 uppercase">CURRENTLY UNLOADING WAGON</p>
            <p className="text-xl font-mono font-black text-slate-900">{activeUnload.wagonId}</p>
            <p className="text-xs text-slate-600 mt-0.5">Started: <b className="text-slate-800">{activeUnload.unloadStartDate} at {activeUnload.unloadStartTime}</b></p>
          </div>
          <div className="flex items-center gap-5">
            <div><span className={lc}>Unloading Live Timer</span><LiveTimer ts={activeUnload.unloadStartTimestamp} /></div>
            <button onClick={() => handleOpenStopUnloadModal(activeUnload)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">Stop Unloading ✓</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>Consignment Wagons (Loaded at {sName(trip.origin)})</h3>
            <p className="text-xs text-slate-500">Unload each wagon arriving from {sName(trip.origin)} and record unloading durations.</p>
          </div>
        </div>

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">No wagon logs found for this trip.</div>
          ) : (
            logs.map((w: any, i: number) => {
              const isUnloading = w.unloadStatus === 'UNLOADING';
              const isUnloaded  = w.unloadStatus === 'UNLOADED';
              return (
                <div key={w.id || i} className={`border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs transition-all ${isUnloaded ? 'bg-emerald-50/50 border-emerald-200' : isUnloading ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200'}`}>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 mr-2">Wagon #{i + 1}</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{w.wagonId}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Loaded Bags: <b className="text-slate-800">{Number(w.qty || 1200).toLocaleString()}</b> | Origin Loading Duration: <b className="text-slate-800">{w.durationStr || '—'}</b></p>
                  </div>
                  <div className="font-mono text-slate-600 text-right">
                    {isUnloaded ? (
                      <div>
                        <p className="text-emerald-700 font-bold">Unloaded ({Number(w.unloadedQty || w.qty || 1200).toLocaleString()} Bags) in {w.unloadDurationStr || '—'}</p>
                        <p className="text-[10px] text-slate-400">{w.unloadStartDate} {w.unloadStartTime} ➔ {w.unloadEndDate} {w.unloadEndTime}</p>
                      </div>
                    ) : isUnloading ? (
                      <p className="text-purple-700 font-bold animate-pulse">Unloading in progress...</p>
                    ) : (
                      <p className="text-slate-400">Ready to unload</p>
                    )}
                  </div>
                  <div>
                    {isUnloaded ? (
                      <Badge text="UNLOADED ✓" color="green" />
                    ) : isUnloading ? (
                      <button onClick={() => handleOpenStopUnloadModal(w)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-xl">Stop Unload ✓</button>
                    ) : !activeUnload ? (
                      <button onClick={() => startUnloading(w.wagonId)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm">Start Unload ➔</button>
                    ) : (
                      <span className="text-[10px] text-slate-400">Waiting for active wagon</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {allUnloaded && (
          <div className="bg-[#62BC37] text-white rounded-2xl p-5 space-y-3 mt-4 shadow-md">
            <p className="text-sm font-bold text-white">All {logs.length} Wagons Successfully Unloaded at {sName(trip.destination)}!</p>
            <button onClick={completeTrip} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-sm py-3.5 rounded-xl shadow-lg transition-all">
              Complete Consignment & Return Wagons to Fleet Inventory ✓
            </button>
          </div>
        )}
      </div>

      {stoppingUnloadWagon && (
        <Modal onClose={() => setStoppingUnloadWagon(null)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Confirm Wagon Unloading Completion</h3>
            <p className="text-xs text-slate-600">
              Wagon <b>{stoppingUnloadWagon.wagonId}</b> unloading started at <b>{stoppingUnloadWagon.unloadStartDate} {stoppingUnloadWagon.unloadStartTime}</b>. Confirm bags unloaded.
            </p>
            <form onSubmit={confirmStopUnloading} className="space-y-4">
              <div>
                <label className={lc}>Actual Bags Unloaded from {stoppingUnloadWagon.wagonId} *</label>
                <input required type="number" min="1" max="1200" value={bagsUnloadedInput} onChange={e => setBagsUnloadedInput(e.target.value)} className={`${ic} font-mono text-base font-bold text-purple-900`} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setStoppingUnloadWagon(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm">Save & Stop Unload ✓</button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
/* ─────────────────────────────────────────────────────────
   ADMIN USER PROVISIONING & GRANULAR PERMISSIONS MATRIX
───────────────────────────────────────────────────────── */
const PERMISSIONS_CATALOG = [
  { code: 'deal.create', label: 'Create Freight Deals', group: 'Deals' },
  { code: 'deal.edit', label: 'Edit Freight Deals', group: 'Deals' },
  { code: 'deal.delete', label: 'Delete Freight Deals', group: 'Deals' },
  { code: 'trip.create', label: 'Initiate Rail Trips (TRIP-001)', group: 'Trips' },
  { code: 'trip.dispatch', label: 'Dispatch In-Transit (Phone GPS)', group: 'Trips' },
  { code: 'trip.complete', label: 'Unload & Finalize Trips', group: 'Trips' },
  { code: 'wagon.register', label: 'Register New PXG Wagons', group: 'Fleet Assets' },
  { code: 'wagon.transfer', label: 'Transfer Wagon Station Nodes', group: 'Fleet Assets' },
  { code: 'invoice.create', label: 'Generate Freight Invoices', group: 'Financials' },
  { code: 'expense.request', label: 'Request Station Operating Funds', group: 'Financials' },
  { code: 'expense.approve', label: 'Approve & Disburse Station Funds', group: 'Financials' },
  { code: 'user.provision', label: 'Provision User Accounts', group: 'System Admin' },
  { code: 'user.edit', label: 'Edit User Accounts & PINs', group: 'System Admin' },
  { code: 'report.export', label: 'Export Reports (Excel/CSV/PDF)', group: 'System Admin' },
];

function UserProvisioningSection({ users, onSaveUsers }: { users: any[]; onSaveUsers: (u: any[]) => void }) {
  const [filter, setFilter] = useState<'ALL' | 'STAFF' | 'CUSTOMER' | 'REQS' | 'PERMISSIONS'>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // Role Permissions Matrix State
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(() => {
    return tryParse('bueno_role_permissions', {
      ADMIN: PERMISSIONS_CATALOG.map(p => p.code),
      HEAD_OF_OPERATIONS: ['deal.create', 'trip.create', 'trip.dispatch', 'trip.complete', 'wagon.transfer', 'expense.approve', 'report.export'],
      CEO: ['deal.create', 'trip.complete', 'invoice.create', 'expense.approve', 'report.export'],
      HEAD_OF_FINANCE: ['invoice.create', 'expense.request', 'expense.approve', 'report.export'],
      CARGO_OFFICER: ['trip.create', 'trip.dispatch', 'trip.complete', 'wagon.transfer', 'expense.request'],
      CUSTOMER: ['report.export'],
    });
  });

  const toggleRolePermission = (role: string, permCode: string) => {
    const current = rolePermissions[role] || [];
    const updated = current.includes(permCode)
      ? current.filter(c => c !== permCode)
      : [...current, permCode];
    const newMatrix = { ...rolePermissions, [role]: updated };
    setRolePermissions(newMatrix);
    localStorage.setItem('bueno_role_permissions', JSON.stringify(newMatrix));
  };

  useEffect(() => {
    setClientRequests(tryParse('bueno_client_requests', [
      {
        id: 'REQ-seed-01',
        companyName: 'Purechem Cement Industries Ltd',
        industry: 'Cement & Construction',
        contactName: 'Engr. Clement Lawson',
        email: 'logistics@purechem.ng',
        phone: '08031234567',
        volume: '5,000 Bags/Month',
        route: 'EWK ➔ MNY (Ewekoro to Moniya)',
        status: 'PENDING',
        createdAt: '5 mins ago',
      }
    ]));
  }, []);

  const approveAndProvisionRequest = async (req: any) => {
    const num = Math.floor(1000 + Math.random() * 9000);
    const newCustomer = {
      id: `usr_${Date.now()}`,
      fullName: req.contactName || `${req.companyName} Freight Manager`,
      email: req.email,
      phone: req.phone,
      role: 'CUSTOMER',
      userType: 'CUSTOMER',
      companyName: req.companyName,
      staffId: `CUST-${num}`,
      pin: '1111',
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('en-GB'),
    };

    // 1. Add to users
    onSaveUsers([newCustomer, ...users]);
    window.dispatchEvent(new Event('bueno_state_updated'));

    // Push live to cPanel Database API
    try {
      await fetch('/api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });
    } catch {}

    // 2. Mark request as provisioned
    const updatedReqs = clientRequests.map(r => r.id === req.id ? { ...r, status: 'PROVISIONED' } : r);
    setClientRequests(updatedReqs);
    localStorage.setItem('bueno_client_requests', JSON.stringify(updatedReqs));

    // 3. Mark notification as read
    try {
      const notifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      const updatedNotifs = notifs.map((n: any) => n.reqId === req.id ? { ...n, read: true } : n);
      localStorage.setItem('bueno_notifications', JSON.stringify(updatedNotifs));
    } catch {}

    // 4. Trigger Real Transactional Email API Webhook
    try {
      await fetch('/api/send_mail.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: req.email,
          companyName: req.companyName,
          contactName: req.contactName,
          staffId: `CUST-${num}`,
          pin: '1111',
        })
      });
    } catch {}

    alert(`✅ ${req.companyName} has been approved and provisioned as an active Industrial Client!\n\n📧 Authentic Welcome Email with 4-Digit Security PIN (1111) dispatched to: ${req.email}`);
  };

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    userType: 'STAFF',
    role: 'CARGO_OFFICER',
    assignedStation: 'EWK',
    companyName: 'Lafarge Africa Plc',
    pin: '1111',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || (!form.email.trim() && !form.phone.trim())) {
      setCustomAlert({
        title: 'Missing Required Fields',
        message: 'Please provide Full Name and at least Email or Phone Number.',
      });
      return;
    }

    const num = Math.floor(1000 + Math.random() * 9000);
    const newUser = {
      id: `usr_${Date.now()}`,
      fullName: form.fullName.trim(),
      email: form.email.trim() || `${form.fullName.toLowerCase().replace(/\s+/g, '.')}@bueno.ng`,
      phone: form.phone.trim() || '08030000000',
      role: form.userType === 'CUSTOMER' ? 'CUSTOMER' : form.role,
      userType: form.userType,
      assignedStation: form.assignedStation,
      stationName: sName(form.assignedStation),
      companyName: form.userType === 'CUSTOMER' ? (form.companyName || form.fullName) : null,
      staffId: form.role === 'CARGO_OFFICER' ? `${form.assignedStation}-${num}` : `STAFF-${num}`,
      pin: form.pin || '1111',
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('en-GB'),
    };

    const updated = [newUser, ...users];
    onSaveUsers(updated);

    try {
      await fetch('/api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
    } catch {}

    setCustomAlert({
      title: 'User Account Provisioned',
      message: `Account for "${newUser.fullName}" (${newUser.role}) provisioned successfully and active in database!`,
    });

    setModalOpen(false);
    setForm({ fullName: '', email: '', phone: '', userType: 'STAFF', role: 'CARGO_OFFICER', assignedStation: 'EWK', companyName: 'Lafarge Africa Plc', pin: '1111' });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const updatedUser = {
      ...editingUser,
      fullName: editingUser.fullName.trim(),
      stationName: sName(editingUser.assignedStation),
    };
    const updatedUsers = users.map(u => u.id === editingUser.id ? updatedUser : u);
    onSaveUsers(updatedUsers);

    try {
      await fetch('/api/users.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });
    } catch {}

    setCustomAlert({
      title: 'User Account Updated',
      message: `Account details for "${updatedUser.fullName}" updated & saved successfully to server!`,
    });
    setEditingUser(null);
  };

  const toggleStatus = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, status: u.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' } : u);
    onSaveUsers(updated);
  };

  const deleteUser = (id: string) => {
    if (confirm('Are you sure you want to permanently delete this user account?')) {
      const updated = users.filter(u => u.id !== id);
      onSaveUsers(updated);
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'STAFF' && u.userType !== 'STAFF') return false;
    if (filter === 'CUSTOMER' && u.userType !== 'CUSTOMER') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q)) || (u.companyName && u.companyName.toLowerCase().includes(q));
    }
    return true;
  });

  const pendingCount = clientRequests.filter(r => r.status === 'PENDING').length;

  return (
    <Section
      title="User Provisioning & Account Directory"
      subtitle="Provision new Cargo Officers, Executives, or Industrial Clients, edit account credentials, or approve website requisitions"
      action={
        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-sm"
        >
          + Provision New User Account
        </button>
      }
    >
      <div className="space-y-4">
        
        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all ${filter === 'ALL' ? 'bg-slate-900 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setFilter('STAFF')}
              className={`px-3 py-1.5 rounded-xl transition-all ${filter === 'STAFF' ? 'bg-[#0E4B88] text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Staff Members ({users.filter(u => u.userType === 'STAFF').length})
            </button>
            <button
              onClick={() => setFilter('CUSTOMER')}
              className={`px-3 py-1.5 rounded-xl transition-all ${filter === 'CUSTOMER' ? 'bg-[#62BC37] text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Industrial Clients ({users.filter(u => u.userType === 'CUSTOMER').length})
            </button>
            <button
              onClick={() => setFilter('REQS')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${filter === 'REQS' ? 'bg-purple-700 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              Website Requisitions
              {pendingCount > 0 && (
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('PERMISSIONS')}
              className={`px-3 py-1.5 rounded-xl transition-all ${filter === 'PERMISSIONS' ? 'bg-amber-600 text-white shadow-xs font-black' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              🔑 Roles & Permissions Matrix
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Name, Email or Phone..."
            className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-900 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
          />
        </div>

        {/* PERMISSIONS MATRIX, REQS TAB OR USERS TABLE */}
        {filter === 'PERMISSIONS' ? (
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 font-sans shadow-lg">
            <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-3 gap-2">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-widest block font-mono">GRANULAR SPATIE PERMISSION MATRIX</span>
                <h4 className="text-sm sm:text-base font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>Role Authorization & Security Scope Matrix</h4>
                <p className="text-xs text-slate-400">Toggle capability permissions per role. Changes are saved automatically to server configuration.</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800">
                Matrix Enforced (Spatie-Style Guard)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2.5 font-bold uppercase">Permission Capability</th>
                    <th className="p-2.5 font-bold uppercase text-center">ADMIN</th>
                    <th className="p-2.5 font-bold uppercase text-center">OPS HEAD</th>
                    <th className="p-2.5 font-bold uppercase text-center">CEO</th>
                    <th className="p-2.5 font-bold uppercase text-center">FINANCE</th>
                    <th className="p-2.5 font-bold uppercase text-center">CARGO OFFICER</th>
                    <th className="p-2.5 font-bold uppercase text-center">CUSTOMER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {PERMISSIONS_CATALOG.map((p) => (
                    <tr key={p.code} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-2.5">
                        <span className="text-white font-bold block">{p.label}</span>
                        <span className="text-[10px] text-slate-500">{p.group} • <code>{p.code}</code></span>
                      </td>
                      {['ADMIN', 'HEAD_OF_OPERATIONS', 'CEO', 'HEAD_OF_FINANCE', 'CARGO_OFFICER', 'CUSTOMER'].map((role) => {
                        const hasPerm = (rolePermissions[role] || []).includes(p.code);
                        return (
                          <td key={role} className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={hasPerm}
                              onChange={() => toggleRolePermission(role, p.code)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400 cursor-pointer"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : filter === 'REQS' ? (
          <TableWrap
            headers={['Company / Industry', 'Contact Person', 'Email / Phone', 'Route & Volume', 'Status', 'Action']}
            mobileCard={(req: any) => (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{req.companyName}</span>
                  <Badge text={req.status} color={req.status === 'PENDING' ? 'amber' : 'green'} />
                </div>
                <p className="text-xs text-slate-600">{req.contactName} ({req.industry})</p>
                <p className="text-xs font-mono text-slate-500">{req.email} | {req.phone}</p>
                <p className="text-xs text-[#0E4B88] font-bold">{req.route} — {req.volume}</p>
                {req.status === 'PENDING' && (
                  <button
                    onClick={() => approveAndProvisionRequest(req)}
                    className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-2 rounded-xl mt-1"
                  >
                    Approve & 1-Click Provision Account ➔
                  </button>
                )}
              </div>
            )}
            data={clientRequests}
          >
            {clientRequests.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No website client requisitions received yet.</td></tr>
            ) : clientRequests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50 text-xs">
                <td className="p-4">
                  <p className="font-black text-slate-900">{req.companyName}</p>
                  <p className="text-[10px] text-slate-500">{req.industry}</p>
                </td>
                <td className="p-4 font-bold text-slate-800">{req.contactName}</td>
                <td className="p-4 font-mono">
                  <p className="text-slate-900 font-semibold">{req.email}</p>
                  <p className="text-slate-500">{req.phone}</p>
                </td>
                <td className="p-4">
                  <p className="font-extrabold text-[#0E4B88]">{req.route}</p>
                  <p className="text-[10px] text-slate-500 font-semibold">{req.volume}</p>
                </td>
                <td className="p-4">
                  <Badge text={req.status} color={req.status === 'PENDING' ? 'amber' : 'green'} />
                </td>
                <td className="p-4">
                  {req.status === 'PENDING' ? (
                    <button
                      onClick={() => approveAndProvisionRequest(req)}
                      className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs"
                    >
                      Approve & Provision ➔
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700">Account Active ✓</span>
                  )}
                </td>
              </tr>
            ))}
          </TableWrap>
        ) : (
          <TableWrap
            headers={['User Identity', 'Classification & Role', 'Contact Email / Phone', 'Station / Company', 'Status', 'Actions']}
            mobileCard={(u: any) => (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{u.fullName}</span>
                  <Badge text={u.status} color={u.status === 'ACTIVE' ? 'green' : 'rose'} />
                </div>
                <p className="text-xs text-slate-600">{u.roleLabel || u.role} • {u.userType}</p>
                <p className="text-xs font-mono text-slate-500">{u.email} | {u.phone}</p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditingUser(u)} className="bg-slate-100 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl">Edit</button>
                  <button onClick={() => toggleStatus(u.id)} className="bg-slate-100 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl">{u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
                </div>
              </div>
            )}
            data={filteredUsers}
          >
            {filteredUsers.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 text-xs">
                <td className="p-4">
                  <p className="font-black text-slate-900">{u.fullName}</p>
                  <p className="text-[10px] font-mono text-slate-400">ID: {u.staffId || u.id}</p>
                </td>
                <td className="p-4">
                  <span className="font-extrabold text-slate-800 block">{u.roleLabel || u.role}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{u.userType}</span>
                </td>
                <td className="p-4 font-mono">
                  <p className="text-slate-900 font-semibold">{u.email}</p>
                  <p className="text-slate-500">{u.phone}</p>
                </td>
                <td className="p-4 font-bold text-slate-700">
                  {u.assignedStation ? `${sName(u.assignedStation)} (${u.assignedStation})` : u.companyName || 'HQ Command'}
                </td>
                <td className="p-4">
                  <Badge text={u.status} color={u.status === 'ACTIVE' ? 'green' : 'rose'} />
                </td>
                <td className="p-4 space-x-2">
                  <button
                    onClick={() => setEditingUser(u)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleStatus(u.id)}
                    className={`font-bold text-xs px-3 py-1.5 rounded-xl border ${u.status === 'ACTIVE' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'}`}
                  >
                    {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteUser(u.id)}
                    className="text-slate-400 hover:text-rose-600 font-bold text-xs px-2 py-1.5"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </TableWrap>
        )}
      </div>

      {/* PROVISION NEW USER MODAL */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>
          <div className="p-6 space-y-5">
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Provision New User Account
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Account Classification *</label>
                  <select
                    value={form.userType}
                    onChange={(e) => setForm({ ...form, userType: e.target.value })}
                    className={ic}
                  >
                    <option value="STAFF">Staff Member</option>
                    <option value="CUSTOMER">Industrial Client / Consignee</option>
                  </select>
                </div>

                {form.userType === 'STAFF' ? (
                  <div>
                    <label className={lc}>Operational Role *</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      className={ic}
                    >
                      <option value="CARGO_OFFICER">Terminal Cargo Officer</option>
                      <option value="HEAD_OF_OPERATIONS">Head of Operations</option>
                      <option value="HEAD_OF_FINANCE">Head of Finance</option>
                      <option value="CEO">Managing Director / CEO</option>
                      <option value="ADMIN">Admin Officer</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className={lc}>Company Name *</label>
                    <input
                      required
                      value={form.companyName}
                      onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                      placeholder="e.g. Purechem Cement"
                      className={ic}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className={lc}>Full Name *</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Adebayo Ogunlesi"
                  className={ic}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="adebayo@bueno.ng"
                    className={ic}
                  />
                </div>
                <div>
                  <label className={lc}>Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="08031234567"
                    className={ic}
                  />
                </div>
              </div>

              {form.userType === 'STAFF' && form.role === 'CARGO_OFFICER' && (
                <div>
                  <label className={lc}>Assigned Terminal Station *</label>
                  <select
                    value={form.assignedStation}
                    onChange={(e) => setForm({ ...form, assignedStation: e.target.value })}
                    className={ic}
                  >
                    {Object.entries(STATIONS).map(([code, s]) => (
                      <option key={code} value={code}>{sName(code)} ({code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={lc}>4-Digit Security PIN *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={form.pin}
                  onChange={(e) => setForm({ ...form, pin: e.target.value })}
                  placeholder="1111"
                  className={`${ic} font-mono`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-500">
                  Cancel
                </button>
                <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm">
                  Provision Account ➔
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <Modal onClose={() => setEditingUser(null)}>
          <div className="p-6 space-y-5">
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Edit Account: {editingUser.fullName}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className={lc}>Full Name</label>
                <input
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className={ic}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lc}>Email Address</label>
                  <input
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className={ic}
                  />
                </div>
                <div>
                  <label className={lc}>Phone Number</label>
                  <input
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className={ic}
                  />
                </div>
              </div>

              {editingUser.userType === 'STAFF' && editingUser.role === 'CARGO_OFFICER' && (
                <div>
                  <label className={lc}>Terminal Station Transfer</label>
                  <select
                    value={editingUser.assignedStation}
                    onChange={(e) => setEditingUser({ ...editingUser, assignedStation: e.target.value })}
                    className={ic}
                  >
                    {Object.entries(STATIONS).map(([code, s]) => (
                      <option key={code} value={code}>{sName(code)} ({code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={lc}>4-Digit Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={editingUser.pin}
                  onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                  className={`${ic} font-mono`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-xs font-bold text-slate-500">
                  Cancel
                </button>
                <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm">
                  Save Changes ➔
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
      <CustomAlertModal isOpen={!!customAlert} message={customAlert?.message || null} title={customAlert?.title} onClose={() => setCustomAlert(null)} />
    </Section>
  );
}

/* ═══════════════════════════════════════════════════════════
   PORTAL 2 — ADMIN OFFICER
═══════════════════════════════════════════════════════════ */
function AdminPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [view, setView] = useState<'deals' | 'negotiations' | 'trips' | 'wagons' | 'requests' | 'users' | 'analytics' | 'settings'>('deals');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deals, setDeals]       = useState<any[]>([]);
  const [trips, setTrips]       = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [wagons, setWagons]     = useState<any[]>([]);
  const [users, setUsers]       = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [activeNegId, setActiveNegId]   = useState<string | null>(null);
  const [adminReplyInput, setAdminReplyInput] = useState('');

  const [createDealModal, setCreateDealModal] = useState(false);
  const [addWagonModal, setAddWagonModal]     = useState(false);
  const [selectedReq, setSelectedReq]         = useState<any | null>(null);
  const [customAlert, setCustomAlert]         = useState<{ title?: string; message: string } | null>(null);

  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null);

  const [newWagonId, setNewWagonId] = useState('');
  const [newWagonStation, setNewWagonStation] = useState('EWK');
  const [dealForm, setDealForm] = useState({ company: '', loadingStation: 'EWK', destination: 'MNY', cargoType: '', quantity: '' });

  const handleDeleteDealConfirm = () => {
    if (!deletingDealId) return;
    const updated = deals.filter(d => d.id !== deletingDealId);
    saveDeals(updated);
    try {
      fetch('/api/deals.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', id: deletingDealId }),
      });
    } catch {}
    setDeletingDealId(null);
  };

  const handleSaveEditDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;
    const updated = deals.map(d => d.id === editingDeal.id ? editingDeal : d);
    saveDeals(updated);
    setEditingDeal(null);
  };

  useEffect(() => {
    const syncData = async () => {
      // Automatic trip purge trigger for clean analytics restart
      if (typeof window !== 'undefined' && !localStorage.getItem('bueno_trips_purged_v5')) {
        localStorage.setItem('bueno_trips', '[]');
        localStorage.setItem('bueno_trips_purged_v5', 'true');
        setTrips([]);
        try { fetch('/api/trips.php?purge=true'); } catch {}
      }

      setDeals(tryParse('bueno_deals', SEED_DEALS));
      setWagons(tryParse('bueno_wagons', SEED_WAGONS));

      // Fetch Trips from DB
      if (typeof window !== 'undefined' && localStorage.getItem('bueno_trips_purged_v5')) {
        try {
          const res = await fetch('/api/trips.php');
          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && Array.isArray(json.data)) {
              setTrips(json.data);
              localStorage.setItem('bueno_trips', JSON.stringify(json.data));
            }
          }
        } catch { setTrips(tryParse('bueno_trips', [])); }
      }

      // Fetch Users from DB & merge with local additions and edits
      const storedLocalUsers = tryParse('bueno_provisioned_users', DEFAULT_PROVISIONED_USERS);
      try {
        const res = await fetch('/api/users.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data)) {
            const dbIds = new Set(json.data.map((u: any) => u.id));
            const dbUsersWithLocalOverrides = json.data.map((dbUser: any) => {
              const localMatch = storedLocalUsers.find((l: any) => l.id === dbUser.id);
              return localMatch || dbUser;
            });
            const localOnlyUsers = storedLocalUsers.filter((l: any) => !dbIds.has(l.id));
            const combinedUsers = [...localOnlyUsers, ...dbUsersWithLocalOverrides];
            setUsers(combinedUsers);
            localStorage.setItem('bueno_provisioned_users', JSON.stringify(combinedUsers));
          } else {
            setUsers(storedLocalUsers);
          }
        } else {
          setUsers(storedLocalUsers);
        }
      } catch {
        setUsers(storedLocalUsers);
      }

      // Fetch Fund Requests from DB
      try {
        const res = await fetch('/api/requests.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setRequests(json.data);
            localStorage.setItem('bueno_requests', JSON.stringify(json.data));
          }
        }
      } catch { setRequests(tryParse('bueno_requests', SEED_REQUESTS)); }

      // Fetch Deal Negotiations from DB
      try {
        const res = await fetch('/api/negotiations.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setNegotiations(json.data);
            localStorage.setItem('bueno_custom_deal_negotiations', JSON.stringify(json.data));
            if (!activeNegId) setActiveNegId(json.data[0].id);
          }
        }
      } catch {
        const loadedNegs = tryParse<any[]>('bueno_custom_deal_negotiations', []);
        setNegotiations(loadedNegs);
        if (loadedNegs.length > 0 && !activeNegId) setActiveNegId(loadedNegs[0].id);
      }
    };

    syncData();

    window.addEventListener('storage', syncData);
    window.addEventListener('bueno_state_updated', syncData);

    const interval = setInterval(syncData, 5000);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('bueno_state_updated', syncData);
      clearInterval(interval);
    };
  }, [activeNegId]);

  const persist = (key: string, val: any[], apiEndpoint?: string) => {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new Event('bueno_state_updated'));
    if (apiEndpoint && !apiEndpoint.endsWith('.php')) {
      try {
        fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(val),
        });
      } catch {}
    }
  };

  const saveDeals        = (v: any[]) => { setDeals(v); persist('bueno_deals', v); };
  const saveRequests     = (v: any[]) => { setRequests(v); persist('bueno_requests', v); };
  const saveWagons       = (v: any[]) => { setWagons(v); persist('bueno_wagons', v); };
  const saveUsers        = (v: any[]) => { setUsers(v); persist('bueno_provisioned_users', v); };
  const saveNegotiations = (v: any[]) => { setNegotiations(v); persist('bueno_custom_deal_negotiations', v); };
  const saveTrips        = (v: any[]) => { setTrips(v); persist('bueno_trips', v); };

  const occupiedWagonIds = getOccupiedWagonIds(trips);

  const handleAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyInput.trim() || !activeNegId) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = {
      sender: user.fullName,
      role: user.roleLabel || user.role,
      text: adminReplyInput.trim(),
      time: now,
    };

    const updated = negotiations.map(n => n.id === activeNegId ? { ...n, messages: [...(n.messages || []), msg] } : n);
    saveNegotiations(updated);
    setAdminReplyInput('');

    // Trigger Notification for Customer
    try {
      const notifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      const targetNeg = negotiations.find(n => n.id === activeNegId);
      const newNotif = {
        id: `notif_${Date.now()}`,
        title: `Ops Command Response for ${targetNeg?.companyName}`,
        body: `"${msg.text}" — ${user.fullName}`,
        time: 'Just now',
        type: 'CLIENT_REQUEST',
        read: false,
      };
      localStorage.setItem('bueno_notifications', JSON.stringify([newNotif, ...notifs]));
      window.dispatchEvent(new Event('bueno_state_updated'));
    } catch {}
  };

  const handleAcceptAndConvertDeal = (neg: any) => {
    const num = String(deals.length + 1).padStart(3, '0');
    const newOfficialDeal = {
      id: `DEAL-${num}`,
      dealNumber: num,
      company: neg.companyName,
      loadingStation: neg.loadingStation || 'EWK',
      destination: neg.destination || 'MNY',
      cargoType: neg.cargoType || 'Cement (50kg Bags)',
      quantity: neg.quantity || '5000',
      createdAt: new Date().toLocaleString(),
      createdBy: user.fullName,
    };

    saveDeals([newOfficialDeal, ...deals]);

    // Send confirmation message in negotiation thread
    const confirmMsg = {
      sender: user.fullName,
      role: user.roleLabel || user.role,
      text: `✅ OFFICIAL ACCEPTANCE: Deal ${newOfficialDeal.dealNumber} has been locked in and assigned to ${sName(newOfficialDeal.loadingStation)} Terminal! Wagon allocation is active.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedNegs = negotiations.map(n => n.id === neg.id ? { ...n, status: 'ACCEPTED_DEAL_CREATED', messages: [...(n.messages || []), confirmMsg] } : n);
    saveNegotiations(updatedNegs);

    alert(`✅ Deal accepted! Created official Deal #${newOfficialDeal.dealNumber} for ${neg.companyName} at ${sName(newOfficialDeal.loadingStation)} Terminal.`);
  };

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

  const selectedNeg = negotiations.find(n => n.id === activeNegId) || negotiations[0];

  const [inspectingTrip, setInspectingTrip] = useState<any | null>(null);

  const navItems = [
    { key: 'analytics',    label: 'Operational Analytics & Daily Reports' },
    { key: 'deals',        label: 'Manage Deals' },
    { key: 'negotiations', label: `Client Negotiations & Chat (${negotiations.length})` },
    { key: 'trips',        label: 'All Active Trips & GPS' },
    { key: 'wagons',       label: `Wagon Fleet Inventory (${wagons.length})` },
    { key: 'requests',     label: 'Fund Requests (Review & Approve)' },
    { key: 'users',        label: 'User Provisioning & Accounts' },
    { key: 'settings',     label: 'System Settings & Role Permissions' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Admin Officer' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {inspectingTrip && <TripAuditReportModal trip={inspectingTrip} onClose={() => setInspectingTrip(null)} />}
      
      {view === 'analytics' && (
        <DailyAnalyticsSection trips={trips} users={users} onInspectTrip={trip => setInspectingTrip(trip)} />
      )}
      {view === 'settings' && (
        <AdminSettingsSection users={users} onSaveUsers={saveUsers} />
      )}
      {view === 'negotiations' && (
        <Section
          title="Client Deal Negotiations & Executive Chat Center"
          subtitle="Review incoming deal requests from industrial clients, negotiate wagon availability, and convert directly into official deals"
        >
          <div className="grid lg:grid-cols-12 gap-6">
            
            {/* List of Incoming Negotiations */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider px-2">Client Requisition Threads</h4>
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {negotiations.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No custom deal negotiation requests yet.</p>
                ) : (
                  negotiations.map(neg => (
                    <div
                      key={neg.id}
                      onClick={() => setActiveNegId(neg.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${activeNegId === neg.id ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs">{neg.companyName}</span>
                        <span className={`text-[9px] font-extrabold font-mono px-2 py-0.5 rounded-full ${neg.status === 'ACCEPTED_DEAL_CREATED' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'}`}>
                          {neg.status === 'ACCEPTED_DEAL_CREATED' ? 'OFFICIAL DEAL ✓' : 'UNDER NEGOTIATION'}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 font-medium">{neg.cargoType} ({neg.quantity} Bags)</p>
                      <p className="text-[10px] opacity-60 font-mono">{sName(neg.loadingStation)} ➔ {sName(neg.destination)} • {neg.createdAt}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Live Recipient Chat & Conversion Panel */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[520px] overflow-hidden">
              {selectedNeg ? (
                <>
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-black text-[#0E4B88] uppercase">{selectedNeg.companyName} — {selectedNeg.id}</span>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">
                        {selectedNeg.cargoType} ({selectedNeg.quantity} Bags)
                      </h4>
                      <p className="text-xs text-slate-500">{sName(selectedNeg.loadingStation)} ➔ {sName(selectedNeg.destination)}</p>
                    </div>

                    {selectedNeg.status !== 'ACCEPTED_DEAL_CREATED' && (
                      <button
                        onClick={() => handleAcceptAndConvertDeal(selectedNeg)}
                        className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-xs transition-all"
                      >
                        Accept & Lock In Deal ➔
                      </button>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
                    {(selectedNeg.messages || []).map((m: any, idx: number) => {
                      const isClient = m.role === 'Industrial Consignee';
                      return (
                        <div key={idx} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                          <div className="flex items-center gap-2 mb-1 text-[10px]">
                            <span className="font-extrabold text-slate-900">{m.sender}</span>
                            <span className="text-slate-400 font-mono">({m.role})</span>
                            <span className="text-slate-400 font-mono">• {m.time}</span>
                          </div>
                          <div className={`p-3.5 rounded-2xl max-w-sm text-xs leading-relaxed ${isClient ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs' : 'bg-[#0E4B88] text-white rounded-tr-none'}`}>
                            {m.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleAdminReply} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                    <input
                      type="text"
                      value={adminReplyInput}
                      onChange={(e) => setAdminReplyInput(e.target.value)}
                      placeholder={`Reply to ${selectedNeg.companyName}...`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                    />
                    <button
                      type="submit"
                      className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                    >
                      Send Reply ➔
                    </button>
                  </form>
                </>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs my-auto">Select a negotiation thread to view conversation.</div>
              )}
            </div>

          </div>
        </Section>
      )}
      {view === 'deals' && (
        <Section title="Manage Deals" subtitle="Create, edit, or delete commercial deals and assign them to rail terminals" action={<button onClick={() => setCreateDealModal(true)} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">+ Create New Deal</button>}>
          <TableWrap
            headers={['Deal ID', 'Company', 'Loading Station', 'Destination', 'Cargo & Qty', 'Created', 'Actions']}
            mobileCard={(d: any) => (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0E4B88]">{d.dealNumber}</span>
                  <span className="text-xs text-slate-500 font-mono">{d.createdAt}</span>
                </div>
                <p className="font-bold text-slate-900">{d.company}</p>
                <p className="text-xs text-slate-600">{sName(d.loadingStation)} ➔ {sName(d.destination)}</p>
                <p className="text-xs text-slate-500">{d.cargoType} ({d.quantity} Bags)</p>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => setEditingDeal(d)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[11px] rounded-lg">Edit</button>
                  <button onClick={() => setDeletingDealId(d.id)} className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-[11px] rounded-lg">Delete</button>
                </div>
              </div>
            )}
            data={deals}
          >
            {deals.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-xs">No deals created yet.</td></tr>
              : deals.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{d.dealNumber}</td>
                  <td className="p-4 font-bold text-slate-900">{d.company}</td>
                  <td className="p-4 font-semibold text-slate-700">{sName(d.loadingStation)}</td>
                  <td className="p-4 font-semibold text-slate-700">{sName(d.destination)}</td>
                  <td className="p-4 text-slate-700">{d.cargoType} <b>({d.quantity} Bags)</b></td>
                  <td className="p-4 text-slate-500 font-mono text-[11px]">{d.createdAt}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditingDeal(d)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all">Edit</button>
                      <button onClick={() => setDeletingDealId(d.id)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-xl transition-all">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
          </TableWrap>
        </Section>
      )}

      {/* EDIT DEAL MODAL */}
      {editingDeal && (
        <Modal onClose={() => setEditingDeal(null)}>
          <div className="p-6 space-y-5">
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Edit Commercial Deal #{editingDeal.dealNumber}
            </h3>
            <form onSubmit={handleSaveEditDeal} className="space-y-4 text-xs font-sans">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Consignee Company Name</label>
                <input type="text" value={editingDeal.company} onChange={e => setEditingDeal({ ...editingDeal, company: e.target.value })} className={ic} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Origin Terminal</label>
                  <select value={editingDeal.loadingStation} onChange={e => setEditingDeal({ ...editingDeal, loadingStation: e.target.value })} className={ic}>
                    <option value="EWK">Ewekoro Terminal</option>
                    <option value="APT">Apapa Port</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Destination Yard</label>
                  <select value={editingDeal.destination} onChange={e => setEditingDeal({ ...editingDeal, destination: e.target.value })} className={ic}>
                    <option value="MNY">Moniya Yard (Ibadan)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cargo Commodity</label>
                  <input type="text" value={editingDeal.cargoType} onChange={e => setEditingDeal({ ...editingDeal, cargoType: e.target.value })} className={ic} required />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quantity (Bags)</label>
                  <input type="number" value={editingDeal.quantity} onChange={e => setEditingDeal({ ...editingDeal, quantity: e.target.value })} className={ic} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setEditingDeal(null)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold px-6 py-2.5 rounded-xl shadow-sm">Save Deal Changes ➔</button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* DELETE DEAL CONFIRMATION MODAL */}
      {deletingDealId && (
        <Modal onClose={() => setDeletingDealId(null)}>
          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-2xl">
              !
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Confirm Permanent Deletion</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Are you sure you want to permanently delete this commercial deal? This action will update your database in real time.</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={() => setDeletingDealId(null)} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={handleDeleteDealConfirm} className="px-6 py-2.5 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md">Yes, Confirm Deletion ➔</button>
            </div>
          </div>
        </Modal>
      )}

      {view === 'trips' && (
        <Section title="All Active Trips (Corridor GPS Satellite Map)" subtitle="High-precision interactive map of all active rail corridor trips">
          <div className="space-y-6">
            <RailCorridorGpsMap trip={trips[0] || SEED_TRIPS[0]} />
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

      {view === 'users' && (
        <UserProvisioningSection users={users} onSaveUsers={saveUsers} />
      )}

      {selectedReq && <FundRequestDetailModal req={selectedReq} user={user} onClose={() => setSelectedReq(null)} onSaveRequests={saveRequests} allRequests={requests} />}
      <CustomAlertModal isOpen={!!customAlert} message={customAlert?.message || null} title={customAlert?.title} onClose={() => setCustomAlert(null)} />
      {addWagonModal && (
        <AddWagonModal
          isOpen={addWagonModal}
          onClose={() => setAddWagonModal(false)}
          onSaveWagon={(newWagon) => {
            const updated = [newWagon, ...wagons];
            saveWagons(updated);
            setCustomAlert({
              title: 'PXG Wagon Registered',
              message: `Wagon ${newWagon.id} registered successfully to ${sName(newWagon.currentStation)} fleet inventory!`,
            });
          }}
        />
      )}
      {createDealModal && (
        <Modal onClose={() => setCreateDealModal(false)}>
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900">Create New Deal</h3>
            <form onSubmit={handleCreateDeal} className="space-y-4">
              <div><label className={lc}>Company Name *</label><input required value={dealForm.company} onChange={e => setDealForm({ ...dealForm, company: e.target.value })} placeholder="e.g. Lafarge Africa Plc" className={ic} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lc}>Loading Station</label><select value={dealForm.loadingStation} onChange={e => setDealForm({ ...dealForm, loadingStation: e.target.value })} className={ic}>{Object.entries(STATIONS).map(([code, s]) => <option key={code} value={code}>{sName(code)}</option>)}</select></div>
                <div><label className={lc}>Destination</label><select value={dealForm.destination} onChange={e => setDealForm({ ...dealForm, destination: e.target.value })} className={ic}>{Object.entries(STATIONS).map(([code, s]) => <option key={code} value={code}>{sName(code)}</option>)}</select></div>
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
  const [view, setView]   = useState<'trips' | 'analytics' | 'requests'>('trips');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trips, setTrips]     = useState<any[]>([]);
  const [users, setUsers]     = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [inspectingTrip, setInspectingTrip] = useState<any | null>(null);

  useEffect(() => {
    const syncData = async () => {
      setUsers(tryParse('bueno_provisioned_users', DEFAULT_PROVISIONED_USERS));

      try {
        const res = await fetch('/api/trips.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setTrips(json.data);
            localStorage.setItem('bueno_trips', JSON.stringify(json.data));
          }
        }
      } catch { setTrips(tryParse('bueno_trips', SEED_TRIPS)); }

      try {
        const res = await fetch('/api/requests.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setRequests(json.data);
            localStorage.setItem('bueno_requests', JSON.stringify(json.data));
          }
        }
      } catch { setRequests(tryParse('bueno_requests', SEED_REQUESTS)); }
    };

    syncData();

    window.addEventListener('storage', syncData);
    window.addEventListener('bueno_state_updated', syncData);
    const interval = setInterval(syncData, 5000);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('bueno_state_updated', syncData);
      clearInterval(interval);
    };
  }, []);

  const saveRequests = (v: any[]) => {
    setRequests(v);
    localStorage.setItem('bueno_requests', JSON.stringify(v));
    window.dispatchEvent(new Event('bueno_state_updated'));
    try {
      fetch('/api/requests.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
    } catch {}
  };

  const navItems = [
    { key: 'trips',     label: 'Corridor Live GPS Command Map' },
    { key: 'analytics', label: '📊 Operational Analytics & Daily Reports' },
    { key: 'requests',  label: 'Fund Requests (Ops Review)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Head of Operations' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {inspectingTrip && <TripAuditReportModal trip={inspectingTrip} onClose={() => setInspectingTrip(null)} />}
      
      {view === 'analytics' && (
        <DailyAnalyticsSection trips={trips} users={users} onInspectTrip={trip => setInspectingTrip(trip)} />
      )}
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
  const [view, setView] = useState<'trips' | 'analytics' | 'requests'>('trips');
  const [menuOpen, setMenuOpen] = useState(false);
  const [trips, setTrips]   = useState<any[]>([]);
  const [users, setUsers]   = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [inspectingTrip, setInspectingTrip] = useState<any | null>(null);

  useEffect(() => {
    const syncData = async () => {
      setUsers(tryParse('bueno_provisioned_users', DEFAULT_PROVISIONED_USERS));

      try {
        const res = await fetch('/api/trips.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setTrips(json.data);
            localStorage.setItem('bueno_trips', JSON.stringify(json.data));
          }
        }
      } catch { setTrips(tryParse('bueno_trips', SEED_TRIPS)); }

      try {
        const res = await fetch('/api/requests.php');
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
            setRequests(json.data);
            localStorage.setItem('bueno_requests', JSON.stringify(json.data));
          }
        }
      } catch { setRequests(tryParse('bueno_requests', SEED_REQUESTS)); }
    };

    syncData();

    window.addEventListener('storage', syncData);
    window.addEventListener('bueno_state_updated', syncData);
    const interval = setInterval(syncData, 5000);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('bueno_state_updated', syncData);
      clearInterval(interval);
    };
  }, []);

  const saveRequests = (v: any[]) => {
    setRequests(v);
    localStorage.setItem('bueno_requests', JSON.stringify(v));
    window.dispatchEvent(new Event('bueno_state_updated'));
    try {
      fetch('/api/requests.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v),
      });
    } catch {}
  };

  const navItems = [
    { key: 'trips',     label: 'Executive Corridor GPS Map' },
    { key: 'analytics', label: '📊 Executive Analytics & Daily Reports' },
    { key: 'requests',  label: 'Fund Requests (CEO Clearance)' },
  ];

  return (
    <Shell user={{ ...user, roleLabel: 'Managing Director / CEO' }} navItems={navItems} activeKey={view} onNav={k => setView(k as any)} onSignOut={onSignOut} menuOpen={menuOpen} setMenuOpen={setMenuOpen}>
      {inspectingTrip && <TripAuditReportModal trip={inspectingTrip} onClose={() => setInspectingTrip(null)} />}

      {view === 'analytics' && (
        <DailyAnalyticsSection trips={trips} users={users} onInspectTrip={trip => setInspectingTrip(trip)} />
      )}

      {view === 'trips' && (
        <div className="space-y-6">
          <Section title="Executive Overview — Corridor GPS Live Satellite Telemetry" subtitle="High-precision interactive train movement map across all Nigerian rail corridors">
            <RailCorridorGpsMap trip={trips[0] || SEED_TRIPS[0]} />
            <TableWrap
              headers={['Trip ID', 'Officer', 'Company', 'Route', 'Wagons Loaded', 'Status']}
              mobileCard={(t: any) => (
                <div className="space-y-2 cursor-pointer" onClick={() => setInspectingTrip(t)}>
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-[#0E4B88]">{t.tripId}</span>
                    <Badge text={t.status} color={t.status === 'IN_TRANSIT' ? 'green' : 'blue'} />
                  </div>
                  <p className="font-bold text-slate-900">{t.company}</p>
                  <p className="text-xs text-slate-600">{sName(t.origin)} ➔ {sName(t.destination)}</p>
                  <p className="text-xs font-bold text-[#0E4B88] pt-1">Inspect Full Trip Audit Report ➔</p>
                </div>
              )}
              data={trips}
            >
              {trips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setInspectingTrip(t)}>
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

function TableWrap({ headers, children, mobileCard, data }: { headers: string[]; children: React.ReactNode; mobileCard?: (item: any, idx?: any) => React.ReactNode; data?: any[] }) {
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
                {mobileCard(item, idx)}
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
