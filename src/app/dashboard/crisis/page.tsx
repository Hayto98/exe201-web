'use client';

import { useState } from 'react';
import { AlertTriangle, Bell, MapPin, Phone, Shield, Trash2 } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { CardBlock } from '@/components/ui/CardBlock';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { EmergencyCallOverlay } from '@/components/crisis/EmergencyCallOverlay';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import {
  deleteEmergencyContact,
  saveEmergencyContact,
  toggleEmergencyAutoNotify,
  toggleEmergencyVerified,
  triggerEmergencyAlert,
  shareEmergencyLocation,
  resolveAlertIncident
} from '@/lib/repository/crisis';
import type { EmergencyContact } from '@/lib/repository/types';
import styles from './crisis.module.css';

export default function CrisisPage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [msg, setMsg] = useState<{ text: string; variant: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [callingContact, setCallingContact] = useState<EmergencyContact | null>(null);

  if (!state || !user) return null;

  const latestLocation = state.locationShares[0];
  const activeAlert = state.alertIncidents.find((i) => i.status === 'active' || i.status === 'escalated');

  const shareLocation = () => {
    if (!navigator.geolocation) {
      setMsg({ text: tInline(lang, 'Geolocation not supported.', 'Trình duyệt không hỗ trợ vị trí.'), variant: 'error' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await shareEmergencyLocation(user.id, pos.coords.latitude, pos.coords.longitude);
        await refresh();
        setMsg({ text: tInline(lang, 'Location shared.', 'Đã chia sẻ vị trí.'), variant: 'success' });
      },
      () => setMsg({ text: tInline(lang, 'Location permission denied.', 'Quyền vị trí bị từ chối.'), variant: 'error' })
    );
  };

  const handleSaveContact = async () => {
    if (!name.trim() || !contact.trim()) {
      setMsg({ text: tInline(lang, 'Enter name and contact.', 'Nhập tên và số liên hệ.'), variant: 'error' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await saveEmergencyContact(user.id, {
        name,
        contact,
        is_verified: false,
        auto_notify: true,
      });
      await refresh();
      setShowAdd(false);
      setName('');
      setContact('');
      setMsg({ text: tInline(lang, 'Emergency contact saved.', 'Đã lưu liên hệ khẩn cấp.'), variant: 'success' });
    } catch (err) {
      setMsg({
        text: err instanceof Error ? err.message : tInline(lang, 'Could not save contact.', 'Không thể lưu liên hệ.'),
        variant: 'error',
      });
    }
    setSaving(false);
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'Crisis Support', 'Hỗ trợ khẩn cấp')}
      subtitle={tInline(lang, 'Emergency contacts and alerts.', 'Liên hệ khẩn cấp và cảnh báo.')}
    >
      {msg && <InlineMessage text={msg.text} variant={msg.variant} />}

      <PrimaryButton
        text={tInline(lang, 'Alert emergency contacts', 'Cảnh báo liên hệ khẩn cấp')}
        icon={<AlertTriangle size={18} />}
        onClick={async () => {
          await triggerEmergencyAlert(user.id, state);
          await refresh();
          setMsg({ text: tInline(lang, 'Emergency alert sent.', 'Đã gửi cảnh báo khẩn cấp.'), variant: 'success' });
          if (state.emergencyContacts && state.emergencyContacts.length > 0) {
            setCallingContact(state.emergencyContacts[0]);
          }
        }}
      />
      <PrimaryButton
        text={tInline(lang, 'Share location', 'Chia sẻ vị trí')}
        icon={<MapPin size={18} />}
        variant="outline"
        onClick={shareLocation}
      />

      {latestLocation && (
        <CardBlock>
          <p><strong>{tInline(lang, 'Latest location', 'Vị trí gần nhất')}</strong></p>
          <p style={{ color: 'var(--color-taupe)' }}>
            {latestLocation.latitude.toFixed(5)}, {latestLocation.longitude.toFixed(5)}
          </p>
          <a
            href={`https://maps.google.com/?q=${latestLocation.latitude},${latestLocation.longitude}`}
            target="_blank"
            rel="noreferrer"
            className={styles.mapLink}
          >
            {tInline(lang, 'Open in Maps', 'Mở trên Maps')}
          </a>
        </CardBlock>
      )}

      {activeAlert && (
        <CardBlock border>
          <p><strong>{tInline(lang, 'Active alert', 'Cảnh báo đang hoạt động')}</strong></p>
          <p>
            {activeAlert.reason === 'user_triggered_emergency'
              ? tInline(lang, 'Triggered by you', 'Do bạn kích hoạt khẩn cấp')
              : activeAlert.reason === 'missed_check_in'
              ? tInline(lang, 'Missed check-in', 'Bỏ lỡ xác nhận an toàn')
              : activeAlert.reason}
          </p>
          <PrimaryButton
            text={tInline(lang, 'Resolve alert', 'Giải quyết cảnh báo')}
            size="small"
            onClick={async () => {
              await resolveAlertIncident(user.id, activeAlert.id);
              await refresh();
            }}
          />
        </CardBlock>
      )}

      <PrimaryButton
        text={tInline(lang, 'Add emergency contact', 'Thêm liên hệ khẩn cấp')}
        onClick={() => setShowAdd((v) => !v)}
        variant="outline"
      />

      {showAdd && (
        <CardBlock border>
          <EsmeryTextField value={name} onChange={setName} label={tInline(lang, 'Name', 'Tên')} />
          <div style={{ marginTop: 12 }}>
            <EsmeryTextField
              value={contact}
              onChange={setContact}
              label={tInline(lang, 'Phone number', 'Số điện thoại')}
              placeholder="0901234567"
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <PrimaryButton
              text={saving ? tInline(lang, 'Saving...', 'Đang lưu...') : tInline(lang, 'Save', 'Lưu')}
              disabled={saving}
              onClick={handleSaveContact}
            />
          </div>
        </CardBlock>
      )}

      {state.emergencyContacts.length > 0 && (
        <section className={styles.contactSection}>
          <h3 className={styles.sectionTitle}>{tInline(lang, 'Emergency contacts', 'Liên hệ khẩn cấp')}</h3>
          <p className={styles.sectionHint}>
            {tInline(lang, 'Tap a contact to open the call screen.', 'Bấm vào liên hệ để mở màn hình gọi.')}
          </p>
          {state.emergencyContacts.map((c) => (
            <CardBlock key={c.id} border>
              <button type="button" className={styles.contactCard} onClick={() => setCallingContact(c)}>
                <span className={styles.contactAvatar}>{c.name.charAt(0).toUpperCase()}</span>
                <span className={styles.contactInfo}>
                  <strong>{c.name}</strong>
                  <span>{c.contact}</span>
                  <span className={styles.meta}>
                    {c.is_verified
                      ? tInline(lang, 'Verified', 'Đã xác minh')
                      : tInline(lang, 'Unverified', 'Chưa xác minh')}
                    {' · '}
                    {c.auto_notify
                      ? tInline(lang, 'Auto notify on', 'Tự động báo: bật')
                      : tInline(lang, 'Auto notify off', 'Tự động báo: tắt')}
                  </span>
                </span>
                <span className={styles.callHint}>
                  <Phone size={20} />
                  {tInline(lang, 'Call', 'Gọi')}
                </span>
              </button>

              <div className={styles.contactTools}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={async () => {
                    await toggleEmergencyVerified(user.id, c.id, c.is_verified);
                    await refresh();
                  }}
                >
                  {c.is_verified ? '✓' : '○'}{' '}
                  {tInline(lang, 'Verified', 'Xác minh')}
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={async () => {
                    await toggleEmergencyAutoNotify(user.id, c.id, c.auto_notify);
                    await refresh();
                  }}
                >
                  <Bell size={14} />
                  {c.auto_notify
                    ? tInline(lang, 'Auto on', 'Tự báo bật')
                    : tInline(lang, 'Auto off', 'Tự báo tắt')}
                </button>
                <button
                  type="button"
                  className={styles.toolBtnDanger}
                  onClick={async () => {
                    await deleteEmergencyContact(user.id, c.id);
                    await refresh();
                  }}
                >
                  <Trash2 size={14} />
                  {tInline(lang, 'Delete', 'Xóa')}
                </button>
              </div>
            </CardBlock>
          ))}
        </section>
      )}

      <InfoCard
        icon={<Shield size={24} />}
        title={tInline(lang, 'My Safe Steps', 'Các bước an toàn')}
        body={tInline(lang, 'Stay calm, check your surroundings, contact your circle.', 'Giữ bình tĩnh, kiểm tra xung quanh, liên hệ vòng thân.')}
      />
      <InfoCard
        icon={<Phone size={24} />}
        title={tInline(lang, 'Vietnam emergency numbers', 'Số khẩn cấp Việt Nam')}
        body="113 · 114 · 115"
      />

      {callingContact && (
        <EmergencyCallOverlay contact={callingContact} onClose={() => setCallingContact(null)} />
      )}
    </ScreenLayout>
  );
}
