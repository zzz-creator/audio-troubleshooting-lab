const { useState, useEffect, useRef, useCallback } = React;

// Live board scale factor, shared across <script> blocks via window (each
// babel block has its own module scope). App provides it from useFitScale;
// Knob consumes it so pointer-drag sensitivity matches the on-screen (scaled)
// knob size instead of feeling off when the whole board is zoomed to fit.
const FitScaleContext = React.createContext(1);
window.FitScaleContext = FitScaleContext;

// A lesson step can ask the board to TRACE one signal path — light the whole
// run and animate signal flowing along it so the eye follows source → snake →
// console (or the mirror: console → snake → speaker). The active step's `flow`
// spec rides this context down to the cable overlay in Chain, exactly the way
// the fit scale rides FitScaleContext. null = no trace (the normal board).
// Spec shapes: { source: 'vocal' } | { channel: 1 } trace an input path;
// { out: 'wedge1' } traces an output path. See _resolveFlow in Chain.
const FlowTraceContext = React.createContext(null);
window.FlowTraceContext = FlowTraceContext;

function Knob({ value, onChange, min = 0, max = 1, size = 44, label, sublabel, color = 'var(--accent)', track = 'var(--line)', detentAt = null, format = null, disabled = false, tip = null }) {
  const ref = useRef(null);
  const startRef = useRef(null);
  const fitScale = React.useContext(FitScaleContext);
  const norm = (value - min) / (max - min);
  const angle = -135 + norm * 270;

  const onPointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    ref.current.setPointerCapture(e.pointerId);
    startRef.current = { y: e.clientY, v: value };
  };
  const onPointerMove = (e) => {
    if (!startRef.current) return;
    const dy = startRef.current.y - e.clientY;
    // Sensitivity is tuned in layout pixels. When the board is scaled to fit,
    // a client pixel covers 1/fitScale layout pixels, so divide by fitScale to
    // keep the drag feeling 1:1 with the visible (scaled) knob.
    const sens = e.shiftKey ? 600 : 180;
    let v = startRef.current.v + (dy / (sens * fitScale)) * (max - min);
    v = Math.max(min, Math.min(max, v));
    onChange(v);
  };
  const onPointerUp = (e) => {
    if (!startRef.current) return;
    startRef.current = null;
    try { ref.current.releasePointerCapture(e.pointerId); } catch {}
  };
  const onDoubleClick = () => {
    if (disabled) return;
    onChange(detentAt != null ? detentAt : (min + max) / 2);
  };
  // Keyboard operability (the console was pointer-only). Arrows nudge, Shift =
  // fine, PageUp/Down = coarse, Home/End = ends. role="slider" + aria-value* let
  // a screen reader announce the level.
  const onKeyDown = (e) => {
    if (disabled) return;
    const fine = e.shiftKey ? (max - min) / 200 : (max - min) / 50;
    let v = value, handled = true;
    switch (e.key) {
      case 'ArrowUp': case 'ArrowRight': v = value + fine; break;
      case 'ArrowDown': case 'ArrowLeft': v = value - fine; break;
      case 'PageUp': v = value + (max - min) / 10; break;
      case 'PageDown': v = value - (max - min) / 10; break;
      case 'Home': v = min; break;
      case 'End': v = max; break;
      default: handled = false;
    }
    if (!handled) return;
    e.preventDefault();
    onChange(Math.max(min, Math.min(max, v)));
  };

  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 3;

  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const a = (-135 + (i / 10) * 270) * Math.PI / 180;
    const x1 = cx + Math.cos(a) * (r + 2);
    const y1 = cy + Math.sin(a) * (r + 2);
    const x2 = cx + Math.cos(a) * (r + 5);
    const y2 = cy + Math.sin(a) * (r + 5);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-3)" strokeWidth="1"/>);
  }

  const startA = -135 * Math.PI / 180;
  const endA = angle * Math.PI / 180;
  const arcR = r + 3.5;
  const sx = cx + Math.cos(startA) * arcR;
  const sy = cy + Math.sin(startA) * arcR;
  const ex = cx + Math.cos(endA) * arcR;
  const ey = cy + Math.sin(endA) * arcR;
  const largeArc = endA - startA > Math.PI ? 1 : 0;

  return (
    <div className="ui-no-select" title={tip || undefined} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, opacity: disabled ? 0.4 : 1 }}>
      {label && <div className="mono" style={{ fontSize: 8.5, letterSpacing: 0.6, color: 'var(--ink-2)', textTransform: 'uppercase' }}>{label}</div>}
      <svg
        ref={ref}
        className="knob"
        width={size + 14} height={size + 14}
        viewBox={`${-7} ${-7} ${size + 14} ${size + 14}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label || tip || 'control'}
        aria-valuemin={min} aria-valuemax={max}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={format ? format(value) : Math.round(norm * 100) + ' percent'}
      >
        {ticks}
        <path d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 ${largeArc} 1 ${ex} ${ey}`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.9}/>
        <defs>
          <radialGradient id={`knob-grad-${size}`} cx="35%" cy="30%">
            <stop offset="0%" stopColor="#5a5a62"/>
            <stop offset="55%" stopColor="#2e2e34"/>
            <stop offset="100%" stopColor="#161618"/>
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill={`url(#knob-grad-${size})`} stroke="#0a0a0c" strokeWidth="1"/>
        <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke="#3e3e44" strokeWidth="0.7"/>
        <g transform={`rotate(${angle} ${cx} ${cy})`}>
          <line x1={cx} y1={cy + 2} x2={cx} y2={cy - r + 3} stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round"/>
        </g>
      </svg>
      {sublabel && <div className="mono" style={{ fontSize: 8, color: 'var(--ink-3)', marginTop: -1 }}>{sublabel}</div>}
      {format && <div className="mono" style={{ fontSize: 8, color: 'var(--ink-2)' }}>{format(value)}</div>}
    </div>
  );
}

function Fader({ value, onChange, height = 180, color = '#dcd7c6', tickLabels = true }) {
  const ref = useRef(null);
  const startRef = useRef(null);

  const onPointerDown = (e) => {
    e.preventDefault();
    ref.current.setPointerCapture(e.pointerId);
    const rect = ref.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const v = 1 - y / rect.height;
    onChange(Math.max(0, Math.min(1, v)));
    startRef.current = { y: e.clientY, v: Math.max(0, Math.min(1, v)) };
  };
  const onPointerMove = (e) => {
    if (!startRef.current) return;
    const rect = ref.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const v = 1 - y / rect.height;
    onChange(Math.max(0, Math.min(1, v)));
  };
  const onPointerUp = (e) => {
    if (!startRef.current) return;
    startRef.current = null;
    try { ref.current.releasePointerCapture(e.pointerId); } catch {}
  };
  const onDoubleClick = () => onChange(0.75);
  const onKeyDown = (e) => {
    const fine = e.shiftKey ? 0.005 : 0.02;
    let v = value, handled = true;
    switch (e.key) {
      case 'ArrowUp': case 'ArrowRight': v = value + fine; break;
      case 'ArrowDown': case 'ArrowLeft': v = value - fine; break;
      case 'PageUp': v = value + 0.1; break;
      case 'PageDown': v = value - 0.1; break;
      case 'Home': v = 1; break;
      case 'End': v = 0; break;
      default: handled = false;
    }
    if (!handled) return;
    e.preventDefault();
    onChange(Math.max(0, Math.min(1, v)));
  };

  const capH = 28;
  const trackH = height;
  const capY = (1 - value) * (trackH - capH);

  // Positions come from the REAL fader taper (FADER_TAPER): unity at 75% of
  // travel, +10 at the top, log spacing below — the printed scale now agrees
  // with the actual gain at every position.
  const ticks = [
    { v: 1.0, label: '+10' },
    { v: 0.75, label: 'U' },
    { v: 0.50, label: '-10' },
    { v: 0.38, label: '-20' },
    { v: 0.18, label: '-40' },
    { v: 0.0, label: '-∞' },
  ];

  return (
    <div className="ui-no-select" style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', position: 'relative' }}>
      {tickLabels && (
        <div style={{ position: 'relative', height: trackH, width: 18, fontSize: 7, color: 'var(--ink-3)' }} className="mono">
          {ticks.map(t => (
            /* The U tick carries an anchor so hovering "unity" in the
               definitions panel can point an arrow at the exact line,
               rather than washing the whole fader. */
            <div key={t.label} data-walk={t.label === 'U' ? 'unity-mark' : undefined} style={{ position: 'absolute', right: 0, top: (1 - t.v) * (trackH - capH) + capH / 2 - 4, lineHeight: 1}}>{t.label}</div>
          ))}
        </div>
      )}
      <div
        ref={ref}
        className="fader-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="fader level"
        aria-valuemin={0} aria-valuemax={1}
        aria-valuenow={Number(value.toFixed(3))}
        aria-valuetext={Math.round(value * 100) + ' percent'}
        style={{
          position: 'relative',
          width: 22,
          height: trackH,
          background: 'linear-gradient(180deg,#0a0a0c,#141417)',
          border: '1px solid #38383e',
          borderRadius: 3,
          boxShadow: 'inset 0 0 6px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          position: 'absolute', left: '50%', top: capH/2, bottom: capH/2,
          width: 2, transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg,#000,#222)', borderRadius: 1,
        }}/>
        <div style={{ position: 'absolute', left: 0, right: 0, top: (1 - 0.75) * (trackH - capH) + capH / 2, height: 1, background: 'var(--accent)', opacity: 0.35 }}/>
        <div className="fader-cap" style={{
          position: 'absolute',
          left: -7, width: 36, height: capH,
          top: capY,
          background: `linear-gradient(180deg, #6b6760 0%, #3a3833 45%, #232220 55%, #4a4742 100%)`,
          border: '1px solid #0a0a0a',
          borderRadius: 3,
          boxShadow: '0 2px 4px rgba(0,0,0,0.6), inset 0 1px 0 #8a857a',
        }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: color, opacity: 0.95, transform: 'translateY(-50%)', boxShadow: `0 0 4px ${color}` }}/>
          <div style={{ position: 'absolute', left: 4, right: 4, top: 4, height: 3, background: '#1a1916', borderRadius: 1 }}/>
          <div style={{ position: 'absolute', left: 4, right: 4, bottom: 4, height: 3, background: '#1a1916', borderRadius: 1 }}/>
        </div>
      </div>
    </div>
  );
}

// Peak meters read in dBFS, like a real console: 0 dBFS = full scale (the clip
// point, level ~1.1), and everything below is a true 20*log10 ratio floored at
// -48. The ladder is dB-scaled (log), not linear amplitude, so the segments and
// the printed scale line up with real dB. Color follows the dBFS zones: green
// in the working range, amber as it gets hot, red the last few dB into clip.
const DBFS_FLOOR = -48;   // bottom of the meter
const DBFS_MARKS = [0, -3, -6, -12, -18, -24, -36, -48];
// 0 dBFS = the console's +22 dBu clip point; nominal (+4 dBu) reads -18 dBFS,
// the X32-class alignment. Reads the real-units model via linToDbu.
window.levelToDbfs = (level) => (level > 0.0009 ? (window.linToDbu(level) - 22) : -60);
const dbfsFrac = (db) => Math.max(0, Math.min(1, (db - DBFS_FLOOR) / (0 - DBFS_FLOOR)));
window.dbfsFrac = dbfsFrac;
// dBFS -> LED color. Green is the working range, amber the last stretch before
// clip, red the top few dB and over.
// Zone map, X32-like: green up to -12 dBFS, amber -12..-3 (hot), red from -3
// (danger: peaks are within 3 dB of the clip point). Audible distortion does
// not start until peaks actually REACH the clip point, so the red always
// warns BEFORE you hear it — never after.
const dbfsColor = (db) => (db >= -3 ? '#ff4630' : db >= -12 ? '#ffb547' : '#4ade80');

// Peak-hold. A real digital meter freezes the highest recent peak for a beat, so
// you SEE the transient that clipped even though the bar's body sits well below
// it (program peaks ride ~12 dB above the average). Without it, the peak that
// drives the preamp into grit only flashes for a frame or two, and the eye reads
// the steady yellow body while the ear hears the red peak. Holding the peak
// ~0.9 s then dropping it at a PPM-like ~12 dB/s is what makes "the meter goes
// red exactly when you'd hear it distort" true, the way it is on a real desk.
// Time-based (performance.now) so it falls at the same rate no matter how often
// a given meter re-renders. `ref` persists per meter instance across frames.
function advancePeakHold(ref, db) {
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  const st = ref.current;
  const dt = st.t == null ? 0 : Math.max(0, now - st.t);
  st.t = now;
  if (db >= st.db) { st.db = db; st.holdUntil = now + 900; }
  else if (now >= st.holdUntil) { st.db = Math.max(db, st.db - 0.012 * dt); }
  return st.db;
}
window.advancePeakHold = advancePeakHold;
// The segment index (0 = bottom) a held dBFS lights, for any N-segment meter.
const peakHoldIdx = (holdDb, segments) => (holdDb > DBFS_FLOOR + 1
  ? Math.max(0, Math.min(segments - 1, Math.round(dbfsFrac(holdDb) * segments) - 1)) : -1);
window.peakHoldIdx = peakHoldIdx;

// ---- Imperative meter system --------------------------------------------
// The audio math (computeAudio) is cheap (~0.08ms), but re-rendering the whole
// mixer to move the meters every frame reconciles ~3700 nodes and stalls the
// audio thread on slower machines (proven: freezing the redraw makes playback
// clean). So meters render their STRUCTURE once via React, then the animation
// loop pushes live levels straight to their segment DOM through this registry.
// No per-frame React render. Each meter registers by a stable mkey; the loop
// calls window.__applyMeters(getLevel) with a level lookup.
const METER_REG = new Map(); // mkey -> Set of entry objects
function meterRegister(mkey, entry) {
  if (!mkey) return () => {};
  let set = METER_REG.get(mkey);
  if (!set) { set = new Set(); METER_REG.set(mkey, set); }
  set.add(entry);
  return () => { const s = METER_REG.get(mkey); if (s) { s.delete(entry); if (!s.size) METER_REG.delete(mkey); } };
}
// Vertical LED bar (LedMeter): cells in DOM order i=0..N-1, i=0 is the TOP.
// Each function skips all DOM writes when nothing visible changed (lit + hold
// segment identical to last frame), so per-frame work stays near zero.
function applyLedCells(entry, level) {
  const { cells, segments, hold } = entry;
  const db = window.levelToDbfs(level);
  const lit = Math.round(dbfsFrac(db) * segments);
  const holdDb = advancePeakHold({ current: hold }, db);
  const holdIdx = peakHoldIdx(holdDb, segments);
  const zone = holdDb >= -3 ? 2 : holdDb >= -12 ? 1 : 0;
  if (entry._lit === lit && entry._hi === holdIdx && entry._z === zone) return;
  entry._lit = lit; entry._hi = holdIdx; entry._z = zone;
  for (let i = 0; i < segments; i++) {
    const idx = segments - 1 - i;
    const segDb = DBFS_FLOOR + ((idx + 1) / segments) * (0 - DBFS_FLOOR);
    const isHold = idx === holdIdx;
    const col = isHold ? dbfsColor(holdDb) : dbfsColor(segDb);
    const on = idx < lit || isHold;
    const el = cells[i];
    if (!el) continue;
    el.style.background = on ? col : '#1a1a1c';
    el.style.boxShadow = on ? ('0 0 ' + (isHold ? 6 : 4) + 'px ' + col) : 'inset 0 0 2px #000';
    el.style.opacity = on ? '1' : '0.5';
  }
}
// Horizontal mini bar (MiniMeter): cells in DOM order i=0..N-1, i=0 is LEFT/low.
function applyMiniCells(entry, level) {
  const { cells, segments, hold } = entry;
  const db = window.levelToDbfs(level);
  const lit = Math.min(segments, Math.round(dbfsFrac(db) * segments));
  const holdDb = advancePeakHold({ current: hold }, db);
  const holdIdx = peakHoldIdx(holdDb, segments);
  const zone = holdDb >= -3 ? 2 : holdDb >= -12 ? 1 : 0;
  if (entry._lit === lit && entry._hi === holdIdx && entry._z === zone) return;
  entry._lit = lit; entry._hi = holdIdx; entry._z = zone;
  for (let i = 0; i < segments; i++) {
    const segDb = -48 + ((i + 1) / segments) * 48;
    const isHold = i === holdIdx;
    const c = isHold ? dbfsColor(holdDb) : dbfsColor(segDb);
    const on = i < lit || isHold;
    const el = cells[i];
    if (!el) continue;
    el.style.background = on ? c : '#1a1a1c';
    el.style.boxShadow = on ? ('0 0 ' + (isHold ? 4 : 2) + 'px ' + c) : 'none';
    el.style.opacity = on ? '1' : '0.45';
  }
}
// Horizontal PFL bar: same zone map as mini, PFLBar's own off-opacity/glow.
function applyPflCells(entry, level) {
  const { cells, segments, hold } = entry;
  const db = window.levelToDbfs(level);
  const lit = Math.min(segments, Math.round(dbfsFrac(db) * segments));
  const holdDb = advancePeakHold({ current: hold }, db);
  const holdIdx = peakHoldIdx(holdDb, segments);
  const zone = holdDb >= -3 ? 2 : holdDb >= -12 ? 1 : 0;
  if (entry._lit === lit && entry._hi === holdIdx && entry._z === zone) return;
  entry._lit = lit; entry._hi = holdIdx; entry._z = zone;
  for (let i = 0; i < segments; i++) {
    const segDb = -48 + ((i + 1) / segments) * 48;
    const isHold = i === holdIdx;
    const c = isHold ? dbfsColor(holdDb) : dbfsColor(segDb);
    const on = i < lit || isHold;
    const el = cells[i];
    if (!el) continue;
    el.style.background = on ? c : '#1a1a1c';
    el.style.boxShadow = on ? ('0 0 ' + (isHold ? 5 : 3) + 'px ' + c) : 'none';
    el.style.opacity = on ? '1' : '0.5';
  }
}
const METER_APPLY = { led: applyLedCells, mini: applyMiniCells, pfl: applyPflCells };
// Called by the animation loop. getLevel(mkey) returns the live level (or undef).
window.__applyMeters = function (getLevel) {
  METER_REG.forEach((set, mkey) => {
    const lvl = getLevel(mkey);
    if (lvl == null) return;
    set.forEach(entry => {
      if (!entry.cells || !entry.cells.length) return;
      (METER_APPLY[entry.kind] || applyLedCells)(entry, lvl);
    });
  });
};
// Hook: registers a meter's cells under mkey and keeps them live imperatively.
function useMeterCells(mkey, kind, segments) {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !mkey) return;
    const cells = Array.from(root.querySelectorAll('.led-cell'));
    const entry = { kind, segments, cells, hold: { db: -60, t: null, holdUntil: 0 } };
    return meterRegister(mkey, entry);
  }, [mkey, kind, segments]);
  return rootRef;
}
window.__meterKeys = null; // set by App each state change: fn(mkey)->level base

function LedMeter({ level, height = 180, segments = 18, scale = false, mkey = null }) {
  const db = window.levelToDbfs(level);
  const lit = Math.round(dbfsFrac(db) * segments);
  const holdRef = useRef({ db: -60, t: null, holdUntil: 0 });
  const holdDb = advancePeakHold(holdRef, db);
  const holdIdx = peakHoldIdx(holdDb, segments);
  // With mkey, this meter renders its structure once and the animation loop
  // pushes live levels straight to the .led-cell DOM (no per-frame React).
  const rootRef = useMeterCells(mkey, 'led', segments);
  const cells = [];
  for (let i = 0; i < segments; i++) {
    const idx = segments - 1 - i; // segDb rises with idx; idx 0 = bottom, high idx = top
    // The dBFS this segment tops out at, so its color and the printed scale agree.
    const segDb = DBFS_FLOOR + ((idx + 1) / segments) * (0 - DBFS_FLOOR);
    const isHold = idx === holdIdx;
    const col = isHold ? dbfsColor(holdDb) : dbfsColor(segDb);
    const on = idx < lit || isHold;
    cells.push(
      <div key={i} className="led-cell" style={{
        flex: 1, margin: '1px 0', borderRadius: 1,
        background: on ? col : '#1a1a1c',
        boxShadow: on ? `0 0 ${isHold ? 6 : 4}px ${col}` : 'inset 0 0 2px #000',
        opacity: on ? 1 : 0.5,
      }}/>
    );
  }
  // Non-color threshold marks so the hot (-12) and clip (-3) lines read for
  // colorblind users, who can't tell amber from red on the segments alone. The
  // clip line is brighter and wider — that's the one that means distortion.
  const hotFrac = dbfsFrac(-12), clipFrac = dbfsFrac(-3);
  const bar = (
    <div ref={rootRef} className="ui-no-select" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height, width: 10, padding: 1, background: '#0a0a0c', border: '1px solid #38383e', borderRadius: 2 }}>
      {cells}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(' + (hotFrac * 100) + '% - 0.5px)', height: 1, background: 'rgba(233,231,224,0.28)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', left: -1.5, right: -1.5, bottom: 'calc(' + (clipFrac * 100) + '% - 0.5px)', height: 1.5, background: 'rgba(233,231,224,0.6)', pointerEvents: 'none' }}/>
    </div>
  );
  if (!scale) return bar;
  // Optional printed dBFS scale down the right side (used on the meters that
  // have room: the master L/R and the channel level meter).
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 2 }}>
      {bar}
      <div className="mono" style={{ position: 'relative', width: 13, height, fontSize: 5.5, color: 'var(--ink-3)', letterSpacing: 0.2, fontWeight: 700 }}>
        {DBFS_MARKS.map((m) => (
          <div key={m} style={{ position: 'absolute', left: 0, top: (1 - dbfsFrac(m)) * height - 2.5, lineHeight: 1 }}>{m}</div>
        ))}
      </div>
    </div>
  );
}

// Small horizontal LED meter — used on destination devices (PA speakers, wedge,
// stream gear) so engineers can see signal arriving at each output without
// needing the full signal-flow diagnostic.
function MiniMeter({ level, width = 44, segments = 10, mkey = null }) {
  const db = window.levelToDbfs(level);
  const lit = Math.min(segments, Math.round((window.dbfsFrac ? window.dbfsFrac(db) : 0) * segments));
  const holdRef = useRef({ db: -60, t: null, holdUntil: 0 });
  const holdDb = advancePeakHold(holdRef, db);
  const holdIdx = peakHoldIdx(holdDb, segments);
  const rootRef = useMeterCells(mkey, 'mini', segments);
  return (
    <div ref={rootRef} className="ui-no-select" style={{
      display: 'flex', gap: 1,
      width, height: 6,
      padding: 1,
      background: '#0a0a0c',
      border: '1px solid #38383e',
      borderRadius: 2,
    }}>
      {Array.from({ length: segments }).map((_, i) => {
        const segDb = -48 + ((i + 1) / segments) * 48;
        const isHold = i === holdIdx;
        const c = isHold ? dbfsColor(holdDb) : dbfsColor(segDb);
        const on = i < lit || isHold;
        return <div key={i} className="led-cell" style={{
          flex: 1,
          background: on ? c : '#1a1a1c',
          borderRadius: 0.5,
          boxShadow: on ? `0 0 ${isHold ? 4 : 2}px ${c}` : 'none',
          opacity: on ? 1 : 0.45,
        }}/>;
      })}
    </div>
  );
}

function ButtonPad({ active, onClick, label, color = 'var(--hot)', width = 28, height = 18, fontSize = 8.5, sub, tip = null }) {
  return (
    <button
      onClick={onClick}
      title={tip || undefined}
      className="button-pad ui-no-select mono"
      style={{
        width, height,
        background: active
          ? `linear-gradient(180deg, ${color}, ${shade(color, -25)})`
          : 'linear-gradient(180deg,#2a2a2e,#1c1c1f)',
        color: active ? '#0d0d0e' : 'var(--ink-2)',
        border: '1px solid ' + (active ? shade(color, -40) : '#0a0a0c'),
        borderTop: active ? `1px solid ${shade(color, 25)}` : '1px solid #44444a',
        borderRadius: 2,
        fontSize, fontWeight: 700, letterSpacing: 0.5,
        boxShadow: active ? `0 0 8px ${color}88, inset 0 1px 0 ${shade(color, 30)}` : 'inset 0 1px 0 #444',
        padding: 0,
        cursor: 'pointer',
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1,
      }}
    >
      {label}
      {sub && <div style={{ fontSize: 6, fontWeight: 600, opacity: 0.8 }}>{sub}</div>}
    </button>
  );
}

function shade(color, percent) {
  const map = {
    'var(--hot)':    { dark: '#a32a1c', light: '#ff7868' },
    'var(--accent)': { dark: '#a37500', light: '#ffe082' },
    'var(--green)':  { dark: '#1b8b46', light: '#86f0a8' },
    'var(--amber)':  { dark: '#a36d1a', light: '#ffd28a' },
    'var(--cool)':   { dark: '#2c5d9e', light: '#9cc4ff' },
    'var(--aux)':    { dark: '#6c4eb0', light: '#d4bbff' },
  };
  if (map[color]) return percent < 0 ? map[color].dark : map[color].light;
  return color;
}

function Led({ on, color = 'var(--green)', size = 8 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: on ? color : '#222',
      boxShadow: on ? `0 0 6px ${color}` : 'inset 0 0 2px #000',
      border: '1px solid #0a0a0c',
    }}/>
  );
}

window.Knob = Knob;
window.Fader = Fader;
window.LedMeter = LedMeter;
window.MiniMeter = MiniMeter;
window.useMeterCells = useMeterCells;
window.ButtonPad = ButtonPad;
window.Led = Led;
