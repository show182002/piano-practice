/* Music theory helpers: pitch classes, major scale, diatonic chords, chord symbols, voicings. */
(function (global) {
  const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const LETTER_STEPS = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  const MAJOR_KEYS = [
    { id: "C",  name: "C",  pc: 0,  accidental: "none",  sig: 0 },
    { id: "G",  name: "G",  pc: 7,  accidental: "sharp", sig: 1 },
    { id: "D",  name: "D",  pc: 2,  accidental: "sharp", sig: 2 },
    { id: "A",  name: "A",  pc: 9,  accidental: "sharp", sig: 3 },
    { id: "E",  name: "E",  pc: 4,  accidental: "sharp", sig: 4 },
    { id: "B",  name: "B",  pc: 11, accidental: "sharp", sig: 5 },
    { id: "F#", name: "F#", pc: 6,  accidental: "sharp", sig: 6 },
    { id: "Db", name: "Db", pc: 1,  accidental: "flat",  sig: -5 },
    { id: "Ab", name: "Ab", pc: 8,  accidental: "flat",  sig: -4 },
    { id: "Eb", name: "Eb", pc: 3,  accidental: "flat",  sig: -3 },
    { id: "Bb", name: "Bb", pc: 10, accidental: "flat",  sig: -2 },
    { id: "F",  name: "F",  pc: 5,  accidental: "flat",  sig: -1 }
  ];

  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
  const CHORD_QUAL = [
    { roman: "I",   quality: "maj",  intervals: [0, 4, 7] },
    { roman: "ii",  quality: "min",  intervals: [0, 3, 7] },
    { roman: "iii", quality: "min",  intervals: [0, 3, 7] },
    { roman: "IV",  quality: "maj",  intervals: [0, 4, 7] },
    { roman: "V",   quality: "maj",  intervals: [0, 4, 7] },
    { roman: "vi",  quality: "min",  intervals: [0, 3, 7] },
    { roman: "vii°", quality: "dim", intervals: [0, 3, 6] }
  ];

  const ROOT_PC = {
    C: 0, "C#": 1, "C♯": 1, Db: 1, "D♭": 1, D: 2, "D#": 3, "D♯": 3, Eb: 3, "E♭": 3, E: 4,
    F: 5, "F#": 6, "F♯": 6, Gb: 6, "G♭": 6, G: 7, "G#": 8, "G♯": 8, Ab: 8, "A♭": 8,
    A: 9, "A#": 10, "A♯": 10, Bb: 10, "B♭": 10, B: 11
  };

  const QUALITY_INTERVALS = {
    "": [0, 4, 7],
    maj: [0, 4, 7],
    M: [0, 4, 7],
    m: [0, 3, 7],
    min: [0, 3, 7],
    mi: [0, 3, 7],
    dim: [0, 3, 6],
    "°": [0, 3, 6],
    aug: [0, 4, 8],
    "+": [0, 4, 8],
    "7": [0, 4, 7, 10],
    maj7: [0, 4, 7, 11],
    M7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    min7: [0, 3, 7, 10],
    "6": [0, 4, 7, 9],
    maj6: [0, 4, 7, 9],
    m6: [0, 3, 7, 9],
    min6: [0, 3, 7, 9]
  };

  function namesFor(accidental) {
    return accidental === "flat" ? FLAT : SHARP;
  }

  function pcName(pc, accidental) {
    return namesFor(accidental)[((pc % 12) + 12) % 12];
  }

  function majorScalePcs(rootPc) {
    return MAJOR_STEPS.map((s) => (rootPc + s) % 12);
  }

  function relativeMinorPc(majorPc) {
    return (majorPc + 9) % 12;
  }

  function keyInfo(keyId) {
    const key = MAJOR_KEYS.find((k) => k.id === keyId) || MAJOR_KEYS[0];
    const scalePcs = majorScalePcs(key.pc);
    const scaleNames = scalePcs.map((pc) => pcName(pc, key.accidental));
    const relPc = relativeMinorPc(key.pc);
    const relName = pcName(relPc, key.accidental) + "m";

    const chords = CHORD_QUAL.map((q, degree) => {
      const root = scalePcs[degree];
      const pcs = q.intervals.map((i) => (root + i) % 12);
      const rootName = pcName(root, key.accidental);
      const suffix = q.quality === "maj" ? "" : q.quality === "min" ? "m" : "°";
      return {
        roman: q.roman,
        quality: q.quality,
        name: rootName + suffix,
        pcs,
        rootPc: root
      };
    });

    return {
      key,
      scalePcs,
      scaleNames,
      relativeMinor: { name: relName, pc: relPc },
      chords
    };
  }

  function signatureLabel(sig) {
    if (sig === 0) return "冇升降號";
    if (sig > 0) return sig + " 個升號";
    return Math.abs(sig) + " 個降號";
  }

  function normalizeNoteName(raw) {
    return String(raw || "").trim().replace(/♯/g, "#").replace(/♭/g, "b");
  }

  function parsePitchName(raw) {
    const s = normalizeNoteName(raw);
    const m = s.match(/^([A-G](?:#|b)?)(\d+)?$/);
    if (!m) return null;
    const pc = ROOT_PC[m[1]];
    if (pc == null) return null;
    const oct = m[2] != null ? Number(m[2]) : null;
    const midi = oct == null ? null : (oct + 1) * 12 + pc;
    return { name: m[1], pc, oct, midi };
  }

  function prettyChord(symbol) {
    return String(symbol || "").replace(/#/g, "♯").replace(/b/g, "♭");
  }

  function prettyNote(name) {
    return String(name || "").replace(/#/g, "♯").replace(/b/g, "♭");
  }

  function parseChordSymbol(symbol) {
    const raw = String(symbol || "").trim();
    const norm = normalizeNoteName(raw);
    const m = norm.match(/^([A-G](?:#|b)?)(.*)$/);
    if (!m) return null;
    const rootName = m[1];
    const rootPc = ROOT_PC[rootName];
    if (rootPc == null) return null;
    let rest = (m[2] || "").trim();
    let bassName = null;
    let bassPc = null;
    const slash = rest.indexOf("/");
    if (slash >= 0) {
      bassName = rest.slice(slash + 1).trim();
      rest = rest.slice(0, slash).trim();
      const bass = parsePitchName(bassName);
      if (bass) bassPc = bass.pc;
    }
    const quality = rest;
    const intervals = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS[""];
    const pcs = intervals.map((i) => (rootPc + i) % 12);
    if (bassPc != null && pcs.indexOf(bassPc) < 0) pcs.push(bassPc);
    return { symbol: raw, rootName, rootPc, quality, bassName, bassPc, pcs };
  }

  function chordPcsFromSymbol(symbol) {
    const parsed = parseChordSymbol(symbol);
    return parsed ? parsed.pcs.slice() : [];
  }

  function diatonicIndex(raw) {
    const p = parsePitchName(raw);
    if (!p || p.oct == null) return null;
    const letter = p.name.charAt(0);
    if (LETTER_STEPS[letter] == null) return null;
    return p.oct * 7 + LETTER_STEPS[letter];
  }

  function accidentalOf(raw) {
    const p = parsePitchName(raw);
    if (!p) return "";
    if (p.name.indexOf("#") >= 0) return "#";
    if (p.name.indexOf("b") >= 0) return "b";
    return "";
  }

  function midiToName(midi, accidentalPref) {
    const pc = ((midi % 12) + 12) % 12;
    const oct = Math.floor(midi / 12) - 1;
    return pcName(pc, accidentalPref === "flat" ? "flat" : "sharp") + oct;
  }

  function prefersFlats(parsed) {
    const blob = [parsed.symbol, parsed.rootName, parsed.bassName].join(" ");
    return /b|Bb|Eb|Ab|Db|Gb|m6/.test(blob) && !/#/.test(blob);
  }

  /* Compact left-hand voicing in the MiniLab 3 range (default C3–C4). */
  function chordVoicingFromSymbol(symbol, opts) {
    opts = opts || {};
    const parsed = parseChordSymbol(symbol);
    if (!parsed) return [];
    const minM = opts.minMidi != null ? opts.minMidi : 48;
    const maxM = opts.maxMidi != null ? opts.maxMidi : 67;
    const bassLo = Math.max(minM, 48);
    const bassHi = Math.min(maxM, 59);
    const bassPc = parsed.bassPc != null ? parsed.bassPc : parsed.rootPc;
    let bass = bassLo + ((bassPc - ((bassLo % 12) + 12) % 12) + 12) % 12;
    if (bass > bassHi && bass - 12 >= minM) bass -= 12;
    if (bass < minM && bass + 12 <= maxM) bass += 12;
    if (bass > maxM && bass - 12 >= minM) bass -= 12;

    const midis = [bass];
    const others = parsed.pcs.filter((pc) => pc !== bassPc);
    others.forEach((pc) => {
      let m = bass + 1 + ((pc - (((bass + 1) % 12) + 12) % 12) + 12) % 12;
      if (m === bass) m += 12;
      if (m > maxM && m - 12 > bass && m - 12 >= minM) m -= 12;
      if (m >= minM && m <= maxM && midis.indexOf(m) < 0) midis.push(m);
    });
    midis.sort((a, b) => a - b);
    const pref = prefersFlats(parsed) ? "flat" : "sharp";
    return midis.map((midi) => ({
      midi,
      name: midiToName(midi, pref),
      pc: ((midi % 12) + 12) % 12
    }));
  }

  global.MusicTheory = {
    MAJOR_KEYS,
    SHARP,
    FLAT,
    ROOT_PC,
    LETTER_STEPS,
    pcName,
    majorScalePcs,
    relativeMinorPc,
    keyInfo,
    signatureLabel,
    normalizeNoteName,
    parsePitchName,
    prettyChord,
    prettyNote,
    parseChordSymbol,
    chordPcsFromSymbol,
    diatonicIndex,
    accidentalOf,
    midiToName,
    chordVoicingFromSymbol
  };
})(window);
