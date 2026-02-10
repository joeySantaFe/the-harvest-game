// AI Configuration — all tunable AI values extracted from ai.ts and entities.ts
// Production code reads via getAIConfig(); DevLab writes via setAIConfig()

export type HarvesterConfig = {
  escapeAccel: number;
  towLength: number;
  escapeMargin: number;
  fleeAccel: number;
  pursuitAccel: number;
  rotationSmoothing: number;
  fuelGrabDistance: number;
  fleeTimer: number;
  ignoreFuel: boolean;
};

export type SprinterConfig = {
  detectionRange: number;
  turretTrackingRange: number;
  searchSpeedMult: number;
  turretRotationTracking: number;
  turretRotationLeading: number;
  bodyRotationSpeed: number;
  thrust: number;
  flankDistThreshold: number;
  flankOffsetAngle: number;
  sweepSpeed: number;
  sweepAmplitude: number;
  patrolDistFromCenter: number;
  patrolRadius: number;
  patrolOrbitSpeed: number;
  searchRotation: number;
  searchThrust: number;
  shootCooldownMin: number;
  shootCooldownRange: number;
  disableShooting: boolean;
};

export type ExterminatorConfig = {
  wanderAccel: number;
  idleSpeedMult: number;
  flankOffset: number;
  flankFadeDistance: number;
  rotationSpeed: number;
  acceleration: number;
  sidewaysFriction: number;
  forwardFriction: number;
  disableFlanking: boolean;
};

export type AIConfig = {
  separationForce: number;
  separationDistance: number;
  playerMaxSpeed: number;
  playerShootCooldown: number;
  harvester: HarvesterConfig;
  sprinter: SprinterConfig;
  exterminator: ExterminatorConfig;
};

export const DEFAULT_AI_CONFIG: Readonly<AIConfig> = Object.freeze({
  separationForce: 0.1,
  separationDistance: 40,
  playerMaxSpeed: 6,
  playerShootCooldown: 10,

  harvester: Object.freeze({
    escapeAccel: 0.07,
    towLength: 35,
    escapeMargin: 100,
    fleeAccel: 0.08,
    pursuitAccel: 0.08,
    rotationSmoothing: 0.1,
    fuelGrabDistance: 30,
    fleeTimer: 120,
    ignoreFuel: false,
  }),

  sprinter: Object.freeze({
    detectionRange: 500,
    turretTrackingRange: 400,
    searchSpeedMult: 0.6,
    turretRotationTracking: 0.15,
    turretRotationLeading: 0.08,
    bodyRotationSpeed: 0.05,
    thrust: 0.08,
    flankDistThreshold: 200,
    flankOffsetAngle: Math.PI / 4,
    sweepSpeed: 0.02,
    sweepAmplitude: Math.PI / 3,
    patrolDistFromCenter: 300,
    patrolRadius: 150,
    patrolOrbitSpeed: 0.005,
    searchRotation: 0.03,
    searchThrust: 0.05,
    shootCooldownMin: 100,
    shootCooldownRange: 80,
    disableShooting: false,
  }),

  exterminator: Object.freeze({
    wanderAccel: 0.2,
    idleSpeedMult: 0.5,
    flankOffset: 0.6,
    flankFadeDistance: 150,
    rotationSpeed: 0.1,
    acceleration: 0.12,
    sidewaysFriction: 0.5,
    forwardFriction: 0.98,
    disableFlanking: false,
  }),
});

// Module-level mutable config — deep clone of defaults
let activeConfig: AIConfig = deepClone(DEFAULT_AI_CONFIG);

function deepClone(cfg: Readonly<AIConfig>): AIConfig {
  return {
    ...cfg,
    harvester: { ...cfg.harvester },
    sprinter: { ...cfg.sprinter },
    exterminator: { ...cfg.exterminator },
  };
}

export function getAIConfig(): AIConfig {
  return activeConfig;
}

export function setAIConfig(cfg: AIConfig): void {
  activeConfig = cfg;
}

export function resetAIConfig(): void {
  activeConfig = deepClone(DEFAULT_AI_CONFIG);
}
