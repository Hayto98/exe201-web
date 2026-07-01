'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';

export default function RhythmSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [label, setLabel] = useState('Morning check-in');
  const [time, setTime] = useState('08:00');

  const save = async () => {
    if (user && label && time) {
      memory.saveRhythm(user.id, { label, check_time: time });
      await refresh();
    }
    router.push('/dashboard');
  };

  const skip = () => router.push('/dashboard');

  return (
    <div className="onboardingPage">
      <div className="onboardingContent">
        <div className="onboardingIcon">
          <Clock size={36} />
        </div>
        <h1 className="onboardingTitle">{tInline(lang, 'Safety Rhythm', 'Nhịp an toàn')}</h1>
        <p className="onboardingBody">
          {tInline(lang, 'Set a daily check-in reminder.', 'Đặt nhắc nhở xác nhận an toàn hàng ngày.')}
        </p>
        <div className="formStack" style={{ maxWidth: 400, margin: '0 auto' }}>
          <EsmeryTextField value={label} onChange={setLabel} label={tInline(lang, 'Label', 'Nhãn')} />
          <EsmeryTextField value={time} onChange={setTime} label={tInline(lang, 'Time (HH:MM)', 'Giờ (HH:MM)')} type="time" />
          <PrimaryButton text={tInline(lang, 'Save rhythm', 'Lưu nhịp')} onClick={save} />
          <button type="button" className="textButton" onClick={skip}>
            {tInline(lang, 'Skip for now', 'Bỏ qua')}
          </button>
        </div>
      </div>
    </div>
  );
}
