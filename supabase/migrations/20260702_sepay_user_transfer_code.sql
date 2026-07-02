-- Mã chuyển khoản cố định mỗi user: ESM + 6 số (webhook: /ESM\d{6}/i)

alter table public.profiles
  add column if not exists sepay_reference_code text;

create unique index if not exists profiles_sepay_reference_code_unique
  on public.profiles (sepay_reference_code)
  where sepay_reference_code is not null;

-- Cho phép cùng mã CK qua nhiều đơn (user dùng một mã cố định)
alter table public.payment_orders
  drop constraint if exists payment_orders_reference_code_key;

create index if not exists payment_orders_reference_code_idx
  on public.payment_orders (reference_code);

create index if not exists payment_orders_user_sepay_pending_idx
  on public.payment_orders (user_id, provider, status)
  where status = 'pending' and provider = 'sepay';
