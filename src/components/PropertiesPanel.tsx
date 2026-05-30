import type { CircuitComponent } from '../types';

const GRID = 20;

function updatePins(x: number, y: number, rotation: number, type?: string) {
  if (type === 'GND') return [{ x, y }];
  const d = GRID * 2;
  switch (rotation) {
    case 90:  return [{ x, y: y - d }, { x, y: y + d }];
    case 180: return [{ x: x + d, y }, { x: x - d, y }];
    case 270: return [{ x, y: y + d }, { x, y: y - d }];
    default:  return [{ x: x - d, y }, { x: x + d, y }];
  }
}

interface Props {
  selected: CircuitComponent | null;
  onUpdate: (updated: CircuitComponent) => void;
  onDelete: () => void;
}

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
    const newRot = (((selected!.rotation || 0) + 90) % 360) as 0|90|180|270;
    onUpdate({
      ...selected!,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  function flipX() {
    // FlipX on horizontal component = 180° rotation equivalent for pins
    const newRot = (((selected!.rotation || 0) + 180) % 360) as 0|90|180|270;
    onUpdate({
      ...selected!,
      flipX: !selected!.flipX,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  function flipY() {
    // FlipY on vertical component
    const newRot = (((selected!.rotation || 0) + 180) % 360) as 0|90|180|270;
    onUpdate({
      ...selected!,
      flipY: !selected!.flipY,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  return (
    <div className="properties">
      <h3>Properties</h3>

      <label>Name</label>
      <input
        value={selected.id}
        onChange={(e) => onUpdate({ ...selected, id: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
      />

      {selected.type !== 'GND' && selected.type !== 'D' && (
        <>
          <label>Value</label>
          <input
            value={selected.value}
            onChange={(e) => onUpdate({ ...selected, value: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </>
      )}

      {selected.type === 'D' && (
        <p>Diode uses the default SPICE model <b>Ddefault</b>.</p>
      )}

      <div className="button-group" style={{ marginTop: 12 }}>
        <button onClick={rotate}>↻ Rotate</button>
        <button onClick={flipX}>↔ Flip X</button>
        <button onClick={flipY}>↕ Flip Y</button>
      </div>

      <button className="deleteBtn" onClick={onDelete}>
        Delete Component
      </button>
    </div>
  );
}
