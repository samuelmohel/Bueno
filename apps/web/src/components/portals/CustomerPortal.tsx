'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';
import { NotificationBell } from '@/components/NotificationBell';
import OfficialInvoiceModal from '@/components/OfficialInvoiceModal';

// COMMODITY CONFIG MATRIX FOR CLIENT PORTAL
export const COMMODITY_CONFIG: Record<string, { unit: string; wagonType: string }> = {
  'Bagged Cement (50kg)': { unit: 'Bags', wagonType: 'Covered Hopper Wagon' },
  'Bulk Gypsum': { unit: 'Metric Tonnes (MT)', wagonType: 'Open Top Gondola Wagon' },
  'Limestone Raw Ore': { unit: 'Metric Tonnes (MT)', wagonType: 'Bottom Dumper Wagon' },
  'Clinker Bulk': { unit: 'Metric Tonnes (MT)', wagonType: 'Gondola Wagon' },
  'Shipping Containers (20ft/40ft)': { unit: 'Containers (TEU)', wagonType: 'Flatbed Container Wagon' },
  'AGO Diesel / Liquid Bulk': { unit: 'Liters (L)', wagonType: 'Tanker Wagon' },
};

export function CustomerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'negotiations' | 'manifest' | 'billing' | 'account'>('negotiations');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<any | null>(null);
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);
  const [opsLeadName, setOpsLeadName] = useState('Head of Operations');

  const companyName = user?.companyName || user?.fullName || 'Industrial Consignee Client';
  const clientEmail = user?.email || '';

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
    const allUsers = StateEngine.getUsers();
    const opsUser = allUsers.find((u) => u.role === 'HEAD_OF_OPERATIONS');
    if (opsUser && opsUser.fullName) {
      setOpsLeadName(opsUser.fullName);
    }

    const allTrips = StateEngine.getTrips();
    const companyTrips = allTrips.filter(
      (t) =>
        (t.company && t.company.toLowerCase().includes(companyName.toLowerCase())) ||
        (t.companyName && t.companyName.toLowerCase().includes(companyName.toLowerCase())) ||
        (t.clientEmail && clientEmail && t.clientEmail.toLowerCase() === clientEmail.toLowerCase())
    );
    setTrips(companyTrips);

    const allInvoices = StateEngine.getInvoices();
    const companyInvoices = allInvoices.filter(
      (inv: any) =>
        (inv.companyName && (inv.companyName.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(inv.companyName.toLowerCase()))) ||
        (inv.clientEmail && clientEmail && inv.clientEmail.toLowerCase() === clientEmail.toLowerCase()) ||
        companyTrips.some((t: any) => t.id === inv.tripId || t.tripId === inv.tripId)
    );
    setInvoices(companyInvoices.length > 0 ? companyInvoices : allInvoices);

    const allReqs = tryParse('bueno_client_requests', []);
    const companyReqs = allReqs.filter(
      (r: any) =>
        (r.email && r.email.toLowerCase() === clientEmail.toLowerCase()) ||
        (r.companyName && r.companyName.toLowerCase().includes(companyName.toLowerCase()))
    );
    setClientRequests(companyReqs);

    const allDeals = tryParse('bueno_custom_deal_negotiations', []);
    const companyDeals = allDeals.filter(
      (d: any) =>
        (d.companyName && d.companyName.toLowerCase().includes(companyName.toLowerCase())) ||
        (d.email && d.email.toLowerCase() === clientEmail.toLowerCase())
    );

    if (companyDeals.length > 0) {
      setNegotiations(companyDeals);
      if (!activeDealId) setActiveDealId(companyDeals[0].id);
    } else if (companyReqs.length > 0) {
      const req = companyReqs[0];
      const autoDeal = {
        id: `DEAL-NEG-${req.id || Date.now()}`,
        companyName: companyName,
        email: clientEmail,
        contactName: req.contactName || user?.fullName || 'Logistics Desk',
        loadingStation: req.route?.includes('EWK') ? 'EWK' : 'PAPA',
        destination: 'MNY',
        cargoType: `${req.product || 'Cement'} (${req.volume || 'Bulk Haulage'})`,
        quantity: req.volume || '2,000 Bags',
        status: 'UNDER_OPERATIONS_REVIEW',
        createdAt: req.createdAt || 'Just now',
        messages: [
          {
            sender: req.contactName || user?.fullName || 'Logistics Lead',
            role: 'Industrial Consignee',
            text: `Requisition Note Submitted: Requesting freight haulage for ${req.product} [${req.volume}] via ${req.route}. Notes: ${req.notes || 'None'}`,
            time: req.createdAt || 'Just now',
          },
          {
            sender: opsUser?.fullName || 'Head of Operations',
            role: 'Head of Operations',
            text: `Welcome ${companyName}! Requisition #${req.id || 'REQ-2026'} is received at Operations Command. We are reviewing locomotive capacity and wagon siding availability at Ewekoro/Papalanto.`,
            time: 'System Auto-Response',
          },
        ],
      };
      setNegotiations([autoDeal]);
      setActiveDealId(autoDeal.id);
      localStorage.setItem('bueno_custom_deal_negotiations', JSON.stringify([autoDeal, ...allDeals]));
    } else {
      setNegotiations([]);
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
  }, [companyName, clientEmail]);

  // Tab Access Fallback if permission revoked
  useEffect(() => {
    const allowedTabs = [
      { id: 'negotiations' },
      { id: 'telemetry' },
      { id: 'manifest' },
      { id: 'billing' },
      { id: 'account' },
    ].filter((t) => StateEngine.canUserAccessTab(user, t.id)).map((t) => t.id);

    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0] as any);
    }
  }, [user, activeTab]);

  const saveNegotiations = (updatedCompanyDeals: any[]) => {
    setNegotiations(updatedCompanyDeals);
    const allDeals = tryParse('bueno_custom_deal_negotiations', []);
    const otherDeals = allDeals.filter(
      (d: any) =>
        !(
          (d.companyName && d.companyName.toLowerCase().includes(companyName.toLowerCase())) ||
          (d.email && d.email.toLowerCase() === clientEmail.toLowerCase())
        )
    );
    localStorage.setItem('bueno_custom_deal_negotiations', JSON.stringify([...updatedCompanyDeals, ...otherDeals]));
    window.dispatchEvent(new Event('bueno_state_updated'));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      sender: user?.fullName || `${companyName} Logistics Desk`,
      role: 'Industrial Consignee',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    let updatedDeals: any[] = [];
    if (activeDealId && negotiations.some((n) => n.id === activeDealId)) {
      updatedDeals = negotiations.map((d) =>
        d.id === activeDealId ? { ...d, email: clientEmail.toLowerCase(), messages: [...(d.messages || []), newMsg] } : d
      );
    } else {
      const threadId = `DEAL-NEG-${Date.now()}`;
      const newThread = {
        id: threadId,
        companyName: companyName,
        email: clientEmail.toLowerCase(),
        contactName: user?.fullName || companyName,
        loadingStation: 'EWK',
        destination: 'MNY',
        cargoType: 'Bagged Cement (50kg)',
        quantity: '2,000 Bags',
        status: 'IN_NEGOTIATION',
        createdAt: 'Today',
        messages: [newMsg],
      };
      updatedDeals = [newThread, ...negotiations];
      setActiveDealId(threadId);
    }

    saveNegotiations(updatedDeals);
    setChatInput('');
  };

  const activeDeal = negotiations.find((n) => n.id === activeDealId) || negotiations[0];
  const activeTrip = trips.find((t) => t.status === 'IN_TRANSIT' || t.status === 'LOADING') || trips[0];
  const latestReq = clientRequests[0];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 relative">
      {/* ─── DEDICATED PRINT STYLESHEET ─── */}
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

      {/* ─── HEADER (PURE WHITE & BRAND GREEN STICKY HEADER MATCHING MASTER HQ) ─── */}
      <header className="bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs font-sans">
        <div className="w-full px-4 sm:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black px-3.5 py-2 rounded-xl border border-slate-200 transition-all flex items-center gap-2"
            >
              <span>{sidebarOpen ? 'Hide Menu ☰' : 'Command Menu ☰'}</span>
            </button>

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
                INDUSTRIAL CONSIGNEE DESK — {companyName}
              </span>
              <h1 className="text-sm font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                BUENO LOGISTICS
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-pulse" />
              <span className="text-[10px] font-mono font-extrabold uppercase text-[#48A81B] tracking-wider">
                CORRIDOR LIVE
              </span>
            </div>

            <NotificationBell />

            <div className="hidden sm:block text-right font-sans">
              <span className="text-xs font-extrabold text-slate-900 block">{user?.fullName || companyName}</span>
              <span className="text-[10px] font-mono text-[#62BC37] font-bold block">{clientEmail || 'Consignee Client Desk'}</span>
            </div>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2 rounded-xl transition-all border border-slate-200"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── DYNAMIC LAYOUT WITH PINNED LEFT SIDEBAR (STANDARDIZED SHELL) ─── */}
      <div className="flex w-full min-h-[calc(100vh-65px)]">
        {/* PURE WHITE PINNED LEFT SIDEBAR */}
        {sidebarOpen && (
          <aside className="w-72 bg-white text-slate-900 p-5 space-y-6 flex flex-col justify-between border-r border-slate-200 shrink-0 shadow-sm font-sans sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto z-30">
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <img src="/bueno_logo.png" alt="Bueno" className="h-6 w-auto object-contain" />
                  <span className="text-xs font-mono font-extrabold text-[#62BC37] uppercase tracking-wider">CLIENT DESK</span>
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
                  { id: 'negotiations', label: 'Client Negotiations Chat' },
                  { id: 'telemetry', label: 'Fleet Telemetry & Live GPS' },
                  { id: 'manifest', label: 'Cargo Waybills & Consignment Records' },
                  { id: 'billing', label: 'Commercial Invoices & Ledger' },
                  { id: 'account', label: 'Corporate Account Settings' },
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

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 font-sans">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Verified Client</p>
                <p className="text-xs font-black text-slate-900 mt-0.5">{companyName}</p>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="w-full text-left text-xs font-extrabold text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all"
                >
                  Sign Out Account
                </button>
              )}
            </div>
          </aside>
        )}

        {/* MAIN CANVAS */}
        <main className="flex-1 p-6 space-y-6 min-w-0">

        {/* ─── B2B CONSIGNEE LIFECYCLE BANNER ─── */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-800 uppercase">
                  VERIFIED B2B CONSIGNEE
                </span>
                <span className="text-slate-400 text-xs font-mono">ID: {user?.staffId || 'CUST-2026'}</span>
              </div>
              <h2 className="text-xl font-black text-white mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Freight Corridor Operations Center — {companyName}
              </h2>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center gap-3">
              <div className="w-3 h-3 bg-[#62BC37] rounded-full animate-ping" />
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Operations Lead</span>
                <span className="font-extrabold text-slate-200">{opsLeadName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION BAR ─── */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm font-sans">
          {[
            { id: 'negotiations', label: 'Client Negotiations Chat', count: negotiations.length },
            { id: 'telemetry', label: 'Live Telemetry & GPS', count: trips.length },
            { id: 'manifest', label: 'Cargo Manifest & Tally Audits', count: trips.length },
            { id: 'billing', label: 'Freight Invoices & Ledger', count: trips.length },
            { id: 'account', label: 'Corporate Account Settings', count: null },
          ].filter((tab) => StateEngine.canUserAccessTab(user, tab.id)).map((tab) => (
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

        {/* ─── TAB 1: WHATSAPP-STYLE B2B CHAT DESK FOR CLIENT ─── */}
        {activeTab === 'negotiations' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] font-sans">
            
            {/* THREAD LIST SIDEBAR (4 COLS) */}
            <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="p-4 bg-white border-b border-slate-200 space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider block">YOUR FREIGHT REQUISITIONS</span>
                  <h3 className="text-sm font-black text-slate-900 font-sans">Active Corridor Conversations</h3>
                </div>

                <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                  {negotiations.map((deal) => {
                    const isSelected = activeDealId === deal.id;
                    const lastMsg = deal.messages && deal.messages.length > 0 ? deal.messages[deal.messages.length - 1] : null;

                    return (
                      <button
                        key={deal.id}
                        onClick={() => setActiveDealId(deal.id)}
                        className={`w-full text-left p-4 transition-all flex items-start gap-3 ${
                          isSelected ? 'bg-emerald-50/80 border-l-4 border-[#62BC37]' : 'hover:bg-slate-100/80 bg-white'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                          B
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className="text-[10px] font-mono font-bold text-[#62BC37]">{deal.id}</span>
                            <span className="text-[9px] font-mono text-slate-400">{lastMsg?.time || 'Today'}</span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 mt-0.5 truncate">{deal.cargoType}</h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                            {lastMsg ? lastMsg.text : 'Conversation active'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LIVE WHATSAPP CHAT CANVAS (8 COLS) */}
            <div className="lg:col-span-8 bg-slate-100/50 flex flex-col justify-between">
              {activeDeal ? (
                <>
                  {/* HEADER */}
                  <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shadow-sm">
                        B
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          Operations Command ({opsLeadName})
                        </h3>
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 font-mono">
                          <span className="w-2 h-2 bg-[#62BC37] rounded-full animate-ping inline-block" />
                          Online • Direct Corridor Communication Channel
                        </span>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">
                      {activeDeal.id}
                    </span>
                  </div>

                  {/* MESSAGES BODY */}
                  <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto font-sans">
                    {(activeDeal.messages || []).map((msg: any, idx: number) => {
                      const isMe = msg.role === 'Industrial Consignee' || msg.sender.includes(companyName);

                      return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 shadow-sm ${
                            isMe
                              ? 'bg-[#62BC37] text-white rounded-br-none'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                          }`}>
                            <div className="flex justify-between items-center gap-4 text-[9px] opacity-90 border-b border-black/10 pb-1">
                              <span className="font-extrabold">{msg.sender} ({msg.role || 'Ops Command'})</span>
                              <span className="font-mono">{msg.time}</span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-line font-medium text-xs mt-1">{msg.text}</p>
                            <div className="text-right text-[9px] font-mono opacity-80 pt-0.5">
                              {isMe ? '✓✓ Sent' : '✓ Received'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* INPUT */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Type a message to Operations Command (${opsLeadName})...`}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                    />
                    <button
                      type="submit"
                      className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all"
                    >
                      Send Message ➔
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center my-auto space-y-2 p-8">
                  <span className="text-xs font-mono text-slate-400 font-bold block">[ NO SELECTION ]</span>
                  <h3 className="text-base font-black text-slate-900">Select a Requisition to View Messages</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: LIVE TELEMETRY & GPS ─── */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <LiveGpsMap trip={activeTrip} />

            {trips.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-sans">
                {trips.map((trip) => {
                  const unit = trip.unitOfMeasure || (trip.cargoType?.includes('Gypsum') || trip.cargoType?.includes('Limestone') ? 'Metric Tonnes (MT)' : 'Bags');

                  return (
                    <div key={trip.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                      <div className="bg-slate-900 text-white p-5 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase block">{trip.id}</span>
                            <h3 className="text-base font-black text-slate-100">{trip.company || companyName}</h3>
                          </div>
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase font-mono">
                            {trip.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[9px] uppercase text-slate-400 font-bold block">Locomotive</span>
                            <span className="font-mono font-bold text-emerald-400">{trip.locomotiveId || 'L2205'}</span>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[9px] uppercase text-slate-400 font-bold block">Corridor</span>
                            <span className="font-bold text-slate-200">{trip.origin || 'EWK'} ➔ {trip.destination || 'MNY'}</span>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                            <span className="text-[9px] uppercase text-slate-400 font-bold block">Payload ({unit})</span>
                            <span className="font-mono font-bold text-[#62BC37]">{trip.quantity || 1610} {unit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 space-y-3 text-xs">
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Assigned Wagons & Security Seal Verification</span>
                          {(trip.wagonLogs || [
                            { wagonId: 'PXG 2322', status: 'LOADED', loadedAt: '08:10 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9801' },
                            { wagonId: 'PXG 2323', status: 'LOADED', loadedAt: '08:25 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9802' },
                          ]).map((w: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                              <span className="font-mono font-bold text-slate-900">{w.wagonId}</span>
                              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">{w.sealNumber}</span>
                              <span className="font-extrabold text-emerald-700">✓ Intact ({w.bagsCount || '70'} {unit})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4 font-sans">
                <div className="w-12 h-12 bg-emerald-50 text-[#62BC37] rounded-2xl flex items-center justify-center font-black text-xl mx-auto border border-emerald-200 font-mono">
                  GPS
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">No Active Corridor Haulage Trips Yet</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 font-medium">
                    Your account is active. Once Operations approves your requisition and allocates wagons, live satellite telemetry will stream here.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: CARGO MANIFEST ─── */}
        {activeTab === 'manifest' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Official Consignment Manifests</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Cargo Loading & Unloading Audits</h3>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {trips.map((t) => (
                <div key={t.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase">{t.id}</span>
                    <h4 className="font-sans font-black text-slate-900 text-sm">{t.company || companyName}</h4>
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

        {/* ─── TAB 4: FREIGHT INVOICES & SETTLEMENT ─── */}
        {activeTab === 'billing' && (() => {
          const clientGross = invoices.reduce((acc, inv) => acc + (Number(inv.subtotal) || 0), 0);
          const clientDamages = invoices.reduce((acc, inv) => acc + (Number(inv.damageDeduction) || 0), 0);
          const clientBurstBags = invoices.reduce((acc, inv) => acc + (Number(inv.damageUnits) || 0), 0);
          const clientNet = invoices.reduce((acc, inv) => acc + (Number(inv.totalAmount) || 0), 0);
          const clientPaid = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
          const clientBalance = invoices.reduce((acc, inv) => acc + (Number(inv.balance) || 0), 0);

          return (
            <div className="space-y-6 font-sans">
              {/* Header & Description */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">
                      Commercial Client Billing Desk
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase">
                      Verified Tax Invoices & Claims
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    Commercial Freight Invoices & Remittances
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Itemized tax invoices with automated transit burst-bag indemnity deductions and official audited PDF printouts.
                  </p>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Gross Freight Billed</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                    ₦{clientGross.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">Total freight tariff</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-rose-600 block font-mono">Transit Damage Claims</span>
                    <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                      {clientBurstBags} Burst Bags
                    </span>
                  </div>
                  <p className="text-base sm:text-lg font-black text-rose-600 font-mono mt-0.5">
                    -₦{clientDamages.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-rose-500">Agreed indemnity deduction</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block font-mono">Net Payable Freight</span>
                  <p className="text-base sm:text-lg font-black text-emerald-700 font-mono mt-0.5">
                    ₦{clientNet.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    ₦{clientPaid.toLocaleString()} Remitted
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block font-mono">Outstanding Balance Due</span>
                  <p className={`text-base sm:text-lg font-black font-mono mt-0.5 ${clientBalance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    ₦{clientBalance.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {clientBalance <= 0 ? 'All invoices settled in full' : 'Net 14 settlement pending'}
                  </span>
                </div>
              </div>

              {/* Invoices List Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans space-y-4 p-6">
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Audited Tax Invoices</span>
                  <h4 className="text-base font-black text-slate-900">Heavy Rail Freight Commercial Invoices</h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-mono uppercase text-slate-400 bg-slate-50/50">
                        <th className="py-3 px-3">Invoice & Date</th>
                        <th className="py-3 px-3">Corridor Route</th>
                        <th className="py-3 px-3">Cargo Spec</th>
                        <th className="py-3 px-3 text-right">Gross Tariff</th>
                        <th className="py-3 px-3 text-right">Damage Claim</th>
                        <th className="py-3 px-3 text-right">Net Payable</th>
                        <th className="py-3 px-3 text-right">Amount Remitted</th>
                        <th className="py-3 px-3 text-right">Balance Due</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono divide-y divide-slate-100">
                      {invoices.map((inv: any) => {
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
                              <span className="font-sans font-bold text-slate-900 block">{inv.route}</span>
                              <span className="text-[10px] text-slate-400 font-sans">Standard Gauge Line</span>
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
                                    💥 {inv.damageUnits} Burst Bags Deducted
                                  </span>
                                </div>
                              ) : (
                                <span className="text-emerald-600 font-bold text-[10px]">✓ Zero Losses</span>
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
                              <button
                                onClick={() => setSelectedInvoiceForPrint(inv)}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                              >
                                View PDF 📄
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Wire Remittance Guidance Box */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 text-xs font-sans space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="text-base">🏦</span>
                  <h4 className="font-black text-slate-900">Bank Wire Remittance Instructions</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-slate-700">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Primary Corporate Bank</p>
                    <p className="font-bold text-slate-900 mt-1">Guaranty Trust Bank (GTBank) PLC</p>
                    <p>Account Name: <strong>Bueno Logistics Limited</strong></p>
                    <p>Account Number: <strong className="text-emerald-700 text-sm">0882190341</strong></p>
                    <p>Sort Code: 058-152062</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Alternate Corporate Bank</p>
                    <p className="font-bold text-slate-900 mt-1">Zenith Bank PLC</p>
                    <p>Account Name: <strong>Bueno Logistics Limited</strong></p>
                    <p>Account Number: <strong className="text-emerald-700 text-sm">1229044810</strong></p>
                    <p>Branch: Commercial Freight Division</p>
                  </div>
                </div>
                <p className="text-slate-500 text-[11px]">
                  📌 <strong>Important Remittance Note:</strong> Please include your Invoice Number in the payment transfer narration to ensure immediate automated reconciliation by the Bueno Treasury desk.
                </p>
              </div>
            </div>
          );
        })()}

        {/* ─── TAB 5: ACCOUNT SETTINGS ─── */}
        {activeTab === 'account' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Corporate Desk Settings</span>
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Account Credentials</h3>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Company Registered Name</label>
                <input readOnly value={companyName} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Logistics Contact Lead</label>
                  <input readOnly value={user?.fullName || 'Freight Manager'} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Official Business Email</label>
                  <input readOnly value={user?.email || clientEmail} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-900" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* ─── OFFICIAL PRINTABLE FREIGHT INVOICE MODAL ─── */}
      {selectedInvoiceForPrint && (
        <OfficialInvoiceModal
          invoice={selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}
    </div>
  );
}
