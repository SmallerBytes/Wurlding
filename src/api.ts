/**
 * Base URL for the Wurlding data server (no trailing slash).
 * In Vite dev, empty string uses same-origin requests + `vite.config.ts` proxy → :3001.
 */
export const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:3001';
