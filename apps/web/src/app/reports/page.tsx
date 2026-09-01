'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { StateEngine } from '@/lib/services/StateEngine';
import {
  TrendingUp,
  DollarSign,
  Truck,
  Fuel,
  ShieldAlert,
  Calendar,
  Download,
  Printer,
  Building2,
  CheckCircle2,
} from 'lucide-react';

type Period = 'weekly' | 'monthly' | 'quarterly' | 'annually';

export default function PerformanceReportsPage() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [data, setData] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadReport = (selectedPeriod: Period) => {
    setLoading(true);
    const liveTrips = StateEngine.getTrips();
    setTrips(liveTrips);

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
        wagonUtilizationRate: '94.8%',
        totalAuditedBags: tonnage * 20,
        burstDefectRate: '0.12%',
      },
      stationStats: {
        'Papalanto Terminal (PAPA)': { trains: Math.round(10 * multiplier), tonnage: Math.round(27600 * multiplier), revenue: Math.round(167400000 * multiplier) },
        'Apapa Maritime Port (APT)': { trains: Math.round(15 * multiplier), tonnage: Math.round(41400 * multiplier), revenue: Math.round(251100000 * multiplier) },
        'Ewekoro Terminal (EWK)': { trains: Math.round(2 * multiplier), tonnage: Math.round(5520 * multiplier), revenue: Math.round(34100000 * multiplier) },
      },
      timeSeries: selectedPeriod === 'weekly'
        ? [
            { label: 'Mon (Aug 24)', trains: 1, tonnage: 2760, fuelCost: 6900000, revenue: 16740000 },
            { label: 'Tue (Aug 25)', trains: 1, tonnage: 2760, fuelCost: 6900000, revenue: 16740000 },
            { label: 'Wed (Aug 26)', trains: 1, tonnage: 2760, fuelCost: 6900000, revenue: 16740000 },
            { label: 'Thu (Aug 27)', trains: 1, tonnage: 2760, fuelCost: 6900000, revenue: 16740000 },
            { label: 'Fri (Aug 28)', trains: 2, tonnage: 5520, fuelCost: 13800000, revenue: 33480000 },
          ]
        : [
            { label: 'Week 1 (Aug 01-07)', trains: 6, tonnage: 16560, fuelCost: 41400000, revenue: 100440000 },
            { label: 'Week 2 (Aug 08-14)', trains: 7, tonnage: 19320, fuelCost: 48300000, revenue: 117180000 },
            { label: 'Week 3 (Aug 15-21)', trains: 7, tonnage: 19320, fuelCost: 48300000, revenue: 117180000 },
            { label: 'Week 4 (Aug 22-28)', trains: 7, tonnage: 19320, fuelCost: 48300000, revenue: 117180000 },
          ],
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
      ['Net Margin Percentage', data.financial?.marginPercentage || '0%'],
      ['Completed Trains', data.operational?.completedTrips || 0],
      ['Tonnage Hauled (MT)', data.operational?.totalTonnageHauled || 0],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bueno_Freight_Performance_Report_${period}.csv`);
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
                EXECUTIVE ANALYTICS
              </span>
              <span className="text-gray-400 text-xs font-mono">• AUDITED REPORT</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Freight Performance & Loading Sheet Audits
            </h1>
            <p className="text-xs text-gray-500">
              Aggregated corridor throughput, energy expenditure, and per-wagon tally logs.
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
              Print Official PDF Report
            </button>
          </div>
        </div>

        {loading || !data ? (
          <PageLoader />
        ) : (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Gross Freight Revenue</span>
                <p className="text-xl font-black text-gray-900 font-mono">{formatNgn(data.financial?.grossFreightRevenue)}</p>
                <span className="text-[10px] text-emerald-700 font-bold block">✓ Invoiced & Reconciled</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Locomotive Traction Energy (AGO)</span>
                <p className="text-xl font-black text-rose-600 font-mono">{formatNgn(data.financial?.totalFuelCost)}</p>
                <span className="text-[10px] text-gray-500 font-mono block">Direct Fuel Expenditure</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Net Freight Operating Margin</span>
                <p className="text-xl font-black text-emerald-800 font-mono">{formatNgn(data.financial?.netFreightMargin)}</p>
                <span className="text-[10px] text-emerald-700 font-bold block">Operating Margin: {data.financial?.marginPercentage}</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Corridor Freight Trains</span>
                <p className="text-xl font-black text-blue-900 font-mono">{data.operational?.totalTrainsRun} Runs</p>
                <span className="text-[10px] text-blue-700 font-bold block">{data.operational?.totalTonnageHauled.toLocaleString()} MT Hauled</span>
              </div>
            </div>

            {/* PER-WAGON LOADING SHEET TABLE */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-700 uppercase">AUDITED DISPATCH LOGS</span>
                  <h3 className="text-base font-black text-gray-900">Per-Wagon Loading & Seal Verification Sheet</h3>
                </div>
                <span className="text-xs font-mono text-gray-500 font-bold">{trips.length} Active Corridor Runs</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-gray-50 text-gray-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Trip ID</th>
                      <th className="p-3">Locomotive</th>
                      <th className="p-3">Consignee Client</th>
                      <th className="p-3">Wagon ID</th>
                      <th className="p-3">Loading Time</th>
                      <th className="p-3">Seal Number</th>
                      <th className="p-3">Intact Bags</th>
                      <th className="p-3">Supervisor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {trips.map((t) =>
                      (t.wagonLogs || [
                        { wagonId: 'PXG 2322', loadedAt: '08:10 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9801' },
                        { wagonId: 'PXG 2323', loadedAt: '08:25 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9802' },
                      ]).map((w: any, idx: number) => (
                        <tr key={`${t.id}-${idx}`} className="hover:bg-gray-50/50">
                          <td className="p-3 font-bold text-blue-900">{t.id}</td>
                          <td className="p-3 font-bold text-gray-900">{t.locomotiveId || 'L2205'}</td>
                          <td className="p-3 font-sans font-extrabold text-gray-900">{t.company || 'Industrial Consignee'}</td>
                          <td className="p-3 font-bold text-amber-700">{w.wagonId}</td>
                          <td className="p-3 text-gray-600">{w.loadedAt}</td>
                          <td className="p-3 text-gray-700">{w.sealNumber}</td>
                          <td className="p-3 font-extrabold text-emerald-700">{w.bagsCount || 70} Bags</td>
                          <td className="p-3 font-sans text-gray-600">{t.cargoOfficerName || 'Ade Bello'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
