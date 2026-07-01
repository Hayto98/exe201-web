'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, ShieldCheck, Sparkles } from 'lucide-react';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { LanguageButton } from '@/components/ui/LanguageButton';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';

const pages = [
  {
    icon: Heart,
    titleEn: 'A Gentle Hand on Your Shoulder',
    titleVi: 'Một bàn tay dịu dàng luôn ở bên',
    bodyEn: 'ESMERY helps you stay connected with people who care — through simple, warm check-ins.',
    bodyVi: 'ESMERY giúp bạn luôn kết nối với những người thân yêu — qua những lần xác nhận an toàn ấm áp.',
  },
  {
    icon: ShieldCheck,
    titleEn: 'Simple Check-ins',
    titleVi: 'Xác nhận an toàn thật đơn giản',
    bodyEn: 'One tap to let your circle know you are safe. No complicated setup required.',
    bodyVi: 'Chạm một lần để báo vòng thân biết bạn an toàn. Không cần thiết lập phức tạp.',
  },
  {
    icon: Sparkles,
    titleEn: 'Feel the Warmth',
    titleVi: 'Cảm nhận sự ấm áp',
    bodyEn: 'Share moments, send gentle nudges, and build a circle of trust around you.',
    bodyVi: 'Chia sẻ khoảnh khắc, gửi nhắc nhở nhẹ nhàng, và xây dựng vòng thân tin cậy.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [page, setPage] = useState(0);
  const current = pages[page];
  const Icon = current.icon;

  const next = () => {
    if (page < pages.length - 1) setPage(page + 1);
    else router.push('/onboarding/circle-setup');
  };

  return (
    <div className="onboardingPage">
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <LanguageButton />
      </div>
      <div className="onboardingContent" key={page} style={{ animation: 'fadeSlideIn 0.5s ease' }}>
        <div className="onboardingIcon">
          <Icon size={36} />
        </div>
        <h1 className="onboardingTitle">{tInline(lang, current.titleEn, current.titleVi)}</h1>
        <p className="onboardingBody">{tInline(lang, current.bodyEn, current.bodyVi)}</p>
        <div className="dots">
          {pages.map((_, i) => (
            <div key={i} className={`dot ${i === page ? 'dotActive' : ''}`} />
          ))}
        </div>
        <PrimaryButton
          text={
            page === pages.length - 1
              ? tInline(lang, 'Get Started', 'Bắt đầu')
              : tInline(lang, 'Next', 'Tiếp theo')
          }
          onClick={next}
        />
      </div>
    </div>
  );
}
