import { api } from './client';
export const notificationsApi = {
  getAll: (page?: number) => api.get('/notifications', { params: { page } }),
  markAllRead: () => api.patch('/notifications/read'),
  markOne: (id: string) => api.patch(`/notifications/${id}/read`),
};
