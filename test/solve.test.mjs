// Verifies every level: solvable with its stored solution, NOT solvable without gadgets,
// and every coin can be collected. Also checks JSON packs in ./levels.
import { World } from '../src/engine/world.js';
import { ALL_LEVELS } from '../src/levels/index.js';
import { readdirSync, readFileSync } from 'fs';

function run(level, useSol) {
  const w = new World(level, { headless: true });
  if (useSol) for (const s of level.solution || []) if (!w.place(s.type, s.x, s.y, s.rot, s.power)) throw new Error(`${level.id}: cannot place ${s.type}`);
  while (!w.finished) w.step();
  return w;
}

const levels = [...ALL_LEVELS];
for (const f of readdirSync(new URL('../levels', import.meta.url)).filter((f) => f.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(new URL('../levels/' + f, import.meta.url)));
  const list = Array.isArray(d) ? d : d.levels || [d];
  for (const l of list) levels.push({ ...l, theme: l.theme || d.theme });
}

let fail = 0;
for (const L of levels) {
  const a = run(L, true), b = run(L, false);
  const problems = [];
  if (!a.success) problems.push(`solution saves only ${a.saved}/${L.need}`);
  if (b.success) problems.push('solvable without gadgets');
  if (a.coinsTaken < (L.coins || []).length) problems.push(`coins ${a.coinsTaken}/${L.coins.length}`);
  console.log(`${problems.length ? '✗' : '✓'} ${L.id.padEnd(10)} saved ${a.saved}/${L.penguins} (need ${L.need})  ${problems.join(', ')}`);
  if (problems.length) fail++;
}
console.log(fail ? `\n${fail} level(s) failed` : `\nAll ${levels.length} levels OK`);
process.exitCode = fail ? 1 : 0;
