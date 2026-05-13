const path = require('path');
const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { pathToFileURL } = require('url');

let serverStarted = false;

/** True after user picks Help → Check for Updates (used for friendlier dialogs). */
let userRequestedUpdateCheck = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#0a0a0f',
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
    await import(pathToFileURL(serverPath).href);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] Failed to start data server:', err);
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) return null;

  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] electron-updater not available:', e);
    return null;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] updater error:', err);
    if (userRequestedUpdateCheck) {
      userRequestedUpdateCheck = false;
      dialog.showErrorBox('Update check failed', String(err?.message || err));
    }
  });

  autoUpdater.on('update-available', (info) => {
    userRequestedUpdateCheck = false;
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update available',
        message: `Wurlding ${info.version} is available.`,
        detail: 'The update will download in the background. You will be asked to restart when it is ready to install.',
        buttons: ['OK'],
      })
      .catch(() => {});
  });

  autoUpdater.on('update-not-available', () => {
    if (userRequestedUpdateCheck) {
      userRequestedUpdateCheck = false;
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
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: `Version ${info.version} is ready to install.`,
        detail: 'Restart now to finish updating. Your saved worlds stay on this computer.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      })
      .catch(() => {});
  });

  // Quiet check a few seconds after launch (does not block startup).
  setTimeout(() => {
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
  try {
    await autoUpdater.checkForUpdates();
  } catch (e) {
    userRequestedUpdateCheck = false;
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
