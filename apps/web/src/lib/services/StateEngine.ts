/**
 * BUENO FREIGHT OS — CENTRALIZED ENTERPRISE STATE ENGINE
 * Authoritative Data Repository & Real-time State Synchronization Layer
 */

import { bookingsApi, usersApi } from '@/lib/api';

// ─── INITIAL SEED DATA (FALLBACK CACHE) ───────────────────────────────────────
export const SEED_TRIPS: any[] = [];

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

export const SEED_WAGONS = OFFICIAL_PXG_CODES.map((id, index) => ({
  id,
  wagonType: 'PXG Covered Hopper Wagon',
  payloadCapacity: '60 MT (1,200 Bags)',
  capacity: 1200,
  status: 'AVAILABLE',
  currentStation: index < 23 ? 'EWK' : 'MNY',
  gauge: 'STANDARD_GAUGE',
  addedBy: 'System Registry',
  createdAt: '07 Aug 2026',
}));

export const SEED_DEALS = [
  { id: 'dl_1', dealNumber: 'DEAL-88210', company: 'Purechem Cement Industries Ltd', loadingStation: 'EWK', destination: 'MNY', cargoType: 'Bagged Cement (50kg)', quantity: 1610, status: 'ACTIVE', createdAt: '01 Sep 2026' },
  { id: 'dl_2', dealNumber: 'DEAL-99412', company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', loadingStation: 'APT', destination: 'MNY', cargoType: 'Huaxin Portland Cement (50kg)', quantity: 2300, status: 'ACTIVE', createdAt: '02 Sep 2026' },
];

export const SEED_REQUESTS: any[] = [];

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
  { id: 'usr_12', fullName: 'Purechem Logistics Team', companyName: 'Purechem Cement Industries Ltd', email: 'logistics@purechem.ng', phone: '08038889900', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
  { id: 'usr_13', fullName: 'BUA Logistics Desk', companyName: 'BUA Cement Industries', email: 'logistics@buacement.ng', phone: '08039990011', role: 'CUSTOMER', userType: 'CUSTOMER', pin: '1111', status: 'ACTIVE' },
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
      if (item && (item.includes('Lafarge') || item.includes('lafarge') || item.includes('Elephant') || item.includes('Dangote') || item.includes('dangote'))) {
        item = item
          .replace(/Lafarge Africa Plc/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
          .replace(/Lafarge Africa/gi, 'HBM (Huaxin Building Materials Nig Plc)')
          .replace(/Lafarge Logistics Desk/gi, 'Huaxin Logistics Desk')
          .replace(/Lafarge/gi, 'HBM')
          .replace(/logistics@lafarge\.ng/gi, 'logistics@hbm.ng')
          .replace(/Elephant Cement \(50kg bags\)/gi, 'Huaxin Portland Cement (50kg bags)')
          .replace(/Elephant Cement \(50kg Bags\)/gi, 'Huaxin Portland Cement (50kg Bags)')
          .replace(/Elephant Cement/gi, 'Huaxin Portland Cement')
          .replace(/Dangote Cement Industries/gi, 'Purechem Cement Industries Ltd')
          .replace(/Dangote Cement Industry/gi, 'Purechem Cement Industries Ltd')
          .replace(/Dangote Cement/gi, 'Purechem Cement Industries Ltd')
          .replace(/Dangote Freight Team/gi, 'Purechem Logistics Team')
          .replace(/freight@dangotecement\.ng/gi, 'logistics@purechem.ng')
          .replace(/Dangote Logistics Fleet/gi, 'Purechem Logistics Fleet')
          .replace(/Dangote Haulage/gi, 'Purechem Haulage')
          .replace(/Dangote/gi, 'Purechem');
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
      // 1. Sync Deals with Database API (Preserve TRIP_CREATED status & Two-Way Sync)
      const dealsRes = await fetch('/api/deals.php').catch(() => null);
      if (dealsRes && dealsRes.ok) {
        const dealsJson = await dealsRes.json().catch(() => null);
        if (dealsJson && dealsJson.status === 'success' && Array.isArray(dealsJson.data)) {
          const localDeals = this.getDeals();
          const dealMap = new Map<string, any>();
          dealsJson.data.forEach((d: any) => dealMap.set(d.id, d));
          let hasLocalDealsPush = false;
          localDeals.forEach((localD: any) => {
            const remoteD = dealMap.get(localD.id);
            if (!remoteD) {
              dealMap.set(localD.id, localD);
              hasLocalDealsPush = true;
            } else {
              if (localD.status === 'TRIP_CREATED' || localD.status === 'COMPLETED' || localD.tripId) {
                dealMap.set(localD.id, { ...remoteD, ...localD });
                if (remoteD.status !== localD.status) hasLocalDealsPush = true;
              } else {
                dealMap.set(localD.id, { ...localD, ...remoteD });
              }
            }
          });
          const mergedDeals = Array.from(dealMap.values());
          if (JSON.stringify(mergedDeals) !== JSON.stringify(localDeals)) {
            this.writeStorage('bueno_deals', mergedDeals);
          }
          if (hasLocalDealsPush || mergedDeals.length > dealsJson.data.length) {
            this.postRemote('/api/deals.php', mergedDeals);
          }
        }
      }

      // 2. Sync Trips with Database API (Deep consist & per-wagon reconciliation & Two-Way Push)
      const tripsRes = await fetch('/api/trips.php').catch(() => null);
      if (tripsRes && tripsRes.ok) {
        const tripsJson = await tripsRes.json().catch(() => null);
        if (tripsJson && tripsJson.status === 'success' && Array.isArray(tripsJson.data)) {
          const localTrips = this.getTrips();
          const tripMap = new Map<string, any>();
          tripsJson.data.forEach((t: any) => tripMap.set(t.id, t));

          const statusRank: Record<string, number> = {
            'PLANNED': 1,
            'SCHEDULED': 1,
            'LOADING': 2,
            'LOADED': 3,
            'READY_TO_DEPART': 3,
            'DISPATCHED': 4,
            'IN_TRANSIT': 4,
            'ARRIVED': 5,
            'UNLOADING': 5,
            'COMPLETED': 6,
          };

          let hasLocalNewTripsOrUpdates = false;

          localTrips.forEach((localT: any) => {
            const remoteT = tripMap.get(localT.id);
            if (!remoteT) {
              tripMap.set(localT.id, localT);
              hasLocalNewTripsOrUpdates = true;
            } else {
              // Reconcile status according to progression rank (never downgrade)
              const localRank = statusRank[localT.status] || 0;
              const remoteRank = statusRank[remoteT.status] || 0;
              const chosenStatus = remoteRank > localRank ? remoteT.status : (localT.status || remoteT.status);
              if (localRank > remoteRank) {
                hasLocalNewTripsOrUpdates = true;
              }

              // Per-wagon deep merge
              const localLogs: any[] = Array.isArray(localT.wagonLogs) ? localT.wagonLogs : [];
              const remoteLogs: any[] = Array.isArray(remoteT.wagonLogs) ? remoteT.wagonLogs : [];
              const wagonIdMap = new Map<string, any>();

              // Remote wagons first
              remoteLogs.forEach((w: any, idx: number) => {
                const wId = w.wagonId || w.id || `W_${idx}`;
                wagonIdMap.set(wId, { ...w });
              });

              // Merge local wagons with conflict resolution
              localLogs.forEach((w: any, idx: number) => {
                const wId = w.wagonId || w.id || `W_${idx}`;
                if (!wagonIdMap.has(wId)) {
                  wagonIdMap.set(wId, { ...w });
                  hasLocalNewTripsOrUpdates = true;
                } else {
                  const existingW = wagonIdMap.get(wId);
                  const isLocalUnloaded = w.unloadStatus === 'UNLOADED' || w.status === 'UNLOADED' || Number(w.burstBags || 0) > 0 || Number(w.damageQty || 0) > 0;
                  const isRemoteUnloaded = existingW.unloadStatus === 'UNLOADED' || existingW.status === 'UNLOADED' || Number(existingW.burstBags || 0) > 0 || Number(existingW.damageQty || 0) > 0;

                  if (isLocalUnloaded && !isRemoteUnloaded) {
                    hasLocalNewTripsOrUpdates = true;
                  }

                  const mergedWagon = {
                    ...existingW,
                    ...w,
                    status: (isRemoteUnloaded || isLocalUnloaded) ? 'UNLOADED' : (w.status === 'LOADED' || existingW.status === 'LOADED' ? 'LOADED' : (w.status || existingW.status)),
                    unloadStatus: (isRemoteUnloaded || isLocalUnloaded) ? 'UNLOADED' : (existingW.unloadStatus || w.unloadStatus),
                    burstBags: Math.max(Number(existingW.burstBags || 0), Number(w.burstBags || 0)),
                    damageQty: Math.max(Number(existingW.damageQty || 0), Number(w.damageQty || 0)),
                    correctQty: w.correctQty !== undefined ? w.correctQty : existingW.correctQty,
                    unloadedQty: w.unloadedQty !== undefined ? w.unloadedQty : existingW.unloadedQty,
                    complaintNotes: [existingW.complaintNotes, w.complaintNotes].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('; ') || null,
                  };
                  wagonIdMap.set(wId, mergedWagon);
                }
              });

              const mergedLogs = Array.from(wagonIdMap.values());

              // Reconcile overall damages
              const mergedDamages = {
                damagedUnits: Math.max(Number(localT.damages?.damagedUnits || 0), Number(remoteT.damages?.damagedUnits || 0)),
                burstBags: Math.max(Number(localT.damages?.burstBags || 0), Number(remoteT.damages?.burstBags || 0)),
                complaintNotes: Array.from(new Set([
                  ...(Array.isArray(localT.damages?.complaintNotes) ? localT.damages.complaintNotes : [localT.damages?.complaintNotes]),
                  ...(Array.isArray(remoteT.damages?.complaintNotes) ? remoteT.damages.complaintNotes : [remoteT.damages?.complaintNotes]),
                ].filter(Boolean))),
              };

              // Reconcile telemetry
              const chosenLat = (remoteT.speed > 0 || remoteT.curLat !== 6.8974) ? remoteT.curLat : (localT.curLat || remoteT.curLat);
              const chosenLng = (remoteT.speed > 0 || remoteT.curLng !== 3.2141) ? remoteT.curLng : (localT.curLng || remoteT.curLng);
              const chosenSpeed = Math.max(Number(remoteT.speed || 0), Number(localT.speed || 0));

              tripMap.set(localT.id, {
                ...remoteT,
                ...localT,
                status: chosenStatus,
                wagonLogs: mergedLogs,
                damages: mergedDamages,
                curLat: chosenLat,
                curLng: chosenLng,
                speed: chosenSpeed,
                departedAt: remoteT.departedAt || localT.departedAt,
                completedAt: remoteT.completedAt || localT.completedAt,
              });
            }
          });
          const mergedTrips = Array.from(tripMap.values());
          if (JSON.stringify(mergedTrips) !== JSON.stringify(localTrips)) {
            this.writeStorage('bueno_trips', mergedTrips);
          }

          // Two-Way Push: If local had trips or advances missing remotely, push back to SQL database immediately
          if (hasLocalNewTripsOrUpdates || mergedTrips.length > tripsJson.data.length) {
            this.postRemote('/api/trips.php', mergedTrips);
          }
        }
      }

      // 3. Sync Fund Requests with Database API
      const reqsRes = await fetch('/api/requests.php').catch(() => null);
      if (reqsRes && reqsRes.ok) {
        const reqsJson = await reqsRes.json().catch(() => null);
        if (reqsJson && reqsJson.status === 'success' && Array.isArray(reqsJson.data) && reqsJson.data.length > 0) {
          const localReqs = this.getRequests();
          const reqMap = new Map<string, any>();
          reqsJson.data.forEach((r: any) => reqMap.set(r.id, r));
          localReqs.forEach((r: any) => { if (!reqMap.has(r.id)) reqMap.set(r.id, r); });
          const mergedReqs = Array.from(reqMap.values());
          if (JSON.stringify(mergedReqs) !== JSON.stringify(localReqs)) {
            this.writeStorage('bueno_requests', mergedReqs);
          }
        }
      }

      // 4. Sync Wagons Fleet with Database API (Strict 46 Official Wagons)
      const wagonsRes = await fetch('/api/wagons.php').catch(() => null);
      if (wagonsRes && wagonsRes.ok) {
        const wagonsJson = await wagonsRes.json().catch(() => null);
        if (wagonsJson && wagonsJson.status === 'success' && Array.isArray(wagonsJson.data) && wagonsJson.data.length > 0) {
          const validRemoteWagons = wagonsJson.data.filter((w: any) => !w.id?.startsWith('PXG 00') && !w.id?.startsWith('WG') && !w.id?.startsWith('CBX'));
          if (validRemoteWagons.length === 46) {
            this.writeStorage('bueno_wagons', validRemoteWagons);
          } else {
            const localWagons = this.getWagons().filter((w: any) => !w.id?.startsWith('PXG 00') && !w.id?.startsWith('WG') && !w.id?.startsWith('CBX'));
            const wagonMap = new Map<string, any>();
            validRemoteWagons.forEach((w: any) => wagonMap.set(w.id, w));
            localWagons.forEach((w: any) => { if (!wagonMap.has(w.id)) wagonMap.set(w.id, w); });
            const mergedWagons = Array.from(wagonMap.values());
            this.writeStorage('bueno_wagons', mergedWagons.length === 46 ? mergedWagons : SEED_WAGONS);
          }
        }
      }

      // 5. Sync Role Permissions Matrix with Database API
      const permsRes = await fetch('/api/permissions.php').catch(() => null);
      if (permsRes && permsRes.ok) {
        const permsJson = await permsRes.json().catch(() => null);
        if (permsJson && permsJson.status === 'success' && permsJson.matrix && typeof permsJson.matrix === 'object' && Object.keys(permsJson.matrix).length > 0) {
          const localPerms = this.getRolePermissions();
          if (JSON.stringify(permsJson.matrix) !== JSON.stringify(localPerms)) {
            this.writeStorage('bueno_role_permissions', permsJson.matrix);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('bueno_permissions_updated'));
            }
          }
        }
      }

      // 6. Sync Notifications with Database API
      const notifsRes = await fetch('/api/notifications.php').catch(() => null);
      if (notifsRes && notifsRes.ok) {
        const notifsJson = await notifsRes.json().catch(() => null);
        if (notifsJson && notifsJson.status === 'success' && Array.isArray(notifsJson.data)) {
          const localNotifs = this.readStorage('bueno_notifications', []);
          const notifMap = new Map<string, any>();
          notifsJson.data.forEach((n: any) => notifMap.set(n.id, n));
          localNotifs.forEach((n: any) => { if (!notifMap.has(n.id)) notifMap.set(n.id, n); });
          const mergedNotifs = Array.from(notifMap.values());
          if (JSON.stringify(mergedNotifs) !== JSON.stringify(localNotifs)) {
            this.writeStorage('bueno_notifications', mergedNotifs);
          }
        }
      }

      // 7. Sync Negotiations Chat with Database API
      const negsRes = await fetch('/api/negotiations.php').catch(() => null);
      if (negsRes && negsRes.ok) {
        const negsJson = await negsRes.json().catch(() => null);
        if (negsJson && negsJson.status === 'success' && Array.isArray(negsJson.data)) {
          const localNegs = this.getNegotiations();
          const negMap = new Map<string, any>();
          negsJson.data.forEach((n: any) => negMap.set(n.id, n));
          localNegs.forEach((localN: any) => {
            const remoteN = negMap.get(localN.id);
            if (!remoteN) {
              negMap.set(localN.id, localN);
            } else {
              const localMsgs = Array.isArray(localN.messages) ? localN.messages : [];
              const remoteMsgs = Array.isArray(remoteN.messages) ? remoteN.messages : [];
              const msgMap = new Map<string, any>();
              [...remoteMsgs, ...localMsgs].forEach((m: any) => {
                const key = `${m.sender}_${m.time}_${m.text?.substring(0, 30)}`;
                msgMap.set(key, m);
              });
              negMap.set(localN.id, {
                ...remoteN,
                ...localN,
                status: (localN.status === 'APPROVED_DISPATCHED' || remoteN.status === 'APPROVED_DISPATCHED') ? 'APPROVED_DISPATCHED' : (remoteN.status || localN.status),
                messages: Array.from(msgMap.values()),
              });
            }
          });
          const mergedNegs = Array.from(negMap.values());
          if (JSON.stringify(mergedNegs) !== JSON.stringify(localNegs)) {
            this.writeStorage('bueno_custom_deal_negotiations', mergedNegs);
          }
        }
      }

      // 8. Sync Users with Database API
      const usersRes = await fetch('/api/users.php').catch(() => null);
      if (usersRes && usersRes.ok) {
        const usersJson = await usersRes.json().catch(() => null);
        if (usersJson && usersJson.status === 'success' && Array.isArray(usersJson.data) && usersJson.data.length > 0) {
          const localUsers = this.getUsers();
          const userMap = new Map<string, any>();
          usersJson.data.forEach((u: any) => userMap.set(u.id, u));
          localUsers.forEach((u: any) => { if (!userMap.has(u.id)) userMap.set(u.id, u); });
          const mergedUsers = Array.from(userMap.values());
          if (JSON.stringify(mergedUsers) !== JSON.stringify(localUsers)) {
            this.writeStorage('bueno_users', mergedUsers);
          }
        }
      }

      // 9. Sync Invoices with Database API
      const invsRes = await fetch('/api/invoices.php').catch(() => null);
      if (invsRes && invsRes.ok) {
        const invsJson = await invsRes.json().catch(() => null);
        if (invsJson && invsJson.status === 'success' && Array.isArray(invsJson.data) && invsJson.data.length > 0) {
          const localInvs = this.getInvoices();
          const invMap = new Map<string, any>();
          invsJson.data.forEach((inv: any) => invMap.set(inv.id, inv));
          localInvs.forEach((inv: any) => { if (!invMap.has(inv.id)) invMap.set(inv.id, inv); });
          const mergedInvs = Array.from(invMap.values());
          if (JSON.stringify(mergedInvs) !== JSON.stringify(localInvs)) {
            this.writeStorage('bueno_invoices', mergedInvs);
          }
        }
      }

      // 10. Sync Trip Direct Costs with Database API
      const costsRes = await fetch('/api/trip_costs.php').catch(() => null);
      if (costsRes && costsRes.ok) {
        const costsJson = await costsRes.json().catch(() => null);
        if (costsJson && costsJson.status === 'success' && Array.isArray(costsJson.data) && costsJson.data.length > 0) {
          const localCosts = this.getTripCosts();
          const costMap = new Map<string, any>();
          costsJson.data.forEach((c: any) => costMap.set(c.id, c));
          localCosts.forEach((c: any) => { if (!costMap.has(c.id)) costMap.set(c.id, c); });
          const mergedCosts = Array.from(costMap.values());
          if (JSON.stringify(mergedCosts) !== JSON.stringify(localCosts)) {
            this.writeStorage('bueno_trip_costs', mergedCosts);
          }
        }
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
        if (val && (val.includes('Lafarge') || val.includes('lafarge') || val.includes('Elephant') || val.includes('Dangote') || val.includes('dangote'))) {
          const sanitized = val
            .replace(/Lafarge Africa Plc/gi, 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)')
            .replace(/Lafarge Africa/gi, 'HBM (Huaxin Building Materials Nig Plc)')
            .replace(/Lafarge Logistics Desk/gi, 'Huaxin Logistics Desk')
            .replace(/Lafarge/gi, 'HBM')
            .replace(/logistics@lafarge\.ng/gi, 'logistics@hbm.ng')
            .replace(/Elephant Cement \(50kg bags\)/gi, 'Huaxin Portland Cement (50kg bags)')
            .replace(/Elephant Cement \(50kg Bags\)/gi, 'Huaxin Portland Cement (50kg Bags)')
            .replace(/Elephant Cement/gi, 'Huaxin Portland Cement')
            .replace(/Dangote Cement Industries/gi, 'Purechem Cement Industries Ltd')
            .replace(/Dangote Cement Industry/gi, 'Purechem Cement Industries Ltd')
            .replace(/Dangote Cement/gi, 'Purechem Cement Industries Ltd')
            .replace(/Dangote Freight Team/gi, 'Purechem Logistics Team')
            .replace(/freight@dangotecement\.ng/gi, 'logistics@purechem.ng')
            .replace(/Dangote Logistics Fleet/gi, 'Purechem Logistics Fleet')
            .replace(/Dangote Haulage/gi, 'Purechem Haulage')
            .replace(/Dangote/gi, 'Purechem');
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
    if (typeof window === 'undefined') return;
    try {
      this.writeStorage('bueno_trips', []);
      this.writeStorage('bueno_trip_costs', []);
      this.writeStorage('bueno_invoices', []);
      this.writeStorage('bueno_requests', []);
      this.cleanseLafargeAndMigrateHbm();
      this.writeStorage('bueno_deals', SEED_DEALS);
      this.writeStorage('bueno_users', SEED_USERS);
      localStorage.setItem('bueno_prod_purge_v4', 'purged');
      localStorage.setItem('bueno_prod_purge_v5', 'purged');
      this.postRemote('/api/trips.php', []);
      this.postRemote('/api/trip_costs.php', []);
      this.postRemote('/api/invoices.php', []);
      this.postRemote('/api/requests.php', []);
      this.postRemote('/api/deals.php', SEED_DEALS);
      this.postRemote('/api/users.php', SEED_USERS);
      this.notifyListeners();
    } catch {}
  }

  seedInitialProductionState(): void {
    if (typeof window === 'undefined') return;
    try {
      // Always cleanse any stray Lafarge/Elephant entries in browser storage
      this.cleanseLafargeAndMigrateHbm();

      // Cleanse and deduplicate wagons fleet to strictly 46 official dedicated hoppers
      const storedWagons = this.readStorage<any[]>('bueno_wagons', SEED_WAGONS);
      if (!Array.isArray(storedWagons) || storedWagons.length !== 46 || storedWagons.some((w: any) => w.id?.startsWith('PXG 00') || w.id?.startsWith('WG') || w.id?.startsWith('CBX'))) {
        this.writeStorage('bueno_wagons', SEED_WAGONS);
        this.postRemote('/api/wagons.php', SEED_WAGONS);
      }

      const isPurged = localStorage.getItem('bueno_prod_purge_v6');
      if (isPurged !== 'purged') {
        // Strip out legacy demo data
        const currentTrips = this.readStorage<any[]>('bueno_trips', []);
        const cleanTrips = currentTrips.filter((t: any) => t.id !== 'TRP-101' && t.id !== 'TRP-102' && t.tripId !== 'TRP-101' && t.tripId !== 'TRP-102');
        this.writeStorage('bueno_trips', cleanTrips);

        const currentCosts = this.readStorage<any[]>('bueno_trip_costs', []);
        const cleanCosts = currentCosts.filter((c: any) => c.tripId !== 'TRP-101' && c.tripId !== 'TRP-102' && !c.id?.startsWith('CST-101') && !c.id?.startsWith('CST-102'));
        this.writeStorage('bueno_trip_costs', cleanCosts);

        const currentInvs = this.readStorage<any[]>('bueno_invoices', []);
        const cleanInvs = currentInvs.filter((inv: any) => inv.tripId !== 'TRP-101' && inv.tripId !== 'TRP-102' && inv.id !== 'INV-TRP-101' && inv.id !== 'INV-TRP-102');
        this.writeStorage('bueno_invoices', cleanInvs);

        const currentReqs = this.readStorage<any[]>('bueno_requests', []);
        const cleanReqs = currentReqs.filter((r: any) => r.tripId !== 'TRP-101' && r.tripId !== 'TRP-102' && r.id !== 'REQ-901' && r.id !== 'REQ-902');
        this.writeStorage('bueno_requests', cleanReqs);

        // Ensure deals and users reflect canonical HBM
        const currentDeals = this.readStorage<any[]>('bueno_deals', SEED_DEALS);
        const cleanDeals = currentDeals.map((d: any) => {
          if (d.tripId === 'TRP-101' || d.tripId === 'TRP-102') {
            return { ...d, status: 'ACTIVE', tripId: undefined };
          }
          if (d.company && (d.company.includes('Lafarge') || d.company.includes('lafarge'))) {
            return { ...d, company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', cargoType: 'Huaxin Portland Cement (50kg)' };
          }
          return d;
        });
        this.writeStorage('bueno_deals', cleanDeals);

        const currentUsers = this.readStorage<any[]>('bueno_users', SEED_USERS);
        const cleanUsers = currentUsers.map((u: any) => {
          if (u.companyName && (u.companyName.includes('Lafarge') || u.companyName.includes('lafarge'))) {
            return { ...u, companyName: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)', fullName: 'Huaxin Logistics Desk', email: 'logistics@hbm.ng' };
          }
          return u;
        });
        this.writeStorage('bueno_users', cleanUsers);

        localStorage.setItem('bueno_prod_purge_v4', 'purged');
        localStorage.setItem('bueno_prod_purge_v5', 'purged');
        localStorage.setItem('bueno_prod_purge_v6', 'purged');
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

  // ── USERS API ─────────────────────────────────────────────────────────────
  getUsers(): any[] {
    return this.readStorage('bueno_users', SEED_USERS);
  }

  saveUsers(users: any[]): void {
    this.writeStorage('bueno_users', users);
    this.postRemote('/api/users.php', users);
    usersApi.getAll().catch(() => {});
  }

  updateUser(userId: string, updatedFields: any): void {
    const current = this.getUsers();
    const updated = current.map((u) => (u.id === userId || u.email === userId ? { ...u, ...updatedFields } : u));
    this.saveUsers(updated);
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
  moniya:            'moniya',
  billing:           'billing',
  users:             'users',
  permissions:       'permissions',
  account:           'negotiations',
};

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
    'analytics', 'fund_requisitions', 'billing',
  ],
  ACCOUNTANT: [
    'analytics', 'fund_requisitions', 'billing',
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

