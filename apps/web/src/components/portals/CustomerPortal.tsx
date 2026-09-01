'use client';

import { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';
import { LiveGpsMap } from '@/components/LiveGpsMap';

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
  const [trips, setTrips] = useState<any[]>([]);
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
        (t.companyName && t.companyName.toLowerCase().includes(companyName.toLowerCase()))
    );
    setTrips(companyTrips);

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
    window.addEventListener('storage', syncData);
    window.addEventListener('bueno_state_updated', syncData);
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('bueno_state_updated', syncData);
    };
  }, [companyName, clientEmail]);

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
  };

  const activeDeal = negotiations.find((n) => n.id === activeDealId) || negotiations[0];
  const activeTrip = trips.find((t) => t.status === 'IN_TRANSIT' || t.status === 'LOADING') || trips[0];
  const latestReq = clientRequests[0];

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900">
      {/* ─── HEADER (CLEAN WHITES & BRAND GREEN) ─── */}
      <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center font-black text-lg shadow-md font-mono">
              B
            </div>
            <div>
              <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">
                BUENO LOGISTICS • CONSIGNEE DESK
              </span>
              <h1 className="text-sm font-black tracking-wider text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {companyName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSignOut}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs px-4 py-2 rounded-xl transition-all border border-slate-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTAINER ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

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

        {/* ─── TAB 4: FREIGHT INVOICES ─── */}
        {activeTab === 'billing' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5 font-sans">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase">Commercial Freight Invoices</span>
              <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>Freight Invoices & Ledger</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {trips.map((t) => {
                const amount = (t.quantity || 1600) * (t.unitOfMeasure?.includes('Tonnes') ? 24000 : 1200);
                return (
                  <div key={t.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-slate-400 font-bold text-[10px] uppercase">INV-{t.id}</span>
                      <h4 className="font-sans font-black text-slate-900 text-sm">{t.company || companyName}</h4>
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
  );
}
