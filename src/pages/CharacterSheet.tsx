import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  ArrowLeft,
  Shield,
  Heart,
  Sparkles,
  BookOpen,
  Scroll,
  Swords,
  User,
  Eye,
  Target,
  MessageSquare,
  Feather,
} from 'lucide-react';
import useStore from '../store/useStore';
import ImageUpload from '../components/ImageUpload';
import useSavedStatus from '../hooks/useSavedStatus';
import type { Character } from '../types';
import {
  ABILITY_SCORES,
  DND_ALIGNMENTS,
  DND_BACKGROUNDS,
  CHARACTER_CLASS_OPTIONS,
  DND_CLASSES,
  DND_RACES,
  DND_SKILLS,
  formatModifier,
  getAbilityModifier,
} from '../types';

const ABILITY_LABELS: Record<(typeof ABILITY_SCORES)[number], string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
};

function createDefaultDraft(worldId: string): Omit<Character, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    worldId,
    name: '',
    race: DND_RACES[0]!,
    class: DND_CLASSES[0]!,
    level: 1,
    background: DND_BACKGROUNDS[0]!,
    alignment: DND_ALIGNMENTS[4]!,
    experiencePoints: 0,
    portraitColor: '#8b5cf6',
    imageUrl: '',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    initiative: getAbilityModifier(10),
    speed: 30,
    hitPointMax: 10,
    hitPointCurrent: 10,
    hitDice: '1d10',
    proficiencyBonus: 2,
    savingThrows: [],
    skills: [],
    features: '',
    equipment: '',
    proficiencies: '',
    languages: '',
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    backstory: '',
    appearance: '',
    allies: '',
    notes: '',
  };
}

type Draft = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;

type Tab = 'character' | 'dnd';

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const { characters, worlds, activeWorldId, addCharacter, updateCharacter } = useStore();

  const defaultWorldId = useMemo(
    () => activeWorldId ?? worlds[0]?.id ?? '',
    [activeWorldId, worlds],
  );

  const [draft, setDraft] = useState<Draft>(() => createDefaultDraft(defaultWorldId));
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('character');
  const { savedStatus, markSaved, resetSaved } = useSavedStatus(1200);

  useEffect(() => {
    if (isNew) {
      setNotFound(false);
      setDraft(createDefaultDraft(defaultWorldId));
      return;
    }
    const found = characters.find((c) => c.id === id);
    if (!found) {
      setNotFound(true);
      return;
    }
    setNotFound(false);
    const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = found;
    setDraft(rest);
  }, [id, isNew, characters, defaultWorldId]);

  const patch = useCallback((data: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...data }));
    resetSaved();
  }, []);

  const dexMod = getAbilityModifier(draft.dexterity);

  const toggleSavingThrow = (ability: (typeof ABILITY_SCORES)[number]) => {
    setDraft((d) => {
      const s = new Set(d.savingThrows);
      if (s.has(ability)) s.delete(ability);
      else s.add(ability);
      return { ...d, savingThrows: Array.from(s) };
    });
  };

  const toggleSkill = (skillName: string) => {
    setDraft((d) => {
      const s = new Set(d.skills);
      if (s.has(skillName)) s.delete(skillName);
      else s.add(skillName);
      return { ...d, skills: Array.from(s) };
    });
  };

  const savingMod = (ability: (typeof ABILITY_SCORES)[number]) => {
    const base = getAbilityModifier(draft[ability]);
    return base + (draft.savingThrows.includes(ability) ? draft.proficiencyBonus : 0);
  };

  const skillModifier = (skill: (typeof DND_SKILLS)[number]) => {
    const base = getAbilityModifier(draft[skill.ability]);
    return base + (draft.skills.includes(skill.name) ? draft.proficiencyBonus : 0);
  };

  const skillsByAbility = useMemo(() => {
    const map = new Map<string, Array<(typeof DND_SKILLS)[number]>>();
    for (const s of DND_SKILLS) {
      const list = map.get(s.ability) ?? [];
      list.push(s);
      map.set(s.ability, list);
    }
    return map;
  }, []);

  const handleSave = () => {
    if (!draft.worldId) {
      window.alert('Choose a world for this character.');
      return;
    }
    if (!draft.name.trim()) {
      window.alert('Enter a character name.');
      return;
    }
    if (isNew) {
      const created = addCharacter(draft);
      navigate(`/characters/${created.id}`);
    } else if (id) {
      updateCharacter(id, draft);
      markSaved();
    }
  };

  if (!isNew && notFound) {
    return (
      <div className="card border-blood/30 bg-shadow/60 p-10 text-center">
        <h1 className="page-title mb-4 font-[Cinzel]">Character not found</h1>
        <p className="mb-6 text-mist">This hero is not in your archive.</p>
        <button type="button" className="btn-primary" onClick={() => navigate('/characters')}>
          <ArrowLeft size={18} />
          Back to characters
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-full pb-16">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-xl" aria-hidden>
        <div className="absolute -top-32 right-0 h-[28rem] w-[28rem] rounded-full bg-arcane/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-gold/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="page-header flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/characters')}>
            <ArrowLeft size={18} />
            Characters
          </button>
          <button
            type="button"
            className={savedStatus === 'saved' ? 'btn-secondary' : 'btn-primary'}
            onClick={handleSave}
          >
            <Save size={18} />
            {savedStatus === 'saved'
              ? 'Saved'
              : isNew
                ? 'Create character'
                : 'Save changes'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-dusk">
        <button
          type="button"
          onClick={() => setActiveTab('character')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
            activeTab === 'character' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <Feather size={16} />
          Character
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dnd')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${
            activeTab === 'dnd' ? 'tab-active' : 'tab-inactive'
          }`}
        >
          <Swords size={16} />
          D&D 5e Sheet
        </button>
      </div>

      {/* ========== CHARACTER TAB ========== */}
      {activeTab === 'character' && (
        <div className="space-y-8">
          {/* Identity */}
          <section className="card border-arcane/20 bg-gradient-to-br from-abyss to-shadow/90 p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-dusk/80 pb-4">
              <User className="h-5 w-5 text-arcane" aria-hidden />
              <h2 className="font-[Cinzel] text-xl font-semibold tracking-wide text-moonlight">
                Who They Are
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="flex flex-col items-center gap-3 lg:col-span-3">
                <ImageUpload
                  imageUrl={draft.imageUrl}
                  onImageChange={(url) => patch({ imageUrl: url })}
                  shape="circle"
                  size="lg"
                  fallbackColor={draft.portraitColor}
                  label="Portrait"
                />
                <div className="flex items-center gap-2 w-full">
                  <label className="label whitespace-nowrap mb-0">Color</label>
                  <input
                    type="color"
                    className="input h-8 w-12 cursor-pointer p-0.5"
                    value={draft.portraitColor}
                    onChange={(e) => patch({ portraitColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-9">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="char-name">Name</label>
                  <input
                    id="char-name"
                    className="input font-[Cinzel] text-2xl"
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder="What are they called?"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="char-world">World</label>
                  <select
                    id="char-world"
                    className="select"
                    value={draft.worldId}
                    onChange={(e) => patch({ worldId: e.target.value })}
                  >
                    <option value="">Select world…</option>
                    {worlds.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="char-race">Race / Species</label>
                  <select
                    id="char-race"
                    className="select"
                    value={draft.race}
                    onChange={(e) => patch({ race: e.target.value })}
                  >
                    {DND_RACES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="char-class">Role / Class</label>
                  <select
                    id="char-class"
                    className="select"
                    value={draft.class}
                    onChange={(e) => patch({ class: e.target.value })}
                  >
                    {CHARACTER_CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="char-align">Alignment / Nature</label>
                  <select
                    id="char-align"
                    className="select"
                    value={draft.alignment}
                    onChange={(e) => patch({ alignment: e.target.value })}
                  >
                    {DND_ALIGNMENTS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="card border-frost/15 p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Eye className="h-5 w-5 text-frost" aria-hidden />
              <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Appearance</h2>
            </div>
            <textarea
              className="textarea min-h-[160px]"
              value={draft.appearance}
              onChange={(e) => patch({ appearance: e.target.value })}
              placeholder="What do they look like? Height, build, scars, eye color, the way they carry themselves..."
            />
          </section>

          {/* Personality */}
          <section className="card border-arcane/15 p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-mystic" aria-hidden />
              <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Personality & Soul</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="personality">Personality Traits</label>
                <textarea
                  id="personality"
                  className="textarea min-h-[120px]"
                  value={draft.personalityTraits}
                  onChange={(e) => patch({ personalityTraits: e.target.value })}
                  placeholder="How do they act? What habits or quirks define them?"
                />
              </div>
              <div>
                <label className="label" htmlFor="ideals">Ideals & Beliefs</label>
                <textarea
                  id="ideals"
                  className="textarea min-h-[120px]"
                  value={draft.ideals}
                  onChange={(e) => patch({ ideals: e.target.value })}
                  placeholder="What principles drive them? What do they fight for?"
                />
              </div>
              <div>
                <label className="label" htmlFor="bonds">Bonds & Loyalties</label>
                <textarea
                  id="bonds"
                  className="textarea min-h-[120px]"
                  value={draft.bonds}
                  onChange={(e) => patch({ bonds: e.target.value })}
                  placeholder="Who or what do they care about most? What ties them to the world?"
                />
              </div>
              <div>
                <label className="label" htmlFor="flaws">Flaws & Secrets</label>
                <textarea
                  id="flaws"
                  className="textarea min-h-[120px]"
                  value={draft.flaws}
                  onChange={(e) => patch({ flaws: e.target.value })}
                  placeholder="What weaknesses do they have? What could be their undoing?"
                />
              </div>
            </div>
          </section>

          {/* Backstory */}
          <section className="card border-gold/15 bg-gradient-to-b from-abyss to-shadow/80 p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Scroll className="h-5 w-5 text-gold" aria-hidden />
              <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Backstory</h2>
            </div>
            <textarea
              className="textarea min-h-[280px]"
              value={draft.backstory}
              onChange={(e) => patch({ backstory: e.target.value })}
              placeholder="Where did they come from? What shaped them into who they are? What happened before the story begins..."
            />
          </section>

          {/* Connections & Allies */}
          <section className="card border-fey/15 p-6 md:p-8">
            <div className="mb-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-fey" aria-hidden />
              <h2 className="font-[Cinzel] text-lg font-semibold text-moonlight">Connections & Goals</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="allies">Allies & Organizations</label>
                <textarea
                  id="allies"
                  className="textarea min-h-[140px]"
                  value={draft.allies}
                  onChange={(e) => patch({ allies: e.target.value })}
                  placeholder="Who stands with them? What groups do they belong to or oppose?"
                />
              </div>
              <div>
                <label className="label" htmlFor="notes">Writer's Notes</label>
                <textarea
                  id="notes"
                  className="textarea min-h-[140px]"
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="Story arcs, plot hooks, ideas for this character..."
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ========== D&D 5e SHEET TAB ========== */}
      {activeTab === 'dnd' && (
        <div className="space-y-8">
          <div className="card border-dusk/60 bg-shadow/40 p-4">
            <p className="text-sm text-mist flex items-center gap-2">
              <Swords size={14} className="text-ember" />
              Optional game mechanics — fill these in if you want to use this character in a D&D 5e campaign.
            </p>
          </div>

          {/* Class / Level / XP / Background */}
          <section className="card border-arcane/20 p-6">
            <h3 className="section-title flex items-center gap-2 font-[Cinzel]">
              <Sparkles className="h-5 w-5 text-gold" aria-hidden />
              Class & Level
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="dnd-class">Class</label>
                <select id="dnd-class" className="select" value={draft.class} onChange={(e) => patch({ class: e.target.value })}>
                  {CHARACTER_CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dnd-level">Level</label>
                <input id="dnd-level" type="number" className="input tabular-nums" value={draft.level}
                  onChange={(e) => patch({ level: Math.max(1, Number(e.target.value) || 1) })} min={1} max={20} />
              </div>
              <div>
                <label className="label" htmlFor="dnd-bg">Background</label>
                <select id="dnd-bg" className="select" value={draft.background} onChange={(e) => patch({ background: e.target.value })}>
                  {DND_BACKGROUNDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dnd-xp">Experience Points</label>
                <input id="dnd-xp" type="number" className="input tabular-nums" value={draft.experiencePoints}
                  onChange={(e) => patch({ experiencePoints: Number(e.target.value) || 0 })} min={0} />
              </div>
            </div>
          </section>

          {/* Ability Scores */}
          <section>
            <h3 className="section-title flex items-center gap-2 font-[Cinzel]">
              <Shield className="h-5 w-5 text-frost" aria-hidden />
              Ability Scores
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {ABILITY_SCORES.map((ab) => {
                const score = draft[ab];
                const mod = getAbilityModifier(score);
                return (
                  <div key={ab} className="stat-box border-arcane/20 bg-shadow/80">
                    <span className="text-xs font-semibold uppercase tracking-widest text-mist">{ABILITY_LABELS[ab]}</span>
                    <input
                      type="number"
                      className="input mt-2 w-16 border-transparent bg-transparent text-center font-[Cinzel] text-2xl font-bold text-moonlight focus:ring-0"
                      value={score}
                      onChange={(e) => patch({ [ab]: Math.max(1, Math.min(30, Number(e.target.value) || 1)) } as Partial<Draft>)}
                      min={1} max={30}
                    />
                    <span className="mt-1 text-lg font-semibold tabular-nums text-fey">{formatModifier(mod)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Combat */}
          <section className="card border-fey/15 bg-shadow/50 p-6">
            <h3 className="section-title flex items-center gap-2 font-[Cinzel]">
              <Heart className="h-5 w-5 text-blood" aria-hidden />
              Combat
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="ac">Armor Class</label>
                <input id="ac" type="number" className="input tabular-nums" value={draft.armorClass}
                  onChange={(e) => patch({ armorClass: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label" htmlFor="init">Initiative <span className="text-mist">(DEX {formatModifier(dexMod)})</span></label>
                <input id="init" type="number" className="input tabular-nums" value={draft.initiative}
                  onChange={(e) => patch({ initiative: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label" htmlFor="speed">Speed (ft.)</label>
                <input id="speed" type="number" className="input tabular-nums" value={draft.speed}
                  onChange={(e) => patch({ speed: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div>
                <label className="label" htmlFor="prof">Proficiency Bonus</label>
                <input id="prof" type="number" className="input tabular-nums" value={draft.proficiencyBonus}
                  onChange={(e) => patch({ proficiencyBonus: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="label" htmlFor="hp-max">HP Maximum</label>
                <input id="hp-max" type="number" className="input tabular-nums" value={draft.hitPointMax}
                  onChange={(e) => patch({ hitPointMax: Number(e.target.value) || 0 })} min={0} />
              </div>
              <div>
                <label className="label" htmlFor="hp-cur">Current HP</label>
                <input id="hp-cur" type="number" className="input tabular-nums" value={draft.hitPointCurrent}
                  onChange={(e) => patch({ hitPointCurrent: Number(e.target.value) || 0 })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="hit-dice">Hit Dice</label>
                <input id="hit-dice" className="input font-mono" value={draft.hitDice}
                  onChange={(e) => patch({ hitDice: e.target.value })} placeholder="1d10" />
              </div>
            </div>
          </section>

          {/* Saving Throws & Skills */}
          <div className="grid gap-8 xl:grid-cols-2">
            <section className="card border-mystic/20 p-6">
              <h3 className="section-title font-[Cinzel]">Saving Throws</h3>
              <ul className="space-y-2">
                {ABILITY_SCORES.map((ab) => (
                  <li key={ab} className="flex items-center justify-between gap-3 rounded-lg border border-dusk/60 bg-abyss/50 px-3 py-2">
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-silver">
                      <input type="checkbox" className="h-4 w-4 rounded border-dusk bg-shadow text-arcane focus:ring-arcane/40"
                        checked={draft.savingThrows.includes(ab)} onChange={() => toggleSavingThrow(ab)} />
                      <span className="capitalize">{ab}</span>
                    </label>
                    <span className="font-[Cinzel] text-sm font-semibold tabular-nums text-fey">{formatModifier(savingMod(ab))}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card border-fey/20 p-6">
              <h3 className="section-title font-[Cinzel]">Skills</h3>
              <div className="space-y-6">
                {ABILITY_SCORES.map((ab) => {
                  const list = skillsByAbility.get(ab);
                  if (!list?.length) return null;
                  return (
                    <div key={ab}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-mist">{ABILITY_LABELS[ab]} skills</p>
                      <ul className="space-y-1.5">
                        {list.map((skill) => (
                          <li key={skill.name} className="flex items-center justify-between gap-2 rounded-md border border-dusk/40 bg-shadow/40 px-2 py-1.5">
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-silver">
                              <input type="checkbox" className="h-3.5 w-3.5 rounded border-dusk bg-shadow text-fey focus:ring-fey/40"
                                checked={draft.skills.includes(skill.name)} onChange={() => toggleSkill(skill.name)} />
                              {skill.name}
                            </label>
                            <span className="text-xs font-semibold tabular-nums text-moonlight">{formatModifier(skillModifier(skill))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Features, Equipment, Proficiencies */}
          <section className="card border-gold/15 bg-gradient-to-b from-abyss to-shadow/80 p-6 md:p-8">
            <h3 className="section-title flex items-center gap-2 font-[Cinzel]">
              <BookOpen className="h-5 w-5 text-gold" aria-hidden />
              Features & Gear
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="features">Features & Traits</label>
                <textarea id="features" className="textarea min-h-[140px]" value={draft.features}
                  onChange={(e) => patch({ features: e.target.value })} placeholder="Class features, racial traits, feats…" />
              </div>
              <div>
                <label className="label" htmlFor="equipment">Equipment</label>
                <textarea id="equipment" className="textarea min-h-[140px]" value={draft.equipment}
                  onChange={(e) => patch({ equipment: e.target.value })} placeholder="Weapons, armor, gear, treasure…" />
              </div>
              <div>
                <label className="label" htmlFor="proficiencies">Proficiencies</label>
                <textarea id="proficiencies" className="textarea min-h-[100px]" value={draft.proficiencies}
                  onChange={(e) => patch({ proficiencies: e.target.value })} placeholder="Weapon & tool proficiencies…" />
              </div>
              <div>
                <label className="label" htmlFor="languages">Languages</label>
                <textarea id="languages" className="textarea min-h-[100px]" value={draft.languages}
                  onChange={(e) => patch({ languages: e.target.value })} placeholder="Common, Elvish…" />
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
