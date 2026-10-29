const { Knob: K, Fader: F, LedMeter: M, ButtonPad: BP, Led: L } = window;

function PFLBar({ level, hot, mkey = null }) {
  const segs = 14;
  // dBFS bar: full scale = the console's clip point (0 dBFS = +22 dBu). Read the
  // meter's own zones like a real digital desk: keep the average up in the
  // healthy range with peaks staying below the red. No target overlay.
  const db = window.levelToDbfs(level);
  const lit = Math.min(segs, Math.round((window.dbfsFrac ? window.dbfsFrac(db) : 0) * segs));
  const holdRef = React.useRef({ db: -60, t: null, holdUntil: 0 });
  const holdDb = window.advancePeakHold ? window.advancePeakHold(holdRef, db) : db;
  const holdIdx = window.peakHoldIdx ? window.peakHoldIdx(holdDb, segs) : -1;
  const rootRef = window.useMeterCells(mkey, 'pfl', segs);
  return (
    <div className="ui-no-select" style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
      <div ref={rootRef} style={{
        position: 'relative',
        display: 'flex', gap: 1,
        width: '100%',
        padding: 2,
        background: '#0a0a0c',
        border: '1px solid ' + (hot ? 'var(--amber)' : '#38383e'),
        borderRadius: 2,
        boxShadow: hot ? '0 0 4px rgba(255,181,71,0.45)' : 'none',
      }}>
        {Array.from({ length: segs }).map((_, i) => {
          // Same dBFS zone map as every other meter, so "red" means one
          // thing everywhere: peaks within 3 dB of the clip point. The held
          // peak segment lights bright at the highest recent peak so a
          // transient that grits the preamp leaves a visible mark.
          const segDb = -48 + ((i + 1) / segs) * 48;
          const isHold = i === holdIdx;
          const c = isHold ? dbfsColor(holdDb) : dbfsColor(segDb);
          const on = i < lit || isHold;
          return <div key={i} className="led-cell" style={{ flex: 1, height: 4, background: on ? c : '#1a1a1c', borderRadius: 0.5, boxShadow: on ? `0 0 ${isHold ? 5 : 3}px ${c}` : 'none', opacity: on ? 1 : 0.5 }}/>;
        })}
        {/* non-color threshold marks (hot -12 dBFS, clip -3 dBFS) so the healthy zone and the red read by position, not hue */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 'calc(75% - 0.5px)', width: 1, background: 'rgba(233,231,224,0.28)', pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', top: -1.5, bottom: -1.5, left: 'calc(93.75% - 0.75px)', width: 1.5, background: 'rgba(233,231,224,0.6)', pointerEvents: 'none' }}/>
      </div>
    </div>
  );
}

function ChannelStrip({ ch, idx, onChange, onPhantomToggle, onInspect, channelLevel, pflLevel, isFaultStrip, srcLabel, powered = true, big16 = false }) {
  const insp = (dest) => { if (onInspect) onInspect(dest); };
  const set = (patch) => onChange({ ...ch, ...patch });
  // Phantom power has a parent-owned handler so the App can do its
  // safety/pop check at the moment of engagement. Fall back to the local
  // set() if no handler is wired (keeps the strip standalone-usable).
  const togglePhantom = onPhantomToggle ? () => onPhantomToggle() : () => set({ phantom: !ch.phantom });
  const srcDisplay = srcLabel?.label || (ch.label === '—' ? 'EMPTY' : ch.label);
  // Spotlight anchors. Every strip carries channel-keyed anchors (ch1-gain,
  // ch2-pfl, ...) so a guided lesson can ring the exact control on the exact
  // channel it is teaching. The Mixer Tutorial and Run the Show both target
  // these by the ch{n}-{control} key (n = channel number).
  const walk = (key, el) => <span data-walk={'ch' + (idx + 1) + '-' + key} style={{ display: 'inline-flex' }}>{el}</span>;

  return (
    <div data-walk={'ch' + (idx + 1) + '-strip'} style={{
      width: 100,
      background: 'linear-gradient(180deg,#222226 0%, #1a1a1d 8%, #1a1a1d 100%)',
      border: '1px solid #0a0a0c',
      borderTop: '1px solid #3a3a40',
      borderRadius: 4,
      padding: '8px 5px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      position: 'relative',
      boxShadow: isFaultStrip ? '0 0 0 1.5px rgba(255,70,48,0.5), 0 0 20px rgba(255,70,48,0.25)' : 'none',
      // Console powered down: the whole strip reads as dead — dimmed and
      // desaturated, the same visual language the speakers/amp use when off.
      // An UNUSED input (big-desk padding) reads as a spare strip: dimmed but
      // not dead, since nothing is patched to it yet.
      opacity: powered ? (ch.unused ? 0.42 : 1) : 0.5,
      filter: powered ? (ch.unused ? 'grayscale(0.5)' : 'none') : 'grayscale(0.75)',
      transition: 'box-shadow 0.2s, opacity 0.15s, filter 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 2px' }}>
        <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', fontWeight: 600 }}>CH</div>
        {/* The stereo line channel reads as one strip with two inputs: 5/6. */}
        <div className="display" style={{ fontSize: ch.stereo ? 13 : 15, color: 'var(--ink)', fontWeight: 800, lineHeight: 1 }}>{ch.stereo ? `${idx + 1}/${idx + 2}` : idx + 1}</div>
      </div>

      <div data-walk={'ch' + (idx + 1) + '-phantom'} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <BP active={ch.phantom} onClick={togglePhantom} label="+48V" color="var(--hot)" width={32} height={13} fontSize={7}
          tip={(!ch.mute && ch.fader > 0.05)
            ? 'Phantom power (+48V). This channel is LIVE: mute it before switching +48V, or the pop goes to the speakers.'
            : 'Phantom power (+48V) for condenser mics and active DIs. Switch it while the channel is muted.'} />
        <L on={powered && ch.phantom} color="var(--hot)" size={5}/>
      </div>

      {walk('gain', <K value={ch.gain} onChange={(v) => set({ gain: v })} label="Gain" size={40} color="var(--accent)"
        tip="Input gain. Sets how hard the source hits the preamp. Set it first, in PFL." />)}

      {/* The INPUT meter, right under the preamp. This is the meter the
          gain-setting lessons mean, so it gets its own anchor separate
          from the fader row's. */}
      <div data-walk={'ch' + (idx + 1) + '-inputmeter'} style={{ width: '94%' }}>
        <PFLBar level={pflLevel} hot={ch.solo} mkey={'pfl:' + idx}/>
        <div className="mono" style={{ fontSize: 6.5, color: ch.solo ? 'var(--amber)' : 'var(--ink-3)', textAlign: 'center', marginTop: 1, letterSpacing: 0.5, fontWeight: 700 }}>
          {ch.solo ? 'PFL' : 'INPUT'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 3, marginTop: 1 }}>
        {walk('hpf', <BP active={ch.highpass} onClick={() => set({ highpass: !ch.highpass })} label="HPF" color="var(--cool)" width={32} height={12} fontSize={7}
          tip="High-pass filter. Cuts everything below a set low point. Right for voices; leave it off for bass and kick."/>)}
      </div>

      <div data-walk={'ch' + (idx + 1) + '-aux'} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center', gap: 5, maxWidth: 78 }}>
        <K value={ch.aux1} onChange={(v) => { set({ aux1: v }); insp('wedge'); }} label="AUX1" size={26} color="var(--aux)"
          tip="How much of this channel goes to Wedge 1, the lead singer's monitor. Doesn't change the PA." />
        <K value={ch.aux2} onChange={(v) => { set({ aux2: v }); insp('wedge2'); }} label="AUX2" size={26} color="var(--cool)"
          tip={big16 ? "How much of this channel goes to Wedge 2, the bass player's monitor. Doesn't change the PA." : "How much of this channel goes to Wedge 2, the second singer's monitor. Doesn't change the PA."} />
        <K value={ch.aux3 || 0} onChange={(v) => { set({ aux3: v }); if (big16) insp('wedge3'); }} label="AUX3" size={26} color="var(--green)"
          tip={big16 ? "How much of this channel goes to Wedge 3, the keys player's monitor. Doesn't change the PA." : "AUX 3 send. Spare on this board. It isn't patched to a wedge."} />
        <K value={ch.aux4 || 0} onChange={(v) => { set({ aux4: v }); if (big16) insp('wedge4'); }} label="AUX4" size={26} color="var(--amber)"
          tip={big16 ? "How much of this channel goes to Wedge 4, the drummer's monitor. Doesn't change the PA." : "AUX 4 send. Spare on this board. It isn't patched to a wedge."} />
      </div>

      {walk('pan', <K value={ch.pan} onChange={(v) => set({ pan: v })} label={ch.stereo ? 'BAL' : 'PAN'} size={32} color="var(--ink)" detentAt={0.5}
        tip={ch.stereo
          ? 'Balance for the stereo channel: favors the left or right side of the PA. Double-click to center.'
          : 'Pan. Places this channel between the left and right main speakers. Double-click to center.'} />)}

      <div style={{ display: 'flex', gap: 3 }}>
        {walk('mute', <BP active={ch.mute} onClick={() => set({ mute: !ch.mute })} label="MUTE" color="var(--hot)" width={28} height={14} fontSize={7}
          tip="Silences this channel everywhere after the preamp: PA and wedges."/>)}
        {/* PFL = Pre-Fader Listen. Monitor-only — routes this channel to
            the engineer's headphone bus. Does NOT mute the rest of the
            mix; the audience keeps hearing everything. */}
        {walk('pfl', <BP active={ch.solo} onClick={() => set({ solo: !ch.solo })} label="PFL" color="var(--amber)" width={24} height={14} fontSize={7}
          tip="Pre-fade listen. Hear just this channel in your headphones. The audience keeps hearing the full mix."/>)}
      </div>

      {/* The walkthrough spotlight anchors on the whole fader+meter row (not
          just the fader), so the ring frames the full assembly and sits
          centered, including the meter the lesson is talking about. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 1 }}>
        <div data-walk={'ch' + (idx + 1) + '-fader'} style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <F value={ch.fader} onChange={(v) => { set({ fader: v }); insp('pa'); }} height={172}/>
          <M level={channelLevel} height={172} segments={22} mkey={'chlvl:' + idx}/>
        </div>
        {/* BUS ASSIGN. Routing lives down in the fader block on a real desk, to
            the RIGHT of the fader (Kyle 2026-07-24), not up with mute and solo.
            Its own bottom-aligned column so more bus buttons can stack above. */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div className="mono" style={{ fontSize: 5.5, letterSpacing: 0.3, color: 'var(--ink-3)', lineHeight: 1 }}>BUS</div>
          {walk('lr', <BP active={ch.toMain !== false} onClick={() => set({ toMain: ch.toMain === false })} label="LR" width={22} height={16} fontSize={7}
            color="var(--green)"
            tip="Assigns this channel to the main mix, what the audience hears. Switched off, the channel still reaches the monitors but never the room."/>)}
        </div>
      </div>

      <div style={{
        marginTop: 2,
        width: 'calc(100% - 4px)',
        background: '#0e0e10',
        color: srcLabel ? 'var(--label)' : 'var(--ink-3)',
        border: '1px solid ' + (srcLabel ? '#38383e' : '#222226'),
        borderRadius: 2,
        padding: '2px 3px',
        fontSize: 8,
        textAlign: 'center',
        letterSpacing: 0.3,
        fontWeight: 600,
        textTransform: 'uppercase',
        minHeight: 14,
        lineHeight: 1.2,
      }} className="mono">
        {srcDisplay}
      </div>
    </div>
  );
}

function MasterSection({ master, onChange, paLevel, paRLevel, powered = true, onInspect }) {
  return (
    <div data-walk="master-section" style={{
      background: 'linear-gradient(180deg,#2a2a30 0%, #1f1f23 8%, #1c1c20 100%)',
      border: '1px solid #0a0a0c',
      borderTop: '1px solid #45454d',
      borderRadius: 4,
      padding: '10px 12px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      width: 150,
      opacity: powered ? 1 : 0.5,
      filter: powered ? 'none' : 'grayscale(0.75)',
      transition: 'opacity 0.15s, filter 0.15s',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div className="display" style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', letterSpacing: 0.5, lineHeight: 1 }}>MASTER</div>
        <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: 1 }}>MAIN MIX · L/R</div>
      </div>

      {/* Aux send masters — sit alongside the main master, each controlling
          the overall level of its aux bus (one per wedge) before it leaves the
          desk. Four wedges, four masters, wrapped 2x2. */}
      <div data-walk="master-aux" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
        {[1, 2, 3, 4].map((n) => {
          const isPost = !!(master.auxPost && master.auxPost[n]);
          const col = n === 1 ? 'var(--aux)' : n === 2 ? 'var(--cool)' : n === 3 ? 'var(--green)' : 'var(--amber)';
          return (
            <div key={n} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <K value={master['aux' + n] != null ? master['aux' + n] : 0.75}
                 onChange={(v) => onChange({ ...master, ['aux' + n]: v })}
                 label={'AUX ' + n} size={28} color={col} />
              <div data-walk={'aux' + n + '-prepost'}
                onClick={() => onChange({ ...master, auxPost: { ...(master.auxPost || {}), [n]: !isPost } })}
                className="mono ui-no-select"
                title="Pre-fader takes the send before the channel fader, so riding a fader for the room never changes what the performer hears. That is the standard for monitors. Post-fader follows the channel fader, which is what a recording or stream feed wants."
                style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: 0.3, cursor: 'pointer', padding: '1px 3px', borderRadius: 3, lineHeight: 1.3,
                  color: isPost ? '#0a0a0c' : 'var(--ink-3)', background: isPost ? col : '#0a0a0c',
                  border: '1px solid ' + (isPost ? col : '#38383e') }}>
                {isPost ? 'POST' : 'PRE'}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ width: '100%', height: 1, background: '#0a0a0c', boxShadow: '0 1px 0 #3a3a40' }}/>

      <BP active={master.mute} onClick={() => onChange({ ...master, mute: !master.mute })} label="MUTE MAIN" color="var(--hot)" width={108} height={22} fontSize={10}/>

      {/* Spotlight frames the master fader together with its L/R meters. */}
      <div data-walk="master-fader" style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginTop: 1 }}>
        <F value={master.fader} onChange={(v) => { onChange({ ...master, fader: v }); if (onInspect) onInspect('pa'); }} height={208}/>
        <div style={{ display: 'flex', gap: 3 }}>
          <M level={paLevel} height={208} segments={26} mkey="out:pa_l"/>
          <M level={paRLevel} height={208} segments={26} scale mkey="out:pa_r"/>
        </div>
      </div>

      <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: 1 }}>L · R</div>
    </div>
  );
}

function Console({ state, setState, audio, faultChannelIdx }) {
  // Functional updates so a control change and an auto-inspect switch can be
  // dispatched back-to-back without one clobbering the other.
  const updateChannel = (i, ch) => setState(prev => {
    const channels = [...prev.channels];
    channels[i] = ch;
    return { ...prev, channels };
  });
  const updateMaster = (m) => setState(prev => ({ ...prev, master: m }));
  // Auto-follow: adjusting a control switches "you are listening to" to the
  // destination that control feeds, so a new user hears what they're changing
  // (a fader feeds the PA, AUX 1 the first wedge, AUX 2 the second).
  const inspectTo = (dest) => setState(prev => prev.inspect === dest ? prev : { ...prev, inspect: dest });

  // Phantom toggle goes through here so we can run the safety check at the
  // moment the user hits +48V. Turning phantom OFF is always allowed (no
  // pop risk). Turning phantom ON: if the channel + master + a speaker are
  // all open, we still apply the change (the +48V really did engage) but
  // we also record a phantomPop — that flag drives the visual flash and
  // blocks the level from registering as solved this attempt.
  //
  // Uses functional setState so back-to-back clicks (e.g. MUTE → +48V in
  // quick succession) see the most-recent state, not the value closed over
  // at render time.
  const togglePhantom = (i) => {
    setState(prev => {
      const ch = prev.channels[i];
      if (!ch) return prev;
      const turningOn = !ch.phantom;
      const channels = prev.channels.map((c, j) => j === i ? { ...c, phantom: !c.phantom } : c);
      const next = { ...prev, channels };
      // Phantom power comes from the console's supply. With the desk off there
      // is no +48V and no transient, so nothing pops (and PFL cans are dead).
      const mixerOnNow = prev.mixer ? prev.mixer.on !== false : true;
      if (turningOn && mixerOnNow) {
        // PFL is pre-fader/pre-mute: if this channel is soloed, the +48V
        // switch-on transient goes straight to the engineer's headphones,
        // muted or not. Right in the ears. That's the worst kind of pop.
        if (ch.solo) {
          next.phantomPop = { channel: i, at: Date.now(), cause: 'phantom_cans' };
        } else if (window.wouldPopPhantom && window.wouldPopPhantom(prev, i)) {
          next.phantomPop = { channel: i, at: Date.now() };
        }
      }
      return next;
    });
  };

  // When the console is powered down, its meters and LEDs are dead — they draw
  // no signal because they have no power. So zero every console meter and gate
  // the indicator LEDs on mixer power. (The master L/R meters already go dark
  // because the main bus is gated by mixer power upstream.)
  const mixerOn = state.mixer ? state.mixer.on !== false : true;
  const channelLevels = audio.post.map((p) => mixerOn ? p * 1.2 : 0);
  const pflLevels = audio.chanIn.map(v => mixerOn ? v : 0);

  // Master L/R meters read from the MAIN BUS (post master fader, pre-PA).
  // Speaker on/off/mute/volume must NOT silence these — that's the speaker's
  // problem, not the desk's, and a real console keeps showing what it's
  // sending no matter what's happening downstream.
  //
  // The 0.85 display multiplier is calibrated so a typical multi-channel
  // mix at default fader settings sits in the YELLOW band — leaves visual
  // headroom before the red, so the meter remains a useful operating
  // signal rather than pegged red by the act of opening the master.
  const main = audio.mainBus || { L: 0, R: 0 };
  const masterL = main.L || 0;
  const masterR = main.R || 0;

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      padding: '16px 14px 12px',
      background: 'linear-gradient(180deg, #2a2a2e 0%, #1c1c1f 100%)',
      border: '1px solid #0a0a0c',
      borderRadius: 8,
      boxShadow: 'inset 0 1px 0 #45454d, 0 4px 20px rgba(0,0,0,0.5)',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: -1, left: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Mixer power. The orange status LED follows the power state so the
            student gets an immediate visual that the desk is or isn't on.
            Most levels start with the mixer on (default state) — the Power-On
            Sequence is the lesson that uses this. */}
        {(() => {
          return <>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: mixerOn ? 'var(--accent)' : '#3a1a1a',
              boxShadow: mixerOn ? '0 0 6px var(--accent)' : 'inset 0 0 0 1px rgba(90,32,24,0.6)',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}/>
            <div className="display" style={{ fontSize: 10, color: mixerOn ? 'var(--ink-2)' : '#5a2018', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>AU · MX-{consoleInputs(state)}</div>
            <span data-walk="mixer-power" style={{ display: 'inline-flex' }}>
            <PowerButton on={mixerOn} width={32} height={13}
              onClick={() => {
                setState(prev => {
                  const wasOn = prev.mixer ? prev.mixer.on !== false : true;
                  const turningOn = !wasOn;
                  const next = { ...prev, mixer: { ...(prev.mixer || {}), on: !wasOn } };
                  if (turningOn && window.wouldPopOnMixerOn && window.wouldPopOnMixerOn(prev)) {
                    next.phantomPop = { at: Date.now(), cause: 'mixer_pop' };
                  } else if (!turningOn && window.wouldPopOnMixerOn && window.wouldPopOnMixerOn(prev)) {
                    // Same physics in reverse: the console's switch-OFF
                    // transient goes into any powered box still live. This is
                    // why power-down order is speakers first, console last.
                    next.phantomPop = { at: Date.now(), cause: 'mixer_off_pop' };
                  }
                  return next;
                });
              }}/>
            </span>
          </>;
        })()}
      </div>

      {state.channels.map((ch, i) => {
        const srcKey = audio.chanInSource[i];
        const srcLabel = srcKey ? window.SOURCES[srcKey] : null;
        return (
          <ChannelStrip
            key={i}
            ch={ch}
            idx={i}
            onChange={(c) => updateChannel(i, c)}
            onPhantomToggle={() => togglePhantom(i)}
            onInspect={inspectTo}
            channelLevel={channelLevels[i]}
            pflLevel={pflLevels[i]}
            isFaultStrip={faultChannelIdx === i}
            srcLabel={srcLabel}
            powered={mixerOn}
            big16={state.big16}
          />
        );
      })}

      <div style={{ width: 1, background: '#0a0a0c', boxShadow: '1px 0 0 #3a3a40' }}/>

      <MasterSection
        master={state.master}
        onChange={updateMaster}
        paLevel={masterL}
        paRLevel={masterR}
        powered={mixerOn}
        onInspect={inspectTo}
      />
    </div>
  );
}

window.Console = Console;

// ============================================================
// DIGITAL CONSOLE SURFACE (Phase 1): select-then-edit.
// A second VIEW of the exact same engine state — no engine changes.
// On a digital desk you SELECT a channel and one shared editor
// section operates it (gain, EQ, sends, pan). The number-one
// real-world digital mistake, adjusting the wrong channel because
// you didn't confirm what was selected, only exists on this surface.
// The fader bay deliberately mirrors the analog Console's outer
// geometry (strip width 100, gap 8, 14px pad, 1px divider, 150 master)
// so the shared ChannelAnchors chips and the whole cable overlay line
// up with zero changes to Chain.
// ============================================================
function DigitalSelStrip({ ch, idx, selected, onSelect, onSelectQuiet, onMute, onSolo, onFader, level, isFaultStrip, srcLabel, powered, groupMuted }) {
  const isSel = idx === selected;
  const color = srcLabel?.color || '#5a5a64';
  const name = srcLabel?.short || (ch.label === '—' ? 'EMPTY' : (ch.label || '').toUpperCase());
  const chNum = ch.stereo ? `${idx + 1}/${idx + 2}` : `${idx + 1}`;
  return (
    <div
      onPointerDownCapture={() => (onSelectQuiet || onSelect)(idx)}
      style={{
        width: 100, cursor: 'pointer',
        background: isSel ? 'linear-gradient(180deg,#2c2c34 0%, #1d1d22 100%)' : 'linear-gradient(180deg,#1e1e22 0%, #151518 100%)',
        border: '1px solid ' + (isSel ? color : '#0a0a0c'),
        borderRadius: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 5,
        paddingBottom: 8,
        position: 'relative', overflow: 'hidden',
        boxShadow: isFaultStrip
          ? '0 0 0 1.5px rgba(255,70,48,0.5), 0 0 20px rgba(255,70,48,0.25)'
          : (isSel ? `0 0 14px ${color}55` : 'none'),
        opacity: powered ? 1 : 0.5,
        filter: powered ? 'none' : 'grayscale(0.75)',
        transition: 'box-shadow 0.15s, border-color 0.15s, background 0.15s, opacity 0.15s, filter 0.15s',
      }}>
      {/* SCRIBBLE STRIP — the colored LCD name window above the fader, the single
          most recognizable cue of a digital desk. Lights up when selected. */}
      <div style={{ background: color, padding: '3px 4px 4px', boxShadow: isSel ? `0 0 10px ${color}` : 'inset 0 -2px 4px rgba(0,0,0,0.25)' }}>
        <div className="mono" style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.2, color: '#0a0a0c', textAlign: 'center', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 0 rgba(255,255,255,0.25)' }}>{name}</div>
        <div className="mono" style={{ fontSize: 7, fontWeight: 700, color: 'rgba(0,0,0,0.55)', textAlign: 'center', lineHeight: 1.2 }}>CH {chNum}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '0 5px' }}>
        {/* SELECT — points the channel-view screen at this channel. */}
        <BP active={isSel} onClick={() => onSelect(idx)} label="SELECT" color="var(--accent)" width={86} height={15} fontSize={7.5}
          tip="Select this channel into the channel view below. A digital desk has one screen for every channel, so it edits whatever is selected. Check what is selected before you touch anything." />

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 1 }}>
          <F value={ch.fader} onChange={(v) => onFader(v)} height={150} />
          <M level={level} height={150} segments={20} mkey={'dchlvl:' + idx}/>
        </div>

        {/* SOLO + MUTE under the fader, the way a console lays them out. */}
        <div style={{ display: 'flex', gap: 4 }}>
          <BP active={ch.solo} onClick={() => onSolo()} label="SOLO" color="var(--amber)" width={40} height={15} fontSize={7.5}
            tip="Pre-fade listen (PFL). Hear just this channel in your headphones; the audience keeps hearing the full mix." />
          <BP active={ch.mute} onClick={() => onMute()} label="MUTE" color="var(--hot)" width={40} height={15} fontSize={7.5}
            tip="Silence this channel everywhere after the preamp: PA and wedges." />
        </div>

        {/* Muted by an active mute group: own MUTE off but silent anyway. */}
        <div className="mono" style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: 0.4, lineHeight: 1, minHeight: 8, color: groupMuted ? 'var(--hot)' : 'transparent' }}>{groupMuted ? '● GROUP MUTE' : '·'}</div>
      </div>
    </div>
  );
}

function DigitalChannelEditor({ ch, idx, srcLabel, pflLevel, onChange, onPhantomToggle, onInspect, powered, muteGroups, dcas, big16 = false }) {
  const set = (patch) => onChange({ ...ch, ...patch });
  const insp = (d) => { if (onInspect) onInspect(d); };
  const togglePhantom = onPhantomToggle ? () => onPhantomToggle() : () => set({ phantom: !ch.phantom });
  const name = srcLabel?.short || srcLabel?.label || (ch.label === '—' ? 'EMPTY' : ch.label);
  const color = srcLabel?.color || '#5a5a64';
  const chNum = ch.stereo ? `${idx + 1}/${idx + 2}` : `${idx + 1}`;
  const inGroups = (muteGroups || []).filter(g => (g.members || []).indexOf(idx) !== -1);
  const inDcas = (dcas || []).filter(d => (d.members || []).indexOf(idx) !== -1);
  const memberText = [
    ...inGroups.map(g => (g.name || 'MG') + (g.active ? ' •' : '')),
    ...inDcas.map(d => 'DCA ' + (d.name || '')),
  ].join('   ') || 'none';
  // Screen "tile" — each block of the channel's processing reads like a panel
  // on a real digital console's channel-view screen.
  const tile = {
    display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
    background: 'linear-gradient(180deg,#17171b,#121215)', border: '1px solid #2a2a30',
    borderRadius: 4, padding: '5px 9px 7px',
  };
  const tileLabel = { fontSize: 7, fontWeight: 800, letterSpacing: 1.2, color: 'var(--ink-3)' };
  return (
    <div style={{
      marginTop: 8, width: '100%', boxSizing: 'border-box',
      background: '#0b0b0d', border: '1px solid #2a2a30', borderRadius: 7, padding: 7,
      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.7), 0 1px 0 #3a3a40',
      opacity: powered ? 1 : 0.5, filter: powered ? 'none' : 'grayscale(0.75)',
      transition: 'opacity 0.15s, filter 0.15s',
    }}>
      {/* SCREEN header — colored by the selected channel, the way the channel
          view is tinted on an X32 / SQ / TF when you SELECT a channel. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `linear-gradient(90deg, ${color}, ${color}aa)`, borderRadius: 4, padding: '5px 10px', marginBottom: 7 }}>
        <div className="mono" style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: 1.5, color: 'rgba(0,0,0,0.55)' }}>CHANNEL VIEW</div>
        <div className="display" style={{ fontSize: 18, fontWeight: 800, color: '#0a0a0c', lineHeight: 1 }}>CH {chNum}</div>
        <div className="mono" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, color: '#0a0a0c' }}>{(name || '').toUpperCase()}</div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          <BP active={ch.solo} onClick={() => set({ solo: !ch.solo })} label="SOLO" color="var(--amber)" width={42} height={18} fontSize={8}
            tip="Pre-fade listen. Hear just this channel in your headphones." />
          <BP active={ch.mute} onClick={() => set({ mute: !ch.mute })} label="MUTE" color="var(--hot)" width={42} height={18} fontSize={8}
            tip="Silence this channel everywhere after the preamp." />
        </div>
      </div>

      {/* PROCESSING ROW — the channel's chain laid out as screen tiles. */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={tile}>
          <div className="mono" style={tileLabel}>PREAMP</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <K value={ch.gain} onChange={(v) => set({ gain: v })} label="GAIN" size={40} color="var(--accent)"
              tip="Input gain. How hard the source hits the preamp. Set it first, watching the input meter or SOLO." />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <BP active={ch.phantom} onClick={togglePhantom} label="48V" color="var(--hot)" width={36} height={15} fontSize={7.5}
                tip={(!ch.mute && ch.fader > 0.05) ? 'Phantom power (+48V). This channel is LIVE: mute it before switching +48V or the pop goes to the speakers.' : 'Phantom power (+48V) for condenser mics and active DIs. Switch it while the channel is muted.'} />
              <window.MiniMeter level={pflLevel} width={36} segments={9} mkey={'pfl:' + idx}/>
              <div className="mono" style={{ fontSize: 6.5, color: ch.solo ? 'var(--amber)' : 'var(--ink-3)', fontWeight: 700 }}>{ch.solo ? 'PFL' : 'IN'}</div>
            </div>
          </div>
        </div>

        <div style={tile}>
          <div className="mono" style={tileLabel}>LOW CUT</div>
          <BP active={ch.highpass} onClick={() => set({ highpass: !ch.highpass })} label={ch.highpass ? 'ON · 100 Hz' : 'OFF'} color="var(--cool)" width={66} height={20} fontSize={8}
            tip="High-pass filter. Cuts everything below a set low point. Right for voices; leave it off for bass and kick." />
        </div>

        <div style={tile}>
          <div className="mono" style={tileLabel}>BUS SENDS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 104 }}>
            <K value={ch.aux1} onChange={(v) => { set({ aux1: v }); insp('wedge'); }} label="WEDGE 1" size={32} color="var(--aux)"
              tip="How much of this channel goes to Wedge 1, the lead singer's monitor. Does not change the PA." />
            <K value={ch.aux2} onChange={(v) => { set({ aux2: v }); insp('wedge2'); }} label="WEDGE 2" size={32} color="var(--cool)"
              tip={big16 ? 'How much of this channel goes to Wedge 2, the bass player\'s monitor. Does not change the PA.' : 'How much of this channel goes to Wedge 2, the second singer\'s monitor. Does not change the PA.'} />
            <K value={ch.aux3 || 0} onChange={(v) => { set({ aux3: v }); if (big16) insp('wedge3'); }} label={big16 ? 'WEDGE 3' : 'AUX 3'} size={32} color="var(--green)"
              tip={big16 ? 'How much of this channel goes to Wedge 3, the keys player\'s monitor. Does not change the PA.' : 'AUX 3 send. Spare on this board. It isn\'t patched to a wedge.'} />
            <K value={ch.aux4 || 0} onChange={(v) => { set({ aux4: v }); if (big16) insp('wedge4'); }} label={big16 ? 'WEDGE 4' : 'AUX 4'} size={32} color="var(--amber)"
              tip={big16 ? 'How much of this channel goes to Wedge 4, the drummer\'s monitor. Does not change the PA.' : 'AUX 4 send. Spare on this board. It isn\'t patched to a wedge.'} />
          </div>
        </div>

        <div style={tile}>
          <div className="mono" style={tileLabel}>{ch.stereo ? 'BALANCE' : 'PAN'}</div>
          <K value={ch.pan} onChange={(v) => set({ pan: v })} label="" size={42} color="var(--ink)" detentAt={0.5}
            tip={ch.stereo ? 'Balance for the stereo channel. Double-click to center.' : 'Pan between the left and right main speakers. Double-click to center.'} />
        </div>

        <div style={{ ...tile, flex: 1, minWidth: 96, alignItems: 'flex-start' }}>
          <div className="mono" style={tileLabel}>ASSIGN</div>
          <span className="mono" style={{ fontSize: 9, color: 'var(--ink-2)', fontWeight: 700, lineHeight: 1.5 }}>{memberText}</span>
        </div>
      </div>
    </div>
  );
}

// The mute-group buttons and DCA faders for the digital surface. A digital-only
// fault lights a mute group (silencing its members) or pulls a DCA to zero;
// the fix is to clear the group or bring the DCA back up.
function DigitalGroups({ muteGroups, onToggleMute, powered }) {
  const groups = muteGroups || [];
  if (!groups.length) return null;
  return (
    <div style={{
      marginTop: 8, width: '100%', boxSizing: 'border-box',
      background: 'linear-gradient(180deg,#202024 0%, #161619 100%)',
      border: '1px solid #0a0a0c', borderRadius: 6, padding: '10px 14px',
      display: 'flex', flexDirection: 'column', gap: 7, minHeight: 96,
      opacity: powered ? 1 : 0.5, filter: powered ? 'none' : 'grayscale(0.75)',
    }}>
      <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>MUTE GROUPS</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {groups.map((g, i) => (
          <BP key={i} active={!!g.active} onClick={() => onToggleMute(i)} label={g.name || ('MG' + (i + 1))} color="var(--hot)" width={62} height={28} fontSize={9.5}
            tip={'Mute group ' + (g.name || (i + 1)) + '. When lit, every channel assigned to it is silenced even if the channel MUTE is off. Members: ' + (g.members || []).map(m => 'CH' + (m + 1)).join(', ')} />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', lineHeight: 1.4 }}>
        A lit group silences its channels even with their own MUTE off. DCA group faders live on the BUS layer of the fader bank.
      </div>
    </div>
  );
}

// Scene recall strip (digital surface, Phase 3a). Recalling a scene overwrites
// the channel faders and mutes with that scene's stored snapshot. The wrong
// scene loaded mid-show is a classic digital-desk mistake with no analog
// equivalent; the fix is to recall the right one.
function DigitalScenes({ scenes, currentScene, onRecall, powered }) {
  const list = scenes || [];
  if (!list.length) return null;
  const activeName = (list[currentScene] && list[currentScene].name) || '—';
  return (
    <div style={{
      marginTop: 8, width: '100%', boxSizing: 'border-box',
      background: 'linear-gradient(180deg,#202024 0%, #161619 100%)',
      border: '1px solid #0a0a0c', borderRadius: 6, padding: '8px 14px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      opacity: powered ? 1 : 0.5, filter: powered ? 'none' : 'grayscale(0.75)',
    }}>
      <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>SCENES</div>
      <div style={{ display: 'flex', gap: 5 }}>
        {list.map((sc, i) => (
          <BP key={i} active={currentScene === i} onClick={() => onRecall(i)} label={sc.name || ('SCENE ' + (i + 1))} color="var(--accent)" width={84} height={20} fontSize={8}
            tip={'Recall the ' + (sc.name || ('scene ' + (i + 1))) + ' scene. Recalling overwrites every channel fader and mute with the values stored in that scene. The wrong scene loaded mid-show is the classic digital-desk mistake.'} />
        ))}
      </div>
      <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.5 }}>
        active: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{activeName}</span>
      </div>
    </div>
  );
}

// Input patch view (digital surface, Phase 3b). On a digital desk the routing
// of physical inputs to channels lives in a screen, not on the faders, so a
// channel can be dead with a perfect-looking strip. Each chip shows the channel
// and the input feeding it; an unassigned channel reads UNPATCHED in red.
// Clicking re-patches it to its own input (or unassigns an assigned one).
function DigitalPatch({ channels, inputPatch, onRepatch, powered }) {
  const chs = channels || [];
  if (!chs.length) return null;
  const ip = inputPatch || [];
  return (
    <div style={{
      marginTop: 8, width: '100%', boxSizing: 'border-box',
      background: 'linear-gradient(180deg,#202024 0%, #161619 100%)',
      border: '1px solid #0a0a0c', borderRadius: 6, padding: '8px 14px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      opacity: powered ? 1 : 0.5, filter: powered ? 'none' : 'grayscale(0.75)',
    }}>
      <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>INPUT PATCH</div>
      <div style={{ display: 'flex', gap: 5 }}>
        {chs.map((c, i) => {
          const inNum = ip[i] != null ? ip[i] : (i + 1);
          const assigned = inNum !== 0;
          return (
            <div key={i} onClick={() => onRepatch(i)} className="mono ui-no-select" style={{
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              background: assigned ? '#0e0e10' : 'rgba(255,70,48,0.12)',
              border: '1px solid ' + (assigned ? '#38383e' : 'var(--hot)'), borderRadius: 3,
              padding: '3px 7px', minWidth: 44,
            }}
              title={assigned ? ('Channel ' + (i + 1) + ' is patched to physical input ' + inNum + '. Click to unassign.') : ('Channel ' + (i + 1) + ' has no input assigned, so it stays silent even though the cable is fine. Click to re-patch it.')}>
              <span style={{ fontSize: 8, fontWeight: 800, color: assigned ? 'var(--ink-2)' : 'var(--hot)' }}>CH {c.stereo ? (i + 1) + '/' + (i + 2) : (i + 1)}</span>
              <span style={{ fontSize: 7.5, fontWeight: 700, color: assigned ? 'var(--label)' : 'var(--hot)' }}>{assigned ? ('IN ' + inNum) : '— NONE'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The console's FIXED physical I/O. On a digital desk the inputs and outputs
// live on a back panel / patch, NOT lined up under the faders, so the snake
// lands HERE and the soft INPUT PATCH maps inputs to channels. This decoupling
// is the real-world skill: a digital op reads I/O separately from the soft,
// layer-able fader surface. These jacks hold the cable anchor refs, which frees
// the fader bank to sit at the bottom like a real desk.
function DigitalIORow({ state, setState, channelRefs, masterLRef, masterRRef, aux1Ref, aux2Ref, aux3Ref, aux4Ref }) {
  const fanOut = state.fanOut || [1, 2, 3, 4];
  const snakeColors = window.SNAKE_COLORS || [];
  const ofan = state.outFan || window.DEFAULT_OUT_FAN || {};
  const playbackMode = state.playbackMode || 'music';
  const blue = (window.SOURCES && window.SOURCES.playback ? window.SOURCES.playback.color : '#6aa9ff');
  const chipColorFor = (outKey) => {
    const ch = [1, 2, 3, 4, 5, 6].find(c2 => ofan[c2] === outKey);
    return ch ? (snakeColors[ch - 1] || '#4a4a52') : '#4a4a52';
  };
  const jack = (attachRef, label, sub, color, key) => (
    <div key={key} ref={attachRef} className="ui-no-select" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 48 }}>
      <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #050506)', border: '2px solid ' + color, boxShadow: '0 0 4px ' + color + '88, inset 0 0 2px #000' }} />
      <div className="mono" style={{ fontSize: 6.5, color, letterSpacing: 0.3, fontWeight: 700, lineHeight: 1, background: '#0a0a0c', padding: '2px 4px', border: '1px solid ' + color, borderRadius: 2, whiteSpace: 'nowrap' }}>{label}</div>
      <div className="mono" style={{ fontSize: 5.5, color: 'var(--ink-3)', letterSpacing: 0.3, fontWeight: 700, whiteSpace: 'nowrap' }}>{sub}</div>
    </div>
  );
  const inputs = [];
  for (let i = 0; i < state.channels.length; i++) {
    const srcKey = window.sourceFor ? window.sourceFor(state, i) : null;
    const src = srcKey ? window.SOURCES[srcKey] : null;
    const portIdx = fanOut.findIndex(ch => ch === i + 1);
    const inputPort = portIdx >= 0 ? portIdx + 1 : null;
    const color = srcKey === 'playback' ? (src ? src.color : '#4a4a52') : (inputPort != null ? (snakeColors[inputPort - 1] || '#4a4a52') : '#4a4a52');
    const label = srcKey === 'playback' ? 'LINE IN' : (inputPort != null ? `IN ${inputPort}` : 'IN —');
    inputs.push(jack(el => channelRefs.current[i + 1] = el, label, `→ CH ${i + 1}`, color, 'in-' + i));
  }
  const outputs = [
    jack(masterLRef, 'MAIN L', 'MAIN · L', chipColorFor('mainL'), 'o-l'),
    jack(masterRRef, 'MAIN R', 'MAIN · R', chipColorFor('mainR'), 'o-r'),
    jack(aux1Ref, 'AUX 1', 'WED 1', chipColorFor('aux1'), 'o-1'),
    jack(aux2Ref, 'AUX 2', 'WED 2', chipColorFor('aux2'), 'o-2'),
    jack(aux3Ref, 'AUX 3', 'WED 3', chipColorFor('aux3'), 'o-3'),
    jack(aux4Ref, 'AUX 4', 'WED 4', chipColorFor('aux4'), 'o-4'),
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, padding: '10px 12px 9px', background: 'linear-gradient(180deg,#141417,#0e0e10)', borderBottom: '1px solid #0a0a0c' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>INPUTS · STAGE BOX</div>
        <div style={{ display: 'flex', gap: 7 }}>{inputs}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
        <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>PLAYBACK</div>
        <div style={{ display: 'flex', marginTop: 2 }}>
          {[['music', 'MUSIC'], ['pink', 'PINK']].map(([mode, lbl], i) => {
            const on = playbackMode === mode;
            return (
              <div key={mode} onClick={() => setState && setState(s => ({ ...s, playbackMode: mode }))} className="mono ui-no-select"
                style={{ fontSize: 7, fontWeight: 700, letterSpacing: 0.4, padding: '4px 8px', cursor: 'pointer',
                  color: on ? '#0a0a0c' : 'var(--ink-3)', background: on ? blue : '#0a0a0c',
                  border: '1px solid ' + (on ? blue : '#38383e'), borderRight: i === 0 ? 'none' : ('1px solid ' + (on ? blue : '#38383e')),
                  borderRadius: i === 0 ? '3px 0 0 3px' : '0 3px 3px 0' }}>{lbl}</div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>OUTPUTS</div>
        <div style={{ display: 'flex', gap: 7 }}>{outputs}</div>
      </div>
    </div>
  );
}

// A fader strip on the BUS · DCA layer: an aux master or a DCA group. Same look
// as a channel strip (scribble + fader + meter) but it controls a bus, not a
// channel. The DCA-down fault lives here, so finding it means switching layers,
// the real digital skill.
function DigitalBusStrip({ name, kind, slot, color, value, onChange, level, powered }) {
  return (
    <div style={{
      width: 92, background: 'linear-gradient(180deg,#1e1e22,#151518)',
      border: '1px solid #0a0a0c', borderRadius: 5,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 5, paddingBottom: 8,
      overflow: 'hidden', opacity: powered ? 1 : 0.5, filter: powered ? 'none' : 'grayscale(0.75)',
    }}>
      <div style={{ background: color, padding: '3px 4px 4px' }}>
        <div className="mono" style={{ fontSize: 8.5, fontWeight: 800, color: '#0a0a0c', textAlign: 'center', lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 0 rgba(255,255,255,0.25)' }}>{name}</div>
        <div className="mono" style={{ fontSize: 7, fontWeight: 700, color: 'rgba(0,0,0,0.55)', textAlign: 'center', lineHeight: 1.2 }}>{kind}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 4, padding: '4px 5px 0' }}>
        <F value={value} onChange={onChange} height={140} />
        <M level={level} height={140} segments={18} mkey={'bus:' + slot}/>
      </div>
    </div>
  );
}

// The dedicated MAIN (L/R) strip. Always visible on the right of the fader bank,
// regardless of layer, like the main fader on a real desk.
function DigitalMainStrip({ master, onChange, onInspect, paLevel, paRLevel, powered }) {
  return (
    <div style={{
      width: 108, background: 'linear-gradient(180deg,#2a2a30,#1c1c20)',
      border: '1px solid #0a0a0c', borderRadius: 5,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 6, paddingBottom: 8,
      overflow: 'hidden', opacity: powered ? 1 : 0.5, filter: powered ? 'none' : 'grayscale(0.75)',
    }}>
      <div style={{ background: 'var(--accent)', padding: '3px 4px 4px' }}>
        <div className="mono" style={{ fontSize: 9, fontWeight: 800, color: '#0a0a0c', textAlign: 'center', lineHeight: 1.05 }}>MAIN</div>
        <div className="mono" style={{ fontSize: 7, fontWeight: 700, color: 'rgba(0,0,0,0.55)', textAlign: 'center', lineHeight: 1.2 }}>L / R</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '2px 6px 0' }}>
        <BP active={master.mute} onClick={() => onChange({ ...master, mute: !master.mute })} label="MUTE" color="var(--hot)" width={90} height={16} fontSize={8}
          tip="Mute the main mix. The whole audience goes quiet." />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          <F value={master.fader} onChange={(v) => { onChange({ ...master, fader: v }); if (onInspect) onInspect('pa'); }} height={148} />
          <div style={{ display: 'flex', gap: 2 }}>
            <M level={paLevel} height={148} segments={19} />
            <M level={paRLevel} height={148} segments={19} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DigitalConsole({ state, setState, audio, faultChannelIdx, channelRefs, masterLRef, masterRRef, aux1Ref, aux2Ref, aux3Ref, aux4Ref }) {
  const [selected, setSelected] = useState(0);
  const [screenView, setScreenView] = useState('channel'); // channel | groups | scenes | patch
  const [faderLayer, setFaderLayer] = useState('inputs');  // inputs | buses

  const updateChannel = (i, ch) => setState(prev => {
    const channels = [...prev.channels];
    channels[i] = ch;
    return { ...prev, channels };
  });
  const updateMaster = (m) => setState(prev => ({ ...prev, master: m }));
  const inspectTo = (dest) => setState(prev => prev.inspect === dest ? prev : { ...prev, inspect: dest });

  // Identical phantom-pop safety logic to the analog Console — turning +48V on
  // over a live channel still pops the speakers, on either surface.
  const togglePhantom = (i) => {
    setState(prev => {
      const ch = prev.channels[i];
      if (!ch) return prev;
      const turningOn = !ch.phantom;
      const channels = prev.channels.map((c, j) => j === i ? { ...c, phantom: !c.phantom } : c);
      const next = { ...prev, channels };
      const mixerOnNow = prev.mixer ? prev.mixer.on !== false : true;
      if (turningOn && mixerOnNow) {
        if (ch.solo) {
          next.phantomPop = { channel: i, at: Date.now(), cause: 'phantom_cans' };
        } else if (window.wouldPopPhantom && window.wouldPopPhantom(prev, i)) {
          next.phantomPop = { channel: i, at: Date.now() };
        }
      }
      return next;
    });
  };

  const updateMuteGroup = (gi) => setState(prev => {
    const mg = (prev.muteGroups || []).map((g, j) => j === gi ? { ...g, active: !g.active } : g);
    return { ...prev, muteGroups: mg };
  });
  const updateDca = (di, v) => setState(prev => {
    const dcas = (prev.dcas || []).map((d, j) => j === di ? { ...d, fader: v } : d);
    return { ...prev, dcas };
  });
  const recallScene = (i) => setState(prev => {
    const scenes = prev.scenes || [];
    const sc = scenes[i];
    let channels = prev.channels;
    if (sc && sc.snapshot && Array.isArray(sc.snapshot.channels)) {
      channels = prev.channels.map((c, j) => {
        const snap = sc.snapshot.channels[j];
        return snap ? { ...c, fader: snap.fader != null ? snap.fader : c.fader, mute: snap.mute != null ? snap.mute : c.mute } : c;
      });
    }
    return { ...prev, channels, currentScene: i };
  });
  const repatch = (ci) => setState(prev => {
    const ip = (prev.inputPatch || [1, 2, 3, 4, 5]).slice();
    // Extend to every channel before writing. The factory patch is only as
    // long as the 8-channel list, so on the 16-channel desk ip[ci] would land
    // past the end and leave holes for every position in between.
    for (let k = 0; k < ip.length; k++) if (ip[k] == null) ip[k] = k + 1;
    while (ip.length < (prev.channels || []).length) ip.push(ip.length + 1);
    ip[ci] = (ip[ci] === 0) ? (ci + 1) : 0; // re-patch to its own input, or unassign
    return { ...prev, inputPatch: ip };
  });

  const mixerOn = state.mixer ? state.mixer.on !== false : true;
  // PFL/Solo monitors the PRE-FADER input, so a soloed channel meters its input
  // level: you can PFL a channel to check it with its fader still down and the
  // meter shows signal, the way a real console does. Otherwise the strip meter
  // shows the post-fader contribution to the mix.
  const channelLevels = state.channels.map((ch, i) =>
    !mixerOn ? 0 : (ch.solo ? (audio.chanIn[i] || 0) : (audio.post[i] || 0)));
  const pflLevels = audio.chanIn.map(v => mixerOn ? v : 0);
  const main = audio.mainBus || { L: 0, R: 0 };
  const masterL = main.L || 0;
  const masterR = main.R || 0;
  const groupMutedArr = state.channels.map((ch, i) => (state.muteGroups || []).some(g => g.active && (g.members || []).indexOf(i) !== -1));

  const sel = Math.min(Math.max(0, selected), Math.max(0, state.channels.length - 1));
  const selCh = state.channels[sel];
  const selSrcKey = audio.chanInSource[sel];
  const selSrcLabel = selSrcKey ? window.SOURCES[selSrcKey] : null;

  const onPowerToggle = () => {
    setState(prev => {
      const wasOn = prev.mixer ? prev.mixer.on !== false : true;
      const turningOn = !wasOn;
      const next = { ...prev, mixer: { ...(prev.mixer || {}), on: !wasOn } };
      if (turningOn && window.wouldPopOnMixerOn && window.wouldPopOnMixerOn(prev)) {
        next.phantomPop = { at: Date.now(), cause: 'mixer_pop' };
      } else if (!turningOn && window.wouldPopOnMixerOn && window.wouldPopOnMixerOn(prev)) {
        next.phantomPop = { at: Date.now(), cause: 'mixer_off_pop' };
      }
      return next;
    });
  };

  // Selecting a channel brings up its channel view (sel-follows-screen), the way
  // a digital desk does. Grabbing a fader selects quietly (no view jump).
  const selectChannel = (i) => { setSelected(i); setScreenView('channel'); };

  // BUS · DCA fader layer: the aux send masters and the DCA group faders. These
  // are NOT input channels, so they live on their own layer (real-desk
  // behavior), reached by switching the fader bank away from the inputs. The
  // DCA-down fault lives here, so finding it means knowing to switch layers.
  const busLevel = (members) => {
    if (!mixerOn) return 0;
    const vals = (members || []).map(m => (audio.post[m] || 0) * 1.2);
    return vals.length ? Math.max(...vals) : 0;
  };
  const busStrips = [
    { name: 'AUX 1', kind: 'WEDGE 1', slot: 0, color: '#46d6b0', value: state.master.aux1 != null ? state.master.aux1 : 0.75, onChange: (v) => updateMaster({ ...state.master, aux1: v }), level: mixerOn && audio.auxBus ? (audio.auxBus.wedge || 0) : 0 },
    { name: 'AUX 2', kind: 'WEDGE 2', slot: 1, color: '#6aa9ff', value: state.master.aux2 != null ? state.master.aux2 : 0.75, onChange: (v) => updateMaster({ ...state.master, aux2: v }), level: mixerOn && audio.auxBus ? (audio.auxBus.wedge2 || 0) : 0 },
    // Only the 16-channel desk drives AUX 3/4 (WEDGE 3/4). On the 8-channel
    // board they are spares with no wedge behind them, so they are not shown.
    ...(state.big16 ? [
      { name: 'AUX 3', kind: 'WEDGE 3', slot: 2, color: 'var(--green)', value: state.master.aux3 != null ? state.master.aux3 : 0.75, onChange: (v) => updateMaster({ ...state.master, aux3: v }), level: mixerOn && audio.auxBus ? (audio.auxBus.wedge3 || 0) : 0 },
      { name: 'AUX 4', kind: 'WEDGE 4', slot: 3, color: 'var(--amber)', value: state.master.aux4 != null ? state.master.aux4 : 0.75, onChange: (v) => updateMaster({ ...state.master, aux4: v }), level: mixerOn && audio.auxBus ? (audio.auxBus.wedge4 || 0) : 0 },
    ] : []),
    ...(state.dcas || []).map((d, di) => ({ name: 'DCA ' + (d.name || (di + 1)), kind: 'GROUP', slot: 4 + di, color: di === 0 ? '#ffc93a' : '#c9a0ff', value: d.fader != null ? d.fader : 0.75, onChange: (v) => updateDca(di, v), level: busLevel(d.members) })),
  ];

  const TABS = [['channel', 'CHANNEL'], ['groups', 'GROUPS'], ['scenes', 'SCENES'], ['patch', 'PATCH']];
  const viewBtn = (id, label, activeBg, list, set) => {
    const on = list === id;
    return (
      <button key={id} onClick={() => set(id)} className="mono ui-no-select" style={{
        padding: '4px 12px', fontSize: 8.5, fontWeight: 800, letterSpacing: 0.8, cursor: 'pointer',
        color: on ? '#0a0a0c' : 'var(--ink-2)', background: on ? activeBg : '#16161a',
        border: '1px solid ' + (on ? activeBg : '#38383e'), borderRadius: 4,
      }}>{label}</button>
    );
  };

  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch',
      background: 'linear-gradient(180deg,#202024 0%, #151518 100%)',
      border: '1px solid #0a0a0c', borderRadius: 8,
      boxShadow: 'inset 0 1px 0 #45454d, 0 4px 20px rgba(0,0,0,0.5)', overflow: 'hidden',
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid #0a0a0c', background: 'linear-gradient(180deg,#2a2a30,#1f1f24)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: mixerOn ? 'var(--accent)' : '#3a1a1a', boxShadow: mixerOn ? '0 0 6px var(--accent)' : 'inset 0 0 0 1px rgba(90,32,24,0.6)', transition: 'background 0.15s, box-shadow 0.15s' }} />
        <div className="display" style={{ fontSize: 11, color: mixerOn ? 'var(--ink-2)' : '#5a2018', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>AU · DX-{consoleInputs(state)}</div>
        <span data-walk="mixer-power" style={{ display: 'inline-flex' }}><PowerButton on={mixerOn} width={32} height={13} onClick={onPowerToggle} /></span>
        <div className="mono" style={{ marginLeft: 'auto', fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 2, fontWeight: 700 }}>DIGITAL MIXING CONSOLE</div>
      </div>

      {/* I/O ROW — fixed physical inputs/outputs; the snake lands here. */}
      <DigitalIORow state={state} setState={setState} channelRefs={channelRefs} masterLRef={masterLRef} masterRRef={masterRRef} aux1Ref={aux1Ref} aux2Ref={aux2Ref} aux3Ref={aux3Ref} aux4Ref={aux4Ref} />

      <div style={{ padding: '8px 10px 10px' }}>
        {/* SCREEN — one view at a time, switched by the view tabs. Real desks do
            not stack every menu; you pick a view (channel, groups, scenes,
            routing). This is the space fix. */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
          {TABS.map(([id, label]) => viewBtn(id, label, 'var(--accent)', screenView, setScreenView))}
          <div className="mono" style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>SCREEN</div>
        </div>
        <div style={{ minHeight: 138 }}>
          {screenView === 'channel' && selCh && (
            <DigitalChannelEditor ch={selCh} idx={sel} srcLabel={selSrcLabel} pflLevel={pflLevels[sel]} big16={state.big16}
              onChange={(c) => updateChannel(sel, c)} onPhantomToggle={() => togglePhantom(sel)} onInspect={inspectTo}
              powered={mixerOn} muteGroups={state.muteGroups} dcas={state.dcas} />
          )}
          {screenView === 'groups' && <DigitalGroups muteGroups={state.muteGroups} onToggleMute={updateMuteGroup} powered={mixerOn} />}
          {screenView === 'scenes' && <DigitalScenes scenes={state.scenes} currentScene={state.currentScene || 0} onRecall={recallScene} powered={mixerOn} />}
          {screenView === 'patch' && <DigitalPatch channels={state.channels} inputPatch={state.inputPatch} onRepatch={repatch} powered={mixerOn} />}
        </div>

        {/* FADER BANK — layer-able control surface at the bottom. LAYER buttons
            swap the strips between the input channels and the bus/DCA masters;
            the MAIN strip is always present. */}
        <div style={{ marginTop: 8, padding: '8px 8px 6px', background: 'linear-gradient(180deg,#26262c,#1a1a1f)', border: '1px solid #0a0a0c', borderRadius: 6, boxShadow: 'inset 0 1px 0 #3a3a40' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>LAYER</div>
            {viewBtn('inputs', 'CH 1-' + state.channels.length, 'var(--cool)', faderLayer, setFaderLayer)}
            {viewBtn('buses', 'BUS · DCA', 'var(--cool)', faderLayer, setFaderLayer)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'flex-start' }}>
            {faderLayer === 'inputs'
              ? state.channels.map((ch, i) => {
                  const srcKey = audio.chanInSource[i];
                  const srcLabel = srcKey ? window.SOURCES[srcKey] : null;
                  return (
                    <DigitalSelStrip key={i} ch={ch} idx={i} selected={sel}
                      onSelect={selectChannel} onSelectQuiet={setSelected}
                      onMute={() => updateChannel(i, { ...ch, mute: !ch.mute })}
                      onSolo={() => updateChannel(i, { ...ch, solo: !ch.solo })}
                      onFader={(v) => { updateChannel(i, { ...ch, fader: v }); inspectTo('pa'); }}
                      level={channelLevels[i]} isFaultStrip={faultChannelIdx === i} srcLabel={srcLabel}
                      powered={mixerOn} groupMuted={groupMutedArr[i]} />
                  );
                })
              : busStrips.map((b, i) => (
                  <DigitalBusStrip key={i} name={b.name} kind={b.kind} slot={b.slot} color={b.color} value={b.value} onChange={b.onChange} level={b.level} powered={mixerOn} />
                ))}
            <div style={{ width: 1, alignSelf: 'stretch', background: '#0a0a0c', boxShadow: '1px 0 0 #3a3a40' }} />
            <DigitalMainStrip master={state.master} onChange={updateMaster} onInspect={inspectTo} paLevel={masterL} paRLevel={masterR} powered={mixerOn} />
          </div>
        </div>
      </div>
    </div>
  );
}

window.DigitalConsole = DigitalConsole;
