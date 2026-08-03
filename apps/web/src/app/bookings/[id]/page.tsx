'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    // Client-side: load booking from localStorage trips
    try {
      const trips = JSON.parse(localStorage.getItem('bueno_trips') || '[]');
      const found = trips.find((t: any) => t.id === id || t.tripId === id);
      setBooking(found || null);
    } catch {
      setBooking(null);
    }
  }, [id]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-center p-8">
        <div className="space-y-4">
          <p className="text-xl font-bold text-amber-400">Booking not found</p>
          <p className="text-sm text-slate-400">ID: {id}</p>
          <Link href="/dashboard" className="inline-block bg-amber-500 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8" style={{ fontFamily: "'Inter',sans-serif" }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="bg-slate-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-800">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-black text-slate-900" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Booking Detail — Trip {booking.tripId}
          </h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            {[
              ['Trip ID', booking.tripId],
              ['Company', booking.company],
              ['Cargo Type', booking.cargoType],
              ['Locomotive', booking.locomotiveId],
              ['Origin', booking.origin],
              ['Destination', booking.destination],
              ['Status', booking.status],
              ['Officer', booking.cargoOfficerName],
              ['Created', booking.createdAt || '—'],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-50 p-3 rounded-xl">
                <span className="block text-[10px] font-extrabold uppercase text-slate-400 mb-0.5">{label}</span>
                <span className="font-bold text-slate-900">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
