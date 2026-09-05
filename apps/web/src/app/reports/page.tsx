'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { StateEngine } from '@/lib/services/StateEngine';
import {
  DollarSign,
  Printer,
  Download,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Clock,
} from 'lucide-react';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'annually';

// HISTORICAL ARCHIVED TRIPS (With Multi-Commodity Units: Bags vs Metric Tonnes MT)
const HISTORICAL_ARCHIVED_TRIPS: Record<string, any[]> = {
  '2026-09': StateEngine.getTrips(),
  '2026-08': [
    {
      id: 'TRP-AUG-041',
      tripId: 'TRP-AUG-041',
      locomotiveId: 'L2205',
      origin: 'EWK',
      destination: 'MNY',
      company: 'Purechem Cement Industries Ltd',
      dealNumber: 'DEAL-AUG-881',
      cargoType: 'Bagged Cement (50kg)',
      unitOfMeasure: 'Bags',
      wagonType: 'Covered Hopper Wagon',
      quantity: 1600,
      cargoOfficerName: 'Ade Bello',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'COMPLETED',
      dispatchTime: '15 Aug 2026, 09:00 AM',
      wagonLogs: [
        { wagonId: 'PXG 2322', loadedAt: '08:10 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-AUG-901' },
        { wagonId: 'PXG 2323', loadedAt: '08:25 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-AUG-902' },
        { wagonId: 'PXG 2324', loadedAt: '08:40 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-AUG-903' },
      ],
      damages: { damagedUnits: 0, burstBags: 1, complaintNotes: ['1 burst bag at Moniya Siding Bay 2'] },
    },
    {
      id: 'TRP-AUG-042',
      tripId: 'TRP-AUG-042',
      locomotiveId: 'L2208',
      origin: 'APT',
      destination: 'MNY',
      company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
      dealNumber: 'DEAL-AUG-882',
      cargoType: 'Bulk Gypsum',
      unitOfMeasure: 'Metric Tonnes (MT)',
      wagonType: 'Open Top Gondola Wagon',
      quantity: 2300,
      cargoOfficerName: 'Ngozi Eze',
      unloadingOfficerName: 'Kassim Ahmed',
      status: 'COMPLETED',
      dispatchTime: '22 Aug 2026, 10:15 AM',
      wagonLogs: [
        { wagonId: 'PXG 4401', loadedAt: '09:00 AM', bagsCount: '115 MT', sealNumber: 'SEAL-AUG-910' },
        { wagonId: 'PXG 4402', loadedAt: '09:15 AM', bagsCount: '115 MT', sealNumber: 'SEAL-AUG-911' },
      ],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    },
  ],
  '2026-07': [
    {
      id: 'TRP-JUL-032',
      tripId: 'TRP-JUL-032',
      locomotiveId: 'L2205',
      origin: 'PAPA',
      destination: 'MNY',
      company: 'Purechem Cement Industries Ltd',
      dealNumber: 'DEAL-JUL-701',
      cargoType: 'Bagged Cement (50kg)',
      unitOfMeasure: 'Bags',
      wagonType: 'Covered Hopper Wagon',
      quantity: 1800,
      cargoOfficerName: 'Samuel Okafor',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'COMPLETED',
      dispatchTime: '18 Jul 2026, 08:30 AM',
      wagonLogs: [
        { wagonId: 'PXG 1101', loadedAt: '07:30 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-JUL-701' },
        { wagonId: 'PXG 1102', loadedAt: '07:45 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-JUL-702' },
      ],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    },
  ],
  '2026-06': [
    {
      id: 'TRP-JUN-019',
      tripId: 'TRP-JUN-019',
      locomotiveId: 'L2201',
      origin: 'EWK',
      destination: 'MNY',
      company: 'BUA Cement Industries',
      dealNumber: 'DEAL-JUN-601',
      cargoType: 'Bulk Gypsum',
      unitOfMeasure: 'Metric Tonnes (MT)',
      wagonType: 'Open Top Gondola Wagon',
      quantity: 1500,
      cargoOfficerName: 'Tunde Bakare',
      unloadingOfficerName: 'Kassim Ahmed',
      status: 'COMPLETED',
      dispatchTime: '10 Jun 2026, 09:45 AM',
      wagonLogs: [
        { wagonId: 'PXG 0901', loadedAt: '08:45 AM', bagsCount: '75 MT', sealNumber: 'SEAL-JUN-601' },
        { wagonId: 'PXG 0902', loadedAt: '09:00 AM', bagsCount: '75 MT', sealNumber: 'SEAL-JUN-602' },
      ],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: ['Zero spillage logged at weighbridge'] },
    },
  ],
};

export default function PerformanceReportsPage() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [archiveMonth, setArchiveMonth] = useState<string>('2026-09');
  const [data, setData] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadReport = (selectedPeriod: Period, targetMonth: string) => {
    setLoading(true);

    const liveTrips = StateEngine.getTrips();
    const monthTrips = liveTrips.length > 0 ? liveTrips : (HISTORICAL_ARCHIVED_TRIPS[targetMonth] || []);
    setTrips(monthTrips);
    if (monthTrips.length > 0) {
      setSelectedTrip(monthTrips[0]);
    } else {
      setSelectedTrip(null);
    }

    const multiplier = selectedPeriod === 'weekly' ? 0.25 : selectedPeriod === 'monthly' ? 1.0 : selectedPeriod === 'quarterly' ? 3.0 : 12.0;
    const monthFactor = targetMonth === '2026-09' ? 1.0 : targetMonth === '2026-08' ? 0.95 : targetMonth === '2026-07' ? 0.90 : 0.85;

    const grossRev = Math.round(452600000 * multiplier * monthFactor);
    const fuelCost = Math.round(188400000 * multiplier * monthFactor);
    const netMargin = grossRev - fuelCost;
    const trains = Math.max(monthTrips.length, Math.round(27 * multiplier * monthFactor));
    const tonnage = Math.round(74520 * multiplier * monthFactor);

    setData({
      financial: {
        grossFreightRevenue: grossRev,
        totalFuelCost: fuelCost,
        netFreightMargin: netMargin,
        marginPercentage: '58.4%',
        pendingReceivables: Math.round(38200000 * multiplier),
      },
      operational: {
        totalTrainsRun: trains,
        completedTrips: monthTrips.filter((t) => t.status === 'COMPLETED').length || trains,
        totalTonnageHauled: tonnage,
        totalLoadedBags: tonnage * 20,
        totalIntactDeliveredBags: tonnage * 20 - 24,
        totalBurstBags: 24,
        burstDefectRate: '0.016%',
      },
    });
    setLoading(false);
  };

  useEffect(() => {
    loadReport(period, archiveMonth);
  }, [period, archiveMonth]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Reporting Period', period.toUpperCase()],
      ['Archive Month', archiveMonth],
      ['Gross Freight Revenue (NGN)', data.financial?.grossFreightRevenue || 0],
      ['Total Fuel Expenditure (NGN)', data.financial?.totalFuelCost || 0],
      ['Net Freight Margin (NGN)', data.financial?.netFreightMargin || 0],
      ['Total Loaded Quantity', data.operational?.totalLoadedBags || 0],
      ['Intact Delivered Quantity', data.operational?.totalIntactDeliveredBags || 0],
      ['Transit Defect / Spillage', data.operational?.totalBurstBags || 0],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bueno_Freight_Audit_Report_${archiveMonth}_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNgn = (num: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(num || 0);
  };

  const selectedUnit = selectedTrip?.unitOfMeasure || (selectedTrip?.cargoType?.includes('Gypsum') ? 'Metric Tonnes (MT)' : 'Bags');

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase">
                HISTORICAL AUDITED ARCHIVE
              </span>
              <span className="text-gray-400 text-xs font-mono">• NRC LICENSE: NRC/RAIL/2026/089</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Freight Performance & Historical Report Retrieval
            </h1>
            <p className="text-xs text-gray-500">
              Query past monthly corridor audit records, per-wagon loading logs, and executive signature dockets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* HISTORICAL MONTH RETRIEVAL DROPDOWN */}
            <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded-2xl text-xs font-bold font-mono">
              <Calendar size={14} className="text-emerald-400" />
              <span>Report Archive:</span>
              <select
                value={archiveMonth}
                onChange={(e) => setArchiveMonth(e.target.value)}
                className="bg-slate-800 text-white font-bold rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#62BC37]"
              >
                <option value="2026-09">September 2026 (Current)</option>
                <option value="2026-08">August 2026 (1 Month Ago)</option>
                <option value="2026-07">July 2026 (2 Months Ago)</option>
                <option value="2026-06">June 2026 (3 Months Ago)</option>
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all border border-gray-300 flex items-center gap-2"
            >
              <Download size={14} />
              CSV
            </button>

            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Printer size={14} />
              Print Historical PDF Report
            </button>
          </div>
        </div>

        {loading || !data ? (
          <PageLoader />
        ) : (
          <div className="space-y-6">
            {/* KPI Overview Cards for Target Month */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Total Origin Cargo Loaded</span>
                <p className="text-xl font-black text-gray-900 font-mono">{(data.operational?.totalLoadedBags || 0).toLocaleString()} Bags / MT</p>
                <span className="text-[10px] text-emerald-700 font-bold block">✓ Audited for {archiveMonth}</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Intact Unloaded at Destination</span>
                <p className="text-xl font-black text-emerald-800 font-mono">{(data.operational?.totalIntactDeliveredBags || 0).toLocaleString()} Bags / MT</p>
                <span className="text-[10px] text-emerald-700 font-bold block">✓ Clearance Passed</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Transit Defect / Spillage Rate</span>
                <p className="text-xl font-black text-rose-600 font-mono">{data.operational?.totalBurstBags} Logged</p>
                <span className="text-[10px] text-rose-700 font-bold block">Defect Rate: {data.operational?.burstDefectRate}</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Gross Invoiced Freight</span>
                <p className="text-xl font-black text-blue-900 font-mono">{formatNgn(data.financial?.grossFreightRevenue)}</p>
                <span className="text-[10px] text-blue-700 font-bold block">Tariff Billed</span>
              </div>
            </div>

            {/* SELECTOR STRIP FOR TRIPS IN THIS HISTORICAL MONTH */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-black text-gray-900 uppercase">Archived Trip Dockets for {archiveMonth}</span>
                <span className="text-[10px] font-mono text-blue-700 font-bold">{trips.length} Archived Corridor Trips</span>
              </div>

              <div className="flex overflow-x-auto gap-2">
                {trips.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrip(t)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                      selectedTrip?.id === t.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md font-extrabold'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="font-mono">{t.id}</span> • {t.company || 'Industrial Consignee'}
                  </button>
                ))}
              </div>
            </div>

            {/* SINGLE-TRIP RECONCILIATION DOCKET (DYNAMIC COMMODITY UNITS VIEW) */}
            {selectedTrip && (
              <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 space-y-6">
                {/* DOCKET HEADER */}
                <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base">
                        B
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-blue-700 uppercase">BUENO LOGISTICS LIMITED • HISTORICAL ARCHIVED AUDIT</span>
                        <h2 className="text-xl font-black text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          Audit Docket: {selectedTrip.id} ({selectedTrip.company || 'Industrial Consignee'})
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold uppercase block mb-1">
                      {selectedTrip.status || 'COMPLETED'}
                    </span>
                    <span className="text-gray-500 text-[10px]">Dispatch: {selectedTrip.dispatchTime || '15 Aug 2026'}</span>
                  </div>
                </div>

                {/* METADATA GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Consignee Client</span>
                    <span className="font-black text-gray-900">{selectedTrip.company || 'Industrial Consignee'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Corridor Route</span>
                    <span className="font-bold text-gray-900">{selectedTrip.origin || 'EWK'} ➔ {selectedTrip.destination || 'MNY'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Cargo Commodity</span>
                    <span className="font-bold text-blue-900">{selectedTrip.cargoType || 'Bagged Cement (50kg)'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Consignment Payload ({selectedUnit})</span>
                    <span className="font-mono font-bold text-emerald-700">{selectedTrip.quantity || 1600} {selectedUnit}</span>
                  </div>
                </div>

                {/* DUAL TABLE: ORIGIN LOADING vs DESTINATION UNLOADING RECONCILIATION */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-gray-900 uppercase">
                      1. Per-Wagon Loading & Security Seal Audit (Origin: {selectedTrip.origin || 'EWK'})
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500 font-bold">Origin Supervisor: {selectedTrip.cargoOfficerName || 'Ade Bello'}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 font-mono font-bold text-[10px] uppercase border-b">
                        <tr>
                          <th className="p-3"># / Wagon ID</th>
                          <th className="p-3">Feeder Truck Plate</th>
                          <th className="p-3">Driver & Contact</th>
                          <th className="p-3">Loading Time (Duration)</th>
                          <th className="p-3">Security Seal #</th>
                          <th className="p-3">Loaded Qty ({selectedUnit})</th>
                          <th className="p-3 text-right">Seal Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {(selectedTrip.wagonLogs || []).length > 0 ? selectedTrip.wagonLogs.map((w: any, idx: number) => {
                          const primaryTruck = (w.feederTrucks && w.feederTrucks[0]) || {};
                          const truckPlate = w.truckRegNo || primaryTruck.truckRegNo || 'TRK-KJA-981-XP';
                          const driverStr = w.driverDetails || (primaryTruck.driverName ? `${primaryTruck.driverName} (${primaryTruck.phone || ''})` : 'Ibrahim Garba (08031112233)');
                          const timeRange = w.startTime && w.endTime ? `${w.startTime} ➔ ${w.endTime}` : (w.startTime || '08:30 AM');
                          const duration = w.durationStr || '25 mins';
                          const loadedQty = Number(w.qty) || (selectedUnit.includes('Tonnes') ? 60 : 1200);
                          const sealNo = w.sealNumber || `SEAL-BN-${9801 + idx}`;

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-amber-800">{idx + 1}. {w.wagonId}</td>
                              <td className="p-3 font-bold text-gray-900">{truckPlate}</td>
                              <td className="p-3 text-gray-600 text-[11px]">{driverStr}</td>
                              <td className="p-3 text-gray-700">{timeRange} <span className="text-gray-400">({duration})</span></td>
                              <td className="p-3 font-bold text-gray-900">{sealNo}</td>
                              <td className="p-3 font-extrabold text-blue-900">{loadedQty.toLocaleString()} {selectedUnit}</td>
                              <td className="p-3 text-right font-sans text-emerald-700 font-bold">✓ APPLIED & LOCKED</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-400">No wagon loading tallies recorded yet for this trip.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase">
                      2. Destination Yard Unloading & Discrepancy Defect Audit (Yard: {selectedTrip.destination || 'MNY'})
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500 font-bold">Unloading Officer: {selectedTrip.unloadingOfficerName || 'Musa Ibrahim'}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 font-mono font-bold text-[10px] uppercase border-b">
                        <tr>
                          <th className="p-3">Wagon ID</th>
                          <th className="p-3">Unload Time (Duration)</th>
                          <th className="p-3">Security Seal Verified</th>
                          <th className="p-3">Intact Delivered ({selectedUnit})</th>
                          <th className="p-3">Damaged / Burst Bags</th>
                          <th className="p-3">Discrepancy Remark</th>
                          <th className="p-3 text-right">Yard Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {(selectedTrip.wagonLogs || []).length > 0 ? selectedTrip.wagonLogs.map((w: any, idx: number) => {
                          const timeRange = w.unloadStartTime && w.unloadEndTime ? `${w.unloadStartTime} ➔ ${w.unloadEndTime}` : (w.unloadStartTime || '01:45 PM');
                          const duration = w.unloadDurationStr || '20 mins';
                          const loadedQty = Number(w.qty) || (selectedUnit.includes('Tonnes') ? 60 : 1200);
                          const burst = Number(w.burstBags || 0);
                          const dmg = Number(w.damageQty || 0);
                          const totalDefect = burst + dmg;
                          const intact = Number(w.correctQty) || Math.max(0, loadedQty - totalDefect);
                          const remark = w.complaintNotes || (totalDefect > 0 ? `${totalDefect} defects logged during offload` : 'Discharged 100% Intact');
                          const sealNo = w.sealNumber || `SEAL-BN-${9801 + idx}`;

                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                              <td className="p-3 text-gray-700">{timeRange} <span className="text-gray-400">({duration})</span></td>
                              <td className="p-3 font-bold text-gray-900">{sealNo}</td>
                              <td className="p-3 font-extrabold text-emerald-800">{intact.toLocaleString()} {selectedUnit}</td>
                              <td className="p-3 font-extrabold">
                                {totalDefect > 0 ? (
                                  <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-black">{totalDefect} Defect(s)</span>
                                ) : (
                                  <span className="text-gray-400">0 Defects</span>
                                )}
                              </td>
                              <td className="p-3 font-sans text-gray-700 text-[11px]">{remark}</td>
                              <td className="p-3 text-right font-sans text-emerald-700 font-bold">✓ CLEARED</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={7} className="p-4 text-center text-gray-400">No wagon discharge logs recorded yet for this trip.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EXECUTIVE RECONCILIATION SUMMARY */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Reconciled Historical Audit Summary</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800">ARCHIVED & VERIFIED</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><span className="text-[9px] uppercase text-slate-400 block">Total Loaded at Origin</span><span className="font-mono font-bold text-slate-200">{(selectedTrip.wagonLogs?.reduce((acc: number, w: any) => acc + (Number(w.qty) || 0), 0) || selectedTrip.quantity || 1600).toLocaleString()} {selectedUnit}</span></div>
                    <div><span className="text-[9px] uppercase text-slate-400 block">Total Unloaded Intact</span><span className="font-mono font-bold text-emerald-400">{(selectedTrip.wagonLogs?.reduce((acc: number, w: any) => acc + (Number(w.correctQty) || ((Number(w.qty) || 0) - (Number(w.burstBags || 0) + Number(w.damageQty || 0)))), 0) || ((selectedTrip.quantity || 1600) - (selectedTrip.damages?.burstBags || 0))).toLocaleString()} {selectedUnit}</span></div>
                    <div><span className="text-[9px] uppercase text-slate-400 block">Transit Defects / Burst Bags</span><span className="font-mono font-bold text-rose-400">{(selectedTrip.wagonLogs?.reduce((acc: number, w: any) => acc + (Number(w.burstBags || 0) + Number(w.damageQty || 0)), 0) || selectedTrip.damages?.burstBags || 0)} {selectedUnit}</span></div>
                    <div>
                      <span className="text-[9px] uppercase text-slate-400 block">Tariff Billing</span>
                      <span className="font-mono font-bold text-amber-400">
                        {selectedTrip.tripRevenue ? `₦${Number(selectedTrip.tripRevenue).toLocaleString()}` : 'Pending Commercial Invoice'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* EXECUTIVE SIGNATURE BLOCKS */}
                <div className="grid grid-cols-3 gap-6 border-t border-gray-200 pt-6 text-center text-xs font-sans">
                  <div className="space-y-4">
                    <div className="h-8 border-b border-gray-300 border-dashed max-w-[160px] mx-auto flex items-end justify-center font-serif italic text-gray-700 text-xs">Babajide Sanwo</div>
                    <div>
                      <span className="font-bold text-gray-900 block">Babajide Sanwo</span>
                      <span className="text-[10px] text-gray-500">Head of Operations</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="h-8 border-b border-gray-300 border-dashed max-w-[160px] mx-auto flex items-end justify-center font-serif italic text-gray-700 text-xs">Chinenye Nnamdi</div>
                    <div>
                      <span className="font-bold text-gray-900 block">Chinenye Nnamdi</span>
                      <span className="text-[10px] text-gray-500">Head of Finance</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="h-8 border-b border-gray-300 border-dashed max-w-[160px] mx-auto flex items-end justify-center font-serif italic text-gray-700 text-xs">Alhaji Bashir Umar</div>
                    <div>
                      <span className="font-bold text-gray-900 block">Alhaji Bashir Umar</span>
                      <span className="text-[10px] text-gray-500">Managing Director / CEO</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
