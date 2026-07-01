'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Loader2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { FunnelEventCatalogItem } from '@/data/funnelEventsMock';
import { formatNumber } from './formatters';

const DROPZONE_ID = '__funnel_dropzone__';

// ─── Available event row (draggable from the left list) ─────────────────────────

function AvailableEventRow({
  event,
  onAdd,
}: {
  event: FunnelEventCatalogItem;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `avail:${event.eventName}`,
    data: { type: 'available', event },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg border border-[#e6eaf2] bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#111827] ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
        aria-label={`Drag ${event.label}`}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[#111827] dark:text-slate-100">{event.label}</p>
        <p className="truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">{event.eventName}</p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-slate-400 dark:text-slate-500">
        {formatNumber(event.totalUsers)} users
      </span>
      <button
        type="button"
        onClick={onAdd}
        className="grid size-6 shrink-0 place-items-center rounded-md bg-[#f1ecff] text-[#6246ea] transition hover:bg-[#e4dbff] dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20"
        aria-label={`Add ${event.label} to funnel`}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Selected step row (sortable inside the funnel queue) ───────────────────────

function FunnelStepRow({
  event,
  index,
  onRemove,
}: {
  event: FunnelEventCatalogItem;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.eventName,
    data: { type: 'step', event },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-[#111827] ${
        isDragging
          ? 'border-[#6246ea] shadow-lg dark:border-violet-400'
          : 'border-[#e6eaf2] dark:border-slate-700'
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
        aria-label={`Reorder ${event.label}`}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#6246ea] text-[10px] font-bold text-white">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-[#111827] dark:text-slate-100">{event.label}</p>
        <p className="truncate font-mono text-[10px] text-slate-400 dark:text-slate-500">{event.eventName}</p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="grid size-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
        aria-label={`Remove ${event.label}`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Main builder modal ─────────────────────────────────────────────────────────

export function FunnelBuilder({
  open,
  catalog,
  loading,
  isLive,
  onClose,
  onSave,
}: {
  open: boolean;
  catalog: FunnelEventCatalogItem[];
  loading: boolean;
  isLive: boolean;
  onClose: () => void;
  onSave: (name: string, steps: FunnelEventCatalogItem[]) => void;
}) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [steps, setSteps] = useState<FunnelEventCatalogItem[]>([]);
  const [activeEvent, setActiveEvent] = useState<FunnelEventCatalogItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: DROPZONE_ID });

  const selectedNames = useMemo(() => new Set(steps.map((s) => s.eventName)), [steps]);
  const available = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalog.filter(
      (event) =>
        !selectedNames.has(event.eventName) &&
        (term === '' ||
          event.label.toLowerCase().includes(term) ||
          event.eventName.toLowerCase().includes(term)),
    );
  }, [catalog, search, selectedNames]);

  function addStep(event: FunnelEventCatalogItem) {
    setSteps((prev) => (prev.some((s) => s.eventName === event.eventName) ? prev : [...prev, event]));
  }

  function removeStep(eventName: string) {
    setSteps((prev) => prev.filter((s) => s.eventName !== eventName));
  }

  function reset() {
    setName('');
    setSearch('');
    setSteps([]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!canSave) return;
    onSave(name.trim(), steps);
    reset();
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { event?: FunnelEventCatalogItem } | undefined;
    setActiveEvent(data?.event ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveEvent(null);
    const { active, over } = event;
    if (!over) return;

    const activeType = (active.data.current as { type?: string } | undefined)?.type;

    // Dragging an available event into the funnel queue.
    if (activeType === 'available') {
      const dragged = (active.data.current as { event: FunnelEventCatalogItem }).event;
      addStep(dragged);
      return;
    }

    // Reordering existing steps.
    if (activeType === 'step' && active.id !== over.id && over.id !== DROPZONE_ID) {
      setSteps((prev) => {
        const oldIndex = prev.findIndex((s) => s.eventName === active.id);
        const newIndex = prev.findIndex((s) => s.eventName === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  const canSave = name.trim().length > 0 && steps.length >= 2;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close funnel builder"
        onClick={handleClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#e6eaf2] bg-white shadow-2xl dark:border-slate-700 dark:bg-[#0f1729]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#e6eaf2] px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#f1ecff] text-[#6246ea] dark:bg-violet-500/10 dark:text-violet-300">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#111827] dark:text-slate-100">Create New Funnel</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Drag events into the funnel, reorder the steps, then save.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Funnel name */}
        <div className="border-b border-[#e6eaf2] px-5 py-3 dark:border-slate-700">
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Funnel name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Challan Payment Funnel"
            className="w-full rounded-lg border border-[#e6eaf2] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#6246ea] focus:ring-1 focus:ring-[#6246ea] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100"
          />
        </div>

        {/* Body: two columns inside one DndContext */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden md:grid-cols-2">
            {/* Available events */}
            <div className="flex min-h-0 flex-col border-b border-[#e6eaf2] md:border-b-0 md:border-r dark:border-slate-700">
              <div className="px-5 pb-2 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Available events{!loading ? ` (${catalog.length})` : ''}
                  </p>
                  {loading ? (
                    <span className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Loader2 className="size-3 animate-spin" /> loading…
                    </span>
                  ) : (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isLive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}
                    >
                      {isLive ? 'live' : 'sample'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search events..."
                    className="w-full rounded-lg border border-[#e6eaf2] bg-white py-1.5 pl-8 pr-3 text-xs text-[#111827] outline-none focus:border-[#6246ea] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="min-h-[240px] flex-1 space-y-1.5 overflow-y-auto px-5 pb-4">
                {available.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400">No matching events.</p>
                ) : (
                  available.map((event) => (
                    <AvailableEventRow key={event.eventName} event={event} onAdd={() => addStep(event)} />
                  ))
                )}
              </div>
            </div>

            {/* Funnel queue (drop zone) */}
            <div className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between px-5 pb-2 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  Funnel steps
                </p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {steps.length} step{steps.length === 1 ? '' : 's'}
                </span>
              </div>
              <div
                ref={setDropRef}
                className={`m-5 mt-0 min-h-[240px] flex-1 space-y-1.5 overflow-y-auto rounded-lg border-2 border-dashed p-2.5 transition ${
                  isOver
                    ? 'border-[#6246ea] bg-[#f1ecff]/50 dark:border-violet-400 dark:bg-violet-500/5'
                    : 'border-[#e6eaf2] dark:border-slate-700'
                }`}
              >
                {steps.length === 0 ? (
                  <div className="grid h-full min-h-[200px] place-items-center text-center">
                    <p className="px-6 text-xs text-slate-400 dark:text-slate-500">
                      Drag events here (or click <Plus className="inline size-3" />) to build your funnel. Order
                      defines the conversion sequence.
                    </p>
                  </div>
                ) : (
                  <SortableContext items={steps.map((s) => s.eventName)} strategy={verticalListSortingStrategy}>
                    {steps.map((event, index) => (
                      <FunnelStepRow
                        key={event.eventName}
                        event={event}
                        index={index}
                        onRemove={() => removeStep(event.eventName)}
                      />
                    ))}
                  </SortableContext>
                )}
              </div>
            </div>
          </div>

          <DragOverlay>
            {activeEvent ? (
              <div className="flex items-center gap-2 rounded-lg border border-[#6246ea] bg-white px-3 py-2 shadow-xl dark:bg-[#111827]">
                <GripVertical className="size-4 text-[#6246ea]" />
                <span className="text-xs font-semibold text-[#111827] dark:text-slate-100">{activeEvent.label}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#e6eaf2] px-5 py-3 dark:border-slate-700">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {canSave ? 'Ready to save.' : 'Add a name and at least 2 steps.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-[#e6eaf2] px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-lg bg-[#6246ea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#523bd4] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save funnel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
