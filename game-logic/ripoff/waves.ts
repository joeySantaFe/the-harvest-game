import { EnemyType } from '../../types';

export type WaveRound = {
  harvester: number;
  sprinter: number;
  exterminator: number;
};

export type WaveConfig = WaveRound[];

// Predefined waves 1-3, each with 4 rounds (matching v28 WAVE_CONFIG)
const WAVE_CONFIGS: WaveConfig[] = [
  // Wave 1: Only harvesters (v28: basic only)
  [
    { harvester: 1, sprinter: 0, exterminator: 0 },
    { harvester: 1, sprinter: 0, exterminator: 0 },
    { harvester: 2, sprinter: 0, exterminator: 0 },
    { harvester: 2, sprinter: 0, exterminator: 0 }
  ],
  // Wave 2: Harvesters + Exterminators (v28: basic + hunter, NO dash yet)
  [
    { harvester: 2, sprinter: 0, exterminator: 1 },
    { harvester: 2, sprinter: 0, exterminator: 1 },
    { harvester: 3, sprinter: 0, exterminator: 1 },
    { harvester: 3, sprinter: 0, exterminator: 1 }
  ],
  // Wave 3: All three types (v28: basic + hunter, then dash joins)
  [
    { harvester: 3, sprinter: 0, exterminator: 1 },
    { harvester: 2, sprinter: 1, exterminator: 1 },
    { harvester: 3, sprinter: 1, exterminator: 2 },
    { harvester: 2, sprinter: 2, exterminator: 2 }
  ]
];

// Generate procedural wave for wave 4+
function generateProceduralWave(wave: number, playerCount: number): WaveConfig {
  const rounds: WaveRound[] = [];

  for (let round = 0; round < 4; round++) {
    const baseHarvester = 2 + Math.floor((wave - 3) / 2);
    const baseSprinter = 1 + Math.floor((wave - 3) / 3);
    const baseExterminator = Math.floor((wave - 3) / 2);

    // Increase difficulty per round within wave
    const roundMultiplier = 1 + round * 0.25;

    let harvester = Math.floor(baseHarvester * roundMultiplier);
    let sprinter = Math.floor(baseSprinter * roundMultiplier);
    let exterminator = Math.floor(baseExterminator * roundMultiplier);

    // Co-op scaling: 1.5x enemies for 2 players
    if (playerCount === 2) {
      harvester = Math.floor(harvester * 1.5);
      sprinter = Math.floor(sprinter * 1.5);
      exterminator = Math.floor(exterminator * 1.5);
    }

    rounds.push({ harvester, sprinter, exterminator });
  }

  return rounds;
}

// Get wave configuration for a given wave number
export function getWaveConfig(wave: number, playerCount: number): WaveConfig {
  if (wave <= 3) {
    const config = WAVE_CONFIGS[wave - 1];

    // Apply co-op scaling to predefined waves
    if (playerCount === 2) {
      return config.map(round => ({
        harvester: Math.floor(round.harvester * 1.5),
        sprinter: Math.floor(round.sprinter * 1.5),
        exterminator: Math.floor(round.exterminator * 1.5)
      }));
    }

    return config;
  }

  return generateProceduralWave(wave, playerCount);
}

// Get total number of rounds in a wave
export function getRoundsPerWave(): number {
  return 4;
}

// Generate enemy spawn positions around screen edges (INSIDE visible area)
export function generateSpawnPositions(count: number, width: number, height: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const edges = ['top', 'bottom', 'left', 'right'];
  const margin = 30; // Spawn just inside the visible screen

  for (let i = 0; i < count; i++) {
    const edge = edges[Math.floor(Math.random() * edges.length)];
    let x = 0, y = 0;

    switch (edge) {
      case 'top':
        x = margin + Math.random() * (width - margin * 2);
        y = margin;
        break;
      case 'bottom':
        x = margin + Math.random() * (width - margin * 2);
        y = height - margin;
        break;
      case 'left':
        x = margin;
        y = margin + Math.random() * (height - margin * 2);
        break;
      case 'right':
        x = width - margin;
        y = margin + Math.random() * (height - margin * 2);
        break;
    }

    positions.push({ x, y });
  }

  return positions;
}

export type EnemySpawnInfo = {
  type: EnemyType;
  spawnId: number;
  speedMod: number;
};

// Create enemy queue for a round (v28 style with spawnId and speedMod)
export function createEnemyQueue(round: WaveRound, wave: number = 1): EnemySpawnInfo[] {
  const queue: EnemySpawnInfo[] = [];
  let id = 0;

  // v28: speed modifier is 1.0 for waves 1-3, then scales up for wave 4+
  const speedMod = wave > 3 ? 1.0 + (wave - 3) * 0.1 : 1.0;

  for (let i = 0; i < round.harvester; i++) {
    queue.push({ type: 'harvester', spawnId: id++, speedMod });
  }
  for (let i = 0; i < round.sprinter; i++) {
    queue.push({ type: 'sprinter', spawnId: id++, speedMod });
  }
  for (let i = 0; i < round.exterminator; i++) {
    queue.push({ type: 'exterminator', spawnId: id++, speedMod });
  }

  // Shuffle the queue for variety
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

// Get total enemies in a wave
export function getTotalEnemiesInWave(config: WaveConfig): number {
  return config.reduce((total, round) => {
    return total + round.harvester + round.sprinter + round.exterminator;
  }, 0);
}

// Check if wave is complete (all rounds done)
export function isWaveComplete(currentRound: number): boolean {
  return currentRound >= getRoundsPerWave();
}
