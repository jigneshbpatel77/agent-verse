'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AppUiState = {
  agentsOpen: boolean;
  collapsed: boolean;
  darkMode: boolean;
  setAgentsOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setCollapsed: (value: boolean | ((current: boolean) => boolean)) => void;
  setDarkMode: (value: boolean | ((current: boolean) => boolean)) => void;
};

type AgentUiState = {
  pausedAgents: Record<string, boolean>;
  selectedAnalyticsTab: string;
  setPausedAgent: (agentKey: string, paused: boolean | ((current: boolean) => boolean)) => void;
  setSelectedAnalyticsTab: (tab: string) => void;
};

const AppUiStateContext = createContext<AppUiState | null>(null);
const AgentUiStateContext = createContext<AgentUiState | null>(null);

const defaultAnalyticsTab = 'system';

export function ShellUiStateProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = usePersistentState('agentverse:sidebar-collapsed', false);
  const [agentsOpen, setAgentsOpenState] = usePersistentState('agentverse:agents-open', true);
  const [darkMode, setDarkModeState] = usePersistentState('agentverse:dark-mode', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const value = useMemo<AppUiState>(
    () => ({
      agentsOpen,
      collapsed,
      darkMode,
      setAgentsOpen: setAgentsOpenState,
      setCollapsed: setCollapsedState,
      setDarkMode: setDarkModeState,
    }),
    [
      agentsOpen,
      collapsed,
      darkMode,
      setAgentsOpenState,
      setCollapsedState,
      setDarkModeState,
    ],
  );

  return <AppUiStateContext.Provider value={value}>{children}</AppUiStateContext.Provider>;
}

export function AgentUiStateProvider({ children }: { children: ReactNode }) {
  const [selectedAnalyticsTabState, setSelectedAnalyticsTabState] = usePersistentState('agentverse:analytics-tab', defaultAnalyticsTab);
  const [pausedAgents, setPausedAgents] = usePersistentObject<Record<string, boolean>>('agentverse:paused-agents', {});

  const setSelectedAnalyticsTab = useCallback((tab: string) => {
    setSelectedAnalyticsTabState(tab);
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [setSelectedAnalyticsTabState]);

  const setPausedAgent = useCallback((agentKey: string, paused: boolean | ((current: boolean) => boolean)) => {
    setPausedAgents((current) => {
      const nextPaused = typeof paused === 'function' ? paused(Boolean(current[agentKey])) : paused;
      return { ...current, [agentKey]: nextPaused };
    });
  }, [setPausedAgents]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const tab = new URL(window.location.href).searchParams.get('tab');
    if (tab) {
      setSelectedAnalyticsTabState(tab);
    }
  }, [setSelectedAnalyticsTabState]);

  const value = useMemo<AgentUiState>(
    () => ({
      pausedAgents,
      selectedAnalyticsTab: selectedAnalyticsTabState,
      setPausedAgent,
      setSelectedAnalyticsTab,
    }),
    [pausedAgents, selectedAnalyticsTabState, setPausedAgent, setSelectedAnalyticsTab],
  );

  return <AgentUiStateContext.Provider value={value}>{children}</AgentUiStateContext.Provider>;
}

export function useShellUiState() {
  const value = useContext(AppUiStateContext);
  if (!value) {
    throw new Error('useShellUiState must be used inside ShellUiStateProvider');
  }
  return value;
}

export function useAgentUiState() {
  const value = useContext(AgentUiStateContext);
  if (!value) {
    throw new Error('useAgentUiState must be used inside AgentUiStateProvider');
  }
  return value;
}

function usePersistentState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    const stored = readStorage<T>(key);
    if (stored !== null) {
      setValue(stored);
    }
  }, [key]);

  const setPersistentValue = useCallback((nextValue: T | ((current: T) => T)) => {
    setValue((current) => {
      const resolved = typeof nextValue === 'function' ? (nextValue as (current: T) => T)(current) : nextValue;
      writeStorage(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, setPersistentValue] as const;
}

function usePersistentObject<T extends object>(key: string, fallback: T) {
  return usePersistentState<T>(key, fallback);
}

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures; UI state should still update in memory.
  }
}
