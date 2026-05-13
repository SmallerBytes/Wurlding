import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Plus, Trash2, Upload } from 'lucide-react';
import useStore, { loadFromFile } from '../store/useStore';
import type { Genre } from '../types';

import { API_BASE } from '../api';

function formatGenre(genre: string): string {
  return genre
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function genreBadgeClass(genre: Genre): string {
  const map: Record<Genre, string> = {
    'dark-fantasy': 'badge bg-blood/20 text-blood border border-blood/30',
    'high-fantasy': 'badge bg-arcane/20 text-mystic border border-arcane/30',
    'science-fiction': 'badge bg-frost/20 text-frost border border-frost/30',
    mythology: 'badge bg-gold/20 text-gold border border-gold/30',
    horror: 'badge bg-shadow text-mist border border-dusk',
    steampunk: 'badge bg-ember/20 text-flame border border-ember/30',
    'post-apocalyptic': 'badge bg-dusk text-silver border border-mist/30',
    custom: 'badge bg-twilight text-moonlight border border-mist/30',
  };
  return map[genre];
}

function previewText(text: string, max = 140): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function Worlds() {
  const navigate = useNavigate();
  const { worlds, activeWorldId, deleteWorld } = useStore();
  const hydrateFromFile = useStore((s) => s._hydrateFromFile);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importToken, setImportToken] = useState<string | null>(null);
  const [importWorldName, setImportWorldName] = useState<string>('');
  const [importCounts, setImportCounts] = useState<Record<string, number> | null>(null);
  const [missingImages, setMissingImages] = useState<string[]>([]);
  const [mode, setMode] = useState<'createNew' | 'mergeIntoExisting'>('createNew');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  const sorted = useMemo(
    () =>
      [...worlds].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    [worlds],
  );

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Delete “${name}”? This removes the world and its linked data from this device.`,
      )
    ) {
      deleteWorld(id);
    }
  };

  const resetImport = () => {
    setImporting(false);
    setImportError(null);
    setImportToken(null);
    setImportWorldName('');
    setImportCounts(null);
    setMissingImages([]);
    setMode('createNew');
    setMergeTargetId(worlds[0]?.id ?? '');
  };

  const openFilePicker = () => {
    resetImport();
    setImportOpen(true);
    setTimeout(() => fileRef.current?.click(), 0);
  };

  const uploadForPreview = async (file: File) => {
    setImportError(null);
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/import/world`, { method: 'POST', body: form });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Import failed');
      setImportToken(json.importToken);
      setImportWorldName(json.world?.name || 'Imported world');
      setImportCounts(json.counts || null);
      setMissingImages(Array.isArray(json.missingImages) ? json.missingImages : []);
      setMergeTargetId(worlds[0]?.id ?? '');
    } catch (e) {
      setImportError('Could not read that .wurld file. Make sure it was exported from Wurlding.');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  const commitImport = async () => {
    if (!importToken) return;
    setImportError(null);
    setImporting(true);
    try {
      const strategy =
        mode === 'createNew'
          ? 'createNew'
          : { kind: 'mergeIntoExisting', targetWorldId: mergeTargetId };

      const res = await fetch(`${API_BASE}/api/import/world/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importToken, strategy }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Import commit failed');

      const fileData = await loadFromFile();
      if (fileData) hydrateFromFile(fileData);

      setImportOpen(false);
      resetImport();
    } catch (e) {
      setImportError('Import failed while saving into your library.');
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Your Worlds</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={openFilePicker}
          >
            <Upload className="h-4 w-4" aria-hidden />
            Import
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/worlds/new')}
          >
            <Plus className="h-4 w-4" aria-hidden />
            New World
          </button>
        </div>
      </header>

      <input
        ref={fileRef}
        type="file"
        accept=".wurld"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) uploadForPreview(file);
        }}
      />

      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Import world"
          onClick={() => {
            if (!importing) {
              setImportOpen(false);
              resetImport();
            }
          }}
        >
          <div
            className="card w-full max-w-lg border-arcane/25 bg-abyss/95 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="section-title mb-1">Import world</h2>
                <p className="text-sm text-mist">
                  Choose a <span className="text-silver">.wurld</span> file to add a world to this app.
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={importing}
                onClick={() => {
                  setImportOpen(false);
                  resetImport();
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {!importToken ? (
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  disabled={importing}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" aria-hidden />
                  Choose .wurld file
                </button>
              ) : (
                <div className="rounded-lg border border-dusk/70 bg-shadow/30 p-3">
                  <div className="text-sm font-medium text-moonlight">
                    {importWorldName || 'Imported world'}
                  </div>
                  {importCounts && (
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-mist">
                      {Object.entries(importCounts).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-2">
                          <span className="capitalize">{k}</span>
                          <span className="tabular-nums text-silver">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {missingImages.length > 0 && (
                    <p className="mt-2 text-xs text-blood">
                      Missing {missingImages.length} image(s) from the file.
                    </p>
                  )}
                </div>
              )}

              {importToken && (
                <div className="space-y-3">
                  <div>
                    <label className="label">Import mode</label>
                    <select
                      className="select"
                      value={mode}
                      onChange={(e) => setMode(e.target.value as 'createNew' | 'mergeIntoExisting')}
                      disabled={importing}
                    >
                      <option value="createNew">Create new world</option>
                      <option value="mergeIntoExisting">Merge into existing world</option>
                    </select>
                  </div>

                  {mode === 'mergeIntoExisting' && (
                    <div>
                      <label className="label">Merge target</label>
                      <select
                        className="select"
                        value={mergeTargetId}
                        onChange={(e) => setMergeTargetId(e.target.value)}
                        disabled={importing}
                      >
                        <option value="">Select a world…</option>
                        {worlds.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name || 'Untitled world'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary w-full justify-center"
                    disabled={importing || (mode === 'mergeIntoExisting' && !mergeTargetId)}
                    onClick={commitImport}
                  >
                    Import now
                  </button>
                </div>
              )}

              {importError && <p className="text-sm text-blood">{importError}</p>}
              {importing && <p className="text-sm text-mist">Working…</p>}
            </div>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center">
          <Globe className="h-14 w-14 text-mist/60" aria-hidden />
          <div>
            <p className="text-lg font-medium text-moonlight">No worlds yet</p>
            <p className="mt-1 max-w-md text-sm text-mist">
              Create a world to hold your settings, maps, cultures, and
              everything else you invent.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/worlds/new')}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create your first world
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((world) => {
            const active = world.id === activeWorldId;
            return (
              <div
                key={world.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/worlds/${world.id}`)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    navigate(`/worlds/${world.id}`);
                  }
                }}
                className={`card-hover cursor-pointer text-left ${
                  active
                    ? 'border-arcane/60 ring-1 ring-arcane/40 shadow-lg shadow-arcane/10'
                    : ''
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div
                    className="h-2 w-full max-w-[4rem] shrink-0 rounded-full"
                    style={{ backgroundColor: world.coverColor }}
                    title="Cover color"
                  />
                  <button
                    type="button"
                    className="btn-danger shrink-0 py-1.5 text-xs"
                    aria-label={`Delete ${world.name}`}
                    onClick={(e) => handleDelete(e, world.id, world.name)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <h2 className="font-display text-xl font-semibold text-moonlight">
                  {world.name || 'Untitled world'}
                </h2>
                <span
                  className={`mt-2 inline-block ${genreBadgeClass(world.genre)}`}
                >
                  {formatGenre(world.genre)}
                </span>
                <p className="mt-3 line-clamp-3 text-sm text-silver">
                  {previewText(world.description) || 'No description yet.'}
                </p>
                <p className="mt-4 text-xs text-mist">
                  Updated {formatDate(world.updatedAt)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
