# The Harvest - Changelog

## [1.4.0] - 2026-02-05

### Added
- **Ground-based tanks** - All Act 2 vehicles converted from spaceships to ground-based tanks
- **Animated treads** - Scrolling dashed lines on tank treads that animate based on movement speed
- **Reverse driving** - S key (P1) / ArrowDown (P2) drives backward at half thrust speed
- **Tank physics** - All vehicles now use tank-style physics with no sideways drift; velocity projected onto facing/perpendicular axes with separate friction
- **Buggy vehicle** - Exterminator rendered as a fast buggy with rotating wheels and front bumper bar, visually distinct from tanks
- **Dual exhaust particles** - Thrust particles emit from two points at tank rear (or front when reversing)

### Changed
- **Player shape** - Arrowhead replaced with tank body (rectangle + treads + turret line)
- **Enemy rendering** - Harvester/Sprinter use animated tank renderer; Exterminator uses buggy renderer
- **Exterminator AI** - Smooth rotation (was instant angle snap) with lighter sideways friction for buggy drifting feel
- **Harvester AI** - Now uses shared tank physics in pursuit mode
- **Player rotation speed** - Reduced from 0.12 to 0.06 for better tank control precision
- **Collision radii** - Player 12→14 (wider tank), Exterminator 12→11 (smaller buggy)
- **Bullet origin** - Fires from turret tip (22px) instead of ship nose (20px)
- **HUD** - "SHIPS:" label changed to "TANKS:" with tank silhouette SVG icons for lives
- **Act 2 thumbnail** - Player arrowhead replaced with tank shape

---

## [1.3.0] - 2026-02-05

### Fixed
- **Stale score closures** - Fixed game loop callbacks in both Act 1 and Act 2 capturing initial score/lives state values instead of current values, causing incorrect scores on death and game over
- **Invisible harvesters** - Fixed `drawEnemy` early return that skipped rendering entire enemy when tow line exceeded length check
- **Fuel drifting off-screen** - Added boundary clamping with bounce to prevent fuel pods from permanently leaving the play area
- **Input listener memory leak** - InputService now properly removes all event listeners on destroy; cleanup called on Act 2 unmount
- **Wave transition freeze** - Player ship no longer freezes during the pause between waves in Act 2; game stays in PLAYING state during wave gaps
- **Gameplay music not starting** - Music now starts directly from click handler (user gesture context) to satisfy browser autoplay policy
- **`handleLegHit` missing return** - Added explicit `return 0` on ship destruction path in Act 1 landing logic
- **Wave speed scaling** - `speedMod` now properly increases per wave (was flat 1.1 for all waves past 3, now scales 1.1, 1.2, 1.3...)

### Changed
- **Removed canvas shadow effects** - Removed `shadowBlur` from per-entity and per-bullet rendering for better frame rate; kept shadows only on shields and powerups
- **Removed debug console.logs** - Cleaned up leftover `console.log` statements from App.tsx and RipOffGame.tsx
- **Removed unused code** - Removed unused `isWaveComplete` import and unused `AppState.CONFIG` enum value
- **Used POWERUP_SPAWN_CHANCE constant** - Replaced hardcoded 0.1 with existing constant for powerup drop chance
- **Updated CLAUDE.md** - Fixed project structure to match actual file layout

---

## [1.2.1] - 2026-02-03

### Fixed
- **Landing detection improved** - Added "settling" mechanism that tracks consecutive frames of contact
  - Ship no longer needs perfect conditions in a single frame to land
  - After ~160ms of pad contact with reasonable conditions, landing completes
  - Immediate landing still works if perfectly stable (low speed, good angle)
- **Reset Progress button** - Added visible button on menu when acts are unlocked
  - Shows "Reset Act Progress" link when Act 2 or Act 3 is unlocked
  - No longer requires hidden Option+R key combo to reset

---

## [1.2.0] - 2026-02-03

### Added
- **New menu design** - Title changed to "THE HARVEST" with canvas-rendered act thumbnails
- **Act thumbnails** - Visual previews for each act showing representative gameplay scenes
- **Act unlock system** - Acts 2 & 3 are locked until previous act is completed
- **Persistent unlocks** - Act progress saved to localStorage, persists between sessions
- **Music soundtrack** - Background music with crossfade between menu and gameplay tracks
- **Debug mode** - Hold Option key to undim all thumbnails, Option+click to jump to any act
- **Menu background animation** - Abstract gameplay visualization with ships, enemies, and particles running behind the menu with blur effect
- **Music pause on game pause** - Music pauses when game is paused (ESC key) and resumes when unpaused
- **Act 1 sound effects**:
  - Background hum while ship is flying (fades in/out)
  - Fueling sound when refueling at fuel depots
  - Landing sound when touching down on pads
- **Debug reset** - Option+R on menu resets all act progress (clears localStorage)
- **Fuel complete transition** - Added 2-second "FUEL TRANSFER COMPLETE" state before countdown begins

### Changed
- **Menu layout** - Replaced text act list with interactive thumbnail grid
- **Branding** - Game title updated from "LUNAR COMMAND" to "THE HARVEST"
- **Refueling sequence** - Flow is now LANDING (1.5s) → REFUEL → FUEL_COMPLETE (2s) → COUNTDOWN (4s) → LIFTOFF
- **Landing transition** - Added 1.5-second "TOUCHDOWN" state to let landing sound finish before fueling begins
- **Removed Start Anthology button** - Players now click act thumbnails directly to start
- **Act thumbnails clickable** - Unlocked acts can be clicked to start that act directly
- **Thumbnail hover effects** - Unlocked thumbnails scale up and glow brighter on hover

### Fixed
- **Landing detection** - Made landing detection more forgiving to prevent missed safe landings
  - Speed threshold increased from 0.2 to 0.5 to account for settling bounce
  - Angle tolerance increased to ~16 degrees (was ~11)
  - Added fallback: single leg contact accepted if speed < 0.3 and angle is good

---

## [1.1.0] - 2026-02-02

### Added
- **Sprinter turret tracking** - Gun barrel independently tracks players within 400px range
- **Lock-on sound effect** - Menacing beep when sprinter turret starts tracking
- **Visual tracking indicator** - Pulsing circle around sprinter when locked onto player
- **Sprinter search pattern** - Sprinters patrol toward center with sweeping turret until detecting player within 500px range

### Changed
- **Sprinter tank movement** - Now moves forward only like a real tank (no sideways drift)
- **Sprinter shooting** - Only fires when actively tracking a player, aims with turret angle
- **Wave announcements** - Fixed duplicate announcement bug

### Fixed
- **Wave progression bug** - Waves now properly advance through all rounds
- **Harvester escape bug** - Harvesters dragging fuel now escape off-screen instead of wrapping
- **Red line rendering bug** - Added coordinate validation to prevent drawing off-screen entities
- **Stale closure bug** - Fixed React state issues causing game to reinitialize between waves
- **First thrust no sound bug** - AudioContext resume is now awaited before scheduling thruster gain

---

## [1.0.0] - 2026-02-02

### Added
- **Act II: The Harvest** - Rip Off style gameplay defending fuel from enemy tanks
- **Three enemy types**:
  - Harvester (red) - Drags fuel off-screen
  - Sprinter (orange) - Armed tank that shoots at players
  - Exterminator (purple) - Rams players aggressively
- **Wave system** - 3 waves with 4 rounds each, matching v28 configuration
- **Power-ups** - Shield drops from destroyed enemies
- **Co-op support** - 2-player mode with scaled difficulty

### Changed
- **Enemy speeds** - Matched to v28 values (harvester: 2.2, sprinter: 3.0, exterminator: 3.5)
- **Player physics** - Updated thrust, rotation, and recoil to match v28
- **Bullet physics** - Separate speeds for player (14) and enemy (6) bullets

---

## Project Structure
```
the-harvest/
├── games/           # Game components (LanderGame, RipOffGame, BattlezoneGame)
├── game-logic/      # Game logic modules
│   └── ripoff/      # Act II logic (ai, entities, physics, waves)
├── services/        # Audio and input services
├── components/      # UI components
├── reference/       # Legacy HTML versions for reference
└── docs/            # Documentation
```
