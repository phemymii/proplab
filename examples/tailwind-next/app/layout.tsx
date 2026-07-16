import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'PropLab Tailwind Next demo',
  description: 'Sample Next.js + Tailwind components for PropLab',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-ink antialiased">{children}</body>
    </html>
  );
}
