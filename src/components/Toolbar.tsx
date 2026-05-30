import { useState } from 'react';
import logo from '@/assets/logo.png';

export interface SimConfig {
  mode: 'op' | 'dc' | 'tran' | 'ac';
  // DC sweep
  dc_source: string;
  dc_start: string;
  dc_stop: string;
  dc_step: string;
  // TRAN
  tran_step: string;
  tran_stop: string;
  // AC
  ac_type: 'dec' | 'oct' | 'lin';
  ac_pts: string;
  ac_fstart: string;
  ac_fstop: string;
}

export const defaultConfig: SimConfig = {
  mode: 'op',
  dc_source: 'V1',
  dc_start: '0',
  dc_stop: '5',
  dc_step: '0.1',
  tran_step: '1u',
  tran_stop: '1m',
  ac_type: 'dec',
  ac_pts: '10',
  ac_fstart: '1',
  ac_fstop: '1Meg',
};

interface Props {
  loading: boolean;
  onRun: () => void;
  config: SimConfig;
  onConfigChange: (cfg: SimConfig) => void;
  consoleOpen: boolean;
  onToggleConsole: () => void;
  onClear: () => void;
}

export default function Toolbar({
  loading, onRun,
  config, onConfigChange,
  consoleOpen, onToggleConsole,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SimConfig>(config);

  function openModal() {
    setDraft({ ...config });
    setOpen(true);
  }

  function apply() {
    onConfigChange(draft);
    setOpen(false);
  }

  function set<K extends keyof SimConfig>(key: K, val: SimConfig[K]) {
    setDraft(prev => ({ ...prev, [key]: val }));
  }

  const inputStyle: React.CSSProperties = {
    background: '#2a2d3a',
    border: '1px solid #3a3d4a',
    borderRadius: 5,
    color: '#e0e0e0',
    padding: '5px 8px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#90caf9',
    marginBottom: 4,
    display: 'block',
  };

  const rowStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginBottom: 12,
  };

  const modeTab = (m: SimConfig['mode'], label: string) => (
    <button
      key={m}
      onClick={() => set('mode', m)}
      style={{
        flex: 1,
        padding: '6px 0',
        background: draft.mode === m ? '#2563eb' : '#2a2d3a',
        color: draft.mode === m ? '#fff' : '#aaa',
        border: '1px solid ' + (draft.mode === m ? '#2563eb' : '#3a3d4a'),
        borderRadius: 5,
        cursor: 'pointer',
        fontWeight: draft.mode === m ? 700 : 400,
        fontSize: 13,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#1e2030',
    border: '1px solid #3a3d4a',
    borderRadius: 6,
    color: '#ccc',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: 13,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  };

  const quickMode = (mode: SimConfig['mode']) => (
    <button
      key={mode}
      className={config.mode === mode ? 'modeButton active' : 'modeButton'}
      onClick={() => onConfigChange({ ...config, mode })}
      title={`Use ${mode.toUpperCase()} analysis`}
    >
      .{mode.toUpperCase()}
    </button>
  );

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="topToolbar">
        {/* Logo */}
        <div className="brandMark">
        <img
            src={logo}
            alt="CircuitTH"
            className="brandLogo"
        />

        <span className="brandName">
            Circuit<span style={{ color: '#2563eb' }}>TH</span>
        </span>
        </div>
    

        <div style={{ width: 1, height: 24, background: '#2a2d3a', flexShrink: 0 }} />

        <div className="modeSwitcher" aria-label="Simulation mode">
          {(['op', 'dc', 'tran', 'ac'] as const).map(quickMode)}
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={onClear}
          title="Clear schematic"
          style={btnBase}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a3d4a')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18"/>
            <path d="M8 6V4h8v2"/>
            <path d="M19 6l-1 14H6L5 6"/>
          </svg>
          Clear
        </button>

        {/* Console toggle */}
        <button
          onClick={onToggleConsole}
          title="Toggle Console"
          style={{
            ...btnBase,
            borderColor: consoleOpen ? '#2563eb' : '#3a3d4a',
            background: consoleOpen ? '#1e2a4a' : '#1e2030',
            color: consoleOpen ? '#60a5fa' : '#ccc',
          }}
          onMouseEnter={e => { if (!consoleOpen) e.currentTarget.style.borderColor = '#555'; }}
          onMouseLeave={e => { if (!consoleOpen) e.currentTarget.style.borderColor = '#3a3d4a'; }}
        >
          {/* Terminal icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          Console
        </button>

        {/* Settings button */}
        <button
          onClick={openModal}
          title="Simulation Settings"
          style={btnBase}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a3d4a')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: loading ? '#374151' : '#2563eb',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            padding: '6px 18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: loading ? 'none' : '0 0 12px #2563eb55',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              Simulating…
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Run
            </>
          )}
        </button>
      </div>

      {/* ── Config Modal ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a1d27',
              border: '1px solid #2a2d3a',
              borderRadius: 10,
              padding: 24,
              width: 420,
              color: '#e0e0e0',
              boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>⚙ Simulation Settings</span>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Mode tabs */}
            <label style={labelStyle}>Analysis Type</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {modeTab('op', '.OP')}
              {modeTab('dc', '.DC')}
              {modeTab('tran', '.TRAN')}
              {modeTab('ac', '.AC')}
            </div>

            {draft.mode === 'dc' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Source Name</label>
                  <input style={inputStyle} value={draft.dc_source}
                    onChange={e => set('dc_source', e.target.value)} placeholder="V1" />
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>Start (V)</label>
                    <input style={inputStyle} value={draft.dc_start}
                      onChange={e => set('dc_start', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Stop (V)</label>
                    <input style={inputStyle} value={draft.dc_stop}
                      onChange={e => set('dc_stop', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Step (V)</label>
                  <input style={inputStyle} value={draft.dc_step}
                    onChange={e => set('dc_step', e.target.value)} />
                </div>
              </>
            )}

            {draft.mode === 'tran' && (
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>Step (e.g. 1u)</label>
                  <input style={inputStyle} value={draft.tran_step}
                    onChange={e => set('tran_step', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Stop (e.g. 1m)</label>
                  <input style={inputStyle} value={draft.tran_stop}
                    onChange={e => set('tran_stop', e.target.value)} />
                </div>
              </div>
            )}

            {draft.mode === 'ac' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Scale</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['dec', 'oct', 'lin'] as const).map(t => (
                      <button key={t}
                        onClick={() => set('ac_type', t)}
                        style={{
                          flex: 1, padding: '5px 0',
                          background: draft.ac_type === t ? '#2563eb' : '#2a2d3a',
                          color: draft.ac_type === t ? '#fff' : '#aaa',
                          border: '1px solid ' + (draft.ac_type === t ? '#2563eb' : '#3a3d4a'),
                          borderRadius: 5, cursor: 'pointer', fontSize: 12,
                        }}
                      >{t.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>Points / decade</label>
                    <input style={inputStyle} value={draft.ac_pts}
                      onChange={e => set('ac_pts', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>F Start (Hz)</label>
                    <input style={inputStyle} value={draft.ac_fstart}
                      onChange={e => set('ac_fstart', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>F Stop (Hz, e.g. 1Meg)</label>
                  <input style={inputStyle} value={draft.ac_fstop}
                    onChange={e => set('ac_fstop', e.target.value)} />
                </div>
              </>
            )}

            {draft.mode === 'op' && (
              <p style={{ color: '#666', fontSize: 13, margin: '0 0 16px' }}>
                Operating Point analysis has no additional parameters.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <button onClick={() => setOpen(false)}
                style={{ padding: '7px 16px', background: '#2a2d3a', border: '1px solid #3a3d4a', borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <button onClick={apply}
                style={{ padding: '7px 20px', background: '#2563eb', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
