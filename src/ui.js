// DOM helpers. No game logic here.
import { $ } from './util.js';
import { reEsc } from './nlu.js';

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
export function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
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
export function setNovaText(t) { $('#novaText').textContent = t; }
export function setSpeaking(on) { $('#nova').classList.toggle('speaking', on); }

export function renderCards(levelNum, L, onTap) {
  $('#missionsTitle').textContent = `🎯 Level ${levelNum} missions`;
  $('#freeTip').innerHTML = '💬 ' + L.free;
  const cards = $('#cards'); cards.innerHTML = '';
  L.missions.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.id = m.id; b.title = `Shortcut: key ${i + 1}`;
    b.innerHTML = `<span class="em">${m.emoji}</span><span><b>${m.title}</b><small>Say: <q>${m.say}</q></small></span><span class="tick">✓</span>`;
    b.onclick = () => onTap(m);
    cards.append(b);
  });
}
export function updateHud(state, L) {
  const done = L.missions.filter(m => state.done.has(m.id)).length;
  $('#score').textContent = state.score;
  $('#streak').textContent = `🔥 ${state.streak}`;
  $('#doneCount').textContent = `${done}/${L.missions.length}`;
  $('#bar').style.width = (done / L.missions.length * 100) + '%';
  $('#lvlName').textContent = `LEVEL ${state.level} · ${L.name.toUpperCase()}`;
  document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i < state.level));
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('done', state.done.has(c.dataset.id)));
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
