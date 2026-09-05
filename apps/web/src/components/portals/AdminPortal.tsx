'use client';

import { useState, useEffect } from 'react';
import {
  StateEngine,
  DEFAULT_ROLE_TAB_PERMISSIONS,
  TAB_ALIASES,
  TAB_REGISTRY,
  CANONICAL_CORRIDORS,
} from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';
import { TripDossierModal } from '@/components/TripDossierModal';
import OfficialInvoiceModal from '@/components/OfficialInvoiceModal';
import { MoniyaContainerView } from '@/components/MoniyaContainerView';
import { TerminalInformationView } from '@/components/TerminalInformationView';

// ENTERPRISE COMMODITY & MEASUREMENT UNIT CONFIGURATION
export const COMMODITY_CONFIG: Record<string, { unit: string; wagonType: string; auditMetric: string }> = {
  'Bagged Cement (50kg)': { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' },
  'Bulk Gypsum': { unit: 'Metric Tonnes (MT)', wagonType: 'Open Top Gondola Wagon', auditMetric: 'Transit Shrinkage (MT)' },
  'Limestone Raw Ore': { unit: 'Metric Tonnes (MT)', wagonType: 'Bottom Dumper Wagon', auditMetric: 'Spillage Loss (MT)' },
  'Clinker Bulk': { unit: 'Metric Tonnes (MT)', wagonType: 'Gondola Wagon', auditMetric: 'Weight Deviation (MT)' },
  'Shipping Containers (20ft/40ft)': { unit: 'Containers (TEU)', wagonType: 'Flatbed Container Wagon', auditMetric: 'Seal Integrity' },
  'AGO Diesel / Liquid Bulk': { unit: 'Liters (L)', wagonType: 'Tanker Wagon', auditMetric: 'Ullage Loss (L)' },
};

// HISTORICAL MONTHLY ARCHIVED TRIPS (2-3 MONTHS RETRIEVABLE BACK HISTORY)
const HISTORICAL_MONTHLY_ARCHIVES: Record<string, any[]> = {
  '2026-09': StateEngine.getTrips(),
  '2026-08': [
    {
      id: 'TRP-AUG-041',
      tripId: 'TRP-AUG-041',
      locomotiveId: 'L2205',
      origin: 'EWK',
      destination: 'MNY',
      company: 'APM Terminals Ltd (APMT)',
      dealNumber: 'DEAL-AUG-881',
      cargoType: 'CONTAINERS-IMPORT (40ft HC)',
      unitOfMeasure: 'Units',
      wagonType: 'CBX Flat Bed Wagon',
      quantity: 1600,
      cargoOfficerName: 'Ade Bello',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'COMPLETED',
      dispatchTime: '15 Aug 2026, 09:00 AM',
      wagonLogs: [
        { wagonId: 'PXG 2322', loadedAt: '08:10 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-AUG-901' },
        { wagonId: 'PXG 2323', loadedAt: '08:25 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-AUG-902' },
      ],
      damages: { damagedUnits: 1, burstBags: 1, complaintNotes: ['1 burst bag at Moniya Bay 2'] },
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
      company: 'DASCO Industries Ltd',
      dealNumber: 'DEAL-JUL-701',
      cargoType: 'WIRE COILS & STEEL PIPES',
      unitOfMeasure: 'Metric Tonnes (MT)',
      wagonType: 'CBX Flat Bed Wagon',
      quantity: 1800,
      cargoOfficerName: 'Samuel Okafor',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'COMPLETED',
      dispatchTime: '18 Jul 2026, 08:30 AM',
      wagonLogs: [
        { wagonId: 'PXG 1101', loadedAt: '07:30 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-JUL-701' },
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
      company: 'British American Tobacco (BAT)',
      dealNumber: 'DEAL-JUN-602',
      cargoType: 'Manufactured FMCG Cargo',
      unitOfMeasure: 'Metric Tonnes (MT)',
      wagonType: 'Covered Van',
      quantity: 1400,
      cargoOfficerName: 'Ade Bello',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'COMPLETED',
      dispatchTime: '10 Jun 2026, 07:45 AM',
      wagonLogs: [],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    },
  ],
};

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
              {trip.status === 'COMPLETED' ? '✓ FULLY COMPLETED & AUDITED' : trip.status}
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
            <span className="font-extrabold text-emerald-700 text-sm">{trip.origin || 'EWK'} ➔ {trip.destination || 'MNY'}</span>
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
                  const timeRange = w.startTime && w.endTime ? `${w.startTime} ➔ ${w.endTime}` : (w.startTime || '08:30 AM');
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
                          ✓ LOADED
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
                    const timeRange = w.unloadStartTime && w.unloadEndTime ? `${w.unloadStartTime} ➔ ${w.unloadEndTime}` : (w.unloadStartTime || '01:45 PM');
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
                            {isUnloaded ? '✓ DISCHARGED' : '⏳ PENDING'}
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
              className="flex-1 sm:flex-initial bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>🖨️ Print / Save Audit (PDF)</span>
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'deals' | 'negotiations' | 'telemetry' | 'manifest' | 'billing' | 'users' | 'permissions' | 'fund_requisitions' | 'fleet' | 'moniya' | 'terminal_info'>('analytics');
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
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
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
  const [accountingSubTab, setAccountingSubTab] = useState<'invoices' | 'pnl' | 'customers'>('invoices');
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
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyInput, setReplyInput] = useState('');

  // Dynamic Freight Deal Form
  const [newDealForm, setNewDealForm] = useState({
    companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
    loadingStation: 'PAPA',
    destination: 'MNY',
    cargoType: 'Bagged Cement (50kg)',
    quantity: '2000',
    targetDate: '',
    notes: '',
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
    pin: '1111',
  });

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
    setNotifications(liveNotifs);
    setPermissionsMatrix(livePerms);
    setSystemSettings(liveSettings);
    setInvoices(liveInvoices);
    setTripCosts(liveTripCosts);

    // Update current month historical archives
    HISTORICAL_MONTHLY_ARCHIVES['2026-09'] = liveTrips;

    // BUILD MASTER CLIENT NEGOTIATION THREADS FOR ALL REGISTERED CLIENTS (KEYED BY EMAIL)
    const clientUsers = liveUsers.filter(
      (u: any) => u.userType === 'CUSTOMER' || u.role === 'CUSTOMER' || u.role === 'CONSIGNEE'
    );

    const mergedMap = new Map<string, any>();

    // 1. Initialize Thread for Every Registered Client User
    clientUsers.forEach((client: any) => {
      const clientEmail = (client.email || '').toLowerCase();
      if (!clientEmail) return;

      mergedMap.set(clientEmail, {
        id: `DEAL-NEG-${client.id}`,
        companyName: client.companyName || client.fullName,
        email: clientEmail,
        contactName: client.fullName,
        phone: client.phone || 'N/A',
        loadingStation: 'EWK',
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
        const reqEmail = (req.email || '').toLowerCase();
        if (!reqEmail) return;

        const existing = mergedMap.get(reqEmail) || {
          id: `DEAL-NEG-${req.id || Date.now()}`,
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

        const reqMsg = {
          sender: req.contactName || 'Consignee Client',
          role: 'Industrial Consignee',
          text: `Requisition Note Submitted: Requesting freight haulage for ${req.product || 'Cement'} [${req.volume || '2,000 Bags'}] via ${req.route || 'EWK ➔ MNY'}. Notes: ${req.notes || 'None'}`,
          time: req.createdAt || 'Today',
        };

        const hasReqMsg = (existing.messages || []).some((m: any) => m.text?.includes('Requisition Note Submitted'));
        if (!hasReqMsg) {
          existing.messages = [reqMsg, ...(existing.messages || [])];
        }
        existing.status = 'PENDING_REVIEW';
        existing.hasUnread = true;
        mergedMap.set(reqEmail, existing);
      });
    }

    // 3. Merge Live Deal Chat Messages from Storage
    if (liveDealsNeg.length > 0) {
      liveDealsNeg.forEach((deal: any) => {
        const dealEmail = (deal.email || '').toLowerCase();
        const existing = (dealEmail && mergedMap.get(dealEmail)) || {
          id: deal.id,
          companyName: deal.companyName || deal.contactName || 'Industrial Client',
          email: dealEmail || `client_${Date.now()}@bueno.ng`,
          contactName: deal.contactName || deal.companyName,
          phone: deal.phone || '',
          loadingStation: deal.loadingStation || 'EWK',
          destination: deal.destination || 'MNY',
          cargoType: deal.cargoType || 'Bagged Cement (50kg)',
          quantity: deal.quantity || '2,000 Bags',
          status: deal.status || 'IN_NEGOTIATION',
          createdAt: deal.createdAt || 'Today',
          messages: deal.messages || [],
          hasUnread: true,
        };

        if (deal.messages && deal.messages.length > 0) {
          // Deduplicate messages
          const existingTexts = new Set((existing.messages || []).map((m: any) => m.text));
          deal.messages.forEach((m: any) => {
            if (!existingTexts.has(m.text)) {
              existing.messages.push(m);
            }
          });
        }

        if (deal.status) existing.status = deal.status;
        const targetKey = dealEmail || existing.email;
        mergedMap.set(targetKey, existing);
      });
    }

    const finalThreads = Array.from(mergedMap.values());
    setNegotiations(finalThreads);

    if (finalThreads.length > 0 && (!activeDealId || !finalThreads.some((t) => t.id === activeDealId))) {
      setActiveDealId(finalThreads[0].id);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(user);

  useEffect(() => {
    const syncUser = () => {
      const activeStr = typeof window !== 'undefined' ? localStorage.getItem('bueno_user') : null;
      if (activeStr) {
        try {
          const parsed = JSON.parse(activeStr);
          const liveUsers = StateEngine.getUsers();
          const matched = liveUsers.find((u: any) => u.id === parsed.id || u.email === parsed.email);
          if (matched) {
            setCurrentUser({ ...parsed, ...matched });
          } else {
            setCurrentUser(parsed);
          }
        } catch {}
      }
    };

    syncData();
    syncUser();

    StateEngine.syncRemote();
    const interval = setInterval(() => {
      StateEngine.syncRemote();
      syncData();
      syncUser();
    }, 4000);

    const handleAllUpdates = () => {
      syncData();
      syncUser();
    };

    window.addEventListener('storage', handleAllUpdates);
    window.addEventListener('bueno_state_updated', handleAllUpdates);
    window.addEventListener('bueno_user_updated', syncUser);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleAllUpdates);
      window.removeEventListener('bueno_state_updated', handleAllUpdates);
      window.removeEventListener('bueno_user_updated', syncUser);
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
        message: `Cannot register deal: Standard Gauge and Narrow Gauge tracks are mutually exclusive.\n\nOrigin ${newDealForm.loadingStation} is ${isOriginNarrow ? 'Narrow Gauge (1,067mm)' : 'Standard Gauge (1,435mm)'} and Destination ${newDealForm.destination} is ${isDestNarrow ? 'Narrow Gauge (1,067mm)' : 'Standard Gauge (1,435mm)'}.\n\nRolling stock cannot operate across incompatible gauges. Please select matching gauge sidings (e.g. Papalanto ➔ Moniya Standard Gauge, or Ewekoro ➔ Dugbe Narrow Gauge).`,
      });
      return;
    }

    const dealId = `DEAL-${Math.floor(10000 + Math.random() * 89999)}`;
    const conf = COMMODITY_CONFIG[newDealForm.cargoType] || { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' };

    const newDealObj = {
      id: dealId,
      dealNumber: dealId,
      company: newDealForm.companyName,
      companyName: newDealForm.companyName,
      loadingStation: newDealForm.loadingStation,
      destination: newDealForm.destination,
      cargoType: newDealForm.cargoType,
      quantity: Number(newDealForm.quantity) || 2000,
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
      title: 'Commercial Freight Deal Registered',
      message: `Deal ${dealId} for ${newDealObj.company} created! Payload: ${newDealObj.quantity} ${conf.unit} via ${newDealObj.loadingStation} ➔ ${newDealObj.destination}. It is now live in the Cargo Officer queue!`,
    });
  };

  // ─── ENTERPRISE FREIGHT ACCOUNTING & TRIP COSTING HANDLERS ───
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;

    const pAmount = Number(paymentForm.amount);
    if (!pAmount || pAmount <= 0) {
      alert('Please enter a valid remittance amount.');
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
      alert('Please enter a valid cost voucher amount.');
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

  const handleDeleteTripCost = (costId: string) => {
    if (!confirm('Are you sure you want to reverse / delete this corridor cost voucher?')) return;
    StateEngine.deleteTripCost(costId);
    syncData();
  };

  const handleUpdateTripCost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTripCost) return;

    const amount = Number(editingTripCost.amount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid expense voucher amount.');
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
          route: `${t.origin || 'EWK'} ➔ ${t.destination || 'MNY'}`,
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
  const handleProvisionUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUserId = `usr_${Date.now()}`;

    const newUserObj = {
      id: newUserId,
      fullName: provisionForm.fullName,
      email: provisionForm.email,
      phone: provisionForm.phone,
      userType: provisionForm.userType,
      role: provisionForm.role,
      assignedStation: provisionForm.assignedStation,
      stationName: provisionForm.assignedStation === 'EWK' ? 'Ewekoro Terminal' : provisionForm.assignedStation === 'MNY' ? 'Moniya Yard' : 'Apapa Port',
      companyName: provisionForm.companyName || (provisionForm.userType === 'CUSTOMER' ? provisionForm.fullName : 'Bueno Logistics HQ'),
      staffId: `${provisionForm.assignedStation}-${Math.floor(10 + Math.random() * 89)}`,
      pin: provisionForm.pin || '1111',
      status: 'ACTIVE',
    };

    StateEngine.saveUsers([newUserObj, ...usersList]);
    setUsersList([newUserObj, ...usersList]);

    setCustomAlert({
      title: 'New Account Provisioned',
      message: `Account created for ${newUserObj.fullName} (${newUserObj.role}) with Security PIN: ${newUserObj.pin}!`,
    });

    setProvisionForm({
      fullName: '',
      email: '',
      phone: '',
      userType: 'STAFF',
      role: 'CARGO_OFFICER',
      assignedStation: 'EWK',
      companyName: '',
      pin: '1111',
    });
  };

  // EDIT EXISTING USER ACCOUNT
  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    StateEngine.updateUser(editingUser.id, editingUser);
    setUsersList(usersList.map((u) => (u.id === editingUser.id ? editingUser : u)));
    if (editingUser.id === currentUser?.id || editingUser.email === currentUser?.email || editingUser.role === currentUser?.role) {
      setCurrentUser(editingUser);
    }
    setEditingUser(null);
    syncData();

    setCustomAlert({
      title: 'User Account Updated',
      message: `Account for ${editingUser.fullName} (${editingUser.email}) updated successfully in database! All executive sign-offs, manifests, invoices, and reports now reflect this change.`,
    });
  };

  // TOGGLE GRANULAR TAB & ACTION PERMISSION IN MATRIX
  const handleTogglePermission = (roleKey: string, permKey: string) => {
    const fullMatrix = StateEngine.getRolePermissions();
    const currentPerms = fullMatrix[roleKey] ?? (DEFAULT_ROLE_TAB_PERMISSIONS[roleKey] ?? []);

    const isCurrentlyChecked = currentPerms.includes(permKey);

    let updatedRolePerms: string[];
    if (isCurrentlyChecked) {
      updatedRolePerms = currentPerms.filter((p) => p !== permKey);
    } else {
      updatedRolePerms = Array.from(new Set([...currentPerms, permKey]));
    }

    const updatedMatrix = { ...fullMatrix, [roleKey]: updatedRolePerms };
    setPermissionsMatrix(updatedMatrix);
    StateEngine.saveRolePermissions(updatedMatrix);
  };

  // EXPLICIT SAVE PERMISSIONS MATRIX TO SQL DATABASE
  const handleSavePermissionsMatrix = async () => {
    setIsSavingPermissions(true);
    try {
      const ok = await StateEngine.saveRolePermissionsAsync(permissionsMatrix);
      setIsSavingPermissions(false);
      if (ok) {
        setPermissionsSaveSuccess(true);
        setTimeout(() => setPermissionsSaveSuccess(false), 4000);
        setCustomAlert({
          title: 'Permissions Matrix Saved to SQL Database',
          message: 'All updated role permissions have been permanently committed to the live SQL database (bueno_role_permissions) and broadcast live across all user accounts and desks!',
        });
      } else {
        setCustomAlert({
          title: 'Permissions Saved',
          message: 'Role permissions matrix updated in repository cache.',
        });
      }
    } catch {
      setIsSavingPermissions(false);
    }
  };

  // RESET PERMISSIONS MATRIX TO SYSTEM DEFAULTS
  const handleResetPermissionsDefaults = () => {
    const defaults = JSON.parse(JSON.stringify(DEFAULT_ROLE_TAB_PERMISSIONS));
    setPermissionsMatrix(defaults);
    StateEngine.saveRolePermissions(defaults);
    setCustomAlert({
      title: 'Permissions Reset to Defaults',
      message: 'Role permissions matrix has been reset to system defaults. Click "Save Permissions to SQL Database" to persist.',
    });
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
  const activeReportTrips = trips;
  const totalReportBags = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure === 'Bags' ? (Number(t.quantity) || 0) : 0), 0);
  const totalReportMT = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure?.includes('Tonnes') || t.unitOfMeasure?.includes('MT') ? (Number(t.quantity) || 0) : 0), 0);
  const totalReportDamages = activeReportTrips.reduce((acc, t) => acc + (t.damages?.damagedUnits || t.damages?.burstBags || (t.wagonLogs || []).reduce((wAcc: number, w: any) => wAcc + (Number(w.damageQty || 0) + Number(w.burstBags || 0)), 0)), 0);
  const totalReportRevenue = activeReportTrips.reduce((acc, t) => {
    if (t.tripRevenue) return acc + Number(t.tripRevenue);
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 relative">
      {/* ─── FLOATING ALERT MODAL ─── */}
      {customAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#62BC37] text-white rounded-full flex items-center justify-center font-black text-base shadow-sm">
                ✓
              </div>
              <h3 className="text-base font-black text-slate-900">{customAlert.title || 'Action Completed'}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md"
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
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">USER ACCOUNT MANAGEMENT</span>
                <h3 className="text-lg font-black text-slate-900">Edit Provisioned User Account</h3>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 font-bold hover:text-slate-900">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name *</label>
                <input
                  required
                  value={editingUser.fullName}
                  onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mobile Phone *</label>
                  <input
                    required
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Role Classification</label>
                  <select
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assigned Station</label>
                  <select
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
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Security PIN</label>
                  <input
                    value={editingUser.pin || '1111'}
                    onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Account Status</label>
                  <select
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
                  className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                >
                  ✓ Save Account Corrections ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CREATE NEW DEAL MODAL ─── */}
      {createDealModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">COMMERCIAL CONTRACT REGISTRATION</span>
                <h3 className="text-lg font-black text-slate-900">Create New Freight Deal</h3>
              </div>
              <button onClick={() => setCreateDealModal(false)} className="text-slate-400 font-bold hover:text-slate-900">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewDeal} className="space-y-3 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Industrial Consignee Client *</label>
                <select
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Canonical Corridor Preset (Official Documented Operations)
                </label>
                <select
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
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-950 font-bold focus:ring-2 focus:ring-[#62BC37]"
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Loading Station (Gauge)</label>
                  <select
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Destination Yard (Gauge)</label>
                  <select
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cargo Commodity *</label>
                <select
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Quantity ({currentCargoConfig.unit}) *
                  </label>
                  <input
                    required
                    type="number"
                    value={newDealForm.quantity}
                    onChange={(e) => setNewDealForm({ ...newDealForm, quantity: e.target.value })}
                    placeholder={`Quantity in ${currentCargoConfig.unit}...`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Target Date</label>
                  <input
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
                  className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                >
                  ✓ Create Deal ➔
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
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">ACCOUNTS RECEIVABLE SETTLEMENT</span>
                <h3 className="text-lg font-black text-slate-900">Record Payment Remittance</h3>
              </div>
              <button
                onClick={() => setPaymentModalInvoice(null)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ✕
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Remittance Amount (NGN) *</label>
                <input
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Payment Classification *</label>
                <select
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Bank Transfer Reference / Session ID *</label>
                <input
                  required
                  value={paymentForm.ref}
                  onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })}
                  placeholder="e.g. TRF-GTB-99201948 or NIBSS-0021"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Remittance Date *</label>
                <input
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
                  className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ✓ Commit Remittance ➔
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
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">CORRIDOR EXPENDITURE BOOKING</span>
                <h3 className="text-lg font-black text-slate-900">Book Direct Corridor Expense</h3>
              </div>
              <button
                onClick={() => setNewCostModal(false)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTripCost} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Train Trip *</label>
                  <select
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Expense Category *</label>
                  <select
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Voucher Description *</label>
                <input
                  required
                  value={newCostForm.title}
                  onChange={(e) => setNewCostForm({ ...newCostForm, title: e.target.value })}
                  placeholder="e.g. NRC Track Access Toll (Ewekoro ➔ Moniya)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vendor / Beneficiary *</label>
                  <input
                    required
                    value={newCostForm.vendor}
                    onChange={(e) => setNewCostForm({ ...newCostForm, vendor: e.target.value })}
                    placeholder="e.g. Nigerian Railway Corporation (NRC)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Voucher Number *</label>
                  <input
                    required
                    value={newCostForm.voucherNo}
                    onChange={(e) => setNewCostForm({ ...newCostForm, voucherNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Expense Amount (NGN) *</label>
                <input
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
                  className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  ✓ Book Voucher ➔
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
                  Assigned to Trip <span className="font-mono font-bold text-[#62BC37]">{editingTripCost.tripId}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingTripCost(null)}
                className="text-slate-400 font-bold hover:text-slate-900 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateTripCost} className="space-y-3 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Expense Category *</label>
                  <select
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Payment Status *</label>
                  <select
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
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Voucher Description *</label>
                <input
                  required
                  value={editingTripCost.title || ''}
                  onChange={(e) => setEditingTripCost({ ...editingTripCost, title: e.target.value })}
                  placeholder="e.g. NRC Track Access Toll"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vendor / Beneficiary *</label>
                  <input
                    required
                    value={editingTripCost.vendor || ''}
                    onChange={(e) => setEditingTripCost({ ...editingTripCost, vendor: e.target.value })}
                    placeholder="e.g. Nigerian Railway Corporation (NRC)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Voucher Number *</label>
                  <input
                    required
                    value={editingTripCost.voucherNo || ''}
                    onChange={(e) => setEditingTripCost({ ...editingTripCost, voucherNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Expense Amount (NGN) *</label>
                <input
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
                  ✓ Save Voucher Changes ➔
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
              <span>{sidebarOpen ? 'Hide Menu ☰' : 'Command Menu ☰'}</span>
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
                <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">
                  {user?.role === 'HEAD_OF_OPERATIONS' ? 'OPERATIONS COMMAND HQ' : (user?.role === 'HEAD_OF_FINANCE' || user?.role === 'ACCOUNTANT') ? 'FINANCE HQ DESK' : user?.role === 'CEO' || user?.role === 'MD' ? 'CEO & MD COMMAND HQ' : 'EXECUTIVE COMMAND HQ'}
                </span>
                <h1 className="text-sm font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  BUENO LOGISTICS
                </h1>
              </div>
            </div>
          </div>

          {/* SYNCED LOGGED IN USER DETAILS + CREATE DEAL ACTION */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCreateDealModal(true)}
              className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <span>+ Create Freight Deal</span>
            </button>

            <div className="hidden sm:block text-right">
              <span className="text-xs font-extrabold text-slate-900 block">{currentUser?.fullName || user?.fullName || 'Alhaji Bashir Umar'}</span>
              <span className="text-[10px] font-mono text-[#62BC37] font-bold block">{currentUser?.roleLabel || currentUser?.role || user?.roleLabel || user?.role || 'Executive Command HQ'}</span>
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
                  <span className="text-xs font-mono font-extrabold text-[#62BC37] uppercase tracking-wider">COMMAND NAVIGATION</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2.5 py-1 rounded-xl text-xs font-extrabold border border-slate-200"
                >
                  ✕ Close
                </button>
              </div>

              <nav className="space-y-1.5 font-sans">
                {[
                  { id: 'analytics', label: 'Executive Reports & Analytics' },
                  { id: 'deals', label: 'Commercial Deals Desk' },
                  { id: 'negotiations', label: 'Client Negotiations Chat' },
                  { id: 'fund_requisitions', label: 'Fund Requisition & Operational Expenses' },
                  { id: 'fleet', label: 'Fleet & Rolling Stock Management' },
                  { id: 'terminal_info', label: 'Terminal Information Ledger (STATION: ###)' },
                  { id: 'moniya', label: 'Moniya Container Terminal (MICT)' },
                  { id: 'telemetry', label: 'Fleet Telemetry & Live GPS' },
                  { id: 'manifest', label: 'Cargo Manifests & Waybills' },
                  { id: 'billing', label: 'Commercial Invoices & Ledger' },
                  { id: 'users', label: 'User Directory & Account Provisioning' },
                  { id: 'permissions', label: 'Enterprise Permissions Matrix' },
                ].filter((t) => StateEngine.canUserAccessTab(user, t.id)).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`w-full text-left px-4 py-3 rounded-2xl font-extrabold text-xs transition-all ${
                      activeTab === t.id
                        ? 'bg-[#62BC37] text-white shadow-md'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* ─── MAIN CONTENT CANVAS (SHIFTS CLEANLY, SHARP & UNBLURRED) ─── */}
        <main className="flex-1 p-6 space-y-6 min-w-0">

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
                  <p className="text-slate-600">Audit Period: {selectedMonth}</p>
                  <p className="text-slate-600">Generated: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>

            {/* HISTORICAL DATE BACK ARCHIVE FILTER BAR (HIDDEN DURING PRINT) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">HISTORICAL CORRIDOR AUDIT ARCHIVE</span>
                <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Executive Reports & Date Back History
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Month Picker for 2-3 Months Ago Historical Search */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 font-mono">Retrievable Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-900 text-white font-bold rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                  >
                    <option value="2026-09">September 2026 (Current)</option>
                    <option value="2026-08">August 2026 (1 Month Ago)</option>
                    <option value="2026-07">July 2026 (2 Months Ago)</option>
                    <option value="2026-06">June 2026 (3 Months Ago)</option>
                  </select>
                </div>

                {/* Period Selector */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {(['weekly', 'monthly', 'quarterly', 'annually'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedPeriod(p)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold capitalize transition-all ${
                        selectedPeriod === p ? 'bg-[#62BC37] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => window.print()}
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>Export Audit Report (PDF)</span>
                </button>
              </div>
            </div>

            {/* TOP ANALYTICS HIGHLIGHT CARDS FOR SELECTED HISTORICAL MONTH */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Gross Tariff Revenue ({selectedMonth})</span>
                <p className="text-2xl font-black text-slate-900 font-mono">₦{totalReportRevenue.toLocaleString()}</p>
                <span className="text-[10px] text-emerald-700 font-bold">✓ Disbursed Freight Value</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Bagged Cement Volume</span>
                <p className="text-2xl font-black text-[#62BC37] font-mono">{totalReportBags.toLocaleString()} Bags</p>
                <span className="text-[10px] text-emerald-700 font-bold">Covered Hopper Wagons</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Bulk Raw Material Payload</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{totalReportMT.toLocaleString()} MT</p>
                <span className="text-[10px] text-slate-500 font-bold">Gypsum & Limestone Ore</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Recorded Discrepancies / Defects</span>
                <p className="text-2xl font-black text-rose-600 font-mono">{totalReportDamages} Defect(s)</p>
                <span className="text-[10px] text-slate-500 font-bold">Burst Bag Tally</span>
              </div>
            </div>

            {/* SECTION 1: LIVE MONTHLY TERMINAL TRAIN BENCHMARKS */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">CORRIDOR TERMINAL BENCHMARKS</span>
                  <h3 className="text-base font-black text-slate-900">
                    LIVE MONTHLY TERMINAL TRAIN BENCHMARKS: Station Operational Target vs Live Actual Completion
                  </h3>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-xl">
                  {selectedMonth} Target Sync
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { station: 'Ewekoro Siding (EWK)', target: 24, actual: 21, tonnage: '31,500 MT', efficiency: '92.4%', turnaround: '3.2 hrs/train' },
                  { station: 'Moniya Yard (MNY)', target: 30, actual: 28, tonnage: '42,000 MT', efficiency: '94.8%', turnaround: '2.8 hrs/train' },
                  { station: 'Apapa Port (APT)', target: 18, actual: 16, tonnage: '24,000 MT', efficiency: '88.9%', turnaround: '4.1 hrs/train' },
                ].map((b, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-900">{b.station}</span>
                      <span className="text-xs font-black text-[#62BC37] font-mono">{b.efficiency} Target</span>
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
            </div>

            {/* SECTION 2: LIVE OFFICER KPI EVALUATION ENGINE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">FIELD OFFICER SCORECARD</span>
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
                    {[
                      { name: 'Segun Alabi (Inspector)', station: 'EWK Terminal', trips: 18, accuracy: '99.4%', speed: '74 km/h', rating: '5.0 ★', tier: 'EXEMPLARY' },
                      { name: 'Ade Bello (Cargo Officer)', station: 'MNY Terminal', trips: 15, accuracy: '98.8%', speed: '68 km/h', rating: '4.9 ★', tier: 'TOP PERFORMER' },
                      { name: 'Inspector Ibrahim (Escort)', station: 'APT Terminal', trips: 12, accuracy: '97.5%', speed: '70 km/h', rating: '4.8 ★', tier: 'COMMENDED' },
                    ].map((kpi, idx) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: DATABASE TRIP AUDIT LOG */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">CORRIDOR AUDIT TRAIL</span>
                  <h3 className="text-base font-black text-slate-900">
                    DATABASE TRIP AUDIT LOG: Archived Consignments & Discrepancies for {selectedMonth}
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
                    {activeReportTrips.map((t, idx) => {
                      const qty = Number(t.quantity) || 1600;
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
                              {isCompleted ? '✓ COMPLETED & AUDITED' :
                               isInTransit ? '📡 IN TRANSIT (LIVE GPS)' :
                               isLoading ? '⏳ LOADING AT STATION' : (t.status || 'ACTIVE')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedAuditTrip(t)}
                              className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 ml-auto"
                            >
                              <span>📋 View Audit & PDF</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4: OFFICIAL DAILY OPERATIONS EXECUTIVE SIGN-OFF */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">EXECUTIVE CERTIFICATION & APPROVAL</span>
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
                    <span className="text-emerald-700 font-extrabold">✓ DIGITAL SIGNATURE VERIFIED</span>
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
                    <span className="text-emerald-700 font-extrabold">✓ AUDIT CERTIFIED & SEALED</span>
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
                <span className="text-[10px] text-emerald-700 font-bold">✓ Active B2B Contracts</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Trips Dispatched</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">{trips.length}</p>
                <span className="text-[10px] text-emerald-700 font-bold">✓ Wagon Fleet Assigned</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Rolling Stock Wagons</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{wagons.length}</p>
                <span className="text-[10px] text-slate-500 font-bold">Active Fleet Inventory</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Client Requisitions</span>
                <p className="text-2xl font-black text-[#62BC37] font-mono">{negotiations.length}</p>
                <span className="text-[10px] text-emerald-700 font-bold">Client Negotiations Inbox</span>
              </div>
            </div>

            {/* DEALS ACTION & DIRECTORY */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Logistics Management</span>
                  <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Commercial Freight Deals Directory
                  </h3>
                </div>

                <button
                  onClick={() => setCreateDealModal(true)}
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-3 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>+ Create New Commercial Deal</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.filter((d) => d.status !== 'TRIP_CREATED' && d.status !== 'COMPLETED').length === 0 ? (
                  <div className="col-span-2 p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium text-xs">
                    No active deals awaiting trip creation. All commercial deals have been launched into operational trips.
                  </div>
                ) : (
                  deals.filter((d) => d.status !== 'TRIP_CREATED' && d.status !== 'COMPLETED').map((d) => {
                    const qty = Number(d.quantity) || 1610;
                    const unit = d.unitOfMeasure || (d.cargoType?.includes('Gypsum') || d.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                    const wagon = d.wagonType || (d.cargoType?.includes('Gypsum') ? 'Gondola Wagon' : 'Covered Hopper Wagon');

                    const isNarrowGauge = ['EWK', 'ITO', 'DGB', 'OSB', 'ILR', 'IDD'].includes(d.loadingStation);

                    return (
                      <div key={d.id} className="p-5 rounded-3xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                          <div>
                            <span className="font-mono font-bold text-[#62BC37] text-[10px] uppercase block">{d.dealNumber || d.id}</span>
                            <h4 className="font-black text-slate-900 text-sm">{d.company || d.companyName}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-[9px] px-2.5 py-0.5 rounded-full border ${
                              isNarrowGauge ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {isNarrowGauge ? 'Narrow Gauge (1,067mm)' : 'Standard Gauge (1,435mm)'}
                            </span>
                            <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-3 py-1 rounded-full text-[10px] uppercase">
                              {d.status || 'APPROVED'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white p-3 rounded-xl border border-slate-200">
                          <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Corridor</span><span className="font-bold text-slate-900">{d.loadingStation || 'EWK'} ➔ {d.destination || 'MNY'}</span></div>
                          <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Commodity</span><span className="font-bold text-slate-900 truncate block">{d.cargoType}</span></div>
                          <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Volume ({unit})</span><span className="font-mono font-bold text-emerald-700">{qty.toLocaleString()} {unit}</span></div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleApproveDealAndAllocateWagons(d)}
                            className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm"
                          >
                            Launch Corridor Trip ➔
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">CLIENT NEGOTIATIONS MESSAGING DESK</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {negotiations.length} Active
                    </span>
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, company or deal ID..."
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
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
                        onClick={() => setActiveDealId(thread.id)}
                        className={`w-full text-left p-4 transition-all flex items-start gap-3 relative ${
                          isSelected ? 'bg-emerald-50/80 border-l-4 border-[#62BC37]' : 'hover:bg-slate-100/80 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm font-mono">
                          {(thread.companyName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h4 className="text-xs font-black text-slate-900 truncate">{thread.companyName}</h4>
                            <span className="text-[9px] font-mono text-slate-400">{lastMsg?.time || thread.createdAt}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-[#62BC37] font-bold">{thread.email || thread.id}</span>
                            {thread.hasUnread || thread.status === 'PENDING_REVIEW' ? (
                              <span className="bg-[#62BC37] text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-xs">
                                🟢 New Request
                              </span>
                            ) : thread.status === 'APPROVED_DISPATCHED' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                ✓ Dispatched
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
                      <div className="w-10 h-10 rounded-full bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shadow-sm font-mono">
                        {(activeThread.companyName || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {activeThread.companyName}
                        </h3>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 bg-[#62BC37] rounded-full animate-ping inline-block" />
                          Online • B2B Logistics Desk ({activeThread.cargoType || 'Bagged Cement'})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApproveDealAndAllocateWagons(activeThread)}
                      className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                    >
                      <span>✓ Accept Deal & Allocate Wagons</span>
                    </button>
                  </div>

                  <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto font-sans">
                    {(activeThread.messages || []).map((msg: any, idx: number) => {
                      const isAdmin = !msg.role?.includes('Consignee') && !msg.sender.includes(activeThread.companyName);

                      return (
                        <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 shadow-sm ${
                            isAdmin
                              ? 'bg-[#62BC37] text-white rounded-br-none'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                          }`}>
                            <div className="flex justify-between items-center gap-4 text-[9px] opacity-90 border-b border-black/10 pb-1 font-mono">
                              <span className="font-extrabold">{msg.sender} ({msg.role || 'Client Lead'})</span>
                              <span>{msg.time}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-line font-medium text-xs mt-1">{msg.text}</p>
                            <div className="text-right text-[9px] font-mono opacity-80 pt-0.5">
                              {isAdmin ? '✓✓ Delivered' : '✓ Received'}
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
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                    />
                    <button
                      type="submit"
                      className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all"
                    >
                      Send Reply ➔
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
                      <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">{trip.id}</span>
                      <h3 className="text-base font-black text-slate-900">{trip.company || 'Industrial Consignee'}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDossierTrip(trip)}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>📄 View Dossier</span>
                      </button>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase">
                        {trip.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs text-center">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Locomotive</span><span className="font-mono font-bold text-slate-900">{trip.locomotiveId || 'L2205'}</span></div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Escort Officer</span><span className="font-mono font-bold text-[#62BC37]">{trip.monitoringOfficerName || trip.cargoOfficerName || 'Ade Bello'}</span></div>
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
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Official Consignment Manifests</span>
              <h3 className="text-base font-black text-slate-900">Cargo Loading & Unloading Tally Audits</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {trips.map((t) => (
                <div key={t.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase">{t.id}</span>
                    <h4 className="font-sans font-black text-slate-900 text-sm">{t.company}</h4>
                    <p className="text-slate-500 font-sans text-xs">{t.origin} ➔ {t.destination} • {t.quantity} {t.unitOfMeasure || 'Bags'}</p>
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
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">
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
                    <span>🔄 Reconcile Trips & Damages</span>
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
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setAccountingSubTab('invoices')}
                  className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    accountingSubTab === 'invoices'
                      ? 'bg-[#62BC37] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Commercial Invoices (AR)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {invoices.length}
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('pnl')}
                  className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    accountingSubTab === 'pnl'
                      ? 'bg-[#62BC37] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Corridor Trip P&L & Costing Sheet (COGS)</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${accountingSubTab === 'pnl' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {corridorMarginPct}% Margin
                  </span>
                </button>

                <button
                  onClick={() => setAccountingSubTab('customers')}
                  className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    accountingSubTab === 'customers'
                      ? 'bg-[#62BC37] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span>Consignee Statement of Account</span>
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
                  <span className="text-[10px] text-[#62BC37] font-bold">
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
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
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
                                <span className="text-[9px] text-[#62BC37] font-bold">Trip: {inv.tripId}</span>
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
                                      💥 {inv.damageUnits} Burst Bags
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-emerald-600 font-bold text-[10px]">✓ Intact</span>
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
                                    📄 Invoice
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
                      <label className="text-xs font-bold text-slate-500">Select Corridor:</label>
                      <select
                        value={selectedTripForCosting}
                        onChange={(e) => setSelectedTripForCosting(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono"
                      >
                        <option value="ALL">All Active Train Corridors</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.id} — {t.company} ({t.origin} ➔ {t.destination})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setNewCostModal(true)}
                        className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
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
                                <p className="text-xs text-slate-500">{t.origin} ➔ {t.destination} • {t.cargoType || 'Bagged Cement'}</p>
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
                                  <span>🛤️</span> NRC Track Access Tolls
                                </span>
                                <span className="font-bold">
                                  ₦{summary.directCosts.filter((c: any) => c.category === 'NRC_TRACK_ACCESS').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>⛽</span> Locomotive Diesel AGO Fuel
                                </span>
                                <span className="font-bold">
                                  ₦{summary.directCosts.filter((c: any) => c.category === 'AGO_FUEL').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>👮</span> Train Driver & Police Escort Allowance
                                </span>
                                <span className="font-bold">
                                  ₦{summary.directCosts.filter((c: any) => c.category === 'CREW_ESCORT').reduce((acc: number, c: any) => acc + Number(c.amount || 0), 0).toLocaleString()}
                                </span>
                              </div>

                              <div className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span>🏗️</span> Siding Field Requisitions (Approved)
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
                        <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Voucher Ledger</span>
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
                              <td className="py-3 px-3 text-[#62BC37] font-bold">{c.tripId}</td>
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
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteTripCost(c.id)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-1 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Reverse Voucher"
                                >
                                  ✕
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
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Industrial Client Ledger</span>
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
                                    className="text-[10px] text-[#62BC37] hover:underline font-bold cursor-pointer"
                                  >
                                    View Statement ➔
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
            </div>
          );
        })()}

        {/* ─── TAB 6: USER DIRECTORY & EDITABLE PROVISIONING ─── */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* PROVISION USER FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Staff & Account Provisioning</span>
                <h3 className="text-base font-black text-slate-900">Provision New Account</h3>
              </div>

              <form onSubmit={handleProvisionUser} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name *</label>
                  <input
                    required
                    value={provisionForm.fullName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, fullName: e.target.value })}
                    placeholder="e.g. Segun Alabi"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={provisionForm.email}
                      onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                      placeholder="segun@bueno.ng"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mobile Phone *</label>
                    <input
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
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Role Classification</label>
                    <select
                      value={provisionForm.role}
                      onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value })}
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
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assigned Station</label>
                    <select
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

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Provision & Activate Account
                </button>
              </form>
            </div>

            {/* USER DIRECTORY TABLE WITH EDIT BUTTONS */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Editable User Directory</span>
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
                    {usersList.map((u, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-sans text-slate-900">{u.fullName}</td>
                        <td className="p-3 text-slate-600">{u.email}</td>
                        <td className="p-3 font-bold text-[#62BC37]">{u.role}</td>
                        <td className="p-3 text-slate-600">{u.assignedStation || 'EWK'}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                          >
                            ✏️ Edit
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
                <p className="text-2xl font-black text-[#62BC37] font-mono">
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
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">OPERATIONAL EXPENSE LEDGER</span>
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
                                className="bg-[#62BC37] hover:bg-[#52A02D] text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                              >
                                ✓ Approve
                              </button>
                            )}
                            {isApproved && !isDisbursed && (
                              <button
                                onClick={() => handleDisburseRequisition(req.id)}
                                className="bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-xs"
                              >
                                💸 Disburse (GTBank)
                              </button>
                            )}
                            {isDisbursed && (
                              <span className="text-[10px] text-emerald-700 font-extrabold">✓ Funds Cleared</span>
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
        {activeTab === 'fleet' && (
          <div className="space-y-6 font-sans">
            {/* KPI OVERVIEW CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Rolling Stock Fleet</span>
                <p className="text-2xl font-black text-slate-900 font-mono">{wagons.length} Wagons</p>
                <span className="text-[10px] text-emerald-700 font-bold">Standard & Narrow Gauge</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Available for Loading</span>
                <p className="text-2xl font-black text-[#62BC37] font-mono">
                  {wagons.filter(w => w.status === 'AVAILABLE').length} Wagons
                </p>
                <span className="text-[10px] text-emerald-700 font-bold">Ready at Sidings</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Loaded / In Transit</span>
                <p className="text-2xl font-black text-amber-600 font-mono">
                  {wagons.filter(w => w.status === 'LOADED' || w.status === 'IN_TRANSIT').length} Wagons
                </p>
                <span className="text-[10px] text-slate-500 font-bold">En-Route Corridor</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Freight Tonnage Payload</span>
                <p className="text-2xl font-black text-emerald-700 font-mono">
                  {wagons.reduce((acc, w) => acc + (Number(w.payloadCapacity?.replace(/\D/g, '')) || 60), 0).toLocaleString()} MT
                </p>
                <span className="text-[10px] text-slate-500 font-bold">Cumulative Fleet Capacity</span>
              </div>
            </div>

            {/* FLEET MANAGEMENT TABLE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">ROLLING STOCK ASSET MANAGEMENT</span>
                  <h3 className="text-base font-black text-slate-900">
                    Active Wagon Inventory & Terminal Allocation
                  </h3>
                </div>
                <button
                  onClick={() => setRegisterWagonModal(true)}
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
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
                    {wagons.map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.id}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{w.wagonType || 'Covered Hopper Wagon'}</td>
                        <td className="p-3 font-extrabold text-emerald-700">{w.payloadCapacity || '60 MT'}</td>
                        <td className="p-3 text-slate-600">{w.gauge || 'STANDARD_GAUGE'}</td>
                        <td className="p-3 font-bold text-slate-700">
                          {w.currentStation === 'EWK' ? 'Ewekoro Siding (EWK)' : w.currentStation === 'MNY' ? 'Moniya Yard (MNY)' : 'Apapa Port (APT)'}
                        </td>
                        <td className="p-3 text-right">
                          <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded uppercase ${
                            w.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'LOADED' || w.status === 'IN_TRANSIT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {w.status || 'AVAILABLE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── REGISTER NEW WAGON MODAL ─── */}
        {registerWagonModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 font-sans">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">ROLLING STOCK REGISTRATION</span>
                  <h3 className="text-base font-black text-slate-900">Provision New Fleet Wagon</h3>
                </div>
                <button onClick={() => setRegisterWagonModal(false)} className="text-slate-400 font-bold hover:text-slate-900">✕</button>
              </div>

              <form onSubmit={handleRegisterWagon} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Wagon Registration ID *</label>
                  <input
                    required
                    value={newWagonForm.id}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Wagon Classification *</label>
                  <select
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
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Payload Capacity</label>
                    <input
                      required
                      value={newWagonForm.payloadCapacity}
                      onChange={(e) => setNewWagonForm({ ...newWagonForm, payloadCapacity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assigned Station</label>
                    <select
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
                    className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold py-2.5 rounded-xl shadow-md transition-all"
                  >
                    ✓ Register Wagon ➔
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

        {/* ─── TAB 7: EDITABLE PERMISSIONS MATRIX ─── */}
        {activeTab === 'permissions' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Spatie Role-Based Access Control</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Interactive & Editable Permissions Matrix
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to purge all demo trips, costs, and invoices for a clean production state?')) {
                      StateEngine.purgeDemoData();
                      syncData();
                      setCustomAlert({ title: 'Production Data Purged', message: 'All dummy trips, mock costs, and demo invoices have been purged.' });
                    }
                  }}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-rose-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🗑️ Clean Production Reset</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPermissionsDefaults}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all border border-slate-200"
                >
                  ↺ Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSavePermissionsMatrix}
                  disabled={isSavingPermissions}
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isSavingPermissions ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to SQL Database...</span>
                    </>
                  ) : permissionsSaveSuccess ? (
                    <>
                      <span>✓ Saved to Database!</span>
                    </>
                  ) : (
                    <>
                      <span>💾 Save Permissions to SQL Database</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* SYSTEM SETTINGS TOGGLES */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-900">Admin Negotiations Access Control</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Allow Admin Officers (`ADMIN`) to view and participate in Client Negotiations Chat alongside Head of Operations (`HEAD_OF_OPERATIONS`).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono ${systemSettings.allowAdminClientNegotiations ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {systemSettings.allowAdminClientNegotiations ? 'ENABLED' : 'DISABLED'}
                  </span>
                  <input
                    type="checkbox"
                    checked={systemSettings.allowAdminClientNegotiations}
                    onChange={(e) => handleToggleAdminNegotiations(e.target.checked)}
                    className="w-5 h-5 text-[#62BC37] rounded focus:ring-[#62BC37] cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* EDITABLE PERMISSIONS CHECKBOX MATRIX — ALL PORTALS, ALL ROLES */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="p-3 font-mono font-extrabold text-[10px] uppercase text-slate-500 whitespace-nowrap sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                      Role Classification
                    </th>
                    {TAB_REGISTRY.map((tab) => (
                      <th
                        key={tab.key}
                        className="p-3 text-center font-mono font-bold text-[10px] uppercase text-slate-700 whitespace-nowrap bg-slate-100 border-r border-slate-200"
                      >
                        <div>{tab.label}</div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5">{tab.category}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {[
                    { key: 'ADMIN',              label: 'Admin Officer (ADMIN)',       badge: 'bg-purple-100 text-purple-800' },
                    { key: 'CEO',                label: 'Managing Director / CEO',     badge: 'bg-blue-100 text-blue-800' },
                    { key: 'HEAD_OF_OPERATIONS', label: 'Head of Operations',          badge: 'bg-indigo-100 text-indigo-800' },
                    { key: 'HEAD_OF_FINANCE',    label: 'Head of Finance',             badge: 'bg-teal-100 text-teal-800' },
                    { key: 'CARGO_OFFICER',      label: 'Cargo Officer (Field)',       badge: 'bg-amber-100 text-amber-800' },
                    { key: 'CUSTOMER',           label: 'Industrial Consignee Client', badge: 'bg-emerald-100 text-emerald-800' },
                  ].map(({ key, label, badge }) => {
                    const rawPerms = permissionsMatrix?.[key];
                    const rolePerms: string[] = Array.isArray(rawPerms) ? rawPerms : (DEFAULT_ROLE_TAB_PERMISSIONS[key] ?? []);
                    const isSuperAdmin = key === 'ADMIN' || key === 'CEO' || key === 'MD';

                    return (
                      <tr key={key} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 whitespace-nowrap sticky left-0 bg-white border-r border-slate-200 z-10">
                          <span className={`inline-block px-2 py-1 rounded-lg text-[10px] font-extrabold font-mono ${badge}`}>
                            {label}
                          </span>
                          {isSuperAdmin && (
                            <span className="ml-1.5 text-[9px] text-slate-400 font-mono">FULL ACCESS</span>
                          )}
                        </td>

                        {TAB_REGISTRY.map((tab) => {
                          const isChecked = isSuperAdmin || rolePerms.includes(tab.key);

                          return (
                            <td
                              key={tab.key}
                              className="p-3 text-center border-r border-slate-200"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSuperAdmin}
                                onChange={() => !isSuperAdmin && handleTogglePermission(key, tab.key)}
                                title={isSuperAdmin ? 'Super-admins always have full access' : `Toggle ${tab.label} for ${label}`}
                                className={`w-4 h-4 rounded focus:ring-[#62BC37] ${
                                  isSuperAdmin
                                    ? 'text-purple-500 cursor-not-allowed opacity-70'
                                    : 'text-[#62BC37] cursor-pointer'
                                }`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ACTION FOOTER BAR */}
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-black uppercase text-emerald-400 font-mono">Enterprise Database Enforcement</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
                  Clicking Save commits these exact role permissions to the SQL database table (<code className="text-emerald-300">bueno_role_permissions</code>). All active user portals, field devices, and clients immediately enforce updated access rules.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSavePermissionsMatrix}
                disabled={isSavingPermissions}
                className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {isSavingPermissions ? 'Saving to Database...' : '💾 Save & Enforce Permissions Now'}
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mt-3 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Ticking any box immediately applies live to the role across all devices & SQL database
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-purple-100 border border-purple-300" /> Super-Admin (always full access, cannot be restricted)
              </span>
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
    </div>
  );
}
