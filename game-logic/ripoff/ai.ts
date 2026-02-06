import { RipOffEnemy, RipOffPlayer, RipOffFuel } from '../../types';
import { ENEMY_SPEEDS, ENEMY_CARRY_SPEED, KITING_THRESHOLD, TACTICAL_TIMEOUT } from '../../constants';
import { angleTo, distance, getNearestWrappedPosition, applyTankPhysics } from './physics';

let kitingCounter = 0;
let tacticalMode = false;

export function resetAIState() {
  kitingCounter = 0;
  tacticalMode = false;
}

// Update AI behavior for an enemy
export function updateEnemyAI(
  enemy: RipOffEnemy,
  players: RipOffPlayer[],
  fuels: RipOffFuel[],
  width: number,
  height: number,
  allEnemies?: RipOffEnemy[]
): void {
  if (enemy.dead) return;

  // Apply speedMod (v28: 1.0 for waves 1-3, 1.1 for wave 4+)
  const speed = ENEMY_SPEEDS[enemy.type] * enemy.speedMod;

  switch (enemy.type) {
    case 'harvester':
      updateHarvesterAI(enemy, players, fuels, speed, width, height);
      break;
    case 'sprinter':
      updateSprinterAI(enemy, players, speed, width, height);
      break;
    case 'exterminator':
      updateExterminatorAI(enemy, players, speed, width, height);
      break;
  }

  // Enemy separation - push away from other enemies
  if (allEnemies) {
    for (const other of allEnemies) {
      if (other === enemy || other.dead) continue;
      const dist = distance(enemy.x, enemy.y, other.x, other.y);
      if (dist < 40 && dist > 0) {
        const pushAngle = angleTo(other.x, other.y, enemy.x, enemy.y);
        enemy.vx += Math.cos(pushAngle) * 0.1;
        enemy.vy += Math.sin(pushAngle) * 0.1;
      }
    }
  }
}

// HARVESTER AI: Seeks fuel, drags AWAY from center (off screen), flees when shot at
function updateHarvesterAI(
  enemy: RipOffEnemy,
  players: RipOffPlayer[],
  fuels: RipOffFuel[],
  speed: number,
  width: number,
  height: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;

  // If dragging fuel, move AWAY from center (toward edge)
  if (enemy.dragTarget !== null && fuels[enemy.dragTarget] && !fuels[enemy.dragTarget].dead) {
    const fuel = fuels[enemy.dragTarget];

    // Angle from center to enemy + PI = away from center
    const escapeAngle = Math.atan2(centerY - enemy.y, centerX - enemy.x) + Math.PI;
    enemy.angle = escapeAngle;
    enemy.vx += Math.cos(escapeAngle) * 0.07;
    enemy.vy += Math.sin(escapeAngle) * 0.07;

    // Speed cap when carrying (v28: 1.5)
    const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
    if (currentSpeed > ENEMY_CARRY_SPEED) {
      enemy.vx = (enemy.vx / currentSpeed) * ENEMY_CARRY_SPEED;
      enemy.vy = (enemy.vy / currentSpeed) * ENEMY_CARRY_SPEED;
    }

    // Position fuel behind enemy (tow line effect)
    const hitchX = enemy.x - Math.cos(enemy.angle) * 20;
    const hitchY = enemy.y - Math.sin(enemy.angle) * 20;
    const towAngle = Math.atan2(hitchY - fuel.y, hitchX - fuel.x);
    fuel.x = hitchX - Math.cos(towAngle) * 35;
    fuel.y = hitchY - Math.sin(towAngle) * 35;
    fuel.vx = 0;
    fuel.vy = 0;
    fuel.beingDragged = true;

    // Check if escaped off screen
    if (enemy.x < -100 || enemy.x > width + 100 || enemy.y < -100 || enemy.y > height + 100) {
      enemy.dead = true;
      fuel.dead = true; // Fuel is captured!
    }
    return;
  }

  // State machine
  if (enemy.aiState === 'flee') {
    // Flee from nearest player
    const nearestPlayer = findNearestAlivePlayer(enemy, players, width, height);
    if (nearestPlayer) {
      // Move away from player
      enemy.angle = angleTo(enemy.x, enemy.y, nearestPlayer.x, nearestPlayer.y) + Math.PI;
      enemy.vx += Math.cos(enemy.angle) * 0.08;
      enemy.vy += Math.sin(enemy.angle) * 0.08;
    }

    // Speed cap
    const maxSpeed = speed;
    const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
    if (currentSpeed > maxSpeed) {
      enemy.vx = (enemy.vx / currentSpeed) * maxSpeed;
      enemy.vy = (enemy.vy / currentSpeed) * maxSpeed;
    }

    // Return to pursuit after timeout
    if (enemy.stateTimer <= 0) {
      enemy.aiState = 'pursuit';
      enemy.dragTarget = null;
    }
  } else {
    // Pursuit: Seek nearest fuel
    const nearestFuel = findNearestFuel(enemy, fuels, width, height);
    if (nearestFuel) {
      const fuelIndex = fuels.indexOf(nearestFuel);
      const targetAngle = angleTo(enemy.x, enemy.y, nearestFuel.x, nearestFuel.y);

      // Smooth rotation toward target
      let angleDiff = targetAngle - enemy.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      enemy.angle += angleDiff * 0.1;

      enemy.vx += Math.cos(enemy.angle) * 0.08;
      enemy.vy += Math.sin(enemy.angle) * 0.08;
      enemy.targetId = fuelIndex;

      // Apply tank physics (no sideways drift)
      applyTankPhysics(enemy, speed);

      // Check if close enough to grab fuel
      const dist = distance(enemy.x, enemy.y, nearestFuel.x, nearestFuel.y);
      if (dist < 30) {
        enemy.dragTarget = fuelIndex;
        nearestFuel.beingDragged = true;
        nearestFuel.draggedBy = fuelIndex;
      }
    } else {
      // No fuel left, become a hunter
      enemy.type = 'exterminator';
    }
  }
}

// SPRINTER AI: Tank-like movement with independent turret tracking
// Tank body rotates toward target, moves forward only (no sideways drift)
// Turret independently tracks player when within range
// When no target, enters search mode with sweeping turret
const TURRET_TRACKING_RANGE = 400; // Turret starts tracking at this distance
const DETECTION_RANGE = 500; // Range at which sprinter detects and pursues player
const SEARCH_SPEED_MULT = 0.6; // Slower movement while searching

function updateSprinterAI(
  enemy: RipOffEnemy,
  players: RipOffPlayer[],
  speed: number,
  width: number,
  height: number
): void {
  // Find nearest alive player
  let targetPlayer: RipOffPlayer | null = null;
  let minDist = Infinity;

  for (const player of players) {
    if (player.dead || player.respawnTimer > 0) continue;
    const dist = distance(enemy.x, enemy.y, player.x, player.y);
    if (dist < minDist) {
      minDist = dist;
      targetPlayer = player;
    }
  }

  // Determine if player is detected (within detection range)
  const playerDetected = targetPlayer !== null && minDist <= DETECTION_RANGE;

  // Track if turret should be tracking (closer range than detection)
  enemy.isTracking = targetPlayer !== null && minDist <= TURRET_TRACKING_RANGE;

  // AI State management: searching vs pursuit
  if (!playerDetected) {
    // SEARCH MODE: No target detected, hunt for players
    updateSprinterSearchMode(enemy, speed, width, height);
    return;
  }

  // PURSUIT MODE: Target detected, engage!
  // Switch to pursuit state if was searching
  if (enemy.aiState !== 'pursuit') {
    enemy.aiState = 'pursuit';
  }

  // Turret tracking - smoothly rotate turret toward player when in range
  if (enemy.isTracking && targetPlayer) {
    const turretTargetAngle = angleTo(enemy.x, enemy.y, targetPlayer.x, targetPlayer.y);
    let turretDiff = turretTargetAngle - enemy.turretAngle;
    while (turretDiff > Math.PI) turretDiff -= Math.PI * 2;
    while (turretDiff < -Math.PI) turretDiff += Math.PI * 2;
    enemy.turretAngle += turretDiff * 0.15; // Turret rotates faster than body
  } else {
    // Not in tracking range but detected - turret leads toward target
    const turretTargetAngle = angleTo(enemy.x, enemy.y, targetPlayer!.x, targetPlayer!.y);
    let turretDiff = turretTargetAngle - enemy.turretAngle;
    while (turretDiff > Math.PI) turretDiff -= Math.PI * 2;
    while (turretDiff < -Math.PI) turretDiff += Math.PI * 2;
    enemy.turretAngle += turretDiff * 0.08; // Slower tracking when not locked
  }

  // Calculate target angle for body
  let bodyTargetAngle = angleTo(enemy.x, enemy.y, targetPlayer!.x, targetPlayer!.y);

  // In tactical mode, try to flank
  if (tacticalMode) {
    const flankOffset = enemy.spawnId % 2 === 0 ? Math.PI / 4 : -Math.PI / 4;
    if (minDist > 200) {
      bodyTargetAngle += flankOffset;
    }
  }

  // Smoothly rotate tank body toward target
  let bodyDiff = bodyTargetAngle - enemy.angle;
  while (bodyDiff > Math.PI) bodyDiff -= Math.PI * 2;
  while (bodyDiff < -Math.PI) bodyDiff += Math.PI * 2;
  enemy.angle += bodyDiff * 0.05; // Tank body rotates slower

  // Tank-like movement: only move forward in facing direction
  // Apply thrust in facing direction
  const thrust = 0.08;
  enemy.vx += Math.cos(enemy.angle) * thrust;
  enemy.vy += Math.sin(enemy.angle) * thrust;

  // Apply tank physics (friction on sideways movement)
  applyTankPhysics(enemy, speed);
}

// Sprinter search mode: patrol and sweep turret looking for players
function updateSprinterSearchMode(
  enemy: RipOffEnemy,
  speed: number,
  width: number,
  height: number
): void {
  // Set searching state
  if (enemy.aiState !== 'tactical') {
    enemy.aiState = 'tactical'; // Use 'tactical' state for searching
    enemy.stateTimer = 0;
  }

  // Increment state timer for sweep animation
  enemy.stateTimer++;

  // Turret SWEEP: Oscillate left and right while searching
  // Sweep period of ~3 seconds (180 frames at 60fps)
  const sweepSpeed = 0.02;
  const sweepAngle = Math.sin(enemy.stateTimer * sweepSpeed) * (Math.PI / 3); // ±60 degrees
  enemy.turretAngle = enemy.angle + sweepAngle;

  // PATROL MOVEMENT: Move toward center of arena, then patrol
  const centerX = width / 2;
  const centerY = height / 2;
  const distToCenter = distance(enemy.x, enemy.y, centerX, centerY);

  let bodyTargetAngle: number;

  if (distToCenter > 300) {
    // Far from center - move toward center
    bodyTargetAngle = angleTo(enemy.x, enemy.y, centerX, centerY);
  } else {
    // Near center - patrol in a circular pattern
    // Use stateTimer to create a slow circular patrol
    const patrolRadius = 150;
    const patrolSpeed = 0.005;
    const patrolX = centerX + Math.cos(enemy.stateTimer * patrolSpeed + enemy.spawnId) * patrolRadius;
    const patrolY = centerY + Math.sin(enemy.stateTimer * patrolSpeed + enemy.spawnId) * patrolRadius;
    bodyTargetAngle = angleTo(enemy.x, enemy.y, patrolX, patrolY);
  }

  // Smoothly rotate tank body toward patrol target
  let bodyDiff = bodyTargetAngle - enemy.angle;
  while (bodyDiff > Math.PI) bodyDiff -= Math.PI * 2;
  while (bodyDiff < -Math.PI) bodyDiff += Math.PI * 2;
  enemy.angle += bodyDiff * 0.03; // Slower rotation while searching

  // Move forward at reduced speed while searching
  const thrust = 0.05;
  enemy.vx += Math.cos(enemy.angle) * thrust;
  enemy.vy += Math.sin(enemy.angle) * thrust;

  // Apply tank physics with reduced max speed
  applyTankPhysics(enemy, speed * SEARCH_SPEED_MULT);
}

// EXTERMINATOR AI: Rams players, uses kamikaze tactics (fast buggy)
// Matches v28 "hunter" behavior - instant angle, acceleration-based, flanking based on spawnId
function updateExterminatorAI(
  enemy: RipOffEnemy,
  players: RipOffPlayer[],
  speed: number,
  width: number,
  height: number
): void {
  const nearestPlayer = findNearestAlivePlayer(enemy, players, width, height);
  if (!nearestPlayer) {
    // No valid target, wander randomly (v28 style)
    enemy.vx += (Math.random() - 0.5) * 0.2;
    enemy.vy += (Math.random() - 0.5) * 0.2;

    // Speed cap when idle
    const currentSpeed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
    if (currentSpeed > speed * 0.5) {
      enemy.vx = (enemy.vx / currentSpeed) * speed * 0.5;
      enemy.vy = (enemy.vy / currentSpeed) * speed * 0.5;
    }
    return;
  }

  const targetPos = getNearestWrappedPosition(
    enemy.x,
    enemy.y,
    nearestPlayer.x,
    nearestPlayer.y,
    width,
    height
  );

  let targetAngle = angleTo(enemy.x, enemy.y, targetPos.x, targetPos.y);

  // ADAPTIVE AI: FLANKING (v28 style)
  // In tactical mode, alternate left/right flanking based on spawnId (even = left, odd = right)
  if (tacticalMode) {
    const flankOffset = enemy.spawnId % 2 === 0 ? 0.6 : -0.6;
    const dist = distance(enemy.x, enemy.y, targetPos.x, targetPos.y);

    // Fade offset as we get closer (commit to ram at <150px)
    if (dist > 150) {
      targetAngle += flankOffset;
    }
  }

  // Smooth rotation toward target (buggy turns fast but not instant)
  let angleDiff = targetAngle - enemy.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  enemy.angle += angleDiff * 0.1; // Fast rotation rate for aggressive buggy

  // Accelerate toward target
  const accel = 0.12;
  enemy.vx += Math.cos(enemy.angle) * accel;
  enemy.vy += Math.sin(enemy.angle) * accel;

  // Apply tank physics with lighter sideways friction (buggy drifts slightly)
  applyTankPhysics(enemy, speed, 0.5, 0.98);
}

// Helper: Find nearest alive player
function findNearestAlivePlayer(
  enemy: RipOffEnemy,
  players: RipOffPlayer[],
  width: number,
  height: number
): RipOffPlayer | null {
  let nearest: RipOffPlayer | null = null;
  let minDist = Infinity;

  for (const player of players) {
    if (player.dead) continue;

    const targetPos = getNearestWrappedPosition(
      enemy.x,
      enemy.y,
      player.x,
      player.y,
      width,
      height
    );
    const dist = distance(enemy.x, enemy.y, targetPos.x, targetPos.y);

    if (dist < minDist) {
      minDist = dist;
      nearest = player;
    }
  }

  return nearest;
}

// Helper: Find nearest fuel
function findNearestFuel(
  enemy: RipOffEnemy,
  fuels: RipOffFuel[],
  width: number,
  height: number
): RipOffFuel | null {
  let nearest: RipOffFuel | null = null;
  let minDist = Infinity;

  for (const fuel of fuels) {
    if (fuel.dead || fuel.beingDragged) continue;

    const targetPos = getNearestWrappedPosition(
      enemy.x,
      enemy.y,
      fuel.x,
      fuel.y,
      width,
      height
    );
    const dist = distance(enemy.x, enemy.y, targetPos.x, targetPos.y);

    if (dist < minDist) {
      minDist = dist;
      nearest = fuel;
    }
  }

  return nearest;
}

// Detect kiting behavior (player retreating while firing)
export function detectKiting(players: RipOffPlayer[], enemies: RipOffEnemy[]): void {
  let isRetreating = false;

  for (const player of players) {
    if (player.dead) continue;

    // Check if player is moving away from enemies
    for (const enemy of enemies) {
      if (enemy.dead) continue;

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If player velocity is in same direction as vector from enemy
      const dot = player.vx * dx + player.vy * dy;
      if (dot > 0 && dist > 150) {
        isRetreating = true;
        break;
      }
    }

    if (isRetreating) break;
  }

  if (isRetreating) {
    kitingCounter++;
    if (kitingCounter > KITING_THRESHOLD) {
      tacticalMode = true;
    }
  } else {
    kitingCounter = Math.max(0, kitingCounter - 2);
    if (kitingCounter === 0) {
      tacticalMode = false;
    }
  }
}

// When harvester is hit, switch to flee mode
export function onHarvesterHit(enemy: RipOffEnemy): void {
  if (enemy.type !== 'harvester') return;

  enemy.aiState = 'flee';
  enemy.stateTimer = 120; // Flee for 2 seconds
  enemy.dragTarget = null;
}
