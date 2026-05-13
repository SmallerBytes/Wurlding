import { useMemo, useState } from 'react';
import { Flag, Pencil, Plus, Trash2, X } from 'lucide-react';
import useStore from '../store/useStore';
import type { Faction } from '../types';

function preview(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

const emptyForm = {
  worldId: '',
  name: '',
  type: '',
  description: '',
  goals: '',
  leader: '',
  notes: '',
};

export default function Factions() {
  const {
    factions,
    worlds,
    activeWorldId,
    addFaction,
    updateFaction,
    deleteFaction,
  } = useStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    if (!activeWorldId) return factions;
    return factions.filter((f) => f.worldId === activeWorldId);
  }, [factions, activeWorldId]);

  const worldName = (worldId: string) =>
    worlds.find((w) => w.id === worldId)?.name ?? 'Unknown world';

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      worldId: activeWorldId ?? worlds[0]?.id ?? '',
    });
    setPanelOpen(true);
  };

  const openEdit = (f: Faction) => {
    setEditingId(f.id);
    setForm({
      worldId: f.worldId,
      name: f.name,
      type: f.type,
      description: f.description,
      goals: f.goals,
      leader: f.leader,
      notes: f.notes,
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
      description: form.description.trim(),
      goals: form.goals.trim(),
      leader: form.leader.trim(),
      notes: form.notes.trim(),
    };
    if (editingId) {
      updateFaction(editingId, payload);
    } else {
      addFaction(payload);
    }
    closePanel();
  };

  const handleDelete = (f: Faction) => {
    if (
      window.confirm(
        `Delete “${f.name || 'this faction'}”? This cannot be undone.`,
      )
    ) {
      deleteFaction(f.id);
    }
  };

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-blood/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-fey/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <Flag className="h-4 w-4 text-ember" aria-hidden />
            Powers
          </p>
          <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">Factions</h1>
          {activeWorldId && (
            <p className="mt-2 text-sm text-mist">
              Showing groups in{' '}
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
          New faction
        </button>
      </header>

      {panelOpen && (
        <section
          className="card mb-8 border-arcane/30 bg-shadow/60 backdrop-blur-sm"
          aria-label={editingId ? 'Edit faction' : 'New faction'}
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="section-title mb-0 font-[Cinzel]">
              {editingId ? 'Edit faction' : 'New faction'}
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
              <label className="label" htmlFor="fac-world">
                World
              </label>
              <select
                id="fac-world"
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
              <label className="label" htmlFor="fac-name">
                Name
              </label>
              <input
                id="fac-name"
                className="input"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Faction name"
              />
            </div>
            <div>
              <label className="label" htmlFor="fac-type">
                Type
              </label>
              <input
                id="fac-type"
                className="input"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value }))
                }
                placeholder="Guild, empire, cult, mercenary company…"
              />
            </div>
            <div>
              <label className="label" htmlFor="fac-leader">
                Leader
              </label>
              <input
                id="fac-leader"
                className="input"
                value={form.leader}
                onChange={(e) =>
                  setForm((f) => ({ ...f, leader: e.target.value }))
                }
                placeholder="Named leader or ruling council"
              />
            </div>
            <div>
              <label className="label" htmlFor="fac-desc">
                Description
              </label>
              <textarea
                id="fac-desc"
                className="textarea min-h-[100px]"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Public face, reputation, territory…"
              />
            </div>
            <div>
              <label className="label" htmlFor="fac-goals">
                Goals
              </label>
              <textarea
                id="fac-goals"
                className="textarea min-h-[80px]"
                value={form.goals}
                onChange={(e) =>
                  setForm((f) => ({ ...f, goals: e.target.value }))
                }
                placeholder="What they want to achieve"
              />
            </div>
            <div>
              <label className="label" htmlFor="fac-notes">
                Notes
              </label>
              <textarea
                id="fac-notes"
                className="textarea min-h-[80px]"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Secrets, plot hooks…"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editingId ? 'Save changes' : 'Create faction'}
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
            Factions are tied to a world. Create a world, then chart its powers
            here.
          </p>
        </section>
      ) : filtered.length === 0 ? (
        <section
          className="card relative overflow-hidden border-dashed border-ember/25 bg-gradient-to-br from-shadow/80 to-abyss p-12 text-center"
          aria-label="No factions"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ember/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-ember/30 bg-ember/10">
              <Flag className="h-8 w-8 text-ember" aria-hidden />
            </div>
            <h2 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
              No factions yet
            </h2>
            <p className="mb-8 text-mist leading-relaxed">
              {activeWorldId
                ? 'No organizations are recorded for this world. Add guilds, crowns, and cabals.'
                : 'No factions on file. Track who holds power in your setting.'}
            </p>
            <button type="button" className="btn-primary mx-auto" onClick={openCreate}>
              <Plus size={18} />
              Add a faction
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((f) => (
            <article
              key={f.id}
              className="card-hover group relative flex flex-col gap-3 border-dusk/80 bg-shadow/40 p-5 backdrop-blur-sm"
            >
              <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  className="rounded-lg p-2 text-silver hover:bg-dusk hover:text-moonlight"
                  aria-label={`Edit ${f.name}`}
                  onClick={() => openEdit(f)}
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  className="rounded-lg p-2 text-blood/80 hover:bg-blood/10 hover:text-blood"
                  aria-label={`Delete ${f.name}`}
                  onClick={() => handleDelete(f)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="min-w-0 pr-16">
                <h2 className="font-[Cinzel] text-xl font-semibold text-moonlight">
                  {f.name || 'Unnamed faction'}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {f.type ? (
                    <span className="badge-arcane">{f.type}</span>
                  ) : (
                    <span className="badge-frost text-mist">No type</span>
                  )}
                  <span className="badge-gold text-[0.65rem]">
                    {worldName(f.worldId)}
                  </span>
                </div>
                {f.leader ? (
                  <p className="mt-2 text-sm text-silver">
                    <span className="text-mist">Leader:</span> {f.leader}
                  </p>
                ) : (
                  <p className="mt-2 text-sm italic text-mist">No leader listed</p>
                )}
                <p className="mt-3 text-sm leading-relaxed text-silver">
                  {preview(f.description) || (
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
