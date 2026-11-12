// World simulation: penguins, gadgets, coins, hazards, entry/exit. No DOM — testable in node.
import { Terrain, W, H } from './terrain.js';
import { GADGETS, G, WALK } from './gadgets.js';

export const TICKS = 60;          // simulation ticks per second
const MAXSTEP = 9;                // climbable step height
const STEPDOWN = 8;               // walk down without falling
const MAXFALL = 430;              // falls longer than this are fatal
const HW = 11;                    // penguin half width

let uid = 1;

export class World {
  constructor(level, opts = {}) {
    this.level = level;
    this.terrain = new Terrain(level.shapes);
    this.penguins = [];
    this.placed = [];
    this.inventory = { ...(level.gadgets || {}) };
    this.coins = (level.coins || []).map((c, i) => ({ ...c, id: i, taken: false }));
    this.hazards = (level.hazards || []).map((h) => ({ ...h }));
    this.movers = (level.movers || []).map((m) => ({ ...m, ox: m.x, oy: m.y, phase: m.phase || 0 }));
    this.tick = 0;
    this.released = 0;
    this.saved = 0;
    this.dead = 0;
    this.coinsTaken = 0;
    this.events = [];
    this.finished = false;
    this.timeLimit = (level.time || 180) * TICKS;
    this.total = level.penguins;
    this.need = level.need;
    this.rate = level.rate || 45;
    this.startDelay = opts.startDelay ?? 60;
    this.headless = !!opts.headless;
  }

  emit(type, x, y, extra) { if (!this.headless) this.events.push({ type, x, y, ...extra }); }

  // ---------- gadgets ----------
  canPlace(type) { return (this.inventory[type] || 0) > 0; }

  place(type, x, y, rot, power) {
    if (!this.canPlace(type)) return null;
    const def = GADGETS[type];
    const g = { id: uid++, type, x: Math.round(x), y: Math.round(y), rot: rot ?? def.defaultRot, power: power ?? def.defaultPower, fire: 0 };
    this.inventory[type]--;
    this.placed.push(g);
    this.emit('place', g.x, g.y);
    return g;
  }

  remove(g) {
    const i = this.placed.indexOf(g);
    if (i < 0) return;
    this.placed.splice(i, 1);
    this.inventory[g.type] = (this.inventory[g.type] || 0) + 1;
  }

  // ground gadgets sit on the first surface below the point
  snapToGround(x, y) {
    for (let yy = Math.max(0, Math.round(y)); yy < H; yy++) {
      if (this.solid(x, yy) && !this.solid(x, yy - 1)) return yy;
    }
    return null;
  }

  solid(x, y) {
    if (this.terrain.solid(x, y)) return true;
    for (const g of this.placed) if (g.type === 'bridge' && GADGETS.bridge.solidAt(g, x, y)) return true;
    for (const m of this.movers) if (x >= m.x - m.w / 2 && x <= m.x + m.w / 2 && y >= m.y && y <= m.y + 14) return true;
    return false;
  }

  // ---------- main step ----------
  step() {
    if (this.finished) return;
    this.tick++;
    const L = this.level;

    // moving platforms
    for (const m of this.movers) {
      const t = (this.tick / (m.period || 240)) * Math.PI * 2 + m.phase;
      const nx = m.ox + Math.sin(t) * (m.dx || 0);
      const ny = m.oy + Math.sin(t) * (m.dy || 0);
      m.vx = nx - m.x; m.vy = ny - m.y; m.x = nx; m.y = ny;
    }

    // spawn
    if (this.released < this.total && this.tick >= this.startDelay && (this.tick - this.startDelay) % this.rate === 0) {
      const e = L.entry;
      this.penguins.push({
        id: uid++, x: e.x, y: e.y, dir: e.dir || 1, state: 'air', vx: (e.dir || 1) * 1.2, vy: 0,
        fallTop: e.y, cool: 0, anim: Math.random() * 10, floating: 0, spin: false, t: 0,
      });
      this.released++;
      this.emit('spawn', e.x, e.y);
    }

    for (const p of this.penguins) {
      if (p.state === 'saved' || p.state === 'dead') { p.t++; continue; }
      if (p.cool > 0) p.cool--;
      if (p.floating > 0) p.floating--;
      p.anim += 1;
      // ride moving platforms
      if (p.state === 'walk') for (const m of this.movers) {
        if (Math.abs(p.x - m.x) <= m.w / 2 && Math.abs(p.y - m.y) <= 2) { p.x += m.vx; p.y = m.y; }
      }
      if (p.state === 'walk') this.walk(p); else this.air(p);
      if (p.state === 'dead') continue;
      for (const g of this.placed) {
        const def = GADGETS[g.type];
        if (def.trigger && def.trigger(g, p, this)) break;
      }
      this.interact(p);
    }
    for (const g of this.placed) if (g.fire > 0) g.fire--;

    const active = this.penguins.some((p) => p.state !== 'saved' && p.state !== 'dead');
    if ((this.released >= this.total && !active) || this.tick >= this.timeLimit) this.finish();
  }

  walk(p) {
    const nx = p.x + p.dir * WALK;
    const y = Math.round(p.y);
    // body wall check
    if (this.solid(nx + p.dir * HW, y - 22) || this.solid(nx + p.dir * HW, y - 38)) { p.dir = -p.dir; return; }
    if (this.solid(nx, y - 1)) {
      let h = 1;
      while (h <= MAXSTEP && this.solid(nx, y - 1 - h)) h++;
      if (h > MAXSTEP) { p.dir = -p.dir; return; }
      p.x = nx; p.y = y - h;
      return;
    }
    if (this.solid(nx, y)) { p.x = nx; p.y = y; return; }
    for (let d = 1; d <= STEPDOWN; d++) {
      if (this.solid(nx, y + d)) { p.x = nx; p.y = y + d; return; }
    }
    p.x = nx; p.state = 'air'; p.vx = p.dir * 0.9; p.vy = 0; p.fallTop = p.y; p.spin = false;
  }

  air(p) {
    p.vy = Math.min(p.vy + G, 15);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(p.vx), Math.abs(p.vy))));
    const sx = p.vx / steps, sy = p.vy / steps;
    for (let i = 0; i < steps; i++) {
      // horizontal
      const nx = p.x + sx;
      const side = Math.sign(sx) || p.dir;
      if (sx !== 0 && (this.solid(nx + side * HW, p.y - 20) || this.solid(nx + side * HW, p.y - 6) || this.solid(nx + side * HW, p.y - 36))) {
        p.vx = -p.vx * 0.25; p.dir = -side;
        this.emit('bump', p.x, p.y - 20);
        return;
      }
      p.x = nx;
      // vertical
      const ny = p.y + sy;
      if (sy > 0 && this.solid(p.x, ny)) {
        let yy = Math.round(ny);
        while (this.solid(p.x, yy - 1) && yy > 0) yy--;
        p.y = yy;
        this.land(p);
        return;
      }
      if (sy < 0 && this.solid(p.x, ny - 42)) { p.vy = 0; p.y = Math.round(p.y); return; }
      p.y = ny;
      if (p.vy < 0) p.fallTop = Math.min(p.fallTop, p.y);
    }
    if (p.y > H + 60) this.kill(p, 'void');
  }

  land(p) {
    const fall = p.y - p.fallTop;
    if (fall > MAXFALL && p.floating === 0) { this.kill(p, 'splat'); return; }
    p.state = 'walk'; p.spin = false;
    if (Math.abs(p.vx) > 0.4) p.dir = Math.sign(p.vx);
    p.vx = 0; p.vy = 0;
    this.emit('land', p.x, p.y, { hard: fall > 200 });
  }

  interact(p) {
    const L = this.level;
    // exit
    const ex = L.exit;
    if (Math.abs(p.x - ex.x) < 26 && p.y > ex.y - 40 && p.y < ex.y + 8) {
      p.state = 'saved'; p.t = 0; p.x = ex.x; this.saved++;
      this.emit('saved', ex.x, ex.y - 30);
      return;
    }
    // coins
    for (const c of this.coins) {
      if (c.taken) continue;
      const dx = p.x - c.x, dy = p.y - 22 - c.y;
      if (dx * dx + dy * dy < 34 * 34) { c.taken = true; this.coinsTaken++; this.emit('coin', c.x, c.y); }
    }
    // hazards
    for (const h of this.hazards) {
      if (p.x + HW > h.x && p.x - HW < h.x + h.w && p.y > h.y && p.y - 40 < h.y + h.h) { this.kill(p, h.t); return; }
    }
  }

  kill(p, why) {
    if (p.state === 'dead') return;
    p.state = 'dead'; p.why = why; p.t = 0; this.dead++;
    this.emit('dead', p.x, Math.min(p.y, H - 10), { why });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.lost = this.total - this.saved;
    this.success = this.saved >= this.need;
    this.emit(this.success ? 'win' : 'lose', W / 2, H / 2);
  }

  get activeCount() { return this.penguins.filter((p) => p.state !== 'saved' && p.state !== 'dead').length; }
  get seconds() { return this.tick / TICKS; }
}

export { W, H };
