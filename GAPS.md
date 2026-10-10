# Gaps vs Flash/Ruffle — Plants vs Zombies remake (4399/18012)

## What IS implemented (reanimator)

| Area | Implementation |
|------|----------------|
| Reanim binary format | Port of `ByteReanimDescriptor.as` (fps, tracks, transform flag/−1, α, kx/ky/sx/sy/tx/ty doubles, image UTF) |
| Playback | Port of `Reanimation.as` — animTime, frame lerp, Flash matrix, attach child on track, loop always / once-and-idle / once-and-hold |
| Plants | Peashooter (+head attach `anim_stem`), Sunflower, Wallnut (crack tracks), Cherry, Squash, SnowPea, Chomper, Repeater, Puff/Sun/Fume shroom, Gravebuster |
| Zombies | `REANIM_ZOMBIE` walk/eat/death; cone/bucket/flag/door track visibility; Pole/Paper/Football dedicated defs |
| Lawn mower / Sun | `REANIM_LAWNMOWER` / `REANIM_SUN` layered |

Verified in browser: plant & zombie crops show continuous frame-to-frame pixel motion (not static sprites).

## Still NOT 1:1

- Particle systems (dirt, pea splat, smoke) — mostly still images
- Crazy Dave / loadbar / selector screen reanims unused
- Exact sod-roll cutscene; night fog; graves rising particles
- Newspaper rage / pole vault state machines incomplete vs SWF
- Charred death uses death track or instant remove — not always `REANIM_ZOMBIE_CHARRED`
- Seed chooser for later adventure; Survival / Bowling / Puzzle modes
- Bitmap HUD fonts (system font for numbers/text)
- Hitbox polish after large reanim offsets (some plants sit high/low vs cell)
- Full wave flag timing / advice banners parity
- Music ducking & every Foley cue

## Honest verdict
**Not pixel-perfect 1:1**, but major plants/zombies now use real PopCap layered reanimator playback instead of static composites. Motion (idle sway, walk cycle, chomp, shoot head) comes from SWF reanim data.
