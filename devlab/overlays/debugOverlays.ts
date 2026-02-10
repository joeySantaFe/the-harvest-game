import { RipOffEnemy, RipOffPlayer, RipOffFuel } from '../../types';
import { DebugOverlayFlags } from '../devLabTypes';
import { AIConfig } from '../../game-logic/ripoff/aiConfig';
import { COLLISION_RADII } from '../../game-logic/ripoff/physics';

interface DebugOverlayData {
  enemies: RipOffEnemy[];
  players: RipOffPlayer[];
  fuels: RipOffFuel[];
  flags: DebugOverlayFlags;
  config: AIConfig;
}

export function drawDebugOverlays(ctx: CanvasRenderingContext2D, data: DebugOverlayData): void {
  const { enemies, players, fuels, flags, config } = data;

  ctx.save();

  if (flags.visionCones) {
    drawVisionCones(ctx, enemies, config);
  }

  if (flags.targetLines) {
    drawTargetLines(ctx, enemies, players, fuels);
  }

  if (flags.steeringVectors) {
    drawSteeringVectors(ctx, enemies);
  }

  if (flags.collisionRadii) {
    drawCollisionRadii(ctx, enemies, players, fuels);
  }

  ctx.restore();
}

function drawVisionCones(ctx: CanvasRenderingContext2D, enemies: RipOffEnemy[], config: AIConfig): void {
  for (const enemy of enemies) {
    if (enemy.dead) continue;

    if (enemy.type === 'sprinter') {
      // Detection range (outer)
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, config.sprinter.detectionRange, 0, Math.PI * 2);
      ctx.stroke();

      // Turret tracking range (inner)
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, config.sprinter.turretTrackingRange, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (enemy.type === 'harvester') {
      // Fuel grab distance
      ctx.strokeStyle = 'rgba(255, 0, 68, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, config.harvester.fuelGrabDistance, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

function drawTargetLines(
  ctx: CanvasRenderingContext2D,
  enemies: RipOffEnemy[],
  players: RipOffPlayer[],
  fuels: RipOffFuel[]
): void {
  for (const enemy of enemies) {
    if (enemy.dead) continue;

    let targetX: number | null = null;
    let targetY: number | null = null;

    if (enemy.dragTarget !== null) {
      const fuel = fuels[enemy.dragTarget];
      if (fuel && !fuel.dead) {
        targetX = fuel.x;
        targetY = fuel.y;
      }
    } else if (enemy.type === 'harvester' && enemy.targetId !== null) {
      const fuel = fuels[enemy.targetId];
      if (fuel && !fuel.dead) {
        targetX = fuel.x;
        targetY = fuel.y;
      }
    } else if (enemy.type === 'sprinter' || enemy.type === 'exterminator') {
      // Find nearest player
      let minDist = Infinity;
      for (const p of players) {
        if (p.dead) continue;
        const dx = p.x - enemy.x;
        const dy = p.y - enemy.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          targetX = p.x;
          targetY = p.y;
        }
      }
    }

    if (targetX !== null && targetY !== null) {
      ctx.strokeStyle = enemy.color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }
}

function drawSteeringVectors(ctx: CanvasRenderingContext2D, enemies: RipOffEnemy[]): void {
  for (const enemy of enemies) {
    if (enemy.dead) continue;

    const speed = Math.sqrt(enemy.vx * enemy.vx + enemy.vy * enemy.vy);
    if (speed < 0.1) continue;

    // Velocity direction (cyan)
    const velScale = 20;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + enemy.vx * velScale, enemy.y + enemy.vy * velScale);
    ctx.stroke();

    // Arrow head
    const velAngle = Math.atan2(enemy.vy, enemy.vx);
    const arrowLen = 6;
    const endX = enemy.x + enemy.vx * velScale;
    const endY = enemy.y + enemy.vy * velScale;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - Math.cos(velAngle - 0.5) * arrowLen, endY - Math.sin(velAngle - 0.5) * arrowLen);
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - Math.cos(velAngle + 0.5) * arrowLen, endY - Math.sin(velAngle + 0.5) * arrowLen);
    ctx.stroke();

    // Facing direction (yellow)
    ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + Math.cos(enemy.angle) * 40, enemy.y + Math.sin(enemy.angle) * 40);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawCollisionRadii(
  ctx: CanvasRenderingContext2D,
  enemies: RipOffEnemy[],
  players: RipOffPlayer[],
  fuels: RipOffFuel[]
): void {
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;

  for (const p of players) {
    if (p.dead) continue;
    ctx.strokeStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, COLLISION_RADII.player, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const enemy of enemies) {
    if (enemy.dead) continue;
    const r = COLLISION_RADII[enemy.type] || COLLISION_RADII.harvester;
    ctx.strokeStyle = enemy.color;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const fuel of fuels) {
    if (fuel.dead) continue;
    ctx.strokeStyle = '#0af';
    ctx.beginPath();
    ctx.arc(fuel.x, fuel.y, COLLISION_RADII.fuel, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
