'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bell,
  Bot,
  ChevronRight,
  CircleHelp,
  Command,
  Loader2,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Search,
  ShieldAlert,
  Sun,
  TrendingUp,
  User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient } from '@/api/client';
import { runtimeConfig } from '@/config/runtime';
import { useAgentUiState, useShellUiState } from '@/state/app-ui-state';

interface AppShellProps {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
}

const analyticsSections: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: 'dashboard', label: 'Dashboard', icon: Bot },
  { key: 'system', label: 'System Analytics', icon: Activity },
  { key: 'business', label: 'Business Analytics', icon: TrendingUp },
  { key: 'monitoring', label: 'Monitoring & Alerting', icon: ShieldAlert },
  { key: 'decision', label: 'Decision Intelligence', icon: Radar },
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
  { id: 'n1', title: 'RC provider latency crossed threshold', meta: 'High · 2m ago', severity: 'high', read: false },
  { id: 'n2', title: 'Webhook metrics scrape separated', meta: 'Info · 32m ago', severity: 'info', read: false },
  { id: 'n3', title: 'CloudWatch monitor requires log groups', meta: 'Medium · 15m ago', severity: 'medium', read: false },
  { id: 'n4', title: 'Analytics health snapshot completed', meta: 'Info · 1h ago', severity: 'info', read: true },
];

const helpItems = [
  { label: 'Keyboard shortcuts', detail: 'Use Cmd K for analytics search' },
  { label: 'Service analytics', detail: 'Open Prometheus-backed RC service health' },
  { label: 'Monitoring', detail: 'Run CloudWatch log analysis from Monitoring & Alerting' },
];

export function AppShell({ title, eyebrow = 'Analytics agent workspace', children }: AppShellProps) {
  const pathname = usePathname();
  const { collapsed, darkMode, setCollapsed, setDarkMode } = useShellUiState();
  const { selectedAnalyticsTab, setSelectedAnalyticsTab } = useAgentUiState();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>(fallbackNotifications);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationActionId, setNotificationActionId] = useState<string | null>(null);
  const [notificationsMarkingAll, setNotificationsMarkingAll] = useState(false);
  const sidebarTabListRef = useRef<HTMLDivElement | null>(null);
  const sidebarTabRefs = useRef<Partial<Record<string, HTMLAnchorElement | null>>>({});
  const [sidebarIndicator, setSidebarIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });
  const [sidebarLayoutResizing, setSidebarLayoutResizing] = useState(false);

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

  const activeAnalyticsTab = currentAnalyticsSection(pathname, selectedAnalyticsTab);
  const breadcrumb = useMemo(() => breadcrumbForPath(pathname, activeAnalyticsTab), [activeAnalyticsTab, pathname]);
  const pageTitle = useMemo(() => title ?? titleForPath(pathname, activeAnalyticsTab), [activeAnalyticsTab, pathname, title]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const searchResults = useMemo(() => buildSearchResults(searchQuery), [searchQuery]);

  useEffect(() => {
    function updateSidebarIndicator() {
      const activeTab = sidebarTabRefs.current[activeAnalyticsTab];
      const tabList = sidebarTabListRef.current;

      if (!activeTab || !tabList) {
        return;
      }

      setSidebarIndicator({
        left: activeTab.offsetLeft,
        top: activeTab.offsetTop,
        width: activeTab.offsetWidth,
        height: activeTab.offsetHeight,
        ready: true,
      });
    }

    updateSidebarIndicator();
    const animationFrameId = window.requestAnimationFrame(updateSidebarIndicator);
    const resizeObserver = new ResizeObserver(updateSidebarIndicator);
    if (sidebarTabListRef.current) {
      resizeObserver.observe(sidebarTabListRef.current);
    }
    const activeTab = sidebarTabRefs.current[activeAnalyticsTab];
    if (activeTab) {
      resizeObserver.observe(activeTab);
    }
    window.addEventListener('resize', updateSidebarIndicator);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSidebarIndicator);
    };
  }, [activeAnalyticsTab, collapsed]);

  useEffect(() => {
    setSidebarLayoutResizing(true);
    const timeoutId = window.setTimeout(() => {
      setSidebarLayoutResizing(false);
    }, 340);

    return () => window.clearTimeout(timeoutId);
  }, [collapsed]);

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
    <div className="min-h-screen bg-[#fbfcff] text-[#111827] smooth-transition [background-image:radial-gradient(#eef2f7_1px,transparent_1px)] [background-size:18px_18px] dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)] dark:[background-image:radial-gradient(rgba(148,163,184,0.12)_1px,transparent_1px)]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#e6eaf2] bg-white text-[#111827] shadow-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-[var(--dark-border-soft)] dark:bg-[var(--dark-shell)] dark:text-[var(--dark-text)] lg:block ${
          collapsed ? 'w-[72px]' : 'w-[280px]'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className={`flex h-[88px] items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-5'}`}>
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden">
              <Image src="/android-chrome-192x192.png" alt="AgentVerse" width={40} height={40} className="size-full object-contain" priority />
            </div>
            {!collapsed ? (
              <div>
                <p className="text-base font-semibold">AgentVerse</p>
                <p className="text-xs text-[#71809a] dark:text-[var(--dark-muted)]">Analytics Agent Console</p>
              </div>
            ) : null}
          </div>

          <nav className={`flex-1 pb-4 ${collapsed ? 'overflow-visible px-2' : 'overflow-y-auto px-3'}`}>
            <div className="mt-5">
              {!collapsed ? <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-[#71809a] dark:text-[var(--dark-muted)]">Analytics</p> : null}
              <div ref={sidebarTabListRef} className="relative mt-2 space-y-1">
                <span
                  aria-hidden="true"
                  className={`absolute rounded-lg bg-[#efecff] will-change-[left,top,width,height] dark:bg-[var(--dark-primary-soft)] ${
                    sidebarLayoutResizing
                      ? 'transition-opacity duration-150'
                      : 'transition-[left,top,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
                  } ${
                    sidebarIndicator.ready ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    left: sidebarIndicator.left,
                    top: sidebarIndicator.top,
                    width: sidebarIndicator.width,
                    height: sidebarIndicator.height,
                  }}
                />
                {analyticsSections.map((section) => {
                  const SectionIcon = section.icon;
                  const sectionActive = activeAnalyticsTab === section.key;

                  return (
                    <Link
                      key={section.key}
                      ref={(node) => {
                        sidebarTabRefs.current[section.key] = node;
                      }}
                      href={`/agents/analytics?tab=${section.key}`}
                      onClick={() => setSelectedAnalyticsTab(section.key)}
                      className={`group relative z-10 flex items-center rounded-lg text-sm font-medium smooth-transition ${
                        sectionActive
                          ? 'text-[#4f3ee7] dark:text-[var(--dark-primary-muted)]'
                          : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-[var(--dark-muted-strong)] dark:hover:bg-[var(--dark-hover)] dark:hover:text-[var(--dark-primary-muted)]'
                      } ${collapsed ? 'h-11 justify-center px-0' : 'gap-3 px-3 py-2.5'}`}
                    >
                      <SectionIcon className={`size-5 shrink-0 ${sectionActive ? 'text-[#6246ea] dark:text-[var(--dark-primary-muted)]' : 'text-[#71809a] dark:text-[var(--dark-muted)]'}`} />
                      {!collapsed ? <span className="min-w-0 flex-1 truncate">{section.label}</span> : null}
                      {sectionActive && !collapsed ? <span className="absolute right-3 size-2 rounded-full bg-[#6246ea] dark:bg-[var(--dark-primary-muted)]" /> : null}
                      {collapsed ? (
                        <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#e6eaf2] bg-white px-3 py-2 text-sm font-semibold text-[#111827] opacity-0 shadow-lg shadow-slate-900/10 transition group-hover:opacity-100 dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface)] dark:text-[var(--dark-text)] dark:shadow-black/30">
                          {section.label}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          <div className={collapsed ? 'flex justify-center p-3' : 'p-4'}>
            <div className={collapsed ? 'grid place-items-center' : 'rounded-xl bg-[#f8faff] p-3 dark:bg-[#162033]'}>
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#5b4cf6] to-[#7b2eea] text-sm font-semibold text-white">S</div>
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Sahil JR</p>
                    <p className="truncate text-xs text-[#71809a] dark:text-[var(--dark-muted)]">analytics.admin@cars24.com</p>
                  </div>
                ) : null}
              </div>
              {!collapsed ? (
                <div className="mt-3 grid gap-1 text-sm text-[#4f5d73] dark:text-[var(--dark-muted-strong)]">
                  <button className="smooth-transition flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:hover:bg-[#22304a] dark:hover:text-white">
                    <User className="size-4" /> Profile
                  </button>
                  <button className="smooth-transition flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:hover:bg-[#22304a] dark:hover:text-white">
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]'}`}>
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-[#e6eaf2] bg-white/95 px-4 backdrop-blur-xl dark:border-[var(--dark-border-soft)] dark:bg-[var(--dark-shell)] sm:px-6">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="app-button-secondary hidden rounded-lg p-2 text-[#64748b] lg:block"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </button>
          <button className="app-button-secondary rounded-lg p-2 text-[#64748b] lg:hidden">
            <Menu className="size-5" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{pageTitle}</p>
            <p className="truncate text-xs text-[#71809a] dark:text-[var(--dark-muted)]">{breadcrumb || eyebrow}</p>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="smooth-transition mx-auto hidden w-full max-w-xl items-center gap-3 rounded-xl border border-[#dfe5ee] bg-white px-3 py-2 text-left text-[#71809a] shadow-sm hover:border-[#cfc7ff] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8d1ff] dark:border-[var(--dark-border)] dark:bg-[var(--dark-elevated)] dark:text-[var(--dark-muted-strong)] dark:hover:border-[var(--dark-primary-border)] dark:hover:bg-[var(--dark-hover)] dark:focus-visible:ring-[var(--dark-primary-border)] md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-sm">Search analytics...</span>
            <span className="flex items-center gap-1 rounded-md border border-[#e1e6ef] bg-white px-2 py-0.5 text-xs dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)]">
              <Command className="size-3" /> K
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              className="app-button-secondary rounded-full p-2 text-[#64748b] shadow-sm"
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
                    <div className="flex items-center gap-2 rounded-lg p-3 text-sm text-[#4f5d73] dark:text-[var(--dark-muted-strong)]">
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
                            className="smooth-transition flex w-full gap-3 rounded-lg p-3 text-left hover:bg-[#f4f1ff] disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-[var(--dark-hover)]"
                          >
                            {notificationActionId === notification.id ? (
                              <Spinner className="mt-0.5 size-3.5 shrink-0 text-[#6246ea]" />
                            ) : (
                              <span className={`mt-1 size-2 shrink-0 rounded-full ${unread ? 'bg-[#6246ea]' : 'bg-slate-300 dark:bg-[var(--dark-muted)]'}`} />
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{notification.title}</span>
                              <span className="mt-1 block text-xs text-slate-500 dark:text-[var(--dark-muted)]">{notification.meta}</span>
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
                      <div key={item.label} className="smooth-transition rounded-lg p-3 hover:bg-[#f4f1ff] dark:hover:bg-[var(--dark-hover)]">
                        <p className="text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{item.label}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-[var(--dark-muted)]">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </Popover>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 xl:px-8">
          <div key={pathname ?? 'root'} className="animate-page-enter">
            {children}
          </div>
        </main>
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4 backdrop-blur-sm smooth-transition" onClick={() => setSearchOpen(false)}>
          <div
            className="animate-modal-enter mx-auto mt-24 max-w-2xl rounded-xl border border-[#e1e6ef] bg-white shadow-2xl dark:border-[var(--dark-border)] dark:bg-[var(--dark-elevated)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#e1e6ef] px-4 py-3 dark:border-[var(--dark-border)]">
              <Search className="size-5 text-slate-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search analytics responsibilities, service metrics, and monitoring..."
                className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-slate-400 dark:text-[var(--dark-text)]"
              />
              <span className="rounded-md border border-[#e1e6ef] px-2 py-1 text-xs text-[#71809a] dark:border-[var(--dark-border)]">Esc</span>
            </div>
            <div className="max-h-96 overflow-y-auto p-2">
              {searchResults.map((item) => (
                <Link
                  key={`${item.type}:${item.label}:${item.href}`}
                  href={item.href}
                  onClick={() => setSearchOpen(false)}
                  className="smooth-transition flex items-center justify-between rounded-lg px-3 py-3 hover:bg-[#f4f1ff] dark:hover:bg-[var(--dark-hover)]"
                >
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-[var(--dark-text)]">{item.label}</span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-[var(--dark-muted)]">{item.type}</span>
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

function currentAnalyticsSection(pathname: string | null, selectedTab: string): string {
  if (pathname?.startsWith('/analytics/system')) return 'system';
  if (pathname?.startsWith('/analytics/monitoring')) return 'monitoring';
  if (pathname?.startsWith('/agents/analytics')) {
    return analyticsSections.some((section) => section.key === selectedTab) ? selectedTab : 'dashboard';
  }
  return 'dashboard';
}

function breadcrumbForPath(pathname: string | null, activeSection: string): string {
  if (pathname?.startsWith('/analytics/system')) return 'Analytics Agent / System Analytics / Service Analytics';
  if (pathname?.startsWith('/analytics/monitoring')) return 'Analytics Agent / Monitoring & Alerting';
  const section = analyticsSections.find((item) => item.key === activeSection);
  return `Analytics Agent / ${section?.label ?? 'Dashboard'}`;
}

function titleForPath(pathname: string | null, activeSection: string): string {
  if (pathname?.startsWith('/analytics/system')) return 'Service Analytics';
  if (pathname?.startsWith('/analytics/monitoring')) return 'Monitoring & Alerting';
  const section = analyticsSections.find((item) => item.key === activeSection);
  return section?.label ?? 'Dashboard';
}

function IconButton({ icon: Icon, badge, loading = false, onClick }: { icon: LucideIcon; badge?: string; loading?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="app-button-secondary relative rounded-full p-2 text-[#64748b] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d8d1ff] dark:focus-visible:ring-[var(--dark-primary-border)]"
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
    <div className="animate-popover-enter absolute right-0 top-12 z-50 w-80 rounded-xl border border-[#e1e6ef] bg-white p-3 shadow-2xl dark:border-[var(--dark-border)] dark:bg-[var(--dark-elevated)]">
      <div className="border-b border-[#e1e6ef] px-2 pb-2 text-sm font-semibold text-[#111827] dark:border-[var(--dark-border)] dark:text-[var(--dark-text)]">
        {title}
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}

function buildSearchResults(query: string): Array<{ label: string; href: string; type: string }> {
  const items = [
    { label: 'Analytics Commander Dashboard', href: '/agents/analytics?tab=dashboard', type: 'Dashboard' },
    { label: 'System Analytics', href: '/agents/analytics?tab=system', type: 'Responsibility' },
    { label: 'Business Analytics', href: '/agents/analytics?tab=business', type: 'Responsibility' },
    { label: 'Monitoring & Alerting', href: '/agents/analytics?tab=monitoring', type: 'Responsibility' },
    { label: 'Decision Intelligence', href: '/agents/analytics?tab=decision', type: 'Responsibility' },
    { label: 'RC Service Analytics', href: '/analytics/system/rc', type: 'Service Metrics' },
  ];

  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items.slice(0, 8);
  return items.filter((item) => `${item.label} ${item.type}`.toLowerCase().includes(normalizedQuery)).slice(0, 10);
}
