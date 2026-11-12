// Frame renderer for a running World.
import { W, H } from '../engine/terrain.js';
import { GADGETS } from '../engine/gadgets.js';
import { buildBackground, buildTerrainLayer } from './scenery.js';
import { drawPenguin, drawGadget, drawCoin, drawEntry, drawExit, drawHazard, drawDecor, rr } from './art.js';

const bgCache = {};

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.popups = [];
    this.t = 0;
    this.shake = 0;
  }

  load(world) {
    const theme = world.level.theme || 'ice';
    this.theme = theme;
    this.bg = bgCache[theme] || (bgCache[theme] = buildBackground(theme));
    this.terrain = buildTerrainLayer(world.terrain, theme);
    this.particles = []; this.popups = [];
    this.ambient = Array.from({ length: theme === 'cave' || theme === 'night' ? 34 : 70 }, () => this.newAmbient(true));
  }

  rebuildTerrain(world) { this.terrain = buildTerrainLayer(world.terrain, this.theme); }

  newAmbient(init) {
    const th = this.theme;
    const a = { x: Math.random() * W, y: init ? Math.random() * H : -10, s: 0.5 + Math.random() * 1.5, ph: Math.random() * 6 };
    if (th === 'desert') { a.y = Math.random() * H; a.x = init ? a.x : -10; }
    return a;
  }

  // world events → particles & popups
  consume(world, audio) {
    for (const e of world.events) {
      audio?.sfx(e.type, e);
      if (e.type === 'coin') { this.burst(e.x, e.y, 14, ['#ffd23f', '#fff3b0'], 4); this.popups.push({ x: e.x, y: e.y, txt: '+10', t: 0, c: '#ffd23f' }); }
      else if (e.type === 'saved') { this.burst(e.x, e.y, 10, ['#ffffff', '#a7f3d0', '#fde68a'], 3); }
      else if (e.type === 'dead') { this.burst(e.x, e.y - 20, 18, ['#1b2133', '#ffffff', '#f39a1e'], 5); this.popups.push({ x: e.x, y: e.y - 50, txt: '!', t: 0, c: '#ff4d4d', big: true }); this.shake = 6; }
      else if (e.type === 'cannon') { this.burst(e.x, e.y, 16, ['#ffffff', '#cbd5e1', '#fbbf24'], 6); this.shake = 4; }
      else if (e.type === 'spring') this.burst(e.x, e.y - 20, 8, ['#ff5a6e', '#ffffff'], 3);
      else if (e.type === 'place') this.burst(e.x, e.y, 10, ['#86efac', '#ffffff'], 3);
      else if (e.type === 'land' && e.hard) this.burst(e.x, e.y, 6, [this.theme === 'desert' ? '#f3cd8b' : '#ffffff'], 2);
    }
    world.events.length = 0;
  }

  burst(x, y, n, colors, sp) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = Math.random() * sp + 1;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 40 + Math.random() * 30, c: colors[i % colors.length], r: 2 + Math.random() * 3 });
    }
  }

  draw(world, ui = {}) {
    const ctx = this.ctx;
    this.t++;
    const t = this.t;
    ctx.save();
    if (this.shake > 0) { ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake); this.shake *= 0.85; if (this.shake < 0.3) this.shake = 0; }
    ctx.drawImage(this.bg, 0, 0);
    this.drawAmbientBack(ctx, t);
    const L = world.level;
    for (const d of L.decor || []) if (!d.front) drawDecor(ctx, d, this.theme, t);
    drawEntry(ctx, L.entry, this.theme, t);
    ctx.drawImage(this.terrain, 0, 0);
    for (const h of world.hazards) drawHazard(ctx, h, this.theme, t);
    for (const m of world.movers) { ctx.fillStyle = '#8b5a2b'; rr(ctx, m.x - m.w / 2, m.y, m.w, 14, 5); ctx.fill(); }
    drawExit(ctx, L.exit, this.theme, t, Math.min(1, (world.saved || 0) / Math.max(1, world.need)));
    if (L.friend && !ui.editor) {
      const happy = world.finished && world.success;
      drawPenguin(ctx, { x: L.friend.x, y: L.friend.y - (happy ? Math.abs(Math.sin(t * 0.15)) * 20 : 0), dir: -1, anim: t, state: happy ? 'air' : 'idle', vy: 0 }, 'none', 1.25, true);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Cairo, Arial'; ctx.textAlign = 'center';
      ctx.fillText(ui.friendName || 'ثلجي', L.friend.x, L.friend.y - 82);
    }
    for (const c of world.coins) if (!c.taken) drawCoin(ctx, c.x, c.y, t + c.id * 13);

    // hint ghost
    if (ui.hint) { ctx.save(); ctx.globalAlpha = 0.45 + Math.sin(t * 0.15) * 0.2; drawGadget(ctx, { ...ui.hint, fire: 0 }, t, { ghost: true }); ctx.restore(); this.ring(ctx, ui.hint, '#fde047', t); }

    for (const g of world.placed) {
      drawGadget(ctx, g, t);
      if (ui.selected === g) this.ring(ctx, g, '#4ade80', t);
    }
    // penguins
    for (const p of world.penguins) {
      if (p.state === 'saved') {
        if (p.t < 20) { ctx.save(); ctx.globalAlpha = 1 - p.t / 20; drawPenguin(ctx, { ...p, y: p.y, state: 'walk' }, ui.hat, 1 - p.t / 30); ctx.restore(); }
        continue;
      }
      if (p.state === 'dead') {
        if (p.why === 'splat' && p.t < 90) { ctx.save(); ctx.globalAlpha = 1 - p.t / 90; ctx.translate(p.x, p.y); ctx.scale(1.6, 0.3); drawPenguin(ctx, { x: 0, y: 0, dir: p.dir, anim: 0, state: 'idle' }, ui.hat); ctx.restore(); }
        else if (p.t < 40) { ctx.save(); ctx.globalAlpha = 1 - p.t / 40; drawPenguin(ctx, { ...p, y: p.y - p.t * 1.5, state: 'air', spin: true, anim: p.t * 2 }, ui.hat); ctx.restore(); }
        continue;
      }
      drawPenguin(ctx, p, ui.hat);
    }
    // placement ghost
    if (ui.ghost) {
      const gh = ui.ghost;
      ctx.save();
      if (!gh.ok) { ctx.filter = 'grayscale(1) brightness(0.8)'; }
      drawGadget(ctx, { ...gh, fire: 0 }, t, { ghost: true });
      ctx.restore();
      this.ring(ctx, gh, gh.ok ? '#4ade80' : '#ef4444', t);
    }
    for (const d of L.decor || []) if (d.front) drawDecor(ctx, d, this.theme, t);
    this.drawParticles(ctx);
    this.drawAmbientFront(ctx, t);
    ctx.restore();
  }

  ring(ctx, g, color, t) {
    const def = GADGETS[g.type];
    const cy = def.ground ? g.y - 30 : g.y;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 0.8;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(g.x, cy, g.type === 'bridge' ? 104 : 54, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const u of this.popups) {
      u.t++;
      ctx.globalAlpha = Math.max(0, 1 - u.t / 50);
      ctx.font = `900 ${u.big ? 44 : 28}px Cairo, Arial`; ctx.textAlign = 'center';
      ctx.lineWidth = 5; ctx.strokeStyle = '#1b1b1b'; ctx.strokeText(u.txt, u.x, u.y - u.t * 0.8);
      ctx.fillStyle = u.c; ctx.fillText(u.txt, u.x, u.y - u.t * 0.8);
    }
    ctx.globalAlpha = 1;
    this.popups = this.popups.filter((u) => u.t < 50);
  }

  drawAmbientBack(ctx, t) {
    if (this.theme === 'cave') {
      // bats
      for (let i = 0; i < 4; i++) {
        const x = (t * (1 + i * 0.3) + i * 500) % (W + 200) - 100, y = 150 + i * 70 + Math.sin(t * 0.05 + i) * 30;
        const f = Math.sin(t * 0.4 + i) * 10;
        ctx.fillStyle = '#0c0818';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 14, y - 8 - f, x - 26, y + 2); ctx.quadraticCurveTo(x - 14, y - 2, x, y + 4); ctx.quadraticCurveTo(x + 14, y - 2, x + 26, y + 2); ctx.quadraticCurveTo(x + 14, y - 8 - f, x, y); ctx.fill();
      }
    } else if (this.theme !== 'desert' && this.theme !== 'night') {
      // birds
      for (let i = 0; i < 3; i++) {
        const x = W - ((t * (1.2 + i * 0.4) + i * 700) % (W + 200)), y = 120 + i * 60 + Math.sin(t * 0.03 + i) * 20;
        const f = Math.sin(t * 0.3 + i) * 8;
        ctx.strokeStyle = 'rgba(40,50,60,0.6)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - 12, y - f); ctx.quadraticCurveTo(x - 6, y - 4, x, y); ctx.quadraticCurveTo(x + 6, y - 4, x + 12, y - f); ctx.stroke();
      }
    }
  }

  drawAmbientFront(ctx, t) {
    const th = this.theme;
    for (const a of this.ambient) {
      if (th === 'ice') {
        a.y += a.s * 0.9; a.x += Math.sin(t * 0.02 + a.ph) * 0.5;
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 1.6, 0, 7); ctx.fill();
      } else if (th === 'jungle') {
        a.y += a.s * 0.35; a.x += Math.sin(t * 0.03 + a.ph) * 0.8;
        if (a.s > 1.4) { ctx.fillStyle = `rgba(255,250,150,${0.4 + Math.sin(t * 0.1 + a.ph) * 0.4})`; ctx.beginPath(); ctx.arc(a.x, a.y, 2.5, 0, 7); ctx.fill(); }
        else { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(t * 0.03 + a.ph); ctx.fillStyle = 'rgba(80,150,60,0.8)'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3, 0, 0, 7); ctx.fill(); ctx.restore(); }
      } else if (th === 'desert') {
        a.x += a.s * 1.4; a.y += Math.sin(t * 0.02 + a.ph) * 0.3;
        ctx.fillStyle = 'rgba(255,230,180,0.5)'; ctx.fillRect(a.x, a.y, a.s * 3, 1.5);
      } else if (th === 'night') {
        a.y += Math.sin(t * 0.02 + a.ph) * 0.5 + 0.05; a.x += Math.cos(t * 0.015 + a.ph) * 0.6;
        const g = 0.35 + Math.sin(t * 0.08 + a.ph * 3) * 0.35;
        ctx.fillStyle = `rgba(190,255,140,${g})`; ctx.beginPath(); ctx.arc(a.x, a.y, 2.4, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(190,255,140,${g * 0.25})`; ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, 7); ctx.fill();
        if (a.x < -10) a.x = W + 5;
      } else {
        a.y += a.s * 0.25;
        ctx.fillStyle = `rgba(190,160,255,${0.3 + Math.sin(t * 0.06 + a.ph) * 0.3})`; ctx.beginPath(); ctx.arc(a.x, a.y, a.s * 1.4, 0, 7); ctx.fill();
      }
      if (a.y > H + 10 || a.x > W + 10) Object.assign(a, this.newAmbient(false));
    }
  }

  // tiny map for the HUD parchment
  minimap(mctx, world, w, h) {
    const k = w / W;
    mctx.clearRect(0, 0, w, h);
    mctx.save(); mctx.scale(k, h / H);
    mctx.globalAlpha = 0.55; mctx.drawImage(this.terrain, 0, 0); mctx.globalAlpha = 1;
    mctx.fillStyle = '#16a34a'; mctx.beginPath(); mctx.arc(world.level.exit.x, world.level.exit.y - 20, 34, 0, 7); mctx.fill();
    mctx.fillStyle = '#c0262d';
    for (const p of world.penguins) if (p.state === 'walk' || p.state === 'air') mctx.fillRect(p.x - 14, p.y - 40, 28, 40);
    mctx.restore();
  }
}
