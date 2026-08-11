'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { LanguageButton } from '@/components/ui/LanguageButton';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: 'error' | 'success' } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setMessage(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (!isSupabaseConfigured()) {
      setMessage({ text: tInline(lang, 'Password reset is unavailable in demo mode.', 'Đổi mật khẩu không khả dụng ở chế độ demo.'), variant: 'error' });
      return;
    }
    if (password.length < 6 || password !== confirm) {
      setMessage({ text: tInline(lang, 'Use at least 6 characters and make both passwords match.', 'Mật khẩu cần ít nhất 6 ký tự và hai ô phải trùng nhau.'), variant: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    const supabase = getSupabaseClient();
    const { error } = await supabase!.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage({ text: tInline(lang, 'This reset link is invalid or expired. Request a new one.', 'Liên kết đã hết hạn hoặc không hợp lệ. Hãy yêu cầu liên kết mới.'), variant: 'error' });
      return;
    }
    setMessage({ text: tInline(lang, 'Password updated. You can sign in now.', 'Đã đổi mật khẩu. Bạn có thể đăng nhập.'), variant: 'success' });
    setTimeout(() => router.replace('/auth/signin'), 1000);
  };

  return (
    <div className="authScaffold"><div className="authCard">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><LanguageButton /></div>
      <BrandHeader title={tInline(lang, 'Set a new password', 'Đặt mật khẩu mới')} subtitle={tInline(lang, 'Choose a password for your account.', 'Chọn mật khẩu mới cho tài khoản.')} />
      <div className="formStack">
        {message && <InlineMessage text={message.text} variant={message.variant} />}
        <EsmeryTextField value={password} onChange={setPassword} label={tInline(lang, 'New password', 'Mật khẩu mới')} password />
        <EsmeryTextField value={confirm} onChange={setConfirm} label={tInline(lang, 'Confirm password', 'Nhập lại mật khẩu')} password />
        <PrimaryButton text={tInline(lang, 'Update password', 'Đổi mật khẩu')} loading={loading} onClick={submit} />
      </div>
    </div></div>
  );
}
