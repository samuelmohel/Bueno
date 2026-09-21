/**
 * Stamps the build with the commit it came from.
 *
 * The deploy artifact (apps/web/out) is committed to the repository, so it is
 * easy for the published site to be older than the code — a build that was
 * forgotten, or a cPanel "Update from Remote" that pulled files without
 * running the deployment tasks. Without a stamp there is no way to tell from
 * the outside which version is actually live, which turns "my change did
 * nothing" into guesswork.
 *
 * health.php reports this, so the live commit is visible in a browser.
 *
 * Runs automatically as part of `npm run build`.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// public/ is the source copy the next build carries into out/. out/ is written
// too when it already exists, so re-stamping after a build — rather than
// rebuilding just to correct the recorded commit — updates what is actually
// published. Without this the deployed health check reports the commit before
// the one that was deployed, which is worse than useless when diagnosing
// whether a fix is live.
const SOURCE_STAMP = resolve(REPO, 'apps/web/public/api/build-info.json');
const BUILD_DIR = resolve(REPO, 'apps/web/out');
const BUILT_STAMP = resolve(BUILD_DIR, 'api/build-info.json');

function git(...args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const commit = git('rev-parse', '--short', 'HEAD');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const subject = git('log', '-1', '--pretty=%s');

// A build made from a dirty tree will not match any commit, which is worth
// knowing when the live site does not behave like the repository.
const dirty = git('status', '--porcelain') !== '';

const info = {
  commit: commit || 'unknown',
  branch: branch || 'unknown',
  subject: subject.slice(0, 120) || '',
  builtAt: new Date().toISOString(),
  dirty,
};

function stamp(target: string): void {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, JSON.stringify(info, null, 2) + '\n', 'utf8');
}

stamp(SOURCE_STAMP);

// Only when a build is already present. During a normal `npm run build` this
// runs first and out/ does not exist yet — the build copies public/ across.
if (existsSync(BUILD_DIR)) {
  stamp(BUILT_STAMP);
}

console.log(
  `✓ build stamped ${info.commit}${dirty ? ' (dirty tree)' : ''} on ${info.branch}`
  + (existsSync(BUILD_DIR) ? ' (source and build artifact)' : '')
);
