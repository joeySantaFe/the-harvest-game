import React, { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { RipOffPlayer, RipOffEnemy, RipOffBullet, RipOffFuel, RipOffParticle, PopupText, EnemyType } from '../types';
import { SimulationState, SpawnMode, DebugOverlayFlags } from './devLabTypes';
import { InputService } from '../services/inputService';
import { audioService } from '../services/audioService';
import {
  createPlayer,
  updatePlayer,
  firePlayerBullet,
  createEnemy,
  updateEnemy,
  fireEnemyBullet,
  updateBullet,
  createFuel,
  updateFuel,
  updateParticle,
  createExplosion,
} from '../game-logic/ripoff/entities';
import {
  checkPlayerBulletCollision,
  checkEnemyBulletCollision,
  checkPlayerEnemyCollision,
  checkEnemyFuelCollision,
  checkPlayerFuelCollision,
  pushFuel,
  COLLISION_RADII,
} from '../game-logic/ripoff/physics';
import {
  updateEnemyAI,
  detectKiting,
  onHarvesterHit,
  resetAIState,
} from '../game-logic/ripoff/ai';
import {
  drawGrid,
  drawTank,
  drawBuggy,
  drawBullet,
  drawFuel as drawFuelFn,
  drawPowerUp,
  drawParticle,
  drawPopup,
} from '../game-logic/ripoff/rendering';
import { drawDebugOverlays } from './overlays/debugOverlays';
import { getAIConfig } from '../game-logic/ripoff/aiConfig';

export interface DevLabCanvasHandle {
  resetScene: () => void;
  clearEnemies: () => void;
}

interface DevLabCanvasProps {
  simState: SimulationState;
  spawnMode: SpawnMode;
  debugFlags: DebugOverlayFlags;
  onStepConsumed: () => void;
  onFrameUpdate: (frame: number) => void;
  onEntityCountsUpdate: (counts: { enemies: number; fuels: number; bullets: number }) => void;
}

const DevLabCanvas = forwardRef<DevLabCanvasHandle, DevLabCanvasProps>(({
  simState,
  spawnMode,
  debugFlags,
  onStepConsumed,
  onFrameUpdate,
  onEntityCountsUpdate,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  // Game objects
  const playersRef = useRef<RipOffPlayer[]>([]);
  const enemiesRef = useRef<RipOffEnemy[]>([]);
  const bulletsRef = useRef<RipOffBullet[]>([]);
  const fuelsRef = useRef<RipOffFuel[]>([]);
  const particlesRef = useRef<RipOffParticle[]>([]);
  const popupsRef = useRef<PopupText[]>([]);
  const inputServiceRef = useRef(new InputService());
  const spawnIdCounter = useRef(0);

  // Refs for props to avoid stale closures
  const simStateRef = useRef(simState);
  const spawnModeRef = useRef(spawnMode);
  const debugFlagsRef = useRef(debugFlags);
  useEffect(() => { simStateRef.current = simState; }, [simState]);
  useEffect(() => { spawnModeRef.current = spawnMode; }, [spawnMode]);
  useEffect(() => { debugFlagsRef.current = debugFlags; }, [debugFlags]);

  const initScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    playersRef.current = [createPlayer(1, width / 2, height / 2)];
    fuelsRef.current = [];
    for (let i = 0; i < 8; i++) {
      const x = width / 2 - 60 + (i % 4) * 40;
      const y = height / 2 - 40 + Math.floor(i / 4) * 40;
      fuelsRef.current.push(createFuel(x, y));
    }
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    popupsRef.current = [];
    spawnIdCounter.current = 0;
    frameCountRef.current = 0;
    resetAIState();
  }, []);

  useImperativeHandle(ref, () => ({
    resetScene: () => initScene(),
    clearEnemies: () => {
      enemiesRef.current = [];
    },
  }), [initScene]);

  // Handle canvas click for spawning
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const mode = spawnModeRef.current;
    if (!mode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (mode === 'fuel') {
      fuelsRef.current.push(createFuel(x, y));
    } else {
      const enemy = createEnemy(mode as EnemyType, x, y, spawnIdCounter.current++, 1.0);
      enemiesRef.current.push(enemy);
    }
  }, []);

  // ESC to cancel spawn mode
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && spawnModeRef.current) {
        // We can't directly set spawnMode here since it's a prop,
        // but the parent listens for this via its own handler.
        // We don't need to do anything — the parent's SpawnPanel handles this.
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Update logic — one simulation tick
  const tick = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = canvas.width;
    const height = canvas.height;

    // Update players
    for (const player of playersRef.current) {
      const input = inputServiceRef.current.getPlayerInput(player.id);
      updatePlayer(player, input, width, height);

      // Thrust particles
      const isThrusting = input.thrust && !player.dead;
      const isReversing = input.reverse && !player.dead;
      if ((isThrusting || isReversing) && Math.random() > 0.3) {
        const perpX = -Math.sin(player.angle);
        const perpY = Math.cos(player.angle);
        const emitDir = isReversing ? 1 : -1;
        const emitDist = 14;
        for (const side of [-1, 1]) {
          const px = player.x + Math.cos(player.angle) * emitDir * emitDist + perpX * side * 6;
          const py = player.y + Math.sin(player.angle) * emitDir * emitDist + perpY * side * 6;
          particlesRef.current.push({
            x: px, y: py,
            vx: Math.cos(player.angle) * emitDir * (2 + Math.random() * 2),
            vy: Math.sin(player.angle) * emitDir * (2 + Math.random() * 2),
            life: 15 + Math.random() * 10,
            maxLife: 25,
            color: player.color,
          });
        }
      }

      // Fire bullets
      if (input.fire && !player.dead) {
        const bullet = firePlayerBullet(player);
        if (bullet) {
          bulletsRef.current.push(bullet);
          audioService.playLaser();
        }
      }
    }

    // Update enemies
    for (const enemy of enemiesRef.current) {
      updateEnemyAI(enemy, playersRef.current, fuelsRef.current, width, height, enemiesRef.current);
      updateEnemy(enemy, width, height);

      if (enemy.type === 'sprinter') {
        if (enemy.isTracking && !enemy.wasTracking) {
          audioService.playTracking();
        }
        enemy.wasTracking = enemy.isTracking;
        const bullet = fireEnemyBullet(enemy, width, height);
        if (bullet) {
          bulletsRef.current.push(bullet);
          audioService.playEnemyLaser();
        }
      }
    }

    // Update bullets
    for (const bullet of bulletsRef.current) {
      updateBullet(bullet, width, height);
    }

    // Update fuel
    for (const fuel of fuelsRef.current) {
      if (fuel.dead) continue;
      fuel.beingDragged = false;
      updateFuel(fuel, width, height);
    }

    // Update particles
    for (const particle of particlesRef.current) {
      updateParticle(particle);
    }

    // Update popups
    for (const popup of popupsRef.current) {
      popup.life--;
      popup.y += popup.vy;
    }

    // Collisions
    for (const player of playersRef.current) {
      for (const bullet of bulletsRef.current) {
        if (checkPlayerBulletCollision(player, bullet)) {
          bullet.dead = true;
          // In sandbox, player doesn't die — just show explosion effect
          particlesRef.current.push(...createExplosion(player.x, player.y, '#ff0', 10));
        }
      }
    }

    for (const enemy of enemiesRef.current) {
      for (const bullet of bulletsRef.current) {
        if (checkEnemyBulletCollision(enemy, bullet)) {
          bullet.dead = true;
          enemy.dead = true;
          audioService.playExplosion();
          particlesRef.current.push(...createExplosion(enemy.x, enemy.y, enemy.color, 20));
          if (enemy.type === 'harvester') {
            onHarvesterHit(enemy);
          }
          // Release fuel
          if (enemy.dragTarget !== null) {
            const fuel = fuelsRef.current[enemy.dragTarget];
            if (fuel && !fuel.dead) {
              fuel.beingDragged = false;
              fuel.draggedBy = null;
              fuel.vx = enemy.vx;
              fuel.vy = enemy.vy;
            }
          }
        }
      }
    }

    for (const player of playersRef.current) {
      for (const enemy of enemiesRef.current) {
        if (checkPlayerEnemyCollision(player, enemy)) {
          enemy.dead = true;
          audioService.playExplosion();
          particlesRef.current.push(...createExplosion(enemy.x, enemy.y, enemy.color, 20));
          particlesRef.current.push(...createExplosion(player.x, player.y, '#ff0', 10));
        }
      }
    }

    for (const player of playersRef.current) {
      for (const fuel of fuelsRef.current) {
        if (checkPlayerFuelCollision(player, fuel)) {
          pushFuel(player, fuel);
        }
      }
    }

    for (let i = 0; i < enemiesRef.current.length; i++) {
      const enemy = enemiesRef.current[i];
      for (let j = 0; j < fuelsRef.current.length; j++) {
        const fuel = fuelsRef.current[j];
        if (checkEnemyFuelCollision(enemy, fuel)) {
          enemy.dragTarget = j;
        }
      }
    }

    detectKiting(playersRef.current, enemiesRef.current);

    // Clean up dead
    bulletsRef.current = bulletsRef.current.filter(b => !b.dead);
    enemiesRef.current = enemiesRef.current.filter(e => !e.dead);
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    popupsRef.current = popupsRef.current.filter(p => p.life > 0);
    // Don't filter fuels — dragTarget uses indices

    frameCountRef.current++;
  }, []);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    // Motion blur
    ctx.fillStyle = 'rgba(5, 5, 5, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // Grid
    const player = playersRef.current[0];
    const ox = player ? -player.x * 0.1 : 0;
    const oy = player ? -player.y * 0.1 : 0;
    drawGrid(ctx, width, height, ox, oy);

    // Fuel
    for (const fuel of fuelsRef.current) {
      drawFuelFn(ctx, fuel, width, height);
    }

    // Bullets
    for (const bullet of bulletsRef.current) {
      drawBullet(ctx, bullet);
    }

    // Enemies
    for (const enemy of enemiesRef.current) {
      if (!isFinite(enemy.x) || !isFinite(enemy.y)) continue;
      const margin = 200;
      if (enemy.x < -margin || enemy.x > width + margin || enemy.y < -margin || enemy.y > height + margin) continue;

      // Draw tow line
      if (enemy.dragTarget !== null && enemy.type === 'harvester') {
        const fuel = fuelsRef.current[enemy.dragTarget];
        if (fuel && !fuel.dead && isFinite(fuel.x) && isFinite(fuel.y)) {
          const startX = enemy.x - Math.cos(enemy.angle) * 15;
          const startY = enemy.y - Math.sin(enemy.angle) * 15;
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(fuel.x, fuel.y);
          ctx.stroke();
        }
      }

      if (enemy.type === 'harvester' || enemy.type === 'sprinter') {
        const turretAngle = enemy.type === 'sprinter' ? enemy.turretAngle : enemy.angle;
        drawTank(ctx, enemy.x, enemy.y, enemy.angle, turretAngle, enemy.treadOffset, enemy.color, width, height);

        if (enemy.type === 'sprinter' && enemy.isTracking) {
          ctx.strokeStyle = enemy.color;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, 25, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else {
        drawBuggy(ctx, enemy.x, enemy.y, enemy.angle, enemy.treadOffset, enemy.color, width, height);
      }
    }

    // Players
    for (const p of playersRef.current) {
      if (!p.dead) {
        const color = p.shielded ? '#0ff' : p.color;
        drawTank(ctx, p.x, p.y, p.angle, p.angle, p.treadOffset, color, width, height);
      }
    }

    // Particles
    for (const particle of particlesRef.current) {
      drawParticle(ctx, particle);
    }

    // Popups
    for (const popup of popupsRef.current) {
      drawPopup(ctx, popup);
    }

    // Debug overlays
    const flags = debugFlagsRef.current;
    if (flags.visionCones || flags.targetLines || flags.steeringVectors || flags.collisionRadii) {
      drawDebugOverlays(ctx, {
        enemies: enemiesRef.current,
        players: playersRef.current,
        fuels: fuelsRef.current,
        flags,
        config: getAIConfig(),
      });
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  // Main loop
  const gameLoop = useCallback(() => {
    const sim = simStateRef.current;

    if (!sim.paused) {
      // Run ticks based on timeScale
      const ticksToRun = sim.timeScale >= 1 ? sim.timeScale : 1;
      for (let i = 0; i < ticksToRun; i++) {
        tick();
      }
    } else if (sim.stepRequested) {
      tick();
      onStepConsumed();
    }

    draw();
    onFrameUpdate(frameCountRef.current);
    onEntityCountsUpdate({
      enemies: enemiesRef.current.length,
      fuels: fuelsRef.current.filter(f => !f.dead).length,
      bullets: bulletsRef.current.length,
    });

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [tick, draw, onStepConsumed, onFrameUpdate, onEntityCountsUpdate]);

  // Init
  useEffect(() => {
    audioService.init();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    initScene();
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(requestRef.current);
      inputServiceRef.current.destroy();
    };
  }, [initScene, gameLoop]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{ width: '100%', height: '100%', display: 'block', cursor: spawnMode ? 'crosshair' : 'default' }}
    />
  );
});

DevLabCanvas.displayName = 'DevLabCanvas';

export default DevLabCanvas;
