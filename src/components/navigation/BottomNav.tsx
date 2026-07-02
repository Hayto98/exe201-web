'use client';

import { useEffect, useState } from 'react';
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
  LayoutGrid,
  X,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { t } from '@/lib/i18n/translations';
import styles from './BottomNav.module.css';

import type { LucideIcon } from 'lucide-react';

type PrimaryTab = { href: string; icon: LucideIcon; key: 'hearth' | 'circle' | 'crisis' | 'nav_plans_short'; accent?: boolean };
const primaryTabs: PrimaryTab[] = [
  { href: '/dashboard', icon: Home, key: 'hearth' },
  { href: '/dashboard/circle', icon: Users, key: 'circle' },
  { href: '/dashboard/crisis', icon: AlertTriangle, key: 'crisis', accent: true },
  { href: '/dashboard/plans', icon: CreditCard, key: 'nav_plans_short' },
];

const moreTabs = [
  { href: '/dashboard/timeline', icon: Clock, key: 'timeline' as const },
  { href: '/dashboard/moments', icon: Flower2, key: 'moments' as const },
  { href: '/dashboard/safety', icon: Shield, key: 'safety' as const },
  { href: '/dashboard/profile', icon: User, key: 'profile' as const },
] as const;

const morePaths = moreTabs.map((tab) => tab.href);

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = morePaths.some((href) => isActive(pathname, href));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={t(lang, 'cancel')}
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div className={styles.moreSheet} data-open={moreOpen} role="dialog" aria-modal="true" aria-hidden={!moreOpen}>
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <span>{t(lang, 'nav_more')}</span>
          <button type="button" className={styles.sheetClose} onClick={() => setMoreOpen(false)} aria-label={t(lang, 'cancel')}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.sheetGrid}>
          {moreTabs.map(({ href, icon: Icon, key }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.sheetItem} ${active ? styles.sheetItemActive : ''}`}
                onClick={() => setMoreOpen(false)}
              >
                <span className={styles.sheetIcon}>
                  <Icon size={22} />
                </span>
                <span>{t(lang, key)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <nav className={styles.bottomNav} aria-label="Main navigation">
        {primaryTabs.map(({ href, icon: Icon, key, accent }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`${styles.tab} ${active ? styles.active : ''} ${accent ? styles.accentTab : ''}`}
            >
              <span className={styles.iconWrap}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {active && <span className={styles.activeDot} />}
              </span>
              <span className={styles.label}>{t(lang, key)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          className={`${styles.tab} ${moreActive ? styles.active : ''} ${moreOpen ? styles.moreOpen : ''}`}
          aria-expanded={moreOpen}
          aria-controls="bottom-nav-more"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <span className={styles.iconWrap}>
            <LayoutGrid size={22} strokeWidth={moreActive || moreOpen ? 2.5 : 2} />
            {(moreActive || moreOpen) && <span className={styles.activeDot} />}
          </span>
          <span className={styles.label}>{t(lang, 'nav_more')}</span>
        </button>
      </nav>
    </>
  );
}
