import React from 'react';
import './global.css';

export const metadata = {
  title: 'AgentVerse Console | VIP India',
  description: 'AI Multi-Agent Control Plane for Vehicle Information Platform in India',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex">
        {/* Glassmorphic Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-500/20">V</div>
              <div>
                <h1 className="text-md font-semibold tracking-wide bg-gradient-to-r from-amber-200 to-rose-400 bg-clip-text text-transparent">AgentVerse</h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest">India VIP Platform</p>
              </div>
            </div>

            <nav className="space-y-1">
              {[
                { name: 'Dashboard', path: '#dashboard' },
                { name: 'AI Agents', path: '#agents' },
                { name: 'Workflows', path: '#workflows' },
                { name: 'Approvals', path: '#approvals' },
                { name: 'Knowledge RAG', path: '#knowledge' },
                { name: 'OLAP Analytics', path: '#analytics' },
                { name: 'Incidents', path: '#incidents' },
                { name: 'Reports', path: '#reports' },
                { name: 'Deployments', path: '#deployments' },
                { name: 'System Settings', path: '#settings' },
              ].map((item) => (
                <a
                  key={item.name}
                  href={item.path}
                  className="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mr-3 group-hover:bg-amber-400 transition-colors duration-200"></span>
                  {item.name}
                </a>
              ))}
            </nav>
          </div>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 font-semibold text-amber-400">IN</div>
              <div>
                <p className="text-xs font-medium text-slate-300">Principal Architect</p>
                <p className="text-[10px] text-slate-500">RTO Node: Delhi-DL</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Top Bar */}
          <header className="h-16 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
            <div className="text-sm font-medium text-slate-400">
              Workspace: <span className="text-rose-400 font-semibold">agent-verse-monorepo</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Kafka Connected
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Temporal Runner Active
              </span>
            </div>
          </header>

          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
