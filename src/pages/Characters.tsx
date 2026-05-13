import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Users, Swords, ScrollText } from 'lucide-react';
import useStore from '../store/useStore';

export default function Characters() {
  const navigate = useNavigate();
  const {
    characters,
    worlds,
    activeWorldId,
    deleteCharacter,
  } = useStore();

  const filtered = useMemo(() => {
    if (!activeWorldId) return characters;
    return characters.filter((c) => c.worldId === activeWorldId);
  }, [characters, activeWorldId]);

  const worldName = (worldId: string) =>
    worlds.find((w) => w.id === worldId)?.name ?? 'Unknown world';

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-mystic/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-blood/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <Swords className="h-4 w-4 text-fey" aria-hidden />
            Adventurers
          </p>
          <h1 className="page-title font-[Cinzel] text-3xl md:text-4xl">Characters</h1>
          {activeWorldId && (
            <p className="mt-2 text-sm text-mist">
              Showing heroes in{' '}
              <span className="text-silver">
                {worldName(activeWorldId)}
              </span>
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn-primary shrink-0"
          onClick={() => navigate('/characters/new')}
        >
          <Plus size={18} />
          New Character
        </button>
      </header>

      {filtered.length === 0 ? (
        <section
          className="card relative overflow-hidden border-dashed border-fey/25 bg-gradient-to-br from-shadow/80 to-abyss p-12 text-center"
          aria-label="No characters"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fey/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-fey/30 bg-fey/10">
              <Users className="h-8 w-8 text-fey" aria-hidden />
            </div>
            <h2 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
              No characters yet
            </h2>
            <p className="mb-8 text-mist leading-relaxed">
              {activeWorldId
                ? 'This world has no heroes on record. Forge a new adventurer to walk these lands.'
                : 'Your roster is empty. Create a character to begin their legend.'}
            </p>
            <button
              type="button"
              className="btn-primary mx-auto"
              onClick={() => navigate('/characters/new')}
            >
              <Plus size={18} />
              Create a character
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="card-hover group relative flex flex-col gap-4 border-dusk/80 bg-shadow/40 p-5 backdrop-blur-sm"
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-lg p-2 text-blood/80 opacity-0 transition hover:bg-blood/10 hover:text-blood group-hover:opacity-100"
                aria-label={`Delete ${c.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCharacter(c.id);
                }}
              >
                <Trash2 size={18} />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/characters/${c.id}`)}
                className="flex flex-1 flex-col gap-4 text-left"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-14 w-14 shrink-0 rounded-full border-2 border-dusk shadow-lg ring-2 ring-black/20"
                    style={{ backgroundColor: c.portraitColor }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 pr-8">
                    <h2 className="font-[Cinzel] text-xl font-semibold text-moonlight transition group-hover:text-fey">
                      {c.name || 'Unnamed hero'}
                    </h2>
                    <p className="mt-1 text-sm text-silver">
                      {c.race} {c.class} {c.level}
                    </p>
                    <p className="mt-1 text-xs text-mist">{c.alignment}</p>
                  </div>
                </div>

                <div className="rounded-md border border-dusk/60 bg-abyss/40 px-3 py-2.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-mist">
                    <ScrollText className="h-3.5 w-3.5 text-fey/80" aria-hidden />
                    Backstory
                  </p>
                  {c.backstory?.trim() ? (
                    <p className="line-clamp-4 text-sm leading-relaxed text-silver">
                      {c.backstory.trim()}
                    </p>
                  ) : (
                    <p className="text-sm italic text-mist/80">
                      No backstory yet — open the sheet to add their history.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-dusk/60 pt-3">
                  <span className="badge-gold text-[0.65rem]">
                    {worldName(c.worldId)}
                  </span>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
