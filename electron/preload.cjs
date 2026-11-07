const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wurldingDesktop', {
  preferencesSaved: (prefs) => {
    ipcRenderer.send('preferences-saved', prefs);
  },
  setDesktopCompanions: (enabled) => {
    ipcRenderer.send('set-desktop-companions', Boolean(enabled));
  },
  getDesktopCompanions: () => ipcRenderer.invoke('get-desktop-companions'),
  isCompanionOverlay: () => ipcRenderer.invoke('is-companion-overlay'),
});
