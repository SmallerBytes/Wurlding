import { useEffect, useState } from 'react';

export type SavedStatus = 'idle' | 'saved';

export default function useSavedStatus(durationMs = 1200) {
  const [status, setStatus] = useState<SavedStatus>('idle');

  useEffect(() => {
    if (status !== 'saved') return;
    const t = window.setTimeout(() => setStatus('idle'), durationMs);
    return () => window.clearTimeout(t);
  }, [status, durationMs]);

  return {
    savedStatus: status,
    markSaved: () => setStatus('saved'),
    resetSaved: () => setStatus('idle'),
  };
}

