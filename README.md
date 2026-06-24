# Human Simulator

> A Windows browser trajectory recorder and replay engine powered by **Playwright** and **Electron**. Human Simulator records real browser interaction paths as pure JSON trajectory files, keeps website login profiles isolated, and replays or auto-runs those trajectories from the selected profile.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-Latest-brightgreen.svg)
![Playwright](https://img.shields.io/badge/Playwright-Automation-orange.svg)

## ✨ Features

- 🖱️ **Trajectory Recording**: Records clicks, mouse movement, typing, wheel activity, timing, and navigation-related events into a standalone JSON trajectory file.
- 📄 **Pure JSON Files**: Trajectory files are deliberately not bound to a website URL or browser profile, so the same movement file stays portable and easy to inspect.
- 👤 **Website Profile Isolation**: Step 1 creates a local browser profile for each website login. Replay and Auto Play reopen the selected profile's saved start URL.
- 🔐 **Manual Login First**: The URL input appears only when initializing a login profile. Recording, replay, and Auto Play use the selected saved profile instead of asking for a URL again.
- 🔁 **Replay & Auto Play**: Replays recorded behavior with the original timing and can repeat workflows automatically with schedule, duration, random offset, and sleep-day settings.
- 🔄 **Stale-Content Recovery**: During scrolling workflows, Human Simulator checks for content growth about every 30 seconds and reloads the page when wheel activity stops producing new content.
- 🎬 **Platform-Specific Scroll Handling**: Uses keyboard fallback for TikTok feed navigation while keeping Facebook/X wheel replay stable and flicker-free.
- 💾 **Local Session Storage**: Login state and profile data stay on the local machine in isolated browser profile directories.

## 🚀 Getting Started

### 1. Download & Install (Easiest Way)
1. Head over to the [Releases](../../releases) tab on this repository.
2. Download the latest `Human.Simulator.Setup.1.0.2.exe` installer.
3. Double click to run. No programming knowledge required!

### 2. Run from Source (For Developers)
- **Node.js** (v18+) required.

```bash
git clone https://github.com/tv149s/anti-detect-bot.git
cd anti-detect-bot
cd tools/trajectories-gui
npm install
npm start
```

### 3. Usage

1. **Step 1 (Initialize Profile):** Click `Step 1`, enter the target website URL in the popup, then log in manually. Close the browser when the account is ready. Human Simulator saves this website as an isolated selectable profile.
2. **Step 2 (Record):** Select a saved profile and click `Start Recording`. Perform the browser actions you want to capture, then close the browser to save a pure `.json` trajectory file.
3. **Step 3 (Replay):** Select the profile and trajectory file, then click `Replay`. Human Simulator opens that profile's saved start URL and replays the recorded actions with the captured timing.
4. **Auto Play:** Configure schedule settings with `⚙️`, choose the profile and trajectory, then enable Auto Play to repeat the workflow with stale-content recovery during scrolling tasks.

## ⚠️ Disclaimer
Human Simulator is provided for personal workflow automation, QA, research, and authorized testing. Use it only where you have permission and follow the terms and policies of each website you operate on.

## 📄 License
MIT License