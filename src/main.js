const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

process.env.PLAYWRIGHT_BROWSERS_PATH = '0'; 

let mainWindow;
const trajectoriesDir = path.join(app.getPath('userData'), 'trajectories');
const defaultProfileDir = path.join(app.getPath('userData'), 'chrome_profile');
const settingsFile = path.join(app.getPath('userData'), 'auto_settings.json');

function getProfileDir(urlStr) {
  try {
    if (!urlStr) return defaultProfileDir;
    const urlObj = new URL(urlStr.startsWith('http') ? urlStr : 'https://' + urlStr);
    const domain = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(app.getPath('userData'), `profile_${domain}`);
  } catch (e) {
    return defaultProfileDir;
  }
}

if (!fs.existsSync(trajectoriesDir)) {
  fs.mkdirSync(trajectoriesDir, { recursive: true });
}

function sendLog(msg) {
  const tsMsg = `[${new Date().toLocaleTimeString()}] ${msg}`;
  console.log(tsMsg);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', tsMsg);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 650,
    height: 750,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Trajectory Automation Suite',
    autoHideMenuBar: true
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Set default settings if not exist
  if (!fs.existsSync(settingsFile)) {
    fs.writeFileSync(settingsFile, JSON.stringify({
      startTime: '09:00',
      randMins: 15,
      durationMins: 60,
      sleepDays: [0, 6] // Sun, Sat
    }));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ==== UI Data Handlers ====
ipcMain.handle('get-last-url', () => {
  const urlFile = path.join(app.getPath('userData'), 'lastURL.txt');
  if (fs.existsSync(urlFile)) return fs.readFileSync(urlFile, 'utf8');
  return '';
});

ipcMain.handle('check-initial-state', () => {
  let profileExists = false;
  let trajectoriesExist = false;
  let lastTrajectory = null;

  const userDataPath = app.getPath('userData');
  if (fs.existsSync(userDataPath)) {
    const hasProfiles = fs.readdirSync(userDataPath).some(f => f.startsWith('profile_') || f === 'chrome_profile');
    if (hasProfiles) profileExists = true;
  }
  }
  if (fs.existsSync(trajectoriesDir)) {
    const files = fs.readdirSync(trajectoriesDir).filter(f => f.endsWith('.json'));
    if (files.length > 0) {
        trajectoriesExist = true;
        // Fallback: Use newest trajectory
        files.sort((a,b) => fs.statSync(path.join(trajectoriesDir, b)).mtimeMs - fs.statSync(path.join(trajectoriesDir, a)).mtimeMs);
        lastTrajectory = path.join(trajectoriesDir, files[0]);
    }
  }
  
  const lastTrajFile = path.join(app.getPath('userData'), 'lastTrajectory.txt');
  if (fs.existsSync(lastTrajFile)) {
    const p = fs.readFileSync(lastTrajFile, 'utf8');
    if (fs.existsSync(p)) lastTrajectory = p;
  }

  return { profileExists, trajectoriesExist, lastTrajectory };
});

ipcMain.handle('get-settings', () => {
  if (fs.existsSync(settingsFile)) return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  return null;
});

ipcMain.handle('save-settings', (event, s) => {
  fs.writeFileSync(settingsFile, JSON.stringify(s), 'utf8');
  sendLog('Settings saved successfully.');
  return true;
});


// ==== 1. Init (Login phase) ====
ipcMain.handle('init-profile', async (event, startUrl) => {
  try {
    const pDir = getProfileDir(startUrl);
    const context = await chromium.launchPersistentContext(pDir, {
      headless: false, channel: 'chrome', viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process', '--disable-infobars', '--no-sandbox', '--disable-setuid-sandbox'],
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    if (startUrl && startUrl !== 'about:blank') {
      await page.goto(startUrl, {waitUntil: 'domcontentloaded'}).catch(()=>{});
    }

    return new Promise((resolve) => {
      context.on('close', () => {
        const lastUrl = page.isClosed() ? startUrl : page.url();
        fs.writeFileSync(path.join(app.getPath('userData'), 'lastURL.txt'), lastUrl, 'utf8');
        sendLog('Init phase closed.');
        resolve({ success: true, url: lastUrl });
      });
    });
  } catch (err) {
    sendLog('Init Error: ' + err.message);
    return { success: false, error: err.message };
  }
});


// ==== 2. Record ====
ipcMain.handle('record', async (event, startUrl) => {
  try {
    const pDir = getProfileDir(startUrl);
    const context = await chromium.launchPersistentContext(pDir, {
      headless: false, channel: 'chrome', viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process', '--disable-infobars', '--no-sandbox'],
      ignoreDefaultArgs: ['--enable-automation']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    const events = [];
    let isRecording = true;
    const recordingStartTime = Date.now();

    await page.exposeFunction('reportTrajectoryEvent', (eventData) => {
      if (!isRecording) return;
      eventData.time = Date.now() - recordingStartTime;
      events.push(eventData);
    });

    await page.addInitScript(() => {
      let lastMouseX = -1, lastMouseY = -1, lastMouseMoveTime = 0;
      const record = (type, customData = {}) => {
        if (type === 'mousemove') {
          const now = Date.now();
          if (now - lastMouseMoveTime < 30) return; 
          if (lastMouseX === customData.x && lastMouseY === customData.y) return;
          lastMouseMoveTime = now;
          lastMouseX = customData.x;
          lastMouseY = customData.y;
        }
        window.reportTrajectoryEvent({ type, ...customData }).catch(() => {});
      };
      window.addEventListener('mousemove', (e) => record('mousemove', {x: e.clientX, y: e.clientY}), { passive: true });
      window.addEventListener('mousedown', (e) => record('mousedown', {x: e.clientX, y: e.clientY}), { passive: true });
      window.addEventListener('mouseup',   (e) => record('mouseup',   {x: e.clientX, y: e.clientY}), { passive: true });
      window.addEventListener('click',     (e) => record('click',     {x: e.clientX, y: e.clientY}), { passive: true });
      window.addEventListener('wheel',     (e) => record('wheel',     {deltaX: e.deltaX, deltaY: e.deltaY}), { passive: true });
      window.addEventListener('scroll',    (e) => record('scroll',    {scrollY: window.scrollY, scrollX: window.scrollX}), { passive: true });
      window.addEventListener('keydown',   (e) => record('keydown',   {key: e.key}), { passive: true });
      window.addEventListener('keyup',     (e) => record('keyup',     {key: e.key}), { passive: true });
    });

    await page.goto(startUrl).catch(()=>{});

    return new Promise((resolve) => {
      context.on('close', async () => {
        isRecording = false;
        let targetFilePath = '';
        if (events.length > 0) {
          const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
          
          let count = 1;
          while(fs.existsSync(path.join(trajectoriesDir, `data${dateStr}-${count}.json`))) count++;
          const defaultName = `data${dateStr}-${count}.json`;

          const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Trajectory',
            defaultPath: path.join(trajectoriesDir, defaultName),
            filters: [{ name: 'JSON', extensions: ['json'] }]
          });

          if (!result.canceled && result.filePath) targetFilePath = result.filePath;
          else targetFilePath = path.join(trajectoriesDir, defaultName);

          const meta = { url: startUrl, eventCount: events.length, viewport: { width: 1280, height: 800 }, events: events };
          fs.writeFileSync(targetFilePath, JSON.stringify(meta, null, 2), 'utf8');
          fs.writeFileSync(path.join(app.getPath('userData'), 'lastTrajectory.txt'), targetFilePath, 'utf8');
        }
        sendLog(`Record saved: ${targetFilePath}`);
        resolve({ success: true, savedPath: targetFilePath });
      });
    });
  } catch (err) {
    sendLog('Record Error: ' + err.message);
    return { success: false, error: err.message };
  }
});


// ==== 3. Replay ====
ipcMain.handle('replay', async () => {
  try {
    const openResult = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Trajectory File', defaultPath: trajectoriesDir,
      filters: [{ name: 'JSON', extensions: ['json'] }], properties: ['openFile']
    });

    if (openResult.canceled || openResult.filePaths.length === 0) return { success: false, canceled: true };
    const trajectoryFile = openResult.filePaths[0];
    
    fs.writeFileSync(path.join(app.getPath('userData'), 'lastTrajectory.txt'), trajectoryFile, 'utf8');

    sendLog(`Starting replay manually: ${path.basename(trajectoryFile)}`);
    
    const data = JSON.parse(fs.readFileSync(trajectoryFile, 'utf-8'));
    const pDir = getProfileDir(data.url);

    // Manual replay manages its own context lifecycle
    const context = await chromium.launchPersistentContext(pDir, {
      headless: false, channel: 'chrome', 
      viewport: { width: 1280, height: 800 },
      args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process', '--disable-infobars', '--no-sandbox'],
      ignoreDefaultArgs: ['--enable-automation']
    });
    
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    await page.addInitScript(() => { window.addEventListener('DOMContentLoaded', () => {}); });
    await page.goto(data.url, { waitUntil: 'load' }).catch(()=>{});

    const playedEvents = await executePlaybackCycle(data, page, context, false);
    
    await context.close();

    return { success: true, played: playedEvents, filePath: trajectoryFile };
  } catch (err) {
    sendLog('Replay Error: ' + err.message);
    return { success: false, error: err.message };
  }
});


// ==== Playback Engine ====
async function executePlaybackCycle(data, page, context, enforceEndTime, endTimeMs = 0) {
  let eventsPlayed = 0;
  for (let i = 0; i < data.events.length; i++) {
      if (context.isClosed() || !mainWindow) break;
      if (enforceEndTime && Date.now() >= endTimeMs) break;

      const ev = data.events[i];
      const prevEv = i > 0 ? data.events[i - 1] : null;

      if (prevEv) {
        const waitTime = ev.time - prevEv.time;
        if (waitTime > 0 && waitTime < 30000) await page.waitForTimeout(waitTime);
      }

      try {
        if (ev.type === 'mousemove') {
          await page.mouse.move(ev.x, ev.y, { steps: 1 });
          await page.evaluate(({x, y}) => {
            let c = document.getElementById('pw-cursor');
            if (!c) {
              c = document.createElement('div'); c.id = 'pw-cursor'; c.style.width = '20px'; c.style.height = '20px'; c.style.borderRadius = '50%'; c.style.backgroundColor = 'rgba(255,0,0,0.5)'; c.style.position = 'fixed'; c.style.pointerEvents = 'none'; c.style.zIndex = '2147483647'; c.style.transform = 'translate(-50%,-50%)'; c.style.transition = 'background-color 0.1s ease';
              if (document.body) document.body.appendChild(c); else document.documentElement.appendChild(c);
            }
            c.style.left = x + 'px'; c.style.top = y + 'px';
          }, {x: ev.x, y: ev.y});
        } else if (ev.type === 'click') {
          await page.evaluate(({x, y}) => {
            let c = document.getElementById('pw-cursor');
            if (c) { c.style.backgroundColor = 'rgba(0, 255, 0, 0.8)'; setTimeout(() => { if (c) c.style.backgroundColor = 'rgba(255, 0, 0, 0.5)'; }, 200); }
          }, {x: ev.x, y: ev.y});
          await page.mouse.click(ev.x, ev.y);
        } else if (ev.type === 'mousedown') { await page.mouse.down();
        } else if (ev.type === 'mouseup') { await page.mouse.up();
        } else if (ev.type === 'wheel') { await page.mouse.wheel(ev.deltaX, ev.deltaY);
        } else if (ev.type === 'keydown') { await page.keyboard.down(ev.key);
        } else if (ev.type === 'keyup') { await page.keyboard.up(ev.key); }
      } catch (err) {}
      eventsPlayed++;
  }

  return eventsPlayed;
}


// ==== Auto Play Logic ====
let isAutoPlaying = false;
let autoPlayFile = null;
let autoPlayTimer = null;
let loopTaskActive = false;
let targetTimeToday = null;
let lastScheduledDate = null;
let hasRanToday = false;

function calculateTargetTime(settings) {
   const now = new Date();
   const [hh, mm] = settings.startTime.split(':').map(Number);
   let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
   const offset = (Math.random() * 2 - 1) * settings.randMins;
   return new Date(target.getTime() + offset * 60000);
}

function formatTime(d) {
    return d.toTimeString().slice(0,5);
}

function checkSchedule() {
    if (!isAutoPlaying || loopTaskActive) return;
    const now = new Date();
    const dateStr = now.toDateString();
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));

    if (dateStr !== lastScheduledDate) {
        targetTimeToday = calculateTargetTime(settings);
        lastScheduledDate = dateStr;
        hasRanToday = false;
        sendLog(`Scheduler reset. Next run today around ${formatTime(targetTimeToday)}`);
    }

    if (now >= targetTimeToday && !hasRanToday) {
        hasRanToday = true;
        if (settings.sleepDays.includes(now.getDay())) {
            sendLog(`Today is a sleep day (${now.toLocaleDateString()}). Skipping.`);
        } else {
            sendLog(`Triggering Auto Play loop...`);
            runAutoPlayLoop(autoPlayFile, settings.durationMins).catch(e => sendLog(`AutoPlay Error: ` + e));
        }
    }
}

async function runAutoPlayLoop(trajectoryFile, durationMins) {
    loopTaskActive = true;
    const endTimeMs = Date.now() + durationMins * 60000;
    sendLog(`[AutoPlay] Loop started for ${durationMins} minutes. Browser opening...`);
    
    let context;
    try {
        const data = JSON.parse(fs.readFileSync(trajectoryFile, 'utf-8'));
        const pDir = getProfileDir(data.url);
        
        // Single browser launch for the entire autoplay duration
        context = await chromium.launchPersistentContext(pDir, {
          headless: false, channel: 'chrome', viewport: data.viewport || { width: 1280, height: 800 },
          args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process', '--disable-infobars', '--no-sandbox'],
          ignoreDefaultArgs: ['--enable-automation']
        });
        
        const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
        
        await page.addInitScript(() => { window.addEventListener('DOMContentLoaded', () => {}); });
        await page.goto(data.url, { waitUntil: 'load' }).catch(()=>{});

        let loopCount = 0;
        while (Date.now() < endTimeMs && isAutoPlaying && mainWindow) {
            loopCount++;
            sendLog(`[AutoPlay] Starting cycle #${loopCount}`);
            await executePlaybackCycle(data, page, context, true, endTimeMs);
            
            // Wait briefly before starting the next loop cycle
            if (Date.now() < endTimeMs && isAutoPlaying && !context.isClosed()) {
                await page.waitForTimeout(3000); 
            }
        }
        
    } catch(err) {
        sendLog(`[AutoPlay] Fatal loop error: ` + err);
    } finally {
        sendLog(`[AutoPlay] Limit reached. Closing browser.`);
        if (context && !context.isClosed()) await context.close();
        loopTaskActive = false;
    }
}

ipcMain.handle('toggle-auto-play', async (e, filePath) => {
   if (isAutoPlaying) {
       isAutoPlaying = false;
       if (autoPlayTimer) clearInterval(autoPlayTimer);
       sendLog(`Auto Play Automation DISABLED.`);
       return false; 
   } else {
       isAutoPlaying = true;
       autoPlayFile = filePath;
       lastScheduledDate = null; 
       checkSchedule(); 
       autoPlayTimer = setInterval(checkSchedule, 30000); 
       sendLog(`Auto Play Enabled for: ${path.basename(filePath)}`);
       return true; 
   }
});