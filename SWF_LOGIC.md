# SWF_LOGIC — 4399 flash/18012 植物大战僵尸 (PopCap Flash PvZ)

Sources: FFDec decompile of `swf/pvz_9_15.swf` → `ffdec-game/scripts/...`;
assets from `swf/resources.swf` → `ffdec-resources/`. REA not used for SWF.

## Stage / timing
| Property | Value | Evidence |
|----------|-------|----------|
| Stage | **540×405** | SWF RECT; `Board.BOARD_WIDTH/HEIGHT` |
| SWF frame rate | **30 fps** | header |
| Simulation tick | **100 ticks/sec** (`TICKS_PER_SECOND=100`, `SECONDS_PER_UPDATE=0.01`) | `CPlant.as`, `SeedPacket.as` |
| Lawn grid | **9×5** (`GRIDSIZEX/Y`) | `Board.as` |
| Lawn bounds | X **25–513**, Y **77–385** | `LAWN_XMIN/MAX`, `LAWN_YMIN/MAX` |
| Cell size | **54×67** px | `GridToPixelX = col*54+25`, `GridToPixelY = row*67+77` |

## Seed types (adventure unlock order = packet index)
0 Peashooter, 1 Sunflower, 2 CherryBomb, 3 Wallnut, 4 Squash, 5 SnowPea,
6 Chomper, 7 Repeater, 8 PuffShroom, 9 SunShroom, 10 FumeShroom, 11 GraveBuster

## Plant costs (`GetCurrentPlantCost`)
100 / 50 / 150 / 50 / 50 / 175 / 150 / 200 / 0 / 25 / 75 / 75

## Refresh (`GetRefreshTime`, ticks @100Hz)
Most: **750**; CherryBomb **5000**; Wallnut & Squash **3000**

## Plant HP / fire
- Default plant HP **300**; Wallnut **4000**
- Peashooter/SnowPea/Repeater `mLaunchRate=150` (1.5s); fire at counter==25
- Sunflower `mLaunchRate=2500` (~25s); produces sun coin
- Projectile damage **20**; speed `3.33*0.67`; SnowPea applies FREEZE
- Squash splat damage **1800**; Chomper instant eat + digest
- Eat rate: zombie deals **4 HP/tick** while chewing (`TICKS_BETWEEN_EATS`)

## Zombies
| Type | id | body | helm/shield | start lvl | value | pick wt | vel notes |
|------|----|------|-------------|-----------|-------|---------|-----------|
| Normal | 0 | 270 | — | 1 | 1 | 4000 | RandFloat **0.23–0.37** |
| Flag | 1 | 270 | — | 1 | 1 | 0 | **0.45** |
| Cone | 2 | 270 | helm **370** | 3 | 2 | 4000 | same as normal |
| Pole | 3 | 270 | — | 6 | 2 | 2000 | pre-vault **0.66–0.68** |
| Bucket | 4 | 270 | helm **1100** | 8 | 4 | 3000 | |
| Newspaper | 5 | 270 | shield **150** | 11 | 2 | 1000 | mad **0.89–0.91** |
| Door | 6 | 270 | shield **1100** | 13 | 4 | 3500 | |
| Football | 7 | 270 | helm (football) | 16 | 7 | 2000 | **0.66–0.68** |

Chilled speed factor **0.4**. Spawn X ≈ `BOARD_WIDTH-13+rand*27`.

Hit boxes (normal): body rect `(25,0,28,77)` / attack `(10,0,33,77)` relative.

## Waves / sun / levels
- `mZombieWaves` (lv1–20): `4,6,8,10,8,10,20,10,20,20,10,20,10,20,10,10,20,10,20,20`
- First-wave countdown **1800**; normal **2500±600**; before-flag **4500**
- Sky sun countdown **425–700**; sun value **25** (small **15**)
- Level 1 start sun **150**; else adventure **50**
- Seeds in bank: `min(level, 6)` with level 6 → 5 packets; packet types = `0..n-1` until chooser
- Day bg levels ≤10; night ≥11
- Modes: Adventure, Survival stages, Scary Potter 1–9+endless, Wallnut Bowling, Upsell

## Controls / HUD
- Mouse: pick seed packet → click lawn cell to plant; click suns; shovel dig
- Seed bank top; shovel rect `(402,0,63,65)`; menu button `(465,0,79,31)`
- Win: all waves cleared + no zombies → award / next level
- Lose: zombie reaches house (`ZombiesWon` / `WalkIntoHouse`)

## Remake gaps (honest)
- Full PopCap **reanimator** skeletal animation not ported (static/composite sprites)
- Particle systems / Crazy Dave dialogue / full Scary Potter / Survival truncated
- Night fog, grave-rise timing, pole-vault precision approximated
- Seed chooser UI for late adventure simplified
