export interface World {
  id: string;
  name: string;
  description: string;
  genre: Genre;
  coverColor: string;
  /** Optional cover image for the world's Field Guide. */
  fieldGuideCoverImageUrl?: string;
  history: string;
  geography: string;
  cultures: string;
  religions: string;
  magicSystem: string;
  technology: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type Genre = 'dark-fantasy' | 'high-fantasy' | 'science-fiction' | 'mythology' | 'horror' | 'steampunk' | 'post-apocalyptic' | 'custom';

export interface Story {
  id: string;
  worldId: string;
  title: string;
  synopsis: string;
  genre: string;
  status: 'draft' | 'in-progress' | 'complete';
  chapters: Chapter[];
  episodes: Episode[];
  scenes: Scene[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  notes: string;
}

export interface Episode {
  id: string;
  title: string;
  order: number;
  notes: string;
}

export interface Scene {
  id: string;
  /** Episode this scene belongs to (storyboard). */
  episodeId: string;
  order: number;
  title: string;
  summary: string;
  notes: string;
  imageUrl: string;
}

export interface Character {
  id: string;
  worldId: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  alignment: string;
  experiencePoints: number;
  portraitColor: string;
  imageUrl: string;

  // Ability Scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Combat
  armorClass: number;
  initiative: number;
  speed: number;
  hitPointMax: number;
  hitPointCurrent: number;
  hitDice: string;

  // Proficiency
  proficiencyBonus: number;
  savingThrows: string[];
  skills: string[];

  // Features
  features: string;
  equipment: string;
  proficiencies: string;
  languages: string;

  // Backstory
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  appearance: string;
  allies: string;
  notes: string;

  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  worldId: string;
  name: string;
  type: LocationType;
  description: string;
  notes: string;
  imageUrl: string;
}

export type LocationType = 'city' | 'town' | 'village' | 'dungeon' | 'wilderness' | 'mountain' | 'ocean' | 'plane' | 'realm' | 'ruins' | 'fortress' | 'other';

export interface Faction {
  id: string;
  worldId: string;
  name: string;
  type: string;
  description: string;
  goals: string;
  leader: string;
  notes: string;
}

export interface Item {
  id: string;
  worldId: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  properties: string;
  notes: string;
  imageUrl: string;
}

export interface Event {
  id: string;
  worldId: string;
  /** Position on this world’s timeline (0 = earliest). Renumbered when you reorder. */
  timelineOrder: number;
  name: string;
  date: string;
  description: string;
  significance: string;
  notes: string;
}

export interface FamilyRelationship {
  id: string;
  worldId: string;
  /** Which family tree this relationship belongs to. */
  treeId: string;
  character1Id: string;
  character1Name: string;
  character2Id: string;
  character2Name: string;
  type: FamilyRelationType;
  /** React Flow handle ids to preserve where the link attaches. */
  sourceHandle?: string;
  targetHandle?: string;
  notes: string;
}

export interface FamilyTree {
  id: string;
  worldId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type FamilyRelationType =
  | 'parent'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'uncle-aunt'
  | 'cousin'
  | 'adopted'
  | 'ward'
  | 'betrothed';

export const FAMILY_RELATION_TYPES: { value: FamilyRelationType; label: string; description: string }[] = [
  { value: 'parent', label: 'Parent / Child', description: 'First character is parent of second' },
  { value: 'spouse', label: 'Spouse', description: 'Characters are married or bonded' },
  { value: 'sibling', label: 'Sibling', description: 'Characters share one or both parents' },
  { value: 'grandparent', label: 'Grandparent / Grandchild', description: 'First is grandparent of second' },
  { value: 'uncle-aunt', label: 'Uncle/Aunt / Nephew/Niece', description: 'First is uncle or aunt of second' },
  { value: 'cousin', label: 'Cousin', description: 'Characters are cousins' },
  { value: 'adopted', label: 'Adopted', description: 'First adopted second as their child' },
  { value: 'ward', label: 'Guardian / Ward', description: 'First is guardian of second' },
  { value: 'betrothed', label: 'Betrothed', description: 'Characters are promised to each other' },
];

export const FAMILY_RELATION_LABELS: Record<FamilyRelationType, string> = {
  parent: 'Parent of',
  spouse: 'Spouse of',
  sibling: 'Sibling of',
  grandparent: 'Grandparent of',
  'uncle-aunt': 'Uncle/Aunt of',
  cousin: 'Cousin of',
  adopted: 'Adopted parent of',
  ward: 'Guardian of',
  betrothed: 'Betrothed to',
};

export type MapElementType =
  | 'region' | 'forest' | 'mountain' | 'ocean' | 'lake' | 'desert' | 'swamp' | 'plains' | 'tundra'
  | 'city' | 'town' | 'village'
  | 'castle' | 'ruins' | 'temple' | 'cave' | 'dungeon'
  | 'river' | 'road' | 'bridge'
  | 'civilization' | 'landmark';

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
}

/** How the element’s footprint is drawn on the map (markers use a subset visually). */
export type MapBoundaryShape = 'rect' | 'circle' | 'triangle' | 'polygon';

export interface MapElement {
  id: string;
  type: MapElementType;
  layerId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  notes: string;
  locationId: string;
  /** Default `rect` (legacy). `polygon` uses `boundaryPoints` relative to center (x, y). */
  boundaryShape?: MapBoundaryShape;
  /** Vertices relative to element center; only when `boundaryShape === 'polygon'`. */
  boundaryPoints?: { dx: number; dy: number }[];
}

export interface WorldMap {
  id: string;
  worldId: string;
  name: string;
  elements: MapElement[];
  layers: MapLayer[];
  activeLayerId: string;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface Connection {
  id: string;
  worldId: string;
  sourceId: string;
  sourceType: EntityType;
  sourceName: string;
  targetId: string;
  targetType: EntityType;
  targetName: string;
  relationship: string;
  description: string;
}

export type EntityType = 'world' | 'story' | 'character' | 'location' | 'faction' | 'item' | 'event' | 'creature';

export interface Creature {
  id: string;
  name: string;
  source: CreatureSource;
  type: string;
  size: string;
  alignment: string;
  armorClass: number;
  hitPoints: string;
  speed: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  challengeRating: string;
  abilities: string;
  actions: string;
  description: string;
  lore: string;
  habitat: string;
  isCustom?: boolean;
}

export interface FieldGuideEntry {
  id: string;
  worldId: string;
  /** Optional reference to an existing creature (SRD/myth/custom). */
  creatureId?: string;
  imageUrl: string;
  name: string;
  /** e.g. Beast, Spirit, Humanoid, Aberration, etc. */
  type: string;
  /** Freeform: "Common", "Rare", "Extinct", etc. */
  rarity: string;
  /** Short overview shown on cards / list. */
  description: string;
  /** Longer in-world notes for your setting. */
  lore: string;
  habitat: string;
  /** Optional danger / power indicator (CR-like, but narrative-friendly). */
  threat: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CreatureSource =
  | 'srd'
  | 'mythology-greek'
  | 'mythology-norse'
  | 'mythology-celtic'
  | 'mythology-egyptian'
  | 'mythology-japanese'
  | 'lovecraftian'
  | 'fae'
  | 'folklore'
  | 'custom';

export const ABILITY_SCORES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const;

export const DND_RACES = [
  'Human', 'Elf', 'Half-Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc',
  'Tiefling', 'Dragonborn', 'Aasimar', 'Goliath', 'Tabaxi', 'Kenku',
  'Firbolg', 'Lizardfolk', 'Goblin', 'Bugbear', 'Kobold', 'Orc',
  'Changeling', 'Warforged', 'Shifter', 'Custom'
];

export const DND_CLASSES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
  'Artificer', 'Blood Hunter', 'Custom'
];

/** Narrative / world-building roles (not tied to D&D mechanics). */
export const NARRATIVE_ROLES = [
  'Adventurer', 'Artisan', 'Assassin', 'Bandit', 'Bounty Hunter', 'Captain',
  'Commoner', 'Courtesan', 'Criminal', 'Diplomat', 'Explorer', 'Farmer',
  'Guard', 'Healer', 'Hunter', 'Innkeeper', 'Knight', 'Mercenary',
  'Merchant', 'Miner', 'Noble', 'Peasant', 'Pirate', 'Priest',
  'Royalty', 'Scholar', 'Scout', 'Servant', 'Soldier', 'Spy',
  'Thief', 'Traveler', 'Warrior',
] as const;

/** Full class dropdown: D&D classes first, then story roles, then Custom. */
export const CHARACTER_CLASS_OPTIONS = [
  ...DND_CLASSES.filter((c) => c !== 'Custom'),
  ...NARRATIVE_ROLES,
  'Custom',
] as const;

export const DND_ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
];

export const DND_SKILLS = [
  { name: 'Acrobatics', ability: 'dexterity' },
  { name: 'Animal Handling', ability: 'wisdom' },
  { name: 'Arcana', ability: 'intelligence' },
  { name: 'Athletics', ability: 'strength' },
  { name: 'Deception', ability: 'charisma' },
  { name: 'History', ability: 'intelligence' },
  { name: 'Insight', ability: 'wisdom' },
  { name: 'Intimidation', ability: 'charisma' },
  { name: 'Investigation', ability: 'intelligence' },
  { name: 'Medicine', ability: 'wisdom' },
  { name: 'Nature', ability: 'intelligence' },
  { name: 'Perception', ability: 'wisdom' },
  { name: 'Performance', ability: 'charisma' },
  { name: 'Persuasion', ability: 'charisma' },
  { name: 'Religion', ability: 'intelligence' },
  { name: 'Sleight of Hand', ability: 'dexterity' },
  { name: 'Stealth', ability: 'dexterity' },
  { name: 'Survival', ability: 'wisdom' },
] as const;

export const DND_BACKGROUNDS = [
  'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero',
  'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage',
  'Sailor', 'Soldier', 'Urchin', 'Custom'
];

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
