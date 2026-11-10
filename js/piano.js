(function (global) {
  // MiniLab 3 = 25 keys. Default span: C3 (48) … C5 (72)
  // Key widths are locked to fixed pixels and never flex/stretch with the viewport.
  const START_MIDI = 48;
  const KEY_COUNT = 25;
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const WHITE_W = 32;
  const WHITE_GAP = 1;
  const BLACK_W = 20;
  const BLACK_H = 76;
  const KEYBOARD_H = 126;
  const PAD_X = 8;
  const PAD_Y = 6;

  let keyboard = null;
  const keyEls = new Map();
  let octaveOffset = 0;
  const held = new Set();
  let highlightPcs = new Set();
  let melodyMidi = null;
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

  function whiteMidis() {
    const whites = [];
    for (let i = 0; i < KEY_COUNT; i++) {
      const midi = START_MIDI + i;
      if (!isBlack(midi)) whites.push(midi);
    }
    return whites;
  }

  function keyboardWidth() {
    const n = whiteMidis().length;
    return PAD_X * 2 + n * WHITE_W + Math.max(0, n - 1) * WHITE_GAP;
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

  function applyFixedFrame() {
    if (!keyboard) return;
    const w = keyboardWidth();
    keyboard.style.width = w + "px";
    keyboard.style.minWidth = w + "px";
    keyboard.style.maxWidth = w + "px";
    keyboard.style.height = KEYBOARD_H + "px";
    keyboard.style.flex = "0 0 " + w + "px";
    keyboard.style.flexGrow = "0";
    keyboard.style.flexShrink = "0";
  }

  function buildKeyboard() {
    if (!keyboard) return;
    keyboard.innerHTML = "";
    keyEls.clear();
    applyFixedFrame();

    const whites = whiteMidis();
    whites.forEach((midi, idx) => {
      const el = document.createElement("div");
      el.className = "key white";
      el.dataset.midi = String(midi);
      el.style.flex = "0 0 " + WHITE_W + "px";
      el.style.width = WHITE_W + "px";
      el.style.minWidth = WHITE_W + "px";
      el.style.maxWidth = WHITE_W + "px";
      el.style.marginRight = (idx === whites.length - 1 ? 0 : WHITE_GAP) + "px";
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
      el.style.width = BLACK_W + "px";
      el.style.minWidth = BLACK_W + "px";
      el.style.maxWidth = BLACK_W + "px";
      el.style.height = BLACK_H + "px";
      // Sit on the boundary between adjacent white keys, independent of container width.
      const left = PAD_X + (leftWhiteIndex + 1) * (WHITE_W + WHITE_GAP) - WHITE_GAP / 2 - BLACK_W / 2;
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

  function melodyBaseMidi() {
    if (melodyMidi == null) return null;
    const baseExact = melodyMidi - octaveOffset * 12;
    if (baseExact >= START_MIDI && baseExact < START_MIDI + KEY_COUNT) return baseExact;
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
    const mel = melodyBaseMidi();
    for (const [midi, el] of keyEls) {
      el.classList.toggle("in-scale", highlightPcs.has(midi % 12));
      el.classList.toggle("melody", mel != null && midi === mel);
    }
  }

  function setHighlightPcs(pcs) {
    highlightPcs = new Set((pcs || []).map((n) => ((n % 12) + 12) % 12));
    applyHighlight();
  }

  function setMelodyMidi(midi) {
    melodyMidi = midi == null || !Number.isFinite(midi) ? null : midi;
    applyHighlight();
  }

  function setHighlights(opts) {
    opts = opts || {};
    if (opts.chordPcs) setHighlightPcs(opts.chordPcs);
    else if (opts.chordPcs === null || opts.clearChords) highlightPcs = new Set();
    if ("melodyMidi" in opts) setMelodyMidi(opts.melodyMidi);
    applyHighlight();
  }

  function clearHighlight() {
    highlightPcs = new Set();
    melodyMidi = null;
    applyHighlight();
  }

  function mountKeyboard(el) {
    keyboard = el || document.getElementById("keyboard");
    if (keyboard) buildKeyboard();
  }

  function mountControls(root) {
    bindControlGroup(root || document);
  }

  function mount(opts) {
    opts = opts || {};
    if (opts.keyboard) mountKeyboard(opts.keyboard);
    else mountKeyboard(document.getElementById("keyboard"));
    if (opts.root) mountControls(opts.root);
    else mountControls(document);
  }

  global.PianoUI = {
    mount,
    mountKeyboard,
    mountControls,
    rebuild: buildKeyboard,
    setHighlightPcs,
    setMelodyMidi,
    setHighlights,
    clearHighlight,
    subscribeNotes,
    onNoteEvent: subscribeNotes,
    getStartMidi: () => START_MIDI,
    getKeyCount: () => KEY_COUNT,
    getKeyboardEl: () => keyboard,
    keyMetrics: () => ({ WHITE_W, WHITE_GAP, BLACK_W, KEYBOARD_H, width: keyboardWidth() })
  };

  if (document.getElementById("keyboard")) {
    mount({ keyboard: document.getElementById("keyboard"), root: document });
  }
})(window);
