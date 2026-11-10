/* Simple piano-ish tone via Web Audio (no external samples). */
(function (global) {
  let ctx = null;
  let master = null;
  const active = new Map(); // midi -> { osc, gain, stopAt }

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

  function noteOn(midi, velocity) {
    ensure();
    noteOff(midi, true);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Soft triangle + filter → less harsh than raw square/saw
    osc.type = "triangle";
    osc.frequency.setValueAtTime(midiToHz(midi), t);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1800 + (midi - 60) * 20, t);
    filter.Q.value = 0.7;

    const v = Math.max(0.05, Math.min(1, (velocity == null ? 90 : velocity) / 127));
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.18 * v, t + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t);

    active.set(midi, { osc, gain, filter });
  }

  function noteOff(midi, immediate) {
    const voice = active.get(midi);
    if (!voice) return;
    active.delete(midi);
    const t = ctx ? ctx.currentTime : 0;
    try {
      if (immediate) {
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(0.0001, t);
        voice.osc.stop(t + 0.01);
      } else {
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.setValueAtTime(Math.max(0.0001, voice.gain.gain.value), t);
        voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        voice.osc.stop(t + 0.28);
      }
    } catch (_) { /* already stopped */ }
  }

  function allOff() {
    for (const midi of [...active.keys()]) noteOff(midi, true);
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

  global.PianoAudio = { ensure, now, noteOn, noteOff, allOff, setVolume, click };
})(window);
