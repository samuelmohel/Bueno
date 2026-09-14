'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StateEngine } from '@/lib/services/StateEngine';
import { CustomerPortal } from '@/components/portals/CustomerPortal';
import { CargoOfficerPortal } from '@/components/portals/CargoOfficerPortal';
import { AdminPortal } from '@/components/portals/AdminPortal';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // ── AUTOMATIC HBM REBRANDING MIGRATION & PRODUCTION SEEDING ───────────
    StateEngine.cleanseLafargeAndMigrateHbm();
    StateEngine.seedInitialProductionState();

    // ── PERMISSION SCHEMA MIGRATION ─────────────────────────────────────────
    StateEngine.seedPermissionsIfVersionMismatch();

    try {
      const raw = localStorage.getItem('bueno_user');
      if (!raw) {
        router.push('/auth/login');
        return;
      }
      setUser(JSON.parse(raw));
    } catch {
      router.push('/auth/login');
    }
    setReady(true);
  }, [router]);

  const signOut = () => {
    localStorage.removeItem('bueno_token');
    localStorage.removeItem('bueno_user');
    document.cookie = 'bueno_token=; path=/; max-age=0';
    router.push('/auth/login');
  };

  if (!ready || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-slate-900 space-y-3">
          <div className="w-10 h-10 border-3 border-[#62BC37] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const role = user.role;

  if (role === 'CARGO_OFFICER') {
    return <CargoOfficerPortal user={user} onSignOut={signOut} />;
  }

  if (role === 'CUSTOMER' || role === 'CONSIGNEE') {
    return <CustomerPortal user={user} onSignOut={signOut} />;
  }

  // ALL COMMAND & HQ DESKS (CEO, HEAD OF OPERATIONS, HEAD OF FINANCE, ADMIN) SHARE MASTER ADMIN PORTAL
  return <AdminPortal user={user} onSignOut={signOut} />;
}
