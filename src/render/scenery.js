// Pre-rendered layers: themed backgrounds and textured terrain (built once per level).
import { W, H, MATERIAL_NAMES } from '../engine/terrain.js';

// ---------- noise ----------
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function smooth(t) { return t * t * (3 - 2 * t); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x, y) { return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.17; }

const MAT_COLORS = {
  ice: [[198, 236, 250], [96, 170, 210]],
  snow: [[250, 253, 255], [190, 220, 238]],
  rock: [[150, 128, 104], [70, 58, 48]],
  wood: [[190, 132, 74], [104, 64, 30]],
  sand: [[244, 210, 140], [196, 146, 78]],
  grass: [[118, 96, 60], [70, 52, 32]],
  crystal: [[196, 160, 250], [70, 40, 140]],
  metal: [[170, 180, 196], [80, 90, 106]],
};
const THEME_ROCK = { jungle: [[138, 140, 100], [62, 66, 42]], cave: [[104, 96, 128], [40, 34, 60]], desert: [[196, 128, 84], [112, 64, 40]], night: [[96, 110, 150], [34, 40, 66]] };

function texel(mat, x, y, depth, theme) {
  let [hi, lo] = (mat === 'rock' && THEME_ROCK[theme]) || MAT_COLORS[mat] || MAT_COLORS.rock;
  let k = Math.min(1, depth / 220);
  let n = fbm(x / 40, y / 40);
  let r, g, b, shade = 0;
  if (mat === 'ice' || mat === 'metal') {
    // ice bricks
    const bh = 34, row = Math.floor(y / bh), bw = 70, off = (row % 2) * 35;
    const lx = (x + off) % bw, ly = y % bh;
    if (ly < 2 || lx < 2) shade = -0.22; else if (ly < 5 || lx < 5) shade = 0.12;
    n = n * 0.6 + hash(Math.floor((x + off) / bw), row) * 0.4;
  } else if (mat === 'wood') {
    const ly = y % 22;
    if (ly < 2) shade = -0.3;
    n = 0.5 + Math.sin(x * 0.05 + vnoise(x / 60, y / 10) * 6) * 0.3;
  } else if (mat === 'rock') {
    const bh = 46, row = Math.floor(y / bh), bw = 92, off = (row % 2) * 46;
    const lx = (x + off) % bw, ly = y % bh;
    if (theme === 'jungle' || theme === 'cave' || theme === 'night') { if (ly < 3 || lx < 3) shade = -0.35; else if (ly < 6 || lx < 6) shade = 0.1; }
    n = fbm(x / 28, y / 28);
    if (n > 0.66) shade -= 0.12;
  } else if (mat === 'sand') {
    n = 0.5 + Math.sin(x * 0.03 + y * 0.12 + vnoise(x / 80, y / 80) * 4) * 0.25 + hash(x, y) * 0.15;
  } else if (mat === 'crystal') {
    const f = Math.abs(((x * 0.7 + y) % 60) - 30) / 30;
    n = f * 0.6 + n * 0.4;
  }
  const m = Math.max(0, Math.min(1, 0.25 + n * 0.75 - k * 0.55 + shade));
  r = lo[0] + (hi[0] - lo[0]) * m; g = lo[1] + (hi[1] - lo[1]) * m; b = lo[2] + (hi[2] - lo[2]) * m;
  return [r, g, b];
}

export function buildTerrainLayer(terrain, theme) {
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data, m = terrain.mask;
  const top = new Int16Array(W).fill(-1000);
  // depth from the nearest surface above, per column
  const depth = new Uint16Array(W);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, v = m[i];
      if (!v) { depth[x] = 0; continue; }
      depth[x] = Math.min(999, depth[x] + 1);
      const name = MATERIAL_NAMES[v];
      let [r, g, b] = texel(name, x, y, depth[x], theme);
      // edge lighting
      const up = y > 0 ? m[i - W] : 0, left = x > 0 ? m[i - 1] : 1, right = x < W - 1 ? m[i + 1] : 1, down = y < H - 1 ? m[i + W] : 1;
      if (!left || !right || !down) { r *= 0.62; g *= 0.62; b *= 0.66; }
      else if (x > 2 && !m[i - 3] || x < W - 3 && !m[i + 3]) { r *= 0.85; g *= 0.85; b *= 0.88; }
      if (depth[x] <= 3) { r = r * 0.55 + 255 * 0.45; g = g * 0.55 + 255 * 0.45; b = b * 0.55 + 255 * 0.45; }
      if (y < H - 4 && !m[i + 4 * W] && down) { r *= 0.8; g *= 0.8; b *= 0.85; }
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  decorateSurfaces(ctx, terrain, theme);
  return cv;
}

// snow caps, grass, icicles, moss... on surfaces found in the mask
function decorateSurfaces(ctx, terrain, theme) {
  const m = terrain.mask;
  const solid = (x, y) => x >= 0 && x < W && y >= 0 && y < H && m[y * W + x] !== 0;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // top surfaces
  for (let x = 0; x < W; x += 2) {
    for (let y = 1; y < H; y++) {
      if (!solid(x, y) || solid(x, y - 1)) continue;
      const mat = MATERIAL_NAMES[m[y * W + x]];
      if (theme === 'ice' || mat === 'snow') {
        ctx.fillStyle = '#fbfeff';
        ctx.fillRect(x, y - 3, 2, 9 + Math.sin(x * 0.09) * 3 + Math.sin(x * 0.023) * 3);
        ctx.fillStyle = 'rgba(160,210,235,0.55)';
        ctx.fillRect(x, y + 6 + Math.sin(x * 0.09) * 3 + Math.sin(x * 0.023) * 3, 2, 2);
      } else if (theme === 'jungle' || mat === 'grass') {
        ctx.fillStyle = '#3f8f35'; ctx.fillRect(x, y - 1, 2, 8 + Math.sin(x * 0.2) * 2);
        if (rnd() < 0.35) {
          ctx.strokeStyle = rnd() < 0.5 ? '#4fae43' : '#2f7a2a'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 6, y - 5 - rnd() * 9); ctx.stroke();
        }
        if (rnd() < 0.012) { ctx.fillStyle = ['#ff6fa8', '#ffd23f', '#fff'][Math.floor(rnd() * 3)]; ctx.beginPath(); ctx.arc(x, y - 8, 3, 0, 7); ctx.fill(); }
      } else if (theme === 'desert') {
        ctx.fillStyle = '#ffe3a6'; ctx.fillRect(x, y - 1, 2, 6 + Math.sin(x * 0.05) * 2);
        if (rnd() < 0.01) { ctx.fillStyle = '#7a8a3a'; ctx.beginPath(); ctx.ellipse(x, y - 4, 8, 4, 0, 0, 7); ctx.fill(); }
      } else if (theme === 'night') {
        ctx.fillStyle = '#2f5d4a'; ctx.fillRect(x, y - 1, 2, 7 + Math.sin(x * 0.17) * 2);
        if (rnd() < 0.3) { ctx.strokeStyle = '#3e7a5c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 6, y - 4 - rnd() * 8); ctx.stroke(); }
        if (rnd() < 0.008) { ctx.fillStyle = '#7dd3fc'; ctx.beginPath(); ctx.arc(x, y - 6, 4, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e0f2fe'; ctx.fillRect(x - 1, y - 6, 2, 6); }
      } else if (theme === 'cave') {
        ctx.fillStyle = '#5d7a4a'; ctx.fillRect(x, y - 1, 2, 4 + Math.sin(x * 0.11) * 2);
        if (rnd() < 0.01) { ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x, y - 14); ctx.lineTo(x + 4, y); ctx.fill(); }
      }
      y += 6;
    }
  }
  // ceilings: icicles / drips / roots
  for (let x = 4; x < W - 4; x += 6) {
    for (let y = 1; y < H - 1; y++) {
      if (!solid(x, y) || solid(x, y + 1)) continue;
      if (rnd() < 0.22) {
        const len = 6 + rnd() * (theme === 'ice' ? 26 : 16);
        if (theme === 'ice') { ctx.fillStyle = 'rgba(225,248,255,0.95)'; }
        else if (theme === 'cave' || theme === 'night') { ctx.fillStyle = 'rgba(120,108,160,0.95)'; }
        else if (theme === 'jungle') { ctx.fillStyle = 'rgba(60,120,50,0.9)'; }
        else { ctx.fillStyle = 'rgba(150,100,60,0.9)'; }
        ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x, y + len); ctx.lineTo(x + 3, y); ctx.closePath(); ctx.fill();
      }
      y += 4;
    }
  }
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
}

// ---------- backgrounds ----------
function ridge(ctx, y0, amp, freq, color, seed, rough = 1) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const y = y0 - fbm(x * freq + seed, seed) * amp - Math.abs(Math.sin(x * freq * 3 + seed)) * amp * 0.25 * rough;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
}

function cloud(ctx, x, y, s, a = 0.9) {
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  for (const [dx, dy, r] of [[0, 0, 40], [40, -18, 46], [86, 0, 38], [44, 10, 40]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); }
}

function tree(ctx, x, y, h, c1, c2) {
  ctx.fillStyle = c2; ctx.fillRect(x - h * 0.04, y - h * 0.4, h * 0.08, h * 0.4);
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.moveTo(x - h * 0.28, y - h * 0.25); ctx.lineTo(x, y - h); ctx.lineTo(x + h * 0.28, y - h * 0.25); ctx.closePath(); ctx.fill();
}

export function buildBackground(theme) {
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext('2d');
  const sky = (stops) => { const g = ctx.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => g.addColorStop(o, c)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  if (theme === 'ice') {
    sky([[0, '#8ec9ec'], [0.55, '#d8f0fb'], [1, '#f2fbff']]);
    const sun = ctx.createRadialGradient(1500, 160, 10, 1500, 160, 260); sun.addColorStop(0, 'rgba(255,255,230,0.9)'); sun.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = sun; ctx.fillRect(1200, 0, 600, 450);
    cloud(ctx, 200, 140, 1.2); cloud(ctx, 900, 90, 0.9, 0.8); cloud(ctx, 1550, 200, 1.1, 0.7);
    ridge(ctx, 560, 300, 0.0022, '#b9d9ec', 3);
    // snowy caps on far mountains
    ridge(ctx, 620, 240, 0.003, '#9cc4dc', 11);
    for (let i = 0; i < 46; i++) tree(ctx, (i * 53) % W + (i % 3) * 13, 700 + (i % 4) * 8, 120 + (i % 5) * 20, '#5e8fa8', '#4a7286');
    ridge(ctx, 760, 120, 0.004, '#e4f3fb', 21, 0.3);
    // pond
    const pg = ctx.createLinearGradient(0, 760, 0, 900); pg.addColorStop(0, '#8fc7e3'); pg.addColorStop(1, '#5aa2c8');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.ellipse(1000, 820, 700, 70, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(500 + i * 70, 800 + (i % 3) * 18); ctx.lineTo(540 + i * 70, 800 + (i % 3) * 18); ctx.stroke(); }
    pavilion(ctx, 980, 700);
  } else if (theme === 'jungle') {
    sky([[0, '#6fb8e8'], [0.6, '#cfe9d6'], [1, '#e9f2cf']]);
    cloud(ctx, 300, 120, 1, 0.7); cloud(ctx, 1300, 80, 1.3, 0.6);
    ridge(ctx, 520, 200, 0.002, '#9fc3b6', 5);
    pyramid(ctx, 1320, 760, 1);
    ridge(ctx, 700, 160, 0.004, '#5d9a6e', 9);
    for (let i = 0; i < 30; i++) blob(ctx, (i * 71) % W, 760 + (i % 3) * 30, 80 + (i % 4) * 25, i % 2 ? '#3f7d4a' : '#2f6b3d');
    for (let i = 0; i < 14; i++) blob(ctx, (i * 151) % W, 900, 120, i % 2 ? '#2a5c34' : '#24502e');
    // hanging foliage at the top
    for (let x = 0; x < W; x += 40) { ctx.fillStyle = x % 80 ? '#2f6b3d' : '#3f7d4a'; ctx.beginPath(); ctx.ellipse(x, 0, 50, 34 + (x % 120) / 4, 0, 0, 7); ctx.fill(); }
  } else if (theme === 'desert') {
    sky([[0, '#f6a94b'], [0.45, '#fcd9a0'], [1, '#fff1d6']]);
    const sun = ctx.createRadialGradient(1450, 260, 30, 1450, 260, 320); sun.addColorStop(0, 'rgba(255,250,220,1)'); sun.addColorStop(0.25, 'rgba(255,220,140,0.8)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = sun; ctx.fillRect(1100, 0, 700, 650);
    ridge(ctx, 560, 160, 0.0018, '#e7a865', 2, 0.4);
    // mesas
    ctx.fillStyle = '#c47a45';
    for (const [x, w, h] of [[200, 260, 200], [700, 180, 150], [1650, 220, 230]]) { ctx.beginPath(); ctx.moveTo(x, 640); ctx.lineTo(x + 20, 640 - h); ctx.lineTo(x + w - 20, 640 - h); ctx.lineTo(x + w, 640); ctx.fill(); }
    ridge(ctx, 720, 110, 0.003, '#e9b871', 7, 0.2);
    ridge(ctx, 840, 80, 0.004, '#f3cd8b', 13, 0.2);
    for (const x of [380, 1100, 1500]) { ctx.fillStyle = '#6b5a2e'; ctx.fillRect(x - 4, 690, 8, 60); ctx.fillStyle = '#7a8a3a'; ctx.beginPath(); ctx.ellipse(x, 686, 70, 14, 0, 0, 7); ctx.fill(); }
  } else if (theme === 'night') {
    sky([[0, '#060b24'], [0.55, '#1b2457'], [1, '#3b3a7a']]);
    for (let i = 0; i < 220; i++) { const x = hash(i, 7) * W, y = hash(i, 9) * 600, r = hash(i, 11) * 1.8 + 0.4; ctx.fillStyle = `rgba(255,255,255,${0.4 + hash(i, 13) * 0.6})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    const moon = ctx.createRadialGradient(1500, 190, 10, 1500, 190, 260); moon.addColorStop(0, 'rgba(255,250,220,0.5)'); moon.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = moon; ctx.fillRect(1200, 0, 600, 460);
    ctx.fillStyle = '#fff8dc'; ctx.beginPath(); ctx.arc(1500, 190, 70, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(200,190,150,0.35)'; for (const [x, y, r] of [[1480, 170, 14], [1525, 215, 10], [1470, 220, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ridge(ctx, 640, 220, 0.0024, '#232a5c', 6);
    // ferris wheel silhouette
    ctx.save(); ctx.translate(520, 560); ctx.strokeStyle = '#141a3d'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, 0, 170, 0, 7); ctx.stroke();
    for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * 170, Math.sin(an) * 170); ctx.stroke(); ctx.fillStyle = a % 3 ? '#ffd76a' : '#f472b6'; ctx.beginPath(); ctx.arc(Math.cos(an) * 170, Math.sin(an) * 170, 7, 0, 7); ctx.fill(); }
    ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(-90, 260); ctx.lineTo(0, 0); ctx.lineTo(90, 260); ctx.stroke(); ctx.restore();
    ridge(ctx, 780, 120, 0.004, '#161b40', 12, 0.4);
    for (let i = 0; i < 40; i++) tree(ctx, (i * 61) % W, 840 + (i % 3) * 10, 100 + (i % 4) * 30, '#0f1433', '#0b0f26');
    for (let x = 60; x < W; x += 140) { ctx.fillStyle = '#0b0f26'; ctx.fillRect(x, 820, 4, 120); }
    ctx.strokeStyle = '#0b0f26'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 860); ctx.lineTo(W, 860); ctx.moveTo(0, 900); ctx.lineTo(W, 900); ctx.stroke();
  } else {
    sky([[0, '#120d24'], [0.6, '#231a40'], [1, '#33284f']]);
    for (let i = 0; i < 5; i++) {
      const lg2 = ctx.createLinearGradient(0, 0, 0, H); lg2.addColorStop(0, 'rgba(180,160,255,0.12)'); lg2.addColorStop(1, 'rgba(180,160,255,0)');
      ctx.fillStyle = lg2; ctx.beginPath(); const x = 200 + i * 380; ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0); ctx.lineTo(x + 220, H); ctx.lineTo(x + 100, H); ctx.fill();
    }
    ridge(ctx, 900, 380, 0.003, '#2b2246', 4);
    ridge(ctx, 960, 240, 0.005, '#1c1631', 8);
    for (let x = 0; x < W; x += 60) { ctx.fillStyle = '#1a142d'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 30, 60 + fbm(x * 0.01, 3) * 180); ctx.lineTo(x + 60, 0); ctx.fill(); }
    for (let i = 0; i < 40; i++) { const x = hash(i, 1) * W, y = 300 + hash(i, 2) * 600; const g = ctx.createRadialGradient(x, y, 0, x, y, 14); g.addColorStop(0, 'rgba(200,170,255,0.7)'); g.addColorStop(1, 'rgba(200,170,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28); }
  }
  return cv;
}

function blob(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.arc(x + r * 0.7, y + r * 0.2, r * 0.8, 0, 7); ctx.arc(x - r * 0.7, y + r * 0.25, r * 0.75, 0, 7); ctx.fill(); }

function pavilion(ctx, x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#8b5a2b';
  for (const px of [-120, -50, 50, 120]) ctx.fillRect(px - 6, -170, 12, 170);
  ctx.fillStyle = '#a0692f'; ctx.fillRect(-180, -60, 360, 12);
  ctx.strokeStyle = '#7a4a1e'; ctx.lineWidth = 4;
  for (let i = -170; i <= 170; i += 20) { ctx.beginPath(); ctx.moveTo(i, -60); ctx.lineTo(i, -30); ctx.stroke(); }
  ctx.fillStyle = '#c8a161'; ctx.beginPath(); ctx.moveTo(-200, -160); ctx.lineTo(0, -250); ctx.lineTo(200, -160); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(110,80,40,0.6)'; ctx.lineWidth = 2;
  for (let i = -190; i < 200; i += 16) { ctx.beginPath(); ctx.moveTo(i, -162); ctx.lineTo(i * 0.2, -244); ctx.stroke(); }
  // bridge
  ctx.strokeStyle = '#9a5a33'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(180, -50); ctx.quadraticCurveTo(360, -150, 560, -80); ctx.stroke();
  ctx.lineWidth = 3; for (let i = 0; i < 16; i++) { const t = i / 15, bx = 180 + t * 380, by = -50 - Math.sin(t * Math.PI) * 60 - t * 30; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 30); ctx.stroke(); }
  ctx.restore();
  ctx.globalAlpha = 0.25; ctx.save(); ctx.translate(x, y + 90); ctx.scale(1, -0.35); ctx.fillStyle = '#8b5a2b'; for (const px of [-120, -50, 50, 120]) ctx.fillRect(px - 6, -170, 12, 170); ctx.restore(); ctx.globalAlpha = 1;
}

function pyramid(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  for (let i = 0; i < 8; i++) {
    const w = 640 - i * 70, h = 60;
    ctx.fillStyle = i % 2 ? '#8f9a7a' : '#7f8a6a';
    ctx.fillRect(-w / 2, -h * (i + 1), w, h);
    ctx.fillStyle = 'rgba(40,50,30,0.25)'; ctx.fillRect(-w / 2, -h * (i + 1), w, 6);
    for (let k = -w / 2 + 20; k < w / 2; k += 40) { ctx.fillStyle = 'rgba(60,110,50,0.4)'; ctx.beginPath(); ctx.arc(k, -h * i - 4, 10 + (k % 3) * 3, 0, 7); ctx.fill(); }
  }
  ctx.fillStyle = '#6b7656'; ctx.fillRect(-60, -560, 120, 80);
  ctx.fillStyle = '#2c3324'; ctx.fillRect(-24, -540, 48, 60);
  ctx.fillStyle = '#7f8a6a'; ctx.fillRect(-40, -480, 80, 480);
  ctx.fillStyle = 'rgba(40,50,30,0.3)'; for (let k = 0; k < 480; k += 20) ctx.fillRect(-40, -480 + k, 80, 3);
  ctx.restore();
}
