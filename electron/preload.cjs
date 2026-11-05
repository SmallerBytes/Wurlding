const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wurldingDesktop', {
  preferencesSaved: (prefs) => {
    ipcRenderer.send('preferences-saved', prefs);
  },
});
