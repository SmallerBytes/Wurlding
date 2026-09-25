import {
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties,
} from 'react';
import {
  MousePointer2, Plus, Trash2, X, ZoomIn, ZoomOut, Grid3x3, RotateCcw,
  Mountain, TreePine, Waves, Sun, Snowflake, Home, Shield, Star,
  Eye, EyeOff, Lock, Unlock, MapPin, Crown, Skull, Circle, Leaf, Droplets, Building2,
  ChevronUp, ChevronDown, Layers, Image as ImageIcon, Upload, Route, Tag, Hexagon,
  Maximize, Loader2, Sword, Flag, Tent, Anchor, Gem, Flame, Cross, Compass,
  Castle, Footprints, Landmark, Trees, Pickaxe, ScrollText, Swords,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import useStore from '../store/useStore';
import { API_BASE } from '../api';
import { MAP_PRESETS, findMapPreset } from '../data/mapPresets';
import type {
  MapBackgroundImage, MapBoundaryShape, MapElement, MapElementType, MapLayer, MapLineStyle, MapPathStyle, WorldMap,
} from '../types';
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
  category: 'annotation' | 'terrain' | 'settlement' | 'structure' | 'feature';
  /**
   * `area` = filled footprint, `marker` = icon badge, `path` = open line drawn point by point,
   * `label` = free-floating text.
   */
  style: 'area' | 'marker' | 'path' | 'label';
}

const ELEMENT_CONFIGS: Record<MapElementType, ElementConfig> = {
  pin:          { label: 'Pin',          color: '#e11d48', width: 32,  height: 32,  icon: MapPin,    category: 'annotation', style: 'marker' },
  label:        { label: 'Label',        color: '#fef3c7', width: 120, height: 24,  icon: Tag,       category: 'annotation', style: 'label' },
  zone:         { label: 'Zone',         color: '#f59e0b', width: 200, height: 150, icon: Hexagon,   category: 'annotation', style: 'area' },
  trail:        { label: 'Trail / Path', color: '#fbbf24', width: 6,   height: 6,   icon: Route,     category: 'annotation', style: 'path' },
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
  river:        { label: 'River',        color: '#3b82f6', width: 10,  height: 10,  icon: Waves,     category: 'feature',    style: 'path' },
  road:         { label: 'Road',         color: '#a16207', width: 7,   height: 7,   icon: Route,     category: 'feature',    style: 'path' },
  bridge:       { label: 'Bridge',       color: '#8b7e6a', width: 40,  height: 16,  icon: MapPin,    category: 'feature',    style: 'area' },
  landmark:     { label: 'Landmark',     color: '#f59e0b', width: 28,  height: 28,  icon: Star,      category: 'feature',    style: 'marker' },
};

const QUICK_TOOLS: MapElementType[] = ['pin', 'label', 'zone', 'trail'];

const ZONE_KIND_OPTIONS: { id: string; label: string; color: string; icon: LucideIcon }[] = [
  { id: 'zone',          label: 'Zone',         color: '#f59e0b', icon: Hexagon },
  { id: 'region',        label: 'Region',       color: '#4a5c8a', icon: MapPin },
  { id: 'forest',        label: 'Forest',       color: '#1a5c32', icon: TreePine },
  { id: 'mountain',      label: 'Mountain',     color: '#6b7280', icon: Mountain },
  { id: 'plains',        label: 'Plains',       color: '#4a7c59', icon: Leaf },
  { id: 'desert',        label: 'Desert',       color: '#92703a', icon: Sun },
  { id: 'tundra',        label: 'Tundra',       color: '#6b8fa3', icon: Snowflake },
  { id: 'swamp',         label: 'Swamp',        color: '#2d4a2d', icon: Leaf },
  { id: 'ocean',         label: 'Ocean',        color: '#1e3a5f', icon: Waves },
  { id: 'lake',          label: 'Lake',         color: '#2563eb', icon: Droplets },
  { id: 'civilization',  label: 'Civilization', color: '#7c3aed', icon: Crown },
];

const AREA_TYPES = new Set<MapElementType>(
  (Object.keys(ELEMENT_CONFIGS) as MapElementType[]).filter((t) => ELEMENT_CONFIGS[t].style === 'area'),
);

function zoneKindOf(el: MapElement): string {
  if (el.zoneKind) return el.zoneKind;
  if (ZONE_KIND_OPTIONS.some((o) => o.id === el.type)) return el.type;
  return 'zone';
}

function zoneKindOption(id: string | undefined) {
  return ZONE_KIND_OPTIONS.find((o) => o.id === id) ?? ZONE_KIND_OPTIONS[0]!;
}

function isZoneLike(el: MapElement): boolean {
  return AREA_TYPES.has(el.type);
}

const PIN_ICON_OPTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'pin', label: 'Pin', icon: MapPin },
  { id: 'star', label: 'Star', icon: Star },
  { id: 'flag', label: 'Flag', icon: Flag },
  { id: 'sword', label: 'Sword', icon: Sword },
  { id: 'swords', label: 'Battle', icon: Swords },
  { id: 'shield', label: 'Shield', icon: Shield },
  { id: 'crown', label: 'Crown', icon: Crown },
  { id: 'castle', label: 'Castle', icon: Castle },
  { id: 'home', label: 'Home', icon: Home },
  { id: 'building', label: 'City', icon: Building2 },
  { id: 'tent', label: 'Camp', icon: Tent },
  { id: 'skull', label: 'Danger', icon: Skull },
  { id: 'cross', label: 'Shrine', icon: Cross },
  { id: 'flame', label: 'Fire', icon: Flame },
  { id: 'gem', label: 'Treasure', icon: Gem },
  { id: 'anchor', label: 'Port', icon: Anchor },
  { id: 'compass', label: 'Compass', icon: Compass },
  { id: 'landmark', label: 'Landmark', icon: Landmark },
  { id: 'trees', label: 'Forest', icon: Trees },
  { id: 'mountain', label: 'Peak', icon: Mountain },
  { id: 'waves', label: 'Water', icon: Waves },
  { id: 'pickaxe', label: 'Mine', icon: Pickaxe },
  { id: 'scroll', label: 'Lore', icon: ScrollText },
  { id: 'footprints', label: 'Trail', icon: Footprints },
];

function pinIconFor(id: string | undefined): LucideIcon {
  return PIN_ICON_OPTIONS.find((o) => o.id === id)?.icon ?? MapPin;
}

/** Markers cannot use freehand polygon as a one-click place; map to rect/circle/triangle only. */
function effectiveBoundaryForPlacement(cfg: ElementConfig, chosen: MapBoundaryShape): MapBoundaryShape {
  if (cfg.style === 'label') return 'rect';
  if (cfg.style === 'path') return 'path';
  if (cfg.style === 'marker') {
    if (chosen === 'circle' || chosen === 'triangle') return chosen;
    return 'rect';
  }
  if (chosen === 'polygon' || chosen === 'path') return 'rect';
  return chosen;
}

/** Whether a tool places by drawing a sequence of points (custom polygon or any path). */
function toolDrawsPoints(tool: MapElementType | null, boundary: MapBoundaryShape): boolean {
  if (!tool) return false;
  const cfg = ELEMENT_CONFIGS[tool];
  if (cfg.style === 'path') return true;
  return cfg.style === 'area' && boundary === 'polygon';
}

function isPathElement(el: MapElement): boolean {
  return el.boundaryShape === 'path' && !!el.boundaryPoints && el.boundaryPoints.length >= 2;
}

function dashArrayFor(style: MapLineStyle | undefined, sw: number): string | undefined {
  if (style === 'dashed') return `${sw * 3} ${sw * 2}`;
  if (style === 'dotted') return `${Math.max(1, sw * 0.1)} ${sw * 1.8}`;
  return undefined;
}

function pathUsesCurve(el: MapElement): boolean {
  if (el.pathStyle === 'straight') return false;
  if (el.pathStyle === 'curve') return true;
  return el.type === 'trail';
}

/** Catmull–Rom spline through the points, converted to cubic Bézier for SVG. */
function pointsToSmoothPath(points: { x: number; y: number }[], ox: number, oy: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x - ox} ${points[0]!.y - oy}`;
  if (points.length === 2) {
    return `M ${points[0]!.x - ox} ${points[0]!.y - oy} L ${points[1]!.x - ox} ${points[1]!.y - oy}`;
  }
  const tension = 6;
  let d = `M ${points[0]!.x - ox} ${points[0]!.y - oy}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / tension;
    const c1y = p1.y + (p2.y - p0.y) / tension;
    const c2x = p2.x - (p3.x - p1.x) / tension;
    const c2y = p2.y - (p3.y - p1.y) / tension;
    d += ` C ${c1x - ox} ${c1y - oy}, ${c2x - ox} ${c2y - oy}, ${p2.x - ox} ${p2.y - oy}`;
  }
  return d;
}

const ZOOM_MIN = 0.15;
const ZOOM_MAX = 4;
const GRID_WORLD_SIZE = 10000;
const MIN_ELEMENT_SIZE = 10;
/** Very large uploads are scaled down to this many world units on their longest side. */
const MAX_BACKGROUND_DIM = 3200;
const DEFAULT_STROKE_WIDTH = 6;
const DEFAULT_LABEL_FONT_SIZE = 20;

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

/** Area-weighted centroid so zone titles sit in the visual middle, not the bounding-box center. */
function polygonCentroid(pts: { x: number; y: number }[]): { x: number; y: number } {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length < 3) {
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }
  let area2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const cross = a.x * b.y - b.x * a.y;
    area2 += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area2) < 1e-6) {
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }
  return { x: cx / (3 * area2), y: cy / (3 * area2) };
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
  curved,
}: {
  clickPoints: { x: number; y: number }[];
  freehandLive: { x: number; y: number }[];
  curved?: boolean;
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
  const clickD = curved ? pointsToSmoothPath(clickPoints, minX, minY) : '';
  const liveD = curved ? pointsToSmoothPath(freehandLive, minX, minY) : '';
  const showVertexDots = clickPoints.length > 0 && clickPoints.length <= 80;

  return (
    <div
      className="absolute pointer-events-none z-[5]"
      style={{ left: minX, top: minY, width: w, height: h }}
    >
      <svg width={w} height={h} className="overflow-visible">
        {/* Freehand stroke in progress — solid line so you see the path while dragging */}
        {freehandLive.length >= 2 && (curved ? (
          <path
            d={liveD}
            fill="none"
            stroke="rgba(196,181,253,0.98)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <polyline
            points={livePoly}
            fill="none"
            stroke="rgba(196,181,253,0.98)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
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
        {clickPoints.length >= 2 && (curved ? (
          <path
            d={clickD}
            fill="none"
            stroke="rgba(167,139,250,0.95)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        ) : (
          <polyline
            points={clickPoly}
            fill="none"
            stroke="rgba(167,139,250,0.95)"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
        ))}
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
  const Icon = el.type === 'pin'
    ? pinIconFor(el.pinIcon)
    : isZoneLike(el)
      ? zoneKindOption(zoneKindOf(el)).icon
      : config.icon;
  const isArea = config.style === 'area';
  const w = el.width;
  const h = el.height;
  const bShape: MapBoundaryShape = el.boundaryShape ?? 'rect';

  if (isPathElement(el)) {
    const sw = Math.max(1, el.strokeWidth ?? DEFAULT_STROKE_WIDTH);
    const abs = el.boundaryPoints!.map((p) => ({ x: el.x + p.dx, y: el.y + p.dy }));
    const pad = sw * 2 + 12;
    const minX = Math.min(...abs.map((p) => p.x)) - pad;
    const maxX = Math.max(...abs.map((p) => p.x)) + pad;
    const minY = Math.min(...abs.map((p) => p.y)) - pad;
    const maxY = Math.max(...abs.map((p) => p.y)) + pad;
    const pw = Math.max(maxX - minX, 1);
    const ph = Math.max(maxY - minY, 1);
    const pts = abs.map((p) => `${p.x - minX},${p.y - minY}`).join(' ');
    const curved = pathUsesCurve(el);
    const d = curved ? pointsToSmoothPath(abs, minX, minY) : '';
    const mid = abs[Math.floor(abs.length / 2)]!;
    const dash = dashArrayFor(el.lineStyle ?? (el.type === 'trail' ? 'dashed' : 'solid'), sw);
    const common = {
      fill: 'none' as const,
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
    };
    return (
      <div
        className="absolute select-none"
        style={{
          left: minX,
          top: minY,
          width: pw,
          height: ph,
          zIndex: 5,
          opacity: layerOpacity,
          pointerEvents: 'none',
        }}
      >
        <svg width={pw} height={ph} className="overflow-visible">
          {selected && (curved ? (
            <path d={d} {...common} stroke="rgba(139,92,246,0.55)" strokeWidth={sw + 8} />
          ) : (
            <polyline points={pts} {...common} stroke="rgba(139,92,246,0.55)" strokeWidth={sw + 8} />
          ))}
          {curved ? (
            <>
              <path d={d} {...common} stroke="rgba(0,0,0,0.45)" strokeWidth={sw + 2.5} strokeOpacity={el.opacity} />
              <path d={d} {...common} stroke={el.color} strokeWidth={sw} strokeOpacity={el.opacity} strokeDasharray={dash} />
              <path
                d={d}
                {...common}
                stroke="transparent"
                strokeWidth={Math.max(sw + 12, 18)}
                style={{ pointerEvents: locked ? 'none' : 'stroke', cursor: locked ? 'default' : 'move' }}
                onMouseDown={onMouseDown}
              />
            </>
          ) : (
            <>
              <polyline points={pts} {...common} stroke="rgba(0,0,0,0.45)" strokeWidth={sw + 2.5} strokeOpacity={el.opacity} />
              <polyline points={pts} {...common} stroke={el.color} strokeWidth={sw} strokeOpacity={el.opacity} strokeDasharray={dash} />
              <polyline
                points={pts}
                {...common}
                stroke="transparent"
                strokeWidth={Math.max(sw + 12, 18)}
                style={{ pointerEvents: locked ? 'none' : 'stroke', cursor: locked ? 'default' : 'move' }}
                onMouseDown={onMouseDown}
              />
            </>
          )}
        </svg>
        {el.name && (
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap font-[Cinzel] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] pointer-events-none"
            style={{ left: mid.x - minX, top: mid.y - minY - sw - 16, fontSize: clamp(sw * 2, 10, 14) }}
          >
            {el.name}
          </span>
        )}
      </div>
    );
  }

  if (config.style === 'label') {
    const fs = Math.max(6, el.fontSize ?? DEFAULT_LABEL_FONT_SIZE);
    return (
      <div
        className={`absolute select-none -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 font-[Cinzel] font-semibold tracking-wide transition-shadow ${
          locked ? 'cursor-default' : 'cursor-move'
        } ${selected ? 'shadow-[0_0_0_2px_rgba(139,92,246,0.7)]' : ''}`}
        style={{
          left: el.x,
          top: el.y,
          zIndex: 12,
          opacity: layerOpacity * el.opacity,
          color: el.color,
          fontSize: fs,
          textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)',
          pointerEvents: locked ? 'none' : 'auto',
        }}
        onMouseDown={onMouseDown}
      >
        {el.name || 'Label'}
      </div>
    );
  }

  if (isArea && bShape === 'polygon' && el.boundaryPoints && el.boundaryPoints.length >= 3) {
    const abs = el.boundaryPoints.map((p) => ({ x: el.x + p.dx, y: el.y + p.dy }));
    const minX = Math.min(...abs.map((p) => p.x));
    const maxX = Math.max(...abs.map((p) => p.x));
    const minY = Math.min(...abs.map((p) => p.y));
    const maxY = Math.max(...abs.map((p) => p.y));
    const pw = Math.max(maxX - minX, 1);
    const ph = Math.max(maxY - minY, 1);
    const pts = abs.map((p) => `${p.x - minX},${p.y - minY}`).join(' ');
    const mid = polygonCentroid(abs);
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
            className="absolute -translate-x-1/2 -translate-y-1/2 text-center font-[Cinzel] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pointer-events-none px-1"
            style={{
              left: mid.x - minX,
              top: mid.y - minY,
              fontSize: clamp(Math.min(pw, ph) * 0.1, 11, 18),
              maxWidth: pw * 0.8,
            }}
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
          className={`relative w-full h-full border-2 border-dashed transition-shadow ${
            bShape === 'circle' ? 'rounded-full' : bShape === 'triangle' ? '' : 'rounded-lg'
          } ${locked ? 'cursor-default' : 'cursor-move'} ${selected ? 'shadow-[0_0_0_3px_rgba(139,92,246,0.6)]' : ''}`}
          style={areaShapeStyle()}
        >
          <Icon
            size={Math.min(w, h) * 0.16}
            className="absolute left-1/2 -translate-x-1/2 opacity-35 pointer-events-none"
            style={{
              color: '#fff',
              top: bShape === 'triangle' ? '58%' : '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          {el.name && (
            <span
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-[Cinzel] font-semibold text-center leading-tight px-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none"
              style={{
                top: bShape === 'triangle' ? '66%' : '50%',
                fontSize: clamp(Math.min(w, h) * 0.1, 11, 18),
                maxWidth: '90%',
              }}
            >
              {el.name}
            </span>
          )}
        </div>
      ) : (
        <div className={`wz-pin-drop relative flex flex-col items-center ${locked ? 'cursor-default' : 'cursor-move'}`} style={{ width: w, height: w + 18 }}>
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
  const [bgUploading, setBgUploading] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);
  /** User closed the “start your map” chooser on an empty map. */
  const [starterDismissed, setStarterDismissed] = useState(false);
  const bgFileRef = useRef<HTMLInputElement>(null);

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
    () => toolDrawsPoints(tool, placementBoundaryShape),
    [tool, placementBoundaryShape],
  );
  const toolStyle = tool ? ELEMENT_CONFIGS[tool].style : null;
  const isPathTool = toolStyle === 'path';
  const draftMinPoints = isPathTool ? 2 : 3;

  /** Resolve the stored background; presets re-resolve their URL so hashed asset names survive updates. */
  const background: MapBackgroundImage | null = useMemo(() => {
    const bg = currentMap?.backgroundImage;
    if (!bg?.url) return null;
    const preset = findMapPreset(bg.presetId);
    return preset ? { ...bg, url: preset.url } : bg;
  }, [currentMap?.backgroundImage]);

  const backgroundKey = background
    ? `${background.presetId ?? ''}|${background.url}|${background.width}x${background.height}`
    : '';

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

  /* Centre the view once (first visit only — no cached view yet). Frames the map image if there is one. */
  useLayoutEffect(() => {
    if (didInit.current || !canvasRef.current || !currentMap) return;
    didInit.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const bg = currentMap.backgroundImage;
    if (bg) {
      const margin = 0.92;
      zoomRef.current = clamp(
        Math.min((rect.width * margin) / bg.width, (rect.height * margin) / bg.height),
        ZOOM_MIN,
        ZOOM_MAX,
      );
    } else {
      zoomRef.current = 1;
    }
    panRef.current = { x: rect.width / 2, y: rect.height / 2 };
    if (activeWorldId) _viewCache.set(activeWorldId, { pan: panRef.current, zoom: zoomRef.current });
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
        strokeWidth: el.strokeWidth,
        lineStyle: el.lineStyle,
        pathStyle: el.pathStyle,
        fontSize: el.fontSize,
        pinIcon: el.pinIcon,
        zoneKind: el.zoneKind,
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

  /* ---- Background image (uploaded or preset) ---- */
  const fitToRect = useCallback(
    (w: number, h: number) => {
      if (!canvasRef.current || !(w > 0) || !(h > 0)) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      const margin = 0.92;
      const z = clamp(Math.min((rect.width * margin) / w, (rect.height * margin) / h), ZOOM_MIN, ZOOM_MAX);
      zoomRef.current = z;
      panRef.current = { x: rect.width / 2, y: rect.height / 2 };
      if (activeWorldId) _viewCache.set(activeWorldId, { pan: panRef.current, zoom: z });
      kick();
    },
    [activeWorldId, kick],
  );

  const fitToBackground = useCallback(() => {
    if (background) fitToRect(background.width, background.height);
  }, [background, fitToRect]);

  /** Whenever a map image is set or replaced, frame it in the viewport so pins land on the art. */
  useLayoutEffect(() => {
    if (!background) return;
    const id = window.requestAnimationFrame(() => {
      fitToRect(background.width, background.height);
    });
    return () => window.cancelAnimationFrame(id);
  }, [backgroundKey, background, fitToRect]);

  const setBackgroundFromUrl = useCallback(
    (url: string, presetId?: string) => {
      if (!currentMap) return;
      setBgError(null);
      const mapId = currentMap.id;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        let w = img.naturalWidth || 1600;
        let h = img.naturalHeight || 1200;
        if (!(w > 0) || !(h > 0)) {
          w = 1600;
          h = 1200;
        }
        const longest = Math.max(w, h);
        if (longest > MAX_BACKGROUND_DIM) {
          const k = MAX_BACKGROUND_DIM / longest;
          w = Math.round(w * k);
          h = Math.round(h * k);
        }
        const preset = findMapPreset(presetId);
        const patch: Partial<WorldMap> = {
          backgroundImage: {
            url,
            width: w,
            height: h,
            opacity: 1,
            ...(presetId ? { presetId } : {}),
          },
          // Clear the grid so the parchment is readable; user can turn Grid back on.
          gridEnabled: false,
        };
        if (preset) patch.backgroundColor = preset.backgroundColor;
        updateMap(mapId, patch);
        setStarterDismissed(true);
        window.requestAnimationFrame(() => fitToRect(w, h));
      };
      img.onerror = () =>
        setBgError('Could not load that image. Try another file, or pick a built-in map again.');
      img.src = url;
    },
    [currentMap, updateMap, fitToRect],
  );

  const handleBackgroundFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setBgError('Please choose an image file (PNG, JPG, WEBP…).');
        return;
      }
      setBgError(null);
      setBgUploading(true);
      try {
        const form = new FormData();
        form.append('image', file);
        const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: form });
        const json = await res.json();
        if (json.ok && json.url) {
          // Prefer filename + API_BASE so Electron (localhost:3001) and Vite proxy both work.
          const url =
            typeof json.filename === 'string' && json.filename
              ? `${API_BASE || 'http://localhost:3001'}/api/images/${json.filename}`
              : String(json.url);
          setBackgroundFromUrl(url);
        } else {
          setBgError(json.error || 'Upload failed');
        }
      } catch {
        setBgError('Data server not reachable — is Wurlding fully started?');
      } finally {
        setBgUploading(false);
      }
    },
    [setBackgroundFromUrl],
  );

  const removeBackground = useCallback(() => {
    if (!currentMap) return;
    updateMap(currentMap.id, { backgroundImage: null });
  }, [currentMap, updateMap]);

  const setBackgroundOpacity = useCallback(
    (opacity: number) => {
      if (!currentMap?.backgroundImage) return;
      updateMap(currentMap.id, {
        backgroundImage: { ...currentMap.backgroundImage, opacity },
      });
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
        name: cfg.style === 'label' ? 'New label' : cfg.label,
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
        fontSize: cfg.style === 'label' ? DEFAULT_LABEL_FONT_SIZE : undefined,
        pinIcon: type === 'pin' ? 'pin' : undefined,
        zoneKind: type === 'zone' ? 'zone' : undefined,
      };
      commitElements([...elements, el]);
      setSelectedId(el.id);
      setStarterDismissed(true);
      setTool(null);
      setPolygonDraft([]);
      setFreehandStroke([]);
      freehandStrokeRef.current = [];
      isFreehandDrawingRef.current = false;
    },
    [currentMap, elements, commitElements, activeLayerId],
  );

  const commitPolygonPlacement = useCallback(() => {
    if (!currentMap || !tool) return;
    const cfg = ELEMENT_CONFIGS[tool];
    const isPath = cfg.style === 'path';
    if (!isPath && cfg.style !== 'area') return;
    if (polygonDraft.length < (isPath ? 2 : 3)) return;
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
      opacity: isPath ? 0.95 : 0.45,
      notes: '',
      locationId: '',
      boundaryShape: isPath ? 'path' : 'polygon',
      boundaryPoints: rel,
      strokeWidth: isPath ? Math.max(2, cfg.width) : undefined,
      lineStyle: isPath ? (tool === 'trail' ? 'dashed' : 'solid') : undefined,
      pathStyle: isPath ? (tool === 'trail' ? 'curve' : 'straight') : undefined,
      zoneKind: !isPath && tool === 'zone' ? 'zone' : undefined,
    };
    commitElements([...elements, el]);
    setSelectedId(el.id);
    setStarterDismissed(true);
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
      const world = screenToWorld(sx, sy, pan, zoom);
      if (isPolygonDrawMode) {
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
              strokeWidth: el.strokeWidth, lineStyle: el.lineStyle, pathStyle: el.pathStyle,
              fontSize: el.fontSize, pinIcon: el.pinIcon, zoneKind: el.zoneKind,
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
      const rect = canvasRef.current!.getBoundingClientRect();
      const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, pan, zoom);
      if (isPolygonDrawMode) {
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
        isPolygonDrawMode &&
        polygonDraft.length >= draftMinPoints
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
  }, [selectedId, deleteElement, tool, isPolygonDrawMode, draftMinPoints, polygonDraft, commitPolygonPlacement]);

  /* ---- Property panel helpers ---- */
  const applyProp = (patch: Partial<MapElement>) => {
    let next: Partial<MapElement> = { ...patch };
    if (next.boundaryShape && next.boundaryShape !== 'polygon' && next.boundaryShape !== 'path') {
      next = { ...next, boundaryPoints: undefined };
    }
    setPropForm((f) => ({ ...f, ...next }));
    if (selectedId) updateElement(selectedId, next);
  };

  const selectedStyle = selectedElement ? ELEMENT_CONFIGS[selectedElement.type]?.style : null;
  const selectedIsPath = !!selectedElement && isPathElement(selectedElement);

  const resetView = () => {
    if (background) {
      fitToBackground();
      return;
    }
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
        <MapPin className="wz-float mx-auto mb-4 h-12 w-12 text-mist/40" />
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

          {/* Quick annotation tools */}
          <div className="px-1">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-mist/70">Quick add</p>
            <div className="grid grid-cols-4 gap-1">
              {QUICK_TOOLS.map((t) => {
                const cfg = ELEMENT_CONFIGS[t];
                const Icon = cfg.icon;
                const active = tool === t;
                return (
                  <button
                    key={t}
                    type="button"
                    title={cfg.label}
                    onClick={() => {
                      setTool(t);
                      setPolygonDraft([]);
                      setFreehandStroke([]);
                      freehandStrokeRef.current = [];
                      isFreehandDrawingRef.current = false;
                      if (cfg.style === 'marker' && placementBoundaryShape === 'polygon') setPlacementBoundaryShape('rect');
                      if (t === 'zone') setPlacementBoundaryShape('polygon');
                    }}
                    className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[9px] font-medium transition ${
                      active
                        ? 'border-arcane/40 bg-arcane/20 text-arcane'
                        : 'border-dusk/60 text-mist hover:border-dusk hover:bg-shadow hover:text-moonlight'
                    }`}
                  >
                    <Icon size={14} style={{ color: active ? undefined : cfg.color }} />
                    {t === 'trail' ? 'Trail' : cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map image */}
          <div className="px-1">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-mist/70">
              <ImageIcon size={11} /> Map image
            </p>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleBackgroundFile(f);
                e.target.value = '';
              }}
            />
            {background ? (
              <div className="space-y-1.5 rounded-lg border border-dusk/70 bg-shadow/40 p-1.5">
                <div
                  className="h-16 w-full overflow-hidden rounded border border-dusk/60 bg-void"
                  style={{ backgroundImage: `url(${background.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  aria-hidden
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-mist/70">Fade</span>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    className="flex-1 accent-arcane"
                    value={background.opacity}
                    onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                    title={`Image opacity ${Math.round(background.opacity * 100)}%`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button type="button" className="btn-secondary justify-center p-1.5 text-[10px]" onClick={fitToBackground} title="Fit map to view">
                    <Maximize size={11} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary justify-center p-1.5 text-[10px]"
                    onClick={() => bgFileRef.current?.click()}
                    title="Replace with your own image"
                    disabled={bgUploading}
                  >
                    {bgUploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary justify-center p-1.5 text-[10px] text-blood hover:text-blood"
                    onClick={removeBackground}
                    title="Remove map image (pins and zones stay)"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn-secondary w-full justify-center py-1.5 text-[11px]"
                onClick={() => bgFileRef.current?.click()}
                disabled={bgUploading}
              >
                {bgUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload your map
              </button>
            )}
            <div className="mt-1.5 grid grid-cols-1 gap-1">
              {MAP_PRESETS.map((p) => {
                const active = background?.presetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    title={`${p.name} — ${p.description}`}
                    onClick={() => setBackgroundFromUrl(p.url, p.id)}
                    className={`flex items-center gap-1.5 overflow-hidden rounded-md border p-0.5 text-left transition ${
                      active ? 'border-arcane/60 ring-1 ring-arcane/40' : 'border-dusk/60 hover:border-arcane/40'
                    }`}
                  >
                    <div
                      className="h-8 w-12 flex-shrink-0 rounded-sm bg-void"
                      style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      aria-hidden
                    />
                    <span className="block truncate text-[10px] text-silver">{p.name}</span>
                  </button>
                );
              })}
            </div>
            {bgError && <p className="mt-1 text-[10px] text-blood">{bgError}</p>}
          </div>

          <div className="space-y-3 px-1">
            {tool === 'zone' && (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-mist/70" htmlFor="map-boundary-shape">
                Zone boundary
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
                <option value="polygon">Draw your own</option>
              </select>
              <p className="mt-1 text-[10px] text-mist/80 leading-snug">
                Pick the outline first, then click the map. After it is placed, choose a zone style in Properties — that sets the icon and colour.
              </p>
            </div>
            )}

            {toolStyle === 'label' && (
              <p className="text-[10px] text-mist/80 leading-snug">
                Click the map to drop a text label, then edit the text, size and colour in Properties.
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
                      Click the map to add points (min {draftMinPoints}). Press <kbd className="rounded bg-shadow px-1">Enter</kbd> to
                      finish or <kbd className="rounded bg-shadow px-1">Esc</kbd> to cancel.
                    </p>
                  ) : (
                    <p className="text-[10px] text-mist leading-relaxed">
                      Click and drag on the map — you will see your {isPathTool ? 'path' : 'boundary'} as you draw. Release the mouse,
                      then click <span className="text-silver">{isPathTool ? 'Finish path' : 'Complete shape'}</span> to place it.{' '}
                      <kbd className="rounded bg-shadow px-1">Esc</kbd> cancels.
                    </p>
                  )}
                  <p className="text-[10px] text-arcane tabular-nums">Points: {polygonDraft.length}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-primary flex-1 py-1.5 text-[10px]"
                      disabled={polygonDraft.length < draftMinPoints}
                      onClick={() => commitPolygonPlacement()}
                    >
                      {isPathTool ? 'Finish path' : 'Complete shape'}
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
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => deleteLayer(activeLayerId)}
                disabled={layers.length <= 1}
                className="text-mist hover:text-blood transition p-0.5 disabled:opacity-25 disabled:hover:text-mist disabled:cursor-not-allowed"
                title={layers.length <= 1 ? 'Keep at least one layer' : 'Delete selected layer'}
              >
                <Trash2 size={13} />
              </button>
              <button
                type="button"
                onClick={addLayer}
                className="text-mist hover:text-arcane transition p-0.5"
                title="Add layer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1 pb-1 space-y-0.5">
            {sortedLayers.map((layer) => {
              const isActive = layer.id === activeLayerId;
              const count = layerElementCounts.get(layer.id) ?? 0;
              return (
                <div
                  key={layer.id}
                  className={`flex items-center gap-1 rounded px-1.5 py-1 text-xs transition cursor-pointer ${
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

                  {/* Reorder + Delete */}
                  <div className="shrink-0 flex items-center">
                    <button
                      type="button"
                      className="p-0.5 text-mist/50 hover:text-mist"
                      onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 1); }}
                      title="Move up"
                    >
                      <ChevronUp size={11} />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-mist/50 hover:text-mist"
                      onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, -1); }}
                      title="Move down"
                    >
                      <ChevronDown size={11} />
                    </button>
                    <button
                      type="button"
                      disabled={layers.length <= 1}
                      className="p-0.5 text-mist/60 hover:text-blood transition disabled:opacity-20 disabled:hover:text-mist/60 disabled:cursor-not-allowed"
                      onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                      title={layers.length <= 1 ? 'Keep at least one layer' : `Delete ${layer.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
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
        title={isPolygonDrawMode ? (isPathTool ? 'Click to add points to your path' : 'Click to add vertices to your boundary') : undefined}
        onMouseDown={handleCanvasDown}
        onMouseMove={handleCanvasMove}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) void handleBackgroundFile(f);
        }}
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
          {/* Uploaded / preset map image, centred on the origin.
              Sized wrapper + <img> with max-width/height none so Tailwind preflight
              cannot shrink the art inside the zero-sized transform layer. */}
          {background && (
            <div
              className="absolute pointer-events-none select-none overflow-hidden"
              style={{
                left: -background.width / 2,
                top: -background.height / 2,
                width: background.width,
                height: background.height,
                opacity: background.opacity,
                zIndex: 0,
                backgroundColor: '#1a1510',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
              }}
              aria-hidden
            >
              <img
                src={background.url}
                alt=""
                draggable={false}
                className="block max-h-none max-w-none"
                style={{
                  width: background.width,
                  height: background.height,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  objectFit: 'fill',
                }}
                onLoad={() => {
                  // Ensure framing after the bitmap is actually decoded.
                  fitToRect(background.width, background.height);
                }}
                onError={() =>
                  setBgError('Map image failed to display. Try Fit, re-select a preset, or re-upload.')
                }
              />
            </div>
          )}

          {/* Grid — softer when a map image is present so the art stays readable */}
          {gridEnabled && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: -GRID_WORLD_SIZE / 2,
                top: -GRID_WORLD_SIZE / 2,
                width: GRID_WORLD_SIZE,
                height: GRID_WORLD_SIZE,
                backgroundImage:
                  background
                    ? 'linear-gradient(rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.12) 1px, transparent 1px)'
                    : 'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
                backgroundSize: `${gridSize}px ${gridSize}px`,
              }}
            />
          )}

          {/* Origin crosshair */}
          <div className="absolute pointer-events-none" style={{ left: -1, top: -20, width: 2, height: 40, backgroundColor: 'rgba(139,92,246,0.2)' }} />
          <div className="absolute pointer-events-none" style={{ left: -20, top: -1, width: 40, height: 2, backgroundColor: 'rgba(139,92,246,0.2)' }} />

          {(polygonDraft.length > 0 || freehandStroke.length > 0) && (
            <PolygonDraftOverlay
              clickPoints={polygonDraft}
              freehandLive={freehandStroke}
              curved={tool === 'trail'}
            />
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

        {/* Start-your-map chooser for a brand-new, empty map */}
        {!background && elements.length === 0 && !starterDismissed && !tool && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none">
            <div
              className="wz-modal pointer-events-auto w-full max-w-3xl rounded-xl border border-dusk/80 bg-abyss/95 p-5 shadow-2xl backdrop-blur"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-[Cinzel] text-lg font-semibold text-moonlight">Start your map</h3>
                  <p className="mt-1 text-sm text-mist">
                    Upload your own map image, or pick a ready-made one — then add pins, labels, zones and trails on top.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-mist hover:text-moonlight p-1"
                  onClick={() => setStarterDismissed(true)}
                  aria-label="Close and start with a blank grid"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                <button
                  type="button"
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-arcane/40 bg-arcane/5 p-4 text-center transition hover:border-arcane hover:bg-arcane/10"
                  onClick={() => bgFileRef.current?.click()}
                  disabled={bgUploading}
                >
                  {bgUploading ? (
                    <Loader2 size={22} className="animate-spin text-arcane" />
                  ) : (
                    <Upload size={22} className="text-arcane" />
                  )}
                  <span className="text-sm font-medium text-moonlight">Upload your map</span>
                  <span className="text-[11px] text-mist">PNG, JPG, WEBP · or drop it on the canvas</span>
                </button>
                {MAP_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="group overflow-hidden rounded-lg border border-dusk/70 bg-shadow/40 text-left transition hover:border-arcane/50"
                    onClick={() => setBackgroundFromUrl(p.url, p.id)}
                  >
                    <div
                      className="h-24 w-full bg-void transition group-hover:scale-[1.03]"
                      style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                      aria-hidden
                    />
                    <div className="p-2">
                      <span className="block text-sm font-medium text-moonlight">{p.name}</span>
                      <span className="block text-[11px] leading-snug text-mist">{p.description}</span>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-xs text-mist underline-offset-2 hover:text-moonlight hover:underline"
                onClick={() => setStarterDismissed(true)}
              >
                Start with a blank grid instead
              </button>
            </div>
          </div>
        )}

        {/* Tool indicator */}
        {tool && !isPolygonDrawMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-arcane/90 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg flex items-center gap-2 pointer-events-none">
            <Plus size={14} />
            {toolStyle === 'label' ? (
              <>Click the map to place a label</>
            ) : (
              <>
                Place {ELEMENT_CONFIGS[tool].label} ({placementBoundaryShape === 'rect' ? 'square' : placementBoundaryShape}) on &ldquo;
                {layers.find((l) => l.id === activeLayerId)?.name ?? 'layer'}&rdquo;
              </>
            )}
          </div>
        )}
        {isPolygonDrawMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-mystic/90 text-white px-4 py-1.5 rounded-full text-xs font-medium shadow-lg pointer-events-none text-center max-w-lg">
            {polygonDrawStyle === 'freehand' && freehandStroke.length > 0 ? (
              <>
                Drawing — {isPathTool ? 'path' : 'boundary'} follows your cursor · <span className="text-moonlight">release the mouse</span> to
                finish the stroke
              </>
            ) : polygonDrawStyle === 'freehand' && polygonDraft.length >= draftMinPoints ? (
              <>
                {isPathTool ? 'Path' : 'Boundary'} set — {polygonDraft.length} points · click{' '}
                <span className="text-moonlight">{isPathTool ? 'Finish path' : 'Complete shape'}</span> to place on the map
              </>
            ) : polygonDrawStyle === 'freehand' ? (
              <>Click and drag on the map — your {isPathTool ? 'path' : 'line'} appears as you draw</>
            ) : (
              <>
                {isPathTool ? `${ELEMENT_CONFIGS[tool!].label}: ` : 'Point to point — '}
                {polygonDraft.length} point{polygonDraft.length === 1 ? '' : 's'} ·{' '}
                <kbd className="rounded bg-black/30 px-1">Enter</kbd> to {isPathTool ? 'finish' : 'complete'} (min {draftMinPoints})
              </>
            )}
          </div>
        )}

        {/* Resize handles overlay */}
        {selectedElement &&
          !tool &&
          selectedElement.boundaryShape !== 'polygon' &&
          selectedElement.boundaryShape !== 'path' &&
          ELEMENT_CONFIGS[selectedElement.type]?.style !== 'label' &&
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
              {(() => {
                const Icon =
                  selectedElement.type === 'pin'
                    ? pinIconFor(propForm.pinIcon ?? selectedElement.pinIcon)
                    : isZoneLike(selectedElement)
                      ? zoneKindOption(propForm.zoneKind ?? zoneKindOf(selectedElement)).icon
                      : ELEMENT_CONFIGS[selectedElement.type].icon;
                return <Icon size={16} style={{ color: selectedElement.color }} />;
              })()}
              <span className="text-sm font-medium text-silver">
                {isZoneLike(selectedElement)
                  ? `Zone · ${zoneKindOption(propForm.zoneKind ?? zoneKindOf(selectedElement)).label}`
                  : ELEMENT_CONFIGS[selectedElement.type].label}
              </span>
            </div>

            {/* Name */}
            <div>
              <label className="label text-xs" htmlFor="prop-name">
                {selectedStyle === 'label' ? 'Text' : 'Name'}
              </label>
              <input
                id="prop-name"
                className="input text-sm"
                value={propForm.name ?? ''}
                onChange={(e) => applyProp({ name: e.target.value })}
                placeholder={selectedStyle === 'label' ? 'Label text' : 'Name this element'}
                autoFocus={selectedStyle === 'label'}
              />
            </div>

            {isZoneLike(selectedElement) && (
              <div>
                <label className="label text-xs">Zone style</label>
                <p className="mb-1.5 text-[10px] text-mist leading-snug">
                  Chooses the icon and a matching colour. You can still override colour below.
                </p>
                <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Zone style">
                  {ZONE_KIND_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = (propForm.zoneKind ?? zoneKindOf(selectedElement)) === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={opt.label}
                        onClick={() => {
                          const currentName = (propForm.name ?? selectedElement.name ?? '').trim();
                          const isDefaultName =
                            !currentName || ZONE_KIND_OPTIONS.some((k) => k.label === currentName);
                          applyProp({
                            zoneKind: opt.id,
                            color: opt.color,
                            ...(isDefaultName ? { name: opt.label } : {}),
                          });
                        }}
                        className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 text-[9px] transition ${
                          active
                            ? 'border-arcane/60 bg-arcane/20 text-moonlight'
                            : 'border-dusk/70 bg-shadow/50 text-mist hover:border-dusk hover:text-moonlight'
                        }`}
                      >
                        <Icon size={15} style={{ color: active ? opt.color : undefined }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedElement.type === 'pin' && (
              <div>
                <label className="label text-xs">Pin icon</label>
                <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Pin icon">
                  {PIN_ICON_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = (propForm.pinIcon ?? selectedElement.pinIcon ?? 'pin') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        title={opt.label}
                        onClick={() => applyProp({ pinIcon: opt.id })}
                        className={`flex h-9 w-full items-center justify-center rounded-md border transition ${
                          active
                            ? 'border-arcane/60 bg-arcane/20 text-moonlight'
                            : 'border-dusk/70 bg-shadow/50 text-mist hover:border-dusk hover:text-moonlight'
                        }`}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedStyle === 'label' && (
              <div>
                <label className="label text-xs">Text size</label>
                <input
                  type="range"
                  min={8}
                  max={96}
                  step={1}
                  className="w-full accent-arcane"
                  value={propForm.fontSize ?? DEFAULT_LABEL_FONT_SIZE}
                  onChange={(e) => applyProp({ fontSize: parseInt(e.target.value, 10) })}
                />
                <span className="text-[10px] text-mist">{propForm.fontSize ?? DEFAULT_LABEL_FONT_SIZE}px</span>
              </div>
            )}

            {selectedIsPath && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Line width</label>
                  <input
                    type="range"
                    min={1}
                    max={40}
                    step={1}
                    className="w-full mt-2 accent-arcane"
                    value={propForm.strokeWidth ?? DEFAULT_STROKE_WIDTH}
                    onChange={(e) => applyProp({ strokeWidth: parseInt(e.target.value, 10) })}
                  />
                  <span className="text-[10px] text-mist">{propForm.strokeWidth ?? DEFAULT_STROKE_WIDTH}px</span>
                </div>
                <div>
                  <label className="label text-xs">Line style</label>
                  <select
                    className="select text-sm"
                    value={propForm.lineStyle ?? (selectedElement.type === 'trail' ? 'dashed' : 'solid')}
                    onChange={(e) => applyProp({ lineStyle: e.target.value as MapLineStyle })}
                  >
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label text-xs">Line shape</label>
                  <select
                    className="select text-sm"
                    value={
                      propForm.pathStyle ??
                      (selectedElement.type === 'trail' ? 'curve' : 'straight')
                    }
                    onChange={(e) => applyProp({ pathStyle: e.target.value as MapPathStyle })}
                  >
                    <option value="curve">Curved</option>
                    <option value="straight">Straight</option>
                  </select>
                </div>
              </div>
            )}

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
            {isZoneLike(selectedElement) && (
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
            )}

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
            {!selectedIsPath && selectedStyle !== 'label' && (
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
            )}

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
