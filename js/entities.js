import { Reanimation, randRange } from './reanim.js';
import * as C from './constants.js';

const PLANT_REANIM = {
  [C.SEED.PEASHOOTER]: { def: 'REANIM_PEASHOOTERSINGLE', idle: 'anim_idle', head: true },
  [C.SEED.SUNFLOWER]: { def: 'REANIM_SUNFLOWER', idle: 'anim_idle' },
  [C.SEED.CHERRYBOMB]: { def: 'REANIM_CHERRYBOMB', idle: 'anim_idle' },
  [C.SEED.WALLNUT]: { def: 'REANIM_WALLNUT', idle: 'anim_idle1' },
  [C.SEED.SQUASH]: { def: 'REANIM_SQUASH', idle: 'anim_idle' },
  [C.SEED.SNOWPEA]: { def: 'REANIM_SNOWPEA', idle: 'anim_idle', head: true },
  [C.SEED.CHOMPER]: { def: 'REANIM_CHOMPER', idle: 'anim_idle' },
  [C.SEED.REPEATER]: { def: 'REANIM_PEASHOOTER', idle: 'anim_idle', head: true },
  [C.SEED.PUFFSHROOM]: { def: 'REANIM_PUFFSHROOM', idle: 'anim_idle' },
  [C.SEED.SUNSHROOM]: { def: 'REANIM_SUNSHROOM', idle: 'anim_idle' },
  [C.SEED.FUMESHROOM]: { def: 'REANIM_FUMESHROOM', idle: 'anim_idle' },
  [C.SEED.GRAVEBUSTER]: { def: 'REANIM_GRAVEBUSTER', idle: 'anim_idle' },
};

export function createPlantReanim(lib, seed) {
  const cfg = PLANT_REANIM[seed];
  if (!cfg || !lib.defs[cfg.def]) return null;
  const body = lib.create(cfg.def);
  body.loopType = Reanimation.LOOP_TYPE_ALWAYS;
  body.currentTrack = cfg.idle;
  body.animRate = randRange(15, 20);
  body.animTime = Math.random() * 0.99;
  let head = null;
  if (cfg.head) {
    // Peashooter/SnowPea/Repeater attach head on anim_stem
    const headDef = cfg.def;
    head = lib.create(headDef);
    head.loopType = Reanimation.LOOP_TYPE_ALWAYS;
    head.animRate = body.animRate;
    head.currentTrack = 'anim_head_idle';
    head.animTime = body.animTime;
    if (body.mDefinition.trackNameMap['anim_stem']) {
      body.attachReanimation(head, 'anim_stem');
    }
  }
  return { body, head, cfg };
}

export function plantPlayShoot(plant) {
  if (!plant.reanim?.head) return;
  const head = plant.reanim.head;
  const rate = plant.reanim.body.animRate;
  head.currentTrack = 'anim_shooting';
  head.loopType = Reanimation.loopOnceAndIdle('anim_head_idle', rate);
}

export function createZombieReanim(lib, type) {
  let defKey = 'REANIM_ZOMBIE';
  let track = 'anim_walk';
  if (type === C.ZOMBIE.POLE) { defKey = 'REANIM_ZOMBIE_POLEVAULTER'; track = 'anim_run'; }
  else if (type === C.ZOMBIE.PAPER) { defKey = 'REANIM_ZOMBIE_PAPER'; track = 'anim_walk'; }
  else if (type === C.ZOMBIE.FOOTBALL) { defKey = 'REANIM_ZOMBIE_FOOTBALL'; track = 'anim_walk'; }
  if (!lib.defs[defKey]) return null;
  const body = lib.create(defKey);
  body.loopType = Reanimation.LOOP_TYPE_ALWAYS;
  body.currentTrack = track;
  body.animRate = randRange(12, 24);
  body.animTime = Math.random() * 0.99;

  if (defKey === 'REANIM_ZOMBIE') {
    const hide = [
      'anim_hair','anim_cone1','anim_cone2','anim_cone3',
      'anim_bucket1','anim_bucket2','anim_bucket3',
      'anim_screendoor1','anim_screendoor2','anim_screendoor3',
      'Zombie_flaghand','anim_tongue',
      'Zombie_innerarm_screendoor','Zombie_innerarm_screendoor_hand','Zombie_outerarm_screendoor',
    ];
    for (const t of hide) body.setTrackVisible(t, false);
    if (type === C.ZOMBIE.NORMAL) body.setTrackVisible('anim_hair', true);
    if (type === C.ZOMBIE.CONE) body.setTrackVisible('anim_cone1', true);
    if (type === C.ZOMBIE.BUCKET) body.setTrackVisible('anim_bucket1', true);
    if (type === C.ZOMBIE.FLAG) {
      body.setTrackVisible('Zombie_flaghand', true);
      body.setTrackVisible('anim_hair', true);
      body.setTrackVisible('anim_innerarm1', false);
      body.setTrackVisible('anim_innerarm2', false);
      body.setTrackVisible('anim_innerarm3', false);
      body.setTrackVisible('Zombie_innerarm_screendoor', true);
    }
    if (type === C.ZOMBIE.DOOR) {
      body.setTrackVisible('anim_hair', true);
      body.setTrackVisible('anim_innerarm1', false);
      body.setTrackVisible('anim_innerarm2', false);
      body.setTrackVisible('anim_innerarm3', false);
      body.setTrackVisible('anim_screendoor1', true);
      body.setTrackVisible('Zombie_outerarm_screendoor', true);
      body.setTrackVisible('Zombie_innerarm_screendoor', true);
    }
  }
  return body;
}

export function zombieSetEating(z, eating) {
  if (!z.reanim) return;
  if (eating && !z._wasEating) {
    z.reanim.currentTrack = 'anim_eat';
    z.reanim.animRate = z.chilled > 0 ? 20 : 36;
  } else if (!eating && z._wasEating) {
    z.reanim.currentTrack = z.type === C.ZOMBIE.POLE ? 'anim_walk' : 'anim_walk';
    z.reanim.animRate = randRange(12, 24);
  }
  z._wasEating = eating;
}

export function zombiePlayDeath(z, lib) {
  if (!z.reanim) return;
  if (z.reanim.mDefinition.trackNameMap['anim_death']) {
    z.reanim.currentTrack = 'anim_death';
    z.reanim.loopType = Reanimation.loopOnceAndHold(() => { z.dead = true; z._corpse = true; });
    z.reanim.animRate = 24;
    z._dying = true;
  } else {
    z.dead = true;
  }
}

export function createSunReanim(lib) {
  if (!lib.defs.REANIM_SUN) return null;
  const r = lib.create('REANIM_SUN');
  // Flash sun uses layered Sun1/Sun2/Sun3; pick first track as play marker if no anim_
  const names = r.mDefinition.tracks.map((x) => x.name);
  const track = names.find((n) => n.startsWith('anim_')) || names[0];
  r.currentTrack = track;
  r.loopType = Reanimation.LOOP_TYPE_ALWAYS;
  r.animRate = 12;
  return r;
}

export function createMowerReanim(lib) {
  if (!lib.defs.REANIM_LAWNMOWER) return null;
  const r = lib.create('REANIM_LAWNMOWER');
  const tracks = r.mDefinition.tracks.map((tr) => tr.name);
  const idle = tracks.includes('anim_normal') ? 'anim_normal' : (tracks.find((n) => n.startsWith('anim_')) || tracks[0]);
  r.currentTrack = idle;
  r.loopType = Reanimation.LOOP_TYPE_ALWAYS;
  r.animRate = 20;
  return r;
}

export function updateWallnutCrack(plant) {
  if (plant.seed !== C.SEED.WALLNUT || !plant.reanim) return;
  const r = plant.hp / plant.maxHp;
  let track = 'anim_idle1';
  if (r < 1 / 3) track = 'anim_idle3';
  else if (r < 2 / 3) track = 'anim_idle2';
  if (plant.reanim.body.currentTrack !== track) {
    const t = plant.reanim.body.animTime;
    plant.reanim.body.currentTrack = track;
    plant.reanim.body.animTime = t;
  }
}
