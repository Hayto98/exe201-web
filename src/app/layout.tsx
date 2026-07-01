import type { Metadata } from 'next';
import { AppProviders } from '@/contexts/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'ESMERY — Gentle Safety Check-in',
  description: 'Safety check-in for independent living. A gentle hand on your shoulder.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
