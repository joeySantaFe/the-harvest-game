import { EnemyType } from '../types';

export type SimulationState = {
  paused: boolean;
  timeScale: number;
  stepRequested: boolean;
  frameCount: number;
};

export type SpawnMode = EnemyType | 'fuel' | null;

export type DebugOverlayFlags = {
  visionCones: boolean;
  targetLines: boolean;
  steeringVectors: boolean;
  collisionRadii: boolean;
};
