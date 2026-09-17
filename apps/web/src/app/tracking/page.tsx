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

  /**
   * Look up a consignment.
   *
   * Queries the public tracking endpoint. The previous implementation read
   * localStorage — which is empty for an anonymous visitor, the only kind of
   * person who uses this page — and otherwise matched three hardcoded demo
   * references, so the advertised tracking feature never actually worked for a
   * real customer.
   */
  const handleSearch = async (codeToSearch: string) => {
    const term = codeToSearch.trim().toUpperCase();
    if (!term) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/public_track.php?ref=${encodeURIComponent(term)}`, {
        cache: 'no-store',
      });

      if (res.status === 404) {
        setError(
          `No consignment found for reference "${term}". Please check the trip, ` +
            'deal or tracking reference on your dispatch notice.'
        );
        setTrackingData(null);
        return;
      }

      if (res.status === 429) {
        setError('Too many lookups from this connection. Please wait a moment and try again.');
        setTrackingData(null);
        return;
      }

      if (!res.ok) {
        setError('Tracking is temporarily unavailable. Please try again shortly.');
        setTrackingData(null);
        return;
      }

      const payload = await res.json();
      const d = payload?.data;
      if (!d) {
        setError(`No consignment found for reference "${term}".`);
        setTrackingData(null);
        return;
      }

      const quantity = Number(d.quantity) || 0;
      const isBags = String(d.unit ?? '').toLowerCase().includes('bag');

      setTrackingData({
        bookingCode: d.reference,
        dealId: d.dealNumber,
        trainNumber: d.reference,
        clientName: d.consignee,
        status: d.tripStatus,
        origin: d.origin,
        destination: d.destination,
        speed: d.position?.speed ?? 0,
        signalQuality: d.position?.lat ? 'GPS' : 'TERMINAL_BEACON',
        cargoTypeName: d.cargoType || 'Industrial cargo',
        // A 50kg bag is 0.05 tonnes; tonnage values pass through unchanged.
        cargoWeightTonnes: isBags ? Math.round(quantity * 0.05) : quantity,
        loadedQty: quantity,
        curLat: d.position?.lat ?? null,
        curLng: d.position?.lng ?? null,
        breadcrumbs: d.breadcrumbs ?? [],
        departedAt: d.departedAt,
        completedAt: d.completedAt,
        lastUpdated: d.lastUpdated,
      });
    } catch {
      setError('Cannot reach the tracking service. Please check your connection.');
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

        {!trackingData && !loading && !error && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-xl mx-auto shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Where to find your reference
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your trip reference appears on the dispatch notice emailed when your
              consignment departs, and on the waybill issued at the loading siding.
              It looks like <span className="font-mono font-bold text-slate-800">TRP-8841</span>.
            </p>
            <p className="text-xs text-slate-400 mt-3">
              Consignees with a portal account can see full consignment history after{' '}
              <Link href="/auth/login" className="text-[#0E4B88] font-semibold hover:underline">
                signing in
              </Link>.
            </p>
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
