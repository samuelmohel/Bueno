'use client';

import { useEffect, useRef, useState } from 'react';
import { notifApi } from '@/lib/api';
import { useNotifications } from '@/lib/socket';

type Notif = { id: string; title: string; body: string; type: string; read: string | null; createdAt: string };

// ─── Time ago helper ──────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Type Icon ────────────────────────────────────────────────────────────────
const TYPE_ICON: Record<string, string> = {
  BOOKING:  '📦',
  PAYMENT:  '💳',
  FLEET:    '🚂',
  TRACKING: '📍',
  SYSTEM:   '🔔',
};

// ─── Notifications Bell ───────────────────────────────────────────────────────
export function NotificationBell() {
  const [notifs, setNotifs]   = useState<Notif[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef           = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  // Load notifications
  const load = () => {
    setLoading(true);
    notifApi.list().then((r) => setNotifs(r.data.notifications ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Live new notifications via WebSocket
  useNotifications((n: Notif) => {
    setNotifs((prev) => [n, ...prev]);
    // Browser notification (if permitted)
    if (Notification.permission === 'granted') {
      new Notification(n.title, { body: n.body });
    }
  });

  const markAllRead = () => {
    notifApi.readAll().then(load);
  };

  const markOne = (id: string) => {
    notifApi.readOne(id).then(load);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {loading && (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="py-10 text-center text-gray-400 text-sm">
                <p className="text-2xl mb-2">🔔</p>
                No notifications yet
              </div>
            )}

            {notifs.map((n) => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) markOne(n.id); }}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
              >
                <div className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? '🔔'}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-gray-900 ${!n.read ? 'font-semibold' : ''}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
