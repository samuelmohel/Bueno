'use client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function SettingsPage() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('bueno_user') || '{}') : {};
  return (
    <DashboardLayout>
      <div className="page-header"><h1 className="page-title">Settings</h1></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="section-title">Account</h3>
          <div className="space-y-3">
            {[['Full name', user.fullName], ['Email', user.email], ['Role', user.role?.replace(/_/g, ' ')]].map(([k, v]) => (
              <div key={k}><div className="label">{k}</div><div className="input bg-gray-50 text-gray-600">{v || '—'}</div></div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="section-title">API endpoints</h3>
          <div className="space-y-2 text-xs font-mono text-gray-500">
            <div>API: <span className="text-blue-600">{process.env.NEXT_PUBLIC_API_URL}</span></div>
            <div>Docs: <a href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '')}/api/docs`} target="_blank" className="text-blue-600 hover:underline">Swagger UI ↗</a></div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
