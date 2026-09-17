/**
 * Generates the PHP mirror of the canonical capability registry.
 *
 * The TypeScript registry at apps/web/src/lib/rbac/capabilities.ts is the
 * single source of truth. This emits api/_lib/capabilities.php from it so the
 * server enforces exactly the vocabulary the client renders — the drift that
 * made the old permission matrix unreliable is now impossible to reintroduce
 * without failing CI.
 *
 *   npm run rbac:generate   write the PHP mirror
 *   npm run rbac:check      verify it is current (used by CI)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CAPABILITIES,
  MODULES,
  ROLES,
  ROLE_LABELS,
  EXTERNAL_ROLES,
  DEFAULT_ROLE_CAPABILITIES,
  SENSITIVE_CAPABILITIES,
  resolveTabCapability,
  validateRegistry,
} from '../apps/web/src/lib/rbac/capabilities.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const TARGET = resolve(REPO, 'apps/web/public/api/_lib/capabilities.php');

/** Render a PHP value literal from a JS value. */
function php(value: unknown, indent = 0): string {
  const pad = '    '.repeat(indent);
  const padInner = '    '.repeat(indent + 1);

  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((v) => `${padInner}${php(v, indent + 1)},`).join('\n');
    return `[\n${items}\n${pad}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '[]';
    const items = entries
      .map(([k, v]) => `${padInner}${php(k)} => ${php(v, indent + 1)},`)
      .join('\n');
    return `[\n${items}\n${pad}]`;
  }

  throw new Error(`Cannot render ${typeof value} as PHP`);
}

function build(): string {
  const errors = validateRegistry();
  if (errors.length > 0) {
    throw new Error(`Capability registry is invalid:\n  - ${errors.join('\n  - ')}`);
  }

  // Build the alias map explicitly so PHP does not need the resolver logic.
  const aliasIds = [
    'loading', 'trips', 'in_transit', 'incoming_unload', 'unloading',
    'dispatch', 'funds', 'requisitions', 'wagons', 'history',
  ];
  const aliases: Record<string, string> = {};
  for (const id of aliasIds) {
    const target = resolveTabCapability(id);
    if (target !== id) aliases[id] = target;
  }

  const capabilityMeta: Record<string, { label: string; module: string; kind: string; sensitive: boolean }> = {};
  for (const c of CAPABILITIES) {
    capabilityMeta[c.key] = {
      label: c.label,
      module: c.module,
      kind: c.kind,
      sensitive: Boolean(c.sensitive),
    };
  }

  const roleDefaults: Record<string, string[]> = {};
  for (const r of ROLES) roleDefaults[r] = DEFAULT_ROLE_CAPABILITIES[r];

  return `<?php
/**
 * Bueno Freight OS — Capability registry (GENERATED)
 *
 * Do not edit. Generated from apps/web/src/lib/rbac/capabilities.ts by
 * \`npm run rbac:generate\`. CI fails if this file drifts from the source.
 */

declare(strict_types=1);

// DIRECT ACCESS GUARD — this file defines classes and must never be requested
// over HTTP. .htaccess covers this, but only when AllowOverride permits it, so
// the check is repeated here where no server configuration can disable it.
if (isset(\$_SERVER['SCRIPT_FILENAME']) && realpath(\$_SERVER['SCRIPT_FILENAME']) === realpath(__FILE__)) {
    http_response_code(403);
    exit;
}

final class Capabilities
{
    /** Every capability key the platform understands. */
    public const ALL = ${php(CAPABILITIES.map((c) => c.key), 1)};

    /** Capability metadata, keyed by capability. */
    public const META = ${php(capabilityMeta, 1)};

    /** Capability modules, for grouping in the permissions editor. */
    public const MODULES = ${php(MODULES.map((m) => ({ id: m.id, name: m.name, description: m.description })), 1)};

    /** Roles the platform recognises. */
    public const ROLES = ${php([...ROLES], 1)};

    /** Human-readable role names. */
    public const ROLE_LABELS = ${php(ROLE_LABELS, 1)};

    /** Roles belonging to external clients rather than Bueno staff. */
    public const EXTERNAL_ROLES = ${php([...EXTERNAL_ROLES], 1)};

    /**
     * Capabilities that are destructive or grant privilege escalation.
     * These may never be held by an external role.
     */
    public const SENSITIVE = ${php([...SENSITIVE_CAPABILITIES], 1)};

    /** Portal-local tab ids that map onto a shared capability. */
    public const TAB_ALIASES = ${php(aliases, 1)};

    /** Default capability grant per role. */
    public const DEFAULTS = ${php(roleDefaults, 1)};

    public static function exists(string \$key): bool
    {
        return in_array(\$key, self::ALL, true);
    }

    public static function isSensitive(string \$key): bool
    {
        return in_array(\$key, self::SENSITIVE, true);
    }

    public static function isExternalRole(string \$role): bool
    {
        return in_array(\$role, self::EXTERNAL_ROLES, true);
    }

    public static function resolveTab(string \$tabId): string
    {
        return self::TAB_ALIASES[\$tabId] ?? \$tabId;
    }

    /** @return string[] */
    public static function defaultsFor(string \$role): array
    {
        return self::DEFAULTS[\$role] ?? [];
    }

    /**
     * Merge a stored matrix over the defaults, dropping unknown keys and
     * stripping sensitive capabilities from external roles. Mirrors
     * normalizeMatrix() in the TypeScript registry.
     *
     * @param  mixed \$stored
     * @return array<string,string[]>
     */
    public static function normalizeMatrix(\$stored): array
    {
        \$out    = [];
        \$source = is_array(\$stored) ? \$stored : [];

        foreach (self::ROLES as \$role) {
            \$raw = \$source[\$role] ?? null;
            if (is_array(\$raw)) {
                \$clean = [];
                foreach (\$raw as \$key) {
                    if (is_string(\$key) && self::exists(\$key) && !in_array(\$key, \$clean, true)) {
                        \$clean[] = \$key;
                    }
                }
                \$out[\$role] = \$clean;
            } else {
                \$out[\$role] = self::defaultsFor(\$role);
            }
        }

        foreach (self::EXTERNAL_ROLES as \$role) {
            \$out[\$role] = array_values(array_filter(
                \$out[\$role],
                static fn(\$k) => !self::isSensitive(\$k)
            ));
        }

        return \$out;
    }
}
`;
}

const mode = process.argv[2] ?? 'write';
let output: string;

try {
  output = build();
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}

if (mode === 'check') {
  if (!existsSync(TARGET)) {
    console.error('✗ api/_lib/capabilities.php is missing. Run: npm run rbac:generate');
    process.exit(1);
  }
  const current = readFileSync(TARGET, 'utf8');
  if (current !== output) {
    console.error('✗ api/_lib/capabilities.php is out of date with capabilities.ts.');
    console.error('  Run: npm run rbac:generate');
    process.exit(1);
  }
  console.log(`✓ capabilities.php is in sync (${CAPABILITIES.length} capabilities, ${ROLES.length} roles)`);
  process.exit(0);
}

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, output, 'utf8');
console.log(
  `✓ generated api/_lib/capabilities.php — ${CAPABILITIES.length} capabilities, ${ROLES.length} roles, ${MODULES.length} modules`
);
