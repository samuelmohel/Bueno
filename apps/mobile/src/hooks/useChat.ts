/**
 * Chat hook — WebSocket with REST fallback. Get-or-join room on mount.
 * Pattern from Loka's chat.ts: getOrCreateConversation approach.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { chatApi } from '../api/chat';
import { ChatMessage } from '../types';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:3001';

export function useChat(bookingId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Load history on mount
  useEffect(() => {
    if (!bookingId) return;
    chatApi.getMessages(bookingId)
      .then(r => setMessages(r.data ?? []))
      .catch(() => {});
  }, [bookingId]);

  // WebSocket for realtime
  useEffect(() => {
    if (!bookingId) return;

    const socket = io(`${WS_URL}/chat`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:booking', { bookingId });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => { socket.disconnect(); };
  }, [bookingId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data: msg } = await chatApi.send(bookingId, content.trim());
      setMessages(prev => [...prev, msg]);
    } finally {
      setSending(false);
    }
  }, [bookingId]);

  return { messages, sendMessage, sending, connected };
}
