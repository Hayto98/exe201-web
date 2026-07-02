'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
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
      setMessage({
        text: err instanceof Error ? err.message : tInline(lang, 'Could not update plan.', 'Không thể cập nhật gói.'),
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

      <div className={styles.grid}>
        {plans.map((p) => {
          const isActive = isPremium ? currentPlan === p.id : p.id === 'basic' && !pendingPlan;
          const isPending = pendingPlan === p.id;
          const isLoading = loadingPlan === p.id;

          let buttonText = tInline(lang, 'Choose', 'Chọn');
          if (isActive && isPremium) buttonText = tInline(lang, 'Active', 'Đang dùng');
          else if (isActive && p.id === 'basic') buttonText = tInline(lang, 'Active', 'Đang dùng');
          else if (isPending) buttonText = tInline(lang, 'Awaiting payment', 'Chờ thanh toán');

          return (
            <CardBlock key={p.id} border={isActive || isPending}>
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
              <PrimaryButton
                text={isLoading ? tInline(lang, 'Processing...', 'Đang xử lý...') : buttonText}
                variant={isActive || isPending ? 'outline' : 'primary'}
                size="small"
                disabled={isActive || isPending || isLoading || loadingPlan !== null}
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
