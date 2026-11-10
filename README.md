# 鋼琴練習 · Piano Practice

簡單網上鋼琴練習（`v0.00200`）。

線上：https://piano-practice-ksoc.netlify.app/

## 功能
- 螢幕虛擬鋼琴（25 鍵，對齊 Arturia MiniLab 3 音域：C3–C5）
- Web Audio 出聲（無需外部音色檔）
- Web MIDI：接 USB MIDI keyboard 可同步亮鍵 + 出聲
- **跟彈**：以《單車》（陳奕迅）練習用編曲，跟 BPM 行和弦、拍子機、簡單得分；三個 Chord Level
- **五度圈**：揀大調 → 顯示音階、常用和弦、相對小調；鍵盤亮起相關音符
- 八度偏移、音量
- 電腦鍵盤簡易試彈（A/W/S/E/D…）

## 檔案結構（模組化）
- `js/audio.js` — Web Audio 發聲同拍子機 click
- `js/midi.js` — Web MIDI 連接
- `js/piano.js` — 虛擬鍵盤 UI（`PianoUI` 高亮同 note 訂閱）
- `js/theory.js` — 音階／和弦理論（含 `chordPcsFromSymbol`）
- `js/circleOfFifths.js` — 五度圈 UI 同選調邏輯
- `js/songs/danche.js` — 《單車》各 Level 和弦進行
- `js/followAlong.js` — 跟彈時間軸、拍子機、計分、介面
- `js/app.js` — Tab 切換同啟動

## 用法
1. 開網頁後先撳「開聲」
2. 接上 MiniLab 3，撳「連接 MIDI」（建議 Chrome / Edge）
3. **跟彈**：揀 Level，可將 BPM 調慢，開／關拍子機，撳「播放」。跟住而家嘅和弦，喺鍵盤或 MIDI 彈中和弦音就會加分。
4. **五度圈**：撳一個大調；再撳「成個 scale」或某個和弦，睇鍵盤亮起

《單車》和弦進行只供練習，並非官方譜。

## 之後可加
其他歌曲、轉調、更精細計分、SoundFont 音色等。
