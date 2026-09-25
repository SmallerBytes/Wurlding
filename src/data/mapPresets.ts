import kingdomsUrl from '../assets/maps/preset-kingdoms.png';
import realmUrl from '../assets/maps/preset-realm.png';
import islesUrl from '../assets/maps/preset-isles.png';

export interface MapPreset {
  id: string;
  name: string;
  description: string;
  url: string;
  /** Suggested background colour behind the parchment so edges blend in. */
  backgroundColor: string;
}

/** Built-in maps users can start from instead of uploading their own. */
export const MAP_PRESETS: MapPreset[] = [
  {
    id: 'kingdoms',
    name: 'The Old Kingdoms',
    description:
      'Densely illustrated ink realm — castles, walled city, villages, pine and broadleaf forests, snowy peaks, a marsh and a smoking wasteland.',
    url: kingdomsUrl,
    backgroundColor: '#2b251c',
  },
  {
    id: 'realm',
    name: 'The Untitled Realm',
    description: 'A single continent — mountains, forests, a river delta and an eastern desert.',
    url: realmUrl,
    backgroundColor: '#2a2118',
  },
  {
    id: 'isles',
    name: 'The Shattered Isles',
    description: 'An archipelago with a volcano, jungle isle, reefs and a sunken wreck.',
    url: islesUrl,
    backgroundColor: '#14202a',
  },
];

export function findMapPreset(id: string | undefined | null): MapPreset | undefined {
  if (!id) return undefined;
  return MAP_PRESETS.find((p) => p.id === id);
}
