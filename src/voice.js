// Voice in (Web Speech recognition) and voice out (speech synthesis), hardened for Chrome quirks:
// double-starts, permission prompts, missing `onend`, NOVA hearing herself, unsupported browsers.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

export const voice = { supported: !!SR, listening: false, ttsOn: true };
let rec = null, h = {}, starting = false, startTimer = 0, gotResult = false, errored = false;

export function initVoice(handlers) {
  h = handlers;
  if (!SR) return;
  try {
    rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = true; rec.maxAlternatives = 3; rec.continuous = false;
  } catch { rec = null; voice.supported = false; return; }
  rec.onstart = () => { starting = false; clearTimeout(startTimer); voice.listening = true; safe(h.onStart); };
  rec.onresult = e => {
    const res = e.results[e.results.length - 1]; if (!res) return;
    if (!res.isFinal) return safe(h.onInterim, res[0]?.transcript || '');
    if (gotResult) return;
    gotResult = true;
    const alts = Array.from(res, a => (a.transcript || '').trim()).filter(Boolean);
    if (alts.length) safe(h.onFinal, alts, res[0].confidence || 0);
  };
  rec.onerror = e => { errored = true; safe(h.onError, e.error); };
  rec.onend = () => { starting = false; clearTimeout(startTimer); voice.listening = false; safe(h.onEnd, gotResult, errored); };
}

function safe(fn, ...args) { try { fn?.(...args); } catch (err) { h.onBug?.(err); } }

export function listen() {
  if (!rec) return safe(h.onUnsupported);
  if (voice.listening || starting) { try { rec.stop(); } catch { /* not running */ } return; }
  cancelSpeech(); // so NOVA doesn't hear herself
  gotResult = false; errored = false; starting = true;
  try { rec.start(); }
  catch { setTimeout(() => { try { rec.start(); } catch { starting = false; } }, 300); } // Chrome needs a beat after the last session
  clearTimeout(startTimer);
  // if the permission prompt is ignored, let the mic button work again
  startTimer = setTimeout(() => { starting = false; }, 15000);
}
export const stopListening = () => { try { rec?.abort(); } catch { /* idle */ } };

// ---------- NOVA's voice
let novaVoice = null, speakSeq = 0;
function pickVoice() {
  const vs = synth?.getVoices() || [];
  novaVoice = vs.find(v => /en-IN/i.test(v.lang) && /female|heera|neerja/i.test(v.name))
    || vs.find(v => /Google UK English Female|Microsoft (Aria|Jenny|Zira)|Samantha/i.test(v.name))
    || vs.find(v => /en-IN/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (synth) { pickVoice(); synth.addEventListener?.('voiceschanged', pickVoice); }

// onDone fires exactly once, when NOVA finishes (or immediately if muted). Never fires if superseded.
export function speak(text, onDone) {
  const seq = ++speakSeq; let done = false;
  const finish = () => { if (done || seq !== speakSeq) return; done = true; safe(h.onSpeaking, false); safe(onDone); };
  const clean = String(text).replace(/[^\p{L}\p{N}\s.,!?'":;-]/gu, '').trim();
  if (!voice.ttsOn || !synth || !clean) { setTimeout(finish, 300); return; }
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    if (novaVoice) u.voice = novaVoice;
    u.lang = novaVoice?.lang || 'en-IN'; u.rate = 1.05; u.pitch = 1.1;
    u.onstart = () => { if (seq === speakSeq) safe(h.onSpeaking, true); };
    u.onend = finish;
    u.onerror = () => { if (seq === speakSeq) finish(); };
    synth.speak(u);
    if (synth.paused) synth.resume();
  } catch { setTimeout(finish, 300); }
  // Chrome sometimes never fires onend; never wait forever
  setTimeout(finish, 2500 + clean.length * 90);
}
export function cancelSpeech() {
  speakSeq++;
  try { synth?.cancel(); } catch { /* ignore */ }
  safe(h.onSpeaking, false);
}
