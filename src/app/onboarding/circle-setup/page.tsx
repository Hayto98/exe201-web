'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { addFriend } from '@/lib/repository/circle';

export default function CircleSetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');

  const addContact = async () => {
    if (user && contact) {
      try {
        await addFriend(user.id, contact, name, relationship, state ?? undefined);
        await refresh();
      } catch {
        // Continue onboarding even if add fails
      }
    }
    router.push('/onboarding/rhythm-setup');
  };

  const skip = () => router.push('/onboarding/rhythm-setup');

  return (
    <div className="onboardingPage">
      <div className="onboardingContent">
        <div className="onboardingIcon">
          <Users size={36} />
        </div>
        <h1 className="onboardingTitle">{tInline(lang, 'Create My Circle', 'Tạo vòng thân')}</h1>
        <p className="onboardingBody">
          {tInline(lang, 'Add someone you trust to your circle.', 'Thêm người bạn tin tưởng vào vòng thân.')}
        </p>
        <div className="formStack" style={{ maxWidth: 400, margin: '0 auto' }}>
          <EsmeryTextField value={contact} onChange={setContact} label={tInline(lang, 'Contact (email/phone)', 'Liên hệ (email/SĐT)')} />
          <EsmeryTextField value={name} onChange={setName} label={tInline(lang, 'Name', 'Tên')} />
          <EsmeryTextField value={relationship} onChange={setRelationship} label={tInline(lang, 'Relationship', 'Mối quan hệ')} />
          <PrimaryButton text={tInline(lang, 'Add contact', 'Thêm liên hệ')} onClick={addContact} />
          <button type="button" className="textButton" onClick={skip}>
            {tInline(lang, 'Skip for now', 'Bỏ qua')}
          </button>
        </div>
      </div>
    </div>
  );
}
