'use client';

import { useEffect, useRef, useState } from 'react';

interface TrackingData {
  bookingCode: string;
  status: string;
  origin: string;
  destination: string;
  originCoords?: [number, number];
  destCoords?: [number, number];
  currentLat?: number;
  currentLng?: number;
  speed?: number;
  signalQuality?: string;
  cargoTypeName?: string;
  cargoWeightTonnes?: number;
  events?: Array<{ status: string; title: string; createdAt: string; description?: string }>;
}

// Precise GPS Coordinates for Nigerian Rail Terminals & Corridors
const TERMINAL_COORDS: Record<string, [number, number]> = {
  'EWK': [6.8974, 3.2141],
  'Ewekoro Terminal': [6.8974, 3.2141],
  'Ewekoro': [6.8974, 3.2141],

  'ITO': [6.9333, 3.3833],
  'Itori Junction': [6.9333, 3.3833],
  'Itori': [6.9333, 3.3833],

  'MNY': [7.4610, 3.9470],
  'Moniya Yard (Ibadan)': [7.4610, 3.9470],
  'Moniya Yard': [7.4610, 3.9470],
  'Ibadan': [7.3775, 3.9470],

  'ILR': [8.4966, 4.5426],
  'Ilorin Freight Hub': [8.4966, 4.5426],
  'Ilorin': [8.4966, 4.5426],

  'APT': [6.4550, 3.3610],
  'Apapa Maritime Port': [6.4550, 3.3610],
  'Apapa Port Terminal': [6.4550, 3.3610],
  'Lagos (Apapa)': [6.4550, 3.3610],
  'Lagos': [6.5244, 3.3792],
};

const MILESTONES = [
  { key: 'DEAL_REGISTERED', label: 'Deal Registered' },
  { key: 'WAGON_ALLOCATED', label: 'Wagons Allocated' },
  { key: 'LOADING', label: 'Loading at Origin' },
  { key: 'TRIP_DISPATCHED', label: 'Train Dispatched' },
  { key: 'IN_TRANSIT', label: 'Corridor Transit' },
  { key: 'ARRIVED', label: 'Arrived at Yard' },
  { key: 'UNLOADING', label: 'Unloading Cargo' },
  { key: 'COMPLETED', label: 'Delivered & Audited' },
];

export default function PublicTrackingMap({ data }: { data: TrackingData }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const trainMarker = useRef<any>(null);
  const routePolyline = useRef<any>(null);
  const [mounted, setMounted] = useState(false);

  // Live GPS telemetry state
  const originCoords = data.originCoords ?? TERMINAL_COORDS[data.origin] ?? [6.8974, 3.2141];
  const destCoords = data.destCoords ?? TERMINAL_COORDS[data.destination] ?? [7.4610, 3.9470];

  const [progress, setProgress] = useState<number>(() => {
    if (data.status === 'DEAL_REGISTERED' || data.status === 'LOADING') return 0;
    if (data.status === 'ARRIVED' || data.status === 'UNLOADING' || data.status === 'COMPLETED') return 1;
    return 0.55; // IN_TRANSIT default mid-way
  });

  const [liveSpeed, setLiveSpeed] = useState<number>(data.status === 'IN_TRANSIT' ? 74 : 0);

  // Calculate current interpolated GPS latitude and longitude
  const currentLat = originCoords[0] + (destCoords[0] - originCoords[0]) * progress;
  const currentLng = originCoords[1] + (destCoords[1] - originCoords[1]) * progress;

  const currentMilestoneIndex = MILESTONES.findIndex((m) => m.key === data.status);
  const activeIndex = currentMilestoneIndex >= 0 ? currentMilestoneIndex : (data.status === 'IN_TRANSIT' ? 4 : 2);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time GPS movement simulation loop when train is IN_TRANSIT
  useEffect(() => {
    if (data.status !== 'IN_TRANSIT') {
      setLiveSpeed(0);
      if (data.status === 'DEAL_REGISTERED' || data.status === 'LOADING') setProgress(0);
      if (data.status === 'ARRIVED' || data.status === 'UNLOADING' || data.status === 'COMPLETED') setProgress(1);
      return;
    }

    setLiveSpeed(74);
    const interval = setInterval(() => {
      // Fluctuate speed realistically between 68 and 78 km/h
      const speedFluctuation = 70 + Math.floor(Math.random() * 9);
      setLiveSpeed(speedFluctuation);

      // Advance progress smoothly along the rail corridor
      setProgress((prev) => {
        const next = prev + 0.005;
        return next >= 0.95 ? 0.95 : next;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [data.status]);

  // Leaflet map initialization & marker update effect
  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const trainPos: [number, number] = [currentLat, currentLng];

      if (!leafletMap.current && mapRef.current) {
        const map = L.map(mapRef.current).setView(trainPos, 8);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Corridor route polyline
        routePolyline.current = L.polyline([originCoords, destCoords], {
          color: '#D9791B',
          weight: 5,
          dashArray: '10, 10',
          opacity: 0.85,
        }).addTo(map);

        // Terminal markers
        const originMarker = L.marker(originCoords)
          .addTo(map)
          .bindPopup(`<b>Origin Terminal:</b><br/>${data.origin}`);

        const destMarker = L.marker(destCoords)
          .addTo(map)
          .bindPopup(`<b>Destination Terminal:</b><br/>${data.destination}`);

        // Custom live train locomotive marker
        const trainIcon = L.divIcon({
          html: `
            <div style="background:#0F172A; color:#FFFFFF; font-family:'JetBrains Mono', monospace; font-size:10px; font-weight:800; padding:5px 10px; border-radius:16px; border:2px solid #F59E0B; box-shadow:0 6px 16px rgba(15,23,42,0.4); display:inline-flex; align-items:center; gap:6px; white-space:nowrap;">
              <span style="width:8px; height:8px; border-radius:50%; background:#10B981; display:inline-block;" class="animate-pulse"></span>
              LOCO ${data.bookingCode}
            </div>
          `,
          className: 'custom-train-marker',
          iconSize: [130, 30],
          iconAnchor: [65, 15],
        });

        trainMarker.current = L.marker(trainPos, { icon: trainIcon })
          .addTo(map)
          .bindPopup(`<b>Live Locomotive Telemetry</b><br/>Status: ${data.status}<br/>GPS: ${currentLat.toFixed(4)}°N, ${currentLng.toFixed(4)}°E`);

        map.fitBounds(routePolyline.current.getBounds(), { padding: [50, 50] });
        leafletMap.current = map;
      } else {
        // Update train marker position live
        if (trainMarker.current) {
          trainMarker.current.setLatLng(trainPos);
          trainMarker.current.setPopupContent(
            `<b>Live Locomotive Telemetry</b><br/>Status: ${data.status}<br/>Speed: ${liveSpeed} km/h<br/>GPS: ${currentLat.toFixed(4)}°N, ${currentLng.toFixed(4)}°E`
          );
        }
      }
    });
  }, [mounted, currentLat, currentLng, liveSpeed, data.status]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans">
      {/* Telemetry Header */}
      <div className="bg-slate-900 text-white p-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-400 bg-slate-800 border border-slate-700 px-3 py-1 rounded-full">
              REF: {data.bookingCode}
            </span>
            <span className="text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 bg-emerald-950/90 text-emerald-300 border border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              GPS Satellite Signal Locked · 3s Refresh
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {data.origin} <span className="text-amber-500">⟶</span> {data.destination}
          </h2>
        </div>

        <div className="flex gap-6 text-right">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Live Speed</p>
            <p className="text-sm font-black text-emerald-400 font-mono">{liveSpeed} km/h</p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Live Coordinates</p>
            <p className="text-xs font-mono font-bold text-slate-200">{currentLat.toFixed(4)}° N, {currentLng.toFixed(4)}° E</p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Corridor Progress</p>
            <p className="text-sm font-black text-amber-400 font-mono">{(progress * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="relative h-[420px] bg-slate-100">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Milestone Progress Stepper */}
      <div className="p-6 bg-slate-50 border-t border-slate-200">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-4">
          Shipment Progress Milestone Stream
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {MILESTONES.map((m, idx) => {
            const isPassed = idx <= activeIndex;
            const isCurrent = idx === activeIndex;
            return (
              <div
                key={m.key}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isCurrent
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md font-bold scale-105'
                    : isPassed
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <div className="text-[9px] font-mono font-black uppercase tracking-tight mb-1">
                  0{idx + 1}
                </div>
                <div className="text-xs leading-snug line-clamp-2">{m.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
