(function (global) {
  let access = null;
  let onNote = null; // (midi, velocity, down) => void
  const inputs = [];

  function setHandler(fn) {
    onNote = fn;
  }

  function statusText() {
    if (!access) return { text: "MIDI：未連接", cls: "" };
    const names = inputs.map((i) => i.name || "MIDI device").filter(Boolean);
    if (!names.length) return { text: "MIDI：已開，等 keyboard…", cls: "warn" };
    return { text: "MIDI：" + names.join("、"), cls: "ok" };
  }

  function wireInput(input) {
    input.onmidimessage = (ev) => {
      const [status, data1, data2] = ev.data;
      const cmd = status & 0xf0;
      if (cmd === 0x90) {
        // note on (velocity 0 = note off)
        if (data2 > 0) onNote && onNote(data1, data2, true);
        else onNote && onNote(data1, 0, false);
      } else if (cmd === 0x80) {
        onNote && onNote(data1, 0, false);
      }
    };
  }

  function refreshInputs() {
    inputs.length = 0;
    if (!access) return;
    for (const input of access.inputs.values()) {
      inputs.push(input);
      wireInput(input);
    }
  }

  async function connect() {
    if (!navigator.requestMIDIAccess) {
      throw new Error("呢個瀏覽器唔支援 Web MIDI（建議用 Chrome / Edge）");
    }
    access = await navigator.requestMIDIAccess({ sysex: false });
    refreshInputs();
    access.onstatechange = () => refreshInputs();
    return statusText();
  }

  global.PianoMidi = { connect, setHandler, statusText, refreshInputs };
})(window);
