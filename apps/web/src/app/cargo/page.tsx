'use client';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { cargoApi } from '@/lib/api';
import { Package, Plus } from 'lucide-react';

export default function CargoPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = () => cargoApi.getAll().then(r => setItems(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    await cargoApi.create(form);
    setModal(false); setForm({}); load();
    setSaving(false);
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cargo Types</h1>
          <p className="page-subtitle">Manage cargo presets used in the booking form</p>
        </div>
        <button onClick={() => { setModal(true); setForm({}); }} className="btn btn-primary"><Plus size={13} /> Add cargo type</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th className="th">Name</th><th className="th">Default capacity / wagon</th>
            <th className="th">Density (t/m³)</th><th className="th">Wagon type required</th>
            <th className="th">Special handling</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {items.map((c: any) => (
              <tr key={c.id} className="tr">
                <td className="td font-medium flex items-center gap-2"><Package size={13} className="text-gray-400" />{c.name}</td>
                <td className="td">{c.defaultWagonCapacityT}t</td>
                <td className="td">{c.densityTPerM3 ?? '—'}</td>
                <td className="td text-gray-500">{c.wagonTypeRequired?.replace(/_/g, ' ') ?? 'Any'}</td>
                <td className="td">{c.requiresSpecialWagon ? <span className="badge badge-orange">Special</span> : <span className="badge badge-gray">Standard</span>}</td>
                <td className="td"><span className={`badge ${c.active ? 'badge-green' : 'badge-gray'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add cargo type">
        <div className="space-y-3">
          {[['name','Name','text'],['defaultWagonCapacityT','Default wagon capacity (tonnes)','number'],['densityTPerM3','Density t/m³ (optional)','number']].map(([k,l,t]) => (
            <div key={k}><label className="label">{l}</label>
              <input type={t} value={form[k]||''} onChange={e=>setForm((p:any)=>({...p,[k]:e.target.value}))} className="input" /></div>
          ))}
          <div><label className="label">Handling notes</label>
            <textarea value={form.handlingNotes||''} onChange={e=>setForm((p:any)=>({...p,handlingNotes:e.target.value}))} rows={2} className="input resize-none" /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!form.requiresSpecialWagon} onChange={e=>setForm((p:any)=>({...p,requiresSpecialWagon:e.target.checked}))} className="accent-blue-600" />
            <span className="text-xs text-gray-700">Requires special wagon</span>
          </label>
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
