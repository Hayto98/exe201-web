'use client';

import { useState } from 'react';
import { Clock, Trash2, Edit2 } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { CardBlock } from '@/components/ui/CardBlock';
import { InfoCard } from '@/components/ui/InfoCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';
import styles from './safety.module.css';

export default function SafetyPage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('08:00');
  const [editId, setEditId] = useState<string | null>(null);

  if (!state || !user) return null;

  const saveRhythm = async () => {
    memory.saveRhythm(user.id, editId ? { id: editId, label, check_time: time } : { label, check_time: time });
    await refresh();
    setLabel('');
    setTime('08:00');
    setEditId(null);
  };

  const saveSettings = async (patch: Partial<typeof state.safetySettings>) => {
    memory.updateSafetySettings(user.id, patch);
    await refresh();
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'Safety Rhythm', 'Nhịp an toàn')}
      subtitle={tInline(lang, 'Configure your check-in schedule.', 'Cấu hình lịch xác nhận an toàn.')}
    >
      <CardBlock border>
        <h3 style={{ margin: '0 0 12px', fontWeight: 800 }}>{editId ? tInline(lang, 'Edit rhythm', 'Sửa nhịp') : tInline(lang, 'Add rhythm', 'Thêm nhịp')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <EsmeryTextField value={label} onChange={setLabel} label={tInline(lang, 'Label', 'Nhãn')} />
          <EsmeryTextField value={time} onChange={setTime} label={tInline(lang, 'Time', 'Giờ')} type="time" />
          <PrimaryButton text={tInline(lang, 'Save rhythm', 'Lưu nhịp')} onClick={saveRhythm} />
        </div>
      </CardBlock>

      <CardBlock>
        <h3 style={{ margin: '0 0 12px', fontWeight: 800 }}>{tInline(lang, 'Missed check-in detection', 'Phát hiện bỏ lỡ xác nhận')}</h3>
        <div className={styles.chips}>
          {[2, 4, 12].map((h) => (
            <button key={h} type="button" className={`${styles.chip} ${state.safetySettings.inactivity_hours === h ? styles.chipActive : ''}`} onClick={() => saveSettings({ inactivity_hours: h })}>
              {h}h
            </button>
          ))}
        </div>
        <p style={{ fontWeight: 700, margin: '16px 0 8px', fontSize: '0.875rem' }}>{tInline(lang, 'Escalation delay', 'Thời gian chờ cảnh báo')}</p>
        <div className={styles.chips}>
          {[15, 30, 60].map((m) => (
            <button key={m} type="button" className={`${styles.chip} ${state.safetySettings.escalation_delay_minutes === m ? styles.chipActive : ''}`} onClick={() => saveSettings({ escalation_delay_minutes: m })}>
              {m}m
            </button>
          ))}
        </div>
        <label className={styles.toggleRow}>
          <span>{tInline(lang, 'Location sharing', 'Chia sẻ vị trí')}</span>
          <input type="checkbox" checked={state.safetySettings.location_sharing_enabled} onChange={(e) => saveSettings({ location_sharing_enabled: e.target.checked })} />
        </label>
      </CardBlock>

      {state.safetyRhythms.map((r) => (
        <CardBlock key={r.id}>
          <div className={styles.rhythmRow}>
            <Clock size={24} color="var(--color-primary)" />
            <div style={{ flex: 1 }}>
              <strong>{r.label}</strong>
              <p style={{ margin: 0, color: 'var(--color-taupe)', fontSize: '0.875rem' }}>{r.check_time} · {r.is_enabled ? tInline(lang, 'enabled', 'đang bật') : tInline(lang, 'paused', 'tạm dừng')}</p>
            </div>
            <button type="button" className={styles.iconBtn} onClick={async () => { memory.toggleRhythm(user.id, r.id); await refresh(); }}>
              <input type="checkbox" readOnly checked={r.is_enabled} />
            </button>
            <button type="button" className={styles.iconBtn} onClick={() => { setEditId(r.id); setLabel(r.label); setTime(r.check_time); }}>
              <Edit2 size={16} />
            </button>
            <button type="button" className={styles.iconBtn} onClick={async () => { memory.deleteRhythm(user.id, r.id); await refresh(); }}>
              <Trash2 size={16} />
            </button>
          </div>
        </CardBlock>
      ))}

      <InfoCard
        icon={<Clock size={24} />}
        title={tInline(lang, 'Escalation delay', 'Thời gian chờ cảnh báo')}
        body={tInline(lang, 'If you miss a check-in, your circle will be notified after the escalation delay.', 'Nếu bạn bỏ lỡ xác nhận, vòng thân sẽ được thông báo sau thời gian chờ.')}
      />
    </ScreenLayout>
  );
}
