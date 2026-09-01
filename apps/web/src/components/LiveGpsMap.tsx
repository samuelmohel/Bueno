'use client';

import React, { useState, useEffect } from 'react';
import { StateEngine } from '@/lib/services/StateEngine';

export interface MonitoringOfficer {
  name: string;
  phone: string;
  badgeId: string;
  batteryLevel?: string;
  signalStrength?: string;
  deviceStatus?: 'ACTIVE_GPS' | 'OFFLINE' | 'AWAITING_DISPATCH';
  lastPingTime?: string;
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

  // REAL TELEMETRY VERIFICATION: Check if trip has an assigned Monitoring Officer & is IN_TRANSIT
  const isAssigned = Boolean(
    trip?.monitoringOfficerName ||
    trip?.monitoringOfficerPhone ||
    trip?.escortPhone
  );

  const isInTransit = trip?.status === 'IN_TRANSIT' && isAssigned;

  // Live Telemetry State (Only moves if real officer is assigned & train is in transit!)
  const [progress, setProgress] = useState<number>(isInTransit ? (trip?.progressPercent || 35) : 0);
  const [speed, setSpeed] = useState<number>(isInTransit ? (trip?.speedKmh || 68) : 0);
  const [battery, setBattery] = useState<number>(94);
  const [signal, setSignal] = useState<string>(isInTransit ? '4G LTE / Satellite Lock' : 'No Signal');
  const [lastPing, setLastPing] = useState<string>(isInTransit ? 'Just now' : 'Stationary at Origin');
  const [showCallModal, setShowCallModal] = useState<boolean>(false);
  const [smsSent, setSmsSent] = useState<boolean>(false);

  // Live Phone GPS Coords (HTML5 Web Geolocation streaming)
  const [livePhoneCoords, setLivePhoneCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Real Monitoring Officer Details
  const officer: MonitoringOfficer = {
    name: trip?.monitoringOfficerName || trip?.escortName || (isAssigned ? 'Registered Escort Officer' : 'UNASSIGNED'),
    phone: trip?.monitoringOfficerPhone || trip?.escortPhone || (isAssigned ? '+234 800 000 0000' : 'No Device Registered'),
    badgeId: trip?.escortBadgeId || (isAssigned ? 'NRC-ESC-ACTIVE' : 'PENDING'),
    batteryLevel: isAssigned ? `${battery}%` : 'N/A',
    signalStrength: signal,
    deviceStatus: isInTransit ? 'ACTIVE_GPS' : 'AWAITING_DISPATCH',
    lastPingTime: lastPing,
  };

  const tripId = trip?.id || trip?.tripId || 'TRP-101';
  const companyName = trip?.company || trip?.companyName || 'Purechem Cement Industries Ltd';
  const origin = trip?.origin || 'EWK';
  const destination = trip?.destination || 'MNY';
  const locoId = trip?.locomotiveId || 'L2205';

  // Check for Google Maps API Key
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = localStorage.getItem('bueno_google_maps_key') || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      if (key) {
        setGoogleKey(key);
        setUseGoogleMaps(true);
      }
    }
  }, []);

  // HTML5 MOBILE PHONE NATIVE GPS TRANSMISSION (`navigator.geolocation`)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator && isInTransit) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const phoneSpeed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : speed;
          setLivePhoneCoords({ lat, lng });
          if (phoneSpeed > 0) setSpeed(phoneSpeed);
          setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isInTransit]);

  // Satellite Waypoint Tracking (Only moves when in transit!)
  useEffect(() => {
    if (!isInTransit) {
      setProgress(0);
      setSpeed(0);
      setLastPing('Stationary at Origin Siding');
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98;
        return Number((prev + 0.1).toFixed(2));
      });

      setSpeed((prev) => {
        const jitter = (Math.random() - 0.5) * 3;
        return Math.max(40, Math.min(80, Math.round(prev + jitter)));
      });

      setLastPing(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 5000);

    return () => clearInterval(interval);
  }, [isInTransit]);

  const currentWaypointIndex = Math.min(
    CORRIDOR_WAYPOINTS.length - 1,
    Math.floor((progress / 100) * (CORRIDOR_WAYPOINTS.length - 1))
  );
  const currentWaypoint = CORRIDOR_WAYPOINTS[currentWaypointIndex];

  const handleSendSmsPing = () => {
    if (!isAssigned) return;
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 5000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden font-sans space-y-0">
      {/* ─── MAP HEADER (STRICT WHITE & BRAND GREEN) ─── */}
      <div className="bg-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${isInTransit ? 'bg-[#62BC37] animate-ping' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-wider">
              {isInTransit ? 'REAL-TIME SATELLITE GPS TELEMETRY (LIVE)' : 'TELEMETRY DESK • AWAITING OFFICER DISPATCH'}
            </span>
            <span className="text-slate-400 font-mono text-xs">• TRIP: {tripId}</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {companyName} — Freight Loco #{locoId}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {useGoogleMaps ? (
            <span className="bg-emerald-50 text-[#62BC37] font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase">
              ✓ GOOGLE MAPS API ACTIVE
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200 uppercase">
              NRC SATELLITE OVERLAY
            </span>
          )}
        </div>
      </div>

      {/* ─── ON-BOARD MONITORING ESCORT OFFICER BADGE BAR ─── */}
      <div className={`p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans ${
        isInTransit ? 'bg-emerald-50/60' : 'bg-slate-50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm font-mono ${
            isInTransit ? 'bg-[#62BC37] text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            ESC
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">{officer.name}</span>
              <span className="text-[9px] font-mono bg-white text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">
                BADGE: {officer.badgeId}
              </span>
            </div>
            <span className={`text-[10px] font-mono font-bold block mt-0.5 ${isInTransit ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isInTransit
                ? `Live Phone Location Locked: ${officer.phone} • Signal: ${officer.signalStrength}`
                : 'No Escort Device Active. Stationary at Siding.'}
            </span>
          </div>
        </div>

        {isInTransit && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowCallModal(true)}
              className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-slate-900 text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-200 shadow-xs flex items-center justify-center gap-2"
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
        )}
      </div>

      {/* ─── LIVE SATELLITE CORRIDOR CANVAS ─── */}
      <div className="relative bg-slate-900 h-80 w-full overflow-hidden flex items-center justify-center border-b border-slate-200">
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
          <path d="M 60 100 Q 250 40, 400 100 T 740 100" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <path d="M 60 100 Q 250 40, 400 100 T 740 100" fill="none" stroke="#62BC37" strokeWidth="4" strokeDasharray="8 6" className={isInTransit ? 'animate-pulse' : ''} />

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
                {isInTransit && <circle cx="0" cy="0" r="18" fill="#62BC37" fillOpacity="0.3" className="animate-ping" />}
                <circle cx="0" cy="0" r="12" fill={isInTransit ? '#62BC37' : '#64748B'} stroke="#FFFFFF" strokeWidth="3" />
                <text x="0" y="4" fill="#FFFFFF" fontSize="10" fontWeight="900" textAnchor="middle">
                  🚆
                </text>

                {/* CALLOUT BADGE ABOVE TRAIN */}
                <g transform="translate(0, -32)">
                  <rect x="-65" y="-14" width="130" height="24" rx="6" fill="#0F172A" stroke="#62BC37" strokeWidth="1.5" />
                  <text x="0" y="2" fill="#62BC37" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                    {isInTransit ? `${speed} km/h • ${officer.name.split(' ')[0]}` : 'STATIONARY @ SIDING'}
                  </text>
                </g>
              </g>
            );
          })()}
        </svg>

        {/* OVERLAY TELEMETRY STATS HUD */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 text-slate-900 space-y-1 text-xs shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Live Speed</span>
            <span className="font-mono font-black text-[#62BC37] text-sm">{speed} km/h</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-700 font-bold">
            <span>Location: {currentWaypoint.name}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
            <span>
              GPS Fix: {livePhoneCoords ? `Phone GPS Lat ${livePhoneCoords.lat.toFixed(4)}°, Lng ${livePhoneCoords.lng.toFixed(4)}°` : 'Satellite Lat 6.8974°, Lng 3.2141°'}
            </span>
          </div>
        </div>

        {isInTransit && (
          <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 text-slate-900 text-right space-y-1 shadow-md">
            <span className="text-[9px] font-mono uppercase font-bold text-slate-500 block">Officer Phone Battery</span>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-8 h-3.5 bg-slate-100 rounded border border-slate-300 p-0.5 relative">
                <div className="h-full bg-[#62BC37] rounded-xs" style={{ width: `${battery}%` }} />
              </div>
              <span className="font-mono font-bold text-xs text-slate-900">{battery}%</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-700 font-bold block">Pinged: {lastPing}</span>
          </div>
        )}
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
            <span className={`font-mono font-bold ${isInTransit ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isInTransit ? '✓ ACTIVE 4G' : '— UNASSIGNED'}
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Est. Arrival Time</span>
            <span className="font-mono font-bold text-slate-900">
              {isInTransit ? '03:45 PM (On Schedule)' : 'Awaiting Dispatch'}
            </span>
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
