# DevLab: Act 2 AI Sandbox — User Guide

## What is DevLab?

DevLab is a sandbox mode for testing and tuning the three Act 2 (Rip Off) enemy AI types in isolation. You can spawn enemies, watch their behavior, adjust every AI parameter with live sliders, and see debug visualizations — all without playing through the campaign.

---

## Opening DevLab

From the main menu, use either method:

- **Keyboard shortcut:** `Ctrl + Shift + D`
- **Debug button:** Hold `Alt` (Option on Mac) to reveal the DEVLAB button, then click it

Exiting DevLab returns you to the menu. All AI parameters are reset to defaults on exit, so the campaign is never affected.

---

## Layout

```
+--------------------------------------+-----------+
|                                      |           |
|              Canvas                  |  Sidebar  |
|         (sandbox arena)              |           |
|                                      |           |
+--------------------------------------+           |
|             Footer                   |           |
| (pause / step / speed / reset)       |           |
+--------------------------------------+-----------+
```

- **Canvas** — The game arena. Your player spawns at center with 8 fuel cells. Control it with the same Act 2 keys (WASD + Space).
- **Sidebar** (right, 320px) — Three collapsible panels: Spawn, AI Tuning, Debug Overlays.
- **Footer** (bottom bar) — Simulation controls.

---

## Controls

### Player Controls (same as Act 2)

| Action | Key |
|--------|-----|
| Forward | W |
| Reverse | S |
| Rotate Left | A |
| Rotate Right | D |
| Fire | Space |

### Simulation Controls (footer bar)

| Control | What it does |
|---------|-------------|
| **PLAY / PAUSE** | Toggle simulation. When paused, nothing moves. |
| **STEP** | Advance exactly one frame (only works when paused). Useful for studying frame-by-frame behavior. |
| **SPEED** (0.25x / 0.5x / 1x / 2x) | Time scale. 0.25x is slow-motion, 2x runs double speed. |
| **RESET** | Clear all entities and respawn the player + default fuel layout. |
| **FRAME** counter | Shows total simulation frames elapsed. |

---

## Spawn Panel

Click a spawn button, then click anywhere on the canvas to place that entity.

| Button | Spawns |
|--------|--------|
| **HARV** | Harvester (red tank) — seeks fuel, drags it off-screen |
| **SPRT** | Sprinter (orange tank) — patrols, turret tracks players, shoots |
| **EXTR** | Exterminator (purple buggy) — rams players aggressively |
| **FUEL** | Fuel cell |

- The spawn mode indicator appears at the top-left of the canvas.
- Click the same button again to cancel spawn mode.
- **CLEAR ENEMIES** removes all enemies but keeps fuel and the player.
- **RESET SCENE** restores the starting state (player at center, 8 fuel cells, no enemies).
- Entity counts are shown at the bottom of the panel.

### Sandbox Differences from Campaign

- The player **does not die** — collisions with enemies show a particle effect but you keep playing.
- There are no waves, scoring, lives, or game-over conditions.
- Enemy bullets hit the player (particle flash) but don't kill.
- Enemies killed by your bullets still explode and get removed normally.
- Fuel captured by harvesters is still lost (dragged off-screen).

---

## AI Tuning Panel

Each enemy type has a collapsible section with sliders for every tunable parameter. Changes take effect **immediately** — the next frame uses the new values.

### How to Use

1. Expand a section (click the header: HARVESTER, SPRINTER, or EXTERMINATOR).
2. Drag a slider or type a value. Modified parameters highlight in orange.
3. Watch the behavior change in real-time on the canvas.
4. Use **RESET** on a section to restore its defaults, or **RESET ALL** for everything.

### Global Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| Sep Force | 0.1 | How hard enemies push away from each other |
| Sep Distance | 40 | Distance at which separation kicks in (px) |
| Player Max Speed | 6 | Top speed of the player tank |
| Player Shoot CD | 10 | Frames between player shots |

### Harvester Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| Escape Accel | 0.07 | Acceleration when dragging fuel toward edge |
| Tow Length | 35 | Distance fuel trails behind the harvester |
| Escape Margin | 100 | How far off-screen before harvester + fuel despawn |
| Flee Accel | 0.08 | Acceleration when fleeing after being hit |
| Pursuit Accel | 0.08 | Acceleration when chasing fuel |
| Rotation Smooth | 0.1 | How sharply the harvester turns toward fuel (0 = no turn, 1 = instant) |
| Fuel Grab Dist | 30 | Distance at which a harvester latches onto fuel |
| Flee Timer | 120 | Frames of fleeing after being hit (120 = 2 sec at 60fps) |
| **Ignore Fuel** | OFF | Toggle: harvester immediately converts to exterminator behavior |

### Sprinter Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| Detection Range | 500 | Distance at which sprinter detects and pursues a player |
| Turret Range | 400 | Distance at which the turret starts tracking |
| Search Speed | 0.6 | Speed multiplier when patrolling (no target) |
| Turret Rot Track | 0.15 | Turret rotation speed when locked on |
| Turret Rot Lead | 0.08 | Turret rotation speed when leading (detected but not locked) |
| Body Rotation | 0.05 | Tank body turn rate toward target |
| Thrust | 0.08 | Forward acceleration in pursuit |
| Flank Dist | 200 | Distance threshold for flanking maneuver |
| Flank Angle | PI/4 | Offset angle for flanking approach |
| Sweep Speed | 0.02 | Turret oscillation speed during search mode |
| Sweep Amplitude | PI/3 | Turret sweep range during search mode |
| Patrol Dist | 300 | Distance from center before sprinter starts returning |
| Patrol Radius | 150 | Radius of the circular patrol orbit |
| Orbit Speed | 0.005 | Speed of circular patrol |
| Search Rotation | 0.03 | Body turn rate while searching |
| Search Thrust | 0.05 | Forward acceleration while searching |
| Shoot CD Min | 100 | Minimum frames between shots |
| Shoot CD Range | 80 | Random range added to cooldown (total = min + rand*range) |
| **Disable Shooting** | OFF | Toggle: sprinter turret still tracks but never fires |

### Exterminator Parameters

| Parameter | Default | Effect |
|-----------|---------|--------|
| Wander Accel | 0.2 | Random movement strength when no target |
| Idle Speed | 0.5 | Speed multiplier when wandering |
| Flank Offset | 0.6 | Angle offset for flanking approach (radians) |
| Flank Fade Dist | 150 | Distance at which flanking stops and ram starts |
| Rotation Speed | 0.1 | Turn rate toward target |
| Acceleration | 0.12 | Forward acceleration in pursuit |
| Side Friction | 0.5 | Sideways drift resistance (lower = more drift) |
| Fwd Friction | 0.98 | Forward momentum retention |
| **Disable Flanking** | OFF | Toggle: exterminator always charges directly |

---

## Debug Overlays

Toggle these visualizations to understand what the AI is "thinking":

| Overlay | What it shows |
|---------|-------------|
| **Vision Cones** | Circles around sprinters at detection range (faint) and turret tracking range (brighter). Small circle around harvesters at fuel grab distance. |
| **Target Lines** | Dotted line from each enemy to its current target (fuel cell or player). |
| **Steering Vectors** | Cyan arrow showing each enemy's velocity direction and magnitude. Yellow dashed line showing facing direction. |
| **Collision Radii** | Circle at each entity's collision hitbox radius. |

Multiple overlays can be active at the same time.

---

## Incorporating Changes into the Game

When you find parameter values you like in DevLab, here's how to make them permanent in the campaign.

### Quick Method: Edit the Defaults

All AI defaults live in a single file:

```
game-logic/ripoff/aiConfig.ts → DEFAULT_AI_CONFIG
```

Every value in the tuning panel maps 1:1 to a field in this object. To change a default:

1. Open `game-logic/ripoff/aiConfig.ts`
2. Find the value inside `DEFAULT_AI_CONFIG`
3. Change it to your tuned value
4. Save — the campaign now uses the new value

**Example:** You discovered in DevLab that sprinter detection range of 350 feels better than 500.

```typescript
// game-logic/ripoff/aiConfig.ts, line ~79
sprinter: Object.freeze({
  detectionRange: 350,   // was 500
  // ... rest unchanged
}),
```

That's it. The campaign AI reads from `DEFAULT_AI_CONFIG` at startup, so the new value is active everywhere.

### What Each File Does

| File | Role | When to edit |
|------|------|-------------|
| `game-logic/ripoff/aiConfig.ts` | Default values for all AI params | Change AI tuning |
| `game-logic/ripoff/ai.ts` | AI behavior logic (reads config) | Change AI *logic* (state machines, targeting rules) |
| `game-logic/ripoff/entities.ts` | Entity creation and update (reads config for player speed, cooldowns) | Change player/entity mechanics |
| `constants.ts` | Non-AI constants (speeds, bullet life, shapes, scoring) | Change game balance outside AI |

### Understanding the Config System

The config system uses a getter/setter pattern:

```
ai.ts calls → getAIConfig() → returns activeConfig
                                    ↑
                            starts as DEFAULT_AI_CONFIG
                            DevLab calls setAIConfig() to override
                            DevLab calls resetAIConfig() on exit
```

- **Campaign code** never calls `setAIConfig()`, so it always uses defaults.
- **DevLab** calls `setAIConfig()` on every slider change for live preview.
- **On DevLab exit**, `resetAIConfig()` restores defaults so the campaign is clean.

### Per-Wave Difficulty Scaling

The config system handles base values. Per-wave difficulty is handled separately:

- `speedMod` (passed to `createEnemy`) scales enemy speed per wave — this is in `waves.ts`, not in `aiConfig.ts`.
- `ENEMY_SPEEDS` in `constants.ts` sets the base max speed per type.
- The config values (acceleration, rotation, etc.) are multiplied against these base speeds by the AI logic.

If you want enemies to feel faster overall, increase `ENEMY_SPEEDS` in `constants.ts`. If you want them to *accelerate* faster but cap at the same top speed, increase the acceleration values in `aiConfig.ts`.

### Boolean Overrides

The three boolean toggles (`ignoreFuel`, `disableShooting`, `disableFlanking`) are debugging tools. They default to `false` and are not intended to be shipped as `true` — they exist so you can isolate specific behaviors in DevLab. For example:

- Set `disableShooting: true` to test sprinter movement without getting shot.
- Set `ignoreFuel: true` to see what happens when harvesters become exterminators.
- Set `disableFlanking: true` to compare direct-charge vs flanking behavior.

### Tips for Tuning

- **Pause + Step** is your best friend for understanding frame-by-frame decisions.
- **Spawn one enemy at a time** with vision cones + target lines to see exactly what it's tracking.
- **Slow motion (0.25x)** makes rotation smoothing and acceleration curves visible.
- Start from defaults, change **one parameter at a time**, and observe the effect before moving on.
- Use **collision radii** overlay to check if grab distances and hitboxes feel right.
- The **steering vectors** overlay shows you the difference between where an enemy is *heading* (cyan) vs where it's *facing* (yellow) — the gap between these reveals how much the tank physics is drifting.
