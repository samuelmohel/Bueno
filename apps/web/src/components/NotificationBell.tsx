'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';

/**
 * Notification bell.
 *
 * Reads from the notifications endpoint. The previous version called the
 * unused NestJS client on port 3001 and opened a websocket to the same
 * absent server, so it never showed anything and silently swallowed the
 * failure — the bell simply stayed empty forever.
 */

interface Notif {
  id: string;
  title: string;
  body: string;
  type: string;
  time?: string;
  readInt?: number;
}

function timeAgo(value?: string): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;

  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.readInt).length;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('notifications.php');
      setNotifs(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      // A forbidden or signed-out read is not worth shouting about; a real
      // failure is, because an empty bell otherwise looks like "no news".
      if (err instanceof ApiError && !err.isForbidden && !err.isUnauthenticated) {
        setError('Could not load notifications.');
      }
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Refresh when the app reports a state change rather than polling.
    const onChange = () => void load();
    window.addEventListener('bueno_state_updated', onChange);
    return () => window.removeEventListener('bueno_state_updated', onChange);
  }, [load]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, readInt: 1 })));
    try {
      await api.post('notifications.php', { action: 'mark_all_read' });
    } catch {
      void load();
    }
  };

  const markOne = async (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, readInt: 1 } : n)));
    try {
      await api.post('notifications.php', { action: 'mark_read', id });
    } catch {
      void load();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#0E4B88] hover:text-[#62BC37] font-semibold cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-[#62BC37] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && error && (
              <div className="py-8 px-4 text-center text-rose-600 text-xs font-semibold">{error}</div>
            )}

            {!loading && !error && notifs.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-xs">No notifications yet</div>
            )}

            {notifs.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.readInt) void markOne(n.id);
                }}
                className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                  !n.readInt ? 'bg-emerald-50/40' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-xs text-slate-900 ${!n.readInt ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                  {n.body && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.time)}</p>
                </div>
                {!n.readInt && <span className="w-2 h-2 bg-[#62BC37] rounded-full mt-1.5 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
