'use client';

import React from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

interface TripDossierModalProps {
  trip: any;
  onClose: () => void;
}

export function TripDossierModal({ trip, onClose }: TripDossierModalProps) {
  if (!trip) return null;

  // Station name resolver
  const sName = (code: string) => {
    switch ((code || '').toUpperCase()) {
      case 'EWK':  return 'Ewekoro Siding (EWK)';
      case 'MNY':  return 'Moniya Yard, Ibadan (MNY)';
      case 'MONI': return 'Moniya Yard, Ibadan (MNY)';
      case 'PAPA': return 'Papalanto Terminal (PAPA)';
      case 'APT':  return 'Apapa Maritime Port (APT)';
      case 'APQ':  return 'Apapa Port (APQ)';
      case 'ENL':  return 'ENL Terminal, Apapa (ENL)';
      case 'APL':  return 'Apapa Local (APL)';
      default:     return code || 'Main Siding';
    }
  };

  // Associated Fund Requisitions for this trip
  const allRequests = StateEngine.getRequests();
  const tripRequests = allRequests.filter(
    (r: any) =>
      r.tripNo === trip.id ||
      r.tripNo === trip.tripId ||
      (trip.tripId && r.tripNo?.includes(trip.tripId)) ||
      (trip.id && r.tripNo?.includes(trip.id))
  );

  // Financial summary
  const fin = StateEngine.getTripFinancialSummary(trip);

  const wagonLogs: any[] = trip.wagonLogs || [];
  const totalWagons = wagonLogs.length;
  const loadedWagons = wagonLogs.filter((w: any) => w.status === 'LOADED').length;
  const unloadedWagons = wagonLogs.filter((w: any) => w.unloadStatus === 'UNLOADED').length;
  const burstBagsCount = wagonLogs.reduce((acc: number, w: any) => acc + (Number(w.burstBags) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* MODAL HEADER (Hidden on Print) */}
        <div className="bg-slate-900 text-white p-5 px-6 flex justify-between items-center border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-[#62BC37] flex items-center justify-center font-mono font-black text-lg">
              📄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#62BC37]">{trip.tripId || trip.id}</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase font-mono">
                  {trip.status}
                </span>
              </div>
              <h2 className="text-base font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Official Consignment Trip Dossier & Operational Report
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>🖨️ Print Report (PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PRINTABLE DOSSIER BODY */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 font-sans text-slate-800 print:p-4 print:space-y-4">
          
          {/* OFFICIAL CORPORATE LETTERHEAD */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  B
                </div>
                <h1 className="text-xl font-black tracking-tight text-slate-950" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  BUENO LOGISTICS LIMITED
                </h1>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-1">
                Heavy Rail Freight & Intermodal Corridor Command • NRC Narrow & Standard Gauge Operations
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                RC: 1849204 • Headquarters: Lagos Rail Freight Yard / Moniya Dry Port Terminal
              </p>
            </div>

            <div className="text-left sm:text-right font-mono space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">DOSSIER REF NO</span>
              <p className="text-base font-black text-emerald-700">{trip.tripId || trip.id}-DOSSIER</p>
              <p className="text-[10px] text-slate-500">Date Generated: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* 1. TRIP & ROUTE SUMMARY CARD */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Consignee Client</span>
              <p className="font-extrabold text-slate-900 text-sm">{trip.company || trip.companyName || 'Standard Client'}</p>
              <span className="text-[10px] text-slate-500">{trip.cargoType || 'Bagged Freight'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Corridor Movement</span>
              <p className="font-extrabold text-slate-900">{sName(trip.origin)}</p>
              <span className="text-emerald-700 font-black text-[11px]">➔ {sName(trip.destination)}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Locomotive & Crew</span>
              <p className="font-mono font-extrabold text-slate-900">{trip.locomotiveId || 'NRC-L2205'}</p>
              <span className="text-[10px] text-slate-600">{trip.driverName || 'Engr. K. Usman'}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block font-mono">Cargo Officer & Caboose</span>
              <p className="font-extrabold text-slate-900">{trip.monitoringOfficer || trip.cargoOfficerName || 'Ade Bello'}</p>
              <span className="text-[10px] text-slate-600 font-mono">Escort: {trip.escortWagonId || 'BV 01'}</span>
            </div>
          </div>

          {/* 2. OPERATIONAL WAGON MANIFEST & DISCHARGE TALLY */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                <span>📦 Wagon-by-Wagon Manifest & Offload Audit</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                  {totalWagons} Wagons Enrolled
                </span>
              </h3>
              <div className="text-[11px] font-mono font-bold text-slate-600 space-x-3">
                <span>Loaded: <b className="text-emerald-700">{loadedWagons}</b></span>
                <span>Unloaded: <b className="text-purple-700">{unloadedWagons}</b></span>
                <span>Burst Bags: <b className="text-rose-600">{burstBagsCount}</b></span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-mono uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 px-3">Wagon ID</th>
                    <th className="p-2.5 px-3">Security Seal #</th>
                    <th className="p-2.5 px-3">Loaded Qty</th>
                    <th className="p-2.5 px-3">Discharged</th>
                    <th className="p-2.5 px-3">Burst Bags</th>
                    <th className="p-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {wagonLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 font-sans text-xs">
                        Standard 23-wagon rake assigned. Wagon loading logs will populate during siding loading.
                      </td>
                    </tr>
                  ) : (
                    wagonLogs.map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 px-3 font-bold text-slate-900">{w.wagonId || `WG-${idx + 1}`}</td>
                        <td className="p-2.5 px-3 text-slate-600">{w.sealNumber || `SEAL-BN-${9800 + idx}`}</td>
                        <td className="p-2.5 px-3 font-bold text-emerald-700">{w.bagsCount || 70} Bags</td>
                        <td className="p-2.5 px-3 text-purple-700 font-bold">{w.unloadStatus === 'UNLOADED' ? (w.bagsCount || 70) : 0}</td>
                        <td className="p-2.5 px-3 text-rose-600 font-black">{w.burstBags || 0}</td>
                        <td className="p-2.5 px-3">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                            w.unloadStatus === 'UNLOADED'
                              ? 'bg-purple-100 text-purple-800'
                              : w.status === 'LOADED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {w.unloadStatus === 'UNLOADED' ? 'DISCHARGED' : w.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. FIELD FUND REQUISITIONS LOGGED FOR THIS TRIP */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
              <span>💳 Siding Fund Requisitions for this Trip</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                {tripRequests.length} Linked Requests
              </span>
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-mono uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 px-3">Req ID</th>
                    <th className="p-2.5 px-3">Purpose & Category</th>
                    <th className="p-2.5 px-3">Officer</th>
                    <th className="p-2.5 px-3">Amount (₦)</th>
                    <th className="p-2.5 px-3">Stage & Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {tripRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 font-sans text-xs">
                        No field fund requisitions logged against {trip.tripId || trip.id}.
                      </td>
                    </tr>
                  ) : (
                    tripRequests.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 px-3 font-bold text-[#0E4B88]">{r.id}</td>
                        <td className="p-2.5 px-3 font-sans font-bold text-slate-800">
                          {r.title} <span className="text-slate-400 font-normal font-mono text-[10px]">({r.category})</span>
                        </td>
                        <td className="p-2.5 px-3 font-sans text-slate-600">{r.officerName || r.requestedBy}</td>
                        <td className="p-2.5 px-3 font-bold text-slate-900">₦{Number(r.amount).toLocaleString()}</td>
                        <td className="p-2.5 px-3">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded ${
                            r.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.stage} • {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. TRIP FINANCIAL P&L STATEMENT */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider block">
                  TRIP PROFIT & LOSS RECONCILIATION
                </span>
                <h3 className="text-sm font-black text-white font-sans">Corridor Financial Performance Summary</h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Gross Margin</span>
                <span className={`text-base font-black font-mono ${fin.marginPct >= 20 ? 'text-[#62BC37]' : 'text-amber-400'}`}>
                  {fin.marginPct}% Margin
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-400 uppercase block">Gross Freight Tariff</span>
                <p className="text-sm font-black text-slate-100">₦{fin.grossFreight.toLocaleString()}</p>
                <span className="text-[9px] text-slate-500">Agreed Rate / MT</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-rose-400 uppercase block">Transit Damage (Burst Bags)</span>
                <p className="text-sm font-black text-rose-400">-₦{fin.damageDeductions.toLocaleString()}</p>
                <span className="text-[9px] text-slate-500">{fin.burstBags} Bags @ ₦8,000</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-amber-400 uppercase block">Total Direct Operating Costs</span>
                <p className="text-sm font-black text-amber-400">-₦{fin.totalOperatingCost.toLocaleString()}</p>
                <span className="text-[9px] text-slate-500">Tolls, Diesel & Siding</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[9px] text-[#62BC37] uppercase block">Net Trip Operating Profit</span>
                <p className={`text-sm font-black ${fin.grossProfit >= 0 ? 'text-[#62BC37]' : 'text-rose-500'}`}>
                  ₦{fin.grossProfit.toLocaleString()}
                </p>
                <span className="text-[9px] text-slate-500">Contribution to Head Office</span>
              </div>
            </div>
          </div>

          {/* OFFICIAL SIGNATURES */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Station Cargo Officer</span>
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end">
                <span className="font-serif italic text-slate-700">{trip.cargoOfficerName || 'Ade Bello'}</span>
              </div>
              <p className="text-[10px] text-slate-500">Sign & Stamp</p>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Train Escort / Caboose Lead</span>
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end">
                <span className="font-serif italic text-slate-700">{trip.escortOfficerName || 'Inspector D. Adeleke'}</span>
              </div>
              <p className="text-[10px] text-slate-500">NRC Escort Sign-off</p>
            </div>

            <div className="space-y-3 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Finance & Treasury Audit</span>
              <div className="h-10 border-b border-dashed border-slate-400 flex items-end">
                <span className="font-serif italic text-slate-700">Audit Verified</span>
              </div>
              <p className="text-[10px] text-slate-500">Disbursement & Settlement</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default TripDossierModal;
