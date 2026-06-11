import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar, { defaultConfig } from './components/Toolbar';
import WaveformPanel from './components/WaveformPanel';
import type { SimConfig } from './components/Toolbar';
import type { CircuitComponent, Wire } from './types';
import { generateNetlist } from './utils/netlist';
import { getEngine, CircuitEngine } from './lib/circuitEngine';
import type { SimulationResult } from './lib/circuitEngine';
import {
  createCircuit,
  deleteCircuit,
  getActiveCircuitId,
  listCircuits,
  saveCircuit,
  type StoredCircuit,
} from './lib/circuitStorage';
import {
  createCloudCircuit,
  deleteCloudCircuit,
  getLabUser,
  hasLabToken,
  listCloudCircuits,
  loginLab,
  logoutLab,
  updateCloudCircuit,
  type LabUser,
} from './lib/labApi';

export default function App() {
  const [components, setComponents] = useState<CircuitComponent[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<CircuitComponent | null>(null);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  // ── Simulation ────────────────────────────────────────────────
  const [simConfig, setSimConfig] = useState<SimConfig>(defaultConfig);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [waveformOpen, setWaveformOpen] = useState(false);
  const [language, setLanguage] = useState<'vi' | 'en'>('en');
  const [consoleHeight, setConsoleHeight] = useState(210);
  const [waveformWidth, setWaveformWidth] = useState(560);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [circuits, setCircuits] = useState<StoredCircuit[]>([]);
  const [activeCircuitId, setActiveCircuitId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [labUser, setLabUser] = useState<LabUser | null>(null);
  const [cloudError, setCloudError] = useState('');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  function log(line: string) {
    setConsoleLines(prev => [...prev, line]);
    // Scroll to bottom after paint
    setTimeout(() => consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  }

  function updateComponent(updated: CircuitComponent) {
    setComponents(prev => prev.map(c => c.uuid === updated.uuid ? updated : c));
    setSelectedComponent(updated);
  }

  function loadCircuit(circuit: StoredCircuit) {
    setActiveCircuitId(circuit.id);
    setComponents(circuit.components);
    setWires(circuit.wires);
    setSimConfig(circuit.simConfig);
    setSelectedComponent(null);
    setSelectedWire(null);
    setSelectedTool(null);
    setResult(null);
    setConsoleLines([]);
    localStorage.setItem('circuitth.activeCircuitId', circuit.id);
  }

  function updateCircuitList(next: StoredCircuit) {
    setCircuits(prev => {
      const withoutCurrent = prev.filter(item => item.id !== next.id);
      return [next, ...withoutCurrent].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  async function persistCircuit(next: StoredCircuit) {
    await saveCircuit(next);
    if (!labUser) return next;
    const cloud = next.cloudVersion
      ? await updateCloudCircuit(next)
      : await createCloudCircuit(next);
    await saveCircuit(cloud);
    return cloud;
  }

  async function loadCloudWorkspace(user: LabUser) {
    setStorageReady(false);
    setLabUser(user);
    const cloud = await listCloudCircuits();
    if (cloud.length > 0) {
      setCircuits(cloud);
      loadCircuit(cloud[0]);
    } else {
      const initial = await createCloudCircuit(createCircuit('Untitled Circuit', {
        components: [],
        wires: [],
        simConfig: defaultConfig,
      }));
      await saveCircuit(initial);
      setCircuits([initial]);
      loadCircuit(initial);
    }
    setStorageReady(true);
  }

  async function handleLabLogin(email: string, password: string) {
    setCloudError('');
    try {
      const user = await loginLab(email, password);
      await loadCloudWorkspace(user);
    } catch (error) {
      setCloudError((error as Error).message);
      throw error;
    }
  }

  async function handleLabLogout() {
    logoutLab();
    setLabUser(null);
    setCloudError('');
    setStorageReady(false);
    const local = (await listCircuits()).filter(circuit => !circuit.cloudVersion);
    if (local.length > 0) {
      setCircuits(local);
      loadCircuit(local[0]);
    } else {
      const next = createCircuit('Untitled Circuit', { components: [], wires: [], simConfig: defaultConfig });
      await saveCircuit(next);
      setCircuits([next]);
      loadCircuit(next);
    }
    setStorageReady(true);
  }

  async function createNewCircuit() {
    const name = window.prompt(language === 'vi' ? 'Tên mạch mới:' : 'New circuit name:', `Circuit ${circuits.length + 1}`);
    if (!name) return;
    let next = createCircuit(name.trim(), {
      components: [],
      wires: [],
      simConfig: defaultConfig,
    });
    next = await persistCircuit(next);
    updateCircuitList(next);
    loadCircuit(next);
  }

  async function renameCurrentCircuit() {
    const current = circuits.find(item => item.id === activeCircuitId);
    if (!current) return;
    const name = window.prompt(language === 'vi' ? 'Đổi tên mạch:' : 'Rename circuit:', current.name);
    if (!name) return;
    const next = { ...current, name: name.trim(), updatedAt: Date.now() };
    const saved = await persistCircuit(next);
    updateCircuitList(saved);
  }

  async function deleteCurrentCircuit() {
    if (!activeCircuitId) return;
    const current = circuits.find(item => item.id === activeCircuitId);
    if (!current) return;
    const ok = window.confirm(
      language === 'vi'
        ? `Xóa mạch "${current.name}" khỏi máy này?`
        : `Delete "${current.name}" from this device?`,
    );
    if (!ok) return;
    if (labUser) await deleteCloudCircuit(activeCircuitId);
    await deleteCircuit(activeCircuitId);
    const remaining = circuits.filter(item => item.id !== activeCircuitId);
    if (remaining.length > 0) {
      setCircuits(remaining);
      loadCircuit(remaining[0]);
      return;
    }
    const next = createCircuit('Untitled Circuit', {
      components: [],
      wires: [],
      simConfig: defaultConfig,
    });
    const saved = await persistCircuit(next);
    setCircuits([saved]);
    loadCircuit(saved);
  }

  async function forceSaveCircuit() {
    if (!activeCircuitId) return;
    const current = circuits.find(item => item.id === activeCircuitId);
    const next: StoredCircuit = {
      id: activeCircuitId,
      name: current?.name ?? 'Untitled Circuit',
      components,
      wires,
      simConfig,
      cloudVersion: current?.cloudVersion,
      createdAt: current?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    setSavingState('saving');
    const saved = await persistCircuit(next);
    updateCircuitList(saved);
    setSavingState('saved');
  }

  function deleteSelectedComponent() {
    if (!selectedComponent) return;
    setComponents(prev => prev.filter(c => c.uuid !== selectedComponent.uuid));
    setSelectedComponent(null);
  }

  function clearSchematic() {
    setComponents([]);
    setWires([]);
    setSelectedComponent(null);
    setSelectedWire(null);
    setSelectedTool(null);
    setConsoleLines([]);
    setResult(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (hasLabToken()) {
        try {
          const user = await getLabUser();
          await loadCloudWorkspace(user);
          return;
        } catch (error) {
          logoutLab();
          setCloudError((error as Error).message);
        }
      }

      const stored = (await listCircuits()).filter(circuit => !circuit.cloudVersion);
      if (cancelled) return;

      if (stored.length === 0) {
        const next = createCircuit('Untitled Circuit', {
          components: [],
          wires: [],
          simConfig: defaultConfig,
        });
        await saveCircuit(next);
        if (cancelled) return;
        setCircuits([next]);
        loadCircuit(next);
      } else {
        const activeId = getActiveCircuitId();
        const active = stored.find(item => item.id === activeId) ?? stored[0];
        setCircuits(stored);
        loadCircuit(active);
      }

      setStorageReady(true);
    }

    hydrate().catch(error => {
      console.error('Failed to load local circuits', error);
      setStorageReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || !activeCircuitId) return;
    const current = circuits.find(item => item.id === activeCircuitId);
    const next: StoredCircuit = {
      id: activeCircuitId,
      name: current?.name ?? 'Untitled Circuit',
      components,
      wires,
      simConfig,
      cloudVersion: current?.cloudVersion,
      createdAt: current?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };

    setSavingState('saving');
    const timer = window.setTimeout(() => {
      persistCircuit(next)
        .then(saved => {
          updateCircuitList(saved);
          setSavingState('saved');
        })
        .catch(error => {
          console.error('Failed to save local circuit', error);
          if (labUser) setCloudError((error as Error).message);
          setSavingState('idle');
        });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [components, wires, simConfig, storageReady, activeCircuitId, labUser]);

  function startVerticalResize(
    event: React.MouseEvent<HTMLDivElement>,
    currentHeight: number,
    setter: React.Dispatch<React.SetStateAction<number>>,
    min = 120,
    max = 620,
  ) {
    event.preventDefault();
    const startY = event.clientY;
    const onMove = (moveEvent: MouseEvent) => {
      const next = Math.max(min, Math.min(max, currentHeight + startY - moveEvent.clientY));
      setter(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function startHorizontalResize(
    event: React.MouseEvent<HTMLDivElement>,
    currentWidth: number,
    setter: React.Dispatch<React.SetStateAction<number>>,
    min = 320,
    max = 900,
  ) {
    event.preventDefault();
    const startX = event.clientX;
    const onMove = (moveEvent: MouseEvent) => {
      const next = Math.max(min, Math.min(max, currentWidth + moveEvent.clientX - startX));
      setter(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  //function deleteSelectedWire() {
  // if (!selectedWire) return;
  //  setWires(prev => prev.filter(w => w.id !== selectedWire));
  //  setSelectedWire(null);
  //}

  async function runSimulation() {
    // Build netlist with sim command based on config
    let netlistBase = generateNetlist(components, wires);
    // Replace .op/.end with the correct analysis command
    const { mode } = simConfig;
    let simLine = '.op';
    if (mode === 'dc') {
      simLine = `.dc ${simConfig.dc_source} ${simConfig.dc_start} ${simConfig.dc_stop} ${simConfig.dc_step}`;
    } else if (mode === 'tran') {
      simLine = `.tran ${simConfig.tran_step} ${simConfig.tran_stop}`;
    } else if (mode === 'ac') {
      simLine = `.ac ${simConfig.ac_type} ${simConfig.ac_pts} ${simConfig.ac_fstart} ${simConfig.ac_fstop}`;
    }
    const netlist = netlistBase.replace(/^\.op$/m, simLine);

    setConsoleOpen(true);
    setConsoleLines([]);
    setLoading(true);

    log(`> Running .${mode.toUpperCase()} simulation…`);
    log('> Netlist:');
    netlist.split('\n').forEach(l => log('  ' + l));
    log('');

    try {
      const engine = await getEngine();
      const res = engine.simulate(netlist);
      setResult(res);
      if (res.success) setWaveformOpen(true);

      if (!res.success) {
        log('✗ Error: ' + res.error_msg);
      } else {
        log(`✓ Analysis: ${res.analysis_type.toUpperCase()} — ${res.data.length} point(s)`);
        log('');

        if (res.analysis_type === 'op') {
          log('── Node Voltages ──');
          CircuitEngine.voltages(res).forEach(v =>
            log(`  V(${v.name}) = ${v.real.toFixed(6)} V`)
          );
          log('── Branch Currents ──');
          CircuitEngine.currents(res).forEach(c =>
            log(`  I(${c.name}) = ${(c.real * 1000).toFixed(6)} mA`)
          );
        } else if (res.analysis_type === 'tran') {
          const nodes = res.data[0].values.filter(v => v.type === 'voltage').map(v => v.name);
          log('── Transient (sampled 20 pts) ──');
          log('  Time(ms)'.padEnd(14) + nodes.map(n => `V(${n})`.padEnd(14)).join(''));
          const step = Math.max(1, Math.floor(res.data.length / 20));
          res.data.filter((_, i) => i % step === 0).forEach(pt => {
            const t = (pt.sweep_value * 1000).toFixed(3).padEnd(14);
            const vals = nodes.map(name => {
              const nv = pt.values.find(v => v.name === name);
              return (nv ? nv.real.toFixed(4) : '-').padEnd(14);
            }).join('');
            log('  ' + t + vals);
          });
        } else if (res.analysis_type === 'dc') {
          const nodes = res.data[0].values.filter(v => v.type === 'voltage').map(v => v.name);
          log('── DC Sweep (sampled 20 pts) ──');
          log('  Sweep(V)'.padEnd(14) + nodes.map(n => `V(${n})`.padEnd(14)).join(''));
          const step = Math.max(1, Math.floor(res.data.length / 20));
          res.data.filter((_, i) => i % step === 0).forEach(pt => {
            const s = pt.sweep_value.toFixed(3).padEnd(14);
            const vals = nodes.map(name => {
              const nv = pt.values.find(v => v.name === name);
              return (nv ? nv.real.toFixed(4) : '-').padEnd(14);
            }).join('');
            log('  ' + s + vals);
          });
        } else if (res.analysis_type === 'ac') {
          const nodes = res.data[0].values.filter(v => v.type === 'voltage').map(v => v.name);
          log('── AC Bode (sampled 20 pts) ──');
          log('  Freq(Hz)'.padEnd(14) + nodes.map(n => `|V(${n})| dB`.padEnd(16)).join(''));
          const step = Math.max(1, Math.floor(res.data.length / 20));
          res.data.filter((_, i) => i % step === 0).forEach(pt => {
            const f = pt.sweep_value.toFixed(1).padEnd(14);
            const vals = nodes.map(name => {
              const nv = pt.values.find(v => v.name === name);
              if (!nv) return '-'.padEnd(16);
              const db = 20 * Math.log10(Math.sqrt(nv.real ** 2 + nv.imag ** 2) || 1e-30);
              return db.toFixed(2).padEnd(16);
            }).join('');
            log('  ' + f + vals);
          });
        }
      }
    } catch (e: any) {
      log('✗ Exception: ' + e.message);
    } finally {
      setLoading(false);
      log('');
      log('> Done.');
    }
  }

  return (
    <div className="app">
      <Toolbar
        loading={loading}
        onRun={runSimulation}
        config={simConfig}
        onConfigChange={setSimConfig}
        consoleOpen={consoleOpen}
        onToggleConsole={() => setConsoleOpen(v => !v)}
        waveformOpen={waveformOpen}
        onToggleWaveform={() => setWaveformOpen(v => !v)}
        onClear={clearSchematic}
        language={language}
        onLanguageChange={setLanguage}
        circuits={circuits}
        activeCircuitId={activeCircuitId}
        savingState={savingState}
        onCircuitChange={id => {
          const circuit = circuits.find(item => item.id === id);
          if (circuit) loadCircuit(circuit);
        }}
        onNewCircuit={createNewCircuit}
        onRenameCircuit={renameCurrentCircuit}
        onDeleteCircuit={deleteCurrentCircuit}
        onSaveCircuit={forceSaveCircuit}
        labUser={labUser}
        cloudError={cloudError}
        onLabLogin={handleLabLogin}
        onLabLogout={handleLabLogout}
      />

      <Sidebar selectedTool={selectedTool} setSelectedTool={setSelectedTool} language={language} />

      <div className="content">
        <WaveformPanel
          result={result}
          open={waveformOpen}
          width={waveformWidth}
          language={language}
          onClose={() => setWaveformOpen(false)}
          onResizeStart={event => startHorizontalResize(event, waveformWidth, setWaveformWidth, 320, 900)}
        />

        <div className="main">
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <Canvas
                components={components}
                wires={wires}
                selectedComponent={selectedComponent}
                selectedWire={selectedWire}
                selectedTool={selectedTool}
                setSelectedTool={setSelectedTool}
                setComponents={setComponents}
                setWires={setWires}
                setSelectedComponent={setSelectedComponent}
                setSelectedWire={setSelectedWire}
              />
            </div>

            {consoleOpen && (
              <div className="consolePanel" style={{
                height: consoleHeight,
                minHeight: 120,
                maxHeight: 620,
                background: '#0f1117',
                borderTop: '2px solid #2563eb',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}>
                <div
                  className="panelResizeHandle"
                  onMouseDown={event => startVerticalResize(event, consoleHeight, setConsoleHeight, 120, 620)}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 12px',
                  background: '#1a1d27',
                  borderBottom: '1px solid #2a2d3a',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: loading ? '#facc15' : consoleLines.some(l => l.startsWith('✗')) ? '#ef5350' : '#22c55e',
                      display: 'inline-block',
                    }} />
                    <span style={{ color: '#90caf9', fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>
                      Console
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setConsoleLines([])}
                      title="Clear"
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12, padding: '2px 8px', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
                      onMouseLeave={e => e.currentTarget.style.color = '#555'}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setConsoleOpen(false)}
                      title="Close"
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, padding: '2px 8px', borderRadius: 4, lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
                      onMouseLeave={e => e.currentTarget.style.color = '#555'}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  padding: '8px 14px',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.7,
                }}>
                  {consoleLines.map((line, i) => {
                    const color =
                      line.startsWith('✓') ? '#4ade80' :
                      line.startsWith('✗') ? '#f87171' :
                      line.startsWith('>') ? '#93c5fd' :
                      line.startsWith('──') ? '#fb923c' :
                      '#d1d5db';
                    return (
                      <div key={i} style={{ color, whiteSpace: 'pre' }}>
                        {line || '\u00a0'}
                      </div>
                    );
                  })}
                  <div ref={consoleEndRef} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={selectedComponent ? 'rightPanel open' : 'rightPanel'}>
          {selectedComponent && (
            <PropertiesPanel
              selected={selectedComponent}
              onUpdate={updateComponent}
              onDelete={deleteSelectedComponent}
              language={language}
            />
          )}
        </div>
      </div>
    </div>
  );
}
