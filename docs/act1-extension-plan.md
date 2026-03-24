# Act 1 Extension & Difficulty Increase Plan

## Current State (Before Changes)
- World was 6000px wide with 3 fuel depots and a final base pad
- Terrain was a single-height-per-x model (no overhangs/caves)
- Gravity is low (0.005), thrust-to-weight ratio is comfortable (5:1)
- No environmental hazards (wind, variable gravity)
- `LanderGame.tsx` was a 1400+ line monolith

---

## Phase 1: Extract Logic (Foundation) -- COMPLETE
Extracted terrain generation into `game-logic/lander/terrain.ts`:
- `generateTerrain(screenHeight)` — pure function returning terrain segments
- `getTerrainYAt(x, terrain)` — queries terrain height at a given x position
- `LanderGame.tsx` now delegates to these functions via thin wrappers
- Build verified, no behavior change

## Phase 2: Double the World -- COMPLETE
- `WORLD_WIDTH` from 6000 → 12000 in `constants.ts`
- Fuel depots from 3 → 7 with progressive difficulty scaling:
  - Early (0-30%): wider pads (160-180px), 2-3x multiplier, 500-800 fuel
  - Mid (30-60%): moderate pads (100-160px), 2-5x multiplier, 400-700 fuel
  - Late (60%+): tight pads (100-120px), 3-5x multiplier, 300-600 fuel
- Terrain roughness scales from 1.0x early to 1.8x late

## Phase 3: Cave System -- COMPLETE
Added `CaveZone` type to `types.ts` and cave generation to `terrain.ts`:
- **2 cave zones** placed at ~35% and ~70% of the world
- **Entry/exit funnels** (200px) narrow from open terrain into cave passages
- **Jagged cave interiors** (600-1000px wide), minimum gap 150-250px
- **Cave fuel pads**: 8x multiplier, 1000 fuel capacity at deepest point of each cave
- **Ceiling collision**: `getCeilingYAt()` function; ship top hitting ceiling = crash
- **Ceiling rendering**: black filled rock with cyan edge lines matching terrain style
- Existing camera pad-tracking works naturally with cave fuel pads

## Phase 4: Difficulty Systems -- COMPLETE
- **Wind**: dual-sine oscillation (0.0015 + 0.0008 amplitude), 2.5x stronger inside caves
- **Wind shadow**: terrain 150px upwind that rises within 80px of ship reduces wind up to 80% — hugging behind mountains gives shelter
- **Wind HUD indicator**: directional arrows with color-coded severity
- **Progressive gravity**: 0.005 at x=0 → 0.007 at x=12000
- **Narrower pads**: handled in Phase 2 (180px early → 100px late)
- **Fuel scarcity**: handled in Phase 2 (500-800 early → 300-600 late)
- **Liftoff control fix**: player regains control 0.5s after liftoff (was locked for full 3s auto-sequence)

## Phase 5: Polish -- COMPLETE
- **Progress bar**: thin cyan bar above HUD showing distance as % of world
- **Cave polygon fix**: ceiling fill and stroke now trace single connected paths (no gaps)
- Cave ambient audio — deferred (optional future enhancement)
- Wind particles — deferred (optional future enhancement)

---

## Key Design Decision: Cave Fuel Strategy
Players face a choice: take the safe route with frequent small surface refuels, or dive into caves for large fuel payloads at higher risk. This creates meaningful difficulty without being punishing.

## Risk Mitigation
- Caves use a **separate ceiling segment array** so existing floor terrain logic is untouched
- Extracting into `game-logic/lander/` keeps the component manageable
- Performance is fine even with doubled segments (~300 total, linear scan still fast at 60fps)

## Files Changed
- `constants.ts` — WORLD_WIDTH doubled to 12000, GAME_VERSION bumped to 1.5.0
- `types.ts` — added `CaveZone` type
- `game-logic/lander/terrain.ts` — new file: terrain generation, cave generation, collision helpers (`generateTerrain`, `getTerrainYAt`, `getCeilingYAt`, `isInCave`)
- `games/LanderGame.tsx` — extracted terrain logic, added caves, ceiling collision/rendering, wind system, progressive gravity, wind shadow, progress bar, liftoff control fix
- `CHANGELOG.md` — v1.5.0 entry
- `CLAUDE.md` — updated project structure and key files table
