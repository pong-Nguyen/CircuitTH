import { useState } from 'react';
import logo from '@/assets/logo.png';
import type { StoredCircuit } from '../lib/circuitStorage';

export interface SimConfig {
  mode: 'op' | 'dc' | 'tran' | 'ac';
  dc_source: string;
  dc_start: string;
  dc_stop: string;
  dc_step: string;
  tran_step: string;
  tran_stop: string;
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
  waveformOpen: boolean;
  onToggleWaveform: () => void;
  onClear: () => void;
  language: 'vi' | 'en';
  onLanguageChange: (language: 'vi' | 'en') => void;
  circuits: StoredCircuit[];
  activeCircuitId: string | null;
  savingState: 'idle' | 'saving' | 'saved';
  onCircuitChange: (id: string) => void;
  onNewCircuit: () => void;
  onRenameCircuit: () => void;
  onDeleteCircuit: () => void;
  onSaveCircuit: () => void;
}

export default function Toolbar({
  loading,
  onRun,
  config,
  onConfigChange,
  consoleOpen,
  onToggleConsole,
  waveformOpen,
  onToggleWaveform,
  onClear,
  language,
  onLanguageChange,
  circuits,
  activeCircuitId,
  savingState,
  onCircuitChange,
  onNewCircuit,
  onRenameCircuit,
  onDeleteCircuit,
  onSaveCircuit,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SimConfig>(config);
  const vi = language === 'vi';
  const t = {
    clear: vi ? 'Xóa' : 'Clear',
    waveform: vi ? 'Đồ thị' : 'Waveform',
    console: 'Console',
    settings: vi ? 'Cài đặt' : 'Settings',
    run: vi ? 'Chạy' : 'Run',
    running: vi ? 'Đang chạy...' : 'Simulating...',
    simSettings: vi ? 'Cài đặt mô phỏng' : 'Simulation Settings',
    analysisType: vi ? 'Kiểu phân tích' : 'Analysis Type',
    sourceName: vi ? 'Tên nguồn' : 'Source Name',
    start: vi ? 'Bắt đầu' : 'Start',
    stop: vi ? 'Kết thúc' : 'Stop',
    step: vi ? 'Bước' : 'Step',
    scale: vi ? 'Thang đo' : 'Scale',
    points: vi ? 'Điểm / decade' : 'Points / decade',
    fstart: vi ? 'Tần số bắt đầu' : 'F Start',
    fstop: vi ? 'Tần số kết thúc' : 'F Stop',
    cancel: vi ? 'Hủy' : 'Cancel',
    apply: vi ? 'Áp dụng' : 'Apply',
    noParams: vi ? 'Operating Point không có tham số bổ sung.' : 'Operating Point analysis has no additional parameters.',
    newCircuit: vi ? 'Mạch mới' : 'New',
    renameCircuit: vi ? 'Đổi tên' : 'Rename',
    saveCircuit: vi ? 'Lưu' : 'Save',
    deleteCircuit: vi ? 'Xóa mạch' : 'Delete circuit',
    circuitFiles: vi ? 'File mạch' : 'Circuit files',
    saving: vi ? 'Đang lưu...' : 'Saving...',
    saved: vi ? 'Đã lưu' : 'Saved',
  };

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
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div className="topToolbar">
        <div className="brandMark">
          <img src={logo} alt="CircuitTH" className="brandLogo" />
          <span className="brandName">Circuit<span style={{ color: '#2563eb' }}>TH</span></span>
        </div>

        <div style={{ width: 1, height: 24, background: '#2a2d3a', flexShrink: 0 }} />
        <span className="modeStatus">.{config.mode.toUpperCase()}</span>
        <div className="circuitFileControls" title={t.circuitFiles}>
          <select
            value={activeCircuitId ?? ''}
            onChange={event => onCircuitChange(event.target.value)}
            disabled={circuits.length === 0}
            aria-label={t.circuitFiles}
          >
            {circuits.map(circuit => (
              <option key={circuit.id} value={circuit.id}>{circuit.name}</option>
            ))}
          </select>
          <button onClick={onNewCircuit} title={t.newCircuit}>+</button>
          <button onClick={onRenameCircuit} title={t.renameCircuit}>Aa</button>
          <button onClick={onSaveCircuit} title={t.saveCircuit}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8" />
              <path d="M7 3v5h8" />
            </svg>
          </button>
          <button onClick={onDeleteCircuit} title={t.deleteCircuit}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>
          </button>
          <span className="saveStatus">
            {savingState === 'saving' ? t.saving : savingState === 'saved' ? t.saved : ''}
          </span>
        </div>
        <div style={{ flex: 1 }} />

        <select
          value={language}
          onChange={event => onLanguageChange(event.target.value as 'vi' | 'en')}
          title={vi ? 'Ngôn ngữ' : 'Language'}
          style={{
            background: '#1e2030',
            border: '1px solid #3a3d4a',
            borderRadius: 6,
            color: '#ccc',
            padding: '6px 8px',
            fontSize: 13,
          }}
        >
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </select>

        <button onClick={onClear} title={t.clear} style={btnBase}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
          </svg>
          {t.clear}
        </button>

        <button
          onClick={onToggleWaveform}
          title={t.waveform}
          style={{
            ...btnBase,
            borderColor: waveformOpen ? '#2563eb' : '#3a3d4a',
            background: waveformOpen ? '#1e2a4a' : '#1e2030',
            color: waveformOpen ? '#60a5fa' : '#ccc',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h4l3-7 4 14 3-7h4" />
          </svg>
          {t.waveform}
        </button>

        <button
          onClick={onToggleConsole}
          title={t.console}
          style={{
            ...btnBase,
            borderColor: consoleOpen ? '#2563eb' : '#3a3d4a',
            background: consoleOpen ? '#1e2a4a' : '#1e2030',
            color: consoleOpen ? '#60a5fa' : '#ccc',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          {t.console}
        </button>

        <button onClick={openModal} title={t.settings} style={btnBase}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8 7 17M17 7l2.8-2.8" />
          </svg>
          {t.settings}
        </button>

        <button
          onClick={onRun}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: loading ? '#374151' : '#2563eb',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            padding: '6px 18px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: loading ? 'none' : '0 0 12px #2563eb55',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? t.running : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              {t.run}
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="modalOverlay" onClick={() => setOpen(false)}>
          <div className="settingsModal" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <strong>{t.simSettings}</strong>
              <button onClick={() => setOpen(false)}>x</button>
            </div>

            <label style={labelStyle}>{t.analysisType}</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
              {modeTab('op', '.OP')}
              {modeTab('dc', '.DC')}
              {modeTab('tran', '.TRAN')}
              {modeTab('ac', '.AC')}
            </div>

            {draft.mode === 'dc' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t.sourceName}</label>
                  <input style={inputStyle} value={draft.dc_source} onChange={e => set('dc_source', e.target.value)} placeholder="V1" />
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>{t.start} (V)</label>
                    <input style={inputStyle} value={draft.dc_start} onChange={e => set('dc_start', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.stop} (V)</label>
                    <input style={inputStyle} value={draft.dc_stop} onChange={e => set('dc_stop', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t.step} (V)</label>
                  <input style={inputStyle} value={draft.dc_step} onChange={e => set('dc_step', e.target.value)} />
                </div>
              </>
            )}

            {draft.mode === 'tran' && (
              <div style={rowStyle}>
                <div>
                  <label style={labelStyle}>{t.step}</label>
                  <input style={inputStyle} value={draft.tran_step} onChange={e => set('tran_step', e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>{t.stop}</label>
                  <input style={inputStyle} value={draft.tran_stop} onChange={e => set('tran_stop', e.target.value)} />
                </div>
              </div>
            )}

            {draft.mode === 'ac' && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t.scale}</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['dec', 'oct', 'lin'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => set('ac_type', type)}
                        style={{
                          flex: 1,
                          padding: '5px 0',
                          background: draft.ac_type === type ? '#2563eb' : '#2a2d3a',
                          color: draft.ac_type === type ? '#fff' : '#aaa',
                          border: '1px solid ' + (draft.ac_type === type ? '#2563eb' : '#3a3d4a'),
                          borderRadius: 5,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        {type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={rowStyle}>
                  <div>
                    <label style={labelStyle}>{t.points}</label>
                    <input style={inputStyle} value={draft.ac_pts} onChange={e => set('ac_pts', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.fstart}</label>
                    <input style={inputStyle} value={draft.ac_fstart} onChange={e => set('ac_fstart', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>{t.fstop}</label>
                  <input style={inputStyle} value={draft.ac_fstop} onChange={e => set('ac_fstop', e.target.value)} />
                </div>
              </>
            )}

            {draft.mode === 'op' && <p className="modalHint">{t.noParams}</p>}

            <div className="modalActions">
              <button onClick={() => setOpen(false)}>{t.cancel}</button>
              <button onClick={apply}>{t.apply}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
