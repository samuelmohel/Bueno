'use client';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader, Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { StatCard } from '@/components/ui/StatCard';
import { fleetApi } from '@/lib/api';
import { Train, Truck, Plus, ClipboardList, Fuel, ChevronDown } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const CHECKLIST = ['Brakes','Wheels & axles','Couplings','Lights & signals','Horn','Fuel level','Engine oil','Coolant','Air pressure','Cargo securing','Floor integrity','GPS device active','Fire extinguisher'];

export default function FleetPage() {
  const [tab, setTab] = useState<'wagons' | 'locos'>('wagons');
  const [wagons, setWagons] = useState<any[]>([]);
  const [locos, setLocos] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inspectModal, setInspectModal] = useState<any>(null);
  const [fuelModal, setFuelModal] = useState<any>(null);
  const [addModal, setAddModal] = useState<'wagon' | 'loco' | null>(null);
  const [form, setForm] = useState<any>({});
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [issuesFound, setIssuesFound] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => Promise.all([
    fleetApi.getWagons(), fleetApi.getLocos(), fleetApi.getWagonStats()
  ]).then(([w, l, s]) => { setWagons(w.data); setLocos(l.data); setStats(s.data); })
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const submitInspect = async () => {
    if (!inspectModal) return;
    setSaving(true);
    const passed = Object.values(checklist).every(v => v) && !issuesFound;
    await fleetApi.inspect({ assetType: inspectModal.type, assetId: inspectModal.id, checklistJson: checklist, passed, issuesFound: issuesFound || undefined });
    setInspectModal(null); setChecklist({}); setIssuesFound(''); load();
    setSaving(false);
  };

  const submitFuel = async () => {
    if (!fuelModal) return;
    setSaving(true);
    await fleetApi.fuelLog(fuelModal.id, form);
    setFuelModal(null); setForm({}); load();
    setSaving(false);
  };

  const submitAdd = async () => {
    setSaving(true);
    if (addModal === 'wagon') await fleetApi.createWagon(form);
    else await fleetApi.createLoco(form);
    setAddModal(null); setForm({}); load();
    setSaving(false);
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fleet Inventory</h1>
          <p className="page-subtitle">Wagons, locomotives, inspections &amp; fuel logs</p>
        </div>
        <button onClick={() => { setAddModal(tab === 'wagons' ? 'wagon' : 'loco'); setForm({}); }} className="btn btn-primary">
          <Plus size={13} /> Add {tab === 'wagons' ? 'wagon' : 'locomotive'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard label="Total wagons" value={stats?.total ?? 0} icon={Train} color="blue" />
        <StatCard label="Available" value={stats?.available ?? 0} icon={Train} color="green" />
        <StatCard label="In use" value={stats?.inUse ?? 0} icon={Truck} color="purple" />
        <StatCard label="Maintenance" value={stats?.maintenance ?? 0} icon={ClipboardList} color="amber" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit mb-4">
        {(['wagons', 'locos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'wagons' ? 'Wagons' : 'Locomotives'}
          </button>
        ))}
      </div>

      {/* Wagons table */}
      {tab === 'wagons' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th className="th">Serial no.</th><th className="th">Type</th><th className="th">Capacity</th>
              <th className="th">Condition</th><th className="th">Status</th><th className="th">Last inspected</th>
              <th className="th">Trips</th><th className="th">Actions</th>
            </tr></thead>
            <tbody>
              {wagons.map((w: any) => (
                <tr key={w.id} className="tr">
                  <td className="td font-mono font-medium text-blue-600">{w.serialNumber}</td>
                  <td className="td">{w.wagonType?.replace(/_/g, ' ')}</td>
                  <td className="td">{w.capacityTonnes}t</td>
                  <td className="td capitalize">{w.condition?.toLowerCase()}</td>
                  <td className="td"><StatusBadge status={w.status} /></td>
                  <td className="td text-gray-400">{w.lastInspectedAt ? formatDate(w.lastInspectedAt) : 'Never'}</td>
                  <td className="td">{w.totalTrips}</td>
                  <td className="td">
                    <button onClick={() => { setInspectModal({ id: w.id, type: 'WAGON', name: w.serialNumber }); setChecklist({}); }}
                      className="btn btn-ghost btn-sm"><ClipboardList size={12} /> Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Locos table */}
      {tab === 'locos' && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th className="th">Serial no.</th><th className="th">Model</th><th className="th">Manufacturer</th>
              <th className="th">Max wagons</th><th className="th">Fuel %</th><th className="th">Engine hrs</th>
              <th className="th">Status</th><th className="th">Last fuelled</th><th className="th">Actions</th>
            </tr></thead>
            <tbody>
              {locos.map((l: any) => (
                <tr key={l.id} className="tr">
                  <td className="td font-mono font-medium text-blue-600">{l.serialNumber}</td>
                  <td className="td font-medium">{l.model}</td>
                  <td className="td text-gray-500">{l.manufacturer}</td>
                  <td className="td">{l.maxWagonCapacity}</td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full max-w-16">
                        <div className="h-1.5 rounded-full" style={{ width: `${l.fuelLevelPercent}%`, background: l.fuelLevelPercent > 50 ? '#22c55e' : l.fuelLevelPercent > 20 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span>{l.fuelLevelPercent}%</span>
                    </div>
                  </td>
                  <td className="td">{l.engineHours?.toLocaleString()} hrs</td>
                  <td className="td"><StatusBadge status={l.status} /></td>
                  <td className="td text-gray-400">{l.lastFuelledAt ? formatDate(l.lastFuelledAt) : 'Never'}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => { setInspectModal({ id: l.id, type: 'LOCOMOTIVE', name: l.serialNumber }); setChecklist({}); }}
                        className="btn btn-ghost btn-sm"><ClipboardList size={12} /></button>
                      <button onClick={() => { setFuelModal(l); setForm({}); }}
                        className="btn btn-ghost btn-sm"><Fuel size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspection modal */}
      <Modal open={!!inspectModal} onClose={() => setInspectModal(null)} title={`Inspect — ${inspectModal?.name}`}>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">Check each item. Uncheck anything that has an issue.</p>
          <div className="grid grid-cols-2 gap-2">
            {CHECKLIST.map(item => (
              <label key={item} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!checklist[item]} onChange={e => setChecklist(p => ({ ...p, [item]: e.target.checked }))}
                  className="accent-blue-600 w-3.5 h-3.5" />
                <span className="text-xs text-gray-700">{item}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="label">Issues found (optional)</label>
            <textarea value={issuesFound} onChange={e => setIssuesFound(e.target.value)} rows={2}
              placeholder="Describe any issues…" className="input resize-none" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setInspectModal(null)} className="btn btn-secondary">Cancel</button>
            <button onClick={submitInspect} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Submit inspection'}</button>
          </div>
        </div>
      </Modal>

      {/* Fuel modal */}
      <Modal open={!!fuelModal} onClose={() => setFuelModal(null)} title={`Log fuel — ${fuelModal?.serialNumber}`}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[['litresAdded', 'Litres added', 'number'], ['costNgn', 'Cost (₦)', 'number'], ['fuelLevelAfter', 'Fuel level after (%)', 'number']].map(([k, l, t]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input type={t} value={form[k] || ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))} className="input" />
              </div>
            ))}
            <div>
              <label className="label">Notes</label>
              <input value={form.notes || ''} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} className="input" placeholder="Optional" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setFuelModal(null)} className="btn btn-secondary">Cancel</button>
            <button onClick={submitFuel} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Log fuel'}</button>
          </div>
        </div>
      </Modal>

      {/* Add wagon/loco modal */}
      <Modal open={!!addModal} onClose={() => setAddModal(null)} title={addModal === 'wagon' ? 'Add wagon' : 'Add locomotive'}>
        <div className="grid grid-cols-2 gap-3">
          {addModal === 'wagon' ? (
            <>
              {[['serialNumber','Serial number'],['capacityTonnes','Capacity (tonnes)'],['manufactureYear','Year']].map(([k,l]) => (
                <div key={k}><label className="label">{l}</label><input value={form[k]||''} onChange={e=>setForm((p:any)=>({...p,[k]:e.target.value}))} className="input" /></div>
              ))}
              <div><label className="label">Type</label>
                <select value={form.wagonType||''} onChange={e=>setForm((p:any)=>({...p,wagonType:e.target.value}))} className="select">
                  <option value="">Select…</option>
                  {['OPEN_GONDOLA','FLAT','HOPPER','COVERED_VAN','TANKER','CONTAINER_FLAT'].map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select></div>
            </>
          ) : (
            <>
              {[['serialNumber','Serial number'],['model','Model'],['manufacturer','Manufacturer'],['maxWagonCapacity','Max wagons']].map(([k,l]) => (
                <div key={k}><label className="label">{l}</label><input value={form[k]||''} onChange={e=>setForm((p:any)=>({...p,[k]:e.target.value}))} className="input" /></div>
              ))}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setAddModal(null)} className="btn btn-secondary">Cancel</button>
          <button onClick={submitAdd} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
