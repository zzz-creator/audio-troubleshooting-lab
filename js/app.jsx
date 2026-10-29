const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM, useCallback: uC } = React;

// ── FUNNEL INSTRUMENTATION (2026-10-18, local-only by decision) ────────────
// Every event lands in a bounded localStorage ring buffer and nothing ever
// leaves the page: FUNNEL_ENDPOINT is blank on purpose — no analytics service
// was chosen and no infrastructure was stood up for this. When one is chosen,
// wire it into the POST branch below and nowhere else. Read the funnel from
// the console: __funnelDump() returns the events (oldest first),
// __funnelClear() empties the buffer.
// track() never throws: a locked-down iframe, a full quota, or a storage
// exception must not break the lesson (the same rule the profile save
// follows), so every path through it is swallowed.
const FUNNEL_KEY = 'audiou-lab-funnel-v1';
const FUNNEL_MAX = 200; // ~200 events: a full Start Here run plus replays
const FUNNEL_ENDPOINT = ''; // blank = local buffer only; set to a URL to ship
function track(stage, detail) {
  try {
    const ev = { t: Date.now(), stage: stage };
    if (detail) for (const k in detail) ev[k] = detail[k];
    let buf = null;
    try { buf = JSON.parse(localStorage.getItem(FUNNEL_KEY)); } catch (e) { buf = null; }
    if (!Array.isArray(buf)) buf = [];
    buf.push(ev);
    while (buf.length > FUNNEL_MAX) buf.shift();
    localStorage.setItem(FUNNEL_KEY, JSON.stringify(buf));
    if (FUNNEL_ENDPOINT) {
      // Fire-and-forget, never awaited, errors swallowed — reserved for when
      // an endpoint exists. Unwired deliberately (see above).
      try { fetch(FUNNEL_ENDPOINT, { method: 'POST', body: JSON.stringify(ev), keepalive: true }); } catch (e) {}
    }
  } catch (e) { /* best-effort: the lesson continues either way */ }
}
if (typeof window !== 'undefined') {
  window.track = track;
  window.__funnelDump = function () {
    try { const b = JSON.parse(localStorage.getItem(FUNNEL_KEY)); return Array.isArray(b) ? b : []; } catch (e) { return []; }
  };
  // Phase 0 metric: Day-7 activation = % of browsers whose first start_here_progress
  // event is followed (within 7 days) by >=3 distinct Essentials lessons solved.
  // Show Day completion will be added once Show Day ships (Phase 1b).
  window.__day7Activation = function () {
    try {
      const b = JSON.parse(localStorage.getItem(FUNNEL_KEY));
      if (!Array.isArray(b)) return { total: 0, activated: 0, rate: 0 };
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const byFirst = {};
      for (const ev of b) {
        if (ev.stage !== 'start_here_progress') continue;
        if (byFirst[ev.t] == null) byFirst[ev.t] = new Set();
        byFirst[ev.t].add(ev.id);
      }
      const firsts = Object.keys(byFirst).map(Number).sort((a, c) => a - c);
      let total = 0, activated = 0;
      for (const first of firsts) {
        total++;
        const distinct = new Set();
        for (const ev of b) {
          if (ev.stage !== 'start_here_progress') continue;
          if (ev.t - first > sevenDays) continue;
          if (ev.t < first) continue;
          distinct.add(ev.id);
        }
        if (distinct.size >= 3) activated++;
      }
      return { total, activated, rate: total ? activated / total : 0 };
    } catch (e) { return { total: 0, activated: 0, rate: 0 }; }
  };
  window.__funnelClear = function () { try { localStorage.removeItem(FUNNEL_KEY); } catch (e) {} };
}

// Fixed design width for the whole board. The stage source cards sit at
// percentage offsets but are a fixed 154px wide, so the stage needs to be wide
// enough for them not to overlap; the console row is also fixed-width. We lay
// the board out at this width no matter the window, then scale the whole thing
// uniformly to fit (see useFitScale). Tune this once so nothing overlaps at
// scale 1; everything else follows.
const DESIGN_W = 1680;
// When the stage is hidden the brief stays BESIDE the console (not below it, or
// the taller canvas would scale DOWN on a height-limited wide screen). The canvas
// narrows to the console plus a brief column, so fit-to-screen scales it up on
// the narrow embed and frees horizontal room for more channels later.
const DESIGN_W_STAGE_HIDDEN = 1300;
// Big-desk view (Phase 3): each added channel strip widens the design canvas by
// its own footprint (strip width 100 + gap 8) so the scale-to-fit shrinks the
// whole board to fit instead of letting a wide console overflow. Native boards
// (no padding) keep DESIGN_W exactly, so nothing changes for existing content.
const STRIP_UNIT = 108;
// Stage hidden AND a big desk selected: the brief drops BELOW the console (a
// banner) so the console takes the full width. The canvas is then just the
// console's width (no beside-brief column), growing per added strip. Native at
// 755; this base leaves a little margin so the console never clips.
const DESIGN_W_CONSOLE_ONLY = 800;
// The strip count the base design widths are calibrated for (the original band).
// Canvas width grows per strip ABOVE this, whether the extra strips are unused
// big-desk padding or a real multi-input band — both widen the desk the same.
const NATIVE_CH = 5;

// Member progress persistence. Completed levels are saved to the browser keyed
// by stable level id, so a monthly content drop never wipes what a student
// already finished (new scenarios just append with new ids). Wrapped in
// try/catch because some embedded/iframe contexts restrict storage; if it's
// blocked the app still runs, it just won't remember between visits.
// THE PROFILE — one versioned object holds everything the app remembers
// between visits. Today that's completed lessons and the practice-rep count;
// as features land it gains a fault ledger, resume state, a Show Day lockout,
// and so on. The rule that makes this worth doing up front: a new feature adds
// ONE field to defaultProfile() and it is persisted and carried in the save
// code automatically, with no change to the envelope or the save-code format.
// Legacy v1 storage (separate completed + reps keys) and legacy v1 save codes
// (which only knew completed + reps) are migrated in transparently, so no
// member loses history across the upgrade.
const PROFILE_KEY = 'audiou-troubleshooting-lab-profile-v2';
const PROGRESS_KEY = 'audiou-troubleshooting-lab-progress-v1';        // legacy, migrated in + mirrored
const REPS_KEY = 'audiou-troubleshooting-lab-practice-reps-v1';      // legacy, migrated in + mirrored
const PROFILE_VERSION = 2;

function defaultProfile() {
  return {
    v: PROFILE_VERSION,
    completed: {},      // { [lessonId]: true }
    reps: 0,            // practice reps finished, ever
    ledger: {},         // per-fault-key stats: { [key]: { reps, clean, overPar, hints, last } }
    practiceClean: 0,   // practice reps solved clean (no hints, at/under par)
    lastLevel: 0,       // resume: scenario index last open
    practiceFaults: 1,  // resume: FAULTS difficulty (1-3)
    feedbackByEar: false, // resume: Feedback Mode GUIDED(false)/BY EAR(true)
    etGuided: 0,        // free-tier Ear Training: guided rounds finished (cap FREE_ET_GUIDED)
    etByEar: 0,         // free-tier Ear Training: by-ear rounds finished (cap FREE_ET_BYEAR)
    email: '',          // free-tier email gate: captured address (sent to Kit)
    firstName: '',      // free-tier email gate: captured first name (sent to Kit)
    emailSkipped: false, // free-tier email gate: chose "skip for now" (soft gate)
    freePractice: 0,    // free-tier Practice taste: reps consumed (gate at FREE_PRACTICE_LIMIT)
    surface: 'analog',  // member console surface: 'analog' or 'digital' (select-then-edit)
    rank: 1,            // drill ladder: highest rung reached
    rankClean: 0,       // drill ladder: clean solves banked toward the next rung
    liveShow: false,    // Practice: "the room is listening" mode (charges destructive diagnosis)
    pathChosen: false,  // welcome chooser: has the user picked a first path (quick fix vs Essentials)
    walkthroughDone: false, // free "Know your console" walkthrough: shown once to a fresh free visitor
    streak: 0,          // daily streak: consecutive days with at least one finished session
    streakDay: '',      // YYYY-MM-DD (local) of the last day counted toward the streak
    streakBest: 0,      // longest daily streak reached, ever
    stageHidden: false, // view pref: hide the stage so the console gets the screen
    consoleSize: 0,     // big-desk view: 0 = native band, else 8/16/24 (unused line inputs pad the desk)
    userZoom: 1,        // overall zoom: 1 = fit-to-window, up to 2.0 (200%); board scrolls past fit
    // Future fields go here. They round-trip through storage and the save
    // code for free, because the envelope serializes the whole object.
  };
}

// Coerce any loaded/decoded blob into a clean profile. Unknown fields are kept
// verbatim first (so a newer save code restored on an older build doesn't lose
// data), then the known fields are sanitized so garbage can't corrupt them.
function normalizeProfile(data) {
  const p = defaultProfile();
  if (!data || typeof data !== 'object' || Array.isArray(data)) return p;
  for (const k of Object.keys(data)) p[k] = data[k];
  const c = {};
  if (data.completed && typeof data.completed === 'object' && !Array.isArray(data.completed)) {
    for (const k of Object.keys(data.completed)) { if (data.completed[k]) c[k] = true; }
  }
  p.completed = c;
  p.reps = (Number.isFinite(data.reps) && data.reps >= 0) ? Math.floor(data.reps) : 0;
  p.freePractice = (Number.isFinite(data.freePractice) && data.freePractice >= 0) ? Math.floor(data.freePractice) : 0;
  p.surface = (data.surface === 'digital') ? 'digital' : 'analog';
  p.rank = (Number.isFinite(data.rank) && data.rank >= 1) ? Math.min(6, Math.floor(data.rank)) : 1;
  p.rankClean = (Number.isFinite(data.rankClean) && data.rankClean >= 0) ? Math.floor(data.rankClean) : 0;
  p.liveShow = !!data.liveShow;
  p.pathChosen = !!data.pathChosen;
  p.walkthroughDone = !!data.walkthroughDone;
  p.streak = (Number.isFinite(data.streak) && data.streak >= 0) ? Math.floor(data.streak) : 0;
  p.streakDay = (typeof data.streakDay === 'string') ? data.streakDay : '';
  p.streakBest = (Number.isFinite(data.streakBest) && data.streakBest >= 0) ? Math.floor(data.streakBest) : 0;
  p.stageHidden = !!data.stageHidden;
  p.consoleSize = (CONSOLE_SIZES.indexOf(data.consoleSize) !== -1) ? data.consoleSize : 0;
  p.firstName = (typeof data.firstName === 'string') ? data.firstName : '';
  p.v = PROFILE_VERSION;
  return p;
}

// Local calendar day as YYYY-MM-DD, offset by `days` (default 0). Local time on
// purpose: a personal training streak follows the user's own days, and there is
// no server to anchor to anyway.
function dayStr(days) {
  const d = new Date();
  if (days) d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// The stored streak still counts only if the last active day was today or
// yesterday; a bigger gap means the chain broke, so the live streak reads 0
// (even before the next session resets it).
function liveStreak(profile) {
  if (!profile || !profile.streak) return 0;
  return (profile.streakDay === dayStr(0) || profile.streakDay === dayStr(-1)) ? profile.streak : 0;
}

// First run after the upgrade: build a profile from the old v1 keys.
function migrateLegacyProfile() {
  const out = defaultProfile();
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && data.completed && typeof data.completed === 'object') {
      for (const k of Object.keys(data.completed)) { if (data.completed[k]) out.completed[k] = true; }
    }
  } catch (e) {}
  try {
    const n = parseInt(window.localStorage.getItem(REPS_KEY) || '0', 10);
    if (Number.isFinite(n) && n > 0) out.reps = n;
  } catch (e) {}
  return out;
}

// try/catch because some embedded/iframe contexts restrict storage; if it's
// blocked the app still runs, it just won't remember between visits.
function loadProfile() {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) return normalizeProfile(JSON.parse(raw));
  } catch (e) {}
  const migrated = migrateLegacyProfile();
  try { window.localStorage.setItem(PROFILE_KEY, JSON.stringify(migrated)); } catch (e) {}
  return migrated;
}

function saveProfile(profile) {
  try {
    const p = normalizeProfile(profile);
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    // Mirror the two legacy fields so rolling back to the prior build keeps
    // completed + reps. Cheap insurance; the old build reads these keys.
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify({ v: 1, completed: p.completed }));
    window.localStorage.setItem(REPS_KEY, String(p.reps));
  } catch (e) {}
}

// First-run flags. The tour shows once per browser; the Essentials
// completion card shows once when The Gig (lesson 9, the final exam) is
// passed — the emotional peak, before the Power-Down wind-down lesson.
const TOUR_KEY = 'audiou-troubleshooting-lab-tour-v1';
const CTA_KEY = 'audiou-troubleshooting-lab-essentials-cta-v1';
// Separate "shown once" flag for the Start Here finale, so a returning viewer
// whose legacy CTA_KEY is already set (from the old Essentials) still gets it.
const SH_DONE_KEY = 'audiou-troubleshooting-lab-starthere-cta-v1';
// One-shot latch for the email ask at the FIRST Start Here win (moved from the
// finale 2026-10-18, council). Its own key on purpose: SH_DONE_KEY stays the
// finale latch, so browsers that already passed the old finale beat are never
// re-asked mid-course, and the finale keeps its completion card.
const FIRST_WIN_ASK_KEY = 'audiou-troubleshooting-lab-firstwin-ask-v1';

// The membership join page. The two highest-intent moments in the app (the
// completion card after The Gig, and the pitch overlay when a free user
// clicks a locked member mode) link here. UTM tags are the only attribution
// a zero-backend product gets, so each link tags where the click came from.
const JOIN_URL = 'https://audiouniversityonline.com/programs/live-sound/';
const joinUrl = (content) => JOIN_URL + '?utm_source=troubleshooting-lab&utm_medium=app&utm_content=' + content;
// ═════════ FROZEN — DO NOT EXTEND ═════════════════════════════════════════
// This unlock block (signed cookies aul_p/aul_s + HMAC + session seal,
// implemented in js/unlock.js) is frozen as of 2026-10-18 by council
// decision: keep it working exactly as it does. Do NOT revert it to a
// localStorage boolean, do NOT add cookie fields or new code paths, do NOT
// remove the password prompt. Verification and the direct-URL matrix live in
// UNLOCK_README.md; scripts/check_tier_prompt.js gates the ?tier=member
// flow. Any change here needs Kyle's explicit go-ahead.
// ══════════════════════════════════════════════════════════════════════════
//
// Where the full members' version lives. A paying member who lands on the
// free version (a shared link, the free page) uses this to jump to what they
// already have, instead of hitting a join wall for content they own.
// ?tier=member is what unlocks the member content in that build.
//
// The password is a SOFT gate, not security: it lives in this file, so anyone
// reading source can see it. It guards BOTH the link (openFullVersion) and the
// tier itself (see TIER below), so opening ?tier=member directly still asks.
// The unlock is remembered in the signed cookies written by js/unlock.js on
// this origin, so clicking the link does not re-prompt on the page it opens.
const MEMBER_URL = 'https://zzz-creator.github.io/audio-troubleshooting-lab?tier=member';
const MEMBER_PASSWORD = 'C1rcl3M3mb3r';

// Use new unlock system (cookies + HMAC + session seal)
function isMemberUnlocked() {
  // Synchronous check - will be checked properly on load
  try {
    if (window.UnlockSystem) {
      // For backward compat, also check old localStorage once
      return window.localStorage.getItem('audiou-troubleshooting-lab-member-unlock-v1') === '1';
    }
  } catch (e) {}
  return false;
}

async function unlockMember(src) {
  if (window.UnlockSystem) {
    await window.UnlockSystem.writeUnlock(src || 'pwd');
  }
}

// Ask once. Returns 'ok' (right password, unlock remembered), 'wrong' (asked,
// rejected) or 'cancel' (dismissed). Never throws.
function requestMemberPassword() {
  var pw = window.prompt('Members only. Enter the password to open the full version:');
  if (pw === null) return 'cancel';
  if (pw === MEMBER_PASSWORD) {
    unlockMember('pwd');
    return 'ok';
  }
  return 'wrong';
}
// The free variant of the current URL: strip ?tier, keep the rest (so ?v=N
// stays cold, ?optedin=1&v=N stays opted-in).
function freeVariantUrl() {
  var p = new URLSearchParams(window.location.search);
  p.delete('tier');
  var q = p.toString();
  return window.location.pathname + (q ? '?' + q : '') + window.location.hash;
}

// Gate for the "Open the full version" link. Already-unlocked members go
// straight through; otherwise prompt, and on a miss alert and bounce back to
// the free variant. Carry this page's cache buster so the member build lands
// as the documented ?tier=member&v=N embed.
function openFullVersion(e) {
  if (e) e.preventDefault();
  // Check unlock status
  (async function() {
    let unlocked = isMemberUnlocked();
    if (!unlocked && window.UnlockSystem) {
      const result = await window.UnlockSystem.readUnlock();
      unlocked = result.unlocked;
    }
    if (!unlocked) {
      var r = requestMemberPassword();
      if (r === 'cancel') return;
      if (r === 'wrong') {
        window.alert('Incorrect password — taking you back to the free version.');
        window.location.href = freeVariantUrl();
        return;
      }
      unlocked = true;
    }
    var m = window.location.search.match(/[?&]v=(\d+)/);
    window.open(MEMBER_URL + (m ? '&v=' + m[1] : ''), '_blank', 'noopener');
  })();
}

// ── Email gate (free tier) ──────────────────────────────────────────────
// Before a free viewer starts the 10-lesson Essentials, ask for an email so it
// can feed the Kit (ConvertKit) list. Soft gate: a "skip for now" link lets
// them through, and the choice is remembered so they're never asked twice.
// Shared scenario/rep links and the member tier never see it.
//
// Kit form 9560384 (account upbeat-creator-1556, embed uid 204509d6fc). This is
// the NUMERIC submission id from the form's action endpoint, not the uid in the
// share URL. To repoint at a different Kit form, open its embed and read the
// number in https://app.kit.com/forms/<THIS-NUMBER>/subscriptions. Blank it to
// disable sending: the gate still works (remembers locally, lets people in),
// it just stops posting to Kit, so the funnel never breaks.
// Blank ON PURPOSE 2026-10-18 while Kyle reworks the subscription service:
// the gate still accepts (validation, success view, local profile save, funnel
// events, checklist link) but nothing is subscribed anywhere. Re-enable by
// restoring the id — it was '9560384' — or point submitToKit at the new
// service's endpoint.
const KIT_FORM_ID = '';

// The free Soundcheck Checklist (public Circle resource). Shown on the mobile
// success screen as the opt-in reward, so every completer gets it on the spot,
// new or existing subscriber, with no dependency on Kit sending an email.
const CHECKLIST_URL = 'https://community.audiouniversityonline.com/c/resources/soundcheck-checklist';

const isValidEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// Fire-and-forget POST to Kit's public form-subscription endpoint. Designed for
// browser embedding (CORS open), so no backend is needed. Entry never waits on
// this; a network/Kit failure must not trap a viewer behind the gate.
function submitToKit(email, firstName) {
  if (!KIT_FORM_ID) return Promise.resolve(false);
  try {
    // Match Kit's own embed contract exactly: a form-urlencoded body with the
    // built-in `email_address` and the name as `fields[first_name]`. A top-level
    // `first_name` returns HTTP success but Kit ignores it, so names never
    // landed on the subscriber. `fields[first_name]` is what Kit's hosted form
    // posts. form-urlencoded is also a CORS "simple" request, so no preflight.
    // Only send the name when present so a blank never overwrites an existing one.
    const body = new URLSearchParams();
    body.set('email_address', String(email).trim());
    const fn = (firstName || '').trim();
    if (fn) body.set('fields[first_name]', fn);
    return fetch('https://app.kit.com/forms/' + KIT_FORM_ID + '/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body.toString(),
    }).then(() => true).catch(() => false);
  } catch (e) { return Promise.resolve(false); }
}

// Safely set an AudioParam target with cancel + anchor + ramp.
// Fixes the "crash when turning sound on" bug from the chat transcript:
// linearRampToValueAtTime needs a starting anchor on some browsers, and any
// non-finite value (NaN/Infinity) makes the AudioParam throw.
// Derive which channels are "in play" for this level — anything else is treated
// as a strip that hasn't been brought up in sound-check yet (muted, fader/gain
// at 0, pan center, no phantom or aux). Levels can override with `involves`.
window.deriveInvolves = function deriveInvolves(level) {
  if (level.involves) return level.involves;
  const involved = new Set();
  // Source→port mapping has to match the current default cable layout
  // (V1→1, V2→2, Bass→3, Keys→4). Previously hardcoded against the
  // earlier port assignment, which is why levels whose conditions
  // referenced bass/keys ended up with those channels normalized
  // (muted/zeroed) at load.
  const defaultCables = { vocal: 1, vocal2: 2, guitar: 3, laptop: 4 };
  const defaultFanOut = [1, 2, 3, 4];
  for (const cond of (level.conditions || [])) {
    // Playback is the FOH line input on channel 5, outside the snake fan-out.
    if (cond.source === 'playback') { involved.add(7); continue; }
    if (cond.source && defaultCables[cond.source]) {
      const port = defaultCables[cond.source];
      const ch = defaultFanOut[port - 1];
      involved.add(ch);
    }
  }
  return involved.size > 0 ? [...involved] : [1];
};
const deriveInvolves = window.deriveInvolves;

// Reset every channel outside `involves` to "normalized" / starting state:
// muted, fader 0, gain 0, pan center, no phantom, no aux. Keep id + label.
function normalizeChannels(channels, involves) {
  return channels.map((ch, idx) => {
    if (involves.includes(idx + 1)) return ch;
    return { ...ch, mute: true, fader: 0, gain: 0, pan: 0.5, phantom: false, aux1: 0, aux2: 0, aux3: 0, aux4: 0, solo: false, highpass: false };
  });
}

// Big-desk view (Phase 3): present the console as a larger 8/16/24-channel desk
// by padding the board with UNUSED line inputs. The band keeps its real
// channels; the extra strips are inert (muted, fader + gain down, nothing
// patched in), exactly like the spare inputs on a real console at a small gig.
// They carry unused:true so a resize regenerates only the padding, and the audio
// engine (which reads state.channels) is unaffected because nothing feeds them.
// This is also the seam for "fuller band later" — a padding strip becomes live
// the moment a source is patched to it.
const CONSOLE_SIZES = [8, 16];
function padConsole(channels, target) {
  if (!Array.isArray(channels)) return channels;
  const real = channels.filter((c) => !c.unused);
  // `target` is an INPUT count (MX-8, MX-16); a stereo strip (the FOH playback
  // pair) counts as two inputs, so the desk name matches the physical input count.
  const realInputs = real.reduce((n, c) => n + (c.stereo ? 2 : 1), 0);
  if (!target || target <= realInputs) return real; // native or smaller: never hide a real channel
  // The FOH stereo playback strip always lives on the desk's LAST two channels
  // (7/8 on an MX-8, 15/16 on an MX-16). Pad the unused mono strips in BEFORE it,
  // never after, so the playback line never lands in the middle of the desk.
  const stereoIdx = real.findIndex((c) => c.stereo);
  const head = stereoIdx >= 0 ? real.slice(0, stereoIdx) : real.slice();
  const tail = stereoIdx >= 0 ? real.slice(stereoIdx + 1) : [];
  const playback = stereoIdx >= 0 ? real[stereoIdx] : null;
  // Mono strips to insert so total inputs equal the target (playback = 2 inputs).
  const padCount = target - (head.length + tail.length) - (playback ? 2 : 0);
  const maxId = real.reduce((m, c) => Math.max(m, c.id || 0), 0);
  const out = head.slice();
  // Each padding strip is labelled by its position so the CH number and the
  // scribble-strip label agree (strip 7 reads "7"), the way an unused input on a
  // real desk does. ids start past the max real id so there's no key clash.
  for (let i = 0; i < padCount; i++) {
    const pos = head.length + i;
    out.push(makeChannel({ id: maxId + 1 + i, label: String(pos + 1), gain: 0, fader: 0, mute: true, unused: true }));
  }
  tail.forEach((c) => out.push(c));
  if (playback) out.push(playback); // playback strip stays last → 7/8, 15/16, …
  return out;
}
window.padConsole = padConsole;

function rampParam(param, ctx, target) {
  if (!Number.isFinite(target)) target = 0;
  const now = ctx.currentTime;
  const current = Number.isFinite(param.value) ? param.value : 0;
  try {
    param.cancelScheduledValues(now);
    param.setValueAtTime(current, now);
    param.linearRampToValueAtTime(target, now + 0.05);
  } catch (e) {
    try { param.value = target; } catch (_) {}
  }
}

// Mobile / small-screen visitors can't run the full console, so instead of a
// dead end this captures the email (the whole point of the lead magnet) and
// tells them to open it on a computer. onCapture sends to Kit like every other
// gate. NOTE: the "we'll send you the link" promise needs a Kit welcome
// automation that emails the link; the capture itself works regardless.
function MobileNotice({ onCapture, optedIn }) {
  const [name, setName] = uS('');
  const [val, setVal] = uS('');
  const [err, setErr] = uS(false);
  const [sent, setSent] = uS(false);
  const submit = () => {
    if (!isValidEmail(val)) { setErr(true); return; }
    if (onCapture) onCapture(val.trim(), name.trim());
    setSent(true);
  };
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center',
      background: 'radial-gradient(ellipse at 30% 0%, #1a1a1f 0%, #0e0e10 50%, #08080a 100%)',
      color: 'var(--ink)',
    }}>
      <img src={window.AU_LOGO} alt="Audio University" style={{ height: 72, width: 72, display: 'block', marginBottom: 16 }}/>
      <div className="display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>Troubleshooting Lab</div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 4 }}>Live Sound Simulator</div>
      <div style={{
        marginTop: 24, padding: '18px', width: '100%', maxWidth: 360, boxSizing: 'border-box',
        background: 'rgba(14,36,21,0.7)', border: '1px solid var(--green)', borderRadius: 10,
        boxShadow: '0 0 0 1px rgba(74,222,128,0.18), 0 8px 28px rgba(0,0,0,0.6)',
      }}>
        {/* sent must win over optedIn: submitting the form flips emailDone
            (and so the optedIn prop) on the same render, and without this
            guard the plain notice would replace the YOU'RE IN view before
            the visitor ever saw the on-screen checklist link. */}
        {(!sent && (TIER === 'member' || OPTED_IN_PARAM || optedIn)) ? (
          <>
            <div className="mono" style={{ fontSize: 9, color: 'var(--green)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>DESKTOP ONLY</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              The Lab doesn't work on mobile (the virtual mixer has too many knobs to fit on a small screen). Come back later on a desktop or laptop. Already on a computer? Make this window bigger and the Lab will load.
            </div>
          </>
        ) : !sent ? (
          <>
            <div className="mono" style={{ fontSize: 9, color: 'var(--green)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>DESKTOP ONLY</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 12 }}>
              The Lab doesn't work on mobile (the virtual mixer has too many knobs to fit on a small screen). Come back later on a desktop or laptop. Already on a computer? Make this window bigger and the Lab will load. In the meantime, check out the free Soundcheck Checklist, a guide to running a flawless soundcheck every time.
            </div>
            <input type="text" autoComplete="given-name" placeholder="First name" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', fontSize: 16, background: '#0a0a0c', color: 'var(--ink)', borderRadius: 6, border: '1px solid #2c9d52', outline: 'none', marginBottom: 8 }}/>
            <input type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" value={val}
              onChange={(e) => { setVal(e.target.value); if (err) setErr(false); }} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              style={{ width: '100%', boxSizing: 'border-box', padding: '11px 13px', fontSize: 16, background: '#0a0a0c', color: 'var(--ink)', borderRadius: 6, border: '1px solid ' + (err ? '#e05a5a' : '#2c9d52'), outline: 'none' }}/>
            {err && <div style={{ fontSize: 10.5, color: '#e98a8a', marginTop: 6 }}>That doesn't look like a valid email address.</div>}
            <button onClick={submit} className="mono ui-no-select" style={{ width: '100%', marginTop: 10, padding: '11px 16px', fontSize: 12, fontWeight: 800, letterSpacing: 1, background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c', border: '1px solid #2c9d52', borderRadius: 6, cursor: 'pointer' }}>GET THE CHECKLIST →</button>
          </>
        ) : (
          <>
            <div className="mono" style={{ fontSize: 9, color: 'var(--green)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>YOU'RE IN</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              Thanks{name ? ', ' + name : ''}. Here's your link to the Soundcheck Checklist. When you're at a computer, open this page again to apply those skills in the Lab.
            </div>
            <a href={CHECKLIST_URL} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{ display: 'block', boxSizing: 'border-box', textDecoration: 'none', textAlign: 'center', width: '100%', marginTop: 12, padding: '11px 16px', fontSize: 12, fontWeight: 800, letterSpacing: 1, background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c', border: '1px solid #2c9d52', borderRadius: 6, cursor: 'pointer' }}>OPEN THE SOUNDCHECK CHECKLIST →</a>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tiers and the combined scenario list ────────────────────────────────
// One app, two Circle pages. The member page embeds this same URL with
// ?tier=member on the iframe src; the free page embeds it bare. The free
// page still SHOWS Practice Mode in the picker — locked, doing quiet sales
// work — and clicking it shows a short member pitch instead of the
// scenario. A query parameter is obscurity, not security; accepted by
// design (the paid value is the endless reps, coaching, and community).
// The member tier is password-gated AT THE SOURCE, not just at the button:
// landing directly on ?tier=member (typed, bookmarked, or a hand-edited embed)
// asks for the password. A wrong or cancelled answer drops the param from the
// address bar and loads the free tier. The paid value (endless reps, coaching,
// community) still lives behind the Circle access group; this only stops a
// casual visitor from flipping the tier by hand.
let TIER = 'free';

// Initialize tier - do async unlock check if needed
async function initTier() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tier') !== 'member') {
      TIER = 'free';
      return;
    }
    if (window.UnlockSystem) {
      try {
        const result = await window.UnlockSystem.readUnlock();
        if (result.unlocked) {
          TIER = 'member';
          // Clean URL of tier param since unlocked
          try { window.history.replaceState(null, '', freeVariantUrl()); } catch (e) {}
          return;
        }
      } catch (e) {
        // Unreadable unlock state must still ask: the outer catch would drop
        // the member link to free silently, with no prompt at all.
      }
    }
    // Fallback to password prompt
    var r = requestMemberPassword();
    if (r === 'ok') {
      TIER = 'member';
      try { window.history.replaceState(null, '', freeVariantUrl()); } catch (e) {}
      return;
    }
    try { window.history.replaceState(null, '', freeVariantUrl()); } catch (e) {}
    if (r === 'wrong') {
      window.alert('Incorrect password — showing the free version.');
    }
    TIER = 'free';
  } catch (e) {
    TIER = 'free';
  }
}

// Do initial tier check (synchronous for non-member case)
(function() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tier') !== 'member') {
      TIER = 'free';
    }
  } catch (e) {
    TIER = 'free';
  }
})();

// Funnel landing: logged before the tier flow runs so a stall there can't
// lose it. The query string carries the entry context (tier/optedin/rep/v),
// truncated so a pasted URL can't bloat the ring buffer.
try { track('landing', { q: String(window.location.search || '').slice(0, 160) }); } catch (e) {}

// initTier shipped in a8e16fd but had no call site, so ?tier=member never
// prompted — it silently loaded the free tier. It settles on the promise
// chain after the root render below, and nothing React-side observes TIER,
// so the __remountApp hook at the mount point is what applies the member tier.
initTier().then(() => {
  if (TIER === 'member' && typeof window.__remountApp === 'function') window.__remountApp();
});

// Shared-rep deep link: ?rep=SEED (optionally &faults=N) loads the exact same
// Practice rep for anyone who opens it — reps are already seeded, so the seed
// reproduces the scenario bit-for-bit. Kyle hands a rep to a YouTube audience
// or drops one in a coaching thread; everyone gets the identical fault(s).
// The link bypasses the member lock for that one rep (it's a curated taste);
// on the free tier, finishing it points at the membership instead of rolling
// a fresh one.
const REP_PARAM = (() => {
  try {
    const u = new URLSearchParams(window.location.search);
    const r = u.get('rep');
    if (r == null) return null;
    const seed = parseInt(r, 10);
    if (!Number.isFinite(seed) || seed < 0) return null;
    let faults = parseInt(u.get('faults') || '1', 10);
    if (!(faults === 1 || faults === 2 || faults === 3)) faults = 1;
    return { seed: seed >>> 0, faults };
  } catch (e) { return null; }
})();

// Author mode (?author=1): Kyle's scenario builder. Sets the board to anything,
// captures the goal, writes the prompt text, and copies a ?scenario= link.
const AUTHOR_MODE = (() => {
  try { return new URLSearchParams(window.location.search).get('author') === '1'; } catch (e) { return false; }
})();

// A custom scenario, opened from a ?scenario=<base64> link. Carries the exact
// board state the author set (the student's starting point), the win conditions
// (the goal), and the four text fields. Decoded once at load; everyone who opens
// the link gets the identical scenario, members or YouTube viewers alike.
const SCENARIO_PARAM = (() => {
  try {
    const code = new URLSearchParams(window.location.search).get('scenario');
    if (!code) return null;
    const json = decodeURIComponent(escape(window.atob(code)));
    const data = JSON.parse(json);
    if (!data || typeof data.s !== 'object' || data.s === null) return null;
    return data; // { s: startState, c: [conditions], t: {title, symptom, hint, solution} }
  } catch (e) { return null; }
})();

// The default goal when an author doesn't capture one: restore the full mix,
// every band source audible IN the PA (heard in the room). Uses the combined
// 'pa' check (louder side), not both pa_l and pa_r, so pan is a free creative
// choice rather than a fault. Matches the lessons and Practice Mode.
const RESTORE_CONDITIONS = [];
['vocal', 'vocal2', 'guitar', 'laptop'].forEach((src) => {
  RESTORE_CONDITIONS.push({ source: src, dest: 'pa', min: 0.2 });
});

// Overwrite a fresh state with an authored/captured board state. The captured
// blob came from a live state so it has the right shape; we drop transient
// fields (a captured pop would fire on load) and keep the rest.
function applyCapturedState(s, captured) {
  if (!captured || typeof captured !== 'object') return s;
  Object.keys(captured).forEach((k) => {
    if (k === 'phantomPop') return;
    s[k] = captured[k];
  });
  s.phantomPop = null;
  return s;
}

// The picker runs off one combined list: the free Essentials in order, then
// Practice Mode. isChallenge switches the test presentation (hint behind a
// button, debrief instead of an answer key, seeded random faults);
// isPractice adds the endless-rep behavior (FAULTS difficulty selector,
// rep counter, "next rep" instead of "next level").
const SCENARIOS = [
  ...window.LEVELS.map((l) => ({ ...l, isLesson: true })),
  ...(window.PRACTICE ? [{ ...window.PRACTICE, isChallenge: true, isPractice: true }] : []),
  ...(window.FEEDBACK_MODE ? [{ ...window.FEEDBACK_MODE, isChallenge: true, isFeedbackMode: true }] : []),
  // Free Play / sandbox. The band is up and the system is healthy; there is no
  // fault, no win, no clock. A frictionless place to poke at a real console
  // (and to meet the digital surface). Free and never email-gated because it
  // sits past the LEVELS range. isSandbox (not isChallenge) so it never locks.
  // The healthy board is defaultState plus bass phantom on (so all four band
  // sources are audible), the same base the authoring flow uses.
  {
    id: 'sandbox', isSandbox: true,
    title: 'Free Play',
    symptom: 'Nothing is broken and there is no goal. Move faders, set gains, build a monitor mix, and switch between the analog and digital surface. Turn the sound on to hear what changes. For a challenge, open the lessons or a practice round from the menu above.',
    conditions: [],
    involves: [1, 2, 3, 4],
    defaultInspect: 'pa',
    sabotage: (s) => {
      if (s.channels[2]) s.channels[2].phantom = true;
      // Bring the four wedges up to a working stage level. Two reasons: (1) the
      // monitors are audible the moment a send is opened (they sit at 0 in the
      // default board, which left Free Play's wedges silent), and (2) at 0.7 you
      // can build a healthy monitor mix (a vocal send up to ~two-thirds is
      // clean), and pushing a send past that walks the wedge into feedback the
      // way a real hot monitor does: one frequency first, then more as you keep
      // pushing (the realistic multi-resonance profile). PA is already up at 0.7.
      ['wedge', 'wedge2', 'wedge3', 'wedge4'].forEach((k) => {
        if (s.outputs[k]) { s.outputs[k].on = true; s.outputs[k].mute = false; s.outputs[k].volume = 0.7; }
      });
      return s;
    },
  },
  // The free MIXER TUTORIAL: the console broken into one focused lesson per
  // control, so a student can drop into a single part (master section, gain,
  // the fader, pan, the monitor send) and refresh it without sitting through
  // the whole tour. Each is a guided walkthrough on a healthy, already-playing
  // board (no fault, no win; the win effect skips isWalkthrough). `mixerSteps`
  // indexes into WALK_STEPS, which is defined further down and resolved at
  // render time. Same sabotage (healthy board, bass DI powered) as Free Play.
  ...[
    { id: 'mix-master', title: 'The master section', mixerSteps: [0] },
    { id: 'mix-pfl',    title: 'Check a channel (PFL)', mixerSteps: [1] },
    { id: 'mix-gain',   title: 'Gain',                mixerSteps: [2] },
    { id: 'mix-fader',  title: 'The channel fader',   mixerSteps: [3] },
    { id: 'mix-pan',    title: 'Pan',                 mixerSteps: [4] },
    { id: 'mix-aux',    title: 'The monitor send',    mixerSteps: [5] },
  ].map((m) => ({
    ...m, isWalkthrough: true, isMixerLesson: true,
    symptom: 'A guided tour of one part of the console.',
    conditions: [], involves: [1, 2, 3, 4], defaultInspect: 'pa',
    sabotage: (s) => {
      if (s.channels[2]) s.channels[2].phantom = true;
      // This course is about the mixer, so everything downstream is already set
      // up: the PA and all four wedges are on at a nominal level, so sound flows
      // the moment the student sends a channel there. (The wedges sit at 0 in the
      // default board, which would make the monitor-send lesson silent.)
      s.outputs.pa_l.volume = 0.7; s.outputs.pa_r.volume = 0.7;
      ['wedge', 'wedge2', 'wedge3', 'wedge4'].forEach((k) => {
        if (s.outputs[k]) { s.outputs[k].on = true; s.outputs[k].mute = false; s.outputs[k].volume = 0.6; }
      });
      return s;
    },
  })),
  // START HERE — the free first-impression course (lesson-style, on a playing
  // board). Appended AFTER the LEVELS.length-based Practice index is fixed, so
  // it never shifts Practice / Feedback / sandbox. isStartHere keeps it free
  // (see isLocked) and groups it as its own picker course.
  ...(Array.isArray(window.START_HERE) ? window.START_HERE.map((l) => ({ ...l, isLesson: true, isStartHere: true })) : []),
];

// The Scenario Library: a curated, growing shelf of real-world situations Kyle
// authors and ships in content.js (window.SCENARIO_LIBRARY). Each entry is the
// decoded form of an authored scenario: the start board, the win conditions,
// and the four text fields. They play exactly like a custom ?scenario= link but
// they're persistent and browsable. Member-gated (the depth that earns the
// membership); any single one can still be handed out as a free ?scenario= link.
function libraryToScenario(e, i) {
  return {
    id: 'lib_' + (e.id || i), isChallenge: true, isLibrary: true,
    title: e.title || 'Library Scenario',
    symptom: e.symptom || 'Sort out the system.',
    hint: e.hint || '',
    solution: e.solution || 'Scenario complete.',
    conditions: (Array.isArray(e.conditions) && e.conditions.length) ? e.conditions : RESTORE_CONDITIONS,
    involves: e.involves || [1, 2, 3, 4],
    defaultInspect: e.defaultInspect || 'pa',
    tags: Array.isArray(e.tags) ? e.tags : [],
    sabotage: (s) => applyCapturedState(s, e.start),
  };
}
if (Array.isArray(window.SCENARIO_LIBRARY)) {
  window.SCENARIO_LIBRARY.forEach((e, i) => SCENARIOS.push(libraryToScenario(e, i)));
}
// Monitor World (members' course) appended after the existing scenarios so the
// Practice index (window.LEVELS.length) and everything keyed off it stay put.
// Member-gated via isLesson; isMonitor groups them under their own picker mode.
if (Array.isArray(window.MONITOR_WORLD)) {
  window.MONITOR_WORLD.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isMonitor: true }));
}
// Patching course (members). isPatching groups them under their own PATCHING
// picker band; member-gated via isLesson (not isStartHere). Pushed after the
// LEVELS.length Practice index is fixed, so scenario indices don't shift.
if (Array.isArray(window.PATCHING)) {
  window.PATCHING.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isPatching: true }));
}

// Power course (members). Same shape as Patching: its own POWER picker band,
// member-gated via isLesson.
if (Array.isArray(window.POWER)) {
  window.POWER.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isPower: true }));
}

// Input Setup course (members). Same shape: its own INPUT picker band.
if (Array.isArray(window.INPUT_SETUP)) {
  window.INPUT_SETUP.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isInputSetup: true }));
}

// System Level course (members): how loud the system should be, set from a
// reference track at the speakers rather than at the master fader.
if (Array.isArray(window.SYSTEM_LEVEL)) {
  window.SYSTEM_LEVEL.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isSystemLevel: true }));
}

// 16-Channel Mode (members): how to work the big board — the STAGE / MIXER
// toggle, the Input List on sixteen strips, and the four wedges.
if (Array.isArray(window.BIG_BOARD)) {
  window.BIG_BOARD.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isBigBoard: true }));
}

// Soundcheck (members): line check, gains, main mix, monitors — Kyle's
// Soundcheck Checklist run end to end on the 16-channel band.
if (Array.isArray(window.SOUNDCHECK)) {
  window.SOUNDCHECK.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isSoundcheck: true }));
}

// Managing Feedback (members): the causes and cures of the squeal — gain before
// feedback, mic placement, fewer open mics, ring-out and HPF. Its own FBK picker
// band, member-gated via isLesson.
if (Array.isArray(window.MANAGE_FEEDBACK)) {
  window.MANAGE_FEEDBACK.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isFeedbackCourse: true }));
}

// The Gig (members): the capstone challenge. isLesson keeps it member-gated
// and puts it in the picker; isChallenge on the entry itself hides the answer
// key and puts the hint behind a button, the way Practice does.
if (Array.isArray(window.THE_GIG)) {
  window.THE_GIG.forEach((l) => SCENARIOS.push({ ...l, isLesson: true, isTheGig: true }));
}

// A custom scenario opened from a ?scenario= link gets appended as its own
// scenario. It behaves like a challenge (hint behind a button, a debrief, no
// answer key), wins on the authored conditions, and its sabotage just lays down
// the authored start state. The lock is bypassed at load so a YouTube viewer
// can play it. Appended AFTER the library so its index is past every library row.
const CUSTOM_INDEX = SCENARIO_PARAM ? SCENARIOS.length : -1;
if (SCENARIO_PARAM) {
  const sp = SCENARIO_PARAM;
  const t = sp.t || {};
  SCENARIOS.push({
    id: 'custom', isChallenge: true, isCustom: true,
    title: t.title || 'Custom Scenario',
    symptom: t.symptom || 'Sort out the system.',
    hint: t.hint || '',
    solution: t.solution || 'Scenario complete.',
    conditions: (Array.isArray(sp.c) && sp.c.length) ? sp.c : RESTORE_CONDITIONS,
    involves: [1, 2, 3, 4],
    defaultInspect: 'pa',
    sabotage: (s) => applyCapturedState(s, sp.s),
  });
}
// Build environment: staging (content-staging.js / staging.html) vs production
// (content.js / index.html). Detected exactly like the version badge, so the two
// deployed files stay identical except for the one <script src> line. Used to
// keep prototype-only surfaces (the 8/16 console-size selector, the ?band entry)
// live on staging but hidden on production while the bigger console is built out.
const IS_STAGING = (() => {
  try {
    const srcs = Array.prototype.map.call(document.scripts, (s) => s.src);
    const src = srcs.filter((s) => /content[a-z-]*\.js\?v=/.test(s))[0] || '';
    const path = (typeof location !== 'undefined' && location.pathname) || '';
    return /content-staging/.test(src) || /staging/i.test(path);
  } catch (e) { return false; }
})();
window.IS_STAGING = IS_STAGING;

// The 16-channel Free Play board: the same recorded performance as the MX-8
// sandbox, with all of its inputs up on a bigger desk (bandState). Always
// present so the Free Play size selector can switch to it (member-gated). It
// maps to the 'PLAY' band, which the picker never lists, so it stays out of the
// menu — reached only through the selector, or the ?band=1 test link.
const BAND_INDEX = SCENARIOS.length;
SCENARIOS.push({
  id: 'band', isSandbox: true, isBand: true,
  title: 'Free Play',
  symptom: 'A 16-channel mixer with every input up and the system healthy. Nothing is broken and there is no goal here. Move faders, set gains, and build a mix on the bigger desk. Switch back to 8 channels any time from the size selector above.',
  conditions: [], involves: [], defaultInspect: 'pa',
  sabotage: () => {
    const s = bandState();
    ['wedge', 'wedge2', 'wedge3', 'wedge4'].forEach((k) => { if (s.outputs[k]) { s.outputs[k].on = true; s.outputs[k].mute = false; s.outputs[k].volume = 0.7; } });
    // Mute the FOH playback line (the 15/16 stereo strip) by default: the 14
    // inputs already ARE the performance, so the playback music bed would clash
    // with them. The user can unmute it if they want to hear the reference mix.
    const pb = s.channels.find((c) => c.stereo);
    if (pb) pb.mute = true;
    return s;
  },
});
// ?band=1 still auto-loads the 16-channel board on load (staging-only, for our
// own testing). Everyone else reaches it through the member-gated size selector.
const BAND_PARAM = IS_STAGING && (() => { try { return new URLSearchParams(window.location.search).get('band') === '1'; } catch (e) { return false; } })();

// Free-tier "already opted in" flag. A follow-up email link (or a returning
// visitor who already gave their email) carries ?optedin=1, so the email ask
// is skipped — Kit already has them, don't ask twice. Works in production,
// so it is NOT staging-gated. Members never see the gate anyway.
const OPTED_IN_PARAM = (() => { try { return new URLSearchParams(window.location.search).get('optedin') === '1'; } catch (e) { return false; } })();

// Free tier composition: the Start Here course, the Mixer Tutorial, Free Play,
// a Practice taste (budget below), and one Feedback ring-out taste. The email
// ask fires after the FIRST Start Here win (moved from the finale 2026-10-18,
// council — see the firstWinEmail effect below). Members-only depth: Run the
// Show, the Scenario Library and the Monitor World course (this lock) —
// everything else is either free or soft-gated by a budget in loadLevel.
const isLocked = (sc) => !!(sc && TIER !== 'member' && (sc.isLibrary || sc.isMonitor || (sc.isLesson && !sc.isStartHere)));
// The Feedback ring-out is a single free taste: a free viewer rings out one
// wedge, then re-entry (and NEXT WEDGE) shows the member pitch. Tracked on the
// existing completed ledger (set when the ring-out is solved), so no new field.
const FEEDBACK_ID = window.FEEDBACK_MODE ? window.FEEDBACK_MODE.id : null;

// Indices of the unlocked, no-win scenarios the app jumps to directly (the
// welcome walkthrough and Free Play). Computed once after SCENARIOS is
// assembled; -1 if absent.
const SANDBOX_INDEX = SCENARIOS.findIndex((s) => s.isSandbox);
const WALKTHROUGH_INDEX = SCENARIOS.findIndex((s) => s.isWalkthrough);
// The Mixer Tutorial lessons in order, so finishing one can lead into the next.
const MIXER_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isMixerLesson);
// The free "Start Here" course, in order, and the id of its finale (where the
// email opt-in + join CTA fire).
const START_HERE_INDEX = SCENARIOS.findIndex((s) => s.isStartHere);
const START_HERE_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isStartHere);
// Patching course lesson indices, for the "PATCHING · 01 / 03" top-bar label.
const PATCHING_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isPatching);
// Power course lesson indices, for the "POWER · 01 / 05" top-bar label.
const POWER_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isPower);
// Input Setup course lesson indices, for the "INPUT SETUP · 01 / 05" label.
const INPUT_SETUP_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isInputSetup);
const SYSTEM_LEVEL_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isSystemLevel);
const BIG_BOARD_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isBigBoard);
const SOUNDCHECK_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isSoundcheck);
const FEEDBACK_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isFeedbackCourse);
const THE_GIG_INDEXES = SCENARIOS.map((s, i) => i).filter((i) => SCENARIOS[i].isTheGig);
const SH_FINALE_ID = 105;
// Where a visitor lands with no resume target: members go to lesson 1 of Run
// the show; the free tier (lessons locked) lands on Free Play, never on a
// locked lesson board.
function getHomeIndex() {
  return (TIER === 'member') ? 0 : (START_HERE_INDEX >= 0 ? START_HERE_INDEX : (SANDBOX_INDEX >= 0 ? SANDBOX_INDEX : 0));
}
let HOME_INDEX = getHomeIndex();

// Free-tier Practice taste: a free viewer gets this many real Practice reps
// before the membership gate. The point is to let the endless-mastery value be
// FELT (a door walked through and pulled back from), not just described behind
// a lock. Feedback Mode and custom authoring stay fully member-gated; only
// Practice Mode is soft-gated by this budget. Members are never counted.
const FREE_PRACTICE_LIMIT = 5;
// Ear Training free taste: three guided rounds, then the membership pitch — and
// on that pitch, one by-ear round is offered as the alternative to joining, to
// show how hard the real thing is before they commit.
const FREE_ET_GUIDED = 3;
const FREE_ET_BYEAR = 1;

// Picker bands — every scenario maps to one of four bands via bandOf(). The
// mode picker groups by these IDs: Learn (the Essentials), Practice (Practice +
// Feedback + Library), and Free Play. Adding a pack or a lesson track later
// means pointing bandOf() at it.
function bandOf(l) {
  if (l.isWalkthrough) return 'PLAY';  // the guided tour, entered directly, never a picker row
  if (l.isMonitor) return 'MONITOR';   // Monitor World course (members)
  if (l.isPatching) return 'PATCHING'; // Patching course (members)
  if (l.isSystemLevel) return 'SYSTEM';  // System Level course (members)
  if (l.isBigBoard) return 'BIG16';      // 16-Channel Mode orientation (members)
  if (l.isSoundcheck) return 'CHECK';    // Soundcheck course (members)
  if (l.isFeedbackCourse) return 'FBK';  // Managing Feedback course (members)
  if (l.isTheGig) return 'GIG';          // The Gig capstone (members)
  if (l.isPower) return 'POWER';       // Power Up / Power Down course (members)
  if (l.isInputSetup) return 'INPUT';  // Input Setup course (members)
  if (l.isSandbox) return 'PLAY';      // free, no-goal exploration
  if (l.isLibrary) return 'LIBRARY';   // curated, browsable real-world scenarios
  if (l.isChallenge) return 'DRILL';   // Practice + Feedback Mode + any future packs
  return 'LEARN';
}

// THE DRILL LADDER — a guided progression through Practice Mode that gives a
// returning member a defined next step. Each rank is a rung the member climbs
// by clean solves (no hints, at/under par, no false sign-off): RANK_GATE clean
// solves that meet the rung's bar advance to the next. It never LOCKS the
// FAULTS selector — members keep their free choice — it just tracks the highest
// rung reached and points at the next. need(d) takes a solved rep's difficulty
// { faults, zeroFault } and returns whether that clean solve counts here.
// Ranks 1-5 are live and cap progression (HIGHEST_LIVE_RANK). need(d) takes a
// solved rep's difficulty { faults, zeroFault, liveShow, dropouts } and returns
// whether that clean solve counts toward leaving this rung. The whole thing
// rides the profile envelope: rank + rankClean persist and travel in the save
// code. (By-ear rungs were removed 2026-06-13: the meters are a primary tool.)
const RANK_GATE = 3;
const HIGHEST_LIVE_RANK = 4;
const RANKS = [
  { n: 1, label: 'Find one',   blurb: 'One fault to find.',              faults: 1, need: (d) => d.faults >= 1 },
  { n: 2, label: 'Find two',   blurb: 'Two faults at once.',            faults: 2, need: (d) => d.faults >= 2 },
  { n: 3, label: 'Find three', blurb: 'Three faults at once.',          faults: 3, need: (d) => d.faults >= 3 },
  { n: 4, label: 'Live show',  blurb: 'Fix it while the show is running.', faults: 2, liveShow: true, need: (d) => d.liveShow && d.faults >= 1 && d.dropouts === 0 },
];
const rankByN = (n) => RANKS.find((r) => r.n === n) || RANKS[0];

// FAULT FRESHNESS — the retention model. A fault type is "solid" when it was
// solved cleanly within the freshness window; otherwise it "needs practice"
// (whether it has gone stale or was never cleaned). The headline a member sees
// is how many of the fault types they can currently handle cleanly. All of it
// is computed from the ledger the app already keeps (per fault: a clean count
// plus lastClean time), so it costs zero authoring and runs as long as the
// auto-generator does. Digital-only faults are excluded (they only appear on
// the digital surface); the count is over the always-available pool.
const SOLID_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
function coverageFrom(ledger, faults) {
  const led = ledger || {};
  const pool = (faults || []).filter((f) => !f.digital);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let solid = 0; const needs = []; let lastAny = 0;
  for (const f of pool) {
    const e = led[f.key];
    const lastClean = (e && e.lastClean) ? e.lastClean : 0;
    if (lastClean > 0 && (now - lastClean) <= SOLID_WINDOW_MS) solid += 1;
    else needs.push({ key: f.key, label: f.label || f.key });
    if (e && e.last && e.last > lastAny) lastAny = e.last;
  }
  return { solid, total: pool.length, needs, lastPracticedDays: lastAny ? Math.floor((now - lastAny) / dayMs) : null };
}

// Small fast seeded PRNG (mulberry32). Challenge sabotages take (s, rng) and
// place the fault with it, so replaying a challenge is a fresh rep instead
// of a memory test. The seed lives in a ref: Reset replays the SAME attempt
// (same seed), Practice Again rolls a new one. Essentials ignore the rng and
// stay deterministic.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Progress save codes — insurance with no backend. Browser storage inside a
// Circle iframe can be partitioned or cleared, which would silently wipe a
// member's completion map. The code is just the completed map as base64 JSON:
// copy it somewhere safe, paste it to restore. encode returns null only if
// something is deeply wrong; decode returns null for anything that doesn't
// parse back to a {id: true} map, so garbage input can't corrupt progress.
// The save code is just the whole profile, base64'd. encode takes a profile;
// decode returns a normalized profile (or null on garbage). A valid code must
// at least carry a completed map, which both v1 and v2 codes do, so legacy
// codes restore cleanly and any future fields ride along untouched.
function encodeProgressCode(profile) {
  try { return btoa(JSON.stringify(normalizeProfile(profile))); } catch (e) { return null; }
}
function decodeProgressCode(code) {
  try {
    const data = JSON.parse(atob((code || '').trim()));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    if (typeof data.completed !== 'object' || data.completed === null || Array.isArray(data.completed)) return null;
    return normalizeProfile(data);
  } catch (e) { return null; }
}

// The save-code modal. Three jobs, in order of how often they're needed:
// copy your code (backup), paste a code (restore), start over (reset, with a
// click-again confirm so one stray click can't wipe a member's history).
// Human-readable name for a practice fault key, taken from PRACTICE_FAULTS
// (content.js) so the ledger panel and the future fault catalog share one
// source of truth. Falls back to the raw key if a label is ever missing.
function faultLabel(key) {
  if (key === '__signoff') return 'Healthy sign-off'; // the zero-fault rep
  if (key && key.indexOf('__goal:') === 0) { // a positive task, not a fault
    const gk = key.slice(7);
    try {
      const g = (window.PRACTICE_GOALS || []).find((x) => x.key === gk);
      if (g && g.label) return g.label;
    } catch (e) {}
    return gk;
  }
  try {
    const f = (window.PRACTICE_FAULTS || []).find((x) => x.key === key);
    if (f && f.label) return f.label;
  } catch (e) {}
  return key;
}

function ProgressModal({ open, onClose, profile, onRestore, onResetProgress }) {
  const [paste, setPaste] = uS('');
  const [msg, setMsg] = uS(null);
  const [confirmReset, setConfirmReset] = uS(false);
  const [tab, setTab] = uS('save'); // 'save' (backup/restore) | 'training' (the ledger)
  uE(() => { if (open) { setPaste(''); setMsg(null); setConfirmReset(false); setTab('training'); } }, [open]);
  if (!open) return null;
  const code = encodeProgressCode(profile) || '';
  const doneCount = Object.keys((profile && profile.completed) || {}).length;
  const copy = () => {
    try {
      navigator.clipboard.writeText(code);
      setMsg({ ok: true, text: 'Copied. Keep it somewhere safe, like a note or an email to yourself.' });
    } catch (e) {
      setMsg({ ok: false, text: 'Copy failed. Select the code and copy it by hand.' });
    }
  };
  const restore = () => {
    const decoded = decodeProgressCode(paste);
    if (!decoded) { setMsg({ ok: false, text: 'That code doesn\'t look right. Paste the whole code, exactly as it was copied.' }); return; }
    onRestore(decoded);
    const n = Object.keys(decoded.completed).length;
    setMsg({ ok: true, text: 'Progress restored: ' + n + ' scenario' + (n === 1 ? '' : 's') + ' marked complete' + (decoded.reps != null && decoded.reps > 0 ? ', ' + decoded.reps + ' practice reps' : '') + '.' });
  };
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '7px 9px', fontSize: 10,
    background: '#0a0a0c', color: 'var(--ink)', border: '1px solid #38383e',
    borderRadius: 4, fontFamily: 'monospace',
  };
  const smallBtn = (color) => ({
    padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
    color, background: 'transparent', border: '1px solid ' + color,
    borderRadius: 4, cursor: 'pointer',
  });
  // YOUR TRAINING tab — the per-fault ledger in plain coach language, no
  // medals. Weakest fault first, so the member can see what to drill.
  const trainingView = () => {
    // Just the daily streak. The old rep/clean synopsis and per-fault breakdown
    // were noise: troubleshooting is about getting it done, not efficiency, so
    // move counts and clean-vs-par framing are out (Kyle 2026-07-06).
    const streakNow = liveStreak(profile);
    const streakBest = (profile && profile.streakBest) || 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', background: streakNow > 0 ? 'rgba(255,201,58,0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid ' + (streakNow > 0 ? 'rgba(255,201,58,0.3)' : '#2a2a2e'), borderRadius: 6 }}>
        <div className="display" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: streakNow > 0 ? 'var(--accent)' : 'var(--ink-3)', minWidth: 24, textAlign: 'center' }}>{streakNow}</div>
        <div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: 1.3, fontWeight: 800, color: streakNow > 0 ? 'var(--accent)' : 'var(--ink-3)' }}>DAY STREAK</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.4, marginTop: 2 }}>
            {streakNow > 0 ? 'Finish a session tomorrow to keep it going.' : 'Finish a session today to start one.'}
            {streakBest > 1 ? ' Your best is ' + streakBest + ' days.' : ''}
          </div>
        </div>
      </div>
    );
  };
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.65)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 460, maxWidth: '90vw', background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
        border: '1px solid #38383e', borderRadius: 8, padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 16, fontWeight: 800 }}>Your training</div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{doneCount} complete</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['training', 'YOUR TRAINING'], ['save', 'SAVE CODE']].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} className="mono ui-no-select" style={{
              padding: '5px 11px', fontSize: 9, fontWeight: 800, letterSpacing: 0.8, borderRadius: 4, cursor: 'pointer',
              background: tab === id ? 'rgba(106,169,255,0.16)' : 'transparent',
              color: tab === id ? 'var(--cool)' : 'var(--ink-3)',
              border: '1px solid ' + (tab === id ? 'var(--cool)' : '#38383e'),
            }}>{lbl}</button>
          ))}
        </div>
        {tab === 'training' ? trainingView() : (
          <>
            <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              Progress saves in this browser automatically. A save code is your backup: copy it somewhere safe, and if this browser ever forgets (a cleared cache, a new computer), paste it back here.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="mono" style={{ fontSize: 8.5, color: 'var(--cool)', letterSpacing: 1.4, fontWeight: 700 }}>YOUR SAVE CODE</div>
              <textarea readOnly value={code} rows={2} style={{ ...inputStyle, resize: 'none' }} onFocus={(e) => e.target.select()}/>
              <button onClick={copy} className="mono ui-no-select" style={{ ...smallBtn('var(--cool)'), alignSelf: 'flex-start' }}>COPY CODE</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="mono" style={{ fontSize: 8.5, color: 'var(--amber)', letterSpacing: 1.4, fontWeight: 700 }}>RESTORE FROM A CODE</div>
              <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2} placeholder="Paste a save code here" style={{ ...inputStyle, resize: 'none' }}/>
              <button onClick={restore} disabled={!paste.trim()} className="mono ui-no-select" style={{ ...smallBtn('var(--amber)'), alignSelf: 'flex-start', opacity: paste.trim() ? 1 : 0.4 }}>RESTORE</button>
            </div>
          </>
        )}
        {msg && (
          <div style={{ fontSize: 11, lineHeight: 1.4, color: msg.ok ? 'var(--green)' : 'var(--hot)' }}>{msg.text}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2a2a2e', paddingTop: 10 }}>
          <button onClick={() => {
            if (!confirmReset) { setConfirmReset(true); return; }
            onResetProgress(); setConfirmReset(false);
            setMsg({ ok: true, text: 'Progress reset. Every scenario is unfinished again.' });
          }} className="mono ui-no-select" style={smallBtn(confirmReset ? 'var(--hot)' : 'var(--ink-3)')}>
            {confirmReset ? 'CLICK AGAIN TO CONFIRM' : 'RESET PROGRESS'}
          </button>
          <button onClick={onClose} className="mono ui-no-select" style={smallBtn('var(--ink-2)')}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}

// Locks the brief/solved sidebar slot to its measured height at level load.
// Without this, warning text swapping in and out (feedback, clipping, pop
// messages) changes the BriefCard's height, which changes the canvas height,
// which changes the scale-to-fit factor — and every control on the board
// shifts while the student is mid-gesture. With the lock, the slot is a
// fixed box for the whole level: content swaps inside it, and content
// taller than the lock paints downward into the empty space below the slot
// (overflow visible) instead of re-flowing the board. Re-measures only when
// the level changes. Window resizes are safe to ignore: the canvas lays out
// at a fixed design width, so text wraps identically at every window size.
function StableSlot({ levelKey, children }) {
  const ref = uR(null);
  const [lockH, setLockH] = uS(null);
  uE(() => { setLockH(null); }, [levelKey]);
  uE(() => {
    if (lockH == null && ref.current) setLockH(ref.current.offsetHeight);
  }, [lockH]);
  return (
    <div ref={ref} style={{ height: lockH != null ? lockH : 'auto', overflow: 'visible', position: 'relative' }}>
      {children}
    </div>
  );
}

// First-run greeting. One card, one promise, one button that hands the
// visitor straight into lesson 1. Deliberately NOT a syllabus: the lab
// teaches itself through the coaching box and spotlight, exactly when each
// piece becomes relevant. A wall of instructions before any action reads as
// homework and bounces cold visitors, so we keep this to a single breath.
function TourOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 440, maxWidth: '92vw', background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
        border: '1px solid var(--accent)', borderRadius: 10, padding: '28px 26px',
        boxShadow: '0 0 0 1px rgba(255,201,58,0.15), 0 16px 48px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center',
      }}>
        <img src={window.AU_LOGO} alt="Audio University" style={{ height: 46, width: 46, display: 'block' }}/>
        <div className="display" style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.12 }}>Welcome to the Troubleshooting Lab</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, maxWidth: 360 }}>
          Build and test your live sound skills (without a live audience).
        </div>
        <button onClick={onClose} className="mono ui-no-select" style={{
          marginTop: 4, padding: '12px 26px', fontSize: 12, fontWeight: 800, letterSpacing: 1.5,
          background: 'linear-gradient(180deg, var(--accent), #c79a1f)', color: '#0a0a0c',
          border: '1px solid #c79a1f', borderRadius: 6, cursor: 'pointer',
        }}>LET'S GO →</button>
      </div>
    </div>
  );
}

// Start Here completion card. Opens from the SolvedCard's ALL LEVELS
// COMPLETE button at the finale win (2026-10-18: click-to-open so it never
// auto-fires over an open Monitor EQ window from the ring-out). The free
// tier gets the membership pointer; members get sent straight to Practice
// Mode. No URL on purpose — the page this app is embedded in carries the
// join link.
function CompletionCta({ open, onClose, tier, onGoPractice }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 92, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 470, maxWidth: '92vw', background: 'linear-gradient(180deg,#0e2415 0%, #0e1a14 100%)',
        border: '1px solid var(--green)', borderRadius: 10, padding: '20px 22px',
        boxShadow: '0 0 0 1px rgba(74,222,128,0.2), 0 16px 48px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--green)', letterSpacing: 2, fontWeight: 700 }}>START HERE · DONE</div>
        <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>You can run a system now.</div>
        {tier === 'member' ? (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.55 }}>
              Practice Mode is open. Something breaks and you fix it, with a new fault each time.
            </div>
            <button onClick={onGoPractice} className="mono ui-no-select" style={{
              alignSelf: 'flex-start', padding: '9px 18px', fontSize: 11, fontWeight: 800, letterSpacing: 1,
              background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
              border: '1px solid #2c9d52', borderRadius: 5, cursor: 'pointer',
            }}>GO TO PRACTICE MODE →</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.55 }}>
              Now put it to work. Practice Mode gives you a broken system to fix, a new fault every time. Unlimited practice, the full Ear Training, and setting up a system from scratch come with Audio University membership.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={onGoPractice} className="mono ui-no-select" style={{
                padding: '9px 18px', fontSize: 11, fontWeight: 800, letterSpacing: 1,
                background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
                border: '1px solid #2c9d52', borderRadius: 5, cursor: 'pointer',
              }}>TRY PRACTICE MODE →</button>
              <a href={joinUrl('completion-card')} onClick={() => track('member_cta_click', { src: 'completion-card' })} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{
                padding: '9px 16px', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
                background: '#16161a', color: 'var(--accent)', border: '1px solid var(--accent)',
                borderRadius: 5, cursor: 'pointer', textDecoration: 'none',
              }}>JOIN AUDIO UNIVERSITY →</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Free-tier email gate, shown once after the FIRST win of the free Start Here
// course (moved from the finale 2026-10-18, council: ask after the payoff, not
// before it — with the finale keeping its completion card and a fallback ask).
// This is a REQUIRED ask by design (no skip): it only ever reaches the cold
// public audience (YouTube). The email-list distribution links carry ?optedin=1,
// so subscribers never see it, and members are excluded by tier. Submit fires
// the Kit signup, then shows the checklist link right on screen (instant
// delivery, and it covers a cold visitor who happens to be subscribed already,
// whom Kit won't re-email) with a CONTINUE button back into whatever they were
// doing — the ask sits mid-course now, so nothing navigates away.
function EmailGate({ open, onSubmit, onSkip }) {
  const [name, setName] = uS('');
  const [val, setVal] = uS('');
  const [err, setErr] = uS(false);
  const [nameErr, setNameErr] = uS(false);
  const [sent, setSent] = uS(false);
  // Funnel: one gate_shown per showing. Hook first, early return after —
  // hook order must stay unconditional.
  uE(() => { if (open) track('gate_shown'); }, [open]);
  if (!open) return null;
  const go = () => {
    const okName = name.trim().length > 0;
    const okEmail = isValidEmail(val);
    setNameErr(!okName); setErr(!okEmail);
    if (!okName || !okEmail) return;
    // Fire the Kit signup right away so the lead lands even if the tab closes
    // on the confirmation view. onSubmit (profile capture + closing the gate;
    // no navigation — the student stays put) runs on CONTINUE.
    submitToKit(val.trim(), name.trim());
    setSent(true);
    track('email_submit');
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(0,0,0,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: 460, maxWidth: '92vw', background: 'linear-gradient(180deg,#0e2415 0%, #0e1a14 100%)',
        border: '1px solid var(--green)', borderRadius: 10, padding: '22px 24px',
        boxShadow: '0 0 0 1px rgba(74,222,128,0.2), 0 16px 48px rgba(0,0,0,0.8)',
        display: 'flex', flexDirection: 'column', gap: 13,
      }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--green)', letterSpacing: 2, fontWeight: 700 }}>FREE · NEXT STEP</div>
        <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>Save your first win</div>
        {sent ? (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              Thanks{name.trim() ? ', ' + name.trim() : ''}. Here's your link to the Soundcheck Checklist:
            </div>
            <a href={CHECKLIST_URL} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{
              display: 'block', textAlign: 'center', padding: '11px 18px', fontSize: 12, fontWeight: 800, letterSpacing: 1,
              background: '#16161a', color: 'var(--green)', border: '1px solid #2c9d52', borderRadius: 6,
              cursor: 'pointer', textDecoration: 'none',
            }}>OPEN THE SOUNDCHECK CHECKLIST →</a>
            <button onClick={() => onSubmit(val.trim(), name.trim())} className="mono ui-no-select" style={{
              width: '100%', padding: '11px 18px', fontSize: 12, fontWeight: 800, letterSpacing: 1,
              background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
              border: '1px solid #2c9d52', borderRadius: 6, cursor: 'pointer',
            }}>KEEP GOING →</button>
          </>
        ) : (
          <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          <div>In Practice Mode, you'll find and solve problems in the sound system.</div>
          <div>First, the Soundcheck Checklist, so you can run these steps at your next show. Enter your email and we'll send it over.</div>
          <div>Next: Practice Mode and Ear Training — each has a free taste waiting.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="text" autoComplete="given-name" placeholder="First name"
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameErr) setNameErr(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '11px 13px', fontSize: 13,
              background: '#0a0a0c', color: 'var(--ink)', borderRadius: 6,
              border: '1px solid ' + (nameErr ? '#e05a5a' : '#2c9d52'), outline: 'none',
            }}/>
          {nameErr && <div style={{ fontSize: 10.5, color: '#e98a8a' }}>What should we call you?</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="email" inputMode="email" autoComplete="email" placeholder="you@email.com"
            value={val}
            onChange={(e) => { setVal(e.target.value); if (err) setErr(false); }}
            onKeyDown={(e) => { if (e.key === 'Enter') go(); }}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '11px 13px', fontSize: 13,
              background: '#0a0a0c', color: 'var(--ink)', borderRadius: 6,
              border: '1px solid ' + (err ? '#e05a5a' : '#2c9d52'), outline: 'none',
            }}/>
          {err && <div style={{ fontSize: 10.5, color: '#e98a8a' }}>That doesn't look like a valid email address.</div>}
        </div>
        <button onClick={go} className="mono ui-no-select" style={{
          width: '100%', padding: '11px 18px', fontSize: 12, fontWeight: 800, letterSpacing: 1,
          background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
          border: '1px solid #2c9d52', borderRadius: 6, cursor: 'pointer',
        }}>TRY PRACTICE MODE →</button>
          </>
        )}
      </div>
    </div>
  );
}

// Welcome chooser: the front door for a brand-new signup. Two paths, side by
// side. Quick fix (led visually, in green) drops them straight into the
// diagnosis game, which is the tool's signature moment; Essentials is the full
// 10-lesson setup course. Either one is a click. Shown once, after the tour and
// the email capture; never again once a path is chosen or any progress exists.
function WelcomeChooser({ open, onQuickFix, onEssentials }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 94, background: 'rgba(0,0,0,0.82)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: 560, maxWidth: '94vw', background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
        border: '1px solid #38383e', borderRadius: 12, padding: '22px 24px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={window.AU_LOGO} alt="Audio University" style={{ height: 40, width: 40, display: 'block' }}/>
          <div>
            <div className="display" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>Where do you want to start?</div>
            <div className="mono" style={{ fontSize: 8.5, color: 'var(--ink-3)', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 3 }}>Two ways in. You can switch any time.</div>
          </div>
        </div>
        {/* Quick fix — the exciting one, led visually. */}
        <div onClick={onQuickFix} className="ui-no-select" style={{
          cursor: 'pointer', border: '1px solid var(--green)', borderRadius: 10, padding: '15px 18px',
          background: 'linear-gradient(180deg,#0e2415 0%, #0e1a14 100%)', display: 'flex', flexDirection: 'column', gap: 5,
          boxShadow: '0 0 0 1px rgba(74,222,128,0.15)', transition: 'box-shadow 0.15s',
        }}
          onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 1px rgba(74,222,128,0.4), 0 0 22px rgba(74,222,128,0.18)'}
          onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 0 1px rgba(74,222,128,0.15)'}>
          <div className="mono" style={{ fontSize: 8.5, color: 'var(--green)', letterSpacing: 1.6, fontWeight: 700 }}>▶ FIND THE PROBLEM</div>
          <div className="display" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.15 }}>Find the fault and fix it.</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>A channel has dropped out of the mix. Read the meters, find what is wrong, and bring it back.</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--green)', fontWeight: 800, letterSpacing: 0.6, marginTop: 3 }}>START A QUICK FIX →</div>
        </div>
        {/* Essentials — the full setup course. */}
        <div onClick={onEssentials} className="ui-no-select" style={{
          cursor: 'pointer', border: '1px solid #38383e', borderRadius: 10, padding: '15px 18px',
          background: '#16161a', display: 'flex', flexDirection: 'column', gap: 5, transition: 'border-color 0.15s',
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#38383e'}>
          <div className="mono" style={{ fontSize: 8.5, color: 'var(--accent)', letterSpacing: 1.6, fontWeight: 700 }}>LEARN THE FULL SETUP · 10 LESSONS</div>
          <div className="display" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.15 }}>Set up a live system with nothing powered on yet.</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>Start at the beginning: patch it, power up in order, set your levels, build a monitor mix, and run a full show, step by step.</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 800, letterSpacing: 0.6, marginTop: 3 }}>START THE ESSENTIALS →</div>
        </div>
      </div>
    </div>
  );
}

// The free "Know your console" walkthrough. A guided tour of the analog board,
// built to mirror how the mixer is taught on the channel: start at the outputs
// (the master section, where every output's level lives), then follow one
// channel in (PFL to check it, gain to set it, the fader into the room, pan to
// place it), then the second mix (the monitor send to the wedge). No invented
// control pairings; the structure is the master section, then the channel. Each
// stop asks the viewer to actually touch the control before NEXT lights up.
const WALK_LEAD = 0; // lead vocal channel — the strip the whole tour anchors on
const WALK_STEPS = [
  {
    act: 'The outputs', title: 'The master section', target: 'master-section',
    teach: "Every output has one control here in the master section. The MAIN fader is the overall volume to the audience. The mute above it cuts the mains. Each AUX master sets the level of one aux output: AUX 1 to Wedge 1, AUX 2 to Wedge 2. AUX 3 and AUX 4 are spare sends on this board.",
    prompt: "Bring the MAIN fader down, then back up. Try an AUX master too.",
    takeaway: "Every output has its own control in the master section: the MAIN fader for the audience, the mute to cut it, and an AUX master for each aux output.",
    test: (s, b) => Math.abs((s.master.fader ?? 0) - b.mfader) > 0.08
      || Math.abs((s.master.aux1 ?? 0.75) - b.maux1) > 0.05 || Math.abs((s.master.aux2 ?? 0.75) - b.maux2) > 0.05
      || Math.abs((s.master.aux3 ?? 0.75) - b.maux3) > 0.05 || Math.abs((s.master.aux4 ?? 0.75) - b.maux4) > 0.05
      || (!!s.master.mute) !== b.mmute,
  },
  {
    act: 'The channel strip', title: 'PFL and the meter', target: 'ch1-pfl',
    teach: "PFL, at the bottom of the strip, checks a channel in your headphones before the audience hears it. It stands for pre-fader listen, so the fader position does not change what you hear. Watch the meter while you listen: yellow is fine, red is too hot.",
    prompt: "Press PFL on the lead vocal to hear just that channel. Press it again to drop back.",
    takeaway: "PFL sends a channel to your headphones and the meter so you can check it before the audience hears it. It is pre-fader, so the fader does not change what you hear.",
    test: (s, b) => (!!s.channels[WALK_LEAD].solo) !== b.solo,
  },
  {
    act: 'The channel strip', title: 'Gain', target: 'ch1-gain',
    teach: "Gain is the preamp knob at the top of the strip. It sets the signal strength right at the input. Turn it up while you watch the meter: bring the signal's average up into the healthy range, around -18, and let the peaks bounce above it with room to spare before the red. Set gain by the meter, not by ear.",
    prompt: "With the lead vocal in PFL, bring its gain up slowly and watch the meter. Ease it back if it hits the red.",
    aside: "The 48V button powers condenser mics. A dynamic mic like this lead vocal does not need it.",
    takeaway: "Gain is the input level, set with the knob at the top of the channel strip, by the meter.",
    test: (s, b) => Math.abs((s.channels[WALK_LEAD].gain ?? 0) - b.gain) > 0.05,
  },
  {
    act: 'The channel strip', title: 'The channel fader', target: 'ch1-fader',
    teach: "The channel fader sets this channel's level in the main mix. Keep it near the U mark, unity: the scale is finer up there, so small moves make small changes. The mute next to it is the channel's on and off.",
    prompt: "Bring the lead vocal fader up into the mix. Try the mute too: the singer drops out, then comes back.",
    takeaway: "The channel fader is that channel's level in the mix. Keep it near unity (U) for the finest control. Mute is its on and off.",
    test: (s, b) => Math.abs((s.channels[WALK_LEAD].fader ?? 0) - b.cfader) > 0.05 || (!!s.channels[WALK_LEAD].mute) !== b.mute,
  },
  {
    act: 'The channel strip', title: 'Pan', target: 'ch1-pan',
    teach: "Pan sets where the channel sits between the left and right speakers: full left, full right, or center for both evenly.",
    prompt: "Pan the lead vocal left, then right, then back to center. It clicks when it reaches center.",
    takeaway: "Pan places the channel between the left and right speakers. Center sends it to both sides evenly.",
    test: (s, b) => Math.abs((s.channels[WALK_LEAD].pan ?? 0.5) - b.pan) > 0.04,
  },
  {
    act: 'The aux sends', title: 'The monitor send', target: 'ch1-aux',
    teach: "The AUX send knobs set how much of this channel goes to each aux output: AUX 1 to Wedge 1, AUX 2 to Wedge 2. That is how you build a separate mix for each person on stage. Turn AUX 1 up and this channel gets louder in Wedge 1, while the main mix stays the same. AUX 3 and AUX 4 are spare sends on this board.",
    prompt: "Turn the lead vocal's AUX 1 up, and you are listening at Wedge 1. Then try AUX 2. It feeds Wedge 2.",
    takeaway: "Each aux send goes out its own output to its own speaker: AUX 1 to Wedge 1, AUX 2 to Wedge 2. The main mix stays separate.",
    test: (s, b) => Math.abs((s.channels[WALK_LEAD].aux1 ?? 0) - b.aux1) > 0.04
      || Math.abs((s.channels[WALK_LEAD].aux2 ?? 0) - b.aux2) > 0.04
      || Math.abs((s.channels[WALK_LEAD].aux3 ?? 0) - b.aux3) > 0.04
      || Math.abs((s.channels[WALK_LEAD].aux4 ?? 0) - b.aux4) > 0.04,
  },
];
function walkSnap(s) {
  const c = (s.channels && s.channels[WALK_LEAD]) || {};
  const m = s.master || {};
  return {
    mfader: m.fader ?? 0, mmute: !!m.mute,
    maux1: m.aux1 ?? 0.75, maux2: m.aux2 ?? 0.75, maux3: m.aux3 ?? 0.75, maux4: m.aux4 ?? 0.75,
    solo: !!c.solo, mute: !!c.mute, gain: c.gain ?? 0, cfader: c.fader ?? 0, pan: c.pan ?? 0.5,
    aux1: c.aux1 ?? 0, aux2: c.aux2 ?? 0, aux3: c.aux3 ?? 0, aux4: c.aux4 ?? 0,
  };
}

// The step panel — lives in the board sidebar (where the BriefCard normally is),
// so the console stays reachable while the panel guides. It snapshots the
// relevant controls when a step begins (or when the steps go live), then
// watches the live board and lights up NEXT once the prompted control moves.
function WalkthroughPanel({ step, steps, total, state, active, onNext, onSkip, lastLesson }) {
  const STEPS = (Array.isArray(steps) && steps.length) ? steps : WALK_STEPS;
  const S = STEPS[step] || STEPS[0];
  const baseRef = uR(null);
  const [done, setDone] = uS(false);
  uE(() => { if (active) { baseRef.current = walkSnap(state); setDone(false); } }, [step, active]);
  uE(() => {
    if (!active || done || !baseRef.current) return;
    try { if (S.test(state, baseRef.current)) setDone(true); } catch (e) {}
  }, [state, step, active, done]);
  const last = step + 1 >= total;
  return (
    <div style={{
      background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
      border: '1px solid ' + (done ? 'var(--green)' : '#38383e'), borderRadius: 8, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 4px 14px rgba(0,0,0,0.4)', maxHeight: 280, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="mono" style={{ fontSize: 8.5, color: 'var(--cool)', letterSpacing: 1.3, fontWeight: 700, textTransform: 'uppercase' }}>{S.act}</div>
        {total > 1 && <div className="mono" style={{ fontSize: 8.5, color: 'var(--ink-3)', letterSpacing: 0.8 }}>STOP {step + 1} OF {total}</div>}
      </div>
      <div className="display" style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.15 }}>{S.title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{S.teach}</div>
      <div key={'try-' + step} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, padding: '9px 11px', background: 'rgba(74,222,128,0.10)', border: '1px solid var(--green)', borderRadius: 6, '--attn': 'var(--green)', animation: 'briefAttention 1.5s ease-in-out 3' }}>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--green)', letterSpacing: 1, fontWeight: 800, display: 'block', marginBottom: 3 }}>TRY IT</span>
        {S.prompt}
      </div>
      {S.aside && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.45, fontStyle: 'italic' }}>{S.aside}</div>}
      {done && <div style={{ fontSize: 11, color: 'var(--green)', lineHeight: 1.45 }}>✓ {S.takeaway}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
        <button onClick={done ? onNext : undefined} disabled={!done} className="mono ui-no-select" style={{
          padding: '7px 16px', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
          background: done ? 'linear-gradient(180deg, var(--green), #2c9d52)' : '#1a1a1d',
          color: done ? '#0a0a0c' : 'var(--ink-3)', border: '1px solid ' + (done ? '#2c9d52' : '#2a2a2e'),
          borderRadius: 4, cursor: done ? 'pointer' : 'default', opacity: done ? 1 : 0.6,
        }}>{(last && lastLesson) ? 'FINISH →' : 'NEXT →'}</button>
        {!done && <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Try the control to continue.</span>}
        <button onClick={onSkip} className="ui-no-select" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', fontSize: 10, textDecoration: 'underline', padding: 0 }}>Close</button>
      </div>
    </div>
  );
}

// Run the Show lessons are real tasks (set up the system, run the show), but a
// course should guide you through them, not drop you in front of a checklist
// and a hidden hint. The LessonGuide turns each lesson's existing ordered
// `hints` into a step-by-step coach: one move at a time, taught in plain
// language, with the spotlight on the control you touch next. Each step already
// carries a done(ctx) predicate (the same one that drives the adaptive hint),
// so the coach advances on its own as you actually do the work. Optional
// `teach` (the why) and `target` (the spotlight anchor) enrich each step.
function lessonStepDone(step, ctx) {
  try { return !!(step && typeof step.done === 'function' && step.done(ctx)); } catch (e) { return false; }
}
// The active step is the first one not yet done. Returns steps.length when every
// step is done (the lesson is finishing — the win effect takes it from here).
function lessonActiveIndex(steps, ctx) {
  if (!Array.isArray(steps) || steps.length === 0) return -1;
  for (let i = 0; i < steps.length; i++) { if (!lessonStepDone(steps[i], ctx)) return i; }
  return steps.length;
}

// DEFINITIONS PANEL — the only prose a lesson shows outside its steps.
//
// A lesson declares `defs: ['wedge', 'aux send']` and this renders the
// term/definition pairs from window.GLOSSARY. There is deliberately NO
// free-text field: a lesson cannot set a scene, restate the DO THIS, or
// describe something the student can already see on the console. If a
// lesson has nothing to define, it shows nothing at all.
//
// Unknown keys are skipped rather than rendered raw, so a typo shows up as
// a missing definition in the lint rather than as garbage on screen.
// Hovering a definition tells the app which term to light up on the board.
// The App owns the state (the highlight layer renders at the top level,
// above the board), so this context just hands the setter down.
const DefHoverContext = React.createContext(null);
window.DefHoverContext = DefHoverContext;

// The hovered term itself, for a highlight that must be drawn INSIDE the
// board's SVG rather than as a screen-space box. The snake trunk is a
// cornered multicore path, so the only honest way to trace it is to stroke
// the real path where its geometry already lives.
const DefTermContext = React.createContext(null);
window.DefTermContext = DefTermContext;

// GLOSSARY HIGHLIGHT — "show me what that word means".
//
// Deliberately NOT the walkthrough spotlight. That ring pulses green and
// means "do this next"; this is a calm, static amber wash that means
// "this is the thing I just defined". Different intent, different look,
// so a student never confuses a definition with an instruction.
//
// Highlights EVERY match, so hovering "fader" lights up all of them at
// once, which is the point: the word names a kind of control, not one
// control.
function GlossaryHighlight({ term }) {
  const [rects, setRects] = uS([]);
  const sel = (term && window.GLOSSARY_ANCHORS && window.GLOSSARY_ANCHORS[term]) || '';
  uE(() => {
    if (!sel) { setRects([]); return; }
    const measure = () => {
      const boxes = [];
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        // Anything scrolled out of view would otherwise draw a box pinned
        // to the viewport edge.
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        boxes.push({ left: r.left, top: r.top, w: r.width, h: r.height,
                     inPanel: !!el.closest('[data-iolist-card]') });
      });
      setRects((prev) => {
        const same = boxes.length === prev.length && boxes.every((b, i) => {
          const p = prev[i];
          return p && Math.abs(p.left - b.left) < 0.5 && Math.abs(p.top - b.top) < 0.5
              && Math.abs(p.w - b.w) < 0.5 && Math.abs(p.h - b.h) < 0.5;
        });
        return same ? prev : boxes;
      });
    };
    measure();
    // Track the board's scale-to-fit transform and any panel drag, the
    // same way the walkthrough spotlight does.
    let raf;
    const loop = () => { measure(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [sel]);
  if (!sel || !rects.length) return null;
  const style = (window.GLOSSARY_ANCHOR_STYLE || {})[term] || 'box';
  // A LINE target (the fader's U mark) gets an arrow pointing at it from the
  // left. A box drawn around a 1px tick reads as a box around nothing.
  if (style === 'arrow') {
    return (
      <>
        {rects.map((r, i) => (
          <div key={i} style={{
            position: 'fixed', left: r.left - 20, top: r.top + r.h / 2 - 6.5,
            width: 17, height: 13, pointerEvents: 'none',
            zIndex: r.inPanel ? 96 : 87,
            filter: 'drop-shadow(0 0 5px rgba(240,180,41,0.9))',
          }}>
            <svg viewBox="0 0 17 13" width="17" height="13" style={{ display: 'block' }}>
              <path d="M17 6.5 L9 1 L9 4 L0 4 L0 9 L9 9 L9 12 Z" fill="var(--gold, #f0b429)"/>
            </svg>
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      {rects.map((r, i) => (
        <div key={i} style={{
          position: 'fixed', left: r.left - 3, top: r.top - 3,
          width: r.w + 6, height: r.h + 6,
          border: '1.5px solid var(--gold, #f0b429)',
          background: 'rgba(240,180,41,0.13)',
          borderRadius: r.h < 40 ? 3 : 6,
          pointerEvents: 'none', zIndex: r.inPanel ? 96 : 87,
          boxShadow: '0 0 10px rgba(240,180,41,0.45)',
        }}/>
      ))}
    </>
  );
}
window.GlossaryHighlight = GlossaryHighlight;

function DefList({ defs }) {
  if (!Array.isArray(defs) || defs.length === 0) return null;
  const G = window.GLOSSARY || {};
  const L = window.GLOSSARY_LABELS || {};
  const A = window.GLOSSARY_ANCHORS || {};
  const setHover = React.useContext(window.DefHoverContext) || null;
  const rows = defs.filter((k) => G[k]);
  if (rows.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {rows.map((k) => {
        // Only terms that map to something real on the board get the
        // hover affordance. A dotted underline on a word that lights
        // nothing up reads as a broken feature.
        const canPoint = !!(A[k] && setHover);
        return (
          <div key={k}
            onMouseEnter={canPoint ? () => setHover(k) : undefined}
            onMouseLeave={canPoint ? () => setHover(null) : undefined}
            style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5,
                     cursor: canPoint ? 'help' : 'default' }}>
            <span style={{
              color: 'var(--ink)', fontWeight: 700,
              borderBottom: canPoint ? '1px dotted var(--ink-2)' : 'none',
            }}>{L[k] || k}</span>
            <span style={{ opacity: 0.5 }}>{'  ·  '}</span>
            {G[k]}
          </div>
        );
      })}
    </div>
  );
}
window.DefList = DefList;

function LessonGuide({ level, steps, ctx, activeIndex, onReset, phantomPop }) {
  const total = steps.length;
  const allDone = activeIndex >= total;
  const active = allDone ? null : steps[activeIndex];
  const popped = !!phantomPop;
  return (
    <div style={{
      background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
      border: '1px solid ' + (popped ? 'var(--hot)' : (allDone ? 'var(--green)' : '#38383e')), borderRadius: 8, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 4px 14px rgba(0,0,0,0.4)', maxHeight: 380, overflowY: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="mono" style={{ fontSize: 8.5, color: 'var(--accent)', letterSpacing: 1.3, fontWeight: 700, textTransform: 'uppercase' }}>{level.title}</div>
        <div className="mono" style={{ fontSize: 8.5, color: allDone ? 'var(--green)' : 'var(--ink-3)', letterSpacing: 0.8 }}>
          {allDone ? 'DONE' : ('STEP ' + (activeIndex + 1) + ' OF ' + total)}
        </div>
      </div>

      {/* Definitions only. A lesson declares which terms it introduces and
          this renders them from the glossary. Instructions belong in the
          step's DO THIS; board state belongs on the console, not in prose.
          `symptom` is still honored for Practice and custom scenarios (which
          need a goal statement), but lessons must not use it. */}
      <DefList defs={level.defs} />
      {!level.defs && level.symptom && (
        <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5 }}>{level.symptom}</div>
      )}

      {popped && (
        <div style={{ fontSize: 11, color: 'var(--hot)', lineHeight: 1.45, padding: '6px 9px', background: 'rgba(255,70,48,0.1)', border: '1px solid rgba(255,70,48,0.4)', borderRadius: 6 }}>
          {(phantomPop.cause === 'plug' || phantomPop.cause === 'patch_live')
            ? '⚠ That sent a pop to the speakers. Reset, then mute the channel before touching the cable.'
            : phantomPop.cause === 'speaker_patch'
              ? '⚠ That popped the speaker. Reset, then switch the speaker off before moving its line.'
              : (phantomPop.cause === 'mixer_pop' || phantomPop.cause === 'mixer_off_pop')
                ? '⚠ That popped the speakers. Reset, then bring the console up before the speakers and down after them.'
                : phantomPop.cause === 'amp_loud'
                  ? '⚠ That hit the speakers at full level. Reset, then pull the master down before you switch a speaker on.'
                  : '⚠ That sent a pop to the speakers. Reset and switch +48V with the channel muted.'}
        </div>
      )}

      {active ? (
        <>
          {active.teach && <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>{active.teach}</div>}
          <div key={'do-' + activeIndex} style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, padding: '9px 11px', background: 'rgba(74,222,128,0.10)', border: '1px solid var(--green)', borderRadius: 6, '--attn': 'var(--green)', animation: 'briefAttention 1.5s ease-in-out 3' }}>
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--green)', letterSpacing: 1, fontWeight: 800, display: 'block', marginBottom: 3 }}>DO THIS</span>
            {active.text}
          </div>
        </>
      ) : popped ? null : (
        <div style={{ fontSize: 12, color: 'var(--green)', lineHeight: 1.5, padding: '7px 10px', background: '#0e2415', border: '1px solid #1e3a2a', borderRadius: 6 }}>
          ✓ That's the whole setup. Nice work.
        </div>
      )}

      {/* The full step list, so you can see where you are and what's left. The
          active step is highlighted; finished ones get a green check. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 1 }}>
        {steps.map((st, i) => {
          const done = lessonStepDone(st, ctx);
          const isActive = i === activeIndex;
          return (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline', fontSize: 10.5, opacity: done || isActive ? 1 : 0.7 }}>
              <span style={{ color: done ? 'var(--green)' : (isActive ? 'var(--accent)' : 'var(--ink-3)'), fontWeight: 700, width: 10, flexShrink: 0 }}>
                {done ? '✓' : (isActive ? '▸' : '○')}
              </span>
              <span style={{ flex: 1, minWidth: 0, color: done ? 'var(--green)' : (isActive ? 'var(--ink)' : 'var(--ink-2)'), fontWeight: isActive ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {st.title || st.text}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
        <button onClick={onReset} className="mono ui-no-select" style={{
          padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
          background: '#1a1a1d', color: 'var(--ink-2)', border: '1px solid #38383e', borderRadius: 4, cursor: 'pointer',
        }}>↻ START OVER</button>
        {!allDone && <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>Do the move and the next step opens.</span>}
      </div>
    </div>
  );
}

// Intro card: the map. Shown before the steps; START turns sound on (a user
// gesture, so the audio context is allowed to begin) and enters the tour.
function WalkthroughIntro({ open, onStart }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: 560, maxWidth: '94vw', background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)', border: '1px solid #38383e', borderRadius: 12, padding: '24px 26px', boxShadow: '0 16px 48px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={window.AU_LOGO} alt="Audio University" style={{ height: 40, width: 40, display: 'block' }}/>
          <div>
            <div className="display" style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>Know your console</div>
            <div className="mono" style={{ fontSize: 8.5, color: 'var(--ink-3)', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 3 }}>A quick tour · about 4 minutes</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          A mixing console looks intimidating, but it is simpler than it looks. This is a quick tour of what each control does. A band is already playing, and nothing here can break, so touch anything you want.
        </div>
        <button onClick={onStart} className="mono ui-no-select" style={{ alignSelf: 'flex-start', padding: '11px 22px', fontSize: 12, fontWeight: 800, letterSpacing: 1, background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c', border: '1px solid #2c9d52', borderRadius: 6, cursor: 'pointer' }}>START →</button>
      </div>
    </div>
  );
}

// Wrap card: the recap, the email capture (the lead magnet's actual ask, at the
// moment of peak interest), and the handoff to the lessons or Free Play. The
// email is optional; routing without it is a soft skip, handled by the caller.
function WalkthroughWrap({ open, onLessons, onExplore }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 96, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: 520, maxWidth: '94vw', background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)', border: '1px solid #38383e', borderRadius: 12, padding: '24px 26px', boxShadow: '0 16px 48px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', gap: 15 }}>
        <div className="display" style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.1 }}>That's the whole console</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
          {TIER === 'member'
            ? 'Now put it together: set up a system from a cold start and run a full show, one step at a time.'
            : 'Now put it together: the free Start Here course takes you from a cold start to ringing out feedback, one step at a time.'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onLessons} className="mono ui-no-select" style={{ flex: '1 1 0', padding: '11px 14px', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c', border: '1px solid #2c9d52', borderRadius: 6, cursor: 'pointer' }}>{TIER === 'member' ? 'START RUN THE SHOW →' : 'START THE FREE COURSE →'}</button>
          <button onClick={onExplore} className="mono ui-no-select" style={{ flex: '1 1 0', padding: '11px 14px', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6, background: '#16161a', color: 'var(--cool)', border: '1px solid #38383e', borderRadius: 6, cursor: 'pointer' }}>▶ EXPLORE THE BOARD</button>
        </div>
      </div>
    </div>
  );
}

// The guided spotlight. Given the current step's target data-walk key (or keys),
// it finds the control on the board, measures it, and draws a non-blocking
// pulsing ring around it so the eye goes straight to the control the step is
// about. It re-measures on a short interval (and on resize) to track the board's
// scale-to-fit transform. pointer-events:none so the user clicks straight
// through the ring to the control.
function WalkthroughSpotlight({ target }) {
  // Draws ONE ring per target element (not a union box), so a step can glow two
  // far-apart things — e.g. the Input List row AND the source card — without the
  // ring ballooning to span everything in between.
  const [rects, setRects] = uS([]);
  const targetKey = Array.isArray(target) ? target.join(',') : (target || '');
  uE(() => {
    if (!target) { setRects([]); return; }
    const keys = Array.isArray(target) ? target : [target];
    const measure = () => {
      const boxes = [];
      keys.forEach((k) => {
        const el = document.querySelector('[data-walk="' + k + '"]');
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        // The Input List panel floats ABOVE the board and the ring layer, so a
        // ring for a target that lives INSIDE the panel has to render above
        // the panel too; every other ring stays under it (a ring for a control
        // the panel happens to cover should not draw on top of the paperwork).
        const inPanel = !!el.closest('[data-iolist-card]');
        boxes.push({ key: k, left: r.left, top: r.top, w: r.width, h: r.height, inPanel });
      });
      setRects((prev) => {
        const same = boxes.length === prev.length && boxes.every((b, i) => {
          const p = prev[i];
          return p && p.key === b.key && Math.abs(p.left - b.left) < 0.5 && Math.abs(p.top - b.top) < 0.5 && Math.abs(p.w - b.w) < 0.5 && Math.abs(p.h - b.h) < 0.5 && p.inPanel === b.inPanel;
        });
        return same ? prev : boxes;
      });
    };
    measure();
    // Re-measure every frame so a ring tracks a target that moves — e.g. the
    // draggable Input List panel. setRects only re-renders when a box actually
    // shifts (>0.5px), so an idle target costs nothing.
    let raf;
    const loop = () => { measure(); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); };
  }, [targetKey]);
  if (!target || !rects.length) return null;
  // Short targets (table rows, chips) get a tight ring: a 7px halo around a
  // ~24px row overlaps the neighboring rows and reads as clutter.
  const padFor = (h) => (h < 40 ? 2 : 7);
  return (
    <>
      {rects.map((rect, i) => {
        // Connection points (cable jacks, data-walk "conn-*") get a bobbing
        // arrow instead of a ring: the jacks sit in a tight row, so a box
        // around one blurs into its neighbors, but an arrow says "right here".
        // Everything else — sources, buttons, list rows — keeps the ring.
        if (rect.key && rect.key.indexOf('conn-') === 0) {
          // The arrow must NEVER sit over a cable or a dangling tail — the
          // cable is the thing the student has to see and grab. So each arrow
          // approaches from the side the cables don't use:
          // - stage-box jacks: cables plug in from the LEFT, so the arrow
          //   sits INSIDE the box to the right of the jack and points left.
          // - console jacks + sub-snake heads: tails and lines arrive from
          //   ABOVE, so the arrow points up from BELOW the connection point.
          if (rect.key.indexOf('conn-stage-') === 0) {
            // Sit to the RIGHT of the port-number column (jack + gap + number,
            // ~13px past the jack) so the arrow never covers the number the
            // step copy names. Short (13px) so that on steps targeting
            // adjacent ports the arrows on 13px-pitch rows don't stack into a
            // blob. Points left, back at the jack.
            return (
              <div key={i} style={{
                position: 'fixed', left: rect.left + rect.w + 13,
                top: rect.top + rect.h / 2 - 6.5,
                width: 17, height: 13, pointerEvents: 'none',
                zIndex: rect.inPanel ? 95 : 88,
                animation: 'walkArrowBobXL 1.1s ease-in-out infinite',
                filter: 'drop-shadow(0 0 5px rgba(74,222,128,0.9))',
              }}>
                <svg viewBox="0 0 17 13" width="17" height="13" style={{ display: 'block' }}>
                  <path d="M0 6.5 L8 1 L8 4 L17 4 L17 9 L8 9 L8 12 Z" fill="var(--green)"/>
                </svg>
              </div>
            );
          }
          return (
            <div key={i} style={{
              position: 'fixed', left: rect.left + rect.w / 2 - 11,
              top: rect.top + rect.h + 8,
              width: 22, height: 26, pointerEvents: 'none',
              zIndex: rect.inPanel ? 95 : 88,
              animation: 'walkArrowBobUp 1.1s ease-in-out infinite',
              filter: 'drop-shadow(0 0 6px rgba(74,222,128,0.85))',
            }}>
              <svg viewBox="0 0 22 26" width="22" height="26" style={{ display: 'block', transform: 'rotate(180deg)' }}>
                <path d="M11 26 L1 13 L6.5 13 L6.5 0 L15.5 0 L15.5 13 L21 13 Z" fill="var(--green)"/>
              </svg>
            </div>
          );
        }
        const pad = padFor(rect.h);
        return (
          <div key={i} style={{
            position: 'fixed', left: rect.left - pad, top: rect.top - pad,
            width: rect.w + pad * 2, height: rect.h + pad * 2,
            border: '2px solid var(--green)', borderRadius: pad < 7 ? 5 : 8,
            animation: 'walkPulse 1.6s ease-in-out infinite',
            pointerEvents: 'none', zIndex: rect.inPanel ? 95 : 88,
          }}/>
        );
      })}
    </>
  );
}

// The show's paperwork: an industry-style input list + output list, openable
// from the top bar on every level. Industry input lists carry the channel,
// the source/instrument, the mic or DI type, phantom, the snake channel, and
// the console channel — that's exactly what the patch lesson asks the
// student to wire, and what a crosspatch rep gets compared against.
function IoListPanel({ open, onClose, state }) {
  // Non-modal, draggable panel: it stays open while the user patches the board
  // (no backdrop, and the container passes pointer events through), so there's no
  // more flipping back and forth. `pos` is null until the user drags it off its
  // default top-right dock.
  const [pos, setPos] = uS(null);
  const dragRef = uR(null);
  if (!open) return null;
  // Built from the LIVE board so the list is accurate in every mode (MX-8, the
  // full band, etc.) — one input row per fader, and every console output bus.
  const s = (state && Array.isArray(state.channels)) ? state : (window.defaultState ? window.defaultState() : null);
  if (!s) return null;
  const sc = window.SNAKE_COLORS || [];
  const dot = (ch) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc[(ch - 1) % 8] || '#4a4a52', display: 'inline-block', flexShrink: 0 }}/>
      {ch}
    </span>
  );
  const th = { textAlign: 'left', padding: '4px 10px', fontSize: 8.5, letterSpacing: 1.2, color: 'var(--ink-3)', fontWeight: 700, borderBottom: '1px solid #2a2a2e', textTransform: 'uppercase' };
  const td = { textAlign: 'left', padding: '5px 10px', fontSize: 11, color: 'var(--ink)', borderBottom: '1px solid #1c1c20' };
  const sectionTitle = (txt) => (
    <div className="mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1.6, fontWeight: 700, margin: '14px 0 4px' }}>{txt}</div>
  );
  // A channel/signal cell: the cable's color dot next to a plain label. The dot
  // ties the row to the matching colored cable on the board; a faint grey dot
  // means it plugs straight in with no snake cable (the playback line).
  const chCell = (snakeIdx, label) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: snakeIdx ? (sc[(snakeIdx - 1) % 8] || '#4a4a52') : '#4a4a52', display: 'inline-block', flexShrink: 0, opacity: snakeIdx ? 1 : 0.35 }}/>
      {label}
    </span>
  );
  const typeLabel = (src) => {
    if (!src) return 'Empty · nothing patched';
    if (src.kind === 'dynamic') return 'Dynamic mic';
    if (src.kind === 'condenser') return 'Condenser mic · needs +48V';
    if (src.kind === 'di') return src.diActive ? 'Active DI · needs +48V' : 'Passive DI';
    if (src.kind === 'playback') return 'Stereo line · plugs straight in';
    return src.kind || '—';
  };
  // One row per fader. The Input List is the PAPERWORK: it shows the INTENDED
  // patch (what belongs on each channel), never the current live cabling — so
  // it's a usable map even when a line is loose or crossed. We read the plan
  // off each board's canonical home layout: the standard band's fixed mapping,
  // or the 16-input band's natural BAND_KEYS order (the same mapping
  // big16PatchOk treats as correct), with identity fan-out.
  const liveCables = s.cables || {};
  const isStdBand = ['vocal', 'vocal2', 'guitar', 'laptop'].every((k) => k in liveCables) && Object.keys(liveCables).length <= 6;
  const planCables = isStdBand
    ? { vocal: 1, vocal2: 2, guitar: 3, laptop: 4 }
    : (s.big16 && window.BAND_KEYS
      ? window.BAND_KEYS.reduce((m, k, i) => { m[k] = i + 1; return m; }, {})
      : liveCables);
  const planFanOut = isStdBand
    ? [1, 2, 3, 4]
    : (s.big16 && window.BAND_KEYS
      ? window.BAND_KEYS.map((_, i) => i + 1)
      : (s.fanOut || [1, 2, 3, 4]));
  const planStereoIdx = s.channels.findIndex((c) => c.stereo);
  const srcKeysAll = Object.keys(window.SOURCES || {});
  // The intended channel for a source: its home snake port carried through the
  // plan's fan-out. Playback is the FOH stereo line on the stereo strip.
  const planChannelFor = (k) => {
    if (k === 'playback') return (!s.noPlayback && planStereoIdx >= 0) ? planStereoIdx + 1 : 0;
    const port = planCables[k];
    if (!(port >= 1)) return 0;
    const ch = planFanOut[port - 1];
    return (ch >= 1 && ch <= s.channels.length) ? ch : 0;
  };
  // Invert: the intended source for each channel.
  const planSourceForChannel = (i) => {
    if (s.channels[i] && s.channels[i].stereo) return s.noPlayback ? null : 'playback';
    return srcKeysAll.find((k) => k !== 'playback' && planChannelFor(k) === i + 1) || null;
  };
  // On the big board the mics reach the stage box in sub-snakes, so the
  // paperwork has to name the sub-snake and the channel ON it, the way a real
  // input list does ("Drum 3"). Local numbering matches the stage exactly: a
  // source's slot is its position within its own group, the same `natural()`
  // rule SubSnakeHead uses. Read off BAND_KEYS so it stays the PLAN, not the
  // live micIn cabling.
  const SUBSNAKE_NAMES = { up: 'Drum', inst: 'Backline', down: 'Vocal' };
  const subSnakeFor = (k) => {
    const src = window.SOURCES[k];
    if (!s.big16 || !src || !src.snake) return null;
    const grp = (window.BAND_KEYS || []).filter((kk) => window.SOURCES[kk] && window.SOURCES[kk].snake === src.snake);
    const local = grp.indexOf(k) + 1;
    if (local < 1) return null;
    return (SUBSNAKE_NAMES[src.snake] || src.snake) + ' ' + local;
  };
  const inputRows = s.channels.map((ch, i) => {
    const srcKey = planSourceForChannel(i);
    const src = srcKey ? window.SOURCES[srcKey] : null;
    const chNum = ch.stereo ? `${i + 1}/${i + 2}` : `${i + 1}`;
    // Snake channel and mixer channel are DIFFERENT facts and get their own
    // columns: the snake channel is the stage-box port the source patches to,
    // the mixer channel is the console strip it lands on. Patched one to one
    // they read the same number, which is the whole point of the paperwork.
    // Playback is a FOH line input, so it rides no snake channel at all.
    const snakeCh = (src && srcKey !== 'playback') ? (planCables[srcKey] || null) : null;
    const sub = (src && srcKey !== 'playback') ? subSnakeFor(srcKey) : null;
    return { key: i, chNum, source: src ? src.label : 'Empty', type: typeLabel(src), snakeCh, sub, empty: !src };
  });
  // Every console output bus and the return channel it rides. Like the inputs,
  // this is the PLAN (the paperwork): when the board is unpatched (Patch the
  // System starts with every return null) fall back to the canonical default so
  // each output still shows its home return channel — Main L on return 1, etc.
  // The Input List is the PLAN (what belongs where), not the live cabling —
  // same rule as the input rows. The Return column always shows the return
  // each output is MEANT to ride, even while those returns sit unpatched
  // (Patch the Outputs starts with them disconnected on purpose).
  const planOutFan = window.DEFAULT_OUT_FAN || s.outFan || {};
  const portFor = (busKey) => { const p = Object.keys(planOutFan).find((pp) => planOutFan[pp] === busKey); return p ? +p : null; };
  // The MX-8 runs two wedges (Vocal 1, Vocal 2); the 16-ch board runs four,
  // one per performer (Vocal 1, bass, keys, drummer). Only list the wedges the
  // board actually has, with the right owner.
  const outputDefs = [
    { bus: 'mainL', label: 'Main L', to: 'The left main speaker (the audience)' },
    { bus: 'mainR', label: 'Main R', to: 'The right main speaker (the audience)' },
    { bus: 'aux1', label: 'Aux 1', to: "Wedge 1 (Vocal 1's monitor)" },
    { bus: 'aux2', label: 'Aux 2', to: s.big16 ? "Wedge 2 (the bass player's monitor)" : "Wedge 2 (Vocal 2's monitor)" },
    ...(s.big16 ? [
      { bus: 'aux3', label: 'Aux 3', to: "Wedge 3 (the keys player's monitor)" },
      { bus: 'aux4', label: 'Aux 4', to: "Wedge 4 (the drummer's monitor)" },
    ] : []),
  ];
  const startDrag = (e) => {
    const card = e.currentTarget.closest('[data-iolist-card]');
    if (!card) return;
    const r = card.getBoundingClientRect();
    dragRef.current = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    const move = (ev) => setPos({ left: Math.max(4, ev.clientX - dragRef.current.dx), top: Math.max(48, ev.clientY - dragRef.current.dy) });
    const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  const dock = pos ? { left: pos.left, top: pos.top } : { right: 12, top: 64 };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none' }}>
      <div data-iolist-card style={{
        position: 'fixed', ...dock,
        // The big board adds a sub-snake column (five in all), so it needs the
        // extra room or the Type column wraps every row.
        width: s.big16 ? 560 : 440, maxWidth: '94vw', maxHeight: '78vh', overflow: 'auto',
        background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
        border: '1px solid #38383e', borderRadius: 8, padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)', pointerEvents: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div onPointerDown={startDrag} className="ui-no-select" style={{ cursor: 'move', flex: 1 }}>
            <div className="display" style={{ fontSize: 16, fontWeight: 800 }}>Input List <span style={{ fontSize: 9.5, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.5 }}>⠿ drag</span></div>
            <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 0.8, marginTop: 1 }}>stays open while you patch · inputs from the stage, outputs to your speakers</div>
          </div>
          <button onClick={onClose} className="mono ui-no-select" style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', background: '#0a0a0c', border: '1px solid #38383e', borderRadius: 4, cursor: 'pointer' }}>✕ CLOSE</button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.55, marginTop: 8 }}>
          Every mic and instrument on stage runs through the snake before it reaches the console. Each channel of the snake is color-coded, so you can trace it from the stage to the board. This is the map of what is connected where.
        </div>
        {sectionTitle('INPUTS · FROM THE STAGE')}
        <table style={{ width: '100%', borderCollapse: 'collapse' }} className="ui-no-select">
          <thead><tr>
            {s.big16 && <th style={th}>Sub-snake</th>}
            <th style={th}>Snake input</th><th style={th}>Mixer ch</th><th style={th}>Source</th><th style={th}>Type</th>
          </tr></thead>
          <tbody>
            {inputRows.map((r) => (
              <tr key={r.key} data-walk={'iolist-ch' + r.chNum}>
                {s.big16 && <td style={{ ...td, color: r.sub ? 'var(--ink-2)' : 'var(--ink-3)' }}>{r.sub || '—'}</td>}
                <td style={td}>{chCell(r.snakeCh, r.snakeCh ? String(r.snakeCh) : '—')}</td>
                <td style={{ ...td, color: r.empty ? 'var(--ink-3)' : 'var(--ink)' }}>{r.chNum}</td>
                <td style={{ ...td, color: r.empty ? 'var(--ink-3)' : 'var(--ink)' }}>{r.source}</td>
                <td style={{ ...td, color: r.empty ? 'var(--ink-3)' : 'var(--ink-2)' }}>{r.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sectionTitle('OUTPUTS · TO THE SPEAKERS')}
        <table style={{ width: '100%', borderCollapse: 'collapse' }} className="ui-no-select">
          <thead><tr>
            <th style={th}>Snake output</th><th style={th}>Console output</th><th style={th}>Goes to</th>
          </tr></thead>
          <tbody>
            {outputDefs.map((o) => {
              const p = portFor(o.bus);
              return (
                <tr key={o.bus} data-walk={'iolist-out-' + o.bus}>
                  <td style={td}>{chCell(p, p ? String(p) : '—')}</td>
                  <td style={td}>{o.label}</td>
                  <td style={td}>{o.to}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// "What this trains" catalog — the curriculum and the fault pool in plain
// words, so the depth behind the locked rows is visible to anyone browsing.
// Built from data (lesson titles + each fault's label/blurb), so it grows on
// its own as the pool grows. Static description only; never the active rep.
function FaultCatalog({ open, onClose, tier }) {
  if (!open) return null;
  const lessons = window.LEVELS || [];
  const faults = window.PRACTICE_FAULTS || [];
  const seen = {};
  const faultList = [];
  for (const f of faults) { if (f.label && !seen[f.label]) { seen[f.label] = 1; faultList.push(f); } }
  const sectionTitle = (color, txt) => (
    <div className="mono" style={{ fontSize: 9, color, letterSpacing: 1.6, fontWeight: 700, margin: '12px 0 5px' }}>{txt}</div>
  );
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 540, maxWidth: '94vw', maxHeight: '86vh', overflow: 'auto',
        background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
        border: '1px solid #38383e', borderRadius: 8, padding: '16px 18px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div className="display" style={{ fontSize: 16, fontWeight: 800 }}>What this trains</div>
            <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 0.8, marginTop: 1 }}>set up a system, then keep it running when something breaks</div>
          </div>
          <button onClick={onClose} className="mono ui-no-select" style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', background: '#0a0a0c', border: '1px solid #38383e', borderRadius: 4, cursor: 'pointer' }}>✕ CLOSE</button>
        </div>

        {sectionTitle('var(--accent)', 'RUN THE SHOW · MEMBERS')}
        <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 5 }}>
          Ten guided lessons that build one full show, start to finish.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 14px' }}>
          {lessons.map((l, i) => (
            <div key={l.id} style={{ fontSize: 10.5, color: 'var(--ink-2)', width: '46%' }}>
              <span className="mono" style={{ color: 'var(--ink-3)' }}>{String(i + 1).padStart(2, '0')}</span> {l.title}
            </div>
          ))}
        </div>

        {sectionTitle('var(--accent)', 'PRACTICE MODE · MEMBERS')}
        <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 6 }}>
          The band is playing and something is wrong. You find it and fix it, without popping anything. Each one hides 1 to 3 of these, drawn at random, so no two are the same:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {faultList.map((f) => (
            <div key={f.key} style={{ fontSize: 10.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              <b style={{ color: 'var(--ink)' }}>{f.label}</b>{f.blurb ? ': ' + f.blurb : ''}
            </div>
          ))}
        </div>

        {sectionTitle('var(--aux)', 'EAR TRAINING · MEMBERS')}
        <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5 }}>
          Ear training: push a wedge toward a target level, and when a frequency starts to ring, find it on the graphic EQ and cut it by ear. Each round is a new wedge with a new set of problem frequencies.
        </div>

        {tier !== 'member' && (
          <div style={{ marginTop: 14, borderTop: '1px solid #2a2a2e', paddingTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11, color: 'var(--ink)', lineHeight: 1.5, flex: 1, minWidth: 180 }}>
              Start Here is free, plus a taste of Practice Mode and Ear Training. The full lesson library and unlimited practice come with Audio University membership.
            </div>
            <a href={joinUrl('catalog')} onClick={() => track('member_cta_click', { src: 'catalog' })} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{
              padding: '8px 16px', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
              background: 'linear-gradient(180deg, var(--accent), #c79a1f)', color: '#0a0a0c',
              border: '1px solid #c79a1f', borderRadius: 4, cursor: 'pointer', textDecoration: 'none',
            }}>JOIN AUDIO UNIVERSITY →</a>
          </div>
        )}
      </div>
    </div>
  );
}

// AUTHOR MODE panel (?author=1). A floating builder pinned to the bottom of the
// screen so Kyle can work the board above it. Four text fields, a goal capture
// (snapshot the current signal as the win), and copy a ?scenario= link. The
// board as it stands when he copies IS the student's starting point.
function AuthorPanel({ text, setText, goal, onCapture, onClearGoal, onCopy, onCopyEntry, msg }) {
  const fld = (key, label, ph, rows) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 110 }}>
      <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 1, fontWeight: 700 }}>{label}</div>
      <textarea value={text[key]} onChange={(e) => setText({ ...text, [key]: e.target.value })} rows={rows || 1} placeholder={ph}
        style={{ width: '100%', boxSizing: 'border-box', padding: '4px 6px', fontSize: 10, lineHeight: 1.35, background: '#0a0a0c', color: 'var(--ink)', border: '1px solid #38383e', borderRadius: 3, resize: 'none', fontFamily: 'inherit' }}/>
    </div>
  );
  const btn = (color, solid) => ({
    padding: '6px 11px', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, borderRadius: 4, cursor: 'pointer',
    color: solid ? '#0a0a0c' : color, background: solid ? color : 'transparent', border: '1px solid ' + color,
  });
  return (
    <div className="ui-no-select" style={{
      position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 120,
      background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
      border: '1px solid var(--accent)', borderRadius: 8, padding: '8px 12px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1.4, fontWeight: 800 }}>✎ AUTHOR</div>
        <div style={{ fontSize: 9, color: 'var(--ink-3)' }}>Set the board, capture the goal, write the prompt. Copy a share link, or a library entry to paste into content.js.</div>
        {msg && <div style={{ marginLeft: 'auto', fontSize: 9.5, color: 'var(--green)', fontWeight: 600 }}>{msg}</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {fld('title', 'TITLE', 'Festival changeover')}
        {fld('symptom', 'PROMPT (what the student reads)', 'The band is mid-set and...', 2)}
        {fld('hint', 'HINT (optional)', 'A nudge if stuck')}
        {fld('solution', 'RECAP (after they solve)', "What they just did")}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onCapture} className="mono ui-no-select" style={btn('var(--cool)')}>CAPTURE GOAL FROM THIS STATE</button>
        <div className="mono" style={{ fontSize: 9, color: goal ? 'var(--green)' : 'var(--ink-3)', fontWeight: 700 }}>
          {goal ? ('GOAL: ' + goal.length + ' target' + (goal.length === 1 ? '' : 's') + ' captured') : 'GOAL: restore the full mix (default)'}
        </div>
        {goal && <button onClick={onClearGoal} className="mono ui-no-select" style={btn('var(--ink-3)')}>CLEAR GOAL</button>}
        <button onClick={onCopyEntry} className="mono ui-no-select" title="Copy a paste-ready entry for window.SCENARIO_LIBRARY in content.js" style={{ ...btn('var(--green)'), marginLeft: 'auto' }}>COPY LIBRARY ENTRY</button>
        <button onClick={onCopy} className="mono ui-no-select" style={btn('var(--accent)', true)}>⎘ COPY SCENARIO LINK</button>
      </div>
    </div>
  );
}

// Shared red "take action" button used inside the WarningModal.
const hotBtn = {
  alignSelf: 'flex-start',
  padding: '7px 14px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
  color: '#fff', background: 'var(--hot)', border: '1px solid #b8341f',
  borderRadius: 4, cursor: 'pointer', textTransform: 'uppercase',
  boxShadow: '0 0 8px rgba(255,70,48,0.35)',
};

// Centered, dismissible fault alert. Pops, distortion, and PA imbalance used
// to stack their explanation text into the bottom-left brief card, which made
// it tall enough to shrink the stage or push the Reset button off-screen.
// Now they announce themselves here, in the same centered-overlay style as the
// I/O list and Monitor EQ windows, and dismiss out of the way so the engineer
// can act. Feedback keeps its own flow (the Monitor EQ auto-opens to the
// ring-out), so it isn't routed through here. The brief card's status pill
// still shows the live state after this is dismissed.
function WarningModal({ open, phantomPop, clips, paBalanceIssue, audio, onReset, onClose, passivePA, popGoal }) {
  if (!open) return null;
  const clipping = clips && clips.length > 0;
  const audienceLive = ((audio?.outputs?.pa_l || 0) + (audio?.outputs?.pa_r || 0)) > 0.05;

  let tag = '⚠ HEADS UP';
  let body = null;
  let action = null;

  if (phantomPop) {
    const cause = phantomPop.cause;
    tag = cause === 'amp_loud' ? '⚠ TOO LOUD' : '⚠ POPPED';
    const desc = cause === 'plug' ? (
      <>You plugged a cable into a <b style={{ color: 'var(--hot)' }}>live channel</b>. Plugging in makes a loud pop, and the channel was on, so the pop went through the PA. In a real venue that can damage speakers.</>
    ) : cause === 'patch_live' ? (
      <>You changed a patch on a <b style={{ color: 'var(--hot)' }}>live channel</b>. Connecting or disconnecting any cable makes a pop, and that channel's path to the speakers was open, so the pop played through the system. This applies to every patch point: the stage box, the snake, and the fan-out.</>
    ) : cause === 'speaker_patch' ? (
      <>You moved a speaker's line while the <b style={{ color: 'var(--hot)' }}>speaker was live</b>. Plugging or unplugging a powered speaker makes a pop, and the speaker's own amplifier plays it at full level.</>
    ) : cause === 'amp_loud' ? (
      // Rig-aware: on the powered rig there is no amp, the speaker itself is
      // the thing that switched on. Same physics, right vocabulary.
      passivePA ? (
        <>You turned the <b style={{ color: 'var(--hot)' }}>amp on</b> with the master up. Sound hit the speakers at full level the moment they came on. In a real venue that's painfully loud and can damage the system.</>
      ) : (
        <>You turned a <b style={{ color: 'var(--hot)' }}>speaker on</b> with the master up. Sound hit it at full level the moment it came on. In a real venue that's painfully loud and can damage the system.</>
      )
    ) : cause === 'mixer_pop' ? (
      passivePA ? (
        <>You turned the <b style={{ color: 'var(--hot)' }}>console on</b> while the amp was already on. A console makes an electrical pop when it powers up, and the amp sent that pop straight to the speakers. Muting the master doesn't prevent this, because the pop is electrical, not sound from the mix.</>
      ) : (
        <>You turned the <b style={{ color: 'var(--hot)' }}>console on</b> while speakers were already on. A console makes an electrical pop when it powers up, and the live speakers played it at full volume. Muting the master doesn't prevent this, because the pop is electrical, not sound from the mix.</>
      )
    ) : cause === 'mixer_off_pop' ? (
      <>You turned the <b style={{ color: 'var(--hot)' }}>console off</b> while speakers were still on. A console makes an electrical pop when it powers down, the same as when it powers up, and the live speakers played that pop at full level. Pulling the master down doesn't prevent this, because the pop is electrical, not sound from the mix.</>
    ) : cause === 'phantom_cans' ? (
      <>You turned on <b style={{ color: 'var(--hot)' }}>+48V</b> while you were listening to that channel in PFL. PFL is pre-fader, so the switch-on pop went straight to your headphones, right in your ears. Muting the channel doesn't help here. That kind of pop can damage your hearing.</>
    ) : (
      <>You turned on <b style={{ color: 'var(--hot)' }}>+48V</b> while the channel was live. That sends a loud pop through the system. In a real venue it can damage speakers and some mics.</>
    );
    const fix = cause === 'plug' ? (
      <>The correct order: <b>mute the channel</b> (or pull its fader down) → plug the cable in → bring the channel back up.</>
    ) : cause === 'patch_live' ? (
      <>The correct order: <b>close the path first</b>. Mute the channel, or pull the master down when the change touches more than one channel → make the patch change → bring it back up.</>
    ) : cause === 'speaker_patch' ? (
      <>The correct order: <b>turn the speaker off</b> (or its volume all the way down) → move the line → bring the speaker back.</>
    ) : cause === 'amp_loud' ? (
      passivePA ? (
        <>The correct order: <b>pull the master down</b> → turn the amp on → bring the master back up slowly.</>
      ) : (
        <>The correct order: <b>pull the master down</b> → turn the speaker on → bring the master back up slowly.</>
      )
    ) : cause === 'mixer_pop' ? (
      passivePA ? (
        <>The correct order: <b>console on first</b>, before any amp. Then master down, amp on, master back up.</>
      ) : (
        <>The correct order: <b>console on first</b>, before any speaker. Then master down, speakers on, master back up.</>
      )
    ) : cause === 'mixer_off_pop' ? (
      <>The correct order is power-on in reverse: master fader down → <b>speakers and wedges off</b> → console off last.</>
    ) : cause === 'phantom_cans' ? (
      <>The correct order: turn on <b>+48V before you PFL the channel</b> (or disengage PFL first). Then PFL to check it, disengage, and bring the channel up.</>
    ) : (
      <>The correct order: <b>mute the channel</b> (or pull its fader down) → turn on +48V → wait a moment → bring the channel back up.</>
    );
    body = (<><div style={{ color: 'var(--ink)' }}>{desc}</div><div>{fix}</div></>);
    // On a "hear the pop" lesson the pop was the goal, so the modal is a lesson,
    // not a failure: offer "Got it" (which drops to the debrief) instead of
    // "Reset and try again."
    action = popGoal ? (
      <button onClick={onClose} className="mono ui-no-select" style={hotBtn}>✓ Got it</button>
    ) : onReset ? (
      <button onClick={onReset} className="mono ui-no-select" style={hotBtn}>↻ Reset and try again</button>
    ) : null;
  } else if (clipping) {
    tag = audienceLive ? '⚠ DISTORTING' : '⚠ PEAKING';
    body = (
      <>
        <div style={{ color: 'var(--ink)' }}>
          {audienceLive
            ? (<>The sound is <b style={{ color: 'var(--hot)' }}>distorting</b>. Something in the signal chain is in the red, and the audience can hear it.</>)
            : (<>Something in the signal chain is <b style={{ color: 'var(--hot)' }}>in the red</b>. The audience can't hear it yet because the signal isn't reaching the PA, but it will distort as soon as it does. Fix the level first.</>)}
        </div>
        {clips.map((c, i) => (
          <div key={i}><b style={{ color: 'var(--hot)' }}>{c.label}:</b> {c.fix}</div>
        ))}
      </>
    );
    action = <button onClick={onClose} className="mono ui-no-select" style={hotBtn}>Got it</button>;
  } else if (paBalanceIssue) {
    tag = '⚠ IMBALANCED';
    body = (
      <>
        <div style={{ color: 'var(--ink)' }}>The two sides of the PA <b style={{ color: 'var(--hot)' }}>don't match</b>. One side is louder than the other, or silent.</div>
        <div>{paBalanceIssue.fix}</div>
      </>
    );
    action = <button onClick={onClose} className="mono ui-no-select" style={hotBtn}>Got it</button>;
  } else {
    return null;
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} className="ui-no-select" style={{
        width: 460, maxWidth: '92vw', maxHeight: '86vh', overflow: 'auto',
        background: 'linear-gradient(180deg,#241619 0%, #17100f 100%)',
        border: '1px solid var(--hot)', borderRadius: 10, padding: '16px 18px',
        boxShadow: '0 0 0 1px rgba(255,70,48,0.25), 0 16px 48px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div className="mono" style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, color: 'var(--hot)' }}>{tag}</div>
          <button onClick={onClose} className="mono ui-no-select" style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', background: '#0a0a0c', border: '1px solid #38383e', borderRadius: 4, cursor: 'pointer' }}>✕ CLOSE</button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 8 }}>{body}</div>
        {action && <div style={{ display: 'flex', gap: 8 }}>{action}</div>}
      </div>
    </div>
  );
}

function App() {
  const [levelIdx, setLevelIdx] = uS(HOME_INDEX);
  const [state, setState] = uS(() => {
    const base = window.defaultState();
    const lv0 = SCENARIOS[HOME_INDEX];
    base.topology = { ...base.topology, ...(lv0.topology || {}) };
    base.channels = normalizeChannels(base.channels, deriveInvolves(lv0));
    const s = lv0.sabotage(base);
    s.inspect = lv0.defaultInspect || 'pa';
    return s;
  });
  const [solved, setSolved] = uS(false);
  const [audioOn, setAudioOn] = uS(false);
  // Start Here "Balance the Band": the fader positions the level loaded with, so
  // a lesson can require the student to actually MOVE a set of channel faders
  // (requireAdjust) and feel what each one does.
  const adjustBaseRef = uR(null);
  // Balance the Band latches: once a required fader has been pulled >= 12 dB
  // below its loaded position, it stays satisfied even if moved back.
  const adjustLatchRef = uR({});
  // Latch: has sound ever been on this session? Drives the SOUND button's
  // first-run glow — it pulses until the first enable, then stays quiet
  // even if the user mutes again.
  const everSoundRef = uR(false);
  uE(() => { if (audioOn) everSoundRef.current = true; }, [audioOn]);
  const [eqPanelOpen, setEqPanelOpen] = uS(false);
  const [placementFor, setPlacementFor] = uS(null);
  // Free tier: clicking a locked challenge in the picker shows this pitch
  // overlay instead of loading the scenario.
  const [pitchFor, setPitchFor] = uS(null);
  // Funnel: a member pitch showing (locked catalog click, taste exhausted, or
  // feedback lock), keyed by the level that opened it.
  uE(() => { if (pitchFor) track('join_panel_shown', { id: pitchFor.id || null }); }, [pitchFor]);
  // Progress save-code modal (copy your code / paste to restore / reset).
  const [saveModalOpen, setSaveModalOpen] = uS(false);
  // The I/O list panel — the show's paperwork, available on every level.
  const [ioListOpen, setIoListOpen] = uS(false);
  // "What this trains" catalog — the curriculum + fault pool in plain words.
  const [catalogOpen, setCatalogOpen] = uS(false);
  // Challenge presentation state. hintRevealed gates the hint zone behind a
  // button on challenges (Essentials keep their always-visible hints);
  // using the hint is counted into the debrief, not punished.
  const [hintCount, setHintCount] = uS(0);
  const hintsUsedRef = uR(0);
  // Latch "the Input List has been opened this level" the moment it opens, so
  // the guide's step 1 stays satisfied even after the panel is closed again.
  uE(() => { if (ioListOpen) ioListOpenedRef.current = true; }, [ioListOpen]);
  // Gesture-level move counter for the debrief: one fader drag is one move,
  // not fifty state updates. Counted by diffing consecutive states at the
  // app's single state choke point (the effect below).
  const movesRef = uR(0);
  const prevStateRef = uR(null);
  const lastMoveRef = uR({ key: null, at: 0 });
  // Seed of the current attempt. Reset replays it; Practice Again re-rolls.
  const seedRef = uR(1);
  // Cut one band on a wedge's monitor EQ, following the ears to that wedge.
  const setMonitorEqBand = (key, band, v) => setState(prev => {
    const w = prev.outputs[key]; const eq = (w.eq || [0, 0, 0, 0, 0]).slice(); eq[band] = v;
    return { ...prev, outputs: { ...prev.outputs, [key]: { ...w, eq } }, inspect: key };
  });
  // All durable state lives in one profile, loaded once. completed and reps
  // are React state (they drive UI); other profile fields that aren't UI state
  // ride on profileRef and are saved by the same effect after they mutate.
  const profileRef = uR(null);
  if (!profileRef.current) profileRef.current = loadProfile();
  // Capture the resume target ONCE, before the persist effect overwrites
  // lastLevel with the initial level 0. A mount effect (after loadLevel is
  // defined) loads it. Only resume to a valid, unlocked scenario.
  const resumeTargetRef = uR(undefined);
  if (resumeTargetRef.current === undefined) {
    const li = profileRef.current.lastLevel;
    resumeTargetRef.current = (Number.isInteger(li) && li > 0 && li < SCENARIOS.length && !isLocked(SCENARIOS[li]) && !SCENARIOS[li].isWalkthrough) ? li : HOME_INDEX;
  }
  const [completed, setCompleted] = uS(() => profileRef.current.completed);

  // Practice Mode state. reps counts finished practice reps (persisted in the
  // profile and carried in the save code); practiceFaults is the FAULTS
  // difficulty selector (1-3 faults per rep, ref-mirrored so loadLevel never
  // reads a stale value); practiceInfoRef holds the par + fault list of the
  // current rep, written by the practice sabotage at load time, read by the
  // debrief.
  const [reps, setReps] = uS(() => profileRef.current.reps);
  // Daily streak: consecutive days with at least one finished session. Held in
  // the profile (localStorage + save code) and shown as the live value, which
  // reads 0 once the chain lapses. bumpStreak() runs on every solve.
  const [streak, setStreak] = uS(() => liveStreak(profileRef.current));
  const bumpStreak = () => {
    const p = profileRef.current;
    const today = dayStr(0);
    if (p.streakDay === today) return; // already counted a session today
    const next = (p.streakDay === dayStr(-1)) ? (p.streak || 0) + 1 : 1; // extend or restart
    profileRef.current = { ...p, streak: next, streakDay: today, streakBest: Math.max(p.streakBest || 0, next) };
    saveProfile(profileRef.current);
    setStreak(next);
  };

  const [practiceFaults, setPracticeFaultsState] = uS(() => {
    const n = profileRef.current.practiceFaults;
    return (n === 1 || n === 2 || n === 3) ? n : 1;
  });
  const practiceFaultsRef = uR(practiceFaults);
  // Feedback Mode difficulty: false = guided (the ringing band glows red),
  // true = by ear (no glow; the engineer finds the ringing frequency by
  // listening). Only affects Feedback Mode.
  const [feedbackByEar, setFeedbackByEar] = uS(() => !!profileRef.current.feedbackByEar);
  const [etGuided, setEtGuided] = uS(() => profileRef.current.etGuided || 0);
  const [etByEar, setEtByEar] = uS(() => profileRef.current.etByEar || 0);

  // Console surface (member feature). Free tier is always analog; clicking
  // DIGITAL on free opens the member pitch instead of switching. setPitchFor is
  // declared later in App — fine, this closure only runs on a click.
  const canDigital = TIER === 'member';
  const [surface, setSurface] = uS(() => (profileRef.current.surface === 'digital' && canDigital) ? 'digital' : 'analog');
  const setSurfacePref = (next) => {
    if (next === 'digital' && !canDigital) { setPitchFor({ title: 'Digital Console Training', isDigital: true }); return; }
    setSurface(next === 'digital' ? 'digital' : 'analog');
  };

  // Hide-the-stage view pref: tuck the stage away so the console gets the whole
  // canvas (bigger on the narrow embed; horizontal room for more channels later).
  // Persisted like surface, via the profile-save effect below.
  const [stageHidden, setStageHidden] = uS(() => !!profileRef.current.stageHidden);
  // 16-channel STAGE view toggle (full-panel, mutually exclusive with the mixer).
  // Only meaningful on the big desk; the mixer is the default.
  const [stage16Open, setStage16Open] = uS(false);
  uE(() => { if (stage16Open) stageOpenedRef.current = true; }, [stage16Open]);
  const [consoleSize, setConsoleSize] = uS(() => (CONSOLE_SIZES.indexOf(profileRef.current.consoleSize) !== -1 ? profileRef.current.consoleSize : 0));
  const consoleSizeRef = uR(consoleSize);
  uE(() => { consoleSizeRef.current = consoleSize; }, [consoleSize]);

  // Free-tier email gate. emailDone is true once the viewer has either given an
  // email or chosen "skip for now" — both are remembered so the gate never
  // nags twice. Members and shared-link viewers are never gated.
  // Free-tier Practice taste budget. freePractice counts reps a free viewer has
  // finished; once it hits FREE_PRACTICE_LIMIT the gate (member pitch) takes
  // over. practiceSoftOpen is the live "can a free viewer still start a Practice
  // rep" answer used by loadLevel, the picker, and Practice Again.
  const [freePractice, setFreePractice] = uS(() => profileRef.current.freePractice || 0);
  const freeRepsLeft = TIER === 'member' ? Infinity : Math.max(0, FREE_PRACTICE_LIMIT - freePractice);
  const practiceSoftOpen = TIER === 'member' || freeRepsLeft > 0;
  // Ear Training free taste: three guided rounds, then three by-ear rounds,
  // then the membership pitch. Members are never gated.
  const etGuidedLeft = TIER === 'member' ? Infinity : Math.max(0, FREE_ET_GUIDED - etGuided);
  const etByEarLeft = TIER === 'member' ? Infinity : Math.max(0, FREE_ET_BYEAR - etByEar);
  const etByEarPhase = TIER !== 'member' && etGuided >= FREE_ET_GUIDED; // guided taste done
  const etExhausted = TIER !== 'member' && etGuided >= FREE_ET_GUIDED && etByEar >= FREE_ET_BYEAR;
  const feedbackSoftOpen = TIER === 'member' || !etExhausted;
  // The free tier's ring-out difficulty is driven by the phase, not a toggle:
  // guided until the three guided rounds are done, by-ear after. Members keep
  // manual control of the GUIDED/BY EAR switch.
  const feedbackFreeLabel = TIER === 'member' ? null
    : etExhausted ? null
    : etByEarPhase ? (etByEarLeft + ' FREE ROUND' + (etByEarLeft === 1 ? '' : 'S') + ' · BY EAR')
    : (etGuidedLeft + ' FREE ROUND' + (etGuidedLeft === 1 ? '' : 'S') + ' · GUIDED');

  const [emailDone, setEmailDone] = uS(() => OPTED_IN_PARAM || !!(profileRef.current.email || profileRef.current.emailSkipped));
  // Arriving via an ?optedin=1 link: remember it (as a skip, since Kit already
  // has them) so a later direct visit doesn't re-ask, when browser storage holds.
  uE(() => {
    if (OPTED_IN_PARAM && !profileRef.current.email && !profileRef.current.emailSkipped) {
      profileRef.current = { ...profileRef.current, emailSkipped: true };
      saveProfile(profileRef.current);
    }
  }, []);
  const captureEmail = (email, firstName) => {
    profileRef.current = { ...profileRef.current, email, firstName: firstName || '' };
    saveProfile(profileRef.current);
    submitToKit(email, firstName);
    setEmailDone(true);
  };

  // Welcome chooser. A brand-new signup picks their first experience: a guided
  // quick fix (the diagnosis game) or the full Essentials course. pathChosen is
  // true once they've picked, OR if they already have any progress (so an
  // existing user is never shown the chooser). Persisted, so it sticks.
  const [pathChosen, setPathChosen] = uS(() =>
    !!profileRef.current.pathChosen ||
    (profileRef.current.reps > 0) ||
    Object.keys(profileRef.current.completed || {}).length > 0
  );

  // The free "Know your console" walkthrough. A brand-new free visitor is
  // dropped into it as their first experience (the mount effect below loads the
  // board; walkPhase starts at 'intro' so the intro modal is up from frame one,
  // which also keeps the generic tour from flashing). walkPhase drives the
  // intro modal -> the in-board step panel -> the wrap; walkStep is the stop.
  // Members, returning visitors, and shared links skip it.
  // The Mixer Tutorial is now a set of individual lessons opened from the menu,
  // not one auto-launched whole-console tour. A fresh visitor lands on the menu
  // with Mixer Tutorial expanded, so there is no auto-walkthrough phase.
  const shouldWalk = false;
  const [walkPhase, setWalkPhase] = uS(null);
  const [walkStep, setWalkStep] = uS(0);

  // Persist the whole profile whenever a React-state field changes. Survives
  // refreshes; the save code is this same object. lastLevel / practiceFaults /
  // feedbackByEar drive "resume where I left off" on the next load.
  uE(() => {
    profileRef.current = { ...profileRef.current, completed, reps, lastLevel: levelIdx, practiceFaults, feedbackByEar, etGuided, etByEar, freePractice, surface, liveShow, stageHidden, consoleSize, userZoom };
    saveProfile(profileRef.current);
  }, [completed, reps, levelIdx, practiceFaults, feedbackByEar, etGuided, etByEar, freePractice, surface, liveShow, stageHidden, consoleSize, userZoom]);

  // Free tier: Ear Training difficulty follows the phase. Guided for the first
  // three rounds, by-ear after. Runs on entering the mode and when the guided
  // count crosses the threshold. Members are left to their own GUIDED/BY EAR toggle.
  uE(() => {
    if (TIER === 'member') return;
    if (!level || !level.isFeedbackMode) return;
    const want = etGuided >= FREE_ET_GUIDED;
    setFeedbackByEar(prev => (prev === want ? prev : want));
  }, [levelIdx, etGuided]);

  // Keep the fault-draw's surface global in sync. Digital-only faults (mute
  // groups, DCA) carry digital:true and are skipped by the draw unless this is
  // 'digital', so an analog player never gets a fault they can't reach.
  uE(() => { window.PRACTICE_SURFACE = surface; window.PRACTICE_FREE = (TIER !== 'member'); }, [surface]);
  // Free tier flag for the Practice rep generator: the free taste drops the
  // "check the speakers" verify goal so the sample reads as pure fault-finding.
  uE(() => { window.PRACTICE_FREE = (TIER !== 'member'); }, []);
  const practiceInfoRef = uR(null);

  // Drill ladder (member retention): current rung + clean solves banked toward
  // the next, mirrored into React state so the chip and debrief update live.
  // rankUp holds the rank just reached, for the one-rep "rank up" banner.
  // drillFocusRef marks that the member tapped TRAIN on the sign-off rung, so
  // the load path biases the draw toward healthy systems (read in loadLevel).
  const [rank, setRank] = uS(() => Math.min(6, Math.max(1, profileRef.current.rank || 1)));
  const [rankClean, setRankCleanState] = uS(() => Math.max(0, profileRef.current.rankClean || 0));
  const [rankUp, setRankUp] = uS(null);
  const drillFocusRef = uR(null);
  // "Practice what needs it": fault keys to bias the draw toward (the member's
  // rusty fault types). null = an even draw.
  const focusRef = uR(null);
  // First quick fix: set by the welcome chooser so a brand-new player's very
  // first rep carries a one-line "watch the meters" orientation in the brief.
  // Consumed (read + cleared) by loadLevel, so it only ever shows on that rep.
  const firstFixRef = uR(false);
  const [firstFix, setFirstFix] = uS(false);

  // Live Show mode: "the room is listening." When on, destructive diagnosis
  // (muting or pulling a healthy channel, or pulling the master) charges a
  // dropout the audience heard; PFL and the meters stay free. dropouts mirrors
  // the ref for the live tally; liveShowRef lets the move-diff effect read the
  // current value without re-subscribing.
  // Live Show is disabled for now (not production-ready): forced off regardless
  // of any persisted value, so the move-diff dropout logic never runs and none
  // of its UI shows. The toggle is removed from the Practice panel too.
  const [liveShow, setLiveShowState] = uS(false);
  const liveShowRef = uR(liveShow);
  const [dropouts, setDropouts] = uS(0);
  const dropoutsRef = uR(0);

  // Zero-fault "sign off" state (Practice Mode). signedOff lets a zero-fault
  // rep complete (a healthy system meets the win conditions from the start, so
  // auto-win is suppressed until the engineer actively declares it healthy).
  // wonRef mirrors the live win state so the sign-off handler can tell a
  // correct call from a premature one. signoffMsg is the "not yet" nudge;
  // falseSignoffRef counts premature sign-offs for the debrief/ledger.
  const [signedOff, setSignedOff] = uS(false);
  const [signoffMsg, setSignoffMsg] = uS(null);
  const wonRef = uR(false);
  const falseSignoffRef = uR(0);
  const attemptSignOff = () => {
    if (!level.isPractice || solved) return;
    if (wonRef.current) {
      setSignoffMsg(null);
      setSignedOff(true); // the win effect re-runs and completes the rep
    } else {
      falseSignoffRef.current += 1;
      setSignoffMsg("Not yet. Something is still off. Walk the signal path again.");
    }
  };

  // Record a finished practice rep into the per-fault ledger. Rep-level moves,
  // hints, and over-par are attributed to every fault the rep contained (the
  // honest approximation: "your crosspatch reps usually run 3 over par"). A
  // rep is "clean" when it was solved with no hints, at or under par. Writes
  // straight to the profile and saves; the persist effect preserves it.
  const recordPracticeLedger = () => {
    const info = practiceInfoRef.current;
    if (!info) return;
    // A zero-fault rep (nothing was broken) records under a synthetic key so
    // the stats panel shows "Healthy sign-off" and tracks restraint: touching a
    // working system, or a false sign-off, shows up as over-par there.
    const keys = (Array.isArray(info.faults) && info.faults.length) ? info.faults
               : (info.zeroFault ? ['__signoff'] : (info.goalKey ? ['__goal:' + info.goalKey] : null));
    if (!keys) return;
    const par = Number.isFinite(info.par) ? info.par : 0;
    const moves = movesRef.current || 0;
    const hints = hintsUsedRef.current || 0;
    const falseSignoffs = falseSignoffRef.current || 0;
    const overPar = Math.max(0, moves - par);
    // Clean = solved at/under par, no hints, no premature sign-off. For a
    // zero-fault rep par is 0, so clean means you touched nothing and signed
    // off once, correctly.
    const clean = hints === 0 && moves <= par && falseSignoffs === 0;
    // "Solid" on the coverage meter asks a softer, reachable question than the
    // at-par "clean" badge: did you fix it on your own, no hint, no premature
    // sign-off? Diagnosing a fault means soloing and nudging to find it, so an
    // honest solve usually runs a move or two over par. Gating "solid" on
    // at-or-under-par (par is 1 for most fault types) made the meter unreachable
    // in normal use — you could grind reps forever and stay at 0. Par stays on
    // as the sharpness number (overPar) in the stats panel and the debrief.
    const solvedUnaided = hints === 0 && falseSignoffs === 0;
    const prof = profileRef.current || defaultProfile();
    const ledger = { ...(prof.ledger || {}) };
    const now = Date.now();
    for (const key of keys) {
      const e = ledger[key] ? { ...ledger[key] } : { reps: 0, clean: 0, overPar: 0, hints: 0, last: 0 };
      e.reps += 1;
      if (clean) e.clean += 1;
      if (solvedUnaided) e.lastClean = now;
      e.overPar += overPar;
      e.hints += hints;
      e.last = now;
      ledger[key] = e;
    }
    // Drill ladder: a clean solve that meets the current rung's bar banks a
    // step; RANK_GATE steps advance the rank. Goal-task reps train a different
    // skill, so they never move the ladder. Capped at HIGHEST_LIVE_RANK until
    // the by-ear rungs ship: at the top the bar just fills and holds.
    let rankN = Math.max(1, Math.min(HIGHEST_LIVE_RANK, prof.rank || 1));
    let rankCleanN = Math.max(0, prof.rankClean || 0);
    let rankedUpTo = null;
    if (!info.goalKey && clean) {
      const d = { faults: (Array.isArray(info.faults) ? info.faults.length : 0), zeroFault: !!info.zeroFault, liveShow: !!liveShowRef.current, dropouts: dropoutsRef.current || 0 };
      if (rankByN(rankN).need(d)) {
        rankCleanN += 1;
        if (rankCleanN >= RANK_GATE) {
          if (rankN < HIGHEST_LIVE_RANK) { rankN += 1; rankCleanN = 0; rankedUpTo = rankN; }
          else { rankCleanN = RANK_GATE; }  // top of the live ladder: fill and hold
        }
      }
    }
    profileRef.current = { ...prof, ledger, practiceClean: (prof.practiceClean || 0) + (clean ? 1 : 0), rank: rankN, rankClean: rankCleanN };
    saveProfile(profileRef.current);
    setRank(rankN); setRankCleanState(rankCleanN);
    if (rankedUpTo) setRankUp(rankByN(rankedUpTo));
  };

  // First-run tour: shows once per browser, before anything else.
  const [tourOpen, setTourOpen] = uS(() => {
    try { return !window.localStorage.getItem(TOUR_KEY); } catch (e) { return false; }
  });
  const dismissTour = () => {
    try { window.localStorage.setItem(TOUR_KEY, '1'); } catch (e) {}
    setTourOpen(false);
  };

  // The Start Here completion card. Opened by openCompletion (the SolvedCard
  // ALL LEVELS COMPLETE button at the finale win) — click-driven since
  // 2026-10-18: the old auto-fire at the win could land over an open Monitor
  // EQ window and the two stacked. Reopenable from the same button after a
  // dismiss; SH_DONE_KEY no longer gates showing it, only the legacy beat.
  const [ctaOpen, setCtaOpen] = uS(false);
  // Which glossary term the student is hovering in the definitions panel.
  // Drives GlossaryHighlight, which washes the matching controls in amber.
  const [defHover, setDefHover] = uS(null);
  // The email ask, moved from the Start Here FINALE to after the FIRST Start
  // Here win (2026-10-18 council; the 2026-07-10 plan's "gate after the first
  // win inside Run the Show", mapped onto today's structure — Run the Show is
  // member-locked, so the free funnel's first win is a Start Here lesson).
  // A doorway ask reads as a toll before the payoff; after a real win it reads
  // as "save this". One ask per browser (own latch); members and already
  // opted-in viewers skip it entirely.
  const [firstWinEmail, setFirstWinEmail] = uS(false);
  uE(() => {
    try {
      if (window.localStorage.getItem(FIRST_WIN_ASK_KEY)) return;
      // The old finale beat already ran in this browser — never re-ask.
      if (window.localStorage.getItem(SH_DONE_KEY)) return;
      if (TIER === 'member' || emailDone) return;
      // First genuine win: a completed Start Here lesson. Practice reps and
      // Feedback rounds don't count — the ask belongs after course progress.
      if (!SCENARIOS.some((s) => s.isStartHere && completed[s.id])) return;
      window.localStorage.setItem(FIRST_WIN_ASK_KEY, '1');
      // The ask is a fullscreen overlay: clear the Monitor EQ window first so
      // the two never stack — the belt for a first win that lands while the
      // EQ panel is up (e.g. a viewer who jumps straight to the ring-out
      // lesson, or who opened EQ by hand).
      setEqPanelOpen(false);
      setFirstWinEmail(true);
    } catch (e) {}
  }, [completed, emailDone]);
  // Open the Start Here finale beat: the required fallback ask for a free
  // viewer who never submitted at the first-win beat (they closed the tab on
  // it) — required still means required: there is no skip — otherwise the
  // completion card. Click-driven on purpose (2026-10-18): the old auto-fire
  // at the win could land while the Monitor EQ window was still up from the
  // ring-out and the two stacked. The EQ overlay covers the sidebar, so the
  // SolvedCard button that calls this is unclickable until the EQ window is
  // closed; setEqPanelOpen(false) here is the belt for any other path.
  const openCompletion = () => {
    setEqPanelOpen(false);
    if (TIER !== 'member' && !emailDone) setFirstWinEmail(true);
    else setCtaOpen(true);
  };
  // Finale of the free Start Here course (SH_FINALE_ID): the win latches the
  // beat here, and openCompletion above drives what it opens — the card or
  // the fallback ask — from the SolvedCard's ALL LEVELS COMPLETE button
  // (2026-10-18 clash fix; they no longer auto-open). Latching still does its
  // original job: SH_DONE_KEY marks the old finale beat, so a legacy browser
  // that already passed it is never re-asked mid-course by the first-win
  // effect above.
  uE(() => {
    try {
      if (window.localStorage.getItem(SH_DONE_KEY)) return;
      if (!completed[SH_FINALE_ID]) return;
      window.localStorage.setItem(SH_DONE_KEY, '1');
    } catch (e) {}
  }, [completed]);

  // The active scenario. A Practice rep can carry a per-rep GOAL (its win
  // conditions + prompt text) in PRACTICE_LAST.winSpec — that's how Practice
  // does varied goals (build a monitor mix, gain-stage, speaker check) instead of
  // always "restore the full mix", and how a custom authored scenario sets its
  // own goal. Merging winSpec over the base level means every downstream read
  // (win checks, objective list, brief text) picks it up with no other change.
  const baseLevel = SCENARIOS[levelIdx];
  const level = (baseLevel.isPractice && practiceInfoRef.current && practiceInfoRef.current.winSpec)
    ? { ...baseLevel, ...practiceInfoRef.current.winSpec }
    : baseLevel;
  // The walkthrough steps for the ACTIVE Mixer Tutorial lesson. Each lesson
  // carries a `mixerSteps` list of indexes into WALK_STEPS; fall back to the
  // full step list for safety.
  const walkSteps = (level && Array.isArray(level.mixerSteps))
    ? level.mixerSteps.map((i) => WALK_STEPS[i]).filter(Boolean)
    : WALK_STEPS;

  // Tracks whether the engineer engaged PFL on a relevant channel at any
  // point during this level. Reset on level change. Used by Level 7
  // ("Check in PFL") and any other level with `requirePflCheck: true` —
  // the lesson is the WORKFLOW (solo → listen → unsolo → bring up), so
  // we record that the workflow was followed rather than just the end state.
  const pflCheckedRef = uR(false);
  // Latched true the first time THIS level pops the speakers, and it survives
  // the Reset that the pop forces (Reset re-runs loadLevel on the same index).
  // Lets a mistake-first lesson keep its "try it" step checked after the pop
  // wipes the board — the student did the step; the pop WAS the lesson.
  // Cleared only when the level actually changes.
  const hasPoppedRef = uR(false);

  // Same idea for a wedge that has RUNG at some point this attempt. A ring-out
  // lesson's first step is "turn it up until it rings", and the only honest
  // moment to tick that off is the moment it rings — but the ring is the very
  // thing the next step removes, so a live `feedback` test would un-tick itself
  // the instant the student fixes it and throw the guide back a step. Latched,
  // and cleared with hasPopped when the level changes.
  const hasRungRef = uR(false);

  // Which channels have been PFL'd at some point this attempt (channel number
  // -> true). Drives requirePflEach (Mic Inputs / DI Boxes: PFL each input
  // before you bring it up). Reset on level change.
  const pflChannelsRef = uR({});
  // One-way latch: has the Input List been opened at least once this level?
  // The "Open the Input List" step in the patch lessons reads this instead of
  // the live ioListOpen so that closing the (deliberately non-modal) panel
  // mid-lesson can't un-check step 1 and snap the guide backward. Reset per
  // level; the live ioListOpen still drives the panel itself.
  const ioListOpenedRef = uR(false);
  // Same one-way latch for the 16-channel STAGE view: has the student switched
  // to the stage at least once this level? The orientation course's "open the
  // stage" step reads this, so switching back to the mixer (which the next step
  // asks for) can't un-check the step that sent them there.
  const stageOpenedRef = uR(false);

  // Per-destination "checked" latch for verifyEach levels (Test the System).
  // Once playback reaches a speaker, that speaker stays checked for the rest
  // of the attempt, so the student verifies them one at a time. Reset on
  // level change. Keyed by dest (pa_l, pa_r, wedge, wedge2).
  const verifiedRef = uR({});
  // Signature of the output patch the verify latches were earned against. A
  // repatch invalidates every check made before it: a speaker "verified"
  // through the wrong line was never verified.
  const verifiedPatchSigRef = uR(null);

  // Per-source amplitude envelope state. Updated every animation frame so
  // meters bounce and audio breathes like a real signal. The ref is read by
  // computeAudio; the tick state forces a re-render so visible meters track
  // the envelope. Declared BEFORE the audio useMemo because that memo reads
  // envelopeRef and depends on envTick.
  const envelopeRef = uR({ vocal: 1, vocal2: 1, guitar: 1, laptop: 1 });
  // Per-source running level + a shared read buffer, for the analyser-driven
  // meters (the meter follows the real audio, self-normalized to this average).
  const meterAvgRef = uR({});
  const meterBufRef = uR(null);
  const envStartRef = uR(performance.now() / 1000);
  const [envTick, setEnvTick] = uS(0);
  // Feedback ring voices — built in ensureAudio, gated by detectFeedback.
  // feedbackRiskRef is updated every render below so the animation loop can
  // adjust voice gains without taking a hard dependency on state.
  // feedbackRingsRef carries EVERY active ring ({hzIndex into FULL_EQ_HZ,
  // risk}) — more than one frequency can ring at once in Feedback Mode, and
  // each gets its own voice.
  const feedbackChainRef = uR(null);
  const monitorEqRef = uR(null);
  const feedbackRiskRef = uR(0);
  const feedbackRingsRef = uR([]);
  // Per-band ring ENERGY (0..1), integrated over time in the animation loop so a
  // ring builds toward a howl the longer it is left, and rings out with a tail
  // when cleared. lastFbTimeRef gives the real per-frame dt for that integration.
  const ringEnergyRef = uR(null);
  const lastFbTimeRef = uR(0);
  // Per-channel feedback level (0..1), so a program-muted mic still shows the
  // ring swelling on its meter and fader even with no sample playing.
  const fbMeterRef = uR({});
  const lastSevRef = uR(null);
  // Peak ring energy this frame + how many bands are ringing, surfaced to the UI
  // so the warning can escalate (ring -> howl -> "too many, pull it down").
  const [fbSeverity, setFbSeverity] = uS({ level: 0, count: 0 });

  // Band: use STEADY (envelope-free) levels for `audio`, which drives the
  // audible per-channel gains. The recorded clips carry their own dynamics, so
  // folding the per-frame envelope into the gain is wrong — and because the
  // band recomputes `audio` only on state changes (no per-frame re-render),
  // every fader move would otherwise re-snapshot every channel's instantaneous
  // envelope and jolt the whole mix balance. Meters still bounce: they read the
  // live envelope directly in the animation loop, not from `audio`.
  const audio = uM(() => window.computeAudio(state, state.big16 ? {} : envelopeRef.current), [state, envTick]);
  // Current state for the animation loop (which has stale closures) — used to
  // drive the band's meters straight to the DOM without a per-frame re-render.
  const stateRef = uR(state); stateRef.current = state;

  // Clipping warnings read the SETTLED signal only (clipsStable, below).
  // With real crest factors, live peaks cross thresholds on every hot
  // syllable; keying the warning off the live signal made the modal storm
  // open on a peak, and each trough reset the dismissal latch so it popped
  // right back — a loop that locked the user away from the gain knob. A
  // clip warning is about the SETTING being wrong, so it reads the setting.
  // The meters still dance on the live signal; ears + red LEDs carry the
  // transient story.
  // Stereo-PA balance issue (L vs R off, or volumes mismatched). Same
  // recoverable-warning treatment as clipping: blocks the win, clears the
  // moment the user matches them up.
  const paBalanceIssue = (window.detectPaBalanceIssue ? window.detectPaBalanceIssue(state) : null);
  // Feedback loop. Same recoverable-warning treatment as clipping/balance:
  // blocks the win, clears the moment the engineer pulls aux send / wedge
  // volume / engages HPF and brings the loop gain back below threshold.
  // Detected on the BASELINE audio (no envelope) — same reasoning as the
  // preamp clip block: feedback margin is a property of the loop GAIN (the
  // knob settings), not of where the program material happens to be this
  // frame. Envelope-driven detection made the warning strobe at onset as
  // peaks crossed the threshold and troughs fell back under it.
  const audioBaseline = uM(() => window.computeAudio(state), [state]);
  // Clip detection on the STEADY signal (no per-frame envelope). Drives the
  // warning modal, the status pill, the win, and the brief's objectives, so a
  // dynamic source (a vocal peaking) never flips any of them on and off as it
  // rides above and below a threshold. A clip flag means the KNOBS are set
  // wrong, and it stays put until the knobs change.
  const clipsStable = uM(() => (window.detectClipping ? window.detectClipping(audioBaseline, state) : []), [audioBaseline, state]);
  const feedback = (window.detectFeedback ? window.detectFeedback(state, audioBaseline) : null);
  // Per-wedge feedback margin (dB of headroom before the ring line), from the
  // settled signal so it doesn't flicker with program material. Fed to the stage
  // wedges so the student can see how close to the edge each monitor is running.
  const fbMargins = uM(() => (window.feedbackMargins ? window.feedbackMargins(state, audioBaseline) : null), [state, audioBaseline]);
  // Push the risk amount into a ref so the audio animation loop can read
  // it without taking a dependency on state. 0 when no loop is hot.
  feedbackRiskRef.current = feedback ? feedback.riskAmount : 0;
  // Every active ring, mapped to its voice (index into FULL_EQ_HZ). Voices
  // whose band stops ringing decay to silence in the animation loop.
  feedbackRingsRef.current = (feedback && feedback.rings ? feedback.rings : [])
    .map(r => ({ hzIndex: FULL_EQ_HZ.indexOf(r.hz), risk: r.risk, channelIdx: r.channelIdx }))
    .filter(r => r.hzIndex >= 0);
  // Auto-open the Monitor EQ panel the moment a WEDGE starts ringing, so the
  // engineer is taken right to the ring-out (the band is glowing). Only on the
  // no-ring -> ring transition, so closing it by hand mid-ring sticks. A mains
  // howl (gain too hot, no glowing band) is deliberately excluded — it points at
  // the gain, not the monitor EQ, so opening the panel there only misleads.
  const wedgeRinging = !!(feedback && feedback.wedgeRing);
  // ...but ONLY where the graphic EQ is actually the answer. A guided lesson whose
  // fix is the HPF, a mute, or mic placement was having the EQ thrown open over
  // the top of it, which both suggests the wrong tool and hides the guide's
  // spotlight (an open panel suppresses the walkthrough target). Ring-out lessons
  // opt in with `eqRingOut`; Practice and Ear Training always ring out, so they
  // keep the old behavior. (Kyle 2026-07-22.)
  const eqIsTheFix = !!(level && (level.eqRingOut || level.isFeedbackMode || level.isPractice));
  // eqIsTheFix is in the deps so moving from one ringing lesson straight to another
  // (where only the flag changed, not the ring) still re-evaluates. Closing the panel
  // by hand mid-ring still sticks, because neither dependency changes when you do.
  uE(() => { if (wedgeRinging && eqIsTheFix) setEqPanelOpen(true); }, [wedgeRinging, eqIsTheFix]);
  // Latch the first ring for ctx.hasRung (see hasRungRef). Set here, on the same
  // signal the panel and the flash read, so all three agree on when it started.
  uE(() => { if (wedgeRinging) hasRungRef.current = true; }, [wedgeRinging]);
  // Gating the auto-open ALSO went and gated the red MONITOR EQ button, and that
  // was wrong (Kyle 2026-07-24: Start Here "Ring Out the Feedback" left a student
  // with a ringing wedge and nothing pointing at the fix, so they never reached
  // the level objective or the opt-in). The panel opening itself is a teaching
  // choice per lesson; the button going red is just the truth about the system.
  // So: any WEDGE ring lights it, everywhere. `wedgeRing` already excludes a mains
  // howl, which the monitor EQ cannot fix.

  // Fault warning modal. Pops and distortion announce themselves in a centered
  // dismissible modal instead of stacking text into the brief card. Feedback is
  // excluded (it has its own ring-out flow, the Monitor EQ auto-opens above), and
  // PA imbalance is excluded too: the small IMBALANCED tag in the objective area
  // is enough, and the modal was more annoying than useful. Keyed by a fault
  // signature so a brand-new event reopens the modal, but dismissing an ongoing
  // fault sticks until the engineer fixes it (or it clears on its own).
  const [warnOpen, setWarnOpen] = uS(false);
  const warnDismissedSigRef = uR(null);
  // Suppress the warning modal for a real wedge ring (its own ring-out flow above)
  // and for PA imbalance (objective tag only). A mains-only howl still falls
  // through to the clip/distortion warning, which points at the too-hot gain.
  const faultSig = wedgeRinging ? null
                : state.phantomPop ? ('pop:' + state.phantomPop.at)
                : (clipsStable && clipsStable.length) ? 'clip'
                : null;
  uE(() => {
    if (faultSig == null) { setWarnOpen(false); warnDismissedSigRef.current = null; return; }
    if (faultSig !== warnDismissedSigRef.current) setWarnOpen(true);
  }, [faultSig]);

  const stableRef = uR(null);
  uE(() => {
    if (solved) return;
    // Practice reps can attach extra conditions to the fault they rolled
    // (e.g. the feedback fault requires the singer's monitor to stay UP, so
    // killing the send isn't a fix — the EQ ring-out is).
    const effConditions = (level.conditions || []).concat(
      (level.isPractice && practiceInfoRef.current && practiceInfoRef.current.extraConditions) || []);
    const flowOk = window.checkWin(state, effConditions);
    // Block the win if the user popped the speakers getting here. The lesson
    // is the procedure, not the end state. Reset clears phantomPop.
    const blocked = !!state.phantomPop;
    if (blocked) hasPoppedRef.current = true;
    // Non-signal-flow requirements (e.g. "all PFL buttons must be off" on
    // the PFL-monitoring level). Each is a state predicate that must hold
    // alongside the regular signal-flow conditions.
    const pflClear = !level.requireNoPfl || state.channels.every(c => !c.solo);
    // Procedural requirement: did the engineer use PFL to verify the
    // channel before sending it to the room? Tracked by pflCheckedRef
    // (latched true on any solo engage during the level).
    const pflChecked = !level.requirePflCheck || pflCheckedRef.current;
    // PFL each listed channel (Mic Inputs / DI Boxes): every input verified in
    // the cans before it goes to the room.
    const pflEachOk = !level.requirePflEach || level.requirePflEach.every(ch => pflChannelsRef.current[ch]);
    // Distortion blocks the win for as long as anything is in the red. The
    // moment the user backs off, the block lifts. No reset required.
    const clean = clipsStable.length === 0;
    const balanced = !paBalanceIssue;
    const noFeedback = !feedback;
    // Tone gate (Feedback Mode): the wedge still has to sound like the
    // singer's voice when the ring-out is done. eqGain.wedge is the fraction
    // of the wedge's response the EQ has left standing — a real ring-out
    // takes a few cuts of a few dB and stops, so the gate only fails when
    // the cuts go far past what the rings actually needed.
    const toneOk = !level.toneGate || ((audio.eqGain && audio.eqGain.wedge) || 1) >= level.toneGate;
    // Power-on lesson: the win is bringing the rig up, not sending signal.
    // Console, power amp, and both wedges all on. The pop check (blocked,
    // above) handles wrong order, so this just confirms the end state.
    const poweredUp = !level.requirePowerOn || (() => {
      const o = state.outputs;
      const consoleOn = state.mixer ? state.mixer.on !== false : true;
      // MX-8 has two wedges; the 16-ch board has four. Only require the wedges
      // that exist (mirrors the powerStatus checklist), or "Wedges on" can
      // never pass on the small board where W3/W4 aren't rendered.
      const wedgesOn = state.big16
        ? (!!(o.wedge && o.wedge.on) && !!(o.wedge2 && o.wedge2.on) && !!(o.wedge3 && o.wedge3.on) && !!(o.wedge4 && o.wedge4.on))
        : (!!(o.wedge && o.wedge.on) && !!(o.wedge2 && o.wedge2.on));
      // Passive rig: the power amp is the PA's switch. Active rig: each PA
      // speaker is its own powered box. Check whichever applies.
      const passive = (state.topology && state.topology.paRig) === 'amp+passive';
      const paOn = passive
        ? !!(o.amp && o.amp.on)
        : (!!(o.pa_l && o.pa_l.on) && !!(o.pa_r && o.pa_r.on));
      return consoleOn && wedgesOn && paOn;
    })();
    // Power-down lesson: the mirror image. Win when the master fader is
    // pulled down, every powered box is off, and the console is off. Order
    // is enforced by the off-pop (console off while a speaker is still live
    // pops it — blocked above), so this just confirms the end state.
    const poweredDown = !level.requirePowerOff || (() => {
      const o = state.outputs;
      const consoleOff = state.mixer ? state.mixer.on === false : false;
      // Board-aware like wedgesOn: on the 16-ch board all four wedges must be
      // off; the MX-8 only has W1/W2 (W3/W4 aren't rendered there, so a state
      // that left them "on" would otherwise be unwinnable).
      const wedgesOff = state.big16
        ? (!(o.wedge && o.wedge.on) && !(o.wedge2 && o.wedge2.on) && !(o.wedge3 && o.wedge3.on) && !(o.wedge4 && o.wedge4.on))
        : (!(o.wedge && o.wedge.on) && !(o.wedge2 && o.wedge2.on));
      const passive = (state.topology && state.topology.paRig) === 'amp+passive';
      const paOff = passive
        ? !(o.amp && o.amp.on)
        : (!(o.pa_l && o.pa_l.on) && !(o.pa_r && o.pa_r.on));
      const masterDown = state.master.fader <= 0.1;
      return consoleOff && wedgesOff && paOff && masterDown;
    })();
    // Zero-the-console lesson (Power-Down): every strip back to its default
    // state — gain, aux sends, fader down; muted; pan centered; HPF, polarity
    // and +48V off; master down AND muted. The next engineer powers on into a
    // predictable desk. Mirrors normalizeChannels' zeroed shape.
    const ZTOL = 0.02;
    const zeroedOk = !level.requireZeroed || (
      state.channels.every(c =>
        c.mute && c.fader <= ZTOL && c.gain <= ZTOL &&
        c.aux1 <= ZTOL && c.aux2 <= ZTOL && (c.aux3 || 0) <= ZTOL && (c.aux4 || 0) <= ZTOL &&
        Math.abs(c.pan - 0.5) <= ZTOL &&
        !c.highpass && !c.phantom
      ) && state.master.mute && state.master.fader <= ZTOL
    );
    // Verify-each lesson (Test the System): latch each speaker the moment
    // playback reaches it, then require every speaker to have been checked.
    // Latching here (not just in render) keeps the win in sync on the same
    // state change that completes the last check, so there's no one-frame lag.
    let verifiedOk = true;
    if (level.verifyEach && level.verifyEach.length) {
      // Moving the output patch clears every latch: whatever played before the
      // move played through the old lines, so those checks no longer stand.
      const patchSig = JSON.stringify([state.outPatch || null, state.outFan || null]);
      if (verifiedPatchSigRef.current !== null && verifiedPatchSigRef.current !== patchSig) {
        verifiedRef.current = {};
      }
      verifiedPatchSigRef.current = patchSig;
      const va = window.computeAudio(state);
      for (const v of level.verifyEach) {
        const cont = va.contributions[v.source];
        const lvl = cont ? (v.dest === 'pa' ? Math.max(cont.pa_l, cont.pa_r) : (cont[v.dest] || 0)) : 0;
        // othersMax makes a check one-sided: Main L only counts as checked
        // while Main R is silent, so a center-pan blast cannot tick both.
        const oneSided = !v.othersMax || Object.keys(v.othersMax).every((k) => (cont ? (cont[k] || 0) : 0) <= v.othersMax[k]);
        if (lvl >= (v.min != null ? v.min : 0.25) && oneSided) verifiedRef.current[v.dest] = true;
        if (!verifiedRef.current[v.dest]) verifiedOk = false;
      }
    }
    // System gain-structure lesson: the reference channel fader and the master
    // fader must both sit at unity. With those pinned, the PA corridor in
    // conditions can only be met with the speaker volume — that's the lesson.
    const gainOk = !level.gainStructure || (() => {
      const gs = level.gainStructure;
      const unity = gs.unity != null ? gs.unity : 0.75;
      const tol = gs.faderTol != null ? gs.faderTol : 0.06;
      // The gain-structure skill is the INPUT gain: level set at the top of the
      // chain, in a healthy band, by hand in PFL.
      let inputOk = true;
      if (gs.inputBand) {
        const a = window.computeAudio(state);
        const lvl = (a.chanInBaseline && a.chanInBaseline[(gs.refChannel || 1) - 1]) || 0;
        inputOk = lvl >= gs.inputBand[0] && lvl <= gs.inputBand[1];
      }
      // inputBandAll = every listed input channel's gain sits in the healthy meter
      // band (the final-exam check, so a starved gain cannot be faked with a
      // cranked fader). Same band the single-channel input lessons gate on.
      if (gs.inputBandAll) {
        const aAll = window.computeAudio(state);
        const chs = gs.inputChannels || [1, 2, 3, 4];
        inputOk = inputOk && chs.every((ch) => {
          const lvl = (aAll.chanInBaseline && aAll.chanInBaseline[ch - 1]) || 0;
          return lvl >= gs.inputBandAll[0] && lvl <= gs.inputBandAll[1];
        });
      }
      // gainOnly = test the input gain and nothing else. The fader position is a
      // mix choice, not a pass/fail — requiring it at unity would teach that a
      // fader must always sit at unity, which is false (Kyle 2026-07-06).
      if (gs.gainOnly) return inputOk;
      const masterOk = !state.master.mute && Math.abs(state.master.fader - unity) <= tol;
      // No refChannel = master-only gain lesson (The Gig: playback gets pulled
      // back down after the speaker test, so no single channel is pinned).
      if (!gs.refChannel) return masterOk && inputOk;
      const refCh = state.channels[gs.refChannel - 1];
      if (!refCh) return false;
      // "Up at unity" = unmuted AND fader at the unity mark. Used by the guided
      // Set the Input Level lesson, where bringing the channel up to the unity
      // reference is the taught step, not a claim that faders live at unity.
      const fadersOk = !refCh.mute && Math.abs(refCh.fader - unity) <= tol && masterOk;
      return fadersOk && inputOk;
    })();
    // Patch gate (the patch lesson + every practice rep): sources on their
    // listed ports, snake tails on their numbered channels, console outputs
    // into snake 1-6, speaker lines on their planned ports. A pro's patch
    // matches the paperwork (the Input List).
    const patchOk = !level.requirePatch || (state.big16
      ? (window.big16PatchOk ? window.big16PatchOk(state) : true)   // 16-ch: cables + mic inputs must match the input list
      : (() => {
      const c = state.cables || {};
      const cablesOk = c.vocal === 1 && c.vocal2 === 2 && c.guitar === 3 && c.laptop === 4;
      const fo = state.fanOut || [1, 2, 3, 4];
      const fanOutOk = fo.length === 4 && fo[0] === 1 && fo[1] === 2 && fo[2] === 3 && fo[3] === 4;
      // MX-8 uses four returns only (L, R, AUX 1 -> Wedge 1, AUX 2 -> Wedge 2).
      // W3/W4 and the AUX 3/4 returns don't exist on this board; requiring them
      // here made every requirePatch lesson unwinnable while the on-screen
      // patchStatus checklist (four slots) showed all green. Keep in lockstep
      // with patchStatus.
      const ofn = state.outFan || window.DEFAULT_OUT_FAN;
      const outFanOk = ofn[1] === 'mainL' && ofn[2] === 'mainR' && ofn[3] === 'aux1' && ofn[4] === 'aux2';
      const op = state.outPatch || window.DEFAULT_OUT_PATCH;
      const outOk = op.pa_l === 1 && op.pa_r === 2 && op.wedge === 3 && op.wedge2 === 4;
      return cablesOk && fanOutOk && outFanOk && outOk;
    })());
    // Start Here: a lesson can require the app sound to be on (requireSound) and
    // that the student moved a set of channel faders (requireAdjust), to feel
    // what each control does. Both default to satisfied when the level omits them.
    const soundOk = !level.requireSound || audioOn;
    // Balance the Band: latch each required fader once it has been pulled >= 12 dB
    // below where it loaded (a clear, audible move for a beginner). Latching means
    // putting the fader back does not un-check the objective.
    if (level.requireAdjust && adjustBaseRef.current) {
      level.requireAdjust.forEach((ch) => {
        const c = state.channels[ch - 1]; const base = adjustBaseRef.current[ch - 1];
        if (c && base != null && (taperDb(base, FADER_TAPER) - taperDb(c.fader ?? 0, FADER_TAPER)) >= 6) adjustLatchRef.current[ch] = true;
      });
    }
    const adjustOk = !level.requireAdjust || level.requireAdjust.every((ch) => !!adjustLatchRef.current[ch]);
    // Mixing Monitors: a lesson can require the high-pass filter engaged on a
    // set of channels (requireHpfOn: [1, 2]). State-checked like the mute or
    // phantom switches: the HPF button is either in or out.
    const hpfOk = !level.requireHpfOn || level.requireHpfOn.every((ch) => { const c = state.channels[ch - 1]; return !!(c && c.highpass); });
    // Output-check lesson: the test ends with every listed speaker switched
    // back on. Stops a "solved" board whose mains never came back.
    const outputsOnOk = !level.requireOutputsOn || level.requireOutputsOn.every((k) => { const o = state.outputs[k]; return !!(o && o.on); });
    // Mixing Monitors ring-out: a lesson can require a raw aux send to sit at or
    // above (or between) a level, read STRAIGHT OFF THE KNOB (requireSend:
    // [{ ch:1, aux:1, min:0.6 }]). This is immune to the wedge EQ — the ring-out
    // lesson needs the send kept UP so the fix is the graphic-EQ cut, not pulling
    // the singer down, and the post-EQ contribution can't gate that because the
    // cut itself lowers it. State-checked like mute/HPF.
    const sendOk = !level.requireSend || level.requireSend.every((r) => {
      const c = state.channels[r.ch - 1];
      if (!c) return false;
      const v = c['aux' + r.aux] || 0;
      if (r.min != null && v < r.min) return false;
      if (r.max != null && v > r.max) return false;
      return true;
    });
    // Managing Feedback: a lesson can require a wedge to keep at least N dB of
    // gain-before-feedback HEADROOM (requireMargin: { wedge: 6 }). Reads the same
    // feedbackMargins model the on-wedge "+N dB to F/B" readout shows, so the
    // "run it loud but leave about 6 dB" discipline is graded, not just eyeballed.
    // feedbackMargins returns the hottest loop in dB (higher = closer to ringing);
    // the usable margin is its negative. No mic loop on a wedge = huge margin.
    const marginOk = !level.requireMargin || (() => {
      const fm = window.feedbackMargins ? window.feedbackMargins(state, window.computeAudio(state)) : null;
      if (!fm) return false;
      return Object.keys(level.requireMargin).every((k) => (fm[k] != null ? -fm[k] : 999) >= level.requireMargin[k]);
    })();
    // Managing Feedback: a lesson can require a channel to be MUTED — an unused
    // open mic has to be CLOSED, not just turned down in one send (it is still
    // live in every other mix). requireMute: [2].
    const muteOk = !level.requireMute || level.requireMute.every((ch) => { const c = state.channels[ch - 1]; return !!(c && c.mute); });
    const normalWon = flowOk && pflClear && pflChecked && pflEachOk && clean && balanced && noFeedback && toneOk && poweredUp && poweredDown && zeroedOk && verifiedOk && gainOk && patchOk && soundOk && adjustOk && hpfOk && outputsOnOk && sendOk && marginOk && muteOk;
    // A "hear the pop" lesson (popIsTheGoal) inverts the whole thing: causing
    // the pop IS the objective. The win is simply that the student has popped
    // the system this attempt (hasPoppedRef, set above when `blocked` went
    // true), and the pop does NOT block it — the warning modal that fires with
    // it is the teaching, and dismissing it drops to the debrief. Without this
    // override the lesson would auto-win at load (empty conditions -> normalWon
    // true) AND never win once popped (blocked), i.e. exactly backwards.
    const won = level.popIsTheGoal ? hasPoppedRef.current : normalWon;
    // Mirror the live, truly-winnable state so the sign-off button can tell a
    // correct "system is healthy" call from a premature one.
    wonRef.current = won && (!blocked || !!level.popIsTheGoal);
    // A zero-fault practice rep is healthy from the start, so auto-win is
    // suppressed: the engineer has to recognize it and sign off. Every other
    // rep still auto-wins the moment the fix lands.
    const isZeroFault = level.isPractice && practiceInfoRef.current && practiceInfoRef.current.zeroFault;
    // Sandbox / Free Play never "wins" — there is nothing to solve. Warnings and
    // statuses above still compute, so clipping a fader still flags in free play.
    const effWon = won && (!isZeroFault || signedOff) && !level.isSandbox && !level.isWalkthrough;
    if (effWon && (!blocked || level.popIsTheGoal)) {
      if (!stableRef.current) {
        stableRef.current = setTimeout(() => {
          setSolved(true);
  try {
    const sd = JSON.parse(localStorage.getItem(showDayStorageKey) || 'null');
    if (sd && sd.date === todayStr()) {
      const outcome = (clipsStable && clipsStable.length) ? 'survived_degraded' : 'survived';
      track('show_day_result', { date: sd.date, outcome: outcome });
               setShowDayResult({ outcome: outcome, date: sd.date });
      try { localStorage.setItem(showDayStorageKey, JSON.stringify({ date: sd.date, started: sd.started, finished: Date.now(), outcome: outcome })); } catch (e) {}
    }
  } catch (e) {}
           if (!level.isPractice && !level.isFeedbackMode) { setSurvivedFlash(true); setTimeout(() => setSurvivedFlash(false), 2400); }
          bumpStreak(); // any finished session (lesson, rep, ring-out) counts today
           // Council 2026-10-29 "one thing to do first": audible success cue on
           // the first START HERE win so the milestone is felt, not just metered.
           if (audioOn && !level.isPractice && !level.isFeedbackMode) {
             try {
               const ctx = ctxRef.current;
               if (ctx && ctx.state === 'running') {
                 const t0 = ctx.currentTime;
                 const o = ctx.createOscillator(); o.type = 'triangle';
                 o.frequency.setValueAtTime(660, t0);
                 o.frequency.exponentialRampToValueAtTime(880, t0 + 0.12);
                 const g = ctx.createGain();
                 g.gain.setValueAtTime(0.18, t0);
                 g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
                 o.connect(g); g.connect(ctx.destination);
                 o.start(t0); o.stop(t0 + 0.24);
               }
             } catch (_) {}
           }
          setCompleted(c => ({ ...c, [level.id]: true }));
          // Funnel: lessons and gig challenges are Start Here progress;
          // practice and ear-training completions report under their own
          // families below so the funnel can tell the three apart.
          if (!level.isPractice && !level.isFeedbackMode) track('start_here_progress', { id: level.id, tier: TIER });
          // A finished practice rep counts, every time — that's the metric
          // the debrief celebrates. Record it into the per-fault ledger first
          // (reads this rep's moves/hints/par), then bump the counter.
          if (level.isPractice) {
            recordPracticeLedger(); setReps(r => r + 1);
            // Free tier: a finished rep spends one of the free-taste budget.
            // Members are never counted (their reps are unlimited anyway).
            if (TIER !== 'member') setFreePractice(n => n + 1);
            track('practice_taste', { tier: TIER });
          }
          // Free tier Ear Training: a finished round spends the guided or by-ear
          // budget, depending on the mode it was run in.
          if (level.isFeedbackMode && TIER !== 'member') {
            if (feedbackByEar) setEtByEar(n => n + 1);
            else setEtGuided(n => n + 1);
            track('ear_training', { mode: feedbackByEar ? 'by_ear' : 'guided' });
          }
        }, 900);
      }
    } else if (stableRef.current) {
      clearTimeout(stableRef.current);
      stableRef.current = null;
    }
    return () => { if (stableRef.current) { clearTimeout(stableRef.current); stableRef.current = null; } };
  }, [state, solved, signedOff, audioOn]);

  // Brief red flash whenever a new phantomPop event lands. The persistent
  // warning chip (in BriefCard) sticks around until the next reset; the
  // flash here just gives an immediate "you broke something" beat.
  const [popFlash, setPopFlash] = uS(false);
  const [survivedFlash, setSurvivedFlash] = uS(false);
  const [showDayResult, setShowDayResult] = uS(null);
  const [byoOpen, setByoOpen] = uS(false);
  const [byoText, setByoText] = uS('');
  const [byoMatch, setByoMatch] = uS(null);
  uE(() => {
    if (!state.phantomPop) return;
    setPopFlash(true);
    // The audible "ow" to go with the visual one. Only when sound is on.
    if (audioOn) playPopSfx();
    const t = setTimeout(() => setPopFlash(false), 900);
    return () => clearTimeout(t);
  }, [state.phantomPop && state.phantomPop.at]);

  const ctxRef = uR(null);
  const masterGainRef = uR(null);
  const chainsRef = uR({});
  // Incremental graph builders, published by ensureAudio so a later board
  // switch (e.g. into the 16-channel board) can build the chains + load the
  // stems for sources that weren't on the board when sound first turned on.
  const buildChainRef = uR(null);
  const startClipsRef = uR(null);

  // Pop sound effect — fires on every pop event (phantom into a live
  // channel, plug into a live channel, console power transient into live
  // speakers, amp blast). A low thump plus a click of filtered noise, the
  // shape of a real connector/DC transient. Plays straight to the device
  // output rather than through the mix chains: a pop is an event in the
  // room, not a signal on a bus, and it should be heard no matter which
  // destination the engineer is monitoring.
  const playPopSfx = () => {
    const ctx = ctxRef.current;
    if (!ctx || ctx.state !== 'running') return;
    try {
      const t0 = ctx.currentTime;
      // Low thump: sine dropping 140 → 45 Hz with a fast decay.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t0);
      osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.18);
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.5, t0);
      og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(og); og.connect(ctx.destination);
      osc.start(t0); osc.stop(t0 + 0.3);
      // Contact click: a few milliseconds of decaying noise through a
      // highpass, the "snap" on top of the thump.
      const len = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const ng = ctx.createGain(); ng.gain.value = 0.3;
      src.connect(hp); hp.connect(ng); ng.connect(ctx.destination);
      src.start(t0);
    } catch (e) {}
  };

  uE(() => {
    let raf = 0;
    let lastRenderMs = 0;
    const loop = () => {
      // Diagnostic: freeze the entire per-frame meter loop (no analyser reads,
      // no ballistics, no feedback, no re-render) so the main thread is nearly
      // idle while the audio graph keeps playing on its own thread.
      if (LITE_FREEZE) { raf = requestAnimationFrame(loop); return; }
      const t = performance.now() / 1000 - envStartRef.current;
      const ctxRunning = ctxRef.current && ctxRef.current.state === 'running';
      for (const k of METER_SOURCES) {
        const synthF = envelopeFactor(k, t);
        const chain = chainsRef.current && chainsRef.current[k];
        const stc = stateRef.current;
        const progMuted = !!(stc && stc.programMute && stc.programMute[k]);
        if (progMuted) {
          // Program-muted: silence the sample into the meter and audio, but let
          // FEEDBACK still register — an open mic with no one singing still rings,
          // and the swell should show on this channel's meter and fader.
          if (chain && chain.envelope) { chain.envelope.gain.value = 0; chain._pmZeroed = true; }
          let chIdx = -1;
          if (stc && stc.channels && window.sourceFor) for (let i = 0; i < stc.channels.length; i++) { if (window.sourceFor(stc, i) === k) { chIdx = i; break; } }
          const fb = (chIdx >= 0 && fbMeterRef.current) ? (fbMeterRef.current[chIdx] || 0) : 0;
          const tgt = Math.min(4.5, fb * 4.5);
          const cur0 = envelopeRef.current[k] != null ? envelopeRef.current[k] : 0;
          envelopeRef.current[k] = tgt > cur0 ? cur0 + (tgt - cur0) * 0.6 : cur0 + (tgt - cur0) * 0.25;
          continue;
        }
        // Restore the envelope the frame after a source is un-muted.
        if (chain && chain.envelope && chain._pmZeroed) { chain.envelope.gain.value = chain.skipEnvelope ? 1 : synthF; chain._pmZeroed = false; }
        // AUDIO modulation: the synth band sources get the synthetic envelope.
        // Recorded clips carry their own dynamics (skipEnvelope) and the
        // playback bed has no profile, so neither gets a fake wiggle.
        if (chain && chain.envelope && !chain.skipEnvelope && ENV_PROFILES[k]) {
          chain.envelope.gain.value = synthF;
        }
        // METER level: follow the ACTUAL audio through the channel when it's
        // playing, so the meter rises and falls with what you hear — a vocal
        // drops in its gaps, a hit spikes. Self-normalized to the channel's own
        // recent level, so the meter still sits where the gain staging put it
        // (the calibration the lessons rely on) and bounces with the material.
        // Synthetic fallback before sound is on (no context / no analyser).
        if (chain && chain.analyser && ctxRunning) {
          const buf = meterBufRef.current || (meterBufRef.current = new Float32Array(chain.analyser.fftSize));
          chain.analyser.getFloatTimeDomainData(buf);
          let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          const rms = Math.sqrt(sum / buf.length);
          let avg = meterAvgRef.current[k];
          if (avg == null) avg = rms;
          // Track the active level and hold it through silence (so gaps read as
          // a drop, not a re-normalized "always 100%"). Slow time constant.
          if (rms > 0.005) avg = avg * 0.997 + rms * 0.003;
          meterAvgRef.current[k] = avg;
          let f = avg > 1e-4 ? rms / avg : 0;
          // Real crest factors pass through now (a vocal peaks 12+ dB over its
          // average). The old 1.25 cap existed because the old model had only
          // ~2 dB of headroom; with a true 18 dB between nominal and clip the
          // meters can dance the way real meters do.
          f = Math.max(0, Math.min(4.5, f));
          const cur = envelopeRef.current[k] != null ? envelopeRef.current[k] : synthF;
          // Meter ballistics: near-instant attack so the meter cracks WITH a
          // transient (the old 0.6 took ~4 frames / 66ms to catch a snare hit and
          // read visibly behind the audio), slower release so the peak is legible.
          envelopeRef.current[k] = f > cur ? cur + (f - cur) * 0.85 : cur + (f - cur) * 0.25;
        } else {
          envelopeRef.current[k] = synthF;
        }
      }
      // Feedback ring voices. Real feedback BUILDS: a band over unity grows
      // louder the longer it is left (fast when far over = a howl in a fraction
      // of a second, slow when barely over = a ring you have a beat to catch)
      // and rings out with a tail once you pull it under. That build is the
      // urgency a monitor engineer lives by: catch it early or it runs away.
      // Detection and the win stay knob-based; this integrates the audible
      // energy on top, per-band, using the real per-frame dt.
      const fbChain = feedbackChainRef.current;
      if (fbChain && fbChain.voices && ctxRunning) {
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : (lastFbTimeRef.current + 16);
        let dt = lastFbTimeRef.current ? (now - lastFbTimeRef.current) / 1000 : 0.016;
        lastFbTimeRef.current = now;
        dt = dt < 0 ? 0 : (dt > 0.1 ? 0.1 : dt); // clamp first frame / tab-switch
        const energy = ringEnergyRef.current || (ringEnergyRef.current = new Array(fbChain.voices.length).fill(0));
        const rings = feedbackRingsRef.current || [];
        const risk = new Array(fbChain.voices.length).fill(-999); // loop gain in dB; -999 = no ring reported
        for (const r of rings) if (r.hzIndex >= 0 && r.hzIndex < risk.length) risk[r.hzIndex] = Math.max(risk[r.hzIndex], r.risk);
        // risk[] is the band's loop gain in dB (0 = the Barkhausen unity
        // point). Any band the detector still reports (down to the sustain
        // hysteresis at -1.7 dB) keeps producing audible energy, so the glow
        // and the sound never disagree; the build rate scales with how many
        // dB over unity the loop sits — hotter loops run away faster,
        // calibrated to the previous feel (~1 s to a howl just past onset).
        const SUSTAIN_DB = -1.7, GROW_BASE = 0.3, GROW_PER_DB = 0.23, TAIL = 0.4, MAXGAIN = 0.32;
        let peak = 0;
        fbChain.voices.forEach((v, i) => {
          let e = energy[i] || 0;
          const over = risk[i] > -900 ? (risk[i] - SUSTAIN_DB) : -1;
          if (over > 0) e += (GROW_BASE + over * GROW_PER_DB) * dt; // build / runaway
          else { e -= e * Math.min(1, dt / TAIL); if (e < 1e-3) e = 0; } // ring out + snap
          e = e < 0 ? 0 : (e > 1 ? 1 : e);
          energy[i] = e;
          if (e > peak) peak = e;
          const target = e * MAXGAIN;
          const cur = v.gain.gain.value;
          v.gain.gain.value = (e === 0 && cur < 1e-3) ? 0 : cur + (target - cur) * 0.3;
        });
        // Per-channel feedback level: the loudest ring energy on each mic's loop,
        // so a program-muted mic still shows the ring building on its own meter.
        const fbByCh = {};
        for (const r of rings) {
          if (r.channelIdx == null || r.hzIndex < 0 || r.hzIndex >= energy.length) continue;
          const e = energy[r.hzIndex] || 0;
          if (e > (fbByCh[r.channelIdx] || 0)) fbByCh[r.channelIdx] = e;
        }
        fbMeterRef.current = fbByCh;
        // Escalating severity for the on-screen warning, bucketed so it only
        // re-renders on a transition (0 clear, 1 building ring, 2 howl); the ring
        // count drives the "several at once" copy.
        const count = rings.length;
        const bucket = count === 0 ? 0 : (peak > 0.5 ? 2 : 1);
        const prev = lastSevRef.current;
        if (!prev || prev.level !== bucket || prev.count !== count) {
          lastSevRef.current = { level: bucket, count };
          setFbSeverity({ level: bucket, count });
        }
      } else if (fbChain && fbChain.voices) {
        // Audio suspended (sound off): reset the integration clock and silence the
        // ring voices so a ring builds from zero when sound comes back on, instead
        // of pre-charging to a howl in the background.
        lastFbTimeRef.current = 0;
        fbMeterRef.current = {};
        const energy = ringEnergyRef.current;
        if (energy) for (let i = 0; i < energy.length; i++) energy[i] = 0;
        fbChain.voices.forEach(v => { if (v.gain.gain.value !== 0) v.gain.gain.value = 0; });
        if (lastSevRef.current && lastSevRef.current.level !== 0) { lastSevRef.current = { level: 0, count: 0 }; setFbSeverity({ level: 0, count: 0 }); }
      }
      // Throttle the meter re-render to ~30fps. The envelope refs above still
      // update every animation frame (smooth ballistics), but re-rendering the
      // whole mixer + recomputing computeAudio 60x/sec was starving the audio
      // thread on lower-powered machines (audible as compression / lost
      // transients while the audio graph itself measured clean). ?lite=1 drops
      // the re-render further (~8fps) as an extreme fallback.
      // BAND scenario: drive the meters straight to the DOM every frame (no
      // per-frame React render). Re-rendering 15 strips 60x/sec starved the
      // audio thread on slower machines and glitched playback; computeAudio
      // itself is ~0.08ms, so recomputing it here and pushing levels to the
      // meter segments is cheap and leaves the audio thread alone. Every other
      // scenario keeps the throttled re-render below (unchanged behavior).
      if (stateRef.current.big16 && !LITE_METERS) {
        const st = stateRef.current;
        const on = st.mixer ? st.mixer.on !== false : true;
        const a = window.computeAudio(st, envelopeRef.current);
        const mb = a.mainBus || { L: 0, R: 0 };
        window.__applyMeters((mkey) => {
          if (mkey === 'out:pa_l') return mb.L || 0;
          if (mkey === 'out:pa_r') return mb.R || 0;
          const c = mkey.indexOf(':');
          if (c > 0) {
            const kind = mkey.slice(0, c), i = +mkey.slice(c + 1);
            if (kind === 'chlvl') return on ? (a.post[i] || 0) * 1.2 : 0;
            if (kind === 'pfl') return on ? (a.chanIn[i] || 0) : 0;
            // dchlvl:i — the one fader meter on a digital input strip. Post-
            // fader, except while that channel is PFL'd, when it reads pre-
            // fader. Deliberately NOT chlvl:i (no *1.2) so it matches the
            // strip's own React-rendered level on the 8-channel digital desk.
            if (kind === 'dchlvl') { const solo = st.channels[i] && st.channels[i].solo; return on ? (solo ? (a.chanIn[i] || 0) : (a.post[i] || 0)) : 0; }
            // bus:<slot> — the AUX/DCA layer masters, indexed the way
            // DigitalConsole's busStrips build them: AUX 1-4 at 0-3, then one
            // per DCA. Mirrors the `level` each strip computes while the
            // throttled re-render is in charge.
            if (kind === 'bus') {
              if (!on) return 0;
              const ab = a.auxBus || {};
              if (i === 0) return ab.wedge || 0;
              if (i === 1) return ab.wedge2 || 0;
              if (i === 2) return ab.wedge3 || 0;
              if (i === 3) return ab.wedge4 || 0;
              const d = (st.dcas || [])[i - 4];
              if (!d) return 0;
              const vals = (d.members || []).map((m) => (a.post[m] || 0) * 1.2);
              return vals.length ? Math.max.apply(null, vals) : 0;
            }
          }
          return null;
        });
      } else if (!LITE_METERS) {
        // 8-channel modes are light (8 strips) and never glitched at full rate,
        // so they keep the original 60fps meters. Only the 16-channel desk needs
        // the direct-to-DOM path above.
        setEnvTick(n => (n + 1) & 0xff);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ensureAudio = () => {
    if (ctxRef.current) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    // latencyHint:'playback' asks for a LARGER audio buffer, so the audio thread
    // renders bigger chunks less often and can ride through a busy main thread
    // (the meter re-render / GC) without underrunning. The default 'interactive'
    // buffer is tiny and was underrunning on lower-powered machines, which
    // glitched playback (heard as compression / lost transients on the band).
    try { ctx = new AC({ latencyHint: 'playback' }); }
    catch (e1) {
      try { ctx = new AC(); }
      catch (e2) { console.warn('AudioContext failed', e2); return; }
    }
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterGainRef.current = master;
    // Channel merger lets us run a STEREO output path: each source has its
    // own gainL and gainR that feed channels 0 and 1 of this merger. The
    // merger then connects to the global master gain → destination. With
    // this in place a source panned hard left actually plays only out of
    // the listener's left speaker, and the engineer's stereo discipline
    // (PA balance, pan placement) becomes audible, not just metered.
    const stereoMerger = ctx.createChannelMerger(2);
    // Monitor EQ bank — peaking filters at the ISO third-octave centres,
    // sitting between the summed mix and the master. When you monitor a wedge,
    // these take that wedge's graphic-EQ cuts, so a cut is something you HEAR,
    // and over-cutting makes the monitor go hollow (the whole reason you ring
    // out feedback with restraint). Flat and transparent (0 dB) when monitoring
    // the PA or PFL. The audio effect sets the per-band gains.
    const monitorEq = FULL_EQ_HZ.map(hz => {
      const bq = ctx.createBiquadFilter();
      bq.type = 'peaking';
      bq.frequency.value = hz;
      bq.Q.value = 4.3;
      bq.gain.value = 0;
      return bq;
    });
    let eqNode = stereoMerger;
    for (const bq of monitorEq) { eqNode.connect(bq); eqNode = bq; }
    eqNode.connect(master);
    monitorEqRef.current = monitorEq;

    const profiles = {
      vocal:  { f: 220, det: 1.5, lp: 1800, lfo: 5,    type: 'sawtooth' },
      vocal2: { f: 165, det: 1.2, lp: 1700, lfo: 4.5,  type: 'sawtooth' },
      guitar: { f: 110, det: 0.6, lp: 1400, lfo: 4,    type: 'sawtooth' },
      laptop: { f: 440, det: 4.0, lp: 4200, lfo: 0,    type: 'sine' },
      // Playback music bed: a warm C-major chord pad spread across two octaves
      // so it reads as music, not a single drone. Lower mix gain because the
      // extra chord oscillators sum hotter than a normal two-osc source.
      playback: { f: 130.81, det: 0.7, lp: 2800, lfo: 0, type: 'triangle', chord: [164.81, 196.0, 261.63, 329.63], mixGain: 0.07 },
    };
    // Band inputs (kick, snare, …) play recorded stems, not synth voices, so any
    // board source without a synth profile gets this SILENT fallback: the chain
    // (gain staging, drive, EQ, meter tap) is what the clip feeds into, and the
    // muted oscillators never tone out before the stems decode.
    const CLIP_ONLY_PROFILE = { f: 100, det: 0, lp: 6000, lfo: 0, type: 'sine', mixGain: 0 };
    // Build the saturation curve once — used by every source's shaper. tanh
    // is odd-symmetric (no DC offset) and gives a musical-sounding soft
    // clip: roughly linear at low input, compressing through the knee, and
    // brick-walling above ±1. Driven hard, it generates the harmonic
    // content the listener hears as "distortion".
    const SHAPER_N = 2048;
    const shaperCurve = new Float32Array(SHAPER_N);
    for (let i = 0; i < SHAPER_N; i++) {
      const x = (i / (SHAPER_N - 1)) * 2 - 1;
      shaperCurve[i] = Math.tanh(x * 1.5);
    }
    // Recorded clips get a CLEANER shaper: dead linear until a high knee, then a
    // C1-continuous soft clip (slope 1 at the knee). The synth tanh curve above
    // compresses even at rest — it squashes transients and boosts low-level body,
    // which robs a snare of its crack. A real stem (peak-normalized to ~0.6) sits
    // entirely under the knee, so it passes through untouched; it only saturates
    // when the channel is actually overdriven and the drive pushes it past the
    // knee, so the "you hear it when you clip" behavior still holds.
    const CLIP_KNEE = 0.72;
    const clipCurve = new Float32Array(SHAPER_N);
    for (let i = 0; i < SHAPER_N; i++) {
      const x = (i / (SHAPER_N - 1)) * 2 - 1;
      const ax = Math.abs(x);
      clipCurve[i] = ax <= CLIP_KNEE
        ? x
        : Math.sign(x) * (CLIP_KNEE + (1 - CLIP_KNEE) * Math.tanh((ax - CLIP_KNEE) / (1 - CLIP_KNEE)));
    }

    // Build a chain only for the sources on THIS board (its snake inputs = the
    // keys of state.cables) plus the playback line — so the MX-8 builds 5 chains,
    // the 16-band builds its 15, and neither carries the other's idle voices.
    // Build ONE source's channel chain. Idempotent (never rebuilds a live
    // chain) so it's safe to call again when the board gains a source after
    // the graph is already up (the 16-channel switch).
    const buildChain = (k) => {
      if (chainsRef.current[k]) return;
      const p = profiles[k] || CLIP_ONLY_PROFILE;
      // Per-side output gains. Both fanout from `makeup` so the source's
      // post-shaper mono signal is split into independent L/R levels.
      const gainL = ctx.createGain(); gainL.gain.value = 0;
      const gainR = ctx.createGain(); gainR.gain.value = 0;
      gainL.connect(stereoMerger, 0, 0); // L
      gainR.connect(stereoMerger, 0, 1); // R
      // Makeup compensates for the drive boost so the clean (drive=1) sound
      // doesn't get louder when we add the shaper to the chain. As drive
      // rises, makeup falls roughly inversely → loudness stays similar,
      // but the harmonic content from clipping the shaper survives.
      const makeup = ctx.createGain();
      makeup.gain.value = 1.0;
      // Envelope GainNode rides on top of `makeup` to add real-world dynamics
      // (syllable-rate modulation + occasional transient bursts) so the meters
      // and audio breathe like a real source instead of sitting flat. Driven
      // per-frame from the animation loop in the App component.
      const envelope = ctx.createGain();
      envelope.gain.value = 1.0;
      makeup.connect(envelope);
      // Per-channel high-pass. Bypassed (20 Hz, inaudible) until the channel's
      // HPF is engaged, then it actually rolls the low end off what you hear,
      // not just the meters. Driven from the channel state in the audio effect.
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 20;
      hpf.Q.value = 0.707;
      envelope.connect(hpf);
      hpf.connect(gainL);
      hpf.connect(gainR);
      // Meter tap: an analyser on the channel signal so the meters can follow
      // the REAL audio level (driven in the animation loop), not a synthetic
      // wiggle. Post-HPF, so engaging the high-pass shows on the meter too.
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      hpf.connect(analyser);
      // Waveshaper does the actual saturation. 4x oversampling prevents
      // the high harmonics generated by hard clipping from aliasing.
      const shaper = ctx.createWaveShaper();
      shaper.curve = shaperCurve;
      shaper.oversample = '4x';
      shaper.connect(makeup);
      // Drive is the knob the rendering effect modulates: 1.0 = transparent,
      // higher = signal pushed deeper into the shaper's nonlinear region.
      const drive = ctx.createGain();
      drive.gain.value = 1.0;
      drive.connect(shaper);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = p.lp;
      filter.Q.value = 0.7;
      filter.connect(drive);
      const mix = ctx.createGain();
      mix.gain.value = p.mixGain != null ? p.mixGain : 0.18;
      mix.connect(filter);
      const o1 = ctx.createOscillator();
      o1.type = p.type; o1.frequency.value = p.f;
      const o2 = ctx.createOscillator();
      o2.type = p.type; o2.frequency.value = p.f + p.det;
      o1.connect(mix); o2.connect(mix);
      // Optional chord tones (the playback bed) summed into the same mix so the
      // source reads as a chord instead of one note.
      const chordOscs = [];
      if (p.chord) {
        for (const cf of p.chord) {
          const co = ctx.createOscillator();
          co.type = p.type; co.frequency.value = cf;
          co.connect(mix); chordOscs.push(co);
        }
      }
      let lfo = null;
      if (p.lfo > 0) {
        lfo = ctx.createOscillator();
        lfo.frequency.value = p.lfo;
        const lg = ctx.createGain(); lg.gain.value = 2;
        lfo.connect(lg);
        lg.connect(o1.frequency); lg.connect(o2.frequency);
        lfo.start();
      }
      o1.start(); o2.start();
      chordOscs.forEach(co => co.start());
      chainsRef.current[k] = { gainL, gainR, filter, drive, shaper, makeup, envelope, hpf, analyser, mix, o1, o2, lfo, chordOscs };
    };
    buildChainRef.current = buildChain;
    const chainKeys = [...new Set([...(state && state.cables ? Object.keys(state.cables) : []), 'playback'])];
    for (const k of chainKeys) buildChain(k);

    // PLAYBACK 5/6 — MUSIC / PINK toggle. The chord-pad oscillators are the
    // FALLBACK "music" bed; the real music file loads just below and takes over
    // on the same MUSIC selector. Pink noise is the broadband test signal an
    // engineer rings a system out with. Both sum into the same channel-5 chain
    // through their own selector gain, and state.playbackMode crossfades between them.
    {
      const pb = chainsRef.current.playback;
      if (pb) {
        const musicSel = ctx.createGain(); musicSel.gain.value = 1; // music is the default
        const pinkSel  = ctx.createGain(); pinkSel.gain.value  = 0;
        // Reroute the music oscillators off the raw mix and through musicSel.
        [pb.o1, pb.o2, ...(pb.chordOscs || [])].forEach(o => { try { o.disconnect(); o.connect(musicSel); } catch (_) {} });
        musicSel.connect(pb.mix);
        // Pink noise: a few seconds of generated pink noise, looped. Long
        // enough that the loop seam is rare and unobtrusive.
        const pinkLen = Math.floor(ctx.sampleRate * 5);
        const pinkBuf = ctx.createBuffer(1, pinkLen, ctx.sampleRate);
        const pd = pinkBuf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < pinkLen; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          pd[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.10;
          b6 = white * 0.115926;
        }
        const pinkSrc = ctx.createBufferSource();
        pinkSrc.buffer = pinkBuf; pinkSrc.loop = true;
        // Pink runs straight into the drive stage too, past the playback trim
        // (0.07) and lowpass — full-band and at a confident level, the way a
        // real ring-out signal sits. Music (the synth bed) keeps its own path.
        pinkSrc.connect(pinkSel); pinkSel.connect(pb.drive);
        pinkSrc.start();
        pb.musicSel = musicSel; pb.pinkSel = pinkSel; pb.pinkSrc = pinkSrc;
      }
    }

    // PLAYBACK MUSIC — the real music file behind the MUSIC option. Loads async
    // and hands off from the synth chord-pad the same way the stage stems do:
    // decode, peak-normalize to a consistent working level, loop, and route
    // through the MUSIC/PINK selector gain into the drive stage (past the
    // synth-tuned trim + lowpass, which would leave a real recording quiet and
    // dull). On success the synth "music" oscillators stop and the MUSIC/PINK
    // crossfade rides the real file; a failed load just leaves the synth bed.
    fetch('audio/playback.m4a?v=1')
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(ab => ctx.decodeAudioData(ab))
      .then(buf => {
        const pb = chainsRef.current.playback;
        if (!pb || !pb.drive) return;
        const startTime = ctx.currentTime + 0.15;
        let peak = 0;
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const d = buf.getChannelData(c);
          for (let i = 0; i < d.length; i++) { const a = d[i] < 0 ? -d[i] : d[i]; if (a > peak) peak = a; }
        }
        const clipGain = ctx.createGain();
        clipGain.gain.value = peak > 0.0001 ? Math.min(8, 0.6 / peak) : 1;
        // The MUSIC/PINK selector for the real file. Seed it from the live pink
        // selector so a load that finishes while PINK is showing stays silent.
        const musicGain = ctx.createGain();
        musicGain.gain.value = (pb.pinkSel && pb.pinkSel.gain.value > 0.5) ? 0 : 1;
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        src.connect(clipGain); clipGain.connect(musicGain); musicGain.connect(pb.drive);
        src.start(startTime);
        // Hand off: stop the synth chord-pad; the crossfade now rides the file.
        try {
          pb.o1 && pb.o1.stop(startTime);
          pb.o2 && pb.o2.stop(startTime);
          (pb.chordOscs || []).forEach(o => o.stop(startTime));
          pb.lfo && pb.lfo.stop(startTime);
        } catch (_) {}
        // The real recording gets the same treatment as the stage stems: the
        // CLEAN clip curve (dead linear below the knee) instead of the synth
        // tanh, which soft-compresses program material even at rest and reads
        // as pumping on a full mix. The file, peak-normalized to 0.6, now sits
        // entirely under the knee and passes through untouched; it only
        // saturates when the channel is genuinely overdriven.
        if (pb.shaper) pb.shaper.curve = clipCurve;
        pb.skipEnvelope = true;
        pb.musicSel = musicGain;
        pb.musicSrc = src; pb.musicClipGain = clipGain;
      })
      .catch(e => console.warn('playback music load failed:', e));

    // STAGE SOURCE LOOPS — swap the placeholder synth for the real recorded
    // stems. The four files are identical-length (~19.8 s) mono loops, so once
    // they all start on the same context clock with loop=true they stay
    // sample-accurately locked to each other forever (no drift). The synth
    // chain (filter, drive, gain staging) stays in place downstream, so a clip
    // still responds to gain, fader, EQ, and clipping exactly like the synth
    // did. Oscillators keep playing until the buffers decode, then hand off; a
    // failed load just leaves the synth running for that source. NOTE the source
    // KEYS are legacy: `guitar` is the Bass channel, `laptop` is the Keys
    // channel (the labels the student sees live in defaultState/SOURCES). The
    // ?v= tag cache-busts the audio when a stem is replaced (browsers/CDN cache
    // the bare filename); bump it whenever the .wav bytes change.
    const CLIP_SOURCES = {
      // MX-8 band (Golden V2 stems, shared with the full band's same instruments).
      guitar: 'audio/bass.wav?v=6', laptop: 'audio/keys.wav?v=6', vocal: 'audio/vocal1.wav?v=6', vocal2: 'audio/vocal2.wav?v=6',
      // Full 16-input band (?band=1). vx1/vx2 reuse the shared vocal1/vocal2 stems;
      // bass/keys reuse the shared bass/keys stems, so those files load once.
      kick: 'audio/kick.wav?v=6', snare: 'audio/snare.wav?v=6', rack: 'audio/rack.wav?v=6', floor: 'audio/floor.wav?v=6',
      ohl: 'audio/ohl.wav?v=6', ohr: 'audio/ohr.wav?v=6', bass: 'audio/bass.wav?v=6', egtr: 'audio/egtr.wav?v=6',
      agtr: 'audio/agtr.wav?v=6', keys: 'audio/keys.wav?v=6', vx1: 'audio/vocal1.wav?v=6', vx2: 'audio/vocal2.wav?v=6',
      vx3: 'audio/vocal3.wav?v=6', vx4: 'audio/vocal4.wav?v=6',
    };
    // Fetch + start the recorded loops for a set of source keys. Only the
    // stems for sources actually on the board load (the MX-8 loads its 4 and
    // never downloads the 14 band stems). Skips any key with no stem, no chain
    // yet, or a clip already running, so a later incremental call (the
    // 16-channel switch) loads ONLY the newly-added band stems, and all of a
    // batch share one start time so they stay phase-locked to each other.
    const startClips = (keys) => {
      const want = keys.filter(k => (k in CLIP_SOURCES) && chainsRef.current[k] && !chainsRef.current[k].clipSrc);
      if (!want.length) return;
      Promise.all(want.map(k =>
        fetch(CLIP_SOURCES[k])
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
          .then(ab => ctx.decodeAudioData(ab))
          .then(buf => ({ k, buf }))
          .catch(e => { console.warn('clip load failed:', k, e); return null; })
      )).then(results => {
      const ok = results.filter(Boolean);
      if (!ok.length) return;
      // One shared start time for every decoded loop = phase-locked playback.
      const startTime = ctx.currentTime + 0.15;
      for (const { k, buf } of ok) {
        const chain = chainsRef.current[k];
        if (!chain || !chain.drive) continue;
        // Level: route the clip PAST the synth's mix trim + lowpass, straight
        // into drive. HOW we set its level depends on what the stem IS:
        //   - The full band's 14 stems are a finished MIX (Kyle's balance baked
        //     in). Peak-normalizing each one independently INVERTS that balance:
        //     drums (high crest) get buried, low-crest sources (bass) come out
        //     hot. So play a band stem at its RECORDED level (common unity gain)
        //     and the mix passes through as mixed.
        //   - The MX-8's gain-staging sources are treated as raw inputs; their
        //     lessons calibrate the meter off a normalized ~0.6 arrival level, so
        //     they keep per-file peak-normalization.
        let peak = 0;
        const d0 = buf.getChannelData(0);
        for (let i = 0; i < d0.length; i++) { const a = d0[i] < 0 ? -d0[i] : d0[i]; if (a > peak) peak = a; }
        const clipGain = ctx.createGain();
        const isMixStem = typeof BAND_KEYS !== 'undefined' && BAND_KEYS.indexOf(k) !== -1;
        // Band stems play at EXACT unity gain: no normalization, no trim, no makeup.
        // The buffer is what Kyle uploaded, byte for byte. The only things that touch
        // its level are the console's own fader, pan, and master. If the overall mix
        // needs to be louder or quieter, that is a fader move, not signal treatment.
        clipGain.gain.value = isMixStem ? 1 : (peak > 0.0001 ? Math.min(8, 0.6 / peak) : 1);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        src.connect(clipGain);
        if (isMixStem) {
          // Band stems are a finished MIX: ZERO processing by default. Bypass the
          // synth drive, saturation shaper, makeup, and envelope ENTIRELY — the
          // recording runs straight into the channel's HPF (transparent / off by
          // default, and it feeds the meter tap) and its level/pan (gainL/R). The
          // only thing that touches the audio is the console's own controls.
          clipGain.connect(chain.hpf);
          // PERF: also PRUNE the synth front-end from the graph. Bypassing it for
          // audio isn't enough — mix -> filter -> drive -> shaper(4x oversampled)
          // -> makeup -> envelope still had a live path to the output, so Web Audio
          // kept running all of that DSP (14 oversampled waveshapers!) on silence
          // every audio block. Disconnecting envelope from the HPF orphans the whole
          // subgraph so the engine stops processing it. That idle DSP, x14 channels,
          // is what made the full band crackle and lag where 4 tracks ran clean.
          try { chain.envelope.disconnect(); } catch (_) {}
          try { chain.filter && chain.filter.disconnect(); } catch (_) {}
        } else {
          // MX-8 gain-staging sources keep drive -> shaper (with the clean clip
          // curve, transparent until actually driven past the knee) so that
          // overdriving a channel audibly distorts, which the lessons teach.
          clipGain.connect(chain.drive);
          if (chain.shaper) chain.shaper.curve = clipCurve;
        }
        chain.clipGain = clipGain;
        src.start(startTime);
        // Hand off from the synth: stop its oscillators at the same instant.
        try {
          chain.o1 && chain.o1.stop(startTime);
          chain.o2 && chain.o2.stop(startTime);
          (chain.chordOscs || []).forEach(o => o.stop(startTime));
          chain.lfo && chain.lfo.stop(startTime);
        } catch (_) {}
        // The recording carries its own dynamics, so drop the synthetic
        // envelope modulation (the animation loop skips clip chains).
        chain.skipEnvelope = true;
        chain.envelope.gain.value = 1;
        chain.clipSrc = src;
      }
      });
    };
    startClipsRef.current = startClips;
    startClips(Object.keys((state && state.cables) ? state.cables : {}));
    // Feedback ring voices — one per third-octave band (63 Hz .. 16 kHz), all
    // silent until detectFeedback lights them. Each voice is a sine at the
    // band's center frequency (the ring you hear is the band you cut) plus
    // a faint inharmonic partial (×2.41, an off-grid ratio that never lands
    // on another band) so it sounds like a real ring instead of a test
    // tone. Per-voice gains let MULTIPLE bands ring at once — the Feedback
    // Mode reality. The animation loop drives the gains.
    {
      const voices = FULL_EQ_HZ.map(hz => {
        const g = ctx.createGain();
        g.gain.value = 0;
        // Ring voices go straight to master, bypassing the monitor EQ bank:
        // each ring's own band cut is already in the loop math (a cut band
        // rings quieter), so running it through the bank too would double-count.
        g.connect(master);
        const o1 = ctx.createOscillator();
        o1.type = 'sine'; o1.frequency.value = hz;
        const m1 = ctx.createGain(); m1.gain.value = 0.6;
        o1.connect(m1); m1.connect(g);
        const o2 = ctx.createOscillator();
        o2.type = 'sine'; o2.frequency.value = Math.min(hz * 2.41, 18000);
        const m2 = ctx.createGain(); m2.gain.value = 0.15;
        o2.connect(m2); m2.connect(g);
        o1.start(); o2.start();
        return { gain: g };
      });
      feedbackChainRef.current = { voices };
    }
    ctxRef.current = ctx;
  };

  uE(() => {
    if (!audioOn) {
      if (masterGainRef.current && ctxRef.current) {
        rampParam(masterGainRef.current.gain, ctxRef.current, 0);
      }
      return;
    }
    ensureAudio();
    const ctx = ctxRef.current;
    if (!ctx || !masterGainRef.current) return;
    if (ctx.state === 'suspended') {
      try { ctx.resume(); } catch (_) {}
    }
    rampParam(masterGainRef.current.gain, ctx, 0.35);

    // The "sound on" button represents the engineer's headphones / control-
    // room monitors. When any channel is in PFL, the cans switch over to
    // the PFL bus (pre-fader signal of soloed channels only) and the
    // inspected destination is ignored — that's exactly how a live console
    // works. When no PFL is engaged, fall back to monitoring whatever
    // destination the user picked via inspect (PA, wedge, etc.).
    const dest = state.inspect;
    // Pre-compute the downstream clip flags so we can apply them to every
    // source uniformly. A main-bus clip means every channel summed at the
    // master is being driven through saturation — same lesson the user sees
    // on the master meter. A PA-speaker clip applies only when the user is
    // monitoring PA (cans on the PFL bus aren't affected by speaker clip).
    // Every output stage clips at the same 0 dBFS (+22 dBu) ceiling as the main
    // bus and the preamp — one clip point across the whole desk. The old speaker
    // flags used a legacy 1.03 linear (~-16 dBFS), which a healthy summed mix
    // sailed past on any vocal PEAK: because a bus-clip flag bumps the drive on
    // EVERY source routed there, one channel's transient made the whole mix grit
    // even though each channel was clean in PFL. Summing is uncorrelated (~sqrt N)
    // and the bus carries full 0-dBFS headroom, so a well-gain-staged mix sums
    // clean; only a genuinely over-driven output (master or a speaker's own
    // volume cranked, or over-gained inputs upstream) reaches the ceiling.
    const OUT_CLIP = window.dbuToLin(22);
    const mainClipped = ((audio.mainBus?.L || 0) > OUT_CLIP) || ((audio.mainBus?.R || 0) > OUT_CLIP);
    const paClipped   = ((audio.outputs?.pa_l || 0) > OUT_CLIP) || ((audio.outputs?.pa_r || 0) > OUT_CLIP);
    const wedgeClipped  = (audio.outputs?.wedge  || 0) > OUT_CLIP;
    const wedge2Clipped = (audio.outputs?.wedge2 || 0) > OUT_CLIP;
    const wedge3Clipped = (audio.outputs?.wedge3 || 0) > OUT_CLIP;
    const wedge4Clipped = (audio.outputs?.wedge4 || 0) > OUT_CLIP;
    for (const k of Object.keys(chainsRef.current)) {
      // Compute per-side levels so the playback is genuinely stereo. When
      // monitoring PA, the L/R contributions split per the pan law and the
      // listener actually hears panning. PFL and wedge monitoring are
      // mono — same level on both sides (cans and wedge are single feeds).
      let lvlL = 0, lvlR = 0;
      if (audio.anyPfl) {
        const v = (audio.pflBus && audio.pflBus[k]) || 0;
        lvlL = v; lvlR = v;
      } else {
        const c = audio.contributions[k] || {};
        if (dest === 'pa') {
          lvlL = c.pa_l || 0;
          lvlR = c.pa_r || 0;
        } else {
          const v = c[dest] || 0;
          lvlL = v; lvlR = v;
        }
      }
      // Program mute silences this source's playback sample here, downstream of
      // the feedback math (which runs on knob positions in detectFeedback) and
      // the separate ring-voice bus, so a muted mic can still ring out.
      const progMuted = !!(state.programMute && state.programMute[k]);
      const targetL = progMuted ? 0 : Math.max(0, Math.min(0.4, lvlL * 0.35));
      const targetR = progMuted ? 0 : Math.max(0, Math.min(0.4, lvlR * 0.35));
      rampParam(chainsRef.current[k].gainL.gain, ctx, targetL);
      rampParam(chainsRef.current[k].gainR.gain, ctx, targetR);

      // Distortion drive — translate clipping state into how hard we push
      // this source through the saturation shaper.
      //   drive=1.0    transparent (clean signal)
      //   drive=3.0    audible harmonic distortion ("a little crunchy")
      //   drive=8.0+   harsh — what you'd hear from a real desk pegged red
      //
      // Per-source PREAMP clip (chanIn > 1.03) drives the source's audio
      // regardless of fader/master — distortion happens AT the preamp, so
      // the signal carries it downstream. Even if the fader is at zero,
      // PFL listening on that channel still routes the preamp signal to
      // the cans and the user should still hear the crunch.
      //
      // Channel-meter clip (post > 0.93) adds on top — fader past unity
      // can compound, even if the preamp is fine.
      //
      // Downstream clips (master/speaker) only apply when NOT in PFL —
      // cans are pre-fader, upstream of those stages, and a real PFL bus
      // doesn't carry the master/speaker distortion.
      let drive = 1.0;
      const chIdx = audio.chanInSource ? audio.chanInSource.indexOf(k) : -1;
      if (chIdx >= 0) {
        // Real headroom: grit starts as the LIVE peaks (average level times
        // the program's crest factor) push past +19 dBu — the soft knee 3 dB
        // under the +22 clip point — and hardens over the next few dB. A
        // dynamic vocal (crest ~+12 dB) grits earlier than a steady bass
        // (crest ~+5 dB) at the same average: real, source-dependent behavior.
        // Grit begins only when the live peaks actually REACH the +22 dBu
        // clip point (a hair under, for the analog knee), and hardens fast
        // past it. The meters' red zone starts at -3 dBFS, so the red always
        // lights BEFORE the distortion is audible — warn first, like a real
        // desk. A dynamic vocal (crest ~+12 dB) still grits earlier than a
        // steady bass (~+5 dB) at the same average: source-dependent, real.
        const chIn = audio.chanIn[chIdx];
        const peakDbu = window.linToDbu(chIn);
        if (peakDbu > 21.5) {
          drive = Math.max(drive, Math.min(10, 1 + (peakDbu - 21.5) * 2.5));
        }
        const post = audio.post[chIdx];
        const postDbu = window.linToDbu(post);
        if (postDbu > 21.5) {
          // Same +22 dBu ceiling at the channel/bus stage: fader past unity
          // on a hot channel can clip even when the preamp is clean.
          drive = Math.max(drive, Math.min(10, 1 + (postDbu - 21.5) * 2.5));
        }
      }
      if (!audio.anyPfl) {
        if (mainClipped) drive = Math.max(drive, 4);
        if (dest === 'pa' && paClipped) drive = Math.max(drive, 5);
        if (dest === 'wedge'  && wedgeClipped)  drive = Math.max(drive, 5);
        if (dest === 'wedge2' && wedge2Clipped) drive = Math.max(drive, 5);
        if (dest === 'wedge3' && wedge3Clipped) drive = Math.max(drive, 5);
        if (dest === 'wedge4' && wedge4Clipped) drive = Math.max(drive, 5);
      }
      rampParam(chainsRef.current[k].drive.gain, ctx, drive);
      // Makeup inverse-compensates so the clean signal isn't louder just
      // because we added a shaper. When drive=1, makeup=1 (transparent). As
      // drive climbs, makeup falls toward ~0.12 → harmonics survive but
      // overall loudness stays in the same ballpark as the clean path.
      rampParam(chainsRef.current[k].makeup.gain, ctx, 1 / drive);
      // High-pass: actually roll the lows off this channel's audio when its HPF
      // is engaged. The channel is resolved from the source's effective channel
      // so it follows patching (and covers the 5/6 playback line input).
      const hpfNode = chainsRef.current[k].hpf;
      if (hpfNode) {
        const chNum = effectiveChannel(state, k);
        const chan = chNum >= 1 ? state.channels[chNum - 1] : null;
        rampParam(hpfNode.frequency, ctx, (chan && chan.highpass) ? 100 : 20);
      }
    }
    // Monitor EQ bank: apply the graphic EQ of whichever wedge you're listening
    // to, so the cuts are audible (and over-cutting sounds hollow). A 5-band
    // wedge maps onto the 25-filter bank by frequency; a 25-band Feedback Mode
    // wedge aligns one-to-one. Flat (transparent) for PA or PFL monitoring.
    const bank = monitorEqRef.current;
    if (bank) {
      let eqArr = null;
      if (!audio.anyPfl) {
        if ((dest === 'wedge' || dest === 'wedge2' || dest === 'wedge3' || dest === 'wedge4')
            && state.outputs[dest] && state.outputs[dest].eq) eqArr = state.outputs[dest].eq;
      }
      const full = !!(eqArr && eqArr.length === FULL_EQ_HZ.length);
      for (let bi = 0; bi < bank.length; bi++) {
        let g = 0;
        if (eqArr) {
          if (full) g = eqArr[bi] || 0;
          else { const i5 = EQ_BAND_HZ.indexOf(FULL_EQ_HZ[bi]); if (i5 >= 0) g = eqArr[i5] || 0; }
        }
        g = Math.max(-1, Math.min(1, g));   // bidirectional: +1 boost, -1 cut
        rampParam(bank[bi].gain, ctx, EQ_CUT_DB * g);
      }
    }
  }, [audioOn, audio, state.inspect, state.programMute]);

  // Board-source growth: when the board gains inputs after the graph is already
  // up (switching into the 16-channel board), build the chains and load the
  // stems for the new sources so they actually make sound. Without this the 14
  // band inputs stay silent, because ensureAudio only builds the board that was
  // live when sound first turned on. Idempotent once every source has a chain.
  const boardSig = (state && state.cables) ? Object.keys(state.cables).sort().join(',') : '';
  uE(() => {
    if (!audioOn || !ctxRef.current || !buildChainRef.current || !startClipsRef.current) return;
    const keys = (state && state.cables) ? Object.keys(state.cables) : [];
    const missing = keys.filter(k => !chainsRef.current[k]);
    if (!missing.length) return;
    for (const k of missing) buildChainRef.current(k);
    startClipsRef.current(missing);
  }, [audioOn, boardSig]);

  // Playback MUSIC / PINK crossfade. Audible only — the simulation treats the
  // 5/6 line input identically, so nothing in computeAudio or the win logic
  // changes. Just rides the two selector gains built in ensureAudio.
  uE(() => {
    const ch = chainsRef.current && chainsRef.current.playback;
    const ctx = ctxRef.current;
    if (!ch || !ctx || !ch.musicSel || !ch.pinkSel) return;
    const pink = state.playbackMode === 'pink';
    rampParam(ch.musicSel.gain, ctx, pink ? 0 : 1);
    rampParam(ch.pinkSel.gain, ctx, pink ? 1 : 0);
  }, [state.playbackMode, audioOn]);

  const [, force] = uS(0);
  // Keep the meters ticking while anything is making sound. Depend on the
  // BOOLEAN (is-anything-active), not the raw per-frame output levels, so this
  // effect re-subscribes only when sound starts or stops instead of tearing
  // down and rebuilding its interval on every animation frame.
  const anyOutputActive = (audio.outputs.pa_l + audio.outputs.pa_r + audio.outputs.wedge + (audio.outputs.wedge2 || 0)
    + (audio.outputs.wedge3 || 0) + (audio.outputs.wedge4 || 0)) > 0.05;
  uE(() => {
    if (!anyOutputActive || LITE_FREEZE || state.big16) return;
    const id = setInterval(() => force(t => t + 1), 120);
    return () => clearInterval(id);
  }, [anyOutputActive, state.big16]);

  // Load a scenario. reuseSeed replays the same attempt (Reset); omitting it
  // rolls a fresh seed (level change, Practice Again), which is what makes a
  // challenge replay a new rep instead of a memory test.
  const loadLevel = (i, reuseSeed, bypassLock, carryFrom, carryMon) => {
    const lv = SCENARIOS[i];
    // Practice Mode is soft-gated for the free tier: playable while the taste
    // budget lasts, then it shows the pitch like any locked mode. Feedback Mode
    // and custom scenarios use the hard lock (the latter is always bypassed via
    // its share link).
    const hardLocked = isLocked(lv) && !bypassLock;
    // Free taste budgets: Practice and Feedback aren't hard-locked, but a free
    // viewer who has spent the budget gets the member pitch, not another go.
    const outOfPractice = lv && lv.isPractice && !practiceSoftOpen && !bypassLock;
    const outOfFeedback = lv && lv.isFeedbackMode && !feedbackSoftOpen && !bypassLock;
    if (!lv || hardLocked || outOfPractice || outOfFeedback) { if (lv) setPitchFor(lv); return; }
    // New board = new room: give the wedges fresh resonance frequencies so the
    // student re-diagnoses instead of memorizing. A same-seed replay keeps them.
    if (!reuseSeed && window.reseedFeedback) window.reseedFeedback();
    // Start the new room silent: clear any ring energy left howling on the last
    // board and re-anchor the integration clock.
    ringEnergyRef.current = null; lastFbTimeRef.current = 0;
    // Show the first-rep orientation only on the welcome chooser's quick fix,
    // and clear it so the next load (any load) turns it back off.
    const wasFirstFix = firstFixRef.current; firstFixRef.current = false;
    setFirstFix(!!(wasFirstFix && lv.isPractice));
    // Loading a normal scenario leaves the guided walkthrough; navigating ONTO
    // the walkthrough (e.g. the nav arrows) starts its intro so it never lands
    // in an inert half-state.
    // A Mixer Tutorial lesson launches straight into its guided step (no big
    // intro modal). Clicking it in the menu is the user gesture that lets the
    // audio start.
    if (lv && lv.isWalkthrough) { setWalkStep(0); setWalkPhase('steps'); setAudioOn(true); }
    else setWalkPhase(null);
    // A carried advance (the multi-step mixer flow) starts from the PREVIOUS
    // lesson's board so the student's settings persist instead of resetting to a
    // fresh sandbox. Direct entry from the menu (no carryFrom) still starts clean.
    const base = carryFrom ? JSON.parse(JSON.stringify(carryFrom)) : window.defaultState();
    if (!carryFrom) {
      base.topology = { ...base.topology, ...(lv.topology || {}) };
      base.channels = normalizeChannels(base.channels, deriveInvolves(lv));
    }
    const seed = reuseSeed != null ? reuseSeed : ((Math.random() * 0xffffffff) >>> 0);
    seedRef.current = seed;
    // The zero-fault "sign off" rep was removed, so content.js uses its own
    // defaults for the goal-task chance.
    window.PRACTICE_GOAL_CHANCE = undefined;
    window.PRACTICE_FOCUS = (focusRef.current && focusRef.current.length) ? focusRef.current : null;
    // A fresh rep clears the one-rep "rank up" banner from the prior solve.
    setRankUp(null);
    // Practice Mode reads the FAULTS selector through this global (content.js
    // can't see React state), and reports the rep's par + fault keys back
    // through PRACTICE_LAST for the debrief.
    window.PRACTICE_FAULT_COUNT = practiceFaultsRef.current;
    const sab = carryFrom ? base : lv.sabotage(base, mulberry32(seed));
    if (lv.isPractice) practiceInfoRef.current = window.PRACTICE_LAST || null;
    if (carryFrom) {
      // Keep the carried monitoring state, EXCEPT the "in the room" lessons drop
      // PFL and listen to the mains, so moving the fader / pan / send actually
      // changes what you hear. PFL persists into the gain lesson (you set gain
      // while listening in PFL, which is the whole point of that step).
      if (lv.id === 'mix-fader' || lv.id === 'mix-pan' || lv.id === 'mix-aux') {
        sab.channels.forEach((c) => { c.solo = false; });
        sab.inspect = 'pa';
      }
    } else {
      sab.inspect = lv.defaultInspect || 'pa';
    }
    // Carry PFL (monitoring) between consecutive Essentials lessons so the
    // continuous on-site build feels continuous: a channel you left in PFL is
    // still in PFL in the next lesson. Skipped for the channels THIS lesson
    // wants a fresh PFL check on (requirePflEach / the gain lesson's ref), so
    // the check still scores the student's own action, not a leftover solo.
    if (carryMon && Array.isArray(carryMon.solo) && !carryFrom && Array.isArray(sab.channels)) {
      const freshPfl = new Set();
      if (Array.isArray(lv.requirePflEach)) lv.requirePflEach.forEach((ch) => freshPfl.add(ch - 1));
      if (lv.requirePflCheck && lv.gainStructure && lv.gainStructure.refChannel != null) freshPfl.add(lv.gainStructure.refChannel - 1);
      sab.channels.forEach((c, i) => { c.solo = freshPfl.has(i) ? false : !!carryMon.solo[i]; });
    }
    setState(sab);
    setLevelIdx(i);
    setSolved(false);
    setEqPanelOpen(false);
    // Fresh rep: clear the sign-off state so a zero-fault rep starts un-signed.
    setSignedOff(false);
    setSignoffMsg(null);
    falseSignoffRef.current = 0;
    wonRef.current = false;
    // Reset the procedural PFL tracker so each level scores its own
    // workflow rather than counting an earlier solo as a check.
    pflCheckedRef.current = false;
    pflChannelsRef.current = {};
    // Each level scores its own "did they open the list" latch; the live
    // ioListOpen still reflects whether the panel is open right now.
    ioListOpenedRef.current = false;
    stageOpenedRef.current = false;
    // The popped latch survives a same-level Reset (the pop forces one) and
    // clears only when the player moves to a different level.
    if (i !== levelIdx) hasPoppedRef.current = false;
    // The rung latch does NOT survive a Reset, unlike hasPopped: START OVER puts
    // the send back to zero, so nothing is ringing and "turn it up until it
    // rings" is genuinely undone. Clearing it re-opens that step.
    hasRungRef.current = false;
    // Reset the per-speaker verify latches so each attempt starts unchecked.
    verifiedRef.current = {};
    verifiedPatchSigRef.current = null;
    // Fresh attempt: move counter and hint state restart, and the diff
    // baseline jumps to the new start state so the load itself isn't a move.
    movesRef.current = 0;
    dropoutsRef.current = 0;
    setDropouts(0);
    hintsUsedRef.current = 0;
    setHintCount(0);
    prevStateRef.current = sab;
    adjustBaseRef.current = (sab && sab.channels) ? sab.channels.map((c) => c.fader) : null;
    adjustLatchRef.current = {};
    lastMoveRef.current = { key: null, at: 0 };
  };

  // Free Play 8/16 selector: switch the whole Free Play scenario between the
  // MX-8 board (SANDBOX_INDEX) and the 16-channel board (BAND_INDEX). 8 is the
  // default and free; 16 is members-only (non-members get the pitch instead of
  // the switch). Reaching the 16-channel board flips state.big16 on, which is
  // what drives the direct-to-DOM meters, steady gains, and no per-frame render.
  const onFreePlaySize = (sz) => {
    const want16 = sz === 16;
    const isBig = !!(state && state.big16);
    if (want16 === isBig) return; // already on that size
    if (want16 && TIER !== 'member') { setPitchFor({ title: '16-channel mixer', big16: true }); return; }
    const cur = SCENARIOS[levelIdx];
    if (cur && cur.isPractice) {
      // Practice keeps its scenario; the size flag makes the rep rebuild on the
      // 16-channel board (bandState) with faults across all 14 inputs. Persists
      // so Practice Again / next rep stay on the chosen size.
      window.PRACTICE_16 = want16;
      loadLevel(levelIdx);
    } else {
      // Free Play swaps between the two boards outright.
      loadLevel(want16 ? BAND_INDEX : SANDBOX_INDEX);
    }
  };

  // Resume where I left off: on mount, jump to the saved scenario (captured at
  // init, before any persist overwrote it). Fires once; only when the target
  // is a real, unlocked level other than the default. Difficulty (FAULTS and
  // GUIDED/BY EAR) is already restored from the profile into state above, so
  // loadLevel picks up the resumed fault count automatically.
  uE(() => {
    // A custom-scenario link wins over everything: load the authored scenario,
    // bypassing the lock so anyone with the link can play it.
    if (SCENARIO_PARAM && CUSTOM_INDEX >= 0) {
      loadLevel(CUSTOM_INDEX, undefined, true);
      return;
    }
    // The full 16-input band (?band=1), bypassing the lock like a shared link.
    if (BAND_PARAM && BAND_INDEX >= 0) {
      loadLevel(BAND_INDEX, undefined, true);
      return;
    }
    // A shared-rep link wins over resume: load that exact Practice rep,
    // bypassing the member lock, at the link's fault count.
    if (REP_PARAM) {
      practiceFaultsRef.current = REP_PARAM.faults;
      setPracticeFaultsState(REP_PARAM.faults);
      loadLevel(window.LEVELS.length, REP_PARAM.seed, true);
      return;
    }
    // A fresh free visitor starts in the "Know your console" walkthrough (the
    // healthy board); walkPhase is already 'intro' so the intro modal is up.
    if (shouldWalk) {
      loadLevel(WALKTHROUGH_INDEX, undefined, true);
      return;
    }
    if (resumeTargetRef.current > 0) loadLevel(resumeTargetRef.current);
  }, []);

  // Copy a shareable link to the current rep (the standalone page URL + the
  // rep's seed + fault count). Built from location so it works whether the app
  // is opened directly or embedded; tier is intentionally NOT carried, so a
  // shared link is a one-rep taste, not a key to the whole member tier.
  const [repCopied, setRepCopied] = uS(false);
  const repCopiedTimerRef = uR(null);
  const copyRepLink = () => {
    const seed = seedRef.current;
    if (seed == null) return;
    const n = practiceFaultsRef.current || 1;
    const url = location.origin + location.pathname + '?rep=' + (seed >>> 0) + (n > 1 ? '&faults=' + n : '');
    try { navigator.clipboard.writeText(url); } catch (e) {}
    setRepCopied(true);
    if (repCopiedTimerRef.current) clearTimeout(repCopiedTimerRef.current);
    repCopiedTimerRef.current = setTimeout(() => setRepCopied(false), 1600);
  };
  // Free users who arrived via a shared rep get one taste, then the pitch
  // instead of a fresh rep (the endless mode is the paid value).
  const repShareFree = !!REP_PARAM && TIER !== 'member';

  // ---- AUTHOR MODE (?author=1): Kyle's custom-scenario builder ----
  // He arranges the board, optionally captures a goal from the current signal
  // (so the student has to reach what he set up), writes the four text fields,
  // and copies a ?scenario= link. The board IS the start state in the link.
  const [authorText, setAuthorText] = uS({ title: '', symptom: '', hint: '', solution: '' });
  const [authorGoal, setAuthorGoal] = uS(null); // [{source,dest,min}] or null = restore-the-mix
  const [authorMsg, setAuthorMsg] = uS(null);
  const authorMsgTimerRef = uR(null);
  const flashAuthorMsg = (m) => {
    setAuthorMsg(m);
    if (authorMsgTimerRef.current) clearTimeout(authorMsgTimerRef.current);
    authorMsgTimerRef.current = setTimeout(() => setAuthorMsg(null), 2200);
  };
  // Capture the goal from the board as it stands now: every source that's
  // reaching a destination at a real level becomes a win condition (require 80%
  // of what's demonstrated). So the author sets up the SOLVED state, captures,
  // then breaks it back to the start the student sees.
  const captureGoal = () => {
    const a = window.computeAudio(state);
    const conds = [];
    ['vocal', 'vocal2', 'guitar', 'laptop', 'playback'].forEach((src) => {
      const c = a.contributions && a.contributions[src];
      if (!c) return;
      ['pa_l', 'pa_r', 'wedge', 'wedge2'].forEach((d) => {
        const lvl = c[d] || 0;
        if (lvl >= 0.18) conds.push({ source: src, dest: d, min: Math.round(lvl * 0.8 * 100) / 100 });
      });
    });
    if (!conds.length) { flashAuthorMsg('Nothing is reaching a speaker right now. Set up the solved state first, then capture.'); return; }
    setAuthorGoal(conds);
    flashAuthorMsg('Goal captured: ' + conds.length + ' target' + (conds.length === 1 ? '' : 's') + '. Now set the start the student sees.');
  };
  const copyScenarioLink = () => {
    try {
      const start = JSON.parse(JSON.stringify(state));
      delete start.phantomPop;
      const payload = { s: start, c: authorGoal || [], t: authorText };
      const code = window.btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      const url = location.origin + location.pathname + '?scenario=' + code;
      try { navigator.clipboard.writeText(url); } catch (e) {}
      flashAuthorMsg('Scenario link copied (' + url.length + ' chars). Goal: ' + (authorGoal ? authorGoal.length + ' targets' : 'restore the full mix') + '.');
    } catch (e) { flashAuthorMsg('Could not build the link.'); }
  };
  // Export the current board + goal + text as a paste-ready library entry. Same
  // payload as the share link, but as a JS object literal to drop into
  // window.SCENARIO_LIBRARY in content.js (the curated, shipped shelf). Also
  // stashes it on window.__lastLibraryEntry so it can be read back for tooling.
  const copyLibraryEntry = () => {
    try {
      const start = JSON.parse(JSON.stringify(state));
      delete start.phantomPop;
      const slug = (authorText.title || 'scenario').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'scenario';
      const entry = {
        id: slug,
        title: authorText.title || 'Library Scenario',
        symptom: authorText.symptom || 'Sort out the system.',
        hint: authorText.hint || '',
        solution: authorText.solution || 'Scenario complete.',
        conditions: authorGoal || [],
        start,
      };
      window.__lastLibraryEntry = entry;
      const text = JSON.stringify(entry, null, 2);
      try { navigator.clipboard.writeText(text); } catch (e) {}
      flashAuthorMsg('Library entry copied (id "' + slug + '"). Paste it into window.SCENARIO_LIBRARY in content.js.');
    } catch (e) { flashAuthorMsg('Could not build the library entry.'); }
  };

  // Gesture-level move counting. Diff consecutive states and attribute the
  // change to a control key; repeated changes to the SAME control inside a
  // short window are one gesture (a fader drag), a different control or a
  // pause starts a new move. Listening-position changes (inspect) and
  // consequences (phantomPop) aren't moves — they're free, like looking.
  uE(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (!prev || prev === state || solved) return;
    // A change in channel COUNT is a structural resize (big-desk padding adding
    // or dropping unused strips), not a user gesture. The per-channel diffs below
    // assume prev and state line up index-for-index, so skip the resize frame.
    if (!prev.channels || !state.channels || prev.channels.length !== state.channels.length) return;
    // Live Show: charge the room for destructive diagnosis. Silencing a channel
    // the audience was hearing (mute, or fader to the floor) or pulling the
    // master is a dropout they heard. Touching a FAULTED channel doesn't count
    // (you're allowed to work on the broken thing); PFL and meters stay free.
    if (liveShowRef.current && level.isPractice) {
      // A dropout counts only when you silence a channel the room was actually
      // hearing (post-fader signal before the action) or pull the master. A
      // channel that's already dead from its own fault costs nothing to mute, so
      // working on the broken thing is free; PFL and the meters are always free.
      let pa = null;
      try { pa = window.computeAudio ? window.computeAudio(prev) : null; } catch (e) { pa = null; }
      const wasHeard = (i) => (!pa || !pa.post || pa.post[i] == null) ? true : pa.post[i] > 0.05;
      let dropped = 0;
      for (let i = 0; i < state.channels.length; i++) {
        const a = prev.channels[i], b = state.channels[i];
        if (a === b) continue;
        const silenced = (!a.mute && b.mute) || (a.fader > 0.05 && b.fader <= 0.05);
        if (silenced && wasHeard(i)) dropped += 1;
      }
      const mA = prev.master, mB = state.master;
      if ((!mA.mute && mB.mute) || (mA.fader > 0.05 && mB.fader <= 0.05)) dropped += 1;
      if (dropped > 0) { dropoutsRef.current += dropped; setDropouts((d) => d + dropped); }
    }
    const key = (() => {
      for (let i = 0; i < state.channels.length; i++) {
        const a = prev.channels[i], b = state.channels[i];
        if (a === b) continue;
        for (const f of ['gain', 'fader', 'pan', 'aux1', 'aux2', 'mute', 'solo', 'phantom', 'highpass']) {
          if (a[f] !== b[f]) return 'ch' + i + '.' + f;
        }
      }
      for (const f of ['fader', 'mute', 'aux1', 'aux2']) {
        if (prev.master[f] !== state.master[f]) return 'master.' + f;
      }
      const po = prev.outputs, no = state.outputs;
      for (const k of Object.keys(no)) {
        const a = po[k], b = no[k];
        if (!a || a === b) continue;
        for (const f of ['on', 'mute', 'volume']) { if (a[f] !== b[f]) return 'out.' + k + '.' + f; }
        if (JSON.stringify(a.eq || null) !== JSON.stringify(b.eq || null)) return 'out.' + k + '.eq';
      }
      const pm = prev.mixer ? prev.mixer.on !== false : true;
      const nm = state.mixer ? state.mixer.on !== false : true;
      if (pm !== nm) return 'mixer.on';
      if (JSON.stringify(prev.cables) !== JSON.stringify(state.cables)) return 'cables';
      if (JSON.stringify(prev.fanOut) !== JSON.stringify(state.fanOut)) return 'fanout';
      if (JSON.stringify(prev.outPatch || null) !== JSON.stringify(state.outPatch || null)) return 'outpatch';
      if (JSON.stringify(prev.outFan || null) !== JSON.stringify(state.outFan || null)) return 'outfan';
      return null;
    })();
    if (!key) return;
    const now = Date.now();
    if (key === lastMoveRef.current.key && now - lastMoveRef.current.at < 700) {
      lastMoveRef.current.at = now; // same gesture, still dragging
      return;
    }
    lastMoveRef.current = { key, at: now };
    movesRef.current += 1;
  }, [state]);

  // Track when the engineer engages PFL on any channel during the level.
  // The ref is a one-way latch — once true, it stays true until level change.
  uE(() => {
    // PFL only checks a channel when the console is powered. With it off the
    // headphone path is dead, so a solo button down counts for nothing.
    const mixerOn = state.mixer ? state.mixer.on !== false : true;
    if (mixerOn && state.channels && state.channels.some(c => c.solo)) {
      pflCheckedRef.current = true;
    }
    // Latch each channel that gets soloed (PFL'd) so requirePflEach can confirm
    // every input was checked in the cans, one by one.
    if (mixerOn && state.channels) {
      state.channels.forEach((c, i) => { if (c.solo) pflChannelsRef.current[i + 1] = true; });
    }
  }, [state.channels, state.mixer ? state.mixer.on : true]);
  // Reset replays the same attempt: same seed, same fault placement.
  // Reset replays the current level (already accessible), so it bypasses the
  // lock — needed so a free shared-rep session can retry its rep.
  const restart = () => loadLevel(levelIdx, seedRef.current, true);
  // Practice Again rolls a new seed — same scenario, fresh fault placement.
  // A free shared-rep session has had its one taste, so it gets the pitch
  // instead of an endless fresh rep.
  const practiceAgain = () => {
    // Free tier, Practice: each "next rep" spends the taste budget; once it's
    // gone, the next tap shows the membership pitch instead of a fresh rep.
    // (A shared-rep link's curated rep counts as one of those free reps.)
    if (level.isPractice && !practiceSoftOpen) { setPitchFor(SCENARIOS[window.LEVELS.length]); return; }
    // Feedback ring-out is a single free taste: once the free viewer has rung out
    // their one wedge (completed set), NEXT WEDGE shows the membership pitch.
    if (level.isFeedbackMode && !feedbackSoftOpen) { setPitchFor(level); return; }
    // Bypass the lock: this replays the current scenario (already accessible),
    // which is also how a free viewer retries a custom or shared scenario.
    loadLevel(levelIdx, undefined, true);
  };
  // Forward a spent-out Practice free user to the Ear Training free rounds (or
  // its own pitch, if those are used up too). Reuses loadLevel's feedback gate.
  const goFeedback = () => {
    const idx = SCENARIOS.findIndex((s) => s.isFeedbackMode);
    if (idx >= 0) loadLevel(idx);
  };
  // FAULTS difficulty change re-rolls the current rep at the new count.
  const setPracticeFaults = (n) => {
    drillFocusRef.current = null;  // a manual difficulty choice leaves the sign-off drill
    focusRef.current = null;       // and leaves the "practice what needs it" focus
    practiceFaultsRef.current = n;
    setPracticeFaultsState(n);
    if (SCENARIOS[levelIdx] && SCENARIOS[levelIdx].isPractice) loadLevel(levelIdx);
  };
  // Pick the Practice difficulty (Easy/Medium/Hard = 1/2/3 faults) without
  // starting a session — just sets the selection the START SESSION button reads.
  const selectDifficulty = (n) => {
    focusRef.current = null; drillFocusRef.current = null;
    practiceFaultsRef.current = n;
    setPracticeFaultsState(n);
  };
  // Picking a level from the menu leaves any "practice what needs it" focus.
  // trackPick remembers that the student entered this lesson from the Live Sound
  // 101 companion track, so the top bar can say "LESSON 3.2" instead of the
  // lesson's home course ("PATCHING · 01 / 08"), which is what made the track
  // feel like a menu of excerpts. It stores the id too, so navigating away with
  // the arrows falls back to the normal label instead of mislabelling.
  const [trackPick, setTrackPick] = uS(null);
  const pickLevel = (i, code) => {
    focusRef.current = null;
    const sc = SCENARIOS[i];
    setTrackPick(code && sc ? { id: sc.id, code } : null);
    loadLevel(i);
  };
  // SHOW DAY (Phase 1b, v1)
  const todayStr = () => new Date().toISOString().slice(0,10);
  const showDayStorageKey = 'audiou-lab-showday-v1';
  const startShowDay = () => {
    const idx = SCENARIOS.findIndex((s) => s.isTheGig);
    if (idx < 0) return;
    try { track('show_day_start', { date: todayStr() }); } catch (e) {}
    try { localStorage.setItem(showDayStorageKey, JSON.stringify({ date: todayStr(), started: Date.now() })); } catch (e) {}
    loadLevel(idx);
  };
  if (typeof window !== 'undefined') window.startShowDay = startShowDay;

  // Practice what needs it: drill the fault types that need practice, steering
  // the auto-generator at the member's rusty faults, and roll a fresh rep. The
  // focus persists across Next rep until they pick another level or change
  // difficulty, and re-derives nothing mid-session (it's a snapshot of now).
  const practiceWhatNeedsIt = () => {
    const cov = coverageFrom(profileRef.current.ledger, window.PRACTICE_FAULTS);
    focusRef.current = (cov.needs && cov.needs.length) ? cov.needs.map((n) => n.key) : null;
    drillFocusRef.current = null;
    const idx = SCENARIOS.findIndex((s) => s.isPractice);
    if (idx >= 0) loadLevel(idx);
  };
  // Start a Practice rep at a chosen fault count, or toggle Live Show on the
  // way in. These let the difficulty + Live Show controls live in the practice
  // panel instead of cluttering the top bar.
  const practiceAtFaults = (n) => {
    focusRef.current = null; drillFocusRef.current = null;
    practiceFaultsRef.current = n; setPracticeFaultsState(n);
    const idx = SCENARIOS.findIndex((s) => s.isPractice);
    if (idx >= 0) loadLevel(idx);
  };
  const practiceLive = (v) => {
    liveShowRef.current = !!v; setLiveShowState(!!v); dropoutsRef.current = 0; setDropouts(0);
    const idx = SCENARIOS.findIndex((s) => s.isPractice);
    if (idx >= 0) loadLevel(idx);
  };
  // Welcome chooser handlers. Either choice marks the path chosen (so the
  // chooser never returns) and routes. Quick fix forces a single legible fault
  // (a muted channel: dead meter, one obvious fix) for the first rep so a
  // newcomer always wins it; Essentials starts the course at lesson one.
  const markPathChosen = () => {
    setPathChosen(true);
    profileRef.current = { ...profileRef.current, pathChosen: true };
    saveProfile(profileRef.current);
  };
  const chooseQuickFix = () => {
    markPathChosen();
    focusRef.current = null; drillFocusRef.current = null;
    firstFixRef.current = true;
    window.PRACTICE_FORCE = 'mute';
    const idx = SCENARIOS.findIndex((s) => s.isPractice);
    if (idx >= 0) loadLevel(idx);
  };
  const chooseEssentials = () => {
    markPathChosen();
    loadLevel(0);
  };
  // Walkthrough handlers. START turns sound on (inside the click, so the audio
  // context is allowed to begin) and enters the steps; NEXT advances, the last
  // step opens the wrap; SKIP jumps straight to the wrap (still the email ask).
  // FINISH marks it done so it never returns, retires the tour + welcome chooser
  // for this viewer, soft-skips the email if they didn't give one, and routes
  // to the lessons or Free Play.
  const startWalkthrough = () => { setAudioOn(true); setWalkStep(0); setWalkPhase('steps'); };
  // Finishing a Mixer Tutorial lesson: mark it done (so the menu shows a ✓) and
  // drop back to the working board, with the menu one click away to pick the
  // next part.
  const finishMixerLesson = () => {
    if (level && level.id) setCompleted((c) => ({ ...c, [level.id]: true }));
    // Bleed straight into the next lesson in the course, the way the other
    // courses advance.
    const pos = MIXER_INDEXES.indexOf(levelIdx);
    if (pos >= 0 && pos + 1 < MIXER_INDEXES.length) { loadLevel(MIXER_INDEXES[pos + 1], seedRef.current, false, state); return; }
    // Last lesson done. The Mixer Tutorial is the free tier's end of guided
    // content, so a free viewer gets the wrap here: a recap, the email capture
    // (the lead magnet's ask at the moment of peak interest), and where to next
    // (see the full course / explore). Members have no gate or pitch, so they
    // just drop onto Free Play. Land on Free Play first so the wrap sits over a
    // working board.
    if (SANDBOX_INDEX >= 0) loadLevel(SANDBOX_INDEX);
    if (TIER !== 'member') { setWalkPhase('wrap'); return; }
    setWalkPhase(null);
  };
  const walkNext = () => { setWalkStep((s) => { if (s + 1 >= walkSteps.length) { finishMixerLesson(); return s; } return s + 1; }); };
  const walkSkip = () => { setWalkPhase(null); if (SANDBOX_INDEX >= 0) loadLevel(SANDBOX_INDEX); };
  const finishWalkthrough = (route) => {
    profileRef.current = { ...profileRef.current, walkthroughDone: true, pathChosen: true };
    saveProfile(profileRef.current);
    setPathChosen(true);
    dismissTour();
    setWalkPhase(null);
    // Members start Run the Show at lesson 1. Free viewers go to the free
    // Start Here course (HOME_INDEX); Run the Show is member-locked, so
    // routing them to lesson 0 would land on a paywall right after the tour
    // promised them a course. "Explore" just lands on Free Play.
    if (route === 'lessons') { loadLevel(TIER === 'member' ? 0 : HOME_INDEX); return; }
    loadLevel(SANDBOX_INDEX >= 0 ? SANDBOX_INDEX : 0, undefined, true);
  };
  // Fault-freshness coverage for the picker + debrief (members only). Recomputed
  // each render from the live ledger, so it reflects the rep just solved.
  const coverage = (TIER === 'member') ? coverageFrom(profileRef.current.ledger, window.PRACTICE_FAULTS) : null;
  // Live Show toggle (Practice, members): flip "the room is listening" on/off
  // and reset the dropout tally. Persisted so it resumes.
  const setLiveShow = (on) => {
    liveShowRef.current = !!on;
    setLiveShowState(!!on);
    dropoutsRef.current = 0;
    setDropouts(0);
  };
  // From the top-bar toggle: flip Live Show and re-roll a fresh rep so the
  // tally starts clean.
  const toggleLiveShow = (on) => {
    setLiveShow(on);
    if (SCENARIOS[levelIdx] && SCENARIOS[levelIdx].isPractice) loadLevel(levelIdx);
  };
  // Train this rank: set the rep up for the member's current rung and roll a
  // fresh one. Ranks 1-3 set the fault count; the sign-off rung turns on the
  // healthy-system bias; the live-show rung turns on "the room is listening."
  const trainRank = () => {
    const r = rankByN(Math.min(HIGHEST_LIVE_RANK, rank));
    drillFocusRef.current = r.signoff ? 4 : null;
    setLiveShow(!!r.liveShow);
    practiceFaultsRef.current = r.faults;
    setPracticeFaultsState(r.faults);
    if (SCENARIOS[levelIdx] && SCENARIOS[levelIdx].isPractice) loadLevel(levelIdx);
  };
  // Next into a locked challenge is allowed on purpose: loadLevel shows the
  // member pitch instead of the scenario (the picker does the same).
  const next = () => {
    if (levelIdx + 1 >= SCENARIOS.length) return;
    const cur = SCENARIOS[levelIdx], nxt = SCENARIOS[levelIdx + 1];
    // Between two Essentials lessons (numeric ids, the continuous build), carry
    // the PFL monitoring state forward so it feels like one job, not ten resets.
    const carryMon = (cur && nxt && typeof cur.id === 'number' && typeof nxt.id === 'number')
      ? { solo: (state.channels || []).map((c) => !!c.solo) } : null;
    loadLevel(levelIdx + 1, undefined, false, undefined, carryMon);
  };
  const prev = () => { if (levelIdx > 0) loadLevel(levelIdx - 1); };

  // Gate to desktop. Every hook below must be called before the early return
  // so the order stays stable across renders.
  const isMobile = useViewport();

  // Scale-to-fit. The board is laid out at a fixed design width (DESIGN_W) so
  // the stage cards and console row never get squeezed into each other; the
  // whole canvas is then uniformly scaled to fit the available space. designH
  // is the canvas's natural (unscaled) height, measured live so it never clips.
  const fitViewportRef = uR(null);
  const designRef = uR(null);
  const [designH, setDesignH] = uS(760);
  // Click-to-zoom (legibility on big monitors): null = fit-to-screen (normal),
  // else { scale, tx, ty } — a bigger scale plus a translate that centres the
  // clicked region in the viewport. The zoom is folded into the SAME transform
  // the fit uses and the combined scale is passed down as fitScale, so the cable
  // overlay (which divides screen deltas by fitScale) stays pixel-accurate.
  const [zoom, setZoom] = uS(null);
  // Overall zoom (user-controlled): 1 = fit-to-window, up to 2.0. Multiplies the
  // fit scale; the viewport scrolls when the board grows past the window. The
  // knob/cable math already divides by the applied scale, so it compensates.
  const ZOOM_MIN = 1, ZOOM_MAX = 2, ZOOM_STEP = 0.25;
  const [userZoom, setUserZoom] = uS(() => { const z = Number(profileRef.current.userZoom); return (z >= ZOOM_MIN && z <= ZOOM_MAX) ? z : 1; });
  const bumpZoom = React.useCallback((d) => setUserZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round((z + d) * 100) / 100))), []);
  const resetZoom = React.useCallback(() => setUserZoom(1), []);
  // Hiding the stage narrows the canvas to the console, so fit-to-screen scales
  // it up. Height still measured live (designH), width switches with the pref.
  // Guided lessons and the walkthrough teach ON the stage (patching, power-up,
  // cables), so they always show it; the toggle is only offered elsewhere. The
  // pref itself sticks, so leaving a lesson restores the hidden view.
  // EXCEPT on the 16-channel board: there is no readable combined view at that
  // scale, so even lessons run one full-width panel at a time and the STAGE /
  // MIXER toggle in the top bar swaps between them (Kyle 2026-07-13).
  const stageHideable = !isMobile && !level.isWalkthrough && (!level.isLesson || !!state.big16);
  // The 16-input band has no stage graphic yet (step 2 rebuilds the stage +
  // sub-snakes for it), so it stays on the front-of-house view: stage forced
  // hidden, and the SHOW STAGE toggle is withheld until that stage exists.
  // The old 4-input StageRow never renders on the big desk — the 16-channel
  // board gets its own full-panel Stage16 (toggled via stage16Open). So the
  // console-layout path always treats the stage as hidden when big16.
  const effStageHidden = stageHideable && (stageHidden || !!level.isBand || !!state.big16);
  // Big-desk view is offered in the same places the stage toggle is: not in
  // guided lessons or the walkthrough (authored against the 5-strip band) and
  // not on mobile. Elsewhere the console can present as an 8/16-channel desk.
  // The 8/16 selector lives in Free Play (both its MX-8 and 16-channel boards).
  // It switches the whole scenario between the two (source-swap), so there is no
  // empty-strip padding: effConsoleSize stays 0 and padConsole is a no-op. 16 is
  // member-gated in the handler (onFreePlaySize).
  const sizeSelectable = !isMobile && (level.id === 'sandbox' || level.id === 'band' || level.isPractice);
  const effConsoleSize = 0;
  const nCh = state && Array.isArray(state.channels) ? state.channels.length : NATIVE_CH;
  // The console footprint grows with the TOTAL strip count above the native 5 —
  // whether the extra strips are unused big-desk padding or a real band's inputs.
  const stripsOver = Math.max(0, nCh - NATIVE_CH);
  // Brief placement when the stage is hidden. A wide console (padded big desk OR
  // a real multi-input band) is WIDTH-limited with spare vertical room, so the
  // brief drops BELOW it to reclaim the horizontal space the beside-column ate.
  // Native is HEIGHT-limited (the console is tall), so the brief stays BESIDE it
  // — below would make the taller canvas scale the console down (the v35 fix).
  const briefBelow = effStageHidden && nCh > NATIVE_CH;
  // Strips above native widen the canvas by their footprint so scale-to-fit
  // shrinks the whole board to fit; a native board keeps DESIGN_W exactly.
  const baseW = briefBelow ? DESIGN_W_CONSOLE_ONLY : (effStageHidden ? DESIGN_W_STAGE_HIDDEN : DESIGN_W);
  const designW = baseW + stripsOver * STRIP_UNIT;
  const fitScale = useFitScale(fitViewportRef, designW, designH, !isMobile);
  // Effective scale = the zoom scale when zoomed in, the fit scale otherwise.
  const appliedScale = zoom ? zoom.scale : fitScale * userZoom;
  // Zoom INTO a region: measure its centre in the design canvas's own unscaled
  // coordinates (offset chain up to designRef, transform-independent), then pick
  // a scale ~2.2x the current fit (capped at 3) and a translate that lands that
  // centre at the viewport middle. translate-before-scale about origin 0 0 gives
  // screen(p) = translate + scale*p, so tx = W/2 - s*cx, ty = H/2 - s*cy.
  const onZoomTo = React.useCallback((el) => {
    const vp = fitViewportRef.current, dr = designRef.current;
    if (!vp || !dr || !el) return;
    const drRect = dr.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    // Current rendered scale, read straight from the DOM (robust to any child
    // transforms like the sub-snakes' translateX(-50%)). The region centre in
    // the design canvas's unscaled coordinates then follows directly.
    const curScale = (drRect.width / designW) || 1;
    const rw = elRect.width / curScale, rh = elRect.height / curScale;
    const cx = (elRect.left + elRect.width / 2 - drRect.left) / curScale;
    const cy = (elRect.top + elRect.height / 2 - drRect.top) / curScale;
    // Scale so the region fills ~80% of the viewport (a margin all around),
    // never smaller than the fit scale, capped at 3x so a tiny box (a single
    // sub-snake) doesn't over-zoom. A big region (the whole drum riser + its
    // sub-snake) lands at a lower scale so both fit and the runs stay traceable.
    const margin = 1.25;
    const fitBoth = Math.min(vp.clientWidth / (rw * margin), vp.clientHeight / (rh * margin));
    // A region far WIDER than the viewport — the console snake fan-out on the
    // 16-ch desk — barely zooms if we try to fit its whole width, so it reads
    // no closer than the fit view. Instead zoom on its HEIGHT and let the
    // cursor-driven pan carry the eye across the width. Deliberately a MODEST
    // close-in (not filling the height): more of the fan-out stays on screen so
    // you can drag a tail across it and still see the far end, and the pan is
    // gentler. Capped ~2.1x for the same reason.
    const wide = (rw / rh) > (vp.clientWidth / vp.clientHeight) * 1.6;
    // Wide fan-out: aim to show ~half its width on screen (a modest close-in, so
    // the far end stays reachable while you drag a tail across), but never so much
    // that its height overflows. Pan handles the rest. Square regions fit as before.
    const showHalf = 2.0 * vp.clientWidth / rw;
    const fillHeight = vp.clientHeight / (rh * 1.2);
    const fit = wide ? Math.min(showHalf, fillHeight) : fitBoth;
    const s = Math.max(fitScale || 1, Math.min(wide ? 2.3 : 3, fit));
    // Only the wide fan-out zoom pans; the square region zooms (stage box, drum)
    // keep their centred, non-panning behaviour.
    setZoom({ scale: s, tx: vp.clientWidth / 2 - s * cx, ty: vp.clientHeight / 2 - s * cy, pannable: wide });
  }, [fitScale, designW]);
  const onZoomReset = React.useCallback(() => setZoom(null), []);
  // Drop the zoom whenever the view, level, or board changes, and on Escape, so
  // a stale pan/scale never lingers over a screen it wasn't computed for.
  React.useEffect(() => { setZoom(null); }, [stage16Open, levelIdx, state.big16, effStageHidden]);
  // A 16-channel LESSON opens on the STAGE view: that's where its work starts
  // (sub-snakes, mic lines, speakers), and the student toggles to MIXER when
  // the board is the next stop. Everything else keeps the console-first default.
  // `opensOn: 'mixer'` overrides that for a lesson whose work STARTS at the
  // console — the soundcheck lessons, and any lesson whose first step is
  // "press STAGE" (auto-opening it would tick that step before they touched it).
  React.useEffect(() => { setStage16Open(!!(state.big16 && level.isLesson && level.opensOn !== 'mixer')); }, [levelIdx, state.big16]);
  React.useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => { if (e.key === 'Escape') setZoom(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [!!zoom]);
  // Ctrl/Cmd +/-/0 drive the overall zoom (browser zoom is cancelled by the
  // fit-to-window refit, so the app owns these keys instead).
  React.useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); bumpZoom(ZOOM_STEP); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); bumpZoom(-ZOOM_STEP); }
      else if (e.key === '0') { e.preventDefault(); resetZoom(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bumpZoom, resetZoom]);
  // Cursor-driven pan while zoomed. The pointer's position in the viewport maps
  // to the pan, so a region wider than the screen (the 16-ch console fan-out) can
  // be explored by moving the pointer toward the side you want to reach, without
  // zooming back out. Uses POINTERMOVE (not mousemove) so it keeps panning while a
  // cable is lifted mid-drag — that's how you drag a fan-out tail from one end of
  // the snake to the other (e.g. re-patch CH 11 onto CH 2) without letting go. The
  // range is clamped to the content, so a region that already fits doesn't move.
  const zoomScale = (zoom && zoom.pannable) ? zoom.scale : 0;
  React.useEffect(() => {
    if (!zoomScale) return;
    const vp = fitViewportRef.current, dr = designRef.current;
    if (!vp || !dr) return;
    const scaledW = zoomScale * dr.offsetWidth;
    const onMove = (e) => {
      const r = vp.getBoundingClientRect();
      const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const txMin = Math.min(0, r.width - scaledW);   // 0 (no pan) when the content fits
      // Ease the cursor->pan mapping: GENTLE near the centre (a wide, low-gain
      // band where you line up a drop precisely) and only speeding up toward the
      // edges to reach the far channels. Slower/steadier than a straight 1:1 map
      // while still reaching both ends. Horizontal only (fan-out fills the height).
      const m = nx - 0.5;
      const f = 0.5 + Math.sign(m) * Math.pow(Math.abs(2 * m), 2.2) * 0.5;
      setZoom(z => (z ? { ...z, tx: f * txMin } : z));
    };
    vp.addEventListener('pointermove', onMove);
    return () => vp.removeEventListener('pointermove', onMove);
  }, [zoomScale]);

  // Keep the rendered channel count in step with the selected desk size. Padding
  // only ever adds or removes UNUSED strips (real channels are untouched), so
  // this is idempotent and safe to run on every size/level change. Layout effect
  // so the resize lands before paint, with no flash of the native board.
  React.useLayoutEffect(() => {
    setState((s) => {
      if (!s || !Array.isArray(s.channels)) return s;
      const next = padConsole(s.channels, effConsoleSize);
      return next.length === s.channels.length ? s : { ...s, channels: next };
    });
  }, [effConsoleSize, levelIdx]);

  // Track the canvas's natural height. offsetHeight is layout (transform-
  // independent), so this stays correct under the scale transform. Re-measures
  // on level/solved swaps and any in-level content change (pills, cards) via
  // the ResizeObserver; updates only on a real change to avoid a render loop.
  uE(() => {
    const el = designRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      if (h) setDesignH(prev => (Math.abs(h - prev) > 1 ? h : prev));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  if (isMobile) return <MobileNotice onCapture={captureEmail} optedIn={emailDone}/>;

  // Verify-each checklist status for the brief. A speaker shows checked if it
  // was already latched (verifiedRef) OR reads reached right now. Read the
  // SETTLED signal (audioBaseline), the same read the win latch uses: on the
  // animated signal a source's envelope swings its contribution across the
  // threshold every frame, so a check ticked on a peak and un-ticked on a
  // trough, and the guide's STEP counter (with its spotlight) bounced
  // 2 <-> 3 on The Gig's "Test every speaker" step. Same reason hintCtx.audio
  // is the baseline below. The win effect owns the persistent latch.
  let verifyStatus = null;
  if (level.verifyEach && level.verifyEach.length) {
    verifyStatus = {};
    for (const v of level.verifyEach) {
      const cont = audioBaseline.contributions[v.source];
      const lvl = cont ? (v.dest === 'pa' ? Math.max(cont.pa_l, cont.pa_r) : (cont[v.dest] || 0)) : 0;
      // Mirror the win latch exactly, including the othersMax one-sided
      // guard: the display must never show a check the latch would refuse
      // (a center-pan blast would otherwise tick both mains here while the
      // real latch stays unset, and the step would un-check later).
      const oneSided = !v.othersMax || Object.keys(v.othersMax).every((k) => (cont ? (cont[k] || 0) : 0) <= v.othersMax[k]);
      const reachedNow = lvl >= (v.min != null ? v.min : 0.25) && oneSided;
      verifyStatus[v.dest] = !!verifiedRef.current[v.dest] || reachedNow;
    }
  }

  // Per-channel PFL checklist for the brief (Mic Inputs / DI Boxes). Checked if
  // latched OR currently soloed, so it tracks the moment you press PFL.
  let pflEachStatus = null;
  if (level.requirePflEach) {
    pflEachStatus = level.requirePflEach.map(ch => {
      const srcKey = audio.chanInSource[ch - 1];
      const lbl = srcKey && window.SOURCES[srcKey] ? window.SOURCES[srcKey].label : ('Channel ' + ch);
      const checked = !!pflChannelsRef.current[ch] || !!(state.channels[ch - 1] && state.channels[ch - 1].solo);
      return { label: 'Checked ' + lbl + ' in PFL', pass: checked };
    });
  }

  // Zero-the-console checklist for the Power-Down brief. Grouped by control
  // type (one row per knob/switch family across all strips) so the brief
  // stays readable instead of listing 5 channels x 9 settings.
  let zeroStatus = null;
  if (level.requireZeroed) {
    const Z = 0.02;
    const chs = state.channels;
    zeroStatus = [
      { label: 'Every gain down',       pass: chs.every(c => c.gain <= Z) },
      { label: 'Every aux send down',   pass: chs.every(c => c.aux1 <= Z && c.aux2 <= Z && (c.aux3 || 0) <= Z && (c.aux4 || 0) <= Z) },
      { label: 'Every fader down',      pass: chs.every(c => c.fader <= Z) },
      { label: 'Every channel muted',   pass: chs.every(c => c.mute) },
      { label: 'Every pan centered',    pass: chs.every(c => Math.abs(c.pan - 0.5) <= Z) },
      { label: 'Every HPF off',         pass: chs.every(c => !c.highpass) },
      { label: '+48V off everywhere',   pass: chs.every(c => !c.phantom) },
      { label: 'Master down and muted', pass: state.master.mute && state.master.fader <= Z },
    ];
  }

  // Patch checklist for the brief. The patch lesson gets the three jobs as
  // separate rows; practice reps get one combined row (the patch is usually
  // fine there — the row exists so a crosspatch fault has a visible miss).
  let patchStatus = null;
  if (level.requirePatch && !state.big16) {
    const c = state.cables || {};
    const cablesOk = c.vocal === 1 && c.vocal2 === 2 && c.guitar === 3 && c.laptop === 4;
    const fo = state.fanOut || [];
    const fanOutOk = [1, 2, 3, 4].every((v, i) => fo[i] === v);
    // MX-8 uses four returns only (L, R, AUX 1 -> Wedge 1, AUX 2 -> Wedge 2).
    // AUX 3/4 are spare sends and W3/W4 don't exist here, so don't require them
    // patched or the patch lesson could never complete.
    const ofn = state.outFan || window.DEFAULT_OUT_FAN;
    const outFanOk = ofn[1] === 'mainL' && ofn[2] === 'mainR' && ofn[3] === 'aux1' && ofn[4] === 'aux2';
    const op = state.outPatch || window.DEFAULT_OUT_PATCH;
    const outOk = op.pa_l === 1 && op.pa_r === 2 && op.wedge === 3 && op.wedge2 === 4;
    patchStatus = level.isPractice
      ? [{ label: 'Patched per the I/O list', pass: cablesOk && fanOutOk && outFanOk && outOk }]
      : [
          { label: 'Inputs on snake 1-4 per the list', pass: cablesOk },
          { label: 'Snake tails 1-4 on their channels', pass: fanOutOk },
          { label: 'Console outputs into snake 1-4', pass: outFanOk },
          { label: 'Speaker lines on snake 1-4', pass: outOk },
        ];
  } else if (level.requirePatch && state.big16) {
    // 16-ch: one combined row — every mic in its listed input and every input
    // on its listed channel. The visible miss is what a crosspatch / wrong-input
    // fault reads as.
    patchStatus = [{ label: 'Patched per the input list', pass: window.big16PatchOk ? window.big16PatchOk(state) : true }];
  }

  // Practice extra conditions (attached by the rolled fault) merge into the
  // displayed objective list, same as they merge into the win check.
  const effConditions = (level.conditions || []).concat(
    (level.isPractice && practiceInfoRef.current && practiceInfoRef.current.extraConditions) || []);

  // Unity-fader (+ optional input-gain) status for the gain-structure brief.
  let gainStatus = null;
  if (level.gainStructure) {
    const gs = level.gainStructure;
    const unity = gs.unity != null ? gs.unity : 0.75;
    const tol = gs.faderTol != null ? gs.faderTol : 0.06;
    const idx = (gs.refChannel || 1) - 1;
    const refCh = state.channels[idx];
    let inputOk = true;
    if (gs.inputBand) {
      const lvl = (audio.chanInBaseline && audio.chanInBaseline[idx]) || 0;
      inputOk = lvl >= gs.inputBand[0] && lvl <= gs.inputBand[1];
    }
    gainStatus = {
      hasRef: !!gs.refChannel,
      hasInput: !!gs.inputBand,
      input: inputOk,
      fader: !!refCh && !refCh.mute && Math.abs(refCh.fader - unity) <= tol,
      master: !state.master.mute && Math.abs(state.master.fader - unity) <= tol,
      // The "up at unity" objective names the actual ref channel (bass, playback,
      // etc.), not a hardcoded one. '5/6' is the playback strip; show it by name.
      refLabel: refCh ? (refCh.label === '5/6' ? 'Playback' : refCh.label) : '',
      // gainOnly tasks test the input gain only; the fader-at-unity objectives
      // are hidden because the fader is a mix choice, not a requirement.
      gainOnly: !!gs.gainOnly,
    };
  }

  // Console power status — shared by the brief card and the adaptive hints.
  const powerStatus = (() => {
    const o = state.outputs;
    const passive = (state.topology && state.topology.paRig) === 'amp+passive';
    return {
      console: state.mixer ? state.mixer.on !== false : true,
      paStage: passive ? !!(o.amp && o.amp.on) : (!!(o.pa_l && o.pa_l.on) && !!(o.pa_r && o.pa_r.on)),
      paLabel: passive ? 'Power amp on' : 'Main speakers on',
      // MX-8 has two wedges; the 16-ch board has four. Only require the wedges
      // that exist, or "Wedges on" could never pass on the small board.
      wedges: state.big16
        ? !!(o.wedge && o.wedge.on && o.wedge2 && o.wedge2.on && o.wedge3 && o.wedge3.on && o.wedge4 && o.wedge4.on)
        : !!(o.wedge && o.wedge.on && o.wedge2 && o.wedge2.on),
      masterDown: state.master.fader <= 0.1,
      wedgesOff: !(o.wedge && o.wedge.on) && !(o.wedge2 && o.wedge2.on) && !(o.wedge3 && o.wedge3.on) && !(o.wedge4 && o.wedge4.on),
      paOff: passive ? !(o.amp && o.amp.on) : (!(o.pa_l && o.pa_l.on) && !(o.pa_r && o.pa_r.on)),
      paOffLabel: passive ? 'Power amp off' : 'Main speakers off',
    };
  })();

  // Adaptive hints. A level can define hints: [{ text, done(ctx) }]. We show
  // only the steps not yet done, one more per click (hintCount in the brief),
  // so a hint for something already handled (phantom already on, a channel
  // already up) never appears. Levels with only a legacy hint string fall back
  // to a single on-request hint.
  // Objectives read the SETTLED signal (audioBaseline = computeAudio(state), no
  // per-frame envelope), the exact signal checkWin uses. A real vocal's live
  // level swings above and below the send threshold every frame; evaluating the
  // guide on the live `audio` made a step read done/undone frame-to-frame, so
  // the active step (and its spotlight box) bounced back and forth. On the
  // baseline the level is fixed for a given knob setting, so a completed step
  // stays completed and the box holds — and the guide never disagrees with the
  // win. (Same reason the BriefCard objectives use audioBaseline.)
  const hintCtx = {
    state, audio: audioBaseline, powerStatus, gainStatus, verifyStatus, pflEachStatus,
    zeroStatus, patchStatus, feedback, paBalanceIssue, audioOn, adjustBase: adjustBaseRef.current, adjustLatched: adjustLatchRef.current,
    pflChannels: pflChannelsRef.current, pflChecked: pflCheckedRef.current,
    ioListOpen: ioListOpen || ioListOpenedRef.current, hasPopped: hasPoppedRef.current,
    hasRung: hasRungRef.current,
    // 16-channel view: which page is showing right now, and whether the stage
    // has been opened at all this level (the latch, so a step that sends them
    // to the stage stays checked once they come back to the mixer).
    stageOpen: !!(state.big16 && stage16Open), stageOpened: stageOpenedRef.current,
  };
  const hintDefs = level.hints || (level.hint ? [{ text: level.hint, done: () => false }] : []);
  const pendingHints = hintDefs
    .filter(h => { try { return !h.done(hintCtx); } catch (e) { return true; } })
    .map(h => h.text);

  // Run the Show lessons render as a guided coach (LessonGuide) instead of the
  // brief + hidden hint: the active step is the first of the lesson's hints not
  // yet done, and the spotlight rings that step's target control so the eye goes
  // straight to the move. Mixer Tutorial (isWalkthrough) keeps its own panel.
  const guideSteps = (level.isLesson && !solved && Array.isArray(level.hints) && level.hints.length) ? level.hints : null;
  const guideActiveIndex = guideSteps ? lessonActiveIndex(guideSteps, hintCtx) : -1;
  const guideTarget = (guideSteps && guideActiveIndex >= 0 && guideActiveIndex < guideSteps.length)
    ? guideSteps[guideActiveIndex].target : null;
  // While a wedge is RINGING and the Monitor EQ is still shut, the spotlight
  // leaves the step's own control and rings the MONITOR EQ button instead
  // (Kyle 2026-07-24: the flash alone was "too subtle"). The button is the only
  // way into the fix now that the panel does not open itself, and by lesson 7 a
  // student has followed this green ring six times, so it is the signal they
  // already read as "here". The step target comes back the moment the panel
  // opens — and the spotlight is suppressed then anyway, because the glowing EQ
  // band takes over inside the panel. Guided lessons only: Free Play is a
  // sandbox and a nagging ring there would be wrong, and Practice and Ear
  // Training never reach this because the panel has already opened itself.
  const coachTarget = (guideSteps && wedgeRinging && !eqPanelOpen) ? 'monitor-eq' : guideTarget;

  // The active step can also ask the board to TRACE a signal path — light one
  // channel's whole run and flow signal along it (see FlowTraceContext). Read
  // the step's `flow` spec, suppressed while any pop-up owns the top layer,
  // exactly like the spotlight target above.
  const flowSpec = (eqPanelOpen || catalogOpen || pitchFor || ctaOpen) ? null
    : (walkPhase === 'steps'
        ? (walkSteps[walkStep] && walkSteps[walkStep].flow)
        : (guideSteps && guideActiveIndex >= 0 && guideActiveIndex < guideSteps.length
            ? guideSteps[guideActiveIndex].flow : null)) || null;

  return (
   <window.DefHoverContext.Provider value={setDefHover}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'radial-gradient(ellipse at 30% 0%, #1a1a1f 0%, #0e0e10 50%, #08080a 100%)', position: 'relative' }}>
      <TopBar
        level={level} levelIdx={levelIdx} totalLevels={SCENARIOS.length}
        solved={solved} audioOn={audioOn} setAudioOn={setAudioOn}
        onRestart={restart} onPrev={prev} onNext={next} onPick={pickLevel}
        trackPick={trackPick}
        completed={completed}
        eqOpen={eqPanelOpen} onToggleEq={() => setEqPanelOpen(o => !o)}
        /* A ringing wedge lights it, everywhere. This was briefly tied to the
           auto-open's eqIsTheFix gate, which meant a lesson that rings but is not
           flagged as a ring-out (Start Here 105, the last step before the opt-in)
           showed no signpost at all. Opening the panel over a lesson is a teaching
           decision; saying "the wedge is ringing and this is where you fix it" is
           not, and a student who is stuck needs it most in the lessons that do not
           hold their hand. Mains howls are already out via `wedgeRing`. */
        eqRinging={wedgeRinging}
        onOpenProgress={() => setSaveModalOpen(true)} streak={streak}
        stageHidden={effStageHidden}
        onToggleStage={state.big16 ? (() => setStage16Open(v => !v)) : ((stageHideable && !level.isBand) ? () => setStageHidden(v => !v) : null)}
        stage16Open={!!(state.big16 && stage16Open)}
        consoleSize={consoleSize} onSetConsoleSize={onFreePlaySize} sizeSelectable={sizeSelectable} big16={!!state.big16}
        onOpenIoList={() => setIoListOpen(v => !v)}
        onOpenCatalog={() => setCatalogOpen(true)}
        nudgeSound={!audioOn && !everSoundRef.current && !tourOpen}
        practiceFaults={practiceFaults} onSetPracticeFaults={repShareFree ? null : setPracticeFaults}
        feedbackByEar={feedbackByEar} onSetFeedbackByEar={setFeedbackByEar}
        feedbackFreeLabel={feedbackFreeLabel} feedbackExhausted={etExhausted}
        practiceFreeLeft={TIER === 'member' ? null : freeRepsLeft}
        rank={rank} rankClean={rankClean} onTrainRank={(TIER === 'member' && !repShareFree) ? trainRank : null}
        liveShow={false} onSetLiveShow={null}
        onSelectDifficulty={(TIER === 'member' && !repShareFree) ? selectDifficulty : null}
        onPracticeFaults={(TIER === 'member' && !repShareFree) ? practiceAtFaults : null} onPracticeLive={null}
        startOpen={!shouldWalk && !SCENARIO_PARAM && !REP_PARAM && !BAND_PARAM && !tourOpen}
        zoomPct={Math.round(userZoom * 100)} onZoomIn={() => bumpZoom(ZOOM_STEP)} onZoomOut={() => bumpZoom(-ZOOM_STEP)} onZoomReset={resetZoom} onShowDay={startShowDay} onByo={() => setByoOpen(true)}
      />

      <IoListPanel open={ioListOpen} onClose={() => setIoListOpen(false)} state={state}/>
      <FaultCatalog open={catalogOpen} onClose={() => setCatalogOpen(false)} tier={TIER}/>
      {AUTHOR_MODE && (
        <AuthorPanel text={authorText} setText={setAuthorText} goal={authorGoal}
          onCapture={captureGoal} onClearGoal={() => setAuthorGoal(null)} onCopy={copyScenarioLink} onCopyEntry={copyLibraryEntry} msg={authorMsg}/>
      )}
      <TourOverlay open={tourOpen && walkPhase === null} onClose={dismissTour}/>
      <WalkthroughIntro open={walkPhase === 'intro'} onStart={startWalkthrough}/>
      <WalkthroughWrap open={walkPhase === 'wrap'}
        onLessons={() => finishWalkthrough('lessons')}
        onExplore={() => finishWalkthrough('explore')}/>
      {/* Any pop-up (Monitor EQ, Input List, catalog, pitch, CTA) owns the top
          layer: the spotlight ring hides while one is open so it can't draw in
          front of the window. */}
      <WalkthroughSpotlight target={(eqPanelOpen || catalogOpen || pitchFor || ctaOpen) ? null : (walkPhase === 'steps' ? (walkSteps[walkStep] && walkSteps[walkStep].target) : (coachTarget || null))}/>
      {/* Hovering a definition washes the matching controls in amber. The
          Monitor EQ stays allowed here (unlike the spotlight above) because
          "graphic EQ" points AT that panel; the rest hide behind a pop-up
          for the same reason the ring does. */}
      <GlossaryHighlight term={(catalogOpen || pitchFor || ctaOpen) ? null : defHover}/>
      <CompletionCta open={ctaOpen} onClose={() => setCtaOpen(false)} tier={TIER}
        onGoPractice={() => { setCtaOpen(false); loadLevel(window.LEVELS.length); }}/>
      {/* Free-tier email opt-in. Fires after the FIRST Start Here win (moved
          from the finale 2026-10-18, council — a win is the moment of value;
          a doorway was a toll). Required by design (no skip UI): only the cold
          public audience reaches it. Email-list traffic lands on the
          ?optedin=1 links and members are excluded by tier, so neither ever
          sees it. onSubmit does NOT navigate: the ask sits mid-course now, so
          the student stays on the lesson they just won (at the finale
          fallback, the completion card opens instead). onSkip is dormant,
          nothing renders it. */}
      <EmailGate
        open={firstWinEmail && TIER !== 'member' && !emailDone && !tourOpen}
        onSubmit={(email, name) => { captureEmail(email, name); setFirstWinEmail(false); if (completed[SH_FINALE_ID]) setCtaOpen(true); }}
        onSkip={() => { track('email_skip'); setFirstWinEmail(false); setCtaOpen(true); }}/>
      {/* The welcome chooser is retired: a fresh free visitor gets the "Know
          your console" walkthrough, and everyone else lands with the mode menu
          open (startOpen on TopBar), so the menu is the single universal entry.
          The component + handlers remain dormant. */}
      <window.PlacementPanel
        open={!!placementFor} srcKey={placementFor}
        label={placementFor && window.SOURCES[placementFor] ? window.SOURCES[placementFor].label : ''}
        setup={state.micSetup && placementFor ? state.micSetup[placementFor] : null}
        paLine={window.paLineOf ? window.paLineOf(state) : null}
        onChange={(patch) => setState(prev => ({ ...prev, micSetup: { ...(prev.micSetup || {}), [placementFor]: { ...(window.DEFAULT_MIC_SETUP || { pattern: 'cardioid', az: 180, tilt: 10 }), ...(prev.micSetup && prev.micSetup[placementFor]), ...patch } } }))}
        /* Writes the SAME state.paLine the stage plot drags, so the mains land in
           one place for the whole system: every downstage mic's panel and the
           stage plot all read this one number. */
        onPaLine={(v) => setState(prev => ({ ...prev, paLine: v }))}
        /* Which wedge is on the floor is a fact about the stage too, not about one
           microphone, so it lives on the state next to paLine and every mic's
           panel reads the same cabinet. */
        wedgeDeg={state.wedgeDeg}
        onWedgeDeg={(v) => setState(prev => ({ ...prev, wedgeDeg: v }))}
        onClose={() => setPlacementFor(null)}/>
      <window.MonitorEqPanel
        open={eqPanelOpen} onClose={() => setEqPanelOpen(false)}
        wedge={state.outputs.wedge} wedge2={state.outputs.wedge2}
        wedge3={state.big16 ? state.outputs.wedge3 : undefined} wedge4={state.big16 ? state.outputs.wedge4 : undefined}
        onBandChange={setMonitorEqBand}
        ringWedge={feedback ? feedback.ringWedge : null}
        ringBand={feedback ? feedback.ringBand : null}
        rings={feedback ? feedback.rings : []}
        toneGate={level.toneGate}
        byEar={level.isFeedbackMode ? feedbackByEar : false}
        onSetByEar={level.isFeedbackMode && TIER === 'member' ? setFeedbackByEar : null}
        severity={fbSeverity}
      />

      <WarningModal
        open={warnOpen}
        phantomPop={state.phantomPop} clips={clipsStable} paBalanceIssue={paBalanceIssue} audio={audio}
        passivePA={(state.topology && state.topology.paRig) === 'amp+passive'}
        popGoal={!!level.popIsTheGoal}
        onReset={restart}
        onClose={() => { warnDismissedSigRef.current = faultSig; setWarnOpen(false); }}
      />

      <ProgressModal open={saveModalOpen} onClose={() => setSaveModalOpen(false)}
        profile={{ ...profileRef.current, completed, reps }}
        onRestore={(p) => { profileRef.current = p; setCompleted(p.completed); setReps(p.reps); setEtGuided(p.etGuided || 0); setEtByEar(p.etByEar || 0); }}
        onResetProgress={() => { profileRef.current = defaultProfile(); setCompleted({}); setReps(0); setEtGuided(0); setEtByEar(0); }}/>

      {/* Member pitch — shown on the free tier when locked Practice Mode is
          clicked. Short and honest; the locked entry does the selling. */}
      {pitchFor && (
        <div onClick={() => setPitchFor(null)} style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: 420, background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
            border: '1px solid var(--accent)', borderRadius: 8, padding: '18px 20px',
            boxShadow: '0 0 0 1px rgba(255,201,58,0.15), 0 12px 40px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 1.5, fontWeight: 700 }}>🔒 MEMBERS ONLY</div>
            <div className="display" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{pitchFor.title}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              {pitchFor.isMonitor
                ? 'A members course on building a separate monitor mix for every performer.'
                : pitchFor.big16
                ? 'Mix a full 16-channel board with every input up.'
                : pitchFor.isDigital
                ? 'Build the confidence to walk up to a digital console and mix the show.'
                : pitchFor.isLibrary
                ? 'A growing library of scenarios to troubleshoot, each on a different board.'
                : pitchFor.isFeedbackMode
                ? 'That is your free ear training. Members get unlimited rounds, guided and by ear, plus the full live-sound course.'
                : (pitchFor.isPractice && freePractice >= FREE_PRACTICE_LIMIT)
                ? 'That is your ' + FREE_PRACTICE_LIMIT + ' free tries. Members practice with no limit.'
                : 'Endless troubleshooting reps: a new fault each time, more at once as you turn it up.'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.55 }}>
              {pitchFor.title} is part of the Audio University membership.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <a href={joinUrl('pitch-overlay')} onClick={() => track('member_cta_click', { src: 'pitch-overlay' })} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{
                padding: '8px 16px', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8,
                background: 'linear-gradient(180deg, var(--accent), #c79a1f)', color: '#0a0a0c',
                border: '1px solid #c79a1f', borderRadius: 4, cursor: 'pointer', textDecoration: 'none',
              }}>JOIN AUDIO UNIVERSITY →</a>
              <button onClick={() => setPitchFor(null)} className="mono ui-no-select" style={{
                padding: '7px 14px', fontSize: 10, fontWeight: 800, letterSpacing: 0.8,
                background: '#1a1a1d', color: 'var(--ink-2)', border: '1px solid #38383e',
                borderRadius: 4, cursor: 'pointer',
              }}>BACK TO THE LESSONS</button>
            </div>
            <a href={MEMBER_URL} onClick={openFullVersion} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{
              fontSize: 10.5, color: 'var(--ink-3)', textDecoration: 'underline', textUnderlineOffset: 3, marginTop: 2,
            }}>Already a member? Open the full version →</a>
          </div>
        </div>
      )}

      {/* Scale-to-fit viewport. The scroll container is now the measurement
          box; inside it an absolutely-positioned flex layer centers the fixed
          DESIGN_W canvas and a uniform transform:scale zooms it to fit. Because
          the board always lays out at DESIGN_W, the stage cards and console
          never overlap regardless of window size; we only ever change the zoom.
          overflow:hidden because scaling guarantees fit (no stray scrollbars). */}
      <div ref={fitViewportRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: (!zoom && userZoom > 1.001) ? 'auto' : 'hidden' }}>
       <window.DefTermContext.Provider value={defHover}>
       <window.FlowTraceContext.Provider value={flowSpec}>
        <window.FitScaleContext.Provider value={appliedScale}>
          <div style={(!zoom && userZoom > 1.001)
            ? { width: designW * appliedScale, height: designH * appliedScale, minWidth: '100%', minHeight: '100%' }
            : { position: 'absolute', inset: 0, display: 'flex', alignItems: zoom ? 'flex-start' : 'center', justifyContent: zoom ? 'flex-start' : 'center', overflow: 'hidden' }}>
            {/* No CSS transition on this transform: the cable overlay measures
                element positions and divides by the scale to draw the cables, so
                an animating scale would be sampled mid-flight and every cable
                would land in the wrong place. The zoom snaps instead. */}
            <div ref={designRef} style={{ width: designW, flexShrink: 0,
                 transform: zoom ? `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})` : `scale(${appliedScale})`,
                 transformOrigin: (zoom || (!zoom && userZoom > 1.001)) ? '0 0' : 'center center' }}>
              <window.Chain
                state={state} setState={setState} audio={audio} fitScale={appliedScale} wedgeMargins={fbMargins} onOpenPlacement={setPlacementFor}
                onZoomTo={onZoomTo} onZoomReset={onZoomReset} zoomActive={!!zoom}
                surface={(level.isWalkthrough || level.isLesson) ? 'analog' : surface} onSetSurface={setSurfacePref} canDigital={canDigital}
                surfaceLocked={level.isWalkthrough || level.isLesson} stageHidden={effStageHidden} stage16Open={stage16Open} briefBelow={briefBelow}
                sidebarContent={
                  <StableSlot levelKey={levelIdx}>
                  {solved
                    ? <SolvedCard level={level} onNext={next} hasNext={levelIdx + 1 < SCENARIOS.length && !isLocked(SCENARIOS[levelIdx + 1])}
                        courseDone={(() => {
                          // Solving the LAST lesson of a member course is a course
                          // pass, and the debrief says so instead of quietly
                          // rolling into the next course's first lesson.
                          const names = { PATCHING: 'Patching', POWER: 'Power', INPUT: 'Input Setup', MONITOR: 'Mixing Monitors', SYSTEM: 'System Level', BIG16: '16-Channel Mode', CHECK: 'Soundcheck', FBK: 'Managing Feedback' };
                          const b = bandOf(level);
                          if (!names[b]) return null;
                          const nxt = SCENARIOS[levelIdx + 1];
                          return (nxt && bandOf(nxt) === b) ? null : names[b];
                        })()}
                        feedbackLabel={!level.isFeedbackMode ? null
                          : TIER === 'member' ? 'NEXT ROUND →'
                          : etExhausted ? 'JOIN TO KEEP TRAINING →'
                          : 'NEXT ROUND →'}
                        feedbackCaption={(!level.isFeedbackMode || TIER === 'member') ? null
                          : etExhausted ? 'FREE ROUNDS USED'
                          : ('GUIDED · ' + etGuided + ' / ' + FREE_ET_GUIDED)}
                        feedbackGuidedDone={level.isFeedbackMode && TIER !== 'member' && etGuided >= FREE_ET_GUIDED && etByEar === 0}
                        onPracticeAgain={level.isChallenge ? practiceAgain : null}
                        onGoFeedback={(level.isPractice && TIER !== 'member') ? goFeedback : null}
                        onGoEssentials={(level.isCustom && TIER !== 'member') ? () => { loadLevel(WALKTHROUGH_INDEX, undefined, true); } : null}
                        practiceFreeLeft={(level.isPractice && TIER !== 'member') ? freeRepsLeft : null}
                        onCopyRepLink={level.isPractice ? copyRepLink : null} repCopied={repCopied}
                        onOpenCompletion={level.id === SH_FINALE_ID ? openCompletion : null}
                        rank={rank} rankClean={rankClean} rankUp={rankUp} coverage={coverage} streak={streak}
                        liveShow={TIER === 'member' && liveShow} dropouts={dropouts}
                        debrief={(level.isChallenge && !level.isCustom && !level.isLibrary) ? {
                          moves: movesRef.current,
                          par: level.isPractice ? (practiceInfoRef.current ? practiceInfoRef.current.par : null) : level.par,
                          hints: hintsUsedRef.current,
                          faults: level.isPractice ? (practiceInfoRef.current && practiceInfoRef.current.faults ? practiceInfoRef.current.faults.length : practiceFaults) : null,
                          faultKeys: (level.isPractice && practiceInfoRef.current && Array.isArray(practiceInfoRef.current.faults)) ? practiceInfoRef.current.faults : null,
                          rep: level.isPractice ? reps : null,
                          zeroFault: !!(level.isPractice && practiceInfoRef.current && practiceInfoRef.current.zeroFault),
                          goalLabel: (level.isPractice && practiceInfoRef.current && practiceInfoRef.current.goalKey) ? practiceInfoRef.current.goalLabel : null,
                          falseSignoffs: falseSignoffRef.current,
                        } : null}
                        coaching={(!level.isStartHere && window.detectGainStagingMistakes)
                          /* Coaching reads the SETTLED baseline, not the live envelope: on
                             per-frame `audio` a loud syllable pushed a level over a coaching
                             threshold and the quiet after dipped back under, so the note
                             flickered with the music. audioBaseline is fixed for a given
                             knob setting (the same signal the guide steps and objectives
                             read), so a note appears and leaves only when a control moves. */
                          ? window.detectGainStagingMistakes(state, audioBaseline, level) : []}/>
                    : level.isWalkthrough
                    ? <WalkthroughPanel step={walkStep} steps={walkSteps} total={walkSteps.length} state={state} active={walkPhase === 'steps'} onNext={walkNext} onSkip={walkSkip} lastLesson={MIXER_INDEXES.length > 0 && MIXER_INDEXES[MIXER_INDEXES.length - 1] === levelIdx}/>
                    : guideSteps
                    ? <LessonGuide level={level} steps={guideSteps} ctx={hintCtx} activeIndex={guideActiveIndex} onReset={restart} phantomPop={state.phantomPop}/>
                    : <BriefCard level={level} conditions={effConditions} audio={audioBaseline} phantomPop={state.phantomPop} onReset={restart}
                        liveShow={TIER === 'member' && liveShow} dropouts={dropouts}
                        pendingHints={pendingHints} hintCount={hintCount} onRevealHint={() => { hintsUsedRef.current += 1; setHintCount(c => c + 1); }}
                        pflClear={state.channels.every(c => !c.solo)} pflChecked={pflCheckedRef.current} clips={clipsStable} paBalanceIssue={paBalanceIssue} feedback={feedback}
                        verifyStatus={verifyStatus} gainStatus={gainStatus} pflEachStatus={pflEachStatus} zeroStatus={zeroStatus} patchStatus={patchStatus}
                        powerStatus={powerStatus}
                        onSignOff={null} signoffMsg={null}
                        onCopyRepLink={level.isPractice ? copyRepLink : null} repCopied={repCopied} firstFix={firstFix}/>}
                  </StableSlot>
                }
              />
            </div>
          </div>
        </window.FitScaleContext.Provider>
       </window.FlowTraceContext.Provider>
       </window.DefTermContext.Provider>
        {/* Zoom-out control — sits OUTSIDE the scaled canvas so it stays pinned
            at a fixed size while the board underneath is magnified. */}
        {zoom && (
          <button onClick={onZoomReset} className="mono ui-no-select" title="Zoom back out (Esc)"
            style={{ position: 'absolute', top: 10, right: 12, zIndex: 30,
              padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 1,
              color: '#0a0a0c', background: 'var(--accent)', border: 'none', borderRadius: 5,
              boxShadow: '0 2px 10px rgba(0,0,0,0.55)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, lineHeight: 1 }}>⤢</span> FIT
          </button>
        )}
      </div>

      {/* Audience SPL bar lives in its own row at the bottom of the app, OUTSIDE
          the scroll container so it stays visible regardless of viewport height
          or where the user scrolled the cable graph. This is the engineer's
          "what does the room hear" reference — it deserves a permanent slot. */}
      <div style={{
        flexShrink: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28,
        padding: '8px 16px',
        background: 'linear-gradient(180deg, rgba(14,14,16,0.6) 0%, rgba(8,8,10,0.85) 100%)',
        borderTop: '1px solid #2a2a2e',
        zIndex: 4,
      }}>
        {/* "Where you're listening from" indicator. The simulator can only
            play through the user's device speakers, but a real engineer
            constantly switches monitoring between the PA, each wedge, and
            their headphones (PFL). This bar makes that switch explicit so
            the user always knows which signal their ears are on. PFL takes
            precedence over the inspect destination (matches the audio
            engine's behaviour). Clicking a position is the same as clicking
            the corresponding speaker or wedge — auto-routes the device-
            speaker audio to that bus. */}
        {(() => {
          const mixerOn = state.mixer ? state.mixer.on !== false : true;
          const anyPfl = mixerOn && state.channels.some(c => c.solo);
          const listening = anyPfl ? 'pfl' : state.inspect;
          const slots = [
            { id: 'pa',     label: 'MAINS' },
            { id: 'wedge',  label: 'WEDGE 1' },
            { id: 'wedge2', label: 'WEDGE 2' },
            // W3/W4 only on the 16-ch board.
            ...(state.big16 ? [{ id: 'wedge3', label: 'WEDGE 3' }, { id: 'wedge4', label: 'WEDGE 4' }] : []),
            { id: 'pfl',    label: 'HEADPHONES (PFL)' },
          ];
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 1.6, fontWeight: 700 }}>
                YOU ARE LISTENING TO:
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {slots.map(s => {
                  const active = listening === s.id;
                  // PFL slot is only active when a channel is soloed, can't
                  // be clicked directly. Other slots route through inspect.
                  const disabled = s.id === 'pfl' ? !anyPfl : false;
                  return (
                    <button key={s.id}
                      disabled={disabled}
                      data-walk={'listen-' + s.id}
                      onClick={() => {
                        if (s.id === 'pfl') return;
                        setState(prev => ({ ...prev, inspect: s.id }));
                      }}
                      className="mono"
                      style={{
                        padding: '4px 9px', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.8,
                        borderRadius: 3, cursor: disabled ? 'default' : 'pointer',
                        border: '1px solid ' + (active ? 'var(--green)' : '#2a2a2e'),
                        background: active ? 'rgba(74,222,128,0.18)' : 'rgba(20,20,24,0.6)',
                        color: active ? 'var(--green)' : (disabled ? 'var(--ink-3)' : 'var(--ink-2)'),
                        boxShadow: active ? '0 0 6px rgba(74,222,128,0.35)' : 'none',
                        opacity: disabled ? 0.5 : 1,
                        textTransform: 'uppercase',
                      }}>{s.label}</button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <window.AudienceSplMeter paL={audio.outputs.pa_l} paR={audio.outputs.pa_r} target={(() => {
          // A level that caps the room level (a dest:'pa' condition with a max
          // AND a real floor) is teaching "set the room level" — surface that
          // band on the loudness meter. min > 0 matters: a zero-band silence
          // condition (e.g. "the test signal is zeroed at the end") is a win
          // gate, not a room-level target, and must not tell the student to
          // lower the system all lesson.
          const rc = (level.conditions || []).find(c => c.dest === 'pa' && c.max != null && c.min > 0);
          if (!rc) return null;
          return { lo: dbSplFromPa(rc.min != null ? rc.min : 0.0005), hi: dbSplFromPa(rc.max) };
        })()}/>
      </div>

      {/* Phantom-power POP feedback overlay. A sharp red flash that fades
          out over ~900ms — the visual equivalent of the speaker pop the user
          just sent into the rig. Pointer-events none so it never gets in the
          way of clicking the Reset button underneath. The persistent
          "you popped — reset to try again" message lives on the brief card;
          this overlay is the immediate "ow" beat. */}
      {popFlash && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 100,
          background: 'radial-gradient(ellipse at center, rgba(255,70,48,0.42) 0%, rgba(255,70,48,0.18) 35%, rgba(255,70,48,0) 70%)',
          animation: 'phantomPopFlash 0.9s ease-out forwards',
        }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            color: '#fff', background: 'rgba(160,30,20,0.92)',
            padding: '14px 22px', borderRadius: 8,
            border: '1.5px solid #ff4630', boxShadow: '0 0 32px rgba(255,70,48,0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            animation: 'phantomPopText 0.9s ease-out forwards',
          }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>POP!</div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.2, opacity: 0.92, textTransform: 'uppercase' }}>
              {(() => {
                const cause = state.phantomPop && state.phantomPop.cause;
                return cause === 'plug' ? 'cable plugged into a live channel'
                  : cause === 'patch_live' ? 'patch changed on a live channel'
                  : cause === 'speaker_patch' ? 'speaker line moved while live'
                  : cause === 'amp_loud' ? ((state.topology && state.topology.paRig) === 'amp+passive' ? 'amp switched on with the master up' : 'speaker switched on with the master up')
                  : cause === 'mixer_pop' ? 'console switched on into live speakers'
                  : cause === 'mixer_off_pop' ? 'console switched off into live speakers'
                  : cause === 'phantom_cans' ? '+48V popped your headphones in PFL'
                  : '+48V engaged with the channel live';
              })()}
            </div>
          </div>
        </div>
      )}
      {survivedFlash && (
        <div style={{
          position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)',
          zIndex: 120, pointerEvents: 'none',
          background: 'rgba(20,60,30,0.92)', color: '#4ade80',
          border: '1.5px solid #4ade80', boxShadow: '0 0 24px rgba(74,222,128,0.45)',
          padding: '10px 18px', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'phantomPopText 2.4s ease-out forwards',
        }}>
          <span className="display" style={{ fontSize: 16, fontWeight: 800 }}>SHOW SURVIVED</span>
          <span className="mono" style={{ fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.9 }}>first win — milestone logged</span>
        </div>
      )}
      {showDayResult && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 22, maxWidth: 420, width: '90%' }}>
            <div className="display" style={{ fontSize: 20, fontWeight: 800, color: showDayResult.outcome === 'survived' ? 'var(--green)' : 'var(--amber)', marginBottom: 8 }}>{showDayResult.outcome === 'survived' ? 'SHOW SURVIVED' : 'SHOW SURVIVED (DEGRADED)'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 12 }}>Outcome: {showDayResult.outcome}. Post-mortem: the show held, but clipping/distortion was present during the run.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowDayResult(null)} style={{ flex: 1, padding: '8px 12px', background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 6, cursor: 'pointer' }}>Close</button>
              <button onClick={() => { const t = 'Show Day ' + showDayResult.date + '\nOutcome: ' + showDayResult.outcome + '\nLevel: ' + (level && level.title) + '\n'; const b = new Blob([t], { type: 'text/plain' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'show-day-postmortem.txt'; a.click(); URL.revokeObjectURL(u); }} style={{ flex: 1, padding: '8px 12px', background: 'var(--accent)', border: 'none', color: '#0a0a0c', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Export post-mortem</button>
            </div>
          </div>
        </div>
      )}
      {byoOpen && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 22, maxWidth: 460, width: '90%' }}>
            <div className="display" style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Bring your own problem</div>
            <textarea value={byoText} onChange={(e) => setByoText(e.target.value)} placeholder="Describe the symptom, the rig, what you tried..." style={{ width: '100%', height: 90, background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 6, padding: 8, fontSize: 13, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setByoOpen(false)} style={{ flex: 1, padding: '8px 12px', background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 6, cursor: 'pointer' }}>Close</button>
              <button onClick={() => { const words = byoText.toLowerCase().split(/\s+/); const idx = SCENARIOS.findIndex((s) => words.some((w) => (s.title || '').toLowerCase().includes(w))); const pick = idx >= 0 ? idx : Math.floor(Math.random() * SCENARIOS.length); setByoMatch(SCENARIOS[pick] && SCENARIOS[pick].title); loadLevel(pick); try { track('byo_problem', { matched: SCENARIOS[pick] && SCENARIOS[pick].id }); } catch (e) {} setByoOpen(false); }} style={{ flex: 1, padding: '8px 12px', background: 'var(--accent)', border: 'none', color: '#0a0a0c', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>Generate scenario</button>
            </div>
            {byoMatch && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>Matched: {byoMatch}</div>}
          </div>
        </div>
      )}

    </div>
   </window.DefHoverContext.Provider>
  );
}

// Mode picker: a two-pane modal that replaced the long scrolling level dropdown
// (Kyle, 2026-06-16). Left rail = the three modes (Learn / Practice / Free Play);
// right pane = the detail for the highlighted one, so the top level stays three
// simple choices and never grows. Practice holds its own secondary selection
// (Troubleshooting / Feedback / Library) instead of cramming everything into one
// list. Opens onto whatever mode the current level belongs to. The digital
// console toggle is NOT here (it lives on the console itself).
function ModePicker({ onClose, level, levelIdx, completed, practicePanel, feedbackByEar, onSetFeedbackByEar, feedbackFreeLabel, feedbackExhausted, onPick, practiceFreeLeft, onOpenCatalog }) {
  // Mounted fresh each time the picker opens (rendered behind `{picker && ...}`),
  // so it always lands on whatever mode the current level belongs to.
  // Monitor World now lives INSIDE the Learn pane as a third course (alongside
  // Mixer Tutorial and Run the Show), so its lessons land on the 'learn' mode.
  // Mixer Tutorial lessons (isWalkthrough) sit in Learn. Free visitors open the
  // menu on Learn too (where their free Mixer Tutorial lives) rather than on the
  // Free Play board behind it; members keep Free Play as Free Play.
  const curMode = level.isWalkthrough ? 'learn'
    : level.isSandbox ? (TIER !== 'member' ? 'learn' : 'play')
    : level.isFeedbackMode ? 'feedback'
    : (level.isPractice || level.isLibrary) ? 'practice'
    : 'learn';
  const [mode, setMode] = uS(curMode);
  // Which Learn course is expanded. Defaults to the one holding the current
  // level (a returning member lands on their open course); otherwise every
  // course starts collapsed so the Learn tab opens as a clean list of titles.
  // Free visitors land with Mixer Tutorial expanded (their starting course);
  // members get a clean list unless they're mid-course.
  const initialOpenCourse = level
    ? (level.isWalkthrough ? 'mixer' : level.isMonitor ? 'monitor' : level.isFeedbackCourse ? 'feedback-course' : level.isPatching ? 'patching' : level.isBigBoard ? 'bigboard' : level.isSoundcheck ? 'soundcheck' : (bandOf(level) === 'LEARN' ? 'show' : (TIER !== 'member' ? 'mixer' : null)))
    : (TIER !== 'member' ? 'mixer' : null);
  const [openCourse, setOpenCourse] = uS(initialOpenCourse);
  // When the picker is open on load, the resume effect may swap the level in
  // AFTER this mounted (so curMode was computed from the initial lesson). Follow
  // the level into its mode so the menu lands where the user left off. Level
  // changes only happen via resume or onPick (which closes the picker), so this
  // never fights a manual mode switch.
  uE(() => { setMode(curMode); }, [levelIdx]);
  const isMember = TIER === 'member';
  const lessons = []; const libraries = []; const monitors = []; const patching = []; const power = []; const inputSetup = []; const startHere = []; const systemLevel = []; const theGig = []; const bigBoard = []; const soundcheck = []; const feedbackCourse = [];
  SCENARIOS.forEach((s, i) => {
    if (s.isStartHere) { startHere.push({ s, i }); return; }
    const b = bandOf(s);
    if (b === 'LEARN') lessons.push({ s, i }); else if (b === 'LIBRARY') libraries.push({ s, i }); else if (b === 'MONITOR') monitors.push({ s, i }); else if (b === 'PATCHING') patching.push({ s, i }); else if (b === 'POWER') power.push({ s, i }); else if (b === 'INPUT') inputSetup.push({ s, i }); else if (b === 'SYSTEM') systemLevel.push({ s, i }); else if (b === 'BIG16') bigBoard.push({ s, i }); else if (b === 'CHECK') soundcheck.push({ s, i }); else if (b === 'FBK') feedbackCourse.push({ s, i }); else if (b === 'GIG') theGig.push({ s, i });
  });
  // Live Sound 101 companion track: the SAME exercises, re-ordered to follow the
  // course lesson by lesson, so a student who just watched a video can find the
  // matching hands-on exercise by its lesson number. Resolved by lesson id, so it
  // reuses existing content instead of duplicating it, and an id that isn't in
  // SCENARIOS is simply skipped — that is how exercises whose mechanic isn't
  // built yet (hum, routing, mic placement) stay out of the menu until they are.
  // `head` marks the first row of each course lesson so the list can group.
  const ls101 = [];
  (window.LS101_TRACK || []).forEach((t) => {
    const i = SCENARIOS.findIndex((s) => String(s.id) === String(t.id));
    if (i < 0) return;
    const head = ls101.length === 0 || ls101[ls101.length - 1].code !== t.code;
    ls101.push({ s: SCENARIOS[i], i, code: t.code, lesson: t.lesson, head });
  });
  const practiceIdx = SCENARIOS.findIndex((s) => s.isPractice);
  const feedbackIdx = SCENARIOS.findIndex((s) => s.isFeedbackMode);
  const sandboxIdx = SCENARIOS.findIndex((s) => s.isSandbox);
  const go = (i, code) => { if (i >= 0) { onPick(i, code); onClose(); } };
  const startBtn = (label, onClick) => (
    <button onClick={onClick} className="mono ui-no-select" style={{
      width: '100%', padding: '9px 12px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6,
      background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
      border: '1px solid #2c9d52', borderRadius: 5, cursor: 'pointer',
    }}>{label}</button>
  );
  const MODES = [
    { key: 'learn', icon: '≡', label: 'LEARN', sub: '', accent: 'var(--accent)' },
    { key: 'practice', icon: '∞', label: 'PRACTICE', sub: '', accent: 'var(--green)' },
    { key: 'feedback', icon: '∿', label: 'EAR TRAINING', sub: '', accent: 'var(--aux)' },
    { key: 'play', icon: '▶', label: 'FREE PLAY', sub: '', accent: 'var(--cool)' },
  ];
  // A course row in the Learn pane. `num` is the lesson's position WITHIN its
  // course (01, 02 ...); `free` unlocks it for the free tier (Mixer Tutorial).
  const courseRow = (row, num, free) => {
    const { s, i } = row;
    const locked = !isMember && !free;
    return (
      <div key={s.id} onClick={() => go(i, row.code)} className="ui-no-select"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 5, cursor: 'pointer', background: i === levelIdx ? '#2a2a2e' : 'transparent' }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#23232a'}
        onMouseLeave={(e) => e.currentTarget.style.background = i === levelIdx ? '#2a2a2e' : 'transparent'}>
        <div className="mono" style={{ fontSize: 9, width: 20, color: completed[s.id] ? 'var(--green)' : 'var(--ink-3)' }}>{locked ? '🔒' : (completed[s.id] ? '✓' : String(num).padStart(2, '0'))}</div>
        <div style={{ flex: 1, fontSize: 12, color: locked ? 'var(--ink-2)' : 'var(--ink)' }}>{s.title}</div>
      </div>
    );
  };
  // The Learn tab's courses, each a collapsible card. Mixer Tutorial is free;
  // the other two are gated, and a free viewer sees a lock instead of an
  // expander on them.
  const COURSES = [];
  // The companion track goes FIRST: for a member working through Live Sound 101
  // it is the spine, and the topical courses below are depth on one skill.
  if (ls101.length > 0) COURSES.push({ key: 'ls101', label: 'LIVE SOUND 101', color: '#7ee787', tag: isMember ? 'COURSE' : 'MEMBERS', free: false, grouped: true, blurb: 'The hands-on half of the Live Sound 101 course. Each group below matches a lesson in the course, so when a video sends you here, find its lesson number and work through the exercises under it.', rows: ls101 });
  if (startHere.length) COURSES.push({ key: 'starthere', label: 'START HERE', color: 'var(--green)', tag: 'FREE', free: true, blurb: 'Start here to learn the essential skills, one step at a time.', rows: startHere });
  if (patching.length > 0) COURSES.push({ key: 'patching', label: 'PATCHING', color: 'var(--cool)', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Read the input list, patch the system, and find the fault when a cable is wrong.', rows: patching });
  if (power.length > 0) COURSES.push({ key: 'power', label: 'POWER', color: 'var(--amber)', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Hear the pop that bad power order causes, then learn the correct order up and down.', rows: power });
  if (inputSetup.length > 0) COURSES.push({ key: 'inputsetup', label: 'INPUT SETUP', color: '#4dd0c4', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Bring any input up the right way: PFL first, gain by the meter, power what needs it, and fix the channels that were set by ear.', rows: inputSetup });
  if (systemLevel.length > 0) COURSES.push({ key: 'systemlevel', label: 'SYSTEM LEVEL', color: '#e8944a', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Set how loud the system should be: reference track in, console at unity, and the audience level set at the speakers.', rows: systemLevel });
  if (bigBoard.length > 0) COURSES.push({ key: 'bigboard', label: '16-CHANNEL MODE', color: '#8ab4ff', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Work the big board: the mixer page, the stage page, sixteen channels on the Input List, and four wedges.', rows: bigBoard });
  if (soundcheck.length > 0) COURSES.push({ key: 'soundcheck', label: 'SOUNDCHECK', color: '#d98cff', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Run a full soundcheck on a 16-channel band: line check, gain on every input, the main mix, then a monitor mix for each musician.', rows: soundcheck });
  if (theGig.length > 0) COURSES.push({ key: 'thegig', label: 'THE GIG', color: 'var(--hot)', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'The capstone. A 16-channel system, nothing connected and nothing switched on. Get the show running.', rows: theGig });
  COURSES.push({ key: 'show', label: 'RUN THE SHOW', color: 'var(--accent)', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Set up a system from nothing and run a full show. Ten lessons, in order.', rows: lessons });
  if (monitors.length > 0) COURSES.push({ key: 'monitor', label: 'MIXING MONITORS', color: 'var(--aux)', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Build each performer\'s monitor mix, keep it clean, and handle "more me" without making the wedge ring.', rows: monitors });
  if (feedbackCourse.length > 0) COURSES.push({ key: 'feedback-course', label: 'MANAGING FEEDBACK', color: '#ff8f6b', tag: isMember ? null : 'MEMBERS', free: false, blurb: 'Stop the squeal: run the monitors loud but with headroom, stand the mics where the wedge and the mains cannot get back into them, close the mics you are not using, and ring out the rest.', rows: feedbackCourse });
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 680, maxWidth: '94vw', background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)', border: '1px solid #38383e', borderRadius: 12, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid #2a2a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={window.AU_LOGO} alt="" style={{ height: 26, width: 26, display: 'block' }}/>
            <div className="display" style={{ fontSize: 16, fontWeight: 700 }}>What do you want to do?</div>
          </div>
          <button onClick={onClose} className="mono ui-no-select" style={{ ...navBtn, padding: '4px 10px' }}>✕</button>
        </div>
        {!isMember && (
          <a href={MEMBER_URL} onClick={openFullVersion} target="_blank" rel="noopener noreferrer" className="mono ui-no-select"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid #2a2a2e', background: '#16161a', color: 'var(--accent)', textDecoration: 'none', fontSize: 11, fontWeight: 700, letterSpacing: 0.4 }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1d1d22'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#16161a'}>
            <span>Already a member? Open the full version</span><span>→</span>
          </a>
        )}
        <div style={{ display: 'flex', minHeight: 330, maxHeight: 'calc(88vh - 54px)' }}>
          <div style={{ width: 210, borderRight: '1px solid #2a2a2e', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
            {MODES.map((m) => {
              const on = mode === m.key;
              return (
                <div key={m.key} onClick={() => setMode(m.key)} className="ui-no-select"
                  style={{ cursor: 'pointer', border: '1px solid ' + (on ? m.accent : '#2a2a2e'), borderRadius: 8, padding: '11px 12px', background: on ? 'rgba(255,255,255,0.03)' : '#16161a', display: 'flex', gap: 10, alignItems: 'center' }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = '#1d1d22'; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = '#16161a'; }}>
                  <div style={{ fontSize: 15, color: m.accent, width: 18, textAlign: 'center' }}>{m.icon}</div>
                  <div>
                    <div className="mono" style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, color: on ? 'var(--ink)' : 'var(--ink-2)' }}>{m.label}</div>
                    {m.sub && <div style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, lineHeight: 1.3 }}>{m.sub}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ flex: 1, padding: '16px 18px', overflowY: 'auto', textAlign: 'left' }}>
            {mode === 'learn' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {COURSES.map((co) => {
                  const lockedCourse = !isMember && !co.free;
                  const isOpen = openCourse === co.key && !lockedCourse;
                  const doneCount = co.rows.filter((r) => completed[r.s.id]).length;
                  return (
                    <div key={co.key} style={{ border: '1px solid ' + (isOpen ? '#38383e' : '#2a2a2e'), borderRadius: 8, overflow: 'hidden', background: '#16161a' }}>
                      <div onClick={() => { if (!lockedCourse) setOpenCourse(isOpen ? null : co.key); }} className="ui-no-select"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: lockedCourse ? 'default' : 'pointer' }}
                        onMouseEnter={(e) => { if (!lockedCourse && !isOpen) e.currentTarget.style.background = '#1d1d22'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                        <div className="mono" style={{ fontSize: 10.5, letterSpacing: 1.1, fontWeight: 700, color: co.color, flex: 1 }}>
                          {co.label}{co.tag ? <span style={{ color: 'var(--ink-3)' }}>{' · ' + co.tag}</span> : null}
                        </div>
                        {isMember && co.rows.length > 0 && !lockedCourse && (
                          <div className="mono" style={{ fontSize: 9, color: doneCount === co.rows.length ? 'var(--green)' : 'var(--ink-3)' }}>{doneCount}/{co.rows.length}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', width: 14, textAlign: 'center' }}>
                          {lockedCourse ? '🔒' : <span style={{ display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▸</span>}
                        </div>
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 10px 8px', borderTop: '1px solid #222226' }}>
                          {co.blurb && <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.45, margin: '8px 2px' }}>{co.blurb}</div>}
                          {co.rows.map((row, n) => (
                            (co.grouped && row.head) ? (
                              <React.Fragment key={'grp-' + row.s.id}>
                                <div className="mono" style={{ fontSize: 8.5, letterSpacing: 0.9, fontWeight: 700, color: 'var(--ink-3)', margin: n === 0 ? '8px 2px 4px' : '12px 2px 4px', paddingTop: n === 0 ? 0 : 8, borderTop: n === 0 ? 'none' : '1px solid #222226' }}>
                                  {(row.code === 'LAB' ? 'LAB ORIENTATION' : 'LESSON ' + row.code) + ' · ' + String(row.lesson || '').toUpperCase()}
                                </div>
                                {courseRow(row, n + 1, co.free)}
                              </React.Fragment>
                            ) : courseRow(row, n + 1, co.free)
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {mode === 'play' && (
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 1.4, fontWeight: 700, color: 'var(--cool)', marginBottom: 5 }}>FREE PLAY</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>A working system with nothing broken. Move any fader, turn any knob, and hear what changes. No goal, just a place to get used to the console.</div>
                {startBtn('START FREE PLAY →', () => go(sandboxIdx))}
              </div>
            )}
            {mode === 'practice' && (
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 1.4, fontWeight: 700, color: 'var(--green)', marginBottom: 10 }}>PRACTICE · TROUBLESHOOTING</div>
                {practicePanel
                  ? practicePanel
                  : (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 12 }}>Something in the system is broken. Find it and fix it. A new fault every time.</div>
                      {practiceFreeLeft != null && practiceFreeLeft > 0 && <div className="mono" style={{ fontSize: 9, color: 'var(--green)', fontWeight: 800, letterSpacing: 0.6, marginBottom: 10 }}>{practiceFreeLeft} FREE TRIES LEFT</div>}
                      {startBtn('START SESSION →', () => go(practiceIdx))}
                    </div>
                  )}
              </div>
            )}
            {mode === 'feedback' && (
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: 1.4, fontWeight: 700, color: 'var(--aux)', marginBottom: 10 }}>EAR TRAINING</div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 12 }}>Ring out a wedge: push the send until it starts to ring, find the frequency on the graphic EQ, and cut it by ear.</div>
                {isMember && onSetFeedbackByEar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                    <span className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 1, fontWeight: 700 }}>DIFFICULTY</span>
                    {[{ v: false, l: 'GUIDED' }, { v: true, l: 'BY EAR' }].map((opt) => (
                      <div key={opt.l} onClick={() => onSetFeedbackByEar(opt.v)} className="mono ui-no-select"
                        style={{ cursor: 'pointer', fontSize: 9, fontWeight: 700, padding: '5px 10px', borderRadius: 4, border: '1px solid ' + (feedbackByEar === opt.v ? '#2c5d9e' : '#38383e'), background: feedbackByEar === opt.v ? 'linear-gradient(180deg, var(--cool), #2c5d9e)' : '#1a1a1d', color: feedbackByEar === opt.v ? '#0a0a0c' : 'var(--ink-2)' }}>{opt.l}</div>
                    ))}
                  </div>
                )}
                {!isMember && feedbackFreeLabel && <div className="mono" style={{ fontSize: 9, color: 'var(--aux)', fontWeight: 800, letterSpacing: 0.6, marginBottom: 10 }}>{feedbackFreeLabel}</div>}
                {startBtn((isMember || !feedbackExhausted) ? 'START →' : '🔒 MEMBERS · SEE MORE', () => go(feedbackIdx))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ level, levelIdx, totalLevels, solved, audioOn, setAudioOn, onRestart, onPrev, onNext, onPick, trackPick, completed, eqOpen, onToggleEq, eqRinging, onOpenProgress, onOpenIoList, onOpenCatalog, nudgeSound, practiceFaults, onSetPracticeFaults, feedbackByEar, onSetFeedbackByEar, feedbackFreeLabel, feedbackExhausted, practiceFreeLeft, rank, rankClean, onTrainRank, liveShow, onSetLiveShow, onSelectDifficulty, onPracticeFaults, onPracticeLive, startOpen, streak, stageHidden, onToggleStage, stage16Open, consoleSize, onSetConsoleSize, sizeSelectable, big16, zoomPct, onZoomIn, onZoomOut, onZoomReset, onShowDay, onByo }) {
  // The mode menu opens on load (startOpen) so every visit begins with "what do
  // you want to do?" instead of dropping the user onto a board with no context.
  // startOpen is held false while the first-run tour is up, then flips true once
  // the tour is dismissed, so the tour shows alone first and the menu follows.
  const [picker, setPicker] = uS(false);
  uE(() => { if (startOpen) setPicker(true); }, [startOpen]);
  // Fullscreen toggle. Embedded in a Circle iframe the app is limited to the
  // column width, so this is the reliable "use my whole screen" path: it puts
  // the app's document into the browser's fullscreen (the iframe needs
  // allow="fullscreen", which the embed snippet sets). Combined with the
  // raised scale cap, the board fills a big monitor when fullscreen.
  const [isFs, setIsFs] = uS(typeof document !== 'undefined' && !!document.fullscreenElement);
  uE(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
      } else {
        const el = document.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el);
      }
    } catch (e) {}
  };
  // Members get the Practice panel: pick a difficulty (Easy / Medium / Hard =
  // 1 / 2 / 3 simultaneous faults) and start a session. No per-fault tracking.
  const DIFFS = [{ n: 1, l: 'EASY' }, { n: 2, l: 'MEDIUM' }, { n: 3, l: 'HARD' }];
  const practicePanel = onPracticeFaults ? (
    <div className="ui-no-select" style={{ padding: '2px 11px 10px', textAlign: 'left' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: 12 }}>
        Something in the system is broken. Find it and fix it. Each session is a new fault in a new place. Pick a difficulty and start.
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {DIFFS.map((d) => (
          <button key={d.n} onClick={(e) => { e.stopPropagation(); onSelectDifficulty && onSelectDifficulty(d.n); }} className="mono ui-no-select" style={{
            flex: '1 1 0', padding: '9px 6px', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, borderRadius: 5, cursor: 'pointer',
            background: practiceFaults === d.n ? 'linear-gradient(180deg, var(--green), #2c9d52)' : '#1a1a1d',
            color: practiceFaults === d.n ? '#0a0a0c' : 'var(--ink-2)',
            border: '1px solid ' + (practiceFaults === d.n ? '#2c9d52' : '#38383e'),
          }}>{d.l}</button>
        ))}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onPracticeFaults(practiceFaults); setPicker(false); }} className="mono ui-no-select" style={{
        width: '100%', padding: '10px 12px', fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6,
        background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
        border: '1px solid #2c9d52', borderRadius: 5, cursor: 'pointer',
      }}>START SESSION →</button>
      {onPracticeLive && (
        <button onClick={(e) => { e.stopPropagation(); onPracticeLive(!liveShow); setPicker(false); }} className="mono ui-no-select"
          title="Live Show: the audience is listening, so muting a channel or pulling the master is a dropout the audience hears. PFL into your headphones stays free." style={{
          marginTop: 8, width: '100%', padding: '7px 10px', fontSize: 9, fontWeight: 800, letterSpacing: 0.5, borderRadius: 5, cursor: 'pointer',
          background: liveShow ? 'linear-gradient(180deg, #d8473f, #a8322b)' : '#16161a',
          color: liveShow ? '#fff' : 'var(--ink-3)', border: '1px solid ' + (liveShow ? '#a8322b' : '#38383e'),
        }}>{liveShow ? '● LIVE SHOW ON · the audience is listening' : 'START WITH LIVE SHOW · the audience is listening'}</button>
      )}
    </div>
  ) : null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px', borderBottom: '1px solid #2a2a2e',
      background: 'linear-gradient(180deg,#16161a 0%, #101013 100%)', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={window.AU_LOGO} alt="Audio University"
             style={{ height: 36, width: 36, display: 'block' }}/>
        <div>
          <div className="display" style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1 }}>Troubleshooting Lab</div>
          <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Live Sound Simulator</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, justifyContent: 'center' }}>
        <button onClick={onPrev} disabled={levelIdx === 0} className="mono ui-no-select" style={navBtn}>←</button>
        <div onClick={() => setPicker(p => !p)} style={{ position: 'relative', cursor: 'pointer', minWidth: 320, textAlign: 'center' }} className="ui-no-select">
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 1.5 }}>
            {(trackPick && String(level.id) === String(trackPick.id))
              ? (trackPick.code === 'LAB' ? 'LIVE SOUND 101 · LAB ORIENTATION' : 'LIVE SOUND 101 · LESSON ' + trackPick.code)
              : level.isPractice
              ? (practiceFreeLeft != null ? 'PRACTICE MODE · FREE PREVIEW' : 'PRACTICE MODE · MEMBERS')
              : level.isFeedbackMode
              ? 'EAR TRAINING · MEMBERS'
              : level.isSandbox
              ? 'FREE PLAY · NO GOAL'
              : level.isMonitor
              ? 'MIXING MONITORS · MEMBERS'
              : level.isFeedbackCourse
              ? `MANAGING FEEDBACK · ${String(FEEDBACK_INDEXES.indexOf(levelIdx) + 1).padStart(2, '0')} / ${String(FEEDBACK_INDEXES.length).padStart(2, '0')}`
              : level.isPatching
              ? `PATCHING · ${String(PATCHING_INDEXES.indexOf(levelIdx) + 1).padStart(2, '0')} / ${String(PATCHING_INDEXES.length).padStart(2, '0')}`
              : level.isPower
              ? `POWER · ${String(POWER_INDEXES.indexOf(levelIdx) + 1).padStart(2, '0')} / ${String(POWER_INDEXES.length).padStart(2, '0')}`
              : level.isInputSetup
              ? `INPUT SETUP · ${String(INPUT_SETUP_INDEXES.indexOf(levelIdx) + 1).padStart(2, '0')} / ${String(INPUT_SETUP_INDEXES.length).padStart(2, '0')}`
              : level.isStartHere
              ? `START HERE · ${String(START_HERE_INDEXES.indexOf(levelIdx) + 1).padStart(2, '0')} / ${String(START_HERE_INDEXES.length).padStart(2, '0')}`
              : `LEVEL ${String(levelIdx + 1).padStart(2, '0')} / ${String(window.LEVELS.length).padStart(2, '0')}`}
          </div>
          <div className="display" style={{ fontSize: 16, fontWeight: 700, color: solved ? 'var(--green)' : 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {solved && <span style={{ fontSize: 12 }}>✓</span>}{level.title}
            <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>▾</span>
          </div>
          {picker && (
            <ModePicker
              onClose={() => setPicker(false)}
              level={level} levelIdx={levelIdx} completed={completed}
              practicePanel={practicePanel}
              feedbackByEar={feedbackByEar} onSetFeedbackByEar={onSetFeedbackByEar}
              feedbackFreeLabel={feedbackFreeLabel} feedbackExhausted={feedbackExhausted}
              onPick={onPick} practiceFreeLeft={practiceFreeLeft} onOpenCatalog={onOpenCatalog}/>
          )}
        </div>
        <button onClick={onNext} disabled={levelIdx + 1 >= totalLevels} className="mono ui-no-select" style={navBtn}>→</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Practice difficulty + Live Show moved into the "your practice" panel
            in the picker, to keep the top bar clean. */}
        {/* Ring-out difficulty — Feedback Mode only. Guided glows the ringing
            band; By Ear hides it so the engineer finds the frequency by ear. */}
        {level.isFeedbackMode && onSetFeedbackByEar && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
            <div className="mono" title="Guided glows the ringing band. By ear hides it: find the ringing frequency by listening." style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 1, fontWeight: 700 }}>DIFFICULTY</div>
            {[{ v: false, l: 'GUIDED' }, { v: true, l: 'BY EAR' }].map(opt => (
              <button key={opt.l} onClick={() => onSetFeedbackByEar(opt.v)} className="mono ui-no-select" style={{
                ...navBtn, padding: '6px 10px', fontWeight: 800,
                background: feedbackByEar === opt.v ? 'linear-gradient(180deg, var(--cool), #2c5d9e)' : '#1a1a1d',
                color: feedbackByEar === opt.v ? '#0a0a0c' : 'var(--ink-2)',
                borderColor: feedbackByEar === opt.v ? '#2c5d9e' : '#38383e',
              }}>{opt.l}</button>
            ))}
          </div>
        )}
        <button data-walk="sound" onClick={() => setAudioOn(!audioOn)} className="mono ui-no-select" style={{
          ...navBtn,
          background: audioOn ? 'linear-gradient(180deg, var(--green), #2c9d52)' : '#1a1a1d',
          color: audioOn ? '#0a0a0c' : 'var(--ink-2)',
          borderColor: audioOn ? '#2c9d52' : (nudgeSound ? 'var(--green)' : '#38383e'),
          fontWeight: 700, padding: '6px 12px',
          animation: nudgeSound ? 'soundNudge 1.6s ease-in-out infinite' : 'none',
        }}>{audioOn ? 'SOUND ON' : 'SOUND OFF'}</button>
        {onToggleEq && (
          <button onClick={onToggleEq} className="mono ui-no-select" title="Graphic EQ on the monitor sends" style={{
            ...navBtn, padding: '6px 12px',
            background: eqOpen ? 'linear-gradient(180deg, var(--accent), #c79a1f)' : (eqRinging ? 'rgba(255,70,48,0.18)' : '#1a1a1d'),
            color: eqOpen ? '#0a0a0c' : (eqRinging ? 'var(--hot)' : 'var(--ink-2)'),
            borderColor: eqOpen ? '#c79a1f' : (eqRinging ? 'var(--hot)' : '#38383e'),
            boxShadow: eqRinging && !eqOpen ? '0 0 8px rgba(255,70,48,0.4)' : 'none', fontWeight: 700,
            // Flash while it rings and the panel is still shut. It stops the moment
            // the panel opens, because by then the student has found it and a
            // blinking button behind an open panel is just noise.
            animation: eqRinging && !eqOpen ? 'eqRingFlash 1s ease-in-out infinite' : 'none',
          }} data-walk="monitor-eq">MONITOR EQ</button>
        )}
        {onOpenIoList && (
          <button data-walk="iolist" onClick={onOpenIoList} className="mono ui-no-select" title="The input list: what's plugged into each channel, and where the outputs go" style={{ ...navBtn, padding: '6px 12px' }}>INPUT LIST</button>
        )}
        {onToggleStage && (
          <button onClick={onToggleStage} data-walk="stage-toggle" className="mono ui-no-select" title={big16 ? (stage16Open ? 'Back to the mixer' : 'Open the stage: sub-snakes, inputs, and the signal path') : (stageHidden ? 'Show the stage: sources, cables, and speakers' : 'Hide the stage to give the console the whole screen')} style={{ ...navBtn, padding: '6px 12px' }}>{big16 ? (stage16Open ? 'MIXER' : 'STAGE') : (stageHidden ? 'SHOW STAGE' : 'HIDE STAGE')}</button>
        )}
        {sizeSelectable && onSetConsoleSize && (
          <div className="mono ui-no-select" title="Mixer size: 8 or 16 channels. 16 opens every input from the same performance." style={{ ...navBtn, padding: 0, display: 'inline-flex', alignItems: 'stretch', overflow: 'hidden' }}>
            {[8, 16].map((sz, ix) => {
              const on = (sz === 16) ? !!big16 : !big16;
              return (
                <button key={sz} onClick={() => onSetConsoleSize(sz)} className="mono ui-no-select"
                  title={on ? 'Current mixer size' : ('Switch to the ' + sz + '-channel mixer' + (sz === 16 ? ' (members)' : ''))}
                  style={{ border: 'none', borderLeft: ix ? '1px solid #38383e' : 'none', background: on ? 'var(--cool)' : 'transparent', color: on ? '#08080a' : 'var(--ink-2)', padding: '6px 8px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, cursor: 'pointer' }}>
                  {sz}
                </button>
              );
            })}
          </div>
        )}
        {onOpenProgress && (
          <button onClick={onOpenProgress} className="mono ui-no-select" title="Your training record and daily streak" style={{ ...navBtn, padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            TRAINING
            {streak > 0 && (
              <span title={streak + '-day streak'} style={{ fontSize: 9, fontWeight: 800, color: '#0a0a0c', background: 'var(--accent)', borderRadius: 8, padding: '1px 6px', letterSpacing: 0.3 }}>{streak}</span>
            )}
          </button>
        )}
        {onZoomIn && (
          <div className="mono ui-no-select" title="Zoom the whole board (Ctrl/Cmd + and -, Ctrl/Cmd 0 to reset). Scrolls when zoomed in." style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #38383e', borderRadius: 4, overflow: 'hidden' }}>
            <button onClick={onZoomOut} disabled={zoomPct <= 100} className="ui-no-select" style={{ ...navBtn, border: 'none', borderRadius: 0, padding: '5px 10px', fontSize: 15, lineHeight: 1, opacity: zoomPct <= 100 ? 0.4 : 1 }}>−</button>
            <button onClick={onZoomReset} className="ui-no-select" title="Reset zoom to fit" style={{ ...navBtn, border: 'none', borderRadius: 0, padding: '6px 4px', minWidth: 46, textAlign: 'center', color: zoomPct > 100 ? 'var(--ink)' : 'var(--ink-2)' }}>{zoomPct}%</button>
            <button onClick={onZoomIn} disabled={zoomPct >= 200} className="ui-no-select" style={{ ...navBtn, border: 'none', borderRadius: 0, padding: '5px 10px', fontSize: 15, lineHeight: 1, opacity: zoomPct >= 200 ? 0.4 : 1 }}>+</button>
          </div>
        )}
        <button onClick={toggleFullscreen} className="mono ui-no-select" title="Fill the screen" style={{ ...navBtn, padding: '6px 12px' }}>{isFs ? '⤢ EXIT' : '⤢ FULL SCREEN'}</button>
        <button onClick={onRestart} className="mono ui-no-select" style={{ ...navBtn, padding: '6px 14px' }}>↻ RESET</button>
      </div>
    </div>
  );
}

const navBtn = {
  background: '#1a1a1d', color: 'var(--ink-2)', border: '1px solid #38383e',
  borderRadius: 4, padding: '6px 10px', fontSize: 11, fontWeight: 700,
  letterSpacing: 0.5, cursor: 'pointer',
};

function BriefCard({ level, conditions, audio, phantomPop, onReset, pflClear, pflChecked, clips, paBalanceIssue, feedback, powerStatus, verifyStatus, gainStatus, pflEachStatus, zeroStatus, patchStatus, pendingHints, hintCount, onRevealHint, onSignOff, signoffMsg, onCopyRepLink, repCopied, liveShow, dropouts, firstFix }) {
  // Free Play has no objective and never solves, so it gets its own calm card
  // instead of the symptom/objective machinery below.
  if (level.isSandbox) {
    return (
      <div style={{
        background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
        border: '1px solid #38383e', borderRadius: 8, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)', maxHeight: 200, overflowY: 'auto',
      }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--cool)', letterSpacing: 1.2, fontWeight: 700 }}>▸ FREE PLAY · NO GOAL</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink)', lineHeight: 1.45 }}>{level.symptom}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onReset} className="mono ui-no-select" style={{
            padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
            background: '#1a1a1d', color: 'var(--ink-2)', border: '1px solid #38383e', borderRadius: 4, cursor: 'pointer',
          }}>↻ RESET THE BOARD</button>
        </div>
      </div>
    );
  }
  // Compute per-condition pass / level, and whether all conditions pass.
  const condStates = (conditions || []).map(c => {
    const cont = audio.contributions[c.source];
    let lvl = 0;
    if (c.dest === 'pa') lvl = Math.max(cont?.pa_l || 0, cont?.pa_r || 0);
    else lvl = cont?.[c.dest] || 0;
    let pass;
    if (c.max != null && c.min != null) pass = lvl >= c.min && lvl <= c.max;
    else if (c.max != null) pass = lvl <= c.max;
    else if (c.min != null) pass = lvl >= c.min;
    else pass = lvl >= 0.3;
    const destLabel = c.dest === 'pa' ? 'MAINS' : c.dest === 'pa_l' ? 'MAIN · L' : c.dest === 'pa_r' ? 'MAIN · R' : c.dest === 'wedge' ? 'WEDGE 1' : c.dest === 'wedge2' ? 'WEDGE 2' : c.dest === 'wedge3' ? 'WEDGE 3' : c.dest === 'wedge4' ? 'WEDGE 4' : c.dest.toUpperCase();
    const srcLabel = window.SOURCES[c.source]?.label || c.source;
    const targetTxt = c.max != null && c.min == null ? `≤ ${Math.round(c.max * 100)}%` :
                      c.min != null && c.max == null ? `≥ ${Math.round(c.min * 100)}%` :
                      c.min != null && c.max != null ? `${Math.round(c.min * 100)}–${Math.round(c.max * 100)}%` :
                      `≥ 30%`;
    const fillTarget = c.min != null ? c.min : c.max != null ? c.max : 0.3;
    const fill = Math.max(0, Math.min(1, lvl / Math.max(0.01, fillTarget * 1.0)));
    return { c, lvl, pass, destLabel, srcLabel, targetTxt, fill };
  });
  // Non-signal-flow extra requirements (e.g. PFL must be disengaged on the
  // PFL-monitoring level). Treated like a condition for display + win.
  const extras = [];
  if (level.requireNoPfl) {
    extras.push({ label: 'PFL disengaged on all channels', pass: pflClear, color: 'var(--amber)' });
  }
  if (level.requirePflCheck) {
    extras.push({ label: 'Checked the channel in PFL', pass: !!pflChecked, color: 'var(--amber)' });
  }
  if (level.requirePflEach && pflEachStatus) {
    for (const p of pflEachStatus) extras.push({ label: p.label, pass: !!p.pass, color: 'var(--amber)' });
  }
  if (level.requirePatch && patchStatus) {
    for (const p of patchStatus) extras.push({ label: p.label, pass: !!p.pass, color: 'var(--cool)' });
  }
  if (level.toneGate) {
    const tone = (audio.eqGain && audio.eqGain.wedge) || 1;
    extras.push({ label: 'Wedge tone intact (a few small cuts, no more)', pass: tone >= level.toneGate, color: 'var(--aux)' });
  }
  if (level.requirePowerOn && powerStatus) {
    extras.push({ label: 'Console powered on', pass: !!powerStatus.console, color: 'var(--cool)' });
    extras.push({ label: powerStatus.paLabel || 'Main speakers on', pass: !!powerStatus.paStage, color: 'var(--cool)' });
    extras.push({ label: 'Wedges on', pass: !!powerStatus.wedges, color: 'var(--cool)' });
  }
  if (level.requireZeroed && zeroStatus) {
    for (const z of zeroStatus) extras.push({ label: z.label, pass: !!z.pass, color: 'var(--amber)' });
  }
  if (level.requirePowerOff && powerStatus) {
    if (!level.requireZeroed) extras.push({ label: 'Master fader down', pass: !!powerStatus.masterDown, color: 'var(--cool)' });
    extras.push({ label: 'Wedges off', pass: !!powerStatus.wedgesOff, color: 'var(--cool)' });
    extras.push({ label: powerStatus.paOffLabel || 'Main speakers off', pass: !!powerStatus.paOff, color: 'var(--cool)' });
    extras.push({ label: 'Console off (last)', pass: !powerStatus.console, color: 'var(--cool)' });
  }
  if (level.verifyEach && verifyStatus) {
    for (const v of level.verifyEach) {
      extras.push({ label: v.label || (v.dest + ' plays'), pass: !!verifyStatus[v.dest], color: 'var(--cool)' });
    }
  }
  if (level.gainStructure && gainStatus) {
    if (gainStatus.hasInput) extras.push({ label: 'Input level healthy', pass: !!gainStatus.input, color: 'var(--cool)' });
    // Fader-at-unity objectives only for tasks that actually teach it. gainOnly
    // tasks leave the fader as a mix choice, so they are hidden there.
    if (!gainStatus.gainOnly) {
      if (gainStatus.hasRef) extras.push({ label: (gainStatus.refLabel || 'Channel') + ' up at unity', pass: !!gainStatus.fader, color: 'var(--cool)' });
      extras.push({ label: 'Master up at unity', pass: !!gainStatus.master, color: 'var(--cool)' });
    }
  }
  const allFlowPass = condStates.length === 0 || condStates.every(s => s.pass);
  const allExtrasPass = extras.every(e => e.pass);
  const allPass = (condStates.length + extras.length) > 0 && allFlowPass && allExtrasPass;

  // Reusable styling helpers for the four zones.
  const zoneStyle = (accent, bg) => ({
    flex: '1 1 0', minWidth: 0,
    background: bg,
    border: '1px solid ' + accent + '55',
    borderLeft: '3px solid ' + accent,
    borderRadius: 4, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
  });
  const zoneLabel = (color, text) => (
    <div className="mono" style={{ fontSize: 10, color, letterSpacing: 1.2, fontWeight: 700 }}>{text}</div>
  );

  // Live status chip — the brief card's at-a-glance state. The fault detail
  // itself now lives in the centered WarningModal; the pill stays so the state
  // (POPPED, DISTORTING, etc.) is still visible after the modal is dismissed.
  const statusPill = (() => {
    const clipping = clips && clips.length > 0;
    const audienceLive = ((audio?.outputs?.pa_l || 0) + (audio?.outputs?.pa_r || 0)) > 0.05;
    const clipPillText = audienceLive ? '⚠ DISTORTING' : '⚠ PEAKING';
    const balancing = !!paBalanceIssue;
    // Only a real wedge ring reads as RINGING. A mains howl (gain too hot) shows
    // its true colors as DISTORTING/PEAKING via the clip pill, pointing at the gain.
    const ringing = !!(feedback && feedback.wedgeRing);
    const popPillText = phantomPop && phantomPop.cause === 'amp_loud' ? '⚠ TOO LOUD' : '⚠ POPPED';
    const pillText = phantomPop ? popPillText
                  : ringing ? '⚠ RINGING'
                  : clipping ? clipPillText
                  : balancing ? '⚠ IMBALANCED'
                  : (allPass ? '✓ SOLVED' : 'IN PROGRESS');
    const isFault = phantomPop || ringing || clipping || balancing;
    const pillColor = isFault ? 'var(--hot)' : (allPass ? 'var(--green)' : 'var(--accent)');
    const pillBg = isFault ? 'rgba(255,70,48,0.18)' : (allPass ? 'rgba(74,222,128,0.14)' : 'rgba(255,201,58,0.10)');
    return (
      <div className="mono" style={{
        fontSize: 9, fontWeight: 700, letterSpacing: 1.2, lineHeight: 1,
        padding: '4px 8px', borderRadius: 12,
        background: pillBg, color: pillColor, border: '1px solid ' + pillColor,
      }}>{pillText}</div>
    );
  })();
  const workChip = (
    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 1.2, fontWeight: 700 }}>
      {level.isPractice ? 'PRACTICE' : level.isFeedbackMode ? 'EAR TRAINING' : level.isStartHere ? 'START HERE' : level.isPatching ? 'PATCHING' : level.isPower ? 'POWER' : level.isInputSetup ? 'INPUT SETUP' : level.isMonitor ? 'MIXING MONITORS' : level.isFeedbackCourse ? 'MANAGING FEEDBACK' : 'LEVEL · ' + String(level.id).padStart(2, '0')}
    </div>
  );

  return (
    <div style={{
      background: 'linear-gradient(180deg,#1c1c20 0%, #141418 100%)',
      border: '1px solid #38383e', borderRadius: 8, padding: '12px 14px',
      display: 'flex', flexDirection: 'row', gap: 12,
      boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      alignItems: 'stretch',
      // Cap the height so a long objective list or hint scrolls inside the
      // card instead of inflating the measured board height (designH) — which
      // would otherwise shrink the whole stage or clip the bottom off-screen.
      maxHeight: 200, overflowY: 'auto',
    }}>
      {/* SYMPTOM / TASK zone. Setup levels (level.task) aren't describing a
          problem, so they get a neutral TASK label instead of the red
          warning SYMPTOM treatment. */}
      <div key={'task-' + (level.id != null ? level.id : level.title)} style={{ ...zoneStyle(level.task ? 'var(--cool)' : 'var(--hot)', level.task ? 'rgba(106,169,255,0.10)' : 'rgba(255,70,48,0.14)'), '--attn': (level.task ? 'var(--cool)' : 'var(--hot)'), flex: '1.5 1 0', borderLeftWidth: 4, padding: '12px 14px', animation: 'briefAttention 1.5s ease-in-out 3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div className="mono" style={{ fontSize: 11.5, color: (level.task ? 'var(--cool)' : 'var(--hot)'), letterSpacing: 1.4, fontWeight: 800 }}>{level.task ? '▸ TASK' : '⚠ SYMPTOM'}</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {liveShow && level.isPractice && (
              <div className="mono" title="The audience is listening. Muting a channel or pulling the master is a dropout the audience hears. PFL into your headphones is free." style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: 1, padding: '3px 7px', borderRadius: 12, background: 'rgba(216,71,63,0.16)', color: '#ff6a5e', border: '1px solid #a8322b' }}>● LIVE · AUDIENCE IS LISTENING</div>
            )}
            {statusPill}
            {workChip}
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.5 }}>{level.symptom}</div>
        {firstFix && level.isPractice && (
          <div style={{ fontSize: 10, color: 'var(--green)', lineHeight: 1.45, marginTop: 1 }}>
            New here? Watch the channel meters: one just went dead. Find why it dropped out and bring it back. Stuck? Tap "Need a hint?" below.
          </div>
        )}
        {liveShow && level.isPractice && (
          <div className="mono" style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.4, color: dropouts > 0 ? 'var(--hot)' : 'var(--ink-3)' }}>
            {dropouts > 0
              ? '⚠ ' + dropouts + ' dropout' + (dropouts === 1 ? '' : 's') + ' the audience heard. PFL a channel to check it instead of muting it; leave the master alone.'
              : 'No dropouts yet. Find it with PFL and the meters, not by cutting the audience.'}
          </div>
        )}
      </div>

      {/* OBJECTIVE zone — progress bars for signal-flow conditions and any
          extra non-flow requirements (e.g. PFL disengaged). */}
      {(condStates.length + extras.length) > 0 && (
        <div style={zoneStyle(allPass ? 'var(--green)' : 'var(--cool)', 'rgba(255,255,255,0.025)')}>
          {zoneLabel(allPass ? 'var(--green)' : 'var(--cool)', '◎ OBJECTIVE')}
          {condStates.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontSize: 10.5, minWidth: 0 }}>
                <span style={{ color: s.pass ? 'var(--green)' : 'var(--ink-3)', fontWeight: 700, width: 9, flexShrink: 0 }}>
                  {s.pass ? '✓' : '○'}
                </span>
                <span style={{ flex: 1, color: s.pass ? 'var(--green)' : 'var(--ink-2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.srcLabel} → {s.destLabel}
                </span>
                <span className="mono" style={{ color: s.pass ? 'var(--green)' : (s.c.max != null && s.lvl > s.c.max ? 'var(--amber)' : 'var(--ink-2)'), fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {Math.round(s.lvl * 100)}%
                </span>
              </div>
              <div style={{ position: 'relative', height: 4, background: '#0a0a0c', borderRadius: 2, border: '1px solid #2a2a2e', overflow: 'hidden', marginLeft: 14 }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${s.fill * 100}%`,
                  background: s.pass ? 'var(--green)' : (s.c.max != null && s.lvl > s.c.max ? 'var(--amber)' : 'var(--cool)'),
                  boxShadow: s.pass ? '0 0 6px rgba(74,222,128,0.5)' : 'none',
                  transition: 'width 0.18s',
                }}/>
              </div>
              {/* Range conditions (a max with or without a min) get the target
                  spelled out on its own line so the row label never truncates,
                  and the failing DIRECTION is named so a corridor never reads
                  as a mystery (too loud vs not enough). */}
              {s.c.max != null && !s.pass && (
                <div className="mono" style={{ marginLeft: 14, fontSize: 9, fontWeight: 700, letterSpacing: 0.4, color: s.lvl > s.c.max ? 'var(--amber)' : 'var(--ink-3)' }}>
                  {s.lvl > s.c.max ? 'TOO LOUD · ' : (s.c.min != null && s.lvl < s.c.min ? 'NOT ENOUGH · ' : '')}KEEP {s.targetTxt}
                </div>
              )}
            </div>
          ))}
          {extras.map((e, i) => (
            <div key={'extra-' + i} style={{ display: 'flex', alignItems: 'baseline', gap: 4, fontSize: 10.5 }}>
              <span style={{ color: e.pass ? 'var(--green)' : e.color, fontWeight: 700, width: 9, flexShrink: 0 }}>
                {e.pass ? '✓' : '○'}
              </span>
              <span style={{ flex: 1, color: e.pass ? 'var(--green)' : 'var(--ink-2)', fontWeight: 600 }}>
                {e.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* HINT zone — adaptive and on request. Nothing shows until the engineer
          asks; each click reveals the next step they still need. Steps already
          done are filtered out upstream (pendingHints), so a hint never points
          at something already handled. */}
      {pendingHints && pendingHints.length > 0 && (
        <div style={zoneStyle('var(--amber)', hintCount > 0 ? 'rgba(255,181,71,0.06)' : 'rgba(255,181,71,0.04)')}>
          {zoneLabel('var(--amber)', 'HINT')}
          {hintCount === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Read the task and try it with what you know. Stuck? Reveal a hint one step at a time. It just gets noted in your debrief.
            </div>
          ) : (
            pendingHints.slice(0, hintCount).map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, color: 'var(--ink)', fontSize: 11.5, lineHeight: 1.4 }}>
                <span className="mono" style={{ color: 'var(--amber)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{t}</span>
              </div>
            ))
          )}
          {hintCount < pendingHints.length && (
            <button onClick={onRevealHint} className="mono ui-no-select" style={{
              alignSelf: 'flex-start',
              padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
              color: 'var(--amber)', background: 'rgba(255,181,71,0.08)', border: '1px solid var(--amber)',
              borderRadius: 4, cursor: 'pointer',
            }}>{hintCount === 0 ? 'NEED A HINT?' : 'SHOW ANOTHER HINT'}</button>
          )}
        </div>
      )}

      {/* SIGN-OFF + SHARE zone (Practice Mode). Sign-off is the "I believe this
          system is healthy" call — present on every fault-diagnosis rep so it
          never leaks which reps are clean (the only way to win a zero-fault
          rep). It's hidden on goal tasks (build a monitor mix etc.), where
          there's a clear objective instead. The share button is on every
          Practice rep. */}
      {(onSignOff || onCopyRepLink) && (
        <div style={zoneStyle('var(--green)', 'rgba(74,222,128,0.05)')}>
          {zoneLabel('var(--green)', onSignOff ? '✓ SIGN OFF' : '⎘ SHARE')}
          {onSignOff && (
            <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Checked the whole path and it's all healthy? Sign off. Not every call is a fault.
            </div>
          )}
          {onSignOff && signoffMsg && (
            <div style={{ fontSize: 10.5, color: 'var(--hot)', lineHeight: 1.4 }}>{signoffMsg}</div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {onSignOff && (
              <button onClick={onSignOff} className="mono ui-no-select" style={{
                padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
                color: 'var(--green)', background: 'rgba(74,222,128,0.08)', border: '1px solid var(--green)',
                borderRadius: 4, cursor: 'pointer',
              }}>SYSTEM IS HEALTHY</button>
            )}
            {onCopyRepLink && (
              <button onClick={onCopyRepLink} className="mono ui-no-select" title="Copy a link that loads this exact problem for anyone" style={{
                padding: '6px 12px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6,
                color: repCopied ? 'var(--green)' : 'var(--ink-3)', background: 'transparent', border: '1px solid #38383e',
                borderRadius: 4, cursor: 'pointer',
              }}>{repCopied ? '✓ COPIED' : '⎘ COPY LINK'}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SolvedCard({ level, onNext, hasNext, feedbackLabel, feedbackCaption, feedbackGuidedDone, coaching, debrief, onPracticeAgain, onGoFeedback, onGoEssentials, practiceFreeLeft, onCopyRepLink, repCopied, rank, rankClean, rankUp, liveShow, dropouts, coverage, streak, courseDone, onOpenCompletion }) {
  return (
    <div style={{
      background: 'linear-gradient(180deg,#0e2415 0%, #0e1a14 100%)',
      border: '1px solid var(--green)', borderRadius: 6, padding: '8px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: '0 0 0 1px rgba(74,222,128,0.2), 0 4px 14px rgba(0,0,0,0.5), 0 0 30px rgba(74,222,128,0.15)',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div className="mono" style={{ fontSize: 8.5, color: 'var(--green)', letterSpacing: 2, fontWeight: 700 }}>{(debrief && debrief.zeroFault) ? '✓ GOOD CALL · NOTHING BROKEN' : (debrief && debrief.goalLabel) ? '✓ DONE' : (level.isCustom || level.isLibrary) ? '✓ DONE' : level.task ? '✓ TASK COMPLETE' : '✓ MIX RESTORED'}</div>
        <div className="display" style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.1 }}>{level.title}</div>
      </div>
      {/* Challenges get a DEBRIEF instead of the answer key: how many moves
          the solve took against the systematic path, and whether a hint was
          used. The comparison is the coaching — no grades, no medals.
          Essentials keep showing the solution, because they're lessons. */}
      {debrief ? (
        debrief.goalLabel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="mono" style={{ fontSize: 8, color: 'var(--cool)', letterSpacing: 1.4, fontWeight: 700 }}>◎ DEBRIEF</div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              <b style={{ color: 'var(--ink)' }}>{debrief.goalLabel}</b>. Done.
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Hints: {debrief.hints > 0 ? <b style={{ color: 'var(--amber)' }}>{debrief.hints} used</b> : <b style={{ color: 'var(--green)' }}>none</b>}.
              {debrief.rep != null && <> That makes <b style={{ color: 'var(--green)' }}>{debrief.rep} round{debrief.rep === 1 ? '' : 's'}</b> finished.</>}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Building monitor mixes, setting gain, and checking speakers are all part of the job, not just finding faults.
            </div>
          </div>
        ) : debrief.zeroFault ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div className="mono" style={{ fontSize: 8, color: 'var(--cool)', letterSpacing: 1.4, fontWeight: 700 }}>◎ DEBRIEF</div>
            <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              Nothing was broken. You checked it and signed off
              {debrief.moves === 0
                ? <> without touching a thing. <b style={{ color: 'var(--green)' }}>Correct.</b></>
                : <> after <b style={{ color: 'var(--ink)' }}>{debrief.moves} move{debrief.moves === 1 ? '' : 's'}</b>. A healthy system doesn't need them, so the clean call is zero.</>}
            </div>
            {debrief.falseSignoffs > 0 && (
              <div style={{ fontSize: 9.5, color: 'var(--amber)', lineHeight: 1.4 }}>
                You signed off <b>{debrief.falseSignoffs}</b> time{debrief.falseSignoffs === 1 ? '' : 's'} before it was ready. Take a second look next time.
              </div>
            )}
            {debrief.rep != null && (
              <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                That makes <b style={{ color: 'var(--green)' }}>{debrief.rep} round{debrief.rep === 1 ? '' : 's'}</b> finished.
              </div>
            )}
            <div style={{ fontSize: 9.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
              Not every call is a fault. Recognizing a healthy system is part of the skill.
            </div>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div className="mono" style={{ fontSize: 8, color: 'var(--cool)', letterSpacing: 1.4, fontWeight: 700 }}>◎ DEBRIEF</div>
          <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            {debrief.faults != null
              ? <>You found and fixed <b style={{ color: 'var(--ink)' }}>{debrief.faults} fault{debrief.faults === 1 ? '' : 's'}</b>.</>
              : <>You solved it.</>}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            Hints: {debrief.hints > 0 ? <b style={{ color: 'var(--amber)' }}>{debrief.hints} used</b> : <b style={{ color: 'var(--green)' }}>none</b>}.
            {debrief.rep != null && <> That makes <b style={{ color: 'var(--green)' }}>{debrief.rep} round{debrief.rep === 1 ? '' : 's'}</b> finished.</>}
          </div>
          <div style={{ fontSize: 9.5, color: 'var(--ink-3)', lineHeight: 1.4 }}>
            {level.isFeedbackMode
              ? 'Push the send, cut the band that rings by a few dB, then push again. A few small cuts, then stop at the target.'
              : 'Walk the signal path from source to speaker, and check the quick things first.'}
          </div>
        </div>
        )
      ) : (
        <div style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{(level.task || level.isCustom || level.isLibrary) ? 'Recap: ' : 'Fix: '}</span>{level.solution}
        </div>
      )}
      {streak >= 2 && (
        <div className="mono" style={{ fontSize: 8.5, letterSpacing: 1, fontWeight: 800, color: 'var(--accent)', borderTop: '1px solid rgba(255,201,58,0.22)', paddingTop: 5 }}>
          {streak}-DAY STREAK
        </div>
      )}
      {Array.isArray(coaching) && coaching.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid rgba(255,181,71,0.22)', paddingTop: 5 }}>
          <div className="mono" style={{ fontSize: 8, color: 'var(--amber)', letterSpacing: 1.4, fontWeight: 700 }}>⚠ COACHING</div>
          {coaching.map((c, i) => (
            <div key={i} style={{ fontSize: 9.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              {c.message}
            </div>
          ))}
        </div>
      )}
      {/* Live Show debrief — did the audience hear you diagnosing? PFL'd checks
          never show here, which is the whole point. */}
      {level.isPractice && practiceFreeLeft == null && liveShow && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid rgba(216,71,63,0.25)', paddingTop: 5 }}>
          <div className="mono" style={{ fontSize: 8, color: dropouts > 0 ? 'var(--hot)' : 'var(--green)', letterSpacing: 1.2, fontWeight: 700 }}>● LIVE SHOW</div>
          <div style={{ fontSize: 9, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            {dropouts > 0
              ? <>The audience heard <b style={{ color: 'var(--hot)' }}>{dropouts} dropout{dropouts === 1 ? '' : 's'}</b> while you worked. PFL lets you check a channel in your headphones without the audience hearing it, and the master never needs to move.</>
              : <>The audience <b style={{ color: 'var(--green)' }}>never heard you working</b>. You found it with PFL and the meters. That's the live-show standard.</>}
          </div>
        </div>
      )}
      {/* The per-fault coverage debrief ("X of N fault types") was removed — the
          session is just find-and-fix at the chosen difficulty, no tracking. */}
      {(level.isCustom || level.isLibrary) ? (
        /* A custom or library scenario has no "next". For a free viewer who
           arrived from a YouTube link, the real next step is the full Essentials
           course, so that's the primary button (custom only); otherwise running
           it again is the action. */
        <>
          {onGoEssentials && (
            <button onClick={onGoEssentials} className="mono ui-no-select" style={{
              width: '100%', padding: '7px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1,
              background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
              border: '1px solid #2c9d52', borderRadius: 3, cursor: 'pointer',
            }}>START THE FREE TOUR →</button>
          )}
          <button onClick={onPracticeAgain} className="mono ui-no-select" style={{
            width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            background: onGoEssentials ? 'transparent' : 'linear-gradient(180deg, var(--green), #2c9d52)',
            color: onGoEssentials ? 'var(--ink-2)' : '#0a0a0c',
            border: '1px solid ' + (onGoEssentials ? '#38383e' : '#2c9d52'), borderRadius: 3, cursor: 'pointer',
          }}>↻ RUN IT AGAIN</button>
        </>
      ) : (level.isPractice || level.isFeedbackMode) ? (
        /* The training modes never end — the primary action is the next rep.
           On the free tier, Practice shows how many taste reps remain so the
           membership wall is foreseen, not sprung. */
        <>
          {feedbackGuidedDone ? (
            /* Three guided rounds done: pitch to join, or offer one by-ear round. */
            <>
              <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.5, textAlign: 'center' }}>
                With practice, members learn to pick these ringing frequencies out by ear. Join to keep training, or try one round on your own.
              </div>
              <a href={joinUrl('ear-training')} onClick={() => track('member_cta_click', { src: 'ear-training' })} target="_blank" rel="noopener noreferrer" className="mono ui-no-select" style={{
                display: 'block', width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1, textAlign: 'center',
                background: 'linear-gradient(180deg, var(--accent), #c79a1f)', color: '#0a0a0c', border: '1px solid #c79a1f', borderRadius: 3, cursor: 'pointer', textDecoration: 'none',
              }}>JOIN AUDIO UNIVERSITY →</a>
              <button onClick={onPracticeAgain} className="mono ui-no-select" style={{
                width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                background: '#16161a', color: 'var(--aux)', border: '1px solid var(--aux)', borderRadius: 3, cursor: 'pointer',
              }}>TRY ONE ROUND BY EAR →</button>
            </>
          ) : (<>
          {level.isFeedbackMode ? (feedbackCaption && (
            <div className="mono" style={{ fontSize: 8.5, letterSpacing: 0.6, textAlign: 'center', fontWeight: 700, color: feedbackLabel === 'JOIN TO KEEP TRAINING →' ? 'var(--accent)' : 'var(--aux)' }}>
              {feedbackCaption}
            </div>
          )) : (practiceFreeLeft != null && (
            <div className="mono" style={{ fontSize: 8.5, letterSpacing: 0.6, textAlign: 'center', fontWeight: 700, color: practiceFreeLeft > 0 ? 'var(--green)' : 'var(--accent)' }}>
              {practiceFreeLeft > 0
                ? ('FREE PREVIEW · ' + practiceFreeLeft + ' LEFT')
                : 'FREE PREVIEW USED'}
            </div>
          ))}
          {(level.isPractice && practiceFreeLeft === 0 && onGoFeedback) ? (
            /* Free Practice taste used up: offer the two next steps — join, or
               try the Ear Training free rounds — instead of a dead end. */
            <>
              <button onClick={onGoFeedback} className="mono ui-no-select" style={{
                width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                background: 'linear-gradient(180deg, var(--aux), #2c5d9e)', color: '#0a0a0c',
                border: '1px solid #2c5d9e', borderRadius: 3, cursor: 'pointer',
              }}>TRY EAR TRAINING →</button>
              <button onClick={onPracticeAgain} className="mono ui-no-select" style={{
                width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                background: '#16161a', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 3, cursor: 'pointer',
              }}>JOIN AUDIO UNIVERSITY →</button>
            </>
          ) : (
            <button onClick={onPracticeAgain} className="mono ui-no-select" style={{
              width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
              background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
              border: '1px solid #2c9d52', borderRadius: 3, cursor: 'pointer',
            }}>{level.isFeedbackMode ? (feedbackLabel || 'NEXT ROUND →')
                : (practiceFreeLeft === 0) ? 'JOIN TO KEEP TRAINING →'
                : 'NEXT FAULT →'}</button>
          )}
          </>)}
        </>
      ) : hasNext ? (
        <>
          {courseDone && (
            <div className="mono" style={{ width: '100%', padding: '7px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1, background: 'rgba(74,222,128,0.12)', color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 3, textAlign: 'center' }}>
              ✓ YOU PASSED THE {courseDone.toUpperCase()} COURSE
            </div>
          )}
          {/* Start Here finale: the completion card's opener (2026-10-18 —
              replaced the auto-fire at the win, which could stack over an
              open Monitor EQ window). The EQ overlay covers this sidebar, so
              the button is unreachable until the EQ window is closed. */}
          {onOpenCompletion && (
            <button onClick={onOpenCompletion} className="mono ui-no-select" style={{
              width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
              background: '#0a0a0c', color: 'var(--accent)', border: '1px solid var(--accent)',
              borderRadius: 3, textAlign: 'center', cursor: 'pointer',
            }}>ALL LEVELS COMPLETE →</button>
          )}
          <button onClick={onNext} className="mono ui-no-select" style={{
            width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
            background: 'linear-gradient(180deg, var(--green), #2c9d52)', color: '#0a0a0c',
            border: '1px solid #2c9d52', borderRadius: 3, cursor: 'pointer',
          }}>{courseDone ? 'NEXT COURSE →' : 'NEXT LEVEL →'}</button>
        </>
      ) : (
        <>
          {courseDone && (
            <div className="mono" style={{ width: '100%', padding: '7px 10px', fontSize: 10, fontWeight: 800, letterSpacing: 1, background: 'rgba(74,222,128,0.12)', color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 3, textAlign: 'center' }}>
              ✓ YOU PASSED THE {courseDone.toUpperCase()} COURSE
            </div>
          )}
          {/* The badge is now a button when the finale carries the completion
              card (onOpenCompletion — same geometry as the old badge, so the
              row looks unchanged; the arrow is the affordance). Non-finale
              !hasNext solves (a shared link played past the lock) keep the
              plain badge: there is no completion card for them to open. */}
          {onOpenCompletion ? (
            <button onClick={onOpenCompletion} className="mono ui-no-select" style={{
              width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1,
              background: '#0a0a0c', color: 'var(--accent)', border: '1px solid var(--accent)',
              borderRadius: 3, textAlign: 'center', cursor: 'pointer',
            }}>ALL LEVELS COMPLETE →</button>
          ) : (
            <div className="mono" style={{ width: '100%', padding: '6px 10px', fontSize: 10, fontWeight: 700, letterSpacing: 1, background: '#0a0a0c', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 3, textAlign: 'center' }}>ALL LEVELS COMPLETE</div>
          )}
        </>
      )}
      {onCopyRepLink && (
        <button onClick={onCopyRepLink} className="mono ui-no-select" title="Copy a link that loads this exact problem for anyone" style={{
          width: '100%', padding: '5px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 0.8,
          background: 'transparent', color: repCopied ? 'var(--green)' : 'var(--ink-3)', border: '1px solid #38383e',
          borderRadius: 3, cursor: 'pointer',
        }}>{repCopied ? '✓ LINK COPIED' : '⎘ COPY A LINK TO THIS PROBLEM'}</button>
      )}
    </div>
  );
}

// Error boundary: an uncaught render error otherwise blanks the whole page.
// This shows a recovery card instead, with a "reset progress" escape in case a
// corrupt save code / localStorage is the cause.
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err: err }; }
  componentDidCatch(err, info) { try { console.error('Lab error:', err, info); } catch (e) {} }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, fontFamily: 'system-ui,sans-serif', color: '#c8c8d0', background: '#08080a' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Something went wrong</div>
        <div style={{ fontSize: 13, color: '#8a8a92', maxWidth: 380, lineHeight: 1.5, marginBottom: 18 }}>The lab hit an unexpected error. A reload usually fixes it. If it keeps happening, resetting your saved progress will clear a bad save code.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => location.reload()} style={{ padding: '9px 16px', fontSize: 12, fontWeight: 700, background: '#4ade80', color: '#0a0a0c', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Reload</button>
          <button onClick={() => { try { localStorage.clear(); } catch (e) {} location.reload(); }} style={{ padding: '9px 16px', fontSize: 12, fontWeight: 700, background: 'transparent', color: '#c8c8d0', border: '1px solid #38383e', borderRadius: 6, cursor: 'pointer' }}>Reset progress &amp; reload</button>
        </div>
      </div>
    );
  }
}
const appRoot = ReactDOM.createRoot(document.getElementById('root'));
appRoot.render(<ErrorBoundary><App/></ErrorBoundary>);
// initTier's password prompt resolves after this first render (blocking
// dialog on the promise chain) and TIER is a plain variable React does not
// subscribe to — re-render when the tier settles so a freshly-unlocked
// member actually sees the member tier.
window.__remountApp = () => appRoot.render(<ErrorBoundary><App/></ErrorBoundary>);

// Build version badge. Reads the content script's ?v straight from the loaded
// DOM, so it shows exactly which build the page is running — a quick way to
// confirm a fresh deploy actually reached your browser (and to spot a stale
// cached page, whose old ?v would still show). It reads content.js on
// production and content-staging.js on staging, so it labels the environment
// too. The ?v is bumped on every deploy so this number always moves.
(function () {
  try {
    var src = Array.prototype.map.call(document.scripts, function (s) { return s.src; })
      .filter(function (s) { return /content[a-z-]*\.js\?v=/.test(s); })[0] || '';
    var m = src.match(/\?v=(\d+)/);
    // Environment label. Key off BOTH the page filename (the deploy identity:
    // production is always index.html, staging is staging.html) AND the content
    // script name. index.html never contains "staging" in its path, so the real
    // production file can never mislabel — even if a deploy fumbles the script
    // src line. Either signal reading "staging" is treated as staging (the safe,
    // surface-the-fumble call). A staging-labeled tool on a member page means the
    // embed is pointing at staging.html; repoint it at the site root / index.html.
    var path = (typeof location !== 'undefined' && location.pathname) || '';
    var staging = /content-staging/.test(src) || /staging/i.test(path);
    var badge = document.createElement('div');
    badge.textContent = (staging ? 'staging v' : 'v') + (m ? m[1] : '?');
    badge.title = 'Build version (bumps on every deploy). Use it to confirm a new version has loaded.';
    badge.style.cssText = 'position:fixed;bottom:6px;right:8px;z-index:99999;'
      + 'font:600 9.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.5px;'
      + 'color:rgba(180,182,190,0.6);background:rgba(10,10,12,0.5);padding:2px 5px;'
      + 'border-radius:4px;pointer-events:none;user-select:none;';
    document.body.appendChild(badge);
  } catch (e) {}
})();
