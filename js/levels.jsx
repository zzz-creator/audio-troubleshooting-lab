// The input CATALOG — one entry per source is the single home for everything
// about it: how it reads on the stage (label/short/kind/icon/color/diActive),
// its program level at the connector (`dbu`, which drives gain-staging), and its
// dynamics envelope (`env`, which drives meter bounce). SRC_DBU_BY_SOURCE and
// ENV_PROFILES are DERIVED from this below, so adding an input is one entry here
// (plus an audio voice + a channel patch when it goes live). The multi-input
// band (Phase 3+) will add group/snake/perf fields for stage clustering,
// sub-snake routing, and which of the four performers owns the input.
const SOURCES = {
  vocal:  { label: 'Vocal Mic 1', short: 'VOCAL 1', kind: 'dynamic',   icon: 'mic', color: '#ff4630', dbu: -25, canFeedback: true,
            env: { syllableRate: 5.0, syllableDepth: 0.06, phraseRate: 0.7, phraseDepth: 0.03, burstRate: 0.30, burstDur: 0.05, burstAmp: 0.15, syllablePhase: 0.0, burstSeed: 0.10 } },
  // Bass DI is ACTIVE (buffered electronics, needs +48V phantom like a
  // condenser). Keyboard DI is PASSIVE (transformer, no power). The diActive
  // flag drives the phantom gate and the source-card label. (Real rule of
  // thumb is the opposite pairing, but either box works on either source;
  // this assignment is Kyle's choice for the lesson.)
  guitar: { label: 'Bass DI',     short: 'BASS',    kind: 'di', diActive: true, icon: 'di', color: '#ffc93a', dbu: -42,
            env: { syllableRate: 2.5, syllableDepth: 0.04, phraseRate: 0.4, phraseDepth: 0.02, burstRate: 0.15, burstDur: 0.05, burstAmp: 0.08, syllablePhase: 2.3, burstSeed: 0.40 } },
  laptop: { label: 'Keyboard DI', short: 'KEYS',    kind: 'di',        icon: 'di',  color: '#4ade80', dbu: -10,
            env: { syllableRate: 1.2, syllableDepth: 0.03, phraseRate: 0.3, phraseDepth: 0.02, burstRate: 0.10, burstDur: 0.10, burstAmp: 0.05, syllablePhase: 3.1, burstSeed: 0.90 } },
  vocal2: { label: 'Vocal Mic 2', short: 'VOCAL 2', kind: 'condenser', icon: 'mic', color: '#ff8e4a', dbu: -21, canFeedback: true,
            env: { syllableRate: 4.5, syllableDepth: 0.05, phraseRate: 0.6, phraseDepth: 0.03, burstRate: 0.25, burstDur: 0.04, burstAmp: 0.13, syllablePhase: 1.7, burstSeed: 0.60 } },
  // Front-of-house stereo playback (a media player at the desk, not on stage).
  // A line input on a dedicated 5/6 channel used to test the system with music.
  // No env: its meter is analyser-only and the bed plays flat.
  playback: { label: 'Playback', short: 'PLAYBACK', kind: 'playback', icon: 'media', color: '#6aa9ff', dbu: -8 },

  // ---- The 16-input BAND (big-desk scenarios). Four players, each singing:
  // guitarist=lead (perf 0 · W1), bassist (perf 1 · W2, stage right), keys
  // (perf 2 · W3, stage left), drummer (perf 3 · W4). snake: up = drums + drum
  // vocal (upstage sub-snake), down = everything else (downstage sub-snake).
  // No env/voice yet — they meter at a steady baseline until voices are wired
  // (kept OUT of METER_SOURCES so the audio-voice loop doesn't touch them). ----
  kick:  { label: 'Kick',         short: 'KICK',  kind: 'dynamic',   icon: 'mic', color: '#c084fc', dbu: -28, group: 'drums', snake: 'up',   perf: 3 },
  snare: { label: 'Snare',        short: 'SNARE', kind: 'dynamic',   icon: 'mic', color: '#c084fc', dbu: -26, group: 'drums', snake: 'up',   perf: 3 },
  hat:   { label: 'Hi-hat',       short: 'HI-HAT',kind: 'condenser', icon: 'mic', color: '#c084fc', dbu: -38, group: 'drums', snake: 'up',   perf: 3 },
  rack:  { label: 'Rack tom',     short: 'RACK',  kind: 'dynamic',   icon: 'mic', color: '#c084fc', dbu: -30, group: 'drums', snake: 'up',   perf: 3 },
  floor: { label: 'Floor tom',    short: 'FLOOR', kind: 'dynamic',   icon: 'mic', color: '#c084fc', dbu: -28, group: 'drums', snake: 'up',   perf: 3 },
  // canFeedback: only the two mics that realistically ring in a live rig — a
  // sensitive drum OVERHEAD placed well off the source. The close drum mics
  // (kick/snare/toms) and the hi-hat spot mic sit right on the source, need
  // little gain, and don't feed back, so they carry no flag.
  ohl:   { label: 'Overhead L',   short: 'OH L',  kind: 'condenser', icon: 'mic', color: '#c084fc', dbu: -42, group: 'drums', snake: 'up',   perf: 3, canFeedback: true },
  ohr:   { label: 'Overhead R',   short: 'OH R',  kind: 'condenser', icon: 'mic', color: '#c084fc', dbu: -42, group: 'drums', snake: 'up',   perf: 3, canFeedback: true },
  // Backline instruments (bass, both guitars, keys) run to their OWN sub-snake,
  // set upstage stage-right — snake 'inst'. The vocals (below) run to the
  // downstage vocal sub-snake, snake 'down'. Drums + drum vocal are snake 'up'.
  bass:  { label: 'Bass',         short: 'BASS',  kind: 'di', diActive: true, icon: 'di', color: '#ffc93a', dbu: -42, group: 'bass', snake: 'inst', perf: 1 },
  egtr:  { label: 'Electric gtr', short: 'E GTR', kind: 'dynamic',   icon: 'mic', color: '#ff8e4a', dbu: -30, group: 'gtr',   snake: 'inst', perf: 0 },
  agtr:  { label: 'Acoustic gtr', short: 'A GTR', kind: 'di',        icon: 'di',  color: '#ff8e4a', dbu: -35, group: 'gtr',   snake: 'inst', perf: 0 },
  // Keys is a single mono DI on the current band (one recorded stem). keysl/keysr
  // stay for a possible future stereo-keys rig but aren't patched today.
  keys:  { label: 'Keys',         short: 'KEYS',  kind: 'di',        icon: 'di',  color: '#4ade80', dbu: -12, group: 'keys',  snake: 'inst', perf: 2 },
  keysl: { label: 'Keys L',       short: 'KEYS L',kind: 'di',        icon: 'di',  color: '#4ade80', dbu: -12, group: 'keys',  snake: 'inst', perf: 2 },
  keysr: { label: 'Keys R',       short: 'KEYS R',kind: 'di',        icon: 'di',  color: '#4ade80', dbu: -12, group: 'keys',  snake: 'inst', perf: 2 },
  vx1:   { label: 'Vocal 1',      short: 'VOX 1', kind: 'dynamic',   icon: 'mic', color: '#ff4630', dbu: -25, group: 'vox',   snake: 'down', perf: 0, canFeedback: true },
  vx2:   { label: 'Vocal 2',      short: 'VOX 2', kind: 'dynamic',   icon: 'mic', color: '#ff4630', dbu: -25, group: 'vox',   snake: 'down', perf: 1, canFeedback: true },
  vx3:   { label: 'Vocal 3',      short: 'VOX 3', kind: 'dynamic',   icon: 'mic', color: '#ff4630', dbu: -25, group: 'vox',   snake: 'down', perf: 2, canFeedback: true },
  vx4:   { label: 'Vocal 4',      short: 'VOX 4', kind: 'dynamic',   icon: 'mic', color: '#ff4630', dbu: -25, group: 'vox',   snake: 'up',   perf: 3, canFeedback: true },
};

// Per-source amplitude envelope. Real instruments and voices have dynamics:
// syllable-rate amplitude modulation, slower phrase-level intensity changes,
// and occasional transient peaks well above the steady level. The envelope
// here is a deterministic function of time that combines three layers:
//   - phrase: slow sinusoid (~0.3-0.7 Hz) representing emphasis breathing
//   - syllable: faster sinusoid (1.2-5 Hz) representing syllable / note rate
//   - bursts: sparse pulses ~once per 3-10 seconds representing transients
// The result rides between roughly 0.85 and 1.20 around baseline. Meters
// bounce realistically and a student learning gain staging has to leave room
// for the occasional peak instead of pinning the steady level to the top.
// The profiles live per-source in the catalog (SOURCES[k].env); this derives
// the { key: profile } lookup the engine reads.
const ENV_PROFILES = Object.fromEntries(
  Object.entries(SOURCES).filter(([, v]) => v.env).map(([k, v]) => [k, v.env])
);

// Every metered source (the ones with a synthesised audio voice). The band
// channels have envelopes; playback (5/6) has none (analyser-only, plays flat).
// A new input joins this list only once it has a voice wired in the audio graph.
const METER_SOURCES = ['vocal', 'vocal2', 'guitar', 'laptop', 'playback'];

function envelopeFactor(srcKey, tSec) {
  const p = ENV_PROFILES[srcKey] || ENV_PROFILES.vocal;
  const phrase = 1 + p.phraseDepth * Math.sin(2 * Math.PI * p.phraseRate * tSec);
  const syll = 1 + p.syllableDepth * Math.sin(2 * Math.PI * p.syllableRate * tSec + p.syllablePhase);
  const burstPhase = ((tSec * p.burstRate + p.burstSeed) % 1 + 1) % 1;
  const burst = burstPhase < p.burstDur ? (1 + p.burstAmp * (1 - burstPhase / p.burstDur)) : 1;
  return phrase * syll * burst;
}

// Map combined PA output (linear amplitude, 0..~3+ when multiple channels
// sum) to dB SPL at the audience. Calibration is a logarithmic curve so
// doublings of output amplitude read as roughly +6 dB on the meter — close
// to physical reality — and the readout saturates near real-world concert
// SPLs (110-115 dB) instead of running off to nonsense values when channels
// stack. Reference points the curve hits, by design:
//   paAvg 0.0   → 60 dB SPL  (quiet room ambient)
//   paAvg ~0.34 → ~86 dB SPL (typical default concert mix in this trainer)
//   paAvg ~1.0  → ~97 dB SPL (loud concert, NIOSH 30-min limit)
//   paAvg ~3.0  → ~109 dB SPL (very loud, damage risk)
function dbSplFromPa(paAvg) {
  if (!Number.isFinite(paAvg) || paAvg <= 0) return 60;
  // Real chain: SPL at the mix position tracks the PA's drive level dB-for-dB
  // (a 6 dB fader pull is 6 dB off the room). Calibrated so the default show
  // level lands in the low 90s dB SPL — a small-club gig at a sane level —
  // with a ~55 dB room floor when the system is idle.
  if (!(paAvg > 0.0005)) return 55;
  return Math.max(55, 90.4 + linToDbu(paAvg));
}

// NIOSH (National Institute for Occupational Safety and Health) maximum daily
// noise exposure, 3 dB exchange rate. Reference: NIOSH Recommended Exposure
// Limit (REL) is 85 dB(A) for 8 hours; every 3 dB doubles damage, halving the
// permissible exposure time. https://www.cdc.gov/niosh/topics/noise/
// Returns a short string suitable for the SPL meter readout. Numbers and the
// 3 dB exchange rate are taken directly from the NIOSH REL, not approximated.
function nioshExposure(db) {
  if (db < 70) return { text: 'comfortable listening', zone: 'safe' };
  if (db < 85) return { text: 'safe all day', zone: 'safe' };
  // hours = 8 * 2^(-(db-85)/3)
  const hours = 8 * Math.pow(2, -(db - 85) / 3);
  if (hours >= 1) return { text: '~' + Math.round(hours) + ' h/day before damage', zone: hours >= 4 ? 'watch' : 'limit' };
  const minutes = hours * 60;
  if (minutes >= 1) return { text: '~' + Math.round(minutes) + ' min/day before damage', zone: minutes >= 15 ? 'limit' : 'damage' };
  const seconds = Math.max(1, Math.round(minutes * 60));
  return { text: '~' + seconds + ' sec/day before damage', zone: 'damage' };
}

const DESTINATIONS = {
  pa:     { label: 'Main PA',         short: 'PA',      stereo: true,  description: 'House speakers. What the audience hears.' },
  wedge:  { label: 'Wedge 1',         short: 'WEDGE 1', stereo: false, description: 'Floor wedge for the lead singer (Vocal 1).' },
  wedge2: { label: 'Wedge 2',         short: 'WEDGE 2', stereo: false, description: 'Floor wedge for the second singer (Vocal 2).' },
  wedge3: { label: 'Wedge 3',         short: 'WEDGE 3', stereo: false, description: 'Floor wedge for the keys player.' },
  wedge4: { label: 'Wedge 4',         short: 'WEDGE 4', stereo: false, description: 'Floor wedge for the drummer.' },
};

// Snake channel colors — the US color-coding standard for multichannel snakes
// follows the resistor color code: 1 brown, 2 red, 3 orange, 4 yellow, 5 green,
// 6 blue, 7 violet, 8 gray. The snake is BIDIRECTIONAL: the SEND side (stage ->
// FOH) and the RETURN side (FOH -> stage) are their OWN bundles, each numbered
// and colored from 1. So input 1 and return 1 are both brown, on separate
// multicores. Stage-box ports, fan-out tails, and console chips all carry these
// colors, because on a real snake the color tells you the CHANNEL NUMBER within
// its bundle, not what's plugged in. Verified against ProSoundWeb / practice.
// (Indexes past gray use neutral off-standard colors, for when a bundle grows
// past 8.)
const SNAKE_COLORS = ['#a8703a', '#ff4630', '#ff8e2a', '#ffd23a', '#4ade80', '#5a8cff', '#b88dff', '#9aa0a8', '#e0e0e6', '#46c7b8'];

// The OUTPUT (return) path has two patch points, mirroring the input path. Its
// snake channels are their OWN bundle numbered from 1 (a bidirectional snake),
// so the six returns are channels 1-6, independent of the input channels 1-4:
//   outFan  — FOH end: which console output (mainL/mainR/aux1-4) is plugged
//             into each snake return channel (1-6). null/0 = tail hangs loose.
//   outPatch — stage end: which stage-box out port (= return channel 1-6)
//             each speaker's line is plugged into. null = unplugged.
// Mis-patching either end is real and audible: a wedge whose line lands on
// the channel carrying MAIN L plays the house mix.
const DEFAULT_OUT_FAN = { 1: 'mainL', 2: 'mainR', 3: 'aux1', 4: 'aux2', 5: 'aux3', 6: 'aux4' };
const DEFAULT_OUT_PATCH = { pa_l: 1, pa_r: 2, wedge: 3, wedge2: 4, wedge3: 5, wedge4: 6 };
const OUT_PORT_LABELS = { mainL: 'MAIN L', mainR: 'MAIN R', aux1: 'AUX 1', aux2: 'AUX 2', aux3: 'AUX 3', aux4: 'AUX 4' };

// Graphic EQ on the monitor sends — ISO mid-octave centre frequencies. A cut on
// the band a wedge rings at (its ringBand) drops the feedback loop at that
// frequency. Bands 0-1 are "low" (an HPF can help there); 2-4 are mid/high
// (only the EQ rings those out). The EQ is bidirectional: a cut drops the loop
// at that frequency, a boost raises it (pushing a band up toward its resonance
// is a real way to find the ring). EQ_CUT_DB = the boost/cut range each way.
const EQ_BANDS = ['250', '500', '1k', '2k', '4k'];
// Center frequency of each band, in Hz. The audible feedback ring is played at
// the center frequency of whichever band is glowing, so what you hear and what
// you see (and cut) are always the same note. Index-aligned with EQ_BANDS.
const EQ_BAND_HZ = [250, 500, 1000, 2000, 4000];
// FULL graphic EQ — the ISO third-octave centers from 63 Hz to 16 kHz, the
// band layout of a real 25-band graphic (minus the sub-63 Hz bottom octave a
// wedge can't reproduce anyway). Used by Feedback Mode, where ringing out a
// wedge across the whole spectrum is the training. The Essentials keep the
// simpler 5-band EQ. A wedge carries the full EQ when its eq array length
// matches this list.
const FULL_EQ_BANDS = ['63', '80', '100', '125', '160', '200', '250', '315', '400', '500', '630', '800', '1k', '1.25k', '1.6k', '2k', '2.5k', '3.15k', '4k', '5k', '6.3k', '8k', '10k', '12.5k', '16k'];
const FULL_EQ_HZ = [63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000];
const EQ_CUT_DB = 12;
// Diagnostic flags (URL): ?lite=1 stops the throttled meter re-render; ?lite=2
// additionally freezes the whole per-frame meter loop + the slow interval, so
// the main thread is nearly idle while audio keeps playing. Used to confirm
// whether the per-frame redraw is starving the audio thread on slower machines.
const LITE_LEVEL = (typeof location !== 'undefined' && parseInt(((location.search.match(/[?&]lite=(\d)/) || [])[1]) || '0', 10)) || 0;
const LITE_METERS = LITE_LEVEL >= 1;
const LITE_FREEZE = LITE_LEVEL >= 2;
// A wedge's inherent feedback fingerprint: the frequencies where the mic +
// wedge + room loop peaks, so those ring first. This is what makes feedback
// behave like real life instead of one fixed tone. Per band, a "sensitivity"
// multiplier on the loop gain (loop = send level x this x any EQ cut). A real
// monitor has a handful of resonances at different heights, spread across the
// trouble zones, so as you push a send the TALLEST peak rings first (well
// before the send is maxed), then the next, then the next. Cut a ringing band
// on the graphic EQ and its peak drops below the ring line, buying you more
// level until the next peak catches up. That progressive ring-out is exactly
// how you EQ a monitor. At the 0.55 onset line, a peak of p rings once the
// send reaches 0.55/p, so the ladder below rings in order: 2k (~0.45), then
// 400 Hz (~0.52), 4k (~0.59), 800 Hz (~0.66), 250 Hz (~0.71), 6.3k (~0.78).
// The floor bands (~0.3) only ring if a send is pushed absurdly hard. Indexes
// are FULL_EQ_HZ (63 Hz .. 16 kHz). Feedback Mode overrides this with its own
// randomized profile so ring-out practice never repeats.
const DEFAULT_FB_PROFILE = [
  // 63    80    100   125   160   200   250   315   400   500   630
  0.24, 0.26, 0.28, 0.30, 0.32, 0.34, 0.77, 0.36, 1.05, 0.38, 0.38,
  // 800   1k    1.25k 1.6k  2k    2.5k  3.15k 4k    5k    6.3k  8k
  0.84, 0.40, 0.40, 0.42, 1.22, 0.42, 0.42, 0.93, 0.40, 0.71, 0.36,
  // 10k   12.5k 16k
  0.32, 0.28, 0.24,
];
// Real feedback is a MOVING TARGET: every room, wedge, mic, and placement rings
// at different frequencies, so a working engineer FINDS the frequency live
// instead of memorizing one. To train that, each wedge gets its own resonance
// fingerprint: the SAME height ladder (so the onset timing / calibration is
// identical everywhere) placed onto DIFFERENT trouble-zone bands. The
// assignment is reseeded whenever a level loads, so the frequencies change
// scenario to scenario and you cannot memorize "2 kHz rings first."
const FB_HEIGHTS = [1.22, 1.05, 0.93, 0.84, 0.77, 0.71];
let FB_SEED = 0x9e3779b1;
const _wedgeProfileCache = new Map();
// mulberry32: tiny deterministic RNG so a wedge's fingerprint is stable within a
// session (a ring-out stays consistent) but varies across scenarios.
function fbRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
window.reseedFeedback = () => { FB_SEED = (Math.floor(Math.random() * 0xffffffff)) >>> 0; _wedgeProfileCache.clear(); };
// Build one wedge's 25-band resonance profile: 2 low-mid + 2 mid + 2 presence
// resonances drawn from the real trouble zones, with the TALLEST always in the
// mid/presence band where a first ring actually lives. Floor + tapered extremes
// (feedback is rare below ~150 Hz or above ~8 kHz). Deterministic per (wedge,seed).
function wedgeProfileFor(wKey) {
  const ck = wKey + ':' + FB_SEED;
  const hit = _wedgeProfileCache.get(ck);
  if (hit) return hit;
  let h = 0; for (let i = 0; i < wKey.length; i++) h = ((h << 5) - h + wKey.charCodeAt(i)) | 0;
  const rng = fbRng((FB_SEED ^ h) >>> 0);
  const prof = new Array(FULL_EQ_HZ.length).fill(0.30);
  for (let i = 0; i < 5; i++) prof[i] = 0.24 + i * 0.02;              // 63..160 Hz taper
  for (let i = 21; i < prof.length; i++) prof[i] = 0.34 - (i - 21) * 0.03; // 8k..16k taper
  const draw = (arr, n) => { const a = arr.slice(), out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };
  const bands = [...draw([6, 7, 8, 9], 2), ...draw([10, 11, 12, 13, 14, 15], 2), ...draw([16, 17, 18, 19, 20], 2)];
  const midPres = bands.filter(b => b >= 10);
  const tall = midPres[Math.floor(rng() * midPres.length)];
  const rest = bands.filter(b => b !== tall);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
  [tall, ...rest].forEach((b, i) => { if (i < FB_HEIGHTS.length) prof[b] = FB_HEIGHTS[i]; });
  _wedgeProfileCache.set(ck, prof);
  return prof;
}
// Linear gain multiplier from a band's fader position. The graphic EQ is
// bidirectional: g = +1 is a full boost, g = -1 is a full cut, 0 is flat, and
// EQ_CUT_DB is the range each way (so +1 = +EQ_CUT_DB dB, -1 = -EQ_CUT_DB dB).
function eqBandRelief(g) {
  const v = Math.max(-1, Math.min(1, g || 0));
  return Math.pow(10, (EQ_CUT_DB * v) / 20);
}
// What the EQ does to the monitor's overall LEVEL: energy comes out of the
// wedge with every cut (mean of the band gains). This is why a real engineer
// cuts surgically — slamming the whole EQ down kills the ring AND the
// monitor. Feeds the wedge output chain in computeAudio.
function eqLevelGain(w) {
  if (!w || !w.eq || !w.eq.length) return 1;
  let sum = 0;
  for (const c of w.eq) sum += eqBandRelief(c);
  return sum / w.eq.length;
}

const DEFAULT_CHANNEL = {
  label: '—',
  gain: 0.0,
  phantom: false,
  highpass: false,
  pan: 0.5,
  aux1: 0.0,
  aux2: 0.0,
  aux3: 0.0,
  aux4: 0.0,
  mute: false,
  solo: false,
  fader: 0.0,
  // inputTrim represents how loud the source's signal arrives at the channel
  // before the preamp acts on it (a quiet talker, a low-output DI, a mic
  // placed too far from the source). Default 1.0 = nominal. Levels that need
  // to teach "the source itself is the problem" can author this lower.
  inputTrim: 1.0,
};

function makeChannel(o = {}) { return { ...DEFAULT_CHANNEL, ...o }; }

// The mixer's input count = the console name suffix (MX-8, MX-16). A stereo
// strip (the playback pair) counts as two inputs, so this matches the physical
// channel count on the desk regardless of how many faders it takes.
function consoleInputs(s) {
  return (s && Array.isArray(s.channels)) ? s.channels.reduce((n, c) => n + (c.stereo ? 2 : 1), 0) : 0;
}
window.consoleInputs = consoleInputs;

function defaultState() {
  return {
    channels: [
      // Default input gains are PER-SOURCE (HEALTHY_GAIN_BY_CH): each one is
      // the knob position that lands its source at nominal, +4 dBu / -18 dBFS
      // (baseline chanIn ~0.81). A passive bass sits high on the knob (~0.77,
      // 46 dB), a hot keyboard low (~0.23, 14 dB), the mics in between. Every
      // channel meters the same at the input — the difference is the knob, which
      // is exactly the gain-staging skill. All land with a real 18 dB of
      // headroom above nominal, clean on the dynamic stems' peaks. The fader
      // (not the gain) carries the mix balance below.
      makeChannel({ id: 1, label: 'Vocal 1', gain: HEALTHY_GAIN_BY_CH[0], phantom: false, fader: 0.72, pan: 0.5, aux1: 0.0 }),
      makeChannel({ id: 2, label: 'Vocal 2', gain: HEALTHY_GAIN_BY_CH[1], phantom: true,  fader: 0.72, pan: 0.5, aux1: 0.0 }),
      makeChannel({ id: 3, label: 'Bass',    gain: HEALTHY_GAIN_BY_CH[2],                 fader: 0.65, pan: 0.5, aux1: 0.0 }),
      makeChannel({ id: 4, label: 'Keys',    gain: HEALTHY_GAIN_BY_CH[3],                 fader: 0.60, pan: 0.5, aux1: 0.0 }),
      // Two spare mono inputs (5-6) on the MX-8, nothing patched — silent until
      // used. They sit between the band and the FOH playback line on 7/8.
      makeChannel({ id: 5, label: '—', gain: 0, fader: 0.60, pan: 0.5 }),
      makeChannel({ id: 6, label: '—', gain: 0, fader: 0.60, pan: 0.5 }),
      // FOH stereo playback line on the top pair. Its channel number (7/8) renders
      // from the strip's position; the source label carries the name.
      makeChannel({ id: 7, label: '',  gain: HEALTHY_GAIN_BY_CH[6], stereo: true, fader: 0.70, pan: 0.5, aux1: 0.0 }),
    ],
    // Mixer / console power state. Default ON for all existing levels.
    // The Power-On Sequence lesson sabotages this to false and teaches the
    // safe boot order: console on → master down → amp on → master up.
    // When mixer.on is false, computeAudio zeros out every output so no
    // signal reaches the PA, wedges, or even the channel post-fader meters.
    mixer: { on: true },
    // Master fader default sits below unity — compensates for the
    // pan law's louder summing at center so a typical mix doesn't peg
    // the master meter into red just by opening the desk.
    master: { fader: 0.55, mute: false, aux1: 0.75, aux2: 0.75, aux3: 0.75, aux4: 0.75 },
    outputs: {
      pa_l:   { on: true, mute: false, volume: 0.7 },
      pa_r:   { on: true, mute: false, volume: 0.7 },
      // eq: per-band fader on the monitor send, -1 (full -12 dB cut) .. 0 (flat) .. +1 (full +12 dB boost),
      // one entry per FULL_EQ_BANDS frequency. Every wedge now carries the full
      // 25-band graphic EQ (consistent across all levels and modes, and the
      // realistic monitor tool). ringBand: the band this wedge rings at when it
      // feeds back, as an index into FULL_EQ_HZ (15 = 2 kHz, 12 = 1 kHz).
      wedge:  { on: true, mute: false, volume: 0.0, eq: new Array(FULL_EQ_BANDS.length).fill(0), ringBand: 15 },
      wedge2: { on: true, mute: false, volume: 0.0, eq: new Array(FULL_EQ_BANDS.length).fill(0), ringBand: 12 },
      // Wedges 3 and 4 (bass + keys). Same engine as 1/2; distinct ring bands so
      // each wedge feeds back at its own frequency when pushed too hard.
      wedge3: { on: true, mute: false, volume: 0.0, eq: new Array(FULL_EQ_BANDS.length).fill(0), ringBand: 17 },
      wedge4: { on: true, mute: false, volume: 0.0, eq: new Array(FULL_EQ_BANDS.length).fill(0), ringBand: 10 },
      amp:    { on: true },
    },
    cables: {
      vocal: 1, vocal2: 2, guitar: 3, laptop: 4,
    },
    // Console outputs → snake returns (FOH end) and speaker lines →
    // stage-box out ports (stage end). See the consts above.
    outFan: { ...DEFAULT_OUT_FAN },
    outPatch: { ...DEFAULT_OUT_PATCH },
    fanOut: [1, 2, 3, 4],
    sourceMute: { vocal: false, guitar: false, laptop: false, vocal2: false, playback: false },
    // Program mute: silences a source's PLAYBACK SAMPLE only. The mic stays
    // open, so the channel can still feed back and placement still matters
    // (feedback is computed from knob positions, not the live sample). Used to
    // ring out a wedge with an open mic and no one singing, like a real soundcheck.
    programMute: { vocal: false, guitar: false, laptop: false, vocal2: false, playback: false },
    // Playback 5/6 source: 'music' (the synth bed, later a real music file) or
    // 'pink' (a pink-noise generator for ringing the system out). Audible only;
    // the metering/physics treat the line input the same either way.
    playbackMode: 'music',
    testing: 'vocal',
    inspect: 'pa',
    topology: {
      mixerLocation: 'side-stage',
      paRig: 'powered',
      wedgeLocation: 'stage',
    },
    // phantomPop: set when the user engages +48V phantom while the channel,
    // master, and a speaker are all live — a DC pop is sent to the rig.
    // Cleared on reset / level change. Blocks the level from registering as
    // solved (the lesson is: do it the safe way, not just any way that
    // ends with phantom on).
    phantomPop: null,
    // DIGITAL-SURFACE groups (Phase 2). Fixed assignments, all inactive / at
    // unity by default, so they have ZERO effect on the analog surface and on
    // every existing scenario. A digital-only Practice fault activates a mute
    // group or pulls a DCA down; computeAudio treats a channel as muted if any
    // ACTIVE mute group lists it, and scales its main-mix (post-fader) level by
    // the product of the DCA faders it belongs to.
    muteGroups: [
      { name: 'VOX',  members: [0, 1],          active: false },
      { name: 'BAND', members: [2, 3],          active: false },
      { name: 'ALL',  members: [0, 1, 2, 3, 4], active: false },
      { name: 'FX',   members: [4],             active: false },
    ],
    dcas: [
      // DCA faders ride the same real taper as every other fader: 0.75 of
      // travel = unity (0 dB). Parked at unity they are transparent.
      { name: 'VOX',  members: [0, 1], fader: 0.75 },
      { name: 'BAND', members: [2, 3], fader: 0.75 },
    ],
    // Console scenes/snapshots (digital surface, Phase 3a). Inert by default:
    // three named scenes with no stored snapshot, current = SHOW. Recalling an
    // empty scene is a no-op, and scenes never touch computeAudio, so the analog
    // surface and every existing scenario are unaffected. A digital-only fault
    // stores a healthy SHOW snapshot, applies a broken SOUNDCHK snapshot to the
    // live channels, and leaves SOUNDCHK active; the fix is to recall SHOW.
    scenes: [
      { name: 'SHOW',     snapshot: null },
      { name: 'SOUNDCHK', snapshot: null },
      { name: 'WALK-IN',  snapshot: null },
    ],
    currentScene: 0,
    // Soft input patch (digital surface, Phase 3b): channel index -> the physical
    // input number feeding it, identity by default (CH1<-IN1 ...). 0 means the
    // channel's input is unassigned in the routing screen, so it's dead even
    // with the cable fine. A digital-only fault unassigns a band channel; the
    // fix is to re-patch it in the PATCH strip. All-assigned default is inert.
    inputPatch: [1, 2, 3, 4, 5],
  };
}

const DEFAULT_TOPOLOGY = {
  mixerLocation: 'side-stage',
  paRig: 'powered',
  wedgeLocation: 'stage',
};

function effectiveChannel(s, srcKey) {
  // Playback is a FOH line input hardwired to the 5/6 channel — it plugs into
  // the desk, not the stage snake, so it skips the cable/fan-out path.
  if (srcKey === 'playback') {
    // A board with no FOH playback line (e.g. the 16-input band as first built)
    // has no playback channel at all.
    if (s.noPlayback) return 0;
    // Playback is the FOH stereo line on the desk's TOP pair — the stereo strip,
    // wherever it sits (7/8 on an MX-8, 15/16 on an MX-16). Derived, not fixed.
    const i = s.channels ? s.channels.findIndex((c) => c.stereo) : -1;
    return i >= 0 ? i + 1 : 0;
  }
  // 16-channel stage: the mic end has to be in a sub-snake input too. micIn 0
  // means the XLR is out of the box, so nothing reaches the console no matter
  // where the tail is patched. (undefined = the natural slot, the normal case.)
  if (s.big16 && s.micIn && s.micIn[srcKey] === 0) return 0;
  const port = s.cables[srcKey];
  if (!port || port < 1) return 0;
  const fan = s.fanOut || [1, 2, 3, 4];
  const ch = fan[port - 1];
  return ch >= 1 && ch <= s.channels.length ? ch : 0;
}
// The sub-snake input SLOT a source's mic sits in: 0 = unplugged, undefined =
// the natural 1:1 slot. One helper so the falsy-zero trap (`micIn[k] || n`)
// can't creep back in — it silently reads "unplugged" as "natural".
function micSlot(s, srcKey, natural) {
  const v = s && s.micIn ? s.micIn[srcKey] : undefined;
  if (v === 0) return 0;
  return v || natural;
}
window.micSlot = micSlot;
// The slot a source's mic sits in when nothing has been moved: its position
// among the sources sharing that sub-snake, in board order.
function naturalSlotOf(keys, k) {
  const SRC = window.SOURCES || {};
  const sn = SRC[k] && SRC[k].snake;
  if (!sn) return 0;
  let i = 0;
  for (const kk of keys) {
    if (!SRC[kk] || SRC[kk].snake !== sn) continue;
    i++;
    if (kk === k) return i;
  }
  return 0;
}
window.naturalSlotOf = naturalSlotOf;

// Runtime cable audit — the durable guard against a cable crossing a device.
// Samples actual points ALONG every cable path in the stage SVG and flags any
// path that passes through a card's interior. Uses getScreenCTM so it is
// correct at any zoom/viewBox. Card elements are published by the stage
// compute() effect (window.__stageCardEls). Returns { cards, crossings:[...] };
// an empty crossings array means every cable is clear of every card. Run it
// after any change to the 16-channel stage layout:  window.__cableAudit()
window.__cableAudit = function (opts) {
  opts = opts || {};
  const margin = opts.margin != null ? opts.margin : 5;   // ignore edge grazes
  const els = window.__stageCardEls || [];
  const cards = els.map((el) => {
    const r = el.getBoundingClientRect();
    const label = ((el.textContent || '').trim().split('\n')[0] || '?').slice(0, 14);
    return { label, x: r.left + margin, y: r.top + margin, r: r.right - margin, b: r.bottom - margin };
  }).filter((c) => c.r > c.x && c.b > c.y);
  const svgs = Array.prototype.slice.call(document.querySelectorAll('svg'));
  if (!svgs.length) return { error: 'no svg' };
  const stageSvg = svgs.map((s) => ({ s, n: s.querySelectorAll('path').length })).sort((a, b) => b.n - a.n)[0].s;
  const paths = Array.prototype.slice.call(stageSvg.querySelectorAll('path'));
  // The stage floor. Cables belong ON the stage: one that runs out of the bottom
  // ends up over the brief card underneath, which is what the plot looked like
  // before this check existed (Kyle 2026-07-24).
  const plotEl = document.querySelector('[data-stage-plot]');
  const plot = plotEl ? plotEl.getBoundingClientRect() : null;
  const CONNECTORS = /SUB-SNAK|SUB-S|STAGE BOX|^\?$/i;
  const hits = [], below = [], along = [], samples = [];
  const seenGeom = new Map();   // geometry key -> cable index, so one cable counts once
  paths.forEach((p, i) => {
    let len;
    try { len = p.getTotalLength(); } catch (e) { return; }
    if (!len || len < 20) return;
    const ctm = p.getScreenCTM();
    if (!ctm) return;
    const step = Math.max(2, len / 400);
    // Record the path-length fractions where the line is inside each card.
    const inside = {};
    const pts = [];
    let worstBelow = 0;
    for (let d = 0; d <= len; d += step) {
      let pt;
      try { pt = p.getPointAtLength(d); } catch (e) { break; }
      const sx = ctm.a * pt.x + ctm.c * pt.y + ctm.e;
      const sy = ctm.b * pt.x + ctm.d * pt.y + ctm.f;
      pts.push([sx, sy]);
      if (plot && sy > plot.bottom) worstBelow = Math.max(worstBelow, sy - plot.bottom);
      for (const cd of cards) {
        if (sx > cd.x && sx < cd.r && sy > cd.y && sy < cd.b) (inside[cd.label] = inside[cd.label] || []).push(d / len);
      }
      void 0;
    }
    // These rules are about the STAGE PLOT. The overlay this samples also carries
    // the console-side snake fan-out, whose lines are a bundle by design and
    // would otherwise report as stacked forever. A cable counts as a stage cable
    // when most of it is on the stage; the main snake still leaves for FOH.
    if (plot) {
      let on = 0;
      for (const q of pts) if (q[0] >= plot.left && q[0] <= plot.right && q[1] >= plot.top && q[1] <= plot.bottom + 60) on++;
      if (on / pts.length < 0.6) return;
    }
    // Each cable is rendered as three superimposed paths: a black outline, the
    // coloured core, and a fat transparent hit area. They share geometry exactly,
    // so key on it and keep only the first — otherwise every cable looks like a
    // three-way stack and every other finding is reported three times.
    const key = pts.length + '|' + pts.slice(0, 40).map((q) => Math.round(q[0]) + ',' + Math.round(q[1])).join(';');
    if (seenGeom.has(key)) return;
    seenGeom.set(key, samples.length);
    samples.push(pts);
    // A cable that TERMINATES at a card (its own connection: a snake tail into
    // its head, a return up into its speaker) has all its inside-points bunched
    // at one END. A real CROSSING passes through the MIDDLE. Flag a card only
    // when the line sits inside it away from both ends — that is the thing that
    // obscures a card, and the thing these lanes exist to prevent.
    // Connection boxes are where cables are MEANT to end up inside: a cable to a
    // low port on the stage box has to travel down through the box's own bounds
    // to reach it. They are keep-outs for the runs-along rule, not for crossing.
    const ks = Object.keys(inside).filter((label) =>
      !CONNECTORS.test(label) && inside[label].some((f) => f > 0.18 && f < 0.82));
    if (ks.length) hits.push({ path: i, cards: ks });
    // RUNS ALONG a device: not through its middle, but hugging it for a long
    // stretch, which reads as a cable draped over the gear. A cable that PLUGS
    // INTO a box legitimately sits inside it for a few samples, so a device only
    // counts if the path neither starts nor ends inside it.
    const endsIn = (cd) => {
      const a = pts[0], z = pts[pts.length - 1];
      const inRect = (q) => q && q[0] > cd.x - 12 && q[0] < cd.r + 12 && q[1] > cd.y - 12 && q[1] < cd.b + 12;
      return inRect(a) || inRect(z);
    };
    const alongCards = Object.keys(inside).filter((label) => {
      if (ks.includes(label) || inside[label].length < 10) return false;
      const cd = cards.find((c) => c.label === label);
      return cd && !endsIn(cd);
    });
    if (alongCards.length) along.push({ path: i, cards: alongCards });
    if (worstBelow > 1) below.push({ path: i, pxBelowStage: Math.round(worstBelow) });
  });
  // STACKED: two cables sharing the same lane so closely they read as one line.
  // Parallel runs are fine and realistic; runs that sit on top of each other are
  // the thing that makes a stage plot unreadable.
  const stacked = [];
  const near = opts.stackPx != null ? opts.stackPx : 1.5;
  for (let a = 0; a < samples.length; a++) {
    for (let b = a + 1; b < samples.length; b++) {
      let shared = 0;
      const A = samples[a], B = samples[b];
      for (let k = 0; k < A.length; k += 2) {
        for (let m = 0; m < B.length; m += 2) {
          if (Math.abs(A[k][0] - B[m][0]) < near && Math.abs(A[k][1] - B[m][1]) < near) { shared++; break; }
        }
      }
      if (shared >= 30) stacked.push({ paths: [a, b], sharedSamples: shared });
    }
  }
  const out = { cards: cards.length, sampledPaths: paths.length,
                crossings: hits, alongDevice: along, belowStage: below, stacked: stacked };
  out.clean = !hits.length && !along.length && !below.length && !stacked.length;
  return out;
};

function sourceFor(s, chIdxZero) {
  for (const k of Object.keys(SOURCES)) {
    if (effectiveChannel(s, k) === chIdxZero + 1) return k;
  }
  return null;
}
window.effectiveChannel = effectiveChannel;

// ── Real-units signal model ──────────────────────────────────────────────
// The whole chain computes in REAL dB, anchored to pro line level:
//   +4 dBu  = nominal program level = legacy linear 0.812 = -18 dBFS
//   +22 dBu = console clip = 0 dBFS  (X32-class alignment: -18 dBFS ≈ +4 dBu)
// Legacy linear fields stay nominal-anchored (0.812 at +4 dBu) so the app
// reads familiar numbers at a healthy show level, while every knob and fader
// now moves the signal in true dB through real control tapers. A 6 dB fader
// pull is 6 dB everywhere downstream: meters, headroom, and feedback margin
// all move together, which is the real gain-staging discipline.
const DBU_NOM = 4, DBU_CLIP = 22, NOM_LIN = 0.812;
const dbToLin = (db) => Math.pow(10, db / 20);
const linDb = (v) => (v > 1e-6 ? 20 * Math.log10(v) : -120);
const linToDbu = (v) => DBU_NOM + linDb(v / NOM_LIN);
const dbuToLin = (dbu) => NOM_LIN * dbToLin(dbu - DBU_NOM);
window.linToDbu = linToDbu; window.dbuToLin = dbuToLin;
// Source program level at the connector (dBu, average). Real sources vary
// widely: a passive bass through a DI arrives ~17 dB below a close vocal, a
// synth or a laptop is nearly line level. Modeling that spread is what makes
// gain staging a real skill here — every source needs a different gain-knob
// position to reach the same nominal +4 dBu, so the student sets by the meter,
// not by a memorized knob spot. Values are average program level in dBu at the
// connector, from published mic/DI sensitivities:
//   vocal    dynamic SM58-class, strong close singer   -25 dBu
//   vocal2   condenser (e865-class), hotter             -21 dBu
//   guitar   passive bass through a DI (mic level!)     -42 dBu
//   laptop   keyboard/synth through a DI (line-ish)     -10 dBu
//   playback media player at the desk (consumer line)   -8 dBu
// DERIVED from the catalog (SOURCES[k].dbu): each source's program level at the
// connector in dBu. See SOURCES for the single per-source definition.
const SRC_DBU_BY_SOURCE = Object.fromEntries(
  Object.entries(SOURCES).filter(([, v]) => v.dbu != null).map(([k, v]) => [k, v.dbu])
);
const SRC_DBU_DEFAULT = -21.2; // fallback for any unmapped source
const srcDbuFor = (srcKey) => (SRC_DBU_BY_SOURCE[srcKey] != null ? SRC_DBU_BY_SOURCE[srcKey] : SRC_DBU_DEFAULT);
// The gain-knob position that lands each source at nominal (+4 dBu, -18 dBFS):
// gain = (4 - srcDbu) / 60, since the preamp is 0..60 dB linear-in-dB. Indexed
// by channel under the default patch (ch1 vocal, ch2 vocal2, ch3 bass, ch4
// keys, ch5 playback). defaultState() and the content's "healthy" sabotages
// read this so a hot source sits low on the knob and a passive bass sits high —
// the whole point of per-source levels. Change a source's dBu and update here.
// Per-CHANNEL healthy gain for the MX-8 base: band on 1-4, empty inputs on 5-6
// (gain 0), playback on the 7/8 stereo pair (index 6). Playback used to be index
// 4 (the MX-6 5/6); it moved to 6 when the base grew to 8 inputs.
const HEALTHY_GAIN_BY_CH = [0.48, 0.42, 0.77, 0.23, 0, 0, 0.20];
window.srcDbuFor = srcDbuFor;
window.HEALTHY_GAIN_BY_CH = HEALTHY_GAIN_BY_CH;
// The gain knob that lands a source at nominal (+4 dBu) from its connector level:
// gain = (4 - dbu) / 60. Reproduces HEALTHY_GAIN_BY_CH for the original band and
// derives the healthy knob for any new input (e.g. the 16-input band) from its dbu.
const healthyGain = (dbu) => Math.max(0.05, Math.min(1, (4 - (dbu != null ? dbu : SRC_DBU_DEFAULT)) / 60));
window.healthyGain = healthyGain;
// Preamp: the knob IS the dB. 0..60 dB of gain, linear-in-dB like a real
// trim pot, and matching the diagnostic's existing "gain x 60 dB" label.
const preampDb = (g) => g * 60;
// Control tapers: piecewise linear-in-dB through the printed marks of real
// controls. 100 mm fader: +10 at the top, unity (0 dB) at ~75% of travel,
// log all the way down to off.
const FADER_TAPER = [[0, -Infinity], [0.08, -55], [0.18, -40], [0.28, -30], [0.38, -20], [0.50, -10], [0.62, -5], [0.75, 0], [0.87, 5], [1, 10]];
// Rotary send/trim pots (aux sends, aux masters, speaker input trims):
// off at 0, unity at ~75% (about 2 o'clock), a few dB in hand at the top.
const KNOB_TAPER = [[0, -Infinity], [0.10, -30], [0.30, -16], [0.50, -10], [0.75, 0], [1, 6]];
function taperDb(v, taper) {
  if (v == null || v <= 0.005) return -Infinity;
  if (v >= 1) return taper[taper.length - 1][1];
  for (let i = 1; i < taper.length; i++) {
    const x1 = taper[i - 1][0], y1 = taper[i - 1][1];
    const x2 = taper[i][0], y2 = taper[i][1];
    if (v <= x2) {
      // The bottom segment glides out of a finite floor instead of -∞ so a
      // barely-open control passes a barely-there signal, not silence.
      if (y1 === -Infinity) { const yF = y2 - 25; return yF + (v - x1) / (x2 - x1) * (y2 - yF); }
      return y1 + (v - x1) / (x2 - x1) * (y2 - y1);
    }
  }
  return taper[taper.length - 1][1];
}
const faderGain = (v) => { const d = taperDb(v, FADER_TAPER); return d === -Infinity ? 0 : dbToLin(d); };
const knobGain = (v) => { const d = taperDb(v, KNOB_TAPER); return d === -Infinity ? 0 : dbToLin(d); };
window.faderGainDb = (v) => taperDb(v, FADER_TAPER);
window.knobGainDb = (v) => taperDb(v, KNOB_TAPER);

function panGains(pan) {
  // Live-sound pan law: panning ATTENUATES the opposite side only. At
  // center (pan = 0.5), both L and R sit at unity — no -3 dB cut. Panning
  // hard left leaves L untouched and drops R to zero. This matches the
  // pan-pot behaviour on most modern digital consoles and DAWs, where the
  // engineer is expected to ride the master fader down to compensate for
  // multiple channels summing hot at center.
  return {
    L: pan <= 0.5 ? 1.0 : 1.0 - (pan - 0.5) * 2,
    R: pan >= 0.5 ? 1.0 : pan * 2,
  };
}

// Digital-surface group helpers (Phase 2). With the default state (no active
// mute group, every DCA at unity) these return the no-op answer for every
// channel, so the analog surface and all existing scenarios compute exactly as
// before. A digital-only fault flips a mute group active or a DCA to zero.
function chMutedByGroup(s, i) {
  const mg = s.muteGroups;
  if (!Array.isArray(mg)) return false;
  for (const grp of mg) {
    if (grp && grp.active && Array.isArray(grp.members) && grp.members.indexOf(i) !== -1) return true;
  }
  return false;
}
function dcaGainFor(s, i) {
  const dcas = s.dcas;
  if (!Array.isArray(dcas)) return 1;
  let g = 1;
  for (const d of dcas) {
    if (d && Array.isArray(d.members) && d.members.indexOf(i) !== -1) g *= faderGain(d.fader != null ? d.fader : 0.75);
  }
  return g;
}

function computeAudio(s, envelope) {
  // PFL = Pre-Fader Listen. The Solo button on a live console is a PFL
  // (or AFL) monitor button — it routes the channel to the engineer's
  // headphone bus only. It does NOT alter the master mix or aux sends.
  // The audience hears the same mix whether or not the engineer is
  // listening to a single channel in their cans. (The destructive
  // "Solo-In-Place" mode that mutes the rest of the mix is a recording-
  // console feature, not a live-sound one.) anyPfl drives the audio
  // engine's monitor override below — when any channel is in PFL the
  // engineer's headphones play just those channels' pre-fader signal,
  // but the master/aux outputs continue normally.
  const anyPfl = s.channels.some(c => c.solo);

  // BASELINE chanIn — the steady-state level the gain SETTING produces,
  // independent of any per-frame envelope. Used by clip block detection,
  // coaching, and anything else that should be stable instead of bouncing
  // with the signal. inputTrim scales the source's amplitude before the
  // preamp acts on it (a quiet talker, a low-output DI). Default 1.0.
  const baselineChanIn = s.channels.map((ch, i) => {
    const srcKey = sourceFor(s, i);
    if (!srcKey) return { level: 0, srcKey: null };
    // Soft input patch: a channel whose input is unassigned in the routing
    // screen is dead even with the cable fine. Identity default never gates.
    if (s.inputPatch && s.inputPatch[i] === 0) return { level: 0, srcKey };
    if (s.sourceMute[srcKey]) return { level: 0, srcKey };
    const srcDef = SOURCES[srcKey];
    // Condensers and ACTIVE DIs need +48V phantom to pass signal. Dynamics and
    // passive DIs work without it. No phantom on a powered input = dead channel.
    if ((srcDef.kind === 'condenser' || srcDef.diActive) && !ch.phantom) return { level: 0, srcKey };
    const trim = ch.inputTrim != null ? ch.inputTrim : 1;
    // Preamp output in real units: this source's connector level plus preamp
    // gain. Each source has its own level (srcDbuFor), so at its healthy gain
    // every channel lands at the same +4 dBu (-18 dBFS) nominal — a passive
    // bass gets there at ~46 dB of gain, a hot keyboard at ~14 dB. Same meter,
    // different knob: real gain staging, with 18 dB of headroom above nominal.
    return { level: dbuToLin(srcDbuFor(srcKey) + preampDb(ch.gain)) * trim, srcKey };
  });

  // INSTANT chanIn — what the meter shows right now, with per-source
  // envelope dynamics applied. Falls back to baseline when no envelope is
  // supplied (during initial render before the animation loop starts).
  const chanIn = baselineChanIn.map(c => {
    if (!c.srcKey || !envelope) return c;
    const f = envelope[c.srcKey];
    if (f == null) return c;
    return { level: c.level * f, srcKey: c.srcKey };
  });

  const post = s.channels.map((ch, i) => {
    if (ch.mute || chMutedByGroup(s, i)) return 0;
    return chanIn[i].level * faderGain(ch.fader) * dcaGainFor(s, i);
  });

  // MAIN MIX ASSIGN (the LR / MAIN routing button). A channel only reaches the
  // audience when it is assigned to the main mix. Aux sends are deliberately NOT
  // gated by this: an unassigned channel can still be loud in a monitor mix,
  // which is exactly what makes the fault confusing on a real desk — the
  // performer hears themselves fine and insists the channel works, but the room
  // gets nothing. `post` itself is left alone so the channel's own meter keeps
  // reading; the fader IS working, the signal just isn't routed anywhere.
  // Defaults to assigned, so every existing lesson and scenario is unchanged.
  const toMain = s.channels.map((ch) => (ch.toMain === false ? 0 : 1));
  // PRE-FADER vs POST-FADER aux sends. Pre-fader is the default and the standard
  // for monitor mixes: the send is taken BEFORE the channel fader, so riding the
  // fader for the room never changes what the performer hears. Post-fader follows
  // the channel fader, which is what a recording or stream feed wants. Stored per
  // aux bus on the master section (state.master.auxPost[n]); absent = pre-fader.
  const auxIsPost = (n) => !!(s.master && s.master.auxPost && s.master.auxPost[n]);
  const auxFeed = (n, i) => (auxIsPost(n) ? post[i] : chanIn[i].level);

  // POWER SUMMING. Different sources (a voice, a bass, a keyboard) are
  // uncorrelated signals, and uncorrelated signals don't stack amplitude-to-
  // amplitude — their POWERS add, so the combined level grows as the square
  // root of the sum of squares (+3 dB per doubling, not +6). Straight
  // amplitude addition is the worst case and only happens when two channels
  // carry the SAME signal. This is the real reason a real console can run
  // every channel at unity without the mix bus clipping: five channels at
  // nominal sum to ~+7 dB over one channel, comfortably inside the bus
  // headroom, not +14. (Real desks also carry ~20 dB of bus headroom, and
  // digital desks sum in floating point — but the uncorrelated-summing math
  // is the dominant effect and the honest one to model.) Per-source
  // contributions further down stay linear: each source's own level at a
  // destination is unaffected by what the other channels are doing.
  let mixL2 = 0, mixR2 = 0;
  for (let i = 0; i < s.channels.length; i++) {
    const g = panGains(s.channels[i].pan);
    const vL = post[i] * g.L * toMain[i];
    const vR = post[i] * g.R * toMain[i];
    mixL2 += vL * vL;
    mixR2 += vR * vR;
  }
  const mixL = Math.sqrt(mixL2);
  const mixR = Math.sqrt(mixR2);
  // MAIN MIX BUS — the signal that leaves the desk, post-master-fader but
  // BEFORE any downstream PA gear. This is what the console's L/R master
  // meter should show. It is independent of PA speaker on/off, mute, or
  // volume: that's downstream of the desk. Likewise the per-channel
  // post-fader meters (audio.post) are independent of master and PA — that's
  // why the channel still meters when the master is down.
  // Mixer power gate. When the console is off, no signal leaves the desk,
  // no matter how the channels and master are set. The post-fader meters
  // and channel meters still show what WOULD be on the wire so the
  // engineer can verify their setup before flipping the power on.
  const mixerOn = s.mixer ? s.mixer.on !== false : true;
  const masterGate = (s.master.mute || !mixerOn) ? 0 : faderGain(s.master.fader);
  const mainBusL = mixL * masterGate;
  const mainBusR = mixR * masterGate;

  const o = s.outputs;
  const topo = s.topology || DEFAULT_TOPOLOGY;
  const passivePA = topo.paRig === 'amp+passive';
  const ampOn = !passivePA || (o.amp && o.amp.on);
  const paGate = ampOn ? 1 : 0;
  // In passive mode the speakers have no power switch of their own — the
  // external amp powers them. So ignore the speaker's `on` flag and let the
  // amp gate decide. In powered (active) mode each speaker is its own power.
  const paLOn = passivePA ? true : o.pa_l.on;
  const paROn = passivePA ? true : o.pa_r.on;

  // Aux master gains — each aux send bus has a master level knob on the console
  // before it leaves the desk (in addition to per-channel aux send + destination volume).
  const aux1MasterGain = knobGain(s.master.aux1 != null ? s.master.aux1 : 0.75);
  const aux2MasterGain = knobGain(s.master.aux2 != null ? s.master.aux2 : 0.75);
  const aux3MasterGain = knobGain(s.master.aux3 != null ? s.master.aux3 : 0.75);
  const aux4MasterGain = knobGain(s.master.aux4 != null ? s.master.aux4 : 0.75);

  const aux1 = s.channels.map((ch, i) => {
    if (ch.mute || chMutedByGroup(s, i)) return 0;
    // PFL does NOT gate aux sends — the band's monitor mix keeps playing
    // regardless of what the engineer is listening to in their cans. (A DCA
    // does NOT scale the aux send: monitor sends are pre-fader, so the DCA's
    // fader only rides the main-mix path.)
    return auxFeed(1, i) * knobGain(ch.aux1);
  });
  // AUX 1 / AUX 2 SEND BUSES — sum of all channels' aux send levels through
  // the per-bus master send. These represent what's leaving the desk on each
  // aux output, independent of the downstream wedge speaker. Wedge LED meters
  // get the post-speaker value (wedge / wedge2 below); any desk-side aux
  // meter would read wedgeMix / wedge2Mix.
  // Aux send buses also stop leaving the desk when the mixer is off.
  // Aux buses power-sum too (same uncorrelated-sources math as the main mix).
  const wedgeMix = Math.sqrt(aux1.reduce((a, b) => a + b * b, 0)) * aux1MasterGain * (mixerOn ? 1 : 0);

  const aux2 = s.channels.map((ch, i) => {
    if (ch.mute || chMutedByGroup(s, i)) return 0;
    // PFL does NOT gate aux 2 either.
    return auxFeed(2, i) * knobGain(ch.aux2);
  });
  const wedge2Mix = Math.sqrt(aux2.reduce((a, b) => a + b * b, 0)) * aux2MasterGain * (mixerOn ? 1 : 0);
  const w2 = o.wedge2 || { on: true, mute: false, volume: 0 };

  // AUX 3 / AUX 4 — on the 16-ch board these are the keys player's and drummer's
  // monitor sends (spare/unpatched on the MX-8). Same pre-fader, power-summed,
  // mixer-gated math as aux 1/2.
  const aux3 = s.channels.map((ch, i) => {
    if (ch.mute || chMutedByGroup(s, i)) return 0;
    return auxFeed(3, i) * knobGain(ch.aux3 || 0);
  });
  const wedge3Mix = Math.sqrt(aux3.reduce((a, b) => a + b * b, 0)) * aux3MasterGain * (mixerOn ? 1 : 0);
  const w3 = o.wedge3 || { on: true, mute: false, volume: 0 };

  const aux4 = s.channels.map((ch, i) => {
    if (ch.mute || chMutedByGroup(s, i)) return 0;
    return auxFeed(4, i) * knobGain(ch.aux4 || 0);
  });
  const wedge4Mix = Math.sqrt(aux4.reduce((a, b) => a + b * b, 0)) * aux4MasterGain * (mixerOn ? 1 : 0);
  const w4 = o.wedge4 || { on: true, mute: false, volume: 0 };

  // OUTPUT PATH — two patch points, like the inputs. At FOH, each console
  // output plugs into a snake return channel (outFan: channel 1-6 → output
  // key). At the stage box, each speaker's line plugs into an out port,
  // which IS that snake channel (outPatch: speaker → 1-6). A speaker hears
  // whatever signal rides the channel its line is on — mis-patching either
  // end is real and audible, which is the point of the patching lessons.
  const outFan = s.outFan || DEFAULT_OUT_FAN;
  const outPatch = s.outPatch || DEFAULT_OUT_PATCH;
  const busSignal = { mainL: mainBusL, mainR: mainBusR, aux1: wedgeMix, aux2: wedge2Mix, aux3: wedge3Mix, aux4: wedge4Mix };
  const retSignal = {};
  for (const ch of [1, 2, 3, 4, 5, 6]) {
    const outKey = outFan[ch];
    retSignal[ch] = outKey ? (busSignal[outKey] || 0) : 0;
  }
  const sigAt = (spk) => outPatch[spk] ? (retSignal[outPatch[spk]] || 0) : 0;
  // Per-speaker gain chains (on/mute/volume + amp gate for the PA boxes).
  // The 1.3 PA multiplier sits below the previous 1.7 so a typical
  // multi-channel mix at default settings doesn't park the speaker LED in
  // the red; wedges run their own 1.6 amp gain.
  // The wedge EQs cost level as well as loop gain (eqLevelGain): cutting a
  // band takes that band's energy out of the monitor, so deep or wholesale
  // cuts audibly shrink the wedge. Ring out surgically.
  const wedgeEqGain = eqLevelGain(o.wedge);
  const wedge2EqGain = eqLevelGain(w2);
  const wedge3EqGain = eqLevelGain(w3);
  const wedge4EqGain = eqLevelGain(w4);
  // The speaker "volume" knob is a powered box's input trim (a real rotary
  // taper, unity at ~75%); the fixed 1.3 / 1.6 constants are the amp stages'
  // gain expressed in the linear domain.
  const spkChain = {
    pa_l: paLOn && !o.pa_l.mute ? knobGain(o.pa_l.volume) * 1.3 * paGate : 0,
    pa_r: paROn && !o.pa_r.mute ? knobGain(o.pa_r.volume) * 1.3 * paGate : 0,
    wedge: o.wedge.on && !o.wedge.mute ? knobGain(o.wedge.volume) * 1.6 * wedgeEqGain : 0,
    wedge2: w2.on && !w2.mute ? knobGain(w2.volume) * 1.6 * wedge2EqGain : 0,
    wedge3: w3.on && !w3.mute ? knobGain(w3.volume) * 1.6 * wedge3EqGain : 0,
    wedge4: w4.on && !w4.mute ? knobGain(w4.volume) * 1.6 * wedge4EqGain : 0,
  };
  // SPEAKER OUTPUTS — patched bus × the speaker's own chain. This is what
  // each box is actually producing; the on-speaker LED meter reads from
  // this. Turning a speaker down does NOT silence the desk-side meters.
  const paL = sigAt('pa_l') * spkChain.pa_l;
  const paR = sigAt('pa_r') * spkChain.pa_r;
  const wedge = sigAt('wedge') * spkChain.wedge;
  const wedge2 = sigAt('wedge2') * spkChain.wedge2;
  const wedge3 = sigAt('wedge3') * spkChain.wedge3;
  const wedge4 = sigAt('wedge4') * spkChain.wedge4;

  const contributions = {};
  const mixerGateNum = mixerOn ? 1 : 0;
  for (const srcKey of Object.keys(SOURCES)) {
    let cL = 0, cR = 0, cA1 = 0, cA2 = 0, cA3 = 0, cA4 = 0;
    for (let i = 0; i < s.channels.length; i++) {
      if (chanIn[i].srcKey !== srcKey) continue;
      const ch = s.channels[i];
      const g = panGains(ch.pan);
      cL += post[i] * g.L * toMain[i];
      cR += post[i] * g.R * toMain[i];
      cA1 += aux1[i];
      cA2 += aux2[i];
      cA3 += aux3[i];
      cA4 += aux4[i];
    }
    // This source's level on each desk bus (linear per source — power
    // summing applies to the combined bus, not to one source's own level),
    // then mapped through BOTH output patch points to each speaker.
    const srcBus = {
      mainL: cL * masterGate,
      mainR: cR * masterGate,
      aux1: cA1 * aux1MasterGain * mixerGateNum,
      aux2: cA2 * aux2MasterGain * mixerGateNum,
      aux3: cA3 * aux3MasterGain * mixerGateNum,
      aux4: cA4 * aux4MasterGain * mixerGateNum,
    };
    const srcRet = {};
    for (const ch of [1, 2, 3, 4, 5, 6]) {
      const outKey = outFan[ch];
      srcRet[ch] = outKey ? (srcBus[outKey] || 0) : 0;
    }
    contributions[srcKey] = {
      pa_l: (outPatch.pa_l ? (srcRet[outPatch.pa_l] || 0) : 0) * spkChain.pa_l,
      pa_r: (outPatch.pa_r ? (srcRet[outPatch.pa_r] || 0) : 0) * spkChain.pa_r,
      wedge: (outPatch.wedge ? (srcRet[outPatch.wedge] || 0) : 0) * spkChain.wedge,
      wedge2: (outPatch.wedge2 ? (srcRet[outPatch.wedge2] || 0) : 0) * spkChain.wedge2,
      wedge3: (outPatch.wedge3 ? (srcRet[outPatch.wedge3] || 0) : 0) * spkChain.wedge3,
      wedge4: (outPatch.wedge4 ? (srcRet[outPatch.wedge4] || 0) : 0) * spkChain.wedge4,
    };
  }

  // PFL bus — the engineer's headphone bus. Sum of pre-fader signals of
  // every PFL-engaged channel, weighted by source. Keyed by source key so
  // the audio engine can play the same per-source synth chains it uses for
  // destination monitoring. Pre-fader, so the fader position of a soloed
  // channel doesn't change what's in the engineer's cans.
  const pflBus = {};
  let pflTotal = 0;
  // PFL listens through the console's preamps and headphone amp. With the
  // console powered off, that whole path is dead, so PFL produces nothing.
  for (let i = 0; mixerOn && i < s.channels.length; i++) {
    if (!s.channels[i].solo) continue;
    const k = chanIn[i].srcKey;
    if (!k) continue;
    pflBus[k] = (pflBus[k] || 0) + chanIn[i].level;
    pflTotal += chanIn[i].level;
  }

  return {
    chanIn: chanIn.map(c => c.level),
    chanInBaseline: baselineChanIn.map(c => c.level),
    chanInSource: chanIn.map(c => c.srcKey),
    post,
    aux1,
    aux2,
    // mainBus / auxBus = what the desk is sending downstream, post all desk
    // gain stages but BEFORE the speaker's own volume/on/mute. Console-side
    // meters read from these so the desk reflects what it's putting out
    // regardless of what's happening at the speaker.
    mainBus: { L: mainBusL, R: mainBusR },
    // wedgeMix .. wedge4Mix already include their respective aux master gains.
    auxBus:  { wedge: wedgeMix, wedge2: wedge2Mix, wedge3: wedge3Mix, wedge4: wedge4Mix },
    // outputs = what each downstream speaker is actually producing (with the
    // speaker's volume, on/mute, and amp gate folded in). The on-speaker LED
    // meters read from these.
    outputs: { pa_l: paL, pa_r: paR, wedge, wedge2, wedge3, wedge4 },
    // speakerInput = what's ARRIVING at each speaker, BEFORE the speaker's own
    // volume / on / mute. This is what a real powered speaker's "signal" LED
    // shows: signal is reaching the box regardless of where the speaker's
    // volume knob is set. The volume knob is the engineer's room-loudness
    // knob; the LED is "the console is sending me signal."
    speakerInput: {
      pa_l: sigAt('pa_l') * paGate,
      pa_r: sigAt('pa_r') * paGate,
      wedge:  sigAt('wedge'),
      wedge2: sigAt('wedge2'),
      wedge3: sigAt('wedge3'),
      wedge4: sigAt('wedge4'),
    },
    paGate,
    contributions,
    // EQ level multipliers, so detectFeedback can recover the PRE-EQ wedge
    // feed (the loop math applies per-band relief itself).
    eqGain: { wedge: wedgeEqGain, wedge2: wedge2EqGain, wedge3: wedge3EqGain, wedge4: wedge4EqGain },
    // PFL only monitors when the console is powered; an off desk has no live
    // headphone bus, so anyPfl reads false even with a solo button down.
    anyPfl: anyPfl && mixerOn,
    pflBus,
    pflLevel: pflTotal,
    // Legacy alias — code that read `anySolo` should switch to `anyPfl`.
    anySolo: anyPfl && mixerOn,
  };
}

function traceTo(s, srcKey, dest) {
  const stages = [];
  let blocked = false;
  const add = (name, ok, detail, blocking = true) => {
    if (blocked) { stages.push({ name, ok: true, detail: '—', reachable: false }); return; }
    stages.push({ name, ok, detail, reachable: true });
    if (!ok && blocking) blocked = true;
  };

  const srcDef = SOURCES[srcKey];
  if (!srcDef) return { stages: [], faultStage: -1, level: 0 };

  const srcMuted = s.sourceMute[srcKey];
  add('Source', !srcMuted, srcMuted ? `${srcDef.label} muted` : `${srcDef.label} live`);

  const stagePort = s.cables[srcKey];
  const stageValid = stagePort >= 1 && stagePort <= s.channels.length;
  add('Stage Box', stageValid, stageValid ? `port ${stagePort}` : 'cable unplugged');

  const ch = stageValid ? (s.fanOut ? s.fanOut[stagePort - 1] : stagePort) : 0;
  const valid = ch >= 1 && ch <= s.channels.length;
  add('Fan-Out', valid, valid ? `→ Ch ${ch}` : 'no channel patched');
  const channel = valid ? s.channels[ch - 1] : null;

  if (srcDef.kind === 'condenser' || srcDef.diActive) {
    add('+48V', channel ? channel.phantom : false, channel?.phantom ? 'phantom on' : 'needs +48V');
  } else {
    add('+48V', true, srcDef.kind === 'di' ? 'n/a · passive DI' : srcDef.kind === 'dynamic' ? 'n/a · dynamic' : 'n/a · line', false);
  }

  add('Gain', channel ? channel.gain > 0.05 : false, channel ? (channel.gain <= 0.05 ? 'preamp at 0' : `${Math.round(channel.gain * 60)} dB`) : '—');
  add('Mute', channel ? !channel.mute : false, channel ? (channel.mute ? 'channel muted' : 'unmuted') : '—');

  // PFL (Solo) is a monitor-only function — it routes the channel to the
  // engineer's headphones without affecting the master mix. So we no
  // longer add a "Solo" stage to the signal-flow trace. The PFL state is
  // a cans-side concern, not a mix-side fault.

  const op = s.outPatch || DEFAULT_OUT_PATCH;
  const ofan = s.outFan || DEFAULT_OUT_FAN;
  // Full output-path check: the desk output must be on a snake return AND
  // the speaker's line must be on the channel carrying it.
  const outPathDetail = (spk, wantOut) => {
    const ch = op[spk];
    if (!ch) return { ok: false, detail: 'line unplugged' };
    const carries = ofan[ch];
    if (carries !== wantOut) return { ok: false, detail: 'snake ' + ch + ' carries ' + (carries ? OUT_PORT_LABELS[carries] : 'nothing') };
    return { ok: true, detail: 'snake ' + ch };
  };
  if (dest === 'wedge') {
    add('Aux 1', channel ? channel.aux1 > 0.05 : false, channel ? (channel.aux1 <= 0.05 ? 'aux 1 at 0' : `${Math.round(channel.aux1 * 100)}%`) : '—');
    const wp = outPathDetail('wedge', 'aux1');
    add('Wedge Out', wp.ok && s.outputs.wedge.on && !s.outputs.wedge.mute,
      !wp.ok ? wp.detail : !s.outputs.wedge.on ? 'wedge off' : s.outputs.wedge.mute ? 'wedge muted' : 'powered');
    add('Wedge Vol', s.outputs.wedge.volume > 0.05, s.outputs.wedge.volume <= 0.05 ? 'volume down' : `${Math.round(s.outputs.wedge.volume * 100)}%`);
  } else if (dest === 'wedge2') {
    add('Aux 2', channel ? channel.aux2 > 0.05 : false, channel ? (channel.aux2 <= 0.05 ? 'aux 2 at 0' : `${Math.round(channel.aux2 * 100)}%`) : '—');
    const w2 = s.outputs.wedge2 || { on: true, mute: false, volume: 0 };
    const w2p = outPathDetail('wedge2', 'aux2');
    add('Wedge Out', w2p.ok && w2.on && !w2.mute,
      !w2p.ok ? w2p.detail : !w2.on ? 'wedge off' : w2.mute ? 'wedge muted' : 'powered');
    add('Wedge Vol', w2.volume > 0.05, w2.volume <= 0.05 ? 'volume down' : `${Math.round(w2.volume * 100)}%`);
  } else if (dest === 'wedge3' || dest === 'wedge4') {
    const n = dest === 'wedge3' ? 3 : 4;
    const auxKey = 'aux' + n;
    const auxVal = channel ? (channel[auxKey] || 0) : 0;
    add('Aux ' + n, auxVal > 0.05, channel ? (auxVal <= 0.05 ? 'aux ' + n + ' at 0' : `${Math.round(auxVal * 100)}%`) : '—');
    const wN = s.outputs[dest] || { on: true, mute: false, volume: 0 };
    const wNp = outPathDetail(dest, auxKey);
    add('Wedge Out', wNp.ok && wN.on && !wN.mute,
      !wNp.ok ? wNp.detail : !wN.on ? 'wedge off' : wN.mute ? 'wedge muted' : 'powered');
    add('Wedge Vol', wN.volume > 0.05, wN.volume <= 0.05 ? 'volume down' : `${Math.round(wN.volume * 100)}%`);
  } else if (dest === 'pa') {
    add('Fader', channel ? channel.fader > 0.05 : false, channel ? (channel.fader <= 0.001 ? 'at -∞' : faderDb(channel.fader)) : '—');
    if (channel) {
      const p = channel.pan;
      const panLbl = p < 0.45 ? `L${Math.round((0.5 - p) * 200)}` : p > 0.55 ? `R${Math.round((p - 0.5) * 200)}` : 'C';
      add('Pan', true, panLbl, false);
    } else add('Pan', false, '—');
    add('Master', !s.master.mute, s.master.mute ? 'master muted' : 'open');
    add('Mix', s.master.fader > 0.05, s.master.fader <= 0.001 ? 'at -∞' : faderDb(s.master.fader));
    const topo = s.topology || DEFAULT_TOPOLOGY;
    if (topo.paRig === 'amp+passive') {
      add('Amp', s.outputs.amp && s.outputs.amp.on, s.outputs.amp && s.outputs.amp.on ? 'powered' : 'amp off');
    }
    const paLOk = outPathDetail('pa_l', 'mainL').ok && s.outputs.pa_l.on && !s.outputs.pa_l.mute;
    const paROk = outPathDetail('pa_r', 'mainR').ok && s.outputs.pa_r.on && !s.outputs.pa_r.mute;
    add('PA Out', paLOk || paROk, paLOk && paROk ? 'L + R live' : paLOk ? 'L only' : paROk ? 'R only' : 'PA silent');
    add('PA Vol', (paLOk && s.outputs.pa_l.volume > 0.05) || (paROk && s.outputs.pa_r.volume > 0.05),
      `L ${Math.round(s.outputs.pa_l.volume * 100)}% · R ${Math.round(s.outputs.pa_r.volume * 100)}%`);
  }

  const audio = computeAudio(s);
  const c = audio.contributions[srcKey] || {};
  let level = 0;
  if (dest === 'pa') level = Math.max(c.pa_l, c.pa_r);
  else if (dest === 'wedge') level = c.wedge;
  else if (dest === 'wedge2') level = c.wedge2;
  else if (dest === 'wedge3') level = c.wedge3;
  else if (dest === 'wedge4') level = c.wedge4;

  return { stages, faultStage: stages.findIndex(s => !s.ok && s.reachable), level };
}

function faderDb(v) {
  // Reads the REAL fader taper, so the diagnostic string matches the printed
  // scale beside the fader (0.75 travel = unity = 0.0 dB, top = +10).
  const db = taperDb(v, FADER_TAPER);
  if (db === -Infinity) return '-∞';
  return db >= 0 ? `+${db.toFixed(1)} dB` : `${db.toFixed(1)} dB`;
}

function checkWin(s, conditions) {
  const audio = computeAudio(s);
  for (const c of conditions) {
    const cont = audio.contributions[c.source];
    if (!cont) return false;
    let lvl;
    if (c.dest === 'pa') lvl = Math.max(cont.pa_l, cont.pa_r);
    else lvl = cont[c.dest] || 0;
    if (c.min != null && lvl < c.min) return false;
    if (c.max != null && lvl > c.max) return false;
    if (c.min == null && c.max == null && lvl < 0.3) return false;
  }
  return true;
}

// LEVELS and the Practice Mode fault pool live in content.js (loaded as a
// plain <script> before this block, setting window.LEVELS / window.PRACTICE /
// window.PRACTICE_FAULTS). Split out so new faults and scenarios drip in by
// editing one small data file, not this app shell. Append-only: never
// renumber existing ids (progress is saved by id).

// Clip detection across the signal chain. "In the red" on any meter means
// the engineer is over-driving that stage — distortion in real life, which
// is unacceptable for a working mix. Returns a list of active clip events;
// empty list means everything's clean. Different stages call for different
// fixes, and the message we surface to the user is stage-specific so they
// learn which knob to reach for.
//
// Thresholds are tuned to roughly match "red lights showing on the rendered
// meter" — the underlying value × the display gain multiplier crosses ~0.95.
//
// Returned shape (per active clip):
//   { stage: 'channel' | 'master' | 'speaker',
//     id: number | string,         // channel idx (0-based) or 'L'/'R' or 'pa_l' etc.
//     label: string,               // human label for the chip
//     fix: string }                // short instruction telling the user what to do
function detectClipping(audio, state) {
  // Walk the chain UPSTREAM → DOWNSTREAM and stop at the first stage that's
  // hot. Each stage has its OWN gain control; clipping at one stage can't
  // be fixed by reducing a downstream control. If the preamp is overdriven,
  // pulling the fader down just attenuates a signal that's already
  // distorted — the harmonic content was generated upstream. So we surface
  // the upstream-most clipping stage and tell the user which knob actually
  // fixes it.
  //
  // Thresholds line up with the METER'S RED ZONE (-3 dBFS = +19 dBu): we only
  // flag distortion once the level is actually in the red, so the warning never
  // fires while every meter still reads amber (which just reads as a bug to the
  // user). Master keeps the 0 dBFS ceiling — by then it is deep in the red.
  //
  //   Preamp   → chanIn baseline > +19 dBu   (-3 dBFS, the red line)
  //   Channel  → post   baseline > +19 dBu   (-3 dBFS)
  //   Master   → mainBus         > +22 dBu   (0 dBFS, the output ceiling)
  //   Speaker  → outputs         > +19 dBu   (-3 dBFS)

  // Stage 1 — PREAMP (channel input after the gain knob). The PFL bar's
  // red zone. Only the GAIN knob fixes this; the fader is downstream and
  // can't undo distortion that's already been baked in.
  //
  // Reads the BASELINE chanIn (no envelope) so the block fires on gain
  // SETTING, not on transient peaks. Real headroom now: the flag fires when
  // the AVERAGE sits above +15 dBu — at that setting the program's peaks
  // (crest factor up to ~13 dB on a vocal) slam the +22 dBu clip point on
  // most syllables, which is unambiguous, audible overdrive. A healthy
  // nominal average (+4 dBu) leaves ~18 dB for peaks and never trips this.
  if (audio && audio.chanInBaseline) {
    const preampClips = [];
    audio.chanInBaseline.forEach((v, i) => {
      if (v > dbuToLin(19)) {
        preampClips.push({
          stage: 'preamp',
          id: i,
          label: `Channel ${i + 1} preamp`,
          fix: 'Turn the GAIN down. The fader can\'t fix an overdriven preamp, because the distortion happens before the fader.',
        });
      }
    });
    if (preampClips.length) return preampClips;
  }

  // Stage 2 — CHANNEL METER (post-fader). Preamp is clean but the fader is
  // pushing the channel into the red, or the combination of gain + fader
  // is hot enough that the meter reads red even though the preamp itself
  // is below its red zone. Same real-units rule as the preamp stage: the
  // flag fires when the post-fader AVERAGE sits above +15 dBu, where the
  // program's peaks are slamming the +22 clip on most syllables.
  if (audio && audio.post) {
    const channelClips = [];
    audio.post.forEach((p, i) => {
      if (p > dbuToLin(19)) {
        channelClips.push({
          stage: 'channel',
          id: i,
          label: `Channel ${i + 1}`,
          fix: 'Turn the channel FADER down. The channel meter is in the red.',
        });
      }
    });
    if (channelClips.length) return channelClips;
  }

  // Stage 3 — MAIN BUS. Channels and faders are clean but the SUMMED
  // signal at the master is too hot. Fix is master fader or coordinated
  // channel backoff.
  if (audio && audio.mainBus) {
    const L = audio.mainBus.L || 0;
    const R = audio.mainBus.R || 0;
    if (L > dbuToLin(DBU_CLIP) || R > dbuToLin(DBU_CLIP)) {
      return [{
        stage: 'master',
        id: L > R ? 'L' : 'R',
        label: 'Master Bus',
        fix: 'Turn the MASTER fader down, or turn down some channel faders. Too many loud channels add up.',
      }];
    }
  }

  // Stage 4 — SPEAKERS. The desk is clean but a speaker is being
  // overdriven by its own volume knob.
  if (audio && audio.outputs) {
    const speakers = [
      { key: 'pa_l',   label: 'Main L',   fix: 'Turn the Main L volume down.' },
      { key: 'pa_r',   label: 'Main R',   fix: 'Turn the Main R volume down.' },
      { key: 'wedge',  label: 'Wedge 1',  fix: 'Turn the Wedge 1 volume down.' },
      { key: 'wedge2', label: 'Wedge 2',  fix: 'Turn the Wedge 2 volume down.' },
      { key: 'wedge3', label: 'Wedge 3',  fix: 'Turn the Wedge 3 volume down.' },
      { key: 'wedge4', label: 'Wedge 4',  fix: 'Turn the Wedge 4 volume down.' },
    ];
    const speakerClips = [];
    for (const s of speakers) {
      const lvl = audio.outputs[s.key] || 0;
      if (lvl > dbuToLin(19)) speakerClips.push({ stage: 'speaker', id: s.key, label: s.label, fix: s.fix });
    }
    if (speakerClips.length) return speakerClips;
  }

  return [];
}

// Phantom power safety check. In real life, slamming +48V on while the
// channel is open and the PA is hot creates a sharp DC transient that pops
// the speakers — bad for tweeters, ribbon mics, and ears. Standard practice
// is to mute the channel (or pull the fader down) BEFORE engaging phantom,
// wait a beat for the capsule to charge, then bring the channel back up.
// This helper looks at the state at the moment the phantom button is hit
// and returns true if engaging phantom right now would pop the rig.
function wouldPopPhantom(s, channelIdx) {
  const ch = s.channels[channelIdx];
  if (!ch) return false;
  const channelOpen = !ch.mute && ch.fader > 0.05;
  const masterOpen  = !s.master.mute && s.master.fader > 0.05;
  const o = s.outputs || {};
  const op = s.outPatch || DEFAULT_OUT_PATCH;
  const ofan = s.outFan || DEFAULT_OUT_FAN;
  // The transient only reaches a speaker over a CONNECTED output path:
  // the speaker's line on a snake channel AND that channel fed by a desk
  // output at the FOH end.
  const pathTo = (spk) => !!(op[spk] && ofan[op[spk]]);
  const paLLive = o.pa_l && o.pa_l.on && !o.pa_l.mute && o.pa_l.volume > 0.05 && pathTo('pa_l');
  const paRLive = o.pa_r && o.pa_r.on && !o.pa_r.mute && o.pa_r.volume > 0.05 && pathTo('pa_r');
  // Wedge can also pop if the channel's aux send is up — same DC transient
  // hits the aux bus.
  const auxOpen = ch.aux1 > 0.05 || ch.aux2 > 0.05 || (ch.aux3 || 0) > 0.05 || (ch.aux4 || 0) > 0.05;
  const wLive = (key, auxVal) => (auxVal || 0) > 0.05 && o[key] && o[key].on && !o[key].mute && o[key].volume > 0.05 && pathTo(key);
  const wedgeLive  = wLive('wedge',  ch.aux1);
  const wedge2Live = wLive('wedge2', ch.aux2);
  const wedge3Live = wLive('wedge3', ch.aux3);
  const wedge4Live = wLive('wedge4', ch.aux4);
  const anyWedgeLive = wedgeLive || wedge2Live || wedge3Live || wedge4Live;
  const speakerLive = paLLive || paRLive || anyWedgeLive;
  return channelOpen && (masterOpen ? speakerLive : anyWedgeLive);
}

// Amp turn-on safety check. Real-world passive rig: console is on, master
// is up, channels are passing signal. The amp is off. Flip the amp on like
// that and a full-level mix slams into the speakers the instant they come
// alive. It's not a DC pop. It's an abrupt loud-signal event: the audience
// gets blasted, and on a hot day the speakers get an unhealthy momentary
// hit. The fix is the power-on sequence: drop the master, flip the amp,
// bring the master back up gently so the level you take to the room is the
// level you chose, not whatever the channels happened to be at.
function wouldBlastOnAmpOn(s) {
  if (!s || !s.master) return false;
  // Mixer off means no signal leaves the desk, so the amp just powers up
  // into silence. Safe.
  if (s.mixer && s.mixer.on === false) return false;
  // Master pulled or muted? Safe to flip the amp.
  if (s.master.mute) return false;
  if (s.master.fader <= 0.1) return false;
  // Master open but no channel is passing signal? Nothing to blast with.
  const anyHotChannel = s.channels && s.channels.some(c => !c.mute && c.fader > 0.05 && c.gain > 0.05);
  if (!anyHotChannel) return false;
  return true;
}

// Mixer turn-on safety check — the ELECTRICAL pop. This is a different failure
// from the amp-on blast. Powering the console on while an amp it feeds (the
// main power amp, or a powered wedge) is already live sends the desk's switch-
// on transient straight into that live amp, and it pops the speakers. It
// happens regardless of the master, muted or not, because it's a DC/switch
// transient, not program level. The fix is the order: always power the console
// on FIRST, before any amp, so there's nothing live to pop into.
function wouldPopOnMixerOn(s) {
  if (!s || !s.outputs) return false;
  const o = s.outputs;
  const op = s.outPatch || DEFAULT_OUT_PATCH;
  const ofan = s.outFan || DEFAULT_OUT_FAN;
  const topo = s.topology || {};
  // Is a power amp / powered output stage the desk feeds already live?
  // "Feeds" = the full output path is connected: the speaker's line on a
  // snake channel AND that channel plugged into a desk output at FOH (a
  // wedge riding the WRONG output still gets the transient).
  const fed = (spk) => !!(op[spk] && ofan[op[spk]]);
  // A MUTED powered speaker cuts its own input ahead of the driver, so the
  // desk's switch transient has nothing to reproduce — muting the speakers
  // makes a console power toggle safe (you don't have to power them down).
  // In amp+passive mode the passive PAs have no mute of their own (the external
  // amp gates them), so there the amp-on state is what matters.
  const mainLive = topo.paRig === 'amp+passive'
    ? !!(o.amp && o.amp.on && (fed('pa_l') || fed('pa_r')))
    : !!((o.pa_l && o.pa_l.on && !o.pa_l.mute && fed('pa_l')) || (o.pa_r && o.pa_r.on && !o.pa_r.mute && fed('pa_r')));
  const wedgeLive = !!((o.wedge && o.wedge.on && !o.wedge.mute && fed('wedge')) || (o.wedge2 && o.wedge2.on && !o.wedge2.mute && fed('wedge2')));
  return mainLive || wedgeLive;
}

window.SOURCES = SOURCES;
window.DESTINATIONS = DESTINATIONS;
window.SNAKE_COLORS = SNAKE_COLORS;
window.DEFAULT_OUT_FAN = DEFAULT_OUT_FAN;
window.DEFAULT_OUT_PATCH = DEFAULT_OUT_PATCH;
window.OUT_PORT_LABELS = OUT_PORT_LABELS;
window.defaultState = defaultState;

// The full-band MX-16 board (big-desk scenarios). Starts from a healthy default
// board, then swaps in the 14 band inputs patched 1:1 through the input snake
// fan-out (source k -> port i+1 -> channel i+1), plus the FOH playback line on
// the top stereo pair (15/16) — 16 inputs total. Each input's gain is its
// healthy knob (from dbu); condensers + the active bass DI get phantom so they
// pass. The snake is bidirectional, so the six outputs ride the return side's
// own channels 1-6, independent of the input channels.
// 14 real inputs (matching the 14 recorded stems in audio/) — kit is kick, snare,
// rack tom, floor tom, overheads L/R (no hi-hat mic), then bass, electric +
// acoustic guitar, a single mono keys, and the four vocals. Plus the FOH playback
// line on the top stereo pair (15/16), so the full band is a true MX-16: 14
// mics/DIs + playback stereo = 16 inputs. (hi-hat + the stereo keys L/R stay in
// the SOURCES catalog, just unpatched.)
const BAND_KEYS = ['kick','snare','rack','floor','ohl','ohr','bass','egtr','agtr','keys','vx1','vx2','vx3','vx4'];
window.BAND_KEYS = BAND_KEYS;
// Sub-snakes come in standard channel counts, so each head is padded up to the
// next size: drums 7 sources on an 8, backline 4 on a 4, vocals 3 on a 4. The
// padding channels are real inputs, so a mic can be moved into one.
const SUBSNAKE_SIZE = { up: 8, inst: 4, down: 4 };
window.SUBSNAKE_SIZE = SUBSNAKE_SIZE;
// Every band input meters + plays its recorded stem, so it needs the analyser
// tap the meter loop reads. (playback + the four MX-8 sources are already listed.)
BAND_KEYS.forEach((k) => { if (!METER_SOURCES.includes(k)) METER_SOURCES.push(k); });
function bandState() {
  const s = defaultState();
  // The FOH playback line IS present on this desk, on the top stereo pair, so
  // the band is a true MX-16 (14 band inputs + playback stereo = 16 inputs).
  s.noPlayback = false;
  const monoChannels = BAND_KEYS.map((k, i) => {
    const src = SOURCES[k];
    const needsPhantom = src.kind === 'condenser' || !!src.diActive;
    return makeChannel({ id: i + 1, label: src.short, gain: healthyGain(src.dbu), fader: 0.6, pan: 0.5, phantom: needsPhantom });
  });
  // FOH playback line: a stereo strip on the desk's top pair (15/16), exactly
  // like the MX-8's 7/8 — hardwired at FOH, so it's not on the input snake.
  const pb = SOURCES.playback;
  const playbackCh = makeChannel({ id: BAND_KEYS.length + 1, label: '', gain: healthyGain(pb.dbu), stereo: true, fader: 0.70, pan: 0.5 });
  s.channels = [...monoChannels, playbackCh];
  s.cables = {}; BAND_KEYS.forEach((k, i) => { s.cables[k] = i + 1; });
  // micIn[k] = which INPUT SLOT (local channel) on its sub-snake the mic for
  // source k is plugged into. Default is the natural 1:1 slot. This is the
  // stage-end patch; cables[k] stays the box channel the signal lands on. A mic
  // swap trades both micIn and cables between two sources (the mic follows its
  // conductor to the box), which models "kick plugged into the snare's input".
  s.micIn = {}; { const cnt = {}; BAND_KEYS.forEach((k) => { const sn = (SOURCES[k] || {}).snake; if (!sn) return; cnt[sn] = (cnt[sn] || 0) + 1; s.micIn[k] = cnt[sn]; }); }
  s.fanOut = BAND_KEYS.map((_, i) => i + 1);
  s.sourceMute = {}; BAND_KEYS.forEach((k) => { s.sourceMute[k] = false; });
  s.sourceMute.playback = false;
  // Bidirectional snake: the return side is its own bundle numbered from 1, so
  // the six outputs ride return channels 1-6 no matter how many inputs there are.
  s.outFan = { ...DEFAULT_OUT_FAN };
  s.outPatch = { ...DEFAULT_OUT_PATCH };
  s.testing = 'kick';
  s.inspect = 'pa';
  // The desk is running the big (16-channel) source set. This flag — not the
  // ?band=1 URL — is what drives the direct-to-DOM meters, the steady audible
  // gains, and skipping the per-frame re-render, so those apply whenever the
  // 16-channel desk is active (via the size selector, on any environment).
  // The desk comes up patched in order (CH n <- IN n), so the patch list is
  // as long as the desk and a re-patch never has to invent the tail.
  s.inputPatch = s.channels.map((_, i) => i + 1);
  s.big16 = true;
  return s;
}
window.bandState = bandState;
window.computeAudio = computeAudio;
window.traceTo = traceTo;
window.checkWin = checkWin;
window.sourceFor = sourceFor;
window.faderDb = faderDb;
// Plug-pop safety check. Plugging an XLR into a hot input — the rig is on,
// the channel is unmuted, the master is up, a speaker is live — sends a
// connector-contact transient straight to the PA. Same speaker-killing
// pop as the phantom one, same UX (POPPED, reset required). The check
// here mirrors wouldPopPhantom's logic but reasons about the channel
// that the NEWLY PATCHED port will land on, not a static channelIdx.
function wouldPopOnPlug(s, srcKey, newPort) {
  if (!newPort || newPort < 1) return false; // 0 = unplug, no plug-in pop
  const fanOut = s.fanOut || [1, 2, 3, 4];
  const ch1Based = fanOut[newPort - 1];
  if (!ch1Based) return false;
  return wouldPopPhantom(s, ch1Based - 1);
}

// PA stereo balance. In a real venue the L and R speakers should match —
// same level, same on/mute state — so the audience hears a coherent
// stereo image. If the master is open and the two PAs aren't symmetric,
// flag it. Returns null when balanced or when the PA is silent overall.
function detectPaBalanceIssue(s) {
  if (!s || !s.outputs) return null;
  const masterOpen = !s.master.mute && s.master.fader > 0.05;
  if (!masterOpen) return null;
  const pl = s.outputs.pa_l;
  const pr = s.outputs.pa_r;
  if (!pl || !pr) return null;
  const lActive = pl.on && !pl.mute;
  const rActive = pr.on && !pr.mute;
  // Both PAs silenced — engineer deliberately killed the rig. Not a balance fault.
  if (!lActive && !rActive) return null;
  if (lActive !== rActive) {
    return {
      stage: 'pa_balance',
      label: 'PA Balance',
      fix: lActive
        ? 'Main R is off. Turn it on and match Main L\'s level so the audience hears a balanced stereo mix.'
        : 'Main L is off. Turn it on and match Main R\'s level so the audience hears a balanced stereo mix.',
    };
  }
  const diff = Math.abs(pl.volume - pr.volume);
  if (diff > 0.05) {
    return {
      stage: 'pa_balance',
      label: 'PA Balance',
      fix: `Main L: ${Math.round(pl.volume * 100)}%, Main R: ${Math.round(pr.volume * 100)}%. Match them so the audience hears a balanced stereo mix.`,
    };
  }
  return null;
}

// Gain-staging coaching — meter-driven (not knob-driven) so the logic
// stays correct when realistic samples replace the synthesized test signal.
// Each pattern asks: "is any stage's meter outside its healthy band?" and
// surfaces a plain-English explanation of why fixing it at the WRONG stage
// is a problem. Returns an array of coaching messages, possibly empty.
function detectGainStagingMistakes(state, audio, level) {
  if (!audio || !state || !level) return [];
  const mistakes = [];
  const baseline = audio.chanInBaseline || audio.chanIn || [];
  const involved = (window.deriveInvolves ? window.deriveInvolves(level) : []) || [];
  // Healthy chanIn band (linear amplitude, baseline / steady-state).
  // Tuned to the existing app's chanIn calibration so default gain settings
  // (chanIn ≈ 0.955) sit comfortably inside the healthy band. Only LOW-side
  // coaching fires here; a hot-but-not-clipping meter is not scolded (the
  // meter is the skill, and actual clipping is the clip detector's job).
  // The hot_channel rule was removed at Kyle's direction on launch day.
  const COLD = 0.55;              // ~3.5 dB under nominal: audibly weak input

  // Per-involved-channel checks
  for (const chNum of involved) {
    const idx = chNum - 1;
    if (idx < 0 || idx >= baseline.length) continue;
    const ch = state.channels[idx];
    if (!ch || ch.mute) continue;
    const lvl = baseline[idx] || 0;
    // Skip channels not producing meaningful signal at the preamp (no source
    // patched, condenser without phantom, etc.). Coaching only applies once
    // there is signal at the channel input.
    if (lvl < 0.05) continue;

    if (lvl < COLD && ch.gain < 0.85) {
      mistakes.push({
        kind: 'cold_channel',
        message: 'Channel ' + chNum + '\'s meter is barely registering, but the audience can still hear the channel. Something later in the chain got turned up to compensate, and that boosts noise and hiss along with the signal. Turn GAIN up until the channel\'s own meter sits in the healthy zone, then bring the other controls back to normal.',
      });
    } else if (lvl < COLD + 0.10 && ch.gain >= 0.85) {
      mistakes.push({
        kind: 'source_limited',
        message: 'GAIN on Channel ' + chNum + ' is near max but the channel meter is still sitting low. The source is the limit. Fix it at the source: get the performer closer to the mic, switch to a more sensitive mic, or check placement. Until then, use the fader to balance the channel against the band.',
      });
    }
  }

  // Master fader too hot. The master sits near unity (0.75 in this sim);
  // above ~0.90 is the engineer using it as makeup gain.
  if (state.master && state.master.fader > 0.90) {
    mistakes.push({
      kind: 'hot_master',
      message: 'The master fader is pushed near the top. It normally sits at its unity mark. If the mix is too quiet with the master at a normal position, adjust the amp or speaker level instead. Those get set once for each room.',
    });
  }

  // Speaker volume too hot. Speakers are tuned for the room once and left
  // alone. Mid-show speaker pushes raise loop gain across every mic and
  // shift the tonal balance the rig was tuned for.
  const paLv = (state.outputs && state.outputs.pa_l && state.outputs.pa_l.volume) || 0;
  const paRv = (state.outputs && state.outputs.pa_r && state.outputs.pa_r.volume) || 0;
  if (paLv > 0.90 || paRv > 0.90) {
    mistakes.push({
      kind: 'hot_speakers',
      message: 'A main speaker\'s volume is turned up too high. Speaker level gets set once when the system is tuned for the room, then left alone. Changing it mid-show changes how everything sounds and raises the chance of feedback. If one channel is too quiet, fix that channel. If the whole mix needs to be louder, use the master fader.',
    });
  }

  // Audience hearing-safety. Numbers and exposure framing come from the
  // NIOSH Recommended Exposure Limit (REL): 85 dB / 8 hours, 3 dB exchange
  // rate. Coaching only fires above 100 dB (15-min limit) to avoid alarming
  // about routine concert levels.
  const paOut = (((audio.outputs && audio.outputs.pa_l) || 0) + ((audio.outputs && audio.outputs.pa_r) || 0)) / 2;
  const db = window.dbSplFromPa ? window.dbSplFromPa(paOut) : (50 + 50 * paOut);
  if (db >= 100) {
    const exp = window.nioshExposure ? window.nioshExposure(db) : { text: 'above NIOSH safe limits' };
    mistakes.push({
      kind: 'hearing_safety',
      message: 'The audience is hearing ' + Math.round(db) + ' dB SPL at front-of-house right now (' + exp.text + '). Sustained levels at or above 100 dB SPL cause permanent hearing damage with extended exposure, per the NIOSH Recommended Exposure Limit. Pull the speakers down before you do any more of the show at this level.',
    });
  }

  return mistakes;
}

// Speaker-side patch pop. Plugging a line into a powered speaker — or
// pulling one out — makes a contact transient that the speaker's own
// amplifier plays at full level. It doesn't matter what's on the bus; what
// matters is whether the box is live. Safe procedure: speaker off (or its
// volume down) before its line moves. The channel-side twin of this rule is
// wouldPopPhantom: connecting/disconnecting anything that lands on a console
// channel (source cable, fan-out tail) pops when that CHANNEL's path to a
// live speaker is open.
function speakerLiveForPatch(s, spk) {
  const o = s.outputs || {};
  const box = o[spk];
  if (!box) return false;
  if (spk === 'pa_l' || spk === 'pa_r') {
    const topo = s.topology || {};
    const powered = topo.paRig === 'amp+passive' ? !!(o.amp && o.amp.on) : !!box.on;
    return powered && !box.mute && box.volume > 0.05;
  }
  return !!(box.on && !box.mute && box.volume > 0.05);
}

window.wouldPopPhantom = wouldPopPhantom;
window.wouldBlastOnAmpOn = wouldBlastOnAmpOn;
window.wouldPopOnMixerOn = wouldPopOnMixerOn;
window.speakerLiveForPatch = speakerLiveForPatch;

// Feedback loop detector. Live-sound feedback is a closed loop: a mic picks up
// a speaker it can hear, the desk sends that signal back out the speaker, the
// speaker re-amplifies what the mic heard, round and round until the loop hits
// unity gain and rings. So the thing that drives feedback is how LOUD the mic
// is coming back out of a speaker it can hear — the mic's actual output level
// at that speaker. That already folds in every gain stage: preamp gain, the
// fader/aux send that routes it, the master/aux master, AND the speaker's own
// volume knob. We read those real per-mic output levels straight off the audio
// engine (audio.contributions[src]) so any control that pushes the output past
// the ring threshold trips it, including the speaker volume itself.
//
// Two acoustic paths, different coupling:
//   - WEDGE: points straight back at the mic, so full coupling. This is the
//     usual culprit and rings at a moderate level.
//   - MAINS: face the audience, away from the mic, so weak coupling. They only
//     ring when driven really hard (gain + fader + master + PA volume all hot).
// HPF rolls off the low-frequency stage rumble that builds the loop fastest, so
// engaging it drops the effective loop gain ~40% — often enough on its own to
// drop a ringing wedge back under threshold. Engine field name is `highpass`.
//
// Returns null when safe, or an aggregate when one or more loops are hot:
//   { channelIdx, riskAmount, ringWedge, ringBand, rings: [...] }
// rings lists EVERY hot loop ({ wedge, band, hz, risk }) — in Feedback Mode
// more than one frequency can ring at once, exactly like a real wedge.
// channelIdx/ringWedge/ringBand describe the LOUDEST ring (legacy consumers).
//
// Hysteresis memory, per wedge+band: a loop that has started ringing keeps
// ringing until its gain drops clearly below the onset point — physically
// true (the ring sustains itself) and it stops the warning from strobing
// when a level wobbles right at the threshold. Module-level is safe here:
// every caller in a frame passes the same state.
// Directional mic REJECTION in 3D (the Mic Placement feature). A monitor wedge
// off the mic's front axis is picked up at the mic's polar sensitivity for that
// direction, |a + (1-a)cosθ|, where θ is the 3D angle between the mic axis and
// the direction to the wedge. The student sets θ across two planes: `az` (the
// horizontal angle of the wedge off the mic's front) and `tilt` (the mic's
// vertical tilt; the floor wedge sits FLOOR_DROP below it). θ is the TRUE angle
// between the mic-axis unit vector (tilted up by `tilt`) and the wedge-direction
// unit vector (azimuth `az`, FLOOR_DROP below horizontal), i.e. the spherical
// law of cosines:  cosθ = cos(tilt)·cos(FLOOR_DROP)·cos(az) - sin(tilt)·sin(FLOOR_DROP).
// (The old cos(az)·cos(tilt+FLOOR_DROP) was NOT a real 3D angle: off-axis it
// inverted the tilt effect, so tilting the null onto a rear wedge made feedback
// WORSE — the bug this replaces.) a: cardioid .5 / super .375 / hyper .25 sets
// where the null falls (cardioid straight back at 180°, super ~125°, hyper ~110°,
// with super/hyper keeping a live rear lobe behind — a hyper pointed rear-at-wedge
// is worse than a super). POLAR_FLOOR 0.045 (~ -27 dB): a real null is deep but
// never truly -inf (mfrs spec -15..-25 dB rear, best case a little past that).
const MIC_A3 = { cardioid: 0.5, super: 0.375, hyper: 0.25 };
const POLAR_FLOOR = 0.045;
// Degrees the floor wedge sits below the mic. Derived from a surveyed scene, not
// from one company's spec sheet.
//
// A wedge's angle is quoted FLOOR to BAFFLE PLANE. Normalising every figure to
// that one definition, and computing it from the cabinet where a brand publishes
// only dimensions:
//   EAW MicroWedge MW12   27 deg published, 37 from its own drawing (13.1"H/17.3"D)
//   Rat Sound MicroWedge  31 from dimensions (13"H/22"D)
//   Meyer Sound MJF-212A  40 ("enclosure front angle")
//   Martin Audio LE400C   40 one way up, 50 flipped ("angle of fire")
//   Electro-Voice PXM-12MP 55 ("monitor floor angle")
// Seven purpose-built wedges across six companies: mean 40, median 40, range
// 27-55. Practitioners quote 30/40/45/50/55/60 as the set, with 40 and 50 "the
// usual pair" chosen by how far back the performer stands. So the scene uses 40.
//
// JBL's 50 is deliberately NOT the anchor (Kyle 2026-07-24). It sits at the top
// of the range, and the SRX812 is a main speaker with a monitor facet rather than
// a purpose-built wedge. Including it anyway barely moves the average (41.2).
//
// A 40 deg cabinet, 17" deep by 14" tall, aimed so its axis lands on an ear at
// 1.60 m, sits 3.9 ft in front of the performer, inside the 3-to-6 ft the
// placement guidance gives. With the capsule 0.15 m in front of the mouth at
// 1.52 m, that puts the wedge 55 deg below the capsule.
//
// 70, and the number is not free: it falls out of the cabinet. A wedge is pinned
// by two real things, its baffle angle and the fact that its axis has to land on
// the singer's ear, and solving those together puts a LOW-PROFILE wedge (27 deg,
// the EAW MicroWedge figure, with Rat Sound at 31) tight to the singer and firing
// steeply up: 0.75 m in front of the ear, 70 deg below the capsule. A deep 40-50
// deg cabinet has to sit 1.2 to 1.5 m out to hit the same ear, which drops it to
// 49-55 deg below.
//
// That geometry is the whole teaching point (Kyle 2026-07-24). At 70 deg below,
// with the mic angled up at the mouth, the wedge sits ~120 deg off axis, where a
// supercardioid rejects 12 dB harder than a cardioid and a HYPERCARDIOID 6 dB
// harder — so both beat a cardioid, which is why a hypercardioid is worth
// reaching for. At the old 55 the wedge sat ~135 deg off axis, past a
// hypercardioid's 110 deg null and back up its rear lobe, so a hyper read 5.6 dB
// WORSE than a cardioid and the panel argued against the pattern Kyle recommends.
// Level the mic and the wedge lands on the hyper's null exactly; tilt well up and
// a cardioid takes over. The right pattern depends on where the wedge is, which
// is still the point.
//
// Normalisation makes this safe for existing lessons: micRejection3D divides by
// REF_REJ, the DEFAULT setup, so a default mic reads 1.0 at any FLOOR_DROP. Only
// deliberately-changed patterns and tilts move.
// FLOOR_DROP is no longer one number, because the wedge is no longer one wedge
// (Kyle 2026-07-24). Which pattern wins depends on the CABINET as much as on the
// mic, so the wedge is now switchable between three real, documented monitors and
// the whole scene re-solves for each.
//
// The counterintuitive bit, and the reason this teaches well: a SHALLOWER baffle
// fires a STEEPER axis. Lay a wedge flat and its face points nearly straight up,
// so it has to sit at the performer's feet to reach their ears. Stand it up and it
// fires forward, so it has to sit further out. Each cabinet's position here is
// SOLVED from its own baffle angle plus the requirement that its axis lands on the
// ear, and `drop` is where that leaves it relative to the capsule:
//
//   wedge                 baffle   sits    drop   cardioid  super  hyper
//   EAW MicroWedge MW12     27°   0.76 m    72°       +0    +10    +8
//   Meyer MJF-212A          40°   1.14 m    57°       +5    +14     0
//   EV PXM-12MP             55°   1.83 m    38°      +13     +4    -4
//
// All three baffle angles are the manufacturer's own cabinet figure, not a
// coverage pattern (Kyle asked me to check that specifically, and it is a real
// trap: the Martin LE400C's horn is 40 x 70 while its angle of fire is also ~40).
// EAW's 27 is marked on their mechanical drawing; Meyer publish "enclosure front
// angle 40 degrees" against a 50 x 50 horn; EV publish a "55-degree floor angle"
// against 90 x 90 coverage.
const WEDGE_MODELS = [
  { deg: 27, drop: 72, name: 'LOW',  detail: 'low-profile, tight to the singer' },
  { deg: 40, drop: 57, name: 'MID',  detail: 'the common wedge' },
  { deg: 55, drop: 38, name: 'HIGH', detail: 'stood up, singer further back' },
];
const WEDGE_DEG_DEFAULT = 27;
window.WEDGE_MODELS = WEDGE_MODELS;
window.WEDGE_DEG_DEFAULT = WEDGE_DEG_DEFAULT;
function wedgeModelOf(s) {
  const deg = (s && s.wedgeDeg != null) ? s.wedgeDeg : WEDGE_DEG_DEFAULT;
  return WEDGE_MODELS.find((w) => w.deg === deg) || WEDGE_MODELS[0];
}
window.wedgeModelOf = wedgeModelOf;
const FLOOR_DROP_DEFAULT = WEDGE_MODELS[0].drop;
// A mic's sensitivity at an angle whose cosine is cosT, for pattern `pat`.
// One shared polar law for both loops (wedge and mains) so a pattern change
// can never move one and not the other.
function micPolar(pat, cosT) {
  const a = MIC_A3[pat] != null ? MIC_A3[pat] : 0.5;
  return Math.max(POLAR_FLOOR, Math.abs(a + (1 - a) * cosT));
}
// `drop` is optional and defaults to the default wedge, so every existing call
// site keeps its old meaning without being touched.
function micRejectionRaw(setup, drop) {
  const az = (setup.az != null ? setup.az : 180) * Math.PI / 180;
  const tilt = (setup.tilt != null ? setup.tilt : 0) * Math.PI / 180;
  const phi = (drop != null ? drop : FLOOR_DROP_DEFAULT) * Math.PI / 180;
  const cosT = Math.cos(tilt) * Math.cos(phi) * Math.cos(az) - Math.sin(tilt) * Math.sin(phi);
  return micPolar(setup.pattern, cosT);
}
window.micRejectionRaw = micRejectionRaw;
// Placement is applied RELATIVE to a realistic DEFAULT (a cardioid held roughly
// level, one wedge on the floor in front of the performer aiming up at them).
// That default is the reference the whole feedback calibration is anchored to,
// so placement works BOTH ways: tilt the mic up so its null drops onto the wedge
// and you EARN gain before feedback; tilt it down toward the wedge, or fit a
// pattern with a live rear lobe, and you LOSE it and ring sooner.
//
// az defaults to 180 — the wedge sits DIRECTLY in front of the performer, which
// is where a floor wedge lives in almost every real setup (Kyle 2026-07-24), and
// the reason the panel now shows one side elevation instead of two plan views.
// With the wedge dead behind the mic, a cardioid's null is already close to it
// and super/hyper aim a live rear lobe straight at it, so pattern choice matters
// a lot here. No setup returns 1.0 (identical to the default), so every existing
// lesson's feedback calibration is untouched; only when a student aims the mic
// does the loop move.
const DEFAULT_MIC_SETUP = { pattern: 'cardioid', az: 180, tilt: 10 };
// The reference stays pinned to the DEFAULT mic on the DEFAULT wedge. That is what
// keeps every existing lesson still: a lesson that changes neither reads exactly
// 1.0. It also means swapping the WEDGE moves the number even for an untouched
// cardioid, which is the lesson — a different cabinet is a different amount of
// gain before feedback before you have touched the microphone at all.
const REF_REJ = micRejectionRaw(DEFAULT_MIC_SETUP, FLOOR_DROP_DEFAULT);
function micRejection3D(setup, drop) {
  if (!setup && (drop == null || drop === FLOOR_DROP_DEFAULT)) return 1.0;
  return Math.max(0.3, Math.min(4.5, micRejectionRaw(setup || DEFAULT_MIC_SETUP, drop) / REF_REJ));
}
window.micRejection3D = micRejection3D;
window.DEFAULT_MIC_SETUP = DEFAULT_MIC_SETUP;

// ── Mic vs the MAIN speakers ───────────────────────────────────────────────
// The universal rule of system setup: the mains belong DOWNSTAGE of every open
// mic. Stand above the stage and look down, and every microphone should be
// behind the front face of the speakers. Break it — a speaker set upstage of the
// mic line, or a singer who walks out past the boxes — and the mic sits inside
// the coverage pattern with nothing between it and full system output.
//
// The mic's own polar pattern is deliberately NOT in this path (Kyle 2026-07-24).
// The mains live off to the SIDES of the stage, not straight out in front of the
// vocalist, so in the horizontal plane a supercardioid or hypercardioid already
// rejects them; the rear lobe a side elevation appears to aim at the boxes is not
// aimed at them at all. What actually isolates a mic from the mains is the
// spacing between the two and which side of the speaker the mic is standing on.
// So this path is TWO terms, both read off `state.paLine` (metres the mains stand
// DOWNSTAGE of the mic line; negative means the mics are out in front of them):
//   1. the SPEAKER's directivity toward the mic, as a sharp knee rather than a
//      gentle slope. Out in front of the box is a serious problem; level with it
//      is borderline; behind it, the cabinet shadows the mic and you are set.
//   2. inverse-square distance.
// Returned as a dB delta against the default placement, so an unset mic is 0 dB
// and no existing lesson's calibration moves. Backing further off buys little,
// which is correct: the lateral offset already dominates the distance.
// Kyle 2026-07-24: with a properly set gain structure and the mains dragged fully
// upstage, well in front of the vocal mics, it STILL would not ring. You had to
// boost the gain to demonstrate it, which means the lesson never lands. Measured
// on Free Play's own state, the mains loop at the extreme sat 3.2 dB short.
//
// The cause was these two numbers, not the loop. At PA_LAT 3.0 the mic can never
// get closer than 3 m to the side of a box, so even dragged as far in front as
// the control allows it stood 67 deg round the cabinet at 3.3 m — outside the
// pattern, never really in the coverage — and the whole swing from behind to in
// front was only 9 dB. On a small stage running an 8-channel system the mains sit
// nearer 2.2 m either side of the vocal line, and a full-range box holds its level
// much further round than 62 deg; level only really collapses past about 75, where
// the cabinet starts shadowing. Those two give ~18 dB of swing, which is the right
// order for on-axis versus behind a box plus the distance change.
const PA_LAT = 2.2;      // metres the mains sit to the SIDE of the mic
const PA_RISE = 0.6;     // metres the box sits above the capsule (on a stick)
const PA_TILT = 10;      // degrees the box is aimed down into the audience
const PA_REAR_DB = 20;   // on-axis vs behind the box, full-range cabinet
const PA_KNEE = 75;      // degrees off the box axis where the level starts falling away
const PA_SOFT = 11;      // how many degrees that fall-off is spread over
function paPathDb(x) {
  const d = Math.sqrt(x * x + PA_LAT * PA_LAT + PA_RISE * PA_RISE);
  // Speaker axis points downstage (+x) and PA_TILT down; this is the angle from
  // that axis round to where the mic is standing.
  const st = PA_TILT * Math.PI / 180;
  const cosS = Math.min(1, Math.max(-1, (-x * Math.cos(st) + PA_RISE * Math.sin(st)) / d));
  const ang = Math.acos(cosS) * 180 / Math.PI;
  const spkDb = -PA_REAR_DB / (1 + Math.exp(-(ang - PA_KNEE) / PA_SOFT));
  return spkDb - 20 * Math.log10(d);
}
const PA_LINE_DEFAULT = 2.4;   // metres the mains stand DOWNSTAGE of the mic line
const PA_LINE_MIN = -1.2;      // dragged upstage: the mics are out past the boxes
const PA_LINE_MAX = 2.6;
window.PA_LINE_DEFAULT = PA_LINE_DEFAULT;
window.PA_LINE_MIN = PA_LINE_MIN;
window.PA_LINE_MAX = PA_LINE_MAX;
function paLineOf(s) { return (s && s.paLine != null) ? s.paLine : PA_LINE_DEFAULT; }
window.paLineOf = paLineOf;
const REF_PA_DB = paPathDb(PA_LINE_DEFAULT);
// Where the mains stand is a property of the SYSTEM, not of each microphone
// (Kyle 2026-07-24). Held per-mic it let Vocal 1 believe it was behind the boxes
// while Vocal 2 believed it was in front of them, which cannot be true on one
// stage, and it was invisible on the stage plot. So it reads one number off the
// state and every open mic shares it. A state that has never set it reads the
// default and contributes 0 dB, so no existing lesson moves.
// Ceiling 24, not 16: the strengthened curve reaches ~18 dB at the far end of the
// drag, so a 16 dB cap would have silently flattened the last third of the travel
// and put back the same "why is it not ringing yet" the model was just fixed for.
// The floor stays at -6, and the whole thing is still a delta against the default,
// so a state that has not moved the mains is exactly 0 either way.
function paPlacementDb(s) {
  return Math.max(-6, Math.min(24, paPathDb(paLineOf(s)) - REF_PA_DB));
}
window.paPlacementDb = paPlacementDb;
const _ringActive = {};
// Barkhausen anchor for the acoustic loop: FEED_0DB is the wedge feed (legacy
// linear) at which a 0 dB resonance band sits exactly at loop gain = 1. The
// loop is now computed in TRUE dB, so every dB anywhere in the chain (gain,
// fader, aux, master aux, wedge trim, EQ cut, HPF, mic placement) moves the
// feedback margin by exactly that many dB — the real gain-before-feedback
// discipline. Calibrated so the primed Free Play board starts ringing around
// two-thirds on a vocal send, the approved feel.
const FEED_0DB = 0.83;
const RING_SUSTAIN_DB = -1.7; // a started ring holds on until ~1.7 dB under onset
window.RING_SUSTAIN_DB = RING_SUSTAIN_DB;
// Mains face away from the mics, so a normally-placed mic only rings them when
// the main mix is cranked hard. Module-level because feedbackMargins reports the
// mains loop too and the two must never drift apart.
const MAINS_DB = -9.6;
function detectFeedback(s, audio) {
  if (!s || !s.channels || !audio || !audio.contributions) return null;
  const o = s.outputs || {};
  const rings = [];
  // Per-band loop check for one wedge. Two wedge models:
  //   - fbProfile (Feedback Mode): every band is an active resonance with
  //     its own sensitivity; any number can ring at once.
  //   - legacy ringBand: the wedge rings at one resonant band.
  // `feed` is the PRE-EQ wedge level (contributions carry the EQ's level
  // cost, so divide it back out — the loop applies per-band relief itself).
  // HPF relieves only the LOW bands (stage rumble), never a mid/high ring.
  const checkWedge = (wKey, w, feed, hpf, chIdx) => {
    if (!w || !feed) return;
    const has25 = !!(w.eq && w.eq.length === FULL_EQ_HZ.length);
    // Which resonance profile drives this wedge: a scenario's own (Feedback
    // Mode), otherwise this wedge's own randomized fingerprint from
    // wedgeProfileFor (each wedge/room rings at different frequencies). Only a
    // legacy wedge with no 25-band EQ falls back to the old single ringBand tone.
    const prof = (w.fbProfile && w.eq && w.eq.length === w.fbProfile.length) ? w.fbProfile
               : (has25 ? wedgeProfileFor(wKey) : null);
    const hzOf = (b) => has25 ? FULL_EQ_HZ[b] : EQ_BAND_HZ[b];
    const bands = prof ? prof.map((p, b) => ({ b, p })) : [{ b: (w.ringBand != null ? w.ringBand : 2), p: 1.0 }];
    // Loop gain per band, in REAL dB: feed level vs the unity anchor, plus the
    // band's resonance height, minus the EQ cut (slider dB counts one-for-one)
    // and the HPF's low-band relief. Ring when the loop crosses 0 dB.
    const feedDb = 20 * Math.log10(feed / FEED_0DB);
    for (const { b, p } of bands) {
      const lowBand = hzOf(b) <= 250;
      const hpfDb = (hpf && lowBand) ? -4.4 : 0;
      const eqDb = w.eq ? EQ_CUT_DB * Math.max(-1, Math.min(1, w.eq[b] || 0)) : 0;
      const loopDb = feedDb + 20 * Math.log10(p) + eqDb + hpfDb;
      const key = wKey + ':' + b;
      const th = _ringActive[key] ? RING_SUSTAIN_DB : 0;
      if (loopDb > th) {
        _ringActive[key] = true;
        rings.push({ wedge: wKey, band: b, hz: hzOf(b), risk: loopDb, channelIdx: chIdx });
      } else {
        _ringActive[key] = false;
      }
    }
  };
  for (let i = 0; i < s.channels.length; i++) {
    const ch = s.channels[i];
    if (ch.mute) continue;
    const srcKey = sourceFor(s, i);
    if (!srcKey) continue;
    const srcDef = SOURCES[srcKey];
    // Only mics that realistically ring feed back: vocal mics and drum
    // overheads (canFeedback). DIs (bass, acoustic gtr, keys) can't feed back at
    // all, and close mics (kick/snare/toms/hi-hat, guitar amp mic) sit right on
    // the source and never get gained hot enough to ring. A condenser still
    // needs phantom to pass any signal, so no +48V means no ring either.
    if (!srcDef || !srcDef.canFeedback) continue;
    if (srcDef.kind === 'condenser' && !ch.phantom) continue;
    const c = audio.contributions[srcKey];
    if (!c) continue;
    const eqg = audio.eqGain || { wedge: 1, wedge2: 1, wedge3: 1, wedge4: 1 };
    // Mic placement rejection: aiming the wedge into the mic's null attenuates
    // the loop (no placement set = 1.0, so nothing changes until the student aims).
    // Wedge model is a property of the stage, so both loops read it off the state.
    const rej = micRejection3D(s.micSetup && s.micSetup[srcKey], wedgeModelOf(s).drop);
    checkWedge('wedge', o.wedge, (c.wedge || 0) / (eqg.wedge || 1) * rej, ch.highpass, i);
    checkWedge('wedge2', o.wedge2, (c.wedge2 || 0) / (eqg.wedge2 || 1) * rej, ch.highpass, i);
    // W3/W4 exist only on the 16-ch band stage. On the MX-8 they aren't present,
    // so their sends can't ring — don't check them (a phantom ring with no wedge).
    if (s.big16) {
      checkWedge('wedge3', o.wedge3, (c.wedge3 || 0) / (eqg.wedge3 || 1) * rej, ch.highpass, i);
      checkWedge('wedge4', o.wedge4, (c.wedge4 || 0) / (eqg.wedge4 || 1) * rej, ch.highpass, i);
    }
    // Mains loop — no single band; the ring tone falls back to 2 kHz. MAINS_DB
    // is the baseline for a normally-placed mic (behind the boxes); paPlacementDb
    // is what the student's own placement adds or takes away from there.
    const paFeed = (c.pa_l || 0) + (c.pa_r || 0);
    const mainsLoopDb = (paFeed > 0.001)
      ? 20 * Math.log10(paFeed / FEED_0DB) + MAINS_DB + paPlacementDb(s) + (ch.highpass ? -4.4 : 0)
      : -999;
    const mKey = 'mains:' + i;
    const mTh = _ringActive[mKey] ? RING_SUSTAIN_DB : 0;
    if (mainsLoopDb > mTh) {
      _ringActive[mKey] = true;
      rings.push({ wedge: null, band: null, hz: 2000, risk: mainsLoopDb, channelIdx: i });
    } else {
      _ringActive[mKey] = false;
    }
  }
  if (!rings.length) return null;
  const primary = rings.reduce((a, b) => (b.risk > a.risk ? b : a));
  // wedgeRing: is any hot loop an actual WEDGE ring — a band that glows and can be
  // cut on the Monitor EQ? The mains loop rings with wedge:null (a 2 kHz howl with
  // no glowing band), which a gain-too-hot fault trips as a side effect. That is a
  // gain problem, not a ring-out, so it must NOT open the Monitor EQ. Only a
  // wedge ring is a real ring-out. The win still blocks on ANY ring (noFeedback).
  const wedgeRing = rings.some((r) => r.wedge);
  return { channelIdx: primary.channelIdx, riskAmount: primary.risk, ringWedge: primary.wedge, ringBand: primary.band, rings, wedgeRing };
}
window.detectFeedback = detectFeedback;
// Per-wedge FEEDBACK MARGIN: how much louder (dB) the hottest mic->wedge loop
// could get before it hits the ring line. Positive = headroom (pros run monitors
// ~6 dB below feedback, not on the edge), 0 = on the edge, negative = ringing.
// Same loop math as detectFeedback, read-only (no hysteresis), reporting the
// tallest band per wedge so a persistent readout can teach headroom discipline.
function feedbackMargins(s, audio) {
  const out = { wedge: -999, wedge2: -999, wedge3: -999, wedge4: -999, mains: -999 };
  if (!s || !s.channels || !audio || !audio.contributions) return out;
  const o = s.outputs || {};
  const eqg = audio.eqGain || { wedge: 1, wedge2: 1, wedge3: 1, wedge4: 1 };
  // MX-8 has only two wedges; W3/W4 exist on the 16-ch board only.
  const keys = s.big16 ? ['wedge', 'wedge2', 'wedge3', 'wedge4'] : ['wedge', 'wedge2'];
  const maxLoopFor = (wKey, w, feed, hpf) => {
    if (!w || !(feed > 0.001)) return -999;
    const has25 = !!(w.eq && w.eq.length === FULL_EQ_HZ.length);
    const prof = (w.fbProfile && w.eq && w.eq.length === w.fbProfile.length) ? w.fbProfile : (has25 ? wedgeProfileFor(wKey) : null);
    const hzOf = (b) => has25 ? FULL_EQ_HZ[b] : EQ_BAND_HZ[b];
    const bands = prof ? prof.map((p, b) => ({ b, p })) : [{ b: (w.ringBand != null ? w.ringBand : 2), p: 1.0 }];
    const feedDb = 20 * Math.log10(feed / FEED_0DB);
    let m = -999;
    for (const { b, p } of bands) {
      const hpfDb = (hpf && hzOf(b) <= 250) ? -4.4 : 0;
      const eqDb = w.eq ? EQ_CUT_DB * Math.max(-1, Math.min(1, w.eq[b] || 0)) : 0;
      const loopDb = feedDb + 20 * Math.log10(p) + eqDb + hpfDb;
      if (loopDb > m) m = loopDb;
    }
    return m;
  };
  for (let i = 0; i < s.channels.length; i++) {
    const ch = s.channels[i]; if (ch.mute) continue;
    const srcKey = sourceFor(s, i); if (!srcKey) continue;
    const srcDef = SOURCES[srcKey];
    // Same rule as detectFeedback: only vocal mics and drum overheads can ring,
    // so the wedge margin readout only tracks a channel that could actually feed back.
    if (!srcDef || !srcDef.canFeedback) continue;
    if (srcDef.kind === 'condenser' && !ch.phantom) continue;
    const c = audio.contributions[srcKey]; if (!c) continue;
    // Wedge model is a property of the stage, so both loops read it off the state.
    const rej = micRejection3D(s.micSetup && s.micSetup[srcKey], wedgeModelOf(s).drop);
    for (const wKey of keys) {
      const m = maxLoopFor(wKey, o[wKey], (c[wKey] || 0) / (eqg[wKey] || 1) * rej, ch.highpass);
      if (m > out[wKey]) out[wKey] = m;
    }
    // Same mains loop detectFeedback runs, reported as a margin so a lesson can
    // gate on headroom in front of the speakers, not just at the wedges.
    const paFeed = (c.pa_l || 0) + (c.pa_r || 0);
    if (paFeed > 0.001) {
      const mm = 20 * Math.log10(paFeed / FEED_0DB) + MAINS_DB + paPlacementDb(s) + (ch.highpass ? -4.4 : 0);
      if (mm > out.mains) out.mains = mm;
    }
  }
  return out;
}
window.feedbackMargins = feedbackMargins;
// Convert a wedge's hottest loop to a margin in dB (headroom before the 0.55
// ring line) and a status band. Returns null when no mic feeds the wedge.
function feedbackMarginInfo(maxLoopDb) {
  if (maxLoopDb == null || maxLoopDb < -30) return null; // no meaningful mic->wedge loop to show
  const db = -maxLoopDb; // loop gain is in dB now, so the margin IS its negative
  const status = db < 0 ? 'ring' : (db < 3 ? 'edge' : (db < 6 ? 'low' : 'ok'));
  return { db, status };
}
window.feedbackMarginInfo = feedbackMarginInfo;
window.wouldPopOnPlug = wouldPopOnPlug;
window.detectClipping = detectClipping;
window.detectPaBalanceIssue = detectPaBalanceIssue;
window.detectGainStagingMistakes = detectGainStagingMistakes;
window.dbSplFromPa = dbSplFromPa;
window.nioshExposure = nioshExposure;
