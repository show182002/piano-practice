# 鋼琴練習 · Piano Practice

簡單網上鋼琴練習（`v0.00100`）。

## 功能
- 螢幕虛擬鋼琴（25 鍵，對齊 Arturia MiniLab 3 音域：C3–C5）
- Web Audio 出聲（無需外部音色檔）
- Web MIDI：接 USB MIDI keyboard 可同步亮鍵 + 出聲
- **五度圈**：揀大調 → 顯示音階、常用和弦、相對小調；鍵盤亮起相關音符
- 八度偏移、音量
- 電腦鍵盤簡易試彈（A/W/S/E/D…）

## 檔案結構（模組化）
- `js/audio.js` — Web Audio 發聲
- `js/midi.js` — Web MIDI 連接
- `js/piano.js` — 虛擬鍵盤 UI（匯出 `PianoUI` 高亮 API）
- `js/theory.js` — 音階／和弦理論
- `js/circleOfFifths.js` — 五度圈 UI 同選調邏輯

## 用法
1. 開網頁後先撳「開聲」
2. 接上 MiniLab 3，撳「連接 MIDI」（建議 Chrome / Edge）
3. 喺五度圈撳一個大調；再撳「成個 scale」或某個和弦，睇鍵盤亮起

## 之後可加
轉調、練習模式、更好嘅鋼琴音色（SoundFont）等。
