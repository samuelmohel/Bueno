const map: Record<string, string> = {
  BOOKING_CONFIRMED: 'badge-blue', COORDINATING: 'badge-yellow',
  WAGON_ALLOCATED: 'badge-purple', CARGO_AT_TERMINAL: 'badge-orange',
  LOADING_IN_PROGRESS: 'badge-orange', DEPARTED: 'badge-purple',
  IN_TRANSIT: 'badge-purple', ARRIVED_DESTINATION: 'badge-teal',
  UNLOADING: 'badge-teal', READY_FOR_COLLECTION: 'badge-green',
  COMPLETED: 'badge-green', CANCELLED: 'badge-red',
  PAID: 'badge-green', PENDING: 'badge-yellow', FAILED: 'badge-red',
  AVAILABLE: 'badge-green', IN_USE: 'badge-blue', MAINTENANCE: 'badge-red',
  DECOMMISSIONED: 'badge-gray',
};
const labels: Record<string, string> = {
  BOOKING_CONFIRMED: 'Confirmed', COORDINATING: 'Coordinating',
  WAGON_ALLOCATED: 'Wagon Allocated', CARGO_AT_TERMINAL: 'At Terminal',
  LOADING_IN_PROGRESS: 'Loading', DEPARTED: 'Departed',
  IN_TRANSIT: 'In Transit', ARRIVED_DESTINATION: 'Arrived',
  UNLOADING: 'Unloading', READY_FOR_COLLECTION: 'Ready',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  PAID: 'Paid', PENDING: 'Pending', FAILED: 'Failed',
  AVAILABLE: 'Available', IN_USE: 'In Use',
  MAINTENANCE: 'Maintenance', DECOMMISSIONED: 'Decommissioned',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={map[status] || 'badge-gray'}>{labels[status] || status}</span>;
}
