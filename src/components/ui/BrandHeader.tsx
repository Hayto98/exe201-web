import logoImage from '../../../logo/esmery-horizontal-clean.jpg';
import styles from './BrandHeader.module.css';

interface BrandHeaderProps {
  title: string;
  subtitle: string;
}

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  return (
    <div className={styles.brand}>
      <div className={styles.logoImage} style={{ backgroundImage: `url(${logoImage.src})` }} aria-label="ESMERY" />
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}
