/**
 * The record-diff used to decide what to send back to the server.
 *
 * This is the defect behind "That deal was changed by someone else. Reload
 * before saving again." appearing when registering a brand-new deal:
 *
 *   MySQL returns VARCHAR and DECIMAL columns as strings, so a quantity the
 *   browser wrote as 2000 comes back as "2000" and a tonnage as "2000.00".
 *   A strict !== therefore reported every already-saved record as edited.
 *
 *   saveAll resends whatever it thinks changed, so adding one deal resent all
 *   the others too — each carrying the version from whichever React snapshot
 *   the caller held. Those go stale within one twelve-second poll, the server
 *   refused them as conflicts, and the resync that follows a failure wiped the
 *   new deal off the screen.
 *
 * Unit-tested rather than exercised through the API, because the fault is
 * entirely in the browser's idea of what changed.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rowsDiffer, sameValue } from '../../apps/web/src/lib/services/recordDiff';

test('a number and its stored text form are the same value', () => {
  assert.equal(sameValue(2000, '2000'), true);
  assert.equal(sameValue('2000', 2000), true);
});

test('a DECIMAL column keeps its scale without becoming a different value', () => {
  assert.equal(sameValue(2000, '2000.00'), true);
  assert.equal(sameValue(12500.5, '12500.50'), true);
});

test('absent, null and undefined all mean no value', () => {
  assert.equal(sameValue(null, undefined), true);
  assert.equal(sameValue(undefined, null), true);
});

test('genuinely different values are still different', () => {
  assert.equal(sameValue(2000, 2001), false);
  assert.equal(sameValue('APPROVED', 'CANCELLED'), false);
  assert.equal(sameValue(null, 0), false);
  assert.equal(sameValue('', 'x'), false);
});

test('a deal returned by the server does not look edited', () => {
  // What the browser built.
  const sent = {
    id: 'DEAL-49317',
    company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
    quantity: 2000,
    totalPlannedTrips: 10,
    trancheTonnage: 200,
    status: 'APPROVED',
  };

  // The same row after a round trip through MySQL.
  const returned = {
    id: 'DEAL-49317',
    company: 'HUAXIN BUILDING MATERIALS NIG PLC (HBM)',
    quantity: '2000',
    totalPlannedTrips: 10,
    trancheTonnage: '200.00',
    status: 'APPROVED',
    version: 1,
    updated_at: '2026-09-24T09:00:00Z',
    createdAt: '2026-09-24T09:00:00Z',
  };

  assert.equal(
    rowsDiffer(returned, sent),
    false,
    'a saved deal must not be resent merely because MySQL returned it as text'
  );
});

test('a real edit is still detected', () => {
  const stored = { id: 'DEAL-1', quantity: '2000', status: 'APPROVED', version: 3 };
  const edited = { id: 'DEAL-1', quantity: 2000, status: 'CANCELLED', version: 3 };
  assert.equal(rowsDiffer(stored, edited), true);
});

test('the server bumping version is not a user edit', () => {
  const before = { id: 'DEAL-1', quantity: '2000', version: 3, updated_at: 'a' };
  const after = { id: 'DEAL-1', quantity: '2000', version: 9, updated_at: 'b' };
  assert.equal(rowsDiffer(before, after), false);
});

test('nested structures are still compared', () => {
  const a = { id: 'X', damageDetails: [{ wagonId: 'W1', burstBags: 2 }] };
  const b = { id: 'X', damageDetails: [{ wagonId: 'W1', burstBags: 5 }] };
  assert.equal(rowsDiffer(a, b), true);
  assert.equal(rowsDiffer(a, { id: 'X', damageDetails: [{ wagonId: 'W1', burstBags: 2 }] }), false);
});
