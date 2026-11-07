import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ghost, Download, Image as ImageIcon, Scaling, Upload, Trash2 } from 'lucide-react';
import {
  getBuiltInCritter,
  uniqueCastForSelection,
  visibleCritterGenres,
  type CritterId,
} from '../data/pixelCritters';
import {
  customPreviewUrl,
  customCritterSprite,
  deleteCustomCritter,
  fetchCustomCritters,
  getCachedCustomCritters,
  subscribeCustomCritters,
  uploadCustomCritterFolder,
  type CustomCritterManifest,
} from '../data/customCritters';
import PixelSpritePreview from '../components/PixelSpritePreview';
import {
  CRITTERS_EVENT,
  CRITTER_SCALES_EVENT,
  DEFAULT_CRITTER_SCALE_PERCENT,
  DESKTOP_COMPANIONS_EVENT,
  MAX_CRITTER_SCALE_PERCENT,
  MAX_CRITTER_SELECTIONS,
  MIN_CRITTER_SCALE_PERCENT,
  MOTION_EVENT,
  clampCritterScalePercent,
  getStoredCritterScales,
  getStoredCritters,
  getStoredDesktopCompanions,
  getStoredMotion,
  getStoredTheme,
  normalizeCritterScales,
  normalizeCritterSelection,
  previewCritterScales,
  previewCritters,
  sameCritterScales,
  sameCritterSelection,
  savePreferences,
  setDesktopCompanions,
  type AppPreferences,
  type CritterGenre,
  type CritterScaleMap,
  type CritterSelection,
  type MotionPref,
} from '../theme';

const DESKTOP_BACKGROUNDS = [
  {
    id: 'forest-stream',
    title: 'Forest stream clearing',
    alt: 'Pixel-art forest stream clearing with a winding path, waterfall, and sunbeams',
    file: 'forest-stream-clearing.png',
    download: 'wurlding-forest-stream-clearing.png',
  },
  {
    id: 'sunlit-woodland',
    title: 'Sunlit woodland clearing',
    alt: 'Pixel-art sunlit woodland clearing with a dirt path, trees, mushrooms, and god rays',
    file: 'sunlit-woodland-clearing.png',
    download: 'wurlding-sunlit-woodland-clearing.png',
  },
  {
    id: 'desert-trail',
    title: 'Desert trail with cacti',
    alt: 'Pixel-art desert trail with sandstone rocks, blooming cacti, and a winding sandy path',
    file: 'desert-trail-cacti.png',
    download: 'wurlding-desert-trail-cacti.png',
  },
  {
    id: 'reef-arch',
    title: 'Reef with sunlit arch',
    alt: 'Pixel-art underwater reef with coral, a stone arch, and light beams through the water',
    file: 'reef-sunlit-arch.png',
    download: 'wurlding-reef-sunlit-arch.png',
  },
  {
    id: 'sunset-clouds',
    title: 'Sunset above the clouds',
    alt: 'Pixel-art sunset above fluffy clouds with golden light rays across a blue sky',
    file: 'sunset-above-clouds.png',
    download: 'wurlding-sunset-above-clouds.png',
  },
] as const;

function desktopBgUrl(file: string): string {
  return `${import.meta.env.BASE_URL}desktop-backgrounds/${file}`;
}

type CompanionDraft = {
  critters: CritterSelection;
  desktopCompanions: boolean;
  critterScales: CritterScaleMap;
};

function readCompanionDraft(): CompanionDraft {
  return {
    critters: getStoredCritters(),
    desktopCompanions: getStoredDesktopCompanions(),
    critterScales: getStoredCritterScales(),
  };
}

function sameCompanionDraft(a: CompanionDraft, b: CompanionDraft): boolean {
  return (
    sameCritterSelection(a.critters, b.critters) &&
    Boolean(a.desktopCompanions) === Boolean(b.desktopCompanions) &&
    sameCritterScales(a.critterScales, b.critterScales)
  );
}

function fullPreferences(draft: CompanionDraft): AppPreferences {
  return {
    theme: getStoredTheme(),
    motion: getStoredMotion(),
    critters: draft.critters,
    desktopCompanions: draft.desktopCompanions,
    critterScales: draft.critterScales,
  };
}

function scalePercentFor(scales: CritterScaleMap, id: CritterId): number {
  return clampCritterScalePercent(scales[id] ?? DEFAULT_CRITTER_SCALE_PERCENT);
}

export default function Companions() {
  const [saved, setSaved] = useState<CompanionDraft>(() => readCompanionDraft());
  const [draft, setDraft] = useState<CompanionDraft>(() => readCompanionDraft());
  const [motion, setMotion] = useState<MotionPref>(() => getStoredMotion());
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [customs, setCustoms] = useState<CustomCritterManifest[]>(() => getCachedCustomCritters());
  const [uploadName, setUploadName] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const applyingLocal = useRef(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const savedRef = useRef(saved);
  const draftRef = useRef(draft);

  useEffect(() => {
    savedRef.current = saved;
    draftRef.current = draft;
  }, [saved, draft]);

  useEffect(() => {
    mountedRef.current = true;
    void fetchCustomCritters(true).then((list) => {
      if (mountedRef.current) setCustoms(list);
    });
    const unsub = subscribeCustomCritters(() => setCustoms(getCachedCustomCritters()));
    return () => {
      unsub();
      mountedRef.current = false;
      if (savingRef.current) return;
      if (!sameCompanionDraft(savedRef.current, draftRef.current)) {
        previewCritters(savedRef.current.critters);
        previewCritterScales(savedRef.current.critterScales);
      }
    };
  }, []);

  useEffect(() => {
    const onCritters = (e: Event) => {
      if (applyingLocal.current) return;
      const detail = normalizeCritterSelection((e as CustomEvent<unknown>).detail);
      setDraft((d) => ({ ...d, critters: detail }));
      setSaved((s) => ({ ...s, critters: detail }));
      setSaveState('idle');
    };
    const onDesktop = (e: Event) => {
      if (applyingLocal.current) return;
      const detail = Boolean((e as CustomEvent<boolean>).detail);
      setDraft((d) => ({ ...d, desktopCompanions: detail }));
      setSaved((s) => ({ ...s, desktopCompanions: detail }));
      setSaveState('idle');
    };
    const onScales = (e: Event) => {
      if (applyingLocal.current) return;
      const detail = normalizeCritterScales((e as CustomEvent<unknown>).detail);
      setDraft((d) => ({ ...d, critterScales: detail }));
      setSaved((s) => ({ ...s, critterScales: detail }));
      setSaveState('idle');
    };
    const onMotion = (e: Event) => {
      const detail = (e as CustomEvent<MotionPref>).detail;
      if (detail !== 'on' && detail !== 'off') return;
      setMotion(detail);
    };
    window.addEventListener(CRITTERS_EVENT, onCritters);
    window.addEventListener(DESKTOP_COMPANIONS_EVENT, onDesktop);
    window.addEventListener(CRITTER_SCALES_EVENT, onScales);
    window.addEventListener(MOTION_EVENT, onMotion);
    return () => {
      window.removeEventListener(CRITTERS_EVENT, onCritters);
      window.removeEventListener(DESKTOP_COMPANIONS_EVENT, onDesktop);
      window.removeEventListener(CRITTER_SCALES_EVENT, onScales);
      window.removeEventListener(MOTION_EVENT, onMotion);
    };
  }, []);

  const applyCritterSelection = (next: CritterSelection) => {
    const normalized = normalizeCritterSelection(next);
    if (sameCritterSelection(normalized, draft.critters)) return;
    applyingLocal.current = true;
    previewCritters(normalized);
    if (normalized.length === 0 && draft.desktopCompanions) {
      setDesktopCompanions(false);
    }
    applyingLocal.current = false;
    setDraft((d) => ({
      ...d,
      critters: normalized,
      desktopCompanions: normalized.length === 0 ? false : d.desktopCompanions,
    }));
    if (normalized.length === 0) {
      setSaved((s) => ({ ...s, desktopCompanions: false }));
    }
    setSaveState('idle');
  };

  const toggleCritter = (id: CritterGenre) => {
    if (id === 'off') {
      applyCritterSelection([]);
      return;
    }
    const selected = new Set(draft.critters);
    if (selected.has(id)) selected.delete(id);
    else {
      if (selected.size >= MAX_CRITTER_SELECTIONS) return;
      selected.add(id);
    }
    applyCritterSelection([...selected]);
  };

  const toggleDesktopCompanions = () => {
    if (draft.critters.length === 0 || motion === 'off') return;
    const next = !draft.desktopCompanions;
    applyingLocal.current = true;
    setDesktopCompanions(next);
    applyingLocal.current = false;
    setDraft((d) => ({ ...d, desktopCompanions: next }));
    setSaved((s) => ({ ...s, desktopCompanions: next }));
    setSaveState('idle');
  };

  const onFolderPicked = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setUploadState('uploading');
    setUploadError(null);
    try {
      const first = fileList[0] as File & { webkitRelativePath?: string };
      const folderName =
        first.webkitRelativePath?.split(/[/\\]/)[0] ||
        uploadName.trim() ||
        'companion';
      const manifest = await uploadCustomCritterFolder({
        files: fileList,
        name: uploadName.trim() || undefined,
        folderName,
      });
      if (!mountedRef.current) return;
      setCustoms(getCachedCustomCritters());
      setUploadName('');
      setUploadState('idle');
      // Auto-select the new companion if there is room.
      if (draft.critters.length < MAX_CRITTER_SELECTIONS) {
        applyCritterSelection([...draft.critters, manifest.id as CritterGenre]);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setUploadState('error');
      setUploadError(err instanceof Error ? err.message : String(err));
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const removeCustom = async (manifest: CustomCritterManifest) => {
    try {
      await deleteCustomCritter(manifest.slug);
      if (!mountedRef.current) return;
      setCustoms(getCachedCustomCritters());
      if (draft.critters.includes(manifest.id as CritterGenre)) {
        applyCritterSelection(draft.critters.filter((g) => g !== manifest.id));
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : String(err));
      setUploadState('error');
    }
  };

  const setScalePercent = (id: CritterId, percent: number) => {
    const nextPercent = clampCritterScalePercent(percent);
    const next: CritterScaleMap = { ...draft.critterScales };
    if (nextPercent === DEFAULT_CRITTER_SCALE_PERCENT) delete next[id];
    else next[id] = nextPercent;
    const normalized = normalizeCritterScales(next);
    if (sameCritterScales(normalized, draft.critterScales)) return;
    applyingLocal.current = true;
    previewCritterScales(normalized);
    applyingLocal.current = false;
    setDraft((d) => ({ ...d, critterScales: normalized }));
    setSaveState('idle');
  };

  const save = async () => {
    if (saveState === 'saving') return;
    const next = draftRef.current;
    savingRef.current = true;
    setSaveState('saving');
    applyingLocal.current = true;
    const ok = await savePreferences(fullPreferences(next));
    applyingLocal.current = false;
    savingRef.current = false;
    if (!mountedRef.current) {
      if (!ok) {
        previewCritters(savedRef.current.critters);
        previewCritterScales(savedRef.current.critterScales);
      }
      return;
    }
    if (!ok) {
      setSaveState('error');
      return;
    }
    setSaved(next);
    setSaveState('saved');
  };

  const motionOn = motion === 'on';
  const dirty = !sameCompanionDraft(draft, saved);
  const scalableIds = uniqueCastForSelection(draft.critters);

  return (
    <div className="relative mx-auto max-w-2xl min-h-full">
      <header className="page-header flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Ghost className="h-8 w-8 text-fey shrink-0" aria-hidden />
          <div>
            <h1 className="page-title font-[Cinzel] text-2xl md:text-3xl">Companions</h1>
            <p className="mt-1 text-sm text-mist">
              Choose pixel creatures to roam the window — and optionally your desktop.
            </p>
          </div>
        </div>
      </header>

      <div className="wz-stagger space-y-6">
        {!motionOn && (
          <section className="card space-y-2 border-dusk/80 bg-shadow/40" aria-live="polite">
            <p className="text-sm text-mist">
              Companions stay hidden while animations are off. Turn them back on in{' '}
              <Link to="/settings" className="text-arcane underline-offset-2 hover:underline">
                Settings
              </Link>
              .
            </p>
          </section>
        )}

        <section className="card space-y-4 border-dusk/80 bg-shadow/40" aria-labelledby="upload-heading">
          <div>
            <h2 id="upload-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
              <Upload className="h-5 w-5 text-fey" aria-hidden />
              Add your own
            </h2>
            <div className="space-y-2 text-sm text-mist">
              <p>
                Export from PixelLab.ai, unzip, then upload the folder that contains{' '}
                <code className="text-moonlight">metadata.json</code> (for example{' '}
                <code className="text-moonlight">Mew/</code> or{' '}
                <code className="text-moonlight">Diamond_Head/</code> with Idle animations inside).
                Rotations stills are ignored.
              </p>
              <p>
                Wurlding maps clips from their PixelLab <span className="text-moonlight">animation names</span>, not the folder title:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="text-moonlight">Idle</span> → standing / breathing loop
                </li>
                <li>
                  Names with <span className="text-moonlight">walk</span>,{' '}
                  <span className="text-moonlight">step</span>,{' '}
                  <span className="text-moonlight">stride</span>,{' '}
                  <span className="text-moonlight">run</span>, or{' '}
                  <span className="text-moonlight">moving</span> → walk cycle
                </li>
                <li>
                  Names with <span className="text-moonlight">punch</span>,{' '}
                  <span className="text-moonlight">attack</span>,{' '}
                  <span className="text-moonlight">summon</span>,{' '}
                  <span className="text-moonlight">void</span>,{' '}
                  <span className="text-moonlight">sink</span>, etc. → optional pause flourish
                </li>
              </ul>
              <p>
                You do not need to rename folders. Clearer animation names in PixelLab just make
                mapping more reliable when a pack has several clips.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-mist">
              Display name (optional)
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Forest Sprite"
                className="rounded-lg border border-dusk/70 bg-abyss/50 px-3 py-2 text-moonlight"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                ref={folderInputRef}
                type="file"
                className="sr-only"
                // @ts-expect-error webkitdirectory is widely supported for folder picks
                webkitdirectory=""
                directory=""
                multiple
                onChange={(e) => void onFolderPicked(e.target.files)}
              />
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-40"
                disabled={uploadState === 'uploading'}
                onClick={() => folderInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {uploadState === 'uploading' ? 'Importing…' : 'Upload folder'}
              </button>
            </div>
          </div>
          {uploadError && (
            <p className="text-sm text-ember" role="alert">
              {uploadError}
            </p>
          )}
        </section>

        {customs.length > 0 && (
          <section className="card space-y-4 border-dusk/80 bg-shadow/40" aria-labelledby="yours-heading">
            <div>
              <h2 id="yours-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
                <Ghost className="h-5 w-5 text-fey" aria-hidden />
                Your companions
              </h2>
              <p className="text-sm text-mist">
                Imported PixelLab packs. Select them like built-ins (still counts toward the{' '}
                {MAX_CRITTER_SELECTIONS} companion cap).
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Your companions">
              {customs.map((manifest) => {
                const genreId = manifest.id as CritterGenre;
                const selected = draft.critters.includes(genreId);
                const atCap = !selected && draft.critters.length >= MAX_CRITTER_SELECTIONS;
                const preview = customPreviewUrl(manifest);
                return (
                  <div
                    key={manifest.id}
                    className={`flex h-full flex-col gap-2 rounded-lg border p-3 ${
                      selected
                        ? 'border-arcane/50 bg-arcane/10 ring-1 ring-arcane/30'
                        : 'border-dusk/70 bg-abyss/50'
                    }`}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={selected}
                      aria-disabled={atCap || undefined}
                      disabled={atCap}
                      onClick={() => toggleCritter(genreId)}
                      className={`flex flex-1 flex-col gap-2 text-left transition ${
                        atCap ? 'cursor-not-allowed opacity-50' : ''
                      }`}
                    >
                      <span className="flex h-12 items-end gap-2" aria-hidden>
                        {preview ? (
                          <img
                            src={preview}
                            alt=""
                            className="h-12 w-12 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <span className="text-xs uppercase tracking-[0.2em] text-mist">no preview</span>
                        )}
                      </span>
                      <span className="block font-medium text-moonlight">{manifest.name}</span>
                      <span className="text-sm text-mist">
                        {manifest.poses.roar ? 'Walk, idle, and a pause flourish.' : 'Walk and idle.'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn-secondary inline-flex items-center justify-center gap-2 text-xs"
                      onClick={() => void removeCustom(manifest)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="card space-y-4 border-dusk/80 bg-shadow/40" aria-labelledby="critters-heading">
          <div>
            <h2 id="critters-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
              <Ghost className="h-5 w-5 text-fey" aria-hidden />
              Built-in companions
            </h2>
            <p className="text-sm text-mist">
              Little creatures that wander the window: perching on headings, strolling along
              the tops of cards, hopping between panels, and circling your work. Select one or
              more companions — up to {MAX_CRITTER_SELECTIONS} at once.
              {!motionOn && ' They stay hidden while animations are off.'}
            </p>
          </div>

          <div
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            role="group"
            aria-label="Pixel companions"
          >
            {visibleCritterGenres().map((genre) => {
              const selected =
                genre.id === 'off' ? draft.critters.length === 0 : draft.critters.includes(genre.id);
              const preview = Array.from(new Set(genre.cast)).slice(0, 3);
              const atCap =
                genre.id !== 'off' &&
                !selected &&
                draft.critters.length >= MAX_CRITTER_SELECTIONS;
              return (
                <button
                  key={genre.id}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  aria-disabled={atCap || undefined}
                  disabled={atCap}
                  onClick={() => toggleCritter(genre.id)}
                  className={`flex h-full flex-col gap-2 rounded-lg border p-3 text-left transition ${
                    selected
                      ? 'border-arcane/50 bg-arcane/10 ring-1 ring-arcane/30'
                      : atCap
                        ? 'cursor-not-allowed border-dusk/40 bg-abyss/30 opacity-50'
                        : 'border-dusk/70 bg-abyss/50 hover:border-dusk'
                  }`}
                >
                  <span className="flex h-12 items-end gap-2" aria-hidden>
                    {preview.length === 0 ? (
                      <span className="text-xs uppercase tracking-[0.2em] text-mist">motes only</span>
                    ) : (
                      preview.map((id) => {
                        const sprite = getBuiltInCritter(id);
                        if (!sprite) return null;
                        return (
                          <PixelSpritePreview
                            key={id}
                            sprite={sprite}
                            displaySize={48}
                            animate={selected && motionOn}
                          />
                        );
                      })
                    )}
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="block font-medium text-moonlight">{genre.label}</span>
                    <span className="mt-1 text-sm text-mist">{genre.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 border-t border-dusk/60 pt-4">
            {draft.critters.length > 0 && motionOn && (
              <p className="text-sm text-mist">
                {draft.desktopCompanions
                  ? 'Companions are on your desktop and stay while Wurlding is open — even minimized.'
                  : 'Add companions to your desktop so they keep roaming after you minimize Wurlding.'}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-start gap-3">
              {draft.critters.length > 0 && motionOn && (
                <button
                  type="button"
                  className={draft.desktopCompanions ? 'btn-secondary' : 'btn-primary'}
                  onClick={toggleDesktopCompanions}
                >
                  {draft.desktopCompanions ? 'Remove from screen' : 'Add to screen'}
                </button>
              )}
              <button
                type="button"
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => void save()}
                disabled={!dirty || saveState === 'saving'}
              >
                Save companions
              </button>
            </div>
            <p className="text-sm text-mist" role="status">
              {saveState === 'saving' && 'Saving companions…'}
              {saveState === 'saved' && 'Companions saved. Wurlding will open with this cast next time.'}
              {saveState === 'error' && 'Could not save companions. Keep this window open and try again.'}
              {saveState === 'idle' && dirty && 'Save to keep this companion choice and sizes the next time you open Wurlding.'}
              {saveState === 'idle' && !dirty && 'Saved companions and sizes are used the next time you open Wurlding.'}
            </p>
          </div>
        </section>

        {scalableIds.length > 0 && (
          <section className="card space-y-4 border-dusk/80 bg-shadow/40" aria-labelledby="scale-heading">
            <div>
              <h2 id="scale-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
                <Scaling className="h-5 w-5 text-fey" aria-hidden />
                Companion scale
              </h2>
              <p className="text-sm text-mist">
                Resize selected companions from {MIN_CRITTER_SCALE_PERCENT}% to{' '}
                {MAX_CRITTER_SCALE_PERCENT}% of their default size. 100% is unchanged.
              </p>
            </div>

            <ul className="space-y-4">
              {scalableIds.map((id) => {
                const builtIn = getBuiltInCritter(id);
                const custom = customs.find((m) => m.id === id);
                const sprite = builtIn ?? (custom ? customCritterSprite(custom) : null);
                if (!sprite) return null;
                const percent = scalePercentFor(draft.critterScales, id);
                const previewUrl = custom ? customPreviewUrl(custom) : null;
                return (
                  <li
                    key={id}
                    className="flex flex-col gap-3 rounded-lg border border-dusk/60 bg-abyss/40 p-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-end justify-center" aria-hidden>
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt=""
                            className="h-12 w-12 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <PixelSpritePreview
                            sprite={sprite}
                            displaySize={48}
                            animate={motionOn}
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-moonlight">{sprite.name}</p>
                        <p className="text-xs text-mist">Default size is 100%</p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={MIN_CRITTER_SCALE_PERCENT}
                          max={MAX_CRITTER_SCALE_PERCENT}
                          step={5}
                          value={percent}
                          aria-label={`${sprite.name} scale`}
                          onChange={(e) => setScalePercent(id, Number(e.target.value))}
                          className="h-2 w-full cursor-pointer accent-arcane"
                        />
                        <label className="flex shrink-0 items-center gap-1 text-sm text-moonlight">
                          <input
                            type="number"
                            min={MIN_CRITTER_SCALE_PERCENT}
                            max={MAX_CRITTER_SCALE_PERCENT}
                            step={1}
                            value={percent}
                            aria-label={`${sprite.name} scale percent`}
                            onChange={(e) => setScalePercent(id, Number(e.target.value))}
                            className="w-16 rounded border border-dusk/70 bg-abyss/60 px-2 py-1 text-right tabular-nums"
                          />
                          <span aria-hidden>%</span>
                        </label>
                      </div>
                      {percent !== DEFAULT_CRITTER_SCALE_PERCENT && (
                        <button
                          type="button"
                          className="self-end text-xs text-arcane underline-offset-2 hover:underline"
                          onClick={() => setScalePercent(id, DEFAULT_CRITTER_SCALE_PERCENT)}
                        >
                          Reset to 100%
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="card space-y-4 border-dusk/80 bg-shadow/40" aria-labelledby="desktop-bg-heading">
          <div>
            <h2 id="desktop-bg-heading" className="section-title mb-1 flex items-center gap-2 font-[Cinzel] text-lg">
              <ImageIcon className="h-5 w-5 text-fey" aria-hidden />
              Companion desktop backgrounds
            </h2>
            <p className="text-sm text-mist">
              Pixel clearings you can set as wallpaper so desktop companions have a fitting place to
              roam.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {DESKTOP_BACKGROUNDS.map((bg) => {
              const href = desktopBgUrl(bg.file);
              return (
                <figure
                  key={bg.id}
                  className="flex flex-col gap-3 overflow-hidden rounded-lg border border-dusk/60 bg-abyss/40"
                >
                  <img
                    src={href}
                    alt={bg.alt}
                    className="max-h-52 w-full object-cover object-center"
                    loading="lazy"
                  />
                  <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
                    <span className="font-[Cinzel] text-sm font-semibold text-moonlight">{bg.title}</span>
                    <a
                      className="btn-secondary inline-flex items-center gap-2"
                      href={href}
                      download={bg.download}
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Download
                    </a>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
