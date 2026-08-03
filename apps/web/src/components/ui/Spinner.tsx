export function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8';
  return <div className={`${s} border-2 border-blue-600 border-t-transparent rounded-full animate-spin`} />;
}
export function PageLoader() {
  return <div className="flex items-center justify-center h-48"><Spinner size="md" /></div>;
}
