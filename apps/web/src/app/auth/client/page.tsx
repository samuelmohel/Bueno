'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-xs font-bold text-slate-500">
      Redirecting to Bueno Logistics Sign In...
    </div>
  );
}
