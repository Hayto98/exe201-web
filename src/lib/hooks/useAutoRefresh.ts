'use client';

import { useEffect } from 'react';

/**
 * Periodically refresh app state — used for notifications, nudges, check-in times.
 * Also refreshes when the tab becomes visible again.
 */
export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  enabled: boolean,
  intervalMs = 15_000
) {
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      void refresh();
    };

    const id = window.setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh, enabled, intervalMs]);
}
