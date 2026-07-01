'use client';

import { useState } from 'react';
import { Users, UserPlus, RefreshCw, Check, X, Hand } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CardBlock } from '@/components/ui/CardBlock';
import { AvatarInitial } from '@/components/ui/AvatarInitial';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline, friendlyTime } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';
import styles from './circle.module.css';

export default function CirclePage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');

  if (!state || !user) return null;

  const pending = state.friendRequests.filter((r) => r.status === 'pending');
  const members = state.circleMembers.filter((m) => m.status === 'accepted');

  const addFriend = async () => {
    memory.addFriend(user.id, contact, name, relationship);
    await refresh();
    setShowDialog(false);
    setContact('');
    setName('');
    setRelationship('');
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'My Circle', 'Vòng thân của tôi')}
      subtitle={tInline(lang, 'People who care about you.', 'Những người quan tâm đến bạn.')}
    >
      <div className={styles.actions}>
        <PrimaryButton text={tInline(lang, 'Add Friend', 'Thêm bạn')} icon={<UserPlus size={18} />} onClick={() => setShowDialog(true)} fullWidth={false} />
        <PrimaryButton text={tInline(lang, 'Refresh', 'Làm mới')} icon={<RefreshCw size={16} />} onClick={refresh} fullWidth={false} variant="outline" size="small" />
      </div>

      {showDialog && (
        <CardBlock border>
          <h3 style={{ margin: '0 0 12px', fontWeight: 800 }}>{tInline(lang, 'Add to Circle', 'Thêm vào vòng thân')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <EsmeryTextField value={contact} onChange={setContact} label={tInline(lang, 'Contact', 'Liên hệ')} />
            <EsmeryTextField value={name} onChange={setName} label={tInline(lang, 'Name', 'Tên')} />
            <EsmeryTextField value={relationship} onChange={setRelationship} label={tInline(lang, 'Relationship', 'Mối quan hệ')} />
            <div style={{ display: 'flex', gap: 8 }}>
              <PrimaryButton text={tInline(lang, 'Send', 'Gửi')} onClick={addFriend} />
              <PrimaryButton text={tInline(lang, 'Cancel', 'Hủy')} variant="outline" onClick={() => setShowDialog(false)} />
            </div>
          </div>
        </CardBlock>
      )}

      {members.length === 0 && pending.length === 0 && (
        <InfoCard icon={<Users size={24} />} title={tInline(lang, 'No trusted people yet', 'Chưa có người tin cậy')} body={tInline(lang, 'Add someone to your circle.', 'Thêm ai đó vào vòng thân.')} />
      )}

      {pending.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{tInline(lang, 'Pending requests', 'Lời mời đang chờ')}</h3>
          {pending.map((r) => (
            <CardBlock key={r.id}>
              <div className={styles.memberRow}>
                <span>{r.receiver_contact}</span>
                <span className={styles.badge}>{tInline(lang, 'pending', 'đang chờ')}</span>
                <div className={styles.rowActions}>
                  <button type="button" className={styles.iconBtn} onClick={async () => { memory.updateFriendRequest(user.id, r.id, 'accepted'); await refresh(); }}>
                    <Check size={18} />
                  </button>
                  <button type="button" className={styles.iconBtn} onClick={async () => { memory.updateFriendRequest(user.id, r.id, 'declined'); await refresh(); }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
            </CardBlock>
          ))}
        </>
      )}

      {members.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{tInline(lang, 'Circle members', 'Thành viên vòng thân')}</h3>
          {members.map((m) => (
            <CardBlock key={m.id}>
              <div className={styles.memberRow}>
                <AvatarInitial name={m.name} />
                <div className={styles.memberInfo}>
                  <strong>{m.name}</strong>
                  <span>{m.relationship} · {tInline(lang, 'Last safe', 'An toàn lần cuối')}: {friendlyTime(m.last_safe_at, lang)}</span>
                </div>
                <PrimaryButton
                  text={tInline(lang, 'Nudge', 'Nhắc nhẹ')}
                  icon={<Hand size={14} />}
                  size="small"
                  fullWidth={false}
                  variant="outline"
                  onClick={async () => { memory.sendNudge(user.id, m.id); await refresh(); }}
                />
              </div>
            </CardBlock>
          ))}
        </>
      )}
    </ScreenLayout>
  );
}
