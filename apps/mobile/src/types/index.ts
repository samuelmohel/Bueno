export type UserRole = 'CUSTOMER' | 'DRIVER' | 'CARGO_OFFICER' | 'HEAD_OF_OPERATIONS' | 'ADMIN';

export type BookingStatus =
  | 'BOOKING_CONFIRMED' | 'COORDINATING' | 'WAGON_ALLOCATED'
  | 'CARGO_AT_TERMINAL' | 'LOADING_IN_PROGRESS' | 'DEPARTED'
  | 'IN_TRANSIT' | 'ARRIVED_DESTINATION' | 'UNLOADING'
  | 'READY_FOR_COLLECTION' | 'COMPLETED' | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  verified: boolean;
}

export interface Route {
  id: string;
  routeName: string;
  originTerminal: string;
  destinationTerminal: string;
  distanceKm: number;
  estimatedDurationHr: number;
  pricing?: RoutePricing[];
}

export interface RoutePricing {
  id: string;
  pricePerWagonNgn: number;
  fuelSurchargePct: number;
}

export interface CargoType {
  id: string;
  name: string;
  defaultWagonCapacityT: number;
  densityTPerM3?: number;
  handlingNotes?: string;
  requiresSpecialWagon: boolean;
}

export interface BookingQuote {
  route: Route;
  cargoType: CargoType;
  wagonsRequired: number;
  locosRequired: number;
  pricing: {
    pricePerWagon: number;
    fuelSurchargePct: number;
    subtotal: number;
    surcharge: number;
    totalAmountNgn: number;
  };
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerId: string;
  route: Route;
  cargoType: CargoType;
  cargoWeightTonnes: number;
  wagonsRequired: number;
  locosRequired: number;
  totalAmountNgn: number;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  specialInstructions?: string;
  dropOffDate?: string;
  destinationContact?: string;
  destinationPhone?: string;
  createdAt: string;
  events?: BookingEvent[];
  wagonAllocations?: WagonAllocation[];
  chatMessages?: ChatMessage[];
}

export interface BookingEvent {
  id: string;
  status: string;
  title: string;
  description?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

export interface WagonAllocation {
  id: string;
  wagon: { serialNumber: string; wagonType: string };
  loco: { serialNumber: string; model: string; currentLat?: number; currentLng?: number };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  attachmentUrl?: string;
  readAt?: string;
  createdAt: string;
  sender: { id: string; fullName: string; role: UserRole };
}

export interface LiveLocation {
  locoId: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  updatedAt: number;
}
