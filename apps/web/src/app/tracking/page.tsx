'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicTrackingMap from '../../components/PublicTrackingMap';
import Link from 'next/link';

const TERMINAL_NAMES: Record<string, string> = {
  EWK: 'Ewekoro Terminal',
  ITO: 'Itori Junction',
  MNY: 'Moniya Yard (Ibadan)',
  ILR: 'Ilorin Freight Hub',
  APT: 'Apapa Maritime Port',
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams?.get('code') ?? searchParams?.get('id') ?? searchParams?.get('deal') ?? '';

  const [inputCode, setInputCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);

  const handleSearch = (codeToSearch: string) => {
    const term = codeToSearch.trim().toUpperCase();
    if (!term) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Check localStorage for trips/deals created in the application
      let foundTrip: any = null;
      let foundDeal: any = null;

      try {
        const storedTrips = localStorage.getItem('bueno_trips');
        if (storedTrips) {
          const trips: any[] = JSON.parse(storedTrips);
          foundTrip = trips.find(
            (t) =>
              t.trackingId?.toUpperCase() === term ||
              t.dealId?.toUpperCase() === term ||
              t.trainNumber?.toUpperCase() === term ||
              t.id?.toUpperCase() === term
          );
        }

        const storedDeals = localStorage.getItem('bueno_deals');
        if (storedDeals) {
          const deals: any[] = JSON.parse(storedDeals);
          foundDeal = deals.find(
            (d) =>
              d.trackingId?.toUpperCase() === term ||
              d.id?.toUpperCase() === term
          );
        }
      } catch {}

      // Fallback default mock items if not in localStorage yet
      if (!foundTrip && !foundDeal) {
        if (term === 'BU-TRK-8839' || term === 'CN-2026-0451' || term === 'TR-EWK-102') {
          foundTrip = {
            id: 'TR-EWK-102',
            trainNumber: 'TR-EWK-102',
            dealId: 'CN-2026-0451',
            trackingId: 'BU-TRK-8839',
            clientName: 'Purechem Cement Industries Ltd',
            origin: 'EWK',
            destination: 'MNY',
            status: 'IN_TRANSIT',
            loco: 'L2205 (General Electric 3000HP)',
            wagons: ['PXG-08135', 'PXG-08151'],
            loadedQty: 1600,
            cargoType: 'Bagged Cement (50kg bags)',
          };
        } else if (term === 'BU-TRK-7712' || term === 'CN-2026-0438') {
          foundDeal = {
            id: 'CN-2026-0438',
            trackingId: 'BU-TRK-7712',
            clientName: 'BUA Cement Industries',
            cargoType: 'Raw Gypsum Mineral',
            quantity: '2430',
            originStation: 'ITO',
            destStation: 'ILR',
            status: 'DEAL_REGISTERED',
          };
        } else if (term === 'BU-TRK-9901' || term === 'CN-2026-0410') {
          foundTrip = {
            id: 'TR-EWK-102',
            trainNumber: 'TR-EWK-102',
            dealId: 'CN-2026-0410',
            trackingId: 'BU-TRK-9901',
            clientName: 'Purechem Cement Industries Ltd',
            origin: 'EWK',
            destination: 'MNY',
            status: 'IN_TRANSIT',
            loco: 'L2205',
            loadedQty: 1600,
          };
        } else if (term === 'BU-TRK-4412' || term === 'CN-2026-0390' || term === 'TR-APT-301') {
          foundTrip = {
            id: 'TR-APT-301',
            trainNumber: 'TR-APT-301',
            dealId: 'CN-2026-0390',
            trackingId: 'BU-TRK-4412',
            clientName: 'HUAXIN BUILDING MATERIALS NIG PLC',
            origin: 'APT',
            destination: 'MNY',
            status: 'ARRIVED',
            loadedQty: 1600,
          };
        }
      }

      if (foundTrip) {
        const originName = TERMINAL_NAMES[foundTrip.origin] || foundTrip.origin;
        const destName = TERMINAL_NAMES[foundTrip.destination] || foundTrip.destination;

        setTrackingData({
          bookingCode: foundTrip.trackingId || foundTrip.dealId,
          dealId: foundTrip.dealId,
          trainNumber: foundTrip.trainNumber,
          clientName: foundTrip.clientName,
          status: foundTrip.status,
          origin: originName,
          destination: destName,
          speed: foundTrip.status === 'IN_TRANSIT' ? 74 : 0,
          signalQuality: 'GPS',
          cargoTypeName: foundTrip.cargoType || 'Industrial Cargo Payload',
          cargoWeightTonnes: foundTrip.loadedQty ? Math.round(foundTrip.loadedQty * 0.05) : 80,
          loadedQty: foundTrip.loadedQty,
          unloadedQty: foundTrip.unloadedQty,
          loadDuration: foundTrip.loadDuration,
          unloadDuration: foundTrip.unloadDuration,
          discrepancy: foundTrip.discrepancy,
          loco: foundTrip.loco,
          wagons: foundTrip.wagons,
        });
      } else if (foundDeal) {
        const originName = TERMINAL_NAMES[foundDeal.originStation] || foundDeal.originStation;
        const destName = TERMINAL_NAMES[foundDeal.destStation] || foundDeal.destStation;

        setTrackingData({
          bookingCode: foundDeal.trackingId || foundDeal.id,
          dealId: foundDeal.id,
          clientName: foundDeal.clientName,
          status: foundDeal.status,
          origin: originName,
          destination: destName,
          speed: 0,
          signalQuality: 'TERMINAL_BEACON',
          cargoTypeName: foundDeal.cargoType || 'Industrial Freight',
          cargoWeightTonnes: parseInt(foundDeal.quantity) ? Math.round(parseInt(foundDeal.quantity) * 0.05) : 80,
          notes: foundDeal.notes,
        });
      } else {
        setError(`No registered deal, train, or shipment found matching reference "${term}". Please check the Deal ID or Tracking ID.`);
        setTrackingData(null);
      }
    } catch {
      setError(`Error fetching telemetry for reference "${term}".`);
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      handleSearch(initialCode);
    }
  }, [initialCode]);

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs" style={{ fontFamily: "'Outfit', sans-serif" }}>CT</span>
            </div>
            <span className="text-base font-black text-slate-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Cargo<span className="text-amber-500">Trace</span>
            </span>
          </Link>
          <Link href="/auth/login" className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm">
            Staff Portal Sign In
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-3">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            LIVE CORRIDOR TELEMETRY ENGINE
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Track Rail Freight Shipment
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-md mx-auto">
            Enter your Deal ID (e.g. <span className="font-mono text-amber-700 font-bold">CN-2026-0451</span>) or Tracking Reference (<span className="font-mono text-slate-800 font-bold">BU-TRK-8839</span>) to view train movement, station logs, and live telemetry.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-md mb-8 max-w-xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(inputCode);
            }}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            <input
              type="text"
              placeholder="Enter Deal ID or Tracking ID..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white uppercase transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? 'Searching...' : 'Track Shipment →'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl max-w-xl mx-auto mb-8 text-center text-xs font-bold">
            {error}
          </div>
        )}

        {/* Tracking Map & Details */}
        {trackingData && (
          <div className="space-y-6 animate-fade-up">
            {/* Metadata Summary Banner */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 font-mono text-xs font-black">{trackingData.bookingCode}</span>
                  {trackingData.dealId && <span className="text-slate-400 text-xs font-mono">({trackingData.dealId})</span>}
                </div>
                <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {trackingData.clientName}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{trackingData.cargoTypeName}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="bg-white/10 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">STATUS</div>
                  <div className="text-xs font-black text-amber-400 uppercase mt-0.5">{trackingData.status?.replace(/_/g, ' ')}</div>
                </div>
                {trackingData.trainNumber && (
                  <div className="bg-white/10 rounded-2xl px-4 py-2.5 text-center">
                    <div className="text-[10px] font-bold uppercase text-slate-400">TRAIN</div>
                    <div className="text-xs font-mono font-black text-white mt-0.5">{trackingData.trainNumber}</div>
                  </div>
                )}
                <div className="bg-white/10 rounded-2xl px-4 py-2.5 text-center">
                  <div className="text-[10px] font-bold uppercase text-slate-400">PAYLOAD</div>
                  <div className="text-xs font-mono font-black text-emerald-400 mt-0.5">{trackingData.cargoWeightTonnes} Tonnes</div>
                </div>
              </div>
            </div>

            {/* Map Component */}
            <PublicTrackingMap data={trackingData} />
          </div>
        )}

        {!trackingData && !loading && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>Quick Demo Search References</h3>
            <p className="text-xs text-slate-500 mb-4">Click any reference code below to test instant live corridor tracking:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { code: 'BU-TRK-8839', label: 'Tracking ID (HBM)' },
                { code: 'CN-2026-0451', label: 'Deal ID (HBM)' },
                { code: 'BU-TRK-7712', label: 'Tracking ID (BUA Gypsum)' },
                { code: 'TR-EWK-102', label: 'Train Number (Purechem)' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => {
                    setInputCode(code);
                    handleSearch(code);
                  }}
                  className="bg-slate-100 hover:bg-amber-100 hover:border-amber-300 border border-slate-200 text-slate-900 font-mono font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
                >
                  {code} <span className="text-[10px] font-sans font-medium text-slate-500">({label})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function PublicTrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-slate-400">Loading tracker...</div>}>
      <TrackingContent />
    </Suspense>
  );
}
