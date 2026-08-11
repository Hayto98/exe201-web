'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CreditCard, Gift, Loader2, Sparkles } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { CardBlock } from '@/components/ui/CardBlock';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { choosePlan as applyPlan } from '@/lib/repository/plans';
import { resolveSepayQrUrl, getSepayBankAccount, getSepayBankCode } from '@/lib/sepay';
import type { SubscriptionPlan } from '@/lib/repository/types';
import styles from './plans.module.css';
import { augustPromoDaysLeft, isAugustMonthlyPromoActive } from '@/lib/promotions/augustMonthly';

const plans: {
  id: SubscriptionPlan;
  titleEn: string;
  titleVi: string;
  priceEn: string;
  priceVi: string;
  bodyEn: string;
  bodyVi: string;
}[] = [
  { id: 'basic', titleEn: 'Basic Care', titleVi: 'Chăm sóc cơ bản', priceEn: 'Free', priceVi: 'Miễn phí', bodyEn: 'Essential safety check-ins.', bodyVi: 'Xác nhận an toàn cơ bản.' },
  { id: 'monthly', titleEn: 'Advanced Monthly', titleVi: 'Nâng cao tháng', priceEn: '49,000 VND/mo', priceVi: '49.000đ/tháng', bodyEn: 'Moments, premium alerts.', bodyVi: 'Khoảnh khắc, cảnh báo cao cấp.' },
  { id: 'yearly', titleEn: 'Advanced Yearly', titleVi: 'Nâng cao năm', priceEn: '499,000 VND/yr', priceVi: '499.000đ/năm', bodyEn: 'Best value for your circle.', bodyVi: 'Tiết kiệm nhất cho vòng thân.' },
];

export default function PlansPage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [message, setMessage] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);

  const latestOrder = state?.paymentOrders.find((o) => o.status === 'pending');
  const pendingPlan = latestOrder?.plan ?? null;
  const currentPlan = state?.subscriptionStatus.plan ?? 'basic';
  const isPremium = state?.entitlement.is_premium ?? false;
  const yearlyValidUntil = state?.entitlement.valid_until;
  const hasActiveYearlyPlan =
    currentPlan === 'yearly' &&
    isPremium &&
    (!yearlyValidUntil || new Date(yearlyValidUntil).getTime() > Date.now());
  const augustPromoActive = isAugustMonthlyPromoActive();
  const promoDaysLeft = augustPromoDaysLeft();

  // Poll payment status (giống mobile PlansViewModel)
  useEffect(() => {
    if (!latestOrder) return;
    const timer = setInterval(() => {
      refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [latestOrder?.reference_code, refresh]);

  const handleChoosePlan = async (plan: SubscriptionPlan) => {
    if (!user) return;
    setLoadingPlan(plan);
    setMessage(null);
    try {
      await applyPlan(user.id, plan);
      await refresh();
      if (plan === 'basic') {
        setMessage({
          text: tInline(lang, 'Switched to Basic Care.', 'Đã chuyển sang gói cơ bản.'),
          variant: 'success',
        });
      } else {
        setMessage({
          text: tInline(lang, 'Payment order created. Scan QR to pay.', 'Đã tạo đơn. Quét QR để thanh toán.'),
          variant: 'success',
        });
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';
      const friendlyMessage = rawMessage.includes('Gói Nâng cao năm')
        ? rawMessage
        : rawMessage.includes('payment') || rawMessage.includes('mã thanh toán')
          ? tInline(lang, 'Your payment code is already available below. Please use it to complete the payment.', 'Mã thanh toán của bạn đã có ở bên dưới. Vui lòng dùng mã đó để thanh toán.')
          : tInline(lang, 'Could not update plan. Please try again.', 'Không thể cập nhật gói. Vui lòng thử lại.');
      setMessage({
        text: friendlyMessage,
        variant: 'error',
      });
    }
    setLoadingPlan(null);
  };

  if (!state || !user) return null;

  return (
    <ScreenLayout
      title={tInline(lang, 'Plans', 'Gói dịch vụ')}
      subtitle={tInline(lang, 'Choose the care level for your circle.', 'Chọn mức chăm sóc cho vòng thân.')}
    >
      {message && <InlineMessage text={message.text} variant={message.variant} />}

      {augustPromoActive && (
        <section className={styles.promoBanner} aria-label={tInline(lang, 'August promotion', 'Khuyến mãi tháng 8')}>
          <div className={styles.promoSparkle}><Sparkles size={18} /></div>
          <div className={styles.giftArt} aria-hidden>
            <span className={styles.giftLid} />
            <span className={styles.giftBox}><Gift size={42} /></span>
          </div>
          <div className={styles.promoContent}>
            <span className={styles.promoEyebrow}>{tInline(lang, 'ONLY AUGUST 1–30', 'CHỈ TỪ 01/08–30/08')}</span>
            <h2>{tInline(lang, 'Buy 1 month, get 1 month free!', 'Mua 1 tháng, tặng ngay 1 tháng!')}</h2>
            <p>{tInline(lang, 'Pay 49,000đ and enjoy Advanced care for 2 full months.', 'Chỉ 49.000đ để tận hưởng gói Nâng cao trong trọn 2 tháng.')}</p>
          </div>
          <div className={styles.promoCountdown}>
            <strong>{promoDaysLeft}</strong>
            <span>{tInline(lang, 'days left', 'ngày còn lại')}</span>
          </div>
        </section>
      )}

      <div className={styles.grid}>
        {plans.map((p) => {
          const isActive = isPremium ? currentPlan === p.id : p.id === 'basic' && !pendingPlan;
          const isPending = pendingPlan === p.id;
          const isLoading = loadingPlan === p.id;
          const isLockedByYearlyPlan = hasActiveYearlyPlan && p.id !== 'yearly';

          let buttonText = tInline(lang, 'Choose', 'Chọn');
          if (isActive && isPremium) buttonText = tInline(lang, 'Active', 'Đang dùng');
          else if (isActive && p.id === 'basic') buttonText = tInline(lang, 'Active', 'Đang dùng');
          else if (isPending) buttonText = tInline(lang, 'Awaiting payment', 'Chờ thanh toán');
          else if (isLockedByYearlyPlan) buttonText = tInline(lang, 'Available after yearly plan expires', 'Khả dụng khi gói năm hết hạn');

          return (
            <CardBlock key={p.id} border={isActive || isPending} className={augustPromoActive && p.id === 'monthly' ? styles.promoPlan : undefined}>
              {augustPromoActive && p.id === 'monthly' && (
                <span className={styles.promoRibbon}>{tInline(lang, '+1 MONTH FREE', 'TẶNG 1 THÁNG')}</span>
              )}
              <div className={styles.planHeader}>
                {isActive || isPending ? (
                  <CheckCircle size={24} color="var(--color-primary)" />
                ) : (
                  <CreditCard size={24} color="var(--color-taupe)" />
                )}
                <div>
                  <h3 className={styles.planTitle}>{tInline(lang, p.titleEn, p.titleVi)}</h3>
                  <p className={styles.planPrice}>{tInline(lang, p.priceEn, p.priceVi)}</p>
                </div>
              </div>
              <p className={styles.planBody}>{tInline(lang, p.bodyEn, p.bodyVi)}</p>
              {augustPromoActive && p.id === 'monthly' && (
                <p className={styles.promoBenefit}>{tInline(lang, '✓ 2 months of access for the price of 1', '✓ Dùng 2 tháng, chỉ trả tiền 1 tháng')}</p>
              )}
              <PrimaryButton
                text={isLoading ? tInline(lang, 'Processing...', 'Đang xử lý...') : buttonText}
                variant={isActive || isPending ? 'outline' : 'primary'}
                size="small"
                disabled={isActive || isPending || isLockedByYearlyPlan || isLoading || loadingPlan !== null}
                icon={isLoading ? <Loader2 size={16} className={styles.spin} /> : undefined}
                onClick={() => handleChoosePlan(p.id)}
              />
            </CardBlock>
          );
        })}
      </div>

      <CardBlock>
        <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>{tInline(lang, 'Your entitlement', 'Quyền lợi của bạn')}</h3>
        <p style={{ margin: 0, color: 'var(--color-taupe)' }}>
          {tInline(lang, 'Plan', 'Gói')}: {isPremium ? currentPlan : pendingPlan ?? 'basic'} · Premium:{' '}
          {isPremium ? 'Yes' : 'No'}
        </p>
        {pendingPlan && !isPremium && (
          <p style={{ margin: '8px 0 0', color: 'var(--color-primary-dark)', fontSize: '0.875rem' }}>
            {tInline(
              lang,
              'Complete payment to activate premium. You can switch plans or choose Basic to cancel.',
              'Hoàn tất thanh toán để kích hoạt premium. Có thể đổi gói khác hoặc chọn Cơ bản để hủy.'
            )}
          </p>
        )}
      </CardBlock>

      {latestOrder && latestOrder.amount_vnd > 0 && (
        <CardBlock border>
          <p><strong>{tInline(lang, 'SePay payment', 'Thanh toán SePay')}</strong></p>
          <p style={{ color: 'var(--color-taupe)', margin: '4px 0' }}>
            {tInline(lang, 'Transfer amount', 'Số tiền')}: <strong>{latestOrder.amount_vnd.toLocaleString('vi-VN')}đ</strong>
          </p>
          <p style={{ color: 'var(--color-taupe)', margin: '4px 0' }}>
            {tInline(lang, 'Transfer content (fixed)', 'Nội dung CK (cố định)')}:{' '}
            <strong>{latestOrder.reference_code}</strong>
          </p>
          <p style={{ color: 'var(--color-taupe)', margin: '4px 0', fontSize: '0.8rem' }}>
            {tInline(
              lang,
              'Use this same code for every payment. SePay webhook matches ESM + 6 digits.',
              'Dùng mã này cho mọi lần chuyển khoản. Webhook SePay nhận dạng ESM + 6 số.'
            )}
          </p>
          <p style={{ color: 'var(--color-taupe)', margin: '4px 0', fontSize: '0.875rem' }}>
            {getSepayBankCode()} · {getSepayBankAccount()}
          </p>
          <img
            src={resolveSepayQrUrl(latestOrder.qr_url, latestOrder.amount_vnd, latestOrder.reference_code)}
            alt={tInline(lang, 'SePay QR', 'Mã QR SePay')}
            className={styles.qr}
          />
          <p style={{ color: 'var(--color-taupe)', fontSize: '0.8rem', margin: '8px 0 0' }}>
            {tInline(lang, 'Scan with your banking app to pay.', 'Quét bằng app ngân hàng để thanh toán.')}
          </p>
        </CardBlock>
      )}
    </ScreenLayout>
  );
}
