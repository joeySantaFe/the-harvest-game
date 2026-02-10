// Drawing functions extracted from RipOffGame.tsx
// All functions accept canvas dimensions as params instead of reading from canvasRef

import { RipOffBullet, RipOffFuel, RipOffPowerUp, RipOffParticle, PopupText } from '../../types';
import { RIPOFF_SHAPES } from '../../constants';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  parallaxX: number,
  parallaxY: number
): void {
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;

  const gridSize = 100;
  ctx.beginPath();
  for (let x = parallaxX % gridSize; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = parallaxY % gridSize; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  shape: number[][],
  color: string,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;

  const margin = 150;
  if (x < -margin || x > canvasWidth + margin || y < -margin || y > canvasHeight + margin) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  for (let i = 0; i < shape.length; i++) {
    const [sx, sy] = shape[i];
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

export function drawTank(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyAngle: number,
  turretAngle: number,
  treadOffset: number,
  color: string,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!isFinite(x) || !isFinite(y) || !isFinite(bodyAngle)) return;

  const margin = 150;
  if (x < -margin || x > canvasWidth + margin || y < -margin || y > canvasHeight + margin) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(bodyAngle);

  // Draw treads with animated dashed lines
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Left tread outline
  ctx.beginPath();
  ctx.moveTo(14, 8); ctx.lineTo(14, 12); ctx.lineTo(-14, 12); ctx.lineTo(-14, 8);
  ctx.stroke();

  // Right tread outline
  ctx.beginPath();
  ctx.moveTo(14, -8); ctx.lineTo(14, -12); ctx.lineTo(-14, -12); ctx.lineTo(-14, -8);
  ctx.stroke();

  // Animated tread dashes (left tread)
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -treadOffset;
  ctx.beginPath();
  ctx.moveTo(14, 10);
  ctx.lineTo(-14, 10);
  ctx.stroke();

  // Animated tread dashes (right tread)
  ctx.beginPath();
  ctx.moveTo(14, -10);
  ctx.lineTo(-14, -10);
  ctx.stroke();

  ctx.setLineDash([]);

  // Draw tank body
  ctx.beginPath();
  ctx.moveTo(12, 8); ctx.lineTo(12, -8); ctx.lineTo(-12, -8); ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  // Draw turret (separate rotation)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turretAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(20, 0);
  ctx.stroke();
  // Turret base circle
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawBuggy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  treadOffset: number,
  color: string,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;

  const margin = 150;
  if (x < -margin || x > canvasWidth + margin || y < -margin || y > canvasHeight + margin) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Draw body (smaller rectangle)
  ctx.beginPath();
  ctx.moveTo(10, 6); ctx.lineTo(10, -6); ctx.lineTo(-10, -6); ctx.lineTo(-10, 6);
  ctx.closePath();
  ctx.stroke();

  // Draw front bumper bar
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(12, -5);
  ctx.lineTo(12, 5);
  ctx.stroke();

  // Draw 4 wheels as small circles with rotating line
  ctx.lineWidth = 2;
  const wheelPositions = [
    { x: 10, y: -7 },
    { x: 10, y: 7 },
    { x: -10, y: -7 },
    { x: -10, y: 7 }
  ];
  for (const wp of wheelPositions) {
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
    ctx.stroke();
    const spokeAngle = treadOffset * 0.3;
    ctx.beginPath();
    ctx.moveTo(wp.x + Math.cos(spokeAngle) * 2.5, wp.y + Math.sin(spokeAngle) * 2.5);
    ctx.lineTo(wp.x - Math.cos(spokeAngle) * 2.5, wp.y - Math.sin(spokeAngle) * 2.5);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawBullet(ctx: CanvasRenderingContext2D, bullet: RipOffBullet): void {
  const color = bullet.ownerId === 'enemy' ? '#f80' : '#0f0';
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFuel(
  ctx: CanvasRenderingContext2D,
  fuel: RipOffFuel,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (fuel.dead) return;
  drawShape(ctx, fuel.x, fuel.y, 0, RIPOFF_SHAPES.fuel, '#0af', canvasWidth, canvasHeight);
}

export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  powerup: RipOffPowerUp,
  frameCount: number
): void {
  // Blinking when about to expire
  if (powerup.life < 100 && Math.floor(powerup.life / 10) % 2 === 0) {
    return;
  }

  const pulse = Math.sin(frameCount / 100) * 0.3 + 1;
  const spinAngle = frameCount / 200;

  ctx.save();
  ctx.translate(powerup.x, powerup.y);
  ctx.rotate(spinAngle);
  ctx.scale(pulse, pulse);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#0ff';
  ctx.beginPath();
  for (let i = 0; i < RIPOFF_SHAPES.powerup.length; i++) {
    const [sx, sy] = RIPOFF_SHAPES.powerup[i];
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawParticle(ctx: CanvasRenderingContext2D, particle: RipOffParticle): void {
  const alpha = particle.life / particle.maxLife;
  ctx.fillStyle = particle.color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawPopup(ctx: CanvasRenderingContext2D, popup: PopupText): void {
  const alpha = popup.life / 60;
  ctx.fillStyle = popup.color;
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(popup.text, popup.x, popup.y);
  ctx.globalAlpha = 1;
}
