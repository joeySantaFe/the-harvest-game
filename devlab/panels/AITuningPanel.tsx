import React, { useState, useCallback } from 'react';
import { AIConfig, DEFAULT_AI_CONFIG } from '../../game-logic/ripoff/aiConfig';
import { ENEMY_COLORS } from '../../constants';

interface AITuningPanelProps {
  config: AIConfig;
  onConfigChange: (config: AIConfig) => void;
}

type ParamDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  isBool?: boolean;
};

const harvesterParams: ParamDef[] = [
  { key: 'escapeAccel', label: 'Escape Accel', min: 0, max: 0.3, step: 0.01 },
  { key: 'towLength', label: 'Tow Length', min: 10, max: 100, step: 1 },
  { key: 'escapeMargin', label: 'Escape Margin', min: 20, max: 300, step: 10 },
  { key: 'fleeAccel', label: 'Flee Accel', min: 0, max: 0.3, step: 0.01 },
  { key: 'pursuitAccel', label: 'Pursuit Accel', min: 0, max: 0.3, step: 0.01 },
  { key: 'rotationSmoothing', label: 'Rotation Smooth', min: 0, max: 0.5, step: 0.01 },
  { key: 'fuelGrabDistance', label: 'Fuel Grab Dist', min: 10, max: 80, step: 1 },
  { key: 'fleeTimer', label: 'Flee Timer', min: 30, max: 300, step: 10 },
  { key: 'ignoreFuel', label: 'Ignore Fuel', min: 0, max: 1, step: 1, isBool: true },
];

const sprinterParams: ParamDef[] = [
  { key: 'detectionRange', label: 'Detection Range', min: 100, max: 1200, step: 10 },
  { key: 'turretTrackingRange', label: 'Turret Range', min: 50, max: 1000, step: 10 },
  { key: 'searchSpeedMult', label: 'Search Speed', min: 0.1, max: 1.5, step: 0.1 },
  { key: 'turretRotationTracking', label: 'Turret Rot Track', min: 0.01, max: 0.5, step: 0.01 },
  { key: 'turretRotationLeading', label: 'Turret Rot Lead', min: 0.01, max: 0.5, step: 0.01 },
  { key: 'bodyRotationSpeed', label: 'Body Rotation', min: 0.01, max: 0.2, step: 0.01 },
  { key: 'thrust', label: 'Thrust', min: 0, max: 0.3, step: 0.01 },
  { key: 'flankDistThreshold', label: 'Flank Dist', min: 50, max: 500, step: 10 },
  { key: 'flankOffsetAngle', label: 'Flank Angle', min: 0, max: Math.PI, step: 0.05 },
  { key: 'sweepSpeed', label: 'Sweep Speed', min: 0.005, max: 0.1, step: 0.005 },
  { key: 'sweepAmplitude', label: 'Sweep Amplitude', min: 0.1, max: Math.PI, step: 0.05 },
  { key: 'patrolDistFromCenter', label: 'Patrol Dist', min: 50, max: 800, step: 10 },
  { key: 'patrolRadius', label: 'Patrol Radius', min: 30, max: 400, step: 10 },
  { key: 'patrolOrbitSpeed', label: 'Orbit Speed', min: 0.001, max: 0.05, step: 0.001 },
  { key: 'searchRotation', label: 'Search Rotation', min: 0.01, max: 0.15, step: 0.01 },
  { key: 'searchThrust', label: 'Search Thrust', min: 0.01, max: 0.2, step: 0.01 },
  { key: 'shootCooldownMin', label: 'Shoot CD Min', min: 20, max: 300, step: 10 },
  { key: 'shootCooldownRange', label: 'Shoot CD Range', min: 10, max: 200, step: 10 },
  { key: 'disableShooting', label: 'Disable Shooting', min: 0, max: 1, step: 1, isBool: true },
];

const exterminatorParams: ParamDef[] = [
  { key: 'wanderAccel', label: 'Wander Accel', min: 0, max: 1, step: 0.05 },
  { key: 'idleSpeedMult', label: 'Idle Speed', min: 0.1, max: 1.5, step: 0.1 },
  { key: 'flankOffset', label: 'Flank Offset', min: 0, max: 2, step: 0.1 },
  { key: 'flankFadeDistance', label: 'Flank Fade Dist', min: 50, max: 400, step: 10 },
  { key: 'rotationSpeed', label: 'Rotation Speed', min: 0.01, max: 0.3, step: 0.01 },
  { key: 'acceleration', label: 'Acceleration', min: 0.01, max: 0.4, step: 0.01 },
  { key: 'sidewaysFriction', label: 'Side Friction', min: 0, max: 1, step: 0.05 },
  { key: 'forwardFriction', label: 'Fwd Friction', min: 0.8, max: 1, step: 0.01 },
  { key: 'disableFlanking', label: 'Disable Flanking', min: 0, max: 1, step: 1, isBool: true },
];

const globalParams: ParamDef[] = [
  { key: 'separationForce', label: 'Sep Force', min: 0, max: 0.5, step: 0.01 },
  { key: 'separationDistance', label: 'Sep Distance', min: 10, max: 100, step: 5 },
  { key: 'playerMaxSpeed', label: 'Player Max Speed', min: 1, max: 15, step: 0.5 },
  { key: 'playerShootCooldown', label: 'Player Shoot CD', min: 1, max: 30, step: 1 },
];

const AITuningPanel: React.FC<AITuningPanelProps> = ({ config, onConfigChange }) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    global: false,
    harvester: false,
    sprinter: false,
    exterminator: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateGlobal = useCallback((key: string, value: number) => {
    const next = { ...config, harvester: { ...config.harvester }, sprinter: { ...config.sprinter }, exterminator: { ...config.exterminator } };
    (next as any)[key] = value;
    onConfigChange(next);
  }, [config, onConfigChange]);

  const updateNested = useCallback((section: 'harvester' | 'sprinter' | 'exterminator', key: string, value: number | boolean) => {
    const next = { ...config, harvester: { ...config.harvester }, sprinter: { ...config.sprinter }, exterminator: { ...config.exterminator } };
    (next[section] as any)[key] = value;
    onConfigChange(next);
  }, [config, onConfigChange]);

  const resetSection = useCallback((section: 'harvester' | 'sprinter' | 'exterminator') => {
    const next = { ...config, harvester: { ...config.harvester }, sprinter: { ...config.sprinter }, exterminator: { ...config.exterminator } };
    next[section] = { ...DEFAULT_AI_CONFIG[section] };
    onConfigChange(next);
  }, [config, onConfigChange]);

  const resetAll = useCallback(() => {
    const next = {
      ...DEFAULT_AI_CONFIG,
      harvester: { ...DEFAULT_AI_CONFIG.harvester },
      sprinter: { ...DEFAULT_AI_CONFIG.sprinter },
      exterminator: { ...DEFAULT_AI_CONFIG.exterminator },
    };
    onConfigChange(next);
  }, [onConfigChange]);

  const renderSlider = (
    param: ParamDef,
    value: number | boolean,
    defaultValue: number | boolean,
    onChange: (key: string, val: number | boolean) => void
  ) => {
    if (param.isBool) {
      return (
        <div key={param.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ color: '#888', fontSize: 10 }}>{param.label}</span>
          <button
            onClick={() => onChange(param.key, !(value as boolean))}
            style={{
              background: value ? '#f44' : '#222',
              color: value ? '#fff' : '#666',
              border: `1px solid ${value ? '#f44' : '#444'}`,
              padding: '2px 8px',
              fontFamily: 'monospace',
              fontSize: 10,
              cursor: 'pointer',
            }}
          >
            {value ? 'ON' : 'OFF'}
          </button>
        </div>
      );
    }

    const numVal = value as number;
    const numDefault = defaultValue as number;
    const isModified = Math.abs(numVal - numDefault) > 0.0001;

    return (
      <div key={param.key} style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span style={{ color: isModified ? '#fa0' : '#888' }}>{param.label}</span>
          <span style={{ color: isModified ? '#fa0' : '#666' }}>{typeof numVal === 'number' ? numVal.toFixed(param.step < 0.1 ? 3 : param.step < 1 ? 2 : 0) : numVal}</span>
        </div>
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={numVal}
          onChange={e => onChange(param.key, parseFloat(e.target.value))}
          style={{ width: '100%', height: 12, accentColor: isModified ? '#fa0' : '#666' }}
        />
      </div>
    );
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    params: ParamDef[],
    values: Record<string, any>,
    defaults: Record<string, any>,
    onChange: (key: string, val: number | boolean) => void,
    color: string,
    onReset?: () => void
  ) => {
    const isOpen = openSections[sectionKey];
    return (
      <div key={sectionKey} style={{ marginBottom: 2 }}>
        <div
          onClick={() => toggleSection(sectionKey)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '4px 0',
            borderBottom: isOpen ? '1px solid #222' : 'none',
          }}
        >
          <span style={{ color, fontWeight: 'bold', fontSize: 11, letterSpacing: 1 }}>
            {isOpen ? '\u25BC' : '\u25B6'} {title}
          </span>
          {onReset && isOpen && (
            <button
              onClick={e => { e.stopPropagation(); onReset(); }}
              style={{
                background: 'none',
                border: '1px solid #444',
                color: '#666',
                padding: '1px 6px',
                fontFamily: 'monospace',
                fontSize: 9,
                cursor: 'pointer',
              }}
            >
              RESET
            </button>
          )}
        </div>
        {isOpen && (
          <div style={{ padding: '4px 0' }}>
            {params.map(p => renderSlider(p, values[p.key], defaults[p.key], onChange))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ borderBottom: '1px solid #222', paddingBottom: 8, marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ color: '#0f0', fontSize: 11, fontWeight: 'bold', letterSpacing: 2 }}>AI TUNING</span>
        <button
          onClick={resetAll}
          style={{
            background: 'none',
            border: '1px solid #444',
            color: '#666',
            padding: '1px 6px',
            fontFamily: 'monospace',
            fontSize: 9,
            cursor: 'pointer',
          }}
        >
          RESET ALL
        </button>
      </div>

      {renderSection('GLOBAL', 'global', globalParams, config, DEFAULT_AI_CONFIG, (k, v) => updateGlobal(k, v as number), '#fff')}
      {renderSection('HARVESTER', 'harvester', harvesterParams, config.harvester, DEFAULT_AI_CONFIG.harvester, (k, v) => updateNested('harvester', k, v), ENEMY_COLORS.harvester, () => resetSection('harvester'))}
      {renderSection('SPRINTER', 'sprinter', sprinterParams, config.sprinter, DEFAULT_AI_CONFIG.sprinter, (k, v) => updateNested('sprinter', k, v), ENEMY_COLORS.sprinter, () => resetSection('sprinter'))}
      {renderSection('EXTERMINATOR', 'exterminator', exterminatorParams, config.exterminator, DEFAULT_AI_CONFIG.exterminator, (k, v) => updateNested('exterminator', k, v), ENEMY_COLORS.exterminator, () => resetSection('exterminator'))}
    </div>
  );
};

export default AITuningPanel;
