import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  BookOpen,
  Users,
  MapPin,
  Shield,
  Bug,
  Sparkles,
  Plus,
  PenLine,
  UserPlus,
  Compass,
  ChevronRight,
} from 'lucide-react';
import useStore from '../store/useStore';

function formatGenre(genre: string): string {
  return genre
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    worlds,
    stories,
    characters,
    locations,
    factions,
    customCreatures,
  } = useStore();

  const recentWorlds = useMemo(
    () =>
      [...worlds]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 4),
    [worlds],
  );

  const statItems = [
    {
      label: 'Worlds',
      count: worlds.length,
      icon: Globe,
      badgeClass: 'badge-arcane',
    },
    {
      label: 'Stories',
      count: stories.length,
      icon: BookOpen,
      badgeClass: 'badge-ember',
    },
    {
      label: 'Characters',
      count: characters.length,
      icon: Users,
      badgeClass: 'badge-fey',
    },
    {
      label: 'Locations',
      count: locations.length,
      icon: MapPin,
      badgeClass: 'badge-frost',
    },
    {
      label: 'Factions',
      count: factions.length,
      icon: Shield,
      badgeClass: 'badge-gold',
    },
    {
      label: 'Creatures',
      count: customCreatures.length,
      icon: Bug,
      badgeClass: 'badge-arcane',
    },
  ];

  const hasWorlds = worlds.length > 0;

  return (
    <div className="relative min-h-full">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl"
        aria-hidden
      >
        <div className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-arcane/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-ember/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-frost/5 blur-3xl" />
      </div>

      <header className="page-header flex-col items-start gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
            <Sparkles className="h-4 w-4 text-gold" aria-hidden />
            Realm overview
          </p>
          <h1 className="page-title font-[Cinzel] text-4xl md:text-5xl">
            Welcome to Wurlding
          </h1>
          <p className="mt-3 max-w-2xl text-base text-mist leading-relaxed">
            Forge worlds from shadow and starlight, weave tales that outlive
            memory, and chart realms only you can name.
          </p>
        </div>
      </header>

      <section className="mb-10" aria-label="Library statistics">
        <h2 className="section-title font-[Cinzel]">Your archive</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statItems.map(
            ({ label, count, icon: Icon, badgeClass }) => (
              <div
                key={label}
                className="card group flex flex-col gap-3 border-dusk/80 bg-shadow/50 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={badgeClass}>{label}</span>
                  <Icon
                    className="h-5 w-5 shrink-0 text-mist opacity-80 transition group-hover:text-arcane"
                    aria-hidden
                  />
                </div>
                <p className="font-[Cinzel] text-3xl font-bold tabular-nums text-moonlight">
                  {count}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="mb-10" aria-label="Quick actions">
        <h2 className="section-title font-[Cinzel]">Quick actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/worlds/new')}
          >
            <Plus size={18} />
            Create World
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/stories/new')}
          >
            <PenLine size={18} />
            Write Story
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/characters/new')}
          >
            <UserPlus size={18} />
            Create Character
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/bestiary')}
          >
            <Compass size={18} />
            Browse Bestiary
          </button>
        </div>
      </section>

      {!hasWorlds ? (
        <section
          className="card relative overflow-hidden border-dashed border-arcane/25 bg-gradient-to-br from-shadow/80 to-abyss p-10 text-center"
          aria-label="No worlds yet"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-arcane/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-arcane/30 bg-arcane/10">
              <Globe className="h-8 w-8 text-arcane" aria-hidden />
            </div>
            <h3 className="mb-3 font-[Cinzel] text-2xl font-semibold text-moonlight">
              The void awaits your first realm
            </h3>
            <p className="mb-8 text-mist leading-relaxed">
              Every legend begins in silence. Conjure a world—name it, tint it
              with genre and purpose—and your archive will stir to life.
            </p>
            <button
              type="button"
              className="btn-primary mx-auto"
              onClick={() => navigate('/worlds/new')}
            >
              <Sparkles size={18} />
              Create your first world
            </button>
          </div>
        </section>
      ) : (
        <section aria-label="Recent worlds">
          <h2 className="section-title font-[Cinzel]">Recent worlds</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {recentWorlds.map((world) => (
              <button
                key={world.id}
                type="button"
                onClick={() => navigate(`/worlds/${world.id}`)}
                className="card-hover group w-full cursor-pointer text-left"
              >
                <div
                  className="mb-4 h-2 w-full rounded-full opacity-90"
                  style={{ backgroundColor: world.coverColor }}
                  aria-hidden
                />
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-[Cinzel] text-lg font-semibold text-moonlight transition group-hover:text-arcane">
                    {world.name}
                  </h3>
                  <ChevronRight
                    className="mt-0.5 h-5 w-5 shrink-0 text-mist transition group-hover:translate-x-0.5 group-hover:text-arcane"
                    aria-hidden
                  />
                </div>
                <span className="badge-gold mb-3 inline-block">
                  {formatGenre(world.genre)}
                </span>
                <p className="line-clamp-2 text-sm text-mist">
                  {world.description || 'No description yet—this realm is still taking shape.'}
                </p>
                <p className="mt-4 text-xs text-mist/70">
                  Updated{' '}
                  {new Date(world.updatedAt).toLocaleDateString(undefined, {
                    dateStyle: 'medium',
                  })}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
