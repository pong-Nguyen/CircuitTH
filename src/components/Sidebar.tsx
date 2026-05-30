import { useState } from 'react';

interface Props {
  selectedTool: string | null;
  setSelectedTool: (tool: string | null) => void;
}

type ToolId = 'R' | 'C' | 'L' | 'V' | 'I' | 'E' | 'F' | 'G' | 'H' | 'D' | 'GND' | 'wire';

const quickTools: Array<{ type: ToolId; name: string; shortcut?: string }> = [
  { type: 'R', name: 'Resistor' },
  { type: 'C', name: 'Capacitor' },
  { type: 'L', name: 'Inductor' },
  { type: 'V', name: 'Voltage Source' },
  { type: 'I', name: 'Current Source' },
  { type: 'GND', name: 'Ground' },
  { type: 'wire', name: 'Wire', shortcut: 'W' },
];

const libraryGroups: Array<{ title: string; items: Array<{ type: ToolId; name: string; description: string }> }> = [
  {
    title: 'Passive',
    items: [
      { type: 'R', name: 'Resistor', description: 'Dien tro' },
      { type: 'C', name: 'Capacitor', description: 'Tu dien' },
      { type: 'L', name: 'Inductor', description: 'Cuon cam' },
    ],
  },
  {
    title: 'Independent Sources',
    items: [
      { type: 'V', name: 'Voltage Source', description: 'Nguon ap DC' },
      { type: 'I', name: 'Current Source', description: 'Nguon dong DC' },
    ],
  },
  {
    title: 'Dependent Sources',
    items: [
      { type: 'E', name: 'VCVS', description: 'Voltage-controlled voltage source' },
      { type: 'G', name: 'VCCS', description: 'Voltage-controlled current source' },
    ],
  },
  {
    title: 'Current-Controlled Sources',
    items: [
      { type: 'F', name: 'CCCS', description: 'Current-controlled current source' },
      { type: 'H', name: 'CCVS', description: 'Current-controlled voltage source' },
    ],
  },
  {
    title: 'Semiconductor',
    items: [
      { type: 'D', name: 'Diode', description: 'Diode mac dinh' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { type: 'GND', name: 'Ground', description: 'Node 0' },
    ],
  },
];

function ToolIcon({ type }: { type: ToolId | 'IC' }) {
  if (type === 'IC') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <rect x="12" y="7" width="24" height="18" rx="2" />
        <path d="M8 10h4M8 16h4M8 22h4M36 10h4M36 16h4M36 22h4M18 4v3M24 4v3M30 4v3M18 25v3M24 25v3M30 25v3" />
      </svg>
    );
  }

  if (type === 'R') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2 16h8l3-7 6 14 6-14 6 14 6-14 3 7h6" /></svg>;
  if (type === 'C') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2 16h16M30 16h16M18 6v20M30 6v20" /></svg>;
  if (type === 'L') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2 16h8M38 16h8" /><path d="M10 16a7 7 0 0 1 14 0M24 16a7 7 0 0 1 14 0" /></svg>;
  if (type === 'V') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2 16h10M36 16h10" /><circle cx="24" cy="16" r="11" /><path d="M18 16h6M21 13v6M28 16h5" /></svg>;
  if (type === 'I') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2 16h10M36 16h10" /><circle cx="24" cy="16" r="11" /><path d="M18 16h12M26 11l5 5-5 5" /></svg>;
  if (type === 'D') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M2 16h12M34 16h12M14 7v18l18-9-18-9ZM34 7v18" /></svg>;
  if (type === 'GND') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M24 4v9M12 13h24M16 19h16M20 25h8" /></svg>;
  if (type === 'wire') return <svg viewBox="0 0 48 32" aria-hidden="true"><path d="M4 8h14v16h26" /><circle cx="4" cy="8" r="3" /><circle cx="18" cy="24" r="3" /><circle cx="44" cy="24" r="3" /></svg>;

  return (
    <svg viewBox="0 0 48 32" aria-hidden="true">
      <path d="M2 16h10M36 16h10M24 4v6M24 22v6" />
      <path d="M24 5 37 16 24 27 11 16 24 5Z" />
      <text x="24" y="20" textAnchor="middle">{type}</text>
    </svg>
  );
}

export default function Sidebar({ selectedTool, setSelectedTool }: Props) {
  const [libraryOpen, setLibraryOpen] = useState(false);

  function toggle(tool: ToolId) {
    setSelectedTool(selectedTool === tool ? null : tool);
  }

  function choose(tool: ToolId) {
    setSelectedTool(tool);
    setLibraryOpen(false);
  }

  return (
    <>
      <div className="componentBar" aria-label="Component tools">
        {quickTools.map(tool => (
          <button
            key={tool.type}
            className={selectedTool === tool.type ? 'schematicTool activeTool' : 'schematicTool'}
            onMouseDown={event => event.preventDefault()}
            onClick={() => toggle(tool.type)}
            title={tool.shortcut ? `${tool.name} (${tool.shortcut})` : tool.name}
          >
            <ToolIcon type={tool.type} />
          </button>
        ))}

        <button
          className="schematicTool libraryTool"
          onMouseDown={event => event.preventDefault()}
          onClick={() => setLibraryOpen(true)}
          title="Component library"
        >
          <ToolIcon type="IC" />
        </button>
      </div>

      {libraryOpen && (
        <div className="libraryOverlay" onMouseDown={event => event.preventDefault()} onClick={() => setLibraryOpen(false)}>
          <div className="libraryDialog" onClick={event => event.stopPropagation()}>
            <div className="libraryHeader">
              <div>
                <h3>Component Library</h3>
                <p>Chon linh kien can dat vao schematic.</p>
              </div>
              <button onClick={() => setLibraryOpen(false)} title="Close">x</button>
            </div>

            {libraryGroups.map(group => (
              <section className="libraryGroup" key={group.title}>
                <h4>{group.title}</h4>
                <div className="libraryGrid">
                  {group.items.map(item => (
                    <button key={item.type} onClick={() => choose(item.type)}>
                      <span className="libraryIcon"><ToolIcon type={item.type} /></span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.description}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
