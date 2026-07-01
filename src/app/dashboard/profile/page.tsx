'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { ScreenLayout } from '@/components/ui/ScreenLayout';
import { CardBlock } from '@/components/ui/CardBlock';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { AvatarInitial } from '@/components/ui/AvatarInitial';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth, useEsmeryState } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import * as memory from '@/lib/repository/memoryRepository';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { state, refresh } = useEsmeryState();
  const { lang } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!state || !user) return null;

  const name = displayName || state.profile.display_name;

  const saveProfile = async () => {
    memory.updateProfile(user.id, name, state.profile.avatar_url);
    await refresh();
    setMsg(tInline(lang, 'Profile saved.', 'Đã lưu hồ sơ.'));
  };

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      memory.updateProfile(user.id, state.profile.display_name, url);
      refresh();
    }
  };

  return (
    <ScreenLayout
      title={tInline(lang, 'Profile', 'Hồ sơ')}
      subtitle={state.profile.email ?? user.email}
    >
      {msg && <InlineMessage text={msg} variant="success" />}

      <CardBlock>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <AvatarInitial name={state.profile.display_name} size="lg" imageUrl={state.profile.avatar_url} />
          <div>
            <PrimaryButton text={tInline(lang, 'Upload avatar', 'Tải ảnh đại diện')} icon={<Upload size={16} />} variant="outline" size="small" fullWidth={false} onClick={() => fileRef.current?.click()} />
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
            <p style={{ margin: '8px 0 0', color: 'var(--color-taupe)', fontSize: '0.875rem' }}>{state.profile.email}</p>
          </div>
        </div>
      </CardBlock>

      <CardBlock>
        <EsmeryTextField value={name} onChange={setDisplayName} label={tInline(lang, 'Display name', 'Tên hiển thị')} />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton text={tInline(lang, 'Save profile', 'Lưu hồ sơ')} onClick={saveProfile} />
        </div>
      </CardBlock>

      <CardBlock>
        <EsmeryTextField value={newPassword} onChange={setNewPassword} label={tInline(lang, 'New password', 'Mật khẩu mới')} password />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton text={tInline(lang, 'Change password', 'Đổi mật khẩu')} variant="outline" onClick={() => setMsg(tInline(lang, 'Password updated (demo).', 'Đã cập nhật mật khẩu (demo).'))} />
        </div>
      </CardBlock>

      <PrimaryButton
        text={tInline(lang, 'Delete account', 'Xóa tài khoản')}
        icon={<Trash2 size={16} />}
        onClick={() => setShowDelete(true)}
        variant="outline"
      />

      {showDelete && (
        <CardBlock border>
          <p>{tInline(lang, 'Are you sure? This cannot be undone.', 'Bạn chắc chắn? Không thể hoàn tác.')}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <PrimaryButton text={tInline(lang, 'Yes, delete', 'Có, xóa')} onClick={async () => { await signOut(); window.location.href = '/auth/signin'; }} />
            <PrimaryButton text={tInline(lang, 'Cancel', 'Hủy')} variant="outline" onClick={() => setShowDelete(false)} />
          </div>
        </CardBlock>
      )}
    </ScreenLayout>
  );
}
