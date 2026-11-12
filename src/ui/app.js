// IBRA PENGUINS — application shell: screens, HUD, input, game loop.
import { World, TICKS } from '../engine/world.js';
import { GADGETS, GADGET_ORDER } from '../engine/gadgets.js';
import { W, H } from '../engine/terrain.js';
import { WORLDS, ALL_LEVELS } from '../levels/index.js';
import { Renderer } from '../render/renderer.js';
import { drawGadgetIcon, drawPenguin, HATS } from '../render/art.js';
import { buildBackground, buildTerrainLayer } from '../render/scenery.js';
import { Audio } from '../audio.js';
import { Save } from './save.js';
import { t, tn, setLang, getLang } from './i18n.js';
import { Editor, loadMyLevels } from './editor.js';

const $ = (s, r = document) => r.querySelector(s);
const stage = $('#stage'), canvas = $('#game'), screens = $('#screens');
const hud = $('#hud'), topbar = $('#topbar'), selbar = $('#selbar');
const renderer = new Renderer(canvas);
const audio = new Audio();
const native = window.ibra || null;           // Electron bridge (preload.cjs)
const VERSION = '1.0.0';

// ---------------- scaling ----------------
let scale = 1;
function fit() {
  scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `scale(${scale}) translate(-50%, -50%)`;
  stage.style.transformOrigin = '0 0';
  stage.style.left = '50%'; stage.style.top = '50%';
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  stage.style.transformOrigin = '50% 50%';
}
addEventListener('resize', fit); fit();
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}

// ---------------- worlds / packs ----------------
let allWorlds = [];
async function loadPacks() {
  allWorlds = WORLDS.map((w) => ({ ...w, builtin: true }));
  const extra = [];
  try {
    if (native?.loadPacks) {
      const packs = await native.loadPacks();
      for (const p of packs) {
        const d = p.data;
        const levels = Array.isArray(d) ? d : d.levels ? d.levels : [d];
        const name = d.name || { ar: p.file.replace(/\.json$/i, ''), en: p.file.replace(/\.json$/i, '') };
        levels.forEach((l, i) => { l.id = l.id || `${p.file}-${i + 1}`; l.theme = l.theme || d.theme || 'ice'; });
        if (levels.length) extra.push({ id: 'pack:' + p.file, name, theme: levels[0].theme, levels, extra: true });
      }
    }
  } catch (e) { console.warn('packs', e); }
  const mine = await loadMyLevels(native);
  if (mine.length) extra.push({ id: 'mine', name: { ar: t('myLevels'), en: t('myLevels') }, theme: mine[0].theme || 'ice', levels: mine, extra: true, mine: true });
  allWorlds.push(...extra);
}
const builtinOrder = () => WORLDS.flatMap((w) => w.levels);
function isUnlocked(level) {
  const order = builtinOrder();
  const i = order.indexOf(level);
  if (i < 0) return true;
  if (i === 0) return true;
  const p = Save.profile; if (!p) return false;
  return !!p.progress[order[i - 1].id]?.passed;
}
function nextLevel(level) {
  for (const w of allWorlds) { const i = w.levels.indexOf(level); if (i >= 0) return w.levels[i + 1] || (w.builtin ? allWorlds[allWorlds.indexOf(w) + 1]?.levels[0] : null) || null; }
  return null;
}
const worldOf = (level) => allWorlds.find((w) => w.levels.includes(level));

// par time = solution time + margin (computed once by simulation)
const parCache = {};
function parTime(level) {
  if (parCache[level.id] != null) return parCache[level.id];
  let par = level.time;
  if (level.solution?.length) {
    try {
      const w = new World(level, { headless: true });
      for (const s of level.solution) w.place(s.type, s.x, s.y, s.rot, s.power);
      while (!w.finished && w.tick < level.time * TICKS) w.step();
      if (w.success) par = Math.ceil(w.seconds * 1.25 / 5) * 5;
    } catch { /* keep default */ }
  }
  return (parCache[level.id] = par);
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ---------------- state ----------------
const S = {
  mode: 'title',      // title | menu | game | editor
  world: null, level: null, speed: 1,
  drag: null, selected: null, hint: null, trayRot: {}, trayPower: {},
  demo: null, endTimer: 0, paused: false, testFromEditor: false,
};
let editor = null;

// ---------------- toast & tooltips ----------------
let toastT;
function toast(msg) { const el = $('#toast'); el.innerHTML = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
function info(msg) { $('#info').textContent = msg || ''; }
document.addEventListener('mouseover', (e) => { const el = e.target.closest('[data-tip]'); if (el && S.mode === 'game') info(t(el.dataset.tip)); });

function applyStaticText() { document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); }); }

// ---------------- screens ----------------
function show(html, cls = 'dim', id = '') {
  screens.innerHTML = `<div class="screen ${cls}" ${id ? `id="${id}"` : ''}>${html}</div>`;
  const sc = screens.firstElementChild;
  sc.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => audio.sfx('click')));
  return sc;
}
function hideScreens() { screens.innerHTML = ''; }
function setHud(on) { hud.classList.toggle('hidden', !on); topbar.classList.toggle('hidden', !on); if (!on) selbar.classList.add('hidden'); canvas.style.height = on ? '960px' : '1080px'; }

function titleScreen() {
  S.mode = 'title'; setHud(false); startDemo(); audio.play('menu');
  const sc = show(`
    <div class="logo"><div class="ib">IBRA</div><div class="pg">PENGUINS</div><div class="ar">بطاريق إبرا</div></div>
    <div class="title-btns">
      <button class="btn green" id="tPlay">${t('play')}</button>
      <div class="row"><button class="btn small" id="tHelp">${t('help')}</button><button class="btn small" id="tOpt">${t('options')}</button><button class="btn small gold" id="tEd">${t('editor')}</button></div>
      <button class="btn small red" id="tQuit">${t('quit')}</button>
    </div>
    <div class="credit">${t('credits')} · <a href="#" id="lTg">t.me/ibraprogram</a> · <a href="#" id="lTt">TikTok @ibraprogram</a></div>
    <div class="ver">v${VERSION}</div>`, 'dim', 'title');
  sc.style.background = 'radial-gradient(ellipse at 50% 40%, #0000 0%, #0005 70%)';
  $('#tPlay').onclick = () => { audio.init(); profilesScreen(); };
  $('#tHelp').onclick = () => helpScreen(titleScreen);
  $('#tOpt').onclick = () => optionsScreen(titleScreen);
  $('#tEd').onclick = () => openEditor();
  $('#tQuit').onclick = () => (native ? native.quit() : window.close());
  $('#lTg').onclick = (e) => { e.preventDefault(); openUrl('https://t.me/ibraprogram'); };
  $('#lTt').onclick = (e) => { e.preventDefault(); openUrl('https://www.tiktok.com/@ibraprogram'); };
}
function openUrl(u) { native?.openUrl ? native.openUrl(u) : window.open(u, '_blank'); }

function profilesScreen() {
  S.mode = 'menu';
  const slots = Save.data.profiles.map((p, i) => {
    if (!p) return `<div class="slot"><div class="emp">${t('empty')}</div><button class="btn small" data-new="${i}">${t('create')}</button></div>`;
    const st = Save.stats(p);
    const pct = Math.round(st.stars / (builtinOrder().length * 3) * 100);
    return `<div class="slot"><div class="nm">${esc(p.name)}</div>
      <div class="st">${t('levelsDone')}: <b>${st.done}</b> · ${t('coins')}: <b>${p.wallet}</b> · ${t('rating')}: <b>${pct}%</b></div>
      <div class="row"><button class="btn small green" data-play="${i}">${t('play')}</button><button class="btn small red" data-del="${i}">${t('del')}</button></div></div>`;
  }).join('');
  const sc = show(`<div class="panel"><h1>${t('profiles')}</h1><div class="slots">${slots}</div><div class="row" style="margin-top:20px"><button class="btn small gold" id="pBack">${t('back')}</button></div></div>`);
  sc.querySelectorAll('[data-new]').forEach((b) => b.onclick = () => newProfile(+b.dataset.new));
  sc.querySelectorAll('[data-play]').forEach((b) => b.onclick = () => { Save.select(+b.dataset.play); afterProfile(); });
  sc.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => confirmBox(`${t('del')}: ${esc(Save.data.profiles[+b.dataset.del].name)}?`, () => { Save.remove(+b.dataset.del); profilesScreen(); }, profilesScreen));
  $('#pBack').onclick = titleScreen;
}
function newProfile(slot) {
  const sc = show(`<div class="panel col"><h2>${t('newProfile')}</h2><input class="txt" id="pName" maxlength="16" placeholder="${t('enterName')}"><div class="row"><button class="btn green" id="pOk">${t('ok')}</button><button class="btn red" id="pCancel">${t('cancel')}</button></div></div>`);
  const inp = $('#pName'); inp.focus();
  const ok = () => { const n = inp.value.trim(); if (!n) { inp.focus(); return; } Save.create(slot, n); afterProfile(); };
  $('#pOk').onclick = ok; inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); e.stopPropagation(); };
  $('#pCancel').onclick = profilesScreen;
}
function afterProfile() {
  const p = Save.profile;
  if (!p.seenStory) { p.seenStory = true; Save.store(); storyScreen(t('storyText'), mapScreen); } else mapScreen();
}
function confirmBox(msg, yes, no) {
  show(`<div class="panel col"><h2>${msg}</h2><div class="row"><button class="btn red" id="cY">${t('ok')}</button><button class="btn" id="cN">${t('cancel')}</button></div></div>`);
  $('#cY').onclick = yes; $('#cN').onclick = no;
}
function storyScreen(html, then) {
  const sc = show(`<div class="panel story"><canvas id="stPeng" width="700" height="200"></canvas><div>${html}</div><div class="row" style="margin-top:20px"><button class="btn green" id="sGo">${t('next')}</button></div></div>`);
  const c = $('#stPeng').getContext('2d'); let k = 0;
  const loop = () => { if (!document.body.contains(c.canvas)) return; k++; c.clearRect(0, 0, 700, 200); for (let i = 0; i < 5; i++) drawPenguin(c, { x: 120 + i * 115, y: 180 - Math.abs(Math.sin(k * 0.1 + i)) * 26, dir: i % 2 ? -1 : 1, anim: k + i * 5, state: 'walk' }, Save.profile?.hat, 1.6, i === 2); requestAnimationFrame(loop); };
  loop();
  $('#sGo').onclick = then;
}

function optionsScreen(back) {
  const o = Save.options;
  const sc = show(`<div class="panel"><h1>${t('options')}</h1>
    <div class="opt">
      <div>${t('music')}</div><input type="range" id="oM" min="0" max="1" step="0.05" value="${o.music}">
      <div>${t('effects')}</div><input type="range" id="oS" min="0" max="1" step="0.05" value="${o.sfx}">
      <div>${t('language')}</div><div class="seg"><button data-l="ar" class="${o.lang === 'ar' ? 'on' : ''}">العربية</button><button data-l="en" class="${o.lang === 'en' ? 'on' : ''}">English</button></div>
      <div>${t('fullscreen')}</div><div class="seg"><button data-f="1" class="${o.fullscreen ? 'on' : ''}">✔</button><button data-f="0" class="${!o.fullscreen ? 'on' : ''}">✖</button></div>
    </div><div class="row" style="margin-top:24px"><button class="btn gold" id="oBack">${t('backToGame')}</button></div></div>`);
  $('#oM').oninput = (e) => { o.music = +e.target.value; audio.setVolumes(o.music, o.sfx); Save.store(); };
  $('#oS').oninput = (e) => { o.sfx = +e.target.value; audio.setVolumes(o.music, o.sfx); audio.sfx('coin'); Save.store(); };
  sc.querySelectorAll('[data-l]').forEach((b) => b.onclick = () => { o.lang = b.dataset.l; setLang(o.lang); applyStaticText(); Save.store(); optionsScreen(back); });
  sc.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => { o.fullscreen = b.dataset.f === '1'; setFullscreen(o.fullscreen); Save.store(); optionsScreen(back); });
  $('#oBack').onclick = back;
}
function setFullscreen(on) {
  if (native?.setFullscreen) native.setFullscreen(on);
  else if (on) document.documentElement.requestFullscreen?.().catch(() => {}); else if (document.fullscreenElement) document.exitFullscreen();
}

function helpScreen(back) {
  const items = GADGET_ORDER.map((g) => `<div><canvas data-g="${g}" width="200" height="176"></canvas><div><b>${t('g_' + g)}</b><br>${t('gd_' + g)}</div></div>`).join('');
  const sc = show(`<div class="panel help">${t('helpText')}<div class="gadget-list">${items}<div><canvas data-g="fall" width="200" height="176"></canvas><div>${t('gd_fall')}</div></div></div><div class="row" style="margin-top:16px"><button class="btn gold" id="hBack">${t('back')}</button></div></div>`);
  sc.querySelectorAll('canvas[data-g]').forEach((c) => drawIconInto(c, c.dataset.g));
  $('#hBack').onclick = back;
}
function drawIconInto(c, type) {
  const ctx = c.getContext('2d');
  if (type === 'fall') { drawPenguin(ctx, { x: 100, y: 120, dir: 1, anim: 3, state: 'air', vy: 6 }, 'none', 1.8); ctx.font = '900 60px Cairo'; ctx.fillStyle = '#c62828'; ctx.fillText('!', 150, 70); return; }
  drawGadgetIcon(ctx, type, c.width);
}

// ---------------- map ----------------
const REGION_POS = [[30, 620], [280, 140], [530, 620], [780, 140], [1030, 620]];
const RW = 380, RH = 300;
let mapSel = null;
async function mapScreen() {
  S.mode = 'menu'; setHud(false); stopDemo(); audio.play('menu');
  const p = Save.profile;
  const sc = show(`<canvas class="mapbg" width="1920" height="1080"></canvas><div id="mapnodes"></div>
    <div class="mapside" style="right:30px;left:auto">
      <div class="wallet"><span class="coin-ico"></span><span>${p.wallet}</span></div>
      <div class="panel lvlinfo" id="lvlinfo"></div>
      <div class="row"><button class="btn small gold" id="mShop">🎁 ${t('shop')}</button><button class="btn small" id="mOpt">⚙</button><button class="btn small red" id="mBack">${t('back')}</button></div>
    </div><div class="extras" id="extras"></div>`, 'full', 'map');
  const mc = sc.querySelector('canvas.mapbg').getContext('2d');
  drawMapBg(mc);
  const nodes = $('#mapnodes');
  const builtin = allWorlds.filter((w) => w.builtin);
  builtin.forEach((w, wi) => {
    const [rx, ry] = REGION_POS[wi % REGION_POS.length];
    const unlockedW = isUnlocked(w.levels[0]);
    const lab = document.createElement('div'); lab.className = 'maplabel'; lab.style.left = rx + RW / 2 + 'px'; lab.style.top = ry + 30 + 'px'; lab.textContent = tn(w.name) + (unlockedW ? '' : ' 🔒');
    nodes.appendChild(lab);
    w.levels.forEach((L, i) => {
      const x = rx + 50 + i * 70, y = ry + 190 + Math.sin(i * 1.3) * 45;
      nodes.appendChild(mapNode(L, x, y, `${wi + 1}-${i + 1}`));
    });
  });
  const ex = $('#extras');
  allWorlds.filter((w) => w.extra).forEach((w) => {
    const b = document.createElement('button'); b.className = 'btn small gold'; b.textContent = `⭐ ${tn(w.name)} (${w.levels.length})`;
    b.onclick = () => extraPack(w); ex.appendChild(b);
  });
  if (!mapSel || !isUnlocked(mapSel)) mapSel = builtinOrder().filter(isUnlocked).find((l) => !p.progress[l.id]?.passed) || builtinOrder()[0];
  selectLevel(mapSel);
  $('#mShop').onclick = () => shopScreen(mapScreen);
  $('#mOpt').onclick = () => optionsScreen(mapScreen);
  $('#mBack').onclick = profilesScreen;
}
function mapNode(L, x, y, label) {
  const p = Save.profile, pr = p.progress[L.id];
  const b = document.createElement('button');
  b.className = 'mapnode' + (pr?.passed ? ' done' : '') + (isUnlocked(L) ? '' : ' locked') + (L === mapSel ? ' sel' : '');
  b.style.left = x + 'px'; b.style.top = y + 'px';
  b.innerHTML = `${label}${pr?.passed ? `<span class="stars">${'★'.repeat(pr.stars)}${'☆'.repeat(3 - pr.stars)}</span>` : ''}`;
  b.onclick = () => { if (!isUnlocked(L)) { audio.sfx('error'); toast('🔒 ' + t('locked')); return; } audio.sfx('click'); selectLevel(L); };
  b.ondblclick = () => isUnlocked(L) && levelIntro(L);
  b._level = L;
  return b;
}
const thumbCache = {};
function levelThumb(L) {
  if (thumbCache[L.id]) return thumbCache[L.id];
  const c = document.createElement('canvas'); c.width = 420; c.height = 210;
  const ctx = c.getContext('2d');
  const w = new World(L, { headless: true });
  ctx.drawImage(buildBackground(L.theme || 'ice'), 0, 0, 420, 210);
  ctx.drawImage(buildTerrainLayer(w.terrain, L.theme || 'ice'), 0, 0, 420, 210);
  ctx.fillStyle = '#22c55e'; ctx.beginPath(); ctx.arc(L.exit.x * 420 / W, (L.exit.y - 20) * 210 / H, 8, 0, 7); ctx.fill();
  ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(L.entry.x * 420 / W, L.entry.y * 210 / H, 7, 0, 7); ctx.fill();
  return (thumbCache[L.id] = c.toDataURL());
}
function selectLevel(L) {
  mapSel = L;
  document.querySelectorAll('.mapnode').forEach((n) => n.classList.toggle('sel', n._level === L));
  const pr = Save.profile.progress[L.id];
  const gad = Object.entries(L.gadgets || {}).map(([g, n]) => `${t('g_' + g)} ×${n}`).join(' · ');
  $('#lvlinfo').innerHTML = `<h2>${tn(L.name)}</h2><img class="lvlprev" src="${levelThumb(L)}">
    <div class="meta">${t('goal')}: <b>${t('saveN', { need: L.need, total: L.penguins })}</b><br>
    🧰 ${gad}<br>⏱ ${t('timeToBeat')}: <b>${fmt(parTime(L))}</b>${pr?.best != null ? ` · ${t('best')}: <b>${fmt(pr.best)}</b>` : ''}<br>
    🪙 ${pr ? pr.coins : 0}/${(L.coins || []).length}</div>
    <div class="row" style="margin-top:10px"><button class="btn green" id="mPlay">${t('play')} ▶</button></div>`;
  $('#mPlay').onclick = () => { audio.sfx('click'); levelIntro(L); };
}
function extraPack(w) {
  const rows = w.levels.map((L, i) => `<div><span>${i + 1}. ${esc(tn(L.name) || L.id)}</span><span class="row"><button class="btn small green" data-i="${i}">${t('play')}</button>${w.mine ? `<button class="btn small gold" data-e="${i}">${t('edEdit')}</button>` : ''}</span></div>`).join('');
  const sc = show(`<div class="panel"><h2>${esc(tn(w.name))}</h2><div class="mylist">${rows}</div><div class="row" style="margin-top:16px"><button class="btn small gold" id="xBack">${t('back')}</button></div></div>`);
  sc.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => levelIntro(w.levels[+b.dataset.i]));
  sc.querySelectorAll('[data-e]').forEach((b) => b.onclick = () => openEditor(w.levels[+b.dataset.e]));
  $('#xBack').onclick = mapScreen;
}
function drawMapBg(ctx) {
  const g = ctx.createRadialGradient(700, 540, 100, 700, 540, 1200);
  g.addColorStop(0, '#f6e7c1'); g.addColorStop(1, '#c9a46a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
  ctx.strokeStyle = '#a0763a55'; ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.moveTo(0, i * 30 + 5); ctx.bezierCurveTo(400, i * 30 + 20, 900, i * 30 - 10, 1400, i * 30 + 10); ctx.stroke(); }
  // path between regions
  ctx.strokeStyle = '#8a5a0a'; ctx.lineWidth = 10; ctx.setLineDash([24, 18]);
  ctx.beginPath(); REGION_POS.forEach(([x, y], i) => { const cx = x + RW / 2, cy = y + RH / 2; i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); }); ctx.stroke(); ctx.setLineDash([]);
  WORLDS.forEach((w, i) => {
    const [x, y] = REGION_POS[i % REGION_POS.length];
    ctx.save();
    ctx.shadowColor = '#0008'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.beginPath(); ctx.roundRect(x, y, RW, RH, 36); ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore(); ctx.save();
    ctx.beginPath(); ctx.roundRect(x, y, RW, RH, 36); ctx.clip();
    ctx.drawImage(buildBackground(w.theme), x - 80, y - 30, RW + 160, RH + 80);
    if (!isUnlocked(w.levels[0])) { ctx.fillStyle = '#0008'; ctx.fillRect(x, y, RW, RH); }
    ctx.restore();
    ctx.lineWidth = 8; ctx.strokeStyle = '#fff3c4'; ctx.beginPath(); ctx.roundRect(x, y, RW, RH, 36); ctx.stroke();
  });
  ctx.font = '900 54px Cairo'; ctx.fillStyle = '#7a3d05'; ctx.textAlign = 'center';
  ctx.fillText(getLang() === 'ar' ? 'خريطة الحديقة' : 'Zoo Map', 700, 1060);
}

function shopScreen(back) {
  const p = Save.profile;
  const items = Object.entries(HATS).map(([id, h]) => {
    const own = p.hats.includes(id), on = p.hat === id;
    return `<div class="shopitem ${on ? 'on' : ''}"><canvas data-h="${id}" width="280" height="280"></canvas><div>${h[getLang()]}</div>
      ${own ? `<button class="btn small ${on ? '' : 'green'}" data-eq="${id}" ${on ? 'disabled' : ''}>${on ? t('equipped') : t('equip')}</button>` : `<button class="btn small gold" data-buy="${id}">🪙 ${h.price}</button>`}</div>`;
  }).join('');
  const sc = show(`<div class="panel"><h1>🎁 ${t('shop')}</h1><div class="row" style="margin-bottom:14px"><div class="wallet" style="background:#0005"><span class="coin-ico"></span>${p.wallet}</div></div><div class="shopgrid">${items}</div><div class="row" style="margin-top:16px"><button class="btn gold" id="sBack">${t('back')}</button></div></div>`);
  sc.querySelectorAll('canvas[data-h]').forEach((c) => { const ctx = c.getContext('2d'); ctx.scale(2, 2); drawPenguin(ctx, { x: 70, y: 120, dir: 1, anim: 0, state: 'idle' }, c.dataset.h, 1.9); });
  sc.querySelectorAll('[data-buy]').forEach((b) => b.onclick = () => {
    const id = b.dataset.buy, price = HATS[id].price;
    if (p.wallet < price) { audio.sfx('error'); toast(t('notEnough')); return; }
    p.wallet -= price; p.hats.push(id); p.hat = id; Save.store(); audio.sfx('buy'); shopScreen(back);
  });
  sc.querySelectorAll('[data-eq]').forEach((b) => b.onclick = () => { p.hat = b.dataset.eq; Save.store(); shopScreen(back); });
  $('#sBack').onclick = back;
}

// ---------------- level intro / tutorial ----------------
function levelIntro(L) {
  stopDemo();
  const p = Save.profile;
  const tut = L.tutorial;
  const sc = show(`<div class="panel intro"><h2>${esc(tn(L.name))}</h2>
    ${tut ? `<canvas id="tutC" width="360" height="300"></canvas><div style="font-size:30px;font-weight:900">${t('tutorial')}: ${tut === 'fall' ? '⚠' : t('g_' + tut)}</div>` : ''}
    <div class="tip">${esc(tn(L.tip))}</div>
    <div class="goal">${t('goal')}: ${t('saveN', { need: L.need, total: L.penguins })}</div>
    <div class="row" style="margin-top:22px"><button class="btn green" id="iGo">${t('start')} ▶</button><button class="btn small gold" id="iBack">${t('back')}</button></div></div>`);
  if (tut) drawIconInto($('#tutC'), tut);
  $('#iGo').onclick = () => startLevel(L);
  $('#iBack').onclick = S.testFromEditor ? () => openEditor(editor?.level) : mapScreen;
  if (p) { p.seenTut[tut] = true; Save.store(); }
}

// ---------------- game ----------------
function startLevel(L) {
  audio.init();
  S.level = L; S.world = new World(L);
  S.speed = 1; S.selected = null; S.drag = null; S.hint = null; S.endTimer = 0; S.paused = false;
  S.trayRot = {}; S.trayPower = {};
  S.mode = 'game';
  renderer.load(S.world);
  hideScreens(); setHud(true);
  $('#levelTitle').textContent = `${tn(worldOf(L)?.name) || ''} — ${tn(L.name)}`;
  buildTray(); setSpeed(1);
  info(t('dragHint'));
  audio.play(L.theme || 'ice');
}
function buildTray() {
  const tray = $('#tray'); tray.innerHTML = '';
  const w = S.world;
  for (const type of GADGET_ORDER) {
    if (!(type in (S.level.gadgets || {}))) continue;
    const n = w.inventory[type] || 0;
    const el = document.createElement('div');
    el.className = 'tray-item' + (n ? '' : ' empty');
    el.dataset.tip = '';
    el.innerHTML = `<canvas width="128" height="112"></canvas><span class="n">${n}</span>`;
    drawGadgetIcon(el.querySelector('canvas').getContext('2d'), type, 128);
    el.title = `${t('g_' + type)} — ${t('gd_' + type)}`;
    el.onmouseenter = () => info(`${t('g_' + type)}: ${t('gd_' + type)} · ${t('rotateHint')}`);
    el.onpointerdown = (e) => {
      if (e.button !== 0) return;
      if (!w.inventory[type]) { audio.sfx('error'); return; }
      e.preventDefault();
      const def = GADGETS[type];
      S.drag = { type, rot: S.trayRot[type] ?? def.defaultRot, power: S.trayPower[type] ?? def.defaultPower, from: null }; S.ghost = null;
      S.selected = null; updateSelbar();
    };
    el.oncontextmenu = (e) => { e.preventDefault(); const def = GADGETS[type]; S.trayRot[type] = ((S.trayRot[type] ?? def.defaultRot) + 1) % def.angles.length; audio.sfx('rotate'); };
    tray.appendChild(el);
  }
}
function refreshTrayCounts() {
  const items = $('#tray').children; let i = 0;
  for (const type of GADGET_ORDER) {
    if (!(type in (S.level.gadgets || {}))) continue;
    const el = items[i++]; const n = S.world.inventory[type] || 0;
    el.querySelector('.n').textContent = n; el.classList.toggle('empty', !n);
  }
}
function setSpeed(s) {
  S.speed = s;
  document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', +b.dataset.s === s));
}
document.querySelectorAll('#speed button').forEach((b) => b.onclick = () => { setSpeed(+b.dataset.s); audio.sfx('click'); });
$('#btnReset').onclick = () => { audio.sfx('click'); startLevel(S.level); };
$('#btnHint').onclick = () => showHint();
$('#btnMenu').onclick = () => pauseMenu();

function showHint() {
  const sol = S.level.solution || [];
  const w = S.world;
  const todo = sol.find((s) => !w.placed.some((g) => g.type === s.type && Math.hypot(g.x - s.x, g.y - s.y) < 40 && g.rot === (s.rot ?? GADGETS[s.type].defaultRot)));
  if (!todo) { toast(sol.length ? '👍' : '—'); return; }
  const def = GADGETS[todo.type];
  S.hint = { type: todo.type, x: todo.x, y: todo.y, rot: todo.rot ?? def.defaultRot, power: todo.power ?? def.defaultPower };
  const extra = todo.type === 'cannon' ? ` · ${t('power')} ${S.hint.power + 1}` : '';
  toast(`💡 ${t('g_' + todo.type)}${extra}`);
  audio.sfx('place');
}

function pauseMenu() {
  if (S.mode !== 'game') return;
  S.paused = true;
  const sc = show(`<div class="panel col" style="min-width:520px"><h1>${t('menu')}</h1>
    <button class="btn green" id="pResume">${t('resume')}</button><button class="btn" id="pRestart">${t('restart')}</button>
    <button class="btn" id="pOpt">${t('options')}</button><button class="btn" id="pHelp">${t('help')}</button>
    <button class="btn gold" id="pMap">${S.testFromEditor ? t('editor') : t('map')}</button></div>`);
  $('#pResume').onclick = resume;
  $('#pRestart').onclick = () => startLevel(S.level);
  $('#pOpt').onclick = () => optionsScreen(pauseMenu);
  $('#pHelp').onclick = () => helpScreen(pauseMenu);
  $('#pMap').onclick = () => { S.paused = false; S.testFromEditor ? openEditor(S.level) : mapScreen(); };
}
function resume() { S.paused = false; hideScreens(); }

function finishLevel() {
  const w = S.world, L = S.level;
  const coinsTotal = (L.coins || []).length;
  const stars = w.success ? 1 + (w.saved === w.total ? 1 : 0) + (w.coinsTaken === coinsTotal ? 1 : 0) : 0;
  const time = Math.round(w.seconds);
  const par = parTime(L);
  let rec = { newCoins: 0, bonus: 0 };
  if (S.testFromEditor) {
    if (w.success) editor?.onTestWin(w.placed);
  } else rec = Save.record(L.id, { success: w.success, stars, time, coins: w.coinsTaken });
  const p = Save.profile;
  const nxt = nextLevel(L);
  const sc = show(`<div class="panel results">
    <div class="stamp ${w.success ? 'ok' : 'no'}">${w.success ? t('passed') : t('failed')}</div>
    <h2>${esc(tn(L.name))}</h2>
    <div class="bigstars">${[0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}">★</span>`).join('')}</div>
    <div class="res-grid">
      <div>${t('yourGoal')}<br><b>${L.need}</b></div><div>${t('youSaved')}<br><b>${w.saved}</b> / ${w.total}</div>
      <div>${t('timeToBeat')}<br><b>${fmt(par)}</b></div><div>${t('yourTime')}<br><b>${fmt(time)}</b></div>
      <div>${t('collected')} 🪙<br><b>${w.coinsTaken}</b> / ${coinsTotal}</div><div>${t('total')}<br><b>${p ? p.wallet : 0}</b>${rec.newCoins || rec.bonus ? ` <small>(+${rec.newCoins * 10 + rec.bonus})</small>` : ''}</div>
    </div>
    ${w.saved === w.total && w.success ? `<div style="font-size:28px;font-weight:900;color:#1b8a32">${t('allSaved')}</div>` : ''}
    <div class="row" style="margin-top:16px">
      <button class="btn" id="rRetry">${t('retry')}</button>
      ${w.success && nxt && !S.testFromEditor ? `<button class="btn green" id="rNext">${t('next')} ▶</button>` : ''}
      <button class="btn gold" id="rMap">${S.testFromEditor ? t('editor') : t('map')}</button>
      ${!S.testFromEditor ? `<button class="btn small gold" id="rShop">🎁</button>` : ''}
    </div></div>`);
  $('#rRetry').onclick = () => startLevel(L);
  if ($('#rNext')) $('#rNext').onclick = () => { mapSel = nxt; levelIntro(nxt); };
  $('#rMap').onclick = () => (S.testFromEditor ? openEditor(L) : (L.final && w.success && !p.finished ? ending() : mapScreen()));
  if ($('#rShop')) $('#rShop').onclick = () => shopScreen(mapScreen);
  if (L.final && w.success && p && !p.finished && !S.testFromEditor) setTimeout(() => { if (S.mode === 'game') ending(); }, 3500);
}
function ending() {
  const p = Save.profile; if (p) { p.finished = true; Save.store(); }
  storyScreen(t('endText') + `<br><small>${t('credits')}</small>`, mapScreen);
}

// ---------------- input on the playfield ----------------
function hitGadget(pt) {
  const w = S.world; if (!w) return null;
  for (let i = w.placed.length - 1; i >= 0; i--) {
    const g = w.placed[i], def = GADGETS[g.type];
    if (g.type === 'bridge') { if (def.solidAt({ ...g }, pt.x, pt.y) || Math.hypot(pt.x - g.x, pt.y - g.y) < 40) return g; continue; }
    if (Math.abs(pt.x - g.x) < 45 && pt.y > g.y - 80 && pt.y < g.y + 10) return g;
  }
  return null;
}
function ghostAt(pt) {
  const d = S.drag, w = S.world, def = GADGETS[d.type];
  const g = { type: d.type, x: Math.round(pt.x), y: Math.round(pt.y), rot: d.rot, power: d.power, ok: true };
  if (pt.x < 0 || pt.y < 0 || pt.x > W || pt.y > H) { g.ok = false; return g; }
  if (def.ground) {
    const gy = w.snapToGround(g.x, pt.y - 10);
    if (gy == null || gy - pt.y > 260 || w.solid(g.x, pt.y - 10) && gy - pt.y > 30) g.ok = false;
    else g.y = gy;
    if (g.ok && (w.solid(g.x - 20, g.y - 20) || w.solid(g.x + 20, g.y - 20))) g.ok = false;
  } else {
    if (w.terrain.solid(g.x, g.y)) g.ok = false;
  }
  if (Math.hypot(g.x - w.level.exit.x, g.y - w.level.exit.y) < 40) g.ok = false;
  return g;
}
canvas.addEventListener('pointerdown', (e) => {
  if (S.mode === 'editor') return editor.pointerdown(e, toWorld(e));
  if (S.mode !== 'game' || S.paused) return;
  const pt = toWorld(e);
  const g = hitGadget(pt);
  if (e.button === 2) { if (g) rotateGadget(g); return; }
  if (g) {
    S.selected = g;
    S.drag = { type: g.type, rot: g.rot, power: g.power, from: { x: g.x, y: g.y }, moving: g, startPt: pt, moved: false };
    updateSelbar();
  } else { S.selected = null; updateSelbar(); }
});
addEventListener('pointermove', (e) => {
  if (S.mode === 'editor') return editor.pointermove(e, toWorld(e));
  if (S.mode !== 'game' || !S.drag) return;
  const pt = toWorld(e);
  const d = S.drag;
  if (d.moving && !d.moved) {
    if (Math.hypot(pt.x - d.startPt.x, pt.y - d.startPt.y) < 8) return;
    d.moved = true; S.world.remove(d.moving); S.selected = null; updateSelbar(); refreshTrayCounts();
  }
  S.ghost = ghostAt(pt);
});
addEventListener('pointerup', (e) => {
  if (S.mode === 'editor') return editor.pointerup(e, toWorld(e));
  if (S.mode !== 'game' || !S.drag) return;
  const d = S.drag; S.drag = null;
  if (d.moving && !d.moved) { S.ghost = null; return; }
  const gh = S.ghost; S.ghost = null;
  const w = S.world;
  if (gh && gh.ok) {
    const g = w.place(d.type, gh.x, gh.y, d.rot, d.power);
    if (g) { S.selected = g; if (S.hint && S.hint.type === g.type) S.hint = null; }
  } else if (d.moving) {
    const g = w.place(d.type, d.from.x, d.from.y, d.rot, d.power); S.selected = g; audio.sfx('error');
  } else if (gh) audio.sfx('error');
  refreshTrayCounts(); updateSelbar();
});
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (S.mode === 'game' && S.drag) { const def = GADGETS[S.drag.type]; S.drag.rot = (S.drag.rot + 1) % def.angles.length; if (S.ghost) S.ghost.rot = S.drag.rot; audio.sfx('rotate'); }
});
canvas.addEventListener('wheel', (e) => {
  if (S.mode === 'editor') return editor.wheel?.(e);
  if (S.mode !== 'game') return;
  const g = S.drag?.type === 'cannon' ? S.drag : hitGadget(toWorld(e)) || S.selected;
  if (!g || g.type !== 'cannon') return;
  e.preventDefault();
  const n = GADGETS.cannon.powers.length;
  g.power = Math.max(0, Math.min(n - 1, (g.power ?? 1) + (e.deltaY < 0 ? 1 : -1)));
  if (S.ghost && S.drag) S.ghost.power = g.power;
  audio.sfx('rotate');
}, { passive: false });

function rotateGadget(g) { const def = GADGETS[g.type]; if (def.angles.length < 2) return; g.rot = (g.rot + 1) % def.angles.length; audio.sfx('rotate'); }
function updateSelbar() {
  const g = S.selected;
  if (!g || S.mode !== 'game') { selbar.classList.add('hidden'); return; }
  const def = GADGETS[g.type];
  selbar.classList.remove('hidden');
  selbar.style.left = g.x + 'px';
  selbar.style.top = Math.min(890, Math.max(10, (def.ground ? g.y + 14 : g.y + 24))) + 'px';
  selbar.querySelector('[data-a=rotate]').classList.toggle('hidden', def.angles.length < 2);
  selbar.querySelector('[data-a=power]').classList.toggle('hidden', g.type !== 'cannon');
}
selbar.addEventListener('click', (e) => {
  const a = e.target.dataset.a, g = S.selected; if (!a || !g) return;
  if (a === 'rotate') rotateGadget(g);
  if (a === 'power') { g.power = ((g.power ?? 1) + 1) % GADGETS.cannon.powers.length; audio.sfx('rotate'); }
  if (a === 'remove') { S.world.remove(g); S.selected = null; refreshTrayCounts(); audio.sfx('click'); }
  updateSelbar();
});

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (S.mode === 'editor') return editor.keydown(e);
  if (S.mode !== 'game') return;
  if (e.key === 'Escape') { S.paused ? resume() : pauseMenu(); return; }
  if (S.paused) return;
  if (e.code === 'Space') { e.preventDefault(); setSpeed(S.speed === 0 ? 1 : 0); }
  if (e.key === '1') setSpeed(1); if (e.key === '2') setSpeed(2); if (e.key === '3') setSpeed(3);
  if (e.key === 'h' || e.key === 'H') showHint();
  if ((e.key === 'r' || e.key === 'R') && S.selected) { rotateGadget(S.selected); updateSelbar(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && S.selected) { S.world.remove(S.selected); S.selected = null; refreshTrayCounts(); updateSelbar(); }
  if (e.key === 'F11') { e.preventDefault(); Save.options.fullscreen = !Save.options.fullscreen; setFullscreen(Save.options.fullscreen); Save.store(); }
});
addEventListener('blur', () => { if (S.mode === 'game' && !S.paused && !S.world?.finished) pauseMenu(); });

// ---------------- attract-mode demo behind the menus ----------------
let demoIdx = 0;
function startDemo() {
  const L = ALL_LEVELS[demoIdx++ % ALL_LEVELS.length];
  S.demo = new World(L);
  for (const s of L.solution || []) S.demo.place(s.type, s.x, s.y, s.rot, s.power);
  S.demo.events.length = 0;
  renderer.load(S.demo);
}
function stopDemo() { S.demo = null; }

// ---------------- editor ----------------
function openEditor(level) {
  S.mode = 'editor'; stopDemo(); setHud(false); canvas.style.height = '960px'; hideScreens(); S.testFromEditor = false;
  audio.play('menu');
  if (!editor) editor = new Editor({ renderer, screens, native, audio, toast, t, tn, show, testLevel, exit: async () => { editor.close(); await loadPacks(); titleScreen(); } });
  editor.open(level);
}
function testLevel(L) { S.testFromEditor = true; levelIntro(L); }

// ---------------- main loop ----------------
let last = performance.now(), acc = 0;
const SPEEDS = [0, 1, 2, 4];
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  if (S.mode === 'game' && S.world) {
    const w = S.world;
    if (!S.paused) {
      acc += dt * SPEEDS[S.speed] * TICKS / 1000;
      while (acc >= 1) { w.step(); acc -= 1; }
      if (w.finished) { S.endTimer += dt; if (S.endTimer > 1300 && S.mode === 'game' && !screens.firstElementChild) finishLevel(); }
    }
    renderer.consume(w, audio);
    renderer.draw(w, { selected: S.selected, ghost: S.drag && S.ghost, hint: S.hint, hat: Save.profile?.hat, friendName: t('friendName') });
    $('#timer').textContent = fmt(Math.max(0, w.level.time - w.seconds));
    $('#savedTxt').textContent = `${w.saved}/${w.need}`;
    $('#cage').style.filter = w.saved >= w.need ? 'drop-shadow(0 0 10px #7fff7f)' : '';
    if ((renderer.t & 7) === 0) renderer.minimap($('#minimap').getContext('2d'), w, 240, 120);
    if (S.selected) updateSelbar();
  } else if (S.mode === 'editor') {
    editor.draw();
  } else if (S.demo) {
    acc += dt * TICKS / 1000;
    while (acc >= 1) { S.demo.step(); acc -= 1; }
    S.demo.events.length = 0;
    renderer.draw(S.demo, { hat: Save.profile?.hat, friendName: t('friendName') });
    if (S.demo.finished) { S.endTimer += dt; if (S.endTimer > 1500) { S.endTimer = 0; startDemo(); } }
  } else {
    acc = 0;
  }
  requestAnimationFrame(frame);
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------- boot ----------------
(async function boot() {
  Save.load();
  setLang(Save.options.lang);
  audio.setVolumes(Save.options.music, Save.options.sfx);
  applyStaticText();
  if (Save.options.fullscreen) setFullscreen(true);
  await document.fonts?.ready;
  await loadPacks();
  titleScreen();
  document.addEventListener('pointerdown', () => { audio.init(); audio.ctx?.resume(); if (!audio.timer && audio.track) { const tr = audio.track; audio.track = null; audio.play(tr); } }, { once: true });
  requestAnimationFrame(frame);
  window.__ibra = { S, startLevel, ALL_LEVELS, Save, mapScreen, openEditor };   // for debugging / tests
})();
