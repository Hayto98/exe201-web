import styles from './AvatarInitial.module.css';

interface AvatarInitialProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  imageUrl?: string | null;
}

export function AvatarInitial({ name, size = 'md', imageUrl }: AvatarInitialProps) {
  const initial = name.charAt(0).toUpperCase();
  if (imageUrl) {
    return <img src={imageUrl} alt={name} className={`${styles.avatar} ${styles[size]}`} />;
  }
  return <div className={`${styles.avatar} ${styles[size]}`}>{initial}</div>;
}
