'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle,
  Clock,
  LogOut,
  MailCheck,
  TriangleAlert,
  Users as Group,
} from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { SafeButton } from '@/components/ui/SafeButton';
import { LanguageButton } from '@/components/ui/LanguageButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useTimeGreetingPrefix } from '@/lib/i18n/useTimeGreetingPrefix';
import { tInline, friendlyTime } from '@/lib/i18n/translations';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { checkInSupabase } from '@/lib/repository/supabaseRepository';
import { markAllNotificationsRead } from '@/lib/repository/notifications';
import * as memory from '@/lib/repository/memoryRepository';
import styles from './hearth.module.css';

export default function HearthPage() {
  const { signOut, user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const greetingPrefix = useTimeGreetingPrefix(lang);
  const displayName = state?.profile.display_name ?? user?.display_name ?? 'ESMERY';

  if (!state) return null;

  const unread = state.notifications.filter((n) => !n.is_read);
  const needsAttention = unread.some((n) => n.type === 'missed_check_in' || n.type === 'emergency_alert');
  const acceptedCount = state.circleMembers.filter((m) => m.status === 'accepted').length;
  const pendingDeliveries = state.notificationDeliveries.filter((d) => d.status === 'pending').length;
  const activeAlert = state.alertIncidents.find((i) => i.status === 'active' || i.status === 'escalated');
  const lastCheckInLabel = friendlyTime(state.profile.last_safe_at, lang);

  const handleCheckIn = async () => {
    if (!user) return;
    try {
      if (isSupabaseConfigured()) {
        await checkInSupabase(user.id);
      } else {
        memory.checkIn(user.id);
      }
      await refresh();
      setToast(tInline(lang, 'Your circle has been notified.', 'Vòng thân của bạn đã được thông báo.'));
    } catch (err) {
      console.error('[checkIn]', err);
      setToast(tInline(lang, 'Check-in failed. Please try again.', 'Xác nhận thất bại. Vui lòng thử lại.'));
    }
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  const recentNotifications = state.notifications.slice(0, 3);

  return (
    <ScreenLayout
      title={
        <span className={styles.hero}>
          <span className={styles.greetingPrefix}>{greetingPrefix}</span>
          <span className={styles.greetingName}>{displayName}</span>
        </span>
      }
      subtitle={
        <span className={styles.checkInBadge}>
          <Clock size={15} aria-hidden />
          {tInline(
            lang,
            `Last check-in: ${lastCheckInLabel}`,
            `Lần xác nhận gần nhất: ${lastCheckInLabel}`
          )}
        </span>
      }
      actions={
        <div className={styles.toolbarActions}>
          <LanguageButton />
          <button
            type="button"
            className={styles.iconAction}
            onClick={handleLogout}
            aria-label={tInline(lang, 'Sign Out', 'Đăng xuất')}
          >
            <LogOut size={16} />
            <span className={styles.iconActionLabel}>{tInline(lang, 'Sign Out', 'Đăng xuất')}</span>
          </button>
        </div>
      }
    >
      {toast && (
        <div className={styles.toastWrap}>
          <InlineMessage text={toast} variant="success" />
        </div>
      )}
      <div className={styles.safeSection}>
        <SafeButton
          label={tInline(lang, "I'm Safe", 'Tôi an toàn')}
          successLabel={tInline(lang, 'All safe!', 'An toàn rồi!')}
          onClick={handleCheckIn}
        />
      </div>
      <InfoCard
        icon={<BellRing size={24} />}
        title={tInline(lang, 'Safety signal ready', 'Tín hiệu an toàn đã sẵn sàng')}
        body={tInline(lang, 'Your circle has been notified.', 'Vòng thân của bạn đã được thông báo.')}
      />
      <InfoCard
        icon={needsAttention ? <TriangleAlert size={24} /> : <Check size={24} />}
        title={
          needsAttention
            ? tInline(lang, 'Needs attention', 'Cần chú ý')
            : tInline(lang, 'You are marked safe', 'Bạn đang được ghi nhận an toàn')
        }
        body={tInline(
          lang,
          `Inactivity window: ${state.safetySettings.inactivity_hours}h, escalation delay: ${state.safetySettings.escalation_delay_minutes}m.`,
          `Ngưỡng không hoạt động: ${state.safetySettings.inactivity_hours} giờ, chờ cảnh báo: ${state.safetySettings.escalation_delay_minutes} phút.`
        )}
      />
      <InfoCard
        icon={<Group size={24} />}
        title={tInline(lang, 'Circle health', 'Tình trạng vòng thân')}
        body={tInline(lang, `${acceptedCount} trusted people connected.`, `${acceptedCount} người tin cậy đang kết nối.`)}
      />
      <InfoCard
        icon={<Bell size={24} />}
        title={tInline(lang, 'Delivery & automation', 'Gửi thông báo & tự động')}
        body={tInline(
          lang,
          `Pending: ${pendingDeliveries}${activeAlert ? ', active alert' : ''}`,
          `Đang chờ: ${pendingDeliveries}${activeAlert ? ', cảnh báo đang hoạt động' : ''}`
        )}
      />
      {recentNotifications.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>
            {tInline(lang, 'Recent notifications', 'Thông báo gần đây')}
          </h3>
          {recentNotifications.map((n) => (
            <InfoCard
              key={n.id}
              icon={<CheckCircle size={24} />}
              title={n.title}
              body={n.body}
            />
          ))}
          {recentNotifications.some((n) => !n.is_read) && (
            <PrimaryButton
              text={tInline(lang, 'Mark all read', 'Đánh dấu đã đọc')}
              variant="outline"
              size="small"
              icon={<MailCheck size={16} />}
              onClick={async () => {
                if (!user) return;
                await markAllNotificationsRead(
                  user.id,
                  recentNotifications.filter((n) => !n.is_read).map((n) => n.id)
                );
                await refresh();
              }}
            />
          )}
        </>
      )}
    </ScreenLayout>
  );
}
