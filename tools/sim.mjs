// Debug: node tools/sim.mjs <levelId|all> [--png] [--nosol]
import { World, W, H } from '../src/engine/world.js';
import { ALL_LEVELS } from '../src/levels/index.js';
import { GADGETS } from '../src/engine/gadgets.js';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';

const args = process.argv.slice(2);
const id = args[0] || 'all';
const png = args.includes('--png');
const nosol = args.includes('--nosol');

export function run(level, useSol = true, trails = null) {
  const w = new World(level, { headless: true });
  if (useSol) for (const s of level.solution || []) {
    const g = w.place(s.type, s.x, s.y, s.rot, s.power);
    if (!g) throw new Error(level.id + ': cannot place ' + s.type);
  }
  let n = 0;
  while (!w.finished && n++ < 60 * 600) {
    w.step();
    if (trails && w.tick % 3 === 0) for (const p of w.penguins) if (p.state !== 'dead' && p.state !== 'saved') trails.push([p.x, p.y]);
  }
  return w;
}

function draw(level, w, trails) {
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const v = w.terrain.mask[i];
    buf[i * 3] = buf[i * 3 + 1] = buf[i * 3 + 2] = v ? 90 + v * 15 : 20;
  }
  const dot = (x, y, r, c) => { for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) { const X = Math.round(x + xx), Y = Math.round(y + yy); if (X >= 0 && Y >= 0 && X < W && Y < H) { const k = (Y * W + X) * 3; buf[k] = c[0]; buf[k + 1] = c[1]; buf[k + 2] = c[2]; } } };
  for (const h of level.hazards || []) for (let x = h.x; x < h.x + h.w; x += 2) for (let y = h.y; y < h.y + h.h; y += 2) dot(x, y, 0, [255, 40, 40]);
  for (const g of w.placed) { if (g.type === 'bridge') { for (let x = 0; x < W; x += 1) for (let y = Math.max(0, g.y - 100); y < Math.min(H, g.y + 100); y++) if (GADGETS.bridge.solidAt(g, x, y)) dot(x, y, 0, [200, 120, 40]); } else dot(g.x, g.y - 10, 10, [255, 0, 255]); }
  for (const [x, y] of trails) dot(x, y - 20, 1, [80, 220, 255]);
  for (const c of level.coins || []) dot(c.x, c.y, 8, [255, 210, 0]);
  dot(level.entry.x, level.entry.y, 12, [60, 60, 255]);
  dot(level.exit.x, level.exit.y - 20, 14, [0, 255, 0]);
  for (const m of level.movers || []) dot(m.x, m.y, 6, [255, 150, 0]);
  const tmp = join(tmpdir(), 'ibra-sim.rgb'); writeFileSync(tmp, buf);
  execSync(`ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s ${W}x${H} -i "${tmp}" -vf scale=960:-1 sim_${level.id}.png`);
}

const list = id === 'all' ? ALL_LEVELS : ALL_LEVELS.filter((l) => l.id === id);
let bad = 0;
for (const L of list) {
  const trails = [];
  const w = run(L, !nosol, trails);
  const nos = run(L, false);
  const ok = w.success && !nos.success;
  if (!ok) bad++;
  const deaths = {};
  for (const p of w.penguins) if (p.state === 'dead') deaths[p.why] = (deaths[p.why] || 0) + 1;
  console.log(`${ok ? 'OK ' : 'BAD'} ${L.id.padEnd(5)} saved ${w.saved}/${L.penguins} need ${L.need} coins ${w.coinsTaken}/${(L.coins || []).length} t=${w.seconds.toFixed(0)}s/${L.time} | noSol saved ${nos.saved} | deaths ${JSON.stringify(deaths)}`);
  if (png) draw(L, w, trails);
}
process.exitCode = bad ? 1 : 0;
if (args.includes('--path')) for (const L of list) {
  const w = new World(L, { headless: true });
  for (const s of L.solution || []) w.place(s.type, s.x, s.y, s.rot, s.power);
  const out = [];
  while (!w.finished && w.tick < 36000) { w.step(); const p = w.penguins[0]; if (p && p.state !== 'saved' && p.state !== 'dead' && w.tick % 20 === 0) out.push(`${Math.round(p.x)},${Math.round(p.y - 22)}${p.state === 'air' ? '*' : ''}`); }
  console.log(L.id, 'path:', out.join(' '));
  console.log(L.id, 'coins:', (L.coins || []).map((c) => `${c.x},${c.y}`).join(' '));
}
