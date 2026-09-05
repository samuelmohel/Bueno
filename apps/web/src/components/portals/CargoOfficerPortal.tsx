'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';
import { MoniyaContainerView } from '@/components/MoniyaContainerView';
import { TerminalInformationView } from '@/components/TerminalInformationView';

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
  const [activeTab, setActiveTab] = useState<'loading' | 'dispatch' | 'unloading' | 'requisitions' | 'wagons' | 'history' | 'moniya' | 'terminal_info'>('loading');
  const [trips, setTrips] = useState<any[]>([]);
  const [wagons, setWagons] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // TRIP CREATION FROM DEALS STATE
  const [createTripModalDeal, setCreateTripModalDeal] = useState<any | null>(null);
  const [tripForm, setTripForm] = useState({
    locomotiveId: 'L2205',
    wagonId1: 'PXG 2322',
    wagonId2: 'PXG 2323',
    weighbridgeGrossMt: '80.5',
    seal1: 'SEAL-BN-9801',
    seal2: 'SEAL-BN-9802',
    escortName: 'Inspector Segun Alabi',
    badgeId: 'NRC-ESC-2026-08',
  });

  // DISPATCH ESCORT MODAL STATE
  const [dispatchModalTrip, setDispatchModalTrip] = useState<any | null>(null);
  const [escortForm, setEscortForm] = useState({
    officerName: 'Inspector Segun Alabi',
    officerPhone: '+234 803 777 9900',
    badgeId: 'NRC-ESC-2026-08',
    sendSmsPing: true,
    clientEmail: '',
  });

  // ORIGIN SIDING LOADING FORM
  const [loadingForm, setLoadingForm] = useState({
    wagonId: 'PXG 2322',
    cargoType: 'Bagged Cement (50kg)',
    quantity: '70',
    sealNumber: 'SEAL-BN-9801',
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

  // FIELD FUND REQUISITION STATES
  const [requests, setRequests] = useState<any[]>(() => StateEngine.getRequests());
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundForm, setFundForm] = useState({
    title: '',
    category: 'Tarpaulin Covering & Lashing (₦350,000)',
    amount: '350000',
    tripNo: '',
    vesselNo: 'VSL-APMT-992',
    description: '',
  });
  const [selectedReqForChat, setSelectedReqForChat] = useState<any | null>(null);
  const [chatInput, setChatInput] = useState('');

  const station = user?.assignedStation || 'EWK';
  const isDestinationYard = station === 'MNY';

  const syncData = () => {
    const liveTrips = StateEngine.getTrips();
    setTrips(liveTrips);
    setWagons(StateEngine.getWagons());
    setDeals(StateEngine.getDeals());
    setRequests(StateEngine.getRequests());
    if (liveTrips.length > 0 && !selectedTripId) {
      setSelectedTripId(liveTrips[0].id);
    }
  };

  useEffect(() => {
    syncData();
    StateEngine.syncRemote();
    const interval = setInterval(() => {
      StateEngine.syncRemote();
      syncData();
    }, 5000);

    const handleUpdate = () => syncData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('bueno_state_updated', handleUpdate);
    window.addEventListener('bueno_permissions_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('bueno_state_updated', handleUpdate);
      window.removeEventListener('bueno_permissions_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (isDestinationYard) {
      setActiveTab('unloading');
    } else {
      setActiveTab('loading');
    }
  }, [isDestinationYard]);

  // Tab Access Fallback if permission revoked
  useEffect(() => {
    const availableTabs = [
      { id: 'loading' },
      { id: 'dispatch' },
      { id: 'unloading' },
      { id: 'requisitions' },
      { id: 'wagons' },
      { id: 'terminal_info' },
      { id: 'history' },
      { id: 'moniya' },
    ].filter((t) => StateEngine.canUserAccessTab(user, t.id)).map((t) => t.id);

    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0] as any);
    }
  }, [user, activeTab]);

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
      qty: quantityNum,
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

    const updatedTrips = trips.map((t: any) =>
      t.id === activeTrip.id ? { ...t, wagonLogs: updatedWagonLogs, status: 'LOADING' } : t
    );
    setTrips(updatedTrips);

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

  // 1B. CREATE TRIP FROM APPROVED COMMERCIAL DEAL
  const handleCreateTripFromDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTripModalDeal) return;

    const deal = createTripModalDeal;
    const dealCargoType = deal?.cargoType || 'Bagged Cement (50kg)';
    const unitLabel = COMMODITY_CONFIG[dealCargoType]?.unit || 'Bags';
    const wagonTypeLabel = COMMODITY_CONFIG[dealCargoType]?.wagonType || 'Covered Hopper Wagon';
    const newTripId = 'TRP-' + Math.floor(1000 + Math.random() * 8999);

    const newTrip = {
      id: newTripId,
      tripId: newTripId,
      locomotiveId: tripForm.locomotiveId || 'L2205',
      origin: deal.loadingStation || station || 'EWK',
      destination: deal.destination || 'MNY',
      company: deal.companyName || deal.company || 'Consignee Client',
      dealNumber: deal.dealNumber || deal.id,
      cargoType: dealCargoType,
      unitOfMeasure: unitLabel,
      wagonType: wagonTypeLabel,
      quantity: Number(deal.quantity) || 1600,
      cargoOfficerName: user?.fullName || 'Ade Bello',
      unloadingOfficerName: 'Musa Ibrahim',
      escortOfficerName: tripForm.escortName || 'Inspector Segun Alabi',
      escortBadgeId: tripForm.badgeId || 'NRC-ESC-2026-08',
      status: 'LOADING',
      dispatchTime: new Date().toLocaleString('en-GB'),
      wagonLogs: [],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    };

    StateEngine.saveTrips([newTrip, ...trips]);
    setTrips([newTrip, ...trips]);

    // Update Deal to TRIP_CREATED so it leaves the deals list
    const currentDeals = StateEngine.getDeals();
    const updatedDeals = currentDeals.map((d: any) =>
      d.id === deal.id || d.dealNumber === deal.id || d.id === deal.dealNumber
        ? { ...d, status: 'TRIP_CREATED', tripId: newTrip.id }
        : d
    );
    StateEngine.saveDeals(updatedDeals);
    setDeals(updatedDeals);

    setCreateTripModalDeal(null);
    setSelectedTripId(newTrip.id);
    setActiveTab('loading');

    setCustomAlert({
      title: 'Freight Trip Created & Waybill Issued',
      message: 'Trip #' + newTrip.id + ' created for ' + newTrip.company + ' at ' + newTrip.origin + ' Siding!',
    });
  };

  // 2. DISPATCH TRAIN WITH ON-BOARD ESCORT OFFICER & LIVE GPS TELEMETRY
  const handleConfirmDispatchWithEscort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalTrip) return;

    const departureTimeStr = new Date().toLocaleString('en-GB');
    const clientEmailToUse = (escortForm.clientEmail || dispatchModalTrip.clientEmail || '').trim();

    StateEngine.updateTrip(dispatchModalTrip.id, {
      status: 'IN_TRANSIT',
      monitoringOfficerName: escortForm.officerName,
      monitoringOfficerPhone: escortForm.officerPhone,
      escortPhone: escortForm.officerPhone,
      escortBadgeId: escortForm.badgeId,
      clientEmail: clientEmailToUse,
      dispatchTime: departureTimeStr,
      departedAt: departureTimeStr,
      speed: 68,
      progressPercent: 5,
    });

    // 1. Dispatch Live Departure Email to Client via PHP backend
    if (clientEmailToUse) {
      try {
        await fetch('/api/send_mail.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TRIP_DISPATCH',
            to: clientEmailToUse,
            companyName: dispatchModalTrip.company,
            tripId: dispatchModalTrip.tripId || dispatchModalTrip.id,
            locomotiveId: dispatchModalTrip.locomotiveId || 'L2205',
            origin: dispatchModalTrip.origin,
            destination: dispatchModalTrip.destination,
            cargoType: dispatchModalTrip.cargoType || 'Heavy Freight Consignment',
            quantity: `${dispatchModalTrip.quantity || 1600} ${dispatchModalTrip.unitOfMeasure || 'Bags'}`,
            wagonsCount: String(dispatchModalTrip.wagonLogs?.length || 14),
            escortWagonId: dispatchModalTrip.escortWagonId || 'BV 01 (Crew Escort Caboose)',
            escortOfficerName: escortForm.officerName,
            escortPhone: escortForm.officerPhone,
            trackingUrl: `https://360.specklessinnovations.com/tracking?tripId=${dispatchModalTrip.id}`,
          }),
        });
      } catch {}
    }

    // 2. Post Enterprise Departure Notification across all user portals
    const notifPayload = {
      id: `notif_${Date.now()}`,
      title: `Corridor Departure: Train #${dispatchModalTrip.id} En Route`,
      body: `Trip #${dispatchModalTrip.id} (${dispatchModalTrip.company}) departed ${dispatchModalTrip.origin} heading directly to ${dispatchModalTrip.destination}. Escort: ${escortForm.officerName} (${escortForm.officerPhone}). Live phone satellite GPS tracking activated.`,
      time: departureTimeStr,
      type: 'TRIP_DISPATCH',
      targetId: dispatchModalTrip.id,
      targetTab: 'telemetry',
      read: false,
    };

    try {
      const existingNotifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      localStorage.setItem('bueno_notifications', JSON.stringify([notifPayload, ...existingNotifs]));
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notifPayload),
      }).catch(() => {});
    } catch {}

    setDispatchModalTrip(null);
    setActiveTab('dispatch');

    setCustomAlert({
      title: 'Train Dispatched & Live GPS Activated',
      message: `Train #${dispatchModalTrip.id} is now en route! Escort ${escortForm.officerName} assigned. Departure notification sent to ${clientEmailToUse || 'client email'} and broadcasted across all user dashboards!`,
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
          unloadStatus: 'UNLOADED',
          unsealedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unloadingOfficerName: user?.fullName || 'Musa Ibrahim',
          unloadedIntact: `${intactNum} ${unitLabel}`,
          correctQty: intactNum,
          unloadedQty: intactNum,
          burstBags: discrepancyNum,
          damageQty: discrepancyNum,
          discrepancy: discrepancyNum,
          sidingBay: unloadingForm.sidingBay,
          sealVerified: unloadingForm.sealVerified,
          complaintNotes: unloadingForm.remarks || null,
        };
      }
      return w;
    });

    const updatedDamages = {
      damagedUnits: (activeTrip.damages?.damagedUnits || 0) + discrepancyNum,
      burstBags: (activeTrip.damages?.burstBags || 0) + discrepancyNum,
      complaintNotes: unloadingForm.remarks
        ? [...(Array.isArray(activeTrip.damages?.complaintNotes) ? activeTrip.damages.complaintNotes : [activeTrip.damages?.complaintNotes]).filter(Boolean), unloadingForm.remarks]
        : activeTrip.damages?.complaintNotes || [],
    };

    const allUnloaded = updatedWagonLogs.every((w: any) => w.status === 'UNLOADED' || w.unloadStatus === 'UNLOADED');
    const now = new Date();
    const completedTimestamp = `${now.toLocaleDateString('en-GB')}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    StateEngine.updateTrip(activeTrip.id, {
      wagonLogs: updatedWagonLogs,
      damages: updatedDamages,
      unloadingOfficerName: user?.fullName || 'Musa Ibrahim',
      status: allUnloaded ? 'COMPLETED' : 'IN_TRANSIT',
      completedAt: allUnloaded ? completedTimestamp : (activeTrip.completedAt || ''),
    });

    const updatedTrips = trips.map((t: any) =>
      t.id === activeTrip.id ? {
        ...t,
        wagonLogs: updatedWagonLogs,
        damages: updatedDamages,
        status: allUnloaded ? 'COMPLETED' : 'IN_TRANSIT',
        completedAt: allUnloaded ? completedTimestamp : t.completedAt
      } : t
    );
    setTrips(updatedTrips);

    if (allUnloaded) {
      try {
        const storedWagons = StateEngine.getWagons();
        const loadedWagonIds = new Set(updatedWagonLogs.map((w: any) => w.wagonId));
        const updatedWagons = storedWagons.map((w: any) => {
          if (loadedWagonIds.has(w.id)) {
            return { ...w, status: 'AVAILABLE', currentStation: activeTrip.destination || 'MNY' };
          }
          return w;
        });
        StateEngine.saveWagons(updatedWagons);
        setWagons(updatedWagons);
      } catch {}
    }

    setCustomAlert({
      title: 'Destination Unloading Audited',
      message: `Wagon ${unloadingForm.wagonId} unsealed & discharged at ${unloadingForm.sidingBay}! Intact: ${intactNum} ${unitLabel}, Discrepancies: ${discrepancyNum}.${allUnloaded ? ' Consignment 100% complete — train status updated to COMPLETED!' : ''}`,
    });
  };

  // 3B. FIELD FUND REQUISITION SUBMISSION HANDLER
  const handleCreateFundRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const reqAmount = parseFloat(fundForm.amount) || 0;
    const reqNo = `REQ-${Math.floor(1000 + Math.random() * 8999)}`;
    const newReq = {
      id: reqNo,
      requisitionNo: reqNo,
      title: fundForm.title || `${fundForm.category.split('(')[0].trim()} for ${station} Siding`,
      category: fundForm.category.split('(')[0].trim(),
      amount: reqAmount,
      requestedBy: `${user?.fullName || 'Ade Bello'} (Cargo Officer)`,
      officerName: user?.fullName || 'Ade Bello',
      officerId: user?.id || 'usr_1',
      station: station,
      tripNo: fundForm.tripNo || activeTrip?.id || 'TRIP-001',
      tripId: fundForm.tripNo || activeTrip?.id || 'TRIP-001',
      vesselNo: fundForm.vesselNo || 'VSL-APMT-992',
      stage: 'Admin',
      status: 'PENDING',
      description: fundForm.description || fundForm.title,
      date: new Date().toLocaleDateString('en-GB'),
      createdAt: new Date().toLocaleString('en-GB'),
      conversation: [{ sender: user?.fullName || 'Cargo Officer', role: 'Cargo Officer', msg: fundForm.description || 'Field siding requisition submitted for operations clearance.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }],
      paymentDetails: null,
    };

    StateEngine.createRequest(newReq);
    setRequests([newReq, ...requests]);
    setShowFundModal(false);
    setFundForm({ title: '', category: 'Tarpaulin Covering & Lashing (₦350,000)', amount: '350000', tripNo: '', vesselNo: 'VSL-APMT-992', description: '' });

    // Send real-time notification alert to Admin & Executive desks
    const notif = {
      id: `notif_${Date.now()}`,
      title: `Field Siding Requisition: ${newReq.requisitionNo}`,
      body: `${user?.fullName || 'Cargo Officer'} requested ₦${reqAmount.toLocaleString()} for ${newReq.title} at ${station} Terminal.`,
      time: 'Just now',
      type: 'EXPENSE_REQUEST',
      targetId: newReq.id,
      targetTab: 'fund_requisitions',
      read: false,
    };
    try {
      const existingNotifs = JSON.parse(localStorage.getItem('bueno_notifications') || '[]');
      localStorage.setItem('bueno_notifications', JSON.stringify([notif, ...existingNotifs]));
      fetch('/api/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notif),
      }).catch(() => {});
    } catch {}

    setCustomAlert({
      title: 'Field Requisition Submitted',
      message: `Requisition ${newReq.requisitionNo} for ₦${reqAmount.toLocaleString()} submitted! Forwarded through executive approval pipeline.`,
    });
  };

  const handleSendReqChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedReqForChat) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = { sender: user?.fullName || 'Cargo Officer', role: 'Cargo Officer', msg: chatInput.trim(), time: now };
    const updated = requests.map((r: any) =>
      r.id === selectedReqForChat.id ? { ...r, conversation: [...(r.conversation || []), newMsg] } : r
    );
    StateEngine.saveRequests(updated);
    setRequests(updated);
    setSelectedReqForChat({ ...selectedReqForChat, conversation: [...(selectedReqForChat.conversation || []), newMsg] });
    setChatInput('');
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
      message: 'Wagon ' + newWagonObj.id + ' registered at Station ' + newWagonObj.currentStation + '!',
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

              <div className="space-y-1 bg-blue-50/60 p-3 rounded-2xl border border-blue-200">
                <label className="block text-[10px] font-bold text-slate-800 uppercase">
                  📧 Client Departure Notification Email *
                </label>
                <input
                  required
                  type="email"
                  value={escortForm.clientEmail}
                  onChange={(e) => setEscortForm({ ...escortForm, clientEmail: e.target.value })}
                  placeholder="e.g. logistics@client.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900"
                />
                <p className="text-[10px] text-slate-500">
                  An official departure dispatch email with train consist details & real-time tracking link will be sent to the client immediately upon corridor departure.
                </p>
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

      {/* ─── DEDICATED PRINT STYLESHEET (STAGE 4 UNIVERSAL PDF EXPORT) ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
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
      ` }} />

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

      {/* ─── DYNAMIC LAYOUT WITH PINNED LEFT SIDEBAR (STAGE 2 STANDARDIZATION) ─── */}
      <div className="flex w-full min-h-[calc(100vh-65px)]">
        {/* PURE WHITE PINNED LEFT SIDEBAR */}
        <aside className="w-72 bg-white text-slate-900 p-5 space-y-6 flex flex-col justify-between border-r border-slate-200 shrink-0 shadow-sm font-sans sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <img src="/bueno_logo.png" alt="Bueno" className="h-6 w-auto object-contain" />
                <span className="text-xs font-mono font-extrabold text-[#62BC37] uppercase tracking-wider">CARGO OFFICER</span>
              </div>
            </div>

            <nav className="space-y-1.5 font-sans">
              {[
                { id: 'loading', label: 'Cargo Loading & Waybill Terminal' },
                { id: 'dispatch', label: 'Escort Officer Dispatch' },
                { id: 'unloading', label: 'Destination Yard Unloading Audit' },
                { id: 'terminal_info', label: 'Terminal Information Ledger (13-Col)' },
                { id: 'moniya', label: 'Moniya Container Terminal (MICT)' },
                { id: 'wagons', label: 'Wagon Fleet Inventory' },
                { id: 'requisitions', label: 'Field Fund Requisitions' },
                { id: 'history', label: 'Historical Inspection Audit' },
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

        {/* MAIN CANVAS */}
        <main className="flex-1 p-6 space-y-6 min-w-0">
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
            onClick={() => setActiveTab('terminal_info')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'terminal_info' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Terminal Information (STATION: ###)
          </button>

          <button
            onClick={() => setActiveTab('moniya')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
              activeTab === 'moniya' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Moniya Container Stacking (MICT)
          </button>

          <button
            onClick={() => setActiveTab('requisitions')}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all relative flex items-center gap-2 ${
              activeTab === 'requisitions' ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Field Fund Requisitions</span>
            {requests.filter((r: any) => r.status === 'PENDING').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
            )}
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
          <div className="space-y-6 font-sans">
            {/* ─── APPROVED DEALS QUEUE FOR TRIP CREATION ─── */}
            {deals.length > 0 && (
              <div className="bg-[#1E293B] text-white p-6 rounded-3xl shadow-lg border border-slate-700 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-widest block">
                      COMMERCIAL DISPATCH DESK QUEUE
                    </span>
                    <h3 className="text-base font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      Approved Deals Awaiting Freight Trip Creation ({deals.length} Commercial Deals)
                    </h3>
                  </div>
                  <span className="text-xs bg-[#62BC37]/20 text-[#62BC37] font-mono font-bold px-3 py-1 rounded-full border border-[#62BC37]/40">
                    ● Live Siding Pipeline
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deals.map((deal, idx) => (
                    <div key={idx} className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-2xl space-y-3 relative hover:border-[#62BC37] transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-amber-400 block">{deal.dealNumber || deal.id}</span>
                          <h4 className="text-xs font-black text-white">{deal.companyName || deal.company}</h4>
                        </div>
                        <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                          APPROVED
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-300 space-y-1 font-mono">
                        <p><span className="text-slate-400 font-sans">Cargo:</span> <span className="text-emerald-400 font-bold">{deal.cargoType}</span></p>
                        <p><span className="text-slate-400 font-sans">Volume:</span> <span className="text-white font-bold">{deal.quantity} Units</span></p>
                        <p><span className="text-slate-400 font-sans">Corridor:</span> <span className="text-amber-300 font-bold">{deal.loadingStation || 'EWK'} ➔ {deal.destination || 'MNY'}</span></p>
                      </div>

                      <button
                        onClick={() => setCreateTripModalDeal(deal)}
                        className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        ⚡ Create & Launch Freight Trip
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  onClick={() => {
                    setDispatchModalTrip(activeTrip);
                    setEscortForm((prev) => ({
                      ...prev,
                      clientEmail: activeTrip?.clientEmail || '',
                    }));
                  }}
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

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Discharge Siding Bay</label>
                  <input
                    type="text"
                    value={unloadingForm.sidingBay}
                    onChange={(e) => setUnloadingForm({ ...unloadingForm, sidingBay: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Audit Notes / Defect Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 1 burst bag noted during hopper discharge at Moniya Bay 2..."
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
                      <th className="p-3">Burst / Defects</th>
                      <th className="p-3">Siding Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(activeTrip?.wagonLogs || []).map((w: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-amber-800">{w.wagonId}</td>
                        <td className="p-3 text-slate-600">{w.unsealedAt || 'Awaiting Arrival'}</td>
                        <td className="p-3 font-bold text-slate-900">{w.sealNumber}</td>
                        <td className="p-3 font-extrabold text-emerald-700">{w.unloadedIntact || `${w.correctQty || w.qty || 70} ${w.unitOfMeasure || 'Bags'}`}</td>
                        <td className="p-3 font-extrabold text-rose-600">{w.burstBags || w.damageQty || w.discrepancy || 0}</td>
                        <td className="p-3 text-slate-500 font-sans max-w-xs truncate">{w.complaintNotes || w.sidingBay || 'Intact'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TRAIN PERFORMANCE & DELAY ANALYSIS (SPEC 05) */}
              <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3 mt-4">
                <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">
                      JOURNEY PERFORMANCE & DELAY AUDIT (PAGE 1 SPEC 05)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-black px-2.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                    STATUS: ON TIME (SCHEDULE ADHERENCE 98.4%)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 block">Lead Train Driver</span>
                    <span className="font-bold text-slate-200 truncate block">{activeTrip?.driverName || 'Engr. Babatunde Adeleke'}</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 block">Scheduled Transit</span>
                    <span className="font-bold text-slate-200">3 hrs 45 mins</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 block">Actual Transit</span>
                    <span className="font-bold text-emerald-400">3 hrs 52 mins</span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] uppercase text-slate-400 block">Delay Variance</span>
                    <span className="font-bold text-amber-400">+7 mins (Signal at Itori)</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Corridor Speed Average: <b>42 km/h</b> | Driver Score: <b>98.4%</b> | Arrival Alert Note automatically dispatched to Origin Siding, Operations Command, and Consignee.
                </p>
              </div>

              {/* DISCREPANCY & UNDERWRITER INVESTIGATION NOTICE (SPEC 06) */}
              {(activeTrip?.damages?.damagedUnits > 0 || Number(unloadingForm.discrepancyCount) > 0) && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl space-y-2 text-rose-950 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <div>
                      <span className="text-[10px] font-mono font-black text-rose-700 uppercase tracking-wider block">
                        INCIDENT & DISCREPANCY ESCALATION (PAGE 1 SPEC 06)
                      </span>
                      <h4 className="text-xs font-black text-rose-900">
                        Arrival Quantity Discrepancy Flagged for Underwriter & Stakeholder Investigation
                      </h4>
                    </div>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Discrepancy registered: <b>{(activeTrip?.damages?.damagedUnits || 0) + Number(unloadingForm.discrepancyCount)} {activeTrip?.unitOfMeasure || 'units'} damaged/burst</b>.
                    Formal incident report has been logged and sent for investigation involving:
                  </p>
                  <ul className="text-xs text-rose-900 font-bold list-disc list-inside space-y-0.5">
                    <li>Origin Loading Siding Supervisor ({activeTrip?.origin || 'EWK'})</li>
                    <li>Industrial Consignee Client Desk ({activeTrip?.company || 'HBM'})</li>
                    <li>Operations Command HQ (Bueno Logistics)</li>
                    <li>Lead Marine & Rail Freight Insurance Underwriter</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: MONIYA CONTAINER TERMINAL MANAGEMENT (PAGE 1 SPEC 08) ─── */}
        {activeTab === 'moniya' && (
          <div className="space-y-6">
            <MoniyaContainerView user={user} />
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

        {/* ─── TAB: TERMINAL INFORMATION (13-COLUMN EXCEL LEDGER) ─── */}
        {activeTab === 'terminal_info' && (
          <TerminalInformationView user={user} initialStation={user?.assignedStation || 'PAPA'} />
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

        {/* ─── TAB: FIELD FUND REQUISITIONS ─── */}
        {activeTab === 'requisitions' && (
          <div className="space-y-6 font-sans">
            {/* KPI STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Field Requisitions</span>
                <span className="text-2xl font-black text-slate-900">{requests.length}</span>
                <span className="text-[10px] text-slate-500 block font-sans">All Submissions</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-amber-500 font-bold uppercase block">Pending Clearance</span>
                <span className="text-2xl font-black text-amber-700">
                  {requests.filter((r: any) => r.status === 'PENDING' || r.stage === 'Admin' || r.stage === 'Head of Operations').length}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">Under Executive Review</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-blue-500 font-bold uppercase block">Executive Approved</span>
                <span className="text-2xl font-black text-blue-700">
                  {requests.filter((r: any) => r.status === 'APPROVED' || r.status === 'CEO_APPROVED' || r.stage === 'CEO' || r.stage === 'Accountant').length}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">In Finance Pipeline</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] text-emerald-500 font-bold uppercase block">Paid & Disbursed</span>
                <span className="text-2xl font-black text-emerald-700">
                  ₦{requests.filter((r: any) => r.status === 'DISBURSED' || r.stage === 'Paid').reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 block font-sans">Cleared to Field</span>
              </div>
            </div>

            {/* HEADER & ACTION BUTTON */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Siding Operating Expenses</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Field Fund Requisitions & Clearance Ledger — {user?.stationName || station} Terminal
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Request operations funds for tarpaulins, payloader AGO fuel, weighbridge calibration, or escort logistics.
                </p>
              </div>
              <button
                onClick={() => setShowFundModal(true)}
                className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <span>+ Request Siding Funds</span>
              </button>
            </div>

            {/* REQUISITIONS TABLE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">Req ID</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Title & Siding Purpose</th>
                      <th className="p-3">Requested Amount</th>
                      <th className="p-3">Corridor / Trip</th>
                      <th className="p-3">Approval Progression</th>
                      <th className="p-3">Status / Payment Ref</th>
                      <th className="p-3 text-right">Details & Q&A</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {requests.map((req: any, idx: number) => {
                      const isDisbursed = req.status === 'DISBURSED' || req.stage === 'Paid';
                      const isCeoApproved = req.status === 'CEO_APPROVED' || req.stage === 'Accountant';
                      const isOpsApproved = req.status === 'OPS_APPROVED' || req.stage === 'CEO';
                      const isApproved = isDisbursed || isCeoApproved || isOpsApproved || req.status === 'APPROVED';

                      const stages = [
                        { key: 'Admin', label: '1. Admin' },
                        { key: 'Head of Operations', label: '2. Ops Head' },
                        { key: 'CEO', label: '3. CEO' },
                        { key: 'Accountant', label: '4. Finance' },
                        { key: 'Paid', label: '5. Paid' },
                      ];
                      const currentStageIdx = stages.findIndex((s) => s.key === req.stage);

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-amber-800">{req.requisitionNo || req.id}</td>
                          <td className="p-3">
                            <span className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded border border-slate-200 font-sans font-bold">
                              {req.category || 'OPERATIONAL'}
                            </span>
                          </td>
                          <td className="p-3 font-sans font-bold text-slate-900 max-w-xs">{req.title || req.description}</td>
                          <td className="p-3 font-extrabold text-emerald-700 text-sm">
                            ₦{Number(req.amount || 0).toLocaleString()}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {req.tripNo || 'TRIP-001'}
                          </td>
                          <td className="p-3 font-sans">
                            <div className="flex items-center gap-1">
                              {stages.map((s, sIdx) => {
                                const active = sIdx === currentStageIdx;
                                const passed = currentStageIdx > -1 ? sIdx < currentStageIdx : isApproved;
                                return (
                                  <span
                                    key={s.key}
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                      active
                                        ? 'bg-[#62BC37] text-white'
                                        : passed
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-400'
                                    }`}
                                  >
                                    {s.label}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-3">
                            {isDisbursed ? (
                              <div>
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase block w-fit font-sans">
                                  ✓ PAID & DISBURSED
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                                  Ref: {req.paymentDetails?.ref || 'TRF-GTB-998120'}
                                </span>
                              </div>
                            ) : isApproved ? (
                              <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase font-sans">
                                IN FINANCE PIPELINE
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase font-sans">
                                AWAITING CLEARANCE
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedReqForChat(req)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all"
                            >
                              💬 Notes ({req.conversation?.length || 0})
                            </button>
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

        {/* ─── MODAL: CREATE & DISPATCH FREIGHT TRIP FROM DEAL ─── */}
        {createTripModalDeal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-slate-200 shadow-2xl space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-widest block">
                    OPERATIONAL DISPATCH TERMINAL
                  </span>
                  <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Create & Launch Freight Trip — {createTripModalDeal.companyName || createTripModalDeal.company}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Deal Ref: <span className="font-bold text-slate-900">{createTripModalDeal.dealNumber || createTripModalDeal.id}</span> • Corridor: <span className="font-bold text-amber-700">{createTripModalDeal.loadingStation || 'EWK'} ➔ {createTripModalDeal.destination || 'MNY'}</span>
                  </p>
                </div>
                <button
                  onClick={() => setCreateTripModalDeal(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-black border border-slate-200"
                >
                  ✕ Close
                </button>
              </div>

              <form onSubmit={handleCreateTripFromDeal} className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Locomotive ID *</label>
                    <input
                      required
                      value={tripForm.locomotiveId}
                      onChange={(e) => setTripForm({ ...tripForm, locomotiveId: e.target.value })}
                      placeholder="e.g. L2205"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Weighbridge Gross (MT) *</label>
                    <input
                      required
                      value={tripForm.weighbridgeGrossMt}
                      onChange={(e) => setTripForm({ ...tripForm, weighbridgeGrossMt: e.target.value })}
                      placeholder="e.g. 80.5"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Allocated Wagon #1 *</label>
                    <select
                      value={tripForm.wagonId1}
                      onChange={(e) => setTripForm({ ...tripForm, wagonId1: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    >
                      {wagons.map((w, idx) => (
                        <option key={idx} value={w.id}>{w.id} ({w.wagonType || 'Covered Hopper'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Security Seal #1 *</label>
                    <input
                      required
                      value={tripForm.seal1}
                      onChange={(e) => setTripForm({ ...tripForm, seal1: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-amber-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Allocated Wagon #2 *</label>
                    <select
                      value={tripForm.wagonId2}
                      onChange={(e) => setTripForm({ ...tripForm, wagonId2: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    >
                      {wagons.map((w, idx) => (
                        <option key={idx} value={w.id}>{w.id} ({w.wagonType || 'Covered Hopper'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Security Seal #2 *</label>
                    <input
                      required
                      value={tripForm.seal2}
                      onChange={(e) => setTripForm({ ...tripForm, seal2: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-amber-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Escort Officer Name</label>
                    <input
                      value={tripForm.escortName}
                      onChange={(e) => setTripForm({ ...tripForm, escortName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Badge / Phone Ping</label>
                    <input
                      value={tripForm.badgeId}
                      onChange={(e) => setTripForm({ ...tripForm, badgeId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateTripModalDeal(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold py-3 rounded-xl shadow-md transition-all"
                  >
                    ⚡ Launch Freight Trip & Issue Waybill
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ─── MODAL: FIELD FUND REQUISITION DISPATCH ─── */}
        {showFundModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-widest block">
                    FIELD SIDING REQUISITION DISPATCH
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Request Siding Operational Funds
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateFundRequest} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Select Expense Category *</label>
                  <select
                    value={fundForm.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let amt = fundForm.amount;
                      if (cat.includes('Tarpaulin')) amt = '350000';
                      else if (cat.includes('Payloader')) amt = '280000';
                      else if (cat.includes('Sanding')) amt = '120000';
                      else if (cat.includes('Escort')) amt = '180000';
                      else if (cat.includes('Weighbridge')) amt = '150000';
                      else if (cat.includes('Emergency')) amt = '250000';
                      setFundForm({ ...fundForm, category: cat, amount: amt });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="Tarpaulin Covering & Lashing (₦350,000)">Tarpaulin Covering & Lashing (₦350,000)</option>
                    <option value="Payloader Fuel & Operator Fee (₦280,000)">Payloader Fuel & Operator Fee (₦280,000)</option>
                    <option value="Locomotive Sanding & Shunting Fee (₦120,000)">Locomotive Sanding & Shunting Fee (₦120,000)</option>
                    <option value="Security & Escort Crew Logistics (₦180,000)">Security & Escort Crew Logistics (₦180,000)</option>
                    <option value="Siding Track Weed Clearance & Maintenance (₦95,000)">Siding Track Weed Clearance & Maintenance (₦95,000)</option>
                    <option value="Weighbridge Recalibration & Certification (₦150,000)">Weighbridge Recalibration & Certification (₦150,000)</option>
                    <option value="Emergency Mechanical Siding Repair (₦250,000)">Emergency Mechanical Siding Repair (₦250,000)</option>
                    <option value="Custom Operational Siding Expense">Custom Operational Siding Expense</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Requested Amount (₦) *</label>
                    <input
                      required
                      type="number"
                      value={fundForm.amount}
                      onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Related Trip Number</label>
                    <select
                      value={fundForm.tripNo || activeTrip?.id}
                      onChange={(e) => setFundForm({ ...fundForm, tripNo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    >
                      {trips.map((t) => (
                        <option key={t.id} value={t.id}>{t.id} ({t.origin} ➔ {t.destination})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Purpose / Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Purchase of 15 heavy-duty waterproof tarpaulins for rainy season"
                    value={fundForm.title}
                    onChange={(e) => setFundForm({ ...fundForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Operational Justification / Field Description</label>
                  <textarea
                    rows={3}
                    placeholder="Details on vendor, urgency, or siding location requirement..."
                    value={fundForm.description}
                    onChange={(e) => setFundForm({ ...fundForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium"
                  />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Terminal Dispatch Siding:</span>
                  <span className="font-mono font-bold text-[#62BC37]">{user?.stationName || station}</span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFundModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
                  >
                    ✓ Submit Requisition to Head Office
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── MODAL: REQUISITION NOTES & CONVERSATION ─── */}
        {selectedReqForChat && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">{selectedReqForChat.requisitionNo || selectedReqForChat.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedReqForChat.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">₦{Number(selectedReqForChat.amount).toLocaleString()} • Stage: <b className="text-slate-800">{selectedReqForChat.stage}</b></p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReqForChat(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {selectedReqForChat.paymentDetails && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 font-mono text-xs">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase block font-sans">Disbursed via GTBank</span>
                  <span className="font-black text-emerald-800 text-sm">Ref: {selectedReqForChat.paymentDetails.ref}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 font-sans">Date: {selectedReqForChat.paymentDetails.date || selectedReqForChat.paymentDetails.disbursedAt}</span>
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3 max-h-60 overflow-y-auto border border-slate-200 text-xs">
                {(!selectedReqForChat.conversation || selectedReqForChat.conversation.length === 0) ? (
                  <p className="text-center text-slate-400 py-3">No messages or questions logged yet.</p>
                ) : (
                  selectedReqForChat.conversation.map((m: any, idx: number) => (
                    <div key={idx} className={`p-3 rounded-xl border ${m.sender === user?.fullName ? 'bg-[#0E4B88] text-white ml-6 border-transparent' : 'bg-white text-slate-800 mr-6 border-slate-200'}`}>
                      <div className="flex justify-between items-center text-[10px] opacity-80 mb-1">
                        <span className="font-bold">{m.sender} ({m.role})</span>
                        <span className="font-mono">{m.time}</span>
                      </div>
                      <p className="leading-snug">{m.msg}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendReqChat} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type message or field update..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                />
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-4 py-2 rounded-xl"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
