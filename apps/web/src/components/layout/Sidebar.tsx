'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Target,
  ClipboardList,
  Package,
  Train,
  MapPin,
  Map,
  Tag,
  HardHat,
  MessageSquare,
  Settings,
  LogOut,
  LucideIcon,
} from 'lucide-react';

type Role = 'ADMIN' | 'HEAD_OF_OPERATIONS' | 'CARGO_OFFICER' | 'CUSTOMER' | 'DRIVER';

// ─── Menu items per role ──────────────────────────────────────────────────────
const MENU: Record<Role, { href: string; label: string; icon: LucideIcon }[]> = {
  ADMIN: [
    { href: '/dashboard', label: 'Dashboard',        icon: LayoutDashboard },
    { href: '/reports',   label: 'BI Reports',       icon: BarChart3 },
    { href: '/budget',    label: 'Budgets & KPIs',   icon: Target },
    { href: '/manifest',  label: 'Field Operations',icon: ClipboardList },
    { href: '/bookings',  label: 'Trips',            icon: Package },
    { href: '/fleet',     label: 'Fleet',            icon: Train },
    { href: '/tracking',  label: 'Live Tracking',    icon: MapPin },
    { href: '/routes',    label: 'Routes',           icon: Map },
    { href: '/cargo',     label: 'Cargo Types',      icon: Tag },
    { href: '/drivers',   label: 'Drivers',          icon: HardHat },
    { href: '/chat',      label: 'Chat',             icon: MessageSquare },
    { href: '/settings',  label: 'Settings',         icon: Settings },
  ],
  HEAD_OF_OPERATIONS: [
    { href: '/dashboard', label: 'Dashboard',        icon: LayoutDashboard },
    { href: '/reports',   label: 'BI Reports',       icon: BarChart3 },
    { href: '/budget',    label: 'Budgets & KPIs',   icon: Target },
    { href: '/manifest',  label: 'Field Operations',icon: ClipboardList },
    { href: '/bookings',  label: 'Trips',            icon: Package },
    { href: '/fleet',     label: 'Fleet',            icon: Train },
    { href: '/tracking',  label: 'Live Tracking',    icon: MapPin },
    { href: '/routes',    label: 'Routes',           icon: Map },
    { href: '/chat',      label: 'Chat',             icon: MessageSquare },
  ],
  CARGO_OFFICER: [
    { href: '/dashboard', label: 'Dashboard',        icon: LayoutDashboard },
    { href: '/manifest',  label: 'Field Operations',icon: ClipboardList },
    { href: '/bookings',  label: 'Trips',            icon: Package },
    { href: '/fleet',     label: 'Fleet',            icon: Train },
    { href: '/tracking',  label: 'Live Tracking',    icon: MapPin },
    { href: '/chat',      label: 'Chat',             icon: MessageSquare },
  ],
  CUSTOMER: [
    { href: '/bookings',  label: 'My Shipments',     icon: Package },
    { href: '/tracking',  label: 'Track Cargo',      icon: MapPin },
    { href: '/chat',      label: 'Messages',         icon: MessageSquare },
  ],
  DRIVER: [
    { href: '/dashboard', label: 'My Jobs',          icon: Train },
    { href: '/tracking',  label: 'Live Map',         icon: MapPin },
    { href: '/chat',      label: 'Messages',         icon: MessageSquare },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN:               'Admin',
  HEAD_OF_OPERATIONS:  'Head of Operations',
  CARGO_OFFICER:       'Cargo Officer',
  CUSTOMER:            'Customer',
  DRIVER:              'Driver',
};

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<{ fullName: string; email: string; role: Role } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bueno_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const menu = user ? (MENU[user.role] ?? MENU.CARGO_OFFICER) : MENU.CARGO_OFFICER;

  const logout = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    router.push('/auth/login');
  };

  return (
    <aside
      className="w-60 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 font-sans"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-200">
            <span className="text-white font-black text-sm">B</span>
          </div>
          <span className="font-black text-gray-900 text-base">
            Bueno <span className="text-blue-600">Logistics</span>
          </span>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
              {user.fullName?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user.fullName}</p>
              <p className="text-xs text-gray-400">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {menu.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && !!pathname?.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all w-full cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
