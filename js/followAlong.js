/* Follow-along practice: BPM clock, horizontal grand staff, lyrics under the staff. */
(function (global) {
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;
  const MIN_BPM = 40;
  const MAX_BPM = 120;
  const MIN_BARS = 2;
  const MAX_BARS = 6;
  const DEFAULT_BARS = 4;
  const NS = "http://www.w3.org/2000/svg";
  const STEP = 4.5;
  const SPACE = STEP * 2;
  const GUTTER = 74;
  const TOP_PAD = 26;
  const MID_GAP = 42;
  const BOTTOM_PAD = 26;
  const LYRIC_Y_OFFSET = 16;
  const TREBLE_TOP = TOP_PAD;
  const TREBLE_BOTTOM = TREBLE_TOP + 4 * SPACE;
  const BASS_TOP = TREBLE_BOTTOM + MID_GAP;
  const BASS_BOTTOM = BASS_TOP + 4 * SPACE;
  const SVG_H = BASS_BOTTOM + BOTTOM_PAD;
  const VOICE_OPTS = { minMidi: 48, maxMidi: 67 };
  const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"];
  const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"];
  const TREBLE_SHARP_Y = ["F5", "C5", "G5", "D5", "A4", "E5", "B4"];
  const TREBLE_FLAT_Y = ["B4", "E5", "A4", "D5", "G4", "C5", "F4"];
  const BASS_SHARP_Y = ["F3", "C3", "G3", "D3", "A2", "E3", "B2"];
  const BASS_FLAT_Y = ["B3", "E3", "A2", "D3", "G2", "C3", "F2"];

  let staffEl = null;
  let svg = null;
  let scrollG = null;
  let playheadEl = null;
  let song = null;
  let levelId = 3;
  let bpm = 68;
  let metronomeOn = true;
  let visibleBars = DEFAULT_BARS;
  let state = "stopped";
  let finished = false;
  let active = false;
  let beatIndex = 0;
  let runId = 0;
  let timerId = null;
  let rafId = null;
  let nextBeatTime = 0;
  let scheduledBeatIndex = 0;
  let anchorAudioTime = 0;
  let anchorBeat = 0;
  let builtKey = null;
  let notationWidth = 0;
  let pxPerBeat = 48;
  let resizeObs = null;
  let guideOn = true;
  let muteMelody = false;
  let muteChord = false;
  let scrubbing = false;
  let resumeAfterScrub = false;
  let moreOpen = false;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function svgEl(name, attrs, text) {
    const n = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] != null && attrs[k] !== "") n.setAttribute(k, String(attrs[k]));
      });
    }
    if (text != null) n.textContent = text;
    return n;
  }

  function $(id) {
    return document.getElementById(id);
  }

  function currentLevel() {
    return song.levels.find((l) => l.id === levelId) || song.levels[0];
  }

  function progression() {
    return currentLevel().progression;
  }

  function beatsPerBar() {
    return song.beatsPerBar || 4;
  }

  function pickupBeats() {
    const lv = currentLevel();
    if (lv.pickupBeats != null) return lv.pickupBeats;
    return song.pickupBeats || 0;
  }

  function totalBeats() {
    return progression().reduce((s, ev) => s + ev.beats, 0);
  }

  function melodyNotes() {
    const lv = currentLevel();
    return (lv.melody && lv.melody.length) ? lv.melody : (song.melody || []);
  }

  function lyricsList() {
    const lv = currentLevel();
    if (lv.lyrics && lv.lyrics.length) return lv.lyrics;
    if (song.lyrics && song.lyrics.length) return song.lyrics;
    return [];
  }

  function barNumber(beat) {
    const pickup = pickupBeats();
    const bpb = beatsPerBar();
    if (beat < pickup) return 0;
    return Math.floor((beat - pickup) / bpb) + 1;
  }

  function sungBarSet() {
    const set = new Set();
    lyricsList().forEach((line) => {
      const n = barNumber(line.startBeat);
      if (n > 0) set.add(n);
    });
    return set;
  }

  /* Lyric-bearing bars show chords. Pickup and later instrumental gaps (no lyric slots) are intro-like. */
  function isIntroBeat(beat) {
    const lines = lyricsList();
    if (!lines.length) return false;
    const n = barNumber(beat);
    if (n === 0) return true;
    return !sungBarSet().has(n);
  }

  function lyricAtBeat(beat) {
    const lines = lyricsList();
    let cur = null;
    let next = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startBeat <= beat) cur = lines[i];
      else {
        next = lines[i];
        break;
      }
    }
    if (isIntroBeat(beat)) {
      return { cur: null, next: next || (cur && cur.startBeat > beat ? cur : next), intro: true };
    }
    return { cur, next, intro: false };
  }

  function clampBpm(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return song.defaultBpm || 68;
    return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));
  }

  function clampBars(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return DEFAULT_BARS;
    return Math.max(MIN_BARS, Math.min(MAX_BARS, Math.round(n)));
  }

  function secondsPerBeat() {
    return 60 / bpm;
  }

  function currentBeatFloat() {
    const total = totalBeats();
    if (state === "playing") {
      const b = anchorBeat + (PianoAudio.now() - anchorAudioTime) / secondsPerBeat();
      return Math.max(0, Math.min(total, b));
    }
    if (finished) return total;
    return Math.max(0, Math.min(total, beatIndex));
  }

  function formatTime(sec) {
    const t = Math.max(0, sec);
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function eventAtBeat(beat) {
    let t = 0;
    const prog = progression();
    const cap = Math.max(0, Math.min(beat, Math.max(0, totalBeats() - 0.0001)));
    for (let i = 0; i < prog.length; i++) {
      const ev = prog[i];
      if (cap < t + ev.beats) {
        return { ev, index: i, beatInEvent: cap - t, startBeat: t };
      }
      t += ev.beats;
    }
    return null;
  }

  function melodyAtBeat(beat) {
    const notes = melodyNotes();
    let cur = null;
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      if (n.start <= beat && beat < n.start + n.dur) cur = n;
      else if (n.start > beat) break;
    }
    return cur;
  }

  function pretty(sym) {
    return global.MusicTheory && MusicTheory.prettyChord ? MusicTheory.prettyChord(sym) : (sym || "—");
  }

  function prettyNote(name) {
    return global.MusicTheory && MusicTheory.prettyNote ? MusicTheory.prettyNote(name) : String(name || "");
  }

  function currentChordVoicing(beat) {
    if (isIntroBeat(beat)) return [];
    const cap = Math.min(Math.floor(beat), Math.max(0, totalBeats() - 1));
    const info = eventAtBeat(cap);
    if (!info || !info.ev.chord) return [];
    return MusicTheory.chordVoicingFromSymbol(info.ev.chord, VOICE_OPTS) || [];
  }

  function highlightCurrent() {
    if (!global.PianoUI) return;
    const beat = currentBeatFloat();
    const mel = melodyAtBeat(beat);
    const voicing = currentChordVoicing(beat);
    const midis = voicing.map((v) => v.midi);
    if (PianoUI.setHighlights) {
      PianoUI.setHighlights({
        chordMidis: midis,
        melodyMidi: mel ? mel.midi : null,
        clearChords: !midis.length
      });
    } else if (PianoUI.setChordMidis) {
      PianoUI.setChordMidis(midis);
      if (PianoUI.setMelodyMidi) PianoUI.setMelodyMidi(mel ? mel.midi : null);
    }
  }

  function keyData() {
    if (global.MusicTheory && song && song.key) return MusicTheory.keyInfo(song.key);
    return null;
  }

  function diatonicSteps(name) {
    return MusicTheory.diatonicIndex(name);
  }

  function yTreble(nameOrSteps) {
    const steps = typeof nameOrSteps === "number" ? nameOrSteps : diatonicSteps(nameOrSteps);
    return TREBLE_BOTTOM - (steps - diatonicSteps("E4")) * STEP;
  }

  function yBass(nameOrSteps) {
    const steps = typeof nameOrSteps === "number" ? nameOrSteps : diatonicSteps(nameOrSteps);
    return BASS_BOTTOM - (steps - diatonicSteps("G2")) * STEP;
  }

  function keyDefaultAccidental(letter) {
    const kd = keyData();
    const sig = kd ? kd.key.sig : 0;
    if (sig > 0) return SHARP_ORDER.slice(0, sig).indexOf(letter) >= 0 ? "#" : "";
    if (sig < 0) return FLAT_ORDER.slice(0, -sig).indexOf(letter) >= 0 ? "b" : "";
    return "";
  }

  function neededAccidental(name, beat, barAcc) {
    const p = MusicTheory.parsePitchName(name);
    if (!p) return "";
    const letter = p.name.charAt(0);
    const acc = MusicTheory.accidentalOf(name);
    const def = keyDefaultAccidental(letter);
    const key = barNumber(beat) + ":" + letter + ":" + p.oct;
    const prev = barAcc.has(key) ? barAcc.get(key) : def;
    if (acc === prev) return "";
    barAcc.set(key, acc);
    if (acc === "") return "n";
    return acc;
  }

  function accGlyph(kind) {
    if (kind === "#") return "♯";
    if (kind === "b") return "♭";
    if (kind === "n") return "♮";
    return "";
  }

  function staffLinesY(which) {
    const ys = [];
    const top = which === "treble" ? TREBLE_TOP : BASS_TOP;
    for (let i = 0; i < 5; i++) ys.push(top + i * SPACE);
    return ys;
  }

  function ledgerLines(y, staffTop, staffBottom) {
    const lines = [];
    if (y < staffTop - 0.4) {
      for (let ly = staffTop - SPACE; ly >= y - 0.2; ly -= SPACE) lines.push(ly);
    } else if (y > staffBottom + 0.4) {
      for (let ly = staffBottom + SPACE; ly <= y + 0.2; ly += SPACE) lines.push(ly);
    }
    return lines;
  }

  function xOfBeat(beat) {
    return beat * pxPerBeat;
  }

  function viewWidth() {
    if (!staffEl) return 800;
    return Math.max(320, staffEl.clientWidth || staffEl.parentElement && staffEl.parentElement.clientWidth || 800);
  }

  function scrollXFor(beat) {
    const viewW = Math.max(80, notationWidth);
    const playheadX = beat * pxPerBeat;
    const offset = Math.min(pxPerBeat * beatsPerBar(), viewW * 0.22);
    const totalW = totalBeats() * pxPerBeat + 16;
    let start = playheadX - offset;
    const maxStart = Math.max(0, totalW - viewW);
    return Math.max(0, Math.min(start, maxStart));
  }

  function drawHead(cx, cy, open) {
    const head = svgEl("ellipse", {
      class: "fa-nhead" + (open ? " open" : ""),
      cx: cx,
      cy: cy,
      rx: 5.2,
      ry: 3.6,
      transform: "rotate(-20 " + cx + " " + cy + ")"
    });
    return head;
  }

  function drawStem(cx, cy, up, length) {
    const len = length || SPACE * 3.2;
    const x = up ? cx + 4.6 : cx - 4.6;
    const y2 = up ? cy - len : cy + len;
    return svgEl("line", { class: "fa-stem", x1: x, y1: cy, x2: x, y2: y2 });
  }

  function drawFlags(cx, cy, up, count) {
    const g = svgEl("g", { class: "fa-flags" });
    const x = up ? cx + 4.6 : cx - 4.6;
    const dir = up ? -1 : 1;
    const stemEnd = cy + dir * SPACE * 3.2;
    for (let i = 0; i < count; i++) {
      const y = stemEnd - dir * i * 5;
      const d = up
        ? "M " + x + " " + y + " c 8 2 11 9 7 16"
        : "M " + x + " " + y + " c 8 -2 11 -9 7 -16";
      g.appendChild(svgEl("path", { class: "fa-flag", d: d }));
    }
    return g;
  }

  function drawDot(cx, cy) {
    return svgEl("circle", { class: "fa-dot-note", cx: cx + 8.5, cy: cy - 1, r: 1.4 });
  }

  function isDotted(dur) {
    const d = Math.round(dur * 8) / 8;
    return d === 0.75 || d === 1.5 || d === 3;
  }

  function durStyle(dur) {
    if (dur >= 3.5) return { open: true, stem: false, flags: 0 };
    if (dur >= 2) return { open: true, stem: true, flags: 0 };
    if (dur >= 1) return { open: false, stem: true, flags: 0 };
    if (dur >= 0.5) return { open: false, stem: true, flags: 1 };
    return { open: false, stem: true, flags: 2 };
  }

  function addLedgers(parent, cx, ys) {
    ys.forEach((y) => {
      parent.appendChild(svgEl("line", {
        class: "fa-ledger",
        x1: cx - 8,
        y1: y,
        x2: cx + 8,
        y2: y
      }));
    });
  }

  function stemUpFor(y, staffMid) {
    return y > staffMid;
  }

  function buildStaff() {
    if (!staffEl) return;
    const width = viewWidth();
    notationWidth = Math.max(120, width - GUTTER - 8);
    pxPerBeat = notationWidth / (visibleBars * beatsPerBar());
    staffEl.innerHTML = "";

    svg = svgEl("svg", {
      class: "fa-staff-svg",
      viewBox: "0 0 " + width + " " + SVG_H,
      width: "100%",
      height: String(SVG_H),
      preserveAspectRatio: "xMinYMid meet",
      "aria-hidden": "false"
    });

    const defs = svgEl("defs");
    defs.appendChild(svgEl("clipPath", { id: "fa-clip-notation" }, null));
    defs.firstChild.appendChild(svgEl("rect", {
      x: String(GUTTER),
      y: "0",
      width: String(Math.max(1, width - GUTTER)),
      height: String(SVG_H)
    }));
    svg.appendChild(defs);

    // Fixed staff lines across the visible area
    const linesG = svgEl("g", { class: "fa-staff-lines" });
    staffLinesY("treble").concat(staffLinesY("bass")).forEach((y) => {
      linesG.appendChild(svgEl("line", {
        class: "fa-sline",
        x1: GUTTER - 6,
        y1: y,
        x2: width - 4,
        y2: y
      }));
    });
    svg.appendChild(linesG);

    const clipped = svgEl("g", { class: "fa-clipped", "clip-path": "url(#fa-clip-notation)" });
    scrollG = svgEl("g", { class: "fa-scroll" });
    clipped.appendChild(scrollG);
    svg.appendChild(clipped);

    drawNotation();
    drawGutter(width);
    playheadEl = svgEl("line", {
      class: "fa-playhead",
      x1: GUTTER,
      y1: TREBLE_TOP - 16,
      x2: GUTTER,
      y2: BASS_BOTTOM + LYRIC_Y_OFFSET + 4
    });
    svg.appendChild(playheadEl);

    staffEl.appendChild(svg);
    builtKey = levelId + ":" + visibleBars + ":" + Math.round(width);
    updateStaff();
  }

  function drawGutter(width) {
    const bg = svgEl("rect", {
      class: "fa-gutter-bg",
      x: 0,
      y: 0,
      width: GUTTER,
      height: SVG_H
    });
    svg.appendChild(bg);

    const brace = svgEl("path", {
      class: "fa-brace",
      d: bracePath(10, TREBLE_TOP, BASS_BOTTOM)
    });
    svg.appendChild(brace);

    svg.appendChild(trebleClef(16, yTreble("G4")));
    svg.appendChild(bassClef(16, yBass("F3")));

    const kd = keyData();
    const sig = kd ? kd.key.sig : 0;
    let cursor = 46;
    const count = Math.abs(sig);
    for (let i = 0; i < count; i++) {
      const nameT = sig > 0 ? TREBLE_SHARP_Y[i] : TREBLE_FLAT_Y[i];
      const nameB = sig > 0 ? BASS_SHARP_Y[i] : BASS_FLAT_Y[i];
      const glyph = sig > 0 ? "♯" : "♭";
      svg.appendChild(svgEl("text", {
        class: "fa-keysig",
        x: cursor,
        y: yTreble(nameT) + 3.5
      }, glyph));
      svg.appendChild(svgEl("text", {
        class: "fa-keysig",
        x: cursor,
        y: yBass(nameB) + 3.5
      }, glyph));
      cursor += 7;
    }

    const tsX = Math.max(cursor + 2, 50);
    const tMid = (TREBLE_TOP + TREBLE_BOTTOM) / 2;
    const bMid = (BASS_TOP + BASS_BOTTOM) / 2;
    const ts = String(beatsPerBar());
    svg.appendChild(svgEl("text", { class: "fa-timesig", x: tsX, y: tMid - 3 }, ts));
    svg.appendChild(svgEl("text", { class: "fa-timesig", x: tsX, y: tMid + SPACE - 3 }, ts));
    svg.appendChild(svgEl("text", { class: "fa-timesig", x: tsX, y: bMid - 3 }, ts));
    svg.appendChild(svgEl("text", { class: "fa-timesig", x: tsX, y: bMid + SPACE - 3 }, ts));
  }

  function bracePath(x, y1, y2) {
    const mid = (y1 + y2) / 2;
    const h = y2 - y1;
    return "M " + (x + 5) + " " + y1 +
      " C " + (x - 8) + " " + (y1 + h * 0.14) + ", " + (x - 8) + " " + (mid - 18) + ", " + (x + 6) + " " + mid +
      " C " + (x - 8) + " " + (mid + 18) + ", " + (x - 8) + " " + (y2 - h * 0.14) + ", " + (x + 5) + " " + y2 +
      " C " + (x + 1.5) + " " + (y2 - h * 0.16) + ", " + (x + 1.5) + " " + (mid + 20) + ", " + (x + 11) + " " + mid +
      " C " + (x + 1.5) + " " + (mid - 20) + ", " + (x + 1.5) + " " + (y1 + h * 0.16) + ", " + (x + 5) + " " + y1 +
      " Z";
  }

  /* Public-domain G-clef / F-clef outlines (Wikimedia File:Treble_clef.svg and
     File:Bass_clef.svg by Tlusťa, released into the public domain), rescaled
     so 1 unit = 1 staff space and y=0 sits on G4 / F3. */
  function trebleClef(x, gLineY) {
    const g = svgEl("g", {
      class: "fa-clef fa-treble",
      transform: "translate(" + x + " " + gLineY + ") scale(" + SPACE + ")"
    });
    g.appendChild(svgEl("path", { class: "fa-clef-path", d: "M 1.382 -0.505 C 1.279 -0.476 1.186 -0.412 1.1 -0.313 C 1.013 -0.213 0.971 -0.103 0.971 0.015 C 0.971 0.09 0.996 0.174 1.045 0.264 C 1.094 0.356 1.169 0.422 1.265 0.464 C 1.298 0.471 1.313 0.488 1.313 0.511 C 1.313 0.52 1.301 0.528 1.272 0.535 C 1.118 0.496 0.991 0.413 0.893 0.29 C 0.795 0.164 0.744 0.022 0.741 -0.141 C 0.746 -0.315 0.798 -0.478 0.898 -0.627 C 1 -0.777 1.13 -0.884 1.289 -0.947 L 1.172 -1.548 C 0.912 -1.331 0.7 -1.106 0.536 -0.869 C 0.371 -0.633 0.287 -0.378 0.28 -0.102 C 0.283 0.022 0.309 0.142 0.356 0.257 C 0.404 0.374 0.475 0.479 0.569 0.576 C 0.761 0.767 1.01 0.867 1.313 0.877 C 1.416 0.87 1.526 0.852 1.645 0.821 L 1.382 -0.505 Z M 1.504 -0.522 L 1.768 0.781 C 2.029 0.676 2.16 0.447 2.16 0.098 C 2.144 -0.019 2.111 -0.124 2.053 -0.217 C 1.997 -0.312 1.923 -0.386 1.828 -0.44 C 1.733 -0.494 1.626 -0.522 1.504 -0.522 Z M 1.157 -2.283 C 1.213 -2.317 1.277 -2.376 1.347 -2.459 C 1.416 -2.54 1.484 -2.637 1.548 -2.745 C 1.614 -2.855 1.667 -2.967 1.706 -3.08 C 1.745 -3.192 1.763 -3.299 1.763 -3.397 C 1.763 -3.439 1.76 -3.482 1.752 -3.519 C 1.745 -3.58 1.726 -3.627 1.694 -3.66 C 1.662 -3.69 1.621 -3.707 1.57 -3.707 C 1.469 -3.707 1.377 -3.644 1.296 -3.519 C 1.233 -3.411 1.181 -3.282 1.144 -3.136 C 1.105 -2.989 1.083 -2.843 1.079 -2.696 C 1.088 -2.528 1.115 -2.391 1.157 -2.283 Z M 1.05 -2.185 C 0.974 -2.459 0.932 -2.738 0.923 -3.023 C 0.925 -3.206 0.944 -3.377 0.979 -3.536 C 1.013 -3.695 1.062 -3.832 1.127 -3.951 C 1.189 -4.069 1.262 -4.159 1.343 -4.22 C 1.416 -4.274 1.469 -4.303 1.498 -4.303 C 1.52 -4.303 1.538 -4.295 1.555 -4.279 C 1.572 -4.264 1.594 -4.239 1.621 -4.205 C 1.823 -3.919 1.924 -3.573 1.924 -3.17 C 1.924 -2.979 1.899 -2.793 1.848 -2.606 C 1.799 -2.422 1.726 -2.246 1.63 -2.081 C 1.531 -1.915 1.416 -1.771 1.282 -1.648 L 1.42 -0.981 C 1.494 -0.989 1.545 -0.996 1.574 -0.996 C 1.702 -0.996 1.818 -0.969 1.924 -0.914 C 2.031 -0.86 2.122 -0.787 2.197 -0.694 C 2.271 -0.603 2.329 -0.498 2.37 -0.379 C 2.409 -0.261 2.431 -0.137 2.431 -0.008 C 2.431 0.191 2.378 0.374 2.273 0.539 C 2.168 0.703 2.011 0.823 1.799 0.901 C 1.812 0.984 1.836 1.104 1.872 1.258 C 1.906 1.414 1.931 1.538 1.948 1.629 C 1.965 1.721 1.972 1.809 1.972 1.895 C 1.972 2.029 1.94 2.147 1.875 2.252 C 1.809 2.357 1.721 2.439 1.609 2.496 C 1.499 2.554 1.377 2.583 1.245 2.583 C 1.059 2.583 0.896 2.53 0.757 2.427 C 0.619 2.322 0.544 2.181 0.537 2.002 C 0.542 1.922 0.561 1.848 0.595 1.776 C 0.629 1.705 0.674 1.648 0.734 1.604 C 0.791 1.558 0.861 1.534 0.94 1.529 C 1.006 1.529 1.069 1.548 1.128 1.583 C 1.186 1.621 1.233 1.67 1.269 1.732 C 1.303 1.795 1.321 1.865 1.321 1.939 C 1.321 2.039 1.288 2.124 1.22 2.193 C 1.152 2.262 1.066 2.298 0.962 2.298 L 0.923 2.298 C 0.989 2.4 1.098 2.452 1.249 2.452 C 1.325 2.452 1.403 2.435 1.481 2.405 C 1.56 2.373 1.626 2.33 1.682 2.276 C 1.738 2.222 1.775 2.164 1.79 2.103 C 1.819 2.034 1.833 1.937 1.833 1.817 C 1.833 1.736 1.824 1.655 1.809 1.573 C 1.794 1.494 1.77 1.387 1.738 1.255 C 1.706 1.124 1.682 1.023 1.669 0.953 C 1.567 0.979 1.462 0.992 1.352 0.992 C 1.167 0.992 0.993 0.955 0.829 0.879 C 0.664 0.803 0.52 0.698 0.395 0.562 C 0.271 0.427 0.175 0.274 0.105 0.102 C 0.038 -0.069 0.002 -0.249 0 -0.435 C 0.007 -0.608 0.039 -0.774 0.1 -0.93 C 0.161 -1.087 0.239 -1.236 0.336 -1.375 C 0.432 -1.514 0.532 -1.641 0.636 -1.754 C 0.741 -1.866 0.878 -2.01 1.05 -2.185 Z" }));
    return g;
  }

  function bassClef(x, fLineY) {
    const g = svgEl("g", {
      class: "fa-clef fa-bass",
      transform: "translate(" + x + " " + fLineY + ") scale(" + SPACE + ")"
    });
    g.appendChild(svgEl("path", { class: "fa-clef-path", d: "M 0 2.163 C 0.268 1.981 0.468 1.844 0.596 1.749 C 0.725 1.656 0.861 1.539 0.999 1.401 C 1.138 1.262 1.255 1.104 1.35 0.93 C 1.424 0.801 1.489 0.652 1.541 0.483 C 1.594 0.315 1.621 0.152 1.626 -0.002 C 1.626 -0.146 1.607 -0.283 1.568 -0.412 C 1.531 -0.542 1.467 -0.649 1.375 -0.735 C 1.284 -0.82 1.165 -0.862 1.018 -0.862 C 0.876 -0.862 0.742 -0.833 0.617 -0.777 C 0.493 -0.72 0.405 -0.628 0.356 -0.5 C 0.356 -0.488 0.349 -0.472 0.339 -0.45 C 0.342 -0.423 0.356 -0.403 0.381 -0.388 C 0.407 -0.373 0.429 -0.366 0.449 -0.366 C 0.459 -0.366 0.488 -0.371 0.532 -0.381 C 0.578 -0.391 0.615 -0.398 0.645 -0.398 C 0.735 -0.398 0.815 -0.366 0.888 -0.303 C 0.959 -0.24 0.994 -0.164 0.994 -0.075 C 0.994 -0.01 0.976 0.051 0.94 0.107 C 0.905 0.163 0.855 0.208 0.793 0.24 C 0.73 0.274 0.661 0.29 0.586 0.29 C 0.451 0.29 0.336 0.249 0.241 0.166 C 0.148 0.081 0.1 -0.025 0.1 -0.159 C 0.1 -0.33 0.153 -0.478 0.256 -0.603 C 0.361 -0.728 0.493 -0.821 0.656 -0.884 C 0.816 -0.948 0.979 -0.979 1.145 -0.979 C 1.326 -0.979 1.499 -0.933 1.66 -0.84 C 1.822 -0.749 1.949 -0.622 2.044 -0.464 C 2.139 -0.305 2.188 -0.135 2.188 0.047 C 2.188 0.373 2.08 0.674 1.863 0.953 C 1.646 1.233 1.379 1.475 1.059 1.682 C 0.845 1.822 0.5 2.012 0.024 2.251 L 0 2.163 Z M 2.352 -0.457 C 2.352 -0.518 2.374 -0.569 2.419 -0.61 C 2.461 -0.652 2.513 -0.672 2.576 -0.672 C 2.63 -0.672 2.681 -0.649 2.727 -0.603 C 2.772 -0.559 2.794 -0.506 2.794 -0.449 C 2.794 -0.388 2.771 -0.335 2.727 -0.293 C 2.679 -0.252 2.627 -0.232 2.568 -0.232 C 2.505 -0.232 2.454 -0.252 2.413 -0.298 C 2.373 -0.342 2.352 -0.395 2.352 -0.457 Z M 2.352 0.43 C 2.352 0.369 2.374 0.317 2.415 0.276 C 2.457 0.234 2.51 0.213 2.576 0.213 C 2.63 0.213 2.679 0.235 2.727 0.281 C 2.771 0.327 2.794 0.376 2.794 0.43 C 2.794 0.496 2.772 0.549 2.73 0.591 C 2.686 0.633 2.635 0.655 2.576 0.655 C 2.51 0.655 2.457 0.633 2.415 0.593 C 2.374 0.552 2.352 0.498 2.352 0.43 Z" }));
    return g;
  }

  function drawNotation() {
    if (!scrollG) return;
    scrollG.innerHTML = "";
    const bpb = beatsPerBar();
    const pickup = pickupBeats();
    const total = totalBeats();
    const barAcc = new Map();

    // Beat ticks + barlines + numbers
    for (let i = 0; i <= total; i++) {
      const x = xOfBeat(i);
      const isBar = i === 0 || (i >= pickup && (i - pickup) % bpb === 0);
      if (isBar) {
        scrollG.appendChild(svgEl("line", {
          class: "fa-barline",
          x1: x,
          y1: TREBLE_TOP,
          x2: x,
          y2: BASS_BOTTOM
        }));
        const barNum = i <= pickup ? (i === 0 ? "起拍" : "") : String(Math.floor((i - pickup) / bpb) + 1);
        if (barNum) {
          scrollG.appendChild(svgEl("text", {
            class: "fa-bar-num",
            x: x + 3,
            y: TREBLE_TOP - 15
          }, barNum));
        }
      } else {
        scrollG.appendChild(svgEl("line", {
          class: "fa-beatline",
          x1: x,
          y1: TREBLE_TOP,
          x2: x,
          y2: BASS_BOTTOM
        }));
      }
    }
    // Final double bar
    const endX = xOfBeat(total);
    scrollG.appendChild(svgEl("line", {
      class: "fa-barline thick",
      x1: endX + 3,
      y1: TREBLE_TOP,
      x2: endX + 3,
      y2: BASS_BOTTOM
    }));

    const prog = progression();
    let t = 0;
    let lastSection = null;
    prog.forEach((ev) => {
      if (ev.section && ev.section !== lastSection) {
        lastSection = ev.section;
        scrollG.appendChild(svgEl("text", {
          class: "fa-section-flag",
          x: xOfBeat(t) + 3,
          y: TREBLE_TOP - 4
        }, ev.section));
      }
      const intro = isIntroBeat(t + 0.001);
      if (ev.chord && !intro) {
        const sym = svgEl("text", {
          class: "fa-chord-sym",
          x: xOfBeat(t) + 16,
          y: TREBLE_TOP - 15,
          "data-start": String(t),
          "data-end": String(t + ev.beats)
        }, pretty(ev.chord));
        scrollG.appendChild(sym);

        const voicing = MusicTheory.chordVoicingFromSymbol(ev.chord, VOICE_OPTS);
        if (voicing.length) {
          const g = svgEl("g", {
            class: "fa-cnotes",
            "data-start": String(t),
            "data-end": String(t + ev.beats)
          });
          const cx = xOfBeat(t) + Math.min(10, pxPerBeat * 0.22);
          const style = durStyle(ev.beats);
          const midY = (BASS_TOP + BASS_BOTTOM) / 2;
          const placed = voicing.map((v) => ({ v, y: yBass(v.name) }));
          placed.forEach((p) => {
            addLedgers(g, cx, ledgerLines(p.y, BASS_TOP, BASS_BOTTOM));
            const acc = neededAccidental(p.v.name, t, barAcc);
            if (acc) {
              g.appendChild(svgEl("text", {
                class: "fa-acc",
                x: cx - 14,
                y: p.y + 3.2
              }, accGlyph(acc)));
            }
            g.appendChild(drawHead(cx, p.y, style.open));
          });
          if (style.stem && placed.length) {
            const ys = placed.map((p) => p.y);
            const up = (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2 > midY;
            const y1 = up ? Math.max.apply(null, ys) : Math.min.apply(null, ys);
            const extreme = up ? Math.min.apply(null, ys) : Math.max.apply(null, ys);
            const len = Math.abs(extreme - y1) + SPACE * 2.4;
            g.appendChild(drawStem(cx, y1, up, len));
          }
          scrollG.appendChild(g);
        }
      }
      t += ev.beats;
    });

    // Melody always on the treble staff (ledger lines for low notes).
    const melAcc = new Map();
    melodyNotes().forEach((n) => {
      const g = svgEl("g", {
        class: "fa-mnote",
        "data-start": String(n.start),
        "data-end": String(n.start + n.dur),
        "data-midi": String(n.midi)
      });
      const cx = xOfBeat(n.start) + Math.min(9, pxPerBeat * 0.2);
      const cy = yTreble(n.name);
      const style = durStyle(n.dur);
      const midY = (TREBLE_TOP + TREBLE_BOTTOM) / 2;
      addLedgers(g, cx, ledgerLines(cy, TREBLE_TOP, TREBLE_BOTTOM));
      const acc = neededAccidental(n.name, n.start, melAcc);
      if (acc) {
        g.appendChild(svgEl("text", { class: "fa-acc", x: cx - 14, y: cy + 3.2 }, accGlyph(acc)));
      }
      g.appendChild(drawHead(cx, cy, style.open));
      const up = stemUpFor(cy, midY);
      if (style.stem) g.appendChild(drawStem(cx, cy, up));
      if (style.flags) g.appendChild(drawFlags(cx, cy, up, style.flags));
      if (isDotted(n.dur)) g.appendChild(drawDot(cx, cy));
      scrollG.appendChild(g);
    });

    drawLyricsUnderStaff();
  }

  function drawLyricsUnderStaff() {
    const y = BASS_BOTTOM + LYRIC_Y_OFFSET;
    const total = totalBeats();
    const lines = lyricsList();
    let i = 0;
    while (i < total) {
      if (isIntroBeat(i + 0.001)) {
        const info = eventAtBeat(i);
        const label = (info && info.ev && info.ev.section) ? info.ev.section : "前奏";
        const start = i;
        while (i < total && isIntroBeat(i + 0.001)) i++;
        scrollG.appendChild(svgEl("text", {
          class: "fa-under-lyric intro",
          x: xOfBeat(start) + 4,
          y: y,
          "data-start": String(start),
          "data-end": String(i)
        }, label));
      } else {
        i++;
      }
    }
    lines.forEach((line, idx) => {
      if (isIntroBeat(line.startBeat + 0.001)) return;
      const start = line.startBeat;
      const end = (idx + 1 < lines.length) ? lines[idx + 1].startBeat : total;
      const text = line.text ? line.text : "……";
      scrollG.appendChild(svgEl("text", {
        class: "fa-under-lyric" + (line.text ? "" : " empty"),
        x: xOfBeat(start) + 3,
        y: y,
        "data-start": String(start),
        "data-end": String(end)
      }, text));
    });
  }

  function updateStaff() {
    if (!svg || !scrollG || !playheadEl) return;
    const beat = currentBeatFloat();
    const sx = scrollXFor(beat);
    scrollG.setAttribute("transform", "translate(" + (GUTTER - sx) + " 0)");
    const x = GUTTER + beat * pxPerBeat - sx;
    playheadEl.setAttribute("x1", String(x));
    playheadEl.setAttribute("x2", String(x));

    const hitLo = beat - 0.12;
    const hitHi = beat + 0.18;
    staffEl.querySelectorAll(".fa-mnote, .fa-cnotes, .fa-chord-sym, .fa-under-lyric").forEach((node) => {
      const s = Number(node.dataset.start);
      const e = Number(node.dataset.end);
      node.classList.toggle("current", s <= beat && beat < e);
      node.classList.toggle("hit-window", s <= hitHi && s >= hitLo);
      node.classList.toggle("passed", e <= beat);
    });
  }

  function cancelGuideAudio() {
    if (global.PianoAudio && typeof PianoAudio.cancelGuide === "function") {
      PianoAudio.cancelGuide();
    }
  }

  function audioTimeOfBeat(beat) {
    return anchorAudioTime + (beat - anchorBeat) * secondsPerBeat();
  }

  function chordEvents() {
    const out = [];
    let t = 0;
    progression().forEach((ev) => {
      out.push({
        start: t,
        dur: ev.beats,
        chord: ev.chord || "",
        intro: isIntroBeat(t + 0.001)
      });
      t += ev.beats;
    });
    return out;
  }

  function scheduleGuideAudio() {
    cancelGuideAudio();
    if (state !== "playing" || !guideOn) return;
    if (!global.PianoAudio || typeof PianoAudio.scheduleGuide !== "function") return;
    const fromBeat = currentBeatFloat();
    const spb = secondsPerBeat();
    const eps = 1e-4;

    if (!muteMelody) {
      melodyNotes().forEach((n) => {
        const end = n.start + n.dur;
        if (end <= fromBeat + eps) return;
        const start = Math.max(n.start, fromBeat);
        const durSec = (end - start) * spb;
        if (durSec <= 0.02) return;
        PianoAudio.scheduleGuide(n.midi, audioTimeOfBeat(start), durSec, { velocity: 104, gain: 1 });
      });
    }

    if (!muteChord) {
      chordEvents().forEach((ev) => {
        if (ev.intro || !ev.chord) return;
        const end = ev.start + ev.dur;
        if (end <= fromBeat + eps) return;
        const start = Math.max(ev.start, fromBeat);
        const durSec = (end - start) * spb;
        if (durSec <= 0.03) return;
        const voicing = MusicTheory.chordVoicingFromSymbol(ev.chord, VOICE_OPTS) || [];
        const t = audioTimeOfBeat(start);
        voicing.forEach((v) => {
          PianoAudio.scheduleGuide(v.midi, t, durSec, { velocity: 78, gain: 0.52 });
        });
      });
    }
  }

  function clientXOf(e) {
    if (e.touches && e.touches.length) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function beatFromPointer(e, track) {
    const rect = track.getBoundingClientRect();
    if (!rect.width) return 0;
    const pct = Math.max(0, Math.min(1, (clientXOf(e) - rect.left) / rect.width));
    return pct * totalBeats();
  }

  function seekTo(beat) {
    const total = totalBeats();
    const pos = Math.max(0, Math.min(total, beat));
    if (pos >= total) {
      finished = true;
      beatIndex = total;
    } else {
      finished = false;
      beatIndex = pos;
    }
    cancelGuideAudio();
    highlightCurrent();
    render();
  }

  function beginScrub(e, track) {
    e.preventDefault();
    resumeAfterScrub = state === "playing";
    if (state === "playing") {
      runId += 1;
      clearTimer();
      stopClock();
      cancelGuideAudio();
      const pos = currentBeatFloat();
      state = "paused";
      beatIndex = pos;
    }
    scrubbing = true;
    try { track.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
    seekTo(beatFromPointer(e, track));
  }

  function moveScrub(e, track) {
    if (!scrubbing) return;
    e.preventDefault();
    seekTo(beatFromPointer(e, track));
  }

  function endScrub() {
    if (!scrubbing) return;
    scrubbing = false;
    const shouldResume = resumeAfterScrub && beatIndex < totalBeats();
    resumeAfterScrub = false;
    if (shouldResume) playSong();
    else render();
  }

  function bindTimeline() {
    const track = $("fa-timeline-track");
    if (!track || track.dataset.bound) return;
    track.dataset.bound = "1";
    track.setAttribute("role", "slider");
    track.setAttribute("tabindex", "0");
    track.setAttribute("aria-label", "播放進度");
    track.addEventListener("pointerdown", (e) => beginScrub(e, track));
    track.addEventListener("pointermove", (e) => moveScrub(e, track));
    track.addEventListener("pointerup", endScrub);
    track.addEventListener("pointercancel", endScrub);
    track.addEventListener("keydown", (e) => {
      const total = totalBeats();
      let next = currentBeatFloat();
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next -= e.shiftKey ? 0.25 : 1;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next += e.shiftKey ? 0.25 : 1;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = total;
      else return;
      e.preventDefault();
      const wasPlaying = state === "playing";
      if (wasPlaying) {
        runId += 1;
        clearTimer();
        stopClock();
        cancelGuideAudio();
        state = "paused";
      }
      seekTo(next);
      if (wasPlaying && beatIndex < total) playSong();
    });
  }

  function syncHighlightToggles() {
    if (!global.PianoUI || !PianoUI.setHighlightVisibility) return;
    const mel = $("fa-hl-melody");
    const ch = $("fa-hl-chord");
    PianoUI.setHighlightVisibility({
      melody: !mel || !!mel.checked,
      chord: !ch || !!ch.checked
    });
    highlightCurrent();
  }

  function bindMoreButton() {
    const btn = $("fa-more");
    const panel = $("fa-more-panel");
    if (!btn || !panel || btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      moreOpen = !moreOpen;
      panel.classList.toggle("open", moreOpen);
      btn.setAttribute("aria-expanded", moreOpen ? "true" : "false");
    });
  }

  function bindGuideControls() {
    const guide = $("fa-guide");
    const muteMel = $("fa-mute-melody");
    const muteCh = $("fa-mute-chord");
    const hlMel = $("fa-hl-melody");
    const hlCh = $("fa-hl-chord");
    if (guide && !guide.dataset.bound) {
      guide.dataset.bound = "1";
      guide.checked = guideOn;
      guide.addEventListener("change", (e) => {
        guideOn = !!e.target.checked;
        if (state === "playing") scheduleGuideAudio();
        else cancelGuideAudio();
      });
    }
    function bindMute(el, setter) {
      if (!el || el.dataset.bound) return;
      el.dataset.bound = "1";
      el.addEventListener("change", (e) => {
        setter(!!e.target.checked);
        if (state === "playing") scheduleGuideAudio();
      });
    }
    bindMute(muteMel, (v) => { muteMelody = v; });
    bindMute(muteCh, (v) => { muteChord = v; });
    if (hlMel && !hlMel.dataset.bound) {
      hlMel.dataset.bound = "1";
      hlMel.addEventListener("change", syncHighlightToggles);
    }
    if (hlCh && !hlCh.dataset.bound) {
      hlCh.dataset.bound = "1";
      hlCh.addEventListener("change", syncHighlightToggles);
    }
  }

  function bind() {
    const play = $("fa-play");
    const pause = $("fa-pause");
    const stop = $("fa-stop");
    const level = $("fa-level");
    const bpmEl = $("fa-bpm");
    const metro = $("fa-metro");
    const bars = $("fa-bars");
    if (play) play.addEventListener("click", playSong);
    if (pause) pause.addEventListener("click", pauseSong);
    if (stop) stop.addEventListener("click", () => stopSong({}));
    if (level) {
      level.innerHTML = "";
      song.levels.forEach((lv) => {
        const opt = document.createElement("option");
        opt.value = String(lv.id);
        opt.textContent = lv.name;
        if (lv.id === levelId) opt.selected = true;
        level.appendChild(opt);
      });
      level.addEventListener("change", (e) => setLevel(Number(e.target.value)));
    }
    if (bpmEl) {
      bpmEl.min = String(MIN_BPM);
      bpmEl.max = String(MAX_BPM);
      bpmEl.value = String(bpm);
      bpmEl.addEventListener("input", (e) => setBpm(Number(e.target.value), { fromSlider: true }));
    }
    if (metro) {
      metro.checked = metronomeOn;
      metro.addEventListener("change", (e) => { metronomeOn = !!e.target.checked; });
    }
    if (bars) {
      bars.value = String(visibleBars);
      bars.addEventListener("change", (e) => setVisibleBars(Number(e.target.value)));
    }
    bindGuideControls();
    bindMoreButton();
    bindTimeline();
    syncHighlightToggles();
    window.addEventListener("resize", onResize);
    if (typeof ResizeObserver === "function" && staffEl) {
      resizeObs = new ResizeObserver(() => onResize());
      resizeObs.observe(staffEl);
    }
  }

  function onResize() {
    if (!staffEl || !active && !staffEl.clientWidth) {
      updateStaff();
      return;
    }
    const width = viewWidth();
    const key = levelId + ":" + visibleBars + ":" + Math.round(width);
    if (key !== builtKey) buildStaff();
    else updateStaff();
  }

  function setVisibleBars(n) {
    const next = clampBars(n);
    if (next === visibleBars) return;
    visibleBars = next;
    const bars = $("fa-bars");
    if (bars) bars.value = String(visibleBars);
    buildStaff();
    render();
  }

  function updateTimeline() {
    const total = totalBeats();
    const beat = currentBeatFloat();
    const spb = secondsPerBeat();
    const elapsed = beat * spb;
    const dur = total * spb;
    const pct = total ? (beat / total) * 100 : 0;
    const fill = $("fa-timeline-fill");
    const head = $("fa-timeline-playhead");
    const track = $("fa-timeline-track");
    const timeNow = $("fa-time-now");
    const timeTotal = $("fa-time-total");
    if (fill) fill.style.width = pct + "%";
    if (head) head.style.left = pct + "%";
    if (track) {
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(Math.round(dur)));
      track.setAttribute("aria-valuenow", String(Math.round(elapsed)));
    }
    if (timeNow) timeNow.textContent = formatTime(elapsed);
    if (timeTotal) timeTotal.textContent = formatTime(dur);

    const lyricCur = $("fa-lyric-current");
    const lyricNext = $("fa-lyric-next");
    const lines = lyricsList();
    if (lyricCur && lyricNext) {
      if (!lines.length) {
        lyricCur.textContent = "";
        lyricCur.classList.add("empty");
        lyricCur.classList.remove("intro");
        lyricNext.textContent = "";
      } else {
        const found = lyricAtBeat(beat);
        if (found.intro) {
          const info = eventAtBeat(beat);
          const label = (info && info.ev.section) ? info.ev.section : "前奏";
          lyricCur.classList.add("empty", "intro");
          lyricCur.textContent = label;
          const nextText = found.next && found.next.text ? found.next.text : (found.next ? "……" : "");
          lyricNext.textContent = nextText;
        } else {
          const curText = found.cur && found.cur.text ? found.cur.text : "";
          const nextText = found.next && found.next.text ? found.next.text : "";
          if (curText) {
            lyricCur.classList.remove("empty", "intro");
            lyricCur.textContent = curText;
          } else {
            lyricCur.classList.add("empty");
            lyricCur.classList.remove("intro");
            lyricCur.textContent = found.cur ? "……" : "";
          }
          lyricNext.textContent = nextText || (found.next ? "……" : "");
        }
      }
    }
  }

  function startClock() {
    stopClock();
    const tick = () => {
      updateTimeline();
      updateStaff();
      highlightCurrent();
      if (state === "playing") rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function stopClock() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function render() {
    const total = totalBeats();
    const cap = Math.min(Math.floor(currentBeatFloat()), Math.max(0, total - 1));
    const info = eventAtBeat(cap);
    const bpb = beatsPerBar();
    const pickup = pickupBeats();
    const statusEl = $("fa-status");
    const bpmVal = $("fa-bpm-val");
    const titleEl = $("fa-staff-title");
    const beatsEl = $("fa-beats");

    if (titleEl) {
      const lv = currentLevel();
      titleEl.textContent = (song.title || "") + (lv ? " · " + lv.name : "");
    }

    const beat = currentBeatFloat();
    const mel = melodyAtBeat(beat);
    const abs = cap;
    const afterPickup = Math.max(0, abs - pickup);
    const bar = abs < pickup ? "起拍" : ("第 " + (Math.floor(afterPickup / bpb) + 1) + " 小節");
    const beatInBar = abs < pickup ? (abs + 1) : ((afterPickup % bpb) + 1);
    const section = info && info.ev.section ? info.ev.section : "";
    const noteBit = mel ? (" · " + prettyNote(mel.name)) : "";
    if (beatsEl) {
      const beatBit = abs < pickup ? "" : (" · 拍 " + beatInBar + "/" + bpb);
      beatsEl.textContent = [section, bar].filter(Boolean).join(" · ") + beatBit + noteBit;
    }

    if (statusEl) {
      if (scrubbing) statusEl.textContent = "";
      else if (finished) statusEl.textContent = "完成！再撳播放可以由頭再練習。";
      else if (state === "playing") statusEl.textContent = "";
      else if (state === "paused") statusEl.textContent = "已暫停";
      else statusEl.textContent = "";
    }

    const playBtn = $("fa-play");
    const pauseBtn = $("fa-pause");
    const stopBtn = $("fa-stop");
    const playing = state === "playing";
    if (playBtn) playBtn.disabled = playing;
    if (pauseBtn) pauseBtn.disabled = !playing;
    if (stopBtn) stopBtn.disabled = state === "stopped" && !finished;
    const stage = document.querySelector(".practice-stage");
    if (stage) stage.classList.toggle("is-playing", playing);
    const guide = $("fa-guide");
    if (guide) guide.checked = guideOn;
    const muteMel = $("fa-mute-melody");
    if (muteMel) muteMel.checked = muteMelody;
    const muteCh = $("fa-mute-chord");
    if (muteCh) muteCh.checked = muteChord;
    if (bpmVal) bpmVal.textContent = String(bpm);
    const bpmEl = $("fa-bpm");
    if (bpmEl && !bpmEl.matches(":active")) bpmEl.value = String(bpm);
    const levelEl = $("fa-level");
    if (levelEl) levelEl.value = String(levelId);
    const metro = $("fa-metro");
    if (metro) metro.checked = metronomeOn;
    const bars = $("fa-bars");
    if (bars) bars.value = String(visibleBars);
    updateTimeline();
    updateStaff();
  }

  function fireBeat(index) {
    if (index >= totalBeats()) {
      stopSong({ finished: true });
      return;
    }
    beatIndex = index;
    highlightCurrent();
    render();
  }

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function schedulerTick(myRun) {
    if (myRun !== runId || state !== "playing") return;
    const ctxNow = PianoAudio.now();
    const total = totalBeats();
    while (nextBeatTime < ctxNow + SCHEDULE_AHEAD) {
      const idx = scheduledBeatIndex;
      if (idx >= total) {
        const delay = Math.max(0, (nextBeatTime - ctxNow) * 1000);
        setTimeout(() => {
          if (myRun !== runId || state !== "playing") return;
          stopSong({ finished: true });
        }, delay);
        return;
      }
      const pickup = pickupBeats();
      const accent = idx >= pickup && (idx - pickup) % beatsPerBar() === 0;
      if (metronomeOn) PianoAudio.click(nextBeatTime, accent);
      const beatTime = nextBeatTime;
      const thisIdx = idx;
      const delay = Math.max(0, (beatTime - ctxNow) * 1000);
      setTimeout(() => {
        if (myRun !== runId || state !== "playing") return;
        fireBeat(thisIdx);
      }, delay);
      nextBeatTime += secondsPerBeat();
      scheduledBeatIndex++;
    }
    timerId = setTimeout(() => schedulerTick(myRun), LOOKAHEAD_MS);
  }

  function playSong() {
    if (!song) return;
    PianoAudio.ensure();
    if (state === "playing") return;
    if (finished || beatIndex >= totalBeats()) {
      finished = false;
      beatIndex = 0;
    }
    state = "playing";
    finished = false;
    runId += 1;
    const myRun = runId;
    clearTimer();
    const startDelay = 0.06;
    anchorBeat = beatIndex;
    anchorAudioTime = PianoAudio.now() + startDelay;
    const frac = beatIndex - Math.floor(beatIndex);
    if (frac < 1e-6) {
      scheduledBeatIndex = Math.round(beatIndex);
      nextBeatTime = anchorAudioTime;
    } else {
      scheduledBeatIndex = Math.ceil(beatIndex);
      nextBeatTime = anchorAudioTime + (scheduledBeatIndex - beatIndex) * secondsPerBeat();
    }
    highlightCurrent();
    render();
    startClock();
    schedulerTick(myRun);
    scheduleGuideAudio();
  }

  function pauseSong() {
    if (state !== "playing") return;
    const pos = currentBeatFloat();
    runId += 1;
    clearTimer();
    stopClock();
    cancelGuideAudio();
    state = "paused";
    beatIndex = pos;
    render();
  }

  function stopSong(opts) {
    opts = opts || {};
    runId += 1;
    clearTimer();
    stopClock();
    cancelGuideAudio();
    state = "stopped";
    if (opts.finished) {
      finished = true;
      beatIndex = Math.max(0, totalBeats());
    } else {
      finished = false;
      beatIndex = 0;
    }
    if (active) highlightCurrent();
    render();
  }

  function setLevel(id) {
    const lv = song.levels.find((l) => l.id === id);
    if (!lv) return;
    levelId = lv.id;
    stopSong({});
    buildStaff();
    highlightCurrent();
    render();
  }

  function setBpm(value, flags) {
    const next = clampBpm(value);
    if (next === bpm) {
      if (!flags || !flags.fromSlider) render();
      else {
        const bpmVal = $("fa-bpm-val");
        if (bpmVal) bpmVal.textContent = String(bpm);
      }
      return;
    }
    if (state === "playing") {
      const pos = currentBeatFloat();
      bpm = next;
      const bpmVal = $("fa-bpm-val");
      if (bpmVal) bpmVal.textContent = String(bpm);
      runId += 1;
      const myRun = runId;
      clearTimer();
      anchorBeat = pos;
      anchorAudioTime = PianoAudio.now();
      const nextIdx = Math.ceil(pos + 0.0001);
      scheduledBeatIndex = nextIdx;
      nextBeatTime = anchorAudioTime + (nextIdx - pos) * secondsPerBeat();
      schedulerTick(myRun);
      scheduleGuideAudio();
      updateTimeline();
      updateStaff();
      return;
    }
    bpm = next;
    const bpmVal = $("fa-bpm-val");
    if (bpmVal) bpmVal.textContent = String(bpm);
    updateTimeline();
  }

  function activate() {
    active = true;
    const width = viewWidth();
    const key = levelId + ":" + visibleBars + ":" + Math.round(width);
    if (builtKey !== key) buildStaff();
    highlightCurrent();
    render();
  }

  function deactivate() {
    active = false;
    if (state === "playing" || state === "paused") {
      stopSong({ keepScore: true });
    }
  }

  function defaultLevelId(songData) {
    if (songData.levels.some((l) => l.id === 3)) return 3;
    return songData.levels[songData.levels.length - 1].id;
  }

  function mount(container, songData) {
    staffEl = container;
    song = songData;
    levelId = defaultLevelId(song);
    bpm = clampBpm(song.defaultBpm || 68);
    metronomeOn = true;
    visibleBars = DEFAULT_BARS;
    state = "stopped";
    finished = false;
    beatIndex = 0;
    guideOn = true;
    muteMelody = false;
    muteChord = false;
    bind();
    buildStaff();
    render();
  }

  global.FollowAlong = {
    mount,
    activate,
    deactivate,
    play: playSong,
    pause: pauseSong,
    stop: () => stopSong({}),
    setVisibleBars
  };
})(window);
