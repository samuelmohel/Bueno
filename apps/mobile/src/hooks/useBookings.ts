/**
 * Bookings hook — sequential data loading to avoid stampeding the server.
 * Pattern from Loka: loadSequentially with delays between calls.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsApi } from '../api/bookings';
import { routesApi } from '../api/routes';
import { cargoApi } from '../api/cargo';
import { loadSequentially } from '../api/client';
import { Booking, Route, CargoType, BookingQuote } from '../types';

export function useBookingsList(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsApi.getAll(params).then(r => r.data),
    staleTime: 30000,
  });
}

export function useBookingDetail(id: string) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsApi.getById(id).then(r => r.data),
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useBookingFormData() {
  return useQuery({
    queryKey: ['booking-form-data'],
    queryFn: async () => {
      // Sequential loading — don't fire both simultaneously (Loka pattern)
      const [routes, cargoTypes] = await loadSequentially([
        () => routesApi.getAll().then(r => r.data as Route[]),
        () => cargoApi.getAll().then(r => r.data as CargoType[]),
      ], 200);
      return { routes: routes ?? [], cargoTypes: cargoTypes ?? [] };
    },
    staleTime: 5 * 60 * 1000, // 5 min — routes/cargo types don't change often
  });
}

export function useWagonQuote() {
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (routeId: string, cargoTypeId: string, weight: number) => {
    if (!routeId || !cargoTypeId || weight <= 0) { setQuote(null); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await bookingsApi.getQuote(routeId, cargoTypeId, weight);
      setQuote(data);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not calculate quote');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { quote, loading, error, fetchQuote, clearQuote: () => setQuote(null) };
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
