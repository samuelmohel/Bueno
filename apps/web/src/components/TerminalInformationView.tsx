'use client';

import React, { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

interface TerminalRow {
  id: string;
  wagonNo: string;
  condition: 'GOOD' | 'DEFECTIVE' | 'UNDER_MAINTENANCE' | 'LOADED_INTACT' | 'DISCHARGED';
  remark: string;
  dateLoaded: string;
  trainNo: string;
  origin: string;
  destination: string;
  content: string;
  tonnage: string;
  quantity: string;
  waybillNo: string;
  daysAtStation: number;
  demurrage: number;
  station: string;
}

const SEED_TERMINAL_ROWS: TerminalRow[] = [
  {
    id: 'TRM-001',
    wagonNo: 'PXG 09001',
    condition: 'LOADED_INTACT',
    remark: 'Loaded & Sealed at Siding Bay 1',
    dateLoaded: '05 Sep 2026',
    trainNo: 'TRP-8841',
    origin: 'PAPA',
    destination: 'MONI',
    content: 'Huaxin Portland Cement (50kg)',
    tonnage: '40 MT',
    quantity: '800 Bags',
    waybillNo: 'WB-BN-2026-0901',
    daysAtStation: 1,
    demurrage: 0,
    station: 'PAPA',
  },
  {
    id: 'TRM-002',
    wagonNo: 'PXG 09002',
    condition: 'LOADED_INTACT',
    remark: 'Loaded & Sealed at Siding Bay 2',
    dateLoaded: '05 Sep 2026',
    trainNo: 'TRP-8841',
    origin: 'PAPA',
    destination: 'MONI',
    content: 'Huaxin Portland Cement (50kg)',
    tonnage: '40 MT',
    quantity: '800 Bags',
    waybillNo: 'WB-BN-2026-0902',
    daysAtStation: 1,
    demurrage: 0,
    station: 'PAPA',
  },
  {
    id: 'TRM-003',
    wagonNo: 'ZGX 0441',
    condition: 'DISCHARGED',
    remark: 'Discharged & Cleaned; Awaiting Return',
    dateLoaded: '03 Sep 2026',
    trainNo: 'TRP-7712',
    origin: 'ENL',
    destination: 'PAPA',
    content: 'Bulk Gypsum',
    tonnage: '60 MT',
    quantity: '60 MT',
    waybillNo: 'WB-BN-2026-0884',
    daysAtStation: 2,
    demurrage: 0,
    station: 'PAPA',
  },
  {
    id: 'TRM-004',
    wagonNo: 'CBX 1104',
    condition: 'LOADED_INTACT',
    remark: 'Export Container Secured for Lagos Port',
    dateLoaded: '04 Sep 2026',
    trainNo: 'TRP-9921',
    origin: 'MONI',
    destination: 'APT',
    content: 'CONTAINERS-EXPORT (40ft HC)',
    tonnage: '35 MT',
    quantity: '1 TEU',
    waybillNo: 'WB-BN-2026-0895',
    daysAtStation: 1,
    demurrage: 0,
    station: 'MONI',
  },
  {
    id: 'TRM-005',
    wagonNo: 'PXG 09015',
    condition: 'DISCHARGED',
    remark: 'Discharging directly into Consignee Feeder Trucks',
    dateLoaded: '05 Sep 2026',
    trainNo: 'TRP-8841',
    origin: 'PAPA',
    destination: 'MONI',
    content: 'Huaxin Portland Cement (50kg)',
    tonnage: '40 MT',
    quantity: '800 Bags',
    waybillNo: 'WB-BN-2026-0903',
    daysAtStation: 1,
    demurrage: 0,
    station: 'MONI',
  },
  {
    id: 'TRM-006',
    wagonNo: 'CBX 1109',
    condition: 'GOOD',
    remark: 'Inbound Vessel Container Received from APMT',
    dateLoaded: '01 Sep 2026',
    trainNo: 'TRP-6610',
    origin: 'APT',
    destination: 'MONI',
    content: 'CONTAINERS-IMPORT (40ft HC)',
    tonnage: '35 MT',
    quantity: '1 TEU',
    waybillNo: 'WB-BN-2026-0850',
    daysAtStation: 4,
    demurrage: 0,
    station: 'MONI',
  },
  {
    id: 'TRM-007',
    wagonNo: 'ZGX 0442',
    condition: 'GOOD',
    remark: 'Gypsum Rake Loading at ENL Berth',
    dateLoaded: '05 Sep 2026',
    trainNo: 'TRP-7715',
    origin: 'ENL',
    destination: 'PAPA',
    content: 'Bulk Gypsum',
    tonnage: '60 MT',
    quantity: '60 MT',
    waybillNo: 'WB-BN-2026-0912',
    daysAtStation: 1,
    demurrage: 0,
    station: 'ENL',
  },
  {
    id: 'TRM-008',
    wagonNo: 'PXG 09030',
    condition: 'LOADED_INTACT',
    remark: 'Narrow Gauge Rake at Itori Siding',
    dateLoaded: '05 Sep 2026',
    trainNo: 'TRP-5501',
    origin: 'EWK',
    destination: 'ILR',
    content: 'Huaxin Portland Cement (50kg)',
    tonnage: '40 MT',
    quantity: '800 Bags',
    waybillNo: 'WB-BN-2026-0910',
    daysAtStation: 1,
    demurrage: 0,
    station: 'EWK',
  },
];

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
    return 'PAPA';
  });

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
    const handleUpdate = () => setLiveTripsUpdate((n) => n + 1);
    window.addEventListener('bueno_state_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('bueno_state_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const saveRows = (newRows: TerminalRow[]) => {
    setManualRows(newRows);
    try {
      localStorage.setItem('bueno_terminal_information', JSON.stringify(newRows));
      window.dispatchEvent(new Event('bueno_state_updated'));
    } catch {}
  };

  const currentStationInfo = STATION_OPTIONS[selectedStation] || STATION_OPTIONS['PAPA'];

  // Dynamically derive live wagons at this siding from active trips + manual entries
  const liveTripRows = StateEngine.getStationWagonLedger(selectedStation);
  const stationManualRows = manualRows.filter((r) => r.station === selectedStation || r.origin === selectedStation);
  const seenWagons = new Set<string>();
  const stationRows: TerminalRow[] = [];

  [...liveTripRows, ...stationManualRows].forEach((r) => {
    if (!seenWagons.has(r.wagonNo)) {
      seenWagons.add(r.wagonNo);
      stationRows.push(r);
    }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRowForm, setNewRowForm] = useState({
    wagonNo: 'PXG 09003',
    condition: 'LOADED_INTACT' as const,
    remark: 'Loaded & Verified Intact',
    dateLoaded: new Date().toLocaleDateString('en-GB'),
    trainNo: 'TRP-8842',
    origin: 'PAPA',
    destination: 'MONI',
    content: 'Huaxin Portland Cement (50kg)',
    tonnage: '40 MT',
    quantity: '800 Bags',
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
      trainNo: newRowForm.trainNo.trim(),
      origin: newRowForm.origin,
      destination: newRowForm.destination,
      content: newRowForm.content,
      tonnage: newRowForm.tonnage,
      quantity: newRowForm.quantity,
      waybillNo: newRowForm.waybillNo,
      daysAtStation: Number(newRowForm.daysAtStation) || 1,
      demurrage: demurrageAmount,
      station: selectedStation,
    };

    saveRows([newRow, ...manualRows]);
    setShowAddModal(false);
  };

  const handleExportCsv = () => {
    const csvRows = [
      ['TERMINAL INFORMATION'],
      [`STATION: ${selectedStation} (${currentStationInfo.name})`],
      [`TRACK GAUGE: ${currentStationInfo.gauge}`],
      [`DATE GENERATED: ${new Date().toLocaleDateString('en-GB')}`],
      [],
      [
        'WAGON NO.',
        'CONDITION',
        'REMARK',
        'DATE LOADED',
        'TRAIN NO.',
        'ORIGIN',
        'DESTINATION',
        'CONTENT',
        'TONNAGE',
        'QUANTITY',
        'WAYBILL NO.',
        'NO. OF DAYS @ STATION',
        'DEMURRAGE (NGN)',
      ],
    ];

    stationRows.forEach((r) => {
      csvRows.push([
        r.wagonNo,
        r.condition,
        `"${r.remark.replace(/"/g, '""')}"`,
        r.dateLoaded,
        r.trainNo,
        r.origin,
        r.destination,
        `"${r.content.replace(/"/g, '""')}"`,
        r.tonnage,
        r.quantity,
        r.waybillNo,
        String(r.daysAtStation),
        String(r.demurrage),
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TERMINAL_INFORMATION_${selectedStation}_${Date.now()}.csv`);
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
              <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest">
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
              Station Siding Rolling Stock Ledger, Loading Tally, Waybills, and Demurrage Counter — <span className="text-emerald-700 font-bold">Dynamically synchronized with active train trips & siding logs.</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCsv}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              <span>Export Excel / CSV 📊</span>
            </button>
            <button
              onClick={() => window.print()}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-200 transition-all flex items-center gap-2"
            >
              <span>Print Ledger 🖨️</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <span>+ Log Wagon At Siding</span>
            </button>
          </div>
        </div>

        {/* STATION SELECTOR ROW (MATCHES 'STATION: ###' ON TEMPLATE) */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-black text-slate-700 uppercase tracking-widest">
              STATION:
            </span>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-[#62BC37] shadow-xs"
            >
              {Object.entries(STATION_OPTIONS).map(([code, opt]) => (
                <option key={code} value={code}>
                  {code} — {opt.name} {opt.isBuenoTerminal ? '★ BUENO TERMINAL' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-500">Track Gauge:</span>
            <span className="font-bold text-[#0E4B88] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {currentStationInfo.gauge}
            </span>
            <span className="text-slate-500">Stationed Wagons:</span>
            <span className="font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {stationRows.length} Units
            </span>
          </div>
        </div>
      </div>

      {/* ─── THE 13-COLUMN TABLE MATCHING CLIENT TEMPLATE ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 font-sans">
            Current Station Rolling Stock Inventory — {selectedStation}
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Official 13-Column Terminal Information Ledger
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs font-sans whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <tr>
                {[
                  'WAGON NO.',
                  'CONDITION',
                  'REMARK',
                  'DATE LOADED',
                  'TRAIN NO.',
                  'ORIGIN',
                  'DESTINATION',
                  'CONTENT',
                  'TONNAGE',
                  'QUANTITY',
                  'WAYBILL NO.',
                  'NO. OF DAYS @ STATION',
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
                  <td colSpan={13} className="p-8 text-center text-xs text-slate-400 font-sans">
                    No active rolling stock currently stationed at {selectedStation} siding.
                  </td>
                </tr>
              ) : (
                stationRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    {/* 1. WAGON NO. */}
                    <td className="p-3.5 font-black text-[#0E4B88]">{row.wagonNo}</td>

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

                    {/* 3. REMARK */}
                    <td className="p-3.5 font-sans font-medium text-slate-700 max-w-xs truncate">
                      {row.remark}
                    </td>

                    {/* 4. DATE LOADED */}
                    <td className="p-3.5 text-slate-600">{row.dateLoaded}</td>

                    {/* 5. TRAIN NO. */}
                    <td className="p-3.5 font-bold text-slate-900">{row.trainNo}</td>

                    {/* 6. ORIGIN */}
                    <td className="p-3.5 font-bold text-emerald-700">{row.origin}</td>

                    {/* 7. DESTINATION */}
                    <td className="p-3.5 font-bold text-blue-700">{row.destination}</td>

                    {/* 8. CONTENT */}
                    <td className="p-3.5 font-sans font-bold text-slate-900">{row.content}</td>

                    {/* 9. TONNAGE */}
                    <td className="p-3.5 font-extrabold text-slate-900">{row.tonnage}</td>

                    {/* 10. QUANTITY */}
                    <td className="p-3.5 text-slate-700">{row.quantity}</td>

                    {/* 11. WAYBILL NO. */}
                    <td className="p-3.5 font-bold text-[#0E4B88]">{row.waybillNo}</td>

                    {/* 12. NO. OF DAYS @ STATION */}
                    <td className="p-3.5 font-bold text-slate-900">{row.daysAtStation} Day(s)</td>

                    {/* 13. DEMURRAGE */}
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
                <span className="text-[10px] font-mono font-black text-[#62BC37] uppercase tracking-widest block">
                  TERMINAL SIDING AUDIT ENTRY
                </span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Log Wagon at {selectedStation} Siding
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRow} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Wagon No. *</label>
                  <input
                    required
                    value={newRowForm.wagonNo}
                    onChange={(e) => setNewRowForm({ ...newRowForm, wagonNo: e.target.value })}
                    placeholder="e.g. PXG 09003"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Condition *</label>
                  <select
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Train No. *</label>
                  <input
                    required
                    value={newRowForm.trainNo}
                    onChange={(e) => setNewRowForm({ ...newRowForm, trainNo: e.target.value })}
                    placeholder="e.g. TRP-8842"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Waybill No. *</label>
                  <input
                    required
                    value={newRowForm.waybillNo}
                    onChange={(e) => setNewRowForm({ ...newRowForm, waybillNo: e.target.value })}
                    placeholder="e.g. WB-BN-2026-0905"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Origin *</label>
                  <input
                    required
                    value={newRowForm.origin}
                    onChange={(e) => setNewRowForm({ ...newRowForm, origin: e.target.value })}
                    placeholder="e.g. PAPA"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Destination *</label>
                  <input
                    required
                    value={newRowForm.destination}
                    onChange={(e) => setNewRowForm({ ...newRowForm, destination: e.target.value })}
                    placeholder="e.g. MONI"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Content / Cargo *</label>
                  <input
                    required
                    value={newRowForm.content}
                    onChange={(e) => setNewRowForm({ ...newRowForm, content: e.target.value })}
                    placeholder="e.g. Huaxin Portland Cement (50kg)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tonnage (MT) *</label>
                  <input
                    required
                    value={newRowForm.tonnage}
                    onChange={(e) => setNewRowForm({ ...newRowForm, tonnage: e.target.value })}
                    placeholder="e.g. 40 MT"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Quantity *</label>
                  <input
                    required
                    value={newRowForm.quantity}
                    onChange={(e) => setNewRowForm({ ...newRowForm, quantity: e.target.value })}
                    placeholder="e.g. 800 Bags"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Days at Station</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={newRowForm.daysAtStation}
                    onChange={(e) => setNewRowForm({ ...newRowForm, daysAtStation: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Remark *</label>
                <input
                  required
                  value={newRowForm.remark}
                  onChange={(e) => setNewRowForm({ ...newRowForm, remark: e.target.value })}
                  placeholder="e.g. Siding bay clearance verified"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all"
                >
                  Save Entry to Ledger ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
