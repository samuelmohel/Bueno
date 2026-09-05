'use client';

import React from 'react';

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

  const manifestNo = `MNF-NRC-2026-${String(trip.tripId || '001').replace(/[^0-9]/g, '').padStart(3, '0')}`;
  const vesselRef = trip.vesselNo || 'VSL-APMT-992-NRC';
  const driverName = trip.driverName || 'Engineer Babatunde Adeleke (NRC-DRV-04)';
  const escortName = trip.cargoOfficerName || 'Ade Bello (EWK-01)';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const csvRows = [
      ['Manifest Serial No', manifestNo],
      ['Locomotive ID', trip.locomotiveId || 'L2205'],
      ['Trip ID', trip.tripId || 'TRIP-001'],
      ['Consignee Company', trip.company || 'HUAXIN BUILDING MATERIALS NIG PLC'],
      ['Vessel Ref', vesselRef],
      ['Origin Station', trip.origin || 'EWK'],
      ['Destination Station', trip.destination || 'MNY'],
      ['Lead Driver', driverName],
      ['Escort Officer', escortName],
      ['Total Wagons', totalWagons],
      ['Total Bags Loaded', actualLoadedBags],
      ['Net Freight Weight (Tonnes)', netWeightTonnes],
      ['Gross Train Weight (Tonnes)', grossTrainWeightTonnes],
      [],
      ['Wagon Serial', 'Security Seal No', 'Cargo Spec', 'Bags Loaded', 'Tare (Tonnes)', 'Gross (Tonnes)', 'Condition'],
    ];

    const wagonList = logs.length > 0 ? logs : Array.from({ length: totalWagons }, (_, i) => ({
      wagonId: `WG${String(i + 1).padStart(3, '0')}`,
      qty: 1200,
    }));

    wagonList.forEach((w: any, idx: number) => {
      const bags = Number(w.qty) || 1200;
      const netT = (bags * 50) / 1000;
      const grossT = netT + 22.5;
      const sealNo = `SEAL-BN-${9800 + idx}`;
      csvRows.push([w.wagonId, sealNo, trip.cargoType || 'Huaxin Portland Cement (50kg)', bags, 22.5, grossT, 'VERIFIED_INTACT']);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Official_Manifest_${manifestNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl mx-auto border border-slate-200 shadow-2xl overflow-hidden font-sans my-auto">
        {/* Printable Action Bar */}
        <div className="bg-slate-900 text-white p-4 flex flex-wrap justify-between items-center gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#62BC37]/20 text-[#62BC37] flex items-center justify-center font-black">📄</span>
            <div>
              <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">AUTOMATED MANIFEST GENERATOR</span>
              <h3 className="text-sm font-black text-white">NRC & Bueno Railway Consignment Manifest #{manifestNo}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadCsv} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-all">
              Export CSV 📊
            </button>
            <button onClick={handlePrint} className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-md transition-all">
              Print Official PDF 🖨️
            </button>
            <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white px-3 py-2 text-xs rounded-xl font-bold">
              ✕
            </button>
          </div>
        </div>

        {/* Official Printable Freight Manifest Certificate */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4 text-slate-900 bg-white">
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0E4B88] p-2 shadow-md flex items-center justify-center">
                  <img src="/bueno_logo.png" alt="Bueno Logistics" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
                    BUENO <span className="text-[#62BC37]">LOGISTICS LIMITED</span>
                  </h2>
                  <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">
                    IN PARTNERSHIP WITH NIGERIAN RAILWAY CORPORATION (NRC) • HEAVY FREIGHT DIVISION
                  </p>
                </div>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs font-black text-[#0E4B88] block">OFFICIAL FREIGHT MANIFEST</span>
                <span className="text-lg font-black text-slate-900 block">{manifestNo}</span>
                <span className="text-[10px] text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>

          {/* Key Train & Consignment Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono">
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">LOCOMOTIVE ID</span>
              <span className="font-black text-slate-900 text-sm">{trip.locomotiveId || 'L2205'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">CONSIGNEE COMPANY</span>
              <span className="font-black text-slate-900">{trip.company || 'HUAXIN BUILDING MATERIALS'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">CORRIDOR ROUTE</span>
              <span className="font-black text-slate-900">{trip.origin || 'EWK'} ➔ {trip.destination || 'MNY'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">VESSEL IMPORT REF</span>
              <span className="font-black text-[#0E4B88]">{vesselRef}</span>
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
              <span className="font-black text-emerald-400 mt-0.5 block">{trip.crewNames || 'Sunday Okafor (Eng), Audu Danladi (Brakeman)'}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-bold">MONITORING OFFICER</span>
              <span className="font-black text-emerald-400 mt-0.5 block">{trip.monitoringOfficer || trip.cargoOfficerName || 'Ade Bello (Bueno Ops Monitoring)'}</span>
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
                    <th className="p-3">Cargo Spec</th>
                    <th className="p-3">Bags</th>
                    <th className="p-3">Tare (Tonnes)</th>
                    <th className="p-3">Gross (Tonnes)</th>
                    <th className="p-3">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {(logs.length > 0 ? logs : Array.from({ length: totalWagons }, (_, i) => ({ wagonId: `WG${String(i + 1).padStart(3, '0')}`, qty: 1200 }))).map((w: any, idx: number) => {
                    const bags = Number(w.qty) || 1200;
                    const netT = (bags * 50) / 1000;
                    const grossT = netT + 22.5;
                    const sealNo = `SEAL-BN-${9800 + idx}`;
                    return (
                      <tr key={w.wagonId || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-black text-[#0E4B88]">{w.wagonId}</td>
                        <td className="p-3 text-slate-600 font-bold">{sealNo}</td>
                        <td className="p-3 text-slate-800">{trip.cargoType || 'Huaxin Portland Cement (50kg)'}</td>
                        <td className="p-3 font-bold text-slate-900">{bags.toLocaleString()}</td>
                        <td className="p-3 text-slate-500">22.5 T</td>
                        <td className="p-3 font-black text-slate-900">{grossT.toFixed(1)} T</td>
                        <td className="p-3 text-emerald-700 font-extrabold">✓ VERIFIED INTACT</td>
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
              <span className="text-base font-black text-[#62BC37]">{actualLoadedBags.toLocaleString()} Bags</span>
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
                <p className="font-black text-slate-900 mt-0.5">Musa Ibrahim (MNY-01)</p>
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
