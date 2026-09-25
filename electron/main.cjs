const path = require('path');
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
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
let currentAppTheme = 'light';
/** Whimsical animations preference mirrored from the renderer (`on` | `off`). */
let currentMotion = 'on';

function applyMotionInAllWindows(pref) {
  const safe = pref === 'off' ? 'off' : 'on';
  const script = `(function () {
    try {
      localStorage.setItem('wurlding:motion', ${JSON.stringify(safe)});
      document.documentElement.setAttribute('data-motion', ${JSON.stringify(safe)});
      window.dispatchEvent(new CustomEvent('wurlding:motion', { detail: ${JSON.stringify(safe)} }));
    } catch (e) {}
  })();`;
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    win.webContents.executeJavaScript(script).catch(() => {});
  }
}

function setAppMotion(pref) {
  const next = pref === 'off' ? 'off' : 'on';
  if (currentMotion === next) return;
  currentMotion = next;
  applyMotionInAllWindows(next);
  createApplicationMenu();
}

function themeBackgroundColor(theme) {
  return theme === 'light' ? '#f4f1ea' : '#0a0a0f';
}

function applyThemeInAllWindows(theme) {
  const safe = theme === 'light' ? 'light' : 'dark';
  const bg = themeBackgroundColor(safe);
  const script = `(function () {
    try {
      localStorage.setItem('wurlding:theme', ${JSON.stringify(safe)});
      document.documentElement.setAttribute('data-theme', ${JSON.stringify(safe)});
      document.documentElement.style.colorScheme = ${JSON.stringify(safe)};
      window.dispatchEvent(new CustomEvent('wurlding:theme', { detail: ${JSON.stringify(safe)} }));
    } catch (e) {}
  })();`;

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.setBackgroundColor(bg);
    } catch {
      // ignore
    }
    win.webContents.executeJavaScript(script).catch(() => {});
  }
}

function setAppTheme(theme) {
  const next = theme === 'light' ? 'light' : 'dark';
  if (currentAppTheme === next) return;
  currentAppTheme = next;
  applyThemeInAllWindows(next);
  createApplicationMenu();
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
            theme: t === 'light' || t === 'dark' ? t : 'light',
            motion: m === 'off' ? 'off' : 'on',
          };
        } catch (e) { return { theme: 'light', motion: 'on' }; }
      })()`,
    )
    .then((prefs) => {
      const nextTheme = prefs?.theme === 'dark' ? 'dark' : 'light';
      const nextMotion = prefs?.motion === 'off' ? 'off' : 'on';
      let changed = false;
      if (currentAppTheme !== nextTheme) {
        currentAppTheme = nextTheme;
        changed = true;
        try {
          win.setBackgroundColor(themeBackgroundColor(nextTheme));
        } catch {
          // ignore
        }
      }
      if (currentMotion !== nextMotion) {
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: themeBackgroundColor(currentAppTheme),
    icon: path.join(__dirname, '..', 'build', 'app-icon.png'),
    webPreferences: {
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

  win.webContents.on('did-finish-load', () => {
    syncThemeFromRenderer(win);
  });
  win.on('focus', () => {
    syncThemeFromRenderer(win);
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

app.whenReady().then(async () => {
  app.setAppUserModelId('com.wurlding.app');
  await startServer();
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
