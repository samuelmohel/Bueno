/**
 * Invariants of the capability registry.
 *
 * These guard the properties that, when they broke silently before, produced
 * the dead permission matrix: a role granted a capability that does not exist,
 * an external role holding a destructive one, or a tab whose capability nobody
 * defined.
 *
 *   npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ROLES,
  CAPABILITIES,
  CAPABILITY_KEYS,
  DEFAULT_ROLE_CAPABILITIES,
  EXTERNAL_ROLES,
  SENSITIVE_CAPABILITIES,
  TAB_CAPABILITIES,
  normalizeMatrix,
  capabilitiesForRole,
  resolveTabCapability,
  isKnownCapability,
  validateRegistry,
} from '../../apps/web/src/lib/rbac/capabilities.ts';

test('registry passes its own validation', () => {
  assert.deepEqual(validateRegistry(), []);
});

test('capability keys are unique', () => {
  assert.equal(new Set(CAPABILITY_KEYS).size, CAPABILITY_KEYS.length);
});

test('every role has a default grant and every grant is a real capability', () => {
  for (const role of ROLES) {
    const grants = DEFAULT_ROLE_CAPABILITIES[role];
    assert.ok(Array.isArray(grants), `${role} has no grant list`);
    for (const g of grants) {
      assert.ok(isKnownCapability(g), `${role} grants unknown capability ${g}`);
    }
  }
});

test('ADMIN holds every capability', () => {
  assert.deepEqual(
    [...DEFAULT_ROLE_CAPABILITIES.ADMIN].sort(),
    [...CAPABILITY_KEYS].sort()
  );
});

test('every role can reach its own account screen', () => {
  // notifications.php gates reads on 'account'; a role without it loses its
  // notification feed entirely.
  for (const role of ROLES) {
    assert.ok(
      DEFAULT_ROLE_CAPABILITIES[role].includes('account'),
      `${role} cannot open its own account screen`
    );
  }
});

test('external roles hold no sensitive capability', () => {
  for (const role of EXTERNAL_ROLES) {
    for (const g of DEFAULT_ROLE_CAPABILITIES[role]) {
      assert.ok(
        !SENSITIVE_CAPABILITIES.includes(g),
        `${role} must not hold sensitive capability ${g}`
      );
    }
  }
});

test('consignees cannot issue invoices, only view their own', () => {
  // Both previous matrices granted this; the customer portal only renders
  // invoices, so it was an over-grant that enforcement would have made real.
  for (const role of EXTERNAL_ROLES) {
    const grants = DEFAULT_ROLE_CAPABILITIES[role];
    assert.ok(!grants.includes('finance.invoices_issue'), `${role} must not issue invoices`);
    assert.ok(grants.includes('finance.invoices_view_own'), `${role} should see its own invoices`);
  }
});

test('cargo officers cannot approve deals, reach the user directory, or set pricing', () => {
  const g = DEFAULT_ROLE_CAPABILITIES.CARGO_OFFICER;
  assert.ok(!g.includes('deals.approve'));
  assert.ok(!g.includes('users.view'));
  assert.ok(!g.includes('finance.deal_costing'));
  // but they must be able to do their actual job
  assert.ok(g.includes('ops.loading_update'));
  assert.ok(g.includes('ops.unloading_confirm'));
  assert.ok(g.includes('fleet.assign'));
});

test('only ADMIN may purge production data', () => {
  for (const role of ROLES) {
    const may = DEFAULT_ROLE_CAPABILITIES[role].includes('system.purge_data');
    assert.equal(may, role === 'ADMIN', `${role} purge access should be ${role === 'ADMIN'}`);
  }
});

test('someone can always administer permissions', () => {
  const canAdminister = ROLES.filter(
    (r) =>
      DEFAULT_ROLE_CAPABILITIES[r].includes('permissions') &&
      DEFAULT_ROLE_CAPABILITIES[r].includes('system.permissions_edit')
  );
  assert.ok(canAdminister.length > 0, 'defaults would lock everyone out of the matrix');
});

test('normalizeMatrix drops unknown keys', () => {
  const m = normalizeMatrix({ ADMIN: ['analytics', 'not.a.real.capability'] });
  assert.deepEqual(m.ADMIN, ['analytics']);
});

test('normalizeMatrix strips sensitive capabilities from external roles', () => {
  const m = normalizeMatrix({
    CUSTOMER: ['billing', 'system.purge_data', 'users.deactivate'],
  });
  assert.deepEqual(m.CUSTOMER, ['billing']);
});

test('normalizeMatrix falls back to defaults for a missing role', () => {
  const m = normalizeMatrix({ ADMIN: ['analytics'] });
  assert.deepEqual(m.CARGO_OFFICER, DEFAULT_ROLE_CAPABILITIES.CARGO_OFFICER);
});

test('normalizeMatrix deduplicates', () => {
  const m = normalizeMatrix({ ADMIN: ['analytics', 'analytics', 'deals'] });
  assert.deepEqual(m.ADMIN, ['analytics', 'deals']);
});

test('tab aliases resolve to real capabilities', () => {
  for (const alias of ['loading', 'in_transit', 'incoming_unload', 'wagons', 'funds', 'history']) {
    const target = resolveTabCapability(alias);
    assert.ok(isKnownCapability(target), `${alias} -> ${target} is not a capability`);
  }
  assert.equal(resolveTabCapability('in_transit'), 'deals');
  assert.equal(resolveTabCapability('wagons'), 'fleet');
  // an id that is already a capability resolves to itself
  assert.equal(resolveTabCapability('billing'), 'billing');
});

test('every tab capability is granted to at least one role', () => {
  for (const tab of TAB_CAPABILITIES) {
    const granted = ROLES.some((r) => DEFAULT_ROLE_CAPABILITIES[r].includes(tab.key));
    assert.ok(granted, `no role can open ${tab.key}`);
  }
});

test('capabilitiesForRole returns defaults when no matrix is supplied', () => {
  assert.deepEqual(
    capabilitiesForRole('CARGO_OFFICER'),
    DEFAULT_ROLE_CAPABILITIES.CARGO_OFFICER
  );
});

test('an unknown role gets nothing', () => {
  assert.deepEqual(capabilitiesForRole('DRIVER'), []);
  assert.deepEqual(capabilitiesForRole(''), []);
});

test('every capability belongs to a declared module and has a description', () => {
  for (const c of CAPABILITIES) {
    assert.ok(c.label.length > 0, `${c.key} has no label`);
    assert.ok(c.description.length > 10, `${c.key} has an unhelpfully short description`);
    assert.ok(c.kind === 'tab' || c.kind === 'action');
  }
});
