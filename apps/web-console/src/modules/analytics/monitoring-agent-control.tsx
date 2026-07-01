'use client';

import {
  AlertTriangle,
  Loader2,
  Plus,
  Play,
  RotateCcw,
  ServerCog,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiClient } from '@/api/client';

type RunMode = 'continuous' | 'iterations';
type RunState = 'idle' | 'running' | 'stopping';

interface AnalysisFinding {
  severity: string;
  title: string;
  summary: string;
  evidence: string[];
  recommended_action: string;
  confidence: number;
}

interface PollResult {
  log_groups: string[];
  event_count: number;
  analysis: {
    source: string;
    analyzed_at: string;
    event_count: number;
    highest_severity: string;
    findings: AnalysisFinding[];
  } | null;
}

interface RunLogEntry {
  id: string;
  time: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const client = new ApiClient({ baseUrl: typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin });

export function MonitoringAgentControl({ embedded: _embedded = false, agentPaused = false }: { embedded?: boolean; agentPaused?: boolean }) {
  const [configuredLogGroups, setConfiguredLogGroups] = useState<string[]>([]);
  const [selectedLogGroups, setSelectedLogGroups] = useState<string[]>([]);
  const [newLogGroup, setNewLogGroup] = useState('');
  const [runMode, setRunMode] = useState<RunMode>('continuous');
  const [iterationTarget, setIterationTarget] = useState(5);
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState(15);
  const [runState, setRunState] = useState<RunState>('idle');
  const [completedIterations, setCompletedIterations] = useState(0);
  const [lastResult, setLastResult] = useState<PollResult | null>(null);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const [logGroupsLoading, setLogGroupsLoading] = useState(true);
  const [addingLogGroup, setAddingLogGroup] = useState(false);
  const [removingLogGroup, setRemovingLogGroup] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const stopRequestedRef = useRef(false);
  const resumeRunAfterPauseRef = useRef(false);
  const modeTabListRef = useRef<HTMLDivElement | null>(null);
  const modeTabRefs = useRef<Record<RunMode, HTMLButtonElement | null>>({ continuous: null, iterations: null });
  const [modeIndicator, setModeIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });

  const selectedCount = selectedLogGroups.length;
  const findings = lastResult?.analysis?.findings ?? [];
  const latestFinding = findings[0];
  const highestSeverity = lastResult?.analysis?.highest_severity ?? 'none';
  const hasConfiguredLogGroups = configuredLogGroups.length > 0;
  const runStatusText = agentPaused ? 'Paused' : runState === 'idle' ? 'Idle' : runState === 'running' ? 'Running' : 'Stopping';
  const eventsAnalyzedLabel = lastResult ? `${lastResult.event_count} event${lastResult.event_count === 1 ? '' : 's'}` : 'Awaiting scan';
  const severityLabel = lastResult ? severityDisplay(highestSeverity) : 'Not checked';
  const findingsLabel = lastResult ? (findings.length ? `${findings.length} finding${findings.length === 1 ? '' : 's'}` : 'No findings') : 'Awaiting scan';
  const emptyStateText = configuredLogGroups.length
    ? 'Start monitoring to analyze CloudWatch events.'
    : 'Add a CloudWatch log group to start monitoring.';

  const addLog = useCallback((level: RunLogEntry['level'], message: string) => {
    setRunLog((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        time: new Date().toLocaleTimeString(),
        level,
        message,
      },
      ...current.slice(0, 59),
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (agentPaused) {
      setLogGroupsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLogGroupsLoading(true);
    client
      .get<string[]>('/api/analytics-agent/api/v1/monitoring-alerting/cloudwatch/log-groups', { cache: 'no-store' })
      .then((groups) => {
        if (cancelled) {
          return;
        }
        setConfiguredLogGroups(groups);
        setSelectedLogGroups(groups);
        addLog('success', `Loaded ${groups.length} configured CloudWatch log group${groups.length === 1 ? '' : 's'}.`);
      })
      .catch((error: Error) => {
        if (!cancelled) {
          addLog('error', `Could not load configured log groups: ${error.message}`);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLogGroupsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [addLog, agentPaused]);

  useEffect(() => {
    if (!agentPaused) {
      return;
    }

    stopRequestedRef.current = true;
    setPolling(false);
    if (runState === 'running') {
      resumeRunAfterPauseRef.current = true;
      setRunState('stopping');
      addLog('warning', 'Agent paused. Monitoring run is stopping.');
    }
  }, [addLog, agentPaused, runState]);

  useEffect(() => {
    if (!hasConfiguredLogGroups) {
      setModeIndicator((current) => ({ ...current, ready: false }));
      return;
    }

    function updateModeIndicator() {
      const activeTab = modeTabRefs.current[runMode];
      const tabList = modeTabListRef.current;

      if (!activeTab || !tabList) {
        return;
      }

      setModeIndicator({
        left: activeTab.offsetLeft,
        top: activeTab.offsetTop,
        width: activeTab.offsetWidth,
        height: activeTab.offsetHeight,
        ready: true,
      });
    }

    updateModeIndicator();
    let nextAnimationFrameId: number | null = null;
    const animationFrameId = window.requestAnimationFrame(() => {
      updateModeIndicator();
      nextAnimationFrameId = window.requestAnimationFrame(updateModeIndicator);
    });
    const resizeObserver = new ResizeObserver(updateModeIndicator);
    if (modeTabListRef.current) {
      resizeObserver.observe(modeTabListRef.current);
    }
    const activeTab = modeTabRefs.current[runMode];
    if (activeTab) {
      resizeObserver.observe(activeTab);
    }
    window.addEventListener('resize', updateModeIndicator);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      if (nextAnimationFrameId !== null) {
        window.cancelAnimationFrame(nextAnimationFrameId);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateModeIndicator);
    };
  }, [hasConfiguredLogGroups, runMode]);

  const canStart = runState === 'idle' && selectedCount > 0 && !logGroupsLoading && !agentPaused;
  const progressLabel = useMemo(() => {
    if (runMode === 'continuous') {
      return `${completedIterations} completed`;
    }
    return `${completedIterations} / ${iterationTarget} completed`;
  }, [completedIterations, iterationTarget, runMode]);

  async function runOneIteration(iterationNumber: number) {
    if (agentPaused || stopRequestedRef.current) {
      return;
    }

    addLog('info', `Iteration ${iterationNumber}: fetching last 2 minutes from ${selectedCount} log group${selectedCount === 1 ? '' : 's'}.`);
    setPolling(true);
    try {
      const result = await client.post<PollResult>('/api/analytics-agent/api/v1/monitoring-alerting/cloudwatch/poll', {
        log_groups: selectedLogGroups,
      });
      setLastResult(result);
      setCompletedIterations((value) => value + 1);

      const severity = result.analysis?.highest_severity ?? 'none';
      const findings = result.analysis?.findings.length ?? 0;
      addLog(
        severity === 'none' ? 'success' : severity === 'low' ? 'warning' : 'error',
        `Iteration ${iterationNumber}: ${result.event_count} events analyzed, severity ${severity}, findings ${findings}.`,
      );
    } finally {
      setPolling(false);
    }
  }

  async function startRun() {
    if (!canStart) {
      return;
    }

    stopRequestedRef.current = false;
    setRunState('running');
    setCompletedIterations(0);
    addLog('info', runMode === 'continuous' ? 'Continuous run started.' : `Fixed run started for ${iterationTarget} iterations.`);

    const maxIterations = runMode === 'continuous' ? Number.POSITIVE_INFINITY : iterationTarget;

    try {
      for (let index = 1; index <= maxIterations; index += 1) {
        if (stopRequestedRef.current) {
          addLog('warning', 'Run stopped before the next poll.');
          break;
        }

        await runOneIteration(index);

        if (index >= maxIterations || stopRequestedRef.current) {
          break;
        }

        addLog('info', `Waiting ${pollIntervalSeconds}s before the next poll.`);
        await sleep(pollIntervalSeconds * 1000, () => stopRequestedRef.current);
      }
    } catch (error) {
      addLog('error', error instanceof Error ? error.message : 'Monitoring run failed.');
    } finally {
      setRunState('idle');
      stopRequestedRef.current = false;
      addLog('success', 'Run loop ended.');
    }
  }

  useEffect(() => {
    if (agentPaused || !resumeRunAfterPauseRef.current || !canStart) {
      return;
    }

    resumeRunAfterPauseRef.current = false;
    void startRun();
  }, [agentPaused, canStart]);

  function stopRun() {
    resumeRunAfterPauseRef.current = false;
    stopRequestedRef.current = true;
    setRunState('stopping');
    addLog('warning', 'Stop requested. Current poll will finish first.');
  }

  function toggleLogGroup(logGroup: string) {
    if (agentPaused) {
      return;
    }

    setSelectedLogGroups((current) =>
      current.includes(logGroup) ? current.filter((item) => item !== logGroup) : [...current, logGroup],
    );
  }

  async function addLogGroup() {
    if (addingLogGroup || agentPaused) {
      return;
    }

    const logGroup = newLogGroup.trim();
    if (!logGroup) {
      addLog('warning', 'Enter a CloudWatch log group name before adding.');
      return;
    }

    setAddingLogGroup(true);
    try {
      const groups = await client.post<string[]>('/api/analytics-agent/api/v1/monitoring-alerting/cloudwatch/log-groups', {
        log_group: logGroup,
      });
      setConfiguredLogGroups(groups);
      setSelectedLogGroups((current) => Array.from(new Set([...current, logGroup])));
      setNewLogGroup('');
      addLog('success', `Added CloudWatch log group ${logGroup}.`);
    } catch (error) {
      addLog('error', error instanceof Error ? error.message : 'Could not add log group.');
    } finally {
      setAddingLogGroup(false);
    }
  }

  async function removeLogGroup(logGroup: string) {
    if (removingLogGroup || agentPaused) {
      return;
    }

    setRemovingLogGroup(logGroup);
    try {
      const groups = await client.post<string[]>('/api/analytics-agent/api/v1/monitoring-alerting/cloudwatch/log-groups/remove', {
        log_group: logGroup,
      });
      setConfiguredLogGroups(groups);
      setSelectedLogGroups((current) => current.filter((item) => item !== logGroup));
      addLog('warning', `Removed CloudWatch log group ${logGroup}.`);
    } catch (error) {
      addLog('error', error instanceof Error ? error.message : 'Could not remove log group.');
    } finally {
      setRemovingLogGroup(null);
    }
  }

  function resetRunLog() {
    setRunLog([]);
    setLastResult(null);
    setCompletedIterations(0);
  }

  return (
    <div className="space-y-5">
      <section className="app-surface card-smooth overflow-hidden rounded-lg">
        <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-[var(--dark-primary-soft)] dark:text-[var(--dark-primary-muted)]">
              <AlertTriangle className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#6246ea] dark:text-[var(--dark-primary-muted)]">Monitoring & Alerting</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#111827] dark:text-[var(--dark-text)]">
                CloudWatch Signal Review
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#71809a] dark:text-[var(--dark-muted)]">
                Watch configured log groups, run anomaly analysis, and review alert-ready findings.
              </p>
            </div>
          </div>

          {hasConfiguredLogGroups ? (
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
              <span className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold ${runStateBadge(runState)}`}>
                {polling ? <Spinner className="mr-2 size-4" /> : null}
                {runStatusText}
              </span>
              <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e6eaf2] px-3 text-sm font-semibold text-[#4f5d73] dark:border-[var(--dark-border)] dark:text-[var(--dark-muted-strong)]">
                {selectedCount}/{configuredLogGroups.length} groups
              </span>
              <div className="inline-flex h-9 overflow-hidden rounded-lg border border-[#e6eaf2] bg-white dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)]">
                {runState === 'idle' ? (
                  <button
                    type="button"
                    disabled={!canStart}
                    onClick={() => void startRun()}
                    className="app-button-primary inline-flex min-w-24 items-center justify-center gap-2 px-3 text-sm font-semibold disabled:cursor-not-allowed"
                  >
                    <Play className="size-4" />
                    Start
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRun}
                    className="inline-flex min-w-24 items-center justify-center gap-2 bg-rose-500/10 px-3 text-sm font-semibold text-rose-600 smooth-transition hover:bg-rose-500/15 dark:text-rose-300"
                  >
                    <Square className="size-4" />
                    {runState === 'stopping' ? 'Stopping' : 'Stop'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetRunLog}
                  disabled={agentPaused}
                  className="inline-flex items-center justify-center border-l border-[#e6eaf2] px-3 text-sm font-semibold text-[#4f5d73] smooth-transition hover:bg-[#f8faff] dark:border-[var(--dark-border)] dark:text-[var(--dark-muted-strong)] dark:hover:bg-[var(--dark-hover)]"
                  aria-label="Reset monitoring run"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
            </div>
          ) : (
            <span
              className={`inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                logGroupsLoading
                  ? 'bg-slate-100 text-slate-600 dark:bg-[var(--dark-hover)] dark:text-[var(--dark-muted-strong)]'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {logGroupsLoading ? <Spinner className="size-4" /> : null}
              {logGroupsLoading ? 'Loading' : 'Setup required'}
            </span>
          )}
        </div>

        {!logGroupsLoading && !hasConfiguredLogGroups ? (
          <div className="mx-5 mb-5 grid gap-5 rounded-lg bg-slate-50/80 p-4 ring-1 ring-slate-200/80 dark:bg-[var(--dark-bg)] dark:ring-[var(--dark-border)] xl:grid-cols-[minmax(0,0.95fr)_minmax(320px,0.75fr)]">
            <div className="flex gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
                <AlertTriangle className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="app-heading text-lg font-semibold">Configure CloudWatch before scans run</h2>
                <p className="app-muted mt-1 max-w-2xl text-sm leading-6">
                  Add at least one CloudWatch log group, then start a scan to review events and alert-ready findings.
                </p>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newLogGroup}
                    onChange={(event) => setNewLogGroup(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void addLogGroup();
                      }
                    }}
                    disabled={agentPaused}
                    placeholder="/aws/lambda/service-name"
                    className="h-10 min-w-0 flex-1 rounded-lg border border-[#e6eaf2] bg-white px-3 font-mono text-xs text-[#111827] outline-none smooth-transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)] dark:placeholder:text-[var(--dark-muted)] dark:focus:border-[var(--dark-primary-border)] dark:focus:ring-[var(--dark-primary-border)]"
                  />
                  <button
                    type="button"
                    disabled={addingLogGroup || !newLogGroup.trim() || agentPaused}
                    onClick={() => void addLogGroup()}
                    className="app-button-primary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed"
                  >
                    {addingLogGroup ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                    Add
                  </button>
                </div>

                <code className="mt-3 block overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-xs font-semibold text-[#4f46e5] ring-1 ring-slate-200 dark:bg-[var(--dark-bg)] dark:text-[var(--dark-primary-muted)] dark:ring-[var(--dark-border)]">
                  CLOUDWATCH_LOG_GROUPS=/aws/lambda/service-name
                </code>
              </div>
            </div>

            <div className="grid content-start gap-2 text-sm">
              {[
                'Install analytics-agent dependencies',
                'Set AWS_REGION and AWS credentials or an instance/task role',
                'Add CLOUDWATCH_LOG_GROUPS in agents/analytics-agent/.env',
                'Restart analytics-agent and run a scan',
              ].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-md bg-white/70 px-3 py-2 text-[#4f5d73] ring-1 ring-slate-200/70 dark:bg-[var(--dark-elevated)] dark:text-[var(--dark-muted-strong)] dark:ring-[var(--dark-border)]">
                  <span
                    className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                      index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-[var(--dark-hover)] dark:text-[var(--dark-muted)]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {hasConfiguredLogGroups ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <HeaderStat title="Progress" value={progressLabel} />
            <HeaderStat title="Events analyzed" value={eventsAnalyzedLabel} />
            <HeaderStat title="Highest severity" value={severityLabel} tone={lastResult ? severityTone(highestSeverity) : 'text-[#71809a] dark:text-[var(--dark-muted)]'} />
            <HeaderStat title="Findings" value={findingsLabel} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <section className="app-surface card-smooth rounded-lg p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="app-heading text-lg font-semibold">Run Setup</h2>
              <p className="app-muted mt-1 text-sm">Select log groups and polling cadence.</p>
            </div>
            <span className="app-muted inline-flex items-center gap-1.5 text-sm font-semibold">
              {logGroupsLoading ? <Spinner className="size-4" /> : null}
              {logGroupsLoading ? 'Loading' : `${selectedCount} selected`}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <div>
              <label className="app-muted-strong text-sm font-semibold">Mode</label>
              <div ref={modeTabListRef} className="relative mt-2 grid grid-cols-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-1 dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)]">
                <span
                  aria-hidden="true"
                  className={`absolute rounded-md bg-[#efecff] transition-[left,top,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[left,top,width,height] dark:bg-[var(--dark-primary-soft)] ${
                    modeIndicator.ready ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    left: modeIndicator.left,
                    top: modeIndicator.top,
                    width: modeIndicator.width,
                    height: modeIndicator.height,
                  }}
                />
                {(['continuous', 'iterations'] as const).map((mode) => (
                  <button
                    key={mode}
                    ref={(node) => {
                      modeTabRefs.current[mode] = node;
                    }}
                    type="button"
                    onClick={() => {
                      if (!agentPaused) {
                        setRunMode(mode);
                      }
                    }}
                    disabled={agentPaused}
                    className={`relative z-10 h-9 rounded-md px-3 text-sm font-semibold capitalize smooth-transition ${
                      runMode === mode
                        ? 'text-[#4f3ee7] dark:text-[var(--dark-primary-muted)]'
                        : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-[var(--dark-muted-strong)] dark:hover:bg-[var(--dark-hover)] dark:hover:text-[var(--dark-primary-muted)]'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Interval seconds" value={pollIntervalSeconds} min={5} max={600} disabled={agentPaused} onChange={setPollIntervalSeconds} />
              <NumberField
                label="Iterations"
                value={iterationTarget}
                min={1}
                max={200}
                disabled={runMode !== 'iterations' || agentPaused}
                onChange={setIterationTarget}
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="app-muted-strong text-sm font-semibold">CloudWatch log groups</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newLogGroup}
                onChange={(event) => setNewLogGroup(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void addLogGroup();
                  }
                }}
                disabled={agentPaused}
                placeholder="/aws/lambda/service-name"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[#e6eaf2] bg-white px-3 font-mono text-xs text-[#111827] outline-none smooth-transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)] dark:placeholder:text-[var(--dark-muted)] dark:focus:border-[var(--dark-primary-border)] dark:focus:ring-[var(--dark-primary-border)]"
              />
              <button
                type="button"
                disabled={addingLogGroup || !newLogGroup.trim() || agentPaused}
                onClick={() => void addLogGroup()}
                className="app-button-primary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {addingLogGroup ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                Add
              </button>
            </div>

            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {logGroupsLoading ? (
                <div className="app-surface-subtle flex items-center gap-2 rounded-lg p-3 text-sm text-[#4f5d73] dark:text-[var(--dark-muted-strong)]">
                  <Spinner className="size-4 text-[#6246ea]" />
                  Loading CloudWatch groups...
                </div>
              ) : configuredLogGroups.length ? (
                configuredLogGroups.map((logGroup) => {
                  const selected = selectedLogGroups.includes(logGroup);
                  return (
                    <label
                      key={logGroup}
                      className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm smooth-transition ${
                        selected
                          ? 'border-[#d8d1ff] bg-[#f4f1ff] dark:border-[var(--dark-primary-border)] dark:bg-[var(--dark-primary-soft)]'
                          : 'border-[#e6eaf2] bg-white hover:bg-[#fbfcff] dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)] dark:hover:bg-[var(--dark-hover)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={agentPaused}
                        onChange={() => toggleLogGroup(logGroup)}
                        className="size-4 rounded border-[#d8d1ff] accent-[#6246ea]"
                      />
                      <span className="min-w-0 flex-1 break-all font-mono text-xs text-[#4f5d73] dark:text-[var(--dark-muted-strong)]">{logGroup}</span>
                      <button
                        type="button"
                        disabled={removingLogGroup === logGroup || agentPaused}
                        onClick={(event) => {
                          event.preventDefault();
                          void removeLogGroup(logGroup);
                        }}
                        className="inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold text-rose-600 smooth-transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        {removingLogGroup === logGroup ? <Spinner className="size-3" /> : 'Remove'}
                      </button>
                    </label>
                  );
                })
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
                  No configured CloudWatch groups found.
                </div>
              )}
            </div>
          </div>
            </section>

            <section className="app-surface card-smooth rounded-lg p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="app-heading text-lg font-semibold">Latest Analysis</h2>
              <p className="app-muted mt-1 text-sm">
                {lastResult?.analysis?.analyzed_at ? `Analyzed ${formatAnalyzedAt(lastResult.analysis.analyzed_at)}` : emptyStateText}
              </p>
            </div>
            <span className={`inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold ${lastResult ? severityBadge(highestSeverity) : severityBadge('unknown')}`}>
              {lastResult ? severityDisplay(highestSeverity) : 'Not checked'}
            </span>
          </div>

          {latestFinding ? (
            <div className="mt-5 grid gap-4">
              <div className="card-smooth rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)]">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`mt-0.5 size-5 ${severityTone(latestFinding.severity)}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="app-heading text-base font-semibold">{latestFinding.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severityBadge(latestFinding.severity)}`}>
                        {latestFinding.severity}
                      </span>
                    </div>
                    <p className="app-muted-strong mt-2 text-sm leading-6">{latestFinding.summary}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1.1fr_0.5fr]">
                <DetailBlock title="Recommended action" text={latestFinding.recommended_action} />
                <DetailBlock title="Confidence" text={`${Math.round(latestFinding.confidence * 100)}%`} />
              </div>

              <div className="grid gap-2">
                <h3 className="app-muted-strong text-sm font-semibold">Evidence</h3>
                {latestFinding.evidence.length ? (
                  latestFinding.evidence.map((item) => (
                    <p key={item} className="card-smooth rounded-lg border border-[#e6eaf2] bg-white p-3 font-mono text-xs text-[#4f5d73] dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)] dark:text-[var(--dark-muted-strong)]">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="app-muted text-sm">No evidence attached to this finding.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid min-h-56 place-items-center rounded-lg border border-dashed border-[#d8d1ff] bg-[#fbfcff] p-6 text-center dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)]">
              <div>
                {polling ? (
                  <Spinner className="mx-auto size-8 text-[#6246ea]" />
                ) : (
                  <ServerCog className="mx-auto size-8 text-[#6246ea] dark:text-[var(--dark-primary-muted)]" />
                )}
                <p className="app-muted mt-2 text-sm">{polling ? 'Analyzing latest CloudWatch events...' : emptyStateText}</p>
              </div>
            </div>
          )}
            </section>
          </section>

          <section className="app-surface card-smooth rounded-lg p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="app-heading text-lg font-semibold">Activity Stream</h2>
                <p className="app-muted mt-1 text-sm">Recent monitoring run events.</p>
              </div>
              <span className="app-muted text-sm font-semibold">{runLog.length} entries</span>
            </div>
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {runLog.length ? (
                runLog.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="card-smooth grid gap-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 text-sm dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)] md:grid-cols-[76px_74px_1fr]">
                    <span className="font-mono text-xs text-[#71809a] dark:text-[var(--dark-text)]">{entry.time}</span>
                    <span className={`text-xs font-semibold uppercase ${logTone(entry.level)}`}>{entry.level}</span>
                    <span className="min-w-0 text-[#4f5d73] dark:text-[var(--dark-muted-strong)]">{entry.message}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-3 text-sm text-[#71809a] dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)] dark:text-[var(--dark-muted)]">
                  No run activity yet.
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className={disabled ? 'opacity-50' : ''}>
      <span className="app-muted-strong text-sm font-medium">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        className="mt-2 h-10 w-full rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm text-[#111827] outline-none smooth-transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] disabled:bg-slate-100 dark:border-[var(--dark-border)] dark:bg-[var(--dark-bg)] dark:text-[var(--dark-text)] dark:focus:border-[var(--dark-primary-border)] dark:focus:ring-[var(--dark-primary-border)] dark:disabled:bg-[var(--dark-hover)] dark:disabled:text-[var(--dark-muted)]"
      />
    </label>
  );
}

function HeaderStat({ title, value, tone = 'text-[#111827] dark:text-[var(--dark-text)]' }: { title: string; value: string; tone?: string }) {
  return (
    <div className="card-smooth rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)]">
      <p className="app-muted text-xs font-semibold uppercase">{title}</p>
      <p className={`mt-2 truncate text-xl font-semibold capitalize ${tone}`}>{value}</p>
    </div>
  );
}

function Spinner({ className = 'size-4' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="app-surface-subtle rounded-lg p-4">
      <h3 className="app-muted text-xs font-semibold uppercase">{title}</h3>
      <p className="app-muted-strong mt-2 text-sm">{text}</p>
    </div>
  );
}

function runStateBadge(runState: RunState) {
  if (runState === 'running') {
    return 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  }
  if (runState === 'stopping') {
    return 'border border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  }
  return 'border border-[#e6eaf2] bg-[#fbfcff] text-[#4f5d73] dark:border-[var(--dark-border)] dark:bg-[var(--dark-surface-subtle)] dark:text-[var(--dark-muted-strong)]';
}

function formatAnalyzedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function sleep(ms: number, shouldStop?: () => boolean) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const tick = () => {
      if (shouldStop?.() || Date.now() - startedAt >= ms) {
        resolve(undefined);
        return;
      }
      window.setTimeout(tick, Math.min(250, ms));
    };
    window.setTimeout(tick, Math.min(250, ms));
  });
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function severityTone(severity: string) {
  if (severity === 'critical' || severity === 'high') {
    return 'text-rose-600';
  }
  if (severity === 'medium') {
    return 'text-amber-600';
  }
  if (severity === 'low') {
    return 'text-[#6246ea]';
  }
  return 'text-emerald-600';
}

function severityBadge(severity: string) {
  if (severity === 'unknown') {
    return 'bg-slate-100 text-slate-600 dark:bg-[var(--dark-hover)] dark:text-[var(--dark-muted-strong)]';
  }
  if (severity === 'critical' || severity === 'high') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  }
  if (severity === 'medium') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  }
  if (severity === 'low') {
    return 'bg-[#efecff] text-[#4f3ee7] dark:bg-[var(--dark-primary-soft)] dark:text-[var(--dark-primary-muted)]';
  }
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
}

function severityDisplay(severity: string) {
  if (severity === 'none') {
    return 'Clear';
  }
  return severity;
}

function logTone(level: RunLogEntry['level']) {
  if (level === 'error') {
    return 'text-rose-600';
  }
  if (level === 'warning') {
    return 'text-amber-600';
  }
  if (level === 'success') {
    return 'text-emerald-600';
  }
  return 'text-[#6246ea]';
}
