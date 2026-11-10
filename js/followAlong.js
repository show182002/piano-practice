/* Follow-along practice: BPM timeline, lyrics, chord chart, metronome, simple scoring. */
(function (global) {
  const POINTS_HIT = 10;
  const DEDUPE_MS = 280;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD = 0.12;
  const MIN_BPM = 40;
  const MAX_BPM = 120;

  let rootEl = null;
  let song = null;
  let levelId = 1;
  let bpm = 76;
  let metronomeOn = true;
  let state = "stopped"; // stopped | playing | paused
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

  function totalBeats() {
    return progression().reduce((s, ev) => s + ev.beats, 0);
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
    if (!Number.isFinite(n)) return song.defaultBpm || 76;
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

  function highlightCurrent() {
    if (!global.PianoUI) return;
    const cap = Math.min(Math.floor(currentBeatFloat()), Math.max(0, totalBeats() - 1));
    const info = eventAtBeat(cap);
    if (!info) {
      PianoUI.clearHighlight();
      return;
    }
    const pcs = MusicTheory.chordPcsFromSymbol(info.ev.chord);
    PianoUI.setHighlightPcs(pcs);
  }

  function $(id) {
    return rootEl.querySelector("#" + id);
  }

  function buildShell() {
    rootEl.innerHTML = "";
    rootEl.classList.add("fa-root");

    const header = el("div", "fa-header");
    const titles = el("div");
    const h2 = el("h2", "fa-title", "《" + song.title + "》");
    h2.appendChild(document.createTextNode(" "));
    h2.appendChild(el("span", "fa-artist", song.artist));
    titles.appendChild(h2);
    titles.appendChild(el("p", "fa-disclaimer", song.disclaimer + " · " + song.key + " 大調"));
    header.appendChild(titles);
    const scoreBox = el("div", "fa-score-box");
    scoreBox.appendChild(el("span", "k", "分數"));
    const scoreVal = el("span", "v", "0");
    scoreVal.id = "fa-score";
    scoreBox.appendChild(scoreVal);
    header.appendChild(scoreBox);
    rootEl.appendChild(header);

    const nowBox = el("div", "fa-now");
    nowBox.appendChild(el("div", "fa-now-label", "而家彈"));
    const chordEl = el("div", "fa-now-chord", "—");
    chordEl.id = "fa-now-chord";
    chordEl.setAttribute("aria-live", "polite");
    nowBox.appendChild(chordEl);
    const meta = el("div", "fa-now-meta");
    const sectionEl = el("span");
    sectionEl.id = "fa-section";
    const beatsEl = el("span");
    beatsEl.id = "fa-beats";
    const nextEl = el("span");
    nextEl.id = "fa-next";
    const dots = el("span", "fa-beat-dots");
    dots.id = "fa-beat-dots";
    meta.appendChild(sectionEl);
    meta.appendChild(beatsEl);
    meta.appendChild(nextEl);
    meta.appendChild(dots);
    nowBox.appendChild(meta);
    rootEl.appendChild(nowBox);

    const lyricBox = el("div", "fa-lyrics");
    const lyricCur = el("div", "fa-lyric-current", "");
    lyricCur.id = "fa-lyric-current";
    lyricCur.setAttribute("aria-live", "polite");
    const lyricNext = el("div", "fa-lyric-next", "");
    lyricNext.id = "fa-lyric-next";
    lyricBox.appendChild(lyricCur);
    lyricBox.appendChild(lyricNext);
    rootEl.appendChild(lyricBox);

    const tl = el("div", "fa-timeline");
    const timeNow = el("span", "fa-time", "0:00");
    timeNow.id = "fa-time-now";
    const track = el("div", "fa-timeline-track");
    track.id = "fa-timeline-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", "播放進度");
    const fill = el("div", "fa-timeline-fill");
    fill.id = "fa-timeline-fill";
    const head = el("div", "fa-timeline-playhead");
    head.id = "fa-timeline-playhead";
    track.appendChild(fill);
    track.appendChild(head);
    const timeTotal = el("span", "fa-time", "0:00");
    timeTotal.id = "fa-time-total";
    tl.appendChild(timeNow);
    tl.appendChild(track);
    tl.appendChild(timeTotal);
    rootEl.appendChild(tl);

    const controls = el("div", "fa-controls");
    const btnPlay = el("button", "btn primary", "播放");
    btnPlay.type = "button";
    btnPlay.id = "fa-play";
    const btnPause = el("button", "btn", "暫停");
    btnPause.type = "button";
    btnPause.id = "fa-pause";
    const btnStop = el("button", "btn", "停止");
    btnStop.type = "button";
    btnStop.id = "fa-stop";
    controls.appendChild(btnPlay);
    controls.appendChild(btnPause);
    controls.appendChild(btnStop);

    const levelLab = el("label", "", "Level");
    const levelSel = document.createElement("select");
    levelSel.id = "fa-level";
    song.levels.forEach((lv) => {
      const opt = document.createElement("option");
      opt.value = String(lv.id);
      opt.textContent = lv.name;
      if (lv.id === levelId) opt.selected = true;
      levelSel.appendChild(opt);
    });
    levelLab.appendChild(levelSel);
    controls.appendChild(levelLab);

    const bpmLab = el("label", "", "速度 BPM");
    const bpmRange = document.createElement("input");
    bpmRange.type = "range";
    bpmRange.id = "fa-bpm";
    bpmRange.min = String(MIN_BPM);
    bpmRange.max = String(MAX_BPM);
    bpmRange.value = String(bpm);
    const bpmVal = el("span", "", String(bpm));
    bpmVal.id = "fa-bpm-val";
    bpmLab.appendChild(bpmRange);
    bpmLab.appendChild(bpmVal);
    controls.appendChild(bpmLab);

    const metroLab = el("label");
    const metro = document.createElement("input");
    metro.type = "checkbox";
    metro.id = "fa-metro";
    metro.checked = metronomeOn;
    metroLab.appendChild(metro);
    metroLab.appendChild(document.createTextNode("拍子機"));
    controls.appendChild(metroLab);
    rootEl.appendChild(controls);

    const levelSub = el("p", "fa-level-sub", "");
    levelSub.id = "fa-level-sub";
    rootEl.appendChild(levelSub);

    const status = el("p", "fa-status", "");
    status.id = "fa-status";
    rootEl.appendChild(status);

    const chart = el("div", "fa-chart");
    chart.id = "fa-chart";
    rootEl.appendChild(chart);

    rootEl.appendChild(el("p", "fa-hint", "跟住高亮和弦，喺下面鍵盤或 MIDI 彈出和弦入面嘅音就可以得分。建議先撳「開聲」，練習可以將 BPM 調慢。"));
  }

  function bind() {
    $("fa-play").addEventListener("click", play);
    $("fa-pause").addEventListener("click", pause);
    $("fa-stop").addEventListener("click", () => stop({}));
    $("fa-level").addEventListener("change", (e) => {
      setLevel(Number(e.target.value));
    });
    $("fa-bpm").addEventListener("input", (e) => {
      setBpm(Number(e.target.value), { fromSlider: true });
    });
    $("fa-metro").addEventListener("change", (e) => {
      metronomeOn = !!e.target.checked;
    });
  }

  function rebuildChart() {
    const chart = $("fa-chart");
    chart.innerHTML = "";
    const prog = progression();
    const bpb = beatsPerBar();
    let barInRow = 0;
    let row = null;
    let lastSection = null;

    function ensureRow() {
      if (!row || barInRow >= 4) {
        row = el("div", "fa-bars");
        chart.appendChild(row);
        barInRow = 0;
      }
      return row;
    }

    prog.forEach((ev, idx) => {
      if (ev.section && ev.section !== lastSection) {
        lastSection = ev.section;
        chart.appendChild(el("div", "fa-section-label", ev.section));
        row = null;
        barInRow = 0;
      }
      const span = Math.max(1, Math.round(ev.beats / bpb));
      if (barInRow + span > 4) {
        row = null;
        barInRow = 0;
      }
      ensureRow();
      const cell = el("div", "fa-cell", ev.chord);
      cell.dataset.index = String(idx);
      cell.dataset.span = String(span);
      if (span > 1) cell.style.gridColumn = "span " + span;
      row.appendChild(cell);
      barInRow += span;
    });
  }

  function updateTimeline() {
    if (!rootEl) return;
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
    if (!lyricCur || !lyricNext) return;
    if (!lines.length) {
      lyricCur.textContent = "";
      lyricCur.classList.add("empty");
      lyricNext.textContent = "呢個 Level 暫時未有歌詞";
      return;
    }
    lyricCur.classList.remove("empty");
    const found = lyricAtBeat(beat);
    lyricCur.textContent = found.cur && found.cur.text ? found.cur.text : "";
    lyricNext.textContent = found.next && found.next.text ? found.next.text : "";
  }

  function startClock() {
    stopClock();
    const tick = () => {
      updateTimeline();
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
    if (!rootEl) return;
    const total = totalBeats();
    const cap = Math.min(Math.floor(currentBeatFloat()), Math.max(0, total - 1));
    const info = eventAtBeat(cap);
    const prog = progression();
    const bpb = beatsPerBar();

    const chordEl = $("fa-now-chord");
    const sectionEl = $("fa-section");
    const beatsEl = $("fa-beats");
    const nextEl = $("fa-next");
    const statusEl = $("fa-status");
    const scoreEl = $("fa-score");
    const levelSub = $("fa-level-sub");

    scoreEl.textContent = String(score);
    levelSub.textContent = currentLevel().subtitle || "";

    if (info) {
      chordEl.textContent = info.ev.chord;
      chordEl.classList.toggle("finished", finished);
      sectionEl.textContent = info.ev.section || ("小節 " + (Math.floor(cap / bpb) + 1));
      beatsEl.textContent = "拍 " + ((cap % bpb) + 1) + " / " + bpb + " · 第 " + (Math.floor(cap / bpb) + 1) + " / " + (total / bpb) + " 小節";
      const next = prog[info.index + 1];
      nextEl.textContent = next ? ("下一粒：" + next.chord) : (finished ? "已完" : "最後一粒");
    } else {
      chordEl.textContent = "—";
      sectionEl.textContent = "";
      beatsEl.textContent = "";
      nextEl.textContent = "";
    }

    const dots = $("fa-beat-dots");
    dots.innerHTML = "";
    for (let i = 0; i < bpb; i++) {
      const d = el("span", "fa-dot");
      if (i === 0) d.classList.add("accent");
      if ((cap % bpb) === i) d.classList.add("on");
      dots.appendChild(d);
    }

    if (finished) statusEl.textContent = "完成！分數：" + score + "。再撳「播放」可以由頭再練習。";
    else if (state === "playing") statusEl.textContent = "進行中…";
    else if (state === "paused") statusEl.textContent = "已暫停";
    else statusEl.textContent = "";

    $("fa-play").disabled = state === "playing";
    $("fa-pause").disabled = state !== "playing";

    const idx = info ? info.index : -1;
    rootEl.querySelectorAll(".fa-cell").forEach((cell) => {
      const i = Number(cell.dataset.index);
      cell.classList.toggle("current", i === idx);
      cell.classList.toggle("done", i < idx);
    });

    $("fa-bpm-val").textContent = String(bpm);
    if (!$("fa-bpm").matches(":active")) $("fa-bpm").value = String(bpm);
    $("fa-level").value = String(levelId);
    $("fa-metro").checked = metronomeOn;
    updateTimeline();
  }

  function fireBeat(index) {
    if (index >= totalBeats()) {
      stop({ finished: true });
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
          stop({ finished: true });
        }, delay);
        return;
      }
      const accent = idx % beatsPerBar() === 0;
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

  function play() {
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

  function pause() {
    if (state !== "playing") return;
    const pos = currentBeatFloat();
    runId += 1;
    clearTimer();
    stopClock();
    state = "paused";
    beatIndex = pos;
    render();
    updateTimeline();
  }

  function stop(opts) {
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
    updateTimeline();
  }

  function setLevel(id) {
    const lv = song.levels.find((l) => l.id === id);
    if (!lv) return;
    levelId = lv.id;
    stop({});
    rebuildChart();
    highlightCurrent();
    render();
  }

  function setBpm(value, flags) {
    const next = clampBpm(value);
    if (next === bpm) {
      if (!flags || !flags.fromSlider) render();
      else $("fa-bpm-val").textContent = String(bpm);
      return;
    }
    if (state === "playing") {
      const pos = currentBeatFloat();
      bpm = next;
      $("fa-bpm-val").textContent = String(bpm);
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
      return;
    }
    bpm = next;
    $("fa-bpm-val").textContent = String(bpm);
    updateTimeline();
  }

  function onNote(ev) {
    if (!active || !ev.down || state !== "playing") return;
    const info = eventAtBeat(Math.floor(currentBeatFloat()));
    if (!info) return;
    const pcs = MusicTheory.chordPcsFromSymbol(info.ev.chord);
    if (pcs.indexOf(ev.pc) < 0) return;
    const t = performance.now();
    const prev = lastScoreAt.get(ev.pc) || 0;
    if (t - prev < DEDUPE_MS) return;
    lastScoreAt.set(ev.pc, t);
    score += POINTS_HIT;
    const box = rootEl.querySelector(".fa-score-box");
    const scoreEl = $("fa-score");
    scoreEl.textContent = String(score);
    if (box) {
      box.classList.add("flash");
      clearTimeout(scoreFlashTimer);
      scoreFlashTimer = setTimeout(() => box.classList.remove("flash"), 180);
    }
  }

  function activate() {
    active = true;
    highlightCurrent();
    render();
  }

  function deactivate() {
    active = false;
    if (state === "playing" || state === "paused") {
      stop({ keepScore: true });
    }
  }

  function mount(container, songData) {
    rootEl = container;
    song = songData;
    levelId = song.levels[0].id;
    bpm = clampBpm(song.defaultBpm || 76);
    metronomeOn = true;
    state = "stopped";
    finished = false;
    score = 0;
    beatIndex = 0;
    buildShell();
    bind();
    rebuildChart();
    render();
    if (!unsubscribe && global.PianoUI && typeof PianoUI.subscribeNotes === "function") {
      unsubscribe = PianoUI.subscribeNotes(onNote);
    }
  }

  global.FollowAlong = {
    mount,
    activate,
    deactivate,
    play,
    pause,
    stop: () => stop({})
  };
})(window);
