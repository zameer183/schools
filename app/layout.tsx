import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { LanguageProvider } from '@/components/language/language-provider';
import MobileBackHandler from '@/components/layout/mobile-back-handler';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
  preload: false
});

export const metadata: Metadata = {
  title: 'Manarah Institute | HMS',
  description: 'Role-based Student Management System',
  icons: {
    icon: '/manarah-mark.png',
    shortcut: '/manarah-mark.png',
    apple: '/manarah-mark.png'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export const preferredRegion = 'sin1';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body suppressHydrationWarning className="min-h-screen antialiased">
        <LanguageProvider>
          <MobileBackHandler />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

