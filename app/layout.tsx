import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Scholarly Editorial | HMS',
  description: 'Role-based Student Management System'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
