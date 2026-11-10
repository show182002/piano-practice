(function (global) {
  // MiniLab 3 = 25 keys. Default span: C3 (48) … C5 (72)
  // Key widths are locked to fixed pixels and never flex/stretch with the viewport.
  // A single proportional scale (70%–160%) grows or shrinks the whole keyboard together.
  const START_MIDI = 48;
  const KEY_COUNT = 25;
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const BASE = {
    WHITE_W: 32,
    WHITE_GAP: 1,
    BLACK_W: 20,
    BLACK_H: 76,
    KEYBOARD_H: 126,
    PAD_X: 8,
    PAD_Y: 6,
    PAD_BOTTOM: 8,
    LABEL: 0.62
  };
  const SCALE_MIN = 0.7;
  const SCALE_MAX = 1.6;
  const SCALE_DEFAULT = 1;
  const SCALE_STORAGE = "piano-practice-key-scale";

  let keyboard = null;
  const keyEls = new Map();
  let octaveOffset = 0;
  const held = new Set();
  let highlightPcs = new Set();
  let chordMidis = new Set();
  let melodyMidi = null;
  let showMelodyHighlight = true;
  let showChordHighlight = true;
  let keyScale = SCALE_DEFAULT;
  let scaleUserSet = false;
  const noteListeners = new Set();
  const controlGroups = [];

  function isBlack(midi) {
    const n = midi % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  }

  function labelFor(midi) {
    const name = NOTE_NAMES[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return name + oct;
  }

  function clampScale(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return SCALE_DEFAULT;
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, n));
  }

  function metrics() {
    const s = keyScale;
    return {
      WHITE_W: Math.max(1, Math.round(BASE.WHITE_W * s)),
      WHITE_GAP: Math.max(0, Math.round(BASE.WHITE_GAP * s)),
      BLACK_W: Math.max(1, Math.round(BASE.BLACK_W * s)),
      BLACK_H: Math.max(1, Math.round(BASE.BLACK_H * s)),
      KEYBOARD_H: Math.max(1, Math.round(BASE.KEYBOARD_H * s)),
      PAD_X: Math.max(1, Math.round(BASE.PAD_X * s)),
      PAD_Y: Math.max(1, Math.round(BASE.PAD_Y * s)),
      PAD_BOTTOM: Math.max(1, Math.round(BASE.PAD_BOTTOM * s)),
      LABEL: +(BASE.LABEL * s).toFixed(3)
    };
  }

  function whiteMidis() {
    const whites = [];
    for (let i = 0; i < KEY_COUNT; i++) {
      const midi = START_MIDI + i;
      if (!isBlack(midi)) whites.push(midi);
    }
    return whites;
  }

  function keyboardWidthFor(m) {
    const n = whiteMidis().length;
    return m.PAD_X * 2 + n * m.WHITE_W + Math.max(0, n - 1) * m.WHITE_GAP;
  }

  function keyboardWidth() {
    return keyboardWidthFor(metrics());
  }

  function unscaledWidth() {
    return keyboardWidthFor({
      WHITE_W: BASE.WHITE_W,
      WHITE_GAP: BASE.WHITE_GAP,
      PAD_X: BASE.PAD_X
    });
  }

  function emitNote(midi, velocity, down) {
    const ev = {
      midi,
      velocity: velocity == null ? 0 : velocity,
      down: !!down,
      pc: ((midi % 12) + 12) % 12
    };
    for (const fn of noteListeners) {
      try { fn(ev); } catch (_) { /* listener error */ }
    }
  }

  function subscribeNotes(fn) {
    if (typeof fn !== "function") return function () {};
    noteListeners.add(fn);
    return function () { noteListeners.delete(fn); };
  }

  function syncWrapAlignment() {
    if (!keyboard || !keyboard.parentElement) return;
    const wrap = keyboard.parentElement;
    const avail = wrap.clientWidth;
    wrap.style.justifyContent = keyboardWidth() > avail - 2 ? "flex-start" : "center";
  }

  function applyFixedFrame() {
    if (!keyboard) return;
    const m = metrics();
    const w = keyboardWidthFor(m);
    keyboard.style.width = w + "px";
    keyboard.style.minWidth = w + "px";
    keyboard.style.maxWidth = w + "px";
    keyboard.style.height = m.KEYBOARD_H + "px";
    keyboard.style.padding = m.PAD_Y + "px " + m.PAD_X + "px " + m.PAD_BOTTOM + "px";
    keyboard.style.flex = "0 0 " + w + "px";
    keyboard.style.flexGrow = "0";
    keyboard.style.flexShrink = "0";
    keyboard.style.setProperty("--key-label-size", m.LABEL + "rem");
    syncWrapAlignment();
  }

  function buildKeyboard() {
    if (!keyboard) return;
    keyboard.innerHTML = "";
    keyEls.clear();
    const m = metrics();
    applyFixedFrame();

    const whites = whiteMidis();
    whites.forEach((midi, idx) => {
      const el = document.createElement("div");
      el.className = "key white";
      el.dataset.midi = String(midi);
      el.style.flex = "0 0 " + m.WHITE_W + "px";
      el.style.width = m.WHITE_W + "px";
      el.style.minWidth = m.WHITE_W + "px";
      el.style.maxWidth = m.WHITE_W + "px";
      el.style.marginRight = (idx === whites.length - 1 ? 0 : m.WHITE_GAP) + "px";
      el.innerHTML = `<span class="label">${labelFor(midi)}</span>`;
      bindPointer(el, midi);
      keyboard.appendChild(el);
      keyEls.set(midi, el);
    });

    for (let i = 0; i < KEY_COUNT; i++) {
      const midi = START_MIDI + i;
      if (!isBlack(midi)) continue;
      let leftWhiteIndex = -1;
      for (let wIdx = 0; wIdx < whites.length; wIdx++) {
        if (whites[wIdx] < midi) leftWhiteIndex = wIdx;
        else break;
      }
      if (leftWhiteIndex < 0) continue;
      const el = document.createElement("div");
      el.className = "key black";
      el.dataset.midi = String(midi);
      el.style.width = m.BLACK_W + "px";
      el.style.minWidth = m.BLACK_W + "px";
      el.style.maxWidth = m.BLACK_W + "px";
      el.style.height = m.BLACK_H + "px";
      el.style.top = m.PAD_Y + "px";
      const left = m.PAD_X + (leftWhiteIndex + 1) * (m.WHITE_W + m.WHITE_GAP) - m.WHITE_GAP / 2 - m.BLACK_W / 2;
      el.style.left = left + "px";
      el.innerHTML = `<span class="label">${labelFor(midi)}</span>`;
      bindPointer(el, midi);
      keyboard.appendChild(el);
      keyEls.set(midi, el);
    }
    applyHighlight();
  }

  function bindPointer(el, baseMidi) {
    const down = (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      press(baseMidi, 100);
    };
    const up = (e) => {
      e.preventDefault();
      release(baseMidi);
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", (e) => {
      if (e.buttons === 0) release(baseMidi);
    });
  }

  function soundingMidi(baseMidi) {
    return baseMidi + octaveOffset * 12;
  }

  function setActive(baseMidi, on) {
    const el = keyEls.get(baseMidi);
    if (el) el.classList.toggle("active", on);
  }

  function press(baseMidi, velocity) {
    const midi = soundingMidi(baseMidi);
    if (held.has(midi)) return;
    held.add(midi);
    setActive(baseMidi, true);
    PianoAudio.noteOn(midi, velocity);
    emitNote(midi, velocity, true);
  }

  function release(baseMidi) {
    const midi = soundingMidi(baseMidi);
    if (!held.has(midi)) return;
    held.delete(midi);
    setActive(baseMidi, false);
    PianoAudio.noteOff(midi, false);
    emitNote(midi, 0, false);
  }

  function pressAbsolute(midi, velocity) {
    const base = midi - octaveOffset * 12;
    held.add(midi);
    if (base >= START_MIDI && base < START_MIDI + KEY_COUNT) setActive(base, true);
    PianoAudio.noteOn(midi, velocity);
    emitNote(midi, velocity, true);
  }

  function releaseAbsolute(midi) {
    held.delete(midi);
    const base = midi - octaveOffset * 12;
    if (base >= START_MIDI && base < START_MIDI + KEY_COUNT) setActive(base, false);
    PianoAudio.noteOff(midi, false);
    emitNote(midi, 0, false);
  }

  function updateMidiStatus() {
    const s = PianoMidi.statusText();
    document.querySelectorAll(".midi-status").forEach((el) => {
      el.textContent = s.text;
      el.className = "midi-status status" + (s.cls ? " " + s.cls : "");
    });
  }

  function bindControlGroup(root) {
    const scope = root && root.querySelector ? root : document;
    const btnAudio = scope.querySelector(".btn-audio") || scope.querySelector("#btn-audio");
    const btnMidi = scope.querySelector(".btn-midi") || scope.querySelector("#btn-midi");
    const octaveSel = scope.querySelector(".octave-offset") || scope.querySelector("#octave-offset");
    const volume = scope.querySelector(".volume") || scope.querySelector("#volume");
    if (btnAudio && !btnAudio.dataset.bound) {
      btnAudio.dataset.bound = "1";
      btnAudio.addEventListener("click", async () => {
        PianoAudio.ensure();
        const v = volume || document.querySelector(".volume, #volume");
        if (v) PianoAudio.setVolume(Number(v.value));
        document.querySelectorAll(".btn-audio").forEach((b) => { b.textContent = "已開聲"; });
      });
    }
    if (btnMidi && !btnMidi.dataset.bound) {
      btnMidi.dataset.bound = "1";
      btnMidi.addEventListener("click", async () => {
        try {
          PianoAudio.ensure();
          await PianoMidi.connect();
          updateMidiStatus();
          setInterval(updateMidiStatus, 1500);
        } catch (err) {
          document.querySelectorAll(".midi-status").forEach((el) => {
            el.textContent = "MIDI：" + (err && err.message ? err.message : String(err));
            el.className = "midi-status status err";
          });
        }
      });
    }
    if (octaveSel && !octaveSel.dataset.bound) {
      octaveSel.dataset.bound = "1";
      octaveSel.addEventListener("change", () => {
        PianoAudio.allOff();
        held.clear();
        for (const el of keyEls.values()) el.classList.remove("active");
        octaveOffset = Number(octaveSel.value) || 0;
        document.querySelectorAll(".octave-offset, #octave-offset").forEach((s) => {
          if (s !== octaveSel) s.value = String(octaveOffset);
        });
        applyHighlight();
      });
    }
    if (volume && !volume.dataset.bound) {
      volume.dataset.bound = "1";
      volume.addEventListener("input", () => {
        PianoAudio.setVolume(Number(volume.value));
        document.querySelectorAll(".volume, #volume").forEach((s) => {
          if (s !== volume) s.value = volume.value;
        });
      });
    }
    controlGroups.push(scope);
  }

  PianoMidi.setHandler((midi, velocity, down) => {
    if (down) pressAbsolute(midi, velocity);
    else releaseAbsolute(midi);
  });

  const PC_MAP = {
    KeyA: 48, KeyW: 49, KeyS: 50, KeyE: 51, KeyD: 52,
    KeyF: 53, KeyT: 54, KeyG: 55, KeyY: 56, KeyH: 57, KeyU: 58, KeyJ: 59, KeyK: 60
  };
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;
    const m = PC_MAP[e.code];
    if (m == null) return;
    press(m, 100);
  });
  window.addEventListener("keyup", (e) => {
    const m = PC_MAP[e.code];
    if (m == null) return;
    release(m);
  });

  /* Exact MIDI on the visible keyboard (respect octave offset). No pitch-class spread. */
  function visibleBase(midi) {
    if (midi == null || !Number.isFinite(midi)) return null;
    const baseExact = midi - octaveOffset * 12;
    if (baseExact >= START_MIDI && baseExact < START_MIDI + KEY_COUNT) return baseExact;
    return null;
  }

  /* Melody: prefer the exact key; if that note sits off the 25-key board, light the nearest single key of that pitch. */
  function melodyBaseMidi() {
    if (melodyMidi == null) return null;
    const exact = visibleBase(melodyMidi);
    if (exact != null) return exact;
    const baseExact = melodyMidi - octaveOffset * 12;
    const pc = ((melodyMidi % 12) + 12) % 12;
    let best = null;
    for (let i = 0; i < KEY_COUNT; i++) {
      const midi = START_MIDI + i;
      if (midi % 12 !== pc) continue;
      if (best == null || Math.abs(midi - baseExact) < Math.abs(best - baseExact)) best = midi;
    }
    return best;
  }

  function applyHighlight() {
    const mel = showMelodyHighlight ? melodyBaseMidi() : null;
    const chordBases = new Set();
    if (showChordHighlight) {
      for (const midi of chordMidis) {
        const base = visibleBase(midi);
        if (base != null) chordBases.add(base);
      }
    }
    for (const [midi, el] of keyEls) {
      el.classList.toggle("in-scale", highlightPcs.has(midi % 12));
      el.classList.toggle("chord", chordBases.has(midi));
      el.classList.toggle("melody", mel != null && midi === mel);
    }
  }

  function setHighlightPcs(pcs) {
    highlightPcs = new Set((pcs || []).map((n) => ((n % 12) + 12) % 12));
    chordMidis = new Set();
    applyHighlight();
  }

  function setMelodyMidi(midi) {
    melodyMidi = midi == null || !Number.isFinite(midi) ? null : midi;
    applyHighlight();
  }

  function setChordMidis(midis) {
    chordMidis = new Set((midis || []).filter((n) => Number.isFinite(n)));
    highlightPcs = new Set();
    applyHighlight();
  }

  function setHighlights(opts) {
    opts = opts || {};
    if ("chordMidis" in opts) {
      setChordMidis(opts.chordMidis);
    } else if (opts.chordPcs) {
      setHighlightPcs(opts.chordPcs);
    } else if (opts.chordPcs === null || opts.clearChords) {
      highlightPcs = new Set();
      chordMidis = new Set();
    }
    if ("melodyMidi" in opts) setMelodyMidi(opts.melodyMidi);
    applyHighlight();
  }

  function clearHighlight() {
    highlightPcs = new Set();
    chordMidis = new Set();
    melodyMidi = null;
    applyHighlight();
  }

  function setHighlightVisibility(opts) {
    opts = opts || {};
    if ("melody" in opts) showMelodyHighlight = !!opts.melody;
    if ("chord" in opts) showChordHighlight = !!opts.chord;
    applyHighlight();
  }

  function persistScale() {
    try { localStorage.setItem(SCALE_STORAGE, String(keyScale)); }
    catch (_) { /* private mode */ }
  }

  function loadSavedScale() {
    try {
      const raw = localStorage.getItem(SCALE_STORAGE);
      if (raw == null || raw === "") return null;
      return clampScale(Number(raw));
    } catch (_) {
      return null;
    }
  }

  function fitScale() {
    const wrap = keyboard && keyboard.parentElement;
    const avail = wrap && wrap.clientWidth ? wrap.clientWidth - 8 : window.innerWidth - 24;
    const base = unscaledWidth();
    if (avail >= base) return SCALE_DEFAULT;
    return clampScale(avail / base);
  }

  function setScale(value, flags) {
    flags = flags || {};
    const next = clampScale(value);
    const changed = Math.abs(next - keyScale) > 0.0001;
    keyScale = next;
    if (flags.user) {
      scaleUserSet = true;
      persistScale();
    }
    if (changed || flags.force) buildKeyboard();
    else applyFixedFrame();
    return keyScale;
  }

  function initScale() {
    const saved = loadSavedScale();
    if (saved != null) {
      scaleUserSet = true;
      keyScale = saved;
    } else {
      scaleUserSet = false;
      const narrow = window.matchMedia && (
        window.matchMedia("(max-width: 950px)").matches ||
        window.matchMedia("(orientation: landscape) and (max-height: 540px)").matches
      );
      keyScale = narrow ? fitScale() : SCALE_DEFAULT;
    }
  }

  function onViewportChange() {
    if (!scaleUserSet) {
      const narrow = window.matchMedia && (
        window.matchMedia("(max-width: 950px)").matches ||
        window.matchMedia("(orientation: landscape) and (max-height: 540px)").matches
      );
      const next = narrow ? fitScale() : SCALE_DEFAULT;
      if (Math.abs(next - keyScale) > 0.01) {
        keyScale = next;
        if (keyboard) buildKeyboard();
        syncScaleSlider();
        return;
      }
    }
    syncWrapAlignment();
  }

  function syncScaleSlider() {
    const pct = Math.round(keyScale * 100);
    document.querySelectorAll("#fa-key-scale").forEach((el) => {
      if (!el.matches(":active")) el.value = String(pct);
    });
    document.querySelectorAll("#fa-key-scale-val").forEach((el) => {
      el.textContent = pct + "%";
    });
  }

  function bindScaleControl(root) {
    const scope = root && root.querySelector ? root : document;
    const slider = scope.querySelector("#fa-key-scale");
    if (!slider || slider.dataset.bound) return;
    slider.dataset.bound = "1";
    slider.min = String(Math.round(SCALE_MIN * 100));
    slider.max = String(Math.round(SCALE_MAX * 100));
    slider.value = String(Math.round(keyScale * 100));
    slider.addEventListener("input", () => {
      setScale(Number(slider.value) / 100, { user: true });
      syncScaleSlider();
    });
    syncScaleSlider();
  }

  function mountKeyboard(el) {
    keyboard = el || document.getElementById("keyboard");
    if (keyboard) buildKeyboard();
    syncWrapAlignment();
  }

  function mountControls(root) {
    bindControlGroup(root || document);
    bindScaleControl(root || document);
  }

  function mount(opts) {
    opts = opts || {};
    initScale();
    if (opts.keyboard) mountKeyboard(opts.keyboard);
    else mountKeyboard(document.getElementById("keyboard"));
    if (opts.root) mountControls(opts.root);
    else mountControls(document);
    syncScaleSlider();
  }

  window.addEventListener("resize", onViewportChange);
  if (window.matchMedia) {
    try {
      window.matchMedia("(orientation: landscape)").addEventListener("change", onViewportChange);
    } catch (_) { /* older Safari */ }
  }

  global.PianoUI = {
    mount,
    mountKeyboard,
    mountControls,
    rebuild: buildKeyboard,
    setHighlightPcs,
    setMelodyMidi,
    setChordMidis,
    setHighlights,
    clearHighlight,
    setHighlightVisibility,
    setScale,
    getScale: () => keyScale,
    fitScale,
    syncScaleSlider,
    subscribeNotes,
    onNoteEvent: subscribeNotes,
    getStartMidi: () => START_MIDI,
    getKeyCount: () => KEY_COUNT,
    getKeyboardEl: () => keyboard,
    keyMetrics: () => {
      const m = metrics();
      return {
        WHITE_W: m.WHITE_W,
        WHITE_GAP: m.WHITE_GAP,
        BLACK_W: m.BLACK_W,
        KEYBOARD_H: m.KEYBOARD_H,
        scale: keyScale,
        width: keyboardWidthFor(m)
      };
    }
  };

  if (document.getElementById("keyboard")) {
    mount({ keyboard: document.getElementById("keyboard"), root: document });
  }
})(window);
