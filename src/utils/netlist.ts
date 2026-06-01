import type { CircuitComponent, Pin, Wire } from '../types';
import { UnionFind } from './unionFind';

function ptKey(x: number, y: number) {
  return `${x},${y}`;
}

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

function ledModelName(color = 'red') {
  return `Dled_${color}`;
}

function ledModelLine(color = 'red') {
  if (color === 'green') return '.model Dled_green D(Is=2e-20 N=2.1)';
  if (color === 'blue') return '.model Dled_blue D(Is=1e-22 N=2.4)';
  if (color === 'yellow') return '.model Dled_yellow D(Is=5e-21 N=2.0)';
  if (color === 'white') return '.model Dled_white D(Is=1e-22 N=2.5)';
  return '.model Dled_red D(Is=1e-20 N=2)';
}

export function generateNetlist(components: CircuitComponent[], wires: Wire[]) {
  const uf = new UnionFind();

  for (const wire of wires) {
    for (let i = 0; i < wire.points.length - 1; i++) {
      const a = wire.points[i], b = wire.points[i + 1];
      uf.union(ptKey(a.x, a.y), ptKey(b.x, b.y));
    }
  }

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

  const modelLines: string[] = [];
  if (components.some(c => c.type === 'D')) {
    modelLines.push('.model Ddefault D');
  }

  const ledColors = new Set(
    components
      .filter(c => c.type === 'LED')
      .map(c => c.led?.color ?? 'red'),
  );
  for (const color of ledColors) {
    modelLines.push(ledModelLine(color));
  }

  const elementLines: string[] = [];
  for (const c of components) {
    if (c.type === 'GND') continue;
    const n1 = getNode(c.pins[0]);
    const n2 = getNode(c.pins[1]);

    if (c.type === 'R') elementLines.push(`${c.id} ${n1} ${n2} ${c.value}`);
    if (c.type === 'C') elementLines.push(`${c.id} ${n1} ${n2} ${c.value}`);
    if (c.type === 'L') elementLines.push(`${c.id} ${n1} ${n2} ${c.value}`);
    if (c.type === 'V') elementLines.push(`${c.id} ${n1} ${n2} ${sourceExpression(c)}`);
    if (c.type === 'I') elementLines.push(`${c.id} ${n1} ${n2} ${sourceExpression(c)}`);
    if (c.type === 'E' && c.pins[2] && c.pins[3]) {
      elementLines.push(`${c.id} ${n1} ${n2} ${getNode(c.pins[2])} ${getNode(c.pins[3])} ${c.value}`);
    }
    if (c.type === 'G' && c.pins[2] && c.pins[3]) {
      elementLines.push(`${c.id} ${n1} ${n2} ${getNode(c.pins[2])} ${getNode(c.pins[3])} ${c.value}`);
    }
    if (c.type === 'F') {
      const dep = c.dependent ?? { vctrl: 'V1', gain: c.value || '1' };
      elementLines.push(`${c.id} ${n1} ${n2} ${dep.vctrl} ${dep.gain}`);
    }
    if (c.type === 'H') {
      const dep = c.dependent ?? { vctrl: 'V1', gain: c.value || '1' };
      elementLines.push(`${c.id} ${n1} ${n2} ${dep.vctrl} ${dep.gain}`);
    }
    if (c.type === 'D') elementLines.push(`${c.id} ${n1} ${n2} Ddefault`);
    if (c.type === 'LED') {
      const color = c.led?.color ?? 'red';
      const diodeId = c.id.startsWith('D') ? c.id : `D${c.id}`;
      elementLines.push(`${diodeId} ${n1} ${n2} ${ledModelName(color)}`);
    }
    if (c.type === 'K') {
      const switchId = c.id.startsWith('R') ? c.id : `R${c.id}`;
      elementLines.push(`${switchId} ${n1} ${n2} ${c.switch?.closed ? '1m' : '1e12'}`);
    }
  }

  const lines = [...modelLines, ...elementLines, '', '.op', '.end'];
  return lines.join('\n');
}
