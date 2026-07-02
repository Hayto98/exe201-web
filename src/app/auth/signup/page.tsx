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

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { lang } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; variant: 'error' | 'success' } | null>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setMessage({ text: tInline(lang, 'Fill in all fields.', 'Điền đầy đủ thông tin.'), variant: 'error' });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: tInline(lang, 'Password must be at least 6 characters.', 'Mật khẩu phải có ít nhất 6 ký tự.'), variant: 'error' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await signUp(name, email, password);
      router.push('/onboarding');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      if (msg === 'CONFIRM_EMAIL') {
        setMessage({
          text: tInline(lang,
            '✅ Account created! Check your email to confirm, then sign in.',
            '✅ Tạo tài khoản thành công! Kiểm tra email để xác nhận, sau đó đăng nhập.'),
          variant: 'success',
        });
      } else if (msg === 'RATE_LIMIT') {
        setMessage({
          text: tInline(lang,
            '⏳ Too many attempts. Please wait a moment and try again.',
            '⏳ Quá nhiều lần thử. Vui lòng đợi một lát rồi thử lại.'),
          variant: 'error',
        });
      } else {
        setMessage({ text: msg, variant: 'error' });
      }
    }
    setLoading(false);
  };

  return (
    <div className="authScaffold">
      <div className="authCard">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <LanguageButton />
        </div>
        <BrandHeader
          title={tInline(lang, 'Join ESMERY', 'Tham gia ESMERY')}
          subtitle={tInline(lang, 'Create your circle of care.', 'Tạo vòng thân quan tâm của bạn.')}
        />
        <div className="formStack">
          <EsmeryTextField value={name} onChange={setName} label={tInline(lang, 'Full name', 'Họ tên')} />
          <EsmeryTextField value={email} onChange={setEmail} label="Email" type="email" />
          <EsmeryTextField value={password} onChange={setPassword} label={tInline(lang, 'Password', 'Mật khẩu')} password />
          {message && <InlineMessage text={message.text} variant={message.variant} />}
          <PrimaryButton text={tInline(lang, 'Sign Up', 'Tạo tài khoản')} loading={loading} onClick={handleSignUp} />
          <Link href="/auth/signin" className="textButton" style={{ textAlign: 'center', display: 'block' }}>
            {tInline(lang, 'Already have an account? Sign in', 'Đã có tài khoản? Đăng nhập')}
          </Link>
        </div>
      </div>
    </div>
  );
}
