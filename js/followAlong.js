/* Follow-along practice: BPM clock, karaoke slot, scrolling note highway, scoring. */
(function (global) {
  const POINTS_HIT = 10;
  const DEDUPE_MS = 280;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;
  const MIN_BPM = 40;
  const MAX_BPM = 120;
  const PX_PER_BEAT = 88;
  const NOW_PAD = 28;
  const STAFF_MIDIS = [64, 67, 71, 74, 77]; // E4 G4 B4 D5 F5 treble lines

  let rootEl = null;
  let highwayEl = null;
  let song = null;
  let levelId = 3;
  let bpm = 68;
  let metronomeOn = true;
  let state = "stopped";
  let finished = false;
  let score = 0;
  let active = false;
  let beatIndex = 0;
  let runId = 0;
  let timerId = null;
  let rafId = null;
  let nextBeatTime = 0;
  let scheduledBeatIndex = 0;
  let anchorAudioTime = 0;
  let anchorBeat = 0;
  let unsubscribe = null;
  const lastScoreAt = new Map();
  let scoreFlashTimer = 0;
  let builtForLevel = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
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
    return { cur, next };
  }

  function clampBpm(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return song.defaultBpm || 68;
    return Math.max(MIN_BPM, Math.min(MAX_BPM, Math.round(n)));
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

  function highlightCurrent() {
    if (!global.PianoUI) return;
    const beat = currentBeatFloat();
    const cap = Math.min(Math.floor(beat), Math.max(0, totalBeats() - 1));
    const info = eventAtBeat(cap);
    const mel = melodyAtBeat(beat);
    const pcs = info && info.ev.chord ? MusicTheory.chordPcsFromSymbol(info.ev.chord) : [];
    if (PianoUI.setHighlights) {
      PianoUI.setHighlights({
        chordPcs: pcs,
        melodyMidi: mel ? mel.midi : null
      });
    } else {
      PianoUI.setHighlightPcs(pcs);
    }
  }

  function $(id) {
    return document.getElementById(id);
  }

  function pretty(sym) {
    return global.MusicTheory && MusicTheory.prettyChord ? MusicTheory.prettyChord(sym) : (sym || "—");
  }

  function midiToYStaff(midi) {
    // Map midi to a vertical staff position later used as X in the vertical-staff highway.
    // Treble bottom line E4=64; each diatonic step is one half-space.
    // Use a simple chromatic-to-pixel map instead, centered on the treble staff.
    return midi;
  }

  function staffXFromMidi(midi, width) {
    const minM = 53; // F3, a bit below G3
    const maxM = 81; // A5, a bit above G5
    const t = (midi - minM) / (maxM - minM);
    const pad = 88;
    return pad + Math.max(0, Math.min(1, t)) * (width - pad - 28);
  }

  function buildHighway() {
    if (!highwayEl) return;
    highwayEl.innerHTML = "";
    highwayEl.classList.add("fa-highway");
    const total = totalBeats();
    const height = Math.max(total * PX_PER_BEAT + 200, 400);
    highwayEl.style.height = height + "px";

    const staff = el("div", "fa-staff");
    staff.style.height = height + "px";
    // Five treble lines as vertical lines (score rotated: time goes down, pitch across)
    STAFF_MIDIS.forEach((midi) => {
      const line = el("div", "fa-staff-line");
      line.dataset.midi = String(midi);
      staff.appendChild(line);
    });
    highwayEl.appendChild(staff);

    const bpb = beatsPerBar();
    const pickup = pickupBeats();

    // Beat / bar grid
    for (let i = 0; i <= total; i++) {
      const y = i * PX_PER_BEAT;
      const isBar = i === 0 || (i >= pickup && (i - pickup) % bpb === 0);
      const row = el("div", "fa-grid-line" + (isBar ? " bar" : " beat"));
      row.style.top = y + "px";
      if (isBar) {
        const barNum = i <= pickup ? (i === 0 ? "Pickup" : "") : String(Math.floor((i - pickup) / bpb) + 1);
        if (barNum) {
          const lab = el("span", "fa-bar-num", barNum === "Pickup" ? "起拍" : barNum);
          row.appendChild(lab);
        }
      }
      highwayEl.appendChild(row);
    }

    // Section labels + chord signs
    const prog = progression();
    let t = 0;
    let lastSection = null;
    prog.forEach((ev) => {
      if (ev.section && ev.section !== lastSection) {
        lastSection = ev.section;
        const sec = el("div", "fa-section-flag", ev.section);
        sec.style.top = t * PX_PER_BEAT + "px";
        highwayEl.appendChild(sec);
      }
      if (ev.chord) {
        const ch = el("div", "fa-chord-flag", pretty(ev.chord));
        ch.style.top = t * PX_PER_BEAT + "px";
        ch.style.height = Math.max(ev.beats * PX_PER_BEAT - 4, 22) + "px";
        ch.dataset.start = String(t);
        ch.dataset.end = String(t + ev.beats);
        highwayEl.appendChild(ch);
      }
      t += ev.beats;
    });

    // Melody notes
    melodyNotes().forEach((n) => {
      const note = el("div", "fa-note");
      note.style.top = n.start * PX_PER_BEAT + "px";
      note.style.height = Math.max(n.dur * PX_PER_BEAT - 2, 14) + "px";
      note.dataset.midi = String(n.midi);
      note.dataset.start = String(n.start);
      note.dataset.end = String(n.start + n.dur);
      const head = el("div", "fa-note-head" + (n.dur >= 2 ? " open" : ""));
      const name = el("span", "fa-note-name", n.name.replace("#", "♯").replace("b", "♭"));
      head.appendChild(name);
      note.appendChild(head);
      if (n.dur >= 0.5) {
        const body = el("div", "fa-note-body");
        note.appendChild(body);
      }
      highwayEl.appendChild(note);
    });

    positionPitchColumns();
    builtForLevel = levelId;
  }

  function positionPitchColumns() {
    if (!highwayEl) return;
    const width = highwayEl.clientWidth || highwayEl.parentElement && highwayEl.parentElement.clientWidth || 800;
    highwayEl.querySelectorAll(".fa-staff-line").forEach((line) => {
      const midi = Number(line.dataset.midi);
      line.style.left = staffXFromMidi(midi, width) + "px";
    });
    highwayEl.querySelectorAll(".fa-note").forEach((note) => {
      const midi = Number(note.dataset.midi);
      const x = staffXFromMidi(midi, width);
      note.style.left = x + "px";
    });
  }

  function bind() {
    const play = $("fa-play");
    const pause = $("fa-pause");
    const stop = $("fa-stop");
    const level = $("fa-level");
    const bpmEl = $("fa-bpm");
    const metro = $("fa-metro");
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
    window.addEventListener("resize", () => {
      positionPitchColumns();
      updateHighway();
    });
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
        lyricNext.textContent = "呢個 Level 暫時未有歌詞時間軸";
      } else {
        const found = lyricAtBeat(beat);
        const curText = found.cur && found.cur.text ? found.cur.text : "";
        const nextText = found.next && found.next.text ? found.next.text : "";
        if (curText) {
          lyricCur.classList.remove("empty");
          lyricCur.textContent = curText;
        } else {
          lyricCur.classList.add("empty");
          lyricCur.textContent = found.cur ? "……" : "";
        }
        lyricNext.textContent = nextText || (found.next ? "……" : "");
      }
    }
  }

  function updateHighway() {
    if (!highwayEl) return;
    const beat = currentBeatFloat();
    const y = NOW_PAD - beat * PX_PER_BEAT;
    highwayEl.style.transform = "translateY(" + y + "px)";
    const hitLo = beat - 0.12;
    const hitHi = beat + 0.18;
    highwayEl.querySelectorAll(".fa-note").forEach((note) => {
      const s = Number(note.dataset.start);
      const e = Number(note.dataset.end);
      note.classList.toggle("current", s <= beat && beat < e);
      note.classList.toggle("hit-window", s <= hitHi && s >= hitLo);
      note.classList.toggle("passed", e <= beat);
    });
    highwayEl.querySelectorAll(".fa-chord-flag").forEach((ch) => {
      const s = Number(ch.dataset.start);
      const e = Number(ch.dataset.end);
      ch.classList.toggle("current", s <= beat && beat < e);
      ch.classList.toggle("passed", e <= beat);
    });
  }

  function startClock() {
    stopClock();
    const tick = () => {
      updateTimeline();
      updateHighway();
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
    const prog = progression();
    const bpb = beatsPerBar();
    const pickup = pickupBeats();

    const chordEl = $("fa-now-chord");
    const sectionEl = $("fa-section");
    const beatsEl = $("fa-beats");
    const nextEl = $("fa-next");
    const statusEl = $("fa-status");
    const scoreEl = $("fa-score");
    const levelSub = $("fa-level-sub");
    const bpmVal = $("fa-bpm-val");

    if (scoreEl) scoreEl.textContent = String(score);
    if (levelSub) levelSub.textContent = currentLevel().subtitle || "";

    const beat = currentBeatFloat();
    const mel = melodyAtBeat(beat);

    if (info && chordEl) {
      chordEl.textContent = info.ev.chord ? pretty(info.ev.chord) : "—";
      chordEl.classList.toggle("finished", finished);
      const abs = cap;
      const afterPickup = Math.max(0, abs - pickup);
      const bar = abs < pickup ? "起拍" : ("第 " + (Math.floor(afterPickup / bpb) + 1) + " 小節");
      if (sectionEl) sectionEl.textContent = info.ev.section || bar;
      if (beatsEl) {
        const beatInBar = abs < pickup ? (abs + 1) : ((afterPickup % bpb) + 1);
        beatsEl.textContent = (abs < pickup ? "起拍" : ("拍 " + beatInBar + " / " + bpb)) +
          (mel ? (" · " + mel.name.replace("#", "♯").replace("b", "♭")) : "");
      }
      const next = prog[info.index + 1];
      if (nextEl) {
        const nextChord = next && next.chord ? pretty(next.chord) : "";
        nextEl.textContent = nextChord ? ("下一粒：" + nextChord) : (finished ? "已完" : "");
      }
    } else if (chordEl) {
      chordEl.textContent = "—";
      if (sectionEl) sectionEl.textContent = "";
      if (beatsEl) beatsEl.textContent = "";
      if (nextEl) nextEl.textContent = "";
    }

    const dots = $("fa-beat-dots");
    if (dots) {
      dots.innerHTML = "";
      const afterPickup = Math.max(0, cap - pickup);
      const pos = cap < pickup ? 0 : (afterPickup % bpb);
      for (let i = 0; i < bpb; i++) {
        const d = el("span", "fa-dot");
        if (i === 0) d.classList.add("accent");
        if (pos === i && cap >= pickup) d.classList.add("on");
        dots.appendChild(d);
      }
    }

    if (statusEl) {
      if (finished) statusEl.textContent = "完成！分數：" + score + "。再撳「播放」可以由頭再練習。";
      else if (state === "playing") statusEl.textContent = "進行中…跟住而家線彈出高亮嘅音。";
      else if (state === "paused") statusEl.textContent = "已暫停";
      else statusEl.textContent = "";
    }

    const playBtn = $("fa-play");
    const pauseBtn = $("fa-pause");
    if (playBtn) playBtn.disabled = state === "playing";
    if (pauseBtn) pauseBtn.disabled = state !== "playing";
    if (bpmVal) bpmVal.textContent = String(bpm);
    const bpmEl = $("fa-bpm");
    if (bpmEl && !bpmEl.matches(":active")) bpmEl.value = String(bpm);
    const levelEl = $("fa-level");
    if (levelEl) levelEl.value = String(levelId);
    const metro = $("fa-metro");
    if (metro) metro.checked = metronomeOn;
    updateTimeline();
    updateHighway();
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
      score = 0;
      lastScoreAt.clear();
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
  }

  function pauseSong() {
    if (state !== "playing") return;
    const pos = currentBeatFloat();
    runId += 1;
    clearTimer();
    stopClock();
    state = "paused";
    beatIndex = pos;
    render();
  }

  function stopSong(opts) {
    opts = opts || {};
    runId += 1;
    clearTimer();
    stopClock();
    state = "stopped";
    if (opts.finished) {
      finished = true;
      beatIndex = Math.max(0, totalBeats());
    } else {
      finished = false;
      beatIndex = 0;
      if (!opts.keepScore) {
        score = 0;
        lastScoreAt.clear();
      }
    }
    if (active) highlightCurrent();
    render();
  }

  function setLevel(id) {
    const lv = song.levels.find((l) => l.id === id);
    if (!lv) return;
    levelId = lv.id;
    stopSong({});
    buildHighway();
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
      updateTimeline();
      updateHighway();
      return;
    }
    bpm = next;
    const bpmVal = $("fa-bpm-val");
    if (bpmVal) bpmVal.textContent = String(bpm);
    updateTimeline();
  }

  function onNote(ev) {
    if (!active || !ev.down || state !== "playing") return;
    const beat = currentBeatFloat();
    const info = eventAtBeat(Math.floor(beat));
    const mel = melodyAtBeat(beat);
    const pcs = info && info.ev.chord ? MusicTheory.chordPcsFromSymbol(info.ev.chord) : [];
    const isMelody = mel && ev.pc === (((mel.midi % 12) + 12) % 12);
    const isChord = pcs.indexOf(ev.pc) >= 0;
    if (!isMelody && !isChord) return;
    const t = performance.now();
    const prev = lastScoreAt.get(ev.pc) || 0;
    if (t - prev < DEDUPE_MS) return;
    lastScoreAt.set(ev.pc, t);
    score += POINTS_HIT;
    const scoreEl = $("fa-score");
    if (scoreEl) scoreEl.textContent = String(score);
    const box = document.querySelector(".fa-score-box");
    if (box) {
      box.classList.add("flash");
      clearTimeout(scoreFlashTimer);
      scoreFlashTimer = setTimeout(() => box.classList.remove("flash"), 180);
    }
  }

  function activate() {
    active = true;
    if (builtForLevel !== levelId) buildHighway();
    positionPitchColumns();
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
    rootEl = container;
    highwayEl = container;
    song = songData;
    levelId = defaultLevelId(song);
    bpm = clampBpm(song.defaultBpm || 68);
    metronomeOn = true;
    state = "stopped";
    finished = false;
    score = 0;
    beatIndex = 0;
    bind();
    buildHighway();
    render();
    if (!unsubscribe && global.PianoUI && typeof PianoUI.subscribeNotes === "function") {
      unsubscribe = PianoUI.subscribeNotes(onNote);
    }
  }

  global.FollowAlong = {
    mount,
    activate,
    deactivate,
    play: playSong,
    pause: pauseSong,
    stop: () => stopSong({})
  };
})(window);
