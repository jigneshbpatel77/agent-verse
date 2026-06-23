'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Command,
  Database,
  FileBarChart,
  Home,
  Layers3,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  User,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiClient } from '@/api/client';
import { runtimeConfig } from '@/config/runtime';
import { agents } from '@/modules/dashboard/data';
import { agentStatusDot, normalizeAgentStatus } from '@/modules/dashboard/status';

interface AppShellProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}

const menuItems: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: 'Workflows', href: '/workflows', icon: Workflow },
  { label: 'Tasks', href: '/tasks', icon: Layers3 },
  { label: 'Approvals', href: '/approvals', icon: ClipboardCheck },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { label: 'Deployments', href: '/deployments', icon: Database },
  { label: 'Incidents', href: '/incidents', icon: AlertTriangle },
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface NotificationRecord {
  id: string;
  title: string;
  meta: string;
  severity: 'high' | 'medium' | 'info' | 'low';
  read: boolean;
}

interface NotificationsResponse {
  notifications: NotificationRecord[];
  unread_count: number;
}

const fallbackNotifications: NotificationRecord[] = [
  { id: 'n1', title: 'Engineering Agent latency crossed 2s', meta: 'High · 2m ago', severity: 'high', read: false },
  { id: 'n2', title: 'Webhook fallback scrape enabled', meta: 'Info · 32m ago', severity: 'info', read: false },
  { id: 'n3', title: 'Quality Agent failed tasks increased', meta: 'Medium · 15m ago', severity: 'medium', read: false },
  { id: 'n4', title: 'Vehicle Data Sync workflow started', meta: 'Info · 1h ago', severity: 'info', read: true },
];

const helpItems = [
  { label: 'Keyboard shortcuts', detail: 'Use Cmd K for global search' },
  { label: 'Service analytics', detail: 'Open Prometheus-backed service health' },
  { label: 'Support', detail: 'Contact platform operations' },
];

export function AppShell({ title, eyebrow = 'Platform summary and key metrics', children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>(fallbackNotifications);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setHelpOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
    let cancelled = false;

    client
      .get<NotificationsResponse>('/api/notifications', { cache: 'no-store' })
      .then((payload) => {
        if (!cancelled) {
          setNotifications(payload.notifications);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications(fallbackNotifications);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const breadcrumb = useMemo(() => {
    if (pathname?.startsWith('/agents/')) {
      const agentKey = pathname.split('/').at(-1);
      const agent = agents.find((item) => item.key === agentKey);
      return agent ? `${agent.name} / Overview` : 'Agent / Overview';
    }
    if (pathname?.startsWith('/analytics/system')) {
      return 'Analytics Agent / Service Analytics';
    }
    return 'Overview';
  }, [pathname]);

  const pageTitle = useMemo(() => title ?? titleForPath(pathname), [pathname, title]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const searchResults = useMemo(() => buildSearchResults(searchQuery), [searchQuery]);

  async function markNotificationRead(notificationId: string) {
    setNotifications((current) =>
      current.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
    );

    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
    await client.post(`/api/notifications/${notificationId}/read`).catch(() => undefined);
  }

  async function markAllNotificationsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
    await client.post('/api/notifications/read').catch(() => undefined);
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950 dark:bg-slate-900 dark:text-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white text-slate-950 shadow-sm transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:shadow-none lg:block ${
          collapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[88px] items-center gap-3 px-5">
            <div className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-blue-500 via-emerald-400 to-amber-400 text-sm font-bold text-white shadow-lg">
              AV
            </div>
            {!collapsed ? (
              <div>
                <p className="text-base font-semibold">AgentVerse</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Multi-Agent Intelligence Platform</p>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <SidebarLink collapsed={collapsed} href="/" icon={Home} label="Overview" active={pathname === '/'} />

            <div className="mt-5">
              {!collapsed ? <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Main</p> : null}
              <button
                type="button"
                onClick={() => setAgentsOpen((value) => !value)}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <User className="size-5 text-blue-400" />
                {!collapsed ? (
                  <Link
                    href="/agents/analytics"
                    onClick={(event) => event.stopPropagation()}
                    className="flex-1 text-left hover:text-slate-950 dark:hover:text-white"
                  >
                    Agents
                  </Link>
                ) : null}
                {!collapsed ? agentsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" /> : null}
              </button>

              {agentsOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-1 space-y-1 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/70 ${collapsed ? 'hidden' : ''}`}
                >
                  {agents.map((agent) => {
                    const Icon = agent.icon;
                    const active = pathname === `/agents/${agent.key}`;
                    return (
                      <Link
                        key={agent.key}
                        href={`/agents/${agent.key}`}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-blue-100 font-semibold text-blue-700 dark:bg-slate-700/80 dark:text-blue-300'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Icon className={`size-4 ${active ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`} />
                        <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                        <span className={agentStatusDot(normalizeAgentStatus(agent.status))} />
                        <span className="text-xs text-slate-500 dark:text-slate-500">{agent.activeTasks}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              ) : null}
            </div>

            <div className="mt-5 space-y-1">
              {menuItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  collapsed={collapsed}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={pathname?.startsWith(item.href) ?? false}
                />
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4 dark:border-slate-700">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-blue-500 text-sm font-semibold">S</div>
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Sahil JR</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">super.admin@cars24.com</p>
                  </div>
                ) : null}
              </div>
              {!collapsed ? (
                <div className="mt-3 grid gap-1 text-sm text-slate-600 dark:text-slate-300">
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-white/10">
                    <User className="size-4" /> Profile
                  </button>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-white/10">
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]'}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90 sm:px-6">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:block"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <button className="rounded-lg border border-slate-200 p-2 text-slate-600 dark:border-slate-700 dark:text-slate-200 lg:hidden">
            <Menu className="size-5" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{pageTitle}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{breadcrumb || eyebrow}</p>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="mx-auto hidden w-full max-w-xl items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-slate-500 shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-sm">Search anything...</span>
            <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs dark:border-slate-600 dark:bg-slate-900">
              <Command className="size-3" /> K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <div className="relative">
              <IconButton
                icon={Bell}
                badge={unreadCount ? String(unreadCount) : undefined}
                onClick={() => {
                  setNotificationsOpen((value) => {
                    const nextValue = !value;
                    if (nextValue) {
                      void markAllNotificationsRead();
                    }
                    return nextValue;
                  });
                  setHelpOpen(false);
                }}
              />
              {notificationsOpen ? (
                <Popover title="Notifications">
                  <div className="space-y-2">
                    {notifications.map((notification) => {
                      const unread = !notification.read;
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => void markNotificationRead(notification.id)}
                          className="flex w-full gap-3 rounded-lg p-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700/70"
                        >
                          <span className={`mt-1 size-2 rounded-full ${unread ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{notification.title}</span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{notification.meta}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Popover>
              ) : null}
            </div>
            <div className="relative">
              <IconButton
                icon={CircleHelp}
                onClick={() => {
                  setHelpOpen((value) => !value);
                  setNotificationsOpen(false);
                }}
              />
              {helpOpen ? (
                <Popover title="Help">
                  <div className="space-y-2">
                    {helpItems.map((item) => (
                      <div key={item.label} className="rounded-lg p-3 hover:bg-slate-100 dark:hover:bg-slate-700/70">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </Popover>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 xl:px-8">{children}</main>
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div
            className="mx-auto mt-24 max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <Search className="size-5 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search agents, tasks, reports, metrics, alerts, workflows..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 dark:border-slate-600">Esc</span>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {searchResults.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/70"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{item.type}</span>
                  </span>
                  <ChevronRight className="size-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function titleForPath(pathname: string | null): string {
  if (!pathname || pathname === '/') return 'Overview';
  if (pathname.startsWith('/agents/')) {
    const agentKey = pathname.split('/').at(-1);
    return agents.find((agent) => agent.key === agentKey)?.name ?? 'Agent';
  }
  if (pathname.startsWith('/analytics/system')) return 'Service Analytics';

  const routeTitle = pathname.split('/').filter(Boolean).at(0) ?? 'Overview';
  return routeTitle
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function SidebarLink({
  collapsed,
  href,
  icon: Icon,
  label,
  active,
}: {
  collapsed: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-blue-100 text-blue-700 shadow-none dark:bg-slate-800 dark:text-blue-300'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
    >
      <Icon className="size-5 shrink-0" />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

function IconButton({ icon: Icon, badge, onClick }: { icon: LucideIcon; badge?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <Icon className="size-5" />
      {badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{badge}</span>
      ) : null}
    </button>
  );
}

function Popover({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
      <div className="border-b border-slate-200 px-2 pb-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:text-slate-50">
        {title}
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}

function buildSearchResults(query: string): Array<{ label: string; href: string; type: string }> {
  const items = [
    { label: 'Overview', href: '/', type: 'Page' },
    { label: 'Service Analytics', href: '/analytics/system/rc', type: 'Metrics' },
    { label: 'Workflows', href: '/workflows', type: 'Page' },
    { label: 'Tasks', href: '/tasks', type: 'Page' },
    { label: 'Approvals', href: '/approvals', type: 'Page' },
    { label: 'Alerts', href: '/alerts', type: 'Page' },
    { label: 'Reports', href: '/reports', type: 'Page' },
    ...agents.map((agent) => ({ label: agent.name, href: `/agents/${agent.key}`, type: 'Agent' })),
  ];

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items.slice(0, 8);
  return items.filter((item) => `${item.label} ${item.type}`.toLowerCase().includes(normalizedQuery)).slice(0, 10);
}
