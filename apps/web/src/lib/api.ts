import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({ baseURL: BASE });

// Attach JWT from localStorage on every request
// FIX: key is "bueno_token" — matches what login page stores
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bueno_token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Authentication ───────────────────────────────────────────────────────────
// FIX: added authApi — was missing, causing login/page.tsx import error
export const authApi = {
  login:    (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any)                       => api.post('/auth/register', data),
  me:       ()                                => api.get('/auth/me'),
  logout:   ()                                => api.post('/auth/logout'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
// FIX: added usersApi — was missing, causing drivers/page.tsx import error
// drivers/page.tsx calls usersApi.getAll({ role: 'DRIVER' })
export const usersApi = {
  getAll:  (q?: any)            => api.get('/users', { params: q }),
  create:  (data: any)          => api.post('/users', data),
  get:     (id: string)         => api.get(`/users/${id}`),
  me:      ()                   => api.get('/users/me'),
  update:  (id: string, d: any) => api.patch(`/users/${id}`, d),
  stats:   ()                   => api.get('/users/stats'),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats:          ()                => api.get('/dashboard/stats'),
  recentBookings: ()                => api.get('/dashboard/recent-bookings'),
  revenueChart:   ()                => api.get('/dashboard/revenue-chart'),
  liveFleet:      ()                => api.get('/dashboard/live-fleet'),
  reports:        (period?: string) => api.get('/dashboard/reports', { params: { period } }),
};

// ─── Bookings (= Trips) ─────────────────────────────────────────────────────
export const bookingsApi = {
  list:        (q?: any)            => api.get('/bookings', { params: q }),
  get:         (id: string)         => api.get(`/bookings/${id}`),
  publicTrack: (code: string)       => api.get(`/bookings/track/${code}`),
  create:      (data: any)          => api.post('/bookings', data),
  quote:       (q: any)             => api.get('/bookings/quote', { params: q }),
  stats:       ()                   => api.get('/bookings/stats'),
  pay:         (id: string)         => api.post(`/bookings/${id}/pay`),
  verify:      (ref: string)        => api.post(`/bookings/verify/${ref}`),
  status:      (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
  allocate:    (id: string, d: any) => api.post(`/bookings/${id}/allocate`, d),
  // aliases used elsewhere in the app
  getAll:         (q?: any)            => api.get('/bookings', { params: q }),
  getById:        (id: string)         => api.get(`/bookings/${id}`),
  updateStatus:   (id: string, status: string) => api.patch(`/bookings/${id}/status`, { status }),
  allocateWagons: (id: string, d: any) => api.post(`/bookings/${id}/allocate`, d),
};


// ─── Cargo Inventory (load / unload — the same record used at both ends) ────
export const cargoItemsApi = {
  add:    (wagonAllocationId: string, data: any) =>
    api.post(`/bookings/wagon-allocations/${wagonAllocationId}/cargo-items`, data),
  unload: (itemId: string, data: any) =>
    api.patch(`/bookings/cargo-items/${itemId}/unload`, data),
  remove: (itemId: string) =>
    api.post(`/bookings/cargo-items/${itemId}/remove`),
  addFeederTruck: (wagonAllocationId: string, data: any) =>
    api.post(`/bookings/wagon-allocations/${wagonAllocationId}/feeder-truck`, data),
  getFeederTrucks: (wagonAllocationId: string) =>
    api.get(`/bookings/wagon-allocations/${wagonAllocationId}/feeder-trucks`),
  submitUnloadAudit: (wagonAllocationId: string, data: any) =>
    api.post(`/bookings/wagon-allocations/${wagonAllocationId}/unload-audit`, data),
  getUnloadAudit: (wagonAllocationId: string) =>
    api.get(`/bookings/wagon-allocations/${wagonAllocationId}/unload-audit`),
};

// ─── Fleet ────────────────────────────────────────────────────────────────────
export const fleetApi = {
  wagons:      (q?: any)            => api.get('/fleet/wagons', { params: q }),
  wagonStats:  ()                   => api.get('/fleet/wagons/stats'),
  wagon:       (id: string)         => api.get(`/fleet/wagons/${id}`),
  createWagon: (data: any)          => api.post('/fleet/wagons', data),
  updateWagon: (id: string, d: any) => api.patch(`/fleet/wagons/${id}`, d),

  locos:       (q?: any)            => api.get('/fleet/locos', { params: q }),
  loco:        (id: string)         => api.get(`/fleet/locos/${id}`),
  createLoco:  (data: any)          => api.post('/fleet/locos', data),
  updateLoco:  (id: string, d: any) => api.patch(`/fleet/locos/${id}`, d),

  inspect:     (data: any)          => api.post('/fleet/inspect', data),
  fuel:        (id: string, d: any) => api.post(`/fleet/locos/${id}/fuel`, d),

  // aliases used elsewhere in the app
  getWagons:     (q?: any)            => api.get('/fleet/wagons', { params: q }),
  getWagonStats: ()                   => api.get('/fleet/wagons/stats'),
  getLocos:      (q?: any)            => api.get('/fleet/locos', { params: q }),
  fuelLog:       (id: string, d: any) => api.post(`/fleet/locos/${id}/fuel`, d),
};

// ─── Routes ───────────────────────────────────────────────────────────────────
export const routesApi = {
  list:   (q?: any)            => api.get('/routes', { params: q }),
  get:    (id: string)         => api.get(`/routes/${id}`),
  create: (data: any)          => api.post('/routes', data),
  update: (id: string, d: any) => api.patch(`/routes/${id}`, d),
  getAll: (q?: any)            => api.get('/routes', { params: q }),
};

// ─── Cargo ────────────────────────────────────────────────────────────────────
export const cargoApi = {
  list:   (q?: any)            => api.get('/cargo-types', { params: q }),
  create: (data: any)          => api.post('/cargo-types', data),
  update: (id: string, d: any) => api.patch(`/cargo-types/${id}`, d),
  getAll: (q?: any)            => api.get('/cargo-types', { params: q }),
};

// ─── Tracking ─────────────────────────────────────────────────────────────────
export const trackingApi = {
  live:        ()                       => api.get('/tracking/live'),
  loco:        (id: string)             => api.get(`/tracking/loco/${id}`),
  locoHistory: (id: string, hours = 24) => api.get(`/tracking/loco/${id}/history`, { params: { hours } }),
  booking:     (id: string)             => api.get(`/tracking/booking/${id}`),
  simulate:    (data: any)              => api.post('/tracking/simulate', data),
};


// ─── Notifications ────────────────────────────────────────────────────────────
export const notifApi = {
  list:    (page = 1)    => api.get('/notifications', { params: { page } }),
  readAll: ()            => api.patch('/notifications/read'),
  readOne: (id: string)  => api.patch(`/notifications/${id}/read`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const chatApi = {
  messages: (bookingId: string)          => api.get(`/chat/${bookingId}`),
  send:     (bookingId: string, data: { content: string }) => api.post(`/chat/${bookingId}`, data),
};

// ─── Annual Budgeting & Officer KPI Scorecards (Mr. Niyi Spec) ────────────────
export const budgetApi = {
  getYearly:            (year?: number)                 => api.get('/budget/yearly', { params: { year } }),
  setTerminalBudget:    (data: any)                     => api.post('/budget/terminal', data),
  getOfficerScorecards: (year?: number, month?: number) => api.get('/budget/scorecards', { params: { year, month } }),
  assignOfficerTarget:  (data: any)                     => api.post('/budget/officer-targets', data),
};
