/* Simple piano-ish tone via Web Audio (no external samples). */
(function (global) {
  let ctx = null;
  let master = null;
  const live = new Map(); // midi -> { osc, gain, filter }
  const guide = new Map(); // id -> { osc, gain, filter }
  let guideSeq = 0;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
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

  function startVoice(midi, t, velocity, gainScale) {
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
    gain.connect(master);
    osc.start(t);

    return { osc, gain, filter, sus: sus };
  }

  function stopVoice(voice, immediate, atTime) {
    if (!voice || !ctx) return;
    const t = atTime != null ? atTime : ctx.currentTime;
    try {
      if (immediate) {
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(0.0001, t);
        voice.osc.stop(t + 0.01);
      } else {
        const cur = (function () {
          try { return Math.max(0.0001, voice.gain.gain.value); }
          catch (_) { return 0.0001; }
        })();
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(cur, t);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        voice.osc.stop(t + 0.28);
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
    const rel = Math.max(t + 0.14, end);
    try {
      const sus = voice.sus || 0.18;
      voice.gain.gain.setValueAtTime(sus, rel);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, rel + 0.18);
      voice.osc.stop(rel + 0.22);
    } catch (_) { /* ignore */ }
    const id = ++guideSeq;
    guide.set(id, voice);
    const holdMs = Math.max(50, (rel + 0.25 - t0) * 1000);
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

  global.PianoAudio = {
    ensure,
    now,
    noteOn,
    noteOff,
    allOff,
    setVolume,
    click,
    scheduleGuide,
    cancelGuide
  };
})(window);
