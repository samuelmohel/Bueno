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

export function AdminPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'deals' | 'negotiations' | 'manifest' | 'billing' | 'users' | 'permissions'>('negotiations');
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

  // Active Selected Thread & Search
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

    setTrips(liveTrips);
    setWagons(liveWagons);
    setDeals(liveDeals);
    setRequests(liveReqs);
    setUsersList(liveUsers);
    setNotifications(liveNotifs);

    // Merge Requisitions into WhatsApp Chat Threads
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

  // SEND WHATSAPP-STYLE ADMIN REPLY
  const handleAdminReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeDealId) return;

    const activeThread = negotiations.find((n) => n.id === activeDealId);
    if (!activeThread) return;

    const newMsg = {
      sender: user?.fullName || 'Head of Operations',
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
      title: 'Reply Sent to Client',
      message: `Your message has been delivered to ${activeThread.companyName}'s WhatsApp desk in real-time.`,
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

    // Update thread status
    const updatedThreads = negotiations.map((d) =>
      d.id === dealItem.id
        ? {
            ...d,
            status: 'APPROVED_DISPATCHED',
            messages: [
              ...(d.messages || []),
              {
                sender: user?.fullName || 'Head of Operations',
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

    setCustomAlert({
      title: 'Commercial Freight Deal Registered',
      message: `Deal ${dealId} for ${newDealObj.company} created! Payload: ${newDealObj.quantity} ${conf.unit} via ${newDealObj.loadingStation} ➔ ${newDealObj.destination}.`,
    });

    setNewDealForm({
      companyName: 'Purechem Cement Industries Ltd',
      loadingStation: 'EWK',
      destination: 'MNY',
      cargoType: 'Bagged Cement (50kg)',
      quantity: '2000',
      targetDate: '',
      notes: '',
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
              className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER (WHITES & BRAND GREEN ONLY) ─── */}
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
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 px-3 rounded-xl border border-slate-700 relative transition-all text-xs font-bold font-mono"
            >
              NOTIFICATIONS
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#62BC37] text-white text-[9px] font-mono font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={onSignOut}
              className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all border border-slate-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── SIDEBAR DRAWER ─── */}
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
                  { id: 'negotiations', label: 'Client Negotiations (WhatsApp Chat)' },
                  { id: 'deals', label: 'Freight Deals Management' },
                  { id: 'telemetry', label: 'Fleet Telemetry & Corridor Status' },
                  { id: 'manifest', label: 'Cargo Manifests & Waybills' },
                  { id: 'billing', label: 'Commercial Financial Ledger' },
                  { id: 'users', label: 'User Directory & Account Provisioning' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id as any);
                      setSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-xl font-extrabold text-xs transition-all ${
                      activeTab === t.id ? 'bg-[#62BC37] text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ─── TAB NAVIGATION BAR ─── */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm font-sans">
          {[
            { id: 'negotiations', label: 'WhatsApp B2B Client Chat', count: negotiations.length },
            { id: 'deals', label: 'Commercial Deals Desk', count: deals.length },
            { id: 'telemetry', label: 'Live Telemetry & GPS', count: trips.length },
            { id: 'manifest', label: 'Cargo Manifest Audits', count: trips.length },
            { id: 'billing', label: 'Commercial Invoices & Ledger', count: trips.length },
            { id: 'users', label: 'User Directory', count: usersList.length },
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

        {/* ─── TAB 1: WHATSAPP-STYLE CLIENT NEGOTIATIONS & CHAT ─── */}
        {activeTab === 'negotiations' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px] font-sans">
            
            {/* LEFT SIDEBAR: CLIENT CHAT THREADS LIST (3.5 COLS) */}
            <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="p-4 bg-white border-b border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">WHATSAPP B2B CLIENT MESSAGING</span>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {negotiations.length} Live Desks
                    </span>
                  </div>

                  {/* SEARCH BAR */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search client, company or deal ID..."
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                  />
                </div>

                {/* CLIENT THREADS LIST */}
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {filteredThreads.length > 0 ? (
                    filteredThreads.map((thread) => {
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
                          <div className="w-10 h-10 rounded-full bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
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
                    })
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">No client conversations found.</div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-white border-t border-slate-200 text-center">
                <span className="text-[10px] font-mono text-slate-400 font-bold">NRC ENCRYPTED B2B MESSAGING GATEWAY</span>
              </div>
            </div>

            {/* RIGHT MAIN PANEL: ACTIVE WHATSAPP CHAT CONVERSATION VIEW (8.5 COLS) */}
            <div className="lg:col-span-8 bg-slate-100/50 flex flex-col justify-between">
              {activeThread ? (
                <>
                  {/* WHATSAPP CHAT HEADER */}
                  <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shadow-sm">
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

                  {/* WHATSAPP MESSAGES CANVAS */}
                  <div className="p-6 space-y-4 max-h-[450px] overflow-y-auto font-sans">
                    <div className="text-center my-2">
                      <span className="bg-white border border-slate-200 text-slate-500 font-mono text-[9px] font-bold px-3 py-1 rounded-full uppercase">
                        End-to-End Encrypted B2B Freight Channel
                      </span>
                    </div>

                    {(activeThread.messages || []).map((msg: any, idx: number) => {
                      const isAdmin = !msg.role?.includes('Consignee') && !msg.sender.includes(activeThread.companyName);

                      return (
                        <div key={idx} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 shadow-sm ${
                            isAdmin
                              ? 'bg-[#62BC37] text-white rounded-br-none'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                          }`}>
                            <div className="flex justify-between items-center gap-4 text-[9px] opacity-90 border-b border-black/10 pb-1">
                              <span className="font-extrabold">{msg.sender} ({msg.role || 'Client Lead'})</span>
                              <span className="font-mono">{msg.time}</span>
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

                  {/* WHATSAPP CHAT INPUT BAR */}
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

        {/* ─── TAB 2: COMMERCIAL DEALS DESK ─── */}
        {activeTab === 'deals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
            {/* REGISTER NEW DEAL FORM */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Logistics Registration</span>
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

                <button
                  type="submit"
                  className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all mt-2"
                >
                  ✓ Create & Register Freight Deal
                </button>
              </form>
            </div>

            {/* DEALS DIRECTORY */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Freight Directory</span>
                  <h3 className="text-base font-black text-slate-900">Active Deals & Contracts</h3>
                </div>
                <span className="text-xs font-mono font-bold text-[#62BC37] font-mono">{deals.length} Active Contracts</span>
              </div>

              <div className="space-y-3">
                {deals.map((d) => {
                  const qty = Number(d.quantity) || 1610;
                  const unit = d.unitOfMeasure || (d.cargoType?.includes('Gypsum') || d.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');
                  const wagon = d.wagonType || (d.cargoType?.includes('Gypsum') ? 'Gondola Wagon' : 'Covered Hopper Wagon');

                  return (
                    <div key={d.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                      <div className="flex justify-between items-center">
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

        {/* ─── TAB 3: TELEMETRY ─── */}
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

        {/* ─── TAB 4: MANIFESTS ─── */}
        {activeTab === 'manifest' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Official NRC Consignment Manifests</span>
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

        {/* ─── TAB 6: USERS ─── */}
        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">User Directory</span>
              <h3 className="text-base font-black text-slate-900">Provisioned Accounts</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-mono font-bold text-[10px] uppercase border-b">
                  <tr>
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Assigned Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {usersList.map((u, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-sans text-slate-900">{u.fullName}</td>
                      <td className="p-3 text-slate-600">{u.email}</td>
                      <td className="p-3 font-bold text-[#62BC37]">{u.role}</td>
                      <td className="p-3 text-slate-600">{u.assignedStation || 'EWK'}</td>
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
