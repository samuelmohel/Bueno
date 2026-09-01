'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';

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
      company: 'Dangote Cement Industries',
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
      dealNumber: 'DEAL-JUN-602',
      cargoType: 'Bagged Cement (50kg)',
      unitOfMeasure: 'Bags',
      wagonType: 'Covered Hopper Wagon',
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

export function AdminPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'deals' | 'negotiations' | 'telemetry' | 'manifest' | 'billing' | 'users' | 'permissions'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true); // Open by default for easy navigation
  const [createDealModal, setCreateDealModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

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

  // Active Selected Thread & Search
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyInput, setReplyInput] = useState('');

  // Dynamic Freight Deal Form
  const [newDealForm, setNewDealForm] = useState({
    companyName: 'Purechem Cement Industries Ltd',
    loadingStation: 'EWK',
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
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, string[]>>(() => StateEngine.getPermissions());
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
    const liveTrips = StateEngine.getTrips();
    const liveWagons = StateEngine.getWagons();
    const liveDeals = StateEngine.getDeals();
    const liveUsers = StateEngine.getUsers();
    const liveReqs = tryParse('bueno_client_requests', []);
    const liveDealsNeg = tryParse('bueno_custom_deal_negotiations', []);
    const liveNotifs = tryParse('bueno_notifications', []);
    const livePerms = StateEngine.getPermissions();
    const liveSettings = StateEngine.getSettings();

    setTrips(liveTrips);
    setWagons(liveWagons);
    setDeals(liveDeals);
    setRequests(liveReqs);
    setUsersList(liveUsers);
    setNotifications(liveNotifs);
    setPermissionsMatrix(livePerms);
    setSystemSettings(liveSettings);

    // Update current month historical archives
    HISTORICAL_MONTHLY_ARCHIVES['2026-09'] = liveTrips;

    // Merge Requisitions into Client Negotiations Chat Threads
    let mergedThreads = [...liveDealsNeg];
    if (liveReqs.length > 0) {
      liveReqs.forEach((req: any) => {
        const exists = mergedThreads.some((d) => d.id === req.id || d.id === `DEAL-NEG-${req.id}`);
        if (!exists) {
          mergedThreads.unshift({
            id: `DEAL-NEG-${req.id || Date.now()}`,
            companyName: req.companyName || req.contactName || 'Industrial Consignee Client',
            email: req.email || '',
            contactName: req.contactName || 'Logistics Lead',
            loadingStation: req.route?.includes('EWK') ? 'EWK' : 'PAPA',
            destination: 'MNY',
            cargoType: req.product || 'Bagged Cement (50kg)',
            quantity: req.volume || '2,000 Bags',
            status: 'PENDING_REVIEW',
            createdAt: req.createdAt || 'Today',
            messages: [
              {
                sender: req.contactName || 'Consignee Client',
                role: 'Industrial Consignee',
                text: `Requisition Note Submitted: Requesting freight haulage for ${req.product || 'Cement'} [${req.volume || '2,000 Bags'}] via ${req.route || 'EWK ➔ MNY'}. Notes: ${req.notes || 'None'}`,
                time: req.createdAt || 'Today',
              },
            ],
          });
        }
      });
    }

    setNegotiations(mergedThreads);
    if (mergedThreads.length > 0 && !activeDealId) {
      setActiveDealId(mergedThreads[0].id);
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

  const saveNegotiations = (updatedThreads: any[]) => {
    setNegotiations(updatedThreads);
    localStorage.setItem('bueno_custom_deal_negotiations', JSON.stringify(updatedThreads));
    window.dispatchEvent(new Event('bueno_state_updated'));
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

    setCustomAlert({
      title: 'Negotiation Reply Delivered',
      message: `Your message has been delivered to ${activeThread.companyName}'s negotiation desk in real-time.`,
    });
  };

  // APPROVE DEAL & ALLOCATE WAGONS
  const handleApproveDealAndAllocateWagons = (dealItem: any) => {
    const qtyNum = Number(dealItem.quantity) || 1610;
    const unitLabel = dealItem.unitOfMeasure || (dealItem.cargoType?.includes('Gypsum') ? 'Metric Tonnes (MT)' : 'Bags');
    const wagonTypeLabel = dealItem.wagonType || (dealItem.cargoType?.includes('Gypsum') ? 'Open Top Gondola Wagon' : 'Covered Hopper Wagon');

    const newTrip = {
      id: `TRP-${Math.floor(1000 + Math.random() * 8999)}`,
      locomotiveId: 'L2205',
      origin: dealItem.loadingStation || 'EWK',
      destination: dealItem.destination || 'MNY',
      company: dealItem.companyName || dealItem.company,
      dealNumber: dealItem.id,
      cargoType: dealItem.cargoType,
      unitOfMeasure: unitLabel,
      wagonType: wagonTypeLabel,
      quantity: qtyNum,
      cargoOfficerName: 'Ade Bello',
      unloadingOfficerName: 'Musa Ibrahim',
      status: 'LOADING',
      dispatchTime: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }),
      wagonLogs: [
        { wagonId: 'PXG 2322', status: 'LOADED', loadedAt: 'Just now', bagsCount: `70 ${unitLabel}`, sealNumber: 'SEAL-BN-9801' },
        { wagonId: 'PXG 2323', status: 'LOADED', loadedAt: 'Just now', bagsCount: `70 ${unitLabel}`, sealNumber: 'SEAL-BN-9802' },
      ],
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    };

    StateEngine.saveTrips([newTrip, ...trips]);

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

  // CREATE NEW DEAL DIRECTLY
  const handleCreateNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
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
      createdAt: new Date().toLocaleDateString('en-GB'),
      createdBy: user?.fullName || 'Alhaji Bashir Umar',
    };

    StateEngine.saveDeals([newDealObj, ...deals]);
    setCreateDealModal(false);

    setCustomAlert({
      title: 'Commercial Freight Deal Registered',
      message: `Deal ${dealId} for ${newDealObj.company} created! Payload: ${newDealObj.quantity} ${conf.unit} via ${newDealObj.loadingStation} ➔ ${newDealObj.destination}.`,
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
    setEditingUser(null);

    setCustomAlert({
      title: 'User Account Updated',
      message: `Account for ${editingUser.fullName} (${editingUser.email}) updated successfully in database!`,
    });
  };

  // TOGGLE GRANULAR PERMISSION IN MATRIX
  const handleTogglePermission = (roleKey: string, permKey: string) => {
    const currentPerms = permissionsMatrix[roleKey] || [];
    const exists = currentPerms.includes(permKey);
    const updatedRolePerms = exists ? currentPerms.filter((p) => p !== permKey) : [...currentPerms, permKey];

    const updatedMatrix = { ...permissionsMatrix, [roleKey]: updatedRolePerms };
    setPermissionsMatrix(updatedMatrix);
    StateEngine.savePermissions(updatedMatrix);

    setCustomAlert({
      title: 'Permissions Matrix Updated',
      message: `Permission "${permKey}" for role ${roleKey} has been ${exists ? 'REVOKED' : 'GRANTED'} & synced!`,
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

  // HISTORICAL REPORT AUDIT DATA SELECTION
  const activeReportTrips = HISTORICAL_MONTHLY_ARCHIVES[selectedMonth] || trips;
  const totalReportBags = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure === 'Bags' ? t.quantity || 0 : 0), 0);
  const totalReportMT = activeReportTrips.reduce((acc, t) => acc + (t.unitOfMeasure?.includes('Tonnes') ? t.quantity || 0 : 0), 0);
  const totalReportDamages = activeReportTrips.reduce((acc, t) => acc + (t.damages?.damagedUnits || t.damages?.burstBags || 0), 0);
  const totalReportRevenue = activeReportTrips.reduce((acc, t) => {
    const q = t.quantity || 1600;
    const rate = t.unitOfMeasure?.includes('Tonnes') ? 24000 : 1200;
    return acc + q * rate;
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
                  <option value="Purechem Cement Industries Ltd">Purechem Cement Industries Ltd</option>
                  <option value="Dangote Cement Industries">Dangote Cement Industries</option>
                  <option value="BUA Cement Industries">BUA Cement Industries</option>
                  <option value="HUAXIN BUILDING MATERIALS PLC">HUAXIN BUILDING MATERIALS PLC</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Loading Station</label>
                  <select
                    value={newDealForm.loadingStation}
                    onChange={(e) => setNewDealForm({ ...newDealForm, loadingStation: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  >
                    <option value="EWK">Ewekoro Terminal (EWK)</option>
                    <option value="PAPA">Papalanto Terminal (PAPA)</option>
                    <option value="APT">Apapa Maritime Port (APT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Destination Yard</label>
                  <input readOnly value="Moniya Yard (MNY)" className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold" />
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

      {/* ─── HEADER (STRICT WHITE & BRAND GREEN PALETTE) ─── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black px-3.5 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
            >
              <span>{sidebarOpen ? 'Hide Menu ☰' : 'Command Menu ☰'}</span>
            </button>

            {/* BRAND LOGO: BRAND GREEN B ICON + BUENO LOGISTICS */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center font-black text-lg shadow-md font-mono">
                B
              </div>
              <div>
                <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">
                  EXECUTIVE COMMAND HQ
                </span>
                <h1 className="text-sm font-black tracking-wider text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  BUENO LOGISTICS
                </h1>
              </div>
            </div>
          </div>

          {/* SYNCED LOGGED IN USER DETAILS */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-extrabold text-white block">{user?.fullName || 'Alhaji Bashir Umar'}</span>
              <span className="text-[10px] font-mono text-[#62BC37] font-bold block">{user?.roleLabel || user?.role || 'Executive Command HQ'}</span>
            </div>

            <button
              onClick={onSignOut}
              className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all border border-slate-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── DYNAMIC LAYOUT WITH PURE WHITE LEFT SIDEBAR (CLEAN, SHARP, NO BLUR) ─── */}
      <div className="flex max-w-7xl mx-auto min-h-[calc(100vh-65px)]">
        {/* ─── PURE WHITE & BRAND GREEN LEFT SIDEBAR DRAWER ─── */}
        {sidebarOpen && (
          <aside className="w-72 bg-white text-slate-900 p-5 space-y-6 flex flex-col justify-between border-r border-slate-200 shrink-0 shadow-sm transition-all font-sans">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#62BC37] text-white flex items-center justify-center font-black text-xs font-mono">
                    B
                  </div>
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
                  { id: 'telemetry', label: 'Fleet Telemetry & Live GPS' },
                  { id: 'manifest', label: 'Cargo Manifests & Waybills' },
                  { id: 'billing', label: 'Commercial Invoices & Ledger' },
                  { id: 'users', label: 'User Directory & Account Provisioning' },
                  { id: 'permissions', label: 'Enterprise Permissions Matrix' },
                ].map((t) => (
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
            {/* HISTORICAL DATE BACK ARCHIVE FILTER BAR */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

            {/* ITEMIZED HISTORICAL CORRIDOR AUDIT TABLE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">HISTORICAL CONSIGNMENT LEDGER</span>
                  <h3 className="text-base font-black text-slate-900">
                    Archived Trips & Consignment Audits for {selectedMonth}
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                    <tr>
                      <th className="p-3">Trip ID</th>
                      <th className="p-3">Consignee Client</th>
                      <th className="p-3">Commodity & Unit</th>
                      <th className="p-3">Payload Volume</th>
                      <th className="p-3">Dispatch Date</th>
                      <th className="p-3">Defects / Burst Bags</th>
                      <th className="p-3">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeReportTrips.map((t, idx) => {
                      const qty = Number(t.quantity) || 1600;
                      const unit = t.unitOfMeasure || (t.cargoType?.includes('Gypsum') || t.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                      const damages = t.damages?.damagedUnits || t.damages?.burstBags || 0;

                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-amber-800">{t.id || t.tripId}</td>
                          <td className="p-3 font-bold font-sans text-slate-900">{t.company}</td>
                          <td className="p-3 font-sans font-bold text-slate-700">{t.cargoType || 'Bagged Cement'}</td>
                          <td className="p-3 font-extrabold text-emerald-700">{qty.toLocaleString()} {unit}</td>
                          <td className="p-3 text-slate-600">{t.dispatchTime || 'Today'}</td>
                          <td className="p-3 font-extrabold text-rose-600">{damages}</td>
                          <td className="p-3">
                            <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2.5 py-0.5 rounded uppercase">
                              {t.status || 'COMPLETED'}
                            </span>
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
                {deals.map((d) => {
                  const qty = Number(d.quantity) || 1610;
                  const unit = d.unitOfMeasure || (d.cargoType?.includes('Gypsum') || d.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                  const wagon = d.wagonType || (d.cargoType?.includes('Gypsum') ? 'Gondola Wagon' : 'Covered Hopper Wagon');

                  return (
                    <div key={d.id} className="p-5 rounded-3xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <div>
                          <span className="font-mono font-bold text-[#62BC37] text-[10px] uppercase block">{d.dealNumber || d.id}</span>
                          <h4 className="font-black text-slate-900 text-sm">{d.company || d.companyName}</h4>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-mono font-bold px-3 py-1 rounded-full text-[10px] uppercase">
                          {d.status || 'APPROVED'}
                        </span>
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
                })}
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

                    return (
                      <button
                        key={thread.id}
                        onClick={() => setActiveDealId(thread.id)}
                        className={`w-full text-left p-4 transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-emerald-50/80 border-l-4 border-[#62BC37]' : 'hover:bg-slate-100/80 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm font-mono">
                          {(thread.companyName || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <h4 className="text-xs font-black text-slate-900 truncate">{thread.companyName}</h4>
                            <span className="text-[9px] font-mono text-slate-400">{lastMsg?.time || thread.createdAt}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#62BC37] font-bold block">{thread.id}</span>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                            {lastMsg ? `${lastMsg.sender}: ${lastMsg.text}` : 'No messages yet'}
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
            <LiveGpsMap trip={trips.find((t) => t.status === 'IN_TRANSIT' || t.status === 'LOADING') || trips[0]} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {trips.map((trip) => (
                <div key={trip.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">{trip.id}</span>
                      <h3 className="text-base font-black text-slate-900">{trip.company || 'Industrial Consignee'}</h3>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase">
                      {trip.status}
                    </span>
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

        {/* ─── TAB 5: BILLING & LEDGER ─── */}
        {activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Freight Ledger</span>
              <h3 className="text-base font-black text-slate-900">Freight Billing & Disbursed Invoices</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {trips.map((t) => {
                const amount = (t.quantity || 1600) * (t.unitOfMeasure?.includes('Tonnes') ? 24000 : 1200);
                return (
                  <div key={t.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] uppercase">INV-{t.id}</span>
                      <h4 className="font-sans font-black text-slate-900 text-sm">{t.company}</h4>
                      <p className="text-slate-500 font-sans text-xs">{t.quantity} {t.unitOfMeasure || 'Bags'} Tariff</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 text-sm block">₦{amount.toLocaleString()}</span>
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase">DISBURSED</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* ─── TAB 7: EDITABLE PERMISSIONS MATRIX ─── */}
        {activeTab === 'permissions' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Spatie Access Control</span>
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Interactive & Editable Permissions Matrix
              </h3>
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

            {/* EDITABLE PERMISSIONS CHECKBOX MATRIX */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-mono font-bold text-[10px] uppercase border-b">
                  <tr>
                    <th className="p-3">Role Classification</th>
                    <th className="p-3 text-center">Trip Creation</th>
                    <th className="p-3 text-center">Wagon Allocation</th>
                    <th className="p-3 text-center">B2B Negotiations</th>
                    <th className="p-3 text-center">Financial Disbursements</th>
                    <th className="p-3 text-center">User Provisioning</th>
                    <th className="p-3 text-center">Report Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {[
                    { key: 'ADMIN', label: 'Admin Officer (ADMIN)' },
                    { key: 'HEAD_OF_OPERATIONS', label: 'Head of Operations' },
                    { key: 'CEO', label: 'Managing Director / CEO' },
                    { key: 'HEAD_OF_FINANCE', label: 'Head of Finance' },
                    { key: 'CARGO_OFFICER', label: 'Cargo Officer' },
                    { key: 'CUSTOMER', label: 'Industrial Consignee Client' },
                  ].map(({ key, label }) => {
                    const perms = permissionsMatrix[key] || [];

                    return (
                      <tr key={key} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-sans text-slate-900">{label}</td>
                        {[
                          { pKey: 'trip.create', pLabel: 'Create Trip' },
                          { pKey: 'wagon.allocate', pLabel: 'Wagons' },
                          { pKey: 'deal.negotiate', pLabel: 'Negotiate' },
                          { pKey: 'financial.disburse', pLabel: 'Finance' },
                          { pKey: 'user.provision', pLabel: 'Users' },
                          { pKey: 'report.export', pLabel: 'Reports' },
                        ].map(({ pKey }) => {
                          const isChecked = perms.includes(pKey);

                          return (
                            <td key={pKey} className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(key, pKey)}
                                className="w-4 h-4 text-[#62BC37] rounded focus:ring-[#62BC37] cursor-pointer"
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
          </div>
        )}
        </main>
      </div>
    </div>
  );
}
