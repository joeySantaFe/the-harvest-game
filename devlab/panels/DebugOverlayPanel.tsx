import React from 'react';
import { DebugOverlayFlags } from '../devLabTypes';

interface DebugOverlayPanelProps {
  flags: DebugOverlayFlags;
  onFlagsChange: (flags: DebugOverlayFlags) => void;
}

const toggleStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '3px 0',
  cursor: 'pointer',
});

const badgeStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#0f0' : '#222',
  color: active ? '#000' : '#666',
  border: `1px solid ${active ? '#0f0' : '#444'}`,
  padding: '1px 8px',
  fontFamily: 'monospace',
  fontSize: 10,
  cursor: 'pointer',
  minWidth: 32,
  textAlign: 'center',
});

const DebugOverlayPanel: React.FC<DebugOverlayPanelProps> = ({ flags, onFlagsChange }) => {
  const toggle = (key: keyof DebugOverlayFlags) => {
    onFlagsChange({ ...flags, [key]: !flags[key] });
  };

  const overlays: { key: keyof DebugOverlayFlags; label: string }[] = [
    { key: 'visionCones', label: 'Vision Cones' },
    { key: 'targetLines', label: 'Target Lines' },
    { key: 'steeringVectors', label: 'Steering Vectors' },
    { key: 'collisionRadii', label: 'Collision Radii' },
  ];

  return (
    <div style={{ paddingBottom: 8 }}>
      <div style={{ color: '#0af', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 6 }}>
        DEBUG OVERLAYS
      </div>
      {overlays.map(o => (
        <div key={o.key} style={toggleStyle(flags[o.key])} onClick={() => toggle(o.key)}>
          <span style={{ color: flags[o.key] ? '#ccc' : '#666', fontSize: 11 }}>{o.label}</span>
          <button style={badgeStyle(flags[o.key])}>
            {flags[o.key] ? 'ON' : 'OFF'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default DebugOverlayPanel;
