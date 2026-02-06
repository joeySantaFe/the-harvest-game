# The Harvest - Project Documentation

## Overview
A React 19 + TypeScript + Vite browser-based game anthology with three acts, inspired by classic arcade games (Lunar Lander, Rip Off, Battlezone).

## Tech Stack
- **React 19** with TypeScript
- **Vite** for build/dev server
- **Canvas 2D** for game rendering
- **Web Audio API** for procedural sound effects

## Project Structure
```
the-harvest/
├── App.tsx                  # Main app state machine, routes between acts
├── index.tsx                # React entry point
├── types.ts                 # All TypeScript types and enums
├── constants.ts             # Game tuning values, colors, physics
│
├── games/                   # Game components (one per Act)
│   ├── LanderGame.tsx       # Act 1: Lunar landing gameplay
│   ├── RipOffGame.tsx       # Act 2: Defend fuel from enemies
│   └── BattlezoneGame.tsx   # Act 3: Tank battle (placeholder)
│
├── game-logic/              # Pure logic modules (no React)
│   └── ripoff/              # Act 2 specific logic
│       ├── ai.ts            # Enemy AI behaviors
│       ├── entities.ts      # Entity factories and updates
│       ├── physics.ts       # Collision, wrapping, distance
│       └── waves.ts         # Wave/round configuration
│
├── services/                # Singleton services
│   ├── audioService.ts      # Web Audio API sound effects
│   └── inputService.ts      # Keyboard/gamepad input handling
│
├── components/              # Reusable UI components
│   ├── ArcadeButton.tsx     # Styled arcade-style button
│   ├── ActThumbnail.tsx     # Canvas-rendered act preview thumbnails
│   └── MenuBackground.tsx   # Animated menu background
│
├── public/                  # Static assets (music, sfx)
├── Music/                   # Audio source files
└── docs/                    # Documentation
```

## Architecture Patterns

### State Machine (App.tsx)
The app uses an `AppState` enum to control which screen/game is rendered:
```
MENU → NARRATIVE → ACT_1_LANDER → NARRATIVE → ACT_2_HARVEST → ACT_3_BATTLE → VICTORY
```

### Game Loop Pattern
Games use `requestAnimationFrame` with refs for mutable state:
```typescript
const gameLoopRef = useRef<number>();
const entitiesRef = useRef<Entity[]>([]);

const update = useCallback(() => {
  // Update logic using refs (not state) to avoid stale closures
  entitiesRef.current.forEach(e => updateEntity(e));
  gameLoopRef.current = requestAnimationFrame(update);
}, []);
```

### Audio Service (Singleton)
```typescript
import { audioService } from './services/audioService';
audioService.init();  // Call on first user interaction
audioService.playLaser();
audioService.setThrust(true);
```

### Entity Pattern
Entities are plain objects with factory functions:
```typescript
// Create
const enemy = createEnemy('sprinter', x, y, spawnId, speedMod);
// Update (mutates in place)
updateEnemy(enemy, width, height);
// Check state
if (enemy.dead) { /* cleanup */ }
```

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Game state machine, campaign progress, screen routing |
| `types.ts` | All interfaces: `RipOffPlayer`, `RipOffEnemy`, `AppState`, etc. |
| `constants.ts` | Tuning values: speeds, colors, physics constants |
| `audioService.ts` | Sound effects via Web Audio API |
| `game-logic/ripoff/ai.ts` | Enemy AI: harvester, sprinter, exterminator behaviors |
| `game-logic/ripoff/entities.ts` | Entity creation/update functions |
| `games/RipOffGame.tsx` | Act 2 main component with game loop |
| `games/LanderGame.tsx` | Act 1 main component with landing physics |

## Conventions

### Refs vs State
- Use `useRef` for game objects that update every frame (entities, physics)
- Use `useState` only for UI that needs React re-renders (score, lives, game state)
- This prevents stale closure bugs in animation loops

### Pure Logic Modules
Files in `game-logic/` should:
- Have no React imports
- Export pure functions
- Take all dependencies as parameters
- Mutate objects in place for performance

### Canvas Rendering
- Clear canvas each frame
- Draw in order: background → entities → UI overlay
- Use `ctx.save()`/`ctx.restore()` for transformations
- Validate coordinates before drawing (avoid NaN, off-screen issues)

### Audio
- Initialize audio on first user interaction (browser autoplay policy)
- Use `ctx.resume()` and await the promise before scheduling sounds
- Procedural sounds via oscillators/noise buffers

## Enemy Types (Act 2)
| Type | Color | Behavior |
|------|-------|----------|
| Harvester | Red | Seeks fuel, drags off-screen |
| Sprinter | Orange | Tank with turret, searches then attacks |
| Exterminator | Purple | Rams players aggressively |

## Development

```bash
npm install
npm run dev      # Dev server at localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

## Version
See `CHANGELOG.md` for version history and recent changes.
