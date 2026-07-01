import styles from './ScreenLayout.module.css';

interface ScreenLayoutProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ScreenLayout({ title, subtitle, actions, children }: ScreenLayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
