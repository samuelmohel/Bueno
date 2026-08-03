// Prisma's SQLite connector doesn't support native enums, so these are
// plain TS union types + const objects (used the same way Prisma's
// generated enums used to be: UserRole.CARGO_OFFICER, BookingStatus.IN_TRANSIT, etc.)
// The underlying DB columns are just strings; validity is enforced here in code.

export const UserRole = {
  ADMIN: 'ADMIN',
  HEAD_OF_OPERATIONS: 'HEAD_OF_OPERATIONS',
  CARGO_OFFICER: 'CARGO_OFFICER',
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const WagonType = {
  OPEN_GONDOLA: 'OPEN_GONDOLA',
  FLAT: 'FLAT',
  COVERED_VAN: 'COVERED_VAN',
  CONTAINER_FLAT: 'CONTAINER_FLAT',
  HOPPER: 'HOPPER',
} as const;
export type WagonType = (typeof WagonType)[keyof typeof WagonType];

export const AssetStatus = {
  AVAILABLE: 'AVAILABLE',
  MAINTENANCE: 'MAINTENANCE',
  IN_USE: 'IN_USE',
} as const;
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const AssetCondition = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
} as const;
export type AssetCondition = (typeof AssetCondition)[keyof typeof AssetCondition];

export const BookingStatus = {
  PENDING: 'PENDING',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  COORDINATING: 'COORDINATING',
  WAGON_ALLOCATED: 'WAGON_ALLOCATED',
  CARGO_AT_TERMINAL: 'CARGO_AT_TERMINAL',
  LOADING_IN_PROGRESS: 'LOADING_IN_PROGRESS',
  DEPARTED: 'DEPARTED',
  IN_TRANSIT: 'IN_TRANSIT',
  ARRIVED_DESTINATION: 'ARRIVED_DESTINATION',
  UNLOADING: 'UNLOADING',
  READY_FOR_COLLECTION: 'READY_FOR_COLLECTION',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const MessageType = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  SYSTEM: 'SYSTEM',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const CargoUnit = {
  BAGS: 'BAGS',
  TONNES: 'TONNES',
  UNITS: 'UNITS',
} as const;
export type CargoUnit = (typeof CargoUnit)[keyof typeof CargoUnit];
