import { useMemo, useState } from 'react';
import { Gem, Pencil, Plus, Trash2, X } from 'lucide-react';
import useStore from '../store/useStore';
import ImageUpload from '../components/ImageUpload';
import type { Item } from '../types';

const RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Very Rare',
  'Legendary',
  'Artifact',
] as const;

function rarityBadgeClass(rarity: string): string {
  switch (rarity) {
    case 'Common':
      return 'badge-frost';
    case 'Uncommon':
      return 'badge-fey';
    case 'Rare':
      return 'badge-arcane';
    case 'Very Rare':
      return 'badge-gold';
    case 'Legendary':
      return 'badge-ember';
    case 'Artifact':
      return 'badge-arcane ring-1 ring-gold/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]';
    default:
      return 'badge-frost';
  }
}

function preview(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

const emptyForm = {
  worldId: '',
  name: '',
  type: '',
  rarity: 'Common' as string,
  description: '',
  properties: '',
  notes: '',
  imageUrl: '',
};

export default function Items() {
  const {
    items,
    worlds,
    activeWorldId,
    addItem,
    updateItem,
    deleteItem,
  } = useStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    if (!activeWorldId) return items;
    return items.filter((i) => i.worldId === activeWorldId);
  }, [items, activeWorldId]);

  const worldName = (worldId: string) =>
    worlds.find((w) => w.id === worldId)?.name ?? 'Unknown world';

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      worldId: activeWorldId ?? worlds[0]?.id ?? '',
      rarity: 'Common',
    });
    setPanelOpen(true);
  };

  const openEdit = (item: Item) => {
    setEditingId(item.id);
    setForm({
      worldId: item.worldId,
      name: item.name,
      type: item.type,
      rarity: RARITIES.includes(item.rarity as (typeof RARITIES)[number])
        ? item.rarity
        : item.rarity || 'Common',
      description: item.description,
      properties: item.properties,
      notes: item.notes,
      imageUrl: item.imageUrl || '',
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
      type: form.type.trim(),
      rarity: form.rarity,
      description: form.description.trim(),
      properties: form.properties.trim(),
      notes: form.notes.trim(),
      imageUrl: form.imageUrl,
    };
    if (editingId) {
      updateItem(editingId, payload);
    } else {
      addItem(payload);
    }
    closePanel();
  };

  const handleDelete = (item: Item) => {
    if (
      window.confirm(
        `Delete “${item.name || 'this item'}”? This cannot be undone.`,
      )
    ) {
      deleteItem(item.id);
    }
  };

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-mystic/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <Gem className="h-4 w-4 text-gold" aria-hidden />
            Relics
          </p>
          <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">Items</h1>
          {activeWorldId && (
            <p className="mt-2 text-sm text-mist">
              Showing gear in{' '}
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
          New item
        </button>
      </header>

      {panelOpen && (
        <section
          className="card mb-8 border-arcane/30 bg-shadow/60 backdrop-blur-sm"
          aria-label={editingId ? 'Edit item' : 'New item'}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="section-title mb-0 font-[Cinzel]">
              {editingId ? 'Edit item' : 'New item'}
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
              <label className="label" htmlFor="item-world">
                World
              </label>
              <select
                id="item-world"
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
              <label className="label" htmlFor="item-name">
                Name
              </label>
              <input
                id="item-name"
                className="input"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Item name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="item-type">
                  Type
                </label>
                <input
                  id="item-type"
                  className="input"
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  placeholder="Weapon, armor, relic…"
                />
              </div>
              <div>
                <label className="label" htmlFor="item-rarity">
                  Rarity
                </label>
                <select
                  id="item-rarity"
                  className="select"
                  value={form.rarity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rarity: e.target.value }))
                  }
                >
                  {RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Image</label>
              <ImageUpload
                imageUrl={form.imageUrl}
                onImageChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                shape="square"
                size="sm"
                label="Item image"
              />
            </div>
            <div>
              <label className="label" htmlFor="item-desc">
                Description
              </label>
              <textarea
                id="item-desc"
                className="textarea min-h-[100px]"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Appearance, history, rumors…"
              />
            </div>
            <div>
              <label className="label" htmlFor="item-props">
                Properties
              </label>
              <textarea
                id="item-props"
                className="textarea min-h-[80px]"
                value={form.properties}
                onChange={(e) =>
                  setForm((f) => ({ ...f, properties: e.target.value }))
                }
                placeholder="Mechanical or narrative effects"
              />
            </div>
            <div>
              <label className="label" htmlFor="item-notes">
                Notes
              </label>
              <textarea
                id="item-notes"
                className="textarea min-h-[80px]"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="DM notes, attunement, charges…"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Save changes' : 'Create item'}
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
            Items are stored per world. Add a world before cataloguing treasure.
          </p>
        </section>
      ) : filtered.length === 0 ? (
        <section
          className="card relative overflow-hidden border-dashed border-gold/25 bg-gradient-to-br from-shadow/80 to-abyss p-12 text-center"
          aria-label="No items"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
              <Gem className="h-8 w-8 text-gold" aria-hidden />
            </div>
            <h2 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
              No items yet
            </h2>
            <p className="mb-8 text-mist leading-relaxed">
              {activeWorldId
                ? 'No relics for this world. Record arms, tomes, and curiosities.'
                : 'Your vault is empty. Define the objects that matter to your tale.'}
            </p>
            <button type="button" className="btn-primary mx-auto" onClick={openCreate}>
              <Plus size={18} />
              Add an item
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.id}
              className="card-hover group relative flex flex-col gap-3 border-dusk/80 bg-shadow/40 p-5 backdrop-blur-sm"
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-lg p-2 text-silver hover:bg-dusk hover:text-moonlight"
                  aria-label={`Edit ${item.name}`}
                  onClick={() => openEdit(item)}
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-blood/80 hover:bg-blood/10 hover:text-blood"
                  aria-label={`Delete ${item.name}`}
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {item.imageUrl && (
                <div className="mb-3 -mx-5 -mt-5 overflow-hidden rounded-t-lg">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" />
                </div>
              )}
              <div className="min-w-0 pr-16">
                <h2 className="font-[Cinzel] text-xl font-semibold text-moonlight">
                  {item.name || 'Unnamed item'}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {item.type ? (
                    <span className="badge-fey">{item.type}</span>
                  ) : null}
                  <span className={rarityBadgeClass(item.rarity || 'Common')}>
                    {item.rarity || 'Common'}
                  </span>
                  <span className="badge-gold text-[0.65rem]">
                    {worldName(item.worldId)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  {preview(item.description) || (
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
