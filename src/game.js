// Game flow: levels, missions, scoring, and NOVA turning intents into actions + replies.
import { scene, NIGHT, DAY, STORM, SPACE_BG, sparkles, photo } from './scene.js';
import { home, THEMES, applyHomeTheme, launchRocket, setRain, setDay, resetHome, setHomeLevel, setSnow, showRainbow, strikeLightning, quake } from './home.js';
import { showAurora, meteorShower, summonUfo, disco, pulse, zoom, spin, resetFx } from './fx.js';
import { applySpaceTheme, space, alivePlanets, createPlanet, freshName, recolor, addMoon, explodePlanet, fireworks, launchShips, summonBlackHole, startWarp, isWarping, resetSpace, setSpaceLevel } from './space.js';
import { parse, resolveTarget, extractCount, norm, SIZES, AVAIL, describe, INTENT_NAMES } from './nlu.js';
import { voice, initVoice, listen, speak, cancelSpeech, setContinuous, stopListening, englishVoices, isNatural, setVoiceName, currentVoice } from './voice.js';
import * as ui from './ui.js';
import { $, pick } from './util.js';
import { sfx, initSfx, setSound, duck, setMusic } from './sfx.js';
import { addScore, loadBoard, saveBoard, cleanName } from './leaderboard.js';

export const LEVELS = [null,
  { name: 'Space Lab', emoji: '🚀', cam: { r: 21, h: 8.5, y: -2.8 }, intro: '',
    free: 'Also try: <q>make it snow</q>, <q>rainbow</q>, <q>lightning</q>, <q>summon a UFO</q>, <q>earthquake</q>, <q>take a photo</q>',
    missions: [
      { id: 'rocket', emoji: '🚀', title: 'Launch the rocket', say: 'Launch the rocket', tap: () => ({ intent: 'rocket' }) },
      { id: 'rain', emoji: '🌧️', title: 'Change the weather', say: 'Make it rain', tap: () => ({ intent: 'rain' }) },
      { id: 'daynight', emoji: '🌗', title: 'Switch day & night', say: 'Make it day', tap: () => ({ intent: home.isDay ? 'night' : 'day' }) },
      { id: 'fireworks', emoji: '🎆', title: 'Celebrate!', say: 'Fireworks!', tap: () => ({ intent: 'fireworks' }) },
    ] },
  { name: 'Solar System Builder', emoji: '🪐', cam: { r: 34, h: 16, y: -5 },
    intro: 'Level 2! You are now a planet builder. Try saying: create a planet named Kelly.',
    free: 'Also try: <q>make Kelly bigger</q>, <q>turn it green</q>, <q>how many planets?</q>',
    missions: [
      { id: 'named', emoji: '🪐', title: 'Name a planet', say: 'Create a planet named Kelly', tap: () => ({ intent: 'createPlanet', name: freshName() }) },
      { id: 'styled', emoji: '🎨', title: 'Design a planet', say: 'Make a big blue planet', tap: () => ({ intent: 'createPlanet', color: pick(['blue', 'pink', 'green', 'orange']), size: 'big' }) },
      { id: 'moon', emoji: '🌙', title: 'Give it a moon', say: 'Add a moon to Kelly', tap: () => ({ intent: 'moon', target: liveLast() }) },
      { id: 'destroy', emoji: '💥', title: 'Destroy a planet', say: 'Destroy a planet', tap: () => ({ intent: 'destroy', target: liveLast() }) },
    ] },
  { name: 'Galaxy Commander', emoji: '🌌', cam: { r: 40, h: 16, y: -3.5 },
    intro: 'Final level! You command the whole galaxy. Try saying: open the portal.',
    free: 'Also try: <q>disco</q>, <q>meteor shower</q>, <q>zoom in</q>, <q>spin around</q>, <q>go through the portal</q>',
    missions: [
      { id: 'portal', emoji: '🌀', title: 'Open a portal', say: 'Open the portal', tap: () => ({ intent: 'portal' }) },
      { id: 'ships', emoji: '🛸', title: 'Send a fleet', say: 'Launch 3 spaceships', tap: () => ({ intent: 'ships', count: 3 }) },
      { id: 'blackhole', emoji: '⚫', title: 'Make a black hole', say: 'Create a black hole', tap: () => ({ intent: 'blackhole' }) },
      { id: 'warp', emoji: '⚡', title: 'Go to warp speed', say: 'Warp speed!', tap: () => ({ intent: 'warp' }) },
    ] },
];

// ---------- modes
const MODES = {
  story: { name: 'Story', board: 'story', desc: 'Guided missions across 3 levels: your world, a solar system and the galaxy.', done: 'All 3 levels complete', lead: 'You built a universe using only your voice and AI!',
    rank: s => (s >= 1500 ? ['Galaxy Commander', '👑'] : s >= 1000 ? ['Star Captain', '🏅'] : ['Space Cadet', '⭐']) },
  challenge: { name: 'Speed Challenge', board: 'challenge', desc: '60 seconds of rapid-fire commands. Each one must be said within 2–3.5 seconds. Faster answers and combos score more!', done: "Time's up", lead: 'Lightning-fast voice commands. NOVA could barely keep up!',
    rank: s => (s >= 5000 ? ['Lightning Commander', '⚡'] : s >= 2500 ? ['Quick Thinker', '🏅'] : ['Rookie Racer', '⭐']) },
  free: { name: 'Free Play', board: null, desc: 'Everything unlocked. Say anything in any order and discover all 12 powers.', done: 'Free play complete', lead: 'You explored the powers of a voice-controlled AI world!',
    rank: () => ['Master Creator', '🎨'] },
  learn: { name: 'Learn AI', board: 'story', desc: 'The story levels, but NOVA explains how she understood each sentence. Great for learning AI!', done: 'AI training complete', lead: 'You now know how a voice AI understands people!',
    rank: s => (s >= 1500 ? ['AI Engineer', '🧠'] : s >= 1000 ? ['AI Apprentice', '🏅'] : ['AI Explorer', '⭐']) },
};
// Extra powers: listed in free play, used in the speed challenge, and fun extras in story mode
const BONUS = [
  { id: 'snow', emoji: '❄️', title: 'Make it snow', say: 'Make it snow', tap: () => ({ intent: 'snow' }) },
  { id: 'lightning', emoji: '⚡', title: 'Lightning strike', say: 'Lightning!', tap: () => ({ intent: 'lightning' }) },
  { id: 'rainbow', emoji: '🌈', title: 'Paint a rainbow', say: 'Show me a rainbow', tap: () => ({ intent: 'rainbow' }) },
  { id: 'earthquake', emoji: '🌋', title: 'Shake the world', say: 'Earthquake!', tap: () => ({ intent: 'earthquake' }) },
  { id: 'meteors', emoji: '☄️', title: 'Meteor shower', say: 'Meteor shower', tap: () => ({ intent: 'meteors' }) },
  { id: 'aurora', emoji: '🌌', title: 'Northern lights', say: 'Show the aurora', tap: () => ({ intent: 'aurora' }) },
  { id: 'ufo', emoji: '👽', title: 'Call a UFO', say: 'Summon a UFO', tap: () => ({ intent: 'ufo' }) },
  { id: 'disco', emoji: '🪩', title: 'Disco mode', say: "Let's dance!", tap: () => ({ intent: 'disco' }) },
  { id: 'zoom', emoji: '🔍', title: 'Zoom the camera', say: 'Zoom in', tap: () => ({ intent: 'zoom', dir: 'in' }) },
  { id: 'spin', emoji: '🔄', title: 'Spin around', say: 'Spin around', tap: () => ({ intent: 'spin' }) },
];

const FREE = { name: 'Free Play', emoji: '🎨', free: 'Say anything, in any order! NOVA warps between your world and space for you.', get missions() { return [...LEVELS.slice(1).flatMap(l => l.missions), ...BONUS]; } };
const CHALLENGE_SECS = 60;
const challenge = { running: false, left: CHALLENGE_SECS, prompt: null, combo: 0, bestCombo: 0, correct: 0, missed: 0, timer: 0, voice: false, hitIdx: -1, deadline: 0, windowMs: 3500, endAt: 0 };
const CHALLENGE = {
  name: 'Speed Challenge', emoji: '⚡', free: 'Say the command at the top as fast as you can! Say <q>skip</q> to pass.',
  get missions() { return challenge.prompt ? [{ id: 'now', emoji: challenge.prompt.emoji, title: 'Say it now!', say: challenge.prompt.say }] : []; },
  progress: () => `${challenge.correct} ✓`, ratio: () => challenge.left / CHALLENGE_SECS,
};
const def = () => (state.mode === 'free' ? FREE : state.mode === 'challenge' ? CHALLENGE : LEVELS[state.level]);
const label = () => (state.mode === 'free' ? `🎨 FREE PLAY · ${home.theme.name}` : state.mode === 'challenge' ? `⚡ CHALLENGE · ${home.theme.name}`
  : `${state.mode === 'learn' ? 'LEARN AI · ' : ''}LEVEL ${state.level} · ${LEVELS[state.level].name}`).toUpperCase();
const title = () => (state.mode === 'free' ? `🎨 Discover all ${FREE.missions.length} powers` : state.mode === 'challenge' ? '⚡ Say it now!' : `🎯 Level ${state.level} missions`);

// Free play / challenge: warp to the island or to space, whichever the command needs
function switchScene(n, then) {
  if (challenge.running) { setLevel(n); const f = $('#flashFx'); f.style.opacity = 0.6; setTimeout(() => { f.style.opacity = 0; }, 120); return then(); } // speed challenge: no warp, just a flash
  if (state.busy || isWarping()) return nova('Hold on, we are already warping!');
  state.busy = true; setPending(null); sfx.whoosh();
  nova(n === 1 ? `Taking you back to ${home.theme.name}!` : 'Blasting off to space!');
  startWarp(guard(() => setLevel(n)), guard(() => { state.busy = false; then(); }));
}

// Learn AI mode: a one-sentence explanation of how NOVA understood
function explain(p) {
  const words = [...new Set(p.kw)].slice(0, 3).map(w => `"${w}"`).join(' and ');
  const det = [p.name && `name ${p.name}`, p.color && `colour ${p.color}`, p.size && `size ${p.size}`, p.grow && `size ${p.grow}`, p.count && `number ${p.count}`, p.world && `world ${THEMES[p.world]?.name}`].filter(Boolean);
  return `How I knew: the words ${words || 'you said'} mean ${(INTENT_NAMES[p.intent] || p.intent).toLowerCase()}${det.length ? `, with ${det.join(', ')}` : ''}.`;
}

// ---------- speed challenge: rapid-fire commands, each inside a window that shrinks from 3.5 s to 2 s
function quickPool() {
  const color = pick(['red', 'blue', 'green', 'pink', 'orange', 'purple']), n = 2 + Math.floor(Math.random() * 4);
  return [
    ['🚀', 'Rocket!', p => p.intent === 'rocket'],
    ['🌧️', 'Rain!', p => p.intent === 'rain'],
    ['❄️', 'Snow!', p => p.intent === 'snow'],
    ['⚡', 'Lightning!', p => p.intent === 'lightning'],
    ['🌈', 'Rainbow!', p => p.intent === 'rainbow'],
    ['☀️', 'Day!', p => p.intent === 'day'],
    ['🌙', 'Night!', p => p.intent === 'night'],
    ['🎆', 'Fireworks!', p => p.intent === 'fireworks'],
    ['🪐', `${color[0].toUpperCase()}${color.slice(1)} planet!`, p => p.intent === 'createPlanet' && p.color === color],
    ['🌀', 'Portal!', p => p.intent === 'portal'],
    ['🛸', `${n} spaceships!`, p => p.intent === 'ships' && p.count === n],
    ['⚫', 'Black hole!', p => p.intent === 'blackhole'],
    ['☄️', 'Meteors!', p => p.intent === 'meteors'],
    ['🌌', 'Aurora!', p => p.intent === 'aurora'],
    ['👽', 'UFO!', p => p.intent === 'ufo'],
    ['🌋', 'Earthquake!', p => p.intent === 'earthquake'],
    ['🪩', 'Disco!', p => p.intent === 'disco'],
    ['🔄', 'Spin!', p => p.intent === 'spin'],
  ];
}
function makePrompt() {
  const [emoji, say, ok] = pick(quickPool().filter(([, s]) => s !== challenge.prompt?.say));
  return { emoji, say, ok };
}
const windowSecs = () => Math.max(2, 3.5 - challenge.combo * 0.25); // the better you do, the less time you get
function nextPrompt() {
  challenge.prompt = makePrompt(); challenge.hitIdx = -1;
  challenge.windowMs = windowSecs() * 1000; challenge.deadline = performance.now() + challenge.windowMs;
  const el = $('#cPrompt'); el.textContent = `${challenge.prompt.emoji} ${challenge.prompt.say}`; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  ui.renderCards(title(), def(), runTap); hud();
}
function startChallenge() {
  Object.assign(challenge, { running: true, left: CHALLENGE_SECS, combo: 0, bestCombo: 0, correct: 0, missed: 0, prompt: null, voice: voice.supported, lastListen: 0, endAt: performance.now() + CHALLENGE_SECS * 1000 });
  state.busy = false; $('#cTime').textContent = challenge.left; $('#cCombo').textContent = '';
  ui.show('#cbar', true); setContinuous(true); nextPrompt(); sfx.levelUp();
  clearInterval(challenge.timer); challenge.timer = setInterval(guard(tickChallenge), 100);
}
function tickChallenge() {
  if (!challenge.running) return;
  const now = performance.now(), left = Math.max(0, Math.ceil((challenge.endAt - now) / 1000));
  if (left !== challenge.left) { challenge.left = left; $('#cTime').textContent = left; hud(); if (left <= 5 && left > 0) sfx.blip(); }
  if (left <= 0) return finish();
  $('#cWin').style.transform = `scaleX(${Math.max(0, (challenge.deadline - now) / challenge.windowMs)})`;
  if (now > challenge.deadline) miss('⏱️ Too slow!');
  // keep the mic open the whole time (Chrome closes it after a silence)
  if (challenge.voice && !voice.listening && now - challenge.lastListen > 1500) { challenge.lastListen = now; listen(); }
}
function miss(msg) {
  challenge.combo = 0; challenge.missed++; state.streak = 0; $('#cCombo').textContent = '';
  sfx.oops(); ui.chip(`${msg} It was “${challenge.prompt.say}”`, 'bad'); nextPrompt();
}
function hit(p, source) {
  const speed = Math.max(0, (challenge.deadline - performance.now()) / challenge.windowMs);
  challenge.correct++; challenge.combo++; challenge.bestCombo = Math.max(challenge.bestCombo, challenge.combo);
  const pts = 100 + Math.round(speed * 100) + (challenge.combo - 1) * 25; // faster answer + longer combo = more points
  state.score += pts; state.best = challenge.bestCombo; state.streak = challenge.combo; ui.popPoints(pts); sfx.chime();
  $('#cCombo').textContent = challenge.combo > 1 ? `🔥 ${challenge.combo}x` : '';
  ui.chip(`✅ ${speed > 0.6 ? 'Lightning fast!' : 'Got it!'} +${pts}`, 'good');
  act(p, source); setPending(null); pulse(home.theme.rim, state.level === 1 ? 0.05 : 0);
  nextPrompt();
}
// Voice: a command counts the moment the partial transcript matches, without waiting for the end of speech.
function challengeHeard(text, idx, isFinal, alts = [text]) {
  if (!challenge.running || !challenge.prompt || idx === challenge.hitIdx) return;
  ui.showHeard(text, !isFinal);
  for (const a of alts) { const p = parse(a, ctx()); if (challenge.prompt.ok(p)) { challenge.hitIdx = idx; return hit(p, 'voice'); } }
  if (!isFinal) return;
  if (/\b(skip|pass)\b/.test(norm(text))) { challenge.hitIdx = idx; return miss('⏭️ Skipped.'); }
  ui.chip(`❌ Not that one! Say “${challenge.prompt.say}”`, 'bad'); // the clock is the only penalty
}
function checkChallenge(p, heard, source) { // typed input
  if (/\b(skip|pass)\b/.test(norm(heard))) return miss('⏭️ Skipped.');
  if (challenge.prompt?.ok(p)) hit(p, source); else ui.chip(`❌ Not that one! Say “${challenge.prompt?.say}”`, 'bad');
}
function stopChallenge() {
  clearInterval(challenge.timer);
  if (challenge.running) { challenge.running = false; setContinuous(false); stopListening(); }
  ui.show('#cbar', false); document.body.classList.remove('challenge');
}

export const state = { mode: 'story', started: false, level: 1, score: 0, streak: 0, best: 0, done: new Set(), start: 0, levelDone: false, busy: false };
let pending = null; // a question NOVA is waiting for an answer to

const liveLast = () => (space.lastPlanet?.state === 'alive' ? space.lastPlanet : null);
const ctx = () => ({ level: state.level, planets: alivePlanets(), lastPlanet: liveLast() });
const hud = () => ui.updateHud(state, def(), label());
const fmt = secs => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
const listNames = live => { const n = live.map(p => p.name); return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' or ' + n.at(-1); };

function guard(fn) {
  return (...args) => {
    try { return fn(...args); }
    catch (err) { ui.reportError(err); nova('Oops, my circuits glitched! Please try that again.'); }
  };
}

// ---------- theme
export function applyTheme(key) {
  const th = applyHomeTheme(key);
  NIGHT.set(th.night); DAY.set(th.day); STORM.set(th.storm); SPACE_BG[2].set(th.space2); SPACE_BG[3].set(th.space3);
  applySpaceTheme(th); sparkles.material.color.set(th.rim);
  // the chosen world carries through every level: names, examples and NOVA's lines
  Object.assign(LEVELS[1], { name: th.name, emoji: th.emoji, intro: `Welcome to ${th.name}, explorer! Tap the mic and say: launch the rocket.` });
  LEVELS[2].intro = `Level 2! Build a solar system for ${th.name}. Try saying: create a planet named ${th.hero}.`;
  LEVELS[3].intro = `Final level! ${th.name} needs a Galaxy Commander. Try saying: open the portal.`;
  LEVELS[2].missions[0].say = `Create a planet named ${th.hero}`;
  LEVELS[2].missions[2].say = `Add a moon to ${th.hero}`;
  LEVELS[2].free = `Also try: <q>make ${th.hero} bigger</q>, <q>turn it green</q>, <q>meteor shower</q>, <q>aurora</q>, <q>take me to another world</q>`;
  document.querySelectorAll('.theme').forEach(b => b.classList.toggle('on', b.dataset.theme === home.themeKey));
  $('#worldBtn').textContent = th.emoji; $('#worldBtn').title = `World: ${th.name} (tap to travel)`;
  if (state.started) { ui.renderCards(title(), def(), runTap); hud(); }
}

// ---------- NOVA talks (and listens for the answer when she asked something)
let suffix = ''; // Learn AI mode: NOVA adds how she understood the sentence
function nova(text, opts = {}) {
  if (suffix) { text = `${text} ${suffix}`; suffix = ''; }
  ui.setNovaText(text);
  if (challenge.running) return; // speed challenge: no talking, just playing
  speak(text, () => { if (opts.ask && pending && !voice.listening && state.started) setTimeout(() => { if (pending && !voice.listening) listen(); }, 250); });
}
function setPending(q) { pending = q ? { tries: 0, ...q } : null; ui.setAskUI(!!pending); }

// ---------- levels
function setLevel(n) {
  state.level = n; setPending(null);
  setHomeLevel(n); setSpaceLevel(n);
  scene.fog.near = n === 1 ? 35 : 80; scene.fog.far = n === 1 ? 95 : 260;
  ui.renderCards(title(), def(), runTap); hud(); setMusic(n);
}
function resetWorld() { resetHome(); resetSpace(); resetFx(); }

function complete(id, source) {
  const L = def(), m = L.missions.find(x => x.id === id);
  if (!m || state.done.has(id)) return;
  state.done.add(id);
  const pts = 100 + (source === 'voice' ? Math.max(0, state.streak - 1) * 10 : 0);
  state.score += pts; sfx.chime(); ui.popPoints(pts); ui.toast(`✅ Mission complete: ${m.title}`); hud(); ui.flashCard(id);
  if (L.missions.every(x => state.done.has(x.id)) && !state.levelDone) {
    state.levelDone = true;
    if (state.mode === 'free') { setTimeout(() => nova('You discovered every single power! You are a Master Creator!'), 1500); setTimeout(finish, 5000); }
    else setTimeout(levelComplete, 3000);
  }
}
function levelComplete() {
  if (!state.started || !state.levelDone || ui.isShown('#levelCard') || ui.isShown('#complete')) return;
  if (isWarping() || state.busy) return void setTimeout(levelComplete, 800); // a warp is still running: try again once it lands
  if (state.level === 3) return finish();
  const next = state.level + 1, L = LEVELS[next];
  $('#lcKicker').textContent = `Level ${state.level} complete! 🎉`;
  $('#lcEmoji').textContent = L.emoji; $('#lcTitle').textContent = `LEVEL ${next}`; $('#lcName').textContent = L.name;
  $('#lcMissions').innerHTML = L.missions.map(m => `<div>${m.emoji} <b>${m.title}</b><q>“${m.say}”</q></div>`).join('');
  $('#lcBtn').textContent = `🚀 Warp to Level ${next}`;
  ui.show('#levelCard', true); fireworks(); sfx.levelUp(); sfx.sparkle();
  nova(`Amazing! Level ${state.level} complete. Get ready for Level ${next}: ${L.name}!`);
}
function warpToNext() {
  if (!ui.isShown('#levelCard') || isWarping()) return;
  ui.show('#levelCard', false); cancelSpeech();
  const next = Math.min(3, state.level + 1);
  state.busy = true; sfx.whoosh();
  startWarp(
    guard(() => { if (next === 2) resetWorld(); state.levelDone = false; setLevel(next); }),
    () => { state.busy = false; nova(LEVELS[next].intro); },
  );
}
function finish() {
  if (ui.isShown('#complete')) return;
  stopChallenge();
  const M = MODES[state.mode], secs = Math.round((performance.now() - state.start) / 1000);
  const [rank, icon] = M.rank(state.score), ch = state.mode === 'challenge';
  $('#rank').textContent = rank; $('#badgeIcon').textContent = icon;
  $('#cKicker').textContent = M.done; $('#cLead').textContent = M.lead;
  $('#fScore').textContent = state.score; $('#fTime').textContent = fmt(secs);
  $('#fStreakLabel').textContent = ch ? 'Correct' : 'Best streak'; $('#fStreak').textContent = ch ? challenge.correct : state.best;
  state.result = { score: state.score, secs, rank, mode: M.name, world: home.theme.name, date: new Date().toLocaleDateString() };
  state.savedId = null; $('#nameInput').disabled = false;
  $('#nameForm').hidden = $('#board').hidden = !M.board;
  if (M.board) renderBoard(loadBoard(M.board));
  ui.show('#complete', true);
  fireworks(); sfx.levelUp(); sfx.sparkle();
  nova(`${M.done}! You are a ${rank}!${M.board ? ' Type your name to join the leaderboard.' : ''}`);
}

// ---------- actions
function act(p, source) {
  const L = state.level, av = AVAIL[p.intent];
  if (av && !av.includes(L)) {
    if (state.mode === 'free' || state.mode === 'challenge') return switchScene(av.includes(1) ? 1 : 3, () => act(p, source));
    const min = Math.min(...av);
    return nova(min > L ? `That unlocks in Level ${min}! Finish your missions here first.` : `That was back in Level ${av[0]}. Try something from your mission list!`);
  }
  switch (p.intent) {
    case 'rocket':
      if (!launchRocket()) return nova('The rocket is already flying! Wait for it to land.');
      sfx.rocket(); complete('rocket', source); return nova('Rocket launching in 3, 2, 1… lift off! 🚀');
    case 'rain': setRain(true); sfx.rain(); complete('rain', source); return nova(home.theme.rainMsg);
    case 'rainOff': setRain(false); return nova('Weather cleared. Clear skies ahead! ⛅');
    case 'day': setDay(true); complete('daynight', source); return nova(home.theme.dayMsg);
    case 'night': setDay(false); complete('daynight', source); return nova(home.theme.nightMsg);
    case 'fireworks': fireworks(); sfx.sparkle(); complete('fireworks', source); return nova('Celebration time! 🎆');

    case 'createPlanet': {
      const pl = createPlanet({ name: p.name, color: p.color, size: p.size }); sfx.pop();
      if (p.name) complete('named', source);
      if (p.color || p.size) complete('styled', source);
      const looks = [p.size, p.color].filter(Boolean).join(' ');
      return nova(`Planet ${pl.name} created${looks ? `: a ${looks} beauty` : ''}! 🪐`);
    }
    case 'modify': {
      const pl = p.target;
      if (!pl || pl.state !== 'alive') return nova('Hmm, I cannot find that planet anymore.');
      if (p.color) recolor(pl, p.color);
      if (p.size) pl.size = SIZES[p.size];
      if (p.grow) pl.size = Math.min(2.6, Math.max(0.4, pl.size * (p.grow === 'bigger' ? 1.5 : 0.65)));
      space.lastPlanet = pl;
      return nova(`Done! ${pl.name} is now ${[p.grow, p.size, p.color].filter(Boolean).join(' and ')}. ✨`);
    }
    case 'moon': {
      const live = alivePlanets();
      if (!live.length) return nova('There are no planets yet. Say: create a planet named Kelly!');
      const target = p.target && p.target !== 'all' && p.target.state === 'alive' ? p.target : live.length === 1 ? live[0] : null;
      if (!target) { setPending({ type: 'moonWhich' }); return nova(`Which planet gets the moon? ${listNames(live)}?`, { ask: true }); }
      return giveMoon(target, source);
    }
    case 'destroy': {
      const live = alivePlanets();
      if (!live.length) return nova('There are no planets to destroy. Create one first!');
      if (p.target === 'all') return destroyTargets(live, source);
      if (p.target?.state === 'alive') return destroyTargets([p.target], source);
      if (live.length === 1) { setPending({ type: 'destroyConfirm', target: live[0] }); return nova(`Are you sure you want to destroy ${live[0].name}? Say yes or no.`, { ask: true }); }
      setPending({ type: 'destroyWhich' });
      return nova(`Which planet should I destroy? ${listNames(live)}?`, { ask: true });
    }
    case 'countPlanets': {
      const live = alivePlanets();
      return nova(live.length ? `There ${live.length === 1 ? 'is 1 planet' : `are ${live.length} planets`}: ${listNames(live).replace(' or ', ' and ')}.` : 'No planets yet. Say: create a planet!');
    }

    case 'portal': space.portalOpen = true; sfx.portal(); complete('portal', source); return nova('Portal opened! Where will it take us? 🌀');
    case 'portalClose': space.portalOpen = false; return nova('Portal closed.');
    case 'ships':
      if (!p.count && p.plural) { setPending({ type: 'shipsCount' }); return nova('How many spaceships? Pick a number from 1 to 8.', { ask: true }); }
      return sendShips(p.count || 1, source);
    case 'blackhole': {
      if (space.bhOn) return nova('The black hole is already here. It is hungry!');
      const n = summonBlackHole(); sfx.blackhole(); complete('blackhole', source);
      return nova(n ? `Black hole created! Oh no, it is pulling in ${n} planet${n > 1 ? 's' : ''}! ⚫` : 'Black hole created! Watch it swallow those asteroids! ⚫');
    }
    case 'blackholeOff': space.bhOn = false; return nova('Black hole closed. Phew!');
    case 'warp':
      if (isWarping()) return nova('We are already at warp speed!');
      startWarp(); sfx.whoosh(); complete('warp', source); return nova('Warp speed! Hold on tight! ⚡');

    case 'travel': {
      const keys = Object.keys(THEMES);
      if (p.world === home.themeKey) return nova(`We are already in ${home.theme.name}! Try another world.`);
      return travelTo(p.world || keys[(keys.indexOf(home.themeKey) + 1) % keys.length]);
    }
    case 'snow': setSnow(true); sfx.rain(); complete('snow', source); return nova(`Snow is falling on ${home.theme.name}! ❄️`);
    case 'lightning': strikeLightning(); setTimeout(sfx.boom, 100); complete('lightning', source); return nova('Lightning strike! ⚡');
    case 'rainbow': showRainbow(); sfx.chime(); complete('rainbow', source); return nova('A beautiful rainbow appears! 🌈');
    case 'earthquake': quake(); sfx.boom(); complete('earthquake', source); return nova('Earthquake! Hold on tight! 🌋');
    case 'meteors': meteorShower(); sfx.sparkle(); complete('meteors', source); return nova('Meteor shower! Quick, make a wish! ☄️');
    case 'aurora': showAurora(); sfx.portal(); complete('aurora', source); return nova('Look up! The aurora is dancing across the sky! 🌌');
    case 'ufo': summonUfo(); sfx.portal(); complete('ufo', source); return nova('A UFO has arrived! Do not get beamed up! 👽');
    case 'disco': disco(); sfx.levelUp(); complete('disco', source); return nova("Disco mode! Let's dance! 🪩");
    case 'zoom': zoom(p.dir); complete('zoom', source); return nova(p.dir === 'out' ? 'Zooming out! 🔭' : 'Zooming in! 🔍');
    case 'spin': spin(); sfx.whoosh(); complete('spin', source); return nova('Wheee! Spinning around! 🔄');
    case 'photo': takePhoto(); return nova('Say cheese! Your photo is saved. 📸');
    case 'help': {
      const left = def().missions.filter(m => !state.done.has(m.id));
      return nova(left.length ? `Try saying: ${left.map(m => m.say).join(', or ')}.` : 'You finished this level! Say next level.');
    }
    case 'nextLevel':
      if (state.mode === 'free' || state.mode === 'challenge') return nova('There are no levels in this mode. Just keep playing!');
      if (state.levelDone) return levelComplete();
      return nova(`Finish your missions first! ${def().missions.filter(m => !state.done.has(m.id)).length} left.`);
    case 'reset': resetWorld(); return nova('World reset. Fresh start! ✨');
    case 'greet': return nova("Hi explorer! I'm NOVA, your AI co-pilot. Tell me what to build!");
    case 'whoami': return nova("I'm NOVA. I turn your voice into words, find the meaning, and change the world!");
    case 'thanks': return nova("You're welcome, commander! 😊");
    case 'cancel': return nova('Okay, cancelled.');
    case 'yes': case 'no': return nova('Hmm, I did not ask anything. Give me a command!');
    default: return nova('Hmm, I did not get that. Say: what can I say?');
  }
}
// Warp to another world without losing progress
function travelTo(key) {
  if (isWarping() || state.busy) return nova('Hold on, we are already warping!');
  const th = THEMES[key];
  state.busy = true; setPending(null); sfx.whoosh();
  nova(`Setting course for ${th.name}!`);
  startWarp(guard(() => applyTheme(key)), () => { state.busy = false; nova(`Welcome to ${th.name}! ${th.hello}`); });
}
function giveMoon(pl, source) {
  if (!addMoon(pl)) return nova(`${pl.name} already has 3 moons. That's plenty!`);
  sfx.pop(); space.lastPlanet = pl; complete('moon', source);
  return nova(`${pl.name} now has ${pl.moons.length === 1 ? 'a moon' : pl.moons.length + ' moons'}! 🌙`);
}
function destroyTargets(list, source) {
  list = list.filter(p => p.state === 'alive');
  if (!list.length) return nova('That planet is already gone!');
  list.forEach(explodePlanet); setTimeout(sfx.boom, 350); complete('destroy', source);
  return nova(list.length === 1 ? `Boom! ${list[0].name} has been destroyed! 💥` : `Boom! All ${list.length} planets destroyed! 💥`);
}
function sendShips(n, source) {
  const sent = launchShips(n); sfx.ships(); complete('ships', source);
  return nova(`${n > 8 ? "That's too many! " : ''}${sent} spaceship${sent > 1 ? 's' : ''} launched${space.portalOpen ? ' through the portal' : ''}! 🛸`);
}

// Answers to NOVA's follow-up questions. Returns true if handled.
function answerPending(raw, source) {
  const t = norm(raw), q = pending;
  if (/\b(cancel|never ?mind|forget it)\b/.test(t)) { setPending(null); nova('Okay, cancelled.'); return ui.chip('🧠 CANCEL', 'good'); }
  if (q.type === 'destroyConfirm') {
    if (/\b(yes|yeah|yep|sure|do it|ok|okay|destroy)\b/.test(t)) { setPending(null); ui.chip('🧠 ANSWER · yes', 'good'); destroyTargets([q.target], source); return true; }
    if (/\b(no|nope|don t|stop)\b/.test(t)) { setPending(null); ui.chip('🧠 ANSWER · no', 'good'); nova(`Okay, ${q.target.name} is safe!`); return true; }
  }
  if (q.type === 'destroyWhich' || q.type === 'moonWhich') {
    const target = resolveTarget(raw, ctx());
    if (target) {
      setPending(null); ui.chip(`🧠 ANSWER · planet: ${target === 'all' ? 'all' : target.name}`, 'good');
      const list = target === 'all' ? alivePlanets() : [target];
      if (q.type === 'destroyWhich') destroyTargets(list, source);
      else { list.slice(0, -1).forEach(addMoon); giveMoon(list.at(-1), source); }
      return true;
    }
  }
  if (q.type === 'shipsCount') {
    const n = extractCount(t);
    if (n) { setPending(null); ui.chip(`🧠 ANSWER · number: ${n}`, 'good'); sendShips(n, source); return true; }
  }
  // Not an answer. A brand-new command cancels the question and runs normally.
  const p = parse(raw, ctx());
  if (!['unknown', 'yes', 'no'].includes(p.intent)) { setPending(null); return false; }
  if (++q.tries >= 2) { setPending(null); nova("Let's skip that one. Try another command!"); return ui.chip('🤔 No answer found', 'bad'); }
  nova(q.type === 'shipsCount' ? 'Sorry, how many? Say a number like 3.' : q.type === 'destroyConfirm' ? 'Please say yes or no.' : `Sorry, which one? Say a name: ${listNames(alivePlanets())}.`, { ask: true });
  return ui.chip('🤔 That was not an answer', 'bad');
}

// ---------- input from voice / typing / tapping
let lastInputAt = 0;
const handleInput = guard((alternatives, confidence, source) => {
  if (!state.started || state.busy || ui.isShown('#levelCard') || ui.isShown('#complete')) return;
  const now = performance.now(); if (now - lastInputAt < 250) return; lastInputAt = now; activity(); // ignore double-fires
  ui.setHeardLabel(source === 'voice' ? '🧑 You said' : '⌨️ You typed');
  const raw = alternatives[0];
  ui.setStep(3);
  if (pending) {
    ui.showHeard(raw, false);
    if (answerPending(raw, source)) { if (source === 'voice') state.streak++; hud(); ui.setStep(4); return; }
  }
  let p = null, text = raw;
  for (const a of alternatives) { const q = parse(a, ctx()); if (q.intent !== 'unknown') { p = q; text = a; break; } }
  p = p || parse(raw, ctx());
  ui.showHeard(text, false, [...p.kw, p.name, p.color, p.size, p.grow, p.count, p.target?.name]);
  if (challenge.running) return checkChallenge(p, text, source);
  if (p.intent === 'unknown') {
    state.streak = 0; hud(); sfx.oops();
    ui.chip('🤔 Not sure what that means', 'bad'); brain(text, p, source);
    const left = def().missions.find(m => !state.done.has(m.id));
    nova(`Hmm, I didn't get that. ${left ? `Try saying: ${left.say}.` : 'Say: what can I say?'}`);
    setTimeout(() => ui.setStep(0), 2500);
    return;
  }
  if (source === 'voice') { state.streak++; state.best = Math.max(state.best, state.streak); }
  ui.chip(describe(p) + (confidence ? ` · ${Math.round(confidence * 100)}% sure` : ''), 'good'); sfx.blip();
  hud();
  const lvl = state.level;
  setTimeout(guard(() => { if (state.level !== lvl || state.busy) return; ui.setStep(4); suffix = state.mode === 'learn' ? explain(p) : ''; act(p, source); afterAct(p, text, source); }), 350);
});
const runTap = guard(m => {
  if (!state.started || state.busy) return;
  if (state.mode === 'challenge') return ui.toast('Say it out loud! 🎤 Tap the mic');
  if (pending) setPending(null);
  const p = m.tap(); ui.setStep(4); ui.chip(describe(p) + ' · (tapped)', 'good'); act(p, 'tap'); afterAct(p, m.say, 'tap');
});

// ---------- session
function newSession() {
  resetWorld();
  Object.assign(state, { started: true, score: 0, streak: 0, best: 0, start: performance.now(), levelDone: false, busy: false });
  state.done.clear(); setLevel(1); ui.setStep(0);
  ui.heardPlaceholder('Tap the mic and talk to NOVA…'); ui.chip('🧠 Waiting for your voice');
  document.body.classList.toggle('challenge', state.mode === 'challenge');
  document.body.classList.toggle('learn', state.mode === 'learn');
  $('#brainTitle').textContent = state.mode === 'learn' ? '🧠 NOVA\'s brain (live)' : '🧠 How the AI works';
  $('#finishBtn').hidden = state.mode !== 'free';
  if (state.mode === 'challenge') {
    state.busy = true; // countdown: nothing counts until GO
    nova(`Speed challenge in ${home.theme.name}! Say each command on screen as fast as you can. Ready? Go!`);
    setTimeout(guard(startChallenge), 5500);
  } else if (state.mode === 'free') nova(`Free play in ${home.theme.name}! Discover all ${FREE.missions.length} powers in any order. Try: create a planet named ${home.theme.hero}.`);
  else if (state.mode === 'learn') nova(`Learn AI mode! After every command I will explain how I understood you. ${LEVELS[1].intro}`);
  else nova(LEVELS[1].intro);
}

// ---------- Hall of Fame (top 10 per mode, kept on this laptop)
function renderBoard(list, el = $('#board')) {
  if (!list.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'No champions yet. Be the first!'; return el.replaceChildren(li); }
  el.replaceChildren(...list.map(e => {
    const li = document.createElement('li'); if (e.id === state.savedId) li.className = 'me';
    const n = document.createElement('span'); n.textContent = e.name;
    const meta = document.createElement('small'); meta.textContent = `${e.rank} · ${e.world}`;
    const sc = document.createElement('b'); sc.textContent = e.score;
    li.append(n, meta, sc); return li;
  }));
}
function renderHall() { renderBoard(loadBoard('story'), $('#hallStory')); renderBoard(loadBoard('challenge'), $('#hallChallenge')); }
const openHall = () => { renderHall(); ui.show('#hall', true); };
function renderTopStrip() {
  const best = m => loadBoard(m)[0], s = best('story'), c = best('challenge'), el = $('#topStrip');
  el.hidden = !s && !c;
  el.textContent = [s && `🏆 Story: ${s.name} ${s.score}`, c && `⚡ Challenge: ${c.name} ${c.score}`].filter(Boolean).join('   ·   ');
}
const saveName = guard(e => {
  e.preventDefault();
  if (!state.result || state.savedId) return;
  const name = cleanName($('#nameInput').value);
  const board = MODES[state.mode].board; if (!board) return;
  const { list, place } = addScore(loadBoard(board), { name, ...state.result });
  saveBoard(list, board); state.savedName = name; state.savedId = place ? list[place - 1].id : -1;
  $('#nameInput').value = name; $('#nameInput').disabled = true;
  renderBoard(list); renderHall(); renderTopStrip(); sfx.chime();
  nova(place ? `Welcome to the leaderboard, ${name}! You are number ${place}!` : `Great job, ${name}! Play again to reach the top 10!`);
});

// ---------- attract mode (pulls a crowd while nobody plays) + idle reset
const DEMO = [['“Launch the rocket”', () => launchRocket()], ['“Make it rain”', () => setRain(true)], ['“Make it day”', () => setDay(true)], ['“Fireworks!”', () => fireworks()], ['“Make it night”', () => { setDay(false); setRain(false); }]];
let lastActivity = performance.now(), attractTimer = 0, attractStep = 0, attractTheme = 'space', idleLeft = 0;
function activity() { lastActivity = performance.now(); }
function runAttract() {
  if (attractStep && attractStep % DEMO.length === 0) { const keys = Object.keys(THEMES); applyTheme(keys[(keys.indexOf(home.themeKey) + 1) % keys.length]); } // tour every world
  const [cap, fn] = DEMO[attractStep++ % DEMO.length];
  const el = $('#attractCap'); el.textContent = cap; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  fn();
}
function startAttract() { attractTheme = home.themeKey; attractStep = 0; ui.show('#intro', false); ui.show('#attract', true); document.body.classList.add('attract-on'); runAttract(); attractTimer = setInterval(guard(runAttract), 4500); }
function stopAttract() {
  if (!attractTimer) return;
  clearInterval(attractTimer); attractTimer = 0;
  ui.show('#attract', false); document.body.classList.remove('attract-on'); resetWorld(); applyTheme(attractTheme);
  if (!state.started) ui.show('#intro', true);
}
function nextExplorer() { location.hash = 'world=' + home.themeKey; location.reload(); } // fresh page = zero leftover state
setInterval(guard(() => {
  const quiet = performance.now() - lastActivity;
  if (!state.started && !attractTimer && ui.isShown('#intro') && !ui.isShown('#hall') && quiet > 30000) startAttract();
  if (state.started && !voice.listening && !ui.isShown('#idle') && quiet > 90000) { idleLeft = 10; ui.show('#idle', true); nova('Are you still there? Tap the screen to keep playing.'); }
  if (ui.isShown('#idle')) { $('#idleCount').textContent = idleLeft; if (idleLeft-- <= 0) nextExplorer(); }
}), 1000);

// ---------- NOVA voice picker (start screen)
function fillVoices() {
  const sel = $('#voiceSel'), vs = englishVoices();
  $('#voiceRow').hidden = !vs.length;
  sel.replaceChildren(...vs.map(v => {
    const o = document.createElement('option');
    o.value = v.name; o.selected = v.name === currentVoice();
    o.textContent = `${isNatural(v) ? '★ ' : ''}${v.name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s*Online \(Natural\)/, ' (natural)')} · ${v.lang}`;
    return o;
  }));
}
const testVoice = () => { initSfx(); speak("Hi! I'm NOVA, your AI co-pilot. Ready to command the future?"); };

// ---------- Learn AI: the side panel shows, step by step, how NOVA understood the sentence
function brain(heard, p, source) {
  if (state.mode !== 'learn') return;
  const set = (n, text) => { const s = document.querySelector(`.step[data-step="${n}"] small`); if (s) s.textContent = text; };
  const words = [...new Set(p.kw)].filter(Boolean);
  const det = [p.name && `name = ${p.name}`, p.color && `colour = ${p.color}`, p.size && `size = ${p.size}`, p.grow && `size = ${p.grow}`, p.count && `number = ${p.count}`,
    p.world && `world = ${THEMES[p.world]?.name}`, p.target && `planet = ${p.target === 'all' ? 'all' : p.target.name}`, p.dir && `direction = ${p.dir}`].filter(Boolean);
  const known = p.intent !== 'unknown';
  set(1, source === 'voice' ? '🎙️ The microphone captured your voice' : source === 'tap' ? '👆 You tapped a card' : '⌨️ You typed it');
  set(2, `Heard: “${heard}”`);
  set(3, known ? `Key words ${words.map(w => `“${w}”`).join(', ')} → ${INTENT_NAMES[p.intent]}${det.length ? ' · ' + det.join(' · ') : ''}` : 'No key words I know, so I am not sure 🤔');
  set(4, known ? `The 3D engine runs: ${INTENT_NAMES[p.intent].toLowerCase()}` : 'Nothing changes');
  setTimeout(() => set(5, `NOVA says: “${$('#novaText').textContent}”`), 50);
}
function afterAct(p, heard, source) { pulse(home.theme.rim, state.level === 1 ? 0.05 : 0); brain(heard, p, source); }

// ---------- photo of the world
function takePhoto() {
  sfx.blip();
  const f = $('#flashFx'); f.style.opacity = 0.9; setTimeout(() => { f.style.opacity = 0; }, 180);
  photo.cb = url => { const a = document.createElement('a'); a.href = url; a.download = `my-${home.themeKey}-world.png`; a.click(); };
}

export function bindUI() {
  initVoice({
    onStart() { duck(true); activity(); ui.setListeningUI(true); ui.setStep(1); ui.banner(''); ui.setHeardLabel('🧑 You said'); ui.heardPlaceholder(pending ? 'Listening for your answer…' : 'Listening… speak now!'); if (!pending) ui.chip('🎧 Listening…'); },
    onInterim(t, i) { if (challenge.running) return challengeHeard(t, i, false); ui.setStep(2); ui.showHeard(t, true); },
    onFinal(alts, conf, i) { if (challenge.running) return challengeHeard(alts[0], i, true, alts); handleInput(alts, conf, 'voice'); },
    onError(code) {
      const msgs = {
        'not-allowed': '🎤 Microphone is blocked. Click the 🔒 icon in the address bar → allow Microphone, then try again.',
        'service-not-allowed': '🎤 Microphone is blocked. Click the 🔒 icon in the address bar → allow Microphone.',
        'network': '📶 Voice recognition needs internet. Tap the mission cards or type instead!',
        'audio-capture': '🎤 No microphone found. Plug one in, or tap the mission cards.',
        'language-not-supported': '🎤 This browser cannot recognise English here. Please use Google Chrome.',
      };
      if (code === 'no-speech') { if (!challenge.running) ui.chip("🙉 I didn't hear anything. Tap the mic and speak a bit louder", 'bad'); }
      else if (code !== 'aborted') ui.banner(msgs[code] || `Voice problem (${code}). Tap the cards or type instead.`);
    },
    onEnd(got, errored) { duck(false); activity(); ui.setListeningUI(false); if (!got && !errored && !challenge.running) ui.chip("🙉 Didn't catch that. Tap the mic and try again", 'bad'); if (!got) ui.setStep(0); },
    onUnsupported() { ui.banner('🎤 Voice is not supported in this browser. Open it in Google Chrome or Edge, or tap the cards and type!'); },
    onSpeaking(on) { ui.setSpeaking(on); },
    onBug(err) { ui.reportError(err); },
    onVoices() { fillVoices(); },
  });

  $('#mic').onclick = () => { if (state.started) listen(); };
  $('#typeForm').onsubmit = e => {
    e.preventDefault();
    const v = $('#typeInput').value.trim(); if (!v) return;
    $('#typeInput').value = '';
    handleInput([v.slice(0, 200)], 0, 'text');
  };
  $('#soundBtn').onclick = () => {
    voice.ttsOn = !voice.ttsOn; $('#soundBtn').textContent = voice.ttsOn ? '🔊' : '🔇';
    setSound(voice.ttsOn); if (!voice.ttsOn) cancelSpeech();
  };
  $('#resetBtn').onclick = guard(() => { if (!state.busy) { resetWorld(); setPending(null); nova('World reset. Fresh start! ✨'); } });
  $('#lcBtn').onclick = guard(warpToNext);
  document.querySelectorAll('.theme').forEach(b => b.onclick = () => applyTheme(b.dataset.theme));
  $('#startBtn').onclick = guard(() => { if (state.started) return; stopAttract(); initSfx(); ui.show('#intro', false); newSession(); });
  // fresh page for every visitor = zero leftover memory, zero leftover state
  $('#againBtn').onclick = nextExplorer;
  $('#voiceSel').onchange = e => { setVoiceName(e.target.value); testVoice(); };
  $('#voiceTest').onclick = testVoice;
  const toggleView = () => { const on = document.body.classList.toggle('hud-min'); $('#viewBtn').classList.toggle('on', on); $('#viewBtn').setAttribute('aria-pressed', on); };
  $('#viewBtn').onclick = toggleView;
  document.querySelectorAll('.mode').forEach(b => b.onclick = () => {
    state.mode = b.dataset.mode;
    document.querySelectorAll('.mode').forEach(x => x.classList.toggle('on', x === b));
    $('#modeDesc').textContent = MODES[state.mode].desc;
  });
  $('#finishBtn').onclick = guard(() => { if (state.started && !state.busy) finish(); });
  $('#worldBtn').onclick = guard(() => { if (state.started && !state.busy) { ui.chip('🧠 TRAVEL TO WORLD · (tapped)', 'good'); act({ intent: 'travel', world: null }, 'tap'); } });
  $('#nameForm').onsubmit = saveName;
  $('#idleBtn').onclick = () => { activity(); ui.show('#idle', false); };
  addEventListener('pointerdown', () => { activity(); stopAttract(); }, true);

  addEventListener('keydown', guard(e => {
    activity(); stopAttract();
    if (e.target.tagName === 'INPUT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' && ui.isShown('#intro')) return $('#startBtn').click();
    if (e.key === 'Enter' && ui.isShown('#levelCard')) return warpToNext();
    if (!state.started) return;
    if (e.code === 'Space') { e.preventDefault(); listen(); }
    if (e.key.toLowerCase() === 'h') toggleView();
    const n = +e.key, ms = state.mode === 'challenge' ? [] : def().missions;
    if (n >= 1 && n <= ms.length) runTap(ms[n - 1]);
    if (e.key.toLowerCase() === 'n' && state.level < 3 && !state.busy && (state.mode === 'story' || state.mode === 'learn')) { state.levelDone = true; levelComplete(); } // operator: skip level
  }));
  // pause listening/speaking when the tab is hidden
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSpeech(); });

  const world = new URLSearchParams(location.hash.slice(1)).get('world');
  applyTheme(THEMES[world] ? world : 'space');
  renderTopStrip();
  $('#hallBtn').onclick = openHall; $('#hallOpen').onclick = openHall;
  $('#hallClose').onclick = () => ui.show('#hall', false);
  // live: another window/tab on this laptop (e.g. a projector screen) saved a score
  addEventListener('storage', e => { if (e.key?.startsWith('ctf.leaderboard')) { renderHall(); renderTopStrip(); } });
  // ?hall = a dedicated full-screen Hall of Fame display
  if (new URLSearchParams(location.search).has('hall')) { document.body.classList.add('hall-screen'); ui.show('#intro', false); openHall(); setInterval(renderHall, 5000); }
  setLevel(1);
}
