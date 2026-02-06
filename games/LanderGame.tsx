import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameActProps, LanderState, KeyMap, Ship, TerrainSegment, Particle, Vector, Debris, ShipSystem } from '../types';
import { GRAVITY, THRUST_POWER, ROTATION_ACCEL, ROTATION_DRAG, FRICTION, INITIAL_FUEL, SCREEN_COLORS, DEFAULT_KEYMAP, MAX_SAFE_VELOCITY_X, MAX_SAFE_VELOCITY_Y, MAX_SURVIVABLE_VELOCITY_Y, MAX_SAFE_ANGLE, WORLD_WIDTH, MAX_ZOOM, ZOOM_THRESHOLD, MAX_ABSOLUTE_VELOCITY } from '../constants';
import { audioService } from '../services/audioService';
import { ArcadeButton } from '../components/ArcadeButton';

const SYSTEM_LABELS: Record<ShipSystem, string> = {
    'THRUST': 'MAIN THRUST COILS',
    'STABILITY': 'GYRO STABILIZERS',
    'HULL': 'STRUCTURAL INTEGRITY',
    'COMMS': 'LONG-RANGE COMMS'
};

const LanderGame: React.FC<GameActProps> = ({ initialFuel, initialScore, onComplete, onFailure, onJumpToAct }) => {
  // --- Refs for Game Loop ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // HUD Refs
  const fuelGaugeRef = useRef<HTMLDivElement>(null);
  const hullGaugeRef = useRef<HTMLDivElement>(null);
  const speedReadoutRef = useRef<HTMLSpanElement>(null);
  const vSpeedReadoutRef = useRef<HTMLSpanElement>(null); 
  const altitudeReadoutRef = useRef<HTMLSpanElement>(null);
  const statusOverlayRef = useRef<HTMLDivElement>(null);
  
  // Game State
  const [internalState, setInternalState] = useState<LanderState>(LanderState.PLAYING);
  const [currentScore, setCurrentScore] = useState(initialScore);
  const [countdown, setCountdown] = useState<number | null>(null);

  // State Ref for Event Listeners (Fixes the Pause key closure issue)
  const internalStateRef = useRef(LanderState.PLAYING);
  const currentScoreRef = useRef(initialScore);

  // Damage Report Logic
  const [damageReportState, setDamageReportState] = useState<'IDLE' | 'ANALYZING' | 'PRINTING' | 'FINISHED'>('IDLE');
  const [reportLines, setReportLines] = useState<string[]>([]);
  
  // Mutable Game Objects
  const shipRef = useRef<Ship>({
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    angle: -Math.PI / 2, 
    angularVel: 0,
    fuel: initialFuel,
    integrity: 100,
    dead: false,
    landed: false,
    suspension: 0,
    suspensionVel: 0,
    enginePower: 0,
    systemStatus: {
        'THRUST': 100,
        'STABILITY': 100,
        'HULL': 100,
        'COMMS': 100
    }
  });

  const sequenceRef = useRef<{
      active: boolean;
      mode: 'LANDING' | 'REFUEL' | 'FUEL_COMPLETE' | 'COUNTDOWN' | 'LIFTOFF' | 'NONE';
      targetFuel: number;
      timer: number;
      padSegment?: TerrainSegment;
      pendingSegment?: TerrainSegment;
      damageQueue?: string[];
  }>({
      active: false,
      mode: 'NONE',
      targetFuel: 0,
      timer: 0
  });

  // Landing settling tracker - counts frames where ship is "mostly landed"
  const landingSettleRef = useRef<{
      framesOnPad: number;
      currentPad: TerrainSegment | null;
      accumulatedDamage: number;
  }>({
      framesOnPad: 0,
      currentPad: null,
      accumulatedDamage: 0
  });
  
  const terrainRef = useRef<TerrainSegment[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const debrisRef = useRef<Debris[]>([]);
  
  // Input Refs
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<boolean>(false);
  const keyMapRef = useRef<KeyMap>(DEFAULT_KEYMAP);
  
  const starsRef = useRef<{ x: number; y: number; size: number; isTwinkling: boolean; twinklePhase: number; twinkleSpeed: number; }[]>([]);
  const screenShakeRef = useRef<number>(0);
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const devSettingsRef = useRef({ flameScale: 2.0 });

  // Sync internalState and score to Refs
  useEffect(() => {
      internalStateRef.current = internalState;
  }, [internalState]);

  useEffect(() => {
      currentScoreRef.current = currentScore;
  }, [currentScore]);

  // --- Initialization ---
  const initTerrain = useCallback(() => {
    const segments: TerrainSegment[] = [];
    const height = window.innerHeight; // Assume full screen for init
    
    // Config for the "Journey"
    const fuelDepotCount = 3;
    const playableWidth = WORLD_WIDTH - 600; 
    const segmentWidth = playableWidth / (fuelDepotCount + 1); 

    let currentX = 0;
    let currentY = height * 0.6;
    
    segments.push({ x1: currentX, y1: currentY, x2: currentX + 300, y2: currentY, multiplier: 0, isPad: false, padType: 'start' });
    currentX += 300;

    let nextFeatureX = currentX + segmentWidth;
    let padsPlaced = 0;

    while (currentX < WORLD_WIDTH - 400) { 
        if (currentX > nextFeatureX && padsPlaced < fuelDepotCount) {
             const r = Math.random();
             // Wider pads to accommodate tanks visually
             let padWidth = 140; 
             let multiplier = 2;
             
             if (r > 0.7) { multiplier = 5; padWidth = 100; } 
             else if (r > 0.4) { multiplier = 3; padWidth = 140; } 
             else { multiplier = 2; padWidth = 180; }

             const capacity = 500 + Math.floor(Math.random() * 500);

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
             const steps = Math.floor(Math.random() * 4) + 2;
             for (let i = 0; i < steps; i++) {
                 if (currentX > nextFeatureX && padsPlaced < fuelDepotCount) break;
                 if (currentX >= WORLD_WIDTH - 400) break;

                 const dx = 30 + Math.random() * 80;
                 const nextX = Math.min(WORLD_WIDTH - 400, currentX + dx);
                 let dy = (Math.random() - 0.5) * 250; 
                 if (currentY < height * 0.2) dy += 80;
                 if (currentY > height * 0.8) dy -= 80;

                 let nextY = currentY + dy;
                 nextY = Math.max(height * 0.15, Math.min(height * 0.9, nextY));

                 segments.push({ x1: currentX, y1: currentY, x2: nextX, y2: nextY, multiplier: 0, isPad: false });
                 currentX = nextX;
                 currentY = nextY;
             }
        }
    }

    const baseY = height * 0.7;
    segments.push({ x1: currentX, y1: currentY, x2: currentX + 50, y2: baseY, multiplier: 0, isPad: false });
    currentX += 50;
    segments.push({ x1: currentX, y1: baseY, x2: currentX + 300, y2: baseY, multiplier: 10, isPad: true, padType: 'base' });
    currentX += 300;
    segments.push({ x1: currentX, y1: baseY, x2: currentX + 100, y2: height * 0.5, multiplier: 0, isPad: false });
    currentX += 100;
    segments.push({ x1: currentX, y1: height * 0.5, x2: currentX, y2: height * 2, multiplier: 0, isPad: false });
    segments.push({ x1: 0, y1: segments[0].y1, x2: 0, y2: height * 2, multiplier: 0, isPad: false });

    terrainRef.current = segments;
  }, []);

  const initStars = (width: number, height: number) => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push({ 
          x: Math.random() * width, 
          y: Math.random() * height,
          size: Math.random() < 0.3 ? 2 : 1,
          isTwinkling: Math.random() < 0.1,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.02 + Math.random() * 0.04
      });
    }
    starsRef.current = stars;
  };

  const resetShip = () => {
    const height = canvasRef.current ? canvasRef.current.height : 800;
    shipRef.current = {
      pos: { x: 100, y: height * 0.1 },
      vel: { x: 1.8, y: 0 }, 
      angle: -Math.PI / 2, 
      angularVel: 0,
      fuel: initialFuel,
      integrity: 100,
      dead: false,
      landed: false,
      suspension: 0,
      suspensionVel: 0,
      enginePower: 0,
      systemStatus: {
          'THRUST': 100,
          'STABILITY': 100,
          'HULL': 100,
          'COMMS': 100
      }
    };
    cameraRef.current = { x: 100, y: height * 0.15, zoom: 1 };
  };

  const getTerrainY = (x: number): { y: number, segment: TerrainSegment | null } => {
      for (const seg of terrainRef.current) {
          if (x >= seg.x1 && x <= seg.x2) {
              const t = (x - seg.x1) / (seg.x2 - seg.x1);
              return { y: seg.y1 + t * (seg.y2 - seg.y1), segment: seg };
          }
      }
      return { y: 2000, segment: null };
  };

  // --- Debris & Explosion Logic ---
  const breakShip = (ship: Ship) => {
    const s = ship.angle + Math.PI/2; 
    const cos = Math.cos(s);
    const sin = Math.sin(s);
    const createDebris = (points: Vector[], offsetX: number, offsetY: number, vAngOffset: number) => {
        const wx = ship.pos.x + (offsetX * cos - offsetY * sin);
        const wy = ship.pos.y + (offsetX * sin + offsetY * cos);
        debrisRef.current.push({
            x: wx, y: wy,
            vx: ship.vel.x + (Math.random() - 0.5) * 2,
            vy: ship.vel.y + (Math.random() - 0.5) * 2 - 1,
            angle: s,
            vAngle: ship.angularVel + vAngOffset + (Math.random() - 0.5) * 0.2,
            color: '#fff', shape: points, life: 300
        });
    };
    createDebris([{x: -7, y: -4}, {x: 7, y: -4}, {x: 7, y: -12}, {x: -7, y: -12}], 0, -8, 0.1);
    createDebris([{x: -9, y: 0}, {x: 9, y: 0}, {x: 7, y: 6}, {x: -7, y: 6}], 0, 3, -0.1);
    createDebris([{x: 0, y: 0}, {x: -6, y: 10}], -9, 6, 0.2);
    createDebris([{x: 0, y: 0}, {x: 6, y: 10}], 9, 6, -0.2);
    createExplosion(ship.pos.x, ship.pos.y, '#f04');
    screenShakeRef.current = 20;
    audioService.playExplosion();
  };

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 40; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3;
        particlesRef.current.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 60 + Math.random() * 40, maxLife: 100, color
        });
    }
  };

  const createSparks = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
        const angle = -Math.PI/2 + (Math.random()-0.5) * 2;
        const speed = Math.random() * 5 + 3;
        particlesRef.current.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 20 + Math.random() * 15, maxLife: 35, color: '#fd0'
        });
    }
  };

  const createDustCloud = (x: number, y: number) => {
    for (let i = 0; i < 25; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; 
        const speed = Math.random() * 2 + 0.5;
        const rand = Math.random();
        particlesRef.current.push({
            x: x + (Math.random() - 0.5) * 20, y: y + 8,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 40 + Math.random() * 30, maxLife: 70, color: rand > 0.7 ? '#fff' : (rand < 0.3 ? '#888' : '#aaa')
        });
    }
  };

  // --- Report Generation & Systems Logic ---
  
  const applyDamage = (amount: number): string[] => {
      const ship = shipRef.current;
      const logs: string[] = [];
      const previousSystems = { ...ship.systemStatus };
      
      // Reduce Hull
      ship.integrity = Math.max(0, ship.integrity - amount);
      ship.systemStatus['HULL'] = ship.integrity;
      
      // Randomly damage other systems
      const roll = Math.random();
      if (roll > 0.4) {
          const dmg = Math.floor(Math.random() * amount * 0.8);
          ship.systemStatus['THRUST'] = Math.max(0, ship.systemStatus['THRUST'] - dmg);
      }
      if (roll < 0.6) {
          const dmg = Math.floor(Math.random() * amount * 0.8);
          ship.systemStatus['STABILITY'] = Math.max(0, ship.systemStatus['STABILITY'] - dmg);
      }

      // Generate Report Lines based on DELTAS and CRITICAL states
      Object.keys(SYSTEM_LABELS).forEach((key) => {
          const k = key as ShipSystem;
          const prev = previousSystems[k];
          const curr = ship.systemStatus[k];
          
          if (curr < prev) {
              logs.push(`${SYSTEM_LABELS[k]} DAMAGED: ${prev}% -> ${curr}%`);
          }
          if (curr < 40) {
              logs.push(`WARNING: ${SYSTEM_LABELS[k]} CRITICAL`);
          }
      });
      
      if (logs.length === 0) logs.push("MINOR HULL ABRASIONS DETECTED.");
      
      return logs;
  };

  const initiateLandingSequence = (segment: TerrainSegment, damageAmount: number = 0) => {
     const ship = shipRef.current;
     ship.landed = true;
     ship.groundY = segment.y1;
     ship.vel = { x: 0, y: 0 };
     ship.angularVel = 0;
     ship.angle = -Math.PI/2;
     audioService.playLanding();
     audioService.stopBackgroundHum();
     
     if (damageAmount > 0) {
         // Calculate damage and generate strings
         const damageLogs = applyDamage(damageAmount);
         
         sequenceRef.current.pendingSegment = segment;
         sequenceRef.current.damageQueue = damageLogs;
         
         setInternalState(LanderState.DAMAGE_REPORT);
         setDamageReportState('ANALYZING');
         setReportLines([]);
     } else {
         proceedWithLanding(segment);
     }
  };
  
  // Effect to handle report timing
  useEffect(() => {
      if (internalState === LanderState.DAMAGE_REPORT && damageReportState === 'ANALYZING') {
          audioService.playDataProcessing();
          const timer = setTimeout(() => {
              setDamageReportState('PRINTING');
          }, 2000);
          return () => clearTimeout(timer);
      }
      
      if (internalState === LanderState.DAMAGE_REPORT && damageReportState === 'PRINTING') {
          const queue = sequenceRef.current.damageQueue || [];
          if (reportLines.length < queue.length) {
              const timer = setTimeout(() => {
                  audioService.playTypewriter();
                  setReportLines(prev => [...prev, queue[prev.length]]);
              }, 600);
              return () => clearTimeout(timer);
          } else {
              setDamageReportState('FINISHED');
          }
      }
  }, [internalState, damageReportState, reportLines]);

  const proceedWithLanding = (segment: TerrainSegment) => {
      const ship = shipRef.current;
      if (segment.padType === 'base') {
         const bonus = 2000 + Math.floor(ship.fuel) + Math.floor(ship.integrity * 10);
         setCurrentScore(s => s + bonus);
         setInternalState(LanderState.LEVEL_COMPLETE);
         // Wrap in timeout to break call stack and ensure parent updates correctly
         setTimeout(() => {
             onComplete({
                 fuelRemaining: ship.fuel,
                 scoreGained: bonus,
                 hullIntegrity: ship.integrity
             });
         }, 2000); // Increased wait so user can see Mission Complete
     } else if (segment.padType === 'fuel') {
         const fuelBonus = segment.multiplier * 150;
         sequenceRef.current = {
             active: true, mode: 'LANDING',
             targetFuel: Math.min(INITIAL_FUEL, ship.fuel + fuelBonus),
             timer: 90, // 1.5 seconds at 60fps for landing sound to finish
             padSegment: segment
         };
         setCurrentScore(s => s + 100 * segment.multiplier);
         setInternalState(LanderState.PLAYING);
     }
  };

  const closeDamageReport = () => {
      if (sequenceRef.current.pendingSegment) {
          proceedWithLanding(sequenceRef.current.pendingSegment);
          sequenceRef.current.pendingSegment = undefined;
          setDamageReportState('IDLE');
          setReportLines([]);
      }
  };

  // --- Main Update Loop ---
  const update = () => {
    // IMPORTANT: Check ref here instead of state variable, because closure captures initial state
    if (internalStateRef.current !== LanderState.PLAYING) {
        audioService.setThrust(false); 
        return;
    }
    
    const ship = shipRef.current;
    
    // --- SUSPENSION PHYSICS ---
    // Spring-Damper System
    const springK = 0.15; // Spring Stiffness
    const damping = 0.85; // Damping Factor
    
    // Force pulling suspension back to 0 (extended)
    const springForce = (0 - ship.suspension) * springK;
    
    ship.suspensionVel += springForce;
    ship.suspensionVel *= damping;
    ship.suspension += ship.suspensionVel;
    
    // Hard Limit on extension (cannot go below 0)
    if (ship.suspension < 0) {
        ship.suspension = 0;
        ship.suspensionVel = 0;
    }
    
    if (sequenceRef.current.active) {
        const seq = sequenceRef.current;
        if (seq.mode === 'LANDING' && ship.landed) {
            seq.timer--;
            if (statusOverlayRef.current) {
                statusOverlayRef.current.innerHTML = `<div class="flex flex-col items-center drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]"><div class="text-[#0f0] text-3xl font-bold tracking-widest">TOUCHDOWN</div></div>`;
            }
            if (seq.timer <= 0) {
                seq.mode = 'REFUEL';
                audioService.startFueling();
            }
        }
        else if (seq.mode === 'REFUEL' && ship.landed) {
            const fillRate = 1.5; 
            const pad = seq.padSegment;
            let actualFill = fillRate;
            if (pad && pad.fuelCurrent !== undefined) {
                if (pad.fuelCurrent <= 0) actualFill = 0;
                else {
                    const available = Math.min(fillRate, pad.fuelCurrent);
                    pad.fuelCurrent -= available;
                    actualFill = available;
                }
            }
            ship.fuel = Math.min(seq.targetFuel, ship.fuel + actualFill);
            const isDepleted = pad && pad.fuelCurrent !== undefined && pad.fuelCurrent <= 0;
            const isFull = ship.fuel >= seq.targetFuel;
            if (statusOverlayRef.current) {
                const pct = Math.floor((ship.fuel / INITIAL_FUEL) * 100);
                const statusText = isDepleted ? "DEPOT EMPTY" : "REFUELING...";
                const color = isDepleted ? "text-[#f04]" : "text-[#0f0]";
                // Minimal overlay, rely on the tanks now
                statusOverlayRef.current.innerHTML = `<div class="flex flex-col items-center drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]"><div class="${color} text-3xl font-bold animate-pulse tracking-widest">${statusText}</div></div>`;
            }
            if (isFull || (isDepleted && ship.fuel > 100)) {
                seq.mode = 'FUEL_COMPLETE';
                seq.timer = 120; // 2 seconds at 60fps to let sound finish
                audioService.stopFueling();
            } else if (isDepleted && ship.fuel <= 100) {
                 seq.mode = 'FUEL_COMPLETE';
                 seq.timer = 120;
                 audioService.stopFueling();
            }
        }
        else if (seq.mode === 'FUEL_COMPLETE') {
            seq.timer--;
            if (statusOverlayRef.current) {
                statusOverlayRef.current.innerHTML = `<div class="flex flex-col items-center drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]"><div class="text-[#0f0] text-3xl font-bold tracking-widest">FUEL TRANSFER COMPLETE</div></div>`;
            }
            if (seq.timer <= 0) {
                seq.mode = 'COUNTDOWN';
                seq.timer = 4 * 60;
            }
        }
        else if (seq.mode === 'COUNTDOWN') {
            if (seq.timer % 60 === 0 && seq.timer > 0) audioService.playCountdown();
            seq.timer--;
            const secondsLeft = Math.ceil(seq.timer / 60);
            if (statusOverlayRef.current) {
                statusOverlayRef.current.innerHTML = `<div class="flex flex-col items-center justify-center drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] scale-150 transform"><div class="text-[#0af] text-xl tracking-[0.5em] font-bold mb-2 animate-pulse">AUTO-SEQUENCE</div><div class="text-white text-[100px] font-bold leading-none" style="text-shadow: 0 0 20px rgba(0,255,255,0.5)">${secondsLeft > 0 ? secondsLeft : 'IGNITION'}</div></div>`;
            }
            if (seq.timer <= 0) {
                seq.mode = 'LIFTOFF';
                seq.timer = 180;
                ship.landed = false;
                ship.groundY = undefined;
                ship.enginePower = 1.0;
                createDustCloud(ship.pos.x, ship.pos.y);
                ship.pos.y -= 5; ship.vel.y = 0; ship.vel.x = 0;
                if (statusOverlayRef.current) statusOverlayRef.current.innerText = '';
                audioService.setThrust(true);
                audioService.startBackgroundHum();
            }
        }
        else if (seq.mode === 'LIFTOFF') {
            seq.timer--;
            if (seq.timer <= 0) {
                seq.mode = 'NONE';
                seq.active = false;
                audioService.setThrust(false); 
            }
        }
    }

    // Input Check: Spacebar OR Mouse Left Click (mouseRef)
    const thrustInput = keysRef.current[keyMapRef.current.thrust] || mouseRef.current;

    if (ship.landed && !ship.dead && !sequenceRef.current.active && thrustInput && ship.fuel > 0) {
        ship.landed = false;
        ship.groundY = undefined;
        ship.pos.y -= 5;
        ship.vel.y = -0.5;
        if (statusOverlayRef.current) statusOverlayRef.current.innerText = '';
        audioService.startBackgroundHum();
    }

    if (!ship.dead && !ship.landed) {
        const isAutoSequence = sequenceRef.current.active && sequenceRef.current.mode === 'LIFTOFF';
        const isThrusting = (thrustInput && ship.fuel > 0) || isAutoSequence;
        
        if (isThrusting) {
            ship.enginePower += 0.15;
            const thrustMultiplier = isAutoSequence ? 0.45 : 1.0; 
            const fuelCost = isAutoSequence ? 0.2 : 1.0;
            
            // --- SYSTEM DAMAGE EFFECTS: THRUST ---
            // If thrust system is damaged, max power is reduced
            const systemHealth = ship.systemStatus['THRUST'];
            const damageFactor = systemHealth < 50 ? 0.5 : (systemHealth < 80 ? 0.8 : 1.0);
            
            ship.vel.x += Math.cos(ship.angle) * (THRUST_POWER * thrustMultiplier * damageFactor);
            ship.vel.y += Math.sin(ship.angle) * (THRUST_POWER * thrustMultiplier * damageFactor);
            ship.fuel -= fuelCost;
            
            const exhaustX = ship.pos.x - Math.cos(ship.angle) * 12;
            const exhaustY = ship.pos.y - Math.sin(ship.angle) * 12;
            if (Math.random() > 0.5) {
                particlesRef.current.push({
                    x: exhaustX, y: exhaustY,
                    vx: ship.vel.x - Math.cos(ship.angle) * 2 + (Math.random()-0.5),
                    vy: ship.vel.y - Math.sin(ship.angle) * 2 + (Math.random()-0.5),
                    life: 10, maxLife: 10, color: Math.random() > 0.5 ? '#fff' : '#0ff'
                });
            }
        } else {
            ship.enginePower -= 0.15;
        }
        ship.enginePower = Math.max(0, Math.min(1, ship.enginePower));
        audioService.setThrust(isThrusting);

        let inputRot = 0;
        if (!isAutoSequence) {
            if (keysRef.current[keyMapRef.current.left]) inputRot = -1;
            if (keysRef.current[keyMapRef.current.right]) inputRot = 1;
        }
        
        // --- SYSTEM DAMAGE EFFECTS: STABILITY ---
        // If stability is damaged, add random drift
        if (ship.systemStatus['STABILITY'] < 70 && !ship.landed) {
             if (Math.random() < 0.05) {
                 ship.angularVel += (Math.random() - 0.5) * 0.01;
             }
        }
        
        ship.angularVel += inputRot * ROTATION_ACCEL;
        ship.angularVel *= ROTATION_DRAG;
        ship.angle += ship.angularVel;
        ship.vel.y += GRAVITY;
        ship.vel.x *= FRICTION;
        ship.vel.y *= FRICTION;
        ship.vel.x = Math.max(-MAX_ABSOLUTE_VELOCITY, Math.min(MAX_ABSOLUTE_VELOCITY, ship.vel.x));
        ship.vel.y = Math.max(-MAX_ABSOLUTE_VELOCITY, Math.min(MAX_ABSOLUTE_VELOCITY, ship.vel.y));
        ship.pos.x += ship.vel.x;
        ship.pos.y += ship.vel.y;
        if (ship.pos.x < 10) { ship.pos.x = 10; ship.vel.x *= -0.5; }
        if (ship.pos.x > WORLD_WIDTH - 10) { ship.pos.x = WORLD_WIDTH - 10; ship.vel.x *= -0.5; }
        
        // REMOVED CEILING COLLISION

        const rot = ship.angle + Math.PI/2;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const leftLegX = -12; const rightLegX = 12;
        const legY = 16; 
        const wxL = ship.pos.x + (leftLegX * cos - legY * sin);
        const wyL = ship.pos.y + (leftLegX * sin + legY * cos);
        const wxR = ship.pos.x + (rightLegX * cos - legY * sin);
        const wyR = ship.pos.y + (rightLegX * sin + legY * cos);

        const { y: terrainY } = getTerrainY(ship.pos.x);
        if (ship.pos.y + 12 > terrainY) {
            breakShip(ship);
            ship.dead = true;
            handleCrash();
        } else {
            const tL = getTerrainY(wxL);
            const tR = getTerrainY(wxR);
            let contactCount = 0;
            let totalDepth = 0;
            let hittingRoughTerrain = false;

            const handleLegHit = (depth: number, isLeft: boolean, segment: TerrainSegment | null): number => {
                contactCount++;
                totalDepth += depth;
                const impactV = Math.abs(ship.vel.y);
                if (impactV > MAX_SURVIVABLE_VELOCITY_Y) {
                    breakShip(ship);
                    ship.dead = true;
                    handleCrash();
                    return 0;
                }

                let damage = 0;
                if (impactV > MAX_SAFE_VELOCITY_Y) {
                    const excess = impactV - MAX_SAFE_VELOCITY_Y;
                    damage = excess * 60; 
                    if (ship.vel.y > 0) {
                        createSparks(isLeft ? wxL : wxR, tL.y); 
                        screenShakeRef.current = Math.min(10, damage / 2);
                    }
                }
                
                // --- SUSPENSION IMPULSE ---
                // Add velocity to suspension based on impact speed
                if (impactV > 0.1) {
                    ship.suspensionVel += impactV * 0.4;
                }
                
                if (!segment?.isPad) hittingRoughTerrain = true;
                ship.pos.y -= depth * 0.1; 
                ship.vel.y *= -0.1; 
                ship.vel.x *= 0.9;  
                const torque = (isLeft ? 1 : -1) * (depth * 0.005) + (ship.vel.x * 0.01);
                ship.angularVel += torque;
                
                return damage;
            };

            let legDamage = 0;
            if (wyL > tL.y && !ship.dead) legDamage += handleLegHit(wyL - tL.y, true, tL.segment);
            if (wyR > tR.y && !ship.dead) legDamage += handleLegHit(wyR - tR.y, false, tR.segment);

            if (contactCount > 0 && !ship.dead) {
                 if (hittingRoughTerrain) {
                     const totalSpeed = Math.hypot(ship.vel.x, ship.vel.y);
                     if (totalSpeed > 0.2) {
                         legDamage += totalSpeed * 0.8; // Scrubbing damage
                         if (Math.random() > 0.5) createDustCloud(ship.pos.x, ship.pos.y);
                     }
                 }
                 
                 // Apply instant kill if accumulated damage in this frame is too high
                 if (ship.integrity - legDamage <= 0) {
                      breakShip(ship);
                      ship.dead = true;
                      handleCrash();
                      return;
                 }

                 const speed = Math.hypot(ship.vel.x, ship.vel.y);
                 const angleError = Math.abs(Math.abs(ship.angle) - Math.PI/2);
                 
                 // IMPROVED SEGMENT LOGIC: Prioritize Pad if straddling
                 let segment = tL.segment;
                 if (tR.segment?.isPad && (!segment?.isPad)) {
                     segment = tR.segment;
                 }
                 if (!segment) segment = tR.segment;

                 // REMOVED OLD SUSPENSION SETTING LOGIC (Using Spring Physics now)

                 // Landing detection with settling mechanism
                 // Instead of requiring perfect conditions in a single frame, we track
                 // consecutive frames of "close enough" contact and trigger landing after stabilizing
                 const settle = landingSettleRef.current;

                 // Check if we're on a pad with reasonable conditions
                 const speedOk = speed < 1.0; // Very forgiving for initial contact
                 const angleOk = angleError < MAX_SAFE_ANGLE * 2; // ~22 degrees for initial contact
                 const isOnPad = segment?.isPad && contactCount >= 1 && speedOk && angleOk;

                 if (isOnPad) {
                     // Accumulate frames on this pad
                     if (settle.currentPad === segment) {
                         settle.framesOnPad++;
                         settle.accumulatedDamage += legDamage;
                     } else {
                         // New pad, reset counter
                         settle.framesOnPad = 1;
                         settle.currentPad = segment;
                         settle.accumulatedDamage = legDamage;
                     }

                     // After 10 frames (~160ms) of contact, complete landing
                     // OR if perfectly stable (low speed, good angle), land immediately
                     const isStable = speed < 0.3 && angleError < MAX_SAFE_ANGLE;
                     const hasSettled = settle.framesOnPad >= 10 && speed < 0.6;

                     if (isStable || hasSettled) {
                         const totalDamage = settle.accumulatedDamage;
                         settle.framesOnPad = 0;
                         settle.currentPad = null;
                         settle.accumulatedDamage = 0;
                         initiateLandingSequence(segment, totalDamage);
                     }
                 } else {
                     // Not on pad or conditions too bad, reset settling
                     settle.framesOnPad = 0;
                     settle.currentPad = null;
                     settle.accumulatedDamage = 0;
                 }
            } else {
                // REMOVED OLD RESTORATION LOGIC (Using Spring Physics now)
            }
        }
    } else if (ship.dead) {
        audioService.setThrust(false);
    }
    
    debrisRef.current.forEach(d => {
        d.x += d.vx; d.y += d.vy; d.angle += d.vAngle; d.vy += GRAVITY;
        const { y: gY } = getTerrainY(d.x);
        if (d.y > gY) { d.y = gY; d.vy *= -0.5; d.vx *= 0.8; d.vAngle *= 0.8; }
        d.life--;
    });
    debrisRef.current = debrisRef.current.filter(d => d.life > 0);

    // --- Updated Camera Logic ---
    const cam = cameraRef.current;
    
    // Default Camera Target is the Ship, looking ahead based on velocity
    let targetCamX = ship.pos.x + (ship.vel.x * 20); 
    let targetCamY = ship.pos.y;
    let targetZoom = 1;
    
    // Find the NEXT important segment (Fuel or Base)
    // We want the one closest to us that we are either approaching or currently over
    const nextPad = terrainRef.current.find(s => 
        s.isPad && 
        s.x2 > ship.pos.x - 200 && // We haven't fully passed it yet (with margin)
        (s.padType === 'fuel' || s.padType === 'base')
    );

    // X Tracking & Zoom
    if (nextPad) {
        const padCenter = (nextPad.x1 + nextPad.x2) / 2;
        const distToPad = Math.abs(padCenter - ship.pos.x);
        
        // Range to influence camera behavior
        const TRACKING_RANGE = 1500;
        
        if (distToPad < TRACKING_RANGE) {
            // Smoothly interpolate between "Look Ahead" and "Look at Midpoint"
            const influence = Math.max(0, 1 - (distToPad / TRACKING_RANGE));
            
            // Target is midpoint between ship and pad
            const midPoint = (ship.pos.x + padCenter) / 2;
            
            // Blend: Default LookAhead vs Midpoint
            targetCamX = (targetCamX * (1 - influence)) + (midPoint * influence);
            
            // ZOOM LOGIC
            // Critical Change: Calculate altitude relative to the PAD, not the terrain below.
            // This prevents "jerkiness" when flying over spires or rocks.
            const altAbovePad = nextPad.y1 - ship.pos.y;
            
            // Zoom conditions: Closer than 800px X, Lower than 600px Y
            if (distToPad < 800 && altAbovePad < 600 && altAbovePad > -50) {
                 const xFactor = 1 - (distToPad / 800);
                 const yFactor = 1 - (Math.max(0, altAbovePad) / 600);
                 
                 // Smooth ease curve
                 const combinedFactor = xFactor * yFactor;
                 const ease = combinedFactor * combinedFactor; // Quadratic easing for softer onset
                 
                 targetZoom = 1 + (1.2 * ease); // Max zoom 2.2
            }
        }
    }
    
    // Y Tracking
    // We want to frame the ship and the ground, but avoid jerking on spires.
    // We use a blend based on altitude.
    const { y: currentGroundY } = getTerrainY(ship.pos.x);
    const trueAltitude = currentGroundY - ship.pos.y;
    
    // Smoothly blend the camera target Y based on altitude
    let groundInfluence = 0;
    if (trueAltitude < 500) {
        // Quadratic ease-in of ground influence as we get lower
        groundInfluence = Math.pow(1 - (trueAltitude / 500), 2); 
    }
    
    // Ideal low-altitude target: Centered between ship and ground
    const idealMidpointY = (ship.pos.y + currentGroundY) / 2 - (100 / cam.zoom);
    
    // Blend ship-lock (high alt) with midpoint-lock (low alt)
    targetCamY = ship.pos.y + (idealMidpointY - ship.pos.y) * groundInfluence;

    // Apply Smoothing
    // Reduced factors for softer, more cinematic feel
    cam.x += (targetCamX - cam.x) * 0.02; 
    cam.y += (targetCamY - cam.y) * 0.02; 
    cam.zoom += (targetZoom - cam.zoom) * 0.01; // Reduced to 0.01 (half speed)

    particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
  };

  const handleCrash = () => {
    setInternalState(LanderState.CRASHED);
    audioService.stopAct1Sfx();
    if (statusOverlayRef.current) statusOverlayRef.current.innerText = 'CRITICAL FAILURE';
    setTimeout(() => {
        onFailure(currentScoreRef.current);
    }, 2500);
  };

  const draw = () => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = SCREEN_COLORS.bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.save();
    if (screenShakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
    }

    const cam = cameraRef.current;
    starsRef.current.forEach(s => {
        const pX = (s.x - cam.x * 0.05 + WORLD_WIDTH) % cvs.width; 
        const screenX = (pX + cvs.width) % cvs.width;
        let alpha = s.isTwinkling ? 0.4 + (Math.sin(s.twinklePhase += s.twinkleSpeed) + 1) * 0.4 : (s.size === 2 ? 0.6 : 0.3);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(screenX, s.y, s.size, s.size);
    });

    ctx.save();
    ctx.translate(cvs.width / 2, cvs.height / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    const lw = 1 / cam.zoom; 

    // Fill Terrain
    ctx.fillStyle = '#000';
    if (terrainRef.current.length > 1) {
        ctx.beginPath();
        const segs = terrainRef.current;
        ctx.moveTo(segs[0].x1, 10000);
        ctx.lineTo(segs[0].x1, segs[0].y1);
        for (let i = 0; i < segs.length - 1; i++) ctx.lineTo(segs[i].x2, segs[i].y2);
        ctx.lineTo(segs[segs.length - 2].x2, 10000);
        ctx.closePath();
        ctx.fill();
    }

    ctx.strokeStyle = SCREEN_COLORS.secondary;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (const seg of terrainRef.current) {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
    }
    ctx.stroke();

    for (const seg of terrainRef.current) {
        if (seg.isPad) {
            ctx.strokeStyle = SCREEN_COLORS.primary;
            ctx.lineWidth = 2 * lw;
            ctx.shadowColor = SCREEN_COLORS.primary;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.fillStyle = SCREEN_COLORS.primary;
            ctx.font = `${14 * lw}px 'Courier Prime'`;
            ctx.textAlign = "center";
            let label = `${seg.multiplier}X`;
            if (seg.padType === 'fuel') label = "FUEL STORE";
            if (seg.padType === 'base') label = "COMMAND BASE";
            ctx.fillText(label, (seg.x1 + seg.x2) / 2, seg.y1 + 25);
            
            // --- DRAW FUEL TANKS ---
            if (seg.padType === 'fuel' && seg.fuelMax !== undefined && seg.fuelCurrent !== undefined) {
                const tankW = 20 * lw;
                const tankH = 60 * lw;
                const fillPct = seg.fuelCurrent / seg.fuelMax;
                const fillH = tankH * fillPct;
                
                // Color based on fill
                const tankColor = fillPct > 0.5 ? '#0f0' : (fillPct > 0.2 ? '#fd0' : '#f04');
                
                // Determine X based on assigned side, sitting ON the pad
                const tankX = seg.tankSide === 'left' ? seg.x1 + (5 * lw) : seg.x2 - tankW - (5 * lw);
                const baseY = seg.y1;

                // Draw Single Tank
                const drawTank = (x: number) => {
                     // Outline with Rounded Top
                     ctx.strokeStyle = '#555';
                     ctx.lineWidth = lw;
                     
                     ctx.beginPath();
                     // Start bottom left
                     ctx.moveTo(x, baseY);
                     // Line up
                     ctx.lineTo(x, baseY - tankH + 10);
                     // Curve Top Left
                     ctx.quadraticCurveTo(x, baseY - tankH, x + 10, baseY - tankH);
                     // Line across top
                     ctx.lineTo(x + tankW - 10, baseY - tankH);
                     // Curve Top Right
                     ctx.quadraticCurveTo(x + tankW, baseY - tankH, x + tankW, baseY - tankH + 10);
                     // Line down
                     ctx.lineTo(x + tankW, baseY);
                     // Close
                     ctx.lineTo(x, baseY);
                     ctx.stroke();
                     
                     // Fill
                     if (fillPct > 0) {
                         ctx.fillStyle = tankColor;
                         // Clipping region for the rounded shape so fill stays inside
                         ctx.save();
                         ctx.clip(); // Use the path defined above
                         ctx.fillRect(x, baseY - fillH, tankW, fillH);
                         ctx.restore();
                     }

                     // Little antenna detail on top
                     ctx.strokeStyle = '#555';
                     ctx.beginPath(); ctx.moveTo(x + tankW/2, baseY - tankH); ctx.lineTo(x + tankW/2, baseY - tankH - (10*lw)); ctx.stroke();
                     // Blinking light
                     if (Math.floor(Date.now() / 500) % 2 === 0) {
                        ctx.fillStyle = '#f04';
                        ctx.fillRect(x + tankW/2 - lw, baseY - tankH - (12*lw), 2*lw, 2*lw);
                     }
                };

                drawTank(tankX);
            }
        }
    }

    const ship = shipRef.current;
    if (!ship.dead) {
        ctx.save();
        ctx.translate(ship.pos.x, ship.pos.y);
        ctx.rotate(ship.angle + Math.PI / 2);
        const maxLegH = 10;
        const currentLegH = maxLegH - (ship.suspension * 5); 
        ctx.strokeStyle = '#fff'; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(-12, 6 + currentLegH); ctx.lineTo(-4, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-14, 6 + currentLegH); ctx.lineTo(-10, 6 + currentLegH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(12, 6 + currentLegH); ctx.lineTo(4, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(14, 6 + currentLegH); ctx.lineTo(10, 6 + currentLegH); ctx.stroke();
        ctx.fillStyle = '#d4af37'; ctx.strokeStyle = '#b8860b';
        ctx.beginPath(); ctx.moveTo(-7, 6); ctx.lineTo(-9, 0); ctx.lineTo(-7, -4); ctx.lineTo(7, -4); ctx.lineTo(9, 0); ctx.lineTo(7, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-9,0); ctx.lineTo(9,0); ctx.stroke();
        ctx.fillStyle = '#ccc'; ctx.strokeStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-9, -6); ctx.lineTo(-7, -12); ctx.lineTo(0, -13); ctx.lineTo(7, -12); ctx.lineTo(9, -6); ctx.lineTo(7, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
        if (ship.integrity < 50) {
            ctx.fillStyle = `rgba(100,100,100,${(50 - ship.integrity)/50})`;
            ctx.beginPath(); ctx.arc(0, -5, 10, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(-1, -6); ctx.lineTo(-1, -9); ctx.fill();
        ctx.beginPath(); ctx.moveTo(4, -7); ctx.lineTo(1, -6); ctx.lineTo(1, -9); ctx.fill();
        if (ship.enginePower > 0.05 && ship.fuel > 0) {
             ctx.strokeStyle = '#0ff'; ctx.beginPath(); ctx.moveTo(-3, 8);
             const len = (16 * devSettingsRef.current.flameScale * ship.enginePower) + Math.random() * 8 * ship.enginePower;
             ctx.lineTo(0, 8 + len); ctx.lineTo(3, 8); ctx.stroke();
        }
        ctx.restore();
    }

    debrisRef.current.forEach(d => {
        ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.angle);
        ctx.strokeStyle = d.color; ctx.lineWidth = lw;
        ctx.beginPath();
        if (d.shape.length > 0) {
            ctx.moveTo(d.shape[0].x, d.shape[0].y);
            for (let i = 1; i < d.shape.length; i++) ctx.lineTo(d.shape[i].x, d.shape[i].y);
            if (d.shape.length > 2) ctx.closePath();
        }
        ctx.stroke(); ctx.restore();
    });

    particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x, p.y, 2 * lw, 2 * lw);
    });
    ctx.globalAlpha = 1;
    ctx.restore(); 
    
    // OVERLAY FOR MISSION COMPLETE
    if (internalState === LanderState.LEVEL_COMPLETE) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to screen space
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, cvs.height / 2 - 60, cvs.width, 120);
        
        ctx.shadowColor = '#0f0';
        ctx.shadowBlur = 20;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 48px monospace';
        ctx.fillText('MISSION ACCOMPLISHED', cvs.width / 2, cvs.height / 2 + 15);
        ctx.font = '24px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText('BASE SECURED', cvs.width / 2, cvs.height / 2 + 50);
        ctx.restore();
    }
    
    ctx.restore(); 

    // Update HUD
    if (internalState === LanderState.PLAYING) {
        if (fuelGaugeRef.current) {
            const pct = Math.max(0, (ship.fuel / INITIAL_FUEL) * 100);
            fuelGaugeRef.current.style.width = `${pct}%`;
            if (sequenceRef.current.mode === 'REFUEL') {
                 fuelGaugeRef.current.style.backgroundColor = '#0af'; 
                 fuelGaugeRef.current.style.boxShadow = '0 0 15px #0af, inset 0 0 10px #fff';
            } else {
                 fuelGaugeRef.current.style.backgroundColor = ship.fuel < 200 ? '#f04' : '#0f0';
                 fuelGaugeRef.current.style.boxShadow = 'none';
            }
        }
        if (hullGaugeRef.current) {
            const pct = Math.max(0, ship.integrity);
            hullGaugeRef.current.style.width = `${pct}%`;
            hullGaugeRef.current.style.backgroundColor = pct < 30 ? '#f04' : (pct < 60 ? '#fd0' : '#0f0');
        }
        if (speedReadoutRef.current) {
            const speed = Math.hypot(ship.vel.x, ship.vel.y) * 10;
            speedReadoutRef.current.innerText = speed.toFixed(1);
            const isUnsafe = Math.abs(ship.vel.y) > MAX_SAFE_VELOCITY_Y || Math.abs(ship.vel.x) > MAX_SAFE_VELOCITY_X;
            speedReadoutRef.current.style.color = isUnsafe ? '#f04' : '#0f0';
        }
        if (vSpeedReadoutRef.current) {
            const vSpeed = ship.vel.y * 10;
            const absSpeed = Math.abs(ship.vel.y);
            let color = '#0f0';
            if (absSpeed > MAX_SURVIVABLE_VELOCITY_Y) color = '#f04'; 
            else if (absSpeed > MAX_SAFE_VELOCITY_Y) color = '#fd0'; 
            else if (vSpeed < 0) color = '#0af'; 
            vSpeedReadoutRef.current.innerText = vSpeed.toFixed(1);
            vSpeedReadoutRef.current.style.color = color;
        }
        if (altitudeReadoutRef.current && cvs) {
            const { y: gY } = getTerrainY(ship.pos.x);
            const alt = Math.max(0, gY - ship.pos.y - 16).toFixed(0);
            altitudeReadoutRef.current.innerText = alt;
        }
    }
  };

  const gameLoop = () => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        initStars(window.innerWidth, window.innerHeight);
        initTerrain();
        resetShip();
    }
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            initStars(window.innerWidth, window.innerHeight);
        }
    };
    window.addEventListener('resize', handleResize);
    audioService.init();
    requestRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
        window.removeEventListener('resize', handleResize);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        audioService.stopAct1Sfx();
    };
  }, []); // Run once on mount

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        if (e.code === 'Escape') {
             // Use ref to get latest state inside listener
             if (internalStateRef.current === LanderState.PLAYING) setInternalState(LanderState.PAUSED);
             else if (internalStateRef.current === LanderState.PAUSED) setCountdown(3);
        }
        keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const handleMouseDown = (e: MouseEvent) => { 
        if (e.button === 0) mouseRef.current = true; 
    };
    const handleMouseUp = (e: MouseEvent) => { 
        if (e.button === 0) mouseRef.current = false; 
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const togglePause = () => {
      if (internalState === LanderState.PLAYING) setInternalState(LanderState.PAUSED);
      else if (internalState === LanderState.PAUSED) setCountdown(3);
  };

  useEffect(() => {
      if (countdown !== null && countdown > 0) {
          audioService.playTone(440, 'square', 0.1);
          const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
          return () => clearTimeout(timer);
      } else if (countdown === 0) {
          audioService.playTone(880, 'square', 0.3);
          setInternalState(LanderState.PLAYING);
          setCountdown(null);
      }
  }, [countdown]);

  // Pause/resume music and sfx when game is paused
  useEffect(() => {
      if (internalState === LanderState.PAUSED) {
          audioService.pauseMusic();
          audioService.stopAct1Sfx();
      } else if (internalState === LanderState.PLAYING) {
          audioService.resumeMusic();
          // Resume background hum if ship is flying
          if (!shipRef.current.landed && !shipRef.current.dead) {
              audioService.startBackgroundHum();
          }
          // Resume fueling sound if in refuel mode
          if (sequenceRef.current.mode === 'REFUEL') {
              audioService.startFueling();
          }
      }
  }, [internalState]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden font-mono">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD */}
      <div className="absolute bottom-0 left-0 w-full h-[60px] bg-black border-t-2 border-[#444] flex items-center justify-between px-8 z-40 text-xl font-bold">
          <div className="flex items-center gap-2">
              <span className="text-[#0af]">ALT:</span>
              <span ref={altitudeReadoutRef} className="text-white w-20">0</span>
          </div>
          <div className="flex items-center gap-2">
               <span className="text-[#0af]">SCORE:</span>
               <span className="text-white">{currentScore}</span>
          </div>
          <div className="flex items-center gap-2">
               <span className="text-[#0af]">HULL:</span>
               <div className="w-[100px] h-[20px] bg-[#222] border border-[#555] relative">
                   <div ref={hullGaugeRef} className="h-full bg-[#0f0]" style={{ width: '100%' }} />
               </div>
          </div>
          <div className="flex items-center gap-2">
               <span className="text-[#0af]">FUEL:</span>
               <div className="w-[150px] h-[20px] bg-[#222] border border-[#555] relative">
                   <div ref={fuelGaugeRef} className="h-full bg-[#0f0]" style={{ width: '100%' }} />
               </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[#0af]">V.SPD:</span>
              <div className="flex items-baseline gap-1">
                  <span ref={vSpeedReadoutRef} className="w-12 text-right text-[#0f0]">0.0</span>
                  <span className="text-[#555] text-xs">M/S</span>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <span className="text-[#0af]">H.SPD:</span>
              <div className="flex items-baseline gap-1">
                  <span ref={speedReadoutRef} className="w-12 text-right text-[#0f0]">0.0</span>
                  <span className="text-[#555] text-xs">M/S</span>
              </div>
          </div>
      </div>

      <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col items-center justify-start pt-[15vh] z-40">
            <div ref={statusOverlayRef}></div>
      </div>

      {internalState === LanderState.PAUSED && (
          <div className="absolute top-0 left-0 w-full h-full bg-black/30 flex flex-col items-center justify-center z-50">
             <h2 className="text-6xl text-white mb-8 opacity-50">PAUSED</h2>
             <div className="flex gap-4">
                <ArcadeButton onClick={togglePause}>RESUME</ArcadeButton>
                <ArcadeButton variant="secondary" onClick={() => onFailure(currentScore)}>ABORT</ArcadeButton>
             </div>

             {/* Debug: Jump to Act */}
             {onJumpToAct && (
               <div className="mt-8 border-t border-[#333] pt-4">
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
      )}
      
      {internalState === LanderState.DAMAGE_REPORT && (
          <div className="absolute top-8 right-8 w-[450px] bg-black/80 backdrop-blur-md border-l-4 border-[#f04] p-6 z-50 font-mono text-[#0f0] shadow-[0_0_50px_rgba(255,0,68,0.2)]">
             <div className="flex justify-between items-center mb-4 border-b border-[#f04] pb-2">
                 <span className="text-[#f04] text-xl font-bold tracking-widest animate-pulse">ALERT</span>
                 <span className="text-xs text-[#888]">SYS.DIAG.884</span>
             </div>
             
             {damageReportState === 'ANALYZING' && (
                 <div className="h-40 flex items-center justify-center flex-col text-[#f04]">
                     <div className="text-2xl mb-2 animate-bounce">!</div>
                     <div className="tracking-widest animate-pulse">IMPACT DETECTED</div>
                     <div className="text-xs text-[#888] mt-2">COMPILING DAMAGE REPORT...</div>
                 </div>
             )}

             {(damageReportState === 'PRINTING' || damageReportState === 'FINISHED') && (
                 <div className="space-y-2 mb-6 min-h-[150px] max-h-[400px] overflow-y-auto custom-scrollbar">
                     {reportLines.map((line, idx) => (
                         <div key={idx} className="text-sm border-b border-[#333] pb-1 animate-in fade-in slide-in-from-left-2 duration-300">
                             <span className="text-[#f04] mr-2">{'>'}</span>
                             <span className={line.includes('CRITICAL') ? 'text-[#f04] font-bold' : 'text-[#ccc]'}>{line}</span>
                         </div>
                     ))}
                     {damageReportState === 'FINISHED' && (
                         <div className="mt-4 text-[#f04] text-xs border border-[#f04] p-2 text-center animate-pulse">
                             WARNING: PERFORMANCE DEGRADATION ACTIVE
                         </div>
                     )}
                 </div>
             )}
             
             <div className="flex justify-end">
                 <button 
                     onClick={closeDamageReport}
                     disabled={damageReportState !== 'FINISHED'}
                     className={`px-4 py-2 text-sm border font-bold transition-all ${
                         damageReportState === 'FINISHED' 
                         ? 'border-[#0f0] text-[#0f0] hover:bg-[#0f0] hover:text-black cursor-pointer' 
                         : 'border-[#555] text-[#555] cursor-not-allowed opacity-50'
                     }`}
                 >
                     {damageReportState === 'FINISHED' ? 'ACKNOWLEDGE & PROCEED' : 'AWAITING DIAGNOSTIC...'}
                 </button>
             </div>
          </div>
      )}
      
      {countdown !== null && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center z-50">
              <div className="text-[150px] font-bold text-[#0f0] animate-pulse">{countdown}</div>
          </div>
      )}
    </div>
  );
};

export default LanderGame;