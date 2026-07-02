/** Mã nội dung CK SePay — khớp webhook: /ESM\d{6}/i */
export const SEPAY_TRANSFER_CODE_PATTERN = /ESM\d{6}/i;

export function isValidSepayTransferCode(value: string): boolean {
  return /^ESM\d{6}$/i.test(value.trim());
}

export function extractSepayTransferCode(rawContent: string): string | null {
  const match = String(rawContent).match(SEPAY_TRANSFER_CODE_PATTERN);
  return match ? match[0].toUpperCase() : null;
}

export function generateSepayTransferCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `ESM${digits}`;
}
