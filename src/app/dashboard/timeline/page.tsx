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

function formatTimestamp(isoString: string, lang: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  const isVi = lang === 'vi';

  const timeStr = date.toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dateStr = date.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (diffMin < 1) return isVi ? `${timeStr} · Vừa xong` : `${timeStr} · Just now`;
  if (diffMin < 60) return isVi ? `${timeStr} · ${diffMin} phút trước` : `${timeStr} · ${diffMin}m ago`;
  if (diffHour < 24) return isVi ? `${timeStr} · ${diffHour} giờ trước` : `${timeStr} · ${diffHour}h ago`;
  if (diffDay < 7) return isVi ? `${timeStr} · ${dateStr} (${diffDay} ngày trước)` : `${timeStr} · ${dateStr} (${diffDay}d ago)`;

  // Older than 7 days — show full date and time
  return `${timeStr} · ${dateStr}`;
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
            timestamp={e.created_at ? formatTimestamp(e.created_at, lang) : undefined}
          />
        ))
      )}
    </ScreenLayout>
  );
}

