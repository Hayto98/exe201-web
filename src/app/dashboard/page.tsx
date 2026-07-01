'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle,
  Users as Group,
  LogOut,
  MailCheck,
  TriangleAlert,
} from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { SafeButton } from '@/components/ui/SafeButton';
import { LanguageButton } from '@/components/ui/LanguageButton';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { useTimeGreeting } from '@/lib/i18n/useTimeGreeting';
import { tInline, friendlyTime } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';
import styles from './hearth.module.css';

export default function HearthPage() {
  const { signOut, user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const greeting = useTimeGreeting(
    lang,
    state?.profile.display_name ?? user?.display_name ?? 'ESMERY'
  );

  if (!state) return null;

  const unread = state.notifications.filter((n) => !n.is_read);
  const needsAttention = unread.some((n) => n.type === 'missed_check_in' || n.type === 'emergency_alert');
  const acceptedCount = state.circleMembers.filter((m) => m.status === 'accepted').length;
  const pendingDeliveries = state.notificationDeliveries.filter((d) => d.status === 'pending').length;
  const activeAlert = state.alertIncidents.find((i) => i.status === 'active' || i.status === 'escalated');

  const handleCheckIn = async () => {
    if (!user) return;
    memory.checkIn(user.id);
    await refresh();
    setToast(tInline(lang, 'Your circle has been notified.', 'Vòng thân của bạn đã được thông báo.'));
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  const recentNotifications = state.notifications.slice(0, 3);

  return (
    <ScreenLayout
      title={greeting}
      subtitle={tInline(
        lang,
        `Last check-in: ${friendlyTime(state.profile.last_safe_at, lang)}`,
        `Lần xác nhận gần nhất: ${friendlyTime(state.profile.last_safe_at, lang)}`
      )}
      actions={
        <>
          <LanguageButton />
          <PrimaryButton text={tInline(lang, 'Sign Out', 'Đăng xuất')} icon={<LogOut size={16} />} onClick={handleLogout} fullWidth={false} variant="outline" size="small" />
        </>
      }
    >
      {toast && (
        <div className={styles.toastWrap}>
          <InlineMessage text={toast} variant="success" />
        </div>
      )}
      <SafeButton
        label={tInline(lang, "I'm Safe", 'Tôi an toàn')}
        successLabel={tInline(lang, 'All safe!', 'An toàn rồi!')}
        onClick={handleCheckIn}
      />
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
          <h3 style={{ fontWeight: 800, margin: '8px 0 0', color: 'var(--color-cocoa)' }}>
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
                recentNotifications.forEach((n) => {
                  if (!n.is_read) memory.markNotificationRead(user.id, n.id);
                });
                await refresh();
              }}
            />
          )}
        </>
      )}
    </ScreenLayout>
  );
}
