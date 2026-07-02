'use client';

import { useState } from 'react';
import { Users, UserPlus, Check, X, Hand, Trash2 } from 'lucide-react';
import { useMinuteTick } from '@/lib/hooks/useMinuteTick';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { InfoCard } from '@/components/ui/InfoCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { CardBlock } from '@/components/ui/CardBlock';
import { AvatarInitial } from '@/components/ui/AvatarInitial';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline, friendlyTime } from '@/lib/i18n/translations';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { sendNudgeSupabase, removeFriendSupabase } from '@/lib/repository/supabaseRepository';
import { addFriend, updateFriendRequest } from '@/lib/repository/circle';
import * as memory from '@/lib/repository/memoryRepository';
import type { CircleMember, FriendRequest } from '@/lib/repository/types';
import styles from './circle.module.css';

/**
 * Resolve the effective status of a circle member by cross-referencing
 * with friend_requests. The friend_request status is the source of truth
 * because Android's updateFriendRequest updates friend_requests.status
 * but sometimes circle_members.status gets out of sync.
 */
function resolveEffectiveStatus(
  member: CircleMember,
  friendRequests: FriendRequest[],
): CircleMember['status'] {
  // Find matching friend request by member_user_id or invited_contact
  const matchingRequest = friendRequests.find((r) => {
    // Match by sender's circle member → check receiver
    if (r.sender_user_id === member.owner_user_id) {
      if (member.member_user_id && r.receiver_user_id === member.member_user_id) return true;
      if (r.receiver_contact.trim().toLowerCase() === member.invited_contact.trim().toLowerCase()) return true;
    }
    // Match by receiver's virtual circle member → check sender
    if (member.member_user_id && r.sender_user_id === member.member_user_id) return true;
    return false;
  });

  if (matchingRequest) {
    // Use the "better" status: if friend_request says accepted, use accepted
    if (matchingRequest.status === 'accepted') return 'accepted';
    if (matchingRequest.status === 'declined') return 'declined';
  }

  return member.status;
}

export default function CirclePage() {
  const { user } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [contact, setContact] = useState('');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useMinuteTick();

  if (!state || !user) return null;

  // Resolve effective statuses by cross-referencing friend_requests
  const resolvedMembers = state.circleMembers.map((m) => ({
    ...m,
    status: resolveEffectiveStatus(m, state.friendRequests),
  }));

  const members = resolvedMembers.filter((m) => m.status === 'accepted');
  const pendingMembers = resolvedMembers.filter((m) => m.status === 'pending');

  // Pending incoming friend requests (received by this user, not yet accepted)
  const acceptedUserIds = new Set(
    members.map((m) => m.member_user_id).filter(Boolean)
  );
  const acceptedContacts = new Set(
    members.map((m) => m.invited_contact.trim().toLowerCase())
  );
  const pendingRequests = state.friendRequests.filter(
    (r) =>
      r.status === 'pending' &&
      !acceptedUserIds.has(r.sender_user_id) &&
      (r.receiver_user_id == null || !acceptedUserIds.has(r.receiver_user_id)) &&
      !acceptedContacts.has(r.receiver_contact.trim().toLowerCase())
  );

  const handleAddFriend = async () => {
    if (!contact.trim()) {
      setMessage({
        type: 'error',
        text: tInline(lang, 'Please enter a contact.', 'Vui lòng nhập liên hệ.'),
      });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      await addFriend(user.id, contact, name, relationship, state);
      await refresh();
      setShowDialog(false);
      setContact('');
      setName('');
      setRelationship('');
      setMessage({
        type: 'success',
        text: tInline(lang, 'Invitation is pending.', 'Lời mời đang chờ phản hồi.'),
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : tInline(lang, 'Failed to send invitation.', 'Gửi lời mời thất bại.');
      setMessage({ type: 'error', text });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await updateFriendRequest(user.id, requestId, status, state);
      await refresh();
      setMessage({
        type: 'success',
        text: status === 'accepted'
          ? tInline(lang, 'Friend request accepted.', 'Đã chấp nhận lời mời.')
          : tInline(lang, 'Friend request declined.', 'Đã từ chối lời mời.'),
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : tInline(lang, 'Failed to update request.', 'Cập nhật lời mời thất bại.');
      setMessage({ type: 'error', text });
    }
  };

  const handleRemoveFriend = async (memberId: string, memberName: string) => {
    const confirmed = window.confirm(
      tInline(lang,
        `Remove ${memberName} from your circle?`,
        `Xóa ${memberName} khỏi vòng thân của bạn?`
      )
    );
    if (!confirmed) return;
    try {
      if (isSupabaseConfigured()) {
        await removeFriendSupabase(user.id, memberId, state);
      }
      await refresh();
      setMessage({
        type: 'success',
        text: tInline(lang, `${memberName} has been removed.`, `Đã xóa ${memberName}.`),
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : tInline(lang, 'Failed to remove friend.', 'Xóa bạn thất bại.');
      setMessage({ type: 'error', text });
    }
  };

  const hasSomeone = members.length > 0 || pendingMembers.length > 0 || pendingRequests.length > 0;

  return (
    <ScreenLayout
      title={tInline(lang, 'My Circle', 'Vòng thân của tôi')}
      subtitle={tInline(lang, 'People who care about you.', 'Những người quan tâm đến bạn.')}
    >
      <div className={styles.actions}>
        <PrimaryButton text={tInline(lang, 'Add Friend', 'Thêm bạn')} icon={<UserPlus size={18} />} onClick={() => setShowDialog(true)} fullWidth={false} />
      </div>

      {message && <InlineMessage text={message.text} variant={message.type} />}

      {showDialog && (
        <CardBlock border>
          <h3 style={{ margin: '0 0 12px', fontWeight: 800 }}>{tInline(lang, 'Add to Circle', 'Thêm vào vòng thân')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <EsmeryTextField value={contact} onChange={setContact} label={tInline(lang, 'Contact (email or phone)', 'Liên hệ (email hoặc SĐT)')} />
            <EsmeryTextField value={name} onChange={setName} label={tInline(lang, 'Name', 'Tên')} />
            <EsmeryTextField value={relationship} onChange={setRelationship} label={tInline(lang, 'Relationship', 'Mối quan hệ')} />
            <div style={{ display: 'flex', gap: 8 }}>
              <PrimaryButton text={tInline(lang, 'Send', 'Gửi')} onClick={handleAddFriend} disabled={submitting} />
              <PrimaryButton text={tInline(lang, 'Cancel', 'Hủy')} variant="outline" onClick={() => setShowDialog(false)} />
            </div>
          </div>
        </CardBlock>
      )}

      {!hasSomeone && (
        <InfoCard icon={<Users size={24} />} title={tInline(lang, 'No trusted people yet', 'Chưa có người tin cậy')} body={tInline(lang, 'Add someone to your circle.', 'Thêm ai đó vào vòng thân.')} />
      )}

      {/* Pending incoming requests — show accept/decline buttons */}
      {pendingRequests.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{tInline(lang, 'Pending requests', 'Lời mời đang chờ')}</h3>
          {pendingRequests.map((r) => {
            const isReceived = r.sender_user_id !== user.id;
            // For incoming requests: find sender's name from circleMembers (requestCircleMembers)
            const senderMember = state.circleMembers.find(
              (m) => m.member_user_id === r.sender_user_id
            );
            const senderDisplayName = senderMember?.name ?? tInline(lang, 'Trusted contact', 'Người tin cậy');
            return (
            <CardBlock key={r.id}>
              <div className={styles.memberRow}>
                {isReceived && <AvatarInitial name={senderDisplayName} />}
                <div className={styles.memberInfo}>
                  <strong>
                    {isReceived
                      ? senderDisplayName
                      : r.receiver_contact}
                  </strong>
                  <span>
                    {isReceived
                      ? tInline(lang, 'Wants to join your circle', 'Muốn tham gia vòng thân của bạn')
                      : tInline(lang, 'Awaiting response', 'Đang chờ phản hồi')}
                    {' · '}
                    <span className={styles.badge}>{tInline(lang, 'pending', 'đang chờ')}</span>
                  </span>
                </div>
                {isReceived && (
                  <div className={styles.rowActions}>
                    <button type="button" className={styles.iconBtn} onClick={() => handleUpdateRequest(r.id, 'accepted')}>
                      <Check size={18} />
                    </button>
                    <button type="button" className={styles.iconBtn} onClick={() => handleUpdateRequest(r.id, 'declined')}>
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            </CardBlock>
            );
          })}
        </>
      )}

      {/* Pending members (sent by user, awaiting response) */}
      {pendingMembers.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{tInline(lang, 'Awaiting response', 'Đang chờ phản hồi')}</h3>
          {pendingMembers.map((m) => (
            <CardBlock key={m.id}>
              <div className={styles.memberRow}>
                <AvatarInitial name={m.name} />
                <div className={styles.memberInfo}>
                  <strong>{m.name}</strong>
                  <span>
                    {m.relationship}
                    {' · '}
                    <span className={styles.badge}>{tInline(lang, 'pending', 'đang chờ')}</span>
                  </span>
                </div>
              </div>
            </CardBlock>
          ))}
        </>
      )}

      {/* Accepted members */}
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <PrimaryButton
                    text={tInline(lang, 'Nudge', 'Nhắc nhẹ')}
                    icon={<Hand size={14} />}
                    size="small"
                    fullWidth={false}
                    variant="outline"
                    onClick={async () => {
                      try {
                        if (isSupabaseConfigured()) {
                          await sendNudgeSupabase(user.id, m.id, state);
                        } else {
                          memory.sendNudge(user.id, m.id);
                        }
                        await refresh();
                        setMessage({
                          type: 'success',
                          text: tInline(
                            lang,
                            `Gentle nudge sent to ${m.name}.`,
                            `Đã gửi nhắc nhẹ cho ${m.name}.`
                          ),
                        });
                      } catch (err) {
                        console.error('[nudge]', err);
                        setMessage({
                          type: 'error',
                          text: tInline(lang, 'Failed to send nudge.', 'Gửi nhắc nhẹ thất bại.'),
                        });
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title={tInline(lang, 'Remove', 'Xóa')}
                    onClick={() => handleRemoveFriend(m.id, m.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </CardBlock>
          ))}
        </>
      )}
    </ScreenLayout>
  );
}
