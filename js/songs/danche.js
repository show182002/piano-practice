/* 《單車》陳奕迅 — practice arrangement in G major (not an official score).
   Level 3 melody + mid-bar slash chords follow the C_Zhukov easy-piano
   arrangement on MuseScore (score 8020590), page 1 only: pickup + bars 1–30.
   Bars 31–56 were not available (page 2 locked). Pitches were read from the
   page-1 SVG staff positions; florid chorus rhythms in bars 13–15 and 17–19
   are 16th-quantized from the system screenshots of clearly written notes.
   Editorial mid-bar fills (bar 4 D; bar 22 Em; bar 24 D) are marked below.
   Official lyric text is not bundled. */
(function (global) {
  function repeat(seq, times) {
    const out = [];
    for (let i = 0; i < times; i++) {
      for (const ev of seq) out.push(Object.assign({}, ev));
    }
    return out;
  }

  function midiFromName(name) {
    const p = MusicTheory.parsePitchName(name);
    if (!p || p.midi == null) throw new Error("Bad note name: " + name);
    return p.midi;
  }

  // Absolute-beat melody notes. Ties are merged into one attack + longer dur.
  function notes(list) {
    return list.map(([start, dur, name]) => ({
      start: start,
      dur: dur,
      name: name,
      midi: midiFromName(name)
    }));
  }

  // Level 1: 4 beats per primary chord, 8 loops = 32 bars (I–vi–IV–V in G)
  const level1Loop = [
    { chord: "G", beats: 4 },
    { chord: "Em", beats: 4 },
    { chord: "C", beats: 4 },
    { chord: "D", beats: 4 }
  ];

  // Level 2: same key, practice the descending-bass inversions at 2+2 beats.
  const level2Phrase = [
    { chord: "G", beats: 2 },
    { chord: "D/F#", beats: 2 },
    { chord: "Em", beats: 2 },
    { chord: "Bm/D", beats: 2 },
    { chord: "C", beats: 2 },
    { chord: "G/B", beats: 2 },
    { chord: "Am7", beats: 2 },
    { chord: "D", beats: 2 }
  ];

  // ---- Level 3: pickup (1 beat) + bars 1–30 (page 1). Beat 0 = pickup. ----
  // Bar n (1-based) starts at beat 1 + (n-1)*4.
  const P = 1; // first full bar starts at beat 1
  function b(bar, offset) {
    return P + (bar - 1) * 4 + offset;
  }

  const level3Chords = [
    { section: "前奏", chord: "", beats: 1 },        // pickup (anacrusis, no printed chord)
    { section: "前奏", chord: "G", beats: 2 },       // bar 1
    { section: "前奏", chord: "D/F#", beats: 2 },
    { section: "前奏", chord: "Em", beats: 2 },      // bar 2
    { section: "前奏", chord: "Bm/D", beats: 2 },
    { section: "前奏", chord: "C", beats: 2 },       // bar 3
    { section: "前奏", chord: "G/B", beats: 2 },
    { section: "前奏", chord: "Am7", beats: 1 },     // bar 4 (printed Am7, then C/D)
    { section: "前奏", chord: "C/D", beats: 1 },
    { section: "前奏", chord: "D", beats: 2 },       // editorial: D on beats 3–4 (melody holds D4; cf. 8/12/16/20/28)
    { section: "主歌", chord: "G", beats: 2 },       // bar 5
    { section: "主歌", chord: "D/F#", beats: 2 },
    { section: "主歌", chord: "Em", beats: 2 },      // bar 6
    { section: "主歌", chord: "Bm/D", beats: 2 },
    { section: "主歌", chord: "C", beats: 2 },       // bar 7
    { section: "主歌", chord: "G/B", beats: 2 },
    { section: "主歌", chord: "Am7", beats: 2 },     // bar 8
    { section: "主歌", chord: "C/D", beats: 1 },
    { section: "主歌", chord: "D", beats: 1 },
    { section: "主歌", chord: "G", beats: 2 },       // bar 9
    { section: "主歌", chord: "D/F#", beats: 2 },
    { section: "主歌", chord: "Em", beats: 2 },      // bar 10
    { section: "主歌", chord: "Bm/D", beats: 2 },
    { section: "主歌", chord: "C", beats: 2 },       // bar 11
    { section: "主歌", chord: "G/B", beats: 2 },
    { section: "主歌", chord: "Am7", beats: 2 },     // bar 12
    { section: "主歌", chord: "C/D", beats: 1 },
    { section: "主歌", chord: "D", beats: 1 },
    { section: "副歌", chord: "G", beats: 2 },       // bar 13
    { section: "副歌", chord: "D/F#", beats: 2 },
    { section: "副歌", chord: "Em", beats: 2 },      // bar 14
    { section: "副歌", chord: "Bm/D", beats: 2 },
    { section: "副歌", chord: "C", beats: 2 },       // bar 15
    { section: "副歌", chord: "G/B", beats: 2 },
    { section: "副歌", chord: "Am7", beats: 2 },     // bar 16
    { section: "副歌", chord: "C/D", beats: 1 },
    { section: "副歌", chord: "D", beats: 1 },
    { section: "副歌", chord: "G", beats: 2 },       // bar 17
    { section: "副歌", chord: "G/F", beats: 2 },
    { section: "副歌", chord: "C/E", beats: 2 },     // bar 18
    { section: "副歌", chord: "Cm6/Eb", beats: 2 },
    { section: "副歌", chord: "G/D", beats: 2 },     // bar 19
    { section: "副歌", chord: "A/C#", beats: 2 },
    { section: "副歌", chord: "C", beats: 2 },       // bar 20
    { section: "副歌", chord: "C/D", beats: 1 },
    { section: "副歌", chord: "D", beats: 1 },
    { section: "副歌", chord: "G", beats: 4 },       // bar 21
    { section: "間奏", chord: "C", beats: 2 },       // bar 22 (printed C only)
    { section: "間奏", chord: "Em", beats: 2 },      // editorial: mid-bar Em; melody is B4 A4 G4 then holds E4
    { section: "間奏", chord: "G", beats: 4 },       // bar 23
    { section: "間奏", chord: "C", beats: 2 },       // bar 24 (printed C only)
    { section: "間奏", chord: "D", beats: 2 },       // editorial: D on beats 3–4; melody cadences on D4
    { section: "主歌", chord: "G", beats: 2 },       // bar 25
    { section: "主歌", chord: "D/F#", beats: 2 },
    { section: "主歌", chord: "Em", beats: 2 },      // bar 26
    { section: "主歌", chord: "Bm/D", beats: 2 },
    { section: "主歌", chord: "C", beats: 2 },       // bar 27
    { section: "主歌", chord: "G/B", beats: 2 },
    { section: "主歌", chord: "Am7", beats: 2 },     // bar 28
    { section: "主歌", chord: "C/D", beats: 1 },
    { section: "主歌", chord: "D", beats: 1 },
    { section: "主歌", chord: "G", beats: 2 },       // bar 29
    { section: "主歌", chord: "D/F#", beats: 2 },
    { section: "主歌", chord: "Em", beats: 2 },      // bar 30 (page 1 ends mid-phrase)
    { section: "主歌", chord: "Bm/D", beats: 2 }
  ];

  // Verse figure used at bars 5, 9, 25, 29
  function verseA(bar) {
    const t = b(bar, 0);
    return [
      [t + 0.5, 0.25, "A4"],
      [t + 0.75, 0.25, "G4"],
      [t + 1.0, 0.25, "A4"],
      [t + 1.25, 0.25, "G4"],
      [t + 1.5, 0.25, "A4"],
      [t + 1.75, 0.25, "G4"],
      [t + 2.0, 0.5, "A4"],
      [t + 2.5, 0.25, "B4"],
      [t + 2.75, 1.25, "A4"] // 16th tied to quarter
    ];
  }

  // Verse figure used at bars 6, 26 (ends D4) and 10, 30 (ends A4)
  function verseB(bar, last) {
    const t = b(bar, 0);
    return [
      [t + 0.5, 0.25, "A4"],
      [t + 0.75, 0.25, "G4"],
      [t + 1.0, 0.25, "A4"],
      [t + 1.25, 0.25, "G4"],
      [t + 1.5, 0.25, "A4"],
      [t + 1.75, 0.25, "B4"],
      [t + 2.0, 0.5, "F#4"],
      [t + 2.5, 0.5, "F#4"],
      [t + 3.0, 0.5, "G4"],
      [t + 3.5, 0.5, last]
    ];
  }

  // Bars 7 and 27: pickup 16th is E4 (bar 7) or D4 (bar 27); last E4 ties into next bar.
  function verseC(bar, pickup16, tieIntoNext) {
    const t = b(bar, 0);
    const lastDur = tieIntoNext ? 0.25 + 1 : 0.25; // 16th + next bar's tied quarter
    return [
      [t + 0.0, 1.0, "E4"],
      [t + 1.75, 0.25, pickup16],
      [t + 2.0, 0.5, "D4"],
      [t + 2.5, 0.5, "D5"],
      [t + 3.0, 0.5, "D5"], // two tied 16ths
      [t + 3.5, 0.25, "G4"],
      [t + 3.75, lastDur, "E4"]
    ];
  }

  // Cadence bars 8 and 28 (opening E4 already merged into previous bar's tie)
  function verseCadence(bar) {
    const t = b(bar, 0);
    return [
      [t + 1.75, 0.25, "D4"],
      [t + 2.0, 0.25, "B4"],
      [t + 2.25, 0.25, "A4"],
      [t + 2.5, 0.25, "G4"],
      [t + 2.75, 0.25, "A4"],
      [t + 3.0, 0.25, "E4"],
      [t + 3.25, 0.75, "D4"]
    ];
  }

  // Chorus figure used at bars 13 and 17. Pitches from the staff; 16th-quantized.
  function chorusA(bar) {
    const t = b(bar, 0);
    return [
      [t + 0.0, 0.5, "G4"],
      [t + 0.5, 0.25, "G4"],
      [t + 0.75, 0.25, "G4"],
      [t + 1.0, 0.25, "G4"],
      [t + 1.25, 0.75, "D5"],
      [t + 2.0, 0.5, "D5"],
      [t + 2.5, 0.25, "G4"],
      [t + 2.75, 0.25, "B4"],
      [t + 3.0, 0.25, "B4"],
      [t + 3.25, 0.75, "A4"]
    ];
  }

  const level3Melody = notes(
    []
      // Pickup (1 beat)
      .concat([
        [0.0, 0.25, "A3"],
        [0.25, 0.25, "B3"],
        [0.5, 0.25, "D4"],
        [0.75, 0.25, "E4"]
      ])
      // Bar 1
      .concat([
        [b(1, 0), 1.0, "D4"],
        [b(1, 1), 1.0, "G4"],
        [b(1, 2), 0.25, "F#4"],
        [b(1, 2.25), 0.25, "G4"],
        [b(1, 2.5), 0.25, "F#4"],
        [b(1, 2.75), 0.75, "D4"], // 16th tied to 8th
        [b(1, 3.5), 0.5, "B3"]
      ])
      // Bar 2
      .concat([
        [b(2, 0), 1.0, "E4"],
        [b(2, 1), 1.0, "B3"],
        [b(2, 2), 0.25, "A3"],
        [b(2, 2.25), 0.25, "B3"],
        [b(2, 2.5), 0.25, "D4"],
        [b(2, 2.75), 0.5, "B3"], // 16th tied to 16th
        [b(2, 3.25), 0.25, "A3"],
        [b(2, 3.5), 0.25, "B3"],
        [b(2, 3.75), 0.25, "A3"]
      ])
      // Bar 3
      .concat([
        [b(3, 0), 3.0, "G3"],
        [b(3, 3), 0.25, "A3"],
        [b(3, 3.25), 0.25, "G3"],
        [b(3, 3.5), 0.25, "A3"],
        [b(3, 3.75), 0.25, "B3"]
      ])
      // Bar 4
      .concat([
        [b(4, 0), 1.0, "A3"],
        [b(4, 1), 0.5, "E4"],
        [b(4, 1.5), 2.5, "D4"] // 8th tied to half
      ])
      .concat(verseA(5))
      .concat(verseB(6, "D4"))
      .concat(verseC(7, "E4", true))
      .concat(verseCadence(8))
      .concat(verseA(9))
      .concat(verseB(10, "A4"))
      // Bar 11; last G ties into bar 12
      .concat([
        [b(11, 0), 1.0, "G4"],
        [b(11, 1.5), 0.25, "A4"],
        [b(11, 1.75), 0.25, "B4"],
        [b(11, 2.0), 0.5, "C5"],
        [b(11, 2.5), 0.25, "B4"],
        [b(11, 2.75), 0.25, "A4"],
        [b(11, 3.0), 0.5, "G4"],
        [b(11, 3.5), 1.5, "G4"] // 8th tied to bar 12 quarter
      ])
      // Bar 12 (opening G already merged)
      .concat([
        [b(12, 1.75), 0.25, "D4"],
        [b(12, 2.0), 0.25, "D5"],
        [b(12, 2.25), 0.25, "D5"],
        [b(12, 2.5), 0.25, "D5"],
        [b(12, 2.75), 0.25, "E5"],
        [b(12, 3.0), 0.25, "B4"],
        [b(12, 3.25), 0.25, "A4"],
        [b(12, 3.5), 0.5, "G4"]
      ])
      .concat(chorusA(13))
      // Bar 14: same opening as 13, then high G5 figure (16th-quantized)
      .concat([
        [b(14, 0), 0.5, "G4"],
        [b(14, 0.5), 0.25, "G4"],
        [b(14, 0.75), 0.25, "G4"],
        [b(14, 1.0), 0.25, "G4"],
        [b(14, 1.25), 0.75, "G5"],
        [b(14, 2.0), 0.5, "F#5"],
        [b(14, 2.5), 0.25, "B4"],
        [b(14, 2.75), 0.25, "E5"],
        [b(14, 3.0), 0.25, "E5"],
        [b(14, 3.25), 0.75, "D5"]
      ])
      // Bar 15 (florid; clearly written pitches as even 16ths / 8ths)
      .concat([
        [b(15, 0), 0.25, "E5"],
        [b(15, 0.25), 0.25, "E5"],
        [b(15, 0.5), 0.25, "E5"],
        [b(15, 0.75), 0.25, "E5"],
        [b(15, 1.0), 0.25, "E5"],
        [b(15, 1.25), 0.25, "F#5"],
        [b(15, 1.5), 0.25, "F#5"],
        [b(15, 1.75), 0.25, "G5"],
        [b(15, 2.0), 0.5, "D5"],
        [b(15, 2.5), 0.25, "D5"],
        [b(15, 2.75), 0.25, "D5"],
        [b(15, 3.0), 0.25, "D5"],
        [b(15, 3.25), 0.25, "A4"],
        [b(15, 3.5), 0.5, "G4"]
      ])
      // Bar 16
      .concat([
        [b(16, 0), 1.0, "G4"],
        [b(16, 1), 1.0, "C5"],
        [b(16, 2), 1.0, "A4"],
        [b(16, 3), 1.0, "D5"]
      ])
      .concat(chorusA(17))
      // Bar 18; written accidental is a flat on E5 (= Eb5) under Cm6/Eb
      .concat([
        [b(18, 0), 0.5, "C5"],
        [b(18, 0.5), 0.25, "C5"],
        [b(18, 0.75), 0.25, "C5"],
        [b(18, 1.0), 0.25, "C5"],
        [b(18, 1.25), 0.75, "G5"],
        [b(18, 2.0), 0.5, "G5"],
        [b(18, 2.5), 0.25, "Eb5"],
        [b(18, 2.75), 0.25, "D5"],
        [b(18, 3.0), 0.25, "D5"],
        [b(18, 3.25), 0.75, "C5"]
      ])
      // Bar 19 (florid; clearly written pitches, 16th-quantized)
      .concat([
        [b(19, 0), 0.25, "B4"],
        [b(19, 0.25), 0.25, "C5"],
        [b(19, 0.5), 0.25, "C5"],
        [b(19, 0.75), 0.25, "D5"],
        [b(19, 1.0), 0.25, "D5"],
        [b(19, 1.25), 0.25, "D5"],
        [b(19, 1.5), 0.25, "D5"],
        [b(19, 1.75), 0.25, "B4"],
        [b(19, 2.0), 0.5, "A4"],
        [b(19, 2.5), 0.25, "A4"],
        [b(19, 2.75), 0.25, "A4"],
        [b(19, 3.0), 0.25, "G4"],
        [b(19, 3.25), 0.25, "B4"],
        [b(19, 3.5), 0.5, "A4"]
      ])
      // Bar 20
      .concat([
        [b(20, 0), 1.0, "G4"],
        [b(20, 1), 1.0, "C5"],
        [b(20, 2), 1.0, "A4"],
        [b(20, 3), 1.0, "D5"]
      ])
      // Bar 21: B16 A16, G8 tied to half, quarter rest
      .concat([
        [b(21, 0), 0.25, "B4"],
        [b(21, 0.25), 0.25, "A4"],
        [b(21, 0.5), 2.5, "G4"]
      ])
      // Bar 22: B8 A8 G8 E8 tied to half
      .concat([
        [b(22, 0), 0.5, "B4"],
        [b(22, 0.5), 0.5, "A4"],
        [b(22, 1.0), 0.5, "G4"],
        [b(22, 1.5), 2.5, "E4"]
      ])
      // Bar 23: eight eighths, slur (not tie) between the two D4s
      .concat([
        [b(23, 0), 0.5, "G3"],
        [b(23, 0.5), 0.5, "A3"],
        [b(23, 1.0), 0.5, "B3"],
        [b(23, 1.5), 0.5, "D4"],
        [b(23, 2.0), 0.5, "D4"],
        [b(23, 2.5), 0.5, "E4"],
        [b(23, 3.0), 0.5, "G4"],
        [b(23, 3.5), 0.5, "A4"]
      ])
      // Bar 24: B8 A8 G8 D8 tied to quarter, quarter rest
      .concat([
        [b(24, 0), 0.5, "B4"],
        [b(24, 0.5), 0.5, "A4"],
        [b(24, 1.0), 0.5, "G4"],
        [b(24, 1.5), 1.5, "D4"]
      ])
      .concat(verseA(25))
      .concat(verseB(26, "D4"))
      .concat(verseC(27, "D4", true))
      .concat(verseCadence(28))
      .concat(verseA(29))
      .concat(verseB(30, "A4"))
  );

  // Timed lyric slots only — text left empty on purpose (copyright).
  // startBeat marks where a sung line begins so the karaoke UI can sync later.
  const level3Lyrics = [
    { startBeat: b(5, 0), text: "" },
    { startBeat: b(6, 0), text: "" },
    { startBeat: b(7, 0), text: "" },
    { startBeat: b(8, 1.75), text: "" },
    { startBeat: b(9, 0), text: "" },
    { startBeat: b(10, 0), text: "" },
    { startBeat: b(11, 1.5), text: "" },
    { startBeat: b(12, 1.75), text: "" },
    { startBeat: b(13, 0), text: "" },
    { startBeat: b(14, 0), text: "" },
    { startBeat: b(15, 0), text: "" },
    { startBeat: b(16, 0), text: "" },
    { startBeat: b(17, 0), text: "" },
    { startBeat: b(18, 0), text: "" },
    { startBeat: b(19, 0), text: "" },
    { startBeat: b(20, 0), text: "" },
    { startBeat: b(21, 0), text: "" },
    { startBeat: b(25, 0), text: "" },
    { startBeat: b(26, 0), text: "" },
    { startBeat: b(27, 0), text: "" },
    { startBeat: b(28, 1.75), text: "" },
    { startBeat: b(29, 0), text: "" },
    { startBeat: b(30, 0), text: "" }
  ];

  global.Songs = global.Songs || {};
  global.Songs.danche = {
    id: "danche",
    title: "單車",
    artist: "陳奕迅",
    disclaimer: "練習用編曲（非官方譜）· 第 1 頁（pickup＋第 1–30 小節）",
    key: "G",
    defaultBpm: 68,
    beatsPerBar: 4,
    pickupBeats: 1,
    levels: [
      {
        id: 1,
        name: "Level 1",
        subtitle: "超簡單：4 拍一個主要和弦（G–Em–C–D）",
        progression: repeat(level1Loop, 8)
      },
      {
        id: 2,
        name: "Level 2",
        subtitle: "G 調下行低音：G–D/F#–Em–Bm/D–C–G/B–Am7–D",
        progression: repeat(level2Phrase, 4)
      },
      {
        id: 3,
        name: "Level 3",
        subtitle: "跟譜練習：單音旋律＋小節中間轉和弦（第 1 頁；其後喺第 2 頁，未有收入）",
        progression: level3Chords,
        melody: level3Melody,
        lyrics: level3Lyrics,
        pickupBeats: 1
      }
    ]
  };
})(window);
