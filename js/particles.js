/** PopCap particle system — evidence from ByteParticleDescriptor + ParticleEmitter.as */
const SECONDS_PER_UPDATE = 0.01;
const CURVE = {0:'CONSTANT',1:'LINEAR',2:'EASE_IN',3:'EASE_OUT',4:'EASE_IN_OUT',5:'EASE_IN_OUT_WEAK',6:'FAST_IN_OUT',7:'FAST_IN_OUT_WEAK',8:'BOUNCE',9:'BOUNCE_FAST_MIDDLE',10:'BOUNCE_SLOW_MIDDLE',11:'SIN_WAVE',12:'EASE_SIN_WAVE'};

function curveQuad(t){return t*t;}
function curveInvQuad(t){return 2*t-t*t;}
function curveS(t){return 3*t*t-2*t*t*t;}
function curveBounce(t){return 1-Math.abs(1-t*2);}
function curveInvQuadS(t){return t<=0.5?curveInvQuad(t*2)*0.5:curveQuad((t-0.5)*2)*0.5+0.5;}

function curveEvaluate(t, lo, hi, type) {
  let f = 0;
  switch (type|0) {
    case 0: f = 0; break;
    case 1: f = t; break;
    case 2: f = curveQuad(t); break;
    case 3: f = curveInvQuad(t); break;
    case 4: f = curveS(curveS(t)); break;
    case 5: f = curveS(t); break;
    case 6: f = curveInvQuadS(curveInvQuadS(t)); break;
    case 7: f = curveInvQuadS(t); break;
    case 8: f = curveBounce(t); break;
    case 9: f = curveQuad(curveBounce(t)); break;
    case 10: f = curveInvQuad(curveBounce(t)); break;
    case 11: f = Math.sin(t * Math.PI * 2); break;
    case 12: f = Math.sin(curveS(t) * Math.PI * 2); break;
    default: f = t;
  }
  return lo + (hi - lo) * f;
}

function evalTrack(nodes, time, interp) {
  if (!nodes || !nodes.length) return 0;
  const first = nodes[0];
  if (time < first.t) return curveEvaluate(interp, first.lo, first.hi, first.dist);
  for (let i = 1; i < nodes.length; i++) {
    const n = nodes[i];
    if (time <= n.t) {
      const p = nodes[i - 1];
      const u = (n.t === p.t) ? 0 : (time - p.t) / (n.t - p.t);
      const a = curveEvaluate(interp, p.lo, p.hi, p.dist);
      const b = curveEvaluate(interp, n.lo, n.hi, n.dist);
      return curveEvaluate(u, a, b, p.curve);
    }
  }
  const last = nodes[nodes.length - 1];
  return curveEvaluate(interp, last.lo, last.hi, last.dist);
}

function trackDefault(nodes, def) {
  if (nodes && nodes.length) return nodes;
  return [{ curve: 0, dist: 1, hi: def, lo: def, t: 0 }];
}

export class ParticleLibrary {
  constructor() { this.defs = {}; this.images = {}; this.manifest = null; }
  async load(url = 'assets/particles/manifest.json') {
    this.manifest = await (await fetch(url)).json();
    const imgEntries = Object.entries(this.manifest.images || {});
    // Alias missing
    const aliases = {
      IMAGE_DUST_PUFFS: 'IMAGE_DIRTSMALL',
      IMAGE_PROJECTILE: 'IMAGE_PROJECTILEPEA',
      IMAGE_ZombieHead: 'IMAGE_ZOMBIEHEAD',
      IMAGE_SPROING: 'IMAGE_DIRTSMALL',
      IMAGE_ZOMBOSS_PARTICLES: 'IMAGE_EXPLOSIONCLOUD',
    };
    for (const [k, v] of Object.entries(aliases)) {
      if (!this.manifest.images[k] && this.manifest.images[v]) this.manifest.images[k] = this.manifest.images[v];
    }
    await Promise.all(Object.entries(this.manifest.images).map(async ([key, path]) => {
      try {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = path; });
        this.images[key] = img;
      } catch (_) {}
    }));
    const preload = [
      'PARTICLE_PEASPLAT','PARTICLE_SNOWPEASPLAT','PARTICLE_PLANTING','PARTICLE_POWIE',
      'PARTICLE_DUST_SQUASH','PARTICLE_SODROLL','PARTICLE_MOWERCLOUD','PARTICLE_FUMECLOUD',
      'PARTICLE_PUFFSPLAT','PARTICLE_ICESPARKLE','PARTICLE_WALLNUTEATSMALL','PARTICLE_WALLNUTEATLARGE',
      'PARTICLE_SCREENFLASH','PARTICLE_SEEDPACKETPICK','PARTICLE_ZOMBIERISE','PARTICLE_GRAVESTONERISE',
      'PARTICLE_ZOMBIEHEAD','PARTICLE_ZOMBIEARM','PARTICLE_SNOWPEAPUFF','PARTICLE_PUFFSHROOMMUZZLE',
    ];
    await Promise.all(preload.map((k) => this.loadDef(k).catch(() => null)));
  }
  async loadDef(key) {
    if (this.defs[key]) return this.defs[key];
    const meta = this.manifest.particles[key];
    if (!meta) throw new Error('no particle ' + key);
    const raw = await (await fetch(meta.file)).json();
    for (const e of raw.emitters) {
      e._img = e.image ? this.images[e.image] || null : null;
      e.particleFields = e.particleFields || [];
      e.systemFields = e.systemFields || [];
      for (const pn of Object.keys(e.params)) e.params[pn] = trackDefault(e.params[pn], 0);
    }
    this.defs[key] = raw;
    return raw;
  }
  spawn(key, x, y) {
    const def = this.defs[key];
    if (!def) return null;
    return new ParticleSystem(def, x, y, this);
  }
}

class Particle {
  constructor() {
    this.dead = false;
    this.age = 0; this.duration = 1;
    this.timeValue = 0; this.lastTimeValue = 0;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.ox = 0; this.oy = 0;
    this.spin = 0; this.spinVel = 0;
    this.interp = []; this.fieldInterp = [];
  }
}

class Emitter {
  constructor(edef, system) {
    this.def = edef;
    this.system = system;
    this.particles = [];
    this.age = 0;
    let dur = evalTrack(edef.params.SystemDuration, 0, Math.random());
    if (!Number.isFinite(dur) || dur <= 0) dur = 30;
    this.duration = Math.max(1, Math.round(dur));
    this._loops = !!(edef.flags & 8); // SYSTEM_LOOPS
    this.dead = false;
    this._dying = false;
    this.spawnAccum = 0;
    this.launched = 0;
    this.systemCenterX = system.x;
    this.systemCenterY = system.y;
  }
  update() {
    if (this.dead) return;
    this.age++;
    // SYSTEM_LOOPS: wrap; else mark dying and NEVER clamp age (old clamp + SpawnMinActive = infinite trails)
    if (this.age >= this.duration) {
      if (this._loops) this.age = 0;
      else this._dying = true;
    }
    const t = Math.min(1, this.age / Math.max(1, this.duration - 1));
    for (const p of this.particles) this.updateParticle(p);
    this.particles = this.particles.filter((p) => !p.dead);
    // Stop spawning once the system lifetime ends — this was the afterimage root cause
    if (!this._dying) this.updateSpawning(t);
    if (this._dying) {
      if (this.particles.length === 0) this.dead = true;
      else if (this.age > this.duration + 40) {
        this.particles.length = 0;
        this.dead = true;
      }
    }
    // Absolute safety: no emitter lives forever
    if (this.age > Math.max(this.duration, 1) + 300) {
      this.particles.length = 0;
      this.dead = true;
    }
  }
  updateSpawning(sysT) {
    const d = this.def;
    const rate = evalTrack(d.params.SpawnRate, sysT, Math.random());
    const maxLaunch = evalTrack(d.params.SpawnMaxLaunched, sysT, Math.random());
    if (maxLaunch > 0 && this.launched >= maxLaunch) return;
    const minA = evalTrack(d.params.SpawnMinActive, sysT, Math.random());
    const maxA = evalTrack(d.params.SpawnMaxActive, sysT, Math.random());
    while (this.particles.length < minA) {
      if (maxLaunch > 0 && this.launched >= maxLaunch) break;
      this.launch(sysT);
    }
    this.spawnAccum += rate * SECONDS_PER_UPDATE;
    while (this.spawnAccum >= 1) {
      this.spawnAccum -= 1;
      if (maxA > 0 && this.particles.length >= maxA) break;
      if (maxLaunch > 0 && this.launched >= maxLaunch) break;
      this.launch(sysT);
    }
  }
  launch(sysT) {
    const d = this.def;
    const p = new Particle();
    p.duration = Math.max(1, Math.round(evalTrack(d.params.ParticleDuration, sysT, Math.random())));
    const speed = evalTrack(d.params.LaunchSpeed, sysT, Math.random());
    let angle = evalTrack(d.params.LaunchAngle, sysT, Math.random());
    // Flash often stores degrees; ByteReanim used radians for kx — particle LaunchAngle in PopCap is usually radians already from XML. Check values.
    // Many defs use degrees in PC; Flash binary stores as authored. Heuristic: if |angle|>2π treat as degrees.
    if (Math.abs(angle) > 6.3) angle = angle * Math.PI / 180;
    const ox = evalTrack(d.params.EmitterOffsetX, sysT, Math.random());
    const oy = evalTrack(d.params.EmitterOffsetY, sysT, Math.random());
    const boxX = evalTrack(d.params.EmitterBoxX, sysT, Math.random());
    const boxY = evalTrack(d.params.EmitterBoxY, sysT, Math.random());
    const rad = evalTrack(d.params.EmitterRadius, sysT, Math.random());
    let lx = this.system.x + ox, ly = this.system.y + oy;
    const et = d.emitterType | 0;
    if (et === 1 || et === 2) { // BOX
      lx += (Math.random() * 2 - 1) * boxX;
      ly += (Math.random() * 2 - 1) * boxY;
    } else if (et === 0 || et === 3 || et === 4) { // CIRCLE*
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * rad;
      lx += Math.cos(a) * r; ly += Math.sin(a) * r;
    }
    p.x = lx; p.y = ly;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    // Interps for color/scale tracks
    p.interp = Array.from({ length: 20 }, () => Math.random());
    p.fieldInterp = (d.particleFields || []).map(() => [Math.random(), Math.random()]);
    const nFrames = Math.max(1, d.imageFrames || 1);
    p._frame = nFrames > 1 ? (Math.random() * nFrames) | 0 : 0;
    this.particles.push(p);
    this.launched++;
  }
  updateParticle(p) {
    p.age++;
    if (p.age >= p.duration) { p.dead = true; return; }
    p.lastTimeValue = p.timeValue;
    p.timeValue = p.age / Math.max(1, p.duration - 1);
    const t = p.timeValue;
    const fields = this.def.particleFields || [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const ix = p.fieldInterp[i][0], iy = p.fieldInterp[i][1];
      const fx = evalTrack(f.x, t, ix), fy = evalTrack(f.y, t, iy);
      switch (f.type | 0) {
        case 2: p.vx += fx * SECONDS_PER_UPDATE; p.vy += fy * SECONDS_PER_UPDATE; break; // ACCEL
        case 1: p.vx *= 1 - fx; p.vy *= 1 - fy; break; // FRICTION
        case 5: p.x += fx * SECONDS_PER_UPDATE; p.y += fy * SECONDS_PER_UPDATE; break; // VELOCITY as delta pos
        case 6: { // POSITION delta
          const lx = evalTrack(f.x, p.lastTimeValue, ix), ly = evalTrack(f.y, p.lastTimeValue, iy);
          p.x += fx - lx; p.y += fy - ly; break;
        }
        case 4: p.vx = Math.max(-fx, Math.min(fx, p.vx)); p.vy = Math.max(-fy, Math.min(fy, p.vy)); break;
        case 8: // GROUND
          if (p.y > this.system.y + fy) {
            p.y = this.system.y + fy;
            const reflect = evalTrack(this.def.params.CollisionReflect, t, p.interp[0] || 0);
            p.vx *= reflect; p.vy = -p.vy * reflect;
          }
          break;
        case 9: // SHAKE
          p.x -= p.ox; p.y -= p.oy;
          p.ox = fx * (Math.random() * 2 - 1); p.oy = fy * (Math.random() * 2 - 1);
          p.x += p.ox; p.y += p.oy;
          break;
        default: break;
      }
    }
    p.x += p.vx * SECONDS_PER_UPDATE;
    p.y += p.vy * SECONDS_PER_UPDATE;
    const spinSpeed = evalTrack(this.def.params.ParticleSpinSpeed, t, p.interp[1] || 0);
    p.spin += (spinSpeed + p.spinVel) * SECONDS_PER_UPDATE;
  }
  draw(ctx) {
    const d = this.def;
    const img = d._img;
    if (!img) return;
    const frames = Math.max(1, d.imageFrames || 1);
    const fw = img.width / (d.imageCol > 0 ? Math.max(d.imageCol, 1) : frames);
    // PopCap often packs frames horizontally
    const frameW = frames > 1 ? Math.floor(img.width / frames) : img.width;
    const frameH = img.height;
    for (const p of this.particles) {
      const t = p.timeValue;
      let alpha = evalTrack(d.params.ParticleAlpha, t, p.interp[2] || 0);
      alpha *= evalTrack(d.params.SystemAlpha, this.age / Math.max(1, this.duration - 1), 0.5);
      if (alpha <= 0.01) continue;
      let scale = evalTrack(d.params.ParticleScale, t, p.interp[3] || 0);
      if (scale === 0) scale = 1;
      const brightness = evalTrack(d.params.ParticleBrightness, t, p.interp[4] || 0) || 1;
      let frame = 0;
      if (frames > 1) {
        if (d.animated) {
          const rate = evalTrack(d.params.AnimationRate, t, p.interp[5] || 0) || 1;
          frame = Math.floor(p.age * rate * SECONDS_PER_UPDATE * frames) % frames;
        } else {
          // PopCap: non-animated multi-frame → pick one cell (random at launch)
          frame = (p._frame | 0) % frames;
        }
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      if (brightness !== 1) ctx.filter = `brightness(${brightness})`;
      const dw = frameW * scale, dh = frameH * scale;
      ctx.drawImage(img, frame * frameW, 0, frameW, frameH, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
  }
}

export class ParticleSystem {
  constructor(def, x, y) {
    this.x = x; this.y = y; this.dead = false;
    this.emitters = def.emitters.map((e) => new Emitter(e, this));
  }
  setPosition(x, y) { this.x = x; this.y = y; for (const e of this.emitters) { e.systemCenterX = x; e.systemCenterY = y; } }
  update(ticks = 1) {
    for (let i = 0; i < ticks; i++) {
      for (const e of this.emitters) e.update();
    }
    if (this.emitters.every((e) => e.dead)) this.dead = true;
  }
  draw(ctx) {
    for (const e of this.emitters) e.draw(ctx);
  }
}
