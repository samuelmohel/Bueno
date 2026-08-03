'use client';

import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <h1 className="text-5xl font-black text-rose-500 mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>500</h1>
      <h2 className="text-xl font-bold mb-2">System Error</h2>
      <p className="text-slate-400 text-xs max-w-sm mb-6">An operational error occurred while rendering this view.</p>
      <button onClick={() => reset()} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all">
        Try Again ➔
      </button>
    </div>
  );
}
