/**
 * BUENO FREIGHT OS — CENTRALIZED ENTERPRISE STATE ENGINE
 * Authoritative Data Repository & Real-time State Synchronization Layer
 */

import { bookingsApi, usersApi } from '@/lib/api';

// ─── INITIAL SEED DATA (FALLBACK CACHE) ───────────────────────────────────────
export const OFFICIAL_PXG_CODES = [
  "PXG 09029", "PXG 09033", "PXG 09037", "PXG 09022", "PXG 09001",
  "PXG 09031", "PXG 09036", "PXG 09023", "PXG 09021", "PXG 09025",
  "PXG 09008", "PXG 09019", "PXG 09055", "PXG 09038", "PXG 09004",
  "PXG 09015", "PXG 09040", "PXG 09056", "PXG 09016", "PXG 09009",
  "PXG 09028", "PXG 09030", "PXG 09017", "PXG 09059", "PXG 09003",
  "PXG 09013", "PXG 09014", "PXG 09039", "PXG 09012", "PXG 09010",
  "PXG 09026", "PXG 09005", "PXG 09041", "PXG 09007", "PXG 09061",
  "PXG 09062", "PXG 09020", "PXG 09002", "PXG 09066", "PXG 09018",
  "PXG 09035", "PXG 09032", "PXG 09060", "PXG 09011", "PXG 09024",
  "PXG 09034"
];

// ─── CANONICAL SEED TRIPS (EMPTY CLEAN SLATE) ─────────────────────────────────
export const SEED_TRIPS: any[] = [];

export const SEED_WAGONS = OFFICIAL_PXG_CODES.map((id, index) => ({
  id,
  wagonType: 'PXG Covered Hopper Wagon',
  payloadCapacity: '60 MT (1,200 Bags)',
  capacity: 1200,
  status: 'AVAILABLE',
  currentStation: index < 23 ? 'PAPA' : 'MNY',
  gauge: 'STANDARD_GAUGE',
  addedBy: 'System Registry',
  createdAt: '07 Aug 2026',
}));

// ─── CANONICAL SEED DEALS (EMPTY CLEAN SLATE) ─────────────────────────────────
export const SEED_DEALS: any[] = [];

export const SEED_REQUESTS: any[] = [];

export const SEED_CONTAINERS = [
  { id: 'MSKU-948210-4', agent: 'MAERSKLINES', size: '40ft HC', type: 'CONTAINERS-IMPORT', arrivalDate: '2026-08-10', bay: 'Bay A', row: 'Row 1', col: 'Col 1', tier: 3, dwellDays: 16, gateStatus: 'IN_YARD' },
  { id: 'APMT-310492-1', agent: 'APMT', size: '20ft STD', type: 'CONTAINERS-EXPORT', arrivalDate: '2026-08-20', bay: 'Bay B', row: 'Row 2', col: 'Col 3', tier: 2, dwellDays: 6, gateStatus: 'IN_YARD' },
  { id: 'MSCU-884019-3', agent: 'MAERSKLINES', size: '40ft HC', type: 'CONTAINERS-IMPORT', arrivalDate: '2026-08-22', bay: 'Bay A', row: 'Row 3', col: 'Col 2', tier: 1, dwellDays: 4, gateStatus: 'IN_YARD' },
  { id: 'CMAU-102938-7', agent: 'APMT', size: '40ft HC', type: 'EMPTY', arrivalDate: '2026-08-05', bay: 'Bay C', row: 'Row 1', col: 'Col 4', tier: 4, dwellDays: 21, gateStatus: 'IN_YARD' },
];

export const SEED_GATE_LOGS = [
  { id: 'GT-88401', truckRegNo: 'KJA-482-XY', driverName: 'Ibrahim Garba', driverPhone: '08031112233', transporter: 'Mainstream Haulage Ltd', containerId: 'MSKU-948210-4', action: 'INBOUND_RECEIVE', feePaid: 2000, timestamp: '26 Aug 2026, 08:15 AM' },
  { id: 'GT-88402', truckRegNo: 'LSD-901-AB', driverName: 'Suleiman Bello', driverPhone: '08023334455', transporter: 'APMT Logistics Fleet', containerId: 'APMT-310492-1', action: 'INBOUND_RECEIVE', feePaid: 2000, timestamp: '26 Aug 2026, 09:30 AM' },
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

  // Approved Industrial Customers (HBM is sole cement client, plus APMT, MAERSK, BAT, DHL, DASCO)
  { id: 'usr_11', fullName: 'Huaxin Logistics Desk', companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', email: 'logistics@hbm.ng', phone: '08037778899', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_12', fullName: 'APMT Rail Terminal Desk', companyName: 'APM Terminals Ltd (APMT)', email: 'rail@apmt.com', phone: '08038889900', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_13', fullName: 'Maersk Freight Operations', companyName: 'MAERSKLINES Nigeria', email: 'cargo@maersk.com', phone: '08039990011', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_14', fullName: 'BAT Supply Chain Desk', companyName: 'British American Tobacco (BAT)', email: 'supplychain@bat.ng', phone: '08039990022', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_15', fullName: 'DHL Intermodal Rail Team', companyName: 'DHL Global Forwarding', email: 'freight@dhl.com', phone: '08039990033', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_16', fullName: 'DASCO Industrial Haulage', companyName: 'DASCO Industries Ltd', email: 'logistics@dasco.ng', phone: '08039990044', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
];

export const SEED_INVOICES: any[] = [];

export const SEED_TRIP_COSTS: any[] = [];

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
      let item = localStorage.getItem(key);
      if (item && (item.includes('Lafarge Africa') || item.includes('logistics@lafarge.ng') || item.includes('Elephant Cement') || item.includes('freight@dangotecement.ng') || item.includes('Dangote Cement Industry') || item.includes('Purechem Cement') || item.includes('logistics@buacement.ng'))) {
        item = item
          .replace(/Lafarge Africa Plc/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
          .replace(/Lafarge Africa/gi, 'HBM (Huaxin Building Materials Nig Plc)')
          .replace(/Lafarge Logistics Desk/gi, 'Huaxin Logistics Desk')
          .replace(/logistics@lafarge\.ng/gi, 'logistics@hbm.ng')
          .replace(/Elephant Cement \(50kg bags\)/gi, 'Huaxin Portland Cement (50kg bags)')
          .replace(/Elephant Cement \(50kg Bags\)/gi, 'Huaxin Portland Cement (50kg Bags)')
          .replace(/Elephant Cement/gi, 'Huaxin Portland Cement')
          .replace(/Purechem Cement Industries Ltd/gi, 'APM Terminals Ltd (APMT)')
          .replace(/Purechem Logistics Team/gi, 'APMT Rail Terminal Desk')
          .replace(/logistics@purechem\.ng/gi, 'rail@apmt.com')
          .replace(/BUA Cement Industries/gi, 'DASCO Industries Ltd')
          .replace(/BUA Logistics Desk/gi, 'DASCO Industrial Haulage')
          .replace(/logistics@buacement\.ng/gi, 'logistics@dasco.ng')
          .replace(/Dangote Cement Industries/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
          .replace(/Dangote Cement Industry/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
          .replace(/Dangote Freight Team/gi, 'Huaxin Logistics Desk')
          .replace(/freight@dangotecement\.ng/gi, 'logistics@hbm.ng');
        localStorage.setItem(key, item);
      }
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

  private postRemote(url: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }

  async syncRemote(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      // 1. Authoritative REST Sync with NestJS Backend
      const token = localStorage.getItem('bueno_token');
      if (token) {
        try {
          const res = await bookingsApi.getAll().catch(() => null);
          if (res && res.data && Array.isArray(res.data)) {
            const remoteBookings = res.data;
            if (remoteBookings.length > 0) {
              const mappedTrips = remoteBookings.map((b: any) => ({
                id: b.id,
                tripId: b.bookingCode || b.id,
                company: b.customer?.fullName || b.customer?.email || 'Industrial Consignee',
                origin: b.route?.originTerminal || 'PAPA',
                destination: b.route?.destinationTerminal || 'MNY',
                cargoType: b.cargoType?.name || 'Bagged Cement (50kg)',
                quantity: b.cargoWeightTonnes || 60,
                unitOfMeasure: 'Metric Tonnes (MT)',
                status: b.bookingStatus || 'LOADING',
                progressPercent: b.bookingStatus === 'COMPLETED' ? 100 : (b.bookingStatus === 'IN_TRANSIT' ? 45 : 5),
                speed: b.bookingStatus === 'IN_TRANSIT' ? 68 : 0,
                locomotiveId: b.trainNumber || 'L2205',
                createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB') : 'Today',
                wagonLogs: (b.wagonAllocations || []).map((wa: any, i: number) => ({
                  wagonId: wa.wagon?.serialNumber || `PXG 090${20 + i}`,
                  loadedAt: wa.allocatedAt ? new Date(wa.allocatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready',
                  condition: 'LOADED_INTACT',
                  bagsCount: '1,200 Bags (60 MT)',
                  burstBags: 0,
                  damageQty: 0,
                })),
                damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
              }));

              const localTrips = this.getTrips();
              const mergedMap = new Map<string, any>();
              localTrips.forEach((t: any) => mergedMap.set(t.id, t));
              mappedTrips.forEach((t: any) => {
                const existing = mergedMap.get(t.id);
                mergedMap.set(t.id, existing ? { ...t, ...existing } : t);
              });
              this.writeStorage('bueno_trips', Array.from(mergedMap.values()));
            }
          }
        } catch {}
      }
    } catch {}
  }


  cleanseLafargeAndMigrateHbm(): void {
    if (typeof window === 'undefined') return;
    try {
      const keys = [
        'bueno_user',
        'bueno_users',
        'bueno_deals',
        'bueno_custom_deal_negotiations',
        'bueno_trips',
        'bueno_invoices',
        'bueno_requests',
        'bueno_notifications',
        'bueno_containers',
      ];
      let changed = false;
      keys.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val && (val.includes('Lafarge Africa') || val.includes('logistics@lafarge.ng') || val.includes('Elephant Cement') || val.includes('freight@dangotecement.ng') || val.includes('Dangote Cement Industry') || val.includes('Purechem Cement') || val.includes('logistics@buacement.ng'))) {
          const sanitized = val
            .replace(/Lafarge Africa Plc/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
            .replace(/Lafarge Africa/gi, 'HBM (Huaxin Building Materials Nig Plc)')
            .replace(/Lafarge Logistics Desk/gi, 'Huaxin Logistics Desk')
            .replace(/logistics@lafarge\.ng/gi, 'logistics@hbm.ng')
            .replace(/Elephant Cement \(50kg bags\)/gi, 'Huaxin Portland Cement (50kg bags)')
            .replace(/Elephant Cement \(50kg Bags\)/gi, 'Huaxin Portland Cement (50kg Bags)')
            .replace(/Elephant Cement/gi, 'Huaxin Portland Cement')
            .replace(/Purechem Cement Industries Ltd/gi, 'APM Terminals Ltd (APMT)')
            .replace(/Purechem Logistics Team/gi, 'APMT Rail Terminal Desk')
            .replace(/logistics@purechem\.ng/gi, 'rail@apmt.com')
            .replace(/BUA Cement Industries/gi, 'DASCO Industries Ltd')
            .replace(/BUA Logistics Desk/gi, 'DASCO Industrial Haulage')
            .replace(/logistics@buacement\.ng/gi, 'logistics@dasco.ng')
            .replace(/Dangote Cement Industries/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
            .replace(/Dangote Cement Industry/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
            .replace(/Dangote Freight Team/gi, 'Huaxin Logistics Desk')
            .replace(/freight@dangotecement\.ng/gi, 'logistics@hbm.ng');
          localStorage.setItem(k, sanitized);
          changed = true;
        }
      });
      if (changed) {
        this.notifyListeners();
      }
    } catch {}
  }

  // ── PRODUCTION CLEAN SLATE / PURGE DEMO DATA ──────────────────────────────
  purgeDemoData(): void {
    this.cleanProductionPurge();
  }

  cleanProductionPurge(): void {
    if (typeof window === 'undefined') return;
    try {
      this.writeStorage('bueno_trips', []);
      this.writeStorage('bueno_trip_costs', []);
      this.writeStorage('bueno_invoices', []);
      this.writeStorage('bueno_requests', []);
      this.cleanseLafargeAndMigrateHbm();
      this.writeStorage('bueno_deals', []);
      this.writeStorage('bueno_custom_deal_negotiations', []);
      this.writeStorage('bueno_client_requests', []);
      this.writeStorage('bueno_users', SEED_USERS);
      localStorage.setItem('bueno_prod_purge_clean_v15', 'purged');
      this.postRemote('/api/trips.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/trip_costs.php', []);
      this.postRemote('/api/invoices.php', []);
      this.postRemote('/api/requests.php', []);
      this.postRemote('/api/deals.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/users.php', SEED_USERS);
      this.notifyListeners();
    } catch {}
  }

  seedInitialProductionState(): void {
    if (typeof window === 'undefined') return;
    try {
      // Always cleanse any stray legacy mock entries in browser storage
      this.cleanseLafargeAndMigrateHbm();

      // Cleanse and deduplicate wagons fleet to strictly 46 official dedicated hoppers
      const storedWagons = this.readStorage<any[]>('bueno_wagons', SEED_WAGONS);
      if (!Array.isArray(storedWagons) || storedWagons.length !== 46 || storedWagons.some((w: any) => w.id?.startsWith('PXG 00') || w.id?.startsWith('WG') || w.id?.startsWith('CBX'))) {
        this.writeStorage('bueno_wagons', SEED_WAGONS);
      }

      const isPurged = localStorage.getItem('bueno_prod_purge_clean_v15');
      if (isPurged !== 'purged') {
        // Complete Clean Slate Purge: Zero initial mock deals or trips
        this.writeStorage('bueno_trips', []);
        this.writeStorage('bueno_deals', []);
        this.writeStorage('bueno_trip_costs', []);
        this.writeStorage('bueno_invoices', []);
        this.writeStorage('bueno_requests', []);
        this.writeStorage('bueno_custom_deal_negotiations', []);
        this.writeStorage('bueno_client_requests', []);
        localStorage.removeItem('bueno_terminal_information');
        this.writeStorage('bueno_containers', SEED_CONTAINERS);
        this.writeStorage('bueno_gate_logs', SEED_GATE_LOGS);

        localStorage.setItem('bueno_prod_purge_clean_v15', 'purged');
        this.notifyListeners();
      }
    } catch {}
  }

  // ── TRIPS API ─────────────────────────────────────────────────────────────
  getTrips(): any[] {
    this.seedInitialProductionState();
    return this.readStorage('bueno_trips', SEED_TRIPS);
  }

  saveTrips(trips: any[]): void {
    this.writeStorage('bueno_trips', trips);
    this.postRemote('/api/trips.php', trips);
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
    this.postRemote('/api/wagons.php', wagons);
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
    this.postRemote('/api/deals.php', deals);
  }

  dispatchDealTranche(dealId: string, user?: any): any {
    const deals = this.getDeals();
    const deal = deals.find((d: any) => d.id === dealId || d.dealNumber === dealId);
    if (!deal) throw new Error('Deal not found');

    const nextTrancheNum = (deal.dispatchedTripsCount || 0) + 1;
    const totalTrips = deal.totalPlannedTrips || 10;
    const trancheTonnage = deal.trancheTonnage || Math.round((deal.quantity || 9200) / totalTrips);
    const newTripId = `TRP-${Math.floor(1000 + Math.random() * 8999)}`;

    const origin = deal.loadingStation || 'PAPA';
    const destination = deal.destination || 'MONI';
    const gauge = deal.gauge || (['EWK', 'IDD', 'ILR', 'OSB', 'DGB'].includes(origin) ? 'NARROW_GAUGE' : 'STANDARD_GAUGE');

    const isOriginPAPA = origin === 'PAPA';
    const curLat = isOriginPAPA ? 6.8974 : (origin === 'APT' ? 6.4550 : 6.8974);
    const curLng = isOriginPAPA ? 3.2141 : (origin === 'APT' ? 3.3610 : 3.2141);

    const newTrip: any = {
      id: newTripId,
      tripId: newTripId,
      dealNumber: deal.dealNumber || deal.id,
      dealId: deal.id,
      trancheNumber: nextTrancheNum,
      totalPlannedTrips: totalTrips,
      trancheLabel: `Tranche ${nextTrancheNum} of ${totalTrips} (${deal.company || 'Consignee'})`,
      locomotiveId: nextTrancheNum % 2 === 0 ? 'L2208' : 'L2205',
      origin,
      destination,
      gauge,
      curLat,
      curLng,
      speed: 68,
      progressPercent: 5,
      company: deal.company || deal.companyName,
      cargoType: deal.cargoType || 'Huaxin Portland Cement (50kg)',
      unitOfMeasure: deal.unitOfMeasure || 'Metric Tonnes (MT)',
      wagonType: deal.wagonType || 'PXG/CGs Box Wagon',
      quantity: trancheTonnage,
      tonnage: `${trancheTonnage} MT`,
      cargoOfficerName: origin === 'PAPA' || origin === 'EWK' ? 'Ade Bello' : 'Ngozi Eze',
      unloadingOfficerName: 'Musa Ibrahim',
      leadDriverName: nextTrancheNum % 2 === 0 ? 'Engr. Yakubu Mohammed (NRC-DRV-09)' : 'Engr. Babatunde Adeleke (NRC-DRV-04)',
      trainCrew: 'Sunday Okafor (Assoc Engineer), Audu Danladi (Brakeman)',
      monitoringOfficer: 'Ade Bello (Bueno Operations Monitoring)',
      status: 'LOADING',
      dispatchTime: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: 'Today, ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      wagonLogs: OFFICIAL_PXG_CODES.slice(0, 23).map((wId, i) => ({
        wagonId: wId,
        loadedAt: 'Just Now',
        bagsCount: `${Math.round(trancheTonnage / 23 * 20)} Bags (40 MT)`,
        sealNumber: `SEAL-BN-${9100 + (nextTrancheNum * 23) + i}`,
        condition: 'LOADED_INTACT',
      })),
      damages: { damagedUnits: 0, burstBags: 0, complaintNotes: [] },
    };

    const trips = this.getTrips();
    this.saveTrips([newTrip, ...trips]);

    const updatedDeals = deals.map((d: any) => {
      if (d.id === deal.id || d.dealNumber === deal.dealNumber) {
        const newCount = nextTrancheNum;
        const newRemaining = Math.max(0, (d.quantity || 0) - (newCount * trancheTonnage));
        return {
          ...d,
          dispatchedTripsCount: newCount,
          remainingTonnage: newRemaining,
          status: newCount >= totalTrips ? 'ALL_TRANCHES_DISPATCHED' : 'ACTIVE',
        };
      }
      return d;
    });
    this.saveDeals(updatedDeals);

    this.notifyListeners();
    return newTrip;
  }

  getTodayLabel(): string {
    const formatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `Today (${formatted})`;
  }

  getYesterdayLabel(): string {
    const yesterday = new Date(Date.now() - 86400000);
    const formatted = yesterday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    return `Yesterday (${formatted})`;
  }

  getThisMonthLabel(): string {
    return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  getFormattedToday(): string {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getDateCategory(dateInput?: string | Date): 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'OLDER' {
    if (!dateInput) return 'TODAY';
    const str = String(dateInput).toLowerCase().trim();
    if (str.includes('today') || str.includes('just now')) return 'TODAY';
    if (str.includes('yesterday')) return 'YESTERDAY';

    let d: Date;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      d = new Date(dateInput);
    }

    if (isNaN(d.getTime())) {
      // Try to parse common UK formats like "DD/MM/YYYY" or "DD MMM YYYY"
      const ukMatch = str.match(/(\d{1,2})[\/\s-]([a-z]{3}|\d{1,2})[\/\s-](\d{4})/i);
      if (ukMatch) {
        d = new Date(dateInput);
      }
      if (isNaN(d.getTime())) return 'TODAY';
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (d >= startOfToday) return 'TODAY';
    if (d >= startOfYesterday) return 'YESTERDAY';
    if (d >= startOfWeek) return 'THIS_WEEK';
    if (d >= startOfMonth) return 'THIS_MONTH';
    return 'OLDER';
  }

  // ── NEGOTIATIONS API ──────────────────────────────────────────────────────
  getNegotiations(): any[] {
    return this.readStorage('bueno_custom_deal_negotiations', []);
  }

  saveNegotiations(negotiations: any[]): void {
    this.writeStorage('bueno_custom_deal_negotiations', negotiations);
    if (Array.isArray(negotiations)) {
      negotiations.forEach((n) => this.postRemote('/api/negotiations.php', n));
    }
  }

  // ── REQUISITIONS API ──────────────────────────────────────────────────────
  getRequests(): any[] {
    this.seedInitialProductionState();
    return this.readStorage('bueno_requests', SEED_REQUESTS);
  }

  saveRequests(requests: any[]): void {
    this.writeStorage('bueno_requests', requests);
    this.postRemote('/api/requests.php', requests);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bueno_state_updated'));
    }
  }

  createRequest(req: any): void {
    const current = this.getRequests();
    const updated = [req, ...current];
    this.saveRequests(updated);
  }

  // ── INVOICES (AR & REVENUE) API ───────────────────────────────────────────
  getInvoices(): any[] {
    this.seedInitialProductionState();
    return this.readStorage('bueno_invoices', SEED_INVOICES);
  }

  saveInvoices(invoices: any[]): void {
    this.writeStorage('bueno_invoices', invoices);
    if (Array.isArray(invoices)) {
      invoices.forEach((inv) => this.postRemote('/api/invoices.php', inv));
    }
  }

  createInvoice(invoice: any): void {
    const current = this.getInvoices();
    const updated = [invoice, ...current];
    this.saveInvoices(updated);
  }

  updateInvoice(invoiceId: string, updates: Partial<any>): void {
    const current = this.getInvoices();
    const updated = current.map((inv) => (inv.id === invoiceId || inv.invoiceNumber === invoiceId ? { ...inv, ...updates } : inv));
    this.saveInvoices(updated);
  }

  recordInvoicePayment(invoiceId: string, payment: { amount: number; type: string; ref: string; date: string }): void {
    const current = this.getInvoices();
    const updated = current.map((inv) => {
      if (inv.id === invoiceId || inv.invoiceNumber === invoiceId) {
        const history = Array.isArray(inv.paymentHistory) ? [...inv.paymentHistory] : [];
        history.push(payment);
        const newPaid = (Number(inv.amountPaid) || 0) + Number(payment.amount);
        const totalAmount = Number(inv.totalAmount) || 0;
        const newBalance = Math.max(0, totalAmount - newPaid);
        const newStatus = newBalance <= 0 ? 'SETTLED' : (newPaid > 0 ? 'PARTIALLY_PAID' : inv.status);
        return {
          ...inv,
          amountPaid: newPaid,
          balance: newBalance,
          status: newStatus,
          paymentRef: payment.ref || inv.paymentRef,
          paymentHistory: history,
        };
      }
      return inv;
    });
    this.saveInvoices(updated);
  }

  // ── TRIP DIRECT COSTS (COGS) API ──────────────────────────────────────────
  getTripCosts(tripId?: string): any[] {
    this.seedInitialProductionState();
    const all = this.readStorage('bueno_trip_costs', SEED_TRIP_COSTS);
    if (tripId) {
      return all.filter((c: any) => c.tripId === tripId);
    }
    return all;
  }

  saveTripCosts(costs: any[]): void {
    this.writeStorage('bueno_trip_costs', costs);
    if (Array.isArray(costs)) {
      costs.forEach((c) => this.postRemote('/api/trip_costs.php', c));
    }
  }

  createTripCost(cost: any): void {
    const current = this.getTripCosts();
    const updated = [cost, ...current];
    this.saveTripCosts(updated);
  }

  deleteTripCost(costId: string): void {
    const current = this.getTripCosts();
    const updated = current.filter((c: any) => c.id !== costId);
    this.writeStorage('bueno_trip_costs', updated);
    this.postRemote('/api/trip_costs.php', { action: 'delete', id: costId });
  }

  updateTripCost(costId: string, updates: Partial<any>): void {
    const current = this.getTripCosts();
    const updated = current.map((c: any) => (c.id === costId ? { ...c, ...updates } : c));
    this.saveTripCosts(updated);
  }

  // ── TRIP FINANCIAL SUMMARY HELPER ────────────────────────────────────────
  getTripFinancialSummary(trip: any) {
    const tripId = trip?.id || trip?.tripId;
    const invoices = this.getInvoices().filter((inv: any) => inv.tripId === tripId || (trip?.dealId && inv.dealId === trip.dealId));
    const primaryInvoice = invoices[0] || null;

    // Gross Revenue from invoice (or calculated from deal/tonnes)
    const grossFreight = Number(primaryInvoice?.subtotal || (Number(trip?.cargoTonnes || 0) * 160000) || 0);
    
    // Transit damages deductions (burst bags)
    const burstBags = Number(primaryInvoice?.damageUnits ?? trip?.damages?.burstBags ?? 0);
    const damageDeductions = Number(primaryInvoice?.damageDeduction ?? (burstBags * 8000));

    // Net Billed Revenue
    const netRevenue = Number(primaryInvoice?.totalAmount ?? (grossFreight - damageDeductions));
    const amountPaid = Number(primaryInvoice?.amountPaid ?? 0);
    const outstandingBalance = Number(primaryInvoice?.balance ?? (netRevenue - amountPaid));
    const paymentStatus = primaryInvoice?.status ?? (netRevenue > 0 ? (amountPaid >= netRevenue ? 'SETTLED' : (amountPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID')) : 'PENDING');

    // Direct Trip Costs from bueno_trip_costs
    const directCosts = this.getTripCosts(tripId);
    const totalDirectVouchers = directCosts.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);

    // Siding Fund Requisitions approved/disbursed for this trip
    const sidingRequests = this.getRequests().filter(
      (r: any) => (r.tripId === tripId || (r.reference && r.reference.includes(tripId))) && (r.status === 'APPROVED' || r.status === 'DISBURSED')
    );
    const totalSidingRequests = sidingRequests.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);

    // Total COGS / Direct Trip Costs
    const totalOperatingCost = totalDirectVouchers + totalSidingRequests;

    // Gross Profit Margin
    const grossProfit = netRevenue - totalOperatingCost;
    const marginPct = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0;

    return {
      tripId,
      primaryInvoice,
      grossFreight,
      burstBags,
      damageDeductions,
      netRevenue,
      amountPaid,
      outstandingBalance,
      paymentStatus,
      directCosts,
      totalDirectVouchers,
      sidingRequests,
      totalSidingRequests,
      totalOperatingCost,
      grossProfit,
      marginPct,
    };
  }

  // ── CONTAINERS API ────────────────────────────────────────────────────────
  getContainers(): any[] {
    return this.readStorage('bueno_containers', SEED_CONTAINERS);
  }

  saveContainers(containers: any[]): void {
    this.writeStorage('bueno_containers', containers);
  }

  getGateLogs(): any[] {
    return this.readStorage('bueno_gate_logs', SEED_GATE_LOGS);
  }

  saveGateLogs(logs: any[]): void {
    this.writeStorage('bueno_gate_logs', logs);
  }

  // ── USERS API ─────────────────────────────────────────────────────────────
  getUsers(): any[] {
    return this.readStorage('bueno_users', SEED_USERS);
  }

  saveUsers(users: any[]): void {
    this.writeStorage('bueno_users', users);
    this.postRemote('/api/users.php', users);
    usersApi.getAll().catch(() => {});
  }

  getSignatory(role: string, fallbackName: string = 'Executive Signatory'): string {
    const users = this.getUsers();
    const matched = users?.find(
      (u: any) =>
        (u.role === role || (role === 'CEO' && (u.role === 'MD' || u.role === 'CEO')) || (role === 'MD' && u.role === 'CEO')) &&
        (u.status === 'ACTIVE' || !u.status)
    );
    return matched?.fullName || fallbackName;
  }

  updateUser(userId: string, updatedFields: any): void {
    const current = this.getUsers();
    const updated = current.map((u) => (u.id === userId || u.email === userId ? { ...u, ...updatedFields } : u));
    this.saveUsers(updated);

    // If currently logged-in user or active session role was updated, synchronize session
    try {
      const activeUser = this.readStorage<any>('bueno_user', null);
      if (activeUser && (activeUser.id === userId || activeUser.email === userId || activeUser.role === updatedFields.role)) {
        const merged = { ...activeUser, ...updatedFields };
        this.writeStorage('bueno_user', merged);
      }
    } catch {}

    this.notifyListeners();
  }

  getStationWagonLedger(stationCode: string): any[] {
    const trips = this.getTrips();
    const rows: any[] = [];

    trips.forEach((trip) => {
      const isOrigin = trip.origin === stationCode;
      const isDest = trip.destination === stationCode;

      if (
        (isOrigin && trip.status !== 'COMPLETED' && trip.status !== 'DISCHARGED') ||
        (isDest && (trip.status === 'ARRIVED' || trip.status === 'UNLOADING' || trip.status === 'COMPLETED' || trip.status === 'DISCHARGED'))
      ) {
        (trip.wagonLogs || []).forEach((wLog: any, idx: number) => {
          rows.push({
            id: `TRM-${trip.id}-${wLog.wagonId || idx}`,
            wagonNo: wLog.wagonId || `WG-${idx + 1}`,
            condition:
              isDest && (trip.status === 'COMPLETED' || trip.status === 'DISCHARGED')
                ? 'DISCHARGED'
                : wLog.condition || 'LOADED_INTACT',
            remark: isDest
              ? `Discharged at ${stationCode} siding (${trip.cargoType})`
              : `Loaded & Sealed at ${stationCode} siding (Seal: ${wLog.sealNumber || 'VERIFIED'})`,
            dateLoaded: trip.dispatchTime || 'Today',
            trainNo: trip.id || trip.tripId,
            origin: trip.origin,
            destination: trip.destination,
            content: trip.cargoType || 'Freight Cargo',
            tonnage: wLog.bagsCount?.includes('MT') ? wLog.bagsCount : '40 MT',
            quantity: wLog.bagsCount || '800 Bags',
            waybillNo: `WB-BN-${trip.dealNumber || trip.id}-${String(idx + 1).padStart(3, '0')}`,
            daysAtStation: isDest ? 1 : 0,
            demurrage: 0,
            station: stationCode,
          });
        });
      }
    });

    return rows;
  }

  // ── LEGACY PERMISSIONS API (kept for backward compat) ─────────────────────
  getPermissions(): Record<string, string[]> {
    return this.getRolePermissions();
  }

  savePermissions(matrix: Record<string, string[]>): void {
    this.saveRolePermissions(matrix);
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
    this.postRemote('/api/client_requests.php', newReq);

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
    this.postRemote('/api/negotiations.php', initialThread);

    // 4. Dispatch System Notification Alert for Admin & Operations
    const existingNotifs = this.readStorage('bueno_notifications', []);
    const newNotif = {
      id: `notif_${Date.now()}`,
      title: 'New Industrial Client Freight Requisition Received',
      body: `${newReq.companyName} submitted a new freight request for ${newReq.product} [${newReq.volume}] via ${newReq.route}.`,
      time: newReq.createdAt,
      type: 'CLIENT_REQUISITION',
      targetId: initialThread.id,
      targetTab: 'negotiations',
      read: false,
    };
    this.writeStorage('bueno_notifications', [newNotif, ...existingNotifs]);
    this.postRemote('/api/notifications.php', newNotif);

    // 5. Sync Role Permissions with Database API
    (async () => {
      try {
        const permsRes = await fetch('/api/permissions.php').catch(() => null);
        if (permsRes && permsRes.ok) {
          const permsJson = await permsRes.json().catch(() => null);
          if (permsJson && permsJson.status === 'success' && permsJson.matrix && typeof permsJson.matrix === 'object') {
            const localPerms = this.getRolePermissions();
            if (JSON.stringify(permsJson.matrix) !== JSON.stringify(localPerms)) {
              this.writeStorage('bueno_role_permissions', permsJson.matrix);
              if (permsJson.settings) {
                this.writeStorage('bueno_system_settings', permsJson.settings);
              }
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('bueno_permissions_updated'));
              }
            }
          }
        }
      } catch {}
    })();

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

  seedPermissionsIfVersionMismatch(): void {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('bueno_role_permissions');
    if (!stored) {
      localStorage.setItem('bueno_role_permissions', JSON.stringify(
        JSON.parse(JSON.stringify(DEFAULT_ROLE_TAB_PERMISSIONS))
      ));
      localStorage.setItem('bueno_permissions_version', PERMISSIONS_SCHEMA_VERSION);
    }
    // Asynchronously fetch latest permissions from SQL API to ensure instant synchronization
    fetch('/api/permissions.php')
      .then((res) => res.json())
      .then((json) => {
        if (json && json.status === 'success' && json.matrix && typeof json.matrix === 'object') {
          const current = localStorage.getItem('bueno_role_permissions');
          if (JSON.stringify(json.matrix) !== current) {
            localStorage.setItem('bueno_role_permissions', JSON.stringify(json.matrix));
            window.dispatchEvent(new Event('bueno_permissions_updated'));
            window.dispatchEvent(new Event('bueno_state_updated'));
          }
        }
      })
      .catch(() => {});
  }

  getRolePermissions(): Record<string, string[]> {
    const stored = this.readStorage<Record<string, string[]> | null>('bueno_role_permissions', null);
    if (!stored || typeof stored !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_ROLE_TAB_PERMISSIONS));
    }
    const merged: Record<string, string[]> = {};
    Object.keys(DEFAULT_ROLE_TAB_PERMISSIONS).forEach((roleKey) => {
      merged[roleKey] = Array.isArray(stored[roleKey]) ? stored[roleKey] : [...DEFAULT_ROLE_TAB_PERMISSIONS[roleKey]];
    });
    return merged;
  }

  saveRolePermissions(matrix: Record<string, string[]>): void {
    this.writeStorage('bueno_role_permissions', matrix);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bueno_permissions_updated'));
      window.dispatchEvent(new Event('bueno_state_updated'));
      fetch('/api/permissions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix }),
      }).catch(() => {});
    }
  }

  async saveRolePermissionsAsync(matrix: Record<string, string[]>): Promise<boolean> {
    this.writeStorage('bueno_role_permissions', matrix);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bueno_permissions_updated'));
      window.dispatchEvent(new Event('bueno_state_updated'));
      try {
        const res = await fetch('/api/permissions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matrix }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
    return true;
  }

  canUserAccessTab(user: any, tabId: string): boolean {
    if (!user) return false;
    const role = user.role || 'GUEST';

    // Super-admins always have full access
    if (role === 'ADMIN' || role === 'CEO' || role === 'MD') return true;

    const matrix = this.getRolePermissions();
    const rolePerms = matrix[role];

    if (!Array.isArray(rolePerms)) return false;

    const capability = TAB_TO_CAPABILITY[tabId] || tabId;
    return rolePerms.includes(capability);
  }
}

export const PERMISSIONS_SCHEMA_VERSION = 'v5';

export const TAB_TO_CAPABILITY: Record<string, string> = {
  analytics:         'analytics',
  deals:             'deals',
  loading:           'deals',
  trips:             'deals',
  in_transit:        'deals',
  incoming_unload:   'deals',
  unloading:         'deals',
  dispatch:          'deals',
  negotiations:      'negotiations',
  fund_requisitions: 'fund_requisitions',
  funds:             'fund_requisitions',
  requisitions:      'fund_requisitions',
  fleet:             'fleet',
  wagons:            'fleet',
  telemetry:         'telemetry',
  manifest:          'manifest',
  history:           'manifest',
  terminal_info:     'manifest',
  moniya:            'moniya',
  billing:           'billing',
  users:             'users',
  permissions:       'permissions',
  account:           'negotiations',
};

export interface CanonicalCorridor {
  id: string;
  name: string;
  gauge: 'STANDARD_GAUGE' | 'NARROW_GAUGE';
  origin: string;
  destination: string;
  cargoType: string;
  wagonCode: string;
  description: string;
  isBuenoTerminalOrigin?: boolean;
  isBuenoTerminalDest?: boolean;
}

export const CANONICAL_CORRIDORS: CanonicalCorridor[] = [
  // 4 Current Operations on Standard Gauge (Lagos to Moniya, Ibadan)
  {
    id: 'SG_OP_1',
    name: 'Cement: Papalanto ➔ Moniya (Ibadan)',
    gauge: 'STANDARD_GAUGE',
    origin: 'PAPA',
    destination: 'MONI',
    cargoType: 'Huaxin Portland Cement (50kg)',
    wagonCode: 'PXG/CGs',
    description: 'Bueno Terminal Papalanto to Bueno Terminal Moniya (5 Hours via Standard Gauge)',
    isBuenoTerminalOrigin: true,
    isBuenoTerminalDest: true,
  },
  {
    id: 'SG_OP_2',
    name: 'Export Containers: Moniya ➔ APMT / ENL',
    gauge: 'STANDARD_GAUGE',
    origin: 'MONI',
    destination: 'APT',
    cargoType: 'CONTAINERS-EXPORT (40ft HC)',
    wagonCode: 'CBX',
    description: 'Bueno Terminal Moniya to Apapa Port / ENL Terminal (Standard Gauge)',
    isBuenoTerminalOrigin: true,
    isBuenoTerminalDest: true,
  },
  {
    id: 'SG_OP_3',
    name: 'Import / Empty Containers: APMT / ENL ➔ Moniya',
    gauge: 'STANDARD_GAUGE',
    origin: 'APT',
    destination: 'MONI',
    cargoType: 'CONTAINERS-IMPORT (40ft HC)',
    wagonCode: 'CBX',
    description: 'Apapa Port / ENL Terminal to Bueno Terminal Moniya (Standard Gauge)',
    isBuenoTerminalOrigin: true,
    isBuenoTerminalDest: true,
  },
  {
    id: 'SG_OP_4',
    name: 'Gypsum: ENL ➔ Papalanto',
    gauge: 'STANDARD_GAUGE',
    origin: 'ENL',
    destination: 'PAPA',
    cargoType: 'Bulk Gypsum',
    wagonCode: 'ZGX',
    description: 'ENL Terminal (APMT) to Bueno Terminal Papalanto (Standard Gauge)',
    isBuenoTerminalOrigin: true,
    isBuenoTerminalDest: true,
  },
  // 2 Current Operations on Narrow Gauge
  {
    id: 'NG_OP_1',
    name: 'Cement: Itori (Ewekoro) ➔ Ibadan (Dugbe), Oshogbo, Ilorin',
    gauge: 'NARROW_GAUGE',
    origin: 'EWK',
    destination: 'DGB',
    cargoType: 'Cement / Bagged Goods',
    wagonCode: 'PXG/CGs',
    description: 'Western District Cement Trains: Itori (Ewekoro) to Ibadan, Oshogbo and Ilorin (Narrow Gauge)',
  },
  {
    id: 'NG_OP_2',
    name: 'Import & Export Containers: Iddo ➔ APMT',
    gauge: 'NARROW_GAUGE',
    origin: 'IDD',
    destination: 'APT',
    cargoType: 'CONTAINERS-IMPORT / EXPORT',
    wagonCode: 'CBX',
    description: 'Lagos District Container Transfer between Iddo and APMT (Narrow Gauge)',
  },
];

export const TAB_ALIASES: Record<string, string[]> = {
  analytics:         ['analytics'],
  deals:             ['deals'],
  loading:           ['deals'],
  trips:             ['deals'],
  in_transit:        ['deals'],
  incoming_unload:   ['deals'],
  unloading:         ['deals'],
  dispatch:          ['deals'],
  negotiations:      ['negotiations'],
  fund_requisitions: ['fund_requisitions'],
  funds:             ['fund_requisitions'],
  requisitions:      ['fund_requisitions'],
  fleet:             ['fleet'],
  wagons:            ['fleet'],
  telemetry:         ['telemetry'],
  manifest:          ['manifest'],
  history:           ['manifest'],
  moniya:            ['moniya'],
  billing:           ['billing'],
  users:             ['users'],
  permissions:       ['permissions'],
  account:           ['account', 'negotiations', 'telemetry', 'manifest', 'billing'],
};

export interface TabRegistryEntry {
  key: string;
  label: string;
  category: string;
}

export const TAB_REGISTRY: TabRegistryEntry[] = [
  { key: 'analytics',         label: 'Reports & Analytics',       category: 'Executive' },
  { key: 'deals',             label: 'Commercial Deals Desk',     category: 'Operations' },
  { key: 'negotiations',      label: 'Client Negotiations Chat',  category: 'Commercial' },
  { key: 'fund_requisitions', label: 'Fund Requisitions',         category: 'Finance' },
  { key: 'fleet',             label: 'Fleet & Wagon Management',  category: 'Operations' },
  { key: 'telemetry',         label: 'Fleet Telemetry & Live GPS', category: 'Operations' },
  { key: 'manifest',          label: 'Cargo Manifests & Waybills', category: 'Operations' },
  { key: 'moniya',            label: 'Moniya Container Terminal', category: 'Operations' },
  { key: 'billing',           label: 'Invoices & Ledger',         category: 'Finance' },
  { key: 'users',             label: 'User Directory',            category: 'Administration' },
  { key: 'permissions',       label: 'Permissions Matrix',        category: 'Administration' },
];

export const DEFAULT_ROLE_TAB_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'moniya', 'billing', 'users', 'permissions',
  ],
  CEO: [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'moniya', 'billing', 'users', 'permissions',
  ],
  MD: [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'moniya', 'billing', 'users', 'permissions',
  ],
  HEAD_OF_OPERATIONS: [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet', 'telemetry', 'manifest', 'moniya',
  ],
  HEAD_OF_FINANCE: [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'billing',
  ],
  ACCOUNTANT: [
    'analytics', 'deals', 'negotiations', 'fund_requisitions', 'billing',
  ],
  CARGO_OFFICER: [
    'deals', 'fleet', 'telemetry', 'manifest', 'fund_requisitions', 'moniya',
  ],
  CUSTOMER: [
    'negotiations', 'telemetry', 'manifest', 'billing',
  ],
  CONSIGNEE: [
    'negotiations', 'telemetry', 'manifest', 'billing',
  ],
};

export const StateEngine = new StateEngineService();

