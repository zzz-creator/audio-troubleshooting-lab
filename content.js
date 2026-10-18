/* ============================================================
   content.js - Troubleshooting Lab scenario data
   ------------------------------------------------------------
   The level/challenge library, split out of index.html so new
   scenarios can be dripped in by editing this one small file
   instead of the app shell. Loaded as a plain <script> BEFORE
   the app's babel blocks, so keep it plain JS (arrow functions
   are fine; no JSX).

     window.LEVELS          - Run the Show, the member course, in order.
     window.PRACTICE        - the paid Practice Mode scenario (endless reps).
     window.PRACTICE_FAULTS - the fault pool Practice Mode draws from.
     window.FEEDBACK_MODE   - the paid ring-out trainer (endless wedges).

   Rules that keep monthly drops from disturbing student progress:
     - Every entry has a STABLE id. Progress is saved by id.
     - Only ever APPEND new scenarios. Never renumber existing ones.
   ============================================================ */

/* ============================================================
   GLOSSARY — the single source of truth for every definition the
   student reads. Written and approved by Kyle 2026-07-20; see
   GLOSSARY.md for sourcing and the accuracy rules.

   A lesson does NOT carry prose. It carries `defs: ['wedge', ...]`
   and the engine renders the term/definition list. This is
   deliberate: there is no free-text field to fill, so a lesson
   cannot contain scene-setting, instructions, or a description of
   something the student can already see on screen.

   Instructions live in the step's `text` (the green DO THIS).
   Nowhere else.

   Adding a term? Add it here once. Never reword it per lesson.
   ============================================================ */
window.GLOSSARY = {
  // Signal path
  'signal':        'The audio traveling through the cables and gear.',
  'patch':         'To connect a signal from one device to another.',
  'input channel': "One signal's path through the mixer, with its own controls and fader.",
  'input':         'Where signal enters a device.',
  'output':        'Where signal leaves a device.',
  'snake':         'A multichannel cable carrying many signals between the stage and the mixer.',
  'stage box':     'The connector box on stage where cables plug into the snake.',
  'sub-snake':     'A short snake connecting one area of the stage to the main snake.',
  'snake input':   'A line in the snake that carries sound from the stage to the mixer.',
  'snake output':  'A line in the snake that carries sound from the mixer back to the stage.',
  'cross-patch':   'A signal landing on the wrong channel.',

  // Level
  'gain':           'How much signal level is boosted or cut.',
  'fader':          "The slider that sets a channel's level in the main mix.",
  'unity':          'The setting where a signal passes through unchanged. On a fader, the 0 dB mark.',
  'meter':          'Reads the signal level at a particular point in the signal chain.',
  'headroom':       'The room between the signal level and the point where sound distorts.',
  'clipping':       'The harsh distortion that is heard when a signal exceeds the available headroom.',
  'gain structure': 'How signal level is set at every stage of the signal chain.',

  // Microphones and inputs
  'dynamic microphone':   'A passive moving-coil microphone that needs no power.',
  'condenser microphone': 'A microphone with active electronics inside, which require power.',
  'phantom power':        'Power required for active DIs and microphones (usually provided by the microphone preamp).',
  'DI box':               'A device used when connecting a high-impedance source (instrument, laptop, etc) to a low-impedance input (mixer input).',
  'active DI':            'A DI that requires external power (usually from a battery or phantom power). Usually used with passive sources.',
  'passive DI':           'A DI that requires no power. Usually used with active sources.',
  'high-pass filter':     'Reduces energy below a set frequency. Also called low-cut.',

  // Monitors and routing
  'wedge':       'A speaker on the stage pointing at a performer.',
  'monitor mix': 'A mix built for a performer on stage, separate from the main mix.',
  'aux send':    'Sends signal from a channel to a separate output mix.',
  'pre-fader':   'A send that bypasses the channel fader. Monitor sends work this way.',
  'main mix':    'The mix that goes to the speakers facing the audience.',
  'mains':       'The main speakers pointed at the audience.',
  'mute':        'Turns a channel off.',
  'PFL':         'Routes audio to your headphones without changing what the audience hears.',

  // Feedback and EQ
  'feedback':    'An infinite loop where the output of a system feeds into its input.',
  'ring out':    'Cutting the frequencies that feed back first, so monitors are clearer and louder.',
  'polar pattern': 'The directions a microphone picks up from, and the direction it rejects.',
  'null':        'The direction a microphone rejects most. Aim it at a speaker to fight feedback.',
  'graphic EQ':  'An EQ with a row of sliders, each cutting or boosting one fixed frequency band.',
  'line check':  'Confirming every input reaches the console on the right channel and sounds clean.'
};

// Display labels. Most terms render as their key; these get a fuller
// on-screen label so the lookup key can stay short.
window.GLOSSARY_LABELS = {
  'phantom power':    'Phantom power (+48V DC)',
  'high-pass filter': 'High-pass filter (HPF)'
};

/* ------------------------------------------------------------------
   GLOSSARY_ANCHORS — hovering a definition highlights the thing itself
   on the board. Each value is a CSS selector matched against the
   spotlight anchors the console and stage already carry (`data-walk`),
   so one term can light up EVERY instance: hover "fader" and all the
   channel faders plus the master fader light up together.

   A term is listed only when the highlight is HONEST. Concepts with no
   single home on screen (signal, patch, cross-patch, headroom, clipping,
   gain structure, feedback, ring out, pre-fader, monitor mix, line
   check) are deliberately absent, and the UI shows no hover affordance
   for them. A hover that lights up the wrong thing teaches the wrong
   thing; a hover that lights up nothing feels broken.

   Microphone and DI types are absent for that reason: the stage source
   cards share one `src-` anchor with no per-type distinction, so
   "condenser microphone" would ring the dynamics too.
   ------------------------------------------------------------------ */
window.GLOSSARY_ANCHORS = {
  // Console controls. The `$=` suffix match catches every channel plus
  // the master where one exists (master-fader, master-aux).
  'gain':             '[data-walk$="-gain"]',
  'fader':            '[data-walk$="-fader"]',
  // The U line on the fader scale, not the whole fader. Rendered as an
  // arrow (see GLOSSARY_ANCHOR_STYLE) because a box around a 1px tick
  // reads as a box around nothing.
  'unity':            '[data-walk="unity-mark"]',
  // The INPUT meter under the preamp, which is the meter the gain lessons
  // mean. NOT the fader row, whose anchor also covers a meter.
  'meter':            '[data-walk$="-inputmeter"]',
  'mute':             '[data-walk$="-mute"]',
  'PFL':              '[data-walk$="-pfl"]',
  'phantom power':    '[data-walk$="-phantom"]',
  'high-pass filter': '[data-walk$="-hpf"]',
  'aux send':         '[data-walk$="-aux"]',
  'input channel':    '[data-walk$="-strip"]',
  'main mix':         '[data-walk="master-fader"]',
  'graphic EQ':       '[data-walk="monitor-eq"]',

  // Connection points, console end and stage end. Individual jacks are the
  // right target for a LINE (a snake input is one line); a whole box is the
  // right target for a BOX.
  'input':            '[data-walk^="conn-in-"], [data-walk^="conn-stage-in-"]',
  'output':           '[data-walk^="conn-out-"], [data-walk^="conn-stage-out-"]',
  'snake input':      '[data-walk^="conn-stage-in-"]',
  'snake output':     '[data-walk^="conn-stage-out-"]',
  'stage box':        '[data-walk="stage-box"]',
  'sub-snake':        '[data-walk^="sub-snake-"]',
  // The snake is the WHOLE RUN, so it boxes both ends (the stage box and
  // the snake block at the console) and the engine strokes the trunk along
  // its real path between them. The run is the concept: one cable carries
  // every channel from the stage to the desk, and two boxes with nothing
  // between them would not show that.
  'snake':            '[data-walk="stage-box"], [data-walk="snake-trunk"]',

  // Speakers.
  'wedge':            '[data-walk^="out-wedge"]',
  'mains':            '[data-walk="out-pa-l"], [data-walk="out-pa-r"]',

  // Stage sources, by type (SourceCard tags each card with data-srckind).
  'dynamic microphone':  '[data-srckind="dynamic"]',
  'condenser microphone': '[data-srckind="condenser"]',
  'DI box':               '[data-srckind^="di-"]',
  'active DI':            '[data-srckind="di-active"]',
  'passive DI':           '[data-srckind="di-passive"]'
};

// How a term's highlight is drawn. Default is a box around the element.
// A target that is a LINE rather than an area gets an arrow instead,
// because a box around a 1px tick reads as a box around nothing.
window.GLOSSARY_ANCHOR_STYLE = {
  'unity': 'arrow'
};

// LEVELS — the Essentials free tier.
//
// Contract per level (kept intentionally small so the prose surface stays
// editable):
//   - title    : 2-4 words
//   - symptom  : what's going on, in plain language. For task levels this is
//                the job to do, not a problem description.
//   - hint     : a plain nudge if they're stuck
//   - solution : what the fix was (shown on solve)
//   - task     : true for setup/procedure levels where nothing is broken.
//                Changes the UI framing: TASK label instead of the red
//                SYMPTOM, TASK COMPLETE instead of MIX RESTORED, Recap
//                instead of Fix.
//   - requirePowerOn : win on power state, not signal. Passes when the
//                console, power amp, and both wedges are all on (in an order
//                that didn't pop). Use with conditions: [] for a pure
//                power-on lesson that doesn't need signal flow.
//   - requirePowerOff : the mirror image. Passes when the master fader is
//                pulled down, every powered box (wedges + main speakers, or the
//                amp on a passive rig) is off, and the console is off — in an
//                order that didn't pop. Turning the console off while a
//                powered box is still live pops it (cause 'mixer_off_pop'),
//                so the order the level teaches is: speakers first, console
//                last.
//   - requireZeroed : zero-the-console check. Passes when every channel is
//                back to its default state (gain, aux1/aux2 and fader down,
//                muted, pan centered, HPF and +48V off) and the master is
//                down AND muted. Pair with requirePowerOff for the full
//                end-of-night routine.
//   - verifyEach : [{source, dest, min, label}] — verify outputs one at a
//                time. Each destination LATCHES checked the moment its source
//                reaches it (>= min) and stays checked, so the win does NOT
//                need them all live at once. Win when every entry is checked.
//                Use with conditions: [] and an explicit involves.
//   - gainStructure : { refChannel?, unity, faderTol, inputBand? } — gain-
//                structure lesson. Win also requires the reference channel's
//                fader AND the master fader to sit at unity (within faderTol).
//                Optional inputBand [lo, hi] also requires the ref channel's
//                input (chanIn baseline) to sit in a healthy band, so the
//                student sets the input gain by hand (pair with requirePflCheck
//                to make them verify it in PFL first). Omit refChannel for a
//                master-only unity check (The Gig: playback ends turned down,
//                so no single channel is pinned).
//   - conditions, sabotage, defaultInspect, topology, involves: engine fields
//   - sabotage(s, rng) : rng is a seeded PRNG the app passes on every load.
//                Challenges place their fault with it (randomized reps);
//                Essentials ignore it and stay deterministic.
//   - par      : challenges only. The move count of a systematic check,
//                shown against the student's own move count in the debrief.
//   - hintAuto : presentation override. Defaults: Essentials show the hint
//                up front, challenges keep it behind a "Need a hint?" button.
//
// Prose rule (Kyle, 2026-06-10): write simple and clear, not "in character."
// Don't reach for engineer slang or scene-setting to sound like the niche.
// Plain sentences that say what's happening beat flavor every time, and
// they're easier for beginners.
//
// REFOCUSED 2026-06-10 PM (Kyle): the free Essentials are now setting up a
// system and learning the standard input types, as a continuous on-site build.
// The 10 lessons, in order:
//   1 Patch the System    - connect everything per the input list (added
//                           2026-06-11: inputs, outputs, snake by color code)
//   2 Power-On Sequence   - bring the rig up in the right order (active speakers)
//   3 Set the Input Level - PFL the playback, set gain, faders to unity
//   4 Test the Wedges     - send to each wedge, verify one at a time
//   5 Mic Inputs          - dynamic (no power) + condenser (+48V)
//   6 DI Boxes            - passive (no power) + active (+48V)
//   7 Monitor Mix         - send a wedge mix
//   8 Feedback Awareness  - keep the monitor loop under control
//   9 The Gig             - final exam: full pre-show check from a cold start
//                           (speakers verified with playback, then the band)
//  10 Power-Down          - zero the console, then shut down in the right order
// The early levels build on each other (each starts where the last ended).
// Troubleshooting faults (cable, gain, fader, mute, pan, phantom, master,
// speaker, feedback, crosspatch) live in the paid PRACTICE_FAULTS pool, where
// "something's broken, fix it" is the point.
// Source types: Vocal Mic 1 = dynamic, Vocal Mic 2 = condenser (+48V); Bass DI
// = passive, Keyboard DI = active (diActive, needs +48V like a condenser). The
// 5/6 playback is a FOH line input on channel 5 (no snake port).
// Extra contract field (2026-06-11):
//   - requirePatch : win requires the physical patch to match the paperwork
//                (the Input List): sources on snake inputs 1-4, input tails on
//                their console channels, console outputs into snake returns
//                1-6 (outFan), and speaker lines on their numbered out ports
//                (outPatch). Used by Patch the System and every practice rep.
// Ids renumbered 2026-06-10 and again 2026-06-11 (Patch the System became
// lesson 1), both pre-launch. After launch the append-only rule is absolute.

// --- Adaptive-hint helper --------------------------------------------------
// Each lesson can define hints: [{ text, done(ctx) }]. The brief shows only the
// steps not yet done, one more per click, so a hint never points at something
// the engineer already handled. ctx carries the live state, audio, and the same
// status objects the OBJECTIVE checklist reads, so a hint clears exactly when
// its step actually gets done. hintReaches mirrors the checklist's level read.
function hintReaches(ctx, src, dest, min) {
  var a = ctx && ctx.audio;
  if (!a || !a.contributions) return false;
  var c = a.contributions[src];
  if (!c) return false;
  var lvl = dest === 'pa' ? Math.max(c.pa_l || 0, c.pa_r || 0) : (c[dest] || 0);
  return lvl >= (min == null ? 0.3 : min);
}

window.LEVELS = [
  {
    id: 1,
    title: 'Patch the System',
    // THE FIRST LESSON (Kyle, 2026-06-11): before anything gets powered on,
    // the system gets CONNECTED, per paperwork (the Input List in the top
    // bar), the way a pro does it. A BIDIRECTIONAL snake: the send side rides
    // input channels 1-4, the return side its OWN channels 1-6, each numbered
    // and colored from 1 (1 brown, 2 red, 3 orange, 4 yellow, 5 green, 6 blue).
    // Four drag-and-drop jobs, all with the power off:
    //   1. INPUTS - each source's cable into its numbered stage-box port.
    //   2. INPUT TAILS - the FOH fan-out tails 1-4 onto their console
    //      channels, matched by color.
    //   3. RETURN TAILS - the console outputs into snake returns 1-6 at FOH
    //      (MAIN L -> 1, MAIN R -> 2, AUX 1 -> 3, AUX 2 -> 4).
    //   4. SPEAKER LINES - each speaker picks up its return channel at the
    //      stage box (Main L <- 1, Main R <- 2, Wedge 1 <- 3, Wedge 2 <- 4).
    // EVERYTHING starts disconnected (a brand-new system is unconnected,
    // never crosspatched). Win = requirePatch (four identity checks); no
    // signal conditions. The rig stays off the whole time. The next lesson
    // begins "everything is connected" — this is where that becomes true.
    task: true,
    requirePatch: true,
    involves: [],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['stage box', 'snake', 'snake output'],
    hint: 'Drag one end of a cable and drop it on a port or an output. If you drop it on a port that already has a cable, the two swap. The snake tails are color coded so you can tell them apart: 1 brown, 2 red, 3 orange, 4 yellow, 5 green, 6 blue.',
    hints: [
      { title: 'Open the show plan', target: 'iolist', text: 'Open the Input List in the top bar. It names the port every source plugs into.', done: (ctx) => !!(ctx.ioListOpen || (ctx.patchStatus && ctx.patchStatus[0] && ctx.patchStatus[0].pass)) },
      { title: 'Patch the inputs', target: ['iolist-ch1', 'iolist-ch2', 'iolist-ch3', 'iolist-ch4', 'src-vocal', 'src-vocal2', 'src-guitar', 'src-laptop', 'conn-stage-in-1', 'conn-stage-in-2', 'conn-stage-in-3', 'conn-stage-in-4'], text: 'Leave the power off, then drag each source cable to the stage box port the Input List shows.', done: (ctx) => ctx.patchStatus && ctx.patchStatus[0] && ctx.patchStatus[0].pass },
      { title: 'Land the snake at the console', target: ['conn-in-0', 'conn-in-1', 'conn-in-2', 'conn-in-3'], text: 'Drop snake tails 1-4 onto their matching console channels.', done: (ctx) => ctx.patchStatus && ctx.patchStatus[1] && ctx.patchStatus[1].pass },
      { title: 'Feed the snake outputs', target: ['conn-out-MAIN L', 'conn-out-MAIN R', 'conn-out-AUX 1', 'conn-out-AUX 2'], text: 'Drag the console outputs to the snake outputs: L to 1, R to 2, AUX 1 to 3, AUX 2 to 4.', done: (ctx) => ctx.patchStatus && ctx.patchStatus[2] && ctx.patchStatus[2].pass },
      { title: 'Speakers to the out ports', target: ['out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2', 'conn-stage-out-1', 'conn-stage-out-2', 'conn-stage-out-3', 'conn-stage-out-4'], text: 'Connect the speakers: Main L to 1, Main R to 2, Wedge 1 to 3, Wedge 2 to 4.', done: (ctx) => ctx.patchStatus && ctx.patchStatus[3] && ctx.patchStatus[3].pass },
    ],
    sabotage: (s) => {
      // Load-in state: nothing connected anywhere. Input cables loose above
      // the stage box, speaker lines loose below it, input tails coiled
      // below the fan-out (fanOut 0 = unplugged), return tails coiled next
      // to them (outFan nulls). Rig fully off, console zeroed
      // (normalizeChannels covers the channels via involves []).
      s.cables = { vocal: 0, vocal2: 0, guitar: 0, laptop: 0 };
      s.fanOut = [0, 0, 0, 0];
      s.outFan = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
      s.outPatch = { pa_l: null, pa_r: null, wedge: null, wedge2: null, wedge3: null, wedge4: null };
      s.master = { ...s.master, mute: true, fader: 0 };
      s.mixer = { on: false };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false, volume: 0 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false, volume: 0 };
      s.outputs.wedge = { ...s.outputs.wedge, on: false, volume: 0 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0 };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false, volume: 0 };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false, volume: 0 };
      return s;
    },
    solution: 'The stage now feeds the console, and the console feeds the main speakers and the wedges.',
    defaultInspect: 'pa',
  },
  {
    id: 2,
    title: 'Power Up in Order',
    // Pure power-on lesson on an ACTIVE-speaker rig (powered main speakers, no
    // separate power amp). The console starts zeroed and safe: faders down,
    // every channel muted, master muted (normalizeChannels handles the
    // channels since there are no conditions; the sabotage mutes the master).
    // Everything is powered off. The win is bringing the rig up in the right
    // order, NOT sending signal (that's the next lessons). Win = console on +
    // both active main speakers on + both wedges on, flagged by requirePowerOn
    // (topology-aware: active mode checks the main speakers, not an amp).
    // The only hazard is the POP: turning a powered speaker or wedge on first,
    // then switching the console on, sends the console's switch-on transient
    // into a live powered box and pops the speakers (wouldPopOnMixerOn ->
    // cause 'mixer_pop'). So the rule the level teaches is: console first,
    // powered boxes last. A pop blocks the win until reset. Master stays muted,
    // so there's no blast to worry about here.
    task: true,
    requirePowerOn: true,
    // involves: [] forces normalizeChannels to mute EVERY channel with faders
    // down (the zeroed console start). Without it, deriveInvolves defaults to
    // [1] to avoid an accidentally-dead desk, which would leave channel 1 live.
    involves: [],
    defs: [],
    hint: 'All four speakers are off right now, so nothing is powered up to play the console\'s thump. Once the console is on, the thump is over and the speakers can go on in any order.',
    hints: [
      { title: 'Console on first', target: 'mixer-power', text: 'Turn the console on first.', done: (ctx) => ctx.powerStatus && ctx.powerStatus.console },
      { title: 'Then the speakers', target: ['out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2'], text: 'Turn on both main speakers and both wedges.', done: (ctx) => ctx.powerStatus && ctx.powerStatus.paStage && ctx.powerStatus.wedges },
    ],
    conditions: [],
    // Active speakers: powered PA boxes with their own on/off, no power amp.
    topology: { paRig: 'powered' },
    sabotage: (s) => {
      // Zeroed, safe console between shows: channels already muted with faders
      // down (normalizeChannels, no conditions). Mute the master too, then
      // power off everything with a switch: both active main speakers and both
      // wedges. The only task left is the power-on order.
      s.master = { ...s.master, mute: true, fader: 0 };
      s.mixer = { on: false };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false };
      s.outputs.wedge = { ...s.outputs.wedge, on: false };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false };
      return s;
    },
    solution: 'Console on first, speakers last. On the way down you reverse it: speakers off first, console last.',
    defaultInspect: 'pa',
  },
  {
    id: 3,
    title: 'Set the Input Level',
    // Step 1 of the real-show setup, picking up exactly where Power-On left
    // off: the rig is on but the console is fully zeroed (every channel muted,
    // faders all the way down, master muted AND its fader at 0, playback gain
    // all the way down). The student PFLs the playback, sets the input GAIN
    // healthy, unmutes and brings the channel + master to unity, THEN sets how
    // loud the room is with the main speaker volume (the SPL beat lives here now).
    // requirePflCheck = the PFL workflow happened; gainStructure.inputBand =
    // input sits healthy; unity checks require unmuted + at unity; the PA
    // corridor (0.30-0.65 ~= 86-92 dB SPL, a sane small-club show level) is the
    // room level set with the speaker volume, shown as a green target band on
    // the loudness meter. The corridor reads max(pa_l, pa_r), so the win's own
    // PA-balance guard (normalWon's `balanced`) still rejects one-sided mains:
    // both boxes come up together, and step 4 requires the pair too, so the
    // guide can never read done while the win is blocked.
    // involves: [7] keeps the playback channel live, mutes the mics.
    task: true,
    involves: [7],
    requirePflCheck: true,
    // inputBand = the healthy window on the real-units meter, kept lenient:
    // -20 to -3 dBFS (anywhere from a conservative level up to just under the
    // red), in the engine's nominal-anchored linear values.
    gainStructure: { refChannel: 7, unity: 0.75, faderTol: 0.06, inputBand: [0.645, 4.566] },
    conditions: [
      { source: 'playback', dest: 'pa', min: 0.30, max: 0.65 },
    ],
    defs: ['PFL', 'gain', 'unity'],
    hint: 'Press PFL on the channel playback is connected to, and you will hear it in your headphones. Set the GAIN until the input meter sits in the healthy zone. Disengage PFL, switch MUTE off on that channel and on MAIN, and bring both faders to the U mark. Then bring both main speakers up evenly until the loudness meter reaches the green target band, which sits inside the amber section of that meter because a live show is louder than an all-day-safe listening level.',
    hints: [
      { title: 'Listen in your headphones', target: 'ch7-pfl', text: 'Press PFL on the channel playback is connected to.', done: (ctx) => ctx.pflChecked || (ctx.state.channels[6] && ctx.state.channels[6].solo) },
      { title: 'Set the gain', target: ['ch7-gain', 'ch7-inputmeter'], text: 'Set the GAIN so the input meter sits in the healthy zone.', done: (ctx) => ctx.gainStatus && ctx.gainStatus.input },
      { title: 'Faders to unity', target: ['ch7-pfl', 'ch7-mute', 'ch7-fader', 'master-section', 'master-fader'], text: 'Disengage PFL, switch MUTE off on the playback channel and MAIN, then set both faders to unity.', done: (ctx) => ctx.gainStatus && ctx.gainStatus.fader && ctx.gainStatus.master },
      { title: 'Turn up the speakers', target: ['out-pa-l', 'out-pa-r'], text: 'Bring both main speakers up evenly until the loudness meter reaches the green target band.', done: (ctx) => { var c = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.playback; if (!c) return false; var l = Math.max(c.pa_l || 0, c.pa_r || 0); if (!(l >= 0.30 && l <= 0.65)) return false; return !ctx.paBalanceIssue; } },
    ],
    sabotage: (s) => {
      // Continuous with Power-On: rig on, console fully zeroed. Channel muted,
      // fader 0, GAIN all the way down. Master muted, fader 0. main speaker volume
      // all the way down too, since the student sets the room level here.
      s.channels[6].mute = true;
      s.channels[6].fader = 0;
      s.channels[6].gain = 0;
      s.channels[6].aux1 = 0; s.channels[6].aux2 = 0;
      s.master.mute = true; s.master.fader = 0;
      s.outputs.pa_l.volume = 0; s.outputs.pa_r.volume = 0;
      return s;
    },
    solution: 'You set the level in that order every time: GAIN first, both faders at unity, speaker volume last.',
    defaultInspect: 'pa',
  },
  {
    id: 4,
    title: 'Test the Wedges',
    // The monitor wedges, on their own. The PA was already set in Set the Input
    // Level, so we don't re-check it here. This introduces the wedges and which
    // aux feeds which: AUX 1 -> Wedge 1, AUX 2 -> Wedge 2. The student sends
    // the reference out each aux and brings up each wedge volume until it plays.
    // verifyEach latches each wedge once it gets signal. The PA, gain and faders
    // stay as set in Level 2. The wedge volumes the student sets here are kept
    // for the rest of the build (Levels 4-7 start with them up).
    task: true,
    involves: [7],
    verifyEach: [
      { source: 'playback', dest: 'wedge',  min: 0.25, label: 'Wedge 1 plays' },
      { source: 'playback', dest: 'wedge2', min: 0.25, label: 'Wedge 2 plays' },
    ],
    conditions: [],
    defs: ['wedge', 'aux send'],
    hint: 'Two separate controls have to be up, and the usual mistake is leaving one of them down. One is the AUX knob on the playback channel at the console. The other is the volume control on Wedge 1 itself, out on stage.',
    hints: [
      { title: 'Bring up Wedge 1', target: ['ch7-aux', 'out-wedge1'], text: 'Turn up AUX 1 on the playback channel, then raise Wedge 1\'s volume.', done: (ctx) => ctx.verifyStatus && ctx.verifyStatus.wedge },
      { title: 'Bring up Wedge 2', target: ['ch7-aux', 'out-wedge2'], text: 'Turn up AUX 2 on the playback channel, then raise Wedge 2\'s volume.', done: (ctx) => ctx.verifyStatus && ctx.verifyStatus.wedge2 },
    ],
    sabotage: (s) => {
      // Carried from Set the Input Level: good input, faders at unity, PA set.
      // The wedges are not up yet: sends closed, wedge volumes down. Playback is
      // a hot line source, so its healthy gain sits low on the knob (~0.20).
      s.channels[6].mute = false;
      s.channels[6].gain = window.HEALTHY_GAIN_BY_CH[6];
      s.channels[6].fader = 0.75;
      s.channels[6].aux1 = 0; s.channels[6].aux2 = 0;
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0; s.outputs.wedge2.mute = false;
      s.outputs.wedge3.on = false; s.outputs.wedge3.volume = 0;
      s.outputs.wedge4.on = false; s.outputs.wedge4.volume = 0;
      return s;
    },
    solution: 'The aux send on the channel and the volume on the wedge both have to be up before the wedge makes any sound.',
    defaultInspect: 'wedge',
  },
  {
    id: 5,
    title: 'Mic Inputs',
    // First real inputs after the system is up: the two vocal mics. Teaches the
    // dynamic-vs-condenser difference. Vocal Mic 1 (ch1) is a DYNAMIC: no power
    // needed, just set the gain and bring it up. Vocal Mic 2 (ch2) is a
    // CONDENSER: dead until +48V phantom is on. Both start muted with the gain
    // pulled low, so the student sets each gain, turns +48V on for the
    // condenser (safely, while muted), and brings both up. The condenser's PA
    // condition can't pass without phantom, so the difference is the lesson.
    // deriveInvolves maps the conditions to channels 1 and 2; the rest mute.
    task: true,
    requirePflEach: [1, 2],
    conditions: [
      { source: 'vocal',  dest: 'pa', min: 0.3 },
      { source: 'vocal2', dest: 'pa', min: 0.3 },
    ],
    defs: ['dynamic microphone', 'condenser microphone', 'phantom power'],
    hint: 'Finish channel 1 completely before you touch channel 2. On channel 2, switch +48V on first, then PFL it and set GAIN, because that order keeps the turn-on thump out of your headphones. Switching +48V on for channel 2 changes nothing on channel 1.',
    hints: [
      { title: 'Listen to channel 1', target: 'ch1-pfl', text: 'Press PFL on channel 1 to hear the dynamic microphone in your headphones.', done: (ctx) => !!(ctx.pflChannels && ctx.pflChannels[1]) },
      { title: 'Set the channel 1 gain', target: ['ch1-gain', 'ch1-inputmeter'], text: 'Turn GAIN up until the input meter peaks near the top of the green.', done: (ctx) => { var l = (ctx.audio && ctx.audio.chanInBaseline && ctx.audio.chanInBaseline[0]) || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Bring channel 1 in', target: ['ch1-pfl', 'ch1-mute', 'ch1-fader'], text: 'Disengage PFL on channel 1, switch MUTE off, then raise the fader to the U mark.', done: (ctx) => hintReaches(ctx, 'vocal', 'pa', 0.3) },
      { title: 'Power the condenser', target: 'ch2-phantom', text: 'Switch +48V on for the condenser microphone on channel 2 while it is muted and not in PFL.', done: (ctx) => ctx.state.channels[1] && ctx.state.channels[1].phantom },
      { title: 'Listen to channel 2', target: 'ch2-pfl', text: 'Press PFL on channel 2 to hear the condenser microphone.', done: (ctx) => !!(ctx.pflChannels && ctx.pflChannels[2]) },
      { title: 'Set the channel 2 gain', target: ['ch2-gain', 'ch2-inputmeter'], text: 'Turn GAIN up until the input meter peaks near the top of the green.', done: (ctx) => { var l = (ctx.audio && ctx.audio.chanInBaseline && ctx.audio.chanInBaseline[1]) || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Bring channel 2 in', target: ['ch2-pfl', 'ch2-mute', 'ch2-fader'], text: 'Disengage PFL on channel 2, switch MUTE off, then raise the fader to the U mark.', done: (ctx) => hintReaches(ctx, 'vocal2', 'pa', 0.3) },
    ],
    sabotage: (s) => {
      // System set up (master at unity, PA at a good level, wedges still up from
      // Test the Wedges). The two vocal channels start muted, faders down, gain
      // low. The condenser's phantom is off so the student has to know it needs
      // +48V. PFL each channel to check it before bringing it up.
      s.channels[0].mute = true; s.channels[0].fader = 0; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0] * 0.5; s.channels[0].phantom = false;
      s.channels[1].mute = true; s.channels[1].fader = 0; s.channels[1].gain = window.HEALTHY_GAIN_BY_CH[1] * 0.5; s.channels[1].phantom = false;
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'Both channels got set up the same way, and the only difference was the +48V the condenser needed and the dynamic did not.',
    defaultInspect: 'pa',
  },
  {
    id: 6,
    title: 'DI Boxes',
    // The instrument inputs, and the active-vs-passive DI difference. Bass DI
    // (ch3, guitar source, diActive) is ACTIVE: electronics inside need +48V
    // phantom, same as a condenser, dead without it. Keyboard DI (ch4, laptop)
    // is PASSIVE: no power. Both start muted, low gain; the student PFLs each,
    // sets the gain, turns +48V on for the active DI (while muted), brings both
    // up. The active DI's PA condition can't pass without phantom. The mics
    // from the previous level stay set the way they were but muted (audio off)
    // so the build carries forward. Source cards label Active/Passive DI.
    task: true,
    requirePflEach: [3, 4],
    conditions: [
      { source: 'guitar', dest: 'pa', min: 0.3 },
      { source: 'laptop', dest: 'pa', min: 0.3 },
    ],
    defs: ['DI box', 'active DI', 'passive DI'],
    hint: 'Switch +48V on channel 3 before you press PFL, not while you are listening to that channel. Phantom power arriving while you are listening pops your headphones the same way it pops the speakers.',
    hints: [
      { title: 'Power the active DI', target: ['ch3-mute', 'ch3-phantom'], text: 'Mute channel 3, which has the active DI on the bass, then switch +48V on.', done: (ctx) => ctx.state.channels[2] && ctx.state.channels[2].phantom },
      { title: 'Listen to the bass', target: 'ch3-pfl', text: 'Press PFL on channel 3 to hear the bass.', done: (ctx) => !!(ctx.pflChannels && ctx.pflChannels[3]) },
      { title: 'Set the bass gain', target: ['ch3-gain', 'ch3-inputmeter'], text: 'Turn GAIN up until the input meter peaks near the top of the green.', done: (ctx) => { var l = (ctx.audio && ctx.audio.chanInBaseline && ctx.audio.chanInBaseline[2]) || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Bring the bass in', target: ['ch3-pfl', 'ch3-mute', 'ch3-fader'], text: 'Disengage PFL on channel 3, switch MUTE off, then raise the fader to the U mark.', done: (ctx) => hintReaches(ctx, 'guitar', 'pa', 0.3) },
      { title: 'Listen to the keys', target: 'ch4-pfl', text: 'Press PFL on channel 4 to hear the keyboard, which comes in on the passive DI.', done: (ctx) => !!(ctx.pflChannels && ctx.pflChannels[4]) },
      { title: 'Set the keys gain', target: ['ch4-gain', 'ch4-inputmeter'], text: 'Turn GAIN up until the input meter peaks near the top of the green.', done: (ctx) => { var l = (ctx.audio && ctx.audio.chanInBaseline && ctx.audio.chanInBaseline[3]) || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Bring the keys in', target: ['ch4-pfl', 'ch4-mute', 'ch4-fader'], text: 'Disengage PFL on channel 4, switch MUTE off, then raise the fader to the U mark.', done: (ctx) => hintReaches(ctx, 'laptop', 'pa', 0.3) },
    ],
    sabotage: (s) => {
      // Mics from the last level kept as set (their per-source healthy gain),
      // but muted so the audio stops.
      s.channels[0].mute = true; s.channels[0].fader = 0.72; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0]; s.channels[0].phantom = false;
      s.channels[1].mute = true; s.channels[1].fader = 0.72; s.channels[1].gain = window.HEALTHY_GAIN_BY_CH[1]; s.channels[1].phantom = true;
      // Both DI channels start muted, faders down, gain low (half of healthy) so
      // the student sets each by the meter: the passive bass needs a lot of gain
      // (its healthy spot is high on the knob), the keys very little. The active
      // DI (bass, ch3) has phantom off so the student has to power it.
      s.channels[2].mute = true; s.channels[2].fader = 0; s.channels[2].gain = window.HEALTHY_GAIN_BY_CH[2] * 0.5; s.channels[2].phantom = false;
      s.channels[3].mute = true; s.channels[3].fader = 0; s.channels[3].gain = window.HEALTHY_GAIN_BY_CH[3] * 0.5; s.channels[3].phantom = false;
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'The active DI on channel 3 needed +48V, and the passive DI on channel 4 needed none.',
    defaultInspect: 'pa',
  },
  {
    id: 7,
    title: 'Monitor Mix',
    task: true,
    // A positive setup task, not a problem: build the singer her monitor mix.
    // The wedge volume is already up (set in Test the Wedges and kept), so this
    // is purely the aux send: open AUX 1 on the vocal to feed her wedge.
    defs: ['monitor mix', 'main mix'],
    hint: 'Wedge 1 is already on and turned up. AUX 1 is the first of the aux knobs on the Vocal 1 channel strip. Turning it up does not change what the audience hears.',
    hints: [
      { title: 'Vocal into the wedge', target: ['ch1-aux', 'out-wedge1'], text: 'Turn up AUX 1 on the Vocal 1 channel to put that vocal in Wedge 1.', done: (ctx) => hintReaches(ctx, 'vocal', 'wedge', 0.3) },
    ],
    conditions: [
      { source: 'vocal', dest: 'pa',    min: 0.3 },
      { source: 'vocal', dest: 'wedge', min: 0.3 },
    ],
    sabotage: (s) => {
      // System set up: vocal live in the PA, wedge up (kept from Test the
      // Wedges). The vocal just isn't in the monitor yet (aux sends closed).
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      s.channels.forEach(c => c.aux1 = 0);
      return s;
    },
    solution: 'The aux send put the vocal in the wedge without changing the main mix the audience hears.',
    defaultInspect: 'wedge',
  },
  {
    id: 8,
    title: 'Fight the Feedback',
    task: true,
    // Does NOT start ringing. The singer has a little of herself in the wedge
    // (aux 1 low) and asks for more. As the student turns AUX 1 up to give her
    // more, the loop gain crosses the ring threshold and the wedge starts to
    // feed back. To win, the student needs the vocal LOUD in the wedge
    // (>= 0.8, about 1.2 dB PAST the ring point under the real-dB loop) AND
    // no feedback, so pulling the send back down won't do it.
    // For now HPF clears it (drops the low-end loop gain ~40% while the wedge
    // level stays up). NEXT TURN: add an EQ on the aux outputs as the real,
    // surgical fix; HPF is the stopgap so the level is solvable today.
    defs: ['feedback', 'ring out'],
    hint: 'Turn AUX 1 up on the Vocal 1 channel until Wedge 1 is loud. When it rings, look at the Wedge 1 Monitor EQ and pull the glowing band down until the ring stops. Every cut takes away a little level, so cut only as much as you need.',
    hints: [
      { title: 'Raise Vocal 1 in Wedge 1', target: ['ch1-aux', 'out-wedge1'], text: 'Bring AUX 1 on the Vocal 1 channel up until Wedge 1 rings.', done: (ctx) => ctx.hasRung || hintReaches(ctx, 'vocal', 'wedge', 0.8) },
      { title: 'Ring it out', target: ['monitor-eq', 'out-wedge1'], text: 'Cut each glowing band on the Wedge 1 Monitor EQ until the ringing stops, turning AUX 1 back up between cuts until Vocal 1 is strong in the wedge.', done: (ctx) => !ctx.feedback && hintReaches(ctx, 'vocal', 'wedge', 0.8) && (((ctx.state.outputs.wedge || {}).eq) || []).some((v) => v < 0) },
    ],
    // Wedge min 0.8 under the real-dB loop (2026-07-02): the ring point on
    // the primed wedge sits at a send of ~0.66, and 0.8 lands about 1.2 dB
    // past it, so the level she asks for genuinely cannot be reached without
    // ringing out the hot band. EQ cuts still cost level (eqLevelGain), so
    // the cut eats a little of the send — exactly like a real desk.
    conditions: [
      { source: 'vocal', dest: 'pa',    min: 0.3 },
      { source: 'vocal', dest: 'wedge', min: 0.8 },
    ],
    sabotage: (s) => {
      // Vocal live in the PA. Her wedge has been pushed up all night (volume
      // cranked, kept), with a little vocal in it but not enough. Pushing AUX 1
      // up to give her what she wants crosses into feedback. Her wedge rings at
      // its resonant band (wedge.ringBand, mid-high); HPF won't fix that, so the
      // student has to ring it out on the Monitor EQ. Wedge volume kept with
      // headroom so the loud send doesn't clip while she's still ringing.
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.7; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      s.channels[0].aux1 = 0.2;
      s.channels[0].highpass = false;
      return s;
    },
    solution: 'Cutting only the pitch that is ringing is called ringing out a wedge. Each cut costs a little level, so use the smallest cut that stops the ring.',
    defaultInspect: 'wedge',
  },
  {
    id: 9,
    title: 'The Gig',
    // FINAL EXAM. Everything from Levels 1-7 performed start to finish from a
    // cold venue, with no new skills. The objective version of soundcheck:
    // prove every speaker passes signal, then line-check every input. Nobody
    // judges the blend, the student proves every
    // signal arrives clean. Win = power-on order (requirePowerOn) + every
    // speaker TESTED with playback (verifyEach latches each one, exactly like
    // Test the Wedges — playback is a checking tool, so it can and should be
    // pulled back down once the speakers are proven) + every input PFL'd
    // (requirePflEach 1-5) + the band present in the PA + the singer's wedge,
    // all with no pop / clip / ring (built-in gates). gainStructure here has
    // NO refChannel: master-only unity check, because playback ends the level
    // turned down. The band mins are 0.25, reachable with faders at unity and
    // a healthy gain: the mix bus power-sums (uncorrelated sources add as
    // sqrt of sum of squares, like a real console), so all five channels at
    // unity with healthy gain sit well under the clip threshold.
    task: true,
    requirePowerOn: true,
    requirePflEach: [1, 2, 3, 4, 7],
    gainStructure: { unity: 0.75, faderTol: 0.06, inputBandAll: [0.645, 4.566] },
    involves: [1, 2, 3, 4, 7],
    verifyEach: [
      { source: 'playback', dest: 'pa',     min: 0.30, label: 'PA tested with playback' },
      { source: 'playback', dest: 'wedge',  min: 0.25, label: 'Wedge 1 tested with playback' },
      { source: 'playback', dest: 'wedge2', min: 0.25, label: 'Wedge 2 tested with playback' },
    ],
    conditions: [
      { source: 'vocal',  dest: 'pa', min: 0.25 },
      { source: 'vocal2', dest: 'pa', min: 0.25 },
      { source: 'guitar', dest: 'pa', min: 0.25 },
      { source: 'laptop', dest: 'pa', min: 0.25 },
      { source: 'vocal',  dest: 'wedge', min: 0.3 },
    ],
    topology: { paRig: 'powered' },
    defs: ['line check'],
    hint: 'Work through the stages in the order they are listed. In the playback test, each speaker checks off once it has played and stays checked, so you do not have to keep them all playing at once. A wedge only plays what its AUX send feeds it. If a channel reads nothing on its meter in PFL, check whether it is one of the two that needs +48V.',
    hints: [
      { title: 'Start the system', target: ['mixer-power', 'out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2'], text: 'Power on in order: console first, then both main speakers and both wedges.', done: (ctx) => ctx.powerStatus && ctx.powerStatus.console && ctx.powerStatus.paStage && ctx.powerStatus.wedges },
      { title: 'Catch a silent speaker', target: ['out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2'], text: 'Test every speaker with playback: send it to MAIN and to both wedges.', done: (ctx) => ctx.verifyStatus && ctx.verifyStatus.pa && ctx.verifyStatus.wedge && ctx.verifyStatus.wedge2 },
      { title: 'Power what needs it', target: ['ch2-phantom', 'ch3-phantom'], text: 'With the channel muted, turn +48V on for channels 2 and 3.', done: (ctx) => ctx.state.channels[1] && ctx.state.channels[1].phantom && ctx.state.channels[2] && ctx.state.channels[2].phantom },
      { title: 'One channel at a time', target: ['ch1-pfl', 'ch2-pfl', 'ch3-pfl', 'ch4-pfl', 'ch7-pfl'], text: 'Line check every input in PFL: the four band channels and the playback.', done: (ctx) => ctx.pflChannels && [1, 2, 3, 4, 7].every((ch) => ctx.pflChannels[ch]) },
      { title: 'Into the main mix', target: ['ch1-strip', 'ch2-strip', 'ch3-strip', 'ch4-strip'], text: 'Bring vocals, bass, and keys into the main mix: gain by the meter, faders at unity.', done: (ctx) => hintReaches(ctx, 'vocal', 'pa', 0.25) && hintReaches(ctx, 'vocal2', 'pa', 0.25) && hintReaches(ctx, 'guitar', 'pa', 0.25) && hintReaches(ctx, 'laptop', 'pa', 0.25) && [1, 2, 3, 4].every((ch) => { var l = (ctx.audio && ctx.audio.chanInBaseline && ctx.audio.chanInBaseline[ch - 1]) || 0; return l >= 0.645 && l <= 4.566; }) },
      { title: 'Feed the wedge', target: 'ch1-aux', text: 'Open AUX 1 on the Vocal 1 channel.', done: (ctx) => hintReaches(ctx, 'vocal', 'wedge', 0.3) },
    ],
    sabotage: (s) => {
      // Cold venue. Everything off, console zeroed, nothing set.
      s.mixer = { on: false };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false, volume: 0, mute: false };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false, volume: 0, mute: false };
      s.outputs.wedge = { ...s.outputs.wedge, on: false, volume: 0, mute: false };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0, mute: false };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false, volume: 0, mute: false };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false, volume: 0, mute: false };
      s.master = { ...s.master, mute: true, fader: 0 };
      for (let i = 0; i < s.channels.length; i++) {
        s.channels[i].mute = true;
        s.channels[i].fader = 0;
        // Playback out (the FOH stereo line is unused in the gig); every input
        // starts at half its per-source healthy gain, so the student sets each by
        // the meter from a weak-but-present start (no channel reads hot to begin).
        s.channels[i].gain = s.channels[i].stereo ? 0 : window.HEALTHY_GAIN_BY_CH[i] * 0.5;
        s.channels[i].phantom = false;
        s.channels[i].aux1 = 0;
        s.channels[i].aux2 = 0;
        s.channels[i].aux3 = 0;
        s.channels[i].aux4 = 0;
      }
      return s;
    },
    solution: 'You ran the whole setup in order: power up, every speaker proven with playback, +48V on the two channels that need it, every input checked in PFL, gain set by the meter with faders at unity, and Vocal 1 in Wedge 1.',
    defaultInspect: 'pa',
  },
  {
    id: 10,
    title: 'Power Down in Order',
    // The bookend, in two beats. Beat 1: ZERO THE CONSOLE (requireZeroed) —
    // every strip back to default: gain, aux sends and fader down, muted, pan
    // centered, HPF off, +48V off, master down AND muted. The next engineer
    // powers on into a predictable desk. Beat 2: POWER OFF in reverse order
    // (requirePowerOff): speakers off FIRST, console off LAST. Turning the
    // console off while a powered speaker is still live plays the console's
    // power-off transient through it (cause 'mixer_off_pop' — same physics
    // as the Level 1 pop, opposite direction). Start state is the end of the
    // night: the band's inputs still live at modest show levels (main bus is
    // clean), with the kind of leftovers a real show leaves behind — pans
    // pushed off center on the DIs, HPF still in on the vocal, +48V on the
    // powered inputs.
    task: true,
    requirePowerOff: true,
    requireZeroed: true,
    involves: [1, 2, 3, 4],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: [],
    hint: 'Work one channel strip at a time: GAIN down, AUX 1 through AUX 4 down, fader down, PAN centered, HPF off, +48V off, MUTE on. MAIN is the one fader that does not belong to a channel strip. If the lesson does not finish, go back across the channels and look for a GAIN still up or a MUTE still off.',
    hints: [
      { title: 'Zero the console', target: ['ch1-strip', 'ch2-strip', 'ch3-strip', 'ch4-strip', 'ch5-strip', 'ch6-strip', 'ch7-strip'], text: 'Zero every channel: GAIN and AUX 1-4 down, fader down, PAN centered, HPF and +48V off, MUTE on.', done: (ctx) => ctx.zeroStatus && ctx.zeroStatus.slice(0, 7).every((z) => z.pass) },
      { title: 'Shut down the main mix', target: ['master-section', 'master-fader'], text: 'Pull the MAIN fader all the way down and mute it.', done: (ctx) => ctx.zeroStatus && ctx.zeroStatus[7] && ctx.zeroStatus[7].pass },
      { title: 'Speakers off first', target: ['out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2'], text: 'Switch off the main speakers and the wedges before the console.', done: (ctx) => ctx.powerStatus && ctx.powerStatus.paOff && ctx.powerStatus.wedgesOff },
      { title: 'Console last', target: 'mixer-power', text: 'Switch the console off last.', done: (ctx) => ctx.powerStatus && !ctx.powerStatus.console },
    ],
    sabotage: (s) => {
      // End-of-night state: a clean live mix (every input at its per-source
      // healthy gain, faders modest), with realistic show leftovers for the
      // zero-out: off-center pans on the DIs, HPF in on the vocal, phantom on
      // the condenser + active DI.
      s.channels[0].mute = false; s.channels[0].fader = 0.55; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0]; s.channels[0].phantom = false; s.channels[0].aux1 = 0.45; s.channels[0].aux2 = 0; s.channels[0].highpass = true;
      s.channels[1].mute = false; s.channels[1].fader = 0.55; s.channels[1].gain = window.HEALTHY_GAIN_BY_CH[1]; s.channels[1].phantom = true;  s.channels[1].aux1 = 0;    s.channels[1].aux2 = 0;
      s.channels[2].mute = false; s.channels[2].fader = 0.4;  s.channels[2].gain = window.HEALTHY_GAIN_BY_CH[2]; s.channels[2].phantom = true;  s.channels[2].aux1 = 0;    s.channels[2].aux2 = 0; s.channels[2].pan = 0.3;
      s.channels[3].mute = false; s.channels[3].fader = 0.4;  s.channels[3].gain = window.HEALTHY_GAIN_BY_CH[3]; s.channels[3].phantom = false; s.channels[3].aux1 = 0;    s.channels[3].aux2 = 0; s.channels[3].pan = 0.7;
      s.channels[6].mute = true;  s.channels[6].fader = 0;    s.channels[6].gain = 0;   s.channels[6].aux1 = 0;        s.channels[6].aux2 = 0;
      s.master = { ...s.master, mute: false, fader: 0.75 };
      s.mixer = { on: true };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: true, volume: 0.6, mute: false };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: true, volume: 0.6, mute: false };
      s.outputs.wedge = { ...s.outputs.wedge, on: true, volume: 0.6, mute: false };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: true, volume: 0.6, mute: false };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false, volume: 0, mute: false };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false, volume: 0, mute: false };
      return s;
    },
    solution: 'With the speakers already off, nothing was left on to play the console\'s switch-off pop. The zeroed console starts from a known state next time.',
    defaultInspect: 'pa',
  },
];

// START HERE — the free first-impression course. A short chain of little wins
// on a system that is already patched and playing, so a newcomer gets real
// value fast without the from-scratch patch/power grind (that now lives in the
// members' Run the Show course). Lesson-style like LEVELS (guided coach + win
// detection), free, and it ends on the email opt-in + join call to action.
// Stable ids in their own 100s range so they never collide with LEVELS.
window.START_HERE = [
  {
    id: 101, task: true, requireSound: true,
    title: 'Turn On the Sound',
    involves: [1, 2, 3, 4],
    // First quick win: wake the system up. Turn the app sound on (top bar), then
    // bring the MAIN fader up so the band fills the room. Teaches the SOUND
    // button and that the main fader is the overall level to the audience.
    defs: ['fader', 'main mix', 'mains'],
    hint: 'First, hit the SOUND button in the top bar so you can hear the app. Then bring the MAIN fader in the master section up: that is your overall level to the audience.',
    hints: [
      { title: 'Turn on the sound', target: 'sound', text: 'Press the SOUND button in the top bar to turn the sound on.', done: (ctx) => !!ctx.audioOn },
      { title: 'Bring up the main mix', target: 'master-fader', text: 'Bring the MAIN fader up until the band is loud enough for the audience.', done: (ctx) => ctx.state.master && !ctx.state.master.mute && ctx.state.master.fader >= 0.6 },
    ],
    conditions: [
      { source: 'guitar', dest: 'pa', min: 0.2 },
      { source: 'laptop', dest: 'pa', min: 0.2 },
    ],
    sabotage: (s) => {
      // Instruments up and ready, but the mains are all the way down and the app
      // sound is off. The two moves: sound on, then bring the main fader up. The
      // vocals stay down until lesson 103, so this first win is bass + keys only.
      s.master.fader = 0; s.master.mute = false;
      s.outputs.pa_l.volume = 0.65; s.outputs.pa_r.volume = 0.65;
      s.channels[2].phantom = true; // active DI on bass, powered so it plays
      s.channels[0].mute = true; s.channels[0].fader = 0;
      s.channels[1].mute = true; s.channels[1].fader = 0; s.channels[1].phantom = false;
      return s;
    },
    solution: 'Sound on, MAIN fader up. The band comes up in the mains. The main fader is your overall level to the audience.',
    defaultInspect: 'pa',
  },
  {
    id: 102, task: true,
    title: 'Balance the Band',
    involves: [1, 2, 3, 4],
    // Teach the channel fader. At this point only the bass and keys are up (the
    // vocals come in the next lesson). Pull each instrument's fader down and hear
    // it drop. requireAdjust latches once a fader is >= 6 dB below its start, so
    // a beginner makes a move big enough to clearly hear.
    defs: ['input channel'],
    hint: 'Pull the KEYS fader (channel 4) down at least 6 dB and listen: the keyboard drops while everything else stays put. Then do the same with the BASS (channel 3).',
    hints: [
      { title: 'Pull the keyboard down', target: 'ch4-fader', text: 'Pull the KEYS fader (channel 4) down at least 6 dB. Only the keyboard gets quieter.', done: (ctx) => !!(ctx.adjustLatched && ctx.adjustLatched[4]) },
      { title: 'Now the bass', target: 'ch3-fader', text: 'Pull the BASS fader (channel 3) down at least 6 dB. Only the bass gets quieter.', done: (ctx) => !!(ctx.adjustLatched && ctx.adjustLatched[3]) },
    ],
    conditions: [],
    requireAdjust: [3, 4],
    sabotage: (s) => {
      // Only bass + keys are up here (the vocals arrive next lesson). Bass DI is
      // powered so it plays; both vocals are muted and down.
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.channels[2].phantom = true; // active DI on bass, powered
      s.channels[0].mute = true; s.channels[0].fader = 0;
      s.channels[1].mute = true; s.channels[1].fader = 0;
      return s;
    },
    solution: 'Each channel fader controls the level of one channel. You balance the band by setting those levels against each other.',
    defaultInspect: 'pa',
  },
  {
    id: 103, task: true,
    title: 'Check Vocal 1 in Your Headphones',
    involves: [1, 2, 3, 4],
    // SPLIT (Kyle 2026-07-20): the old lesson 103 did the whole input routine
    // and introduced six terms at once. Now it is three: listen and set the
    // gain (103), bring it into the mix (106), then power a condenser (107).
    // Win here is PFL + a healthy input gain only. The fader stays down, so
    // nothing reaches the audience yet and the student cannot "fix" it by
    // pushing a fader.
    requirePflCheck: true,
    requireNoPfl: false,
    gainStructure: { refChannel: 1, inputBand: [0.645, 4.566], gainOnly: true },
    defs: ['PFL', 'gain', 'meter'],
    hint: 'PFL lets you listen to a channel in your headphones without sending it to the audience. With it engaged, the input meter shows what that channel is receiving, so you can set the gain before anyone hears it.',
    hints: [
      { title: 'Listen to Vocal 1', target: 'ch1-pfl', text: 'Press PFL on channel 1 to hear Vocal 1 in your headphones.', done: (ctx) => (ctx.pflChannels && ctx.pflChannels[1]) || (ctx.state.channels[0] && ctx.state.channels[0].solo) },
      { title: 'Set the gain', target: 'ch1-gain', text: 'Turn the GAIN up until the input meter peaks near the top of the green, without reaching the top.', done: (ctx) => ctx.state.channels[0] && ctx.state.channels[0].gain >= 0.4 },
    ],
    conditions: [],
    sabotage: (s) => {
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.65; s.outputs.pa_r.volume = 0.65;
      s.channels[2].phantom = true; // bass powered, so the band plays under the vocals
      s.channels[0].gain = 0; s.channels[0].fader = 0; s.channels[0].mute = true; s.channels[0].solo = false;
      s.channels[1].gain = 0; s.channels[1].fader = 0; s.channels[1].mute = true; s.channels[1].solo = false; s.channels[1].phantom = false;
      return s;
    },
    solution: 'PFL let you hear Vocal 1 and read its input meter without sending it to the audience. The gain is set at the top of the channel, before anything else.',
    defaultInspect: 'pa',
  },
  {
    id: 106, task: true,
    title: 'Bring Vocal 1 into the Mix',
    involves: [1, 2, 3, 4],
    // Vocal 1 arrives with its gain already set (lesson 103's work carried
    // forward) and still in PFL, so this lesson is only the moves that put a
    // channel into the main mix. The LR assign is one of them: the channel is
    // unassigned at load, so PFL proves the signal is there while the room still
    // gets nothing until it is routed.
    requireNoPfl: true,
    gainStructure: { refChannel: 1, unity: 0.75, faderTol: 0.06, inputBand: [0.645, 4.566] },
    defs: ['main mix', 'mute', 'fader', 'unity'],
    hint: 'PFL only feeds your headphones, so disengaging it does not change the audience mix. A channel reaches the audience when it is assigned to the main mix with LR, unmuted, and its fader is up. LR is the button by the bottom of the fader.',
    hints: [
      { title: 'Leave PFL', target: 'ch1-pfl', text: 'Press PFL on channel 1 again to disengage it.', done: (ctx) => ctx.state.channels[0] && !ctx.state.channels[0].solo },
      { title: 'Assign it to the main mix', target: 'ch1-lr', text: 'Press LR at the bottom of channel 1 to assign it to the main mix.', done: (ctx) => ctx.state.channels[0] && ctx.state.channels[0].toMain !== false },
      { title: 'Unmute the channel', target: 'ch1-mute', text: 'Switch MUTE off on channel 1.', done: (ctx) => ctx.state.channels[0] && !ctx.state.channels[0].mute },
      { title: 'Fader to unity', target: 'ch1-fader', text: 'Raise the channel 1 fader to the U mark.', done: (ctx) => ctx.state.channels[0] && Math.abs(ctx.state.channels[0].fader - 0.75) <= 0.06 },
    ],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
    ],
    sabotage: (s) => {
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.65; s.outputs.pa_r.volume = 0.65;
      s.channels[2].phantom = true;
      // Gain already set in the previous lesson; still in PFL, muted, fader down.
      s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0]; s.channels[0].fader = 0; s.channels[0].mute = true; s.channels[0].solo = true; s.channels[0].toMain = false;
      s.channels[1].gain = 0; s.channels[1].fader = 0; s.channels[1].mute = true; s.channels[1].solo = false; s.channels[1].phantom = false;
      return s;
    },
    solution: 'Assign it to the main mix, unmute, fader to unity. Those are the same moves for every channel you bring into the mix, and LR is the one people forget.',
    defaultInspect: 'pa',
  },
  {
    id: 107, task: true,
    title: 'Power a Condenser Microphone',
    involves: [1, 2, 3, 4],
    // Vocal 2 is a condenser: no signal at all until +48V is on. Phantom is
    // switched while the channel is muted, so the thump never reaches the
    // audience.
    requireNoPfl: true,
    gainStructure: { refChannel: 2, unity: 0.75, faderTol: 0.06, inputBand: [0.645, 4.566] },
    defs: ['condenser microphone', 'phantom power'],
    hint: 'A condenser has electronics inside that need power, so it makes no signal at all until +48V is on. Switch phantom while the channel is muted, then bring it in the same way as Vocal 1.',
    hints: [
      { title: 'Power the microphone', target: 'ch2-phantom', text: 'Leave channel 2 muted and switch +48V on for that channel.', done: (ctx) => ctx.state.channels[1] && ctx.state.channels[1].phantom },
      { title: 'Bring Vocal 2 in', target: 'ch2-strip', text: 'On channel 2: press PFL, set the GAIN by the input meter, disengage PFL, unmute, then fader to the U mark.', done: (ctx) => hintReaches(ctx, 'vocal2', 'pa', 0.3) },
    ],
    conditions: [
      { source: 'vocal2', dest: 'pa', min: 0.3 },
    ],
    sabotage: (s) => {
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.65; s.outputs.pa_r.volume = 0.65;
      s.channels[2].phantom = true;
      // Vocal 1 is up and in the mix, carried forward from lesson 106.
      s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0]; s.channels[0].fader = 0.75; s.channels[0].mute = false; s.channels[0].solo = false;
      // Vocal 2: condenser, unpowered, muted, ungained.
      s.channels[1].gain = 0; s.channels[1].fader = 0; s.channels[1].mute = true; s.channels[1].solo = false; s.channels[1].phantom = false;
      return s;
    },
    solution: 'Vocal 2 is a condenser, so it made no signal until +48V powered it. Phantom goes on while the channel is muted, then the channel comes in like any other.',
    defaultInspect: 'pa',
  },
  {
    id: 104, task: true,
    title: 'Build a Monitor Mix',
    involves: [1, 2, 3, 4],
    // Vocal live in the PA, her wedge up. Just the aux send: open AUX 1 on the
    // vocal to feed her monitor. (Adapts the Monitor Mix lesson.)
    defs: ['aux send', 'wedge', 'monitor mix'],
    hint: 'Wedge 1 is on and turned up. Turn up AUX 1 on the Vocal 1 channel to send her voice to it.',
    hints: [
      { title: 'Send Vocal 1 to Wedge 1', target: 'ch1-aux', text: 'Turn AUX 1 up on the Vocal 1 input channel to send Vocal 1 to Wedge 1.', done: (ctx) => hintReaches(ctx, 'vocal', 'wedge', 0.3) },
    ],
    conditions: [
      { source: 'vocal', dest: 'pa',    min: 0.3 },
      { source: 'vocal', dest: 'wedge', min: 0.3 },
    ],
    sabotage: (s) => {
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      s.channels.forEach(c => c.aux1 = 0);
      return s;
    },
    solution: 'AUX 1 up on the Vocal 1 channel sends it to Wedge 1. The singer can hear herself.',
    defaultInspect: 'wedge',
  },
  {
    id: 105, task: true,
    title: 'Ring Out the Feedback',
    involves: [1, 2, 3, 4],
    // The singer wants more of herself in the wedge. As the student pushes AUX 1
    // up, the wedge crosses the ring threshold and feeds back. To win: vocal
    // strong in the wedge (>= 0.8) AND no feedback, so pulling the send back
    // down will not do it. The fix is the monitor EQ: cut the glowing band.
    defs: ['feedback', 'ring out', 'graphic EQ'],
    hint: 'Turn up AUX 1 on the Vocal 1 channel to raise it in Wedge 1. When it rings, look at the Wedge 1 Monitor EQ: the ringing frequency glows. Pull that band down far enough to stop the ring. Cuts cost a little level, so keep them small.',
    hints: [
      { title: 'Raise Vocal 1 in Wedge 1', target: 'ch1-aux', text: 'Bring AUX 1 on the Vocal 1 input channel up until Wedge 1 starts to ring.', done: (ctx) => ctx.hasRung || hintReaches(ctx, 'vocal', 'wedge', 0.8) },
      { title: 'Ring it out', target: ['monitor-eq', 'out-wedge1'], text: 'Open MONITOR EQ in the top bar and cut each glowing band until the ringing stops, turning AUX 1 back up between cuts until Vocal 1 is strong in Wedge 1.', done: (ctx) => !ctx.feedback && hintReaches(ctx, 'vocal', 'wedge', 0.8) && (((ctx.state.outputs.wedge || {}).eq) || []).some((v) => v < 0) },
    ],
    conditions: [
      { source: 'vocal', dest: 'pa',    min: 0.3 },
      { source: 'vocal', dest: 'wedge', min: 0.8 },
    ],
    sabotage: (s) => {
      s.master.fader = 0.75; s.master.mute = false;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.7; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      s.channels[0].aux1 = 0.2;
      s.channels[0].highpass = false;
      return s;
    },
    solution: 'Turn Vocal 1 up in Wedge 1, then ring it out: pull the glowing band down on the Monitor EQ to cut the ringing frequency.',
    defaultInspect: 'wedge',
  },
];

// PRACTICE MODE — the paid tier. One endless scenario instead of a fixed
// challenge list: every rep starts with the band up and playing, then breaks
// 1-3 things (the FAULTS selector in the top bar) drawn at random from the
// fault pool below. The student finds and fixes them. The fault placement is
// seeded per rep, so Reset replays the same rep and the next rep is always
// new. Locked on the free tier; ?tier=member unlocks it.
//
// This is the sustainability model: a new training rep costs zero authoring
// time. Growing the product = adding entries to PRACTICE_FAULTS (data-only,
// edit this file and deploy) or new fault physics (quarterly engine work —
// hum + ground lift, cable crackle, and friends land here as new pool
// entries when their engine support exists).
//
// Presentation (handled by the app, not by fields here):
//   - Symptom only; the hint hides behind a "Need a hint?" button.
//   - The solve shows a DEBRIEF (moves vs par, hints, rep count), never an
//     answer key.
//   - The app sets window.PRACTICE_FAULT_COUNT from the FAULTS selector
//     before calling sabotage, and reads window.PRACTICE_LAST (par + fault
//     keys for the debrief) after.
//
// The shared start state is bandUp(): the four band inputs live at healthy
// show levels, playback muted, master at unity, PA + wedges up. Conditions
// cover every source on BOTH sides of the PA, so the win is generic no
// matter what the rng broke — and a hard-panned or one-sided fault can't
// slip through.
//
// Numbers (real-units engine): each source at its PER-SOURCE healthy gain
// (HEALTHY_GAIN_BY_CH: bass ~0.77, keys ~0.23, mics ~0.42-0.48) -> chanIn 0.81
// (+4 dBu, -18 dBFS) on every channel, fader 0.6 (-5.8 dB) -> post 0.415,
// master at unity, PA trim 0.6 (-6 dB) -> per-source, per-side PA contribution
// 0.27 (conditions min 0.2 with margin); the main bus power-sums to about
// 0 dBu, 22 dB under the clip. Same meters as the old uniform-0.42 board — the
// gain KNOBS now sit at realistic per-source spots.
// ---- Board descriptor. Which channels are real inputs, on the MX-8 OR the
// 16-channel board, derived from state so ONE fault engine serves both. For the
// MX-8 these reproduce the old hardcoded values exactly (inputs 0-3, powered
// 1-2, playback ch6); on the 16-channel board they expand to all 14 inputs.
function pbInputs(s) {
  const out = [];
  for (let i = 0; i < s.channels.length; i++) {
    if (s.channels[i].stereo) continue;                                 // the playback strip
    if (window.sourceFor && window.sourceFor(s, i)) out.push(i);        // patched to a real source
  }
  return out;
}
function pbSources(s) { return pbInputs(s).map((i) => window.sourceFor(s, i)); }
function pbPowered(s) { return pbInputs(s).filter((i) => { const d = window.SOURCES[window.sourceFor(s, i)]; return d && (d.kind === 'condenser' || d.diActive); }); }
function pbMics(s) { return pbInputs(s).filter((i) => { const d = window.SOURCES[window.sourceFor(s, i)]; return d && (d.kind === 'dynamic' || d.kind === 'condenser'); }); }
function pbPlayback(s) { return s.channels.findIndex((c) => c.stereo); }
function pbPick(arr, rng) { return arr.length ? arr[Math.floor((rng ? rng() : 0) * arr.length)] : -1; }

// Healthy 16-channel start: every one of the 14 inputs up at its per-source
// nominal gain, playback muted, PA and wedges on. Mirrors the MX-8 bandUp.
function bandUp16(s) {
  for (const i of pbInputs(s)) {
    const c = s.channels[i];
    const d = window.SOURCES[window.sourceFor(s, i)];
    c.mute = false;
    c.fader = 0.6;
    c.gain = window.healthyGain(d ? d.dbu : null);
    c.phantom = !!(d && (d.kind === 'condenser' || d.diActive));
    // Same as bandUp: sends are per-song, zero them for identical rep starts.
    c.aux1 = 0; c.aux2 = 0; c.aux3 = 0; c.aux4 = 0;
  }
  const pb = pbPlayback(s);
  if (pb >= 0) { s.channels[pb].mute = true; s.channels[pb].fader = 0; s.channels[pb].gain = 0; }
  s.master.mute = false; s.master.fader = 0.75;
  s.master.aux1 = 0.75; s.master.aux2 = 0.75; s.master.aux3 = 0.75; s.master.aux4 = 0.75;
  ['pa_l', 'pa_r', 'wedge', 'wedge2', 'wedge3', 'wedge4'].forEach((k) => {
    if (s.outputs[k]) { s.outputs[k].on = true; s.outputs[k].mute = false; s.outputs[k].volume = 0.6; }
  });
  return s;
}

function bandUp(s) {
  if (s.big16) return bandUp16(s);
  for (let i = 0; i < 4; i++) {
    s.channels[i].mute = false;
    s.channels[i].fader = 0.6;
    s.channels[i].gain = window.HEALTHY_GAIN_BY_CH[i]; // per-source healthy input: every channel nominal, ~0.81 baseline
    // Condenser (ch2) and active DI (ch3) need +48V to pass signal.
    s.channels[i].phantom = (i === 1 || i === 2);
    // Monitor sends are per-song, not room tuning: zero them so every rep
    // (and every shared ?rep= link) starts identical no matter what the
    // lessons left behind (the Start Here finale exits with AUX 1 cranked).
    s.channels[i].aux1 = 0; s.channels[i].aux2 = 0; s.channels[i].aux3 = 0; s.channels[i].aux4 = 0;
  }
  s.channels[6].mute = true; s.channels[6].fader = 0; s.channels[6].gain = 0;
  s.master.mute = false; s.master.fader = 0.75;
  s.master.aux1 = 0.75; s.master.aux2 = 0.75; s.master.aux3 = 0.75; s.master.aux4 = 0.75;
  s.outputs.pa_l.on = true; s.outputs.pa_l.mute = false; s.outputs.pa_l.volume = 0.6;
  s.outputs.pa_r.on = true; s.outputs.pa_r.mute = false; s.outputs.pa_r.volume = 0.6;
  s.outputs.wedge.on = true; s.outputs.wedge.mute = false; s.outputs.wedge.volume = 0.6;
  s.outputs.wedge2.on = true; s.outputs.wedge2.mute = false; s.outputs.wedge2.volume = 0.6;
  return s;
}
const BAND_SOURCES = ['vocal', 'vocal2', 'guitar', 'laptop'];
// 0-based indexes of the band channels that need +48V: ch2 condenser, ch3
// active DI. The phantom fault can only land where phantom matters.
const POWERED_IDX = [1, 2];

// A live mic amplified on a channel gained for a DI feeds back through the PA.
// The bass channel is the only one gained hot enough to do it (its healthy gain
// is the highest), so a crosspatch must never leave a mic there or the rep opens
// howling and the app misreads the PA feedback as a wedge ring (Kyle 2026-07-06:
// "starts with howling feedback, but the problem is actually a crosspatch"). A
// DI landing on a hot channel just runs hot, which reads on the correct channel
// and is fine. These helpers let the crosspatch faults reject the mic-on-hot
// swaps and keep the rest.
const MIC_SOURCES = ['vocal', 'vocal2'];
function hotMicChannel() {
  const g = (window.HEALTHY_GAIN_BY_CH || []).slice(0, 4);
  if (!g.length) return 2;
  let hi = 0; for (let i = 1; i < g.length; i++) if (g[i] > g[hi]) hi = i;
  return hi;
}
// Channel index a source currently lands on: source -> its cable's port ->
// the channel that port feeds (fanOut). Reflects whatever cables/fanOut hold now.
function sourceChannel(s, src) { return s.fanOut[s.cables[src] - 1] - 1; }
// A crosspatch swap to reject: it would either howl (a live mic on the hot
// channel) or scream (a very low-gain source slammed onto a much hotter channel,
// e.g. the keyboard on the bass channel, which opens at ~117 dB and reads as a
// distortion fault, not a crosspatch). A MODERATE hot channel is left alone: a
// crosspatch really does mis-gain a channel, and that clue reads on the correct
// channel and clears when you re-patch (Kyle 2026-07-06: no feedback, stay
// realistic). The 6.0 ceiling is well above the deliberate 'gain too hot' fault
// (~3.6) so ordinary hot channels pass; only the absurd overloads are rejected.
function crosspatchBad(s) {
  const hot = hotMicChannel();
  if (MIC_SOURCES.some((m) => sourceChannel(s, m) === hot)) return true;
  const a = window.computeAudio ? window.computeAudio(s) : null;
  if (a && a.chanInBaseline) {
    for (let i = 0; i < 4; i++) { if (a.chanInBaseline[i] > 6) return true; }
  }
  return false;
}

// 16-channel patch correctness: a pro's patch matches the input list, so every
// mic sits in its listed sub-snake input (micIn) AND every input lands on its
// listed console channel (cables). Used both to gate the Practice win and to
// show the "Patched per the input list" row, so a crosspatch / wrong-input /
// unplugged fault can't hide even when the source stays audible on a wrong
// channel. The correct mapping IS the natural default: channel = order in
// BAND_KEYS, slot = order within the sub-snake.
window.big16PatchOk = function (s) {
  const keys = window.BAND_KEYS || [];
  const SRC = window.SOURCES || {};
  const cnt = {};
  for (const k of keys) {
    if ((s.cables[k] || 0) !== keys.indexOf(k) + 1) return false;
    const sn = (SRC[k] || {}).snake;
    if (!sn) continue;
    cnt[sn] = (cnt[sn] || 0) + 1;
    const naturalSlot = cnt[sn];
    // micSlot, not `micIn[k] || naturalSlot`: an UNPLUGGED mic is slot 0, and
    // the falsy-zero fallback would read that as correctly patched.
    if ((window.micSlot ? window.micSlot(s, k, naturalSlot) : ((s.micIn && s.micIn[k]) || naturalSlot)) !== naturalSlot) return false;
  }
  // FOH fan-out must be 1:1 too: snake channel i lands on console channel i. A
  // crosspatch at the console fan-out (fanOut non-identity) keeps every source
  // audible but on the wrong channel, so check it here or it would hide behind
  // a passing signal-flow win. Missing fanOut reads as identity (legacy states).
  const fan = s.fanOut || [];
  for (let i = 0; i < keys.length; i++) { if ((fan[i] || i + 1) !== i + 1) return false; }
  return true;
};
// Reject a 16-ch crosspatch that overloads a channel (a source slammed onto a
// much hotter channel reads as a distortion fault, not a crosspatch). Mirrors
// the MX-8 crosspatchBad clip guard over the whole desk.
function big16CrosspatchBad(s) {
  const a = window.computeAudio ? window.computeAudio(s) : null;
  if (a && a.chanInBaseline) {
    for (let i = 0; i < a.chanInBaseline.length; i++) { if (a.chanInBaseline[i] > 6) return true; }
  }
  return false;
}
// Ensure micIn exists (natural slots) so a wrong-input fault has something to
// swap even if the start state predates the micIn field.
function ensureMicIn16(s) {
  if (s.micIn) return s.micIn;
  const keys = window.BAND_KEYS || [];
  const SRC = window.SOURCES || {};
  const cnt = {};
  s.micIn = {};
  for (const k of keys) { const sn = (SRC[k] || {}).snake; if (!sn) continue; cnt[sn] = (cnt[sn] || 0) + 1; s.micIn[k] = cnt[sn]; }
  return s.micIn;
}

// The fault pool. Each entry is ONE thing that can go wrong, applied on top
// of the bandUp() start state. `apply` places the fault with the seeded rng.
// `par` is the move count of the systematic fix — inspecting and listening
// are free, so a one-knob fix is par 1; a safe replug or a safe +48V fix is
// mute -> fix -> unmute, par 3 (plugging into a live channel, or switching
// +48V on one, pops the system).
//
// `weight` (default 1) makes a fault appear more often. Feedback carries
// weight 2 per Kyle (2026-06-11): mic feedback is the live-sound problem,
// so it shows up in a bigger share of reps.
//
// `apply` may RETURN { conditions: [...] } to attach extra win conditions to
// the rep — the feedback fault uses this to require the singer's monitor to
// STAY UP, so pulling the send to zero isn't a fix; ringing the wedge out on
// its EQ band is.
window.PRACTICE_FAULTS = [
  { key: 'cable',        label: 'Cable unplugged',   blurb: "A channel's input cable is unplugged.",                  par: 3, apply: (s, rng) => { const src = pbPick(pbSources(s), rng); if (src) s.cables[src] = 0; } },
  { key: 'gain',         label: 'Gain at zero',      blurb: "A channel's gain is at zero, so its meter never moves.",  par: 1, apply: (s, rng) => { const i = pbPick(pbInputs(s), rng); if (i >= 0) s.channels[i].gain = 0; } },
  // GAIN TOO HOT — the opposite of 'gain at zero'. A channel's gain is set a few
  // dB into the red, so the preamp clips and the channel distorts even though
  // signal is flowing fine. The win engine already blocks a solve while anything
  // is in the red (the `clean` gate in the App), so this is a real diagnosis,
  // not an auto-win: the fix is to read the red meter and pull GAIN back down.
  // The gain knob is exponential (~+3 dB per 0.05), so a FIXED knob value would
  // clip wildly differently per channel; instead we offset from each channel's
  // calibrated healthy gain. +0.22 puts chanIn baseline ~3.6-3.8 on any of the
  // three candidates — solidly clipping (verified against detectClipping,
  // including the condenser on ch1 which needs the most gain to clip), yet a
  // realistic few-dB overshoot, not an absurd slam. Restricted to vox 1/2 and
  // keys (bass's quiet source reads borderline). Aux sends are 0 in the base
  // Practice state, so cranking the preamp distorts without ringing a wedge.
  { key: 'gain-hot',     label: 'Gain too hot',      blurb: "A channel's gain is set so hot the preamp clips and the channel distorts.", par: 2, apply: (s, rng) => {
      if (s.big16) { const i = pbPick(pbInputs(s), rng); if (i >= 0) s.channels[i].gain = Math.min(1, s.channels[i].gain + 0.22); return; }
      const ch = [0, 1, 3][Math.floor((rng ? rng() : 0) * 3)]; s.channels[ch].gain = Math.min(1, window.HEALTHY_GAIN_BY_CH[ch] + 0.22);
    } },
  { key: 'fader',        label: 'Fader down',        blurb: 'A channel fader is all the way down.',                    par: 1, apply: (s, rng) => { const i = pbPick(pbInputs(s), rng); if (i >= 0) s.channels[i].fader = 0; } },
  { key: 'mute',         label: 'Channel muted',     blurb: 'A channel is muted.',                                    par: 1, apply: (s, rng) => { const i = pbPick(pbInputs(s), rng); if (i >= 0) s.channels[i].mute = true; } },
  // Routing: the channel is set up correctly and its meter reads, it just was
  // never assigned to the main mix. Nastier to find than a mute, because every
  // control on the strip looks right and PFL sounds fine. One of the handful of
  // faults that actually turn up on a real show.
  { key: 'unassigned',   label: 'Not assigned to the main mix', blurb: 'A channel is not assigned to the main mix, so it never reaches the audience.', par: 1, apply: (s, rng) => { const i = pbPick(pbInputs(s), rng); if (i >= 0) s.channels[i].toMain = false; } },
  // NOTE: no 'pan' fault. The win reads the LOUDER PA side (pan is a free
  // creative choice, not a fault — see PRACTICE_CONDITIONS below), so a hard
  // pan still passes every condition. It was an automatic win, so it's out.
  { key: 'phantom',      label: 'Phantom power off', blurb: 'Phantom power is off, so a condenser or active DI is silent.', par: 3, apply: (s, rng) => { const i = pbPick(pbPowered(s), rng); if (i >= 0) s.channels[i].phantom = false; } },
  { key: 'master-mute',  label: 'Master muted',      blurb: 'The master is muted, so nothing reaches the audience.',   par: 1, apply: (s)      => { s.master.mute = true; } },
  { key: 'master-fader', label: 'Master fader down', blurb: 'The master fader is down.',                               par: 1, apply: (s)      => { s.master.fader = 0; } },
  { key: 'pa-volume',    label: 'PA volume down',    blurb: 'One main speaker is turned down.',                          par: 1, apply: (s, rng) => { s.outputs[rng() < 0.5 ? 'pa_l' : 'pa_r'].volume = 0; } },
  { key: 'pa-mute',      label: 'Main speaker muted',          blurb: 'One main speaker is muted, so one side of the audience is silent.', par: 1, apply: (s, rng) => { s.outputs[rng() < 0.5 ? 'pa_l' : 'pa_r'].mute = true; } },
  // DIGITAL-ONLY faults (digital: true). They live in the mute-group buttons and
  // DCA faders on the digital surface and have no analog equivalent, so the draw
  // skips them unless window.PRACTICE_SURFACE === 'digital'.
  { key: 'mute-group',   label: 'Mute group engaged', blurb: 'A mute group is silencing channels even though their own MUTE is off.', par: 2, digital: true, apply: (s, rng) => {
      // Light a group carrying band-critical channels (VOX or BAND, not ALL/FX).
      // The members read silent with their MUTE button off; the fix is to find
      // the lit group and clear it.
      const gi = (rng() < 0.5) ? 0 : 1;
      if (s.muteGroups && s.muteGroups[gi]) s.muteGroups[gi].active = true;
    } },
  { key: 'dca-down',     label: 'DCA pulled down',    blurb: 'A DCA fader is down, so its channels are silent in the mains while their channel faders look fine.', par: 1, digital: true, apply: (s, rng) => {
      const di = (rng() < 0.5) ? 0 : 1;
      if (s.dcas && s.dcas[di]) s.dcas[di].fader = 0;
    } },
  { key: 'soft-patch',   label: 'Input not patched', blurb: 'A channel gets no signal because its input is unassigned in the soft patch, even though the cable is fine.', par: 2, digital: true, apply: (s, rng) => {
      if (!s.inputPatch) s.inputPatch = [1, 2, 3, 4, 5, 6, 7];
      const ci = Math.floor((rng ? rng() : 0) * 4); // a band channel (0-3)
      s.inputPatch[ci] = 0;
    } },
  { key: 'scene-recall', label: 'Wrong scene recalled', blurb: 'The wrong scene is loaded, so faders and mutes jumped to the wrong values.', par: 2, digital: true, apply: (s) => {
      // Snapshot the healthy state as SHOW, build a broken SOUNDCHK, apply it to
      // the live channels, and leave SOUNDCHK active. Fix = recall SHOW from the
      // SCENES strip. Only faders/mutes are stored, which is exactly what the
      // fault touches, so a recall fully restores the rep.
      const snap = () => ({ channels: s.channels.map(c => ({ fader: c.fader, mute: c.mute })) });
      const show = snap();
      const sc = snap();
      sc.channels[0].mute = true;                       // lead vocal muted in soundcheck
      if (sc.channels[3]) sc.channels[3].fader = 0;     // keys fader down in soundcheck
      s.channels = s.channels.map((c, i) => ({ ...c, fader: sc.channels[i].fader, mute: sc.channels[i].mute }));
      s.scenes = [
        { name: 'SHOW',     snapshot: show },
        { name: 'SOUNDCHK', snapshot: sc },
        { name: 'WALK-IN',  snapshot: null },
      ];
      s.currentScene = 1;
    } },
  // FEEDBACK is NOT in this stacked pool. Faults here share one generic prompt
  // ("something is broken, find it"), so a feedback fault could only announce
  // itself by RINGING on load, and stacked with others that meant the rep could
  // open on a wall of howling wedges (Kyle 2026-07-08: "very annoying"). Real
  // feedback is caused, not walked into: you push a wedge up and it rings. So it
  // lives as its own latent task, window.MONITOR_RING (below), which opens quiet
  // and rings only when the student raises the send. It never stacks and never
  // opens howling.
  // CROSSPATCH — two cables traded places. The console's channel labels and
  // the patch row in the brief are the evidence; one drag (swap) fixes it.
  // Stage-box version trades two sources' input ports; snake version trades
  // two fan-out tails at FOH. Practice always requires the patch to match
  // the input list (PRACTICE.requirePatch), so these can't hide even when
  // both swapped channels happen to stay audible. Par 3 because changing a
  // patch on a live channel POPS: the safe fix is master down (one move,
  // covers both channels) -> swap -> master back up.
  { key: 'crosspatch-stage', label: 'Crosspatch at the stage box', blurb: 'Two inputs are swapped at the stage box.', par: 3, big8only: true, apply: (s, rng) => {
    // Random source-port swaps, but reject any that leave a live mic on the hot
    // (bass) channel — that howls and reads as feedback, not a crosspatch. Falls
    // back to trading the two mics, which can never land a mic on the DI channel.
    for (let tries = 0; tries < 16; tries++) {
      const i = Math.floor(rng() * 4);
      let j = Math.floor(rng() * 3); if (j >= i) j += 1;
      const a = BAND_SOURCES[i], b = BAND_SOURCES[j];
      const t = s.cables[a]; s.cables[a] = s.cables[b]; s.cables[b] = t;
      if (!crosspatchBad(s)) return;
      const u = s.cables[a]; s.cables[a] = s.cables[b]; s.cables[b] = u; // undo, retry
    }
    const t = s.cables['vocal']; s.cables['vocal'] = s.cables['vocal2']; s.cables['vocal2'] = t;
  } },
  { key: 'crosspatch-snake', label: 'Crosspatch at the snake', blurb: 'Two channels are swapped at the snake.', par: 3, big8only: true, apply: (s, rng) => {
    // Same guard for the snake variant (swaps which channel each port feeds).
    // Fallback trades the two non-mic channel tails, so the mics stay put.
    for (let tries = 0; tries < 16; tries++) {
      const i = Math.floor(rng() * 4);
      let j = Math.floor(rng() * 3); if (j >= i) j += 1;
      const t = s.fanOut[i]; s.fanOut[i] = s.fanOut[j]; s.fanOut[j] = t;
      if (!crosspatchBad(s)) return;
      const u = s.fanOut[i]; s.fanOut[i] = s.fanOut[j]; s.fanOut[j] = u; // undo, retry
    }
    const t = s.fanOut[2]; s.fanOut[2] = s.fanOut[3]; s.fanOut[3] = t;
  } },
  // 16-CHANNEL crosspatch faults — enabled by the band stage's patch UI.
  // Stage-box version: two inputs land on each other's console channel (the
  // mics stay in their inputs; the tails are swapped at the box). Fix at the
  // box: drag a tail back onto its listed channel. Par 3 — patching a live
  // channel pops, so the safe fix is master down -> swap -> master up.
  { key: 'crosspatch-box-16', label: 'Crosspatch at the stage box', blurb: 'Two inputs are landing on each other\'s channel at the stage box.', par: 3, big16only: true, apply: (s, rng) => {
    const keys = window.BAND_KEYS || [];
    for (let tries = 0; tries < 24; tries++) {
      const i = Math.floor(rng() * keys.length);
      let j = Math.floor(rng() * (keys.length - 1)); if (j >= i) j += 1;
      const a = keys[i], b = keys[j];
      const t = s.cables[a]; s.cables[a] = s.cables[b]; s.cables[b] = t;
      if (!big16CrosspatchBad(s)) return;
      const u = s.cables[a]; s.cables[a] = s.cables[b]; s.cables[b] = u; // undo, retry
    }
  } },
  // Mic in the wrong input: a mic is plugged into another input on the SAME
  // sub-snake, so it comes up on that input's channel. The sub-snake slot shows
  // the wrong instrument. Fix at the STAGE: drag the mic back to its listed
  // input (that swaps both mics' inputs and channels back).
  { key: 'mic-wrong-input-16', label: 'Mic in the wrong input', blurb: 'A mic is plugged into the wrong sub-snake input, so it comes up on the wrong channel.', par: 3, big16only: true, apply: (s, rng) => {
    const keys = window.BAND_KEYS || [];
    const SRC = window.SOURCES || {};
    const bySnake = {};
    for (const k of keys) { const sn = (SRC[k] || {}).snake; if (!sn) continue; (bySnake[sn] = bySnake[sn] || []).push(k); }
    const snakes = Object.keys(bySnake).filter((sn) => bySnake[sn].length >= 2);
    if (!snakes.length) return;
    ensureMicIn16(s);
    for (let tries = 0; tries < 24; tries++) {
      const grp = bySnake[snakes[Math.floor(rng() * snakes.length)]];
      const i = Math.floor(rng() * grp.length);
      let j = Math.floor(rng() * (grp.length - 1)); if (j >= i) j += 1;
      const a = grp[i], b = grp[j];
      const ma = s.micIn[a], mb = s.micIn[b]; s.micIn[a] = mb; s.micIn[b] = ma;
      const ca = s.cables[a], cb = s.cables[b]; s.cables[a] = cb; s.cables[b] = ca;
      if (!big16CrosspatchBad(s)) return;
      s.micIn[a] = ma; s.micIn[b] = mb; s.cables[a] = ca; s.cables[b] = cb; // undo, retry
    }
  } },
  // Crossed at the CONSOLE fan-out: two snake tails land on each other's channel
  // at FOH (the fan-out map, not the stage box). Both sources stay audible but on
  // swapped channels; the console INPUT chip shows the port/CH mismatch and the
  // fan-out tails cross on the MIXER view. Fix at the CONSOLE (drag a fan-out
  // tail back), not the stage box — that's the distinct skill from the stage-box
  // crosspatch. Par 3: patching a live channel pops, so master down first.
  { key: 'crosspatch-fanout-16', label: 'Crossed at the console fan-out', blurb: 'Two snake tails are landing on each other\'s channel at the console fan-out.', par: 3, big16only: true, apply: (s, rng) => {
    if (!s.fanOut || !s.fanOut.length) return;
    const n = s.fanOut.length;
    for (let tries = 0; tries < 24; tries++) {
      const i = Math.floor(rng() * n);
      let j = Math.floor(rng() * (n - 1)); if (j >= i) j += 1;
      const t = s.fanOut[i]; s.fanOut[i] = s.fanOut[j]; s.fanOut[j] = t;
      if (!big16CrosspatchBad(s)) return;
      const u = s.fanOut[i]; s.fanOut[i] = s.fanOut[j]; s.fanOut[j] = u; // undo, retry
    }
  } },
];

// Win conditions: every band source audible in the PA (heard in the room).
// Uses the combined 'pa' check (the louder side), NOT both pa_l and pa_r, so
// pan is a free creative choice, not a fault. Centering is only "correct" when
// zeroing the console, not during an active mix. Matches how the lessons score.
const PRACTICE_CONDITIONS = [];
for (const src of BAND_SOURCES) {
  PRACTICE_CONDITIONS.push({ source: src, dest: 'pa', min: 0.2 });
}

// PRACTICE GOALS — the dynamic part. A practice rep isn't always "something is
// broken, restore the full mix". Sometimes the call is a positive task: build a
// monitor mix, fix the gain structure, check the speakers. Each goal sets up its
// own start state and returns a `winSpec` — the win conditions plus the prompt
// text — which the app merges over the base Practice scenario, so the same
// engine that wins the lessons wins these. `apply(s, r)` mutates the band-up
// start state and returns the winSpec. The custom-scenario author (a later
// feature) writes a winSpec the same way.
//
// These read like the real job: a real engineer spends as much time building
// monitor mixes and setting gain as chasing faults, so weaving them in makes
// Practice train the whole role, not just diagnosis.
window.PRACTICE_GOALS = [
  {
    key: 'monitor-mix', label: 'Build a monitor mix', par: 2,
    apply: (s) => {
      // Band up and playing in the PA. Both wedges are on and turned up, but
      // nobody is in the monitors yet — every send starts closed. Build it.
      s.outputs.wedge = { ...s.outputs.wedge, on: true, mute: false, volume: 0.7 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: true, mute: false, volume: 0.7 };
      for (let i = 0; i < 4; i++) { s.channels[i].aux1 = 0; s.channels[i].aux2 = 0; }
      return {
        conditions: [
          { source: 'vocal2', dest: 'wedge2', min: 0.35 },
          { source: 'vocal2', dest: 'wedge',  min: 0.30 },
        ],
        symptom: 'Build a monitor mix. Send Vocal 2 to its own wedge (Wedge 2) and into Vocal 1\'s wedge (Wedge 1). Both sends are closed right now.',
        title: 'Monitor Mix Request',
        hint: "It's all aux sends on the Vocal 2 channel. AUX 2 feeds Wedge 2 (their own monitor); AUX 1 feeds Wedge 1 (Vocal 1's monitor). Bring both up until each wedge has them.",
        solution: 'AUX 2 and AUX 1 up on the Vocal 2 channel, so Vocal 2 is in both wedges.',
      };
    },
  },
  {
    key: 'gain-stage', label: 'Fix the gain structure', par: 2,
    apply: (s) => {
      // The bass came in weak: its gain got cracked down to half of where a
      // passive bass needs to sit, and the fader was ridden up to compensate.
      // The fix is at the top of the chain: bring the GAIN up until the bass
      // sits healthy on its meter. gainOnly = the win tests the input gain ONLY,
      // never the fader position. The fader is a mix choice — near unity by habit
      // but legitimately above or below — so requiring it at unity would teach a
      // false rule (Kyle 2026-07-06). Where the student leaves the fader is theirs.
      s.channels[2].gain = window.HEALTHY_GAIN_BY_CH[2] * 0.5; s.channels[2].fader = 0.9;
      return {
        conditions: [{ source: 'guitar', dest: 'pa', min: 0.3 }],
        gainStructure: { refChannel: 3, inputBand: [0.645, 4.566], gainOnly: true },
        symptom: 'The bass gain is set too low and the fader is pushed up to compensate. Set the level at the top of the chain: bring the GAIN up until the bass sits healthy on its meter. The fader from there is a mix call.',
        title: 'Fix the Gain Structure',
        hint: 'PFL the bass (channel 3) and bring its GAIN up until the input meter sits in the healthy zone. That is the fix. The fader is yours to set the balance after.',
        solution: "Bass gain set healthy in PFL, so the level is set at the top of the chain, not by riding the fader. Where the fader sits from there is a mix choice.",
      };
    },
  },
  {
    key: 'speaker-check', label: 'Check the speakers', par: 3,
    apply: (s) => {
      // Quiet stage before the band: use the playback to prove every speaker is
      // passing signal, the PA and both wedges, one at a time. This checks the
      // OUTPUTS — it is NOT a line check (a line check verifies the inputs).
      for (let i = 0; i < 4; i++) { s.channels[i].mute = true; }
      s.channels[6].mute = false; s.channels[6].gain = window.HEALTHY_GAIN_BY_CH[6]; s.channels[6].fader = 0.75; s.channels[6].aux1 = 0; s.channels[6].aux2 = 0;
      s.outputs.wedge = { ...s.outputs.wedge, on: true, mute: false, volume: 0.6 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: true, mute: false, volume: 0.6 };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false, volume: 0 };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false, volume: 0 };
      return {
        conditions: [],
        verifyEach: [
          { source: 'playback', dest: 'pa',     min: 0.30, label: 'PA passes signal' },
          { source: 'playback', dest: 'wedge',  min: 0.25, label: 'Wedge 1 passes signal' },
          { source: 'playback', dest: 'wedge2', min: 0.25, label: 'Wedge 2 passes signal' },
        ],
        symptom: 'Confirm every speaker is passing signal: the mains and both wedges. Send the playback to each one. They check off as they play.',
        title: 'Check the Speakers',
        hint: 'Send the playback to the PA on its fader, then open AUX 1 and AUX 2, one per wedge. Each speaker checks off once it plays, so you can move on.',
        solution: 'Playback sent to the PA and both wedges, so every speaker is proven to pass signal.',
      };
    },
  },
];

// MONITOR RING-OUT — the signature live-sound task, framed the way it really
// happens: a singer wants more in her wedge, you push her monitor up, and at a
// strong level it starts to ring. The fix is the Feedback Awareness skill: find
// the glowing band on that wedge's Monitor EQ and cut it a touch, keeping her
// level up. It opens QUIET (send low, well under the ring point) so the rep never
// starts howling; the ring only appears once the student raises the send
// (Kyle 2026-07-08). Board-aware: MX-8 uses vocal 1 or 2 into its wedge; the
// 16-channel board picks any live mic into any wedge. Rolled on its own chance in
// PRACTICE.sabotage so it stays frequent on both boards and never stacks.
//
// Calibration (verified live against the engine, staging v72): the wedge's
// tallest resonance rings once the singer's contribution to it crosses ~0.68
// (FEED_0DB / 1.22), which a vocal reaches at an aux send of ~0.60. Start send
// 0.18 sits far below that (contribution ~0.09, dead silent). Win min 0.69 is
// just ABOVE the ring onset, so the ONLY way to satisfy it is to push through the
// ring and cut it out: pulling the send back down to kill the ring drops below
// 0.69 and fails, and at the lightest valid push a surgical one-band cut leaves
// the level at ~0.70, still over the line. Push harder and a second band joins
// (~0.79) — the real "back it off and cut" lesson, never an opening wall.
// Restricted to VOCAL mics: a kick or tom can't reach 0.69 into a wedge, and a
// singer's wedge is the real feedback-and-monitor scenario.
window.MONITOR_RING = {
  key: 'monitor-ring', label: 'Ring out the monitor', par: 2,
  apply: (s, rng) => {
    const r = rng || (() => 0.5);
    let ci, auxKey, wedgeKey, wedgeLabel;
    if (s.big16) {
      // Vocal mics only: a drum/tom mic can't reach the required level into a
      // wedge, and the ring-out-a-wedge lesson is a singer's monitor.
      const vocs = pbMics(s).filter((i) => /^(vx\d|vocal)/.test(window.sourceFor(s, i) || ''));
      ci = pbPick(vocs.length ? vocs : pbMics(s), r);
      if (ci < 0) ci = 0;
    } else {
      // MX-8: Vocal 1 (ch0) or Vocal 2 (ch1).
      ci = r() < 0.5 ? 0 : 1;
    }
    const src = window.sourceFor(s, ci);
    // A singer only ever asks for more in THEIR OWN wedge — nobody asks for more
    // of themselves in another performer's monitor. Pair the picked vocalist with
    // their own wedge: vocal N -> aux N -> wedge N (perf 0..3 = wedge 1..4; the
    // MX-8 vocals map 1:1 too). This is the mono-monitor convention the whole
    // stage is built on (vocal 1 hears wedge 1, ... vocal 4 hears wedge 4).
    const perf = window.SOURCES[src] && window.SOURCES[src].perf != null ? window.SOURCES[src].perf : ci;
    const wn = Math.min(4, Math.max(1, perf + 1));
    auxKey = 'aux' + wn;
    wedgeKey = wn === 1 ? 'wedge' : 'wedge' + wn;
    wedgeLabel = 'Wedge ' + wn;
    const chLabel = (s.channels[ci] && s.channels[ci].label) || 'the vocal';
    // Latent: the singer has a little monitor, well under the ring point. The
    // wedge is live so raising the send climbs straight toward feedback.
    s.channels[ci][auxKey] = 0.18;
    if (s.outputs[wedgeKey]) { s.outputs[wedgeKey].on = true; s.outputs[wedgeKey].mute = false; s.outputs[wedgeKey].volume = 0.78; }
    return {
      conditions: [{ source: src, dest: wedgeKey, min: 0.69 }],
      symptom: 'The singer on ' + chLabel + ' wants more of themselves in their monitor, ' + wedgeLabel + '. Bring that send up to a strong level. As you push it, the wedge starts to ring. Find the glowing band on ' + wedgeLabel + '\'s Monitor EQ, cut it a touch to stop the ring, and leave the level up.',
      title: 'Give the Monitor More',
      hint: 'Raise the ' + auxKey.toUpperCase() + ' send on ' + chLabel + ' toward a strong level. When it rings, open ' + wedgeLabel + '\'s Monitor EQ, find the glowing band, and pull it down a few dB, just enough to stop the ring. Keep the level up, do not pull the send back down.',
      solution: 'The monitor on ' + chLabel + ' brought up to a strong level with the ring cut out on the wedge EQ. Pulling the send back down would lose the singer the monitor; ringing out the one glowing band keeps the level and kills the feedback.',
    };
  },
};

window.PRACTICE = {
  id: 'practice',
  title: 'Practice Mode',
  symptom: 'Something is wrong with the sound. Find what is broken and fix it, without popping the speakers.',
  hint: 'Walk the signal path and watch where the meters stop: source, cable, gain, mute, fader, master, speaker. Check the quick things first, and close the path before you touch a cable or +48V (mute the channel, or pull the master down). If a wedge rings, cut the glowing band on its monitor EQ.',
  conditions: PRACTICE_CONDITIONS,
  involves: [1, 2, 3, 4],
  // Every practice rep also requires the patch to match the input list —
  // that's how the crosspatch faults get caught even when the swapped
  // channels happen to stay audible.
  requirePatch: true,
  sabotage: (s, rng) => {
    // 16-channel Practice: rebuild the rep on the big board (bandState sets
    // big16), then band it up and fault it exactly like the MX-8.
    if (window.PRACTICE_16 && window.bandState) s = window.bandState();
    bandUp(s);
    const r = rng || (() => 0);
    // Board-aware win: require every ACTIVE input source audible in the PA.
    // Captured from the healthy board BEFORE faults, so an unplugged cable still
    // counts. On the 16-channel board this REPLACES the static 4-source list via
    // winSpec; null on the MX-8 leaves its existing conditions untouched.
    const boardWinSpec = s.big16 ? { conditions: pbSources(s).map((src) => ({ source: src, dest: 'pa', min: 0.2 })) } : null;
    // ONBOARDING ONE-SHOT. The welcome screen's "quick fix" sets
    // window.PRACTICE_FORCE to a fault key (or array of keys) so a brand-new
    // signup's very first rep is always a single, legible, winnable fault, never
    // a zero-fault call or a goal task. Cleared after this one draw, so every rep
    // after it is a normal random draw. Inert (skipped) when unset.
    const forced = window.PRACTICE_FORCE;
    if (forced) {
      window.PRACTICE_FORCE = null;
      const fkeys = Array.isArray(forced) ? forced : [forced];
      let fpar = 0; const ffaults = []; const fcond = [];
      for (const k of fkeys) {
        const f = window.PRACTICE_FAULTS.find((x) => x.key === k);
        if (!f) continue;
        const res = f.apply(s, r);
        if (res && res.conditions) fcond.push(...res.conditions);
        fpar += f.par; ffaults.push(f.key);
      }
      if (ffaults.length) {
        window.PRACTICE_LAST = { par: fpar, faults: ffaults, extraConditions: fcond, winSpec: boardWinSpec };
        return s;
      }
    }
    // MONITOR RING-OUT gets its OWN roll, before the generic goal roll and on
    // BOTH boards, so the signature feedback lesson stays frequent. It opens
    // quiet and only rings when the student pushes the wedge up, so the rep never
    // starts howling (Kyle 2026-07-08). Its winSpec carries the single ring win
    // condition + prompt, replacing the generic board win for this focused task.
    const RING_CHANCE = (typeof window.PRACTICE_RING_CHANCE === 'number') ? window.PRACTICE_RING_CHANCE : 0.16;
    if (!window.PRACTICE_FREE && window.MONITOR_RING && r() < RING_CHANCE) {
      const winSpec = window.MONITOR_RING.apply(s, r);
      window.PRACTICE_LAST = { par: window.MONITOR_RING.par, faults: [], goalKey: window.MONITOR_RING.key, goalLabel: window.MONITOR_RING.label, winSpec: winSpec, extraConditions: [] };
      return s;
    }
    // Sometimes the call is a positive task, not a fault: build a monitor mix,
    // fix the gain, check the speakers. These ignore the FAULTS count (a task is
    // a task), carry their own win conditions + prompt text (winSpec), and make
    // Practice train the whole job instead of only diagnosis.
    const GOAL_TASK_CHANCE = (typeof window.PRACTICE_GOAL_CHANCE === 'number') ? window.PRACTICE_GOAL_CHANCE : 0.25;
    // The free-tier Practice taste leaves out the "check the speakers" verify
    // task — a free sample should read as "find what's broken," not a
    // nothing-is-wrong check. Members get the full goal pool.
    const goalPool = window.PRACTICE_FREE
      ? window.PRACTICE_GOALS.filter((g) => g.key !== 'speaker-check')
      : window.PRACTICE_GOALS;
    if (!s.big16 && goalPool && goalPool.length && r() < GOAL_TASK_CHANCE) {
      const g = goalPool[Math.floor(r() * goalPool.length)];
      const winSpec = g.apply(s, r);
      window.PRACTICE_LAST = { par: g.par, faults: [], goalKey: g.key, goalLabel: g.label, winSpec: winSpec, extraConditions: [] };
      return s;
    }
    // The 16-channel board carries one extra fault at every difficulty (capped
    // at 4): more inputs to scan AND more to find, so graduating from 8 to 16 is
    // a real step up in challenge, not just a wider desk.
    const baseN = window.PRACTICE_FAULT_COUNT || 1;
    const n = s.big16 ? Math.max(2, Math.min(4, baseN + 1)) : Math.max(1, Math.min(3, baseN));
    // Distinct fault TYPES per rep (weighted entries appear more often, but
    // never twice). Two faults can still land on the same channel — that
    // just makes the diagnosis honest work.
    let pool = [];
    for (const f of window.PRACTICE_FAULTS) {
      // Digital-only faults (mute group, DCA) live on the digital surface, where
      // the controls to fix them exist. The app sets window.PRACTICE_SURFACE; on
      // analog (or before it's set), these are skipped so a player is never
      // handed a fault they have no way to reach.
      if (f.digital && window.PRACTICE_SURFACE !== 'digital') continue;
      // The MX-8 crosspatch faults use the 4-input model, so skip on the band;
      // the band has its own crosspatch/wrong-input faults (big16only), which in
      // turn only make sense on the 16-ch board with its stage patch UI.
      if (f.big8only && s.big16) continue;
      if (f.big16only && !s.big16) continue;
      // Free tier never gets patch / crosspatch faults: patching is the members'
      // Run the Show course, so a free Practice rep must always be solvable
      // without touching the stage patch. The app sets window.PRACTICE_FREE.
      if (window.PRACTICE_FREE && /crosspatch|wrong-input|soft-patch/.test(f.key)) continue;
      // "Practice what needs it" biases the draw toward the fault types the
      // member is rusty on (window.PRACTICE_FOCUS, set by the app from the
      // freshness ledger). Unset = an even draw across the pool.
      let w = f.weight || 1;
      if (Array.isArray(window.PRACTICE_FOCUS) && window.PRACTICE_FOCUS.indexOf(f.key) !== -1) w += 4;
      for (let i = 0; i < w; i++) pool.push(f);
    }
    let par = 0;
    const faults = [];
    const extraConditions = [];
    for (let i = 0; i < n && pool.length > 0; i++) {
      const f = pool[Math.floor(r() * pool.length)];
      pool = pool.filter(x => x.key !== f.key);
      const res = f.apply(s, r);
      if (res && res.conditions) extraConditions.push(...res.conditions);
      par += f.par;
      faults.push(f.key);
    }
    window.PRACTICE_LAST = { par, faults, extraConditions, winSpec: boardWinSpec };
    return s;
  },
  // Never shown (the debrief replaces the answer key); kept for the contract.
  solution: 'Walk the signal path and fix what is broken.',
  defaultInspect: 'pa',
};

// FEEDBACK MODE — the ring-out trainer (Kyle, 2026-06-11 PM; realism pass
// 2026-06-12 from ring-out research). Practice Mode trains diagnosis; this
// trains the monitor engineer's core physical skill: pushing a wedge toward
// a target level while killing feedback frequency by frequency. The wedge
// carries the FULL ISO third-octave graphic EQ (63 Hz to 16 kHz, 25 bands)
// and a per-rep random feedback profile. The rhythm the mode teaches is the
// real one: up, ring, back off a touch, cut a few dB, up again.
//
// What the research pinned down (Carvin Audio, Rane Note 158, Sweetwater,
// Yamaha, QSC ring-out guides), and how the profile encodes it:
//   - Feedback starts at the single highest peak in the loop response, and
//     the first few peaks stand well above the rest. So: a ladder of 3-4
//     genuinely hot bands (the hottest rings earliest), placed in the real
//     wedge trouble zones (low-mid hoot, midrange ring, presence whistle).
//   - Real cuts are a few dB, not slammed sliders ("notches on the order of
//     a couple of dB, not tens of dB" — Rane). The ladder is tuned so 2-7 dB
//     per band is enough at the target level.
//   - Pros STOP after those few cuts: past the top peaks the response is a
//     crowd of near-ties, and more EQ just wrecks tone for no added gain.
//     So: every other band is a tame floor that only rings when the send is
//     pushed far past the target (the real "everything rings at once" wall),
//     and the toneGate fails the rep if the cuts go far beyond what the
//     rings needed. Win = target level + no rings + tone intact.
window.FEEDBACK_MODE = {
  id: 'feedback-mode',
  title: 'Ear Training',
  par: 12,
  conditions: [
    // Target 1.0 under the real-dB engine: reaching it forces the send about
    // 1.6 dB past the third resonance's ring point, so a rep always rides
    // through the hot ladder (3 rings, sometimes the borderline 4th right at
    // the target) — the full real ring-out arc, never a one-cut shortcut.
    { source: 'vocal', dest: 'wedge', min: 1.0 },
  ],
  // The wedge must keep >= 92% of its response: a real ring-out's three or
  // four small cuts pass easily, slammed sliders or shotgun cutting fail.
  toneGate: 0.92,
  involves: [1],
  symptom: 'Push Vocal 1 up in Wedge 1 to the target level. When a frequency rings, cut it on the wedge EQ, then keep climbing. Small cuts, not big ones.',
  hint: 'Raise the send a little at a time. When a frequency rings, find it on the monitor EQ and pull that band down a few dB, just past where the ring stops. Expect three or four on the way up, and keep every cut small. Once the vocal hits the target, stop.',
  sabotage: (s, rng) => {
    const r = rng || (() => 0.5);
    // The singer's vocal live at its clean input-gain sweet spot (the vocal's
    // per-source healthy gain: baseline ~0.81, +4 dBu, no distortion on the
    // Golden stem peaks), her wedge on, the send low. The ring-out is driven by
    // the aux send, not the preamp, so a clean input gain leaves the lesson
    // intact.
    s.channels[0].mute = false;
    s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0];
    s.channels[0].fader = 0.72;
    s.channels[0].aux1 = 0.15;
    s.master.mute = false;
    s.master.fader = 0.75;
    // Ring-out happens before doors: PA off, all focus on the wedge.
    s.outputs.pa_l = { ...s.outputs.pa_l, on: false };
    s.outputs.pa_r = { ...s.outputs.pa_r, on: false };
    s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0 };
    // 25-band ISO third-octave profile. Floor bands are tame: they only ring
    // when the wedge is pushed far past the target, which is the real wall a
    // ring-out stops short of. The spectrum extremes are tamer still (a
    // wedge rolls off down low, and the air bands rarely ring first).
    const N = 25;
    const profile = [];
    for (let b = 0; b < N; b++) {
      const edge = (b <= 3 || b >= 23) ? 0.8 : 1.0;
      profile.push((0.30 + r() * 0.22) * edge);
    }
    // The hot ladder: 3 or 4 real resonances, one per trouble zone so the
    // ear learns the zones (hoot 200-500, ring 630-2k, whistle 2.5k-8k).
    // Which zone gets the hottest peak shuffles per rep. The hotness values
    // stagger the onsets: the hottest rings early on the way up, the next
    // partway, the third near the target, the optional fourth right at it.
    const zones = [
      [5, 6, 7, 8, 9],          // 200, 250, 315, 400, 500 Hz — the hoot
      [10, 11, 12, 13, 14, 15], // 630 Hz .. 2 kHz — the midrange ring
      [16, 17, 18, 19, 20, 21], // 2.5 kHz .. 8 kHz — the whistle
    ];
    for (let i = zones.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = zones[i]; zones[i] = zones[j]; zones[j] = t;
    }
    const pick = (zone) => zone[Math.floor(r() * zone.length)];
    const hot = [
      { idx: pick(zones[0]), p: 1.30 + r() * 0.25 },
      { idx: pick(zones[1]), p: 1.02 + r() * 0.14 },
      { idx: pick(zones[2]), p: 0.86 + r() * 0.10 },
    ];
    if (r() < 0.5) {
      // A fourth, borderline resonance somewhere in the working range. It
      // rings right around the target, so some reps need a fourth small cut
      // and some sneak under it. Real rooms vary exactly like this.
      let idx = 4 + Math.floor(r() * 19);
      while (hot.some(h => h.idx === idx)) idx = 4 + Math.floor(r() * 19);
      hot.push({ idx, p: 0.76 + r() * 0.07 });
    }
    for (const h of hot) profile[h.idx] = h.p;
    s.outputs.wedge = { ...s.outputs.wedge, on: true, mute: false, volume: 0.8, eq: new Array(N).fill(0), fbProfile: profile };
    // Ring out against an open mic with no one singing, like a real soundcheck.
    // The vocal's sample is muted (no loop hammering the ear), but the mic stays
    // open so the wedge still rings as the send comes up.
    s.programMute = { ...s.programMute, vocal: true };
    return s;
  },
  // Never shown (the debrief replaces the answer key); kept for the contract.
  solution: 'The wedge at the target level, the few real resonances each cut a few dB.',
  defaultInspect: 'wedge',
};

// ── Scenario Library ────────────────────────────────────────────────────
// A curated, growing shelf of real-world situations. Each entry is the decoded
// form of an authored scenario: the start board the student sees, the win
// conditions (empty = restore the full mix), and the four text fields. index.html
// turns each into a playable, member-gated challenge in the LIBRARY band; any one
// can also be handed out as a free ?scenario= link. To add one: open ?author=1,
// set the board, write the text, hit "Copy library entry", and paste the object
// here. Keep the voice plain (no em dashes; "system" not "rig"; "speaker" not "box").
window.SCENARIO_LIBRARY = [
  {
    id: 'lead-vocal-silent',
    title: 'Lead vocal is missing',
    symptom: 'The lead vocal is not coming through the PA. Get it back into the mix.',
    hint: 'Everything upstream looks fine. Check the channel itself before you touch the gain.',
    solution: 'Channel 1 was muted, so the lead vocal never reached the mix. Unmuting it put it back in the PA. When one source is missing and the rest sound fine, check the channel mute first.',
    conditions: [],
    start: {"channels":[{"label":"Vocal 1","gain":0.48,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":true,"solo":false,"fader":0.72,"inputTrim":1,"id":1},{"label":"Vocal 2","gain":0.42,"phantom":true,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.72,"inputTrim":1,"id":2},{"label":"Bass","gain":0.77,"phantom":true,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.65,"inputTrim":1,"id":3},{"label":"Keys","gain":0.23,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.6,"inputTrim":1,"id":4},{"label":"5/6","gain":0.20,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.7,"inputTrim":1,"id":5,"stereo":true}],"mixer":{"on":true},"master":{"fader":0.75,"mute":false,"aux1":0.75,"aux2":0.75},"outputs":{"pa_l":{"on":true,"mute":false,"volume":0.7},"pa_r":{"on":true,"mute":false,"volume":0.7},"wedge":{"on":true,"mute":false,"volume":0,"eq":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ringBand":15},"wedge2":{"on":true,"mute":false,"volume":0,"eq":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ringBand":12},"amp":{"on":true}},"cables":{"vocal":1,"vocal2":2,"guitar":3,"laptop":4},"outFan":{"1":"mainL","2":"mainR","3":"aux1","4":"aux2"},"outPatch":{"pa_l":1,"pa_r":2,"wedge":3,"wedge2":4},"fanOut":[1,2,3,4],"sourceMute":{"vocal":false,"guitar":false,"laptop":false,"vocal2":false,"playback":false},"playbackMode":"music","testing":"vocal","inspect":"pa","topology":{"mixerLocation":"side-stage","paRig":"powered","wedgeLocation":"stage"}},
  },
  {
    id: 'pa-side-quiet',
    title: 'One side of the audience is quiet',
    symptom: 'The right side of the audience is getting a lot less than the left. Even out the two main speakers so the whole audience hears the same mix.',
    hint: 'This is a PA output level, not a channel. Check the two mains against each other.',
    solution: 'Main R was turned down well below Main L, so half the audience got a thin mix. Matching the two outputs evened out the coverage. Keep the main sides level so the whole audience hears the same thing.',
    conditions: [],
    start: {"channels":[{"label":"Vocal 1","gain":0.48,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.72,"inputTrim":1,"id":1},{"label":"Vocal 2","gain":0.42,"phantom":true,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.72,"inputTrim":1,"id":2},{"label":"Bass","gain":0.77,"phantom":true,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.65,"inputTrim":1,"id":3},{"label":"Keys","gain":0.23,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.6,"inputTrim":1,"id":4},{"label":"5/6","gain":0.20,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.7,"inputTrim":1,"id":5,"stereo":true}],"mixer":{"on":true},"master":{"fader":0.75,"mute":false,"aux1":0.75,"aux2":0.75},"outputs":{"pa_l":{"on":true,"mute":false,"volume":0.7},"pa_r":{"on":true,"mute":false,"volume":0.35},"wedge":{"on":true,"mute":false,"volume":0,"eq":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ringBand":15},"wedge2":{"on":true,"mute":false,"volume":0,"eq":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ringBand":12},"amp":{"on":true}},"cables":{"vocal":1,"vocal2":2,"guitar":3,"laptop":4},"outFan":{"1":"mainL","2":"mainR","3":"aux1","4":"aux2"},"outPatch":{"pa_l":1,"pa_r":2,"wedge":3,"wedge2":4},"fanOut":[1,2,3,4],"sourceMute":{"vocal":false,"guitar":false,"laptop":false,"vocal2":false,"playback":false},"playbackMode":"music","testing":"vocal","inspect":"pa","topology":{"mixerLocation":"side-stage","paRig":"powered","wedgeLocation":"stage"}},
  },
  {
    id: 'keys-buried',
    title: 'Keys are buried',
    symptom: 'You can barely hear the keys in the PA. Bring them back up so they sit with the rest of the band.',
    hint: 'Look at the channel fader for the keys, not the gain.',
    solution: 'The keys fader was almost all the way down, so almost nothing reached the mix. Bringing it up put them back. The fader sets the level going to the mix, the gain sets it at the input.',
    conditions: [],
    start: {"channels":[{"label":"Vocal 1","gain":0.48,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.72,"inputTrim":1,"id":1},{"label":"Vocal 2","gain":0.42,"phantom":true,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.72,"inputTrim":1,"id":2},{"label":"Bass","gain":0.77,"phantom":true,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.65,"inputTrim":1,"id":3},{"label":"Keys","gain":0.23,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.02,"inputTrim":1,"id":4},{"label":"5/6","gain":0.20,"phantom":false,"highpass":false,"pan":0.5,"aux1":0,"aux2":0,"mute":false,"solo":false,"fader":0.7,"inputTrim":1,"id":5,"stereo":true}],"mixer":{"on":true},"master":{"fader":0.75,"mute":false,"aux1":0.75,"aux2":0.75},"outputs":{"pa_l":{"on":true,"mute":false,"volume":0.7},"pa_r":{"on":true,"mute":false,"volume":0.7},"wedge":{"on":true,"mute":false,"volume":0,"eq":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ringBand":15},"wedge2":{"on":true,"mute":false,"volume":0,"eq":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"ringBand":12},"amp":{"on":true}},"cables":{"vocal":1,"vocal2":2,"guitar":3,"laptop":4},"outFan":{"1":"mainL","2":"mainR","3":"aux1","4":"aux2"},"outPatch":{"pa_l":1,"pa_r":2,"wedge":3,"wedge2":4},"fanOut":[1,2,3,4],"sourceMute":{"vocal":false,"guitar":false,"laptop":false,"vocal2":false,"playback":false},"playbackMode":"music","testing":"vocal","inspect":"pa","topology":{"mixerLocation":"side-stage","paRig":"powered","wedgeLocation":"stage"}},
  },
];

// ============================================================
// MONITOR WORLD - the members' course on building monitor mixes (STAGING).
// A monitor engineer builds a SEPARATE mix per performer on the aux sends:
// their own source loud, references underneath, a sensible level, rung out
// so it won't feed back. Source keys: vocal (Vocal Mic 1), guitar (Bass),
// laptop (Keyboard). Win targets are kept at ~0.35 (the proven ring-safe
// level used by the Run-the-show Monitor Mix lesson); "Ring it out" runs
// the wedge hot (0.7) so it must be EQ'd. These thresholds are first-pass
// and meant to be playtested.
// ============================================================
function mwBoard(s) {
  // A healthy, fully patched show: PA up, both wedges on and powered, every
  // aux send zeroed so the student builds each monitor mix from nothing. The
  // bass DI is active, so it needs phantom on to be live.
  s.master.fader = 0.75; s.master.mute = false;
  s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
  s.outputs.wedge.on  = true; s.outputs.wedge.volume  = 0.6; s.outputs.wedge.mute  = false;
  s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
  s.outputs.wedge3.on = false; s.outputs.wedge3.volume = 0;
  s.outputs.wedge4.on = false; s.outputs.wedge4.volume = 0;
  s.channels[1].phantom = true; // condenser (Vocal 2) needs phantom for the show
  s.channels[2].phantom = true; // bass is an active DI; power it for the show
  s.channels.forEach((c) => { c.aux1 = 0; c.aux2 = 0; c.aux3 = 0; c.aux4 = 0; });
  return s;
}
window.MONITOR_WORLD = [
  {
    id: 'mw1',
    title: 'The second mix',
    task: true,
    defs: ['wedge', 'monitor mix', 'aux send'],
    hint: 'Wedge 1 is already powered on and turned up, so nothing is wrong with it. The AUX 1 knob is on the Vocal 1 channel strip itself, grouped with the other AUX knobs, not on the wedge. Turning it up does not change what the audience hears.',
    hints: [
      { title: 'Vocal 1 in Wedge 1', target: 'ch1-aux', text: 'Turn up AUX 1 on the Vocal 1 input channel until you hear it in Wedge 1.', done: (ctx) => hintReaches(ctx, 'vocal', 'wedge', 0.3) },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
      { source: 'vocal', dest: 'wedge', min: 0.3 },
    ],
    sabotage: (s) => mwBoard(s),
    solution: 'AUX 1 on a channel feeds that channel to Wedge 1 without changing the main mix.',
    defaultInspect: 'wedge',
  },
  {
    id: 'mw2',
    title: 'A bit of everyone',
    task: true,
    defs: ['input channel'],
    hint: 'Each channel has its own AUX 1 knob, so select a channel first to reach it. Judge this by knob position: the AUX 1 knob on the Vocal 1 channel is already set, so keep the Vocal 2 one below it. Set the Keys AUX 1 knob much lower again.',
    hints: [
      { title: 'Add Vocal 2', target: 'ch2-aux', text: 'Turn up AUX 1 on the Vocal 2 input channel, keeping it quieter than Vocal 1.', done: (ctx) => { var a = ctx && ctx.audio && ctx.audio.contributions; var c = a && a.vocal2; var l = c ? (c.wedge || 0) : 0; return l >= 0.22 && l <= 0.30; } },
      { title: 'Add a little keys', target: 'ch4-aux', text: 'Turn up AUX 1 on the Keys input channel, well below both vocals.', done: (ctx) => { var a = ctx && ctx.audio && ctx.audio.contributions; var c = a && a.laptop; var l = c ? (c.wedge || 0) : 0; return l >= 0.18 && l <= 0.26; } },
    ],
    involves: [1, 2, 3, 4],
    // "Under Vocal 1" is graded, not just described: Vocal 1 rests at ~0.33,
    // so the supporting sends carry ceilings that keep them genuinely under.
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.3 },
      { source: 'vocal2', dest: 'wedge', min: 0.22, max: 0.30 },
      { source: 'laptop', dest: 'wedge', min: 0.18, max: 0.26 },
    ],
    sabotage: (s) => { mwBoard(s); s.channels[0].aux1 = 0.6; return s; },
    solution: 'One wedge can carry several channels at once. A performer\'s own channel stays the loudest one in their wedge, and everything else stays quieter than it.',
    defaultInspect: 'wedge',
  },
  {
    id: 'mw3',
    title: 'Build Wedge 2',
    task: true,
    defs: [],
    hint: 'The AUX 2 control on each channel sets how much of that channel goes to Wedge 2. The channel fader sets the main mix the audience hears, which is a separate control.',
    hints: [
      { title: 'Vocal 2 loudest', target: 'ch2-aux', text: 'Raise AUX 2 on the Vocal 2 input channel to a strong level in Wedge 2.', done: (ctx) => hintReaches(ctx, 'vocal2', 'wedge2', 0.35) },
      { title: 'Add Vocal 1', target: 'ch1-aux', text: 'Raise AUX 2 on the Vocal 1 input channel, lower than Vocal 2.', done: (ctx) => { var a = ctx && ctx.audio && ctx.audio.contributions; var c = a && a.vocal; var l = c ? (c.wedge2 || 0) : 0; return l >= 0.22 && l <= 0.30; } },
      { title: 'A little keys', target: 'ch4-aux', text: 'Raise AUX 2 on the Keys input channel, lower than either vocal.', done: (ctx) => { var a = ctx && ctx.audio && ctx.audio.contributions; var c = a && a.laptop; var l = c ? (c.wedge2 || 0) : 0; return l >= 0.18 && l <= 0.26; } },
    ],
    involves: [1, 2, 3, 4],
    // Same graded hierarchy as mw2: Vocal 2 leads at 0.35+, the support stays under.
    conditions: [
      { source: 'vocal2', dest: 'pa', min: 0.3 },
      { source: 'vocal2', dest: 'wedge2', min: 0.35 },
      { source: 'vocal', dest: 'wedge2', min: 0.22, max: 0.30 },
      { source: 'laptop', dest: 'wedge2', min: 0.18, max: 0.26 },
    ],
    sabotage: (s) => mwBoard(s),
    solution: 'Each wedge gets its own aux send, so Wedge 2 is built on AUX 2 exactly the way Wedge 1 was built on AUX 1.',
    defaultInspect: 'wedge2',
  },
  {
    id: 'mw4',
    title: 'Both vocal monitors',
    task: true,
    defs: [],
    hint: 'The aux number matches the wedge number: AUX 1 feeds Wedge 1, AUX 2 feeds Wedge 2. Turn each send up until that singer can hear themselves over the band, then stop. Turning the wrong AUX knob puts a singer in the other person\'s wedge.',
    hints: [
      { title: 'Vocal 1 in Wedge 1', target: 'ch1-aux', text: 'Turn up AUX 1 on the Vocal 1 input channel so that singer hears themselves in Wedge 1.', done: (ctx) => hintReaches(ctx, 'vocal', 'wedge', 0.3) },
      { title: 'Vocal 2 in Wedge 2', target: 'ch2-aux', text: 'Turn up AUX 2 on the Vocal 2 input channel so that singer hears themselves in Wedge 2.', done: (ctx) => hintReaches(ctx, 'vocal2', 'wedge2', 0.35) },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
      { source: 'vocal', dest: 'wedge', min: 0.3 },
      { source: 'vocal2', dest: 'pa', min: 0.3 },
      { source: 'vocal2', dest: 'wedge2', min: 0.35 },
    ],
    sabotage: (s) => mwBoard(s),
    solution: 'Different AUX knobs on the same channels build separate monitor mixes. Each singer is loudest in their own wedge.',
    defaultInspect: 'wedge',
  },
  {
    id: 'mwHpf',
    title: 'The Low Ring',
    task: true,
    requireHpfOn: [1],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.3 },
    ],
    toneGate: 0.85,
    defs: ['feedback', 'high-pass filter'],
    hint: 'Turning the aux send down stops the ring. It also takes the vocal out of the wedge, and the ring comes back as soon as you turn the send up again. Fix it on the channel instead of at the send.',
    hints: [
      { title: 'The high-pass filter', target: 'ch1-hpf', text: 'Wedge 1 is ringing low and boomy. Engage HPF on channel 1 to clear it, and leave the aux send where it is.', done: (ctx) => !!(ctx.state.channels[0] && ctx.state.channels[0].highpass && !ctx.feedback) },
    ],
    sabotage: (s) => {
      // This wedge's resonance sits at 100 Hz, exactly where an HPF works.
      // +8.9 dB (2.8x) puts the ring onset at ~0.30 contribution: the level
      // the win demands cannot be held without the HPF (pull the send down
      // and it rings again on the way back up). The board loads mid-ring at
      // ~0.35, inside the band where the HPF's -4.4 dB of low relief kills
      // even a sustained ring, and with the HPF in there is comfortable room
      // up to ~0.49 before it can ring again. Every other band sits at -6 dB
      // and can never ring here, so the ring is always the low one.
      mwBoard(s);
      const prof = new Array(25).fill(0.5); prof[2] = 2.8;
      s.outputs.wedge.fbProfile = prof;
      s.channels[0].aux1 = 0.62;
      s.channels[0].highpass = false;
      return s;
    },
    solution: 'When a wedge rings low and boomy, try HPF first. Leave it off on a bass guitar or kick drum channel, where those low frequencies are the instrument.',
    defaultInspect: 'wedge',
  },
  {
    id: 'mw5',
    title: 'Keep the stage quiet',
    task: true,
    defs: [],
    hint: 'Find the AUX 1 knob on the Vocal 1 channel. Turn it down a little at a time and listen after each move.',
    hints: [
      { title: 'Stop the ringing', target: 'ch1-aux', text: 'Turn AUX 1 down on the Vocal 1 input channel until the ringing stops, keeping the vocal audible in Wedge 1.', done: (ctx) => { var a = ctx && ctx.audio; var c = a && a.contributions && a.contributions.vocal; var l = c ? (c.wedge || 0) : 0; return l >= 0.22 && l <= 0.40; } },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.22, max: 0.40 },
    ],
    sabotage: (s) => { mwBoard(s); s.channels[0].aux1 = 0.9; return s; },
    solution: 'The ringing stopped once Vocal 1 was quiet enough in Wedge 1. A quieter stage also gives you a cleaner main mix.',
    defaultInspect: 'wedge',
  },
  {
    id: 'mwMoreMe',
    title: 'More me',
    task: true,
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.3, max: 0.4 },
      { source: 'vocal2', dest: 'wedge', min: 0, max: 0.12 },
      { source: 'guitar', dest: 'wedge', min: 0, max: 0.12 },
      { source: 'laptop', dest: 'wedge', min: 0, max: 0.12 },
    ],
    defs: [],
    hint: 'Leave channel 1 where it is. Turn the other three AUX 1 knobs most of the way down, not a small nudge.',
    hints: [
      { title: 'Make room in the wedge', target: ['ch2-aux', 'ch3-aux', 'ch4-aux'], text: 'Turn AUX 1 down on channels 2, 3, and 4 until they sit well below the vocal in Wedge 1.', done: (ctx) => { var a = ctx && ctx.audio && ctx.audio.contributions; if (!a) return false; var g = (a.guitar && a.guitar.wedge) || 0; var l = (a.laptop && a.laptop.wedge) || 0; var v2 = (a.vocal2 && a.vocal2.wedge) || 0; return g <= 0.12 && l <= 0.12 && v2 <= 0.12; } },
    ],
    sabotage: (s) => {
      // Her send starts strong (0.6 ~ a 0.33 contribution, already inside the
      // win corridor) so the ONLY work is subtraction: the band comes down.
      // The vocal corridor's max refuses the crank-her-up path outright.
      mwBoard(s);
      s.channels[0].aux1 = 0.6;
      s.channels[1].aux1 = 0.3;
      s.channels[2].aux1 = 0.4;
      s.channels[3].aux1 = 0.4;
      return s;
    },
    solution: 'When a wedge is already as loud as it can go, more of one thing means less of everything else.',
    defaultInspect: 'wedge',
  },
  {
    id: 'mw6',
    eqRingOut: true,
    title: 'Ring it out',
    task: true,
    defs: ['ring out', 'graphic EQ'],
    // The send stays UP (read off the raw knob, immune to the EQ cut): the fix
    // is the graphic-EQ cut, not pulling the singer down. Without this the win
    // read the POST-EQ wedge level, so the ring-out cut could drop it under the
    // line, and the lesson could be "passed" at a level too low to even ring.
    requireSend: [{ ch: 1, aux: 1, min: 0.6 }],
    // Guards against shotgun-cutting: eqGain.wedge must stay >= 0.8, so a real
    // ring-out (a few small cuts) passes but nuking the whole EQ does not.
    toneGate: 0.8,
    involves: [1, 2, 3, 4],
    conditions: [
      // Path-present floor only. The "loud enough to ring" requirement lives in
      // requireSend above, where the EQ cut can't defeat it.
      { source: 'vocal', dest: 'wedge', min: 0.25 },
    ],
    hint: 'Turning the aux send down stops the ring, but it also takes the singer out of the wedge. Leave the send where it is and cut the ring out in the Monitor EQ instead.',
    hints: [
      { title: 'Cut the ringing frequency', target: 'out-wedge1', text: 'Wedge 1 is ringing. Open its Monitor EQ and cut the glowing band by 3 to 6 dB until the ring stops.', done: (ctx) => !ctx.feedback && (((ctx.state.outputs.wedge || {}).eq) || []).some((v) => v < 0) },
    ],
    sabotage: (s) => {
      // One 2.5 kHz resonance (band 16), spiked so Wedge 1 loads ringing at the
      // level the singer needs. Only a graphic-EQ cut of THAT band clears it: an
      // HPF is far too low to touch it, and pulling the send down loses the
      // singer (requireSend forbids dropping below 0.6). One band spikes, so
      // exactly one band glows to find and cut. A -3.6 dB cut clears the ring
      // and barely moves eqGain (one band of 25), so the level holds.
      mwBoard(s);
      const prof = new Array(25).fill(0.5); prof[16] = 2.8;
      s.outputs.wedge.fbProfile = prof;
      s.outputs.wedge.volume = 0.6;
      s.channels[0].aux1 = 0.62;
      s.channels[0].highpass = false;
      return s;
    },
    solution: 'Cutting only the frequency that was ringing stopped the ring and left Wedge 1 as loud as the singer needs it.',
    defaultInspect: 'wedge',
  },
];

// ============================================================
// PATCHING (members' course) — Kyle 2026-07-11
// Breaks the one overwhelming "Patch the System" lesson into digestible
// pieces and adds fault-finding. The whole course is objective: a cable is in
// the right port or it isn't. Setup lessons grade with requirePatch (the
// identity check at staging.html); the disconnected-cable lesson grades with a
// signal condition (the source has to reach the PA again). All MX-8.
// Board note: every lesson runs on the MX-8 (loadLevel passes defaultState as
// the sabotage base). requirePatch asserts the identity map (vocal->1,
// vocal2->2, guitar->3, laptop->4, identity fan-out, home returns), so a setup
// lesson can disconnect PART of that map and leave the rest intact: the user
// restores their part and the whole map reads identity again and the win
// latches. First slice (read the list, patch the outputs, disconnected cable);
// cross-patch, snakes and sub-snakes, and a whole sub-snake down come next.
// ============================================================
window.PATCHING = [
  {
    id: 'pt0',
    title: 'Meet the Snake',
    task: true,
    requirePatch: true,
    // Nothing is broken in this lesson, so the win cannot rest on the patch
    // alone or the level would solve itself the moment it loads. It gates on
    // the PFL workflow instead: check channel 1, then disengage. The student
    // has to actually trace the channel.
    requirePflCheck: true,
    requireNoPfl: true,
    involves: [],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['snake', 'stage box', 'PFL'],
    hint: 'Channel 1 is the first channel strip on the console. Its PFL button and its input meter are both on that strip. If nothing moves, check that PFL is engaged on channel 1 and not on another channel.',
    hints: [
      { title: 'Read the show plan', target: 'iolist', text: 'Open the Input List in the top bar.', done: (ctx) => !!(ctx.ioListOpen || ctx.pflChecked) },
      { title: 'Check channel 1', target: ['src-vocal', 'conn-stage-in-1', 'conn-in-0', 'ch1-pfl'], flow: { source: 'vocal' }, text: 'Press PFL on channel 1 to hear what stage box port 1 is sending, and watch its input meter.', done: (ctx) => !!((ctx.pflChannels && ctx.pflChannels[1]) || (ctx.state.channels[0] && ctx.state.channels[0].solo)) },
      { title: 'Return to the main mix', target: 'ch1-pfl', text: 'Press PFL on channel 1 again to disengage it.', done: (ctx) => !!(ctx.pflChannels && ctx.pflChannels[1] && ctx.state.channels.every((c) => !c.solo)) },
    ],
    sabotage: (s) => {
      // The concept lesson, and the board is patched CORRECTLY end to end.
      // Tracing channel 1 has to PROVE the one-to-one rule, so nothing here
      // contradicts it. The crossed fan-out moved to the next lesson, which
      // tests the rule once it has been taught (Kyle, 2026-07-20).
      // Console ON so the input meters are alive for the follow-it-home step;
      // every speaker OFF and the master down, so nothing here can pop.
      s.mixer = { on: true };
      // involves: [] zeroes every strip (mute on, fader and gain at 0). Give
      // all four band channels their input GAIN back, so whichever channel the
      // student PFLs reads on the meter and the rule proves out across the
      // board, not just on channel 1.
      s.channels.forEach((c, i) => { if (i < 4) c.gain = (window.HEALTHY_GAIN_BY_CH && window.HEALTHY_GAIN_BY_CH[i]) || c.gain; });
      // Vocal 2 is a condenser and the bass is an active DI. Both need +48V to
      // read at all (normalize stripped it), so a student who PFLs 2 or 3 sees
      // the rule working there too instead of a second mystery.
      s.channels[1].phantom = true;
      s.channels[2].phantom = true;
      s.master = { ...s.master, mute: true, fader: 0 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false, volume: 0 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false, volume: 0 };
      s.outputs.wedge = { ...s.outputs.wedge, on: false, volume: 0 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0 };
      return s;
    },
    solution: 'You checked channel 1 against the Input List using PFL and the input meter. Use that same check on any channel to confirm a port is landing where the plan says.',
    defaultInspect: 'pa',
  },
  {
    id: 'pt0b',
    title: 'Crossed at the Console',
    task: true,
    requirePatch: true,
    involves: [],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['input channel', 'cross-patch'],
    hint: 'Open the Input List and read what it says for channels 3 and 4. Compare that with what is plugged in above each of those channels. Tail 3 is the one sitting on channel 4 right now.',
    hints: [
      { title: 'Read the connection points', target: 'iolist', text: 'Look at the connection points above channels 3 and 4 and find which input is landing on the wrong channel.', done: (ctx) => { const f = ctx.state.fanOut || []; return !!(ctx.ioListOpen || (f[2] === 3 && f[3] === 4)); } },
      { title: 'Repatch inputs 3 and 4', target: ['conn-in-2', 'conn-in-3'], flow: { source: 'guitar' }, text: 'Drag tail 3 off channel 4 and onto the connection point marked CH 3.', done: (ctx) => { const f = ctx.state.fanOut || []; return f[0] === 1 && f[1] === 2 && f[2] === 3 && f[3] === 4; } },
    ],
    sabotage: (s) => {
      // The test for the concept pt0 just taught. Everything at the stage is
      // patched right; the snake's fan-out at the console has tails 3 and 4
      // crossed. Console ON so the connection points and meters read; every
      // speaker OFF and the master down, so no repatch here can pop anything
      // (the pop discipline is taught later, in Fader Up, No Signal).
      s.fanOut = [1, 2, 4, 3];
      s.mixer = { on: true };
      // Channels 1-2 keep their gains so the student can PFL a channel that is
      // patched correctly and compare. Channels 3-4 stay at zero gain: the
      // crossed tails put the hot keys line on the bass channel, and the bass
      // channel's healthy gain would drive it into the red, a distraction this
      // lesson does not need.
      s.channels.forEach((c, i) => { if (i < 2) c.gain = (window.HEALTHY_GAIN_BY_CH && window.HEALTHY_GAIN_BY_CH[i]) || c.gain; });
      s.channels[1].phantom = true;
      s.master = { ...s.master, mute: true, fader: 0 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false, volume: 0 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false, volume: 0 };
      s.outputs.wedge = { ...s.outputs.wedge, on: false, volume: 0 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0 };
      return s;
    },
    solution: 'The bass was coming up on the channel set aside for the keys. No GAIN or fader adjustment would have fixed that, only moving the tails back.',
    defaultInspect: 'pa',
  },
  {
    id: 'pt1',
    title: 'Read the Input List',
    task: true,
    requirePatch: true,
    involves: [],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['patch', 'snake input'],
    hint: 'The ports on the stage box are color coded: 1 brown, 2 red, 3 orange, 4 yellow. If you drop a cable on a port that already has a cable in it, the two swap.',
    hints: [
      { title: 'Start with the plan', target: 'iolist', text: 'Open the Input List in the top bar to see which port each source plugs into.', done: (ctx) => !!(ctx.ioListOpen || (ctx.state.cables && ctx.state.cables.vocal === 1)) },
      { title: 'Patch Vocal 1', target: ['iolist-ch1', 'src-vocal', 'conn-stage-in-1'], text: 'Drag Vocal 1\'s cable to port 1, or click PATCH on that row.', done: (ctx) => !!(ctx.state.cables && ctx.state.cables.vocal === 1) },
      { title: 'Patch the rest of the list', target: ['src-vocal2', 'src-guitar', 'src-laptop', 'conn-stage-in-2', 'conn-stage-in-3', 'conn-stage-in-4'], text: 'Patch Vocal 2, Bass, and Keys to the ports the list calls for.', done: (ctx) => !!(ctx.state.cables && ctx.state.cables.vocal2 === 2 && ctx.state.cables.guitar === 3 && ctx.state.cables.laptop === 4) },
    ],
    sabotage: (s) => {
      // Only the inputs are loose. The snake fan-out, the returns, and the
      // speakers stay connected, so requirePatch reads identity again the moment
      // the four input cables land on their ports. Rig off while patching: you
      // connect a dead system, so nothing pops (patching live is taught later).
      s.cables = { vocal: 0, vocal2: 0, guitar: 0, laptop: 0 };
      s.mixer = { on: false };
      s.master = { ...s.master, mute: true, fader: 0 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false, volume: 0 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false, volume: 0 };
      s.outputs.wedge = { ...s.outputs.wedge, on: false, volume: 0 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0 };
      return s;
    },
    solution: 'All four sources are on the ports the list called for. Every port number came from reading the Input List first.',
    defaultInspect: 'pa',
  },
  {
    id: 'pt2',
    title: 'Patch the Outputs',
    task: true,
    requirePatch: true,
    involves: [],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['snake output', 'wedge'],
    hint: 'The Input List has the answers, so open it and read the output rows. Each row names a console output, the out port its speaker plugs into, and the snake output that carries the mix. Match by number at both ends: same number on the stage box, same number at the console.',
    hints: [
      { title: 'Read the output plan', target: 'iolist', text: 'Open the Input List in the top bar and read the output plan.', done: (ctx) => !!(ctx.ioListOpen || (ctx.patchStatus && ctx.patchStatus[3] && ctx.patchStatus[3].pass)) },
      { title: 'Connect the speakers', target: ['out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2', 'conn-stage-out-1', 'conn-stage-out-2', 'conn-stage-out-3', 'conn-stage-out-4', 'iolist-out-mainL', 'iolist-out-mainR', 'iolist-out-aux1', 'iolist-out-aux2'], text: 'On the stage box, patch Main L to out 1, Main R to out 2, Wedge 1 to out 3, Wedge 2 to out 4.', done: (ctx) => ctx.patchStatus && ctx.patchStatus[3] && ctx.patchStatus[3].pass },
      { title: 'Match outputs to snake outputs', target: ['conn-out-MAIN L', 'conn-out-MAIN R', 'conn-out-AUX 1', 'conn-out-AUX 2'], text: 'Match by number: Main L to snake output 1, Main R to snake output 2, AUX 1 to snake output 3, AUX 2 to snake output 4.', done: (ctx) => ctx.patchStatus && ctx.patchStatus[2] && ctx.patchStatus[2].pass },
    ],
    sabotage: (s) => {
      // Inputs stay patched; only the return side the MX-8 actually uses is loose:
      // Main L/R + the two wedges (outFan returns 1-4, outPatch pa_l/pa_r/wedge/
      // wedge2). Returns 5-6 (aux3/aux4) and wedges 3-4 stay on their default
      // connection, so requirePatch (which checks all six) still latches once the
      // four real outputs are patched, and the user is never asked to touch 5-6.
      // Rig off while patching, so connecting a speaker line cannot pop.
      s.outFan = { ...s.outFan, 1: null, 2: null, 3: null, 4: null };
      s.outPatch = { ...s.outPatch, pa_l: null, pa_r: null, wedge: null, wedge2: null };
      s.mixer = { on: false };
      s.master = { ...s.master, mute: true, fader: 0 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false, volume: 0 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false, volume: 0 };
      s.outputs.wedge = { ...s.outputs.wedge, on: false, volume: 0 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false, volume: 0 };
      return s;
    },
    solution: 'The mix now has a path from the console, through the snake, out to every speaker.',
    defaultInspect: 'pa',
  },
  {
    id: 'pt3',
    title: 'Fader Up, No Signal',
    task: true,
    requirePatch: true,
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
    ],
    defs: ['fader', 'mute'],
    hint: 'MUTE is on channel 1\'s strip on the console. Press it and wait until the channel is silent before you touch the cable. Press MUTE again once the cable is fully seated.',
    hints: [
      { title: 'Get signal to channel 1', target: ['src-vocal', 'conn-stage-in-1'], text: 'Plug the Vocal 1 cable back into stage box port 1.', done: (ctx) => !!(ctx.hasPopped || (ctx.state.cables && ctx.state.cables.vocal === 1)) },
      { title: 'Do it without the pop', target: 'ch1-mute', text: 'Mute channel 1, reconnect the cable, then unmute channel 1.', done: (ctx) => hintReaches(ctx, 'vocal', 'pa', 0.3) },
    ],
    sabotage: (s) => {
      // A healthy, fully patched show, then the lead vocal's cable pulled loose.
      // The lesson INVITES the mistake: step 1 says plug it back in, the pop
      // block fires (plug into a live channel), and the reset hands the board
      // back with the cable out again. Step 1 stays checked through the reset
      // via ctx.hasPopped (the popped latch survives Reset), so step 2 can
      // teach the safe order to someone who now knows why it exists. A player
      // who mutes first and never pops sails through both steps clean.
      mwBoard(s);
      s.cables.vocal = 0;
      return s;
    },
    solution: 'A channel can look fine at the console and still be silent because of one loose cable on stage. Checking the physical connection is the first move when a fader is up and nothing comes through.',
    defaultInspect: 'pa',
  },
  {
    id: 'pt4',
    title: 'The Wrong Voice on Channel 1',
    task: true,
    requirePatch: true,
    // The lesson's wrap-up step is "disengage PFL" — the win waits for it.
    requireNoPfl: true,
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
      { source: 'vocal2', dest: 'pa', min: 0.3 },
    ],
    defs: [],
    hint: 'Listen on PFL and compare what you hear with the Input List. The microphone on channel 1 is the one the Input List assigns to channel 2. Order matters here: mute first, move the cable second, unmute last.',
    hints: [
      { title: 'Identify the microphone', target: 'ch1-pfl', text: 'Press PFL on channel 1 and listen to find out which microphone is on it.', done: (ctx) => !!((ctx.pflChannels && ctx.pflChannels[1]) || (ctx.state.channels[0] && ctx.state.channels[0].solo) || (ctx.state.cables && ctx.state.cables.vocal === 1 && ctx.state.cables.vocal2 === 2)) },
      { title: 'Repatch without a pop', target: ['ch1-mute', 'ch2-mute', 'src-vocal', 'conn-stage-in-1', 'conn-stage-in-2'], text: 'Mute channels 1 and 2, then drag Vocal 1\'s cable from port 2 to port 1.', done: (ctx) => !!(ctx.state.cables && ctx.state.cables.vocal === 1 && ctx.state.cables.vocal2 === 2) },
      { title: 'Restore the main mix', target: ['ch1-pfl', 'ch1-mute', 'ch2-mute'], text: 'Disengage PFL on channel 1, then unmute channels 1 and 2.', done: (ctx) => !!(ctx.state.cables && ctx.state.cables.vocal === 1 && ctx.state.cables.vocal2 === 2 && hintReaches(ctx, 'vocal', 'pa', 0.3) && hintReaches(ctx, 'vocal2', 'pa', 0.3) && ctx.state.channels.every((c) => !c.solo)) },
    ],
    sabotage: (s) => {
      // A live soundcheck with the two VOCAL cables crossed at the stage box.
      // The two vocal channels run near-identical healthy gains, so nothing
      // distorts and nothing starves: the board sounds fine, and the only
      // tells are the wrong voice under each fader and the patch itself. That
      // keeps all the attention on the skill this lesson practices, the
      // patch. Swapping cables on live channels pops (patch_live), so the fix
      // is the safe repatch from the last lesson, scaled up to two channels:
      // mute both, swap, unmute.
      mwBoard(s);
      s.cables.vocal = 2;
      s.cables.vocal2 = 1;
      // +48V stays on across both vocal strips (the way last night's engineer
      // left them): Vocal 2 is a condenser, and without phantom on channel 1
      // the crossed mic would arrive silent instead of as the wrong voice.
      s.channels[0].phantom = true;
      return s;
    },
    solution: 'When the wrong source comes up on a channel, compare what you hear on PFL with the Input List. Mute both channels before moving a cable and the repatch is silent.',
    defaultInspect: 'pa',
  },
  {
    id: 'ptSwap',
    title: 'Check Every Output',
    task: true,
    requirePatch: true,
    involves: [],
    // The check ends with the test signal back out of the system: sends down
    // or the channel muted. The win cannot fire mid-test.
    conditions: [
      { source: 'playback', dest: 'pa', min: 0, max: 0.05 },
      { source: 'playback', dest: 'wedge', min: 0, max: 0.05 },
      { source: 'playback', dest: 'wedge2', min: 0, max: 0.05 },
    ],
    // Each output latches the moment the playback reaches it, so the win
    // requires every output to have actually played the test signal. The two
    // mains are one-sided checks (othersMax): Main L only counts while Main R
    // is silent, so a center-pan blast cannot tick both at once — and the
    // engine clears every latch when the output patch moves, so checks made
    // through the crossed lines do not survive the fix.
    verifyEach: [
      { source: 'playback', dest: 'pa_l', min: 0.2, othersMax: { pa_r: 0.05 }, label: 'Main L checked' },
      { source: 'playback', dest: 'pa_r', min: 0.2, othersMax: { pa_l: 0.05 }, label: 'Main R checked' },
      { source: 'playback', dest: 'wedge', min: 0.2, label: 'Wedge 1 checked' },
      { source: 'playback', dest: 'wedge2', min: 0.2, label: 'Wedge 2 checked' },
    ],
    // The check ends with every speaker back on: a board whose mains never
    // came back is not a verified board.
    requireOutputsOn: ['pa_l', 'pa_r', 'wedge', 'wedge2'],
    defs: ['mains', 'aux send'],
    hint: 'PLAYBACK is panned hard left, so only the left main speaker should play. If the right one plays instead, the two main speaker cables are swapped. Switch the speakers off before you move a cable, or you get a loud pop.',
    hints: [
      { title: 'Playback to the left main speaker', target: 'ch7-mute', text: 'Switch the MUTE button off on PLAYBACK and watch which main speaker plays.', done: (ctx) => !!((ctx.verifyStatus && (ctx.verifyStatus.pa_l || ctx.verifyStatus.pa_r)) || (ctx.patchStatus && ctx.patchStatus[3] && ctx.patchStatus[3].pass) || (ctx.state.outPatch && !(ctx.state.outPatch.pa_l === 2 && ctx.state.outPatch.pa_r === 1))) },
      { title: 'Repatch the outputs safely', target: ['out-pa-l', 'out-pa-r', 'conn-stage-out-1', 'conn-stage-out-2'], text: 'Switch both main speakers off, swap the two cables, then switch them back on.', done: (ctx) => !!(ctx.patchStatus && ctx.patchStatus[3] && ctx.patchStatus[3].pass && ctx.state.outputs.pa_l.on && ctx.state.outputs.pa_r.on) },
      { title: 'Prove left and right', target: 'ch7-pan', text: 'Set the playback hard left with the BAL knob, listen, then hard right.', done: (ctx) => !!(ctx.patchStatus && ctx.patchStatus[3] && ctx.patchStatus[3].pass && ctx.verifyStatus && ctx.verifyStatus.pa_l && ctx.verifyStatus.pa_r) },
      { title: 'Check the wedges, one at a time', target: 'ch7-aux', text: 'Send playback to Wedge 1 with AUX 1, then Wedge 2 with AUX 2.', done: (ctx) => !!(ctx.verifyStatus && ctx.verifyStatus.wedge && ctx.verifyStatus.wedge2) },
      { title: 'Clear the test signal', target: 'ch7-strip', text: 'Pull the AUX sends down, center BAL, mute PLAYBACK, leave every speaker on.', done: (ctx) => { const v = ctx.verifyStatus; if (!(v && v.pa_l && v.pa_r && v.wedge && v.wedge2)) return false; const o = ctx.state.outputs; if (!(o.pa_l.on && o.pa_r.on && o.wedge.on && o.wedge2.on)) return false; const a = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.playback; if (!a) return false; return Math.max(a.pa_l || 0, a.pa_r || 0, a.wedge || 0, a.wedge2 || 0) <= 0.05; } },
    ],
    sabotage: (s) => {
      // The pre-show output check, the way it actually happens: the band's
      // channels stay muted and the playback device is the test signal. The
      // two PA lines are crossed at the stage box; the left-pan test exposes
      // it (both PA meters read the same on a left-right swap, so only a
      // one-side test can catch it). verifyEach latches each output as the
      // playback reaches it, and the max conditions demand the test signal is
      // zeroed again before the win, so the whole check has to happen.
      mwBoard(s);
      s.channels[0].mute = true;
      s.channels[1].mute = true;
      s.channels[2].mute = true;
      s.channels[3].mute = true;
      const pb = s.channels[6];
      if (pb) {
        // Pan starts HARD LEFT so the very first unmute IS the one-side test:
        // at center pan both mains carry the signal and the crossed lines
        // would be invisible (and both verify latches would tick at once).
        pb.mute = true; pb.fader = 0.72; pb.pan = 0; pb.aux1 = 0; pb.aux2 = 0;
        // The playback line arrives pre-gained (this lesson checks outputs,
        // not gain staging): hard-panned it reaches ~0.46, comfortably over
        // the 0.2 verify latches.
        pb.gain = (window.HEALTHY_GAIN_BY_CH && window.HEALTHY_GAIN_BY_CH[6]) || 0.2;
      }
      s.outPatch = { ...s.outPatch, pa_l: 2, pa_r: 1 };
      return s;
    },
    solution: 'Nothing on the console shows a left-right swap, so the only way to catch one is to test every output, one at a time, before the show.',
    defaultInspect: 'pa',
  },
  {
    id: 'pt5',
    title: 'Loose at the Sub-Snake',
    task: true,
    requirePatch: true,
    involves: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    conditions: [],
    defs: ['sub-snake'],
    hint: 'Follow the cable from each drum microphone into the drum sub-snake, then follow the sub-snake to the stage box. The Input List gives every microphone a channel number, and it puts the kick drum microphone on channel 1. That is the line that came loose.',
    hints: [
      { title: 'Check the channel plan', target: 'iolist', text: 'Open the Input List to check each microphone\'s channel.', done: (ctx) => !!(ctx.ioListOpen || (ctx.state.cables && ctx.state.cables.kick === 1)) },
      { title: 'Reconnect the drum mic', target: ['src-kick', 'conn-stage-in-1'], text: 'Reconnect the loose drum line, or click PATCH for that line.', done: (ctx) => !!(ctx.state.cables && ctx.state.cables.kick === 1) },
    ],
    sabotage: (s) => {
      // The full 16-channel band. Rig off (line check before the show), and the
      // kick drum's tail is loose at the drum sub-snake, so channel 1 is dead.
      // requirePatch (big16PatchOk) latches when the kick is back on channel 1.
      const b = bandState();
      b.cables.kick = 0;
      b.mixer = { on: false };
      b.master = { ...b.master, mute: true, fader: 0 };
      ['pa_l', 'pa_r', 'wedge', 'wedge2', 'wedge3', 'wedge4'].forEach((k) => { if (b.outputs[k]) b.outputs[k] = { ...b.outputs[k], on: false, volume: 0 }; });
      return b;
    },
    solution: 'The kick drum line was loose where the drum sub-snake plugs into the stage box. Check both ends of a sub-snake, the microphone end and the stage box end.',
    defaultInspect: 'pa',
  },
];

// ── POWER course (staging prototype) ─────────────────────────────────────
// Power Up / Power Down as its own mini-course: the order discipline first
// (up, then down), a recovery lesson for finding a system half-powered in the
// wrong order, then two dead-system fault hunts (MX-8, then the 16-channel
// board). Wins ride requirePowerOn / requirePowerOff, which are board-aware.
// Step checks read ctx.powerStatus, the same board-aware map the objective
// checklist renders from, so the steps and the win can never disagree.
// The whole course is one principle: switching a console or a speaker on or off
// makes an electrical pop, so the order matters. Lesson 1 lets the student CAUSE
// the pop (popIsTheGoal — the warning modal delivers the why). Lessons 2 and 3
// are the correct power-up and power-down sequences. That is the entire idea;
// there is nothing to drill past it, so the course ends there. No 16-channel
// board, no phantom power — this course is only about power order (Kyle,
// 2026-07-21: "here's what can go wrong when powering things on or off, and
// here's the correct power-on sequence and the correct power-off sequence").
window.POWER = [
  {
    id: 'pwPop',
    title: 'Hear the Pop',
    task: true,
    // popIsTheGoal INVERTS the pop rule: causing the pop IS the objective, not a
    // failure. The moment the console comes on with a speaker live, the warning
    // modal explains exactly what happened and the correct order, and the lesson
    // is complete. This is the only lesson in the app where popping is the win.
    popIsTheGoal: true,
    involves: [1, 2, 3, 4],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['mains'],
    hint: 'The main speakers are already on. A console makes an electrical pop the instant it powers up, and a live speaker plays that pop at full level. Turn the console on and hear it for yourself. The next lesson is the order that prevents it.',
    hints: [
      { title: 'Turn the console on', target: 'mixer-power', text: 'Turn the console on with the main speakers already live, and listen for the pop.', done: (ctx) => !!ctx.hasPopped },
    ],
    sabotage: (s) => {
      // A system left mid-setup the wrong way: the main speakers are already on
      // and live, the console is off. Flipping the console on from here sends
      // its power-up pop straight through the mains. That pop, and the modal
      // that explains it, is the whole lesson.
      s.mixer = { on: false };
      s.master = { ...s.master, mute: false, fader: 0.6 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: true, mute: false, volume: 0.6 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: true, mute: false, volume: 0.6 };
      s.outputs.wedge = { ...s.outputs.wedge, on: false };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false };
      return s;
    },
    solution: 'A console pops when it powers up, and a live speaker plays that pop at full level. That is what the power-on order exists to prevent. The next two lessons are the correct way up and the correct way down.',
    defaultInspect: 'pa',
  },
  {
    id: 'pwUp',
    title: 'The Power-Up Sequence',
    task: true,
    requirePowerOn: true,
    involves: [1, 2, 3, 4],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['wedge', 'mains'],
    hint: 'Console first, speakers last. The console is on before anything can make sound, so its power-up pop has nothing to play through. Leave the MAIN fader down the whole time; setting levels is soundcheck, not power-up.',
    hints: [
      { title: 'Console first', target: 'mixer-power', text: 'Turn the console on first, before any speaker.', done: (ctx) => !!(ctx.powerStatus && ctx.powerStatus.console) },
      { title: 'Wedges next', target: ['out-wedge1', 'out-wedge2'], text: 'Turn on both wedges.', done: (ctx) => !!(ctx.powerStatus && ctx.powerStatus.wedges) },
      { title: 'Main speakers last', target: ['out-pa-l', 'out-pa-r'], text: 'Turn on both main speakers last.', done: (ctx) => !!(ctx.powerStatus && ctx.powerStatus.paStage) },
    ],
    sabotage: (s) => {
      // Load-in, fully patched, everything dark. The MAIN fader rests down; this
      // lesson ends with it still down. If the student turns a speaker on before
      // the console, the console's later power-up pop plays through it, and the
      // engine says so.
      s.mixer = { on: false };
      s.master = { ...s.master, mute: false, fader: 0 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: false };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: false };
      s.outputs.wedge = { ...s.outputs.wedge, on: false };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: false };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false };
      return s;
    },
    solution: 'Console first, speakers last. With the console already running, nothing switched on after it has a pop to send anywhere.',
    defaultInspect: 'pa',
  },
  {
    id: 'pwDown',
    title: 'The Power-Down Sequence',
    task: true,
    requirePowerOff: true,
    involves: [1, 2, 3, 4],
    conditions: [],
    topology: { paRig: 'powered' },
    defs: ['fader'],
    hint: 'The power-up order run backwards: master down, speakers off, console last. If you switch the console off while a speaker is still on, its power-down pop plays through that speaker.',
    hints: [
      { title: 'Master down first', target: 'master-fader', text: 'Pull the MAIN fader all the way down before you switch anything off.', done: (ctx) => !!(ctx.powerStatus && ctx.powerStatus.masterDown) },
      { title: 'Speakers off', target: ['out-pa-l', 'out-pa-r', 'out-wedge1', 'out-wedge2'], text: 'Switch off both main speakers and both wedges before the console.', done: (ctx) => !!(ctx.powerStatus && ctx.powerStatus.wedgesOff && ctx.powerStatus.paOff) },
      { title: 'Console off last', target: 'mixer-power', text: 'Switch the console off last.', done: (ctx) => !!(ctx.powerStatus && !ctx.powerStatus.console) },
    ],
    sabotage: (s) => {
      // End of the night: the system is up and running with the master at show
      // level, ready to be taken down. Master down first makes the last device
      // to switch off silent before its pop can reach anyone.
      s.mixer = { on: true };
      s.master = { ...s.master, mute: false, fader: 0.75 };
      s.outputs.pa_l = { ...s.outputs.pa_l, on: true, volume: 0.6 };
      s.outputs.pa_r = { ...s.outputs.pa_r, on: true, volume: 0.6 };
      s.outputs.wedge = { ...s.outputs.wedge, on: true, volume: 0.6 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: true, volume: 0.6 };
      s.outputs.wedge3 = { ...s.outputs.wedge3, on: false, volume: 0 };
      s.outputs.wedge4 = { ...s.outputs.wedge4, on: false, volume: 0 };
      return s;
    },
    solution: 'Master down, speakers off, console last. It is the power-up order run backwards, and for the same reason: nothing switches off with a live pop still able to reach a speaker.',
    defaultInspect: 'pa',
  },
];

// ── INPUT SETUP course (staging prototype) ───────────────────────────────
// Bringing an input up the right way, every time: PFL first, gain by the
// meter, know what needs power. Foundation first (the discipline, mics,
// DIs), then two fault hunts (a channel gained by ear, a condenser that
// lost its phantom mid-set). Wins ride the same gates Run the Show uses:
// requirePflCheck / requirePflEach, gainStructure -> ctx.gainStatus, and
// audibility conditions, so the steps and the win share predicates.
window.INPUT_SETUP = [
  {
    id: 'is1',
    title: 'Gain by the Meter',
    task: true,
    requirePflCheck: true,
    gainStructure: { refChannel: 1, unity: 0.75, faderTol: 0.06, inputBand: [0.645, 4.566] },
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
    ],
    topology: { paRig: 'powered' },
    defs: ['PFL', 'gain', 'unity'],
    hint: 'Everything you need is in the channel 1 strip: GAIN is the knob near the top, PFL and MUTE are buttons, and the fader is the slider at the bottom. PFL and MUTE both toggle, so a second press turns each one off. Watch the meter while you turn GAIN, and stop while the red lights at the very top are still off. Unity is the U printed next to the fader, not the top of the fader\'s travel.',
    hints: [
      { title: 'Check it in PFL', target: 'ch1-pfl', text: 'Press PFL on channel 1.', done: (ctx) => !!(ctx.pflChecked || (ctx.state.channels[0] && ctx.state.channels[0].solo)) },
      { title: 'Set the gain', target: 'ch1-gain', text: 'Turn GAIN until the input meter sits in the healthy zone.', done: (ctx) => !!(ctx.gainStatus && ctx.gainStatus.input) },
      { title: 'Open the channel', target: 'ch1-fader', text: 'Disengage PFL, unmute channel 1, and set the fader to unity.', done: (ctx) => !!(ctx.gainStatus && ctx.gainStatus.fader && hintReaches(ctx, 'vocal', 'pa', 0.3)) },
    ],
    sabotage: (s) => {
      // System up and healthy; only the lead vocal is down. Gain starts low so
      // the meter work is real, not a formality.
      s.channels[0].mute = true; s.channels[0].fader = 0; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0] * 0.4; s.channels[0].phantom = false;
      s.master.mute = false; s.master.fader = 0.75;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'You set the level with the meter, not by ear, and only then opened the channel at unity.',
    defaultInspect: 'pa',
  },
  {
    id: 'is2',
    title: 'Power What Needs It',
    task: true,
    requirePflEach: [1, 2],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
      { source: 'vocal2', dest: 'pa', min: 0.3 },
    ],
    topology: { paRig: 'powered' },
    defs: ['dynamic microphone', 'condenser microphone', 'phantom power'],
    hint: 'Switch +48V on while channel 2 is muted and its PFL is disengaged, so the thump reaches neither the speakers nor your headphones. Channel 1 needs no power at all. On either channel the order is the same: engage PFL, set the GAIN by the meter, switch MUTE off, move the fader to unity.',
    hints: [
      { title: 'The dynamic first', target: 'ch1-strip', text: 'On channel 1: engage PFL, set GAIN by the meter, MUTE off, fader to unity (U).', done: (ctx) => !!(hintReaches(ctx, 'vocal', 'pa', 0.3) && ctx.pflChannels && ctx.pflChannels[1]) },
      { title: 'Power the condenser', target: 'ch2-phantom', text: 'Make sure MUTE is engaged on channel 2, then switch on +48V.', done: (ctx) => !!(ctx.state.channels[1] && ctx.state.channels[1].phantom) },
      { title: 'Bring in channel 2', target: 'ch2-strip', text: 'On channel 2: engage PFL, set GAIN by the meter, MUTE off, fader to unity.', done: (ctx) => !!(hintReaches(ctx, 'vocal2', 'pa', 0.3) && ctx.pflChannels && ctx.pflChannels[2]) },
    ],
    sabotage: (s) => {
      // System up; both vocal channels down with half-healthy gain, phantom off
      // everywhere, so the condenser difference is discovered, not assumed.
      s.channels[0].mute = true; s.channels[0].fader = 0; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0] * 0.5; s.channels[0].phantom = false;
      s.channels[1].mute = true; s.channels[1].fader = 0; s.channels[1].gain = window.HEALTHY_GAIN_BY_CH[1] * 0.5; s.channels[1].phantom = false;
      s.master.mute = false; s.master.fader = 0.75;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'Dynamic microphones make their own signal, and condenser microphones need +48V from the console.',
    defaultInspect: 'pa',
  },
  {
    id: 'is3',
    title: 'The Direct Boxes',
    task: true,
    requirePflEach: [3, 4],
    conditions: [
      { source: 'guitar', dest: 'pa', min: 0.3 },
      { source: 'laptop', dest: 'pa', min: 0.3 },
    ],
    topology: { paRig: 'powered' },
    defs: ['DI box', 'active DI', 'passive DI'],
    hint: 'The source cards sit at the stage inputs, and each one names the instrument and its DI type. Only the active DI takes +48V. When you set GAIN, the meter should read about 0.',
    hints: [
      { title: 'Power the active DI', target: 'ch3-phantom', text: 'Use the source cards on stage to find which channel has the active DI, mute that channel, then switch on +48V.', done: (ctx) => !!(ctx.state.channels[2] && ctx.state.channels[2].phantom) },
      { title: 'Bring in the bass', target: 'ch3-strip', text: 'On channel 3, engage PFL, set GAIN by the meter, unmute, fader to unity.', done: (ctx) => !!(hintReaches(ctx, 'guitar', 'pa', 0.3) && ctx.pflChannels && ctx.pflChannels[3]) },
      { title: 'Bring in the keys', target: 'ch4-strip', text: 'On channel 4, engage PFL, set GAIN by the meter, unmute, fader to unity, leave +48V off.', done: (ctx) => !!(hintReaches(ctx, 'laptop', 'pa', 0.3) && ctx.pflChannels && ctx.pflChannels[4]) },
    ],
    sabotage: (s) => {
      // System up; both DI channels down, phantom off, half-healthy gain. The
      // vocals sit set-but-muted so the board reads like a build in progress.
      s.channels[0].mute = true; s.channels[0].fader = 0.72; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0]; s.channels[0].phantom = false;
      s.channels[1].mute = true; s.channels[1].fader = 0.72; s.channels[1].gain = window.HEALTHY_GAIN_BY_CH[1]; s.channels[1].phantom = true;
      s.channels[2].mute = true; s.channels[2].fader = 0; s.channels[2].gain = window.HEALTHY_GAIN_BY_CH[2] * 0.5; s.channels[2].phantom = false;
      s.channels[3].mute = true; s.channels[3].fader = 0; s.channels[3].gain = window.HEALTHY_GAIN_BY_CH[3] * 0.5; s.channels[3].phantom = false;
      s.master.mute = false; s.master.fader = 0.75;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'The active DI on the bass needed +48V, and the passive DI on the keys needed none.',
    defaultInspect: 'pa',
  },
  {
    id: 'is4',
    title: 'Weak Keys, Cranked Fader',
    task: true,
    requirePflCheck: true,
    gainStructure: { refChannel: 4, unity: 0.75, faderTol: 0.06, inputBand: [0.645, 4.566] },
    conditions: [
      { source: 'laptop', dest: 'pa', min: 0.3 },
    ],
    topology: { paRig: 'powered' },
    defs: ['gain structure', 'headroom'],
    hint: 'The GAIN knob at the top of channel 4 is nearly off, so the fader is doing all the work. Press PFL on channel 4, raise the GAIN until the input meter reads strong, then slide the fader back down to the U mark.',
    hints: [
      { title: 'Find the weak signal', target: 'ch4-strip', text: 'Press PFL on channel 4 and read the input meter.', done: (ctx) => !!(ctx.pflChecked || (ctx.state.channels[3] && ctx.state.channels[3].solo)) },
      { title: 'Set level at the input', target: 'ch4-gain', text: 'Turn GAIN up until the input meter reads strong, never touching the top.', done: (ctx) => !!(ctx.gainStatus && ctx.gainStatus.input) },
      { title: 'Reset the fader', target: 'ch4-fader', text: 'Slide the channel 4 fader down to the U mark.', done: (ctx) => !!(ctx.gainStatus && ctx.gainStatus.fader) },
    ],
    sabotage: (s) => {
      // The classic by-ear compensation: gain starved, fader slammed. The
      // channel is audible enough that nothing looks "broken" from the audience,
      // which is exactly why the meter is the tell.
      s.channels[3].mute = false; s.channels[3].fader = 1.0; s.channels[3].gain = 0.06; s.channels[3].phantom = false;
      s.master.mute = false; s.master.fader = 0.75;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'You were making the level with the fader instead of the GAIN. Set the GAIN by the input meter, not by the fader position.',
    defaultInspect: 'pa',
  },
  {
    id: 'is5',
    title: 'Vocal 2 Drops Out',
    task: true,
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
      { source: 'vocal2', dest: 'pa', min: 0.3 },
      { source: 'guitar', dest: 'pa', min: 0.3 },
      { source: 'laptop', dest: 'pa', min: 0.3 },
    ],
    topology: { paRig: 'powered' },
    defs: [],
    hint: 'The +48V and MUTE buttons are both in channel 2\'s set of controls. Press MUTE so the channel makes no sound, press +48V to send the microphone its power, then press MUTE again to bring the channel back.',
    hints: [
      { title: 'Check channel 2', target: null, text: 'Press MUTE on channel 2, switch +48V on, then unmute channel 2.', done: (ctx) => !!hintReaches(ctx, 'vocal2', 'pa', 0.3) },
    ],
    sabotage: (s) => {
      // The whole band live and healthy, except channel 2's phantom is off:
      // a condenser with no +48V reads nothing at all. The one-channel-dead,
      // meters-as-map hunt, with the pop discipline built into the fix.
      s.channels[0].mute = false; s.channels[0].fader = 0.72; s.channels[0].gain = window.HEALTHY_GAIN_BY_CH[0]; s.channels[0].phantom = false;
      s.channels[1].mute = false; s.channels[1].fader = 0.72; s.channels[1].gain = window.HEALTHY_GAIN_BY_CH[1]; s.channels[1].phantom = false;
      s.channels[2].mute = false; s.channels[2].fader = 0.72; s.channels[2].gain = window.HEALTHY_GAIN_BY_CH[2]; s.channels[2].phantom = true;
      s.channels[3].mute = false; s.channels[3].fader = 0.72; s.channels[3].gain = window.HEALTHY_GAIN_BY_CH[3]; s.channels[3].phantom = false;
      s.master.mute = false; s.master.fader = 0.75;
      s.outputs.pa_l.volume = 0.6; s.outputs.pa_r.volume = 0.6;
      s.outputs.wedge.on = true; s.outputs.wedge.volume = 0.6; s.outputs.wedge.mute = false;
      s.outputs.wedge2.on = true; s.outputs.wedge2.volume = 0.6; s.outputs.wedge2.mute = false;
      return s;
    },
    solution: 'Channel 2\'s +48V was off, and a condenser microphone makes no signal without it. Muting first kept the speakers from popping when the power came on.',
    defaultInspect: 'pa',
  },
];


/* ============================================================
   SYSTEM LEVEL (members) — how loud the system should be.
   Straight from Kyle's Soundcheck Checklist, section 1 "Gain
   Structure": connect a playback device, set the reference track
   level on the meters, put the MASTER at unity, then set the room
   level at the SPEAKER volume controls, not at the master fader.
   That order is the whole point of the course.
   MX-8 (Kyle 2026-07-20): fewer channels, so the lesson is about
   the speakers rather than the desk.
   ============================================================ */
window.SYSTEM_LEVEL = [
  {
    id: 'sy1', task: true,
    title: 'Play a Reference Track',
    involves: [7],
    defs: ['main mix', 'unity'],
    // Win = playback channel open at unity AND the master at unity. The
    // speakers stay low; setting the room level is the next lessons.
    gainStructure: { refChannel: 7, unity: 0.75, faderTol: 0.06 },
    conditions: [],
    hint: 'A reference track is music you know well. You set the system by it, so the level is honest before a single microphone is on.',
    hints: [
      { title: 'Open the playback channel', target: ['ch7-mute', 'ch7-fader'], text: 'Switch MUTE off on the playback channel and raise its fader to the U mark.', done: (ctx) => ctx.state.channels[6] && !ctx.state.channels[6].mute && Math.abs(ctx.state.channels[6].fader - 0.75) <= 0.06 },
      { title: 'Main fader to unity', target: ['master-section', 'master-fader'], text: 'Unmute MAIN and set the MAIN fader to the U mark.', done: (ctx) => !ctx.state.master.mute && Math.abs(ctx.state.master.fader - 0.75) <= 0.06 },
    ],
    sabotage: (s) => {
      s.mixer = { on: true };
      s.master = { ...s.master, mute: true, fader: 0 };
      s.channels[6].mute = true; s.channels[6].fader = 0;
      s.channels[6].gain = window.HEALTHY_GAIN_BY_CH[6];
      s.outputs.pa_l.volume = 0.12; s.outputs.pa_r.volume = 0.12;
      return s;
    },
    solution: 'The reference track is up and the console is at unity. Nothing has been set for the audience yet; that happens at the speakers.',
    defaultInspect: 'pa',
  },
  {
    id: 'sy2', task: true,
    title: 'Set the Track Level',
    involves: [7],
    defs: ['gain structure', 'meter'],
    requirePflCheck: true,
    gainStructure: { refChannel: 7, inputBand: [0.645, 4.566], gainOnly: true },
    conditions: [],
    hint: 'Set the level at the top of the chain. A track that arrives too quiet makes you push everything downstream; too hot and it distorts before it ever reaches a speaker.',
    hints: [
      { title: 'Listen in your headphones', target: 'ch7-pfl', text: 'Press PFL on the playback channel.', done: (ctx) => !!(ctx.pflChannels && ctx.pflChannels[7]) },
      { title: 'Set the gain', target: ['ch7-gain', 'ch7-inputmeter'], text: 'Turn GAIN up until the input meter peaks near the top of the green.', done: (ctx) => { var l = (ctx.audio && ctx.audio.chanInBaseline && ctx.audio.chanInBaseline[6]) || 0; return l >= 0.645 && l <= 4.566; } },
    ],
    sabotage: (s) => {
      s.mixer = { on: true };
      s.master = { ...s.master, mute: false, fader: 0.75 };
      s.channels[6].mute = false; s.channels[6].fader = 0.75; s.channels[6].gain = 0.05;
      s.outputs.pa_l.volume = 0.12; s.outputs.pa_r.volume = 0.12;
      return s;
    },
    solution: 'The track now hits the console at a healthy level, so everything after it starts from a known place.',
    defaultInspect: 'pa',
  },
  {
    id: 'sy3', task: true,
    title: 'Set the Main Speaker Level',
    involves: [7],
    defs: ['mains'],
    // The audience level is set HERE, at the speakers, with the master left
    // at unity. A condition with BOTH min and max renders a target band on
    // the loudness meter, which is what the student aims at.
    conditions: [
      { source: 'laptop', dest: 'pa', min: 0.30, max: 0.65 },
    ],
    hint: 'Leave the MAIN fader at unity. If you set the audience level with the master fader instead, you lose your reference and every show starts from a different place.',
    hints: [
      { title: 'Raise the main speakers', target: ['out-pa-l', 'out-pa-r'], text: 'Leave the MAIN fader at U. Raise the volume on both main speakers until the loudness meter sits inside the target band.', done: (ctx) => { var c = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.playback; if (!c) return false; var l = Math.max(c.pa_l || 0, c.pa_r || 0); return l >= 0.30 && l <= 0.65; } },
    ],
    sabotage: (s) => {
      s.mixer = { on: true };
      s.master = { ...s.master, mute: false, fader: 0.75 };
      s.channels[6].mute = false; s.channels[6].fader = 0.75;
      s.channels[6].gain = window.HEALTHY_GAIN_BY_CH[6];
      s.outputs.pa_l.volume = 0.05; s.outputs.pa_r.volume = 0.05;
      return s;
    },
    solution: 'The audience level is set at the speakers with the console at unity. Now the MAIN fader is a real reference: unity is show level.',
    defaultInspect: 'pa',
  },
  {
    id: 'sy4', task: true,
    title: 'Set the Wedge Levels',
    involves: [7],
    defs: ['wedge', 'aux send'],
    conditions: [],
    verifyEach: [{ dest: 'wedge' }, { dest: 'wedge2' }],
    hint: 'Set each wedge with the same reference track you used for the mains. Matching them now means a monitor mix built later behaves the same in both.',
    hints: [
      { title: 'Level Wedge 1', target: ['ch7-aux', 'out-wedge1'], text: 'Turn AUX 1 up on the playback channel, then raise the volume on Wedge 1 until you can hear the track on stage.', done: (ctx) => ctx.verifyStatus && ctx.verifyStatus.wedge },
      { title: 'Level Wedge 2', target: ['ch7-aux', 'out-wedge2'], text: 'Turn AUX 2 up on the playback channel, then raise the volume on Wedge 2 to match.', done: (ctx) => ctx.verifyStatus && ctx.verifyStatus.wedge2 },
    ],
    sabotage: (s) => {
      s.mixer = { on: true };
      s.master = { ...s.master, mute: false, fader: 0.75 };
      s.channels[6].mute = false; s.channels[6].fader = 0.75;
      s.channels[6].gain = window.HEALTHY_GAIN_BY_CH[6];
      s.channels[6].aux1 = 0; s.channels[6].aux2 = 0;
      s.outputs.pa_l.volume = 0.5; s.outputs.pa_r.volume = 0.5;
      s.outputs.wedge = { ...s.outputs.wedge, on: true, mute: false, volume: 0.05 };
      s.outputs.wedge2 = { ...s.outputs.wedge2, on: true, mute: false, volume: 0.05 };
      return s;
    },
    solution: 'Every speaker is now set against the same track, so the whole system starts the night from one reference.',
    defaultInspect: 'wedge',
  },
];


/* ============================================================
   16-CHANNEL MODE (members) — how to work the big board.

   Kyle 2026-07-20: "make a course for how to use the 16-channel
   mode, because it may not be immediately apparent that you need to
   switch between the mixer and the stage pages."

   The MX-16 shows ONE page at a time (the mixer or the stage), so a
   student who never finds the STAGE button never sees the three
   sub-snakes, the stage box, or a single cable. Every lesson here is
   a real task that CANNOT be finished from one page — the toggle is
   learned because the work requires it, not because a tour says so.
   ============================================================ */
window.BIG_BOARD = [
  {
    id: 'bg1', task: true, opensOn: 'mixer',
    title: 'Two Pages, One System',
    involves: [10],
    defs: ['sub-snake', 'input'],
    // The keys XLR is out of the backline sub-snake. From the mixer, channel
    // 10 looks perfect: gain healthy, fader up, not muted. The only way to
    // see why it is silent is to open the stage.
    conditions: [
      { source: 'keys', dest: 'pa', min: 0.25 },
    ],
    hint: 'The mixer shows you settings. The stage shows you cables. When a channel looks right and sounds like nothing, the answer is on the other page. Mute the channel before you touch its cable, or connecting it pops the speakers.',
    hints: [
      { title: 'Mute channel 10 first', target: 'ch10-mute', text: 'Switch MUTE on for channel 10.', done: (ctx) => !!(ctx.state.channels[9] && ctx.state.channels[9].mute) },
      { title: 'Open the stage', target: 'stage-toggle', text: 'Press STAGE in the top bar.', done: (ctx) => !!ctx.stageOpened },
      { title: 'Plug the keys back in', target: 'sub-snake-inst', text: 'Drag the loose XLR under the Keys card into input 4 on the backline sub-snake.', done: (ctx) => !!(ctx.state.micIn && ctx.state.micIn.keys) },
      { title: 'Back to the mixer', target: 'stage-toggle', text: 'Press MIXER, then switch MUTE off on channel 10.', done: (ctx) => !!ctx.stageOpened && !ctx.stageOpen && hintReaches(ctx, 'keys', 'pa', 0.25) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      b.micIn = { ...b.micIn, keys: 0 };
      return b;
    },
    solution: 'Channel 10 was set correctly the whole time. The signal never reached it, and the mixer page had no way to show you that.',
    defaultInspect: 'pa',
  },
  {
    id: 'bg2', task: true, opensOn: 'mixer',
    title: 'Find the Channel You Need',
    involves: [12],
    defs: ['input channel', 'mute'],
    conditions: [
      { source: 'vx2', dest: 'pa', min: 0.25 },
    ],
    hint: 'Sixteen strips look alike. The Input List is the paperwork that says which input is on which channel, so you read it instead of hunting.',
    hints: [
      { title: 'Find Vocal 2 on the Input List', target: ['iolist', 'iolist-ch12'], text: 'Press INPUT LIST and read down to the row for Vocal 2.', done: (ctx) => !!ctx.ioListOpen },
      { title: 'Bring channel 12 up', target: ['ch12-mute', 'ch12-fader'], text: 'Switch MUTE off on channel 12 and raise its fader until Vocal 2 is in the main mix.', done: (ctx) => hintReaches(ctx, 'vx2', 'pa', 0.25) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      b.channels[11].mute = true; b.channels[11].fader = 0;
      return b;
    },
    solution: 'Vocal 2 is back in the main mix. On a big board the Input List is faster than your memory, every time.',
    defaultInspect: 'pa',
  },
  {
    id: 'bg3', task: true, opensOn: 'mixer',
    title: 'Follow One Input All the Way',
    involves: [1],
    defs: ['stage box', 'snake', 'input channel'],
    conditions: [
      { source: 'kick', dest: 'pa', min: 0.25 },
    ],
    // The kick's sub-snake tail is off the stage box, so the path breaks in
    // the middle: mic in, channel set, nothing between them.
    hint: 'One input crosses four connection points on the way to the audience: mic into the sub-snake, sub-snake into the stage box, snake into the console, channel into the main mix. Work them in that order.',
    hints: [
      { title: 'Open the stage', target: 'stage-toggle', text: 'Press STAGE in the top bar.', done: (ctx) => !!ctx.stageOpened },
      { title: 'Patch the kick to the stage box', target: 'conn-stage-in-1', text: 'Drag the loose drum sub-snake tail into input 1 on the stage box.', done: (ctx) => (ctx.state.cables || {}).kick === 1 },
      { title: 'Bring the kick up', target: ['ch1-mute', 'ch1-fader'], text: 'Press MIXER, switch MUTE off on channel 1, and raise its fader.', done: (ctx) => hintReaches(ctx, 'kick', 'pa', 0.25) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      b.cables = { ...b.cables, kick: 0 };
      b.channels[0].mute = true; b.channels[0].fader = 0;
      return b;
    },
    solution: 'You walked one input from the mic to the audience and worked both pages to do it. Every fault you will ever chase lives somewhere on that path.',
    defaultInspect: 'pa',
  },
  {
    id: 'bg4', task: true, opensOn: 'mixer',
    title: 'Four Wedges, Four Musicians',
    involves: [10],
    defs: ['wedge', 'aux send', 'monitor mix'],
    // AUX 3 feeds Wedge 3, which belongs to the keys player. Getting the
    // keys player their own instrument is the whole task.
    conditions: [
      { source: 'keys', dest: 'wedge3', min: 0.25 },
    ],
    hint: 'The small board has two wedges. This one has four, and AUX 1 through AUX 4 feed them in order. Wedge 3 belongs to the keys player.',
    hints: [
      { title: 'Check who owns Wedge 3', target: 'iolist-out-aux3', text: 'Press INPUT LIST and read the output rows at the bottom.', done: (ctx) => !!ctx.ioListOpen },
      { title: 'Send the keys to Wedge 3', target: 'ch10-aux', text: 'Turn AUX 3 up on channel 10.', done: (ctx) => (ctx.state.channels[9] || {}).aux3 > 0.2 },
      { title: 'Listen to Wedge 3', target: 'listen-wedge3', text: 'Press WEDGE 3 in the listen bar and raise AUX 3 until the keys are clearly there.', done: (ctx) => hintReaches(ctx, 'keys', 'wedge3', 0.25) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      return b;
    },
    solution: 'The keys player has themself in their own wedge. Four wedges means four separate mixes, and each one is built the same way.',
    defaultInspect: 'wedge3',
  },
];


/* ============================================================
   SOUNDCHECK (members) — the 16-channel band, start to finish.

   Built from Kyle's own Soundcheck Checklist (Drive: Production /
   Lead Magnets / Soundcheck Checklist). Section by section:
     sc1  = §1 Line Check
     sc2, sc3 = §2 "Set Preamp Gain with PFL", by sub-snake group
     sc4  = §2 "Send Input Channel to Main Speakers"
     sc5, sc6 = §2 "Mixing Monitors from FOH"

   THE RAISE YOUR HAND METHOD, WITHOUT HANDS. The checklist's monitor
   section is built on it: "Raise your hand until you have enough of
   THIS channel in your monitor. When you have enough, put your hand
   down." The sim has no hands, so the method is carried by two things
   that ARE checkable:
     - STEP ORDER. Each performer's own signal goes into their own
       wedge first (sc5), and only then does anyone else's (sc6).
       "Always send the musician their own signal first."
     - A MAX on everybody else. sc6 wins only while each player's own
       signal stays ABOVE what got added around it, so "the most of
       their own sound" is the win condition, not a suggestion.
   The overheads rule from the checklist ("do not send drum overheads
   to the monitors") is a max of near-zero on ohl/ohr in every wedge.
   ============================================================ */
window.SOUNDCHECK = [
  {
    id: 'sc1', task: true, opensOn: 'mixer',
    title: 'Line Check the Band',
    involves: [1],
    defs: ['line check', 'PFL', 'cross-patch'],
    requirePatch: true,
    requireNoPfl: true,
    requirePflEach: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    // Both toms have to end up back in the main mix, so muting them for the
    // repatch and forgetting to unmute cannot pass.
    conditions: [
      { source: 'rack',  dest: 'pa', min: 0.2 },
      { source: 'floor', dest: 'pa', min: 0.2 },
    ],
    hint: 'Two mics on the drum sub-snake are in each other\'s inputs, so two channels carry the wrong drum. The sub-snake head prints where each input lands, and the Input List prints where it belongs. Mute a channel before you move its cable, or the reconnect pops the speakers.',
    hints: [
      { title: 'Check the drums', target: ['ch1-pfl', 'ch2-pfl', 'ch3-pfl', 'ch4-pfl', 'ch5-pfl', 'ch6-pfl'], text: 'Press PFL on channels 1 to 6, one at a time, and compare each one against the Input List.', done: (ctx) => [1, 2, 3, 4, 5, 6].every((c) => ctx.pflChannels && ctx.pflChannels[c]) },
      { title: 'Mute the two toms', target: ['ch3-mute', 'ch4-mute'], text: 'Switch MUTE on for channels 3 and 4.', done: (ctx) => [2, 3].every((i) => ctx.state.channels[i] && ctx.state.channels[i].mute) },
      { title: 'Fix the two that are wrong', target: 'sub-snake-up', text: 'Press STAGE and drag the rack tom mic and the floor tom mic back into their own inputs on the drum sub-snake.', done: (ctx) => !!(ctx.patchStatus && ctx.patchStatus.every && ctx.patchStatus.every((p) => p.pass)) },
      { title: 'Bring the toms back', target: ['ch3-mute', 'ch4-mute'], text: 'Press MIXER and switch MUTE off on channels 3 and 4.', done: (ctx) => !!(ctx.patchStatus && ctx.patchStatus.every && ctx.patchStatus.every((p) => p.pass)) && hintReaches(ctx, 'rack', 'pa', 0.2) && hintReaches(ctx, 'floor', 'pa', 0.2) },
      { title: 'Check the backline and vocals', target: ['ch7-pfl', 'ch8-pfl', 'ch9-pfl', 'ch10-pfl', 'ch11-pfl', 'ch12-pfl', 'ch13-pfl', 'ch14-pfl'], text: 'Press PFL on channels 7 to 14, one at a time.', done: (ctx) => [7, 8, 9, 10, 11, 12, 13, 14].every((c) => ctx.pflChannels && ctx.pflChannels[c]) },
      { title: 'Disengage every PFL', target: 'master-section', text: 'Disengage PFL on every channel so your headphones follow the main mix again.', done: (ctx) => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].every((c) => ctx.pflChannels && ctx.pflChannels[c]) && ctx.state.channels.every((c) => !c.solo) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      // The rack tom and floor tom mics are in each other's sub-snake inputs.
      // The mic follows its conductor, so both the input slot and the box
      // channel trade: channel 3 carries the floor tom and channel 4 the rack.
      b.micIn = { ...b.micIn, rack: 4, floor: 3 };
      b.cables = { ...b.cables, rack: 4, floor: 3 };
      return b;
    },
    solution: 'Every input reaches the console on the channel the Input List says it should. Nothing after this point can fix a patch you never checked.',
    defaultInspect: 'pa',
  },
  {
    id: 'sc2', task: true, opensOn: 'mixer',
    title: 'Set the Drum Gains',
    involves: [1],
    defs: ['gain', 'meter', 'headroom'],
    requirePflCheck: true,
    gainStructure: { inputBandAll: [0.645, 4.566], inputChannels: [1, 2, 3, 4, 5, 6], gainOnly: true },
    conditions: [],
    hint: 'Set the level at the top of the chain, in your headphones, one channel at a time. Aim for peaks near the top of the green with the red left alone.',
    hints: [
      { title: 'Kick', target: ['ch1-pfl', 'ch1-gain', 'ch1-inputmeter'], text: 'Press PFL on channel 1 and turn GAIN up until the input meter peaks near the top of the green.', done: (ctx) => { var l = (ctx.audio.chanInBaseline || [])[0] || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Snare', target: ['ch2-pfl', 'ch2-gain', 'ch2-inputmeter'], text: 'Do the same on channel 2.', done: (ctx) => { var l = (ctx.audio.chanInBaseline || [])[1] || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Toms', target: ['ch3-gain', 'ch4-gain'], text: 'Do the same on channels 3 and 4.', done: (ctx) => [2, 3].every((i) => { var l = (ctx.audio.chanInBaseline || [])[i] || 0; return l >= 0.645 && l <= 4.566; }) },
      { title: 'Overheads', target: ['ch5-phantom', 'ch5-gain', 'ch6-gain'], text: 'Switch +48V on for channels 5 and 6, then set their gains the same way.', done: (ctx) => [4, 5].every((i) => { var l = (ctx.audio.chanInBaseline || [])[i] || 0; return l >= 0.645 && l <= 4.566; }) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      [0, 1, 2, 3, 4, 5].forEach((i) => { b.channels[i].gain = 0.05; });
      b.channels[4].phantom = false; b.channels[5].phantom = false;
      return b;
    },
    solution: 'Six drum channels arrive at a healthy level. The overheads needed +48V before they could arrive at all.',
    defaultInspect: 'pa',
  },
  {
    id: 'sc3', task: true, opensOn: 'mixer',
    title: 'Set the Backline and Vocal Gains',
    involves: [7],
    defs: ['gain structure', 'phantom power', 'active DI'],
    requirePflCheck: true,
    gainStructure: { inputBandAll: [0.645, 4.566], inputChannels: [7, 8, 9, 10, 11, 12, 13, 14], gainOnly: true },
    conditions: [],
    hint: 'The bass is on an active DI, so it needs +48V before it passes anything. The acoustic guitar and the keys are on passive DIs and need none.',
    hints: [
      { title: 'Bass', target: ['ch7-phantom', 'ch7-pfl', 'ch7-gain'], text: 'Switch +48V on for channel 7, press PFL, and set GAIN by the input meter.', done: (ctx) => { var l = (ctx.audio.chanInBaseline || [])[6] || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Guitars', target: ['ch8-gain', 'ch9-gain'], text: 'Set GAIN on channels 8 and 9 the same way.', done: (ctx) => [7, 8].every((i) => { var l = (ctx.audio.chanInBaseline || [])[i] || 0; return l >= 0.645 && l <= 4.566; }) },
      { title: 'Keys', target: ['ch10-gain'], text: 'Set GAIN on channel 10.', done: (ctx) => { var l = (ctx.audio.chanInBaseline || [])[9] || 0; return l >= 0.645 && l <= 4.566; } },
      { title: 'Vocals', target: ['ch11-gain', 'ch12-gain', 'ch13-gain', 'ch14-gain'], text: 'Set GAIN on channels 11 to 14, one at a time.', done: (ctx) => [10, 11, 12, 13].every((i) => { var l = (ctx.audio.chanInBaseline || [])[i] || 0; return l >= 0.645 && l <= 4.566; }) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      [6, 7, 8, 9, 10, 11, 12, 13].forEach((i) => { b.channels[i].gain = 0.05; });
      b.channels[6].phantom = false;
      return b;
    },
    solution: 'All fourteen inputs are now set at the top of the chain. Everything from here is a mix decision, not a level repair.',
    defaultInspect: 'pa',
  },
  {
    id: 'sc4', task: true, opensOn: 'mixer',
    title: 'Build the Main Mix',
    involves: [11],
    defs: ['main mix', 'fader'],
    requireNoPfl: true,
    conditions: [
      { source: 'kick', dest: 'pa', min: 0.2 },
      { source: 'bass', dest: 'pa', min: 0.2 },
      { source: 'egtr', dest: 'pa', min: 0.2 },
      { source: 'keys', dest: 'pa', min: 0.2 },
      { source: 'vx1', dest: 'pa', min: 0.3 },
    ],
    hint: 'Bring the band up under the lead vocal, not over it. If you have to push the vocal to hear it, pull something else down instead.',
    hints: [
      { title: 'Disengage every PFL', target: 'master-section', text: 'Disengage PFL on every channel so you are listening to the main mix.', done: (ctx) => ctx.state.channels.every((c) => !c.solo) },
      { title: 'Open the lead vocal', target: ['ch11-mute', 'ch11-fader'], text: 'Switch MUTE off on channel 11 and raise its fader to show level.', done: (ctx) => hintReaches(ctx, 'vx1', 'pa', 0.3) },
      { title: 'Bring the band in', target: ['ch1-fader', 'ch7-fader', 'ch8-fader', 'ch10-fader'], text: 'Switch MUTE off on the rest of the channels and raise their faders until the whole band is in, with the lead vocal still on top of it.', done: (ctx) => ['kick', 'bass', 'egtr', 'keys'].every((k) => hintReaches(ctx, k, 'pa', 0.2)) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      b.channels.forEach((c, i) => { if (i < 14) { c.mute = true; c.fader = 0; } });
      return b;
    },
    solution: 'The band is in the main mix with the lead vocal on top of it. That balance is the one the audience came for.',
    defaultInspect: 'pa',
  },
  {
    id: 'sc5', task: true, opensOn: 'mixer',
    title: 'Start Every Wedge With Their Own Voice',
    involves: [11],
    defs: ['monitor mix', 'aux send', 'pre-fader'],
    // Each performer sings, so each wedge starts with that performer's own
    // vocal: AUX 1 -> Wedge 1 (lead), AUX 2 -> Wedge 2 (bass), AUX 3 ->
    // Wedge 3 (keys), AUX 4 -> Wedge 4 (drummer).
    conditions: [
      { source: 'vx1', dest: 'wedge',  min: 0.25 },
      { source: 'vx2', dest: 'wedge2', min: 0.25 },
      { source: 'vx3', dest: 'wedge3', min: 0.25 },
      { source: 'vx4', dest: 'wedge4', min: 0.25 },
    ],
    hint: 'A performer wants the most of their own sound. Give them that first, and most of the requests you would have got never come.',
    hints: [
      { title: 'The lead singer', target: ['ch11-aux', 'listen-wedge'], text: 'Turn AUX 1 up on channel 11 until Vocal 1 is clearly in Wedge 1.', done: (ctx) => hintReaches(ctx, 'vx1', 'wedge', 0.25) },
      { title: 'The bass player', target: ['ch12-aux', 'listen-wedge2'], text: 'Turn AUX 2 up on channel 12 until Vocal 2 is clearly in Wedge 2.', done: (ctx) => hintReaches(ctx, 'vx2', 'wedge2', 0.25) },
      { title: 'The keys player', target: ['ch13-aux', 'listen-wedge3'], text: 'Turn AUX 3 up on channel 13 until Vocal 3 is clearly in Wedge 3.', done: (ctx) => hintReaches(ctx, 'vx3', 'wedge3', 0.25) },
      { title: 'The drummer', target: ['ch14-aux', 'listen-wedge4'], text: 'Turn AUX 4 up on channel 14 until Vocal 4 is clearly in Wedge 4.', done: (ctx) => hintReaches(ctx, 'vx4', 'wedge4', 0.25) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      b.channels.forEach((c) => { c.aux1 = 0; c.aux2 = 0; c.aux3 = 0; c.aux4 = 0; });
      return b;
    },
    solution: 'Every performer hears themself. Each wedge is its own mix, fed from its own aux send, and none of them changed the main mix.',
    defaultInspect: 'wedge',
  },
  {
    id: 'sc6', task: true, opensOn: 'mixer',
    title: 'Add What Each Player Needs',
    involves: [7],
    defs: ['monitor mix', 'wedge'],
    // Own instrument next, and the checklist's overheads rule enforced as a
    // near-zero max: overheads carry the whole kit and the stage with it, so
    // they belong in the main mix and nowhere else.
    // Each own-instrument send has a MIN and a MAX. The min is "they can hear
    // it"; the max sits below where their own voice already sits (0.65 with the
    // vocal sends the lesson starts with), so pushing an instrument past the
    // performer's own voice fails the lesson. That is the Raise Your Hand rule
    // made checkable without hands: the most of their own sound, always.
    conditions: [
      { source: 'bass', dest: 'wedge2', min: 0.25, max: 0.55 },
      { source: 'keys', dest: 'wedge3', min: 0.25, max: 0.55 },
      { source: 'agtr', dest: 'wedge',  min: 0.2,  max: 0.55 },
      { source: 'vx1',  dest: 'wedge',  min: 0.5 },
      { source: 'vx2',  dest: 'wedge2', min: 0.5 },
      { source: 'vx3',  dest: 'wedge3', min: 0.5 },
      { source: 'ohl',  dest: 'wedge',  max: 0.05 },
      { source: 'ohr',  dest: 'wedge2', max: 0.05 },
      { source: 'ohl',  dest: 'wedge3', max: 0.05 },
      { source: 'ohr',  dest: 'wedge4', max: 0.05 },
    ],
    hint: 'Keep each player louder in their own wedge than anything you add around them. Push an instrument past their own voice and you have made their monitor worse. Overheads pick up the whole stage, so they stay out of the wedges.',
    hints: [
      { title: 'The bass player needs the bass', target: ['ch7-aux', 'listen-wedge2'], text: 'Turn AUX 2 up on channel 7 until the bass is in Wedge 2, under Vocal 2.', done: (ctx) => hintReaches(ctx, 'bass', 'wedge2', 0.25) && !hintReaches(ctx, 'bass', 'wedge2', 0.55) },
      { title: 'The keys player needs the keys', target: ['ch10-aux', 'listen-wedge3'], text: 'Turn AUX 3 up on channel 10 until the keys are in Wedge 3, under Vocal 3.', done: (ctx) => hintReaches(ctx, 'keys', 'wedge3', 0.25) && !hintReaches(ctx, 'keys', 'wedge3', 0.55) },
      { title: 'The lead singer needs the acoustic', target: ['ch9-aux', 'listen-wedge'], text: 'Turn AUX 1 up on channel 9 until the acoustic guitar is in Wedge 1, under Vocal 1.', done: (ctx) => hintReaches(ctx, 'agtr', 'wedge', 0.2) && !hintReaches(ctx, 'agtr', 'wedge', 0.55) },
      { title: 'Keep the overheads out', target: ['ch5-aux', 'ch6-aux'], text: 'Leave AUX 1 to AUX 4 at zero on channels 5 and 6.', done: (ctx) => [4, 5].every((i) => { var c = ctx.state.channels[i] || {}; return (c.aux1 || 0) < 0.05 && (c.aux2 || 0) < 0.05 && (c.aux3 || 0) < 0.05 && (c.aux4 || 0) < 0.05; }) },
    ],
    sabotage: (s) => {
      const b = bandUp16(window.bandState());
      b.channels.forEach((c) => { c.aux1 = 0; c.aux2 = 0; c.aux3 = 0; c.aux4 = 0; });
      // Each performer's own vocal is already in their own wedge — sc5 did
      // that, and this lesson carries on from there. 0.75 puts each voice at
      // ~0.65 in its own wedge, which is the ceiling the instrument sends
      // below have to stay under.
      b.channels[10].aux1 = 0.75;
      b.channels[11].aux2 = 0.75;
      b.channels[12].aux3 = 0.75;
      b.channels[13].aux4 = 0.75;
      return b;
    },
    solution: 'Four monitor mixes, each built the same way: their own voice first, their own instrument next, everyone else only if it is still needed. That is the whole method.',
    defaultInspect: 'wedge2',
  },
];


/* ============================================================
   THE GIG (members) — the capstone. Not a lesson: a challenge.
   Kyle 2026-07-20: "it just doesn't really tell the person what to
   do exactly. It's just more of a challenge. They go in, the system
   is completely disconnected and turned off. It's a 16-channel
   mixer, and they have to go through and get the system running."

   The four steps below are COARSE CHECKPOINTS, not instructions.
   They name the phase and nothing else, and they deliberately carry
   NO `target`, so no green spotlight appears. This is the one place
   in the app where an unanchored step is correct: a spotlight would
   tell the student where to look, which is the thing being tested.
   The hint stays behind the button for anyone who stalls.
   ============================================================ */
window.THE_GIG = [
  {
    id: 'gig1',
    title: 'The Gig',
    isChallenge: true,
    requirePatch: true,
    requirePowerOn: true,
    requireNoPfl: true,
    involves: [],
    defs: [],
    hint: 'Work in signal order and nothing surprises you: patch the stage, patch the outputs, power up console first and speakers last, set each input in PFL, then feed the wedges. The Input List in the top bar is the plan for every cable.',
    hints: [
      { title: 'Patch the system', target: null, text: 'Connect the stage, the snake and the speakers.', done: (ctx) => !!(ctx.patchStatus && ctx.patchStatus.every && ctx.patchStatus.every((p) => p.pass)) },
      { title: 'Power it up', target: null, text: 'Bring the system up in the right order.', done: (ctx) => !!(ctx.powerStatus && ctx.powerStatus.console && ctx.powerStatus.paStage && ctx.powerStatus.wedges) },
      { title: 'Get the band into the main mix', target: null, text: 'Every input set and audible to the audience.', done: (ctx) => (window.BAND_KEYS || []).every((k) => hintReaches(ctx, k, 'pa', 0.2)) },
      { title: 'Feed the monitors', target: null, text: 'Every wedge carrying a mix.', done: (ctx) => { var a = ctx.audio && ctx.audio.contributions; if (!a) return false; return ['wedge', 'wedge2', 'wedge3', 'wedge4'].every((w) => Object.keys(a).some((k) => (a[k] || {})[w] > 0.15)); } },
    ],
    // The BAND's inputs, not the MX-8's. This lesson runs on the 16-channel
    // board, where 'vocal' / 'guitar' / 'laptop' are catalog sources that are
    // never patched — their contribution is pinned at 0, so naming them here
    // made the capstone unwinnable (shipped in v207, caught in v209).
    // Written out rather than mapped off window.BAND_KEYS: this file loads
    // BEFORE the engine defines it, so the map would evaluate to an empty
    // list and the challenge would win on load.
    conditions: [
      { source: 'kick',  dest: 'pa', min: 0.2 },
      { source: 'snare', dest: 'pa', min: 0.2 },
      { source: 'rack',  dest: 'pa', min: 0.2 },
      { source: 'floor', dest: 'pa', min: 0.2 },
      { source: 'ohl',   dest: 'pa', min: 0.2 },
      { source: 'ohr',   dest: 'pa', min: 0.2 },
      { source: 'bass',  dest: 'pa', min: 0.2 },
      { source: 'egtr',  dest: 'pa', min: 0.2 },
      { source: 'agtr',  dest: 'pa', min: 0.2 },
      { source: 'keys',  dest: 'pa', min: 0.2 },
      { source: 'vx1',   dest: 'pa', min: 0.2 },
      { source: 'vx2',   dest: 'pa', min: 0.2 },
      { source: 'vx3',   dest: 'pa', min: 0.2 },
      { source: 'vx4',   dest: 'pa', min: 0.2 },
    ],
    sabotage: (s) => {
      // Load-in on the big system: the full 16-channel band, nothing
      // connected anywhere, nothing switched on. Same starting point as a
      // real load-in, and the same four patch stages Run the Show used to
      // walk through one at a time.
      const b = window.bandState();
      b.cables = {};
      b.micIn = {};
      // Every connection point is open, in signal order: the mic XLRs are out
      // of the sub-snakes (micIn 0), the sub-snake tails are off the stage box
      // (cables 0), the snake is off the console (fanOut 0), and the outputs
      // are unpatched at both ends. The Input List is the only plan there is.
      (window.BAND_KEYS || []).forEach((k) => { b.cables[k] = 0; b.micIn[k] = 0; });
      b.fanOut = (b.fanOut || []).map(() => 0);
      b.outFan = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
      b.outPatch = { pa_l: null, pa_r: null, wedge: null, wedge2: null, wedge3: null, wedge4: null };
      b.mixer = { on: false };
      b.master = { ...b.master, mute: true, fader: 0 };
      ['pa_l', 'pa_r', 'wedge', 'wedge2', 'wedge3', 'wedge4'].forEach((k) => {
        if (b.outputs[k]) b.outputs[k] = { ...b.outputs[k], on: false };
      });
      return b;
    },
    solution: 'You took a system from a pile of loose cables to a running show: patched, powered in order, every input set at the top of the chain, and the stage fed. That is the job.',
    defaultInspect: 'pa',
  },
];

// ============================================================
// MANAGING FEEDBACK (members' course) — Kyle 2026-07-22
// The causes and cures of the squeal, on the MX-8. STAGE 1: the fixes built on
// mechanics the engine already models — gain before feedback (graded on the
// on-wedge "+N dB to F/B" headroom readout via requireMargin), fewer open mics
// (requireMute), ring-out (requireSend + toneGate), and the low ring (HPF).
// STAGE 2 (later) inserts the mic-placement lessons (pattern, aim the null, mic
// vs the mains) between fb3 and fb4. Every lesson starts from mwBoard, a healthy
// fully-patched MX-8, and injects ONE feedback fault. Only the two vocal mics
// (Vocal 1 dynamic, Vocal 2 condenser) ring on this board (canFeedback); the DIs
// and close mics can't. Numbers are engine-verified: at 0.6 the send leaves ~6.6
// dB margin, ring onset is ~0.7-0.8, a single-band spike rings and one cut clears
// it. Kept intentionally close to Mixing Monitors' ring-out/HPF (Kyle: light
// overlap), framed here as the feedback toolkit.
// ============================================================
window.MANAGE_FEEDBACK = [
  {
    id: 'fb1',
    title: 'What Feedback Is',
    task: true,
    defs: ['feedback'],
    hint: 'The squeal is a loop: the mic hears Wedge 1, the wedge plays it back into the mic, and it builds on itself. Break the loop and it stops. The fastest way is to take the wedge send down.',
    hints: [
      { title: 'Stop the squeal', target: 'ch1-aux', text: 'Wedge 1 is squealing. Pull AUX 1 on the Vocal 1 input channel down until it stops.', done: (ctx) => !ctx.feedback },
    ],
    involves: [1, 2, 3, 4],
    conditions: [],
    sabotage: (s) => { mwBoard(s); s.channels[0].aux1 = 0.85; return s; },
    solution: 'Feedback is the monitor loop building on itself. Taking the send down broke the loop, but the singer lost their wedge. The rest of this course is how to keep the level and still stop the ring.',
    defaultInspect: 'wedge',
  },
  {
    id: 'fb2',
    title: 'Gain Before Feedback',
    task: true,
    defs: ['feedback'],
    requireMargin: { wedge: 6 },
    hint: 'Watch the "+ dB to F/B" number on Wedge 1. It counts down as you raise the send. Bring it up until the wedge is loud, then stop while that number is still green, around +6 dB. That headroom is what keeps a warm body or a "more me" from tipping it into a squeal mid-show.',
    hints: [
      { title: 'Loud, with headroom', target: 'ch1-aux', text: 'Bring AUX 1 on the Vocal 1 input channel up until Wedge 1 is loud, then stop while the meter still reads green, about +6 dB to feedback.', done: (ctx) => { const fm = window.feedbackMargins ? window.feedbackMargins(ctx.state, ctx.audio) : null; const m = fm ? -fm.wedge : 999; const c = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.vocal; const l = c ? (c.wedge || 0) : 0; return m >= 6 && l >= 0.25; } },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.25 },
    ],
    sabotage: (s) => { mwBoard(s); s.channels[0].aux1 = 0.3; return s; },
    solution: 'The monitor is loud but sits about 6 dB under the ring point. Pros leave that margin on purpose, because the stage only gets louder once the show starts.',
    defaultInspect: 'wedge',
  },
  {
    id: 'fbAim',
    title: 'Aim the Null',
    task: true,
    defs: ['polar pattern', 'null', 'feedback'],
    requireMargin: { wedge: 6 },
    hint: 'Nothing on the console is wrong here. The mic is the problem. A floor wedge sits low and close, about 70 degrees below the capsule, so it is not behind the mic, it is under it. That puts it around 120 degrees off the front, where a supercardioid and a hypercardioid both reject hard and a cardioid barely rejects at all. Open PLACEMENT on the Vocal 1 mic and watch the WEDGE PATH number as you change the pattern.',
    hints: [
      { title: 'Point the null at the wedge', target: 'placement-vocal', text: 'Open PLACEMENT on the Vocal 1 mic and put a null on the wedge, with the pattern or the tilt, until Wedge 1 reads at least +6 dB to feedback.', done: (ctx) => { const fm = window.feedbackMargins ? window.feedbackMargins(ctx.state, ctx.audio) : null; const c = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.vocal; return !ctx.feedback && !!fm && -fm.wedge >= 6 && !!c && (c.wedge || 0) >= 0.25; } },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.25 },
    ],
    sabotage: (s) => {
      // The console is set correctly. The fault is the microphone on the stand.
      // Surveyed geometry: a low-profile 27 deg wedge aimed at the ear sits 0.75 m
      // in front of the singer and 70 deg below the capsule, which with the mic
      // angled up at the mouth puts it about 120 deg off the front. A CARDIOID
      // rejects straight out the back, so almost none of that rejection lands on
      // the wedge. Measured at aux 0.76: cardioid +0.3, which is the fault, and
      // the gate wants 6. Supercardioid +10.8 and hypercardioid +6.4 both clear it
      // on the pattern swap alone. Levelling the hyper drops the wedge onto its
      // 110 deg null for +10.8, and a cardioid tilted well up reaches +6.9.
      // Wrong mic, more than one right answer.
      mwBoard(s);
      s.channels[0].aux1 = 0.76;
      s.micSetup = { vocal: { pattern: 'cardioid', az: 180, tilt: 10 } };
      return s;
    },
    solution: 'A floor wedge is not straight behind the mic, it is low and close, about 70 degrees under the capsule and roughly 120 degrees off the front. A cardioid rejects straight out the back, so hardly any of that rejection reaches the wedge and the number barely moves. A supercardioid nulls near 125 degrees and a hypercardioid near 110, so both of them put real rejection where the wedge actually sits. That is why reaching for a supercardioid or a hypercardioid on a stage vocal buys you level that a cardioid cannot. A cardioid can still get there, but only by tilting the mic well up so its back end swings down onto the wedge.',
    defaultInspect: 'wedge',
  },
  {
    id: 'fbPa',
    title: 'Behind the Speakers',
    task: true,
    defs: ['mains', 'feedback'],
    requireMargin: { mains: 6 },
    hint: 'This ring is not coming from a wedge. Wedge 1 is not even in the mix. Look at the stage: the mains line is drawn above the vocal mics, which means the singers are standing out in front of the speakers. Drag Main L or Main R downstage until the mic row is behind that line. The pattern on the mic will not help you here.',
    hints: [
      { title: 'Get the mics behind the mains', target: 'out-pa-l', text: 'Drag Main L or Main R downstage on the stage until the vocal mics sit well behind the mains line and Main L reads at least +6 dB to feedback.', done: (ctx) => { const fm = window.feedbackMargins ? window.feedbackMargins(ctx.state, ctx.audio) : null; const c = ctx.audio && ctx.audio.contributions && ctx.audio.contributions.vocal; return !ctx.feedback && !!fm && -fm.mains >= 6 && !!c && ((c.pa_l || 0) + (c.pa_r || 0)) >= 0.3; } },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'pa', min: 0.3 },
    ],
    sabotage: (s) => {
      // No wedge send at all: this loop is the main speakers into the vocal mic.
      // paLine is a property of the SYSTEM, so setting it a metre upstage puts
      // EVERY open mic out in front of the boxes at once, and the stage plot
      // draws the mains line above the vocal mic row to show it. The mic's
      // pattern is no help, because the mains stand off to the side where a
      // directional mic already rejects them horizontally. Nothing on the
      // console fixes it either. Moving the speakers does.
      mwBoard(s);
      s.channels[0].fader = 0.76;
      s.paLine = -1.0;
      return s;
    },
    solution: 'Every open microphone belongs behind the front face of the main speakers, and where those speakers stand is one fact about the system, not a setting on each mic. Stand above the stage and look down: if a mic is out past the boxes, no pattern, no EQ and no gain trimming will save it. Once the mics are behind the mains line, the spacing and the cabinet do the work for you.',
    defaultInspect: 'pa',
  },
  {
    id: 'fb3',
    title: 'Fewer Open Mics',
    task: true,
    defs: ['feedback'],
    requireMute: [2],
    hint: 'Two mics are open into Wedge 1. Nobody is on the second one, but it is live and squealing on its own. Every open mic is another way into the loop, so close the one you are not using. Muting it takes it out of every mix, not just this wedge.',
    hints: [
      { title: 'Close the unused mic', target: 'ch2-mute', text: 'Mute channel 2 to close the second mic and stop the squeal, since no one is on it.', done: (ctx) => !ctx.feedback && !!(ctx.state.channels[1] && ctx.state.channels[1].mute) },
    ],
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.2 },
    ],
    sabotage: (s) => { mwBoard(s); s.channels[0].aux1 = 0.55; s.channels[1].aux1 = 0.8; return s; },
    solution: 'An open mic no one is using still feeds the loop. Closing it bought back headroom on Wedge 1 and left the lead vocal untouched.',
    defaultInspect: 'wedge',
  },
  {
    id: 'fb4',
    eqRingOut: true,
    title: 'Ring It Out',
    task: true,
    defs: ['ring out', 'graphic EQ'],
    requireSend: [{ ch: 1, aux: 1, min: 0.6 }],
    toneGate: 0.8,
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.25 },
    ],
    hint: 'Turning the send down would stop the ring but lose the singer. Leave it up and cut the one frequency that is ringing on the Monitor EQ instead. Cut only that band, and only as far as it takes to stop the ring.',
    hints: [
      { title: 'Cut the ringing frequency', target: 'out-wedge1', text: 'Wedge 1 is ringing. Open its Monitor EQ and cut the glowing band by 3 to 6 dB until the ring stops.', done: (ctx) => !ctx.feedback && (((ctx.state.outputs.wedge || {}).eq) || []).some((v) => v < 0) },
    ],
    sabotage: (s) => {
      // One 1.6 kHz resonance (band 14), spiked so Wedge 1 loads ringing on
      // exactly one glowing band. requireSend keeps the send up so the fix is the
      // graphic-EQ cut, not pulling the singer down; toneGate 0.8 blocks shotgun
      // cutting. Same proven single-band recipe as Mixing Monitors' mw6.
      mwBoard(s);
      const prof = new Array(25).fill(0.5); prof[14] = 2.8;
      s.outputs.wedge.fbProfile = prof;
      s.outputs.wedge.volume = 0.6;
      s.channels[0].aux1 = 0.62;
      s.channels[0].highpass = false;
      return s;
    },
    solution: 'A narrow cut on the one frequency that was ringing stopped it and left the wedge as loud as the singer needs. Cutting more than the ring needs just hollows out the sound.',
    defaultInspect: 'wedge',
  },
  {
    id: 'fb5',
    title: 'The Low Ring',
    task: true,
    defs: ['feedback', 'high-pass filter'],
    requireHpfOn: [1],
    toneGate: 0.85,
    involves: [1, 2, 3, 4],
    conditions: [
      { source: 'vocal', dest: 'wedge', min: 0.3 },
    ],
    hint: 'This ring is low and boomy, down where stage rumble and the wedge cabinet live. The high-pass filter clears out that low end without touching the voice. Leave it off on a bass or kick channel, where those lows are the instrument.',
    hints: [
      { title: 'High-pass the low ring', target: 'ch1-hpf', text: 'Wedge 1 is ringing low and boomy. Engage HPF on channel 1 to clear it, and leave the send where it is.', done: (ctx) => !!(ctx.state.channels[0] && ctx.state.channels[0].highpass && !ctx.feedback) },
    ],
    sabotage: (s) => {
      // One 100 Hz resonance (band 2), in HPF territory: the high-pass clears it
      // where a graphic cut is overkill. Same recipe as Mixing Monitors' mwHpf.
      mwBoard(s);
      const prof = new Array(25).fill(0.5); prof[2] = 2.8;
      s.outputs.wedge.fbProfile = prof;
      s.channels[0].aux1 = 0.62;
      s.channels[0].highpass = false;
      return s;
    },
    solution: 'A high-pass filter clears a low, boomy ring without thinning the voice. It is housekeeping that helps, not a cure for every ring, since most feedback lives higher up.',
    defaultInspect: 'wedge',
  },
];

// ============================================================
// LIVE SOUND 101 COMPANION TRACK — Kyle 2026-07-24
// The Lab's exercises re-ordered to run alongside the Live Sound 101 course,
// one group per course lesson, so a student finishing a video can open the Lab
// and find the matching hands-on exercise by its lesson number.
//
// `code` is the LS101 lesson coordinate. Lesson names below are copied from the
// PUBLISHED Circle course, re-verified 2026-07-29 (space live-sound-101, 17
// lessons, no drafts) — the whole promise is number-matching, so they have to be
// exact.
//
// >>> OPEN DECISION, SECTION 4 <<<
// These codes assume a new "Powering Up the System" video goes in as S4.L1,
// bumping Channel Strip -> 4.2, Busses -> 4.3, Calibrating -> 4.4. That video
// does not exist yet: the published Section 4 is 4.1 Channel Strip, 4.2 Auxes/
// Busses/Master, 4.3 Calibrating. Until it ships, three groups here read one
// number high. If the video is dropped instead, the whole fix is: retag 4.3 ->
// 4.2 and 4.4 -> 4.3, and rehome the three POWER rows (they have no other
// lesson to attach to, so they would become a second LAB ORIENTATION group).
//
// Lessons with NO exercise (deliberately, not an oversight):
//   2.1 Power/cables/placement - venue planning, no console action
//   3.4 Playback Devices - the real takeaway is gain structure, folded into 4.4
//   4.2 Channel Strip  - would need channel EQ + compressor on every strip;
//                        Kyle's existing walkthrough videos cover it instead
//   5.4 Workbox        - physical kit
//
// PENDING mechanic (rows appear once it is built):
//   3.3 hum / ground lift. (Routing shipped v220-v222 and mic placement shipped
//   v224-v225; both are now placed above.)
// ============================================================
window.LS101_TRACK = [
  { code: '1.1', lesson: 'Signal Flow', id: 'pt0' },
  { code: '1.1', lesson: 'Signal Flow', id: 'pt3' },
  // 1.2 is trace-the-chain, and "Crossed at the Console" is exactly that. It
  // also keeps the Patching course's own order (pt0 then pt0b) intact.
  { code: '1.2', lesson: 'Tracing a Signal Chain', id: 'pt0b' },
  { code: '2.2', lesson: 'Outputs', id: 'pt2' },
  { code: '2.2', lesson: 'Outputs', id: 'ptSwap' },
  { code: '3.1', lesson: 'Microphone Types', id: 'is2' },
  // Published 3.2 covers positioning for feedback mitigation, so the two
  // placement exercises belong here, in their home course's order.
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fb1' },
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fb2' },
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fbAim' },
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fbPa' },
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fb3' },
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fb4' },
  { code: '3.2', lesson: 'Microphone Feedback', id: 'fb5' },
  { code: '3.3', lesson: 'DI Boxes', id: 'is3' },
  { code: '4.1', lesson: 'Powering Up the System', id: 'pwPop' },
  { code: '4.1', lesson: 'Powering Up the System', id: 'pwUp' },
  { code: '4.1', lesson: 'Powering Up the System', id: 'pwDown' },
  // Master section first (Start Here 106 is the only step-by-step teaching of
  // the LR assign), then the aux sends the rest of the lesson is about.
  { code: '4.3', lesson: 'Auxes, Busses & Master Section', id: 106 },
  { code: '4.3', lesson: 'Auxes, Busses & Master Section', id: 'mw1' },
  { code: '4.3', lesson: 'Auxes, Busses & Master Section', id: 'mw2' },
  { code: '4.3', lesson: 'Auxes, Busses & Master Section', id: 'mw3' },
  { code: '4.3', lesson: 'Auxes, Busses & Master Section', id: 'mw4' },
  { code: '4.3', lesson: 'Auxes, Busses & Master Section', id: 'mwMoreMe' },
  { code: '4.4', lesson: 'Calibrating the System', id: 'is1' },
  { code: '4.4', lesson: 'Calibrating the System', id: 'sy1' },
  { code: '4.4', lesson: 'Calibrating the System', id: 'sy2' },
  { code: '4.4', lesson: 'Calibrating the System', id: 'sy3' },
  { code: '4.4', lesson: 'Calibrating the System', id: 'sy4' },
  // Lab orientation, not an LS101 lesson: the soundcheck and the capstone both
  // run on the 16-channel board, so this comes first or they arrive cold.
  { code: 'LAB', lesson: 'Using the 16-Channel Board', id: 'bg1' },
  { code: 'LAB', lesson: 'Using the 16-Channel Board', id: 'bg2' },
  { code: 'LAB', lesson: 'Using the 16-Channel Board', id: 'bg3' },
  { code: 'LAB', lesson: 'Using the 16-Channel Board', id: 'bg4' },
  { code: '5.1', lesson: 'Soundcheck', id: 'sc1' },
  { code: '5.1', lesson: 'Soundcheck', id: 'sc2' },
  { code: '5.1', lesson: 'Soundcheck', id: 'sc3' },
  { code: '5.1', lesson: 'Soundcheck', id: 'sc4' },
  { code: '5.1', lesson: 'Soundcheck', id: 'sc5' },
  { code: '5.1', lesson: 'Soundcheck', id: 'sc6' },
  { code: '5.2', lesson: 'Troubleshooting', id: 'pt4' },
  { code: '5.2', lesson: 'Troubleshooting', id: 'pt5' },
  { code: '5.2', lesson: 'Troubleshooting', id: 'is4' },
  { code: '5.2', lesson: 'Troubleshooting', id: 'is5' },
  { code: '5.3', lesson: 'Advance Work', id: 'pt1' },
  { code: '5.5', lesson: 'Final Lesson', id: 'gig1' },
];
