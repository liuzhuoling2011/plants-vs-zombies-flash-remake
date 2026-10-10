// Reanim build reanim2
import * as C from './constants.js';
import { ReanimLibrary } from './reanim.js';
import * as Ent from './entities.js';
import { ParticleLibrary } from './particles.js';
import { FontLibrary } from './fonts.js';
import * as Cut from './cutscenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

function fitCanvas() {
  const wrap = canvas.parentElement;
  const maxW = Math.min(wrap.clientWidth, window.innerWidth);
  const scale = maxW / C.BOARD_W;
  const cssW = Math.floor(C.BOARD_W * scale);
  const cssH = Math.floor(C.BOARD_H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  // Backing store = logical × DPR (sharp on retina); game stays in 540×405 space
  canvas.width = Math.floor(C.BOARD_W * dpr);
  canvas.height = Math.floor(C.BOARD_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // HD 2× bitmaps downscaled into logical px — use high-quality filter, not nearest
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
}
window.addEventListener('resize', fitCanvas);

const assets = { img: {}, sfx: {}, music: {} };
const reanimLib = new ReanimLibrary();
const particleLib = new ParticleLibrary();
const fontLib = new FontLibrary();

const ASSET_VER = C.ASSET_VER || 'hd1';
function assetUrl(path) {
  if (!path) return path;
  // Prefer WebP HD paths; append cache bust
  let p = path.replace(/\\.(png|jpg|jpeg)$/i, '.webp');
  return p + (p.includes('?') ? '&' : '?') + 'v=' + ASSET_VER;
}
const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image();
  i.decoding = 'async';
  i.onload = () => res(i);
  i.onerror = rej;
  i.src = assetUrl(src);
});

function setLoadUI(pct, label) {
  const bar = document.getElementById('loadbar-fill');
  const ld = document.getElementById('loading');
  if (bar) bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
  if (ld) ld.textContent = label || '';
}

async function loadImages(map, weightStart, weightEnd) {
  const entries = Object.entries(map);
  let done = 0;
  await Promise.all(entries.map(async ([k, v]) => {
    try { assets.img[k] = await loadImg(v); } catch (e) { console.warn('img', v, e); }
    done++;
    const t = weightStart + (weightEnd - weightStart) * (done / entries.length);
    setLoadUI(t * 100, `加载图片 ${done}/${entries.length}…`);
  }));
}

async function loadSfxList(names, weightStart, weightEnd) {
  if (!assets.ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    assets.ac = AC ? new AC() : null;
  }
  if (!assets.buffers) assets.buffers = {};
  let done = 0;
  await Promise.all(names.map(async (name) => {
    try {
      const r = await fetch(assetUrl('assets/sfx/' + name + '.mp3'));
      const b = await r.arrayBuffer();
      if (assets.ac) assets.buffers[name] = await assets.ac.decodeAudioData(b.slice(0));
    } catch (_) {}
    done++;
    const t = weightStart + (weightEnd - weightStart) * (done / names.length);
    setLoadUI(t * 100, `加载音效 ${done}/${names.length}…`);
  }));
}

/** Phase A — title / first paint (small). */
async function loadTitlePack() {
  setLoadUI(2, '准备标题画面…');
  await loadImages({
    title: 'assets/bg/titlescreen.webp',
    logo: 'assets/ui/pvz_logo.webp',
  }, 0.02, 0.12);
  await loadSfxList(['tap', 'buttonclick'], 0.12, 0.18);
}

/** Phase B — playable core (bg, UI, plants icons, core reanim). */
async function loadPlayPack() {
  const imgs = {
    bg1: 'assets/bg/background1.webp',
    bg1u: 'assets/bg/background1_unsodded.webp',
    bg2: 'assets/bg/background2.webp',
    sod1: 'assets/bg/sod1row.webp',
    sod3: 'assets/bg/sod3row.webp',
    seedbank: 'assets/ui/seedbank.webp',
    sunbank: 'assets/ui/sunbank.webp',
    shovelbank: 'assets/ui/shovelbank.webp',
    shovel: 'assets/ui/shovel.webp',
    seedpacket: 'assets/ui/seedpacket.webp',
    flagmeter: 'assets/ui/flagmeter.webp',
    flagbar: 'assets/ui/flagmeterbar.webp',
    flagflag: 'assets/ui/flagmeterflag.webp',
    flaghead: 'assets/ui/flagmeterhead.webp',
    lawnmower: 'assets/ui/lawnmower.webp',
    plantshadow: 'assets/ui/plantshadow.webp',
    plantshadow2: 'assets/ui/plantshadow2.webp',
    pea_shadows: 'assets/ui/pea_shadows.webp',
    pea: 'assets/fx/pea.webp',
    snowpea: 'assets/fx/snowpea.webp',
    sun: 'assets/fx/sun.webp',
    zNormal: 'assets/zombie/zombie_normal.webp',
    zCone: 'assets/zombie/zombie_cone.webp',
    zBucket: 'assets/zombie/zombie_bucket.webp',
    zFlag: 'assets/zombie/zombie_flag.webp',
  };
  for (const id of C.SEED_IMG) imgs['p_' + id] = `assets/plants/${id}.webp`;
  await loadImages(imgs, 0.18, 0.45);
  setLoadUI(48, '加载骨骼动画…');
  await reanimLib.load(assetUrl('assets/reanim/manifest.json'));
  setLoadUI(72, '加载粒子…');
  await particleLib.load(assetUrl('assets/particles/manifest.json'));
  setLoadUI(82, '加载字体…');
  await fontLib.load('assets/fonts/manifest.json');
  await loadSfxList([
    'plant','throw','throw1','throw2','throw3','splat','splat2','splat3',
    'chomp','groan','gulp','shovel','points','seedlift','explosion',
    'awooga','readysetplant','frozen','siren','limbs',
  ], 0.85, 0.95);
  setLoadUI(96, '即将开始…');
}

/** Phase C — BGM deferred until first play (slow-net friendly). */
let _bgmReady = false;
function ensureBgm() {
  if (_bgmReady) return;
  _bgmReady = true;
  assets.bgm = new Audio(assetUrl('assets/music/grasswalk.mp3'));
  assets.bgm.loop = true; assets.bgm.volume = 0.45;
  assets.menuBgm = new Audio(assetUrl('assets/music/loonboon.mp3'));
  assets.menuBgm.loop = true; assets.menuBgm.volume = 0.4;
  assets.winBgm = new Audio(assetUrl('assets/music/winmusic.mp3')); assets.winBgm.volume = 0.5;
  assets.loseBgm = new Audio(assetUrl('assets/music/losemusic.mp3')); assets.loseBgm.volume = 0.5;
}

async function loadAll() {
  // Kept for compatibility — prefer phased calls from main()
  await loadTitlePack();
  await loadPlayPack();
}

function playSfx(name, vol = 1) {
  if (!assets.ac || !assets.buffers[name]) return;
  const s = assets.ac.createBufferSource();
  const g = assets.ac.createGain();
  g.gain.value = vol;
  s.buffer = assets.buffers[name];
  s.connect(g); g.connect(assets.ac.destination);
  s.start();
}
/** Pick one of several SFX names (SWF FoleyType multi-sample). */
function playFoley(names, vol = 1) {
  const ok = names.filter((n) => assets.buffers[n]);
  if (!ok.length) return;
  playSfx(ok[(Math.random() * ok.length) | 0], vol);
}
function spawnFx(key, x, y) {
  try {
    const sys = particleLib.spawn(key, x, y);
    if (sys) state.fx.push(sys);
  } catch (e) { console.warn('fx', key, e); }
}


function unlockAudio() {
  ensureBgm();
  if (assets.ac && assets.ac.state === 'suspended') assets.ac.resume();
}
function withBgm(fn) { ensureBgm(); try { fn(); } catch (_) {} }


function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return (a + Math.floor(Math.random() * (b - a + 1))) | 0; }

const saveKey = 'pvz18012_save';
function loadSave() {
  try { return JSON.parse(localStorage.getItem(saveKey) || '{}'); } catch { return {}; }
}
function writeSave(o) {
  const cur = loadSave();
  localStorage.setItem(saveKey, JSON.stringify({ ...cur, ...o }));
}

const state = {
  scene: 'title', // title | menu | playing | won | lost | pause
  level: 1,
  maxLevel: 1,
  sun: 50,
  tick: 0,
  packets: [],
  plants: [],
  zombies: [],
  projectiles: [],
  suns: [],
  mowers: [],
  particles: [],
  cursor: null, // {type:'seed'|'shovel', seed?}
  wave: 0,
  numWaves: 4,
  waveCD: 1800,
  sunCD: 425,
  sodRows: 5,
  message: '',
  messageT: 0,
  paused: false,
  pointer: { x: 0, y: 0, down: false },
  readyFlash: 0,
};

function zombieLaneY(row) {
  // Zombie.as GetPosYBasedOnRow → GridToPixelY(row) - 30
  return C.gridToPixelY(row) + C.ZOMBIE_Y_OFFSET;
}
function mowerLaneY(row) {
  // LawnMower.as ready: GetPosYBasedOnRow(...) + 10
  return C.gridToPixelY(row) + C.MOWER_Y_OFFSET;
}
function rowsAllowed() {
  // Map sodRows to which lawn rows (0..4) are plantable
  const n = state.sodRows;
  if (n >= 5) return [0, 1, 2, 3, 4];
  if (n === 3) return [1, 2, 3];
  return [2];
}

function initLevel(level) {
  state.level = level;
  state.scene = 'playing';
  state.sun = C.startSun(level);
  state.tick = 0;
  state.plants = [];
  state.zombies = [];
  state.projectiles = [];
  state.suns = [];
  state.particles = [];
  state.cursor = null;
  state.wave = 0;
  state.numWaves = C.ZOMBIE_WAVES[Math.min(level - 1, C.ZOMBIE_WAVES.length - 1)] || 4;
  state.waveCD = level === 2 ? 5000 : C.ZOMBIE_COUNTDOWN_FIRST;
  state.sunCD = randInt(C.SUN_COUNTDOWN, C.SUN_COUNTDOWN + C.SUN_COUNTDOWN_RANGE);
  state.sodRows = C.sodRowsForLevel(level);
  state.message = level === 1 ? '点击卡片，再点草地种下豌豆射手！' : `第 ${level} 关 — 收集阳光，挡住僵尸！`;
  state.messageT = 300;
  state.readyFlash = 180;
  state.paused = false;

  const n = C.numSeedsInBank(level);
  state.packets = [];
  for (let i = 0; i < n; i++) {
    const refresh = C.SEED_REFRESH[i];
    const cooling = refresh >= 3000;
    state.packets.push({
      type: i,
      refresh: cooling ? (refresh === 5000 ? 5000 : 2000) : 0,
      refreshMax: refresh,
      active: !cooling,
    });
  }
  state.mowers = rowsAllowed().map((r) => ({
    row: r, x: C.MOWER_X, y: mowerLaneY(r), dead: false, active: false, speed: 0,
    reanim: Ent.createMowerReanim(reanimLib),
  }));

  state.fx = [];
  state.charred = [];
  state.dave = null;
  state.cutscene = null;
  // Sod-roll cutscene for levels that unlock lawn (SodRollState.as)
  if (state.gameMode === 'adventure' && Cut.levelsWithSod(level) && level <= 4 && !state._skipSod) {
    const rolls = [];
    const n = level === 1 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const r = Cut.createSodRollReanim(reanimLib, level, i);
      if (r) rolls.push(r);
      spawnFx('PARTICLE_SODROLL', 20, level === 1 ? 260 : (i === 0 ? 200 : 350));
    }
    state.cutscene = { kind: 'sod', t: 0, rolls, sodPos: 0 };
    state.scene = 'cutscene';
    // Start with previous sodRows visually until roll completes
    if (level === 1) state.sodRows = 0;
    else if (level === 2) state.sodRows = 1;
    else if (level === 4) state.sodRows = 3;
  } else if (state.gameMode === 'adventure' && level === 1) {
    // Crazy Dave greeting (dialog indices from CrazyDaveState)
    startDave([1001, 1002, 1003]);
  } else {
    ensureBgm();
    try { assets.menuBgm.pause(); assets.loseBgm.pause(); assets.winBgm.pause(); } catch(_){}
    assets.bgm.currentTime = 0;
    assets.bgm.play().catch(() => {});
    playSfx('readysetplant', 0.7);
    playSfx('awooga', 0.5);
  }
}

function startDave(indices) {
  const re = Cut.createDaveReanim(reanimLib);
  state.dave = {
    reanim: re,
    queue: indices.slice(),
    index: 0,
    text: '',
    delay: 0,
  };
  if (indices.length) {
    state.dave.text = Cut.cleanDaveText(Cut.daveText(indices[0]));
    Cut.daveTalk(re, 'small');
  }
  state.cutscene = { kind: 'dave' };
  state.scene = 'cutscene';
}

function finishCutsceneToPlay() {
  state.cutscene = null;
  state.dave = null;
  state.sodRows = C.sodRowsForLevel(state.level);
  state.mowers = rowsAllowed().map((r) => ({
    row: r, x: C.MOWER_X, y: mowerLaneY(r), dead: false, active: false, speed: 0,
    reanim: Ent.createMowerReanim(reanimLib),
  }));
  state.scene = 'playing';
  ensureBgm();
  try { assets.menuBgm.pause(); assets.loseBgm.pause(); assets.winBgm.pause(); } catch(_){}
  assets.bgm.currentTime = 0;
  assets.bgm.play().catch(() => {});
  playSfx('readysetplant', 0.7);
  playSfx('awooga', 0.5);
}

function plantAt(col, row, seed) {
  if (col < 0 || row < 0) return false;
  if (!rowsAllowed().includes(row)) {
    state.message = '这块草地还没铺好哦'; state.messageT = 120; return false;
  }
  if (state.plants.some((p) => p.col === col && p.row === row && !p.dead)) {
    return false;
  }
  const cost = C.SEED_COST[seed];
  if (state.sun < cost) {
    state.message = '阳光不够！'; state.messageT = 100; return false;
  }
  state.sun -= cost;
  const hp = seed === C.SEED.WALLNUT ? 4000 : 300;
  const launch = (seed === C.SEED.SUNFLOWER || seed === C.SEED.SUNSHROOM) ? 2500
    : (seed === C.SEED.PEASHOOTER || seed === C.SEED.SNOWPEA || seed === C.SEED.REPEATER || seed === C.SEED.PUFFSHROOM || seed === C.SEED.FUMESHROOM) ? 150
    : 2500;
  const plant = {
    seed, col, row,
    x: C.gridToPixelX(col), y: C.gridToPixelY(row),
    hp, maxHp: hp,
    launch, launchCD: randInt(0, Math.min(launch, 300)),
    dead: false, age: 0, state: 0, flash: 0, shootingCounter: 0,
    reanim: null,
  };
  plant.reanim = Ent.createPlantReanim(reanimLib, seed);
  state.plants.push(plant);
  playSfx('plant');
  spawnFx('PARTICLE_PLANTING', plant.x + 27, plant.y + 55);
  return true;
}

function spawnZombie(type, row) {
  if (row === undefined) {
    const rows = rowsAllowed();
    row = rows[randInt(0, rows.length - 1)];
  }
  let vel = rand(0.23, 0.37);
  let helm = 0, shield = 0;
  let img = 'zNormal';
  if (type === C.ZOMBIE.FLAG) { vel = 0.45; img = 'zFlag'; }
  if (type === C.ZOMBIE.CONE) { helm = 370; img = 'zCone'; }
  if (type === C.ZOMBIE.BUCKET) { helm = 1100; img = 'zBucket'; }
  if (type === C.ZOMBIE.POLE) { vel = rand(0.66, 0.68); }
  if (type === C.ZOMBIE.FOOTBALL) { vel = rand(0.66, 0.68); helm = 1400; }
  if (type === C.ZOMBIE.DOOR) { shield = 1100; }
  if (type === C.ZOMBIE.PAPER) { shield = 150; }
  const z = {
    type, row,
    x: C.BOARD_W - 13 + Math.random() * 27,
    y: zombieLaneY(row),
    vel, baseVel: vel,
    hp: 270, maxHp: 270, helm, shield,
    eating: false, dead: false, chilled: 0, age: 0, bob: Math.random() * Math.PI * 2,
    img, phase: 0, reanim: null, _wasEating: false, _dying: false,
  };
  z.reanim = Ent.createZombieReanim(reanimLib, type);
  Ent.initZombiePhase(z);
  state.zombies.push(z);
  if (Math.random() < 0.25) playSfx('groan', 0.4);
}

function pickZombieType(level, waveIndex, isFlag) {
  if (isFlag) return C.ZOMBIE.FLAG;
  const pool = [C.ZOMBIE.NORMAL];
  if (level >= 3) pool.push(C.ZOMBIE.CONE, C.ZOMBIE.CONE);
  if (level >= 6) pool.push(C.ZOMBIE.POLE);
  if (level >= 8) pool.push(C.ZOMBIE.BUCKET);
  if (level >= 11) pool.push(C.ZOMBIE.PAPER);
  if (level >= 13) pool.push(C.ZOMBIE.DOOR);
  if (level >= 16) pool.push(C.ZOMBIE.FOOTBALL);
  return pool[randInt(0, pool.length - 1)];
}

function spawnWave() {
  const w = state.wave;
  const isFlag = (w + 1) % 10 === 0 || w === state.numWaves - 1;
  const count = 1 + Math.min(5, Math.floor(w / 2) + Math.floor(state.level / 3));
  if (isFlag) spawnZombie(C.ZOMBIE.FLAG);
  for (let i = 0; i < count; i++) {
    spawnZombie(pickZombieType(state.level, w, false));
  }
  state.wave++;
  if (state.wave >= state.numWaves) {
    state.waveCD = -1;
  } else if (isFlag || state.wave === state.numWaves - 1) {
    state.waveCD = C.ZOMBIE_COUNTDOWN_BEFORE_FLAG;
  } else {
    state.waveCD = C.ZOMBIE_COUNTDOWN + randInt(0, C.ZOMBIE_COUNTDOWN_RANGE);
  }
  if (isFlag) {
    state.message = '一大波僵尸正在接近！'; state.messageT = 200;
    playSfx('siren', 0.6);
  }
}

function spawnSun(x, y, fromPlant) {
  state.suns.push({
    x, y, ty: fromPlant ? y - 40 : 60 + Math.random() * 200,
    vx: fromPlant ? rand(-0.4, 0.4) : 0,
    vy: fromPlant ? -1.2 : 1.2,
    life: 800, value: 25, collected: false, fromPlant: !!fromPlant,
    reanim: Ent.createSunReanim(reanimLib),
  });
}

function addPea(plant, snow) {
  const x = plant.x + 40;
  const y = plant.y + 20;
  state.projectiles.push({
    x, y, row: plant.row, snow: !!snow, dead: false,
  });
  // PVZFoleyType.THROW → SOUND_THROW1/2/3
  playFoley(['throw', 'throw1', 'throw2', 'throw3'], 0.45);
}

function damageZombie(z, dmg, freeze, opts = {}) {
  if (!z || z.dead || z._dying) return;
  if (freeze) z.chilled = Math.max(z.chilled || 0, 1000);
  // Zombie.as TakeDamage → mJustGotShotCounter = 25 (white flash)
  if (!opts.noFlash) z.shotFlash = 25;
  let left = dmg;
  if (z.shield > 0) {
    const take = Math.min(z.shield, left);
    z.shield -= take; left -= take;
  }
  if (left > 0 && z.helm > 0) {
    const take = Math.min(z.helm, left);
    z.helm -= take; left -= take;
    // helmet crack visibility (cone/bucket)
    if (z.reanim && z.type === C.ZOMBIE.CONE) {
      const r = z.helm / 370;
      z.reanim.setTrackVisible('anim_cone1', r > 0.66);
      z.reanim.setTrackVisible('anim_cone2', r > 0.33 && r <= 0.66);
      z.reanim.setTrackVisible('anim_cone3', r > 0 && r <= 0.33);
    }
    if (z.reanim && z.type === C.ZOMBIE.BUCKET) {
      const r = z.helm / 1100;
      z.reanim.setTrackVisible('anim_bucket1', r > 0.66);
      z.reanim.setTrackVisible('anim_bucket2', r > 0.33 && r <= 0.66);
      z.reanim.setTrackVisible('anim_bucket3', r > 0 && r <= 0.33);
    }
  }
  if (left > 0) z.hp -= left;
  Ent.updateNewspaper(z);
  // Body HP stages: arm @ ≤66%, head @ ≤33% (Zombie.UpdateDamageStates)
  if (left > 0) {
    Ent.updateDamageStates(z, spawnFx, playSfx);
  }
  if (z.hp <= 0 && !z._dying) {
    playSfx('limbs', 0.3);
    if (opts.burn) {
      const ch = Ent.createCharredReanim(reanimLib, z.x, z.y);
      if (ch) { state.charred.push(ch); z.dead = true; z._dying = true; return; }
    }
    if (z.reanim && z.reanim.mDefinition.trackNameMap['anim_death']) {
      Ent.zombiePlayDeath(z, reanimLib);
    } else {
      z.dead = true;
    }
  }
}

function updatePlaying(dtTicks) {
  const steps = Math.max(1, Math.round(dtTicks));
  for (let s = 0; s < steps; s++) {
    state.tick++;
    if (state.messageT > 0) state.messageT--;
    if (state.readyFlash > 0) state.readyFlash--;

    // packets cooldown
    for (const p of state.packets) {
      if (!p.active) {
        p.refresh--;
        if (p && p.refresh <= 0) { p.active = true; p.refresh = 0; }
      }
    }

    // sky sun
    if (state.level > 1 || state.tick > 500) {
      state.sunCD--;
      if (state.sunCD <= 0 && state.level <= 10) {
        spawnSun(80 + Math.random() * 380, -20, false);
        state.sunCD = randInt(C.SUN_COUNTDOWN, C.SUN_COUNTDOWN + C.SUN_COUNTDOWN_RANGE);
      }
    }

    // waves
    if (state.waveCD >= 0) {
      state.waveCD--;
      if (state.waveCD <= 0 && state.wave < state.numWaves) spawnWave();
    }

    // plants
    for (const p of state.plants) {
      if (p.dead) continue;
      p.age++;
      if (p.flash > 0) p.flash--;
      p.launchCD--;
      if (p.reanim) {
        p.reanim.body.update(1);
        Ent.updateWallnutCrack(p);
      }
      const seed = p.seed;
      if (seed === C.SEED.SUNFLOWER || seed === C.SEED.SUNSHROOM) {
        if (p.launchCD <= 0) {
          spawnSun(p.x + 20, p.y + 10, true);
          p.launchCD = randInt(p.launch - 150, p.launch);
        }
      } else if (seed === C.SEED.PEASHOOTER || seed === C.SEED.SNOWPEA || seed === C.SEED.REPEATER || seed === C.SEED.PUFFSHROOM) {
        // PeaShooter.as UpdateShooter + UpdateShooting:
        // launchCD→0 starts shoot anim; pea spawns when shootingCounter hits 1
        const foe = state.zombies.find((z) => !z.dead && !z._dying && z.row === p.row && z.x > p.x && z.x < C.BOARD_W + 40);
        // UpdateShooting first (same order as PeaShooter.Update: UpdateShooting then UpdateShooter)
        if (p.shootingCounter > 0) {
          p.shootingCounter--;
          if (p.shootingCounter === 1) {
            addPea(p, seed === C.SEED.SNOWPEA);
          }
        }
        if (foe && p.launchCD <= 0) {
          Ent.plantPlayShoot(p, seed === C.SEED.REPEATER);
          p.launchCD = p.launch - Math.random() * 15;
        } else if (seed === C.SEED.REPEATER && foe && p.launchCD === 25) {
          // Repeater second shot in the launch cycle
          Ent.plantPlayShoot(p, true);
        }
      } else if (seed === C.SEED.CHERRYBOMB) {
        if (p.age === 80) {
          // explode 3x3
          playSfx('explosion');
          for (const z of state.zombies) {
            if (z.dead) continue;
            if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - (p.x + 27)) < 120) {
              damageZombie(z, 1800, false, { burn: true });
              spawnFx('PARTICLE_POWIE', z.x + 20, z.y + 40);
            }
          }
          p.dead = true;
        }
      } else if (seed === C.SEED.SQUASH) {
        const target = state.zombies.find((z) => !z.dead && z.row === p.row && Math.abs(z.x - (p.x + 20)) < 70);
        if (target && p.state === 0) { p.state = 1; p.age = 0; }
        if (p.state === 1 && p.age > 50) {
          damageZombie(target || {}, 1800, false);
          spawnFx('PARTICLE_DUST_SQUASH', p.x + 27, p.y + 50);
          for (const z of state.zombies) {
            if (!z.dead && z.row === p.row && Math.abs(z.x - (p.x + 20)) < 50) damageZombie(z, 1800, false);
          }
          playSfx('chomp');
          p.dead = true;
        }
      } else if (seed === C.SEED.CHOMPER) {
        const target = state.zombies.find((z) => !z.dead && z.row === p.row && z.x > p.x && z.x < p.x + 90);
        if (target && p.state === 0) {
          target.dead = true;
          p.state = 1; p.age = 0;
          playSfx('chomp'); playSfx('gulp');
        }
        if (p.state === 1 && p.age > 4000) p.state = 0; // digest ~40s
      } else if (seed === C.SEED.FUMESHROOM) {
        if (p.launchCD <= 0) {
          const foes = state.zombies.filter((z) => !z.dead && z.row === p.row && z.x > p.x && z.x < p.x + 250);
          if (foes.length) {
            for (const z of foes) damageZombie(z, 20, false);
            p.launchCD = 150;
            playSfx('throw', 0.2);
          }
        }
      }
    }
    state.plants = state.plants.filter((p) => !p.dead);

    // projectiles
    for (const pr of state.projectiles) {
      if (pr.dead) continue;
      pr.x += C.PROJECTILE_SPEED;
      if (pr.x > C.BOARD_W + 20) { pr.dead = true; continue; }
      for (const z of state.zombies) {
        if (z.dead || z.row !== pr.row) continue;
        if (pr.x > z.x + 10 && pr.x < z.x + 50) {
          damageZombie(z, C.PROJECTILE_DAMAGE, pr.snow);
          // brief recoil nudge (hit reaction)
          z.x += 1.5;
          spawnFx(pr.snow ? 'PARTICLE_SNOWPEASPLAT' : 'PARTICLE_PEASPLAT', pr.x, pr.y + 4);
          if (pr.snow) spawnFx('PARTICLE_ICESPARKLE', pr.x, pr.y);
          // PVZFoleyType.SPLAT → SOUND_SPLAT/2/3
          playFoley(['splat', 'splat2', 'splat3'], 0.55);
          if (pr.snow) playSfx('frozen', 0.25);
          pr.dead = true;
          break;
        }
      }
    }
    state.projectiles = state.projectiles.filter((p) => !p.dead);

    // zombies
    for (const z of state.zombies) {
      if (z.dead) continue;
      z.age++;
      z.bob += 0.08;
      if (z.chilled > 0) z.chilled--;
      if (z.shotFlash > 0) z.shotFlash--;
      const plant = state.plants.find((p) => !p.dead && p.row === z.row && (z.x + Ent.ZOMBIE_HIT.x) < p.x + 48 && (z.x + Ent.ZOMBIE_HIT.x + Ent.ZOMBIE_HIT.w) > p.x + 6);
      if (z._dying) {
        z._deathAge = (z._deathAge || 0) + 1;
        if (z.reanim) z.reanim.update(1);
        // Fade after death clip finishes; hard-cap so no sticky ghosts
        if (z._deathDone || z._deathAge > 220) {
          z._fade = (z._fade == null ? 1 : z._fade) - 0.08;
          if (z.reanim) z.reanim.alphaMul = Math.max(0, z._fade);
          if (z._fade <= 0 || z._deathAge > 260) {
            z.dead = true;
            z.reanim = null; // drop reanim so nothing redraws
          }
        }
        continue;
      }
      // Keep lane Y locked to row (SWF -30)
      z.y = zombieLaneY(z.row);
      Ent.updatePolevaulter(z, state.plants);
      Ent.updateNewspaper(z);
      if (z.phase === Ent.PHASE.POLE_IN || z.phase === Ent.PHASE.POLE_PRE && z.type === C.ZOMBIE.POLE) {
        // PRE still walks; IN handled inside updatePolevaulter
        if (z.phase === Ent.PHASE.POLE_IN) {
          if (z.reanim) z.reanim.update(1);
          continue;
        }
      }
      // SWF: eating requires mHasHead
      if (plant && z.hasHead !== false && !(plant.seed === C.SEED.CHERRYBOMB || plant.seed === C.SEED.SQUASH)) {
        z.eating = true;
        Ent.zombieSetEating(z, true);
        if (z.age % C.TICKS_BETWEEN_EATS === 0) {
          if (!(z.chilled > 0 && z.age % 2 === 1)) {
            plant.hp -= C.TICKS_BETWEEN_EATS;
            plant.flash = 8;
            if (z.age % 20 === 0) {
              playSfx('chomp', 0.25);
              if (plant.seed === C.SEED.WALLNUT) spawnFx('PARTICLE_WALLNUTEATSMALL', plant.x + 27, plant.y + 30);
            }
            if (plant.hp <= 0) {
              plant.dead = true;
              playSfx('gulp', 0.4);
            }
          }
        }
      } else {
        Ent.zombieSetEating(z, false);
        z.eating = false;
        let spd = z.vel;
        if (z.reanim) {
          const gv = z.reanim.getTrackVelocity('_ground');
          if (gv && Math.abs(gv) > 0.01) spd = Math.abs(gv);
        }
        if (z.chilled > 0) {
          spd *= C.CHILLED_FACTOR;
          if (z.reanim) z.reanim.overrideRGB = [0.6, 0.85, 1];
        } else if (z.reanim) {
          z.reanim.overrideRGB = [1, 1, 1];
        }
        z.x -= spd;
      }
      if (z.reanim) z.reanim.update(1);
      if (z.x < -40) {
        // house entered
        state.scene = 'lost';
        ensureBgm(); try { assets.bgm.pause(); assets.loseBgm.currentTime = 0; assets.loseBgm.play(); } catch(_){}
        return;
      }
    }
    state.zombies = state.zombies.filter((z) => !z.dead);

    // lawn mowers
    for (const m of state.mowers) {
      if (m.dead) continue;
      if (m.reanim) m.reanim.update(1);
      // Ready Y = GridY+10; triggered Y = GridY+16 (LawnMower.as)
      m.y = C.gridToPixelY(m.row) + (m.active ? 16 : C.MOWER_Y_OFFSET);
      if (!m.active) {
        const hit = state.zombies.find((z) => !z.dead && !z._dying && z.row === m.row && z.x < 40);
        if (hit) { m.active = true; m.speed = 4; if (m.reanim) m.reanim.animRate = 70; playSfx('siren', 0.3); }
      } else {
        m.x += m.speed;
        for (const z of state.zombies) {
          if (!z.dead && z.row === m.row && z.x < m.x + 50 && z.x > m.x - 10) {
            spawnFx('PARTICLE_MOWERCLOUD', z.x + 20, z.y + 40);
            spawnFx('PARTICLE_MOWEREDZOMBIEHEAD', z.x + 20, z.y + 20);
            z.dead = true;
            z.reanim = null;
          }
        }
        if (m.x > C.BOARD_W + 40) m.dead = true;
      }
    }

    // suns
    for (const s of state.suns) {
      if (s.collected) continue;
      s.life--;
      if (s.fromPlant) {
        s.x += s.vx; s.y += s.vy; s.vy += 0.05;
        if (s.y >= s.ty && s.vy > 0) { s.vy = 0; s.vx = 0; }
      } else {
        if (s.y < s.ty) s.y += s.vy;
      }
      if (s.reanim) s.reanim.update(1);
      if (s.life <= 0) s.collected = true;
    }
    state.suns = state.suns.filter((s) => !s.collected);

    // particles + charred
    for (const fx of state.fx) fx.update(1);
    state.fx = state.fx.filter((f) => !f.dead);
    for (const ch of state.charred) ch.update(1);
    for (const ch of state.charred) {
      ch._age = (ch._age || 0) + 1;
      if (ch.animTime >= 1 || ch._age > 180) ch._gone = true;
    }
    state.charred = state.charred.filter((c) => !c._gone);
    // Cap live FX so splats cannot pile into ghosts
    state.fx = state.fx.filter((f) => !f.dead);
    if (state.fx.length > 24) {
      // Drop oldest first
      state.fx.splice(0, state.fx.length - 24);
    }

    // win check
    if (state.wave >= state.numWaves && state.waveCD < 0 && state.zombies.length === 0) {
      if (state.gameMode === 'survival') {
        state.survivalFlags = (state.survivalFlags || 0) + 1;
        state.wave = 0;
        state.numWaves = 8;
        state.waveCD = C.ZOMBIE_COUNTDOWN;
        state.message = `旗帜 ${state.survivalFlags} 守住了！继续…`;
        state.messageT = 250;
        playSfx('readysetplant', 0.5);
      } else {
        state.scene = 'won';
        const next = Math.min(20, state.level + 1);
        if (next > state.maxLevel) { state.maxLevel = next; writeSave({ maxLevel: next }); }
        writeSave({ level: next });
        ensureBgm(); try { assets.bgm.pause(); assets.winBgm.currentTime = 0; assets.winBgm.play(); } catch(_){}
        return;
      }
    }
  }
}

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - r.left) * (C.BOARD_W / r.width),
    y: (clientY - r.top) * (C.BOARD_H / r.height),
  };
}

function packetRect(i) {
  // Seed bank packets to the right of sun counter
  const x = 78 + i * 54;
  return { x, y: 6, w: 50, h: 70 };
}

function onPointer(x, y, isDown) {
  state.pointer.x = x; state.pointer.y = y;
  if (!isDown) return;
  unlockAudio();

  if (state.scene === 'cutscene' && state.cutscene && state.cutscene.kind === 'dave') {
    const d = state.dave;
    if (d) {
      d.index++;
      if (d.index >= d.queue.length) finishCutsceneToPlay();
      else {
        d.text = Cut.cleanDaveText(Cut.daveText(d.queue[d.index]));
        Cut.daveTalk(d.reanim, d.index % 2 ? 'crazy' : 'small');
      }
    }
    return;
  }
  if (state.scene === 'title') {
    state.scene = 'menu';
    playSfx('buttonclick');
    ensureBgm(); try { assets.menuBgm.play(); } catch(_){}
    return;
  }
  if (state.scene === 'menu') {
    if (x > 150 && x < 390 && y > 70 && y < 118) {
      playSfx('buttonclick');
      state.gameMode = 'adventure';
      initLevel(Math.min(state.maxLevel, loadSave().level || 1));
    } else if (x > 150 && x < 390 && y > 130 && y < 178) {
      playSfx('buttonclick');
      state.gameMode = 'adventure';
      initLevel(state.maxLevel);
    } else if (x > 150 && x < 390 && y > 190 && y < 238) {
      playSfx('buttonclick');
      state.gameMode = 'survival';
      state.survivalFlags = 0;
      initLevel(10); // night-ish board; survival uses flag waves
      state.numWaves = 8;
      state.message = '生存无尽：守住草坪！';
      state.messageT = 200;
    } else if (x > 150 && x < 390 && y > 250 && y < 298) {
      writeSave({ maxLevel: 1, level: 1 }); state.maxLevel = 1;
      playSfx('tap');
      state.message = '进度已重置';
      state.messageT = 150;
    }
    return;
  }
  if (state.scene === 'won') {
    initLevel(Math.min(20, state.level + 1));
    return;
  }
  if (state.scene === 'lost') {
    initLevel(state.level);
    return;
  }
  if (state.scene !== 'playing') return;

  // collect sun
  for (const s of state.suns) {
    if (s.collected) continue;
    if (Math.hypot(s.x + 20 - x, s.y + 20 - y) < 36) {
      s.collected = true;
      state.sun += s.value;
      playSfx('points', 0.5);
      return;
    }
  }

  // shovel
  const sh = C.SHOVEL_RECT;
  if (x >= sh.x && x <= sh.x + sh.w && y >= sh.y && y <= sh.y + sh.h) {
    state.cursor = state.cursor && state.cursor.type === 'shovel' ? null : { type: 'shovel' };
    playSfx('shovel');
    return;
  }

  // packets
  for (let i = 0; i < state.packets.length; i++) {
    const r = packetRect(i);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      const p = state.packets[i];
      if (!p.active) { state.message = '还在冷却中…'; state.messageT = 80; return; }
      if (state.sun < C.SEED_COST[p.type]) { state.message = '阳光不够！'; state.messageT = 80; return; }
      state.cursor = { type: 'seed', seed: p.type, index: i };
      playSfx('seedlift');
      return;
    }
  }

  // plant / shovel on lawn
  const col = C.pixelToGridX(x);
  const row = C.pixelToGridY(x, y);
  if (state.cursor?.type === 'shovel') {
    const pl = state.plants.find((p) => !p.dead && p.col === col && p.row === row);
    if (pl) { pl.dead = true; playSfx('shovel'); }
    state.cursor = null;
    return;
  }
  if (state.cursor?.type === 'seed') {
    const seed = state.cursor.seed;
    const idx = state.cursor.index;
    if (plantAt(col, row, seed)) {
      const p = state.packets[idx];
      p.active = false;
      p.refresh = p.refreshMax;
      state.cursor = null;
    }
  }
}

canvas.addEventListener('mousedown', (e) => { const p = canvasPos(e); onPointer(p.x, p.y, true); });
canvas.addEventListener('mousemove', (e) => { const p = canvasPos(e); state.pointer.x = p.x; state.pointer.y = p.y; });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); const p = canvasPos(e); onPointer(p.x, p.y, true); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); const p = canvasPos(e); state.pointer.x = p.x; state.pointer.y = p.y; }, { passive: false });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.scene === 'playing') {
    state.scene = 'menu';
    ensureBgm(); try { assets.bgm.pause(); assets.menuBgm.play(); } catch(_){}
  }
  if (e.key === 'p' || e.key === 'P') state.paused = !state.paused;
});

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(ctx, text, x, y, maxW, lineH) {
  const chars = [...text];
  let line = '';
  let yy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy); yy += lineH; line = ch;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}
function drawImg(key, x, y, w, h) {
  const im = assets.img[key];
  if (!im) return;
  if (w != null) ctx.drawImage(im, x, y, w, h);
  else {
    const dw = im.naturalWidth / (C.ASSET_SCALE || 2);
    const dh = im.naturalHeight / (C.ASSET_SCALE || 2);
    ctx.drawImage(im, x, y, dw, dh);
  }
}
/** Flash blitImage(bg, -BOARD_OFFSET, 0) on HD 2× sheets: crop source at offset×ASSET_SCALE. */
function drawBoardBackground(img) {
  if (!img) {
    ctx.fillStyle = '#5a8';
    ctx.fillRect(0, 0, C.BOARD_W, C.BOARD_H);
    return;
  }
  const s = C.ASSET_SCALE || 2;
  // Prefer detecting scale from actual image width (945 logical → 1890 @2×)
  const scale = (img.naturalWidth >= 1800) ? 2 : (img.naturalWidth >= 900 ? 1 : s);
  const ox = C.BOARD_OFFSET * scale;
  ctx.drawImage(
    img,
    ox, 0, C.BOARD_W * scale, C.BOARD_H * scale,
    0, 0, C.BOARD_W, C.BOARD_H
  );
}

function draw() {
  ctx.clearRect(0, 0, C.BOARD_W, C.BOARD_H);

  if (state.scene === 'title') {
    drawImg('title', 0, 0, C.BOARD_W, C.BOARD_H);
    drawImg('logo', 34, 20, 472, 72);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(120, 320, 300, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击开始 / Tap to Start', 270, 348);
    return;
  }

  if (state.scene === 'menu') {
    drawBoardBackground(assets.img.bg1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, C.BOARD_W, C.BOARD_H);
    drawImg('logo', 50, 20, 440, 67);
    const btn = (y, label) => {
      ctx.fillStyle = '#6b3';
      ctx.fillRect(150, y, 240, 48);
      ctx.strokeStyle = '#340'; ctx.lineWidth = 3; ctx.strokeRect(150, y, 240, 48);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, 270, y + 32);
    };
    btn(70, '开始冒险');
    btn(130, `继续 (关卡 ${state.maxLevel})`);
    btn(190, '生存无尽');
    btn(250, '重置进度');
    ctx.fillStyle = '#eee'; ctx.font = '14px sans-serif';
    ctx.fillText('植物大战僵尸 · 4399 Flash HTML5 重制', 270, 340);
    ctx.fillText('点击卡片→点草地种植 · 点阳光收集 · 铲子铲除', 270, 362);
    ctx.fillText('手机可直接点触操作', 270, 382);
    return;
  }

  // background — HD 2× sheet: crop at BOARD_OFFSET×ASSET_SCALE so lawn matches grid
  const bgKey = state.level <= 10 ? 'bg1' : 'bg2';
  const bg = assets.img[bgKey];
  const bgUse = (state.sodRows < 5 && assets.img.bg1u) ? assets.img.bg1u : bg;
  drawBoardBackground(bgUse);
  // Dim locked rows for early sod-unlock levels (SWF sod roll)
  if (state.sodRows < 5) {
    const allowed = new Set(rowsAllowed());
    for (let r = 0; r < C.GRID_H; r++) {
      if (allowed.has(r)) continue;
      ctx.fillStyle = 'rgba(40,30,10,0.45)';
      ctx.fillRect(C.LAWN_XMIN, C.gridToPixelY(r), C.LAWN_XMAX - C.LAWN_XMIN, C.CELL_H);
    }
  }

  // Seed bank + shovel UNDER entities (Board.draw: mSeedBank.Draw then mRenderManager)
  // SeedBank.as mHeight=78; LAWN_YMIN=77 — top-row zombie heads must paint over the bank
  // seed bank HUD
  drawImg('seedbank', 0, 0, 401, 78); // SeedBank mWidth=401, mHeight=78
  // sun counter area
  if (fontLib.fonts.FONT_CONTINUUMBOLD14 || fontLib.fonts.FONT_BRIANNETOD16) {
    const fk = fontLib.fonts.FONT_CONTINUUMBOLD14 ? 'FONT_CONTINUUMBOLD14' : 'FONT_BRIANNETOD16';
    fontLib.draw(ctx, fk, String(state.sun), 40, 72, 'center');
  } else {
    ctx.fillStyle = '#222';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(state.sun), 40, 72);
  }

  for (let i = 0; i < state.packets.length; i++) {
    const p = state.packets[i];
    const r = packetRect(i);
    drawImg('seedpacket', r.x, r.y, r.w, r.h);
    const pk = 'p_' + C.SEED_IMG[p.type];
    if (assets.img[pk]) {
      ctx.drawImage(assets.img[pk], r.x + 8, r.y + 10, 34, 34);
    }
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    const cost = C.SEED_COST[p.type];
    ctx.strokeText(String(cost), r.x + 25, r.y + 62);
    ctx.fillText(String(cost), r.x + 25, r.y + 62);
    if (!p.active) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const frac = p.refresh / p.refreshMax;
      ctx.fillRect(r.x, r.y, r.w, r.h * frac);
    }
    if (state.sun < cost) {
      ctx.fillStyle = 'rgba(80,0,0,0.35)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    if (state.cursor?.type === 'seed' && state.cursor.index === i) {
      ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
    }
  }

  drawImg('shovelbank', 402, 0);
  drawImg('shovel', 410, 8, 48, 48);
  if (state.cursor?.type === 'shovel') {
    ctx.strokeStyle = '#ff0'; ctx.lineWidth = 2; ctx.strokeRect(402, 0, 63, 65);
  }

  // mowers — LawnMower.as: draw at (mPosX+4, mPosY); shadow at (mPosX-5, mPosY+30)
  for (const m of state.mowers) {
    if (m.dead) continue;
    const my = m.y != null ? m.y : mowerLaneY(m.row);
    const sh = assets.img.plantshadow;
    if (sh) {
      ctx.globalAlpha = 0.75;
      ctx.drawImage(sh, m.x + C.MOWER_SHADOW.ox, my + C.MOWER_SHADOW.oy, C.PLANT_SHADOW.w, C.PLANT_SHADOW.h);
      ctx.globalAlpha = 1;
    }
    if (m.reanim) {
      m.reanim.draw(ctx, m.x + C.MOWER_DRAW_OX, my);
    } else {
      drawImg('lawnmower', m.x + C.MOWER_DRAW_OX, my, 50, 40);
    }
  }

  // plants — reanim at GridToPixel; draw low rows first (Flash RENDER_LAYER_PLANT + row)
  for (const p of [...state.plants].sort((a, b) => a.row - b.row)) {
    const sh = assets.img.plantshadow;
    if (sh) {
      ctx.globalAlpha = 0.9;
      ctx.drawImage(sh, p.x + C.PLANT_SHADOW.ox, p.y + C.PLANT_SHADOW.oy, C.PLANT_SHADOW.w, C.PLANT_SHADOW.h);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    if (p.flash) ctx.globalAlpha = 0.55;
    if (p.reanim) {
      p.reanim.body.draw(ctx, p.x, p.y);
    } else {
      const key = 'p_' + C.SEED_IMG[p.seed];
      const im = assets.img[key];
      if (im) ctx.drawImage(im, p.x + 5, p.y + 10, 44, 44);
    }
    ctx.restore();
    if (p.seed === C.SEED.WALLNUT && p.hp < p.maxHp) {
      const r = p.hp / p.maxHp;
      ctx.fillStyle = '#0008'; ctx.fillRect(p.x + 8, p.y + 60, 40, 4);
      ctx.fillStyle = r > 0.33 ? '#6c3' : '#c33';
      ctx.fillRect(p.x + 8, p.y + 60, 40 * r, 4);
    }
  }

  // zombies — GetPosYBasedOnRow; draw by row so lower lanes cover upper (RENDER_LAYER_ZOMBIE + row)
  for (const z of [...state.zombies].sort((a, b) => a.row - b.row || a.x - b.x)) {
    if (z.dead) continue;
    const zy = z.y;
    const sh = assets.img.plantshadow;
    if (sh && !z._dying) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(sh, z.x + 5, zy + 70, 50, 20);
      ctx.globalAlpha = 1;
    }
    if (z.reanim) {
      if (z.chilled > 0) z.reanim.overrideRGB = [0.55, 0.8, 1];
      else z.reanim.overrideRGB = [1, 1, 1];
      ctx.save();
      // mJustGotShotCounter flash → brighten
      if (z.shotFlash > 0) {
        const f = Math.min(1, z.shotFlash * 10 / 255);
        ctx.filter = `brightness(${1 + f * 1.8})`;
      }
      z.reanim.draw(ctx, z.x, zy);
      ctx.restore();
    } else if (!z._dying) {
      const bob = Math.sin(z.bob) * 2;
      const im = assets.img[z.img] || assets.img.zNormal;
      if (z.chilled > 0) ctx.filter = 'hue-rotate(160deg) saturate(1.4)';
      if (im) ctx.drawImage(im, z.x, zy + bob - 10, 70, 88);
      ctx.filter = 'none';
    }
    const total = z.maxHp + (z.helm || 0) + (z.shield || 0);
    const cur = Math.max(0, z.hp) + Math.max(0, z.helm || 0) + Math.max(0, z.shield || 0);
    if (cur < total && !z._dying) {
      ctx.fillStyle = '#0008'; ctx.fillRect(z.x + 10, zy - 6, 40, 3);
      ctx.fillStyle = '#c33'; ctx.fillRect(z.x + 10, zy - 6, 40 * (cur / total), 3);
    }
  }

  // peas — clean sprite only (no shadow strip trails)
  for (const pr of state.projectiles) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(pr.x + 7, pr.y + 16, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    drawImg(pr.snow ? 'snowpea' : 'pea', pr.x, pr.y, 14, 14);
  }

  // suns
  for (const s of state.suns) {
    if (s.reanim) {
      s.reanim.draw(ctx, s.x, s.y);
    } else {
      const pulse = 1 + Math.sin(state.tick / 10) * 0.05;
      drawImg('sun', s.x, s.y, 40 * pulse, 40 * pulse);
    }
  }

  // particles / charred (above entities)
  for (const fx of state.fx) fx.draw(ctx);
  for (const ch of state.charred) ch.draw(ctx, ch.x, ch.y);

  // progress / wave
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  const prog = state.gameMode === 'survival'
    ? `生存  旗帜 ${state.survivalFlags}`
    : `第${state.level}关  波次 ${Math.min(state.wave, state.numWaves)}/${state.numWaves}`;
  if (fontLib.fonts.FONT_PIX118BOLD) {
    fontLib.draw(ctx, 'FONT_PIX118BOLD', prog, 530, 398, 'right');
  } else {
    ctx.strokeText(prog, 530, 395); ctx.fillText(prog, 530, 395);
  }

  // ghost cursor plant
  if (state.cursor?.type === 'seed') {
    const col = C.pixelToGridX(state.pointer.x);
    const row = C.pixelToGridY(state.pointer.x, state.pointer.y);
    if (col >= 0 && row >= 0) {
      const ok = rowsAllowed().includes(row) && !state.plants.some((p) => p.col === col && p.row === row && !p.dead);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = ok ? '#0f08' : '#f008';
      const gx = C.gridToPixelX(col), gy = C.gridToPixelY(row);
      ctx.fillRect(gx, gy, 54, 67);
      if (assets.img.plantshadow) {
        ctx.drawImage(assets.img.plantshadow, gx + C.PLANT_SHADOW.ox, gy + C.PLANT_SHADOW.oy, C.PLANT_SHADOW.w, C.PLANT_SHADOW.h);
      }
      const pk = 'p_' + C.SEED_IMG[state.cursor.seed];
      // Prefer reanim preview would be heavy; static seed art centered in cell
      if (assets.img[pk]) {
        const im = assets.img[pk];
        const scale = Math.min(48 / im.width, 56 / im.height);
        const dw = im.width * scale, dh = im.height * scale;
        ctx.drawImage(im, gx + (54 - dw) / 2, gy + 67 - dh - 8, dw, dh);
      }
      ctx.globalAlpha = 1;
    }
    // follow pointer
    const pk2 = 'p_' + C.SEED_IMG[state.cursor.seed];
    if (assets.img[pk2]) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(assets.img[pk2], state.pointer.x - 20, state.pointer.y - 20, 40, 40);
      ctx.globalAlpha = 1;
    }
  }

  if (state.messageT > 0 && state.message) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(70, 300, 400, 40);
    ctx.fillStyle = '#ffe680'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state.message, 270, 326);
  }

  if (state.readyFlash > 120) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText('准备…', 270, 200); ctx.fillText('准备…', 270, 200);
  } else if (state.readyFlash > 60) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText('安放…', 270, 200); ctx.fillText('安放…', 270, 200);
  } else if (state.readyFlash > 0) {
    ctx.fillStyle = '#6f6'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.strokeText('种植！', 270, 200); ctx.fillText('种植！', 270, 200);
  }

  if (state.scene === 'cutscene') {
    // dim
    if (state.cutscene.kind === 'sod') {
      for (const r of state.cutscene.rolls || []) r.draw(ctx, r.x, 80 + r.y);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, C.BOARD_W, 40);
      ctx.fillStyle = '#ffe680'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('铺设草地…', 270, 28);
    }
    if (state.cutscene.kind === 'dave' && state.dave) {
      const d = state.dave;
      if (d.reanim) d.reanim.draw(ctx, 20, 60);
      // speech bubble
      ctx.fillStyle = 'rgba(255,255,240,0.95)';
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
      roundRect(ctx, 160, 40, 340, 110, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'left';
      wrapText(ctx, d.text || '', 175, 70, 310, 22);
      ctx.fillStyle = '#666'; ctx.font = '13px sans-serif';
      ctx.fillText('点击继续 ▶', 400, 140);
    }
  }

  if (state.scene === 'won') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, C.BOARD_W, C.BOARD_H);
    ctx.fillStyle = '#ffe680'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('过关！', 270, 180);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('点击进入下一关', 270, 230);
  }
  if (state.scene === 'lost') {
    ctx.fillStyle = 'rgba(40,0,0,0.7)'; ctx.fillRect(0, 0, C.BOARD_W, C.BOARD_H);
    ctx.fillStyle = '#f66'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('僵尸吃掉了你的脑子！', 270, 180);
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#fff';
    ctx.fillText('点击重新挑战本关', 270, 230);
  }
}

let last = performance.now();
let acc = 0;
function updateCutscene() {
  const cs = state.cutscene;
  if (!cs) return;
  if (cs.kind === 'sod') {
    // ~100Hz: 3 steps of +10 per animation frame
    for (let i = 0; i < 3; i++) {
      cs.t += 10;
      if (cs.t === Cut.SOD.TimeRollSodStart) playSfx('plant', 0.5);
    }
    cs.sodPos = Cut.sodPosition(cs.t);
    for (const r of cs.rolls || []) r.update(1);
    for (const fx of state.fx) fx.update(1);
    const target = C.sodRowsForLevel(state.level);
    const prev = target === 1 ? 0 : target === 3 ? 1 : 3;
    state.sodRows = cs.sodPos >= 800 ? target : prev;
    if (cs.t >= Cut.SOD.TimeRollSodEnd) {
      state.sodRows = target;
      if (state.level === 1) { startDave([1001, 1002, 1003]); return; }
      finishCutsceneToPlay();
    }
  } else if (cs.kind === 'dave') {
    const d = state.dave;
    if (d?.reanim) d.reanim.update(1);
  }
}

function frame(now) {
  window.__PVZ = { get state(){return state;}, assets, reanimLib, C, initLevel, plantAt, spawnZombie: (...a)=>{ try { return spawnZombie(...a); } catch(e){ console.error(e);} } };
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.scene === 'cutscene') updateCutscene();
  if (state.scene === 'playing' && !state.paused) {
    acc += dt * C.TICK_HZ;
    if (acc > 5) acc = 5;
    const steps = Math.floor(acc);
    if (steps > 0) { updatePlaying(steps); acc -= steps; }
  }
  draw();
  requestAnimationFrame(frame);
}

export async function main() {
  fitCanvas();
  try {
    await loadTitlePack();
    setLoadUI(18, '标题已就绪，继续加载游戏…');
    // Show title early while play pack loads
    state.scene = 'title';
    requestAnimationFrame(frame);
    await loadPlayPack();
    setLoadUI(100, '加载完成！');
  } catch (e) {
    console.error(e);
    setLoadUI(100, '部分资源加载失败，仍可尝试游玩');
  }
  const sv = loadSave();
  state.maxLevel = sv.maxLevel || 1;
  const shell = document.getElementById('loadshell');
  if (shell) {
    shell.style.opacity = '0';
    setTimeout(() => shell.remove(), 400);
  }
  const loading = document.getElementById('loading');
  if (loading) loading.remove();
}
main();
