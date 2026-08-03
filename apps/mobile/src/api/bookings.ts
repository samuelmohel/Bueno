import { api } from './client';

export const bookingsApi = {
  getQuote: (routeId: string, cargoTypeId: string, weight: number) =>
    api.get('/bookings/quote', { params: { routeId, cargoTypeId, weight } }),

  create: (data: {
    routeId: string; cargoTypeId: string; cargoWeightTonnes: number;
    specialInstructions?: string; dropOffDate?: string;
    destinationContact?: string; destinationPhone?: string;
  }) => api.post('/bookings', data),

  getAll: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/bookings', { params }),

  getById: (id: string) => api.get(`/bookings/${id}`),

  initPayment: (id: string) => api.post(`/bookings/${id}/pay`),

  verifyPayment: (ref: string) => api.post(`/bookings/verify/${ref}`),
};
