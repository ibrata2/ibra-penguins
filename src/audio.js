// Synthesized sound effects and theme music (Web Audio, no files needed).
// To use your own music: put mp3/ogg files in src/assets/music/<theme>.mp3 — they replace the synth.

const SCALES = {
  menu: { root: 60, steps: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 112, wave: 'triangle' },
  ice: { root: 64, steps: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 100, wave: 'sine', bell: true },
  jungle: { root: 57, steps: [0, 2, 3, 5, 7, 9, 10, 12], tempo: 118, wave: 'triangle', marimba: true },
  desert: { root: 62, steps: [0, 1, 4, 5, 7, 8, 10, 12], tempo: 96, wave: 'sawtooth', pluck: true },
  night: { root: 60, steps: [0, 3, 5, 7, 10, 12, 15, 17], tempo: 84, wave: 'sine', bell: true, echo: true },
  cave: { root: 55, steps: [0, 2, 3, 7, 8, 12, 14, 15], tempo: 76, wave: 'sine', echo: true },
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.5; this.sfxVol = 0.8;
    this.track = null; this.timer = null; this.fileMusic = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.mBus = this.ctx.createGain(); this.mBus.gain.value = this.musicVol * 0.35; this.mBus.connect(this.master);
    this.sBus = this.ctx.createGain(); this.sBus.gain.value = this.sfxVol * 0.6; this.sBus.connect(this.master);
    this.delay = this.ctx.createDelay(1); this.delay.delayTime.value = 0.32;
    const fb = this.ctx.createGain(); fb.gain.value = 0.38;
    this.delay.connect(fb); fb.connect(this.delay); this.delay.connect(this.mBus);
  }

  setVolumes(m, s) {
    this.musicVol = m; this.sfxVol = s;
    if (this.mBus) { this.mBus.gain.value = m * 0.35; this.sBus.gain.value = s * 0.6; }
    if (this.fileMusic) this.fileMusic.volume = m;
  }

  tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, bus, attack = 0.005, filter } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g); g.connect(bus || this.sBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return g;
  }

  noise(dur, { vol = 0.3, at = 0, hp = 800, bus } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + at;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(bus || this.sBus); s.start(t0);
  }

  sfx(type, e) {
    if (!this.ctx) return;
    switch (type) {
      case 'spawn': this.tone(520, 0.12, { type: 'triangle', vol: 0.12, slide: 1.6 }); break;
      case 'cannon': this.noise(0.35, { vol: 0.5, hp: 120 }); this.tone(110, 0.3, { type: 'square', vol: 0.18, slide: 0.4, filter: 600 }); break;
      case 'spring': this.tone(220, 0.35, { type: 'triangle', vol: 0.25, slide: 3 }); break;
      case 'fan': this.noise(0.25, { vol: 0.05, hp: 2000 }); break;
      case 'coin': this.tone(988, 0.08, { type: 'square', vol: 0.12, filter: 4000 }); this.tone(1319, 0.25, { type: 'square', vol: 0.12, at: 0.07, filter: 4000 }); break;
      case 'saved': this.tone(660, 0.1, { type: 'triangle', vol: 0.18 }); this.tone(880, 0.18, { type: 'triangle', vol: 0.18, at: 0.08 }); break;
      case 'dead': this.tone(300, 0.4, { type: 'sawtooth', vol: 0.12, slide: 0.3, filter: 1500 }); this.noise(0.12, { vol: 0.15, hp: 1500 }); break;
      case 'bump': this.tone(160, 0.08, { type: 'sine', vol: 0.15 }); break;
      case 'place': this.tone(440, 0.07, { type: 'sine', vol: 0.2 }); this.tone(660, 0.1, { type: 'sine', vol: 0.15, at: 0.05 }); break;
      case 'click': this.tone(800, 0.05, { type: 'sine', vol: 0.15 }); break;
      case 'rotate': this.tone(600, 0.06, { type: 'triangle', vol: 0.15, slide: 1.3 }); break;
      case 'error': this.tone(180, 0.15, { type: 'square', vol: 0.1, filter: 800 }); break;
      case 'buy': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, { type: 'triangle', vol: 0.18, at: i * 0.07 })); break;
      case 'win': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.22, at: i * 0.12 })); break;
      case 'lose': [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.2, at: i * 0.2 })); break;
    }
  }

  // ---------- music ----------
  play(track) {
    if (this.track === track) return;
    this.stop();
    this.track = track;
    if (!track) return;
    // optional user music file
    const file = new window.Audio(`src/assets/music/${track}.mp3`);
    file.loop = true; file.volume = this.musicVol;
    file.addEventListener('canplay', () => { if (this.track === track && !this.fileMusic) { this.fileMusic = file; file.play().catch(() => {}); clearInterval(this.timer); } }, { once: true });
    file.addEventListener('error', () => {}, { once: true });
    this.init();
    if (!this.ctx) return;
    const S = SCALES[track] || SCALES.menu;
    const beat = 60 / S.tempo / 2;
    let step = 0, next = this.ctx.currentTime + 0.1;
    let seed = track.length * 97;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // a fixed 32-step motif per track, generated once
    const motif = Array.from({ length: 32 }, (_, i) => (i % 4 === 3 && rnd() < 0.5) ? null : S.steps[Math.floor(rnd() * S.steps.length)]);
    const bass = [0, 0, 5, 7, 0, 0, 3, 5];
    this.timer = setInterval(() => {
      if (!this.ctx || this.fileMusic) return;
      while (next < this.ctx.currentTime + 0.25) {
        const at = next - this.ctx.currentTime;
        const n = motif[step % 32];
        const bus = S.echo ? this.delay : this.mBus;
        if (n !== null && step % 2 === 0 || (n !== null && rnd() < 0.3)) {
          const f = mtof(S.root + n + (step % 64 >= 32 ? 12 : 0));
          if (S.bell) { this.tone(f, 0.9, { type: 'sine', vol: 0.16, at, bus }); this.tone(f * 2, 0.5, { type: 'sine', vol: 0.05, at, bus }); }
          else if (S.marimba) { this.tone(f, 0.35, { type: 'sine', vol: 0.2, at, bus }); this.tone(f * 4, 0.08, { type: 'sine', vol: 0.05, at, bus }); }
          else if (S.pluck) this.tone(f, 0.45, { type: 'sawtooth', vol: 0.09, at, bus, filter: 1800 });
          else this.tone(f, 0.6, { type: S.wave, vol: 0.14, at, bus });
        }
        if (step % 4 === 0) this.tone(mtof(S.root - 24 + bass[(step / 4) % 8]), beat * 3.5, { type: 'triangle', vol: 0.2, at, bus: this.mBus });
        if (step % 8 === 4 && track !== 'cave') this.noise(0.06, { vol: 0.05, at, hp: 5000, bus: this.mBus });
        if (track === 'desert' && step % 8 === 0) this.noise(0.12, { vol: 0.08, at, hp: 200, bus: this.mBus });
        step++; next += beat;
      }
    }, 60);
  }

  stop() {
    clearInterval(this.timer); this.timer = null;
    if (this.fileMusic) { this.fileMusic.pause(); this.fileMusic = null; }
    this.track = null;
  }
}
