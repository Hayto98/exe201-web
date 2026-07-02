'use client';

import { Phone, PhoneOff, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { normalizeDialTarget } from '@/lib/utils/phone';
import type { EmergencyContact } from '@/lib/repository/types';
import styles from './EmergencyCallOverlay.module.css';

interface EmergencyCallOverlayProps {
  contact: EmergencyContact;
  onClose: () => void;
}

export function EmergencyCallOverlay({ contact, onClose }: EmergencyCallOverlayProps) {
  const { lang } = useLanguage();
  const dial = normalizeDialTarget(contact.contact);

  const handleCall = () => {
    if (!dial.href) return;
    window.location.href = dial.href;
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="emergency-call-title">
      <div className={styles.sheet}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={tInline(lang, 'Close', 'Đóng')}>
          <X size={22} />
        </button>

        <p className={styles.badge}>{tInline(lang, 'Emergency call', 'Gọi khẩn cấp')}</p>
        <div className={styles.avatar}>{contact.name.charAt(0).toUpperCase()}</div>
        <h2 id="emergency-call-title" className={styles.name}>
          {contact.name}
        </h2>
        <p className={styles.number}>{dial.display}</p>
        <p className={styles.hint}>
          {dial.isPhone
            ? tInline(lang, 'Tap below to call this contact immediately.', 'Bấm bên dưới để gọi ngay cho liên hệ này.')
            : tInline(lang, 'This contact uses email. Open your mail app to reach them.', 'Liên hệ này dùng email. Mở ứng dụng mail để liên lạc.')}
        </p>

        <button type="button" className={styles.callBtn} onClick={handleCall} disabled={!dial.href}>
          <Phone size={28} />
          {dial.isPhone
            ? tInline(lang, 'Call now', 'Gọi ngay')
            : tInline(lang, 'Send email', 'Gửi email')}
        </button>

        <button type="button" className={styles.cancelBtn} onClick={onClose}>
          <PhoneOff size={18} />
          {tInline(lang, 'Not now', 'Để sau')}
        </button>
      </div>
    </div>
  );
}
