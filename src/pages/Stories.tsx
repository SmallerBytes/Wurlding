import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import useStore from '../store/useStore';
import type { Story } from '../types';

function statusBadgeClass(status: Story['status']): string {
  switch (status) {
    case 'draft':
      return 'badge-frost';
    case 'in-progress':
      return 'badge-gold';
    case 'complete':
      return 'badge-fey';
    default:
      return 'badge-frost';
  }
}

function statusLabel(status: Story['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'in-progress':
      return 'In progress';
    case 'complete':
      return 'Complete';
    default:
      return status;
  }
}

export default function Stories() {
  const navigate = useNavigate();
  const { stories, worlds, activeWorldId, deleteStory } = useStore();

  const filteredStories = useMemo(() => {
    const list = activeWorldId
      ? stories.filter((s) => s.worldId === activeWorldId)
      : stories;
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [stories, activeWorldId]);

  const worldNameById = useMemo(() => {
    const m = new Map<string, string>();
    worlds.forEach((w) => m.set(w.id, w.name));
    return m;
  }, [worlds]);

  const handleDelete = (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        'Delete this story? This cannot be undone.',
      )
    ) {
      deleteStory(storyId);
    }
  };

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-ember/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-arcane/5 blur-3xl" />
      </div>

      <header className="page-header flex-col gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="page-title font-[Cinzel]">Your Stories</h1>
          {activeWorldId && (
            <p className="mt-2 text-sm text-mist">
              Showing stories in{' '}
              <span className="text-silver">
                {worldNameById.get(activeWorldId) ?? 'this world'}
              </span>
              only.
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => navigate('/stories/new')}
        >
          <Plus size={18} />
          New Story
        </button>
      </header>

      {filteredStories.length === 0 ? (
        <section
          className="card border-dashed border-dusk/80 bg-shadow/40 p-12 text-center"
          aria-label="No stories"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-ember/25 bg-ember/5">
            <BookOpen className="h-7 w-7 text-ember" aria-hidden />
          </div>
          <h2 className="mb-2 font-[Cinzel] text-xl font-semibold text-moonlight">
            No stories yet
          </h2>
          <p className="mx-auto mb-6 max-w-md text-mist leading-relaxed">
            {activeWorldId
              ? 'This world has no stories. Start one and give your realm a voice.'
              : 'Begin a tale—drafts, epics, and fragments all find a home here.'}
          </p>
          <button
            type="button"
            className="btn-primary mx-auto"
            onClick={() => navigate('/stories/new')}
          >
            <Plus size={18} />
            Create a story
          </button>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStories.map((story) => {
            const synopsis =
              story.synopsis?.trim() ||
              'No synopsis yet—this story is still unwritten.';
            const preview =
              synopsis.length > 160 ? `${synopsis.slice(0, 157)}…` : synopsis;

            return (
              <article key={story.id} className="card group relative flex flex-col p-0">
                <button
                  type="button"
                  onClick={() => navigate(`/stories/${story.id}`)}
                  className="flex flex-1 flex-col rounded-lg p-5 text-left transition hover:bg-shadow/80"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight transition group-hover:text-arcane">
                      {story.title || 'Untitled story'}
                    </h2>
                    <span className={statusBadgeClass(story.status)}>
                      {statusLabel(story.status)}
                    </span>
                  </div>
                  <p className="mb-4 line-clamp-3 flex-1 text-sm text-mist leading-relaxed">
                    {preview}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist/80">
                    <span>
                      {story.chapters.length}{' '}
                      {story.chapters.length === 1 ? 'chapter' : 'chapters'}
                    </span>
                    <span className="text-dusk">·</span>
                    <span className="text-silver/90">
                      {worldNameById.get(story.worldId) ?? 'Unknown world'}
                    </span>
                  </div>
                </button>
                <div className="border-t border-dusk/60 px-3 py-2">
                  <button
                    type="button"
                    className="btn-danger ml-auto w-full justify-center py-1.5 text-sm sm:w-auto"
                    onClick={(e) => handleDelete(e, story.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
