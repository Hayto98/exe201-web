export function mapAuthErrorMessage(message: string, lang: 'en' | 'vi' = 'vi'): string {
  const lower = message.toLowerCase();

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

  return message;
}
