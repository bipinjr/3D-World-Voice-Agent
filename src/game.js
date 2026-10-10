// Game flow: levels, missions, scoring, and NOVA turning intents into actions + replies.
import { scene, NIGHT, DAY, STORM, SPACE_BG } from './scene.js';
import { home, THEMES, applyHomeTheme, launchRocket, setRain, setDay, resetHome, setHomeLevel } from './home.js';
import { space, alivePlanets, createPlanet, freshName, recolor, addMoon, explodePlanet, fireworks, launchShips, summonBlackHole, startWarp, isWarping, resetSpace, setSpaceLevel } from './space.js';
import { parse, resolveTarget, extractCount, norm, SIZES, AVAIL, describe } from './nlu.js';
import { voice, initVoice, listen, speak, cancelSpeech } from './voice.js';
import * as ui from './ui.js';
import { $, pick } from './util.js';

export const LEVELS = [null,
  { name: 'Space Lab', emoji: '🚀', cam: { r: 21, h: 8, y: -1.5 }, intro: '',
    free: 'Also try: <q>stop the rain</q>, <q>make it night</q>, <q>what can I say?</q>',
    missions: [
      { id: 'rocket', emoji: '🚀', title: 'Launch the rocket', say: 'Launch the rocket', tap: () => ({ intent: 'rocket' }) },
      { id: 'rain', emoji: '🌧️', title: 'Change the weather', say: 'Make it rain', tap: () => ({ intent: 'rain' }) },
      { id: 'daynight', emoji: '🌗', title: 'Switch day & night', say: 'Make it day', tap: () => ({ intent: home.isDay ? 'night' : 'day' }) },
      { id: 'fireworks', emoji: '🎆', title: 'Celebrate!', say: 'Fireworks!', tap: () => ({ intent: 'fireworks' }) },
    ] },
  { name: 'Solar System Builder', emoji: '🪐', cam: { r: 34, h: 16, y: -2 },
    intro: 'Level 2! You are now a planet builder. Try saying: create a planet named Kelly.',
    free: 'Also try: <q>make Kelly bigger</q>, <q>turn it green</q>, <q>how many planets?</q>',
    missions: [
      { id: 'named', emoji: '🪐', title: 'Name a planet', say: 'Create a planet named Kelly', tap: () => ({ intent: 'createPlanet', name: freshName() }) },
      { id: 'styled', emoji: '🎨', title: 'Design a planet', say: 'Make a big blue planet', tap: () => ({ intent: 'createPlanet', color: pick(['blue', 'pink', 'green', 'orange']), size: 'big' }) },
      { id: 'moon', emoji: '🌙', title: 'Give it a moon', say: 'Add a moon to Kelly', tap: () => ({ intent: 'moon', target: liveLast() }) },
      { id: 'destroy', emoji: '💥', title: 'Destroy a planet', say: 'Destroy a planet', tap: () => ({ intent: 'destroy', target: liveLast() }) },
    ] },
  { name: 'Galaxy Commander', emoji: '🌌', cam: { r: 40, h: 16, y: 0 },
    intro: 'Final level! You command the whole galaxy. Try saying: open the portal.',
    free: 'Also try: <q>close the portal</q>, <q>create a planet called Rocky</q> then a black hole!',
    missions: [
      { id: 'portal', emoji: '🌀', title: 'Open a portal', say: 'Open the portal', tap: () => ({ intent: 'portal' }) },
      { id: 'ships', emoji: '🛸', title: 'Send a fleet', say: 'Launch 3 spaceships', tap: () => ({ intent: 'ships', count: 3 }) },
      { id: 'blackhole', emoji: '⚫', title: 'Make a black hole', say: 'Create a black hole', tap: () => ({ intent: 'blackhole' }) },
      { id: 'warp', emoji: '⚡', title: 'Go to warp speed', say: 'Warp speed!', tap: () => ({ intent: 'warp' }) },
    ] },
];

export const state = { started: false, level: 1, score: 0, streak: 0, best: 0, done: new Set(), start: 0, levelDone: false, busy: false };
let pending = null; // a question NOVA is waiting for an answer to

const liveLast = () => (space.lastPlanet?.state === 'alive' ? space.lastPlanet : null);
const ctx = () => ({ level: state.level, planets: alivePlanets(), lastPlanet: liveLast() });
const hud = () => ui.updateHud(state, LEVELS[state.level]);
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
  Object.assign(LEVELS[1], { name: th.name, emoji: th.emoji, intro: `Welcome to ${th.name}, explorer! Tap the mic and say: launch the rocket.` });
  document.querySelectorAll('.theme').forEach(b => b.classList.toggle('on', b.dataset.theme === home.themeKey));
  if (state.started) hud();
}

// ---------- NOVA talks (and listens for the answer when she asked something)
function nova(text, opts = {}) {
  ui.setNovaText(text);
  speak(text, () => { if (opts.ask && pending && !voice.listening && state.started) setTimeout(() => { if (pending && !voice.listening) listen(); }, 250); });
}
function setPending(q) { pending = q ? { tries: 0, ...q } : null; ui.setAskUI(!!pending); }

// ---------- levels
function setLevel(n) {
  state.level = n; setPending(null);
  setHomeLevel(n); setSpaceLevel(n);
  scene.fog.near = n === 1 ? 35 : 80; scene.fog.far = n === 1 ? 95 : 260;
  ui.renderCards(n, LEVELS[n], runTap); hud();
}
function resetWorld() { resetHome(); resetSpace(); }

function complete(id, source) {
  const L = LEVELS[state.level], m = L.missions.find(x => x.id === id);
  if (!m || state.done.has(id)) return;
  state.done.add(id);
  const pts = 100 + (source === 'voice' ? Math.max(0, state.streak - 1) * 10 : 0);
  state.score += pts; ui.popPoints(pts); ui.toast(`✅ Mission complete: ${m.title}`); hud(); ui.flashCard(id);
  if (L.missions.every(x => state.done.has(x.id)) && !state.levelDone) { state.levelDone = true; setTimeout(levelComplete, 3000); }
}
function levelComplete() {
  if (!state.started || !state.levelDone || ui.isShown('#levelCard') || ui.isShown('#complete') || isWarping()) return;
  if (state.level === 3) return finish();
  const next = state.level + 1, L = LEVELS[next];
  $('#lcKicker').textContent = `Level ${state.level} complete! 🎉`;
  $('#lcEmoji').textContent = L.emoji; $('#lcTitle').textContent = `LEVEL ${next}`; $('#lcName').textContent = L.name;
  $('#lcMissions').innerHTML = L.missions.map(m => `<div>${m.emoji} <b>${m.title}</b><q>“${m.say}”</q></div>`).join('');
  $('#lcBtn').textContent = `🚀 Warp to Level ${next}`;
  ui.show('#levelCard', true); fireworks();
  nova(`Amazing! Level ${state.level} complete. Get ready for Level ${next}: ${L.name}!`);
}
function warpToNext() {
  if (!ui.isShown('#levelCard') || isWarping()) return;
  ui.show('#levelCard', false); cancelSpeech();
  const next = Math.min(3, state.level + 1);
  state.busy = true;
  startWarp(
    guard(() => { if (next === 2) resetWorld(); state.levelDone = false; setLevel(next); }),
    () => { state.busy = false; nova(LEVELS[next].intro); },
  );
}
function finish() {
  const secs = Math.round((performance.now() - state.start) / 1000);
  const [rank, icon] = state.score >= 1500 ? ['Galaxy Commander', '👑'] : state.score >= 1000 ? ['Star Captain', '🏅'] : ['Space Cadet', '⭐'];
  $('#rank').textContent = rank; $('#badgeIcon').textContent = icon;
  $('#fScore').textContent = state.score;
  $('#fTime').textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  $('#fStreak').textContent = state.best;
  ui.show('#complete', true);
  fireworks(); nova(`Mission complete! You are a ${rank}!`);
}

// ---------- actions
function act(p, source) {
  const L = state.level, av = AVAIL[p.intent];
  if (av && !av.includes(L)) {
    const min = Math.min(...av);
    return nova(min > L ? `That unlocks in Level ${min}! Finish your missions here first.` : `That was back in Level ${av[0]}. Try something from your mission list!`);
  }
  switch (p.intent) {
    case 'rocket':
      if (!launchRocket()) return nova('The rocket is already flying! Wait for it to land.');
      complete('rocket', source); return nova('Rocket launching in 3, 2, 1… lift off! 🚀');
    case 'rain': setRain(true); complete('rain', source); return nova(home.theme.rainMsg);
    case 'rainOff': setRain(false); return nova('Weather cleared. Clear skies ahead! ⛅');
    case 'day': setDay(true); complete('daynight', source); return nova(home.theme.dayMsg);
    case 'night': setDay(false); complete('daynight', source); return nova(home.theme.nightMsg);
    case 'fireworks': fireworks(); complete('fireworks', source); return nova('Celebration time! 🎆');

    case 'createPlanet': {
      const pl = createPlanet({ name: p.name, color: p.color, size: p.size });
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

    case 'portal': space.portalOpen = true; complete('portal', source); return nova('Portal opened! Where will it take us? 🌀');
    case 'portalClose': space.portalOpen = false; return nova('Portal closed.');
    case 'ships':
      if (!p.count && p.plural) { setPending({ type: 'shipsCount' }); return nova('How many spaceships? Pick a number from 1 to 8.', { ask: true }); }
      return sendShips(p.count || 1, source);
    case 'blackhole': {
      if (space.bhOn) return nova('The black hole is already here. It is hungry!');
      const n = summonBlackHole(); complete('blackhole', source);
      return nova(n ? `Black hole created! Oh no, it is pulling in ${n} planet${n > 1 ? 's' : ''}! ⚫` : 'Black hole created! Watch it swallow those asteroids! ⚫');
    }
    case 'blackholeOff': space.bhOn = false; return nova('Black hole closed. Phew!');
    case 'warp':
      if (isWarping()) return nova('We are already at warp speed!');
      startWarp(); complete('warp', source); return nova('Warp speed! Hold on tight! ⚡');

    case 'help': {
      const left = LEVELS[L].missions.filter(m => !state.done.has(m.id));
      return nova(left.length ? `Try saying: ${left.map(m => m.say).join(', or ')}.` : 'You finished this level! Say next level.');
    }
    case 'nextLevel':
      if (state.levelDone) return levelComplete();
      return nova(`Finish your missions first! ${LEVELS[L].missions.filter(m => !state.done.has(m.id)).length} left.`);
    case 'reset': resetWorld(); return nova('World reset. Fresh start! ✨');
    case 'greet': return nova("Hi explorer! I'm NOVA, your AI co-pilot. Tell me what to build!");
    case 'whoami': return nova("I'm NOVA. I turn your voice into words, find the meaning, and change the world!");
    case 'thanks': return nova("You're welcome, commander! 😊");
    case 'cancel': return nova('Okay, cancelled.');
    case 'yes': case 'no': return nova('Hmm, I did not ask anything. Give me a command!');
    default: return nova('Hmm, I did not get that. Say: what can I say?');
  }
}
function giveMoon(pl, source) {
  if (!addMoon(pl)) return nova(`${pl.name} already has 3 moons. That's plenty!`);
  space.lastPlanet = pl; complete('moon', source);
  return nova(`${pl.name} now has ${pl.moons.length === 1 ? 'a moon' : pl.moons.length + ' moons'}! 🌙`);
}
function destroyTargets(list, source) {
  list = list.filter(p => p.state === 'alive');
  if (!list.length) return nova('That planet is already gone!');
  list.forEach(explodePlanet); complete('destroy', source);
  return nova(list.length === 1 ? `Boom! ${list[0].name} has been destroyed! 💥` : `Boom! All ${list.length} planets destroyed! 💥`);
}
function sendShips(n, source) {
  const sent = launchShips(n); complete('ships', source);
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
  const now = performance.now(); if (now - lastInputAt < 250) return; lastInputAt = now; // ignore double-fires
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
  if (p.intent === 'unknown') {
    state.streak = 0; hud();
    ui.chip('🤔 Not sure what that means', 'bad');
    const left = LEVELS[state.level].missions.find(m => !state.done.has(m.id));
    nova(`Hmm, I didn't get that. ${left ? `Try saying: ${left.say}.` : 'Say: what can I say?'}`);
    setTimeout(() => ui.setStep(0), 2500);
    return;
  }
  if (source === 'voice') { state.streak++; state.best = Math.max(state.best, state.streak); }
  ui.chip(describe(p) + (confidence ? ` · ${Math.round(confidence * 100)}% sure` : ''), 'good');
  hud();
  const lvl = state.level;
  setTimeout(guard(() => { if (state.level !== lvl || state.busy) return; ui.setStep(4); act(p, source); }), 350);
});
const runTap = guard(m => {
  if (!state.started || state.busy) return;
  if (pending) setPending(null);
  const p = m.tap(); ui.setStep(4); ui.chip(describe(p) + ' · (tapped)', 'good'); act(p, 'tap');
});

// ---------- session
function newSession() {
  resetWorld();
  Object.assign(state, { started: true, score: 0, streak: 0, best: 0, start: performance.now(), levelDone: false, busy: false });
  state.done.clear(); setLevel(1); ui.setStep(0);
  ui.heardPlaceholder('Tap the mic and talk to NOVA…'); ui.chip('🧠 Waiting for your voice');
  nova(LEVELS[1].intro);
}

export function bindUI() {
  initVoice({
    onStart() { ui.setListeningUI(true); ui.setStep(1); ui.banner(''); ui.setHeardLabel('🧑 You said'); ui.heardPlaceholder(pending ? 'Listening for your answer…' : 'Listening… speak now!'); if (!pending) ui.chip('🎧 Listening…'); },
    onInterim(t) { ui.setStep(2); ui.showHeard(t, true); },
    onFinal(alts, conf) { handleInput(alts, conf, 'voice'); },
    onError(code) {
      const msgs = {
        'not-allowed': '🎤 Microphone is blocked. Click the 🔒 icon in the address bar → allow Microphone, then try again.',
        'service-not-allowed': '🎤 Microphone is blocked. Click the 🔒 icon in the address bar → allow Microphone.',
        'network': '📶 Voice recognition needs internet. Tap the mission cards or type instead!',
        'audio-capture': '🎤 No microphone found. Plug one in, or tap the mission cards.',
        'language-not-supported': '🎤 This browser cannot recognise English here. Please use Google Chrome.',
      };
      if (code === 'no-speech') ui.chip("🙉 I didn't hear anything. Tap the mic and speak a bit louder", 'bad');
      else if (code !== 'aborted') ui.banner(msgs[code] || `Voice problem (${code}). Tap the cards or type instead.`);
    },
    onEnd(got, errored) { ui.setListeningUI(false); if (!got && !errored) ui.chip("🙉 Didn't catch that. Tap the mic and try again", 'bad'); if (!got) ui.setStep(0); },
    onUnsupported() { ui.banner('🎤 Voice is not supported in this browser. Open it in Google Chrome or Edge, or tap the cards and type!'); },
    onSpeaking(on) { ui.setSpeaking(on); },
    onBug(err) { ui.reportError(err); },
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
    if (!voice.ttsOn) cancelSpeech();
  };
  $('#resetBtn').onclick = guard(() => { if (!state.busy) { resetWorld(); setPending(null); nova('World reset. Fresh start! ✨'); } });
  $('#lcBtn').onclick = guard(warpToNext);
  document.querySelectorAll('.theme').forEach(b => b.onclick = () => applyTheme(b.dataset.theme));
  $('#startBtn').onclick = guard(() => { if (state.started) return; ui.show('#intro', false); newSession(); });
  // fresh page for every visitor = zero leftover memory, zero leftover state
  $('#againBtn').onclick = () => { location.hash = 'world=' + home.themeKey; location.reload(); };

  addEventListener('keydown', guard(e => {
    if (e.target.tagName === 'INPUT' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Enter' && ui.isShown('#intro')) return $('#startBtn').click();
    if (e.key === 'Enter' && ui.isShown('#levelCard')) return warpToNext();
    if (!state.started) return;
    if (e.code === 'Space') { e.preventDefault(); listen(); }
    const n = +e.key, ms = LEVELS[state.level].missions;
    if (n >= 1 && n <= ms.length) runTap(ms[n - 1]);
    if (e.key.toLowerCase() === 'n' && state.level < 3 && !state.busy) { state.levelDone = true; levelComplete(); } // operator: skip level
  }));
  // pause listening/speaking when the tab is hidden
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelSpeech(); });

  const world = new URLSearchParams(location.hash.slice(1)).get('world');
  applyTheme(THEMES[world] ? world : 'space');
  setLevel(1);
}
