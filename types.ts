export type Vector = { x: number; y: number };

// The Global App State (The Director)
export enum AppState {
  MENU = 'MENU',
  NARRATIVE = 'NARRATIVE',
  ACT_1_LANDER = 'ACT_1_LANDER',
  ACT_2_HARVEST = 'ACT_2_HARVEST',
  ACT_3_BATTLE = 'ACT_3_BATTLE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  HIGHSCORES = 'HIGHSCORES',
  HELP = 'HELP',
  DEVLAB = 'DEVLAB',
  COLONY_LOG = 'COLONY_LOG',
  LOG_ARCHIVE = 'LOG_ARCHIVE'
}

// Internal State for the Lander Game Component
export enum LanderState {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  DAMAGE_REPORT = 'DAMAGE_REPORT',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  CRASHED = 'CRASHED'
}

export type KeyMap = {
  thrust: string;
  left: string;
  right: string;
  abort: string; 
};

export type HighScore = {
  name: string;
  score: number;
  actReached: number;
};

// --- Physics Types (Shared or Specific to Lander) ---

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

export type Debris = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  color: string;
  shape: Vector[];
  life: number;
};

export type PadType = 'start' | 'fuel' | 'base';

export type TerrainSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  multiplier: number; 
  isPad: boolean;
  padType?: PadType; 
  fuelMax?: number;     
  fuelCurrent?: number;
  tankSide?: 'left' | 'right'; 
};

export type ShipSystem = 'THRUST' | 'STABILITY' | 'HULL' | 'COMMS';

export type Ship = {
  pos: Vector;
  vel: Vector;
  angle: number; 
  angularVel: number; 
  fuel: number;
  integrity: number; 
  dead: boolean;
  landed: boolean;
  suspension: number; 
  suspensionVel: number;
  groundY?: number; 
  enginePower: number; 
  systemStatus: Record<ShipSystem, number>;
};

// --- Props for Game Acts ---
export interface GameActProps {
  initialFuel: number;
  initialScore: number;
  onComplete: (results: ActResult) => void;
  onFailure: (finalScore: number) => void;
  onJumpToAct?: (act: 1 | 2 | 3) => void;
}

export type ActResult = {
  fuelRemaining: number;
  scoreGained: number;
  hullIntegrity: number;
};

// --- RipOff Game Types (Act II) ---

export enum RipOffState {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  WAVE_TRANSITION = 'WAVE_TRANSITION',
  ROUND_COMPLETE = 'ROUND_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type EnemyType = 'harvester' | 'sprinter' | 'exterminator';

export type AIState = 'pursuit' | 'flee' | 'capture' | 'tactical';

export type RipOffPlayer = {
  id: 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  color: string;
  dead: boolean;
  shielded: boolean;
  shieldTimer: number;
  shootCooldown: number;
  respawnTimer: number;
  treadOffset: number;
};

export type RipOffEnemy = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  turretAngle: number;  // Independent turret angle for sprinters
  isTracking: boolean;  // True when turret is actively tracking a player
  wasTracking: boolean; // Previous frame tracking state (for sound trigger)
  type: EnemyType;
  color: string;
  dead: boolean;
  aiState: AIState;
  shootCooldown: number;
  targetId: number | null; // Player ID or fuel index
  dragTarget: number | null; // Fuel index being dragged
  stateTimer: number;
  spawnId: number;   // v28: Used for flanking behavior (even/odd = left/right)
  speedMod: number;  // v28: Speed modifier (1.0 for waves 1-3, 1.1 for wave 4+)
  treadOffset: number;
};

export type RipOffBullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number | 'enemy'; // Player ID or 'enemy'
  dead: boolean;
  life: number;
};

export type RipOffFuel = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dead: boolean;
  beingDragged: boolean;
  draggedBy: number | null; // Enemy index
};

export type RipOffPowerUp = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'shield';
  dead: boolean;
  life: number; // Despawn timer
};

export type RipOffParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
};

export type PopupText = {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
};

// --- Menu Types ---

export interface ActUnlocks {
  act2Unlocked: boolean;
  act3Unlocked: boolean;
}

export interface ActInfo {
  actNumber: 1 | 2 | 3;
  title: string;
  subtitle: string;
  appState: AppState;
}