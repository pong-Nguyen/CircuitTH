import type { CircuitComponent, LedColor, SourceConfig, SourceMode } from '../types';

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

function defaultSource(type: string, value = ''): SourceConfig {
  const dc = value || (type === 'I' ? '1m' : '5');
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

function sourceSummary(source: SourceConfig) {
  if (source.mode === 'DC') return source.dc;
  if (source.mode === 'AC') return `AC ${source.acMag}`;
  if (source.mode === 'PULSE') return 'PULSE';
  return 'SIN';
}

interface Props {
  selected: CircuitComponent | null;
  onUpdate: (updated: CircuitComponent) => void;
  onDelete: () => void;
  language?: 'vi' | 'en';
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
  V: {
    title: 'Voltage Source',
    helper: 'Ho tro DC, AC, PULSE va SIN.',
  },
  I: {
    title: 'Current Source',
    helper: 'Ho tro DC, AC, PULSE va SIN.',
  },
  E: {
    title: 'VCVS',
    valueLabel: 'Gain',
    placeholder: '1',
    helper: 'Nguon ap phu thuoc ap: E out+ out- ctrl+ ctrl- gain.',
  },
  G: {
    title: 'VCCS',
    valueLabel: 'Gain',
    placeholder: '1m',
    helper: 'Nguon dong phu thuoc ap: G out+ out- ctrl+ ctrl- gain.',
  },
  F: {
    title: 'CCCS',
    helper: 'Nguon dong phu thuoc dong: F out+ out- Vctrl gain.',
  },
  H: {
    title: 'CCVS',
    helper: 'Nguon ap phu thuoc dong: H out+ out- Vctrl gain.',
  },
  D: {
    title: 'Diode',
    helper: 'Diode uses the default SPICE model Ddefault.',
  },
  LED: {
    title: 'LED',
    helper: 'LED uses a diode model based on its selected color.',
  },
  K: {
    title: 'Switch',
    helper: 'Closed switch is simulated as a very small resistor; open switch is simulated as a very large resistor.',
  },
  GND: {
    title: 'Ground',
    helper: 'Ground sets this net to node 0.',
  },
};

export default function PropertiesPanel({ selected, onUpdate, onDelete, language = 'en' }: Props) {
  const ui = language === 'vi'
    ? { properties: 'Thuoc tinh', none: 'Chua chon linh kien', name: 'Ten', delete: 'Xoa linh kien' }
    : { properties: 'Properties', none: 'No component selected', name: 'Name', delete: 'Delete Component' };

  if (!selected) {
    return (
      <div className="properties">
        <h3>{ui.properties}</h3>
        <p>{ui.none}</p>
      </div>
    );
  }

  const meta = componentMeta[selected.type] ?? { title: selected.type };
  const isIndependentSource = selected.type === 'V' || selected.type === 'I';
  const isCurrentControlled = selected.type === 'F' || selected.type === 'H';
  const isSwitch = selected.type === 'K';
  const isLed = selected.type === 'LED';
  const source = selected.source ?? defaultSource(selected.type, selected.value);
  const dependent = selected.dependent ?? { vctrl: 'V1', gain: selected.value || '1' };
  const switchConfig = selected.switch ?? { closed: false };
  const ledConfig = selected.led ?? { color: 'red' as LedColor };
  const canEditValue = Boolean(meta.valueLabel);

  function update(updated: Partial<CircuitComponent>) {
    onUpdate({ ...selected!, ...updated });
  }

  function updateSource(next: SourceConfig) {
    onUpdate({ ...selected!, source: next, value: sourceSummary(next) });
  }

  function setSource<K extends keyof SourceConfig>(key: K, value: SourceConfig[K]) {
    updateSource({ ...source, [key]: value });
  }

  function updateDependent(next: { vctrl: string; gain: string }) {
    onUpdate({ ...selected!, dependent: next, value: `${next.vctrl} ${next.gain}` });
  }

  function updateSwitch(closed: boolean) {
    onUpdate({ ...selected!, switch: { closed }, value: closed ? 'closed' : 'open' });
  }

  function updateLedColor(color: LedColor) {
    onUpdate({ ...selected!, led: { color }, value: color });
  }

  function rotate() {
    const newRot = (((selected!.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
    update({
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  function flipX() {
    const newRot = (((selected!.rotation || 0) + 180) % 360) as 0 | 90 | 180 | 270;
    update({
      flipX: !selected!.flipX,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  function flipY() {
    const newRot = (((selected!.rotation || 0) + 180) % 360) as 0 | 90 | 180 | 270;
    update({
      flipY: !selected!.flipY,
      rotation: newRot,
      pins: updatePins(selected!.x, selected!.y, newRot, selected!.type),
    });
  }

  return (
    <div className="properties">
      <h3>{ui.properties} - {meta.title}</h3>

      <label>{ui.name}</label>
      <input
        value={selected.id}
        onChange={(e) => update({ id: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
      />

      {canEditValue && (
        <>
          <label>{meta.valueLabel}</label>
          <input
            value={selected.value}
            placeholder={meta.placeholder}
            onChange={(e) => update({ value: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </>
      )}

      {isIndependentSource && (
        <>
          <label>Waveform</label>
          <div className="modeTabs">
            {(['DC', 'AC', 'PULSE', 'SIN'] as SourceMode[]).map(mode => (
              <button
                key={mode}
                className={source.mode === mode ? 'active' : ''}
                onClick={() => setSource('mode', mode)}
              >
                {mode}
              </button>
            ))}
          </div>

          {source.mode === 'DC' && (
            <>
              <label>{selected.type === 'V' ? 'Voltage (V)' : 'Current (A)'}</label>
              <input value={source.dc} onChange={e => setSource('dc', e.target.value)} onKeyDown={e => e.stopPropagation()} />
            </>
          )}

          {source.mode === 'AC' && (
            <div className="propertyGrid">
              <div>
                <label>DC Offset</label>
                <input value={source.dc} onChange={e => setSource('dc', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>AC Magnitude</label>
                <input value={source.acMag} onChange={e => setSource('acMag', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>AC Phase</label>
                <input value={source.acPhase} onChange={e => setSource('acPhase', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
            </div>
          )}

          {source.mode === 'PULSE' && (
            <div className="propertyGrid">
              <div>
                <label>Initial</label>
                <input value={source.pulseInitial} onChange={e => setSource('pulseInitial', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Pulsed</label>
                <input value={source.pulsePulsed} onChange={e => setSource('pulsePulsed', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Delay</label>
                <input value={source.pulseDelay} onChange={e => setSource('pulseDelay', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Rise</label>
                <input value={source.pulseRise} onChange={e => setSource('pulseRise', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Fall</label>
                <input value={source.pulseFall} onChange={e => setSource('pulseFall', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Width</label>
                <input value={source.pulseWidth} onChange={e => setSource('pulseWidth', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Period</label>
                <input value={source.pulsePeriod} onChange={e => setSource('pulsePeriod', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
            </div>
          )}

          {source.mode === 'SIN' && (
            <div className="propertyGrid">
              <div>
                <label>Offset</label>
                <input value={source.sinOffset} onChange={e => setSource('sinOffset', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Amplitude</label>
                <input value={source.sinAmplitude} onChange={e => setSource('sinAmplitude', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Frequency</label>
                <input value={source.sinFrequency} onChange={e => setSource('sinFrequency', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Delay</label>
                <input value={source.sinDelay} onChange={e => setSource('sinDelay', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Damping</label>
                <input value={source.sinDamping} onChange={e => setSource('sinDamping', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
              <div>
                <label>Phase</label>
                <input value={source.sinPhase} onChange={e => setSource('sinPhase', e.target.value)} onKeyDown={e => e.stopPropagation()} />
              </div>
            </div>
          )}
        </>
      )}

      {isCurrentControlled && (
        <div className="propertyGrid">
          <div>
            <label>Vctrl</label>
            <input
              value={dependent.vctrl}
              placeholder="V1"
              onChange={e => updateDependent({ ...dependent, vctrl: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
            />
          </div>
          <div>
            <label>Gain</label>
            <input
              value={dependent.gain}
              placeholder="1"
              onChange={e => updateDependent({ ...dependent, gain: e.target.value })}
              onKeyDown={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {isSwitch && (
        <>
          <label>State</label>
          <div className="modeTabs switchTabs">
            <button
              className={!switchConfig.closed ? 'active' : ''}
              onClick={() => updateSwitch(false)}
            >
              Open
            </button>
            <button
              className={switchConfig.closed ? 'active' : ''}
              onClick={() => updateSwitch(true)}
            >
              Closed
            </button>
          </div>
        </>
      )}

      {isLed && (
        <>
          <label>LED Color</label>
          <div className="colorPicker">
            {(['red', 'green', 'blue', 'yellow', 'white'] as LedColor[]).map(color => (
              <button
                key={color}
                className={ledConfig.color === color ? 'active' : ''}
                onClick={() => updateLedColor(color)}
                title={color}
              >
                <span className={`ledSwatch ${color}`} />
                {color}
              </button>
            ))}
          </div>
        </>
      )}

      {meta.helper && <p className="fieldHint">{meta.helper}</p>}

      <div className="button-group" style={{ marginTop: 12 }}>
        <button onClick={rotate}>Rotate</button>
        <button onClick={flipX}>Flip X</button>
        <button onClick={flipY}>Flip Y</button>
      </div>

      <button className="deleteBtn" onClick={onDelete}>
        {ui.delete}
      </button>
    </div>
  );
}
