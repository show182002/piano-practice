# 鋼琴練習 · Piano Practice

簡單網上鋼琴練習（`v0.01400`）。

線上：https://piano-practice-ksoc.netlify.app/

## 功能
- 選歌之後先入練習頁
- 練習介面跟教學 app／音遊：上面係大譜表（高音譜＝旋律 solo，低音譜＝和弦；垂直 playhead 跟住走），歌詞槽同步喺鍵盤上面，MiniLab 3 虛擬鍵盤（25 鍵，預設 C3–C5）鎖喺譜下面。鍵盤每粒鍵用固定像素闊度，唔會跟視窗拉肥
- 譜視窗預設睇 4 小節，播放緊可以調 2 至 6 節
- 播放區只留橫向 timeline 同基本播放控制
- 螢幕虛擬鋼琴、Web Audio 出聲、Web MIDI（接 USB keyboard 可同步亮鍵 + 出聲）
- **跟彈《單車》**（陳奕迅；練習用編曲，G 大調）。預設 **Level 3**：跟 C_Zhukov 簡易鋼琴譜第 1 頁（pickup＋第 1–30 小節）寫上單音旋律同小節中間嘅 slash chord。第 2 頁（第 31–56 小節）未有收入
- 冇歌詞嘅段落當 Intro／間奏（第 1 頁：pickup＋第 1–4 小節，同第 22–24 小節），唔顯示和弦。歌詞開始之後先顯示旋律＋和弦
- 卡拉 OK 式歌詞槽已跟時間軸預留位置；**官方歌詞不會預載於公開網站**
- 拍子機、BPM（預設 68）、簡單得分
- **五度圈**係獨立頁：揀大調 → 顯示音階、常用和弦、相對小調；鍵盤亮起相關音符
- 八度偏移、音量、電腦鍵盤簡易試彈（A/W/S/E/D…）

## 檔案結構（模組化）
- `js/audio.js` — Web Audio 發聲同拍子機 click
- `js/midi.js` — Web MIDI 連接
- `js/piano.js` — 虛擬鍵盤 UI（固定鍵寬；`PianoUI` 可 mount 到指定容器；和弦音同旋律音分開高亮）
- `js/theory.js` — 音階／和弦理論（`chordPcsFromSymbol`、slash chord、以及 MiniLab 音域內嘅簡單 voicing）
- `js/circleOfFifths.js` — 五度圈 UI 同選調邏輯
- `js/songs/danche.js` — 《單車》各 Level 和弦進行、Level 3 旋律，同歌詞時間軸（無預載官方歌詞）
- `js/followAlong.js` — BPM 時鐘、暫停／繼續、計分、橫向大譜表
- `js/app.js` — 主頁／練習頁／五度圈切換

## 用法
1. 開網頁後可先撳「開聲」，或入練習頁再開
2. 接上 MiniLab 3，撳「連接 MIDI」（建議 Chrome / Edge）
3. 喺主頁揀《單車》→「開始練習」。預設 Level 3。跟住譜上嗰條垂直 playhead 同鍵盤高亮，彈出旋律音或和弦音就可以得分。顯示小節數可以喺播放緊調（2–6）。練習可以將 BPM 調慢
4. **五度圈**：由主頁進入；撳一個大調，再撳「成個 scale」或某個和弦，睇鍵盤亮起

《單車》和弦進行同旋律只供練習，並非官方譜。官方歌詞不會預載於公開網站。

## 之後可加
其他歌曲、第 2 頁（第 31–56 小節）、有權使用嘅歌詞、更精細計分、SoundFont 音色等。
