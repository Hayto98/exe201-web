export function mapAuthErrorMessage(message: string, lang: 'en' | 'vi' = 'vi'): string {
  const cleaned = message.trim();
  if (!cleaned || cleaned === '{}' || cleaned === '[object Object]') {
    return lang === 'vi' ? 'Không thể tạo tài khoản lúc này. Vui lòng thử lại sau.' : 'Could not create the account right now. Please try again.';
  }
  const lower = cleaned.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return lang === 'vi'
      ? 'Không kết nối được Supabase. Kiểm tra mạng, tắt ad-block, khởi động lại `npm run dev`, hoặc xác nhận URL/key trong .env.local.'
      : 'Could not reach Supabase. Check network, disable ad-blockers, restart dev server, or verify .env.local.';
  }
  if (lower.includes('invalid login credentials')) {
    return lang === 'vi' ? 'Email hoặc mật khẩu không đúng.' : 'Invalid email or password.';
  }
  if (lower.includes('email not confirmed')) {
    return lang === 'vi' ? 'Email chưa được xác nhận. Kiểm tra hộp thư.' : 'Email not confirmed yet.';
  }
  if (lower.includes('rate limit')) {
    return lang === 'vi' ? 'Quá nhiều lần thử. Vui lòng đợi vài phút.' : 'Too many attempts. Please wait.';
  }
  if (lower === 'request failed' || lower.includes('fetch failed') || lower.includes('không kết nối được dịch vụ')) {
    return lang === 'vi'
      ? 'Không kết nối được dịch vụ đăng ký Supabase. Kiểm tra mạng và cấu hình URL/key.'
      : 'Could not reach the Supabase sign-up service. Check the network and URL/key configuration.';
  }
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return lang === 'vi' ? 'Email này đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.' : 'This email is already registered. Please sign in or reset your password.';
  }
  if (lower.includes('signup is disabled')) {
    return lang === 'vi' ? 'Hệ thống đang tạm tắt chức năng đăng ký.' : 'Sign-up is currently disabled.';
  }
  if (lower.includes('email address') && lower.includes('invalid')) {
    return lang === 'vi' ? 'Địa chỉ email không hợp lệ.' : 'The email address is invalid.';
  }

  return cleaned;
}
