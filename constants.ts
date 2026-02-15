import { KeyMap } from './types';

export const GAME_VERSION = '1.4.2';

// Physics - Adjusted for "Floaty" Moon feel
export const GRAVITY = 0.005; // Very low gravity
export const THRUST_POWER = 0.025; // Weaker thrust to compensate for low gravity
export const ROTATION_SPEED = 0.04; // Used as max speed reference or direct input in simplified modes
export const ROTATION_ACCEL = 0.003; // Angular acceleration
export const ROTATION_DRAG = 0.94; // Angular damping

export const FRICTION = 0.999; 

// Limits - Difficulty Increased
export const MAX_SAFE_VELOCITY_Y = 0.5; // Green Zone (Strict perfect landing - 5.0 m/s)
export const MAX_SURVIVABLE_VELOCITY_Y = 1.5; // Yellow Zone (Damage threshold - 15.0 m/s)
export const MAX_SAFE_VELOCITY_X = 0.8; // Horizontal limit (8.0 m/s)
export const MAX_SAFE_ANGLE = 0.2; // Angle limit (approx 11 degrees)
export const MAX_ABSOLUTE_VELOCITY = 4.0; 

// World
export const WORLD_WIDTH = 6000; // Wider to accommodate the journey
export const MAX_ZOOM = 2.5;
export const ZOOM_THRESHOLD = 300; // Altitude at which zoom kicks in

export const SCREEN_COLORS = {
  primary: '#0f0',    // Green
  secondary: '#0af',  // Cyan
  alert: '#f04',      // Red/Pink
  score: '#fd0',      // Gold
  text: '#ccc',       // Grey
  bg: '#000'
};

export const DEFAULT_KEYMAP: KeyMap = {
  thrust: 'Space',
  left: 'KeyA',
  right: 'KeyD',
  abort: 'KeyW' 
};

export const INITIAL_FUEL = 600; // Reduced fuel to force stops (World width 6000 requires ~1000+ fuel to traverse safely)

// --- RipOff Game Constants (Act II) ---

// Physics (matching v28)
export const RIPOFF_FRICTION = 0.98;
export const RIPOFF_THRUST = 0.4;      // v28: 0.4 (was 0.15)
export const RIPOFF_ROTATION = 0.06;   // Reduced for tank control (was 0.12)
export const RIPOFF_BULLET_SPEED = 14; // v28: player bullets = 14
export const RIPOFF_ENEMY_BULLET_SPEED = 6; // v28: enemy bullets = 6
export const RIPOFF_BULLET_LIFE = 45;  // v28: player bullet life
export const RIPOFF_ENEMY_BULLET_LIFE = 90; // v28: enemy bullet life
export const RIPOFF_RECOIL = 0.5;      // v28: 0.5 (was 0.3)
export const RIPOFF_REVERSE_THRUST = 0.2; // Half of forward thrust for reverse driving
export const TANK_SIDEWAYS_FRICTION = 0.3; // Heavy friction on sideways movement
export const TANK_FORWARD_FRICTION = 0.98; // Light friction on forward movement

// Enemy Speeds (matching v28: basic=2.2, dash=3.0, hunter=3.5)
export const ENEMY_SPEEDS = {
  harvester: 2.2,    // v28 'basic' tank
  sprinter: 3.0,     // v28 'dash' tank
  exterminator: 3.5  // v28 'hunter' ship
};

// Speed when carrying fuel (v28)
export const ENEMY_CARRY_SPEED = 1.5;

// Scoring
export const ENEMY_SCORES = {
  harvester: 100,
  sprinter: 150,
  exterminator: 250
};

export const EXTRA_LIFE_SCORE = 5000;
export const SHIELD_DURATION = 900; // frames (15 seconds at 60fps)
export const POWERUP_SPAWN_CHANCE = 0.15; // 15% chance per enemy kill
export const POWERUP_DESPAWN_TIME = 600; // 10 seconds

// AI Timers
export const KITING_THRESHOLD = 300; // frames of retreat behavior
export const TACTICAL_TIMEOUT = 600; // frames before reverting from tactical
export const ENEMY_SHOOT_COOLDOWN_MIN = 120; // 2 seconds
export const ENEMY_SHOOT_COOLDOWN_MAX = 220; // ~3.7 seconds

// Vector Shapes
export const RIPOFF_SHAPES = {
  player: [[12, 8], [12, -8], [-12, -8], [-12, 8]], // Tank body (same as enemy)
  playerTreadL: [[14, 12], [-14, 12], [-14, 8], [14, 8]],
  playerTreadR: [[14, -12], [-14, -12], [-14, -8], [14, -8]],
  playerTurret: [[0, 0], [20, 0]],
  tankBody: [[12, 8], [12, -8], [-12, -8], [-12, 8]],
  tankTreadL: [[14, 12], [-14, 12], [-14, 8], [14, 8]],
  tankTreadR: [[14, -12], [-14, -12], [-14, -8], [14, -8]],
  tankTurret: [[0, 0], [20, 0]],
  buggyBody: [[10, 6], [10, -6], [-10, -6], [-10, 6]], // Smaller rectangle for buggy
  buggyBumper: [[12, -5], [12, 5]], // Front bumper bar
  buggyWheelFL: [10, -7],   // Front-left wheel position [x, y]
  buggyWheelFR: [10, 7],    // Front-right wheel position
  buggyWheelBL: [-10, -7],  // Back-left wheel position
  buggyWheelBR: [-10, 7],   // Back-right wheel position
  fuel: [[-7, -12], [7, -12], [12, 0], [7, 12], [-7, 12], [-12, 0]],
  powerup: [[0, -10], [8, 0], [0, 10], [-8, 0]]
};

// Enemy Colors
export const ENEMY_COLORS = {
  harvester: '#f04',  // Red
  sprinter: '#fa0',   // Orange
  exterminator: '#b0f' // Purple
};

// Fuel to Lives Conversion
export const FUEL_TO_LIVES_RATIO = 150; // 150 fuel = 1 bonus life
export const MAX_BONUS_LIVES = 4;

// --- Falling Star Effect (Act I) ---
export const FALLING_STAR = {
  FREQUENCY: 300,       // Average spawn interval in frames (~5 seconds at 60fps)
  INTENSITY: 1.0,       // 0.0–1.0: controls spawn rate and max alpha
  MIN_SPEED: 3,         // Minimum streak speed (px/frame)
  MAX_SPEED: 7,         // Maximum streak speed (px/frame)
  TAIL_LENGTH: 80,      // Fade trail length in pixels
  MAX_ACTIVE: 3,        // Cap on simultaneous falling stars
};