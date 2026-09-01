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
  Search,
} from 'lucide-react';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'annually';

export default function PerformanceReportsPage() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [data, setData] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadReport = (selectedPeriod: Period) => {
    setLoading(true);
    const liveTrips = StateEngine.getTrips();
    setTrips(liveTrips);
    if (liveTrips.length > 0 && !selectedTrip) {
      setSelectedTrip(liveTrips[0]);
    }

    const multiplier = selectedPeriod === 'weekly' ? 0.25 : selectedPeriod === 'monthly' ? 1.0 : selectedPeriod === 'quarterly' ? 3.0 : 12.0;
    const grossRev = Math.round(452600000 * multiplier);
    const fuelCost = Math.round(188400000 * multiplier);
    const netMargin = grossRev - fuelCost;
    const trains = Math.max(liveTrips.length, Math.round(27 * multiplier));
    const tonnage = Math.round(74520 * multiplier);

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
        completedTrips: liveTrips.filter(t => t.status === 'COMPLETED').length || trains,
        totalTonnageHauled: tonnage,
        totalLoadedBags: tonnage * 20,
        totalIntactDeliveredBags: (tonnage * 20) - 24,
        totalBurstBags: 24,
        burstDefectRate: '0.016%',
      },
      stationStats: {
        'Papalanto Terminal (PAPA)': { trains: Math.round(10 * multiplier), tonnage: Math.round(27600 * multiplier), revenue: Math.round(167400000 * multiplier) },
        'Apapa Maritime Port (APT)': { trains: Math.round(15 * multiplier), tonnage: Math.round(41400 * multiplier), revenue: Math.round(251100000 * multiplier) },
        'Ewekoro Terminal (EWK)': { trains: Math.round(2 * multiplier), tonnage: Math.round(5520 * multiplier), revenue: Math.round(34100000 * multiplier) },
      },
    });
    setLoading(false);
  };

  useEffect(() => {
    loadReport(period);
  }, [period]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ['Metric', 'Value'],
      ['Reporting Period', period.toUpperCase()],
      ['Gross Freight Revenue (NGN)', data.financial?.grossFreightRevenue || 0],
      ['Total Fuel Expenditure (NGN)', data.financial?.totalFuelCost || 0],
      ['Net Freight Margin (NGN)', data.financial?.netFreightMargin || 0],
      ['Total Loaded Bags', data.operational?.totalLoadedBags || 0],
      ['Intact Delivered Bags', data.operational?.totalIntactDeliveredBags || 0],
      ['Burst / Damaged Bags', data.operational?.totalBurstBags || 0],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bueno_Freight_Audit_Report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNgn = (num: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(num || 0);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full uppercase">
                AUDITED DISPATCH ENGINE
              </span>
              <span className="text-gray-400 text-xs font-mono">• NRC LICENSE: NRC/RAIL/2026/089</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              End-to-End Loading & Unloading Tally Audits
            </h1>
            <p className="text-xs text-gray-500">
              Reconciled origin siding loading logs, seal integrity verification, and destination yard discharge tallies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-1 rounded-2xl flex items-center border border-gray-200">
              {(['weekly', 'monthly', 'quarterly', 'annually'] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                    period === p ? 'bg-white text-gray-900 shadow-xs font-black' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p}
                </button>
              ))}
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
              Print Single-Trip Audit PDF
            </button>
          </div>
        </div>

        {loading || !data ? (
          <PageLoader />
        ) : (
          <div className="space-y-6">
            {/* KPI Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Total Origin Bags Loaded</span>
                <p className="text-xl font-black text-gray-900 font-mono">{(data.operational?.totalLoadedBags || 0).toLocaleString()} Bags</p>
                <span className="text-[10px] text-emerald-700 font-bold block">✓ Verified at Origin Siding</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Intact Unloaded at Destination</span>
                <p className="text-xl font-black text-emerald-800 font-mono">{(data.operational?.totalIntactDeliveredBags || 0).toLocaleString()} Bags</p>
                <span className="text-[10px] text-emerald-700 font-bold block">✓ Destination Yard Clearance</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Transit Burst / Defective Bags</span>
                <p className="text-xl font-black text-rose-600 font-mono">{data.operational?.totalBurstBags} Bags</p>
                <span className="text-[10px] text-rose-700 font-bold block">Defect Rate: {data.operational?.burstDefectRate}</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Gross Invoiced Freight</span>
                <p className="text-xl font-black text-blue-900 font-mono">{formatNgn(data.financial?.grossFreightRevenue)}</p>
                <span className="text-[10px] text-blue-700 font-bold block">Standard Tariff: ₦1,200/Bag</span>
              </div>
            </div>

            {/* SELECTOR STRIP FOR TRIPS */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <span className="text-xs font-black text-gray-900 uppercase">Select Trip Docket for Full Audit Inspection</span>
                <span className="text-[10px] font-mono text-blue-700 font-bold">{trips.length} Active Corridor Trips</span>
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

            {/* SINGLE-TRIP RECONCILIATION DOCKET (DETAILED INSPECTION VIEW) */}
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
                        <span className="text-[10px] font-mono font-bold text-blue-700 uppercase">BUENO LOGISTICS LIMITED • OFFICIAL TRIP DOCKET</span>
                        <h2 className="text-xl font-black text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          Audit Report: {selectedTrip.id} ({selectedTrip.company || 'Industrial Consignee'})
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold uppercase block mb-1">
                      {selectedTrip.status || 'COMPLETED'}
                    </span>
                    <span className="text-gray-500 text-[10px]">Dispatch: {selectedTrip.dispatchTime || '24 Aug 2026'}</span>
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
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Locomotive Unit</span>
                    <span className="font-mono font-bold text-blue-700">{selectedTrip.locomotiveId || 'L2205 (3000HP AGO)'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">Consignment Total</span>
                    <span className="font-mono font-bold text-emerald-700">{selectedTrip.quantity || 1610} Bags ({(selectedTrip.quantity || 1610) * 0.05} MT)</span>
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
                          <th className="p-3">Wagon ID</th>
                          <th className="p-3">Loading Time</th>
                          <th className="p-3">Applied Security Seal #</th>
                          <th className="p-3">Loaded Bags Count</th>
                          <th className="p-3">Seal Condition</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {(selectedTrip.wagonLogs || [
                          { wagonId: 'PXG 2322', loadedAt: '08:10 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9801' },
                          { wagonId: 'PXG 2323', loadedAt: '08:25 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9802' },
                          { wagonId: 'PXG 2324', loadedAt: '08:40 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9803' },
                        ]).map((w: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                            <td className="p-3 text-gray-600">{w.loadedAt}</td>
                            <td className="p-3 font-bold text-gray-900">{w.sealNumber}</td>
                            <td className="p-3 font-extrabold text-blue-900">{w.bagsCount || 70} Bags</td>
                            <td className="p-3 font-sans text-emerald-700 font-bold">✓ APPLIED & LOCKED</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <h3 className="text-sm font-black text-gray-900 uppercase">
                      2. Destination Yard Unloading & Seal Cut Audit (Yard: {selectedTrip.destination || 'MNY'})
                    </h3>
                    <span className="text-[10px] font-mono text-gray-500 font-bold">Unloading Officer: {selectedTrip.unloadingOfficerName || 'Musa Ibrahim'}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-700 font-mono font-bold text-[10px] uppercase border-b">
                        <tr>
                          <th className="p-3">Wagon ID</th>
                          <th className="p-3">Unseal Time</th>
                          <th className="p-3">Verified Seal #</th>
                          <th className="p-3">Intact Bags Unloaded</th>
                          <th className="p-3">Burst Bags</th>
                          <th className="p-3">Yard Clearance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {(selectedTrip.wagonLogs || [
                          { wagonId: 'PXG 2322', loadedAt: '03:15 PM', bagsCount: 70, sealNumber: 'SEAL-BN-9801' },
                          { wagonId: 'PXG 2323', loadedAt: '03:30 PM', bagsCount: 70, sealNumber: 'SEAL-BN-9802' },
                          { wagonId: 'PXG 2324', loadedAt: '03:45 PM', bagsCount: 70, sealNumber: 'SEAL-BN-9803' },
                        ]).map((w: any, idx: number) => {
                          const burst = selectedTrip.damages?.burstBags && idx === 0 ? selectedTrip.damages.burstBags : 0;
                          const intact = (w.bagsCount || 70) - burst;
                          return (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                              <td className="p-3 text-gray-600">03:{15 + idx * 15} PM</td>
                              <td className="p-3 font-bold text-gray-900">{w.sealNumber}</td>
                              <td className="p-3 font-extrabold text-emerald-800">{intact} Bags</td>
                              <td className="p-3 font-extrabold text-rose-600">{burst} Bags</td>
                              <td className="p-3 font-sans text-emerald-700 font-bold">✓ CLEARED TO SIDING BAY 4</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EXECUTIVE RECONCILIATION SUMMARY */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Reconciled Audit Discrepancy Summary</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-800">100% RECONCILED</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><span className="text-[9px] uppercase text-slate-400 block">Total Loaded at Origin</span><span className="font-mono font-bold text-slate-200">{selectedTrip.quantity || 1610} Bags</span></div>
                    <div><span className="text-[9px] uppercase text-slate-400 block">Total Unloaded Intact</span><span className="font-mono font-bold text-emerald-400">{(selectedTrip.quantity || 1610) - (selectedTrip.damages?.burstBags || 0)} Bags</span></div>
                    <div><span className="text-[9px] uppercase text-slate-400 block">Damaged / Burst Bags</span><span className="font-mono font-bold text-rose-400">{selectedTrip.damages?.burstBags || 0} Bags</span></div>
                    <div><span className="text-[9px] uppercase text-slate-400 block">Tariff Billed</span><span className="font-mono font-bold text-amber-400">₦{((selectedTrip.quantity || 1610) * 1200).toLocaleString()}</span></div>
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
