import type { CheckIn, SafetyRhythm } from '@/lib/repository/types';

export interface CheckInAvailability {
  canCheckIn: boolean;
  hasSchedule: boolean;
  completedCurrentWindow: boolean;
  activeRhythm?: SafetyRhythm;
  nextRhythm?: SafetyRhythm;
  nextOpensAt?: Date;
}

function atLocalTime(base: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(base);
  result.setHours(hours || 0, minutes || 0, 0, 0);
  return result;
}

/** Check-ins are open only in the hour immediately before each configured time. */
export function getCheckInAvailability(
  rhythms: SafetyRhythm[],
  checkIns: Pick<CheckIn, 'created_at'>[],
  now = new Date()
): CheckInAvailability {
  const enabled = rhythms.filter((rhythm) => rhythm.is_enabled).sort((a, b) => a.check_time.localeCompare(b.check_time));
  // Without a configured schedule, allow the very first check-in only. This
  // prevents an empty/missing schedule from becoming an unlimited spam path.
  if (!enabled.length) {
    return { canCheckIn: checkIns.length === 0, hasSchedule: false, completedCurrentWindow: checkIns.length > 0 };
  }

  let activeRhythm: SafetyRhythm | undefined;
  let opensAt: Date | undefined;
  let closesAt: Date | undefined;
  for (const rhythm of enabled) {
    const target = atLocalTime(now, rhythm.check_time);
    const opens = new Date(target.getTime() - 60 * 60 * 1000);
    if (now >= opens && now <= target) {
      activeRhythm = rhythm;
      opensAt = opens;
      closesAt = target;
      break;
    }
  }

  const future = enabled.flatMap((rhythm) => [0, 1].map((dayOffset) => {
    const base = new Date(now);
    base.setDate(base.getDate() + dayOffset);
    const target = atLocalTime(base, rhythm.check_time);
    return { rhythm, opensAt: new Date(target.getTime() - 60 * 60 * 1000) };
  })).filter((item) => item.opensAt > now).sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime())[0];

  if (!activeRhythm || !opensAt || !closesAt) {
    return { canCheckIn: false, hasSchedule: true, completedCurrentWindow: false, nextRhythm: future?.rhythm, nextOpensAt: future?.opensAt };
  }

  const completed = checkIns.some(({ created_at }) => {
    const timestamp = new Date(created_at).getTime();
    return timestamp >= opensAt!.getTime() && timestamp <= closesAt!.getTime();
  });
  return { canCheckIn: !completed, hasSchedule: true, completedCurrentWindow: completed, activeRhythm, nextRhythm: future?.rhythm, nextOpensAt: future?.opensAt };
}
