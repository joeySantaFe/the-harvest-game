import { RipOffPlayer, RipOffEnemy, RipOffBullet, RipOffFuel, RipOffPowerUp } from '../../types';

// Screen wrapping with buffer
const WRAP_BUFFER = 80;

export function wrapEntity(
  entity: { x: number; y: number },
  width: number,
  height: number
): void {
  if (entity.x < -WRAP_BUFFER) entity.x = width + WRAP_BUFFER;
  if (entity.x > width + WRAP_BUFFER) entity.x = -WRAP_BUFFER;
  if (entity.y < -WRAP_BUFFER) entity.y = height + WRAP_BUFFER;
  if (entity.y > height + WRAP_BUFFER) entity.y = -WRAP_BUFFER;
}

// Circle collision detection
export function checkCircleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}

// Collision radii
export const COLLISION_RADII = {
  player: 14,       // Wider tank body
  harvester: 15,
  sprinter: 15,
  exterminator: 11,  // Smaller buggy
  bullet: 3,
  fuel: 15,
  powerup: 12
};

// Check player vs bullet collision
export function checkPlayerBulletCollision(
  player: RipOffPlayer,
  bullet: RipOffBullet
): boolean {
  if (player.dead || bullet.dead || player.shielded) return false;
  if (bullet.ownerId === player.id) return false; // Can't hit own bullets

  return checkCircleCollision(
    player.x,
    player.y,
    COLLISION_RADII.player,
    bullet.x,
    bullet.y,
    COLLISION_RADII.bullet
  );
}

// Check enemy vs bullet collision
export function checkEnemyBulletCollision(
  enemy: RipOffEnemy,
  bullet: RipOffBullet
): boolean {
  if (enemy.dead || bullet.dead) return false;
  if (bullet.ownerId === 'enemy') return false; // Enemy bullets don't hit enemies

  const enemyRadius = COLLISION_RADII[enemy.type] || COLLISION_RADII.harvester;

  return checkCircleCollision(
    enemy.x,
    enemy.y,
    enemyRadius,
    bullet.x,
    bullet.y,
    COLLISION_RADII.bullet
  );
}

// Check player vs enemy collision
export function checkPlayerEnemyCollision(
  player: RipOffPlayer,
  enemy: RipOffEnemy
): boolean {
  if (player.dead || enemy.dead) return false;

  const enemyRadius = COLLISION_RADII[enemy.type] || COLLISION_RADII.harvester;

  return checkCircleCollision(
    player.x,
    player.y,
    COLLISION_RADII.player,
    enemy.x,
    enemy.y,
    enemyRadius
  );
}

// Check player vs powerup collision
export function checkPlayerPowerUpCollision(
  player: RipOffPlayer,
  powerup: RipOffPowerUp
): boolean {
  if (player.dead || powerup.dead) return false;

  return checkCircleCollision(
    player.x,
    player.y,
    COLLISION_RADII.player,
    powerup.x,
    powerup.y,
    COLLISION_RADII.powerup
  );
}

// Check player vs fuel collision (for pushing with shield)
export function checkPlayerFuelCollision(
  player: RipOffPlayer,
  fuel: RipOffFuel
): boolean {
  if (player.dead || fuel.dead || !player.shielded) return false;

  return checkCircleCollision(
    player.x,
    player.y,
    COLLISION_RADII.player,
    fuel.x,
    fuel.y,
    COLLISION_RADII.fuel
  );
}

// Check enemy vs fuel collision (for harvester capture)
export function checkEnemyFuelCollision(
  enemy: RipOffEnemy,
  fuel: RipOffFuel
): boolean {
  if (enemy.dead || fuel.dead) return false;
  if (enemy.type !== 'harvester') return false;

  return checkCircleCollision(
    enemy.x,
    enemy.y,
    COLLISION_RADII.harvester,
    fuel.x,
    fuel.y,
    COLLISION_RADII.fuel
  );
}

// Push fuel away from player (when shielded)
export function pushFuel(player: RipOffPlayer, fuel: RipOffFuel): void {
  const dx = fuel.x - player.x;
  const dy = fuel.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // Transfer player momentum + push force
  const pushForce = 2;
  fuel.vx = player.vx + nx * pushForce;
  fuel.vy = player.vy + ny * pushForce;
}

// Enemy drag fuel toward center
export function dragFuel(enemy: RipOffEnemy, fuel: RipOffFuel, centerX: number, centerY: number): void {
  if (enemy.type !== 'harvester') return;

  // Direction toward center
  const dx = centerX - fuel.x;
  const dy = centerY - fuel.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // Pull fuel toward center at harvester speed
  const dragSpeed = 1.5;
  fuel.vx = nx * dragSpeed;
  fuel.vy = ny * dragSpeed;
  fuel.beingDragged = true;
}

// Calculate angle between two points
export function angleTo(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Calculate distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Get nearest target position (accounting for screen wrapping)
export function getNearestWrappedPosition(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number,
  height: number
): { x: number; y: number } {
  // Check all wrapped positions and return the nearest one
  const positions = [
    { x: toX, y: toY },
    { x: toX - width, y: toY },
    { x: toX + width, y: toY },
    { x: toX, y: toY - height },
    { x: toX, y: toY + height },
    { x: toX - width, y: toY - height },
    { x: toX + width, y: toY - height },
    { x: toX - width, y: toY + height },
    { x: toX + width, y: toY + height }
  ];

  let nearest = positions[0];
  let minDist = distance(fromX, fromY, nearest.x, nearest.y);

  for (const pos of positions) {
    const d = distance(fromX, fromY, pos.x, pos.y);
    if (d < minDist) {
      minDist = d;
      nearest = pos;
    }
  }

  return nearest;
}

// Shared tank physics: forward momentum preserved, sideways friction applied
export function applyTankPhysics(
  entity: { vx: number; vy: number; angle: number },
  maxSpeed: number,
  sidewaysFriction: number = 0.3,
  forwardFriction: number = 0.98
): void {
  // Project velocity onto facing direction and perpendicular
  const facingX = Math.cos(entity.angle);
  const facingY = Math.sin(entity.angle);
  const forwardSpeed = entity.vx * facingX + entity.vy * facingY;
  const sideSpeed = entity.vx * (-facingY) + entity.vy * facingX;

  // Keep most forward momentum, kill most sideways momentum
  const newForward = forwardSpeed * forwardFriction;
  const newSide = sideSpeed * sidewaysFriction;

  entity.vx = newForward * facingX + newSide * (-facingY);
  entity.vy = newForward * facingY + newSide * facingX;

  // Speed cap
  const currentSpeed = Math.sqrt(entity.vx * entity.vx + entity.vy * entity.vy);
  if (currentSpeed > maxSpeed) {
    entity.vx = (entity.vx / currentSpeed) * maxSpeed;
    entity.vy = (entity.vy / currentSpeed) * maxSpeed;
  }
}
