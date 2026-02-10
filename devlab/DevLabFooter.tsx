import React from 'react';
import { SimulationState } from './devLabTypes';

interface DevLabFooterProps {
  simState: SimulationState;
  onPauseToggle: () => void;
  onStep: () => void;
  onTimeScale: (scale: number) => void;
  onReset: () => void;
}

const btnStyle = (active: boolean = false): React.CSSProperties => ({
  background: active ? '#fa0' : '#181818',
  color: active ? '#000' : '#aaa',
  border: `1px solid ${active ? '#fa0' : '#333'}`,
  padding: '4px 12px',
  fontFamily: 'monospace',
  fontSize: 12,
  cursor: 'pointer',
  minWidth: 40,
});

const DevLabFooter: React.FC<DevLabFooterProps> = ({
  simState,
  onPauseToggle,
  onStep,
  onTimeScale,
  onReset,
}) => {
  const scales = [0.25, 0.5, 1, 2];

  return (
    <div style={{
      height: 48,
      background: '#0a0a0a',
      borderTop: '1px solid #222',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#888',
      gap: 8,
    }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button style={btnStyle(simState.paused)} onClick={onPauseToggle}>
          {simState.paused ? 'PLAY' : 'PAUSE'}
        </button>
        <button
          style={{ ...btnStyle(), opacity: simState.paused ? 1 : 0.4 }}
          onClick={onStep}
          disabled={!simState.paused}
        >
          STEP
        </button>
        <span style={{ margin: '0 8px', color: '#555' }}>|</span>
        <span style={{ color: '#666' }}>SPEED:</span>
        {scales.map(s => (
          <button
            key={s}
            style={btnStyle(simState.timeScale === s)}
            onClick={() => onTimeScale(s)}
          >
            {s}x
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#555' }}>FRAME: {simState.frameCount}</span>
        <button style={{ ...btnStyle(), color: '#f44', borderColor: '#f44' }} onClick={onReset}>
          RESET
        </button>
      </div>
    </div>
  );
};

export default DevLabFooter;
