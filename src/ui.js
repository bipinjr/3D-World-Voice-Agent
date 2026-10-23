// DOM helpers. No game logic here.
import { $ } from './util.js';
import { reEsc } from './nlu.js';
import { icon, MISSION_ART } from './icons.js';

const heardEl = $('#heard'), aiEl = $('#ai'), micBtn = $('#mic');
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function chip(text, kind = '') { aiEl.textContent = text; aiEl.className = 'ai-chip ' + kind; return true; }
export function showHeard(text, interim, kws = []) {
  let html = esc(String(text).slice(0, 200));
  const k = [...new Set(kws.filter(Boolean).map(String))].filter(w => w.length > 1).sort((a, b) => b.length - a.length);
  if (k.length) html = html.replace(new RegExp(`\\b(${k.map(reEsc).join('|')})\\b`, 'gi'), '<mark>$1</mark>');
  heardEl.innerHTML = `“${html}”`; heardEl.className = 'heard-text' + (interim ? ' interim' : '');
}
export function heardPlaceholder(text) { heardEl.textContent = text; heardEl.className = 'heard-text interim'; }
export function setHeardLabel(t) { $('#heardLabel').textContent = t; }

let stepTimer;
export function setStep(n) {
  document.querySelectorAll('.step').forEach(s => { const k = +s.dataset.step; s.classList.toggle('active', k === n); s.classList.toggle('done', k < n); });
  clearTimeout(stepTimer);
  if (n >= 4) stepTimer = setTimeout(() => setStep(n === 4 ? 5 : 0), n === 4 ? 700 : 2800);
}
let toastTimer;
export function toast(msg, ic = '') {
  const el = $('#toast'); el.innerHTML = (ic ? icon(ic) : '') + `<span>${esc(msg)}</span>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}
export function popPoints(pts) {
  const r = $('#score').getBoundingClientRect(), el = document.createElement('div');
  el.className = 'pop'; el.textContent = `+${pts}`; el.style.left = r.left + 'px'; el.style.top = r.bottom + 4 + 'px';
  document.body.append(el); setTimeout(() => el.remove(), 1300);
}
export function banner(msg) { const b = $('#banner'); b.textContent = msg || ''; b.classList.toggle('show', !!msg); }
export function setAskUI(on) {
  micBtn.classList.toggle('asking', on);
  $('#micHint').classList.toggle('asking', on);
  $('#micHint').innerHTML = on ? 'NOVA asked you<br>a question — answer! 👂' : 'then speak<br>clearly 🗣️';
  if (on) chip('❓ NOVA is waiting for your answer', 'ask');
}
export function setListeningUI(on) {
  micBtn.classList.toggle('listening', on); micBtn.setAttribute('aria-pressed', on);
  micBtn.setAttribute('aria-label', on ? 'Stop listening' : 'Start listening');
}
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
// NOVA's reply types out live (≤ 0.7 s, so she never lags behind the action)
let typeTimer = 0;
export function setNovaText(t) {
  const el = $('#novaText'); clearInterval(typeTimer);
  if (calm) { el.textContent = t; return; }
  const chars = [...t], step = Math.max(1, Math.ceil(chars.length / 40)); let n = 0;
  typeTimer = setInterval(() => { n = Math.min(chars.length, n + step); el.textContent = chars.slice(0, n).join(''); if (n >= chars.length) clearInterval(typeTimer); }, 16);
}
// numbers roll up instead of jumping
function countUp(el, to) {
  const from = +el.dataset.v || 0; el.dataset.v = to;
  if (calm || from === to) { el.textContent = to; return; }
  const t0 = performance.now();
  const tick = now => { const k = Math.min(1, (now - t0) / 600), e = 1 - (1 - k) ** 3; el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
export function setSpeaking(on) { $('#nova').classList.toggle('speaking', on); }

export function renderCards(title, L, onTap, titleIcon = 'target') {
  $('#missionsTitle').innerHTML = icon(titleIcon) + `<span>${esc(title)}</span>`;
  $('#freeTip').innerHTML = '💬 ' + L.free;
  const cards = $('#cards'); cards.innerHTML = '';
  L.missions.forEach((m, i) => {
    const [ic, c1, c2] = MISSION_ART[m.id] || ['sparkles', '#38e1ff', '#ff4fd8'];
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.id = m.id; b.title = `Shortcut: key ${i + 1}`; b.style.setProperty('--i', i);
    b.style.setProperty('--c1', c1); b.style.setProperty('--c2', c2);
    b.innerHTML = `<span class="idx">${String(i + 1).padStart(2, '0')}</span><span class="em">${icon(ic)}</span>`
      + `<span class="txt"><b>${esc(m.title)}</b><small>${icon('mic', 'tiny')}<q>${esc(m.say)}</q></small></span>`
      + `<span class="xp">+100 XP</span><span class="tick">${icon('check')}</span>`;
    b.onclick = () => onTap(m);
    cards.append(b);
  });
}
export function updateHud(state, L, label) {
  const total = L.missions.length, done = L.missions.filter(m => state.done.has(m.id)).length;
  countUp($('#score'), state.score);
  $('#streak').textContent = `🔥 ${state.streak}`;
  $('#doneCount').textContent = L.progress ? L.progress() : `${done}/${total}`;
  $('#bar').style.width = ((L.ratio ? L.ratio() : total ? done / total : 0) * 100) + '%';
  $('#lvlName').textContent = label;
  document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i < state.level));
  let next = true; // first unfinished mission glows as NEXT
  document.querySelectorAll('.card').forEach(c => {
    const d = state.done.has(c.dataset.id); c.classList.toggle('done', d);
    c.classList.toggle('next', !d && next); if (!d) next = false;
  });
}
export function flashCard(id) {
  const card = document.querySelector(`.card[data-id="${id}"]`); if (!card) return;
  card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
}
export const show = (sel, on) => $(sel).classList.toggle('hidden', !on);
export const isShown = sel => !$(sel).classList.contains('hidden');

// ---------- error reporting: never silent, never fatal unless the 3D view is truly gone
const errors = [];
export function reportError(err) {
  const msg = String(err?.stack || err?.message || err).slice(0, 2000);
  console.error(err);
  if (errors.length < 50) errors.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  const b = $('#errBadge'); b.hidden = false;
  b.textContent = `⚠ ${errors.length} glitch${errors.length > 1 ? 'es' : ''} recovered · tap to copy details`;
}
$('#errBadge').onclick = () => {
  const text = errors.join('\n\n');
  (navigator.clipboard?.writeText(text) ?? Promise.reject()).then(() => toast('Error details copied 📋'), () => prompt('Copy these details:', text));
};
export function showFatal() { show('#fatal', true); }
$('#restartBtn').onclick = () => location.reload();

// confetti for level-ups and the finish screen (skipped for reduced motion)
export function confetti(n = 90) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div'); box.className = 'confetti';
  const colors = ['#38e1ff', '#ff4fd8', '#ffc94d', '#7cff8a', '#a78bfa'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw'; p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.6 + 's'; p.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
    p.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg'); p.style.setProperty('--x', (Math.random() * 30 - 15) + 'vw');
    box.append(p);
  }
  document.body.append(box); setTimeout(() => box.remove(), 4500);
}
