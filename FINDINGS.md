# 4399 flash/18012 植物大战僵尸 — findings (Phase A download)

## Identity
- 4399 id **18012**, title 《植物大战僵尸》
- Page: https://www.4399.com/flash/18012.htm
- Listed size on page: **12509K (~12.51 MB)**; on-disk package under `swf/` ≈ **16 MB** (game + resources + BGM)
- Cover: `cover.jpg` from `//imga999.4399.com/upload_pic/2010/3/31/4399_1659458103.jpg`
- Embed stage on page: **540×405**
- Date on page: 2009-09-29

## How the SWF was found
1. Page JS: `_strGamePath="/upload_swf/ftp/20090929/1/game.htm"`
2. Live iframe: `//s4.4399.com/4399swf/upload_swf/ftp/20090929/1/game1.htm`
3. `game1.htm` loads `gameloader1.swf?isMulti=1&gameswf=pvz_9_15.swf`, then swaps to `pvz_9_15.swf`
4. Game SWF (PopCap Flash PvZ, Flex 3, build date Sep 15 2009) loads sibling `resources.swf`, `data.xml`, and `music/*.mp3`

## Real game SWF
- **Path:** `/workspace/4399-18012/swf/pvz_9_15.swf`
- **Source URL:** `https://s4.4399.com/4399swf/upload_swf/ftp/20090929/1/pvz_9_15.swf`
- **Size:** 460,502 bytes (~449.7 KB)
- **Type:** CWS (zlib-compressed Macromedia Flash), version **10**; declared uncompressed length 818,776
- **`file`:** Macromedia Flash data (compressed), version 10
- Identity strings: `com.popcap.flash.games.pvz`, `PVZApp`, `Adobe Flex 3 Application`

## Companion assets (same CDN dir; needed to run)
| File | Size | Type / notes |
|------|------|----------------|
| `swf/resources.swf` | 6,610,793 B | CWS Flash 10 — art/sound library |
| `swf/data.xml` | 2,265 B | game data |
| `swf/gameloader1.swf` | 32,753 B | 4399 loader shell (CWS Flash 25) |
| `swf/music/*.mp3` | ~8.3 MB total | 10 BGM tracks (grasswalk, loonboon, …) |

CDN base: `https://s4.4399.com/4399swf/upload_swf/ftp/20090929/1/`  
Downloaded with `Referer: https://www.4399.com/` and a browser User-Agent.

## Notes
- Not a ~20KB jifen stub; main logic SWF is the PopCap web PvZ client; bulk of the listed ~12.5 MB is `resources.swf` + music.
- Phase A only — no remake / decompile beyond download verification.

## Phase B–G (remake)
- Stage **540×405**, sim **100 Hz**, render DPR-aware Canvas
- Logic recovered via FFDec AS3 (`ffdec-game/scripts/...`); see `SWF_LOGIC.md`
- Remake path: `/workspace/4399-18012/remake/`
- GitHub: https://github.com/liuzhuoling2011/plants-vs-zombies-flash-remake
- Pages: https://liuzhuoling2011.github.io/plants-vs-zombies-flash-remake/

## Reanimator upgrade (2026-10-10)

- Implemented PopCap Flash Reanimator port (`js/reanim.js`) from `ByteReanimDescriptor.as` + `Reanimation.as`.
- Extracted 29 reanim defs + 402 part images from `resources.swf` → `remake/assets/reanim/`.
- Wired plants/zombies/sun/mower to layered transforms (not static composites).
- Deployed: https://liuzhuoling2011.github.io/plants-vs-zombies-flash-remake/ (commit df9f7d4)
- Honest gaps: see `GAPS.md`. **Not claiming full 1:1** — animation fidelity greatly improved; particles/modes/UI polish remain.

## Polish pass (2026-10-10)

Closed recoverable GAPS: particles (59 defs), Crazy Dave+sod cutscenes, pole/newspaper/charred, bitmap fonts (11), survival endless menu, hitboxes.
Deploy: https://liuzhuoling2011.github.io/plants-vs-zombies-flash-remake/ commit 0e531f4 (`?v=polish3`).
Unrecoverable listed in GAPS.md (Scary Potter/Bowling incomplete in this Flash build, missing IMAGE_DUST_PUFFS, etc.).

## Alignment fix (align6) — 2026-10-10
- Root cause: bg was cropped from x=0; Flash uses `BOARD_OFFSET=148` so lawn at LAWN_XMIN=25 matches grass.
- Zombie Y: `GridToPixelY(row) - 30` (Zombie.GetPosYBasedOnRow).
- Mower: parked `x=-21`, `y=GridY+10` (LawnMower.as); draw at x+4; shadow at (x-5,y+30).
- Plant: reanim at GridToPixel; `IMAGE_PLANTSHADOW` under feet (ox=-2, oy=46).
- Afterimages: death once→fade→remove; particle force-clear after duration+60; purge dead zombies.
- Pages cache: `?v=align6`

## Combat/trail fix (combat1) — 2026-10-10
- Root cause of green/brown trails: particle emitters clamped `age` to `duration-1` while `SpawnMinActive` kept respawning (planting dirt, maxLaunch=-1) → infinite debris stream.
- Fix: `_dying` stops spawning; age keeps increasing; force-clear after grace; hard age cap.
- Shoot: head `anim_shooting` + THROW1/2/3 Foley.
- Hit: `shotFlash` brightness flash + recoil + SPLAT/2/3 Foley + PEASPLAT (dies cleanly).
- Cache: `?v=combat1`

## Shoot sync + zombie damage stages (combat2) — 2026-10-10
- PeaShooter.as: FindTargetAndFire sets anim_shooting rate 35 + shootingCounter 35; Fire when counter==1 (animTime≈0.48).
- Zombie.as UpdateDamageStates: DropArm at body HP≤66%, DropHead at ≤33%; hide reanim tracks + PARTICLE_ZOMBIEARM/HEAD + limbs Foley.
- Cache: `?v=combat2`
