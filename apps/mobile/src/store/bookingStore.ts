import { create } from 'zustand';
import { Booking, BookingQuote } from '../types';

interface BookingState {
  bookings: Booking[];
  activeBooking: Booking | null;
  quote: BookingQuote | null;
  bookingDraft: Partial<any>;
  setBookings: (b: Booking[]) => void;
  setActiveBooking: (b: Booking | null) => void;
  setQuote: (q: BookingQuote | null) => void;
  updateDraft: (data: Partial<any>) => void;
  clearDraft: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  bookings: [],
  activeBooking: null,
  quote: null,
  bookingDraft: {},
  setBookings: (bookings) => set({ bookings }),
  setActiveBooking: (activeBooking) => set({ activeBooking }),
  setQuote: (quote) => set({ quote }),
  updateDraft: (data) => set((s) => ({ bookingDraft: { ...s.bookingDraft, ...data } })),
  clearDraft: () => set({ bookingDraft: {}, quote: null }),
}));
