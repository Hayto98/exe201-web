import { Heart } from 'lucide-react';
import styles from './BrandHeader.module.css';

interface BrandHeaderProps {
  title: string;
  subtitle: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  return (
    <div className={styles.brand}>
      <div className={styles.iconWrap}>
        <Heart size={32} fill="white" strokeWidth={0} />
      </div>
      <h1 className={styles.logo}>ESMERY</h1>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}
