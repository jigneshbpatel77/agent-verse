'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  ListChecks,
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

export function MonitoringAgentControl({ embedded = false }: { embedded?: boolean }) {
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

  const selectedCount = selectedLogGroups.length;
  const latestFinding = lastResult?.analysis?.findings[0];
  const highestSeverity = lastResult?.analysis?.highest_severity ?? 'none';

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
  }, [addLog]);

  const canStart = runState === 'idle' && selectedCount > 0 && !logGroupsLoading;
  const progressLabel = useMemo(() => {
    if (runMode === 'continuous') {
      return `${completedIterations} completed`;
    }
    return `${completedIterations} / ${iterationTarget} completed`;
  }, [completedIterations, iterationTarget, runMode]);

  async function runOneIteration(iterationNumber: number) {
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
        await sleep(pollIntervalSeconds * 1000);
      }
    } catch (error) {
      addLog('error', error instanceof Error ? error.message : 'Monitoring run failed.');
    } finally {
      setRunState('idle');
      stopRequestedRef.current = false;
      addLog('success', 'Run loop ended.');
    }
  }

  function stopRun() {
    stopRequestedRef.current = true;
    setRunState('stopping');
    addLog('warning', 'Stop requested. Current poll will finish first.');
  }

  function toggleLogGroup(logGroup: string) {
    setSelectedLogGroups((current) =>
      current.includes(logGroup) ? current.filter((item) => item !== logGroup) : [...current, logGroup],
    );
  }

  async function addLogGroup() {
    if (addingLogGroup) {
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
    if (removingLogGroup) {
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
    <div className="space-y-6">
      <section className={`${embedded ? 'flex flex-col gap-4 md:flex-row md:items-end md:justify-between' : 'app-surface flex flex-col gap-4 rounded-lg p-5 md:flex-row md:items-end md:justify-between'}`}>
        <div>
          {embedded ? (
            <h2 className="app-heading text-xl font-semibold tracking-tight">CloudWatch Monitor Control</h2>
          ) : (
            <h1 className="app-heading text-2xl font-semibold tracking-tight">Monitoring & Alerting</h1>
          )}
          <p className="app-muted mt-1 text-sm">Run CloudWatch log analysis continuously or for a fixed number of polling iterations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetRunLog}
            className="app-button-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
          >
            <RotateCcw className="size-4" />
            Reset
          </button>
          {runState === 'idle' ? (
            <button
              type="button"
              disabled={!canStart}
              onClick={() => void startRun()}
              className="app-button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed"
            >
              <Play className="size-4" />
              Start
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRun}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              <Square className="size-4" />
              {runState === 'stopping' ? 'Stopping' : 'Stop'}
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Run State" value={runState} icon={ServerCog} tone={runState === 'running' ? 'text-emerald-600' : 'text-[#6246ea]'} loading={polling} />
        <Metric title="Progress" value={progressLabel} icon={ListChecks} tone="text-[#6246ea]" />
        <Metric title="Last Event Count" value={String(lastResult?.event_count ?? 0)} icon={Clock3} tone="text-[#6246ea]" loading={polling} />
        <Metric title="Highest Severity" value={highestSeverity} icon={AlertTriangle} tone={severityTone(highestSeverity)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="app-surface rounded-lg p-5">
          <h2 className="app-heading text-base font-semibold">Run Controls</h2>

          <div className="mt-5 space-y-5">
            <div>
              <label className="app-muted-strong text-sm font-medium">Mode</label>
              <div className="mt-2 grid grid-cols-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-1 dark:border-[#263247] dark:bg-[#0f172a]">
                {(['continuous', 'iterations'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRunMode(mode)}
                    className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                      runMode === mode
                        ? 'bg-white text-[#4f3ee7] shadow-sm dark:bg-violet-500/15 dark:text-violet-200'
                        : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Interval seconds" value={pollIntervalSeconds} min={5} max={600} onChange={setPollIntervalSeconds} />
              <NumberField
                label="Iterations"
                value={iterationTarget}
                min={1}
                max={200}
                disabled={runMode !== 'iterations'}
                onChange={setIterationTarget}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="app-muted-strong text-sm font-medium">Log groups</label>
                <span className="app-muted inline-flex items-center gap-1.5 text-xs">
                  {logGroupsLoading ? <Spinner className="size-3.5" /> : null}
                  {logGroupsLoading ? 'Loading groups' : `${selectedCount} selected`}
                </span>
              </div>
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
                  placeholder="/aws/lambda/service-name"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[#e6eaf2] bg-white px-3 font-mono text-xs text-[#111827] outline-none transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] dark:border-[#263247] dark:bg-[#0b1020] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  disabled={addingLogGroup || !newLogGroup.trim()}
                  onClick={() => void addLogGroup()}
                  className="app-button-primary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed"
                >
                  {addingLogGroup ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                  {addingLogGroup ? 'Adding' : 'Add'}
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {logGroupsLoading ? (
                  <div className="app-surface-subtle flex items-center gap-2 rounded-lg p-3 text-sm text-[#4f5d73] dark:text-slate-300">
                    <Spinner className="size-4 text-[#6246ea]" />
                    Loading CloudWatch groups...
                  </div>
                ) : configuredLogGroups.length ? (
                  configuredLogGroups.map((logGroup) => (
                    <label
                      key={logGroup}
                      className="app-surface-subtle flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLogGroups.includes(logGroup)}
                        onChange={() => toggleLogGroup(logGroup)}
                        className="size-4 rounded border-[#d8d1ff] accent-[#6246ea]"
                      />
                      <span className="min-w-0 flex-1 break-all font-mono text-xs text-[#4f5d73] dark:text-slate-200">{logGroup}</span>
                      <button
                        type="button"
                        disabled={removingLogGroup === logGroup}
                        onClick={(event) => {
                          event.preventDefault();
                          void removeLogGroup(logGroup);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        {removingLogGroup === logGroup ? <Spinner className="size-3" /> : null}
                        {removingLogGroup === logGroup ? 'Removing' : 'Remove'}
                      </button>
                    </label>
                  ))
                ) : (
                  <div className="app-surface-subtle rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
                    No configured CloudWatch groups found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="app-surface rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="app-heading text-base font-semibold">Latest Analysis</h2>
              <p className="app-muted mt-1 text-sm">The latest poll result from the analytics agent.</p>
            </div>
            {lastResult?.analysis ? (
              <div className="flex items-center gap-2">
                {polling ? <Spinner className="size-4 text-[#6246ea]" /> : null}
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityBadge(lastResult.analysis.highest_severity)}`}>
                  {lastResult.analysis.highest_severity}
                </span>
              </div>
            ) : polling ? (
              <Spinner className="size-4 text-[#6246ea]" />
            ) : null}
          </div>

          {latestFinding ? (
            <div className="mt-5 space-y-4">
              <div className="app-surface-subtle rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`mt-0.5 size-5 ${severityTone(latestFinding.severity)}`} />
                  <div>
                    <h3 className="app-heading text-sm font-semibold">{latestFinding.title}</h3>
                    <p className="app-muted-strong mt-2 text-sm leading-6">{latestFinding.summary}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <DetailBlock title="Recommended Action" text={latestFinding.recommended_action} />
                <DetailBlock title="Confidence" text={`${Math.round(latestFinding.confidence * 100)}%`} />
              </div>

              <div>
                <h3 className="app-muted-strong text-sm font-semibold">Evidence</h3>
                <div className="mt-2 space-y-2">
                  {latestFinding.evidence.map((item) => (
                    <p key={item} className="app-surface-subtle rounded-lg p-3 font-mono text-xs text-[#4f5d73] dark:text-slate-200">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : polling ? (
            <div className="mt-5 grid min-h-64 place-items-center rounded-lg border border-dashed border-[#d8d1ff] bg-[#fbfcff] text-center dark:border-[#263247] dark:bg-[#0f172a]">
              <div>
                <Spinner className="mx-auto size-8 text-[#6246ea]" />
                <p className="app-muted mt-2 text-sm">Analyzing latest CloudWatch events...</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid min-h-64 place-items-center rounded-lg border border-dashed border-[#d8d1ff] bg-[#fbfcff] text-center dark:border-[#263247] dark:bg-[#0f172a]">
              <div>
                <ServerCog className="mx-auto size-8 text-[#6246ea] dark:text-violet-300" />
                <p className="app-muted mt-2 text-sm">Start a run to see CloudWatch analysis.</p>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="app-surface rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h2 className="app-heading text-base font-semibold">Run Log</h2>
          <span className="app-muted text-xs">{runLog.length} entries</span>
        </div>
        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {runLog.length ? (
            runLog.map((entry) => (
              <div key={entry.id} className="grid gap-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 text-sm dark:border-[#263247] dark:bg-[#0f172a] md:grid-cols-[88px_92px_1fr]">
                <span className="font-mono text-xs text-[#71809a] dark:text-slate-500">{entry.time}</span>
                <span className={`text-xs font-semibold uppercase ${logTone(entry.level)}`}>{entry.level}</span>
                <span className="text-[#4f5d73] dark:text-slate-200">{entry.message}</span>
              </div>
            ))
          ) : (
            <p className="app-muted text-sm">No run activity yet.</p>
          )}
        </div>
      </section>
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
        className="mt-2 h-10 w-full rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] disabled:bg-slate-100 dark:border-[#263247] dark:bg-[#0b1020] dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20 dark:disabled:bg-[#182338] dark:disabled:text-slate-500"
      />
    </label>
  );
}

function Metric({ title, value, icon: Icon, tone, loading = false }: { title: string; value: string; icon: typeof ServerCog; tone: string; loading?: boolean }) {
  return (
    <section className="app-surface rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="app-muted text-sm font-medium">{title}</p>
        {loading ? <Spinner className={`size-5 ${tone}`} /> : <Icon className={`size-5 ${tone}`} />}
      </div>
      <p className="app-heading mt-3 truncate text-xl font-semibold capitalize">{value}</p>
    </section>
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

function sleep(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
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
  if (severity === 'critical' || severity === 'high') {
    return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
  }
  if (severity === 'medium') {
    return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  }
  if (severity === 'low') {
    return 'bg-[#efecff] text-[#4f3ee7] dark:bg-violet-500/15 dark:text-violet-200';
  }
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
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
