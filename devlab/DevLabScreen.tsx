import React, { useState, useCallback, useRef } from 'react';
import { SimulationState, SpawnMode, DebugOverlayFlags } from './devLabTypes';
import { AIConfig, getAIConfig, setAIConfig, resetAIConfig } from '../game-logic/ripoff/aiConfig';
import DevLabCanvas, { DevLabCanvasHandle } from './DevLabCanvas';
import DevLabFooter from './DevLabFooter';
import SpawnPanel from './panels/SpawnPanel';
import AITuningPanel from './panels/AITuningPanel';
import DebugOverlayPanel from './panels/DebugOverlayPanel';

interface DevLabScreenProps {
  onExit: () => void;
}

const DevLabScreen: React.FC<DevLabScreenProps> = ({ onExit }) => {
  const canvasHandleRef = useRef<DevLabCanvasHandle>(null);

  // Simulation state
  const [simState, setSimState] = useState<SimulationState>({
    paused: false,
    timeScale: 1,
    stepRequested: false,
    frameCount: 0,
  });

  // Spawn mode
  const [spawnMode, setSpawnMode] = useState<SpawnMode>(null);

  // Debug overlay flags
  const [debugFlags, setDebugFlags] = useState<DebugOverlayFlags>({
    visionCones: false,
    targetLines: false,
    steeringVectors: false,
    collisionRadii: false,
  });

  // Entity counts (updated by canvas)
  const [entityCounts, setEntityCounts] = useState({ enemies: 0, fuels: 0, bullets: 0 });

  // AI config state (for re-rendering panels on change)
  const [aiConfig, setAiConfigState] = useState<AIConfig>(() => {
    resetAIConfig();
    return { ...getAIConfig(), harvester: { ...getAIConfig().harvester }, sprinter: { ...getAIConfig().sprinter }, exterminator: { ...getAIConfig().exterminator } };
  });

  const handleConfigChange = useCallback((newConfig: AIConfig) => {
    setAIConfig(newConfig);
    setAiConfigState({ ...newConfig, harvester: { ...newConfig.harvester }, sprinter: { ...newConfig.sprinter }, exterminator: { ...newConfig.exterminator } });
  }, []);

  const handlePauseToggle = useCallback(() => {
    setSimState(prev => ({ ...prev, paused: !prev.paused }));
  }, []);

  const handleStep = useCallback(() => {
    setSimState(prev => ({ ...prev, stepRequested: true, paused: true }));
  }, []);

  const handleStepConsumed = useCallback(() => {
    setSimState(prev => ({ ...prev, stepRequested: false }));
  }, []);

  const handleTimeScale = useCallback((scale: number) => {
    setSimState(prev => ({ ...prev, timeScale: scale }));
  }, []);

  const handleReset = useCallback(() => {
    canvasHandleRef.current?.resetScene();
    setSimState(prev => ({ ...prev, frameCount: 0 }));
  }, []);

  const handleFrameUpdate = useCallback((frame: number) => {
    setSimState(prev => ({ ...prev, frameCount: frame }));
  }, []);

  const handleClearEnemies = useCallback(() => {
    canvasHandleRef.current?.clearEnemies();
  }, []);

  const handleExit = useCallback(() => {
    resetAIConfig();
    onExit();
  }, [onExit]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gridTemplateRows: '1fr 48px',
      width: '100vw',
      height: '100vh',
      background: '#000',
      overflow: 'hidden',
    }}>
      {/* Canvas area */}
      <div style={{ gridColumn: '1', gridRow: '1', position: 'relative', overflow: 'hidden' }}>
        <DevLabCanvas
          ref={canvasHandleRef}
          simState={simState}
          spawnMode={spawnMode}
          debugFlags={debugFlags}
          onStepConsumed={handleStepConsumed}
          onFrameUpdate={handleFrameUpdate}
          onEntityCountsUpdate={setEntityCounts}
        />
        {/* Spawn mode indicator */}
        {spawnMode && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid #fa0',
            color: '#fa0',
            padding: '4px 12px',
            fontFamily: 'monospace',
            fontSize: 12,
          }}>
            CLICK TO PLACE: {spawnMode.toUpperCase()} (ESC to cancel)
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{
        gridColumn: '2',
        gridRow: '1 / 3',
        background: '#0a0a0a',
        borderLeft: '1px solid #222',
        overflowY: 'auto',
        padding: '8px',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#aaa',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {/* Exit button */}
        <button
          onClick={handleExit}
          style={{
            background: '#111',
            border: '1px solid #444',
            color: '#888',
            padding: '6px 12px',
            fontFamily: 'monospace',
            fontSize: 12,
            cursor: 'pointer',
            marginBottom: 4,
          }}
        >
          EXIT DEVLAB
        </button>

        <SpawnPanel
          spawnMode={spawnMode}
          onSetSpawnMode={setSpawnMode}
          entityCounts={entityCounts}
          onClearEnemies={handleClearEnemies}
          onResetScene={handleReset}
        />

        <AITuningPanel
          config={aiConfig}
          onConfigChange={handleConfigChange}
        />

        <DebugOverlayPanel
          flags={debugFlags}
          onFlagsChange={setDebugFlags}
        />
      </div>

      {/* Footer */}
      <div style={{ gridColumn: '1', gridRow: '2' }}>
        <DevLabFooter
          simState={simState}
          onPauseToggle={handlePauseToggle}
          onStep={handleStep}
          onTimeScale={handleTimeScale}
          onReset={handleReset}
        />
      </div>
    </div>
  );
};

export default DevLabScreen;
