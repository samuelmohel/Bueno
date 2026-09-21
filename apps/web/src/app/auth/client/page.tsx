'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth/login?category=CUSTOMER');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-500">
      Redirecting to Bueno Logistics Sign In...
    </div>
  );
}
