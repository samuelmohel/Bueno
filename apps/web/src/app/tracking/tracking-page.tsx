'use client';

import { useEffect, useState, useRef } from 'react';
import { trackingApi } from '@/lib/api';
import { useFleetTracking } from '@/lib/socket';

// ─── Nigeria rail corridor waypoints (approx) ─────────────────────────────────
const NIGERIA_CENTER: [number, number] = [9.0820, 8.6753];

// ─── Status colors ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  IN_USE:      'bg-blue-100 text-blue-700',
  AVAILABLE:   'bg-green-100 text-green-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
};

// ─── Loco Card ────────────────────────────────────────────────────────────────
function LocoCard({ loco, selected, onClick }: { loco: any; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-white hover:border-blue-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-gray-800">{loco.serialNumber}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[loco.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {loco.status.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">{loco.model}</p>
      {loco.assignedDriver && (
        <p className="text-xs text-gray-400 mt-1">🧑 {loco.assignedDriver.user?.fullName}</p>
      )}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>⛽ {loco.fuelLevelPercent}%</span>
        {loco.currentLat && (
          <span className="text-green-600 font-medium">● GPS LIVE</span>
        )}
        {!loco.currentLat && (
          <span className="text-gray-400">○ No GPS</span>
        )}
      </div>
    </button>
  );
}

// ─── Map Component (dynamic import to avoid SSR issues with Leaflet) ──────────
// This component is wrapped in a dynamic import in the parent
function LeafletMap({ locos, selectedId }: { locos: any[]; selectedId?: string }) {
  const mapRef    = useRef<any>(null);
  const mapElRef  = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, any>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mapRef.current) return; // already initialized

    // Dynamically import leaflet (must run client-side only)
    import('leaflet').then((L) => {
      // Fix default marker icon paths for Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapElRef.current!).setView(NIGERIA_CENTER, 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = { map, L };
    });

    return () => {
      mapRef.current?.map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers whenever locos change
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
            background:${isSelected ? '#2563eb' : '#1e40af'};
            color:white; padding:4px 8px; border-radius:8px;
            font-size:11px; font-weight:600; white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.3);
            border:2px solid ${isSelected ? '#93c5fd' : 'transparent'};
          ">
            🚂 ${loco.serialNumber}
          </div>`,
        iconAnchor: [40, 20],
      });

      if (markersRef.current[loco.id]) {
        markersRef.current[loco.id].setLatLng(pos).setIcon(icon);
      } else {
        const marker = L.marker(pos, { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width:160px">
              <strong>${loco.serialNumber}</strong><br/>
              ${loco.model}<br/>
              Fuel: ${loco.fuelLevelPercent}%<br/>
              Driver: ${loco.assignedDriver?.user?.fullName ?? 'Unassigned'}
            </div>
          `);
        markersRef.current[loco.id] = marker;
      }
    });

    // Pan to selected loco
    if (selectedId) {
      const sel = locos.find((l) => l.id === selectedId);
      if (sel?.currentLat) map.panTo([sel.currentLat, sel.currentLng], { animate: true });
    }
  }, [locos, selectedId]);

  return <div ref={mapElRef} className="w-full h-full rounded-2xl z-0" />;
}

// ─── Tracking Page ────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const [locos, setLocos]       = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [loading, setLoading]   = useState(true);

  // Initial load
  useEffect(() => {
    trackingApi.live().then((r) => setLocos(r.data)).finally(() => setLoading(false));
  }, []);

  // Live GPS updates via WebSocket
  useFleetTracking((update: any) => {
    setLocos((prev) =>
      prev.map((l) =>
        l.id === update.locoId
          ? { ...l, currentLat: update.lat, currentLng: update.lng, fuelLevelPercent: update.fuelLevelPercent ?? l.fuelLevelPercent }
          : l,
      ),
    );
  });

  const online  = locos.filter((l) => l.currentLat);
  const offline = locos.filter((l) => !l.currentLat);

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-80 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Live Fleet Tracking</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {online.length} online · {offline.length} offline
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {online.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase px-1 mb-1">Online</p>
              {online.map((l) => (
                <LocoCard key={l.id} loco={l} selected={selectedId === l.id} onClick={() => setSelectedId(l.id)} />
              ))}
            </>
          )}

          {offline.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase px-1 mt-3 mb-1">Offline / No GPS</p>
              {offline.map((l) => (
                <LocoCard key={l.id} loco={l} selected={selectedId === l.id} onClick={() => setSelectedId(l.id)} />
              ))}
            </>
          )}

          {!loading && locos.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <p className="text-3xl mb-2">🚂</p>
              <p>No active locomotives</p>
              <p className="text-xs mt-1">GPS pings will appear here</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Map ── */}
      <main className="flex-1 p-4 bg-gray-100">
        {/* Load Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div className="h-full rounded-2xl overflow-hidden shadow-sm border border-gray-200">
          <LeafletMap locos={locos} selectedId={selectedId} />
        </div>
      </main>
    </div>
  );
}
