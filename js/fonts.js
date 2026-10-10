/** Bitmap fonts from ByteFontDescriptor.as */
export class FontLibrary {
  constructor() { this.fonts = {}; this.manifest = null; }
  async load(url = 'assets/fonts/manifest.json') {
    this.manifest = await (await fetch(url)).json();
    await Promise.all(Object.keys(this.manifest).map((k) => this.loadFont(k)));
  }
  async loadFont(key) {
    if (this.fonts[key]) return this.fonts[key];
    const meta = this.manifest[key];
    if (!meta) return null;
    const def = await (await fetch(meta.file)).json();
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = meta.image; });
    const layer = def.layers[0];
    const glyphs = {};
    for (const [code, g] of Object.entries(layer.chars)) {
      if (g.w <= 0 || g.h <= 0) { glyphs[code] = { ...g, canvas: null }; continue; }
      const c = document.createElement('canvas');
      c.width = g.w; c.height = g.h;
      const cx = c.getContext('2d');
      cx.drawImage(img, g.x, g.y, g.w, g.h, 0, 0, g.w, g.h);
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
      if (g.canvas) ctx.drawImage(g.canvas, cx + (g.ox || 0), y - f.ascent + (g.oy || 0));
      cx += g.width || g.w || 8;
    }
  }
}
