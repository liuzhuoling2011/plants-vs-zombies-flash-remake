/**
 * PopCap Flash Reanimator port — evidence from ByteReanimDescriptor.as + Reanimation.as
 * Matrix: a=cos(kX)*sX, b=-sin(kX)*sX, c=sin(kY)*sY, d=cos(kY)*sY, tx=tX, ty=tY
 * Draw: BitmapData.draw with matrix translated by (mX,mY)
 */
export const SECONDS_PER_UPDATE = 0.01;

export class ReanimLibrary {
  constructor() {
    this.defs = {};
    this.images = {}; // IMAGE_* -> HTMLImageElement
    this.manifest = null;
  }
  async load(manifestUrl = 'assets/reanim/manifest.json') {
    const man = await (await fetch(manifestUrl)).json();
    this.manifest = man;
    const imgEntries = Object.entries(man.images);
    // Load images in batches
    const batch = 40;
    for (let i = 0; i < imgEntries.length; i += batch) {
      await Promise.all(imgEntries.slice(i, i + batch).map(async ([key, url]) => {
        try {
          const img = new Image();
          img.decoding = 'async';
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
          this.images[key] = img;
        } catch (_) { /* missing part ok */ }
      }));
    }
    // Lazy-load defs on demand; preload major ones
    const preload = [
      'REANIM_PEASHOOTERSINGLE','REANIM_PEASHOOTER','REANIM_SUNFLOWER','REANIM_WALLNUT',
      'REANIM_CHERRYBOMB','REANIM_SQUASH','REANIM_SNOWPEA','REANIM_CHOMPER','REANIM_PUFFSHROOM',
      'REANIM_SUNSHROOM','REANIM_FUMESHROOM','REANIM_GRAVEBUSTER','REANIM_ZOMBIE',
      'REANIM_ZOMBIE_POLEVAULTER','REANIM_ZOMBIE_PAPER','REANIM_ZOMBIE_FOOTBALL',
      'REANIM_ZOMBIE_CHARRED','REANIM_LAWNMOWER','REANIM_SUN','REANIM_LEFTPEATER',
    ];
    await Promise.all(preload.map((k) => this.loadDef(k)));
  }
  async loadDef(key) {
    if (this.defs[key]) return this.defs[key];
    const meta = this.manifest.reanims[key];
    if (!meta) throw new Error('missing reanim ' + key);
    const raw = await (await fetch(meta.file)).json();
    // Expand compact transforms into objects + resolve images
    const tracks = raw.tracks.map((tr) => {
      const transforms = tr.t.map((row) => {
        const [frame, alpha, kX, kY, sX, sY, tX, tY, imageId] = row;
        return {
          frame, alpha, kX, kY, sX, sY, tX, tY,
          imageId: imageId || null,
          image: imageId ? (this.images[imageId] || null) : null,
        };
      });
      return { name: tr.name, transforms, numTransforms: transforms.length };
    });
    const trackNameMap = {};
    for (const t of tracks) trackNameMap[t.name] = t;
    const def = { fps: raw.fps, tracks, trackNameMap, numTracks: tracks.length };
    this.defs[key] = def;
    return def;
  }
  create(key) {
    const def = this.defs[key];
    if (!def) throw new Error('Reanim not loaded: ' + key);
    return new Reanimation(def);
  }
}

const LOOP_ALWAYS = {
  updatePositive(r) { while (r.animTime >= 1) r.animTime -= 1; },
  updateNegative(r) { while (r.animTime < 0) r.animTime += 1; },
  doHold() { return false; },
};

function loopOnceAndIdle(idleTrack, idleRate) {
  return {
    updatePositive(r) {
      if (r.animTime > 1) {
        r.animTime = 0;
        r.currentTrack = idleTrack;
        r.loopType = LOOP_ALWAYS;
        r.animRate = idleRate;
      }
    },
    updateNegative(r) {
      if (r.animTime < 0) {
        r.animTime = 1;
        r.currentTrack = idleTrack;
        r.loopType = LOOP_ALWAYS;
        r.animRate = idleRate;
      }
    },
    doHold() { return true; },
  };
}

function loopOnceAndHold(cb) {
  let done = false;
  return {
    updatePositive(r) {
      if (r.animTime >= 1) {
        r.animTime = 1;
        if (!done) { done = true; if (cb) cb(); }
      }
    },
    updateNegative(r) {
      if (r.animTime <= 0) {
        r.animTime = 0;
        if (!done) { done = true; if (cb) cb(); }
      }
    },
    doHold() { return true; },
  };
}

function lerp(a, b, t) { return a + (b - a) * t; }

export class Reanimation {
  static LOOP_TYPE_ALWAYS = LOOP_ALWAYS;
  static loopOnceAndIdle = loopOnceAndIdle;
  static loopOnceAndHold = loopOnceAndHold;

  constructor(definition) {
    this.mDefinition = definition;
    this.mX = 0; this.mY = 0;
    this.mAnimTime = 0; this.mLastAnimTime = 0;
    this.mAnimRate = 12;
    this.mLoopType = LOOP_ALWAYS;
    this.mCurrentTrack = null;
    this.mStartFrame = 0; this.mFrameCount = 0;
    this.mFrameTime = { mFraction: 0, mFrameBefore: 0, mFrameAfter: 0 };
    this.mVisibleMap = {};
    this.mIsDead = false;
    this.child = null; this.childTrack = null;
    this.mChildOffsetX = 0; this.mChildOffsetY = 0;
    this.locatorX = 0; this.locatorY = 0;
    this.overrideRGB = [1, 1, 1];
    this.alphaMul = 1;
  }
  get x() { return this.mX; }
  set x(v) { this.mX = v; }
  get y() { return this.mY; }
  set y(v) { this.mY = v; }
  get animRate() { return this.mAnimRate; }
  set animRate(v) { this.mAnimRate = v; }
  get animTime() { return this.mAnimTime; }
  set animTime(v) { this.mAnimTime = v; }
  get loopType() { return this.mLoopType; }
  set loopType(v) { this.mLoopType = v; }
  get currentTrack() { return this.mCurrentTrack; }
  set currentTrack(value) { this.playTrack(value); }

  setTrackVisible(name, vis) { this.mVisibleMap[name] = vis; }

  attachReanimation(child, trackName, ox = 0, oy = 0) {
    this.child = child;
    child.mX = this.mX; child.mY = this.mY;
    this.mChildOffsetX = ox; this.mChildOffsetY = oy;
    this.childTrack = trackName;
  }

  playTrack(trackName) {
    const anim = this.mDefinition.trackNameMap[trackName];
    if (!anim) { console.warn('missing track', trackName); return; }
    this.mCurrentTrack = trackName;
    this.mAnimTime = 0;
    const transforms = anim.transforms;
    let startFrame = -1, endFrame = -1, i = 0;
    for (; i < transforms.length; i++) {
      if (transforms[i].frame >= 0) { startFrame = i; break; }
    }
    for (; i < transforms.length; i++) {
      if (transforms[i].frame >= 0) endFrame = i;
    }
    this.mStartFrame = startFrame < 0 ? 0 : startFrame;
    this.mFrameCount = Math.max(1, endFrame - startFrame);
  }

  updateFrameTime() {
    const animTime = this.mAnimTime;
    const startFrame = this.mStartFrame;
    const frameCount = this.mFrameCount;
    const hold = this.mLoopType.doHold();
    const aAnimPosition = startFrame + frameCount * animTime;
    let aAnimFrameBefore = Math.floor(aAnimPosition);
    const aLastFrame = startFrame + frameCount - 1;
    this.mFrameTime.mFraction = aAnimPosition - aAnimFrameBefore;
    this.mFrameTime.mFrameBefore = aAnimFrameBefore;
    this.mFrameTime.mFrameAfter = aAnimFrameBefore + 1;
    if (hold && animTime >= 1) {
      this.mFrameTime.mFrameBefore = aLastFrame;
      this.mFrameTime.mFrameAfter = aLastFrame;
    }
    // Clamp after to last transform index
    const maxIdx = this.mDefinition.tracks[0].transforms.length - 1;
    if (this.mFrameTime.mFrameAfter > maxIdx) this.mFrameTime.mFrameAfter = maxIdx;
    if (this.mFrameTime.mFrameBefore > maxIdx) this.mFrameTime.mFrameBefore = maxIdx;
    if (this.mFrameTime.mFrameBefore < 0) this.mFrameTime.mFrameBefore = 0;
  }

  update(ticks = 1) {
    if (!this.mCurrentTrack || this.mFrameCount === 0 || this.mIsDead) return;
    for (let i = 0; i < ticks; i++) {
      this.mLastAnimTime = this.mAnimTime;
      this.mAnimTime += SECONDS_PER_UPDATE * this.mAnimRate / this.mFrameCount;
      if (this.mAnimRate > 0) this.mLoopType.updatePositive(this);
      else this.mLoopType.updateNegative(this);
    }
    this.updateFrameTime();
    if (this.child) this.child.update(ticks);
  }

  getTrackVelocity(trackName) {
    const track = this.mDefinition.trackNameMap[trackName];
    if (!track) return 0;
    const a = track.transforms[this.mFrameTime.mFrameBefore];
    let b = track.transforms[this.mFrameTime.mFrameAfter];
    if (!b) b = a;
    const velo = (b.tX - a.tX) * SECONDS_PER_UPDATE * this.mAnimRate;
    return velo;
  }

  shouldTriggerTimedEvent(time) {
    if (this.mFrameCount === 0 || this.mLastAnimTime < 0 || this.mAnimRate <= 0) return false;
    if (this.mAnimTime >= this.mLastAnimTime) {
      return this.mAnimTime >= time && this.mLastAnimTime < time;
    }
    return this.mAnimTime >= time || this.mLastAnimTime < time;
  }

  draw(ctx, originX, originY) {
    if (this.mIsDead) return;
    // originX/Y are world plant/zombie position (Flash mX/mY)
    this.mX = originX; this.mY = originY;
    this.updateFrameTime();
    const tracks = this.mDefinition.tracks;
    for (let i = 0; i < tracks.length; i++) {
      this.drawTrackLerp(ctx, tracks[i]);
      if (tracks[i].name === this.childTrack && this.child) {
        this.child.mX = this.locatorX + this.mChildOffsetX;
        this.child.mY = this.locatorY + this.mChildOffsetY;
        this.child.draw(ctx, this.child.mX, this.child.mY);
      }
    }
  }

  drawTrackLerp(ctx, track) {
    if (this.mVisibleMap[track.name] === false) return;
    // Skip pure marker tracks that never have images (anim_* without art)
    let a = track.transforms[this.mFrameTime.mFrameBefore];
    let b = track.transforms[this.mFrameTime.mFrameAfter];
    if (!a) return;
    if (a.frame < 0) return;
    if (!b || b.frame < 0) b = a;
    const t = this.mFrameTime.mFraction;
    const kX = lerp(a.kX, b.kX, t);
    const kY = lerp(a.kY, b.kY, t);
    const sX = lerp(a.sX, b.sX, t);
    const sY = lerp(a.sY, b.sY, t);
    const tX = lerp(a.tX, b.tX, t);
    const tY = lerp(a.tY, b.tY, t);
    const tA = lerp(a.alpha, b.alpha, t);
    const ma = Math.cos(kX) * sX;
    const mb = -Math.sin(kX) * sX;
    const mc = Math.sin(kY) * sY;
    const md = Math.cos(kY) * sY;
    if (track.name === this.childTrack) {
      const init = track.transforms[this.mStartFrame];
      this.locatorX = this.mX + (tX - (init ? init.tX : 0));
      this.locatorY = this.mY + (tY - (init ? init.tY : 0));
    }
    const img = a.image;
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, this.alphaMul * tA));
    // Concatenate onto current CTM (keeps devicePixelRatio scale from fitCanvas)
    // Flash Graphics2D: translate(mX,mY) then draw with part matrix
    ctx.translate(this.mX, this.mY);
    ctx.transform(ma, mb, mc, md, tX, tY);
    if (this.overrideRGB[0] !== 1 || this.overrideRGB[1] !== 1 || this.overrideRGB[2] !== 1) {
      ctx.filter = 'hue-rotate(160deg) saturate(1.3)';
    }
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }
}

export function randRange(a, b) { return a + Math.random() * (b - a); }
