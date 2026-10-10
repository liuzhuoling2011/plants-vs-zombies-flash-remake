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
