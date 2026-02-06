import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameActProps, RipOffState, RipOffPlayer, RipOffEnemy, RipOffBullet, RipOffFuel, RipOffPowerUp, RipOffParticle, PopupText } from '../types';
import {
  RIPOFF_SHAPES,
  SHIELD_DURATION,
  EXTRA_LIFE_SCORE,
  ENEMY_SCORES,
  POWERUP_SPAWN_CHANCE,
  SCREEN_COLORS,
  FUEL_TO_LIVES_RATIO,
  MAX_BONUS_LIVES
} from '../constants';
import { audioService } from '../services/audioService';
import { InputService } from '../services/inputService';
import { ArcadeButton } from '../components/ArcadeButton';
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
  createPowerUp,
  updatePowerUp,
  updateParticle,
  createExplosion,
  respawnPlayer
} from '../game-logic/ripoff/entities';
import {
  checkPlayerBulletCollision,
  checkEnemyBulletCollision,
  checkPlayerEnemyCollision,
  checkPlayerPowerUpCollision,
  checkPlayerFuelCollision,
  checkEnemyFuelCollision,
  pushFuel,
  dragFuel
} from '../game-logic/ripoff/physics';
import {
  updateEnemyAI,
  detectKiting,
  onHarvesterHit,
  resetAIState
} from '../game-logic/ripoff/ai';
import {
  getWaveConfig,
  getRoundsPerWave,
  generateSpawnPositions,
  createEnemyQueue
} from '../game-logic/ripoff/waves';

interface RipOffGameProps extends GameActProps {
  playerCount: number;
  onJumpToAct?: (act: 1 | 2 | 3) => void;
}

const RipOffGame: React.FC<RipOffGameProps> = ({
  initialFuel,
  initialScore,
  playerCount,
  onComplete,
  onFailure,
  onJumpToAct
}) => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  // React state (UI-affecting)
  // Calculate lives from fuel
  const bonusLives = Math.min(Math.floor(initialFuel / FUEL_TO_LIVES_RATIO), MAX_BONUS_LIVES);
  const baseLives = 3;
  const initialLives = baseLives + bonusLives;

  const [internalState, setInternalState] = useState<RipOffState>(RipOffState.PLAYING);
  const [currentScore, setCurrentScore] = useState(initialScore);
  const [wave, setWave] = useState(1);
  const [round, setRound] = useState(0);
  // Refs to avoid stale closure issues in game loop callbacks
  const waveRef = useRef(1);
  const roundRef = useRef(0);
  const [lives, setLives] = useState(initialLives);
  const [countdown, setCountdown] = useState<number | null>(3);

  // Game state ref for event handlers
  const internalStateRef = useRef(RipOffState.PLAYING);
  const currentScoreRef = useRef(initialScore);
  const livesRef = useRef(initialLives);
  const nextLifeScoreRef = useRef(EXTRA_LIFE_SCORE);

  // Game objects (mutable refs for performance)
  const playersRef = useRef<RipOffPlayer[]>([]);
  const enemiesRef = useRef<RipOffEnemy[]>([]);
  const bulletsRef = useRef<RipOffBullet[]>([]);
  const fuelsRef = useRef<RipOffFuel[]>([]);
  const powerupsRef = useRef<RipOffPowerUp[]>([]);
  const particlesRef = useRef<RipOffParticle[]>([]);
  const popupsRef = useRef<PopupText[]>([]);

  // Input service
  const inputServiceRef = useRef(new InputService());

  // Wave management
  const waveQueueRef = useRef<Array<{ type: string; x: number; y: number; spawnId: number; speedMod: number }>>([]);
  const spawnTimerRef = useRef(0);
  const roundDelayTimerRef = useRef(0);
  const screenShakeRef = useRef(0);

  // UI State
  const [waveAnnouncement, setWaveAnnouncement] = useState<string | null>('WAVE 1');
  const [tacticalModeActive, setTacticalModeActive] = useState(false);

  // Sync internal state and score refs
  useEffect(() => {
    internalStateRef.current = internalState;
  }, [internalState]);

  useEffect(() => {
    currentScoreRef.current = currentScore;
  }, [currentScore]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  // Initialize game
  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create players
    playersRef.current = [];
    for (let i = 1; i <= playerCount; i++) {
      const offsetX = playerCount === 2 ? (i === 1 ? -50 : 50) : 0;
      playersRef.current.push(createPlayer(i as 1 | 2, width / 2 + offsetX, height / 2));
    }

    // Create fuel cells (8 fuel cells in 4x2 grid matching v30)
    fuelsRef.current = [];
    const fuelCount = 8;
    for (let i = 0; i < fuelCount; i++) {
      const x = width / 2 - 60 + (i % 4) * 40;
      const y = height / 2 - 40 + Math.floor(i / 4) * 40;
      fuelsRef.current.push(createFuel(x, y));
    }

    // Clear other arrays
    enemiesRef.current = [];
    bulletsRef.current = [];
    powerupsRef.current = [];
    particlesRef.current = [];
    popupsRef.current = [];

    resetAIState();
    // Reset wave/round refs
    waveRef.current = 1;
    roundRef.current = 0;
    startWave(1, 0);
  }, [playerCount]);

  // Start a new wave/round
  const startWave = useCallback((waveNum: number, roundNum: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const config = getWaveConfig(waveNum, playerCount);
    const roundConfig = config[roundNum];

    if (!roundConfig) {
      setInternalState(RipOffState.WAVE_TRANSITION);
      return;
    }

    // Show wave announcement on first round
    if (roundNum === 0) {
      setWaveAnnouncement(`WAVE ${waveNum}`);
      audioService.playTone(200, 'sine', 0.5);
      setTimeout(() => setWaveAnnouncement(null), 2500);
    }

    const queue = createEnemyQueue(roundConfig, waveNum);
    const positions = generateSpawnPositions(queue.length, canvas.width, canvas.height);

    waveQueueRef.current = queue.map((info, i) => ({
      type: info.type,
      x: positions[i].x,
      y: positions[i].y,
      spawnId: info.spawnId,
      speedMod: info.speedMod
    }));

    spawnTimerRef.current = 60;
  }, [playerCount]);

  // Spawn next enemy from queue
  const spawnEnemy = useCallback(() => {
    if (waveQueueRef.current.length === 0) return;

    const next = waveQueueRef.current.shift();
    if (!next) return;

    const enemy = createEnemy(next.type as any, next.x, next.y, next.spawnId, next.speedMod);
    enemiesRef.current.push(enemy);
  }, []);

  // Game update loop
  const update = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (internalStateRef.current !== RipOffState.PLAYING) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    // Spawn enemies from queue
    if (spawnTimerRef.current > 0) {
      spawnTimerRef.current--;
    } else if (waveQueueRef.current.length > 0) {
      spawnEnemy();
      spawnTimerRef.current = 60 + Math.floor(Math.random() * 60); // 1-2 seconds between spawns
    }

    // Update players
    for (const player of playersRef.current) {
      const input = inputServiceRef.current.getPlayerInput(player.id);
      updatePlayer(player, input, width, height);

      // Thrust particles (emit from tank rear, two exhaust points perpendicular to facing)
      const isThrusting = input.thrust && !player.dead;
      const isReversing = input.reverse && !player.dead;
      if ((isThrusting || isReversing) && Math.random() > 0.3) {
        const perpX = -Math.sin(player.angle);
        const perpY = Math.cos(player.angle);
        // When thrusting: emit from rear; when reversing: emit from front
        const emitDir = isReversing ? 1 : -1;
        const emitDist = 14;
        for (const side of [-1, 1]) {
          const px = player.x + Math.cos(player.angle) * emitDir * emitDist + perpX * side * 6;
          const py = player.y + Math.sin(player.angle) * emitDir * emitDist + perpY * side * 6;
          particlesRef.current.push({
            x: px,
            y: py,
            vx: Math.cos(player.angle) * emitDir * (2 + Math.random() * 2),
            vy: Math.sin(player.angle) * emitDir * (2 + Math.random() * 2),
            life: 15 + Math.random() * 10,
            maxLife: 25,
            color: player.color
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

      // Enemy shooting (sprinters shoot when tracking)
      if (enemy.type === 'sprinter') {
        // Play tracking sound when turret starts tracking
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
      fuel.beingDragged = false; // Reset drag state
      updateFuel(fuel, width, height);
    }

    // Update powerups
    for (const powerup of powerupsRef.current) {
      updatePowerUp(powerup, width, height);
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

    // Collision detection
    handleCollisions();

    // Detect kiting
    detectKiting(playersRef.current, enemiesRef.current);

    // Clean up dead objects
    // Note: Don't filter fuels - enemy.dragTarget uses array indices, filtering would break references
    bulletsRef.current = bulletsRef.current.filter(b => !b.dead);
    enemiesRef.current = enemiesRef.current.filter(e => !e.dead);
    powerupsRef.current = powerupsRef.current.filter(p => !p.dead);
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    popupsRef.current = popupsRef.current.filter(p => p.life > 0);

    if (
      waveQueueRef.current.length === 0 &&
      enemiesRef.current.length === 0 &&
      roundDelayTimerRef.current === 0
    ) {
      roundDelayTimerRef.current = 120;
    }

    if (roundDelayTimerRef.current > 0) {
      roundDelayTimerRef.current--;
      if (roundDelayTimerRef.current === 0) {
        advanceRound();
      }
    }

    // Check game over
    checkGameOver();

    // Screen shake decay
    if (screenShakeRef.current > 0) {
      screenShakeRef.current *= 0.9;
      if (screenShakeRef.current < 0.1) screenShakeRef.current = 0;
    }
  }, []);

  // Handle all collision detection
  const handleCollisions = useCallback(() => {
    const width = canvasRef.current?.width || 0;
    const height = canvasRef.current?.height || 0;

    // Player vs bullet
    for (const player of playersRef.current) {
      for (const bullet of bulletsRef.current) {
        if (checkPlayerBulletCollision(player, bullet)) {
          bullet.dead = true;
          killPlayer(player);
        }
      }
    }

    // Enemy vs bullet
    for (const enemy of enemiesRef.current) {
      for (const bullet of bulletsRef.current) {
        if (checkEnemyBulletCollision(enemy, bullet)) {
          bullet.dead = true;
          killEnemy(enemy);

          if (enemy.type === 'harvester') {
            onHarvesterHit(enemy);
          }
        }
      }
    }

    // Player vs enemy
    for (const player of playersRef.current) {
      for (const enemy of enemiesRef.current) {
        if (checkPlayerEnemyCollision(player, enemy)) {
          if (player.shielded) {
            // Kill enemy if player has shield
            killEnemy(enemy);
          } else {
            killPlayer(player);
            killEnemy(enemy);
          }
        }
      }
    }

    // Player vs powerup
    for (const player of playersRef.current) {
      for (const powerup of powerupsRef.current) {
        if (checkPlayerPowerUpCollision(player, powerup)) {
          powerup.dead = true;
          player.shielded = true;
          player.shieldTimer = SHIELD_DURATION;
          audioService.playShieldActivate();
          addPopup(player.x, player.y, 'SHIELD!', '#0ff');
        }
      }
    }

    // Player vs fuel (push with shield)
    for (const player of playersRef.current) {
      for (const fuel of fuelsRef.current) {
        if (checkPlayerFuelCollision(player, fuel)) {
          pushFuel(player, fuel);
        }
      }
    }

    // Enemy vs fuel (harvester drag)
    for (let i = 0; i < enemiesRef.current.length; i++) {
      const enemy = enemiesRef.current[i];
      for (let j = 0; j < fuelsRef.current.length; j++) {
        const fuel = fuelsRef.current[j];
        if (checkEnemyFuelCollision(enemy, fuel)) {
          enemy.dragTarget = j;
          dragFuel(enemy, fuel, width / 2, height / 2);
        }
      }
    }
  }, []);

  // Kill player
  const killPlayer = useCallback((player: RipOffPlayer) => {
    if (player.dead || player.shielded) return;

    player.dead = true;
    player.respawnTimer = 180; // 3 seconds
    audioService.playExplosion();
    particlesRef.current.push(...createExplosion(player.x, player.y, player.color, 30));
    screenShakeRef.current = 10;

    setLives(prev => {
      const newLives = prev - 1;
      livesRef.current = newLives;
      if (newLives <= 0) {
        // Game over
        setTimeout(() => {
          onFailure(currentScoreRef.current);
        }, 100);
      } else {
        // Respawn after delay
        setTimeout(() => {
          const canvas = canvasRef.current;
          if (canvas) {
            respawnPlayer(player, canvas.width, canvas.height);
          }
        }, 3000);
      }
      return newLives;
    });
  }, [onFailure]);

  // Kill enemy
  const killEnemy = useCallback((enemy: RipOffEnemy) => {
    if (enemy.dead) return;

    enemy.dead = true;
    audioService.playExplosion();
    particlesRef.current.push(...createExplosion(enemy.x, enemy.y, enemy.color, 20));
    screenShakeRef.current = 5;

    // Release captured fuel with enemy's velocity
    if (enemy.dragTarget !== null) {
      const fuel = fuelsRef.current[enemy.dragTarget];
      if (fuel && !fuel.dead) {
        fuel.beingDragged = false;
        fuel.draggedBy = null;
        fuel.vx = enemy.vx;
        fuel.vy = enemy.vy;
      }
    }

    const points = ENEMY_SCORES[enemy.type];
    setCurrentScore(prev => {
      const newScore = prev + points;

      // Check for extra life
      if (newScore >= nextLifeScoreRef.current) {
        setLives(l => l + 1);
        audioService.playExtraLife();
        addPopup(enemy.x, enemy.y, 'EXTRA LIFE!', SCREEN_COLORS.score);
        nextLifeScoreRef.current += EXTRA_LIFE_SCORE;
      }

      return newScore;
    });

    addPopup(enemy.x, enemy.y, `+${points}`, SCREEN_COLORS.score);

    // Chance to spawn powerup
    if (Math.random() < POWERUP_SPAWN_CHANCE) {
      powerupsRef.current.push(createPowerUp(enemy.x, enemy.y));
    }
  }, []);

  // Add popup text
  const addPopup = useCallback((x: number, y: number, text: string, color: string) => {
    popupsRef.current.push({
      x,
      y,
      text,
      color,
      life: 60,
      vy: -1
    });
  }, []);

  // Advance to next round or wave
  const advanceRound = useCallback(() => {
    const currentRound = roundRef.current;
    const currentWave = waveRef.current;
    const nextRound = currentRound + 1;

    if (nextRound >= getRoundsPerWave()) {
      const nextWave = currentWave + 1;

      // Check if this was the final wave (wave 3)
      if (currentWave >= 3) {
        const fuelRemaining = fuelsRef.current.filter(f => !f.dead).length;
        const scoreGained = currentScoreRef.current - initialScore;
        setTimeout(() => {
          onComplete({
            fuelRemaining,
            scoreGained,
            hullIntegrity: 100
          });
        }, 1000);
        return;
      }

      // Update refs and state for next wave
      // Stay in PLAYING state so the player can keep moving during the transition
      waveRef.current = nextWave;
      roundRef.current = 0;
      setWave(nextWave);
      setRound(0);
      setTimeout(() => {
        startWave(nextWave, 0);
      }, 2000);
    } else {
      roundRef.current = nextRound;
      setRound(nextRound);
      startWave(currentWave, nextRound);
    }
  }, [initialScore, onComplete]);

  // Check game over conditions
  const checkGameOver = useCallback(() => {
    // All fuel captured (count non-dead fuels)
    const aliveFuels = fuelsRef.current.filter(f => !f.dead).length;
    if (aliveFuels === 0) {
      setTimeout(() => {
        onFailure(currentScoreRef.current);
      }, 1000);
    }
  }, [onFailure]);

  // Render function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Motion blur effect (semi-transparent black overlay instead of full clear)
    ctx.fillStyle = 'rgba(5, 5, 5, 0.6)';
    ctx.fillRect(0, 0, width, height);

    // Screen shake
    if (screenShakeRef.current > 0) {
      const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
      const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(shakeX, shakeY);
    }

    // Draw grid
    drawGrid(ctx, width, height);

    // Draw fuel cells
    for (const fuel of fuelsRef.current) {
      drawFuel(ctx, fuel);
    }

    // Draw powerups
    for (const powerup of powerupsRef.current) {
      drawPowerUp(ctx, powerup);
    }

    // Draw bullets
    for (const bullet of bulletsRef.current) {
      drawBullet(ctx, bullet);
    }

    // Draw enemies
    for (const enemy of enemiesRef.current) {
      // Skip enemies with invalid or off-screen coordinates
      if (!isFinite(enemy.x) || !isFinite(enemy.y) ||
          enemy.x < -200 || enemy.x > width + 200 ||
          enemy.y < -200 || enemy.y > height + 200) {
        continue;
      }
      drawEnemy(ctx, enemy);
    }

    // Draw players
    for (const player of playersRef.current) {
      if (!player.dead) {
        drawPlayer(ctx, player);
      }
    }

    // Draw particles
    for (const particle of particlesRef.current) {
      drawParticle(ctx, particle);
    }

    // Draw popups
    for (const popup of popupsRef.current) {
      drawPopup(ctx, popup);
    }

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  // Drawing functions
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;

    // Parallax offset based on player position
    const player = playersRef.current[0];
    const ox = player ? -player.x * 0.1 : 0;
    const oy = player ? -player.y * 0.1 : 0;

    const gridSize = 100;
    ctx.beginPath();
    for (let x = ox % gridSize; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = oy % gridSize; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  };

  const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, shape: number[][], color: string) => {
    // Validate inputs to prevent rendering bugs
    if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) {
      return;
    }

    // Skip if position is way off-screen
    const canvas = canvasRef.current;
    if (canvas) {
      const margin = 150;
      if (x < -margin || x > canvas.width + margin || y < -margin || y > canvas.height + margin) {
        return;
      }
    }

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
  };

  const drawTank = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    angle: number,
    turretAngle: number,
    treadOffset: number,
    color: string
  ) => {
    if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const margin = 150;
      if (x < -margin || x > canvas.width + margin || y < -margin || y > canvas.height + margin) return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

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
  };

  const drawBuggy = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    angle: number,
    treadOffset: number,
    color: string
  ) => {
    if (!isFinite(x) || !isFinite(y) || !isFinite(angle)) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const margin = 150;
      if (x < -margin || x > canvas.width + margin || y < -margin || y > canvas.height + margin) return;
    }

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
      { x: 10, y: -7 },   // Front-left
      { x: 10, y: 7 },    // Front-right
      { x: -10, y: -7 },  // Back-left
      { x: -10, y: 7 }    // Back-right
    ];
    for (const wp of wheelPositions) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, 3, 0, Math.PI * 2);
      ctx.stroke();
      // Rotating spoke inside wheel
      const spokeAngle = treadOffset * 0.3;
      ctx.beginPath();
      ctx.moveTo(wp.x + Math.cos(spokeAngle) * 2.5, wp.y + Math.sin(spokeAngle) * 2.5);
      ctx.lineTo(wp.x - Math.cos(spokeAngle) * 2.5, wp.y - Math.sin(spokeAngle) * 2.5);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: RipOffPlayer) => {
    // Respawn blinking effect
    if (player.respawnTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
      return; // Don't draw during blink
    }

    const color = player.shielded ? '#0ff' : player.color;
    drawTank(ctx, player.x, player.y, player.angle, player.angle, player.treadOffset, color);

    if (player.shielded) {
      // Draw shield circle
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#0ff';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Draw arrow pointer on shield
      const ax = player.x + Math.cos(player.angle) * 25;
      const ay = player.y + Math.sin(player.angle) * 25;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(player.angle + 1.5) * 15, ay + Math.sin(player.angle + 1.5) * 15);
      ctx.lineTo(ax, ay);
      ctx.lineTo(ax + Math.cos(player.angle - 1.5) * 15, ay + Math.sin(player.angle - 1.5) * 15);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  };

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: RipOffEnemy) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Skip if enemy has invalid coordinates
    if (!isFinite(enemy.x) || !isFinite(enemy.y) || !isFinite(enemy.angle)) {
      return;
    }

    // Skip enemies that are too far off-screen (prevents long diagonal lines)
    const margin = 100;
    if (enemy.x < -margin || enemy.x > canvas.width + margin ||
        enemy.y < -margin || enemy.y > canvas.height + margin) {
      return;
    }

    // Draw tow line if carrying fuel (only if both enemy and fuel are on-screen)
    if (enemy.dragTarget !== null && enemy.type === 'harvester') {
      const fuel = fuelsRef.current[enemy.dragTarget];
      if (fuel && !fuel.dead && isFinite(fuel.x) && isFinite(fuel.y)) {
        if (fuel.x >= -margin && fuel.x <= canvas.width + margin &&
            fuel.y >= -margin && fuel.y <= canvas.height + margin) {
          const startX = enemy.x - Math.cos(enemy.angle) * 15;
          const startY = enemy.y - Math.sin(enemy.angle) * 15;
          const lineLength = Math.sqrt((fuel.x - startX) ** 2 + (fuel.y - startY) ** 2);

          if (lineLength <= 200) {
            ctx.strokeStyle = enemy.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(fuel.x, fuel.y);
            ctx.stroke();
          }
        }
      }
    }

    if (enemy.type === 'harvester' || enemy.type === 'sprinter') {
      // Tank with animated treads
      const turretAngle = enemy.type === 'sprinter' ? enemy.turretAngle : enemy.angle;
      drawTank(ctx, enemy.x, enemy.y, enemy.angle, turretAngle, enemy.treadOffset, enemy.color);

      // Draw tracking indicator for sprinters when locked on
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
      // Exterminator = fast buggy with wheels
      drawBuggy(ctx, enemy.x, enemy.y, enemy.angle, enemy.treadOffset, enemy.color);
    }
  };

  const drawBullet = (ctx: CanvasRenderingContext2D, bullet: RipOffBullet) => {
    const color = bullet.ownerId === 'enemy' ? '#f80' : '#0f0';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawFuel = (ctx: CanvasRenderingContext2D, fuel: RipOffFuel) => {
    if (fuel.dead) return;
    drawShape(ctx, fuel.x, fuel.y, 0, RIPOFF_SHAPES.fuel, '#0af');
  };

  const drawPowerUp = (ctx: CanvasRenderingContext2D, powerup: RipOffPowerUp) => {
    // Blinking when about to expire
    if (powerup.life < 100 && Math.floor(powerup.life / 10) % 2 === 0) {
      return;
    }

    const pulse = Math.sin(Date.now() / 100) * 0.3 + 1;
    const spinAngle = Date.now() / 200; // Spinning effect

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
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: RipOffParticle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const drawPopup = (ctx: CanvasRenderingContext2D, popup: PopupText) => {
    const alpha = popup.life / 60;
    ctx.fillStyle = popup.color;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(popup.text, popup.x, popup.y);
    ctx.globalAlpha = 1;
  };

  // Game loop
  const gameLoop = useCallback(() => {
    try {
      update();
      draw();
      requestRef.current = requestAnimationFrame(gameLoop);
    } catch (error) {
      console.error('[ERROR] Game loop crashed:', error);
      // Don't continue the loop if there's an error
    }
  }, [update, draw]);

  // Initialize on mount
  useEffect(() => {
    audioService.init();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 45;

    initGame();

    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setInternalState(RipOffState.PLAYING);
          requestRef.current = requestAnimationFrame(gameLoop);
          return null;
        }
        audioService.playCountdown();
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      cancelAnimationFrame(requestRef.current);
      audioService.stopAll();
      inputServiceRef.current.destroy();
    };
  }, [initGame, gameLoop]);

  // Keyboard handler for pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (internalStateRef.current === RipOffState.PLAYING) {
          setInternalState(RipOffState.PAUSED);
          cancelAnimationFrame(requestRef.current);
          audioService.stopAll();
        } else if (internalStateRef.current === RipOffState.PAUSED) {
          setInternalState(RipOffState.PLAYING);
          requestRef.current = requestAnimationFrame(gameLoop);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameLoop]);

  // Pause/resume music when game is paused
  useEffect(() => {
    if (internalState === RipOffState.PAUSED) {
      audioService.pauseMusic();
    } else if (internalState === RipOffState.PLAYING) {
      audioService.resumeMusic();
    }
  }, [internalState]);

  // Render HUD and overlays
  if (countdown !== null) {
    return (
      <div className="absolute top-0 left-0 w-full h-full bg-black flex items-center justify-center">
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
        <div className="text-[120px] text-[#0f0] font-bold animate-pulse z-10">{countdown}</div>
      </div>
    );
  }

  if (internalState === RipOffState.PAUSED) {
    return (
      <div className="absolute top-0 left-0 w-full h-full bg-black">
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
        <div className="absolute top-0 left-0 w-full h-full bg-black/85 backdrop-blur-sm flex flex-col justify-center items-center z-50">
          <h2 className="text-[#0af] text-4xl mb-8">PAUSED</h2>
          <div className="flex gap-4 mb-8">
            <ArcadeButton onClick={() => {
              setInternalState(RipOffState.PLAYING);
              requestRef.current = requestAnimationFrame(gameLoop);
            }}>
              RESUME
            </ArcadeButton>
            <ArcadeButton variant="secondary" onClick={() => onFailure(currentScore)}>
              QUIT
            </ArcadeButton>
          </div>

          {/* Debug: Jump to Act */}
          {onJumpToAct && (
            <div className="mt-4 border-t border-[#333] pt-4">
              <p className="text-[#666] text-sm mb-3 text-center">DEBUG: Jump to Act</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onJumpToAct(1)}
                  className="px-4 py-2 bg-[#222] border border-[#444] text-[#888] hover:text-[#0f0] hover:border-[#0f0] transition-colors text-sm"
                >
                  ACT I
                </button>
                <button
                  onClick={() => onJumpToAct(2)}
                  className="px-4 py-2 bg-[#222] border border-[#444] text-[#888] hover:text-[#fa0] hover:border-[#fa0] transition-colors text-sm"
                >
                  ACT II
                </button>
                <button
                  onClick={() => onJumpToAct(3)}
                  className="px-4 py-2 bg-[#222] border border-[#444] text-[#888] hover:text-[#0af] hover:border-[#0af] transition-colors text-sm"
                >
                  ACT III
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black">
      <canvas ref={canvasRef} className="absolute top-0 left-0" />

      {/* Wave Announcement */}
      {waveAnnouncement && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20 pointer-events-none">
          <div className="text-[80px] text-[#0f0] font-bold tracking-[8px] animate-pulse drop-shadow-[0_0_20px_#0f0]">
            {waveAnnouncement}
          </div>
          {tacticalModeActive && (
            <div className="text-[24px] text-[#f00] mt-4 animate-pulse">
              SWARM ADAPTING...
            </div>
          )}
        </div>
      )}

      {/* HUD */}
      <div className="absolute bottom-0 left-0 w-full h-[45px] bg-black/90 border-t border-[#333] flex items-center justify-between px-8 font-mono text-sm z-10">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <span className="text-[#888]">SCORE:</span>
            <span className="text-white font-bold">{currentScore}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#888]">WAVE:</span>
            <span className="text-[#0af] font-bold">{wave}</span>
            <span className="text-[#888]">-</span>
            <span className="text-[#0af] font-bold">{round + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#888]">FUEL:</span>
            <span className="text-[#0af] font-bold">{fuelsRef.current.filter(f => !f.dead).length}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#888]">TANKS:</span>
          <div className="flex gap-1">
            {Array.from({ length: lives }).map((_, i) => (
              <svg key={i} width="24" height="20" viewBox="-16 -14 32 28">
                {/* Tank body */}
                <rect x="-10" y="-6" width="20" height="12" fill="none" stroke="#0f0" strokeWidth="1.5" />
                {/* Left tread */}
                <rect x="-12" y="6" width="24" height="3" fill="none" stroke="#0f0" strokeWidth="1" />
                {/* Right tread */}
                <rect x="-12" y="-9" width="24" height="3" fill="none" stroke="#0f0" strokeWidth="1" />
                {/* Turret line */}
                <line x1="0" y1="0" x2="14" y2="0" stroke="#0f0" strokeWidth="2" />
                {/* Turret base */}
                <circle cx="0" cy="0" r="3" fill="none" stroke="#0f0" strokeWidth="1" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RipOffGame;
