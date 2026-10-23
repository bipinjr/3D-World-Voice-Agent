// Voice in (Web Speech recognition) and voice out (speech synthesis), hardened for Chrome quirks:
// double-starts, permission prompts, missing `onend`, NOVA hearing herself, unsupported browsers.
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;

export const voice = { supported: !!SR, listening: false, ttsOn: true };
let rec = null, h = {}, starting = false, startTimer = 0, gotResult = false, errored = false, lastFinal = -1;

export function initVoice(handlers) {
  h = handlers;
  pickVoice(); // voices may already be loaded: tell the UI
  if (!SR) return;
  try {
    rec = new SR();
    rec.lang = 'en-IN'; rec.interimResults = true; rec.maxAlternatives = 3; rec.continuous = false;
  } catch { rec = null; voice.supported = false; return; }
  rec.onstart = () => { starting = false; clearTimeout(startTimer); voice.listening = true; safe(h.onStart); };
  rec.onresult = e => {
    for (let i = e.resultIndex || 0; i < e.results.length; i++) {
      const res = e.results[i]; if (!res) continue;
      if (!res.isFinal) { safe(h.onInterim, res[0]?.transcript || '', i); continue; }
      if (i <= lastFinal) continue; // Chrome sometimes repeats a final result
      lastFinal = i; gotResult = true;
      const alts = Array.from(res, a => (a.transcript || '').trim()).filter(Boolean);
      if (alts.length) safe(h.onFinal, alts, res[0].confidence || 0, i);
    }
  };
  rec.onerror = e => { errored = true; safe(h.onError, e.error); };
  rec.onend = () => { starting = false; clearTimeout(startTimer); voice.listening = false; safe(h.onEnd, gotResult, errored); };
}

function safe(fn, ...args) { try { fn?.(...args); } catch (err) { h.onBug?.(err); } }

export function listen() {
  if (!rec) return safe(h.onUnsupported);
  if (voice.listening || starting) { try { rec.stop(); } catch { /* not running */ } return; }
  cancelSpeech(); // so NOVA doesn't hear herself
  gotResult = false; errored = false; lastFinal = -1; starting = true;
  try { rec.start(); }
  catch { setTimeout(() => { try { rec.start(); } catch { starting = false; } }, 300); } // Chrome needs a beat after the last session
  clearTimeout(startTimer);
  // if the permission prompt is ignored, let the mic button work again
  startTimer = setTimeout(() => { starting = false; }, 15000);
}
export const stopListening = () => { try { rec?.abort(); } catch { /* idle */ } };
// continuous = the mic stays open between phrases (speed challenge)
export function setContinuous(on) { if (rec && rec.continuous !== on) { stopListening(); rec.continuous = on; } }

// ---------- NOVA's voice
let novaVoice = null, speakSeq = 0;
// Best-sounding voices first: neural "Natural" voices (Edge), then Google's, then the rest
const VOICE_KEY = 'ctf.voice';
const RANK = [
  v => /en-IN/i.test(v.lang) && /natural|neural/i.test(v.name),
  v => /natural|neural/i.test(v.name) && /aria|jenny|ava|emma|sonia|libby|natasha|michelle|clara|neerja/i.test(v.name),
  v => /natural|neural/i.test(v.name),
  v => /Google UK English Female/i.test(v.name),
  v => /Google US English/i.test(v.name),
  v => /en-IN/i.test(v.lang) && /heera|neerja|female/i.test(v.name), // NOVA is female
  v => /Zira|Aria|Jenny|Samantha/i.test(v.name),
  v => /en-IN/i.test(v.lang),
  v => /Zira|Heera|Aria|Jenny|Samantha|Karen|Moira|Tessa/i.test(v.name),
  v => true,
];
export const englishVoices = () => (synth?.getVoices() || []).filter(v => /^en/i.test(v.lang));
export const isNatural = v => /natural|neural|google/i.test(v?.name || '');
function pickVoice() {
  const vs = englishVoices(); let saved = null;
  try { saved = localStorage.getItem(VOICE_KEY); } catch { /* storage blocked */ }
  novaVoice = vs.find(v => v.name === saved) || RANK.map(f => vs.find(f)).find(Boolean) || null;
  safe(h.onVoices);
}
export function setVoiceName(name) {
  novaVoice = englishVoices().find(v => v.name === name) || novaVoice;
  try { localStorage.setItem(VOICE_KEY, name); } catch { /* storage blocked */ }
}
export const currentVoice = () => novaVoice?.name || '';
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
    u.lang = novaVoice?.lang || 'en-IN';
    const natural = isNatural(novaVoice); u.rate = natural ? 1.02 : 1.05; u.pitch = natural ? 1.0 : 1.1; // neural voices sound best untouched
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
