import type { ReactNode } from 'react';
import { NotificationBell } from '@/components/ui/NotificationBell';
import styles from './ScreenLayout.module.css';

interface ScreenLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  hideNotifications?: boolean;
}

export function ScreenLayout({ title, subtitle, actions, children, hideNotifications }: ScreenLayoutProps) {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.toolbar}>
          {!hideNotifications && <NotificationBell />}
          {actions}
        </div>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
