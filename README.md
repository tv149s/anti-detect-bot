# 🕶️ Anti-Detect Bot & Browser Macro Recorder

> A stealthy, cross-platform browser macro recorder and auto-pilot bot powered by **Playwright** and **Electron**. Built to bypass bot detection effortlessly.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-Latest-brightgreen.svg)
![Playwright](https://img.shields.io/badge/Playwright-Stealth-orange.svg)

## ✨ Features

- 🖱️ **Record & Replay**: Accurately records mouse movements, clicks, and keyboard events, then replays them with identical timing to simulate real human behavior.
- 🛡️ **Anti-Detect Engine**: Uses `puppeteer-extra-plugin-stealth` seamlessly integrated with `playwright-extra` to bypass common Cloudflare / Datadome / Captcha bot detections.
- ⏰ **Daily Auto-Pilot Scheduler**: Perfect for daily farming, scraping, or keep-alive tasks. Schedule your tasks to run automatically every day at a specific time.
- 🎲 **Human Chaos Offset**: Built-in randomization feature to vary start times (+/- X minutes) to avoid deterministic behavioral patterns.
- 💤 **Sleep Days**: Configure specific days of the week for the bot to rest, mimicking a true human schedule.
- 🔴 **Injected Red-Dot Visualizer**: Real-time visual feedback of what the macro is doing, injected directly via DOM manipulation (survives SPA app navigations).
- 💾 **Independent Session Storage**: Runs isolated Chrome Profiles (`chrome_profile`) so you stay logged into your target sites permanently across restarts.

## 🚀 Getting Started

### 1. Download & Install (Easiest Way)
1. Head over to the [Releases](../../releases) tab on this repository.
2. Download the latest `Trajectory-Recorder-Setup.exe` (or `anti-detect-bot-Setup.exe`).
3. Double click to run. No programming knowledge required!

### 2. Run from Source (For Developers)
- **Node.js** (v18+) required.

```bash
git clone https://github.com/tv149s/anti-detect-bot.git
cd anti-detect-bot
npm install
npm start
```

### 3. Usage

1. **Step 1 (Init):** Enter your target URL and click `Step 1`. A browser will open. Log into your accounts and solve any initial captchas manually. Once ready, close the browser. Your session is now saved identically.
2. **Step 2 (Record):** Click `Start Recording`. The browser will open again. Perform your actions exactly as you want them automated. Close the browser when finished to save the `.json` trajectory file.
3. **Step 3 (Replay):** Test your trajectory by clicking `Replay` to ensure it works accurately.
4. **Auto-Pilot:** Click `⚙️` to adjust schedule settings, then click `Enable Auto Play`. The bot will minimize and run silently every day!

## ⚠️ Disclaimer
This tool is provided for educational and testing purposes only. Please respect the terms of service of the websites you automate. Use responsibly.

## 📄 License
MIT License