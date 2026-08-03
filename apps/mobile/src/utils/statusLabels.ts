export const BOOKING_STATUS_LABELS: Record<string, string> = {
  BOOKING_CONFIRMED: 'Booking confirmed',
  COORDINATING: 'Coordinating pickup',
  WAGON_ALLOCATED: 'Wagons assigned',
  CARGO_AT_TERMINAL: 'Cargo at terminal',
  LOADING_IN_PROGRESS: 'Loading in progress',
  DEPARTED: 'Train departed',
  IN_TRANSIT: 'In transit',
  ARRIVED_DESTINATION: 'Arrived at destination',
  UNLOADING: 'Unloading cargo',
  READY_FOR_COLLECTION: 'Ready for collection',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const BOOKING_STATUS_COLOR: Record<string, string> = {
  BOOKING_CONFIRMED: '#2563eb',
  COORDINATING: '#d97706',
  WAGON_ALLOCATED: '#7c3aed',
  CARGO_AT_TERMINAL: '#ea580c',
  LOADING_IN_PROGRESS: '#ea580c',
  DEPARTED: '#7c3aed',
  IN_TRANSIT: '#7c3aed',
  ARRIVED_DESTINATION: '#0891b2',
  UNLOADING: '#0891b2',
  READY_FOR_COLLECTION: '#16a34a',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
};

export const ACTIVE_STATUSES = [
  'BOOKING_CONFIRMED','COORDINATING','WAGON_ALLOCATED',
  'CARGO_AT_TERMINAL','LOADING_IN_PROGRESS','DEPARTED','IN_TRANSIT',
  'ARRIVED_DESTINATION','UNLOADING','READY_FOR_COLLECTION',
];
