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
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      setMessage(tInline(lang, 'Fill in all fields.', 'Điền đầy đủ thông tin.'));
      return;
    }
    setLoading(true);
    try {
      await signUp(name, email, password);
      router.push('/onboarding');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Sign up failed');
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
          {message && <InlineMessage text={message} variant="error" />}
          <PrimaryButton text={tInline(lang, 'Sign Up', 'Tạo tài khoản')} loading={loading} onClick={handleSignUp} />
          <Link href="/auth/signin" className="textButton" style={{ textAlign: 'center', display: 'block' }}>
            {tInline(lang, 'Already have an account? Sign in', 'Đã có tài khoản? Đăng nhập')}
          </Link>
        </div>
      </div>
    </div>
  );
}
