'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

// ENTERPRISE COMMODITY & MEASUREMENT UNIT CONFIGURATION
export const COMMODITY_CONFIG: Record<string, { unit: string; wagonType: string; auditMetric: string }> = {
  'Bagged Cement (50kg)': { unit: 'Bags', wagonType: 'Covered Hopper Wagon', auditMetric: 'Burst Bags' },
  'Bulk Gypsum': { unit: 'Metric Tonnes (MT)', wagonType: 'Open Top Gondola Wagon', auditMetric: 'Transit Shrinkage (MT)' },
  'Limestone Raw Ore': { unit: 'Metric Tonnes (MT)', wagonType: 'Bottom Dumper Wagon', auditMetric: 'Spillage Loss (MT)' },
  'Clinker Bulk': { unit: 'Metric Tonnes (MT)', wagonType: 'Gondola Wagon', auditMetric: 'Weight Deviation (MT)' },
  'Shipping Containers (20ft/40ft)': { unit: 'Containers (TEU)', wagonType: 'Flatbed Container Wagon', auditMetric: 'Seal Integrity' },
  'AGO Diesel / Liquid Bulk': { unit: 'Liters (L)', wagonType: 'Tanker Wagon', auditMetric: 'Ullage Loss (L)' },
};

export function AdminPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'deals' | 'negotiations' | 'manifest' | 'billing' | 'users' | 'permissions'>('deals');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Dynamic Repository State
  const [trips, setTrips] = useState<any[]>([]);
  const [wagons, setWagons] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  // Active Selected Thread / Item
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [selectedInspectionDeal, setSelectedInspectionDeal] = useState<any | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);

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
  const [permissionsMatrix, setPermissionsMatrix] = useState<Record<string, string[]>>({
    ADMIN: ['trip.create', 'trip.dispatch', 'wagon.allocate', 'deal.negotiate', 'manifest.approve', 'financial.disburse', 'user.provision', 'report.export'],
    HEAD_OF_OPERATIONS: ['trip.create', 'trip.dispatch', 'wagon.allocate', 'deal.negotiate', 'manifest.approve', 'report.export'],
    CEO: ['financial.disburse', 'report.export', 'manifest.approve'],
    HEAD_OF_FINANCE: ['financial.disburse', 'report.export'],
    CARGO_OFFICER: ['manifest.approve', 'trip.dispatch'],
    CUSTOMER: ['report.export', 'deal.negotiate'],
  });

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
    setTrips(StateEngine.getTrips());
    setWagons(StateEngine.getWagons());
    setDeals(StateEngine.getDeals());
    setRequests(tryParse('bueno_client_requests', []));
    setNegotiations(tryParse('bueno_custom_deal_negotiations', []));
    setUsersList(StateEngine.getUsers());
    setNotifications(tryParse('bueno_notifications', []));

    const savedPerms = tryParse('bueno_permissions_matrix', null);
    if (savedPerms) setPermissionsMatrix(savedPerms);
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

  const saveNotifications = (updatedNotifs: any[]) => {
    setNotifications(updatedNotifs);
    localStorage.setItem('bueno_notifications', JSON.stringify(updatedNotifs));
  };

  const saveNegotiations = (updatedDeals: any[]) => {
    setNegotiations(updatedDeals);
    localStorage.setItem('bueno_custom_deal_negotiations', JSON.stringify(updatedDeals));
    window.dispatchEvent(new Event('bueno_state_updated'));
  };

  const currentCargoConfig = COMMODITY_CONFIG[newDealForm.cargoType] || { unit: 'Units', wagonType: 'General Wagon', auditMetric: 'Discrepancy' };

  const handleCreateNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedDealId = `DEAL-${Math.floor(80000 + Math.random() * 19999)}`;
    const quantityNum = Number(newDealForm.quantity) || 2000;

    const newDealObj = {
      id: generatedDealId,
      dealNumber: generatedDealId,
      company: newDealForm.companyName,
      companyName: newDealForm.companyName,
      loadingStation: newDealForm.loadingStation,
      destination: newDealForm.destination,
      cargoType: newDealForm.cargoType,
      unitOfMeasure: currentCargoConfig.unit,
      wagonType: currentCargoConfig.wagonType,
      quantity: quantityNum,
      targetDate: newDealForm.targetDate || new Date().toLocaleDateString('en-GB'),
      notes: newDealForm.notes,
      status: 'APPROVED',
      createdAt: new Date().toLocaleDateString('en-GB'),
    };

    const updatedDeals = [newDealObj, ...deals];
    StateEngine.saveDeals(updatedDeals);
    setDeals(updatedDeals);

    const autoThread = {
      id: generatedDealId,
      companyName: newDealForm.companyName,
      loadingStation: newDealForm.loadingStation,
      destination: newDealForm.destination,
      cargoType: newDealForm.cargoType,
      quantity: `${quantityNum} ${currentCargoConfig.unit}`,
      status: 'APPROVED',
      createdAt: new Date().toLocaleDateString('en-GB'),
      messages: [
        {
          sender: user?.fullName || 'Head of Operations',
          role: 'Head of Operations',
          text: `Freight Transport Deal Registered: ${newDealForm.cargoType} [${quantityNum} ${currentCargoConfig.unit}] via ${newDealForm.loadingStation} ➔ ${newDealForm.destination}. Assigned Wagon Type: ${currentCargoConfig.wagonType}. Notes: ${newDealForm.notes || 'N/A'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    saveNegotiations([autoThread, ...negotiations]);

    setNewDealForm({
      companyName: 'Purechem Cement Industries Ltd',
      loadingStation: 'EWK',
      destination: 'MNY',
      cargoType: 'Bagged Cement (50kg)',
      quantity: '2000',
      targetDate: '',
      notes: '',
    });

    setCustomAlert({
      title: 'Freight Deal Registered & Synced',
      message: `Deal ${generatedDealId} registered for ${newDealObj.company} [${quantityNum} ${currentCargoConfig.unit}]! Database & StateEngine synced.`,
    });
  };

  const handleAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeDealId) return;

    const newMsg = {
      sender: user?.fullName || 'Operations Command Desk',
      role: user?.roleLabel || user?.role || 'Head of Operations',
      text: replyInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = negotiations.map((d) =>
      d.id === activeDealId ? { ...d, messages: [...(d.messages || []), newMsg] } : d
    );

    saveNegotiations(updated);
    setReplyInput('');
  };

  const handleApproveDealAndAllocateWagons = (deal: any) => {
    const availableWagons = wagons.filter((w) => w.status === 'AVAILABLE');
    const allocatedWagons = availableWagons.slice(0, 3);
    const cargoConf = COMMODITY_CONFIG[deal.cargoType] || { unit: 'Bags', wagonType: 'Hopper Wagon' };

    const newTrip = {
      id: `TRP-${Date.now().toString().slice(-4)}`,
      tripId: `TRP-${Date.now().toString().slice(-4)}`,
      locomotiveId: 'L2205',
      origin: deal.loadingStation || 'EWK',
      destination: deal.destination || 'MNY',
      company: deal.companyName || deal.company || 'Industrial Consignee',
      dealNumber: deal.id || deal.dealNumber,
      cargoType: deal.cargoType,
      unitOfMeasure: cargoConf.unit,
      quantity: Number(deal.quantity) || 1610,
      cargoOfficerId: 'usr_1',
      cargoOfficerName: 'Ade Bello',
      cargoOfficerPhone: '08031112233',
      status: 'IN_TRANSIT',
      dispatchTime: new Date().toLocaleString(),
      wagonLogs: allocatedWagons.map((w, idx) => ({
        wagonId: w.id,
        status: 'LOADED',
        loadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bagsCount: cargoConf.unit.includes('Tonnes') ? '70 MT' : '70 Bags',
        sealNumber: `SEAL-BN-${9800 + idx}`,
      })),
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    };

    const updatedTrips = [newTrip, ...trips];
    StateEngine.saveTrips(updatedTrips);

    const updatedDeals = negotiations.map((d) =>
      d.id === deal.id
        ? {
            ...d,
            status: 'WAGONS_ALLOCATED',
            messages: [
              ...(d.messages || []),
              {
                sender: user?.fullName || 'Operations Command',
                role: 'Head of Operations',
                text: `Deal Approved! Allocated Locomotive #L2205 and ${allocatedWagons.length} ${cargoConf.wagonType}s. Dispatching corridor transport now.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          }
        : d
    );
    saveNegotiations(updatedDeals);

    setCustomAlert({
      title: 'Deal Approved & Wagons Allocated',
      message: `Corridor Trip ${newTrip.id} launched successfully for ${deal.companyName || deal.company}! Allocated ${allocatedWagons.length} ${cargoConf.wagonType}s.`,
    });
  };

  const handleUpdateUserProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updated = usersList.map((u) => (u.id === editingUser.id ? editingUser : u));
    StateEngine.saveUsers(updated);
    setUsersList(updated);
    setEditingUser(null);

    setCustomAlert({
      title: 'User Profile Updated',
      message: `Updated credentials and contact information for ${editingUser.fullName || editingUser.companyName} successfully!`,
    });
  };

  const handleProvisionNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `usr_${Date.now()}`;
    const generatedStaffId = provisionForm.userType === 'STAFF' ? `${provisionForm.assignedStation}-${Math.floor(100 + Math.random() * 900)}` : `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

    const newUser = {
      id: newId,
      fullName: provisionForm.fullName,
      email: provisionForm.email,
      phone: provisionForm.phone,
      role: provisionForm.role,
      userType: provisionForm.userType,
      assignedStation: provisionForm.assignedStation,
      companyName: provisionForm.userType === 'CUSTOMER' ? provisionForm.companyName || provisionForm.fullName : null,
      staffId: generatedStaffId,
      pin: provisionForm.pin || '1111',
      status: 'ACTIVE',
    };

    const updated = [newUser, ...usersList];
    StateEngine.saveUsers(updated);
    setUsersList(updated);

    try {
      await fetch('/api/send_mail.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newUser.email,
          fullName: newUser.fullName,
          staffId: newUser.staffId,
          pin: newUser.pin,
          role: newUser.role,
        }),
      });
    } catch {}

    setProvisionForm({ fullName: '', email: '', phone: '', userType: 'STAFF', role: 'CARGO_OFFICER', assignedStation: 'EWK', companyName: '', pin: '1111' });

    setCustomAlert({
      title: 'Account Provisioned Successfully',
      message: `Account created for ${newUser.fullName} [ID: ${newUser.staffId}]. Transactional email sent to ${newUser.email}.`,
    });
  };

  const handleTogglePermission = (role: string, permKey: string) => {
    const current = permissionsMatrix[role] || [];
    const updatedRolePerms = current.includes(permKey)
      ? current.filter((p) => p !== permKey)
      : [...current, permKey];

    const updatedMatrix = { ...permissionsMatrix, [role]: updatedRolePerms };
    setPermissionsMatrix(updatedMatrix);
    localStorage.setItem('bueno_permissions_matrix', JSON.stringify(updatedMatrix));
  };

  const customerUsers = usersList.filter((u) => u.userType === 'CUSTOMER' || u.role === 'CUSTOMER');
  const activeDeal = negotiations.find((n) => n.id === activeDealId) || negotiations[0];
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

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

      {/* ─── SINGLE-DEAL INSPECTION MODAL ─── */}
      {selectedInspectionDeal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full border border-slate-200 shadow-2xl space-y-5 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-lg">
                  B
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-blue-700 uppercase block">BUENO LOGISTICS • FREIGHT DEAL AGREEMENT</span>
                  <h3 className="text-lg font-black text-slate-900">{selectedInspectionDeal.dealNumber || selectedInspectionDeal.id}</h3>
                </div>
              </div>
              <button onClick={() => setSelectedInspectionDeal(null)} className="text-slate-400 hover:text-slate-900 font-extrabold text-base">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Industrial Consignee</span><span className="font-black text-slate-900">{selectedInspectionDeal.company || selectedInspectionDeal.companyName}</span></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Corridor Route</span><span className="font-bold text-slate-900">{selectedInspectionDeal.loadingStation || 'EWK'} ➔ {selectedInspectionDeal.destination || 'MNY'}</span></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Cargo Commodity</span><span className="font-bold text-slate-900">{selectedInspectionDeal.cargoType}</span></div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Volume ({selectedInspectionDeal.unitOfMeasure || 'Units'})</span>
                <span className="font-mono font-bold text-emerald-700">{selectedInspectionDeal.quantity} {selectedInspectionDeal.unitOfMeasure || 'Units'}</span>
              </div>
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Assigned Wagon Type</span><span className="font-mono font-bold text-blue-700">{selectedInspectionDeal.wagonType || 'Standard Freight Wagon'}</span></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Agreement Status</span><span className="font-mono font-bold text-blue-700">{selectedInspectionDeal.status || 'APPROVED'}</span></div>
            </div>

            {selectedInspectionDeal.notes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Contract Terms & Notes</span>
                <p className="text-slate-700 font-medium mt-0.5">{selectedInspectionDeal.notes}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
              >
                Print Deal Docket (PDF)
              </button>
              <button
                onClick={() => {
                  handleApproveDealAndAllocateWagons(selectedInspectionDeal);
                  setSelectedInspectionDeal(null);
                }}
                className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all"
              >
                Approve & Launch Corridor Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP HEADER ─── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black px-3 py-2 rounded-xl border border-slate-700 transition-all"
            >
              ☰ Command Menu
            </button>
            <div className="w-8 h-8 rounded-xl bg-[#62BC37] text-white flex items-center justify-center font-black text-base shadow-md">
              B
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-widest block">EXECUTIVE COMMAND HQ</span>
              <h1 className="text-sm font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                BUENO FREIGHT OS 360
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 relative transition-all"
            >
              <span className="text-xs font-bold font-mono">NOTIFICATIONS</span>
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-mono font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl z-50 p-4 space-y-3 font-sans">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <span className="text-xs font-black text-slate-900 uppercase">System Notification Log</span>
                  <button
                    onClick={() => saveNotifications(notifications.map((n) => ({ ...n, read: true })))}
                    className="text-[10px] text-emerald-700 font-bold hover:underline"
                  >
                    Mark All Read
                  </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className={`p-3 rounded-2xl border text-xs space-y-1 ${n.read ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/80 border-emerald-300'}`}>
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900">{n.title}</span>
                          <span className="text-[9px] font-mono text-slate-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{n.body}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs font-bold">No active notifications</div>
                  )}
                </div>
              </div>
            )}

            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-slate-200 block">{user?.fullName || 'Alhaji Bashir Umar'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.email || 'admin@bueno.ng'}</span>
            </div>

            <button
              onClick={onSignOut}
              className="bg-rose-600/90 hover:bg-rose-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── SLIDE-OVER SIDEBAR MENU DRAWER ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex">
          <div className="w-72 bg-slate-900 text-white p-5 space-y-6 flex flex-col justify-between border-r border-slate-800 shadow-2xl">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <span className="text-xs font-mono font-bold text-[#62BC37] uppercase">Command Navigation</span>
                <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                  ✕
                </button>
              </div>

              <nav className="space-y-1.5 font-sans">
                {[
                  { id: 'deals', label: 'Freight Deals Management' },
                  { id: 'telemetry', label: 'Fleet Telemetry & Corridor Status' },
                  { id: 'negotiations', label: 'Client Requisitions & Negotiations' },
                  { id: 'manifest', label: 'Cargo Manifests & Waybills' },
                  { id: 'billing', label: 'Commercial Financial Ledger' },
                  { id: 'users', label: 'User Directory & Account Provisioning' },
                  { id: 'permissions', label: 'Enterprise Permissions Matrix' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                      activeTab === t.id ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="text-[10px] text-slate-500 font-mono border-t border-slate-800 pt-3">
              BUENO FREIGHT OS • ENTERPRISE EDITION v3.5
            </div>
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ─── MAIN CONTENT AREA ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* TAB BUTTON STRIP */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm font-sans">
          {[
            { id: 'deals', label: 'Freight Deals', count: deals.length },
            { id: 'telemetry', label: 'Fleet Telemetry', count: trips.length },
            { id: 'negotiations', label: 'Requisitions & Negotiations', count: negotiations.length },
            { id: 'manifest', label: 'Cargo Manifests', count: trips.length },
            { id: 'billing', label: 'Financial Ledger', count: trips.length },
            { id: 'users', label: 'User Directory', count: usersList.length },
            { id: 'permissions', label: 'Permissions Matrix', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#62BC37] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-black ${
                  activeTab === tab.id ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ─── TAB 0: FREIGHT DEALS MANAGEMENT DESK (DYNAMIC MULTI-COMMODITY UNITS) ─── */}
        {activeTab === 'deals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* CREATE NEW DEAL FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Freight Transport Registration</span>
                <h3 className="text-base font-black text-slate-900">Register Freight Deal</h3>
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
                      placeholder={`Enter quantity in ${currentCargoConfig.unit}...`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Target Dispatch Date</label>
                    <input
                      type="date"
                      value={newDealForm.targetDate}
                      onChange={(e) => setNewDealForm({ ...newDealForm, targetDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[10px] space-y-0.5">
                  <span className="font-bold text-slate-500 uppercase block">Logistics Allocation Rule:</span>
                  <span className="font-extrabold text-blue-700 block">Wagon Type: {currentCargoConfig.wagonType}</span>
                  <span className="text-slate-600 block">Tally Audit Metric: {currentCargoConfig.auditMetric}</span>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Special Terms & Notes</label>
                  <textarea
                    rows={2}
                    value={newDealForm.notes}
                    onChange={(e) => setNewDealForm({ ...newDealForm, notes: e.target.value })}
                    placeholder="e.g. Weighbridge gross tare ticket required at Ewekoro siding..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Save Deal & Sync to Repository Database
                </button>
              </form>
            </div>

            {/* LIVE FREIGHT DEALS DIRECTORY */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Database Freight Ledger</span>
                  <h3 className="text-base font-black text-slate-900">Freight Deals Directory ({deals.length})</h3>
                </div>
              </div>

              <div className="space-y-3 max-h-[520px] overflow-y-auto">
                {deals.map((d) => {
                  const qty = Number(d.quantity) || 1610;
                  const unit = d.unitOfMeasure || (d.cargoType?.includes('Gypsum') || d.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                  const wagon = d.wagonType || (d.cargoType?.includes('Gypsum') ? 'Gondola Wagon' : 'Covered Hopper Wagon');

                  return (
                    <div key={d.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono font-bold text-blue-700 text-[10px] uppercase block">{d.dealNumber || d.id}</span>
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
                          onClick={() => setSelectedInspectionDeal({ ...d, unitOfMeasure: unit, wagonType: wagon })}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition-all"
                        >
                          View Deal Details
                        </button>
                        <button
                          onClick={() => handleApproveDealAndAllocateWagons(d)}
                          className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                        >
                          Launch Trip ➔
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 1: TELEMETRY ─── */}
        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-600 uppercase">{trip.id}</span>
                    <h3 className="text-base font-black text-slate-900">{trip.company || 'Industrial Consignee'}</h3>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-3 py-1 rounded-full uppercase">
                    {trip.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Locomotive</span><span className="font-mono font-bold text-slate-900">{trip.locomotiveId || 'L2205'}</span></div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Corridor</span><span className="font-bold text-slate-900">{trip.origin} ➔ {trip.destination}</span></div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Quantity</span><span className="font-mono font-bold text-emerald-700">{trip.quantity} {trip.unitOfMeasure || 'Bags'}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TAB 2: REQUISITIONS & NEGOTIATIONS INBOX ─── */}
        {activeTab === 'negotiations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* THREAD LIST */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Client Requisitions Inbox</h3>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">{negotiations.length} Active</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {negotiations.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => setActiveDealId(deal.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      activeDealId === deal.id ? 'bg-emerald-50/80 border-emerald-300 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-[#0E4B88]">{deal.id}</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded uppercase">{deal.status || 'PENDING'}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mt-1 truncate">{deal.companyName}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{deal.cargoType} • {deal.quantity}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE CONVERSATION & WAGON ALLOCATOR */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between min-h-[550px]">
              {activeDeal ? (
                <>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Requisition Docket: {activeDeal.id}</span>
                        <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {activeDeal.companyName}
                        </h3>
                      </div>

                      <button
                        onClick={() => handleApproveDealAndAllocateWagons(activeDeal)}
                        className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <span>✓ Accept Deal & Allocate Wagons</span>
                      </button>
                    </div>

                    {/* MESSAGES */}
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                      {(activeDeal.messages || []).map((msg: any, idx: number) => {
                        const isAdmin = !msg.role?.includes('Consignee') && !msg.sender.includes(activeDeal.companyName);
                        return (
                          <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 ${
                              isAdmin ? 'bg-slate-900 text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
                            }`}>
                              <div className="flex justify-between items-center gap-3 text-[9px] opacity-80 border-b border-white/10 pb-1">
                                <span className="font-bold">{msg.sender} ({msg.role || 'Client Lead'})</span>
                                <span className="font-mono">{msg.time}</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-line font-medium mt-1">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleAdminReply} className="pt-4 border-t border-slate-100 flex gap-2">
                    <input
                      value={replyInput}
                      onChange={(e) => setReplyInput(e.target.value)}
                      placeholder="Type a response to the industrial client freight desk..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                    />
                    <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all">
                      Dispatch Reply ➔
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center my-auto text-slate-400 text-xs font-bold">Select a requisition thread from the left</div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: MANIFESTS ─── */}
        {activeTab === 'manifest' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">NRC Official Consignment Manifests</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Terminal Waybills & Cargo Audits</h3>
              </div>
              <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all">
                Print Consolidated Freight Manifest
              </button>
            </div>

            <div className="space-y-4">
              {trips.map((t) => (
                <div key={t.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#0E4B88] uppercase">{t.id}</span>
                      <h4 className="text-sm font-black text-slate-900">{t.company || 'Industrial Consignee'}</h4>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-700">Dispatch: {t.dispatchTime}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-xs text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Loaded</span><span className="font-mono font-bold text-slate-900">{t.quantity} {t.unitOfMeasure || 'Bags'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Delivered Intact</span><span className="font-mono font-bold text-emerald-700">{t.quantity} {t.unitOfMeasure || 'Bags'}</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Discrepancy</span><span className="font-mono font-bold text-rose-600">0</span></div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Status</span><span className="font-extrabold text-emerald-700">✓ CLEARED</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: FINANCIAL LEDGER ─── */}
        {activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Freight Billing</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Executive Revenue & Freight Tariff Ledger</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">Standard Tariff Rate: ₦1,200 / Bag</span>
            </div>

            <div className="space-y-3">
              {trips.map((trip) => {
                const bags = trip.quantity || 1610;
                const total = bags * 1200;
                return (
                  <div key={trip.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-400 uppercase text-[10px]">INVOICE #{trip.id.replace('TRP-', 'INV-')}</span>
                      <h4 className="font-black text-slate-900">{trip.company || 'Industrial Consignee'}</h4>
                      <span className="text-slate-500 font-mono text-[10px]">{bags.toLocaleString()} {trip.unitOfMeasure || 'Bags'} • Corridor: {trip.origin} ➔ {trip.destination}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-slate-900 block text-sm">₦{total.toLocaleString()}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-mono font-bold px-2 py-0.5 rounded uppercase">DISBURSED & CONFIRMED</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 5: USER DIRECTORY, EDITING & STAFF PROVISIONING ─── */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* PROVISION NEW STAFF FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Account Provisioning Engine</span>
                <h3 className="text-base font-black text-slate-900">Provision Staff or Client Account</h3>
              </div>

              <form onSubmit={handleProvisionNewStaff} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name *</label>
                  <input
                    required
                    value={provisionForm.fullName}
                    onChange={(e) => setProvisionForm({ ...provisionForm, fullName: e.target.value })}
                    placeholder="e.g. Oluwaseun Davies"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Official Business Email *</label>
                  <input
                    required
                    type="email"
                    value={provisionForm.email}
                    onChange={(e) => setProvisionForm({ ...provisionForm, email: e.target.value })}
                    placeholder="e.g. seun.davies@bueno.ng"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Phone Number</label>
                    <input
                      value={provisionForm.phone}
                      onChange={(e) => setProvisionForm({ ...provisionForm, phone: e.target.value })}
                      placeholder="08030000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">User Classification</label>
                    <select
                      value={provisionForm.userType}
                      onChange={(e) => setProvisionForm({ ...provisionForm, userType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    >
                      <option value="STAFF">Internal Staff Account</option>
                      <option value="CUSTOMER">Industrial Client Account</option>
                    </select>
                  </div>
                </div>

                {provisionForm.userType === 'CUSTOMER' ? (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Company Registered Name *</label>
                    <input
                      required
                      value={provisionForm.companyName}
                      onChange={(e) => setProvisionForm({ ...provisionForm, companyName: e.target.value })}
                      placeholder="e.g. Purechem Cement Industries"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Role Designation</label>
                      <select
                        value={provisionForm.role}
                        onChange={(e) => setProvisionForm({ ...provisionForm, role: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                      >
                        <option value="CARGO_OFFICER">Cargo Officer</option>
                        <option value="HEAD_OF_OPERATIONS">Head of Operations</option>
                        <option value="HEAD_OF_FINANCE">Head of Finance</option>
                        <option value="CEO">Managing Director / CEO</option>
                        <option value="ADMIN">System Administrator</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Terminal Station</label>
                      <select
                        value={provisionForm.assignedStation}
                        onChange={(e) => setProvisionForm({ ...provisionForm, assignedStation: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-bold"
                      >
                        <option value="EWK">Ewekoro Terminal</option>
                        <option value="MNY">Moniya Yard (Ibadan)</option>
                        <option value="APT">Apapa Maritime Port</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Provision Account & Send Credentials Email
                </button>
              </form>
            </div>

            {/* LIVE USER DIRECTORY & PROFILE EDITING */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Central Account Directory</span>
                  <h3 className="text-base font-black text-slate-900">Active System Users ({usersList.length})</h3>
                </div>
              </div>

              {/* EDIT USER INLINE MODAL */}
              {editingUser && (
                <form onSubmit={handleUpdateUserProfile} className="bg-slate-900 text-white p-4 rounded-2xl space-y-3 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Editing User Profile: {editingUser.staffId || editingUser.id}</span>
                    <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white font-bold">✕ Cancel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase text-slate-400 font-bold mb-0.5">Full Name</label>
                      <input
                        value={editingUser.fullName || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1.5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-400 font-bold mb-0.5">Official Email</label>
                      <input
                        value={editingUser.email || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-400 font-bold mb-0.5">Phone Number</label>
                      <input
                        value={editingUser.phone || ''}
                        onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase text-slate-400 font-bold mb-0.5">Security PIN</label>
                      <input
                        value={editingUser.pin || '1111'}
                        onChange={(e) => setEditingUser({ ...editingUser, pin: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-emerald-400 rounded-lg px-2.5 py-1.5 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-2 rounded-xl transition-all">
                    ✓ Save Profile Changes & Sync System Wide
                  </button>
                </form>
              )}

              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {usersList.map((u) => (
                  <div key={u.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-600 text-[10px]">{u.staffId || u.id}</span>
                        <span className="font-black text-slate-900">{u.fullName || u.companyName}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{u.email} • {u.role || u.userType}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-700 text-[10px] bg-emerald-100 px-2 py-0.5 rounded">PIN: {u.pin || '1111'}</span>
                      <button
                        onClick={() => setEditingUser(u)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] px-3 py-1 rounded-xl transition-all"
                      >
                        Edit Profile
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 6: ENTERPRISE PERMISSIONS MATRIX (RBAC) ─── */}
        {activeTab === 'permissions' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Security & Governance</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Role-Based Access Control (RBAC) Matrix</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">6 System Roles Configured</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-mono">
                    <th className="p-3">Role Designation</th>
                    <th className="p-3">Trip Dispatch</th>
                    <th className="p-3">Wagon Allocation</th>
                    <th className="p-3">Deal Negotiation</th>
                    <th className="p-3">Manifest Approval</th>
                    <th className="p-3">Financial Disbursement</th>
                    <th className="p-3">User Provisioning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {['ADMIN', 'HEAD_OF_OPERATIONS', 'CEO', 'HEAD_OF_FINANCE', 'CARGO_OFFICER', 'CUSTOMER'].map((roleKey) => (
                    <tr key={roleKey} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-900 font-black">{roleKey}</td>
                      {['trip.dispatch', 'wagon.allocate', 'deal.negotiate', 'manifest.approve', 'financial.disburse', 'user.provision'].map((permKey) => {
                        const isGranted = (permissionsMatrix[roleKey] || []).includes(permKey);
                        return (
                          <td key={permKey} className="p-3">
                            <button
                              onClick={() => handleTogglePermission(roleKey, permKey)}
                              className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold transition-all ${
                                isGranted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-400 border border-slate-200'
                              }`}
                            >
                              {isGranted ? '✓ GRANTED' : '✕ DENIED'}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
