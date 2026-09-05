'use client';

import { useEffect, useState, useRef } from 'react';
import { trackingApi } from '@/lib/api';
import { useFleetTracking } from '@/lib/socket';
import RailTelemetryCard from '@/components/RailTelemetryCard';
import AutomatedManifestModal from '@/components/AutomatedManifestModal';

// ─── Nigeria Rail Corridor Coordinates (Western Corridor: Apapa ➔ Ewekoro ➔ Abeokuta ➔ Moniya) ───
const NIGERIA_CENTER: [number, number] = [6.9500, 3.3500];

const WESTERN_CORRIDOR_WAYPOINTS: [number, number][] = [
  [6.4500, 3.3600], // Apapa Port Terminal
  [6.6000, 3.3400], // Agege Freight Yard
  [6.8974, 3.2141], // Ewekoro HBM Siding
  [7.1500, 3.3500], // Abeokuta Railway Station
  [7.4800, 3.9000], // Moniya Dry Port Ibadan
];

const SEED_ACTIVE_LOCOS = [
  {
    id: 'L2205',
    serialNumber: 'LOC-L2205',
    model: 'GE C22-7i Heavy Freight Diesel-Electric',
    status: 'IN_USE',
    fuelLevelPercent: 82,
    currentLat: 6.9800,
    currentLng: 3.2800,
    assignedDriver: { user: { fullName: 'Babatunde Adeleke (NRC Engineer)' } },
    cargoOfficer: 'Ade Bello (EWK-01)',
    origin: 'EWK',
    destination: 'MNY',
    company: 'HUAXIN BUILDING MATERIALS NIG PLC',
    quantity: '27600',
    tripId: 'TRIP-001',
  },
  {
    id: 'L2206',
    serialNumber: 'LOC-L2206',
    model: 'EMD GT26CW-2 Heavy Hauler',
    status: 'IN_USE',
    fuelLevelPercent: 45,
    currentLat: 7.2200,
    currentLng: 3.5500,
    assignedDriver: { user: { fullName: 'Samuel Okafor (NRC Engineer)' } },
    cargoOfficer: 'Musa Ibrahim (MNY-01)',
    origin: 'EWK',
    destination: 'MNY',
    company: 'Purechem Cement Industries Ltd',
    quantity: '18400',
    tripId: 'TRIP-002',
  },
  {
    id: 'L2207',
    serialNumber: 'LOC-L2207',
    model: 'DF8B Rail Freight Engine',
    status: 'AVAILABLE',
    fuelLevelPercent: 95,
    currentLat: 6.8974,
    currentLng: 3.2141,
    assignedDriver: { user: { fullName: 'Tunde Bakare (NRC Engineer)' } },
    cargoOfficer: 'Ade Bello (EWK-01)',
    origin: 'EWK',
    destination: 'MNY',
    company: 'BUA Cement Nigeria',
    quantity: '23000',
    tripId: 'TRIP-003',
  },
];

const STATUS_COLOR: Record<string, string> = {
  IN_USE:      'bg-blue-100 text-blue-800 border-blue-200',
  AVAILABLE:   'bg-emerald-100 text-emerald-800 border-emerald-200',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
};

function LocoCard({ loco, selected, onClick }: { loco: any; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
        selected ? 'border-[#62BC37] bg-emerald-50/50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-black text-slate-900">{loco.serialNumber}</span>
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${STATUS_COLOR[loco.status] ?? 'bg-slate-100 text-slate-600'}`}>
          {loco.status.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 font-medium mt-1 truncate">{loco.model}</p>
      {loco.assignedDriver && (
        <p className="text-[11px] text-slate-600 font-bold mt-1">🧑 Driver: {loco.assignedDriver.user?.fullName}</p>
      )}
      <div className="flex items-center justify-between mt-2 text-xs font-mono">
        <span className="text-slate-600 font-bold">⛽ {loco.fuelLevelPercent}%</span>
        {loco.currentLat ? (
          <span className="text-[#62BC37] font-black flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#62BC37] animate-ping inline-block" />
            LIVE SATELLITE
          </span>
        ) : (
          <span className="text-slate-400 font-bold">○ Offline</span>
        )}
      </div>
    </button>
  );
}

function LeafletMap({ locos, selectedId }: { locos: any[]; selectedId?: string }) {
  const mapRef = useRef<any>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapElRef.current!).setView(NIGERIA_CENTER, 8);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors | Bueno Railway OS Satellite Telemetry',
      }).addTo(map);

      // Polyline for Western Rail Corridor
      L.polyline(WESTERN_CORRIDOR_WAYPOINTS, {
        color: '#0E4B88',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 8',
      }).addTo(map);

      // Station Waypoint Markers
      const stationNodes = [
        { name: 'Apapa Maritime Port Terminal', coords: [6.4500, 3.3600] as [number, number] },
        { name: 'Ewekoro HBM Siding (EWK)', coords: [6.8974, 3.2141] as [number, number] },
        { name: 'Abeokuta Freight Hub (ABK)', coords: [7.1500, 3.3500] as [number, number] },
        { name: 'Moniya Container Dry Port (MNY)', coords: [7.4800, 3.9000] as [number, number] },
      ];

      stationNodes.forEach(node => {
        const circle = L.circleMarker(node.coords, {
          radius: 8,
          fillColor: '#62BC37',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map);

        circle.bindPopup(`<b>${node.name}</b><br/><span style="font-size:10px;color:#666;">Active Railway Siding & Freight Hub</span>`);
      });

      mapRef.current = { map, L };
    });

    return () => {
      mapRef.current?.map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const { map, L } = mapRef.current;

    locos.forEach((loco) => {
      if (!loco.currentLat || !loco.currentLng) return;

      const pos: [number, number] = [loco.currentLat, loco.currentLng];
      const isSelected = loco.id === selectedId;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="
            background:${isSelected ? '#62BC37' : '#0E4B88'};
            color:white; padding:5px 10px; border-radius:10px;
            font-size:11px; font-weight:800; font-family:monospace; white-space:nowrap;
            box-shadow:0 4px 12px rgba(0,0,0,0.4);
            border:2px solid ${isSelected ? '#ffffff' : '#62BC37'};
            display:flex; align-items:center; gap:4px;
          ">
            <span>🚂</span> <span>${loco.serialNumber}</span>
          </div>`,
        iconAnchor: [45, 20],
      });

      if (markersRef.current[loco.id]) {
        markersRef.current[loco.id].setLatLng(pos).setIcon(icon);
      } else {
        const marker = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:180px; font-family:sans-serif;">
              <strong style="color:#0E4B88;">${loco.serialNumber}</strong><br/>
              <span style="font-size:11px; color:#444;">${loco.model}</span><br/>
              <hr style="margin:4px 0; border:0; border-top:1px solid #eee;"/>
              <span style="font-size:11px;">Fuel: <b>${loco.fuelLevelPercent}%</b></span><br/>
              <span style="font-size:11px;">Driver: <b>${loco.assignedDriver?.user?.fullName ?? 'Unassigned'}</b></span><br/>
              <span style="font-size:10px; color:#62BC37; font-weight:bold;">● GPS SATELLITE LIVE</span>
            </div>
          `);
        markersRef.current[loco.id] = marker;
      }
    });

    if (selectedId) {
      const sel = locos.find((l) => l.id === selectedId);
      if (sel?.currentLat) map.panTo([sel.currentLat, sel.currentLng], { animate: true });
    }
  }, [locos, selectedId]);

  return <div ref={mapElRef} className="w-full h-full rounded-2xl z-0" />;
}

export default function TrackingPage() {
  const [locos, setLocos] = useState<any[]>(SEED_ACTIVE_LOCOS);
  const [selectedId, setSelectedId] = useState<string | undefined>('L2205');
  const [loading, setLoading] = useState(false);
  const [activeManifestTrip, setActiveManifestTrip] = useState<any | null>(null);

  useEffect(() => {
    trackingApi.live()
      .then((r) => {
        if (r.data && r.data.length > 0) setLocos(r.data);
      })
      .catch(() => {});
  }, []);

  useFleetTracking((update: any) => {
    setLocos((prev) =>
      prev.map((l) =>
        l.id === update.locoId
          ? { ...l, currentLat: update.lat, currentLng: update.lng, fuelLevelPercent: update.fuelLevelPercent ?? l.fuelLevelPercent }
          : l,
      ),
    );
  });

  const online = locos.filter((l) => l.currentLat);
  const offline = locos.filter((l) => !l.currentLat);
  const selectedLoco = locos.find(l => l.id === selectedId) || locos[0];

  return (
    <div className="flex flex-col lg:flex-row h-screen lg:h-[calc(100vh-64px)] overflow-hidden font-sans bg-slate-100">
      {/* ── Sidebar ── */}
      <aside className="w-full lg:w-96 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col max-h-[45vh] lg:max-h-full">
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">SATELLITE FREIGHT TRACKING</span>
            <h2 className="font-black text-sm text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>Western Rail Corridor Fleet</h2>
          </div>
          <span className="text-xs font-mono font-bold bg-[#62BC37] text-white px-2.5 py-1 rounded-lg">
            {online.length} Active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {online.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">Active Heavy Freight Engines</p>
              {online.map((l) => (
                <LocoCard key={l.id} loco={l} selected={selectedId === l.id} onClick={() => setSelectedId(l.id)} />
              ))}
            </div>
          )}

          {offline.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1 mt-2">Stationary / Depot Engines</p>
              {offline.map((l) => (
                <LocoCard key={l.id} loco={l} selected={selectedId === l.id} onClick={() => setSelectedId(l.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Generate Official Manifest Button */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <button
            onClick={() => setActiveManifestTrip(selectedLoco)}
            className="w-full bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>📄 Generate Official Freight Manifest</span>
          </button>
        </div>
      </aside>

      {/* ── Main Map & Telemetry Dashboard Area ── */}
      <main className="flex-1 p-4 flex flex-col space-y-4 overflow-y-auto min-w-0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />

        {/* Interactive Satellite GPS Freight Map */}
        <div className="h-[50vh] lg:h-[58vh] rounded-3xl overflow-hidden shadow-md border border-slate-200 relative bg-slate-900">
          <LeafletMap locos={locos} selectedId={selectedId} />
        </div>

        {/* Real-time Hardware Telemetry Sensor Matrix */}
        <RailTelemetryCard locomotiveId={selectedLoco?.id || 'L2205'} />
      </main>

      {/* Automated Consignment Manifest Modal */}
      {activeManifestTrip && (
        <AutomatedManifestModal trip={activeManifestTrip} onClose={() => setActiveManifestTrip(null)} />
      )}
    </div>
  );
}
