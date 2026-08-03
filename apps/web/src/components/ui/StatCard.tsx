import { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon, color = 'blue', sub }: {
  label: string; value: string | number; icon: LucideIcon; color?: string; sub?: string;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600', red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}
