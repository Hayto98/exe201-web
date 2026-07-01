'use client';

import { useEffect, useState } from 'react';
import type { Language } from './translations';
import { timeGreeting } from './translations';

/** Lời chào theo giờ thực — cập nhật mỗi phút */
export function useTimeGreeting(lang: Language, name: string): string {
  const [greeting, setGreeting] = useState(() => timeGreeting(lang, name));

  useEffect(() => {
    const tick = () => setGreeting(timeGreeting(lang, name));
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [lang, name]);

  return greeting;
}
