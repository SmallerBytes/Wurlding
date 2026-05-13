import { X } from 'lucide-react';
import type { WhatsNewEntry } from '../data/whatsNew';

export default function WhatsNewModal({
  entries,
  onClose,
}: {
  entries: WhatsNewEntry[];
  onClose: () => void;
}) {
  if (entries.length === 0) return null;
  const newest = entries[0]!;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="What’s new"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card relative w-full max-w-2xl border-arcane/25 bg-abyss/95 p-6 backdrop-blur-sm">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-full border border-dusk bg-shadow/60 p-2 text-moonlight hover:bg-shadow"
          aria-label="Close updates"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-mist font-[Cinzel]">
          What’s new
        </div>
        <h2 className="font-[Cinzel] text-2xl font-semibold text-moonlight">
          {newest.title}
        </h2>
        <p className="mt-1 text-xs text-mist">
          Version <span className="tabular-nums text-silver">{newest.version}</span>
          {' · '}
          <time dateTime={newest.date} className="tabular-nums">
            {new Date(newest.date).toLocaleDateString()}
          </time>
        </p>

        <div className="mt-5 space-y-4">
          {entries.map((e) => (
            <section key={e.version} className="rounded-lg border border-dusk/60 bg-shadow/40 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-[Cinzel] text-lg font-semibold text-moonlight">{e.title}</h3>
                <span className="text-xs tabular-nums text-mist">v{e.version}</span>
              </div>
              <ul className="mt-3 list-disc pl-5 text-sm text-silver space-y-1">
                {e.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

