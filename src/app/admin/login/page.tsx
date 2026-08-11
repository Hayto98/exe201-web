'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { EsmeryTextField } from '@/components/ui/EsmeryTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { InlineMessage } from '@/components/ui/InlineMessage';
import { useAuth } from '@/contexts/AppProviders';

export default function AdminLoginPage() {
  const { signIn } = useAuth(); const router = useRouter();
  const [email,setEmail]=useState('admin@gmail.com'); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const submit=async()=>{setLoading(true);setError('');try{await signIn(email,password);const r=await fetch('/api/admin/overview');if(r.status===403)throw new Error('Tài khoản này không có quyền admin.');router.replace('/admin');}catch(e){setError(e instanceof Error?e.message:'Đăng nhập thất bại.');}setLoading(false)};
  return <div className="authScaffold"><div className="authCard"><BrandHeader title="Đăng nhập quản trị" subtitle="Khu vực dành riêng cho quản trị viên ESMERY."/><div className="formStack">{error&&<InlineMessage text={error} variant="error"/>}<EsmeryTextField value={email} onChange={setEmail} label="Email" type="email"/><EsmeryTextField value={password} onChange={setPassword} label="Mật khẩu" password/><PrimaryButton text="Đăng nhập Admin" loading={loading} onClick={submit}/></div></div></div>;
}
