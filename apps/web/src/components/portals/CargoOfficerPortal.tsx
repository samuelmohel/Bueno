'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

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
  const [activeTab, setActiveTab] = useState<'loading' | 'unloading' | 'wagons' | 'history'>('loading');
  const [trips, setTrips] = useState<any[]>([]);
  const [wagons, setWagons] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

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

  // NEW WAGON REGISTRATION FORM (NO HARDCODED BAGS)
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
  const cargoConf = COMMODITY_CONFIG[loadingForm.cargoType] || { unit: 'Bags', wagonType: 'Hopper Wagon', auditMetric: 'Burst Bags' };

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

  // 2. LOG WAGON UNLOADING & SEAL CUT AUDIT AT DESTINATION
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

  // 3. REGISTER NEW ROLLING STOCK WAGON
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#62BC37] text-white flex items-center justify-center font-black text-base shadow-md">
              B
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-widest block">FIELD CARGO OFFICER TERMINAL DESK</span>
              <h1 className="text-sm font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {user?.fullName || 'Ade Bello'} • Station: {user?.stationName || station} ({station})
              </h1>
            </div>
          </div>

          <button
            onClick={onSignOut}
            className="bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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

        {/* ─── TAB 1: ORIGIN SIDING LOADING & SEALING DESK ─── */}
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Feeder Truck Waybill #</label>
                    <input
                      value={loadingForm.feederTruckNo}
                      onChange={(e) => setLoadingForm({ ...loadingForm, feederTruckNo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Weighbridge Gross (MT)</label>
                    <input
                      value={loadingForm.weighbridgeGrossMt}
                      onChange={(e) => setLoadingForm({ ...loadingForm, weighbridgeGrossMt: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
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

            {/* LIVE WAGON LOADING TALLY TABLE FOR ACTIVE TRIP */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Siding Tally Sheet</span>
                  <h3 className="text-base font-black text-slate-900">
                    Wagons Loaded for {activeTrip?.id} ({activeTrip?.company || 'Industrial Consignee'})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {(activeTrip?.wagonLogs || []).length} Wagons Sealed
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Wagon ID</th>
                      <th className="p-3">Loaded Time</th>
                      <th className="p-3">Applied Seal #</th>
                      <th className="p-3">Volume Loaded</th>
                      <th className="p-3">Feeder Truck</th>
                      <th className="p-3">Supervisor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(activeTrip?.wagonLogs || [
                      { wagonId: 'PXG 2322', loadedAt: '08:10 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-BN-9801', feederTruckNo: 'TRK-KJA-981-XP', cargoOfficerName: 'Ade Bello' },
                      { wagonId: 'PXG 2323', loadedAt: '08:25 AM', bagsCount: '70 Bags', sealNumber: 'SEAL-BN-9802', feederTruckNo: 'TRK-KJA-982-XP', cargoOfficerName: 'Ade Bello' },
                    ]).map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                        <td className="p-3 text-slate-600">{w.loadedAt}</td>
                        <td className="p-3 font-bold text-slate-900">{w.sealNumber}</td>
                        <td className="p-3 font-extrabold text-emerald-700">{w.bagsCount}</td>
                        <td className="p-3 font-sans text-slate-600">{w.feederTruckNo || 'Siding Direct'}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{w.cargoOfficerName || user?.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: DESTINATION YARD UNLOADING & SEAL AUDIT ─── */}
        {activeTab === 'unloading' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* UNLOADING FORM */}
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

                <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="sealCheck"
                    checked={unloadingForm.sealVerified}
                    onChange={(e) => setUnloadingForm({ ...unloadingForm, sealVerified: e.target.checked })}
                    className="w-4 h-4 text-[#62BC37] rounded"
                  />
                  <label htmlFor="sealCheck" className="text-xs font-extrabold text-slate-800">
                    ✓ Security Seal Intact & Unbroken Before Cutting
                  </label>
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

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Discharge Siding Bay / Offloading Destination</label>
                  <select
                    value={unloadingForm.sidingBay}
                    onChange={(e) => setUnloadingForm({ ...unloadingForm, sidingBay: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="Warehouse Siding Bay #4">Moniya Warehouse Siding Bay #4</option>
                    <option value="Warehouse Siding Bay #2">Moniya Warehouse Siding Bay #2</option>
                    <option value="Feeder Truck Direct Offloading">Feeder Truck Direct Offloading</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Cargo Condition Remarks</label>
                  <textarea
                    rows={2}
                    value={unloadingForm.remarks}
                    onChange={(e) => setUnloadingForm({ ...unloadingForm, remarks: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Clear Wagon Unloading & Lock Tally Audit
                </button>
              </form>
            </div>

            {/* LIVE DESTINATION UNLOADING DISCHARGE TABLE */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Destination Discharge Audit Ledger</span>
                  <h3 className="text-base font-black text-slate-900">
                    Unloaded Wagons for {activeTrip?.id} ({activeTrip?.destination || 'MNY'})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700">Moniya Yard Command</span>
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
                      <th className="p-3">Clearance Bay</th>
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
                        <td className="p-3 font-sans text-slate-700 font-bold">{w.sidingBay || 'Moniya Yard Bay #4'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: ROLLING STOCK WAGON REGISTRY (NO HARDCODED BAGS) ─── */}
        {activeTab === 'wagons' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* NEW WAGON REGISTRATION FORM */}
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
                    placeholder="e.g. GND 4405 or FLT 9012"
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
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Payload Capacity (Metric Tonnes / TEU / Liters) *</label>
                  <input
                    required
                    value={newWagonForm.payloadCapacity}
                    onChange={(e) => setNewWagonForm({ ...newWagonForm, payloadCapacity: e.target.value })}
                    placeholder="e.g. 70 MT or 2 TEU Containers"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Assigned Siding Station</label>
                    <select
                      value={newWagonForm.currentStation}
                      onChange={(e) => setNewWagonForm({ ...newWagonForm, currentStation: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="EWK">Ewekoro Terminal</option>
                      <option value="MNY">Moniya Yard (Ibadan)</option>
                      <option value="APT">Apapa Maritime Port</option>
                      <option value="PAPA">Papalanto Terminal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Track Gauge Standard</label>
                    <select
                      value={newWagonForm.gauge}
                      onChange={(e) => setNewWagonForm({ ...newWagonForm, gauge: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="STANDARD_GAUGE">Standard Gauge (1,435mm)</option>
                      <option value="NARROW_GAUGE">Narrow Gauge (1,067mm)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Register Wagon into Central Rolling Stock Repository
                </button>
              </form>
            </div>

            {/* ROLLING STOCK WAGON DIRECTORY */}
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
                      <th className="p-3">Wagon Specification Type</th>
                      <th className="p-3">Payload Capacity</th>
                      <th className="p-3">Siding Station</th>
                      <th className="p-3">Gauge Standard</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {wagons.map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.id}</td>
                        <td className="p-3 font-sans font-bold text-slate-900">{w.wagonType || 'Covered Hopper'}</td>
                        <td className="p-3 font-bold text-emerald-700">{w.payloadCapacity || `${w.capacity || 60} MT`}</td>
                        <td className="p-3 font-sans text-slate-700">{w.currentStation || 'EWK'}</td>
                        <td className="p-3 text-[10px] text-slate-500">{w.gauge || 'STANDARD_GAUGE'}</td>
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

        {/* ─── TAB 4: SHIFT LEDGER & PRINTABLE SHIFT TALLY REPORT ─── */}
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
                    <span className="font-bold text-blue-900 text-sm">{t.id} • {t.company}</span>
                    <span className="text-slate-500 font-mono text-[10px]">Dispatch: {t.dispatchTime}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center bg-white p-3 rounded-xl border border-slate-200">
                    <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Payload</span><span className="font-bold text-slate-900">{t.quantity} {t.unitOfMeasure || 'Bags'}</span></div>
                    <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Origin Officer</span><span className="font-sans font-bold text-slate-900">{t.cargoOfficerName || 'Ade Bello'}</span></div>
                    <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Unloading Officer</span><span className="font-sans font-bold text-slate-900">{t.unloadingOfficerName || 'Musa Ibrahim'}</span></div>
                    <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Transit Defects</span><span className="font-bold text-rose-600">{t.damages?.burstBags || 0}</span></div>
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
