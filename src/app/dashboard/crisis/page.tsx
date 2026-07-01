'use client';

import { useState } from 'react';
import { AlertTriangle, MapPin, Phone, Shield, Trash2 } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { CardBlock } from '@/components/ui/CardBlock';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';
import styles from './crisis.module.css';

export default function CrisisPage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  if (!state || !user) return null;

  const latestLocation = state.locationShares[0];
  const activeAlert = state.alertIncidents.find((i) => i.status === 'active' || i.status === 'escalated');

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setMsg(tInline(lang, 'Geolocation not supported.', 'Trình duyệt không hỗ trợ vị trí.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        memory.shareLocation(user.id, pos.coords.latitude, pos.coords.longitude);
        await refresh();
        setMsg(tInline(lang, 'Location shared.', 'Đã chia sẻ vị trí.'));
      },
      () => setMsg(tInline(lang, 'Location permission denied.', 'Quyền vị trí bị từ chối.'))
    );
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'Crisis Support', 'Hỗ trợ khẩn cấp')}
      subtitle={tInline(lang, 'Emergency contacts and alerts.', 'Liên hệ khẩn cấp và cảnh báo.')}
    >
      {msg && <InlineMessage text={msg} variant="success" />}
      <PrimaryButton
        text={tInline(lang, 'Alert emergency contacts', 'Cảnh báo liên hệ khẩn cấp')}
        icon={<AlertTriangle size={18} />}
        onClick={async () => { memory.triggerEmergency(user.id); await refresh(); setMsg(tInline(lang, 'Emergency alert sent.', 'Đã gửi cảnh báo khẩn cấp.')); }}
      />
      <PrimaryButton text={tInline(lang, 'Share location', 'Chia sẻ vị trí')} icon={<MapPin size={18} />} variant="outline" onClick={shareLocation} />

      {latestLocation && (
        <CardBlock>
          <p><strong>{tInline(lang, 'Latest location', 'Vị trí gần nhất')}</strong></p>
          <p style={{ color: 'var(--color-taupe)' }}>{latestLocation.latitude.toFixed(5)}, {latestLocation.longitude.toFixed(5)}</p>
          <a href={`https://maps.google.com/?q=${latestLocation.latitude},${latestLocation.longitude}`} target="_blank" rel="noreferrer" className={styles.mapLink}>
            {tInline(lang, 'Open in Maps', 'Mở trên Maps')}
          </a>
        </CardBlock>
      )}

      {activeAlert && (
        <CardBlock border>
          <p><strong>{tInline(lang, 'Active alert', 'Cảnh báo đang hoạt động')}</strong></p>
          <p>{activeAlert.reason}</p>
          <PrimaryButton text={tInline(lang, 'Resolve alert', 'Giải quyết cảnh báo')} size="small" onClick={async () => { memory.resolveIncident(user.id, activeAlert.id); await refresh(); }} />
        </CardBlock>
      )}

      <PrimaryButton text={tInline(lang, 'Add emergency contact', 'Thêm liên hệ khẩn cấp')} onClick={() => setShowAdd(true)} variant="outline" />

      {showAdd && (
        <CardBlock border>
          <EsmeryTextField value={name} onChange={setName} label={tInline(lang, 'Name', 'Tên')} />
          <div style={{ marginTop: 12 }}><EsmeryTextField value={contact} onChange={setContact} label={tInline(lang, 'Contact', 'Liên hệ')} /></div>
          <div style={{ marginTop: 12 }}>
            <PrimaryButton text={tInline(lang, 'Save', 'Lưu')} onClick={async () => {
              memory.saveEmergencyContact(user.id, { name, contact, is_verified: false, auto_notify: true });
              await refresh();
              setShowAdd(false);
              setName('');
              setContact('');
            }} />
          </div>
        </CardBlock>
      )}

      <InfoCard icon={<Shield size={24} />} title={tInline(lang, 'My Safe Steps', 'Các bước an toàn')} body={tInline(lang, 'Stay calm, check your surroundings, contact your circle.', 'Giữ bình tĩnh, kiểm tra xung quanh, liên hệ vòng thân.')} />
      <InfoCard icon={<Phone size={24} />} title={tInline(lang, 'Vietnam emergency numbers', 'Số khẩn cấp Việt Nam')} body="113 · 114 · 115" />

      {state.emergencyContacts.map((c) => (
        <CardBlock key={c.id}>
          <div className={styles.contactRow}>
            <div>
              <strong>{c.name}</strong>
              <p style={{ margin: '4px 0', color: 'var(--color-taupe)' }}>{c.contact}</p>
              <span className={styles.meta}>{c.is_verified ? '✓ verified' : 'unverified'} · {c.auto_notify ? 'auto-notify' : 'manual'}</span>
            </div>
            <div className={styles.contactActions}>
              <a href={`tel:${c.contact}`} className={styles.callBtn}><Phone size={16} /></a>
              <button type="button" className={styles.iconBtn} onClick={async () => { memory.toggleEmergencyVerified(user.id, c.id); await refresh(); }}>✓</button>
              <button type="button" className={styles.iconBtn} onClick={async () => { memory.deleteEmergencyContact(user.id, c.id); await refresh(); }}><Trash2 size={16} /></button>
            </div>
          </div>
        </CardBlock>
      ))}
    </ScreenLayout>
  );
}
