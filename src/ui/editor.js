// In-game level editor. Levels are plain JSON (same format as src/levels/*.js), so anything made
// here can be shared as a .json file and dropped into the "levels" folder.
import { World } from '../engine/world.js';
import { MATERIALS, W, H } from '../engine/terrain.js';
import { GADGET_ORDER, GADGETS } from '../engine/gadgets.js';

const LS_KEY = 'ibra-penguins-my-levels';
const DECOR = { ice: ['pine', 'iceRock', 'sign'], jungle: ['palm', 'bush', 'statue', 'vine'], desert: ['cactus', 'acacia', 'rockPile'], cave: ['crystal', 'stalag', 'banner'], night: ['lamp', 'bush', 'pine'] };
const MAT_SWATCH = { ice: '#9fd8ef', snow: '#ffffff', rock: '#8a7660', wood: '#a86b32', sand: '#efc883', grass: '#4e8a3a', crystal: '#a78bfa', metal: '#94a3b8' };

export async function loadMyLevels(native) {
  try {
    if (native?.loadMyLevels) { const d = await native.loadMyLevels(); if (Array.isArray(d)) return d; }
  } catch { /* fall back */ }
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
}
async function saveMyLevels(native, list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
  if (native?.saveMyLevels) await native.saveMyLevels(list);
}

const newLevel = () => ({
  id: 'my-' + Date.now().toString(36),
  name: { ar: 'مرحلتي الجديدة', en: 'My new level' },
  tip: { ar: '', en: '' },
  theme: 'ice', penguins: 15, need: 10, rate: 40, time: 180,
  gadgets: { cannon: 1, spring: 1, bridge: 1, fan: 0, turner: 0 },
  shapes: [{ t: 'rect', x: 0, y: 0, w: 36, h: 960, mat: 'ice' }, { t: 'rect', x: 1884, y: 0, w: 36, h: 960, mat: 'ice' }, { t: 'rect', x: 0, y: 820, w: 1920, h: 140, mat: 'ice' }],
  entry: { x: 200, y: 600, dir: 1 }, exit: { x: 1700, y: 820 },
  coins: [], hazards: [], decor: [], solution: [],
});

export class Editor {
  constructor(app) { this.app = app; this.tool = 'rect'; this.mat = 'ice'; this.size = 40; this.undo = []; this.mine = []; }

  async open(level) {
    this.mine = await loadMyLevels(this.app.native);
    this.level = level ? JSON.parse(JSON.stringify(level)) : (this.level || newLevel());
    if (level && !level.id?.startsWith('my-')) this.level.id = 'my-' + Date.now().toString(36);
    this.rebuild(true);
    this.buildUI();
  }
  close() { this.app.screens.innerHTML = ''; }

  snapshot() { this.undo.push(JSON.stringify(this.level)); if (this.undo.length > 60) this.undo.shift(); }
  doUndo() { const s = this.undo.pop(); if (!s) return; this.level = JSON.parse(s); this.rebuild(true); this.buildUI(); }

  rebuild(terrain) {
    this.world = new World(this.level, { headless: true });
    this.world.coins.forEach((c) => (c.taken = false));
    if (terrain) this.app.renderer.load(this.world);
  }

  buildUI() {
    const { t, tn } = this.app, L = this.level;
    const tools = [['rect', '▭', 'edRect'], ['ellipse', '⬭', 'edEllipse'], ['brush', '🖌', 'edBrush'], ['erase', '⌫', 'edErase'], ['entry', '⤓', 'edEntry'], ['exit', '🚪', 'edExit'], ['coin', '🪙', 'edCoin'], ['spikes', '▲', 'edSpikes'], ['decor', '🌲', 'edDecor'], ['select', '✋', 'edSelect']];
    const mats = Object.keys(MATERIALS).map((m) => `<button data-m="${m}" title="${m}" class="${m === this.mat ? 'on' : ''}" style="background:${MAT_SWATCH[m]}"></button>`).join('');
    const decorOpts = (DECOR[L.theme] || DECOR.ice).map((d) => `<option ${d === this.decor ? 'selected' : ''}>${d}</option>`).join('');
    const gad = GADGET_ORDER.map((g) => `<div class="grow"><span>${t('g_' + g)}</span><input type="number" min="0" max="9" data-g="${g}" value="${L.gadgets[g] || 0}"></div>`).join('');
    this.app.screens.innerHTML = `
      <div id="edbar">
        <button class="btn green" id="eTest">▶ ${t('edTest')}</button><button class="btn" id="eSave">💾 ${t('edSave')}</button>
        <button class="btn" id="eUndo">↶ ${t('edUndo')}</button><button class="btn" id="eNew">${t('edNew')}</button><button class="btn" id="eOpen">${t('edLoad')}</button>
        <button class="btn" id="eExp">${t('edExport')}</button><button class="btn" id="eImp">${t('edImport')}</button>${this.app.native?.openLevelsFolder ? `<button class="btn" id="eFolder">📁</button>` : ''}<button class="btn red" id="eBack">${t('back')}</button>
      </div>
      <div id="edtools">
        ${tools.map(([id, ic, k]) => `<button class="tool ${this.tool === id ? 'on' : ''}" data-tool="${id}"><span>${ic}</span>${t(k)}</button>`).join('')}
        <label>${t('edMaterial')}</label><div class="mats">${mats}</div>
        <label>${t('edSize')}: <b id="eSz">${this.size}</b></label><input type="range" id="eSize" min="10" max="120" value="${this.size}">
        <label>${t('edDecor')}</label><select id="eDecor">${decorOpts}</select>
      </div>
      <div id="edprops">
        <label>${t('edName')}</label><input id="eName" value="${esc(tn(L.name))}">
        <label>${t('edTheme')}</label><select id="eTheme">${['ice', 'jungle', 'desert', 'cave', 'night'].map((th) => `<option value="${th}" ${th === L.theme ? 'selected' : ''}>${t('theme_' + th)}</option>`).join('')}</select>
        <div class="grow"><span>${t('edPenguins')}</span><input type="number" id="ePeng" min="1" max="100" value="${L.penguins}"></div>
        <div class="grow"><span>${t('edNeed')}</span><input type="number" id="eNeed" min="1" max="100" value="${L.need}"></div>
        <div class="grow"><span>${t('edRate')}</span><input type="number" id="eRate" min="10" max="200" value="${L.rate}"></div>
        <div class="grow"><span>${t('edTime')}</span><input type="number" id="eTime" min="30" max="900" value="${L.time}"></div>
        <label>${t('edGadgets')}</label>${gad}
        <label>💡 ${L.solution?.length ? '✔' : '—'}</label>
      </div>
      <div class="edtip">${t('edTip')}</div>`;
    const $ = (s) => this.app.screens.querySelector(s);
    this.app.screens.querySelectorAll('[data-tool]').forEach((b) => b.onclick = () => { this.tool = b.dataset.tool; this.buildUI(); });
    this.app.screens.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => { this.mat = b.dataset.m; this.buildUI(); });
    $('#eSize').oninput = (e) => { this.size = +e.target.value; $('#eSz').textContent = this.size; };
    $('#eDecor').onchange = (e) => { this.decor = e.target.value; this.tool = 'decor'; };
    $('#eName').oninput = (e) => { L.name = { ar: e.target.value, en: e.target.value }; };
    $('#eTheme').onchange = (e) => { this.snapshot(); L.theme = e.target.value; this.decor = null; this.rebuild(true); this.buildUI(); };
    const num = (id, key) => { $(id).onchange = (e) => { L[key] = Math.max(1, +e.target.value | 0); if (L.need > L.penguins) L.need = L.penguins; this.rebuild(false); }; };
    num('#ePeng', 'penguins'); num('#eNeed', 'need'); num('#eRate', 'rate'); num('#eTime', 'time');
    this.app.screens.querySelectorAll('[data-g]').forEach((i) => i.onchange = () => { L.gadgets[i.dataset.g] = Math.max(0, +i.value | 0); });
    $('#eTest').onclick = () => { this.app.screens.innerHTML = ''; this.app.testLevel(this.level); };
    $('#eSave').onclick = () => this.save();
    $('#eUndo').onclick = () => this.doUndo();
    $('#eNew').onclick = () => { this.snapshot(); this.level = newLevel(); this.rebuild(true); this.buildUI(); };
    $('#eOpen').onclick = () => this.openList();
    $('#eExp').onclick = () => this.exportJson();
    $('#eImp').onclick = () => this.importJson();
    $('#eBack').onclick = () => this.app.exit();
    if ($('#eFolder')) $('#eFolder').onclick = () => this.app.native.openLevelsFolder();
    if (!this.decor) this.decor = (DECOR[L.theme] || DECOR.ice)[0];
  }

  async save() {
    const i = this.mine.findIndex((l) => l.id === this.level.id);
    const copy = JSON.parse(JSON.stringify(this.level));
    if (i >= 0) this.mine[i] = copy; else this.mine.push(copy);
    await saveMyLevels(this.app.native, this.mine);
    this.app.toast(this.app.t('edSaved'));
    this.app.audio.sfx('buy');
  }

  openList() {
    const { t, tn } = this.app;
    const rows = this.mine.map((l, i) => `<div><span>${esc(tn(l.name))}</span><span class="row"><button class="btn small green" data-o="${i}">${t('edEdit')}</button><button class="btn small red" data-d="${i}">✖</button></span></div>`).join('') || '<div>—</div>';
    const wrap = document.createElement('div');
    wrap.className = 'screen dim';
    wrap.innerHTML = `<div class="panel"><h2>${t('myLevels')}</h2><div class="mylist">${rows}</div><div class="row" style="margin-top:14px"><button class="btn small gold" id="oClose">${t('back')}</button></div></div>`;
    this.app.screens.appendChild(wrap);
    wrap.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => { this.level = JSON.parse(JSON.stringify(this.mine[+b.dataset.o])); this.undo = []; this.rebuild(true); this.buildUI(); });
    wrap.querySelectorAll('[data-d]').forEach((b) => b.onclick = async () => { this.mine.splice(+b.dataset.d, 1); await saveMyLevels(this.app.native, this.mine); wrap.remove(); this.openList(); });
    wrap.querySelector('#oClose').onclick = () => wrap.remove();
  }

  exportJson() {
    const blob = new Blob([JSON.stringify(this.level, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (this.app.tn(this.level.name) || 'level').replace(/[\\/:*?"<>|]/g, '_') + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  importJson() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = async () => {
      try {
        const d = JSON.parse(await inp.files[0].text());
        const lv = Array.isArray(d) ? d[0] : d.levels ? d.levels[0] : d;
        if (!lv.shapes || !lv.entry || !lv.exit) throw new Error('bad');
        this.snapshot(); this.level = { ...newLevel(), ...lv, id: 'my-' + Date.now().toString(36) };
        this.rebuild(true); this.buildUI();
      } catch { this.app.toast('JSON ✖'); }
    };
    inp.click();
  }

  onTestWin(placed) {
    this.level.solution = placed.map((g) => ({ type: g.type, x: g.x, y: g.y, rot: g.rot, power: g.power }));
    this.save();
    this.app.toast(this.app.t('edSolutionSaved'));
  }

  // ---------- input ----------
  pointerdown(e, pt) {
    if (e.target.id !== 'game') return;
    const L = this.level;
    if (e.button === 2) { this.deleteAt(pt); return; }
    this.down = pt; this.cur = pt;
    switch (this.tool) {
      case 'brush': case 'erase': this.stroke = [[Math.round(pt.x), Math.round(pt.y)]]; break;
      case 'entry': this.snapshot(); L.entry = { x: Math.round(pt.x), y: Math.round(pt.y), dir: L.entry?.dir || 1 }; this.rebuild(false); this.down = null; break;
      case 'exit': { this.snapshot(); const gy = this.world.snapToGround(pt.x, pt.y - 20); L.exit = { x: Math.round(pt.x), y: gy ?? Math.round(pt.y) }; this.rebuild(false); this.down = null; break; }
      case 'coin': this.snapshot(); L.coins.push({ x: Math.round(pt.x), y: Math.round(pt.y) }); this.rebuild(false); this.down = null; this.app.audio.sfx('coin'); break;
      case 'decor': { this.snapshot(); const gy = this.world.snapToGround(pt.x, pt.y - 20); L.decor.push({ t: this.decor, x: Math.round(pt.x), y: gy ?? Math.round(pt.y), s: 1 }); this.down = null; break; }
      case 'select': this.grab = this.pick(pt); if (this.grab) this.snapshot(); break;
    }
  }
  pointermove(e, pt) {
    this.cur = pt;
    if (!this.down) return;
    if (this.stroke) {
      const [lx, ly] = this.stroke[this.stroke.length - 1];
      if (Math.hypot(pt.x - lx, pt.y - ly) > this.size * 0.35) this.stroke.push([Math.round(pt.x), Math.round(pt.y)]);
    }
    if (this.tool === 'select' && this.grab) {
      const o = this.grab;
      o.ref.x = Math.round(pt.x - o.dx); o.ref.y = Math.round(pt.y - o.dy);
      this.rebuild(false);
    }
  }
  pointerup(e, pt) {
    if (!this.down) return;
    const L = this.level, a = this.down;
    const x = Math.round(Math.min(a.x, pt.x)), y = Math.round(Math.min(a.y, pt.y)), w = Math.round(Math.abs(pt.x - a.x)), h = Math.round(Math.abs(pt.y - a.y));
    if (this.tool === 'rect' && w > 4 && h > 4) { this.snapshot(); L.shapes.push({ t: 'rect', x, y, w, h, mat: this.mat, r: Math.min(14, w / 4, h / 4) | 0 }); this.rebuild(true); }
    if (this.tool === 'ellipse' && w > 4 && h > 4) { this.snapshot(); L.shapes.push({ t: 'ellipse', x: x + w / 2, y: y + h / 2, rx: w / 2, ry: h / 2, mat: this.mat }); this.rebuild(true); }
    if (this.tool === 'spikes' && w > 10) { this.snapshot(); L.hazards.push({ t: 'spikes', x, y: y, w, h: Math.max(20, Math.min(60, h || 30)) }); this.rebuild(false); }
    if ((this.tool === 'brush' || this.tool === 'erase') && this.stroke) {
      this.snapshot();
      L.shapes.push({ t: 'stroke', pts: this.stroke, r: this.size / 2, mat: this.mat, erase: this.tool === 'erase' || undefined });
      this.rebuild(true);
    }
    this.stroke = null; this.down = null; this.grab = null;
  }
  keydown(e) {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); this.doUndo(); }
    if (e.key === 'Escape') this.app.exit();
  }
  pick(pt) {
    const L = this.level;
    const near = (o, r) => Math.hypot(o.x - pt.x, o.y - pt.y) < r;
    for (const c of L.coins) if (near(c, 30)) return { ref: c, dx: pt.x - c.x, dy: pt.y - c.y };
    for (const d of L.decor) if (Math.abs(d.x - pt.x) < 50 && pt.y < d.y && pt.y > d.y - 150) return { ref: d, dx: pt.x - d.x, dy: pt.y - d.y };
    for (const h of L.hazards) if (pt.x > h.x && pt.x < h.x + h.w && pt.y > h.y - 10 && pt.y < h.y + h.h + 10) return { ref: h, dx: pt.x - h.x, dy: pt.y - h.y };
    if (near(L.entry, 60)) return { ref: L.entry, dx: pt.x - L.entry.x, dy: pt.y - L.entry.y };
    if (Math.abs(L.exit.x - pt.x) < 60 && pt.y < L.exit.y + 10 && pt.y > L.exit.y - 110) return { ref: L.exit, dx: pt.x - L.exit.x, dy: pt.y - L.exit.y };
    return null;
  }
  deleteAt(pt) {
    const o = this.pick(pt); if (!o) return;
    const L = this.level; this.snapshot();
    for (const k of ['coins', 'decor', 'hazards']) { const i = L[k].indexOf(o.ref); if (i >= 0) L[k].splice(i, 1); }
    if (o.ref === L.entry) L.entry.dir = -L.entry.dir;   // right-click entry flips direction
    this.rebuild(false);
  }

  // ---------- draw ----------
  draw() {
    const r = this.app.renderer, ctx = r.ctx;
    r.draw(this.world, { editor: true });
    ctx.save();
    // entry direction arrow
    const e = this.level.entry;
    ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.beginPath(); const d = e.dir || 1; ctx.moveTo(e.x + d * 50, e.y); ctx.lineTo(e.x + d * 20, e.y - 16); ctx.lineTo(e.x + d * 20, e.y + 16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Cairo'; ctx.textAlign = 'center'; ctx.fillText('START', e.x, e.y + 40);
    // preview
    const a = this.down, c = this.cur;
    ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]);
    if (a && c && (this.tool === 'rect' || this.tool === 'spikes')) ctx.strokeRect(a.x, a.y, c.x - a.x, c.y - a.y);
    if (a && c && this.tool === 'ellipse') { ctx.beginPath(); ctx.ellipse((a.x + c.x) / 2, (a.y + c.y) / 2, Math.abs(c.x - a.x) / 2 || 1, Math.abs(c.y - a.y) / 2 || 1, 0, 0, 7); ctx.stroke(); }
    ctx.setLineDash([]);
    if (this.stroke) {
      ctx.fillStyle = this.tool === 'erase' ? 'rgba(255,60,60,0.45)' : MAT_SWATCH[this.mat] + 'aa';
      for (const [x, y] of this.stroke) { ctx.beginPath(); ctx.arc(x, y, this.size / 2, 0, 7); ctx.fill(); }
    }
    if (c && (this.tool === 'brush' || this.tool === 'erase')) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, this.size / 2, 0, 7); ctx.stroke(); }
    // solution ghosts
    ctx.globalAlpha = 0.25;
    for (const s of this.level.solution || []) { ctx.fillStyle = '#4ade80'; ctx.beginPath(); ctx.arc(s.x, s.y - 20, 22, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export { GADGETS };
