'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/navigation/Sidebar';
import { BottomNav } from '@/components/navigation/BottomNav';
import { useAuth } from '@/contexts/AppProviders';
import styles from './dashboard.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className={styles.shell} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
      <BottomNav />
    </div>
  );
}
