import { useEffect, useMemo, useRef, useState } from 'react';
import type { SimulationResult } from '../lib/circuitEngine';

type Language = 'vi' | 'en';

interface Props {
  result: SimulationResult | null;
  open: boolean;
  width: number;
  language: Language;
  onClose: () => void;
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const text = {
  vi: {
    title: 'Waveform',
    empty: 'Chạy mô phỏng để có dữ liệu vẽ đồ thị.',
    nodes: 'Node',
    close: 'Đóng',
    opY: 'Điện áp (V)',
    tranX: 'Thời gian (ms)',
    dcX: 'Đầu vào / Sweep',
    dcSweep: 'Sweep',
    dcXY: 'Y-X',
    xSignal: 'Trục X',
    ySignals: 'Trục Y',
    acX: 'Tần số (Hz)',
    mag: 'Biên độ (dB)',
    phase: 'Pha (độ)',
  },
  en: {
    title: 'Waveform',
    empty: 'Run a simulation to plot results.',
    nodes: 'Nodes',
    close: 'Close',
    opY: 'Voltage (V)',
    tranX: 'Time (ms)',
    dcX: 'Input / Sweep',
    dcSweep: 'Sweep',
    dcXY: 'Y-X',
    xSignal: 'X Axis',
    ySignals: 'Y Axis',
    acX: 'Frequency (Hz)',
    mag: 'Magnitude (dB)',
    phase: 'Phase (deg)',
  },
};

function voltageNodes(result: SimulationResult | null) {
  if (!result?.success || result.data.length === 0) return [];
  const names = new Set<string>();
  for (const point of result.data) {
    for (const value of point.values) {
      if (value.type === 'voltage') names.add(value.name);
    }
  }
  return [...names].sort();
}

export default function WaveformPanel({
  result,
  open,
  width,
  language,
  onClose,
  onResizeStart,
}: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const phasePlotRef = useRef<HTMLDivElement>(null);
  const plotlyRef = useRef<any>(null);
  const labels = text[language];
  const nodes = useMemo(() => voltageNodes(result), [result]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [dcPlotMode, setDcPlotMode] = useState<'sweep' | 'xy'>('sweep');
  const [dcXNode, setDcXNode] = useState<string>('');

  useEffect(() => {
    if (nodes.length > 0 && selectedNodes.length === 0) {
      setSelectedNodes(nodes.slice(0, Math.min(3, nodes.length)));
    }
    if (nodes.length > 0 && !dcXNode) {
      setDcXNode(nodes[0]);
    }
  }, [nodes, selectedNodes.length, dcXNode]);

  useEffect(() => {
    if (!open || !plotRef.current || !result?.success || result.data.length === 0) return;
    let cancelled = false;
    const activeNodes = selectedNodes.length > 0 ? selectedNodes : nodes.slice(0, 1);
    const traces: any[] = [];
    const layout: any = {
      autosize: true,
      margin: { l: 54, r: 34, t: 18, b: 45 },
      paper_bgcolor: '#0f1117',
      plot_bgcolor: '#0f1117',
      font: { color: '#d1d5db', size: 12 },
      xaxis: { gridcolor: '#263244', zerolinecolor: '#475569' },
      yaxis: { gridcolor: '#263244', zerolinecolor: '#475569' },
      legend: { orientation: 'h', x: 0, y: -0.18 },
    };
    const phaseTraces: any[] = [];
    const phaseLayout: any = {
      autosize: true,
      margin: { l: 54, r: 34, t: 18, b: 45 },
      paper_bgcolor: '#0f1117',
      plot_bgcolor: '#0f1117',
      font: { color: '#d1d5db', size: 12 },
      xaxis: { title: labels.acX, type: 'log', gridcolor: '#263244', zerolinecolor: '#475569' },
      yaxis: { title: labels.phase, gridcolor: '#263244', zerolinecolor: '#475569' },
      legend: { orientation: 'h', x: 0, y: -0.18 },
    };

    if (result.analysis_type === 'op') {
      const point = result.data[0];
      traces.push({
        type: 'bar',
        x: activeNodes,
        y: activeNodes.map(node => point.values.find(v => v.type === 'voltage' && v.name === node)?.real ?? 0),
        marker: { color: '#60a5fa' },
        name: labels.opY,
      });
      layout.yaxis.title = labels.opY;
    } else if (result.analysis_type === 'tran') {
      layout.xaxis.title = labels.tranX;
      layout.yaxis.title = labels.opY;
      for (const node of activeNodes) {
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: result.data.map(point => point.sweep_value * 1000),
          y: result.data.map(point => point.values.find(v => v.type === 'voltage' && v.name === node)?.real ?? null),
          name: `V(${node})`,
        });
      }
    } else if (result.analysis_type === 'dc') {
      const xNode = dcXNode || nodes[0];
      layout.xaxis.title = dcPlotMode === 'xy' ? `V(${xNode ?? 'x'})` : labels.dcX;
      layout.yaxis.title = labels.opY;
      for (const node of activeNodes) {
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: result.data.map(point => {
            if (dcPlotMode !== 'xy') return point.sweep_value;
            return point.values.find(v => v.type === 'voltage' && v.name === xNode)?.real ?? null;
          }),
          y: result.data.map(point => point.values.find(v => v.type === 'voltage' && v.name === node)?.real ?? null),
          name: `V(${node})`,
        });
      }
    } else if (result.analysis_type === 'ac') {
      layout.xaxis = { ...layout.xaxis, title: labels.acX, type: 'log' };
      layout.yaxis.title = labels.mag;
      for (const node of activeNodes) {
        traces.push({
          type: 'scatter',
          mode: 'lines',
          x: result.data.map(point => point.sweep_value),
          y: result.data.map(point => {
            const value = point.values.find(v => v.type === 'voltage' && v.name === node);
            if (!value) return null;
            const mag = Math.sqrt(value.real ** 2 + value.imag ** 2);
            return 20 * Math.log10(Math.max(mag, 1e-30));
          }),
          name: `|V(${node})|`,
        });
        phaseTraces.push({
          type: 'scatter',
          mode: 'lines',
          x: result.data.map(point => point.sweep_value),
          y: result.data.map(point => {
            const value = point.values.find(v => v.type === 'voltage' && v.name === node);
            return value ? Math.atan2(value.imag, value.real) * 180 / Math.PI : null;
          }),
          name: `Phase ${node}`,
        });
      }
    }

    import('plotly.js-dist-min').then(module => {
      if (cancelled || !plotRef.current) return;
      const Plotly = module.default;
      plotlyRef.current = Plotly;
      Plotly.react(plotRef.current, traces, layout, { responsive: true, displaylogo: false });
      if (result.analysis_type === 'ac' && phasePlotRef.current) {
        Plotly.react(phasePlotRef.current, phaseTraces, phaseLayout, { responsive: true, displaylogo: false });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, result, selectedNodes, nodes, labels, dcPlotMode, dcXNode]);

  useEffect(() => {
    if (plotRef.current && plotlyRef.current) plotlyRef.current.Plots.resize(plotRef.current);
    if (phasePlotRef.current && plotlyRef.current) plotlyRef.current.Plots.resize(phasePlotRef.current);
  }, [width]);

  if (!open) return null;

  return (
    <div className="waveformPanel" style={{ width }}>
      <div className="panelResizeHandle" onMouseDown={onResizeStart} />
      <div className="waveformHeader">
        <div>
          <strong>{labels.title}{result?.success ? ` (.${result.analysis_type.toUpperCase()})` : ''}</strong>
          <span>{result?.success ? `${result.data.length} point(s)` : labels.empty}</span>
        </div>
        <button onClick={onClose} title={labels.close}>x</button>
      </div>

      {result?.success && nodes.length > 0 && (
        <div className="nodePicker" aria-label={labels.nodes}>
          {result.analysis_type === 'dc' && (
            <>
              <div className="plotModeTabs">
                <button
                  className={dcPlotMode === 'sweep' ? 'active' : ''}
                  onClick={() => setDcPlotMode('sweep')}
                >
                  {labels.dcSweep}
                </button>
                <button
                  className={dcPlotMode === 'xy' ? 'active' : ''}
                  onClick={() => setDcPlotMode('xy')}
                >
                  {labels.dcXY}
                </button>
              </div>
              {dcPlotMode === 'xy' && (
                <label className="axisSelect">
                  {labels.xSignal}
                  <select value={dcXNode || nodes[0]} onChange={event => setDcXNode(event.target.value)}>
                    {nodes.map(node => (
                      <option key={node} value={node}>V({node})</option>
                    ))}
                  </select>
                </label>
              )}
              <span className="axisLabel">{dcPlotMode === 'xy' ? labels.ySignals : labels.nodes}</span>
            </>
          )}

          {nodes.map(node => (
            <label key={node}>
              <input
                type="checkbox"
                checked={selectedNodes.includes(node)}
                onChange={event => {
                  setSelectedNodes(prev =>
                    event.target.checked ? [...prev, node] : prev.filter(item => item !== node)
                  );
                }}
              />
              V({node})
            </label>
          ))}
        </div>
      )}

      <div ref={plotRef} className={result?.analysis_type === 'ac' ? 'plotSurface splitPlot' : 'plotSurface'}>
        {!result?.success && <div className="emptyWaveform">{labels.empty}</div>}
      </div>
      {result?.success && result.analysis_type === 'ac' && (
        <div ref={phasePlotRef} className="plotSurface splitPlot" />
      )}
    </div>
  );
}
