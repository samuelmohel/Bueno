'use client';

import React, { useState, useEffect } from 'react';

interface TelemetryData {
  locomotiveId: string;
  fuelPercent: number;
  fuelLiters: number;
  fuelBurnRate: number; // L/hr
  coolantTemp: number; // °C
  brakePressure: number; // PSI
  vibrationGForce: number; // G
  speedKmh: number;
  speedLimit: number;
  engineStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  lastPing: string;
}

const DEFAULT_LOCOS: Record<string, TelemetryData> = {
  L2205: {
    locomotiveId: 'L2205',
    fuelPercent: 82,
    fuelLiters: 4100,
    fuelBurnRate: 48.5,
    coolantTemp: 84,
    brakePressure: 110,
    vibrationGForce: 0.24,
    speedKmh: 68,
    speedLimit: 80,
    engineStatus: 'OPTIMAL',
    lastPing: 'Live Telemetry Active',
  },
  L2206: {
    locomotiveId: 'L2206',
    fuelPercent: 45,
    fuelLiters: 2250,
    fuelBurnRate: 52.0,
    coolantTemp: 91,
    brakePressure: 104,
    vibrationGForce: 0.42,
    speedKmh: 72,
    speedLimit: 80,
    engineStatus: 'WARNING',
    lastPing: 'Live Telemetry Active',
  },
  L2207: {
    locomotiveId: 'L2207',
    fuelPercent: 95,
    fuelLiters: 4750,
    fuelBurnRate: 44.0,
    coolantTemp: 78,
    brakePressure: 115,
    vibrationGForce: 0.18,
    speedKmh: 0,
    speedLimit: 80,
    engineStatus: 'OPTIMAL',
    lastPing: 'Stationary at Ewekoro Siding',
  },
  L2208: {
    locomotiveId: 'L2208',
    fuelPercent: 18,
    fuelLiters: 900,
    fuelBurnRate: 56.2,
    coolantTemp: 96,
    brakePressure: 92,
    vibrationGForce: 0.65,
    speedKmh: 54,
    speedLimit: 80,
    engineStatus: 'CRITICAL',
    lastPing: 'Low Fuel & Vibration Alert',
  },
};

export default function RailTelemetryCard({ locomotiveId = 'L2205' }: { locomotiveId?: string }) {
  const [selectedLoco, setSelectedLoco] = useState<string>(locomotiveId);
  const [data, setData] = useState<TelemetryData>(DEFAULT_LOCOS[locomotiveId] || DEFAULT_LOCOS['L2205']);

  useEffect(() => {
    if (DEFAULT_LOCOS[selectedLoco]) {
      setData(DEFAULT_LOCOS[selectedLoco]);
    }
  }, [selectedLoco]);

  // Live fluctuating sensor stream simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const jitter = (Math.random() - 0.5) * 2;
        const newSpeed = Math.max(0, Math.min(85, Math.round(prev.speedKmh + jitter)));
        const newTemp = Math.max(70, Math.min(105, Math.round(prev.coolantTemp + (Math.random() - 0.5))));
        const newVib = Math.max(0.1, Number((prev.vibrationGForce + (Math.random() - 0.5) * 0.04).toFixed(2)));

        let status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
        if (prev.fuelPercent < 20 || newTemp > 95 || newVib > 0.6) status = 'CRITICAL';
        else if (prev.fuelPercent < 40 || newTemp > 90 || newVib > 0.4) status = 'WARNING';

        return {
          ...prev,
          speedKmh: newSpeed,
          coolantTemp: newTemp,
          vibrationGForce: newVib,
          engineStatus: status,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPTIMAL':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg">● OPTIMAL SENSOR STREAM</span>;
      case 'WARNING':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg">⚠️ ELEVATED TEMP / VIBRATION</span>;
      case 'CRITICAL':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-lg animate-pulse">🚨 CRITICAL SENSOR ALERT</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-950 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl space-y-4 font-sans">
      {/* Header & Loco Selector */}
      <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0E4B88] text-[#62BC37] flex items-center justify-center font-black text-xl border border-blue-500/30">
            🚂
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-extrabold text-[#62BC37] uppercase tracking-widest block">TELEMETRY SENSOR MATRIX</span>
              {getStatusBadge(data.engineStatus)}
            </div>
            <h3 className="text-base font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Locomotive #{data.locomotiveId} Hardware Diagnostics
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono font-bold">Select Unit:</span>
          <select
            value={selectedLoco}
            onChange={e => setSelectedLoco(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white font-mono text-xs px-3 py-1.5 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-[#62BC37]"
          >
            <option value="L2205">Loco #L2205 (In-Transit)</option>
            <option value="L2206">Loco #L2206 (Warning Alert)</option>
            <option value="L2207">Loco #L2207 (Stationary Siding)</option>
            <option value="L2208">Loco #L2208 (Critical Service)</option>
          </select>
        </div>
      </div>

      {/* Sensor Gauge Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Fuel Gauge */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
            <span>⛽ FUEL RESERVOIR</span>
            <span className={data.fuelPercent < 25 ? 'text-rose-400' : 'text-emerald-400'}>{data.fuelPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${data.fuelPercent < 25 ? 'bg-rose-500' : data.fuelPercent < 50 ? 'bg-amber-500' : 'bg-[#62BC37]'}`}
              style={{ width: `${data.fuelPercent}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>{data.fuelLiters.toLocaleString()} Liters</span>
            <span className="text-slate-500">{data.fuelBurnRate} L/hr</span>
          </div>
        </div>

        {/* Engine Coolant Temp */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase">🌡️ COOLANT TEMP</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${data.coolantTemp > 95 ? 'text-rose-400' : data.coolantTemp > 90 ? 'text-amber-400' : 'text-white'}`}>
              {data.coolantTemp}°C
            </span>
            <span className="text-[10px] font-mono text-slate-500">Optimum: 80-88°C</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Radiator Fan: <b className="text-emerald-400">ACTIVE</b></p>
        </div>

        {/* Hydraulic Brake Pressure */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase">🛑 HYDRAULIC BRAKE</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${data.brakePressure < 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {data.brakePressure} PSI
            </span>
            <span className="text-[10px] font-mono text-slate-500">Target: 110 PSI</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Compressor: <b className="text-emerald-400">NORMAL</b></p>
        </div>

        {/* Axle Vibration Stress */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-[10px] font-mono text-slate-400 font-bold block uppercase">📳 AXLE VIBRATION</span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-black font-mono ${data.vibrationGForce > 0.5 ? 'text-rose-400' : data.vibrationGForce > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {data.vibrationGForce} G
            </span>
            <span className="text-[10px] font-mono text-slate-500">Max Safe: 0.50 G</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Wheelset Integrity: <b className="text-slate-200">VERIFIED</b></p>
        </div>
      </div>

      {/* Speed Governor & Track Velocity Meter */}
      <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
            ⚡
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">CORRIDOR TRACK VELOCITY</span>
            <p className="text-sm font-black text-white">
              {data.speedKmh} km/h <span className="text-slate-500 text-xs font-normal">/ Max Allowed {data.speedLimit} km/h</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[9px]">SPEED GOVERNOR</span>
            <span className="text-emerald-400 font-bold">LOCKED & ENFORCED</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[9px]">SATELLITE SYNC</span>
            <span className="text-blue-400 font-bold">4 SEC INTERVAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
