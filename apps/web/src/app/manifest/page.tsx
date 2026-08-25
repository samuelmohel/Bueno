'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { bookingsApi, cargoItemsApi } from '@/lib/api';
import { Truck, CheckCircle, AlertTriangle, Clock, Plus, ShieldCheck, ChevronRight, Package, AlertCircle } from 'lucide-react';

export default function FieldManifestPage() {
  const [activeTab, setActiveTab] = useState<'LOADING' | 'UNLOADING'>('LOADING');
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Feeder Truck Modal State
  const [truckModal, setTruckModal] = useState<boolean>(false);
  const [selectedAllocationId, setSelectedAllocationId] = useState<string>('');
  const [truckForm, setTruckForm] = useState<{
    truckRegNo: string;
    driverName: string;
    driverPhone: string;
    transporterName: string;
    loadingSource: string;
    quantityLoaded: string;
    startTime: string;
    endTime: string;
  }>({
    truckRegNo: '',
    driverName: '',
    driverPhone: '',
    transporterName: '',
    loadingSource: 'Silo Bay 1',
    quantityLoaded: '1200',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
  });

  // Unload Audit Modal State
  const [unloadModal, setUnloadModal] = useState<boolean>(false);
  const [unloadAllocation, setUnloadAllocation] = useState<any>(null);
  const [unloadForm, setUnloadForm] = useState<{
    intactCount: string;
    damagedCount: string;
    burstBagCount: string;
    hasComplaint: boolean;
    complaintType: string;
    complaintDetails: string;
    startTime: string;
    endTime: string;
  }>({
    intactCount: '1200',
    damagedCount: '0',
    burstBagCount: '0',
    hasComplaint: false,
    complaintType: 'ROOF_LEAK',
    complaintDetails: '',
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
  });

  // Load Trips
  const loadTrips = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getAll({ limit: 50 });
      const all: any[] = res.data?.bookings || [];
      setBookings(all);

      // Auto-select first matching trip based on tab
      const filtered = all.filter((b) =>
        activeTab === 'LOADING'
          ? ['WAGON_ALLOCATED', 'CARGO_AT_TERMINAL', 'LOADING_IN_PROGRESS'].includes(b.bookingStatus)
          : ['ARRIVED_DESTINATION', 'UNLOADING', 'READY_FOR_COLLECTION', 'COMPLETED'].includes(b.bookingStatus),
      );

      if (filtered.length > 0) {
        setSelectedBookingId(filtered[0].id);
        await loadBookingDetails(filtered[0].id);
      } else if (all.length > 0) {
        setSelectedBookingId(all[0].id);
        await loadBookingDetails(all[0].id);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const loadBookingDetails = async (id: string) => {
    try {
      const res = await bookingsApi.getById(id);
      setSelectedBooking(res.data);
    } catch {}
  };

  useEffect(() => {
    loadTrips();
  }, [activeTab]);

  const handleSelectTrip = (id: string) => {
    setSelectedBookingId(id);
    loadBookingDetails(id);
  };

  // Submit Feeder Truck Log
  const handleSaveFeederTruck = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await cargoItemsApi.addFeederTruck(selectedAllocationId, {
        ...truckForm,
        quantityLoaded: Number(truckForm.quantityLoaded),
      });
      setSuccessMessage(`Feeder truck ${truckForm.truckRegNo.toUpperCase()} logged successfully!`);
      setTruckModal(false);
      setTruckForm({
        truckRegNo: '',
        driverName: '',
        driverPhone: '',
        transporterName: '',
        loadingSource: 'Silo Bay 1',
        quantityLoaded: '1200',
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date().toISOString().slice(0, 16),
      });
      await loadBookingDetails(selectedBookingId);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving feeder truck log');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Unload Audit
  const handleSaveUnloadAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await cargoItemsApi.submitUnloadAudit(unloadAllocation.id, {
        intactCount: Number(unloadForm.intactCount || 0),
        damagedCount: Number(unloadForm.damagedCount || 0),
        burstBagCount: Number(unloadForm.burstBagCount || 0),
        hasComplaint: unloadForm.hasComplaint,
        complaintType: unloadForm.hasComplaint ? unloadForm.complaintType : undefined,
        complaintDetails: unloadForm.hasComplaint ? unloadForm.complaintDetails : undefined,
        startTime: unloadForm.startTime,
        endTime: unloadForm.endTime,
      });
      setSuccessMessage('Wagon unload audit & discrepancy tally recorded successfully!');
      setUnloadModal(false);
      await loadBookingDetails(selectedBookingId);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving unload audit');
    } finally {
      setActionLoading(false);
    }
  };

  const relevantTrips = bookings.filter((b) =>
    activeTab === 'LOADING'
      ? ['WAGON_ALLOCATED', 'CARGO_AT_TERMINAL', 'LOADING_IN_PROGRESS'].includes(b.bookingStatus)
      : ['ARRIVED_DESTINATION', 'UNLOADING', 'READY_FOR_COLLECTION', 'COMPLETED'].includes(b.bookingStatus),
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold tracking-wide uppercase">
                Field Operations Console
              </span>
              <span className="text-xs text-gray-500 font-mono">Ewekoro ➔ Moniya Rail Corridor</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Rail Freight Cargo & Quality Manifest
            </h1>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start">
            <button
              onClick={() => setActiveTab('LOADING')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'LOADING'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck size={14} />
              Origin Loading Console
            </button>
            <button
              onClick={() => setActiveTab('UNLOADING')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'UNLOADING'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CheckCircle size={14} />
              Destination Unload & Tally
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle size={16} className="text-emerald-600" />
            {successMessage}
          </div>
        )}

        {loading ? (
          <PageLoader />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── Left Column: Active Trips Selector ── */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  {activeTab === 'LOADING' ? 'Active Loading Trains' : 'Arrived / Receiving Trains'}
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">({relevantTrips.length})</span>
              </div>

              {relevantTrips.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
                  No active trips in this stage.
                </div>
              ) : (
                relevantTrips.map((b) => {
                  const isSelected = b.id === selectedBookingId;
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectTrip(b.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? activeTab === 'LOADING'
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                            : 'bg-blue-50/70 border-blue-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs text-gray-900">
                          {b.trainNumber || b.bookingCode}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {b.bookingStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-gray-800 mt-1">{b.cargoType?.name || 'Cement'}</p>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 font-mono">
                        <span>{b.route?.originTerminal?.split(' ')[0]} ➔ {b.route?.destinationTerminal?.split(' ')[0]}</span>
                        <span className="font-bold text-gray-700">{b.wagonsRequired} Wagons</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Right Column: Interactive Wagon Consist & Manifest ── */}
            <div className="lg:col-span-8 space-y-6">
              {selectedBooking ? (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-6">
                  {/* Trip Summary Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <span className="text-[10px] font-mono font-extrabold text-gray-400 uppercase">Selected Consist Run</span>
                      <h2 className="text-lg font-black text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        {selectedBooking.trainNumber || selectedBooking.bookingCode} — {selectedBooking.route?.routeName}
                      </h2>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Consignee: <strong className="text-gray-900">{selectedBooking.customer?.fullName}</strong> • Target: {selectedBooking.cargoWeightTonnes} Tonnes ({selectedBooking.wagonsRequired} Wagons)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-extrabold text-emerald-600 uppercase block">Status</span>
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-full">
                        {selectedBooking.bookingStatus.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Wagon Allocations List */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                        Allocated Wagons Manifest ({selectedBooking.wagonAllocations?.length || 0})
                      </h3>
                      <span className="text-xs text-gray-500 font-mono">Capacity: 1,200 Bags (60t) / Wagon</span>
                    </div>

                    <div className="space-y-4">
                      {selectedBooking.wagonAllocations?.map((alloc: any, idx: number) => {
                        const totalLoaded = (alloc.cargoItems || []).reduce((acc: number, item: any) => acc + (item.loadedQty || 0), 0);
                        const totalUnloaded = (alloc.cargoItems || []).reduce((acc: number, item: any) => acc + (item.unloadedQty || 0), 0);
                        const hasAudit = !!alloc.unloadAudit;
                        const audit = alloc.unloadAudit;

                        return (
                          <div key={alloc.id} className="p-5 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 transition-all space-y-4">
                            {/* Wagon Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gray-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <span className="font-mono font-black text-sm text-gray-900">
                                    {alloc.wagon?.serialNumber}
                                  </span>
                                  <span className="text-xs text-gray-400 ml-2 font-medium">({alloc.wagon?.wagonType})</span>
                                </div>
                              </div>

                              {/* Progress Pill */}
                              <div className="flex items-center gap-2">
                                {activeTab === 'LOADING' ? (
                                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    Loaded: {totalLoaded.toLocaleString()} / 1,200 bags
                                  </span>
                                ) : (
                                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                                    Unloaded: {totalUnloaded.toLocaleString()} / {totalLoaded.toLocaleString()} bags
                                  </span>
                                )}

                                {activeTab === 'LOADING' && (
                                  <button
                                    onClick={() => {
                                      setSelectedAllocationId(alloc.id);
                                      setTruckModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                                  >
                                    <Plus size={13} />
                                    Log Feeder Truck
                                  </button>
                                )}

                                {activeTab === 'UNLOADING' && (
                                  <button
                                    onClick={() => {
                                      setUnloadAllocation(alloc);
                                      setUnloadForm({
                                        intactCount: audit ? String(audit.intactCount) : String(totalLoaded),
                                        damagedCount: audit ? String(audit.damagedCount) : '0',
                                        burstBagCount: audit ? String(audit.burstBagCount) : '0',
                                        hasComplaint: audit ? audit.hasComplaint : false,
                                        complaintType: audit?.complaintType || 'ROOF_LEAK',
                                        complaintDetails: audit?.complaintDetails || '',
                                        startTime: audit ? new Date(audit.startTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                                        endTime: audit?.endTime ? new Date(audit.endTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                                      });
                                      setUnloadModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                                  >
                                    <CheckCircle size={13} />
                                    {hasAudit ? 'Update Audit Tally' : 'Tally & Inspect Wagon'}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Feeder Trucks Logged on this Wagon */}
                            {alloc.feederTruckLogs && alloc.feederTruckLogs.length > 0 && (
                              <div className="space-y-2 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">
                                  Feeder Trucks Loaded into this Wagon ({alloc.feederTruckLogs.length})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {alloc.feederTruckLogs.map((truck: any) => (
                                    <div key={truck.id} className="bg-white p-2.5 rounded-lg border border-gray-200 text-xs space-y-1">
                                      <div className="flex items-center justify-between font-bold text-gray-900">
                                        <span className="font-mono text-emerald-700">{truck.truckRegNo}</span>
                                        <span className="font-mono">{truck.quantityLoaded.toLocaleString()} {truck.unit}</span>
                                      </div>
                                      <p className="text-[11px] text-gray-600 truncate">{truck.transporterName}</p>
                                      <p className="text-[10px] text-gray-400">Driver: {truck.driverName} ({truck.driverPhone})</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Destination Unload Audit Result Banner */}
                            {hasAudit && (
                              <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                                audit.burstBagCount > 0 || audit.hasComplaint
                                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                              }`}>
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1.5">
                                    {audit.burstBagCount > 0 || audit.hasComplaint ? <AlertTriangle size={15} className="text-amber-600" /> : <ShieldCheck size={15} className="text-emerald-600" />}
                                    Quality Audit Status: {audit.burstBagCount > 0 || audit.hasComplaint ? 'Discrepancy / Damage Flagged' : '100% Intact & Verified'}
                                  </span>
                                  <span className="font-mono text-[11px]">
                                    Intact: {audit.intactCount} • Burst Bags: {audit.burstBagCount} • Damaged: {audit.damagedCount}
                                  </span>
                                </div>

                                {audit.hasComplaint && (
                                  <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-[11px]">
                                    <strong>Wagon Issue Reported:</strong> {audit.complaintType?.replace(/_/g, ' ')} — {audit.complaintDetails}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-gray-400">
                  Select a train from the left column to view its loading & unloading manifest.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MODAL: Log Feeder Truck (Origin) ── */}
        <Modal open={truckModal} onClose={() => setTruckModal(false)} title="Log Feeder Truck Haulage">
          <form onSubmit={handleSaveFeederTruck} className="space-y-4 text-xs font-sans">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Truck Registration No.</label>
                <input
                  type="text"
                  placeholder="e.g. KTU-482-XA"
                  value={truckForm.truckRegNo}
                  onChange={(e) => setTruckForm({ ...truckForm, truckRegNo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono uppercase bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Transporter / Haulage Co.</label>
                <input
                  type="text"
                  placeholder="e.g. Danladi Haulage Ltd"
                  value={truckForm.transporterName}
                  onChange={(e) => setTruckForm({ ...truckForm, transporterName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Driver's Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunday Adeleke"
                  value={truckForm.driverName}
                  onChange={(e) => setTruckForm({ ...truckForm, driverName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Driver's Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 08031122334"
                  value={truckForm.driverPhone}
                  onChange={(e) => setTruckForm({ ...truckForm, driverPhone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono bg-slate-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Loading Source / Silo</label>
                <input
                  type="text"
                  placeholder="e.g. Silo Bay 3"
                  value={truckForm.loadingSource}
                  onChange={(e) => setTruckForm({ ...truckForm, loadingSource: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Quantity Loaded (Bags)</label>
                <input
                  type="number"
                  placeholder="1200"
                  value={truckForm.quantityLoaded}
                  onChange={(e) => setTruckForm({ ...truckForm, quantityLoaded: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold bg-slate-50 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Loading Start Time</label>
                <input
                  type="datetime-local"
                  value={truckForm.startTime}
                  onChange={(e) => setTruckForm({ ...truckForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Concluding Time</label>
                <input
                  type="datetime-local"
                  value={truckForm.endTime}
                  onChange={(e) => setTruckForm({ ...truckForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono bg-slate-50"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setTruckModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md"
              >
                {actionLoading ? 'Logging...' : 'Save Feeder Truck Entry ➔'}
              </button>
            </div>
          </form>
        </Modal>

        {/* ── MODAL: Unload Tally & Quality Audit (Destination) ── */}
        <Modal open={unloadModal} onClose={() => setUnloadModal(false)} title="Wagon Unload Tally & Quality Audit">
          <form onSubmit={handleSaveUnloadAudit} className="space-y-4 text-xs font-sans">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Wagon Serial</span>
              <p className="font-mono font-black text-sm text-slate-900">{unloadAllocation?.wagon?.serialNumber}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Intact Count</label>
                <input
                  type="number"
                  value={unloadForm.intactCount}
                  onChange={(e) => setUnloadForm({ ...unloadForm, intactCount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-emerald-700 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Burst Bags</label>
                <input
                  type="number"
                  value={unloadForm.burstBagCount}
                  onChange={(e) => setUnloadForm({ ...unloadForm, burstBagCount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-rose-700 bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Damaged Count</label>
                <input
                  type="number"
                  value={unloadForm.damagedCount}
                  onChange={(e) => setUnloadForm({ ...unloadForm, damagedCount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl font-mono font-bold text-amber-700 bg-white"
                  required
                />
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-extrabold text-gray-800">Any complaints / faults for this wagon?</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUnloadForm({ ...unloadForm, hasComplaint: false })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${!unloadForm.hasComplaint ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnloadForm({ ...unloadForm, hasComplaint: true })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${unloadForm.hasComplaint ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {unloadForm.hasComplaint && (
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Complaint Category</label>
                    <select
                      value={unloadForm.complaintType}
                      onChange={(e) => setUnloadForm({ ...unloadForm, complaintType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl font-bold bg-white"
                    >
                      <option value="ROOF_LEAK">Roof Leak / Water Penetration</option>
                      <option value="MECHANICAL">Mechanical / Brake / Coupling Fault</option>
                      <option value="SEAL_BROKEN">Security Seal Tampered / Broken</option>
                      <option value="DIRTY_INTERIOR">Contaminated / Dirty Floor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Issue Details & Description</label>
                    <textarea
                      rows={2}
                      placeholder="Describe what caused the burst bags or wagon damage..."
                      value={unloadForm.complaintDetails}
                      onChange={(e) => setUnloadForm({ ...unloadForm, complaintDetails: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setUnloadModal(false)}
                className="px-4 py-2 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl shadow-md"
              >
                {actionLoading ? 'Saving...' : 'Submit Audit & Tally ➔'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
