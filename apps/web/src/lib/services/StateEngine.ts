/**
 * BUENO FREIGHT OS — STATE ENGINE
 *
 * Application data layer. The public surface is unchanged so the portals keep
 * working, but what sits underneath is different in one important way: the
 * server is now the source of truth.
 *
 * Previously localStorage *was* the database. Reads returned whatever the
 * browser happened to hold, writes pushed whole collections at the server
 * fire-and-forget, permissions were computed from a client-side matrix a user
 * could simply edit, and every open tab re-fetched all seven collections every
 * five seconds.
 *
 * Now: reads come from server-synced caches, writes are per-record with
 * conflict detection, and capability checks ask the session — the same
 * authority the API enforces — so the UI cannot claim a permission the server
 * will refuse.
 *
 * localStorage survives only as an offline read-through, so a dropped
 * connection shows the last known data instead of a blank screen.
 */

import { CollectionStore, notifyStateChanged, type Row } from '@/lib/services/dataStore';
import { api, ApiError } from '@/lib/apiClient';
import * as session from '@/lib/auth/session';
import { resolveTabCapability, normalizeMatrix } from '@/lib/rbac/capabilities';

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

/**
 * Demonstration containers and gate movements, previously shipped as the
 * fallback for the Moniya yard view.
 *
 * They carried named drivers with phone numbers and shipping-line container
 * numbers that read as real operational records. A yard view that invents four
 * containers and two gate movements when the API returns nothing is worse than
 * one that shows an empty yard: demurrage is billed off this screen.
 *
 * There is no containers or gate-log endpoint yet, so these remain
 * browser-local until one exists — but they start empty rather than
 * pre-populated with fiction.
 */
export const SEED_CONTAINERS: any[] = [];

export const SEED_GATE_LOGS: any[] = [];

/**
 * There is deliberately no seed user list.
 *
 * This constant previously held sixteen accounts, each with its plaintext PIN —
 * ceo@bueno.ng / 9999, admin@bueno.ng / 7777, and every consignee on 1111. It
 * was a module-level export in a client component, so it was compiled into the
 * public JavaScript bundle and served to anyone who opened the site. It handed
 * out a directory of valid sign-in addresses and the credential originally
 * issued to each one.
 *
 * It was also used as the fallback whenever the API returned no users, which
 * meant a permissions failure or a dropped connection made the administrator
 * portal render sixteen people who do not exist.
 *
 * Accounts come from the server or the list is empty. An empty list is a true
 * statement about what the client knows; a fabricated one is not.
 */
export const SEED_USERS: any[] = [];

export const SEED_INVOICES: any[] = [];

export const SEED_TRIP_COSTS: any[] = [];

// ─── ENTERPRISE ACCOUNTING INTERFACES & SEED DATA ────────────────────────────
export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  subType: string;
  balance: number;
  description: string;
  isEnabled: boolean;
}

export interface JournalEntryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  journalNo: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalEntryLine[];
  totalAmount: number;
  status: 'POSTED';
  postedBy: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  ledgerBalance?: number;
  statementBalance?: number;
  glAccountCode?: string;
  lastReconciled: string;
  status: 'RECONCILED' | 'PENDING_REVIEW';
}

export const SEED_CHART_OF_ACCOUNTS: ChartAccount[] = [
  { id: 'acc_1010', code: '1010', name: 'Zenith Bank Operating Account (#1014889201)', type: 'ASSET', subType: 'Cash & Cash Equivalents', balance: 48250000, description: 'Primary corporate revenue collection and clearing account', isEnabled: true },
  { id: 'acc_1020', code: '1020', name: 'Access Bank Rail Escort & NRC Escrow (#0049921102)', type: 'ASSET', subType: 'Cash & Cash Equivalents', balance: 18400000, description: 'Track toll reserve and security escort operations escrow', isEnabled: true },
  { id: 'acc_1030', code: '1030', name: 'Siding Petty Cash Vault (Ewekoro & Moniya)', type: 'ASSET', subType: 'Cash & Cash Equivalents', balance: 1250000, description: 'Station-level cash imprest for immediate siding contingencies', isEnabled: true },
  { id: 'acc_1110', code: '1110', name: 'Trade Debtors (Consignee Receivables)', type: 'ASSET', subType: 'Accounts Receivable', balance: 73600000, description: 'Outstanding freight billings due from HBM, APMT, Maersk, and BAT', isEnabled: true },
  { id: 'acc_1210', code: '1210', name: 'Bulk AGO Diesel Reserves (Ewekoro Depot)', type: 'ASSET', subType: 'Inventory', balance: 12800000, description: 'Locomotive fuel held in storage tanks at Ewekoro siding', isEnabled: true },
  { id: 'acc_1510', code: '1510', name: 'Rolling Stock — 46 PXG Covered Hopper Wagons', type: 'ASSET', subType: 'Property, Plant & Equipment', balance: 1380000000, description: 'Dedicated fleet of 46 covered hopper standard-gauge wagons', isEnabled: true },
  { id: 'acc_1520', code: '1520', name: 'Siding Heavy Machinery & Tractors', type: 'ASSET', subType: 'Property, Plant & Equipment', balance: 45000000, description: 'Cross-docking loaders, forklifts, and shunting tractors', isEnabled: true },
  { id: 'acc_1590', code: '1590', name: 'Accumulated Depreciation — Rolling Stock', type: 'ASSET', subType: 'Contra-Asset', balance: -46000000, description: 'Cumulative asset depreciation charged to date', isEnabled: true },

  { id: 'acc_2010', code: '2010', name: 'Trade Creditors (Diesel & Vendor Payables)', type: 'LIABILITY', subType: 'Current Liabilities', balance: 16200000, description: 'Invoices payable to fuel suppliers and maintenance contractors', isEnabled: true },
  { id: 'acc_2020', code: '2020', name: 'NRC Track Access Surcharge Payable', type: 'LIABILITY', subType: 'Current Liabilities', balance: 22500000, description: 'Nigerian Railway Corporation statutory corridor track tolls', isEnabled: true },
  { id: 'acc_2030', code: '2030', name: 'Accrued Operating Expenses & Crew Allowances', type: 'LIABILITY', subType: 'Current Liabilities', balance: 4800000, description: 'Unsettled shift allowances and stevedoring charges', isEnabled: true },
  { id: 'acc_2040', code: '2040', name: 'Consignee Advance Deposits & Retainers', type: 'LIABILITY', subType: 'Current Liabilities', balance: 35000000, description: 'Prepaid freight funds held prior to dispatch release', isEnabled: true },
  { id: 'acc_2120', code: '2120', name: 'Unidentified Receipts Suspense Account', type: 'LIABILITY', subType: 'Suspense', balance: 0, description: 'Unallocated bank wire receipts pending customer attribution', isEnabled: true },

  { id: 'acc_3010', code: '3010', name: 'Ordinary Share Capital', type: 'EQUITY', subType: 'Contributed Capital', balance: 1200000000, description: 'Issued and fully paid corporate equity capital', isEnabled: true },
  { id: 'acc_3020', code: '3020', name: 'Retained Earnings & Reserves', type: 'EQUITY', subType: 'Retained Earnings', balance: 206700000, description: 'Accumulated net surplus from railway operations', isEnabled: true },

  { id: 'acc_4010', code: '4010', name: 'Bulk Freight Revenue — Cement (HBM Siding)', type: 'REVENUE', subType: 'Operating Revenue', balance: 82800000, description: 'Freight haulage tariffs for Huaxin Portland Cement (50kg)', isEnabled: true },
  { id: 'acc_4020', code: '4020', name: 'Bulk Freight Revenue — Containerized Cargo (APMT)', type: 'REVENUE', subType: 'Operating Revenue', balance: 24000000, description: 'Intermodal import/export container movement on rail', isEnabled: true },
  { id: 'acc_4030', code: '4030', name: 'Siding Loading & Cross-Docking Handling Income', type: 'REVENUE', subType: 'Operating Revenue', balance: 4600000, description: 'Terminal siding cargo handling and bag conveyance fees', isEnabled: true },
  { id: 'acc_4040', code: '4040', name: 'Demurrage & Wagon Detention Penalties', type: 'REVENUE', subType: 'Other Operating Income', balance: 2200000, description: 'Hourly demurrage billed for unloading delays exceeding free time', isEnabled: true },

  { id: 'acc_5010', code: '5010', name: 'NRC Track Access & Corridor Tolls', type: 'EXPENSE', subType: 'Cost of Goods Sold', balance: 28400000, description: 'Direct mileage and axle-load access tariffs paid to NRC', isEnabled: true },
  { id: 'acc_5020', code: '5020', name: 'Locomotive Diesel Fuel (AGO) Consumption', type: 'EXPENSE', subType: 'Cost of Goods Sold', balance: 19600000, description: 'AGO diesel fuel burned per voyage run between EWK and MNY', isEnabled: true },
  { id: 'acc_5030', code: '5030', name: 'Mainline Locomotive Power Unit Hire', type: 'EXPENSE', subType: 'Cost of Goods Sold', balance: 11500000, description: 'Locomotive charter and wet-lease per train trip', isEnabled: true },
  { id: 'acc_5040', code: '5040', name: 'Siding Loading & Stevedoring Wages', type: 'EXPENSE', subType: 'Cost of Goods Sold', balance: 3800000, description: 'Labor rates paid for loading 1,200 bags per covered hopper', isEnabled: true },
  { id: 'acc_5050', code: '5050', name: 'Armed Security Rail Escort Operations', type: 'EXPENSE', subType: 'Cost of Goods Sold', balance: 2900000, description: 'Corridor armed patrol and onboard escort officer allowances', isEnabled: true },

  { id: 'acc_6010', code: '6010', name: 'Terminal Management & Staff Salaries', type: 'EXPENSE', subType: 'Operating Expenses (SG&A)', balance: 6800000, description: 'Salaries for station officers, dispatchers, and finance staff', isEnabled: true },
  { id: 'acc_6020', code: '6020', name: 'Corridor Telemetry, GPS & Cloud Infrastructure', type: 'EXPENSE', subType: 'Operating Expenses (SG&A)', balance: 1400000, description: 'Satellite GPS telemetry tracking and software hosting', isEnabled: true },
  { id: 'acc_6030', code: '6030', name: 'Yard Utilities, Siding Maintenance & Safety', type: 'EXPENSE', subType: 'Operating Expenses (SG&A)', balance: 2100000, description: 'Lighting, security fencing, track clearance, and depot safety', isEnabled: true },
  { id: 'acc_6040', code: '6040', name: 'Corporate Legal, Audit & Regulatory Compliance', type: 'EXPENSE', subType: 'Operating Expenses (SG&A)', balance: 1850000, description: 'Statutory filing, external financial audit, and insurance', isEnabled: true },
];

export const SEED_JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'jrn_001',
    journalNo: 'JRN-2026-001',
    date: '01/09/2026',
    reference: 'EQUITY-CAP-01',
    description: 'Initial equity capitalization and purchase of 46 PXG Hopper Wagons fleet',
    totalAmount: 1380000000,
    status: 'POSTED',
    postedBy: 'Folake Adeyemi (Finance Controller)',
    createdAt: '01 Sep 2026',
    lines: [
      { accountId: 'acc_1510', accountCode: '1510', accountName: 'Rolling Stock — 46 PXG Covered Hopper Wagons', description: 'Acquisition of 46 standard-gauge hoppers', debit: 1380000000, credit: 0 },
      { accountId: 'acc_3010', accountCode: '3010', accountName: 'Ordinary Share Capital', description: 'Equity allotment', debit: 0, credit: 1200000000 },
      { accountId: 'acc_3020', accountCode: '3020', accountName: 'Retained Earnings & Reserves', description: 'Capital reserve contribution', debit: 0, credit: 180000000 },
    ]
  },
  {
    id: 'jrn_002',
    journalNo: 'JRN-2026-002',
    date: '06/09/2026',
    reference: 'HBM-INV-001',
    description: 'Accrual of freight tariff revenue on HBM Monthly Consignment Tranche 1 (920 MT)',
    totalAmount: 9200000,
    status: 'POSTED',
    postedBy: 'Chinenye Nnamdi (Head of Finance)',
    createdAt: '06 Sep 2026',
    lines: [
      { accountId: 'acc_1110', accountCode: '1110', accountName: 'Trade Debtors (Consignee Receivables)', description: 'Invoice HBM-INV-001 billed to Huaxin Cement', debit: 9200000, credit: 0 },
      { accountId: 'acc_4010', accountCode: '4010', accountName: 'Bulk Freight Revenue — Cement (HBM Siding)', description: '10,000 NGN/MT contract tariff recognized', debit: 0, credit: 9200000 },
    ]
  },
  {
    id: 'jrn_003',
    journalNo: 'JRN-2026-003',
    date: '08/09/2026',
    reference: 'VOYAGE-EXP-884',
    description: 'Settlement of NRC track access toll and bulk AGO locomotive fuel via Zenith Bank',
    totalAmount: 5300000,
    status: 'POSTED',
    postedBy: 'Chinenye Nnamdi (Head of Finance)',
    createdAt: '08 Sep 2026',
    lines: [
      { accountId: 'acc_5010', accountCode: '5010', accountName: 'NRC Track Access & Corridor Tolls', description: 'Statutory track access fees paid to NRC', debit: 3100000, credit: 0 },
      { accountId: 'acc_5020', accountCode: '5020', accountName: 'Locomotive Diesel Fuel (AGO) Consumption', description: 'AGO diesel bunkering for trip', debit: 2200000, credit: 0 },
      { accountId: 'acc_1010', accountCode: '1010', accountName: 'Zenith Bank Operating Account (#1014889201)', description: 'Bank electronic disbursement', debit: 0, credit: 5300000 },
    ]
  },
  {
    id: 'jrn_004',
    journalNo: 'JRN-2026-004',
    date: '11/09/2026',
    reference: 'WIRE-RCV-HBM-94',
    description: 'Wire settlement received from Huaxin Building Materials Nig Plc for Tranches 1 & 2',
    totalAmount: 25000000,
    status: 'POSTED',
    postedBy: 'Chinenye Nnamdi (Head of Finance)',
    createdAt: '11 Sep 2026',
    lines: [
      { accountId: 'acc_1010', accountCode: '1010', accountName: 'Zenith Bank Operating Account (#1014889201)', description: 'Direct NIBSS wire settlement credited', debit: 25000000, credit: 0 },
      { accountId: 'acc_1110', accountCode: '1110', accountName: 'Trade Debtors (Consignee Receivables)', description: 'Clearance of outstanding consignee invoice', debit: 0, credit: 25000000 },
    ]
  },
];

export const SEED_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bnk_01',
    bankName: 'Zenith Bank Plc',
    accountName: 'Bueno Logistics Limited — Freight Operations',
    accountNumber: '1014889201',
    accountType: 'Corporate Current',
    currency: 'NGN (₦)',
    currentBalance: 48250000,
    ledgerBalance: 48250000,
    statementBalance: 48250000,
    glAccountCode: '1010',
    lastReconciled: '12 Sep 2026',
    status: 'RECONCILED',
  },
  {
    id: 'bnk_02',
    bankName: 'Access Bank Plc',
    accountName: 'Bueno Logistics Limited — NRC & Escort Escrow',
    accountNumber: '0049921102',
    accountType: 'Treasury Escrow',
    currency: 'NGN (₦)',
    currentBalance: 18400000,
    ledgerBalance: 18400000,
    statementBalance: 18400000,
    glAccountCode: '1020',
    lastReconciled: '12 Sep 2026',
    status: 'RECONCILED',
  },
  {
    id: 'bnk_03',
    bankName: 'Stanbic IBTC Bank',
    accountName: 'Bueno Logistics Limited — Rolling Stock Capital Fund',
    accountNumber: '9023817740',
    accountType: 'Yield Reserve',
    currency: 'NGN (₦)',
    currentBalance: 32000000,
    ledgerBalance: 32000000,
    statementBalance: 32000000,
    glAccountCode: '1025',
    lastReconciled: '10 Sep 2026',
    status: 'RECONCILED',
  },
];

// ─── STATE ENGINE SERVICE ───────────────────────────────────────────────────

/**
 * Server-backed collections.
 *
 * Each maps a legacy localStorage key onto an API endpoint, so the existing
 * getters and setters keep their signatures while the data behind them becomes
 * authoritative.
 */
const STORES: Record<string, CollectionStore> = {
  bueno_trips: new CollectionStore({ endpoint: 'trips.php', cacheKey: 'bueno_trips' }),
  bueno_deals: new CollectionStore({ endpoint: 'deals.php', cacheKey: 'bueno_deals' }),
  bueno_wagons: new CollectionStore({ endpoint: 'wagons.php', cacheKey: 'bueno_wagons' }),
  bueno_requests: new CollectionStore({ endpoint: 'requests.php', cacheKey: 'bueno_requests' }),
  bueno_invoices: new CollectionStore({ endpoint: 'invoices.php', cacheKey: 'bueno_invoices' }),
  bueno_trip_costs: new CollectionStore({ endpoint: 'trip_costs.php', cacheKey: 'bueno_trip_costs' }),
  bueno_custom_deal_negotiations: new CollectionStore({
    endpoint: 'negotiations.php',
    cacheKey: 'bueno_custom_deal_negotiations',
  }),
  bueno_client_requests: new CollectionStore({
    endpoint: 'client_requests.php',
    cacheKey: 'bueno_client_requests',
  }),
  bueno_notifications: new CollectionStore({
    endpoint: 'notifications.php',
    cacheKey: 'bueno_notifications',
  }),
  bueno_users: new CollectionStore({ endpoint: 'users.php', cacheKey: 'bueno_users' }),
};

/**
 * Collections with no server endpoint yet, which remain browser-local.
 *
 * Stated explicitly rather than left looking server-backed: the container
 * yard, gate log and accounting ledgers live per-browser until endpoints exist
 * for them, so they do not follow a user to another device and are not shared
 * between colleagues.
 */
/** Reverse lookup used by the postRemote compatibility shim. */
const ENDPOINT_TO_KEY: Record<string, string> = {
  'trips.php': 'bueno_trips',
  'deals.php': 'bueno_deals',
  'wagons.php': 'bueno_wagons',
  'requests.php': 'bueno_requests',
  'invoices.php': 'bueno_invoices',
  'trip_costs.php': 'bueno_trip_costs',
  'negotiations.php': 'bueno_custom_deal_negotiations',
  'client_requests.php': 'bueno_client_requests',
  'notifications.php': 'bueno_notifications',
  'users.php': 'bueno_users',
};

const LOCAL_ONLY_KEYS = new Set([
  'bueno_containers',
  'bueno_gate_logs',
  'bueno_chart_of_accounts',
  'bueno_journal_entries',
  'bueno_bank_accounts',
  'bueno_system_settings',
]);

/** Surfaces a failed background write instead of losing it silently. */
function reportWriteFailure(key: string, err: ApiError): void {
  console.error(`[StateEngine] could not save ${key}: ${err.message}`);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('bueno_write_failed', {
        detail: { collection: key, message: err.message, status: err.status },
      })
    );
  }
}

/**
 * What an invitation returned by the server carries.
 *
 * `url` is included so an administrator can pass the link on another way when
 * mail is not delivered — shared hosting disables mail() often enough that
 * onboarding must not depend on it.
 */
export interface Invitation {
  emailed: boolean;
  sentTo: string;
  url: string;
  expiresAt: string;
}

class StateEngineService {
  private notifyListeners() {
    notifyStateChanged();
  }

  /**
   * Compatibility shim for call sites that still speak the old
   * "POST this at that endpoint" style.
   *
   * Routes to the matching store so the write goes through per-record upsert
   * with its conflict check, rather than the old fire-and-forget whole-array
   * POST that discarded both errors and other people's edits.
   */
  private postRemote(url: string, data: any): void {
    const key = ENDPOINT_TO_KEY[url.replace(/^\/api\//, '').replace(/^\//, '')];
    const store = key ? STORES[key] : undefined;
    if (!store) {
      console.warn(`[StateEngine] no store for ${url}; write ignored`);
      return;
    }

    const onError = (err: unknown) => {
      if (err instanceof ApiError) reportWriteFailure(key!, err);
      else console.error(`[StateEngine] write failed for ${url}`, err);
    };

    if (data && data.action === 'delete' && data.id) {
      void store.remove(data.id).catch(onError);
      return;
    }
    if (Array.isArray(data)) {
      void store.saveAll(data).catch(onError);
      return;
    }
    void store.upsert(data).catch(onError);
  }


  /**
   * Read a collection.
   *
   * Server-backed keys come from their store; everything else falls back to
   * localStorage. Synchronous, because portals read during render.
   */
  private readStorage<T>(key: string, fallback: T): T {
    const store = STORES[key];
    if (store) {
      const rows = store.all();
      // Before the first sync lands, show static reference data (the wagon
      // registry) rather than an empty screen. Operational collections seed
      // empty, so this does not invent trips or deals.
      if (rows.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
        return fallback;
      }
      return rows as unknown as T;
    }

    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Write a collection.
   *
   * For server-backed keys this diffs against the last known server state and
   * sends only the records that changed. The previous implementation pushed
   * the whole collection on every save, so two people editing different
   * records silently overwrote one another.
   */
  private writeStorage(key: string, value: any): void {
    const store = STORES[key];
    if (store && Array.isArray(value)) {
      void store.saveAll(value).catch((err) => {
        if (err instanceof ApiError) {
          reportWriteFailure(key, err);
        } else {
          console.error(`[StateEngine] save failed for ${key}`, err);
        }
      });
      return;
    }

    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notifyListeners();
    } catch {
      /* storage full or unavailable */
    }
  }

  /** Refresh every server-backed collection. */
  async syncRemote(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!session.isAuthenticated()) return;

    // Tolerate individual failures: one forbidden collection must not stop
    // the others from refreshing.
    await Promise.allSettled(Object.values(STORES).map((s) => s.sync()));
    this.notifyListeners();
  }

  /**
   * Why a collection is empty, if the server refused to serve it.
   *
   *   StateEngine.readFailureFor('bueno_users')
   *
   * Returns null when the last read succeeded, so a screen can distinguish
   * "there is nothing here" from "you are not allowed to see this".
   */
  readFailureFor(key: string): { status: number; message: string } | null {
    return STORES[key]?.readFailure() ?? null;
  }

  /** Drop every browser-held cache. Called on sign-out. */
  clearLocalCaches(): void {
    Object.values(STORES).forEach((s) => s.clearLocal());
    if (typeof window === 'undefined') return;
    try {
      LOCAL_ONLY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  /**
   * Retained as no-ops so existing call sites keep compiling.
   *
   * The legacy-name rewriting these performed on every single read is now a
   * one-off database migration (005), and production seeding is handled by the
   * migration runner rather than by the browser.
   */
  cleanseLafargeAndMigrateHbm(): void {}
  seedInitialProductionState(): void {}

  /**
   * Purging production data is a server-side, audited, capability-gated
   * action. It used to be a client-side loop that emptied localStorage and
   * fired unauthenticated PURGE_ALL requests at every endpoint — which meant
   * anyone who could reach the site could erase operations.
   */
  async cleanProductionPurge(confirmed = false): Promise<void> {
    if (!confirmed) {
      throw new Error(
        'Purging production data requires explicit confirmation. ' +
          'Call cleanProductionPurge(true) from a deliberate administrator action.'
      );
    }
    if (!session.can('system.purge_data')) {
      throw new Error('You do not have permission to purge production data.');
    }

    const targets: Array<[string, string]> = [
      ['trips.php', 'bueno_trips'],
      ['deals.php', 'bueno_deals'],
      ['invoices.php', 'bueno_invoices'],
      ['requests.php', 'bueno_fund_requests'],
      ['trip_costs.php', 'bueno_trip_costs'],
      ['negotiations.php', 'bueno_negotiations'],
      ['client_requests.php', 'bueno_client_requests'],
      ['notifications.php', 'bueno_notifications'],
    ];

    for (const [endpoint, table] of targets) {
      await api.post(endpoint, { action: 'PURGE_ALL', confirm: table });
    }

    this.clearLocalCaches();
    await this.syncRemote();
  }

  /** @deprecated Use cleanProductionPurge(true). */
  purgeDemoData(): void {
    void this.cleanProductionPurge(true);
  }

  // ── TRIPS API ─────────────────────────────────────────────────────────────
  getTrips(): any[] {
    this.seedInitialProductionState();
    return this.readStorage('bueno_trips', SEED_TRIPS);
  }

  saveTrips(trips: any[]): void {
    this.writeStorage('bueno_trips', trips);
    this.postRemote('/api/trips.php', trips);
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

  // ── DYNAMIC WAGON FLEET API ──────────────────────────────────────────────
  getDynamicWagonFleet(customTrips?: any[]): {
    wagons: any[];
    availableCount: number;
    inUseCount: number;
    totalCount: number;
  } {
    const rawWagons = this.getWagons();
    const trips = customTrips || this.getTrips();

    // Active trips: not completed and not cancelled (includes LOADING, IN_TRANSIT, ARRIVED, UNLOADING, RETURNING_EMPTY)
    const activeTrips = trips.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');

    // Build lookup for wagons in active trips
    const wagonTripMap = new Map<string, any>();
    for (const trip of activeTrips) {
      const logs = trip.wagonLogs || [];
      for (const log of logs) {
        const wId = (log.wagonId || log.id || '').trim().toUpperCase();
        if (wId) {
          wagonTripMap.set(wId, {
            tripId: trip.tripId || trip.id,
            origin: trip.origin,
            destination: trip.destination,
            cargoType: trip.cargoType || 'Freight Cargo',
            tripStatus: trip.status,
            wagonStatus:
              trip.status === 'RETURNING_EMPTY'
                ? 'RETURNING_EMPTY'
                : log.unloadStatus === 'UNLOADED'
                ? 'UNLOADED'
                : log.unloadStatus === 'UNLOADING'
                ? 'UNLOADING'
                : log.status === 'LOADED'
                ? (trip.status === 'IN_TRANSIT' ? 'IN_TRANSIT' : 'LOADED')
                : 'LOADING',
            qty: log.qty || log.bagsCount || '1,200 Bags',
            sealNumber: log.sealNumber || 'SEAL-VERIFIED',
          });
        }
      }
    }

    let inUseCount = 0;
    const computedWagons = rawWagons.map((w: any) => {
      const wId = (w.id || '').trim().toUpperCase();
      const activeInfo = wagonTripMap.get(wId);
      if (activeInfo) {
        inUseCount++;
        return {
          ...w,
          status: activeInfo.wagonStatus,
          activeTripId: activeInfo.tripId,
          activeRoute: `${activeInfo.origin} ➔ ${activeInfo.destination}`,
          activeCargo: activeInfo.cargoType,
          activeQty: activeInfo.qty,
          isAssigned: true,
          currentStation:
            activeInfo.tripStatus === 'ARRIVED' || activeInfo.tripStatus === 'UNLOADING'
              ? activeInfo.destination
              : activeInfo.tripStatus === 'RETURNING_EMPTY'
              ? `${activeInfo.origin} ➔ ${activeInfo.destination}`
              : activeInfo.origin,
        };
      }
      return {
        ...w,
        status: 'AVAILABLE',
        activeTripId: null,
        activeRoute: null,
        activeCargo: null,
        isAssigned: false,
      };
    });

    return {
      wagons: computedWagons,
      availableCount: computedWagons.length - inUseCount,
      inUseCount,
      totalCount: computedWagons.length,
    };
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
    this.seedInitialProductionState();
    return this.readStorage('bueno_deals', SEED_DEALS);
  }

  saveDeals(deals: any[]): void {
    this.writeStorage('bueno_deals', deals);
    this.postRemote('/api/deals.php', deals);
  }

  /**
   * Write one deal.
   *
   * Registering a deal used to hand the whole collection to saveDeals, which
   * resent every other deal alongside it. That is how one new contract
   * produced "this record changed since you loaded it" about contracts nobody
   * had opened. Touching one record should write one record.
   *
   * Awaited, so a refusal reaches the caller instead of a toast appearing
   * several seconds later next to a form that has already closed.
   */
  async saveDeal(deal: any): Promise<any> {
    const saved = await STORES.bueno_deals.upsert(deal);
    this.notifyListeners();
    return saved;
  }

  /** Apply a patch to one deal, on top of the freshest copy we hold. */
  async updateDeal(dealId: string, patch: Record<string, unknown>): Promise<any> {
    const current = this.getDeals().find(
      (d: any) => d.id === dealId || d.dealNumber === dealId
    );
    if (!current) throw new Error('That deal is no longer in the register.');
    return this.saveDeal({ ...current, ...patch });
  }

  dispatchDealTranche(dealId: string, user?: any): any {
    const deals = this.getDeals();
    const deal = deals.find((d: any) => d.id === dealId || d.dealNumber === dealId);
    if (!deal) throw new Error('Deal not found');

    // A cancelled contract is off. Hiding it from the register is not enough
    // on its own — this is the path that actually creates a trip, and it can
    // be reached from a stale screen opened before the cancellation.
    if (deal.status === 'CANCELLED') {
      throw new Error(
        `${deal.dealNumber || deal.id} has been cancelled. No further trips can be dispatched against it.`
      );
    }

    const nextTrancheNum = (deal.dispatchedTripsCount || 0) + 1;
    const totalTrips = Math.max(1, Number(deal.totalPlannedTrips) || (deal.dealType === 'SINGLE_TRIP' ? 1 : 1));
    const trancheTonnage = deal.trancheTonnage || Math.round((deal.quantity || 9200) / totalTrips);
    const newTripId = `TRP-${Math.floor(1000 + Math.random() * 8999)}`;

    const origin = deal.loadingStation || 'PAPA';
    const destination = deal.destination || 'MONI';
    const gauge = deal.gauge || (['EWK', 'IDD', 'ILR', 'OSB', 'DGB'].includes(origin) ? 'NARROW_GAUGE' : 'STANDARD_GAUGE');

    const isOriginPAPA = origin === 'PAPA';
    const curLat = isOriginPAPA ? 6.8974 : (origin === 'APT' ? 6.4550 : 6.8974);
    const curLng = isOriginPAPA ? 3.2141 : (origin === 'APT' ? 3.3610 : 3.2141);

    // Physical Railway Constraints: 1 Covered Hopper Wagon = 1,200 Bags (60 MT). Max Consist = 23 Wagons (27,600 Bags / 1,380 MT)
    const isCementOrBags = (deal.cargoType || '').toLowerCase().includes('cement') || (deal.unitOfMeasure || '').toLowerCase().includes('bag');
    const trancheBags = isCementOrBags ? (deal.unitOfMeasure === 'Bags' ? trancheTonnage : Math.round(trancheTonnage * 20)) : trancheTonnage;
    const requiredWagons = Math.min(23, Math.max(1, Math.ceil(trancheBags / 1200)));
    const bagsPerWagon = Math.min(1200, Math.round(trancheBags / requiredWagons));

    /**
     * The active cargo officer posted to a station, or '' if nobody is.
     *
     * '' rather than a placeholder name: the field is filled in by whoever
     * actually works the trip, and an empty field prompts that. An invented
     * one does not.
     */
    const officerAt = (station: string): string => {
      const match = this.getUsers().find(
        (u: any) =>
          u.role === 'CARGO_OFFICER' &&
          (u.status === 'ACTIVE' || !u.status) &&
          (u.assignedStation || '').toUpperCase() === (station || '').toUpperCase()
      );
      return match?.fullName || '';
    };

    const newTrip: any = {
      id: newTripId,
      tripId: newTripId,
      dealNumber: deal.dealNumber || deal.id,
      dealId: deal.id,
      trancheNumber: nextTrancheNum,
      totalPlannedTrips: totalTrips,
      trancheLabel: `Tranche ${nextTrancheNum} of ${totalTrips} (${deal.company || 'Consignee'})`,
      // Left for the cargo officer to enter when the locomotive is actually
      // coupled. It used to alternate between two invented loco numbers, which
      // then appeared on the manifest as though a specific engine had been
      // assigned.
      locomotiveId: '',
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
      wagonType: deal.wagonType || 'Covered Hopper Wagon',
      quantity: trancheTonnage,
      tonnage: `${trancheTonnage} MT`,
      /*
       * Staffed from the accounts that exist, or left unassigned.
       *
       * These were five hard-coded names — Ade Bello, Ngozi Eze, Musa Ibrahim,
       * a driver and a two-man crew — stamped onto every dispatched trip and
       * printed onto its manifest and waybill. They survived the accounts
       * being deleted, because nothing ever read an account to produce them.
       *
       * A manifest naming an escort who does not work here is a document
       * asserting who was responsible for a consignment. Better blank, for
       * the officer to complete, than confidently wrong.
       */
      cargoOfficerName: officerAt(origin),
      unloadingOfficerName: officerAt(destination),
      leadDriverName: '',
      trainCrew: '',
      monitoringOfficer: officerAt(origin),
      status: 'LOADING',
      dispatchTime: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: 'Today, ' + new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      wagonLogs: [],
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

    let d: Date | null = null;
    if (dateInput instanceof Date) {
      d = dateInput;
    } else {
      const ukMatch = str.match(/^(\d{1,2})[\/\s-](\d{1,2}|[a-z]{3})[\/\s-](\d{4})/i);
      if (ukMatch) {
        const day = parseInt(ukMatch[1], 10);
        const mStr = ukMatch[2];
        const year = parseInt(ukMatch[3], 10);
        let month = 0;
        if (/^\d+$/.test(mStr)) {
          month = parseInt(mStr, 10) - 1;
        } else {
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          month = monthNames.findIndex((m) => mStr.toLowerCase().startsWith(m));
          if (month === -1) month = 0;
        }
        d = new Date(year, month, day);
      } else {
        const parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
    }

    if (!d || isNaN(d.getTime())) return 'TODAY';

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

  updateTripFinancePricing(
    tripId: string,
    costData: {
      amount: number;
      tariffRatePerTon?: number;
      damageDeduction?: number;
      notes?: string;
      currency?: string;
    },
    user?: any
  ): void {
    const trips = this.getTrips();
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('en-GB')}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const updatedTrips = trips.map((t: any) => {
      if (t.id === tripId || t.tripId === tripId) {
        return {
          ...t,
          financeCost: costData.amount,
          tripRevenue: costData.amount,
          tariffRatePerTon: costData.tariffRatePerTon || (t.quantity ? Math.round(costData.amount / (t.unitOfMeasure === 'Bags' ? Number(t.quantity) / 20 : Number(t.quantity))) : 0),
          damageDeduction: costData.damageDeduction || 0,
          costingStatus: 'COSTED',
          costedAt: timestamp,
          costedBy: user?.fullName || 'Finance Desk',
          costingNotes: costData.notes || '',
        };
      }
      return t;
    });

    this.saveTrips(updatedTrips);

    // Synchronize corresponding invoice in bueno_invoices
    try {
      const invoices = this.getInvoices();
      const targetTrip = updatedTrips.find((t: any) => t.id === tripId || t.tripId === tripId);
      if (targetTrip) {
        const netAmount = Math.max(0, costData.amount - (costData.damageDeduction || 0));
        const existingInvIndex = invoices.findIndex(
          (inv: any) => inv.tripId === tripId || (targetTrip.dealId && inv.dealId === targetTrip.dealId)
        );
        if (existingInvIndex !== -1) {
          invoices[existingInvIndex] = {
            ...invoices[existingInvIndex],
            subtotal: costData.amount,
            damageDeduction: costData.damageDeduction || 0,
            totalAmount: netAmount,
            balance: netAmount - (Number(invoices[existingInvIndex].amountPaid) || 0),
            notes: costData.notes || invoices[existingInvIndex].notes,
            status: (Number(invoices[existingInvIndex].amountPaid) || 0) >= netAmount ? 'SETTLED' : 'ISSUED',
          };
          this.saveInvoices(invoices);
        }
      }
    } catch {}
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

  /**
   * Update the local cache only.
   *
   * Accounts are NOT a generic upsert collection, and this must not post to
   * the API. `users.php` dispatches on an explicit action — create, update,
   * deactivate, reactivate, reset_credentials — because each carries its own
   * authorisation: minting an account with a privileged role is checked
   * differently from editing a phone number, and creation returns a one-time
   * secret that is never stored in retrievable form.
   *
   * This previously routed through the generic collection store, which posts
   * `{action: 'upsert'}`. That is not a case `users.php` handles, so it
   * answered "Unknown action" with a 400 and every user write from the
   * interface silently failed: a provisioned account lived in localStorage
   * until the next poll overwrote it, and no password hash was ever created,
   * so the credential the administrator was shown could never work.
   *
   * Use provisionUser / updateUserRemote / setUserActive / resetUserCredentials.
   */
  cacheUsers(users: any[]): void {
    this.writeStorage('bueno_users', users);
  }

  /**
   * Provision an account.
   *
   * Returns the one-time secret generated by the server. The caller must show
   * it to the administrator immediately — it is hashed on write and cannot be
   * retrieved again; the only recovery is resetUserCredentials.
   */
  async provisionUser(payload: {
    fullName: string;
    email: string;
    phone?: string;
    role: string;
    userType?: string;
    assignedStation?: string;
    companyName?: string;
    staffId?: string;
  }): Promise<{ user: any; initialSecret: string; invitation: Invitation }> {
    const { data } = await api.post('users.php', { action: 'create', ...payload });
    await STORES.bueno_users.sync();
    this.notifyListeners();
    return {
      user: data.user,
      initialSecret: data.initialSecret,
      invitation: data.invitation,
    };
  }

  /**
   * Send a fresh invitation, invalidating any outstanding one.
   *
   * Needed because mail fails, links expire, and people lose them. Without it
   * the only recovery was resetting the credential — a heavier action that
   * tells the user nothing about why they are being asked again.
   */
  async resendInvitation(userId: string): Promise<Invitation> {
    const { data } = await api.post('users.php', { action: 'resend_invitation', id: userId });
    return data.invitation;
  }

  /** Edit an existing account's profile. */
  async updateUserRemote(id: string, fields: Record<string, unknown>): Promise<any> {
    const { data } = await api.post('users.php', { action: 'update', id, ...fields });
    await STORES.bueno_users.sync();
    this.notifyListeners();
    return data?.user ?? data;
  }

  /** Suspend or restore an account. */
  async setUserActive(id: string, active: boolean): Promise<void> {
    await api.post('users.php', { action: active ? 'reactivate' : 'deactivate', id });
    await STORES.bueno_users.sync();
    this.notifyListeners();
  }

  /**
   * Erase an account permanently.
   *
   * Deactivation is the right choice almost every time — it ends access while
   * keeping the account attached to the work it did. This is for accounts
   * created in error, duplicates, test accounts and erasure requests.
   *
   * The server refuses to delete the caller's own account, or the last active
   * account able to administer permissions.
   */
  async deleteUser(id: string): Promise<void> {
    await api.post('users.php', { action: 'delete', id });
    await STORES.bueno_users.sync();
    this.notifyListeners();
  }

  /** Issue a new one-time secret and end every session the account holds. */
  async resetUserCredentials(id: string): Promise<string> {
    const { data } = await api.post('users.php', { action: 'reset_credentials', id });
    await STORES.bueno_users.sync();
    this.notifyListeners();
    return data.initialSecret;
  }

  /**
   * Who currently holds a role, for a signature block.
   *
   * Returns null when nobody does. It used to take a fallback name and call
   * sites passed real-looking ones — 'Alhaji Bashir Umar', 'Chinenye Nnamdi',
   * 'Babajide Sanwo' — so a report or an invoice printed a person who does
   * not work here, under "DIGITAL SIGNATURE VERIFIED" and "(Chartered
   * Accountant)", once those accounts were deleted.
   *
   * An invoice goes to a customer. Attributing it to an invented accountant
   * is not a display bug. Callers must handle null and say the role is
   * unassigned rather than invent someone to fill it.
   */
  getSignatory(role: string): string | null {
    const users = this.getUsers();
    const matched = users?.find(
      (u: any) =>
        (u.role === role || (role === 'CEO' && (u.role === 'MD' || u.role === 'CEO')) || (role === 'MD' && u.role === 'CEO')) &&
        (u.status === 'ACTIVE' || !u.status)
    );
    return matched?.fullName || null;
  }

  /**
   * Edit an account, and keep the signed-in user's own cached copy in step.
   *
   * Awaits the server rather than writing optimistically: an edit can be
   * refused — a cargo officer may not promote themselves to ADMIN — and
   * showing the change as saved when the server rejected it is worse than
   * showing an error.
   */
  async updateUser(userId: string, updatedFields: any): Promise<any> {
    const saved = await this.updateUserRemote(userId, updatedFields);

    // If the signed-in user edited their own record, refresh their cached
    // copy so the interface does not keep showing stale details.
    try {
      const activeUser = this.readStorage<any>('bueno_user', null);
      if (activeUser && (activeUser.id === userId || activeUser.email === userId)) {
        this.writeStorage('bueno_user', { ...activeUser, ...updatedFields });
      }
    } catch {}

    this.notifyListeners();
    return saved;
  }

  getStationWagonLedger(stationCode?: string, tripIdFilter?: string): any[] {
    const trips = this.getTrips();
    const rows: any[] = [];

    trips.forEach((trip) => {
      // Filter by tripId if provided
      if (tripIdFilter && tripIdFilter !== 'ALL') {
        const tripMatches = trip.id === tripIdFilter || trip.tripId === tripIdFilter;
        if (!tripMatches) return;
      } else if (stationCode && stationCode !== 'ALL') {
        // Filter by station code
        const isOrigin = trip.origin === stationCode;
        const isDest = trip.destination === stationCode;
        const validForStation =
          (isOrigin && trip.status !== 'COMPLETED' && trip.status !== 'DISCHARGED') ||
          (isDest && (trip.status === 'ARRIVED' || trip.status === 'UNLOADING' || trip.status === 'COMPLETED' || trip.status === 'DISCHARGED'));
        if (!validForStation) return;
      }

      const isCement =
        (trip.cargoType || '').toLowerCase().includes('cement') ||
        (trip.unitOfMeasure || '').toLowerCase().includes('bag');

      (trip.wagonLogs || []).forEach((wLog: any, idx: number) => {
        const numQty = Number(wLog.qty || 1200);
        const tonnageStr = isCement
          ? `${(numQty * 0.05).toFixed(1).replace(/\.0$/, '')} MT`
          : `${numQty} MT`;
        const qtyStr = `${numQty.toLocaleString()} ${wLog.unitOfMeasure || (isCement ? 'Bags' : 'MT')}`;

        const isDischarged = wLog.unloadStatus === 'UNLOADED' || trip.status === 'COMPLETED';
        const condition = isDischarged
          ? 'DISCHARGED'
          : wLog.status === 'LOADED'
          ? 'LOADED_INTACT'
          : wLog.condition || 'GOOD';

        const stationDisplay = stationCode || trip.origin || 'EWK';

        rows.push({
          id: `TRM-${trip.id}-${wLog.wagonId || idx}`,
          wagonNo: wLog.wagonId || `WG-${idx + 1}`,
          condition,
          remark:
            wLog.remark ||
            (isDischarged
              ? `Discharged at ${trip.destination} siding (${trip.cargoType || 'Cement'})`
              : `Loaded & Sealed at ${trip.origin} siding (Seal: ${wLog.sealNumber || 'VERIFIED'})`),
          dateLoaded: wLog.startDate || trip.dispatchDate || trip.dispatchTime || 'Today',
          startTime: wLog.startTime || '—',
          endTime: wLog.endTime || '—',
          duration: wLog.durationStr || '—',
          unloadStartTime: wLog.unloadStartTime || '—',
          unloadEndTime: wLog.unloadEndTime || '—',
          unloadDuration: wLog.unloadDurationStr || '—',
          trainNo: trip.tripId || trip.id,
          origin: trip.origin,
          destination: trip.destination,
          content: trip.cargoType || 'Freight Cargo',
          tonnage: tonnageStr,
          quantity: qtyStr,
          rawQty: numQty,
          truckRegNo: wLog.truckRegNo || 'N/A',
          driverDetails: wLog.driverDetails || 'N/A',
          sourceBay: wLog.sourceEnv || 'Silo Bay 1',
          sealNumber: wLog.sealNumber || 'SEAL-OK',
          damages: (Number(wLog.damageQty) || 0) + (Number(wLog.burstBags) || 0),
          waybillNo:
            wLog.waybillNo ||
            `WB-BN-${trip.dealNumber || trip.tripId || trip.id}-${String(idx + 1).padStart(3, '0')}`,
          daysAtStation: trip.status === 'ARRIVED' || trip.status === 'COMPLETED' ? 1 : 0,
          demurrage: 0,
          station: stationDisplay,
          tripRef: trip,
        });
      });
    });

    return rows;
  }


  // Client accounts are no longer provisioned from the public enquiry form.
  //
  // provisionClientFromRequest() used to create a CUSTOMER account with the
  // PIN '1111' straight from an anonymous web form — anyone who submitted the
  // form got a working sign-in on a credential that was documented publicly.
  // The server side of that was removed earlier; this client-side copy
  // survived with no callers, still writing a fabricated ACTIVE account into
  // local storage where it appeared in the administrator's user list until the
  // next poll replaced it.
  //
  // An enquiry now creates a request record only. An administrator provisions
  // the account deliberately, via provisionUser(), which returns a one-time
  // secret generated by the server.

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
  // ─── PERMISSIONS ──────────────────────────────────────────────────────────
  //
  // These now delegate to the session, which carries the capability set the
  // server computed. Previously they evaluated a localStorage matrix in the
  // browser, which meant the UI's idea of a permission and the API's could
  // differ — and a user could grant themselves anything by editing storage.
  //
  // Two defects lived here specifically:
  //   - hasGranularPermission() read the coarse tab matrix, where 23 of the 34
  //     granular keys do not exist, so it returned false for every role
  //     including ADMIN. The only two can() gates in the app were dead.
  //   - saveGranularPermissions() POSTed {granularMatrix}, a field the server
  //     never read, so granular edits never persisted anywhere.

  /** No longer needed: the server owns the matrix and its schema. */
  seedPermissionsIfVersionMismatch(): void {}

  /**
   * Load the matrix the server is actually enforcing, and cache it.
   *
   * This existed and was never called from anywhere, which made the
   * permissions editor display something that was not true. getRolePermissions
   * falls back to the shipped defaults when the browser has nothing cached, so
   * an administrator opening the screen for the first time saw every default
   * capability ticked regardless of what the database held. A capability
   * revoked on the server appeared granted, and the endpoint it guarded
   * answered 403 while the checkbox for it sat there ticked.
   *
   * It was worse than a display fault: every toggle writes the whole matrix
   * back, so the first edit would have overwritten the server's real state
   * with the browser's guess and silently restored capabilities an
   * administrator had deliberately removed.
   */
  async refreshRolePermissions(): Promise<Record<string, string[]>> {
    const { data } = await api.get('permissions.php');
    const matrix = normalizeMatrix(data?.matrix);
    this.writeStorage('bueno_role_permissions', matrix);
    this.notifyListeners();
    return matrix;
  }

  /** @deprecated use refreshRolePermissions, which also caches. */
  async fetchRolePermissions(): Promise<Record<string, string[]>> {
    return this.refreshRolePermissions();
  }

  /**
   * Whether the cached matrix came from the server or is a default guess.
   *
   * The editor must not present defaults as though they were the enforced
   * policy, so it needs to know the difference.
   */
  hasServerRolePermissions(): boolean {
    return this.readStorage<Record<string, string[]> | null>('bueno_role_permissions', null) !== null;
  }

  /**
   * Cached matrix for synchronous render paths.
   *
   * Falls back to defaults when nothing has been loaded yet — callers that
   * show this to a human must check hasServerRolePermissions() first.
   *
   * Note this is for *displaying* the editor. Authorization decisions use
   * can()/canUserAccessTab(), which read the caller's own server-issued
   * capabilities rather than this table.
   */
  getRolePermissions(): Record<string, string[]> {
    return normalizeMatrix(this.readStorage<Record<string, string[]> | null>('bueno_role_permissions', null));
  }

  /** One matrix now, so the granular view is the same data. */
  getGranularPermissions(): Record<string, string[]> {
    return this.getRolePermissions();
  }

  async saveRolePermissionsAsync(matrix: Record<string, string[]>): Promise<boolean> {
    try {
      const { data } = await api.post('permissions.php', { matrix });
      const saved = normalizeMatrix(data?.matrix ?? matrix);
      this.writeStorage('bueno_role_permissions', saved);
      // The caller's own capabilities may have just changed.
      await session.loadSession(true);
      this.notifyListeners();
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        console.error(`[StateEngine] permissions not saved: ${err.message}`);
        throw err;
      }
      return false;
    }
  }

  saveRolePermissions(matrix: Record<string, string[]>): void {
    void this.saveRolePermissionsAsync(matrix).catch(() => {});
  }

  /** Both names write the same single matrix. */
  saveGranularPermissions(matrix: Record<string, string[]>): void {
    this.saveRolePermissions(matrix);
  }

  async resetPermissionsToDefaultsAsync(): Promise<Record<string, string[]>> {
    const { data } = await api.post('permissions.php', { action: 'RESET_DEFAULTS' });
    const defaults = normalizeMatrix(data?.matrix);
    this.writeStorage('bueno_role_permissions', defaults);
    await session.loadSession(true);
    this.notifyListeners();
    return defaults;
  }

  /**
   * May the signed-in user open this tab?
   *
   * The `user` argument is accepted for call-site compatibility but ignored:
   * the answer is about the *current session*, and trusting a caller-supplied
   * user object is how a client-side check becomes meaningless.
   */
  canUserAccessTab(_user: any, tabId: string): boolean {
    return session.can(resolveTabCapability(tabId));
  }

  /** Does the signed-in user hold this capability? */
  hasGranularPermission(_user: any, capabilityKey: string): boolean {
    return session.can(capabilityKey);
  }

  /** Direct capability check, preferred for new code. */
  can(capabilityKey: string): boolean {
    return session.can(capabilityKey);
  }

  getPermissions(): Record<string, string[]> {
    return this.getRolePermissions();
  }

  savePermissions(matrix: Record<string, string[]>): void {
    this.saveRolePermissions(matrix);
  }


  // ─── DOUBLE-ENTRY CHART OF ACCOUNTS & GENERAL JOURNAL API ─────────────────

  getChartOfAccounts(): ChartAccount[] {
    return this.readStorage<ChartAccount[]>('bueno_chart_of_accounts', SEED_CHART_OF_ACCOUNTS);
  }

  saveChartOfAccounts(accounts: ChartAccount[]): void {
    this.writeStorage('bueno_chart_of_accounts', accounts);
  }

  addChartOfAccount(acc: Omit<ChartAccount, 'id'>): ChartAccount {
    const existing = this.getChartOfAccounts();
    const newAccount: ChartAccount = {
      ...acc,
      id: `acc_${acc.code || Date.now()}`,
    };
    this.saveChartOfAccounts([...existing, newAccount]);
    return newAccount;
  }

  getJournalEntries(): JournalEntry[] {
    return this.readStorage<JournalEntry[]>('bueno_journal_entries', SEED_JOURNAL_ENTRIES);
  }

  addJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt'>): JournalEntry {
    const existing = this.getJournalEntries();
    const newEntry: JournalEntry = {
      ...entry,
      id: `jrn_${Date.now()}`,
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    // Update account balances according to debit and credit effects
    const accounts = this.getChartOfAccounts();
    newEntry.lines.forEach((line) => {
      const targetAcc = accounts.find((a) => a.id === line.accountId || a.code === line.accountCode);
      if (targetAcc) {
        if (targetAcc.type === 'ASSET' || targetAcc.type === 'EXPENSE') {
          targetAcc.balance += (Number(line.debit) || 0) - (Number(line.credit) || 0);
        } else {
          targetAcc.balance += (Number(line.credit) || 0) - (Number(line.debit) || 0);
        }
      }
    });
    this.saveChartOfAccounts(accounts);
    this.writeStorage('bueno_journal_entries', [newEntry, ...existing]);
    return newEntry;
  }

  getBankAccounts(): BankAccount[] {
    return this.readStorage<BankAccount[]>('bueno_bank_accounts', SEED_BANK_ACCOUNTS);
  }

  saveBankAccounts(banks: BankAccount[]): void {
    this.writeStorage('bueno_bank_accounts', banks);
  }

  reconcileBankAccount(bankId: string): void {
    const banks = this.getBankAccounts();
    const updated = banks.map((b) =>
      b.id === bankId
        ? { ...b, lastReconciled: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), status: 'RECONCILED' as const }
        : b
    );
    this.saveBankAccounts(updated);
  }

}

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
    name: 'Cement: Papalanto -> Moniya (Ibadan)',
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
    name: 'Export Containers: Moniya -> APMT / ENL',
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
    name: 'Import / Empty Containers: APMT / ENL -> Moniya',
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
    name: 'Gypsum: ENL -> Papalanto',
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
    name: 'Cement: Itori (Ewekoro) -> Ibadan (Dugbe), Oshogbo, Ilorin',
    gauge: 'NARROW_GAUGE',
    origin: 'EWK',
    destination: 'DGB',
    cargoType: 'Cement / Bagged Goods',
    wagonCode: 'PXG/CGs',
    description: 'Western District Cement Trains: Itori (Ewekoro) to Ibadan, Oshogbo and Ilorin (Narrow Gauge)',
  },
  {
    id: 'NG_OP_2',
    name: 'Import & Export Containers: Iddo -> APMT',
    gauge: 'NARROW_GAUGE',
    origin: 'IDD',
    destination: 'APT',
    cargoType: 'CONTAINERS-IMPORT / EXPORT',
    wagonCode: 'CBX',
    description: 'Lagos District Container Transfer between Iddo and APMT (Narrow Gauge)',
  },
];


/**
 * Permission shapes are re-exported from the canonical registry.
 *
 * They used to be defined here as six separate constants that had already
 * drifted apart from each other and from the PHP copy. There is now one
 * definition, in apps/web/src/lib/rbac/capabilities.ts, from which the PHP
 * mirror is generated.
 */
export {
  TAB_REGISTRY,
  UNIFIED_PERMISSION_LIST,
  PERMISSION_CATEGORIES,
  GRANULAR_MODULE_PERMISSIONS,
  DEFAULT_ROLE_TAB_PERMISSIONS,
  DEFAULT_GRANULAR_ROLE_PERMISSIONS,
  TAB_ALIASES,
  type TabRegistryEntry,
  type PermissionDefinition,
  type GranularPermissionAction,
  type GranularPermissionModule,
} from '@/lib/rbac/views';

export {
  CAPABILITIES,
  CAPABILITY_KEYS,
  ROLES,
  ROLE_LABELS,
  DEFAULT_ROLE_CAPABILITIES,
  MODULES,
  SENSITIVE_CAPABILITIES,
  resolveTabCapability,
  isKnownCapability,
  normalizeMatrix,
  type Capability,
  type Role,
} from '@/lib/rbac/capabilities';

/** @deprecated Tab ids resolve through resolveTabCapability(). */
export const TAB_TO_CAPABILITY: Record<string, string> = {};

export const StateEngine = new StateEngineService();
