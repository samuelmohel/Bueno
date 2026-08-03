import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      auth: { token: typeof window !== 'undefined' ? localStorage.getItem('token') : '' },
    });
  }
  return globalSocket;
}

// ─── Generic socket hook ──────────────────────────────────────────────────────
export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();
    return () => { /* keep alive — singleton */ };
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketRef.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    socketRef.current.on(event, handler);
    return () => { socketRef.current.off(event, handler); };
  }, []);

  return { socket: socketRef.current, emit, on };
}

// ─── Live fleet tracking ──────────────────────────────────────────────────────
export function useFleetTracking(onPosition: (data: any) => void) {
  const { emit, on } = useSocket();

  useEffect(() => {
    emit('fleet:snapshot');
    const off = on('loco:position', onPosition);
    return () => { off(); };
  }, []);
}

// ─── Booking tracking (customer view) ────────────────────────────────────────
export function useBookingTracking(bookingId: string, onUpdate: (data: any) => void) {
  const { emit, on } = useSocket();

  useEffect(() => {
    if (!bookingId) return;
    emit('subscribe:booking', { bookingId });
    const offPos    = on('loco:position',   onUpdate);
    const offStatus = on('booking:status',  onUpdate);
    return () => { offPos(); offStatus(); };
  }, [bookingId]);
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function useNotifications(onNotif: (n: any) => void) {
  const { on } = useSocket();
  useEffect(() => {
    const off = on('notification', onNotif);
    return () => { off(); };
  }, []);
}
