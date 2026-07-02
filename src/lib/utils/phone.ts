/** Chuẩn hóa số điện thoại / email cho liên kết gọi hoặc mail. */
export function normalizeDialTarget(raw: string): { href: string; display: string; isPhone: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { href: '', display: '', isPhone: false };
  }

  if (trimmed.includes('@')) {
    return { href: `mailto:${trimmed}`, display: trimmed, isPhone: false };
  }

  const digits = trimmed.replace(/[^\d+]/g, '');
  let phone = digits;
  if (phone.startsWith('00')) {
    phone = `+${phone.slice(2)}`;
  } else if (phone.startsWith('0') && !phone.startsWith('+')) {
    phone = `+84${phone.slice(1)}`;
  } else if (!phone.startsWith('+') && phone.length >= 9) {
    phone = `+${phone}`;
  }

  return { href: `tel:${phone}`, display: trimmed, isPhone: true };
}

export function canInitiateCall(raw: string): boolean {
  const { href } = normalizeDialTarget(raw);
  return Boolean(href);
}
