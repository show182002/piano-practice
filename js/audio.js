/* Salamander Grand Piano samples via Web Audio, with oscillator fallback. */
(function (global) {
  const SAMPLE_DIR = "audio/salamander/";
  const A0 = 21;
  const C8 = 108;
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const REVERB_STORAGE = "piano-practice-reverb";
  const REVERB_DEFAULT = 40;

  const roots = [];
  for (let m = A0; m <= C8; m += 3) roots.push(m);

  let ctx = null;
  let master = null;
  let voiceBus = null;
  let dryGain = null;
  let wetGain = null;
  const live = new Map();
  const guide = new Map();
  let guideSeq = 0;

  const buffers = new Map();
  let loadState = "idle"; // idle | loading | ready | error
  let loadError = null;
  const statusListeners = new Set();
  let loadedCount = 0;

  let reverbPct = loadSavedReverb();

  function loadSavedReverb() {
    try {
      const raw = localStorage.getItem(REVERB_STORAGE);
      if (raw == null || raw === "") return REVERB_DEFAULT;
      const n = Number(raw);
      if (!Number.isFinite(n)) return REVERB_DEFAULT;
      return Math.max(0, Math.min(100, n));
    } catch (_) {
      return REVERB_DEFAULT;
    }
  }

  function persistReverb() {
    try { localStorage.setItem(REVERB_STORAGE, String(reverbPct)); }
    catch (_) { /* private mode */ }
  }

  function sampleFile(midi) {
    // Use "s" for sharps (Ds, Fs). Netlify rejects "#" in deployed filenames.
    const name = NOTE_NAMES[((midi % 12) + 12) % 12].replace("#", "s");
    const oct = Math.floor(midi / 12) - 1;
    return name + oct + "v1.ogg";
  }

  function sampleUrl(midi) {
    return SAMPLE_DIR + encodeURIComponent(sampleFile(midi));
  }

  function nearestRoot(midi, requireBuffer) {
    let best = roots[0];
    let bestD = Math.abs(midi - best);
    for (let i = 0; i < roots.length; i++) {
      const r = roots[i];
      if (requireBuffer && !buffers.has(r)) continue;
      const d = Math.abs(midi - r);
      if (d < bestD) {
        best = r;
        bestD = d;
      }
    }
    if (requireBuffer && !buffers.has(best)) return null;
    return best;
  }

  function emitStatus() {
    const info = getStatus();
    for (const fn of statusListeners) {
      try { fn(info); } catch (_) { /* listener error */ }
    }
  }

  function getStatus() {
    return {
      state: loadState,
      loaded: loadedCount,
      total: roots.length,
      error: loadError,
      ready: loadState === "ready" && buffers.size > 0
    };
  }

  function onStatus(fn) {
    if (typeof fn !== "function") return function () {};
    statusListeners.add(fn);
    try { fn(getStatus()); } catch (_) { /* ignore */ }
    return function () { statusListeners.delete(fn); };
  }

  function makeImpulse(seconds, power) {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const ir = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const data = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const early = t < 0.05 ? 0.55 + (t / 0.05) * 0.45 : 1;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, power) * early;
      }
    }
    return ir;
  }

  function setupGraph() {
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);

    voiceBus = ctx.createGain();
    voiceBus.gain.value = 1;

    dryGain = ctx.createGain();
    wetGain = ctx.createGain();

    const preDelay = ctx.createDelay(0.08);
    preDelay.delayTime.value = 0.016;
    const wetFilter = ctx.createBiquadFilter();
    wetFilter.type = "lowpass";
    wetFilter.frequency.value = 5600;
    wetFilter.Q.value = 0.65;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(1.8, 2.7);
    const wetOut = ctx.createGain();
    wetOut.gain.value = 1.35;

    voiceBus.connect(dryGain);
    dryGain.connect(master);

    voiceBus.connect(wetGain);
    wetGain.connect(preDelay);
    preDelay.connect(wetFilter);
    wetFilter.connect(convolver);
    convolver.connect(wetOut);
    wetOut.connect(master);

    applyReverbMix();
  }

  function applyReverbMix() {
    if (!dryGain || !wetGain) return;
    const w = reverbPct / 100;
    dryGain.gain.value = 1 - 0.28 * w;
    wetGain.gain.value = 0.55 * w;
  }

  /* Slider 0 (乾) … 100 (濕). Default 40 is a moderate demo-site hall:
     audible space, clearly drier than the raw 12 s Salamander tail. */
  function envelopeTimes() {
    const w = reverbPct / 100;
    return {
      hold: 0.85 + w * 3.4,
      tail: 0.7 + w * 2.2,
      release: 0.18 + w * 1.05
    };
  }

  function setReverb(pct) {
    const n = Number(pct);
    reverbPct = Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : REVERB_DEFAULT;
    persistReverb();
    if (ctx) {
      ensure();
      applyReverbMix();
    }
    return reverbPct;
  }

  function getReverb() {
    return reverbPct;
  }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      setupGraph();
      startSampleLoad();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function now() {
    return ensure().currentTime;
  }

  function midiToHz(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function setVolume(pct) {
    ensure();
    master.gain.value = Math.max(0, Math.min(1, pct / 100));
  }

  function startSampleLoad() {
    if (loadState === "loading" || loadState === "ready") return;
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        setupGraph();
      } catch (err) {
        loadState = "error";
        loadError = err && err.message ? err.message : String(err);
        emitStatus();
        return;
      }
    }
    loadState = "loading";
    loadError = null;
    loadedCount = 0;
    emitStatus();

    const jobs = roots.map((midi) =>
      fetch(sampleUrl(midi))
        .then((res) => {
          if (!res.ok) throw new Error("HTTP " + res.status + " for " + sampleFile(midi));
          return res.arrayBuffer();
        })
        .then((ab) => ctx.decodeAudioData(ab.slice(0)))
        .then((buf) => {
          buffers.set(midi, buf);
          loadedCount += 1;
          if (loadedCount === roots.length || loadedCount % 6 === 0) emitStatus();
        })
    );

    Promise.all(jobs)
      .then(() => {
        loadState = buffers.size ? "ready" : "error";
        if (!buffers.size) loadError = "no samples decoded";
        emitStatus();
      })
      .catch((err) => {
        loadState = buffers.size ? "ready" : "error";
        loadError = err && err.message ? err.message : String(err);
        emitStatus();
      });
  }

  function startOscVoice(midi, t, velocity, gainScale) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToHz(midi), t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800 + (midi - 60) * 20, t);
    filter.Q.value = 0.7;

    const v = Math.max(0.05, Math.min(1, (velocity == null ? 90 : velocity) / 127));
    const g = gainScale == null ? 1 : gainScale;
    const peak = Math.max(0.0002, 0.28 * v * g);
    const sus = Math.max(0.0002, 0.18 * v * g);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(sus, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(voiceBus);
    osc.start(t);

    return { kind: "osc", osc, gain, filter, peak: sus };
  }

  function startSampleVoice(midi, t, velocity, gainScale) {
    const root = nearestRoot(midi, true);
    const buf = root != null ? buffers.get(root) : null;
    if (!buf) return startOscVoice(midi, t, velocity, gainScale);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const cents = (midi - root) * 100;
    if (src.detune) {
      src.detune.setValueAtTime(cents, t);
    } else {
      src.playbackRate.setValueAtTime(Math.pow(2, (midi - root) / 12), t);
    }

    const gain = ctx.createGain();
    const v = Math.max(0.05, Math.min(1, (velocity == null ? 90 : velocity) / 127));
    const g = gainScale == null ? 1 : gainScale;
    const peak = Math.max(0.0002, 0.55 * v * g);
    const env = envelopeTimes();

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    gain.gain.setValueAtTime(peak, t + env.hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + env.hold + env.tail);

    src.connect(gain);
    gain.connect(voiceBus);
    src.start(t);
    try { src.stop(t + env.hold + env.tail + 0.05); } catch (_) { /* ignore */ }

    return { kind: "sample", src, gain, peak };
  }

  function startVoice(midi, t, velocity, gainScale) {
    if (buffers.size) return startSampleVoice(midi, t, velocity, gainScale);
    return startOscVoice(midi, t, velocity, gainScale);
  }

  function stopNode(voice, when) {
    try {
      if (voice.src) voice.src.stop(when);
      if (voice.osc) voice.osc.stop(when);
    } catch (_) { /* already stopped */ }
  }

  function currentGain(voice) {
    try { return Math.max(0.0001, voice.gain.gain.value); }
    catch (_) { return 0.0001; }
  }

  function stopVoice(voice, immediate, atTime) {
    if (!voice || !ctx) return;
    const t = atTime != null ? atTime : ctx.currentTime;
    const env = envelopeTimes();
    try {
      if (immediate) {
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(currentGain(voice), t);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
        stopNode(voice, t + 0.03);
      } else {
        const rel = env.release;
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(currentGain(voice), t);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + rel);
        stopNode(voice, t + rel + 0.04);
      }
    } catch (_) { /* already stopped */ }
  }

  function noteOn(midi, velocity) {
    ensure();
    noteOff(midi, true);
    const t = ctx.currentTime;
    live.set(midi, startVoice(midi, t, velocity, 1));
  }

  function noteOff(midi, immediate) {
    const voice = live.get(midi);
    if (!voice) return;
    live.delete(midi);
    stopVoice(voice, immediate);
  }

  function allOff() {
    for (const midi of [...live.keys()]) noteOff(midi, true);
  }

  /**
   * Schedule a guide/demo tone at AudioContext time.
   * Kept in a separate voice map from live user/MIDI notes.
   * `duration` is seconds of sounding time before release.
   */
  function scheduleGuide(midi, startTime, duration, opts) {
    ensure();
    opts = opts || {};
    const t0 = ctx.currentTime;
    const start = startTime == null ? t0 : startTime;
    const dur = Math.max(0.03, Number(duration) || 0.03);
    const end = start + dur;
    if (end <= t0 + 0.015) return null;
    const t = Math.max(start, t0);
    const voice = startVoice(midi, t, opts.velocity, opts.gain);
    const env = envelopeTimes();
    const rel = Math.max(t + 0.08, end);
    try {
      const sus = voice.peak || 0.18;
      voice.gain.gain.cancelScheduledValues(rel);
      voice.gain.gain.setValueAtTime(Math.max(0.0001, sus), rel);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, rel + env.release);
      stopNode(voice, rel + env.release + 0.04);
    } catch (_) { /* ignore */ }
    const id = ++guideSeq;
    guide.set(id, voice);
    const holdMs = Math.max(50, (rel + env.release + 0.08 - t0) * 1000);
    setTimeout(() => { guide.delete(id); }, holdMs + 80);
    return id;
  }

  function cancelGuide() {
    if (!guide.size) return;
    const t = ctx ? ctx.currentTime : 0;
    for (const voice of guide.values()) stopVoice(voice, true, t);
    guide.clear();
  }

  /** Metronome click. `time` is AudioContext time; accent = downbeat. */
  function click(time, accent) {
    ensure();
    const t = time == null ? ctx.currentTime : time;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(accent ? 1400 : 900, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(accent ? 0.16 : 0.1, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (accent ? 0.07 : 0.05));
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Kick off sample fetch/decode as soon as the page loads (context may stay suspended).
  try { startSampleLoad(); } catch (_) { /* ignore */ }

  global.PianoAudio = {
    ensure,
    now,
    noteOn,
    noteOff,
    allOff,
    setVolume,
    setReverb,
    getReverb,
    click,
    scheduleGuide,
    cancelGuide,
    loadSamples: startSampleLoad,
    onStatus,
    getStatus,
    isSampleReady: function () { return loadState === "ready" && buffers.size > 0; }
  };
})(window);
