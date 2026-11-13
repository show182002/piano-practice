/* 《Shall We Talk》陳奕迅 — practice arrangement in C major (not an official score).
   Level 3 melody + left-hand accompaniment follow the LouisLiao Synthesia easy
   tutorial (YouTube TGZJhl3ltt4). Pitches and 16th-grid rhythms were read from
   the falling-note display (green = RH, blue = LH). Official lyric text is not
   bundled.

   Timeline: app beat 0 = video measure 2 downbeat (first sounding bar, ~1.28s).
   Silent video measure 1 (fade-in before 0:00) is skipped, so the practice song
   does not begin with 4 beats of rest. Comments map app beats to video measures.

   Meter is 4/4 at about 86 BPM, except video measures 68 and 79, which are 2/4.
   The last bars ritard on the source video (m78 slightly long, m79 slower,
   m81–m82 held close; last sound ~3:46.79). The app uses a constant defaultBpm
   of 86; play the ending more freely if you want the ritardando.

   Uncertain / letter-vs-keyboard decisions are commented on the affected notes.
   Do not treat this file as an official score. */


(function (global) {
  function midiFromName(name) {
    const p = MusicTheory.parsePitchName(name);
    if (!p || p.midi == null) throw new Error("Bad note name: " + name);
    return p.midi;
  }

  // Absolute-beat notes. Ties should be merged into one attack + longer dur.
  function notes(list) {
    return list.map(([start, dur, name]) => ({
      start: start,
      dur: dur,
      name: name,
      midi: midiFromName(name)
    }));
  }

  // App beat 0 = video measure 2 downbeat. Silent video m1 is skipped.
  // Video m68 and m79 are 2/4; every other sounding bar is 4/4.
  const SHORT_BARS = { 68: 2, 79: 2 };
  const BAR_START = {};
  (function fillBarStarts() {
    let t = 0;
    for (let m = 2; m <= 82; m++) {
      BAR_START[m] = t;
      t += SHORT_BARS[m] || 4;
    }
  })();
  function b(videoMeasure, offset) {
    return BAR_START[videoMeasure] + offset;
  }

  const barLengths = [];
  for (let m = 2; m <= 82; m++) barLengths.push(SHORT_BARS[m] || 4);


  const level1Chords = [
    { section: "前奏", chord: "C", beats: 4 },  // video m2
    { section: "前奏", chord: "Am", beats: 4 },  // video m3
    { section: "前奏", chord: "C", beats: 4 },  // video m4
    { section: "前奏", chord: "Am", beats: 4 },  // video m5
    { section: "主歌", chord: "C", beats: 4 },  // video m6
    { section: "主歌", chord: "Am", beats: 4 },  // video m7
    { section: "主歌", chord: "F", beats: 4 },  // video m8
    { section: "主歌", chord: "Dm", beats: 4 },  // video m9
    { section: "主歌", chord: "C", beats: 4 },  // video m10
    { section: "主歌", chord: "Am", beats: 4 },  // video m11
    { section: "主歌", chord: "F", beats: 4 },  // video m12
    { section: "主歌", chord: "F", beats: 4 },  // video m13
    { section: "主歌", chord: "C", beats: 4 },  // video m14
    { section: "主歌", chord: "Am", beats: 4 },  // video m15
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m16
    { section: "主歌", chord: "Am", beats: 4 },  // video m17
    { section: "主歌", chord: "F", beats: 4 },  // video m18
    { section: "主歌", chord: "Am", beats: 4 },  // video m19
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m20
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m21
    { section: "主歌", chord: "Fmaj7", beats: 4 },  // video m22
    { section: "主歌", chord: "D7", beats: 4 },  // video m23
    { section: "主歌", chord: "C", beats: 4 },  // video m24
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m25
    { section: "副歌", chord: "C", beats: 4 },  // video m26
    { section: "副歌", chord: "G", beats: 4 },  // video m27
    { section: "副歌", chord: "Am", beats: 4 },  // video m28
    { section: "副歌", chord: "G", beats: 4 },  // video m29
    { section: "副歌", chord: "Am", beats: 4 },  // video m30
    { section: "副歌", chord: "Dm", beats: 4 },  // video m31
    { section: "副歌", chord: "Am", beats: 4 },  // video m32
    { section: "副歌", chord: "F", beats: 4 },  // video m33
    { section: "間奏", chord: "C", beats: 4 },  // video m34
    { section: "間奏", chord: "Am", beats: 4 },  // video m35
    { section: "主歌", chord: "C", beats: 4 },  // video m36
    { section: "主歌", chord: "Am", beats: 4 },  // video m37
    { section: "主歌", chord: "F", beats: 4 },  // video m38
    { section: "主歌", chord: "Dm", beats: 4 },  // video m39
    { section: "主歌", chord: "C", beats: 4 },  // video m40
    { section: "主歌", chord: "Am", beats: 4 },  // video m41
    { section: "主歌", chord: "F", beats: 4 },  // video m42
    { section: "主歌", chord: "F", beats: 4 },  // video m43
    { section: "主歌", chord: "Am", beats: 4 },  // video m44
    { section: "主歌", chord: "F", beats: 4 },  // video m45
    { section: "主歌", chord: "Am", beats: 4 },  // video m46
    { section: "主歌", chord: "F", beats: 4 },  // video m47
    { section: "主歌", chord: "Am", beats: 4 },  // video m48
    { section: "主歌", chord: "F", beats: 4 },  // video m49
    { section: "主歌", chord: "F", beats: 4 },  // video m50
    { section: "主歌", chord: "Dm", beats: 4 },  // video m51
    { section: "主歌", chord: "G7", beats: 4 },  // video m52
    { section: "副歌", chord: "C", beats: 4 },  // video m53
    { section: "副歌", chord: "G", beats: 4 },  // video m54
    { section: "副歌", chord: "Am", beats: 4 },  // video m55
    { section: "副歌", chord: "G", beats: 4 },  // video m56
    { section: "副歌", chord: "Am", beats: 4 },  // video m57
    { section: "副歌", chord: "Dm", beats: 4 },  // video m58
    { section: "副歌", chord: "Am", beats: 4 },  // video m59
    { section: "副歌", chord: "F", beats: 4 },  // video m60
    { section: "副歌", chord: "C", beats: 4 },  // video m61
    { section: "副歌", chord: "G", beats: 4 },  // video m62
    { section: "副歌", chord: "Am", beats: 4 },  // video m63
    { section: "副歌", chord: "G", beats: 4 },  // video m64
    { section: "副歌", chord: "Am", beats: 4 },  // video m65
    { section: "副歌", chord: "Dm", beats: 4 },  // video m66
    { section: "副歌", chord: "Am", beats: 4 },  // video m67
    { section: "副歌", chord: "F", beats: 2 },  // video m68 (2/4)
    { section: "副歌", chord: "G", beats: 4 },  // video m69
    { section: "間奏", chord: "C", beats: 4 },  // video m70
    { section: "間奏", chord: "Am", beats: 4 },  // video m71
    { section: "主歌", chord: "C", beats: 4 },  // video m72
    { section: "主歌", chord: "Am", beats: 4 },  // video m73
    { section: "主歌", chord: "F", beats: 4 },  // video m74
    { section: "主歌", chord: "Dm", beats: 4 },  // video m75
    { section: "主歌", chord: "C", beats: 4 },  // video m76
    { section: "主歌", chord: "Am", beats: 4 },  // video m77
    { section: "主歌", chord: "F", beats: 4 },  // video m78
    { section: "尾聲", chord: "D", beats: 2 },  // video m79 (2/4)
    { section: "尾聲", chord: "C", beats: 4 },  // video m80
    { section: "尾聲", chord: "F", beats: 4 },  // video m81
    { section: "尾聲", chord: "C", beats: 4 },  // video m82
  ];

  const level2Chords = [
    { section: "前奏", chord: "C", beats: 2 }, { section: "前奏", chord: "G/B", beats: 2 },  // video m2
    { section: "前奏", chord: "Am", beats: 2 }, { section: "前奏", chord: "G", beats: 2 },  // video m3
    { section: "前奏", chord: "C", beats: 2 }, { section: "前奏", chord: "G/B", beats: 2 },  // video m4
    { section: "前奏", chord: "Am", beats: 2 }, { section: "前奏", chord: "G", beats: 2 },  // video m5
    { section: "主歌", chord: "C", beats: 1 }, { section: "主歌", chord: "G/B", beats: 2 }, { section: "主歌", chord: "Am", beats: 1 },  // video m6
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m7
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m8
    { section: "主歌", chord: "Dm", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m9
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m10
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m11
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m12
    { section: "主歌", chord: "C/E", beats: 1 }, { section: "主歌", chord: "F", beats: 1.5 }, { section: "主歌", chord: "G", beats: 1.5 },  // video m13
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m14
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m15
    { section: "主歌", chord: "D7/F#", beats: 1 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "C", beats: 2 },  // video m16
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m17
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "E/G#", beats: 1 },  // video m18
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m19
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m20
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m21
    { section: "主歌", chord: "Fmaj7", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m22
    { section: "主歌", chord: "D7", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m23
    { section: "主歌", chord: "C", beats: 4 },  // video m24
    { section: "主歌", chord: "D7/F#", beats: 1 }, { section: "主歌", chord: "G", beats: 2 }, { section: "主歌", chord: "C", beats: 1 },  // video m25
    { section: "副歌", chord: "C", beats: 2 }, { section: "副歌", chord: "F", beats: 2 },  // video m26
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m27
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Dm", beats: 2 },  // video m28
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m29
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m30
    { section: "副歌", chord: "Dm", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m31
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m32
    { section: "副歌", chord: "F", beats: 2 }, { section: "副歌", chord: "G", beats: 2 },  // video m33
    { section: "間奏", chord: "C", beats: 2 }, { section: "間奏", chord: "G/B", beats: 2 },  // video m34
    { section: "間奏", chord: "Am", beats: 2 }, { section: "間奏", chord: "G", beats: 2 },  // video m35
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m36
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m37
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m38
    { section: "主歌", chord: "Dm", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m39
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m40
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m41
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m42
    { section: "主歌", chord: "F", beats: 1 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "C", beats: 2 },  // video m43
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m44
    { section: "主歌", chord: "F", beats: 1 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "C", beats: 2 },  // video m45
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m46
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "Ab", beats: 1 },  // video m47
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m48
    { section: "主歌", chord: "F", beats: 3 }, { section: "主歌", chord: "D7/F#", beats: 1 },  // video m49
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m50
    { section: "主歌", chord: "Dm", beats: 4 },  // video m51
    { section: "主歌", chord: "G7", beats: 4 },  // video m52
    { section: "副歌", chord: "C", beats: 2 }, { section: "副歌", chord: "F", beats: 2 },  // video m53
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m54
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Dm", beats: 2 },  // video m55
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m56
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m57
    { section: "副歌", chord: "Dm", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m58
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m59
    { section: "副歌", chord: "F", beats: 2 }, { section: "副歌", chord: "G", beats: 2 },  // video m60
    { section: "副歌", chord: "C", beats: 2 }, { section: "副歌", chord: "F", beats: 2 },  // video m61
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m62
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Dm", beats: 2 },  // video m63
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m64
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m65
    { section: "副歌", chord: "Dm", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m66
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m67
    { section: "副歌", chord: "F", beats: 2 },  // video m68 (2/4)
    { section: "副歌", chord: "G", beats: 4 },  // video m69
    { section: "間奏", chord: "C", beats: 2 }, { section: "間奏", chord: "G/B", beats: 2 },  // video m70
    { section: "間奏", chord: "Am", beats: 2 }, { section: "間奏", chord: "G", beats: 2 },  // video m71
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m72
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m73
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m74
    { section: "主歌", chord: "Dm", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m75
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m76
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m77
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m78
    { section: "尾聲", chord: "D", beats: 1 }, { section: "尾聲", chord: "G", beats: 1 },  // video m79 (2/4)
    { section: "尾聲", chord: "C", beats: 2 }, { section: "尾聲", chord: "G/B", beats: 2 },  // video m80
    { section: "尾聲", chord: "F", beats: 2 }, { section: "尾聲", chord: "G", beats: 2 },  // video m81
    { section: "尾聲", chord: "C", beats: 4 },  // video m82
  ];

  const level3Chords = [
    { section: "前奏", chord: "C", beats: 2 }, { section: "前奏", chord: "G/B", beats: 2 },  // video m2
    { section: "前奏", chord: "Am", beats: 2 }, { section: "前奏", chord: "G", beats: 2 },  // video m3
    { section: "前奏", chord: "C", beats: 2 }, { section: "前奏", chord: "G/B", beats: 2 },  // video m4
    { section: "前奏", chord: "Am", beats: 2 }, { section: "前奏", chord: "G", beats: 2 },  // video m5
    { section: "主歌", chord: "C", beats: 1 }, { section: "主歌", chord: "G/B", beats: 2 }, { section: "主歌", chord: "Am", beats: 1 },  // video m6
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m7
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m8
    { section: "主歌", chord: "Dm", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m9
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m10
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m11
    { section: "主歌", chord: "F", beats: 2.5 }, { section: "主歌", chord: "C/E", beats: 1.5 },  // video m12
    { section: "主歌", chord: "C/E", beats: 1 }, { section: "主歌", chord: "F", beats: 1.5 }, { section: "主歌", chord: "G", beats: 1.5 },  // video m13 (E3 hold into the bar, then F–G)
    { section: "主歌", chord: "C", beats: 2.75 }, { section: "主歌", chord: "G/B", beats: 1.25 },  // video m14
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m15
    { section: "主歌", chord: "D7/F#", beats: 1 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "C", beats: 1 }, { section: "主歌", chord: "G/B", beats: 1 },  // video m16
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m17
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "E/G#", beats: 1 },  // video m18
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m19
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m20 (F# pedal continues into m21)
    { section: "主歌", chord: "D7/F#", beats: 4 },  // video m21
    { section: "主歌", chord: "Fmaj7", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m22
    { section: "主歌", chord: "D7", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m23
    { section: "主歌", chord: "C", beats: 4 },  // video m24
    { section: "主歌", chord: "D7/F#", beats: 1 }, { section: "主歌", chord: "G", beats: 2 }, { section: "主歌", chord: "C", beats: 1 },  // video m25
    { section: "副歌", chord: "C", beats: 2 }, { section: "副歌", chord: "F", beats: 2 },  // video m26
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m27
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Dm", beats: 2 },  // video m28
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m29
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m30
    { section: "副歌", chord: "Dm", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m31
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m32
    { section: "副歌", chord: "F", beats: 2 }, { section: "副歌", chord: "G", beats: 2 },  // video m33
    { section: "間奏", chord: "C", beats: 2 }, { section: "間奏", chord: "G/B", beats: 2 },  // video m34
    { section: "間奏", chord: "Am", beats: 2 }, { section: "間奏", chord: "G", beats: 2 },  // video m35
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m36
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m37
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m38
    { section: "主歌", chord: "Dm", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m39
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m40
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m41
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m42
    { section: "主歌", chord: "F", beats: 1 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "C", beats: 1 }, { section: "主歌", chord: "G/B", beats: 1 },  // video m43
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m44
    { section: "主歌", chord: "F", beats: 1 }, { section: "主歌", chord: "G", beats: 1 }, { section: "主歌", chord: "C", beats: 1 }, { section: "主歌", chord: "G/B", beats: 1 },  // video m45
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m46
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "G", beats: 1 },  // video m47
    { section: "主歌", chord: "Ab", beats: 1 },  // video m47 (printed Ab, same role as E/G# in m18)
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "Em", beats: 2 },  // video m48
    { section: "主歌", chord: "F", beats: 3 }, { section: "主歌", chord: "D7/F#", beats: 1 },  // video m49
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m50
    { section: "主歌", chord: "Dm", beats: 4 },  // video m51
    { section: "主歌", chord: "G7", beats: 4 },  // video m52
    { section: "副歌", chord: "C", beats: 2 }, { section: "副歌", chord: "F", beats: 2 },  // video m53
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m54
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Dm", beats: 2 },  // video m55
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m56
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m57
    { section: "副歌", chord: "Dm", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m58
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m59
    { section: "副歌", chord: "F", beats: 2 }, { section: "副歌", chord: "G", beats: 2 },  // video m60
    { section: "副歌", chord: "C", beats: 2 }, { section: "副歌", chord: "F", beats: 2 },  // video m61
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m62
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Dm", beats: 2 },  // video m63
    { section: "副歌", chord: "G", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m64
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m65
    { section: "副歌", chord: "Dm", beats: 2 }, { section: "副歌", chord: "C", beats: 2 },  // video m66
    { section: "副歌", chord: "Am", beats: 2 }, { section: "副歌", chord: "Em", beats: 2 },  // video m67
    { section: "副歌", chord: "F", beats: 2 },  // video m68 (2/4)
    { section: "副歌", chord: "G", beats: 4 },  // video m69
    { section: "間奏", chord: "C", beats: 2 }, { section: "間奏", chord: "G/B", beats: 2 },  // video m70
    { section: "間奏", chord: "Am", beats: 2 }, { section: "間奏", chord: "G", beats: 2 },  // video m71
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m72
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m73
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m74
    { section: "主歌", chord: "Dm", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m75
    { section: "主歌", chord: "C", beats: 2 }, { section: "主歌", chord: "G/B", beats: 2 },  // video m76
    { section: "主歌", chord: "Am", beats: 2 }, { section: "主歌", chord: "G", beats: 2 },  // video m77
    { section: "主歌", chord: "F", beats: 2 }, { section: "主歌", chord: "C/E", beats: 2 },  // video m78
    { section: "尾聲", chord: "D", beats: 1 }, { section: "尾聲", chord: "G", beats: 1 },  // video m79 (2/4)
    { section: "尾聲", chord: "C", beats: 2 }, { section: "尾聲", chord: "G/B", beats: 2 },  // video m80
    { section: "尾聲", chord: "F", beats: 1.75 }, { section: "尾聲", chord: "G", beats: 2.25 },  // video m81
    { section: "尾聲", chord: "C", beats: 4 },  // video m82
  ];

  const level3Melody = notes([
      // video m2 — first sounding bar (app beat 0)
      [b(2, 0.5), 1.5, "G5"],
      [b(2, 2.5), 1.5, "G5"],
      // video m3
      [b(3, 0.5), 1.5, "G5"],
      [b(3, 2.5), 1.5, "G5"],
      // video m4
      [b(4, 0.5), 0.25, "E6"],
      [b(4, 0.75), 0.25, "F6"],
      [b(4, 1), 0.5, "G6"],
      [b(4, 1.5), 0.5, "E6"],
      [b(4, 2), 2, "D6"],
      // video m5
      [b(5, 0.5), 0.25, "A5"],
      [b(5, 0.75), 0.25, "B5"],
      [b(5, 1), 0.5, "C6"],
      [b(5, 1.5), 0.5, "A5"],
      [b(5, 2), 0.5, "B5"],
      [b(5, 2.5), 0.5, "C6"],
      [b(5, 3), 1, "D6"],
      // video m6
      [b(6, 0), 1, "E4"],
      [b(6, 1), 3, "G4"],
      [b(6, 3), 0.5, "A4"],
      // video m7
      [b(7, 0), 0.5, "A4"],
      [b(7, 0.5), 0.5, "B4"],
      [b(7, 1), 0.5, "C5"],
      [b(7, 1.5), 0.5, "A4"],
      [b(7, 2), 2, "G4"],
      // video m8
      [b(8, 0), 0.5, "A4"],
      [b(8, 0.5), 0.5, "B4"],
      [b(8, 1), 0.5, "C5"],
      [b(8, 1.5), 0.5, "A4"],
      [b(8, 2), 1, "G4"],
      [b(8, 3), 1, "C4"],
      // video m9
      [b(9, 0.5), 0.5, "F4"],
      [b(9, 1), 0.5, "E4"],
      [b(9, 1.5), 0.5, "C4"],
      [b(9, 2), 2, "D4"],
      // video m10
      [b(10, 0), 1, "C4"],
      [b(10, 1), 1, "E4"],
      [b(10, 2), 2, "G4"],
      // video m11
      [b(11, 0), 0.5, "A4"],
      [b(11, 0.5), 0.5, "B4"],
      [b(11, 1), 0.5, "C5"],
      [b(11, 1.5), 0.5, "A4"],
      [b(11, 2), 2, "G4"],
      // video m12
      [b(12, 0), 0.5, "A4"],
      [b(12, 0.75), 0.75, "B4"],
      [b(12, 1.25), 0.75, "C5"],
      [b(12, 2), 0.75, "D5"],
      [b(12, 2.5), 0.75, "C5"],
      [b(12, 3.25), 0.75, "G4"],
      // video m13
      [b(13, 0), 0.5, "E4"],
      [b(13, 0.5), 0.75, "C4"],
      [b(13, 1.25), 2.25, "E4"],
      [b(13, 3.25), 0.75, "D4"],
      // video m14
      [b(14, 0), 2, "C4"],
      [b(14, 2.25), 0.5, "C4"],
      [b(14, 3.5), 1.25, "C4"],
      // video m15
      [b(15, 0.5), 0.5, "G4"],
      [b(15, 1), 0.5, "F#4"],
      [b(15, 1.5), 0.5, "E4"],
      [b(15, 2), 0.5, "G4"],
      [b(15, 2.5), 1, "E4"],
      [b(15, 3.5), 0.5, "D4"],
      // video m16
      [b(16, 0), 0.5, "C4"],
      [b(16, 0.5), 0.5, "C5"],
      [b(16, 1), 0.25, "B4"],
      [b(16, 1.25), 0.5, "G4"],
      [b(16, 1.75), 0.5, "D4"],
      [b(16, 2), 2.75, "E4"],
      // video m17
      [b(17, 0.5), 0.75, "E5"],
      [b(17, 1), 0.75, "D5"],
      [b(17, 1.75), 0.5, "B4"],
      [b(17, 2.25), 0.5, "C5"],
      [b(17, 2.5), 0.5, "G4"],
      [b(17, 3), 0.5, "F4"],
      [b(17, 3.5), 0.5, "E4"],
      // video m18
      [b(18, 0), 0.5, "F#4"],
      [b(18, 0.5), 1, "E4"],
      [b(18, 1.5), 0.5, "C4"],
      [b(18, 2), 2, "D4"],
      // video m19
      [b(19, 0), 1, "C4"],
      [b(19, 1), 1, "E4"],
      [b(19, 2), 1.5, "G4"],
      [b(19, 3.5), 0.5, "C4"],
      // video m20
      [b(20, 0), 0.5, "A4"],
      [b(20, 0.75), 0.5, "G4"],
      [b(20, 1.25), 0.5, "F#4"],
      [b(20, 1.75), 0.5, "A4"],
      [b(20, 2.25), 0.5, "B4"],
      [b(20, 2.5), 4, "C5"],
      [b(20, 2.75), 4, "E4"],
      // video m21
      [b(21, 2.5), 0.75, "C4"],
      [b(21, 3.25), 0.75, "D4"],
      [b(21, 3.75), 1.5, "C4"],
      // video m22
      [b(22, 0), 1.5, "E4"],
      [b(22, 1.5), 0.5, "F#4"],
      [b(22, 2), 1, "C4"],
      [b(22, 2), 1, "G4"],
      [b(22, 3), 0.5, "E4"],
      [b(22, 3.5), 0.5, "F#4"],
      // video m23
      [b(23, 0), 0.5, "G4"],
      [b(23, 0.5), 0.5, "C5"],
      [b(23, 1), 0.5, "B4"],
      [b(23, 1.5), 0.5, "A4"],
      [b(23, 2), 0.5, "G4"],
      [b(23, 2.5), 0.5, "F#4"],
      [b(23, 3), 0.5, "E4"],
      [b(23, 3.5), 0.5, "D4"],
      // video m24
      [b(24, 0), 1.5, "C4"],
      [b(24, 1.5), 0.5, "G4"],
      [b(24, 2), 0.5, "F4"],
      [b(24, 2.5), 0.5, "E4"],
      [b(24, 3), 0.5, "D4"],
      [b(24, 3.5), 0.5, "C4"],
      // video m25
      [b(25, 0), 1, "A4"],
      [b(25, 0.75), 1.25, "D4"],
      [b(25, 1), 0.5, "F#4"],
      [b(25, 1.5), 0.5, "E4"],
      [b(25, 2), 0.5, "G4"],
      [b(25, 2.5), 0.5, "C5"],
      [b(25, 3), 2, "E5"],
      [b(25, 3.5), 0.5, "C5"],  // marked uncertain in part 1; kept as marked
      // video m26
      [b(26, 0), 0.5, "G4"],
      [b(26, 0.5), 0.5, "C5"],
      [b(26, 1), 0.5, "G4"],
      [b(26, 1.5), 0.5, "C5"],
      [b(26, 2), 0.5, "D#5"],
      [b(26, 2.25), 0.25, "E5"],  // marked uncertain in part 1; kept as marked (16th between D#5 and D5)
      [b(26, 2.5), 0.5, "D5"],
      [b(26, 3), 0.5, "C5"],
      [b(26, 3.5), 0.5, "A4"],
      // video m27
      [b(27, 0), 0.5, "B4"],
      [b(27, 0.5), 0.5, "A4"],
      [b(27, 1), 0.25, "G4"],
      [b(27, 1.25), 0.25, "C5"],
      [b(27, 1.75), 0.25, "F#5"],
      [b(27, 2), 1, "E5"],
      [b(27, 3), 0.5, "G4"],
      [b(27, 3.5), 0.5, "C5"],
      // video m28
      [b(28, 0), 1, "E5"],
      [b(28, 1), 0.5, "G4"],
      [b(28, 1.5), 0.5, "C5"],
      [b(28, 2), 0.5, "G5"],
      [b(28, 2.5), 0.5, "F5"],
      [b(28, 3), 0.5, "E5"],
      [b(28, 3.5), 0.5, "C5"],
      // video m29
      [b(29, 0), 0.5, "D5"],
      [b(29, 0.5), 1, "C5"],
      [b(29, 1.5), 0.5, "D5"],
      [b(29, 2), 1.5, "E5"],
      [b(29, 3.5), 0.5, "E4"],
      // video m30
      [b(30, 0), 1.25, "E5"],
      [b(30, 1.25), 0.25, "B4"],
      [b(30, 1.75), 0.25, "E4"],
      [b(30, 2), 1.5, "B4"],
      [b(30, 3.5), 0.5, "G4"],
      // video m31
      [b(31, 0), 1, "C5"],
      [b(31, 1), 0.25, "A4"],
      [b(31, 1.25), 0.25, "C5"],
      [b(31, 1.75), 0.25, "D5"],
      [b(31, 2), 1.5, "E5"],
      [b(31, 3.5), 0.5, "E4"],
      // video m32
      [b(32, 0), 1.25, "E5"],
      [b(32, 1.25), 0.5, "B4"],
      [b(32, 1.75), 0.25, "E4"],
      [b(32, 2), 1.5, "B4"],
      [b(32, 3.5), 0.5, "G4"],
      // video m33
      [b(33, 0), 1, "C5"],
      [b(33, 1), 0.5, "A4"],
      [b(33, 1.75), 0.25, "C5"],
      [b(33, 2), 1, "B4"],
      [b(33, 2), 1, "D5"],
      [b(33, 3), 0.25, "C5"],
      [b(33, 3.25), 0.25, "B4"],
      [b(33, 3.5), 1, "C5"],
      // video m34
      [b(34, 0.5), 0.25, "E6"],
      [b(34, 0.75), 0.25, "F6"],
      [b(34, 1.25), 0.25, "A6"],
      [b(34, 1.5), 0.5, "G6"],
      [b(34, 2.5), 0.25, "F#6"],
      [b(34, 2.75), 0.25, "E6"],
      [b(34, 3), 0.5, "C6"],
      [b(34, 3.5), 0.5, "G5"],
      // video m35 — completed from part 2 (part 1 RH was empty)
      [b(35, 0.5), 0.25, "A5"],
      [b(35, 0.75), 0.25, "B5"],
      [b(35, 1), 0.25, "C6"],
      [b(35, 1.25), 0.25, "D6"],
      [b(35, 1.5), 0.25, "C6"],
      [b(35, 2.25), 0.25, "F5"],
      [b(35, 2.5), 0.25, "G5"],
      [b(35, 2.75), 0.25, "A5"],
      [b(35, 3), 0.25, "B5"],
      [b(35, 3.25), 0.25, "C6"],
      [b(35, 3.5), 0.5, "D6"],
      // video m36
      [b(36, 0), 1, "C4"],
      [b(36, 1), 0.5, "E4"],
      [b(36, 1.5), 0.5, "F4"],
      [b(36, 2), 2, "G4"],
      // video m37
      [b(37, 0), 0.5, "A4"],
      [b(37, 0.5), 0.5, "B4"],
      [b(37, 1), 0.5, "C5"],
      [b(37, 1.5), 0.5, "A4"],
      [b(37, 2), 2, "G4"],
      // video m38
      [b(38, 0), 0.5, "A4"],
      [b(38, 0.5), 0.5, "B4"],
      [b(38, 1), 0.5, "C5"],
      [b(38, 1.5), 0.5, "A4"],
      [b(38, 2), 1, "G4"],
      [b(38, 3), 1, "C4"],
      // video m39
      [b(39, 0), 1, "C4"],
      [b(39, 1), 0.5, "E4"],
      [b(39, 1.5), 0.5, "C4"],
      [b(39, 2), 2, "D4"],
      // video m40
      [b(40, 0), 1, "C4"],
      [b(40, 1), 0.5, "E4"],
      [b(40, 1.5), 0.5, "F4"],
      [b(40, 2), 2, "G4"],
      // video m41
      [b(41, 0), 0.5, "A4"],
      [b(41, 0.5), 0.5, "B4"],
      [b(41, 1), 0.5, "C5"],
      [b(41, 1.5), 0.5, "A4"],
      [b(41, 2), 2, "G4"],
      // video m42
      [b(42, 0), 0.5, "A4"],
      [b(42, 0.5), 0.5, "B4"],
      [b(42, 1), 0.5, "C5"],
      [b(42, 1.5), 0.5, "D5"],
      [b(42, 2), 0.5, "C5"],
      [b(42, 2.5), 0.5, "G4"],
      [b(42, 3), 0.5, "E4"],
      [b(42, 3.5), 0.5, "C4"],
      // video m43
      [b(43, 0), 0.5, "C4"],
      [b(43, 0.5), 1, "E4"],
      [b(43, 1.5), 0.5, "D4"],
      [b(43, 2), 2, "C4"],
      // video m44
      [b(44, 0), 1, "C4"],
      [b(44, 1.5), 0.5, "G4"],
      [b(44, 2), 0.5, "F4"],
      [b(44, 2.5), 1, "E4"],
      [b(44, 3.5), 0.5, "D4"],
      // video m45 — RH gap after C4 until E4 on beat 2 left as rest
      [b(45, 0), 0.5, "C4"],
      [b(45, 2), 2.5, "E4"],
      // video m46
      [b(46, 0.5), 0.5, "E5"],
      [b(46, 1), 0.5, "D5"],
      [b(46, 1.5), 0.5, "B4"],
      [b(46, 2), 0.5, "C5"],
      [b(46, 2.5), 0.5, "G4"],
      [b(46, 3), 0.5, "F4"],
      [b(46, 3.5), 0.5, "E4"],
      // video m47
      [b(47, 0), 0.5, "F4"],
      [b(47, 0.5), 1, "E4"],
      [b(47, 1.5), 0.5, "C4"],
      [b(47, 2), 2, "D4"],
      [b(47, 3.5), 0.25, "E4"],
      // video m48
      [b(48, 0), 1, "C4"],
      [b(48, 1), 1, "E4"],
      [b(48, 1.75), 0.25, "F4"],
      [b(48, 2), 1.5, "G4"],
      [b(48, 3.5), 0.5, "C4"],
      // video m49
      [b(49, 0), 0.5, "C4"],
      [b(49, 0.5), 0.5, "A4"],
      [b(49, 1), 0.5, "G4"],
      [b(49, 1.5), 0.5, "F4"],
      [b(49, 2), 1, "E4"],
      [b(49, 2), 0.5, "A4"],
      [b(49, 2.5), 0.5, "B4"],
      [b(49, 3), 0.5, "C5"],
      [b(49, 3.5), 0.5, "D5"],
      // video m50
      [b(50, 0), 1.75, "E4"],
      [b(50, 1.75), 0.25, "F4"],
      [b(50, 2), 1, "G4"],
      [b(50, 3), 0.5, "E4"],
      [b(50, 3.5), 0.5, "F4"],
      // video m51 — RH gap after opening G4 until the late F–G–A–B–C 16th run left as rest
      [b(51, 0), 0.5, "G4"],
      [b(51, 2.5), 0.25, "F4"],
      [b(51, 2.75), 0.25, "G4"],
      [b(51, 3), 0.25, "A4"],
      [b(51, 3.25), 0.25, "B4"],
      [b(51, 3.5), 0.5, "C5"],
      // video m52
      [b(52, 0), 3, "F4"],
      [b(52, 0), 3, "D5"],
      [b(52, 2.75), 0.5, "G4"],
      [b(52, 3.5), 0.5, "C5"],
      // video m53
      [b(53, 0), 1, "E5"],
      [b(53, 1), 0.5, "G4"],
      [b(53, 1.5), 0.5, "C5"],
      [b(53, 2), 0.5, "E5"],
      [b(53, 2.5), 0.5, "D5"],
      [b(53, 3), 0.5, "C5"],
      [b(53, 3.5), 0.5, "A4"],
      // video m54
      [b(54, 0), 0.5, "B4"],
      [b(54, 0.5), 0.5, "A4"],
      [b(54, 1), 0.25, "G4"],
      [b(54, 1.25), 0.5, "C5"],
      [b(54, 1.75), 0.25, "F#5"],
      [b(54, 2), 1, "E5"],
      [b(54, 3), 0.5, "G4"],
      [b(54, 3.5), 0.5, "C5"],
      // video m55
      [b(55, 0), 1, "E5"],
      [b(55, 1), 0.5, "G4"],
      [b(55, 1.5), 0.5, "C5"],
      [b(55, 2), 0.5, "G5"],
      [b(55, 2.5), 0.5, "F5"],
      [b(55, 3), 0.5, "E5"],
      [b(55, 3.5), 0.5, "C5"],
      // video m56
      [b(56, 0), 0.5, "D5"],
      [b(56, 0.5), 1, "C5"],
      [b(56, 1.5), 0.5, "D5"],
      [b(56, 2), 1.5, "E5"],
      [b(56, 3.5), 0.5, "E4"],
      // video m57
      [b(57, 0), 1.25, "E5"],
      [b(57, 1.25), 0.5, "B4"],
      [b(57, 1.75), 0.25, "E4"],
      [b(57, 2), 1.5, "B4"],
      [b(57, 3.5), 0.5, "G4"],
      // video m58
      [b(58, 0), 1, "C5"],
      [b(58, 1), 0.25, "A4"],
      [b(58, 1.25), 0.5, "C5"],
      [b(58, 1.75), 0.25, "D5"],
      [b(58, 2), 1.5, "E5"],
      [b(58, 3.5), 0.5, "E4"],
      // video m59
      [b(59, 0), 1.25, "E5"],
      [b(59, 1.25), 0.5, "B4"],
      [b(59, 1.75), 0.25, "E4"],
      [b(59, 2), 1.5, "B4"],
      [b(59, 3.5), 0.5, "G4"],
      // video m60
      [b(60, 0), 1, "C5"],
      [b(60, 1), 0.5, "A4"],
      [b(60, 1.75), 0.25, "C5"],
      [b(60, 2), 1, "B4"],
      [b(60, 2), 1, "D5"],
      [b(60, 3), 0.5, "G4"],
      [b(60, 3.5), 0.5, "C5"],
      // video m61
      [b(61, 0), 1, "E5"],
      [b(61, 1), 0.5, "G4"],
      [b(61, 1.5), 0.5, "C5"],
      [b(61, 2), 0.5, "E5"],
      [b(61, 2.5), 0.5, "D5"],
      [b(61, 3), 0.5, "C5"],
      [b(61, 3.5), 0.5, "A4"],
      // video m62
      [b(62, 0), 0.5, "B4"],
      [b(62, 0.5), 0.5, "A4"],
      [b(62, 1), 0.25, "G4"],
      [b(62, 1.25), 0.5, "C5"],
      [b(62, 1.75), 0.25, "F5"],  // letter F, x on F5/F#5 boundary; part 3 decision = F5
      [b(62, 2), 1, "E5"],
      [b(62, 3), 0.5, "G4"],
      [b(62, 3.5), 0.5, "C5"],
      // video m63
      [b(63, 0), 1, "E5"],
      [b(63, 1), 0.5, "G4"],
      [b(63, 1.5), 0.5, "C5"],
      [b(63, 2), 0.5, "G5"],
      [b(63, 2.5), 0.5, "F5"],
      [b(63, 3), 0.5, "E5"],
      [b(63, 3.5), 0.5, "C5"],
      // video m64
      [b(64, 0), 0.25, "D5"],
      [b(64, 0.25), 0.75, "C5"],
      [b(64, 1), 0.25, "D5"],
      [b(64, 1.25), 0.25, "E5"],
      [b(64, 1.75), 0.25, "F5"],  // letter F, same F5/F#5 boundary case as m62; part 3 decision = F5
      [b(64, 2), 1.5, "E5"],
      [b(64, 3.5), 0.5, "E4"],
      // video m65
      [b(65, 0), 1.25, "E5"],
      [b(65, 1.25), 0.5, "B4"],
      [b(65, 1.75), 0.25, "E4"],
      [b(65, 2), 1.5, "B4"],
      [b(65, 3.5), 0.5, "G4"],
      // video m66
      [b(66, 0), 1, "C5"],
      [b(66, 1), 0.25, "C5"],
      [b(66, 1.25), 0.5, "A4"],
      [b(66, 1.75), 0.25, "C5"],
      [b(66, 2), 1.5, "G4"],
      [b(66, 3.5), 0.5, "E4"],
      // video m67
      [b(67, 0), 1.25, "A4"],
      [b(67, 1.25), 0.5, "B4"],
      [b(67, 1.75), 0.25, "C5"],
      [b(67, 2), 1, "G4"],
      [b(67, 3), 1, "C5"],
      // video m68 — 2/4
      [b(68, 0), 0.5, "F4"],
      [b(68, 0.5), 0.5, "G4"],
      [b(68, 1), 0.5, "A4"],
      [b(68, 1.5), 0.5, "F4"],
      // video m69
      [b(69, 0), 3, "B3"],
      [b(69, 0), 3, "D4"],
      [b(69, 3.5), 0.5, "C4"],
      // video m70
      [b(70, 0.5), 0.25, "E6"],
      [b(70, 0.75), 0.25, "F6"],
      [b(70, 1), 0.5, "G6"],
      [b(70, 1.5), 0.5, "E6"],
      [b(70, 2), 2, "D6"],
      // video m71
      [b(71, 0.5), 0.25, "A5"],
      [b(71, 0.75), 0.25, "B5"],
      [b(71, 1), 0.5, "C6"],
      [b(71, 1.5), 0.5, "A5"],
      [b(71, 2), 0.5, "B5"],
      [b(71, 2.5), 0.5, "C6"],
      [b(71, 3), 1, "D6"],
      // video m72
      [b(72, 0), 1, "C4"],
      [b(72, 1), 1, "E4"],
      [b(72, 2), 2, "G4"],
      // video m73
      [b(73, 0), 0.5, "A4"],
      [b(73, 0.5), 0.5, "B4"],
      [b(73, 1), 0.75, "C5"],
      [b(73, 1.75), 0.25, "A4"],
      [b(73, 2), 2, "G4"],
      // video m74
      [b(74, 0), 0.5, "A4"],
      [b(74, 0.5), 0.5, "B4"],
      [b(74, 1), 0.5, "C5"],
      [b(74, 1.5), 0.5, "A4"],
      [b(74, 2), 1, "G4"],
      [b(74, 3), 1, "C4"],
      // video m75
      [b(75, 0.5), 0.5, "F4"],
      [b(75, 1), 0.5, "E4"],
      [b(75, 1.5), 0.5, "C4"],
      [b(75, 2), 2, "D4"],
      // video m76
      [b(76, 0), 1, "C4"],
      [b(76, 1), 1, "E4"],
      [b(76, 2), 2, "G4"],
      // video m77
      [b(77, 0), 0.5, "A4"],
      [b(77, 0.5), 0.5, "B4"],
      [b(77, 1), 0.75, "C5"],
      [b(77, 1.75), 0.25, "A4"],
      [b(77, 2), 2, "G4"],
      // video m78
      [b(78, 0), 0.5, "A4"],
      [b(78, 0.5), 0.5, "B4"],
      [b(78, 1), 0.5, "C5"],
      [b(78, 1.5), 0.5, "D5"],
      [b(78, 2), 0.5, "C5"],
      [b(78, 2.5), 0.5, "G4"],
      [b(78, 3), 0.5, "E4"],
      [b(78, 3.5), 0.5, "C4"],
      // video m79 — 2/4 (ending rit. begins; app stays at 86 BPM)
      [b(79, 0), 1.5, "E4"],
      [b(79, 1.5), 0.5, "D4"],
      // video m80
      [b(80, 0), 0.5, "C4"],
      [b(80, 0.5), 0.25, "E4"],
      [b(80, 0.75), 0.25, "F#4"],  // keyboard x is F#4; printed letter F (video often omits the sharp). part 3 decision = F#4
      [b(80, 1), 0.5, "G4"],
      [b(80, 1.5), 0.5, "E4"],
      [b(80, 2), 1, "D4"],
      [b(80, 3), 1, "B3"],
      // video m81
      [b(81, 0.5), 0.25, "A3"],
      [b(81, 0.75), 0.25, "B3"],
      [b(81, 1), 0.25, "C4"],
      [b(81, 1.25), 0.5, "A3"],
      [b(81, 1.75), 1.5, "B3"],
      [b(81, 3.25), 0.75, "C4"],
      // video m82 — final held close
      [b(82, 0), 1.5, "E3"],
      [b(82, 0), 1.5, "G3"],
      [b(82, 0), 1.5, "C4"],
      [b(82, 1.5), 0.5, "E3"],
      [b(82, 2), 2, "E4"],
      [b(82, 2), 2, "G4"],
      [b(82, 2), 2, "C5"],
  ]);

  const level3Accompaniment = notes([
      // video m2 — first sounding bar (app beat 0)
      [b(2, 0), 2, "C5"],
      [b(2, 2), 2, "B4"],
      // video m3
      [b(3, 0), 2, "A4"],
      [b(3, 2), 2, "G4"],
      // video m4
      [b(4, 0), 0.5, "C5"],
      [b(4, 0.5), 1.5, "G5"],
      [b(4, 2), 0.5, "B4"],
      [b(4, 2.5), 1.5, "G5"],
      // video m5
      [b(5, 0), 0.5, "A4"],
      [b(5, 0.5), 1.5, "E5"],
      [b(5, 2), 0.5, "G4"],
      [b(5, 2.5), 1.5, "E5"],
      // video m6
      [b(6, 0), 0.5, "C3"],
      [b(6, 1), 0.5, "B2"],
      [b(6, 1.5), 0.5, "G3"],
      [b(6, 2), 2, "B3"],
      [b(6, 2.25), 0.25, "A#2"],  // marked uncertain in part 1; kept as B–A#–A passing tone
      [b(6, 2.5), 0.5, "G3"],
      [b(6, 3), 0.5, "A2"],
      // video m7
      [b(7, 0), 0.5, "A2"],
      [b(7, 0.5), 0.5, "E3"],
      [b(7, 1), 1, "A3"],
      [b(7, 2), 0.5, "G2"],
      [b(7, 2.5), 0.5, "E3"],
      [b(7, 3), 1, "G3"],
      // video m8
      [b(8, 0), 0.5, "F2"],
      [b(8, 0.5), 0.5, "C3"],
      [b(8, 1), 1, "F3"],
      [b(8, 2), 0.5, "E2"],
      [b(8, 2.5), 0.5, "C3"],
      [b(8, 3), 1, "E3"],
      // video m9
      [b(9, 0), 0.5, "D2"],
      [b(9, 0.5), 0.5, "A2"],
      [b(9, 1), 1, "D3"],
      [b(9, 2), 0.5, "G2"],
      [b(9, 2.5), 0.5, "D3"],
      [b(9, 3), 0.5, "A3"],
      [b(9, 3.5), 0.5, "G3"],
      // video m10
      [b(10, 0), 0.5, "C3"],
      [b(10, 0.5), 1.5, "G3"],
      [b(10, 2), 0.5, "B2"],
      [b(10, 2.5), 0.5, "G3"],
      [b(10, 3), 1, "B3"],
      // video m11
      [b(11, 0), 0.5, "A2"],
      [b(11, 0.5), 0.5, "E3"],
      [b(11, 1), 1, "A3"],
      [b(11, 2), 0.5, "G2"],
      [b(11, 2.5), 0.5, "E3"],
      [b(11, 3), 1, "G3"],
      // video m12
      [b(12, 0), 0.75, "F2"],  // part 1 marked F#2 uncertain; letter F / same shape as m8, encoded F2
      [b(12, 0.75), 0.5, "C3"],
      [b(12, 1.25), 1.25, "F3"],
      [b(12, 2.5), 0.75, "E2"],
      [b(12, 3.25), 0.5, "C3"],
      [b(12, 3.75), 1.25, "E3"],
      // video m13
      [b(13, 1.5), 0.75, "F2"],  // part 1 had F#2+F2; screenshot shows one F, F#2 omitted
      [b(13, 1.75), 0.75, "C3"],
      [b(13, 2.5), 0.75, "G2"],
      [b(13, 3.5), 0.5, "D3"],
      // video m14
      [b(14, 0), 0.5, "C3"],
      [b(14, 0.5), 1.5, "G3"],
      [b(14, 1.75), 0.5, "C4"],
      [b(14, 2.5), 0.5, "G3"],
      [b(14, 2.75), 0.5, "B2"],
      [b(14, 3.25), 0.75, "G3"],
      // video m15
      [b(15, 0), 0.5, "A2"],
      [b(15, 0.5), 0.5, "E3"],
      [b(15, 1), 1, "A3"],
      [b(15, 2), 0.5, "E2"],
      [b(15, 2.5), 0.5, "B2"],
      [b(15, 3), 0.5, "E3"],
      [b(15, 3.5), 0.5, "G3"],
      // video m16
      [b(16, 0), 0.5, "F#2"],
      [b(16, 0.5), 0.5, "C3"],
      [b(16, 1), 0.5, "G2"],
      [b(16, 1.5), 0.5, "D3"],
      [b(16, 2), 0.5, "C3"],
      [b(16, 2.5), 0.5, "G3"],
      [b(16, 3), 0.5, "B2"],
      [b(16, 3.5), 0.5, "G3"],
      // video m17
      [b(17, 0), 0.5, "A2"],
      [b(17, 0.5), 0.5, "E3"],
      [b(17, 1), 1, "A3"],
      [b(17, 2), 0.5, "G2"],
      [b(17, 2.5), 0.5, "E3"],
      [b(17, 3), 1, "G3"],
      // video m18
      [b(18, 0), 0.5, "F2"],
      [b(18, 0.5), 0.5, "C3"],
      [b(18, 1), 1, "F3"],
      [b(18, 2), 0.5, "G2"],
      [b(18, 2.5), 0.5, "D3"],
      [b(18, 3), 1.5, "G#2"],
      [b(18, 3), 1, "E3"],
      // video m19
      [b(19, 0.5), 0.5, "E3"],
      [b(19, 1), 1, "A3"],
      [b(19, 2), 0.5, "E2"],
      [b(19, 2.5), 0.5, "B2"],
      [b(19, 3), 0.5, "E3"],
      [b(19, 3.5), 0.5, "G3"],
      // video m20
      [b(20, 0), 0.5, "F#2"],
      [b(20, 0.75), 0.5, "C3"],
      [b(20, 1.25), 1.5, "F3"],
      [b(20, 2.5), 5.5, "F#3"],
      [b(20, 2.75), 5.25, "F#2"],
      // video m21
      [b(21, 3.75), 2.75, "A3"],
      // video m22
      [b(22, 0), 2, "F3"],
      [b(22, 2), 2, "E3"],
      [b(22, 2), 2, "G3"],
      // video m23
      [b(23, 0), 2, "D3"],
      [b(23, 0), 2, "C4"],
      [b(23, 2), 2, "G2"],
      [b(23, 2), 2, "G3"],
      // video m24
      [b(24, 0), 0.5, "C3"],
      [b(24, 0.5), 2.5, "G3"],
      [b(24, 3), 1, "C3"],
      // video m25
      [b(25, 0), 0.5, "F#2"],
      [b(25, 0.5), 0.5, "C3"],
      [b(25, 1), 0.5, "G2"],
      [b(25, 1), 1, "F3"],
      [b(25, 1.5), 0.5, "D3"],
      [b(25, 2), 0.5, "G3"],
      [b(25, 2.5), 0.5, "G2"],
      [b(25, 3), 0.5, "C3"],
      [b(25, 3.5), 0.5, "G2"],
      [b(25, 3.5), 0.5, "G3"],
      // video m26
      [b(26, 0), 1, "C3"],
      [b(26, 0), 0.5, "C4"],
      [b(26, 0.5), 0.5, "G3"],
      [b(26, 1), 0.5, "C4"],
      [b(26, 1.5), 0.5, "C3"],
      [b(26, 2), 0.5, "F2"],
      [b(26, 2.5), 0.5, "C3"],
      [b(26, 3), 1, "F3"],
      // video m27
      [b(27, 0), 0.5, "G2"],
      [b(27, 0.5), 0.5, "D3"],
      [b(27, 1), 1, "G3"],
      [b(27, 2), 0.5, "C3"],
      [b(27, 2.5), 0.5, "G3"],
      [b(27, 3), 0.5, "B2"],
      [b(27, 3.5), 0.5, "G3"],
      // video m28
      [b(28, 0), 0.5, "A2"],
      [b(28, 0.5), 0.5, "E3"],
      [b(28, 1), 1, "A3"],
      [b(28, 2), 0.5, "D2"],
      [b(28, 2.5), 0.5, "A2"],
      [b(28, 3), 0.5, "D3"],
      [b(28, 3.5), 0.5, "F3"],
      // video m29
      [b(29, 0), 0.5, "G2"],
      [b(29, 0.5), 0.5, "D3"],
      [b(29, 1), 1, "G3"],
      [b(29, 2), 0.5, "C3"],
      [b(29, 2.5), 0.5, "G3"],
      [b(29, 3), 0.5, "B2"],
      [b(29, 3.5), 0.5, "G3"],
      // video m30
      [b(30, 0), 0.5, "A2"],
      [b(30, 0.5), 0.5, "E3"],
      [b(30, 1), 1, "A3"],
      [b(30, 2), 0.5, "E2"],
      [b(30, 2.5), 0.5, "B2"],
      [b(30, 3), 1, "E3"],
      // video m31
      [b(31, 0), 0.5, "D2"],
      [b(31, 0.5), 0.5, "A2"],
      [b(31, 1), 0.5, "D3"],
      [b(31, 1.5), 0.5, "F3"],
      [b(31, 2), 0.5, "C3"],
      [b(31, 2.5), 0.5, "G3"],
      [b(31, 3), 0.5, "B2"],
      [b(31, 3.5), 0.5, "G3"],
      // video m32
      [b(32, 0), 0.5, "A2"],
      [b(32, 0.5), 0.5, "E3"],
      [b(32, 1), 1, "A3"],
      [b(32, 2), 0.5, "E2"],
      [b(32, 2.5), 0.5, "B2"],
      [b(32, 3), 1, "E3"],
      // video m33
      [b(33, 0), 0.5, "F2"],
      [b(33, 0.5), 0.5, "C3"],
      [b(33, 1), 1, "F3"],
      [b(33, 2), 0.5, "G2"],
      [b(33, 2.5), 0.5, "D3"],
      [b(33, 3), 1, "G3"],
      // video m34
      [b(34, 0), 2, "C4"],
      [b(34, 2), 2, "B3"],
      // video m35 — completed from part 2 (part 1 RH was empty)
      [b(35, 0), 2, "A3"],
      [b(35, 2), 2, "G3"],
      // video m36
      [b(36, 0), 0.5, "C3"],
      [b(36, 0.5), 1.5, "G3"],
      [b(36, 2), 0.5, "B2"],
      [b(36, 2.5), 0.5, "G3"],
      [b(36, 3), 1, "B3"],
      // video m37
      [b(37, 0), 0.5, "A2"],
      [b(37, 0.5), 0.5, "E3"],
      [b(37, 1), 1, "A3"],
      [b(37, 2), 0.5, "G2"],
      [b(37, 2.5), 0.5, "E3"],
      [b(37, 3), 1, "G3"],
      // video m38
      [b(38, 0), 0.5, "F2"],
      [b(38, 0.5), 0.5, "C3"],
      [b(38, 1), 1, "F3"],
      [b(38, 2), 0.5, "E2"],
      [b(38, 2.5), 0.5, "C3"],
      [b(38, 3), 1, "E3"],
      // video m39
      [b(39, 0), 0.5, "D2"],
      [b(39, 0.5), 0.5, "A2"],
      [b(39, 1), 1, "D3"],
      [b(39, 2), 0.5, "G2"],
      [b(39, 2.5), 0.5, "D3"],
      [b(39, 3), 0.5, "A3"],
      [b(39, 3.5), 0.5, "G3"],
      // video m40
      [b(40, 0), 0.5, "C3"],
      [b(40, 0.5), 0.5, "G3"],
      [b(40, 1), 0.5, "C4"],
      [b(40, 1.5), 0.5, "G3"],
      [b(40, 2), 0.5, "B2"],
      [b(40, 2.5), 0.5, "G3"],
      [b(40, 3), 1, "B3"],
      // video m41
      [b(41, 0), 0.5, "A2"],
      [b(41, 0.5), 0.5, "E3"],
      [b(41, 1), 0.5, "A3"],
      [b(41, 1.5), 0.5, "E3"],
      [b(41, 2), 0.5, "E2"],
      [b(41, 2.5), 0.5, "B2"],
      [b(41, 3), 1, "E3"],
      // video m42
      [b(42, 0), 0.5, "F2"],
      [b(42, 0.5), 0.5, "C3"],
      [b(42, 1), 1, "F3"],
      [b(42, 2), 0.5, "E2"],
      [b(42, 2.5), 0.5, "C3"],
      [b(42, 3), 1, "E3"],
      // video m43
      [b(43, 0), 0.5, "F2"],
      [b(43, 0.5), 0.5, "C3"],
      [b(43, 1), 0.5, "G2"],
      [b(43, 1.5), 0.5, "D3"],
      [b(43, 2), 0.5, "C3"],
      [b(43, 2.5), 0.5, "G3"],
      [b(43, 3), 0.5, "B2"],
      [b(43, 3.5), 0.5, "G3"],
      // video m44
      [b(44, 0), 0.5, "A2"],
      [b(44, 0.5), 0.5, "E3"],
      [b(44, 1), 0.5, "A3"],
      [b(44, 1.5), 0.5, "A2"],
      [b(44, 2), 0.5, "E2"],
      [b(44, 2.5), 0.5, "B2"],
      [b(44, 3), 0.5, "E3"],
      [b(44, 3.5), 0.5, "E2"],
      // video m45 — RH gap after C4 until E4 on beat 2 left as rest
      [b(45, 0), 0.5, "F2"],
      [b(45, 0.5), 0.5, "C3"],
      [b(45, 1), 0.5, "G2"],
      [b(45, 1.5), 0.5, "D3"],
      [b(45, 2), 0.5, "C3"],
      [b(45, 2.5), 0.5, "G3"],
      [b(45, 3), 0.5, "B2"],
      [b(45, 3.5), 0.5, "G3"],
      // video m46
      [b(46, 0), 0.5, "A2"],
      [b(46, 0.5), 0.5, "E3"],
      [b(46, 1), 0.5, "A3"],
      [b(46, 1.5), 0.5, "A2"],
      [b(46, 2), 0.5, "G2"],
      [b(46, 2.5), 0.5, "E3"],
      [b(46, 3), 0.5, "G3"],
      [b(46, 3.5), 0.5, "G2"],
      // video m47
      [b(47, 0), 0.5, "F2"],
      [b(47, 0.5), 0.5, "C3"],
      [b(47, 1), 0.5, "F3"],
      [b(47, 1.5), 0.5, "F2"],
      [b(47, 2), 0.5, "G2"],
      [b(47, 2.5), 0.5, "D3"],
      [b(47, 3), 1, "Ab2"],
      [b(47, 3), 1, "E3"],
      // video m48
      [b(48, 0), 0.5, "A2"],
      [b(48, 0.5), 0.5, "E3"],
      [b(48, 1), 0.75, "A3"],
      [b(48, 1.5), 0.5, "A2"],
      [b(48, 2), 0.5, "E2"],
      [b(48, 2.5), 0.5, "B2"],
      [b(48, 3), 0.5, "E3"],
      [b(48, 3.5), 0.5, "G3"],
      // video m49
      [b(49, 0), 0.5, "F2"],
      [b(49, 0.5), 0.5, "C3"],
      [b(49, 1), 0.5, "F3"],
      [b(49, 1.5), 0.5, "F2"],
      [b(49, 2.5), 0.5, "C3"],
      [b(49, 3), 1, "F#3"],
      // video m50
      [b(50, 0), 0.5, "F2"],
      [b(50, 0.5), 0.5, "C3"],
      [b(50, 1), 0.5, "F3"],
      [b(50, 1.5), 0.5, "F2"],
      [b(50, 2), 0.5, "E2"],
      [b(50, 2.5), 0.5, "C3"],
      [b(50, 3), 1, "E3"],
      // video m51 — RH gap after opening G4 until the late F–G–A–B–C 16th run left as rest
      [b(51, 0), 0.5, "D2"],
      [b(51, 0.5), 0.5, "A2"],
      [b(51, 1), 1.5, "D3"],
      [b(51, 2.5), 0.5, "A2"],
      [b(51, 3), 0.5, "D3"],
      [b(51, 3.5), 0.5, "D2"],
      // video m52
      [b(52, 0), 0.5, "G2"],
      [b(52, 0.5), 0.5, "D3"],
      [b(52, 1), 0.5, "F3"],
      [b(52, 1.5), 0.5, "A3"],
      [b(52, 2), 0.5, "C4"],
      [b(52, 2.5), 0.5, "B3"],
      [b(52, 2.75), 0.5, "G3"],
      [b(52, 3.5), 0.5, "G2"],
      // video m53
      [b(53, 0), 0.5, "C3"],
      [b(53, 0.5), 0.5, "G3"],
      [b(53, 1), 0.5, "C4"],
      [b(53, 1.5), 0.5, "C3"],
      [b(53, 2), 0.5, "F2"],
      [b(53, 2.5), 0.5, "C3"],
      [b(53, 3), 1, "F3"],
      // video m54
      [b(54, 0), 0.5, "G2"],
      [b(54, 0.5), 0.5, "D3"],
      [b(54, 1), 1, "G3"],
      [b(54, 2), 0.5, "C3"],
      [b(54, 2.5), 0.5, "G3"],
      [b(54, 3), 0.5, "B2"],
      [b(54, 3.5), 0.5, "G3"],
      // video m55
      [b(55, 0), 0.5, "A2"],
      [b(55, 0.5), 0.5, "E3"],
      [b(55, 1), 1, "A3"],
      [b(55, 2), 0.5, "D2"],
      [b(55, 2.5), 0.5, "A2"],
      [b(55, 3), 0.5, "D3"],
      [b(55, 3.5), 0.5, "F3"],
      // video m56
      [b(56, 0), 0.5, "G2"],
      [b(56, 0.5), 0.5, "D3"],
      [b(56, 1), 1, "G3"],
      [b(56, 2), 0.5, "C3"],
      [b(56, 2.5), 0.5, "G3"],
      [b(56, 3), 0.5, "B2"],
      [b(56, 3.5), 0.5, "G3"],
      // video m57
      [b(57, 0), 0.5, "A2"],
      [b(57, 0.5), 0.5, "E3"],
      [b(57, 1), 1, "A3"],
      [b(57, 2), 0.5, "E2"],
      [b(57, 2.5), 0.5, "B2"],
      [b(57, 3), 1, "E3"],
      // video m58
      [b(58, 0), 0.5, "D2"],
      [b(58, 0.5), 0.5, "A2"],
      [b(58, 1), 0.5, "D3"],
      [b(58, 1.5), 0.5, "F3"],
      [b(58, 2), 0.5, "C3"],
      [b(58, 2.5), 0.5, "G3"],
      [b(58, 3), 0.5, "B2"],
      [b(58, 3.5), 0.5, "G3"],
      // video m59
      [b(59, 0), 0.5, "A2"],
      [b(59, 0.5), 0.5, "E3"],
      [b(59, 1), 1, "A3"],
      [b(59, 2), 0.5, "E2"],
      [b(59, 2.5), 0.5, "B2"],
      [b(59, 3), 1, "E3"],
      // video m60
      [b(60, 0), 0.5, "F2"],
      [b(60, 0.5), 0.5, "C3"],
      [b(60, 1), 1, "F3"],
      [b(60, 2), 0.5, "G2"],
      [b(60, 2.5), 0.5, "D3"],
      [b(60, 3), 0.5, "G3"],
      [b(60, 3.5), 0.5, "G2"],
      // video m61
      [b(61, 0), 0.5, "C3"],
      [b(61, 0.5), 0.5, "G3"],
      [b(61, 1), 0.5, "C4"],
      [b(61, 1.5), 0.5, "C3"],
      [b(61, 2), 0.5, "F2"],
      [b(61, 2.5), 0.5, "C3"],
      [b(61, 3), 0.75, "F3"],
      [b(61, 3.5), 0.5, "F2"],
      // video m62
      [b(62, 0), 0.5, "G2"],
      [b(62, 0.5), 0.5, "D3"],
      [b(62, 1), 0.5, "G3"],
      [b(62, 1.5), 0.5, "G2"],
      [b(62, 2), 0.5, "C3"],
      [b(62, 2.5), 0.5, "G3"],
      [b(62, 3), 0.5, "B2"],
      [b(62, 3.5), 0.5, "G3"],
      // video m63
      [b(63, 0), 0.5, "A2"],
      [b(63, 0.5), 0.5, "E3"],
      [b(63, 1), 0.5, "A3"],
      [b(63, 1.5), 0.5, "A2"],
      [b(63, 2), 0.5, "D2"],
      [b(63, 2.5), 0.5, "A2"],
      [b(63, 3), 0.5, "D3"],
      [b(63, 3.5), 0.5, "F3"],
      // video m64
      [b(64, 0), 0.5, "G2"],
      [b(64, 0.5), 0.5, "D3"],
      [b(64, 1), 0.5, "G3"],
      [b(64, 1.5), 0.5, "G2"],
      [b(64, 2), 0.5, "C3"],
      [b(64, 2.5), 0.5, "G3"],
      [b(64, 3), 0.5, "B2"],
      [b(64, 3.5), 0.5, "G3"],
      // video m65
      [b(65, 0), 0.5, "A2"],
      [b(65, 0.5), 0.5, "E3"],
      [b(65, 1), 0.5, "A3"],
      [b(65, 1.5), 0.5, "A2"],
      [b(65, 2), 0.5, "E2"],
      [b(65, 2.5), 0.5, "B2"],
      [b(65, 3), 0.5, "E3"],
      [b(65, 3.5), 0.5, "G3"],
      // video m66
      [b(66, 0), 0.5, "D2"],
      [b(66, 0.5), 0.5, "A2"],
      [b(66, 1), 0.5, "D3"],
      [b(66, 1.5), 0.5, "F3"],
      [b(66, 2), 0.5, "C3"],
      [b(66, 2.5), 0.5, "G3"],
      [b(66, 3), 0.5, "B2"],
      [b(66, 3.5), 0.5, "G3"],
      // video m67
      [b(67, 0), 0.5, "A2"],
      [b(67, 0.5), 0.5, "E3"],
      [b(67, 1), 0.5, "A3"],
      [b(67, 1.5), 0.5, "A2"],
      [b(67, 2), 0.5, "E2"],
      [b(67, 2.5), 0.5, "B2"],
      [b(67, 3), 0.5, "E3"],
      [b(67, 3.5), 0.5, "G3"],
      // video m68 — 2/4
      [b(68, 0), 0.5, "F2"],
      [b(68, 0.5), 0.5, "C3"],
      [b(68, 1), 0.5, "F3"],
      [b(68, 1.5), 0.5, "F2"],
      // video m69
      [b(69, 0), 3, "G2"],
      [b(69, 0), 3, "G3"],
      // video m70
      [b(70, 0), 0.5, "C3"],
      [b(70, 0.5), 1.5, "G3"],
      [b(70, 2), 0.5, "B3"],
      [b(70, 2.5), 1.5, "G4"],
      // video m71
      [b(71, 0), 0.5, "A3"],
      [b(71, 0.5), 1.5, "G4"],
      [b(71, 2), 0.5, "G3"],
      [b(71, 2.5), 1.5, "G4"],
      // video m72
      [b(72, 0), 0.5, "C3"],
      [b(72, 0.5), 1.5, "G3"],
      [b(72, 2), 0.5, "B2"],
      [b(72, 2.5), 0.5, "G3"],
      [b(72, 3), 1, "B3"],
      // video m73
      [b(73, 0), 0.5, "A2"],
      [b(73, 0.5), 0.5, "E3"],
      [b(73, 1), 1, "A3"],
      [b(73, 2), 0.5, "G2"],
      [b(73, 2.5), 0.5, "E3"],
      [b(73, 3), 1, "G3"],
      // video m74
      [b(74, 0), 0.5, "F2"],
      [b(74, 0.5), 0.5, "C3"],
      [b(74, 1), 1, "F3"],
      [b(74, 2), 0.5, "E2"],
      [b(74, 2.5), 0.5, "C3"],
      [b(74, 3), 1, "E3"],
      // video m75
      [b(75, 0), 0.5, "D2"],
      [b(75, 0.5), 0.5, "A2"],
      [b(75, 1), 1, "D3"],
      [b(75, 2), 0.5, "G2"],
      [b(75, 2.5), 0.5, "D3"],
      [b(75, 3), 0.5, "A3"],
      [b(75, 3.5), 0.5, "G3"],
      // video m76
      [b(76, 0), 0.5, "C3"],
      [b(76, 0.5), 1.5, "G3"],
      [b(76, 2), 0.5, "B2"],
      [b(76, 2.5), 0.5, "G3"],
      [b(76, 3), 1, "B3"],
      // video m77
      [b(77, 0), 0.5, "A2"],
      [b(77, 0.5), 0.5, "E3"],
      [b(77, 1), 1, "A3"],
      [b(77, 2), 0.5, "G2"],
      [b(77, 2.5), 0.5, "E3"],
      [b(77, 3), 1, "G3"],
      // video m78
      [b(78, 0), 0.5, "F2"],
      [b(78, 0.5), 0.5, "C3"],
      [b(78, 1), 1, "F3"],
      [b(78, 2), 0.5, "E2"],
      [b(78, 2.5), 0.5, "C3"],
      [b(78, 3), 1, "E3"],
      // video m79 — 2/4 (ending rit. begins; app stays at 86 BPM)
      [b(79, 0), 0.5, "D2"],
      [b(79, 0.5), 0.5, "A2"],
      [b(79, 1), 1, "G2"],
      [b(79, 1), 1, "G3"],
      // video m80
      [b(80, 0), 0.5, "C2"],
      [b(80, 0.5), 0.5, "G3"],
      [b(80, 1), 0.5, "C4"],
      [b(80, 1.5), 0.5, "C3"],
      [b(80, 2), 0.5, "B2"],
      [b(80, 2.5), 1.5, "G3"],
      // video m81
      [b(81, 0), 0.5, "A2"],
      [b(81, 0.5), 1.25, "F3"],
      [b(81, 1.75), 0.5, "G2"],
      [b(81, 2.25), 0.5, "D3"],
      [b(81, 2.75), 0.5, "G3"],
      [b(81, 3.25), 0.75, "G2"],
      // video m82 — final held close
      [b(82, 0), 0.5, "C2"],
      [b(82, 0.5), 0.5, "C3"],
      [b(82, 1), 0.5, "E3"],
      [b(82, 1.5), 2.5, "G3"],
  ]);

  // Timed lyric slots only — text left empty on purpose (copyright).
  // startBeat marks a sung-like phrase start so the paste box can sync later.
  const level3Lyrics = [
    // Empty slots on 主歌 / 副歌 / 尾聲 bars so chord labels stay visible.
    // No slots on decorative 前奏 (video m2–5) or 間奏 (m34–35, m70–71).
    { startBeat: b(6, 0), text: "" },
    { startBeat: b(7, 0), text: "" },
    { startBeat: b(8, 0), text: "" },
    { startBeat: b(9, 0), text: "" },
    { startBeat: b(10, 0), text: "" },
    { startBeat: b(11, 0), text: "" },
    { startBeat: b(12, 0), text: "" },
    { startBeat: b(13, 0), text: "" },
    { startBeat: b(14, 0), text: "" },
    { startBeat: b(15, 0), text: "" },
    { startBeat: b(16, 0), text: "" },
    { startBeat: b(17, 0), text: "" },
    { startBeat: b(18, 0), text: "" },
    { startBeat: b(19, 0), text: "" },
    { startBeat: b(20, 0), text: "" },
    { startBeat: b(21, 0), text: "" },
    { startBeat: b(22, 0), text: "" },
    { startBeat: b(23, 0), text: "" },
    { startBeat: b(24, 0), text: "" },
    { startBeat: b(25, 0), text: "" },
    { startBeat: b(26, 0), text: "" },
    { startBeat: b(27, 0), text: "" },
    { startBeat: b(28, 0), text: "" },
    { startBeat: b(29, 0), text: "" },
    { startBeat: b(30, 0), text: "" },
    { startBeat: b(31, 0), text: "" },
    { startBeat: b(32, 0), text: "" },
    { startBeat: b(33, 0), text: "" },
    { startBeat: b(36, 0), text: "" },
    { startBeat: b(37, 0), text: "" },
    { startBeat: b(38, 0), text: "" },
    { startBeat: b(39, 0), text: "" },
    { startBeat: b(40, 0), text: "" },
    { startBeat: b(41, 0), text: "" },
    { startBeat: b(42, 0), text: "" },
    { startBeat: b(43, 0), text: "" },
    { startBeat: b(44, 0), text: "" },
    { startBeat: b(45, 0), text: "" },
    { startBeat: b(46, 0), text: "" },
    { startBeat: b(47, 0), text: "" },
    { startBeat: b(48, 0), text: "" },
    { startBeat: b(49, 0), text: "" },
    { startBeat: b(50, 0), text: "" },
    { startBeat: b(51, 0), text: "" },
    { startBeat: b(52, 0), text: "" },
    { startBeat: b(53, 0), text: "" },
    { startBeat: b(54, 0), text: "" },
    { startBeat: b(55, 0), text: "" },
    { startBeat: b(56, 0), text: "" },
    { startBeat: b(57, 0), text: "" },
    { startBeat: b(58, 0), text: "" },
    { startBeat: b(59, 0), text: "" },
    { startBeat: b(60, 0), text: "" },
    { startBeat: b(61, 0), text: "" },
    { startBeat: b(62, 0), text: "" },
    { startBeat: b(63, 0), text: "" },
    { startBeat: b(64, 0), text: "" },
    { startBeat: b(65, 0), text: "" },
    { startBeat: b(66, 0), text: "" },
    { startBeat: b(67, 0), text: "" },
    { startBeat: b(68, 0), text: "" },
    { startBeat: b(69, 0), text: "" },
    { startBeat: b(72, 0), text: "" },
    { startBeat: b(73, 0), text: "" },
    { startBeat: b(74, 0), text: "" },
    { startBeat: b(75, 0), text: "" },
    { startBeat: b(76, 0), text: "" },
    { startBeat: b(77, 0), text: "" },
    { startBeat: b(78, 0), text: "" },
    { startBeat: b(79, 0), text: "" },
    { startBeat: b(80, 0), text: "" },
    { startBeat: b(81, 0), text: "" },
    { startBeat: b(82, 0), text: "" },
  ];

  global.Songs = global.Songs || {};
  global.Songs.shallWeTalk = {
    id: "shallWeTalk",
    title: "Shall We Talk",
    artist: "陳奕迅",
    disclaimer: "練習用編曲（非官方譜）· 跟 LouisLiao Synthesia 簡易教學 · 約 86 BPM，結尾有 rit.",
    key: "C",
    defaultBpm: 86,
    beatsPerBar: 4,
    pickupBeats: 0,
    barLengths: barLengths,
    levels: [
      {
        id: 1,
        name: "Level 1",
        subtitle: "一和弦每四拍",
        progression: level1Chords
      },
      {
        id: 2,
        name: "Level 2",
        subtitle: "左手收成有少少變化的和弦（經過音分析回和弦）",
        progression: level2Chords
      },
      {
        id: 3,
        name: "Level 3",
        subtitle: "跟 Synthesia 教學的編曲（右手旋律 + 左手分解／走位）",
        progression: level3Chords,
        melody: level3Melody,
        accompaniment: level3Accompaniment,
        lyrics: level3Lyrics
      }
    ]
  };
})(window);
