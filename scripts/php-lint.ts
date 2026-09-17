/**
 * Syntax-checks every PHP file in the API.
 *
 * The PHP layer is the actual backend, but CI previously typechecked the
 * unused NestJS app and never looked at it. A syntax error here takes the
 * whole platform down on deploy, with no build step to catch it.
 *
 *   npm run php:lint
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_DIR = join(ROOT, 'apps/web/public/api');

function findPhpBinary(): string {
  const explicit = process.env.PHP_BIN;
  if (explicit && existsSync(explicit)) return explicit;

  const candidates = [
    'php',
    join(
      process.env.LOCALAPPDATA ?? '',
      'Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/php.exe'
    ),
  ].filter(Boolean);

  for (const c of candidates) {
    const probe = spawnSync(c, ['-v'], { encoding: 'utf8' });
    if (probe.status === 0) return c;
  }

  console.error(
    '✗ php not found on PATH. Install PHP 8.1+ or set PHP_BIN to the executable.'
  );
  process.exit(1);
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (entry.endsWith('.php')) {
      yield full;
    }
  }
}

const php = findPhpBinary();

if (!existsSync(API_DIR)) {
  console.error(`✗ API directory not found at ${API_DIR}`);
  process.exit(1);
}

const files = [...walk(API_DIR)].sort();
let failed = 0;

for (const file of files) {
  const result = spawnSync(php, ['-l', file], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  if (result.status !== 0 || !output.includes('No syntax errors')) {
    failed++;
    console.error(`✗ ${relative(ROOT, file)}`);
    console.error(
      output
        .split('\n')
        .filter((l) => l.trim())
        .map((l) => `    ${l}`)
        .join('\n')
    );
  }
}

const version = spawnSync(php, ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8' }).stdout?.trim();

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} PHP file(s) failed to parse (PHP ${version}).`);
  process.exit(1);
}

console.log(`✓ ${files.length} PHP files parse cleanly (PHP ${version})`);
