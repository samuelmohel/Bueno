'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

export function CustomerPortal({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'negotiations' | 'manifest' | 'billing' | 'account'>('telemetry');
  const [trips, setTrips] = useState<any[]>([]);
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState<any | null>(null);

  const [dealForm, setDealForm] = useState({
    loadingStation: 'EWK',
    destination: 'MNY',
    cargoType: 'Bagged Cement (50kg)',
    quantity: '5000',
    targetDate: '',
    notes: '',
  });

  const companyName = user?.companyName || user?.fullName || 'Industrial Consignee Client';
  const clientEmail = user?.email || '';

  // Helper for safe JSON parsing
  const tryParse = (key: string, fallback: any) => {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  useEffect(() => {
    // 1. Fetch & Filter Trips strictly for THIS Company
    const allTrips = StateEngine.getTrips();
    const companyTrips = allTrips.filter(
      (t) =>
        (t.company && t.company.toLowerCase().includes(companyName.toLowerCase())) ||
        (t.companyName && t.companyName.toLowerCase().includes(companyName.toLowerCase()))
    );
    setTrips(companyTrips);

    // 2. Fetch & Filter Requisitions strictly for THIS Company / Email
    const allReqs = tryParse('bueno_client_requests', []);
    const companyReqs = allReqs.filter(
      (r: any) =>
        (r.email && r.email.toLowerCase() === clientEmail.toLowerCase()) ||
        (r.companyName && r.companyName.toLowerCase().includes(companyName.toLowerCase()))
    );
    setClientRequests(companyReqs);

    // 3. Fetch & Filter Custom Negotiations strictly for THIS Company
    const allDeals = tryParse('bueno_custom_deal_negotiations', []);
    const companyDeals = allDeals.filter(
      (d: any) =>
        (d.companyName && d.companyName.toLowerCase().includes(companyName.toLowerCase())) ||
        (d.email && d.email.toLowerCase() === clientEmail.toLowerCase())
    );

    if (companyDeals.length > 0) {
      setNegotiations(companyDeals);
      setActiveDealId(companyDeals[0].id);
    } else if (companyReqs.length > 0) {
      // Auto-initialize clean isolated negotiation thread from client's requisition!
      const req = companyReqs[0];
      const autoDeal = {
        id: `DEAL-NEG-${req.id || Date.now()}`,
        companyName: companyName,
        email: clientEmail,
        contactName: req.contactName || user?.fullName || 'Logistics Desk',
        loadingStation: req.route?.includes('EWK') ? 'EWK' : 'PAPA',
        destination: 'MNY',
        cargoType: `${req.product || 'Cement'} (${req.volume || 'Bulk Haulage'})`,
        quantity: req.volume || '1,000 Tonnes',
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
            sender: 'Babajide Sanwo',
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
  }, [companyName, clientEmail, user]);

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
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeDealId) return;

    const activeDeal = negotiations.find((n) => n.id === activeDealId);
    if (!activeDeal) return;

    const newMsg = {
      sender: user?.fullName || `${companyName} Logistics Desk`,
      role: 'Industrial Consignee',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedDeals = negotiations.map((d) =>
      d.id === activeDealId ? { ...d, messages: [...(d.messages || []), newMsg] } : d
    );

    saveNegotiations(updatedDeals);
    setChatInput('');

    // Trigger Admin Notification Alert
    try {
      const notifs = tryParse('bueno_notifications', []);
      const newNotif = {
        id: `notif_${Date.now()}`,
        title: `New Message from ${companyName}`,
        body: `"${chatInput.trim()}"`,
        time: 'Just now',
        type: 'CLIENT_CHAT',
        read: false,
      };
      localStorage.setItem('bueno_notifications', JSON.stringify([newNotif, ...notifs]));
    } catch {}
  };

  const handleCreateNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const newDeal = {
      id: `DEAL-NEG-${Date.now()}`,
      companyName,
      email: clientEmail,
      contactName: user?.fullName || 'Logistics Lead',
      ...dealForm,
      status: 'UNDER_OPERATIONS_REVIEW',
      createdAt: new Date().toLocaleDateString('en-GB'),
      messages: [
        {
          sender: user?.fullName || `${companyName} Desk`,
          role: 'Industrial Consignee',
          text: `New Corridor Freight Request: ${dealForm.cargoType} (${dealForm.quantity} Bags) from ${dealForm.loadingStation} to ${dealForm.destination}. Target Date: ${dealForm.targetDate || 'Immediate'}. Notes: ${dealForm.notes || 'N/A'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    const updated = [newDeal, ...negotiations];
    saveNegotiations(updated);
    setActiveDealId(newDeal.id);
    setDealForm({ loadingStation: 'EWK', destination: 'MNY', cargoType: 'Bagged Cement (50kg)', quantity: '5000', targetDate: '', notes: '' });

    setCustomAlert({
      title: 'Deal Request Transmitted',
      message: 'New freight corridor request sent to Head of Operations & Command Center successfully!',
    });
  };

  const activeDeal = negotiations.find((n) => n.id === activeDealId) || negotiations[0];
  const activeTrip = trips.find((t) => t.status === 'IN_TRANSIT' || t.status === 'LOADING') || trips[0];
  const latestReq = clientRequests[0];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* ─── HEADER ─── */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center font-black text-lg shadow-md">
              B
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-widest block">INDUSTRIAL CONSIGNEE PORTAL</span>
              <h1 className="text-base font-black tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {companyName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-bold text-slate-200 block">{user?.fullName || 'Freight Manager'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{user?.email || 'Active Client Session'}</span>
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

      {/* ─── MAIN CONTAINER ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ─── B2B ONBOARDING & REQUISITION STEPPER BANNER ─── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-800 uppercase">
                  VERIFIED CORPORATE CONSIGNEE
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
                <span className="font-extrabold text-slate-200">Babajide Sanwo (Head of Operations)</span>
              </div>
            </div>
          </div>

          {/* 4-STEP CONSIGNMENT PROGRESS TRACKER */}
          <div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-3">Live Consignment Lifecycle Progress</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={`p-3 rounded-2xl border ${latestReq ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>
                <div className="text-[10px] font-black uppercase text-emerald-400">Step 01</div>
                <div className="text-xs font-bold mt-0.5">Requisition Registered</div>
                <span className="text-[9px] block text-slate-400 mt-1">{latestReq ? `Docket: ${latestReq.id || 'Active'}` : 'Submitted'}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${activeTrip ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>
                <div className="text-[10px] font-black uppercase text-emerald-400">Step 02</div>
                <div className="text-xs font-bold mt-0.5">Wagon & Loco Allocation</div>
                <span className="text-[9px] block text-slate-400 mt-1">{activeTrip ? `Loco #${activeTrip.locomotiveId || 'L2205'}` : 'Pending Allocation'}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${activeTrip?.status === 'IN_TRANSIT' || activeTrip?.status === 'COMPLETED' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>
                <div className="text-[10px] font-black uppercase text-emerald-400">Step 03</div>
                <div className="text-xs font-bold mt-0.5">Siding Loading & Tally</div>
                <span className="text-[9px] block text-slate-400 mt-1">{activeTrip ? `${activeTrip.quantity || 1600} Bags Sealed` : 'Awaiting Dispatch'}</span>
              </div>

              <div className={`p-3 rounded-2xl border ${activeTrip?.status === 'COMPLETED' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-slate-950/80 border-slate-800 text-slate-400'}`}>
                <div className="text-[10px] font-black uppercase text-emerald-400">Step 04</div>
                <div className="text-xs font-bold mt-0.5">Moniya Yard Arrival & Audit</div>
                <span className="text-[9px] block text-slate-400 mt-1">{activeTrip?.status === 'COMPLETED' ? 'Clearing Complete' : 'En Route'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm font-sans">
          {[
            { id: 'telemetry', label: '🛰️ Live Telemetry & GPS', count: trips.length },
            { id: 'negotiations', label: '💬 Corridor Negotiations & Chat', count: negotiations.length },
            { id: 'manifest', label: '📦 Cargo Manifest & Tally Audits', count: trips.length },
            { id: 'billing', label: '💳 Freight Invoices & Tariff', count: trips.length },
            { id: 'account', label: '🏢 Corporate Account Settings', count: null },
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

        {/* ─── TAB 1: LIVE TELEMETRY & GPS ─── */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {trips.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trips.map((trip) => (
                  <div key={trip.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
                    <div className="bg-slate-900 text-white p-5 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block">{trip.id}</span>
                          <h3 className="text-base font-black text-slate-100">{trip.company || companyName}</h3>
                        </div>
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border font-mono ${
                          trip.status === 'IN_TRANSIT' ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse' : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}>
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
                          <span className="text-[9px] uppercase text-slate-400 font-bold block">Consignment</span>
                          <span className="font-mono font-bold text-amber-400">{trip.quantity || 1610} Bags</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4 font-sans text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-slate-600 font-bold text-[11px]">
                          <span>Dispatch: {trip.dispatchTime || '24 Aug 2026, 09:30 AM'}</span>
                          <span className="text-emerald-700 font-mono">Speed: 74 km/h</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden relative">
                          <div className="h-full bg-gradient-to-r from-[#62BC37] to-amber-500 rounded-full" style={{ width: trip.status === 'COMPLETED' ? '100%' : '65%' }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Assigned Wagons & Security Seal Verification</span>
                        <div className="space-y-1.5">
                          {(trip.wagonLogs || [
                            { wagonId: 'PXG 2322', status: 'LOADED', loadedAt: '08:10 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9801' },
                            { wagonId: 'PXG 2323', status: 'LOADED', loadedAt: '08:25 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9802' },
                          ]).map((w: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                              <span className="font-mono font-bold text-slate-900">{w.wagonId}</span>
                              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">{w.sealNumber}</span>
                              <span className="font-extrabold text-emerald-700">✓ Intact ({w.bagsCount || 70} bags)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-[#62BC37] rounded-3xl flex items-center justify-center font-black text-2xl mx-auto border border-emerald-200">
                  🛰️
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>No Active Corridor Haulage Trips Yet</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                    Your account has been provisioned successfully! Once Operations approves your requisition and allocates wagons, your live satellite telemetry will stream here in real time.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: CORRIDOR NEGOTIATIONS & CHAT DESK ─── */}
        {activeTab === 'negotiations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* THREAD LIST */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Your Freight Requisitions</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">{negotiations.length} Threads</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {negotiations.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => setActiveDealId(deal.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      activeDealId === deal.id
                        ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-[#0E4B88]">{deal.id}</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">{deal.status || 'UNDER_REVIEW'}</span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mt-1 truncate">{deal.cargoType}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{deal.quantity} • {deal.createdAt}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE ISOLATED CHAT BOX */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-[550px]">
              {activeDeal ? (
                <>
                  <div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Direct Command Communication Channel</span>
                        <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                          {activeDeal.cargoType} ({activeDeal.quantity})
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded-xl">{companyName}</span>
                    </div>

                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2">
                      {(activeDeal.messages || []).map((msg: any, idx: number) => {
                        const isMe = msg.role === 'Industrial Consignee' || msg.sender.includes(companyName);
                        return (
                          <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-md p-4 rounded-2xl text-xs space-y-1 ${
                              isMe ? 'bg-[#0E4B88] text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200'
                            }`}>
                              <div className="flex justify-between items-center gap-3 text-[9px] opacity-80 border-b border-white/10 pb-1">
                                <span className="font-bold">{msg.sender} ({msg.role || 'Ops Command'})</span>
                                <span className="font-mono">{msg.time}</span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-line font-medium mt-1">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-100 flex gap-2">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message to Head of Operations (Babajide Sanwo)..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
                    />
                    <button type="submit" className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all">
                      Send Message ➔
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center my-auto space-y-3">
                  <span className="text-3xl block">💬</span>
                  <h3 className="text-base font-black text-slate-900">Select a Freight Requisition to View Messages</h3>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 3: CARGO MANIFEST & TALLY AUDITS ─── */}
        {activeTab === 'manifest' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Official NRC Consignment Manifests</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Cargo Loading & Unloading Tally Audits</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">{trips.length} Total Haulages</span>
            </div>

            <div className="space-y-4">
              {trips.length > 0 ? (
                trips.map((trip) => (
                  <div key={trip.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#0E4B88] uppercase">{trip.id}</span>
                        <h4 className="text-sm font-black text-slate-900">{trip.company || companyName}</h4>
                      </div>
                      <button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all">
                        🖨️ Download Official Waybill (PDF)
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-xs text-center">
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Manifest Loaded</span><span className="font-mono font-bold text-slate-900">{trip.quantity || 1610} Bags</span></div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Intact Delivered</span><span className="font-mono font-bold text-emerald-700">{trip.quantity || 1610} Bags</span></div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Burst Bags</span><span className="font-mono font-bold text-rose-600">{trip.damages?.burstBags || 0} Bags</span></div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200"><span className="text-[9px] uppercase font-bold text-slate-400 block">Audit Clearance</span><span className="font-extrabold text-emerald-700">✓ PASSED</span></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <span className="text-3xl block">📋</span>
                  <p className="text-xs font-bold">No cargo manifests generated yet. Manifests will appear here as your trains complete loading.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 4: FREIGHT INVOICES & TARIFF ─── */}
        {activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Freight Billing</span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Invoices & Tariff Ledger</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">Standard Tariff: ₦1,200 / Bag</span>
            </div>

            <div className="space-y-4">
              {trips.length > 0 ? (
                trips.map((trip) => {
                  const bags = trip.quantity || 1610;
                  const freightAmount = bags * 1200;
                  return (
                    <div key={trip.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">INVOICE #{trip.id.replace('TRP-', 'INV-')}</span>
                        <h4 className="text-sm font-black text-slate-900">{trip.company || companyName}</h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{bags.toLocaleString()} Bags • Corridor: {trip.origin} ➔ {trip.destination}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-base font-black text-slate-900 block font-mono">₦{freightAmount.toLocaleString()}</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold font-mono px-2 py-0.5 rounded uppercase">PAID & DISBURSED</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-500 space-y-2">
                  <span className="text-3xl block">💳</span>
                  <p className="text-xs font-bold">No commercial invoices generated yet. Invoices will automatically generate upon wagon dispatch.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 5: CORPORATE ACCOUNT SETTINGS ─── */}
        {activeTab === 'account' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Corporate Desk Settings</span>
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Account Credentials & Contact Officers</h3>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Staff / Client Account ID</label>
                  <input readOnly value={user?.staffId || 'CUST-2026'} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-amber-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">4-Digit Security PIN</label>
                  <input readOnly value={user?.pin || '1111'} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
