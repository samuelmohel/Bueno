'use client';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { routesApi } from '@/lib/api';
import { Plus, Route as RouteIcon } from 'lucide-react';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = () => routesApi.getAll().then(r => setRoutes(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    await routesApi.create(form);
    setModal(false); setForm({}); load();
    setSaving(false);
  };

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Routes</h1>
          <p className="page-subtitle">{routes.length} active rail corridors</p>
        </div>
        <button onClick={() => { setModal(true); setForm({}); }} className="btn btn-primary"><Plus size={13} /> Add route</button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {routes.map((r: any) => (
          <div key={r.id} className="card flex items-center gap-6">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <RouteIcon size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{r.routeName}</div>
              <div className="text-xs text-gray-500 mt-0.5">{r.originTerminal} → {r.destinationTerminal}</div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
              <div><div className="text-[10px] text-gray-400">Distance</div><div className="text-xs font-medium">{r.distanceKm} km</div></div>
              <div><div className="text-[10px] text-gray-400">Est. duration</div><div className="text-xs font-medium">{r.estimatedDurationHr} hrs</div></div>
            </div>
            <div className={`badge ${r.active ? 'badge-green' : 'badge-gray'}`}>{r.active ? 'Active' : 'Inactive'}</div>
          </div>
        ))}
        {!routes.length && (
          <div className="card text-center py-12">
            <RouteIcon size={24} className="text-gray-200 mx-auto mb-2" />
            <div className="text-sm font-medium text-gray-600 mb-1">No routes yet</div>
            <div className="text-xs text-gray-400">Add your first rail corridor to get started</div>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Add route">
        <div className="space-y-3">
          {[['routeName','Route name','text'],['originTerminal','Origin terminal','text'],['destinationTerminal','Destination terminal','text'],['distanceKm','Distance (km)','number'],['estimatedDurationHr','Est. duration (hrs)','number']].map(([k,l,t]) => (
            <div key={k}><label className="label">{l}</label>
              <input type={t} value={form[k]||''} onChange={e=>setForm((p:any)=>({...p,[k]:e.target.value}))} className="input" /></div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModal(false)} className="btn btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save route'}</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
