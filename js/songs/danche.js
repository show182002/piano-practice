/* 《單車》陳奕迅 — practice arrangement (not an official score). */
(function (global) {
  function repeat(seq, times) {
    const out = [];
    for (let i = 0; i < times; i++) {
      for (const ev of seq) out.push(Object.assign({}, ev));
    }
    return out;
  }

  // Level 1: 4 beats per primary chord, 8 loops = 32 bars
  const level1Loop = [
    { chord: "C", beats: 4 },
    { chord: "Am", beats: 4 },
    { chord: "F", beats: 4 },
    { chord: "G", beats: 4 }
  ];

  // Level 2: add Em, some 2-bar holds. 16 bars × 2 = 32 bars
  const level2Phrase = [
    { chord: "C", beats: 8 },
    { chord: "Am", beats: 8 },
    { chord: "F", beats: 4 },
    { chord: "G", beats: 4 },
    { chord: "Em", beats: 8 },
    { chord: "C", beats: 4 },
    { chord: "G", beats: 4 },
    { chord: "Am", beats: 4 },
    { chord: "Em", beats: 4 },
    { chord: "F", beats: 8 },
    { chord: "G", beats: 8 }
  ];

  // Level 3: simplified verse / chorus form, 32 bars
  const verse = [
    { section: "主歌", chord: "C", beats: 4 },
    { section: "主歌", chord: "Em", beats: 4 },
    { section: "主歌", chord: "Am", beats: 4 },
    { section: "主歌", chord: "G", beats: 4 },
    { section: "主歌", chord: "F", beats: 4 },
    { section: "主歌", chord: "C", beats: 4 },
    { section: "主歌", chord: "Dm", beats: 4 },
    { section: "主歌", chord: "G", beats: 4 }
  ];
  const chorusA = [
    { section: "副歌", chord: "F", beats: 4 },
    { section: "副歌", chord: "G", beats: 4 },
    { section: "副歌", chord: "Em", beats: 4 },
    { section: "副歌", chord: "Am", beats: 4 },
    { section: "副歌", chord: "F", beats: 4 },
    { section: "副歌", chord: "G", beats: 4 },
    { section: "副歌", chord: "C", beats: 8 }
  ];
  const chorusB = [
    { section: "副歌", chord: "F", beats: 4 },
    { section: "副歌", chord: "G", beats: 4 },
    { section: "副歌", chord: "Em", beats: 4 },
    { section: "副歌", chord: "Am", beats: 4 },
    { section: "副歌", chord: "Dm", beats: 4 },
    { section: "副歌", chord: "G", beats: 4 },
    { section: "副歌", chord: "C", beats: 8 }
  ];

  global.Songs = global.Songs || {};
  global.Songs.danche = {
    id: "danche",
    title: "單車",
    artist: "陳奕迅",
    disclaimer: "練習用編曲（非官方譜）",
    key: "C",
    defaultBpm: 76,
    beatsPerBar: 4,
    levels: [
      {
        id: 1,
        name: "Level 1",
        subtitle: "超簡單：4 拍一個主要和弦（C–Am–F–G）",
        progression: repeat(level1Loop, 8)
      },
      {
        id: 2,
        name: "Level 2",
        subtitle: "加 Em，部分和弦維持 2 個小節",
        progression: repeat(level2Phrase, 2)
      },
      {
        id: 3,
        name: "Level 3",
        subtitle: "接近歌曲結構：主歌＋副歌（簡化）",
        progression: verse.concat(verse, chorusA, chorusB)
      }
    ]
  };
})(window);
