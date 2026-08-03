'use client';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageLoader } from '@/components/ui/Spinner';
import { usersApi } from '@/lib/api';
import { Users, Star } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.getAll({ role: 'DRIVER' }).then(r => setDrivers(r.data.users)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><PageLoader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">{drivers.length} registered drivers</p>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th className="th">Name</th><th className="th">Email</th><th className="th">Phone</th>
            <th className="th">Verified</th><th className="th">Joined</th>
          </tr></thead>
          <tbody>
            {drivers.map((d: any) => (
              <tr key={d.id} className="tr">
                <td className="td font-medium">{d.fullName}</td>
                <td className="td text-gray-500">{d.email}</td>
                <td className="td">{d.phone || '—'}</td>
                <td className="td"><span className={`badge ${d.verified ? 'badge-green' : 'badge-gray'}`}>{d.verified ? 'Verified' : 'Pending'}</span></td>
                <td className="td text-gray-400">{formatDate(d.createdAt)}</td>
              </tr>
            ))}
            {!drivers.length && <tr><td colSpan={5} className="td text-center py-8 text-gray-400">No drivers yet</td></tr>}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
