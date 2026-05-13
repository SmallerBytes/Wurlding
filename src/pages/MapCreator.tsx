import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties,
} from 'react';
import {
  MousePointer2, Plus, Trash2, X, ZoomIn, ZoomOut, Grid3x3, RotateCcw,
  Mountain, TreePine, Waves, Sun, Snowflake, Home, Shield, Star,
  Eye, EyeOff, Lock, Unlock, MapPin, Crown, Skull, Circle, Leaf, Droplets, Building2,
  ChevronUp, ChevronDown, Layers,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import useStore from '../store/useStore';
import type { MapBoundaryShape, MapElement, MapElementType, MapLayer, WorldMap } from '../types';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Element type configuration                                         */
/* ------------------------------------------------------------------ */

interface ElementConfig {
  label: string;
  color: string;
  width: number;
  height: number;
  icon: LucideIcon;
  category: 'terrain' | 'settlement' | 'structure' | 'feature';
  style: 'area' | 'marker';
}

const ELEMENT_CONFIGS: Record<MapElementType, ElementConfig> = {
  region:       { label: 'Region',       color: '#4a5c8a', width: 220, height: 160, icon: MapPin,    category: 'terrain',    style: 'area' },
  forest:       { label: 'Forest',       color: '#1a5c32', width: 140, height: 110, icon: TreePine,  category: 'terrain',    style: 'area' },
  mountain:     { label: 'Mountain',     color: '#6b7280', width: 130, height: 100, icon: Mountain,  category: 'terrain',    style: 'area' },
  ocean:        { label: 'Ocean',        color: '#1e3a5f', width: 260, height: 200, icon: Waves,     category: 'terrain',    style: 'area' },
  lake:         { label: 'Lake',         color: '#2563eb', width: 90,  height: 70,  icon: Droplets,  category: 'terrain',    style: 'area' },
  desert:       { label: 'Desert',       color: '#92703a', width: 160, height: 120, icon: Sun,       category: 'terrain',    style: 'area' },
  swamp:        { label: 'Swamp',        color: '#2d4a2d', width: 120, height: 90,  icon: Leaf,      category: 'terrain',    style: 'area' },
  plains:       { label: 'Plains',       color: '#4a7c59', width: 180, height: 130, icon: Leaf,      category: 'terrain',    style: 'area' },
  tundra:       { label: 'Tundra',       color: '#6b8fa3', width: 160, height: 120, icon: Snowflake, category: 'terrain',    style: 'area' },
  civilization: { label: 'Civilization', color: '#7c3aed', width: 200, height: 150, icon: Crown,     category: 'terrain',    style: 'area' },
  city:         { label: 'City',         color: '#e2c87f', width: 44,  height: 44,  icon: Building2, category: 'settlement', style: 'marker' },
  town:         { label: 'Town',         color: '#b8a06a', width: 34,  height: 34,  icon: Home,      category: 'settlement', style: 'marker' },
  village:      { label: 'Village',      color: '#8a8070', width: 26,  height: 26,  icon: Circle,    category: 'settlement', style: 'marker' },
  castle:       { label: 'Castle',       color: '#9ca3af', width: 40,  height: 40,  icon: Shield,    category: 'structure',  style: 'marker' },
  ruins:        { label: 'Ruins',        color: '#78716c', width: 36,  height: 36,  icon: Skull,     category: 'structure',  style: 'marker' },
  temple:       { label: 'Temple',       color: '#d4a537', width: 36,  height: 36,  icon: Star,      category: 'structure',  style: 'marker' },
  cave:         { label: 'Cave',         color: '#44403c', width: 30,  height: 30,  icon: Eye,       category: 'structure',  style: 'marker' },
  dungeon:      { label: 'Dungeon',      color: '#5c2d2d', width: 34,  height: 34,  icon: Skull,     category: 'structure',  style: 'marker' },
  river:        { label: 'River',        color: '#3b82f6', width: 18,  height: 200, icon: Waves,     category: 'feature',    style: 'area' },
  road:         { label: 'Road',         color: '#78553a', width: 200, height: 12,  icon: MapPin,    category: 'feature',    style: 'area' },
  bridge:       { label: 'Bridge',       color: '#8b7e6a', width: 40,  height: 16,  icon: MapPin,    category: 'feature',    style: 'area' },
  landmark:     { label: 'Landmark',     color: '#f59e0b', width: 28,  height: 28,  icon: Star,      category: 'feature',    style: 'marker' },
};

const CATEGORIES: { key: string; label: string; types: MapElementType[] }[] = [
  { key: 'terrain', label: 'Terrain', types: ['region', 'forest', 'mountain', 'plains', 'desert', 'tundra', 'swamp', 'ocean', 'lake', 'civilization'] },
  { key: 'settlement', label: 'Settlements', types: ['city', 'town', 'village'] },
  { key: 'structure', label: 'Structures', types: ['castle', 'temple', 'ruins', 'cave', 'dungeon'] },
  { key: 'feature', label: 'Features', types: ['river', 'road', 'bridge', 'landmark'] },
];

/** Markers cannot use freehand polygon as a one-click place; map to rect/circle/triangle only. */
function effectiveBoundaryForPlacement(cfg: ElementConfig, chosen: MapBoundaryShape): MapBoundaryShape {
  if (cfg.style === 'marker') {
    if (chosen === 'circle' || chosen === 'triangle') return chosen;
    return 'rect';
  }
  if (chosen === 'polygon') return 'rect';
  return chosen;
}

const ZOOM_MIN = 0.15;
const ZOOM_MAX = 4;
const GRID_WORLD_SIZE = 10000;
const MIN_ELEMENT_SIZE = 10;

const RESIZE_HANDLES: { id: string; hx: number; hy: number; cursor: string }[] = [
  { id: 'nw', hx: -1, hy: -1, cursor: 'nwse-resize' },
  { id: 'n',  hx:  0, hy: -1, cursor: 'ns-resize' },
  { id: 'ne', hx:  1, hy: -1, cursor: 'nesw-resize' },
  { id: 'e',  hx:  1, hy:  0, cursor: 'ew-resize' },
  { id: 'se', hx:  1, hy:  1, cursor: 'nwse-resize' },
  { id: 's',  hx:  0, hy:  1, cursor: 'ns-resize' },
  { id: 'sw', hx: -1, hy:  1, cursor: 'nesw-resize' },
  { id: 'w',  hx: -1, hy:  0, cursor: 'ew-resize' },
];

function defaultLayers(): { layers: MapLayer[]; activeLayerId: string } {
  const t = { id: nanoid(), name: 'Terrain', visible: true, locked: false, opacity: 1, order: 0 };
  const f = { id: nanoid(), name: 'Features', visible: true, locked: false, opacity: 1, order: 1 };
  const m = { id: nanoid(), name: 'Markers', visible: true, locked: false, opacity: 1, order: 2 };
  return { layers: [t, f, m], activeLayerId: m.id };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function screenToWorld(sx: number, sy: number, pan: { x: number; y: number }, zoom: number) {
  return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
}

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Thin a freehand stroke so we do not store hundreds of points per drag. */
function simplifyFreehandStroke(
  points: { x: number; y: number }[],
  minDist: number,
): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  const out: { x: number; y: number }[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!;
    if (dist2(p, out[out.length - 1]!) >= minDist) out.push(p);
  }
  const last = points[points.length - 1]!;
  if (dist2(last, out[out.length - 1]!) >= minDist * 0.4 || out.length === 1) out.push(last);
  return out;
}

/* ------------------------------------------------------------------ */
/*  Single map element rendered on the canvas                          */
/* ------------------------------------------------------------------ */

function PolygonDraftOverlay({
  clickPoints,
  freehandLive,
}: {
  clickPoints: { x: number; y: number }[];
  freehandLive: { x: number; y: number }[];
}) {
  const hasClick = clickPoints.length > 0;
  const hasLive = freehandLive.length > 0;
  if (!hasClick && !hasLive) return null;

  const pad = 16;
  const allForBounds = [...clickPoints, ...freehandLive];
  const xs = allForBounds.map((p) => p.x);
  const ys = allForBounds.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const maxX = Math.max(...xs) + pad;
  const maxY = Math.max(...ys) + pad;
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);

  const clickPoly = clickPoints.map((p) => `${p.x - minX},${p.y - minY}`).join(' ');
  const livePoly = freehandLive.map((p) => `${p.x - minX},${p.y - minY}`).join(' ');
  const showVertexDots = clickPoints.length > 0 && clickPoints.length <= 80;

  return (
    <div
      className="absolute pointer-events-none z-[5]"
      style={{ left: minX, top: minY, width: w, height: h }}
    >
      <svg width={w} height={h} className="overflow-visible">
        {/* Freehand stroke in progress — solid line so you see the path while dragging */}
        {freehandLive.length >= 2 && (
          <polyline
            points={livePoly}
            fill="none"
            stroke="rgba(196,181,253,0.98)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {freehandLive.length >= 1 && (
          <circle
            cx={freehandLive[0]!.x - minX}
            cy={freehandLive[0]!.y - minY}
            r={6}
            fill="#a78bfa"
            stroke="#f5f3ff"
            strokeWidth={1.5}
          />
        )}
        {/* Point-to-point draft */}
        {clickPoints.length >= 2 && (
          <polyline
            points={clickPoly}
            fill="none"
            stroke="rgba(167,139,250,0.95)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        )}
        {showVertexDots &&
          clickPoints.map((p, i) => (
            <circle
              key={`c-${i}`}
              cx={p.x - minX}
              cy={p.y - minY}
              r={5}
              fill="#a78bfa"
              stroke="#ede9fe"
              strokeWidth={1}
            />
          ))}
      </svg>
    </div>
  );
}

function markerShapeClass(shape: MapBoundaryShape | undefined): string {
  const s = shape ?? 'rect';
  if (s === 'circle') return 'rounded-full';
  if (s === 'triangle') return 'rounded-sm';
  return 'rounded-lg';
}

function MapElementNode({
  el,
  config,
  selected,
  locked,
  layerOpacity,
  onMouseDown,
}: {
  el: MapElement;
  config: ElementConfig;
  selected: boolean;
  locked: boolean;
  layerOpacity: number;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const Icon = config.icon;
  const isArea = config.style === 'area';
  const w = el.width;
  const h = el.height;
  const bShape: MapBoundaryShape = el.boundaryShape ?? 'rect';

  if (isArea && bShape === 'polygon' && el.boundaryPoints && el.boundaryPoints.length >= 3) {
    const abs = el.boundaryPoints.map((p) => ({ x: el.x + p.dx, y: el.y + p.dy }));
    const minX = Math.min(...abs.map((p) => p.x));
    const maxX = Math.max(...abs.map((p) => p.x));
    const minY = Math.min(...abs.map((p) => p.y));
    const maxY = Math.max(...abs.map((p) => p.y));
    const pw = Math.max(maxX - minX, 1);
    const ph = Math.max(maxY - minY, 1);
    const pts = abs.map((p) => `${p.x - minX},${p.y - minY}`).join(' ');
    return (
      <div
        className="absolute select-none"
        style={{
          left: minX,
          top: minY,
          width: pw,
          height: ph,
          zIndex: 1,
          opacity: layerOpacity,
          pointerEvents: locked ? 'none' : 'auto',
        }}
        onMouseDown={onMouseDown}
      >
        <svg width={pw} height={ph} className="overflow-visible">
          <polygon
            points={pts}
            fill={el.color}
            fillOpacity={el.opacity}
            stroke={el.color}
            strokeWidth={2}
            strokeDasharray="6 4"
            className={selected ? 'drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]' : ''}
          />
        </svg>
        {el.name && (
          <span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-[Cinzel] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none px-1"
            style={{ fontSize: clamp(Math.min(pw, ph) * 0.08, 9, 14), maxWidth: pw }}
          >
            {el.name}
          </span>
        )}
      </div>
    );
  }

  const areaShapeStyle = (): CSSProperties => {
    const base: CSSProperties = {
      backgroundColor: el.color + Math.round(el.opacity * 255).toString(16).padStart(2, '0'),
      borderColor: el.color,
    };
    if (bShape === 'circle') return { ...base, borderRadius: '50%' };
    if (bShape === 'triangle') return { ...base, clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
    return base;
  };

  return (
    <div
      className="absolute select-none"
      style={{
        left: el.x - w / 2,
        top: el.y - h / 2,
        width: w,
        height: h,
        zIndex: isArea ? 1 : 10,
        opacity: layerOpacity,
        pointerEvents: locked ? 'none' : 'auto',
      }}
      onMouseDown={onMouseDown}
    >
      {isArea ? (
        <div
          className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-shadow ${
            bShape === 'circle' ? 'rounded-full' : bShape === 'triangle' ? '' : 'rounded-lg'
          } ${locked ? 'cursor-default' : 'cursor-move'} ${selected ? 'shadow-[0_0_0_3px_rgba(139,92,246,0.6)]' : ''}`}
          style={areaShapeStyle()}
        >
          <Icon size={Math.min(w, h) * 0.2} className="opacity-60" style={{ color: '#fff' }} />
          {el.name && (
            <span
              className="text-white font-[Cinzel] font-semibold text-center leading-tight px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
              style={{ fontSize: clamp(Math.min(w, h) * 0.1, 9, 16) }}
            >
              {el.name}
            </span>
          )}
        </div>
      ) : (
        <div className={`relative flex flex-col items-center ${locked ? 'cursor-default' : 'cursor-move'}`} style={{ width: w, height: w + 18 }}>
          <div
            className={`flex items-center justify-center border-2 shadow-lg transition-shadow ${markerShapeClass(bShape)} ${
              selected ? 'shadow-[0_0_0_3px_rgba(139,92,246,0.6)]' : 'shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
            }`}
            style={{
              width: w,
              height: h,
              backgroundColor: el.color,
              borderColor: 'rgba(255,255,255,0.25)',
              ...(bShape === 'triangle' ? { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' } : {}),
            }}
          >
            <Icon size={w * 0.5} className="text-white drop-shadow" />
          </div>
          {el.name && (
            <span
              className="absolute whitespace-nowrap text-center font-[Cinzel] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
              style={{ top: h + 4, fontSize: clamp(w * 0.32, 8, 13) }}
            >
              {el.name}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Module-level view-state cache — survives component remounts        */
/* ------------------------------------------------------------------ */

const _viewCache = new Map<string, { pan: { x: number; y: number }; zoom: number }>();

/* ------------------------------------------------------------------ */
/*  Main MapCreator component                                          */
/* ------------------------------------------------------------------ */

export default function MapCreator() {
  const { maps, locations, activeWorldId, addMap, updateMap } = useStore();

  const [tool, setTool] = useState<MapElementType | null>(null);
  /** Boundary for the next placement (Square / Circle / Triangle / Draw your own). */
  const [placementBoundaryShape, setPlacementBoundaryShape] = useState<MapBoundaryShape>('rect');
  /** World-space vertices while drawing a custom polygon (before commit). */
  const [polygonDraft, setPolygonDraft] = useState<{ x: number; y: number }[]>([]);
  /** Point-to-point vs drag freehand when drawing a polygon boundary. */
  const [polygonDrawStyle, setPolygonDrawStyle] = useState<'points' | 'freehand'>('points');
  /** Live samples while the user is dragging a freehand boundary (cleared on mouse up). */
  const [freehandStroke, setFreehandStroke] = useState<{ x: number; y: number }[]>([]);
  const isFreehandDrawingRef = useRef(false);
  const freehandStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [propForm, setPropForm] = useState<Partial<MapElement>>({});
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renderTick, setRenderTick] = useState(0);
  const liveOverrideRef = useRef<Record<string, Partial<MapElement>>>({});

  const _cached = activeWorldId ? _viewCache.get(activeWorldId) : null;
  const panRef = useRef(_cached?.pan ?? { x: 0, y: 0 });
  const zoomRef = useRef(_cached?.zoom ?? 1);
  const didInit = useRef(!!_cached);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const panStartMouse = useRef({ x: 0, y: 0 });
  const panStartVal = useRef({ x: 0, y: 0 });
  const isDraggingEl = useRef(false);
  const dragInfo = useRef({ id: '', startX: 0, startY: 0, mouseX: 0, mouseY: 0 });
  const isResizing = useRef(false);
  const resizeInfo = useRef({
    id: '', hx: 0, hy: 0,
    startX: 0, startY: 0, startW: 0, startH: 0,
    mouseX: 0, mouseY: 0,
  });

  const kick = useCallback(() => setRenderTick((n) => n + 1), []);
  void renderTick;

  const pan = panRef.current;
  const zoom = zoomRef.current;

  const setPan = useCallback((p: { x: number; y: number }) => {
    panRef.current = p;
    if (activeWorldId) _viewCache.set(activeWorldId, { pan: p, zoom: zoomRef.current });
    kick();
  }, [activeWorldId, kick]);

  const setZoom = useCallback((z: number) => {
    zoomRef.current = z;
    if (activeWorldId) _viewCache.set(activeWorldId, { pan: panRef.current, zoom: z });
    kick();
  }, [activeWorldId, kick]);

  const currentMap: WorldMap | undefined = useMemo(
    () => maps.find((m) => m.worldId === activeWorldId),
    [maps, activeWorldId],
  );

  const elements = currentMap?.elements ?? [];
  const layers = currentMap?.layers ?? [];
  const activeLayerId = currentMap?.activeLayerId ?? '';
  const gridEnabled = currentMap?.gridEnabled ?? true;
  const gridSize = currentMap?.gridSize ?? 50;

  const layerMap = useMemo(() => {
    const m = new Map<string, MapLayer>();
    for (const l of layers) m.set(l.id, l);
    return m;
  }, [layers]);

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => b.order - a.order),
    [layers],
  );

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.visible).map((l) => l.id)),
    [layers],
  );

  const lockedLayerIds = useMemo(
    () => new Set(layers.filter((l) => l.locked).map((l) => l.id)),
    [layers],
  );

  const sortedElements = useMemo(() => {
    const orderMap = new Map<string, number>();
    for (const l of layers) orderMap.set(l.id, l.order);
    return [...elements]
      .filter((el) => visibleLayerIds.has(el.layerId))
      .sort((a, b) => (orderMap.get(a.layerId) ?? 0) - (orderMap.get(b.layerId) ?? 0));
  }, [elements, layers, visibleLayerIds]);

  const isPolygonDrawMode = useMemo(
    () =>
      !!tool &&
      ELEMENT_CONFIGS[tool].style === 'area' &&
      placementBoundaryShape === 'polygon',
    [tool, placementBoundaryShape],
  );

  const worldLocations = useMemo(
    () => (activeWorldId ? locations.filter((l) => l.worldId === activeWorldId) : []),
    [locations, activeWorldId],
  );

  /* ---- Lock parent scroll — the Layout uses overflow-y-auto which can
         shift on re-render; we disable it while MapCreator is mounted ---- */
  useLayoutEffect(() => {
    const el = canvasRef.current?.closest('.overflow-y-auto') as HTMLElement | null;
    if (!el) return;
    const prev = el.style.overflow;
    const prevPad = el.style.padding;
    el.style.overflow = 'hidden';
    el.style.padding = '0';
    return () => { el.style.overflow = prev; el.style.padding = prevPad; };
  }, []);

  /* ---- Auto-create map ---- */
  useEffect(() => {
    if (activeWorldId && !currentMap) {
      const { layers: defLayers, activeLayerId: defActive } = defaultLayers();
      addMap({
        worldId: activeWorldId,
        name: 'Main Map',
        elements: [],
        layers: defLayers,
        activeLayerId: defActive,
        backgroundColor: '#0d1117',
        gridEnabled: true,
        gridSize: 50,
      });
    }
  }, [activeWorldId, currentMap, addMap]);

  /* Centre the view once (first visit only — no cached view yet). */
  useLayoutEffect(() => {
    if (didInit.current || !canvasRef.current || !currentMap) return;
    didInit.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    panRef.current = { x: rect.width / 2, y: rect.height / 2 };
    zoomRef.current = 1;
    if (activeWorldId) _viewCache.set(activeWorldId, { pan: panRef.current, zoom: 1 });
    kick();
  }, [currentMap, activeWorldId, kick]);

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedId),
    [elements, selectedId],
  );

  // Only populate the property form when a *different* element is selected,
  // not every time the store changes. applyProp handles live updates.
  const prevSelectedId = useRef<string | null>(null);
  useEffect(() => {
    if (selectedId === prevSelectedId.current) return;
    prevSelectedId.current = selectedId;
    const el = elements.find((e) => e.id === selectedId);
    if (el) {
      setPropForm({
        name: el.name,
        color: el.color,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        notes: el.notes,
        locationId: el.locationId,
        layerId: el.layerId,
        boundaryShape: el.boundaryShape ?? 'rect',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const commitElements = useCallback(
    (next: MapElement[]) => {
      if (currentMap) updateMap(currentMap.id, { elements: next });
    },
    [currentMap, updateMap],
  );

  /* ---- Layer CRUD ---- */
  const updateLayers = useCallback(
    (next: MapLayer[], activeId?: string) => {
      if (!currentMap) return;
      const patch: Partial<WorldMap> = { layers: next };
      if (activeId !== undefined) patch.activeLayerId = activeId;
      updateMap(currentMap.id, patch as Omit<WorldMap, 'id' | 'createdAt' | 'updatedAt'>);
    },
    [currentMap, updateMap],
  );

  const addLayer = () => {
    const maxOrder = layers.reduce((mx, l) => Math.max(mx, l.order), -1);
    const layer: MapLayer = {
      id: nanoid(), name: `Layer ${layers.length + 1}`,
      visible: true, locked: false, opacity: 1, order: maxOrder + 1,
    };
    updateLayers([...layers, layer], layer.id);
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) return;
    const remaining = layers.filter((l) => l.id !== id);
    const newActive = activeLayerId === id ? remaining[remaining.length - 1].id : activeLayerId;
    const fallbackId = remaining[0].id;
    const updatedElements = elements.map((el) =>
      el.layerId === id ? { ...el, layerId: fallbackId } : el,
    );
    if (currentMap) {
      updateMap(currentMap.id, {
        layers: remaining,
        activeLayerId: newActive,
        elements: updatedElements,
      });
    }
    if (selectedId) {
      const sel = updatedElements.find((e) => e.id === selectedId);
      if (sel) setPropForm((f) => ({ ...f, layerId: sel.layerId }));
    }
  };

  const toggleLayerVisible = (id: string) => {
    updateLayers(layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const toggleLayerLocked = (id: string) => {
    updateLayers(layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l)));
  };

  const moveLayer = (id: string, dir: -1 | 1) => {
    const sorted = [...layers].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((l) => l.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tmp = sorted[idx].order;
    sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
    sorted[swapIdx] = { ...sorted[swapIdx], order: tmp };
    updateLayers(sorted);
  };

  const commitRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      updateLayers(layers.map((l) => (l.id === id ? { ...l, name: trimmed } : l)));
    }
    setRenamingLayerId(null);
  };

  const setActiveLayer = (id: string) => {
    if (currentMap) updateMap(currentMap.id, { activeLayerId: id });
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    updateLayers(layers.map((l) => (l.id === id ? { ...l, opacity } : l)));
  };

  /* ---- Element CRUD ---- */
  const placeElement = useCallback(
    (type: MapElementType, wx: number, wy: number, chosenBoundary: MapBoundaryShape) => {
      if (!currentMap) return;
      const cfg = ELEMENT_CONFIGS[type];
      const boundaryShape = effectiveBoundaryForPlacement(cfg, chosenBoundary);
      const el: MapElement = {
        id: nanoid(),
        type,
        layerId: activeLayerId,
        name: cfg.label,
        x: wx,
        y: wy,
        width: cfg.width,
        height: cfg.height,
        color: cfg.color,
        opacity: cfg.style === 'area' ? 0.45 : 1,
        notes: '',
        locationId: '',
        boundaryShape,
        boundaryPoints: undefined,
      };
      commitElements([...elements, el]);
      setSelectedId(el.id);
      setTool(null);
      setPolygonDraft([]);
      setFreehandStroke([]);
      freehandStrokeRef.current = [];
      isFreehandDrawingRef.current = false;
    },
    [currentMap, elements, commitElements, activeLayerId],
  );

  const commitPolygonPlacement = useCallback(() => {
    if (!currentMap || !tool || polygonDraft.length < 3) return;
    const cfg = ELEMENT_CONFIGS[tool];
    if (cfg.style !== 'area') return;
    const pts = polygonDraft;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const rel = pts.map((p) => ({ dx: p.x - cx, dy: p.y - cy }));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const bw = Math.max(MIN_ELEMENT_SIZE, Math.max(...xs) - Math.min(...xs));
    const bh = Math.max(MIN_ELEMENT_SIZE, Math.max(...ys) - Math.min(...ys));
    const el: MapElement = {
      id: nanoid(),
      type: tool,
      layerId: activeLayerId,
      name: cfg.label,
      x: cx,
      y: cy,
      width: bw,
      height: bh,
      color: cfg.color,
      opacity: 0.45,
      notes: '',
      locationId: '',
      boundaryShape: 'polygon',
      boundaryPoints: rel,
    };
    commitElements([...elements, el]);
    setSelectedId(el.id);
    setPolygonDraft([]);
    setFreehandStroke([]);
    freehandStrokeRef.current = [];
    setTool(null);
  }, [currentMap, tool, polygonDraft, elements, commitElements, activeLayerId]);

  const updateElement = useCallback(
    (id: string, patch: Partial<MapElement>) => {
      commitElements(elements.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [elements, commitElements],
  );

  const deleteElement = useCallback(
    (id: string) => {
      commitElements(elements.filter((e) => e.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [elements, commitElements, selectedId],
  );

  /* ---- Canvas events ---- */
  const handleCanvasDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      isPanning.current = true;
      panStartMouse.current = { x: e.clientX, y: e.clientY };
      panStartVal.current = { ...pan };
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (tool) {
      const cfg = ELEMENT_CONFIGS[tool];
      const world = screenToWorld(sx, sy, pan, zoom);
      if (cfg.style === 'area' && placementBoundaryShape === 'polygon') {
        if (polygonDrawStyle === 'freehand') {
          isFreehandDrawingRef.current = true;
          freehandStrokeRef.current = [world];
          setFreehandStroke([world]);
          setPolygonDraft([]);
          e.preventDefault();
          return;
        }
        setPolygonDraft((d) => [...d, world]);
        return;
      }
      placeElement(tool, world.x, world.y, placementBoundaryShape);
      return;
    }
    setSelectedId(null);
    isPanning.current = true;
    panStartMouse.current = { x: e.clientX, y: e.clientY };
    panStartVal.current = { ...pan };
  };

  /* ---- Refs that handleGlobalMove / handleGlobalUp read directly ---- */
  const elementsRef = useRef(elements);
  elementsRef.current = elements;
  const currentMapRef = useRef(currentMap);
  currentMapRef.current = currentMap;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const updateMapRef = useRef(updateMap);
  updateMapRef.current = updateMap;

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - panStartMouse.current.x;
        const dy = e.clientY - panStartMouse.current.y;
        setPan({ x: panStartVal.current.x + dx, y: panStartVal.current.y + dy });
        return;
      }
    },
    [setPan],
  );

  const handleGlobalMove = useCallback((e: MouseEvent) => {
    const z = zoomRef.current;
    if (isFreehandDrawingRef.current && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy, panRef.current, zoomRef.current);
      const last = freehandStrokeRef.current[freehandStrokeRef.current.length - 1];
      const minD = Math.max(0.7, 1.6 / z);
      if (!last || dist2(world, last) >= minD) {
        freehandStrokeRef.current = [...freehandStrokeRef.current, world];
        setFreehandStroke([...freehandStrokeRef.current]);
        kick();
      }
      return;
    }
    if (isResizing.current) {
      const r = resizeInfo.current;
      const mdx = (e.clientX - r.mouseX) / z;
      const mdy = (e.clientY - r.mouseY) / z;
      const newW = Math.max(MIN_ELEMENT_SIZE, r.startW + r.hx * mdx);
      const newH = Math.max(MIN_ELEMENT_SIZE, r.startH + r.hy * mdy);
      const actualDW = newW - r.startW;
      const actualDH = newH - r.startH;
      liveOverrideRef.current = {
        ...liveOverrideRef.current,
        [r.id]: {
          width: newW, height: newH,
          x: r.startX + actualDW * r.hx / 2,
          y: r.startY + actualDH * r.hy / 2,
        },
      };
      kick();
      return;
    }
    if (isDraggingEl.current) {
      const dx = (e.clientX - dragInfo.current.mouseX) / z;
      const dy = (e.clientY - dragInfo.current.mouseY) / z;
      liveOverrideRef.current = {
        ...liveOverrideRef.current,
        [dragInfo.current.id]: {
          x: dragInfo.current.startX + dx,
          y: dragInfo.current.startY + dy,
        },
      };
      kick();
    }
  }, [kick]);

  const handleGlobalUp = useCallback(() => {
    if (isFreehandDrawingRef.current) {
      isFreehandDrawingRef.current = false;
      const raw = [...freehandStrokeRef.current];
      freehandStrokeRef.current = [];
      setFreehandStroke([]);
      const z = zoomRef.current;
      const minStep = Math.max(1.1, 2.2 / z);
      let pts = simplifyFreehandStroke(raw, minStep);
      if (pts.length < 3 && raw.length >= 3) {
        pts = simplifyFreehandStroke(raw, minStep * 0.22);
      }
      if (pts.length >= 3) setPolygonDraft(pts);
      kick();
      isPanning.current = false;
      isDraggingEl.current = false;
      isResizing.current = false;
      return;
    }
    if (isDraggingEl.current || isResizing.current) {
      const overrides = liveOverrideRef.current;
      if (Object.keys(overrides).length > 0) {
        const els = elementsRef.current;
        const updated = els.map((e) =>
          overrides[e.id] ? { ...e, ...overrides[e.id] } : e,
        );
        const map = currentMapRef.current;
        if (map) updateMapRef.current(map.id, { elements: updated });
        const selId = selectedIdRef.current;
        if (selId) {
          const el = updated.find((e) => e.id === selId);
            if (el) {
            setPropForm({
              name: el.name, color: el.color, width: el.width, height: el.height,
              opacity: el.opacity, notes: el.notes, locationId: el.locationId, layerId: el.layerId,
              boundaryShape: el.boundaryShape ?? 'rect',
            });
          }
        }
        liveOverrideRef.current = {};
        kick();
      }
    }
    isPanning.current = false;
    isDraggingEl.current = false;
    isResizing.current = false;
  }, [kick]);

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [handleGlobalMove, handleGlobalUp]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = clamp(curZoom * factor, ZOOM_MIN, ZOOM_MAX);
      setPan({
        x: mx - (mx - curPan.x) * (newZoom / curZoom),
        y: my - (my - curPan.y) * (newZoom / curZoom),
      });
      setZoom(newZoom);
    },
    [setPan, setZoom],
  );

  const handleElementDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    if (lockedLayerIds.has(el.layerId)) return;
    if (tool) {
      const cfg = ELEMENT_CONFIGS[tool];
      const rect = canvasRef.current!.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, zoom);
      if (cfg.style === 'area' && placementBoundaryShape === 'polygon') {
        if (polygonDrawStyle === 'freehand') {
          isFreehandDrawingRef.current = true;
          freehandStrokeRef.current = [world];
          setFreehandStroke([world]);
          setPolygonDraft([]);
          return;
        }
        setPolygonDraft((d) => [...d, world]);
        return;
      }
      placeElement(tool, world.x, world.y, placementBoundaryShape);
      return;
    }
    setSelectedId(id);
    isDraggingEl.current = true;
    dragInfo.current = { id, startX: el.x, startY: el.y, mouseX: e.clientX, mouseY: e.clientY };
  };

  const handleResizeDown = (e: React.MouseEvent, elId: string, hx: number, hy: number) => {
    e.stopPropagation();
    e.preventDefault();
    const el = elements.find((x) => x.id === elId);
    if (!el) return;
    isResizing.current = true;
    resizeInfo.current = {
      id: elId, hx, hy,
      startX: el.x, startY: el.y, startW: el.width, startH: el.height,
      mouseX: e.clientX, mouseY: e.clientY,
    };
  };

  /* ---- Keyboard ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTool(null);
        setPolygonDraft([]);
        setFreehandStroke([]);
        freehandStrokeRef.current = [];
        isFreehandDrawingRef.current = false;
        setSelectedId(null);
        setRenamingLayerId(null);
      }
      if (
        e.key === 'Enter' &&
        tool &&
        placementBoundaryShape === 'polygon' &&
        polygonDraft.length >= 3
      ) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        commitPolygonPlacement();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        deleteElement(selectedId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, deleteElement, tool, placementBoundaryShape, polygonDraft, commitPolygonPlacement]);

  /* ---- Property panel helpers ---- */
  const applyProp = (patch: Partial<MapElement>) => {
    let next: Partial<MapElement> = { ...patch };
    if (next.boundaryShape && next.boundaryShape !== 'polygon') {
      next = { ...next, boundaryPoints: undefined };
    }
    setPropForm((f) => ({ ...f, ...next }));
    if (selectedId) updateElement(selectedId, next);
  };

  const resetView = () => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
      setZoom(1);
    }
  };

  const toggleGrid = () => {
    if (currentMap) updateMap(currentMap.id, { gridEnabled: !gridEnabled });
  };

  /* ---- Derived counts ---- */
  const layerElementCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const el of elements) counts.set(el.layerId, (counts.get(el.layerId) ?? 0) + 1);
    return counts;
  }, [elements]);

  /* ---- Empty states ---- */
  if (!activeWorldId) {
    return (
      <div className="card border-dashed border-dusk/80 bg-shadow/40 p-12 text-center">
        <MapPin className="mx-auto mb-4 h-12 w-12 text-mist/40" />
        <h2 className="mb-2 font-[Cinzel] text-xl font-semibold text-moonlight">Select a world</h2>
        <p className="text-mist">Choose a world from the sidebar to open its map.</p>
      </div>
    );
  }

  if (!currentMap) return null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* ============= LEFT TOOLBAR ============= */}
      <aside className="w-52 shrink-0 bg-abyss border-r border-dusk flex flex-col overflow-hidden">
        <div className="p-3 border-b border-dusk">
          <h2 className="font-[Cinzel] text-sm font-semibold text-moonlight tracking-wide">Map Tools</h2>
        </div>

        {/* Tools */}
        <div className="flex-1 overflow-y-auto py-2 space-y-3 px-2 min-h-0">
          <button
            type="button"
            onClick={() => {
              setTool(null);
              setPolygonDraft([]);
              setFreehandStroke([]);
              freehandStrokeRef.current = [];
              isFreehandDrawingRef.current = false;
            }}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              !tool ? 'bg-arcane/20 text-arcane border border-arcane/30' : 'text-mist hover:text-moonlight hover:bg-shadow'
            }`}
          >
            <MousePointer2 size={16} />
            Select / Pan
          </button>

          <div className="space-y-3 px-1">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-mist/70" htmlFor="map-boundary-shape">
                Boundary shape
              </label>
              <select
                id="map-boundary-shape"
                className="select w-full text-xs py-1.5"
                value={placementBoundaryShape}
                onChange={(e) => {
                  const v = e.target.value as MapBoundaryShape;
                  setPlacementBoundaryShape(v);
                  if (v !== 'polygon') {
                    setPolygonDraft([]);
                    setFreehandStroke([]);
                    freehandStrokeRef.current = [];
                    isFreehandDrawingRef.current = false;
                  }
                }}
              >
                <option value="rect">Square</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option
                  value="polygon"
                  disabled={!!tool && ELEMENT_CONFIGS[tool].style === 'marker'}
                >
                  Draw your own
                </option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-mist/70" htmlFor="map-element-type">
                Element type
              </label>
              <select
                id="map-element-type"
                className="select w-full text-xs py-1.5"
                value={tool ?? ''}
                onChange={(e) => {
                  const v = e.target.value as MapElementType | '';
                  if (!v) {
                    setTool(null);
                    setPolygonDraft([]);
                    setFreehandStroke([]);
                    freehandStrokeRef.current = [];
                    isFreehandDrawingRef.current = false;
                    return;
                  }
                  setTool(v);
                  if (ELEMENT_CONFIGS[v].style === 'marker' && placementBoundaryShape === 'polygon') {
                    setPlacementBoundaryShape('rect');
                    setPolygonDraft([]);
                  }
                }}
              >
                <option value="">Choose type…</option>
                {CATEGORIES.map((cat) => (
                  <optgroup key={cat.key} label={cat.label}>
                    {cat.types.map((type) => (
                      <option key={type} value={type}>
                        {ELEMENT_CONFIGS[type].label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {tool && ELEMENT_CONFIGS[tool].style === 'marker' && (
              <p className="text-[10px] text-mist/80 leading-snug">
                Markers use the boundary shape for the icon outline (square, circle, or triangle). Draw-your-own applies as a square marker.
              </p>
            )}

            {isPolygonDrawMode && (
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-mist/70" htmlFor="map-polygon-draw-style">
                    Draw style
                  </label>
                  <select
                    id="map-polygon-draw-style"
                    className="select w-full text-xs py-1.5"
                    value={polygonDrawStyle}
                    onChange={(e) => {
                      const v = e.target.value as 'points' | 'freehand';
                      setPolygonDrawStyle(v);
                      setPolygonDraft([]);
                      setFreehandStroke([]);
                      freehandStrokeRef.current = [];
                      isFreehandDrawingRef.current = false;
                    }}
                  >
                    <option value="points">Point to point</option>
                    <option value="freehand">Freehand (drag — line follows the cursor)</option>
                  </select>
                </div>

                <div className="rounded-lg border border-arcane/25 bg-arcane/10 p-2 space-y-2">
                  {polygonDrawStyle === 'points' ? (
                    <p className="text-[10px] text-mist leading-relaxed">
                      Click the map to add vertices (min 3). Press <kbd className="rounded bg-shadow px-1">Enter</kbd> to
                      finish or <kbd className="rounded bg-shadow px-1">Esc</kbd> to cancel.
                    </p>
                  ) : (
                    <p className="text-[10px] text-mist leading-relaxed">
                      Click and drag on the map — you will see your boundary line as you draw. Release the mouse to set the
                      shape, then click <span className="text-silver">Complete shape</span> to place it (min 3 points after
                      smoothing). <kbd className="rounded bg-shadow px-1">Esc</kbd> cancels.
                    </p>
                  )}
                  <p className="text-[10px] text-arcane tabular-nums">Vertices in shape: {polygonDraft.length}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-primary flex-1 py-1.5 text-[10px]"
                      disabled={polygonDraft.length < 3}
                      onClick={() => commitPolygonPlacement()}
                    >
                      Complete shape
                    </button>
                    <button
                      type="button"
                      className="btn-secondary py-1.5 px-2 text-[10px]"
                      onClick={() => {
                        setPolygonDraft([]);
                        setFreehandStroke([]);
                        freehandStrokeRef.current = [];
                        isFreehandDrawingRef.current = false;
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============= LAYERS PANEL ============= */}
        <div className="border-t border-dusk flex flex-col max-h-[40%] min-h-[120px]">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Layers size={13} className="text-mist" />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-mist/80">Layers</span>
            </div>
            <button
              type="button"
              onClick={addLayer}
              className="text-mist hover:text-arcane transition p-0.5"
              title="Add layer"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5">
            {sortedLayers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const count = layerElementCounts.get(layer.id) ?? 0;
              return (
                <div
                  key={layer.id}
                  className={`group flex items-center gap-1 rounded px-1.5 py-1 text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-arcane/15 border border-arcane/25'
                      : 'border border-transparent hover:bg-shadow/60'
                  }`}
                  onClick={() => setActiveLayer(layer.id)}
                >
                  {/* Visibility */}
                  <button
                    type="button"
                    className={`shrink-0 p-0.5 transition ${layer.visible ? 'text-silver hover:text-moonlight' : 'text-mist/30 hover:text-mist'}`}
                    onClick={(e) => { e.stopPropagation(); toggleLayerVisible(layer.id); }}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>

                  {/* Lock */}
                  <button
                    type="button"
                    className={`shrink-0 p-0.5 transition ${layer.locked ? 'text-blood/70 hover:text-blood' : 'text-mist/30 hover:text-mist'}`}
                    onClick={(e) => { e.stopPropagation(); toggleLayerLocked(layer.id); }}
                    title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                  </button>

                  {/* Name */}
                  {renamingLayerId === layer.id ? (
                    <input
                      className="flex-1 min-w-0 bg-shadow border border-dusk rounded px-1 py-0.5 text-xs text-moonlight outline-none focus:border-arcane/50"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(layer.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitRename(layer.id); if (e.key === 'Escape') setRenamingLayerId(null); }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`flex-1 min-w-0 truncate ${isActive ? 'text-moonlight font-medium' : 'text-silver'}`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingLayerId(layer.id);
                        setRenameValue(layer.name);
                      }}
                      title={`${layer.name} — double-click to rename`}
                    >
                      {layer.name}
                    </span>
                  )}

                  {/* Opacity (active layer only) */}
                  {isActive && (
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      className="w-10 shrink-0 accent-arcane"
                      value={layer.opacity}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateLayerOpacity(layer.id, parseFloat(e.target.value)); }}
                      title={`Opacity ${Math.round(layer.opacity * 100)}%`}
                    />
                  )}

                  {/* Element count */}
                  <span className="shrink-0 text-[9px] text-mist/50 tabular-nums">{count}</span>

                  {/* Reorder + Delete (on hover) */}
                  <div className="shrink-0 flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="p-0.5 text-mist/40 hover:text-mist"
                      onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 1); }}
                      title="Move up"
                    >
                      <ChevronUp size={10} />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-mist/40 hover:text-mist"
                      onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, -1); }}
                      title="Move down"
                    >
                      <ChevronDown size={10} />
                    </button>
                    {layers.length > 1 && (
                      <button
                        type="button"
                        className="p-0.5 text-mist/30 hover:text-blood transition"
                        onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                        title="Delete layer"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zoom controls */}
        <div className="p-2 border-t border-dusk space-y-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn-secondary p-1.5"
              onClick={() => setZoom(clamp(zoomRef.current * 1.25, ZOOM_MIN, ZOOM_MAX))}
            >
              <ZoomIn size={14} />
            </button>
            <span className="flex-1 text-center text-xs text-mist">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="btn-secondary p-1.5"
              onClick={() => setZoom(clamp(zoomRef.current / 1.25, ZOOM_MIN, ZOOM_MAX))}
            >
              <ZoomOut size={14} />
            </button>
          </div>
          <div className="flex gap-1">
            <button type="button" className="btn-secondary flex-1 p-1.5 text-xs justify-center" onClick={resetView}>
              <RotateCcw size={12} /> Reset
            </button>
            <button
              type="button"
              className={`btn-secondary flex-1 p-1.5 text-xs justify-center ${gridEnabled ? 'text-arcane' : ''}`}
              onClick={toggleGrid}
            >
              <Grid3x3 size={12} /> Grid
            </button>
          </div>
        </div>
      </aside>

      {/* ============= CANVAS ============= */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          backgroundColor: currentMap.backgroundColor,
          cursor: tool ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab',
        }}
        title={isPolygonDrawMode ? 'Click to add vertices to your boundary' : undefined}
        onMouseDown={handleCanvasDown}
        onMouseMove={handleCanvasMove}
        onWheel={handleWheel}
      >
        {/* Transform container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          {/* Grid */}
          {gridEnabled && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: -GRID_WORLD_SIZE / 2,
                top: -GRID_WORLD_SIZE / 2,
                width: GRID_WORLD_SIZE,
                height: GRID_WORLD_SIZE,
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
                backgroundSize: `${gridSize}px ${gridSize}px`,
              }}
            />
          )}

          {/* Origin crosshair */}
          <div className="absolute pointer-events-none" style={{ left: -1, top: -20, width: 2, height: 40, backgroundColor: 'rgba(139,92,246,0.2)' }} />
          <div className="absolute pointer-events-none" style={{ left: -20, top: -1, width: 40, height: 2, backgroundColor: 'rgba(139,92,246,0.2)' }} />

          {(polygonDraft.length > 0 || freehandStroke.length > 0) && (
            <PolygonDraftOverlay clickPoints={polygonDraft} freehandLive={freehandStroke} />
          )}

          {/* Map elements sorted by layer order */}
          {sortedElements.map((rawEl) => {
            const cfg = ELEMENT_CONFIGS[rawEl.type];
            if (!cfg) return null;
            const el = liveOverrideRef.current[rawEl.id] ? { ...rawEl, ...liveOverrideRef.current[rawEl.id] } as MapElement : rawEl;
            const layer = layerMap.get(el.layerId);
            return (
              <MapElementNode
                key={el.id}
                el={el}
                config={cfg}
                selected={selectedId === el.id}
                locked={lockedLayerIds.has(rawEl.layerId)}
                layerOpacity={layer?.opacity ?? 1}
                onMouseDown={(e) => handleElementDown(e, el.id)}
              />
            );
          })}
        </div>

        {/* Tool indicator */}
        {tool && !isPolygonDrawMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-arcane/90 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 pointer-events-none">
            <Plus size={14} />
            Place {ELEMENT_CONFIGS[tool].label} ({placementBoundaryShape === 'rect' ? 'square' : placementBoundaryShape}) on &ldquo;
            {layers.find((l) => l.id === activeLayerId)?.name ?? 'layer'}&rdquo;
          </div>
        )}
        {isPolygonDrawMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-mystic/90 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg pointer-events-none text-center max-w-lg">
            {polygonDrawStyle === 'freehand' && freehandStroke.length > 0 ? (
              <>
                Drawing — boundary line follows your cursor · <span className="text-moonlight">release the mouse</span> to
                finish the stroke
              </>
            ) : polygonDrawStyle === 'freehand' && polygonDraft.length >= 3 ? (
              <>
                Boundary set — {polygonDraft.length} points · click <span className="text-moonlight">Complete shape</span>{' '}
                to place on the map
              </>
            ) : polygonDrawStyle === 'freehand' ? (
              <>Click and drag on the map — your line appears as you draw</>
            ) : (
              <>
                Point to point — {polygonDraft.length} vertex{polygonDraft.length === 1 ? '' : 'es'} ·{' '}
                <kbd className="rounded bg-black/30 px-1">Enter</kbd> to complete (min 3)
              </>
            )}
          </div>
        )}

        {/* Resize handles overlay */}
        {selectedElement &&
          !tool &&
          selectedElement.boundaryShape !== 'polygon' &&
          !lockedLayerIds.has(selectedElement.layerId) &&
          (() => {
          const sel = liveOverrideRef.current[selectedElement.id]
            ? { ...selectedElement, ...liveOverrideRef.current[selectedElement.id] } as MapElement
            : selectedElement;
          return (
            <>
              <div
                className="absolute pointer-events-none border-2 border-arcane/60 rounded"
                style={{
                  left: (sel.x - sel.width / 2) * zoom + pan.x,
                  top: (sel.y - sel.height / 2) * zoom + pan.y,
                  width: sel.width * zoom,
                  height: sel.height * zoom,
                }}
              />
              {RESIZE_HANDLES.map((h) => {
                const sx = (sel.x + h.hx * sel.width / 2) * zoom + pan.x;
                const sy = (sel.y + h.hy * sel.height / 2) * zoom + pan.y;
                const isCorner = h.hx !== 0 && h.hy !== 0;
                const size = isCorner ? 10 : 8;
                return (
                  <div
                    key={h.id}
                    className="absolute z-50"
                    style={{
                      left: sx - size / 2,
                      top: sy - size / 2,
                      width: size,
                      height: size,
                      cursor: h.cursor,
                      backgroundColor: '#8b5cf6',
                      border: '2px solid #c4b5fd',
                      borderRadius: isCorner ? 2 : '50%',
                    }}
                    onMouseDown={(e) => handleResizeDown(e, selectedElement.id, h.hx, h.hy)}
                  />
                );
              })}
            </>
          );
        })()}
      </div>

      {/* ============= RIGHT PROPERTIES PANEL ============= */}
      {selectedElement && (
        <aside className="w-72 shrink-0 bg-abyss border-l border-dusk flex flex-col overflow-hidden">
          <div className="p-3 border-b border-dusk flex items-center justify-between">
            <h3 className="font-[Cinzel] text-sm font-semibold text-moonlight">Properties</h3>
            <button type="button" className="text-mist hover:text-moonlight p-1" onClick={() => setSelectedId(null)}>
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Type badge */}
            <div className="flex items-center gap-2">
              {(() => { const Icon = ELEMENT_CONFIGS[selectedElement.type].icon; return <Icon size={16} style={{ color: selectedElement.color }} />; })()}
              <span className="text-sm font-medium text-silver">{ELEMENT_CONFIGS[selectedElement.type].label}</span>
            </div>

            {/* Name */}
            <div>
              <label className="label text-xs" htmlFor="prop-name">Name</label>
              <input
                id="prop-name"
                className="input text-sm"
                value={propForm.name ?? ''}
                onChange={(e) => applyProp({ name: e.target.value })}
                placeholder="Name this element"
              />
            </div>

            {/* Layer assignment */}
            <div>
              <label className="label text-xs">Layer</label>
              <select
                className="select text-sm"
                value={propForm.layerId ?? ''}
                onChange={(e) => applyProp({ layerId: e.target.value })}
              >
                {sortedLayers.slice().reverse().map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Boundary shape */}
            <div>
              <label className="label text-xs">Boundary shape</label>
              <select
                className="select text-sm"
                value={propForm.boundaryShape ?? 'rect'}
                onChange={(e) =>
                  applyProp({ boundaryShape: e.target.value as MapBoundaryShape })
                }
              >
                <option value="rect">Square</option>
                <option value="circle">Circle</option>
                <option value="triangle">Triangle</option>
                <option value="polygon">Draw your own (polygon)</option>
              </select>
              {(propForm.boundaryShape ?? 'rect') === 'polygon' && (
                <p className="mt-1 text-[10px] text-mist leading-relaxed">
                  Custom polygon: resize handles are disabled; drag the whole shape to move it.
                </p>
              )}
            </div>

            {/* Color + Opacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Color</label>
                <input
                  type="color"
                  className="input h-9 w-full cursor-pointer p-0.5"
                  value={propForm.color ?? '#ffffff'}
                  onChange={(e) => applyProp({ color: e.target.value })}
                />
              </div>
              <div>
                <label className="label text-xs">Opacity</label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  className="w-full mt-2 accent-arcane"
                  value={propForm.opacity ?? 0.45}
                  onChange={(e) => applyProp({ opacity: parseFloat(e.target.value) })}
                />
                <span className="text-[10px] text-mist">{Math.round((propForm.opacity ?? 0.45) * 100)}%</span>
              </div>
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Width</label>
                <input
                  type="number"
                  className="input text-sm"
                  min={10}
                  value={propForm.width ?? 50}
                  onChange={(e) => applyProp({ width: Math.max(10, parseInt(e.target.value) || 10) })}
                />
              </div>
              <div>
                <label className="label text-xs">Height</label>
                <input
                  type="number"
                  className="input text-sm"
                  min={10}
                  value={propForm.height ?? 50}
                  onChange={(e) => applyProp({ height: Math.max(10, parseInt(e.target.value) || 10) })}
                />
              </div>
            </div>

            {/* Link to Location */}
            <div>
              <label className="label text-xs">Link to Location</label>
              <select
                className="select text-sm"
                value={propForm.locationId ?? ''}
                onChange={(e) => applyProp({ locationId: e.target.value })}
              >
                <option value="">None</option>
                {worldLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="label text-xs">Notes</label>
              <textarea
                className="textarea text-sm min-h-[80px]"
                value={propForm.notes ?? ''}
                onChange={(e) => applyProp({ notes: e.target.value })}
                placeholder="Notes about this map element…"
              />
            </div>

            {/* Delete */}
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-blood/30 bg-blood/10 px-3 py-2 text-sm font-medium text-blood transition hover:bg-blood/20"
              onClick={() => deleteElement(selectedElement.id)}
            >
              <Trash2 size={14} />
              Delete element
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
