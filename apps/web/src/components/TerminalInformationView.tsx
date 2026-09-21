'use client';

import React, { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

interface TerminalRow {
  id: string;
  wagonNo: string;
  condition: 'GOOD' | 'DEFECTIVE' | 'UNDER_MAINTENANCE' | 'LOADED_INTACT' | 'DISCHARGED';
  remark: string;
  dateLoaded: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  unloadStartTime?: string;
  unloadEndTime?: string;
  unloadDuration?: string;
  trainNo: string;
  origin: string;
  destination: string;
  content: string;
  tonnage: string;
  quantity: string;
  rawQty?: number;
  truckRegNo?: string;
  driverDetails?: string;
  sourceBay?: string;
  sealNumber?: string;
  waybillNo: string;
  daysAtStation: number;
  demurrage: number;
  station: string;
  tripRef?: any;
}

const STATION_OPTIONS: Record<string, { name: string; gauge: string; isBuenoTerminal: boolean; km?: number }> = {
  // Standard Gauge Stations (Lagos to Moniya, Ibadan) - 18 Stations
  APQ:  { name: 'Apapa Port (APQ)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false },
  ENL:  { name: 'ENL APMT Terminal (ENL)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: true },
  APL:  { name: 'Apapa Local (APL)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false },
  MBJ:  { name: 'Lagos Mobolaji (MBJ)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 0 },
  MU:   { name: 'Mushin Station (MU)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 3 },
  SH:   { name: 'Oshodi Station (SH)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 2 },
  SG:   { name: 'Shogunle Station (SG)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 3 },
  IK:   { name: 'Ikeja Station (IK)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 1 },
  GE:   { name: 'Agege Station (GE)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 4 },
  UJ:   { name: 'Iju Station (UJ)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 5 },
  GD:   { name: 'Agbado Station (GD)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 3 },
  IT:   { name: 'Itoki Station (IT)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 5 },
  JK:   { name: 'Ijoko Station (JK)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 6 },
  KA:   { name: 'Kajola Station (KA)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 3 },
  PAPA: { name: 'Papalanto Siding (PAPA)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: true, km: 12.55 },
  AB:   { name: 'Abeokuta Major Station (AB)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false, km: 31.36 },
  AD:   { name: 'Omi Adio Station (AD)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: false },
  MONI: { name: 'Moniya Container Terminal (MONI)', gauge: 'Standard Gauge (1,435mm)', isBuenoTerminal: true },

  // Narrow Gauge Stations (Western District & Lagos District)
  EWK:  { name: 'Itori / Ewekoro Siding (EWK)', gauge: 'Narrow Gauge (1,067mm)', isBuenoTerminal: false },
  DGB:  { name: 'Dugbe Station, Ibadan (DGB)', gauge: 'Narrow Gauge (1,067mm)', isBuenoTerminal: false },
  OSB:  { name: 'Oshogbo Hub (OSB)', gauge: 'Narrow Gauge (1,067mm)', isBuenoTerminal: false },
  ILR:  { name: 'Ilorin Freight Hub (ILR)', gauge: 'Narrow Gauge (1,067mm)', isBuenoTerminal: false },
  IDD:  { name: 'Iddo Lagos Terminus (IDD)', gauge: 'Narrow Gauge (1,067mm)', isBuenoTerminal: false },
  APT:  { name: 'Apapa Maritime Port / APMT (APT)', gauge: 'Narrow Gauge (1,067mm)', isBuenoTerminal: false },
};

export function TerminalInformationView({ user, initialStation }: { user?: any; initialStation?: string }) {
  const [selectedStation, setSelectedStation] = useState<string>(() => {
    if (initialStation && STATION_OPTIONS[initialStation]) return initialStation;
    if (user?.assignedStation && STATION_OPTIONS[user.assignedStation]) return user.assignedStation;
    return 'EWK';
  });

  const [selectedTripId, setSelectedTripId] = useState<string>('ALL');
  const [allTrips, setAllTrips] = useState<any[]>([]);

  const [manualRows, setManualRows] = useState<TerminalRow[]>(() => {
    try {
      const stored = localStorage.getItem('bueno_terminal_information');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [liveTripsUpdate, setLiveTripsUpdate] = useState(0);

  useEffect(() => {
    const loadState = () => {
      setLiveTripsUpdate((n) => n + 1);
      try {
        const trips = StateEngine.getTrips();
        setAllTrips(trips || []);
      } catch {}
    };

    loadState();
    window.addEventListener('bueno_state_updated', loadState);
    window.addEventListener('storage', loadState);
    return () => {
      window.removeEventListener('bueno_state_updated', loadState);
      window.removeEventListener('storage', loadState);
    };
  }, []);

  const saveRows = (newRows: TerminalRow[]) => {
    setManualRows(newRows);
    try {
      localStorage.setItem('bueno_terminal_information', JSON.stringify(newRows));
      window.dispatchEvent(new Event('bueno_state_updated'));
    } catch {}
  };

  const currentStationInfo = STATION_OPTIONS[selectedStation] || STATION_OPTIONS['EWK'] || STATION_OPTIONS['PAPA'];

  // Selected trip object if filtered by specific trip
  const currentTrip = selectedTripId !== 'ALL'
    ? allTrips.find((t) => t.id === selectedTripId || t.tripId === selectedTripId)
    : null;

  // Dynamically derive live wagons from active trips + manual entries
  const liveTripRows: TerminalRow[] = StateEngine.getStationWagonLedger(
    selectedTripId === 'ALL' ? selectedStation : undefined,
    selectedTripId !== 'ALL' ? selectedTripId : undefined
  );

  const stationManualRows = selectedTripId === 'ALL'
    ? manualRows.filter((r) => r.station === selectedStation || r.origin === selectedStation)
    : [];

  const seenWagons = new Set<string>();
  const stationRows: TerminalRow[] = [];

  [...liveTripRows, ...stationManualRows].forEach((r) => {
    const key = `${r.trainNo}_${r.wagonNo}`;
    if (!seenWagons.has(key)) {
      seenWagons.add(key);
      stationRows.push(r);
    }
  });

  // Calculate totals
  const totalBags = stationRows.reduce((acc, r) => acc + (r.rawQty || 0), 0);
  const totalTonnageNum = stationRows.reduce((acc, r) => {
    const num = parseFloat(r.tonnage) || 0;
    return acc + num;
  }, 0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRowForm, setNewRowForm] = useState({
    wagonNo: 'PXG 09003',
    condition: 'LOADED_INTACT' as const,
    remark: 'Loaded & Verified Intact',
    dateLoaded: new Date().toLocaleDateString('en-GB'),
    startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: '35 Minutes',
    trainNo: 'TRIP-001',
    origin: selectedStation,
    destination: 'DGB',
    content: 'Bagged Cement (50kg)',
    tonnage: '60 MT',
    quantity: '1,200 Bags',
    truckRegNo: 'KJA-482-XY',
    waybillNo: `WB-BN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    daysAtStation: 1,
  });

  const handleAddRow = (e: React.FormEvent) => {
    e.preventDefault();
    const demurrageAmount = Math.max(0, newRowForm.daysAtStation - 14) * 15000;
    const newRow: TerminalRow = {
      id: `TRM-${Date.now()}`,
      wagonNo: newRowForm.wagonNo.trim().toUpperCase(),
      condition: newRowForm.condition,
      remark: newRowForm.remark.trim(),
      dateLoaded: newRowForm.dateLoaded,
      startTime: newRowForm.startTime,
      endTime: newRowForm.endTime,
      duration: newRowForm.duration,
      trainNo: newRowForm.trainNo.trim(),
      origin: newRowForm.origin,
      destination: newRowForm.destination,
      content: newRowForm.content,
      tonnage: newRowForm.tonnage,
      quantity: newRowForm.quantity,
      truckRegNo: newRowForm.truckRegNo,
      waybillNo: newRowForm.waybillNo,
      daysAtStation: Number(newRowForm.daysAtStation) || 1,
      demurrage: demurrageAmount,
      station: selectedStation,
    };

    saveRows([newRow, ...manualRows]);
    setShowAddModal(false);
  };

  const handleExportCsv = () => {
    const isTripSpecific = selectedTripId !== 'ALL' && currentTrip;
    const dateStr = new Date().toLocaleDateString('en-GB');

    const csvRows: string[][] = [
      ['BUENO LOGISTICS & NIGERIAN RAILWAY CORPORATION — TERMINAL INFORMATION LEDGER'],
      isTripSpecific
        ? [`TRIP ID: ${currentTrip.tripId || currentTrip.id} | ROUTE: ${currentTrip.origin} ➔ ${currentTrip.destination} | DATE: ${currentTrip.dispatchDate || dateStr}`]
        : [`STATION: ${selectedStation} (${currentStationInfo.name}) | GAUGE: ${currentStationInfo.gauge}`],
      isTripSpecific
        ? [`COMMODITY: ${currentTrip.cargoType || 'Bagged Cement (50kg)'} | TOTAL WAGONS: ${stationRows.length} | TOTAL TONNAGE: ${totalTonnageNum.toFixed(1)} MT`]
        : [`TOTAL ROLLING STOCK: ${stationRows.length} WAGONS | EXPORT DATE: ${dateStr}`],
      [],
      [
        'WAGON NO.',
        'CONDITION',
        'REMARK / SILO BAY',
        'DATE LOADED',
        'START TIME',
        'END TIME',
        'DURATION',
        'TRAIN / TRIP NO.',
        'ORIGIN',
        'DESTINATION',
        'CONTENT',
        'TONNAGE (MT)',
        'QUANTITY (BAGS/UNITS)',
        'FEEDER TRUCK(S)',
        'WAYBILL NO.',
        'SEAL NO.',
        'NO. OF DAYS @ STATION',
        'DEMURRAGE (NGN)',
      ],
    ];

    stationRows.forEach((r) => {
      csvRows.push([
        r.wagonNo,
        r.condition,
        `"${(r.remark || '').replace(/"/g, '""')}"`,
        r.dateLoaded,
        r.startTime || '—',
        r.endTime || '—',
        r.duration || '—',
        r.trainNo,
        r.origin,
        r.destination,
        `"${(r.content || '').replace(/"/g, '""')}"`,
        r.tonnage,
        r.quantity,
        `"${(r.truckRegNo || 'N/A').replace(/"/g, '""')}"`,
        r.waybillNo,
        r.sealNumber || 'SEAL-OK',
        String(r.daysAtStation),
        String(r.demurrage),
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = isTripSpecific
      ? `BUENO_${currentTrip.tripId || currentTrip.id}_TERMINAL_LEDGER_${Date.now()}.csv`
      : `BUENO_TERMINAL_INFORMATION_${selectedStation}_${Date.now()}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ─── OFFICIAL EXCEL-MATCHED HEADER BANNER ─── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold text-slate-600 uppercase tracking-widest">
                OFFICIAL SIDING AUDIT TEMPLATE · BUENO LOGISTICS & NRC
              </span>
              {currentStationInfo.isBuenoTerminal && (
                <span className="bg-emerald-900 text-emerald-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                  BUENO TERMINAL
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              TERMINAL INFORMATION
            </h2>
            <p className="text-xs text-slate-500">
              Station Siding Rolling Stock Ledger, Loading Tally, Waybills, and Demurrage Counter —{' '}
              <span className="text-brand font-bold">100% Real-Time Data from Wagon Loading Audits.</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="bg-brand hover:bg-brand-dark text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{selectedTripId !== 'ALL' ? 'Download Trip Ledger (CSV)' : 'Export Excel / CSV'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Print Ledger</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>+ Log Wagon At Siding</span>
            </button>
          </div>
        </div>

        {/* CONTROLS ROW: STATION SELECTOR & TRIP SELECTOR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          {/* STATION SELECTOR */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-black text-slate-700 uppercase tracking-widest shrink-0">
              STATION:
            </span>
            <select
              value={selectedStation}
              onChange={(e) => {
                setSelectedStation(e.target.value);
                setSelectedTripId('ALL');
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-brand shadow-xs"
            >
              {Object.entries(STATION_OPTIONS).map(([code, opt]) => (
                <option key={code} value={code}>
                  {code} — {opt.name} {opt.isBuenoTerminal ? '[BUENO TERMINAL]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* TRIP SELECTOR (FILTER LEDGER PER TRIP) */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-black text-slate-700 uppercase tracking-widest shrink-0">
              FILTER TRIP:
            </span>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-brand shadow-xs"
            >
              <option value="ALL">All Trips & Wagons at {selectedStation}</option>
              {allTrips.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.tripId || t.id} — {t.company} ({t.origin} ➔ {t.destination}) [{t.status}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Track Gauge:</span>
            <span className="font-bold text-navy bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {currentStationInfo.gauge}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Wagons Count:</span>
              <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                {stationRows.length} Units
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Total Payload:</span>
              <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {totalTonnageNum.toFixed(1)} MT ({totalBags.toLocaleString()} Bags)
              </span>
            </div>
          </div>
        </div>

        {/* DEDICATED TRIP HIGHLIGHT BANNER (IF FILTERED BY TRIP) */}
        {currentTrip && (
          <div className="p-4 rounded-2xl bg-brand/10 border border-brand/30 flex flex-wrap justify-between items-center gap-3">
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-brand-800 block">
                AUDIT FOCUS: TRIP {currentTrip.tripId || currentTrip.id}
              </span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {currentTrip.company} — {currentTrip.cargoType || 'Freight'} ({currentTrip.origin} ➔ {currentTrip.destination})
              </p>
              <p className="text-xs text-slate-600 mt-0.5 font-mono">
                Locomotive: #{currentTrip.locomotiveId || 'L2205'} | Status: {currentTrip.status} | Date: {currentTrip.dispatchDate || currentTrip.createdAt || '17 Sept 2026'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedTripId('ALL')}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
              >
                Clear Filter (View Station)
              </button>
              <button
                onClick={handleExportCsv}
                className="bg-brand hover:bg-brand-dark text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl shadow-xs cursor-pointer"
              >
                Download This Trip CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── THE ENHANCED TERMINAL LEDGER TABLE WITH TIMINGS ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 font-sans">
            {selectedTripId !== 'ALL'
              ? `Trip ${selectedTripId} Wagon Loading & Unloading Ledger`
              : `Current Station Rolling Stock Inventory — ${selectedStation}`}
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Official Terminal Information Ledger ({stationRows.length} Records)
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs font-sans whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <tr>
                {[
                  'WAGON NO.',
                  'CONDITION',
                  'REMARK / SILO BAY',
                  'DATE',
                  'START TIME',
                  'END TIME',
                  'DURATION',
                  'TRAIN / TRIP NO.',
                  'ORIGIN',
                  'DESTINATION',
                  'CONTENT',
                  'TONNAGE',
                  'QUANTITY',
                  'FEEDER TRUCK(S)',
                  'WAYBILL NO.',
                  'DEMURRAGE',
                ].map((col) => (
                  <th
                    key={col}
                    className="p-3.5 text-[10px] font-black uppercase tracking-wider text-slate-700 font-mono"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {stationRows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-xs text-slate-400 font-sans">
                    {selectedTripId !== 'ALL'
                      ? 'No wagon loading logs found for this trip.'
                      : `No active rolling stock currently stationed at ${selectedStation} siding.`}
                  </td>
                </tr>
              ) : (
                stationRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {/* 1. WAGON NO. */}
                    <td className="p-3.5 font-black text-navy">{row.wagonNo}</td>

                    {/* 2. CONDITION */}
                    <td className="p-3.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                          row.condition === 'GOOD' || row.condition === 'LOADED_INTACT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.condition === 'DISCHARGED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.condition}
                      </span>
                    </td>

                    {/* 3. REMARK / SILO BAY */}
                    <td className="p-3.5 font-sans font-medium text-slate-700 max-w-xs truncate">
                      {row.remark}
                    </td>

                    {/* 4. DATE */}
                    <td className="p-3.5 text-slate-600">{row.dateLoaded}</td>

                    {/* 5. START TIME */}
                    <td className="p-3.5 font-bold text-slate-900 bg-emerald-50/50">
                      {row.startTime || '—'}
                    </td>

                    {/* 6. END TIME */}
                    <td className="p-3.5 font-bold text-slate-900 bg-emerald-50/50">
                      {row.endTime || '—'}
                    </td>

                    {/* 7. DURATION */}
                    <td className="p-3.5 font-black text-purple-700 bg-purple-50/40">
                      {row.duration || '—'}
                    </td>

                    {/* 8. TRAIN NO. */}
                    <td className="p-3.5 font-bold text-slate-900">{row.trainNo}</td>

                    {/* 9. ORIGIN */}
                    <td className="p-3.5 font-bold text-emerald-700">{row.origin}</td>

                    {/* 10. DESTINATION */}
                    <td className="p-3.5 font-bold text-blue-700">{row.destination}</td>

                    {/* 11. CONTENT */}
                    <td className="p-3.5 font-sans font-bold text-slate-900">{row.content}</td>

                    {/* 12. TONNAGE */}
                    <td className="p-3.5 font-extrabold text-slate-900">{row.tonnage}</td>

                    {/* 13. QUANTITY */}
                    <td className="p-3.5 text-slate-700">{row.quantity}</td>

                    {/* 14. FEEDER TRUCK(S) */}
                    <td className="p-3.5 font-sans text-slate-600 max-w-xs truncate">
                      {row.truckRegNo || 'N/A'}
                    </td>

                    {/* 15. WAYBILL NO. */}
                    <td className="p-3.5 font-bold text-navy">{row.waybillNo}</td>

                    {/* 16. DEMURRAGE */}
                    <td className="p-3.5 font-black">
                      {row.demurrage > 0 ? (
                        <span className="text-rose-600 font-extrabold">
                          ₦{row.demurrage.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold">₦0 (Free)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── ADD WAGON TO SIDING MODAL ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 font-sans shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-slate-600 uppercase tracking-widest block">
                  TERMINAL SIDING AUDIT ENTRY
                </span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Log Wagon at {selectedStation} Siding
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddRow} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-wagon-no-1">Wagon No. *</label>
                  <input id="terminal-informati-wagon-no-1"
                    required
                    value={newRowForm.wagonNo}
                    onChange={(e) => setNewRowForm({ ...newRowForm, wagonNo: e.target.value })}
                    placeholder="e.g. PXG 09003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-condition-2">Condition *</label>
                  <select id="terminal-informati-condition-2"
                    value={newRowForm.condition}
                    onChange={(e) => setNewRowForm({ ...newRowForm, condition: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="LOADED_INTACT">LOADED_INTACT</option>
                    <option value="GOOD">GOOD</option>
                    <option value="DISCHARGED">DISCHARGED</option>
                    <option value="DEFECTIVE">DEFECTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-start-time-3">Start Time</label>
                  <input id="terminal-informati-start-time-3"
                    value={newRowForm.startTime}
                    onChange={(e) => setNewRowForm({ ...newRowForm, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-end-time-4">End Time</label>
                  <input id="terminal-informati-end-time-4"
                    value={newRowForm.endTime}
                    onChange={(e) => setNewRowForm({ ...newRowForm, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-duration-5">Duration</label>
                  <input id="terminal-informati-duration-5"
                    value={newRowForm.duration}
                    onChange={(e) => setNewRowForm({ ...newRowForm, duration: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-train-no-6">Train No. *</label>
                  <input id="terminal-informati-train-no-6"
                    required
                    value={newRowForm.trainNo}
                    onChange={(e) => setNewRowForm({ ...newRowForm, trainNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-destination-7">Destination *</label>
                  <select id="terminal-informati-destination-7"
                    value={newRowForm.destination}
                    onChange={(e) => setNewRowForm({ ...newRowForm, destination: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    {Object.entries(STATION_OPTIONS).map(([code, opt]) => (
                      <option key={code} value={code}>
                        {code} — {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-quantity-bags-8">Quantity (Bags)</label>
                  <input id="terminal-informati-quantity-bags-8"
                    value={newRowForm.quantity}
                    onChange={(e) => setNewRowForm({ ...newRowForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-tonnage-9">Tonnage</label>
                  <input id="terminal-informati-tonnage-9"
                    value={newRowForm.tonnage}
                    onChange={(e) => setNewRowForm({ ...newRowForm, tonnage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-feeder-truck-plate-s-10">Feeder Truck Plate(s)</label>
                <input id="terminal-informati-feeder-truck-plate-s-10"
                  value={newRowForm.truckRegNo}
                  onChange={(e) => setNewRowForm({ ...newRowForm, truckRegNo: e.target.value })}
                  placeholder="e.g. KJA-482-XY, BDG-119-ZZ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="terminal-informati-remark-audit-note-11">Remark / Audit Note</label>
                <input id="terminal-informati-remark-audit-note-11"
                  value={newRowForm.remark}
                  onChange={(e) => setNewRowForm({ ...newRowForm, remark: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
