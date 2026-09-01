/**
 * BUENO FREIGHT OS — CENTRALIZED ENTERPRISE STATE ENGINE
 * Authoritative Data Repository & Real-time State Synchronization Layer
 */

import { bookingsApi, usersApi } from '@/lib/api';

// ─── INITIAL SEED DATA (FALLBACK CACHE) ───────────────────────────────────────
export const SEED_TRIPS = [
  {
    id: 'TRP-101',
    tripId: 'TRP-101',
    locomotiveId: 'L2205',
    origin: 'EWK',
    destination: 'MNY',
    company: 'Purechem Cement Industries Ltd',
    dealNumber: 'DEAL-88210',
    quantity: 1610,
    cargoOfficerId: 'usr_1',
    cargoOfficerName: 'Ade Bello',
    cargoOfficerPhone: '08031112233',
    unloadingOfficerId: 'usr_4',
    unloadingOfficerName: 'Musa Ibrahim',
    unloadingOfficerPhone: '08034445566',
    escortPhone: '08031112233',
    status: 'COMPLETED',
    dispatchTime: '24 Aug 2026, 09:30 AM',
    arrivalTime: '24 Aug 2026, 02:45 PM',
    wagonLogs: [
      { wagonId: 'PXG 2322', status: 'LOADED', loadedAt: '24 Aug 2026, 08:10 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9801' },
      { wagonId: 'PXG 2323', status: 'LOADED', loadedAt: '24 Aug 2026, 08:25 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9802' },
      { wagonId: 'PXG 2324', status: 'LOADED', loadedAt: '24 Aug 2026, 08:40 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9803' },
    ],
    damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
  },
  {
    id: 'TRP-102',
    tripId: 'TRP-102',
    locomotiveId: 'L2208',
    origin: 'APT',
    destination: 'MNY',
    company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
    dealNumber: 'DEAL-99412',
    quantity: 2300,
    cargoOfficerId: 'usr_6',
    cargoOfficerName: 'Ngozi Eze',
    cargoOfficerPhone: '08036667788',
    unloadingOfficerId: 'usr_5',
    unloadingOfficerName: 'Kassim Ahmed',
    unloadingOfficerPhone: '08035556677',
    escortPhone: '08036667788',
    status: 'IN_TRANSIT',
    dispatchTime: '26 Aug 2026, 11:15 AM',
    arrivalTime: null,
    wagonLogs: [
      { wagonId: 'PXG 4401', status: 'LOADED', loadedAt: '26 Aug 2026, 10:00 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9901' },
      { wagonId: 'PXG 4402', status: 'LOADED', loadedAt: '26 Aug 2026, 10:15 AM', bagsCount: 70, sealNumber: 'SEAL-BN-9902' },
    ],
    damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
  },
];

export const SEED_WAGONS = [
  { id: 'PXG 2322', wagonType: 'Covered Hopper Wagon', payloadCapacity: '60 MT', status: 'AVAILABLE', currentStation: 'MNY', gauge: 'STANDARD_GAUGE' },
  { id: 'PXG 2323', wagonType: 'Covered Hopper Wagon', payloadCapacity: '60 MT', status: 'AVAILABLE', currentStation: 'MNY', gauge: 'STANDARD_GAUGE' },
  { id: 'GND 4401', wagonType: 'Open Top Gondola Wagon', payloadCapacity: '70 MT', status: 'AVAILABLE', currentStation: 'EWK', gauge: 'NARROW_GAUGE' },
  { id: 'FLT 9011', wagonType: 'Flatbed Container Wagon', payloadCapacity: '2 TEU Containers', status: 'AVAILABLE', currentStation: 'APT', gauge: 'STANDARD_GAUGE' },
  { id: 'TNK 8801', wagonType: 'Tanker Wagon', payloadCapacity: '45,000 Liters', status: 'AVAILABLE', currentStation: 'EWK', gauge: 'NARROW_GAUGE' },
];

export const SEED_DEALS = [
  { id: 'dl_1', dealNumber: 'DEAL-88210', company: 'Purechem Cement Industries Ltd', loadingStation: 'EWK', destination: 'MNY', cargoType: 'Bagged Cement (50kg)', quantity: 1610, createdAt: '20 Aug 2026' },
  { id: 'dl_2', dealNumber: 'DEAL-99412', company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', loadingStation: 'APT', destination: 'MNY', cargoType: 'Huaxin Portland Cement (50kg)', quantity: 2300, createdAt: '22 Aug 2026' },
];

export const SEED_REQUESTS = [
  {
    id: 'REQ-901',
    requisitionNo: 'REQ-901',
    category: 'TARPAULIN',
    title: 'Waterproof Tarpaulin Covers for Cement Wagons',
    description: 'Purchase of 15 heavy-duty waterproof tarpaulins to cover open hopper wagons during rainy season transit',
    amount: 350000,
    requestedBy: 'Ade Bello (Cargo Officer)',
    officerId: 'usr_1',
    station: 'EWK',
    tripId: 'TRP-101',
    vesselNo: 'VSL-2026-EWK01',
    stage: 'Accountant',
    status: 'APPROVED',
    paymentDetails: { ref: 'TRF-GTB-998120', disbursedAt: '25 Aug 2026, 04:15 PM' },
    createdAt: '24 Aug 2026, 09:00 AM',
  },
  {
    id: 'REQ-902',
    requisitionNo: 'REQ-902',
    category: 'PAYLOADER',
    title: 'Payloader Fuel & Operator Fee for Moniya Yard',
    description: 'Fuel AGO (200 Liters) and daily operator stipend for Moniya Dry Port hopper unloader',
    amount: 280000,
    requestedBy: 'Musa Ibrahim (Cargo Officer)',
    officerId: 'usr_4',
    station: 'MNY',
    tripId: 'TRP-101',
    vesselNo: 'VSL-2026-MNY04',
    stage: 'Head of Operations',
    status: 'PENDING_APPROVAL',
    createdAt: '26 Aug 2026, 01:20 PM',
  },
];

export const SEED_CONTAINERS = [
  { id: 'MSKU-948210-4', agent: 'MAERSKLINES', size: '40ft HC', type: 'CONTAINERS-IMPORT', arrivalDate: '2026-08-10', bay: 'Bay A', row: 'Row 1', col: 'Col 1', tier: 3, dwellDays: 16, gateStatus: 'IN_YARD' },
  { id: 'APMT-310492-1', agent: 'APMT', size: '20ft STD', type: 'CONTAINERS-EXPORT', arrivalDate: '2026-08-20', bay: 'Bay B', row: 'Row 2', col: 'Col 3', tier: 2, dwellDays: 6, gateStatus: 'IN_YARD' },
  { id: 'MSCU-884019-3', agent: 'MSC', size: '40ft HC', type: 'CONTAINERS-IMPORT', arrivalDate: '2026-08-22', bay: 'Bay A', row: 'Row 3', col: 'Col 2', tier: 1, dwellDays: 4, gateStatus: 'IN_YARD' },
  { id: 'CMAU-102938-7', agent: 'CMA CGM', size: '40ft HC', type: 'EMPTY', arrivalDate: '2026-08-05', bay: 'Bay C', row: 'Row 1', col: 'Col 4', tier: 4, dwellDays: 21, gateStatus: 'IN_YARD' },
];

export const SEED_USERS = [
  // Cargo Officers
  { id: 'usr_1', fullName: 'Ade Bello', email: 'ade.bello@bueno.ng', phone: '08031112233', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_2', fullName: 'Samuel Okafor', email: 'samuel.okafor@bueno.ng', phone: '08032223344', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-02', pin: '2222', status: 'ACTIVE' },
  { id: 'usr_3', fullName: 'Tunde Bakare', email: 'tunde.bakare@bueno.ng', phone: '08033334455', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'EWK', stationName: 'Ewekoro Terminal', staffId: 'EWK-03', pin: '3333', status: 'ACTIVE' },
  { id: 'usr_4', fullName: 'Musa Ibrahim', email: 'musa.ibrahim@bueno.ng', phone: '08034445566', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)', staffId: 'MNY-01', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_5', fullName: 'Kassim Ahmed', email: 'kassim.ahmed@bueno.ng', phone: '08035556677', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'MNY', stationName: 'Moniya Yard (Ibadan)', staffId: 'MNY-02', pin: '2222', status: 'ACTIVE' },
  { id: 'usr_6', fullName: 'Ngozi Eze', email: 'ngozi.eze@bueno.ng', phone: '08036667788', role: 'CARGO_OFFICER', userType: 'STAFF', assignedStation: 'APT', stationName: 'Apapa Maritime Port', staffId: 'APT-01', pin: '1111', status: 'ACTIVE' },

  // Executives
  { id: 'usr_7', fullName: 'Alhaji Bashir Umar', email: 'ceo@bueno.ng', phone: '08030000001', role: 'CEO', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Bueno HQ Command', staffId: 'EXEC-01', pin: '9999', status: 'ACTIVE' },
  { id: 'usr_8', fullName: 'Babajide Sanwo', email: 'ops.command@bueno.ng', phone: '08030000002', role: 'HEAD_OF_OPERATIONS', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Dispatch HQ', staffId: 'EXEC-02', pin: '8888', status: 'ACTIVE' },
  { id: 'usr_9', fullName: 'Folake Adeyemi', email: 'admin@bueno.ng', phone: '08030000003', role: 'ADMIN', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Admin HQ', staffId: 'EXEC-03', pin: '7777', status: 'ACTIVE' },
  { id: 'usr_10', fullName: 'Chinenye Nnamdi', email: 'finance@bueno.ng', phone: '08030000004', role: 'HEAD_OF_FINANCE', userType: 'STAFF', assignedStation: 'HQ', stationName: 'Finance HQ', staffId: 'EXEC-04', pin: '6666', status: 'ACTIVE' },

  // Customers
  { id: 'usr_11', fullName: 'Huaxin Logistics Desk', companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', email: 'logistics@hbm.ng', phone: '08037778899', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_12', fullName: 'Dangote Freight Team', companyName: 'Dangote Cement', email: 'freight@dangotecement.ng', phone: '08038889900', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_13', fullName: 'BUA Logistics Desk', companyName: 'BUA Cement Industries', email: 'logistics@buacement.ng', phone: '08039990011', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
];

// ─── STATE ENGINE SERVICE ───────────────────────────────────────────────────
class StateEngineService {
  private notifyListeners() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bueno_state_updated'));
    }
  }

  private readStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private writeStorage(key: string, value: any) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notifyListeners();
    } catch {}
  }

  // ── TRIPS API ─────────────────────────────────────────────────────────────
  getTrips(): any[] {
    return this.readStorage('bueno_trips', SEED_TRIPS);
  }

  saveTrips(trips: any[]): void {
    this.writeStorage('bueno_trips', trips);
    bookingsApi.list().catch(() => {});
  }

  createTrip(trip: any): void {
    const current = this.getTrips();
    const updated = [trip, ...current];
    this.saveTrips(updated);
  }

  updateTrip(tripId: string, updates: Partial<any>): void {
    const current = this.getTrips();
    const updated = current.map((t) => (t.id === tripId || t.tripId === tripId ? { ...t, ...updates } : t));
    this.saveTrips(updated);
  }

  // ── WAGONS API ────────────────────────────────────────────────────────────
  getWagons(): any[] {
    return this.readStorage('bueno_wagons', SEED_WAGONS);
  }

  saveWagons(wagons: any[]): void {
    this.writeStorage('bueno_wagons', wagons);
  }

  registerWagon(wagon: any): void {
    const current = this.getWagons();
    const updated = [wagon, ...current];
    this.saveWagons(updated);
  }

  // ── DEALS API ─────────────────────────────────────────────────────────────
  getDeals(): any[] {
    return this.readStorage('bueno_deals', SEED_DEALS);
  }

  saveDeals(deals: any[]): void {
    this.writeStorage('bueno_deals', deals);
  }

  // ── NEGOTIATIONS API ──────────────────────────────────────────────────────
  getNegotiations(): any[] {
    return this.readStorage('bueno_custom_deal_negotiations', []);
  }

  saveNegotiations(negotiations: any[]): void {
    this.writeStorage('bueno_custom_deal_negotiations', negotiations);
  }

  // ── REQUISITIONS API ──────────────────────────────────────────────────────
  getRequests(): any[] {
    return this.readStorage('bueno_requests', SEED_REQUESTS);
  }

  saveRequests(requests: any[]): void {
    this.writeStorage('bueno_requests', requests);
  }

  createRequest(req: any): void {
    const current = this.getRequests();
    const updated = [req, ...current];
    this.saveRequests(updated);
  }

  // ── CONTAINERS API ────────────────────────────────────────────────────────
  getContainers(): any[] {
    return this.readStorage('bueno_containers', SEED_CONTAINERS);
  }

  saveContainers(containers: any[]): void {
    this.writeStorage('bueno_containers', containers);
  }

  // ── USERS API ─────────────────────────────────────────────────────────────
  getUsers(): any[] {
    return this.readStorage('bueno_users', SEED_USERS);
  }

  saveUsers(users: any[]): void {
    this.writeStorage('bueno_users', users);
    usersApi.getAll().catch(() => {});
  }

  updateUser(userId: string, updatedFields: any): void {
    const current = this.getUsers();
    const updated = current.map((u) => (u.id === userId || u.email === userId ? { ...u, ...updatedFields } : u));
    this.saveUsers(updated);
  }

  // ── PERMISSIONS MATRIX API ────────────────────────────────────────────────
  getPermissions(): Record<string, string[]> {
    return this.readStorage('bueno_permissions_matrix', {
      ADMIN: ['trip.create', 'trip.dispatch', 'wagon.allocate', 'deal.negotiate', 'manifest.approve', 'financial.disburse', 'user.provision', 'report.export'],
      HEAD_OF_OPERATIONS: ['trip.create', 'trip.dispatch', 'wagon.allocate', 'deal.negotiate', 'manifest.approve', 'report.export'],
      CEO: ['financial.disburse', 'report.export', 'manifest.approve'],
      HEAD_OF_FINANCE: ['financial.disburse', 'report.export'],
      CARGO_OFFICER: ['manifest.approve', 'trip.dispatch'],
      CUSTOMER: ['report.export', 'deal.negotiate'],
    });
  }

  savePermissions(matrix: Record<string, string[]>): void {
    this.writeStorage('bueno_permissions_matrix', matrix);
  }

  // ── ENTERPRISE CLIENT ONBOARDING & DUAL PROVISIONING ──────────────────────
  provisionClientFromRequest(form: any): { reqId: string; staffId: string; pin: string; user: any; request: any } {
    const num = Math.floor(1000 + Math.random() * 9000);
    const reqId = `REQ-2026-${num}`;
    const staffId = `CUST-${num}`;
    const pin = '1111';

    // 1. Create Requisition Object
    const newReq = {
      id: reqId,
      requisitionNo: reqId,
      companyName: form.companyName.trim(),
      product: form.product,
      contactName: form.contactName.trim() || `${form.companyName.trim()} Logistics Manager`,
      email: form.email.trim(),
      phone: form.phone.trim() || '08030000000',
      volume: form.volume,
      route: form.route,
      notes: form.notes || '',
      status: 'PENDING',
      createdAt: new Date().toLocaleString('en-GB'),
    };
    const existingReqs = this.readStorage('bueno_client_requests', []);
    this.writeStorage('bueno_client_requests', [newReq, ...existingReqs]);

    // 2. Auto-Provision Customer Account
    const newUser = {
      id: `usr_${Date.now()}`,
      fullName: newReq.contactName,
      email: newReq.email,
      phone: newReq.phone,
      role: 'CUSTOMER',
      userType: 'CUSTOMER',
      companyName: newReq.companyName,
      staffId: staffId,
      pin: pin,
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('en-GB'),
    };
    const existingUsers = this.getUsers();
    this.saveUsers([newUser, ...existingUsers]);

    // 3. Auto-Initialize Client Negotiation Thread in Database
    const initialThread = {
      id: `DEAL-NEG-${newReq.id}`,
      companyName: newReq.companyName,
      email: newReq.email.toLowerCase(),
      contactName: newReq.contactName,
      loadingStation: newReq.route?.includes('EWK') ? 'EWK' : newReq.route?.includes('APT') ? 'APT' : 'PAPA',
      destination: 'MNY',
      cargoType: newReq.product,
      quantity: newReq.volume,
      status: 'PENDING_REVIEW',
      createdAt: newReq.createdAt,
      messages: [
        {
          sender: newReq.contactName,
          role: 'Industrial Consignee',
          text: `Requisition Note Submitted: Requesting freight haulage for ${newReq.product} [${newReq.volume}] via ${newReq.route}. Notes: ${newReq.notes || 'None'}`,
          time: newReq.createdAt,
        },
      ],
    };
    const existingDeals = this.readStorage('bueno_custom_deal_negotiations', []);
    const filteredOther = existingDeals.filter((d: any) => d.email?.toLowerCase() !== newReq.email.toLowerCase());
    this.writeStorage('bueno_custom_deal_negotiations', [initialThread, ...filteredOther]);

    // 4. Dispatch System Notification Alert for Admin & Operations
    const existingNotifs = this.readStorage('bueno_notifications', []);
    const newNotif = {
      id: `notif_${Date.now()}`,
      title: 'New Industrial Client Freight Requisition Received',
      body: `${newReq.companyName} (${newReq.contactName}) requested ${newReq.product} [${newReq.volume}] via ${newReq.route}`,
      time: 'Just now',
      type: 'CLIENT_REQUEST',
      reqId: reqId,
      read: false,
    };
    this.writeStorage('bueno_notifications', [newNotif, ...existingNotifs]);

    // 4. Trigger Real-time Transactional Email Webhook (cPanel send_mail API)
    if (typeof window !== 'undefined' && newReq.email) {
      fetch('/api/send_mail.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newReq.email,
          companyName: newReq.companyName,
          contactName: newReq.contactName,
          staffId: staffId,
          pin: pin,
          reqId: reqId,
          route: newReq.route,
          volume: newReq.volume,
        }),
      }).catch(() => {});
    }

    return { reqId, staffId, pin, user: newUser, request: newReq };
  }

  // ─── Settings Repository ──────────────────────────────────────────────────
  getSettings(): { allowAdminClientNegotiations: boolean; autoDispatchEmail: boolean } {
    return this.readStorage('bueno_system_settings', {
      allowAdminClientNegotiations: true,
      autoDispatchEmail: true,
    });
  }

  saveSettings(settings: any): void {
    this.writeStorage('bueno_system_settings', settings);
  }

  // ─── PERMISSIONS MATRIX & TAB ACCESS API ─────────────────────────────────
  getRolePermissions(): Record<string, string[]> {
    return this.readStorage('bueno_role_permissions', DEFAULT_ROLE_TAB_PERMISSIONS);
  }

  saveRolePermissions(matrix: Record<string, string[]>): void {
    this.writeStorage('bueno_role_permissions', matrix);
  }

  canUserAccessTab(user: any, tabId: string): boolean {
    if (!user) return false;
    const role = user.role || 'GUEST';
    if (role === 'ADMIN' || role === 'CEO' || role === 'MD') return true;

    const matrix = this.getRolePermissions();
    const allowedTabs = matrix[role] || DEFAULT_ROLE_TAB_PERMISSIONS[role] || [];
    return allowedTabs.includes(tabId);
  }
}

export const DEFAULT_ROLE_TAB_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'billing', 'users', 'permissions'],
  CEO: ['analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'billing', 'users', 'permissions'],
  MD: ['analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'billing', 'users', 'permissions'],
  HEAD_OF_OPERATIONS: ['analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest'],
  HEAD_OF_FINANCE: ['analytics', 'fund_requisitions', 'billing'],
  ACCOUNTANT: ['analytics', 'fund_requisitions', 'billing'],
  CARGO_OFFICER: ['loading', 'unloading', 'dispatch', 'wagons', 'requisitions', 'telemetry', 'manifest', 'history'],
  CUSTOMER: ['deals', 'negotiations', 'billing', 'telemetry', 'manifest', 'account'],
  CONSIGNEE: ['deals', 'negotiations', 'billing', 'telemetry', 'manifest', 'account'],
};

export const StateEngine = new StateEngineService();
