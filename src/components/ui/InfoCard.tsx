import styles from './InfoCard.module.css';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
}

export function InfoCard({ icon, title, body }: InfoCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrapper}>{icon}</div>
      <div className={styles.content}>
        <h4 className={styles.title}>{title}</h4>
        <p className={styles.body}>{body}</p>
      </div>
    </div>
  );
}
