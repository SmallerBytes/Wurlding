import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import useStore from './store/useStore';
import { loadFromFile } from './store/useStore';
import {
  fetchSavedPreferences,
  initMotion,
  initTheme,
  setCritterScales,
  setCritters,
  setMotion,
  setTheme,
} from './theme';
import { fetchCustomCritters } from './data/customCritters';

initTheme();
initMotion();

Promise.all([loadFromFile(), fetchSavedPreferences(), fetchCustomCritters()]).then(
  ([fileData, prefs]) => {
    if (prefs) {
      setTheme(prefs.theme);
      setMotion(prefs.motion);
      setCritters(prefs.critters);
      setCritterScales(prefs.critterScales ?? {});
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
  },
);
