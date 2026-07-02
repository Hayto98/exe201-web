'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { LanguageButton } from '@/components/ui/LanguageButton';
import { useAuth } from '@/contexts/AppProviders';
import { useLanguage } from '@/lib/i18n/useLanguage';
import { tInline } from '@/lib/i18n/translations';
import { isDemoMode } from '@/lib/repository/memoryRepository';
import { mapAuthErrorMessage } from '@/lib/auth/errors';

export default function SignInPage() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const { lang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant?: 'error' | 'success' } | null>(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage({
        text: tInline(lang, 'Enter email and password.', 'Nhập email và mật khẩu.'),
        variant: 'error',
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : tInline(lang, 'Sign in failed.', 'Đăng nhập thất bại.');
      setMessage({
        text: mapAuthErrorMessage(raw, lang === 'vi' ? 'vi' : 'en'),
        variant: 'error',
      });
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email) {
      setMessage({ text: tInline(lang, 'Enter your email first.', 'Nhập email trước.'), variant: 'error' });
      return;
    }
    try {
      await resetPassword(email);
      setMessage({
        text: tInline(lang, 'Password reset email sent.', 'Đã gửi email đặt lại mật khẩu.'),
        variant: 'success',
      });
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : 'Error', variant: 'error' });
    }
  };

  return (
    <div className="authScaffold">
      <div className="authCard">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <LanguageButton />
        </div>
        <BrandHeader
          title={tInline(lang, 'A Gentle Hand on Your Shoulder', 'Một bàn tay dịu dàng luôn ở bên')}
          subtitle={tInline(lang, 'Safety check-in for independent living.', 'Xác nhận an toàn cho người sống độc lập.')}
        />
        <div className="formStack">
          <EsmeryTextField value={email} onChange={setEmail} label="Email" type="email" placeholder="you@example.com" />
          <EsmeryTextField
            value={password}
            onChange={setPassword}
            label={tInline(lang, 'Password', 'Mật khẩu')}
            password
          />
          <button type="button" className="textButton" style={{ alignSelf: 'flex-end' }} onClick={handleForgot}>
            {tInline(lang, 'Forgot password?', 'Quên mật khẩu?')}
          </button>
          {message && <InlineMessage text={message.text} variant={message.variant} />}
          <PrimaryButton text={tInline(lang, 'Sign In', 'Đăng nhập')} loading={loading} onClick={handleSignIn} />
          {isDemoMode() && (
            <InlineMessage
              text={tInline(
                lang,
                'Demo mode: sign up with any email to explore, or use an account you created.',
                'Chế độ demo: đăng ký với bất kỳ email nào để khám phá.'
              )}
              variant="success"
            />
          )}
          <Link href="/auth/signup" className="textButton" style={{ textAlign: 'center', display: 'block' }}>
            {tInline(lang, 'New here? Create an account', 'Bạn mới ở đây? Tạo tài khoản')}
          </Link>
        </div>
      </div>
    </div>
  );
}
