import { TerrainSegment, CaveZone } from '../../types';
import { WORLD_WIDTH } from '../../constants';

// Cave configuration
const CAVE_COUNT = 2;
const CAVE_WIDTH_MIN = 600;
const CAVE_WIDTH_MAX = 1000;
const CAVE_PASSAGE_MIN = 150;  // narrowest vertical gap in pixels
const CAVE_PASSAGE_MAX = 250;
const CAVE_ENTRY_FUNNEL = 200; // horizontal width of entry/exit narrowing

/**
 * Generate terrain segments and cave zones for the lander level.
 * Pure function — returns new arrays each call.
 */
export function generateTerrain(screenHeight: number): { terrain: TerrainSegment[]; caves: CaveZone[] } {
  const segments: TerrainSegment[] = [];
  const caves: CaveZone[] = [];

  // Config for the "Journey"
  const fuelDepotCount = 7;
  const playableWidth = WORLD_WIDTH - 600;
  const segmentWidth = playableWidth / (fuelDepotCount + 1);

  // Place caves at roughly 35% and 70% of the world
  const cavePositions = [WORLD_WIDTH * 0.35, WORLD_WIDTH * 0.70];

  let currentX = 0;
  let currentY = screenHeight * 0.6;

  // Start pad
  segments.push({
    x1: currentX, y1: currentY,
    x2: currentX + 300, y2: currentY,
    multiplier: 0, isPad: false, padType: 'start'
  });
  currentX += 300;

  let nextFeatureX = currentX + segmentWidth;
  let padsPlaced = 0;
  let cavesPlaced = 0;

  while (currentX < WORLD_WIDTH - 400) {
    // Check if we should place a cave here
    if (cavesPlaced < CAVE_COUNT && currentX > cavePositions[cavesPlaced] - 100 && currentX < cavePositions[cavesPlaced] + 100) {
      const cave = generateCave(currentX, currentY, screenHeight);
      caves.push(cave);

      // Add the cave's floor segments to the main terrain
      for (const seg of cave.floorSegments) {
        segments.push(seg);
      }

      currentX = cave.endX;
      // Set currentY to match where the cave exit leaves us
      const lastFloor = cave.floorSegments[cave.floorSegments.length - 1];
      currentY = lastFloor.y2;
      cavesPlaced++;
      continue;
    }

    if (currentX > nextFeatureX && padsPlaced < fuelDepotCount) {
      // Progress factor: 0 at start, 1 at end — drives difficulty scaling
      const progress = currentX / WORLD_WIDTH;

      // Later pads are narrower and higher multiplier
      const r = Math.random();
      let padWidth: number;
      let multiplier: number;

      if (progress < 0.3) {
        // Early: generous pads
        if (r > 0.7) { multiplier = 3; padWidth = 140; }
        else { multiplier = 2; padWidth = 180; }
      } else if (progress < 0.6) {
        // Mid: moderate pads
        if (r > 0.6) { multiplier = 5; padWidth = 100; }
        else if (r > 0.3) { multiplier = 3; padWidth = 140; }
        else { multiplier = 2; padWidth = 160; }
      } else {
        // Late: tighter pads, higher reward
        if (r > 0.5) { multiplier = 5; padWidth = 100; }
        else { multiplier = 3; padWidth = 120; }
      }

      // Later depots have less fuel, forcing careful management
      const baseCapacity = progress < 0.4 ? 500 : (progress < 0.7 ? 400 : 300);
      const capacity = baseCapacity + Math.floor(Math.random() * 300);

      segments.push({
        x1: currentX, y1: currentY,
        x2: currentX + padWidth, y2: currentY,
        multiplier: multiplier,
        isPad: true,
        padType: 'fuel',
        fuelMax: capacity,
        fuelCurrent: capacity,
        tankSide: Math.random() > 0.5 ? 'left' : 'right'
      });
      currentX += padWidth;
      nextFeatureX += segmentWidth;
      padsPlaced++;
    } else {
      // Progressive terrain roughness: later sections are more jagged
      const progress = currentX / WORLD_WIDTH;
      const roughness = 1 + progress * 0.8; // 1.0 early → 1.8 late

      const steps = Math.floor(Math.random() * 4) + 2;
      for (let i = 0; i < steps; i++) {
        if (currentX > nextFeatureX && padsPlaced < fuelDepotCount) break;
        if (currentX >= WORLD_WIDTH - 400) break;

        const dx = 30 + Math.random() * 80;
        const nextX = Math.min(WORLD_WIDTH - 400, currentX + dx);
        let dy = (Math.random() - 0.5) * 250 * roughness;
        if (currentY < screenHeight * 0.2) dy += 80;
        if (currentY > screenHeight * 0.8) dy -= 80;

        let nextY = currentY + dy;
        nextY = Math.max(screenHeight * 0.15, Math.min(screenHeight * 0.9, nextY));

        segments.push({
          x1: currentX, y1: currentY,
          x2: nextX, y2: nextY,
          multiplier: 0, isPad: false
        });
        currentX = nextX;
        currentY = nextY;
      }
    }
  }

  // Final base pad
  const baseY = screenHeight * 0.7;
  segments.push({
    x1: currentX, y1: currentY,
    x2: currentX + 50, y2: baseY,
    multiplier: 0, isPad: false
  });
  currentX += 50;
  segments.push({
    x1: currentX, y1: baseY,
    x2: currentX + 300, y2: baseY,
    multiplier: 10, isPad: true, padType: 'base'
  });
  currentX += 300;
  segments.push({
    x1: currentX, y1: baseY,
    x2: currentX + 100, y2: screenHeight * 0.5,
    multiplier: 0, isPad: false
  });
  currentX += 100;

  // Vertical walls at both ends
  segments.push({
    x1: currentX, y1: screenHeight * 0.5,
    x2: currentX, y2: screenHeight * 2,
    multiplier: 0, isPad: false
  });
  segments.push({
    x1: 0, y1: segments[0].y1,
    x2: 0, y2: screenHeight * 2,
    multiplier: 0, isPad: false
  });

  return { terrain: segments, caves };
}

/**
 * Generate a cave zone with floor segments, ceiling segments, and a fuel pad at the bottom.
 */
function generateCave(startX: number, entryY: number, screenHeight: number): CaveZone & { floorSegments: TerrainSegment[] } {
  const caveWidth = CAVE_WIDTH_MIN + Math.random() * (CAVE_WIDTH_MAX - CAVE_WIDTH_MIN);
  const passageGap = CAVE_PASSAGE_MIN + Math.random() * (CAVE_PASSAGE_MAX - CAVE_PASSAGE_MIN);
  const endX = startX + CAVE_ENTRY_FUNNEL + caveWidth + CAVE_ENTRY_FUNNEL;

  const floorSegments: TerrainSegment[] = [];
  const ceilingSegments: TerrainSegment[] = [];

  // The cave dips down — floor goes lower, ceiling comes down from above
  const caveFloorY = screenHeight * 0.8; // deep floor
  const caveCeilingY = caveFloorY - passageGap; // ceiling above the floor

  let cx = startX;

  // --- ENTRY FUNNEL ---
  // Floor slopes down to cave depth
  floorSegments.push({
    x1: cx, y1: entryY,
    x2: cx + CAVE_ENTRY_FUNNEL, y2: caveFloorY,
    multiplier: 0, isPad: false
  });
  // Ceiling slopes down from above screen to cave ceiling level
  const entryCeilingStart = Math.min(entryY - 200, screenHeight * 0.1);
  ceilingSegments.push({
    x1: cx, y1: entryCeilingStart,
    x2: cx + CAVE_ENTRY_FUNNEL, y2: caveCeilingY,
    multiplier: 0, isPad: false
  });
  cx += CAVE_ENTRY_FUNNEL;

  // --- CAVE INTERIOR ---
  // Generate jagged floor and ceiling through the cave
  const interiorSegCount = 6 + Math.floor(Math.random() * 4);
  const segW = caveWidth / interiorSegCount;

  let floorY = caveFloorY;
  let ceilY = caveCeilingY;

  for (let i = 0; i < interiorSegCount; i++) {
    const nextCx = cx + segW;
    const isMidpoint = (i === Math.floor(interiorSegCount / 2));

    if (isMidpoint) {
      // Place fuel pad at the deepest point
      const padWidth = 100;
      const padX = cx;
      const padY = floorY;

      // Flat floor for the pad
      floorSegments.push({
        x1: padX, y1: padY,
        x2: padX + padWidth, y2: padY,
        multiplier: 8,
        isPad: true,
        padType: 'fuel',
        fuelMax: 1000,
        fuelCurrent: 1000,
        tankSide: Math.random() > 0.5 ? 'left' : 'right'
      });

      // Flat ceiling above the pad (give the player room)
      ceilingSegments.push({
        x1: padX, y1: ceilY,
        x2: padX + padWidth, y2: ceilY,
        multiplier: 0, isPad: false
      });

      // Fill remaining segment width with rough terrain
      if (padWidth < segW) {
        const remainX = padX + padWidth;
        const nextFloorY = floorY + (Math.random() - 0.3) * 30;
        floorSegments.push({
          x1: remainX, y1: padY,
          x2: nextCx, y2: nextFloorY,
          multiplier: 0, isPad: false
        });
        ceilingSegments.push({
          x1: remainX, y1: ceilY,
          x2: nextCx, y2: ceilY + (Math.random() - 0.5) * 20,
          multiplier: 0, isPad: false
        });
        floorY = nextFloorY;
        ceilY = ceilY + (Math.random() - 0.5) * 20;
      }
    } else {
      // Jagged interior — floor and ceiling vary
      let nextFloorY = floorY + (Math.random() - 0.4) * 40;
      let nextCeilY = ceilY + (Math.random() - 0.6) * 40;

      // Ensure minimum gap
      if (nextFloorY - nextCeilY < passageGap * 0.8) {
        nextCeilY = nextFloorY - passageGap * 0.8;
      }

      // Clamp floor to screen bounds
      nextFloorY = Math.min(screenHeight * 0.92, Math.max(screenHeight * 0.5, nextFloorY));
      nextCeilY = Math.max(screenHeight * 0.05, nextCeilY);

      floorSegments.push({
        x1: cx, y1: floorY,
        x2: nextCx, y2: nextFloorY,
        multiplier: 0, isPad: false
      });
      ceilingSegments.push({
        x1: cx, y1: ceilY,
        x2: nextCx, y2: nextCeilY,
        multiplier: 0, isPad: false
      });

      floorY = nextFloorY;
      ceilY = nextCeilY;
    }

    cx = nextCx;
  }

  // --- EXIT FUNNEL ---
  // Floor slopes back up to a reasonable exit height
  const exitY = screenHeight * 0.55 + Math.random() * screenHeight * 0.15;
  floorSegments.push({
    x1: cx, y1: floorY,
    x2: cx + CAVE_ENTRY_FUNNEL, y2: exitY,
    multiplier: 0, isPad: false
  });
  // Ceiling opens back up
  const exitCeilingEnd = Math.min(exitY - 200, screenHeight * 0.1);
  ceilingSegments.push({
    x1: cx, y1: ceilY,
    x2: cx + CAVE_ENTRY_FUNNEL, y2: exitCeilingEnd,
    multiplier: 0, isPad: false
  });

  return {
    startX,
    endX,
    ceilingSegments,
    narrowestGap: passageGap,
    floorSegments
  };
}

/**
 * Get the terrain height and segment at a given x position.
 * Returns y=2000 (far below screen) if no segment found.
 */
export function getTerrainYAt(x: number, terrain: TerrainSegment[]): { y: number; segment: TerrainSegment | null } {
  for (const seg of terrain) {
    if (x >= seg.x1 && x <= seg.x2) {
      const t = (x - seg.x1) / (seg.x2 - seg.x1);
      return { y: seg.y1 + t * (seg.y2 - seg.y1), segment: seg };
    }
  }
  return { y: 2000, segment: null };
}

/**
 * Get the ceiling height at a given x position across all cave zones.
 * Returns null if x is not inside any cave.
 */
export function getCeilingYAt(x: number, caves: CaveZone[]): { y: number; segment: TerrainSegment } | null {
  for (const cave of caves) {
    if (x < cave.startX || x > cave.endX) continue;
    for (const seg of cave.ceilingSegments) {
      if (x >= seg.x1 && x <= seg.x2) {
        const t = (x - seg.x1) / (seg.x2 - seg.x1);
        return { y: seg.y1 + t * (seg.y2 - seg.y1), segment: seg };
      }
    }
  }
  return null;
}

/**
 * Check if an x position is inside any cave zone.
 */
export function isInCave(x: number, caves: CaveZone[]): boolean {
  for (const cave of caves) {
    if (x >= cave.startX && x <= cave.endX) return true;
  }
  return false;
}
