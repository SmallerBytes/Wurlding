import { useEffect, useMemo, useState } from 'react';
import { Expand, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import useStore from '../store/useStore';
import ImageUpload from '../components/ImageUpload';
import type { Location, LocationType } from '../types';

const LOCATION_TYPES: LocationType[] = [
  'city',
  'town',
  'village',
  'dungeon',
  'wilderness',
  'mountain',
  'ocean',
  'plane',
  'realm',
  'ruins',
  'fortress',
  'other',
];

function formatLocationType(t: LocationType): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function locationTypeBadgeClass(t: LocationType): string {
  if (['city', 'town', 'village'].includes(t)) return 'badge-frost';
  if (['dungeon', 'ruins', 'fortress'].includes(t)) return 'badge-ember';
  if (['wilderness', 'mountain', 'ocean'].includes(t)) return 'badge-fey';
  if (['plane', 'realm'].includes(t)) return 'badge-arcane';
  return 'badge-gold';
}

function preview(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

const emptyForm = {
  worldId: '',
  name: '',
  type: 'city' as LocationType,
  description: '',
  notes: '',
  imageUrl: '',
};

export default function Locations() {
  const {
    locations,
    worlds,
    activeWorldId,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewAlt, setPreviewAlt] = useState<string>('');

  useEffect(() => {
    if (!previewUrl) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewUrl(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewUrl]);

  const filtered = useMemo(() => {
    if (!activeWorldId) return locations;
    return locations.filter((l) => l.worldId === activeWorldId);
  }, [locations, activeWorldId]);

  const worldName = (worldId: string) =>
    worlds.find((w) => w.id === worldId)?.name ?? 'Unknown world';

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      worldId: activeWorldId ?? worlds[0]?.id ?? '',
      type: 'city',
    });
    setPanelOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({
      worldId: loc.worldId,
      name: loc.name,
      type: loc.type,
      description: loc.description,
      notes: loc.notes,
      imageUrl: loc.imageUrl || '',
    });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.worldId || !form.name.trim()) return;
    const payload = {
      worldId: form.worldId,
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim(),
      notes: form.notes.trim(),
      imageUrl: form.imageUrl,
    };
    if (editingId) {
      updateLocation(editingId, payload);
    } else {
      addLocation(payload);
    }
    closePanel();
  };

  const handleDelete = (loc: Location) => {
    if (
      window.confirm(
        `Delete “${loc.name || 'this location'}”? This cannot be undone.`,
      )
    ) {
      deleteLocation(loc.id);
    }
  };

  return (
    <div className="relative min-h-full">
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Location image preview"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewUrl(null);
          }}
        >
          <div className="relative w-full max-w-5xl">
            <button
              type="button"
              className="absolute -top-3 -right-3 rounded-full border border-dusk bg-abyss/90 p-2 text-moonlight shadow-lg hover:bg-shadow"
              aria-label="Close preview"
              onClick={() => setPreviewUrl(null)}
            >
              <X size={18} />
            </button>
            <img
              src={previewUrl}
              alt={previewAlt}
              className="max-h-[85vh] w-full rounded-xl border border-dusk bg-abyss object-contain shadow-2xl"
              draggable={false}
            />
            <p className="mt-2 text-center text-xs text-mist">
              Press <span className="rounded bg-abyss px-1">Esc</span> or click outside to close.
            </p>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-frost/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-arcane/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <MapPin className="h-4 w-4 text-frost" aria-hidden />
            Atlas
          </p>
          <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">Locations</h1>
          {activeWorldId && (
            <p className="mt-2 text-sm text-mist">
              Showing places in{' '}
              <span className="text-silver">{worldName(activeWorldId)}</span>
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
          New location
        </button>
      </header>

      {panelOpen && (
        <section
          className="card mb-8 border-arcane/30 bg-shadow/60 backdrop-blur-sm"
          aria-label={editingId ? 'Edit location' : 'New location'}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="section-title mb-0 font-[Cinzel]">
              {editingId ? 'Edit location' : 'New location'}
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
              <label className="label" htmlFor="loc-world">
                World
              </label>
              <select
                id="loc-world"
                className="select"
                required
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
              <label className="label" htmlFor="loc-name">
                Name
              </label>
              <input
                id="loc-name"
                className="input"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Name of the place"
              />
            </div>
            <div>
              <label className="label" htmlFor="loc-type">
                Type
              </label>
              <select
                id="loc-type"
                className="select"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as LocationType,
                  }))
                }
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {formatLocationType(t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Image</label>
              <ImageUpload
                imageUrl={form.imageUrl}
                onImageChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                shape="square"
                size="md"
                label="Location image"
              />
            </div>
            <div>
              <label className="label" htmlFor="loc-desc">
                Description
              </label>
              <textarea
                id="loc-desc"
                className="textarea min-h-[100px]"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Terrain, landmarks, atmosphere…"
              />
            </div>
            <div>
              <label className="label" htmlFor="loc-notes">
                Notes
              </label>
              <textarea
                id="loc-notes"
                className="textarea min-h-[80px]"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Private notes, hooks, secrets…"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Save changes' : 'Create location'}
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
            Locations belong to a world. Add a world from the Worlds page, then
            return here to map your realm.
          </p>
        </section>
      ) : filtered.length === 0 ? (
        <section
          className="card relative overflow-hidden border-dashed border-frost/25 bg-gradient-to-br from-shadow/80 to-abyss p-12 text-center"
          aria-label="No locations"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-frost/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-frost/30 bg-frost/10">
              <MapPin className="h-8 w-8 text-frost" aria-hidden />
            </div>
            <h2 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
              No locations yet
            </h2>
            <p className="mb-8 text-mist leading-relaxed">
              {activeWorldId
                ? 'This world has no mapped places. Add cities, wilds, and ruins to fill the map.'
                : 'Your atlas is empty. Record the places that shape your stories.'}
            </p>
            <button type="button" className="btn-primary mx-auto" onClick={openCreate}>
              <Plus size={18} />
              Add a location
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((loc) => (
            <article
              key={loc.id}
              className="card-hover group relative flex flex-col gap-3 border-dusk/80 bg-shadow/40 p-5 backdrop-blur-sm"
            >
              {loc.imageUrl && (
                <button
                  type="button"
                  className="group/image relative mb-3 -mx-5 -mt-5 overflow-hidden rounded-t-lg text-left"
                  onClick={() => {
                    setPreviewUrl(loc.imageUrl);
                    setPreviewAlt(loc.name || 'Location');
                  }}
                  aria-label={`Enlarge image for ${loc.name || 'location'}`}
                  title="Click to enlarge"
                >
                  <span
                    className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-dusk/70 bg-abyss/70 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-moonlight shadow-sm opacity-90 backdrop-blur transition group-hover/image:opacity-100"
                    aria-hidden
                  >
                    <Expand className="h-3.5 w-3.5 text-frost" />
                    Zoom
                  </span>
                  <img
                    src={loc.imageUrl}
                    alt={loc.name}
                    className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                  />
                </button>
              )}
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-[Cinzel] text-xl font-semibold text-moonlight">
                    {loc.name || 'Unnamed place'}
                  </h2>
                  <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-silver hover:bg-dusk hover:text-moonlight"
                      aria-label={`Edit ${loc.name}`}
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-blood/80 hover:bg-blood/10 hover:text-blood"
                      aria-label={`Delete ${loc.name}`}
                      onClick={() => handleDelete(loc)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={locationTypeBadgeClass(loc.type)}>
                    {formatLocationType(loc.type)}
                  </span>
                  <span className="badge-gold text-[0.65rem]">
                    {worldName(loc.worldId)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  {preview(loc.description) || (
                    <span className="text-mist italic">No description</span>
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
