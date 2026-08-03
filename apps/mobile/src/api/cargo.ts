import { api } from './client';
export const cargoApi = {
  getAll: () => api.get('/cargo-types'),
};
