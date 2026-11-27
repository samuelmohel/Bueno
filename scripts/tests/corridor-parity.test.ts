/**
 * The client and server corridor registries must agree.
 *
 * The gauge rule is enforced on the server (corridor.php) and pre-checked in
 * the browser (corridor.ts) so the deal form can object while someone is
 * still typing. Two copies drift: that is exactly how the codebase ended up
 * with three disagreeing gauge lists, one of which stamped a trip
 * STANDARD_GAUGE for an origin another considered narrow.
 *
 *   npx tsx --test scripts/tests/corridor-parity.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TERMINALS, checkRoute } from '../../apps/web/src/lib/corridor';

const PHP_PATH = join(
  __dirname,
  '..',
  '..',
  'apps',
  'web',
  'public',
  'api',
  '_lib',
  'corridor.php'
);

/** Pull the TERMINALS table out of the PHP source. */
function phpTerminals(): Record<string, string> {
  const src = readFileSync(PHP_PATH, 'utf8');

  const start = src.indexOf('public const TERMINALS');
  assert.ok(start !== -1, 'corridor.php no longer declares a TERMINALS constant');

  const end = src.indexOf('];', start);
  assert.ok(end !== -1, 'could not find the end of the TERMINALS constant');

  const block = src.slice(start, end);
  const out: Record<string, string> = {};

  // 'EWK'  => ['Ewekoro Terminal', self::NARROW],
  const row = /'([A-Z0-9]+)'\s*=>\s*\[\s*'([^']*)'\s*,\s*self::(NARROW|STANDARD)\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = row.exec(block)) !== null) {
    out[m[1]] = `${m[3]}_GAUGE`;
  }

  return out;
}

test('every server terminal exists on the client with the same gauge', () => {
  const php = phpTerminals();
  assert.ok(Object.keys(php).length > 0, 'parsed no terminals out of corridor.php');

  for (const [code, gauge] of Object.entries(php)) {
    const client = TERMINALS[code];
    assert.ok(client, `${code} is in corridor.php but missing from corridor.ts`);
    assert.equal(
      client.gauge,
      gauge,
      `${code} is ${gauge} on the server but ${client.gauge} in the browser`
    );
  }
});

test('the client declares no terminal the server does not know', () => {
  const php = phpTerminals();

  for (const code of Object.keys(TERMINALS)) {
    assert.ok(
      php[code],
      `${code} is in corridor.ts but missing from corridor.php — the browser ` +
        'would accept a route the server then refuses'
    );
  }
});

test('a cross-gauge route is refused', () => {
  const r = checkRoute('EWK', 'MNY'); // narrow -> standard
  assert.equal(r.ok, false);
  assert.match(String(r.reason), /gauge incompatibility/i);
});

test('a same-gauge route is allowed and reports its gauge', () => {
  const standard = checkRoute('PAPA', 'MNY');
  assert.equal(standard.ok, true);
  assert.equal(standard.gauge, 'STANDARD_GAUGE');

  const narrow = checkRoute('EWK', 'DGB');
  assert.equal(narrow.ok, true);
  assert.equal(narrow.gauge, 'NARROW_GAUGE');
});

test('an unknown terminal is refused rather than assumed compatible', () => {
  // Apapa passed the old browser check purely by being in neither gauge set.
  const r = checkRoute('ZZZ', 'MNY');
  assert.equal(r.ok, false);
  assert.match(String(r.reason), /not a terminal/i);
});

test('a route to the same terminal is refused', () => {
  const r = checkRoute('MNY', 'MNY');
  assert.equal(r.ok, false);
});

test('an incomplete route is not judged', () => {
  assert.equal(checkRoute('', 'MNY').ok, true);
  assert.equal(checkRoute('PAPA', '').ok, true);
});
