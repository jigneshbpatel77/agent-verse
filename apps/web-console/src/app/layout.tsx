import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Agent Platform',
  description: 'Vehicle information AI agent control console',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
