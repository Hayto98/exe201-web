'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CreditCard, Crown, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AppProviders';
import styles from './admin.module.css';

type AdminData = {
  stats: { users: number; premium: number; pendingPayments: number; activeAlerts: number };
  users: Array<{ id: string; email?: string; created_at: string; banned_until?: string; last_sign_in_at?: string; profile?: { display_name?: string; is_premium?: boolean } | null }>;
  orders: Array<{ id: string; user_id: string; plan: string; amount_vnd: number; status: string; reference_code: string }>;
  incidents: Array<{ id: string; user_id: string; status: string; reason: string; created_at: string }>;
  moments: Array<{ id: string; user_id: string; caption: string; image_url: string; created_at: string }>;
};

export default function AdminPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true); setError('');
    const response = await fetch('/api/admin/overview', { cache: 'no-store' });
    const body = await response.json();
    setBusy(false);
    if (response.status === 403) { router.replace('/admin/login'); return; }
    if (!response.ok) { setError(body.error === 'ADMIN_SERVICE_ROLE_MISSING' ? 'Thiếu SUPABASE_SERVICE_ROLE_KEY trong .env.local.' : 'Không tải được dữ liệu admin.'); return; }
    setData(body);
  };

  useEffect(() => { if (!loading && !user) router.replace('/admin/login'); else if (user) void load(); }, [loading, user]);
  const toggleBan = async (userId: string, banned: boolean) => { await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action: banned ? 'unban' : 'ban' }) }); await load(); };
  const manageRecord = async (resource: 'payment' | 'incident' | 'moment', id: string, action: 'cancel' | 'resolve' | 'delete') => {
    if (!window.confirm(action === 'delete' ? 'Bạn chắc chắn muốn gỡ nội dung này?' : 'Bạn chắc chắn muốn thực hiện thao tác này?')) return;
    setBusy(true);
    const response = await fetch('/api/admin/records', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource, id, action }) });
    if (!response.ok) setError('Thao tác quản trị thất bại.');
    await load();
  };
  if (loading || !user) return null;
  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>ESMERY CONTROL CENTER</span><h1>Quản trị hệ thống</h1><p>Xin chào {user.email}</p></div><div className={styles.actions}><button onClick={load}><RefreshCw size={17} className={busy ? styles.spin : ''}/> Làm mới</button><button onClick={async()=>{await signOut();router.replace('/admin/login')}}><LogOut size={17}/> Đăng xuất</button></div></header>
    {error && <div className={styles.error}>{error}</div>}
    {data && <>
      <section className={styles.stats}>
        <Stat icon={<Users/>} label="Người dùng" value={data.stats.users}/><Stat icon={<Crown/>} label="Premium" value={data.stats.premium}/><Stat icon={<CreditCard/>} label="Chờ thanh toán" value={data.stats.pendingPayments}/><Stat icon={<AlertTriangle/>} label="Cảnh báo đang mở" value={data.stats.activeAlerts}/>
      </section>
      <AdminSection title="Người dùng"><div className={styles.tableWrap}><table><thead><tr><th>Tài khoản</th><th>Premium</th><th>Đăng nhập gần nhất</th><th>Trạng thái</th><th></th></tr></thead><tbody>{data.users.map(u=><tr key={u.id}><td><strong>{u.profile?.display_name||'Chưa đặt tên'}</strong><small>{u.email}</small></td><td>{u.profile?.is_premium?'Có':'Không'}</td><td>{u.last_sign_in_at?new Date(u.last_sign_in_at).toLocaleString('vi-VN'):'—'}</td><td>{u.banned_until?'Đã khóa':'Hoạt động'}</td><td><button className={styles.smallBtn} onClick={()=>toggleBan(u.id,Boolean(u.banned_until))}>{u.banned_until?'Mở khóa':'Khóa'}</button></td></tr>)}</tbody></table></div></AdminSection>
      <AdminSection title="Đơn thanh toán"><div className={styles.cards}>{data.orders.map(o=><article key={o.id}><strong>{o.reference_code}</strong><span>{o.plan} · {o.amount_vnd.toLocaleString('vi-VN')}đ</span><em data-status={o.status}>{o.status}</em>{o.status==='pending'&&<button className={styles.dangerBtn} onClick={()=>manageRecord('payment',o.id,'cancel')}>Hủy đơn</button>}</article>)}</div></AdminSection>
      <AdminSection title="Cảnh báo an toàn"><div className={styles.cards}>{data.incidents.map(i=><article key={i.id}><strong>{i.reason}</strong><span>{i.user_id}</span><em data-status={i.status}>{i.status}</em>{(i.status==='active'||i.status==='escalated')&&<button className={styles.smallBtn} onClick={()=>manageRecord('incident',i.id,'resolve')}>Đánh dấu đã xử lý</button>}</article>)}</div></AdminSection>
      <AdminSection title="Khoảnh khắc gần đây"><div className={styles.moments}>{data.moments.map(m=><article key={m.id}><img src={m.image_url} alt=""/><div><strong>{m.caption||'Không có chú thích'}</strong><small>{new Date(m.created_at).toLocaleString('vi-VN')}</small></div><button className={styles.dangerBtn} onClick={()=>manageRecord('moment',m.id,'delete')}>Gỡ</button></article>)}</div></AdminSection>
    </>}
  </main>;
}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:number}) { return <article className={styles.stat}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></article>; }
function AdminSection({title,children}:{title:string;children:React.ReactNode}) { return <section className={styles.section}><h2><ShieldCheck size={20}/>{title}</h2>{children}</section>; }
