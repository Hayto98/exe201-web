'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  Clock,
  Flower2,
  Shield,
  AlertTriangle,
  CreditCard,
  User,
  Heart,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { t } from '@/lib/i18n/translations';
import styles from './Sidebar.module.css';

const tabs = [
  { href: '/dashboard', icon: Home, key: 'hearth' as const },
  { href: '/dashboard/circle', icon: Users, key: 'circle' as const },
  { href: '/dashboard/timeline', icon: Clock, key: 'timeline' as const },
  { href: '/dashboard/moments', icon: Flower2, key: 'moments' as const },
  { href: '/dashboard/safety', icon: Shield, key: 'safety' as const },
  { href: '/dashboard/crisis', icon: AlertTriangle, key: 'crisis' as const },
  { href: '/dashboard/plans', icon: CreditCard, key: 'plans' as const },
  { href: '/dashboard/profile', icon: User, key: 'profile' as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { lang } = useLanguage();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Heart size={24} fill="var(--color-primary)" strokeWidth={0} />
        <span>ESMERY</span>
      </div>
      <nav className={styles.nav}>
        {tabs.map(({ href, icon: Icon, key }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`${styles.link} ${active ? styles.active : ''}`}>
              <Icon size={20} />
              <span>{t(lang, key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
