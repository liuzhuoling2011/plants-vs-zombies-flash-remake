/** Bitmap fonts from ByteFontDescriptor.as — sheets are HD 2× WebP */
import { ASSET_SCALE, ASSET_VER } from './constants.js';

export class FontLibrary {
  constructor() { this.fonts = {}; this.manifest = null; }
  async load(url = 'assets/fonts/manifest.json') {
    this.manifest = await (await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + ASSET_VER)).json();
    await Promise.all(Object.keys(this.manifest).map((k) => this.loadFont(k)));
  }
  async loadFont(key) {
    if (this.fonts[key]) return this.fonts[key];
    const meta = this.manifest[key];
    if (!meta) return null;
    const def = await (await fetch(meta.file + '?v=' + ASSET_VER)).json();
    const img = new Image();
    const src = meta.image.includes('?') ? meta.image : meta.image + '?v=' + ASSET_VER;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const layer = def.layers[0];
    const S = ASSET_SCALE;
    const glyphs = {};
    for (const [code, g] of Object.entries(layer.chars)) {
      if (g.w <= 0 || g.h <= 0) { glyphs[code] = { ...g, canvas: null }; continue; }
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(g.w * S));
      c.height = Math.max(1, Math.round(g.h * S));
      const cx = c.getContext('2d');
      cx.imageSmoothingEnabled = true;
      cx.drawImage(img, g.x * S, g.y * S, g.w * S, g.h * S, 0, 0, c.width, c.height);
      glyphs[code] = { ...g, canvas: c };
    }
    const font = { def, layer, glyphs, point: def.pointSize, ascent: layer.ascent || def.pointSize };
    this.fonts[key] = font;
    return font;
  }
  measure(key, text) {
    const f = this.fonts[key];
    if (!f) return text.length * 8;
    let w = 0;
    for (const ch of text) {
      const g = f.glyphs[String(ch.charCodeAt(0))] || f.glyphs['63'];
      w += g ? (g.width || g.w || 8) : 8;
    }
    return w;
  }
  draw(ctx, key, text, x, y, align = 'left') {
    const f = this.fonts[key];
    if (!f) {
      ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
      ctx.textAlign = align; ctx.fillText(text, x, y);
      return;
    }
    let w = this.measure(key, text);
    let cx = x;
    if (align === 'center') cx = x - w / 2;
    else if (align === 'right') cx = x - w;
    for (const ch of text) {
      const code = String(ch.charCodeAt(0));
      const g = f.glyphs[code];
      if (!g) { cx += 6; continue; }
      if (g.canvas) {
        const dw = g.w || g.width || 8;
        const dh = g.h || g.height || 8;
        ctx.drawImage(g.canvas, cx + (g.ox || 0), y - f.ascent + (g.oy || 0), dw, dh);
      }
      cx += g.width || g.w || 8;
    }
  }
}
