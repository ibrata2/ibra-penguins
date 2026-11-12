// Vector art: penguins, gadgets, coins, entry/exit, hazards, decor. All drawn in code so it
// stays sharp at any resolution. Each draw function draws with its anchor at (0,0) = feet/ground.
import { GADGETS } from '../engine/gadgets.js';

const TAU = Math.PI * 2;

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lg(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function radg(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

// ---------------- PENGUIN ----------------
// p: {dir, anim, state, spin, vx, vy}; hat: cosmetic id
export function drawPenguin(ctx, p, hat, scale = 1, friend = false) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale * p.dir, scale);
  const t = p.anim || 0;
  const walking = p.state === 'walk';
  const air = p.state === 'air';
  let tilt = 0, bob = 0;
  if (walking) { tilt = Math.sin(t * 0.32) * 0.13; bob = Math.abs(Math.sin(t * 0.32)) * 2.2; }
  if (air && p.spin) tilt = t * 0.25;
  else if (air) tilt = Math.max(-0.5, Math.min(0.5, (p.vy || 0) * 0.04));
  ctx.translate(0, -bob);
  // shadow-ish feet
  const step = walking ? Math.sin(t * 0.32) * 5 : 0;
  ctx.fillStyle = '#f39a1e';
  ctx.strokeStyle = '#a85a06'; ctx.lineWidth = 1.2;
  for (const [fx, off] of [[-6, step], [6, -step]]) {
    ctx.beginPath(); ctx.ellipse(fx + 3 + off * 0.4, -2 + (air ? -4 : 0), 8, 3.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  }
  ctx.translate(0, -24);
  ctx.rotate(tilt);
  // body
  ctx.fillStyle = lg(ctx, -14, -26, 14, 22, [[0, '#3b4560'], [0.5, '#1b2133'], [1, '#0d111c']]);
  ctx.beginPath(); ctx.ellipse(0, 0, 15, 23, 0, 0, TAU); ctx.fill();
  // belly
  ctx.fillStyle = lg(ctx, 0, -14, 6, 22, [[0, '#ffffff'], [1, '#d9e4f2']]);
  ctx.beginPath(); ctx.ellipse(4, 4, 10, 17, 0.05, 0, TAU); ctx.fill();
  // flipper
  const fl = air ? -1.1 + Math.sin(t * 0.8) * 0.4 : (walking ? Math.sin(t * 0.32) * 0.35 : 0.1);
  ctx.save(); ctx.translate(-9, -4); ctx.rotate(fl);
  ctx.fillStyle = '#141a29';
  ctx.beginPath(); ctx.ellipse(-2, 10, 4.5, 12, 0.25, 0, TAU); ctx.fill();
  ctx.restore();
  // head
  ctx.fillStyle = lg(ctx, -10, -40, 12, -10, [[0, '#46516f'], [1, '#141a29']]);
  ctx.beginPath(); ctx.arc(2, -17, 12.5, 0, TAU); ctx.fill();
  // face patch
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(7, -16, 6.5, 7, 0, 0, TAU); ctx.fill();
  // eye
  const blink = (Math.floor(t / 7) % 23) === 0;
  ctx.fillStyle = '#10131c';
  if (blink) { ctx.fillRect(6, -19, 6, 1.6); } else {
    ctx.beginPath(); ctx.arc(9, -18.5, 3.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(10, -19.6, 1.1, 0, TAU); ctx.fill();
  }
  // cheek
  ctx.fillStyle = 'rgba(255,120,140,0.35)';
  ctx.beginPath(); ctx.ellipse(6, -11.5, 3, 1.8, 0, 0, TAU); ctx.fill();
  // beak
  ctx.fillStyle = lg(ctx, 12, -18, 22, -12, [[0, '#ffb53a'], [1, '#e4780b']]);
  ctx.beginPath(); ctx.moveTo(12, -17); ctx.quadraticCurveTo(24, -15, 23, -12.5); ctx.quadraticCurveTo(17, -11, 12, -12.5); ctx.closePath(); ctx.fill();
  if (friend) drawHat(ctx, 'scarf', t);
  if (hat && hat !== 'none') drawHat(ctx, hat, t);
  ctx.restore();
}

export const HATS = {
  none: { price: 0, ar: 'بدون', en: 'None' },
  scarf: { price: 30, ar: 'وشاح أحمر', en: 'Red Scarf' },
  cap: { price: 40, ar: 'كاب', en: 'Cap' },
  shades: { price: 60, ar: 'نظارة شمسية', en: 'Sunglasses' },
  flower: { price: 60, ar: 'إكليل ورد', en: 'Flower Crown' },
  santa: { price: 80, ar: 'قبعة شتوية', en: 'Winter Hat' },
  tarboush: { price: 100, ar: 'طربوش', en: 'Tarboush' },
  pirate: { price: 120, ar: 'قبعة قرصان', en: 'Pirate Hat' },
  crown: { price: 200, ar: 'تاج ذهبي', en: 'Golden Crown' },
};

export function drawHat(ctx, hat, t = 0) {
  ctx.save();
  switch (hat) {
    case 'scarf':
      ctx.fillStyle = '#d42a3a';
      rr(ctx, -12, -8, 26, 7, 3); ctx.fill();
      ctx.save(); ctx.translate(-8, -4); ctx.rotate(0.4 + Math.sin(t * 0.2) * 0.15);
      ctx.fillStyle = '#b81f2e'; rr(ctx, -3, 0, 7, 16, 2); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fff'; ctx.fillRect(-10, -6, 22, 1.4);
      break;
    case 'cap':
      ctx.fillStyle = '#1f6fd6';
      ctx.beginPath(); ctx.arc(2, -24, 11, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#1755a6'; rr(ctx, 6, -26, 16, 4, 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, -35, 2, 0, TAU); ctx.fill();
      break;
    case 'shades':
      ctx.fillStyle = '#0a0a0a';
      rr(ctx, 3, -22, 9, 6, 2); ctx.fill(); rr(ctx, 12.5, -22, 7, 6, 2); ctx.fill();
      ctx.fillStyle = 'rgba(120,200,255,0.6)'; ctx.fillRect(4, -21, 3, 1.5);
      break;
    case 'flower':
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + (i / 5) * Math.PI;
        const x = 2 + Math.cos(a) * 12, y = -18 + Math.sin(a) * 12;
        ctx.fillStyle = ['#ff6fa8', '#ffd23f', '#ff8c42', '#c77dff', '#ff6fa8', '#7bdff2'][i];
        ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6'; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, TAU); ctx.fill();
      }
      break;
    case 'santa':
      ctx.fillStyle = '#d6283a';
      ctx.beginPath(); ctx.moveTo(-10, -25); ctx.quadraticCurveTo(0, -48, 16, -40 + Math.sin(t * 0.2) * 2); ctx.lineTo(14, -26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; rr(ctx, -12, -28, 27, 6, 3); ctx.fill();
      ctx.beginPath(); ctx.arc(17, -40 + Math.sin(t * 0.2) * 2, 3.5, 0, TAU); ctx.fill();
      break;
    case 'tarboush':
      ctx.fillStyle = lg(ctx, -8, -40, 12, -26, [[0, '#c4142b'], [1, '#7d0b1a']]);
      ctx.beginPath(); ctx.moveTo(-8, -26); ctx.lineTo(-5, -42); ctx.lineTo(9, -42); ctx.lineTo(12, -26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(2, -42); ctx.quadraticCurveTo(-8, -40, -11, -30 + Math.sin(t * 0.25) * 2); ctx.stroke();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-11, -29 + Math.sin(t * 0.25) * 2, 2.4, 0, TAU); ctx.fill();
      break;
    case 'pirate':
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.moveTo(-16, -26); ctx.quadraticCurveTo(2, -48, 20, -26); ctx.quadraticCurveTo(2, -32, -16, -26); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(2, -33, 2.6, 0, TAU); ctx.fill();
      break;
    case 'crown':
      ctx.fillStyle = lg(ctx, 0, -42, 0, -26, [[0, '#ffe680'], [1, '#d4a017']]);
      ctx.beginPath(); ctx.moveTo(-9, -26); ctx.lineTo(-10, -39); ctx.lineTo(-4, -32); ctx.lineTo(2, -42); ctx.lineTo(8, -32); ctx.lineTo(14, -39); ctx.lineTo(13, -26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0245e'; ctx.beginPath(); ctx.arc(2, -30, 2.2, 0, TAU); ctx.fill();
      break;
  }
  ctx.restore();
}

// ---------------- GADGETS ----------------
export function drawGadget(ctx, g, t, opts = {}) {
  ctx.save();
  ctx.translate(g.x, g.y);
  if (opts.ghost) ctx.globalAlpha = 0.6;
  const def = GADGETS[g.type];
  switch (g.type) {
    case 'cannon': {
      const a = def.angles[g.rot] * Math.PI / 180;
      const pw = g.power ?? def.defaultPower;
      // barrel
      ctx.save(); ctx.translate(0, -30); ctx.rotate(-a);
      const recoil = g.fire > 0 ? -g.fire * 0.8 : 0;
      ctx.translate(recoil, 0);
      ctx.fillStyle = lg(ctx, 0, -14, 0, 14, [[0, '#9aa7b8'], [0.45, '#4a5568'], [1, '#1e2532']]);
      rr(ctx, -12, -13, 66, 26, 9); ctx.fill();
      ctx.fillStyle = lg(ctx, 0, -16, 0, 16, [[0, '#ffd66b'], [1, '#b7791f']]);
      rr(ctx, 50, -16, 12, 32, 4); ctx.fill();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i <= pw ? ['#4ade80', '#facc15', '#fb923c', '#ef4444'][i] : 'rgba(0,0,0,0.35)';
        rr(ctx, 6 + i * 10, -13, 6, 26, 2); ctx.fill();
      }
      if (g.fire > 6) {
        ctx.fillStyle = radg(ctx, 74, 0, 2, 30, [[0, '#fff7c2'], [0.4, '#ffb020'], [1, 'rgba(255,90,0,0)']]);
        ctx.beginPath(); ctx.arc(74, 0, 30, 0, TAU); ctx.fill();
      }
      ctx.restore();
      // base / wheel
      ctx.fillStyle = lg(ctx, -30, -40, 30, 0, [[0, '#a0622d'], [1, '#5c3412']]);
      rr(ctx, -30, -24, 60, 24, 6); ctx.fill();
      ctx.strokeStyle = '#3d2109'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#2d3240'; ctx.beginPath(); ctx.arc(0, -30, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd66b'; ctx.beginPath(); ctx.arc(0, -30, 5, 0, TAU); ctx.fill();
      for (const wx of [-20, 20]) {
        ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.arc(wx, -8, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#c89b5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wx, -8, 6, 0, TAU); ctx.stroke();
      }
      break;
    }
    case 'spring': {
      const c = g.fire > 0 ? Math.sin((14 - g.fire) / 14 * Math.PI) * 10 : 0;
      ctx.fillStyle = '#4b5563'; rr(ctx, -30, -8, 60, 8, 3); ctx.fill();
      ctx.strokeStyle = lg(ctx, -20, 0, 20, 0, [[0, '#9ca3af'], [0.5, '#f3f4f6'], [1, '#6b7280']]);
      ctx.lineWidth = 4;
      ctx.beginPath();
      const top = -26 - c;
      for (let i = 0; i <= 8; i++) { const y = -8 + (top + 8) * (i / 8); ctx.lineTo(i % 2 ? 16 : -16, y); }
      ctx.stroke();
      ctx.fillStyle = lg(ctx, 0, top - 8, 0, top + 2, [[0, '#ff5a6e'], [1, '#c81e3a']]);
      rr(ctx, -30, top - 9, 60, 11, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; rr(ctx, -24, top - 7, 30, 3, 2); ctx.fill();
      break;
    }
    case 'bridge': {
      const a = def.angles[g.rot] * Math.PI / 180;
      ctx.rotate(a);
      const L = def.len, T = def.thick;
      ctx.fillStyle = lg(ctx, 0, -T / 2, 0, T / 2, [[0, '#d9a066'], [0.5, '#a86b32'], [1, '#6e4219']]);
      rr(ctx, -L / 2, -T / 2, L, T, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(60,30,8,0.55)'; ctx.lineWidth = 1.5;
      for (let x = -L / 2 + 30; x < L / 2; x += 32) { ctx.beginPath(); ctx.moveTo(x, -T / 2 + 1); ctx.lineTo(x, T / 2 - 1); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-L / 2 + 4, -1); ctx.bezierCurveTo(-30, 2, 30, -3, L / 2 - 4, 1); ctx.stroke();
      ctx.fillStyle = '#e5e7eb';
      for (let x = -L / 2 + 14; x < L / 2; x += 32) { ctx.beginPath(); ctx.arc(x, -3, 1.8, 0, TAU); ctx.arc(x, 3, 1.8, 0, TAU); ctx.fill(); }
      break;
    }
    case 'fan': {
      // air column
      if (!opts.ghost) {
        const H = def.height;
        ctx.fillStyle = lg(ctx, 0, 0, 0, -H, [[0, 'rgba(190,240,255,0.32)'], [1, 'rgba(190,240,255,0)']]);
        ctx.fillRect(-42, -H, 84, H - 20);
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const ph = ((t * 3 + i * 55) % H);
          const x = -30 + i * 12;
          ctx.globalAlpha = (opts.ghost ? 0.6 : 1) * (1 - ph / H);
          ctx.beginPath(); ctx.moveTo(x, -24 - ph); ctx.quadraticCurveTo(x + 6, -34 - ph, x, -44 - ph); ctx.stroke();
        }
        ctx.globalAlpha = opts.ghost ? 0.6 : 1;
      }
      ctx.fillStyle = lg(ctx, 0, -26, 0, 0, [[0, '#64748b'], [1, '#1e293b']]);
      rr(ctx, -38, -24, 76, 24, 6); ctx.fill();
      ctx.save(); ctx.translate(0, -26); ctx.scale(1, 0.32);
      ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill();
      ctx.rotate(t * 0.5);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(TAU / 4);
        ctx.fillStyle = '#cbd5e1'; ctx.beginPath(); ctx.ellipse(16, 0, 15, 6, 0.3, 0, TAU); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#38bdf8'; rr(ctx, -30, -12, 10, 5, 2); ctx.fill();
      break;
    }
    case 'turner': {
      const d = g.rot === 0 ? 1 : -1;
      ctx.fillStyle = '#7c4a1c'; ctx.fillRect(-3, -64, 6, 64);
      ctx.save(); ctx.translate(0, -52); ctx.scale(d, 1);
      ctx.fillStyle = lg(ctx, 0, -14, 0, 14, [[0, '#fde047'], [1, '#eab308']]);
      ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(14, -12); ctx.lineTo(28, 0); ctx.lineTo(14, 12); ctx.lineTo(-26, 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(6, -4); ctx.lineTo(6, -8); ctx.lineTo(16, 0); ctx.lineTo(6, 8); ctx.lineTo(6, 4); ctx.lineTo(-14, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

// gadget icon for the tray (centered in a box of size s)
export function drawGadgetIcon(ctx, type, s, t = 0) {
  const def = GADGETS[type];
  const g = { type, x: 0, y: 0, rot: def.defaultRot, power: def.defaultPower, fire: 0 };
  ctx.save();
  ctx.translate(s / 2, s * 0.78);
  const k = { cannon: 0.95, spring: 1.05, bridge: 0.42, fan: 0.85, turner: 0.85 }[type] || 1;
  ctx.scale(k * s / 90, k * s / 90);
  if (type === 'bridge') { g.rot = 1; ctx.translate(0, -40); }
  if (type === 'fan') { ctx.translate(0, 6); }
  drawGadget(ctx, g, t, { ghost: false, icon: true });
  ctx.restore();
}

// ---------------- COIN ----------------
export function drawCoin(ctx, x, y, t) {
  const sx = Math.cos(t * 0.06);
  ctx.save(); ctx.translate(x, y + Math.sin(t * 0.05) * 3);
  ctx.fillStyle = radg(ctx, 0, 0, 2, 28, [[0, 'rgba(255,230,120,0.5)'], [1, 'rgba(255,230,120,0)']]);
  ctx.beginPath(); ctx.arc(0, 0, 28, 0, TAU); ctx.fill();
  ctx.scale(Math.max(0.12, Math.abs(sx)), 1);
  ctx.fillStyle = sx > 0 ? '#b7791f' : '#8a5a12';
  ctx.beginPath(); ctx.arc(1.5, 0, 15, 0, TAU); ctx.fill();
  ctx.fillStyle = lg(ctx, -12, -12, 12, 12, [[0, '#fff3b0'], [0.4, '#ffd23f'], [1, '#d99a12']]);
  ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#b7791f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.stroke();
  if (sx > 0) { ctx.fillStyle = '#a86b0c'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('IB', 0, 1); }
  ctx.restore();
}

// ---------------- ENTRY / EXIT ----------------
export function drawEntry(ctx, e, theme, t) {
  ctx.save(); ctx.translate(e.x, e.y - 40);
  const pal = THEME_PAL[theme];
  // pipe from above
  ctx.fillStyle = lg(ctx, -34, 0, 34, 0, [[0, pal.pipeD], [0.4, pal.pipeL], [1, pal.pipeD]]);
  rr(ctx, -30, -400, 60, 380, 6); ctx.fill();
  ctx.fillStyle = lg(ctx, -40, 0, 40, 0, [[0, pal.pipeD], [0.4, pal.pipeL], [1, pal.pipeD]]);
  rr(ctx, -40, -30, 80, 26, 8); ctx.fill();
  ctx.fillStyle = '#05070c'; ctx.beginPath(); ctx.ellipse(0, -4, 30, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; rr(ctx, -34, -26, 18, 5, 2); ctx.fill();
  ctx.restore();
}

export function drawExit(ctx, ex, theme, t, glow = 0) {
  ctx.save(); ctx.translate(ex.x, ex.y);
  const pulse = 0.5 + Math.sin(t * 0.08) * 0.5;
  ctx.fillStyle = radg(ctx, 0, -30, 5, 90, [[0, `rgba(255,255,180,${0.35 + glow * 0.4})`], [1, 'rgba(255,255,180,0)']]);
  ctx.beginPath(); ctx.arc(0, -30, 90, 0, TAU); ctx.fill();
  if (theme === 'ice') {
    // igloo
    ctx.fillStyle = lg(ctx, 0, -70, 0, 0, [[0, '#ffffff'], [1, '#bfe3f2']]);
    ctx.beginPath(); ctx.ellipse(0, 0, 62, 62, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(110,170,200,0.6)'; ctx.lineWidth = 1.5;
    for (let r = 20; r < 62; r += 14) { ctx.beginPath(); ctx.ellipse(0, 0, 62, r, 0, Math.PI, 0); ctx.stroke(); }
    for (let a = 0.2; a < Math.PI; a += 0.32) { ctx.beginPath(); ctx.moveTo(Math.cos(a) * -62, -Math.sin(a) * 50); ctx.lineTo(Math.cos(a) * -62, -Math.sin(a) * 62); ctx.stroke(); }
    ctx.fillStyle = lg(ctx, 0, -40, 0, 0, [[0, '#ffffff'], [1, '#cde9f5']]);
    rr(ctx, -26, -44, 52, 44, 22); ctx.fill();
  } else if (theme === 'jungle') {
    ctx.fillStyle = lg(ctx, 0, -110, 0, 0, [[0, '#8d8a5a'], [1, '#55532e']]);
    ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-50, -90); ctx.lineTo(0, -116); ctx.lineTo(50, -90); ctx.lineTo(60, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(30,30,10,0.4)'; ctx.lineWidth = 2;
    for (let y = -20; y > -100; y -= 18) { ctx.beginPath(); ctx.moveTo(-58, y); ctx.lineTo(58, y); ctx.stroke(); }
  } else if (theme === 'desert') {
    ctx.fillStyle = lg(ctx, -60, 0, 60, 0, [[0, '#c2410c'], [0.5, '#fb923c'], [1, '#c2410c']]);
    ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(0, -100); ctx.lineTo(70, 0); ctx.fill();
    ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.moveTo(-70, 0); ctx.lineTo(0, -100); ctx.lineTo(-40, 0); ctx.fill();
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(0, -128); ctx.stroke();
  } else {
    ctx.fillStyle = lg(ctx, 0, -110, 0, 0, [[0, '#4c1d95'], [1, '#1e1b4b']]);
    rr(ctx, -56, -110, 112, 110, 50); ctx.fill();
    ctx.strokeStyle = `rgba(167,139,250,${0.5 + pulse * 0.5})`; ctx.lineWidth = 4; ctx.stroke();
  }
  // doorway
  ctx.fillStyle = radg(ctx, 0, -20, 4, 40, [[0, `rgba(255,240,170,${0.85 + pulse * 0.15})`], [0.6, '#f59e0b'], [1, '#3b2006']]);
  rr(ctx, -22, -46, 44, 46, 20); ctx.fill();
  // sign
  ctx.translate(theme === 'ice' ? -70 : -82, -64);
  ctx.fillStyle = '#7c4a1c'; ctx.fillRect(-3, 0, 6, 64);
  ctx.fillStyle = lg(ctx, 0, -20, 0, 6, [[0, '#ffd23f'], [1, '#e8a710']]);
  rr(ctx, -34, -22, 68, 28, 5); ctx.fill();
  ctx.strokeStyle = '#7c4a1c'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#5a2d0c'; ctx.font = 'bold 17px "Cairo", Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', 0, -8);
  ctx.restore();
}

// ---------------- HAZARDS ----------------
export function drawHazard(ctx, h, theme, t) {
  ctx.save();
  const col = { ice: ['#e0f7ff', '#5fb4d6'], jungle: ['#a3b18a', '#3a4a22'], desert: ['#fef3c7', '#a16207'], cave: ['#e9d5ff', '#7c3aed'], night: ['#f1f5f9', '#475569'] }[theme] || ['#ddd', '#555'];
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(h.x, h.y + h.h - 6, h.w, 6);
  const n = Math.max(2, Math.round(h.w / 18));
  const sw = h.w / n;
  for (let i = 0; i < n; i++) {
    const x = h.x + i * sw, tall = h.h * (0.75 + ((i * 37) % 10) / 40);
    ctx.fillStyle = lg(ctx, x, h.y + h.h - tall, x + sw, h.y + h.h, [[0, col[0]], [1, col[1]]]);
    ctx.beginPath(); ctx.moveTo(x, h.y + h.h); ctx.lineTo(x + sw / 2, h.y + h.h - tall); ctx.lineTo(x + sw, h.y + h.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.moveTo(x + sw * 0.5, h.y + h.h - tall); ctx.lineTo(x + sw * 0.3, h.y + h.h); ctx.lineTo(x + sw * 0.45, h.y + h.h); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// ---------------- DECOR ----------------
export function drawDecor(ctx, d, theme, t) {
  ctx.save(); ctx.translate(d.x, d.y); const s = d.s || 1; ctx.scale(s, s);
  switch (d.t) {
    case 'pine':
      ctx.fillStyle = '#5b3a1a'; ctx.fillRect(-7, -30, 14, 30);
      for (let i = 0; i < 4; i++) {
        const y = -30 - i * 34, w = 64 - i * 12;
        ctx.fillStyle = lg(ctx, -w, y - 50, w, y, [[0, '#2f855a'], [1, '#14532d']]);
        ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(0, y - 62); ctx.lineTo(w, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f8fdff';
        ctx.beginPath(); ctx.moveTo(-w * 0.6, y - 18); ctx.lineTo(0, y - 62); ctx.lineTo(w * 0.6, y - 18); ctx.quadraticCurveTo(0, y - 30, -w * 0.6, y - 18); ctx.fill();
      }
      break;
    case 'iceRock':
      ctx.fillStyle = lg(ctx, -40, -120, 40, 0, [[0, '#ffffff'], [0.5, '#a8dcef'], [1, '#4f9ec2']]);
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-40, -70); ctx.lineTo(-12, -128); ctx.lineTo(8, -90); ctx.lineTo(30, -110); ctx.lineTo(56, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(-12, -128); ctx.lineTo(-20, -40); ctx.lineTo(-40, -70); ctx.closePath(); ctx.fill();
      break;
    case 'sign':
      ctx.fillStyle = '#6b4220'; ctx.fillRect(-4, -70, 8, 70);
      ctx.fillStyle = lg(ctx, 0, -110, 0, -60, [[0, '#e0f2fe'], [1, '#93c5fd']]);
      rr(ctx, -56, -116, 112, 56, 8); ctx.fill(); ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(0, -88); ctx.scale(0.7, 0.7);
      drawPenguin(ctx, { x: 0, y: 26, dir: 1, anim: 0, state: 'idle' }, 'none'); ctx.restore();
      break;
    case 'palm': {
      ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-20, -110, 10, -210); ctx.stroke();
      ctx.strokeStyle = 'rgba(40,20,5,0.4)'; ctx.lineWidth = 2;
      for (let y = -20; y > -200; y -= 16) { ctx.beginPath(); ctx.moveTo(-8 + y * 0.03, y); ctx.lineTo(8 + y * 0.03, y - 4); ctx.stroke(); }
      const sway = Math.sin(t * 0.02) * 0.05;
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + (i - 3) * 0.5 + sway;
        ctx.save(); ctx.translate(10, -210); ctx.rotate(a);
        ctx.fillStyle = i % 2 ? '#2f7a32' : '#3f9a3c';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(60, -24, 110, 18); ctx.quadraticCurveTo(60, 0, 0, 0); ctx.fill();
        ctx.restore();
      }
      break;
    }
    case 'bush':
      for (const [x, y, r, c] of [[-40, -24, 30, '#2f6e2a'], [0, -36, 40, '#3b8a34'], [42, -22, 28, '#2a6326'], [10, -20, 26, '#4ba843']]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#e84a5f'; for (const [x, y] of [[-20, -40], [16, -52], [34, -28]]) { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.fill(); }
      break;
    case 'statue':
      ctx.fillStyle = lg(ctx, -40, -140, 40, 0, [[0, '#9aa08a'], [1, '#5a5f4c']]);
      rr(ctx, -44, -40, 88, 40, 4); ctx.fill();
      rr(ctx, -34, -130, 68, 92, 10); ctx.fill();
      ctx.fillStyle = '#3d4130';
      rr(ctx, -22, -112, 14, 12, 3); ctx.fill(); rr(ctx, 8, -112, 14, 12, 3); ctx.fill();
      rr(ctx, -16, -84, 32, 8, 3); ctx.fill();
      ctx.fillStyle = '#7fb069'; ctx.beginPath(); ctx.ellipse(-30, -130, 20, 8, 0.2, 0, TAU); ctx.fill();
      break;
    case 'vine':
      ctx.strokeStyle = '#2f6e2a'; ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * 60, 0);
        for (let y = 0; y < 260 + i * 40; y += 20) ctx.lineTo(i * 60 + Math.sin(y * 0.05 + t * 0.03 + i) * 10, y);
        ctx.stroke();
        for (let y = 30; y < 240 + i * 40; y += 40) { ctx.fillStyle = '#4ba843'; ctx.beginPath(); ctx.ellipse(i * 60 + 8, y, 10, 5, 0.6, 0, TAU); ctx.fill(); }
      }
      break;
    case 'cactus':
      ctx.fillStyle = lg(ctx, -16, 0, 16, 0, [[0, '#2f7a32'], [0.5, '#56b04e'], [1, '#2f7a32']]);
      rr(ctx, -15, -130, 30, 130, 15); ctx.fill();
      rr(ctx, -50, -90, 22, 50, 11); ctx.fill(); rr(ctx, -50, -52, 40, 18, 9); ctx.fill();
      rr(ctx, 28, -110, 22, 50, 11); ctx.fill(); rr(ctx, 10, -72, 40, 18, 9); ctx.fill();
      ctx.fillStyle = '#ff6fa8'; ctx.beginPath(); ctx.arc(0, -132, 6, 0, TAU); ctx.fill();
      break;
    case 'acacia':
      ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -90); ctx.lineTo(-40, -150); ctx.moveTo(0, -90); ctx.lineTo(50, -140); ctx.stroke();
      ctx.fillStyle = '#5f7a2a'; ctx.beginPath(); ctx.ellipse(0, -160, 120, 26, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7b9a37'; ctx.beginPath(); ctx.ellipse(10, -168, 100, 16, 0, 0, TAU); ctx.fill();
      break;
    case 'rockPile':
      for (const [x, y, rx, ry, c] of [[-30, -18, 40, 22, '#8b6b4a'], [26, -16, 34, 18, '#a1805c'], [0, -40, 30, 18, '#b89470']]) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      }
      break;
    case 'crystal':
      for (const [x, h, w, a] of [[-20, 70, 18, -0.25], [0, 110, 24, 0], [24, 80, 18, 0.3], [40, 46, 12, 0.5]]) {
        ctx.save(); ctx.translate(x, 0); ctx.rotate(a);
        ctx.fillStyle = lg(ctx, -w, -h, w, 0, [[0, '#f5d0fe'], [0.5, '#a855f7'], [1, '#4c1d95']]);
        ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.75); ctx.lineTo(0, -h); ctx.lineTo(w / 2, -h * 0.75); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-w / 2 + 2, -h * 0.72, 3, h * 0.6);
        ctx.restore();
      }
      ctx.fillStyle = radg(ctx, 0, -50, 5, 120, [[0, `rgba(192,132,252,${0.25 + Math.sin(t * 0.04) * 0.1})`], [1, 'rgba(192,132,252,0)']]);
      ctx.beginPath(); ctx.arc(0, -50, 120, 0, TAU); ctx.fill();
      break;
    case 'stalag':
      for (const [x, h, w] of [[-60, 90, 26], [-20, 150, 34], [30, 110, 28], [70, 70, 20]]) {
        ctx.fillStyle = lg(ctx, x - w, 0, x + w, 0, [[0, '#3b3355'], [0.5, '#6b5f8f'], [1, '#2a2440']]);
        ctx.beginPath(); ctx.moveTo(x - w / 2, 0); ctx.lineTo(x, h); ctx.lineTo(x + w / 2, 0); ctx.closePath(); ctx.fill();
      }
      break;
    case 'lamp': {
      ctx.fillStyle = '#1e293b'; ctx.fillRect(-4, -150, 8, 150); rr(ctx, -14, -8, 28, 8, 3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-4, -150); ctx.quadraticCurveTo(10, -170, 30, -160); ctx.lineWidth = 6; ctx.strokeStyle = '#1e293b'; ctx.stroke();
      const fl = 0.85 + Math.sin(t * 0.2) * 0.05;
      ctx.fillStyle = radg(ctx, 30, -150, 4, 110, [[0, `rgba(255,230,150,${0.55 * fl})`], [1, 'rgba(255,230,150,0)']]);
      ctx.beginPath(); ctx.arc(30, -150, 110, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff7cc'; ctx.beginPath(); ctx.moveTo(20, -160); ctx.lineTo(40, -160); ctx.lineTo(36, -144); ctx.lineTo(24, -144); ctx.closePath(); ctx.fill();
      break;
    }
    case 'banner':
      ctx.fillStyle = '#7c4a1c'; ctx.fillRect(-3, -150, 6, 150);
      ctx.fillStyle = '#d42a3a';
      ctx.beginPath(); ctx.moveTo(3, -150); ctx.quadraticCurveTo(50, -140 + Math.sin(t * 0.1) * 6, 90, -146); ctx.lineTo(90, -106); ctx.quadraticCurveTo(50, -100 + Math.sin(t * 0.1) * 6, 3, -110); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Cairo", Arial'; ctx.textAlign = 'center'; ctx.fillText('♥', 46, -122);
      break;
  }
  ctx.restore();
}

export const THEME_PAL = {
  ice: { pipeL: '#e6f6ff', pipeD: '#5b9fc2' },
  jungle: { pipeL: '#c9b27a', pipeD: '#6b5a2e' },
  desert: { pipeL: '#ffd59a', pipeD: '#a0582a' },
  cave: { pipeL: '#b9a7e8', pipeD: '#3d2f6b' },
  night: { pipeL: '#c7d2fe', pipeD: '#312e81' },
};
