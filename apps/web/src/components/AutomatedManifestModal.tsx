'use client';

import React from 'react';
import { loadWindow, unloadWindow, recorded, tripDuration, toSheetClock } from '@/lib/tally';

interface ManifestModalProps {
  trip: any;
  onClose: () => void;
}

export default function AutomatedManifestModal({ trip, onClose }: ManifestModalProps) {
  if (!trip) return null;

  const logs = trip.wagonLogs || [];
  const requisitionedBags = Number(trip.quantity) || 27600;
  const actualLoadedBags = logs.length > 0
    ? logs.reduce((sum: number, w: any) => sum + (Number(w.qty) || 1200), 0)
    : Math.min(requisitionedBags, (trip.targetWagonsCount || 23) * 1200);

  const totalWagons = logs.length || trip.targetWagonsCount || 23;
  const netWeightTonnes = (actualLoadedBags * 50) / 1000;
  const totalTareWeightTonnes = totalWagons * 22.5;
  const grossTrainWeightTonnes = netWeightTonnes + totalTareWeightTonnes;

  /*
   * A manifest names who is responsible for a consignment, so an unfilled
   * field has to say it is unfilled. These fields used to fall back to
   * hard-coded names — 'Ade Bello (EWK-01)', 'Musa Ibrahim (MNY-01)' — which
   * kept printing on manifests after those accounts had been deleted.
   */
  const UNASSIGNED = '— to be completed —';

  const manifestNo = `MNF-NRC-2026-${String(trip.tripId || '001').replace(/[^0-9]/g, '').padStart(3, '0')}`;
  const vesselRef = trip.vesselNo || '';
  const driverName = trip.leadDriverName || trip.driverName || UNASSIGNED;
  const escortName = trip.cargoOfficerName || UNASSIGNED;
  const destOfficer = trip.unloadingOfficerName || UNASSIGNED;

  const handlePrint = () => {
    window.print();
  };

  /**
   * Quote a value for CSV.
   *
   * Company names contain commas ("Huaxin Building Materials Nig, Plc") and
   * complaint notes contain commas, quotes and newlines. None of it was
   * escaped, so a single comma anywhere silently shifted every later column
   * in the row — on the document a claim is settled from.
   *
   * The leading apostrophe guards the spreadsheet-formula case: a field
   * beginning = + - or @ is executed by Excel and Sheets when the file is
   * opened, and these fields are typed by hand at a siding.
   */
  const csvCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    let text = String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const handleDownloadCsv = () => {
    /*
     * The manifest reports what was recorded.
     *
     * Previously, when a trip had no wagon tallies this invented twenty-three
     * wagons named WG001…WG023 carrying 1,200 bags each, gave every one a
     * generated seal number, a tare of exactly 22.5 tonnes and a condition of
     * VERIFIED_INTACT — including wagons logged as damaged. The timing
     * captured at the siding appeared nowhere on it at all.
     */
    const csvRows: unknown[][] = [
      ['Manifest Serial No', manifestNo],
      ['Locomotive ID', trip.locomotiveId || ''],
      ['Trip ID', trip.tripId || trip.id || ''],
      ['Consignee Company', trip.company || ''],
      ['Vessel Ref', trip.vesselNo || ''],
      ['Origin Station', trip.origin || ''],
      ['Destination Station', trip.destination || ''],
      ['Departed', toSheetClock(trip.departedAt) || ''],
      ['Discharged', toSheetClock(trip.completedAt) || ''],
      ['Total Transit Time', tripDuration(trip.departedAt, trip.completedAt) || ''],
      ['Lead Driver', trip.leadDriverName || trip.driverName || ''],
      ['Escort Officer', trip.cargoOfficerName || ''],
      ['Discharge Officer', trip.unloadingOfficerName || ''],
      ['Wagons Tallied', logs.length],
      ['Total Bags Loaded', logs.length > 0 ? actualLoadedBags : ''],
      ['Net Freight Weight (Tonnes)', logs.length > 0 ? netWeightTonnes : ''],
      ['Generated', toSheetClock(new Date().toISOString())],
      [],
    ];

    if (logs.length === 0) {
      csvRows.push(['No wagon tallies have been recorded for this consignment.']);
    } else {
      csvRows.push([
        'Wagon Serial', 'Seal Fitted', 'Seal On Arrival', 'Seal Verdict',
        'Tare (Tonnes)', 'Cargo Spec', 'Bags Loaded',
        'Loading Start', 'Loading End', 'Loading Duration', 'Loading Bay',
        'Feeder Trucks', 'Drivers',
        'Unload Start', 'Unload End', 'Unload Duration',
        'Discharged Intact', 'Damaged', 'Burst Bags', 'Discrepancy Note', 'Condition',
      ]);

      logs.forEach((w: any) => {
        const bags = Number(w.qty) || 0;
        const load = loadWindow(w);
        const unload = unloadWindow(w);
        const damaged = Number(w.damageQty || 0);
        const burst = Number(w.burstBags || 0);
        const defects = damaged + burst;
        const isUnloaded = w.unloadStatus === 'UNLOADED';

        // Condition reports the tally, rather than asserting VERIFIED_INTACT
        // for every wagon including the damaged ones.
        const condition = !isUnloaded
          ? 'NOT_YET_DISCHARGED'
          : defects > 0
            ? 'DISCREPANCY_LOGGED'
            : 'DISCHARGED_INTACT';

        const trucks = Array.isArray(w.feederTrucks) ? w.feederTrucks : [];

        /*
         * The seal comparison, as three columns rather than one.
         *
         * "Seal: SEAL-PAPA-8801" on its own says a seal was fitted. It does
         * not say whether that is the seal that arrived, which is the only
         * question a claim turns on.
         */
        const sealVerdict =
          w.sealIntact === true ? 'MATCHED'
          : w.sealIntact === false ? 'DID NOT MATCH'
          : !isUnloaded ? ''
          : 'NOT CHECKED';

        csvRows.push([
          w.wagonId || '',
          w.sealNumber || 'NOT RECORDED',
          w.sealObserved || (isUnloaded ? 'NOT CHECKED' : ''),
          sealVerdict,
          // Tare comes off the wagon register; blank where it is unknown,
          // rather than the 22.5t constant applied to every vehicle before.
          w.tareTonnes ?? '',
          trip.cargoType || '',
          bags || '',
          load.range === '—' ? '' : load.range.split(' → ')[0] || '',
          load.range === '—' ? '' : load.range.split(' → ')[1] || '',
          load.duration === '—' ? '' : load.duration,
          w.sourceEnv || '',
          trucks.map((t: any) => t.truckRegNo).filter(Boolean).join('; '),
          trucks.map((t: any) => t.driverName).filter(Boolean).join('; '),
          unload.range === '—' ? '' : unload.range.split(' → ')[0] || '',
          unload.range === '—' ? '' : unload.range.split(' → ')[1] || '',
          unload.duration === '—' ? '' : unload.duration,
          isUnloaded && w.correctQty !== undefined && w.correctQty !== null ? Number(w.correctQty) : '',
          damaged || 0,
          burst || 0,
          w.complaintNotes || '',
          condition,
        ]);
      });
    }

    const csv = csvRows.map((row) => row.map(csvCell).join(',')).join('\r\n');

    // A Blob rather than a data: URI. encodeURI() mangles '#' and '+' in a
    // note, and long manifests exceeded the URL length limit outright.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Official_Manifest_${manifestNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl mx-auto border border-slate-200 shadow-2xl overflow-hidden font-sans my-auto">
        {/* Printable Action Bar */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black"></span>
            <div>
              <span className="text-[10px] font-mono font-extrabold text-slate-600 uppercase tracking-widest block">AUTOMATED MANIFEST GENERATOR</span>
              <h3 className="text-sm font-black text-white">NRC & Bueno Railway Consignment Manifest #{manifestNo}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadCsv} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-all">
              Export CSV 
            </button>
            <button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-md transition-all">
              Print Official PDF 
            </button>
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-3 py-2 text-xs rounded-xl font-bold">
              ×
            </button>
          </div>
        </div>

        {/* Official Printable Freight Manifest Certificate */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4 text-slate-900 bg-white">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-navy p-2 shadow-md flex items-center justify-center">
                  <img src="/bueno_logo.png" alt="Bueno Logistics" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    BUENO <span className="text-slate-600">LOGISTICS LIMITED</span>
                  </h2>
                  <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">
                    IN PARTNERSHIP WITH NIGERIAN RAILWAY CORPORATION (NRC) • HEAVY FREIGHT DIVISION
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-black text-navy block">OFFICIAL FREIGHT MANIFEST</span>
                <span className="text-lg font-black text-slate-900 block">{manifestNo}</span>
                <span className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          {/* Key Train & Consignment Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">LOCOMOTIVE ID</span>
              <span className="font-black text-slate-900 text-sm">{trip.locomotiveId || 'Not yet coupled'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">CONSIGNEE COMPANY</span>
              <span className="font-black text-slate-900">{trip.company || 'HUAXIN BUILDING MATERIALS'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">CORRIDOR ROUTE</span>
              <span className="font-black text-slate-900">{trip.origin || 'EWK'} → {trip.destination || 'MNY'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">VESSEL IMPORT REF</span>
              <span className="font-black text-navy">{vesselRef}</span>
            </div>
          </div>

          {/* Crew & Monitoring Roster (Page 1 Spec 03) */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">NRC LEAD TRAIN DRIVER</span>
              <span className="font-black text-emerald-400 mt-0.5 block">{driverName}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">TRAIN CREW & BRAKEMAN</span>
              <span className="font-black text-emerald-400 mt-0.5 block">{trip.trainCrew || trip.crewNames || UNASSIGNED}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">MONITORING OFFICER</span>
              <span className="font-black text-emerald-400 mt-0.5 block">{trip.monitoringOfficer || trip.cargoOfficerName || UNASSIGNED}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">DESTINATION SIDING & GAUGE</span>
              <span className="font-black text-emerald-400 mt-0.5 block">{trip.destination || 'MNY'} ({trip.destination === 'EWK' || trip.destination === 'DGB' ? 'Narrow Gauge 1,067mm' : 'Standard Gauge 1,435mm'})</span>
            </div>
          </div>

          {/* Itemized Wagon Freight Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-slate-900 font-mono tracking-wider">
              ITEMIZED HOPPER WAGON FREIGHT & SECURITY SEAL ROSTER ({totalWagons} WAGONS)
            </h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Wagon ID</th>
                    <th className="p-3">Security Seal No.</th>
                    <th className="p-3">Seal Verified</th>
                    <th className="p-3">Cargo Spec</th>
                    <th className="p-3">Bags</th>
                    <th className="p-3">Tare (Tonnes)</th>
                    <th className="p-3">Gross (Tonnes)</th>
                    <th className="p-3">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {/*
                    * Only wagons that were actually tallied.
                    *
                    * When a trip had no logs this printed WG001…WG023, each
                    * with 1,200 bags, a generated seal and a condition of
                    * VERIFIED INTACT — a complete manifest for a train that
                    * had not been loaded.
                    */}
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        No wagon tallies recorded for this consignment yet.
                      </td>
                    </tr>
                  ) : logs.map((w: any, idx: number) => {
                    const bags = Number(w.qty) || 0;
                    const netT = (bags * 50) / 1000;
                    const tareT = Number(w.tareTonnes) || null;
                    const grossT = tareT !== null ? netT + tareT : null;
                    const defects = Number(w.damageQty || 0) + Number(w.burstBags || 0);
                    const isUnloaded = w.unloadStatus === 'UNLOADED';
                    return (
                      <tr key={w.wagonId || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-black text-navy">{recorded(w.wagonId)}</td>
                        <td className={`p-3 font-bold ${w.sealNumber ? 'text-slate-600' : 'text-amber-700'}`}>
                          {w.sealNumber || 'not recorded'}
                        </td>
                        <td className="p-3 font-bold">
                          {w.sealIntact === true ? (
                            <span className="text-emerald-700">Matched</span>
                          ) : w.sealIntact === false ? (
                            <span className="text-rose-600">Did not match</span>
                          ) : !isUnloaded ? (
                            <span className="text-slate-400">\u2014</span>
                          ) : (
                            <span className="text-amber-700">Not checked</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-800">{recorded(trip.cargoType)}</td>
                        <td className="p-3 font-bold text-slate-900">{bags ? bags.toLocaleString() : '—'}</td>
                        {/* Tare is a property of the individual wagon, not a
                            constant 22.5 T for every vehicle on the network. */}
                        <td className="p-3 text-slate-500">{tareT !== null ? `${tareT} T` : '—'}</td>
                        <td className="p-3 font-black text-slate-900">
                          {grossT !== null ? `${grossT.toFixed(1)} T` : '—'}
                        </td>
                        <td className="p-3 font-extrabold">
                          {!isUnloaded ? (
                            <span className="text-slate-400">Not yet discharged</span>
                          ) : defects > 0 ? (
                            <span className="text-rose-600">{defects} defect(s) logged</span>
                          ) : (
                            <span className="text-emerald-700">Discharged intact</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Weight & Tonnage Totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Total Wagons</span>
              <span className="text-base font-black text-white">{totalWagons} Units</span>
            </div>
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Total Bags Loaded</span>
              <span className="text-base font-black text-slate-600">{actualLoadedBags.toLocaleString()} Bags</span>
            </div>
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Net Freight Tonnage</span>
              <span className="text-base font-black text-blue-400">{netWeightTonnes.toLocaleString()} Tonnes</span>
            </div>
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800">
              <span className="block text-[9px] uppercase text-slate-400 font-bold">Gross Train Weight</span>
              <span className="text-base font-black text-amber-400">{grossTrainWeightTonnes.toLocaleString()} Tonnes</span>
            </div>
          </div>

          {/* Mandatory Executive Signatories */}
          <div className="pt-4 border-t-2 border-slate-900 space-y-3 font-mono text-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">OFFICIAL AUTHORIZATION SIGNATORIES</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase text-slate-500 block font-bold">ORIGIN TERMINAL SUPERVISOR</span>
                <p className="font-black text-slate-900 mt-0.5">{escortName}</p>
                <p className="text-[9px] text-slate-400">Bueno Logistics Freight Siding</p>
                <div className="mt-3 pt-1 border-t border-slate-300 text-[9px] text-slate-400">Signature: __________________</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase text-slate-500 block font-bold">NRC LEAD TRAIN ENGINEER</span>
                <p className="font-black text-slate-900 mt-0.5">{driverName}</p>
                <p className="text-[9px] text-slate-400">Nigerian Railway Corporation</p>
                <div className="mt-3 pt-1 border-t border-slate-300 text-[9px] text-slate-400">Signature: __________________</div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase text-slate-500 block font-bold">DESTINATION UNLOADING OFFICER</span>
                <p className="font-black text-slate-900 mt-0.5">{destOfficer}</p>
                <p className="text-[9px] text-slate-400">Moniya Container Terminal</p>
                <div className="mt-3 pt-1 border-t border-slate-300 text-[9px] text-slate-400">Signature: __________________</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
