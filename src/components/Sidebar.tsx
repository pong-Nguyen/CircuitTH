interface Props {
  selectedTool: string | null;
  setSelectedTool: (tool: string | null) => void;
}

type ToolId = 'R' | 'C' | 'L' | 'V' | 'I' | 'D' | 'GND' | 'wire';

const tools: Array<{ type: ToolId; name: string; shortcut?: string }> = [
  { type: 'R', name: 'Resistor' },
  { type: 'C', name: 'Capacitor' },
  { type: 'L', name: 'Inductor' },
  { type: 'V', name: 'Voltage Source' },
  { type: 'I', name: 'Current Source' },
  { type: 'D', name: 'Diode' },
  { type: 'GND', name: 'Ground' },
  { type: 'wire', name: 'Wire', shortcut: 'W' },
];

function ToolIcon({ type }: { type: ToolId }) {
  if (type === 'R') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M2 16h8l3-7 6 14 6-14 6 14 6-14 3 7h6" />
      </svg>
    );
  }

  if (type === 'C') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M2 16h16M30 16h16M18 6v20M30 6v20" />
      </svg>
    );
  }

  if (type === 'L') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M2 16h8M38 16h8" />
        <path d="M10 16a7 7 0 0 1 14 0M24 16a7 7 0 0 1 14 0" />
      </svg>
    );
  }

  if (type === 'V') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M2 16h10M36 16h10" />
        <circle cx="24" cy="16" r="11" />
        <path d="M18 16h6M21 13v6M28 16h5" />
      </svg>
    );
  }

  if (type === 'I') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M2 16h10M36 16h10" />
        <circle cx="24" cy="16" r="11" />
        <path d="M18 16h12M26 11l5 5-5 5" />
      </svg>
    );
  }

  if (type === 'D') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M2 16h12M34 16h12M14 7v18l18-9-18-9ZM34 7v18" />
      </svg>
    );
  }

  if (type === 'GND') {
    return (
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path d="M24 4v9M12 13h24M16 19h16M20 25h8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 32" aria-hidden="true">
      <path d="M4 8h14v16h26" />
      <circle cx="4" cy="8" r="3" />
      <circle cx="18" cy="24" r="3" />
      <circle cx="44" cy="24" r="3" />
    </svg>
  );
}

export default function Sidebar({ selectedTool, setSelectedTool }: Props) {
  function toggle(tool: ToolId) {
    setSelectedTool(selectedTool === tool ? null : tool);
  }

  return (
    <div className="componentBar" aria-label="Component tools">
      {tools.map(tool => (
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
    </div>
  );
}
