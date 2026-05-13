import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Plus, Search, Trash2, Feather, Sparkles } from 'lucide-react';
import useStore from '../store/useStore';
import { BESTIARY, SOURCE_LABELS } from '../data/bestiary';
import type { Creature, FieldGuideEntry } from '../types';
import ImageUpload from '../components/ImageUpload';

function now() {
  return new Date().toISOString();
}

function clampText(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

function toTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function FieldGuide() {
  const activeWorldId = useStore((s) => s.activeWorldId);
  const worlds = useStore((s) => s.worlds);
  const updateWorld = useStore((s) => s.updateWorld);
  const customCreatures = useStore((s) => s.customCreatures);
  const fieldGuideEntries = useStore((s) => s.fieldGuideEntries);
  const addFieldGuideEntry = useStore((s) => s.addFieldGuideEntry);
  const updateFieldGuideEntry = useStore((s) => s.updateFieldGuideEntry);
  const deleteFieldGuideEntry = useStore((s) => s.deleteFieldGuideEntry);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [isTurning, setIsTurning] = useState(false);
  const turnTimerRef = useRef<number | null>(null);
  const [search, setSearch] = useState('');
  const [addCreatureId, setAddCreatureId] = useState('');

  const worldName = useMemo(() => {
    if (!activeWorldId) return '';
    return worlds.find((w) => w.id === activeWorldId)?.name ?? '';
  }, [activeWorldId, worlds]);

  const activeWorld = useMemo(() => {
    if (!activeWorldId) return null;
    return worlds.find((w) => w.id === activeWorldId) ?? null;
  }, [activeWorldId, worlds]);

  const allCreatures = useMemo((): Creature[] => {
    const fromCode = BESTIARY as Creature[];
    return [...fromCode, ...customCreatures];
  }, [customCreatures]);

  const entries = useMemo(() => {
    const list = activeWorldId
      ? fieldGuideEntries.filter((e) => e.worldId === activeWorldId)
      : fieldGuideEntries;
    const q = search.trim().toLowerCase();
    if (!q) return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list
      .filter((e) => {
        const hay = `${e.name}\n${e.type}\n${e.rarity}\n${e.habitat}\n${e.threat}\n${e.tags.join(' ')}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [fieldGuideEntries, activeWorldId, search]);

  const displayed = useMemo(
    () => entries.find((e) => e.id === displayedId) ?? null,
    [entries, displayedId],
  );

  const creatureById = useMemo(() => {
    const m = new Map<string, Creature>();
    for (const c of allCreatures) m.set(c.id, c);
    return m;
  }, [allCreatures]);

  const addFromCreature = () => {
    if (!activeWorldId) return;
    const creature = creatureById.get(addCreatureId);
    if (!creature) return;
    const existing = fieldGuideEntries.find(
      (e) => e.worldId === activeWorldId && e.creatureId && e.creatureId === creature.id,
    );
    if (existing) {
      setSelectedId(existing.id);
      setDisplayedId(existing.id);
      return;
    }
    const entry = addFieldGuideEntry({
      worldId: activeWorldId,
      creatureId: creature.id,
      imageUrl: '',
      name: creature.name,
      type: creature.type || 'Creature',
      rarity: creature.source ? SOURCE_LABELS[creature.source] ?? 'Known' : 'Known',
      description: creature.description || '',
      lore: creature.lore || '',
      habitat: creature.habitat || '',
      threat: creature.challengeRating ? `CR ${creature.challengeRating}` : '',
      tags: [],
    });
    setSelectedId(entry.id);
    setDisplayedId(entry.id);
    setAddCreatureId('');
  };

  const createNew = () => {
    if (!activeWorldId) return;
    const entry = addFieldGuideEntry({
      worldId: activeWorldId,
      imageUrl: '',
      name: 'Unnamed entry',
      type: 'Creature',
      rarity: 'Unknown',
      description: '',
      lore: '',
      habitat: '',
      threat: '',
      tags: [],
    });
    setSelectedId(entry.id);
    setDisplayedId(entry.id);
  };

  const patch = (p: Partial<Omit<FieldGuideEntry, 'id' | 'worldId' | 'createdAt' | 'updatedAt'>>) => {
    if (!displayed) return;
    updateFieldGuideEntry(displayed.id, p);
  };

  const turnTo = (id: string) => {
    if (id === selectedId && id === displayedId) return;
    setSelectedId(id);
    if (displayedId === null) {
      setDisplayedId(id);
      return;
    }
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current);
    setIsTurning(true);
    // Swap the content mid-flip so it feels like a page turn.
    turnTimerRef.current = window.setTimeout(() => {
      setDisplayedId(id);
    }, 210);
    window.setTimeout(() => setIsTurning(false), 460);
  };

  // Start on the cover whenever you switch worlds.
  useEffect(() => {
    setSelectedId(null);
    setDisplayedId(null);
    setIsTurning(false);
    if (turnTimerRef.current) window.clearTimeout(turnTimerRef.current);
  }, [activeWorldId]);

  if (!activeWorldId) {
    return (
      <div className="card border-dashed border-dusk/80 bg-shadow/40 p-12 text-center">
        <BookOpen className="mx-auto mb-4 h-12 w-12 text-mist/40" />
        <h2 className="mb-2 font-[Cinzel] text-xl font-semibold text-moonlight">Select a world</h2>
        <p className="text-mist">Choose a world from the sidebar to open its Field Guide.</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl" aria-hidden>
        <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-blood/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <Feather className="h-4 w-4 text-gold" aria-hidden />
            Bestiary
          </p>
          <h1 className="page-title flex items-center gap-3 font-[Cinzel]">
            <BookOpen className="h-7 w-7 text-gold" aria-hidden />
            Field Guide
          </h1>
          <p className="mt-2 text-sm text-mist">
            Old-world reference notes for <span className="text-silver">{worldName || 'this world'}</span>
          </p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={createNew}>
          <Plus size={18} />
          New entry
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* Left: index */}
        <aside className="card border-dusk/70 bg-shadow/30 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-mist" aria-hidden />
            <input
              className="input h-9 flex-1"
              placeholder="Search entries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="mb-4 rounded-lg border border-dusk/70 bg-abyss/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mist">
              <Sparkles className="h-4 w-4 text-arcane/80" aria-hidden />
              Add from Bestiary
            </div>
            <div className="flex gap-2">
              <select
                className="select h-9 flex-1 text-sm"
                value={addCreatureId}
                onChange={(e) => setAddCreatureId(e.target.value)}
              >
                <option value="">Select a creature…</option>
                {allCreatures
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.source ? ` — ${SOURCE_LABELS[c.source] ?? c.source}` : ''}
                    </option>
                  ))}
              </select>
              <button type="button" className="btn-secondary h-9 px-3" onClick={addFromCreature} disabled={!addCreatureId}>
                Add
              </button>
            </div>
          </div>

          <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {entries.length === 0 ? (
              <div className="rounded-lg border border-dusk/70 bg-abyss/50 p-4 text-sm text-mist">
                No Field Guide entries yet. Add from the Bestiary or create a new entry.
              </div>
            ) : (
              <ul className="space-y-2">
                {entries.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => turnTo(e.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        selectedId === e.id
                          ? 'border-gold/50 bg-gold/10'
                          : 'border-dusk/70 bg-abyss/50 hover:bg-abyss/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-[Cinzel] text-sm font-semibold text-moonlight">
                            {e.name || 'Untitled'}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-mist">
                            {e.type || 'Creature'} · {e.rarity || 'Unknown'}
                          </div>
                        </div>
                        {e.threat?.trim() ? (
                          <span className="badge-gold shrink-0 text-[0.65rem]">{e.threat.trim()}</span>
                        ) : null}
                      </div>
                      {e.description?.trim() ? (
                        <div className="mt-2 text-xs text-silver/90">{clampText(e.description, 110)}</div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right: book */}
        <section
          className="relative overflow-hidden rounded-xl border border-dusk/70 shadow-lg shadow-black/30"
          style={{
            background:
              'linear-gradient(90deg, rgba(22,18,12,0.95) 0%, rgba(34,28,18,0.94) 8%, rgba(60,50,32,0.92) 50%, rgba(34,28,18,0.94) 92%, rgba(22,18,12,0.95) 100%)',
          }}
        >
          <style>{`
            .fg-book { perspective: 1200px; }
            .fg-turner {
              position: absolute;
              inset: 0;
              pointer-events: none;
              transform-style: preserve-3d;
              transform-origin: 50% 50%;
            }
            .fg-sheet {
              position: absolute;
              top: 0;
              bottom: 0;
              left: 50%;
              width: 50%;
              transform-origin: left center;
              border-left: 1px solid rgba(0,0,0,0.35);
              border-top-right-radius: 12px;
              border-bottom-right-radius: 12px;
              background:
                linear-gradient(90deg,
                  rgba(255,255,255,0.10) 0%,
                  rgba(255,235,200,0.08) 10%,
                  rgba(0,0,0,0.06) 55%,
                  rgba(0,0,0,0.24) 100%
                );
              box-shadow:
                -18px 0 28px rgba(0,0,0,0.25),
                0 0 0 1px rgba(0,0,0,0.15) inset;
              transform: rotateY(0deg);
              opacity: 0;
            }
            .fg-turning .fg-sheet {
              opacity: 1;
              animation: fgFlip 460ms cubic-bezier(.2,.8,.2,1) both;
            }
            @keyframes fgFlip {
              0% { transform: rotateY(0deg); filter: brightness(1); }
              45% { filter: brightness(0.92); }
              100% { transform: rotateY(-180deg); filter: brightness(1); }
            }
          `}</style>

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            aria-hidden
            style={{
              background:
                'radial-gradient(ellipse at 20% 30%, rgba(255,215,130,0.18), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.10), transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.08), transparent 25%, rgba(0,0,0,0.25) 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] opacity-60"
            aria-hidden
            style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.55), transparent)' }}
          />

          <div className={`fg-book relative grid gap-0 md:grid-cols-2 ${isTurning ? 'fg-turning' : ''}`}>
            {/* Visual page-turn overlay */}
            <div className="fg-turner" aria-hidden>
              <div className="fg-sheet" />
            </div>
            {/* Left page */}
            <div className="p-6 md:p-8">
              {!displayed ? (
                <div className="rounded-lg border border-dusk/60 bg-black/15 p-6 text-mist">
                  <div className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-gold/80">
                    Field Guide
                  </div>
                  <div className="font-[Cinzel] text-4xl font-bold text-moonlight tracking-wide">
                    {worldName || 'Untitled world'}
                  </div>
                  <div className="mt-3 text-sm text-mist/90">
                    A personal reference ledger of the creatures and oddities of these lands.
                  </div>
                  <div className="mt-6">
                    <ImageUpload
                      imageUrl={activeWorld?.fieldGuideCoverImageUrl ?? ''}
                      onImageChange={(url) => {
                        if (!activeWorldId) return;
                        updateWorld(activeWorldId, { fieldGuideCoverImageUrl: url });
                      }}
                      size="lg"
                      shape="square"
                      label="Upload cover"
                      fallbackColor="#1a1a2e"
                    />
                    <p className="mt-2 text-xs text-mist/80 text-center">Cover image (optional)</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.25em] text-gold/80">
                      {displayed.rarity || 'Unknown'} · {displayed.type || 'Creature'}
                    </div>
                    <input
                      className="mt-2 w-full bg-transparent font-[Cinzel] text-3xl font-bold tracking-wide text-moonlight outline-none"
                      value={displayed.name}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {displayed.creatureId ? (
                        <span className="inline-flex items-center rounded-full border border-gold/25 bg-gold/10 px-2.5 py-0.5 text-xs text-gold/90">
                          Linked to Bestiary
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-arcane/25 bg-arcane/10 px-2.5 py-0.5 text-xs text-arcane/90">
                          Custom entry
                        </span>
                      )}
                      {displayed.tags.slice(0, 4).map((t) => (
                        <span key={t} className="badge-frost text-[0.65rem]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-dusk/60 bg-black/10 p-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-mist">Entry image</div>
                      <div className="flex items-start gap-4">
                        <ImageUpload
                          imageUrl={displayed.imageUrl}
                          onImageChange={(url) => patch({ imageUrl: url })}
                          size="md"
                          shape="square"
                          label="Upload entry image"
                          fallbackColor="#1a1a2e"
                        />
                        <p className="text-xs text-mist/80 leading-relaxed">
                          Add a sketch, illustration, or reference image for this creature entry.
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea
                        className="textarea min-h-[110px] bg-black/10"
                        placeholder="A quick overview..."
                        value={displayed.description}
                        onChange={(e) => patch({ description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Lore & notes</label>
                      <textarea
                        className="textarea min-h-[180px] bg-black/10"
                        placeholder="Field notes, sketches, warnings, folktales..."
                        value={displayed.lore}
                        onChange={(e) => patch({ lore: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right page */}
            <div className="p-6 md:p-8">
              {displayed ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Type</label>
                      <input
                        className="input bg-black/10"
                        value={displayed.type}
                        onChange={(e) => patch({ type: e.target.value })}
                        placeholder="Beast, Spirit, Humanoid..."
                      />
                    </div>
                    <div>
                      <label className="label">Rarity</label>
                      <input
                        className="input bg-black/10"
                        value={displayed.rarity}
                        onChange={(e) => patch({ rarity: e.target.value })}
                        placeholder="Common, Rare, Extinct..."
                      />
                    </div>
                    <div>
                      <label className="label">Habitat</label>
                      <input
                        className="input bg-black/10"
                        value={displayed.habitat}
                        onChange={(e) => patch({ habitat: e.target.value })}
                        placeholder="Swamps, ruins, deep forest..."
                      />
                    </div>
                    <div>
                      <label className="label">Threat</label>
                      <input
                        className="input bg-black/10"
                        value={displayed.threat}
                        onChange={(e) => patch({ threat: e.target.value })}
                        placeholder="Low, Deadly, CR 5..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Tags (comma-separated)</label>
                    <input
                      className="input bg-black/10"
                      value={displayed.tags.join(', ')}
                      onChange={(e) => patch({ tags: toTags(e.target.value) })}
                      placeholder="nocturnal, venomous, ancient..."
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-dusk/60 pt-4">
                    <div className="text-xs text-mist/80">
                      Updated {new Date(displayed.updatedAt || displayed.createdAt || now()).toLocaleString()}
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        deleteFieldGuideEntry(displayed.id);
                        setSelectedId(null);
                        setDisplayedId(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete entry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dusk/60 bg-black/15 p-6 text-mist">
                  <div className="font-[Cinzel] text-xl font-semibold text-moonlight mb-2">Cover</div>
                  {entries.length > 0 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => turnTo(entries[0]!.id)}
                    >
                      <BookOpen className="h-4 w-4" />
                      Open the guide
                    </button>
                  ) : (
                    <button type="button" className="btn-primary" onClick={createNew}>
                      <Plus className="h-4 w-4" />
                      Create your first entry
                    </button>
                  )}
                  <p className="mt-3 text-sm text-mist/80">
                    Use the index on the left to jump to entries, or open the guide to begin reading.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

