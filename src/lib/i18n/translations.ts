export type Language = 'en' | 'vi';

export const translations = {
  sign_in: { en: 'Sign In', vi: 'Đăng nhập' },
  sign_up: { en: 'Sign Up', vi: 'Tạo tài khoản' },
  email: { en: 'Email', vi: 'Email' },
  password: { en: 'Password', vi: 'Mật khẩu' },
  full_name: { en: 'Full name', vi: 'Họ tên' },
  forgot_password: { en: 'Forgot password?', vi: 'Quên mật khẩu?' },
  welcome_title: { en: 'A Gentle Hand on Your Shoulder', vi: 'Một bàn tay dịu dàng luôn ở bên' },
  welcome_subtitle: { en: 'Safety check-in for independent living.', vi: 'Xác nhận an toàn cho người sống độc lập.' },
  hearth: { en: 'Hearth', vi: 'Mái ấm' },
  circle: { en: 'Circle', vi: 'Vòng thân' },
  timeline: { en: 'Timeline', vi: 'Dòng thời gian' },
  moments: { en: 'Moments', vi: 'Khoảnh khắc' },
  safety: { en: 'Safety', vi: 'An toàn' },
  crisis: { en: 'Crisis', vi: 'Khẩn cấp' },
  plans: { en: 'Plans', vi: 'Gói dịch vụ' },
  profile: { en: 'Profile', vi: 'Hồ sơ' },
  im_safe: { en: "I'm Safe", vi: 'Tôi an toàn' },
  circle_notified: { en: 'Your circle has been notified.', vi: 'Vòng thân của bạn đã được thông báo.' },
  add_friend: { en: 'Add Friend', vi: 'Thêm bạn' },
  share_moment: { en: 'Share Moment', vi: 'Chia sẻ khoảnh khắc' },
  emergency_contacts: { en: 'Emergency Contacts', vi: 'Liên hệ khẩn cấp' },
  safety_rhythm: { en: 'Safety Rhythm', vi: 'Nhịp an toàn' },
  logout: { en: 'Sign Out', vi: 'Đăng xuất' },
  get_started: { en: 'Get Started', vi: 'Bắt đầu' },
  next: { en: 'Next', vi: 'Tiếp theo' },
  skip: { en: 'Skip for now', vi: 'Bỏ qua' },
  save: { en: 'Save', vi: 'Lưu' },
  cancel: { en: 'Cancel', vi: 'Hủy' },
  refresh: { en: 'Refresh', vi: 'Làm mới' },
  pending: { en: 'pending', vi: 'đang chờ' },
  accepted: { en: 'accepted', vi: 'đã chấp nhận' },
  declined: { en: 'declined', vi: 'đã từ chối' },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(lang: Language, key: TranslationKey): string {
  return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

export function tInline(lang: Language, en: string, vi: string): string {
  return lang === 'en' ? en : vi;
}

export type DayPeriod = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

/** Khung giờ chào theo giờ local của trình duyệt */
export function getDayPeriod(date = new Date()): DayPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 13) return 'noon';
  if (hour >= 13 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
}

const GREETINGS: Record<DayPeriod, [string, string]> = {
  morning: ['Good morning', 'Chào buổi sáng'],
  noon: ['Good afternoon', 'Chào buổi trưa'],
  afternoon: ['Good afternoon', 'Chào buổi chiều'],
  evening: ['Good evening', 'Chào buổi tối'],
  night: ['Hello', 'Chào đêm khuya'],
};

export function timeGreeting(lang: Language, name: string, date = new Date()): string {
  const period = getDayPeriod(date);
  const [en, vi] = GREETINGS[period];
  return tInline(lang, `${en}, ${name}`, `${vi}, ${name}`);
}

export function friendlyTime(value?: string | null, lang: Language = 'en'): string {
  if (!value) return tInline(lang, 'not yet', 'chưa có');
  const time = value.includes('T') ? value.substring(value.indexOf('T') + 1, value.indexOf('T') + 6) : value;
  return time || value;
}

export function localizedEventText(lang: Language, value: string): string {
  const map: Record<string, [string, string]> = {
    'Check-in confirmed': ['Check-in confirmed', 'Đã xác nhận an toàn'],
    'Your circle has been notified.': ['Your circle has been notified.', 'Vòng thân của bạn đã được thông báo.'],
    'Circle invitation sent': ['Circle invitation sent', 'Đã gửi lời mời vào vòng thân'],
    'Circle invitation accepted': ['Circle invitation accepted', 'Đã chấp nhận lời mời'],
    'Circle invitation declined': ['Circle invitation declined', 'Đã từ chối lời mời'],
    'Gentle nudge sent': ['Gentle nudge sent', 'Đã gửi nhắc nhở nhẹ nhàng'],
    'Moment shared': ['Moment shared', 'Đã chia sẻ khoảnh khắc'],
    'Emergency alert sent': ['Emergency alert sent', 'Đã gửi cảnh báo khẩn cấp'],
    'Morning check-in': ['Morning check-in', 'Xác nhận an toàn buổi sáng'],
  };
  const pair = map[value];
  return pair ? tInline(lang, pair[0], pair[1]) : value;
}
