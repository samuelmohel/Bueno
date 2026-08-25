'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { bookingsApi } from '@/lib/api';
import { PageLoader } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  ArrowLeft,
  Truck,
  CheckCircle,
  Clock,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function BookingDetailClient() {
  const params = useParams();
  const id = params?.id as string;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    bookingsApi
      .getById(id)
      .then((res) => {
        setBooking(res.data);
      })
      .catch(() => {
        try {
          const trips = JSON.parse(localStorage.getItem('bueno_trips') || '[]');
          const found = trips.find((t: any) => t.id === id || t.tripId === id);
          setBooking(found || null);
        } catch {
          setBooking(null);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <PageLoader />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-center p-8">
        <div className="space-y-4">
          <p className="text-xl font-bold text-amber-400">Booking not found</p>
          <p className="text-sm text-slate-400">Identifier: {id}</p>
          <Link
            href="/bookings"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all"
          >
            ← Back to Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/bookings"
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-100 shadow-sm transition-all"
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600">
                  {booking.trainNumber || booking.bookingCode || id}
                </span>
                <StatusBadge status={booking.bookingStatus || booking.status} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {booking.route?.routeName || `${booking.origin || 'Ewekoro'} ➔ ${booking.destination || 'Moniya'}`}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/manifest"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              <Truck size={14} />
              Field Manifest Operations
            </Link>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Customer / Shipper</span>
            <p className="text-sm font-bold text-slate-900 truncate">
              {booking.customer?.fullName || booking.company || 'Consignee'}
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cargo Type</span>
            <p className="text-sm font-bold text-slate-900 truncate">
              {booking.cargoType?.name || booking.cargoType || 'Industrial Cargo'}
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Wagons Allocated</span>
            <p className="text-sm font-bold text-slate-900 font-mono">
              {booking.wagonAllocations?.length || booking.wagonsRequired || '—'} Wagons ({booking.cargoWeightTonnes || 0}t)
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Freight Charge</span>
            <p className="text-sm font-bold text-emerald-700 font-mono">
              {formatCurrency(booking.totalAmountNgn || 0)}
            </p>
          </div>
        </div>

        {/* Wagon Allocation & Field Records */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
            Allocated Wagons & Quality Audit Records
          </h2>

          <div className="space-y-4">
            {booking.wagonAllocations?.map((alloc: any, idx: number) => {
              const audit = alloc.unloadAudit;
              const hasAudit = !!audit;

              return (
                <div key={alloc.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900">
                        {alloc.wagon?.serialNumber || `Wagon ${idx + 1}`}
                      </span>
                    </div>

                    {hasAudit && (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        audit.burstBagCount > 0 || audit.hasComplaint
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {audit.burstBagCount > 0 ? `${audit.burstBagCount} Burst Bags Flagged` : '100% Verified Intact'}
                      </span>
                    )}
                  </div>

                  {/* Feeder Trucks */}
                  {alloc.feederTruckLogs && alloc.feederTruckLogs.length > 0 && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">
                        Feeder Trucks Dispatched
                      </span>
                      {alloc.feederTruckLogs.map((truck: any) => (
                        <div key={truck.id} className="flex items-center justify-between text-xs font-mono text-slate-700">
                          <span>{truck.truckRegNo} ({truck.transporterName})</span>
                          <span className="font-bold">{truck.quantityLoaded} {truck.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Events Timeline */}
        {booking.events && booking.events.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
              Corridor Event Timeline
            </h2>

            <div className="space-y-3">
              {booking.events.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5" />
                  <div>
                    <p className="font-bold text-slate-900">{ev.title}</p>
                    <p className="text-slate-600">{ev.description}</p>
                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(ev.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
