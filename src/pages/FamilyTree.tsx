import { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection as FlowConnection,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  type NodeProps,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useStore from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import type { FamilyRelationship, FamilyRelationType, Character, FamilyTree } from '../types';
import { FAMILY_RELATION_TYPES, FAMILY_RELATION_LABELS } from '../types';
import { Plus, X, Trash2, GitBranch, Heart, Users, ArrowRight, Save } from 'lucide-react';
import useSavedStatus from '../hooks/useSavedStatus';

const VOID = '#0a0a0f';

const H_SPACING = 280;
const V_SPACING = 200;

const BADGE_BY_LEVEL = ['badge-arcane', 'badge-fey', 'badge-frost', 'badge-gold', 'badge-ember'] as const;

function levelBadgeClass(level: number): string {
  const idx = Math.max(0, Math.min(BADGE_BY_LEVEL.length - 1, Math.floor(level / 4) % BADGE_BY_LEVEL.length));
  return BADGE_BY_LEVEL[idx];
}

function edgeStyleForType(type: FamilyRelationType): {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  label: string;
  markerEnd?: { type: MarkerType; color: string };
} {
  switch (type) {
    case 'parent':
      return {
        stroke: '#f59e0b',
        strokeWidth: 2.5,
        label: 'Parent → Child',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      };
    case 'spouse':
      return {
        stroke: '#f472b6',
        strokeWidth: 2,
        strokeDasharray: '8,6',
        label: `♥ ${FAMILY_RELATION_LABELS.spouse}`,
      };
    case 'sibling':
      return {
        stroke: '#22d3ee',
        strokeWidth: 2,
        strokeDasharray: '2,6',
        label: 'Siblings',
      };
    case 'grandparent':
      return {
        stroke: '#d97706',
        strokeWidth: 1.5,
        label: FAMILY_RELATION_LABELS.grandparent,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' },
      };
    case 'uncle-aunt':
      return {
        stroke: '#a78bfa',
        strokeWidth: 2,
        strokeDasharray: '2,5',
        label: FAMILY_RELATION_LABELS['uncle-aunt'],
      };
    case 'cousin':
      return {
        stroke: '#34d399',
        strokeWidth: 1.5,
        strokeDasharray: '1,4',
        label: FAMILY_RELATION_LABELS.cousin,
      };
    case 'adopted':
      return {
        stroke: '#fb923c',
        strokeWidth: 2,
        strokeDasharray: '6,5',
        label: FAMILY_RELATION_LABELS.adopted,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#fb923c' },
      };
    case 'ward':
      return {
        stroke: '#60a5fa',
        strokeWidth: 1.5,
        strokeDasharray: '5,4',
        label: FAMILY_RELATION_LABELS.ward,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
      };
    case 'betrothed':
      return {
        stroke: '#fb7185',
        strokeWidth: 2,
        strokeDasharray: '7,5',
        label: FAMILY_RELATION_LABELS.betrothed,
      };
    default:
      return {
        stroke: '#8888aa',
        strokeWidth: 1.5,
        label: '',
      };
  }
}

const DIRECTED_FAMILY_TYPES: FamilyRelationType[] = ['parent', 'grandparent', 'adopted', 'ward'];

function relationshipEdgeLabel(type: FamilyRelationType): string {
  const spec = edgeStyleForType(type).label;
  if (spec) return spec;
  return FAMILY_RELATION_LABELS[type];
}

export type FamilyMemberNodeData = {
  character: Character;
  badgeClass: string;
};

type FamilyMemberFlowNode = Node<FamilyMemberNodeData, 'familyMember'>;

function FamilyMemberNode({ data, selected }: NodeProps<FamilyMemberFlowNode>) {
  const navigate = useNavigate();
  const c = data.character;
  const accent = c.portraitColor || '#8b5cf6';

  const shell: CSSProperties = {
    minWidth: 200,
    maxWidth: 240,
    padding: '12px 14px',
    borderRadius: 14,
    cursor: 'pointer',
    background: `linear-gradient(155deg, rgba(18,18,26,0.98) 0%, rgba(26,26,46,0.95) 45%, rgba(18,18,26,0.98) 100%)`,
    border: `1px solid color-mix(in srgb, ${accent} 55%, #252540)`,
    boxShadow: selected
      ? `0 0 0 2px color-mix(in srgb, ${accent} 65%, transparent), 0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)`
      : `0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)`,
  };

  return (
    <div
      role="button"
      tabIndex={0}
      style={shell}
      onClick={() => navigate(`/characters/${c.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/characters/${c.id}`);
        }
      }}
    >
      <Handle type="target" position={Position.Top} id="t" className="!bg-mist/50 !border-dusk !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} id="l" className="!bg-mist/50 !border-dusk !w-2.5 !h-2.5" />
      <div className="flex gap-3 items-start">
        <div
          className="shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-[#12121a]"
          style={{
            width: 48,
            height: 48,
            background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${accent} 90%, #fff), ${accent})`,
            boxShadow: `0 0 20px color-mix(in srgb, ${accent} 45%, transparent)`,
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-display font-bold text-moonlight text-sm leading-snug tracking-wide truncate"
              style={{ textShadow: `0 0 20px color-mix(in srgb, ${accent} 35%, transparent)` }}
            >
              {c.name}
            </h3>
            <span className={`badge shrink-0 ${data.badgeClass}`}>Lv {c.level}</span>
          </div>
          <p className="text-xs text-mist mt-1 leading-relaxed">
            {c.race}
            <span className="text-dusk mx-1">·</span>
            {c.class}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} id="b" className="!bg-mist/50 !border-dusk !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} id="r" className="!bg-mist/50 !border-dusk !w-2.5 !h-2.5" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  familyMember: FamilyMemberNode,
};

function collectNodeIds(rels: FamilyRelationship[]): Set<string> {
  const ids = new Set<string>();
  for (const r of rels) {
    ids.add(r.character1Id);
    ids.add(r.character2Id);
  }
  return ids;
}

function buildTreeLayout(
  rels: FamilyRelationship[],
  charMap: Map<string, Character>,
): Map<string, { x: number; y: number }> {
  const nodeIds = collectNodeIds(rels);
  const positions = new Map<string, { x: number; y: number }>();
  if (nodeIds.size === 0) return positions;

  const sortedIds = [...nodeIds].filter((id) => charMap.has(id)).sort((a, b) => {
    const na = charMap.get(a)?.name ?? '';
    const nb = charMap.get(b)?.name ?? '';
    return na.localeCompare(nb);
  });

  const parentRels = rels.filter((r) => DIRECTED_FAMILY_TYPES.includes(r.type));
  const spouseRels = rels.filter((r) => r.type === 'spouse');

  if (parentRels.length === 0) {
    const n = sortedIds.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
    sortedIds.forEach((id, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      positions.set(id, { x: col * H_SPACING, y: row * V_SPACING });
    });
    return positions;
  }

  const childrenInParent = new Set(parentRels.map((r) => r.character2Id));
  const childrenOf = new Map<string, string[]>();
  for (const r of parentRels) {
    const list = childrenOf.get(r.character1Id) ?? [];
    list.push(r.character2Id);
    childrenOf.set(r.character1Id, list);
  }

  const depth = new Map<string, number>();
  for (const id of sortedIds) {
    if (!childrenInParent.has(id)) depth.set(id, 0);
  }
  for (const id of sortedIds) {
    if (!depth.has(id)) depth.set(id, 0);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard++ < 200) {
    changed = false;
    for (const r of parentRels) {
      const pd = depth.get(r.character1Id);
      if (pd === undefined) continue;
      const next = pd + 1;
      const cur = depth.get(r.character2Id);
      if (cur === undefined || next > cur) {
        depth.set(r.character2Id, next);
        changed = true;
      }
    }
  }

  for (const r of spouseRels) {
    const a = r.character1Id;
    const b = r.character2Id;
    if (!nodeIds.has(a) || !nodeIds.has(b)) continue;
    const m = Math.max(depth.get(a) ?? 0, depth.get(b) ?? 0);
    depth.set(a, m);
    depth.set(b, m);
  }

  const byLayer = new Map<number, string[]>();
  for (const id of sortedIds) {
    const d = depth.get(id) ?? 0;
    const row = byLayer.get(d) ?? [];
    row.push(id);
    byLayer.set(d, row);
  }

  for (const [, row] of byLayer) {
    row.sort((a, b) => (charMap.get(a)?.name ?? '').localeCompare(charMap.get(b)?.name ?? ''));
  }

  const spousePairs = new Map<string, string>();
  for (const r of spouseRels) {
    spousePairs.set(r.character1Id, r.character2Id);
    spousePairs.set(r.character2Id, r.character1Id);
  }

  for (const [, row] of byLayer) {
    for (let i = 0; i < row.length; i++) {
      const partner = spousePairs.get(row[i]);
      if (!partner) continue;
      const pj = row.indexOf(partner);
      if (pj === -1 || pj === i + 1 || pj === i - 1) continue;
      row.splice(pj, 1);
      row.splice(i + 1, 0, partner);
    }
  }

  for (const [layer, row] of byLayer) {
    const rowWidth = (row.length - 1) * H_SPACING;
    const startX = -rowWidth / 2;
    row.forEach((id, i) => {
      positions.set(id, { x: startX + i * H_SPACING, y: layer * V_SPACING });
    });
  }

  return positions;
}

function buildEdges(rels: FamilyRelationship[]): Edge[] {
  return rels.map((r) => {
    const spec = edgeStyleForType(r.type);
    const showMarker = DIRECTED_FAMILY_TYPES.includes(r.type);

    return {
      id: r.id,
      source: r.character1Id,
      target: r.character2Id,
      sourceHandle: r.sourceHandle || undefined,
      targetHandle: r.targetHandle || undefined,
      type: 'smoothstep',
      label: relationshipEdgeLabel(r.type),
      animated: r.type === 'spouse' || r.type === 'betrothed',
      style: {
        stroke: spec.stroke,
        strokeWidth: spec.strokeWidth,
        strokeDasharray: spec.strokeDasharray,
      },
      markerEnd:
        showMarker && spec.markerEnd
          ? {
              type: spec.markerEnd.type,
              color: spec.markerEnd.color,
              width: 18,
              height: 18,
            }
          : undefined,
      labelStyle: {
        fill: spec.stroke,
        fontSize: 11,
        fontWeight: 600,
      },
      labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.92 },
      labelBgPadding: [6, 4] as [number, number],
      data: { relationship: r },
    } satisfies Edge;
  });
}

export default function FamilyTree() {
  const navigate = useNavigate();
  const worlds = useStore((s) => s.worlds);
  const characters = useStore((s) => s.characters);
  const familyRelationships = useStore((s) => s.familyRelationships);
  const familyTrees = useStore((s) => s.familyTrees);
  const activeWorldId = useStore((s) => s.activeWorldId);
  const addFamilyTree = useStore((s) => s.addFamilyTree);
  const updateFamilyTree = useStore((s) => s.updateFamilyTree);
  const deleteFamilyTree = useStore((s) => s.deleteFamilyTree);
  const addFamilyRelationship = useStore((s) => s.addFamilyRelationship);
  const deleteFamilyRelationship = useStore((s) => s.deleteFamilyRelationship);

  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTreeId, setActiveTreeId] = useState<string>('');
  const [treeNameDraft, setTreeNameDraft] = useState('');
  const [renamingTree, setRenamingTree] = useState(false);
  const { savedStatus: renameSaved, markSaved: markRenameSaved, resetSaved: resetRenameSaved } = useSavedStatus(1200);
  const [char1Id, setChar1Id] = useState('');
  const [char2Id, setChar2Id] = useState('');
  const [relType, setRelType] = useState<FamilyRelationType>('parent');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [draftRelType, setDraftRelType] = useState<FamilyRelationType>('parent');
  const [draftNotes, setDraftNotes] = useState('');

  const worldCharacters = useMemo(
    () => (activeWorldId ? characters.filter((c) => c.worldId === activeWorldId) : []),
    [characters, activeWorldId],
  );

  const worldTrees = useMemo(
    () => (activeWorldId ? familyTrees.filter((t) => t.worldId === activeWorldId) : []),
    [familyTrees, activeWorldId],
  );

  useEffect(() => {
    if (!activeWorldId) {
      setActiveTreeId('');
      setRenamingTree(false);
      setTreeNameDraft('');
      return;
    }
    if (worldTrees.length === 0) {
      const created = addFamilyTree({ worldId: activeWorldId, name: 'Family Tree' });
      setActiveTreeId(created.id);
      setTreeNameDraft(created.name);
      setRenamingTree(false);
      return;
    }
    if (!activeTreeId || !worldTrees.some((t) => t.id === activeTreeId)) {
      setActiveTreeId(worldTrees[0]!.id);
      setTreeNameDraft(worldTrees[0]!.name);
      setRenamingTree(false);
    }
  }, [activeWorldId, worldTrees, activeTreeId, addFamilyTree]);

  const activeTree: FamilyTree | null = useMemo(
    () => (activeTreeId ? worldTrees.find((t) => t.id === activeTreeId) ?? null : null),
    [worldTrees, activeTreeId],
  );

  const worldRels = useMemo(
    () =>
      activeWorldId && activeTreeId
        ? familyRelationships.filter((f) => f.worldId === activeWorldId && f.treeId === activeTreeId)
        : [],
    [familyRelationships, activeWorldId, activeTreeId],
  );

  const charMap = useMemo(() => {
    const m = new Map<string, Character>();
    for (const c of worldCharacters) m.set(c.id, c);
    return m;
  }, [worldCharacters]);

  const graphCharacterIds = useMemo(() => collectNodeIds(worldRels), [worldRels]);

  const initialNodes: FamilyMemberFlowNode[] = useMemo(() => {
    const layout = buildTreeLayout(worldRels, charMap);
    const nodes: FamilyMemberFlowNode[] = [];
    for (const id of graphCharacterIds) {
      const c = charMap.get(id);
      if (!c) continue;
      const pos = layout.get(id) ?? { x: 0, y: 0 };
      nodes.push({
        id,
        type: 'familyMember',
        position: pos,
        data: {
          character: c,
          badgeClass: levelBadgeClass(c.level),
        },
      });
    }
    return nodes;
  }, [worldRels, charMap, graphCharacterIds]);

  const initialEdges: Edge[] = useMemo(() => buildEdges(worldRels), [worldRels]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return initialNodes.map((n) => {
        const existing = prevById.get(n.id);
        return existing ? { ...n, position: existing.position } : n;
      });
    });
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges((prev) => {
      const drafts = prev.filter((e) => (e.data as { draft?: boolean } | undefined)?.draft);
      return [...initialEdges, ...drafts];
    });
  }, [initialEdges, setEdges]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [edges, selectedEdgeId]);

  const selectedDraft = useMemo(() => {
    if (!selectedEdge) return false;
    return (selectedEdge.data as { draft?: boolean } | undefined)?.draft === true;
  }, [selectedEdge]);

  useEffect(() => {
    if (!selectedEdgeId || !selectedDraft) return;
    const e = edges.find((x) => x.id === selectedEdgeId);
    const d = e?.data as { relationshipType?: FamilyRelationType; notes?: string } | undefined;
    setDraftRelType(d?.relationshipType ?? 'parent');
    setDraftNotes(d?.notes ?? '');
  }, [selectedEdgeId, selectedDraft, edges]);

  const patchDraft = useCallback(
    (type: FamilyRelationType, notesText: string) => {
      if (!selectedEdgeId) return;
      setDraftRelType(type);
      setDraftNotes(notesText);
      setEdges((eds) =>
        eds.map((e) =>
          e.id === selectedEdgeId && (e.data as { draft?: boolean } | undefined)?.draft
            ? { ...e, label: relationshipEdgeLabel(type), data: { draft: true as const, relationshipType: type, notes: notesText } }
            : e,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const onConnect = useCallback(
    (c: FlowConnection) => {
      if (!activeWorldId || !activeTreeId) return;
      if (!c.source || !c.target || c.source === c.target) return;
      const id = `draft-${c.source}-${c.target}-${Date.now()}`;
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            id,
            type: 'smoothstep',
            animated: false,
            label: relationshipEdgeLabel('parent'),
            data: { draft: true as const, relationshipType: 'parent' as const, notes: '' },
            style: { stroke: '#8888aa', strokeWidth: 1.5 },
            labelStyle: { fill: '#b8b8d0', fontSize: 11, fontWeight: 600 },
            labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.92 },
            labelBgPadding: [6, 4] as [number, number],
          },
          eds,
        ),
      );
      setSelectedEdgeId(id);
    },
    [activeWorldId, activeTreeId, setEdges],
  );

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedEdgeId(null), []);

  const saveDraft = useCallback(() => {
    if (!activeWorldId || !activeTreeId || !selectedEdge || !selectedDraft) return;
    const a = charMap.get(selectedEdge.source);
    const b = charMap.get(selectedEdge.target);
    if (!a || !b) return;
    addFamilyRelationship({
      worldId: activeWorldId,
      treeId: activeTreeId,
      character1Id: a.id,
      character1Name: a.name,
      character2Id: b.id,
      character2Name: b.name,
      type: draftRelType,
      sourceHandle: (selectedEdge as unknown as { sourceHandle?: string }).sourceHandle || '',
      targetHandle: (selectedEdge as unknown as { targetHandle?: string }).targetHandle || '',
      notes: draftNotes.trim(),
    });
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
    setSelectedEdgeId(null);
  }, [activeWorldId, activeTreeId, selectedEdge, selectedDraft, charMap, addFamilyRelationship, draftRelType, draftNotes, setEdges]);

  const discardDraft = useCallback(() => {
    if (!selectedEdgeId || !selectedDraft) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, selectedDraft, setEdges]);

  const activeWorldName = activeWorldId
    ? worlds.find((w) => w.id === activeWorldId)?.name ?? null
    : null;

  const showEmptyState = !activeWorldId || worldCharacters.length === 0;

  const resetForm = useCallback(() => {
    setChar1Id('');
    setChar2Id('');
    setRelType('parent');
    setNotes('');
    setFormError(null);
  }, []);

  const handleSaveRelationship = useCallback(() => {
    if (!activeWorldId) {
      setFormError('Select a world first.');
      return;
    }
    if (!activeTreeId) {
      setFormError('Create or select a Family Tree first.');
      return;
    }
    if (!char1Id || !char2Id) {
      setFormError('Choose both characters.');
      return;
    }
    if (char1Id === char2Id) {
      setFormError('Characters must be different.');
      return;
    }
    const a = charMap.get(char1Id);
    const b = charMap.get(char2Id);
    if (!a || !b) {
      setFormError('Invalid character selection.');
      return;
    }
    addFamilyRelationship({
      worldId: activeWorldId,
      treeId: activeTreeId,
      character1Id: a.id,
      character1Name: a.name,
      character2Id: b.id,
      character2Name: b.name,
      type: relType,
      notes: notes.trim(),
    });
    resetForm();
    setShowAddForm(false);
  }, [activeWorldId, activeTreeId, char1Id, char2Id, charMap, relType, notes, addFamilyRelationship, resetForm]);

  return (
    <div className="pb-8">
      <style>{`
        .family-tree-flow .react-flow__background { background: ${VOID}; }
        .family-tree-flow .react-flow__edge-path {
          filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.25));
        }
        .family-tree-flow .react-flow__controls {
          background: #12121a;
          border: 1px solid #252540;
          border-radius: 8px;
        }
        .family-tree-flow .react-flow__controls-button {
          background: #1a1a2e;
          border-bottom-color: #252540;
          fill: #b8b8d0;
        }
        .family-tree-flow .react-flow__controls-button:hover {
          background: #252540;
        }
        .family-tree-flow .react-flow__minimap {
          background: #12121a;
          border: 1px solid #252540;
          border-radius: 8px;
        }
      `}</style>

      <header className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-gold" aria-hidden />
            Family Tree
          </h1>
          <p className="text-mist mt-1 text-sm">
            {activeWorldName ? (
              <>
                <span className="text-moonlight font-medium">{activeWorldName}</span>
                <span className="text-mist/80"> — lineages in this world</span>
              </>
            ) : (
              'Select a world to view family lineages'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <select
              className="select"
              value={activeTreeId}
              onChange={(e) => {
                setActiveTreeId(e.target.value);
                const t = worldTrees.find((x) => x.id === e.target.value);
                if (t) setTreeNameDraft(t.name);
                setRenamingTree(false);
              }}
              disabled={!activeWorldId}
              aria-label="Select family tree"
            >
              {worldTrees.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary shrink-0 whitespace-nowrap"
              disabled={showEmptyState}
              onClick={() => {
                if (!activeWorldId) return;
                const created = addFamilyTree({ worldId: activeWorldId, name: `Family Tree ${worldTrees.length + 1}` });
                setActiveTreeId(created.id);
                setTreeNameDraft(created.name);
                setRenamingTree(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New tree
            </button>
          </div>

          {activeTree && (
            <>
              {renamingTree ? (
                <div className="flex items-center gap-2">
                  <input
                    className="input h-9"
                    value={treeNameDraft}
                    onChange={(e) => { setTreeNameDraft(e.target.value); resetRenameSaved(); }}
                    placeholder="Tree name"
                  />
                  <button
                    type="button"
                    className={renameSaved === 'saved' ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => {
                      const name = treeNameDraft.trim() || 'Family Tree';
                      updateFamilyTree(activeTree.id, { name });
                      markRenameSaved();
                      setRenamingTree(false);
                    }}
                  >
                    <Save className="h-4 w-4" />
                    {renameSaved === 'saved' ? 'Saved' : 'Save'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setRenamingTree(false); setTreeNameDraft(activeTree.name); }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary" onClick={() => { setRenamingTree(true); setTreeNameDraft(activeTree.name); }}>
                    Rename
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    disabled={worldTrees.length <= 1}
                    onClick={() => {
                      if (!activeTree) return;
                      if (!window.confirm(`Delete "${activeTree.name}"? This removes its relationships.`)) return;
                      const nextId = worldTrees.find((t) => t.id !== activeTree.id)?.id ?? '';
                      deleteFamilyTree(activeTree.id);
                      setSelectedEdgeId(null);
                      setActiveTreeId(nextId);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete tree
                  </button>
                </div>
              )}
            </>
          )}

          <button
            type="button"
            className="btn-primary"
            disabled={showEmptyState || !activeTreeId}
            onClick={() => {
              setShowAddForm((v) => !v);
              setFormError(null);
            }}
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddForm ? 'Close form' : 'Add Relationship'}
          </button>
        </div>
      </header>

      {showEmptyState ? (
        <div
          className="card border-dusk/80 max-w-lg mx-auto text-center py-16 px-8"
          style={{ background: 'linear-gradient(180deg, #12121a 0%, #0a0a0f 100%)' }}
        >
          <Users className="h-14 w-14 text-mystic mx-auto mb-4 opacity-90" aria-hidden />
          <h2 className="section-title mb-2">No lineage to display</h2>
          <p className="text-mist text-sm leading-relaxed">
            {!activeWorldId
              ? 'Choose an active world from your dashboard or world list, then create characters in that world to map their family ties.'
              : 'Create characters in this world first, then return here to link them as kin, spouses, and wards.'}
          </p>
          <button
            type="button"
            className="btn-secondary mt-6"
            onClick={() => navigate('/characters/new')}
          >
            Create a character
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          <div
            className="family-tree-flow rounded-lg overflow-hidden border border-dusk shadow-lg shadow-arcane/5"
            style={{ height: 'calc(100vh - 120px)', background: VOID }}
          >
            {graphCharacterIds.size === 0 ? (
              <div
                className="h-full flex flex-col items-center justify-center text-center px-6"
                style={{ background: VOID }}
              >
                <Heart className="h-12 w-12 text-rose-400/80 mb-3" aria-hidden />
                <p className="text-moonlight font-display text-lg mb-1">No family ties yet</p>
                <p className="text-mist text-sm max-w-md">
                  Add a relationship using <strong className="text-silver">Add Relationship</strong> to see your
                  characters on the tree.
                </p>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.15}
                maxZoom={1.6}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ type: 'smoothstep' }}
              >
                <Background color="#252540" gap={20} size={1.2} variant={BackgroundVariant.Dots} />
                <Controls showInteractive={false} />
                <MiniMap
                  nodeStrokeWidth={2}
                  maskColor="rgba(10, 10, 15, 0.85)"
                  style={{ background: '#12121a' }}
                  nodeColor={(n) => {
                    const d = n.data as FamilyMemberNodeData | undefined;
                    return d?.character.portraitColor ?? '#8888aa';
                  }}
                />
                <Panel position="top-left" className="m-3">
                  <div className="card p-3 max-w-[200px] border-dusk/80 bg-abyss/95 backdrop-blur-sm">
                    <div className="section-title text-sm mb-2">Kin ties</div>
                    <p className="text-xs text-mist leading-relaxed">
                      Click a portrait card to open the character sheet. Drag nodes to tidy the layout.
                    </p>
                  </div>
                </Panel>
              </ReactFlow>
            )}
          </div>

          <aside className="space-y-4 min-h-0">
            {selectedEdge && selectedDraft && (
              <div className="card border-arcane/25">
                <h2 className="section-title">Draft connection</h2>
                <p className="text-xs text-mist mb-3">
                  Dragged links are drafts until you save them. Choose the relationship type and optional notes.
                </p>
                <div className="space-y-3">
                  <div className="rounded-md border border-dusk/70 bg-abyss/60 px-3 py-2 text-xs text-silver">
                    <span className="text-mist">From </span>
                    <span className="text-moonlight font-medium">
                      {charMap.get(selectedEdge.source)?.name ?? '—'}
                    </span>
                    <span className="mx-1 text-arcane">→</span>
                    <span className="text-moonlight font-medium">
                      {charMap.get(selectedEdge.target)?.name ?? '—'}
                    </span>
                  </div>
                  <div>
                    <label className="label" htmlFor="draft-family-type">
                      Relationship
                    </label>
                    <select
                      id="draft-family-type"
                      className="select"
                      value={draftRelType}
                      onChange={(e) => patchDraft(e.target.value as FamilyRelationType, draftNotes)}
                    >
                      {FAMILY_RELATION_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-mist/80 mt-1">
                      {FAMILY_RELATION_TYPES.find((x) => x.value === draftRelType)?.description}
                    </p>
                  </div>
                  <div>
                    <label className="label" htmlFor="draft-family-notes">
                      Notes
                    </label>
                    <textarea
                      id="draft-family-notes"
                      className="textarea min-h-[88px]"
                      placeholder="Optional story context"
                      value={draftNotes}
                      onChange={(e) => patchDraft(draftRelType, e.target.value)}
                    />
                  </div>
                  <button type="button" className="btn-primary w-full justify-center" onClick={saveDraft}>
                    <Save className="h-4 w-4" />
                    Save relationship
                  </button>
                  <button type="button" className="btn-danger w-full justify-center" onClick={discardDraft}>
                    <Trash2 className="h-4 w-4" />
                    Discard draft
                  </button>
                </div>
              </div>
            )}

            <div>
              <h2 className="section-title flex items-center gap-2">
                <Users className="h-5 w-5 text-frost" aria-hidden />
                Relationships
              </h2>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {worldRels.length === 0 ? (
                  <p className="text-sm text-mist px-1">No relationships recorded for this world.</p>
                ) : (
                  worldRels.map((r) => (
                    <div
                      key={r.id}
                      className="card py-3 px-4 border-dusk/90"
                      style={{
                        background: 'linear-gradient(135deg, #12121a 0%, #1a1a2e 100%)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-sm text-moonlight">
                          <span className="font-medium">{r.character1Name}</span>
                          <span className="text-mist mx-1.5 inline-flex items-center gap-0.5">
                            <ArrowRight className="h-3.5 w-3.5 inline opacity-70" aria-hidden />
                            <span className="text-frost/90">{FAMILY_RELATION_LABELS[r.type]}</span>
                          </span>
                          <span className="font-medium">{r.character2Name}</span>
                        </div>
                        <button
                          type="button"
                          className="btn-danger shrink-0 py-1.5 px-2 text-xs"
                          title="Delete relationship"
                          onClick={() => deleteFamilyRelationship(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {r.notes.trim() ? (
                        <p className="text-xs text-mist mt-2 whitespace-pre-wrap border-t border-dusk/60 pt-2">
                          {r.notes}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            {showAddForm && (
              <div className="card border-arcane/25">
                <h2 className="section-title">New relationship</h2>
                <div className="space-y-3">
                  <div>
                    <label className="label" htmlFor="fam-char1">
                      Character 1
                    </label>
                    <select
                      id="fam-char1"
                      className="select"
                      value={char1Id}
                      onChange={(e) => {
                        setChar1Id(e.target.value);
                        setFormError(null);
                      }}
                    >
                      <option value="">Select…</option>
                      {worldCharacters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="fam-type">
                      Relationship
                    </label>
                    <select
                      id="fam-type"
                      className="select"
                      value={relType}
                      onChange={(e) => setRelType(e.target.value as FamilyRelationType)}
                    >
                      {FAMILY_RELATION_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-mist/80 mt-1">
                      {FAMILY_RELATION_TYPES.find((x) => x.value === relType)?.description}
                    </p>
                  </div>
                  <div>
                    <label className="label" htmlFor="fam-char2">
                      Character 2
                    </label>
                    <select
                      id="fam-char2"
                      className="select"
                      value={char2Id}
                      onChange={(e) => {
                        setChar2Id(e.target.value);
                        setFormError(null);
                      }}
                    >
                      <option value="">Select…</option>
                      {worldCharacters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="fam-notes">
                      Notes
                    </label>
                    <textarea
                      id="fam-notes"
                      className="textarea min-h-[88px]"
                      placeholder="Optional story context"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  {formError ? <p className="text-sm text-blood">{formError}</p> : null}
                  <button
                    type="button"
                    className="btn-primary w-full justify-center"
                    onClick={handleSaveRelationship}
                  >
                    Save relationship
                  </button>
                </div>
              </div>
            )}

            {!showAddForm && (
              <p className="text-sm text-mist px-1">
                Use <strong className="text-silver">Add Relationship</strong> to bind two characters. The graph
                includes everyone who appears in at least one tie.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
