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

  private _isSyncing = false;
  async syncRemote(): Promise<void> {
    if (typeof window === 'undefined' || this._isSyncing) return;
    this._isSyncing = true;
    try {
      // 1. Authoritative REST Sync with cPanel Deals Endpoint
      try {
        const dealsRes = await fetch('/api/deals.php', { cache: 'no-store' });
        if (dealsRes.ok) {
          const json = await dealsRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_deals', json.data);
          }
        }
      } catch {}

      // 2. Authoritative REST Sync with cPanel Trips Endpoint
      try {
        const tripsRes = await fetch('/api/trips.php', { cache: 'no-store' });
        if (tripsRes.ok) {
          const json = await tripsRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_trips', json.data);
          }
        }
      } catch {}

      // 3. Sync Invoices from cPanel
      try {
        const invRes = await fetch('/api/invoices.php', { cache: 'no-store' });
        if (invRes.ok) {
          const json = await invRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_invoices', json.data);
          }
        }
      } catch {}

      // 4. Sync Trip Costs from cPanel
      try {
        const costsRes = await fetch('/api/trip_costs.php', { cache: 'no-store' });
        if (costsRes.ok) {
          const json = await costsRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_trip_costs', json.data);
          }
        }
      } catch {}

      // 5. Sync Fund Requests from cPanel
      try {
        const reqRes = await fetch('/api/requests.php', { cache: 'no-store' });
        if (reqRes.ok) {
          const json = await reqRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_requests', json.data);
          }
        }
      } catch {}

      // 6. Sync Client Requests from cPanel
      try {
        const clRes = await fetch('/api/client_requests.php', { cache: 'no-store' });
        if (clRes.ok) {
          const json = await clRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_client_requests', json.data);
          }
        }
      } catch {}

      // 7. Sync Notifications from cPanel
      try {
        const notifRes = await fetch('/api/notifications.php', { cache: 'no-store' });
        if (notifRes.ok) {
          const json = await notifRes.json();
          if (json && json.status === 'success' && Array.isArray(json.data)) {
            this.writeStorage('bueno_notifications', json.data);
          }
        }
      } catch {}

      // 4. Sync Permissions & System Settings
      try {
        const permsRes = await fetch('/api/permissions.php', { cache: 'no-store' });
        if (permsRes.ok) {
          const json = await permsRes.json();
          if (json && json.status === 'success') {
            if (json.matrix) this.writeStorage('bueno_role_permissions', json.matrix);
            if (json.settings) this.writeStorage('bueno_system_settings', json.settings);
          }
        }
      } catch {}

      this.notifyListeners();
    } catch {} finally {
      this._isSyncing = false;
    }
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
      this.writeStorage('bueno_notifications', []);
      this.writeStorage('bueno_users', SEED_USERS);
      this.writeStorage('bueno_wagons', SEED_WAGONS);
      localStorage.setItem('bueno_prod_purge_clean_v15', 'purged');
      this.postRemote('/api/trips.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/trip_costs.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/invoices.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/requests.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/client_requests.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/negotiations.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/notifications.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/deals.php', { action: 'PURGE_ALL' });
      this.postRemote('/api/users.php', SEED_USERS);
      this.postRemote('/api/wagons.php', SEED_WAGONS);
      this.notifyListeners();
    } catch {}
  }

  private _initialRemoteSynced = false;
  seedInitialProductionState(): void {
    if (typeof window === 'undefined') return;
    try {
      const PROD_RELEASE_KEY = 'bueno_prod_v35_clean_slate_live';
      if (localStorage.getItem('bueno_cache_version') !== PROD_RELEASE_KEY) {
        localStorage.setItem('bueno_cache_version', PROD_RELEASE_KEY);
        this.cleanProductionPurge();
      }

      // Always cleanse any stray legacy mock entries in browser storage
      this.cleanseLafargeAndMigrateHbm();

      // Cleanse and deduplicate wagons fleet to strictly 46 official dedicated hoppers
      const storedWagons = this.readStorage<any[]>('bueno_wagons', SEED_WAGONS);
      if (!Array.isArray(storedWagons) || storedWagons.length !== 46 || storedWagons.some((w: any) => w.id?.startsWith('PXG 00') || w.id?.startsWith('WG') || w.id?.startsWith('CBX'))) {
        this.writeStorage('bueno_wagons', SEED_WAGONS);
      }

      // Initial background sync from cPanel server
      if (!this._initialRemoteSynced) {
        this._initialRemoteSynced = true;
        this.syncRemote();
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
    this.seedInitialProductionState();
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

    // Physical Railway Constraints: 1 Covered Hopper Wagon = 1,200 Bags (60 MT). Max Consist = 23 Wagons (27,600 Bags / 1,380 MT)
    const isCementOrBags = (deal.cargoType || '').toLowerCase().includes('cement') || (deal.unitOfMeasure || '').toLowerCase().includes('bag');
    const trancheBags = isCementOrBags ? (deal.unitOfMeasure === 'Bags' ? trancheTonnage : Math.round(trancheTonnage * 20)) : trancheTonnage;
    const requiredWagons = Math.min(23, Math.max(1, Math.ceil(trancheBags / 1200)));
    const bagsPerWagon = Math.min(1200, Math.round(trancheBags / requiredWagons));

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
      wagonType: deal.wagonType || 'Covered Hopper Wagon',
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
    const role = typeof user === 'string' ? user : (user.role || 'GUEST');

    const matrix = this.getRolePermissions();
    const rolePerms = matrix[role];

    if (Array.isArray(rolePerms)) {
      const capability = TAB_TO_CAPABILITY[tabId] || tabId;
      return rolePerms.includes(capability);
    }

    // Super-admins default to full access if unconfigured
    if (role === 'ADMIN' || role === 'CEO' || role === 'MD') return true;

    return false;
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

  // ─── GRANULAR PERMISSIONS MATRIX API ──────────────────────────────────────

  getGranularPermissions(): Record<string, string[]> {
    const stored = this.readStorage<Record<string, string[]> | null>('bueno_granular_permissions', null);
    if (!stored || typeof stored !== 'object') {
      return JSON.parse(JSON.stringify(DEFAULT_GRANULAR_ROLE_PERMISSIONS));
    }
    const merged: Record<string, string[]> = {};
    Object.keys(DEFAULT_GRANULAR_ROLE_PERMISSIONS).forEach((roleKey) => {
      merged[roleKey] = Array.isArray(stored[roleKey]) ? stored[roleKey] : [...DEFAULT_GRANULAR_ROLE_PERMISSIONS[roleKey]];
    });
    return merged;
  }

  saveGranularPermissions(matrix: Record<string, string[]>): void {
    this.writeStorage('bueno_granular_permissions', matrix);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('bueno_permissions_updated'));
      window.dispatchEvent(new Event('bueno_state_updated'));
      fetch('/api/permissions.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granularMatrix: matrix }),
      }).catch(() => {});
    }
  }

  hasGranularPermission(user: any, actionKey: string): boolean {
    if (!user) return false;
    const role = typeof user === 'string' ? user : (user.role || 'GUEST');
    const matrix = this.getGranularPermissions();
    const userPerms = matrix[role];
    if (Array.isArray(userPerms)) {
      return userPerms.includes(actionKey);
    }
    const defaultPerms = DEFAULT_GRANULAR_ROLE_PERMISSIONS[role];
    if (Array.isArray(defaultPerms)) {
      return defaultPerms.includes(actionKey);
    }
    if (role === 'ADMIN' || role === 'CEO' || role === 'MD') return true;
    return false;
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

// ─── GRANULAR ROLE-BASED ACCESS CONTROL (RBAC) SCHEMA ───────────────────────
export interface GranularPermissionAction {
  key: string;
  label: string;
  description: string;
}

export interface GranularPermissionModule {
  id: string;
  name: string;
  title: string;
  icon: string;
  description: string;
  actions: GranularPermissionAction[];
}

export const GRANULAR_MODULE_PERMISSIONS: GranularPermissionModule[] = [
  {
    id: 'commercial',
    name: 'Commercial & Deals Desk',
    title: 'Commercial & Deals Desk',
    icon: 'commercial',
    description: 'Single-trip and monthly consignment contracts, spot rates, and customer agreements',
    actions: [
      { key: 'deals.view', label: 'View Deals', description: 'Inspect active commercial contracts and backlog' },
      { key: 'deals.create', label: 'Create Deals', description: 'Create spot-run or master multi-trip contracts' },
      { key: 'deals.edit', label: 'Edit Deals', description: 'Modify contract volumes, pricing, or consignee notes' },
      { key: 'deals.approve', label: 'Approve Deals', description: 'Authorize deals for corridor terminal loading' },
      { key: 'deals.delete', label: 'Purge Deals', description: 'Archive or permanently delete deals' },
      { key: 'deals.export', label: 'Export Data', description: 'Export commercial agreements to CSV / briefing' },
    ]
  },
  {
    id: 'negotiation',
    name: 'Negotiation & Live Chat',
    title: 'Negotiation & Live Chat',
    icon: 'negotiation',
    description: 'Direct rate bargaining, counter-offers, and client logistics communication',
    actions: [
      { key: 'negotiation.view', label: 'View Discussions', description: 'Read negotiation threads with industrial consignees' },
      { key: 'negotiation.message', label: 'Send Counter-Offers', description: 'Post freight rates and tariff proposals' },
      { key: 'negotiation.lock', label: 'Lock Negotiation', description: 'Freeze agreed rate and conclude negotiations' },
    ]
  },
  {
    id: 'operations',
    name: 'Corridor Siding & Train Dispatches',
    title: 'Corridor Siding & Train Dispatches',
    icon: 'operations',
    description: 'Field loading at Ewekoro, locomotive consist dispatches, and Moniya destination yard',
    actions: [
      { key: 'ops.manifest_view', label: 'View Manifests', description: 'Access train consist sheets and waybills' },
      { key: 'ops.dispatch', label: 'Dispatch Locomotives', description: 'Clear train departure onto NRC mainline' },
      { key: 'ops.loading_update', label: 'Update Loading', description: 'Log wagon bag counts and seal verification' },
      { key: 'ops.unloading_confirm', label: 'Confirm Yard Arrival', description: 'Sign off train arrival at Moniya yard' },
      { key: 'ops.damage_audit', label: 'Audit Damages', description: 'Record burst bags and calculate consignee deduction' },
      { key: 'ops.gps_telemetry', label: 'Live GPS Telemetry', description: 'Track speed, geofence, and corridor progress' },
    ]
  },
  {
    id: 'fleet',
    name: 'Rolling Stock & Siding Fleet',
    title: 'Rolling Stock & Siding Fleet',
    icon: 'fleet',
    description: '46 Dedicated PXG Covered Hopper Wagons and mainline diesel locomotives',
    actions: [
      { key: 'fleet.view', label: 'View 46 Hopper Fleet', description: 'Check wagon availability, payload, and station' },
      { key: 'fleet.assign', label: 'Assign Wagons', description: 'Allocate specific wagons to a train consist' },
      { key: 'fleet.maintenance', label: 'Log Maintenance', description: 'Report wheel, bogie, or brake inspection flags' },
    ]
  },
  {
    id: 'finance',
    name: 'Double-Entry Accounting & Financial Suite',
    title: 'Double-Entry Accounting & Financial Suite',
    icon: 'finance',
    description: 'General Ledger, Chart of Accounts, Journal Entries, P&L, Balance Sheet, and Requisitions',
    actions: [
      { key: 'finance.coa_view', label: 'View Chart of Accounts', description: 'Inspect 5-tier Assets, Liabilities, Equity, Revenue, OpEx' },
      { key: 'finance.coa_manage', label: 'Manage Accounts', description: 'Add new ledger accounts or modify codes' },
      { key: 'finance.journal_create', label: 'Post Journal Entries', description: 'Create balanced double-entry debits and credits' },
      { key: 'finance.deal_costing', label: 'Write Deal Tariffs', description: 'Set freight tariffs (₦/MT) and OpEx budgets' },
      { key: 'finance.invoices_issue', label: 'Issue Invoices & Debit Notes', description: 'Generate official freight invoices' },
      { key: 'finance.payments_record', label: 'Record Payments', description: 'Log bank receipts against invoices' },
      { key: 'finance.requisitions_approve', label: 'Approve Requisitions', description: 'Sign off operational fund expense requests' },
      { key: 'finance.statements_view', label: 'Financial Statements', description: 'Generate Trial Balance, P&L, and Balance Sheet' },
      { key: 'finance.bank_reconciliation', label: 'Bank Reconciliation', description: 'Reconcile bank accounts with general ledger' },
    ]
  },
  {
    id: 'users',
    name: 'Identity & Access Administration',
    title: 'Identity & Access Administration',
    icon: 'users',
    description: 'Corporate staff directory, client accounts, role assignment, and security credentials',
    actions: [
      { key: 'users.view', label: 'View Directory', description: 'Browse corporate staff and consignee directory' },
      { key: 'users.create', label: 'Provision Users', description: 'Onboard new cargo officers, executives, and clients' },
      { key: 'users.edit', label: 'Edit Profiles', description: 'Update contact details, station, or phone' },
      { key: 'users.reset_pin', label: 'Reset Credentials', description: 'Regenerate security PIN or password' },
      { key: 'users.deactivate', label: 'Deactivate Account', description: 'Revoke access permissions for a user' },
    ]
  },
  {
    id: 'system',
    name: 'Security & System Governance',
    title: 'Security & System Governance',
    icon: 'system',
    description: 'Permissions matrix, audit logs, and production clean resets',
    actions: [
      { key: 'system.permissions_edit', label: 'Edit Permissions Matrix', description: 'Customize granular permissions across all roles' },
      { key: 'system.purge_data', label: 'Production Reset / Purge', description: 'Wipe mock test data for live operation' },
    ]
  }
];

export const DEFAULT_GRANULAR_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    'deals.view', 'deals.create', 'deals.edit', 'deals.approve', 'deals.delete', 'deals.export',
    'negotiation.view', 'negotiation.message', 'negotiation.lock',
    'ops.manifest_view', 'ops.dispatch', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit', 'ops.gps_telemetry',
    'fleet.view', 'fleet.assign', 'fleet.maintenance',
    'finance.coa_view', 'finance.coa_manage', 'finance.journal_create', 'finance.deal_costing', 'finance.invoices_issue', 'finance.payments_record', 'finance.requisitions_approve', 'finance.statements_view', 'finance.bank_reconciliation',
    'users.view', 'users.create', 'users.edit', 'users.reset_pin', 'users.deactivate',
    'system.permissions_edit', 'system.purge_data',
  ],
  CEO: [
    'deals.view', 'deals.create', 'deals.edit', 'deals.approve', 'deals.export',
    'negotiation.view', 'negotiation.message', 'negotiation.lock',
    'ops.manifest_view', 'ops.dispatch', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit', 'ops.gps_telemetry',
    'fleet.view', 'fleet.assign', 'fleet.maintenance',
    'finance.coa_view', 'finance.coa_manage', 'finance.journal_create', 'finance.deal_costing', 'finance.invoices_issue', 'finance.payments_record', 'finance.requisitions_approve', 'finance.statements_view', 'finance.bank_reconciliation',
    'users.view', 'users.create', 'users.edit',
    'system.permissions_edit',
  ],
  MD: [
    'deals.view', 'deals.create', 'deals.edit', 'deals.approve', 'deals.export',
    'negotiation.view', 'negotiation.message', 'negotiation.lock',
    'ops.manifest_view', 'ops.dispatch', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit', 'ops.gps_telemetry',
    'fleet.view', 'fleet.assign', 'fleet.maintenance',
    'finance.coa_view', 'finance.coa_manage', 'finance.journal_create', 'finance.deal_costing', 'finance.invoices_issue', 'finance.payments_record', 'finance.requisitions_approve', 'finance.statements_view', 'finance.bank_reconciliation',
    'users.view', 'users.create', 'users.edit',
    'system.permissions_edit',
  ],
  HEAD_OF_OPERATIONS: [
    'deals.view', 'deals.edit', 'deals.approve', 'deals.export',
    'negotiation.view', 'negotiation.message', 'negotiation.lock',
    'ops.manifest_view', 'ops.dispatch', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit', 'ops.gps_telemetry',
    'fleet.view', 'fleet.assign', 'fleet.maintenance',
    'finance.requisitions_approve', 'finance.invoices_issue',
    'users.view',
  ],
  HEAD_OF_FINANCE: [
    'deals.view', 'deals.export',
    'negotiation.view',
    'ops.manifest_view', 'ops.damage_audit',
    'finance.coa_view', 'finance.coa_manage', 'finance.journal_create', 'finance.deal_costing', 'finance.invoices_issue', 'finance.payments_record', 'finance.requisitions_approve', 'finance.statements_view', 'finance.bank_reconciliation',
    'users.view',
  ],
  ACCOUNTANT: [
    'deals.view', 'deals.export',
    'ops.manifest_view', 'ops.damage_audit',
    'finance.coa_view', 'finance.journal_create', 'finance.deal_costing', 'finance.invoices_issue', 'finance.payments_record', 'finance.requisitions_approve', 'finance.statements_view', 'finance.bank_reconciliation',
    'users.view',
  ],
  CARGO_OFFICER: [
    'deals.view',
    'ops.manifest_view', 'ops.loading_update', 'ops.unloading_confirm', 'ops.damage_audit', 'ops.gps_telemetry',
    'fleet.view', 'fleet.assign',
  ],
  CUSTOMER: [
    'deals.view',
    'negotiation.view', 'negotiation.message',
    'ops.manifest_view', 'ops.gps_telemetry',
    'finance.invoices_issue',
  ],
  CONSIGNEE: [
    'deals.view',
    'negotiation.view', 'negotiation.message',
    'ops.manifest_view', 'ops.gps_telemetry',
    'finance.invoices_issue',
  ],
};

export const StateEngine = new StateEngineService();

