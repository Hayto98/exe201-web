export const AUGUST_MONTHLY_PROMO_START = new Date('2026-07-31T17:00:00.000Z');
export const AUGUST_MONTHLY_PROMO_END = new Date('2026-08-30T16:59:59.999Z');

export function isAugustMonthlyPromoActive(now = new Date()) {
  return now >= AUGUST_MONTHLY_PROMO_START && now <= AUGUST_MONTHLY_PROMO_END;
}

export function augustPromoDaysLeft(now = new Date()) {
  return Math.max(0, Math.ceil((AUGUST_MONTHLY_PROMO_END.getTime() - now.getTime()) / 86_400_000));
}
