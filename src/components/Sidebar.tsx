interface Props {
  selectedTool: string | null;
  setSelectedTool: (tool: string | null) => void;
}

const componentGroups = [
  {
    title: 'Passive',
    items: [
      { type: 'R', name: 'Resistor', hint: '1k' },
      { type: 'C', name: 'Capacitor', hint: '1u' },
      { type: 'L', name: 'Inductor', hint: '1m' },
    ],
  },
  {
    title: 'Sources',
    items: [
      { type: 'V', name: 'Voltage', hint: 'DC 10V' },
      { type: 'I', name: 'Current', hint: 'DC 1mA' },
    ],
  },
  {
    title: 'Semiconductor',
    items: [
      { type: 'D', name: 'Diode', hint: 'Ddefault' },
      { type: 'GND', name: 'Ground', hint: 'Node 0' },
    ],
  },
];

export default function Sidebar({ selectedTool, setSelectedTool }: Props) {
  function toggle(tool: string) {
    setSelectedTool(selectedTool === tool ? null : tool);
  }

  return (
    <div className="sidebar">
      <h2>Components</h2>

      {componentGroups.map(group => (
        <section className="componentGroup" key={group.title}>
          <h3>{group.title}</h3>
          <div className="componentGrid">
            {group.items.map(item => (
              <button
                key={item.type}
                className={selectedTool === item.type ? 'componentTile activeTool' : 'componentTile'}
                onClick={() => toggle(item.type)}
                title={`${item.name} (${item.type})`}
              >
                <span className="componentSymbol">{item.type}</span>
                <span className="componentName">{item.name}</span>
                <span className="componentHint">{item.hint}</span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <hr style={{ borderColor: '#444', margin: '12px 0' }} />
      <h2>Wiring</h2>
      <button className={selectedTool === 'wire' ? 'wireButton activeTool' : 'wireButton'} onClick={() => toggle('wire')}>
        <span>Wire</span>
        <kbd>W</kbd>
      </button>

      <hr style={{ borderColor: '#444', margin: '12px 0' }} />
      <div style={{ fontSize: '11px', color: '#aaa', lineHeight: '1.8' }}>
        <b style={{ color: '#ccc' }}>Click:</b> chon / dat linh kien<br />
        <b style={{ color: '#ccc' }}>Shift+click:</b> dat nhieu<br />
        <b style={{ color: '#ccc' }}>R:</b> xoay linh kien<br />
        <b style={{ color: '#ccc' }}>Esc:</b> huy thao tac<br />
        <hr style={{ borderColor: '#555', margin: '6px 0' }} />
        <b style={{ color: '#ccc' }}>Wire:</b> di day<br />
        <hr style={{ borderColor: '#555', margin: '6px 0' }} />
        <b style={{ color: '#ccc' }}>Delete:</b> xoa<br />
        <b style={{ color: '#ccc' }}>Click+Hold:</b> di chuyen<br />
        <hr style={{ borderColor: '#555', margin: '6px 0' }} />
        <b style={{ color: '#22cc88' }}>Scroll:</b> zoom tai con tro<br />
        <b style={{ color: '#22cc88' }}>Keo nen:</b> di chuyen vung nhin<br />
        <b style={{ color: '#22cc88' }}>Ctrl+ +/-:</b> zoom giua man hinh<br />
        <b style={{ color: '#22cc88' }}>Ctrl+0:</b> reset view
      </div>
    </div>
  );
}
