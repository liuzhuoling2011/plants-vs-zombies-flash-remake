import * as C from './constants.js';

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
  canvas.width = Math.floor(C.BOARD_W * dpr);
  canvas.height = Math.floor(C.BOARD_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', fitCanvas);

const assets = { img: {}, sfx: {}, music: {} };
const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
});

async function loadAll() {
  const imgs = {
    bg1: 'assets/bg/background1.jpg',
    bg1u: 'assets/bg/background1_unsodded.jpg',
    bg2: 'assets/bg/background2.jpg',
    title: 'assets/bg/titlescreen.jpg',
    sod1: 'assets/bg/sod1row.jpg',
    sod3: 'assets/bg/sod3row.jpg',
    seedbank: 'assets/ui/seedbank.png',
    sunbank: 'assets/ui/sunbank.png',
    shovelbank: 'assets/ui/shovelbank.png',
    shovel: 'assets/ui/shovel.png',
    seedpacket: 'assets/ui/seedpacket.png',
    flagmeter: 'assets/ui/flagmeter.png',
    flagbar: 'assets/ui/flagmeterbar.png',
    flagflag: 'assets/ui/flagmeterflag.png',
    flaghead: 'assets/ui/flagmeterhead.png',
    lawnmower: 'assets/ui/lawnmower.png',
    logo: 'assets/ui/pvz_logo.png',
    pea: 'assets/fx/pea.png',
    snowpea: 'assets/fx/snowpea.png',
    sun: 'assets/fx/sun.png',
    zNormal: 'assets/zombie/zombie_normal.png',
    zCone: 'assets/zombie/zombie_cone.png',
    zBucket: 'assets/zombie/zombie_bucket.png',
    zFlag: 'assets/zombie/zombie_flag.png',
  };
  for (const id of C.SEED_IMG) imgs['p_' + id] = `assets/plants/${id}.png`;
  await Promise.all(Object.entries(imgs).map(async ([k, v]) => { try { assets.img[k] = await loadImg(v); } catch(e) { console.warn('img', v, e); } }));
  const AC = window.AudioContext || window.webkitAudioContext;
  assets.ac = AC ? new AC() : null;
  assets.buffers = {};
  async function loadSfx(name) {
    try {
      const r = await fetch('assets/sfx/' + name + '.mp3');
      const b = await r.arrayBuffer();
      if (assets.ac) assets.buffers[name] = await assets.ac.decodeAudioData(b);
    } catch (_) {}
  }
  await Promise.all(['plant','throw','chomp','groan','gulp','shovel','points','seedlift','explosion','awooga','readysetplant','tap','buttonclick','frozen','siren','limbs'].map(loadSfx));
  assets.bgm = new Audio('assets/music/grasswalk.mp3');
  assets.bgm.loop = true; assets.bgm.volume = 0.45;
  assets.menuBgm = new Audio('assets/music/loonboon.mp3');
  assets.menuBgm.loop = true; assets.menuBgm.volume = 0.4;
  assets.winBgm = new Audio('assets/music/winmusic.mp3'); assets.winBgm.volume = 0.5;
  assets.loseBgm = new Audio('assets/music/losemusic.mp3'); assets.loseBgm.volume = 0.5;
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
function unlockAudio() {
  if (assets.ac && assets.ac.state === 'suspended') assets.ac.resume();
}

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
    row: r, x: 10, dead: false, active: false, speed: 0,
  }));

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
  state.plants.push({
    seed, col, row,
    x: C.gridToPixelX(col), y: C.gridToPixelY(row),
    hp, maxHp: hp,
    launch, launchCD: randInt(0, Math.min(launch, 300)),
    dead: false, age: 0, state: 0, flash: 0,
  });
  playSfx('plant');
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
  state.zombies.push({
    type, row,
    x: C.BOARD_W - 13 + Math.random() * 27,
    y: C.gridToPixelY(row),
    vel, baseVel: vel,
    hp: 270, maxHp: 270, helm, shield,
    eating: false, dead: false, chilled: 0, age: 0, bob: Math.random() * Math.PI * 2,
    img, phase: 0,
  });
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
  });
}

function addPea(plant, snow) {
  const x = plant.x + 40;
  const y = plant.y + 20;
  state.projectiles.push({
    x, y, row: plant.row, snow: !!snow, dead: false,
  });
  playSfx('throw', 0.35);
}

function damageZombie(z, dmg, freeze) {
  if (z.dead) return;
  if (z.shield > 0) {
    z.shield -= dmg;
    if (z.shield < 0) { dmg = -z.shield; z.shield = 0; } else { dmg = 0; }
  }
  if (dmg > 0 && z.helm > 0) {
    z.helm -= dmg;
    if (z.helm < 0) { dmg = -z.helm; z.helm = 0; } else { dmg = 0; }
  }
  if (dmg > 0) z.hp -= dmg;
  if (freeze) z.chilled = Math.max(z.chilled, 300);
  if (z.hp <= 0) {
    z.dead = true;
    playSfx('limbs', 0.3);
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
        if (p.refresh <= 0) { p.active = true; p.refresh = 0; }
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
      const seed = p.seed;
      if (seed === C.SEED.SUNFLOWER || seed === C.SEED.SUNSHROOM) {
        if (p.launchCD <= 0) {
          spawnSun(p.x + 20, p.y + 10, true);
          p.launchCD = randInt(p.launch - 150, p.launch);
        }
      } else if (seed === C.SEED.PEASHOOTER || seed === C.SEED.SNOWPEA || seed === C.SEED.REPEATER || seed === C.SEED.PUFFSHROOM) {
        const foe = state.zombies.find((z) => !z.dead && z.row === p.row && z.x > p.x && z.x < C.BOARD_W + 40);
        if (foe && p.launchCD <= 0) {
          addPea(p, seed === C.SEED.SNOWPEA);
          if (seed === C.SEED.REPEATER) {
            // second pea shortly
            p._double = 20;
          }
          p.launchCD = p.launch - Math.random() * 15;
        }
        if (p._double > 0) {
          p._double--;
          if (p._double === 0) addPea(p, false);
        }
      } else if (seed === C.SEED.CHERRYBOMB) {
        if (p.age === 80) {
          // explode 3x3
          playSfx('explosion');
          for (const z of state.zombies) {
            if (z.dead) continue;
            if (Math.abs(z.row - p.row) <= 1 && Math.abs(z.x - (p.x + 27)) < 120) {
              damageZombie(z, 1800, false);
            }
          }
          p.dead = true;
        }
      } else if (seed === C.SEED.SQUASH) {
        const target = state.zombies.find((z) => !z.dead && z.row === p.row && Math.abs(z.x - (p.x + 20)) < 70);
        if (target && p.state === 0) { p.state = 1; p.age = 0; }
        if (p.state === 1 && p.age > 50) {
          damageZombie(target || {}, 1800, false);
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
      const plant = state.plants.find((p) => !p.dead && p.row === z.row && z.x < p.x + 45 && z.x + 40 > p.x + 10);
      if (plant && !(plant.seed === C.SEED.CHERRYBOMB || plant.seed === C.SEED.SQUASH)) {
        z.eating = true;
        if (z.age % C.TICKS_BETWEEN_EATS === 0) {
          if (!(z.chilled > 0 && z.age % 2 === 1)) {
            plant.hp -= C.TICKS_BETWEEN_EATS;
            plant.flash = 8;
            if (z.age % 20 === 0) playSfx('chomp', 0.25);
            if (plant.hp <= 0) {
              plant.dead = true;
              playSfx('gulp', 0.4);
            }
          }
        }
      } else {
        z.eating = false;
        let spd = z.vel;
        if (z.chilled > 0) spd *= C.CHILLED_FACTOR;
        // Prefer reanim ground velocity; fallback to PickRandomSpeed values
        z.x -= spd;
      }
      if (z.x < -40) {
        // house entered
        state.scene = 'lost';
        try { assets.bgm.pause(); assets.loseBgm.currentTime = 0; assets.loseBgm.play(); } catch(_){}
        return;
      }
    }
    state.zombies = state.zombies.filter((z) => !z.dead);

    // lawn mowers
    for (const m of state.mowers) {
      if (m.dead) continue;
      if (!m.active) {
        const hit = state.zombies.find((z) => !z.dead && z.row === m.row && z.x < 40);
        if (hit) { m.active = true; m.speed = 4; playSfx('siren', 0.3); }
      } else {
        m.x += m.speed;
        for (const z of state.zombies) {
          if (!z.dead && z.row === m.row && z.x < m.x + 40 && z.x > m.x - 10) {
            z.dead = true;
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
      if (s.life <= 0) s.collected = true;
    }
    state.suns = state.suns.filter((s) => !s.collected);

    // win check
    if (state.wave >= state.numWaves && state.waveCD < 0 && state.zombies.length === 0) {
      state.scene = 'won';
      const next = Math.min(20, state.level + 1);
      if (next > state.maxLevel) { state.maxLevel = next; writeSave({ maxLevel: next }); }
      writeSave({ level: next });
      try { assets.bgm.pause(); assets.winBgm.currentTime = 0; assets.winBgm.play(); } catch(_){}
      return;
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

  if (state.scene === 'title') {
    state.scene = 'menu';
    playSfx('buttonclick');
    try { assets.menuBgm.play(); } catch(_){}
    return;
  }
  if (state.scene === 'menu') {
    // Adventure button region
    if (x > 160 && x < 380 && y > 80 && y < 150) {
      playSfx('buttonclick');
      initLevel(Math.min(state.maxLevel, loadSave().level || 1));
    } else if (x > 160 && x < 380 && y > 170 && y < 220) {
      // continue / level select simple
      playSfx('buttonclick');
      initLevel(state.maxLevel);
    } else if (x > 160 && x < 380 && y > 240 && y < 290) {
      writeSave({ maxLevel: 1, level: 1 }); state.maxLevel = 1;
      playSfx('tap');
      state.message = '进度已重置'; 
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
    try { assets.bgm.pause(); assets.menuBgm.play(); } catch(_){}
  }
  if (e.key === 'p' || e.key === 'P') state.paused = !state.paused;
});

function drawImg(key, x, y, w, h) {
  const im = assets.img[key];
  if (!im) return;
  if (w != null) ctx.drawImage(im, x, y, w, h);
  else ctx.drawImage(im, x, y);
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
    drawImg('bg1', 0, 0, C.BOARD_W, C.BOARD_H);
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
    btn(90, '开始冒险');
    btn(170, `继续 (关卡 ${state.maxLevel})`);
    btn(250, '重置进度');
    ctx.fillStyle = '#eee'; ctx.font = '14px sans-serif';
    ctx.fillText('植物大战僵尸 · 4399 Flash HTML5 重制', 270, 340);
    ctx.fillText('点击卡片→点草地种植 · 点阳光收集 · 铲子铲除', 270, 362);
    ctx.fillText('手机可直接点触操作', 270, 382);
    return;
  }

  // background — pan shows left house; bg is 945 wide, board shows ~540 from offset
  const bgKey = state.level <= 10 ? (state.sodRows < 5 ? 'bg1u' : 'bg1') : 'bg2';
  const bg = assets.img[bgKey];
  if (bg) {
    // Original Flash pans; show left portion including house
    const sx = 0;
    ctx.drawImage(bg, sx, 0, C.BOARD_W, C.BOARD_H, 0, 0, C.BOARD_W, C.BOARD_H);
  } else {
    ctx.fillStyle = '#5a8'; ctx.fillRect(0, 0, C.BOARD_W, C.BOARD_H);
  }
  if (state.sodRows === 1 && assets.img.sod1) {
    ctx.drawImage(assets.img.sod1, 25, C.gridToPixelY(2) - 10, 480, 80);
  } else if (state.sodRows === 3 && assets.img.sod3) {
    ctx.drawImage(assets.img.sod3, 25, C.gridToPixelY(1) - 10, 480, 210);
  }

  // mowers
  for (const m of state.mowers) {
    if (m.dead) continue;
    drawImg('lawnmower', m.x, C.gridToPixelY(m.row) + 20, 50, 40);
  }

  // plants
  for (const p of state.plants) {
    const key = 'p_' + C.SEED_IMG[p.seed];
    const im = assets.img[key];
    const bounce = Math.sin(p.age / 20) * 1.5;
    if (p.flash) ctx.globalAlpha = 0.6;
    if (im) {
      const iw = im.width, ih = im.height;
      const scale = Math.min(54 / iw, 67 / ih) * 1.15;
      const dw = iw * scale, dh = ih * scale;
      ctx.drawImage(im, p.x + (54 - dw) / 2, p.y + 67 - dh - 4 + bounce, dw, dh);
    } else {
      ctx.fillStyle = '#2a4'; ctx.fillRect(p.x + 8, p.y + 20, 40, 40);
    }
    ctx.globalAlpha = 1;
    if (p.seed === C.SEED.WALLNUT && p.hp < p.maxHp) {
      const r = p.hp / p.maxHp;
      ctx.fillStyle = '#0008'; ctx.fillRect(p.x + 8, p.y + 60, 40, 4);
      ctx.fillStyle = r > 0.33 ? '#6c3' : '#c33';
      ctx.fillRect(p.x + 8, p.y + 60, 40 * r, 4);
    }
    if (p.seed === C.SEED.CHOMPER && p.state === 1) {
      ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('消化中', p.x + 27, p.y + 12);
    }
  }

  // zombies
  for (const z of state.zombies) {
    const bob = Math.sin(z.bob) * 2;
    const im = assets.img[z.img] || assets.img.zNormal;
    if (z.chilled > 0) ctx.filter = 'hue-rotate(160deg) saturate(1.4)';
    if (im) ctx.drawImage(im, z.x, z.y + bob - 10, 70, 88);
    else { ctx.fillStyle = '#454'; ctx.fillRect(z.x, z.y, 40, 70); }
    ctx.filter = 'none';
    // tiny HP
    const total = z.maxHp + (z.helm || 0) + (z.shield || 0);
    const cur = Math.max(0, z.hp) + Math.max(0, z.helm || 0) + Math.max(0, z.shield || 0);
    if (cur < total) {
      ctx.fillStyle = '#0008'; ctx.fillRect(z.x + 10, z.y - 6, 40, 3);
      ctx.fillStyle = '#c33'; ctx.fillRect(z.x + 10, z.y - 6, 40 * (cur / total), 3);
    }
  }

  // peas
  for (const pr of state.projectiles) {
    drawImg(pr.snow ? 'snowpea' : 'pea', pr.x, pr.y, 14, 14);
  }

  // suns
  for (const s of state.suns) {
    const pulse = 1 + Math.sin(state.tick / 10) * 0.05;
    drawImg('sun', s.x, s.y, 40 * pulse, 40 * pulse);
  }

  // seed bank HUD
  drawImg('seedbank', 0, 0);
  // sun counter area
  ctx.fillStyle = '#222';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(state.sun), 40, 72);

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

  // progress / wave
  ctx.fillStyle = '#fff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  const prog = `第${state.level}关  波次 ${Math.min(state.wave, state.numWaves)}/${state.numWaves}`;
  ctx.strokeText(prog, 530, 395); ctx.fillText(prog, 530, 395);

  // ghost cursor plant
  if (state.cursor?.type === 'seed') {
    const col = C.pixelToGridX(state.pointer.x);
    const row = C.pixelToGridY(state.pointer.x, state.pointer.y);
    if (col >= 0 && row >= 0) {
      const ok = rowsAllowed().includes(row) && !state.plants.some((p) => p.col === col && p.row === row && !p.dead);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = ok ? '#0f08' : '#f008';
      ctx.fillRect(C.gridToPixelX(col), C.gridToPixelY(row), 54, 67);
      const pk = 'p_' + C.SEED_IMG[state.cursor.seed];
      if (assets.img[pk]) {
        ctx.drawImage(assets.img[pk], C.gridToPixelX(col) + 5, C.gridToPixelY(row) + 10, 44, 44);
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
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
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
  const loading = document.getElementById('loading');
  try {
    await loadAll();
  } catch (e) {
    console.error(e);
  }
  const sv = loadSave();
  state.maxLevel = sv.maxLevel || 1;
  if (loading) loading.remove();
  requestAnimationFrame(frame);
}
main();
