#!/usr/bin/env node
/* promote.js — the only sanctioned way to move content into production.
 *
 * Why this exists: staging.html/content-staging.js and index.html/content.js
 * were kept in sync by hand, and the pair drifted 134 versions apart with the
 * cache-buster bumped in several places per push. One forgotten bump ships a
 * stale shell; one copy in the wrong direction reverts shipped fixes. This
 * script makes the dangerous act gated and mechanical.
 *
 * Usage:  node scripts/promote.js [--dry-run] [--v N]
 *   --dry-run   run every gate, print what would change, change nothing
 *   --v N       set content.js?v=N instead of incrementing the current value
 *
 * Order of operations:
 *   1. REGRESSION GATE  git diff --no-index content.js content-staging.js —
 *      refuses if production holds any line staging lacks (a wrong-direction
 *      copy already happened somewhere), and refuses when there is nothing to
 *      promote. The subset property is what makes the copy safe.
 *   2. Preflight checks on the staging pair: check_syntax.js (both HTMLs),
 *      lint_copy.py (staging content), lesson3 regression (staging pair).
 *   3. Copy content-staging.js -> content.js, set the version in index.html
 *      (the one in-repo location of content.js?v=N).
 *   4. Post-check: lesson3 regression against the SHIPPING pair (index.html +
 *      the freshly promoted content.js), because the two engines differ.
 *   5. Print the direct links to update wherever they are shared.
 *
 * Exit: 0 promoted (or dry-run clean), 1 a gate/check refused, 2 fatal setup.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.dirname(__dirname);
const PROD_CONTENT = path.join(ROOT, 'content.js');
const STG_CONTENT = path.join(ROOT, 'content-staging.js');
const STG_HTML = path.join(ROOT, 'staging.html');
const PROD_HTML = path.join(ROOT, 'index.html');
const BASE_URL = 'https://zzz-creator.github.io/audio-troubleshooting-lab/';

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const vIdx = args.indexOf('--v');
const VERSION_ARG = vIdx !== -1 ? Number(args[vIdx + 1]) : null;
if (vIdx !== -1 && (!Number.isInteger(VERSION_ARG) || VERSION_ARG <= 0)) {
  console.error('FATAL: --v needs a positive integer, e.g. --v 242');
  process.exit(2);
}

function run(label, cmd, cmdArgs, opts) {
  console.log(`\n--- ${label}`);
  const r = spawnSync(cmd, cmdArgs, Object.assign({ cwd: ROOT, stdio: 'inherit' }, opts || {}));
  if (r.error) { console.error(`FATAL: could not run ${cmd}: ${r.error.message}`); process.exit(2); }
  if (r.status !== 0) {
    console.error(`\nPROMOTE REFUSED: ${label} failed (exit ${r.status}). Nothing further was changed.`);
    process.exit(1);
  }
}

function gitNumstat() {
  const r = spawnSync('git', ['-c', 'color.ui=never', 'diff', '--no-index', '--numstat', '--', 'content.js', 'content-staging.js'], { cwd: ROOT, encoding: 'utf8' });
  if (r.error) { console.error(`FATAL: git unavailable: ${r.error.message}`); process.exit(2); }
  // exit 0 = identical, 1 = differences (both fine), >1 = real git failure
  if (r.status > 1) { console.error(`FATAL: git diff failed:\n${r.stderr || ''}`); process.exit(2); }
  const line = (r.stdout || '').split('\n').find((l) => l.trim());
  if (!line) return null; // no output and status 0/1: treat as identical
  const [ins, del] = line.split('\t');
  return { insertions: ins === '-' ? 0 : Number(ins), deletions: del === '-' ? 0 : Number(del) };
}

function prodOnlyLines() {
  const r = spawnSync('git', ['-c', 'color.ui=never', 'diff', '--no-index', '-U0', '--', 'content.js', 'content-staging.js'], { cwd: ROOT, encoding: 'utf8' });
  return (r.stdout || '').split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).slice(0, 15);
}

// ── 1. Regression gate ─────────────────────────────────────────────────────
console.log('--- REGRESSION GATE: content.js must be a strict subset of content-staging.js');
const stat = gitNumstat();
if (stat && stat.deletions > 0) {
  console.error(`\nPROMOTE REFUSED: production holds ${stat.deletions} line(s) that content-staging.js does NOT have.`);
  console.error('A wrong-direction copy has already happened somewhere. Reconcile the two files first.');
  console.error('Production-only lines (up to 15):');
  prodOnlyLines().forEach((l) => console.error(`  ${l}`));
  process.exit(1);
}
if (!stat || stat.insertions === 0) {
  console.error('\nPROMOTE REFUSED: content.js already matches content-staging.js — nothing to promote.');
  console.error('If you meant to release engine-only changes, bump the version in index.html by hand.');
  process.exit(1);
}
console.log(`  ok    content.js is a strict subset (+${stat.insertions} staged lines, 0 production-only)`);

const currentMatch = /content\.js\?v=(\d+)/.exec(fs.readFileSync(PROD_HTML, 'utf8'));
if (!currentMatch) { console.error('FATAL: could not find content.js?v=N in index.html'); process.exit(2); }
const currentV = Number(currentMatch[1]);
const targetV = VERSION_ARG !== null ? VERSION_ARG : currentV + 1;
console.log(`  ok    version: ${currentV} -> ${targetV}${VERSION_ARG !== null ? ' (set via --v)' : ' (auto-increment)'}`);

// ── 2. Preflight checks on the staging pair ────────────────────────────────
run('check_syntax.js (both HTML files)', process.execPath, [path.join(ROOT, 'scripts', 'check_syntax.js')]);
run('lint_copy.py (staging content)', process.env.PYTHON_BIN || 'python', [path.join(ROOT, 'scripts', 'lint_copy.py'), 'content-staging.js']);
run('lesson3 regression (staging pair)', process.execPath, [path.join(ROOT, 'scripts', 'check_lesson3_regression.js')], {
  env: Object.assign({}, process.env, { HTML: 'staging.html', CONTENT: 'content-staging.js' }),
});

if (DRY) {
  console.log(`\nDRY RUN: no files changed. Would copy content-staging.js -> content.js, set content.js?v=${targetV}`);
  console.log('Would then re-run the lesson3 regression against the shipping pair (index.html + content.js).');
  console.log(`\nLinks that would need ${targetV}:`);
  console.log(`  cold      ${BASE_URL}?v=${targetV}`);
  console.log(`  member    ${BASE_URL}?tier=member&v=${targetV}`);
  console.log(`  opted-in  ${BASE_URL}?optedin=1&v=${targetV}`);
  process.exit(0);
}

// ── 3. Copy + version bump ─────────────────────────────────────────────────
fs.copyFileSync(STG_CONTENT, PROD_CONTENT);
console.log('\n--- copied content-staging.js -> content.js');

const html = fs.readFileSync(PROD_HTML, 'utf8');
const bumped = html.replace(/content\.js\?v=\d+/, `content.js?v=${targetV}`);
if (bumped === html && currentV !== targetV) { console.error('FATAL: version rewrite did not apply'); process.exit(2); }
fs.writeFileSync(PROD_HTML, bumped);
console.log(`--- index.html now requests content.js?v=${targetV}`);

// ── 4. Post-check: the shipping pair ───────────────────────────────────────
run('lesson3 regression (shipping pair: index.html + promoted content.js)', process.execPath, [path.join(ROOT, 'scripts', 'check_lesson3_regression.js')]);
run('check_syntax.js (post-bump, both HTML files)', process.execPath, [path.join(ROOT, 'scripts', 'check_syntax.js')]);

// ── 5. Report ──────────────────────────────────────────────────────────────
console.log(`
PROMOTED: content.js now carries the staging content at v${targetV}.
Checks: syntax (both HTMLs), copy lint (staging content, byte-identical to what shipped),
        lesson3 regression (staging pair AND shipping pair) — all green.

Update ${targetV} in every place these direct links are shared (YouTube descriptions,
email copy, Circle/resource links):

  cold      ${BASE_URL}?v=${targetV}
  member    ${BASE_URL}?tier=member&v=${targetV}
  opted-in  ${BASE_URL}?optedin=1&v=${targetV}

Then commit by name: content.js index.html`);
