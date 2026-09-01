'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';

// COMMODITY CONFIG MATRIX FOR CARGO OFFICERS
const COMMODITY_CONFIG: Record<string, { unit: string; wagonType: string; auditMetric: string }> = {
  'Bagged Cement (50kg)': { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' },
  'Bulk Gypsum': { unit: 'Metric Tonnes (MT)', wagonType: 'Open Top Gondola Wagon', auditMetric: 'Transit Shrinkage (MT)' },
  'Limestone Raw Ore': { unit: 'Metric Tonnes (MT)', wagonType: 'Bottom Dumper Wagon', auditMetric: 'Spillage Loss (MT)' },
  'Clinker Bulk': { unit: 'Metric Tonnes (MT)', wagonType: 'Gondola Wagon', auditMetric: 'Weight Deviation (MT)' },
  'Shipping Containers (20ft/40ft)': { unit: 'Containers (TEU)', wagonType: 'Flatbed Container Wagon', auditMetric: 'Seal Integrity' },
  'AGO Diesel / Liquid Bulk': { unit: 'Liters (L)', wagonType: 'Tanker Wagon', auditMetric: 'Ullage Loss (L)' },
};

export function CargoOfficerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'loading' | 'dispatch' | 'unloading' | 'wagons' | 'history'>('loading');
  const [trips, setTrips] = useState<any[]>([]);
  const [wagons, setWagons] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // DISPATCH ESCORT MODAL STATE
  const [dispatchModalTrip, setDispatchModalTrip] = useState<any | null>(null);
  const [escortForm, setEscortForm] = useState({
    officerName: 'Inspector Segun Alabi',
    officerPhone: '+234 803 777 9900',
    badgeId: 'NRC-ESC-2026-08',
    sendSmsPing: true,
  });

  // ORIGIN SIDING LOADING FORM
  const [loadingForm, setLoadingForm] = useState({
    wagonId: 'PXG 2322',
    cargoType: 'Bagged Cement (50kg)',
    quantity: '70',
    sealNumber: `SEAL-BN-${Math.floor(9000 + Math.random() * 999)}`,
    feederTruckNo: 'TRK-KJA-981-XP',
    weighbridgeGrossMt: '80.5',
    notes: '',
  });

  // DESTINATION YARD UNLOADING FORM
  const [unloadingForm, setUnloadingForm] = useState({
    wagonId: 'PXG 2322',
    sealVerified: true,
    intactQuantity: '70',
    discrepancyCount: '0',
    sidingBay: 'Warehouse Siding Bay #4',
    feederTruckNo: 'TRK-KJA-981-XP',
    remarks: 'Cargo unloaded intact with 0 defects',
  });

  // NEW WAGON REGISTRATION FORM
  const [newWagonForm, setNewWagonForm] = useState({
    wagonId: 'GND 4405',
    wagonType: 'Open Top Gondola Wagon',
    payloadCapacity: '70 MT',
    currentStation: user?.assignedStation || 'EWK',
    gauge: 'STANDARD_GAUGE',
    status: 'AVAILABLE',
  });

  const station = user?.assignedStation || 'EWK';
  const isDestinationYard = station === 'MNY';

  const syncData = () => {
    const liveTrips = StateEngine.getTrips();
    setTrips(liveTrips);
    setWagons(StateEngine.getWagons());
    if (liveTrips.length > 0 && !selectedTripId) {
      setSelectedTripId(liveTrips[0].id);
    }
  };

  useEffect(() => {
    syncData();
    window.addEventListener('storage', syncData);
    window.addEventListener('bueno_state_updated', syncData);
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('bueno_state_updated', syncData);
    };
  }, []);

  useEffect(() => {
    if (isDestinationYard) {
      setActiveTab('unloading');
    } else {
      setActiveTab('loading');
    }
  }, [isDestinationYard]);

  const activeTrip = trips.find((t) => t.id === selectedTripId || t.tripId === selectedTripId) || trips[0];
  const cargoConf = COMMODITY_CONFIG[loadingForm.cargoType] || { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' };

  // 1. LOG WAGON LOADING & APPLY SECURITY SEAL
  const handleLogWagonLoading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    const quantityNum = Number(loadingForm.quantity) || 70;
    const unitLabel = cargoConf.unit;

    const newWagonLog = {
      wagonId: loadingForm.wagonId,
      status: 'LOADED',
      loadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bagsCount: `${quantityNum} ${unitLabel}`,
      quantityNum: quantityNum,
      unitOfMeasure: unitLabel,
      sealNumber: loadingForm.sealNumber,
      feederTruckNo: loadingForm.feederTruckNo,
      weighbridgeGrossMt: loadingForm.weighbridgeGrossMt,
      cargoOfficerName: user?.fullName || 'Ade Bello',
    };

    const currentWagonLogs = activeTrip.wagonLogs || [];
    const updatedWagonLogs = [newWagonLog, ...currentWagonLogs.filter((w: any) => w.wagonId !== loadingForm.wagonId)];

    StateEngine.updateTrip(activeTrip.id, {
      wagonLogs: updatedWagonLogs,
      status: 'LOADING',
      cargoOfficerName: user?.fullName || 'Ade Bello',
    });

    setCustomAlert({
      title: 'Wagon Loading & Seal Recorded',
      message: `Wagon ${loadingForm.wagonId} loaded with ${quantityNum} ${unitLabel} for ${activeTrip.company}! Security Seal ${loadingForm.sealNumber} applied & locked.`,
    });

    setLoadingForm({
      ...loadingForm,
      wagonId: `PXG ${Math.floor(2300 + Math.random() * 99)}`,
      sealNumber: `SEAL-BN-${Math.floor(9000 + Math.random() * 999)}`,
    });
  };

  // 2. DISPATCH TRAIN WITH ON-BOARD ESCORT OFFICER & LIVE GPS TELEMETRY
  const handleConfirmDispatchWithEscort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalTrip) return;

    StateEngine.updateTrip(dispatchModalTrip.id, {
      status: 'IN_TRANSIT',
      monitoringOfficerName: escortForm.officerName,
      monitoringOfficerPhone: escortForm.officerPhone,
      escortPhone: escortForm.officerPhone,
      escortBadgeId: escortForm.badgeId,
      dispatchTime: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
    });

    setDispatchModalTrip(null);

    setCustomAlert({
      title: 'Train Dispatched & Live GPS Satellite Telemetry Locked',
      message: `Train #${dispatchModalTrip.id} dispatched! Monitoring Officer ${escortForm.officerName} (${escortForm.officerPhone}) assigned. Live phone satellite GPS tracking activated across all command dashboards!`,
    });
  };

  // 3. LOG WAGON UNLOADING & SEAL CUT AUDIT AT DESTINATION
  const handleLogWagonUnloading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    const intactNum = Number(unloadingForm.intactQuantity) || 70;
    const discrepancyNum = Number(unloadingForm.discrepancyCount) || 0;
    const unitLabel = activeTrip.unitOfMeasure || 'Bags';

    const currentWagonLogs = activeTrip.wagonLogs || [];
    const updatedWagonLogs = currentWagonLogs.map((w: any) => {
      if (w.wagonId === unloadingForm.wagonId) {
        return {
          ...w,
          status: 'UNLOADED',
          unsealedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unloadingOfficerName: user?.fullName || 'Musa Ibrahim',
          unloadedIntact: `${intactNum} ${unitLabel}`,
          discrepancy: discrepancyNum,
          sidingBay: unloadingForm.sidingBay,
          sealVerified: unloadingForm.sealVerified,
        };
      }
      return w;
    });

    const updatedDamages = {
      damagedUnits: (activeTrip.damages?.damagedUnits || 0) + discrepancyNum,
      burstBags: (activeTrip.damages?.burstBags || 0) + discrepancyNum,
      complaintNotes: unloadingForm.remarks ? [...(activeTrip.damages?.complaintNotes || []), unloadingForm.remarks] : activeTrip.damages?.complaintNotes || [],
    };

    StateEngine.updateTrip(activeTrip.id, {
      wagonLogs: updatedWagonLogs,
      damages: updatedDamages,
      unloadingOfficerName: user?.fullName || 'Musa Ibrahim',
      status: updatedWagonLogs.every((w: any) => w.status === 'UNLOADED') ? 'COMPLETED' : 'IN_TRANSIT',
    });

    setCustomAlert({
      title: 'Destination Unloading Audited',
      message: `Wagon ${unloadingForm.wagonId} unsealed & discharged at ${unloadingForm.sidingBay}! Intact: ${intactNum} ${unitLabel}, Discrepancies: ${discrepancyNum}.`,
    });
  };

  // 4. REGISTER NEW ROLLING STOCK WAGON
  const handleRegisterNewWagon = (e: React.FormEvent) => {
    e.preventDefault();
    const newWagonObj = {
      id: newWagonForm.wagonId,
      wagonType: newWagonForm.wagonType,
      payloadCapacity: newWagonForm.payloadCapacity,
      currentStation: newWagonForm.currentStation,
      gauge: newWagonForm.gauge,
      status: newWagonForm.status,
      registeredBy: user?.fullName || 'Cargo Officer',
      createdAt: new Date().toLocaleDateString('en-GB'),
    };

    StateEngine.registerWagon(newWagonObj);
    setWagons([newWagonObj, ...wagons]);

    setCustomAlert({
      title: 'New Wagon Registered to Fleet Repository',
      message: `Wagon ${newWagonObj.id} [${newWagonObj.wagonType}] registered with Payload Capacity of ${newWagonObj.payloadCapacity} at Station ${newWagonObj.currentStation}!`,
    });

    setNewWagonForm({
      wagonId: `WGN-${Math.floor(5000 + Math.random() * 999)}`,
      wagonType: 'Open Top Gondola Wagon',
      payloadCapacity: '70 MT',
      currentStation: station,
      gauge: 'STANDARD_GAUGE',
      status: 'AVAILABLE',
    });
  };

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

      {/* ─── DISPATCH & ESCORT OFFICER REGISTRATION MODAL ─── */}
      {dispatchModalTrip && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 font-sans">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">CORRIDOR DISPATCH GATEWAY</span>
                <h3 className="text-lg font-black text-slate-900">Assign On-Board Escort & Initialize Live Satellite GPS</h3>
              </div>
              <button onClick={() => setDispatchModalTrip(null)} className="text-slate-400 font-bold hover:text-slate-900">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmDispatchWithEscort} className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Train Dispatch Target</span>
                <p className="text-xs font-black text-slate-900">
                  {dispatchModalTrip.id} • {dispatchModalTrip.company} ({dispatchModalTrip.origin} ➔ {dispatchModalTrip.destination})
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  On-Board Monitoring / Escort Officer Name *
                </label>
                <input
                  required
                  value={escortForm.officerName}
                  onChange={(e) => setEscortForm({ ...escortForm, officerName: e.target.value })}
                  placeholder="e.g. Inspector Segun Alabi"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Escort Mobile Phone Number *
                  </label>
                  <input
                    required
                    value={escortForm.officerPhone}
                    onChange={(e) => setEscortForm({ ...escortForm, officerPhone: e.target.value })}
                    placeholder="+234 803 777 9900"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-[#62BC37]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Security Badge ID *</label>
                  <input
                    required
                    value={escortForm.badgeId}
                    onChange={(e) => setEscortForm({ ...escortForm, badgeId: e.target.value })}
                    placeholder="NRC-ESC-2026-08"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-emerald-50 p-3 rounded-2xl border border-emerald-200">
                <input
                  type="checkbox"
                  id="smsPing"
                  checked={escortForm.sendSmsPing}
                  onChange={(e) => setEscortForm({ ...escortForm, sendSmsPing: e.target.checked })}
                  className="w-4 h-4 text-[#62BC37] rounded"
                />
                <label htmlFor="smsPing" className="text-xs font-bold text-emerald-900">
                  Send Live Satellite Telemetry Ping SMS Link to Officer&apos;s Mobile Phone
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalTrip(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                >
                  ✓ Dispatch Train & Lock Live Satellite GPS ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── HEADER (PURE WHITE & BRAND GREEN STICKY HEADER) ─── */}
      <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-xs">
        <div className="w-full px-4 sm:px-8 py-3 flex justify-between items-center">
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
                FIELD OPERATIONS TERMINAL
              </span>
              <h1 className="text-sm font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                CARGO OFFICER DESK ({user?.assignedStation || user?.stationName || 'EWK'})
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right font-sans">
              <span className="text-xs font-black text-slate-900 block">{user?.fullName || 'Ade Bello'}</span>
              <span className="text-[10px] font-mono text-[#62BC37] font-bold block">{user?.assignedStation || 'Ewekoro'} Station Officer</span>
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

      {/* ─── MAIN CONTAINER (100% FULL SCREEN WIDTH) ─── */}
      <main className="w-full px-4 sm:px-8 py-6 space-y-6">
        {/* ACTIVE TRIP SELECTOR BANNER */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Active Corridor Transport Path</span>
            <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Select Active Train Path to Inspect & Tally
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 font-mono">Trip:</span>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="bg-slate-900 text-white font-bold rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.id} • {t.company || 'Industrial Consignee'} ({t.origin} ➔ {t.destination})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm font-sans">
          <button
            onClick={() => setActiveTab('loading')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'loading' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Origin Siding Loading & Sealing
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'dispatch' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Train Dispatch & Live Satellite GPS
          </button>

          <button
            onClick={() => setActiveTab('unloading')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'unloading' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Destination Yard Unloading Audit
          </button>

          <button
            onClick={() => setActiveTab('wagons')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'wagons' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rolling Stock Wagon Registry ({wagons.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'history' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Shift Loading Ledger & Reports
          </button>
        </div>

        {/* ─── TAB 1: ORIGIN SIDING LOADING ─── */}
        {activeTab === 'loading' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* LOADING FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Siding Loading Form</span>
                <h3 className="text-base font-black text-slate-900">Record Wagon Loading & Seal</h3>
              </div>

              <form onSubmit={handleLogWagonLoading} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Wagon ID *</label>
                  <input
                    required
                    value={loadingForm.wagonId}
                    onChange={(e) => setLoadingForm({ ...loadingForm, wagonId: e.target.value })}
                    placeholder="e.g. PXG 2322"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cargo Commodity *</label>
                  <select
                    value={loadingForm.cargoType}
                    onChange={(e) => setLoadingForm({ ...loadingForm, cargoType: e.target.value })}
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
                      Loaded Volume ({cargoConf.unit}) *
                    </label>
                    <input
                      required
                      type="number"
                      value={loadingForm.quantity}
                      onChange={(e) => setLoadingForm({ ...loadingForm, quantity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Applied Security Seal # *</label>
                    <input
                      required
                      value={loadingForm.sealNumber}
                      onChange={(e) => setLoadingForm({ ...loadingForm, sealNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-700"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Log Wagon Loaded & Lock Security Seal
                </button>
              </form>
            </div>

            {/* LIVE WAGON LOADING TALLY TABLE */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Siding Tally Sheet</span>
                  <h3 className="text-base font-black text-slate-900">
                    Wagons Loaded for {activeTrip?.id} ({activeTrip?.company || 'Industrial Consignee'})
                  </h3>
                </div>
                <button
                  onClick={() => setDispatchModalTrip(activeTrip)}
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <span>Dispatch Train ➔</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Wagon ID</th>
                      <th className="p-3">Loaded Time</th>
                      <th className="p-3">Applied Seal #</th>
                      <th className="p-3">Volume Loaded</th>
                      <th className="p-3">Supervisor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(activeTrip?.wagonLogs || []).map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                        <td className="p-3 text-slate-600">{w.loadedAt}</td>
                        <td className="p-3 font-bold text-slate-900">{w.sealNumber}</td>
                        <td className="p-3 font-extrabold text-emerald-700">{w.bagsCount}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{w.cargoOfficerName || user?.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: LIVE TRAIN DISPATCH & LIVE GPS SATELLITE MAP ─── */}
        {activeTab === 'dispatch' && (
          <div className="space-y-6">
            <LiveGpsMap trip={activeTrip} />
          </div>
        )}

        {/* ─── TAB 3: DESTINATION YARD UNLOADING ─── */}
        {activeTab === 'unloading' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Destination Discharge Audit</span>
                <h3 className="text-base font-black text-slate-900">Unseal Wagon & Audit Tally</h3>
              </div>

              <form onSubmit={handleLogWagonUnloading} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Arrived Wagon ID *</label>
                  <select
                    value={unloadingForm.wagonId}
                    onChange={(e) => setUnloadingForm({ ...unloadingForm, wagonId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  >
                    {(activeTrip?.wagonLogs || [{ wagonId: 'PXG 2322' }, { wagonId: 'PXG 2323' }]).map((w: any, idx: number) => (
                      <option key={idx} value={w.wagonId}>
                        {w.wagonId} — (Seal: {w.sealNumber || 'SEAL-BN-9801'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Intact Unloaded ({activeTrip?.unitOfMeasure || 'Bags'}) *
                    </label>
                    <input
                      required
                      type="number"
                      value={unloadingForm.intactQuantity}
                      onChange={(e) => setUnloadingForm({ ...unloadingForm, intactQuantity: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Discrepancy / Defects *</label>
                    <input
                      required
                      type="number"
                      value={unloadingForm.discrepancyCount}
                      onChange={(e) => setUnloadingForm({ ...unloadingForm, discrepancyCount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-rose-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Clear Wagon Unloading & Lock Tally Audit
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Destination Discharge Audit Ledger</span>
                  <h3 className="text-base font-black text-slate-900">Unloaded Wagons for {activeTrip?.id}</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Wagon ID</th>
                      <th className="p-3">Unseal Time</th>
                      <th className="p-3">Verified Seal #</th>
                      <th className="p-3">Intact Delivered</th>
                      <th className="p-3">Defects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(activeTrip?.wagonLogs || []).map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                        <td className="p-3 text-slate-600">{w.unsealedAt || 'Awaiting Arrival'}</td>
                        <td className="p-3 font-bold text-slate-900">{w.sealNumber}</td>
                        <td className="p-3 font-extrabold text-emerald-700">{w.unloadedIntact || w.bagsCount}</td>
                        <td className="p-3 font-extrabold text-rose-600">{w.discrepancy || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: WAGON REGISTRY ─── */}
        {activeTab === 'wagons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Fleet Expansion Desk</span>
                <h3 className="text-base font-black text-slate-900">Register New Rolling Stock Wagon</h3>
              </div>

              <form onSubmit={handleRegisterNewWagon} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Wagon Registration Code / ID *</label>
                  <input
                    required
                    value={newWagonForm.wagonId}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, wagonId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Wagon Specification Type *</label>
                  <select
                    value={newWagonForm.wagonType}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, wagonType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="Covered Hopper Wagon">Covered Hopper Wagon (Bagged Cargo / Grains)</option>
                    <option value="Open Top Gondola Wagon">Open Top Gondola Wagon (Bulk Gypsum / Coal)</option>
                    <option value="Bottom Dumper Wagon">Bottom Dumper Wagon (Limestone / Raw Ore)</option>
                    <option value="Flatbed Container Wagon">Flatbed Container Wagon (20ft/40ft TEUs)</option>
                    <option value="Tanker Wagon">Tanker Wagon (AGO Diesel / Liquid Bulk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Payload Capacity *</label>
                  <input
                    required
                    value={newWagonForm.payloadCapacity}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, payloadCapacity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Register Wagon into Central Fleet Repository
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Central Fleet Directory</span>
                  <h3 className="text-base font-black text-slate-900">Active Rolling Stock Fleet ({wagons.length} Wagons)</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Wagon ID</th>
                      <th className="p-3">Specification Type</th>
                      <th className="p-3">Payload Capacity</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {wagons.map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.id}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{w.wagonType || 'Covered Hopper'}</td>
                        <td className="p-3 font-bold text-emerald-700">{w.payloadCapacity || `${w.capacity || 60} MT`}</td>
                        <td className="p-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                            w.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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

        {/* ─── TAB 5: SHIFT REPORT ─── */}
        {activeTab === 'history' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Terminal Shift Summary</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Officer Shift Tally Audit Ledger — Station: {user?.stationName || station}
                </h3>
              </div>
              <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
                Print Official Shift Tally (PDF)
              </button>
            </div>

            <div className="space-y-4 font-mono text-xs">
              {trips.map((t) => (
                <div key={t.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center font-sans">
                    <span className="font-bold text-[#62BC37] text-sm">{t.id} • {t.company}</span>
                    <span className="text-slate-500 font-mono text-[10px]">Dispatch: {t.dispatchTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
