import type { CircuitComponent } from '../types';

const GRID = 20;

function updatePins(x: number, y: number, rotation: number, type?: string) {
  if (type === 'GND') return [{ x, y }];
  const d = GRID * 2;
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
    case 90: return [{ x, y: y - d }, { x, y: y + d }];
    case 180: return [{ x: x + d, y }, { x: x - d, y }];
    case 270: return [{ x, y: y + d }, { x, y: y - d }];
    default: return [{ x: x - d, y }, { x: x + d, y }];
  }
}

interface Props {
  selected: CircuitComponent | null;
  onUpdate: (updated: CircuitComponent) => void;
  onDelete: () => void;
}

const componentMeta: Record<string, {
  title: string;
  valueLabel?: string;
  placeholder?: string;
  helper?: string;
}> = {
  R: {
    title: 'Resistor',
    valueLabel: 'Resistance',
    placeholder: '1k',
    helper: 'Nhap gia tri dien tro, vi du: 220, 1k, 10Meg.',
  },
  V: {
    title: 'Voltage Source',
    valueLabel: 'DC Voltage',
    placeholder: '5',
    helper: 'Nhap dien ap DC tinh bang Volt, vi du: 3.3, 5, 12.',
  },
  I: {
    title: 'Current Source',
    valueLabel: 'DC Current',
    placeholder: '1m',
    helper: 'Nhap dong dien DC tinh bang Ampere, vi du: 1m, 0.02.',
  },
  C: {
    title: 'Capacitor',
    valueLabel: 'Capacitance',
    placeholder: '1u',
    helper: 'Nhap dien dung, vi du: 100n, 1u, 10u.',
  },
  L: {
    title: 'Inductor',
    valueLabel: 'Inductance',
    placeholder: '1m',
    helper: 'Nhap dien cam, vi du: 10u, 1m, 10m.',
  },
  E: {
    title: 'VCVS',
    valueLabel: 'Voltage Gain',
    placeholder: '1',
    helper: 'Nguon ap phu thuoc ap: E out+ out- ctrl+ ctrl- gain.',
  },
  G: {
    title: 'VCCS',
    valueLabel: 'Transconductance',
    placeholder: '1m',
    helper: 'Nguon dong phu thuoc ap: G out+ out- ctrl+ ctrl- gain.',
  },
  F: {
    title: 'CCCS',
    valueLabel: 'Control Source + Gain',
    placeholder: 'V1 1',
    helper: 'Nguon dong phu thuoc dong: nhap ten nguon ap dieu khien va he so, vi du V1 2.',
  },
  H: {
    title: 'CCVS',
    valueLabel: 'Control Source + Gain',
    placeholder: 'V1 1',
    helper: 'Nguon ap phu thuoc dong: nhap ten nguon ap dieu khien va he so, vi du V1 100.',
  },
  D: {
    title: 'Diode',
    helper: 'Diode uses the default SPICE model Ddefault.',
  },
  GND: {
    title: 'Ground',
    helper: 'Ground sets this net to node 0.',
  },
};

export default function PropertiesPanel({ selected, onUpdate, onDelete }: Props) {
  if (!selected) {
    return (
      <div className="properties">
        <h3>Properties</h3>
        <p>No component selected</p>
      </div>
    );
  }

  function rotate() {
    const newRot = (((selected!.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
    onUpdate({
      ...selected!,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  function flipX() {
    const newRot = (((selected!.rotation || 0) + 180) % 360) as 0 | 90 | 180 | 270;
    onUpdate({
      ...selected!,
      flipX: !selected!.flipX,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  function flipY() {
    const newRot = (((selected!.rotation || 0) + 180) % 360) as 0 | 90 | 180 | 270;
    onUpdate({
      ...selected!,
      flipY: !selected!.flipY,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  const meta = componentMeta[selected.type] ?? { title: selected.type };
  const canEditValue = Boolean(meta.valueLabel);

  return (
    <div className="properties">
      <h3>Properties - {meta.title}</h3>

      <label>Name</label>
      <input
        value={selected.id}
        onChange={(e) => onUpdate({ ...selected, id: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
      />

      {canEditValue && (
        <>
          <label>{meta.valueLabel}</label>
          <input
            value={selected.value}
            placeholder={meta.placeholder}
            onChange={(e) => onUpdate({ ...selected, value: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
          />
          {meta.helper && <p className="fieldHint">{meta.helper}</p>}
        </>
      )}

      {!canEditValue && meta.helper && (
        <p className="fieldHint">{meta.helper}</p>
      )}

      <div className="button-group" style={{ marginTop: 12 }}>
        <button onClick={rotate}>Rotate</button>
        <button onClick={flipX}>Flip X</button>
        <button onClick={flipY}>Flip Y</button>
      </div>

      <button className="deleteBtn" onClick={onDelete}>
        Delete Component
      </button>
    </div>
  );
}
