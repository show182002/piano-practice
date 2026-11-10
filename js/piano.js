(function () {
  // MiniLab 3 = 25 keys. Default span: C3 (48) … C5 (72)
  const START_MIDI = 48;
  const KEY_COUNT = 25;
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

  const keyboard = document.getElementById("keyboard");
  const btnAudio = document.getElementById("btn-audio");
  const btnMidi = document.getElementById("btn-midi");
  const midiStatus = document.getElementById("midi-status");
  const octaveSel = document.getElementById("octave-offset");
  const volume = document.getElementById("volume");

  const keyEls = new Map();
  let octaveOffset = 0;
  const held = new Set(); // sounding midi numbers (after offset)
  let highlightPcs = new Set(); // pitch classes 0-11 from Circle of Fifths / theory

  function isBlack(midi) {
    const n = midi % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  }

  function labelFor(midi) {
    const name = NOTE_NAMES[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return name + oct;
  }

  function buildKeyboard() {
    keyboard.innerHTML = "";
    keyEls.clear();

    const whites = [];
    for (let i = 0; i < KEY_COUNT; i++) {
      const midi = START_MIDI + i;
      if (!isBlack(midi)) whites.push(midi);
    }

    // White keys first (flex row)
    whites.forEach((midi) => {
      const el = document.createElement("div");
      el.className = "key white" + (highlightPcs.has(midi % 12) ? " in-scale" : "");
      el.dataset.midi = String(midi);
      el.innerHTML = `<span class="label">${labelFor(midi)}</span>`;
      bindPointer(el, midi);
      keyboard.appendChild(el);
      keyEls.set(midi, el);
    });

    // Black keys absolute, positioned over white gaps
    const whiteWidth = keyboard.clientWidth / Math.max(1, whites.length);
    // Recompute after layout
    requestAnimationFrame(() => {
      const rect = keyboard.getBoundingClientRect();
      const padLeft = 10;
      const usable = rect.width - 20;
      const w = usable / whites.length;

      for (let i = 0; i < KEY_COUNT; i++) {
        const midi = START_MIDI + i;
        if (!isBlack(midi)) continue;
        // Place above the gap between previous white and next white
        // Find index of the white key immediately to the left
        let leftWhiteIndex = -1;
        for (let wIdx = 0; wIdx < whites.length; wIdx++) {
          if (whites[wIdx] < midi) leftWhiteIndex = wIdx;
          else break;
        }
        if (leftWhiteIndex < 0) continue;

        const el = document.createElement("div");
        el.className = "key black" + (highlightPcs.has(midi % 12) ? " in-scale" : "");
        el.dataset.midi = String(midi);
        el.innerHTML = `<span class="label">${labelFor(midi)}</span>`;
        const left = padLeft + (leftWhiteIndex + 1) * w - 14;
        el.style.left = `${left}px`;
        bindPointer(el, midi);
        keyboard.appendChild(el);
        keyEls.set(midi, el);
      }
    });
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
  }

  function release(baseMidi) {
    const midi = soundingMidi(baseMidi);
    if (!held.has(midi)) return;
    held.delete(midi);
    setActive(baseMidi, false);
    PianoAudio.noteOff(midi, false);
  }

  function pressAbsolute(midi, velocity) {
    // MIDI device sends absolute note numbers; map highlight back onto visible keys
    const base = midi - octaveOffset * 12;
    held.add(midi);
    if (base >= START_MIDI && base < START_MIDI + KEY_COUNT) setActive(base, true);
    PianoAudio.noteOn(midi, velocity);
  }

  function releaseAbsolute(midi) {
    held.delete(midi);
    const base = midi - octaveOffset * 12;
    if (base >= START_MIDI && base < START_MIDI + KEY_COUNT) setActive(base, false);
    PianoAudio.noteOff(midi, false);
  }

  function updateMidiStatus() {
    const s = PianoMidi.statusText();
    midiStatus.textContent = s.text;
    midiStatus.className = "status" + (s.cls ? " " + s.cls : "");
  }

  btnAudio.addEventListener("click", async () => {
    PianoAudio.ensure();
    PianoAudio.setVolume(Number(volume.value));
    btnAudio.textContent = "已開聲";
  });

  btnMidi.addEventListener("click", async () => {
    try {
      PianoAudio.ensure();
      await PianoMidi.connect();
      updateMidiStatus();
      // refresh status periodically when devices change
      setInterval(updateMidiStatus, 1500);
    } catch (err) {
      midiStatus.textContent = "MIDI：" + (err && err.message ? err.message : String(err));
      midiStatus.className = "status err";
    }
  });

  PianoMidi.setHandler((midi, velocity, down) => {
    if (down) pressAbsolute(midi, velocity);
    else releaseAbsolute(midi);
  });

  octaveSel.addEventListener("change", () => {
    PianoAudio.allOff();
    held.clear();
    for (const el of keyEls.values()) el.classList.remove("active");
    octaveOffset = Number(octaveSel.value) || 0;
  });

  volume.addEventListener("input", () => {
    PianoAudio.setVolume(Number(volume.value));
  });

  window.addEventListener("resize", () => {
    // rebuild black key positions
    buildKeyboard();
  });

  // Computer keyboard quick test: A S D F … mapped roughly (optional, v1 light)
  const PC_MAP = {
    KeyA: 48, KeyW: 49, KeyS: 50, KeyE: 51, KeyD: 52,
    KeyF: 53, KeyT: 54, KeyG: 55, KeyY: 56, KeyH: 57, KeyU: 58, KeyJ: 59, KeyK: 60
  };
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const m = PC_MAP[e.code];
    if (m == null) return;
    press(m, 100);
  });
  window.addEventListener("keyup", (e) => {
    const m = PC_MAP[e.code];
    if (m == null) return;
    release(m);
  });

  function applyHighlight() {
    for (const [midi, el] of keyEls) {
      el.classList.toggle("in-scale", highlightPcs.has(midi % 12));
    }
  }

  function setHighlightPcs(pcs) {
    highlightPcs = new Set((pcs || []).map((n) => ((n % 12) + 12) % 12));
    applyHighlight();
  }

  function clearHighlight() {
    highlightPcs = new Set();
    applyHighlight();
  }

  window.PianoUI = {
    setHighlightPcs,
    clearHighlight,
    getStartMidi: () => START_MIDI,
    getKeyCount: () => KEY_COUNT
  };

  buildKeyboard();
})();
