import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <h1 className="text-6xl font-black text-amber-500 mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>404</h1>
      <h2 className="text-xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-400 text-xs max-w-sm mb-6">The page or resource you are looking for does not exist on CargoTrace Platform.</p>
      <Link href="/dashboard" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all">
        Return to Dashboard ➔
      </Link>
    </div>
  );
}
