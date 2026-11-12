// Terrain: a per-pixel material mask built from level shapes.
// 0 = empty, >0 = material id (see MATERIALS). Pure JS — runs in browser and node.

export const W = 1920;
export const H = 960;

export const MATERIALS = {
  ice: 1, snow: 2, rock: 3, wood: 4, sand: 5, grass: 6, crystal: 7, metal: 8,
};
export const MATERIAL_NAMES = Object.fromEntries(Object.entries(MATERIALS).map(([k, v]) => [v, k]));

export class Terrain {
  constructor(shapes = []) {
    this.mask = new Uint8Array(W * H);
    for (const s of shapes) this.apply(s);
  }

  apply(s) {
    const v = s.erase ? 0 : (MATERIALS[s.mat] || 1);
    switch (s.t) {
      case 'rect': this.fillRect(s, v); break;
      case 'ellipse': this.fillEllipse(s.x, s.y, s.rx, s.ry ?? s.rx, v); break;
      case 'poly': this.fillPoly(s.pts, v); break;
      case 'stroke': for (const [x, y] of s.pts) this.fillEllipse(x, y, s.r, s.r, v); break;
    }
  }

  set(x, y, v) { if (x >= 0 && y >= 0 && x < W && y < H) this.mask[y * W + x] = v; }

  fillRect({ x, y, w, h, r = 0 }, v) {
    const x0 = Math.max(0, Math.round(x)), y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(W, Math.round(x + w)), y1 = Math.min(H, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        if (r > 0) {
          const cx = xx < x + r ? x + r : xx > x + w - r ? x + w - r : xx;
          const cy = yy < y + r ? y + r : yy > y + h - r ? y + h - r : yy;
          const dx = xx + 0.5 - cx, dy = yy + 0.5 - cy;
          if ((cx !== xx || cy !== yy) && dx * dx + dy * dy > r * r) continue;
        }
        this.mask[yy * W + xx] = v;
      }
    }
  }

  fillEllipse(cx, cy, rx, ry, v) {
    const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      const t = (y + 0.5 - cy) / ry;
      if (t * t > 1) continue;
      const half = rx * Math.sqrt(1 - t * t);
      const xa = Math.max(0, Math.round(cx - half)), xb = Math.min(W, Math.round(cx + half));
      this.mask.fill(v, y * W + xa, y * W + xb);
    }
  }

  fillPoly(pts, v) {
    let ymin = Infinity, ymax = -Infinity;
    for (const [, y] of pts) { ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    ymin = Math.max(0, Math.floor(ymin)); ymax = Math.min(H - 1, Math.ceil(ymax));
    const n = pts.length;
    for (let y = ymin; y <= ymax; y++) {
      const sy = y + 0.5, xs = [];
      for (let i = 0; i < n; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
        if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) xs.push(x1 + (sy - y1) / (y2 - y1) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.max(0, Math.round(xs[i])), xb = Math.min(W, Math.round(xs[i + 1]));
        if (xb > xa) this.mask.fill(v, y * W + xa, y * W + xb);
      }
    }
  }

  // x outside the world counts as a wall, above the top is open, below the bottom is the void.
  solid(x, y) {
    x = x | 0; y = y | 0;
    if (x < 0 || x >= W) return true;
    if (y < 0 || y >= H) return false;
    return this.mask[y * W + x] !== 0;
  }
}
