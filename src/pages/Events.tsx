import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react';
import TimelineStrip from '../components/TimelineStrip';
import useStore from '../store/useStore';
import type { Event } from '../types';

const SIGNIFICANCE_LEVELS = [
  'Obscure',
  'Minor',
  'Notable',
  'Regional',
  'Major',
  'Legendary',
  'Pivotal',
  'Era-defining',
  'Mythic',
] as const;

const SIGNIFICANCE_CUSTOM = '__custom__';

const PRESET_SET = new Set<string>(SIGNIFICANCE_LEVELS);

function significanceBadgeClass(level: string): string {
  switch (level.trim()) {
    case 'Obscure':
    case 'Minor':
      return 'badge-frost';
    case 'Notable':
    case 'Regional':
      return 'badge-fey';
    case 'Major':
    case 'Legendary':
      return 'badge-arcane';
    case 'Pivotal':
      return 'badge-gold';
    case 'Era-defining':
    case 'Mythic':
      return 'badge-ember';
    default:
      return 'badge-frost';
  }
}

function preview(text: string, max = 160): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

const emptyForm = {
  worldId: '',
  name: '',
  date: '',
  description: '',
  significance: 'Notable' as string,
  notes: '',
};

export default function Events() {
  const {
    events,
    worlds,
    activeWorldId,
    addEvent,
    insertEventAt,
    moveEventOnTimeline,
    updateEvent,
    deleteEvent,
  } = useStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  /** When set, submit creates an event at this index on the timeline (active world). */
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = !activeWorldId
      ? events
      : events.filter((e) => e.worldId === activeWorldId);
    return [...list].sort((a, b) => {
      if (!activeWorldId) {
        const wc = a.worldId.localeCompare(b.worldId);
        if (wc !== 0) return wc;
      }
      const oa = a.timelineOrder ?? 0;
      const ob = b.timelineOrder ?? 0;
      if (oa !== ob) return oa - ob;
      const da = a.date.trim();
      const db = b.date.trim();
      if (!da && !db) {
        return (a.name || '').localeCompare(b.name || '', undefined, {
          sensitivity: 'base',
        });
      }
      if (!da) return 1;
      if (!db) return -1;
      const byDate = da.localeCompare(db, undefined, { numeric: true });
      if (byDate !== 0) return byDate;
      return (a.name || '').localeCompare(b.name || '', undefined, {
        sensitivity: 'base',
      });
    });
  }, [events, activeWorldId]);

  useEffect(() => {
    if (!selectedEventId) return;
    const el = document.getElementById(`event-card-${selectedEventId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  }, [selectedEventId]);

  const worldName = (worldId: string) =>
    worlds.find((w) => w.id === worldId)?.name ?? 'Unknown world';

  const openCreate = () => {
    setEditingId(null);
    setInsertAtIndex(null);
    setForm({
      ...emptyForm,
      worldId: activeWorldId ?? worlds[0]?.id ?? '',
      significance: 'Notable',
    });
    setPanelOpen(true);
  };

  const openCreateAtSlot = (slotIndex: number) => {
    setEditingId(null);
    setInsertAtIndex(slotIndex);
    setForm({
      ...emptyForm,
      worldId: activeWorldId ?? worlds[0]?.id ?? '',
      significance: 'Notable',
    });
    setPanelOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditingId(ev.id);
    setInsertAtIndex(null);
    setForm({
      worldId: ev.worldId,
      name: ev.name,
      date: ev.date,
      description: ev.description,
      significance: ev.significance.trim() || 'Notable',
      notes: ev.notes,
    });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setInsertAtIndex(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.worldId || !form.name.trim()) return;
    const payload = {
      worldId: form.worldId,
      name: form.name.trim(),
      date: form.date.trim(),
      description: form.description.trim(),
      significance: form.significance.trim() || 'Notable',
      notes: form.notes.trim(),
    };
    if (editingId) {
      updateEvent(editingId, payload);
    } else {
      const created =
        insertAtIndex !== null
          ? insertEventAt(form.worldId, insertAtIndex, payload)
          : addEvent(payload);
      if (activeWorldId && created.worldId === activeWorldId) {
        setSelectedEventId(created.id);
      }
    }
    closePanel();
  };

  const handleDelete = (ev: Event) => {
    if (
      window.confirm(
        `Delete “${ev.name || 'this event'}”? This cannot be undone.`,
      )
    ) {
      deleteEvent(ev.id);
    }
  };

  const significanceSelectValue = PRESET_SET.has(form.significance.trim())
    ? form.significance.trim()
    : SIGNIFICANCE_CUSTOM;

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-mystic/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-ember/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <CalendarClock className="h-4 w-4 text-mystic" aria-hidden />
            Chronicle
          </p>
          <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">Events</h1>
          {activeWorldId && (
            <p className="mt-2 text-sm text-mist">
              Showing history in{' '}
              <span className="text-silver">{worldName(activeWorldId)}</span>
              {' · '}
              <span className="text-mist/90">
                Order follows the timeline below (not only the date text)
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={openCreate}
          disabled={worlds.length === 0}
        >
          <Plus size={18} />
          New event
        </button>
      </header>

      {panelOpen && (
        <section
          className="card mb-8 border-arcane/30 bg-shadow/60 backdrop-blur-sm"
          aria-label={editingId ? 'Edit event' : 'New event'}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="section-title mb-0 font-[Cinzel]">
              {editingId ? 'Edit event' : 'New event'}
            </h2>
            <button
              type="button"
              className="btn-secondary shrink-0 p-2"
              onClick={closePanel}
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="evt-world">
                World
              </label>
              <select
                id="evt-world"
                className="select"
                required
                disabled={insertAtIndex !== null && !!activeWorldId}
                value={form.worldId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, worldId: e.target.value }))
                }
              >
                <option value="">Select a world…</option>
                {worlds.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="evt-name">
                Name
              </label>
              <input
                id="evt-name"
                className="input"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Short title for the event"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="evt-date">
                  Date / when
                </label>
                <input
                  id="evt-date"
                  className="input"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  placeholder="e.g. 472 KR, Third Age, 12 BF"
                />
              </div>
              <div>
                <label className="label" htmlFor="evt-sig-preset">
                  Significance
                </label>
                <select
                  id="evt-sig-preset"
                  className="select"
                  value={significanceSelectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === SIGNIFICANCE_CUSTOM) {
                      setForm((f) => ({
                        ...f,
                        significance: PRESET_SET.has(f.significance.trim()) ? '' : f.significance,
                      }));
                    } else {
                      setForm((f) => ({ ...f, significance: v }));
                    }
                  }}
                >
                  {SIGNIFICANCE_LEVELS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value={SIGNIFICANCE_CUSTOM}>Custom…</option>
                </select>
                {significanceSelectValue === SIGNIFICANCE_CUSTOM && (
                  <div className="mt-2">
                    <label className="sr-only" htmlFor="evt-sig-custom">
                      Custom significance
                    </label>
                    <input
                      id="evt-sig-custom"
                      className="input"
                      value={
                        PRESET_SET.has(form.significance.trim()) ? '' : form.significance
                      }
                      onChange={(e) =>
                        setForm((f) => ({ ...f, significance: e.target.value }))
                      }
                      placeholder="Describe significance in your own words"
                    />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="label" htmlFor="evt-desc">
                Description
              </label>
              <textarea
                id="evt-desc"
                className="textarea min-h-[120px]"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What happened, who was involved…"
              />
            </div>
            <div>
              <label className="label" htmlFor="evt-notes">
                Notes
              </label>
              <textarea
                id="evt-notes"
                className="textarea min-h-[80px]"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Foreshadowing, unreliable narrators…"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Save changes' : 'Create event'}
              </button>
              <button type="button" className="btn-secondary" onClick={closePanel}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {worlds.length === 0 ? (
        <section
          className="card border-dashed border-dusk/80 bg-shadow/40 p-12 text-center"
          aria-label="No worlds"
        >
          <h2 className="mb-2 font-[Cinzel] text-xl font-semibold text-moonlight">
            Create a world first
          </h2>
          <p className="mx-auto max-w-md text-mist leading-relaxed">
            Events are anchored to a world. Create a world, then build its
            timeline.
          </p>
        </section>
      ) : (
        <>
          {activeWorldId && (
            <section className="mb-8" aria-label="World timeline">
              <h2 className="mb-3 font-[Cinzel] text-lg font-semibold text-moonlight md:text-xl">
                Timeline
              </h2>
              <TimelineStrip
                events={filtered}
                selectedId={selectedEventId}
                onSelect={setSelectedEventId}
                onAddAtSlot={openCreateAtSlot}
                onMove={(eventId, direction) =>
                  moveEventOnTimeline(activeWorldId, eventId, direction)
                }
              />
            </section>
          )}

          {!activeWorldId && (
            <p className="mb-6 text-sm text-mist">
              Choose a world in the header to use the interactive timeline (line, points, and
              ordering). Below is the full list sorted by world, then timeline order.
            </p>
          )}

          {filtered.length === 0 && !activeWorldId ? (
            <section
              className="card relative overflow-hidden border-dashed border-mystic/25 bg-gradient-to-br from-shadow/80 to-abyss p-12 text-center"
              aria-label="No events"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-mystic/10 via-transparent to-transparent" />
              <div className="relative mx-auto max-w-md">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-mystic/30 bg-mystic/10">
                  <CalendarClock className="h-8 w-8 text-mystic" aria-hidden />
                </div>
                <h2 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
                  No events yet
                </h2>
                <p className="mb-8 text-mist leading-relaxed">
                  No historical beats logged. Shape the past that informs your present.
                </p>
                <button type="button" className="btn-primary mx-auto" onClick={openCreate}>
                  <Plus size={18} />
                  Add an event
                </button>
              </div>
            </section>
          ) : filtered.length === 0 ? null : (
            <div>
              <p className="mb-4 text-xs text-mist/90 md:text-sm">
                {activeWorldId ? (
                  <>
                    Cards follow the same order as the timeline above. The{' '}
                    <span className="text-silver">Date / when</span> field is your in-world label;
                    position on the line is what orders events.
                  </>
                ) : (
                  <>
                    Sorted by world, then timeline position, then date text. Select a world for the
                    interactive timeline.
                  </>
                )}
              </p>
              <ul className="space-y-0" aria-label="Timeline">
                {filtered.map((ev, index) => {
                  const isLast = index === filtered.length - 1;
                  return (
                    <li key={ev.id} className="flex items-stretch gap-3 md:gap-5">
                      {/* Timeline rail: never overlaps card text */}
                      <div
                        className="flex w-10 shrink-0 flex-col items-center md:w-12"
                        aria-hidden
                      >
                        <div
                          className={`w-px shrink-0 bg-dusk/55 ${index === 0 ? 'h-0' : 'h-4'}`}
                        />
                        <div className="relative z-10 flex h-4 w-4 shrink-0 rounded-full border-2 border-arcane/70 bg-abyss shadow-[0_0_10px_rgba(139,92,246,0.28)]" />
                        {!isLast && (
                          <div className="w-px flex-1 min-h-[1.5rem] bg-gradient-to-b from-dusk/60 to-dusk/25" />
                        )}
                      </div>

                      <div
                        id={`event-card-${ev.id}`}
                        className={`card-hover group relative min-w-0 flex-1 border bg-shadow/40 px-4 py-4 pr-14 backdrop-blur-sm md:px-5 md:py-5 ${
                          selectedEventId === ev.id && activeWorldId
                            ? 'border-mystic/50 ring-1 ring-mystic/30'
                            : 'border-dusk/80'
                        }`}
                      >
                        <div className="absolute right-2 top-3 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-silver hover:bg-dusk hover:text-moonlight"
                            aria-label={`Edit ${ev.name}`}
                            onClick={() => openEdit(ev)}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-2 text-blood/80 hover:bg-blood/10 hover:text-blood"
                            aria-label={`Delete ${ev.name}`}
                            onClick={() => handleDelete(ev)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3">
                          <h2 className="min-w-0 break-words font-[Cinzel] text-lg font-semibold text-moonlight sm:text-xl">
                            {ev.name || 'Untitled event'}
                          </h2>
                          {ev.date ? (
                            <span className="shrink-0 text-sm font-medium tabular-nums text-frost">
                              {ev.date}
                            </span>
                          ) : (
                            <span className="shrink-0 text-sm italic text-mist">No date</span>
                          )}
                          <span
                            className={`${significanceBadgeClass(ev.significance || 'Notable')} w-fit shrink-0`}
                          >
                            {ev.significance || 'Notable'}
                          </span>
                          {!activeWorldId && (
                            <span className="badge-gold w-fit shrink-0 text-[0.65rem]">
                              {worldName(ev.worldId)}
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-silver">
                          {preview(ev.description) || (
                            <span className="text-mist italic">No description</span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
