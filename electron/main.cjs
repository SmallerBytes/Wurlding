const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const { pathToFileURL } = require('url');

let serverStarted = false;
/** Resolved `server.js` module (has `closeDataServer` after install). */
let serverModuleRef = null;

/** User opened Help → Check for Updates (controls “no update” dialog + progress UI). */
let userRequestedUpdateCheck = false;
/** True only for the current manual check — used to show download progress (not for silent startup checks). */
let showProgressForCurrentDownload = false;

let updaterHandlersInstalled = false;
let autoUpdaterRef = null;

/** Version string from the latest `update-available` (for progress window title). */
let pendingDownloadVersion = '';

/** Silent startup check found an update; surface download errors (otherwise users see nothing). */
let awaitingSilentUpdateDownload = false;

let downloadProgressWindow = null;

/** App UI theme mirrored from the renderer (`dark` | `light`). */
let currentAppTheme = 'dark';
/** Whimsical animations preference mirrored from the renderer (`on` | `off`). */
let currentMotion = 'on';
/** Pixel companion genre mirrored from the renderer (see src/data/pixelCritters.ts). */
let currentCritters = 'fae-princess';

const CRITTER_GENRES = ['off', 'fae-princess', 'goblin-priest', 'ragnok', 'wilds', 'alligator-bear', 'crabacus', 'emerald-wyvern', 'void-walker'];

const revealedWindows = new WeakSet();

function getDefaultAppDataRoot() {
  if (process.platform === 'win32') {
    return (
      process.env.LOCALAPPDATA ||
      process.env.APPDATA ||
      path.join(process.env.USERPROFILE || __dirname, 'AppData', 'Local')
    );
  }
  if (process.platform === 'darwin') {
    return path.join(process.env.HOME || __dirname, 'Library', 'Application Support');
  }
  return (
    process.env.XDG_DATA_HOME ||
    path.join(process.env.HOME || __dirname, '.local', 'share')
  );
}

function preferencesFilePath() {
  const profile = (process.env.WURLDING_PROFILE || 'prod').trim() || 'prod';
  const root = process.env.DATA_ROOT && process.env.DATA_ROOT.trim()
    ? process.env.DATA_ROOT.trim()
    : path.join(getDefaultAppDataRoot(), 'Wurlding', 'profiles', profile);
  return path.join(root, 'preferences.json');
}

function readDiskPreferences() {
  try {
    const raw = JSON.parse(fs.readFileSync(preferencesFilePath(), 'utf8'));
    const theme = raw?.theme === 'dark' || raw?.theme === 'light' ? raw.theme : null;
    const motion = raw?.motion === 'on' || raw?.motion === 'off' ? raw.motion : null;
    if (!theme || !motion) return null;
    const rawCritters = raw?.critters === 'fae' ? 'fae-princess' : raw?.critters;
    const critters = CRITTER_GENRES.includes(rawCritters) ? rawCritters : currentCritters;
    return { theme, motion, critters };
  } catch {
    return null;
  }
}

function writeDiskPreferences(prefs) {
  const file = preferencesFilePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(prefs, null, 2)}\n`, 'utf8');
}

function currentPreferences() {
  return { theme: currentAppTheme, motion: currentMotion, critters: currentCritters };
}

function isAppWindow(win) {
  return Boolean(win) && !win.isDestroyed() && win !== downloadProgressWindow;
}

function prefsScript(theme, motion, critters) {
  const safeCritters = CRITTER_GENRES.includes(critters) ? critters : 'fae-princess';
  return `(function () {
    try {
      localStorage.setItem('wurlding:theme', ${JSON.stringify(theme)});
      localStorage.setItem('wurlding:motion', ${JSON.stringify(motion)});
      localStorage.setItem('wurlding:critters', ${JSON.stringify(safeCritters)});
      document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)});
      document.documentElement.style.colorScheme = ${JSON.stringify(theme)};
      document.documentElement.setAttribute('data-motion', ${JSON.stringify(motion)});
      window.dispatchEvent(new CustomEvent('wurlding:theme', { detail: ${JSON.stringify(theme)} }));
      window.dispatchEvent(new CustomEvent('wurlding:motion', { detail: ${JSON.stringify(motion)} }));
      window.dispatchEvent(new CustomEvent('wurlding:critters', { detail: ${JSON.stringify(safeCritters)} }));
    } catch (e) {}
  })();`;
}

function pushPrefsToAllWindows() {
  const script = prefsScript(currentAppTheme, currentMotion, currentCritters);
  const bg = themeBackgroundColor(currentAppTheme);
  for (const win of BrowserWindow.getAllWindows()) {
    if (!isAppWindow(win)) continue;
    try {
      win.setBackgroundColor(bg);
    } catch {
      // ignore
    }
    win.webContents.executeJavaScript(script).catch(() => {});
  }
}

function setAppMotion(pref) {
  const next = pref === 'off' ? 'off' : 'on';
  if (currentMotion === next) return;
  currentMotion = next;
  writeDiskPreferences(currentPreferences());
  pushPrefsToAllWindows();
  createApplicationMenu();
}

function themeBackgroundColor(theme) {
  return theme === 'light' ? '#f4f1ea' : '#0a0a0f';
}

function setAppTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  if (currentAppTheme === next) return;
  currentAppTheme = next;
  writeDiskPreferences(currentPreferences());
  pushPrefsToAllWindows();
  createApplicationMenu();
}

function applySavedPreferencesFromDisk() {
  const disk = readDiskPreferences();
  if (!disk) return;
  currentAppTheme = disk.theme;
  currentMotion = disk.motion;
  currentCritters = disk.critters;
}

function syncThemeFromRenderer(win) {
  if (!win || win.isDestroyed()) return;
  win.webContents
    .executeJavaScript(
      `(function () {
        try {
          var t = localStorage.getItem('wurlding:theme');
          var m = localStorage.getItem('wurlding:motion');
          return {
            theme: t === 'light' || t === 'dark' ? t : null,
            motion: m === 'on' || m === 'off' ? m : null,
          };
        } catch (e) { return { theme: null, motion: null }; }
      })()`,
    )
    .then((prefs) => {
      const nextTheme = prefs?.theme === 'dark' || prefs?.theme === 'light' ? prefs.theme : null;
      const nextMotion = prefs?.motion === 'on' || prefs?.motion === 'off' ? prefs.motion : null;
      let changed = false;
      if (nextTheme && currentAppTheme !== nextTheme) {
        currentAppTheme = nextTheme;
        changed = true;
        try {
          win.setBackgroundColor(themeBackgroundColor(nextTheme));
        } catch {
          // ignore
        }
      }
      if (nextMotion && currentMotion !== nextMotion) {
        currentMotion = nextMotion;
        changed = true;
      }
      if (changed) createApplicationMenu();
    })
    .catch(() => {});
}

function closeDownloadProgressWindow() {
  if (downloadProgressWindow && !downloadProgressWindow.isDestroyed()) {
    downloadProgressWindow.close();
  }
  downloadProgressWindow = null;
}

function showDownloadProgressWindow(version) {
  closeDownloadProgressWindow();

  const safeVer = String(version || '?').replace(/[^0-9A-Za-z._-]/g, '') || '?';

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Downloading update</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, Segoe UI, sans-serif; background: #0a0a0f; color: #e8e6f3; padding: 16px 18px; }
  h1 { font-size: 14px; font-weight: 600; margin: 0 0 4px; letter-spacing: 0.02em; }
  p { margin: 0 0 14px; font-size: 12px; color: #9b95b3; }
  .bar { height: 10px; border-radius: 6px; background: #1a1825; border: 1px solid #2a2538; overflow: hidden; }
  .fill { height: 100%; width: 0%; background: linear-gradient(90deg, #6b4dff, #9d7aff); border-radius: 5px; transition: width 0.15s ease-out; }
  #pct { margin-top: 10px; font-size: 12px; tabular-nums; color: #c4bdd9; }
</style></head>
<body>
  <h1>Downloading update</h1>
  <p id="sub">Wurlding <span id="ver">${safeVer}</span></p>
  <div class="bar"><div id="fill" class="fill"></div></div>
  <div id="pct">0%</div>
</body></html>`;

  const w = new BrowserWindow({
    width: 420,
    height: 168,
    show: false,
    resizable: false,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    title: 'Downloading update',
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  w.once('ready-to-show', () => w.show());
  downloadProgressWindow = w;
}

function setDownloadProgressPercent(percent) {
  const p = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  if (!downloadProgressWindow || downloadProgressWindow.isDestroyed()) return;
  downloadProgressWindow.webContents
    .executeJavaScript(
      `document.getElementById('fill').style.width='${p}%';document.getElementById('pct').textContent='${p}%';`,
    )
    .catch(() => {});
}

function revealWithSavedPrefs(win) {
  if (!win || win.isDestroyed() || revealedWindows.has(win)) return;
  revealedWindows.add(win);

  const disk = readDiskPreferences();
  const apply = disk
    ? win.webContents.executeJavaScript(prefsScript(disk.theme, disk.motion, disk.critters)).then(() => {
        currentAppTheme = disk.theme;
        currentMotion = disk.motion;
        currentCritters = disk.critters;
        try {
          win.setBackgroundColor(themeBackgroundColor(disk.theme));
        } catch {
          // ignore
        }
      })
    : Promise.resolve();

  const showTimer = setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) win.show();
  }, 4000);

  apply.catch(() => {}).finally(() => {
    clearTimeout(showTimer);
    if (win.isDestroyed()) return;
    syncThemeFromRenderer(win);
    if (!win.isVisible()) win.show();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    backgroundColor: themeBackgroundColor(currentAppTheme),
    icon: path.join(__dirname, '..', 'build', 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    win.loadURL(startUrl);
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
  }

  const reveal = () => revealWithSavedPrefs(win);
  win.once('ready-to-show', reveal);
  win.webContents.on('did-finish-load', reveal);
  win.webContents.on('did-fail-load', () => {
    if (!win.isDestroyed() && !win.isVisible()) win.show();
  });
  win.on('focus', () => {
    if (revealedWindows.has(win)) syncThemeFromRenderer(win);
  });
}

async function startServer() {
  if (serverStarted) return;
  if (process.env.ELECTRON_USE_EXTERNAL_SERVER === '1') return;

  serverStarted = true;

  const profile = (process.env.WURLDING_PROFILE || 'prod').trim() || 'prod';
  const port = process.env.PORT || '3001';
  process.env.WURLDING_PROFILE = profile;
  process.env.PORT = port;

  try {
    const serverPath = path.join(__dirname, '..', 'server.js');
    serverModuleRef = await import(pathToFileURL(serverPath).href);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] Failed to start data server:', err);
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return null;
  if (updaterHandlersInstalled && autoUpdaterRef) return autoUpdaterRef;

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] electron-updater not available:', e);
    return null;
  }

  autoUpdaterRef = autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] updater error:', err);
    closeDownloadProgressWindow();
    if (userRequestedUpdateCheck) {
      userRequestedUpdateCheck = false;
      showProgressForCurrentDownload = false;
      awaitingSilentUpdateDownload = false;
      dialog.showErrorBox('Update check failed', String(err?.message || err));
    } else if (awaitingSilentUpdateDownload) {
      awaitingSilentUpdateDownload = false;
      dialog.showErrorBox(
        'Update download failed',
        `${String(err?.message || err)}\n\nInstall the latest build from Help → Release notes (GitHub), or use Help → Check for Updates… to try again.`,
      );
    }
  });

  autoUpdater.on('update-available', (info) => {
    pendingDownloadVersion = String(info?.version || '');

    // No modal here — it duplicated prompts when startup + manual checks overlapped.
    // Manual checks get a progress window; silent background checks only prompt when ready to install.

    if (showProgressForCurrentDownload) {
      showDownloadProgressWindow(pendingDownloadVersion);
    } else {
      awaitingSilentUpdateDownload = true;
    }
  });

  autoUpdater.on('download-progress', (p) => {
    if (showProgressForCurrentDownload && !downloadProgressWindow) {
      showDownloadProgressWindow(pendingDownloadVersion || app.getVersion());
    }
    setDownloadProgressPercent(p?.percent);
  });

  autoUpdater.on('update-not-available', () => {
    awaitingSilentUpdateDownload = false;
    closeDownloadProgressWindow();
    if (userRequestedUpdateCheck) {
      userRequestedUpdateCheck = false;
      showProgressForCurrentDownload = false;
      dialog
        .showMessageBox({
          type: 'info',
          title: 'No update',
          message: 'You are already on the latest published version.',
          buttons: ['OK'],
        })
        .catch(() => {});
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    awaitingSilentUpdateDownload = false;
    closeDownloadProgressWindow();
    pendingDownloadVersion = '';
    userRequestedUpdateCheck = false;
    showProgressForCurrentDownload = false;

    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;

    async function beginInstallAndRestart() {
      try {
        if (serverModuleRef?.closeDataServer) {
          await serverModuleRef.closeDataServer();
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[WURLDING] Failed to stop data server before install:', e);
      }
      try {
        const au = autoUpdaterRef;
        if (au && typeof au.quitAndInstall === 'function') {
          // false = show NSIS UI; give the dialog time to close so the installer isn’t hidden behind it.
          au.quitAndInstall(false, true);
        }
      } catch (e) {
        dialog.showErrorBox('Could not start installer', String(e?.message || e));
      }
    }

    const box = (opts) =>
      parent ? dialog.showMessageBox(parent, opts) : dialog.showMessageBox(opts);

    box({
      type: 'info',
      title: 'Update ready',
      message: `Version ${info.version} is ready to install.`,
      detail:
        'Choose "Install and restart" to close Wurlding and run the installer. If the installer opens behind this window, check the taskbar for "Wurlding Setup". Your saved worlds stay on this computer.',
      buttons: ['Install and restart', 'Not now'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    })
      .then(async ({ response }) => {
        if (response === 0) {
          setTimeout(() => {
            void beginInstallAndRestart();
          }, 500);
        } else {
          await box({
            type: 'info',
            title: 'Update downloaded',
            message: 'The installer will run when you fully quit Wurlding.',
            detail:
              'Use File → Exit or close the app. If the update still does not apply, open Help → Release notes (GitHub) and run the latest installer manually.',
            buttons: ['OK'],
          });
        }
      })
      .catch(() => {});
  });

  updaterHandlersInstalled = true;

  // Quiet background check — no modal on “available”; user gets one prompt when the download finishes.
  setTimeout(() => {
    showProgressForCurrentDownload = false;
    autoUpdater.checkForUpdates().catch(() => {});
  }, 8000);

  return autoUpdater;
}

async function checkForUpdatesFromMenu() {
  if (!app.isPackaged) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Updates',
      message: 'Automatic updates run in the installed desktop app.',
      detail: 'Run the packaged Wurlding installer build to test update checks.',
    });
    return;
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    await dialog.showErrorBox('Updates unavailable', String(e?.message || e));
    return;
  }

  userRequestedUpdateCheck = true;
  showProgressForCurrentDownload = true;

  try {
    await autoUpdater.checkForUpdates();
  } catch (e) {
    userRequestedUpdateCheck = false;
    showProgressForCurrentDownload = false;
    closeDownloadProgressWindow();
    await dialog.showErrorBox('Update check failed', String(e?.message || e));
  }
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Open Settings…',
          click: () => {
            const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
            if (!win || win.isDestroyed()) return;
            win.webContents
              .executeJavaScript(
                `(function () {
                  try {
                    var link = document.querySelector('a[href="/settings"], a[href="#/settings"]');
                    if (link) { link.click(); return; }
                    if (location.hash && location.hash.charAt(0) === '#') {
                      location.hash = '#/settings';
                      return;
                    }
                    history.pushState({}, '', '/settings');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  } catch (e) {}
                })();`,
              )
              .catch(() => {});
          },
        },
        { type: 'separator' },
        {
          label: 'Appearance',
          submenu: [
            {
              label: 'Dark mode',
              type: 'radio',
              checked: currentAppTheme === 'dark',
              click: () => {
                setAppTheme('dark');
              },
            },
            {
              label: 'Light mode',
              type: 'radio',
              checked: currentAppTheme === 'light',
              click: () => {
                setAppTheme('light');
              },
            },
          ],
        },
        {
          label: 'Animations & whimsy',
          type: 'checkbox',
          checked: currentMotion === 'on',
          click: (item) => {
            setAppMotion(item.checked ? 'on' : 'off');
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates…',
          click: () => {
            checkForUpdatesFromMenu();
          },
        },
        { type: 'separator' },
        {
          label: 'Release notes (GitHub)',
          click: () => {
            shell.openExternal('https://github.com/SmallerBytes/Wurlding/releases').catch(() => {});
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.on('preferences-saved', (_event, prefs) => {
  const theme = prefs?.theme === 'dark' || prefs?.theme === 'light' ? prefs.theme : currentAppTheme;
  const motion = prefs?.motion === 'on' || prefs?.motion === 'off' ? prefs.motion : currentMotion;
  const critters = CRITTER_GENRES.includes(prefs?.critters) ? prefs.critters : currentCritters;
  currentAppTheme = theme;
  currentMotion = motion;
  currentCritters = critters;
  try {
    writeDiskPreferences(currentPreferences());
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] Failed to mirror preferences:', err);
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (!isAppWindow(win)) continue;
    try {
      win.setBackgroundColor(themeBackgroundColor(theme));
    } catch {
      // ignore
    }
  }
  createApplicationMenu();
});

app.whenReady().then(async () => {
  app.setAppUserModelId('com.wurlding.app');
  await startServer();
  applySavedPreferencesFromDisk();
  createApplicationMenu();
  setupAutoUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
