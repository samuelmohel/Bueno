/**
 * BUENO FREIGHT OS — UI VIEWS OVER THE CAPABILITY REGISTRY
 *
 * The permissions editor needs the capability list grouped a few different
 * ways. Those groupings used to be six separately maintained constants that
 * drifted apart — TAB_REGISTRY was missing `terminal_info`, and
 * GRANULAR_MODULE_PERMISSIONS described 34 actions that the enforcement code
 * never consulted.
 *
 * They are now derived from the single registry, so a capability added there
 * appears in every view automatically and none of them can go stale.
 */

import {
  CAPABILITIES,
  MODULES,
  ROLES,
  DEFAULT_ROLE_CAPABILITIES,
  type Capability,
  type ModuleId,
  type Role,
} from './capabilities';

// ─── Tabs ────────────────────────────────────────────────────────────────────

export interface TabRegistryEntry {
  key: string;
  label: string;
  category: string;
}

/** Human-facing grouping for the tab list in the permissions editor. */
const TAB_CATEGORY: Record<string, string> = {
  analytics: 'Executive',
  billing: 'Finance',
  fund_requisitions: 'Finance',
  deals: 'Commercial',
  negotiations: 'Commercial',
  account: 'Commercial',
  fleet: 'Operations',
  telemetry: 'Operations',
  manifest: 'Operations',
  moniya: 'Operations',
  terminal_info: 'Operations',
  users: 'Administration',
  permissions: 'Administration',
};

export const TAB_REGISTRY: TabRegistryEntry[] = CAPABILITIES
  .filter((c) => c.kind === 'tab')
  .map((c) => ({
    key: c.key,
    label: c.label,
    category: TAB_CATEGORY[c.key] ?? 'Other',
  }));

// ─── Flat permission list ────────────────────────────────────────────────────

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  category: string;
  sensitive: boolean;
}

const MODULE_CATEGORY: Record<ModuleId, string> = {
  screens: 'Screen & Tab Access',
  commercial: 'Commercial & Deals',
  negotiation: 'Commercial & Deals',
  operations: 'Corridor Operations',
  fleet: 'Corridor Operations',
  finance: 'Finance & Accounting',
  users: 'Administration',
  system: 'Administration',
};

export const UNIFIED_PERMISSION_LIST: PermissionDefinition[] = CAPABILITIES.map((c) => ({
  key: c.key,
  label: c.label,
  description: c.description,
  category: MODULE_CATEGORY[c.module],
  sensitive: Boolean(c.sensitive),
}));

/** Category order for rendering, so the editor is stable between reloads. */
export const PERMISSION_CATEGORIES: string[] = Array.from(
  new Set(UNIFIED_PERMISSION_LIST.map((p) => p.category))
);

// ─── Module-grouped view ─────────────────────────────────────────────────────

export interface GranularPermissionAction {
  key: string;
  label: string;
  description: string;
  sensitive: boolean;
}

export interface GranularPermissionModule {
  id: ModuleId;
  name: string;
  title: string;
  icon: string;
  description: string;
  actions: GranularPermissionAction[];
}

export const GRANULAR_MODULE_PERMISSIONS: GranularPermissionModule[] = MODULES.map((m) => ({
  id: m.id,
  name: m.name,
  title: m.name,
  icon: m.id,
  description: m.description,
  actions: CAPABILITIES
    .filter((c: Capability) => c.module === m.id)
    .map((c) => ({
      key: c.key,
      label: c.label,
      description: c.description,
      sensitive: Boolean(c.sensitive),
    })),
})).filter((m) => m.actions.length > 0);

// ─── Legacy aliases ──────────────────────────────────────────────────────────
//
// There is now one matrix, so both former names resolve to the same defaults.
// Kept so existing call sites compile; new code should use the registry.

export const DEFAULT_ROLE_TAB_PERMISSIONS: Record<string, string[]> = DEFAULT_ROLE_CAPABILITIES;
export const DEFAULT_GRANULAR_ROLE_PERMISSIONS: Record<string, string[]> = DEFAULT_ROLE_CAPABILITIES;

/**
 * Previously a hand-maintained map of tab id to the capabilities that would
 * satisfy it. Now derived: a tab is satisfied by its own capability.
 */
export const TAB_ALIASES: Record<string, string[]> = Object.fromEntries(
  CAPABILITIES.filter((c) => c.kind === 'tab').map((c) => [c.key, [c.key]])
);

export { ROLES, type Role };
