import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  World,
  Story,
  Chapter,
  Scene,
  Character,
  Location,
  Faction,
  Item,
  Event,
  Connection,
  Creature,
  FamilyRelationship,
  FamilyTree,
  WorldMap,
  FieldGuideEntry,
} from '../types';
import { API_BASE } from '../api';

const now = () => new Date().toISOString();

const STORE_VERSION = 16;

const DATA_KEYS = [
  'worlds', 'stories', 'characters', 'locations', 'factions',
  'items', 'events', 'connections', 'familyRelationships',
  'customCreatures', 'maps', 'fieldGuideEntries', 'worldWebPositions', 'worldWebNodeIds', 'familyTrees', 'activeWorldId',
] as const;

type DataState = Pick<WurldState, (typeof DATA_KEYS)[number]>;

function extractData(state: WurldState): DataState {
  const data: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
    data[key] = state[key];
  }
  return data as DataState;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function syncToFile(state: WurldState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await fetch(`${API_BASE}/api/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractData(state)),
      });
    } catch {
      // Server not running — localStorage still has the data
    }
  }, 500);
}

export async function loadFromFile(): Promise<Partial<DataState> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/data`);
    const json = await res.json();
    if (json.ok && json.data) return json.data as Partial<DataState>;
  } catch {
    // Server not running
  }
  return null;
}

export async function fetchBackups(): Promise<{ name: string; timestamp: string; size: number }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/backups`);
    const json = await res.json();
    if (json.ok) return json.backups;
  } catch { /* */ }
  return [];
}

export async function restoreBackup(filename: string): Promise<Partial<DataState> | null> {
  try {
    const res = await fetch(`${API_BASE}/api/restore/${encodeURIComponent(filename)}`, { method: 'POST' });
    const json = await res.json();
    if (json.ok && json.data) return json.data as Partial<DataState>;
  } catch { /* */ }
  return null;
}

export interface WorldEntities {
  world: World | undefined;
  stories: Story[];
  chapters: Chapter[];
  characters: Character[];
  locations: Location[];
  factions: Faction[];
  items: Item[];
  events: Event[];
  connections: Connection[];
  familyRelationships: FamilyRelationship[];
  familyTrees: FamilyTree[];
  customCreatures: Creature[];
  fieldGuideEntries: FieldGuideEntry[];
}

interface WurldState {
  worlds: World[];
  stories: Story[];
  characters: Character[];
  locations: Location[];
  factions: Faction[];
  items: Item[];
  events: Event[];
  connections: Connection[];
  familyRelationships: FamilyRelationship[];
  familyTrees: FamilyTree[];
  customCreatures: Creature[];
  maps: WorldMap[];
  fieldGuideEntries: FieldGuideEntry[];
  /** Persisted World Web node positions per worldId. */
  worldWebPositions: Record<string, Record<string, { x: number; y: number }>>;
  /** Which nodes are included in the World Web (rf node ids) per worldId (or 'all'). */
  worldWebNodeIds: Record<string, string[]>;
  activeWorldId: string | null;

  setActiveWorld: (id: string | null) => void;

  addWorld: (data: Omit<World, 'id' | 'createdAt' | 'updatedAt'>) => World;
  updateWorld: (id: string, data: Partial<Omit<World, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteWorld: (id: string) => void;

  addStory: (
    data: Omit<Story, 'id' | 'createdAt' | 'updatedAt' | 'chapters' | 'episodes' | 'scenes'> & {
      chapters?: Chapter[];
      episodes?: { id?: string; title?: string; order?: number; notes?: string }[];
      scenes?: Scene[];
    },
  ) => Story;
  updateStory: (id: string, data: Partial<Omit<Story, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteStory: (id: string) => void;

  addChapter: (storyId: string, data: Omit<Chapter, 'id'>) => Chapter | undefined;
  updateChapter: (chapterId: string, data: Partial<Omit<Chapter, 'id'>>) => void;
  deleteChapter: (chapterId: string) => void;

  addCharacter: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) => Character;
  updateCharacter: (id: string, data: Partial<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteCharacter: (id: string) => void;

  addLocation: (data: Omit<Location, 'id'>) => Location;
  updateLocation: (id: string, data: Partial<Omit<Location, 'id'>>) => void;
  deleteLocation: (id: string) => void;

  addFaction: (data: Omit<Faction, 'id'>) => Faction;
  updateFaction: (id: string, data: Partial<Omit<Faction, 'id'>>) => void;
  deleteFaction: (id: string) => void;

  addItem: (data: Omit<Item, 'id'>) => Item;
  updateItem: (id: string, data: Partial<Omit<Item, 'id'>>) => void;
  deleteItem: (id: string) => void;

  addEvent: (data: Omit<Event, 'id' | 'timelineOrder'>) => Event;
  insertEventAt: (worldId: string, index: number, data: Omit<Event, 'id' | 'timelineOrder'>) => Event;
  reorderWorldEvents: (worldId: string, orderedEventIds: string[]) => void;
  moveEventOnTimeline: (worldId: string, eventId: string, direction: 'earlier' | 'later') => void;
  updateEvent: (id: string, data: Partial<Omit<Event, 'id'>>) => void;
  deleteEvent: (id: string) => void;

  addConnection: (data: Omit<Connection, 'id'>) => Connection;
  updateConnection: (id: string, data: Partial<Omit<Connection, 'id'>>) => void;
  removeConnection: (id: string) => void;

  addFamilyRelationship: (data: Omit<FamilyRelationship, 'id'>) => FamilyRelationship;
  updateFamilyRelationship: (id: string, data: Partial<Omit<FamilyRelationship, 'id'>>) => void;
  deleteFamilyRelationship: (id: string) => void;

  addFamilyTree: (data: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>) => FamilyTree;
  updateFamilyTree: (id: string, data: Partial<Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteFamilyTree: (id: string) => void;

  addCreature: (data: Omit<Creature, 'id'>) => Creature;
  updateCreature: (id: string, data: Partial<Omit<Creature, 'id'>>) => void;
  deleteCreature: (id: string) => void;

  addFieldGuideEntry: (data: Omit<FieldGuideEntry, 'id' | 'createdAt' | 'updatedAt'>) => FieldGuideEntry;
  updateFieldGuideEntry: (
    id: string,
    data: Partial<Omit<FieldGuideEntry, 'id' | 'createdAt' | 'updatedAt'>>,
  ) => void;
  deleteFieldGuideEntry: (id: string) => void;

  addMap: (data: Omit<WorldMap, 'id' | 'createdAt' | 'updatedAt'>) => WorldMap;
  updateMap: (id: string, data: Partial<Omit<WorldMap, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteMap: (id: string) => void;

  setWorldWebPosition: (worldId: string, rfNodeId: string, pos: { x: number; y: number }) => void;
  setWorldWebPositions: (worldId: string, positions: Record<string, { x: number; y: number }>) => void;
  addWorldWebNode: (worldId: string, rfNodeId: string) => void;
  removeWorldWebNode: (worldId: string, rfNodeId: string) => void;

  getWorldEntities: (worldId: string) => WorldEntities;

  _hydrateFromFile: (data: Partial<DataState>) => void;
}

function migrateState(persisted: Record<string, unknown>, version: number): Record<string, unknown> {
  let state = { ...persisted };

  if (version < 2) {
    if (!Array.isArray(state.familyRelationships)) {
      state.familyRelationships = [];
    }
  }

  if (version < 3) {
    const chars = state.characters as Record<string, unknown>[] | undefined;
    if (Array.isArray(chars)) {
      for (const c of chars) { if (c.imageUrl === undefined) c.imageUrl = ''; }
    }
    const locs = state.locations as Record<string, unknown>[] | undefined;
    if (Array.isArray(locs)) {
      for (const l of locs) { if (l.imageUrl === undefined) l.imageUrl = ''; }
    }
    const items = state.items as Record<string, unknown>[] | undefined;
    if (Array.isArray(items)) {
      for (const i of items) { if (i.imageUrl === undefined) i.imageUrl = ''; }
    }
  }

  if (version < 4) {
    if (!Array.isArray(state.maps)) {
      state.maps = [];
    }
  }

  if (version < 5) {
    const maps = state.maps as Record<string, unknown>[] | undefined;
    if (Array.isArray(maps)) {
      for (const m of maps) {
        if (!Array.isArray(m.layers)) {
          const terrainId = nanoid();
          const featuresId = nanoid();
          const markersId = nanoid();
          m.layers = [
            { id: terrainId, name: 'Terrain', visible: true, locked: false, opacity: 1, order: 0 },
            { id: featuresId, name: 'Features', visible: true, locked: false, opacity: 1, order: 1 },
            { id: markersId, name: 'Markers', visible: true, locked: false, opacity: 1, order: 2 },
          ];
          m.activeLayerId = markersId;
          const terrainTypes = new Set(['region','forest','mountain','ocean','lake','desert','swamp','plains','tundra','civilization']);
          const featureTypes = new Set(['river','road','bridge']);
          const els = m.elements as Record<string, unknown>[] | undefined;
          if (Array.isArray(els)) {
            for (const el of els) {
              if (!el.layerId) {
                const t = el.type as string;
                if (terrainTypes.has(t)) el.layerId = terrainId;
                else if (featureTypes.has(t)) el.layerId = featuresId;
                else el.layerId = markersId;
              }
            }
          }
        }
      }
    }
  }

  if (version < 6) {
    if (!Array.isArray((state as Record<string, unknown>).fieldGuideEntries)) {
      (state as Record<string, unknown>).fieldGuideEntries = [];
    }
  }

  if (version < 7) {
    const worlds = (state as Record<string, unknown>).worlds as Record<string, unknown>[] | undefined;
    if (Array.isArray(worlds)) {
      for (const w of worlds) {
        if (w.fieldGuideCoverImageUrl === undefined) w.fieldGuideCoverImageUrl = '';
      }
    }
    const entries = (state as Record<string, unknown>).fieldGuideEntries as Record<string, unknown>[] | undefined;
    if (Array.isArray(entries)) {
      for (const e of entries) {
        if (e.imageUrl === undefined) e.imageUrl = '';
      }
    }
  }

  if (version < 8) {
    if (typeof (state as Record<string, unknown>).worldWebPositions !== 'object' || !(state as Record<string, unknown>).worldWebPositions) {
      (state as Record<string, unknown>).worldWebPositions = {};
    }
  }

  if (version < 9) {
    const famTreesKey = (state as Record<string, unknown>).familyTrees;
    if (!Array.isArray(famTreesKey)) {
      (state as Record<string, unknown>).familyTrees = [];
    }
    const rels = (state as Record<string, unknown>).familyRelationships as Record<string, unknown>[] | undefined;
    if (Array.isArray(rels)) {
      for (const r of rels) {
        if (r.treeId === undefined) r.treeId = 'default';
      }
    }
    const trees = (state as Record<string, unknown>).familyTrees as Record<string, unknown>[];
    // Ensure a default tree exists if there are legacy relationships.
    if (trees.length === 0 && Array.isArray(rels) && rels.length > 0) {
      const worldIds = new Set<string>();
      for (const r of rels) {
        const wid = r.worldId as string | undefined;
        if (wid) worldIds.add(wid);
      }
      const t = now();
      (state as Record<string, unknown>).familyTrees = [...worldIds].map((wid) => ({
        id: 'default',
        worldId: wid,
        name: 'Family Tree',
        createdAt: t,
        updatedAt: t,
      }));
    }
  }

  if (version < 10) {
    const rels = (state as Record<string, unknown>).familyRelationships as Record<string, unknown>[] | undefined;
    if (Array.isArray(rels)) {
      for (const r of rels) {
        if (r.sourceHandle === undefined) r.sourceHandle = '';
        if (r.targetHandle === undefined) r.targetHandle = '';
      }
    }
  }

  if (version < 11) {
    const stories = (state as Record<string, unknown>).stories as Record<string, unknown>[] | undefined;
    if (Array.isArray(stories)) {
      for (const st of stories) {
        if (!Array.isArray((st as Record<string, unknown>).scenes)) {
          (st as Record<string, unknown>).scenes = [];
        }
      }
    }
  }

  if (version < 12) {
    const stories = (state as Record<string, unknown>).stories as Record<string, unknown>[] | undefined;
    if (Array.isArray(stories)) {
      for (const st of stories) {
        const scenes = (st as Record<string, unknown>).scenes as Record<string, unknown>[] | undefined;
        if (Array.isArray(scenes)) {
          for (const sc of scenes) {
            if ((sc as Record<string, unknown>).episodeId === undefined) {
              (sc as Record<string, unknown>).episodeId = 'episode-1';
            }
          }
        }
      }
    }
  }

  if (version < 13) {
    const stories = (state as Record<string, unknown>).stories as Record<string, unknown>[] | undefined;
    if (Array.isArray(stories)) {
      for (const st of stories) {
        if (!Array.isArray((st as Record<string, unknown>).episodes)) {
          (st as Record<string, unknown>).episodes = [
            { id: 'episode-1', title: 'Episode 1', order: 0, notes: '' },
          ];
        }
        const episodes = (st as Record<string, unknown>).episodes as Record<string, unknown>[] | undefined;
        const defaultEpisodeId =
          (Array.isArray(episodes) ? (episodes[0]?.id as string | undefined) : undefined) ?? 'episode-1';
        const scenes = (st as Record<string, unknown>).scenes as Record<string, unknown>[] | undefined;
        if (Array.isArray(scenes)) {
          for (const sc of scenes) {
            if ((sc as Record<string, unknown>).episodeId === undefined) {
              (sc as Record<string, unknown>).episodeId = defaultEpisodeId;
            }
          }
        }
      }
    }
  }

  if (version < 14) {
    const events = (state as Record<string, unknown>).events as Record<string, unknown>[] | undefined;
    if (Array.isArray(events)) {
      const byWorld = new Map<string, Record<string, unknown>[]>();
      for (const e of events) {
        const wid = e.worldId as string;
        if (!byWorld.has(wid)) byWorld.set(wid, []);
        byWorld.get(wid)!.push(e);
      }
      for (const [, list] of byWorld) {
        list.sort((a, b) => {
          const da = String(a.date ?? '').trim();
          const db = String(b.date ?? '').trim();
          if (!da && !db) {
            return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
              sensitivity: 'base',
            });
          }
          if (!da) return 1;
          if (!db) return -1;
          const byDate = da.localeCompare(db, undefined, { numeric: true });
          if (byDate !== 0) return byDate;
          return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
            sensitivity: 'base',
          });
        });
        list.forEach((ev, i) => {
          ev.timelineOrder = i;
        });
      }
    }
  }

  if (version < 15) {
    const mapList = (state as Record<string, unknown>).maps as Record<string, unknown>[] | undefined;
    if (Array.isArray(mapList)) {
      for (const m of mapList) {
        const els = m.elements as Record<string, unknown>[] | undefined;
        if (Array.isArray(els)) {
          for (const el of els) {
            if (el.boundaryShape === undefined) el.boundaryShape = 'rect';
          }
        }
      }
    }
  }

  if (version < 16) {
    const positions = (state as Record<string, unknown>).worldWebPositions as
      | Record<string, Record<string, { x: number; y: number }>>
      | undefined;

    if (typeof (state as Record<string, unknown>).worldWebNodeIds !== 'object' || !(state as Record<string, unknown>).worldWebNodeIds) {
      (state as Record<string, unknown>).worldWebNodeIds = {};
    }

    const nodeIds = (state as Record<string, unknown>).worldWebNodeIds as Record<string, unknown>;
    if (positions && typeof positions === 'object') {
      for (const [worldId, posMap] of Object.entries(positions)) {
        if (!posMap || typeof posMap !== 'object') continue;
        const keys = Object.keys(posMap);
        const existing = nodeIds[worldId];
        if (!Array.isArray(existing) || existing.length === 0) {
          nodeIds[worldId] = keys;
        }
        // Ensure the world node exists for per-world graphs.
        if (worldId !== 'all') {
          const worldRfId = `world:${worldId}`;
          const list = (nodeIds[worldId] as unknown[]);
          if (Array.isArray(list) && !list.includes(worldRfId)) {
            nodeIds[worldId] = [worldRfId, ...list.filter((x) => typeof x === 'string')];
          }
        }
      }
    }
  }

  return state;
}

const useStore = create<WurldState>()(
  persist(
    (set, get) => ({
      worlds: [],
      stories: [],
      characters: [],
      locations: [],
      factions: [],
      items: [],
      events: [],
      connections: [],
      familyRelationships: [],
      familyTrees: [],
      customCreatures: [],
      maps: [],
      fieldGuideEntries: [],
      worldWebPositions: {},
      worldWebNodeIds: {},
      activeWorldId: null,

      setActiveWorld: (id) => {
        set({ activeWorldId: id });
        syncToFile(get());
      },

      addWorld: (data) => {
        const t = now();
        const world: World = { ...data, id: nanoid(), createdAt: t, updatedAt: t };
        set((s) => ({ worlds: [...s.worlds, world] }));
        syncToFile(get());
        return world;
      },

      updateWorld: (id, data) => {
        set((s) => ({
          worlds: s.worlds.map((w) => (w.id === id ? { ...w, ...data, updatedAt: now() } : w)),
        }));
        syncToFile(get());
      },

      deleteWorld: (id) => {
        set((s) => ({
          worlds: s.worlds.filter((w) => w.id !== id),
          stories: s.stories.filter((st) => st.worldId !== id),
          characters: s.characters.filter((c) => c.worldId !== id),
          locations: s.locations.filter((l) => l.worldId !== id),
          factions: s.factions.filter((f) => f.worldId !== id),
          items: s.items.filter((i) => i.worldId !== id),
          events: s.events.filter((e) => e.worldId !== id),
          connections: s.connections.filter((c) => c.worldId !== id),
          familyRelationships: s.familyRelationships.filter((f) => f.worldId !== id),
          familyTrees: s.familyTrees.filter((t) => t.worldId !== id),
          maps: s.maps.filter((m) => m.worldId !== id),
          fieldGuideEntries: s.fieldGuideEntries.filter((fg) => fg.worldId !== id),
          activeWorldId: s.activeWorldId === id ? null : s.activeWorldId,
        }));
        syncToFile(get());
      },

      addStory: (data) => {
        const { chapters: inputChapters = [], episodes: inputEpisodes = [], scenes: inputScenes = [], ...rest } = data as unknown as {
          chapters?: Chapter[];
          episodes?: { id?: string; title?: string; order?: number; notes?: string }[];
          scenes?: Scene[];
        };
        const t = now();
        const chapters = inputChapters.map((ch) => ({ ...ch, id: ch.id || nanoid() }));
        const episodes =
          (inputEpisodes.length > 0
            ? inputEpisodes
            : [{ id: 'episode-1', title: 'Episode 1', order: 0, notes: '' }]
          ).map((ep, i) => ({
            id: ep.id || nanoid(),
            title: ep.title ?? `Episode ${i + 1}`,
            order: typeof ep.order === 'number' ? ep.order : i,
            notes: ep.notes ?? '',
          }));
        const defaultEpisodeId = episodes[0]?.id ?? 'episode-1';
        const scenes = inputScenes.map((sc, i) => ({
          ...sc,
          id: sc.id || nanoid(),
          episodeId: (sc as Scene).episodeId ?? defaultEpisodeId,
          order: typeof sc.order === 'number' ? sc.order : i,
          title: sc.title ?? 'Untitled scene',
          summary: sc.summary ?? '',
          notes: sc.notes ?? '',
          imageUrl: sc.imageUrl ?? '',
        }));
        const story: Story = { ...(rest as Omit<Story, 'id' | 'createdAt' | 'updatedAt' | 'chapters' | 'episodes' | 'scenes'>), chapters, episodes, scenes, id: nanoid(), createdAt: t, updatedAt: t };
        set((s) => ({ stories: [...s.stories, story] }));
        syncToFile(get());
        return story;
      },

      updateStory: (id, data) => {
        set((s) => ({
          stories: s.stories.map((st) => (st.id === id ? { ...st, ...data, updatedAt: now() } : st)),
        }));
        syncToFile(get());
      },

      deleteStory: (id) => {
        set((s) => ({ stories: s.stories.filter((st) => st.id !== id) }));
        syncToFile(get());
      },

      addChapter: (storyId, data) => {
        const chapter: Chapter = { ...data, id: nanoid() };
        let found = false;
        set((s) => ({
          stories: s.stories.map((st) => {
            if (st.id !== storyId) return st;
            found = true;
            return { ...st, chapters: [...st.chapters, chapter], updatedAt: now() };
          }),
        }));
        syncToFile(get());
        return found ? chapter : undefined;
      },

      updateChapter: (chapterId, data) => {
        set((s) => ({
          stories: s.stories.map((st) => {
            const idx = st.chapters.findIndex((ch) => ch.id === chapterId);
            if (idx === -1) return st;
            const next = [...st.chapters];
            next[idx] = { ...next[idx], ...data };
            return { ...st, chapters: next, updatedAt: now() };
          }),
        }));
        syncToFile(get());
      },

      deleteChapter: (chapterId) => {
        set((s) => ({
          stories: s.stories.map((st) => {
            if (!st.chapters.some((ch) => ch.id === chapterId)) return st;
            return { ...st, chapters: st.chapters.filter((ch) => ch.id !== chapterId), updatedAt: now() };
          }),
        }));
        syncToFile(get());
      },

      addCharacter: (data) => {
        const t = now();
        const character: Character = { ...data, id: nanoid(), createdAt: t, updatedAt: t };
        set((s) => ({ characters: [...s.characters, character] }));
        syncToFile(get());
        return character;
      },

      updateCharacter: (id, data) => {
        set((s) => ({
          characters: s.characters.map((c) => (c.id === id ? { ...c, ...data, updatedAt: now() } : c)),
        }));
        syncToFile(get());
      },

      deleteCharacter: (id) => {
        set((s) => ({
          characters: s.characters.filter((c) => c.id !== id),
          familyRelationships: s.familyRelationships.filter(
            (f) => f.character1Id !== id && f.character2Id !== id,
          ),
        }));
        syncToFile(get());
      },

      addLocation: (data) => {
        const location: Location = { ...data, id: nanoid() };
        set((s) => ({ locations: [...s.locations, location] }));
        syncToFile(get());
        return location;
      },

      updateLocation: (id, data) => {
        set((s) => ({ locations: s.locations.map((l) => (l.id === id ? { ...l, ...data } : l)) }));
        syncToFile(get());
      },

      deleteLocation: (id) => {
        set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }));
        syncToFile(get());
      },

      addFaction: (data) => {
        const faction: Faction = { ...data, id: nanoid() };
        set((s) => ({ factions: [...s.factions, faction] }));
        syncToFile(get());
        return faction;
      },

      updateFaction: (id, data) => {
        set((s) => ({ factions: s.factions.map((f) => (f.id === id ? { ...f, ...data } : f)) }));
        syncToFile(get());
      },

      deleteFaction: (id) => {
        set((s) => ({ factions: s.factions.filter((f) => f.id !== id) }));
        syncToFile(get());
      },

      addItem: (data) => {
        const item: Item = { ...data, id: nanoid() };
        set((s) => ({ items: [...s.items, item] }));
        syncToFile(get());
        return item;
      },

      updateItem: (id, data) => {
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
        syncToFile(get());
      },

      deleteItem: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        syncToFile(get());
      },

      addEvent: (data) => {
        const same = get().events.filter((e) => e.worldId === data.worldId);
        const nextOrder =
          same.length === 0 ? 0 : Math.max(...same.map((e) => e.timelineOrder ?? 0)) + 1;
        const event: Event = { ...data, id: nanoid(), timelineOrder: nextOrder };
        set((s) => ({ events: [...s.events, event] }));
        syncToFile(get());
        return event;
      },

      insertEventAt: (worldId, index, data) => {
        const id = nanoid();
        const event: Event = { ...data, worldId, id, timelineOrder: 0 };
        set((s) => {
          const same = s.events
            .filter((e) => e.worldId === worldId)
            .sort((a, b) => (a.timelineOrder ?? 0) - (b.timelineOrder ?? 0));
          let at = index;
          if (at < 0) at = 0;
          if (at > same.length) at = same.length;
          const merged = [...same.slice(0, at), event, ...same.slice(at)];
          const renumbered = merged.map((e, i) => ({ ...e, timelineOrder: i }));
          const others = s.events.filter((e) => e.worldId !== worldId);
          return { events: [...others, ...renumbered] };
        });
        syncToFile(get());
        return get().events.find((e) => e.id === id)!;
      },

      reorderWorldEvents: (worldId, orderedIds) => {
        set((s) => {
          const worldEvents = s.events.filter((e) => e.worldId === worldId);
          if (orderedIds.length !== worldEvents.length) return s;
          const idSet = new Set(orderedIds);
          if (!worldEvents.every((e) => idSet.has(e.id))) return s;
          const byId = new Map(worldEvents.map((e) => [e.id, e]));
          const reordered = orderedIds.map((evId, i) => ({ ...byId.get(evId)!, timelineOrder: i }));
          const others = s.events.filter((e) => e.worldId !== worldId);
          return { events: [...others, ...reordered] };
        });
        syncToFile(get());
      },

      moveEventOnTimeline: (worldId, eventId, direction) => {
        const sorted = get()
          .events.filter((e) => e.worldId === worldId)
          .sort((a, b) => (a.timelineOrder ?? 0) - (b.timelineOrder ?? 0));
        const idx = sorted.findIndex((e) => e.id === eventId);
        if (idx < 0) return;
        const newIdx = direction === 'earlier' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= sorted.length) return;
        const ids = sorted.map((e) => e.id);
        const [removed] = ids.splice(idx, 1);
        ids.splice(newIdx, 0, removed);

        set((s) => {
          const worldEvents = s.events.filter((e) => e.worldId === worldId);
          if (ids.length !== worldEvents.length) return s;
          const idSet = new Set(ids);
          if (!worldEvents.every((e) => idSet.has(e.id))) return s;
          const byId = new Map(worldEvents.map((e) => [e.id, e]));
          const reordered = ids.map((evId, i) => ({ ...byId.get(evId)!, timelineOrder: i }));
          const others = s.events.filter((e) => e.worldId !== worldId);
          return { events: [...others, ...reordered] };
        });
        syncToFile(get());
      },

      updateEvent: (id, data) => {
        set((s) => ({ events: s.events.map((e) => (e.id === id ? { ...e, ...data } : e)) }));
        syncToFile(get());
      },

      deleteEvent: (id) => {
        set((s) => {
          const victim = s.events.find((e) => e.id === id);
          if (!victim) return s;
          const worldId = victim.worldId;
          const remaining = s.events.filter((e) => e.id !== id);
          const same = remaining
            .filter((e) => e.worldId === worldId)
            .sort((a, b) => (a.timelineOrder ?? 0) - (b.timelineOrder ?? 0));
          const renumbered = same.map((e, i) => ({ ...e, timelineOrder: i }));
          const others = remaining.filter((e) => e.worldId !== worldId);
          return { events: [...others, ...renumbered] };
        });
        syncToFile(get());
      },

      addConnection: (data) => {
        const connection: Connection = { ...data, id: nanoid() };
        set((s) => ({ connections: [...s.connections, connection] }));
        syncToFile(get());
        return connection;
      },

      updateConnection: (id, data) => {
        set((s) => ({
          connections: s.connections.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
        syncToFile(get());
      },

      removeConnection: (id) => {
        set((s) => ({ connections: s.connections.filter((c) => c.id !== id) }));
        syncToFile(get());
      },

      addFamilyRelationship: (data) => {
        const rel: FamilyRelationship = { ...data, id: nanoid() };
        set((s) => ({ familyRelationships: [...s.familyRelationships, rel] }));
        syncToFile(get());
        return rel;
      },

      updateFamilyRelationship: (id, data) => {
        set((s) => ({
          familyRelationships: s.familyRelationships.map((f) => (f.id === id ? { ...f, ...data } : f)),
        }));
        syncToFile(get());
      },

      deleteFamilyRelationship: (id) => {
        set((s) => ({ familyRelationships: s.familyRelationships.filter((f) => f.id !== id) }));
        syncToFile(get());
      },

      addFamilyTree: (data) => {
        const t = now();
        const tree: FamilyTree = { ...data, id: nanoid(), createdAt: t, updatedAt: t };
        set((s) => ({ familyTrees: [...s.familyTrees, tree] }));
        syncToFile(get());
        return tree;
      },

      updateFamilyTree: (id, data) => {
        set((s) => ({
          familyTrees: s.familyTrees.map((t) => (t.id === id ? { ...t, ...data, updatedAt: now() } : t)),
        }));
        syncToFile(get());
      },

      deleteFamilyTree: (id) => {
        set((s) => ({
          familyTrees: s.familyTrees.filter((t) => t.id !== id),
          familyRelationships: s.familyRelationships.filter((r) => r.treeId !== id),
        }));
        syncToFile(get());
      },

      addCreature: (data) => {
        const creature: Creature = { ...data, id: nanoid(), isCustom: data.isCustom ?? true };
        set((s) => ({ customCreatures: [...s.customCreatures, creature] }));
        syncToFile(get());
        return creature;
      },

      updateCreature: (id, data) => {
        set((s) => ({
          customCreatures: s.customCreatures.map((cr) => (cr.id === id ? { ...cr, ...data } : cr)),
        }));
        syncToFile(get());
      },

      deleteCreature: (id) => {
        set((s) => ({ customCreatures: s.customCreatures.filter((cr) => cr.id !== id) }));
        syncToFile(get());
      },

      addFieldGuideEntry: (data) => {
        const t = now();
        const entry: FieldGuideEntry = { ...data, id: nanoid(), createdAt: t, updatedAt: t };
        set((s) => ({ fieldGuideEntries: [...s.fieldGuideEntries, entry] }));
        syncToFile(get());
        return entry;
      },

      updateFieldGuideEntry: (id, data) => {
        set((s) => ({
          fieldGuideEntries: s.fieldGuideEntries.map((fg) =>
            fg.id === id ? { ...fg, ...data, updatedAt: now() } : fg,
          ),
        }));
        syncToFile(get());
      },

      deleteFieldGuideEntry: (id) => {
        set((s) => ({ fieldGuideEntries: s.fieldGuideEntries.filter((fg) => fg.id !== id) }));
        syncToFile(get());
      },

      addMap: (data) => {
        const t = now();
        const map: WorldMap = { ...data, id: nanoid(), createdAt: t, updatedAt: t };
        set((s) => ({ maps: [...s.maps, map] }));
        syncToFile(get());
        return map;
      },

      updateMap: (id, data) => {
        set((s) => ({
          maps: s.maps.map((m) => (m.id === id ? { ...m, ...data, updatedAt: now() } : m)),
        }));
        syncToFile(get());
      },

      deleteMap: (id) => {
        set((s) => ({ maps: s.maps.filter((m) => m.id !== id) }));
        syncToFile(get());
      },

      setWorldWebPosition: (worldId, rfNodeId, pos) => {
        set((s) => ({
          worldWebPositions: {
            ...s.worldWebPositions,
            [worldId]: { ...(s.worldWebPositions[worldId] ?? {}), [rfNodeId]: pos },
          },
        }));
        syncToFile(get());
      },

      setWorldWebPositions: (worldId, positions) => {
        set((s) => ({
          worldWebPositions: {
            ...s.worldWebPositions,
            [worldId]: { ...(s.worldWebPositions[worldId] ?? {}), ...positions },
          },
        }));
        syncToFile(get());
      },

      addWorldWebNode: (worldId, rfNodeId) => {
        set((s) => {
          const existing = s.worldWebNodeIds?.[worldId] ?? [];
          if (existing.includes(rfNodeId)) return s;
          return {
            worldWebNodeIds: {
              ...s.worldWebNodeIds,
              [worldId]: [...existing, rfNodeId],
            },
          };
        });
        syncToFile(get());
      },

      removeWorldWebNode: (worldId, rfNodeId) => {
        set((s) => {
          const existing = s.worldWebNodeIds?.[worldId] ?? [];
          const next = existing.filter((x) => x !== rfNodeId);
          const nextPositions = { ...(s.worldWebPositions?.[worldId] ?? {}) };
          delete nextPositions[rfNodeId];
          return {
            worldWebNodeIds: {
              ...s.worldWebNodeIds,
              [worldId]: next,
            },
            worldWebPositions: {
              ...s.worldWebPositions,
              [worldId]: nextPositions,
            },
          };
        });
        syncToFile(get());
      },

      getWorldEntities: (worldId) => {
        const s = get();
        const stories = s.stories.filter((st) => st.worldId === worldId);
        return {
          world: s.worlds.find((w) => w.id === worldId),
          stories,
          chapters: stories.flatMap((st) => st.chapters),
          characters: s.characters.filter((c) => c.worldId === worldId),
          locations: s.locations.filter((l) => l.worldId === worldId),
          factions: s.factions.filter((f) => f.worldId === worldId),
          items: s.items.filter((i) => i.worldId === worldId),
          events: s.events.filter((e) => e.worldId === worldId),
          connections: s.connections.filter((c) => c.worldId === worldId),
          familyRelationships: s.familyRelationships.filter((f) => f.worldId === worldId),
          familyTrees: s.familyTrees.filter((t) => t.worldId === worldId),
          customCreatures: s.customCreatures,
          fieldGuideEntries: s.fieldGuideEntries.filter((fg) => fg.worldId === worldId),
        };
      },

      _hydrateFromFile: (data) => {
        set((s) => ({
          worlds: Array.isArray(data.worlds) ? data.worlds : s.worlds,
          stories: Array.isArray(data.stories) ? data.stories : s.stories,
          characters: Array.isArray(data.characters) ? data.characters : s.characters,
          locations: Array.isArray(data.locations) ? data.locations : s.locations,
          factions: Array.isArray(data.factions) ? data.factions : s.factions,
          items: Array.isArray(data.items) ? data.items : s.items,
          events: Array.isArray(data.events) ? data.events : s.events,
          connections: Array.isArray(data.connections) ? data.connections : s.connections,
          familyRelationships: Array.isArray(data.familyRelationships) ? data.familyRelationships : s.familyRelationships,
          familyTrees: Array.isArray((data as Record<string, unknown>).familyTrees)
            ? ((data as Record<string, unknown>).familyTrees as FamilyTree[])
            : s.familyTrees,
          customCreatures: Array.isArray(data.customCreatures) ? data.customCreatures : s.customCreatures,
          maps: Array.isArray(data.maps) ? data.maps : s.maps,
          fieldGuideEntries: Array.isArray((data as Record<string, unknown>).fieldGuideEntries)
            ? ((data as Record<string, unknown>).fieldGuideEntries as FieldGuideEntry[])
            : s.fieldGuideEntries,
          worldWebPositions:
            typeof (data as Record<string, unknown>).worldWebPositions === 'object' && (data as Record<string, unknown>).worldWebPositions
              ? ((data as Record<string, unknown>).worldWebPositions as Record<string, Record<string, { x: number; y: number }>>)
              : s.worldWebPositions,
          worldWebNodeIds:
            typeof (data as Record<string, unknown>).worldWebNodeIds === 'object' && (data as Record<string, unknown>).worldWebNodeIds
              ? ((data as Record<string, unknown>).worldWebNodeIds as Record<string, string[]>)
              : s.worldWebNodeIds,
          activeWorldId: data.activeWorldId !== undefined ? data.activeWorldId : s.activeWorldId,
        }));
      },
    }),
    {
      name: 'wurld-storage',
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) =>
        migrateState(persisted as Record<string, unknown>, version) as unknown as WurldState,
      merge: (persisted, current) => {
        const p = persisted as Partial<WurldState> | undefined;
        if (!p) return current;
        return {
          ...current,
          worlds: Array.isArray(p.worlds) ? p.worlds : current.worlds,
          stories: Array.isArray(p.stories) ? p.stories : current.stories,
          characters: Array.isArray(p.characters) ? p.characters : current.characters,
          locations: Array.isArray(p.locations) ? p.locations : current.locations,
          factions: Array.isArray(p.factions) ? p.factions : current.factions,
          items: Array.isArray(p.items) ? p.items : current.items,
          events: Array.isArray(p.events) ? p.events : current.events,
          connections: Array.isArray(p.connections) ? p.connections : current.connections,
          familyRelationships: Array.isArray(p.familyRelationships) ? p.familyRelationships : current.familyRelationships,
          familyTrees: Array.isArray((p as Record<string, unknown>).familyTrees)
            ? ((p as Record<string, unknown>).familyTrees as FamilyTree[])
            : current.familyTrees,
          customCreatures: Array.isArray(p.customCreatures) ? p.customCreatures : current.customCreatures,
          maps: Array.isArray(p.maps) ? p.maps : current.maps,
          fieldGuideEntries: Array.isArray((p as Record<string, unknown>).fieldGuideEntries)
            ? ((p as Record<string, unknown>).fieldGuideEntries as FieldGuideEntry[])
            : current.fieldGuideEntries,
          worldWebPositions:
            typeof (p as Record<string, unknown>).worldWebPositions === 'object' && (p as Record<string, unknown>).worldWebPositions
              ? ((p as Record<string, unknown>).worldWebPositions as Record<string, Record<string, { x: number; y: number }>>)
              : current.worldWebPositions,
          worldWebNodeIds:
            typeof (p as Record<string, unknown>).worldWebNodeIds === 'object' && (p as Record<string, unknown>).worldWebNodeIds
              ? ((p as Record<string, unknown>).worldWebNodeIds as Record<string, string[]>)
              : current.worldWebNodeIds,
          activeWorldId: p.activeWorldId !== undefined ? p.activeWorldId : current.activeWorldId,
        };
      },
    },
  ),
);

export { useStore };
export default useStore;
