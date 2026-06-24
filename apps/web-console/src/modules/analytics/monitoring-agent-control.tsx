'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
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

export function MonitoringAgentControl() {
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
      });

    return () => {
      cancelled = true;
    };
  }, [addLog]);

  const canStart = runState === 'idle' && selectedCount > 0;
  const progressLabel = useMemo(() => {
    if (runMode === 'continuous') {
      return `${completedIterations} completed`;
    }
    return `${completedIterations} / ${iterationTarget} completed`;
  }, [completedIterations, iterationTarget, runMode]);

  async function runOneIteration(iterationNumber: number) {
    addLog('info', `Iteration ${iterationNumber}: fetching last 2 minutes from ${selectedCount} log group${selectedCount === 1 ? '' : 's'}.`);
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
    const logGroup = newLogGroup.trim();
    if (!logGroup) {
      addLog('warning', 'Enter a CloudWatch log group name before adding.');
      return;
    }

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
    }
  }

  async function removeLogGroup(logGroup: string) {
    try {
      const groups = await client.post<string[]>('/api/analytics-agent/api/v1/monitoring-alerting/cloudwatch/log-groups/remove', {
        log_group: logGroup,
      });
      setConfiguredLogGroups(groups);
      setSelectedLogGroups((current) => current.filter((item) => item !== logGroup));
      addLog('warning', `Removed CloudWatch log group ${logGroup}.`);
    } catch (error) {
      addLog('error', error instanceof Error ? error.message : 'Could not remove log group.');
    }
  }

  function resetRunLog() {
    setRunLog([]);
    setLastResult(null);
    setCompletedIterations(0);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="app-heading text-2xl font-semibold tracking-tight">Analytics Monitoring Agent</h1>
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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
        <Metric title="Run State" value={runState} icon={ServerCog} tone={runState === 'running' ? 'text-emerald-600' : 'text-blue-600'} />
        <Metric title="Progress" value={progressLabel} icon={ListChecks} tone="text-indigo-600" />
        <Metric title="Last Event Count" value={String(lastResult?.event_count ?? 0)} icon={Clock3} tone="text-sky-600" />
        <Metric title="Highest Severity" value={highestSeverity} icon={AlertTriangle} tone={severityTone(highestSeverity)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="app-surface rounded-lg p-5">
          <h2 className="app-heading text-base font-semibold">Run Controls</h2>

          <div className="mt-5 space-y-5">
            <div>
              <label className="app-muted-strong text-sm font-medium">Mode</label>
              <div className="mt-2 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/40">
                {(['continuous', 'iterations'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRunMode(mode)}
                    className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                      runMode === mode
                        ? 'bg-white text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300'
                        : 'text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
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
                <span className="app-muted text-xs">{selectedCount} selected</span>
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
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 font-mono text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  type="button"
                  onClick={() => void addLogGroup()}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
                >
                  <Plus className="size-4" />
                  Add
                </button>
              </div>
              <div className="mt-2 space-y-2">
                {configuredLogGroups.length ? (
                  configuredLogGroups.map((logGroup) => (
                    <label
                      key={logGroup}
                      className="app-surface-subtle flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLogGroups.includes(logGroup)}
                        onChange={() => toggleLogGroup(logGroup)}
                        className="size-4 rounded border-slate-300 text-blue-600"
                      />
                      <span className="min-w-0 flex-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">{logGroup}</span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          void removeLogGroup(logGroup);
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                      >
                        Remove
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
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${severityBadge(lastResult.analysis.highest_severity)}`}>
                {lastResult.analysis.highest_severity}
              </span>
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
                    <p key={item} className="app-surface-subtle rounded-lg p-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-200 text-center dark:border-slate-700">
              <div>
                <ServerCog className="mx-auto size-8 text-slate-400" />
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
              <div key={entry.id} className="grid gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-slate-700 md:grid-cols-[88px_92px_1fr]">
                <span className="font-mono text-xs text-slate-500">{entry.time}</span>
                <span className={`text-xs font-semibold uppercase ${logTone(entry.level)}`}>{entry.level}</span>
                <span className="text-slate-700 dark:text-slate-200">{entry.message}</span>
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
        className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:disabled:bg-slate-800"
      />
    </label>
  );
}

function Metric({ title, value, icon: Icon, tone }: { title: string; value: string; icon: typeof ServerCog; tone: string }) {
  return (
    <section className="app-surface rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="app-muted text-sm font-medium">{title}</p>
        <Icon className={`size-5 ${tone}`} />
      </div>
      <p className="app-heading mt-3 truncate text-xl font-semibold capitalize">{value}</p>
    </section>
  );
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
    return 'text-sky-600';
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
    return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300';
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
  return 'text-blue-600';
}
