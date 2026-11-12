// Gadget registry. To add a new gadget: add an entry here (logic) and a draw function
// in src/render/gadgetArt.js (looks). Everything else (inventory, HUD, editor) picks it up.

export const G = 0.35;          // gravity px/tick²
export const WALK = 1.5;        // walk speed px/tick

const deg = (a) => a * Math.PI / 180;

export const GADGETS = {
  cannon: {
    ground: true,
    angles: [30, 45, 60, 75, 90, 105, 120, 135, 150],
    defaultRot: 2,
    powers: [12, 15, 18, 21],
    defaultPower: 1,
    // trigger: returns true if it handled the penguin
    trigger(g, p, world) {
      if (p.cool > 0 || p.state === 'saved' || p.state === 'dead') return false;
      if (Math.abs(p.x - g.x) > 18 || Math.abs(p.y - g.y) > 26) return false;
      const a = deg(this.angles[g.rot]);
      const v = this.powers[g.power ?? this.defaultPower];
      p.x = g.x + Math.cos(a) * 46;
      p.y = g.y - 34 - Math.sin(a) * 46 + 20;
      p.vx = Math.cos(a) * v;
      p.vy = -Math.sin(a) * v;
      p.state = 'air'; p.fallTop = p.y; p.cool = 30; p.spin = true;
      if (Math.abs(p.vx) > 0.3) p.dir = Math.sign(p.vx);
      g.fire = 12;
      world.emit('cannon', g.x, g.y - 30);
      return true;
    },
  },

  spring: {
    ground: true,
    angles: [0],
    defaultRot: 0,
    trigger(g, p, world) {
      if (p.cool > 0 || p.state === 'saved' || p.state === 'dead') return false;
      if (Math.abs(p.x - g.x) > 28 || p.y < g.y - 22 || p.y > g.y + 6) return false;
      if (p.state === 'air' && p.vy < 0) return false;
      p.vy = -13.5; p.vx = p.dir * 2.6; p.y = g.y - 20;
      p.state = 'air'; p.fallTop = p.y; p.cool = 16;
      g.fire = 14;
      world.emit('spring', g.x, g.y);
      return true;
    },
  },

  turner: {
    ground: true,
    angles: [0, 1],   // 0 → arrow points right, 1 → left
    defaultRot: 0,
    trigger(g, p) {
      if (p.state !== 'walk') return false;
      if (Math.abs(p.x - g.x) > 8 || Math.abs(p.y - g.y) > 30) return false;
      const want = g.rot === 0 ? 1 : -1;
      if (p.dir !== want) { p.dir = want; p.x = g.x + want * 9; }
      return false;
    },
  },

  fan: {
    ground: true,
    angles: [0],
    defaultRot: 0,
    height: 330,
    trigger(g, p, world) {
      if (p.state === 'saved' || p.state === 'dead') return false;
      if (Math.abs(p.x - g.x) > 42 || p.y > g.y + 2 || p.y < g.y - this.height) return false;
      if (p.state === 'walk') { p.state = 'air'; p.vy = -1; p.vx = p.dir * 1.2; }
      p.vy = Math.max(-5.5, p.vy - 0.95);
      if (Math.abs(p.vx) < 1.2) p.vx = p.dir * 1.2;
      p.fallTop = p.y; p.floating = 6;
      if ((world.tick & 31) === 0) world.emit('fan', g.x, g.y);
      return false;
    },
  },

  bridge: {
    ground: false,
    angles: [-30, -15, 0, 15, 30],
    defaultRot: 2,
    len: 190, thick: 16,
    solidAt(g, x, y) {
      const a = deg(this.angles[g.rot]);
      const dx = x - g.x, dy = y - g.y;
      const lx = dx * Math.cos(a) + dy * Math.sin(a);
      const ly = -dx * Math.sin(a) + dy * Math.cos(a);
      return Math.abs(lx) <= this.len / 2 && Math.abs(ly) <= this.thick / 2;
    },
  },
};

export const GADGET_ORDER = ['cannon', 'spring', 'bridge', 'fan', 'turner'];
