'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
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
  GitBranch,
  Home,
  Layers3,
  Loader2,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Search,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  TrendingUp,
  User,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ApiClient } from '@/api/client';
import { runtimeConfig } from '@/config/runtime';
import { agents } from '@/modules/dashboard/data';
import { agentStatusDot, normalizeAgentStatus } from '@/modules/dashboard/status';
import { useAgentUiState, useShellUiState } from '@/state/app-ui-state';

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

const analyticsSections: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'system', label: 'System Analytics', icon: Activity },
  { key: 'business', label: 'Business Analytics', icon: TrendingUp },
  { key: 'monitoring', label: 'Monitoring & Alerting', icon: ShieldAlert },
  { key: 'root-cause', label: 'Root Cause Analysis', icon: GitBranch },
  { key: 'decision', label: 'Decision Intelligence', icon: Radar },
  { key: 'optimization', label: 'Multi-Agent Optimization', icon: SlidersHorizontal },
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
  const { agentsOpen, collapsed, darkMode, setAgentsOpen, setCollapsed, setDarkMode } = useShellUiState();
  const { selectedAnalyticsTab, setSelectedAnalyticsTab } = useAgentUiState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>(fallbackNotifications);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null);
  const [notificationsMarkingAll, setNotificationsMarkingAll] = useState(false);
  const [analyticsAgentOpen, setAnalyticsAgentOpen] = useState(true);

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
      })
      .finally(() => {
        if (!cancelled) {
          setNotificationsLoading(false);
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
    if (pathname?.startsWith('/analytics/monitoring')) {
      return 'Analytics Agent / Monitoring & Alerting';
    }
    return 'Overview';
  }, [pathname]);

  const pageTitle = useMemo(() => title ?? titleForPath(pathname), [pathname, title]);
  const activeAnalyticsTab = pathname === '/agents/analytics' ? selectedAnalyticsTab : null;
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const searchResults = useMemo(() => buildSearchResults(searchQuery), [searchQuery]);

  async function markNotificationRead(notificationId: string) {
    setNotificationActionId(notificationId);
    setNotifications((current) =>
      current.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)),
    );

    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
    await client.post(`/api/notifications/${notificationId}/read`).catch(() => undefined);
    setNotificationActionId(null);
  }

  async function markAllNotificationsRead() {
    setNotificationsMarkingAll(true);
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
    await client.post('/api/notifications/read').catch(() => undefined);
    setNotificationsMarkingAll(false);
  }

  return (
    <div className="min-h-screen bg-[#fbfcff] text-[#111827] [background-image:radial-gradient(#eef2f7_1px,transparent_1px)] [background-size:18px_18px] dark:bg-[#0b1020] dark:text-slate-100 dark:[background-image:radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#e6eaf2] bg-white text-[#111827] shadow-none transition-all duration-300 dark:border-[#263247] dark:bg-[#0f172a] dark:text-slate-100 lg:block ${
          collapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[88px] items-center gap-3 px-5">
            <div className="grid size-10 place-items-center overflow-hidden rounded-lg">
              <Image src="/android-chrome-192x192.png" alt="AgentVerse" width={40} height={40} className="size-full object-cover" priority />
            </div>
            {!collapsed ? (
              <div>
                <p className="text-base font-semibold">AgentVerse</p>
                <p className="text-xs text-[#71809a] dark:text-slate-400">Multi-Agent Intelligence Platform</p>
              </div>
            ) : null}
          </div>

          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <SidebarLink collapsed={collapsed} href="/" icon={Home} label="Overview" active={pathname === '/'} />

            <div className="mt-5">
              {!collapsed ? <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#71809a] dark:text-slate-400">Main</p> : null}
              <button
                type="button"
                onClick={() => setAgentsOpen((value) => !value)}
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
              >
                <User className="size-5 text-[#6246ea]" />
                {!collapsed ? (
                  <Link
                    href="/agents/analytics"
                    onClick={(event) => event.stopPropagation()}
                    className="flex-1 text-left hover:text-[#4f3ee7] dark:hover:text-violet-200"
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
                  className={`mt-1 space-y-1 rounded-xl bg-white p-2 dark:bg-slate-900/80 ${collapsed ? 'hidden' : ''}`}
                >
                  {agents.map((agent) => {
                    const Icon = agent.icon;
                    const active = pathname === `/agents/${agent.key}`;
                    const isAnalytics = agent.key === 'analytics';
                    const showAnalyticsSections = isAnalytics && analyticsAgentOpen;
                    return (
                      <div key={agent.key}>
                        <div
                          className={`relative flex items-center rounded-lg transition ${
                            active
                              ? 'bg-[#efecff] font-semibold text-[#4f3ee7] dark:bg-violet-500/15 dark:text-violet-200'
                              : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
                          }`}
                        >
                          <Link
                            href={isAnalytics ? '/agents/analytics?tab=system' : `/agents/${agent.key}`}
                            onClick={() => {
                              if (isAnalytics) {
                                setSelectedAnalyticsTab('system');
                                setAnalyticsAgentOpen(true);
                              }
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
                          >
                            <Icon className={`size-4 shrink-0 ${active ? 'text-[#6246ea] dark:text-violet-200' : 'text-[#71809a] dark:text-slate-400'}`} />
                            <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                            <span className={agentStatusDot(normalizeAgentStatus(agent.status))} />
                            <span className="text-xs text-slate-500 dark:text-slate-500">{agent.activeTasks}</span>
                          </Link>
                          {isAnalytics ? (
                            <button
                              type="button"
                              onClick={() => setAnalyticsAgentOpen((value) => !value)}
                              className="mr-2 grid size-7 shrink-0 place-items-center rounded-md text-[#71809a] hover:bg-white/60 hover:text-[#4f3ee7] dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-violet-200"
                              aria-label={analyticsAgentOpen ? 'Collapse Analytics Agent sections' : 'Expand Analytics Agent sections'}
                            >
                              {analyticsAgentOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                          ) : null}
                        </div>
                        {showAnalyticsSections ? (
                          <div className="ml-5 mt-1 space-y-0.5 border-l border-[#e6eaf2] pl-3 dark:border-[#263247]">
                            {analyticsSections.map((section) => {
                              const SectionIcon = section.icon;
                              const sectionActive = active && activeAnalyticsTab === section.key;
                              return (
                                <Link
                                  key={section.key}
                                  href={`/agents/analytics?tab=${section.key}`}
                                  onClick={() => setSelectedAnalyticsTab(section.key)}
                                  className={`relative flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                                    sectionActive
                                      ? 'bg-[#f4f1ff] text-[#4f3ee7] dark:bg-violet-500/10 dark:text-violet-200'
                                      : 'text-[#71809a] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-400 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
                                  }`}
                                >
                                  <SectionIcon className={`size-4 shrink-0 ${sectionActive ? 'text-[#6246ea] dark:text-violet-200' : 'text-[#71809a] dark:text-slate-400'}`} />
                                  <span className="min-w-0 flex-1 truncate">{section.label}</span>
                                  {sectionActive ? <span className="size-2 rounded-full bg-[#6246ea] dark:bg-violet-300" /> : null}
                                </Link>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
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

          <div className="border-t border-[#e6eaf2] p-4 dark:border-[#263247]">
            <div className="rounded-xl bg-white p-3 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#5b4cf6] to-[#7b2eea] text-sm font-semibold text-white">S</div>
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Sahil JR</p>
                    <p className="truncate text-xs text-[#71809a] dark:text-slate-400">super.admin@cars24.com</p>
                  </div>
                ) : null}
              </div>
              {!collapsed ? (
                <div className="mt-3 grid gap-1 text-sm text-[#4f5d73] dark:text-slate-300">
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:hover:bg-violet-500/10 dark:hover:text-violet-200">
                    <User className="size-4" /> Profile
                  </button>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:hover:bg-violet-500/10 dark:hover:text-violet-200">
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]'}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-[#e6eaf2] bg-white/95 px-4 backdrop-blur-xl dark:border-[#263247] dark:bg-[#0f172a]/95 sm:px-6">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden rounded-lg border border-[#e1e6ef] bg-white p-2 text-[#64748b] hover:bg-[#f8faff] dark:border-[#263247] dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:block"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <button className="rounded-lg border border-[#e1e6ef] bg-white p-2 text-[#64748b] dark:border-[#263247] dark:bg-slate-900 dark:text-slate-200 lg:hidden">
            <Menu className="size-5" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{pageTitle}</p>
            <p className="truncate text-xs text-[#71809a] dark:text-slate-400">{breadcrumb || eyebrow}</p>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="mx-auto hidden w-full max-w-xl items-center gap-3 rounded-xl border border-[#dfe5ee] bg-white px-3 py-2 text-left text-[#71809a] shadow-sm hover:border-[#cfc7ff] hover:bg-white dark:border-[#263247] dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-500/40 dark:hover:bg-slate-900 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-sm">Search anything...</span>
            <span className="flex items-center gap-1 rounded-md border border-[#e1e6ef] bg-white px-2 py-0.5 text-xs dark:border-[#263247] dark:bg-slate-950">
              <Command className="size-3" /> K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border border-[#e1e6ef] bg-white p-2 text-[#64748b] shadow-sm hover:bg-[#f8faff] dark:border-[#263247] dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <div className="relative">
              <IconButton
                icon={Bell}
                badge={unreadCount ? String(unreadCount) : undefined}
                loading={notificationsLoading || notificationsMarkingAll}
                onClick={() => {
                  setNotificationsOpen((value) => {
                    const nextValue = !value;
                    if (nextValue && unreadCount > 0) {
                      void markAllNotificationsRead();
                    }
                    return nextValue;
                  });
                  setHelpOpen(false);
                }}
              />
              {notificationsOpen ? (
                <Popover title="Notifications">
                  {notificationsLoading ? (
                    <div className="flex items-center gap-2 rounded-lg p-3 text-sm text-[#4f5d73] dark:text-slate-300">
                      <Spinner className="size-4 text-[#6246ea]" />
                      Loading notifications...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => {
                      const unread = !notification.read;
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          disabled={notificationActionId === notification.id}
                          onClick={() => void markNotificationRead(notification.id)}
                          className="flex w-full gap-3 rounded-lg p-3 text-left hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-violet-500/10"
                        >
                          {notificationActionId === notification.id ? (
                            <Spinner className="mt-0.5 size-3.5 shrink-0 text-[#6246ea]" />
                          ) : (
                            <span className={`mt-1 size-2 shrink-0 rounded-full ${unread ? 'bg-[#6246ea]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{notification.title}</span>
                            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{notification.meta}</span>
                          </span>
                        </button>
                      );
                      })}
                    </div>
                  )}
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
                      <div key={item.label} className="rounded-lg p-3 hover:bg-[#f4f1ff] dark:hover:bg-violet-500/10">
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
            className="mx-auto mt-24 max-w-2xl rounded-xl border border-[#e1e6ef] bg-white shadow-2xl dark:border-[#263247] dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#e1e6ef] px-4 py-3 dark:border-[#263247]">
              <Search className="size-5 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search agents, tasks, reports, metrics, alerts, workflows..."
                className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <span className="rounded-md border border-[#e1e6ef] px-2 py-1 text-xs text-[#71809a] dark:border-[#263247]">Esc</span>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {searchResults.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSearchOpen(false)}
                  className="flex items-center justify-between rounded-lg px-3 py-3 hover:bg-[#f4f1ff] dark:hover:bg-violet-500/10"
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
  if (pathname.startsWith('/analytics/monitoring')) return 'Monitoring & Alerting';
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
      className={`relative mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? 'bg-[#efecff] text-[#4f3ee7] shadow-none dark:bg-violet-500/15 dark:text-violet-200'
          : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
      }`}
    >
      <Icon className={`size-5 shrink-0 ${active ? 'text-[#6246ea] dark:text-violet-200' : 'text-[#71809a] dark:text-slate-400'}`} />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {active && !collapsed ? <span className="absolute right-3 size-2 rounded-full bg-[#6246ea] dark:bg-violet-300" /> : null}
    </Link>
  );
}

function IconButton({ icon: Icon, badge, loading = false, onClick }: { icon: LucideIcon; badge?: string; loading?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-full border border-[#e1e6ef] bg-white p-2 text-[#64748b] shadow-sm hover:bg-[#f8faff] dark:border-[#263247] dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {loading ? <Spinner className="size-5 text-[#6246ea]" /> : <Icon className="size-5" />}
      {badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">{badge}</span>
      ) : null}
    </button>
  );
}

function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

function Popover({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-[#e1e6ef] bg-white p-3 shadow-2xl dark:border-[#263247] dark:bg-slate-900">
      <div className="border-b border-[#e1e6ef] px-2 pb-2 text-sm font-semibold text-[#111827] dark:border-[#263247] dark:text-slate-100">
        {title}
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}

function buildSearchResults(query: string): Array<{ label: string; href: string; type: string }> {
  const items = [
    { label: 'Overview', href: '/', type: 'Page' },
    { label: 'Monitoring & Alerting', href: '/analytics/monitoring', type: 'Analytics Agent' },
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
