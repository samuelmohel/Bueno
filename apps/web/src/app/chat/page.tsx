'use client';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { bookingsApi } from '@/lib/api';
import { MessageSquare } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ChatPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsApi.getAll({ limit: 50, status: 'COORDINATING' })
      .then(r => setBookings(r.data.bookings))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Coordination messages</h1>
      </div>
      <div className="space-y-2">
        {bookings.map((b: any) => (
          <a key={b.id} href={`/bookings/${b.id}`}
            className="card flex items-center gap-4 hover:border-blue-200 transition-colors cursor-pointer block">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare size={16} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-900">{b.customer?.fullName}</span>
                <StatusBadge status={b.bookingStatus} />
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5 truncate">{b.route?.routeName} · {b.cargoType?.name} · {b.wagonsRequired} wagons</div>
            </div>
            <div className="text-[10px] text-gray-400 whitespace-nowrap">{formatDate(b.createdAt)}</div>
          </a>
        ))}
        {!bookings.length && (
          <div className="card text-center py-12">
            <MessageSquare size={24} className="text-gray-200 mx-auto mb-2" />
            <div className="text-sm text-gray-500">No active coordination threads</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
