'use client';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/Spinner';
import { Search, Filter } from 'lucide-react';
import { bookingsApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const STATUSES = ['', 'BOOKING_CONFIRMED', 'COORDINATING', 'WAGON_ALLOCATED', 'LOADING_IN_PROGRESS', 'IN_TRANSIT', 'ARRIVED_DESTINATION', 'READY_FOR_COLLECTION', 'COMPLETED', 'CANCELLED'];

export default function BookingsPage() {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (p = 1, s = status) => {
    setLoading(true);
    bookingsApi.getAll({ page: p, limit: 25, ...(s && { status: s }) })
      .then(r => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(1, status); }, [status]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Bookings</h1>
          <p className="page-subtitle">{data?.total ?? 0} total bookings</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input placeholder="Search bookings…" className="input pl-8" />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="select w-44">
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        {loading ? <PageLoader /> : (
          <table className="table">
            <thead>
              <tr>
                <th className="th">Booking ref</th>
                <th className="th">Customer</th>
                <th className="th">Route</th>
                <th className="th">Cargo</th>
                <th className="th">Weight</th>
                <th className="th">Wagons</th>
                <th className="th">Amount</th>
                <th className="th">Payment</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.bookings?.map((b: any) => (
                <tr key={b.id} className="tr cursor-pointer" onClick={() => window.location.href = `/bookings/${b.id}`}>
                  <td className="td font-mono text-[10px] text-blue-600">{b.bookingCode?.slice(0, 12)}…</td>
                  <td className="td">
                    <div className="font-medium text-gray-900">{b.customer?.fullName}</div>
                    <div className="text-[10px] text-gray-400">{b.customer?.email}</div>
                  </td>
                  <td className="td text-gray-600">{b.route?.routeName}</td>
                  <td className="td text-gray-600">{b.cargoType?.name}</td>
                  <td className="td">{b.cargoWeightTonnes}t</td>
                  <td className="td font-medium">{b.wagonsRequired}</td>
                  <td className="td font-medium">{formatCurrency(b.totalAmountNgn)}</td>
                  <td className="td"><StatusBadge status={b.paymentStatus} /></td>
                  <td className="td"><StatusBadge status={b.bookingStatus} /></td>
                  <td className="td text-gray-400 whitespace-nowrap">{formatDate(b.createdAt)}</td>
                </tr>
              ))}
              {!data?.bookings?.length && (
                <tr><td colSpan={10} className="td text-center py-10 text-gray-400">No bookings found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, data.total)} of {data.total}</span>
          <div className="flex gap-1">
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => { setPage(p => p - 1); load(page - 1); }}>Prev</button>
            <button className="btn btn-secondary btn-sm" disabled={page >= data.totalPages} onClick={() => { setPage(p => p + 1); load(page + 1); }}>Next</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
