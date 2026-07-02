/** SePay VietQR — https://developer.sepay.vn/vi/sepay-webhooks/tao-qr-va-form-thanh-toan */

export function getSepayBankAccount() {
  return (
    process.env.NEXT_PUBLIC_SEPAY_BANK_ACCOUNT ??
    process.env.SEPAY_ACCOUNT_NUMBER ??
    '0963646027'
  );
}

export function getSepayBankCode() {
  return (
    process.env.NEXT_PUBLIC_SEPAY_BANK ??
    process.env.SEPAY_BANK_CODE?.trim() ??
    'MB'
  );
}

export function buildSepayQrUrl(amount: number, description: string): string {
  const params = new URLSearchParams({
    acc: getSepayBankAccount(),
    bank: getSepayBankCode(),
    amount: String(amount),
    des: description,
    template: 'qronly',
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

/** Regenerate QR if stored URL is missing required bank params (old orders) */
export function resolveSepayQrUrl(
  qrUrl: string | null | undefined,
  amount: number,
  referenceCode: string
): string {
  if (qrUrl && qrUrl.includes('acc=') && qrUrl.includes('bank=')) {
    return qrUrl;
  }
  return buildSepayQrUrl(amount, referenceCode);
}
