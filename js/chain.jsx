const { useState: useS2, useRef: useR2, useEffect: useE2 } = React;

// Responsive breakpoint — below this we collapse the sidebar+stage row into
// a single vertical column so phone/tablet viewports don't horizontally
// squeeze the stage or mixer.
const MOBILE_BREAKPOINT = 1024;
function useViewport() {
  const [isMobile, setIsMobile] = useS2(typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false);
  useE2(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

// Uniform scale-to-fit. Measures the available box (the scroll container) and
// returns the factor that fits a fixed designW x designH board inside it.
// min(width-ratio, height-ratio) so it always fits both axes; clamped so it
// never shrinks below 0.45 or grows past 3.0. The high upper bound lets the
// board fill big monitors and fullscreen (a 4K screen fills width at ~2.46);
// past ~4680px wide it stops growing so controls don't get absurd. A
// ResizeObserver on the viewport catches window resizes, TopBar reflow, and
// OS/browser zoom alike.
function useFitScale(viewportRef, designW, designH, enabled) {
  const [scale, setScale] = useS2(1);
  useE2(() => {
    const el = viewportRef.current;
    if (!enabled || !el || !designW || !designH) return;
    const recompute = () => {
      // Measure the BORDER box (offset*), not the content box (client*): when the
      // user zooms in, this same viewport becomes overflow:auto and a scrollbar
      // appears, which shrinks clientWidth/Height by the scrollbar width. Feeding
      // that back into the fit scale toggled the scrollbar on/off and made the whole
      // board vibrate (only when zoomed, and worst inside a fixed-height iframe).
      // offsetWidth/Height ignore the scrollbar, so the fit stays stable. The
      // hysteresis guard drops sub-pixel churn as a second line of defense.
      const availW = el.offsetWidth, availH = el.offsetHeight;
      if (!availW || !availH) return;
      const raw = Math.min(availW / designW, availH / designH);
      const next = Math.max(0.45, Math.min(3, raw));
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener('resize', recompute);
    return () => { ro.disconnect(); window.removeEventListener('resize', recompute); };
  }, [viewportRef, designW, designH, enabled]);
  return scale;
}

// Dynamic handheld vocal mic — Shure SM58 silhouette: big spherical ball
// grille on a tapered body. The default live vocal mic.
function MicSm58Icon({ size = 60, glow = false }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 60 75">
      <defs>
        <radialGradient id="sm58-ball" cx="40%" cy="32%" r="72%">
          <stop offset="0" stopColor="#54545c"/><stop offset="0.55" stopColor="#2e2e34"/><stop offset="1" stopColor="#141417"/>
        </radialGradient>
        <linearGradient id="sm58-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a3a40"/><stop offset="0.5" stopColor="#6a6a72"/><stop offset="1" stopColor="#2a2a2e"/>
        </linearGradient>
        <clipPath id="sm58-ball-clip"><circle cx="30" cy="20" r="17"/></clipPath>
      </defs>
      {/* tapered shoulder + handle behind the ball */}
      <polygon points="22,33 38,33 36,46 24,46" fill="url(#sm58-body)" stroke="#0a0a0c" strokeWidth="1"/>
      <rect x="23" y="44" width="14" height="24" rx="2" fill="url(#sm58-body)" stroke="#0a0a0c" strokeWidth="1"/>
      {/* the iconic round ball grille */}
      <circle cx="30" cy="20" r="17" fill="url(#sm58-ball)" stroke="#0a0a0c" strokeWidth="1.4"/>
      <g clipPath="url(#sm58-ball-clip)" stroke="#0a0a0c" strokeWidth="0.9" opacity="0.55">
        {[8, 12, 16, 20, 24, 28, 32].map(y => <line key={y} x1="12" y1={y} x2="48" y2={y}/>)}
      </g>
      <circle cx="30" cy="52" r="2.4" fill={glow ? '#ff4630' : '#220a08'} style={{ filter: glow ? 'drop-shadow(0 0 4px #ff4630)' : 'none' }}/>
      <rect x="24" y="68" width="12" height="6" fill="#1a1a1d" stroke="#0a0a0c"/>
    </svg>
  );
}
// Handheld condenser vocal mic — elongated cylindrical capsule grille (KSM9 /
// Beta 87 family), sleeker than the SM58 ball. The one that needs +48V.
function MicCondenserIcon({ size = 60, glow = false }) {
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 60 75">
      <defs>
        <linearGradient id="cond-grille" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#16161a"/><stop offset="0.5" stopColor="#4a4a52"/><stop offset="1" stopColor="#16161a"/>
        </linearGradient>
        <linearGradient id="cond-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a3a40"/><stop offset="0.5" stopColor="#6a6a72"/><stop offset="1" stopColor="#2a2a2e"/>
        </linearGradient>
        <clipPath id="cond-grille-clip"><rect x="19" y="5" width="22" height="40" rx="11"/></clipPath>
      </defs>
      {/* handle / body */}
      <rect x="22" y="40" width="16" height="28" rx="2" fill="url(#cond-body)" stroke="#0a0a0c" strokeWidth="1"/>
      {/* collar where the grille meets the handle */}
      <rect x="21" y="41" width="18" height="4" fill="#1a1a1d" stroke="#0a0a0c" strokeWidth="0.8"/>
      {/* elongated cylindrical condenser grille */}
      <rect x="19" y="5" width="22" height="40" rx="11" fill="url(#cond-grille)" stroke="#0a0a0c" strokeWidth="1.3"/>
      <g clipPath="url(#cond-grille-clip)" stroke="#0a0a0c" strokeWidth="0.9" opacity="0.5">
        {[12, 18, 24, 30, 36].map(y => <line key={y} x1="17" y1={y} x2="43" y2={y}/>)}
      </g>
      <circle cx="30" cy="53" r="2.4" fill={glow ? '#ff4630' : '#220a08'} style={{ filter: glow ? 'drop-shadow(0 0 4px #ff4630)' : 'none' }}/>
      <rect x="24" y="68" width="12" height="6" fill="#1a1a1d" stroke="#0a0a0c"/>
    </svg>
  );
}
function DIBoxIcon({ size = 50, glow = false }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 70 64">
      <defs><linearGradient id="di-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a5a62"/><stop offset="1" stopColor="#26262a"/></linearGradient></defs>
      <rect x="6" y="6" width="58" height="48" rx="3" fill="url(#di-body)" stroke="#0a0a0c"/>
      <rect x="10" y="10" width="50" height="20" fill="#16161a" stroke="#38383e"/>
      <text x="35" y="24" textAnchor="middle" fontFamily="Geist Mono" fontSize="9" fill="#ffc93a" fontWeight="700">DI BOX</text>
      <circle cx="18" cy="42" r="4" fill={glow ? '#4ade80' : '#1a2a1d'} style={{ filter: glow ? 'drop-shadow(0 0 4px #4ade80)' : 'none' }}/>
      <circle cx="35" cy="42" r="3" fill="#0a0a0c" stroke="#38383e"/>
      <circle cx="50" cy="42" r="3" fill="#0a0a0c" stroke="#38383e"/>
      <rect x="26" y="54" width="18" height="6" fill="#1a1a1d" stroke="#0a0a0c"/>
    </svg>
  );
}
function LaptopIcon({ size = 60, glow = false }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 100 70">
      <defs><linearGradient id="lap-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2a2e"/><stop offset="1" stopColor="#0e0e10"/></linearGradient></defs>
      <rect x="12" y="4" width="76" height="48" rx="3" fill="#1a1a1d" stroke="#0a0a0c"/>
      <rect x="15" y="7" width="70" height="42" fill="url(#lap-screen)"/>
      <g opacity={glow ? 1 : 0.4}>
        {[14, 18, 22, 24, 22, 18, 14, 10, 14, 18, 22, 26, 22, 18].map((h, i) => (
          <rect key={i} x={18 + i * 5} y={28 - h/2} width="3" height={h} fill={glow ? '#4ade80' : '#38383e'}/>
        ))}
      </g>
      <text x="50" y="46" textAnchor="middle" fontFamily="Geist Mono" fontSize="6" fill="#a5a29a">PLAYBACK.WAV</text>
      <path d="M 4 52 L 96 52 L 92 64 L 8 64 Z" fill="#3a3a40" stroke="#0a0a0c"/>
      <rect x="42" y="55" width="16" height="2" rx="1" fill="#1a1a1d"/>
    </svg>
  );
}

function SourceCard({ srcKey, label, kind, diActive, muted, isTesting, onTest, onMute, onPatch, patchTarget, patchColor, signalFlowing, onOpenPlacement, compact }) {
  // Compact = the clustered drum mics on the 16-channel stage: a small tile
  // (icon + short label + patch chip), no type sub-label or placement button, so
  // six of them pack into the kit cluster without crowding the stage.
  const iconSz = compact ? 20 : 28;
  return (
    <div
      data-walk={'src-' + srcKey}
      /* Source TYPE, so hovering "condenser microphone" in the definitions
         panel can light up the condensers only. `data-walk` is one shared
         `src-` key with no type in it, which would ring every card. */
      data-srckind={kind === 'di' ? (diActive ? 'di-active' : 'di-passive') : kind}
      onClick={onTest}
      className="ui-no-select"
      style={{
        background: isTesting ? 'linear-gradient(180deg,#2c2c30 0%, #1f1f23 100%)' : 'linear-gradient(180deg,#1c1c1f 0%, #141417 100%)',
        border: isTesting ? '1px solid var(--accent)' : '1px solid #2a2a2e',
        borderRadius: 6,
        padding: compact ? '4px 5px' : '6px 8px',
        display: 'flex', gap: compact ? 5 : 8, alignItems: 'center',
        cursor: 'pointer',
        boxShadow: isTesting ? '0 0 0 2px rgba(255,201,58,0.2)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ width: compact ? 24 : 42, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
        {kind === 'dynamic' && <MicSm58Icon size={iconSz} glow={signalFlowing}/>}
        {kind === 'condenser' && <MicCondenserIcon size={iconSz} glow={signalFlowing}/>}
        {kind === 'di' && <DIBoxIcon size={compact ? 24 : 34} glow={signalFlowing}/>}
        {kind === 'line' && <LaptopIcon size={compact ? 28 : 42} glow={signalFlowing}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div className="display" style={{ fontSize: compact ? 10 : 12, fontWeight: 700, color: isTesting ? 'var(--accent)' : 'var(--ink)', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
          {isTesting && !compact && <div className="mono" style={{ fontSize: 7.5, color: 'var(--accent)', letterSpacing: 0.5, fontWeight: 700 }}>◉ TEST</div>}
        </div>
        {!compact && (
        <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 1 }}>
          {kind === 'condenser' ? 'Condenser · +48V' : kind === 'dynamic' ? 'Dynamic' : kind === 'di' ? (diActive ? 'Active DI · +48V' : 'Passive DI') : 'Line level'}
        </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: compact ? 2 : 4 }}>
          <div
            onClick={(e) => { e.stopPropagation(); onPatch(); }}
            className="mono ui-no-select"
            style={{
              fontSize: 8, padding: '2px 6px',
              background: '#0a0a0c',
              color: patchTarget ? patchColor : 'var(--ink-3)',
              border: '1px solid #38383e',
              borderRadius: 2, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5,
            }}
          >{patchTarget ? `→ PORT ${patchTarget}` : 'PATCH'}</div>
          {/* Placement (aiming the mic to fight feedback) only drives the feedback
              loop, so it's shown only on mics that can actually feed back — vocals
              and drum overheads. On a close mic like the guitar amp mic it would do
              nothing, so it's hidden. */}
          {!compact && onOpenPlacement && SOURCES[srcKey] && SOURCES[srcKey].canFeedback && (
            <div data-walk={'placement-' + srcKey} onClick={(e) => { e.stopPropagation(); onOpenPlacement(srcKey); }} className="mono ui-no-select"
              style={{ fontSize: 8, padding: '2px 6px', background: '#0a0a0c', color: 'var(--accent)', border: '1px solid #38383e', borderRadius: 2, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>PLACEMENT</div>
          )}
          {/* Mute the source's sound only. The mic stays open, so the channel can
              still feed back and placement still matters — like an open mic on a
              stage with no one singing into it. */}
          {!compact && onMute && (
            <div onClick={(e) => { e.stopPropagation(); onMute(); }} className="mono ui-no-select"
              title="Mute this source's sound. The mic stays open, so it can still feed back."
              style={{ fontSize: 8, padding: '2px 6px', background: muted ? 'rgba(216,71,63,0.18)' : '#0a0a0c', color: muted ? '#ff6a5e' : 'var(--ink-3)', border: '1px solid ' + (muted ? '#a8322b' : '#38383e'), borderRadius: 2, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}>{muted ? 'MUTED' : 'MUTE'}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Power button — used by PA speakers, wedges, and the power amp. A real
// power switch tells you at a glance whether the rig is on; the old 5px
// LED did not. Green glowing pill = ON; dark red-bordered pill with bold
// OFF label = OFF. Power icon (⏻) is universally recognizable. Click to
// toggle.
function PowerButton({ on, onClick, width = 30, height = 14 }) {
  const stop = (e) => { e.stopPropagation(); onClick && onClick(); };
  return (
    <div onClick={stop} className="ui-no-select toggle"
      style={{
        width, height, borderRadius: 3,
        background: on
          ? 'linear-gradient(180deg, #34a85b 0%, #1e7240 100%)'
          : 'linear-gradient(180deg, #2a1414 0%, #170a0a 100%)',
        border: '1px solid ' + (on ? '#2c9d52' : '#5a2018'),
        boxShadow: on
          ? '0 0 5px rgba(74,222,128,0.55), inset 0 1px 0 rgba(255,255,255,0.18)'
          : 'inset 0 1px 0 rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
        cursor: 'pointer',
      }}>
      <svg width={height - 4} height={height - 4} viewBox="0 0 10 10" style={{ flexShrink: 0 }}>
        <path d="M 5 1.4 L 5 5"
          stroke={on ? '#fff' : '#ff8676'} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
        <path d="M 2.4 4 A 3.2 3.2 0 1 0 7.6 4"
          stroke={on ? '#fff' : '#ff8676'} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
      </svg>
      <span className="mono" style={{
        fontSize: Math.max(6.5, height - 7), fontWeight: 800, letterSpacing: 0.6,
        color: on ? '#fff' : '#ff8676',
      }}>{on ? 'ON' : 'OFF'}</span>
    </div>
  );
}

function PASpeaker({ side, on, mute, volume, level, signalArriving, onTogglePower, onToggleMute, onVolume, isInspected, onSelect, showPower = true, marginInfo }) {
  const animate = on && !mute && level > 0.05;
  const intensity = Math.min(1, level);
  // signalArriving is what a real powered speaker's "SIG" LED shows: signal
  // is reaching the input regardless of where this speaker's volume knob is
  // set. The volume knob sets room loudness; the LED is "the console is
  // sending me something." Lit only when the speaker has power.
  const sigLit = !!(on && signalArriving);
  // Off state is now unmistakable: dim + desaturate the cabinet, swap the
  // border to a red accent, replace the tiny on/off LED with a proper
  // power button, and overlay a bold "OFF" badge across the speaker cone.
  const borderColor = isInspected ? 'var(--accent)' : (on ? '#0a0a0c' : '#5a2018');
  return (
    <div className="ui-no-select" style={{
      width: 64,
      background: on
        ? 'linear-gradient(180deg,#2a2a2e 0%, #16161a 100%)'
        : 'linear-gradient(180deg,#1c1418 0%, #100a0c 100%)',
      border: '1px solid ' + borderColor,
      borderRadius: 5,
      padding: '4px 3px 5px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      boxShadow: isInspected ? '0 0 0 1px rgba(255,201,58,0.4)' : (on ? 'none' : 'inset 0 0 0 1px rgba(90,32,24,0.4)'),
      position: 'relative',
    }}>
      <div className="mono" style={{
        fontSize: 7, letterSpacing: 1.5, fontWeight: 700,
        color: on ? 'var(--ink-3)' : '#ff8676',
      }}>MAIN · {side}</div>
      {/* Unlike a wedge, whose level you actively ride toward the limit, the mains
          loop is set once by where the mics stand. A permanent "+12+" on every
          lesson is clutter, so this only appears once there is something to say. */}
      {on && marginInfo && marginInfo.db < 12 && (
        <div className="mono" title="How much louder the main mix can get before an open mic feeds back into it. Set by where the mics sit relative to the speakers. Pros leave about 6 dB."
          style={{ fontSize: 7, fontWeight: 800, letterSpacing: 0.3, whiteSpace: 'nowrap', marginTop: -1,
            color: marginInfo.status === 'ok' ? 'var(--green)' : marginInfo.status === 'low' ? 'var(--accent)' : 'var(--hot)' }}>
          {marginInfo.db < 0 ? 'FEEDING BACK' : (marginInfo.db >= 12 ? '+12+' : '+' + marginInfo.db.toFixed(0)) + ' dB to F/B'}
        </div>
      )}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 35%, #4a4a52 0%, #1a1a1d 60%, #0a0a0c 100%)',
        border: '2px solid #0a0a0c',
        boxShadow: animate ? `0 0 ${10 + 14 * intensity}px rgba(255,201,58,${0.15 + intensity * 0.4})` : 'none',
        position: 'relative',
        opacity: on ? 1 : 0.45,
        filter: on ? 'none' : 'grayscale(0.85)',
      }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 12, height: 12, borderRadius: '50%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle at 35% 30%, #5a5a62, #1a1a1d)', border: '1.5px solid #0a0a0c' }}/>
        {animate && <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: `1px solid rgba(255,201,58,${0.18 * intensity})`, animation: 'pulse 1.2s ease-out infinite' }}/>}
      </div>
      {/* Click-to-listen indicator. A powered speaker has an input-signal LED:
          signal is reaching the speaker independent of where the volume knob
          is set. Click to inspect (route audio to this destination). */}
      <div onClick={onSelect} data-nodrag="1" className="ui-no-select" style={{
        cursor: 'pointer',
        padding: '2px 6px', borderRadius: 3,
        background: isInspected ? 'rgba(255,201,58,0.15)' : 'transparent',
        opacity: on ? 1 : 0.5,
        display: 'flex', alignItems: 'center', gap: 4,
        width: 50, justifyContent: 'center',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: sigLit ? 'var(--green)' : '#2a2a2e',
          boxShadow: sigLit ? '0 0 4px var(--green)' : 'none',
          flexShrink: 0,
        }}/>
        <div className="mono" style={{ fontSize: 7, letterSpacing: 1, fontWeight: 700, color: sigLit ? 'var(--green)' : 'var(--ink-3)' }}>
          {sigLit ? 'SIG' : '—'}
        </div>
      </div>
      {showPower
        ? <PowerButton on={on} onClick={onTogglePower} width={50} height={14}/>
        : <div className="mono" style={{ fontSize: 6.5, letterSpacing: 1, fontWeight: 700, color: 'var(--ink-3)', padding: '2px 0' }}>PASSIVE</div>}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, width: '100%', opacity: on ? 1 : 0.55 }}>
        <window.Knob value={volume} onChange={onVolume} size={18} color="var(--accent)"/>
        <window.ButtonPad active={mute} onClick={(e) => { e.stopPropagation(); onToggleMute(); }} label="M" color="var(--hot)" width={14} height={14} fontSize={8}/>
      </div>
    </div>
  );
}

// One band of the monitor graphic EQ. value = fader position, bidirectional:
// 0 flat, +1 full boost (up), -1 full cut (down). The handle rests at centre
// (0 dB) and moves up to boost or down to cut. When this band is the one
// ringing it glows red, and pushing a band UP toward its resonance drives it
// into feedback faster — a real diagnostic trick for finding the ring.
function EqBand({ value, onChange, label, ringing, accent, height = 96, width = 22, vertical }) {
  const ref = React.useRef(null);
  const startRef = React.useRef(null);
  const fitScale = React.useContext(window.FitScaleContext) || 1;
  const g = Math.max(-1, Math.min(1, value || 0));
  const onDown = (e) => { e.preventDefault(); e.stopPropagation(); try { ref.current.setPointerCapture(e.pointerId); } catch(_){} startRef.current = { y: e.clientY, v: g }; };
  const onMove = (e) => { if (!startRef.current) return; const dy = (e.clientY - startRef.current.y) / (fitScale || 1); let v = startRef.current.v - (dy / height) * 2; v = Math.max(-1, Math.min(1, v)); onChange(v); };
  const onUp = (e) => { startRef.current = null; try { ref.current.releasePointerCapture(e.pointerId); } catch(_){} };
  const travel = height - 8;
  const centerY = travel / 2;
  const handleY = (1 - g) / 2 * travel;   // g=+1 -> top, g=-1 -> bottom, 0 -> centre
  const boosting = g > 0.02, cutting = g < -0.02;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div ref={ref} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} className="ui-no-select"
        style={{ width, height, position: 'relative', cursor: 'ns-resize' }}>
        {/* track */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 3, transform: 'translateX(-50%)', background: '#0a0a0c', border: '1px solid ' + (ringing ? 'var(--hot)' : '#2a2a2e'), borderRadius: 2, boxShadow: ringing ? '0 0 8px rgba(255,70,48,0.7)' : 'none' }}/>
        {/* 0 dB centre tick */}
        <div style={{ position: 'absolute', left: '50%', top: centerY + 3.5, width: width + 4, height: 1, transform: 'translateX(-50%)', background: '#4a4a52' }}/>
        {/* fill from centre to the handle: green up (boost), red down (cut) */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: (boosting ? handleY : centerY) + 4, height: Math.abs(handleY - centerY),
          background: boosting ? 'rgba(74,222,128,0.16)' : cutting ? 'rgba(255,70,48,0.12)' : 'transparent', borderRadius: 2 }}/>
        {/* handle — holder keeps the centering transform; the pulse keyframes
            set their own transform, and a CSS animation overrides inline
            styles, so the animation must live on a child with no positioning
            transform — otherwise the ringing grip jumps half a handle-width
            off its track and flashes in the gap (seen 2026-10-18). */}
        <div style={{ position: 'absolute', left: '50%', top: handleY, transform: 'translateX(-50%)', width: width, height: 8 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 2,
            background: ringing ? 'var(--hot)' : accent, border: '1px solid ' + (ringing ? '#b8341f' : '#0a0a0c'),
            boxShadow: ringing ? '0 0 8px rgba(255,70,48,0.8)' : '0 1px 2px rgba(0,0,0,0.5)', animation: ringing ? 'pulse 0.9s ease-in-out infinite' : 'none' }}/>
        </div>
      </div>
      {vertical
        ? <div className="mono" style={{ fontSize: 7, lineHeight: 1, fontWeight: 700, color: ringing ? 'var(--hot)' : 'var(--ink-2)', writingMode: 'vertical-rl', height: 26, letterSpacing: 0.5 }}>{label}</div>
        : <div className="mono" style={{ fontSize: 8, lineHeight: 1, fontWeight: 700, color: ringing ? 'var(--hot)' : 'var(--ink-2)' }}>{label}</div>}
    </div>
  );
}

function EqStrip({ eq, onChange, ringBands, accent, height, width }) {
  // 25 entries = the full ISO third-octave EQ (63 Hz .. 16 kHz, Feedback
  // Mode): narrow sliders, vertical labels, like the face of a real 25-band
  // graphic. 5 entries = the simpler Essentials EQ. Any number can ring.
  const full = !!(eq && eq.length === FULL_EQ_BANDS.length);
  const labels = full ? FULL_EQ_BANDS : EQ_BANDS;
  return (
    <div style={{ display: 'flex', gap: full ? 2 : 8, alignItems: 'flex-start' }}>
      {labels.map((lbl, i) => (
        <EqBand key={i} value={eq ? eq[i] : 0} onChange={(v) => onChange(i, v)} label={lbl} ringing={!!(ringBands && ringBands.indexOf(i) >= 0)} accent={accent} height={height} width={full ? 12 : width} vertical={full}/>
      ))}
    </div>
  );
}

// Exposable "Monitor EQ" panel — the graphic EQs for the two aux/monitor sends,
// the way they'd sit at FOH (outboard rack, or a screen on a digital desk). It
// auto-opens when a wedge starts ringing and can be toggled by hand otherwise.
function MonitorEqPanel({ open, onClose, wedge, wedge2, wedge3, wedge4, onBandChange, ringWedge, ringBand, rings, toneGate, byEar, onSetByEar, severity }) {
  if (!open) return null;
  const ringsFor = (key) => (rings || []).filter(r => r.wedge === key).map(r => r.band);
  const col = (key, w, label, accent) => {
    const hot = ringsFor(key);
    const isRinging = hot.length > 0;
    // Tone readout (Feedback Mode wedges only): how much of the wedge's
    // response the cuts have eaten. Real ring-outs stop after a few small
    // cuts; chop too many bands and the wedge goes hollow — the readout
    // turns red and the rep won't pass until the cuts come back up.
    const full = !!(w.eq && w.eq.length === FULL_EQ_BANDS.length);
    const tone = full ? eqLevelGain(w) : 1;
    const toneBad = full && toneGate ? tone < toneGate : false;
    // One wedge = one horizontal rack unit: a left-hand name plate, then the
    // graphic EQ bands running across. Four of these stack vertically, like a
    // rack of outboard graphic EQs (and it saves the horizontal space the
    // side-by-side layout ate up).
    return (
    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 12px', background: '#141418', border: '1px solid ' + (isRinging ? 'var(--hot)' : '#2a2a2e'), borderRadius: 6, boxShadow: isRinging ? '0 0 0 1px rgba(255,70,48,0.4)' : 'none' }}>
      <div style={{ width: 80, flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: 1, fontWeight: 700, color: isRinging ? 'var(--hot)' : accent }}>{label}</div>
        {isRinging ? <div className="mono" style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--hot)', marginTop: 2 }}>{hot.length > 1 ? 'RINGING ×' + hot.length : 'RINGING'}</div> : null}
        {full && toneGate ? (
          <div className="mono" style={{ fontSize: 7.5, letterSpacing: 0.5, fontWeight: 700, color: toneBad ? 'var(--hot)' : 'var(--ink-3)', marginTop: 2 }}>
            TONE {Math.round(tone * 100)}%{toneBad ? ' · CUT' : ''}
          </div>
        ) : null}
      </div>
      <EqStrip eq={w.eq} onChange={(band, v) => onBandChange(key, band, v)} ringBands={byEar ? [] : hot} accent={accent} height={66} width={20}/>
    </div>
    );
  };
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, background: 'rgba(0,0,0,0.45)' }}>
      <div onClick={(e) => e.stopPropagation()} className="ui-no-select" style={{ width: 500, maxWidth: '94vw', boxSizing: 'border-box', background: 'linear-gradient(180deg,#1c1c20 0%, #141417 100%)', border: '1px solid #38383e', borderRadius: 10, padding: '14px 16px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 24 }}>
          <div>
            <div className="display" style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5 }}>Monitor EQ</div>
            <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 0.8, marginTop: 1 }}>graphic EQ on the monitor sends</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* By-ear difficulty, right here on the monitor window as a second
                way to reach it. Reads and writes the SAME feedbackByEar setting
                the Feedback Mode toggle uses, so the two always stay in sync. */}
            {onSetByEar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div className="mono" title="Guided glows the ringing band. By ear hides it: find the ringing frequency by listening." style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 1, fontWeight: 700 }}>RING-OUT</div>
                {[{ v: false, l: 'GUIDED' }, { v: true, l: 'BY EAR' }].map(opt => (
                  <button key={opt.l} onClick={() => onSetByEar(opt.v)} className="mono ui-no-select" style={{
                    padding: '5px 9px', fontSize: 9, fontWeight: 800, letterSpacing: 0.5, borderRadius: 4, cursor: 'pointer',
                    background: byEar === opt.v ? 'linear-gradient(180deg, var(--cool), #2c5d9e)' : '#1a1a1d',
                    color: byEar === opt.v ? '#0a0a0c' : 'var(--ink-2)',
                    border: '1px solid ' + (byEar === opt.v ? '#2c5d9e' : '#38383e'),
                  }}>{opt.l}</button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="mono ui-no-select" style={{ padding: '4px 10px', fontSize: 10, fontWeight: 800, color: 'var(--ink-2)', background: '#0a0a0c', border: '1px solid #38383e', borderRadius: 4, cursor: 'pointer' }}>✕ CLOSE</button>
          </div>
        </div>
        {/* Always-present guidance line. Rendered whether or not a band is
            ringing so the panel keeps a stable height (it used to grow and
            shrink each time the ring crossed threshold). It just swaps copy and
            turns red when something is actually ringing. */}
        {(() => {
          const ringing = rings && rings.length > 0;
          const sev = severity || { level: 0, count: 0 };
          // A ring builds toward a howl; several at once means cut each glowing
          // band OR back the send off (both work, and backing off buys headroom).
          const many = ringing && (rings ? rings.length : 0) >= 3;
          const howl = ringing && sev.level >= 2 && !many;
          const hot = many || howl;
          const target = byEar
            ? <span>the ringing frequency by <b style={{ color: 'var(--hot)' }}>ear</b></span>
            : <span>the <b style={{ color: 'var(--hot)' }}>glowing band</b></span>;
          return (
            <div style={{ marginBottom: 10, padding: '8px 10px', minHeight: 48, display: 'flex', alignItems: 'center',
              background: ringing ? (hot ? 'rgba(255,70,48,0.18)' : 'rgba(255,70,48,0.10)') : 'rgba(255,255,255,0.03)',
              border: '1px solid ' + (ringing ? 'var(--hot)' : '#2a2a2e'), borderRadius: 6,
              fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.4 }}>
              {ringing ? (
                many
                  ? <span style={{ color: 'var(--ink)' }}>Several frequencies are ringing at once. {byEar ? 'Find each ring by ear and cut it' : <>Cut each <b style={{ color: 'var(--hot)' }}>glowing band</b></>}, or back the <b style={{ color: 'var(--hot)' }}>send</b> off to buy headroom.</span>
                  : howl
                  ? <span style={{ color: 'var(--ink)' }}>It is howling. Cut {target} now, or pull the send down fast.</span>
                  : <span style={{ color: 'var(--ink)' }}>A frequency is starting to ring. Cut {target} before it takes off, just enough to stop it.</span>
              ) : (
                byEar
                  ? <span>Listen for the ring, then pull that frequency's band down. No band glows in this mode; use your ear.</span>
                  : <span>These are the graphic equalizers between the console and each monitor wedge. When a frequency rings, pull that band down to stop the feedback.</span>
              )}
            </div>
          );
        })()}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {col('wedge', wedge, 'WEDGE 1', 'var(--aux)')}
          {col('wedge2', wedge2, 'WEDGE 2', 'var(--cool)')}
          {wedge3 && col('wedge3', wedge3, 'WEDGE 3', 'var(--green)')}
          {wedge4 && col('wedge4', wedge4, 'WEDGE 4', 'var(--amber)')}
        </div>
      </div>
    </div>
  );
}
window.MonitorEqPanel = MonitorEqPanel;

// ── Mic Placement (side elevation) ─────────────────────────────────────────
// One view, drawn to scale in metres, of the two paths that set a vocal mic's
// gain before feedback: the floor wedge in front of the performer, and the main
// speaker downstage of them. The top-down plan view is gone (Kyle 2026-07-24):
// a floor wedge sits directly in front of the performer in almost every real
// setup, so its horizontal angle is not a variable worth half the panel, and one
// honest side elevation explains both paths better than two half-views explained
// one. A side elevation projects the lateral axis out, so the mains are drawn at
// their downstage distance and height; the engine still places them off to the
// side, which is why the drawn angle to the box is wider than the true one.
//
// Every number on screen comes from the SAME engine functions the feedback loop
// uses — micRejection3D for the wedge, paPlacementDb for the mains — so the
// picture and the loop can never disagree. Both are reported as gain before
// feedback against a standard setup: positive means this placement bought
// headroom, negative means it gave headroom away.
function PlacementPanel({ open, srcKey, label, setup, paLine, wedgeDeg, onChange, onPaLine, onWedgeDeg, onClose }) {
  const svgRef = React.useRef(null);
  const dragRef = React.useRef(false);
  if (!open) return null;
  const A = { cardioid: 0.5, super: 0.375, hyper: 0.25 };
  const DEF = window.DEFAULT_MIC_SETUP || { pattern: 'cardioid', az: 180, tilt: 10 };
  const pat = (setup && setup.pattern) || DEF.pattern;
  const tilt = (setup && setup.tilt != null) ? setup.tilt : DEF.tilt;
  const paNow = paLine != null ? paLine : (window.PA_LINE_DEFAULT != null ? window.PA_LINE_DEFAULT : 2.4);
  const a = A[pat];
  const d2r = (d) => d * Math.PI / 180;
  const rOf = (aa, deg) => Math.abs(aa + (1 - aa) * Math.cos(d2r(deg)));
  const eff = { pattern: pat, az: 180, tilt };
  const MODELS = window.WEDGE_MODELS || [{ deg: 27, drop: 72, name: 'LOW' }];
  const wDeg = wedgeDeg != null ? wedgeDeg : (window.WEDGE_DEG_DEFAULT != null ? window.WEDGE_DEG_DEFAULT : 27);
  const model = MODELS.find((w) => w.deg === wDeg) || MODELS[0];

  // Both readings straight off the engine, converted to gain before feedback:
  // micRejection3D returns a coupling ratio (>1 = hotter loop = less headroom),
  // paPlacementDb returns dB added to the mains loop, so both get negated.
  const wedgeDb = window.micRejection3D ? -20 * Math.log10(window.micRejection3D(eff, model.drop)) : 0;
  const mainsDb = window.paPlacementDb ? -window.paPlacementDb({ paLine: paNow }) : 0;
  const tone = (db) => (db >= 1 ? 'var(--green)' : db > -3 ? 'var(--accent)' : 'var(--hot)');
  const wTone = tone(wedgeDb), mTone = tone(mainsDb);
  const sign = (db) => (db >= 0 ? '+' : '') + db.toFixed(0);

  // ---- scene, in metres, uniformly scaled so every drawn angle is true ----
  // Still pinned by the one constraint (Kyle 2026-07-24): the wedge is aimed ON
  // AXIS at the singer's ear, so a line perpendicular to its angled baffle lands
  // on the ear. The cabinet is no longer hard-coded, because the wedge is now
  // switchable: the polygon is SOLVED from whichever model is selected, so all
  // three draw truthfully and the picture can never drift from the engine.
  const VW = 700, VH = 380, X0 = -1.70, Z1 = 2.86, S = VW / 5.35;
  const px = (x) => (x - X0) * S;
  const pz = (z) => (Z1 - z) * S;
  const EAR = [-0.30, 1.60], MOUTH = [-0.20, 1.55], HEAD = [-0.33, 1.67];
  const MIC = [px(0), pz(1.52)];
  // Wedge cabinet in side elevation: bottom edge on the floor, vertical back
  // downstage, and the baffle running from the front-bottom corner up to the
  // back-top corner. Solved, not typed in. Given the model's baffle angle and its
  // real depth, the height follows (H = D tan b), and the position follows from
  // the aim-at-the-ear rule: the baffle's normal sits (90 - b) above horizontal,
  // so the cabinet has to stand back far enough for that ray to reach the ear.
  // Shallower baffle, steeper ray, closer wedge — which is why the low-profile
  // box ends up under the mic and the stood-up one ends up out in front of it.
  const WDEPTH = { 27: 0.44, 40: 0.58, 55: 0.45 }; // the real cabinets' depths
  const wD = WDEPTH[model.deg] || 0.45;
  const wH = wD * Math.tan(d2r(model.deg));
  const wCx = EAR[0] + (EAR[1] - wH / 2) / Math.tan(d2r(90 - model.deg));
  const WA = [wCx - wD / 2, 0], WB = [wCx + wD / 2, 0], WC = [wCx + wD / 2, wH];
  const WBC = [(WA[0] + WC[0]) / 2, (WA[1] + WC[1]) / 2]; // baffle centre
  const WEDGE = [px(WBC[0]), pz(WBC[1])];
  const SPK = [px(paNow), pz(2.12)];
  const sa = d2r(10); // the box is aimed down into the audience, matching PA_TILT

  // Dragging the main speaker HERE writes the same state.paLine the stage plot
  // writes, because where the mains stand is one fact about the system, not a
  // per-microphone setting. Move it on any downstage mic's panel and it moves on
  // every other panel and on the stage plot too.
  // Screen x back to metres: px(x) = (x - X0) * S, so x = u / S + X0, where u is
  // the pointer in viewBox units (the svg is width:100%, so scale by the rect).
  const dragPaTo = (clientX) => {
    const el = svgRef.current;
    if (!el || !onPaLine) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const u = (clientX - r.left) / r.width * VW;
    const lo = window.PA_LINE_MIN != null ? window.PA_LINE_MIN : -1.2;
    const hi = window.PA_LINE_MAX != null ? window.PA_LINE_MAX : 2.6;
    // Same 0.05 m quantisation as the stage plot, so dragging in one place and
    // reading in the other can never disagree by a rounding step.
    onPaLine(Math.round(Math.max(lo, Math.min(hi, u / S + X0)) * 20) / 20);
  };

  // Mic polar pattern in the plane of the view. faAng is the screen angle of the
  // mic axis: it points upstage at the performer, tilted up by `tilt`.
  const faAng = Math.atan2(-Math.sin(d2r(tilt)), -Math.cos(d2r(tilt)));
  const PR = 0.30 * S;
  let polarD = '';
  for (let t = 0; t <= 360; t += 4) {
    const rr = PR * rOf(a, t), ang = faAng + d2r(t);
    polarD += (t === 0 ? 'M' : 'L') + (MIC[0] + rr * Math.cos(ang)).toFixed(1) + ' ' + (MIC[1] + rr * Math.sin(ang)).toFixed(1) + ' ';
  }
  polarD += 'Z';
  const nullDeg = pat === 'cardioid' ? 180 : Math.acos(-a / (1 - a)) * 180 / Math.PI;
  const nulls = pat === 'cardioid' ? [180] : [nullDeg, -nullDeg];
  const capEnd = [MIC[0] + 0.17 * S * Math.cos(faAng + Math.PI), MIC[1] + 0.17 * S * Math.sin(faAng + Math.PI)];

  // Main speaker mouth and its coverage. Whether the mic falls in front of the
  // box or behind it is the whole point of the view.
  const mouth = [SPK[0] + 0.17 * S * Math.cos(sa), SPK[1] + 0.17 * S * Math.sin(sa)];
  const covR = 1.9 * S, covHalf = d2r(35);
  const c1 = [mouth[0] + covR * Math.cos(sa - covHalf), mouth[1] + covR * Math.sin(sa - covHalf)];
  const c2 = [mouth[0] + covR * Math.cos(sa + covHalf), mouth[1] + covR * Math.sin(sa + covHalf)];
  const covD = 'M' + mouth[0].toFixed(1) + ' ' + mouth[1].toFixed(1) +
    ' L' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) +
    ' A' + covR.toFixed(1) + ' ' + covR.toFixed(1) + ' 0 0 1 ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' Z';

  // No written coaching here any more (Kyle 2026-07-24). The panel used to close
  // with two paragraphs telling you which pattern to pick and where to stand;
  // they ate a lot of height and the two dB readouts already say it. Swapping the
  // pattern buttons and watching WEDGE PATH move is the lesson. Everything that
  // existed only to phrase that advice (the per-pattern scoring, the best-pattern
  // search) went with it.
  const patBtn = (p, txt) => (
    <div key={p} data-walk={'mic-pattern-' + p} onClick={() => onChange({ pattern: p })} className="mono ui-no-select"
      style={{ fontSize: 9, padding: '4px 9px', borderRadius: 4, cursor: 'pointer', fontWeight: 700, letterSpacing: 0.4,
        background: pat === p ? 'var(--accent)' : '#0a0a0c', color: pat === p ? '#0a0a0c' : 'var(--ink-2)',
        border: '1px solid ' + (pat === p ? 'var(--accent)' : '#38383e') }}>{txt}</div>
  );
  const stat = (db, col, name) => (
    <div style={{ textAlign: 'center', minWidth: 96 }}>
      <div className="display" style={{ fontSize: 22, fontWeight: 800, color: col, lineHeight: 1 }}>{sign(db)} dB</div>
      <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.5, marginTop: 3 }}>{name}</div>
    </div>
  );
  // Wedge selector. Same shape as the pattern buttons because it is the same kind
  // of choice: the right pattern is a function of the cabinet, so the two controls
  // belong side by side and you read the answer off WEDGE PATH either way.
  const wedgeBtn = (w) => (
    <div key={w.deg} data-walk={'wedge-deg-' + w.deg}
      onClick={() => onWedgeDeg && onWedgeDeg(w.deg)} className="mono ui-no-select"
      title={w.deg + ' degree cabinet, ' + w.detail}
      style={{ fontSize: 9, padding: '4px 9px', borderRadius: 4, cursor: onWedgeDeg ? 'pointer' : 'default',
        fontWeight: 700, letterSpacing: 0.4,
        background: wDeg === w.deg ? 'var(--aux)' : '#0a0a0c', color: wDeg === w.deg ? '#0a0a0c' : 'var(--ink-2)',
        border: '1px solid ' + (wDeg === w.deg ? 'var(--aux)' : '#38383e') }}>{w.deg + '°'}</div>
  );

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 62, background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={(e) => e.stopPropagation()} data-walk="placement-panel" className="ui-no-select" style={{ background: 'linear-gradient(180deg,#1c1c20 0%, #141417 100%)', border: '1px solid #38383e', borderRadius: 10, padding: '14px 16px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', width: 700, maxWidth: '94vw' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div className="display" style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Mic placement</div>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', letterSpacing: 0.6 }}>{(label || '').toUpperCase()}</div>
          <div style={{ flex: 1 }}/>
          <span className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 0.6, marginRight: 1 }}>WEDGE</span>
          <div style={{ display: 'flex', gap: 4, marginRight: 6 }}>{MODELS.map(wedgeBtn)}</div>
          <span className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 0.6, marginRight: 1 }}>MIC</span>
          <div style={{ display: 'flex', gap: 5 }}>{patBtn('cardioid', 'CARDIOID')}{patBtn('super', 'SUPER')}{patBtn('hyper', 'HYPER')}</div>
          <div onClick={onClose} className="mono ui-no-select" style={{ fontSize: 12, color: 'var(--ink-2)', cursor: 'pointer', padding: '2px 6px', marginLeft: 4 }}>✕</div>
        </div>

        <div style={{ background: '#0d0d10', border: '1px solid #2a2a2e', borderRadius: 6, padding: '5px 6px 2px' }}>
          <div className="mono" style={{ fontSize: 8.5, color: 'var(--ink-3)', letterSpacing: 0.8, marginBottom: 1 }}>
            {'SIDE VIEW · ' + model.deg + '° WEDGE, ' + model.detail.toUpperCase()}
          </div>
          <svg ref={svgRef} viewBox={'0 0 ' + VW + ' ' + VH} style={{ width: '100%', display: 'block' }}>
            {/* main speaker coverage, drawn first so everything sits on top */}
            <path d={covD} fill={mTone} fillOpacity="0.06" stroke={mTone} strokeOpacity="0.22" strokeWidth="1"/>

            {/* floor and the audience direction */}
            <line x1="0" y1={pz(0)} x2={VW} y2={pz(0)} stroke="#38383e" strokeWidth="1.4"/>
            <text x="8" y={pz(0) - 6} style={{ fontSize: 9, fill: 'var(--ink-3)' }}>floor</text>
            <text x={VW - 8} y={pz(0) - 6} textAnchor="end" style={{ fontSize: 9, fill: 'var(--ink-3)' }}>audience ▸</text>

            {/* the performer, facing the audience. The ear is marked because it is
                what the wedge is aimed at, and the reason the scene is laid out
                the way it is. */}
            <circle cx={px(HEAD[0])} cy={pz(HEAD[1])} r={0.115 * S} fill="none" stroke="var(--ink-2)" strokeWidth="1.3"/>
            <path d={'M' + px(HEAD[0]) + ' ' + pz(1.55) + ' L' + px(HEAD[0]) + ' ' + pz(0)} stroke="var(--ink-2)" strokeWidth="1.3" fill="none" opacity="0.7"/>
            <circle cx={px(EAR[0])} cy={pz(EAR[1])} r="2.6" fill="var(--green)"/>
            <text x={px(EAR[0]) - 0.16 * S} y={pz(EAR[1]) + 3} textAnchor="end" style={{ fontSize: 8.5, fill: 'var(--green)' }}>ear</text>
            <text x={px(HEAD[0])} y={pz(0) - 8} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--ink-3)' }}>singer</text>

            {/* The wedge, drawn as a real cabinet: bottom on the floor, short
                vertical back downstage, and the baffle running from the front
                bottom corner up to the back top corner. It is aimed AT THE EAR,
                not straight up, so the singer stands on axis. */}
            <polygon points={[[px(WA[0]), pz(WA[1])], [px(WB[0]), pz(WB[1])], [px(WC[0]), pz(WC[1])]].map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}
              fill="#1c1c20" stroke="var(--ink)" strokeWidth="1.3"/>
            {/* the baffle face, and the axis it throws at the singer */}
            <line x1={px(WA[0])} y1={pz(WA[1])} x2={px(WC[0])} y2={pz(WC[1])} stroke="var(--aux)" strokeWidth="2.6"/>
            <line x1={WEDGE[0]} y1={WEDGE[1]} x2={px(EAR[0])} y2={pz(EAR[1])} stroke="var(--green)" strokeWidth="1" strokeDasharray="2 5" opacity="0.75"/>
            <text x={(WEDGE[0] + px(EAR[0])) / 2} y={(WEDGE[1] + pz(EAR[1])) / 2 - 6} textAnchor="middle" style={{ fontSize: 8.5, fill: 'var(--green)' }}>on axis</text>
            <text x={px(WB[0]) + 8} y={pz(0) - 8} style={{ fontSize: 9, fill: 'var(--ink-2)' }}>wedge</text>

            {/* The ONE loop path this view is about: the wedge into the capsule.
                There is deliberately no matching line to the mains (Kyle
                2026-07-24). Drawing one put the mic's rear lobe on the boxes and
                made a hypercardioid read as a liability, when a hypercardioid is
                the pattern that HELPS here. What the mains contribute is which
                side of them the mic stands on, not what the pattern does, and
                that is already shown by where the box sits and where it throws. */}
            <line x1={WEDGE[0]} y1={WEDGE[1]} x2={MIC[0]} y2={MIC[1]} stroke={wTone} strokeWidth="1.8" strokeDasharray="4 4"/>
            <text x={SPK[0]} y={pz(2.12) - 0.42 * S} textAnchor="middle" style={{ fontSize: 8.5, fill: 'var(--ink-3)' }}>off to the side of the stage</text>

            {/* mic pattern, nulls, and the mic itself */}
            <path d={polarD} fill="var(--accent)" fillOpacity="0.10" stroke="var(--accent)" strokeWidth="1.4"/>
            {nulls.map((g, i) => {
              const gg = faAng + d2r(g);
              const qx = MIC[0] + (PR + 14) * Math.cos(gg), qy = MIC[1] + (PR + 14) * Math.sin(gg);
              const lx = MIC[0] + (PR + 27) * Math.cos(gg), ly = MIC[1] + (PR + 27) * Math.sin(gg);
              return (
                <g key={i}>
                  <line x1={MIC[0]} y1={MIC[1]} x2={qx.toFixed(1)} y2={qy.toFixed(1)} stroke="var(--green)" strokeWidth="1" strokeDasharray="3 4" opacity="0.7"/>
                  <text x={lx.toFixed(1)} y={(ly + 3).toFixed(1)} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--green)' }}>null</text>
                </g>);
            })}
            <line x1={MIC[0]} y1={MIC[1]} x2={capEnd[0].toFixed(1)} y2={capEnd[1].toFixed(1)} stroke="var(--ink)" strokeWidth="5" strokeLinecap="round"/>
            <circle cx={MIC[0]} cy={MIC[1]} r="4" fill="var(--ink)"/>
            <text x={MIC[0]} y={MIC[1] - 0.32 * S} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--ink-2)' }}>mic</text>

            {/* Main speaker on a pole, and it DRAGS. The invisible bar behind it
                is the grab area, wide enough and full height so the pole, the box
                and the label all pick up the drag. Pointer capture keeps the drag
                alive when the pointer runs off the speaker. */}
            <g data-walk="pa-position" style={{ cursor: onPaLine ? 'ew-resize' : 'default' }}
              onPointerDown={(e) => { if (!onPaLine) return; dragRef.current = true;
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} dragPaTo(e.clientX); }}
              onPointerMove={(e) => { if (dragRef.current) dragPaTo(e.clientX); }}
              onPointerUp={() => { dragRef.current = false; }}
              onPointerCancel={() => { dragRef.current = false; }}>
              <rect x={SPK[0] - 0.34 * S} y={pz(2.86)} width={0.68 * S} height={pz(0) - pz(2.86)} fill="transparent"/>
              <line x1={SPK[0]} y1={pz(0)} x2={SPK[0]} y2={SPK[1]} stroke="#4a4a52" strokeWidth="3"/>
              <g transform={'translate(' + SPK[0].toFixed(1) + ',' + SPK[1].toFixed(1) + ') rotate(10)'}>
                <rect x={-0.17 * S} y={-0.27 * S} width={0.34 * S} height={0.54 * S} rx="3" fill="#1c1c20" stroke={mTone} strokeWidth="1.6"/>
                <rect x={0.09 * S} y={-0.19 * S} width={0.07 * S} height={0.38 * S} rx="2" fill="#0a0a0c" stroke="#4a4a52" strokeWidth="1"/>
              </g>
              <text x={SPK[0]} y={pz(0) - 30} textAnchor="middle" style={{ fontSize: 9, fill: 'var(--ink-2)' }}>main speaker</text>
              <text x={SPK[0]} y={pz(0) - 17} textAnchor="middle" className="mono" style={{ fontSize: 8.5, fill: mTone }}>
                {paNow >= 0.05 ? paNow.toFixed(1) + ' m downstage of the mic' : paNow <= -0.05 ? (-paNow).toFixed(1) + ' m upstage of the mic' : 'level with the mic'}
              </text>
            </g>
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 4px 4px' }}>
            <span className="mono" style={{ fontSize: 8.5, color: 'var(--ink-3)' }}>MIC TILT</span>
            <input data-walk="mic-tilt" type="range" min="-20" max="60" step="5" value={tilt} onChange={(e) => onChange({ tilt: +e.target.value })} style={{ flex: 1 }}/>
            <span className="mono" style={{ fontSize: 8.5, color: 'var(--ink-2)', minWidth: 64, textAlign: 'right' }}>{tilt > 0 ? 'up ' + tilt + '°' : tilt < 0 ? 'down ' + (-tilt) + '°' : 'level'}</span>
          </div>
        </div>

        {/* The numbers carry it now. The caption stays, because "+12 dB" means
            nothing without saying what it is measured against. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 10 }}>
          {stat(wedgeDb, wTone, 'WEDGE PATH')}
          {stat(mainsDb, mTone, 'MAIN SPEAKER PATH')}
          <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.5, maxWidth: 150, lineHeight: 1.5 }}>GAIN BEFORE FEEDBACK, AGAINST A STANDARD SETUP</div>
        </div>
      </div>
    </div>
  );
}
window.PlacementPanel = PlacementPanel;

function Wedge({ on, mute, volume, level, onTogglePower, onToggleMute, onVolume, isInspected, onSelect, label = 'STAGE WEDGE', accent = 'var(--aux)', ringing, marginInfo }) {
  const animate = on && !mute && level > 0.05;
  const intensity = Math.min(1, level);
  // Resolve the accent var to an rgba glow color so we can reuse the variable
  // for both the label/knob and the cone's drop-shadow.
  const glowRgb = accent === 'var(--cool)' ? '106,169,255' : '184,141,255';
  const glowBg  = accent === 'var(--cool)' ? 'rgba(106,169,255,0.15)' : 'rgba(184,141,255,0.15)';
  const glowBorder = accent === 'var(--cool)' ? 'rgba(106,169,255,0.4)' : 'rgba(184,141,255,0.4)';
  // Off state mirrors PASpeaker: dim cabinet, red border accent, big OFF
  // badge over the cone, and a proper labeled power button.
  const borderColor = ringing ? 'var(--hot)' : (isInspected ? accent : (on ? '#0a0a0c' : '#5a2018'));
  return (
    <div className="ui-no-select" style={{
      background: on
        ? 'linear-gradient(180deg,#1f1f23 0%, #141418 100%)'
        : 'linear-gradient(180deg,#1c1418 0%, #100a0c 100%)',
      border: '1px solid ' + borderColor,
      borderRadius: 5,
      padding: '4px 6px 5px',
      display: 'flex', alignItems: 'center', gap: 6,
      boxShadow: ringing ? '0 0 10px rgba(255,70,48,0.6)' : (isInspected ? `0 0 0 1px ${glowBorder}` : (on ? 'none' : 'inset 0 0 0 1px rgba(90,32,24,0.4)')),
    }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="48" height="34" viewBox="0 0 60 42" style={{
          opacity: on ? 1 : 0.45,
          filter: on ? 'none' : 'grayscale(0.85)',
        }}>
          <defs>
            <linearGradient id="wedge-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3a40"/><stop offset="1" stopColor="#1a1a1d"/>
            </linearGradient>
          </defs>
          <path d="M 4 38 L 14 8 L 46 8 L 56 38 Z" fill="url(#wedge-grad)" stroke="#0a0a0c"/>
          <ellipse cx="30" cy="22" rx="14" ry="11" fill="#0a0a0c" stroke="#3a3a40"/>
          <ellipse cx="30" cy="22" rx="11" ry="8" fill="radial-gradient(circle at 35% 30%, #4a4a52, #0a0a0c)"
            style={{ filter: animate ? `drop-shadow(0 0 ${4 + 6*intensity}px rgba(${glowRgb},${0.3 + intensity * 0.4}))` : 'none' }}/>
          <ellipse cx="30" cy="22" rx="3.5" ry="2.5" fill="#1a1a1d"/>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 }}>
          <div className="mono" style={{
            fontSize: 7.5, letterSpacing: 1.5, fontWeight: 700,
            color: on ? accent : '#ff8676',
          }}>{label}</div>
          {on && marginInfo && (
            <div className="mono" title="How much louder this monitor can get before it feeds back. Pros leave about 6 dB. Green is safe, red is on the edge."
              style={{ fontSize: 7, fontWeight: 800, letterSpacing: 0.3, whiteSpace: 'nowrap',
                color: marginInfo.status === 'ok' ? 'var(--green)' : marginInfo.status === 'low' ? 'var(--accent)' : 'var(--hot)' }}>
              {marginInfo.db < 0 ? 'FEEDING BACK' : (marginInfo.db >= 12 ? '+12+' : '+' + marginInfo.db.toFixed(0)) + ' dB to F/B'}
            </div>
          )}
        </div>
        <div onClick={onSelect} style={{
          cursor: 'pointer',
          padding: '1px 2px', borderRadius: 3,
          background: isInspected ? glowBg : 'transparent',
          alignSelf: 'flex-start',
          opacity: on ? 1 : 0.5,
        }}>
          <window.MiniMeter level={level} width={64}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PowerButton on={on} onClick={onTogglePower} width={32} height={14}/>
          <window.Knob value={volume} onChange={onVolume} size={20} color={accent}/>
          <window.ButtonPad active={mute} onClick={(e) => { e.stopPropagation(); onToggleMute(); }} label="M" color="var(--hot)" width={14} height={14} fontSize={8}/>
        </div>
      </div>
    </div>
  );
}

function StreamLaptop({ on, volume, level, onToggleOn, onVolume, isInspected, onSelect }) {
  const animate = on && level > 0.05;
  return (
    <div className="ui-no-select" style={{
      background: on ? 'linear-gradient(180deg,#241f1c 0%, #1a1418 100%)' : 'linear-gradient(180deg,#1c1c1f 0%, #141417 100%)',
      border: '1px solid ' + (isInspected ? 'var(--accent)' : on ? 'var(--hot)' : '#0a0a0c'),
      borderRadius: 5, padding: '4px 6px 5px',
      display: 'flex', alignItems: 'center', gap: 6,
      boxShadow: isInspected ? '0 0 0 1px rgba(255,201,58,0.4)' : on ? '0 0 0 1px rgba(255,70,48,0.2)' : 'none',
    }}>
      <svg width="44" height="34" viewBox="0 0 60 46">
        <defs><linearGradient id="lap-stream-scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2a2e"/><stop offset="1" stopColor="#0e0e10"/></linearGradient></defs>
        <rect x="6" y="4" width="48" height="30" rx="2" fill="#1a1a1d" stroke="#0a0a0c"/>
        <rect x="8" y="6" width="44" height="26" fill="url(#lap-stream-scr)"/>
        <g opacity={animate ? 1 : 0.4}>
          {[8, 12, 16, 14, 10, 12, 16, 14, 10, 14].map((h, i) => (
            <rect key={i} x={11 + i*4} y={20 - h/2} width="2" height={h} fill={animate ? '#ff4630' : '#38383e'}/>
          ))}
        </g>
        <path d="M 2 34 L 58 34 L 56 44 L 4 44 Z" fill="#3a3a40" stroke="#0a0a0c"/>
        <rect x="26" y="36" width="8" height="2" rx="1" fill="#1a1a1d"/>
        {on && <circle cx="14" cy="11" r="1.5" fill="#ff4630" style={{ filter: 'drop-shadow(0 0 3px #ff4630)' }}><animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite"/></circle>}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
        <div className="mono" style={{ fontSize: 7.5, color: on ? 'var(--hot)' : 'var(--ink-3)', letterSpacing: 1.2, fontWeight: 700 }}>STREAM LAPTOP</div>
        <div className="mono" style={{ fontSize: 6, color: 'var(--ink-3)', letterSpacing: 0.5 }}>USB FROM MAIN OUT</div>
        <div onClick={onSelect} style={{
          cursor: 'pointer',
          padding: '1px 2px', borderRadius: 3,
          background: isInspected ? 'rgba(255,201,58,0.15)' : 'transparent',
          alignSelf: 'flex-start',
        }}>
          <window.MiniMeter level={level} width={70}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <window.ButtonPad active={on} onClick={(e) => { e.stopPropagation(); onToggleOn(); }} label={on ? 'LIVE' : 'OFF'} color="var(--hot)" width={26} height={12} fontSize={7}/>
          <window.Knob value={volume} onChange={onVolume} size={20} color="var(--hot)"/>
        </div>
      </div>
    </div>
  );
}

function StreamInterface({ on, volume, level, onToggleOn, onVolume, isInspected, onSelect }) {
  const animate = on && level > 0.05;
  return (
    <div className="ui-no-select" style={{
      background: on ? 'linear-gradient(180deg,#1c2330 0%, #14181f 100%)' : 'linear-gradient(180deg,#1c1c1f 0%, #141417 100%)',
      border: '1px solid ' + (isInspected ? 'var(--accent)' : on ? 'var(--cool)' : '#0a0a0c'),
      borderRadius: 5, padding: '4px 6px 5px',
      display: 'flex', alignItems: 'center', gap: 6,
      boxShadow: isInspected ? '0 0 0 1px rgba(255,201,58,0.4)' : on ? '0 0 0 1px rgba(106,169,255,0.2)' : 'none',
    }}>
      <svg width="48" height="32" viewBox="0 0 62 42">
        <defs><linearGradient id="iface-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3e3e44"/><stop offset="1" stopColor="#1a1a1d"/></linearGradient></defs>
        <rect x="2" y="4" width="58" height="34" rx="2" fill="url(#iface-body)" stroke="#0a0a0c"/>
        <rect x="6" y="8" width="20" height="6" fill="#0a0a0c" stroke="#38383e"/>
        <rect x="6" y="16" width="20" height="6" fill="#0a0a0c" stroke="#38383e"/>
        <rect x="6" y="26" width="14" height="8" rx="1" fill="#0a0a0c" stroke="#38383e"/>
        <text x="9" y="32" fontFamily="Geist Mono" fontSize="4.5" fill="#a5a29a" fontWeight="700">USB</text>
        <circle cx="34" cy="11" r="2.5" fill={animate ? '#6aa9ff' : '#3a3a40'} style={{ filter: animate ? 'drop-shadow(0 0 3px #6aa9ff)' : 'none' }}/>
        <circle cx="34" cy="19" r="2.5" fill={animate ? '#6aa9ff' : '#3a3a40'} style={{ filter: animate ? 'drop-shadow(0 0 3px #6aa9ff)' : 'none' }}/>
        <text x="38" y="14" fontFamily="Geist Mono" fontSize="4.5" fill="#a5a29a">IN L</text>
        <text x="38" y="22" fontFamily="Geist Mono" fontSize="4.5" fill="#a5a29a">IN R</text>
        <circle cx="50" cy="11" r="2" fill="#0a0a0c" stroke="#3a3a40"/>
        <circle cx="50" cy="19" r="2" fill="#0a0a0c" stroke="#3a3a40"/>
        <text x="50" y="34" textAnchor="middle" fontFamily="Geist Mono" fontSize="4" fill="#a5a29a">MON</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 2 }}>
        <div className="mono" style={{ fontSize: 7.5, color: on ? 'var(--cool)' : 'var(--ink-3)', letterSpacing: 1.2, fontWeight: 700 }}>STREAM INTERFACE</div>
        <div className="mono" style={{ fontSize: 6, color: 'var(--ink-3)', letterSpacing: 0.5 }}>FED BY AUX 2</div>
        <div onClick={onSelect} style={{
          cursor: 'pointer',
          padding: '1px 2px', borderRadius: 3,
          background: isInspected ? 'rgba(255,201,58,0.15)' : 'transparent',
          alignSelf: 'flex-start',
        }}>
          <window.MiniMeter level={level} width={70}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <window.ButtonPad active={on} onClick={(e) => { e.stopPropagation(); onToggleOn(); }} label={on ? 'LIVE' : 'OFF'} color="var(--cool)" width={26} height={12} fontSize={7}/>
          <window.Knob value={volume} onChange={onVolume} size={20} color="var(--cool)"/>
        </div>
      </div>
    </div>
  );
}

function StageBox({ portRefs, outRefs, activePorts, snakeOutRef, retActive, nPorts = 4 }) {
  const ports = Array.from({ length: nPorts }, (_, i) => i + 1);
  const wide = nPorts > 6;
  // The RETURN side of the snake is its own bundle, numbered from 1 (a
  // bidirectional snake), so the six out ports are channels 1-6, independent of
  // the input ports 1-4. Which SPEAKER hears which signal is decided by the
  // patch (state.outPatch) — these are jacks, not destinations.
  // Out ports wear the resistor-code colors of their return channel (1 brown,
  // 2 red, 3 orange, 4 yellow, 5 green, 6 blue, 7 violet, 8 grey). What signal
  // rides each channel is decided at the FOH end (outFan); `active` lights when
  // it carries signal. Default fan-out: 1-2 carry Main L/R, 3-6 carry Aux 1-4
  // (one per wedge); 7-8 are spare. A snake return is a standard 8-channel loom,
  // so the box shows all eight jacks even though only six carry a feed today.
  const outs = [1, 2, 3, 4, 5, 6, 7, 8].map(ch => ({
    key: ch,
    label: String(ch),
    color: (window.SNAKE_COLORS || [])[(ch - 1) % 8] || '#4a4a52',
    active: !!(retActive && retActive[ch]),
  }));
  return (
    <div className="ui-no-select" data-walk="stage-box" style={{
      background: 'linear-gradient(180deg, #2a2a2e 0%, #141418 100%)',
      border: '1px solid #0a0a0c', borderRadius: 4,
      padding: '5px 8px 8px',
      display: 'flex', flexDirection: 'column', gap: 3,
      position: 'relative',
      width: wide ? 208 : 176,
      boxShadow: 'inset 0 1px 0 #3a3a40, 0 4px 12px rgba(0,0,0,0.6)',
    }}>
      <div className="mono" style={{ fontSize: 6.5, color: 'var(--cool)', letterSpacing: 1, fontWeight: 700, textAlign: 'center' }}>STAGE BOX</div>

      {/* INPUTS — sources plug in here. Wrap to a second row on the big band box. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="mono" style={{ fontSize: 5.5, color: 'var(--ink-3)', letterSpacing: 0.5, fontWeight: 700, width: 14 }}>IN</div>
        <div style={{ display: 'flex', gap: 3, rowGap: 5, flexWrap: 'wrap', justifyContent: 'space-around', flex: 1 }}>
          {ports.map(p => {
            const active = activePorts.find(a => a.port === p);
            const flowing = active && active.flowing;
            // Port ring + number wear the SNAKE CHANNEL color (resistor code:
            // 1 brown, 2 red, 3 orange, 4 yellow) — the port IS snake channel
            // p, whatever happens to be plugged into it. The inner dot lights
            // with the plugged source's color.
            const chColor = (window.SNAKE_COLORS || [])[p - 1] || '#38383e';
            return (
              <div key={p} ref={el => portRefs.current[p] = el}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #0a0a0c)',
                  border: '1.5px solid ' + chColor,
                  display: 'grid', placeItems: 'center',
                  boxShadow: flowing ? `0 0 4px ${active.color}` : 'inset 0 0 2px #000',
                }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: active ? active.color : '#222' }}/>
                </div>
                {/* Number is high-contrast (not the channel color) so it stays
                    legible for colorblind users; the colored ring above is the
                    color cue. */}
                <div className="mono" style={{ fontSize: 6.5, color: '#e9e6df', fontWeight: 700, lineHeight: 1.1 }}>{p}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: '#38383e', margin: '1px 0' }}/>

      {/* OUTPUTS / RETURNS — feeds for PA L, PA R, and wedge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div className="mono" style={{ fontSize: 5.5, color: 'var(--ink-3)', letterSpacing: 0.5, fontWeight: 700, width: 14 }}>OUT</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-around', flex: 1 }}>
          {outs.map(o => (
            <div key={o.key} ref={el => outRefs.current[o.key] = el}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #0a0a0c)',
                border: '1.5px solid ' + o.color,
                display: 'grid', placeItems: 'center',
                boxShadow: o.active ? `0 0 4px ${o.color}` : 'inset 0 0 2px #000',
              }}>
                <div style={{ width: 3, height: 3, borderRadius: '50%', background: o.color, opacity: o.active ? 1 : 0.55 }}/>
              </div>
              <div className="mono" style={{ fontSize: 6.5, color: '#e9e6df', fontWeight: 700, lineHeight: 1.1 }}>{o.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div ref={snakeOutRef} style={{ position: 'absolute', right: -2, top: '50%', width: 8, height: 8, transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
    </div>
  );
}

// The MX-8 stage box as a VERTICAL rack on the stage-right edge — the same
// shape and signal-flow read as the 16-channel SideStageBox, sized for the
// four native inputs. The four IN jacks stack at the top (each registers
// portRefs[p] so the source→port cable draws and can be dragged), the eight
// return jacks stack below, and the main snake leaves the right edge for FOH.
// Jacks live on the LEFT face so every source cable plugs in from the stage
// side and every return leaves toward the speakers.
function NativeSnakeBox({ portRefs, outRefs, activePorts, snakeOutRef, retActive }) {
  const outs = [1, 2, 3, 4, 5, 6, 7, 8].map(ch => ({ key: ch, color: (window.SNAKE_COLORS || [])[(ch - 1) % 8] || '#4a4a52', active: !!(retActive && retActive[ch]) }));
  const jack = (color, flowing, dotColor) => (
    <div style={{ width: 11, height: 11, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #0a0a0c)', border: '1.5px solid ' + color, display: 'grid', placeItems: 'center', boxShadow: flowing ? `0 0 4px ${dotColor}` : 'inset 0 0 2px #000', flex: '0 0 auto' }}>
      <div style={{ width: 3, height: 3, borderRadius: '50%', background: dotColor }}/>
    </div>
  );
  return (
    <div className="ui-no-select" data-walk="stage-box" style={{ background: 'linear-gradient(180deg, #2a2a2e 0%, #141418 100%)', border: '1px solid #0a0a0c', borderRadius: 4, padding: '5px 7px 6px', position: 'relative', width: 80, boxShadow: 'inset 0 1px 0 #3a3a40, 0 4px 12px rgba(0,0,0,0.6)' }}>
      <div className="mono" style={{ fontSize: 6.5, color: 'var(--cool)', letterSpacing: 0.8, fontWeight: 700, textAlign: 'center' }}>STAGE BOX</div>
      <div className="mono" style={{ fontSize: 5, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.3, marginTop: 2, marginBottom: 1 }}>IN → FOH</div>
      {[1, 2, 3, 4].map(p => {
        const active = (activePorts || []).find(a => a.port === p);
        const flowing = active && active.flowing;
        const chColor = (window.SNAKE_COLORS || [])[(p - 1) % 8] || '#38383e';
        return (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 13 }}>
            <div ref={el => portRefs.current[p] = el} data-walk={'conn-stage-in-' + p} style={{ flex: '0 0 auto' }}>{jack(chColor, flowing, active ? active.color : '#222')}</div>
            <div className="mono" style={{ fontSize: 6.5, color: '#e9e6df', fontWeight: 700, width: 9, textAlign: 'right' }}>{p}</div>
          </div>
        );
      })}
      <div style={{ height: 1, background: '#38383e', margin: '4px 0 3px' }}/>
      <div className="mono" style={{ fontSize: 5, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.3, marginBottom: 1 }}>OUT · returns</div>
      {outs.map(o => (
        <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 13 }}>
          <div ref={el => outRefs.current[o.key] = el} data-walk={'conn-stage-out-' + o.key} style={{ flex: '0 0 auto' }}>{jack(o.color, o.active, o.active ? o.color : o.color)}</div>
          <div className="mono" style={{ fontSize: 6.5, color: '#e9e6df', fontWeight: 700, width: 9, textAlign: 'right' }}>{o.key}</div>
        </div>
      ))}
      <div ref={snakeOutRef} style={{ position: 'absolute', right: -2, top: '42%', width: 8, height: 8, pointerEvents: 'none' }}/>
    </div>
  );
}

// One sub-snake head on the 16-channel stage: a small box that its group's
// inputs plug into (each port registers portRefs[port] so the source→port cable
// still draws), with an out anchor on the right for the sub-snake bundle that
// runs to the side-stage box.
function SubSnakeHead({ label, group, items, subJackRefs, outRef }) {
  // items: [{ srcKey, localCh, label, color, flowing, stageCh }] in local-channel
  // order. Each channel shows its LOCAL number, the instrument, and (when the
  // patch is non-1:1) where it lands on the main stage box, e.g. "→14".
  return (
    <div className="ui-no-select" data-walk={'sub-snake-' + group} style={{
      background: 'linear-gradient(180deg, #2a2a2e 0%, #141418 100%)',
      border: '1px solid #0a0a0c', borderRadius: 4, padding: '4px 8px 6px',
      position: 'relative', boxShadow: 'inset 0 1px 0 #3a3a40, 0 4px 12px rgba(0,0,0,0.6)',
    }}>
      <div className="mono" style={{ fontSize: 6, color: 'var(--cool)', letterSpacing: 0.8, fontWeight: 700, textAlign: 'center', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        {items.map(it => (
          <div key={it.empty ? 'e' + it.localCh : it.srcKey} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 30 }}>
            <div className="mono" style={{ fontSize: 6, color: 'var(--ink-3)', fontWeight: 700, lineHeight: 1 }}>{it.localCh}</div>
            {/* Two refs on the same jack: by SOURCE (so its XLR cable can draw to
                it) and by SLOT (so an unplugged mic has an empty input to be
                dropped onto — an empty slot has no source to key off). */}
            <div ref={el => { if (!it.empty) subJackRefs.current[it.srcKey] = el; subJackRefs.current['@' + group + ':' + it.localCh] = el; }} data-walk={it.empty ? undefined : 'conn-sub-' + it.srcKey} style={{ width: 11, height: 11, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #0a0a0c)', border: '1.5px solid ' + (it.empty ? '#38383e' : it.color), display: 'grid', placeItems: 'center', boxShadow: it.flowing ? `0 0 4px ${it.color}` : 'inset 0 0 2px #000', margin: '1px 0', opacity: it.empty ? 0.5 : 1 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: it.empty ? '#222' : it.color }}/>
            </div>
            <div className="mono" style={{ fontSize: 5, color: '#c8c8d0', fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }}>{it.empty ? '—' : it.label}</div>
            <div className="mono" style={{ fontSize: 5, color: it.localCh === it.stageCh ? 'var(--ink-3)' : 'var(--amber)', fontWeight: 700, lineHeight: 1.1 }}>{it.empty ? '' : (it.stageCh ? '→' + it.stageCh : 'loose')}</div>
          </div>
        ))}
      </div>
      <div ref={outRef} style={{ position: 'absolute', right: -2, top: '50%', width: 5, height: 5, transform: 'translateY(-50%)', pointerEvents: 'none' }}/>
    </div>
  );
}

// The single SIDE-STAGE box on the 16-channel stage: a vertical rack on the
// stage-right edge. 16 inputs run top→bottom in one numbered line (two banks of
// 8), the return side has 8 outputs, and the main snake leaves its right edge
// for FOH. Both sub-snakes fan out onto the left face: the drum snake into IN
// 1-6 (plus the drummer's vocal cross-patched down to 14), the downstage snake
// into 7-13. Keeping 1-16 in one line is what lets that cross-patch read.
function SideStageBox({ inChannels, stageChRefs, outRefs, snakeOutRef, retActive }) {
  const outs = [1, 2, 3, 4, 5, 6, 7, 8].map(ch => ({ key: ch, color: (window.SNAKE_COLORS || [])[ch - 1] || '#4a4a52', active: !!(retActive && retActive[ch]) }));
  // One IN row of the vertical rack: jack on the LEFT face (where the fan-out
  // tails plug in), then the channel number and the instrument on it.
  const inRow = (c, i) => (
    <React.Fragment key={c.ch}>
      {i === 8 && <div style={{ height: 4, borderTop: '1px dashed #38383e', margin: '2px 0' }}/>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 12.5 }}>
        <div ref={el => { if (stageChRefs) stageChRefs.current[c.ch] = el; }} data-walk={'conn-stage-in-' + c.ch} style={{ width: 9, height: 9, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #0a0a0c)', border: '1.5px solid ' + (c.color || '#38383e'), display: 'grid', placeItems: 'center', boxShadow: c.flowing ? `0 0 4px ${c.color}` : 'inset 0 0 2px #000', flex: '0 0 auto' }}>
          <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: c.srcKey ? c.color : '#222' }}/>
        </div>
        <div className="mono" style={{ fontSize: 6, color: '#e9e6df', fontWeight: 700, width: 9, textAlign: 'right', flex: '0 0 auto' }}>{c.ch}</div>
        <div className="mono" style={{ fontSize: 5, color: c.srcKey ? '#c8c8d0' : '#55555c', fontWeight: 700, whiteSpace: 'nowrap', flex: 1, overflow: 'hidden' }}>{c.label || '—'}</div>
      </div>
    </React.Fragment>
  );
  return (
    <div className="ui-no-select" data-walk="stage-box" style={{
      background: 'linear-gradient(180deg, #2a2a2e 0%, #141418 100%)',
      border: '1px solid #0a0a0c', borderRadius: 4, padding: '5px 6px 6px',
      position: 'relative', width: 92, boxShadow: 'inset 0 1px 0 #3a3a40, 0 4px 12px rgba(0,0,0,0.6)',
    }}>
      <div className="mono" style={{ fontSize: 6, color: 'var(--cool)', letterSpacing: 0.6, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>STAGE BOX</div>
      <div className="mono" style={{ fontSize: 5, color: 'var(--ink-3)', letterSpacing: 0.4, textAlign: 'center', marginBottom: 2 }}>side stage</div>
      <div className="mono" style={{ fontSize: 5, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.3, marginBottom: 1 }}>IN 1-16 → FOH</div>
      {(inChannels || []).map((c, i) => inRow(c, i))}
      <div style={{ height: 1, background: '#38383e', margin: '4px 0 3px' }}/>
      <div className="mono" style={{ fontSize: 5, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: 0.3, marginBottom: 1 }}>OUT 1-8 · returns</div>
      {outs.map(o => (
        <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 3, height: 12.5 }}>
          <div ref={el => outRefs.current[o.key] = el} data-walk={'conn-stage-out-' + o.key} style={{ width: 9, height: 9, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #2a2a2e, #0a0a0c)', border: '1.5px solid ' + o.color, display: 'grid', placeItems: 'center', boxShadow: o.active ? `0 0 4px ${o.color}` : 'inset 0 0 2px #000', flex: '0 0 auto' }}>
            <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: o.color, opacity: o.active ? 1 : 0.55 }}/>
          </div>
          <div className="mono" style={{ fontSize: 6, color: '#e9e6df', fontWeight: 700, width: 9, textAlign: 'right' }}>{o.key}</div>
        </div>
      ))}
      {/* Main snake leaves the right (off-stage) edge for FOH. */}
      <div ref={snakeOutRef} style={{ position: 'absolute', right: -2, top: '42%', width: 8, height: 8, pointerEvents: 'none' }}/>
    </div>
  );
}

function FanOutPoint({ fanOutRef }) {
  // The snake's FOH terminus. Just a small labeled anchor point — the visible
  // cables themselves are SVG paths drawn elsewhere (snake bundle in, four
  // colored fan-out tails out). No colored bars or rectangles inside the
  // anchor block; the cables tell the whole story.
  return (
    <div ref={fanOutRef} className="ui-no-select" data-walk="snake-trunk" style={{
      width: 80,
      padding: '4px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #1f1f23, #141418)',
      border: '1px solid #0a0a0c', borderRadius: 4,
      boxShadow: 'inset 0 1px 0 #2a2a2e',
    }}>
      <div className="mono" style={{ fontSize: 6.5, color: 'var(--cool)', letterSpacing: 1.2, fontWeight: 700 }}>SNAKE</div>
    </div>
  );
}

// Audience SPL meter — what the room actually sounds like to a person standing
// in front of the PA. dB SPL is mapped from the combined L/R output and the
// "safe exposure" text is derived from the NIOSH REL (3 dB exchange rate).
// Calibration is a teaching approximation, not a measurement substitute.
function AudienceSplMeter({ paL, paR, target }) {
  const avg = ((paL || 0) + (paR || 0)) / 2;
  const instantDb = dbSplFromPa(avg);
  // Real SPL meters integrate over time (LAslow uses a 1-second time constant).
  // Single-pole IIR smoothing with τ ≈ 2 seconds — slow enough that the
  // digit and the NIOSH text don't flash at the syllable rate of the
  // synthesized envelope, fast enough to register when the engineer
  // meaningfully changes a level. dt is the wall-clock interval between
  // renders, so smoothing stays correct across variable frame rates.
  const smoothedRef = React.useRef(instantDb);
  const lastTimeRef = React.useRef(performance.now());
  const now = performance.now();
  const dt = Math.max(0, Math.min(0.5, (now - lastTimeRef.current) / 1000));
  lastTimeRef.current = now;
  const tau = 2.0;
  const alpha = 1 - Math.exp(-dt / tau);
  smoothedRef.current = smoothedRef.current + alpha * (instantDb - smoothedRef.current);
  const db = smoothedRef.current;
  const dbRounded = Math.round(db);
  const exposure = nioshExposure(db);
  // Bar fill 0..1 across the visible range (60 to 120 dB SPL).
  const fill = Math.max(0, Math.min(1, (db - 60) / 60));
  // Zone thresholds mark the 85 dB SAFE-cutoff and the 100 dB damage-risk
  // line — both NIOSH-defined breakpoints — so the visual zones align with
  // the text recommendation.
  const tickSafe   = Math.max(0, Math.min(1, (85 - 60) / 60));   // ~42% across
  const tickDanger = Math.max(0, Math.min(1, (100 - 60) / 60));  // ~67% across
  // Optional room-level TARGET band (dB SPL). A level that teaches "set the
  // room level" (the PA-capped condition) passes {lo, hi} so the objective is
  // visible right on the gauge the engineer watches — no translating an
  // abstract percentage. A live show sits above the 85 dB all-day-safe line by
  // nature, so the target lands in the amber "watch" zone on purpose; the band
  // tells the student THAT loud is the goal here, not a mistake.
  const tgt = (target && Number.isFinite(target.lo) && Number.isFinite(target.hi)) ? target : null;
  const tLo = tgt ? Math.max(0, Math.min(1, (tgt.lo - 60) / 60)) : 0;
  const tHi = tgt ? Math.max(0, Math.min(1, (tgt.hi - 60) / 60)) : 0;
  const onTarget = tgt && db >= tgt.lo && db <= tgt.hi;
  const targetMsg = !tgt ? '' : onTarget ? '✓ on target' : (db < tgt.lo ? 'raise the PA →' : 'lower the PA ←');
  const zoneColor = exposure.zone === 'safe' ? 'var(--green)'
                  : exposure.zone === 'watch' ? 'var(--amber)'
                  : exposure.zone === 'limit' ? '#ffb547'
                  : 'var(--hot)';
  const zoneBg = exposure.zone === 'safe' ? 'rgba(74,222,128,0.10)'
              : exposure.zone === 'watch' ? 'rgba(255,181,71,0.10)'
              : exposure.zone === 'limit' ? 'rgba(255,181,71,0.14)'
              : 'rgba(255,70,48,0.14)';
  return (
    <div className="ui-no-select" style={{
      width: 240,
      background: zoneBg,
      border: '1px solid ' + zoneColor + '55',
      borderRadius: 5,
      padding: '5px 8px 6px',
      display: 'flex', flexDirection: 'column', gap: 3,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 2px 8px rgba(0,0,0,0.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <div className="mono" style={{ fontSize: 7, letterSpacing: 1.5, fontWeight: 700, color: 'var(--ink-3)' }}>
          LOUDNESS
        </div>
        <div className="display" style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: zoneColor, letterSpacing: -0.4 }}>
          {dbRounded}<span className="mono" style={{ fontSize: 8, fontWeight: 700, marginLeft: 3, color: zoneColor }}>dB SPL</span>
        </div>
      </div>
      {/* Horizontal bar with NIOSH breakpoint ticks at 85 dB and 100 dB */}
      <div style={{ position: 'relative', height: 7, background: '#0a0a0c', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (fill * 100) + '%', background: zoneColor, transition: 'width 0.15s ease-out, background 0.3s' }}/>
        {tgt && (
          <div style={{ position: 'absolute', left: (tLo * 100) + '%', width: ((tHi - tLo) * 100) + '%', top: 0, bottom: 0, background: 'rgba(74,222,128,0.28)', borderLeft: '1px solid var(--green)', borderRight: '1px solid var(--green)', boxShadow: onTarget ? '0 0 6px rgba(74,222,128,0.6)' : 'none' }} title={'Target: ' + Math.round(tgt.lo) + '–' + Math.round(tgt.hi) + ' dB'}/>
        )}
        <div style={{ position: 'absolute', left: (tickSafe * 100) + '%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.35)' }} title="85 dB"/>
        <div style={{ position: 'absolute', left: (tickDanger * 100) + '%', top: 0, bottom: 0, width: 1, background: 'rgba(255,70,48,0.6)' }} title="100 dB"/>
      </div>
      {tgt && (
        <div className="mono" style={{ fontSize: 7.5, letterSpacing: 0.4, fontWeight: 700, color: onTarget ? 'var(--green)' : 'var(--amber)' }}>
          AIM {Math.round(tgt.lo)}–{Math.round(tgt.hi)} dB · {targetMsg}
        </div>
      )}
      <div className="mono" style={{ fontSize: 7.5, color: zoneColor, letterSpacing: 0.4, fontWeight: 600 }}>
        {exposure.text}
      </div>
    </div>
  );
}

function Amp({ on, level, onTogglePower }) {
  const animate = on && level > 0.05;
  return (
    <div className="ui-no-select" style={{
      background: on
        ? 'linear-gradient(180deg, #2a2a2e 0%, #1a1a1d 100%)'
        : 'linear-gradient(180deg, #221518 0%, #150d10 100%)',
      border: '1px solid ' + (on ? '#0a0a0c' : '#5a2018'),
      borderRadius: 4,
      padding: '6px 10px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: on ? 'inset 0 1px 0 #3a3a40' : 'inset 0 0 0 1px rgba(90,32,24,0.4)',
      position: 'relative',
    }}>
      <PowerButton on={on} onClick={onTogglePower} width={30} height={14}/>
      <div style={{ flex: 1, height: 22, background: '#0a0a0c', border: '1px solid #38383e', borderRadius: 2, position: 'relative', overflow: 'hidden', opacity: on ? 1 : 0.45 }}>
        <div style={{ position: 'absolute', inset: 1, display: 'flex', alignItems: 'center', padding: '0 4px' }}>
          <div style={{
            height: 5, width: `${Math.min(100, level * 80)}%`,
            background: level > 0.95 ? '#ff4630' : level > 0.6 ? '#ffb547' : '#4ade80',
            borderRadius: 1, transition: 'width 0.1s',
            boxShadow: animate ? `0 0 4px ${level > 0.95 ? '#ff4630' : '#4ade80'}` : 'none',
          }}/>
        </div>
        <div className="mono" style={{ position: 'absolute', top: 1, right: 4, fontSize: 6, color: 'var(--ink-3)', letterSpacing: 0.5, fontWeight: 700 }}>VU</div>
      </div>
      <div className="mono" style={{
        fontSize: 7.5, letterSpacing: 1, fontWeight: 700, lineHeight: 1.1, textAlign: 'center',
        color: on ? 'var(--ink-2)' : '#ff8676',
      }}>POWER<br/>AMP</div>
    </div>
  );
}

function ZoneHeader({ label, sublabel, badge, accent, badgeColor }) {
  return (
    <div style={{ marginBottom: 4, paddingBottom: 4, borderBottom: '1px solid #2a2a2e' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <div className="display" style={{ fontSize: 10, color: accent || 'var(--ink-2)', fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase' }}>{label}</div>
        {badge && <div className="mono" style={{ fontSize: 7, color: badgeColor || 'var(--ink-2)', letterSpacing: 0.8, padding: '1px 5px', background: '#0a0a0c', border: '1px solid ' + (badgeColor || '#2a2a2e'), borderRadius: 2, textTransform: 'uppercase', fontWeight: 700 }}>{badge}</div>}
      </div>
      {sublabel && <div className="mono" style={{ fontSize: 7, color: 'var(--ink-3)', letterSpacing: 0.5, marginTop: 1 }}>{sublabel}</div>}
    </div>
  );
}

// A little magnifier for a zoomable region. Rendered in a layer ABOVE the cable
// overlay (so cables never cover it) and counter-scaled to a constant size. It
// toggles: a "+" magnifier zooms in on the region; once zoomed, it flips to a
// filled "-" magnifier that takes you back to the fit view (in addition to the
// FIT button top-right), and it stays put in the same spot on each region.
function ZoomBtn({ zoomed, onClick }) {
  return (
    <div onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}
      className="ui-no-select" title={zoomed ? 'Back to the fit view' : 'Zoom in on this section'}
      style={{ width: 22, height: 22, borderRadius: '50%',
        background: zoomed ? 'var(--accent)' : '#141417',
        border: '1px solid var(--accent)', color: zoomed ? '#0a0a0c' : 'var(--accent)',
        display: 'grid', placeItems: 'center', cursor: zoomed ? 'zoom-out' : 'zoom-in',
        boxShadow: '0 1px 5px rgba(0,0,0,0.6)' }}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="5" cy="5" r="3.2"/><line x1="7.4" y1="7.4" x2="10.6" y2="10.6"/>
        <line x1="3.5" y1="5" x2="6.5" y2="5"/>
        {!zoomed && <line x1="5" y1="3.5" x2="5" y2="6.5"/>}
      </svg>
    </div>
  );
}

function StageRow({ state, setState, audio, sourceKeys, sourceRefs, portRefs, snakeOutRef, outRefs, wedgeOnStageRef, wedge2OnStageRef, wedge3OnStageRef, wedge4OnStageRef, paLRef, paRRef, stageBoxRef, upHeadOutRef, instHeadOutRef, downHeadOutRef, sideInUpRef, sideInDownRef, subJackRefs, stageBoxChRefs, wedgeMargins, onOpenPlacement, onZoomTo, zoomActive }) {
  const topo = state.topology || {};
  const isPassive = topo.paRig === 'amp+passive';
  // In passive mode the cabinets are dumb — the external amp powers them, so a
  // speaker reads as "on" when the amp is on, not via any switch of its own.
  const ampPowered = !!(state.outputs.amp && state.outputs.amp.on);
  const paShowsOn = isPassive ? ampPowered : null;
  const big16 = !!state.big16;
  const nPorts = big16 ? sourceKeys.length : 4;
  const activePorts = Array.from({ length: nPorts }, (_, i) => i + 1).map(p => {
    const srcKey = sourceKeys.find(k => state.cables[k] === p);
    if (!srcKey) return null;
    const ch = state.fanOut ? state.fanOut[p - 1] : p;
    const flowing = audio.chanInSource[ch - 1] === srcKey && audio.chanIn[ch - 1] > 0.05;
    return { port: p, color: window.SOURCES[srcKey].color, flowing, srcKey };
  }).filter(Boolean);

  // Sub-snake grouping (16-channel): each group's sources in local-channel order,
  // with where each lands on the main stage box (= its console channel). The
  // drum sub-snake's ch7 (drummer vocal) lands on stage-box 14, not 7 — the patch
  // that makes this worth practicing.
  const flowOf = (k) => { const ch = window.effectiveChannel ? window.effectiveChannel(state, k) : 0; return ch >= 1 && audio.chanInSource[ch - 1] === k && audio.chanIn[ch - 1] > 0.05; };
  // Standard North American snake colour code, keyed to a snake's LOCAL channel
  // (1-8 repeat): every sub-snake head + fan-out wears these, and so does the
  // stage box (by its own channel). They only line up where the patch is 1:1.
  const SC = window.SNAKE_COLORS || [];
  const codeColor = (n) => SC[(n - 1) % 8] || '#4a4a52';
  // Sub-snake grouping (16-channel): three snakes — drums ('up'), backline
  // instruments ('inst'), vocals ('down'). Each item is coloured by its LOCAL
  // channel on that snake, not by the instrument. stageCh = where it lands on the
  // stage box (its console channel); the drum vocal lands on 14, not 7.
  const bySnake = (s) => sourceKeys.filter(k => window.SOURCES[k] && window.SOURCES[k].snake === s);
  // Sub-snakes come in 4/8/16 channels, so each head is padded up to the next
  // standard size; the unused channels render as empty jacks with a loose
  // (dangling) tail on the fan-out. Drums 7→8, backline 4, vocals 3→4.
  const buildItems = (grp, size) => {
    // Render by SLOT (input jack position). Each slot shows whichever source's
    // mic is currently plugged into it (state.micIn); default is the natural
    // 1:1 slot. Colour is by slot = the conductor the mic rides.
    const natural = (k) => grp.indexOf(k) + 1;
    const items = [];
    for (let slot = 1; slot <= size; slot++) {
      const k = grp.find(kk => micSlot(state, kk, natural(kk)) === slot);
      if (k) items.push({ srcKey: k, localCh: slot, label: window.SOURCES[k].short, color: codeColor(slot), flowing: flowOf(k), stageCh: state.cables[k] || 0 });
      else items.push({ srcKey: null, localCh: slot, color: codeColor(slot), flowing: false, stageCh: 0, empty: true });
    }
    return items;
  };
  const drumItems = big16 ? buildItems(bySnake('up'), SUBSNAKE_SIZE.up) : [];
  const instItems = big16 ? buildItems(bySnake('inst'), SUBSNAKE_SIZE.inst) : [];
  const voxItems  = big16 ? buildItems(bySnake('down'), SUBSNAKE_SIZE.down) : [];
  // Main stage box IN channels 1..16, coloured by the box channel's own place in
  // the colour code (banks of 8). The band fills 14 (drums 1-6, backline 7-10,
  // vocals 11-13, drummer vocal cross-patched to 14); 15-16 spare.
  const inChannels = big16 ? Array.from({ length: 16 }, (_, i) => {
    const ch = i + 1;
    const k = sourceKeys.find(s => (state.cables[s] || 0) === ch);
    return k ? { ch, srcKey: k, label: window.SOURCES[k].short, color: codeColor(ch), flowing: flowOf(k) }
             : { ch, srcKey: null, label: '', color: '#38383e', flowing: false };
  }) : [];
  const retActive = (() => {
    const ofan = state.outFan || window.DEFAULT_OUT_FAN;
    const busAct = {
      mainL: ((audio.mainBus?.L || 0) + (audio.mainBus?.R || 0)) > 0.05,
      mainR: ((audio.mainBus?.L || 0) + (audio.mainBus?.R || 0)) > 0.05,
      aux1: (audio.auxBus?.wedge || 0) > 0.05,
      aux2: (audio.auxBus?.wedge2 || 0) > 0.05,
      aux3: (audio.auxBus?.wedge3 || 0) > 0.05,
      aux4: (audio.auxBus?.wedge4 || 0) > 0.05,
    };
    const ra = {};
    for (const ch of [1, 2, 3, 4, 5, 6, 7, 8]) ra[ch] = ofan[ch] ? !!busAct[ofan[ch]] : false;
    return ra;
  })();

  const setOut = (key, patch) => setState({ ...state, outputs: { ...state.outputs, [key]: { ...state.outputs[key], ...patch } } });
  // Auto-follow listening position when a stage volume is adjusted, so the user
  // hears the speaker they're setting. Bundled into one setState with the
  // volume change. paInsp/wedgeInsp map the output to its listening dest.
  const setOutInspect = (key, patch, dest) => setState(prev => ({ ...prev, outputs: { ...prev.outputs, [key]: { ...prev.outputs[key], ...patch } }, inspect: dest }));
  // Which wedge is ringing right now, so it gets a red glow on stage (the
  // graphic EQ itself lives in the Monitor EQ panel). Baseline audio (no
  // envelope), matching the App's detection — keeps the glow steady instead
  // of strobing with the program level, and keeps the shared hysteresis
  // flag in detectFeedback consistent across both call sites.
  const fb = window.detectFeedback ? window.detectFeedback(state, window.computeAudio(state)) : null;
  const ringingWedge = fb ? fb.ringWedge : null;

  // Single stage area — no more flank columns. Performers sit upstage
  // (bass DI, keys DI) and mid-stage (vocal 1, vocal 2). The downstage
  // row is shared by all four output destinations: PA L, Wedge 1, Wedge 2,
  // PA R — evenly spaced. Their cables exit each component's bottom edge
  // and run along the front rail to the stage box at the upstage-right
  // corner. Source cables route along the back rail.
  const SRC_W = 154;
  // The six drum mics render as a compact cluster upstage-centre, the way a real
  // stage plot groups the kit; every other instrument sits as its own card around
  // the stage. Each drum still has its own cable to the stage box, so the kit is 6
  // real inputs, not one. Drum tiles are narrow; band instrument cards are a
  // touch narrower than the MX-8's so all fourteen fit without crowding.
  // The drum cluster = every source on the drum (upstage) sub-snake, INCLUDING the
  // drummer's vocal, so they all render as compact tiles packed around the kit.
  const isDrum = (k) => big16 && window.SOURCES[k] && window.SOURCES[k].snake === 'up';
  const wOf = (k) => big16 ? (isDrum(k) ? 84 : 132) : SRC_W;
  // Stage-plot layout (audience perspective, downstage = bottom):
  //   MX-8: Vocal 1/2 mid-stage over their wedges, Bass + Keys DI upstage.
  //   Band: drum cluster + drummer vocal upstage-centre; bass and keys upstage
  //     corners; the two guitars mid; the three front vocals downstage.
  // top + left only; the per-source marginLeft (to centre on `left`) is applied
  // in the map from wOf(k) so each card centres on its own width.
  // Where the mains stand, on the stage plot. The plan view runs downstage DOWN,
  // so a bigger paLine sits lower. Calibrated so the default (PA_LINE_DEFAULT)
  // lands exactly where the boxes have always been drawn, which means no existing
  // lesson's stage moves. Dragged fully upstage the boxes end up ABOVE the vocal
  // mic row, so "the mics are out past the PA" is something you SEE rather than
  // something you have to open a panel to discover (Kyle 2026-07-24).
  // Pixels per metre of mains travel. With the singers moved onto the downstage
  // line the boxes only have to move a little to end up behind them, so this is
  // much smaller than it was: the old range walked the mains to the middle of the
  // stage, which is not a thing that happens at a show (Kyle 2026-07-24).
  const PA_PX_PER_M = big16 ? 49 : 35;
  // Half a main speaker's height, so the mains line lands on the plane of the
  // boxes rather than 16 px downstage of it.
  const PA_HALF = 63;
  const paLine = window.paLineOf ? window.paLineOf(state) : 2.4;
  const paBase = big16 ? 48 : 40;
  const paBottom = paBase + (2.4 - paLine) * PA_PX_PER_M;
  const setPaLine = (clientY, el) => {
    const box = el && el.closest('[data-stage-plot]');
    if (!box) return;
    const r = box.getBoundingClientRect();
    // invert the mapping: pointer y -> bottom offset -> metres
    const bottom = r.bottom - clientY - PA_HALF;
    const v = 2.4 - (bottom - paBase) / PA_PX_PER_M;
    const lo = window.PA_LINE_MIN != null ? window.PA_LINE_MIN : -1.2;
    const hi = window.PA_LINE_MAX != null ? window.PA_LINE_MAX : 2.6;
    setState((prev) => ({ ...prev, paLine: Math.round(Math.max(lo, Math.min(hi, v)) * 20) / 20 }));
  };
  // A plain object literal here is re-created on every render, so the drag flag
  // reset itself the moment the first pointermove called setState and the drag
  // died after one frame. It has to be a ref that survives renders.
  const paDragRef = React.useRef(false);
  // The speaker's own controls live INSIDE the drag wrapper, so a pointerdown on
  // one of them used to start a position drag as well. Capturing the pointer on
  // the wrapper retargets every later move, pointerup and click to the wrapper,
  // so the volume knob, the mute pad, the power button and the SIG lamp all went
  // dead and the cabinet slid upstage instead. That broke every lesson that asks
  // a student to set the main speaker level (Kyle hit it on a live stream,
  // 2026-07-30). The cabinet drags; anything that is its own control does not.
  // Any NEW control added to PASpeaker must be a <button>, carry role="slider",
  // or be marked data-nodrag, or it will be swallowed the same way.
  const paCtl = (t) => !!(t && t.closest && t.closest('[role="slider"], button, .toggle, [data-nodrag]'));

  const positions = big16 ? {
    // Drum kit tucked hard against the UPSTAGE edge, bird's-eye tight cluster:
    // VOX 4 (drummer) on top, snare below, kick below that; toms hugging the
    // stack, overheads just outside. Their cables come out the SIDES and run down
    // to the drum sub-snake (in front of the kit).
    vx4:   { top: 40,  left: '50%' },              // the drummer (vocal mic), top of the stack
    snare: { top: 106, left: '50%' },              // snare, below the drummer
    kick:  { top: 172, left: '50%' },              // kick, below the snare
    rack:  { top: 138, left: '57%' },              // rack tom, right of the stack
    floor: { top: 138, left: '43%' },              // floor tom, left of the stack
    ohr:   { top: 138, left: '66%' },              // overhead R, right of the rack tom
    ohl:   { top: 138, left: '34%' },              // overhead L, left of the floor tom
    // Backline amps sit on the SAME upstage line as the drums — a real backline
    // row. The kit holds the centre, so the amps flank it: bass + electric to
    // stage-left (nearest Vocal 2 / Vocal 1), acoustic + keys to stage-right
    // (Vocal 1 / Vocal 3). They drop down into the backline sub-snake below.
    bass:  { top: 150, left: '10%' },              // bass rig, far stage-left
    egtr:  { top: 150, left: '24%' },              // electric gtr, left of the kit
    agtr:  { top: 150, left: '76%' },              // acoustic gtr, right of the kit
    keys:  { top: 150, left: '88%' },              // keys rig, far stage-right
    // The three singers hard on the DOWNSTAGE line, each directly over its own
    // wedge, numbered 1-2-3 left to right. They used to sit at 476, the middle of
    // the stage, with 122 px of empty floor between them and their wedges, which
    // is not where a singer stands and it forced the mains to travel halfway up
    // the stage to get behind them (Kyle 2026-07-24).
    vx1:   { top: 548, left: '26%' },              // Vocal 1 — stage-left
    vx2:   { top: 548, left: '46%' },              // Vocal 2 — centre
    vx3:   { top: 548, left: '66%' },              // Vocal 3 — stage-right
  } : {
    // MX-8 stage plot (audience at the bottom, screen = FOH view). Two mirrored
    // columns so the vocal channels read left-to-right from FOH: Vocal 1 on the
    // LEFT with the bass rig behind it and Wedge 1 under it; Vocal 2 on the RIGHT
    // with the keys rig behind it and Wedge 2 under it. Everything feeds the
    // stage box on the right edge.
    guitar: { top: 44,  left: '24%', marginLeft: -(SRC_W / 2) },            // bass DI — upstage left, behind Vocal 1
    laptop: { top: 44,  left: '58%', marginLeft: -(SRC_W / 2) },            // keys DI — upstage right, behind Vocal 2
    vocal:  { top: 226, left: '28%', marginLeft: -(SRC_W / 2) },            // vocal 1 — downstage left, over Wedge 1
    vocal2: { top: 226, left: '54%', marginLeft: -(SRC_W / 2) },            // vocal 2 — downstage right, over Wedge 2
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(28,28,32,0.45) 0%, rgba(14,14,16,0.35) 100%)',
      border: '1px solid #2a2a2e', borderRadius: 8,
      padding: '8px 12px 10px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <ZoneHeader label="Stage" sublabel="band, sources, mains + wedges · downstage ↓ audience" badge="LIVE AREA" badgeColor="var(--green)"/>

      <div data-stage-plot="1" style={{ position: 'relative', minHeight: big16 ? 900 : 512 }}>
        {/* DRUM RISER — a labelled platform outline around the whole kit cluster
            (kick, snare, toms, overheads), the drummer's vocal mic (VOX 4) and
            the drummer's monitor (Wedge 4). Renders first so it paints UNDER the
            tiles and cables; pointerEvents none so clicks pass through to the
            mics on top. Teaches that the kit + the drummer's mic and wedge are
            one physical zone on the stage. */}
        {big16 && (
          <div style={{ position: 'absolute', left: '30%', width: '40%', top: 16, height: 230,
            border: '1.5px dashed #4a4a52', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', pointerEvents: 'none', zIndex: 0 }}>
            <div className="mono" style={{ position: 'absolute', top: 6, left: 12, fontSize: 8,
              letterSpacing: 1.6, fontWeight: 700, color: '#8a8792' }}>DRUM RISER</div>
          </div>
        )}
        {/* THE MAINS LINE. On a real stage plot you read the in-front / behind
            relationship straight off the drawing, so it is drawn here: the plane
            of the main speakers, running the width of the stage. Every open mic
            belongs UPSTAGE of it. A mic below this line is out in the coverage
            and will ring long before it is loud (Kyle 2026-07-24). Turns red the
            moment any source card crosses to the wrong side of it. */}
        {(() => {
          const micsBehind = paLine >= 0.15;
          const col = micsBehind ? 'rgba(122,122,132,0.55)' : 'var(--hot)';
          return (
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: paBottom + PA_HALF, pointerEvents: 'none', zIndex: 1 }}>
              <div style={{ borderTop: '1px dashed ' + col, opacity: micsBehind ? 0.8 : 1 }}/>
              <div className="mono" style={{ position: 'absolute', right: 4, top: 2, fontSize: 7,
                letterSpacing: 1.2, fontWeight: 700, color: col, whiteSpace: 'nowrap' }}>
                {micsBehind ? 'MAINS LINE · MICS BEHIND' : 'MAINS LINE · MICS OUT IN FRONT'}
              </div>
            </div>
          );
        })()}

        {/* Downstage row — PA L, Wedge 1, Wedge 2, PA R, evenly spaced along
            the front of the stage. Each one's cable comes out of its bottom
            edge and runs along the front rail back to the stage box. */}
        <div ref={paLRef} data-walk="out-pa-l" title="Drag upstage or downstage. Every open mic belongs behind the front face of the mains."
          onPointerDown={(e) => { if (paCtl(e.target)) return; paDragRef.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} }}
          onPointerMove={(e) => { if (paDragRef.current) setPaLine(e.clientY, e.currentTarget); }}
          onPointerUp={() => { paDragRef.current = false; }} onPointerCancel={() => { paDragRef.current = false; }}
          style={{ position: 'absolute', cursor: 'ns-resize', bottom: paBottom, left: big16 ? '11%' : '7%', transform: 'translateX(-50%)' }}>
          <PASpeaker side="L" showPower={!isPassive}
            on={isPassive ? paShowsOn : state.outputs.pa_l.on} mute={state.outputs.pa_l.mute} volume={state.outputs.pa_l.volume} level={audio.outputs.pa_l}
            signalArriving={(audio.speakerInput?.pa_l || 0) > 0.04}
            onTogglePower={() => setOut('pa_l', { on: !state.outputs.pa_l.on })}
            onToggleMute={() => setOut('pa_l', { mute: !state.outputs.pa_l.mute })}
            onVolume={(v) => setOutInspect('pa_l', { volume: v }, 'pa')}
            marginInfo={wedgeMargins && window.feedbackMarginInfo ? window.feedbackMarginInfo(wedgeMargins.mains) : null}
            isInspected={state.inspect === 'pa'}
            onSelect={() => setState({ ...state, inspect: 'pa' })}/>
        </div>

        {topo.wedgeLocation === 'stage' && (
          <div ref={wedgeOnStageRef} data-walk="out-wedge1" style={{ position: 'absolute', bottom: big16 ? 96 : 76, left: big16 ? '26%' : '28%', transform: 'translateX(-50%)' }}>
            <Wedge label="WEDGE 1" on={state.outputs.wedge.on} mute={state.outputs.wedge.mute} volume={state.outputs.wedge.volume} level={audio.outputs.wedge}
              onTogglePower={() => setOut('wedge', { on: !state.outputs.wedge.on })}
              onToggleMute={() => setOut('wedge', { mute: !state.outputs.wedge.mute })}
              onVolume={(v) => setOutInspect('wedge', { volume: v }, 'wedge')}
              ringing={ringingWedge === 'wedge'}
              marginInfo={wedgeMargins && window.feedbackMarginInfo ? window.feedbackMarginInfo(wedgeMargins.wedge) : null}
              isInspected={state.inspect === 'wedge'}
              onSelect={() => setState({ ...state, inspect: 'wedge' })}/>
          </div>
        )}

        {topo.wedgeLocation === 'stage' && (
          <div ref={wedge2OnStageRef} data-walk="out-wedge2" style={{ position: 'absolute', bottom: big16 ? 96 : 76, left: big16 ? '46%' : '54%', transform: 'translateX(-50%)' }}>
            <Wedge label="WEDGE 2" accent="var(--cool)" on={state.outputs.wedge2.on} mute={state.outputs.wedge2.mute} volume={state.outputs.wedge2.volume} level={audio.outputs.wedge2}
              onTogglePower={() => setOut('wedge2', { on: !state.outputs.wedge2.on })}
              onToggleMute={() => setOut('wedge2', { mute: !state.outputs.wedge2.mute })}
              onVolume={(v) => setOutInspect('wedge2', { volume: v }, 'wedge2')}
              ringing={ringingWedge === 'wedge2'}
              marginInfo={wedgeMargins && window.feedbackMarginInfo ? window.feedbackMarginInfo(wedgeMargins.wedge2) : null}
              isInspected={state.inspect === 'wedge2'}
              onSelect={() => setState({ ...state, inspect: 'wedge2' })}/>
          </div>
        )}

        {/* Wedge 3 + Wedge 4 exist only on the 16-channel band stage (drummer's
            wedge etc). The MX-8 runs two vocal wedges only — Vocal 1 → Wedge 1,
            Vocal 2 → Wedge 2 — so W3/W4 are not on the small stage. */}
        {topo.wedgeLocation === 'stage' && big16 && (
          <div ref={wedge3OnStageRef} data-walk="out-wedge3" style={{ position: 'absolute', ...(big16 ? { bottom: 96, left: '66%' } : { bottom: 76, left: '54%' }), transform: 'translateX(-50%)' }}>
            <Wedge label="WEDGE 3" accent="var(--green)" on={state.outputs.wedge3.on} mute={state.outputs.wedge3.mute} volume={state.outputs.wedge3.volume} level={audio.outputs.wedge3}
              onTogglePower={() => setOut('wedge3', { on: !state.outputs.wedge3.on })}
              onToggleMute={() => setOut('wedge3', { mute: !state.outputs.wedge3.mute })}
              onVolume={(v) => setOutInspect('wedge3', { volume: v }, 'wedge3')}
              ringing={ringingWedge === 'wedge3'}
              marginInfo={wedgeMargins && window.feedbackMarginInfo ? window.feedbackMarginInfo(wedgeMargins.wedge3) : null}
              isInspected={state.inspect === 'wedge3'}
              onSelect={() => setState({ ...state, inspect: 'wedge3' })}/>
          </div>
        )}

        {topo.wedgeLocation === 'stage' && big16 && (
          <div ref={wedge4OnStageRef} data-walk="out-wedge4" style={{ position: 'absolute', ...(big16 ? { top: 44, left: '60%' } : { bottom: 96, left: '68%' }), transform: 'translateX(-50%)' }}>
            <Wedge label="WEDGE 4" accent="var(--amber)" on={state.outputs.wedge4.on} mute={state.outputs.wedge4.mute} volume={state.outputs.wedge4.volume} level={audio.outputs.wedge4}
              onTogglePower={() => setOut('wedge4', { on: !state.outputs.wedge4.on })}
              onToggleMute={() => setOut('wedge4', { mute: !state.outputs.wedge4.mute })}
              onVolume={(v) => setOutInspect('wedge4', { volume: v }, 'wedge4')}
              ringing={ringingWedge === 'wedge4'}
              marginInfo={wedgeMargins && window.feedbackMarginInfo ? window.feedbackMarginInfo(wedgeMargins.wedge4) : null}
              isInspected={state.inspect === 'wedge4'}
              onSelect={() => setState({ ...state, inspect: 'wedge4' })}/>
          </div>
        )}

        <div ref={paRRef} data-walk="out-pa-r" title="Drag upstage or downstage. Every open mic belongs behind the front face of the mains."
          onPointerDown={(e) => { if (paCtl(e.target)) return; paDragRef.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {} }}
          onPointerMove={(e) => { if (paDragRef.current) setPaLine(e.clientY, e.currentTarget); }}
          onPointerUp={() => { paDragRef.current = false; }} onPointerCancel={() => { paDragRef.current = false; }}
          style={{ position: 'absolute', cursor: 'ns-resize', bottom: paBottom, left: big16 ? '89%' : '73%', transform: 'translateX(-50%)' }}>
          <PASpeaker side="R" showPower={!isPassive}
            on={isPassive ? paShowsOn : state.outputs.pa_r.on} mute={state.outputs.pa_r.mute} volume={state.outputs.pa_r.volume} level={audio.outputs.pa_r}
            signalArriving={(audio.speakerInput?.pa_r || 0) > 0.04}
            onTogglePower={() => setOut('pa_r', { on: !state.outputs.pa_r.on })}
            onToggleMute={() => setOut('pa_r', { mute: !state.outputs.pa_r.mute })}
            onVolume={(v) => setOutInspect('pa_r', { volume: v }, 'pa')}
            marginInfo={wedgeMargins && window.feedbackMarginInfo ? window.feedbackMarginInfo(wedgeMargins.mains) : null}
            isInspected={state.inspect === 'pa'}
            onSelect={() => setState({ ...state, inspect: 'pa' })}/>
        </div>

        {isPassive && (
          <div style={{ position: 'absolute', top: 4, left: '7%', transform: 'translateX(-50%)' }}>
            <Amp on={state.outputs.amp ? state.outputs.amp.on : false}
                 level={(audio.outputs.pa_l + audio.outputs.pa_r) / 2}
                 onTogglePower={() => {
                   setState(prev => {
                     const wasOn = !!(prev.outputs.amp && prev.outputs.amp.on);
                     const turningOn = !wasOn;
                     const next = { ...prev, outputs: { ...prev.outputs, amp: { ...prev.outputs.amp, on: !wasOn } } };
                     if (turningOn && window.wouldBlastOnAmpOn && window.wouldBlastOnAmpOn(prev)) {
                       next.phantomPop = { at: Date.now(), cause: 'amp_loud' };
                     }
                     return next;
                   });
                 }}/>
          </div>
        )}


        {/* Sources — bass DI + keys DI upstage; vocal mics mid-stage */}
        {sourceKeys.map(k => (
          <div key={k} ref={el => sourceRefs.current[k] = el}
               style={{ position: 'absolute', width: wOf(k), marginLeft: -(wOf(k) / 2), ...positions[k] }}>
            <SourceCard
              srcKey={k}
              label={isDrum(k) ? window.SOURCES[k].short : window.SOURCES[k].label}
              kind={window.SOURCES[k].kind}
              diActive={window.SOURCES[k].diActive}
              compact={isDrum(k)}
              onOpenPlacement={onOpenPlacement}
              muted={!!(state.programMute && state.programMute[k])}
              isTesting={state.testing === k}
              onTest={() => setState({ ...state, testing: k })}
              onMute={() => setState(s => ({ ...s, programMute: { ...s.programMute, [k]: !(s.programMute && s.programMute[k]) } }))}
              onPatch={() => {
                // Cycle this source through 0 (unplugged) → 1 → … → nPorts → 0.
                // Functional setState so a rapid double-click sees the latest
                // state, and the pop checks use the same `prev` we mutate.
                setState(prev => {
                  const cur = prev.cables[k];
                  const next = (cur + 1) % (nPorts + 1);
                  const result = { ...prev, cables: { ...prev.cables, [k]: next } };
                  const fanOut = prev.fanOut || [1, 2, 3, 4];
                  // DISCONNECT side: pulling the cable out of its current
                  // port is a contact transient too. Pops if the channel it
                  // was feeding has an open path to a live speaker.
                  if (cur > 0) {
                    const oldCh = fanOut[cur - 1];
                    if (oldCh >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(prev, oldCh - 1)) {
                      result.phantomPop = { channel: oldCh - 1, at: Date.now(), cause: 'patch_live' };
                    }
                  }
                  // CONNECT side: plugging into a port whose channel is live.
                  if (next > 0 && window.wouldPopOnPlug && window.wouldPopOnPlug(prev, k, next)) {
                    result.phantomPop = { channel: (fanOut[next - 1] || 1) - 1, at: Date.now(), cause: 'plug' };
                  }
                  return result;
                });
              }}
              patchTarget={state.cables[k]}
              patchColor={window.SOURCES[k].color}
              signalFlowing={state.testing === k && !state.sourceMute[k]}
            />
          </div>
        ))}

        {/* Stage Box at upstage-RIGHT, pulled slightly downstage so the snake
            exits at roughly the same Y as the FOH fan-out (and stays below
            the console panel's header label instead of cutting through it). */}
        {big16 ? (
          <>
            {/* Drum sub-snake box — sits in FRONT of the kick (just below the
                kit). It's dropped clear of the kick so there's an open lane
                between the kit and the box: the drum mic cables run DOWN into
                that lane, along it, then straight down into their channels —
                no cable crosses a drum card. */}
            {/* Invisible bounding region for the drum-group zoom: spans the drum
                riser (the mics) down through the drum sub-snake, so zooming here
                frames the whole kit-to-snake patch and the runs stay traceable. */}
            <div data-zoomable data-zoom-key="drum" style={{ position: 'absolute', left: '29%', width: '42%', top: 14, height: 300, pointerEvents: 'none' }}/>
            <div style={{ position: 'absolute', top: 256, left: '50%', transform: 'translateX(-50%)' }}>
              <SubSnakeHead label="DRUM SUB-SNAKE" group="up" items={drumItems} subJackRefs={subJackRefs} outRef={upHeadOutRef}/>
            </div>
            {/* Backline sub-snake — centred just downstage of the two sub-snake
                boxes, with an open lane above it: the flanking bass, guitars and
                keys drop DOWN off the backline row into that lane and in to their
                channels. */}
            <div data-zoomable data-zoom-key="backline" style={{ position: 'absolute', top: 356, left: '46%', transform: 'translateX(-50%)' }}>
              <SubSnakeHead label="BACKLINE SUB-SNAKE" group="inst" items={instItems} subJackRefs={subJackRefs} outRef={instHeadOutRef}/>
            </div>
            {/* Vocal sub-snake box — pushed downstage BELOW the wedge line, in
                the gap between Wedge 1 and Wedge 2, so nothing sits between each
                singer and their wedge (the pairing reads cleanly). The three
                vocal mics drop down through that gap into it; its multicore runs
                up and over to the main box on the LEFT of the stage, clear of
                Wedge 4's return on the right. */}
            <div data-zoomable data-zoom-key="vocal" style={{ position: 'absolute', top: 806, left: '36%', transform: 'translateX(-50%)' }}>
              <SubSnakeHead label="VOCAL SUB-SNAKE" group="down" items={voxItems} subJackRefs={subJackRefs} outRef={downHeadOutRef}/>
            </div>
            {/* Side-stage box — a vertical 16-in / 8-out rack on the stage-right
                edge. The drum snake fans into IN 1-6 (+ the drummer's vocal
                cross-patched to 14), the downstage snake into 7-13; the main
                snake leaves the right edge for FOH. */}
            <div ref={stageBoxRef} data-zoomable data-zoom-key="stagebox" style={{ position: 'absolute', top: 196, right: 6 }}>
              <SideStageBox inChannels={inChannels} stageChRefs={stageBoxChRefs} outRefs={outRefs} snakeOutRef={snakeOutRef} retActive={retActive}/>
            </div>
          </>
        ) : (
          <div ref={stageBoxRef} data-zoomable data-zoom-key="stagebox" style={{ position: 'absolute', top: 150, right: 6 }}>
            <NativeSnakeBox
              portRefs={portRefs}
              outRefs={outRefs}
              activePorts={activePorts}
              snakeOutRef={snakeOutRef}
              /* Out-port LEDs reflect what's riding each snake return channel
                 (pre-speaker): the desk output patched to that channel at FOH
                 must be carrying signal. Speaker state sits downstream. */
              retActive={retActive}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ConsolePanel({ state, setState, audio, channelRefs, masterLRef, masterRRef, aux1Ref, aux2Ref, aux3Ref, aux4Ref, fanOutRef, sourceKeys, surface, onSetSurface, canDigital, surfaceLocked }) {
  // Effective surface: free tier can never land on digital even if a stale
  // profile says so (the toggle gates it, this is the belt-and-suspenders).
  // Guided content (walkthrough/lesson) is authored against the analog strip
  // and its spotlight anchors, so those force analog and hide the toggle
  // (surfaceLocked) — the App passes surface='analog' in that case too.
  // The 16-channel board (state.big16) forces analog for the same reason and
  // nothing else any more. It used to be locked for two reasons that are now
  // handled: the big16 meter path skips the per-frame React render and drives
  // meters only through mkeys, and the digital strips had none (so they would
  // have sat still); and the surface assumed the small desk — a hardcoded
  // "DX-6" header, AUX 1/2 bus masters only, and a factory patch list only as
  // long as the 8-channel channel list. The digital meters now carry mkeys, the
  // header reads consoleInputs, the bus layer adds WEDGE 3/4, and a re-patch
  // extends the list before it writes.
  const sfc = (surface === 'digital' && canDigital) ? 'digital' : 'analog';
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(40,30,12,0.4) 0%, rgba(20,16,8,0.35) 100%)',
      border: '1px solid #3a2f15', borderRadius: 8,
      padding: '8px 12px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative',
      flex: 1, alignSelf: 'stretch',
    }}>
      {/* Invisible bounding region for the SNAKE FAN-OUT zoom — frames the snake
          terminus, the fanning tails, and the input-port chips at the top of the
          channels. Picked up by the stage measurement effect ([data-zoomable]);
          renders a zoom button on the console for both the MX-8 and MX-16 desks. */}
      <div data-zoomable data-zoom-key="fanout" style={{ position: 'absolute', top: 34, left: 8, right: 8, height: 208, pointerEvents: 'none', zIndex: 0 }}/>
      <ZoneHeader
        label="Console (FOH)"
        sublabel="the mix desk"
        badge={(sfc === 'digital' ? 'DX-' : 'MX-') + consoleInputs(state)}
        badgeColor="var(--accent)"
      />
      {/* SURFACE toggle — same scenario, analog strip layout or digital
          select-then-edit. Digital is a member feature; on the free tier the
          DIGITAL button opens the member pitch instead of switching. Hidden
          during guided content (surfaceLocked), which is authored for the
          analog strip and would show a coach pointing at controls the digital
          surface has no spotlight anchors for. */}
      {!surfaceLocked && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <div className="mono" style={{ fontSize: 7.5, color: 'var(--ink-3)', letterSpacing: 1.5, fontWeight: 700 }}>SURFACE</div>
        <div style={{ display: 'flex', border: '1px solid #38383e', borderRadius: 4, overflow: 'hidden' }}>
          {[['analog', 'ANALOG'], ['digital', 'DIGITAL']].map(([opt, lbl], i) => {
            const on = sfc === opt;
            const locked = opt === 'digital' && !canDigital;
            return (
              <button key={opt} onClick={() => onSetSurface && onSetSurface(opt)} className="mono ui-no-select" style={{
                padding: '3px 11px', fontSize: 8.5, fontWeight: 800, letterSpacing: 0.8, cursor: 'pointer',
                color: on ? '#0a0a0c' : (locked ? 'var(--ink-3)' : 'var(--ink-2)'),
                background: on ? 'var(--accent)' : '#141417',
                border: 'none',
                borderLeft: i === 0 ? 'none' : '1px solid #38383e',
              }}>{lbl}{locked ? ' 🔒' : ''}</button>
            );
          })}
        </div>
      </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <FanOutPoint fanOutRef={fanOutRef}/>
      </div>
      {/* Flexible spacer between the snake fan-out and the channel chip bar.
          Grows to fill whatever vertical room the column has left after the
          console rows are laid out, so the fan-out cables get visible breathing
          room (no crowded chip-to-snake handoff). Floor at 50 keeps a usable
          cable run even when the column is short. */}
      <div style={{ flex: 1, minHeight: 50 }}/>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {sfc === 'digital'
          ? <DigitalConsoleWithRefs state={state} setState={setState} audio={audio}
              channelRefs={channelRefs} masterLRef={masterLRef} masterRRef={masterRRef} aux1Ref={aux1Ref} aux2Ref={aux2Ref} aux3Ref={aux3Ref} aux4Ref={aux4Ref}/>
          : <ConsoleWithRefs state={state} setState={setState} audio={audio}
              channelRefs={channelRefs} masterLRef={masterLRef} masterRRef={masterRRef} aux1Ref={aux1Ref} aux2Ref={aux2Ref} aux3Ref={aux3Ref} aux4Ref={aux4Ref}/>}
      </div>
    </div>
  );
}

function ChannelAnchors({ state, setState, channelRefs, masterLRef, masterRRef, aux1Ref, aux2Ref, aux3Ref, aux4Ref }) {
  const stripWidth = 100, gap = 8, padding = 14, dividerWidth = 1, masterWidth = 150;
  const anchors = [];
  const masterLeft = padding + state.channels.length * (stripWidth + gap) + dividerWidth + 4 + masterWidth / 2;

  // Uniform chip style for every label across the top — inputs and outputs
  // share the same visual so the whole thing reads as one bar.
  const chip = (key, attachRef, x, label, dest, color) => (
    <div key={key} ref={attachRef} data-walk={'conn-' + key}
      className="ui-no-select"
      style={{
        position: 'absolute', top: -28, left: x, transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        pointerEvents: 'none',
      }}>
      <div className="mono" style={{
        fontSize: 6.5, color, letterSpacing: 0.4, fontWeight: 700, lineHeight: 1,
        background: '#0a0a0c', padding: '2px 4px',
        border: '1px solid ' + color, borderRadius: 2,
        whiteSpace: 'nowrap',
      }}>{label}</div>
      <div className="mono" style={{
        fontSize: 5.5, color: 'var(--ink-3)', letterSpacing: 0.4, lineHeight: 1.2, fontWeight: 700,
        whiteSpace: 'nowrap',
      }}>→ {dest}</div>
    </div>
  );

  // INPUTS — one chip per channel. Top label is the SNAKE INPUT PORT
  // (1-4) whose tail lands on this channel input; subtitle is the channel
  // the tail terminates at. Real consoles label by input number, not by
  // source name. With a crossed fan-out (e.g. the "Crossed at the Fan-Out"
  // level), the input port doesn't match the channel — that mismatch is
  // the lesson.
  const fanOut = state.fanOut || [1, 2, 3, 4];
  for (let i = 0; i < state.channels.length; i++) {
    const left = padding + i * (stripWidth + gap) + stripWidth / 2;
    const srcKey = window.sourceFor ? window.sourceFor(state, i) : null;
    const src = srcKey ? window.SOURCES[srcKey] : null;
    // Which snake input port's tail terminates at this channel? Invert the
    // fan-out map: port p → channel fanOut[p-1]. Find the port that maps to
    // channel i+1. With a default fan-out it's i+1; with a crossed fan-out
    // the port number diverges from the channel number — that's the
    // teaching moment.
    const portIdx = fanOut.findIndex(ch => ch === i + 1);
    const inputPort = portIdx >= 0 ? portIdx + 1 : null;
    // Chip wears the SNAKE CHANNEL color of the tail landing here (resistor
    // code), so a correctly patched desk reads brown 1, red 2, orange 3,
    // yellow 4 left to right. The FOH line input keeps its source color.
    const color = srcKey === 'playback'
      ? (src ? src.color : '#4a4a52')
      : (inputPort != null ? ((window.SNAKE_COLORS || [])[(inputPort - 1) % 8] || '#4a4a52') : '#4a4a52');
    // Playback is a FOH line input plugged into the desk, not a snake port, so
    // it's labelled LINE IN rather than getting a (nonexistent) INPUT number.
    const label = srcKey === 'playback' ? 'LINE IN' : (inputPort != null ? `INPUT ${inputPort}` : 'INPUT —');
    anchors.push(chip('in-' + i, el => channelRefs.current[i + 1] = el, left, label, `CH ${i + 1}`, color));
  }

  // OUTPUTS — four chips above the master section. Spacing has to leave room
  // for the chip widths so they don't overlap.
  // Output chips wear the color of the snake return channel connected to
  // them (8-channel standard: 5 green, 6 blue, 7 violet, 8 gray) — exactly
  // like the input chips wear their tail's channel color. Gray = nothing
  // connected to that output yet.
  const ofanChips = state.outFan || window.DEFAULT_OUT_FAN;
  const chipColorFor = (outKey) => {
    const ch = [1, 2, 3, 4, 5, 6].find(c2 => ofanChips[c2] === outKey);
    return ch ? ((window.SNAKE_COLORS || [])[ch - 1] || '#4a4a52') : '#4a4a52';
  };
  // Six console outputs now: Main L/R plus an aux send per wedge. Spaced tight
  // and centered over the master so the six chips don't overrun its width.
  const outputs = [
    { ref: masterLRef, x: masterLeft - 75, label: 'MAIN L', dest: 'MAIN · L', color: chipColorFor('mainL') },
    { ref: masterRRef, x: masterLeft - 45, label: 'MAIN R', dest: 'MAIN · R', color: chipColorFor('mainR') },
    { ref: aux1Ref,    x: masterLeft - 15, label: 'AUX 1',  dest: 'WEDGE 1', color: chipColorFor('aux1') },
    { ref: aux2Ref,    x: masterLeft + 15, label: 'AUX 2',  dest: 'WEDGE 2', color: chipColorFor('aux2') },
    { ref: aux3Ref,    x: masterLeft + 45, label: 'AUX 3',  dest: state.big16 ? 'WEDGE 3' : 'SPARE', color: chipColorFor('aux3') },
    { ref: aux4Ref,    x: masterLeft + 75, label: 'AUX 4',  dest: state.big16 ? 'WEDGE 4' : 'SPARE', color: chipColorFor('aux4') },
  ];
  outputs.forEach(o => {
    anchors.push(chip('out-' + o.label, o.ref, o.x, o.label, o.dest, o.color));
  });

  // FOH PLAYBACK DEVICE — the laptop or phone at the desk, hardwired into the
  // stereo 5/6 line input. It isn't on stage and never touches the snake, so it
  // lives right above its own channel's LINE IN chip as a visible source. A
  // short patch cord drops from the device into the input.
  const playbackIdx = state.channels.findIndex(c => c.stereo);
  let playbackDevice = null;
  if (playbackIdx >= 0) {
    const px = padding + playbackIdx * (stripWidth + gap) + stripWidth / 2;
    const blue = (window.SOURCES && window.SOURCES.playback ? window.SOURCES.playback.color : '#6aa9ff');
    playbackDevice = (
      <div key="playback-device" className="ui-no-select" style={{
        position: 'absolute', top: -82, left: px, transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
        pointerEvents: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'linear-gradient(180deg,#1c1c1f 0%, #141417 100%)',
          border: '1px solid ' + blue, borderRadius: 5, padding: '4px 7px',
        }}>
          <LaptopIcon size={22}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.15 }}>
            <span className="mono" style={{ fontSize: 7, color: blue, letterSpacing: 0.5, fontWeight: 700 }}>PLAYBACK</span>
            {/* MUSIC / PINK toggle. pointerEvents re-enabled (the anchor layer is
                otherwise click-through). Pink noise is the ring-out test signal. */}
            <div style={{ display: 'flex', pointerEvents: 'auto' }}>
              {[['music', 'MUSIC'], ['pink', 'PINK']].map(([mode, lbl], i) => {
                const on = (state.playbackMode || 'music') === mode;
                return (
                  <div key={mode}
                    onClick={(e) => { e.stopPropagation(); if (setState) setState(s => ({ ...s, playbackMode: mode })); }}
                    className="mono ui-no-select"
                    style={{
                      fontSize: 6, fontWeight: 700, letterSpacing: 0.4, padding: '2px 5px', cursor: 'pointer',
                      color: on ? '#0a0a0c' : 'var(--ink-3)',
                      background: on ? blue : '#0a0a0c',
                      borderTop: '1px solid ' + (on ? blue : '#38383e'),
                      borderBottom: '1px solid ' + (on ? blue : '#38383e'),
                      borderLeft: '1px solid ' + (on ? blue : '#38383e'),
                      borderRight: i === 0 ? 'none' : ('1px solid ' + (on ? blue : '#38383e')),
                      borderRadius: i === 0 ? '3px 0 0 3px' : '0 3px 3px 0',
                    }}>{lbl}</div>
                );
              })}
            </div>
          </div>
        </div>
        {/* short patch cord into the LINE IN chip below */}
        <svg width="10" height="20" viewBox="0 0 10 20" style={{ marginTop: -1 }}>
          <path d="M5 0 L5 18" stroke={blue} strokeWidth="2" strokeLinecap="round"/>
          <circle cx="5" cy="18" r="2" fill={blue}/>
        </svg>
      </div>
    );
  }

  return <>{anchors}{playbackDevice}</>;
}

function ConsoleWithRefs({ state, setState, audio, channelRefs, masterLRef, masterRRef, aux1Ref, aux2Ref, aux3Ref, aux4Ref }) {
  return (
    <div style={{ position: 'relative' }}>
      <window.Console state={state} setState={setState} audio={audio} faultChannelIdx={-1}/>
      <ChannelAnchors state={state} setState={setState} channelRefs={channelRefs} masterLRef={masterLRef} masterRRef={masterRRef} aux1Ref={aux1Ref} aux2Ref={aux2Ref} aux3Ref={aux3Ref} aux4Ref={aux4Ref}/>
    </div>
  );
}

// Digital twin of ConsoleWithRefs. Renders the digital surface but reuses the
// SAME ChannelAnchors, so the input/output chips (and therefore the whole cable
// overlay measured in Chain) attach to identical positions over the fader bay.
function DigitalConsoleWithRefs({ state, setState, audio, channelRefs, masterLRef, masterRRef, aux1Ref, aux2Ref, aux3Ref, aux4Ref }) {
  // No ChannelAnchors here: the digital console owns its own fixed I/O row,
  // which holds the cable anchor refs. That decouples the cables from the fader
  // strips (correct for a digital desk) and lets the faders sit at the bottom.
  return (
    <window.DigitalConsole state={state} setState={setState} audio={audio} faultChannelIdx={-1}
      channelRefs={channelRefs} masterLRef={masterLRef} masterRRef={masterRRef} aux1Ref={aux1Ref} aux2Ref={aux2Ref} aux3Ref={aux3Ref} aux4Ref={aux4Ref}/>
  );
}

// ── 16-channel STAGE (full panel) ────────────────────────────────────────
// The big desk's end-to-end input path, simplified into the two sub-snakes a
// real band splits across: UPSTAGE (drum kit + the drummer's vocal) and
// DOWNSTAGE (vocals, guitars, bass, keys). Each section is a card you click to
// expand and work its inputs; collapsed it reports how many are live. Signal
// reaches the console ONLY where a cable is plugged, so unplugging an input here
// kills it at the desk — the drawn path IS the model (Kyle 2026-07-08). Full
// panel, mutually exclusive with the mixer view (stage OR console, not both).
function StageMiniBtn({ label, on, hot, onClick }) {
  return (
    <div onClick={(e) => { e.stopPropagation(); onClick(); }} className="mono ui-no-select"
      style={{
        fontSize: 7.5, padding: '3px 0', borderRadius: 3, cursor: 'pointer', fontWeight: 700,
        letterSpacing: 0.4, textAlign: 'center', flex: 1,
        background: on ? (hot ? 'rgba(255,70,48,0.16)' : 'rgba(90,140,255,0.16)') : '#0a0a0c',
        color: on ? (hot ? 'var(--hot)' : 'var(--cool)') : 'var(--ink-2)',
        border: '1px solid ' + (on ? (hot ? 'var(--hot)' : 'var(--cool)') : '#38383e'),
      }}>{label}</div>
  );
}
function StagePathStrip({ audio }) {
  const anyFlow = (audio.chanIn || []).some((v, i) => v > 0.05 && audio.chanInSource[i] && audio.chanInSource[i] !== 'playback');
  const paLive = ((audio.outputs && audio.outputs.pa_l || 0) + (audio.outputs && audio.outputs.pa_r || 0)) > 0.05;
  const steps = [
    { label: 'STAGE INPUTS', lit: anyFlow }, { label: 'SUB-SNAKE', lit: anyFlow },
    { label: 'MAIN SNAKE', lit: anyFlow }, { label: 'FOH FAN-OUT', lit: anyFlow },
    { label: 'CONSOLE', lit: anyFlow }, { label: 'PA', lit: paLive },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="mono" style={{ fontSize: 8, fontWeight: 700, letterSpacing: 0.5, padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', color: s.lit ? 'var(--green)' : 'var(--ink-3)', border: '1px solid ' + (s.lit ? 'rgba(74,222,128,0.4)' : '#2a2a2e'), background: s.lit ? 'rgba(74,222,128,0.08)' : '#0a0a0c' }}>{s.label}</div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: s.lit ? 'var(--green)' : '#2a2a2e', margin: '0 5px', opacity: s.lit ? 0.7 : 1 }}/>}
        </React.Fragment>
      ))}
    </div>
  );
}
function Stage16({ state, setState, audio }) {
  const [open, setOpen] = useS2('down');
  const homePorts = useR2({});
  const inputKeys = Object.keys(state.cables || {});
  const SNAKE = {
    up:   { label: 'Upstage sub-snake',   sub: 'drum kit · drummer vocal' },
    down: { label: 'Downstage sub-snake', sub: 'vocals · guitars · bass · keys' },
  };
  const groups = { up: [], down: [] };
  for (const k of inputKeys) { const d = window.SOURCES[k]; if (!d) continue; (groups[d.snake] || groups.down).push(k); }
  for (const k of inputKeys) { const p = state.cables[k]; if (p > 0) homePorts.current[k] = p; }

  const infoFor = (k) => {
    const ch = window.effectiveChannel(state, k);
    const connected = (state.cables[k] || 0) > 0;
    const flowing = ch >= 1 && audio.chanInSource[ch - 1] === k && audio.chanIn[ch - 1] > 0.05;
    return { ch, connected, flowing, muted: !!state.sourceMute[k], testing: state.testing === k, d: window.SOURCES[k] };
  };
  const setSourceMute = (k) => setState(s => ({ ...s, sourceMute: { ...s.sourceMute, [k]: !s.sourceMute[k] } }));
  const setTest = (k) => setState(s => ({ ...s, testing: k }));
  const togglePlug = (k) => setState(s => {
    const cur = s.cables[k] || 0;
    const next = cur > 0 ? 0 : (homePorts.current[k] || 1);
    return { ...s, cables: { ...s.cables, [k]: next } };
  });
  const summary = (keys) => ({
    live: keys.filter(k => infoFor(k).flowing).length,
    total: keys.length,
    unpatched: keys.filter(k => !infoFor(k).connected).length,
  });

  const Section = ({ id }) => {
    const keys = groups[id]; const meta = SNAKE[id]; const sum = summary(keys); const isOpen = open === id;
    return (
      <div style={{ flex: 1, minWidth: 0, alignSelf: 'flex-start', background: 'linear-gradient(180deg, rgba(28,28,32,0.6), rgba(14,14,16,0.5))', border: '1px solid ' + (isOpen ? 'var(--cool)' : '#2a2a2e'), borderRadius: 8, overflow: 'hidden' }}>
        <div onClick={() => setOpen(isOpen ? null : id)} className="ui-no-select" style={{ cursor: 'pointer', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--ink-3)' }}>▸</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: isOpen ? 'var(--cool)' : 'var(--ink)' }}>{meta.label}</div>
            <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', letterSpacing: 0.5, marginTop: 1 }}>{meta.sub}</div>
          </div>
          <div className="mono" style={{ fontSize: 8, textAlign: 'right', letterSpacing: 0.5 }}>
            <div style={{ color: 'var(--green)', fontWeight: 700 }}>{sum.live}/{sum.total} LIVE</div>
            {sum.unpatched > 0 && <div style={{ color: 'var(--hot)', fontWeight: 700, marginTop: 1 }}>{sum.unpatched} UNPATCHED</div>}
          </div>
        </div>
        {isOpen && (
          <div style={{ padding: '0 10px 10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(176px, 1fr))', gap: 6 }}>
            {keys.map(k => { const i = infoFor(k); return (
              <div key={k} style={{ background: '#141417', border: '1px solid ' + (i.connected ? '#2a2a2e' : 'var(--hot)'), borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: i.flowing ? i.d.color : '#333', boxShadow: i.flowing ? '0 0 5px ' + i.d.color : 'none', flexShrink: 0 }}/>
                  <div className="display" style={{ fontSize: 11, fontWeight: 700, flex: 1, minWidth: 0, color: i.muted ? 'var(--ink-3)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.d.label}</div>
                  <div className="mono" style={{ fontSize: 7.5, fontWeight: 700, color: i.connected ? 'var(--ink-3)' : 'var(--hot)' }}>{i.connected ? ('CH ' + i.ch) : 'NO PATH'}</div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
                  <StageMiniBtn label={i.testing ? '◉ TEST' : 'TEST'} on={i.testing} onClick={() => setTest(k)}/>
                  <StageMiniBtn label="MUTE" on={i.muted} hot onClick={() => setSourceMute(k)}/>
                  <StageMiniBtn label={i.connected ? 'UNPLUG' : 'PLUG'} on={!i.connected} hot={!i.connected} onClick={() => togglePlug(k)}/>
                </div>
              </div>
            ); })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ui-no-select" style={{ width: '100%', background: 'linear-gradient(180deg, rgba(20,20,24,0.5), rgba(12,12,14,0.4))', border: '1px solid #2a2a2e', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ZoneHeader label="Stage" sublabel="the band's inputs · click a sub-snake to work it · signal reaches the desk only where a cable is plugged" badge="16-CH" badgeColor="var(--cool)"/>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Section id="up"/>
        <Section id="down"/>
      </div>
      <StagePathStrip audio={audio}/>
    </div>
  );
}

// One traced segment of a signal path: a soft lit halo in the channel's snake
// colour plus marching dashes that travel from `from` to `to`, so a run of these
// laid end to end reads as signal flowing source → console. Given the same `d`
// the base cable already drew, so the glow tracks the cable exactly.
function FlowStream({ d, color }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={d} stroke={color} strokeWidth="7" fill="none" opacity="0.22"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}/>
      <path d={d} stroke={color} strokeWidth="2.3" fill="none" opacity="0.95"
        strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8">
        <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.7s" repeatCount="indefinite"/>
      </path>
    </g>
  );
}

function Chain({ state, setState, audio, sidebarContent, fitScale = 1, surface, onSetSurface, canDigital, surfaceLocked, wedgeMargins, onOpenPlacement, onZoomTo, onZoomReset, zoomActive, stageHidden, stage16Open, briefBelow = false }) {
  // The stage's source list follows the board: the four MX-8 inputs, or the full
  // 14-input band on the big desk. This is what makes the cable system, the
  // stage box, and the fan-out draw every band input.
  const sourceKeys = state.big16 ? (window.BAND_KEYS || []) : ['vocal', 'guitar', 'laptop', 'vocal2'];
  const [hoverCable, setHoverCable] = useS2(null);
  const isMobile = useViewport();
  const containerRef = useR2(null);
  const stageZoneRef = useR2(null);
  const stageBoxRef = useR2(null);
  const sourceRefs = useR2({});
  const portRefs = useR2({});
  const outRefs = useR2({});
  const channelRefs = useR2({});
  const masterLRef = useR2(null);
  const masterRRef = useR2(null);
  const aux1Ref = useR2(null);
  const aux2Ref = useR2(null);
  const aux3Ref = useR2(null);
  const aux4Ref = useR2(null);
  const paLRef = useR2(null);
  const paRRef = useR2(null);
  const wedgeOnStageRef = useR2(null);
  const wedge2OnStageRef = useR2(null);
  const wedge3OnStageRef = useR2(null);
  const wedge4OnStageRef = useR2(null);
  const fanOutRef = useR2(null);
  const snakeOutRef = useR2(null);
  // 16-channel sub-snake topology: three head boxes (drums / backline / vocals)
  // feed the side-stage box. These anchor the sub-snake bundles between them.
  const upHeadOutRef = useR2(null);
  const instHeadOutRef = useR2(null);
  const downHeadOutRef = useR2(null);
  const sideInUpRef = useR2(null);
  const sideInDownRef = useR2(null);
  // Per-source XLR jack on a sub-snake box (keyed by source), so each instrument's
  // XLR draws to its own channel on the box near it.
  const subJackRefs = useR2({});
  // Each IN channel on the main stage box (keyed by channel 1..14), so the
  // sub-snake fan-out tails can patch into them (drum vocal fans to 14).
  const stageBoxChRefs = useR2({});
  const [paths, setPaths] = useS2({
    stageCables: [], snake: null, subSnakes: [], fanOutCables: [], outCables: [], outFanCables: [],
    backRailY: 0, frontRailY: 0, snakeMidX: 0, zoomRegions: [],
  });

  // CABLE DRAG STATE
  // When the user grabs a cable endpoint and drags it, this captures the
  // ongoing gesture. While set, the dragged cable renders with one endpoint
  // following the cursor and the valid drop targets glow. On release, we
  // look up the nearest valid target and apply a swap mutation to state
  // (or snap back if dropped on nothing valid).
  //
  // Shape:
  //   { type: 'source' | 'fanout',
  //     id: string,                // for source: source key (vocal, guitar…)
  //                                // for fanout: snake port (1-4) as a number-stringified
  //     cursor: { x, y },          // pointer position in containerRef coords
  //     valid: number | null }     // currently-snapped target if any
  //
  // 'source' cables: dragged endpoint = the stage-box port end. Drop on
  //   another stage-box port; swap whichever source was there.
  // 'fanout' cables: dragged endpoint = the channel-input end. Drop on
  //   another channel chip; swap whichever port mapped there.
  const [dragState, setDragState] = useS2(null);
  // Ref mirror of dragState — used inside document-level pointer listeners
  // so we don't have to re-attach on every cursor update. The state version
  // drives rendering; the ref version drives the move/up handlers.
  const dragRef = useR2(null);
  useE2(() => { dragRef.current = dragState; }, [dragState]);

  // SIGNAL-PATH TRACE. The active lesson step may ask (via FlowTraceContext) to
  // light one channel's whole run so the student can follow it end to end. We
  // resolve the spec here into which stage cable / snake tail / channel it
  // touches, plus the colour to paint. `flowT` is null on a normal board (no
  // trace), so every `flowT && …` guard below is a no-op the rest of the time.
  const flowTrace = React.useContext(window.FlowTraceContext) || null;
  // Which glossary term the student is hovering, so the snake trunk can be
  // traced along its real path (see the snake block below).
  const defTerm = React.useContext(window.DefTermContext) || null;
  const flowT = (() => {
    if (!flowTrace) return null;
    const fanOut = state.fanOut || [1, 2, 3, 4];
    const cables = state.cables || {};
    // INPUT trace: from a source (or by console channel) → snake → its channel.
    if (flowTrace.source != null || flowTrace.channel != null) {
      let src = flowTrace.source != null ? flowTrace.source : null;
      let port = null;
      if (src != null) {
        port = cables[src] != null ? cables[src] : null;             // stage-box port the source patches to
      } else {
        port = fanOut.findIndex(c => c === flowTrace.channel) + 1;   // channel → the port that feeds it
        if (port <= 0) port = flowTrace.channel;
        for (const k in cables) { if (cables[k] === port) { src = k; break; } }
      }
      const ch = flowTrace.channel != null ? flowTrace.channel : (port ? (fanOut[port - 1] || port) : null);
      if (ch == null) return null;
      const colors = window.SNAKE_COLORS || [];
      return { kind: 'in', src, port, ch, color: colors[ch - 1] || '#8ab4ff' };
    }
    // OUTPUT trace: a console bus → snake return → stage box out → its speaker.
    if (flowTrace.out != null) {
      const colors = window.SNAKE_COLORS || [];
      return { kind: 'out', out: flowTrace.out, color: colors[0] || '#8ab4ff' };
    }
    return null;
  })();
  const flowInActive = !!(flowT && flowT.kind === 'in');

  // Translate a clientX/Y into containerRef-relative coordinates so the
  // ghost-cable endpoint lines up with the rendered SVG.
  const clientToLocal = (clientX, clientY) => {
    const cb = containerRef.current ? containerRef.current.getBoundingClientRect() : null;
    if (!cb) return { x: 0, y: 0 };
    // getBoundingClientRect is post-transform (screen px). The SVG draws in
    // unscaled layout units, so divide the screen delta by the board's fit
    // scale to land in the same coordinate space as the cable paths.
    const S = fitScale || 1;
    return { x: (clientX - cb.left) / S, y: (clientY - cb.top) / S };
  };

  // Enumerate valid drop targets for the current drag. Returns a list of
  // { key, x, y, payload } in container coords. `payload` is the data we
  // pass to applyDrop when this target is chosen.
  const getDropTargets = (drag) => {
    const cb = containerRef.current ? containerRef.current.getBoundingClientRect() : null;
    if (!cb) return [];
    const S = fitScale || 1;
    const local = (el) => {
      const r = el.getBoundingClientRect();
      return { x: (r.left + r.width / 2 - cb.left) / S, y: (r.top + r.height / 2 - cb.top) / S };
    };
    const targets = [];
    if (drag.type === 'source') {
      if (state.big16) {
        // 16-ch band stage: the sub-snake tail patches onto any of the 16
        // stage-box IN jacks. payload = the box channel this source lands on
        // (state.cables[srcKey]); with the identity fan-out that IS the console
        // channel, so the audio follows the patch.
        for (let ch = 1; ch <= 16; ch++) {
          const el = stageBoxChRefs.current[ch];
          if (!el) continue;
          const { x, y } = local(el);
          targets.push({ key: `in-${ch}`, x, y, payload: ch });
        }
      } else {
        for (let port = 1; port <= 4; port++) {
          const el = portRefs.current[port];
          if (!el) continue;
          const { x, y } = local(el);
          targets.push({ key: `port-${port}`, x, y, payload: port });
        }
      }
    } else if (drag.type === 'mic') {
      // A mic in hand can go into any input SLOT on its own sub-snake: an empty
      // one takes it, an occupied one swaps the two mics. Targeting the slot
      // (not the source sitting in it) is what lets an unplugged mic be put
      // back into a free input — an empty slot has no source to key off.
      const sn = window.SOURCES[drag.id] && window.SOURCES[drag.id].snake;
      const size = (window.SUBSNAKE_SIZE || {})[sn] || 0;
      const mine = micSlot(state, drag.id, naturalSlotOf(sourceKeys, drag.id));
      for (let slot = 1; slot <= size; slot++) {
        if (slot === mine) continue;             // already in this input
        const el = subJackRefs.current['@' + sn + ':' + slot];
        if (!el) continue;
        const { x, y } = local(el);
        targets.push({ key: `mic-${sn}-${slot}`, x, y, payload: slot });
      }
    } else if (drag.type === 'fanout') {
      // Snake tails land on any MONO mic/line channel — the whole desk, not a
      // fixed four. The one exception is the stereo playback strip (7/8 on an
      // MX-8): that's a hardwired FOH line-in with no snake port, so skip it.
      for (let ch = 1; ch <= state.channels.length; ch++) {
        if (state.channels[ch - 1] && state.channels[ch - 1].stereo) continue;
        const el = channelRefs.current[ch];
        if (!el) continue;
        const { x, y } = local(el);
        targets.push({ key: `ch-${ch}`, x, y, payload: ch });
      }
    } else if (drag.type === 'outpatch') {
      for (const portId of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const el = outRefs.current[portId];
        if (!el) continue;
        const { x, y } = local(el);
        targets.push({ key: `out-${portId}`, x, y, payload: portId });
      }
    } else if (drag.type === 'outfan') {
      // Return tails at FOH drop onto the console's output chips.
      const chipRefs = { mainL: masterLRef, mainR: masterRRef, aux1: aux1Ref, aux2: aux2Ref, aux3: aux3Ref, aux4: aux4Ref };
      for (const outKey of Object.keys(chipRefs)) {
        const el = chipRefs[outKey].current;
        if (!el) continue;
        const { x, y } = local(el);
        targets.push({ key: `ofan-${outKey}`, x, y, payload: outKey });
      }
    }
    return targets;
  };

  // Distance threshold (px in container coords) inside which we consider a
  // drop "snapped" to a target. Generous because the visible target circles
  // are decent-sized and we want forgiving aim.
  const SNAP_RADIUS = 30;

  const findSnapTarget = (drag, cursor) => {
    let nearest = null;
    let bestDist = SNAP_RADIUS;
    for (const t of getDropTargets(drag)) {
      const d = Math.hypot(t.x - cursor.x, t.y - cursor.y);
      if (d < bestDist) { bestDist = d; nearest = t; }
    }
    return nearest;
  };

  // Apply a successful drop to state. Swap semantics: whichever cable was
  // already at the destination jumps back to where the dragged cable came
  // from. Models a physical repatch where you trade two XLRs at the panel.
  //
  // PLUG-POP: when the user drops a cable into a port AND the receiving
  // channel is open with master+speaker live, sticking the connector in
  // creates a contact transient that pops the speakers. Shares the
  // phantomPop state with the +48V pop (same symptom, same reset flow)
  // but tags `cause: 'plug'` so the UI text can adapt.
  const applyDrop = (drag, target) => {
    if (drag.type === 'source') {
      const srcKey = drag.id;
      const oldPort = state.cables[srcKey];
      if (oldPort === target) return;
      const bumped = sourceKeys.find(k => k !== srcKey && state.cables[k] === target);
      setState(s => {
        const next = { ...s, cables: { ...s.cables, [srcKey]: target } };
        if (bumped) next.cables[bumped] = oldPort;
        // Contact-transient pop — same rule on every board: connecting or
        // disconnecting a channel that's unmuted AND live to a speaker pops (a
        // muted channel, or muted/off speakers, stays silent). fanOut is identity
        // on the band, so the port IS the console channel; wouldPopPhantom checks
        // the channel state + its output path to the speakers.
        const fanOut = s.fanOut || [1, 2, 3, 4];
        // DISCONNECT side: the channel this cable (and a bumped swap partner)
        // just left.
        if (oldPort > 0) {
          const oldCh = fanOut[oldPort - 1];
          if (oldCh >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(s, oldCh - 1)) {
            next.phantomPop = { channel: oldCh - 1, at: Date.now(), cause: 'patch_live' };
          }
        }
        // CONNECT side: plugging into a live channel.
        if (target > 0 && window.wouldPopOnPlug && window.wouldPopOnPlug(s, srcKey, target)) {
          next.phantomPop = { channel: (fanOut[target - 1] || 1) - 1, at: Date.now(), cause: 'plug' };
        }
        return next;
      });
    } else if (drag.type === 'fanout') {
      const port = parseInt(drag.id, 10);
      const oldCh = state.fanOut[port - 1];
      if (oldCh === target) return;
      const bumpedPort = state.fanOut.findIndex(ch => ch === target) + 1;
      setState(s => {
        const next = { ...s, fanOut: [...s.fanOut] };
        next.fanOut[port - 1] = target;
        if (bumpedPort > 0) next.fanOut[bumpedPort - 1] = oldCh;
        // Contact transients land on every channel whose input just changed:
        // the one the tail left (oldCh, 0 = was unplugged) and the one it
        // landed on. Pop if either channel's path to a live speaker is open.
        const hot = [oldCh, target].find(ch => ch >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(s, ch - 1));
        if (hot) next.phantomPop = { channel: hot - 1, at: Date.now(), cause: 'patch_live' };
        return next;
      });
    } else if (drag.type === 'outpatch') {
      // drag.id = the speaker whose cable is in hand; target = an OUT port.
      // Swap semantics like the other patches: if another speaker already
      // occupies that port, it takes this cable's old port (which may be
      // null — that speaker ends up unplugged, exactly like trading XLRs).
      const spk = drag.id;
      setState(s => {
        const op = { ...(s.outPatch || window.DEFAULT_OUT_PATCH) };
        if (op[spk] === target) return s;
        const oldPort = op[spk] || null;
        const bumped = Object.keys(op).find(k => k !== spk && op[k] === target);
        op[spk] = target;
        if (bumped) op[bumped] = oldPort;
        const next = { ...s, outPatch: op };
        // Moving a line on a LIVE powered speaker pops through that speaker
        // (its own amp plays the contact transient). Both the dragged
        // speaker and a bumped swap partner count.
        const hotSpk = [spk, bumped].filter(Boolean).find(k2 => window.speakerLiveForPatch && window.speakerLiveForPatch(s, k2));
        if (hotSpk) next.phantomPop = { at: Date.now(), cause: 'speaker_patch' };
        return next;
      });
    } else if (drag.type === 'outfan') {
      // drag.id = the snake return channel (1-6) whose tail is in hand;
      // target = a console output key. Swap semantics like everywhere else.
      const ch = parseInt(drag.id, 10);
      setState(s => {
        const of2 = { ...(s.outFan || window.DEFAULT_OUT_FAN) };
        if (of2[ch] === target) return s;
        const old = of2[ch] || null;
        const bumpedCh = [1, 2, 3, 4, 5, 6].find(c2 => c2 !== ch && of2[c2] === target);
        of2[ch] = target;
        if (bumpedCh) of2[bumpedCh] = old;
        const next = { ...s, outFan: of2 };
        // The FOH end of a speaker's line: connecting or disconnecting it
        // pops through whatever live speaker sits downstream of the touched
        // channel(s) — its amp plays the contact transient.
        const op = s.outPatch || window.DEFAULT_OUT_PATCH;
        const downstream = (c2) => Object.keys(op).find(spk => op[spk] === c2);
        const hot = [ch, bumpedCh].filter(Boolean).map(downstream).filter(Boolean)
          .find(spk => window.speakerLiveForPatch && window.speakerLiveForPatch(s, spk));
        if (hot) next.phantomPop = { at: Date.now(), cause: 'speaker_patch' };
        return next;
      });
    } else if (drag.type === 'mic') {
      // drag.id = source whose mic is in hand; target = the sub-snake input SLOT
      // it was dropped on. Landing on an OCCUPIED input swaps the two mics,
      // trading both the slot they sit in (micIn) AND the box channel they land
      // on (cables) — the mic follows its conductor. This is how "the kick mic
      // is in the snare input, so kick comes up on the snare channel" gets
      // built. Landing on a FREE input just seats this mic there.
      const a = drag.id, slot = target;
      setState(s => {
        const nat = (k) => naturalSlotOf(sourceKeys, k);
        const sn = window.SOURCES[a] && window.SOURCES[a].snake;
        const b = sourceKeys.find(k => k !== a && window.SOURCES[k]
                                       && window.SOURCES[k].snake === sn
                                       && micSlot(s, k, nat(k)) === slot);
        const micIn = { ...(s.micIn || {}) };
        const cables = { ...s.cables };
        // Channels touched by this move, read BEFORE it is applied: seating a
        // loose mic touches only its own channel; a swap touches both.
        const touched = b ? [s.cables[a], s.cables[b]] : [s.cables[a]];
        if (b) {
          const ma = micSlot(s, a, nat(a)), mb = micSlot(s, b, nat(b));
          micIn[a] = mb; micIn[b] = ma;
          cables[a] = s.cables[b]; cables[b] = s.cables[a];
        } else {
          micIn[a] = slot;
        }
        const next = { ...s, micIn, cables };
        // Plugging or swapping disconnects and reconnects the channel(s) that
        // feed, so it pops if any of them is live to a speaker (muted channel /
        // muted speakers → silent).
        const hot = touched.find(c => c >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(s, c - 1));
        if (hot) next.phantomPop = { channel: hot - 1, at: Date.now(), cause: 'patch_live' };
        return next;
      });
    }
  };

  // Release a cable into open space (no port/chip under the cursor) = pull it
  // out. A real engineer unplugs by dropping the connector, not only by trading
  // it for another. No-op if the cable was already loose. Disconnecting a live
  // path still pops, exactly like the disconnect side of a swap.
  const applyUnplug = (drag) => {
    if (drag.type === 'source') {
      const srcKey = drag.id;
      const oldPort = state.cables[srcKey];
      if (!oldPort) return;
      setState(s => {
        const next = { ...s, cables: { ...s.cables, [srcKey]: 0 } };
        // Pulling a live channel's input out pops, same rule as connecting.
        const fanOut = s.fanOut || [1, 2, 3, 4];
        const oldCh = fanOut[oldPort - 1];
        if (oldCh >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(s, oldCh - 1)) {
          next.phantomPop = { channel: oldCh - 1, at: Date.now(), cause: 'patch_live' };
        }
        return next;
      });
    } else if (drag.type === 'mic') {
      // 16-channel stage: pull the mic's XLR out of its sub-snake input. The
      // tail at the far end stays patched to whatever box channel it was on —
      // this is only the mic end.
      const srcKey = drag.id;
      if (micSlot(state, srcKey, naturalSlotOf(sourceKeys, srcKey)) === 0) return;
      setState(s => {
        const next = { ...s, micIn: { ...(s.micIn || {}), [srcKey]: 0 } };
        const port = s.cables[srcKey];
        const oldCh = port >= 1 ? (s.fanOut || [])[port - 1] : 0;
        if (oldCh >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(s, oldCh - 1)) {
          next.phantomPop = { channel: oldCh - 1, at: Date.now(), cause: 'patch_live' };
        }
        return next;
      });
    } else if (drag.type === 'fanout') {
      const port = parseInt(drag.id, 10);
      const oldCh = state.fanOut ? state.fanOut[port - 1] : 0;
      if (!oldCh) return;
      setState(s => {
        const next = { ...s, fanOut: [...s.fanOut] };
        next.fanOut[port - 1] = 0;
        if (oldCh >= 1 && window.wouldPopPhantom && window.wouldPopPhantom(s, oldCh - 1)) {
          next.phantomPop = { channel: oldCh - 1, at: Date.now(), cause: 'patch_live' };
        }
        return next;
      });
    } else if (drag.type === 'outpatch') {
      const spk = drag.id;
      setState(s => {
        const op = { ...(s.outPatch || window.DEFAULT_OUT_PATCH) };
        if (!op[spk]) return s;
        const next = { ...s, outPatch: { ...op, [spk]: null } };
        if (window.speakerLiveForPatch && window.speakerLiveForPatch(s, spk)) {
          next.phantomPop = { at: Date.now(), cause: 'speaker_patch' };
        }
        return next;
      });
    } else if (drag.type === 'outfan') {
      const ch = parseInt(drag.id, 10);
      setState(s => {
        const of2 = { ...(s.outFan || window.DEFAULT_OUT_FAN) };
        if (!of2[ch]) return s;
        const next = { ...s, outFan: { ...of2, [ch]: null } };
        const op = s.outPatch || window.DEFAULT_OUT_PATCH;
        const downstreamSpk = Object.keys(op).find(spk => op[spk] === ch);
        if (downstreamSpk && window.speakerLiveForPatch && window.speakerLiveForPatch(s, downstreamSpk)) {
          next.phantomPop = { at: Date.now(), cause: 'speaker_patch' };
        }
        return next;
      });
    }
  };

  const startDrag = (e, drag) => {
    e.preventDefault();
    e.stopPropagation();
    const cursor = clientToLocal(e.clientX, e.clientY);
    setDragState({ ...drag, cursor, valid: null });
  };

  // Document-level move/up listeners. Attached only while a drag is in
  // progress (the effect re-attaches on transition into/out of drag).
  useE2(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cursor = clientToLocal(e.clientX, e.clientY);
      const snap = findSnapTarget(drag, cursor);
      setDragState({ ...drag, cursor, valid: snap ? snap.payload : null });
    };
    const onUp = (e) => {
      const drag = dragRef.current;
      if (!drag) return;
      const cursor = clientToLocal(e.clientX, e.clientY);
      const snap = findSnapTarget(drag, cursor);
      if (snap) applyDrop(drag, snap.payload);
      else applyUnplug(drag);
      setDragState(null);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, [!!dragState]);

  // Body cursor while dragging — `grabbing` over the whole window so the
  // user gets immediate feedback that we've captured the gesture, even if
  // they wander off the cable.
  useE2(() => {
    if (!dragState) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = 'grabbing';
    return () => { document.body.style.cursor = prev; };
  }, [!!dragState]);


  useE2(() => {
    function compute() {
      const cont = containerRef.current;
      if (!cont) return;
      const cb = cont.getBoundingClientRect();
      // All getBoundingClientRect values below are post-transform (screen px).
      // The SVG draws in unscaled layout units, so divide every screen delta by
      // the board's fit scale to keep cables landing on their ports at any zoom.
      const S = fitScale || 1;
      const anchorPos = (el, side) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (side === 'top')    return { x: (r.left + r.width / 2 - cb.left) / S, y: (r.top - cb.top) / S };
        if (side === 'bottom') return { x: (r.left + r.width / 2 - cb.left) / S, y: (r.bottom - cb.top) / S };
        if (side === 'left')   return { x: (r.left - cb.left) / S, y: (r.top + r.height / 2 - cb.top) / S };
        if (side === 'right')  return { x: (r.right - cb.left) / S, y: (r.top + r.height / 2 - cb.top) / S };
        return { x: (r.left + r.width / 2 - cb.left) / S, y: (r.top + r.height / 2 - cb.top) / S };
      };

      // Stage-box port anchors. Inputs land on the TOP edge (back-rail
      // routing); outputs leave the BOTTOM edge (front-rail routing).
      const sbRect = stageBoxRef.current ? stageBoxRef.current.getBoundingClientRect() : null;
      const portTopAnchor = (portEl) => {
        if (!portEl || !sbRect) return null;
        const pr = portEl.getBoundingClientRect();
        return { x: (pr.left + pr.width / 2 - cb.left) / S, y: (sbRect.top - cb.top) / S };
      };
      const portBottomAnchor = (portEl) => {
        if (!portEl || !sbRect) return null;
        const pr = portEl.getBoundingClientRect();
        return { x: (pr.left + pr.width / 2 - cb.left) / S, y: (sbRect.bottom - cb.top) / S };
      };

      // Source → stage-box input ports. Cables leave the source's TOP edge
      // (upstage side), run up to the back rail, cross to the right, then
      // drop into the stage box's top face.
      //
      // If a source isn't patched (port = 0), the cable still gets RUN out
      // toward the stage box and ends dangling — like a real cable laid out
      // but not plugged in. The dangling connector is a draggable handle.
      // Loose input cables SPREAD OUT in the open space ABOVE the stage box,
      // two staggered rows across its width, so each one is easy to pick out
      // and grab (they used to stack in one vertical line).
      // Backline cable lanes: rank the amps by how FAR their cable travels to
      // the sub-snake. The farthest one sits on the lane CLOSEST to the jack row
      // so the nearer amps' drops nest above it and no drop crosses another amp's
      // horizontal lane (this is what fixes the bass / electric-guitar cross).
      const instRank = {};
      if (state.big16) {
        sourceKeys.filter(x => window.SOURCES[x] && window.SOURCES[x].snake === 'inst').map(k => {
          const s2 = sourceRefs.current[k], jk = subJackRefs.current[k];
          const sx = s2 ? anchorPos(s2, 'bottom').x : 0;
          const jx = jk ? anchorPos(jk, 'center').x : 0;
          return { k, span: Math.abs(sx - jx) };
        }).sort((a, b) => b.span - a.span).forEach((o, i) => { instRank[o.k] = i; });
      }
      const stageCables = sourceKeys.map(k => {
        const src = sourceRefs.current[k];
        if (!src) return null;
        const port = state.cables[k];
        // 16-channel: the input cable is the instrument's XLR to its own sub-snake
        // box. Drums + backline sit BELOW their box (cable leaves the card top and
        // runs up); the vocals sit ABOVE their box (cable leaves the bottom). Each
        // cable in a snake gets its OWN horizontal lane (a few px apart, ordered by
        // local channel) so the group's XLRs run parallel and never stack.
        if (state.big16) {
          const d = window.SOURCES[k];
          const sk = d && d.snake;
          const jack = subJackRefs.current[k];
          const jc = jack ? anchorPos(jack, 'center') : null;
          // Mic pulled out of the sub-snake (micIn 0): the XLR hangs off the
          // source with a grab handle so it can always be plugged back in.
          // Same rule as the loose sub-snake tails at the fan-out.
          if (!jc) {
            if (micSlot(state, k, naturalSlotOf(sourceKeys, k)) !== 0) return null;
            const bot = anchorPos(src, 'bottom');
            return { src: k, from: bot, to: { x: bot.x + 13, y: bot.y + 22 },
                     port, unplugged: true, xlr: true, looseMic: true };
          }
          // Drum mics: every cable drops into a COLLECTOR LANE that sits in the
          // open gap between the kit and the drum sub-snake (below every drum
          // card, above the box), runs along that lane to its channel, then
          // plugs straight down into the jack. Because the horizontal run lives
          // in the lane, it never crosses a drum card or the sub-snake box.
          // Each cable gets its own lane height (a few px apart) so parallel
          // runs don't stack. The two mics stacked directly over the kick
          // (snare + the drummer's vocal) leave the SIDE and step just outside
          // the stack before dropping, so their cable never runs down through
          // the kick; the rest drop straight down off the card bottom.
          if (sk === 'up') {
            const micC = anchorPos(src, 'center');
            const upList = sourceKeys.filter(x => window.SOURCES[x] && window.SOURCES[x].snake === 'up');
            const li = Math.max(0, upList.indexOf(k));
            const laneY = jc.y - 47 + li * 4;   // lane sits ~40px above the jack row; 4px pitch so parallel drum conductors read as separate cables
            const jackX = jc.x;
            const stacked = (k === 'snare' || k === 'vx4');
            let pts;
            if (stacked) {
              const side = jackX < micC.x ? 'left' : 'right';
              const edge = anchorPos(src, side);
              const clearX = side === 'left' ? edge.x - 14 : edge.x + 14;
              pts = [edge, { x: clearX, y: edge.y }, { x: clearX, y: laneY }, { x: jackX, y: laneY }, { x: jackX, y: jc.y }];
            } else {
              const bot = anchorPos(src, 'bottom');
              pts = [bot, { x: bot.x, y: laneY }, { x: jackX, y: laneY }, { x: jackX, y: jc.y }];
            }
            return { src: k, from: pts[0], to: jc, port, unplugged: !(port >= 1), xlr: true, drumPts: pts };
          }
          // Backline amps now sit UP on the drum plane (a real backline row),
          // ABOVE the backline sub-snake, so their cable leaves the card BOTTOM
          // and drops into a lane just above the backline box (below the drum
          // sub-snake, so the horizontal run crosses neither box), then plugs
          // down into its channel. Vocals leave the bottom into the vocal box
          // below them. Each cable gets its own lane height so parallel runs
          // never stack.
          const from = anchorPos(src, 'bottom');
          const grpList = sourceKeys.filter(x => window.SOURCES[x] && window.SOURCES[x].snake === sk);
          const li = grpList.indexOf(k);
          const midY = (sk === 'inst')
            ? jc.y - 36 - (instRank[k] || 0) * 9                   // farthest amp on the lane closest to the jacks, so drops nest and never cross
            : jc.y - 181 + li * 11;                                // vocal lanes: a clean band well ABOVE the wedge tops, 11px pitch so the 3 conductors read as separate cables with air around them
          return { src: k, from, to: jc, port, unplugged: !(port >= 1), xlr: true, midY };
        }
        // MX-8 vertical stage box: DIs sit upstage so their cable leaves the
        // BOTTOM and drops into the gather trunk; the vocal mics sit downstage of
        // the trunk so theirs leaves the TOP and rises to it. The trunk runs
        // right into the box's left-face IN jack.
        const isDI = window.SOURCES[k] && window.SOURCES[k].kind === 'di';
        const from = anchorPos(src, isDI ? 'bottom' : 'top');
        const portEl = port >= 1 ? portRefs.current[port] : null;
        let to = portEl ? anchorPos(portEl, 'left') : null;
        let unplugged = false;
        if (!to && sbRect) {
          unplugged = true;
          const idx = sourceKeys.indexOf(k);
          to = {
            x: (sbRect.left - cb.left) / S - 12,
            y: (sbRect.top  - cb.top) / S + 26 + idx * 15,
          };
        }
        return { src: k, from, to, port, unplugged };
      }).filter(Boolean);

      // Snake bundle: stagebox right edge ↔ fan-out left edge. Now that stage
      // and console sit side-by-side, the snake is a short horizontal bundle
      // between the two zones.
      const snakeFrom = snakeOutRef.current ? anchorPos(snakeOutRef.current, 'center') : null;
      let snakeTo = fanOutRef.current ? anchorPos(fanOutRef.current, 'left') : null;
      // 16-channel stage-only view: the FOH fan-out is off-panel (the console is
      // hidden), so run the main snake off the side box's right edge toward front
      // of house.
      let snakeToFOH = false;
      if (!snakeTo && snakeFrom && state.big16) { snakeTo = { x: snakeFrom.x + 64, y: snakeFrom.y }; snakeToFOH = true; }
      const snake = (snakeFrom && snakeTo) ? { from: snakeFrom, to: snakeTo, toFOH: snakeToFOH } : null;

      // Sub-snake trunks + FANTAIL into the vertical stage box. Each multicore
      // runs in along the stage edges and ends at ONE point just off the box's
      // left face; from that single end point its conductors FAN OUT to the block
      // of inputs — a real fan-tail. The trunk's last leg is horizontal, so it
      // meets the vertical stack of jacks perpendicular. Drums fan into IN 1-6
      // (+ the drummer's vocal, the one tail that reaches down to 14); the
      // downstage snake fans into 7-13.
      const subSnakes = [];
      const breakoutRails = [];   // no longer used (fan is from a point), kept for the setPaths shape
      const patchTails = [];
      const ac = (ref) => (ref && ref.current) ? anchorPos(ref.current, 'center') : null;
      const jackLeftOf = (ch) => { const el = stageBoxChRefs.current[ch]; return el ? anchorPos(el, 'left') : null; };
      const codeCol = (n) => (window.SNAKE_COLORS || [])[(n - 1) % 8] || '#4a4a52';
      const boxLeftX = sbRect ? (sbRect.left - cb.left) / S : null;
      if (state.big16 && boxLeftX != null) {
        const fanX = boxLeftX - 30;   // fan-out point sits just left of the jack column
        // Three sub-snakes, each ending at ONE fan-out point off the box's left
        // face and fanning to its inputs. Tail colour = that snake's LOCAL channel
        // (the standard code), so it can differ from the box jack it lands on.
        const groups = {
          up:   { out: ac(upHeadOutRef),   midX: fanX - 40,  block: (o) => o.ch <= 6, list: [], size: 8 },
          // Backline pivots to its fan height WELL left of the box (and left of
          // the vocal multicore's right-side riser) so it climbs to ch 7-10 before
          // the vocal trunk climbs to ch 11-14 — the two arrive stacked and
          // parallel at the box instead of running on top of each other.
          inst: { out: ac(instHeadOutRef), midX: fanX - 175, block: null,             list: [], size: 4 },
          down: { out: ac(downHeadOutRef), midX: fanX - 76,  block: null,             list: [], size: 4, edge: true },
        };
        // Conductor a source rides = the sub-snake input SLOT its mic is in
        // (state.micIn). Tail colour is that slot's colour; default is natural.
        const localIdx = {};
        for (const g of ['up', 'inst', 'down']) { let i = 0; for (const k of sourceKeys) if (window.SOURCES[k] && window.SOURCES[k].snake === g) { i++; localIdx[k] = micSlot(state, k, i) || i; } }
        for (const k of sourceKeys) {
          const sk = window.SOURCES[k] && window.SOURCES[k].snake;
          if (!groups[sk]) continue;
          const ch = state.cables[k];
          if (!(ch >= 1)) continue;
          const j = jackLeftOf(ch);
          if (!j) continue;
          const local = localIdx[k];
          groups[sk].list.push({ x: j.x, y: j.y, color: codeCol(local), ch, srcKey: k, cross: codeCol(local) !== codeCol(ch) });
        }
        // A source whose cable is pulled out (state.cables[k] = 0) still belongs
        // to its sub-snake — its tail hangs LOOSE at the fan-out with a grab
        // handle, so a disconnected cable can always be picked back up and
        // re-patched (fixes "unplug a cable and it's gone forever").
        const looseByGroup = { up: [], inst: [], down: [] };
        for (const k of sourceKeys) {
          const sk = window.SOURCES[k] && window.SOURCES[k].snake;
          if (groups[sk] && !(state.cables[k] >= 1)) looseByGroup[sk].push(k);
        }
        for (const g of ['up', 'inst', 'down']) {
          const grp = groups[g];
          if (!grp.out) continue;
          const loose = looseByGroup[g];
          if (!grp.list.length && !loose.length) continue;
          // Fan point Y = centre of the snake's CONTIGUOUS block (drums centre on
          // 1-6 so the vocal-to-14 tail just reaches further, not the whole fan).
          let fp;
          if (grp.list.length) {
            const ys = (grp.block ? grp.list.filter(grp.block) : grp.list).map(o => o.y);
            const use = ys.length ? ys : grp.list.map(o => o.y);
            fp = { x: fanX, y: (Math.min(...use) + Math.max(...use)) / 2 };
          } else {
            fp = { x: fanX, y: grp.out.y };   // nothing patched yet: park at head height
          }
          for (const o of grp.list) patchTails.push({ fromX: fp.x, fromY: fp.y, x: o.x, y: o.y, color: o.color, ch: o.ch, srcKey: o.srcKey, cross: o.cross });
          // The loose (unplugged) tails and any padded/unused snake channels hang
          // in a short stack below the fan-out. Loose tails carry a real srcKey so
          // they're grabbable; padded channels are just faint danglers.
          const baseY = grp.list.length ? Math.max(...grp.list.map(o => o.y)) : fp.y;
          loose.forEach((k, li) => {
            const local = localIdx[k];
            patchTails.push({ fromX: fp.x, fromY: fp.y, x: fp.x - 18, y: baseY + 20 + li * 14, color: codeCol(local), srcKey: k, loose: true });
          });
          const nSrc = sourceKeys.filter(x => window.SOURCES[x] && window.SOURCES[x].snake === g).length;
          const empties = Math.max(0, (grp.size || nSrc) - nSrc);
          for (let e = 0; e < empties; e++) {
            patchTails.push({ fromX: fp.x, fromY: fp.y, x: fp.x - 12, y: baseY + 20 + (loose.length + e) * 14, color: codeCol(nSrc + e + 1), dangling: true, srcKey: g + '-x' + e });
          }
          // Vocal (downstage) multicore hugs the PERIMETER instead of cutting up
          // through the open centre of the stage: it drops to a downstage floor
          // lane (below every wedge + return), runs along the front edge to a
          // clear corridor on the far stage-right (between the last performer
          // column and the FOH/side-box cluster), then climbs that edge to the
          // box fan point. Keeps the whole middle of the stage clear — the real
          // upstage-path / downstage-path rule.
          // Vocal multicore: leave the box fan point PERPENDICULAR (a short
          // horizontal leg), drop straight down the stage-right corridor just
          // left of the box, then run along the downstage floor lane to the
          // vocal sub-snake. Keeps the whole middle clear and lands the trunk
          // cleanly on the box (no diagonal, no gap).
          // Curve up to the box BEFORE reaching PA R so the trunk never runs
          // across the PA speaker; the short leg into the fan point rides well
          // above it. Falls back to just-left-of-box if PA R isn't measured yet.
          // PA R is a wide box, so clear its LEFT EDGE (centre minus half-width
          // and a margin), not just its centre, before the trunk climbs.
          const paRrect = (paRRef && paRRef.current) ? paRRef.current.getBoundingClientRect() : null;
          const paRleft = paRrect ? (paRrect.left - cb.left) / S : (fanX - 46);
          const edgeRoute = (grp.edge && grp.out)
            ? { riserX: Math.min(fanX - 46, paRleft - 52), laneY: grp.out.y }
            : null;
          subSnakes.push({ from: grp.out, to: fp, endH: true, midX: grp.midX, overTopY: grp.overTopY, edgeRoute });
        }
      }

      // Fan-out → channel inputs (input side of snake)
      const fanOutCables = [];
      const fanOutOrigin = fanOutRef.current ? anchorPos(fanOutRef.current, 'bottom') : null;
      if (fanOutOrigin) {
        // One tail per snake channel: 4 on the MX-8's small snake, 14 on the
        // band's 16-ch multicore (channels 15/16 are the FOH stereo line, not a
        // snake return). Looping the fan-out map's own length keeps this
        // board-agnostic, so the console fan-out is a live crosspatch point on
        // both boards — the snake lands at FOH and you patch it into the desk.
        const nFan = state.fanOut ? state.fanOut.length : 4;
        for (let port = 1; port <= nFan; port++) {
          const ch = state.fanOut ? state.fanOut[port - 1] : port;
          const chEl = ch >= 1 ? channelRefs.current[ch] : null;
          let to = chEl ? anchorPos(chEl, 'top') : null;
          // Unplugged tail (fanOut entry 0): it hangs loose below the snake
          // fan-out, staggered so each color is easy to pick out. The handle
          // is draggable straight onto a channel chip. This is how the
          // patching lesson starts: four coiled tails, none connected.
          let unplugged = false;
          if (!to) {
            unplugged = true;
            to = {
              x: fanOutOrigin.x - 70 + (port - 1) * 38,
              y: fanOutOrigin.y + 34 + ((port - 1) % 2) * 16,
            };
          }
          const srcKey = sourceKeys.find(k => state.cables[k] === port);
          // Tail color = the SNAKE CHANNEL's color (resistor code), not the
          // plugged source's. On a real multicore, the tail's color tells
          // you the channel number — that's the standard the patch lesson
          // teaches (1 brown, 2 red, 3 orange, 4 yellow).
          const color = (window.SNAKE_COLORS || [])[(port - 1) % 8] || '#4a4a52';
          // NOTE: the live "flowing" glow is NOT computed here. Geometry must not
          // depend on per-frame audio (that made this whole measurement effect
          // re-run 60x/sec and piled up at mount). The flow animation is decided
          // at render time from the live audio instead — see the fanOutCables map.
          fanOutCables.push({ port, ch, from: fanOutOrigin, to, color, srcKey, unplugged });
        }
      }

      // RETURN TAILS at FOH — snake return channels 1-6, each connecting (or
      // not) to one of the console's output chips. Same drag model as the input
      // tails: the chip-end is the handle, loose tails dangle to the RIGHT
      // of the snake point wearing their channel number.
      const chipRefFor = { mainL: masterLRef, mainR: masterRRef, aux1: aux1Ref, aux2: aux2Ref, aux3: aux3Ref, aux4: aux4Ref };
      const ofanState = state.outFan || window.DEFAULT_OUT_FAN;
      const outFanCables = [];
      if (fanOutOrigin) {
        for (const ch of [1, 2, 3, 4, 5, 6]) {
          const outKey = ofanState[ch];
          const ref = outKey ? chipRefFor[outKey] : null;
          let to = (ref && ref.current) ? anchorPos(ref.current, 'top') : null;
          let unplugged = false;
          if (!to) {
            unplugged = true;
            to = {
              x: fanOutOrigin.x + 56 + (ch - 1) * 38,
              y: fanOutOrigin.y + 34 + ((ch - 1) % 2) * 16,
            };
          }
          const color = (window.SNAKE_COLORS || [])[ch - 1] || '#4a4a52';
          outFanCables.push({ ch, outKey, from: fanOutOrigin, to, color, unplugged });
        }
      }

      // Speaker cables → stage-box OUT ports. Each speaker's cable runs from
      // whatever out port it's PATCHED to (state.outPatch) along the front
      // rail and climbs into the speaker's bottom edge. Unplugged cables
      // dangle loose near the box's lower corner with a draggable end —
      // same treatment as unplugged source cables.
      // Speaker lines wear the color of the snake channel they're patched
      // to (the 8-channel standard: 5 green, 6 blue, 7 violet, 8 gray) and
      // go neutral gray when loose — the channel owns the color, exactly
      // like the input tails. Loose ends carry the speaker's name.
      const OUT_SPEAKERS = [
        { spk: 'pa_l',   sref: paLRef,           name: 'PA L', rail: 24 },
        { spk: 'pa_r',   sref: paRRef,           name: 'PA R', rail: 16 },
        { spk: 'wedge',  sref: wedgeOnStageRef,  name: 'W 1',  rail: 0  },
        { spk: 'wedge2', sref: wedge2OnStageRef, name: 'W 2',  rail: 8  },
        { spk: 'wedge3', sref: wedge3OnStageRef, name: 'W 3',  rail: -8 },
        { spk: 'wedge4', sref: wedge4OnStageRef, name: 'W 4',  rail: -16 },
      ];
      const patch = state.outPatch || window.DEFAULT_OUT_PATCH;
      const outCables = OUT_SPEAKERS.map(({ spk, sref, name, rail }, idx) => {
        if (!sref.current) return null;
        // In the 16-ch band stage, W4 sits upstage by the drummer; connect its
        // feed at the TOP so the cable runs off the BACK of the wedge and hugs
        // the upstage edge to the box (a real drum-riser monitor feed). Other
        // boards (the small MX-8 stage) keep the bottom connection.
        // 8-ch: the stage box sits ABOVE the front speakers, so their returns run
        // out along a rail from the box and drop DOWN into the speaker TOP. The
        // 16-ch W4 already top-connects; everything else bottom-connects.
        // Native (MX-8): every speaker sits in the downstage row, so all returns
        // connect at the BOTTOM and come up off the floor rail. 16-ch keeps its
        // own rule (only W4 top-connects, up by the drum riser).
        const to = anchorPos(sref.current, (spk === 'wedge4' && state.big16) ? 'top' : 'bottom');
        const portId = patch[spk];
        // Returns leave the OUT jack on the box's LEFT face, then drop to the
        // front rail and run it to each speaker (see the router below).
        let from = (portId && outRefs.current[portId]) ? anchorPos(outRefs.current[portId], 'left') : null;
        let unplugged = false;
        if (!from && sbRect) {
          unplugged = true;
          // Loose speaker lines dangle off the box's lower-left corner.
          from = {
            x: (sbRect.left - cb.left) / S - 10,
            y: (sbRect.bottom - cb.top) / S - 20 - idx * 12,
          };
        }
        const color = '#7d7a72'; // uniform gray; the channel color lives on the snake head + fan-out
        // Each return leaves the box face on its own perpendicular lead (spaced
        // per port) so they don't stack, then bends to the speaker.
        const lead = 12 + idx * 9;
        return (from && to) ? { spk, name, from, to, color, rail, unplugged, portId, lead, big16: !!state.big16 } : null;
      }).filter(Boolean);
      // Front-of-house returns: order the rails by the SPEAKER's left-right
      // position (rightmost peels up first, nearest the box). The cables then
      // sort ONCE as they leave the stacked box ports and run PARALLEL to their
      // speakers, so the front row crosses a single time instead of cascading at
      // both the box exit AND the PA-R corner. Upstage wedges (W4, big16) route
      // the perimeter and keep their own lead.
      {
        // Order the vertical lanes by OUT PORT (1..5 = PA L, PA R, W1, W2, W3),
        // NOT by speaker position. The box OUT ports are stacked top-to-bottom,
        // so a port-ordered lane set lets every cable drop straight into its own
        // lane without crossing a neighbour right after leaving the box (PA R on
        // port 2 no longer cuts across the wedge cables). Port 1 gets the widest
        // lead so it sits leftmost; the runs cross only later, down at the floor.
        const front = outCables.filter(c => c.to && c.to.y > 480).sort((a, b) => a.portId - b.portId);
        front.forEach((c, r) => { c.lead = 14 + (front.length - 1 - r) * 11; });
      }

      // Two horizontal rails:
      //   backRailY  — for source cables. Sits ABOVE every source card so the
      //                cables route up-and-over (toward the upstage edge)
      //                before turning toward the stage box. This keeps them
      //                from crossing through any source or the stage box.
      //   frontRailY — for output cables. Just below the downstage row, so
      //                each output cable runs along the floor in front of
      //                its speaker/wedge.
      const sourceTops = stageCables
        .map(c => c.from?.y)
        .filter(y => y != null);
      const backRailY  = sourceTops.length ? Math.min(...sourceTops) - 14 : 0;
      const paCable = outCables.find(c => c.spk === 'pa_l');
      const frontRailY = paCable ? paCable.to.y + 14 : 0;
      // X coordinate of the gap between the left column (stage + brief) and
      // the right column (console). The snake bundle pivots vertically in
      // this gap so it doesn't cut diagonally across the console panel.
      const stageZoneRect = stageZoneRef.current ? stageZoneRef.current.getBoundingClientRect() : null;
      const snakeMidX = stageZoneRect ? (stageZoneRect.right - cb.left) / S + 6 : 0;

      // Zoom-button anchors — one per [data-zoomable] region, placed at the
      // region's top-right corner in the canvas's own (unscaled) coordinates.
      // Rendered in a layer ABOVE the cable overlay so no cable can cover them.
      // `el` is kept so the button can zoom-to-fit that exact region on click.
      const zoomRegions = [];
      cont.querySelectorAll('[data-zoomable]').forEach((el) => {
        const r = el.getBoundingClientRect();
        zoomRegions.push({
          key: el.getAttribute('data-zoom-key') || ('zr' + zoomRegions.length),
          bx: (r.right - cb.left) / S, by: (r.top - cb.top) / S, el,
        });
      });

      // ── RESERVED CABLE LANES (16-channel stage) ────────────────────────
      // Every long horizontal cable run rides one of these lanes. The lane
      // positions are MEASURED from the actual device rects, so a lane always
      // sits in the clear gap between card clusters and can never strand on top
      // of a card when the layout changes. This replaces the hard-coded lane
      // numbers (500 / 656 / 1311 / 86) that were tuned for one layout and cut
      // across the vocal row once the cards moved (Kyle, 2026-07-21: "hard rules
      // that keep cables from crossing over objects... reliable as we make other
      // changes"). The two rules the lanes enforce:
      //   1. No card crossing — a run on frontFloor/backEdge is, by construction,
      //      below/above every card, and vertical drops ride the box's own
      //      clear right-side margin.
      //   2. No stacking — each cable gets its own offset within a lane.
      let cableLanes = null;
      {
        // Runs for BOTH boards. This was gated to `if (state.big16)`, which meant
        // the MX-8 stage had no measured lanes and, worse, no entry in
        // __stageCardEls at all — so __cableAudit() had nothing to check there and
        // reported nothing while cables ran through both mains (Kyle 2026-07-24).
        // Every ref below is null-safe, so the smaller board simply contributes
        // fewer devices.
        const rectOf = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: (r.left - cb.left) / S, y: (r.top - cb.top) / S, r: (r.right - cb.left) / S, b: (r.bottom - cb.top) / S, cx: (r.left + r.width / 2 - cb.left) / S, cy: (r.top + r.height / 2 - cb.top) / S };
        };
        // Downstage row = the mains, wedges 1-3, and the three vocal cards. The
        // front-row returns must clear the LOWEST of these. (W4 is upstage by the
        // kit and routes over the back edge instead.)
        // The vocal sub-snake head sits at the very bottom of the stage, lower
        // than the wedges, so the floor lane has to clear it too.
        const subSnakeEls = [...cont.querySelectorAll('[data-walk^="sub-snake-"]')];
        const downstageEls = [paLRef.current, paRRef.current, wedgeOnStageRef.current, wedge2OnStageRef.current, wedge3OnStageRef.current,
          ...['vx1', 'vx2', 'vx3'].map((k) => sourceRefs.current[k]), ...subSnakeEls];
        const downRects = downstageEls.map(rectOf).filter(Boolean);
        // Every card on the stage, for the upstage (back-edge) lane and the audit.
        // The stage box and the sub-snake heads are devices too. They were left
        // out of this list, so nothing stopped a cable being draped along the
        // side of the box and nothing reported it (Kyle 2026-07-24).
        const boxEls = [stageBoxRef.current,
                        ...document.querySelectorAll('[data-zoom-key="drum"],[data-zoom-key="backline"],[data-zoom-key="vocal"]')];
        const allEls = [...downstageEls, wedge4OnStageRef.current, ...sourceKeys.map((k) => sourceRefs.current[k]), ...boxEls];
        const allRects = allEls.map(rectOf).filter(Boolean);
        const maxBottom = downRects.length ? Math.max(...downRects.map((r) => r.b)) : 0;
        const minTop = allRects.length ? Math.min(...allRects.map((r) => r.y)) : 0;
        const boxLeftX = sbRect ? (sbRect.left - cb.left) / S : 0;
        // The front return trough. Two rules, both of which were being broken:
        // it has to CLEAR the lowest device, and it has to FIT ON THE STAGE. The
        // old lane was maxBottom + 26 with a fixed 7 px pitch and no idea where
        // the floor was, so once the vocal sub-snake moved downstage the whole
        // band ran off the bottom of the plot and over the brief card beneath it,
        // and the ports were too close together to read apart (Kyle 2026-07-24).
        // Now the band is solved for: reserve what the lanes need, and if the
        // devices leave less room than that, the band wins and rides higher.
        const plotEl = cont.querySelector('[data-stage-plot]') || cont;
        const stageFloorY = (plotEl.getBoundingClientRect().bottom - cb.top) / S;
        const N_FRONT = state.big16 ? 5 : 4;   // mains L+R plus wedges 1-3 (16ch) or 1-2 (MX-8)
        const MIN_PITCH = 7;
        const need = (N_FRONT - 1) * MIN_PITCH + 10;
        const laneTop = Math.min(maxBottom + 14, stageFloorY - 10 - need);
        const laneBand = stageFloorY - 10 - laneTop;
        cableLanes = {
          // Front-row returns run their floor segment here, each port its own
          // lane, all BELOW every downstage card and all ON the stage.
          frontFloorY: laneTop,
          frontPitch: Math.max(MIN_PITCH, Math.min(12, laneBand / (N_FRONT - 1))),
          // W4's perimeter run rides above every card.
          backEdgeY: minTop - 20,
          // Returns drop straight down in the box's own clear right-side margin
          // (right of the rightmost card), each port in its own vertical lane.
          descendX: boxLeftX - 16,
          descendPitch: 11,
          // Keep-out rects, exposed so window.__cableAudit() can verify no path
          // enters a card. Screen-space, matching getBBox() in the audit.
          cards: allRects,
        };
        // The live card ELEMENTS, for the runtime audit (window.__cableAudit),
        // which samples every cable path and flags any that enters a card. This
        // is the durable guard: run it after any stage change to catch a cable
        // crossing a card before it ships, instead of eyeballing a screenshot.
        window.__stageCardEls = allEls.filter(Boolean);
      }

      setPaths({ stageCables, snake, subSnakes, breakoutRails, patchTails, fanOutCables, outCables, outFanCables, backRailY, frontRailY, snakeMidX, zoomRegions, cableLanes });
    }
    compute();
    const t = setTimeout(compute, 60);
    window.addEventListener('resize', compute);
    return () => { clearTimeout(t); window.removeEventListener('resize', compute); };
    // Geometry depends only on the board state + the fit scale, NOT on the
    // per-frame audio. Dropping `audio` here stops the cable layout from being
    // recomputed (and setPaths'd) on every animation frame, which is what made
    // this effect storm at mount.
  }, [state, fitScale, stage16Open, stageHidden]);

  // BUS-level activity (pre-speaker) — used for cables that carry the desk's
  // output AT THE DESK or in the snake return. These don't depend on whether
  // the downstream speaker is on; signal exists in the cable either way.
  const mainBusActive = ((audio.mainBus?.L || 0) + (audio.mainBus?.R || 0)) > 0.05;
  const wedgeActive   = (audio.auxBus?.wedge  || 0) > 0.05;
  const wedge2Active  = (audio.auxBus?.wedge2 || 0) > 0.05;
  const wedge3Active  = (audio.auxBus?.wedge3 || 0) > 0.05;
  const wedge4Active  = (audio.auxBus?.wedge4 || 0) > 0.05;
  // PER-CABLE liveness at the speaker side — the snake channel the line is
  // patched to must be carrying a live bus (two hops: the channel needs a
  // desk output plugged in at FOH, and that bus needs signal). An unplugged
  // line carries nothing.
  const ofanLive = state.outFan || window.DEFAULT_OUT_FAN;
  const busActiveFor = (outKey) =>
    outKey === 'mainL' || outKey === 'mainR' ? mainBusActive
    : outKey === 'aux1' ? wedgeActive
    : outKey === 'aux2' ? wedge2Active
    : outKey === 'aux3' ? wedge3Active
    : outKey === 'aux4' ? wedge4Active
    : false;
  const retLive = (ch) => (ch && ofanLive[ch]) ? busActiveFor(ofanLive[ch]) : false;
  const topo = state.topology || {};

  const consoleEl = (
    <ConsolePanel state={state} setState={setState} audio={audio}
      channelRefs={channelRefs} masterLRef={masterLRef} masterRRef={masterRRef}
      aux1Ref={aux1Ref} aux2Ref={aux2Ref} aux3Ref={aux3Ref} aux4Ref={aux4Ref}
      fanOutRef={fanOutRef} sourceKeys={sourceKeys}
      surface={surface} onSetSurface={onSetSurface} canDigital={canDigital} surfaceLocked={surfaceLocked}/>
  );

  // 16-channel STAGE view: the full stage-plot (StageRow + cables) takes the
  // whole panel and the console is hidden — you view the stage OR the mixer, not
  // both. stageOnly forces the stage visible and drops the console; everywhere
  // else the existing stageHidden behaviour is untouched.
  const stageOnly = state.big16 && stage16Open;
  const showStage = stageOnly || !stageHidden;
  const effBriefBelow = briefBelow && !stageOnly;

  // The snake fan-out at FOH — the multicore lands and fans into the desk's
  // channel inputs. On the MX-8 the stage and console share one screen, so this
  // rides in the main cable overlay. On the 16-channel board the stage and the
  // console are SEPARATE screens (STAGE / MIXER toggle), so the fan-out also
  // renders in a console-only overlay on the MIXER view — that's what makes the
  // FOH fan-out a live crosspatch point on the big desk, not just the stage box.
  // Each tail's channel-end is a drag handle: drop it on another channel to
  // repatch (swap semantics). fanOutCables is empty whenever the console isn't
  // on screen (no SNAKE anchor), so this is a no-op in the 16-ch STAGE view.
  const fanOutEls = (
    <>
      {paths.fanOutCables.map((c, i) => {
        const portKey = String(c.port);
        const isDragged = dragState && dragState.type === 'fanout' && dragState.id === portKey;
        const someOtherDragged = dragState && !isDragged;
        const chanEnd = isDragged ? dragState.cursor : c.to;
        const midY = (c.from.y + chanEnd.y) / 2 - 6;
        const d = `M ${c.from.x} ${c.from.y} C ${c.from.x} ${midY}, ${chanEnd.x} ${midY}, ${chanEnd.x} ${chanEnd.y}`;
        // Signal-path trace: this fan-out tail is the last leg into the desk.
        const traced = flowInActive && c.ch === flowT.ch;
        const flowDim = flowInActive && !traced;
        const opacity = someOtherDragged ? 0.18 : (flowDim ? 0.2 : (c.unplugged ? 0.6 : (c.srcKey ? 0.95 : 0.35)));
        return (
          <g key={i} style={{ pointerEvents: 'none' }}>
            <path d={d} stroke="#000" strokeWidth="5" fill="none" opacity={someOtherDragged ? 0.1 : 0.4} strokeLinecap="round"/>
            <path d={d} stroke={c.color} strokeWidth={isDragged ? 4 : 3} fill="none" opacity={opacity} strokeLinecap="round"/>
            {traced && <FlowStream d={d} color={flowT.color}/>}
            <circle cx={c.from.x} cy={c.from.y} r="2" fill={c.color} stroke="#0a0a0c" strokeWidth="0.5" opacity={someOtherDragged ? 0.3 : 1}/>
            {!isDragged && (
              <circle cx={c.to.x} cy={c.to.y} r="2.5" fill={c.color} stroke="#0a0a0c" strokeWidth="0.8" opacity={someOtherDragged ? 0.3 : 1}/>
            )}
            {/* Loose tail wears its channel number so "brown is 1" reads
                at a glance while the student patches the snake. */}
            {c.unplugged && !isDragged && !someOtherDragged && (
              <text x={chanEnd.x} y={chanEnd.y + 17} textAnchor="middle" fill="#e9e6df"
                stroke="#0a0a0c" strokeWidth="2.5" paintOrder="stroke"
                fontFamily="Geist Mono" fontSize="9" fontWeight="700">{c.port}</text>
            )}
            {/* Flow glow decided here, at render time, from the LIVE audio —
                so the geometry effect above never has to re-run for it. */}
            {(!c.unplugged && c.srcKey && audio.chanIn[c.ch - 1] > 0.05 && audio.chanInSource[c.ch - 1] === c.srcKey) && !isDragged && (
              <path d={d} stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.7" strokeDasharray="3 6" strokeLinecap="round">
                <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="0.6s" repeatCount="indefinite"/>
              </path>
            )}
            {/* DRAG HANDLE — channel-input end of the snake tail. */}
            {!someOtherDragged && (
              <g style={{ pointerEvents: 'auto' }}>
                <circle className="cable-hit" cx={chanEnd.x} cy={chanEnd.y} r="11" fill="transparent"
                  onPointerDown={(e) => startDrag(e, { type: 'fanout', id: portKey })}/>
                <circle className="cable-handle" cx={chanEnd.x} cy={chanEnd.y} r={isDragged ? 6 : 5}
                  fill={c.color} stroke="#0a0a0c" strokeWidth="1.2"
                  pointerEvents="none"/>
                <circle cx={chanEnd.x} cy={chanEnd.y} r="2" fill="#0a0a0c" pointerEvents="none"/>
              </g>
            )}
          </g>
        );
      })}

      {/* Drop-target highlights for an in-progress FAN-OUT drag — each
          channel input chip glows; the snapped one glows brighter. */}
      {dragState && dragState.type === 'fanout' && getDropTargets(dragState).map(t => {
        const isSnapped = dragState.valid === t.payload;
        return (
          <g key={`drop-${t.key}`} style={{ pointerEvents: 'none' }}>
            <circle cx={t.x} cy={t.y} r={isSnapped ? 20 : 16}
              fill="rgba(74,222,128,0.18)"
              stroke="var(--green)" strokeWidth={isSnapped ? 2.5 : 1.5}
              style={{ filter: isSnapped ? 'drop-shadow(0 0 8px rgba(74,222,128,0.6))' : 'none' }}/>
          </g>
        );
      })}
    </>
  );

  // The snake RETURN fan-out at FOH — the console's output buses (Main L/R,
  // Aux 1-4) fan into the snake's return channels, which carry them back to the
  // stage-box OUT ports and on to the speakers. Extracted like fanOutEls so the
  // 16-channel MIXER view can render the same interactive return tails (the desk
  // outputs need connections to the snake, matching the snake head on stage).
  const outFanEls = (
    <>
      {(paths.outFanCables || []).map(c => {
        const portKey = 'of' + c.ch;
        const isDragged = dragState && dragState.type === 'outfan' && dragState.id === String(c.ch);
        const someOtherDragged = dragState && !isDragged;
        const chipEnd = isDragged ? dragState.cursor : c.to;
        const midY = (c.from.y + chipEnd.y) / 2 - 6;
        const d = `M ${c.from.x} ${c.from.y} C ${c.from.x} ${midY}, ${chipEnd.x} ${midY}, ${chipEnd.x} ${chipEnd.y}`;
        const live = !c.unplugged && !isDragged && busActiveFor(c.outKey);
        const opacity = someOtherDragged ? 0.18 : (c.unplugged ? 0.6 : 0.95);
        return (
          <g key={portKey} style={{ pointerEvents: 'none' }}>
            <path d={d} stroke="#000" strokeWidth="5" fill="none" opacity={someOtherDragged ? 0.1 : 0.4} strokeLinecap="round"/>
            <path d={d} stroke={c.color} strokeWidth={isDragged ? 4 : 3} fill="none" opacity={opacity} strokeLinecap="round"/>
            <circle cx={c.from.x} cy={c.from.y} r="2" fill={c.color} stroke="#0a0a0c" strokeWidth="0.5" opacity={someOtherDragged ? 0.3 : 1}/>
            {c.unplugged && !isDragged && !someOtherDragged && (
              <text x={chipEnd.x} y={chipEnd.y + 17} textAnchor="middle" fill="#e9e6df"
                stroke="#0a0a0c" strokeWidth="2.5" paintOrder="stroke"
                fontFamily="Geist Mono" fontSize="9" fontWeight="700">{c.ch}</text>
            )}
            {live && (
              <path d={d} stroke="#fff" strokeWidth="1.2" fill="none" strokeDasharray="3 6" strokeLinecap="round" opacity="0.7">
                <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="0.6s" repeatCount="indefinite"/>
              </path>
            )}
            {!someOtherDragged && (
              <g style={{ pointerEvents: 'auto' }}>
                <circle className="cable-hit" cx={chipEnd.x} cy={chipEnd.y} r="11" fill="transparent"
                  onPointerDown={(e) => startDrag(e, { type: 'outfan', id: String(c.ch) })}/>
                <circle className="cable-handle" cx={chipEnd.x} cy={chipEnd.y} r={isDragged ? 6 : 5}
                  fill={c.color} stroke="#0a0a0c" strokeWidth="1.2" pointerEvents="none"/>
                <circle cx={chipEnd.x} cy={chipEnd.y} r="2" fill="#0a0a0c" pointerEvents="none"/>
              </g>
            )}
          </g>
        );
      })}

      {dragState && dragState.type === 'outfan' && getDropTargets(dragState).map(t => {
        const isSnapped = dragState.valid === t.payload;
        return (
          <g key={`drop-${t.key}`} style={{ pointerEvents: 'none' }}>
            <circle cx={t.x} cy={t.y} r={isSnapped ? 18 : 14}
              fill="rgba(74,222,128,0.18)"
              stroke="var(--green)" strokeWidth={isSnapped ? 2.5 : 1.5}
              style={{ filter: isSnapped ? 'drop-shadow(0 0 8px rgba(74,222,128,0.6))' : 'none' }}/>
          </g>
        );
      })}
    </>
  );

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%',
      padding: isMobile ? '6px 8px 12px' : '8px 14px 12px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Two-column row.
          LEFT  column (flex:1): stage on top, brief banner below it.
          RIGHT column: console — its own column, can be tall, doesn't fight
          the brief for vertical space.
          Stage and brief share the wide LEFT column; the stage uses the
          horizontal width, the brief uses minimal vertical height in a
          horizontal banner layout below the stage. */}
      {effBriefBelow ? (
        /* Stage hidden + big desk: the console is width-limited with spare
           vertical room, so the brief drops BELOW it (a banner) and the console
           takes the full width. */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', zIndex: 2 }}>
          <div style={{ flexShrink: 0, display: 'flex' }}>{consoleEl}</div>
          <div style={{ width: '100%', maxWidth: 1100 }}>{sidebarContent}</div>
        </div>
      ) : (
        <div style={{
          display: 'flex', flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? 8 : 12, zIndex: 2, alignItems: 'stretch',
        }}>
          {/* LEFT column: the stage (hidden when stageHidden) with the brief below
              it. On the 16-channel stage view the stage fills the whole panel and
              the console (right column) is dropped entirely. */}
          <div style={{
            flex: 1, minWidth: 0,
            display: 'flex', flexDirection: 'column', gap: 12,
            justifyContent: showStage ? 'flex-start' : 'center',
          }}>
            {showStage && (
              <div ref={stageZoneRef}>
                <StageRow state={state} setState={setState} audio={audio}
                  sourceKeys={sourceKeys} sourceRefs={sourceRefs} portRefs={portRefs} outRefs={outRefs}
                  snakeOutRef={snakeOutRef} wedgeOnStageRef={wedgeOnStageRef} wedge2OnStageRef={wedge2OnStageRef}
                  wedge3OnStageRef={wedge3OnStageRef} wedge4OnStageRef={wedge4OnStageRef}
                  paLRef={paLRef} paRRef={paRRef} stageBoxRef={stageBoxRef}
                  upHeadOutRef={upHeadOutRef} instHeadOutRef={instHeadOutRef} downHeadOutRef={downHeadOutRef} sideInUpRef={sideInUpRef} sideInDownRef={sideInDownRef} subJackRefs={subJackRefs} stageBoxChRefs={stageBoxChRefs}
                  wedgeMargins={wedgeMargins} onOpenPlacement={onOpenPlacement} onZoomTo={onZoomTo} zoomActive={zoomActive}/>
              </div>
            )}
            {sidebarContent}
          </div>
          {!stageOnly && <div style={{ flexShrink: 0, display: 'flex' }}>{consoleEl}</div>}
        </div>
      )}

      {showStage && (
      <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%', zIndex: 5 }}>
        {/* Cable path helpers. Two shapes:
              _cableCurve  — direct bezier from source to stage box. Used for
                             input cables (sources fanning in from the left).
              _routedCable — three-segment Manhattan path with rounded corners
                             that drops down to a shared `midY`, runs
                             horizontally, then approaches the destination.
                             Used for output cables (stage-box outs → PA &
                             wedge) so they all share parallel runs along the
                             front of the stage instead of crossing through
                             the sources. */}
        {(() => {
          window._cableCurve = (from, to) => {
            if (!from || !to) return '';
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const adx = Math.abs(dx);
            const ady = Math.abs(dy);
            let cp1, cp2;
            if (ady > adx * 0.6) {
              cp1 = { x: from.x, y: from.y + dy * 0.5 };
              cp2 = { x: to.x,   y: from.y + dy * 0.5 };
            } else {
              cp1 = { x: from.x + dx * 0.5, y: from.y };
              cp2 = { x: from.x + dx * 0.5, y: to.y };
            }
            return `M ${from.x} ${from.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${to.x} ${to.y}`;
          };
          window._routedCable = (from, to, midY) => {
            if (!from || !to) return '';
            // Rounded-corner Manhattan: down to midY, across to to.x, then
            // up/down to to.y. Corner radius shrinks if any segment is short.
            const seg1 = Math.abs(midY - from.y);
            const seg2 = Math.abs(to.x - from.x);
            const seg3 = Math.abs(to.y - midY);
            const R1 = Math.max(0, Math.min(8, seg1 / 2, seg2 / 2));
            const R2 = Math.max(0, Math.min(8, seg2 / 2, seg3 / 2));
            const v1down = midY > from.y;
            const hRight = to.x  > from.x;
            const v2down = to.y  > midY;
            const c1y = v1down ? midY - R1 : midY + R1;
            const c1x = hRight ? from.x + R1 : from.x - R1;
            const c2x = hRight ? to.x - R2 : to.x + R2;
            const c2y = v2down ? midY + R2 : midY - R2;
            return [
              `M ${from.x} ${from.y}`,
              `L ${from.x} ${c1y}`,
              `Q ${from.x} ${midY}, ${c1x} ${midY}`,
              `L ${c2x} ${midY}`,
              `Q ${to.x} ${midY}, ${to.x} ${c2y}`,
              `L ${to.x} ${to.y}`,
            ].join(' ');
          };
          // Mirror of _routedCable but pivots horizontally first: out to midX,
          // up/down to to.y, then across to to.x. Used by the snake bundle so
          // it exits the stage box going RIGHT, runs vertically in the gap
          // between the two zones, then enters the fan-out going RIGHT.
          window._cornerHV = (from, to, midX) => {
            if (!from || !to) return '';
            const seg1 = Math.abs(midX - from.x);
            const seg2 = Math.abs(to.y - from.y);
            const seg3 = Math.abs(to.x - midX);
            const R1 = Math.max(0, Math.min(8, seg1 / 2, seg2 / 2));
            const R2 = Math.max(0, Math.min(8, seg2 / 2, seg3 / 2));
            const h1right = midX > from.x;
            const vdown   = to.y > from.y;
            const h2right = to.x > midX;
            const c1x = h1right ? midX - R1 : midX + R1;
            const c1y = vdown   ? from.y + R1 : from.y - R1;
            const c2y = vdown   ? to.y - R2 : to.y + R2;
            const c2x = h2right ? midX + R2 : midX - R2;
            return [
              `M ${from.x} ${from.y}`,
              `L ${c1x} ${from.y}`,
              `Q ${midX} ${from.y}, ${midX} ${c1y}`,
              `L ${midX} ${c2y}`,
              `Q ${midX} ${to.y}, ${c2x} ${to.y}`,
              `L ${to.x} ${to.y}`,
            ].join(' ');
          };
          // Rounded polyline through an explicit list of points. Each interior
          // corner is softened with a short quadratic so a multi-leg cable run
          // (down into a lane, along it, down into a jack) reads like dressed
          // cable instead of hard right angles. Used by the drum mic cables.
          window._polyRound = (pts, r) => {
            if (!pts || pts.length < 2) return '';
            if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length - 1; i++) {
              const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
              const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
              const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
              const rr = Math.max(0, Math.min(r, d1 / 2, d2 / 2));
              const a = { x: p1.x - (p1.x - p0.x) / d1 * rr, y: p1.y - (p1.y - p0.y) / d1 * rr };
              const b = { x: p1.x + (p2.x - p1.x) / d2 * rr, y: p1.y + (p2.y - p1.y) / d2 * rr };
              d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`;
            }
            const last = pts[pts.length - 1];
            d += ` L ${last.x} ${last.y}`;
            return d;
          };
          return null;
        })()}

        {/* Source → stage-box input ports — routed along the BACK RAIL. The
            cable leaves the source's top edge, runs up to the rail, across to
            the right, then drops into the stage box from above. Each cable's
            rail Y is determined by the source's left-to-right rank, so the
            leftmost source gets the topmost rail and the rightmost gets the
            bottommost — this is the layering order that minimises avoidable
            crossings given the source/port mapping.

            DRAG: the port-end of each cable has a draggable handle. While
            being dragged the cable's destination follows the cursor (ghost
            cable) and other cables dim. */}
        {(() => {
          const xSorted = [...paths.stageCables].filter(c => c.from && c.to).sort((a, b) => a.from.x - b.from.x);
          return paths.stageCables.map(c => {
            if (!c.from || !c.to) return null;
            // In the 16-ch stage the source→sub-snake XLR stays put; the
            // patchable end is the sub-snake TAIL at the box (see patchTails).
            // So an xlr cable never follows the cursor, but it stays bright (not
            // dimmed) while its own tail is being repatched.
            const isMine = dragState && (dragState.type === 'source' || dragState.type === 'mic') && dragState.id === c.src;
            const isDragged = dragState && dragState.type === 'source' && dragState.id === c.src && !c.xlr;  // 8-ch box end follows cursor
            const isMicDrag = dragState && dragState.type === 'mic' && dragState.id === c.src;               // 16-ch mic end follows cursor
            const someOtherDragged = dragState && !isMine;
            // Stage cables are all one neutral gray, like real stage cabling —
            // no color to lean on. Hovering a cable brightens just that one so
            // a viewer can trace it end to end. Channel identity lives on the
            // snake head and the fan-out tails, not on the stage cables.
            const hovered = hoverCable === 'src:' + c.src;
            const color = hovered ? '#eae7e0' : '#7d7a72';
            // Signal-path trace: this source cable is the first leg of the run
            // the lesson is following; the others dim back so the eye stays on it.
            const traced = flowInActive && c.src === flowT.src;
            const flowDim = flowInActive && !traced;
            const rank = xSorted.indexOf(c);
            const n = xSorted.length;
            const railOffset = (rank - (n - 1) / 2) * 6;
            const railY = paths.backRailY + railOffset;
            // While dragging this cable: replace the port-end with the
            // cursor and draw a direct bezier instead of the rail-routed
            // path (the cable is in the engineer's hand, not on the rail).
            const portEnd = isDragged ? dragState.cursor : c.to;
            const micEnd = isMicDrag ? dragState.cursor : c.to;
            // MX-8 inputs gather into a horizontal trunk in the clear band between
            // the DI row and the vocal mics, run right to the stage box, and fan
            // into the IN jack on its left face. Each cable rides its own lane
            // (port-ordered, a few px apart) so they read as a parallel loom.
            const nativeInput = !state.big16 && !c.xlr && !c.drumPts;
            // Each input rides its own port-ordered lane, runs to a fan column
            // just LEFT of the box, then turns and plugs perpendicular into its
            // jack — the cable comes off the jack to the left and up, like a real
            // patch, instead of jamming straight into the box face.
            const laneY = 208 + ((c.port || 1) - 1) * 6;
            const fanX = c.to.x - (14 + ((c.port || 1) - 1) * 7);
            // A cable in the engineer's hand shows the loose curve; once patched it
            // snaps to a clean right-angle run (a shared rail), like the outputs.
            const d = isDragged
              ? window._cableCurve(c.from, portEnd)
              : (isMicDrag
                  ? window._cableCurve(c.from, micEnd)       // mic in hand: source card → cursor
                  : (c.looseMic
                      ? window._cableCurve(c.from, c.to)         // XLR out of the sub-snake: a short dangle off the card
                      : (c.drumPts
                      ? window._polyRound(c.drumPts, 6)          // down into the lane, along it, straight down into the jack
                      : (nativeInput
                          ? window._polyRound([c.from, { x: c.from.x, y: laneY }, { x: fanX, y: laneY }, { x: fanX, y: c.to.y }, c.to], 8)
                          : window._routedCable(c.from, c.to, c.xlr ? c.midY : railY)))));
            const opacity = someOtherDragged ? 0.18 : (flowDim ? 0.2 : (hovered ? 1 : 0.95));
            // No "unplugged" badge: the loose cable dangling from the source
            // is enough to read that it needs patching.
            return (
              <g key={c.src} style={{ pointerEvents: 'none' }}>
                <path d={d} stroke="#000" strokeWidth="5" fill="none" opacity={someOtherDragged ? 0.1 : 0.4} strokeLinecap="round" strokeLinejoin="round"/>
                <path d={d} stroke={color} strokeWidth={isDragged ? 4 : 3} fill="none" opacity={opacity} strokeLinecap="round" strokeLinejoin="round"/>
                {traced && <FlowStream d={d} color={flowT.color}/>}
                {!dragState && (
                  <path d={d} stroke="transparent" strokeWidth="12" fill="none" style={{ pointerEvents: 'stroke' }}
                    onPointerEnter={() => setHoverCable('src:' + c.src)} onPointerLeave={() => setHoverCable(null)}/>
                )}
                <circle cx={c.from.x} cy={c.from.y} r="2.5" fill={color} stroke="#0a0a0c" strokeWidth="0.8" opacity={someOtherDragged ? 0.3 : 1}/>
                {!isDragged && !c.xlr && (
                  <circle cx={c.to.x} cy={c.to.y} r="2.5" fill={color} stroke="#0a0a0c" strokeWidth="0.8" opacity={someOtherDragged ? 0.3 : 1}/>
                )}
                {/* DRAG HANDLE — port-end of the cable. Larger invisible hit
                    zone over a slightly larger visible plug graphic. Cursor
                    is `grab` when idle, `grabbing` while this specific
                    cable is being dragged. */}
                {!someOtherDragged && !c.xlr && (
                  <g style={{ pointerEvents: 'auto' }}>
                    <circle className="cable-hit" cx={portEnd.x} cy={portEnd.y} r="11" fill="transparent"
                      onPointerDown={(e) => startDrag(e, { type: 'source', id: c.src })}/>
                    <circle className="cable-handle" cx={portEnd.x} cy={portEnd.y} r={isDragged ? 6 : 5}
                      fill={color} stroke="#0a0a0c" strokeWidth="1.2"
                      pointerEvents="none"/>
                    <circle cx={portEnd.x} cy={portEnd.y} r="2" fill="#0a0a0c" pointerEvents="none"/>
                  </g>
                )}
                {/* 16-ch MIC end: grab the plug at the sub-snake input and drop
                    it on another input on the same sub-snake to move / swap the
                    mic. The plug follows the cursor while it's in hand. */}
                {c.xlr && !someOtherDragged && (
                  <g style={{ pointerEvents: 'auto' }}>
                    <circle className="cable-hit" cx={micEnd.x} cy={micEnd.y} r="9" fill="transparent"
                      onPointerDown={(e) => startDrag(e, { type: 'mic', id: c.src })}/>
                    <circle cx={micEnd.x} cy={micEnd.y} r={isMicDrag ? 5 : 2.5} fill={color} stroke="#0a0a0c" strokeWidth={isMicDrag ? 1.2 : 0.8} pointerEvents="none"
                      style={isMicDrag ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))' } : undefined}/>
                  </g>
                )}
              </g>
            );
          });
        })()}

        {/* Drop-target highlights for an in-progress SOURCE-cable drag.
            Each stage-box port glows green; the one the cursor is snapped
            to (within SNAP_RADIUS) glows brighter and grows. */}
        {dragState && dragState.type === 'source' && getDropTargets(dragState).map(t => {
          const isSnapped = dragState.valid === t.payload;
          return (
            <g key={`drop-${t.key}`} style={{ pointerEvents: 'none' }}>
              <circle cx={t.x} cy={t.y} r={isSnapped ? 18 : 14}
                fill="rgba(74,222,128,0.18)"
                stroke="var(--green)" strokeWidth={isSnapped ? 2.5 : 1.5}
                style={{ filter: isSnapped ? 'drop-shadow(0 0 8px rgba(74,222,128,0.6))' : 'none' }}/>
            </g>
          );
        })}

        {/* Drop-target highlights for a MIC drag — the other input jacks on the
            same sub-snake glow; the snapped one grows. */}
        {dragState && dragState.type === 'mic' && getDropTargets(dragState).map(t => {
          const isSnapped = dragState.valid === t.payload;
          return (
            <g key={`micdrop-${t.key}`} style={{ pointerEvents: 'none' }}>
              <circle cx={t.x} cy={t.y} r={isSnapped ? 12 : 9}
                fill="rgba(74,222,128,0.18)"
                stroke="var(--green)" strokeWidth={isSnapped ? 2.2 : 1.4}
                style={{ filter: isSnapped ? 'drop-shadow(0 0 7px rgba(74,222,128,0.6))' : 'none' }}/>
            </g>
          );
        })}

        {/* Snake — fat multicore from stage box right edge to fan-out left
            edge. Cornered path: exits stage box going RIGHT, runs vertically
            in the gap between the stage and console columns, then enters the
            fan-out going RIGHT. Stays out of the console panel itself. */}
        {paths.snake && (() => {
          const s = paths.snake;
          const d = s.toFOH
            ? `M ${s.from.x} ${s.from.y} L ${s.to.x} ${s.to.y}`
            : window._cornerHV(s.from, s.to, paths.snakeMidX);
          return (
            <g>
              <path d={d} stroke="#1a1a1d" strokeWidth="12" fill="none" opacity="0.95" strokeLinecap="round" strokeLinejoin="round"/>
              <path d={d} stroke="#3a3a40" strokeWidth="9" fill="none" opacity="1" strokeLinecap="round" strokeLinejoin="round"/>
              <path d={d} stroke="#6c6a64" strokeWidth="1.2" fill="none" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 8"/>
              {/* The traced channel travels INSIDE this multicore: light it so the
                  eye carries from the stage-box tail up the snake to the desk. */}
              {flowInActive && <FlowStream d={d} color={flowT.color}/>}
              {/* Hovering "snake" in the definitions panel traces the trunk
                  itself, connecting the highlighted stage box to the
                  highlighted snake block at the console. The run is the
                  concept; two boxes with nothing between them would not
                  show that one cable carries every channel. */}
              {defTerm === 'snake' && (
                <path d={d} stroke="var(--gold, #f0b429)" strokeWidth="7" fill="none"
                  opacity="0.85" strokeLinecap="round" strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 7px rgba(240,180,41,0.85))' }}/>
              )}
              {s.toFOH && (
                <text x={s.to.x + 4} y={s.to.y + 3} fill="var(--cool)" fontFamily="Geist Mono" fontSize="7" fontWeight="700" letterSpacing="0.5">→ FOH</text>
              )}
            </g>
          );
        })()}

        {/* Sub-snake bundles (16-channel): each head → the side-stage box. A
            slightly thinner multicore than the main snake. */}
        {(paths.subSnakes || []).map((s, i) => {
          // Right-angle multicore hugging the stage edges, ending with a short
          // HORIZONTAL leg into the fan-out point (perpendicular to the vertical
          // jack stack) — midX sits just left of the fan point so the fan tails
          // continue rightward into the jacks. A trunk with overTopY runs up and
          // over the very top edge first (clears the drum box), then drops in.
          const d = s.edgeRoute
            ? window._polyRound([
                { x: s.from.x, y: s.edgeRoute.laneY },     // start at the sub-snake head (floor lane)
                { x: s.edgeRoute.riserX, y: s.edgeRoute.laneY }, // run the downstage floor lane to the stage-right corridor
                { x: s.edgeRoute.riserX, y: s.to.y },      // climb the corridor just left of the box to fan height
                { x: s.to.x, y: s.to.y },                  // short PERPENDICULAR leg into the box fan point
              ], 8)
            : (s.overTopY != null
                ? `M ${s.from.x} ${s.from.y} L ${s.from.x} ${s.overTopY} L ${s.midX} ${s.overTopY} L ${s.midX} ${s.to.y} L ${s.to.x} ${s.to.y}`
                : window._cornerHV(s.from, s.to, s.midX != null ? s.midX : s.to.x));
          return (
            <g key={'subsnake-' + i}>
              <path d={d} stroke="#1a1a1d" strokeWidth="9" fill="none" opacity="0.95" strokeLinecap="round" strokeLinejoin="round"/>
              <path d={d} stroke="#3a3a40" strokeWidth="6.5" fill="none" opacity="1" strokeLinecap="round" strokeLinejoin="round"/>
              <path d={d} stroke="#6c6a64" strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 8"/>
            </g>
          );
        })}

        {/* Breakout buses: each sub-snake's multicore runs as a VERTICAL bus down
            the box's left face; the channel tails tap off it. Drawn as a neutral
            multicore-gray line, one per sub-snake. */}
        {(paths.breakoutRails || []).map((r, i) => (
          <g key={'brail-' + i} style={{ pointerEvents: 'none' }}>
            <path d={`M ${r.x} ${r.y0} L ${r.x} ${r.y1}`} stroke="#1a1a1d" strokeWidth="5" fill="none" opacity="0.9" strokeLinecap="round"/>
            <path d={`M ${r.x} ${r.y0} L ${r.x} ${r.y1}`} stroke="#3a3a40" strokeWidth="3.5" fill="none" opacity="1" strokeLinecap="round"/>
          </g>
        ))}

        {/* Fan-out tails: each conductor fans from the ONE fan-out point at the
            end of the sub-snake to its stage-box input, in the channel's own
            color — a real fan-tail. The drummer's vocal tail (→ 14) fans further
            down the face than the rest: the one deliberate cross-patch. */}
        {(paths.patchTails || []).map((t) => {
          // A gentle S-curve from the fan-out point to the jack, like a real cable
          // relaxing into place, so the whole fan splays instead of reading as
          // hard straight lines. Dangling (unpatched) tails curve loose to an
          // unconnected end.
          //
          // PATCHABLE: on the 16-ch band stage the tail's box end is a drag
          // handle — grab it and drop it on a different IN jack to repatch that
          // source (mutates state.cables, so the console channel + audio follow).
          const patchable = state.big16 && !t.dangling && t.srcKey && !!window.SOURCES[t.srcKey];
          const isDragged = patchable && dragState && dragState.type === 'source' && dragState.id === t.srcKey;
          const someOtherDragged = dragState && dragState.type === 'source' && (!patchable || dragState.id !== t.srcKey);
          // Hover trace: sharing the 'src:'+key hover channel with the mic cable
          // means hovering EITHER end lights the whole run (mic → sub-snake → box).
          const hov = patchable && !dragState && hoverCable === 'src:' + t.srcKey;
          const emph = isDragged || hov;
          const end = isDragged ? dragState.cursor : { x: t.x, y: t.y };
          const dx = end.x - t.fromX, dy = end.y - t.fromY;
          const d = `M ${t.fromX} ${t.fromY} C ${t.fromX + dx * 0.55} ${t.fromY + dy * 0.08}, ${t.fromX + dx * 0.45} ${end.y - dy * 0.08}, ${end.x} ${end.y}`;
          const dim = someOtherDragged ? 0.2 : 1;
          const lineOp = t.dangling ? 0.55 : (t.cross ? 0.98 : 0.8);
          // At rest the plug is a small dot (so the box isn't dotted with big
          // handles); it grows + glows on hover or while dragging. A LOOSE
          // (unplugged) cable reads as an open connector — dark fill, coloured
          // ring — and sits a touch larger so it's noticeable as "needs patching".
          const plugR = isDragged ? 5.5 : (hov ? 5 : (t.loose ? 3.5 : 2));
          const openPlug = t.loose || t.dangling;
          return (
            <g key={'patch-' + t.srcKey} style={{ pointerEvents: 'none' }}>
              <path d={d} stroke="#000" strokeWidth="3.5" fill="none" opacity={(t.dangling ? 0.18 : 0.35) * dim} strokeLinecap="round"/>
              <path d={d} stroke={hov ? '#eae7e0' : t.color} strokeWidth={(t.cross ? 2.4 : 1.8) + (emph ? 0.6 : 0)} fill="none" opacity={(hov ? 1 : (t.loose ? 0.85 : lineOp)) * dim} strokeLinecap="round" strokeDasharray={t.dangling ? '5 3' : (t.loose ? '2 2' : 'none')}/>
              <circle cx={end.x} cy={end.y} r={plugR} fill={openPlug ? '#0a0a0c' : t.color} stroke={openPlug ? t.color : '#0a0a0c'} strokeWidth={t.loose ? 1.3 : 0.8} opacity={dim}
                style={emph ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))', transition: 'r 0.1s ease' } : { transition: 'r 0.1s ease' }}/>
              {/* GRAB ZONE — the tail's box end repatches the source. Hovering it
                  lights the whole cable run; the visible plug is the circle above. */}
              {patchable && !someOtherDragged && (
                <circle className="cable-hit" cx={end.x} cy={end.y} r="10" fill="transparent" style={{ pointerEvents: 'auto' }}
                  onPointerDown={(e) => startDrag(e, { type: 'source', id: t.srcKey })}
                  onPointerEnter={() => setHoverCable('src:' + t.srcKey)}
                  onPointerLeave={() => setHoverCable(null)}/>
              )}
            </g>
          );
        })}
        {/* The single fan-out point at the end of each sub-snake (drawn once). */}
        {(() => {
          const pts = {};
          (paths.patchTails || []).forEach(t => { pts[t.fromX + ',' + t.fromY] = t; });
          return Object.values(pts).map((t, i) => (
            <circle key={'fanpt-' + i} cx={t.fromX} cy={t.fromY} r="3" fill="#6c6a64" stroke="#0a0a0c" strokeWidth="0.8" style={{ pointerEvents: 'none' }}/>
          ));
        })()}

        {/* Fan-out tails + their drag targets (extracted to fanOutEls so the
            16-channel MIXER view can render the same interactive fan-out). */}
        {fanOutEls}

        {/* RETURN TAILS + their drop targets (extracted to outFanEls so the
            16-channel MIXER view renders the same interactive return fan-out). */}
        {outFanEls}

        {/* Speaker cables → their PATCHED stage-box out ports, along the
            FRONT RAIL. Rail order from TOP to BOTTOM: Wedge 1, Wedge 2,
            PA R, PA L (mains anchored at the floor). The PORT end of every
            cable is a drag handle: drop it on a different out port to
            repatch (swap semantics). Unplugged cables dangle near the box. */}
        {(paths.outCables || []).map(c => {
          const isDragged = dragState && dragState.type === 'outpatch' && dragState.id === c.spk;
          const someOtherDragged = dragState && !isDragged;
          const portEnd = isDragged ? dragState.cursor : c.from;
          // Return leaves the box perpendicular (a short horizontal lead off the
          // left face), then routes so it NEVER crosses a device. Front speakers:
          // drop to the return rail BELOW every speaker, run along it, then come
          // straight UP into the speaker from below (so the wedge cable reads as
          // "straight down, then over"). The one upstage wedge (W4, by the kit)
          // instead leads out and bends across to it.
          const L = paths.cableLanes;
          const d = isDragged
            ? window._cableCurve(portEnd, c.to)
            // 16-CHANNEL STAGE: every return drops down the stage box's own
            // clear right-side edge, then rides a RESERVED LANE that is measured
            // from the device rects so it can never land on a card. Downstage
            // speakers ride the FRONT FLOOR lane (below every card); the one
            // upstage wedge (W4, by the kit) rides the BACK EDGE lane (above
            // every card). Each port gets its own offset so parallel runs never
            // stack. See cableLanes in the compute() effect.
            : (L
                ? ((!c.big16 || c.to.y > 480)
                    ? window._polyRound([
                        c.from,
                        { x: L.descendX - c.portId * L.descendPitch, y: c.from.y },                                  // out into this port's own vertical lane, CLEAR of the box
                        { x: L.descendX - c.portId * L.descendPitch, y: L.frontFloorY + c.portId * L.frontPitch },   // down that lane to this port's floor lane
                        { x: c.to.x,   y: L.frontFloorY + c.portId * L.frontPitch },                                 // along the floor, below every card
                        c.to,                                                                                        // up into the speaker bottom
                      ], 8)
                    // W4 is the ONLY cable on the back-edge lane, so it takes the
                    // ascent lane straight, with no per-port offset. Offsetting it
                    // walked it left into the keys DI on its way up, which is the
                    // drum-monitor cable Kyle spotted running through the gear.
                    : window._polyRound([
                        c.from,
                        { x: L.descendX, y: c.from.y },    // out clear of the box first
                        { x: L.descendX, y: L.backEdgeY }, // straight up, in the gap between the box and the keys DI
                        { x: c.to.x,   y: L.backEdgeY },   // along the back edge, above every card
                        c.to,                              // down into the wedge (top-connected)
                      ], 8))
            : (c.to.y > 480
                // MX-8 front row: own vertical lane out of the box, own floor
                // lane 8px from its neighbours, then up into the speaker bottom.
                ? window._polyRound([
                    c.from,
                    { x: 656 + c.portId * 33, y: c.from.y },
                    { x: 656 + c.portId * 33, y: 500 + c.portId * 8 },
                    { x: c.to.x, y: 500 + c.portId * 8 },
                    c.to,
                  ], 8)
                // MX-8 upstage wedge (no cableLanes on the small board).
                : window._polyRound([
                    c.from,
                    { x: 656 + c.portId * 33, y: c.from.y },
                    { x: 656 + c.portId * 33, y: 500 + c.portId * 8 },
                    { x: c.to.x, y: 500 + c.portId * 8 },
                    c.to,
                  ], 8)));
          const live = !c.unplugged && !isDragged && retLive(c.portId);
          const hovered = hoverCable === 'out:' + c.spk;
          const color = hovered ? '#eae7e0' : '#7d7a72';
          const opacity = someOtherDragged ? 0.18 : (hovered ? 1 : (c.unplugged ? 0.5 : 0.92));
          return (
            <g key={'stage-out-' + c.spk} style={{ pointerEvents: 'none' }}>
              <path d={d} stroke="#000" strokeWidth="5" fill="none" opacity={someOtherDragged ? 0.1 : 0.4} strokeLinecap="round" strokeLinejoin="round"/>
              <path d={d} stroke={color} strokeWidth={isDragged ? 4 : 3} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}/>
              {!dragState && (
                <path d={d} stroke="transparent" strokeWidth="12" fill="none" style={{ pointerEvents: 'stroke' }}
                  onPointerEnter={() => setHoverCable('out:' + c.spk)} onPointerLeave={() => setHoverCable(null)}/>
              )}
              <circle cx={c.to.x} cy={c.to.y} r="2.5" fill={color} stroke="#0a0a0c" strokeWidth="0.8" opacity={someOtherDragged ? 0.3 : 1}/>
              {c.unplugged && !isDragged && !someOtherDragged && (
                <g pointerEvents="none">
                  <rect x={portEnd.x - 18} y={portEnd.y + 8} width={36} height={12} rx={2}
                    fill="rgba(255,70,48,0.15)" stroke="var(--hot)" strokeWidth={0.8}/>
                  <text x={portEnd.x} y={portEnd.y + 17} textAnchor="middle" fill="var(--hot)"
                    fontFamily="Geist Mono" fontSize="7.5" fontWeight="700" letterSpacing="0.6">{c.name}</text>
                </g>
              )}
              {live && (
                <path d={d} stroke="#fff" strokeWidth="1.2" fill="none" strokeDasharray="3 6" strokeLinecap="round" strokeLinejoin="round" opacity="0.65">
                  <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="0.6s" repeatCount="indefinite"/>
                </path>
              )}
              {!someOtherDragged && (
                <g style={{ pointerEvents: 'auto' }}>
                  <circle className="cable-hit" cx={portEnd.x} cy={portEnd.y} r="11" fill="transparent"
                    onPointerDown={(e) => startDrag(e, { type: 'outpatch', id: c.spk })}/>
                  <circle className="cable-handle" cx={portEnd.x} cy={portEnd.y} r={isDragged ? 6 : 5}
                    fill={color} stroke="#0a0a0c" strokeWidth="1.2" pointerEvents="none"/>
                  <circle cx={portEnd.x} cy={portEnd.y} r="2" fill="#0a0a0c" pointerEvents="none"/>
                </g>
              )}
            </g>
          );
        })}

        {/* Drop-target highlights for an OUT-PATCH drag — the four out ports glow. */}
        {dragState && dragState.type === 'outpatch' && getDropTargets(dragState).map(t => {
          const isSnapped = dragState.valid === t.payload;
          return (
            <g key={`drop-${t.key}`} style={{ pointerEvents: 'none' }}>
              <circle cx={t.x} cy={t.y} r={isSnapped ? 18 : 14}
                fill="rgba(74,222,128,0.18)"
                stroke="var(--green)" strokeWidth={isSnapped ? 2.5 : 1.5}
                style={{ filter: isSnapped ? 'drop-shadow(0 0 8px rgba(74,222,128,0.6))' : 'none' }}/>
            </g>
          );
        })}

        {/* Top grab-layer: every DISCONNECTED cable head, rendered above all
            cable bodies and hover strips so it can always be picked up, even
            when a neighbouring cable is drawn on top of it. Only while idle —
            during a drag the in-hand end follows the cursor instead. */}
        {!dragState && (
          <g style={{ pointerEvents: 'auto' }}>
            {(paths.stageCables || []).map(c => {
              if (!c.to || !c.unplugged) return null;
              const drag = c.xlr ? { type: 'mic', id: c.src } : { type: 'source', id: c.src };
              return <circle key={'gh-s-' + c.src} className="cable-hit" cx={c.to.x} cy={c.to.y} r="11" fill="transparent"
                onPointerDown={(e) => startDrag(e, drag)}
                onPointerEnter={() => setHoverCable('src:' + c.src)} onPointerLeave={() => setHoverCable(null)}/>;
            })}
            {(paths.patchTails || []).map(t => {
              if (!(t.loose && state.big16 && t.srcKey && window.SOURCES[t.srcKey])) return null;
              return <circle key={'gh-t-' + t.srcKey} className="cable-hit" cx={t.x} cy={t.y} r="11" fill="transparent"
                onPointerDown={(e) => startDrag(e, { type: 'source', id: t.srcKey })}
                onPointerEnter={() => setHoverCable('src:' + t.srcKey)} onPointerLeave={() => setHoverCable(null)}/>;
            })}
            {(paths.outCables || []).map(c => (c.from && c.unplugged) ? (
              // Grab the LOOSE end (c.from, the stage-box jack side with the OPEN
              // badge), which is the end that follows the cursor on a drag — not
              // c.to (the fixed speaker end).
              <circle key={'gh-o-' + c.spk} className="cable-hit" cx={c.from.x} cy={c.from.y} r="11" fill="transparent"
                onPointerDown={(e) => startDrag(e, { type: 'outpatch', id: c.spk })}
                onPointerEnter={() => setHoverCable('out:' + c.spk)} onPointerLeave={() => setHoverCable(null)}/>
            ) : null)}
          </g>
        )}
      </svg>
      )}

      {/* Console-only fan-out overlay for the 16-channel MIXER view. On the big
          desk the stage and its cable overlay are a separate screen, so the
          FOH fan-out gets its own overlay here — the same interactive tails, so
          a crosspatch can be made and fixed at the console, not only the stage
          box. fanOutEls draws nothing unless the console (SNAKE anchor + channel
          inputs) is on screen, so this is inert on the MX-8 and the STAGE view. */}
      {state.big16 && !stageOnly && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%', zIndex: 5 }}>
          {fanOutEls}
          {outFanEls}
        </svg>
      )}

      {/* Zoom-button layer — sits ABOVE the cable overlay (zIndex 6 > 5) so a
          cable can never cover a button. One per zoomable region, pinned to the
          region's top-right corner and counter-scaled to a constant size. It
          persists while zoomed as a second, in-place way back to the fit view. */}
      {paths.zoomRegions && paths.zoomRegions.length > 0 && (onZoomTo || onZoomReset) && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }}>
          {paths.zoomRegions.map((r) => (
            <div key={r.key} style={{ position: 'absolute', left: r.bx, top: r.by,
              transform: `translate(-50%, -50%) scale(${1 / (fitScale || 1)})`, pointerEvents: 'auto' }}>
              <ZoomBtn zoomed={zoomActive} onClick={() => (zoomActive ? (onZoomReset && onZoomReset()) : (onZoomTo && onZoomTo(r.el)))}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.Chain = Chain;
window.AudienceSplMeter = AudienceSplMeter;
