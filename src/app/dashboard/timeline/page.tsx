'use client';

import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Flower2,
  Users,
} from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline, localizedEventText } from '@/lib/i18n/translations';
import type { TimelineEventType } from '@/lib/repository/types';

function eventIcon(type: TimelineEventType) {
  switch (type) {
    case 'check_in': return <CheckCircle size={24} />;
    case 'moment': return <Flower2 size={24} />;
    case 'nudge': return <Bell size={24} />;
    case 'friend_request': return <Users size={24} />;
    case 'safety_rhythm': return <Clock size={24} />;
    default: return <AlertTriangle size={24} />;
  }
}

export default function TimelinePage() {
  const { state } = useEsmeryState();
  const { lang } = useLanguage();

  if (!state) return null;

  return (
    <ScreenLayout
      title={tInline(lang, 'Timeline', 'Dòng thời gian')}
      subtitle={tInline(lang, 'Your activity history.', 'Lịch sử hoạt động của bạn.')}
    >
      {state.timelineEvents.length === 0 ? (
        <p style={{ color: 'var(--color-taupe)' }}>{tInline(lang, 'No events yet.', 'Chưa có sự kiện.')}</p>
      ) : (
        state.timelineEvents.map((e) => (
          <InfoCard
            key={e.id}
            icon={eventIcon(e.type)}
            title={localizedEventText(lang, e.title)}
            body={localizedEventText(lang, e.body)}
          />
        ))
      )}
    </ScreenLayout>
  );
}
