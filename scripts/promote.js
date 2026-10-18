#!/usr/bin/env node
/* promote.js — the release command for the Troubleshooting Lab.
 *
 * Why this exists: releases used to be a hand copy between a staging pair
 * (staging.html/content-staging.js) that had drifted 134 versions apart, with
 * the cache-buster bumped in several places per push. The sandbox pair was
 * removed 2026-10-18, so a release is now: run every check, bump the version,
 * print the links. Scripting it means the bump can never be forgotten, and
 * every gate runs even for engine-only releases (which have no content to
 * copy). The old copy-and-refuse gate lives in git history.
 *
 * Usage:  node scripts/promote.js [--dry-run] [--v N]
 *   --dry-run   run every check, print what would change, change nothing
 *   --v N       set content.js?v=N instead of incrementing the current value
 *
 * Order of operations:
 *   1. Checks: check_syntax.js, lint_copy.py, the lesson3 regression, and
 *      the tier-prompt gate — all four must pass before anything changes.
 *   2. Bump content.js?v=N in index.html (the one in-repo location of it),
 *      then read the file back to confirm the write.
 *   3. Re-run check_syntax.js on the bumped file.
 *   4. Print the three direct links to update wherever they are shared.
 *
 * Exit: 0 released (or dry-run clean), 1 a check refused, 2 fatal setup.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.dirname(__dirname);
const PROD_HTML = path.join(ROOT, 'index.html');
const BASE_URL = 'https://zzz-creator.github.io/audio-troubleshooting-lab'; // no trailing slash: links must be .../audio-troubleshooting-lab?tier=member&v=N, and /path?query 301s here with the query intact

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const vIdx = args.indexOf('--v');
const VERSION_ARG = vIdx !== -1 ? Number(args[vIdx + 1]) : null;
if (vIdx !== -1 && (!Number.isInteger(VERSION_ARG) || VERSION_ARG <= 0)) {
  console.error('FATAL: --v needs a positive integer, e.g. --v 244');
  process.exit(2);
}

function run(label, cmd, cmdArgs, opts) {
  console.log(`\n--- ${label}`);
  const r = spawnSync(cmd, cmdArgs, Object.assign({ cwd: ROOT, stdio: 'inherit' }, opts || {}));
  if (r.error) { console.error(`FATAL: could not run ${cmd}: ${r.error.message}`); process.exit(2); }
  if (r.status !== 0) {
    console.error(`\nPROMOTE REFUSED: ${label} failed (exit ${r.status}). Nothing was changed.`);
    process.exit(1);
  }
}

const currentMatch = /content\.js\?v=(\d+)/.exec(fs.readFileSync(PROD_HTML, 'utf8'));
if (!currentMatch) { console.error('FATAL: could not find content.js?v=N in index.html'); process.exit(2); }
const currentV = Number(currentMatch[1]);
const targetV = VERSION_ARG !== null ? VERSION_ARG : currentV + 1;
console.log(`version: ${currentV} -> ${targetV}${VERSION_ARG !== null ? ' (set via --v)' : ' (auto-increment)'}`);

// ── 1. Every gate, before anything changes ─────────────────────────────────
run('check_syntax.js', process.execPath, [path.join(ROOT, 'scripts', 'check_syntax.js')]);
run('lint_copy.py (content.js)', process.env.PYTHON_BIN || 'python', [path.join(ROOT, 'scripts', 'lint_copy.py')]);
run('lesson3 regression', process.execPath, [path.join(ROOT, 'scripts', 'check_lesson3_regression.js')]);
run('tier prompt gate', process.execPath, [path.join(ROOT, 'scripts', 'check_tier_prompt.js')]);

if (DRY) {
  console.log(`\nDRY RUN: no files changed. Would set content.js?v=${targetV} in index.html.`);
  console.log(`\nLinks that would need ${targetV}:`);
  console.log(`  cold      ${BASE_URL}?v=${targetV}`);
  console.log(`  member    ${BASE_URL}?tier=member&v=${targetV}`);
  console.log(`  opted-in  ${BASE_URL}?optedin=1&v=${targetV}`);
  process.exit(0);
}

// ── 2. Version bump ────────────────────────────────────────────────────────
const html = fs.readFileSync(PROD_HTML, 'utf8');
const bumped = html.replace(/content\.js\?v=\d+/, `content.js?v=${targetV}`);
if (bumped === html && currentV !== targetV) { console.error('FATAL: version rewrite did not apply'); process.exit(2); }
fs.writeFileSync(PROD_HTML, bumped);
// Read back rather than trusting the write: the bump is this script's only mutation.
const verify = /content\.js\?v=(\d+)/.exec(fs.readFileSync(PROD_HTML, 'utf8'));
if (!verify || Number(verify[1]) !== targetV) { console.error(`FATAL: index.html does not verify at v${targetV}`); process.exit(2); }
console.log(`\n--- index.html now requests content.js?v=${targetV}`);

// ── 3. Post-bump syntax on the file that just changed ──────────────────────
run('check_syntax.js (post-bump)', process.execPath, [path.join(ROOT, 'scripts', 'check_syntax.js')]);

// ── 4. Report ──────────────────────────────────────────────────────────────
console.log(`
RELEASED: index.html now requests content.js?v=${targetV}.
Checks: syntax, copy lint, lesson3 regression, tier prompt gate — all green.

Update ${targetV} in every place these direct links are shared (YouTube descriptions,
email copy, Circle/resource links):

  cold      ${BASE_URL}?v=${targetV}
  member    ${BASE_URL}?tier=member&v=${targetV}
  opted-in  ${BASE_URL}?optedin=1&v=${targetV}

Then commit by name: index.html (plus every other file you changed for this release)`);
