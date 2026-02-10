import React from 'react';
import { SpawnMode } from '../devLabTypes';
import { ENEMY_COLORS } from '../../constants';

interface SpawnPanelProps {
  spawnMode: SpawnMode;
  onSetSpawnMode: (mode: SpawnMode) => void;
  entityCounts: { enemies: number; fuels: number; bullets: number };
  onClearEnemies: () => void;
  onResetScene: () => void;
}

const spawnBtnStyle = (active: boolean, color: string): React.CSSProperties => ({
  background: active ? color : '#111',
  color: active ? '#000' : color,
  border: `1px solid ${color}`,
  padding: '4px 8px',
  fontFamily: 'monospace',
  fontSize: 11,
  cursor: 'pointer',
  flex: 1,
});

const SpawnPanel: React.FC<SpawnPanelProps> = ({
  spawnMode,
  onSetSpawnMode,
  entityCounts,
  onClearEnemies,
  onResetScene,
}) => {
  const toggle = (mode: SpawnMode) => {
    onSetSpawnMode(spawnMode === mode ? null : mode);
  };

  return (
    <div style={{ borderBottom: '1px solid #222', paddingBottom: 8, marginBottom: 4 }}>
      <div style={{ color: '#fa0', fontSize: 11, marginBottom: 6, fontWeight: 'bold', letterSpacing: 2 }}>
        SPAWN
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button style={spawnBtnStyle(spawnMode === 'harvester', ENEMY_COLORS.harvester)} onClick={() => toggle('harvester')}>
          HARV
        </button>
        <button style={spawnBtnStyle(spawnMode === 'sprinter', ENEMY_COLORS.sprinter)} onClick={() => toggle('sprinter')}>
          SPRT
        </button>
        <button style={spawnBtnStyle(spawnMode === 'exterminator', ENEMY_COLORS.exterminator)} onClick={() => toggle('exterminator')}>
          EXTR
        </button>
        <button style={spawnBtnStyle(spawnMode === 'fuel', '#0af')} onClick={() => toggle('fuel')}>
          FUEL
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button
          style={{ ...spawnBtnStyle(false, '#666'), flex: 1 }}
          onClick={onClearEnemies}
        >
          CLEAR ENEMIES
        </button>
        <button
          style={{ ...spawnBtnStyle(false, '#666'), flex: 1 }}
          onClick={onResetScene}
        >
          RESET SCENE
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#666' }}>
        <span>Enemies: {entityCounts.enemies}</span>
        <span>Fuel: {entityCounts.fuels}</span>
        <span>Bullets: {entityCounts.bullets}</span>
      </div>
    </div>
  );
};

export default SpawnPanel;
