'use client';

import React, { useState, useEffect } from 'react';
import { StateEngine, SEED_CONTAINERS, SEED_GATE_LOGS } from '@/lib/services/StateEngine';

interface MoniyaContainerViewProps {
  user?: any;
}

export function MoniyaContainerView({ user }: MoniyaContainerViewProps) {
  const [containers, setContainers] = useState<any[]>([]);
  const [gateLogs, setGateLogs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [registerModal, setRegisterModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<any | null>(null);
  const [printedReceipt, setPrintedReceipt] = useState<any | null>(null);
  const [customAlert, setCustomAlert] = useState<{ title?: string; message: string } | null>(null);

  const [gateForm, setGateForm] = useState({
    truckRegNo: '',
    driverName: '',
    driverPhone: '',
    transporter: 'Mainstream Haulage Ltd',
    containerId: '',
    agent: 'MAERSKLINES',
    size: '40ft HC',
    type: 'CONTAINERS-IMPORT',
    action: 'INBOUND_RECEIVE',
  });

  const syncData = () => {
    setContainers(StateEngine.getContainers());
    setGateLogs(StateEngine.getGateLogs());
    setTrips(StateEngine.getTrips());
  };

  useEffect(() => {
    syncData();
    const handleUpdate = () => syncData();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('bueno_state_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('bueno_state_updated', handleUpdate);
    };
  }, []);

  const saveContainersData = (newContainers: any[], newLogs: any[]) => {
    setContainers(newContainers);
    setGateLogs(newLogs);
    StateEngine.saveContainers(newContainers);
    StateEngine.saveGateLogs(newLogs);
    window.dispatchEvent(new Event('bueno_state_updated'));
  };

  const totalContainers = containers.length;
  const importsCount = containers.filter((c) => c.type === 'CONTAINERS-IMPORT').length;
  const exportsCount = containers.filter((c) => c.type === 'CONTAINERS-EXPORT').length;
  const emptiesCount = containers.filter((c) => c.type === 'EMPTY').length;
  const totalGateRevenue = gateLogs.reduce((acc, log) => acc + (Number(log.feePaid) || 2000), 0);

  // Demurrage calculation: 14 free days, ₦15,000/day thereafter
  const overdueContainers = containers
    .map((c) => {
      const freeDays = 14;
      const dwell = Number(c.dwellDays) || 1;
      const overDays = Math.max(0, dwell - freeDays);
      const demurrageDue = overDays * 15000;
      return { ...c, overDays, demurrageDue };
    })
    .filter((c) => c.overDays > 0);

  const totalDemurrageDue = overdueContainers.reduce((sum, c) => sum + c.demurrageDue, 0);

  // Auto-Stack Containers from Arriving Trips at Moniya
  const handleAutoStackFromTrips = () => {
    const moniyaTrips = trips.filter(
      (t) =>
        (t.destination === 'MONI' || t.destination === 'MNY' || t.destination === 'Moniya' || (t.destination && t.destination.toLowerCase().includes('moni'))) &&
        (t.status === 'IN_TRANSIT' || t.status === 'ARRIVED' || t.status === 'COMPLETED' || t.status === 'DISCHARGED')
    );

    if (moniyaTrips.length === 0) {
      setCustomAlert({
        title: 'No Arrived Container Trips',
        message: 'No active container freight train trips destined for Moniya Inland Terminal (MONI/MNY) currently pending stacking.',
      });
      return;
    }

    const existingIds = new Set(containers.map((c) => c.id));
    const newStacked: any[] = [];

    moniyaTrips.forEach((trip) => {
      const logs = trip.wagonLogs || [];
      const company = trip.company || 'MAERSKLINES';
      const isImport = trip.cargoType?.includes('IMPORT') || trip.cargoType?.includes('CONTAINERS');
      const category = isImport ? 'CONTAINERS-IMPORT' : 'CONTAINERS-EXPORT';
      const bay = isImport ? 'Bay A' : 'Bay B';

      // If wagon logs exist, use their IDs, otherwise synthesize container entries
      const wagonsToStack = logs.length > 0 ? logs : Array.from({ length: Math.min(8, Number(trip.quantity) || 4) }, (_, i) => ({
        wagonId: `WAG-${trip.id.slice(-4)}-${i + 1}`,
      }));

      wagonsToStack.forEach((w: any, idx: number) => {
        const contId = w.containerId || `MSKU-${Math.floor(100000 + Math.random() * 900000)}-${idx + 1}`;
        if (!existingIds.has(contId)) {
          existingIds.add(contId);
          newStacked.push({
            id: contId,
            agent: company.includes('APMT') ? 'APMT' : company.includes('MAERSK') ? 'MAERSKLINES' : 'MAERSKLINES',
            size: '40ft HC',
            type: category,
            arrivalDate: new Date().toISOString().split('T')[0],
            bay: bay,
            row: `Row ${(idx % 5) + 1}`,
            col: `Col ${(Math.floor(idx / 5) % 4) + 1}`,
            tier: (idx % 4) + 1,
            dwellDays: 1,
            gateStatus: 'IN_YARD',
            trainRef: trip.id,
            origin: trip.origin,
          });
        }
      });
    });

    if (newStacked.length === 0) {
      setCustomAlert({
        title: 'All Containers Already Stacked',
        message: 'All containers from arrived Moniya train manifests have already been stacked into the terminal yard.',
      });
      return;
    }

    const updated = [...newStacked, ...containers];
    saveContainersData(updated, gateLogs);

    setCustomAlert({
      title: 'Auto-Stacking Successful',
      message: `Successfully decoupled train wagons and auto-stacked ${newStacked.length} shipping containers into Moniya Yard (Bay A / Bay B). Stacking grid and demurrage tracking updated!`,
    });
  };

  // Register Gate Truck Transaction (₦2,000 fee)
  const handleRegisterTruck = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContainerId = gateForm.containerId.trim().toUpperCase() || `CONT-${Date.now().toString().slice(-6)}`;
    const passId = `GT-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();
    const timestampStr = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newGateLog = {
      id: passId,
      truckRegNo: gateForm.truckRegNo.trim().toUpperCase(),
      driverName: gateForm.driverName.trim(),
      driverPhone: gateForm.driverPhone.trim(),
      transporter: gateForm.transporter.trim(),
      containerId: cleanContainerId,
      action: gateForm.action,
      feePaid: 2000,
      timestamp: timestampStr,
    };

    let updatedContainers = [...containers];
    if (gateForm.action === 'INBOUND_RECEIVE') {
      const existingIdx = updatedContainers.findIndex((c) => c.id === cleanContainerId);
      const randomTier = Math.floor(Math.random() * 4) + 1;
      const randomRow = `Row ${Math.floor(Math.random() * 5) + 1}`;
      const randomCol = `Col ${Math.floor(Math.random() * 4) + 1}`;
      const newContObj = {
        id: cleanContainerId,
        agent: gateForm.agent,
        size: gateForm.size,
        type: gateForm.type,
        arrivalDate: now.toISOString().split('T')[0],
        bay: gateForm.type === 'CONTAINERS-IMPORT' ? 'Bay A' : gateForm.type === 'CONTAINERS-EXPORT' ? 'Bay B' : 'Bay C',
        row: randomRow,
        col: randomCol,
        tier: randomTier,
        dwellDays: 1,
        gateStatus: 'IN_YARD',
      };

      if (existingIdx >= 0) {
        updatedContainers[existingIdx] = newContObj;
      } else {
        updatedContainers = [newContObj, ...updatedContainers];
      }
    } else {
      updatedContainers = updatedContainers.filter((c) => c.id !== cleanContainerId);
    }

    const updatedLogs = [newGateLog, ...gateLogs];
    saveContainersData(updatedContainers, updatedLogs);
    setRegisterModal(false);
    setPrintedReceipt(newGateLog);
    setGateForm({
      truckRegNo: '',
      driverName: '',
      driverPhone: '',
      transporter: 'Mainstream Haulage Ltd',
      containerId: '',
      agent: 'MAERSKLINES',
      size: '40ft HC',
      type: 'CONTAINERS-IMPORT',
      action: 'INBOUND_RECEIVE',
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ─── TERMINAL COMMAND BANNER ─── */}
      <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#62BC37] animate-pulse" />
            <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest">
              MONIYA INLAND CONTAINER TERMINAL (MICT) · STANDARD GAUGE SIDING
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Visual Container Stacking Yard, Demurrage & Gate Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-stacking from arrived train manifests, 14-day free dwell calculation, and ₦2,000 gate truck fee collection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleAutoStackFromTrips}
            className="bg-[#0E4B88] hover:bg-[#093562] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <span>🚂 Auto-Stack Arrived Train Wagons</span>
          </button>
          <button
            onClick={() => setRegisterModal(true)}
            className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <span>+ Gate Truck Entry (₦2,000 Fee)</span>
          </button>
        </div>
      </div>

      {/* ─── TERMINAL KPI CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        {[
          ['Yard Stacked Containers', `${totalContainers} TEUs`, 'text-slate-900'],
          ['Import Cargo (Bay A)', `${importsCount} TEUs`, 'text-[#0E4B88]'],
          ['Export Cargo (Bay B)', `${exportsCount} TEUs`, 'text-[#62BC37]'],
          ['Empty Containers (Bay C)', `${emptiesCount} TEUs`, 'text-amber-700'],
          ['Total Gate Revenue Collected', `₦${totalGateRevenue.toLocaleString()}`, 'text-emerald-700'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <span className="block text-[9px] font-extrabold uppercase text-slate-400 mb-1">{l}</span>
            <span className={`text-xl font-black font-mono ${c}`}>{v}</span>
          </div>
        ))}
      </div>

      {/* ─── VISUAL 3D CONTAINER STACKING YARD GRID ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono font-black text-[#0E4B88] uppercase tracking-wider block">
              STACKING YARD TOPOLOGY
            </span>
            <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Visual 3D Container Stacking Yard (Bays A, B, C)
            </h3>
            <p className="text-xs text-slate-500">
              Rows × Columns × 4-Tier Height. Click any container block to inspect yard passport, seal condition & demurrage clock.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded bg-[#0E4B88]" /> Bay A (Import)
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded bg-[#62BC37]" /> Bay B (Export)
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-3 h-3 rounded bg-amber-500" /> Bay C (Empty)
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Bay A — Import Yard', code: 'Bay A', bg: 'bg-blue-50/50 border-blue-200', badge: 'bg-[#0E4B88] text-white', desc: 'Inbound maritime containers from Lagos Ports' },
            { title: 'Bay B — Export Yard', code: 'Bay B', bg: 'bg-emerald-50/50 border-emerald-200', badge: 'bg-[#62BC37] text-white', desc: 'Outbound agricultural & manufactured freight' },
            { title: 'Bay C — Empty Yard', code: 'Bay C', bg: 'bg-amber-50/50 border-amber-200', badge: 'bg-amber-600 text-white', desc: 'Empty containers awaiting return or repositioning' },
          ].map((bay) => {
            const bayContainers = containers.filter((c) => c.bay === bay.code);

            return (
              <div key={bay.code} className={`border rounded-2xl p-4 space-y-3 ${bay.bg}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-900 block">{bay.title}</span>
                    <span className="text-[10px] text-slate-500 block">{bay.desc}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${bay.badge}`}>
                    {bayContainers.length} Stacked
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((slotIdx) => {
                    const c = bayContainers[slotIdx - 1];
                    if (!c) {
                      return (
                        <div
                          key={slotIdx}
                          className="h-16 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] font-mono text-slate-300 select-none"
                        >
                          Slot {slotIdx}
                        </div>
                      );
                    }
                    const isOverdue = (Number(c.dwellDays) || 0) > 14;
                    const blockBg =
                      c.type === 'CONTAINERS-IMPORT'
                        ? 'bg-[#0E4B88] text-white hover:bg-[#093562]'
                        : c.type === 'CONTAINERS-EXPORT'
                        ? 'bg-[#62BC37] text-white hover:bg-[#52A02D]'
                        : 'bg-amber-500 text-slate-900 hover:bg-amber-600';

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedContainer(c)}
                        className={`h-16 cursor-pointer rounded-xl p-2 flex flex-col justify-between shadow-sm hover:scale-105 transition-all ${blockBg}`}
                        title={`Container ${c.id} · ${c.agent} · Tier ${c.tier} · ${c.dwellDays} Days`}
                      >
                        <div className="flex justify-between items-center text-[9px] font-mono font-black">
                          <span>{c.tier}T</span>
                          {isOverdue && (
                            <span className="bg-rose-600 text-white px-1 py-0.5 rounded text-[8px] font-bold">
                              DEM
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono font-extrabold truncate block">{c.id}</span>
                        <span className="text-[8px] opacity-85 block truncate font-bold">{c.agent}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DEMURRAGE PENALTY COUNTER TABLE ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black text-rose-600 uppercase tracking-wider">
                COMPLIANCE & DEMURRAGE RECOVERY
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Container Demurrage Penalty Counter
            </h3>
            <p className="text-xs text-slate-500">
              Free Time Allowance: <b>14 Days</b> | Demurrage Penalty: <b>₦15,000 per day</b> after 14 days dwell period.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-mono">
              {overdueContainers.length} Overdue ({overdueContainers.length > 0 ? `₦${totalDemurrageDue.toLocaleString()} Total` : '₦0 Due'})
            </span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                {['Container ID', 'Agent / Owner', 'Arrival Date', 'Dwell Time', 'Free Allowance', 'Overdue Days', 'Demurrage Due (₦)', 'Action'].map(
                  (h) => (
                    <th key={h} className="p-3.5 text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overdueContainers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                    No container demurrage overdue at Moniya Terminal. All containers are currently within their 14-day free period.
                  </td>
                </tr>
              ) : (
                overdueContainers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 text-xs font-sans">
                    <td className="p-4 font-mono font-black text-[#0E4B88]">{c.id}</td>
                    <td className="p-4 font-bold text-slate-800">{c.agent}</td>
                    <td className="p-4 font-mono text-slate-600">{c.arrivalDate}</td>
                    <td className="p-4 font-mono font-bold text-slate-900">{c.dwellDays} Days</td>
                    <td className="p-4 text-emerald-700 font-bold">14 Days Free</td>
                    <td className="p-4 font-mono font-bold text-rose-600">{c.overDays} Days Overdue</td>
                    <td className="p-4 font-mono font-black text-rose-700 text-sm">₦{c.demurrageDue.toLocaleString()}</td>
                    <td className="p-4">
                      <button
                        onClick={() =>
                          setCustomAlert({
                            title: 'Demurrage Invoice Issued',
                            message: `Official Demurrage Invoice generated for Container ${c.id} (${c.agent}): ₦${c.demurrageDue.toLocaleString()}.\n\nBilled Entity: ${c.agent}\nDwell Overdue: ${c.overDays} Days @ ₦15,000/day\nInvoice Ref: DEM-MNY-${Date.now().toString().slice(-6)}\nPayment Account: Bueno Logistics Ltd (FBN / 0123456789)`,
                          })
                        }
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all"
                      >
                        Issue Invoice 📄
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── GATE TRUCK TRANSACTION LOG ─── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-mono font-black text-[#62BC37] uppercase tracking-wider block">
              ACCESS CONTROL & REVENUE
            </span>
            <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Moniya Terminal Gate Truck Transaction Log
            </h3>
            <p className="text-xs text-slate-500">
              Real-time audit trail of inbound & outbound haulage trucks and mandatory ₦2,000 gate fees collected.
            </p>
          </div>
          <button
            onClick={() => setRegisterModal(true)}
            className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            + Register Haulage Truck Entry
          </button>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                {['Pass ID', 'Truck Reg No.', 'Driver Details', 'Transporter Fleet', 'Container ID', 'Gate Action', 'Gate Fee', 'Time'].map(
                  (h) => (
                    <th key={h} className="p-3.5 text-[10px] font-extrabold uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gateLogs.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50 text-xs">
                  <td className="p-4 font-mono font-black text-[#0E4B88]">{g.id}</td>
                  <td className="p-4 font-mono font-bold text-slate-900">{g.truckRegNo}</td>
                  <td className="p-4 text-slate-800 font-medium">
                    {g.driverName} <span className="block text-[10px] text-slate-400 font-mono">{g.driverPhone}</span>
                  </td>
                  <td className="p-4 text-slate-700">{g.transporter}</td>
                  <td className="p-4 font-mono font-bold text-slate-900">{g.containerId}</td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        g.action === 'INBOUND_RECEIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {g.action}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-extrabold text-emerald-800">
                    ₦{Number(g.feePaid).toLocaleString()}
                  </td>
                  <td className="p-4 font-mono text-slate-400">{g.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── GATE TRUCK REGISTRATION MODAL ─── */}
      {registerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 space-y-4 font-sans shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-[#62BC37] uppercase tracking-widest block">
                  TERMINAL ACCESS CONTROL
                </span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Moniya Terminal Gate Truck Registration
                </h3>
              </div>
              <button
                onClick={() => setRegisterModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-base"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Register haulage truck entry or exit, assign container slot, and collect mandatory <b>₦2,000 gate fee</b> for Bueno Logistics.
            </p>

            <form onSubmit={handleRegisterTruck} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Gate Action *</label>
                  <select
                    value={gateForm.action}
                    onChange={(e) => setGateForm({ ...gateForm, action: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="INBOUND_RECEIVE">Inbound Gate-In (Receive Container)</option>
                    <option value="OUTBOUND_DISPATCH">Outbound Gate-Out (Dispatch Container)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Truck Registration *</label>
                  <input
                    required
                    value={gateForm.truckRegNo}
                    onChange={(e) => setGateForm({ ...gateForm, truckRegNo: e.target.value })}
                    placeholder="e.g. KJA-482-XY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Driver Full Name *</label>
                  <input
                    required
                    value={gateForm.driverName}
                    onChange={(e) => setGateForm({ ...gateForm, driverName: e.target.value })}
                    placeholder="e.g. Garba Shehu"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Driver Phone Number *</label>
                  <input
                    required
                    value={gateForm.driverPhone}
                    onChange={(e) => setGateForm({ ...gateForm, driverPhone: e.target.value })}
                    placeholder="e.g. 08031112233"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Haulage Transporter Company *</label>
                <input
                  required
                  value={gateForm.transporter}
                  onChange={(e) => setGateForm({ ...gateForm, transporter: e.target.value })}
                  placeholder="e.g. Mainstream Haulage Ltd"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Container Number *</label>
                  <input
                    required
                    value={gateForm.containerId}
                    onChange={(e) => setGateForm({ ...gateForm, containerId: e.target.value })}
                    placeholder="e.g. MSKU-948210-4"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Shipping Agent</label>
                  <select
                    value={gateForm.agent}
                    onChange={(e) => setGateForm({ ...gateForm, agent: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    {['MAERSKLINES', 'APMT', 'MSC', 'CMA CGM', 'HAPAG-LLOYD', 'COSCO', 'OTHERS'].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Category</label>
                  <select
                    value={gateForm.type}
                    onChange={(e) => setGateForm({ ...gateForm, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                  >
                    <option value="CONTAINERS-IMPORT">CONTAINERS-IMPORT</option>
                    <option value="CONTAINERS-EXPORT">CONTAINERS-EXPORT</option>
                    <option value="EMPTY">EMPTY</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-emerald-900 block">Mandatory Gate Access Tariff</span>
                  <span className="text-[10px] text-emerald-700">Payable to Bueno Logistics Limited per truck transaction</span>
                </div>
                <span className="text-lg font-mono font-black text-emerald-800">₦2,000</span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRegisterModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all"
                >
                  Collect ₦2,000 & Issue Official Gate Pass ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PRINTABLE GATE PASS RECEIPT MODAL ─── */}
      {printedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 font-sans text-center shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Official Gate Pass & Fee Receipt
            </h3>
            <p className="text-xs text-slate-500">Moniya Inland Container Terminal (MICT)</p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Pass Serial No:</span>
                <span className="font-bold text-[#0E4B88]">{printedReceipt.id}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Truck Reg No:</span>
                <span className="font-bold text-slate-900">{printedReceipt.truckRegNo}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Driver Name:</span>
                <span className="font-bold text-slate-900">{printedReceipt.driverName}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Driver Phone:</span>
                <span className="font-bold text-slate-900">{printedReceipt.driverPhone}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Haulage Fleet:</span>
                <span className="font-bold text-slate-900">{printedReceipt.transporter}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Container ID:</span>
                <span className="font-bold text-slate-900">{printedReceipt.containerId}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Action:</span>
                <span className="font-bold text-emerald-700">{printedReceipt.action}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-slate-400">Gate Fee Paid:</span>
                <span className="font-black text-emerald-700 text-sm">₦2,000 (PAID)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-600">{printedReceipt.timestamp}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Print Gate Pass 🖨️
              </button>
              <button
                onClick={() => setPrintedReceipt(null)}
                className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONTAINER YARD PASSPORT MODAL ─── */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 font-sans shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-black text-[#0E4B88] uppercase">
                  {selectedContainer.agent} SHIPPING LINE
                </span>
                <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  Container Yard Passport: {selectedContainer.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="text-slate-400 font-bold hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Category</span>
                <span className="font-bold text-slate-900">{selectedContainer.type}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Size Spec</span>
                <span className="font-mono font-bold text-slate-900">{selectedContainer.size}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Yard Topology</span>
                <span className="font-mono font-bold text-[#0E4B88]">
                  {selectedContainer.bay} | {selectedContainer.row} | {selectedContainer.col} | Tier {selectedContainer.tier}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Dwell Days</span>
                <span className="font-mono font-bold text-slate-900">{selectedContainer.dwellDays} Days in Yard</span>
              </div>
            </div>

            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <span className="text-xs font-black text-emerald-900 block">Demurrage Assessment</span>
              <p className="text-xs text-emerald-800 mt-0.5">
                {selectedContainer.dwellDays > 14 ? (
                  <b className="text-rose-600">
                    OVERDUE — Demurrage Due: ₦{((selectedContainer.dwellDays - 14) * 15000).toLocaleString()} (
                    {selectedContainer.dwellDays - 14} days overdue @ ₦15,000/day)
                  </b>
                ) : (
                  <b className="text-emerald-700">
                    Within Free Allowance ({14 - selectedContainer.dwellDays} free days remaining)
                  </b>
                )}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedContainer(null)}
                className="bg-[#62BC37] text-white font-bold text-xs px-6 py-2.5 rounded-xl hover:bg-[#52A02D] transition-all"
              >
                Close Passport
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOM ALERT MODAL ─── */}
      {customAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 font-sans text-center shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {customAlert.title || 'System Notification'}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono">
              {customAlert.message}
            </p>
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setCustomAlert(null)}
                className="bg-[#62BC37] hover:bg-[#52A02D] text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
