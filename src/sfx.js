// Sound design, synthesised live with WebAudio (no audio files to download or fail).
// Everything goes almost silent while the mic listens, so NOVA never hears the game.
let ctx = null, master = null, musicBus = null, noiseBuf = null, music = null;
let on = true, ducked = false;

export function initSfx() {
  if (ctx) { ctx.resume?.(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.6; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.18; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { ctx = null; } // no audio support: game stays silent, nothing breaks
}
const ok = () => ctx && on && ctx.state !== 'closed';
const level = () => (!on ? 0 : ducked ? 0.04 : 0.6);
function ramp(param, v, secs = 0.15) { if (!ctx) return; param.cancelScheduledValues(ctx.currentTime); param.setTargetAtTime(v, ctx.currentTime, secs); }

export function setSound(v) { on = v; if (master) ramp(master.gain, level()); }
export function duck(v) { ducked = v; if (master) ramp(master.gain, level(), 0.05); }

function tone(freq, start, dur, { type = 'sine', vol = 0.3, to = null } = {}) {
  const t = ctx.currentTime + start, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}
function noise(start, dur, { vol = 0.4, from = 800, to = 200, type = 'lowpass' } = {}) {
  const t = ctx.currentTime + start, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true; f.type = type;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.05);
}

const play = fn => (...a) => { if (!ok()) return; try { fn(...a); } catch { /* never let sound break the game */ } };
export const sfx = {
  blip: play(() => { tone(880, 0, 0.08, { type: 'triangle', vol: 0.15 }); tone(1320, 0.06, 0.1, { type: 'triangle', vol: 0.12 }); }),
  listen: play(() => tone(660, 0, 0.12, { type: 'sine', vol: 0.12, to: 990 })),
  oops: play(() => tone(330, 0, 0.25, { type: 'triangle', vol: 0.15, to: 220 })),
  chime: play(() => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.4, { type: 'triangle', vol: 0.2 }))),
  levelUp: play(() => [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.11, 0.6, { type: 'square', vol: 0.08 }))),
  rocket: play(() => { noise(0, 3.5, { vol: 0.5, from: 300, to: 1200 }); tone(60, 0, 3, { type: 'sawtooth', vol: 0.08, to: 120 }); }),
  rain: play(() => noise(0, 6, { vol: 0.12, from: 4000, to: 2500, type: 'highpass' })),
  boom: play(() => { noise(0, 1.6, { vol: 0.8, from: 2000, to: 60 }); tone(90, 0, 1.2, { vol: 0.5, to: 30 }); }),
  sparkle: play(() => { for (let i = 0; i < 7; i++) { tone(1200 + Math.random() * 1800, i * 0.33 + Math.random() * 0.1, 0.35, { vol: 0.08 }); noise(i * 0.33, 0.5, { vol: 0.15, from: 3000, to: 300 }); } }),
  whoosh: play(() => { noise(0, 3.2, { vol: 0.5, from: 200, to: 6000, type: 'bandpass' }); tone(80, 0, 3.2, { type: 'sawtooth', vol: 0.06, to: 400 }); }),
  portal: play(() => { tone(220, 0, 1.4, { type: 'sine', vol: 0.2, to: 880 }); tone(330, 0.1, 1.4, { type: 'sine', vol: 0.12, to: 1320 }); }),
  ships: play(() => [0, 0.3, 0.6].forEach(s => tone(400, s, 0.6, { type: 'sawtooth', vol: 0.05, to: 1600 }))),
  whistle: play(() => tone(500, 0, 1.1, { type: 'sine', vol: 0.05, to: 1700 })),
  fwBoom: play(() => { noise(0, 0.9, { vol: 0.5, from: 1800, to: 80 }); tone(70, 0, 0.6, { vol: 0.3, to: 35 }); for (let i = 0; i < 10; i++) noise(0.15 + Math.random() * 0.8, 0.05, { vol: 0.1, from: 6000, to: 3000, type: 'highpass' }); }),
  pop: play(() => tone(300, 0, 0.25, { type: 'sine', vol: 0.25, to: 900 })),
  blackhole: play(() => { tone(110, 0, 3, { type: 'sawtooth', vol: 0.1, to: 30 }); noise(0, 3, { vol: 0.3, from: 3000, to: 80 }); }),
};

// Background music: a slow pad whose chord changes with the level.
const CHORDS = [null, [220, 277, 330], [196, 247, 294], [174, 220, 262]];
export function setMusic(levelNum) {
  if (!ctx) return;
  try {
    if (music) { const old = music; ramp(old.g.gain, 0.0001, 0.8); setTimeout(() => old.oscs.forEach(o => o.stop()), 3000); }
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(musicBus);
    const oscs = (CHORDS[levelNum] || CHORDS[1]).flatMap(f => [f, f * 1.005].map(fr => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr / 2; o.connect(g); o.start(); return o; }));
    ramp(g.gain, 0.5, 1.5); music = { g, oscs };
  } catch { /* silent */ }
}
