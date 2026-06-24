import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { AgentUiStateProvider, ShellUiStateProvider } from '@/state/app-ui-state';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Agent Platform',
  description: 'Vehicle information AI agent control console',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(JSON.parse(localStorage.getItem('agentverse:dark-mode')||'false'))document.documentElement.classList.add('dark')}catch{}",
          }}
        />
        <ShellUiStateProvider>
          <AgentUiStateProvider>
            <AppShell>{children}</AppShell>
          </AgentUiStateProvider>
        </ShellUiStateProvider>
      </body>
    </html>
  );
}
