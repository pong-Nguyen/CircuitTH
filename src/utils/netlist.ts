import type { CircuitComponent, Pin, Wire } from '../types';
import { UnionFind } from './unionFind';

function ptKey(x: number, y: number) { return `${x},${y}`; }

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const len2 = C * C + D * D;
  if (len2 === 0) return Math.sqrt(A * A + B * B);
  const t = Math.max(0, Math.min(1, (A * C + B * D) / len2));
  return Math.sqrt((px - (x1 + t * C)) ** 2 + (py - (y1 + t * D)) ** 2);
}

function sourceExpression(c: CircuitComponent) {
  const src = c.source;
  if (!src) return `DC ${c.value}`;

  if (src.mode === 'DC') return `DC ${src.dc}`;
  if (src.mode === 'AC') return `DC ${src.dc} AC ${src.acMag} ${src.acPhase}`;
  if (src.mode === 'PULSE') {
    return `PULSE(${src.pulseInitial} ${src.pulsePulsed} ${src.pulseDelay} ${src.pulseRise} ${src.pulseFall} ${src.pulseWidth} ${src.pulsePeriod})`;
  }
  return `SIN(${src.sinOffset} ${src.sinAmplitude} ${src.sinFrequency} ${src.sinDelay} ${src.sinDamping} ${src.sinPhase})`;
}

export function generateNetlist(components: CircuitComponent[], wires: Wire[]) {
  const uf = new UnionFind();

  // 1. Connect every consecutive pair of points within each wire
  for (const wire of wires) {
    for (let i = 0; i < wire.points.length - 1; i++) {
      const a = wire.points[i], b = wire.points[i + 1];
      uf.union(ptKey(a.x, a.y), ptKey(b.x, b.y));
    }
  }

  // 2. Wire-to-wire T-junction: any point of wireA that lies on a segment of wireB
  for (const wireA of wires) {
    for (const pt of wireA.points) {
      for (const wireB of wires) {
        if (wireA.id === wireB.id) continue;
        for (let i = 0; i < wireB.points.length - 1; i++) {
          const a = wireB.points[i], b = wireB.points[i + 1];
          if (distToSegment(pt.x, pt.y, a.x, a.y, b.x, b.y) < 1.5) {
            uf.union(ptKey(pt.x, pt.y), ptKey(a.x, a.y));
          }
        }
      }
    }
  }

  // 3. Pin-to-wire: pin lying on a wire segment
  for (const c of components) {
    for (const pin of c.pins) {
      for (const wire of wires) {
        for (let i = 0; i < wire.points.length - 1; i++) {
          const a = wire.points[i], b = wire.points[i + 1];
          if (distToSegment(pin.x, pin.y, a.x, a.y, b.x, b.y) < 1.5) {
            uf.union(ptKey(pin.x, pin.y), ptKey(a.x, a.y));
          }
        }
      }
    }
  }

  // 4. Pre-assign node "0" (GND) to any pin belonging to a GND component
  //    so all nets connected to GND become "0" automatically.
  const nodeMap = new Map<string, string>();
  let counter = 1;

  for (const c of components) {
    if (c.type === 'GND') {
      const root = uf.find(ptKey(c.pins[0].x, c.pins[0].y));
      nodeMap.set(root, '0');
    }
  }

  function getNode(pin: Pin) {
    const root = uf.find(ptKey(pin.x, pin.y));
    if (!nodeMap.has(root)) nodeMap.set(root, `n${counter++}`);
    return nodeMap.get(root)!;
  }

  // 5. Build lines (GND is not a SPICE element — it only sets node names)
  const lines: string[] = [];
  for (const c of components) {
    if (c.type === 'GND') continue;
    const n1 = getNode(c.pins[0]);
    const n2 = getNode(c.pins[1]);
    if (c.type === 'R') lines.push(`${c.id} ${n1} ${n2} ${c.value}`);
    if (c.type === 'C') lines.push(`${c.id} ${n1} ${n2} ${c.value}`);
    if (c.type === 'L') lines.push(`${c.id} ${n1} ${n2} ${c.value}`);
    if (c.type === 'V') lines.push(`${c.id} ${n1} ${n2} ${sourceExpression(c)}`);
    if (c.type === 'I') lines.push(`${c.id} ${n1} ${n2} ${sourceExpression(c)}`);
    if (c.type === 'E' && c.pins[2] && c.pins[3]) {
      lines.push(`${c.id} ${n1} ${n2} ${getNode(c.pins[2])} ${getNode(c.pins[3])} ${c.value}`);
    }
    if (c.type === 'G' && c.pins[2] && c.pins[3]) {
      lines.push(`${c.id} ${n1} ${n2} ${getNode(c.pins[2])} ${getNode(c.pins[3])} ${c.value}`);
    }
    if (c.type === 'F') {
      const dep = c.dependent ?? { vctrl: 'V1', gain: c.value || '1' };
      lines.push(`${c.id} ${n1} ${n2} ${dep.vctrl} ${dep.gain}`);
    }
    if (c.type === 'H') {
      const dep = c.dependent ?? { vctrl: 'V1', gain: c.value || '1' };
      lines.push(`${c.id} ${n1} ${n2} ${dep.vctrl} ${dep.gain}`);
    }
    if (c.type === 'D') lines.push(`${c.id} ${n1} ${n2} Ddefault`);
  }

  if (components.some(c => c.type === 'D')) {
    lines.push('.model Ddefault D');
  }

  lines.push('', '.op', '.end');
  return lines.join('\n');
}
