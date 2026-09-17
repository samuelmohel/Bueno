/**
 * BUENO FREIGHT OS — CANONICAL CAPABILITY REGISTRY
 *
 * This file is the single source of truth for authorization across the whole
 * platform. The PHP mirror at api/_lib/capabilities.php is GENERATED from it
 * by `npm run rbac:generate`; never edit that file by hand.
 *
 * It replaces nine previously competing definitions:
 *   TAB_TO_CAPABILITY, TAB_ALIASES, TAB_REGISTRY, UNIFIED_PERMISSION_LIST,
 *   GRANULAR_MODULE_PERMISSIONS, DEFAULT_ROLE_TAB_PERMISSIONS,
 *   DEFAULT_GRANULAR_ROLE_PERMISSIONS, and $ALL_CAPABILITIES /
 *   $DEFAULT_PERMISSIONS in permissions.php.
 *
 * There is now ONE vocabulary and ONE matrix. Screen access is simply a
 * capability of kind 'tab'; there is no separate "granular" matrix to drift
 * out of sync with the coarse one.
 */

// ─── Roles ───────────────────────────────────────────────────────────────────

export const ROLES = [
  'ADMIN',
  'CEO',
  'MD',
  'HEAD_OF_OPERATIONS',
  'HEAD_OF_FINANCE',
  'ACCOUNTANT',
  'CARGO_OFFICER',
  'CUSTOMER',
  'CONSIGNEE',
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  CEO: 'Managing Director / CEO',
  MD: 'Managing Director',
  HEAD_OF_OPERATIONS: 'Head of Operations',
  HEAD_OF_FINANCE: 'Head of Finance / Treasurer',
  ACCOUNTANT: 'Accountant',
  CARGO_OFFICER: 'Cargo Officer',
  CUSTOMER: 'Industrial Consignee',
  CONSIGNEE: 'Industrial Consignee',
};

/** Roles whose users are external clients rather than Bueno staff. */
export const EXTERNAL_ROLES: readonly Role[] = ['CUSTOMER', 'CONSIGNEE'];

export function isExternalRole(role: string): boolean {
  return (EXTERNAL_ROLES as readonly string[]).includes(role);
}

// ─── Modules ─────────────────────────────────────────────────────────────────

export const MODULES = [
  { id: 'screens', name: 'Screen & Tab Access', description: 'Which areas of the platform a role may open' },
  { id: 'commercial', name: 'Commercial & Deals Desk', description: 'Contracts, spot rates, and customer agreements' },
  { id: 'negotiation', name: 'Negotiation & Live Chat', description: 'Rate bargaining and client communication' },
  { id: 'operations', name: 'Corridor Siding & Train Dispatch', description: 'Loading, dispatch, arrival, and damage audit' },
  { id: 'fleet', name: 'Rolling Stock & Siding Fleet', description: 'Wagons and mainline locomotives' },
  { id: 'finance', name: 'Accounting & Financial Suite', description: 'Ledger, invoices, requisitions, and statements' },
  { id: 'users', name: 'Identity & Access Administration', description: 'Staff directory and credentials' },
  { id: 'system', name: 'Security & System Governance', description: 'Permissions matrix, audit log, and data resets' },
] as const;

export type ModuleId = (typeof MODULES)[number]['id'];

// ─── Capabilities ────────────────────────────────────────────────────────────

export interface Capability {
  key: string;
  label: string;
  description: string;
  module: ModuleId;
  kind: 'tab' | 'action';
  /**
   * Marks a capability whose misuse is materially destructive or grants
   * privilege escalation. These can never be granted to an external role, and
   * the UI flags them.
   */
  sensitive?: boolean;
}

export const CAPABILITIES: readonly Capability[] = [
  // ── Screen & tab access ───────────────────────────────────────────────────
  { key: 'analytics', kind: 'tab', module: 'screens', label: 'Executive Reports & Analytics', description: 'Open executive KPI dashboards, corridor audit trails, and revenue statistics' },
  { key: 'deals', kind: 'tab', module: 'screens', label: 'Commercial Deals Desk', description: 'Open active contracts, spot deals, and freight tranche dispatches' },
  { key: 'negotiations', kind: 'tab', module: 'screens', label: 'Client Negotiations Chat', description: 'Open the live contract negotiation channel' },
  { key: 'fund_requisitions', kind: 'tab', module: 'screens', label: 'Fund Requisitions & Expenses', description: 'Open field operational expense requests and approval queues' },
  { key: 'fleet', kind: 'tab', module: 'screens', label: 'Fleet & Rolling Stock', description: 'Open the wagon and locomotive registry' },
  { key: 'terminal_info', kind: 'tab', module: 'screens', label: 'Terminal Information Ledger', description: 'Open the station sidings ledger (EWK, PAPA, MNY, APT)' },
  { key: 'moniya', kind: 'tab', module: 'screens', label: 'Moniya Container Terminal', description: 'Open the container stacking yard and gate tariff control' },
  { key: 'telemetry', kind: 'tab', module: 'screens', label: 'Fleet Telemetry & Live GPS', description: 'Open live corridor GPS tracking' },
  { key: 'manifest', kind: 'tab', module: 'screens', label: 'Cargo Manifests & Waybills', description: 'Open train consist manifests and NRC waybills' },
  { key: 'billing', kind: 'tab', module: 'screens', label: 'Invoices & Ledger', description: 'Open accounts receivable and the general ledger' },
  { key: 'users', kind: 'tab', module: 'screens', label: 'User Directory', description: 'Open the staff and consignee directory' },
  { key: 'permissions', kind: 'tab', module: 'screens', label: 'Permissions Matrix', description: 'Open the security governance and role permissions editor' },
  { key: 'account', kind: 'tab', module: 'screens', label: 'Corporate Account Settings', description: 'Open own organisation profile and contact settings' },

  // ── Commercial ────────────────────────────────────────────────────────────
  { key: 'deals.view', kind: 'action', module: 'commercial', label: 'View Deals', description: 'Inspect active commercial contracts and backlog' },
  { key: 'deals.create', kind: 'action', module: 'commercial', label: 'Create Deals', description: 'Create spot-run or master multi-trip contracts' },
  { key: 'deals.edit', kind: 'action', module: 'commercial', label: 'Edit Deals', description: 'Modify contract volumes, pricing, or consignee notes' },
  { key: 'deals.approve', kind: 'action', module: 'commercial', label: 'Approve Deals', description: 'Authorize deals to proceed to corridor terminal loading' },
  { key: 'deals.delete', kind: 'action', module: 'commercial', label: 'Purge Deals', description: 'Archive or permanently delete commercial deals', sensitive: true },
  { key: 'deals.export', kind: 'action', module: 'commercial', label: 'Export Deal Data', description: 'Export commercial agreements to CSV or briefing pack' },

  // ── Negotiation ───────────────────────────────────────────────────────────
  { key: 'negotiation.view', kind: 'action', module: 'negotiation', label: 'View Discussions', description: 'Read negotiation threads with industrial consignees' },
  { key: 'negotiation.message', kind: 'action', module: 'negotiation', label: 'Send Counter-Offers', description: 'Post freight rates and tariff proposals' },
  { key: 'negotiation.lock', kind: 'action', module: 'negotiation', label: 'Lock Negotiation', description: 'Freeze an agreed rate and conclude negotiations' },

  // ── Corridor operations ───────────────────────────────────────────────────
  { key: 'ops.manifest_view', kind: 'action', module: 'operations', label: 'View Manifests', description: 'Access train consist sheets and waybills' },
  { key: 'ops.dispatch', kind: 'action', module: 'operations', label: 'Dispatch Locomotives', description: 'Clear train departure onto the NRC mainline corridor' },
  { key: 'ops.loading_update', kind: 'action', module: 'operations', label: 'Update Loading', description: 'Log wagon bag counts, feeder trucks, and tamper seal numbers' },
  { key: 'ops.unloading_confirm', kind: 'action', module: 'operations', label: 'Confirm Yard Arrival', description: 'Sign off train arrival and authorize cargo discharge' },
  { key: 'ops.damage_audit', kind: 'action', module: 'operations', label: 'Audit Damages', description: 'Record burst bags and calculate consignee deductions' },
  { key: 'ops.gps_telemetry', kind: 'action', module: 'operations', label: 'Live GPS Telemetry', description: 'Track speed, geofence, and corridor progress' },

  // ── Fleet ─────────────────────────────────────────────────────────────────
  { key: 'fleet.view', kind: 'action', module: 'fleet', label: 'View Fleet', description: 'Check wagon availability, payload, and station' },
  { key: 'fleet.assign', kind: 'action', module: 'fleet', label: 'Assign Wagons', description: 'Allocate specific wagons to a train consist' },
  { key: 'fleet.maintenance', kind: 'action', module: 'fleet', label: 'Log Maintenance', description: 'Report wheel, bogie, or brake inspection flags' },
  { key: 'fleet.register', kind: 'action', module: 'fleet', label: 'Register Rolling Stock', description: 'Add or retire wagons from the official fleet registry', sensitive: true },

  // ── Finance ───────────────────────────────────────────────────────────────
  { key: 'finance.coa_view', kind: 'action', module: 'finance', label: 'View Chart of Accounts', description: 'Inspect assets, liabilities, equity, revenue, and expenses' },
  { key: 'finance.coa_manage', kind: 'action', module: 'finance', label: 'Manage Accounts', description: 'Add ledger accounts or modify account codes' },
  { key: 'finance.journal_create', kind: 'action', module: 'finance', label: 'Post Journal Entries', description: 'Create balanced double-entry debits and credits' },
  { key: 'finance.deal_costing', kind: 'action', module: 'finance', label: 'Set Freight Tariffs', description: 'Write freight tariffs and operating expense budgets' },
  { key: 'finance.invoices_issue', kind: 'action', module: 'finance', label: 'Issue Invoices', description: 'Generate official VAT/WHT-compliant freight tax invoices' },
  { key: 'finance.invoices_view_own', kind: 'action', module: 'finance', label: 'View Own Invoices', description: 'View invoices issued to the signed-in organisation only' },
  { key: 'finance.payments_record', kind: 'action', module: 'finance', label: 'Record Payments', description: 'Log bank receipts against outstanding freight billings' },
  { key: 'finance.requisitions_submit', kind: 'action', module: 'finance', label: 'Submit Requisitions', description: 'Raise station fund requests for diesel, escorts, and stevedoring' },
  { key: 'finance.requisitions_approve', kind: 'action', module: 'finance', label: 'Approve Requisitions', description: 'Sign off operational fund expense requests' },
  { key: 'finance.requisitions_disburse', kind: 'action', module: 'finance', label: 'Disburse Funds', description: 'Release payment against an approved requisition', sensitive: true },
  { key: 'finance.statements_view', kind: 'action', module: 'finance', label: 'Financial Statements', description: 'Generate trial balance, P&L, and balance sheet' },
  { key: 'finance.bank_reconciliation', kind: 'action', module: 'finance', label: 'Bank Reconciliation', description: 'Reconcile bank accounts against the general ledger' },

  // ── Identity ──────────────────────────────────────────────────────────────
  { key: 'users.view', kind: 'action', module: 'users', label: 'View Directory', description: 'Browse the corporate staff and consignee directory' },
  { key: 'users.create', kind: 'action', module: 'users', label: 'Provision Users', description: 'Onboard cargo officers, executives, and client accounts' },
  { key: 'users.edit', kind: 'action', module: 'users', label: 'Edit Profiles', description: 'Update contact details, station, or phone number' },
  { key: 'users.reset_credentials', kind: 'action', module: 'users', label: 'Reset Credentials', description: 'Force a password or PIN reset for another user', sensitive: true },
  { key: 'users.deactivate', kind: 'action', module: 'users', label: 'Deactivate Account', description: 'Revoke a user’s access to the platform', sensitive: true },

  // ── System governance ─────────────────────────────────────────────────────
  { key: 'system.permissions_edit', kind: 'action', module: 'system', label: 'Edit Permissions Matrix', description: 'Change what every role in the platform may do', sensitive: true },
  { key: 'system.audit_view', kind: 'action', module: 'system', label: 'View Audit Log', description: 'Read the tamper-evident record of privileged actions' },
  { key: 'system.purge_data', kind: 'action', module: 'system', label: 'Production Reset / Purge', description: 'Irreversibly delete operational records', sensitive: true },
];

export const CAPABILITY_KEYS: readonly string[] = CAPABILITIES.map((c) => c.key);

const CAPABILITY_BY_KEY = new Map(CAPABILITIES.map((c) => [c.key, c]));

export function getCapability(key: string): Capability | undefined {
  return CAPABILITY_BY_KEY.get(key);
}

export function isKnownCapability(key: string): boolean {
  return CAPABILITY_BY_KEY.has(key);
}

export const TAB_CAPABILITIES: readonly Capability[] = CAPABILITIES.filter((c) => c.kind === 'tab');

export const SENSITIVE_CAPABILITIES: readonly string[] = CAPABILITIES
  .filter((c) => c.sensitive)
  .map((c) => c.key);

// ─── Tab alias resolution ────────────────────────────────────────────────────

/**
 * Portal-local tab ids that are views onto a single underlying capability.
 * The Cargo Officer portal, for example, splits the 'deals' capability across
 * several screens (loading, in_transit, incoming_unload).
 *
 * Anything absent here resolves to itself, so a new tab whose id matches its
 * capability needs no entry at all.
 */
const TAB_ALIAS_TO_CAPABILITY: Record<string, string> = {
  loading: 'deals',
  trips: 'deals',
  in_transit: 'deals',
  incoming_unload: 'deals',
  unloading: 'deals',
  dispatch: 'deals',
  funds: 'fund_requisitions',
  requisitions: 'fund_requisitions',
  wagons: 'fleet',
  history: 'manifest',
};

export function resolveTabCapability(tabId: string): string {
  return TAB_ALIAS_TO_CAPABILITY[tabId] ?? tabId;
}

// ─── Default role grants ─────────────────────────────────────────────────────

const ALL_CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key);

/** Every capability except the ones reserved for platform administrators. */
const EXECUTIVE_GRANT = ALL_CAPABILITY_KEYS.filter(
  (k) => k !== 'system.purge_data'
);

const OPERATIONS_GRANT = [
  'analytics', 'deals', 'negotiations', 'fund_requisitions', 'fleet',
  'terminal_info', 'moniya', 'telemetry', 'manifest', 'account',
  'deals.view', 'deals.edit', 'deals.approve', 'deals.export',
  'negotiation.view', 'negotiation.message', 'negotiation.lock',
  'ops.manifest_view', 'ops.dispatch', 'ops.loading_update',
  'ops.unloading_confirm', 'ops.damage_audit', 'ops.gps_telemetry',
  'fleet.view', 'fleet.assign', 'fleet.maintenance', 'fleet.register',
  'finance.requisitions_submit', 'finance.requisitions_approve',
  'users.view',
  'system.audit_view',
];

const FINANCE_GRANT = [
  'analytics', 'deals', 'negotiations', 'fund_requisitions', 'billing', 'manifest', 'account',
  'deals.view', 'deals.export',
  'negotiation.view',
  'ops.manifest_view', 'ops.damage_audit',
  'finance.coa_view', 'finance.coa_manage', 'finance.journal_create',
  'finance.deal_costing', 'finance.invoices_issue', 'finance.payments_record',
  'finance.requisitions_approve', 'finance.requisitions_disburse',
  'finance.statements_view', 'finance.bank_reconciliation',
  'users.view',
  'system.audit_view',
];

const ACCOUNTANT_GRANT = FINANCE_GRANT.filter(
  (k) => k !== 'finance.coa_manage' && k !== 'finance.requisitions_disburse'
);

const CARGO_OFFICER_GRANT = [
  'deals', 'fleet', 'terminal_info', 'moniya', 'telemetry', 'manifest', 'fund_requisitions', 'account',
  'deals.view',
  'ops.manifest_view', 'ops.loading_update', 'ops.unloading_confirm',
  'ops.damage_audit', 'ops.gps_telemetry',
  'fleet.view', 'fleet.assign', 'fleet.maintenance',
  'finance.requisitions_submit',
];

/**
 * External consignees.
 *
 * Note: both previous matrices granted CUSTOMER and CONSIGNEE
 * 'finance.invoices_issue'. The customer portal only ever *renders* an
 * invoice, never creates one, so that grant was an over-permission that would
 * have become exploitable the moment enforcement went server-side. It is
 * replaced here by the read-only, self-scoped 'finance.invoices_view_own'.
 */
const CONSIGNEE_GRANT = [
  'negotiations', 'telemetry', 'manifest', 'billing', 'account',
  'deals.view',
  'negotiation.view', 'negotiation.message',
  'ops.manifest_view', 'ops.gps_telemetry',
  'finance.invoices_view_own',
];

export const DEFAULT_ROLE_CAPABILITIES: Record<Role, string[]> = {
  ADMIN: [...ALL_CAPABILITY_KEYS],
  CEO: [...EXECUTIVE_GRANT],
  MD: [...EXECUTIVE_GRANT],
  HEAD_OF_OPERATIONS: [...OPERATIONS_GRANT],
  HEAD_OF_FINANCE: [...FINANCE_GRANT],
  ACCOUNTANT: [...ACCOUNTANT_GRANT],
  CARGO_OFFICER: [...CARGO_OFFICER_GRANT],
  CUSTOMER: [...CONSIGNEE_GRANT],
  CONSIGNEE: [...CONSIGNEE_GRANT],
};

// ─── Invariants ──────────────────────────────────────────────────────────────

/**
 * Validate the registry. Called by the generator and by the test suite so a
 * typo in a grant list fails the build rather than silently removing access.
 */
export function validateRegistry(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const cap of CAPABILITIES) {
    if (seen.has(cap.key)) errors.push(`Duplicate capability key: ${cap.key}`);
    seen.add(cap.key);
    if (!MODULES.some((m) => m.id === cap.module)) {
      errors.push(`Capability ${cap.key} references unknown module ${cap.module}`);
    }
  }

  for (const [role, grants] of Object.entries(DEFAULT_ROLE_CAPABILITIES)) {
    const dupes = grants.filter((g, i) => grants.indexOf(g) !== i);
    if (dupes.length) errors.push(`Role ${role} lists duplicate grants: ${[...new Set(dupes)].join(', ')}`);
    for (const g of grants) {
      if (!seen.has(g)) errors.push(`Role ${role} grants unknown capability: ${g}`);
    }
  }

  for (const role of EXTERNAL_ROLES) {
    for (const g of DEFAULT_ROLE_CAPABILITIES[role]) {
      if (SENSITIVE_CAPABILITIES.includes(g)) {
        errors.push(`External role ${role} must not be granted sensitive capability ${g}`);
      }
    }
  }

  for (const target of Object.values(TAB_ALIAS_TO_CAPABILITY)) {
    if (!seen.has(target)) errors.push(`Tab alias resolves to unknown capability: ${target}`);
  }

  for (const role of ROLES) {
    if (!DEFAULT_ROLE_CAPABILITIES[role]) errors.push(`Role ${role} has no default grant list`);
  }

  return errors;
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

export type PermissionMatrix = Record<string, string[]>;

/**
 * Merge a stored matrix over the defaults.
 *
 * A role missing from storage falls back to its defaults; unknown capability
 * keys in storage are dropped rather than trusted, so a stale or tampered
 * matrix cannot grant something the registry does not define.
 */
export function normalizeMatrix(stored: unknown): PermissionMatrix {
  const out: PermissionMatrix = {};
  const source = (stored && typeof stored === 'object') ? stored as Record<string, unknown> : {};

  for (const role of ROLES) {
    const raw = source[role];
    if (Array.isArray(raw)) {
      const cleaned = raw.filter((k): k is string => typeof k === 'string' && isKnownCapability(k));
      out[role] = Array.from(new Set(cleaned));
    } else {
      out[role] = [...DEFAULT_ROLE_CAPABILITIES[role]];
    }
  }

  // An external role can never hold a sensitive capability, whatever the
  // stored matrix says.
  for (const role of EXTERNAL_ROLES) {
    out[role] = out[role].filter((k) => !SENSITIVE_CAPABILITIES.includes(k));
  }

  return out;
}

/** Resolve the effective capability set for a role. */
export function capabilitiesForRole(role: string, matrix?: PermissionMatrix): string[] {
  const m = matrix ?? normalizeMatrix(undefined);
  return m[role] ?? DEFAULT_ROLE_CAPABILITIES[role as Role] ?? [];
}
