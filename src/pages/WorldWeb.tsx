import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type Connection as FlowConnection,
  BackgroundVariant,
  Panel,
  Handle,
  Position,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useStore from '../store/useStore';
import useSavedStatus from '../hooks/useSavedStatus';
import type {
  Connection,
  EntityType,
  World,
  Character,
  Location,
  Faction,
  Item,
  Event,
  Creature,
} from '../types';
import { FAMILY_RELATION_LABELS } from '../types';
import { Plus, X, Network, Trash2, Save } from 'lucide-react';

const VOID = '#0a0a0f';
const MIST = '#8888aa';

const TYPE_COLORS: Record<EntityType, string> = {
  character: '#8b5cf6',
  location: '#34d399',
  faction: '#f59e0b',
  story: '#22d3ee',
  item: '#ff6b35',
  event: '#dc2626',
  creature: '#a78bfa',
  world: '#e0e0f0',
};

// Importance order (center → outer rings)
const ENTITY_TYPE_ORDER: EntityType[] = [
  'world',
  'location',
  'event',
  'faction',
  'character',
  'creature',
  'item',
];

const TYPE_LABELS: Record<EntityType, string> = {
  world: 'World',
  story: 'Story',
  character: 'Character',
  location: 'Location',
  faction: 'Faction',
  item: 'Item',
  event: 'Event',
  creature: 'Creature',
};

function nodeId(entityType: EntityType, id: string): string {
  return `${entityType}:${id}`;
}

function parseNodeId(rfId: string): { type: EntityType; id: string } | null {
  const idx = rfId.indexOf(':');
  if (idx === -1) return null;
  const t = rfId.slice(0, idx) as EntityType;
  const id = rfId.slice(idx + 1);
  if (!ENTITY_TYPE_ORDER.includes(t)) return null;
  return { type: t, id };
}

type GraphEntity = {
  rfId: string;
  entityType: EntityType;
  name: string;
  worldId?: string;
};

type ForceEdge = { source: string; target: string };

/** Pull linked nodes together and spread unrelated ones — feels like a real web. */
function runWebForceLayout(
  initial: Map<string, { x: number; y: number }>,
  edges: ForceEdge[],
  centerX: number,
  centerY: number,
  pinRfId: string | null,
  targetRadiusById: Map<string, number>,
): Map<string, { x: number; y: number }> {
  const ids = [...initial.keys()];
  if (ids.length === 0) return initial;

  const pos = new Map<string, { x: number; y: number }>();
  for (const [k, v] of initial) pos.set(k, { x: v.x, y: v.y });

  const iterations = Math.min(120, 40 + ids.length * 2);
  const repulsionBase = 2800;
  const idealLength = 190;
  const spring = 0.085;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsion = repulsionBase * (0.45 + alpha * 0.55);

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const idA = ids[i]!;
        const idB = ids[j]!;
        const a = pos.get(idA)!;
        const b = pos.get(idB)!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 0.01;
        const f = repulsion / (distSq + 80);
        const fx = (dx / dist) * f * alpha;
        const fy = (dy / dist) * f * alpha;
        if (pinRfId !== idA) {
          a.x -= fx * 0.5;
          a.y -= fy * 0.5;
        }
        if (pinRfId !== idB) {
          b.x += fx * 0.5;
          b.y += fy * 0.5;
        }
      }
    }

    for (const e of edges) {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const diff = (dist - idealLength) * spring * alpha;
      dx = (dx / dist) * diff;
      dy = (dy / dist) * diff;
      if (pinRfId !== e.source) {
        a.x += dx;
        a.y += dy;
      }
      if (pinRfId !== e.target) {
        b.x -= dx;
        b.y -= dy;
      }
    }

    for (const id of ids) {
      if (pinRfId === id) {
        pos.get(id)!.x = centerX;
        pos.get(id)!.y = centerY;
        continue;
      }
      const p = pos.get(id)!;
      // Radial pull keeps types on their "importance rings"
      const tr = targetRadiusById.get(id) ?? 360;
      const vx = p.x - centerX;
      const vy = p.y - centerY;
      const d = Math.sqrt(vx * vx + vy * vy) || 0.01;
      const dr = (d - tr);
      p.x -= (vx / d) * dr * 0.035 * alpha;
      p.y -= (vy / d) * dr * 0.035 * alpha;
      // Gentle overall centering
      p.x += (centerX - p.x) * 0.008 * alpha;
      p.y += (centerY - p.y) * 0.008 * alpha;
    }
  }

  return pos;
}

function placeWorldAtCenter(
  positions: Map<string, { x: number; y: number }>,
  entities: GraphEntity[],
  cx: number,
  cy: number,
): string | null {
  const worlds = entities.filter((e) => e.entityType === 'world');
  if (worlds.length !== 1) return null;
  const w = worlds[0]!;
  positions.set(w.rfId, { x: cx, y: cy });
  return w.rfId;
}

function layoutImportanceRings(
  entities: GraphEntity[],
  cx: number,
  cy: number,
): { positions: Map<string, { x: number; y: number }>; radiusById: Map<string, number> } {
  const rings: Record<EntityType, number> = {
    world: 0,
    story: 260,
    location: 230,
    event: 330,
    faction: 420,
    character: 510,
    creature: 510,
    item: 600,
  };
  const byType = new Map<EntityType, GraphEntity[]>();
  for (const t of ENTITY_TYPE_ORDER) byType.set(t, []);
  for (const e of entities) (byType.get(e.entityType) ?? []).push(e);

  const positions = new Map<string, { x: number; y: number }>();
  const radiusById = new Map<string, number>();

  for (const t of ENTITY_TYPE_ORDER) {
    const list = byType.get(t) ?? [];
    const r = rings[t];
    list.sort((a, b) => a.name.localeCompare(b.name));
    if (t === 'world') {
      for (const ent of list) {
        positions.set(ent.rfId, { x: cx, y: cy });
        radiusById.set(ent.rfId, 0);
      }
      continue;
    }
    const n = list.length || 1;
    for (let i = 0; i < list.length; i++) {
      const ent = list[i]!;
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const jitter = ((i % 3) - 1) * 10;
      positions.set(ent.rfId, {
        x: cx + (r + jitter) * Math.cos(angle),
        y: cy + (r + jitter) * Math.sin(angle),
      });
      radiusById.set(ent.rfId, r);
    }
  }

  return { positions, radiusById };
}

export type EntityNodeData = {
  name: string;
  typeLabel: string;
  entityType: EntityType;
  color: string;
};

type EntityFlowNode = Node<EntityNodeData, 'entity'>;

function EntityNode({ data, selected }: NodeProps<EntityFlowNode>) {
  const border = data.color;
  const style: CSSProperties = {
    minWidth: 140,
    maxWidth: 200,
    padding: '10px 12px',
    background: 'linear-gradient(145deg, #12121a 0%, #1a1a2e 100%)',
    border: `2px solid ${border}`,
    borderRadius: 10,
    boxShadow: selected
      ? `0 0 20px ${border}55, 0 4px 16px rgba(0,0,0,0.45)`
      : `0 0 12px ${border}33, 0 4px 12px rgba(0,0,0,0.35)`,
    color: '#e0e0f0',
  };
  const handleCls = '!w-2 !h-2 !min-w-0 !min-h-0 !border !bg-abyss/90 !border-dusk';

  return (
    <div style={style}>
      <Handle type="target" position={Position.Top} id="t" className={handleCls} />
      <Handle type="target" position={Position.Left} id="l" className={handleCls} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: border,
          marginBottom: 4,
        }}
      >
        {data.typeLabel}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: '#e0e0f0' }}>
        {data.name}
      </div>
      <Handle type="source" position={Position.Bottom} id="b" className={handleCls} />
      <Handle type="source" position={Position.Right} id="r" className={handleCls} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

/** Re-fit the viewport when the graph topology changes (new nodes / links). */
function FitViewAfterLayout({ layoutKey }: { layoutKey: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = window.setTimeout(() => {
      fitView({ padding: 0.14, duration: 420, maxZoom: 1.45 });
    }, 48);
    return () => clearTimeout(t);
  }, [layoutKey, fitView]);
  return null;
}

function buildEntities(
  activeWorldId: string | null,
  worlds: World[],
  characters: Character[],
  locations: Location[],
  factions: Faction[],
  items: Item[],
  events: Event[],
  customCreatures: Creature[],
): GraphEntity[] {
  const inWorld = <T extends { worldId: string }>(arr: T[]) =>
    activeWorldId ? arr.filter((x) => x.worldId === activeWorldId) : arr;

  const list: GraphEntity[] = [];

  const worldList = activeWorldId ? worlds.filter((w) => w.id === activeWorldId) : worlds;
  for (const w of worldList) {
    list.push({
      rfId: nodeId('world', w.id),
      entityType: 'world',
      name: w.name,
      worldId: w.id,
    });
  }

  for (const c of inWorld(characters)) {
    list.push({
      rfId: nodeId('character', c.id),
      entityType: 'character',
      name: c.name,
      worldId: c.worldId,
    });
  }
  for (const l of inWorld(locations)) {
    list.push({
      rfId: nodeId('location', l.id),
      entityType: 'location',
      name: l.name,
      worldId: l.worldId,
    });
  }
  for (const f of inWorld(factions)) {
    list.push({
      rfId: nodeId('faction', f.id),
      entityType: 'faction',
      name: f.name,
      worldId: f.worldId,
    });
  }
  for (const i of inWorld(items)) {
    list.push({
      rfId: nodeId('item', i.id),
      entityType: 'item',
      name: i.name,
      worldId: i.worldId,
    });
  }
  for (const e of inWorld(events)) {
    list.push({
      rfId: nodeId('event', e.id),
      entityType: 'event',
      name: e.name,
      worldId: e.worldId,
    });
  }

  for (const cr of customCreatures) {
    list.push({
      rfId: nodeId('creature', cr.id),
      entityType: 'creature',
      name: cr.name,
      worldId: undefined,
    });
  }

  return list;
}

function resolveConnectionWorldId(
  activeWorldId: string | null,
  source: GraphEntity | undefined,
  target: GraphEntity | undefined,
  worlds: { id: string }[],
): string | null {
  if (activeWorldId) return activeWorldId;
  if (source?.entityType === 'world') return source.rfId.replace('world:', '');
  if (target?.entityType === 'world') return target.rfId.replace('world:', '');
  const sw = source?.worldId;
  const tw = target?.worldId;
  if (sw && tw && sw === tw) return sw;
  if (sw) return sw;
  if (tw) return tw;
  return worlds[0]?.id ?? null;
}

export default function WorldWeb() {
  const worlds = useStore((s) => s.worlds);
  const characters = useStore((s) => s.characters);
  const locations = useStore((s) => s.locations);
  const factions = useStore((s) => s.factions);
  const items = useStore((s) => s.items);
  const events = useStore((s) => s.events);
  const connections = useStore((s) => s.connections);
  const customCreatures = useStore((s) => s.customCreatures);
  const familyRelationships = useStore((s) => s.familyRelationships);
  const activeWorldId = useStore((s) => s.activeWorldId);
  const worldWebPositions = useStore((s) => s.worldWebPositions);
  const setWorldWebPositions = useStore((s) => s.setWorldWebPositions);
  const worldWebNodeIds = useStore((s) => s.worldWebNodeIds);
  const addWorldWebNode = useStore((s) => s.addWorldWebNode);
  const removeWorldWebNode = useStore((s) => s.removeWorldWebNode);
  const addConnection = useStore((s) => s.addConnection);
  const removeConnection = useStore((s) => s.removeConnection);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showAddNodePanel, setShowAddNodePanel] = useState(false);
  const [addNodeType, setAddNodeType] = useState<EntityType>('character');
  const [addNodeRfId, setAddNodeRfId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [sourceRfId, setSourceRfId] = useState('');
  const [targetRfId, setTargetRfId] = useState('');
  const [relationship, setRelationship] = useState('');
  const [description, setDescription] = useState('');
  const [draftRelationship, setDraftRelationship] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const { savedStatus, markSaved, resetSaved } = useSavedStatus(1200);
  const lastDraftSelectionRef = useRef<string | null>(null);

  const allEntities = useMemo(
    () =>
      buildEntities(
        activeWorldId,
        worlds,
        characters,
        locations,
        factions,
        items,
        events,
        customCreatures,
      ),
    [
      activeWorldId,
      worlds,
      characters,
      locations,
      factions,
      items,
      events,
      customCreatures,
    ],
  );

  const worldIdForGraph = activeWorldId ?? 'all';
  const includedRfIds = useMemo(() => {
    const base = new Set<string>((worldWebNodeIds?.[worldIdForGraph] ?? []).filter(Boolean));
    // In a per-world view, always include the world itself (anchor).
    if (activeWorldId) base.add(nodeId('world', activeWorldId));
    return base;
  }, [worldWebNodeIds, worldIdForGraph, activeWorldId]);

  const graphEntities = useMemo(
    () => allEntities.filter((e) => includedRfIds.has(e.rfId)),
    [allEntities, includedRfIds],
  );

  const entityByRfId = useMemo(() => {
    const m = new Map<string, GraphEntity>();
    for (const e of graphEntities) m.set(e.rfId, e);
    return m;
  }, [graphEntities]);

  const filteredConnections = useMemo(
    () =>
      activeWorldId
        ? connections.filter((c) => c.worldId === activeWorldId)
        : connections,
    [connections, activeWorldId],
  );

  const filteredFamilyRelationships = useMemo(
    () =>
      activeWorldId
        ? familyRelationships.filter((f) => f.worldId === activeWorldId)
        : familyRelationships,
    [familyRelationships, activeWorldId],
  );

  const forceEdges = useMemo((): ForceEdge[] => {
    const nodeIds = new Set(graphEntities.map((e) => e.rfId));
    const out: ForceEdge[] = [];
    for (const c of filteredConnections) {
      const src = nodeId(c.sourceType, c.sourceId);
      const tgt = nodeId(c.targetType, c.targetId);
      if (nodeIds.has(src) && nodeIds.has(tgt)) out.push({ source: src, target: tgt });
    }
    for (const f of filteredFamilyRelationships) {
      const src = nodeId('character', f.character1Id);
      const tgt = nodeId('character', f.character2Id);
      if (nodeIds.has(src) && nodeIds.has(tgt)) out.push({ source: src, target: tgt });
    }
    return out;
  }, [filteredConnections, filteredFamilyRelationships, graphEntities]);

  const webLayoutKey = useMemo(
    () =>
      [
        graphEntities.map((e) => e.rfId).sort().join(','),
        forceEdges.map((e) => `${e.source}->${e.target}`).sort().join('|'),
      ].join('::'),
    [graphEntities, forceEdges],
  );

  const layoutPositions = useMemo(() => {
    const cx = 520;
    const cy = 420;
    const { positions, radiusById } = layoutImportanceRings(graphEntities, cx, cy);
    const pin = placeWorldAtCenter(positions, graphEntities, cx, cy);
    if (graphEntities.length <= 1) return positions;
    return runWebForceLayout(positions, forceEdges, cx, cy, pin, radiusById);
  }, [graphEntities, forceEdges]);

  const availableEntitiesByType = useMemo(() => {
    const present = new Set(graphEntities.map((e) => e.rfId));
    const m = new Map<EntityType, GraphEntity[]>();
    for (const t of ENTITY_TYPE_ORDER) m.set(t, []);
    for (const e of allEntities) {
      if (present.has(e.rfId)) continue;
      (m.get(e.entityType) ?? []).push(e);
    }
    for (const [t, list] of m.entries()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      m.set(t, list);
    }
    return m;
  }, [allEntities, graphEntities]);

  const initialNodes: EntityFlowNode[] = useMemo(() => {
    const worldIdForPositions = activeWorldId ?? 'all';
    const saved = worldWebPositions?.[worldIdForPositions] ?? {};
    return graphEntities.map((e) => {
      const pos = saved[e.rfId] ?? layoutPositions.get(e.rfId) ?? { x: 0, y: 0 };
      const color = TYPE_COLORS[e.entityType];
      return {
        id: e.rfId,
        type: 'entity',
        position: pos,
        data: {
          name: e.name,
          typeLabel: TYPE_LABELS[e.entityType],
          entityType: e.entityType,
          color,
        },
      } satisfies EntityFlowNode;
    });
  }, [graphEntities, layoutPositions, worldWebPositions, activeWorldId]);

  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(graphEntities.map((e) => e.rfId));
    const result: Edge[] = [];
    for (const c of filteredConnections) {
      const src = nodeId(c.sourceType, c.sourceId);
      const tgt = nodeId(c.targetType, c.targetId);
      if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;
      result.push({
        id: c.id,
        type: 'simplebezier',
        source: src,
        target: tgt,
        label: c.relationship || '—',
        animated: true,
        style: {
          stroke: MIST,
          strokeWidth: 1.5,
          filter: 'drop-shadow(0 0 5px rgba(139, 92, 246, 0.35))',
        },
        labelStyle: { fill: '#b8b8d0', fontSize: 11, fontWeight: 500 },
        labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.92 },
        labelBgPadding: [6, 4] as [number, number],
        data: { connection: c },
      });
    }

    const FAMILY_EDGE_COLORS: Record<string, string> = {
      parent: '#f59e0b',
      spouse: '#f472b6',
      sibling: '#22d3ee',
      grandparent: '#d97706',
      'uncle-aunt': '#a78bfa',
      cousin: '#34d399',
      adopted: '#fb923c',
      ward: '#60a5fa',
      betrothed: '#fb7185',
    };

    for (const f of filteredFamilyRelationships) {
      const src = nodeId('character', f.character1Id);
      const tgt = nodeId('character', f.character2Id);
      if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;
      const color = FAMILY_EDGE_COLORS[f.type] || '#f472b6';
      const label = FAMILY_RELATION_LABELS[f.type] || f.type;
      result.push({
        id: `family-${f.id}`,
        type: 'simplebezier',
        source: src,
        target: tgt,
        label: `${label} (${f.character1Name} → ${f.character2Name})`,
        animated: false,
        style: {
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: f.type === 'spouse' || f.type === 'betrothed' ? '6 3' : undefined,
          filter: `drop-shadow(0 0 6px ${color}55)`,
        },
        labelStyle: { fill: color, fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.92 },
        labelBgPadding: [6, 4] as [number, number],
        data: { familyRelationship: f },
      });
    }

    return result;
  }, [filteredConnections, filteredFamilyRelationships, graphEntities]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update graph nodes when topology changes, but preserve any user-moved positions.
  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return initialNodes.map((n) => {
        const existing = prevById.get(n.id);
        return existing ? { ...n, position: existing.position } : n;
      });
    });
  }, [initialNodes, setNodes]);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      const worldIdForPositions = activeWorldId ?? 'all';
      setWorldWebPositions(worldIdForPositions, { [node.id]: node.position });
    },
    [activeWorldId, setWorldWebPositions],
  );

  const onNodeClick = useCallback((_: MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  useEffect(() => {
    setEdges((prev) => {
      const drafts = prev.filter((e) => (e.data as { draft?: boolean } | undefined)?.draft);
      return [...initialEdges, ...drafts];
    });
  }, [initialEdges, setEdges]);

  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return edges.find((e) => e.id === selectedEdgeId) ?? null;
  }, [selectedEdgeId, edges]);

  const selectedConnection = useMemo(() => {
    if (!selectedEdge) return null;
    const c = selectedEdge.data as { connection?: Connection; draft?: boolean } | undefined;
    return c?.connection ?? filteredConnections.find((x) => x.id === selectedEdge.id) ?? null;
  }, [selectedEdge, filteredConnections]);

  const selectedDraft = selectedEdge?.data && (selectedEdge.data as { draft?: boolean }).draft === true;

  useEffect(() => {
    if (!selectedEdgeId || !selectedDraft) {
      lastDraftSelectionRef.current = null;
      return;
    }
    const edge = edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return;
    const d = edge.data as { relationship?: string; description?: string };
    if (lastDraftSelectionRef.current !== selectedEdgeId) {
      lastDraftSelectionRef.current = selectedEdgeId;
      setDraftRelationship(d.relationship ?? '');
      setDraftDescription(d.description ?? '');
    }
  }, [selectedEdgeId, selectedDraft, edges]);

  const patchDraftEdge = useCallback(
    (rel: string, desc: string) => {
      if (!selectedEdgeId) return;
      setDraftRelationship(rel);
      setDraftDescription(desc);
      resetSaved();
      setEdges((eds) =>
        eds.map((e) =>
          e.id === selectedEdgeId && (e.data as { draft?: boolean } | undefined)?.draft
            ? {
                ...e,
                label: rel.trim() || 'Draft',
                data: { draft: true as const, relationship: rel, description: desc },
              }
            : e,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const handleSaveDraftConnection = useCallback(() => {
    if (!selectedEdge || !selectedDraft || !selectedEdgeId) return;
    const src = entityByRfId.get(selectedEdge.source);
    const tgt = entityByRfId.get(selectedEdge.target);
    if (!src || !tgt || src.rfId === tgt.rfId) return;
    const worldId = resolveConnectionWorldId(activeWorldId, src, tgt, worlds);
    if (!worldId) return;
    const srcParsed = parseNodeId(src.rfId);
    const tgtParsed = parseNodeId(tgt.rfId);
    if (!srcParsed || !tgtParsed) return;

    addConnection({
      worldId,
      sourceId: srcParsed.id,
      sourceType: src.entityType,
      sourceName: src.name,
      targetId: tgtParsed.id,
      targetType: tgt.entityType,
      targetName: tgt.name,
      relationship: draftRelationship.trim() || 'related',
      description: draftDescription.trim(),
    });
    markSaved();
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
    lastDraftSelectionRef.current = null;
    setDraftRelationship('');
    setDraftDescription('');
  }, [
    selectedEdge,
    selectedDraft,
    selectedEdgeId,
    entityByRfId,
    activeWorldId,
    worlds,
    addConnection,
    draftRelationship,
    draftDescription,
    setEdges,
    markSaved,
  ]);

  const onEdgeClick = useCallback((_: MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    setSelectedNodeId(null);
  }, []);

  const handleAddNode = useCallback(() => {
    if (!addNodeRfId) return;
    addWorldWebNode(worldIdForGraph, addNodeRfId);

    // If this node doesn't have a saved position yet, seed it near its ring.
    const saved = worldWebPositions?.[worldIdForGraph] ?? {};
    if (!saved[addNodeRfId]) {
      const cx = 520;
      const cy = 420;
      const entity = allEntities.find((e) => e.rfId === addNodeRfId);
      if (entity) {
        const { positions } = layoutImportanceRings([...graphEntities, entity], cx, cy);
        const pos = positions.get(addNodeRfId) ?? { x: cx + 40, y: cy + 40 };
        setWorldWebPositions(worldIdForGraph, { [addNodeRfId]: pos });
      }
    }

    setShowAddNodePanel(false);
    setAddNodeRfId('');
  }, [
    addNodeRfId,
    addWorldWebNode,
    worldIdForGraph,
    worldWebPositions,
    allEntities,
    graphEntities,
    setWorldWebPositions,
  ]);

  const handleRemoveSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    // Do not allow removing the world anchor in per-world view.
    if (activeWorldId && selectedNodeId === nodeId('world', activeWorldId)) return;
    removeWorldWebNode(worldIdForGraph, selectedNodeId);
    setSelectedNodeId(null);
  }, [selectedNodeId, removeWorldWebNode, worldIdForGraph, activeWorldId]);


  const groupedOptions = useMemo(() => {
    const byType = new Map<EntityType, GraphEntity[]>();
    for (const t of ENTITY_TYPE_ORDER) byType.set(t, []);
    for (const e of graphEntities) {
      const list = byType.get(e.entityType) ?? [];
      list.push(e);
      byType.set(e.entityType, list);
    }
    return ENTITY_TYPE_ORDER.map((t) => ({
      type: t,
      label: TYPE_LABELS[t],
      entities: byType.get(t) ?? [],
    })).filter((g) => g.entities.length > 0);
  }, [graphEntities]);

  const handleSaveConnection = () => {
    const src = entityByRfId.get(sourceRfId);
    const tgt = entityByRfId.get(targetRfId);
    if (!src || !tgt || src.rfId === tgt.rfId) return;
    const worldId = resolveConnectionWorldId(activeWorldId, src, tgt, worlds);
    if (!worldId) return;

    addConnection({
      worldId,
      sourceId: parseNodeId(src.rfId)!.id,
      sourceType: src.entityType,
      sourceName: src.name,
      targetId: parseNodeId(tgt.rfId)!.id,
      targetType: tgt.entityType,
      targetName: tgt.name,
      relationship: relationship.trim() || 'related',
      description: description.trim(),
    });
    setRelationship('');
    setDescription('');
    setSourceRfId('');
    setTargetRfId('');
    setShowAddPanel(false);
  };

  const handleDeleteSelected = () => {
    if (!selectedEdgeId) return;
    if (selectedDraft) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      lastDraftSelectionRef.current = null;
      setDraftRelationship('');
      setDraftDescription('');
      return;
    }
    if (!selectedConnection) return;
    removeConnection(selectedConnection.id);
    setSelectedEdgeId(null);
  };

  const onConnect = useCallback(
    (c: FlowConnection) => {
      const id = `draft-${c.source}-${c.target}-${Date.now()}`;
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            type: 'simplebezier',
            id,
            animated: true,
            data: { draft: true as const, relationship: '', description: '' },
            style: {
              stroke: MIST,
              strokeWidth: 1.5,
              filter: 'drop-shadow(0 0 5px rgba(34, 211, 238, 0.35))',
            },
            label: 'Draft',
            labelStyle: { fill: '#22d3ee', fontSize: 10 },
            labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.92 },
            labelBgPadding: [6, 4] as [number, number],
          },
          eds,
        ),
      );
      setSelectedEdgeId(id);
    },
    [setEdges],
  );

  const worldLabel = activeWorldId
    ? worlds.find((w) => w.id === activeWorldId)?.name ?? 'Active world'
    : 'All worlds';

  return (
    <div className="pb-8">
      <style>{`
        .react-flow__background { background: ${VOID}; }
        .world-web-flow .react-flow__edge-path {
          filter: drop-shadow(0 0 3px rgba(139, 92, 246, 0.35));
        }
        .world-web-flow .react-flow__edge.simplebezier .react-flow__edge-path {
          stroke-linecap: round;
        }
        .world-web-flow .react-flow__controls {
          background: #12121a;
          border: 1px solid #252540;
          border-radius: 8px;
        }
        .world-web-flow .react-flow__controls-button {
          background: #1a1a2e;
          border-bottom-color: #252540;
          fill: #b8b8d0;
        }
        .world-web-flow .react-flow__controls-button:hover {
          background: #252540;
        }
        .world-web-flow .react-flow__minimap {
          background: #12121a;
          border: 1px solid #252540;
          border-radius: 8px;
        }
      `}</style>

      <header className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Network className="h-8 w-8 text-arcane" aria-hidden />
            World web
          </h1>
          <p className="text-mist mt-1 text-sm">
            {worldLabel}
            <span className="text-mist/80">
              {' '}
              — threads pull linked pieces together; drag nodes to tidy the web
              {!activeWorldId && ' (all worlds)'}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowAddNodePanel((v) => !v);
              setShowAddPanel(false);
              setSelectedEdgeId(null);
            }}
          >
            {showAddNodePanel ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddNodePanel ? 'Close' : 'Add node'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowAddPanel((v) => !v);
              setShowAddNodePanel(false);
              setSelectedEdgeId(null);
            }}
            disabled={graphEntities.length < 2}
            title={graphEntities.length < 2 ? 'Add at least two nodes first' : undefined}
          >
            {showAddPanel ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAddPanel ? 'Close' : 'Add connection'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div
          className="world-web-flow relative rounded-lg overflow-hidden border border-dusk shadow-lg shadow-arcane/5"
          style={{ height: 'calc(100vh - 120px)', background: VOID }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 rounded-lg"
            aria-hidden
            style={{
              background: `
                radial-gradient(ellipse 85% 75% at 50% 48%, rgba(139, 92, 246, 0.07) 0%, transparent 55%),
                repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg 8deg, rgba(90, 90, 130, 0.045) 8deg 9deg)
              `,
            }}
          />
          <ReactFlow
            className="!bg-transparent relative z-[1]"
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            minZoom={0.15}
            maxZoom={1.55}
            defaultEdgeOptions={{
              type: 'simplebezier',
              style: {
                stroke: MIST,
                strokeWidth: 1.35,
              },
            }}
            proOptions={{ hideAttribution: true }}
          >
            <FitViewAfterLayout layoutKey={webLayoutKey} />
            <Background color="#2a2a44" gap={22} size={1} variant={BackgroundVariant.Dots} />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={2}
              maskColor="rgba(10, 10, 15, 0.85)"
              style={{ background: '#12121a' }}
              nodeColor={(n) => {
                const d = n.data as EntityNodeData | undefined;
                return d?.color ?? '#8888aa';
              }}
            />

            <Panel position="top-left" className="m-3">
              <div className="card p-3 max-w-[220px] border-dusk/80 bg-abyss/95 backdrop-blur-sm">
                <div className="section-title text-sm mb-2">Legend</div>
                <ul className="space-y-1.5 text-xs">
                  {ENTITY_TYPE_ORDER.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-silver">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border"
                        style={{
                          background: '#12121a',
                          borderColor: TYPE_COLORS[t],
                          boxShadow: `0 0 8px ${TYPE_COLORS[t]}66`,
                        }}
                      />
                      <span className="text-moonlight">{TYPE_LABELS[t]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            {(selectedConnection || selectedDraft) && selectedEdge && (
              <Panel position="bottom-right" className="m-3">
                <div className="card p-4 max-w-sm border-arcane/30 bg-abyss/95 backdrop-blur-sm">
                  {selectedDraft && selectedEdge ? (
                    <>
                      <div className="section-title text-base mb-2">Draft connection</div>
                      <p className="text-xs text-mist mb-3">
                        Not saved yet. Set the relationship and notes, then save — or discard the draft.
                      </p>
                      <div className="mb-3 rounded-md border border-dusk/60 bg-shadow/50 px-3 py-2 text-xs text-silver">
                        <span className="text-mist">From </span>
                        <span className="font-medium text-moonlight">
                          {entityByRfId.get(selectedEdge.source)?.name ?? '—'}
                        </span>
                        <span className="text-mist">
                          {' '}
                          (
                          {(() => {
                            const p = parseNodeId(selectedEdge.source);
                            return p ? TYPE_LABELS[p.type] : '?';
                          })()}
                          )
                        </span>
                        <span className="mx-1 text-arcane">→</span>
                        <span className="font-medium text-moonlight">
                          {entityByRfId.get(selectedEdge.target)?.name ?? '—'}
                        </span>
                        <span className="text-mist">
                          {' '}
                          (
                          {(() => {
                            const p = parseNodeId(selectedEdge.target);
                            return p ? TYPE_LABELS[p.type] : '?';
                          })()}
                          )
                        </span>
                      </div>
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="label" htmlFor="draft-rel">
                            Relationship
                          </label>
                          <input
                            id="draft-rel"
                            className="input"
                            placeholder="ally, located in, owns…"
                            value={draftRelationship}
                            onChange={(e) => patchDraftEdge(e.target.value, draftDescription)}
                          />
                        </div>
                        <div>
                          <label className="label" htmlFor="draft-desc">
                            Description
                          </label>
                          <textarea
                            id="draft-desc"
                            className="textarea min-h-[88px]"
                            placeholder="Optional notes about this link"
                            value={draftDescription}
                            onChange={(e) => patchDraftEdge(draftRelationship, e.target.value)}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`${savedStatus === 'saved' ? 'btn-secondary' : 'btn-primary'} w-full justify-center mb-2`}
                        onClick={handleSaveDraftConnection}
                      >
                        <Save className="h-4 w-4" />
                        {savedStatus === 'saved' ? 'Saved' : 'Save to world'}
                      </button>
                      <button
                        type="button"
                        className="btn-danger w-full justify-center"
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="h-4 w-4" />
                        Discard draft
                      </button>
                    </>
                  ) : selectedConnection ? (
                    <>
                      <div className="section-title text-base mb-2">Connection</div>
                      <p className="text-sm text-moonlight font-medium mb-1">
                        {selectedConnection.relationship}
                      </p>
                      <p className="text-xs text-mist mb-1">
                        {selectedConnection.sourceName}{' '}
                        <span className="text-arcane/90">({selectedConnection.sourceType})</span>
                      </p>
                      <p className="text-xs text-mist mb-3">
                        → {selectedConnection.targetName}{' '}
                        <span className="text-arcane/90">({selectedConnection.targetType})</span>
                      </p>
                      {selectedConnection.description ? (
                        <p className="text-sm text-silver mb-3 whitespace-pre-wrap">
                          {selectedConnection.description}
                        </p>
                      ) : (
                        <p className="text-xs text-mist/70 mb-3 italic">No description</p>
                      )}
                      <button
                        type="button"
                        className="btn-danger w-full justify-center"
                        onClick={handleDeleteSelected}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove connection
                      </button>
                    </>
                  ) : null}
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        <aside className="space-y-4">
          {showAddNodePanel && (
            <div className="card border-arcane/25">
              <h2 className="section-title">New node</h2>
              <div className="space-y-3">
                <div>
                  <label className="label" htmlFor="web-node-type">
                    Type
                  </label>
                  <select
                    id="web-node-type"
                    className="select"
                    value={addNodeType}
                    onChange={(e) => {
                      const t = e.target.value as EntityType;
                      setAddNodeType(t);
                      setAddNodeRfId('');
                    }}
                  >
                    {ENTITY_TYPE_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="web-node-entity">
                    Entity
                  </label>
                  <select
                    id="web-node-entity"
                    className="select"
                    value={addNodeRfId}
                    onChange={(e) => setAddNodeRfId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(availableEntitiesByType.get(addNodeType) ?? []).map((e) => (
                      <option key={e.rfId} value={e.rfId}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-primary w-full justify-center"
                  onClick={handleAddNode}
                  disabled={!addNodeRfId}
                >
                  <Plus className="h-4 w-4" />
                  Add to web
                </button>
                <p className="text-xs text-mist">
                  Nodes are no longer automatic — add only what you want to visualize.
                </p>
              </div>
            </div>
          )}

          {selectedNodeId && (
            <div className="card border-dusk/70">
              <h2 className="section-title">Node</h2>
              <p className="text-sm text-moonlight font-medium">
                {entityByRfId.get(selectedNodeId)?.name ?? selectedNodeId}
              </p>
              <p className="text-xs text-mist mb-3">
                {(() => {
                  const p = parseNodeId(selectedNodeId);
                  return p ? TYPE_LABELS[p.type] : '—';
                })()}
              </p>
              <button
                type="button"
                className="btn-danger w-full justify-center"
                onClick={handleRemoveSelectedNode}
                disabled={!!activeWorldId && selectedNodeId === nodeId('world', activeWorldId)}
              >
                <Trash2 className="h-4 w-4" />
                Remove from web
              </button>
            </div>
          )}

          {showAddPanel && (
            <div className="card border-arcane/25">
              <h2 className="section-title">New connection</h2>
              <div className="space-y-3">
                <div>
                  <label className="label" htmlFor="web-src">
                    Source
                  </label>
                  <select
                    id="web-src"
                    className="select"
                    value={sourceRfId}
                    onChange={(e) => setSourceRfId(e.target.value)}
                  >
                    <option value="">Select entity…</option>
                    {groupedOptions.map((g) => (
                      <optgroup key={g.type} label={g.label}>
                        {g.entities.map((e) => (
                          <option key={e.rfId} value={e.rfId}>
                            {e.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="web-tgt">
                    Target
                  </label>
                  <select
                    id="web-tgt"
                    className="select"
                    value={targetRfId}
                    onChange={(e) => setTargetRfId(e.target.value)}
                  >
                    <option value="">Select entity…</option>
                    {groupedOptions.map((g) => (
                      <optgroup key={`t-${g.type}`} label={g.label}>
                        {g.entities.map((e) => (
                          <option key={`t-${e.rfId}`} value={e.rfId}>
                            {e.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="web-rel">
                    Relationship
                  </label>
                  <input
                    id="web-rel"
                    className="input"
                    placeholder="ally, enemy, located in…"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="web-desc">
                    Description
                  </label>
                  <textarea
                    id="web-desc"
                    className="textarea min-h-[88px]"
                    placeholder="Optional notes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <button type="button" className="btn-primary w-full justify-center" onClick={handleSaveConnection}>
                  Save connection
                </button>
              </div>
            </div>
          )}

          {!showAddPanel && (
            <p className="text-sm text-mist px-1">
              Click an edge to inspect or delete a link. Use <strong className="text-silver">Add connection</strong>{' '}
              to bind two entities with a relationship.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
