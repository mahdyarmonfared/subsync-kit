# SubSyncKit 🎬

> Zero-dependency CLI utility and interactive Web Studio for SubRip (.SRT) subtitle time-shifting, millisecond audio resync, and automated Windows-1256 to UTF-8 encoding repair. Built purely with native Node.js standard libraries.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_External-emerald.svg)](package.json)
[![Tests Passing](https://img.shields.io/badge/Tests-100%25_Pass-success.svg)](test/)

---

## 🚀 Overview

Out-of-sync audio and scrambled non-UTF-8 characters (mojibake) are the two most frustrating issues when working with video subtitles. **SubSyncKit** provides a high-precision, zero-dependency engine to shift timecodes by exact millisecond intervals, adjust frame rate speeds (e.g. 23.976 to 25 FPS), and automatically repair Persian/Arabic Windows-1256 encoded subtitle files into clean, universal UTF-8.

### 🌟 Key Highlights

- **⏱️ Precision Time-Shifter**: Adjust all subtitle timecodes forward or backward using human strings (`+1.5s`, `-800ms`, `+2500`).
- **🔤 Windows-1256 Mojibake Repair**: Detects and repairs scrambled Persian letters (e.g. converting `ÓáÇã` back into `سلام`) without any external dependencies.
- **🎞️ Framerate / Speed Ratio Calibration**: Recalibrates timecodes between cinema and broadcast standards (23.976 FPS ⇄ 25 FPS).
- **🛡️ 100% Zero Dependencies**: Built strictly using native Node.js standard modules (`http`, `fs`, `path`, `url`, `node:test`).
- **💻 Dual Terminal & Web Studio Modes**: Run directly in terminal workflows or launch the local Web Studio dashboard on port `3023`.
- **📥 One-Click Export**: Download sanitized, perfectly synced `.srt` files directly from the browser or terminal.

---

## 📦 Installation & Quick Start

```bash
# Clone the repository
git clone https://github.com/mahdyarmonfared/subsync-kit.git
cd subsync-kit

# Run automated test suite
npm test

# Launch the interactive Web Studio
npm start
# -> Web Studio running at http://localhost:3023
```

---

## 💻 CLI Commands

```bash
# Shift subtitle forward by 1.5 seconds and save to a new file
subsync shift movie.srt +1.5s -o movie_synced.srt

# Shift subtitle backward by 800 milliseconds (in-place or default _synced suffix)
subsync shift movie.srt -800ms

# Repair scrambled Persian subtitle font (Windows-1256 to clean UTF-8)
subsync fix-encoding persian_sub.srt -o clean_sub.srt

# Inspect subtitle metadata (cues, duration, start/end timecodes)
subsync info movie.srt

# Launch the interactive Web Studio on port 3023
subsync ui --port 3023
```

---

## 🌐 Web Studio (Port 3023)

Run `npm start` to open the local dashboard:

- **Timecode Offset Slider**: Adjust synchronization dynamically from `-10.0s` to `+10.0s` with instant visual cues.
- **Quick Stepper Buttons**: Fine-tune delay with dedicated `-1s`, `-250ms`, `+250ms`, `+1s` buttons.
- **Dual-Pane Editor**: View original raw SRT alongside live synced output and formatted cue cards.
- **One-Click Font Repair**: Fixes legacy ANSI/Windows-1256 Persian character scrambling instantly.
- **Direct SRT Download**: Export your sanitized UTF-8 subtitle file directly.

---

## 🧪 Automated Testing

SubSyncKit includes complete unit and integration tests executed with the native Node.js test runner:

```bash
npm test
```

```text
✔ decodeWindows1256: decodes raw Windows-1256 bytes to Persian UTF-8
✔ repairMojibakeString: repairs corrupted Latin-1 strings back to Persian
✔ autoRepairEncoding: preserves clean UTF-8 with BOM and without BOM
✔ parseTimecode: accurately converts SRT timecodes to milliseconds
✔ formatTimecode: converts milliseconds to standard SRT timecode format
✔ parseSrt & serializeSrt: parses and round-trips standard SRT content
✔ getSrtInfo: calculates duration and cue statistics accurately
✔ isPathSafe: guards against directory traversal attacks
✔ HTTP Server: POST /api/shift shifts subtitle timecodes properly
✔ HTTP Server: POST /api/fix-encoding repairs corrupted input
✔ parseOffset: parses various human offset string formats
✔ shiftCues: shifts cue timecodes forward and backward accurately
✔ shiftCues: handles negative clipping and drops cues before 0
✔ shiftSrt: shifts complete SRT string and formats output properly
ℹ tests 14 | suites 0 | pass 14 | fail 0
```

---

## 📄 License

Distributed under the [MIT License](LICENSE). Built by [Mahdyar Monfared](https://github.com/mahdyarmonfared).
