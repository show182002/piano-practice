/* Music theory helpers: pitch classes, major scale, diatonic chords. */
(function (global) {
  // Prefer sharps for sharp keys, flats for flat keys
  const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const FLAT  = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

  // Major circle order (clockwise from C): fifths
  // pc: pitch class 0=C … 11=B
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

  const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11]; // W W H W W W H
  const CHORD_QUAL = [
    { roman: "I",   quality: "maj",  intervals: [0, 4, 7] },
    { roman: "ii",  quality: "min",  intervals: [0, 3, 7] },
    { roman: "iii", quality: "min",  intervals: [0, 3, 7] },
    { roman: "IV",  quality: "maj",  intervals: [0, 4, 7] },
    { roman: "V",   quality: "maj",  intervals: [0, 4, 7] },
    { roman: "vi",  quality: "min",  intervals: [0, 3, 7] },
    { roman: "vii°", quality: "dim", intervals: [0, 3, 6] }
  ];

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
    return (majorPc + 9) % 12; // down 3 semitones / up 9
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

  global.MusicTheory = {
    MAJOR_KEYS,
    SHARP,
    FLAT,
    pcName,
    majorScalePcs,
    relativeMinorPc,
    keyInfo,
    signatureLabel
  };
})(window);
