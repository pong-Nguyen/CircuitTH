import { useEffect, useRef, useState } from 'react';
import type {
  CircuitComponent,
  ComponentType,
  DependentSourceConfig,
  LedConfig,
  Pin,
  Point,
  SourceConfig,
  SwitchConfig,
  TransistorConfig,
  Wire,
} from '../types';
import { useViewport, screenToWorld, worldToScreen } from '../hooks/useViewport';

const GRID = 20;

function snap(v: number) {
  return Math.round(v / GRID) * GRID;
}

function updatePins(x: number, y: number, rotation: number, type?: string): Pin[] {
  if (type === 'GND') return [{ x, y }]; // single pin at center top
  const d = GRID * 2;
  if (type === 'Q' || type === 'M') {
    const localPins = [
      { x: d, y: -d },
      { x: -d, y: 0 },
      { x: d, y: d },
    ];
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.round(Math.cos(rad));
    const sin = Math.round(Math.sin(rad));
    return localPins.map(p => ({
      x: x + p.x * cos - p.y * sin,
      y: y + p.x * sin + p.y * cos,
    }));
  }
  if (type === 'E' || type === 'G') {
    const localPins = [
      { x: -d, y: 0 },
      { x: d, y: 0 },
      { x: 0, y: -d },
      { x: 0, y: d },
    ];
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.round(Math.cos(rad));
    const sin = Math.round(Math.sin(rad));
    return localPins.map(p => ({
      x: x + p.x * cos - p.y * sin,
      y: y + p.x * sin + p.y * cos,
    }));
  }
  switch (rotation) {
    case 90:  return [{ x, y: y - d }, { x, y: y + d }];
    case 180: return [{ x: x + d, y }, { x: x - d, y }];
    case 270: return [{ x, y: y + d }, { x, y: y - d }];
    default:  return [{ x: x - d, y }, { x: x + d, y }];
  }
}

function defaultValue(type: string) {
  if (type === 'R') return '1k';
  if (type === 'C') return '1u';
  if (type === 'L') return '1m';
  if (type === 'V') return '10';
  if (type === 'I') return '1m';
  if (type === 'E' || type === 'G') return '1';
  if (type === 'F' || type === 'H') return 'V1 1';
  if (type === 'K') return 'open';
  if (type === 'LED') return 'red';
  if (type === 'Q' || type === 'M') return '1m';
  return '';
}

function defaultSource(type: string): SourceConfig | undefined {
  if (type !== 'V' && type !== 'I') return undefined;
  const dc = type === 'V' ? '5' : '1m';
  return {
    mode: 'DC',
    dc,
    acMag: '1',
    acPhase: '0',
    pulseInitial: '0',
    pulsePulsed: dc,
    pulseDelay: '0',
    pulseRise: '1u',
    pulseFall: '1u',
    pulseWidth: '1m',
    pulsePeriod: '2m',
    sinOffset: '0',
    sinAmplitude: dc,
    sinFrequency: '1k',
    sinDelay: '0',
    sinDamping: '0',
    sinPhase: '0',
  };
}

function defaultDependent(type: string): DependentSourceConfig | undefined {
  if (type === 'F' || type === 'H') return { vctrl: 'V1', gain: '1' };
  return undefined;
}

function defaultSwitch(type: string): SwitchConfig | undefined {
  if (type === 'K') return { closed: false };
  return undefined;
}

function defaultLed(type: string): LedConfig | undefined {
  if (type === 'LED') return { color: 'red' };
  return undefined;
}

function defaultTransistor(type: string): TransistorConfig | undefined {
  if (type === 'Q') return { kind: 'NPN', gm: '1m', outputResistance: '1Meg' };
  if (type === 'M') return { kind: 'NMOS', gm: '1m', outputResistance: '1Meg' };
  return undefined;
}

function componentLabel(c: CircuitComponent) {
  if (c.type === 'GND') return '';
  if ((c.type === 'F' || c.type === 'H') && c.dependent) {
    return `${c.id} ${c.dependent.vctrl} ${c.dependent.gain}`;
  }
  if ((c.type === 'V' || c.type === 'I') && c.source) {
    return `${c.id} ${c.source.mode}`;
  }
  if (c.type === 'K') return `${c.id} ${c.switch?.closed ? 'closed' : 'open'}`;
  if (c.type === 'LED') return `${c.id} ${c.led?.color ?? 'red'}`;
  if (c.type === 'Q' || c.type === 'M') return `${c.id} ${c.transistor?.kind ?? (c.type === 'Q' ? 'NPN' : 'NMOS')}`;
  return `${c.id} ${c.value}`;
}

function distSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const len2 = C * C + D * D;
  const t = len2 ? Math.max(0, Math.min(1, (A * C + B * D) / len2)) : 0;
  return Math.sqrt((px - x1 - t * C) ** 2 + (py - y1 - t * D) ** 2);
}

function pointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  return distSeg(px, py, ax, ay, bx, by) < 1.5;
}

interface Props {
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponent: CircuitComponent | null;
  selectedWire: string | null;
  setComponents: React.Dispatch<React.SetStateAction<CircuitComponent[]>>;
  setWires: React.Dispatch<React.SetStateAction<Wire[]>>;
  setSelectedComponent: React.Dispatch<React.SetStateAction<CircuitComponent | null>>;
  setSelectedWire: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTool: string | null;
  setSelectedTool: React.Dispatch<React.SetStateAction<string | null>>;
}

export default function Canvas({
  components, wires,
  selectedComponent, selectedWire,
  setComponents, setWires,
  setSelectedComponent, setSelectedWire,
  selectedTool, setSelectedTool,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // World-space mouse position (snapped used for ghost/wire preview)
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [drawingWire, setDrawingWire] = useState(false);
  const [tempWire, setTempWire] = useState<Point[]>([]);
  const [ghostRotation, setGhostRotation] = useState<0 | 90 | 180 | 270>(0);

  const {
    viewport,
    isPanning,
    beginPan,
    continuePan,
    endPan,
    zoomAt,
    resetViewport,
  } = useViewport();

  const isWireTool = selectedTool === 'wire';
  const isComponentTool = selectedTool && selectedTool !== 'wire';

  // ─── Coordinate helpers ───────────────────────────────────────────────────

  /** Get canvas-element-relative pixel position from a mouse event. */
  function getScreenXY(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // canvas logical size == CSS size (we keep them in sync), so no DPR scaling needed.
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  /** Screen → world-space. */
  function toWorld(screenPt: Point): Point {
    return screenToWorld(screenPt, viewport);
  }

  // ─── Junction computation ─────────────────────────────────────────────────

  function computeJunctions(): Point[] {
    const allWirePoints = new Set<string>();
    for (const wire of wires)
      for (const p of wire.points)
        allWirePoints.add(`${p.x},${p.y}`);

    const touchCount = new Map<string, number>();
    for (const wire of wires) {
      const touched = new Set<string>();
      for (let i = 0; i < wire.points.length - 1; i++) {
        const a = wire.points[i], b = wire.points[i + 1];
        for (const key of allWirePoints) {
          const [cx, cy] = key.split(',').map(Number);
          if (pointOnSegment(cx, cy, a.x, a.y, b.x, b.y) && !touched.has(key)) {
            touched.add(key);
            touchCount.set(key, (touchCount.get(key) || 0) + 1);
          }
        }
      }
    }

    const junctions = new Set<string>();
    for (const [key, count] of touchCount)
      if (count >= 2) junctions.add(key);

    for (const c of components)
      for (const pin of c.pins) {
        const key = `${pin.x},${pin.y}`;
        for (const wire of wires)
          for (let i = 0; i < wire.points.length - 1; i++) {
            const a = wire.points[i], b = wire.points[i + 1];
            if (pointOnSegment(pin.x, pin.y, a.x, a.y, b.x, b.y))
              junctions.add(key);
          }
      }

    return [...junctions].map(k => {
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    });
  }

  // ─── Drawing ──────────────────────────────────────────────────────────────

  function drawGnd(ctx: CanvasRenderingContext2D) {
    // Vertical stem from pin (top) down
    const stemLen = GRID * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, stemLen);
    ctx.stroke();

    // Three horizontal bars, decreasing width
    const bars = [GRID * 1.0, GRID * 0.65, GRID * 0.3];
    const spacing = GRID * 0.38;
    bars.forEach((halfW, i) => {
      const y = stemLen + i * spacing;
      ctx.beginPath();
      ctx.moveTo(-halfW, y);
      ctx.lineTo(halfW, y);
      ctx.stroke();
    });
  }

  function drawResistor(ctx: CanvasRenderingContext2D) {
    const d = GRID * 2, hw = GRID, hh = GRID * 0.6;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-hw, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw, 0); ctx.lineTo(d, 0); ctx.stroke();
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  }

  function drawVoltageSource(ctx: CanvasRenderingContext2D) {
    const d = GRID * 2, r = GRID * 0.8;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-r, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(d, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.font = `bold ${GRID * 0.7}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('-', GRID * 0.35, GRID * 0.25);
    ctx.fillText('+', -GRID * 0.35, GRID * 0.25);
  }

  function drawCurrentSource(ctx: CanvasRenderingContext2D) {
    const d = GRID * 2, r = GRID * 0.8;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-r, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(d, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-GRID * 0.35, 0);
    ctx.lineTo(GRID * 0.35, 0);
    ctx.moveTo(GRID * 0.12, -GRID * 0.23);
    ctx.lineTo(GRID * 0.35, 0);
    ctx.lineTo(GRID * 0.12, GRID * 0.23);
    ctx.stroke();
  }

  function drawCapacitor(ctx: CanvasRenderingContext2D) {
    const d = GRID * 2, plate = GRID * 0.65, gap = GRID * 0.28;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-gap, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gap, 0); ctx.lineTo(d, 0); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-gap, -plate); ctx.lineTo(-gap, plate);
    ctx.moveTo(gap, -plate); ctx.lineTo(gap, plate);
    ctx.stroke();
  }

  function drawInductor(ctx: CanvasRenderingContext2D) {
    const d = GRID * 2, r = GRID * 0.38;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-GRID * 0.9, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(GRID * 0.9, 0); ctx.lineTo(d, 0); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const cx = -GRID * 0.6 + i * GRID * 0.4;
      ctx.arc(cx, 0, r, Math.PI, 0, false);
    }
    ctx.stroke();
  }

  function drawDiode(ctx: CanvasRenderingContext2D) {
    const d = GRID * 2, w = GRID * 0.9, h = GRID * 0.7;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-w, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(d, 0); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(-w, h);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w, -h);
    ctx.lineTo(w, h);
    ctx.stroke();
  }

  function drawLed(ctx: CanvasRenderingContext2D, color = '#ef4444') {
    drawDiode(ctx);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(GRID * 0.2, -GRID * 1.0);
    ctx.lineTo(GRID * 0.9, -GRID * 1.7);
    ctx.moveTo(GRID * 0.55, -GRID * 0.65);
    ctx.lineTo(GRID * 1.25, -GRID * 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GRID * 0.9, -GRID * 1.7);
    ctx.lineTo(GRID * 0.68, -GRID * 1.18);
    ctx.lineTo(GRID * 1.22, -GRID * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(GRID * 1.25, -GRID * 1.35);
    ctx.lineTo(GRID * 1.03, -GRID * 0.83);
    ctx.lineTo(GRID * 1.57, -GRID * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSwitch(ctx: CanvasRenderingContext2D, closed = false) {
    const d = GRID * 2;
    const gap = GRID * 0.65;
    ctx.beginPath();
    ctx.moveTo(-d, 0);
    ctx.lineTo(-gap, 0);
    ctx.moveTo(gap, 0);
    ctx.lineTo(d, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-gap, 0, 3.2, 0, Math.PI * 2);
    ctx.arc(gap, 0, 3.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-gap, 0);
    ctx.lineTo(gap, closed ? 0 : -GRID * 0.75);
    ctx.stroke();
  }

  function drawBjt(ctx: CanvasRenderingContext2D, kind = 'NPN') {
    const d = GRID * 2;
    ctx.beginPath();
    ctx.moveTo(-d, 0); ctx.lineTo(-GRID * 0.65, 0);
    ctx.moveTo(-GRID * 0.65, -GRID); ctx.lineTo(-GRID * 0.65, GRID);
    ctx.moveTo(-GRID * 0.65, -GRID * 0.55); ctx.lineTo(d, -d);
    ctx.moveTo(-GRID * 0.65, GRID * 0.55); ctx.lineTo(d, d);
    ctx.stroke();
    const direction = kind === 'PNP' ? -1 : 1;
    const ax = GRID * 0.9;
    const ay = GRID * 1.1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax - direction * GRID * 0.35, ay - GRID * 0.05);
    ctx.lineTo(ax - GRID * 0.05, ay - direction * GRID * 0.35);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
  }

  function drawMosfet(ctx: CanvasRenderingContext2D, kind = 'NMOS') {
    const d = GRID * 2;
    ctx.beginPath();
    ctx.moveTo(-d, 0); ctx.lineTo(-GRID, 0);
    ctx.moveTo(-GRID, -GRID); ctx.lineTo(-GRID, GRID);
    ctx.moveTo(-GRID * 0.45, -GRID); ctx.lineTo(-GRID * 0.45, GRID);
    ctx.moveTo(-GRID * 0.45, -GRID * 0.65); ctx.lineTo(d, -d);
    ctx.moveTo(-GRID * 0.45, GRID * 0.65); ctx.lineTo(d, d);
    ctx.stroke();
    const direction = kind === 'PMOS' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(-GRID * 0.25 * direction, 0);
    ctx.lineTo(GRID * 0.45 * direction, 0);
    ctx.lineTo(GRID * 0.15 * direction, -GRID * 0.25);
    ctx.moveTo(GRID * 0.45 * direction, 0);
    ctx.lineTo(GRID * 0.15 * direction, GRID * 0.25);
    ctx.stroke();
  }

  function ledColor(color?: string) {
    if (color === 'green') return '#22c55e';
    if (color === 'blue') return '#3b82f6';
    if (color === 'yellow') return '#facc15';
    if (color === 'white') return '#e5e7eb';
    return '#ef4444';
  }

  function drawDependentSource(ctx: CanvasRenderingContext2D, type: string) {
    const d = GRID * 2, r = GRID * 1.0;
    ctx.beginPath(); ctx.moveTo(-d, 0); ctx.lineTo(-r, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(d, 0); ctx.stroke();
    if (type === 'E' || type === 'G') {
      ctx.beginPath(); ctx.moveTo(0, -d); ctx.lineTo(0, -r); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, d); ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.font = `bold ${GRID * 0.7}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type, 0, 0);
    ctx.textBaseline = 'alphabetic';
  }

  function drawComponent(ctx: CanvasRenderingContext2D, c: CircuitComponent, isGhost = false) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(((c.rotation || 0) * Math.PI) / 180);
    ctx.globalAlpha = isGhost ? 0.5 : 1;
    const isSelected = !isGhost && selectedComponent?.uuid === c.uuid;
    ctx.strokeStyle = isGhost ? '#0066ff' : isSelected ? '#ff8800' : '#111';
    ctx.lineWidth = 2;
    if (c.type === 'R') drawResistor(ctx);
    if (c.type === 'C') drawCapacitor(ctx);
    if (c.type === 'L') drawInductor(ctx);
    if (c.type === 'V') drawVoltageSource(ctx);
    if (c.type === 'I') drawCurrentSource(ctx);
    if (['E', 'F', 'G', 'H'].includes(c.type)) drawDependentSource(ctx, c.type);
    if (c.type === 'D') drawDiode(ctx);
    if (c.type === 'LED') drawLed(ctx, ledColor(c.led?.color));
    if (c.type === 'K') drawSwitch(ctx, c.switch?.closed);
    if (c.type === 'Q') drawBjt(ctx, c.transistor?.kind);
    if (c.type === 'M') drawMosfet(ctx, c.transistor?.kind);
    if (c.type === 'GND') drawGnd(ctx);
    ctx.restore();

    ctx.globalAlpha = isGhost ? 0.5 : 1;
    ctx.fillStyle = isGhost ? 'rgba(0,80,200,0.7)' : '#111';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    // GND has no value label; only show id for non-GND
    if (c.type !== 'GND') {
      ctx.fillText(componentLabel(c), c.x - GRID, c.y - GRID * 1.6);
    }

    if (!isGhost) {
      for (const p of c.pins) {
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawWire(ctx: CanvasRenderingContext2D, wire: Wire) {
    const isSelected = selectedWire === wire.id;
    ctx.strokeStyle = isSelected ? '#ff8800' : '#0044cc';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(wire.points[0].x, wire.points[0].y);
    for (const p of wire.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function drawPreviewWire(ctx: CanvasRenderingContext2D) {
    if (!drawingWire || tempWire.length === 0) return;
    const snapped = { x: snap(mousePos.x), y: snap(mousePos.y) };
    const last = tempWire[tempWire.length - 1];
    ctx.strokeStyle = 'rgba(0,68,204,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(tempWire[0].x, tempWire[0].y);
    for (const p of tempWire.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.lineTo(snapped.x, last.y);
    ctx.lineTo(snapped.x, snapped.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,68,204,0.7)';
    ctx.beginPath();
    ctx.arc(snapped.x, snapped.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function render() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const { offsetX, offsetY, scale } = viewport;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply viewport transform for all world-space elements
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    for (const w of wires) drawWire(ctx, w);
    drawPreviewWire(ctx);

    for (const j of computeJunctions()) {
      ctx.fillStyle = '#0044cc';
      ctx.beginPath();
      ctx.arc(j.x, j.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const c of components) drawComponent(ctx, c);

    // Ghost component (follows world-snapped mouse position)
    if (isComponentTool && !drawingWire) {
      const sx = snap(mousePos.x), sy = snap(mousePos.y);
      const count = components.filter(c => c.type === selectedTool).length;
      const ghost: CircuitComponent = {
        uuid: '__ghost__',
        id: selectedTool + (count + 1),
        type: selectedTool as ComponentType,
        x: sx, y: sy,
        rotation: ghostRotation,
        flipX: false, flipY: false,
        value: defaultValue(selectedTool),
        source: defaultSource(selectedTool),
        dependent: defaultDependent(selectedTool),
        switch: defaultSwitch(selectedTool),
        led: defaultLed(selectedTool),
        transistor: defaultTransistor(selectedTool),
        pins: updatePins(sx, sy, ghostRotation, selectedTool),
      };
      drawComponent(ctx, ghost, true);
    }

    // Wire-tool crosshair cursor highlight
    if (isWireTool && !drawingWire) {
      const sx = snap(mousePos.x), sy = snap(mousePos.y);
      ctx.strokeStyle = 'rgba(0,100,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy); ctx.lineTo(sx + 8, sy);
      ctx.moveTo(sx, sy - 8); ctx.lineTo(sx, sy + 8);
      ctx.stroke();
    }

    ctx.restore();

    // Zoom indicator (screen-space, bottom-right corner)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(canvas.width - 72, canvas.height - 26, 68, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(scale * 100)}%`, canvas.width - 8, canvas.height - 10);
  }

  // ─── Hit Testing (world-space) ────────────────────────────────────────────

  function findPin(wx: number, wy: number) {
    for (const c of components)
      for (const p of c.pins) {
        const dx = wx - p.x, dy = wy - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < GRID * 0.75) return p;
      }
    return null;
  }

  function findComponent(wx: number, wy: number) {
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i];
      const halfH = c.type === 'E' || c.type === 'G' ? GRID * 2.5 : GRID * 1.5;
      if (Math.abs(wx - c.x) <= GRID * 2.5 && Math.abs(wy - c.y) <= halfH)
        return c;
    }
    return null;
  }

  function findWire(wx: number, wy: number) {
    for (const wire of wires)
      for (let i = 0; i < wire.points.length - 1; i++) {
        const a = wire.points[i], b = wire.points[i + 1];
        if (distSeg(wx, wy, a.x, a.y, b.x, b.y) < 8) return wire;
      }
    return null;
  }

  function findPointOnWire(wx: number, wy: number): Point | null {
    for (const wire of wires)
      for (let i = 0; i < wire.points.length - 1; i++) {
        const a = wire.points[i], b = wire.points[i + 1];
        if (distSeg(wx, wy, a.x, a.y, b.x, b.y) < 10) {
          if (a.x === b.x) return { x: a.x, y: snap(wy) };
          if (a.y === b.y) return { x: snap(wx), y: a.y };
        }
      }
    return null;
  }

  // ─── Mouse ────────────────────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const screen = getScreenXY(e);
    const world = toWorld(screen);
    const { x: wx, y: wy } = world;
    const swx = snap(wx), swy = snap(wy);

    // ── PLACE component ──
    if (isComponentTool && !drawingWire) {
      const type = selectedTool as ComponentType;
      const count = components.filter(c => c.type === type).length;
      const nextComponent: CircuitComponent = {
        uuid: crypto.randomUUID(),
        id: type + (count + 1),
        type, x: swx, y: swy,
        rotation: ghostRotation,
        flipX: false, flipY: false,
        value: defaultValue(type),
        source: defaultSource(type),
        dependent: defaultDependent(type),
        switch: defaultSwitch(type),
        led: defaultLed(type),
        transistor: defaultTransistor(type),
        pins: updatePins(swx, swy, ghostRotation, type),
      };
      setComponents(prev => [...prev, nextComponent]);
      setSelectedComponent(nextComponent);
      setSelectedWire(null);
      if (!e.shiftKey) setSelectedTool(null);
      return;
    }

    // ── WIRE TOOL ──
    if (isWireTool) {
      if (!drawingWire) {
        const pin = findPin(wx, wy);
        const onWire = findPointOnWire(wx, wy);
        const startPt = pin ?? onWire ?? { x: swx, y: swy };
        setDrawingWire(true);
        setTempWire([startPt]);
        setSelectedComponent(null);
        setSelectedWire(null);
      } else {
        const endPin = findPin(wx, wy);
        const endWire = findPointOnWire(wx, wy);
        const endPt = endPin ?? endWire;
        if (endPt) {
          const last = tempWire[tempWire.length - 1];
          const finalPoints = [...tempWire, { x: endPt.x, y: last.y }, { x: endPt.x, y: endPt.y }];
          setWires(prev => [...prev, { id: crypto.randomUUID(), points: finalPoints }]);
          setDrawingWire(false);
          setTempWire([]);
        } else {
          const last = tempWire[tempWire.length - 1];
          setTempWire(prev => [...prev, { x: swx, y: last.y }, { x: swx, y: swy }]);
        }
      }
      return;
    }

    // ── SELECT / DRAG ──
    const comp = findComponent(wx, wy);
    if (comp) {
      setSelectedComponent(comp);
      setSelectedWire(null);
      setDraggingId(comp.uuid);
      setDragOffset({ x: wx - comp.x, y: wy - comp.y });
      return;
    }

    const wire = findWire(wx, wy);
    if (wire) {
      setSelectedWire(wire.id);
      setSelectedComponent(null);
      return;
    }

    // ── PAN (left-button on empty canvas) ──
    setSelectedComponent(null);
    setSelectedWire(null);
    beginPan(screen);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const screen = getScreenXY(e);
    const world = toWorld(screen);
    setMousePos(world);

    // Panning takes priority
    if (continuePan(screen)) return;

    // Dragging a component
    if (draggingId) {
      const sx = snap(world.x - dragOffset.x);
      const sy = snap(world.y - dragOffset.y);
      setComponents(prev =>
        prev.map(c =>
          c.uuid !== draggingId ? c
            : { ...c, x: sx, y: sy, pins: updatePins(sx, sy, c.rotation || 0, c.type) }
        )
      );
    }
  }

  function handleMouseUp() {
    endPan();
    setDraggingId(null);
  }

  /** Zoom on scroll wheel, anchored at cursor position. */
  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const screen = getScreenXY(e as unknown as React.MouseEvent<HTMLCanvasElement>);
    zoomAt(screen, e.deltaY);
  }

  function rotateSelectedComponent() {
    if (!selectedComponent) return false;
    const newRot = (((selectedComponent.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
    const updated = {
      ...selectedComponent,
      rotation: newRot,
      pins: updatePins(selectedComponent.x, selectedComponent.y, newRot, selectedComponent.type),
    };
    setComponents(prev => prev.map(c => c.uuid === updated.uuid ? updated : c));
    setSelectedComponent(updated);
    return true;
  }

  function flipSelectedComponent(axis: 'x' | 'y') {
    if (!selectedComponent) return;
    const newRot = (((selectedComponent.rotation || 0) + 180) % 360) as 0 | 90 | 180 | 270;
    const updated = {
      ...selectedComponent,
      flipX: axis === 'x' ? !selectedComponent.flipX : selectedComponent.flipX,
      flipY: axis === 'y' ? !selectedComponent.flipY : selectedComponent.flipY,
      rotation: newRot,
      pins: updatePins(selectedComponent.x, selectedComponent.y, newRot, selectedComponent.type),
    };
    setComponents(prev => prev.map(c => c.uuid === updated.uuid ? updated : c));
    setSelectedComponent(updated);
  }

  function deleteSelectedComponent() {
    if (!selectedComponent) return;
    setComponents(prev => prev.filter(c => c.uuid !== selectedComponent.uuid));
    setSelectedComponent(null);
  }

  // ─── Keyboard ────────────────────────────────────────────────────────────

  function handleKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Escape') {
      if (drawingWire) { setDrawingWire(false); setTempWire([]); }
      else setSelectedTool(null);
    }
    if (e.key === 'r' || e.key === 'R') {
      if (selectedComponent) {
        e.preventDefault();
        rotateSelectedComponent();
      } else if (isComponentTool) {
        e.preventDefault();
        setGhostRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
      }
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedComponent) {
        setComponents(prev => prev.filter(c => c.uuid !== selectedComponent.uuid));
        setSelectedComponent(null);
      }
      if (selectedWire) {
        setWires(prev => prev.filter(w => w.id !== selectedWire));
        setSelectedWire(null);
      }
    }
    // Zoom shortcuts  (+/- or Ctrl+=)
    if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) zoomAt({ x: canvas.width / 2, y: canvas.height / 2 }, -1);
    }
    if (e.key === '-') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) zoomAt({ x: canvas.width / 2, y: canvas.height / 2 }, 1);
    }
    // Reset view
    if (e.key === '0' && e.ctrlKey) {
      e.preventDefault();
      resetViewport();
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingWire, selectedTool, selectedComponent, selectedWire, ghostRotation, viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || 800));
      const height = Math.max(1, Math.round(rect.height || window.innerHeight));
      canvas.width = width;
      canvas.height = height;
      setCanvasSize({ width, height });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Resize canvas to CSS size and re-render whenever state changes
  useEffect(() => {
    render();
  }, [components, wires, selectedComponent, selectedWire, mousePos, tempWire, drawingWire, selectedTool, ghostRotation, viewport, canvasSize]);

  // ─── Cursor ───────────────────────────────────────────────────────────────

  const getCursor = () => {
    if (isPanning.current) return 'grabbing';
    if (isComponentTool || isWireTool || drawingWire) return 'crosshair';
    if (draggingId) return 'grabbing';
    return 'default';
  };

  const selectedScreen = selectedComponent
    ? worldToScreen({ x: selectedComponent.x, y: selectedComponent.y }, viewport)
    : null;
  const taskbarLeft = selectedScreen
    ? Math.max(8, Math.min(canvasSize.width - 172, selectedScreen.x - 78))
    : 0;
  const taskbarTop = selectedScreen
    ? Math.max(8, Math.min(canvasSize.height - 42, selectedScreen.y - 72))
    : 0;

  return (
    <div className="canvasWrap">
      <canvas
        ref={canvasRef}
        style={{ cursor: getCursor(), display: 'block', flex: 1 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />

      {selectedComponent && selectedScreen && (
        <div
          className="selectionTaskbar"
          style={{ left: taskbarLeft, top: taskbarTop }}
          onMouseDown={event => event.preventDefault()}
        >
          <button onClick={rotateSelectedComponent} title="Rotate">R</button>
          <button onClick={() => flipSelectedComponent('x')} title="Flip X">FX</button>
          <button onClick={() => flipSelectedComponent('y')} title="Flip Y">FY</button>
          <button className="danger" onClick={deleteSelectedComponent} title="Delete">Del</button>
        </div>
      )}
    </div>
  );
}
