import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import { BESTIARY, SOURCE_LABELS, CREATURE_TYPES } from '../data/bestiary';
import {
  Search,
  Filter,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Skull,
  Shield,
  Heart,
  Swords,
  BookOpen,
} from 'lucide-react';
import type { Creature, CreatureSource } from '../types';
import { getAbilityModifier, formatModifier } from '../types';

const SOURCE_ORDER: CreatureSource[] = [
  'srd',
  'mythology-greek',
  'mythology-norse',
  'mythology-celtic',
  'mythology-egyptian',
  'mythology-japanese',
  'lovecraftian',
  'fae',
  'folklore',
  'custom',
];

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;

function sourceBadgeClass(source: CreatureSource): string {
  switch (source) {
    case 'srd':
      return 'badge-arcane';
    case 'mythology-greek':
      return 'badge-gold';
    case 'mythology-norse':
      return 'badge-frost';
    case 'mythology-celtic':
      return 'badge-fey';
    case 'mythology-egyptian':
      return 'badge-ember';
    case 'mythology-japanese':
      return 'inline-flex items-center rounded-full border border-teal-500/35 bg-teal-950/50 px-2.5 py-0.5 text-xs font-medium text-teal-300';
    case 'lovecraftian':
      return 'inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-900/30 px-2.5 py-0.5 text-xs font-medium text-emerald-400';
    case 'fae':
      return 'badge-fey';
    case 'folklore':
      return 'inline-flex items-center rounded-full border border-amber-500/35 bg-amber-950/40 px-2.5 py-0.5 text-xs font-medium text-amber-400';
    case 'custom':
      return 'badge-arcane';
    default:
      return 'badge-arcane';
  }
}

function splitBlockText(text: string): string[] {
  return text
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const ABILITIES = [
  { key: 'strength' as const, label: 'STR' },
  { key: 'dexterity' as const, label: 'DEX' },
  { key: 'constitution' as const, label: 'CON' },
  { key: 'intelligence' as const, label: 'INT' },
  { key: 'wisdom' as const, label: 'WIS' },
  { key: 'charisma' as const, label: 'CHA' },
];

function StatBlockModal({
  creature,
  onClose,
}: {
  creature: Creature;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const abilityParas = splitBlockText(creature.abilities);
  const actionParas = splitBlockText(creature.actions);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bestiary-detail-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/85 backdrop-blur-sm"
        aria-label="Close detail"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-dusk/90 bg-gradient-to-b from-shadow via-abyss to-void shadow-2xl shadow-arcane/20 ring-1 ring-mystic/10">
        <div className="flex items-start justify-between gap-4 border-b border-blood/20 bg-gradient-to-r from-blood/15 via-arcane/10 to-transparent px-5 py-4">
          <div className="min-w-0">
            <h2
              id="bestiary-detail-title"
              className="font-[Cinzel] text-2xl font-bold tracking-wide text-moonlight md:text-3xl"
            >
              {creature.name}
            </h2>
            <p className="mt-1 text-sm italic text-mist">
              {creature.size} {creature.type.toLowerCase()}, {creature.alignment}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-mist transition hover:bg-dusk/80 hover:text-moonlight"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="border-l-4 border-arcane/60 bg-black/25 p-4 shadow-inner">
            <div className="grid gap-3 border-b border-dusk/80 pb-3 font-[Cinzel] text-sm text-silver">
              <div className="flex flex-wrap items-center gap-2">
                <Shield className="h-4 w-4 shrink-0 text-frost" aria-hidden />
                <span className="font-semibold text-moonlight">Armor Class</span>
                <span className="tabular-nums">{creature.armorClass}</span>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-blood/90" aria-hidden />
                <span className="font-semibold text-moonlight">Hit Points</span>
                <span>{creature.hitPoints}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Swords className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                <span className="font-semibold text-moonlight">Speed</span>
                <span>{creature.speed}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {ABILITIES.map(({ key, label }) => {
                const score = creature[key];
                const mod = getAbilityModifier(score);
                return (
                  <div
                    key={key}
                    className="stat-box min-w-0 border-dusk/80 bg-abyss/60 py-2.5"
                  >
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-mist">
                      {label}
                    </span>
                    <span className="font-[Cinzel] text-lg font-bold tabular-nums text-moonlight">
                      {score}
                    </span>
                    <span className="text-sm tabular-nums text-fey">{formatModifier(mod)}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-dusk/80 pt-3">
              <p className="font-[Cinzel] text-sm text-moonlight">
                <span className="text-mist">Challenge </span>
                <span className="font-semibold text-ember">{creature.challengeRating}</span>
              </p>
            </div>
          </div>

          <section className="mt-6">
            <h3 className="section-title flex items-center gap-2 border-b border-dusk/60 pb-2 font-[Cinzel] text-lg">
              <Skull className="h-5 w-5 text-mystic" aria-hidden />
              Abilities
            </h3>
            <div className="prose-dark space-y-3 text-sm">
              {abilityParas.map((para, i) => (
                <p key={i} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="section-title flex items-center gap-2 border-b border-dusk/60 pb-2 font-[Cinzel] text-lg">
              <Swords className="h-5 w-5 text-blood/90" aria-hidden />
              Actions
            </h3>
            <div className="prose-dark space-y-3 text-sm">
              {actionParas.map((para, i) => (
                <p key={i} className="leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <h3 className="section-title font-[Cinzel] text-lg">Description</h3>
            <p className="prose-dark text-sm leading-relaxed">{creature.description}</p>
          </section>

          <section className="mt-6">
            <h3 className="section-title flex items-center gap-2 font-[Cinzel] text-lg">
              <BookOpen className="h-5 w-5 text-gold/90" aria-hidden />
              Lore
            </h3>
            <p className="prose-dark text-sm leading-relaxed">{creature.lore}</p>
          </section>

          <section className="mt-6 rounded-lg border border-fey/20 bg-fey/5 p-4">
            <h3 className="mb-2 font-[Cinzel] text-sm font-semibold uppercase tracking-wider text-fey">
              Habitat
            </h3>
            <p className="text-sm leading-relaxed text-silver">{creature.habitat}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

const emptyForm = (): Omit<Creature, 'id'> => ({
  name: '',
  source: 'custom',
  type: 'Monstrosity',
  size: 'Medium',
  alignment: 'Neutral',
  armorClass: 10,
  hitPoints: '10 (3d8 + 3)',
  speed: '30 ft.',
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  challengeRating: '1',
  abilities: 'Describe special traits and passive abilities.',
  actions: 'Describe attacks and combat actions.',
  description: '',
  lore: '',
  habitat: '',
  isCustom: true,
});

function AddCreatureModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<Creature, 'id'>) => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set =
    <K extends keyof Omit<Creature, 'id'>>(key: K) =>
    (v: Omit<Creature, 'id'>[K]) => {
      setForm((f) => ({ ...f, [key]: v }));
    };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError('');
    onSave({ ...form, name: form.name.trim(), isCustom: true, source: 'custom' });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-creature-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-void/85 backdrop-blur-sm"
        aria-label="Close form"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,860px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-dusk/90 bg-abyss shadow-2xl">
        <div className="flex items-center justify-between border-b border-dusk px-5 py-4">
          <h2 id="add-creature-title" className="font-[Cinzel] text-xl font-semibold text-moonlight">
            Add Custom Creature
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-mist hover:bg-dusk/80 hover:text-moonlight"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-blood/40 bg-blood/10 px-3 py-2 text-sm text-blood" role="alert">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-name">
                Name *
              </label>
              <input
                id="bc-name"
                className="input"
                value={form.name}
                onChange={(e) => set('name')(e.target.value)}
                placeholder="Shadow wraith, Bog lurker…"
              />
            </div>
            <div>
              <label className="label" htmlFor="bc-type">
                Type
              </label>
              <select
                id="bc-type"
                className="select"
                value={form.type}
                onChange={(e) => set('type')(e.target.value)}
              >
                {CREATURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="bc-size">
                Size
              </label>
              <select
                id="bc-size"
                className="select"
                value={form.size}
                onChange={(e) => set('size')(e.target.value)}
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-align">
                Alignment
              </label>
              <input
                id="bc-align"
                className="input"
                value={form.alignment}
                onChange={(e) => set('alignment')(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="bc-ac">
                Armor Class
              </label>
              <input
                id="bc-ac"
                type="number"
                className="input"
                value={form.armorClass}
                onChange={(e) => set('armorClass')(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label" htmlFor="bc-cr">
                Challenge Rating
              </label>
              <input
                id="bc-cr"
                className="input"
                value={form.challengeRating}
                onChange={(e) => set('challengeRating')(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-hp">
                Hit Points
              </label>
              <input
                id="bc-hp"
                className="input"
                value={form.hitPoints}
                onChange={(e) => set('hitPoints')(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-speed">
                Speed
              </label>
              <input
                id="bc-speed"
                className="input"
                value={form.speed}
                onChange={(e) => set('speed')(e.target.value)}
              />
            </div>
            {ABILITIES.map(({ key, label }) => (
              <div key={key}>
                <label className="label" htmlFor={`bc-${key}`}>
                  {label}
                </label>
                <input
                  id={`bc-${key}`}
                  type="number"
                  className="input"
                  value={form[key]}
                  onChange={(e) => set(key)(Number(e.target.value))}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-abilities">
                Abilities
              </label>
              <textarea
                id="bc-abilities"
                className="textarea min-h-[100px]"
                value={form.abilities}
                onChange={(e) => set('abilities')(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-actions">
                Actions
              </label>
              <textarea
                id="bc-actions"
                className="textarea min-h-[100px]"
                value={form.actions}
                onChange={(e) => set('actions')(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-desc">
                Description
              </label>
              <textarea
                id="bc-desc"
                className="textarea min-h-[72px]"
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-lore">
                Lore
              </label>
              <textarea
                id="bc-lore"
                className="textarea min-h-[72px]"
                value={form.lore}
                onChange={(e) => set('lore')(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="bc-habitat">
                Habitat
              </label>
              <input
                id="bc-habitat"
                className="input"
                value={form.habitat}
                onChange={(e) => set('habitat')(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-dusk pt-4">
            <button type="submit" className="btn-primary">
              <Plus size={18} />
              Save creature
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Bestiary() {
  const navigate = useNavigate();
  const customCreatures = useStore((s) => s.customCreatures);
  const addCreature = useStore((s) => s.addCreature);

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<CreatureSource | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
  const [sizeFilter, setSizeFilter] = useState<string | 'all'>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [detail, setDetail] = useState<Creature | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const allCreatures = useMemo(() => {
    const merged = [...BESTIARY, ...customCreatures];
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  }, [customCreatures]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCreatures.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (sourceFilter !== 'all' && c.source !== sourceFilter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (sizeFilter !== 'all' && c.size !== sizeFilter) return false;
      return true;
    });
  }, [allCreatures, search, sourceFilter, typeFilter, sizeFilter]);

  const handleSaveCreature = useCallback(
    (data: Omit<Creature, 'id'>) => {
      addCreature(data);
    },
    [addCreature],
  );

  return (
    <div className="relative min-h-full">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl" aria-hidden>
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-blood/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-arcane/10 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-emerald-950/20 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 lg:flex-row lg:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <Skull className="h-4 w-4 text-blood/90" aria-hidden />
            Codex Monstrorum
          </p>
          <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">Bestiary</h1>
          <p className="mt-2 max-w-2xl text-sm text-mist leading-relaxed">
            A grimoire of beasts, horrors, and legends drawn from the SRD, world myth, and your own
            nightmares.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary shrink-0" onClick={() => navigate('/field-guide')}>
            <BookOpen className="h-[18px] w-[18px]" />
            Open Field Guide
          </button>
          <button type="button" className="btn-primary shrink-0" onClick={() => setAddOpen(true)}>
            <Plus size={18} />
            Add Custom Creature
          </button>
        </div>
      </header>

      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist"
            aria-hidden
          />
          <input
            type="search"
            className="input !pl-12"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search creatures"
          />
        </div>

        <div className="card border-dusk/80 bg-shadow/30 p-0 overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-dusk/30 md:cursor-default md:px-5"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
          >
            <span className="flex items-center gap-2 font-[Cinzel] text-sm font-semibold uppercase tracking-wider text-silver">
              <Filter className="h-4 w-4 text-arcane" aria-hidden />
              Filters
            </span>
            <span className="md:hidden">
              {filtersOpen ? <ChevronUp className="h-5 w-5 text-mist" /> : <ChevronDown className="h-5 w-5 text-mist" />}
            </span>
          </button>
          <div
            className={`grid gap-4 border-t border-dusk/60 px-4 pb-4 pt-2 md:grid-cols-3 md:px-5 md:pb-5 ${filtersOpen ? '' : 'hidden md:grid'}`}
          >
            <div>
              <label className="label" htmlFor="filter-source">
                Source
              </label>
              <select
                id="filter-source"
                className="select"
                value={sourceFilter}
                onChange={(e) =>
                  setSourceFilter(e.target.value as CreatureSource | 'all')
                }
              >
                <option value="all">All sources</option>
                {SOURCE_ORDER.map((src) => (
                  <option key={src} value={src}>
                    {SOURCE_LABELS[src] ?? src}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="filter-type">
                Type
              </label>
              <select
                id="filter-type"
                className="select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as string | 'all')}
              >
                <option value="all">All types</option>
                {CREATURE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="filter-size">
                Size
              </label>
              <select
                id="filter-size"
                className="select"
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
              >
                <option value="all">All sizes</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <p className="mb-4 text-sm text-mist">
        Showing{' '}
        <span className="font-medium text-silver tabular-nums">{filtered.length}</span> of{' '}
        <span className="font-medium text-silver tabular-nums">{allCreatures.length}</span>{' '}
        creatures
      </p>

      {filtered.length === 0 ? (
        <section
          className="card relative overflow-hidden border-dashed border-mist/25 bg-gradient-to-br from-shadow/80 to-abyss p-12 text-center"
          aria-label="No creatures"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-arcane/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-dusk/60 bg-abyss/80">
              <Search className="h-8 w-8 text-mist" aria-hidden />
            </div>
            <h2 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
              No creatures match
            </h2>
            <p className="text-mist leading-relaxed">
              Try adjusting your search or filters—or add a new horror to the codex.
            </p>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setDetail(c)}
              className="card-hover group flex flex-col gap-3 border-dusk/80 bg-gradient-to-br from-shadow/50 to-abyss/90 p-5 text-left backdrop-blur-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-[Cinzel] text-xl font-semibold text-moonlight transition group-hover:text-mystic">
                  {c.name}
                </h2>
                <span className={sourceBadgeClass(c.source)}>{SOURCE_LABELS[c.source]}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-mist">
                <span className="rounded border border-dusk/80 bg-abyss/80 px-2 py-0.5 text-silver">
                  {c.type}
                </span>
                <span className="rounded border border-dusk/80 bg-abyss/80 px-2 py-0.5">{c.size}</span>
                <span className="rounded border border-dusk/80 bg-abyss/80 px-2 py-0.5 line-clamp-1">
                  {c.alignment}
                </span>
              </div>
              <p className="flex items-center gap-2 font-[Cinzel] text-sm text-ember">
                <span className="text-mist">CR</span>
                <span className="font-semibold tabular-nums">{c.challengeRating}</span>
              </p>
              <p className="line-clamp-3 text-sm leading-relaxed text-silver/90">{c.description}</p>
            </button>
          ))}
        </div>
      )}

      {detail && <StatBlockModal creature={detail} onClose={() => setDetail(null)} />}
      {addOpen && (
        <AddCreatureModal onClose={() => setAddOpen(false)} onSave={handleSaveCreature} />
      )}
    </div>
  );
}
