interface Props {
  netlist: string;
  onGenerate: () => void;
}

export default function NetlistPanel({
  netlist,
  onGenerate,
}: Props) {
  return (
    <div className="panel">
      <h3>Generated Netlist</h3>

      <button onClick={onGenerate}>
        Generate Netlist
      </button>

      <textarea value={netlist} readOnly placeholder="Click 'Generate Netlist' to see results..." />
    </div>
  );
}