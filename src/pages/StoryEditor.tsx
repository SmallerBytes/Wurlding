import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import useStore from '../store/useStore';
import ImageUpload from '../components/ImageUpload';
import type { Chapter, Episode, Scene, Story } from '../types';

const emptyChapter = (): Omit<Chapter, 'id'> => ({
  title: 'Untitled chapter',
  content: '',
  order: 0,
  notes: '',
});

const emptyEpisode = (order: number): Omit<Episode, 'id'> => ({
  title: `Episode ${order + 1}`,
  order,
  notes: '',
});

const emptyScene = (episodeId: string): Omit<Scene, 'id'> => ({
  episodeId,
  order: 0,
  title: 'Untitled scene',
  summary: '',
  notes: '',
  imageUrl: '',
});

type EditorMode = 'chapters' | 'storyboard';

export default function StoryEditor() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !routeId;

  const {
    worlds,
    stories,
    activeWorldId,
    addStory,
    updateStory,
    addChapter,
    updateChapter,
    deleteChapter,
  } = useStore();

  const existing = useMemo(
    () => (routeId ? stories.find((s) => s.id === routeId) : undefined),
    [stories, routeId],
  );

  const [title, setTitle] = useState('');
  const [worldId, setWorldId] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [genre, setGenre] = useState('');
  const [status, setStatus] = useState<Story['status']>('draft');
  const [notes, setNotes] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [mode, setMode] = useState<EditorMode>('chapters');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isNew) {
      setTitle('');
      setSynopsis('');
      setGenre('');
      setStatus('draft');
      setNotes('');
      const w =
        (activeWorldId && worlds.some((x) => x.id === activeWorldId)
          ? activeWorldId
          : worlds[0]?.id) ?? '';
      setWorldId(w);
      const first = {
        ...emptyChapter(),
        order: 0,
      };
      const cid = nanoid();
      setChapters([
        {
          id: cid,
          ...first,
        },
      ]);
      setActiveChapterId(cid);

      const eid = 'episode-1';
      setEpisodes([{ id: eid, ...emptyEpisode(0) }]);
      setActiveEpisodeId(eid);

      const sid = nanoid();
      setScenes([{ id: sid, ...emptyScene(eid), order: 0 }]);
      return;
    }

    if (!routeId) return;

    const story = useStore.getState().stories.find((s) => s.id === routeId);
    if (!story) return;

    setTitle(story.title);
    setWorldId(story.worldId);
    setSynopsis(story.synopsis);
    setGenre(story.genre);
    setStatus(story.status);
    setNotes(story.notes);
    const sorted = [...story.chapters].sort((a, b) => a.order - b.order);
    setChapters(sorted);
    setActiveChapterId(sorted[0]?.id ?? null);

    const episodeList = Array.isArray((story as unknown as { episodes?: Episode[] }).episodes)
      ? (((story as unknown as { episodes?: Episode[] }).episodes as Episode[]) ?? [])
      : [];
    const normalizedEpisodes =
      episodeList.length > 0
        ? [...episodeList].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        : [{ id: 'episode-1', ...emptyEpisode(0) }];
    setEpisodes(normalizedEpisodes);
    setActiveEpisodeId(normalizedEpisodes[0]?.id ?? 'episode-1');

    const sceneList = Array.isArray((story as unknown as { scenes?: Scene[] }).scenes)
      ? (((story as unknown as { scenes?: Scene[] }).scenes as Scene[]) ?? [])
      : [];
    const defaultEpisodeId = normalizedEpisodes[0]?.id ?? 'episode-1';
    const withEpisode = sceneList.map((s) => ({
      ...s,
      episodeId: s.episodeId ?? defaultEpisodeId,
    }));
    const sortedScenes = [...withEpisode].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setScenes(sortedScenes);
  }, [isNew, routeId, activeWorldId, worlds]);

  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const t = window.setTimeout(() => setSaveStatus('idle'), 1200);
    return () => window.clearTimeout(t);
  }, [saveStatus]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );

  const sortedEpisodes = useMemo(() => [...episodes].sort((a, b) => a.order - b.order), [episodes]);
  const sortedScenes = useMemo(() => [...scenes].sort((a, b) => a.order - b.order), [scenes]);

  const effectiveEpisodeId =
    activeEpisodeId ??
    sortedEpisodes[0]?.id ??
    'episode-1';
  const episodeScenes = useMemo(
    () => sortedScenes.filter((s) => s.episodeId === effectiveEpisodeId),
    [sortedScenes, effectiveEpisodeId],
  );

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null;

  const persistChapterPatch = useCallback(
    (chapterId: string, patch: Partial<Omit<Chapter, 'id'>>) => {
      if (isNew || !routeId) {
        setChapters((prev) =>
          prev.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
        );
        return;
      }
      updateChapter(chapterId, patch);
      setChapters((prev) =>
        prev.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)),
      );
    },
    [isNew, routeId, updateChapter],
  );

  const reorderChapters = useCallback(
    (fromIndex: number, toIndex: number) => {
      setChapters((prev) => {
        const sorted = [...prev].sort((a, b) => a.order - b.order);
        if (toIndex < 0 || toIndex >= sorted.length) return prev;
        const next = [...sorted];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        const reordered = next.map((ch, i) => ({ ...ch, order: i }));
        if (!isNew && routeId) {
          updateStory(routeId, { chapters: reordered });
        }
        return reordered;
      });
    },
    [isNew, routeId, updateStory],
  );

  const handleAddChapter = () => {
    const order = chapters.length;
    const base = { ...emptyChapter(), order };
    if (isNew || !routeId) {
      const cid = nanoid();
      setChapters((prev) => [...prev, { id: cid, ...base }]);
      setActiveChapterId(cid);
      return;
    }
    const created = addChapter(routeId, base);
    if (created) {
      setChapters((prev) => [...prev, created]);
      setActiveChapterId(created.id);
    }
  };

  const persistScenes = useCallback((next: Scene[]) => {
    // Normalize ordering *within each episode*.
    const byEpisode = new Map<string, Scene[]>();
    for (const s of next) {
      const eid = s.episodeId || effectiveEpisodeId;
      const list = byEpisode.get(eid) ?? [];
      list.push({ ...s, episodeId: eid });
      byEpisode.set(eid, list);
    }
    const normalized: Scene[] = [];
    for (const [eid, list] of byEpisode.entries()) {
      const sorted = list.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      normalized.push(...sorted.map((s, i) => ({ ...s, episodeId: eid, order: i })));
    }
    setScenes(normalized);
    if (!isNew && routeId) {
      updateStory(routeId, { scenes: normalized });
    }
  }, [isNew, routeId, updateStory, effectiveEpisodeId]);

  const handleAddScene = () => {
    const order = episodeScenes.length;
    const sid = nanoid();
    persistScenes([...scenes, { id: sid, ...emptyScene(effectiveEpisodeId), order }]);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (episodeScenes.length <= 1) {
      window.alert('A storyboard needs at least one scene.');
      return;
    }
    if (!window.confirm('Delete this scene?')) return;
    persistScenes(scenes.filter((s) => s.id !== sceneId));
  };

  const patchScene = (sceneId: string, patch: Partial<Omit<Scene, 'id'>>) => {
    persistScenes(scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)));
  };

  const reorderScenes = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= episodeScenes.length) return;
    const nextEpisode = [...episodeScenes];
    const [moved] = nextEpisode.splice(fromIndex, 1);
    nextEpisode.splice(toIndex, 0, moved);
    const remaining = scenes.filter((s) => s.episodeId !== effectiveEpisodeId);
    persistScenes([...remaining, ...nextEpisode]);
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (chapters.length <= 1) {
      window.alert('A story needs at least one chapter.');
      return;
    }
    if (!window.confirm('Delete this chapter?')) return;

    const filtered = chapters
      .filter((c) => c.id !== chapterId)
      .map((c, i) => ({ ...c, order: i }));

    if (!isNew && routeId) {
      deleteChapter(chapterId);
    }

    setChapters(filtered);
    if (activeChapterId === chapterId) {
      setActiveChapterId(filtered[0]?.id ?? null);
    }

    // Storyboard episodes are separate; deleting chapters should not impact scenes.
  };

  const persistEpisodes = useCallback((next: Episode[]) => {
    const normalized = next
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((e, i) => ({ ...e, order: i }));
    setEpisodes(normalized);
    if (!isNew && routeId) {
      updateStory(routeId, { episodes: normalized });
    }
  }, [isNew, routeId, updateStory]);

  const handleAddEpisode = () => {
    const order = episodes.length;
    const eid = nanoid();
    const ep: Episode = { id: eid, ...emptyEpisode(order) };
    persistEpisodes([...episodes, ep]);
    setActiveEpisodeId(eid);
  };

  const handleDeleteEpisode = (episodeId: string) => {
    if (episodes.length <= 1) {
      window.alert('A storyboard needs at least one episode.');
      return;
    }
    if (!window.confirm('Delete this episode and its scenes?')) return;
    const remainingEpisodes = episodes.filter((e) => e.id !== episodeId).map((e, i) => ({ ...e, order: i }));
    persistEpisodes(remainingEpisodes);
    persistScenes(scenes.filter((s) => s.episodeId !== episodeId));
    if (activeEpisodeId === episodeId) {
      setActiveEpisodeId(remainingEpisodes[0]?.id ?? null);
    }
  };

  const handleSaveStory = () => {
    if (!worldId) {
      window.alert('Select a world for this story.');
      return;
    }

    const sorted = [...chapters].sort((a, b) => a.order - b.order).map((c, i) => ({ ...c, order: i }));
    // Preserve per-episode ordering.
    const episodesSorted = [...episodes].sort((a, b) => a.order - b.order).map((e, i) => ({ ...e, order: i }));
    const scenesSorted = [...scenes].map((s) => ({
      ...s,
      episodeId: s.episodeId ?? (episodesSorted[0]?.id ?? 'episode-1'),
    }));

    if (isNew) {
      const story = addStory({
        worldId,
        title: title.trim() || 'Untitled story',
        synopsis,
        genre,
        status,
        notes,
        chapters: sorted,
        episodes: episodesSorted,
        scenes: scenesSorted,
      });
      setSaveStatus('saved');
      navigate(`/stories/${story.id}`, { replace: true });
      return;
    }

    if (routeId) {
      updateStory(routeId, {
        worldId,
        title: title.trim() || 'Untitled story',
        synopsis,
        genre,
        status,
        notes,
        chapters: sorted,
        episodes: episodesSorted,
        scenes: scenesSorted,
      });
      setSaveStatus('saved');
    }
  };

  if (!isNew && routeId && !existing) {
    return (
      <div className="card border-blood/30 bg-blood/5 p-8 text-center">
        <p className="text-mist mb-4">Story not found.</p>
        <button
          type="button"
          className="btn-secondary mx-auto"
          onClick={() => navigate('/stories')}
        >
          Back to stories
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute top-0 right-1/4 h-64 w-64 rounded-full bg-mystic/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gold/5 blur-3xl" />
      </div>

      <header className="page-header flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <BookMarked className="h-8 w-8 text-ember shrink-0" aria-hidden />
          <div>
            <h1 className="page-title font-[Cinzel] text-2xl md:text-3xl">
              {isNew ? 'New story' : 'Edit story'}
            </h1>
            <p className="text-sm text-mist mt-1">
              {worlds.length === 0
                ? 'Create a world first to attach this story.'
                : 'Shape the tale, chapter by chapter.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/stories')}
          >
            Cancel
          </button>
          <button
            type="button"
            className={saveStatus === 'saved' ? 'btn-secondary' : 'btn-primary'}
            onClick={handleSaveStory}
            disabled={worlds.length === 0}
          >
            <Save size={18} />
            {saveStatus === 'saved' ? 'Saved' : 'Save story'}
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-start">
        <aside className="card space-y-4 border-dusk/80 bg-abyss/90">
          <h2 className="section-title mb-0 font-[Cinzel] text-lg">Details</h2>

          <div>
            <label className="label" htmlFor="story-title">
              Title
            </label>
            <input
              id="story-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Working title"
            />
          </div>

          <div>
            <label className="label" htmlFor="story-world">
              World
            </label>
            <select
              id="story-world"
              className="select"
              value={worldId}
              onChange={(e) => setWorldId(e.target.value)}
              disabled={worlds.length === 0}
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
            <label className="label" htmlFor="story-synopsis">
              Synopsis
            </label>
            <textarea
              id="story-synopsis"
              className="textarea min-h-[120px]"
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="What is this story about?"
            />
          </div>

          <div>
            <label className="label" htmlFor="story-genre">
              Genre
            </label>
            <input
              id="story-genre"
              className="input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. dark fantasy, romance"
            />
          </div>

          <div>
            <label className="label" htmlFor="story-status">
              Status
            </label>
            <select
              id="story-status"
              className="select"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as Story['status'])
              }
            >
              <option value="draft">Draft</option>
              <option value="in-progress">In progress</option>
              <option value="complete">Complete</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="story-notes">
              Notes
            </label>
            <textarea
              id="story-notes"
              className="textarea min-h-[88px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Outlines, themes, reminders…"
            />
          </div>
        </aside>

        <section className="flex min-h-[min(70vh,900px)] flex-col gap-4 rounded-lg border border-dusk/80 bg-shadow/30 p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="section-title mb-0 font-[Cinzel] text-lg">
                {mode === 'chapters' ? 'Chapters' : 'Storyboard'}
              </h2>
              <div className="ml-0 flex rounded-lg border border-dusk/70 bg-abyss/60 p-1">
                <button
                  type="button"
                  className={mode === 'chapters' ? 'btn-primary px-3 py-1.5 text-sm' : 'btn-secondary px-3 py-1.5 text-sm'}
                  onClick={() => setMode('chapters')}
                >
                  Chapters
                </button>
                <button
                  type="button"
                  className={mode === 'storyboard' ? 'btn-primary px-3 py-1.5 text-sm' : 'btn-secondary px-3 py-1.5 text-sm'}
                  onClick={() => setMode('storyboard')}
                >
                  Storyboard
                </button>
              </div>
            </div>
            {mode === 'chapters' ? (
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={handleAddChapter}
              >
                <Plus size={18} />
                Add chapter
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={handleAddScene}
                >
                  <Plus size={18} />
                  Add scene
                </button>
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={handleAddEpisode}
                >
                  <Plus size={18} />
                  Add episode
                </button>
              </div>
            )}
          </div>

          {mode === 'chapters' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
            <nav
              className="flex shrink-0 flex-col gap-1 overflow-y-auto rounded-lg border border-dusk/60 bg-abyss/50 p-2 lg:w-52 xl:w-60"
              aria-label="Chapter list"
            >
              {sortedChapters.map((ch, i) => (
                    <div
                      key={ch.id}
                      className={`flex items-stretch gap-1 rounded-md border transition ${
                        activeChapterId === ch.id
                          ? 'border-arcane/50 bg-arcane/10'
                          : 'border-transparent hover:bg-shadow/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveChapterId(ch.id)}
                        className="min-w-0 flex-1 px-2 py-2 text-left text-sm text-moonlight"
                      >
                        <span className="line-clamp-2 font-medium">
                          {ch.title || 'Untitled'}
                        </span>
                      </button>
                      <div className="flex flex-col justify-center gap-0.5 border-l border-dusk/50 py-1 pr-1">
                        <button
                          type="button"
                          className="rounded p-1 text-mist hover:bg-dusk/80 hover:text-moonlight disabled:opacity-30"
                          aria-label="Move chapter up"
                          disabled={i <= 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderChapters(i, i - 1);
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-mist hover:bg-dusk/80 hover:text-moonlight disabled:opacity-30"
                          aria-label="Move chapter down"
                          disabled={i >= sortedChapters.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            reorderChapters(i, i + 1);
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
            </nav>

            <div className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg border border-dusk/50 bg-void/40 p-4">
              {activeChapter ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <label className="label" htmlFor="chapter-title">
                        Chapter title
                      </label>
                      <input
                        id="chapter-title"
                        className="input"
                        value={activeChapter.title}
                        onChange={(e) =>
                          persistChapterPatch(activeChapter.id, {
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-danger shrink-0"
                      onClick={() => handleDeleteChapter(activeChapter.id)}
                    >
                      <Trash2 size={16} />
                      Delete chapter
                    </button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <label className="label" htmlFor="chapter-content">
                      Content
                    </label>
                    <textarea
                      id="chapter-content"
                      className="textarea min-h-[400px] flex-1 font-[inherit] leading-relaxed text-moonlight"
                      value={activeChapter.content}
                      onChange={(e) =>
                        persistChapterPatch(activeChapter.id, {
                          content: e.target.value,
                        })
                      }
                      placeholder="Write freely—the page remembers."
                      spellCheck
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="chapter-notes">
                      Chapter notes
                    </label>
                    <textarea
                      id="chapter-notes"
                      className="textarea min-h-[72px]"
                      value={activeChapter.notes}
                      onChange={(e) =>
                        persistChapterPatch(activeChapter.id, {
                          notes: e.target.value,
                        })
                      }
                      placeholder="Private notes for this chapter"
                    />
                  </div>
                </>
              ) : (
                <p className="text-mist text-sm">Select a chapter to edit.</p>
              )}
            </div>
          </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-dusk/60 bg-abyss/30 p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label className="label" htmlFor="storyboard-episode">
                    Episode
                  </label>
                  <select
                    id="storyboard-episode"
                    className="select"
                    value={activeEpisodeId ?? ''}
                    onChange={(e) => setActiveEpisodeId(e.target.value)}
                  >
                    {sortedEpisodes.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.title || 'Untitled'}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-danger shrink-0"
                  onClick={() => activeEpisodeId && handleDeleteEpisode(activeEpisodeId)}
                  disabled={!activeEpisodeId}
                >
                  <Trash2 size={16} />
                  Delete episode
                </button>
              </div>

              <div className="space-y-4">
                {episodeScenes.map((sc, i) => (
                  <div key={sc.id} className="card border-dusk/80 bg-void/40">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-4">
                        <ImageUpload
                          imageUrl={sc.imageUrl}
                          onImageChange={(url) => patchScene(sc.id, { imageUrl: url })}
                          shape="square"
                          size="md"
                          label="Scene image"
                          fallbackColor="#1a1a2e"
                        />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <label className="label" htmlFor={`scene-title-${sc.id}`}>
                              Scene title
                            </label>
                            <input
                              id={`scene-title-${sc.id}`}
                              className="input"
                              value={sc.title}
                              onChange={(e) => patchScene(sc.id, { title: e.target.value })}
                              placeholder="What happens in this scene?"
                            />
                          </div>
                          <div>
                            <label className="label" htmlFor={`scene-summary-${sc.id}`}>
                              Summary
                            </label>
                            <textarea
                              id={`scene-summary-${sc.id}`}
                              className="textarea min-h-[92px]"
                              value={sc.summary}
                              onChange={(e) => patchScene(sc.id, { summary: e.target.value })}
                              placeholder="Short beat-by-beat summary…"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary px-2 py-2"
                          aria-label="Move scene up"
                          disabled={i <= 0}
                          onClick={() => reorderScenes(i, i - 1)}
                          title="Move up"
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-secondary px-2 py-2"
                          aria-label="Move scene down"
                          disabled={i >= episodeScenes.length - 1}
                          onClick={() => reorderScenes(i, i + 1)}
                          title="Move down"
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDeleteScene(sc.id)}
                        >
                          <Trash2 size={16} />
                          Delete scene
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="label" htmlFor={`scene-notes-${sc.id}`}>
                        Notes
                      </label>
                      <textarea
                        id={`scene-notes-${sc.id}`}
                        className="textarea min-h-[88px]"
                        value={sc.notes}
                        onChange={(e) => patchScene(sc.id, { notes: e.target.value })}
                        placeholder="Extra context, dialogue snippets, camera notes…"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
