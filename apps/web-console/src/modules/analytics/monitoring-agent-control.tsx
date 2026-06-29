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

export function MonitoringAgentControl({ embedded: _embedded = false }: { embedded?: boolean }) {
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
  const findings = lastResult?.analysis?.findings ?? [];
  const latestFinding = findings[0];
  const highestSeverity = lastResult?.analysis?.highest_severity ?? 'none';
  const runStatusText = runState === 'idle' ? 'Idle' : runState === 'running' ? 'Running' : 'Stopping';
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
    <div className="space-y-5">
      <section className="app-surface card-smooth overflow-hidden rounded-lg">
        <div className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              <AlertTriangle className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#6246ea] dark:text-violet-300">Monitoring & Alerting</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#111827] dark:text-slate-50">
                CloudWatch Signal Review
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#71809a] dark:text-slate-400">
                Watch configured log groups, run anomaly analysis, and review alert-ready findings.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
            <span className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold ${runStateBadge(runState)}`}>
              {polling ? <Spinner className="mr-2 size-4" /> : null}
              {runStatusText}
            </span>
            <span className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e6eaf2] px-3 text-sm font-semibold text-[#4f5d73] dark:border-[#263247] dark:text-slate-300">
              {selectedCount}/{configuredLogGroups.length} groups
            </span>
            <div className="inline-flex h-9 overflow-hidden rounded-lg border border-[#e6eaf2] bg-white dark:border-[#263247] dark:bg-[#0b1020]">
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
                className="inline-flex items-center justify-center border-l border-[#e6eaf2] px-3 text-sm font-semibold text-[#4f5d73] smooth-transition hover:bg-[#f8faff] dark:border-[#263247] dark:text-slate-300 dark:hover:bg-[#182338]"
                aria-label="Reset monitoring run"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>
        </div>

      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HeaderStat title="Progress" value={progressLabel} />
        <HeaderStat title="Events analyzed" value={eventsAnalyzedLabel} />
        <HeaderStat title="Highest severity" value={severityLabel} tone={lastResult ? severityTone(highestSeverity) : 'text-[#71809a] dark:text-slate-400'} />
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
              <div className="mt-2 grid grid-cols-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-1 dark:border-[#263247] dark:bg-[#0b1020]">
                {(['continuous', 'iterations'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRunMode(mode)}
                    className={`h-9 rounded-md px-3 text-sm font-semibold capitalize smooth-transition ${
                      runMode === mode
                        ? 'bg-[#efecff] text-[#4f3ee7] dark:bg-violet-500/20 dark:text-violet-200'
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
                placeholder="/aws/lambda/service-name"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-[#e6eaf2] bg-white px-3 font-mono text-xs text-[#111827] outline-none smooth-transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] dark:border-[#263247] dark:bg-[#0b1020] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
              />
              <button
                type="button"
                disabled={addingLogGroup || !newLogGroup.trim()}
                onClick={() => void addLogGroup()}
                className="app-button-primary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed"
              >
                {addingLogGroup ? <Spinner className="size-4" /> : <Plus className="size-4" />}
                Add
              </button>
            </div>

            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {logGroupsLoading ? (
                <div className="app-surface-subtle flex items-center gap-2 rounded-lg p-3 text-sm text-[#4f5d73] dark:text-slate-300">
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
                          ? 'border-[#d8d1ff] bg-[#f4f1ff] dark:border-violet-500/30 dark:bg-violet-500/10'
                          : 'border-[#e6eaf2] bg-white hover:bg-[#fbfcff] dark:border-[#263247] dark:bg-[#0f172a] dark:hover:bg-[#182338]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
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
              <div className="card-smooth rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
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
                    <p key={item} className="card-smooth rounded-lg border border-[#e6eaf2] bg-white p-3 font-mono text-xs text-[#4f5d73] dark:border-[#263247] dark:bg-[#0b1020] dark:text-slate-200">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="app-muted text-sm">No evidence attached to this finding.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid min-h-56 place-items-center rounded-lg border border-dashed border-[#d8d1ff] bg-[#fbfcff] p-6 text-center dark:border-[#263247] dark:bg-[#0f172a]">
              <div>
                {polling ? (
                  <Spinner className="mx-auto size-8 text-[#6246ea]" />
                ) : (
                  <ServerCog className="mx-auto size-8 text-[#6246ea] dark:text-violet-300" />
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
              <div key={entry.id} className="card-smooth grid gap-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 text-sm dark:border-[#263247] dark:bg-[#0f172a] md:grid-cols-[76px_74px_1fr]">
                <span className="font-mono text-xs text-[#71809a] dark:text-slate-500">{entry.time}</span>
                <span className={`text-xs font-semibold uppercase ${logTone(entry.level)}`}>{entry.level}</span>
                <span className="min-w-0 text-[#4f5d73] dark:text-slate-200">{entry.message}</span>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-3 text-sm text-[#71809a] dark:border-[#263247] dark:bg-[#0f172a] dark:text-slate-400">
              No run activity yet.
            </div>
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
        className="mt-2 h-10 w-full rounded-lg border border-[#e6eaf2] bg-white px-3 text-sm text-[#111827] outline-none smooth-transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] disabled:bg-slate-100 dark:border-[#263247] dark:bg-[#0b1020] dark:text-slate-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20 dark:disabled:bg-[#182338] dark:disabled:text-slate-500"
      />
    </label>
  );
}

function HeaderStat({ title, value, tone = 'text-[#111827] dark:text-slate-100' }: { title: string; value: string; tone?: string }) {
  return (
    <div className="card-smooth rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
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
  return 'border border-[#e6eaf2] bg-[#fbfcff] text-[#4f5d73] dark:border-[#263247] dark:bg-[#0f172a] dark:text-slate-300';
}

function formatAnalyzedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
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
  if (severity === 'unknown') {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
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
