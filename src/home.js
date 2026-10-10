// Level 1: the home-base island, rocket, weather, day/night and the 4 world themes.
import * as THREE from 'three';
import { scene, camera, view } from './scene.js';
import { rand, pick, std, canvasTex } from './util.js';

export const lab = new THREE.Group(); scene.add(lab);
const islandMat = std('#1d2b4f'), rimMat = new THREE.MeshBasicMaterial({ color: '#38e1ff' });
const skySun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), new THREE.MeshBasicMaterial({ color: '#ffd76a', fog: false }));
const skyMoon = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 32), new THREE.MeshBasicMaterial({ color: '#dfe6ff', fog: false }));
skySun.position.set(-40, 32, -60); skyMoon.position.copy(skySun.position);
lab.add(skySun, skyMoon);
{
  const island = new THREE.Mesh(new THREE.CylinderGeometry(9, 6.5, 1.4, 48), islandMat); island.position.y = -0.7;
  const rock = new THREE.Mesh(new THREE.ConeGeometry(6.5, 5, 24), std('#141c33')); rock.rotation.x = Math.PI; rock.position.y = -3.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.08, 8, 96), rimMat); rim.rotation.x = Math.PI / 2;
  lab.add(island, rock, rim);
}

// ---------- rocket
const rocket = new THREE.Group();
{
  const white = std('#f2f5ff', { metalness: 0.2, roughness: 0.4 }), red = std('#ff3b5c');
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 3, 24), white); body.position.y = 1.8;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 24), red); nose.position.y = 3.9;
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshBasicMaterial({ color: '#38e1ff' })); win.position.set(0, 2.5, 0.48);
  rocket.add(body, nose, win);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.7), red);
    const a = i * Math.PI * 2 / 3; fin.position.set(Math.sin(a) * 0.6, 0.75, Math.cos(a) * 0.6); fin.rotation.y = a; rocket.add(fin);
  }
}
const flame = new THREE.Group();
flame.add(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 16), new THREE.MeshBasicMaterial({ color: '#ff8a2b', transparent: true, opacity: 0.85 })));
const core = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1, 16), new THREE.MeshBasicMaterial({ color: '#fff2a8' })); core.position.y = 0.25; flame.add(core);
flame.rotation.x = Math.PI; flame.position.y = -0.5; flame.scale.setScalar(0.001); rocket.add(flame);
const PAD = new THREE.Vector3(-4.5, 0.3, 1.2);
rocket.position.copy(PAD); lab.add(rocket);
// the glow light lives in the scene (not inside `lab`) so hiding the island never changes the light count
const rocketGlow = new THREE.PointLight('#ff8a2b', 0, 18); scene.add(rocketGlow);
const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.3, 32), std('#3a4670', { metalness: 0.5 })); pad.position.set(PAD.x, 0.15, PAD.z); lab.add(pad);

// ---------- rain / bubbles + clouds
const RAIN = 1600, rainArr = new Float32Array(RAIN * 6);
for (let i = 0; i < RAIN; i++) {
  const x = (Math.random() - 0.5) * 26, y = Math.random() * 22, z = (Math.random() - 0.5) * 26;
  rainArr.set([x, y, z, x, y - 0.6, z], i * 6);
}
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: '#a8dcff', transparent: true, opacity: 0 }));
const cloudMat = std('#9aa4c0', { transparent: true, opacity: 0, depthWrite: false });
const clouds = new THREE.Group();
for (const [cx, cz] of [[-5, -2], [3, 2], [0, -6], [6, -4]]) for (let k = 0; k < 5; k++) {
  const p = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random() * 0.9, 16, 16), cloudMat);
  p.position.set(cx + (k - 2) * 1.1, 11 + Math.random() * 0.8, cz + Math.random() * 1.2); clouds.add(p);
}
lab.add(rain, clouds);

// ---------- theme props
function windowsTex(lit, base = '#0b0b18') {
  return canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 4; y < h - 4; y += 10) for (let x = 4; x < w - 4; x += 10) if (Math.random() < 0.55) { g.fillStyle = pick(lit); g.fillRect(x, y, 6, 6); }
  });
}
function building(g, x, z, w, h, mat, edge) {
  const geo = new THREE.BoxGeometry(w, h, w), b = new THREE.Mesh(geo, mat); b.position.set(x, h / 2, z); g.add(b);
  if (edge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edge })); e.position.copy(b.position); g.add(e); }
}
function buildSpace() {
  const g = new THREE.Group();
  for (const [x, z, s] of [[1.5, -4.2, 1.7], [-1.4, -5.6, 1.1], [4.6, -3.4, 1]]) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std('#c9d6ff', { metalness: 0.3, roughness: 0.3, emissive: '#1a3a7a', emissiveIntensity: 0.6 }));
    d.position.set(x, 0, z); g.add(d);
  }
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 4, 8), std('#8090b8', { metalness: 0.6 })); tower.position.set(-2.8, 2, -3.5);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff3b5c' })); blink.position.set(-2.8, 4.1, -3.5);
  g.add(tower, blink);
  g.userData.anim = t => { blink.material.opacity = 1; blink.scale.setScalar(Math.sin(t * 4) > 0 ? 1 : 0.001); };
  return g;
}
function buildCyber() {
  const g = new THREE.Group(), neon = ['#ff4fd8', '#38e1ff', '#ffc94d', '#7cff8a'], lit = ['#ff4fd8', '#38e1ff', '#ffc94d'];
  const mat = new THREE.MeshStandardMaterial({ color: '#2a2040', map: windowsTex(lit), emissive: '#ffffff', emissiveMap: windowsTex(lit), emissiveIntensity: 0.9, roughness: 0.5 });
  [[1, -5, 1.6, 7], [3.5, -3.6, 1.2, 4.5], [-1.6, -6, 1.3, 5.5], [5.6, -1, 1, 3], [-3.2, -4.4, 1, 3.8], [2.2, -1.6, 0.9, 2.5], [6, -4.5, 1.1, 5], [-0.4, -3.2, 0.8, 2]]
    .forEach(([x, z, w, h], i) => building(g, x, z, w, h, mat, neon[i % 4]));
  const tex = canvasTex(512, 128, (c, w, h) => {
    c.font = 'bold 50px Orbitron, Outfit, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff4fd8'; c.shadowBlur = 24; c.fillStyle = '#ff4fd8'; c.fillText('NAMMA BENGALURU', w / 2, h / 2); c.shadowBlur = 0; c.fillStyle = '#fff'; c.fillText('NAMMA BENGALURU', w / 2, h / 2);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  sign.position.set(1, 8.2, -5); g.add(sign);
  g.userData.anim = t => { sign.material.opacity = Math.sin(t * 13) > -0.85 ? 1 : 0.3; sign.lookAt(camera.position.x, sign.position.y, camera.position.z); };
  return g;
}
function buildSmart() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: '#dfeaff', map: windowsTex(['#2f6fd6', '#5aa2ff'], '#e8f0ff'), emissive: '#ffffff', emissiveMap: windowsTex(['#7cc4ff', '#ffe9a8'], '#000000'), emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.25 });
  [[1, -5, 1.5, 5.5], [3.6, -3.4, 1.2, 4], [-1.5, -5.8, 1.2, 4.5], [-3.4, -4, 0.9, 3], [5.8, -1.2, 1, 2.5]].forEach(([x, z, w, h]) => building(g, x, z, w, h, glass));
  const ai = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 7, 24), glass); ai.position.set(-0.2, 3.5, -3); g.add(ai);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color: '#7cff8a' })); halo.position.set(-0.2, 6.2, -3); halo.rotation.x = Math.PI / 2; g.add(halo);
  const hubs = [];
  for (const [x, z] of [[6.5, -4], [-6, -2.5]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 5, 8), std('#f2f5ff')); pole.position.set(x, 2.5, z); g.add(pole);
    const holder = new THREE.Group(); holder.position.set(x, 5, z); g.add(holder);
    const hub = new THREE.Group(); hub.position.z = 0.15; holder.add(hub);
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.04), std('#ffffff')); b.position.y = 1; const arm = new THREE.Group(); arm.rotation.z = i * Math.PI * 2 / 3; arm.add(b); hub.add(arm); }
    hubs.push({ holder, hub });
  }
  for (let i = 0; i < 4; i++) { const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), std('#1b3a8a', { metalness: 0.7, roughness: 0.2, emissive: '#0a2a6a' })); panel.position.set(0.6 + i * 1.4, 0.5, 3.2); panel.rotation.x = -0.5; g.add(panel); }
  g.userData.anim = (t, dt) => { hubs.forEach(({ holder, hub }) => { holder.lookAt(camera.position.x, holder.position.y, camera.position.z); hub.rotation.z += dt * 2; }); halo.rotation.z += dt; };
  return g;
}
function buildOcean() {
  const g = new THREE.Group();
  const glassDome = std('#9ff3ff', { transparent: true, opacity: 0.45, metalness: 0.1, roughness: 0.1, emissive: '#0a5c7a', emissiveIntensity: 0.6 });
  for (const [x, z, s] of [[1.5, -4.2, 2], [-1.6, -5.6, 1.3], [4.6, -3.2, 1.2]]) { const d = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glassDome); d.position.set(x, 0, z); g.add(d); }
  const weeds = [];
  for (let i = 0; i < 16; i++) {
    const a = rand(0, 6.28), r = rand(5.5, 8.5), h = rand(1.5, 3.2);
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.16, h, 6), std(pick(['#2fbf71', '#1f9e5a', '#46e38a']))); w.geometry.translate(0, h / 2, 0);
    w.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.add(w); weeds.push(w);
  }
  for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(rand(0.3, 0.6), 12, 12), std(pick(['#ff6ad5', '#ff9a3d', '#ffc94d']), { flatShading: true })); const a = rand(0, 6.28); c.position.set(Math.cos(a) * rand(3, 7), 0.2, Math.sin(a) * rand(3, 7)); g.add(c); }
  const fish = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Group(), col = pick(['#ffb020', '#ff6ad5', '#3de8ff', '#ffe14d']);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), std(col, { emissive: col, emissiveIntensity: 0.3 })); body.scale.set(0.5, 0.8, 1.3);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), std(col)); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.6;
    f.add(body, tail); g.add(f); fish.push({ f, r: rand(6, 11), h: rand(2, 6), sp: rand(0.3, 0.6) * (i % 2 ? 1 : -1), a: rand(0, 6.28) });
  }
  const at = (o, a) => new THREE.Vector3(Math.sin(a) * o.r, o.h + Math.sin(a * 3) * 0.4, Math.cos(a) * o.r);
  g.userData.anim = (t, dt) => {
    weeds.forEach((w, i) => { w.rotation.z = Math.sin(t * 1.5 + i) * 0.18; });
    fish.forEach(o => { o.a += o.sp * dt; o.f.position.copy(at(o, o.a)); o.f.lookAt(at(o, o.a + o.sp * 0.1)); });
  };
  return g;
}

export const THEMES = {
  space: { name: 'Space Lab', emoji: '🚀', night: '#070b1a', day: '#62b6ff', storm: '#2a3550', ground: '#1d2b4f', rim: '#38e1ff', rain: '#a8dcff', space2: '#040817', space3: '#14061f', props: buildSpace(),
    rainMsg: 'Storm incoming! It is raining on the space lab 🌧️', dayMsg: 'Good morning, explorer! ☀️', nightMsg: 'Night mode. Look at all those stars! 🌙' },
  cyber: { name: 'Cyberpunk Bengaluru', emoji: '🌆', night: '#0d0221', day: '#d9669e', storm: '#2a0f3d', ground: '#1a1030', rim: '#ff4fd8', rain: '#ff9ae8', space2: '#0d0221', space3: '#1a0033', props: buildCyber(),
    rainMsg: 'Neon rain over Bengaluru, just like the monsoon! 🌧️', dayMsg: 'Good morning, Bengaluru! ☀️', nightMsg: 'Night city mode. Look at those neon lights! 🌃' },
  ocean: { name: 'Underwater Base', emoji: '🐠', night: '#021a2b', day: '#0e86b0', storm: '#063247', ground: '#8a7650', rim: '#3de8ff', rain: '#d4f8ff', up: true, space2: '#01141f', space3: '#04102a', props: buildOcean(),
    rainMsg: 'Bubble storm! Watch them float up! 🫧', dayMsg: 'Sunlight is shining down through the water! ☀️', nightMsg: 'Deep sea night. Spooky and quiet! 🌙' },
  smart: { name: 'Smart City', emoji: '🏙️', night: '#0a1228', day: '#7cc4ff', storm: '#3a4a66', ground: '#2e5a3a', rim: '#7cff8a', rain: '#cfe8ff', space2: '#050c1f', space3: '#0f0a24', props: buildSmart(),
    rainMsg: 'Rain is falling! The smart city is saving rainwater 💧', dayMsg: 'Good morning! The solar panels are charging ☀️', nightMsg: 'Night mode. Smart streetlights switched on! 🌙' },
};
Object.values(THEMES).forEach(th => lab.add(th.props));

export const home = { theme: THEMES.space, themeKey: 'space', rk: { phase: 'idle', t: 0, v: 0 }, rainOn: false, rainLevel: 0, rainTimer: 0, flash: 0, isDay: false, dayT: 0 };

// Changes colours/props; sky colours are applied by the caller (they live in scene.js)
export function applyHomeTheme(key) {
  const th = THEMES[key] || THEMES.space;
  home.theme = th; home.themeKey = THEMES[key] ? key : 'space';
  islandMat.color.set(th.ground); rimMat.color.set(th.rim); rain.material.color.set(th.rain);
  for (const k in THEMES) THEMES[k].props.visible = THEMES[k] === th;
  skySun.visible = skyMoon.visible = !th.up;
  return th;
}

export function launchRocket() {
  if (home.rk.phase !== 'idle') return false;
  home.rk.phase = 'countdown'; home.rk.t = 0; return true;
}
export function setRain(on) { home.rainOn = on; if (on) home.rainTimer = 15; }
export function setDay(on) { home.isDay = on; }
export function resetHome() {
  Object.assign(home.rk, { phase: 'idle', t: 0, v: 0 });
  rocket.position.copy(PAD); flame.scale.setScalar(0.001); rocketGlow.intensity = 0;
  home.rainOn = false; home.isDay = false;
}
export function setHomeLevel(level) {
  lab.visible = level === 1;
  if (level !== 1) { resetHome(); home.rainLevel = 0; home.dayT = 0; }
}

export function updateHome(dt, t, level) {
  const rk = home.rk;
  if (rk.phase === 'countdown') {
    rk.t += dt; flame.scale.setScalar(Math.min(1, rk.t) * (0.8 + Math.random() * 0.3)); rocketGlow.intensity = 30 * Math.min(1, rk.t);
    rocket.position.x = PAD.x + (Math.random() - 0.5) * 0.06; view.shake = Math.max(view.shake, 0.08);
    if (rk.t > 1.2) { rk.phase = 'flying'; rk.v = 0; rocket.position.x = PAD.x; }
  } else if (rk.phase === 'flying') {
    rk.v += dt * 14; rocket.position.y += rk.v * dt; flame.scale.setScalar(1 + Math.random() * 0.4);
    view.shake = Math.max(view.shake, 0.15 - rocket.position.y * 0.004);
    if (rocket.position.y > 70) { rk.phase = 'gone'; rk.t = 0; }
  } else if (rk.phase === 'gone') {
    rk.t += dt; rocketGlow.intensity = 0; if (rk.t > 2.5) { rk.phase = 'landing'; rocket.position.y = 25; }
  } else if (rk.phase === 'landing') {
    rocket.position.y = PAD.y + (rocket.position.y - PAD.y) * Math.pow(0.25, dt);
    flame.scale.setScalar(0.5 + Math.random() * 0.2); rocketGlow.intensity = 12;
    if (rocket.position.y - PAD.y < 0.03) { rocket.position.y = PAD.y; rk.phase = 'idle'; flame.scale.setScalar(0.001); rocketGlow.intensity = 0; }
  }
  rocketGlow.position.set(rocket.position.x, rocket.position.y - 0.5, rocket.position.z);
  if (level !== 1) rocketGlow.intensity = 0;

  const th = home.theme;
  if (home.rainOn) { home.rainTimer -= dt; if (home.rainTimer <= 0) home.rainOn = false; }
  const rainTarget = home.rainOn ? 1 : th.up && level === 1 ? 0.25 : 0;
  home.rainLevel += (rainTarget - home.rainLevel) * Math.min(1, dt * 2);
  rain.visible = clouds.visible = home.rainLevel > 0.01;
  rain.material.opacity = home.rainLevel * 0.7; cloudMat.opacity = th.up ? 0 : home.rainLevel * 0.9;
  if (rain.visible) {
    const v = th.up ? 6 : -24;
    for (let i = 0; i < RAIN; i++) {
      const k = i * 6; rainArr[k + 1] += v * dt; rainArr[k + 4] += v * dt;
      if (rainArr[k + 4] < 0) { rainArr[k + 1] += 22; rainArr[k + 4] += 22; } else if (rainArr[k + 4] > 22) { rainArr[k + 1] -= 22; rainArr[k + 4] -= 22; }
    }
    rainGeo.attributes.position.needsUpdate = true;
    if (home.rainLevel > 0.6 && !th.up && Math.random() < dt * 0.4) home.flash = 1;
  }
  home.flash *= Math.pow(0.02, dt);
  home.dayT += ((home.isDay ? 1 : 0) - home.dayT) * Math.min(1, dt * 1.5);
  skySun.scale.setScalar(Math.max(0.001, home.dayT)); skyMoon.scale.setScalar(Math.max(0.001, 1 - home.dayT));
  if (lab.visible) th.props.userData.anim?.(t, dt);
}
