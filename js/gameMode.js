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
  const MIN_BAR_PX = 10;
  const VOICE_OPTS = { minMidi: 48, maxMidi: 67 };
  const STORAGE = {
    showMelody: "piano-practice-game-show-melody",
    showChord: "piano-practice-game-show-chord",
    soundMelody: "piano-practice-game-sound-melody",
    soundChord: "piano-practice-game-sound-chord",
    wait: "piano-practice-game-wait",
    bpm: "piano-practice-game-bpm"
  };

  const COLOR = {
    melody: { fill: "#ffd36a", stroke: "#ffe9a8", text: "#3a2a00", glow: "rgba(255, 211, 106, 0.45)" },
    melodyWrap: { fill: "#c48a14", stroke: "#e0b03a", text: "#fff6d6", glow: "rgba(196, 138, 20, 0.45)" },
    chord: { fill: "#3d8adf", stroke: "#7ad0ff", text: "#eaf6ff", glow: "rgba(61, 138, 223, 0.4)" },
    chordWrap: { fill: "#0f4fad", stroke: "#3d8adf", text: "#d6e8ff", glow: "rgba(15, 79, 173, 0.45)" },
    hit: { fill: "#8dffb4", stroke: "#d8ffe6", text: "#06210f" },
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
  let canvasCssW = 0;
  let canvasCssH = 0;

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

  function cancelGuideAudio() {
    if (global.PianoAudio && typeof PianoAudio.cancelGuide === "function") {
      PianoAudio.cancelGuide();
    }
    notes.forEach((n) => { n.guideOn = false; });
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
      PianoAudio.scheduleGuide(n.midi, audioTimeOfBeat(start), durSec, { velocity: vel, gain: gain });
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
    return midi === w.displaySounding || midi === w.baseMidi || midi === n.midi;
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
      if (n.status === "hit" && beat > n.start + n.dur) return;
      if (beat < n.start - 0.35 || beat > n.start + Math.max(0.2, n.dur)) return;
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
    const title = $("gm-title");
    if (title && song) title.textContent = (song.title || "") + " · 遊戲";
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
    const xScale = kbdW ? (cssW / kbdW) : 1;
    const map = new Map();
    (layout.keys || []).forEach((k) => {
      map.set(k.baseMidi, {
        x: k.x * xScale,
        w: k.w * xScale,
        cx: k.cx * xScale,
        black: k.black,
        baseMidi: k.baseMidi,
        soundingMidi: k.soundingMidi
      });
    });
    return { map: map, cssW: cssW, cssH: cssH, layout: layout };
  }

  function colorFor(n, wrap) {
    if (n.status === "hit") return COLOR.hit;
    if (n.status === "miss") return COLOR.miss;
    if (n.track === "melody") return wrap ? COLOR.melodyWrap : COLOR.melody;
    return wrap ? COLOR.chordWrap : COLOR.chord;
  }

  function syncCanvasSize() {
    const canvas = $("gm-lanes");
    const wrap = document.getElementById("gm-lanes-wrap");
    const kbd = global.PianoUI && PianoUI.getKeyboardEl ? PianoUI.getKeyboardEl() : null;
    if (!canvas || !wrap) return false;
    const kbdW = kbd ? kbd.offsetWidth : 0;
    if (kbdW && Math.abs(wrap.offsetWidth - kbdW) > 0.5) {
      wrap.style.width = kbdW + "px";
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

    const hitY = h - 10;
    const topY = 8;
    const travelPx = Math.max(80, hitY - topY);
    const pxPerBeat = travelPx / TRAVEL_BEATS;
    const beat = currentBeatFloat();

    ctx.fillStyle = "#0c1018";
    ctx.fillRect(0, 0, w, h);

    const keys = [...geo.map.values()].sort((a, b) => a.x - b.x);
    keys.forEach((k) => {
      if (k.black) return;
      ctx.fillStyle = "#141926";
      ctx.fillRect(k.x, 0, k.w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.moveTo(Math.round(k.x) + 0.5, 0);
      ctx.lineTo(Math.round(k.x) + 0.5, h);
      ctx.stroke();
    });
    keys.forEach((k) => {
      if (!k.black) return;
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(k.x, 0, k.w, h);
    });

    ctx.strokeStyle = "rgba(255, 77, 109, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(w, hitY);
    ctx.stroke();
    const grd = ctx.createLinearGradient(0, hitY - 16, 0, hitY);
    grd.addColorStop(0, "rgba(255, 77, 109, 0)");
    grd.addColorStop(1, "rgba(255, 77, 109, 0.22)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, hitY - 16, w, 16);

    const visible = notes.filter((n) => {
      if (!noteVisible(n)) return false;
      const endBeat = n.start + n.dur;
      if (n.status === "miss" && beat > n.start + 1.2) return false;
      if (n.status === "hit" && beat > endBeat + 0.6) return false;
      const yAttack = hitY - (n.start - beat) * pxPerBeat;
      const yRelease = hitY - (endBeat - beat) * pxPerBeat;
      return yAttack >= -8 && yRelease <= h + 24;
    });

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
      const y = yAttack - height;
      const inset = col.black ? 1 : 3;
      const x = col.x + inset;
      const bw = Math.max(6, col.w - inset * 2);
      const pal = colorFor(n, wr.wrap);
      const r = Math.min(6, bw / 2, height / 2);
      ctx.save();
      if (n.status === "pending" && Math.abs(beat - n.start) <= HIT_LATE) {
        ctx.shadowColor = pal.glow || pal.stroke;
        ctx.shadowBlur = 12;
      }
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, bw, height, r);
      else ctx.rect(x, y, bw, height);
      ctx.fillStyle = pal.fill;
      ctx.globalAlpha = n.status === "miss" ? 0.45 : (n.status === "hit" ? 0.85 : 1);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = pal.stroke;
      ctx.stroke();
      ctx.shadowBlur = 0;
      const label = wrapLabel(wr.wrap);
      if (label && height >= 16 && n.status === "pending") {
        ctx.fillStyle = pal.text;
        ctx.font = "600 9px \"Noto Sans TC\", \"PingFang HK\", system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(label, x + bw / 2, yAttack - 3);
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
    cancelGuideAudio();
    if (state === "playing" && !waiting) scheduleGuideAudio();
    syncToggles();
  }

  function setSoundChord(on) {
    soundChord = !!on;
    saveFlag(STORAGE.soundChord, soundChord);
    cancelGuideAudio();
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
    syncToggles();
    syncHud();
    syncTransport();
    updateTimeline();
    if (active) {
      highlightApproaching(0);
      drawLanes();
    }
  }

  function activate() {
    active = true;
    bind();
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
    syncToggles();
    syncHud();
    syncTransport();
    updateTimeline();
    requestAnimationFrame(() => {
      syncCanvasSize();
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
