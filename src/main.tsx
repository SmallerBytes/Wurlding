import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import useStore from './store/useStore';
import { loadFromFile } from './store/useStore';

loadFromFile().then((fileData) => {
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
