/**
 * Live tracking hook — WebSocket connection with auto-reconnect.
 * Polling fallback for when WS is unavailable (offline-resilient).
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { trackingApi } from '../api/tracking';
import { LiveLocation } from '../types';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001';

export function useBookingTracking(bookingId: string, active: boolean) {
  const [location, setLocation] = useState<LiveLocation | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // REST polling fallback
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await trackingApi.getBookingTracking(bookingId);
        if (data?.livePosition) setLocation(data.livePosition);
      } catch { /* keep last known */ }
    }, 8000);
  }, [bookingId]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    if (!active || !bookingId) return;

    const socket = io(`${WS_URL}/tracking`, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      stopPolling();
      socket.emit('subscribe:booking', { bookingId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      startPolling(); // fall back to REST when WS drops
    });

    socket.on('connect_error', () => {
      setConnected(false);
      startPolling();
    });

    socket.on('loco:update', (data: LiveLocation) => setLocation(data));
    socket.on('booking:tracking', (data: any) => {
      if (data?.livePosition) setLocation(data.livePosition);
    });

    // Start polling immediately as a safety net; WS will stop it on connect
    startPolling();

    return () => {
      socket.disconnect();
      stopPolling();
    };
  }, [bookingId, active]);

  return { location, connected };
}
