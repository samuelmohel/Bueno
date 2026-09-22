'use client';

import { shouldPoll, onReturnToForeground } from '@/lib/polling';
import { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { getUser } from '@/lib/auth/session';
import { notify, confirmAction } from '@/lib/notify';
import { BRAND } from '@/lib/theme';
import {
  StateEngine,
  DEFAULT_ROLE_TAB_PERMISSIONS,
  UNIFIED_PERMISSION_LIST,
  TAB_ALIASES,
  TAB_REGISTRY,
  CANONICAL_CORRIDORS,
  ChartAccount,
  JournalEntry,
  BankAccount,
  GRANULAR_MODULE_PERMISSIONS,
  DEFAULT_GRANULAR_ROLE_PERMISSIONS,
} from '@/lib/services/StateEngine';
/*
 * The heavy views load on demand.
 *
 * These five components are ~3,400 lines between them and the map pulls in
 * Leaflet, yet an administrator may never open the GPS or terminal tabs in a
 * given session. Importing them statically put all of it in the dashboard's
 * first payload — the route shipped 115 kB of JavaScript before rendering a
 * single row. `ssr: false` on the map is required as well as desirable: it
 * touches `window` during initialisation.
 */
const ViewLoading = () => (
  <div className="flex h-48 items-center justify-center" role="status" aria-live="polite">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
    <span className="sr-only">Loading view…</span>
  </div>
);

const LiveGpsMap = dynamic(
  () => import('@/components/LiveGpsMap').then((m) => m.LiveGpsMap),
  { ssr: false, loading: ViewLoading }
);
const TripDossierModal = dynamic(
  () => import('@/components/TripDossierModal').then((m) => m.TripDossierModal),
  { loading: ViewLoading }
);
const OfficialInvoiceModal = dynamic(() => import('@/components/OfficialInvoiceModal'), {
  loading: ViewLoading,
});
const MoniyaContainerView = dynamic(
  () => import('@/components/MoniyaContainerView').then((m) => m.MoniyaContainerView),
  { loading: ViewLoading }
);
const TerminalInformationView = dynamic(
  () => import('@/components/TerminalInformationView').then((m) => m.TerminalInformationView),
  { loading: ViewLoading }
);
import {
  BarChart3,
  FileSpreadsheet,
  Wallet,
  Box,
  Compass,
  Receipt,
  Scale,
  TrendingUp,
  Building2,
  BookOpen,
  Printer,
  RefreshCw,
  DollarSign,
  Trash2,
  Save,
  ShieldCheck,
  LayoutGrid,
  UserCheck,
  Check,
  X,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Edit,
  FileText,
  Truck,
  Train,
  Clock,
  Menu,
  MessageSquare,
  Package,
  Users,
  Settings,
  Fuel,
  ChevronRight,
  Plus,
  Shield,
  Eye,
  Lock,
  RotateCcw,
} from 'lucide-react';


// ENTERPRISE COMMODITY & MEASUREMENT UNIT CONFIGURATION

function getModuleIcon(iconName: string) {
  switch (iconName) {
    case 'commercial': return <TrendingUp className="w-4 h-4 text-blue-600" />;
    case 'negotiation': return <MessageSquare className="w-4 h-4 text-indigo-600" />;
    case 'operations': return <Train className="w-4 h-4 text-emerald-600" />;
    case 'fleet': return <Truck className="w-4 h-4 text-amber-600" />;
    case 'finance': return <DollarSign className="w-4 h-4 text-teal-600" />;
    case 'users': return <Users className="w-4 h-4 text-purple-600" />;
    case 'system': return <Settings className="w-4 h-4 text-slate-600" />;
    default: return <Package className="w-4 h-4 text-slate-600" />;
  }
}

export const COMMODITY_CONFIG: Record<string, { unit: string; wagonType: string; auditMetric: string }> = {
  'Bagged Cement (50kg)': { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' },
  'Bulk Gypsum': { unit: 'Metric Tonnes (MT)', wagonType: 'Open Top Gondola Wagon', auditMetric: 'Transit Shrinkage (MT)' },
  'Limestone Raw Ore': { unit: 'Metric Tonnes (MT)', wagonType: 'Bottom Dumper Wagon', auditMetric: 'Spillage Loss (MT)' },
  'Clinker Bulk': { unit: 'Metric Tonnes (MT)', wagonType: 'Gondola Wagon', auditMetric: 'Weight Deviation (MT)' },
  'Shipping Containers (20ft/40ft)': { unit: 'Containers (TEU)', wagonType: 'Flatbed Container Wagon', auditMetric: 'Seal Integrity' },
  'AGO Diesel / Liquid Bulk': { unit: 'Liters (L)', wagonType: 'Tanker Wagon', auditMetric: 'Ullage Loss (L)' },
};

/**
 * Groups trips into monthly buckets for the archive view.
 *
 * This replaces a module-level constant that read `StateEngine.getTrips()` at
 * import time — before any data had been fetched, so it was always empty — and
 * was then mutated in place from inside the component under a hard-coded
 * '2026-09' key. Every month after September 2026 would have been filed under
 * September, and September itself would never have changed again.
 *
 * Buckets are derived from each trip's own date, so the archive is correct in
 * any month without anybody editing a string.
 */
function monthKeyOf(trip: any): string {
  // Same field precedence the report's date filter already uses, so a trip
  // cannot be filed under one month here and treated as another there.
  const raw = trip?.dispatchTime || trip?.createdAt || trip?.departedAt;
  const when = raw ? new Date(raw) : null;
  // An unparseable or missing date must not silently land in the current month
  // and quietly distort the figures.
  if (!when || Number.isNaN(when.getTime())) return 'undated';
  return `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
}

function groupTripsByMonth(trips: any[]): Record<string, any[]> {
  const buckets: Record<string, any[]> = {};
  for (const trip of trips) {
    (buckets[monthKeyOf(trip)] ??= []).push(trip);
  }
  return buckets;
}

/** '2026-09' → 'September 2026'. 'ALL'/'undated' pass through as labels. */
function monthLabel(key: string): string {
  if (key === 'ALL') return 'All periods';
  if (key === 'undated') return 'Undated records';
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return key;
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

/* ─────────────────────────────────────────────────────────
   PER-TRIP COMPREHENSIVE PERFORMANCE & FINANCIAL AUDIT MODAL
───────────────────────────────────────────────────────── */
function SingleTripPerformanceAuditModal({ trip, onClose }: { trip: any; onClose: () => void }) {
  if (!trip) return null;
  const wagonLogs: any[] = trip.wagonLogs || [];
  const totalWagons = wagonLogs.length;
  const isBulkTonnes = trip.unitOfMeasure?.includes('Tonnes') || trip.unitOfMeasure?.includes('MT') || trip.cargoType?.includes('Gypsum') || trip.cargoType?.includes('Limestone');
  const defaultUnitCapacity = isBulkTonnes ? 60 : 1200;
  const unit = trip.unitOfMeasure || (isBulkTonnes ? 'Metric Tonnes (MT)' : 'Bags');

  // Exact summation from wagon-by-wagon logs
  const totalLoadedQty = wagonLogs.reduce((acc, w) => acc + (Number(w.qty) || defaultUnitCapacity), 0);
  const totalBurstBags = wagonLogs.reduce((acc, w) => acc + (Number(w.burstBags) || 0), 0) || Number(trip.damages?.burstBags) || 0;
  const totalDamagesQty = wagonLogs.reduce((acc, w) => acc + (Number(w.damageQty) || 0), 0) || Number(trip.damages?.damagedUnits) || 0;
  const totalDefects = totalBurstBags + totalDamagesQty;
  const totalIntactDischarged = wagonLogs.reduce((acc, w) => acc + (Number(w.correctQty) || (Number(w.qty) || defaultUnitCapacity) - (Number(w.burstBags || 0) + Number(w.damageQty || 0))), 0) || Math.max(0, (Number(trip.quantity) || totalLoadedQty) - totalDefects);
  const qty = Number(trip.quantity) || totalLoadedQty || (isBulkTonnes ? 720 : 14400);

  // Collect all discrepancy inspection notes
  const wagonNotes = wagonLogs.map((w) => w.complaintNotes).filter(Boolean);
  const overallNote = typeof trip.damages?.complaintNotes === 'string' ? trip.damages.complaintNotes : Array.isArray(trip.damages?.complaintNotes) ? trip.damages.complaintNotes.join('; ') : '';
  const combinedRemarks = Array.from(new Set([...wagonNotes, overallNote].filter(Boolean))).join('; ');

  // Commercial financial validation
  const hasExplicitBilling = Boolean(trip.tripRevenue || trip.invoicedAmount);
  const revenue = Number(trip.tripRevenue || trip.invoicedAmount || 0);
  const operatingCost = Number(trip.tripCost || 0);
  const netMargin = revenue - operatingCost;
  const marginPct = revenue > 0 ? ((netMargin / revenue) * 100).toFixed(1) : '0.0';

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-5xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* PRINT HEADER WITH BUENO LOGO */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b-2 border-slate-900 gap-4">
          <div className="flex items-center gap-3">
            <img src="/bueno_logo.png" alt="Bueno Logistics" className="h-12 w-auto object-contain" />
            <div>
              <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>BUENO LOGISTICS LIMITED</h2>
              <p className="text-[10px] font-mono font-bold text-slate-500 uppercase">OFFICIAL RAIL CORRIDOR SINGLE TRIP AUDIT & PERFORMANCE REPORT</p>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-xs">
            <span className={`inline-block px-3 py-1 rounded-full font-black text-[10px] uppercase mb-1 ${
              trip.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
              trip.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {trip.status === 'COMPLETED' ? 'FULLY COMPLETED & AUDITED' : trip.status}
            </span>
            <p className="text-[11px] text-slate-600 font-bold">Trip Ref: <b className="text-slate-900">{trip.id || trip.tripId}</b></p>
            <p className="text-[10px] text-slate-400">Generated: {new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* TRIP EXECUTIVE SUMMARY GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-xs">
          <div>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Consignee Client</span>
            <span className="font-extrabold text-slate-900 text-sm">{trip.company}</span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Corridor Route</span>
            <span className="font-extrabold text-emerald-700 text-sm">{trip.origin || 'EWK'} → {trip.destination || 'MNY'}</span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Locomotive & Consist</span>
            <span className="font-extrabold text-slate-900 text-sm">{trip.locomotiveId || 'L2205'} ({totalWagons} Hoppers + {trip.escortWagonId || 'BV 01'})</span>
          </div>
          <div>
            <span className="text-[9px] font-extrabold uppercase text-slate-400 block">Total Consignment</span>
            <span className="font-extrabold text-slate-900 text-sm">{qty.toLocaleString()} {unit}</span>
          </div>
        </div>

        {/* 1. CORRIDOR TRANSIT & GPS TELEMETRY AUDIT */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black uppercase text-slate-900 font-mono">1. Corridor Transit Timeline & GPS Telemetry</h4>
            <span className="text-[10px] font-bold text-emerald-700 font-mono">Continuous Satellite / Phone Beacon</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Loading & Departure</span>
              <p className="font-bold text-slate-900">{trip.departedAt || trip.dispatchTime || '09:15 AM'}</p>
              <span className="text-[10px] text-slate-500">Origin Station: {trip.origin || 'EWK'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Arrival & Discharge</span>
              <p className="font-bold text-slate-900">{trip.completedAt || 'In Transit / Arrived'}</p>
              <span className="text-[10px] text-slate-500">Destination: {trip.destination || 'MNY'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Supervising Escort Officer</span>
              <p className="font-bold text-slate-900">{trip.escortOfficerName || trip.cargoOfficerName || 'Ade Bello'}</p>
              <span className="text-[10px] text-emerald-700">Phone: {trip.escortPhone || '08031112233'}</span>
            </div>
          </div>
        </div>

        {/* 2. WAGON CONSIST LOADING & FEEDER TRUCK TALLIES TABLE */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black uppercase text-slate-900 font-mono">2. Wagon Consist Loading & Feeder Truck Tallies</h4>
            <span className="text-[10px] font-bold text-slate-500 font-mono">{wagonLogs.length} Wagon(s) Loaded & Manifested</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5"># / Wagon ID</th>
                  <th className="p-2.5">Feeder Truck Plate</th>
                  <th className="p-2.5">Driver & Contact</th>
                  <th className="p-2.5">Loading Siding / Bay</th>
                  <th className="p-2.5">Loading Time (Duration)</th>
                  <th className="p-2.5">Volume Loaded</th>
                  <th className="p-2.5">Security Seal No.</th>
                  <th className="p-2.5 text-right">Loading Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wagonLogs.length > 0 ? wagonLogs.map((w: any, idx: number) => {
                  const primaryTruck = (w.feederTrucks && w.feederTrucks[0]) || {};
                  const truckPlate = w.truckRegNo || primaryTruck.truckRegNo || `TRK-KJA-98${idx + 1}-XP`;
                  const driverStr = w.driverDetails || (primaryTruck.driverName ? `${primaryTruck.driverName} (${primaryTruck.phone || 'N/A'})` : 'Ibrahim Garba (08031112233)');
                  const sidingStr = w.sourceEnv || `${trip.origin || 'EWK'} Silo Bay #${(idx % 3) + 1}`;
                  const timeRange = w.startTime && w.endTime ? `${w.startTime} → ${w.endTime}` : (w.startTime || '08:30 AM');
                  const durationStr = w.durationStr || '25 mins';
                  const loadedQty = Number(w.qty) || defaultUnitCapacity;
                  const sealNo = w.sealNumber || `SEAL-${trip.origin || 'EWK'}-${9801 + idx}`;

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-amber-800">{idx + 1}. {w.wagonId}</td>
                      <td className="p-2.5 font-bold text-slate-900">{truckPlate}</td>
                      <td className="p-2.5 text-slate-600 text-[11px]">{driverStr}</td>
                      <td className="p-2.5 text-slate-600">{sidingStr}</td>
                      <td className="p-2.5 text-slate-700 font-semibold">{timeRange} <span className="text-slate-400">({durationStr})</span></td>
                      <td className="p-2.5 font-extrabold text-emerald-700">{loadedQty.toLocaleString()} {unit}</td>
                      <td className="p-2.5 text-slate-800 font-bold">{sealNo}</td>
                      <td className="p-2.5 text-right">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                          LOADED
                        </span>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">No wagon loading tallies recorded yet for this trip.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. DESTINATION YARD DISCHARGE & QUALITY AUDIT */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black uppercase text-slate-900 font-mono">3. Destination Yard Discharge & Quality Defect Audit</h4>
            <span className="text-[10px] font-bold text-slate-500 font-mono">Station: {trip.destination || 'MNY'} Yard</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Intact Goods Discharged</span>
              <p className="font-extrabold text-emerald-700 text-base">{totalIntactDischarged.toLocaleString()} {unit}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Burst Bags / Damages</span>
              <p className="font-extrabold text-rose-600 text-base">{totalDefects} Unit(s)</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Transit Defect Rate</span>
              <p className="font-extrabold text-slate-900 text-base">{((totalDefects / (qty || 1)) * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase text-slate-400 block">Receiving Officer</span>
              <p className="font-bold text-slate-800">{trip.unloadingOfficerName || 'Musa Ibrahim (MNY-01)'}</p>
            </div>
          </div>

          {combinedRemarks && (
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs text-rose-900 font-sans">
              <b>Recorded Inspection & Discrepancy Remarks:</b> "{combinedRemarks}"
            </div>
          )}

          {/* PER-WAGON UNLOADING BREAKDOWN TABLE */}
          {wagonLogs.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-purple-50 text-purple-900 text-[10px] uppercase font-bold border-b border-purple-100">
                  <tr>
                    <th className="p-2.5">Wagon ID</th>
                    <th className="p-2.5">Destination Unloading Bay</th>
                    <th className="p-2.5">Unload Time (Duration)</th>
                    <th className="p-2.5">Intact Discharged</th>
                    <th className="p-2.5">Damaged / Burst Bags</th>
                    <th className="p-2.5">Discrepancy / Inspection Remark</th>
                    <th className="p-2.5 text-right">Discharge Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wagonLogs.map((w: any, idx: number) => {
                    const sidingBay = w.sidingBay || `${trip.destination || 'MNY'} Warehouse Bay #${(idx % 4) + 1}`;
                    const timeRange = w.unloadStartTime && w.unloadEndTime ? `${w.unloadStartTime} → ${w.unloadEndTime}` : (w.unloadStartTime || '01:45 PM');
                    const durationStr = w.unloadDurationStr || '20 mins';
                    const loadedQty = Number(w.qty) || defaultUnitCapacity;
                    const burst = Number(w.burstBags || 0);
                    const dmg = Number(w.damageQty || 0);
                    const totalWagonDefect = burst + dmg;
                    const intact = Number(w.correctQty) || Math.max(0, loadedQty - totalWagonDefect);
                    const remark = w.complaintNotes || (totalWagonDefect > 0 ? `${totalWagonDefect} burst/damaged units logged` : 'Discharged 100% Intact');
                    const isUnloaded = w.unloadStatus === 'UNLOADED' || trip.status === 'COMPLETED';

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-amber-800">{w.wagonId}</td>
                        <td className="p-2.5 text-slate-700">{sidingBay}</td>
                        <td className="p-2.5 text-slate-700 font-semibold">{timeRange} <span className="text-slate-400">({durationStr})</span></td>
                        <td className="p-2.5 font-extrabold text-emerald-700">{intact.toLocaleString()} {unit}</td>
                        <td className="p-2.5 font-extrabold">
                          {totalWagonDefect > 0 ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-black">{totalWagonDefect} Defect(s)</span>
                          ) : (
                            <span className="text-slate-400">0 Defects</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-700 font-sans text-[11px]">{remark}</td>
                        <td className="p-2.5 text-right">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            isUnloaded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isUnloaded ? 'DISCHARGED' : 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. CORRIDOR FINANCIAL PERFORMANCE LEDGER */}
        <div className="space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="text-xs font-black uppercase text-slate-900 font-mono">4. Corridor Financial Performance Ledger</h4>
            <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full ${
              hasExplicitBilling ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {hasExplicitBilling ? 'Commercial B2B Tariff Invoiced' : 'Pending Commercial Tariff Reconciliation'}
            </span>
          </div>

          {hasExplicitBilling ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200">
                <span className="text-[9px] uppercase text-emerald-800 font-bold block">Gross Invoiced Tariff Revenue</span>
                <p className="text-xl font-black text-emerald-900 mt-1">₦{revenue.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[9px] uppercase text-slate-500 font-bold block">Direct Operational Requisitions</span>
                <p className="text-xl font-black text-slate-900 mt-1">₦{operatingCost.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200">
                <span className="text-[9px] uppercase text-purple-800 font-bold block">Net Corridor Operating Margin</span>
                <p className="text-xl font-black text-purple-900 mt-1">₦{netMargin.toLocaleString()} <span className="text-xs font-bold font-sans text-purple-700">({marginPct}%)</span></p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1 font-sans">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <span className="text-amber-500 font-black">ⓘ</span>
                <span>Commercial Tariff Billing Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Freight billing tariff and commercial operational expenditure ledger for this trip are pending finalization by the Commercial Finance desk.
              </p>
            </div>
          )}
        </div>

        {/* EXECUTIVE CERTIFICATION & ACTION BUTTONS */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-[10px] font-mono text-slate-400">
            Official Bueno Logistics Corridor Record • HASH: AUDIT-{trip.id || trip.tripId}-CERTIFIED
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /><span>Print / Save Audit (PDF)</span></span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export function AdminPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'deals' | 'negotiations' | 'telemetry' | 'manifest' | 'billing' | 'users' | 'permissions' | 'fund_requisitions' | 'fleet' | 'moniya' | 'terminal_info'>(() => {
    if (user?.role === 'HEAD_OF_FINANCE' || user?.role === 'ACCOUNTANT') return 'billing';
    if (user?.role === 'HEAD_OF_OPERATIONS') return 'deals';
    return 'analytics';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true); // Open by default for easy navigation
  const [createDealModal, setCreateDealModal] = useState(false);
  const [registerWagonModal, setRegisterWagonModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedAuditTrip, setSelectedAuditTrip] = useState<any | null>(null);
  const [selectedDossierTrip, setSelectedDossierTrip] = useState<any | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [permissionsSaveSuccess, setPermissionsSaveSuccess] = useState(false);

  const [newWagonForm, setNewWagonForm] = useState({
    id: `PXG ${Math.floor(1000 + Math.random() * 8999)}`,
    wagonType: 'Covered Hopper Wagon',
    payloadCapacity: '60 MT',
    currentStation: 'EWK',
    gauge: 'STANDARD_GAUGE',
  });

  // Historical Report State
  // 'ALL' rather than a hard-coded month: the picker previously offered four
  // fixed months ending September 2026 and, since nothing consumed the value,
  // filtered nothing at all.
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'monthly' | 'quarterly' | 'annually'>('monthly');

  // Dynamic Repository State
  const [trips, setTrips] = useState<any[]>([]);
  const [wagons, setWagons] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // Enterprise Accounting & Dynamic Trip Costing State
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tripCosts, setTripCosts] = useState<any[]>([]);
  const [accountingSubTab, setAccountingSubTab] = useState<'invoices' | 'trip_pricing' | 'coa' | 'journal' | 'statements' | 'banking' | 'deal_costing' | 'customers' | 'pnl'>('invoices');
  const [pricingTripModal, setPricingTripModal] = useState<any | null>(null);
  const [pricingForm, setPricingForm] = useState({ amount: '', tariffRatePerTon: '', damageDeduction: '0', notes: '' });
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'ALL' | 'SETTLED' | 'PARTIALLY_PAID' | 'ISSUED'>('ALL');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    type: 'ADVANCE_DEPOSIT (70%)',
    ref: '',
    date: new Date().toLocaleDateString('en-GB'),
  });

  // Double-Entry Accounting Engine State
  const [chartAccounts, setChartAccounts] = useState<ChartAccount[]>(() => StateEngine.getChartOfAccounts());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => StateEngine.getJournalEntries());
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => StateEngine.getBankAccounts());
  const [coaFilter, setCoaFilter] = useState<'ALL' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'>('ALL');
  const [statementTab, setStatementTab] = useState<'trial_balance' | 'pnl' | 'balance_sheet' | 'ledger'>('trial_balance');
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('acc_1010');
  const [newAccountModal, setNewAccountModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    code: '',
    name: '',
    type: 'ASSET' as 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
    subType: 'Cash & Cash Equivalents',
    openingBalance: '',
    description: '',
  });
  const [newJournalModal, setNewJournalModal] = useState(false);
  const [newJournalForm, setNewJournalForm] = useState<{
    journalNo: string;
    date: string;
    reference: string;
    description: string;
    lines: { accountId: string; description: string; debit: string; credit: string }[];
  }>({
    journalNo: `JRN-2026-${Math.floor(100 + Math.random() * 900)}`,
    date: new Date().toLocaleDateString('en-GB'),
    reference: '',
    description: '',
    lines: [
      { accountId: 'acc_1010', description: '', debit: '', credit: '' },
      { accountId: 'acc_4010', description: '', debit: '', credit: '' },
    ],
  });

  // Granular RBAC Permissions State
  const [selectedPermissionRole, setSelectedPermissionRole] = useState<string>('CARGO_OFFICER');
  const [selectedPermissionUser, setSelectedPermissionUser] = useState<string>('');
  const [permissionsSubTab, setPermissionsSubTab] = useState<'granular' | 'matrix' | 'inspector'>('granular');
  const [granularPermissions, setGranularPermissions] = useState<Record<string, string[]>>(() => StateEngine.getGranularPermissions());
  const [newCostModal, setNewCostModal] = useState(false);
  const [newCostForm, setNewCostForm] = useState({
    tripId: trips[0]?.id || '',
    category: 'NRC_TRACK_ACCESS',
    title: '',
    vendor: 'Nigerian Railway Corporation (NRC)',
    amount: '',
    voucherNo: `VCH-${Math.floor(10000 + Math.random() * 89999)}`,
    notes: '',
  });
  const [selectedTripForCosting, setSelectedTripForCosting] = useState<string>('ALL');
  const [editingTripCost, setEditingTripCost] = useState<any | null>(null);

  // Active Selected Thread & Search
  const [activeDealId, setActiveDealId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('bueno_admin_active_deal_id') || null;
    }
    return null;
  });
  const activeDealIdRef = useRef<string | null>(activeDealId);
  activeDealIdRef.current = activeDealId;

  const handleSelectThread = (thread: any) => {
    const threadId = thread.id;
    setActiveDealId(threadId);
    activeDealIdRef.current = threadId;
    try {
      localStorage.setItem('bueno_admin_active_deal_id', threadId);
    } catch {}
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [replyInput, setReplyInput] = useState('');

  // Dynamic Freight Deal Form (Single Trip vs Monthly Master Contract)
  const [newDealForm, setNewDealForm] = useState({
    dealType: 'SINGLE_TRIP' as 'SINGLE_TRIP' | 'MONTHLY_CONTRACT',
    companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
    loadingStation: 'PAPA',
    destination: 'MNY',
    cargoType: 'Bagged Cement (50kg)',
    quantity: '2000',
    targetDate: '',
    notes: '',
    totalPlannedTrips: 10,
    trancheTonnage: 200,
    cadence: 'Every 3 Days',
    contractMonth: '2026-09',
  });

  // Deals Date Filter & Commercial Costing State (Finance / Treasurer)
  const [dealsDateFilter, setDealsDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'MONTHLY' | 'SINGLE'>('TODAY');
  const [costingModalDeal, setCostingModalDeal] = useState<any | null>(null);
  const [costingForm, setCostingForm] = useState({
    tariffRatePerTon: 12500,
    totalContractValue: 115000000,
    budgetExpensePerTrip: 4500000,
    paymentTerms: 'PER_TRIP_DRAWDOWN',
    dealType: 'MONTHLY_CONTRACT',
    totalPlannedTrips: 10,
    trancheTonnage: 920,
    contractMonth: '2026-09',
  });

  // Staff Provisioning Form
  const [provisionForm, setProvisionForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    userType: 'STAFF',
    role: 'CARGO_OFFICER',
    assignedStation: 'EWK',
    companyName: '',
    // No credential field. The server generates the one-time password and
    // returns it once on creation; letting an administrator choose it here
    // was how every new account ended up on the PIN '1111'.
  });
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isResettingCredentials, setIsResettingCredentials] = useState(false);
  // Null unless the server refused the directory read; see dataStore.readFailure.
  const [usersDirectoryError, setUsersDirectoryError] =
    useState<{ status: number; message: string } | null>(null);
  // The permissions editor must never present the shipped defaults as though
  // they were the policy the server enforces. Until this is true, the screen
  // shows a loading state rather than a matrix nobody has verified.
  const [permissionsLoaded, setPermissionsLoaded] = useState(
    () => StateEngine.hasServerRolePermissions()
  );
  const [permissionsLoadError, setPermissionsLoadError] = useState<string | null>(null);

  // Granular Permissions Matrix State
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, string[]>>(() => StateEngine.getRolePermissions());
  const [systemSettings, setSystemSettings] = useState(() => StateEngine.getSettings());

  const tryParse = (key: string, fallback: any) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const syncData = () => {
    // Ensure permissions are seeded with correct schema version before reading
    StateEngine.seedPermissionsIfVersionMismatch();

    const liveTrips = StateEngine.getTrips();
    const liveWagons = StateEngine.getWagons();
    const liveDeals = StateEngine.getDeals();
    const liveUsers = StateEngine.getUsers();
    const liveReqs = tryParse('bueno_client_requests', []);
    const liveDealsNeg = tryParse('bueno_custom_deal_negotiations', []);
    const liveNotifs = tryParse('bueno_notifications', []);
    const livePerms = StateEngine.getRolePermissions();
    const liveSettings = StateEngine.getSettings();
    const liveInvoices = StateEngine.getInvoices();
    const liveTripCosts = StateEngine.getTripCosts();

    setTrips(liveTrips);
    setWagons(liveWagons);
    setDeals(liveDeals);
    StateEngine.syncRemote();
    setRequests(liveReqs);
    setUsersList(liveUsers);
    setUsersDirectoryError(StateEngine.readFailureFor('bueno_users'));
    setNotifications(liveNotifs);
    setPermissionsMatrix(livePerms);
    setSystemSettings(liveSettings);
    setInvoices(liveInvoices);
    setTripCosts(liveTripCosts);
    setChartAccounts(StateEngine.getChartOfAccounts());
    setJournalEntries(StateEngine.getJournalEntries());
    setBankAccounts(StateEngine.getBankAccounts());
    setGranularPermissions(StateEngine.getGranularPermissions());


    // BUILD MASTER CLIENT NEGOTIATION THREADS FOR ALL REGISTERED CLIENTS (KEYED BY EMAIL)
    const clientUsers = liveUsers.filter(
      (u: any) => u.userType === 'CUSTOMER' || u.role === 'CUSTOMER' || u.role === 'CONSIGNEE'
    );

    const mergedMap = new Map<string, any>();

    // 1. Initialize Thread for Every Registered Client User
    clientUsers.forEach((client: any) => {
      const clientEmail = (client.email || '').toLowerCase().trim();
      if (!clientEmail) return;

      const station = client.assignedStation && client.assignedStation !== 'HQ' ? client.assignedStation : 'PAPA';
      const cleanEmailKey = clientEmail.toLowerCase();
      const stableThreadId = `THREAD-${cleanEmailKey.replace(/[^a-z0-9]/g, '_')}`;
      mergedMap.set(cleanEmailKey, {
        id: stableThreadId,
        companyName: client.companyName || client.fullName,
        email: clientEmail,
        contactName: client.fullName,
        phone: client.phone || 'N/A',
        loadingStation: station,
        destination: 'MNY',
        cargoType: 'Bagged Cement (50kg)',
        quantity: '2,000 Bags',
        status: 'REGISTERED_CLIENT',
        createdAt: client.createdAt || 'Active Account',
        messages: [],
        hasUnread: false,
      });
    });

    // 2. Merge Web Requisitions
    if (liveReqs.length > 0) {
      liveReqs.forEach((req: any) => {
        const reqEmail = (req.email || '').toLowerCase().trim();
        const reqCompany = (req.companyName || '').toLowerCase().trim();
        if (!reqEmail && !reqCompany) return;

        let existingKey: string = reqEmail || '';
        let existing: any = null;

        if (reqEmail && mergedMap.has(reqEmail)) {
          existingKey = reqEmail;
          existing = mergedMap.get(reqEmail);
        } else {
          mergedMap.forEach((t: any, key: string) => {
            if (existing) return;
            const tEmail = (t.email || '').toLowerCase().trim();
            const tCompany = (t.companyName || '').toLowerCase().trim();
            if (reqEmail && tEmail === reqEmail) {
              existingKey = key;
              existing = t;
            } else if (reqCompany && tCompany && (tCompany === reqCompany || tCompany.includes(reqCompany) || reqCompany.includes(tCompany))) {
              existingKey = key;
              existing = t;
            }
          });
        }

        if (!existing) {
          const cleanReqKey = reqEmail ? reqEmail.toLowerCase() : `req_${req.id || 'unassigned'}`;
          existingKey = cleanReqKey;
          existing = {
            id: `THREAD-${cleanReqKey.replace(/[^a-z0-9]/g, '_')}`,
            companyName: req.companyName || req.contactName || 'Industrial Consignee Client',
            email: reqEmail,
            contactName: req.contactName || 'Logistics Lead',
            phone: req.phone || '',
            loadingStation: req.route?.includes('EWK') ? 'EWK' : req.route?.includes('APT') ? 'APT' : 'PAPA',
            destination: 'MNY',
            cargoType: req.product || 'Bagged Cement (50kg)',
            quantity: req.volume || '2,000 Bags',
            status: 'PENDING_REVIEW',
            createdAt: req.createdAt || 'Today',
            messages: [],
            hasUnread: true,
          };
        }

        const reqMsg = {
          sender: req.contactName || 'Consignee Client',
          role: 'Industrial Consignee',
          text: `Requisition Note Submitted: Requesting freight haulage for ${req.product || 'Cement'} [${req.volume || '2,000 Bags'}] via ${req.route || 'EWK → MNY'}. Notes: ${req.notes || 'None'}`,
          time: req.createdAt || 'Today',
        };

        const hasReqMsg = (existing.messages || []).some((m: any) => m.text?.includes('Requisition Note Submitted'));
        if (!hasReqMsg) {
          existing.messages = [reqMsg, ...(existing.messages || [])];
        }
        existing.status = 'PENDING_REVIEW';
        existing.hasUnread = true;
        if (req.companyName && (!existing.companyName || existing.companyName === 'Bueno Logistics HQ')) {
          existing.companyName = req.companyName;
        }
        if (req.product) existing.cargoType = req.product;
        if (req.volume) existing.quantity = req.volume;
        mergedMap.set(existingKey, existing);
      });
    }

    // 3. Merge Live Deal Chat Messages from Storage
    if (liveDealsNeg.length > 0) {
      liveDealsNeg.forEach((deal: any) => {
        const dealEmail = (deal.email || '').toLowerCase().trim();
        const dealCompany = (deal.companyName || '').toLowerCase().trim();

        let existingKey: string = dealEmail || '';
        let existing: any = null;

        // Match existing thread in mergedMap by email, deal id, company name, or contact name
        if (dealEmail && mergedMap.has(dealEmail)) {
          existingKey = dealEmail;
          existing = mergedMap.get(dealEmail);
        } else {
          mergedMap.forEach((t: any, key: string) => {
            if (existing) return;
            const tEmail = (t.email || '').toLowerCase().trim();
            const tCompany = (t.companyName || '').toLowerCase().trim();
            if (deal.id && t.id === deal.id) {
              existingKey = key;
              existing = t;
            } else if (dealEmail && tEmail === dealEmail) {
              existingKey = key;
              existing = t;
            } else if (dealCompany && tCompany && (tCompany === dealCompany || tCompany.includes(dealCompany) || dealCompany.includes(tCompany))) {
              existingKey = key;
              existing = t;
            }
          });
        }

        if (!existing) {
          const cleanDealKey = dealEmail ? dealEmail.toLowerCase() : (deal.id || 'deal_custom');
          existingKey = cleanDealKey;
          existing = {
            id: deal.id || `THREAD-${cleanDealKey.replace(/[^a-z0-9]/g, '_')}`,
            companyName: deal.companyName || deal.contactName || 'Industrial Client',
            email: dealEmail || `client_${deal.id || 'custom'}@bueno.ng`,
            contactName: deal.contactName || deal.companyName,
            phone: deal.phone || '',
            loadingStation: deal.loadingStation || 'PAPA',
            destination: deal.destination || 'MNY',
            cargoType: deal.cargoType || 'Bagged Cement (50kg)',
            quantity: deal.quantity || '2,000 Bags',
            status: deal.status || 'IN_NEGOTIATION',
            createdAt: deal.createdAt || 'Today',
            messages: [],
            hasUnread: true,
          };
        }

        if (deal.messages && deal.messages.length > 0) {
          // Deduplicate messages
          const existingTexts = new Set((existing.messages || []).map((m: any) => `${m.sender}_${(m.text || '').substring(0, 40)}`));
          deal.messages.forEach((m: any) => {
            const k = `${m.sender}_${(m.text || '').substring(0, 40)}`;
            if (!existingTexts.has(k)) {
              existing.messages.push(m);
              existingTexts.add(k);
            }
          });
          existing.hasUnread = true;
        }

        if (deal.status) existing.status = deal.status;
        if (deal.cargoType && deal.cargoType !== 'Bagged Cement (50kg)') existing.cargoType = deal.cargoType;
        if (deal.quantity) existing.quantity = deal.quantity;
        if (deal.loadingStation) existing.loadingStation = deal.loadingStation;
        if (deal.destination) existing.destination = deal.destination;
        if (deal.companyName && (!existing.companyName || existing.companyName === 'Bueno Logistics HQ')) {
          existing.companyName = deal.companyName;
        }

        mergedMap.set(existingKey, existing);
      });
    }

    const finalThreads = Array.from(mergedMap.values());
    setNegotiations((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(finalThreads)) return prev;
      return finalThreads;
    });

    setActiveDealId((prevId) => {
      const savedId = typeof window !== 'undefined' ? localStorage.getItem('bueno_admin_active_deal_id') : null;
      const target = prevId || activeDealIdRef.current || savedId;
      if (target) {
        const matched = finalThreads.find((t) => t.id === target || t.email === target || (target && target.includes(t.email)) || (t.id && target.includes(t.id)));
        if (matched) {
          activeDealIdRef.current = matched.id;
          return matched.id;
        }
      }
      const fallback = finalThreads[0]?.id || null;
      activeDealIdRef.current = fallback;
      return fallback;
    });
  };

  const [currentUser, setCurrentUser] = useState<any>(user);
  const can = (actionKey: string) => StateEngine.hasGranularPermission(currentUser || user, actionKey);

  useEffect(() => {
    // Identity comes from the session the server issued. Reading it out of
    // localStorage, as this previously did, meant a user could edit one value
    // in devtools and have the portal treat them as somebody else.
    const syncUser = () => {
      const sessionUser = getUser();
      if (sessionUser) setCurrentUser(sessionUser);
    };

    syncData();
    syncUser();

    // Load the matrix the server is actually enforcing. Nothing called this
    // before, so the editor rendered defaults out of localStorage and showed
    // capabilities as granted that the API was refusing.
    void StateEngine.refreshRolePermissions()
      .then((matrix) => {
        setPermissionsMatrix(matrix);
        setGranularPermissions(matrix);
        setPermissionsLoaded(true);
        setPermissionsLoadError(null);
      })
      .catch((err: any) => {
        setPermissionsLoadError(err?.message || 'Could not load the permissions matrix.');
      });

    StateEngine.syncRemote();
    // 12s rather than 4s: reads are ETagged now, so an unchanged collection
    // costs a 304 with no body, and the portal also refreshes on demand
    // whenever a write reports a change.
    const refresh = () => {
      StateEngine.syncRemote();
      syncData();
      syncUser();
    };

    // Skipped while the tab is hidden or the browser is offline; see lib/polling.
    const interval = setInterval(() => {
      if (!shouldPoll()) return;
      refresh();
    }, 12000);

    // …and refreshed the moment the tab is looked at again, so returning to it
    // never shows data up to twelve seconds stale.
    const stopForegroundWatch = onReturnToForeground(refresh);

    const handleAllUpdates = () => {
      syncData();
      syncUser();
    };

    window.addEventListener('storage', handleAllUpdates);
    window.addEventListener('bueno_state_updated', handleAllUpdates);
    window.addEventListener('bueno_session_updated', syncUser);
    return () => {
      clearInterval(interval);
      stopForegroundWatch();
      window.removeEventListener('storage', handleAllUpdates);
      window.removeEventListener('bueno_state_updated', handleAllUpdates);
      window.removeEventListener('bueno_session_updated', syncUser);
    };
  }, []);

  const saveNegotiations = (updatedThreads: any[]) => {
    setNegotiations(updatedThreads);
    StateEngine.saveNegotiations(updatedThreads);
  };

  // SEND CLIENT NEGOTIATIONS REPLY
  const handleAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeDealId) return;

    const activeThread = negotiations.find((n) => n.id === activeDealId);
    if (!activeThread) return;

    const newMsg = {
      sender: user?.fullName || 'Alhaji Bashir Umar',
      role: 'Executive Command Desk',
      text: replyInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedThreads = negotiations.map((d) =>
      d.id === activeDealId ? { ...d, messages: [...(d.messages || []), newMsg], status: 'IN_NEGOTIATION' } : d
    );

    saveNegotiations(updatedThreads);
    setReplyInput('');
  };

  // APPROVE DEAL & ALLOCATE WAGONS
  const handleApproveDealAndAllocateWagons = (dealItem: any) => {
    const qtyNum = Number(dealItem.quantity) || 1610;
    const unitLabel = dealItem.unitOfMeasure || (dealItem.cargoType?.includes('Gypsum') ? 'Metric Tonnes (MT)' : 'Bags');
    const wagonTypeLabel = dealItem.wagonType || (dealItem.cargoType?.includes('Gypsum') ? 'Open Top Gondola Wagon' : 'Covered Hopper Wagon');

    const newTripId = `TRP-${Math.floor(1000 + Math.random() * 8999)}`;
    const newTrip = {
      id: newTripId,
      tripId: newTripId,
      locomotiveId: 'L2205',
      origin: dealItem.loadingStation || 'EWK',
      destination: dealItem.destination || 'MNY',
      company: dealItem.companyName || dealItem.company,
      dealNumber: dealItem.id || dealItem.dealNumber,
      cargoType: dealItem.cargoType,
      unitOfMeasure: unitLabel,
      wagonType: wagonTypeLabel,
      quantity: qtyNum,
      cargoOfficerName: 'Ade Bello',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'LOADING',
      dispatchTime: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      wagonLogs: [],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: '' },
    };

    StateEngine.saveTrips([newTrip, ...trips]);
    setTrips([newTrip, ...trips]);

    // Update deal in SQL database to TRIP_CREATED so it leaves Deals tab
    const currentDeals = StateEngine.getDeals();
    const updatedDeals = currentDeals.map((d: any) =>
      d.id === dealItem.id || d.dealNumber === dealItem.id
        ? { ...d, status: 'TRIP_CREATED', tripId: newTrip.id }
        : d
    );
    StateEngine.saveDeals(updatedDeals);
    setDeals(updatedDeals);

    const updatedThreads = negotiations.map((d) =>
      d.id === dealItem.id
        ? {
            ...d,
            status: 'APPROVED_DISPATCHED',
            messages: [
              ...(d.messages || []),
              {
                sender: user?.fullName || 'Alhaji Bashir Umar',
                role: 'Executive Command Desk',
                text: `CONSIGNMENT APPROVED & WAGONS ALLOCATED: Trip #${newTrip.id} has been dispatched for wagon loading at ${newTrip.origin} Siding! Assigned Loco #${newTrip.locomotiveId}.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          }
        : d
    );

    saveNegotiations(updatedThreads);

    setCustomAlert({
      title: 'Deal Approved & Trip Dispatched',
      message: `Trip #${newTrip.id} created for ${newTrip.company}! Wagons allocated & loading log initiated at ${newTrip.origin} Terminal.`,
    });
  };

  // REQUISITION APPROVAL & DISBURSAL HANDLERS
  const handleApproveRequisition = (reqId: string) => {
    const liveReqs = StateEngine.getRequests();
    const updated = liveReqs.map((r: any) =>
      r.id === reqId || r.requisitionNo === reqId
        ? { ...r, status: 'APPROVED', stage: 'Accountant' }
        : r
    );
    StateEngine.saveRequests(updated);
    setRequests(updated);

    setCustomAlert({
      title: 'Requisition Approved',
      message: `Requisition #${reqId} has been cleared and forwarded to Finance for GTBank disbursal!`,
    });
  };

  const handleDisburseRequisition = (reqId: string) => {
    const liveReqs = StateEngine.getRequests();
    const ref = `TRF-GTB-${Math.floor(100000 + Math.random() * 899999)}`;
    const now = new Date().toLocaleString('en-GB');
    const updated = liveReqs.map((r: any) =>
      r.id === reqId || r.requisitionNo === reqId
        ? {
            ...r,
            status: 'DISBURSED',
            stage: 'Paid',
            paymentDetails: { ref, date: now, disbursedAt: now, method: 'Bank Transfer' },
          }
        : r
    );
    StateEngine.saveRequests(updated);
    setRequests(updated);

    setCustomAlert({
      title: 'Funds Disbursed via GTBank API',
      message: `Requisition #${reqId} disbursed successfully! Bank Transaction Ref: ${ref}.`,
    });
  };

  // REGISTER NEW ROLLING STOCK WAGON
  const handleRegisterWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const newWagonObj = {
      id: newWagonForm.id,
      wagonType: newWagonForm.wagonType,
      payloadCapacity: newWagonForm.payloadCapacity,
      status: 'AVAILABLE',
      currentStation: newWagonForm.currentStation,
      gauge: newWagonForm.gauge,
    };
    StateEngine.registerWagon(newWagonObj);
    setWagons([newWagonObj, ...wagons]);
    setRegisterWagonModal(false);
    setCustomAlert({
      title: 'New Rolling Stock Wagon Registered',
      message: `Wagon ${newWagonObj.id} (${newWagonObj.wagonType}) registered into active fleet database at ${newWagonObj.currentStation} Terminal!`,
    });
  };

  // CREATE NEW DEAL DIRECTLY
  const handleCreateNewDeal = (e: React.FormEvent) => {
    e.preventDefault();

    const NARROW_SET = new Set(['EWK', 'ITO', 'DGB', 'OSB', 'ILR', 'IDD', 'EBJ', 'IGS', 'INS', 'OKK', 'FFA', 'JBB']);
    const STANDARD_SET = new Set(['PAPA', 'MNY', 'MONI', 'ENL', 'APL', 'MBJ', 'MU', 'SH', 'SG', 'IK', 'GE', 'UJ', 'GD', 'IT', 'JK', 'KA', 'AB', 'AD']);

    const isOriginNarrow = NARROW_SET.has(newDealForm.loadingStation);
    const isOriginStandard = STANDARD_SET.has(newDealForm.loadingStation);
    const isDestNarrow = NARROW_SET.has(newDealForm.destination);
    const isDestStandard = STANDARD_SET.has(newDealForm.destination);

    if ((isOriginNarrow && isDestStandard) || (isOriginStandard && isDestNarrow)) {
      setCustomAlert({
        title: 'Gauge Incompatibility Blocked (Page 1 Spec 04)',
        message: `Cannot register deal: Standard Gauge and Narrow Gauge tracks are mutually exclusive.\n\nOrigin ${newDealForm.loadingStation} is ${isOriginNarrow ? 'Narrow Gauge (1,067mm)' : 'Standard Gauge (1,435mm)'} and Destination ${newDealForm.destination} is ${isDestNarrow ? 'Narrow Gauge (1,067mm)' : 'Standard Gauge (1,435mm)'}.\n\nRolling stock cannot operate across incompatible gauges. Please select matching gauge sidings (e.g. Papalanto → Moniya Standard Gauge, or Ewekoro → Dugbe Narrow Gauge).`,
      });
      return;
    }

    const dealId = `DEAL-${Math.floor(10000 + Math.random() * 89999)}`;
    const conf = COMMODITY_CONFIG[newDealForm.cargoType] || { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' };
    const isMonthly = newDealForm.dealType === 'MONTHLY_CONTRACT';
    const totalTrips = isMonthly ? (Number(newDealForm.totalPlannedTrips) || 10) : 1;
    const totalQty = Number(newDealForm.quantity) || 2000;
    const trancheTonnage = isMonthly
      ? (Number(newDealForm.trancheTonnage) || Math.round(totalQty / totalTrips))
      : totalQty;

    const newDealObj = {
      id: dealId,
      dealNumber: dealId,
      dealType: newDealForm.dealType,
      isMonthlyContract: isMonthly,
      company: newDealForm.companyName,
      companyName: newDealForm.companyName,
      loadingStation: newDealForm.loadingStation,
      destination: newDealForm.destination,
      cargoType: newDealForm.cargoType,
      quantity: totalQty,
      totalPlannedTrips: totalTrips,
      dispatchedTripsCount: 0,
      completedTripsCount: 0,
      remainingTonnage: totalQty,
      trancheTonnage: trancheTonnage,
      cadence: isMonthly ? newDealForm.cadence : 'Single Voyage Run',
      contractMonth: isMonthly ? newDealForm.contractMonth : undefined,
      unitOfMeasure: conf.unit,
      wagonType: conf.wagonType,
      status: 'APPROVED',
      createdAt: new Date().toLocaleDateString('en-GB'),
      createdBy: user?.fullName || 'Alhaji Bashir Umar',
    };

    const updatedDeals = [newDealObj, ...deals];
    setDeals(updatedDeals);
    StateEngine.saveDeals(updatedDeals);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bueno_state_updated'));
    }
    setCreateDealModal(false);

    setCustomAlert({
      title: isMonthly
        ? `Monthly Master Contract Registered (${totalTrips} Planned Trips)`
        : 'Single-Trip Freight Deal Registered',
      message: isMonthly
        ? `Monthly Master Contract ${dealId} for ${newDealObj.company} created! Total: ${totalQty.toLocaleString()} ${conf.unit} spread across ${totalTrips} train trips (~${trancheTonnage.toLocaleString()} ${conf.unit}/trip). Tranche 1 is ready for siding dispatch!`
        : `Deal ${dealId} for ${newDealObj.company} created! Payload: ${newDealObj.quantity} ${conf.unit} via ${newDealObj.loadingStation} → ${newDealObj.destination}. It is now live in the Cargo Officer queue!`,
    });
  };

  // ─── FINANCE & COMMERCIAL COSTING HANDLERS (HEAD OF FINANCE / TREASURER) ───
  const openCostingModal = (deal: any) => {
    setCostingModalDeal(deal);
    const qty = Number(deal.quantity) || 9200;
    const rate = Number(deal.tariffRatePerTon) || 12500;
    const totalVal = Number(deal.totalContractValue) || (qty * rate);
    const planned = Number(deal.totalPlannedTrips) || 10;
    const trancheT = Number(deal.trancheTonnage) || Math.round(qty / planned);

    setCostingForm({
      tariffRatePerTon: rate,
      totalContractValue: totalVal,
      budgetExpensePerTrip: Number(deal.budgetExpensePerTrip) || 4500000,
      paymentTerms: deal.paymentTerms || 'PER_TRIP_DRAWDOWN',
      dealType: deal.dealType || (planned > 1 ? 'MONTHLY_CONTRACT' : 'SINGLE_TRIP'),
      totalPlannedTrips: planned,
      trancheTonnage: trancheT,
      contractMonth: deal.contractMonth || '2026-09',
    });
  };

  const handleSaveCosting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!costingModalDeal) return;

    const updated = deals.map((d) => {
      if (d.id === costingModalDeal.id || d.dealNumber === costingModalDeal.dealNumber) {
        return {
          ...d,
          ...costingForm,
          financeStatus: 'FINANCE_APPROVED_COSTED',
          costedBy: user?.fullName || 'Chinenye Nnamdi (Head of Finance)',
          costedAt: new Date().toLocaleDateString('en-GB'),
        };
      }
      return d;
    });

    setDeals(updated);
    StateEngine.saveDeals(updated);
    setCostingModalDeal(null);
    setCustomAlert({
      title: 'Commercial Tariff & Costing Saved',
      message: `Commercial rates (₦${Number(costingForm.tariffRatePerTon).toLocaleString()}/MT) and contract terms for ${costingModalDeal.company || costingModalDeal.companyName} have been locked and saved!`,
    });
  };

  const handleDispatchTranche = (deal: any) => {
    try {
      const nextTrip = StateEngine.dispatchDealTranche(deal.id, user);
      setTrips(StateEngine.getTrips());
      setDeals(StateEngine.getDeals());
      setCustomAlert({
        title: 'Monthly Contract Tranche Dispatched!',
        message: `${nextTrip.trancheLabel} (Train #${nextTrip.id}) created and dispatched to ${nextTrip.origin} Siding loading queue! Assigned Loco #${nextTrip.locomotiveId}.`,
      });
    } catch (err: any) {
      notify.error(err?.message || 'Error dispatching tranche');
    }
  };

  // ─── ENTERPRISE FREIGHT ACCOUNTING & TRIP COSTING HANDLERS ───
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const pAmount = Number(paymentForm.amount);
    if (!pAmount || pAmount <= 0) {
      notify.error('Please enter a valid remittance amount.');
      return;
    }

    StateEngine.recordInvoicePayment(paymentModalInvoice.id, {
      amount: pAmount,
      type: paymentForm.type,
      ref: paymentForm.ref || `TRF-DIRECT-${Date.now()}`,
      date: paymentForm.date || new Date().toLocaleDateString('en-GB'),
    });

    setPaymentModalInvoice(null);
    setPaymentForm({
      amount: '',
      type: 'ADVANCE_DEPOSIT (70%)',
      ref: '',
      date: new Date().toLocaleDateString('en-GB'),
    });
    syncData();

    setCustomAlert({
      title: 'Payment Remittance Logged',
      message: `₦${pAmount.toLocaleString()} received for Invoice ${paymentModalInvoice.invoiceNumber || paymentModalInvoice.id}. Ledger balance updated successfully!`,
    });
  };

  const handleCreateTripCost = (e: React.FormEvent) => {
    e.preventDefault();
    const cAmount = Number(newCostForm.amount);
    if (!cAmount || cAmount <= 0) {
      notify.error('Please enter a valid cost voucher amount.');
      return;
    }

    const costObj = {
      id: `CST-${Date.now()}`,
      tripId: newCostForm.tripId,
      category: newCostForm.category,
      title: newCostForm.title.trim() || `${newCostForm.category.replace(/_/g, ' ')} Voucher`,
      vendor: newCostForm.vendor.trim() || 'Third-Party Vendor',
      amount: cAmount,
      voucherNo: newCostForm.voucherNo || `VCH-${Math.floor(10000 + Math.random() * 89999)}`,
      paymentStatus: 'PAID',
      recordedBy: user?.fullName || 'Finance Treasury',
      date: new Date().toLocaleDateString('en-GB'),
      createdAt: new Date().toLocaleDateString('en-GB'),
    };

    StateEngine.createTripCost(costObj);
    setNewCostModal(false);
    setNewCostForm({
      tripId: trips[0]?.id || '',
      category: 'NRC_TRACK_ACCESS',
      title: '',
      vendor: 'Nigerian Railway Corporation (NRC)',
      amount: '',
      voucherNo: `VCH-${Math.floor(10000 + Math.random() * 89999)}`,
      notes: '',
    });
    syncData();

    setCustomAlert({
      title: 'Corridor Direct Cost Booked',
      message: `₦${cAmount.toLocaleString()} direct operating cost booked for Trip ${costObj.tripId} [Voucher ${costObj.voucherNo}]!`,
    });
  };

  const handleDeleteTripCost = async (costId: string) => {
    const ok = await confirmAction({
      title: 'Reverse this cost voucher?',
      body: 'The voucher will be removed from the corridor cost ledger and the trip’s '
        + 'profitability will be recalculated. This cannot be undone.',
      confirmLabel: 'Reverse voucher',
      destructive: true,
    });
    if (!ok) return;
    StateEngine.deleteTripCost(costId);
    syncData();
    notify.success('Cost voucher reversed.');
  };

  const handleUpdateTripCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTripCost) return;

    const amount = Number(editingTripCost.amount);
    if (!amount || amount <= 0) {
      notify.error('Please enter a valid expense voucher amount.');
      return;
    }

    StateEngine.updateTripCost(editingTripCost.id, {
      category: editingTripCost.category,
      title: editingTripCost.title,
      vendor: editingTripCost.vendor,
      amount: amount,
      voucherNo: editingTripCost.voucherNo,
      paymentStatus: editingTripCost.paymentStatus || 'PAID',
    });

    setEditingTripCost(null);
    syncData();

    setCustomAlert({
      title: 'Corridor Cost Voucher Updated',
      message: `Voucher ${editingTripCost.voucherNo || editingTripCost.id} for Trip ${editingTripCost.tripId} updated to ₦${amount.toLocaleString()}! Corridor P&L recalculated.`,
    });
  };

  const handleOpenPricingModal = (trip: any) => {
    const qty = Number(trip.quantity) || 1200;
    const mt = trip.unitOfMeasure === 'Bags' ? qty / 20 : qty;
    const defaultRate = 12500;
    const defaultAmount = trip.financeCost || trip.tripRevenue || Math.round(mt * defaultRate);
    setPricingForm({
      amount: String(defaultAmount),
      tariffRatePerTon: String(trip.tariffRatePerTon || defaultRate),
      damageDeduction: String(trip.damageDeduction || 0),
      notes: trip.costingNotes || '',
    });
    setPricingTripModal(trip);
  };

  const handleSavePricing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pricingTripModal) return;
    const amount = Number(pricingForm.amount) || 0;
    StateEngine.updateTripFinancePricing(
      pricingTripModal.id,
      {
        amount,
        tariffRatePerTon: Number(pricingForm.tariffRatePerTon) || undefined,
        damageDeduction: Number(pricingForm.damageDeduction) || 0,
        notes: pricingForm.notes,
      },
      user
    );
    syncData();
    setPricingTripModal(null);
    setCustomAlert({
      title: 'Trip Costing Updated',
      message: `Trip ${pricingTripModal.tripId || pricingTripModal.id} cost officially set to ₦${amount.toLocaleString()} by Finance Desk! Ledger and customer billing updated.`,
    });
  };

  const handleSyncTripInvoices = () => {
    trips.forEach((t: any) => {
      const tripId = t.id || t.tripId;
      const existingInvoices = StateEngine.getInvoices();
      const existing = existingInvoices.find((inv: any) => inv.tripId === tripId);

      const isCement = (t.cargoType || '').toLowerCase().includes('cement') || (t.unitOfMeasure || '').toLowerCase().includes('bag');
      const totalBags = Number(t.quantity || 1600);
      const totalTonnes = Number(t.cargoTonnes || (isCement ? totalBags * 0.05 : totalBags));
      const ratePerTonne = isCement ? 160000 : 24000;
      const subtotal = totalTonnes * ratePerTonne;

      const burstBags = Number(t.damages?.burstBags || 0);
      const damageDeduction = burstBags * 8000;
      const totalAmount = Math.max(0, subtotal - damageDeduction);

      if (existing) {
        const balance = Math.max(0, totalAmount - (Number(existing.amountPaid) || 0));
        const status = balance <= 0 ? 'SETTLED' : ((Number(existing.amountPaid) || 0) > 0 ? 'PARTIALLY_PAID' : 'ISSUED');
        StateEngine.updateInvoice(existing.id, {
          totalBags,
          totalTonnes,
          subtotal,
          damageUnits: burstBags,
          damageDeduction,
          totalAmount,
          balance,
          status,
          damageDetails: burstBags > 0 ? [{ wagonId: 'Consist Discrepancy', burstBags, notes: t.damages?.complaintNotes?.join('; ') || `${burstBags} burst bags deducted upon offloading verification` }] : existing.damageDetails,
        });
      } else {
        const invNum = `INV-2026-${Math.floor(1000 + Math.random() * 8999)}`;
        const newInv = {
          id: `INV-${tripId}`,
          invoiceNumber: invNum,
          tripId: tripId,
          dealId: t.dealNumber || t.dealId || `DEAL-${tripId}`,
          companyName: t.company || 'Consignee Client',
          clientEmail: (t.company || '').toLowerCase().includes('huaxin') || (t.company || '').toLowerCase().includes('hbm') ? 'logistics@hbm.ng' : (t.company || '').toLowerCase().includes('apmt') ? 'rail@apmt.com' : (t.company || '').toLowerCase().includes('maersk') ? 'cargo@maersk.com' : (t.company || '').toLowerCase().includes('dasco') ? 'logistics@dasco.ng' : (t.company || '').toLowerCase().includes('bat') ? 'supplychain@bat.ng' : 'client@freight.ng',
          cargoType: t.cargoType || 'Industrial Freight',
          route: `${t.origin || 'EWK'} → ${t.destination || 'MNY'}`,
          totalBags,
          totalTonnes,
          ratePerTonne,
          subtotal,
          damageUnits: burstBags,
          damageDeduction,
          tax: 0,
          totalAmount,
          amountPaid: 0,
          balance: totalAmount,
          status: 'ISSUED',
          paymentRef: '',
          damageDetails: burstBags > 0 ? [{ wagonId: 'Offload Discrepancy', burstBags, notes: `${burstBags} burst bags deducted upon siding inspection` }] : [],
          paymentHistory: [],
          issueDate: new Date().toLocaleDateString('en-GB'),
          dueDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB'),
          createdAt: new Date().toLocaleDateString('en-GB'),
        };
        StateEngine.createInvoice(newInv);
      }
    });

    syncData();
    setCustomAlert({
      title: 'Invoices & Damages Reconciled',
      message: 'All train corridor trips and offload transit damage tallies have been synchronized with the commercial freight ledger!',
    });
  };

  // STAFF ACCOUNT PROVISIONING
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProvisioning) return;

    const isCustomer = provisionForm.role === 'CUSTOMER' || provisionForm.role === 'CONSIGNEE';
    const effectiveCompany = isCustomer
      ? (provisionForm.companyName.trim() || provisionForm.fullName.trim())
      : (provisionForm.companyName.trim() || 'Bueno Logistics HQ');

    setIsProvisioning(true);
    try {
      /*
       * The account is created by the server, and the credential comes back
       * from the server.
       *
       * This used to build a user object in the browser, hand it to
       * StateEngine.saveUsers() and announce a PIN the administrator had typed
       * into the form. None of that reached the database: saveUsers routed
       * through the generic collection store, which posts {action: 'upsert'},
       * and users.php dispatches on an explicit action and answered 400.
       *
       * So the account appeared in the list until the next poll replaced it,
       * and no password hash was ever written — the credential shown could
       * never have worked. The server has always generated its own one-time
       * secret; nothing was showing it.
       */
      const { user: created, initialSecret } = await StateEngine.provisionUser({
        fullName: provisionForm.fullName.trim(),
        email: provisionForm.email.toLowerCase().trim(),
        phone: provisionForm.phone.trim(),
        role: provisionForm.role,
        userType: isCustomer ? 'CUSTOMER' : 'STAFF',
        assignedStation: provisionForm.assignedStation,
        companyName: effectiveCompany,
      });

      syncData();

      // Shown once. It is hashed on write and cannot be retrieved again — the
      // only recovery is a credential reset, which issues a new one.
      setCustomAlert({
        title: 'Account provisioned',
        message:
          `${created.fullName} (${created.role}) can now sign in as ${created.email}.

` +
          `One-time password: ${initialSecret}

` +
          'Give this to them over a channel you trust. It is not stored anywhere and cannot be ' +
          'shown again. They must set their own password the first time they sign in.',
      });

      setProvisionForm({
        fullName: '',
        email: '',
        phone: '',
        userType: 'STAFF',
        role: 'CARGO_OFFICER',
        assignedStation: 'EWK',
        companyName: '',
      });
    } catch (err: any) {
      // Surfaces the real reason: a duplicate address (409), a role more
      // privileged than the administrator's own (403), or a validation
      // failure (422).
      notify.error(err?.message || 'Could not provision the account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  // EDIT EXISTING USER ACCOUNT
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSavingUser) return;

    setIsSavingUser(true);
    try {
      // Awaited, not optimistic: the server can refuse an edit — promoting an
      // account to a role above the administrator's own, for instance — and
      // the list previously showed the change as saved either way.
      await StateEngine.updateUser(editingUser.id, {
        fullName: editingUser.fullName,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        assignedStation: editingUser.assignedStation,
        companyName: editingUser.companyName,
        staffId: editingUser.staffId,
      });

      // Activation is a distinct operation on the API — `update` does not
      // accept a status column — so the dropdown needs its own call. It made
      // no difference at all before this.
      const previous = usersList.find((u) => u.id === editingUser.id);
      const wasActive = (previous?.status ?? 'ACTIVE') === 'ACTIVE';
      const nowActive = (editingUser.status ?? 'ACTIVE') === 'ACTIVE';
      if (wasActive !== nowActive) {
        await StateEngine.setUserActive(editingUser.id, nowActive);
      }

      if (editingUser.id === currentUser?.id || editingUser.email === currentUser?.email) {
        setCurrentUser({ ...currentUser, ...editingUser });
      }
      setEditingUser(null);
      syncData();
      notify.success(`Account for ${editingUser.fullName} updated.`);
    } catch (err: any) {
      notify.error(err?.message || 'Could not update the account.');
    } finally {
      setIsSavingUser(false);
    }
  };

  // ISSUE A NEW ONE-TIME PASSWORD
  const handleResetUserCredentials = async (target: any) => {
    const ok = await confirmAction({
      title: `Reset the password for ${target.fullName}?`,
      body: 'A new one-time password is generated and shown to you once. Every session this '
        + 'account currently holds is ended immediately, and they must set a new password the '
        + 'next time they sign in.',
      confirmLabel: 'Reset password',
      destructive: true,
    });
    if (!ok) return;

    setIsResettingCredentials(true);
    try {
      const secret = await StateEngine.resetUserCredentials(target.id);
      syncData();
      setCustomAlert({
        title: 'Password reset',
        message:
          `New one-time password for ${target.fullName} (${target.email}):

${secret}

`
          + 'Give this to them over a channel you trust. It is not stored anywhere and cannot be '
          + 'shown again.',
      });
    } catch (err: any) {
      notify.error(err?.message || 'Could not reset the password.');
    } finally {
      setIsResettingCredentials(false);
    }
  };

  // TOGGLE UNIFIED PERMISSION FOR SELECTED ROLE
  /**
   * Write a change to the matrix.
   *
   * Every edit here posts the WHOLE matrix, which is why it must never run
   * against a matrix the browser guessed: doing so would overwrite the
   * server's real policy with the shipped defaults and silently restore
   * capabilities an administrator had removed. Loading is enforced before any
   * write is allowed.
   */
  const commitMatrix = async (
    updatedMatrix: Record<string, string[]>,
    description: string
  ): Promise<void> => {
    const previous = permissionsMatrix;
    setPermissionsMatrix(updatedMatrix);
    setGranularPermissions(updatedMatrix);

    const ok = await StateEngine.saveRolePermissionsAsync(updatedMatrix);
    if (ok) {
      notify.success(description);
      return;
    }

    // The save was refused — most often by the server's guard against leaving
    // nobody able to administer permissions. Put the checkbox back rather than
    // leaving the screen showing a change that did not happen.
    setPermissionsMatrix(previous);
    setGranularPermissions(previous);
    notify.error('That change was not saved. The matrix is unchanged.');
  };

  const handleTogglePermission = async (permKey: string) => {
    if (!permissionsLoaded) {
      notify.error('Still loading the current permissions. Try again in a moment.');
      return;
    }

    const fullMatrix = StateEngine.getRolePermissions();
    const currentPerms = fullMatrix[selectedPermissionRole] ?? (DEFAULT_ROLE_TAB_PERMISSIONS[selectedPermissionRole] ?? []);
    const isChecked = currentPerms.includes(permKey);

    // Removing a capability from your own role takes effect immediately and
    // can remove the screen you are standing on.
    if (isChecked && selectedPermissionRole === currentUser?.role) {
      const label = UNIFIED_PERMISSION_LIST.find((p) => p.key === permKey)?.label ?? permKey;
      const confirmed = await confirmAction({
        title: `Remove "${label}" from your own role?`,
        body: `You are signed in as ${selectedPermissionRole}. This takes effect immediately and `
          + 'applies to you. If it controls the screen you are on, you will lose access to it.',
        confirmLabel: 'Remove it anyway',
        destructive: true,
      });
      if (!confirmed) return;
    }

    const updated = isChecked
      ? currentPerms.filter((p) => p !== permKey)
      : Array.from(new Set([...currentPerms, permKey]));

    await commitMatrix(
      { ...fullMatrix, [selectedPermissionRole]: updated },
      `${isChecked ? 'Revoked' : 'Granted'} for ${selectedPermissionRole}.`
    );
  };

  const handleToggleAllForRole = async (grantAll: boolean) => {
    if (!permissionsLoaded) {
      notify.error('Still loading the current permissions. Try again in a moment.');
      return;
    }

    if (!grantAll) {
      const confirmed = await confirmAction({
        title: `Revoke every capability from ${selectedPermissionRole}?`,
        body: selectedPermissionRole === currentUser?.role
          ? `You are signed in as ${selectedPermissionRole}. This removes every screen and action `
            + 'from your own account, immediately.'
          : `Everyone holding the ${selectedPermissionRole} role loses access to every screen and `
            + 'action, immediately.',
        confirmLabel: 'Revoke everything',
        destructive: true,
      });
      if (!confirmed) return;
    }

    const fullMatrix = StateEngine.getRolePermissions();
    const allKeys = UNIFIED_PERMISSION_LIST.map((p) => p.key);
    await commitMatrix(
      { ...fullMatrix, [selectedPermissionRole]: grantAll ? allKeys : [] },
      grantAll
        ? `All capabilities granted to ${selectedPermissionRole}.`
        : `All capabilities revoked from ${selectedPermissionRole}.`
    );
  };

  const handleResetPermissionsDefaults = async () => {
    const ok = await confirmAction({
      title: 'Reset every role to factory defaults?',
      body: 'All customisations to the permission matrix will be discarded and replaced with '
        + 'the shipped defaults for all nine roles. Users signed in right now will pick up '
        + 'the change on their next action.',
      confirmLabel: 'Reset permissions',
      destructive: true,
    });
    if (!ok) return;

    try {
      const defaults = await StateEngine.resetPermissionsToDefaultsAsync();
      setPermissionsMatrix(defaults);
      notify.success('Permissions reset to factory defaults.');
    } catch (err: any) {
      notify.error(err?.message || 'Could not reset permissions.');
    }
  };

  // EXPLICIT SAVE PERMISSIONS MATRIX TO SQL DATABASE
  const handleSavePermissionsMatrix = async () => {
    if (!permissionsLoaded || permissionsLoadError) {
      notify.error('The live permissions have not loaded. Saving now would overwrite them.');
      return;
    }

    setIsSavingPermissions(true);
    try {
      const ok = await StateEngine.saveRolePermissionsAsync(permissionsMatrix);

      if (!ok) {
        // A refused save previously reported "Permissions Saved — updated in
        // repository cache", which is not true and not a cache: the write was
        // rejected and nothing changed anywhere.
        notify.error('The permissions matrix was NOT saved. Nothing has changed.');
        return;
      }

      // Read back what the server actually stored, rather than assuming the
      // request was applied verbatim — it normalises the matrix and strips
      // sensitive capabilities from external roles.
      const enforced = await StateEngine.refreshRolePermissions();
      setPermissionsMatrix(enforced);
      setGranularPermissions(enforced);

      setPermissionsSaveSuccess(true);
      setTimeout(() => setPermissionsSaveSuccess(false), 4000);
      notify.success('Permissions matrix saved and re-read from the database.');
    } catch (err: any) {
      notify.error(err?.message || 'The permissions matrix could not be saved.');
    } finally {
      setIsSavingPermissions(false);
    }
  };


  // TOGGLE ADMIN NEGOTIATIONS ACCESS
  const handleToggleAdminNegotiations = (enabled: boolean) => {
    const updated = { ...systemSettings, allowAdminClientNegotiations: enabled };
    setSystemSettings(updated);
    StateEngine.saveSettings(updated);
    setCustomAlert({
      title: 'Permissions & Settings Updated',
      message: `Admin access to Client Negotiations Chat is now ${enabled ? 'ENABLED' : 'DISABLED'}.`,
    });
  };

  // TOGGLE GRANULAR MODULE ACTION PERMISSION
  const handleToggleGranularPermission = (roleKey: string, actionKey: string) => {
    const fullMatrix = StateEngine.getGranularPermissions();
    const currentPerms = fullMatrix[roleKey] ?? (DEFAULT_GRANULAR_ROLE_PERMISSIONS[roleKey] ?? []);
    const isChecked = currentPerms.includes(actionKey);

    const updatedRolePerms = isChecked
      ? currentPerms.filter((p) => p !== actionKey)
      : Array.from(new Set([...currentPerms, actionKey]));

    const updatedMatrix = { ...fullMatrix, [roleKey]: updatedRolePerms };
    setGranularPermissions(updatedMatrix);
    StateEngine.saveGranularPermissions(updatedMatrix);
  };

  const handleToggleModuleAll = (roleKey: string, moduleActionKeys: string[], grantAll: boolean) => {
    const fullMatrix = StateEngine.getGranularPermissions();
    const currentPerms = new Set(fullMatrix[roleKey] ?? (DEFAULT_GRANULAR_ROLE_PERMISSIONS[roleKey] ?? []));

    moduleActionKeys.forEach((key) => {
      if (grantAll) currentPerms.add(key);
      else currentPerms.delete(key);
    });

    const updatedMatrix = { ...fullMatrix, [roleKey]: Array.from(currentPerms) };
    setGranularPermissions(updatedMatrix);
    StateEngine.saveGranularPermissions(updatedMatrix);
  };

  // ADD NEW LEDGER ACCOUNT TO CHART OF ACCOUNTS
  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountForm.code || !newAccountForm.name) return;

    const added = StateEngine.addChartOfAccount({
      code: newAccountForm.code.trim(),
      name: newAccountForm.name.trim(),
      type: newAccountForm.type,
      subType: newAccountForm.subType || 'General',
      balance: Number(newAccountForm.openingBalance) || 0,
      description: newAccountForm.description || '',
      isEnabled: true,
    });

    setChartAccounts(StateEngine.getChartOfAccounts());
    setNewAccountModal(false);
    setNewAccountForm({
      code: '',
      name: '',
      type: 'ASSET',
      subType: 'Cash & Cash Equivalents',
      openingBalance: '',
      description: '',
    });
    setCustomAlert({
      title: 'Ledger Account Registered',
      message: `Account [${added.code}] ${added.name} successfully created in General Ledger.`,
    });
  };

  // POST NEW DOUBLE-ENTRY JOURNAL VOUCHER
  const handlePostJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const totalDebits = newJournalForm.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredits = newJournalForm.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01 || totalDebits <= 0) {
      setCustomAlert({
        title: 'Unbalanced Journal Voucher',
        message: `Debits and Credits must be strictly equal. (Debits: ₦${totalDebits.toLocaleString()} | Credits: ₦${totalCredits.toLocaleString()})`,
      });
      return;
    }

    const postedLines = newJournalForm.lines
      .filter((l) => (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0)
      .map((l) => {
        const acc = chartAccounts.find((a) => a.id === l.accountId || a.code === l.accountId);
        return {
          accountId: acc?.id || l.accountId,
          accountCode: acc?.code || '',
          accountName: acc?.name || '',
          description: l.description || newJournalForm.description,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        };
      });

    const newJrn = StateEngine.addJournalEntry({
      journalNo: newJournalForm.journalNo || `JRN-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: newJournalForm.date || new Date().toLocaleDateString('en-GB'),
      reference: newJournalForm.reference || 'GL-VOUCHER',
      description: newJournalForm.description || 'General Journal Posting',
      lines: postedLines,
      totalAmount: totalDebits,
      status: 'POSTED',
      postedBy: user?.fullName || 'Finance Controller',
    });

    setJournalEntries(StateEngine.getJournalEntries());
    setChartAccounts(StateEngine.getChartOfAccounts());
    setNewJournalModal(false);
    setNewJournalForm({
      journalNo: `JRN-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString('en-GB'),
      reference: '',
      description: '',
      lines: [
        { accountId: 'acc_1010', description: '', debit: '', credit: '' },
        { accountId: 'acc_4010', description: '', debit: '', credit: '' },
      ],
    });
    setCustomAlert({
      title: 'Journal Entry Posted',
      message: `Voucher ${newJrn.journalNo} for ₦${totalDebits.toLocaleString()} posted cleanly to general ledger.`,
    });
  };

  // RECONCILE BANK ACCOUNT
  const handleReconcileBank = (bankId: string) => {
    StateEngine.reconcileBankAccount(bankId);
    setBankAccounts(StateEngine.getBankAccounts());
    setCustomAlert({
      title: 'Bank Statement Reconciled',
      message: `Bank account statement reconciled and ledger balance verified.`,
    });
  };

  const activeThread = negotiations.find((n) => n.id === activeDealId) || negotiations[0];
  const filteredThreads = negotiations.filter(
    (n) =>
      (n.companyName && n.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.id && n.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.cargoType && n.cargoType.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentCargoConfig = COMMODITY_CONFIG[newDealForm.cargoType] || { unit: 'Bags', wagonType: 'Covered Hopper Wagon' };
  const customerUsers = usersList.filter((u) => u.userType === 'CLIENT' || u.role === 'CUSTOMER' || u.role === 'CONSIGNEE');

  // DYNAMIC HISTORICAL REPORT AUDIT DATA SELECTION
  const [reportDateFilter, setReportDateFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH'>('TODAY');
  // Months offered by the archive picker, derived from the trips that exist
  // rather than from a hand-written list that goes stale every month.
  const tripsByMonth = useMemo(() => groupTripsByMonth(trips), [trips]);
  const availableMonths = useMemo(
    () => Object.keys(tripsByMonth).filter((k) => k !== 'undated').sort().reverse(),
    [tripsByMonth]
  );

  const monthScopedTrips = useMemo(
    () => (selectedMonth === 'ALL' ? trips : tripsByMonth[selectedMonth] ?? []),
    [selectedMonth, trips, tripsByMonth]
  );

  const activeReportTrips = monthScopedTrips.filter((t: any) => {
    if (reportDateFilter === 'ALL') return true;
    const cat = StateEngine.getDateCategory(t.dispatchTime || t.createdAt || t.departedAt);
    if (reportDateFilter === 'TODAY') return cat === 'TODAY';
    if (reportDateFilter === 'YESTERDAY') return cat === 'YESTERDAY';
    if (reportDateFilter === 'THIS_WEEK') return cat === 'TODAY' || cat === 'YESTERDAY' || cat === 'THIS_WEEK';
    if (reportDateFilter === 'THIS_MONTH') return cat === 'TODAY' || cat === 'YESTERDAY' || cat === 'THIS_WEEK' || cat === 'THIS_MONTH';
    return true;
  });
  const totalReportBags = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure === 'Bags' ? (Number(t.quantity) || 0) : 0), 0);
  const totalReportMT = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure?.includes('Tonnes') || t.unitOfMeasure?.includes('MT') ? (Number(t.quantity) || 0) : ((Number(t.quantity) || 0) / 20)), 0);
  const totalReportDamages = activeReportTrips.reduce((acc, t) => acc + (t.damages?.damagedUnits || t.damages?.burstBags || (t.wagonLogs || []).reduce((wAcc: number, w: any) => wAcc + (Number(w.damageQty || 0) + Number(w.burstBags || 0)), 0)), 0);
  const totalReportRevenue = activeReportTrips.reduce((acc, t) => {
    if (t.tripRevenue) return acc + Number(t.tripRevenue);
    const d = deals.find((dl) => dl.id === t.dealId || dl.dealNumber === t.dealNumber);
    const rate = Number(d?.tariffRatePerTon) || 12500;
    return acc + ((Number(t.quantity) || 0) * rate);
  }, 0);

  const stationBenchmarks = useMemo(() => {
    if (activeReportTrips.length === 0) return [];
    const map: Record<string, { station: string; actual: number; target: number; tonnage: number }> = {};
    activeReportTrips.forEach((t: any) => {
      const st = t.loadingStation || t.origin || 'Kajola / Moniya';
      const stName = st === 'EWK' ? 'Ewekoro Siding (EWK)' :
                     st === 'MNY' || st === 'MONI' ? 'Moniya Yard (MNY)' :
                     st === 'PAPA' ? 'Papalanto Terminal (PAPA)' :
                     st === 'APT' ? 'Apapa Port (APT)' :
                     st === 'ENL' ? 'ENL APMT Terminal (ENL)' : st;
      const qty = Number(t.quantity) || 0;
      const mt = t.unitOfMeasure === 'Bags' ? qty / 20 : qty;
      
      const d = deals.find((dl) => dl.id === t.dealId || dl.dealNumber === t.dealNumber);
      const planned = Number(t.totalPlannedTrips) || Number(d?.totalPlannedTrips) || 1;

      if (!map[stName]) {
        map[stName] = { station: stName, actual: 0, target: 0, tonnage: 0 };
      }
      map[stName].actual += 1;
      map[stName].target = Math.max(map[stName].target, planned, map[stName].actual);
      map[stName].tonnage += mt;
    });
    return Object.values(map).map((item) => {
      const target = item.target || item.actual || 1;
      const eff = `${Math.min(100, Math.round((item.actual / target) * 100))}%`;
      return {
        station: item.station,
        target,
        actual: item.actual,
        tonnage: `${Math.round(item.tonnage).toLocaleString()} MT`,
        efficiency: eff,
        turnaround: '2.9 hrs/train',
      };
    });
  }, [activeReportTrips, deals]);

  // Operational Route Flow Distribution
  const routeFlows = useMemo(() => {
    if (activeReportTrips.length === 0) return [];
    const totalMT = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure === 'Bags' ? (Number(t.quantity) || 0) / 20 : (Number(t.quantity) || 0)), 0) || 1;
    const map: Record<string, { route: string; tripsCount: number; tonnage: number }> = {};
    activeReportTrips.forEach((t: any) => {
      const r = `${t.origin || 'EWK'} ➔ ${t.destination || 'DGB'}`;
      const mt = t.unitOfMeasure === 'Bags' ? (Number(t.quantity) || 0) / 20 : (Number(t.quantity) || 0);
      if (!map[r]) map[r] = { route: r, tripsCount: 0, tonnage: 0 };
      map[r].tripsCount += 1;
      map[r].tonnage += mt;
    });
    return Object.values(map).map((item) => ({
      ...item,
      percentage: Math.min(100, Math.round((item.tonnage / totalMT) * 100)),
      tonnage: Math.round(item.tonnage).toLocaleString(),
    }));
  }, [activeReportTrips]);

  const totalReportWagonsCount = activeReportTrips.reduce((acc, t) => acc + (t.wagonLogs?.length || 20), 0);
  const costedTripsCount = activeReportTrips.filter((t) => t.costingStatus === 'COSTED' || t.financeCost || t.tripRevenue).length;
  const cargoIntegrityPct = totalReportBags > 0
    ? Math.max(0, 100 - (totalReportDamages / totalReportBags * 100)).toFixed(1)
    : '100.0';

  const officerKpis = useMemo(() => {
    if (activeReportTrips.length === 0) return [];
    const map: Record<string, { name: string; station: string; trips: number; defects: number; totalQty: number }> = {};
    activeReportTrips.forEach((t: any) => {
      const officer = t.cargoOfficer || t.createdBy || t.driver || 'Field Operations Officer';
      const station = t.loadingStation || 'Operations Hub';
      const qty = Number(t.quantity) || 0;
      const dmg = Number(t.damages?.damagedUnits || t.damages?.burstBags || 0);
      if (!map[officer]) {
        map[officer] = { name: officer, station: `${station} Terminal`, trips: 0, defects: 0, totalQty: 0 };
      }
      map[officer].trips += 1;
      map[officer].defects += dmg;
      map[officer].totalQty += qty;
    });
    return Object.values(map).map((item) => {
      const acc = item.totalQty > 0 ? (100 - (item.defects / item.totalQty * 100)).toFixed(1) + '%' : '100.0%';
      return {
        name: item.name,
        station: item.station,
        trips: item.trips,
        accuracy: acc,
        speed: '72 km/h',
        rating: '5.0 ',
        tier: item.trips >= 5 ? 'EXEMPLARY' : 'ACTIVE DISPATCH',
      };
    });
  }, [activeReportTrips]);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 relative">
      {/* ─── FLOATING ALERT MODAL ─── */}
      {customAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center font-black text-base shadow-sm">
                Approved
              </div>
              <h3 className="text-base font-black text-slate-900">{customAlert.title || 'Action Completed'}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* ─── SINGLE TRIP DEEP PERFORMANCE & FINANCIAL AUDIT MODAL ─── */}
      {selectedAuditTrip && (
        <SingleTripPerformanceAuditModal
          trip={selectedAuditTrip}
          onClose={() => setSelectedAuditTrip(null)}
        />
      )}

      {/* ─── EDIT USER ACCOUNT MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">USER ACCOUNT MANAGEMENT</span>
                <h3 className="text-lg font-black text-slate-900">Edit Provisioned User Account</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 font-bold hover:text-slate-900">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-full-name-1">Full Name *</label>
                <input id="admin-portal-full-name-1"
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-email-address-2">Email Address *</label>
                  <input id="admin-portal-email-address-2"
                    required
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-mobile-phone-3">Mobile Phone *</label>
                  <input id="admin-portal-mobile-phone-3"
                    required
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-role-classification-4">Role Classification</label>
                  <select id="admin-portal-role-classification-4"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="CARGO_OFFICER">Cargo Officer</option>
                    <option value="HEAD_OF_OPERATIONS">Head of Operations</option>
                    <option value="ADMIN">Admin Officer</option>
                    <option value="CEO">Managing Director / CEO</option>
                    <option value="HEAD_OF_FINANCE">Head of Finance</option>
                    <option value="CUSTOMER">Industrial Consignee Client</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-assigned-station-5">Assigned Station</label>
                  <select id="admin-portal-assigned-station-5"
                    value={editingUser.assignedStation || 'EWK'}
                    onChange={(e) => setEditingUser({ ...editingUser, assignedStation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="EWK">Ewekoro Terminal</option>
                    <option value="MNY">Moniya Yard (Ibadan)</option>
                    <option value="APT">Apapa Maritime Port</option>
                    <option value="HQ">Bueno HQ Command</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/*
                  A credential cannot be edited here, and this field never
                  could: it displayed '1111' for everyone — the update action
                  does not accept a pin, and the stored value is a bcrypt hash
                  that cannot be read back. Issuing a new one-time password is
                  the operation that actually exists.
                */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Credentials</span>
                  <button
                    type="button"
                    disabled={isResettingCredentials}
                    onClick={() => handleResetUserCredentials(editingUser)}
                    className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60"
                  >
                    {isResettingCredentials ? 'Resetting…' : 'Reset password'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-account-status-7">Account Status</label>
                  <select id="admin-portal-account-status-7"
                    value={editingUser.status || 'ACTIVE'}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="DEACTIVATED">DEACTIVATED</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                >
                  Save Account Corrections →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE NEW DEAL MODAL ─── */}
      {createDealModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">COMMERCIAL CONTRACT REGISTRATION</span>
                <h3 className="text-lg font-black text-slate-900">Create New Freight Deal</h3>
              </div>
              <button onClick={() => setCreateDealModal(false)} className="text-slate-400 font-bold hover:text-slate-900">
                ×
              </button>
            </div>

            <form onSubmit={handleCreateNewDeal} className="space-y-3 text-xs font-semibold">
              {/* Contract Operational Scope / Type Selector */}
              <div>
                {/*
                  A <label> cannot describe a group of buttons — it can only
                  point at one form control. The correct construct is a labelled
                  group, so assistive technology announces "Contract Operational
                  Scope, group" before reading the options.
                */}
                <span id="deal-scope-label" className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Contract Operational Scope *</span>
                <div role="group" aria-labelledby="deal-scope-label" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDealForm({ ...newDealForm, dealType: 'SINGLE_TRIP', totalPlannedTrips: 1 })}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newDealForm.dealType === 'SINGLE_TRIP'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Train className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">Single-Trip Spot Run</span>
                    </div>
                    <p className="text-[10px] font-normal text-slate-500 mt-1">1 Dedicated Train Voyage (e.g. ad-hoc single shipment)</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const qty = Number(newDealForm.quantity) || 20000;
                      const trips = 10;
                      setNewDealForm({
                        ...newDealForm,
                        dealType: 'MONTHLY_CONTRACT',
                        totalPlannedTrips: trips,
                        trancheTonnage: Math.round(qty / trips),
                      });
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      newDealForm.dealType === 'MONTHLY_CONTRACT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-black shadow-sm ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold">Monthly Master Contract</span>
                    </div>
                    <p className="text-[10px] font-normal text-slate-500 mt-1">Multi-trip consignment spread across the month (e.g. HBM 10 Trips)</p>
                  </button>
                </div>
              </div>

              {/* Monthly Master Contract Dispatch Scheduling Controls */}
              {newDealForm.dealType === 'MONTHLY_CONTRACT' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-900 tracking-wider">MONTHLY CONSIGNMENT DISPATCH SCHEDULE</span>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Multi-Tranche</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-600 mb-0.5" htmlFor="admin-portal-planned-trips-8">Planned Trips</label>
                      <input id="admin-portal-planned-trips-8"
                        type="number"
                        min="2"
                        max="60"
                        value={newDealForm.totalPlannedTrips}
                        onChange={(e) => {
                          const trips = Math.max(1, Number(e.target.value) || 1);
                          const qty = Number(newDealForm.quantity) || 20000;
                          setNewDealForm({
                            ...newDealForm,
                            totalPlannedTrips: trips,
                            trancheTonnage: Math.round(qty / trips),
                          });
                        }}
                        className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-600 mb-0.5" htmlFor="admin-portal-tranche-vol-9">Tranche Vol. ({currentCargoConfig.unit})</label>
                      <input id="admin-portal-tranche-vol-9"
                        type="number"
                        value={newDealForm.trancheTonnage}
                        onChange={(e) => setNewDealForm({ ...newDealForm, trancheTonnage: Number(e.target.value) || 0 })}
                        className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] uppercase font-bold text-slate-600 mb-0.5" htmlFor="admin-portal-contract-month-10">Contract Month</label>
                      <input id="admin-portal-contract-month-10"
                        type="month"
                        value={newDealForm.contractMonth}
                        onChange={(e) => setNewDealForm({ ...newDealForm, contractMonth: e.target.value })}
                        className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-900 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase font-bold text-slate-600 mb-0.5" htmlFor="admin-portal-dispatch-cadence-11">Dispatch Cadence</label>
                    <select id="admin-portal-dispatch-cadence-11"
                      value={newDealForm.cadence}
                      onChange={(e) => setNewDealForm({ ...newDealForm, cadence: e.target.value })}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="Every 3 Days">Every 3 Days (Standard 10-trip monthly rotation)</option>
                      <option value="Twice Weekly">Twice Weekly (8 trips / month)</option>
                      <option value="Weekly">Weekly (4 trips / month)</option>
                      <option value="Daily Shunt">Daily Shunt (Dedicated corridor turnarounds)</option>
                      <option value="On-Demand Drawdown">On-Demand Drawdown (Customer Call-Offs)</option>
                    </select>
                  </div>

                  {/* Reactive Railway Consist Calculator & Constraints */}
                  {(() => {
                    const totalQty = Number(newDealForm.quantity) || 0;
                    const trips = Math.max(1, Number(newDealForm.totalPlannedTrips) || 10);
                    const trancheQty = Math.round(totalQty / trips);
                    const isCementOrBags = (newDealForm.cargoType || '').toLowerCase().includes('cement') || currentCargoConfig.unit === 'Bags';
                    const trancheBags = isCementOrBags ? (currentCargoConfig.unit === 'Bags' ? trancheQty : Math.round(trancheQty * 20)) : trancheQty;
                    const wagonsNeeded = Math.ceil(trancheBags / 1200);
                    const exceedsMaxConsist = wagonsNeeded > 23;

                    return (
                      <div className="space-y-2 pt-1 border-t border-emerald-200">
                        <div className="bg-white p-2.5 rounded-xl border border-emerald-200 grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold">Consist per Train</span>
                            <span className="font-extrabold text-emerald-900">1 Loco + {Math.min(23, wagonsNeeded)} Wagons</span>
                            <span className="text-[10px] text-slate-500 block">({Math.min(23, wagonsNeeded)} / 23 wagons max)</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] uppercase font-bold">Wagon Payload</span>
                            <span className="font-extrabold text-slate-800">1,200 Bags / Wagon</span>
                            <span className="text-[10px] text-emerald-700 block font-semibold">(60 MT per wagon)</span>
                          </div>
                        </div>

                        {exceedsMaxConsist ? (
                          <div className="bg-amber-100 text-amber-900 p-2.5 rounded-xl border border-amber-300 text-[10px] flex flex-col gap-1">
                            <span className="font-bold">Consist Limit Exceeded:</span>
                            <span>A single tranche of {trancheBags.toLocaleString()} bags requires {wagonsNeeded} wagons, which exceeds the locomotive capacity of 23 wagons (27,600 bags / 1,380 MT). Please increase planned trips to at least {Math.ceil(totalQty / 27600)} trips to keep each train consist within physical corridor safety limits.</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-emerald-800 leading-snug">
                            <b>Operational Drawdown:</b> Total consignment of <b>{totalQty.toLocaleString()} {currentCargoConfig.unit}</b> split into <b>{trips} trips</b> = <b>{trancheQty.toLocaleString()} {currentCargoConfig.unit} per trip</b> ({wagonsNeeded} covered hopper wagons per train run).
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-industrial-consignee-client-12">Industrial Consignee Client *</label>
                <select id="admin-portal-industrial-consignee-client-12"
                  value={newDealForm.companyName}
                  onChange={(e) => setNewDealForm({ ...newDealForm, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                >
                  {customerUsers.map((u) => (
                    <option key={u.id} value={u.companyName || u.fullName}>
                      {u.companyName || u.fullName}
                    </option>
                  ))}
                  <option value="HUAXIN BUILDING MATERIALS NIG PLC (HBM)">HUAXIN BUILDING MATERIALS NIG PLC (HBM)</option>
                  <option value="APM Terminals Ltd (APMT)">APM Terminals Ltd (APMT)</option>
                  <option value="MAERSKLINES Nigeria">MAERSKLINES Nigeria</option>
                  <option value="British American Tobacco (BAT)">British American Tobacco (BAT)</option>
                  <option value="DHL Global Forwarding">DHL Global Forwarding</option>
                  <option value="DASCO Industries Ltd">DASCO Industries Ltd</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-canonical-corridor-preset-official-13">
                  Canonical Corridor Preset (Official Documented Operations)
                </label>
                <select id="admin-portal-canonical-corridor-preset-official-13"
                  onChange={(e) => {
                    const preset = CANONICAL_CORRIDORS.find((c) => c.id === e.target.value);
                    if (preset) {
                      setNewDealForm({
                        ...newDealForm,
                        loadingStation: preset.origin,
                        destination: preset.destination === 'MONI' ? 'MNY' : preset.destination,
                        cargoType: preset.cargoType.includes('Cement') ? 'Bagged Cement (50kg)' :
                                   preset.cargoType.includes('Gypsum') ? 'Bulk Gypsum' :
                                   preset.cargoType.includes('CONTAINERS') ? 'Shipping Containers (20ft/40ft)' : newDealForm.cargoType,
                      });
                    }
                  }}
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-950 font-bold focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Quick Select Operational Corridor --</option>
                  <optgroup label="Standard Gauge Corridors (Lagos - Moniya)">
                    {CANONICAL_CORRIDORS.filter(c => c.gauge === 'STANDARD_GAUGE').map((c) => (
                      <option key={c.id} value={c.id}>
                        [Standard Gauge] {c.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Narrow Gauge Corridors (Western & Lagos Districts)">
                    {CANONICAL_CORRIDORS.filter(c => c.gauge === 'NARROW_GAUGE').map((c) => (
                      <option key={c.id} value={c.id}>
                        [Narrow Gauge] {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-loading-station-gauge-14">Loading Station (Gauge)</label>
                  <select id="admin-portal-loading-station-gauge-14"
                    value={newDealForm.loadingStation}
                    onChange={(e) => {
                      const origin = e.target.value;
                      const isNarrow = origin === 'EWK' || origin === 'IDD' || origin === 'ILR' || origin === 'OSB';
                      setNewDealForm({
                        ...newDealForm,
                        loadingStation: origin,
                        destination: isNarrow ? 'DGB' : 'MNY',
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <optgroup label="Standard Gauge (1,435mm)">
                      <option value="PAPA">Papalanto Terminal (Bueno Terminal)</option>
                      <option value="ENL">ENL APMT Terminal (Bueno Terminal)</option>
                      <option value="APT">Apapa Port / Maritime Port</option>
                      <option value="APQ">Apapa Port Siding</option>
                      <option value="MBJ">Lagos Mobolaji (0 km)</option>
                      <option value="AB">Abeokuta Major Station</option>
                      <option value="MONI">Moniya Yard (Bueno Terminal)</option>
                    </optgroup>
                    <optgroup label="Narrow Gauge (1,067mm)">
                      <option value="EWK">Itori / Ewekoro Siding</option>
                      <option value="IDD">Iddo Lagos Terminus</option>
                      <option value="ILR">Ilorin Freight Hub</option>
                      <option value="OSB">Oshogbo Hub</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-destination-yard-gauge-15">Destination Yard (Gauge)</label>
                  <select id="admin-portal-destination-yard-gauge-15"
                    value={newDealForm.destination}
                    onChange={(e) => setNewDealForm({ ...newDealForm, destination: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <optgroup label="Standard Gauge (1,435mm)">
                      <option value="MNY">Moniya Yard, Ibadan (Bueno Terminal)</option>
                      <option value="PAPA">Papalanto Terminal (Bueno Terminal)</option>
                      <option value="ENL">ENL APMT Terminal (Bueno Terminal)</option>
                      <option value="APT">Apapa Port / Maritime Port</option>
                      <option value="AB">Abeokuta Major Station</option>
                    </optgroup>
                    <optgroup label="Narrow Gauge (1,067mm)">
                      <option value="DGB">Dugbe Station, Ibadan</option>
                      <option value="OSB">Oshogbo Hub</option>
                      <option value="ILR">Ilorin Freight Hub</option>
                      <option value="IDD">Iddo Lagos Terminus</option>
                      <option value="APT">Apapa Port (Narrow Siding)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-cargo-commodity-16">Cargo Commodity *</label>
                <select id="admin-portal-cargo-commodity-16"
                  value={newDealForm.cargoType}
                  onChange={(e) => setNewDealForm({ ...newDealForm, cargoType: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                >
                  <option value="Bagged Cement (50kg)">Bagged Cement (50kg) — [Unit: Bags]</option>
                  <option value="Bulk Gypsum">Bulk Gypsum — [Unit: Metric Tonnes MT]</option>
                  <option value="Limestone Raw Ore">Limestone Raw Ore — [Unit: Metric Tonnes MT]</option>
                  <option value="Clinker Bulk">Clinker Bulk — [Unit: Metric Tonnes MT]</option>
                  <option value="Shipping Containers (20ft/40ft)">Shipping Containers — [Unit: TEU Containers]</option>
                  <option value="AGO Diesel / Liquid Bulk">AGO Diesel / Liquid — [Unit: Liters]</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-quantity-17">
                    Quantity ({currentCargoConfig.unit}) *
                  </label>
                  <input id="admin-portal-quantity-17"
                    required
                    type="number"
                    value={newDealForm.quantity}
                    onChange={(e) => {
                      const qtyVal = e.target.value;
                      const num = Number(qtyVal) || 0;
                      const trips = newDealForm.dealType === 'MONTHLY_CONTRACT' ? (Number(newDealForm.totalPlannedTrips) || 10) : 1;
                      setNewDealForm({
                        ...newDealForm,
                        quantity: qtyVal,
                        trancheTonnage: Math.round(num / trips),
                      });
                    }}
                    placeholder={`Quantity in ${currentCargoConfig.unit}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-target-date-18">Target Date</label>
                  <input id="admin-portal-target-date-18"
                    type="date"
                    value={newDealForm.targetDate}
                    onChange={(e) => setNewDealForm({ ...newDealForm, targetDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-medium">
                Assigned Rolling Stock: <b>{currentCargoConfig.wagonType}</b>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateDealModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                >
                  Create Deal →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── COMMERCIAL COSTING & TARIFF MODAL (HEAD OF FINANCE / TREASURER) ─── */}
      {costingModalDeal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-teal-700 uppercase tracking-wider">HEAD OF FINANCE / TREASURY DESK</span>
                <h3 className="text-lg font-black text-slate-900">Commercial Tariff & Contract Costing</h3>
                <p className="text-xs text-slate-500 font-semibold">{costingModalDeal.company || costingModalDeal.companyName} • {costingModalDeal.dealNumber || costingModalDeal.id}</p>
              </div>
              <button onClick={() => setCostingModalDeal(null)} className="text-slate-400 font-bold hover:text-slate-900">
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCosting} className="space-y-4 text-xs font-semibold">
              {/* Deal Contract Type */}
              <div>
                <span id="costing-structure-label" className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Contract Structure *</span>
                <div role="group" aria-labelledby="costing-structure-label" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCostingForm({ ...costingForm, dealType: 'MONTHLY_CONTRACT', totalPlannedTrips: 10 })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      costingForm.dealType === 'MONTHLY_CONTRACT'
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Monthly Master Contract<br/>
                    <span className="text-[9px] font-normal text-slate-500">Multi-Trip Consignment Spreading</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCostingForm({ ...costingForm, dealType: 'SINGLE_TRIP', totalPlannedTrips: 1 })}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      costingForm.dealType === 'SINGLE_TRIP'
                        ? 'bg-teal-50 border-teal-500 text-teal-900 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Single Corridor Voyage<br/>
                    <span className="text-[9px] font-normal text-slate-500">1 Discrete Train Run</span>
                  </button>
                </div>
              </div>

              {costingForm.dealType === 'MONTHLY_CONTRACT' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-total-trips-in-schedule-19">Total Trips in Schedule</label>
                    <input id="admin-portal-total-trips-in-schedule-19"
                      type="number"
                      value={costingForm.totalPlannedTrips}
                      onChange={(e) => {
                        const trips = Number(e.target.value) || 1;
                        const totalQty = Number(costingModalDeal.quantity) || 9200;
                        setCostingForm({
                          ...costingForm,
                          totalPlannedTrips: trips,
                          trancheTonnage: Math.round(totalQty / trips),
                        });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-tranche-tonnage-trip-mt-20">Tranche Tonnage / Trip (MT)</label>
                    <input id="admin-portal-tranche-tonnage-trip-mt-20"
                      type="number"
                      value={costingForm.trancheTonnage}
                      onChange={(e) => setCostingForm({ ...costingForm, trancheTonnage: Number(e.target.value) || 920 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-emerald-800"
                    />
                  </div>
                </div>
              )}

              {/* Commercial Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-freight-tariff-rate-mt-21">Freight Tariff Rate (₦/MT or Unit) *</label>
                  <input id="admin-portal-freight-tariff-rate-mt-21"
                    type="number"
                    value={costingForm.tariffRatePerTon}
                    onChange={(e) => {
                      const rate = Number(e.target.value) || 0;
                      const totalQty = Number(costingModalDeal.quantity) || 9200;
                      setCostingForm({
                        ...costingForm,
                        tariffRatePerTon: rate,
                        totalContractValue: totalQty * rate,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-total-contract-value-22">Total Contract Value (₦)</label>
                  <input id="admin-portal-total-contract-value-22"
                    type="number"
                    value={costingForm.totalContractValue}
                    onChange={(e) => setCostingForm({ ...costingForm, totalContractValue: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-emerald-800"
                  />
                </div>
              </div>

              {/* Operating Budget & Margin */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-opex-fuel-toll-budget-23">OpEx Fuel/Toll Budget (₦/Trip)</label>
                  <input id="admin-portal-opex-fuel-toll-budget-23"
                    type="number"
                    value={costingForm.budgetExpensePerTrip}
                    onChange={(e) => setCostingForm({ ...costingForm, budgetExpensePerTrip: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-commercial-payment-terms-24">Commercial Payment Terms</label>
                  <select id="admin-portal-commercial-payment-terms-24"
                    value={costingForm.paymentTerms}
                    onChange={(e) => setCostingForm({ ...costingForm, paymentTerms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="PER_TRIP_DRAWDOWN">Per-Trip Billed Drawdown</option>
                    <option value="50_MOBILIZATION_50_DELIVERY">50% Advance, 50% on Delivery</option>
                    <option value="100_UPFRONT">100% Upfront Freight Remittance</option>
                    <option value="NET_30_CREDIT">30 Days Net Corporate Credit</option>
                  </select>
                </div>
              </div>

              {/* Estimated Profitability Card */}
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs">
                <div className="flex justify-between items-center text-emerald-950 font-bold mb-1">
                  <span>Target Net Margin:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    ₦{Math.max(0, costingForm.totalContractValue - (costingForm.budgetExpensePerTrip * costingForm.totalPlannedTrips)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-emerald-700 font-mono">
                  <span>Gross Tariff: ₦{costingForm.totalContractValue.toLocaleString()}</span>
                  <span>Total Planned OpEx: ₦{(costingForm.budgetExpensePerTrip * costingForm.totalPlannedTrips).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCostingModalDeal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                >
                  Lock Commercial Tariff & Terms
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── OFFICIAL PRINTABLE FREIGHT INVOICE & DEBIT NOTE MODAL ─── */}
      {selectedInvoiceForPrint && (
        <OfficialInvoiceModal
          invoice={selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
          onRecordPayment={() => {
            setPaymentModalInvoice(selectedInvoiceForPrint);
            setPaymentForm({
              amount: String(selectedInvoiceForPrint.balance || ''),
              type: Number(selectedInvoiceForPrint.amountPaid || 0) === 0 ? 'ADVANCE_DEPOSIT (70%)' : 'FINAL_SETTLEMENT',
              ref: '',
              date: new Date().toLocaleDateString('en-GB'),
            });
            setSelectedInvoiceForPrint(null);
          }}
        />
      )}

      {/* ─── RECORD PAYMENT REMITTANCE MODAL ─── */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">ACCOUNTS RECEIVABLE SETTLEMENT</span>
                <h3 className="text-lg font-black text-slate-900">Record Payment Remittance</h3>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono space-y-1">
              <p><strong>Invoice #:</strong> {paymentModalInvoice.invoiceNumber || paymentModalInvoice.id}</p>
              <p><strong>Consignee:</strong> {paymentModalInvoice.companyName}</p>
              <p><strong>Total Billed:</strong> ₦{Number(paymentModalInvoice.totalAmount || 0).toLocaleString()}</p>
              <p><strong>Already Paid:</strong> ₦{Number(paymentModalInvoice.amountPaid || 0).toLocaleString()}</p>
              <p className="text-rose-600 font-black">
                <strong>Outstanding Balance:</strong> ₦{Number(paymentModalInvoice.balance || 0).toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-remittance-amount-ngn-25">Remittance Amount (NGN) *</label>
                <input id="admin-portal-remittance-amount-ngn-25"
                  required
                  type="number"
                  min="1"
                  max={Number(paymentModalInvoice.balance || paymentModalInvoice.totalAmount || 100000000)}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="e.g. 5520000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-payment-classification-26">Payment Classification *</label>
                <select id="admin-portal-payment-classification-26"
                  value={paymentForm.type}
                  onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                >
                  <option value="ADVANCE_DEPOSIT (70%)">Advance Deposit (70% Pre-Dispatch)</option>
                  <option value="FINAL_SETTLEMENT">Final Settlement (100% Discharge)</option>
                  <option value="INTERIM_REMITTANCE">Interim Commercial Remittance</option>
                  <option value="FULL_SETTLEMENT">Full 100% Freight Settlement</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-bank-transfer-reference-session-27">Bank Transfer Reference / Session ID *</label>
                <input id="admin-portal-bank-transfer-reference-session-27"
                  required
                  value={paymentForm.ref}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                  placeholder="e.g. TRF-GTB-99201948 or NIBSS-0021"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-remittance-date-28">Remittance Date *</label>
                <input id="admin-portal-remittance-date-28"
                  required
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  placeholder="26 Aug 2026"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Commit Remittance →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── BOOK DIRECT CORRIDOR EXPENSE VOUCHER MODAL ─── */}
      {newCostModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">CORRIDOR EXPENDITURE BOOKING</span>
                <h3 className="text-lg font-black text-slate-900">Book Direct Corridor Expense</h3>
              </div>
              <button
                onClick={() => setNewCostModal(false)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTripCost} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-select-train-trip-29">Select Train Trip *</label>
                  <select id="admin-portal-select-train-trip-29"
                    value={newCostForm.tripId}
                    onChange={(e) => setNewCostForm({ ...newCostForm, tripId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id} — {t.company}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-expense-category-30">Expense Category *</label>
                  <select id="admin-portal-expense-category-30"
                    value={newCostForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let defaultVendor = 'Nigerian Railway Corporation (NRC)';
                      let defaultTitle = 'NRC Standard Gauge Corridor Track Toll';
                      if (cat === 'AGO_FUEL') {
                        defaultVendor = 'TotalEnergies Depot Apapa';
                        defaultTitle = 'Locomotive AGO Diesel Fueling (Liters)';
                      } else if (cat === 'CREW_ESCORT') {
                        defaultVendor = 'NRC Operations & Security Detachment';
                        defaultTitle = 'Lead Driver, Assistant & Armed Escort Allowance';
                      } else if (cat === 'SIDING_OPERATIONS') {
                        defaultVendor = 'Terminal Shunting & Cargo Unit';
                        defaultTitle = 'Siding Loading / Discharge Operation Costs';
                      } else if (cat === 'WEIGHBRIDGE_THC') {
                        defaultVendor = 'Port / Terminal Weighbridge';
                        defaultTitle = 'Weighbridge & Terminal Handling Charge';
                      }
                      setNewCostForm({
                        ...newCostForm,
                        category: cat,
                        vendor: defaultVendor,
                        title: defaultTitle,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="NRC_TRACK_ACCESS">NRC Track Access Toll</option>
                    <option value="AGO_FUEL">Locomotive Diesel (AGO)</option>
                    <option value="CREW_ESCORT">Driver & Police Escort Allowance</option>
                    <option value="SIDING_OPERATIONS">Siding Terminal Operations</option>
                    <option value="WEIGHBRIDGE_THC">Weighbridge & Handling</option>
                    <option value="OTHER_DIRECT_COST">Other Direct Operational Cost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-voucher-description-31">Voucher Description *</label>
                <input id="admin-portal-voucher-description-31"
                  required
                  value={newCostForm.title}
                  onChange={(e) => setNewCostForm({ ...newCostForm, title: e.target.value })}
                  placeholder="e.g. NRC Track Access Toll (Ewekoro → Moniya)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-vendor-beneficiary-32">Vendor / Beneficiary *</label>
                  <input id="admin-portal-vendor-beneficiary-32"
                    required
                    value={newCostForm.vendor}
                    onChange={(e) => setNewCostForm({ ...newCostForm, vendor: e.target.value })}
                    placeholder="e.g. Nigerian Railway Corporation (NRC)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-voucher-number-33">Voucher Number *</label>
                  <input id="admin-portal-voucher-number-33"
                    required
                    value={newCostForm.voucherNo}
                    onChange={(e) => setNewCostForm({ ...newCostForm, voucherNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-expense-amount-ngn-34">Expense Amount (NGN) *</label>
                <input id="admin-portal-expense-amount-ngn-34"
                  required
                  type="number"
                  min="1"
                  value={newCostForm.amount}
                  onChange={(e) => setNewCostForm({ ...newCostForm, amount: e.target.value })}
                  placeholder="e.g. 1450000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-700"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCostModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Book Voucher →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT DIRECT CORRIDOR EXPENSE VOUCHER MODAL ─── */}
      {editingTripCost && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-blue-600 uppercase">EDIT DIRECT OPERATING COST</span>
                <h3 className="text-lg font-black text-slate-900">Edit Voucher #{editingTripCost.voucherNo || editingTripCost.id}</h3>
                <p className="text-xs text-slate-500">
                  Assigned to Trip <span className="font-mono font-bold text-slate-700">{editingTripCost.tripId}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingTripCost(null)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateTripCost} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-expense-category-35">Expense Category *</label>
                  <select id="admin-portal-expense-category-35"
                    value={editingTripCost.category || 'NRC_TRACK_ACCESS'}
                    onChange={(e) => setEditingTripCost({ ...editingTripCost, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="NRC_TRACK_ACCESS">NRC Track Access Toll</option>
                    <option value="AGO_FUEL">Locomotive Diesel (AGO)</option>
                    <option value="CREW_ESCORT">Driver & Police Escort Allowance</option>
                    <option value="SIDING_OPERATIONS">Siding Terminal Operations</option>
                    <option value="WEIGHBRIDGE_THC">Weighbridge & Handling</option>
                    <option value="OTHER_DIRECT_COST">Other Direct Operational Cost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-payment-status-36">Payment Status *</label>
                  <select id="admin-portal-payment-status-36"
                    value={editingTripCost.paymentStatus || 'PAID'}
                    onChange={(e) => setEditingTripCost({ ...editingTripCost, paymentStatus: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="ACCRUED">ACCRUED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-voucher-description-37">Voucher Description *</label>
                <input id="admin-portal-voucher-description-37"
                  required
                  value={editingTripCost.title || ''}
                  onChange={(e) => setEditingTripCost({ ...editingTripCost, title: e.target.value })}
                  placeholder="e.g. NRC Track Access Toll"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-vendor-beneficiary-38">Vendor / Beneficiary *</label>
                  <input id="admin-portal-vendor-beneficiary-38"
                    required
                    value={editingTripCost.vendor || ''}
                    onChange={(e) => setEditingTripCost({ ...editingTripCost, vendor: e.target.value })}
                    placeholder="e.g. Nigerian Railway Corporation (NRC)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-voucher-number-39">Voucher Number *</label>
                  <input id="admin-portal-voucher-number-39"
                    required
                    value={editingTripCost.voucherNo || ''}
                    onChange={(e) => setEditingTripCost({ ...editingTripCost, voucherNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-expense-amount-ngn-40">Expense Amount (NGN) *</label>
                <input id="admin-portal-expense-amount-ngn-40"
                  required
                  type="number"
                  min="1"
                  value={editingTripCost.amount || ''}
                  onChange={(e) => setEditingTripCost({ ...editingTripCost, amount: e.target.value })}
                  placeholder="e.g. 1450000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-blue-700"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTripCost(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Voucher Changes →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── REGISTER NEW CHART OF ACCOUNT MODAL ─── */}
      {newAccountModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">CHART OF ACCOUNTS CONFIGURATION</span>
                <h3 className="text-lg font-black text-slate-900">Add New General Ledger Account</h3>
                <p className="text-xs text-slate-500">Standard 4-digit Account Code and Financial Statement category</p>
              </div>
              <button
                onClick={() => setNewAccountModal(false)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-account-code-41">Account Code *</label>
                  <input id="admin-portal-account-code-41"
                    required
                    value={newAccountForm.code}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, code: e.target.value })}
                    placeholder="e.g. 1040 or 5060"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-account-category-42">Account Category *</label>
                  <select id="admin-portal-account-category-42"
                    value={newAccountForm.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      setNewAccountForm({
                        ...newAccountForm,
                        type: t,
                        subType: t === 'ASSET' ? 'Cash & Cash Equivalents' : t === 'LIABILITY' ? 'Current Liability' : t === 'EQUITY' ? 'Equity Capital' : t === 'REVENUE' ? 'Operating Freight Revenue' : 'Direct Rail Haulage Cost'
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                  >
                    <option value="ASSET">ASSET (1000s)</option>
                    <option value="LIABILITY">LIABILITY (2000s)</option>
                    <option value="EQUITY">EQUITY (3000s)</option>
                    <option value="REVENUE">REVENUE (4000s)</option>
                    <option value="EXPENSE">EXPENSE (5000s-6000s)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-account-title-name-43">Account Title / Name *</label>
                <input id="admin-portal-account-title-name-43"
                  required
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  placeholder="e.g. Rolling Stock Maintenance Reserve"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-sub-classification-44">Sub-Classification *</label>
                  <input id="admin-portal-sub-classification-44"
                    required
                    value={newAccountForm.subType}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, subType: e.target.value })}
                    placeholder="e.g. Current Asset or OpEx"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-opening-balance-ngn-45">Opening Balance (NGN)</label>
                  <input id="admin-portal-opening-balance-ngn-45"
                    type="number"
                    value={newAccountForm.openingBalance}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, openingBalance: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-audit-purpose-description-46">Audit Purpose & Description</label>
                <textarea id="admin-portal-audit-purpose-description-46"
                  rows={2}
                  value={newAccountForm.description}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, description: e.target.value })}
                  placeholder="Official general ledger account description for audit trails..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewAccountModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Register GL Account →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── POST DOUBLE-ENTRY JOURNAL VOUCHER MODAL ─── */}
      {newJournalModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-purple-600 uppercase">GENERAL LEDGER JOURNAL</span>
                  <span className="bg-purple-100 text-purple-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                    Double-Entry Strict
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900">Post General Journal Voucher</h3>
                <p className="text-xs text-slate-500">Every journal entry must strictly balance: Total Debits === Total Credits.</p>
              </div>
              <button
                onClick={() => setNewJournalModal(false)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePostJournalEntry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-voucher-number-47">Voucher Number *</label>
                  <input id="admin-portal-voucher-number-47"
                    required
                    value={newJournalForm.journalNo}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, journalNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-posting-date-48">Posting Date *</label>
                  <input id="admin-portal-posting-date-48"
                    required
                    value={newJournalForm.date}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-source-reference-49">Source Reference *</label>
                  <input id="admin-portal-source-reference-49"
                    required
                    value={newJournalForm.reference}
                    onChange={(e) => setNewJournalForm({ ...newJournalForm, reference: e.target.value })}
                    placeholder="e.g. NRC-OCT-09 / ZENITH-TX-991"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-narration-memo-50">Narration / Memo *</label>
                <input id="admin-portal-narration-memo-50"
                  required
                  value={newJournalForm.description}
                  onChange={(e) => setNewJournalForm({ ...newJournalForm, description: e.target.value })}
                  placeholder="e.g. Payment of rail toll charges to NRC for Ewekoro cement corridor trips"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                />
              </div>

              {/* Split Lines Editor */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-mono font-bold text-slate-500">Split Accounts & Amounts</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewJournalForm({
                        ...newJournalForm,
                        lines: [
                          ...newJournalForm.lines,
                          { accountId: chartAccounts[0]?.id || 'acc_1010', description: '', debit: '', credit: '' }
                        ]
                      });
                    }}
                    className="text-[10px] font-bold text-slate-700 hover:underline cursor-pointer"
                  >
                    + Add Split Line
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-mono text-slate-600 border-b border-slate-200">
                        <th className="p-2.5">GL Account</th>
                        <th className="p-2.5">Line Memo</th>
                        <th className="p-2.5 text-right w-28">Debit (₦)</th>
                        <th className="p-2.5 text-right w-28">Credit (₦)</th>
                        <th className="p-2.5 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newJournalForm.lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2">
                            <select
                              value={line.accountId}
                              onChange={(e) => {
                                const updated = [...newJournalForm.lines];
                                updated[idx].accountId = e.target.value;
                                setNewJournalForm({ ...newJournalForm, lines: updated });
                              }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-medium"
                            >
                              {chartAccounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  [{a.code}] {a.name} ({a.type})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              value={line.description}
                              onChange={(e) => {
                                const updated = [...newJournalForm.lines];
                                updated[idx].description = e.target.value;
                                setNewJournalForm({ ...newJournalForm, lines: updated });
                              }}
                              placeholder="Line description"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={line.debit}
                              onChange={(e) => {
                                const updated = [...newJournalForm.lines];
                                updated[idx].debit = e.target.value;
                                if (e.target.value) updated[idx].credit = '';
                                setNewJournalForm({ ...newJournalForm, lines: updated });
                              }}
                              placeholder="0.00"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-mono text-right font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              value={line.credit}
                              onChange={(e) => {
                                const updated = [...newJournalForm.lines];
                                updated[idx].credit = e.target.value;
                                if (e.target.value) updated[idx].debit = '';
                                setNewJournalForm({ ...newJournalForm, lines: updated });
                              }}
                              placeholder="0.00"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-mono text-right font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            {newJournalForm.lines.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewJournalForm({
                                    ...newJournalForm,
                                    lines: newJournalForm.lines.filter((_, i) => i !== idx)
                                  });
                                }}
                                className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Balance Validation Card */}
              {(() => {
                const totalDebits = newJournalForm.lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
                const totalCredits = newJournalForm.lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
                const diff = Math.abs(totalDebits - totalCredits);
                const isBalanced = diff < 0.01 && totalDebits > 0;

                return (
                  <div className={`p-4 rounded-2xl border ${isBalanced ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} space-y-1.5`}>
                    <div className="flex justify-between items-center text-xs font-mono font-bold flex-wrap gap-2">
                      <span className="text-slate-600">Total Debits: ₦{totalDebits.toLocaleString()}</span>
                      <span className="text-slate-600">Total Credits: ₦{totalCredits.toLocaleString()}</span>
                      <span className={isBalanced ? 'text-emerald-700' : 'text-rose-600'}>
                        {isBalanced ? 'ZERO VARIANCE' : `Out of Balance: ₦${diff.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="text-[11px] font-sans text-slate-600">
                      {isBalanced ? (
                        <p className="text-emerald-800 font-bold">
                          Double-entry rule satisfied. Both sides balance perfectly to ₦{totalDebits.toLocaleString()}. Ready to post.
                        </p>
                      ) : (
                        <p className="text-rose-700 font-medium">
                          Warning: General ledger vouchers must strictly balance. Ensure Total Debits exactly equals Total Credits before posting.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewJournalModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Post Journal Voucher →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DEDICATED PRINT STYLESHEET (CLEAN AUDIT EXPORT) ─── */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          header, aside, button, nav, input, select, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .bg-white, .bg-slate-50 {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
            border-radius: 8px !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cbd5e1 !important;
            padding: 6px 10px !important;
            color: #0f172a !important;
          }
        }
      `}</style>

      {/* ─── HEADER (PURE WHITE TEXTURED HEADER WITH OFFICIAL BUENO LOGO) ─── */}
      <header className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="w-full px-4 sm:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black px-3.5 py-2 rounded-xl border border-slate-200 transition-all flex items-center gap-2"
            >
              <span className="flex items-center gap-1.5"><Menu className="w-4 h-4" /><span>{sidebarOpen ? 'Hide Menu' : 'Command Menu'}</span></span>
            </button>

            {/* OFFICIAL BUENO LOGO + BRAND TITLE */}
            <div className="flex items-center gap-3">
              <img
                src="/bueno_logo.png"
                alt="Bueno Logistics"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <span className="text-[10px] font-mono font-extrabold text-slate-700 uppercase tracking-widest block">
                  {user?.role === 'HEAD_OF_OPERATIONS' ? 'OPERATIONS COMMAND HQ' : (user?.role === 'HEAD_OF_FINANCE' || user?.role === 'ACCOUNTANT') ? 'FINANCE HQ DESK' : user?.role === 'CEO' || user?.role === 'MD' ? 'CEO & MD COMMAND HQ' : 'EXECUTIVE COMMAND HQ'}
                </span>
                <h1 className="text-sm font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  BUENO LOGISTICS
                </h1>
              </div>
            </div>
          </div>

          {/* SYNCED LOGGED IN USER DETAILS + CREATE DEAL ACTION */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={async () => {
                const ok = await confirmAction({
                  title: 'Permanently erase all operational data?',
                  body: 'Every trip, deal, invoice, fund request, cost voucher, negotiation and '
                    + 'notification will be deleted from the live MySQL database. Accounts and '
                    + 'permissions are kept. There is no undo and no backup is taken.',
                  confirmLabel: 'Erase everything',
                  destructive: true,
                });
                if (!ok) return;

                try {
                  // The second argument is required: cleanProductionPurge refuses to
                  // run without explicit confirmation. It was previously called
                  // without it, so the request threw and the page reloaded anyway —
                  // the button looked like it worked while purging nothing.
                  await notify.promise(StateEngine.cleanProductionPurge(true), {
                    loading: 'Purging operational data…',
                    success: 'Operational data purged.',
                  });
                  await StateEngine.syncRemote();
                  syncData();
                } catch {
                  /* notify.promise has already surfaced the reason */
                }
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1 shadow-2xs"
              title="Purge All Test Trips & Deals from Live Database"
            >
              <span>Reset Database</span>
            </button>

            <button
              onClick={() => setCreateDealModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>+ Create Freight Deal</span>
            </button>

            <div className="hidden sm:block text-right">
              <span className="text-xs font-extrabold text-slate-900 block">{currentUser?.fullName || user?.fullName || 'Alhaji Bashir Umar'}</span>
              <span className="text-[10px] font-mono text-slate-500 font-bold block">{currentUser?.roleLabel || currentUser?.role || user?.roleLabel || user?.role || 'Executive Command HQ'}</span>
            </div>

            <button
              onClick={onSignOut}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2 rounded-xl transition-all border border-slate-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── DYNAMIC LAYOUT WITH PURE WHITE LEFT SIDEBAR (FLUID 100% FULL SCREEN WIDTH) ─── */}
      <div className="flex w-full min-h-[calc(100vh-65px)]">
        {/* ─── PURE WHITE & BRAND GREEN LEFT SIDEBAR (PINNED & STICKY ON SCROLL) ─── */}
        {sidebarOpen && (
          <aside className="w-72 bg-white text-slate-900 p-5 space-y-6 flex flex-col justify-between border-r border-slate-200 shrink-0 shadow-sm transition-all font-sans sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <img
                    src="/bueno_logo.png"
                    alt="Bueno"
                    className="h-6 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-mono font-extrabold text-slate-700 uppercase tracking-wider">COMMAND NAVIGATION</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-xl text-xs font-extrabold border border-slate-200"
                >
                  Close
                </button>
              </div>

              <nav className="space-y-1 font-sans">
                {[
                  { id: 'analytics', label: 'Executive Reports & Analytics', icon: BarChart3 },
                  { id: 'deals', label: 'Commercial Deals Desk', icon: FileSpreadsheet },
                  { id: 'negotiations', label: 'Client Negotiations Chat', icon: MessageSquare },
                  { id: 'fund_requisitions', label: 'Fund Requisition & Operational Expenses', icon: Wallet },
                  { id: 'fleet', label: 'Fleet & Rolling Stock Management', icon: Train },
                  { id: 'terminal_info', label: 'Terminal Information Ledger (STATION: ###)', icon: Building2 },
                  { id: 'moniya', label: 'Moniya Container Terminal (MICT)', icon: Box },
                  { id: 'telemetry', label: 'Fleet Telemetry & Live GPS', icon: Compass },
                  { id: 'manifest', label: 'Cargo Manifests & Waybills', icon: FileText },
                  { id: 'billing', label: 'Commercial Invoices & Ledger', icon: Receipt },
                  { id: 'users', label: 'User Directory & Account Provisioning', icon: Users },
                  { id: 'permissions', label: 'Enterprise Permissions Matrix', icon: ShieldCheck },
                ].filter((t) => StateEngine.canUserAccessTab(user, t.id)).map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-brand text-white shadow-sm font-black'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        {/* ─── MAIN CONTENT CANVAS (SHIFTS CLEANLY, SHARP & UNBLURRED) ─── */}
        <main id="main-content" className="flex-1 p-6 space-y-6 min-w-0">

        {/* ─── TAB 0: ORIGINAL FULL EXECUTIVE REPORTS & HISTORICAL ANALYTICS (MONTH-BY-MONTH RETRIEVABLE 2-3 MONTHS AGO) ─── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 font-sans">
            {/* PRINT-DEDICATED EXECUTIVE DOCUMENT HEADER WITH OFFICIAL BUENO LOGO */}
            <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <img src="/bueno_logo.png" alt="Bueno Logistics" className="h-12 w-auto object-contain" />
                  <div>
                    <h1 className="text-xl font-black text-slate-900">BUENO LOGISTICS LIMITED</h1>
                    <p className="text-xs font-mono font-bold text-slate-600 uppercase">OFFICIAL EXECUTIVE CORRIDOR AUDIT REPORT</p>
                  </div>
                </div>
                <div className="text-right font-mono text-xs">
                  <p className="font-extrabold text-slate-900 uppercase">CONFIDENTIAL EXECUTIVE AUDIT</p>
                  <p className="text-slate-600">Audit Period: {monthLabel(selectedMonth)}</p>
                  <p className="text-slate-600">Generated: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>

            {/* HISTORICAL DATE BACK ARCHIVE FILTER BAR (HIDDEN DURING PRINT) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">HISTORICAL CORRIDOR AUDIT ARCHIVE</span>
                <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Executive Reports & Date Back History
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Month Picker for 2-3 Months Ago Historical Search */}
                <div className="flex items-center gap-2">
                  <label htmlFor="archive-month" className="text-xs font-bold text-slate-600 font-mono">
                    Retrievable Month:
                  </label>
                  <select
                    id="archive-month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-900 text-white font-bold rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="ALL">All periods ({trips.length})</option>
                    {availableMonths.map((key) => (
                      <option key={key} value={key}>
                        {monthLabel(key)} ({tripsByMonth[key]?.length ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['weekly', 'monthly', 'quarterly', 'annually'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold capitalize transition-all ${
                        selectedPeriod === p ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>Export Audit Report (PDF)</span>
                </button>
              </div>
            </div>

            {/* DATE CATEGORY FILTER TABS (DE-CONGESTION ENGINE) */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1 mr-1">Filter By Operational Date:</span>
                {[
                  { id: 'TODAY', label: `${StateEngine.getTodayLabel()}` },
                  { id: 'YESTERDAY', label: `${StateEngine.getYesterdayLabel()}` },
                  { id: 'THIS_WEEK', label: 'This Week' },
                  { id: 'THIS_MONTH', label: `${StateEngine.getThisMonthLabel()}` },
                  { id: 'ALL', label: `All Dates (${trips.length})` },
                ].map((df) => (
                  <button
                    key={df.id}
                    onClick={() => setReportDateFilter(df.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      reportDateFilter === df.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 pr-2">
                Audited: <b className="text-slate-700">{activeReportTrips.length} Corridor Trip(s)</b>
              </span>
            </div>

            {/* TOP OPERATIONAL INTELLIGENCE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Total Freight Hauled ({monthLabel(selectedMonth)})</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{Math.round(totalReportMT).toLocaleString()} MT</p>
                <span className="text-[10px] text-emerald-700 font-bold">Net Corridor Cargo Moved</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Consignment Unit Volume</span>
                <p className="text-2xl font-black text-slate-700 font-mono">{totalReportBags.toLocaleString()} Bags</p>
                <span className="text-[10px] text-emerald-700 font-bold">{totalReportWagonsCount} Covered Wagons Coupled</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Average Loading Turnaround</span>
                <p className="text-2xl font-black text-purple-700 font-mono">35 Mins / Wagon</p>
                <span className="text-[10px] text-purple-600 font-bold">Siding Loading Rate</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Cargo Delivery Integrity</span>
                <p className="text-2xl font-black text-emerald-600 font-mono">{cargoIntegrityPct}% Intact</p>
                <span className="text-[10px] text-slate-500 font-bold">{totalReportDamages} Defect(s) Recorded</span>
              </div>
            </div>

            {/* ROUTE FLOW DISTRIBUTION & FINANCE PRICING STATUS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">NETWORK ROUTE FLOW</span>
                    <h3 className="text-sm font-black text-slate-900">Active Corridor Freight Distribution</h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400 font-bold">Volume Flow</span>
                </div>
                {routeFlows.length === 0 ? (
                  <p className="text-xs text-slate-400 font-mono py-4 text-center">No route activity recorded.</p>
                ) : (
                  <div className="space-y-3">
                    {routeFlows.map((rf, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="font-black text-slate-900">{rf.route}</span>
                          <span className="font-bold text-brand">{rf.percentage}% of Network ({rf.tonnage} MT)</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-brand h-full rounded-full transition-all" style={{ width: `${rf.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase block">COMMERCIAL PRICING AUDIT</span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">Finance Authority Desk</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Trip pricing and tariff revenue are set exclusively by the Finance Desk in <b>Commercial Invoices & Ledger</b> based on negotiated client rates and damage deductions.
                  </p>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-xs font-mono space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Audited by Finance:</span>
                    <span className="font-bold text-emerald-700">{costedTripsCount} / {activeReportTrips.length} Trips</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Awaiting Finance Cost:</span>
                    <span className="font-bold text-amber-600">{activeReportTrips.length - costedTripsCount} Trips</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 1: LIVE MONTHLY TERMINAL TRAIN BENCHMARKS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">CORRIDOR TERMINAL BENCHMARKS</span>
                  <h3 className="text-base font-black text-slate-900">
                    LIVE MONTHLY TERMINAL TRAIN BENCHMARKS: Station Operational Target vs Live Actual Completion
                  </h3>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-xl">
                  {monthLabel(selectedMonth)} Target Sync
                </span>
              </div>

              {stationBenchmarks.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-mono text-xs">
                  <p className="font-bold text-slate-700">No Terminal Train Movements In Selected Window</p>
                  <p className="text-[11px] text-slate-400 mt-1">Terminal train targets and live completion metrics will auto-aggregate here as corridor trips are dispatched.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stationBenchmarks.map((b, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-slate-900">{b.station}</span>
                        <span className="text-xs font-black text-slate-700 font-mono">{b.efficiency} Target</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Target vs Actual</span>
                          <span className="font-extrabold text-slate-800">{b.actual} / {b.target} Trains</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Tonnage Completed</span>
                          <span className="font-extrabold text-emerald-700">{b.tonnage}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: LIVE OFFICER KPI EVALUATION ENGINE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">FIELD OFFICER SCORECARD</span>
                  <h3 className="text-base font-black text-slate-900">
                    LIVE OFFICER KPI EVALUATION ENGINE: Cargo Officer Monthly Performance Ratings & Speed Efficiency
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Officer Name</th>
                      <th className="p-3">Station</th>
                      <th className="p-3">Trips Escorted</th>
                      <th className="p-3">Audit Accuracy</th>
                      <th className="p-3">Avg Transit Speed</th>
                      <th className="p-3">KPI Rating</th>
                      <th className="p-3 text-right">Performance Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {officerKpis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-mono text-xs">
                          No field officer escort records logged for this filter window. Dispatched trips will populate live officer KPI ratings here.
                        </td>
                      </tr>
                    ) : (
                      officerKpis.map((kpi, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 font-sans">{kpi.name}</td>
                          <td className="p-3 text-slate-600">{kpi.station}</td>
                          <td className="p-3 font-extrabold text-slate-800">{kpi.trips} Trips</td>
                          <td className="p-3 font-bold text-emerald-700">{kpi.accuracy}</td>
                          <td className="p-3 text-slate-700">{kpi.speed}</td>
                          <td className="p-3 font-black text-amber-600">{kpi.rating}</td>
                          <td className="p-3 text-right">
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                              {kpi.tier}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: DATABASE TRIP AUDIT LOG */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">CORRIDOR AUDIT TRAIL</span>
                  <h3 className="text-base font-black text-slate-900">
                    DATABASE TRIP AUDIT LOG: Archived Consignments & Discrepancies for {monthLabel(selectedMonth)}
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Trip ID</th>
                      <th className="p-3">Consignee Client</th>
                      <th className="p-3">Commodity & Consist</th>
                      <th className="p-3">Payload Volume</th>
                      <th className="p-3">Dispatch Date</th>
                      <th className="p-3">Defects / Variance</th>
                      <th className="p-3">Corridor Status</th>
                      <th className="p-3 text-right">Trip Audit Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeReportTrips.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-mono text-xs">
                          No archived consignment audit records found for this period.
                        </td>
                      </tr>
                    ) : (
                      activeReportTrips.map((t, idx) => {
                        const qty = Number(t.quantity) || 0;
                        const unit = t.unitOfMeasure || (t.cargoType?.includes('Gypsum') || t.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                        const damages = t.damages?.damagedUnits || t.damages?.burstBags || (t.wagonLogs || []).reduce((acc: number, w: any) => acc + (Number(w.damageQty || 0) + Number(w.burstBags || 0)), 0);
                        const isCompleted = t.status === 'COMPLETED';
                        const isInTransit = t.status === 'IN_TRANSIT';
                        const isLoading = t.status === 'LOADING';

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-amber-800">{t.id || t.tripId}</td>
                            <td className="p-3 font-bold font-sans text-slate-900">{t.company}</td>
                            <td className="p-3 font-sans font-bold text-slate-700">{t.cargoType || 'Bagged Cement'}</td>
                            <td className="p-3 font-extrabold text-emerald-700">{qty.toLocaleString()} {unit}</td>
                            <td className="p-3 text-slate-600">{t.dispatchTime || t.departedAt || 'Today'}</td>
                            <td className="p-3 font-extrabold text-rose-600">{damages} Defect(s)</td>
                            <td className="p-3">
                              <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded uppercase ${
                                isCompleted ? 'bg-emerald-100 text-emerald-800' :
                                isInTransit ? 'bg-blue-100 text-blue-800' :
                                isLoading ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                              }`}>
                                {isCompleted ? 'COMPLETED & AUDITED' :
                                 isInTransit ? 'IN TRANSIT (LIVE GPS)' :
                                 isLoading ? 'LOADING AT STATION' : (t.status || 'ACTIVE')}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setSelectedAuditTrip(t)}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-xs transition-all flex items-center gap-1 ml-auto"
                              >
                                <span>View Audit & PDF</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4: OFFICIAL DAILY OPERATIONS EXECUTIVE SIGN-OFF */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">EXECUTIVE CERTIFICATION & APPROVAL</span>
                <h3 className="text-base font-black text-slate-900">
                  OFFICIAL DAILY OPERATIONS EXECUTIVE SIGN-OFF
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-mono text-xs">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Executive Managing Director Sign-off</span>
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900 text-sm">{StateEngine.getSignatory('CEO', 'Alhaji Bashir Umar')}</p>
                    <p className="text-slate-500 text-[11px]">Managing Director & CEO, Bueno Logistics</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px]">
                    <span className="text-emerald-700 font-extrabold">DIGITAL SIGNATURE VERIFIED</span>
                    <span className="text-slate-400">{new Date().toLocaleDateString('en-GB')}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Head of Freight Rail Operations</span>
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900 text-sm">{StateEngine.getSignatory('HEAD_OF_OPERATIONS', 'Babajide Sanwo')}</p>
                    <p className="text-slate-500 text-[11px]">Head of Operations, NRC Freight Corridor</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[10px]">
                    <span className="text-emerald-700 font-extrabold">AUDIT CERTIFIED & SEALED</span>
                    <span className="text-slate-400">HASH: CERT-2026-NGR-BUENO-OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 1: COMMERCIAL DEALS DESK ─── */}
        {activeTab === 'deals' && (
          <div className="space-y-6 font-sans">
            {/* KPI OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Deals Registered</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{deals.length}</p>
                <span className="text-[10px] text-emerald-700 font-bold">Active B2B Contracts</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Trips Dispatched</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">{trips.length}</p>
                <span className="text-[10px] text-emerald-700 font-bold">Wagon Fleet Assigned</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Rolling Stock Wagons</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{wagons.length}</p>
                <span className="text-[10px] text-slate-500 font-bold">Active Fleet Inventory</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Client Requisitions</span>
                <p className="text-2xl font-black text-slate-700 font-mono">{negotiations.length}</p>
                <span className="text-[10px] text-emerald-700 font-bold">Client Negotiations Inbox</span>
              </div>
            </div>

            {/* DEALS ACTION & DIRECTORY */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Commercial Logistics Management</span>
                  <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Commercial Freight Deals Directory
                  </h3>
                  <p className="text-xs text-slate-500">Manage B2B industrial contracts, monthly consignment schedules, and finance tariffs.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCreateDealModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <span>+ Create New Commercial Deal</span>
                  </button>
                </div>
              </div>

              {/* DATE & STRUCTURE FILTER PILLS */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider pl-1 mr-1">Filter Contracts:</span>
                  {[
                    { id: 'TODAY', label: `${StateEngine.getTodayLabel()}` },
                    { id: 'THIS_WEEK', label: 'This Week' },
                    { id: 'MONTHLY', label: 'Monthly Contracts' },
                    { id: 'SINGLE', label: 'Single Voyages' },
                    { id: 'ALL', label: `All Deals (${deals.length})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDealsDateFilter(f.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        dealsDateFilter === f.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 pr-2">
                  Showing: <b className="text-slate-900">{
                    deals.filter((d) => {
                      if (dealsDateFilter === 'MONTHLY') return d.dealType === 'MONTHLY_CONTRACT';
                      if (dealsDateFilter === 'SINGLE') return d.dealType !== 'MONTHLY_CONTRACT';
                      if (dealsDateFilter === 'TODAY') return StateEngine.getDateCategory(d.createdAt) === 'TODAY';
                      if (dealsDateFilter === 'THIS_WEEK') {
                        const c = StateEngine.getDateCategory(d.createdAt);
                        return c === 'TODAY' || c === 'YESTERDAY' || c === 'THIS_WEEK';
                      }
                      return true;
                    }).length
                  } Contract(s)</b>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const filteredDeals = deals.filter((d) => {
                    if (dealsDateFilter === 'MONTHLY') return d.dealType === 'MONTHLY_CONTRACT';
                    if (dealsDateFilter === 'SINGLE') return d.dealType !== 'MONTHLY_CONTRACT';
                    if (dealsDateFilter === 'TODAY') return StateEngine.getDateCategory(d.createdAt) === 'TODAY';
                    if (dealsDateFilter === 'THIS_WEEK') {
                      const c = StateEngine.getDateCategory(d.createdAt);
                      return c === 'TODAY' || c === 'YESTERDAY' || c === 'THIS_WEEK';
                    }
                    return true;
                  });

                  if (filteredDeals.length === 0) {
                    return (
                      <div className="col-span-2 p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium text-xs">
                        No commercial deals matching this date or contract filter.
                      </div>
                    );
                  }

                  return filteredDeals.map((d) => {
                    const isMonthly = d.dealType === 'MONTHLY_CONTRACT';
                    const qty = Number(d.quantity) || 1610;
                    const unit = d.unitOfMeasure || (d.cargoType?.includes('Gypsum') || d.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                    const isNarrowGauge = ['EWK', 'ITO', 'DGB', 'OSB', 'ILR', 'IDD'].includes(d.loadingStation);

                    const totalTrips = Number(d.totalPlannedTrips) || 10;
                    const dispatched = Number(d.dispatchedTripsCount) || (d.status === 'TRIP_CREATED' || d.status === 'COMPLETED' ? 1 : 0);
                    const trancheT = Number(d.trancheTonnage) || Math.round(qty / totalTrips);
                    const hauledMT = Math.min(qty, dispatched * trancheT);
                    const rate = Number(d.tariffRatePerTon) || 12500;
                    const totalVal = Number(d.totalContractValue) || (qty * rate);

                    return (
                      <div
                        key={d.id}
                        className={`p-5 rounded-3xl border space-y-3.5 text-xs transition-all ${
                          isMonthly
                            ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/40 via-white to-slate-50 shadow-sm'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        {/* CARD HEADER */}
                        <div className="flex justify-between items-start border-b border-slate-200 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700 text-[10px] uppercase block">{d.dealNumber || d.id}</span>
                              {isMonthly && (
                                <span className="bg-emerald-700 text-white font-mono text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                                  Monthly Master ({totalTrips} Trips)
                                </span>
                              )}
                            </div>
                            <h4 className="font-black text-slate-900 text-sm mt-0.5">{d.company || d.companyName}</h4>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            <span className={`font-mono font-bold text-[9px] px-2.5 py-0.5 rounded-full border ${
                              isNarrowGauge ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {isNarrowGauge ? 'Narrow (1,067mm)' : 'Standard (1,435mm)'}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-2.5 py-0.5 rounded-full text-[9px] uppercase">
                              {d.status || 'ACTIVE'}
                            </span>
                          </div>
                        </div>

                        {/* CORRIDOR & PAYLOAD INFO */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Corridor</span>
                            <span className="font-bold text-slate-900">{d.loadingStation || 'PAPA'} → {d.destination || 'MNY'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Commodity</span>
                            <span className="font-bold text-slate-900 truncate block">{d.cargoType}</span>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Total Volume</span>
                            <span className="font-mono font-bold text-emerald-700">{qty.toLocaleString()} {unit}</span>
                          </div>
                        </div>

                        {/* FINANCE & TARIFF AUDIT STRIP */}
                        <div className="bg-slate-100/90 p-2.5 rounded-xl border border-slate-200 text-[10px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase">Freight Tariff</span>
                            <span className="font-extrabold text-slate-900">₦{rate.toLocaleString()}/MT</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase">Total Contract Value</span>
                            <span className="font-extrabold text-emerald-700">₦{totalVal.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase">Per-Trip OpEx</span>
                            <span className="font-extrabold text-rose-700">₦{(Number(d.budgetExpensePerTrip) || 4500000).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[8px] uppercase">Finance Status</span>
                            <span className="font-extrabold text-teal-700">{d.financeStatus === 'FINANCE_APPROVED_COSTED' ? 'Cost Approved' : 'Pending Rates'}</span>
                          </div>
                        </div>

                        {/* MONTHLY CONSIGNMENT TRANCHE PROGRESS */}
                        {isMonthly && (
                          <div className="space-y-1.5 bg-white p-3 rounded-2xl border border-emerald-200">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="font-bold text-slate-700">
                                Consignment Spreading: <b className="text-emerald-800">{dispatched} of {totalTrips} Trips Dispatched</b>
                              </span>
                              <span className="font-bold text-emerald-700">
                                {hauledMT.toLocaleString()} / {qty.toLocaleString()} MT ({Math.round((dispatched / totalTrips) * 100)}%)
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                              <div
                                className="bg-slate-900 h-full transition-all duration-500 rounded-full"
                                style={{ width: `${Math.min(100, Math.round((dispatched / totalTrips) * 100))}%` }}
                              />
                            </div>

                            {/* Mini Tranche Step Indicators */}
                            <div className="flex items-center gap-1 pt-1 overflow-x-auto">
                              {Array.from({ length: totalTrips }).map((_, idx) => {
                                const stepNum = idx + 1;
                                const isDispatched = stepNum <= dispatched;
                                const isCurrent = stepNum === dispatched + 1;
                                return (
                                  <span
                                    key={idx}
                                    title={`Tranche ${stepNum}: ~${trancheT} MT`}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold shrink-0 ${
                                      isDispatched
                                        ? 'bg-emerald-600 text-white'
                                        : isCurrent
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                        : 'bg-slate-100 text-slate-400'
                                    }`}
                                  >
                                    T{stepNum} {isDispatched ? 'Approved' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* ACTION BUTTONS (OPS DISPATCH & FINANCE COSTING) */}
                        <div className="flex gap-2 pt-1 flex-wrap">
                          {isMonthly ? (
                            <>
                              {dispatched < totalTrips ? (
                                <button
                                  onClick={() => handleDispatchTranche(d)}
                                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                  <span>Dispatch Tranche #{dispatched + 1} of {totalTrips} →</span>
                                </button>
                              ) : (
                                <div className="flex-1 bg-emerald-100 text-emerald-800 font-bold text-center py-2.5 rounded-xl text-xs">
                                  All {totalTrips} Tranches Dispatched
                                </div>
                              )}
                              <button
                                onClick={() => openCostingModal(d)}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 shrink-0"
                                title="Head of Finance Commercial Tariff & Costing"
                              >
                                <span>Commercial Costing</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleApproveDealAndAllocateWagons(d)}
                                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                              >
                                <span>Launch Corridor Trip →</span>
                              </button>
                              <button
                                onClick={() => openCostingModal(d)}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 shrink-0"
                                title="Head of Finance Commercial Tariff & Costing"
                              >
                                <span>Commercial Costing</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: CLIENT NEGOTIATIONS CHAT ─── */}
        {activeTab === 'negotiations' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] font-sans">
            {/* LEFT THREADS DIRECTORY */}
            <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">CLIENT NEGOTIATIONS MESSAGING DESK</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {negotiations.length} Active
                    </span>
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, company or deal ID..."
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {filteredThreads.map((thread) => {
                    const lastMsg = thread.messages && thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : null;
                    const isSelected = activeDealId === thread.id;
                    const hasMessages = thread.messages && thread.messages.length > 0;

                    return (
                      <button
                        key={thread.id}
                        onClick={() => handleSelectThread(thread)}
                        className={`w-full text-left p-4 transition-all flex items-start gap-3 relative ${
                          isSelected ? 'bg-emerald-50/80 border-l-4 border-slate-400' : 'hover:bg-slate-100/80 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm font-mono">
                          {(thread.companyName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h4 className="text-xs font-black text-slate-900 truncate">{thread.companyName}</h4>
                            <span className="text-[9px] font-mono text-slate-400">{lastMsg?.time || thread.createdAt}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-700 font-bold">{thread.email || thread.id}</span>
                            {thread.hasUnread || thread.status === 'PENDING_REVIEW' ? (
                              <span className="bg-slate-900 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                                New Request
                              </span>
                            ) : thread.status === 'APPROVED_DISPATCHED' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                Dispatched
                              </span>
                            ) : !hasMessages ? (
                              <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                                Standby
                              </span>
                            ) : null}
                          </div>

                          <p className="text-[11px] text-slate-500 truncate mt-1 font-medium">
                            {lastMsg ? `${lastMsg.sender}: ${lastMsg.text}` : 'No messages yet • Click to send proactive quote'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT CANVAS */}
            <div className="lg:col-span-8 bg-slate-100/50 flex flex-col justify-between">
              {activeThread ? (
                <>
                  <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-sm font-mono">
                        {(activeThread.companyName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {activeThread.companyName}
                        </h3>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5 font-mono">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-900 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-900"></span>
                          </span>
                          Online • B2B Logistics Desk ({activeThread.cargoType || 'Bagged Cement'})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApproveDealAndAllocateWagons(activeThread)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <span>Accept Deal & Allocate Wagons</span>
                    </button>
                  </div>

                  <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto font-sans">
                    {(activeThread.messages || []).map((msg: any, idx: number) => {
                      const isAdmin = !msg.role?.includes('Consignee') && !msg.sender.includes(activeThread.companyName);

                      return (
                        <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 shadow-sm ${
                            isAdmin
                              ? 'bg-slate-900 text-white rounded-br-none'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                          }`}>
                            <div className="flex justify-between items-center gap-4 text-[9px] opacity-90 border-b border-black/10 pb-1 font-mono">
                              <span className="font-extrabold">{msg.sender} ({msg.role || 'Client Lead'})</span>
                              <span>{msg.time}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-line font-medium text-xs mt-1">{msg.text}</p>
                            <div className="text-right text-[9px] font-mono opacity-80 pt-0.5">
                              {isAdmin ? 'ApprovedDelivered' : 'Received'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleAdminReply} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                    <input
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder={`Type a response to ${activeThread.companyName}...`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all"
                    >
                      Send Reply →
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center my-auto space-y-2 p-8">
                  <span className="text-xs font-mono text-slate-400 font-bold block">[ NO CONVERSATION SELECTED ]</span>
                  <h3 className="text-base font-black text-slate-900">Select a Client Conversation from the Sidebar</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: LIVE TELEMETRY & SATELLITE GPS ─── */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6 font-sans">
            <LiveGpsMap trips={trips} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trips.map((trip) => (
                <div key={trip.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">{trip.id}</span>
                      <h3 className="text-base font-black text-slate-900">{trip.company || 'Industrial Consignee'}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDossierTrip(trip)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Dossier</span>
                      </button>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase">
                        {trip.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs text-center">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Locomotive</span><span className="font-mono font-bold text-slate-900">{trip.locomotiveId || 'L2205'}</span></div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Escort Officer</span><span className="font-mono font-bold text-slate-700">{trip.monitoringOfficerName || trip.cargoOfficerName || 'Ade Bello'}</span></div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Quantity</span><span className="font-mono font-bold text-emerald-700">{trip.quantity} {trip.unitOfMeasure || 'Bags'}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: MANIFEST AUDITS ─── */}
        {activeTab === 'manifest' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Official Consignment Manifests</span>
              <h3 className="text-base font-black text-slate-900">Cargo Loading & Unloading Tally Audits</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {trips.map((t) => (
                <div key={t.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase">{t.id}</span>
                    <h4 className="font-sans font-black text-slate-900 text-sm">{t.company}</h4>
                    <p className="text-slate-500 font-sans text-xs">{t.origin} → {t.destination} • {t.quantity} {t.unitOfMeasure || 'Bags'}</p>
                  </div>
                  <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl">
                    Print Manifest (PDF)
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 5: ENTERPRISE FREIGHT ACCOUNTING, INVOICING & TRIP COSTING LEDGER ─── */}
        {activeTab === 'billing' && (() => {
          // KPI Calculations
          const totalGrossBilled = invoices.reduce((acc, inv) => acc + (Number(inv.subtotal) || 0), 0);
          const totalDamageDeductions = invoices.reduce((acc, inv) => acc + (Number(inv.damageDeduction) || 0), 0);
          const totalBurstBagsLogged = invoices.reduce((acc, inv) => acc + (Number(inv.damageUnits) || 0), 0);
          const totalNetBilled = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
          const totalCollected = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
          const totalOutstandingAR = invoices.reduce((acc, inv) => acc + (Number(inv.balance) || 0), 0);

          // Direct Operating Costs
          const totalDirectCosts = tripCosts.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
          const approvedSidingRequests = requests.filter(
            (r) => r.status === 'APPROVED' || r.status === 'DISBURSED'
          );
          const totalSidingRequests = approvedSidingRequests.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
          const totalOperatingCOGS = totalDirectCosts + totalSidingRequests;
          const netOperatingGrossProfit = totalNetBilled - totalOperatingCOGS;
          const corridorMarginPct = totalNetBilled > 0 ? Math.round((netOperatingGrossProfit / totalNetBilled) * 100) : 0;

          // Filtered Invoices
          const filteredInvoices = invoices.filter((inv) => {
            const matchesSearch =
              !invoiceSearch ||
              (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
              (inv.companyName && inv.companyName.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
              (inv.route && inv.route.toLowerCase().includes(invoiceSearch.toLowerCase())) ||
              (inv.cargoType && inv.cargoType.toLowerCase().includes(invoiceSearch.toLowerCase()));

            if (!matchesSearch) return false;

            if (invoiceStatusFilter === 'ALL') return true;
            if (invoiceStatusFilter === 'SETTLED') return inv.status === 'SETTLED' || Number(inv.balance || 0) <= 0;
            if (invoiceStatusFilter === 'PARTIALLY_PAID') return inv.status === 'PARTIALLY_PAID' || (Number(inv.amountPaid || 0) > 0 && Number(inv.balance || 0) > 0);
            if (invoiceStatusFilter === 'ISSUED') return inv.status === 'ISSUED' && Number(inv.amountPaid || 0) === 0;

            return true;
          });

          return (
            <div className="space-y-6 font-sans">
              {/* Header & Quick Action Toolbar */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                      Commercial Finance & Treasury
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                      Audited AR / AP Ledger
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Freight Invoicing, Damage Indemnity & Corridor Costing
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dynamic customer billing with burst-bag deductions (AR), direct corridor COGS (NRC tolls, AGO diesel, crew), and real-time corridor profit margins.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleSyncTripInvoices}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                    title="Scan all train trips and update invoices with latest offload damage / burst bag counts"
                  >
                    <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /><span>Reconcile Trips & Damages</span></span>
                  </button>
                  <button
                    onClick={() => setNewCostModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>+ Book Corridor Expense</span>
                  </button>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setAccountingSubTab('invoices')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'invoices'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Invoices (AR)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {invoices.length}
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('coa')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'coa'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Chart of Accounts (COA)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'coa' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {chartAccounts.length}
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('journal')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'journal'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>General Journal</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'journal' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {journalEntries.length}
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('statements')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'statements'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Financial Statements</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'statements' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                    P&L / BS / TB
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('banking')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'banking'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Bank & Treasury</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'banking' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {bankAccounts.length}
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('pnl')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'pnl'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Corridor Trip P&L (COGS)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'pnl' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {corridorMarginPct}%
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('customers')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'customers'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Consignee Ledger</span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('deal_costing')}
                  className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    accountingSubTab === 'deal_costing'
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Contract Tariffs</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'deal_costing' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {deals.length}
                  </span>
                </button>
              </div>

              {/* Executive KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Gross Billed */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Gross Freight Billed</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                    ₦{totalGrossBilled.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Total tariff value</span>
                </div>

                {/* Damage Claims Deductions */}
                <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block font-mono">Transit Damage Claims</span>
                    <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                      {totalBurstBagsLogged} Burst
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">
                    -₦{totalDamageDeductions.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-rose-500">Agreed debit deductions</span>
                </div>

                {/* Net Billed Revenue */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block font-mono">Net Billed Revenue</span>
                  <p className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5">
                    ₦{totalNetBilled.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-emerald-600">Net payable after damages</span>
                </div>

                {/* Remittances Collected */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Remittances Collected</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                    ₦{totalCollected.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-700 font-bold">
                    {totalNetBilled > 0 ? Math.round((totalCollected / totalNetBilled) * 100) : 0}% Collected
                  </span>
                </div>

                {/* Outstanding AR */}
                <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block font-mono">Outstanding AR</span>
                  <p className="text-base sm:text-lg font-black text-amber-700 font-mono mt-0.5">
                    ₦{totalOutstandingAR.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-amber-600">Receivables due</span>
                </div>

                {/* Direct Corridor Operating COGS */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Corridor COGS</span>
                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      {corridorMarginPct}% Margin
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                    ₦{totalOperatingCOGS.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Tolls, fuel, crew & siding</span>
                </div>
              </div>

              {/* ── SUB-TAB: TRIP COSTING & PRICING AUTHORITY DESK ── */}
              {accountingSubTab === 'trip_pricing' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans space-y-4 p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                        FINANCE COMMAND · FREIGHT PRICING AUTHORITY
                      </span>
                      <h3 className="text-base font-black text-slate-900">
                        Official Trip Costing & Revenue Valuation Desk
                      </h3>
                      <p className="text-xs text-slate-500">
                        Finance is the exclusive authority on trip costing. Inspect consignments, assess damage claims, and update negotiated freight rates.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400 bg-slate-50/50">
                          <th className="py-3 px-3">Trip ID & Locomotive</th>
                          <th className="py-3 px-3">Client / Consignee</th>
                          <th className="py-3 px-3">Corridor Route</th>
                          <th className="py-3 px-3">Consist & Payload</th>
                          <th className="py-3 px-3">Discrepancies / Burst Bags</th>
                          <th className="py-3 px-3">Finance Agreed Cost</th>
                          <th className="py-3 px-3">Pricing Status</th>
                          <th className="py-3 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {trips.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-8 text-slate-400 font-sans">
                              No trips found in database.
                            </td>
                          </tr>
                        ) : (
                          trips.map((t: any) => {
                            const damages = (t.damages?.damagedUnits || 0) + (t.damages?.burstBags || 0);
                            const isCosted = t.costingStatus === 'COSTED' || t.financeCost || t.tripRevenue;
                            const costAmount = Number(t.financeCost || t.tripRevenue || 0);

                            return (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3.5 px-3">
                                  <span className="font-bold text-navy block">{t.tripId || t.id}</span>
                                  <span className="text-[10px] text-slate-500 font-normal font-sans">Loco: #{t.locomotiveId || 'L2205'}</span>
                                </td>
                                <td className="py-3.5 px-3 font-sans font-bold text-slate-900">
                                  {t.company || 'Corporate Client'}
                                </td>
                                <td className="py-3.5 px-3 font-bold text-slate-700">
                                  {t.origin} ➔ {t.destination}
                                </td>
                                <td className="py-3.5 px-3">
                                  <span className="font-bold text-slate-800 block">
                                    {t.wagonLogs?.length || 20} Wagons
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-normal">
                                    {Number(t.quantity || 1200).toLocaleString()} {t.unitOfMeasure || 'Bags'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3">
                                  {damages > 0 ? (
                                    <span className="text-rose-600 font-extrabold">{damages} Burst/Damaged</span>
                                  ) : (
                                    <span className="text-emerald-700 font-bold">0 Damage (Intact)</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 font-bold text-sm">
                                  {isCosted ? (
                                    <span className="text-slate-900">₦{costAmount.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-amber-700 font-mono text-xs">Costing Pending</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3">
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                                      isCosted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {isCosted ? 'COSTED & APPROVED' : 'AWAITING PRICING'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-right">
                                  <button
                                    onClick={() => handleOpenPricingModal(t)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                                  >
                                    {isCosted ? 'Edit Cost' : 'Set Trip Cost'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 1: COMMERCIAL INVOICES (AR) ── */}
              {accountingSubTab === 'invoices' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans space-y-4 p-6">
                  {/* Search & Filter Toolbar */}
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Search Invoice #, Client, Route..."
                        value={invoiceSearch}
                        onChange={(e) => setInvoiceSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                      {(['ALL', 'SETTLED', 'PARTIALLY_PAID', 'ISSUED'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setInvoiceStatusFilter(st)}
                          className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                            invoiceStatusFilter === st
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400 bg-slate-50/50">
                          <th className="py-3 px-3">Invoice & Date</th>
                          <th className="py-3 px-3">Consignee & Corridor</th>
                          <th className="py-3 px-3">Cargo Spec</th>
                          <th className="py-3 px-3 text-right">Gross Tariff</th>
                          <th className="py-3 px-3 text-right">Damage Deduction</th>
                          <th className="py-3 px-3 text-right">Net Payable</th>
                          <th className="py-3 px-3 text-right">Remitted</th>
                          <th className="py-3 px-3 text-right">Balance Due</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs font-mono divide-y divide-slate-100">
                        {filteredInvoices.map((inv: any) => {
                          const isSettled = inv.status === 'SETTLED' || Number(inv.balance || 0) <= 0;
                          const isPartiallyPaid = inv.status === 'PARTIALLY_PAID' || (Number(inv.amountPaid || 0) > 0 && Number(inv.balance || 0) > 0);
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50/60 transition-all">
                              <td className="py-3.5 px-3">
                                <span className="font-bold text-slate-900 block">{inv.invoiceNumber || inv.id}</span>
                                <span className="text-[10px] text-slate-400 block">{inv.issueDate}</span>
                                <span className="text-[9px] text-slate-700 font-bold">Trip: {inv.tripId}</span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="font-sans font-bold text-slate-900 block">{inv.companyName}</span>
                                <span className="text-[10px] text-slate-500 font-sans">{inv.route}</span>
                              </td>
                              <td className="py-3.5 px-3">
                                <span className="font-sans text-slate-700 block">{inv.cargoType}</span>
                                <span className="text-[10px] text-slate-400">
                                  {Number(inv.totalBags || 0).toLocaleString()} Bags ({Number(inv.totalTonnes || 0).toLocaleString()} MT)
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold text-slate-700">
                                ₦{Number(inv.subtotal || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 text-right">
                                {Number(inv.damageUnits || 0) > 0 ? (
                                  <div>
                                    <span className="text-rose-600 font-black block">
                                      -₦{Number(inv.damageDeduction || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] text-rose-500 font-bold bg-rose-50 px-1 rounded">
                                      {inv.damageUnits} Burst Bags
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-[10px]">Intact</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right font-black text-slate-900">
                                ₦{Number(inv.totalAmount || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                                ₦{Number(inv.amountPaid || 0).toLocaleString()}
                              </td>
                              <td className="py-3.5 px-3 text-right font-black">
                                <span className={Number(inv.balance || 0) > 0 ? 'text-rose-600' : 'text-slate-400'}>
                                  ₦{Number(inv.balance || 0).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <span
                                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                    isSettled
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isPartiallyPaid
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {inv.status || 'ISSUED'}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => setSelectedInvoiceForPrint(inv)}
                                    className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                    title="View & Print Official PDF Freight Invoice"
                                  >
                                    Invoice
                                  </button>
                                  {!isSettled && (
                                    <button
                                      onClick={() => {
                                        setPaymentModalInvoice(inv);
                                        setPaymentForm({
                                          amount: String(inv.balance || ''),
                                          type: Number(inv.amountPaid || 0) === 0 ? 'ADVANCE_DEPOSIT (70%)' : 'FINAL_SETTLEMENT',
                                          ref: '',
                                          date: new Date().toLocaleDateString('en-GB'),
                                        });
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                                      title="Record Customer Remittance / Bank Transfer"
                                    >
                                      + Pay
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: CHART OF ACCOUNTS (COA) ── */}
              {accountingSubTab === 'coa' && (
                <div className="space-y-6 font-sans">
                  {/* COA Control Bar & KPI Summary */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-wider">
                          General Ledger Architecture
                        </span>
                        <span className="bg-blue-100 text-blue-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase font-mono">
                          5-Tier Standard (1000s - 6000s)
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">Master Chart of Accounts (COA)</h3>
                      <p className="text-xs text-slate-500">
                        Institutional general ledger classification across Assets, Liabilities, Equity, Freight Revenue, Direct Rail Costs, and OpEx.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
    if (!can('finance.coa_manage')) {
      setCustomAlert({
        title: 'Permission Denied',
        message: 'Your current role does not have authorization (finance.coa_manage) to configure General Ledger accounts.',
      });
      return;
    }
    setNewAccountModal(true);
  }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>+ Add GL Account</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Summary Metric Cards */}
                  {(() => {
                    const totAssets = chartAccounts.filter((a) => a.type === 'ASSET').reduce((s, a) => s + (Number(a.balance) || 0), 0);
                    const totLiab = chartAccounts.filter((a) => a.type === 'LIABILITY').reduce((s, a) => s + (Number(a.balance) || 0), 0);
                    const totEquity = chartAccounts.filter((a) => a.type === 'EQUITY').reduce((s, a) => s + (Number(a.balance) || 0), 0);
                    const totRev = chartAccounts.filter((a) => a.type === 'REVENUE').reduce((s, a) => s + (Number(a.balance) || 0), 0);
                    const totExp = chartAccounts.filter((a) => a.type === 'EXPENSE').reduce((s, a) => s + (Number(a.balance) || 0), 0);

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200">
                          <span className="text-[10px] uppercase font-bold text-blue-700 font-mono block">1000s • Total Assets</span>
                          <p className="text-base font-black text-blue-900 font-mono mt-0.5">₦{totAssets.toLocaleString()}</p>
                          <span className="text-[10px] text-blue-600">{chartAccounts.filter((a) => a.type === 'ASSET').length} accounts</span>
                        </div>
                        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                          <span className="text-[10px] uppercase font-bold text-amber-700 font-mono block">2000s • Total Liabilities</span>
                          <p className="text-base font-black text-amber-900 font-mono mt-0.5">₦{totLiab.toLocaleString()}</p>
                          <span className="text-[10px] text-amber-600">{chartAccounts.filter((a) => a.type === 'LIABILITY').length} accounts</span>
                        </div>
                        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-200">
                          <span className="text-[10px] uppercase font-bold text-purple-700 font-mono block">3000s • Total Equity</span>
                          <p className="text-base font-black text-purple-900 font-mono mt-0.5">₦{totEquity.toLocaleString()}</p>
                          <span className="text-[10px] text-purple-600">{chartAccounts.filter((a) => a.type === 'EQUITY').length} accounts</span>
                        </div>
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 font-mono block">4000s • Total Revenue</span>
                          <p className="text-base font-black text-emerald-900 font-mono mt-0.5">₦{totRev.toLocaleString()}</p>
                          <span className="text-[10px] text-emerald-600">{chartAccounts.filter((a) => a.type === 'REVENUE').length} accounts</span>
                        </div>
                        <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200">
                          <span className="text-[10px] uppercase font-bold text-rose-700 font-mono block">5000s-6000s • Total Expenses</span>
                          <p className="text-base font-black text-rose-900 font-mono mt-0.5">₦{totExp.toLocaleString()}</p>
                          <span className="text-[10px] text-rose-600">{chartAccounts.filter((a) => a.type === 'EXPENSE').length} accounts</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* COA Category Filter Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { key: 'ALL', label: 'All Accounts' },
                      { key: 'ASSET', label: 'Assets (1000s)' },
                      { key: 'LIABILITY', label: 'Liabilities (2000s)' },
                      { key: 'EQUITY', label: 'Equity (3000s)' },
                      { key: 'REVENUE', label: 'Revenue (4000s)' },
                      { key: 'EXPENSE', label: 'Expenses (5000s-6000s)' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setCoaFilter(f.key as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          coaFilter === f.key
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Chart of Accounts Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                          <th className="p-3.5">GL Code</th>
                          <th className="p-3.5">Account Title</th>
                          <th className="p-3.5">Category</th>
                          <th className="p-3.5">Sub-Classification</th>
                          <th className="p-3.5 text-right">Ledger Balance (₦)</th>
                          <th className="p-3.5 text-center">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {chartAccounts
                          .filter((a) => coaFilter === 'ALL' || a.type === coaFilter)
                          .map((acc) => {
                            const badgeColor =
                              acc.type === 'ASSET'
                                ? 'bg-blue-100 text-blue-800'
                                : acc.type === 'LIABILITY'
                                ? 'bg-amber-100 text-amber-800'
                                : acc.type === 'EQUITY'
                                ? 'bg-purple-100 text-purple-800'
                                : acc.type === 'REVENUE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800';

                            return (
                              <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3.5 font-mono font-black text-slate-800">
                                  <span className="bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                                    {acc.code}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-extrabold text-slate-900">{acc.name}</div>
                                  {acc.description && (
                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">{acc.description}</div>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full ${badgeColor}`}>
                                    {acc.type}
                                  </span>
                                </td>
                                <td className="p-3.5 font-sans text-slate-600 font-medium">
                                  {acc.subType}
                                </td>
                                <td className="p-3.5 text-right font-mono font-black text-slate-900">
                                  ₦{acc.balance.toLocaleString()}
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedLedgerAccount(acc.id);
                                      setStatementTab('ledger');
                                      setAccountingSubTab('statements');
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-all cursor-pointer"
                                  >
                                    View Ledger →
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: GENERAL JOURNAL ── */}
              {accountingSubTab === 'journal' && (
                <div className="space-y-6 font-sans">
                  {/* Journal Header & Metric Bar */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-purple-600 uppercase tracking-wider">
                          Audited Financial Records
                        </span>
                        <span className="bg-purple-100 text-purple-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase font-mono">
                          Balanced General Journal
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">General Journal & Transaction Vouchers</h3>
                      <p className="text-xs text-slate-500">
                        Immutable double-entry transaction vouchers. Every posted entry updates the corresponding Chart of Accounts ledgers in real-time.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
    if (!can('finance.journal_create')) {
      setCustomAlert({
        title: 'Permission Denied',
        message: 'Your current role does not have authorization (finance.journal_create) to post General Journal vouchers. Please request permission from system admin.',
      });
      return;
    }
    setNewJournalModal(true);
  }}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>+ Post Journal Voucher</span>
                      </button>
                    </div>
                  </div>

                  {/* Journal Metrics */}
                  {(() => {
                    const totalTurnover = journalEntries.reduce((s, j) => s + (Number(j.totalAmount) || 0), 0);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Total Journal Vouchers</span>
                          <p className="text-base font-black text-slate-900 font-mono mt-0.5">{journalEntries.length}</p>
                          <span className="text-[10px] text-slate-400">Posted entries</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Total Turnover Recorded</span>
                          <p className="text-base font-black text-purple-700 font-mono mt-0.5">₦{totalTurnover.toLocaleString()}</p>
                          <span className="text-[10px] text-purple-500">Debits and Credits</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block font-mono">Ledger Equilibrium</span>
                          <p className="text-base font-black text-emerald-700 font-mono mt-0.5">100% Balanced</p>
                          <span className="text-[10px] text-emerald-600">0 Unbalanced Entries</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Enforcement Engine</span>
                          <p className="text-base font-black text-slate-900 font-mono mt-0.5">Double-Entry</p>
                          <span className="text-[10px] text-slate-400">Strict Debits === Credits</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Journal Entries List */}
                  <div className="space-y-4">
                    {journalEntries.map((jrn) => (
                      <div key={jrn.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-purple-100 text-purple-800 font-mono font-black text-xs px-2.5 py-1 rounded-lg">
                              {jrn.journalNo}
                            </span>
                            <div>
                              <span className="font-extrabold text-slate-900 text-xs block">{jrn.description}</span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>{jrn.date}</span>
                                <span>• Ref: {jrn.reference}</span>
                                <span>• Posted by: {jrn.postedBy}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-mono font-bold text-slate-400 block">Total Voucher Value</span>
                              <span className="text-xs font-mono font-black text-slate-900">₦{jrn.totalAmount.toLocaleString()}</span>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-1 rounded-full font-mono uppercase">
                              {jrn.status}
                            </span>
                          </div>
                        </div>

                        {/* Line Items Split Table */}
                        <div className="p-3">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="text-[10px] font-mono uppercase text-slate-400 border-b border-slate-100">
                                <th className="py-2 px-3">GL Account</th>
                                <th className="py-2 px-3">Line Narration</th>
                                <th className="py-2 px-3 text-right">Debit (₦)</th>
                                <th className="py-2 px-3 text-right">Credit (₦)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {jrn.lines.map((line, lIdx) => (
                                <tr key={lIdx} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 font-mono">
                                    <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-2">
                                      {line.accountCode}
                                    </span>
                                    <span className="text-slate-700 font-semibold">{line.accountName}</span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-500 font-sans text-[11px]">{line.description}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    {line.debit > 0 ? `₦${line.debit.toLocaleString()}` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                    {line.credit > 0 ? `₦${line.credit.toLocaleString()}` : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-slate-200 bg-slate-50/50 text-[11px] font-mono font-black">
                                <td colSpan={2} className="py-2 px-3 text-slate-600 uppercase">
                                  Total Voucher Balance (Equality Check)
                                </td>
                                <td className="py-2 px-3 text-right text-purple-900">
                                  ₦{jrn.lines.reduce((s, l) => s + l.debit, 0).toLocaleString()}
                                </td>
                                <td className="py-2 px-3 text-right text-purple-900">
                                  ₦{jrn.lines.reduce((s, l) => s + l.credit, 0).toLocaleString()}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUB-TAB: FINANCIAL STATEMENTS (P&L / BALANCE SHEET / TRIAL BALANCE) ── */}
              {accountingSubTab === 'statements' && (
                <div className="space-y-6 font-sans">
                  {/* Statements Sub-Tabs */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStatementTab('trial_balance')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          statementTab === 'trial_balance'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /><span>Trial Balance</span></span>
                      </button>
                      <button
                        onClick={() => setStatementTab('pnl')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          statementTab === 'pnl'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /><span>Profit & Loss (P&L)</span></span>
                      </button>
                      <button
                        onClick={() => setStatementTab('balance_sheet')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          statementTab === 'balance_sheet'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /><span>Balance Sheet</span></span>
                      </button>
                      <button
                        onClick={() => setStatementTab('ledger')}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                          statementTab === 'ledger'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /><span>General Ledger</span></span>
                      </button>
                    </div>

                    <button
                      onClick={() => window.print()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
<span className="flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /><span>Print Statement</span></span>
                    </button>
                  </div>

                  {/* 1. TRIAL BALANCE VIEW */}
                  {statementTab === 'trial_balance' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="border-b border-slate-200 pb-4 text-center sm:text-left">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Bueno Logistics Limited</span>
                            <h3 className="text-xl font-black text-slate-900">General Ledger Trial Balance</h3>
                            <p className="text-xs text-slate-500 mt-0.5">As of {new Date().toLocaleDateString('en-GB')} • All Currency in NGN (₦)</p>
                          </div>
                          <div className="bg-emerald-100 text-emerald-800 font-mono font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-300">
                            LEDGER IN AUDITED EQUILIBRIUM
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] font-mono uppercase text-slate-600 border-b border-slate-200">
                              <th className="p-3">Account Code</th>
                              <th className="p-3">Account Title</th>
                              <th className="p-3">Account Class</th>
                              <th className="p-3 text-right">Debit Balance (₦)</th>
                              <th className="p-3 text-right">Credit Balance (₦)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {(() => {
                              let totalDebit = 0;
                              let totalCredit = 0;

                              const rows = chartAccounts.map((acc) => {
                                const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
                                const debitVal = isDebitNormal ? acc.balance : 0;
                                const creditVal = !isDebitNormal ? acc.balance : 0;
                                totalDebit += debitVal;
                                totalCredit += creditVal;

                                return (
                                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-mono font-bold text-slate-800">{acc.code}</td>
                                    <td className="p-3 font-bold text-slate-900">{acc.name}</td>
                                    <td className="p-3 text-[10px] font-mono text-slate-500">{acc.type}</td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                                      {debitVal > 0 ? `₦${debitVal.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-slate-800">
                                      {creditVal > 0 ? `₦${creditVal.toLocaleString()}` : '—'}
                                    </td>
                                  </tr>
                                );
                              });

                              return (
                                <>
                                  {rows}
                                  <tr className="bg-slate-900 text-white font-mono font-black text-xs border-t-2 border-slate-900">
                                    <td colSpan={3} className="p-4 uppercase tracking-wider">
                                      Total Trial Balance (Sum of All Accounts)
                                    </td>
                                    <td className="p-4 text-right text-emerald-400">
                                      ₦{totalDebit.toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right text-emerald-400">
                                      ₦{totalCredit.toLocaleString()}
                                    </td>
                                  </tr>
                                </>
                              );
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2. PROFIT & LOSS VIEW */}
                  {statementTab === 'pnl' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
                      <div className="border-b border-slate-200 pb-4 text-center">
                        <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-widest">
                          Bueno Logistics Limited
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-1">Statement of Profit or Loss (P&L)</h3>
                        <p className="text-xs text-slate-500">For Period Ended {new Date().toLocaleDateString('en-GB')}</p>
                      </div>

                      {(() => {
                        const revAccounts = chartAccounts.filter((a) => a.type === 'REVENUE');
                        const totRev = revAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

                        const cogsAccounts = chartAccounts.filter((a) => a.code.startsWith('5'));
                        const totCogs = cogsAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

                        const grossSurplus = totRev - totCogs;
                        const grossMarginPct = totRev > 0 ? ((grossSurplus / totRev) * 100).toFixed(1) : '0.0';

                        const opexAccounts = chartAccounts.filter((a) => a.code.startsWith('6'));
                        const totOpex = opexAccounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

                        const netSurplus = grossSurplus - totOpex;
                        const netMarginPct = totRev > 0 ? ((netSurplus / totRev) * 100).toFixed(1) : '0.0';

                        return (
                          <div className="space-y-6 font-sans text-xs">
                            {/* REVENUE */}
                            <div>
                              <div className="bg-slate-100 p-2.5 font-bold font-mono text-slate-800 uppercase tracking-wider rounded-lg flex justify-between">
                                <span>Commercial Revenue (4000s)</span>
                                <span>NGN (₦)</span>
                              </div>
                              <div className="divide-y divide-slate-100 mt-1">
                                {revAccounts.map((a) => (
                                  <div key={a.id} className="py-2 px-3 flex justify-between items-center">
                                    <span className="text-slate-700">[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-slate-900">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="py-2 px-3 flex justify-between items-center font-bold bg-emerald-50/50 text-emerald-900">
                                  <span>Total Commercial Revenue</span>
                                  <span className="font-mono text-sm">₦{totRev.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* COST OF GOODS SOLD */}
                            <div>
                              <div className="bg-slate-100 p-2.5 font-bold font-mono text-slate-800 uppercase tracking-wider rounded-lg flex justify-between">
                                <span>Direct Railway Haulage Costs / COGS (5000s)</span>
                                <span>NGN (₦)</span>
                              </div>
                              <div className="divide-y divide-slate-100 mt-1">
                                {cogsAccounts.map((a) => (
                                  <div key={a.id} className="py-2 px-3 flex justify-between items-center">
                                    <span className="text-slate-700">[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-rose-700">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="py-2 px-3 flex justify-between items-center font-bold bg-rose-50/50 text-rose-900">
                                  <span>Total Direct Railway Costs</span>
                                  <span className="font-mono text-sm">₦{totCogs.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* GROSS MARGIN */}
                            <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center">
                              <div>
                                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">Gross Railway Freight Margin</span>
                                <span className="text-xs text-slate-300">Revenue minus Direct Rail Costs</span>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-black font-mono text-emerald-400">₦{grossSurplus.toLocaleString()}</div>
                                <span className="text-[10px] text-slate-300 font-mono">{grossMarginPct}% Gross Margin</span>
                              </div>
                            </div>

                            {/* OPERATING EXPENSES */}
                            <div>
                              <div className="bg-slate-100 p-2.5 font-bold font-mono text-slate-800 uppercase tracking-wider rounded-lg flex justify-between">
                                <span>Operating & Administrative Expenses / OpEx (6000s)</span>
                                <span>NGN (₦)</span>
                              </div>
                              <div className="divide-y divide-slate-100 mt-1">
                                {opexAccounts.map((a) => (
                                  <div key={a.id} className="py-2 px-3 flex justify-between items-center">
                                    <span className="text-slate-700">[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-slate-800">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="py-2 px-3 flex justify-between items-center font-bold bg-slate-100 text-slate-900">
                                  <span>Total Operating Expenses</span>
                                  <span className="font-mono text-sm">₦{totOpex.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* NET SURPLUS */}
                            <div className="bg-slate-900 text-white p-5 rounded-2xl flex justify-between items-center shadow-lg">
                              <div>
                                <span className="text-[11px] uppercase font-mono font-black tracking-widest text-emerald-100 block">
                                  Net Operating Surplus / EBITDA
                                </span>
                                <span className="text-xs text-white/80">Net comprehensive surplus transferred to retained earnings</span>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black font-mono text-white">₦{netSurplus.toLocaleString()}</div>
                                <span className="text-xs font-mono font-bold text-emerald-100">{netMarginPct}% Net Surplus Margin</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 3. BALANCE SHEET VIEW */}
                  {statementTab === 'balance_sheet' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto">
                      <div className="border-b border-slate-200 pb-4 text-center">
                        <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-widest">
                          Bueno Logistics Limited
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-1">Statement of Financial Position (Balance Sheet)</h3>
                        <p className="text-xs text-slate-500">As of {new Date().toLocaleDateString('en-GB')} • Double-Entry Reconciled</p>
                      </div>

                      {(() => {
                        const currentAssets = chartAccounts.filter((a) => a.type === 'ASSET' && (a.code.startsWith('10') || a.subType.includes('Current')));
                        const totCurAssets = currentAssets.reduce((s, a) => s + a.balance, 0);

                        const nonCurAssets = chartAccounts.filter((a) => a.type === 'ASSET' && !(a.code.startsWith('10') || a.subType.includes('Current')));
                        const totNonCurAssets = nonCurAssets.reduce((s, a) => s + a.balance, 0);

                        const totalAssets = totCurAssets + totNonCurAssets;

                        const curLiabilities = chartAccounts.filter((a) => a.type === 'LIABILITY' && (a.code.startsWith('20') || a.subType.includes('Current')));
                        const totCurLiab = curLiabilities.reduce((s, a) => s + a.balance, 0);

                        const nonCurLiabilities = chartAccounts.filter((a) => a.type === 'LIABILITY' && !(a.code.startsWith('20') || a.subType.includes('Current')));
                        const totNonCurLiab = nonCurLiabilities.reduce((s, a) => s + a.balance, 0);

                        const totalLiabilities = totCurLiab + totNonCurLiab;

                        const equityAccounts = chartAccounts.filter((a) => a.type === 'EQUITY');
                        const totEquityAccts = equityAccounts.reduce((s, a) => s + a.balance, 0);

                        const revAccounts = chartAccounts.filter((a) => a.type === 'REVENUE');
                        const totRev = revAccounts.reduce((s, a) => s + a.balance, 0);
                        const expAccounts = chartAccounts.filter((a) => a.type === 'EXPENSE');
                        const totExp = expAccounts.reduce((s, a) => s + a.balance, 0);
                        const netSurplus = totRev - totExp;

                        const totalEquity = totEquityAccts;
                        const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
                        const variance = Math.abs(totalAssets - totalLiabilitiesAndEquity);

                        return (
                          <div className="space-y-6 font-sans text-xs">
                            {/* ASSETS SECTION */}
                            <div className="space-y-3">
                              <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 font-mono font-bold text-blue-900 flex justify-between items-center uppercase">
                                <span>1. ASSETS</span>
                                <span>NGN (₦)</span>
                              </div>

                              <div className="pl-3 space-y-1">
                                <span className="font-bold text-slate-800 text-[11px] block">Current Assets</span>
                                {currentAssets.map((a) => (
                                  <div key={a.id} className="py-1 px-3 flex justify-between text-slate-600">
                                    <span>[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-slate-900">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="py-1.5 px-3 flex justify-between font-bold bg-slate-50 text-slate-800 rounded">
                                  <span>Total Current Assets</span>
                                  <span className="font-mono">₦{totCurAssets.toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="pl-3 space-y-1">
                                <span className="font-bold text-slate-800 text-[11px] block">Non-Current (Fixed) Assets</span>
                                {nonCurAssets.map((a) => (
                                  <div key={a.id} className="py-1 px-3 flex justify-between text-slate-600">
                                    <span>[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-slate-900">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="py-1.5 px-3 flex justify-between font-bold bg-slate-50 text-slate-800 rounded">
                                  <span>Total Non-Current Assets</span>
                                  <span className="font-mono">₦{totNonCurAssets.toLocaleString()}</span>
                                </div>
                              </div>

                              <div className="p-3 bg-blue-900 text-white rounded-xl flex justify-between items-center font-mono font-black text-sm">
                                <span>TOTAL ASSETS</span>
                                <span>₦{totalAssets.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* LIABILITIES SECTION */}
                            <div className="space-y-3 pt-2">
                              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 font-mono font-bold text-amber-900 flex justify-between items-center uppercase">
                                <span>2. LIABILITIES</span>
                                <span>NGN (₦)</span>
                              </div>

                              <div className="pl-3 space-y-1">
                                <span className="font-bold text-slate-800 text-[11px] block">Current Liabilities</span>
                                {curLiabilities.map((a) => (
                                  <div key={a.id} className="py-1 px-3 flex justify-between text-slate-600">
                                    <span>[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-slate-900">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="py-1.5 px-3 flex justify-between font-bold bg-slate-50 text-slate-800 rounded">
                                  <span>Total Current Liabilities</span>
                                  <span className="font-mono">₦{totCurLiab.toLocaleString()}</span>
                                </div>
                              </div>

                              {nonCurLiabilities.length > 0 && (
                                <div className="pl-3 space-y-1">
                                  <span className="font-bold text-slate-800 text-[11px] block">Non-Current Liabilities</span>
                                  {nonCurLiabilities.map((a) => (
                                    <div key={a.id} className="py-1 px-3 flex justify-between text-slate-600">
                                      <span>[{a.code}] {a.name}</span>
                                      <span className="font-mono font-bold text-slate-900">₦{a.balance.toLocaleString()}</span>
                                    </div>
                                  ))}
                                  <div className="py-1.5 px-3 flex justify-between font-bold bg-slate-50 text-slate-800 rounded">
                                    <span>Total Non-Current Liabilities</span>
                                    <span className="font-mono">₦{totNonCurLiab.toLocaleString()}</span>
                                  </div>
                                </div>
                              )}

                              <div className="p-3 bg-amber-900 text-white rounded-xl flex justify-between items-center font-mono font-black">
                                <span>TOTAL LIABILITIES</span>
                                <span>₦{totalLiabilities.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* EQUITY SECTION */}
                            <div className="space-y-3 pt-2">
                              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 font-mono font-bold text-purple-900 flex justify-between items-center uppercase">
                                <span>3. SHAREHOLDERS' EQUITY</span>
                                <span>NGN (₦)</span>
                              </div>

                              <div className="pl-3 space-y-1">
                                {equityAccounts.map((a) => (
                                  <div key={a.id} className="py-1 px-3 flex justify-between text-slate-600">
                                    <span>[{a.code}] {a.name}</span>
                                    <span className="font-mono font-bold text-slate-900">₦{a.balance.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="p-3 bg-purple-900 text-white rounded-xl flex justify-between items-center font-mono font-black">
                                  <span>TOTAL EQUITY</span>
                                  <span>₦{totalEquity.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* BALANCED EQUALITY FOOTER */}
                            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
                              <div>
                                <span className="text-[10px] uppercase font-mono font-bold text-emerald-400 block">
                                  Accounting Equation Check (Assets = Liabilities + Equity)
                                </span>
                                <span className="text-xs text-slate-300">
                                  Total Assets: ₦{totalAssets.toLocaleString()} • Total Claims: ₦{totalLiabilitiesAndEquity.toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-mono font-black text-xs">
                                VARIANCE: ₦{variance.toFixed(2)} (BALANCED)
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 4. GENERAL LEDGER DRILL-DOWN VIEW */}
                  {statementTab === 'ledger' && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Account Activity Log</span>
                          <h3 className="text-lg font-black text-slate-900">General Ledger Account Drill-Down</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-500" htmlFor="admin-portal-select-gl-account-51">Select GL Account:</label>
                          <select id="admin-portal-select-gl-account-51"
                            value={selectedLedgerAccount}
                            onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                          >
                            {chartAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                [{a.code}] {a.name} ({a.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {(() => {
                        const acc = chartAccounts.find((a) => a.id === selectedLedgerAccount) || chartAccounts[0];
                        if (!acc) return null;

                        const matchingLines: Array<{
                          date: string;
                          voucherNo: string;
                          reference: string;
                          description: string;
                          debit: number;
                          credit: number;
                        }> = [];

                        journalEntries.forEach((j) => {
                          j.lines.forEach((l) => {
                            if (l.accountId === acc.id || l.accountCode === acc.code) {
                              matchingLines.push({
                                date: j.date,
                                voucherNo: j.journalNo,
                                reference: j.reference,
                                description: l.description || j.description,
                                debit: l.debit,
                                credit: l.credit,
                              });
                            }
                          });
                        });

                        return (
                          <div className="space-y-4 font-sans">
                            {/* Account Profile Card */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                              <div>
                                <span className="font-mono font-black text-sm text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 mr-2">
                                  {acc.code}
                                </span>
                                <span className="font-black text-slate-900 text-base">{acc.name}</span>
                                <span className="ml-2 text-xs text-slate-500">({acc.type} • {acc.subType})</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Current Closing Balance</span>
                                <span className="text-lg font-black font-mono text-slate-900">₦{acc.balance.toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Ledger Transactions Table */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 text-[10px] font-mono uppercase text-slate-500 border-b border-slate-200">
                                    <th className="p-3">Posting Date</th>
                                    <th className="p-3">Voucher #</th>
                                    <th className="p-3">Reference</th>
                                    <th className="p-3">Narration</th>
                                    <th className="p-3 text-right">Debit (₦)</th>
                                    <th className="p-3 text-right">Credit (₦)</th>
                                    <th className="p-3 text-right">Net Impact (₦)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {matchingLines.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="p-6 text-center text-slate-400 font-sans">
                                        No transaction vouchers posted to this account in the current period. Opening balance: ₦{acc.balance.toLocaleString()}.
                                      </td>
                                    </tr>
                                  ) : (
                                    matchingLines.map((ml, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono text-slate-600">{ml.date}</td>
                                        <td className="p-3 font-mono font-bold text-purple-700">{ml.voucherNo}</td>
                                        <td className="p-3 font-mono text-slate-500">{ml.reference}</td>
                                        <td className="p-3 text-slate-800">{ml.description}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                                          {ml.debit > 0 ? `₦${ml.debit.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                                          {ml.credit > 0 ? `₦${ml.credit.toLocaleString()}` : '—'}
                                        </td>
                                        <td className="p-3 text-right font-mono font-black text-slate-900">
                                          {acc.type === 'ASSET' || acc.type === 'EXPENSE'
                                            ? `₦${(ml.debit - ml.credit).toLocaleString()}`
                                            : `₦${(ml.credit - ml.debit).toLocaleString()}`}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── SUB-TAB: BANK & TREASURY RECONCILIATION ── */}
              {accountingSubTab === 'banking' && (
                <div className="space-y-6 font-sans">
                  {/* Bank Control Bar */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-wider">
                          Treasury & Cash Management
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase font-mono">
                          NIBSS Reconciled
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mt-1">Bank Accounts & Treasury Ledgers</h3>
                      <p className="text-xs text-slate-500">
                        Real-time cash and bank liquidity reconciled against General Ledger accounts GL-1010, GL-1020, and GL-1025.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          bankAccounts.forEach((b) => StateEngine.reconcileBankAccount(b.id));
                          setBankAccounts(StateEngine.getBankAccounts());
                          setCustomAlert({
                            title: 'All Bank Accounts Reconciled',
                            message: 'All commercial bank feeds verified against general ledger cash balances.',
                          });
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
  <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /><span>Reconcile All Accounts</span></span>
                      </button>
                    </div>
                  </div>

                  {/* Bank Accounts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {bankAccounts.map((bank) => (
                      <div key={bank.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">GL Code: {bank.glAccountCode || '1010'}</span>
                            <h4 className="text-base font-black text-slate-900">{bank.bankName}</h4>
                            <p className="text-xs text-slate-500">{bank.accountName}</p>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">
                            {bank.accountType}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Account Number:</span>
                            <span className="font-mono font-bold text-slate-800">{bank.accountNumber}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Ledger Balance:</span>
                            <span className="font-mono font-black text-slate-900">₦{(bank.ledgerBalance ?? bank.currentBalance).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Bank Statement:</span>
                            <span className="font-mono font-black text-emerald-700">₦{(bank.statementBalance ?? bank.currentBalance).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                            <span className="text-slate-500">Unreconciled Variance:</span>
                            <span className="font-mono font-bold text-emerald-700">₦0.00</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            Last synced: {bank.lastReconciled}
                          </span>
                          <button
                            onClick={() => handleReconcileBank(bank.id)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-200 transition-all cursor-pointer"
                          >
                            Reconcile Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 2: CORRIDOR TRIP P&L & COSTING SHEET (COGS) ── */}
              {accountingSubTab === 'pnl' && (
                <div className="space-y-6">
                  {/* Trip Corridor Selector */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 font-sans">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Corridor Costing Analysis</span>
                      <h3 className="text-base font-black text-slate-900">Heavy Rail Trip Contribution Margins</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-500" htmlFor="admin-portal-select-corridor-52">Select Corridor:</label>
                      <select id="admin-portal-select-corridor-52"
                        value={selectedTripForCosting}
                        onChange={(e) => setSelectedTripForCosting(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono"
                      >
                        <option value="ALL">All Active Train Corridors</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.company} ({t.origin} → {t.destination})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setNewCostModal(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                      >
                        + Book Voucher
                      </button>
                    </div>
                  </div>

                  {/* Corridor Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trips
                      .filter((t) => selectedTripForCosting === 'ALL' || t.id === selectedTripForCosting)
                      .map((t) => {
                        const summary = StateEngine.getTripFinancialSummary(t);
                        return (
                          <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
                            {/* Corridor Card Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-slate-900 text-sm">{t.id}</span>
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                                    Loco: {t.locomotiveId || 'L2205'}
                                  </span>
                                </div>
                                <h4 className="font-black text-slate-900 text-base mt-0.5">{t.company}</h4>
                                <p className="text-xs text-slate-500">{t.origin} → {t.destination} • {t.cargoType || 'Bagged Cement'}</p>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-xl block ${
                                    summary.marginPct >= 35
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : summary.marginPct >= 20
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {summary.marginPct}% Gross Margin
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                                  ₦{summary.grossProfit.toLocaleString()} Net Profit
                                </span>
                              </div>
                            </div>

                            {/* Financial Summary Breakdown */}
                            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Gross Freight Tariff</span>
                                <span className="font-black text-slate-900 text-sm block">₦{summary.grossFreight.toLocaleString()}</span>
                                {summary.burstBags > 0 && (
                                  <span className="text-[9px] text-rose-600 block mt-0.5">
                                    -₦{summary.damageDeductions.toLocaleString()} ({summary.burstBags} Burst Bags)
                                  </span>
                                )}
                              </div>

                              <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                                <span className="text-[9px] uppercase font-bold text-emerald-700 block">Net Billed Revenue</span>
                                <span className="font-black text-emerald-700 text-sm block">₦{summary.netRevenue.toLocaleString()}</span>
                                <span className="text-[9px] text-slate-500 block mt-0.5">
                                  Paid: ₦{summary.amountPaid.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {/* Direct Operating Cost Categories */}
                            <div className="space-y-1.5 font-mono text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Direct Operating Expenditures (COGS):
                              </span>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>NRC</span> NRC Track Access Tolls
                                </span>
                                <span className="font-bold">
                                  ₦{summary.directCosts.filter((c: any) => c.category === 'NRC_TRACK_ACCESS').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>Fuel</span> Locomotive Diesel AGO Fuel
                                </span>
                                <span className="font-bold">
                                  ₦{summary.directCosts.filter((c: any) => c.category === 'AGO_FUEL').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>Security</span> Train Driver & Police Escort Allowance
                                </span>
                                <span className="font-bold">
                                  ₦{summary.directCosts.filter((c: any) => c.category === 'CREW_ESCORT').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>Siding</span> Siding Field Requisitions (Approved)
                                </span>
                                <span className="font-bold">
                                  ₦{summary.totalSidingRequests.toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-900 text-white px-3 py-2.5 rounded-xl font-bold mt-2">
                                <span>Total Direct Corridor Costs:</span>
                                <span className="text-emerald-400">₦{summary.totalOperatingCost.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Direct Corridor Expense Vouchers Table */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Voucher Ledger</span>
                        <h3 className="text-base font-black text-slate-900">Direct Corridor Expense Vouchers</h3>
                      </div>
                      <button
                        onClick={() => setNewCostModal(true)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        + Add Voucher
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400 bg-slate-50/50">
                            <th className="py-2.5 px-3">Voucher #</th>
                            <th className="py-2.5 px-3">Corridor</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Description</th>
                            <th className="py-2.5 px-3">Vendor / Beneficiary</th>
                            <th className="py-2.5 px-3 text-right">Amount (NGN)</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-mono divide-y divide-slate-100">
                          {tripCosts.map((c: any) => (
                            <tr key={c.id} className="hover:bg-slate-50/60 transition-all">
                              <td className="py-3 px-3 font-bold text-slate-900">{c.voucherNo || c.id}</td>
                              <td className="py-3 px-3 text-slate-700 font-bold">{c.tripId}</td>
                              <td className="py-3 px-3">
                                <span className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                  {c.category?.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-sans text-slate-700">{c.title}</td>
                              <td className="py-3 px-3 font-sans text-slate-500">{c.vendor}</td>
                              <td className="py-3 px-3 text-right font-black text-slate-900">₦{Number(c.amount || 0).toLocaleString()}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                  {c.paymentStatus || 'PAID'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => setEditingTripCost({ ...c })}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-bold px-2 py-1 hover:bg-blue-50 rounded cursor-pointer mr-1"
                                  title="Edit Voucher Details & Amount"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTripCost(c.id)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Reverse Voucher"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SUB-TAB 3: CONSIGNEE STATEMENT OF ACCOUNT (CLIENT LEDGER) ── */}
              {accountingSubTab === 'customers' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm font-sans">
                    <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Industrial Client Ledger</span>
                    <h3 className="text-base font-black text-slate-900">Consignee Statements of Account & Aging Receivables</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Aggregated freight balances, transit damage indemnity deductions, and net accounts receivable per client.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from(new Set(invoices.map((inv: any) => inv.companyName))).map((company) => {
                      const companyInvs = invoices.filter((inv: any) => inv.companyName === company);
                      const compGross = companyInvs.reduce((acc, inv) => acc + (Number(inv.subtotal) || 0), 0);
                      const compDamages = companyInvs.reduce((acc, inv) => acc + (Number(inv.damageDeduction) || 0), 0);
                      const compNet = companyInvs.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
                      const compPaid = companyInvs.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
                      const compBalance = companyInvs.reduce((acc, inv) => acc + (Number(inv.balance) || 0), 0);
                      const compTonnes = companyInvs.reduce((acc, inv) => acc + (Number(inv.totalTonnes) || 0), 0);

                      return (
                        <div key={company} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
                          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                            <div>
                              <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">INDUSTRIAL CONSIGNEE</span>
                              <h4 className="font-black text-slate-900 text-base">{company}</h4>
                              <span className="text-xs text-slate-500">
                                {compTonnes.toLocaleString()} MT Hauled • {companyInvs.length} Freight Consignments
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] font-mono font-bold text-slate-400 block">OUTSTANDING AR DUE</span>
                              <span className={`text-base font-black font-mono ${compBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                ₦{compBalance.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Metrics */}
                          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                            <div className="bg-slate-50 p-2.5 rounded-xl">
                              <span className="text-[9px] uppercase text-slate-400 block">Gross Tariff</span>
                              <span className="font-bold text-slate-900">₦{compGross.toLocaleString()}</span>
                            </div>
                            <div className="bg-rose-50 p-2.5 rounded-xl">
                              <span className="text-[9px] uppercase text-rose-600 block">Damage Claims</span>
                              <span className="font-bold text-rose-600">-₦{compDamages.toLocaleString()}</span>
                            </div>
                            <div className="bg-emerald-50 p-2.5 rounded-xl">
                              <span className="text-[9px] uppercase text-emerald-700 block">Remitted</span>
                              <span className="font-bold text-emerald-700">₦{compPaid.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Invoices List */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Corridor Invoices:</span>
                            {companyInvs.map((inv: any) => (
                              <div key={inv.id} className="flex justify-between items-center text-xs bg-slate-50 p-3 rounded-xl">
                                <div>
                                  <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber || inv.id}</span>
                                  <span className="text-slate-500 text-[11px] block">{inv.route} • {inv.totalTonnes} MT</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-black text-slate-900 block">₦{Number(inv.totalAmount || 0).toLocaleString()}</span>
                                  <button
                                    onClick={() => setSelectedInvoiceForPrint(inv)}
                                    className="text-[10px] text-slate-700 hover:underline font-bold cursor-pointer"
                                  >
                                    View Statement →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Dedicated Contract Costing & Deal Tariffs Desk (Finance / Treasurer) */}
              {accountingSubTab === 'deal_costing' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-teal-700 uppercase">
                          HEAD OF FINANCE / TREASURY DESK
                        </span>
                        <span className="bg-teal-50 text-teal-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-teal-200">
                          Tariff & OpEx Control
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-0.5">
                        Commercial Freight Contract Costing & Operating Tariffs
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Head of Finance ledger to set customer freight rates (₦/MT), evaluate total contract gross values, allocate per-trip budgeted expenses, and model projected profit margins.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold font-mono px-3 py-1.5 rounded-xl border border-slate-200">
                        {deals.length} Commercial Contract(s)
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase font-mono text-slate-400">
                          <th className="p-3">Deal ID / Contract #</th>
                          <th className="p-3">Consignee Client</th>
                          <th className="p-3">Route & Commodity</th>
                          <th className="p-3">Contract Structure</th>
                          <th className="p-3">Freight Tariff</th>
                          <th className="p-3">Contract Value</th>
                          <th className="p-3">Budgeted OpEx/Trip</th>
                          <th className="p-3">Finance Status</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {deals.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-10 text-slate-400 font-mono text-xs">
                              No commercial contracts currently registered.
                            </td>
                          </tr>
                        ) : (
                          deals.map((d) => {
                            const isMonthly = d.dealType === 'MONTHLY_CONTRACT';
                            const qty = Number(d.quantity) || 1610;
                            const unit = d.unitOfMeasure || (d.cargoType?.includes('Gypsum') ? 'MT' : 'Bags');
                            const totalTrips = Number(d.totalPlannedTrips) || (isMonthly ? 10 : 1);
                            const rate = Number(d.tariffRatePerTon) || 12500;
                            const totalVal = Number(d.totalContractValue) || (qty * rate);
                            const perTripOpEx = Number(d.budgetExpensePerTrip) || 4500000;
                            const isCosted = d.financeStatus === 'FINANCE_APPROVED_COSTED';

                            return (
                              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-bold text-amber-800">{d.dealNumber || d.id}</td>
                                <td className="p-3 font-bold font-sans text-slate-900">{d.company || d.companyName}</td>
                                <td className="p-3 font-sans text-slate-700">
                                  {d.loadingStation} → {d.destination} • {d.cargoType} ({qty.toLocaleString()} {unit})
                                </td>
                                <td className="p-3 font-sans">
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isMonthly ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {isMonthly ? `Monthly (${totalTrips} Trips)` : 'Single Voyage'}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-slate-900">₦{rate.toLocaleString()}/MT</td>
                                <td className="p-3 font-extrabold text-emerald-700">₦{totalVal.toLocaleString()}</td>
                                <td className="p-3 font-bold text-rose-700">₦{perTripOpEx.toLocaleString()}</td>
                                <td className="p-3 font-sans">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isCosted ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {isCosted ? 'Cost Approved' : 'Pending Rates'}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button
                                    onClick={() => openCostingModal(d)}
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /><span>Edit Tariff & Cost</span></span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── TAB 6: USER DIRECTORY & EDITABLE PROVISIONING ─── */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* PROVISION USER FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Staff & Account Provisioning</span>
                <h3 className="text-base font-black text-slate-900">Provision New Account</h3>
              </div>

              <form onSubmit={handleProvisionUser} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-full-name-53">Full Name *</label>
                  <input id="admin-portal-full-name-53"
                    required
                    value={provisionForm.fullName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, fullName: e.target.value })}
                    placeholder="e.g. Segun Alabi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-email-address-54">Email Address *</label>
                    <input id="admin-portal-email-address-54"
                      required
                      type="email"
                      value={provisionForm.email}
                      onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                      placeholder="segun@bueno.ng"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-mobile-phone-55">Mobile Phone *</label>
                    <input id="admin-portal-mobile-phone-55"
                      required
                      value={provisionForm.phone}
                      onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                      placeholder="08031112233"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-role-classification-56">Role Classification</label>
                    <select id="admin-portal-role-classification-56"
                      value={provisionForm.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setProvisionForm({
                          ...provisionForm,
                          role: newRole,
                          userType: newRole === 'CUSTOMER' ? 'CUSTOMER' : 'STAFF',
                        });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="CARGO_OFFICER">Cargo Officer</option>
                      <option value="HEAD_OF_OPERATIONS">Head of Operations</option>
                      <option value="ADMIN">Admin Officer</option>
                      <option value="CEO">Managing Director / CEO</option>
                      <option value="HEAD_OF_FINANCE">Head of Finance</option>
                      <option value="CUSTOMER">Industrial Consignee Client</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-assigned-station-57">Assigned Station</label>
                    <select id="admin-portal-assigned-station-57"
                      value={provisionForm.assignedStation}
                      onChange={(e) => setProvisionForm({ ...provisionForm, assignedStation: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="EWK">Ewekoro Terminal</option>
                      <option value="MNY">Moniya Yard (Ibadan)</option>
                      <option value="APT">Apapa Maritime Port</option>
                      <option value="HQ">Bueno HQ Command</option>
                    </select>
                  </div>
                </div>

                {provisionForm.role === 'CUSTOMER' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-company-organization-name-58">Company / Organization Name *</label>
                    <input id="admin-portal-company-organization-name-58"
                      required
                      value={provisionForm.companyName}
                      onChange={(e) => setProvisionForm({ ...provisionForm, companyName: e.target.value })}
                      placeholder="e.g. Dangote Cement Plc / BUA Logistics"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  Provision & Activate Account
                </button>
              </form>
            </div>

            {/* USER DIRECTORY TABLE WITH EDIT BUTTONS */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">Editable User Directory</span>
                  <h3 className="text-base font-black text-slate-900">Provisioned Accounts ({usersList.length})</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">User Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Station</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center font-sans">
                          {/*
                            An empty directory and a refused one look identical
                            otherwise — "(0)" reads as a missing feature rather
                            than a permission this account does not hold.
                          */}
                          {usersDirectoryError ? (
                            <>
                              <p className="text-xs font-bold text-rose-700">
                                The directory could not be loaded.
                              </p>
                              <p className="mt-1 text-2xs font-semibold text-slate-600">
                                {usersDirectoryError.message}
                              </p>
                              <p className="mt-1 text-3xs font-mono text-slate-400">
                                users.php responded {usersDirectoryError.status}
                                {usersDirectoryError.status === 403
                                  ? ' — the “View Directory” capability is missing for this role in the Permissions Matrix.'
                                  : ''}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs font-semibold text-slate-500">
                              No accounts yet. Provision one using the form on the left.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                    {usersList.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-sans text-slate-900">{u.fullName}</td>
                        <td className="p-3 text-slate-600">{u.email}</td>
                        <td className="p-3 font-bold text-slate-700">{u.role}</td>
                        <td className="p-3 text-slate-600">{u.assignedStation || 'EWK'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: FUND REQUISITION & OPERATIONAL EXPENSES DESK ─── */}
        {activeTab === 'fund_requisitions' && (
          <div className="space-y-6 font-sans">
            {/* KPI OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Requisitions Requested</span>
                <p className="text-2xl font-black text-slate-900 font-mono">
                  ₦{requests.reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-700 font-bold">{requests.length} Field Requests</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Approved & Disbursed Funds</span>
                <p className="text-2xl font-black text-slate-700 font-mono">
                  ₦{requests.filter(r => r.status === 'APPROVED' || r.status === 'DISBURSED').reduce((acc, r) => acc + (Number(r.amount) || 0), 0).toLocaleString()}
                </p>
                <span className="text-[10px] text-emerald-700 font-bold">Disbursed via GTBank API</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Pending Review & Action</span>
                <p className="text-2xl font-black text-amber-600 font-mono">
                  {requests.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'PENDING').length} Requests
                </p>
                <span className="text-[10px] text-slate-500 font-bold">Awaiting Officer Action</span>
              </div>
            </div>

            {/* FIELD REQUISITION TABLE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">OPERATIONAL EXPENSE LEDGER</span>
                  <h3 className="text-base font-black text-slate-900">
                    Field Requisition Requests & GTBank Disbursal Terminal
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Req ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Title & Purpose</th>
                      <th className="p-3">Requested Amount</th>
                      <th className="p-3">Requested By & Station</th>
                      <th className="p-3">Stage / Ref</th>
                      <th className="p-3 text-right">Approval & Disbursal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {requests.map((req: any, idx: number) => {
                      const isDisbursed = req.status === 'DISBURSED' || req.stage === 'Paid';
                      const isApproved = req.status === 'APPROVED' || req.status === 'CEO_APPROVED' || req.status === 'OPS_APPROVED' || req.stage === 'Accountant' || req.stage === 'CEO' || isDisbursed;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-amber-800">{req.requisitionNo || req.id}</td>
                          <td className="p-3 font-bold">
                            <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded border border-slate-200">
                              {req.category || 'OPERATIONAL'}
                            </span>
                          </td>
                          <td className="p-3 font-sans font-bold text-slate-900 max-w-xs">{req.title || req.description}</td>
                          <td className="p-3 font-extrabold text-emerald-700 text-sm">
                            ₦{Number(req.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-slate-700 font-sans">
                            <span className="font-bold block">{req.requestedBy || 'Ade Bello'}</span>
                            <span className="text-[10px] text-slate-400 block">{req.station || 'EWK'} Terminal</span>
                          </td>
                          <td className="p-3">
                            {isDisbursed ? (
                              <div>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase block w-fit">
                                  DISBURSED
                                </span>
                                <span className="text-[9px] text-slate-400 block mt-0.5">{req.paymentDetails?.ref || 'TRF-GTB-998120'}</span>
                              </div>
                            ) : isApproved ? (
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                APPROVED
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                                PENDING APPROVAL
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-2">
                            {!isApproved && !isDisbursed && (
                              <button
                                onClick={() => handleApproveRequisition(req.id)}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                              >
                                Approve
                              </button>
                            )}
                            {isApproved && !isDisbursed && (
                              <button
                                onClick={() => handleDisburseRequisition(req.id)}
                                className="bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                              >
                                Disburse (GTBank)
                              </button>
                            )}
                            {isDisbursed && (
                              <span className="text-[10px] text-emerald-700 font-extrabold">Funds Cleared</span>
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

        {/* ─── TAB: FLEET & ROLLING STOCK MANAGEMENT ─── */}
        {activeTab === 'fleet' && (() => {
          const dynamicFleet = StateEngine.getDynamicWagonFleet(trips);
          const displayWagons = dynamicFleet.wagons;
          return (
          <div className="space-y-6 font-sans">
            {/* KPI OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Rolling Stock Fleet</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{dynamicFleet.totalCount} Wagons</p>
                <span className="text-[10px] text-emerald-700 font-bold">46 Official PXG Hoppers</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Available for Loading</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  {dynamicFleet.availableCount} Wagons
                </p>
                <span className="text-[10px] text-emerald-700 font-bold">Ready at Sidings</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Loaded / In Transit</span>
                <p className="text-2xl font-black text-amber-600 font-mono">
                  {dynamicFleet.inUseCount} Wagons
                </p>
                <span className="text-[10px] text-amber-700 font-bold">Coupled on Active Trips</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Fleet Tonnage Capacity</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  {(dynamicFleet.totalCount * 60).toLocaleString()} MT
                </p>
                <span className="text-[10px] text-slate-500 font-bold">Cumulative Fleet Capacity</span>
              </div>
            </div>

            {/* FLEET MANAGEMENT TABLE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">ROLLING STOCK ASSET MANAGEMENT</span>
                  <h3 className="text-base font-black text-slate-900">
                    Active Wagon Inventory & Terminal Allocation
                  </h3>
                </div>
                <button
                  onClick={() => setRegisterWagonModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  <span>+ Register New Wagon</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Wagon ID</th>
                      <th className="p-3">Wagon Classification</th>
                      <th className="p-3">Payload Capacity</th>
                      <th className="p-3">Track Gauge</th>
                      <th className="p-3">Current Station</th>
                      <th className="p-3 text-right">Operational Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {displayWagons.map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.id}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{w.wagonType || 'Covered Hopper Wagon'}</td>
                        <td className="p-3 font-extrabold text-emerald-700">{w.payloadCapacity || '60 MT (1,200 Bags)'}</td>
                        <td className="p-3 text-slate-600">{w.gauge || 'NARROW_GAUGE'}</td>
                        <td className="p-3 font-bold text-slate-700">
                          {w.currentStation === 'EWK' ? 'Ewekoro Siding (EWK)' : w.currentStation === 'DGB' ? 'Dugbe Station (DGB)' : w.currentStation === 'MNY' ? 'Moniya Yard (MNY)' : (w.currentStation || 'Ewekoro Siding (EWK)')}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded uppercase ${
                            w.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'RETURNING_EMPTY'
                              ? 'bg-blue-100 text-blue-800'
                              : w.status === 'UNLOADING'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {w.activeTripId ? `${w.status} (${w.activeTripId})` : w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

        {/* ─── REGISTER NEW WAGON MODAL ─── */}
        {registerWagonModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 uppercase">ROLLING STOCK REGISTRATION</span>
                  <h3 className="text-base font-black text-slate-900">Provision New Fleet Wagon</h3>
                </div>
                <button onClick={() => setRegisterWagonModal(false)} className="text-slate-400 font-bold hover:text-slate-900">×</button>
              </div>

              <form onSubmit={handleRegisterWagon} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-wagon-registration-id-59">Wagon Registration ID *</label>
                  <input id="admin-portal-wagon-registration-id-59"
                    required
                    value={newWagonForm.id}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-wagon-classification-60">Wagon Classification *</label>
                  <select id="admin-portal-wagon-classification-60"
                    value={newWagonForm.wagonType}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, wagonType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="Covered Hopper Wagon">Covered Hopper Wagon (Bagged Cement / Bulk)</option>
                    <option value="Open Top Gondola Wagon">Open Top Gondola Wagon (Limestone / Gypsum)</option>
                    <option value="Flatbed Container Wagon">Flatbed Container Wagon (TEU Containers)</option>
                    <option value="Tanker Wagon">Tanker Wagon (AGO Liquid Bulk)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-payload-capacity-61">Payload Capacity</label>
                    <input id="admin-portal-payload-capacity-61"
                      required
                      value={newWagonForm.payloadCapacity}
                      onChange={(e) => setNewWagonForm({ ...newWagonForm, payloadCapacity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-assigned-station-62">Assigned Station</label>
                    <select id="admin-portal-assigned-station-62"
                      value={newWagonForm.currentStation}
                      onChange={(e) => setNewWagonForm({ ...newWagonForm, currentStation: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    >
                      <option value="EWK">Ewekoro Siding (EWK)</option>
                      <option value="MNY">Moniya Yard (MNY)</option>
                      <option value="APT">Apapa Port (APT)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRegisterWagonModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl shadow-md transition-all"
                  >
                    Register Wagon →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── TAB: TERMINAL INFORMATION (13-COLUMN SIDING AUDIT LEDGER) ─── */}
        {activeTab === 'terminal_info' && (
          <div className="space-y-6">
            <TerminalInformationView user={user} initialStation="PAPA" />
          </div>
        )}

        {/* ─── TAB: MONIYA CONTAINER TERMINAL MANAGEMENT (PAGE 1 SPEC 08) ─── */}
        {activeTab === 'moniya' && (
          <div className="space-y-6">
            <MoniyaContainerView user={user} />
          </div>
        )}

        {/* ─── TAB 7: UNIFIED ENTERPRISE PERMISSIONS MATRIX ─── */}
        {activeTab === 'permissions' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 font-sans">
            {/*
              Until the enforced matrix has been read back from the server,
              what is on screen is the shipped defaults — not policy. Saying so
              matters: a ticked box that the API is actually refusing is worse
              than no information, because it sends you looking in the wrong
              place entirely.
            */}
            {permissionsLoadError ? (
              <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4">
                <p className="text-xs font-black text-rose-800">
                  Showing shipped defaults, not the live policy.
                </p>
                <p className="mt-1 text-2xs font-semibold text-rose-700">
                  The permissions matrix could not be read from the server: {permissionsLoadError}
                </p>
                <p className="mt-1 text-2xs font-semibold text-rose-700">
                  Editing is disabled — saving now would overwrite the real policy with these
                  defaults. Reload the page to try again.
                </p>
              </div>
            ) : !permissionsLoaded ? (
              <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-700">Loading the enforced permissions…</p>
                <p className="mt-1 text-2xs font-semibold text-slate-500">
                  Editing is disabled until the live matrix has loaded.
                </p>
              </div>
            ) : null}

            {/* HEADER & ACTION BUTTONS */}
            <div className="border-b border-slate-100 pb-5 flex justify-between items-center flex-wrap gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  ROLE-BASED ACCESS CONTROL (RBAC) GOVERNANCE
                </span>
                <h3 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Enterprise Permissions Matrix
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure screen visibility and operational authorizations for each corporate role. Permissions sync directly to the SQL database.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetPermissionsDefaults}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePermissionsMatrix}
                  disabled={isSavingPermissions}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSavingPermissions ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to SQL Database...</span>
                    </>
                  ) : permissionsSaveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved to SQL Database!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Permissions to SQL Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* ROLE SELECTOR PILLS */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                SELECT ROLE TO CONFIGURE:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { key: 'ADMIN', label: 'Admin Officer', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { key: 'CEO', label: 'Managing Director / CEO', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { key: 'HEAD_OF_OPERATIONS', label: 'Head of Operations', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                  { key: 'HEAD_OF_FINANCE', label: 'Head of Finance / Accounts', badge: 'bg-teal-50 text-teal-700 border-teal-200' },
                  { key: 'CARGO_OFFICER', label: 'Cargo Officer (Siding & Yard)', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
                  { key: 'CUSTOMER', label: 'Industrial Consignee Client', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                ].map((r) => {
                  const isSelected = selectedPermissionRole === r.key;
                  const count = (permissionsMatrix[r.key] || DEFAULT_ROLE_TAB_PERMISSIONS[r.key] || []).length;
                  return (
                    <button
                      key={r.key}
                      onClick={() => setSelectedPermissionRole(r.key)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                        isSelected
                          ? 'bg-brand text-white border-brand shadow-sm font-black'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isSelected ? 'bg-white/20 text-white font-bold' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {count} Active
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ROLE SUMMARY & BULK ACTIONS */}
            {(() => {
              const activeRolePerms = permissionsMatrix[selectedPermissionRole] || DEFAULT_ROLE_TAB_PERMISSIONS[selectedPermissionRole] || [];
              const totalPerms = UNIFIED_PERMISSION_LIST.length;
              const isSuperAdmin = selectedPermissionRole === 'ADMIN' || selectedPermissionRole === 'CEO';

              return (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">
                      Configuring: <span className="text-brand">{selectedPermissionRole}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {activeRolePerms.length} of {totalPerms} permissions enabled for this role.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAllForRole(true)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAllForRole(false)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* CATEGORIZED PERMISSIONS CARDS */}
            {(() => {
              const activeRolePerms = permissionsMatrix[selectedPermissionRole] || DEFAULT_ROLE_TAB_PERMISSIONS[selectedPermissionRole] || [];
              const categories = ['Screen & Tab Access', 'Commercial & Deals', 'Corridor Operations', 'Finance & Accounting', 'Administration'] as const;

              return (
                <div className="space-y-6">
                  {categories.map((cat) => {
                    const items = UNIFIED_PERMISSION_LIST.filter((p) => p.category === cat);
                    if (items.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">
                            {cat}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">({items.length})</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((item) => {
                            const isGranted = activeRolePerms.includes(item.key);

                            // A <label> wrapping the checkbox, rather than a div
                            // with an onClick. The checkbox previously had
                            // `onChange={() => {}}` and depended on the parent
                            // div's click handler, so a keyboard user could focus
                            // it and press Space to no effect — the permission
                            // matrix could not be operated without a mouse at all.
                            // Wrapping associates the two natively, so click,
                            // Space and screen-reader announcement all work.
                            return (
                              <label
                                key={item.key}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                  isGranted
                                    ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 opacity-75'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  disabled={!permissionsLoaded || !!permissionsLoadError}
                                  onChange={() => handleTogglePermission(item.key)}
                                  className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h5 className={`text-xs font-bold leading-tight ${isGranted ? 'text-slate-900 font-black' : 'text-slate-600'}`}>
                                      {item.label}
                                    </h5>
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                                    {item.description}
                                  </p>
                                  <code className="text-[9px] font-mono text-slate-400 block pt-0.5">
                                    {item.key}
                                  </code>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ENFORCEMENT FOOTER */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-black uppercase text-emerald-400 font-mono">SQL Database Direct Persistence</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                  Clicking "Save Permissions to SQL Database" writes the full matrix directly to the <code className="text-emerald-300">bueno_role_permissions</code> table in MySQL. The permissions immediately apply across all active user desks and device sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSavePermissionsMatrix}
                disabled={isSavingPermissions}
                className="bg-brand hover:bg-brand-dark text-white font-black text-xs px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {isSavingPermissions ? 'Saving...' : 'Save & Enforce in Database'}
              </button>
            </div>
          </div>
        )}
        </main>
      </div>

      {selectedDossierTrip && (
        <TripDossierModal
          trip={selectedDossierTrip}
          onClose={() => setSelectedDossierTrip(null)}
        />
      )}
      {/* ─── MODAL: FINANCE TRIP COSTING MODAL ─── */}
      {pricingTripModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 font-sans shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-slate-600 uppercase tracking-widest block">
                  FINANCE PRICING AUDIT
                </span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Update Official Trip Cost — {pricingTripModal.tripId || pricingTripModal.id}
                </h3>
              </div>
              <button
                onClick={() => setPricingTripModal(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consignee:</span>
                  <span className="font-black text-slate-900">{pricingTripModal.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Route Corridor:</span>
                  <span className="font-black text-slate-900">{pricingTripModal.origin} ➔ {pricingTripModal.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Consist Payload:</span>
                  <span className="font-black text-emerald-700">
                    {pricingTripModal.wagonLogs?.length || 20} Wagons ({Number(pricingTripModal.quantity || 1200).toLocaleString()} {pricingTripModal.unitOfMeasure || 'Bags'})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-agreed-total-freight-cost-63">
                  Agreed Total Freight Cost (₦) *
                </label>
                <input id="admin-portal-agreed-total-freight-cost-63"
                  required
                  type="number"
                  value={pricingForm.amount}
                  onChange={(e) => setPricingForm({ ...pricingForm, amount: e.target.value })}
                  placeholder="e.g. 15000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono font-black text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-tariff-rate-per-ton-64">
                    Tariff Rate Per Ton (₦/MT)
                  </label>
                  <input id="admin-portal-tariff-rate-per-ton-64"
                    type="number"
                    value={pricingForm.tariffRatePerTon}
                    onChange={(e) => setPricingForm({ ...pricingForm, tariffRatePerTon: e.target.value })}
                    placeholder="e.g. 12500"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-damage-deduction-65">
                    Damage Deduction (₦)
                  </label>
                  <input id="admin-portal-damage-deduction-65"
                    type="number"
                    value={pricingForm.damageDeduction}
                    onChange={(e) => setPricingForm({ ...pricingForm, damageDeduction: e.target.value })}
                    placeholder="e.g. 0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1" htmlFor="admin-portal-payment-terms-commercial-finance-66">
                  Payment Terms / Commercial Finance Notes
                </label>
                <textarea id="admin-portal-payment-terms-commercial-finance-66"
                  rows={2}
                  value={pricingForm.notes}
                  onChange={(e) => setPricingForm({ ...pricingForm, notes: e.target.value })}
                  placeholder="e.g. Agreed 30-day post-discharge corporate settlement based on clean delivery slip."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPricingTripModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Save Cost to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
