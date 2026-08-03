import { api } from './client';
export const routesApi = {
  getAll: () => api.get('/routes'),
  getById: (id: string) => api.get(`/routes/${id}`),
};
