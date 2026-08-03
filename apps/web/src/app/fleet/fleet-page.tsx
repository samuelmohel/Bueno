'use client';

import { useEffect, useState } from 'react';
import { fleetApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type Wagon = { id: string; serialNumber: string; wagonType: string; capacityTonnes: number; status: string; condition: string; manufactureYear: number; totalTrips: number; notes?: string; lastInspectedAt?: string };
type Loco  = { id: string; serialNumber: string; model: string; manufacturer: string; maxWagonCapacity: number; fuelLevelPercent: number; engineHours: number; status: string; condition: string; currentLat?: number; currentLng?: number; assignedDriver?: any };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  AVAILABLE:   'bg-green-100 text-green-700',
  IN_USE:      'bg-blue-100  text-blue-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
};
const CONDITION_COLOR: Record<string, string> = {
  EXCELLENT: 'text-green-600',
  GOOD:      'text-blue-600',
  FAIR:      'text-orange-500',
};

function Badge({ v, map }: { v: string; map: Record<string, string> }) {
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[v] ?? 'bg-gray-100 text-gray-600'}`}>{v}</span>;
}

function StatCard({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color ?? 'text-gray-900'}`}>{value ?? '—'}</p>
    </div>
  );
}

// ─── Fuel Bar ─────────────────────────────────────────────────────────────────
function FuelBar({ pct }: { pct: number }) {
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value ?? '—'}</span>
    </div>
  );
}

// ─── Wagon Modal ──────────────────────────────────────────────────────────────
function WagonModal({ wagon, onClose }: { wagon: Wagon; onClose: () => void }) {
  return (
    <Modal title={`Wagon — ${wagon.serialNumber}`} onClose={onClose}>
      <Field label="Serial Number"   value={wagon.serialNumber} />
      <Field label="Type"            value={wagon.wagonType.replace(/_/g, ' ')} />
      <Field label="Capacity"        value={`${wagon.capacityTonnes} tonnes`} />
      <Field label="Status"          value={<Badge v={wagon.status}    map={STATUS_COLOR} />} />
      <Field label="Condition"       value={<span className={CONDITION_COLOR[wagon.condition]}>{wagon.condition}</span>} />
      <Field label="Manufacture Year" value={wagon.manufactureYear} />
      <Field label="Total Trips"     value={wagon.totalTrips} />
      <Field label="Last Inspected"  value={wagon.lastInspectedAt ? new Date(wagon.lastInspectedAt).toLocaleDateString() : 'Never'} />
      {wagon.notes && <Field label="Notes" value={wagon.notes} />}
    </Modal>
  );
}

// ─── Loco Modal ───────────────────────────────────────────────────────────────
function LocoModal({ loco, onClose }: { loco: Loco; onClose: () => void }) {
  return (
    <Modal title={`Locomotive — ${loco.serialNumber}`} onClose={onClose}>
      <Field label="Serial Number"     value={loco.serialNumber} />
      <Field label="Model"             value={loco.model} />
      <Field label="Manufacturer"      value={loco.manufacturer} />
      <Field label="Max Wagons"        value={loco.maxWagonCapacity} />
      <Field label="Engine Hours"      value={`${loco.engineHours.toLocaleString()} hrs`} />
      <Field label="Status"            value={<Badge v={loco.status}    map={STATUS_COLOR} />} />
      <Field label="Condition"         value={<span className={CONDITION_COLOR[loco.condition]}>{loco.condition}</span>} />
      <div className="py-2">
        <span className="text-sm text-gray-500">Fuel Level</span>
        <div className="mt-1"><FuelBar pct={loco.fuelLevelPercent} /></div>
      </div>
      <Field label="GPS"
        value={loco.currentLat
          ? `${loco.currentLat.toFixed(4)}, ${loco.currentLng?.toFixed(4)}`
          : 'No signal'}
      />
      <Field label="Assigned Driver"
        value={loco.assignedDriver?.user?.fullName ?? 'Unassigned'}
      />
    </Modal>
  );
}

// ─── Fleet Page ───────────────────────────────────────────────────────────────
export default function FleetPage() {
  const [wagons, setWagons]       = useState<Wagon[]>([]);
  const [locos, setLocos]         = useState<Loco[]>([]);
  const [wStats, setWStats]       = useState<any>(null);
  const [selectedWagon, setSelectedWagon] = useState<Wagon | null>(null);
  const [selectedLoco, setSelectedLoco]   = useState<Loco | null>(null);
  const [tab, setTab]             = useState<'wagons' | 'locos'>('wagons');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fleetApi.wagons(),
      fleetApi.locos(),
      fleetApi.wagonStats(),
    ]).then(([w, l, ws]) => {
      setWagons(w.data);
      setLocos(l.data);
      setWStats(ws.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-gray-500 text-sm mt-1">Wagons and locomotives</p>
        </div>
      </div>

      {/* ── Wagon Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Wagons"  value={wStats?.total}       />
        <StatCard label="Available"     value={wStats?.available}   color="text-green-600" />
        <StatCard label="In Use"        value={wStats?.inUse}       color="text-blue-600" />
        <StatCard label="Maintenance"   value={wStats?.maintenance} color="text-orange-500" />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['wagons', 'locos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'wagons' ? `Wagons (${wagons.length})` : `Locomotives (${locos.length})`}
          </button>
        ))}
      </div>

      {/* ── Wagons Table ── */}
      {tab === 'wagons' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Serial No.', 'Type', 'Capacity', 'Status', 'Condition', 'Trips', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wagons.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedWagon(w)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{w.serialNumber}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{w.wagonType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-gray-700">{w.capacityTonnes}t</td>
                  <td className="px-4 py-3"><Badge v={w.status} map={STATUS_COLOR} /></td>
                  <td className="px-4 py-3"><span className={`text-xs font-medium ${CONDITION_COLOR[w.condition]}`}>{w.condition}</span></td>
                  <td className="px-4 py-3 text-gray-500">{w.totalTrips}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium" onClick={(e) => { e.stopPropagation(); setSelectedWagon(w); }}>View</button>
                  </td>
                </tr>
              ))}
              {wagons.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No wagons found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Locos Table ── */}
      {tab === 'locos' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Serial No.', 'Model', 'Driver', 'Fuel', 'Engine Hrs', 'Status', 'GPS', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {locos.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedLoco(l)}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{l.serialNumber}</td>
                  <td className="px-4 py-3 text-gray-700">{l.model}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{l.assignedDriver?.user?.fullName ?? '—'}</td>
                  <td className="px-4 py-3 w-28"><FuelBar pct={l.fuelLevelPercent} /></td>
                  <td className="px-4 py-3 text-gray-500">{l.engineHours.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge v={l.status} map={STATUS_COLOR} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${l.currentLat ? 'text-green-600' : 'text-gray-400'}`}>
                      {l.currentLat ? '● ONLINE' : '○ OFFLINE'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium" onClick={(e) => { e.stopPropagation(); setSelectedLoco(l); }}>View</button>
                  </td>
                </tr>
              ))}
              {locos.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No locomotives found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {selectedWagon && <WagonModal wagon={selectedWagon} onClose={() => setSelectedWagon(null)} />}
      {selectedLoco  && <LocoModal  loco={selectedLoco}   onClose={() => setSelectedLoco(null)} />}
    </div>
  );
}
