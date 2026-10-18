#!/usr/bin/env node
/* Regression gate: Run the Show 03 ("Set the Input Level") must not read
 * all-done in the guide while the win is still blocked.
 *
 * Why this exists: the shipped bug was a silent disagreement between two
 * files. The lesson's step-4 `done` predicate ticked all four hints (and DONE)
 * as soon as EITHER main was raised into the output corridor, while the win
 * also requires the two mains to be balanced. The guide said finished; the
 * solved card never came. Nothing in the app could catch that, because the
 * guide is authored in the content file and the win lives in the engine.
 *
 * So this drives the REAL engine out of the HTML and the REAL lesson out of
 * the content file, then asserts they agree in every way a student can set the
 * two mains.
 *
 * Usage:  node scripts/check_lesson3_regression.js
 *   BABEL_STANDALONE=<path>  override the babel copy (optional; falls back to
 *                            scripts/vendor/babel.min.js, then node_modules)
 *   HTML=<path>     engine file to load   (default <repo>/index.html)
 *   CONTENT=<path>  content file to test  (default <repo>/content.js)
 * Exit:   0 pass, 1 the guide and the win disagree, 2 could not run.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = process.env.HTML || path.join(ROOT, 'index.html');
const CONTENT = process.env.CONTENT || path.join(ROOT, 'content.js');
const shown = path.relative(ROOT, CONTENT) || CONTENT;

// Same lookup order as check_syntax.js so the two gates run the same way.
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

const blocks = fs.readFileSync(HTML, 'utf8').match(/<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/g) || [];
const engine = Babel.transform(
  blocks[0].replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''),
  { presets: ['react'], sourceType: 'script' }).code;

const store = {};
global.window = {};
global.document = { addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {}, appendChild() {} }) };
global.navigator = { userAgent: 'node' };
global.performance = global.performance || { now: () => Date.now() };
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.React = { createElement: () => null, useRef: () => ({}), useState: () => [null, () => {}] };
new Function(engine)();
new Function(fs.readFileSync(CONTENT, 'utf8'))();
const W = window;

const lvl = (W.LEVELS || []).find((l) => l.id === 3);
if (!lvl || !Array.isArray(lvl.hints) || lvl.hints.length !== 4) { console.error('lesson 3 not found / unexpected shape in %s', CONTENT); process.exit(2); }
const gs = lvl.gainStructure;
const band = gs.inputBand;
const UNITY = gs.unity != null ? gs.unity : 0.75;
const TOL = gs.faderTol != null ? gs.faderTol : 0.06;
const chanIn = (s, i) => (W.computeAudio(s).chanInBaseline || [])[i] || 0;
const paMax = (s) => { const c = W.computeAudio(s).contributions.playback || {}; return Math.max(c.pa_l || 0, c.pa_r || 0); };
const clamp = (v) => Math.max(0, Math.min(1, v));
const bisect = (set, read, target) => { let lo = 0, hi = 1; for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; set(m); if (read() < target) lo = m; else hi = m; } const v = (lo + hi) / 2; set(v); return v; };

// Load state (defaultState -> normalize every strip outside involves [7] -> the
// lesson's own sabotage), then the four hinted moves, Main R set to `paRfactor`
// of Main L's setting.
function play(paRfactor) {
  const s = W.defaultState();
  s.channels = s.channels.map((ch, i) => (i === 6 ? ch : {
    ...ch, mute: true, fader: 0, gain: 0, pan: 0.5, phantom: false, aux1: 0, aux2: 0, aux3: 0, aux4: 0, solo: false, highpass: false }));
  s.topology = { ...s.topology, ...(lvl.topology || {}) };
  lvl.sabotage(s);
  s.channels[6].solo = true; s.channels[6].solo = false;                                        // 1 PFL latches, then out
  bisect((g) => { s.channels[6].gain = g; }, () => chanIn(s, 6), Math.sqrt(band[0] * band[1]));  // 2 gain healthy
  s.channels[6].mute = false; s.channels[6].fader = UNITY;                                       // 3 channel + master at unity
  s.master.mute = false; s.master.fader = UNITY;
  bisect((v) => { s.outputs.pa_l.volume = v; }, () => paMax(s), 0.45);                            // 4 Main L into the corridor
  s.outputs.pa_r.volume = clamp(s.outputs.pa_l.volume * paRfactor);
  return s;
}

// hintCtx as App builds it for a guided lesson (incl. the fix's paBalanceIssue).
function ctxFor(s) {
  const audio = W.computeAudio(s);
  const i = (gs.refChannel || 1) - 1;
  const inLvl = (audio.chanInBaseline && audio.chanInBaseline[i]) || 0;
  return {
    state: s, audio, pflChecked: true, paBalanceIssue: W.detectPaBalanceIssue(s),
    gainStatus: {
      input: !gs.inputBand || (inLvl >= band[0] && inLvl <= band[1]),
      fader: !s.channels[i].mute && Math.abs(s.channels[i].fader - UNITY) <= TOL,
      master: !s.master.mute && Math.abs(s.master.fader - UNITY) <= TOL,
    },
  };
}

// normalWon for this lesson: the flags it can actually trip.
function solves(s) {
  const audio = W.computeAudio(s);
  const clips = W.detectClipping(audio, s);
  const fb = W.detectFeedback ? W.detectFeedback(s, audio) : null;
  return !!W.checkWin(s, lvl.conditions) && clips.length === 0 && !W.detectPaBalanceIssue(s) && !fb;
}

const shipped = lvl.hints[3].done;
const allFour = (ctx) => lvl.hints.every((h) => { try { return !!h.done(ctx); } catch (e) { return false; } });
// A faithful copy of the code this change replaced, so the harness can be SEEN to fail.
const oldDone = (ctx) => { var c = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.playback; if (!c) return false; var l = Math.max(c.pa_l || 0, c.pa_r || 0); return l >= 0.30 && l <= 0.65; };

const cases = [[1.00, 'both mains matched'], [0.98, 'Main R within 2% of Main L'], [0.00, 'ONLY Main L raised (Main R down)'], [0.50, 'Main R at half of Main L']];
console.log('content: %s   lesson 3: %s\n', shown, lvl.title);
const rows = cases.map(([f, label]) => {
  const ctx = ctxFor(play(f));
  return { f, label, old: oldDone(ctx), now: shipped(ctx), won: solves(ctx.state), all: allFour(ctx) };
});
for (const r of rows) {
  console.log('  %s', r.label);
  console.log('      old step 4 done=%s | shipped step 4 done=%s | win=%s | all four steps done=%s',
    r.old, r.now, r.won, r.all);
}
console.log('');

let fails = 0;
const check = (ok, msg) => { if (ok) { console.log('  ok   %s', msg); } else { fails += 1; console.log('  FAIL %s', msg); } };
const one = rows.find((r) => r.f === 0);
const half = rows.find((r) => r.f === 0.5);
const matched = rows.find((r) => r.f === 1);

check(rows.every((r) => r.all === r.won), 'every reachable mains setting: all-four-hints-done agrees with the win');
check(one.old === true, 'REPLACED step 4 read done with only one main up (the reported bug)');
check(one.won === false, 'with only one main up the win is still blocked');
check(one.now === false, 'SHIPPED step 4 stays open with only one main up');
check(half.old === true, 'REPLACED step 4 read done with mismatched mains too');
check(half.now === false, 'SHIPPED step 4 stays open with mismatched mains');
check(matched.now === true && matched.won === true, 'matched mains: step 4 is done AND the win fires (not over-strict)');

console.log('');
console.log(fails ? 'FAILED (' + fails + ')' : 'OK: the guide and the win now agree');
process.exit(fails ? 1 : 0);
