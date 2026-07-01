'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Clock, Flower2, Shield, AlertTriangle, CreditCard, User } from 'lucide-react';
import styles from './BottomNav.module.css';

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Hearth' },
  { href: '/dashboard/circle', icon: Users, label: 'Circle' },
  { href: '/dashboard/timeline', icon: Clock, label: 'Time' },
  { href: '/dashboard/moments', icon: Flower2, label: 'Moments' },
  { href: '/dashboard/safety', icon: Shield, label: 'Safety' },
  { href: '/dashboard/crisis', icon: AlertTriangle, label: 'Crisis' },
  { href: '/dashboard/plans', icon: CreditCard, label: 'Plans' },
  { href: '/dashboard/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNav}>
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className={`${styles.tab} ${active ? styles.active : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
