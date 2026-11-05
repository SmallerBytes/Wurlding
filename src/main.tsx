import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import useStore from './store/useStore';
import { loadFromFile } from './store/useStore';
import { fetchSavedPreferences, initMotion, initTheme, setCritters, setMotion, setTheme } from './theme';

initTheme();
initMotion();

Promise.all([loadFromFile(), fetchSavedPreferences()]).then(([fileData, prefs]) => {
  if (prefs) {
    setTheme(prefs.theme);
    setMotion(prefs.motion);
    setCritters(prefs.critters);
  }
  if (fileData) {
    useStore.getState()._hydrateFromFile(fileData);
    console.log('[WURLDING] Loaded data from file server');
  } else {
    console.log('[WURLDING] No file server data — using localStorage');
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
