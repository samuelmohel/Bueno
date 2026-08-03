import { api } from './client';
export const trackingApi = {
  getBookingTracking: (bookingId: string) => api.get(`/tracking/booking/${bookingId}`),
  getLocoHistory: (locoId: string, hours?: number) =>
    api.get(`/tracking/loco/${locoId}/history`, { params: { hours } }),
};
