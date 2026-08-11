'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { LanguageButton } from '@/components/ui/LanguageButton';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { mapAuthErrorMessage } from '@/lib/auth/errors';

type Step = 'email' | 'otp' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: 'error' | 'success' } | null>(null);

  const showError = (error: unknown, fallback: string) => {
    const raw = error instanceof Error ? error.message : '';
    setMessage({ text: raw && raw !== '{}' ? mapAuthErrorMessage(raw, lang === 'vi' ? 'vi' : 'en') : fallback, variant: 'error' });
  };

  const sendOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setMessage({ text: tInline(lang, 'Enter a valid email address.', 'Nhập địa chỉ email hợp lệ.'), variant: 'error' });
      return;
    }
    if (!isSupabaseConfigured()) {
      setMessage({ text: tInline(lang, 'OTP is unavailable in demo mode.', 'OTP không khả dụng ở chế độ demo.'), variant: 'error' });
      return;
    }
    setLoading(true); setMessage(null);
    try {
      const { error } = await getSupabaseClient()!.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setEmail(normalizedEmail);
      setStep('otp');
      setMessage({ text: tInline(lang, 'We sent a verification code to your email.', 'Mã OTP đã được gửi đến email của bạn.'), variant: 'success' });
    } catch (error) {
      showError(error, tInline(lang, 'Could not send OTP. Please try again.', 'Không thể gửi OTP. Vui lòng thử lại.'));
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setMessage({ text: tInline(lang, 'Enter the 6-digit OTP.', 'Nhập mã OTP gồm 6 chữ số.'), variant: 'error' });
      return;
    }
    setLoading(true); setMessage(null);
    try {
      const { error } = await getSupabaseClient()!.auth.verifyOtp({ email, token: otp.trim(), type: 'email' });
      if (error) throw error;
      setStep('password');
      setMessage({ text: tInline(lang, 'OTP verified. Set your new password.', 'OTP chính xác. Hãy đặt mật khẩu mới.'), variant: 'success' });
    } catch (error) {
      showError(error, tInline(lang, 'The OTP is incorrect or has expired. Please request a new code.', 'OTP không đúng hoặc đã hết hạn. Hãy gửi lại mã mới.'));
    }
    setLoading(false);
  };

  const updatePassword = async () => {
    if (password.length < 6 || password !== confirm) {
      setMessage({ text: tInline(lang, 'Use at least 6 characters and make both passwords match.', 'Mật khẩu cần ít nhất 6 ký tự và hai ô phải trùng nhau.'), variant: 'error' });
      return;
    }
    setLoading(true); setMessage(null);
    const { error } = await getSupabaseClient()!.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      showError(error, tInline(lang, 'Could not update password. Please request a new OTP.', 'Không thể đổi mật khẩu. Hãy yêu cầu OTP mới.'));
      return;
    }
    setMessage({ text: tInline(lang, 'Password updated. You can sign in now.', 'Đã đổi mật khẩu. Bạn có thể đăng nhập.'), variant: 'success' });
    setTimeout(() => router.replace('/auth/signin'), 1000);
  };

  const title = step === 'email' ? tInline(lang, 'Recover your password', 'Lấy lại mật khẩu') : step === 'otp' ? tInline(lang, 'Verify OTP', 'Xác thực OTP') : tInline(lang, 'Set a new password', 'Đặt mật khẩu mới');
  return (
    <div className="authScaffold"><div className="authCard">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}><LanguageButton /></div>
      <BrandHeader title={title} subtitle={tInline(lang, 'Secure access to your account.', 'Xác thực an toàn cho tài khoản của bạn.')} />
      <div className="formStack">
        {message && <InlineMessage text={message.text} variant={message.variant} />}
        {step === 'email' && <><EsmeryTextField value={email} onChange={setEmail} label="Email" type="email" placeholder="you@example.com" /><PrimaryButton text={tInline(lang, 'Send OTP', 'Gửi OTP')} loading={loading} onClick={sendOtp} /></>}
        {step === 'otp' && <><EsmeryTextField value={email} onChange={setEmail} label="Email" type="email" /><EsmeryTextField value={otp} onChange={setOtp} label="OTP" placeholder="123456" /><PrimaryButton text={tInline(lang, 'Verify OTP', 'Xác thực OTP')} loading={loading} onClick={verifyOtp} /><button type="button" className="textButton" onClick={sendOtp}>{tInline(lang, 'Resend OTP', 'Gửi lại OTP')}</button></>}
        {step === 'password' && <><EsmeryTextField value={password} onChange={setPassword} label={tInline(lang, 'New password', 'Mật khẩu mới')} password /><EsmeryTextField value={confirm} onChange={setConfirm} label={tInline(lang, 'Confirm password', 'Nhập lại mật khẩu')} password /><PrimaryButton text={tInline(lang, 'Update password', 'Đổi mật khẩu')} loading={loading} onClick={updatePassword} /></>}
      </div>
    </div></div>
  );
}
