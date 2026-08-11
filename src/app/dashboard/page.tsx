'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ArrowRight,
  Gift,
  Sparkles,
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
import { getCheckInAvailability } from '@/lib/safety/checkInSchedule';
import { useMinuteTick } from '@/lib/hooks/useMinuteTick';
import * as memory from '@/lib/repository/memoryRepository';
import styles from './hearth.module.css';
import { augustPromoDaysLeft, isAugustMonthlyPromoActive } from '@/lib/promotions/augustMonthly';

export default function HearthPage() {
  const { signOut, user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  useMinuteTick();
  const greetingPrefix = useTimeGreetingPrefix(lang);
  const displayName = state?.profile.display_name ?? user?.display_name ?? 'ESMERY';

  if (!state) return null;

  const unread = state.notifications.filter((n) => !n.is_read);
  const needsAttention = unread.some((n) => n.type === 'missed_check_in' || n.type === 'emergency_alert');
  const acceptedCount = state.circleMembers.filter((m) => m.status === 'accepted').length;
  const pendingDeliveries = state.notificationDeliveries.filter((d) => d.status === 'pending').length;
  const activeAlert = state.alertIncidents.find((i) => i.status === 'active' || i.status === 'escalated');
  const lastCheckInLabel = friendlyTime(state.profile.last_safe_at, lang);
  const checkInAvailability = getCheckInAvailability(state.safetyRhythms, state.checkIns);
  const nextOpenLabel = checkInAvailability.nextOpensAt?.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hour12: lang !== 'vi',
  });
  const promoActive = isAugustMonthlyPromoActive();

  const handleCheckIn = async () => {
    if (!user) return;
    if (!checkInAvailability.canCheckIn) {
      setToast(
        checkInAvailability.completedCurrentWindow
          ? tInline(lang, 'You already checked in for this time slot. Please wait for the next one.', 'Bạn đã check-in cho khung giờ này. Hãy đợi khung giờ tiếp theo.')
          : tInline(lang, `Check-in opens at ${nextOpenLabel}.`, `Check-in sẽ mở lúc ${nextOpenLabel}.`)
      );
      setTimeout(() => setToast(null), 3500);
      return;
    }
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
      setToast(
        err instanceof Error && err.message === 'CHECK_IN_NOT_AVAILABLE'
          ? tInline(lang, 'This check-in slot is no longer available.', 'Khung giờ check-in này hiện không còn khả dụng.')
          : tInline(lang, 'Check-in failed. Please try again.', 'Xác nhận thất bại. Vui lòng thử lại.')
      );
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
      {promoActive && (
        <Link href="/dashboard/plans" className={styles.homePromo}>
          <div className={styles.homePromoGlow} aria-hidden><Sparkles size={18} /></div>
          <div className={styles.homePromoGift} aria-hidden><Gift size={38} /></div>
          <div className={styles.homePromoCopy}>
            <span>{tInline(lang, 'AUGUST SPECIAL · 01/08–30/08', 'ƯU ĐÃI THÁNG 8 · 01/08–30/08')}</span>
            <strong>{tInline(lang, 'Buy 1 month, get 1 month free!', 'Mua 1 tháng, tặng ngay 1 tháng!')}</strong>
            <small>{tInline(lang, `${augustPromoDaysLeft()} days left · Tap to claim`, `Còn ${augustPromoDaysLeft()} ngày · Chạm để nhận ưu đãi`)}</small>
          </div>
          <ArrowRight className={styles.homePromoArrow} size={22} />
        </Link>
      )}
      <div className={styles.safeSection}>
        <SafeButton
          label={
            checkInAvailability.completedCurrentWindow
              ? tInline(lang, 'Checked in', 'Đã check-in')
              : checkInAvailability.canCheckIn
                ? tInline(lang, "I'm Safe", 'Tôi an toàn')
                : tInline(lang, 'Waiting for next slot', 'Đợi khung giờ tiếp theo')
          }
          successLabel={tInline(lang, 'All safe!', 'An toàn rồi!')}
          onClick={handleCheckIn}
          disabled={!checkInAvailability.canCheckIn}
        />
        {checkInAvailability.hasSchedule && !checkInAvailability.canCheckIn && (
          <p className={styles.scheduleHint}>
            {checkInAvailability.completedCurrentWindow
              ? tInline(lang, `Next check-in opens at ${nextOpenLabel}.`, `Khung check-in kế tiếp mở lúc ${nextOpenLabel}.`)
              : tInline(lang, `The next check-in opens at ${nextOpenLabel}, one hour before ${checkInAvailability.nextRhythm?.check_time}.`, `Khung check-in kế tiếp mở lúc ${nextOpenLabel}, trước 1 giờ so với ${checkInAvailability.nextRhythm?.check_time}.`)}
          </p>
        )}
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
