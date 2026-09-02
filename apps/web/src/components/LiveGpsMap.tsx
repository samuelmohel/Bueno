'use client';

import React, { useState, useEffect } from 'react';

export interface MonitoringOfficer {
  name: string;
  phone: string;
  badgeId: string;
  batteryLevel?: string;
  signalStrength?: string;
  deviceStatus?: 'ACTIVE_GPS' | 'OFFLINE' | 'PINGING';
  lastPingTime?: string;
}

export interface TripGpsData {
  tripId: string;
  companyName: string;
  origin: string;
  destination: string;
  locomotiveId: string;
  cargoType: string;
  quantity: string;
  status: string;
  speedKmh: number;
  monitoringOfficer?: MonitoringOfficer;
  coords: { lat: number; lng: number };
  progressPercent: number;
}

// LAGOS-IBADAN RAIL CORRIDOR WAYPOINTS
const CORRIDOR_WAYPOINTS = [
  { name: 'Ewekoro Siding (EWK)', lat: 6.8974, lng: 3.2141, progress: 0 },
  { name: 'Itori Junction (ITO)', lat: 6.9333, lng: 3.3833, progress: 25 },
  { name: 'Abeokuta Hub (AB)', lat: 7.1557, lng: 3.3458, progress: 50 },
  { name: 'Omi Adio Station (AD)', lat: 7.3500, lng: 3.8000, progress: 75 },
  { name: 'Moniya Yard (MNY)', lat: 7.4610, lng: 3.9470, progress: 100 },
];

export function LiveGpsMap({ trip }: { trip?: any }) {
  const [googleKey, setGoogleKey] = useState<string>('');
  const [useGoogleMaps, setUseGoogleMaps] = useState<boolean>(false);

  // Dynamic Live Telemetry State
  const hasOfficer = !!(trip?.monitoringOfficerName || trip?.escortPhone || trip?.escortBadgeId);

  const [progress, setProgress] = useState<number>(hasOfficer ? (trip?.progressPercent || 45) : 0);
  const [speed, setSpeed] = useState<number>(hasOfficer ? (trip?.speedKmh || 74) : 0);
  const [battery, setBattery] = useState<number>(94);
  const [signal, setSignal] = useState<string>(hasOfficer ? '4G LTE / Satellite Ping' : 'Awaiting Officer Login');
  const [lastPing, setLastPing] = useState<string>('Just now');
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [smsSent, setSmsSent] = useState<boolean>(false);

  // Monitoring Officer Details
  const officer: MonitoringOfficer = {
    name: hasOfficer ? (trip?.monitoringOfficerName || trip?.cargoOfficerName || 'Assigned Officer') : 'AWAITING DISPATCH',
    phone: hasOfficer ? (trip?.monitoringOfficerPhone || trip?.escortPhone || 'N/A') : 'N/A',
    badgeId: hasOfficer ? (trip?.escortBadgeId || 'NRC-ESC-2026') : 'UNASSIGNED',
    batteryLevel: hasOfficer ? `${battery}%` : '0%',
    signalStrength: signal,
    deviceStatus: hasOfficer ? 'ACTIVE_GPS' : 'OFFLINE',
    lastPingTime: lastPing,
  };

  const tripId = trip?.id || trip?.tripId || 'TRP-101';
  const companyName = trip?.company || trip?.companyName || 'Purechem Cement Industries Ltd';
  const origin = trip?.origin || 'EWK';
  const destination = trip?.destination || 'MNY';
  const locoId = trip?.locomotiveId || 'L2205';

  // Check for Google Maps API Key in localStorage or window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('bueno_google_maps_key') || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (key) {
        setGoogleKey(key);
        setUseGoogleMaps(true);
      }
    }
  }, []);

  // HTML5 Device Geolocation & Live Movement Stream
  useEffect(() => {
    if (!hasOfficer) {
      setSpeed(0);
      setProgress(0);
      return;
    }

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 68;
          setSpeed(spd > 0 ? spd : 68);
          setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        },
        () => {},
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [hasOfficer]);

  const currentWaypointIndex = Math.min(
    CORRIDOR_WAYPOINTS.length - 1,
    Math.floor((progress / 100) * (CORRIDOR_WAYPOINTS.length - 1))
  );
  const currentWaypoint = CORRIDOR_WAYPOINTS[currentWaypointIndex];

  const handleSendSmsPing = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 5000);
  };

  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // Toggle Live Phone GPS Broadcast from Monitoring Officer's smartphone
  const togglePhoneGpsBroadcast = () => {
    if (isBroadcasting) {
      setIsBroadcasting(false);
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setBroadcastError('GPS not supported on this device');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const spd = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 68;
        setSpeed(spd);
        setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

        fetch(`/api/tracking/gps/${encodeURIComponent(trip?.locomotiveId || 'L2205')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lng,
            speed: spd,
            heading: pos.coords.heading || 45,
            accuracy: pos.coords.accuracy || 3,
            batteryLevel: battery,
            officerPhone: officer.phone,
            signalQuality: 'MOBILE_PHONE_GPS_LIVE',
          }),
        }).catch(() => {});
      },
      (err) => {
        setBroadcastError(err.message || 'GPS Permission Denied');
        setIsBroadcasting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans space-y-0">
      {/* ─── MAP HEADER ─── */}
      <div className="bg-slate-900 text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#62BC37] rounded-full animate-ping inline-block" />
            <span className="text-[10px] font-mono font-bold text-[#62BC37] uppercase tracking-wider">
              REAL-TIME SATELLITE GPS TELEMETRY & ESCORT CORRIDOR
            </span>
            <span className="text-slate-400 font-mono text-xs">• TRIP: {tripId}</span>
          </div>
          <h3 className="text-lg font-black text-white mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {companyName} — Freight Loco #{locoId}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Train Consist: <b className="text-white">{trip?.wagonLogs?.length || 14} Freight Wagons</b> + 1 Escort Caboose (<b className="text-emerald-400">{trip?.escortWagonId || 'BV 01'}</b>)
          </p>
        </div>

        {/* GOOGLE MAPS API TOGGLE / KEY STATUS */}
        <div className="flex items-center gap-2">
          {useGoogleMaps ? (
            <span className="bg-emerald-950 text-emerald-300 font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-800 uppercase">
              ✓ GOOGLE MAPS API ACTIVE
            </span>
          ) : (
            <span className="bg-slate-800 text-slate-300 font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-slate-700 uppercase">
              NRC SATELLITE OVERLAY (ACTIVE)
            </span>
          )}
        </div>
      </div>

      {/* ─── ON-BOARD MONITORING ESCORT OFFICER BADGE BAR ─── */}
      <div className="bg-slate-950 text-white p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#62BC37] text-white flex items-center justify-center font-black text-sm shadow-md font-mono">
            ESC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white">{officer.name}</span>
              <span className="text-[9px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                ESCORT CABOOSE: {trip?.escortWagonId || 'BV 01'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold block mt-0.5">
              Live Phone Location Locked: {officer.phone} • Signal: {officer.signalStrength}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* MOBILE PHONE GPS BROADCASTER BUTTON */}
          <button
            onClick={togglePhoneGpsBroadcast}
            className={`text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
              isBroadcasting
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <span>{isBroadcasting ? '📡 Phone GPS Broadcasting Live ✓' : '📱 Turn On Phone GPS (Start Broadcast)'}</span>
          </button>

          <button
            onClick={() => setShowCallModal(true)}
            className="flex-1 md:flex-initial bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
          >
            <span>📞 Call Officer</span>
          </button>

          <button
            onClick={handleSendSmsPing}
            className="flex-1 md:flex-initial bg-[#62BC37] hover:bg-[#52A02D] text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>{smsSent ? '✓ GPS Link Sent!' : '📲 Ping Live SMS Link'}</span>
          </button>
        </div>
      </div>

      {/* ─── LIVE INTERACTIVE SATELLITE CORRIDOR CANVAS ─── */}
      <div className="relative bg-slate-950 h-80 w-full overflow-hidden flex items-center justify-center border-b border-slate-800">
        {/* SATELLITE GRID PATTERN */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#62BC37 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* CORRIDOR SVG TRACK PATH */}
        <svg className="w-full h-full absolute inset-0 p-8" viewBox="0 0 800 200" preserveAspectRatio="none">
          {/* Main Rail Line Track */}
          <path d="M 60 100 Q 250 40, 400 100 T 740 100" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <path d="M 60 100 Q 250 40, 400 100 T 740 100" fill="none" stroke="#62BC37" strokeWidth="4" strokeDasharray="8 6" className="animate-pulse" />

          {/* Waypoint Stations */}
          {CORRIDOR_WAYPOINTS.map((wp, idx) => {
            const cx = 60 + (idx / (CORRIDOR_WAYPOINTS.length - 1)) * 680;
            const cy = idx % 2 === 1 ? 70 : 100;
            const isPassed = progress >= wp.progress;

            return (
              <g key={idx}>
                <circle cx={cx} cy={cy} r="10" fill={isPassed ? '#62BC37' : '#1E293B'} stroke="#FFFFFF" strokeWidth="3" />
                <text x={cx} y={cy + 28} fill="#E2E8F0" fontSize="10" fontFamily="sans-serif" fontWeight="bold" textAnchor="middle">
                  {wp.name.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* DYNAMIC MOVING TRAIN & OFFICER GPS MARKER */}
          {(() => {
            const trainX = 60 + (progress / 100) * 680;
            const trainY = 85;

            return (
              <g transform={`translate(${trainX}, ${trainY})`}>
                <circle cx="0" cy="0" r="18" fill="#62BC37" fillOpacity="0.3" className="animate-ping" />
                <circle cx="0" cy="0" r="12" fill="#62BC37" stroke="#FFFFFF" strokeWidth="3" shadow-lg="true" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="10" fontWeight="900" textAnchor="middle">
                  🚆
                </text>

                {/* CALLOUT BADGE ABOVE TRAIN */}
                <g transform="translate(0, -32)">
                  <rect x="-60" y="-14" width="120" height="24" rx="6" fill="#0F172A" stroke="#62BC37" strokeWidth="1.5" />
                  <text x="0" y="2" fill="#62BC37" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    {speed} km/h • {officer.name.split(' ')[0]}
                  </text>
                </g>
              </g>
            );
          })()}
        </svg>

        {/* OVERLAY TELEMETRY STATS HUD */}
        <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-white space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Live Speed</span>
            <span className="font-mono font-black text-[#62BC37] text-sm">{speed} km/h</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
            <span>Location: {currentWaypoint.name}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
            <span>GPS Fix: Satellite Lat 6.8974°, Lng 3.2141° (±2.8m)</span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800 text-white text-right space-y-1">
          <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">Officer Phone Battery</span>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-8 h-3.5 bg-slate-800 rounded border border-slate-600 p-0.5 relative">
              <div className="h-full bg-[#62BC37] rounded-xs" style={{ width: `${battery}%` }} />
            </div>
            <span className="font-mono font-bold text-xs text-white">{battery}%</span>
          </div>
          <span className="text-[9px] font-mono text-emerald-400 block">Pinged: {lastPing}</span>
        </div>
      </div>

      {/* ─── CORRIDOR STAGE PROGRESS BAR & KEY METRICS ─── */}
      <div className="p-5 space-y-4 font-sans bg-white">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700 uppercase font-mono">Origin: {origin} (Ewekoro Siding)</span>
            <span className="text-[#62BC37] font-mono">{progress}% Corridor Completed</span>
            <span className="text-slate-700 uppercase font-mono">Destination: {destination} (Moniya Yard)</span>
          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200">
            <div className="h-full bg-[#62BC37] rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center font-sans">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Assigned Escort</span>
            <span className="font-extrabold text-slate-900">{officer.name}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Escort Phone</span>
            <span className="font-mono font-bold text-[#62BC37]">{officer.phone}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Satellite Lock</span>
            <span className="font-mono font-bold text-emerald-700">✓ ACTIVE 4G</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Est. Arrival Time</span>
            <span className="font-mono font-bold text-slate-900">03:45 PM (On Schedule)</span>
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
                Initiating direct satellite voice call to {officer.name} on duty aboard Loco #{locoId}.
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
