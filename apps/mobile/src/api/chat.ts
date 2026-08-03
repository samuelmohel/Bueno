import { api } from './client';
export const chatApi = {
  getMessages: (bookingId: string) => api.get(`/chat/${bookingId}`),
  send: (bookingId: string, content: string, attachmentUrl?: string) =>
    api.post(`/chat/${bookingId}`, { content, attachmentUrl }),
  markRead: (bookingId: string) => api.post(`/chat/${bookingId}/read`),
};
