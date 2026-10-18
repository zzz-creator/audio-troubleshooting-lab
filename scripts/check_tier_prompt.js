#!/usr/bin/env node
/* Tier prompt gate: landing on ?tier=member must ask for the password.
 *
 * Why this exists: commit a8e16fd introduced async initTier() - the only
 * code that reads ?tier=member and prompts - and never called it. Nothing
 * else sets TIER from the URL, so the members-only prompt was unreachable
 * and the member link silently loaded the free tier. A grep for call sites
 * cannot catch the next regression of the same kind; this drives the REAL
 * production script block under a DOM shim and asserts the flow behaves.
 *
 * Scenarios (all against a fresh environment each):
 *   cold            free link   -> no prompt, no URL rewrite, one render
 *   cancel          dismiss     -> prompt once, tier param dropped, stays free
 *   wrong-password  bad answer  -> prompt once, "Incorrect password" alert, stays free
 *   password        right answer-> prompt once, unlock cookies written, member
 *                                   tier re-renders the app
 *   already-unlocked member relaunch -> no prompt, member re-renders (no re-ask)
 *
 * Usage:  node scripts/check_tier_prompt.js
 *   HTML=<path>  engine file (default <repo>/index.html)
 * Exit:   0 pass, 1 an expectation failed, 2 could not run.
 */
const fs = require('fs');
const path = require('path');
const { webcrypto } = require('crypto');

const ROOT = path.join(__dirname, '..');
const HTML = process.env.HTML || path.join(ROOT, 'index.html');
const PASSWORD = 'C1rcl3M3mb3r'; // must match MEMBER_PASSWORD in the engine

// Same lookup order as check_syntax.js so the gates run the same way.
let Babel = null;
for (const cand of [process.env.BABEL_STANDALONE, path.join(ROOT, 'scripts', 'vendor', 'babel.min.js'), '@babel/standalone', path.join(ROOT, 'node_modules', '@babel', 'standalone')]) {
  if (!cand) continue;
  try { Babel = require(cand); break; } catch (e) { /* try the next source */ }
}
if (!Babel) {
  console.error('FATAL: @babel/standalone not found.');
  console.error('Expected scripts/vendor/babel.min.js; set BABEL_STANDALONE to override.');
  process.exit(2);
}

// ── Transform the real engine once, reuse it for every scenario ───────────
const raw = fs.readFileSync(HTML, 'utf8');
const blocks = raw.match(/<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/g) || [];
if (!blocks.length) { console.error('FATAL: no text/babel blocks in %s', HTML); process.exit(2); }
const strip = (b) => b.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
const transform = (code, label) => {
  try { return Babel.transform(code, { presets: ['react'], sourceType: 'script' }).code; }
  catch (e) { console.error('FATAL: %s failed to transform: %s', label, e.message); process.exit(2); }
};
const unlockJs = fs.readFileSync(path.join(ROOT, 'js', 'unlock.js'), 'utf8');
const contentJs = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
// The tier code and the app mount live in the LAST block; earlier blocks are
// engine/components its top level may lean on, so run them in document order.
const compiled = blocks.map((b, i) => transform(strip(b), 'babel block ' + i));

// ── Per-scenario environment ──────────────────────────────────────────────
function makeEnv(search) {
  const cookies = new Map();
  const store = {};
  const sstore = {};
  const env = { promptCalls: [], alerts: [], rewrites: [], renders: 0, answers: [] };

  const loc = {
    search, pathname: '/audio-troubleshooting-lab/', hash: '',
    origin: 'https://zzz-creator.github.io',
    get href() { return this.origin + this.pathname + this.search + this.hash; },
  };
  const win = {
    location: loc,
    history: {
      replaceState(_s, _t, url) {
        env.rewrites.push(String(url));
        const u = String(url);
        const qi = u.indexOf('?');
        loc.search = qi === -1 ? '' : u.slice(qi, u.indexOf('#', qi) === -1 ? undefined : u.indexOf('#', qi));
        const hi = u.indexOf('#');
        loc.hash = hi === -1 ? '' : u.slice(hi);
      },
    },
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    sessionStorage: {
      getItem: (k) => (k in sstore ? sstore[k] : null),
      setItem: (k, v) => { sstore[k] = String(v); },
      removeItem: (k) => { delete sstore[k]; },
    },
    crypto: webcrypto,
    prompt: () => { env.promptCalls.push(1); return env.answers.length ? env.answers.shift() : null; },
    alert: (m) => env.alerts.push(String(m)),
    open: () => null, close: () => {},
    addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
    getComputedStyle: () => ({}),
    devicePixelRatio: 1, innerWidth: 1280, innerHeight: 800, isSecureContext: true,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
  };
  const doc = {
    addEventListener() {}, removeEventListener() {},
    getElementById: () => ({ id: 'root', appendChild() {}, style: {} }),
    createElement: () => ({ style: {}, appendChild() {}, setAttribute() {}, click() {} }),
    querySelector: () => null, querySelectorAll: () => [],
    body: { appendChild() {} }, documentElement: {},
  };
  Object.defineProperty(doc, 'cookie', {
    get: () => Array.from(cookies.entries()).map(([k, v]) => k + '=' + v).join('; '),
    set: (s) => {
      const pair = String(s).split(';')[0];
      const i = pair.indexOf('=');
      if (i > 0) cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    },
  });
  env.win = win;
  env.doc = doc;
  env.cookies = cookies;
  return env;
}

// React is stubbed at CREATE level: createElement returns inert nodes and App
// never actually renders - the assertion surface is the createRoot().render()
// call count, which is what re-renders the app when TIER changes.
function reactStub() {
  const cache = {};
  const Component = function Component() {};
  return new Proxy({}, {
    get(_t, prop) {
      if (prop === 'createElement') return (type, props) => ({ type, props });
      if (prop === 'Component' || prop === 'PureComponent') return Component;
      if (!(prop in cache)) cache[prop] = function stub() { return undefined; };
      return cache[prop];
    },
  });
}

async function runScenario(name, opts) {
  const env = makeEnv(opts.search);
  const renders = { n: 0 };
  const React = reactStub();
  const ReactDOM = { createRoot: () => ({ render: () => { renders.n += 1; env.renders = renders.n; } }) };

  // Globals for the executed code, reset per scenario (same pattern as
  // check_lesson3_regression.js; the blocks are re-run in a fresh scope).
  global.window = env.win;
  global.document = env.doc;
  global.navigator = { userAgent: 'node', cookieEnabled: true };
  global.location = env.win.location;
  global.history = env.win.history;
  // defineProperty, not assignment: Node ships an experimental accessor for
  // global localStorage that assignment cannot replace (it warns and no-ops).
  Object.defineProperty(global, 'localStorage', { value: env.win.localStorage, configurable: true, writable: true });
  Object.defineProperty(global, 'sessionStorage', { value: env.win.sessionStorage, configurable: true, writable: true });
  global.React = React;
  global.ReactDOM = ReactDOM;
  global.crypto = webcrypto;
  global.btoa = env.win.btoa;
  global.atob = env.win.atob;
  global.alert = env.win.alert;
  global.prompt = env.win.prompt;
  global.requestAnimationFrame = () => 0;

  const step = (label, fn) => { try { fn(); } catch (e) { throw new Error(label + ' threw: ' + (e && e.message)); } };
  step('unlock.js', () => new Function(unlockJs)());
  step('content.js', () => new Function(contentJs)());
  if (opts.seedUnlock) {
    await global.window.UnlockSystem.writeUnlock('seed');
  }
  compiled.forEach((code, i) => step('block ' + i, () => new Function(code)()));

  // initTier's prompt happens on the promise chain after the script finishes;
  // give it a bounded moment to settle, then hand over the scripted answer.
  const waitFor = async (cond, ms) => {
    const t0 = Date.now();
    while (!cond() && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 5));
    return cond();
  };
  if (opts.answers) env.answers = opts.answers.slice();
  if (opts.asked) await waitFor(() => env.promptCalls.length >= opts.asked, 3000);
  await waitFor(() => opts.settled(renders.n, env), 3000);

  const prompt = env.promptCalls.length;
  const member = env.cookies.has('aul_p'); // writeUnlock only runs on a correct password / seed
  console.log('  ' + name.padEnd(20) + ' prompts=' + prompt + ' alerts=' + env.alerts.length +
    ' rewrites=' + env.rewrites.length + ' renders=' + renders.n + ' unlock-cookie=' + member);
  return { name, prompt, env, renders: renders.n, member };
}

const fails = [];
const check = (ok, msg) => { if (!ok) fails.push(msg); console.log('  %s %s', ok ? 'ok  ' : 'FAIL', msg); };

(async () => {
  console.log('tier prompt gate: %s\n', path.relative(ROOT, HTML) || HTML);

  const cold = await runScenario('cold free link', {
    search: '?v=243',
    settled: (renders, env) => env.promptCalls.length === 0,
  });
  check(cold.prompt === 0, 'cold ?v=N landing never prompts');
  check(cold.env.rewrites.length === 0, 'cold landing leaves the URL alone');
  check(cold.renders === 1, 'cold landing renders exactly once');

  const cancel = await runScenario('cancel prompt', {
    search: '?tier=member&v=243', asked: 1, answers: [null],
    settled: (renders, env) => env.rewrites.length >= 1 && env.promptCalls.length >= 1,
  });
  check(cancel.prompt === 1, 'MEMBER LINK ASKS: ?tier=member prompts for the password');
  check(cancel.env.rewrites.length === 1 && cancel.env.rewrites[0].indexOf('tier=') === -1,
    'cancel drops ?tier=member from the address bar');
  check(cancel.renders === 1 && !cancel.member, 'cancel falls back to the free tier (no member re-render)');

  const wrong = await runScenario('wrong password', {
    search: '?tier=member&v=243', asked: 1, answers: ['nope'],
    settled: (renders, env) => env.alerts.length >= 1,
  });
  check(wrong.prompt === 1, 'wrong password still prompts once');
  check(wrong.env.alerts.length === 1 && /Incorrect password/.test(wrong.env.alerts[0]),
    'wrong password shows the incorrect-password alert');
  check(wrong.renders === 1 && !wrong.member, 'wrong password stays free (no unlock cookie, one render)');

  const ok = await runScenario('correct password', {
    search: '?tier=member&v=243', asked: 1, answers: [PASSWORD],
    // unlockMember() is fire-and-forget by design: the signed-cookie write is
    // a floating promise that lands after the re-render, so settle on BOTH.
    settled: (renders, env) => renders >= 2 && env.cookies.has('aul_p'),
  });
  check(ok.prompt === 1, 'correct password prompts once then unlocks');
  check(ok.member, 'correct password writes the signed unlock cookies');
  check(ok.renders >= 2, 'member tier re-renders the app (TIER is not React state)');
  check(ok.env.alerts.length === 0, 'correct password shows no alert');

  const again = await runScenario('member relaunch', {
    search: '?tier=member&v=243', seedUnlock: true,
    // Every member-settle path rewrites the URL; renders alone is true from
    // the first frame, which would assert before readUnlock's crypto resolves.
    settled: (renders, env) => env.rewrites.length >= 1,
  });
  check(again.prompt === 0, 'already-unlocked member is NOT re-prompted');
  check(again.member, 'unlock cookies survive the relaunch');
  check(again.renders >= 2, 'member tier applies without any prompt (re-render after readUnlock)');

  console.log('');
  if (fails.length) { console.error('FAILED (%d):', fails.length); fails.forEach((f) => console.error('  - %s', f)); process.exit(1); }
  console.log('OK: the members-only prompt behaves on every path');
  process.exit(0);
})().catch((e) => { console.error('FATAL: %s', e && e.message); process.exit(2); });
