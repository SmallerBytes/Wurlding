const path = require('path');
const { app, BrowserWindow } = require('electron');
const { pathToFileURL } = require('url');

let serverStarted = false;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '..', 'build', 'app-icon.png'),
    webPreferences: {
      // This app is local-only; we don't need Node in the renderer.
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
    // Import in-process (spawn breaks when files are inside asar).
    await import(pathToFileURL(serverPath).href);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[WURLDING] Failed to start data server:', err);
  }
}

app.whenReady().then(async () => {
  // Helps Windows show the correct icon in taskbar/notifications.
  app.setAppUserModelId('com.wurlding.app');
  await startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

