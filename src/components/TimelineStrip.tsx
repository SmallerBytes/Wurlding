import { useLayoutEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { Event } from '../types';

type Props = {
  events: Event[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Insert a new event at this index (0 = start of timeline). */
  onAddAtSlot: (slotIndex: number) => void;
  onMove: (eventId: string, direction: 'earlier' | 'later') => void;
};

function SegmentInsert({
  onClick,
  label,
  edge,
}: {
  onClick: () => void;
  label: string;
  edge: 'start' | 'mid' | 'end';
}) {
  const leftGrad =
    edge === 'start'
      ? 'from-transparent via-dusk/40 to-dusk/70'
      : 'from-dusk/70 via-dusk/50 to-dusk/70';
  const rightGrad =
    edge === 'end'
      ? 'from-dusk/70 via-dusk/40 to-transparent'
      : 'from-dusk/70 via-dusk/50 to-dusk/70';

  return (
    <div className="flex min-w-[2.75rem] flex-1 items-center">
      <div className={`h-[2px] flex-1 rounded-full bg-gradient-to-r ${leftGrad}`} />
      <button
        type="button"
        onClick={onClick}
        className="mx-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-mystic/40 bg-abyss/90 text-mystic shadow-[0_0_12px_rgba(139,92,246,0.2)] transition hover:border-arcane/60 hover:bg-shadow hover:text-moonlight"
        aria-label={label}
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <div className={`h-[2px] flex-1 rounded-full bg-gradient-to-r ${rightGrad}`} />
    </div>
  );
}

export default function TimelineStrip({
  events,
  selectedId,
  onSelect,
  onAddAtSlot,
  onMove,
}: Props) {
  const stripScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!selectedId || events.length === 0) return;
    if (!events.some((e) => e.id === selectedId)) return;
    const node = document.getElementById(`timeline-node-${selectedId}`);
    if (!node) return;
    const container = stripScrollRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    const nRect = node.getBoundingClientRect();
    const nodeCenter = nRect.left + nRect.width / 2;
    const viewCenter = cRect.left + cRect.width / 2;
    const delta = nodeCenter - viewCenter;
    const next = container.scrollLeft + delta;
    container.scrollTo({
      left: Math.max(0, Math.min(next, container.scrollWidth - container.clientWidth)),
      behavior: 'smooth',
    });
  }, [selectedId, events]);

  if (events.length === 0) {
    return (
      <div className="card border border-dusk/70 bg-shadow/30 px-4 py-8 backdrop-blur-sm">
        <p className="mb-4 text-center text-sm text-mist">
          Your timeline is empty. Add a point to record what happened first.
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="h-[2px] w-12 max-w-[30%] rounded-full bg-gradient-to-r from-transparent to-dusk/60" />
          <button
            type="button"
            onClick={() => onAddAtSlot(0)}
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-arcane/50 bg-mystic/15 text-moonlight shadow-[0_0_16px_rgba(139,92,246,0.25)] transition hover:border-mystic hover:bg-mystic/25"
            aria-label="Add first event on timeline"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <div className="h-[2px] w-12 max-w-[30%] rounded-full bg-gradient-to-l from-transparent to-dusk/60" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="card border border-dusk/70 bg-shadow/30 px-2 py-4 backdrop-blur-sm md:px-4"
      aria-label="Interactive timeline"
    >
      <p className="mb-3 px-2 text-xs text-mist md:text-sm">
        Points are ordered along the line (earlier → later). Use + to add between events, or arrows to
        nudge position.
      </p>
      <div ref={stripScrollRef} className="overflow-x-auto pb-1">
        <div className="flex min-w-min flex-row flex-nowrap items-end gap-0">
          <SegmentInsert
            onClick={() => onAddAtSlot(0)}
            label="Add event at start of timeline"
            edge="start"
          />

          {events.map((ev, index) => {
            const isSelected = selectedId === ev.id;
            const title = ev.name.trim() || 'Untitled event';
            return (
              <div
                key={ev.id}
                id={`timeline-node-${ev.id}`}
                className="flex min-w-0 items-end"
              >
                <div className="flex w-[7.5rem] shrink-0 flex-col items-center gap-1.5 px-0.5 sm:w-36">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded p-1 text-mist hover:bg-dusk/50 hover:text-moonlight disabled:opacity-25"
                      aria-label={`Move “${title}” earlier on timeline`}
                      disabled={index === 0}
                      onClick={() => onMove(ev.id, 'earlier')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelect(ev.id)}
                      className={`h-4 w-4 shrink-0 rounded-full border-2 transition ${
                        isSelected
                          ? 'border-mystic bg-mystic/30 shadow-[0_0_14px_rgba(167,139,250,0.45)]'
                          : 'border-arcane/70 bg-abyss shadow-[0_0_10px_rgba(139,92,246,0.28)] hover:border-mystic/80'
                      }`}
                      aria-label={`Select “${title}”`}
                      aria-pressed={isSelected}
                    />
                    <button
                      type="button"
                      className="rounded p-1 text-mist hover:bg-dusk/50 hover:text-moonlight disabled:opacity-25"
                      aria-label={`Move “${title}” later on timeline`}
                      disabled={index === events.length - 1}
                      onClick={() => onMove(ev.id, 'later')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="line-clamp-2 w-full text-center font-[Cinzel] text-[0.65rem] font-semibold uppercase leading-tight text-moonlight sm:text-xs">
                    {title}
                  </span>
                  {ev.date ? (
                    <span className="line-clamp-1 text-center text-[0.6rem] tabular-nums text-frost sm:text-[0.65rem]">
                      {ev.date}
                    </span>
                  ) : (
                    <span className="text-[0.6rem] italic text-mist sm:text-[0.65rem]">No date</span>
                  )}
                </div>

                <SegmentInsert
                  onClick={() => onAddAtSlot(index + 1)}
                  label={`Add event after “${title}”`}
                  edge={index === events.length - 1 ? 'end' : 'mid'}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
