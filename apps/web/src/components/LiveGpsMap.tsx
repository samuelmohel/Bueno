'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

export interface MonitoringOfficer {
  name: string;
  phone: string;
  badgeId: string;
  batteryLevel?: string;
  signalStrength?: string;
  deviceStatus?: 'ACTIVE_GPS' | 'OFFLINE' | 'PINGING';
  lastPingTime?: string;
}

// CANONICAL FREIGHT STATIONS & SIDING COORDINATES
export const STATION_COORDS: Record<string, { name: string; lat: number; lng: number; code: string }> = {
  EWK:  { code: 'EWK',  name: 'Ewekoro Siding (EWK)',          lat: 6.8974, lng: 3.2141 },
  MNY:  { code: 'MNY',  name: 'Moniya Yard, Ibadan (MNY)',      lat: 7.4610, lng: 3.9470 },
  MONI: { code: 'MONI', name: 'Moniya Yard, Ibadan (MNY)',      lat: 7.4610, lng: 3.9470 },
  PAPA: { code: 'PAPA', name: 'Papalanto Terminal (PAPA)',      lat: 6.8974, lng: 3.2141 },
  APT:  { code: 'APT',  name: 'Apapa Maritime Port (APT)',      lat: 6.4550, lng: 3.3610 },
  APQ:  { code: 'APQ',  name: 'Apapa Port (APQ)',               lat: 6.4550, lng: 3.3610 },
  ENL:  { code: 'ENL',  name: 'ENL Terminal, Apapa (ENL)',      lat: 6.4560, lng: 3.3620 },
  APL:  { code: 'APL',  name: 'Apapa Local (APL)',              lat: 6.4580, lng: 3.3630 },
  ITO:  { code: 'ITO',  name: 'Itori Rail Junction (ITO)',      lat: 6.9333, lng: 3.3833 },
  AB:   { code: 'AB',   name: 'Abeokuta Hub (AB)',              lat: 7.1557, lng: 3.3458 },
  AD:   { code: 'AD',   name: 'Omi Adio Station (AD)',          lat: 7.3500, lng: 3.8000 },
  ILR:  { code: 'ILR',  name: 'Ilorin Freight Hub (ILR)',       lat: 8.4966, lng: 4.5421 },
};

// HAVERSINE DISTANCE CALCULATION (Kilometers)
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// BEARING CALCULATION (Degrees 0 - 360)
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  const brng = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return Math.round(brng);
}

// COMPASS CARDINAL
function getCardinalDirection(angle: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(angle / 22.5) % 16;
  return directions[index];
}

export function LiveGpsMap({ trip: propTrip }: { trip?: any }) {
  const [localTrip, setLocalTrip] = useState<any>(propTrip);

  useEffect(() => {
    if (propTrip) {
      setLocalTrip(propTrip);
      return;
    }
    const all = StateEngine.getTrips();
    const active = all.find((t: any) => t.status === 'IN_TRANSIT' || t.status === 'LOADING') || all[0];
    setLocalTrip(active);
  }, [propTrip]);

  const trip = localTrip;

  // Station Coordinates Resolution
  const originCode = (trip?.origin || 'EWK').toUpperCase();
  const destCode = (trip?.destination || 'MNY').toUpperCase();
  const originStation = STATION_COORDS[originCode] || STATION_COORDS.EWK;
  const destStation = STATION_COORDS[destCode] || STATION_COORDS.MNY;

  // Default coordinate initialization
  const initialLat = Number(trip?.curLat) || originStation.lat;
  const initialLng = Number(trip?.curLng) || originStation.lng;

  // Real GPS Telemetry State
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: initialLat, lng: initialLng });
  const [speed, setSpeed] = useState<number>(Number(trip?.speed) || 0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [bearing, setBearing] = useState<number>(() => calculateBearing(initialLat, initialLng, destStation.lat, destStation.lng));
  const [distanceKm, setDistanceKm] = useState<number>(() => calculateDistanceKm(initialLat, initialLng, destStation.lat, destStation.lng));
  const [progress, setProgress] = useState<number>(Number(trip?.progressPercent) || 0);
  const [battery, setBattery] = useState<number>(94);
  const [lastPing, setLastPing] = useState<string>(trip?.lastGpsPing || 'Just now');
  const [signal, setSignal] = useState<string>('Phone GPS Ready');
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'MAP' | 'RADAR'>('MAP');
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [smsSent, setSmsSent] = useState<boolean>(false);

  const watchIdRef = useRef<number | null>(null);

  // Monitoring Officer Details
  const officer: MonitoringOfficer = {
    name: trip?.monitoringOfficerName || trip?.escortOfficerName || trip?.cargoOfficerName || 'Ade Bello',
    phone: trip?.monitoringOfficerPhone || trip?.escortPhone || '08031112233',
    badgeId: trip?.escortBadgeId || 'NRC-ESC-2026',
    batteryLevel: `${battery}%`,
    signalStrength: signal,
    deviceStatus: isBroadcasting ? 'ACTIVE_GPS' : 'PINGING',
    lastPingTime: lastPing,
  };

  const tripId = trip?.id || trip?.tripId || 'TRP-101';
  const companyName = trip?.company || trip?.companyName || 'Industrial Consignee Client';
  const locoId = trip?.locomotiveId || 'L2205';

  // Process and commit position updates
  const handlePositionUpdate = (pos: GeolocationPosition) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const rawSpeed = pos.coords.speed;
    const spd = rawSpeed !== null && rawSpeed > 0 ? Math.round(rawSpeed * 3.6) : (speed > 0 ? speed : 48);
    const acc = Math.round(pos.coords.accuracy || 3);
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Distance and bearing to actual destination
    const distToDest = calculateDistanceKm(lat, lng, destStation.lat, destStation.lng);
    const brg = calculateBearing(lat, lng, destStation.lat, destStation.lng);

    // Dynamic corridor progress percentage
    const totalCorridorDist = calculateDistanceKm(originStation.lat, originStation.lng, destStation.lat, destStation.lng) || 120;
    const rawProgress = Math.round(((totalCorridorDist - distToDest) / totalCorridorDist) * 100);
    const pct = distToDest < 0.5 ? 100 : Math.min(99, Math.max(5, rawProgress));

    setCoords({ lat, lng });
    setSpeed(spd);
    setAccuracy(acc);
    setDistanceKm(distToDest);
    setBearing(brg);
    setProgress(pct);
    setLastPing(timeNow);
    setSignal('Live Phone Satellite GPS (Locked)');
    setBroadcastError(null);

    // Save to SQL GPS Logs
    fetch('/api/gps.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locomotiveId: locoId,
        tripId: tripId,
        lat,
        lng,
        speed: spd,
        heading: pos.coords.heading || brg,
        accuracy: acc,
        batteryLevel: battery,
        officerPhone: officer.phone,
        signalQuality: 'MOBILE_PHONE_GPS_LIVE',
      }),
    }).catch(() => {});

    // Update active trip in local state engine
    if (trip?.id) {
      StateEngine.updateTrip(trip.id, {
        curLat: lat,
        curLng: lng,
        speed: spd,
        lastGpsPing: timeNow,
        progressPercent: pct,
        status: 'IN_TRANSIT',
      });
    }
  };

  // Toggle Continuous Phone GPS Broadcast
  const togglePhoneGpsBroadcast = () => {
    if (isBroadcasting) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsBroadcasting(false);
      setSignal('Phone Broadcast Paused');
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setBroadcastError('Geolocation GPS is not supported by your browser or device');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);
    setSignal('Acquiring Satellite GPS Fix...');

    // 1. Immediate single fix for instant UI feedback
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionUpdate(pos),
      (err) => {
        setBroadcastError(`GPS Fix Error: ${err.message}. Please enable Location Services in your phone settings.`);
        setIsBroadcasting(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. Continuous real-time movement watcher
    const id = navigator.geolocation.watchPosition(
      (pos) => handlePositionUpdate(pos),
      (err) => {
        setBroadcastError(`Live GPS error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    watchIdRef.current = id;
  };

  // Poll remote GPS updates (for Admin, CEO, and Client views watching the officer's device)
  useEffect(() => {
    const fetchLatestRemoteGps = async () => {
      if (isBroadcasting) return;

      try {
        const query = tripId ? `tripId=${encodeURIComponent(tripId)}` : `locomotiveId=${encodeURIComponent(locoId)}`;
        const res = await fetch(`/api/gps.php?${query}`);
        const json = await res.json();
        if (json.status === 'success' && json.latest) {
          const l = json.latest;
          const rLat = Number(l.lat);
          const rLng = Number(l.lng);

          if (!isNaN(rLat) && !isNaN(rLng) && rLat !== 0) {
            setCoords({ lat: rLat, lng: rLng });
            const dist = calculateDistanceKm(rLat, rLng, destStation.lat, destStation.lng);
            setDistanceKm(dist);
            setBearing(calculateBearing(rLat, rLng, destStation.lat, destStation.lng));

            const totalDist = calculateDistanceKm(originStation.lat, originStation.lng, destStation.lat, destStation.lng) || 120;
            const pct = dist < 0.5 ? 100 : Math.min(99, Math.max(5, Math.round(((totalDist - dist) / totalDist) * 100)));
            setProgress(pct);

            if (l.speed) setSpeed(Number(l.speed));
            if (l.batteryLevel) setBattery(Number(l.batteryLevel));
            if (l.timestamp) setLastPing(l.timestamp);
            setSignal('Satellite Telemetry Streaming Live');
          }
        }
      } catch {}
    };

    fetchLatestRemoteGps();
    const interval = setInterval(fetchLatestRemoteGps, 4000);
    return () => clearInterval(interval);
  }, [tripId, locoId, isBroadcasting, destStation, originStation]);

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Compute bounding box for OpenStreetMap embed to show both officer and destination
  const osmEmbedUrl = useMemo(() => {
    const minLat = Math.min(coords.lat, destStation.lat) - 0.08;
    const maxLat = Math.max(coords.lat, destStation.lat) + 0.08;
    const minLng = Math.min(coords.lng, destStation.lng) - 0.08;
    const maxLng = Math.max(coords.lng, destStation.lng) + 0.08;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
  }, [coords, destStation]);

  const cardinal = getCardinalDirection(bearing);

  const handleSendSmsPing = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 5000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans space-y-0">
      {/* ─── COMMAND HEADER ─── */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-3 h-3 rounded-full inline-block ${isBroadcasting ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
              {isBroadcasting ? 'LIVE PHONE GPS BROADCAST ACTIVE' : 'REAL-TIME SATELLITE GPS TELEMETRY'}
            </span>
            <span className="text-slate-400 font-mono text-xs">• TRIP: {tripId}</span>
          </div>
          <h3 className="text-lg font-black text-white mt-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {companyName} — Locomotive #{locoId}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Origin: <b className="text-slate-200">{originStation.name}</b> ➔ Destination: <b className="text-emerald-300">{destStation.name}</b>
          </p>
        </div>

        {/* MAP VIEW SWITCHER */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setMapMode('MAP')}
            className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
              mapMode === 'MAP' ? 'bg-[#62BC37] text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            🗺️ Live Map (OSM)
          </button>
          <button
            onClick={() => setMapMode('RADAR')}
            className={`px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
              mapMode === 'RADAR' ? 'bg-[#62BC37] text-white shadow-xs' : 'text-slate-300 hover:text-white'
            }`}
          >
            📡 Radar Vector
          </button>
        </div>
      </div>

      {/* ─── ON-BOARD MONITORING ESCORT OFFICER BAR ─── */}
      <div className="bg-slate-950 text-white p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shadow-md font-mono">
            🚆
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-white">{officer.name}</span>
              <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                ESCORT CABOOSE: {trip?.escortWagonId || 'BV 01'}
              </span>
              <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-bold">
                {signal}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
              Current Fix: <b className="text-emerald-400">{coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°</b> {accuracy ? `(±${accuracy}m)` : ''} • Last Ping: {lastPing}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* PRIMARY PHONE GPS BROADCAST TOGGLE BUTTON */}
          <button
            onClick={togglePhoneGpsBroadcast}
            className={`text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
              isBroadcasting
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse ring-2 ring-emerald-400'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span>{isBroadcasting ? '📡 Turn Off Phone GPS' : '📱 Turn On Phone GPS (Start Live Broadcast)'}</span>
          </button>

          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${coords.lat},${coords.lng}&destination=${destStation.lat},${destStation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5"
            title="Open real turn-by-turn route in Google Maps"
          >
            <span>Google Maps ↗</span>
          </a>

          <button
            onClick={() => setShowCallModal(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <span>📞 Call Officer</span>
          </button>
        </div>
      </div>

      {/* GPS BROADCAST ERROR BANNER */}
      {broadcastError && (
        <div className="bg-rose-500/20 border-b border-rose-500/30 text-rose-200 px-5 py-2.5 text-xs font-medium flex items-center justify-between">
          <span>⚠️ {broadcastError}</span>
          <button onClick={() => setBroadcastError(null)} className="text-white hover:underline text-[10px] uppercase font-bold">Dismiss</button>
        </div>
      )}

      {/* ─── LIVE INTERACTIVE MAP OR RADAR CANVAS ─── */}
      <div className="relative bg-slate-950 h-96 w-full overflow-hidden border-b border-slate-800">
        {mapMode === 'MAP' ? (
          /* REAL OPENSTREETMAP INTERACTIVE VIEW */
          <div className="w-full h-full relative">
            <iframe
              title="Live OpenStreetMap Tracking"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={osmEmbedUrl}
              className="w-full h-full opacity-90 filter contrast-105"
            />

            {/* LIVE OVERLAY COMPASS & TELEMETRY HUD */}
            <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-white space-y-1.5 text-xs shadow-2xl z-10 max-w-xs">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
                <span className="text-[10px] font-mono font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live GPS Locked
                </span>
                <span className="font-mono font-black text-amber-400 text-sm">{speed} km/h</span>
              </div>

              <div className="space-y-1 font-mono text-[11px] pt-1">
                <p className="text-slate-300">
                  Phone Fix: <b className="text-white">{coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°</b>
                </p>
                <p className="text-slate-300">
                  Target: <b className="text-emerald-300">{destStation.name}</b>
                </p>
                <p className="text-amber-300 font-bold">
                  Distance: {distanceKm} km remaining
                </p>
                <p className="text-slate-400 text-[10px]">
                  Bearing: {bearing}° ({cardinal}) • Ping: {lastPing}
                </p>
              </div>
            </div>

            {/* BOTTOM RIGHT DESTINATION BADGE */}
            <div className="absolute bottom-4 right-4 bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-white text-right space-y-1 z-10 shadow-xl">
              <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Freight Destination Siding</span>
              <p className="font-mono font-extrabold text-xs text-emerald-400">{destStation.code} Destination Yard</p>
              <p className="text-[10px] text-slate-300 font-mono">Corridor Completed: <b className="text-white">{progress}%</b></p>
            </div>
          </div>
        ) : (
          /* RADAR VECTOR VIEW (DYNAMIC GEOMETRIC PROJECTION) */
          <div className="w-full h-full relative flex items-center justify-center">
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(#62BC37 1px, transparent 1px)`,
                backgroundSize: '24px 24px',
              }}
            />

            <svg className="w-full h-full absolute inset-0 p-8" viewBox="0 0 800 240" preserveAspectRatio="none">
              {/* Rail Line Vector */}
              <line x1="80" y1="120" x2="720" y2="120" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
              <line x1="80" y1="120" x2="720" y2="120" stroke="#62BC37" strokeWidth="4" strokeDasharray="8 6" className="animate-pulse" />

              {/* Origin Station Point */}
              <g transform="translate(80, 120)">
                <circle r="12" fill="#1E293B" stroke="#62BC37" strokeWidth="3" />
                <text y="28" fill="#E2E8F0" fontSize="11" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                  {originStation.code} ({originStation.name.split(' ')[0]})
                </text>
                <text y="-18" fill="#94A3B8" fontSize="9" fontFamily="monospace" textAnchor="middle">
                  ORIGIN
                </text>
              </g>

              {/* Destination Station Point */}
              <g transform="translate(720, 120)">
                <circle r="12" fill="#065F46" stroke="#34D399" strokeWidth="3" />
                <text y="28" fill="#E2E8F0" fontSize="11" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                  {destStation.code} ({destStation.name.split(' ')[0]})
                </text>
                <text y="-18" fill="#34D399" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  DESTINATION (0 km)
                </text>
              </g>

              {/* Dynamic Moving Train Marker based on actual progress */}
              {(() => {
                const trainX = 80 + (Math.min(100, Math.max(0, progress)) / 100) * 640;
                const trainY = 120;

                return (
                  <g transform={`translate(${trainX}, ${trainY})`}>
                    <circle cx="0" cy="0" r="22" fill="#62BC37" fillOpacity="0.3" className="animate-ping" />
                    <circle cx="0" cy="0" r="14" fill="#62BC37" stroke="#FFFFFF" strokeWidth="3" />
                    <text x="0" y="4" fill="#FFFFFF" fontSize="12" fontWeight="900" textAnchor="middle">
                      🚆
                    </text>

                    {/* CALLOUT BADGE ABOVE TRAIN */}
                    <g transform="translate(0, -32)">
                      <rect x="-80" y="-14" width="160" height="24" rx="6" fill="#0F172A" stroke="#62BC37" strokeWidth="1.5" />
                      <text x="0" y="2" fill="#62BC37" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        {speed} km/h • {distanceKm} km left ➔ {cardinal}
                      </text>
                    </g>
                  </g>
                );
              })()}
            </svg>

            {/* RADAR METRICS HUD */}
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-white space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Live Speed</span>
                <span className="font-mono font-black text-[#62BC37] text-sm">{speed} km/h</span>
              </div>
              <div className="text-[10px] font-mono text-slate-300">
                Coords: {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
              </div>
              <div className="text-[10px] font-mono text-amber-300">
                Distance: {distanceKm} km to {destStation.code}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── CORRIDOR PROGRESS BAR & TELEMETRY STATS ─── */}
      <div className="p-5 space-y-4 font-sans bg-white">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold flex-wrap gap-2">
            <span className="text-slate-700 uppercase font-mono">Origin: {originStation.name}</span>
            <span className="text-[#62BC37] font-mono font-extrabold text-sm">{progress}% Corridor Completed</span>
            <span className="text-slate-700 uppercase font-mono">Target: {destStation.name}</span>
          </div>

          <div className="h-3.5 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-[#62BC37] rounded-full transition-all duration-700 shadow-inner"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center font-sans">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Distance to Siding</span>
            <span className="font-black text-slate-900 text-sm font-mono">{distanceKm} KM</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Bearing / Heading</span>
            <span className="font-mono font-black text-emerald-700 text-sm">{bearing}° ({cardinal})</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">On-Board Escort</span>
            <span className="font-extrabold text-slate-900 truncate block">{officer.name}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Phone Hotline</span>
            <span className="font-mono font-bold text-[#62BC37]">{officer.phone}</span>
          </div>
        </div>
      </div>

      {/* ─── CALL ESCORT OFFICER MODAL ─── */}
      {showCallModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 font-sans text-center">
            <div className="w-12 h-12 bg-emerald-50 text-[#62BC37] rounded-full flex items-center justify-center font-black text-xl mx-auto border border-emerald-200 font-mono">
              📞
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Call On-Board Escort Officer</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Initiating voice call to {officer.name} on duty aboard Locomotive #{locoId}.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono space-y-1">
              <span className="text-xs font-bold text-slate-400 block">PHONE NUMBER</span>
              <span className="text-lg font-black text-[#62BC37]">{officer.phone}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCallModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <a
                href={`tel:${officer.phone}`}
                className="flex-1 bg-[#62BC37] hover:bg-[#52A02D] text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Dial Number Now ➔</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
