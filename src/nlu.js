// Natural-language understanding: turns a sentence into { intent, details }.
// Pure functions only (no DOM / 3D), so it is unit-tested in nlu.test.js.
// ctx = { level, planets: [alive planets {name, colorName, size}], lastPlanet }

export const COLORS = { red: '#ff4d5e', blue: '#4d8bff', green: '#46e38a', yellow: '#ffe14d', orange: '#ff9a3d', purple: '#a35bff', violet: '#8f5bff', pink: '#ff6ad5', white: '#eef2ff', cyan: '#3de8ff', gold: '#ffc94d', golden: '#ffc94d', brown: '#a0703c', grey: '#9aa0aa', gray: '#9aa0aa', silver: '#c8ccd6', black: '#3a3a48' };
export const SIZES = { tiny: 0.55, small: 0.7, little: 0.7, medium: 1, big: 1.6, large: 1.6, huge: 2.1, giant: 2.1, massive: 2.1, gigantic: 2.1, enormous: 2.1 };
export const NUMS = { one: 1, a: 1, an: 1, single: 1, two: 2, to: 2, too: 2, couple: 2, three: 3, four: 4, for: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, fifty: 50, hundred: 100, thousand: 1000, million: 1000000 };

export const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
export const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = w => new RegExp(`\\b${reEsc(w)}\\b`);

const VERBS = 'create make build spawn add generate bring summon give put new draw form destroy delete remove blow explode kill smash erase crash eliminate launch open close send turn';
const NAME_STOP = new Set(('and with that which please the a an to it of in on now too also then planet planets moon one big small ' + VERBS + ' ' + Object.keys(COLORS).join(' ') + ' ' + Object.keys(SIZES).join(' ')).split(' '));

export function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// "named Kelly", "called Bob", "name it Astra", or "planet Kelly" (when the mic capitalises it)
export function extractName(raw) {
  raw = String(raw ?? '');
  let words = null;
  const m = raw.match(/\b(?:named|called|name it|name is|call it|with the name)\s+(.+)$/i);
  if (m) words = m[1].split(/\s+/);
  else { const m2 = raw.match(/\bplanets?\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)?)/); if (m2) words = m2[1].split(/\s+/); }
  if (!words) return null;
  const out = [];
  for (const w0 of words) {
    const w = w0.replace(/[^\p{L}\p{N}'-]/gu, '').slice(0, 14); if (!w) continue;
    if (NAME_STOP.has(w.toLowerCase())) { if (out.length) break; continue; }
    out.push(w[0].toUpperCase() + w.slice(1)); if (out.length === 2) break;
  }
  return out.join(' ') || null;
}

export function extractCount(t) {
  t = norm(t);
  const d = t.match(/\b(\d+)\b/); if (d) return +d[1];                       // "3 ships"
  const AMBIG = ['a', 'an', 'to', 'too', 'for'];
  const w = t.split(' ').find(x => NUMS[x] && !AMBIG.includes(x)); if (w) return NUMS[w]; // "five", "a hundred"
  const m = t.match(/\b(a|an|to|too|for)\s+(?:\w+\s+)?(?:space ?ships?|ships?|ufos?|rockets?|spacecrafts?)\b/); // "a ship", "to ships" (mic for "two")
  return m ? NUMS[m[1]] : null;
}

// Which planet is the sentence about? Tolerates small mic spelling mistakes ("Kelley" -> Kelly).
export function findPlanet(t, planets = []) {
  t = norm(t);
  let best = null, bd = 99;
  const words = t.split(' ').filter(w => w && !NAME_STOP.has(w));
  for (const p of planets) {
    const n = norm(p.name); if (!n) continue;
    if (word(n).test(t)) return p;
    const first = n.split(' ')[0]; if (first.length < 4) continue;
    const tol = first.length >= 6 ? 2 : 1;
    for (const w of words) { const d = lev(w, first); if (d <= tol && d < bd) { bd = d; best = p; } }
  }
  return best;
}

export function resolveTarget(raw, ctx) {
  const t = norm(raw), live = ctx.planets || [];
  if (!live.length) return null;
  if (/\b(all|every|everything|all of them)\b/.test(t)) return 'all';
  const named = findPlanet(t, live); if (named) return named;
  const col = Object.keys(COLORS).find(c => word(c).test(t));
  if (col) { const c = live.filter(p => COLORS[p.colorName] === COLORS[col]); if (c.length) return c.at(-1); }
  if (/\b(first|oldest)\b/.test(t)) return live[0];
  if (/\b(last|newest|latest|recent|new one)\b/.test(t)) return live.at(-1);
  if (/\b(biggest|largest)\b/.test(t)) return live.reduce((a, b) => a.size > b.size ? a : b);
  if (/\b(smallest|tiniest)\b/.test(t)) return live.reduce((a, b) => a.size < b.size ? a : b);
  if (/\b(it|this one|that one|this planet|that planet)\b/.test(t) && ctx.lastPlanet) return ctx.lastPlanet;
  return null;
}

export function parse(raw, ctx) {
  raw = String(raw ?? '').slice(0, 300);
  const t = norm(raw), kw = [];
  const m = re => { const r = t.match(re); if (r) { kw.push(r[0]); return true; } return false; };
  const color = Object.keys(COLORS).find(c => word(c).test(t)) || null;
  const size = Object.keys(SIZES).find(s => word(s).test(t)) || null;
  const grow = /\b(bigger|larger|grow)\b/.test(t) ? 'bigger' : /\b(smaller|shrink|tinier)\b/.test(t) ? 'smaller' : null;
  const isCreate = m(/\b(create|make|build|spawn|add|generate|bring|summon|give|put|draw|form|new)\b/);
  const isDestroy = m(/\b(destroy|delete|remove|blow up|blow|explode|kill|smash|erase|crash|eliminate|get rid of|vanish)\b/);
  const live = ctx.planets || [];
  const planetRef = findPlanet(t, live);
  if (planetRef) kw.push(norm(planetRef.name));
  const out = (intent, extra = {}) => ({ intent, kw, ...extra });

  if (!t) return out('unknown');
  if (m(/\b(help|what can i (say|do)|what should i say|commands)\b/)) return out('help');
  if (m(/\b(next level|skip level|level up)\b/)) return out('nextLevel');
  if (m(/\b(reset|restart|start over|clear everything)\b/)) return out('reset');
  if (m(/\b(cancel|never ?mind|forget it)\b/)) return out('cancel');
  if (m(/\b(how many planets|list (the )?planets|which planets|what planets)\b/)) return out('countPlanets');
  const world = Object.keys(WORLDS).find(k => WORLDS[k].test(t));
  if (world && (m(TRAVEL) || !isCreate)) { kw.push(t.match(WORLDS[world])[0]); return out('travel', { world }); }
  if (m(/\b(another|next|different|other) (world|theme)\b|\b(change|switch) (the )?(world|theme)\b|\bthrough the portal\b/)) return out('travel', { world: null });
  if (m(/\bblack ?holes?\b/)) return out(isDestroy || m(/\b(close|stop|remove)\b/) ? 'blackholeOff' : 'blackhole');
  if (m(/\b(warp|hyper ?space|hyper ?drive|light ?speed)\b/)) return out('warp');
  if (m(/\b(photo|picture|screenshot|selfie|cheese|snapshot)\b/)) return out('photo');
  if (m(/\b(snow|snowing|snowfall|blizzard)\b/)) return out('snow');
  if (m(/\b(lightning|thunder|thunderbolt|bolt)\b/)) return out('lightning');
  if (m(/\brainbow\b/)) return out('rainbow');
  if (m(/\b(meteors?|meteor shower|shooting stars?|comets?)\b/)) return out('meteors');
  if (m(/\b(aurora|northern lights|southern lights)\b/)) return out('aurora');
  if (m(/\b(ufo|ufos|alien|aliens|flying saucer)\b/)) return out('ufo');
  if (m(/\b(earthquake|quake|tremor)\b/)) return out('earthquake');
  if (m(/\b(disco|dance|dancing|dj|laser show)\b/)) return out('disco');
  if (m(/\bzoom ?(in|out)\b|\b(closer|further|farther|zoom)\b/)) return out('zoom', { dir: /\b(out|further|farther)\b/.test(t) ? 'out' : 'in' });
  if (m(/\b(spin|rotate|turn around|go around|look around)\b/)) return out('spin');

  if (m(/\b(portal|wormhole|gate|teleport)\b/)) return out(m(/\b(close|shut)\b/) || isDestroy ? 'portalClose' : 'portal');
  if (m(/\b(space ?ships?|ships?|fleet|spacecrafts?)\b/) || (ctx.level === 3 && m(/\brockets?\b/)))
    return out('ships', { count: extractCount(t), plural: /(ships|fleet|rockets|crafts)\b/.test(t) });
  if (m(/\bmoons?\b/) && (isCreate || planetRef || /\b(to|for)\b/.test(t))) return out('moon', { target: resolveTarget(raw, ctx) });
  if (isDestroy && !/\b(rain|storm|clouds?|weather|bubbles?)\b/.test(t)) { m(/\b(planets?|worlds?)\b/); return out('destroy', { target: resolveTarget(raw, ctx) }); }
  if (m(/\b(planets?|worlds?)\b/) || planetRef) {
    const name = extractName(raw);
    if (planetRef && !name && !/\b(new|another)\b/.test(t) && (color || size || grow)) return out('modify', { target: planetRef, color, size, grow });
    if (isCreate || /\bplanet\b/.test(t)) return out('createPlanet', { name, color, size });
  }
  if ((color || size || grow) && /\b(it|that|this)\b/.test(t) && ctx.lastPlanet && ctx.level >= 2) return out('modify', { target: ctx.lastPlanet, color, size, grow });
  if (m(/\b(rain|raining|storm|weather|clouds?|cloudy|thunder|drizzle|bubbles?)\b/)) return out(/\b(stop|no|end|clear|remove|delete|off|destroy|kill)\b/.test(t) ? 'rainOff' : 'rain');
  if (m(/\b(night|dark|evening)\b/)) return out('night');
  if (m(/\b(day|daytime|sunrise|sunny|morning|bright)\b/)) return out('day');
  if (m(/\b(rocket|launch|blast off|blast|lift ?off|take ?off)\b/)) return out('rocket');
  if (m(/\b(fireworks?|celebrate|celebration|party|diwali)\b/)) return out('fireworks');
  if (m(/\b(hello|hi|hey|namaste)\b/)) return out('greet');
  if (m(/\b(your name|who are you|what are you)\b/)) return out('whoami');
  if (m(/\b(thank you|thanks|thank)\b/)) return out('thanks');
  if (m(/\b(yes|yeah|yep|sure|do it|okay|ok|confirm)\b/)) return out('yes');
  if (m(/\b(no|nope|don t|stop)\b/)) return out('no');
  return out('unknown');
}

// The four worlds visitors can travel between
export const WORLDS = { cyber: /\b(cyber ?punk|bengaluru|bangalore|neon city)\b/, ocean: /\b(under ?water|ocean|deep sea|sea base)\b/, smart: /\bsmart city\b/, space: /\bspace lab\b/ };
const TRAVEL = /\b(go|take|travel|switch|change|teleport|move|visit|fly|jump|send|bring)\b/;

export const INTENT_NAMES = { travel: 'TRAVEL TO WORLD', snow: 'MAKE IT SNOW', lightning: 'LIGHTNING STRIKE', rainbow: 'RAINBOW', earthquake: 'EARTHQUAKE', meteors: 'METEOR SHOWER', aurora: 'AURORA', ufo: 'SUMMON UFO', disco: 'DISCO MODE', zoom: 'ZOOM CAMERA', spin: 'SPIN CAMERA', photo: 'TAKE A PHOTO', createPlanet: 'CREATE PLANET', destroy: 'DESTROY PLANET', moon: 'ADD MOON', modify: 'CHANGE PLANET', ships: 'LAUNCH SPACESHIPS', rocket: 'LAUNCH ROCKET', rain: 'START RAIN', rainOff: 'STOP RAIN', day: 'MAKE DAY', night: 'MAKE NIGHT', fireworks: 'FIREWORKS', portal: 'OPEN PORTAL', portalClose: 'CLOSE PORTAL', blackhole: 'CREATE BLACK HOLE', blackholeOff: 'REMOVE BLACK HOLE', warp: 'WARP SPEED', help: 'ASK FOR HELP', greet: 'SAY HELLO', whoami: 'ASK NOVA', thanks: 'SAY THANKS', countPlanets: 'COUNT PLANETS', nextLevel: 'NEXT LEVEL', reset: 'RESET WORLD', cancel: 'CANCEL', yes: 'YES', no: 'NO', unknown: 'UNKNOWN' };
// which levels each action works in
export const AVAIL = { snow: [1], lightning: [1], rainbow: [1], earthquake: [1], rocket: [1], rain: [1], rainOff: [1], day: [1], night: [1], createPlanet: [2, 3], destroy: [2, 3], moon: [2, 3], modify: [2, 3], countPlanets: [2, 3], portal: [3], portalClose: [3], ships: [3], blackhole: [3], blackholeOff: [3], warp: [3] };

export function describe(p) {
  const d = [];
  if (p.name) d.push(`name: ${p.name}`);
  if (p.color) d.push(`colour: ${p.color}`);
  if (p.size) d.push(`size: ${p.size}`);
  if (p.grow) d.push(`size: ${p.grow}`);
  if (p.count) d.push(`number: ${p.count}`);
  if (p.world) d.push(`world: ${p.world}`);
  if (p.dir) d.push(`direction: ${p.dir}`);
  if (p.target) d.push(`planet: ${p.target === 'all' ? 'all' : p.target.name}`);
  return `🧠 ${INTENT_NAMES[p.intent] || p.intent}${d.length ? ' · ' + d.join(' · ') : ''}`;
}
