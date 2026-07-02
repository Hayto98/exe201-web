'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle,
  Flower2,
  Hand,
  MailCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline, friendlyTime, localizedEventText } from '@/lib/i18n/translations';
import { markAllNotificationsRead, markNotificationRead } from '@/lib/repository/notifications';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';
import type { EsmeryNotification, NotificationType } from '@/lib/repository/types';
import styles from './NotificationBell.module.css';

function notificationIcon(type: NotificationType) {
  switch (type) {
    case 'check_in_success':
      return <CheckCircle size={18} />;
    case 'friend_request':
      return <Users size={18} />;
    case 'gentle_nudge':
      return <Hand size={18} />;
    case 'missed_check_in':
    case 'emergency_alert':
      return <AlertTriangle size={18} />;
    case 'moment_shared':
      return <Flower2 size={18} />;
    default:
      return <Bell size={18} />;
  }
}

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);

  const notifications = state?.notifications ?? [];
  const unread = notifications.filter((n) => !n.is_read);
  const unreadCount = unread.length;
  const hasNew = unreadCount > 0;

  // Refresh faster while notification panel is open
  useAutoRefresh(refresh, open && Boolean(user), 8_000);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleItemClick = async (notification: EsmeryNotification) => {
    if (!user || notification.is_read) return;
    try {
      await markNotificationRead(user.id, notification.id);
      await refresh();
    } catch (err) {
      console.error('[notifications]', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      await markAllNotificationsRead(
        user.id,
        unread.map((n) => n.id)
      );
      await refresh();
    } catch (err) {
      console.error('[notifications]', err);
    }
  };

  const badgeLabel =
    unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : undefined;

  return (
    <>
      <button
        type="button"
        className={`${styles.bellBtn} ${hasNew ? styles.bellBtnActive : ''} ${className ?? ''}`}
        onClick={handleOpen}
        aria-label={
          hasNew
            ? tInline(lang, `${unreadCount} new notifications`, `${unreadCount} thông báo mới`)
            : tInline(lang, 'Notifications', 'Thông báo')
        }
        aria-expanded={open}
      >
        <span className={styles.bellIconWrap}>
          {hasNew ? <BellRing size={18} /> : <Bell size={18} />}
          {hasNew && <span className={styles.pulseRing} aria-hidden />}
        </span>
        {hasNew && badgeLabel && (
          <span className={styles.badge} aria-hidden>
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label={tInline(lang, 'Close', 'Đóng')}
          onClick={handleClose}
        />
      )}

      <div
        className={styles.sheet}
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-label={tInline(lang, 'Notifications', 'Thông báo')}
        aria-hidden={!open}
      >
        <div className={styles.sheetHandle} />
        <div className={styles.sheetHeader}>
          <div>
            <h2 className={styles.sheetTitle}>{tInline(lang, 'Notifications', 'Thông báo')}</h2>
            {hasNew && (
              <p className={styles.sheetSubtitle}>
                {tInline(
                  lang,
                  `${unreadCount} unread`,
                  `${unreadCount} chưa đọc`
                )}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.sheetClose}
            onClick={handleClose}
            aria-label={tInline(lang, 'Close', 'Đóng')}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.sheetBody}>
          {notifications.length === 0 ? (
            <p className={styles.empty}>
              {tInline(lang, 'No notifications yet.', 'Chưa có thông báo.')}
            </p>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <button
                key={n.id}
                type="button"
                className={`${styles.item} ${!n.is_read ? styles.itemUnread : ''}`}
                onClick={() => handleItemClick(n)}
              >
                <span className={styles.itemIcon}>{notificationIcon(n.type)}</span>
                <span className={styles.itemContent}>
                  <strong className={styles.itemTitle}>{localizedEventText(lang, n.title)}</strong>
                  <span className={styles.itemBody}>{localizedEventText(lang, n.body)}</span>
                  <span className={styles.itemTime}>{friendlyTime(n.created_at, lang)}</span>
                </span>
                {!n.is_read && <span className={styles.unreadDot} aria-hidden />}
              </button>
            ))
          )}
        </div>

        {hasNew && (
          <div className={styles.sheetFooter}>
            <button type="button" className={styles.markAllBtn} onClick={handleMarkAllRead}>
              <MailCheck size={16} />
              {tInline(lang, 'Mark all read', 'Đánh dấu đã đọc')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
