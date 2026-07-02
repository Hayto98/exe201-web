'use client';

import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';
import btnStyles from './PrimaryButton.module.css';
import styles from './LanguageButton.module.css';

export function LanguageButton() {
  const { lang, toggle } = useLanguage();
  return (
    <button
      type="button"
      className={`${btnStyles.button} ${btnStyles.outline} ${btnStyles.small} ${styles.button}`}
      onClick={toggle}
      aria-label={lang === 'en' ? 'Switch to Vietnamese' : 'Switch to English'}
    >
      <Languages size={16} />
      <span className={styles.label}>{lang === 'en' ? 'Tiếng Việt' : 'English'}</span>
    </button>
  );
}
