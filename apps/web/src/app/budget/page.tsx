'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { budgetApi } from '@/lib/api';
import {
  Target,
  Award,
  TrendingUp,
  Building,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  Truck,
  UserCheck,
} from 'lucide-react';

export default function BudgetPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [scorecardData, setScorecardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Benchmark Modal State
  const [benchmarkModal, setBenchmarkModal] = useState<boolean>(false);
  const [benchmarkForm, setBenchmarkForm] = useState<{
    year: number;
    month: number;
    stationCode: string;
    targetTrains: string;
    targetTonnage: string;
    targetRevenue: string;
  }>({
    year: 2026,
    month: 8,
    stationCode: 'EWK',
    targetTrains: '25',
    targetTonnage: '30000',
    targetRevenue: '45000000',
  });

  // Assign Officer Target Modal State
  const [officerModal, setOfficerModal] = useState<boolean>(false);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);
  const [officerForm, setOfficerForm] = useState<{
    targetTrains: string;
    stationCode: string;
  }>({
    targetTrains: '15',
    stationCode: 'EWK',
  });

  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [yRes, sRes] = await Promise.all([
        budgetApi.getYearly(selectedYear),
        budgetApi.getOfficerScorecards(selectedYear, selectedMonth),
      ]);
      if (yRes.data && sRes.data) {
        setYearlyData(yRes.data);
        setScorecardData(sRes.data);
        setLoading(false);
        return;
      }
    } catch {
      // Fallback
    }

    setYearlyData({
      year: selectedYear,
      totals: {
        targetTrains: 324,
        actualTrains: 310,
        trainsAchievementPct: 95.7,
        targetTonnage: 894240,
        actualTonnage: 855600,
        tonnageAchievementPct: 95.7,
        targetRevenue: 5413152000,
        actualRevenue: 5179240000,
        revenueAchievementPct: 95.7,
      },
      terminals: {
        EWK: { name: 'Ewekoro Terminal (EWK)', targetTrains: 24, actualTrains: 24, targetTonnage: 66240, actualTonnage: 66240, targetRevenue: 400972800, actualRevenue: 400972800 },
        MNY: { name: 'Moniya Yard (MNY)', targetTrains: 180, actualTrains: 172, targetTonnage: 496800, actualTonnage: 474720, targetRevenue: 3008988000, actualRevenue: 2875152000 },
        APT: { name: 'Apapa Port (APT)', targetTrains: 120, actualTrains: 114, targetTonnage: 331200, actualTonnage: 314640, targetRevenue: 2003191200, actualRevenue: 1903115200 },
      },
    });

    setScorecardData({
      year: selectedYear,
      month: selectedMonth,
      officers: [
        { id: 'usr_1', fullName: 'Ade Bello', staffId: 'EWK-01', stationCode: 'EWK', stationName: 'Ewekoro Terminal', targetTrains: 12, actualTrains: 12, achievementPct: 100.0, tonnageHauled: 33120, burstDefectRate: '0.08%', grade: 'A+' },
        { id: 'usr_2', fullName: 'Samuel Okafor', staffId: 'EWK-02', stationCode: 'EWK', stationName: 'Ewekoro Terminal', targetTrains: 12, actualTrains: 12, achievementPct: 100.0, tonnageHauled: 33120, burstDefectRate: '0.10%', grade: 'A+' },
        { id: 'usr_4', fullName: 'Musa Ibrahim', staffId: 'MNY-01', stationCode: 'MNY', stationName: 'Moniya Yard (Ibadan)', targetTrains: 15, actualTrains: 14, achievementPct: 93.3, tonnageHauled: 38640, burstDefectRate: '0.15%', grade: 'A' },
        { id: 'usr_6', fullName: 'Ngozi Eze', staffId: 'APT-01', stationCode: 'APT', stationName: 'Apapa Maritime Port', targetTrains: 15, actualTrains: 15, achievementPct: 100.0, tonnageHauled: 41400, burstDefectRate: '0.05%', grade: 'A+' },
      ],
    });

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const handleSaveBenchmark = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await budgetApi.setTerminalBudget({
        year: Number(benchmarkForm.year),
        month: Number(benchmarkForm.month),
        stationCode: benchmarkForm.stationCode,
        targetTrains: Number(benchmarkForm.targetTrains),
        targetTonnage: Number(benchmarkForm.targetTonnage),
        targetRevenue: Number(benchmarkForm.targetRevenue),
      });
      setSuccessMessage('Terminal operational budget benchmark saved successfully!');
      setBenchmarkModal(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setCustomAlert({ title: 'Error Saving Benchmark', message: err.response?.data?.message || 'Error saving benchmark' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveOfficerTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await budgetApi.assignOfficerTarget({
        officerId: selectedOfficer.id,
        year: selectedYear,
        month: selectedMonth,
        stationCode: officerForm.stationCode,
        targetTrains: Number(officerForm.targetTrains),
      });
      setSuccessMessage(`Target trains updated for Cargo Officer ${selectedOfficer.fullName}!`);
      setOfficerModal(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setCustomAlert({ title: 'Error Assigning Target', message: err.response?.data?.message || 'Error assigning target' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatNgn = (num: number) => {
    return '₦' + (num || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  };

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold tracking-wide uppercase">
                Annual Budget & KPI Governance
              </span>
              <span className="text-xs text-gray-500 font-mono">Executive Benchmarks</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Terminal Operating Budgets & Cargo Officer KPI Scorecard
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono font-bold text-xs shadow-sm"
            >
              <option value={2025}>FY 2025</option>
              <option value={2026}>FY 2026 (Active)</option>
              <option value={2027}>FY 2027</option>
            </select>

            <button
              onClick={() => {
                setBenchmarkForm({
                  year: selectedYear,
                  month: selectedMonth,
                  stationCode: 'EWK',
                  targetTrains: '25',
                  targetTonnage: '30000',
                  targetRevenue: '45000000',
                });
                setBenchmarkModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus size={14} />
              Set Monthly Benchmark
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            {successMessage}
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : (
          <div className="space-y-8">
            {/* ── SECTION 1: Cargo Officer Monthly KPI Scorecards (Mr. Niyi Spec) ── */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Award size={18} className="text-purple-600" />
                    Terminal Cargo Officer Performance Ratings
                  </h2>
                  <p className="text-xs text-gray-500">
                    Allocated train loading benchmarks vs actual achieved throughput for {MONTHS[selectedMonth - 1]} {selectedYear}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl font-bold text-xs shadow-sm"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Officer Scorecards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {scorecardData?.scorecards?.map((sc: any) => {
                  const score = sc.ratingScore || 0;
                  const isExceeding = score >= 100;
                  const isOnTrack = score >= 85 && score < 100;

                  return (
                    <div
                      key={sc.officer.id}
                      className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all space-y-4"
                    >
                      {/* Officer Profile Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 font-black text-sm flex items-center justify-center border border-purple-200">
                            {sc.officer.fullName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-gray-900">{sc.officer.fullName}</h3>
                            <p className="text-[11px] text-gray-500 font-mono">{sc.officer.email}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedOfficer(sc.officer);
                            setOfficerForm({
                              targetTrains: String(sc.targetTrains || 15),
                              stationCode: 'EWK',
                            });
                            setOfficerModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-all"
                          title="Adjust Target Quota"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>

                      {/* Performance Score Gauge */}
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                            Performance Rating
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                              isExceeding
                                ? 'bg-emerald-100 text-emerald-800'
                                : isOnTrack
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {score.toFixed(1)}% Rating
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeding ? 'bg-emerald-500' : isOnTrack ? 'bg-blue-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(score, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-600 font-mono pt-1">
                          <span>
                            Achieved: <strong className="text-gray-900 font-bold">{sc.achievedTrains} Trains</strong>
                          </span>
                          <span>
                            Target: <strong className="text-gray-900 font-bold">{sc.targetTrains} Trains</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tier Badge Indicator */}
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                        {isExceeding ? (
                          <span className="flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 size={15} /> ⭐⭐⭐⭐⭐ Exceeding Monthly Target
                          </span>
                        ) : isOnTrack ? (
                          <span className="flex items-center gap-1.5 text-blue-700">
                            <CheckCircle2 size={15} /> ⭐⭐⭐⭐ On Target Benchmark
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-700">
                            <AlertCircle size={15} /> ⭐⭐⭐ Needs Operational Support
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SECTION 2: 12-Month Terminal Operating & Financial Benchmarks Grid ── */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden space-y-4">
              <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Building size={18} className="text-blue-600" />
                    12-Month Operating & Financial Benchmark Ledger (FY {selectedYear})
                  </h2>
                  <p className="text-xs text-gray-500">
                    Month-by-month train loading targets, tonnage allocations, and revenue variance
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-gray-50 text-gray-600 font-mono font-bold text-[11px] uppercase border-b">
                    <tr>
                      <th className="py-3 px-5">Month</th>
                      <th className="py-3 px-5">Target Trains</th>
                      <th className="py-3 px-5">Actual Dispatched</th>
                      <th className="py-3 px-5">Target Tonnage</th>
                      <th className="py-3 px-5">Actual Tonnage</th>
                      <th className="py-3 px-5">Target Revenue</th>
                      <th className="py-3 px-5">Actual Revenue</th>
                      <th className="py-3 px-5 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono">
                    {yearlyData?.monthlySummary?.map((m: any) => {
                      const hasTarget = m.targets.trains > 0;
                      return (
                        <tr key={m.month} className="hover:bg-gray-50/50">
                          <td className="py-3.5 px-5 font-bold text-gray-900 font-sans">{m.monthName}</td>
                          <td className="py-3.5 px-5 font-bold text-blue-700">{m.targets.trains || '—'}</td>
                          <td className="py-3.5 px-5 text-gray-900 font-bold">{m.actuals.trains}</td>
                          <td className="py-3.5 px-5 text-gray-500">{m.targets.tonnage ? `${m.targets.tonnage.toLocaleString()}t` : '—'}</td>
                          <td className="py-3.5 px-5 text-gray-800">{m.actuals.tonnage ? `${m.actuals.tonnage.toLocaleString()}t` : '—'}</td>
                          <td className="py-3.5 px-5 text-gray-500">{m.targets.revenue ? formatNgn(m.targets.revenue) : '—'}</td>
                          <td className="py-3.5 px-5 font-bold text-emerald-800">{formatNgn(m.actuals.revenue)}</td>
                          <td className="py-3.5 px-5 text-right font-bold">
                            {hasTarget ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  m.variance.achieved
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {m.variance.trainsPct}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: Set Terminal Monthly Benchmark ── */}
        <Modal open={benchmarkModal} onClose={() => setBenchmarkModal(false)} title="Set Terminal Operating Benchmark">
          <form onSubmit={handleSaveBenchmark} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Fiscal Year</label>
                <input
                  type="number"
                  value={benchmarkForm.year}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl font-mono bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Month</label>
                <select
                  value={benchmarkForm.month}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, month: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white"
                >
                  {MONTHS.map((m, idx) => (
                    <option key={idx} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Terminal Station</label>
              <select
                value={benchmarkForm.stationCode}
                onChange={(e) => setBenchmarkForm({ ...benchmarkForm, stationCode: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl font-bold bg-slate-50 focus:bg-white"
              >
                <option value="EWK">Ewekoro Loading Terminal (EWK)</option>
                <option value="MNY">Moniya Dry Port / Yard (MNY)</option>
                <option value="APT">Papalanto Siding (APT)</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Trains</label>
                <input
                  type="number"
                  placeholder="25"
                  value={benchmarkForm.targetTrains}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, targetTrains: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Tonnage</label>
                <input
                  type="number"
                  placeholder="30000"
                  value={benchmarkForm.targetTonnage}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, targetTonnage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Revenue (NGN)</label>
                <input
                  type="number"
                  placeholder="45000000"
                  value={benchmarkForm.targetRevenue}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, targetRevenue: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono bg-slate-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setBenchmarkModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
              >
                {actionLoading ? 'Saving...' : 'Save Benchmark ➔'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ── MODAL: Assign / Adjust Cargo Officer Target ── */}
        <Modal open={officerModal} onClose={() => setOfficerModal(false)} title="Assign Monthly Train Quota">
          <form onSubmit={handleSaveOfficerTarget} className="space-y-4 text-xs font-sans">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Cargo Officer</span>
              <p className="font-extrabold text-sm text-slate-900">{selectedOfficer?.fullName}</p>
              <p className="text-xs text-slate-500 font-mono">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Allocated Monthly Train Loading Quota</label>
              <input
                type="number"
                placeholder="15"
                value={officerForm.targetTrains}
                onChange={(e) => setOfficerForm({ ...officerForm, targetTrains: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl font-mono font-black text-sm bg-white"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">
                The officer's monthly performance rating will be scored against this target.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setOfficerModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-md"
              >
                {actionLoading ? 'Updating...' : 'Set Officer Target ➔'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
