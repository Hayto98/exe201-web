'use client';

import { useEffect, useState } from 'react';

/** Re-render every minute so relative times (e.g. "vừa xong") stay accurate. */
export function useMinuteTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return tick;
}
