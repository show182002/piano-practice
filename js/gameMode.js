/* Falling-notes game mode (Synthesia-style). Uses existing Level 3 song data,
   Salamander guide voices, MiniLab keyboard, and MIDI input. Practice mode
   is unchanged. Official lyric text is never bundled. */
(function (global) {
  const MIN_BPM = 40;
  const MAX_BPM = 120;
  const TRAVEL_BEATS = 4;
  const PREROLL_BEATS = TRAVEL_BEATS;
  const HIT_EARLY = 0.32;
  const HIT_LATE = 0.40;
  const PERFECT_BEATS = 0.12;
  const MIN_BAR_PX = 18;
  const LIT_EARLY = TRAVEL_BEATS;
  const RAIL_MIN_PX = 252;
  const VOICE_OPTS = { minMidi: 48, maxMidi: 67 };
  const FALLBACK_CHORDS = ["G", "D/F#", "Em", "Bm/D", "C", "G/B", "Am7", "C/D", "D", "G/F", "C/E", "Cm6/Eb", "G/D", "A/C#"];
  const STORAGE = {
    showMelody: "piano-practice-game-show-melody",
    showChord: "piano-practice-game-show-chord",
    soundMelody: "piano-practice-game-sound-melody",
    soundChord: "piano-practice-game-sound-chord",
    wait: "piano-practice-game-wait",
    bpm: "piano-practice-game-bpm"
  };

  const COLOR = {
    melody: { fill: "#3ee87a", stroke: "#b7ffd0", text: "#06210f", glow: "rgba(62, 232, 122, 0.45)" },
    melodyWrap: { fill: "#1b8a46", stroke: "#3ee87a", text: "#e8ffe9", glow: "rgba(27, 138, 70, 0.45)" },
    melodyHit: { fill: "#d4ffea", stroke: "#ffffff", text: "#06210f", glow: "rgba(200, 255, 225, 1)" },
    melodyLit: { fill: "#f3fff6", stroke: "#ffffff", text: "#06210f", glow: "rgba(220, 255, 230, 1)" },
    chord: { fill: "#3d9bff", stroke: "#b3d9ff", text: "#041018", glow: "rgba(61, 155, 255, 0.4)" },
    chordWrap: { fill: "#0d4fa8", stroke: "#3d9bff", text: "#e8f3ff", glow: "rgba(13, 79, 168, 0.45)" },
    chordHit: { fill: "#d0ebff", stroke: "#ffffff", text: "#041018", glow: "rgba(200, 230, 255, 1)" },
    chordLit: { fill: "#f0f7ff", stroke: "#ffffff", text: "#041018", glow: "rgba(220, 240, 255, 1)" },
    miss: { fill: "#5a6170", stroke: "#8a91a0", text: "#d0d4dc" }
  };

  let song = null;
  let level = null;
  let bpm = 68;
  let showMelody = true;
  let showChord = true;
  let soundMelody = true;
  let soundChord = true;
  let waitMode = true;
  let state = "stopped";
  let finished = false;
  let active = false;
  let beatIndex = 0;
  let anchorBeat = 0;
  let anchorAudioTime = 0;
  let waiting = false;
  let waitHoldBeat = null;
  let rafId = null;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let feedbackText = "";
  let feedbackUntil = 0;
  let notes = [];
  let held = new Set();
  let unsubNotes = null;
  let unsubRebuild = null;
  let moreOpen = false;
  let lastLayoutKey = "";
  let savedScale = null;
  let gameScaleUserSet = false;
  let canvasCssW = 0;
  let canvasCssH = 0;
  let chordSymbols = [];
  let lastRailCurrent = null;

  function $(id) {
    return document.getElementById(id);
  }

  function clampBpm(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 68;
    return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));
  }

  function secondsPerBeat() {
    return 60 / bpm;
  }

  function loadFlag(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null || raw === "") return fallback;
      if (raw === "1" || raw === "true") return true;
      if (raw === "0" || raw === "false") return false;
      return fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveFlag(key, value) {
    try { localStorage.setItem(key, value ? "1" : "0"); }
    catch (_) { /* private mode */ }
  }

  function loadSavedBpm(fallback) {
    try {
      const raw = localStorage.getItem(STORAGE.bpm);
      if (raw == null || raw === "") return fallback;
      return clampBpm(Number(raw));
    } catch (_) {
      return fallback;
    }
  }

  function saveBpm(value) {
    try { localStorage.setItem(STORAGE.bpm, String(value)); }
    catch (_) { /* private mode */ }
  }

  function loadPrefs(defaultBpm) {
    showMelody = loadFlag(STORAGE.showMelody, true);
    showChord = loadFlag(STORAGE.showChord, true);
    soundMelody = loadFlag(STORAGE.soundMelody, true);
    soundChord = loadFlag(STORAGE.soundChord, true);
    waitMode = loadFlag(STORAGE.wait, true);
    bpm = loadSavedBpm(clampBpm(defaultBpm || 68));
  }

  function totalBeats() {
    if (!level || !level.progression) return 0;
    return level.progression.reduce((s, ev) => s + ev.beats, 0);
  }

  function pickupBeats() {
    if (level && level.pickupBeats != null) return level.pickupBeats;
    return (song && song.pickupBeats) || 0;
  }

  function beatsPerBar() {
    return (song && song.beatsPerBar) || 4;
  }

  function melodySource() {
    if (level && level.melody && level.melody.length) return level.melody;
    return (song && song.melody) || [];
  }

  function buildNotes() {
    const list = [];
    let id = 0;
    melodySource().forEach((n) => {
      if (n.midi == null || !Number.isFinite(n.midi)) return;
      list.push({
        id: ++id,
        track: "melody",
        start: n.start,
        dur: n.dur,
        midi: n.midi,
        name: n.name || "",
        status: "pending",
        guideOn: false
      });
    });
    let t = 0;
    (level.progression || []).forEach((ev) => {
      const start = t;
      const dur = ev.beats;
      t += ev.beats;
      if (!ev.chord) return;
      const voicing = (global.MusicTheory && MusicTheory.chordVoicingFromSymbol)
        ? (MusicTheory.chordVoicingFromSymbol(ev.chord, VOICE_OPTS) || [])
        : [];
      voicing.forEach((v) => {
        list.push({
          id: ++id,
          track: "chord",
          start: start,
          dur: dur,
          midi: v.midi,
          name: v.name || ev.chord,
          chord: ev.chord,
          status: "pending",
          guideOn: false
        });
      });
    });
    list.sort((a, b) => a.start - b.start || a.midi - b.midi);
    notes = list;
  }

  function windowRange() {
    const startMidi = (global.PianoUI && PianoUI.getStartMidi) ? PianoUI.getStartMidi() : 48;
    const count = (global.PianoUI && PianoUI.getKeyCount) ? PianoUI.getKeyCount() : 25;
    const off = (global.PianoUI && PianoUI.getOctaveOffset) ? PianoUI.getOctaveOffset() : 0;
    const start = startMidi + off * 12;
    return { start: start, end: start + count - 1, offset: off, startMidi: startMidi, count: count };
  }

  /* Map an actual pitch onto the current 25-key window, shifting by whole
     octaves. wrap > 0 means the real note is above the window (oct+). */
  function wrapToWindow(actualMidi) {
    const wr = windowRange();
    if (actualMidi >= wr.start && actualMidi <= wr.end) {
      return {
        displaySounding: actualMidi,
        baseMidi: actualMidi - wr.offset * 12,
        wrap: 0
      };
    }
    let mapped = actualMidi;
    let wrap = 0;
    while (mapped > wr.end) { mapped -= 12; wrap += 1; }
    while (mapped < wr.start) { mapped += 12; wrap -= 1; }
    return {
      displaySounding: mapped,
      baseMidi: mapped - wr.offset * 12,
      wrap: wrap
    };
  }

  function wrapLabel(wrap) {
    if (wrap > 0) return "oct+";
    if (wrap < 0) return "oct−";
    return "";
  }

  /* Letter only (C, F♯, E♭) — no octave number — drawn on the falling bar. */
  function pitchLetter(n) {
    let raw = n && n.name ? String(n.name) : "";
    if (!raw && n && n.midi != null && global.MusicTheory && MusicTheory.midiToName) {
      raw = MusicTheory.midiToName(n.midi);
    }
    raw = raw.replace(/[0-9]/g, "");
    if (global.MusicTheory && MusicTheory.prettyNote) raw = MusicTheory.prettyNote(raw);
    return raw;
  }

  function noteVisible(n) {
    if (n.track === "melody") return showMelody;
    if (n.track === "chord") return showChord;
    return false;
  }

  function soundOn(n) {
    if (n.track === "melody") return soundMelody;
    if (n.track === "chord") return soundChord;
    return false;
  }

  function startBeat() {
    return -PREROLL_BEATS;
  }

  function currentBeatFloat() {
    const total = totalBeats();
    if (waiting && waitHoldBeat != null) {
      return Math.max(startBeat(), Math.min(total, waitHoldBeat));
    }
    if (state === "playing") {
      const b = anchorBeat + (PianoAudio.now() - anchorAudioTime) / secondsPerBeat();
      return Math.max(startBeat(), Math.min(total, b));
    }
    if (finished) return total;
    return Math.max(startBeat(), Math.min(total, beatIndex));
  }

  function formatTime(sec) {
    const t = Math.max(0, sec);
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function syncGuideBuses() {
    if (!global.PianoAudio || typeof PianoAudio.setGuideTrackEnabled !== "function") return;
    PianoAudio.setGuideTrackEnabled("melody", !!soundMelody);
    PianoAudio.setGuideTrackEnabled("chord", !!soundChord);
  }

  function cancelGuideAudio(track) {
    if (global.PianoAudio && typeof PianoAudio.cancelGuide === "function") {
      PianoAudio.cancelGuide(track || undefined);
    }
    notes.forEach((n) => {
      if (!track || n.track === track) n.guideOn = false;
    });
  }

  function audioTimeOfBeat(beat) {
    if (waiting) return PianoAudio.now();
    return anchorAudioTime + (beat - anchorBeat) * secondsPerBeat();
  }

  function nextWaitBeat(fromBeat) {
    if (!waitMode) return Infinity;
    let next = Infinity;
    notes.forEach((n) => {
      if (!noteVisible(n) || n.status !== "pending") return;
      if (n.start + 1e-6 >= fromBeat && n.start < next) next = n.start;
    });
    return next;
  }

  function scheduleGuideAudio() {
    if (state !== "playing" || waiting) return;
    if (!soundMelody && !soundChord) return;
    if (!global.PianoAudio || typeof PianoAudio.scheduleGuide !== "function") return;
    const fromBeat = currentBeatFloat();
    const waitCap = nextWaitBeat(fromBeat);
    const capBeat = Math.min(fromBeat + 2.2, waitCap);
    const spb = secondsPerBeat();
    const eps = 1e-4;
    notes.forEach((n) => {
      if (n.guideOn) return;
      if (!soundOn(n)) return;
      const end = n.start + n.dur;
      if (end <= fromBeat + eps) return;
      if (n.start > capBeat + eps) return;
      const start = Math.max(n.start, fromBeat);
      const durSec = (end - start) * spb;
      if (durSec <= 0.02) return;
      const vel = n.track === "melody" ? 104 : 78;
      const gain = n.track === "melody" ? 1 : 0.52;
      PianoAudio.scheduleGuide(n.midi, audioTimeOfBeat(start), durSec, { velocity: vel, gain: gain, track: n.track });
      n.guideOn = true;
    });
  }

  function clearFutureGuides() {
    cancelGuideAudio();
  }

  function setFeedback(text, ms) {
    feedbackText = text || "";
    feedbackUntil = performance.now() + (ms == null ? 900 : ms);
    syncHud();
  }

  function awardHit(n, deltaBeats) {
    const late = Math.abs(deltaBeats);
    const perfect = late <= PERFECT_BEATS || waitMode;
    const pts = perfect ? 100 : 70;
    score += pts;
    combo += 1;
    if (combo > maxCombo) maxCombo = combo;
    n.status = "hit";
    n.hitAt = currentBeatFloat();
    let msg = perfect ? "好勒！" : "得！";
    if (combo >= 3) msg = "Combo " + combo + "  " + msg;
    setFeedback(msg, 900);
  }

  function awardMiss(n) {
    if (n.status !== "pending") return;
    n.status = "miss";
    combo = 0;
    setFeedback("錯過", 700);
  }

  function matchesPress(n, midi) {
    const w = wrapToWindow(n.midi);
    if (midi === w.displaySounding || midi === w.baseMidi || midi === n.midi) return true;
    const heldWrap = wrapToWindow(midi);
    return heldWrap.baseMidi === w.baseMidi || heldWrap.displaySounding === w.displaySounding;
  }

  function uniqueChordSymbols() {
    const seen = new Set();
    const list = [];
    ((level && level.progression) || []).forEach((ev) => {
      const sym = ev && ev.chord ? String(ev.chord).trim() : "";
      if (!sym || seen.has(sym)) return;
      seen.add(sym);
      list.push(sym);
    });
    return list.length ? list : FALLBACK_CHORDS.slice();
  }

  function prettyChordSymbol(sym) {
    if (global.MusicTheory && MusicTheory.prettyChord) return MusicTheory.prettyChord(sym);
    return String(sym || "").replace(/#/g, "♯").replace(/([A-G])b/g, "$1♭");
  }

  function isBlackMidi(midi) {
    const n = ((midi % 12) + 12) % 12;
    return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
  }

  function miniKeyboardMarkup(midis) {
    const lit = new Set(midis || []);
    const start = 48;
    const end = 72;
    const whites = [];
    for (let m = start; m <= end; m++) {
      if (!isBlackMidi(m)) whites.push(m);
    }
    const ww = 7;
    const gap = 1;
    const wh = 22;
    const bw = 4.4;
    const bh = 13;
    const padX = 1.2;
    const padY = 1;
    const width = +(padX * 2 + whites.length * ww + Math.max(0, whites.length - 1) * gap).toFixed(2);
    const height = +(padY * 2 + wh).toFixed(2);
    const parts = [];
    parts.push('<svg class="gm-mini-kbd" viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height + '" aria-hidden="true" focusable="false">');
    whites.forEach((m, i) => {
      const x = +(padX + i * (ww + gap)).toFixed(2);
      const on = lit.has(m);
      parts.push('<rect class="mk-white' + (on ? ' is-on' : '') + '" x="' + x + '" y="' + padY + '" width="' + ww + '" height="' + wh + '" rx="0.8"/>');
    });
    for (let m = start; m <= end; m++) {
      if (!isBlackMidi(m)) continue;
      let leftWi = -1;
      for (let i = 0; i < whites.length; i++) {
        if (whites[i] < m) leftWi = i;
        else break;
      }
      if (leftWi < 0) continue;
      const x = +(padX + (leftWi + 1) * (ww + gap) - gap / 2 - bw / 2).toFixed(2);
      const on = lit.has(m);
      parts.push('<rect class="mk-black' + (on ? ' is-on' : '') + '" x="' + x + '" y="' + padY + '" width="' + bw + '" height="' + bh + '" rx="0.55"/>');
    }
    parts.push("</svg>");
    return parts.join("");
  }

  function voicingMidisFor(symbol) {
    if (!symbol || !global.MusicTheory || !MusicTheory.chordVoicingFromSymbol) return [];
    return (MusicTheory.chordVoicingFromSymbol(symbol, VOICE_OPTS) || [])
      .map((v) => v.midi)
      .filter((m) => Number.isFinite(m));
  }

  function heldMatchesMidi(actualMidi) {
    if (!held.size) return false;
    let ok = false;
    const w = wrapToWindow(actualMidi);
    held.forEach((h) => {
      if (h === actualMidi || h === w.displaySounding || h === w.baseMidi) {
        ok = true;
        return;
      }
      const hw = wrapToWindow(h);
      if (hw.baseMidi === w.baseMidi || hw.displaySounding === w.displaySounding) ok = true;
    });
    return ok;
  }

  function heldMatchesVoicing(midis) {
    if (!midis || !midis.length || !held.size) return false;
    return midis.every((m) => heldMatchesMidi(m));
  }

  function chordAtBeat(beat) {
    if (!level || !level.progression || beat < -1e-6) return "";
    let t = 0;
    for (let i = 0; i < level.progression.length; i++) {
      const ev = level.progression[i];
      const start = t;
      const end = t + ev.beats;
      t = end;
      if (beat >= start - 1e-6 && beat < end - 1e-9) {
        return ev.chord ? String(ev.chord).trim() : "";
      }
    }
    return "";
  }

  function pressedChordSymbol(currentSym) {
    if (!held.size || !chordSymbols.length) return "";
    const matches = [];
    chordSymbols.forEach((sym) => {
      const midis = voicingMidisFor(sym);
      if (heldMatchesVoicing(midis)) matches.push({ sym: sym, n: midis.length });
    });
    if (!matches.length) return "";
    matches.sort((a, b) => {
      if (b.n !== a.n) return b.n - a.n;
      if (currentSym && a.sym === currentSym) return -1;
      if (currentSym && b.sym === currentSym) return 1;
      return 0;
    });
    return matches[0].sym;
  }

  function railItemSelector(sym) {
    const esc = (window.CSS && CSS.escape) ? CSS.escape(sym) : String(sym).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return '.gm-chord-item[data-chord="' + esc + '"]';
  }

  function buildChordRail() {
    const listEl = $("gm-chord-list");
    if (!listEl) return;
    chordSymbols = uniqueChordSymbols();
    listEl.innerHTML = "";
    chordSymbols.forEach((sym) => {
      const li = document.createElement("li");
      li.className = "gm-chord-item";
      li.dataset.chord = sym;
      const midis = voicingMidisFor(sym);
      const nameEl = document.createElement("span");
      nameEl.className = "gm-chord-name";
      nameEl.textContent = prettyChordSymbol(sym);
      const voicingEl = document.createElement("span");
      voicingEl.className = "gm-chord-voicing";
      voicingEl.innerHTML = miniKeyboardMarkup(midis);
      li.appendChild(nameEl);
      li.appendChild(voicingEl);
      const labels = midis.map((m) => {
        if (global.MusicTheory && MusicTheory.midiToName) return MusicTheory.prettyNote(MusicTheory.midiToName(m));
        return String(m);
      });
      if (labels.length) li.setAttribute("title", prettyChordSymbol(sym) + "（" + labels.join(" ") + "）");
      listEl.appendChild(li);
    });
    lastRailCurrent = null;
    syncChordRail();
  }

  function syncChordRail() {
    const listEl = $("gm-chord-list");
    if (!listEl) return;
    const currentSym = chordAtBeat(currentBeatFloat());
    const pressedSym = pressedChordSymbol(currentSym);
    listEl.querySelectorAll(".gm-chord-item").forEach((li) => {
      const isCurrent = !!currentSym && li.dataset.chord === currentSym;
      const isPressed = !!pressedSym && li.dataset.chord === pressedSym;
      li.classList.toggle("is-current", isCurrent);
      li.classList.toggle("is-pressed", isPressed);
      if (isCurrent) li.setAttribute("aria-current", "true");
      else li.removeAttribute("aria-current");
    });
    if (currentSym && currentSym !== lastRailCurrent) {
      const cur = listEl.querySelector(railItemSelector(currentSym));
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    lastRailCurrent = currentSym;
  }

  function litNoteIds(beat) {
    const ids = new Set();
    notes.forEach((n) => {
      if (!noteVisible(n) || n.status === "miss") return;
      const end = n.start + n.dur;
      if (n.status === "hit" && beat <= end + 0.08) ids.add(n.id);
    });
    if (!held.size) return ids;
    held.forEach((midi) => {
      notes.forEach((n) => {
        if (!noteVisible(n) || n.status === "miss") return;
        if (!matchesPress(n, midi)) return;
        const end = n.start + n.dur;
        if (beat < n.start - LIT_EARLY || beat > end + 0.25) return;
        ids.add(n.id);
      });
    });
    return ids;
  }

  function dueNotes(beat) {
    return notes.filter((n) => noteVisible(n) && n.status === "pending" && n.start <= beat + 1e-6);
  }

  function tryHitWithMidi(midi) {
    const beat = currentBeatFloat();
    const early = waitMode ? 0.08 : HIT_EARLY;
    const late = waitMode ? 0.55 : HIT_LATE;
    let best = null;
    let bestAbs = Infinity;
    notes.forEach((n) => {
      if (!noteVisible(n) || n.status !== "pending") return;
      if (!matchesPress(n, midi)) return;
      const delta = beat - n.start;
      if (waitMode && n.start <= beat + 1e-6 && delta >= -early) {
        const abs = Math.abs(Math.min(0, delta));
        if (abs < bestAbs) { best = n; bestAbs = abs; }
        return;
      }
      if (delta >= -early && delta <= late) {
        const abs = Math.abs(delta);
        if (abs < bestAbs) { best = n; bestAbs = abs; }
      }
    });
    if (!best) return false;
    awardHit(best, beat - best.start);
    if (waiting) tryReleaseWait();
    return true;
  }

  function autoHitHeld() {
    if (!held.size) return;
    const beat = currentBeatFloat();
    const early = waitMode ? 0.08 : HIT_EARLY;
    const late = waitMode ? 0.55 : HIT_LATE;
    notes.forEach((n) => {
      if (!noteVisible(n) || n.status !== "pending") return;
      const delta = beat - n.start;
      if (delta < -early || delta > late) return;
      if (waitMode && n.start > beat + 1e-6) return;
      let ok = false;
      held.forEach((m) => { if (matchesPress(n, m)) ok = true; });
      if (ok) awardHit(n, delta);
    });
  }

  function beginWait(freezeAt) {
    if (waiting) return;
    waiting = true;
    waitHoldBeat = freezeAt;
    beatIndex = freezeAt;
    autoHitHeld();
    tryReleaseWait();
  }

  function tryReleaseWait() {
    if (!waiting) return;
    const due = dueNotes(waitHoldBeat);
    if (due.length) return;
    const pos = waitHoldBeat;
    waiting = false;
    waitHoldBeat = null;
    beatIndex = pos;
    anchorBeat = pos;
    anchorAudioTime = PianoAudio.now();
    scheduleGuideAudio();
  }

  function maybeWaitOrMiss(beat) {
    if (state !== "playing") return beat;
    if (waitMode) {
      const dueSoon = notes.filter((n) => noteVisible(n) && n.status === "pending" && n.start <= beat);
      if (dueSoon.length) {
        const freezeAt = Math.min.apply(null, dueSoon.map((n) => n.start));
        if (beat >= freezeAt) {
          beginWait(freezeAt);
          return freezeAt;
        }
      }
      return beat;
    }
    notes.forEach((n) => {
      if (!noteVisible(n) || n.status !== "pending") return;
      if (beat > n.start + HIT_LATE) awardMiss(n);
    });
    return beat;
  }

  function onNoteEvent(ev) {
    if (!active) return;
    if (ev.down) {
      held.add(ev.midi);
      if (state === "playing" || waiting) tryHitWithMidi(ev.midi);
    } else {
      held.delete(ev.midi);
    }
    syncChordRail();
    highlightApproaching(currentBeatFloat());
    drawLanes();
  }

  function resetScore() {
    score = 0;
    combo = 0;
    maxCombo = 0;
    feedbackText = "";
    feedbackUntil = 0;
  }

  function resetNotes() {
    notes.forEach((n) => {
      n.status = "pending";
      n.guideOn = false;
      n.hitAt = null;
    });
  }

  function highlightApproaching(beat) {
    if (!global.PianoUI || !PianoUI.setHighlights) return;
    let mel = null;
    const chords = [];
    notes.forEach((n) => {
      if (!noteVisible(n) || n.status === "miss") return;
      const end = n.start + Math.max(0.18, n.dur);
      if (beat < n.start - 0.08 || beat > end) return;
      if (n.track === "melody") mel = n.midi;
      else chords.push(n.midi);
    });
    PianoUI.setHighlights({
      chordMidis: chords,
      melodyMidi: mel,
      clearChords: !chords.length
    });
  }

  function syncToggles() {
    function press(id, on) {
      const el = $(id);
      if (!el) return;
      el.classList.toggle("is-on", !!on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    }
    press("gm-show-melody", showMelody);
    press("gm-show-chord", showChord);
    press("gm-sound-melody", soundMelody);
    press("gm-sound-chord", soundChord);
    const waitEl = $("gm-wait");
    if (waitEl) {
      waitEl.checked = !!waitMode;
      waitEl.setAttribute("aria-checked", waitMode ? "true" : "false");
    }
    const bpmEl = $("gm-bpm");
    const bpmVal = $("gm-bpm-val");
    if (bpmVal) bpmVal.textContent = String(bpm);
    if (bpmEl && !bpmEl.matches(":active")) bpmEl.value = String(bpm);
  }

  function syncHud() {
    const scoreEl = $("gm-score");
    const comboEl = $("gm-combo");
    const fbEl = $("gm-feedback");
    const statusEl = $("gm-status");
    if (scoreEl) scoreEl.textContent = String(score);
    if (comboEl) {
      comboEl.textContent = combo > 0 ? ("Combo " + combo) : "";
      comboEl.hidden = combo <= 0;
    }
    if (fbEl) {
      const show = feedbackText && performance.now() < feedbackUntil;
      fbEl.textContent = show ? feedbackText : "";
      fbEl.classList.toggle("is-on", !!show);
    }
    if (statusEl) {
      if (finished) statusEl.textContent = "完成！分數 " + score + (maxCombo ? (" · 最高 Combo " + maxCombo) : "") + "。再撳播放可以由頭再玩。";
      else if (waiting) statusEl.textContent = "等到你撳先繼續";
      else if (state === "paused") statusEl.textContent = "已暫停";
      else statusEl.textContent = "";
    }
  }

  function syncTransport() {
    const playBtn = $("gm-play");
    const playing = state === "playing" || waiting;
    if (playBtn) {
      playBtn.classList.toggle("is-playing", state === "playing" || waiting);
      const label = (state === "playing" || waiting) ? "暫停" : "播放";
      playBtn.setAttribute("aria-label", label);
      playBtn.setAttribute("title", label);
    }
    const stage = document.querySelector(".game-stage");
    if (stage) stage.classList.toggle("is-playing", playing);
    if (stage) stage.classList.toggle("is-waiting", waiting);
  }

  function updateTimeline() {
    const total = totalBeats();
    const beat = currentBeatFloat();
    const spb = secondsPerBeat();
    const nowEl = $("gm-time-now");
    const totEl = $("gm-time-total");
    const fill = $("gm-timeline-fill");
    const head = $("gm-timeline-playhead");
    const posEl = $("gm-pos");
    if (nowEl) nowEl.textContent = formatTime(Math.max(0, beat) * spb);
    if (totEl) totEl.textContent = formatTime(total * spb);
    const pct = total > 0 ? (Math.max(0, beat) / total) * 100 : 0;
    if (fill) fill.style.width = pct + "%";
    if (head) head.style.left = pct + "%";
    if (posEl) {
      const pickup = pickupBeats();
      const bpb = beatsPerBar();
      if (beat < 0) posEl.textContent = "準備";
      else if (beat < pickup) posEl.textContent = "起拍";
      else {
        const bar = Math.floor((beat - pickup) / bpb) + 1;
        const beatIn = Math.floor((beat - pickup) % bpb) + 1;
        posEl.textContent = "第 " + bar + " 小節 · 拍 " + beatIn + "/" + bpb;
      }
    }
  }

  function laneGeometry() {
    const canvas = $("gm-lanes");
    const layout = (global.PianoUI && PianoUI.getKeyLayout) ? PianoUI.getKeyLayout() : { keys: [], width: 0, height: 0 };
    const cssW = canvasCssW || (canvas ? canvas.clientWidth : 0);
    const cssH = canvasCssH || (canvas ? canvas.clientHeight : 0);
    const kbdW = layout.width || cssW;
    // Never stretch lanes to fill a wider canvas (that is the 變肥 look).
    // If the wrap is wider than the keyboard, center the pitch columns.
    const xOffset = (kbdW && cssW > kbdW + 1) ? (cssW - kbdW) / 2 : 0;
    const map = new Map();
    (layout.keys || []).forEach((k) => {
      map.set(k.baseMidi, {
        x: k.x + xOffset,
        w: k.w,
        cx: k.cx + xOffset,
        black: k.black,
        baseMidi: k.baseMidi,
        soundingMidi: k.soundingMidi
      });
    });
    return { map: map, cssW: cssW, cssH: cssH, layout: layout };
  }

  function colorFor(n, wrap) {
    if (n.status === "miss") return COLOR.miss;
    const isMel = n.track === "melody";
    if (n.status === "hit") return isMel ? COLOR.melodyHit : COLOR.chordHit;
    if (isMel) return wrap ? COLOR.melodyWrap : COLOR.melody;
    return wrap ? COLOR.chordWrap : COLOR.chord;
  }

  function syncCanvasSize() {
    const canvas = $("gm-lanes");
    const wrap = document.getElementById("gm-lanes-wrap");
    const stack = document.getElementById("gm-stack");
    const line = document.getElementById("gm-hit-line");
    const kbd = global.PianoUI && PianoUI.getKeyboardEl ? PianoUI.getKeyboardEl() : null;
    if (!canvas || !wrap) return false;
    const kbdW = kbd ? kbd.offsetWidth : 0;
    if (kbdW) {
      if (stack && Math.abs((parseFloat(stack.style.width) || 0) - kbdW) > 0.5) {
        stack.style.width = kbdW + "px";
      }
      if (line) line.style.width = kbdW + "px";
    }
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    const wantW = Math.max(1, Math.round(cssW * dpr));
    const wantH = Math.max(1, Math.round(cssH * dpr));
    canvasCssW = cssW;
    canvasCssH = cssH;
    if (canvas.width !== wantW || canvas.height !== wantH) {
      canvas.width = wantW;
      canvas.height = wantH;
      return true;
    }
    return false;
  }

  function drawLanes() {
    const canvas = $("gm-lanes");
    if (!canvas) return;
    syncCanvasSize();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = canvas.width / Math.max(1, canvasCssW);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const geo = laneGeometry();
    const w = geo.cssW;
    const h = geo.cssH;
    ctx.clearRect(0, 0, w, h);

    const hitY = Math.max(8, h - 2);
    const topY = 6;
    const travelPx = Math.max(80, hitY - topY);
    const pxPerBeat = travelPx / TRAVEL_BEATS;
    const beat = currentBeatFloat();
    const pickup = pickupBeats();
    const bpb = beatsPerBar();

    ctx.fillStyle = "#080b12";
    ctx.fillRect(0, 0, w, h);

    const keys = [...geo.map.values()].sort((a, b) => a.x - b.x);
    keys.forEach((k) => {
      if (k.black) return;
      ctx.fillStyle = "#0c1018";
      ctx.fillRect(k.x, 0, k.w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(k.x) + 0.5, 0);
      ctx.lineTo(Math.round(k.x) + 0.5, h);
      ctx.stroke();
    });
    keys.forEach((k) => {
      if (!k.black) return;
      ctx.fillStyle = "#07090e";
      ctx.fillRect(k.x, 0, k.w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.beginPath();
      ctx.moveTo(Math.round(k.x) + 0.5, 0);
      ctx.lineTo(Math.round(k.x) + 0.5, h);
      ctx.stroke();
    });

    const firstBeat = Math.floor(beat - TRAVEL_BEATS - 1);
    const lastBeat = Math.ceil(beat + 1);
    for (let b = firstBeat; b <= lastBeat; b++) {
      const y = hitY - (b - beat) * pxPerBeat;
      if (y < -2 || y > h + 2) continue;
      const afterPickup = b - pickup;
      const isBar = b >= pickup && afterPickup % bpb === 0;
      ctx.strokeStyle = isBar ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)";
      ctx.lineWidth = isBar ? 1.4 : 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
      ctx.stroke();
    }

    const visible = notes.filter((n) => {
      if (!noteVisible(n)) return false;
      const endBeat = n.start + n.dur;
      if (n.status === "miss" && beat > n.start + 1.2) return false;
      if (n.status === "hit" && beat > endBeat + 0.6) return false;
      const yAttack = hitY - (n.start - beat) * pxPerBeat;
      const yRelease = hitY - (endBeat - beat) * pxPerBeat;
      return yAttack >= -8 && yRelease <= h + 24;
    });

    const litIds = litNoteIds(beat);

    function drawNote(n) {
      const wr = wrapToWindow(n.midi);
      const col = geo.map.get(wr.baseMidi);
      if (!col) return;
      const endBeat = n.start + n.dur;
      let yAttack = hitY - (n.start - beat) * pxPerBeat;
      let yRelease = hitY - (endBeat - beat) * pxPerBeat;
      if (waiting && n.status === "pending" && n.start <= beat + 1e-6) {
        yAttack = hitY;
        yRelease = hitY - n.dur * pxPerBeat;
      }
      let height = Math.max(MIN_BAR_PX, yAttack - yRelease);
      let y = yAttack - height;
      if (yAttack > hitY) {
        height = Math.max(2, hitY - y);
      }
      const inset = col.black ? 1 : 2.5;
      const x = col.x + inset;
      const bw = Math.max(8, col.w - inset * 2);
      const lit = litIds.has(n.id);
      const pal = lit
        ? (n.track === "melody" ? COLOR.melodyLit : COLOR.chordLit)
        : colorFor(n, wr.wrap);
      const r = Math.min(5, bw / 2, height / 2);
      ctx.save();
      const atLine = n.status === "pending" && Math.abs(beat - n.start) <= HIT_LATE;
      if (lit) {
        ctx.shadowColor = pal.glow;
        ctx.shadowBlur = 46;
      } else if (atLine) {
        ctx.shadowColor = pal.glow || pal.stroke;
        ctx.shadowBlur = 14;
      } else if (n.status === "hit") {
        ctx.shadowColor = pal.glow || pal.stroke;
        ctx.shadowBlur = 28;
      }
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, height, r);
      else ctx.rect(x, y, bw, height);
      ctx.fillStyle = pal.fill;
      ctx.globalAlpha = n.status === "miss" ? 0.4 : 1;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = lit ? 3.2 : (n.status === "hit" ? 2.4 : 1.3);
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (lit) {
        // Whole-bar wash so the glow reads on the full vertical bar, not just the contact.
        ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (n.status === "hit") {
        const flashH = Math.min(10, height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.fillRect(x, hitY - flashH, bw, flashH);
      }

      const letter = pitchLetter(n);
      const mark = wrapLabel(wr.wrap);
      if (letter && height >= 14 && n.status !== "miss") {
        const fontPx = Math.max(11, Math.min(18, Math.floor(bw * 0.72)));
        ctx.fillStyle = pal.text;
        ctx.font = "800 " + fontPx + "px \"Noto Sans TC\", \"PingFang HK\", system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const letterBase = Math.min(yAttack, hitY) - (mark && height >= 28 ? 13 : 3);
        ctx.fillText(letter, x + bw / 2, letterBase);
        if (mark && height >= 28) {
          ctx.font = "700 9px \"Noto Sans TC\", \"PingFang HK\", system-ui, sans-serif";
          ctx.fillText(mark, x + bw / 2, Math.min(yAttack, hitY) - 3);
        }
      } else if (mark && height >= 16 && n.status === "pending") {
        ctx.fillStyle = pal.text;
        ctx.font = "700 9px \"Noto Sans TC\", \"PingFang HK\", system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(mark, x + bw / 2, Math.min(yAttack, hitY) - 3);
      }
      ctx.restore();
    }

    visible.filter((n) => {
      const wr = wrapToWindow(n.midi);
      const col = geo.map.get(wr.baseMidi);
      return col && !col.black;
    }).forEach(drawNote);
    visible.filter((n) => {
      const wr = wrapToWindow(n.midi);
      const col = geo.map.get(wr.baseMidi);
      return col && col.black;
    }).forEach(drawNote);

    // Bright red contact line at the bottom of the roll, pairing with the DOM strip.
    ctx.fillStyle = "#ff1433";
    ctx.fillRect(0, Math.max(0, hitY - 2), w, 4);
    ctx.fillStyle = "rgba(255, 236, 238, 0.85)";
    ctx.fillRect(0, Math.max(0, hitY - 2), w, 1.2);
  }

  function renderFrame() {
    const beat = maybeWaitOrMiss(currentBeatFloat());
    if (!waiting && state === "playing") {
      scheduleGuideAudio();
      if (beat >= totalBeats() - 1e-4) {
        stopSong({ finished: true });
        return;
      }
    }
    updateTimeline();
    syncHud();
    syncTransport();
    highlightApproaching(beat);
    syncChordRail();
    drawLanes();
  }

  function startClock() {
    stopClock();
    const tick = () => {
      renderFrame();
      if (state === "playing" || waiting) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopClock() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function playSong() {
    if (!song) return;
    if (global.PianoUI && typeof PianoUI.unlockAudio === "function") PianoUI.unlockAudio();
    else if (global.PianoAudio) PianoAudio.ensure();
    if (state === "playing" && !waiting) return;
    if (finished || beatIndex >= totalBeats()) {
      finished = false;
      beatIndex = startBeat();
      resetScore();
      resetNotes();
    }
    waiting = false;
    waitHoldBeat = null;
    state = "playing";
    finished = false;
    const startDelay = 0.06;
    anchorBeat = beatIndex;
    anchorAudioTime = PianoAudio.now() + startDelay;
    autoHitHeld();
    syncToggles();
    syncHud();
    syncTransport();
    startClock();
    scheduleGuideAudio();
  }

  function pauseSong() {
    if (state !== "playing" && !waiting) return;
    const pos = currentBeatFloat();
    stopClock();
    cancelGuideAudio();
    waiting = false;
    waitHoldBeat = null;
    state = "paused";
    beatIndex = pos;
    syncHud();
    syncTransport();
    updateTimeline();
    syncChordRail();
    drawLanes();
  }

  function stopSong(opts) {
    opts = opts || {};
    stopClock();
    cancelGuideAudio();
    waiting = false;
    waitHoldBeat = null;
    state = "stopped";
    if (opts.finished) {
      finished = true;
      beatIndex = Math.max(0, totalBeats());
      setFeedback("完成！", 2000);
    } else {
      finished = false;
      beatIndex = startBeat();
      if (!opts.keepScore) {
        resetScore();
        resetNotes();
      }
    }
    if (active) highlightApproaching(currentBeatFloat());
    syncHud();
    syncTransport();
    updateTimeline();
    syncChordRail();
    drawLanes();
  }

  function togglePlayPause() {
    if (!song) return;
    if (state === "playing" || waiting) pauseSong();
    else playSong();
  }

  function goToStart() {
    if (!song) return;
    const wasPlaying = state === "playing" || waiting;
    stopClock();
    cancelGuideAudio();
    waiting = false;
    waitHoldBeat = null;
    finished = false;
    beatIndex = startBeat();
    resetScore();
    resetNotes();
    if (wasPlaying) {
      state = "paused";
      playSong();
      return;
    }
    state = "stopped";
    if (active) highlightApproaching(0);
    syncHud();
    syncTransport();
    updateTimeline();
    syncChordRail();
    drawLanes();
  }

  function setBpm(value, flags) {
    const next = clampBpm(value);
    if (next === bpm) {
      syncToggles();
      return;
    }
    if (state === "playing" || waiting) {
      const pos = currentBeatFloat();
      bpm = next;
      saveBpm(bpm);
      syncToggles();
      if (!waiting) {
        anchorBeat = pos;
        anchorAudioTime = PianoAudio.now();
        cancelGuideAudio();
        scheduleGuideAudio();
      }
      updateTimeline();
      return;
    }
    bpm = next;
    saveBpm(bpm);
    syncToggles();
    updateTimeline();
  }

  function setShowMelody(on) {
    showMelody = !!on;
    saveFlag(STORAGE.showMelody, showMelody);
    if (waiting) tryReleaseWait();
    syncToggles();
  }

  function setShowChord(on) {
    showChord = !!on;
    saveFlag(STORAGE.showChord, showChord);
    if (waiting) tryReleaseWait();
    syncToggles();
  }

  function setSoundMelody(on) {
    soundMelody = !!on;
    saveFlag(STORAGE.soundMelody, soundMelody);
    syncGuideBuses();
    cancelGuideAudio("melody");
    if (state === "playing" && !waiting) scheduleGuideAudio();
    syncToggles();
  }

  function setSoundChord(on) {
    soundChord = !!on;
    saveFlag(STORAGE.soundChord, soundChord);
    syncGuideBuses();
    cancelGuideAudio("chord");
    if (state === "playing" && !waiting) scheduleGuideAudio();
    syncToggles();
  }

  function setWaitMode(on) {
    waitMode = !!on;
    saveFlag(STORAGE.wait, waitMode);
    if (!waitMode && waiting) {
      const pos = waitHoldBeat;
      waiting = false;
      waitHoldBeat = null;
      beatIndex = pos;
      anchorBeat = pos;
      anchorAudioTime = (global.PianoAudio ? PianoAudio.now() : 0);
      if (state === "playing") scheduleGuideAudio();
    }
    syncToggles();
    syncHud();
  }

  function bindToggle(id, getter, setter) {
    const el = $(id);
    if (!el || el.dataset.bound) return;
    el.dataset.bound = "1";
    el.addEventListener("click", () => setter(!getter()));
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || !!el.isContentEditable;
  }

  function onGameKeydown(e) {
    if (!active) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (isTypingTarget(e.target)) return;
    if (e.code === "Space" || e.key === " " || e.key === "Spacebar") {
      if (e.repeat) return;
      e.preventDefault();
      togglePlayPause();
    }
  }

  function bind() {
    const play = $("gm-play");
    const restart = $("gm-restart");
    const bpmEl = $("gm-bpm");
    const more = $("gm-more");
    const panel = $("gm-more-panel");
    const waitEl = $("gm-wait");
    if (play && !play.dataset.bound) {
      play.dataset.bound = "1";
      play.addEventListener("click", togglePlayPause);
    }
    if (restart && !restart.dataset.bound) {
      restart.dataset.bound = "1";
      restart.addEventListener("click", goToStart);
    }
    if (bpmEl && !bpmEl.dataset.bound) {
      bpmEl.dataset.bound = "1";
      bpmEl.min = String(MIN_BPM);
      bpmEl.max = String(MAX_BPM);
      bpmEl.addEventListener("input", (e) => setBpm(Number(e.target.value), { fromSlider: true }));
    }
    if (waitEl && !waitEl.dataset.bound) {
      waitEl.dataset.bound = "1";
      waitEl.addEventListener("change", () => setWaitMode(waitEl.checked));
    }
    bindToggle("gm-show-melody", () => showMelody, setShowMelody);
    bindToggle("gm-show-chord", () => showChord, setShowChord);
    bindToggle("gm-sound-melody", () => soundMelody, setSoundMelody);
    bindToggle("gm-sound-chord", () => soundChord, setSoundChord);
    const scaleEl = $("gm-key-scale");
    if (scaleEl && !scaleEl.dataset.gameScaleHook) {
      scaleEl.dataset.gameScaleHook = "1";
      scaleEl.addEventListener("input", () => { gameScaleUserSet = true; });
    }
    if (more && panel && !more.dataset.bound) {
      more.dataset.bound = "1";
      more.addEventListener("click", () => {
        moreOpen = !moreOpen;
        panel.classList.toggle("open", moreOpen);
        more.setAttribute("aria-expanded", moreOpen ? "true" : "false");
      });
    }
    if (!bind._keys) {
      bind._keys = true;
      window.addEventListener("keydown", onGameKeydown);
      window.addEventListener("resize", () => {
        if (!active) return;
        applyGameKeyboardScale();
        syncCanvasSize();
        drawLanes();
      });
    }
    if (global.PianoUI && PianoUI.mountControls) {
      PianoUI.mountControls(document.getElementById("view-game") || document);
    }
  }

  function level3Of(songData) {
    if (!songData || !songData.levels) return null;
    return songData.levels.find((l) => l.id === 3) || null;
  }

  function setSong(songData) {
    if (state === "playing" || waiting || state === "paused") {
      stopClock();
      cancelGuideAudio();
    }
    song = songData;
    level = level3Of(songData);
    loadPrefs(songData && songData.defaultBpm ? songData.defaultBpm : 68);
    waiting = false;
    waitHoldBeat = null;
    state = "stopped";
    finished = false;
    beatIndex = startBeat();
    anchorBeat = startBeat();
    anchorAudioTime = 0;
    resetScore();
    if (level) buildNotes();
    else notes = [];
    buildChordRail();
    syncToggles();
    syncHud();
    syncTransport();
    updateTimeline();
    if (active) {
      highlightApproaching(0);
      drawLanes();
    }
  }

  /* Proportional scale for the 25-key board: shrink to fit the board width,
     cap height so the roll still has room, and never stretch keys sideways
     to fill the screen (the 變肥 look). A comfortable ceiling of 1.45 keeps
     white keys taller than they are wide at typical desktop widths. */
  function naturalGameScale() {
    const board = document.querySelector(".game-board");
    const rail = document.getElementById("gm-chord-rail");
    const measured = rail ? Math.ceil(rail.getBoundingClientRect().width || 0) : 0;
    const railW = Math.max(RAIL_MIN_PX, measured);
    const availW = board && board.clientWidth
      ? Math.max(80, board.clientWidth - 16 - railW * 2)
      : Math.max(80, window.innerWidth - 24 - railW * 2);
    const availH = board && board.clientHeight ? board.clientHeight : window.innerHeight;
    const baseW = 510; /* unscaled MiniLab width (15 white keys + padding) */
    const baseH = 126;
    const maxByW = availW / baseW;
    const maxH = Math.min(210, Math.max(110, availH * 0.32));
    const maxByH = maxH / baseH;
    const s = Math.min(maxByW, maxByH, 1.45);
    return Math.max(0.7, s);
  }

  function applyGameKeyboardScale() {
    if (!global.PianoUI || !PianoUI.setScale) return;
    if (savedScale == null && typeof PianoUI.getScale === "function") {
      savedScale = PianoUI.getScale();
    }
    const cap = naturalGameScale();
    if (gameScaleUserSet && typeof PianoUI.getScale === "function") {
      const cur = PianoUI.getScale();
      if (cur > cap + 0.001) PianoUI.setScale(cap, { force: true });
      else if (global.PianoUI.syncScaleSlider) PianoUI.syncScaleSlider();
      return;
    }
    PianoUI.setScale(cap, { force: true });
  }

  function restoreKeyboardScale() {
    gameScaleUserSet = false;
    if (savedScale == null || !global.PianoUI || !PianoUI.setScale) return;
    PianoUI.setScale(savedScale, { force: true });
    savedScale = null;
  }

  function activate() {
    active = true;
    bind();
    gameScaleUserSet = false;
    applyGameKeyboardScale();
    syncGuideBuses();
    if (global.PianoUI && PianoUI.setHighlightVisibility) {
      PianoUI.setHighlightVisibility({ melody: true, chord: true });
    }
    if (!unsubNotes && global.PianoUI && PianoUI.subscribeNotes) {
      unsubNotes = PianoUI.subscribeNotes(onNoteEvent);
    }
    if (!unsubRebuild && global.PianoUI && PianoUI.onRebuild) {
      unsubRebuild = PianoUI.onRebuild(() => {
        if (active) {
          syncCanvasSize();
          drawLanes();
        }
      });
    }
    buildChordRail();
    syncToggles();
    syncHud();
    syncTransport();
    updateTimeline();
    requestAnimationFrame(() => {
      applyGameKeyboardScale();
      syncCanvasSize();
      syncChordRail();
      drawLanes();
    });
  }

  function deactivate() {
    active = false;
    if (state === "playing" || waiting || state === "paused") {
      stopSong({ keepScore: true });
    }
    if (unsubNotes) { unsubNotes(); unsubNotes = null; }
    if (unsubRebuild) { unsubRebuild(); unsubRebuild = null; }
    held.clear();
    if (global.PianoUI && PianoUI.clearHighlight) PianoUI.clearHighlight();
    restoreKeyboardScale();
  }

  function mount(songData) {
    loadPrefs(songData && songData.defaultBpm ? songData.defaultBpm : 68);
    bind();
    if (songData) setSong(songData);
  }

  global.GameMode = {
    mount,
    setSong,
    activate,
    deactivate,
    play: playSong,
    pause: pauseSong,
    stop: () => stopSong({}),
    hasGame: function (songData) {
      return !!(songData && songData.id === "danche" && level3Of(songData));
    }
  };
})(window);
