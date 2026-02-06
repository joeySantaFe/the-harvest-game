import {
  RipOffPlayer,
  RipOffEnemy,
  RipOffBullet,
  RipOffFuel,
  RipOffPowerUp,
  RipOffParticle,
  EnemyType,
  Vector
} from '../../types';
import {
  RIPOFF_FRICTION,
  RIPOFF_THRUST,
  RIPOFF_REVERSE_THRUST,
  RIPOFF_ROTATION,
  RIPOFF_BULLET_SPEED,
  RIPOFF_ENEMY_BULLET_SPEED,
  RIPOFF_BULLET_LIFE,
  RIPOFF_ENEMY_BULLET_LIFE,
  RIPOFF_RECOIL,
  ENEMY_SPEEDS,
  ENEMY_COLORS,
  SHIELD_DURATION,
  POWERUP_DESPAWN_TIME,
  TANK_SIDEWAYS_FRICTION,
  TANK_FORWARD_FRICTION
} from '../../constants';
import { wrapEntity, applyTankPhysics } from './physics';

// --- Player Factories ---

export function createPlayer(id: 1 | 2, x: number, y: number): RipOffPlayer {
  return {
    id,
    x,
    y,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // Pointing up
    color: id === 1 ? '#0f0' : '#0af',
    dead: false,
    shielded: false,
    shieldTimer: 0,
    shootCooldown: 0,
    respawnTimer: 0,
    treadOffset: 0
  };
}

export function updatePlayer(
  player: RipOffPlayer,
  input: { thrust: boolean; reverse: boolean; rotation: number; fire: boolean },
  width: number,
  height: number
): void {
  if (player.dead) {
    if (player.respawnTimer > 0) player.respawnTimer--;
    return;
  }

  // Rotation
  if (input.rotation !== 0) {
    player.angle += input.rotation * RIPOFF_ROTATION;
  }

  // Thrust (forward)
  if (input.thrust) {
    player.vx += Math.cos(player.angle) * RIPOFF_THRUST;
    player.vy += Math.sin(player.angle) * RIPOFF_THRUST;
  }

  // Reverse thrust (backward at half speed)
  if (input.reverse) {
    player.vx -= Math.cos(player.angle) * RIPOFF_REVERSE_THRUST;
    player.vy -= Math.sin(player.angle) * RIPOFF_REVERSE_THRUST;
  }

  // Apply tank physics (no sideways drift)
  const maxSpeed = 6; // Player max speed
  applyTankPhysics(player, maxSpeed, TANK_SIDEWAYS_FRICTION, TANK_FORWARD_FRICTION);

  // Update tread offset based on forward speed component
  const facingX = Math.cos(player.angle);
  const facingY = Math.sin(player.angle);
  const forwardSpeed = player.vx * facingX + player.vy * facingY;
  player.treadOffset += forwardSpeed;

  // Update position
  player.x += player.vx;
  player.y += player.vy;

  // Wrap around screen
  wrapEntity(player, width, height);

  // Update cooldowns and timers
  if (player.shootCooldown > 0) player.shootCooldown--;
  if (player.shieldTimer > 0) {
    player.shieldTimer--;
    player.shielded = player.shieldTimer > 0;
  }
}

export function firePlayerBullet(player: RipOffPlayer): RipOffBullet | null {
  if (player.shootCooldown > 0 || player.dead) return null;

  player.shootCooldown = 10; // v28: cooldown=10 frames

  // Apply recoil (v28: 0.5)
  player.vx -= Math.cos(player.angle) * RIPOFF_RECOIL;
  player.vy -= Math.sin(player.angle) * RIPOFF_RECOIL;

  return {
    x: player.x + Math.cos(player.angle) * 22,
    y: player.y + Math.sin(player.angle) * 22,
    vx: player.vx + Math.cos(player.angle) * RIPOFF_BULLET_SPEED,
    vy: player.vy + Math.sin(player.angle) * RIPOFF_BULLET_SPEED,
    ownerId: player.id,
    dead: false,
    life: RIPOFF_BULLET_LIFE
  };
}

// --- Enemy Factories ---

export function createEnemy(
  type: EnemyType,
  x: number,
  y: number,
  spawnId: number = 0,
  speedMod: number = 1.0
): RipOffEnemy {
  const initialAngle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle: initialAngle,
    turretAngle: initialAngle,
    isTracking: false,
    wasTracking: false,
    type,
    color: ENEMY_COLORS[type],
    dead: false,
    aiState: 'pursuit',
    shootCooldown: type === 'sprinter' ? Math.random() * 100 + 120 : 0,
    targetId: null,
    dragTarget: null,
    stateTimer: 0,
    spawnId,
    speedMod,
    treadOffset: 0
  };
}

export function updateEnemy(
  enemy: RipOffEnemy,
  width: number,
  height: number
): void {
  if (enemy.dead) return;

  // Update tread offset based on forward speed
  const facingX = Math.cos(enemy.angle);
  const facingY = Math.sin(enemy.angle);
  const forwardSpeed = enemy.vx * facingX + enemy.vy * facingY;
  enemy.treadOffset += forwardSpeed;

  // Update position
  enemy.x += enemy.vx;
  enemy.y += enemy.vy;

  // Only wrap enemies that are NOT dragging fuel
  // Harvesters dragging fuel should escape off-screen (handled in AI)
  if (enemy.dragTarget === null) {
    wrapEntity(enemy, width, height);
  }

  // Update timers
  if (enemy.shootCooldown > 0) enemy.shootCooldown--;
  if (enemy.stateTimer > 0) enemy.stateTimer--;
}

export function fireEnemyBullet(
  enemy: RipOffEnemy,
  width: number,
  height: number
): RipOffBullet | null {
  if (enemy.type !== 'sprinter' || enemy.shootCooldown > 0 || enemy.dead) return null;

  // Only shoot if actively tracking a player
  if (!enemy.isTracking) return null;

  // Don't shoot if off-screen
  const margin = 50;
  if (enemy.x < -margin || enemy.x > width + margin ||
      enemy.y < -margin || enemy.y > height + margin) {
    return null;
  }

  enemy.shootCooldown = Math.random() * 80 + 100; // 1.7-3 seconds

  // Fire in turret direction (turret is already tracking the player)
  return {
    x: enemy.x + Math.cos(enemy.turretAngle) * 20,
    y: enemy.y + Math.sin(enemy.turretAngle) * 20,
    vx: Math.cos(enemy.turretAngle) * RIPOFF_ENEMY_BULLET_SPEED,
    vy: Math.sin(enemy.turretAngle) * RIPOFF_ENEMY_BULLET_SPEED,
    ownerId: 'enemy',
    dead: false,
    life: RIPOFF_ENEMY_BULLET_LIFE
  };
}

// --- Bullet Updates ---

export function updateBullet(bullet: RipOffBullet, width: number, height: number): void {
  if (bullet.dead) return;

  bullet.x += bullet.vx;
  bullet.y += bullet.vy;
  bullet.life--;

  if (bullet.life <= 0) {
    bullet.dead = true;
  }

  // Wrap bullets around screen
  wrapEntity(bullet, width, height);
}

// --- Fuel Factories ---

export function createFuel(x: number, y: number): RipOffFuel {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    dead: false,
    beingDragged: false,
    draggedBy: null
  };
}

export function updateFuel(fuel: RipOffFuel, width: number, height: number): void {
  if (fuel.dead) return;

  // Apply friction if not being dragged (v28: 0.85)
  if (!fuel.beingDragged) {
    fuel.vx *= 0.85;
    fuel.vy *= 0.85;
    fuel.x += fuel.vx;
    fuel.y += fuel.vy;

    // Clamp fuel to screen bounds so it can't drift off permanently
    const margin = 20;
    if (fuel.x < margin) { fuel.x = margin; fuel.vx = Math.abs(fuel.vx) * 0.5; }
    if (fuel.x > width - margin) { fuel.x = width - margin; fuel.vx = -Math.abs(fuel.vx) * 0.5; }
    if (fuel.y < margin) { fuel.y = margin; fuel.vy = Math.abs(fuel.vy) * 0.5; }
    if (fuel.y > height - margin) { fuel.y = height - margin; fuel.vy = -Math.abs(fuel.vy) * 0.5; }
  }
  // Note: When being dragged, fuel position is controlled by harvester AI
}

// --- PowerUp Factories ---

export function createPowerUp(x: number, y: number): RipOffPowerUp {
  return {
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    type: 'shield',
    dead: false,
    life: POWERUP_DESPAWN_TIME
  };
}

export function updatePowerUp(powerup: RipOffPowerUp, width: number, height: number): void {
  if (powerup.dead) return;

  powerup.vx *= RIPOFF_FRICTION;
  powerup.vy *= RIPOFF_FRICTION;

  powerup.x += powerup.vx;
  powerup.y += powerup.vy;

  powerup.life--;
  if (powerup.life <= 0) {
    powerup.dead = true;
  }

  wrapEntity(powerup, width, height);
}

// --- Particle System ---

export function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  color: string,
  life: number
): RipOffParticle {
  return {
    x,
    y,
    vx,
    vy,
    life,
    maxLife: life,
    color
  };
}

export function updateParticle(particle: RipOffParticle): void {
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.vx *= 0.95;
  particle.vy *= 0.95;
  particle.life--;
}

export function createExplosion(x: number, y: number, color: string, count: number = 20): RipOffParticle[] {
  const particles: RipOffParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 3 + 2;
    particles.push(
      createParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        Math.floor(Math.random() * 30 + 30)
      )
    );
  }
  return particles;
}

// --- Respawn System ---

export function respawnPlayer(player: RipOffPlayer, width: number, height: number): void {
  player.x = width / 2;
  player.y = height / 2;
  player.vx = 0;
  player.vy = 0;
  player.angle = -Math.PI / 2;
  player.dead = false;
  player.shielded = true;
  player.shieldTimer = SHIELD_DURATION;
  player.respawnTimer = 0;
  player.treadOffset = 0;
}
