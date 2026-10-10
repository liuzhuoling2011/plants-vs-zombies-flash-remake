# Gaps vs Flash/Ruffle — Plants vs Zombies remake (4399/18012)

Updated after polish pass (particles, Dave, sod, specials, fonts, modes).

## Closed (recoverable from this SWF)

| Item | Evidence | Implementation |
|------|----------|----------------|
| Reanimator skeletal anim | ByteReanimDescriptor / Reanimation.as | `js/reanim.js` + defs |
| Particles (pea splat, planting dirt, powie, squash dust, sodroll, mower cloud, ice sparkle, wallnut eat, mowered head, …) | ByteParticleDescriptor + 59 PARTICLE_* bins | `js/particles.js` + `assets/particles/` |
| Crazy Dave + dialogs | CrazyDaveState.as + REANIM_CRAZYDAVE | `js/cutscenes.js` (L1 greeting zh) |
| Sod-roll lawn unlock | SodRollState.as TimeRollSod* + REANIM_SODROLL + PARTICLE_SODROLL | cutscene before L1/2/4 |
| Pole vault / newspaper rage / football speed / door / cone-bucket crack | Zombie.as phases | `entities.js` updatePolevaulter / updateNewspaper / helm tracks |
| Charred death | ApplyBurn → REANIM_ZOMBIE_CHARRED anim_crumble | cherry burn + charred list |
| Bitmap HUD fonts | ByteFontDescriptor + FONT_* | `js/fonts.js` (sun, progress) |
| Hitbox polish | ZombieAttackRect / plant cell | Ent.ZOMBIE_HIT on collide |
| Survival endless (Stage 2 style) | PVZApp.IsSurvivalMode / GAMEMODE_SURVIVAL_ENDLESS_STAGE_2 | Menu「生存无尽」flag loops |
| Wave UI / seed bank / lawn mower reanim | Board.as | prior + mower reanim |

## Remaining — unrecoverable or out of scope for THIS Flash build

| Item | Why |
|------|-----|
| Full Scary Potter / Vasebreaker gameplay | Mode flag exists (`IsScaryPotterLevel`) but vase/grid-item puzzle content is stubby vs PC; UpsellScreen gates Puzzle/Minigame |
| Wallnut Bowling full minigame | `IsWallnutBowlingLevel` referenced; Dave bowling lines exist, but bowling seed/physics not fully authored as playable mode in this 4399 Flash slice |
| Every Foley + music ducking | Partial SFX wired; not every PVZFoleyType |
| Night fog volumetric + full grave-rise AI | Night bg used; gravebuster exists; full fog particle stack not parity |
| IMAGE_DUST_PUFFS / Zomboss chunks | Missing from `resources.swf` — aliased to dirt/explosion |
| FONT_HOUSEOFTERROR16 | Binary parse failed (corrupt/truncated in FFDec export) — other 11 fonts OK |
| Pixel-perfect advice banners / LoadBar / SelectorScreen reanim chrome | Assets present; not fully driven as Flash UI state machine |
| Crazy Dave full adventure script (all indices) | Only sparse LookUpCrazyDaveText in SWF; stringManager mostly empty — we cover L1 tips + known 2400/241x lines |

## Honest verdict
Major GAPS items that **are in this SWF** are implemented. What remains is either **missing art/strings in this Flash build**, **upsell-only modes**, or **chrome polish** below gameplay threshold. Not claiming Ruffle-identical, but no longer “static composites only.”
