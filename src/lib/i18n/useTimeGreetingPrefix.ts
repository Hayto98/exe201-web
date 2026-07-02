'use client';

import { useEffect, useState } from 'react';
import type { Language } from './translations';
import { timeGreetingPrefix } from './translations';

/** Lời chào theo giờ (không kèm tên) — cập nhật mỗi phút */
export function useTimeGreetingPrefix(lang: Language): string {
  const [prefix, setPrefix] = useState(() => timeGreetingPrefix(lang));

  useEffect(() => {
    const tick = () => setPrefix(timeGreetingPrefix(lang));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [lang]);

  return prefix;
}
