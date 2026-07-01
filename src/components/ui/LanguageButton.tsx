'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';
import btnStyles from './PrimaryButton.module.css';

export function LanguageButton() {
  const { lang, toggle } = useLanguage();
  return (
    <button type="button" className={`${btnStyles.button} ${btnStyles.outline} ${btnStyles.small}`} onClick={toggle} style={{ width: 'auto' }}>
      <Languages size={16} />
      {lang === 'en' ? 'Tiếng Việt' : 'English'}
    </button>
  );
}
