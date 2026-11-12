// Profiles, progress and options, stored in localStorage (persists inside the installed app).
const KEY = 'ibra-penguins-save-v1';

const blank = () => ({ profiles: [null, null, null, null], current: -1, options: { music: 0.5, sfx: 0.8, lang: 'ar', fullscreen: false } });

export const Save = {
  data: blank(),
  load() {
    try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.profiles) this.data = { ...blank(), ...d, options: { ...blank().options, ...d.options } }; } catch { /* fresh start */ }
    return this.data;
  },
  store() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage unavailable */ } },
  get profile() { return this.data.profiles[this.data.current] || null; },
  get options() { return this.data.options; },
  create(slot, name) {
    this.data.profiles[slot] = { name, progress: {}, wallet: 0, hats: ['none'], hat: 'none', seenStory: false, seenTut: {}, finished: false, created: Date.now() };
    this.data.current = slot; this.store();
  },
  remove(slot) { this.data.profiles[slot] = null; if (this.data.current === slot) this.data.current = -1; this.store(); },
  select(slot) { this.data.current = slot; this.store(); },
  stats(p) {
    const vals = Object.values(p.progress);
    const done = vals.filter((v) => v.passed).length;
    const stars = vals.reduce((a, v) => a + (v.stars || 0), 0);
    return { done, stars };
  },
  // record a finished level; returns {newCoins, bonus}
  record(levelId, r) {
    const p = this.profile; if (!p) return { newCoins: 0, bonus: 0 };
    const prev = p.progress[levelId] || { passed: false, stars: 0, best: null, coins: 0 };
    let newCoins = 0, bonus = 0;
    if (r.success) {
      newCoins = Math.max(0, r.coins - prev.coins);
      if (!prev.passed) bonus = 50;
      prev.passed = true;
      prev.stars = Math.max(prev.stars, r.stars);
      prev.best = prev.best == null ? r.time : Math.min(prev.best, r.time);
      prev.coins = Math.max(prev.coins, r.coins);
    }
    p.progress[levelId] = prev;
    p.wallet += newCoins * 10 + bonus;
    this.store();
    return { newCoins, bonus };
  },
};
