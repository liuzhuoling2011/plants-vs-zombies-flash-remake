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

/**
 * PeaShooter.as FindTargetAndFire:
 *   head animRate=35 (45 repeater), currentTrack=anim_shooting,
 *   mShootingCounter=35 (26 repeater). Pea is NOT spawned here —
 *   Fire() runs when UpdateShooting sees counter==1 (~frame ~0.48 of shoot).
 */
export function plantPlayShoot(plant, isRepeater = false) {
  if (!plant.reanim?.head) {
    // Puff etc. without head: still set counter so pea fires on schedule
    plant.shootingCounter = isRepeater ? 26 : 35;
    return;
  }
  const head = plant.reanim.head;
  const idleRate = plant.reanim.body.animRate || 15;
  const rate = isRepeater ? 45 : 35;
  head.animRate = rate;
  head.currentTrack = 'anim_shooting';
  head.loopType = Reanimation.loopOnceAndIdle('anim_head_idle', idleRate);
  plant.shootingCounter = isRepeater ? 26 : 35;
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
  if (!z.reanim) { z.dead = true; return; }
  if (z.reanim.mDefinition.trackNameMap['anim_death']) {
    z.reanim.currentTrack = 'anim_death';
    z.reanim.animRate = 28;
    z._dying = true;
    z._deathAge = 0;
    // Once finished: fade then remove — do NOT hold corpse forever (causes afterimages)
    z.reanim.loopType = Reanimation.loopOnceAndHold(() => {
      z._deathDone = true;
    });
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

export const PHASE = {
  NORMAL: 0, DYING: 1, BURNED: 2, MOWERED: 3,
  POLE_PRE: 4, POLE_IN: 5, POLE_POST: 6,
  PAPER_READ: 7, PAPER_MAD_TRANS: 8, PAPER_MAD: 9,
};

export function initZombiePhase(z) {
  z.phase = PHASE.NORMAL;
  z.hasHead = true;
  z.hasArm = true;
  z.hasPole = z.type === C.ZOMBIE.POLE;
  if (z.type === C.ZOMBIE.POLE) {
    z.phase = PHASE.POLE_PRE;
    z.vel = 0.66 + Math.random() * 0.02;
    z.baseVel = z.vel;
  }
  if (z.type === C.ZOMBIE.PAPER) {
    z.phase = PHASE.PAPER_READ;
    z.shield = z.shield || 150;
  }
  if (z.type === C.ZOMBIE.FOOTBALL) {
    z.vel = 0.66 + Math.random() * 0.02;
    z.baseVel = z.vel;
  }
  if (z.type === C.ZOMBIE.FLAG) {
    z.vel = 0.45;
    z.baseVel = z.vel;
  }
}

/** Pole vault: FindPlantTarget ATTACKTYPE_VAULT then anim_jump — Zombie.as UpdateZombiePolevaulter */
export function updatePolevaulter(z, plants) {
  if (z.type !== C.ZOMBIE.POLE || !z.reanim) return;
  if (z.phase === PHASE.POLE_PRE && z.hasHead) {
    const plant = plants.find((p) => !p.dead && p.row === z.row && z.x < p.x + 80 && z.x > p.x - 10);
    if (plant) {
      z.phase = PHASE.POLE_IN;
      if (z.reanim.mDefinition.trackNameMap.anim_jump) {
        z.reanim.currentTrack = 'anim_jump';
        z.reanim.loopType = Reanimation.loopOnceAndHold();
        z.reanim.animRate = 24;
      }
      const dur = Math.max(1, z.reanim.mFrameCount / z.reanim.animRate * 100);
      z._vaultVel = (z.x - plant.x - 54) / dur;
      z.hasPole = false;
      // hide pole tracks if present
      for (const n of Object.keys(z.reanim.mDefinition.trackNameMap)) {
        if (/pole/i.test(n) && !/polevaulter_body/i.test(n)) z.reanim.setTrackVisible(n, false);
      }
    }
  } else if (z.phase === PHASE.POLE_IN) {
    if (z.reanim.animTime >= 1) {
      z.x -= 101;
      z.phase = PHASE.POLE_POST;
      z.reanim.currentTrack = 'anim_walk';
      z.reanim.loopType = Reanimation.LOOP_TYPE_ALWAYS;
      z.reanim.animRate = randRange(12, 24);
      z.vel = randRange(0.23, 0.37);
      z.baseVel = z.vel;
    } else {
      // during vault use vault velocity
      z.x -= Math.abs(z._vaultVel || z.vel);
    }
  }
}

/** Newspaper: when shield gone → maddening → mad walk faster */
export function updateNewspaper(z) {
  if (z.type !== C.ZOMBIE.PAPER || !z.reanim) return;
  if (z.phase === PHASE.PAPER_READ && (z.shield || 0) <= 0) {
    z.phase = PHASE.PAPER_MAD_TRANS;
    z.shield = 0;
    if (z.reanim.mDefinition.trackNameMap.anim_walk_nopaper) {
      z.reanim.currentTrack = 'anim_walk_nopaper';
    } else if (z.reanim.mDefinition.trackNameMap.anim_gasp) {
      z.reanim.currentTrack = 'anim_gasp';
      z.reanim.loopType = Reanimation.loopOnceAndHold(() => {
        z.phase = PHASE.PAPER_MAD;
        z.reanim.currentTrack = z.reanim.mDefinition.trackNameMap.anim_walk_nopaper ? 'anim_walk_nopaper' : 'anim_walk';
        z.reanim.loopType = Reanimation.LOOP_TYPE_ALWAYS;
        z.vel = 0.89 + Math.random() * 0.02;
        z.baseVel = z.vel;
      });
    } else {
      z.phase = PHASE.PAPER_MAD;
      z.vel = 0.89 + Math.random() * 0.02;
      z.baseVel = z.vel;
    }
    // hide paper tracks
    for (const n of Object.keys(z.reanim.mDefinition.trackNameMap)) {
      if (/paper_paper/i.test(n)) z.reanim.setTrackVisible(n, false);
    }
  }
  if (z.phase === PHASE.PAPER_MAD_TRANS) {
    if (z.reanim.currentTrack === 'anim_walk_nopaper' || z.reanim.animTime >= 1) {
      z.phase = PHASE.PAPER_MAD;
      z.vel = 0.89 + Math.random() * 0.02;
      z.baseVel = z.vel;
      z.reanim.loopType = Reanimation.LOOP_TYPE_ALWAYS;
      z.reanim.animRate = randRange(20, 28);
    }
  }
}

export function createCharredReanim(lib, x, y) {
  if (!lib.defs.REANIM_ZOMBIE_CHARRED) return null;
  const r = lib.create('REANIM_ZOMBIE_CHARRED');
  const track = r.mDefinition.trackNameMap.anim_crumble ? 'anim_crumble'
    : (r.mDefinition.tracks.map((t) => t.name).find((n) => n.startsWith('anim_')) || r.mDefinition.tracks[0].name);
  r.currentTrack = track;
  r.loopType = Reanimation.loopOnceAndHold();
  r.animRate = 15;
  r.x = x; r.y = y - 8;
  return r;
}


/** Zombie.as UpdateDamageStates / DropArm / DropHead — body HP fractions */
export function getBodyDamageIndex(z) {
  const max = z.maxHp || 270;
  const hp = Math.max(0, z.hp);
  if (hp < max / 3) return 2;
  if (hp < max * 2 / 3) return 1;
  return 0;
}

export function dropArm(z, spawnFx, playSfx) {
  if (!z.hasArm || !z.reanim) return;
  // Door/newspaper shield blocks arm drop (Zombie.as DropArm)
  if (z.type === C.ZOMBIE.DOOR || (z.type === C.ZOMBIE.PAPER && (z.shield || 0) > 0)) return;
  z.hasArm = false;
  const hide = [];
  if (z.type === C.ZOMBIE.PAPER) {
    hide.push('Zombie_paper_hands', 'Zombie_paper_leftarm_lower', 'Zombie_paper_hands2');
  } else if (z.type === C.ZOMBIE.POLE) {
    hide.push('Zombie_polevaulter_outerarm_lower', 'Zombie_outerarm_hand');
  } else if (z.type === C.ZOMBIE.FOOTBALL) {
    hide.push('zombie_football_rightarm_lower', 'zombie_football_rightarm_hand');
  } else {
    hide.push('Zombie_outerarm_lower', 'Zombie_outerarm_hand');
  }
  for (const n of hide) z.reanim.setTrackVisible(n, false);
  // Arm particle + limbs Foley (normal zombies)
  let fx = 'PARTICLE_ZOMBIEARM';
  if (z.type === C.ZOMBIE.POLE) fx = 'PARTICLE_ZOMBIEPOLEVAULTARM';
  else if (z.type === C.ZOMBIE.FOOTBALL) fx = 'PARTICLE_ZOMBIEFOOTBALLARM';
  if (spawnFx) spawnFx(fx, z.x + 20, z.y + 55);
  if (playSfx) playSfx('limbs', 0.4);
}

export function dropHead(z, spawnFx, playSfx) {
  if (!z.hasHead || !z.reanim) return;
  z.hasHead = false;
  const hide = ['anim_head1', 'anim_head2', 'anim_hair', 'anim_tongue'];
  if (z.type === C.ZOMBIE.PAPER) {
    hide.push('anim_hairpiece', 'anim_head_jaw', 'anim_head_glasses', 'anim_head_look', 'anim_head_pupils');
  }
  for (const n of hide) z.reanim.setTrackVisible(n, false);
  let fx = 'PARTICLE_ZOMBIEHEAD';
  if (z.type === C.ZOMBIE.POLE) fx = 'PARTICLE_ZOMBIEPOLEVALUTHEAD';
  else if (z.type === C.ZOMBIE.FOOTBALL) fx = 'PARTICLE_ZOMBIEFOOTBALLHEAD';
  else if (z.type === C.ZOMBIE.PAPER) fx = 'PARTICLE_ZOMBIENEWSPAPERHEAD';
  if (spawnFx) spawnFx(fx, z.x + 15, z.y + 20);
  if (playSfx) playSfx('limbs', 0.45);
}

/** Call after body HP changes (helm/shield already peeled). */
export function updateDamageStates(z, spawnFx, playSfx) {
  if (z.dead || z._dying) return;
  const max = z.maxHp || 270;
  if (max <= 0) return;
  const healthLeft = z.hp / max;
  if (z.hasArm && healthLeft <= 0.66 && z.hp > 0) {
    dropArm(z, spawnFx, playSfx);
  }
  if (z.hasHead && healthLeft <= 0.33) {
    dropHead(z, spawnFx, playSfx);
  }
}

/** Plant hitbox offsets from CPlant.GetPlantAttackRect / placement — keep reanim origin at grid cell */
export const PLANT_DRAW_OFFSET = { x: 0, y: 0 };
export const ZOMBIE_HIT = { x: 10, w: 33, h: 77 }; // ZombieAttackRect default
