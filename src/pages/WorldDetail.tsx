import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Trash2, Download } from 'lucide-react';
import useStore from '../store/useStore';
import useSavedStatus from '../hooks/useSavedStatus';
import type { Genre, World } from '../types';
import { API_BASE } from '../api';

const GENRES: Genre[] = [
  'dark-fantasy',
  'high-fantasy',
  'science-fiction',
  'mythology',
  'horror',
  'steampunk',
  'post-apocalyptic',
  'custom',
];

const TAB_IDS = [
  'overview',
  'history',
  'geography',
  'cultures',
  'religion',
  'magic',
  'technology',
  'notes',
] as const;

type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<TabId, string> = {
  overview: 'Overview',
  history: 'History',
  geography: 'Geography',
  cultures: 'Cultures',
  religion: 'Religion',
  magic: 'Magic System',
  technology: 'Technology',
  notes: 'Notes',
};

function formatGenreOption(genre: Genre): string {
  return genre
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function emptyDraft(): Omit<World, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: '',
    description: '',
    genre: 'custom',
    coverColor: '#252540',
    history: '',
    geography: '',
    cultures: '',
    religions: '',
    magicSystem: '',
    technology: '',
    notes: '',
  };
}

export default function WorldDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const worlds = useStore((s) => s.worlds);
  const addWorld = useStore((s) => s.addWorld);
  const updateWorld = useStore((s) => s.updateWorld);
  const deleteWorld = useStore((s) => s.deleteWorld);
  const setActiveWorld = useStore((s) => s.setActiveWorld);

  const isNew = !id;
  const existing = useMemo(
    () => (id ? worlds.find((w) => w.id === id) : undefined),
    [worlds, id],
  );

  const [tab, setTab] = useState<TabId>('overview');
  const [draft, setDraft] = useState<Omit<World, 'id' | 'createdAt' | 'updatedAt'>>(
    () => emptyDraft(),
  );
  const { savedStatus, markSaved, resetSaved } = useSavedStatus(1200);

  useEffect(() => {
    if (isNew) {
      setDraft(emptyDraft());
      setTab('overview');
      return;
    }
    if (existing) {
      setDraft({
        name: existing.name,
        description: existing.description,
        genre: existing.genre,
        coverColor: existing.coverColor,
        history: existing.history,
        geography: existing.geography,
        cultures: existing.cultures,
        religions: existing.religions,
        magicSystem: existing.magicSystem,
        technology: existing.technology,
        notes: existing.notes,
      });
      setActiveWorld(existing.id);
    }
  }, [isNew, existing, id, setActiveWorld]);

  const updateField = useCallback(
    <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
      setDraft((d) => ({ ...d, [key]: value }));
      resetSaved();
    },
    [],
  );

  const handleSave = () => {
    if (isNew) {
      const created = addWorld(draft);
      setActiveWorld(created.id);
      navigate('/worlds');
      return;
    }
    if (id) {
      updateWorld(id, draft);
      markSaved();
      navigate('/worlds');
    }
  };

  const handleDelete = () => {
    if (!id || !existing) return;
    if (
      window.confirm(
        `Delete “${existing.name || 'this world'}”? This cannot be undone.`,
      )
    ) {
      deleteWorld(id);
      navigate('/worlds');
    }
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/api/export/world/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const name = `${(existing?.name || 'world').trim().replace(/[<>:"/\\\\|?*\\u0000-\\u001F]/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 80) || 'world'}.wurld`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      window.alert('Could not export this world. Make sure the data server is running.');
      // eslint-disable-next-line no-console
      console.error(e);
    }
  };

  if (!isNew && id && !existing) {
    return (
      <div>
        <header className="page-header">
          <h1 className="page-title">World not found</h1>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/worlds')}
          >
            Back to worlds
          </button>
        </header>
        <p className="text-mist">This world may have been removed.</p>
      </div>
    );
  }

  return (
    <div>
      <header className="page-header flex-wrap gap-4">
        <h1 className="page-title">
          {isNew ? 'New world' : existing?.name || 'Edit world'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleExport}
            >
              <Download className="h-4 w-4" aria-hidden />
              Export
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              className="btn-danger"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Delete
            </button>
          )}
          <button
            type="button"
            className={savedStatus === 'saved' ? 'btn-secondary' : 'btn-primary'}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" aria-hidden />
            {savedStatus === 'saved' ? 'Saved' : 'Save'}
          </button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-dusk">
        {TAB_IDS.map((tid) => (
          <button
            key={tid}
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === tid ? 'tab-active' : 'tab-inactive border-b-2 border-transparent'
            }`}
            onClick={() => setTab(tid)}
          >
            {TAB_LABELS[tid]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <section className="card max-w-2xl space-y-4">
          <h2 className="section-title">Overview</h2>
          <div>
            <label className="label" htmlFor="world-name">
              Name
            </label>
            <input
              id="world-name"
              className="input"
              value={draft.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Realm name"
            />
          </div>
          <div>
            <label className="label" htmlFor="world-desc">
              Description
            </label>
            <textarea
              id="world-desc"
              className="textarea min-h-[120px]"
              value={draft.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="High-level pitch, tone, and what makes this setting yours."
            />
          </div>
          <div>
            <label className="label" htmlFor="world-genre">
              Genre
            </label>
            <select
              id="world-genre"
              className="select"
              value={draft.genre}
              onChange={(e) =>
                updateField('genre', e.target.value as Genre)
              }
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {formatGenreOption(g)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="world-cover">
              Cover color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="world-cover"
                type="color"
                className="h-10 w-14 cursor-pointer rounded border border-dusk bg-shadow"
                value={draft.coverColor}
                onChange={(e) => updateField('coverColor', e.target.value)}
              />
              <span className="text-sm text-mist">{draft.coverColor}</span>
            </div>
          </div>
        </section>
      )}

      {tab === 'history' && (
        <section className="card">
          <h2 className="section-title">History</h2>
          <label className="label" htmlFor="world-history">
            Timeline, ages, and major events
          </label>
          <textarea
            id="world-history"
            className="textarea min-h-[320px]"
            value={draft.history}
            onChange={(e) => updateField('history', e.target.value)}
            placeholder="Write the past of your world…"
          />
        </section>
      )}

      {tab === 'geography' && (
        <section className="card">
          <h2 className="section-title">Geography</h2>
          <label className="label" htmlFor="world-geo">
            Regions, climate, landmarks
          </label>
          <textarea
            id="world-geo"
            className="textarea min-h-[320px]"
            value={draft.geography}
            onChange={(e) => updateField('geography', e.target.value)}
            placeholder="Maps, biomes, and how the land shapes stories…"
          />
        </section>
      )}

      {tab === 'cultures' && (
        <section className="card">
          <h2 className="section-title">Cultures</h2>
          <label className="label" htmlFor="world-cultures">
            Peoples, customs, languages
          </label>
          <textarea
            id="world-cultures"
            className="textarea min-h-[320px]"
            value={draft.cultures}
            onChange={(e) => updateField('cultures', e.target.value)}
            placeholder="Societies, traditions, and daily life…"
          />
        </section>
      )}

      {tab === 'religion' && (
        <section className="card">
          <h2 className="section-title">Religion</h2>
          <label className="label" htmlFor="world-religions">
            Faiths, gods, and cosmology
          </label>
          <textarea
            id="world-religions"
            className="textarea min-h-[320px]"
            value={draft.religions}
            onChange={(e) => updateField('religions', e.target.value)}
            placeholder="Beliefs, rituals, and divine influence…"
          />
        </section>
      )}

      {tab === 'magic' && (
        <section className="card">
          <h2 className="section-title">Magic System</h2>
          <label className="label" htmlFor="world-magic">
            Rules, costs, and sources of power
          </label>
          <textarea
            id="world-magic"
            className="textarea min-h-[320px]"
            value={draft.magicSystem}
            onChange={(e) => updateField('magicSystem', e.target.value)}
            placeholder="How magic works and what it cannot do…"
          />
        </section>
      )}

      {tab === 'technology' && (
        <section className="card">
          <h2 className="section-title">Technology</h2>
          <label className="label" htmlFor="world-tech">
            Inventions, industry, and knowledge level
          </label>
          <textarea
            id="world-tech"
            className="textarea min-h-[320px]"
            value={draft.technology}
            onChange={(e) => updateField('technology', e.target.value)}
            placeholder="From bronze to void-ships—what exists here…"
          />
        </section>
      )}

      {tab === 'notes' && (
        <section className="card">
          <h2 className="section-title">Notes</h2>
          <label className="label" htmlFor="world-notes">
            Scratchpad and loose ideas
          </label>
          <textarea
            id="world-notes"
            className="textarea min-h-[320px]"
            value={draft.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Anything else you want to remember…"
          />
        </section>
      )}
    </div>
  );
}
