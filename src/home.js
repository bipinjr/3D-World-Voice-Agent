// Level 1: the home-base island, rocket, weather, day/night and the 4 world themes.
import * as THREE from 'three';
import { scene, camera, view, glowTex } from './scene.js';
import { rand, pick, std, canvasTex } from './util.js';

export const lab = new THREE.Group(); scene.add(lab);
const islandMat = std('#1d2b4f'), rimMat = new THREE.MeshBasicMaterial({ color: '#38e1ff' });
const gridMat = new THREE.MeshBasicMaterial({ color: '#38e1ff', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, map: canvasTex(512, 512, (g, w) => {
  g.strokeStyle = '#fff'; g.lineWidth = 2;
  for (let r = 40; r < w / 2; r += 36) { g.globalAlpha = 0.5 + (r / w); g.beginPath(); g.arc(w / 2, w / 2, r, 0, Math.PI * 2); g.stroke(); }
  g.globalAlpha = 0.35; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 40, w / 2 + Math.sin(a) * 40); g.lineTo(w / 2 + Math.cos(a) * w / 2, w / 2 + Math.sin(a) * w / 2); g.stroke(); }
}) });
const skySun = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 32), new THREE.MeshBasicMaterial({ color: '#ffd76a', fog: false }));
const skyMoon = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 32), new THREE.MeshBasicMaterial({ color: '#dfe6ff', fog: false }));
skySun.position.set(-40, 32, -60); skyMoon.position.copy(skySun.position);
lab.add(skySun, skyMoon);
{
  const island = new THREE.Mesh(new THREE.CylinderGeometry(9, 6.5, 1.4, 48), islandMat); island.position.y = -0.7;
  const rock = new THREE.Mesh(new THREE.ConeGeometry(6.5, 5, 24), std('#141c33')); rock.rotation.x = Math.PI; rock.position.y = -3.9;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.08, 8, 96), rimMat); rim.rotation.x = Math.PI / 2;
  lab.add(island, rock, rim);
  // hologram grid on the ground, tinted with the world colour
  const grid = new THREE.Mesh(new THREE.RingGeometry(0.6, 8.9, 96), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = 0.02; lab.add(grid);
}

// ---------- rocket: curved metal body, swept fins, neon bands that pulse in the world's colour
const rocket = new THREE.Group();
const accent = new THREE.Color('#38e1ff'); // world colour, set by applyHomeTheme
const bandMat = new THREE.MeshBasicMaterial({ color: '#38e1ff' });
const noseLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff3b5c' }));
const nozzleGlow = new THREE.Mesh(new THREE.CircleGeometry(0.33, 32), new THREE.MeshBasicMaterial({ color: '#ff9a3d' }));
{
  const metal = std('#f4f7ff', { metalness: 0.15, roughness: 0.35 }), red = std('#ff3b5c', { metalness: 0.15, roughness: 0.4, emissive: '#5a0716' }), dark = std('#2a3150', { metalness: 0.8, roughness: 0.3 });
  const v = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(v([[0, 0], [0.6, 0], [0.66, 0.25], [0.68, 2.3], [0.6, 3.0], [0.44, 3.6], [0, 3.6]]), 48), metal);
  const nose = new THREE.Mesh(new THREE.LatheGeometry(v([[0.44, 3.6], [0.3, 3.95], [0.16, 4.25], [0.05, 4.45], [0, 4.5]]), 48), red);
  rocket.add(body, nose);
  for (const [y, r] of [[0.55, 0.665], [2.05, 0.69]]) { const b = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 8, 64), bandMat); b.rotation.x = Math.PI / 2; b.position.y = y; rocket.add(b); }
  for (const y of [2.75, 2.4]) {
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), new THREE.MeshBasicMaterial({ color: '#9ff6ff' })); win.position.set(0, y, 0.63);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 24), dark); rim.position.set(0, y, 0.64);
    rocket.add(win, rim);
  }
  const finShape = new THREE.Shape(); finShape.moveTo(0, 1.4); finShape.lineTo(0.9, 0.35); finShape.lineTo(0.95, -0.15); finShape.lineTo(0, 0.1); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1 }); finGeo.translate(0, 0, -0.04);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, fin = new THREE.Mesh(finGeo, red);
    fin.position.set(Math.sin(a) * 0.6, 0, Math.cos(a) * 0.6); fin.rotation.y = a - Math.PI / 2; rocket.add(fin);
  }
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 0.45, 32, 1, true), dark); nozzle.position.y = -0.2;
  nozzleGlow.rotation.x = Math.PI / 2; nozzleGlow.position.y = -0.4;
  noseLight.position.y = 4.55;
  rocket.add(nozzle, nozzleGlow, noseLight);
}
// layered flame: orange outside, yellow middle, white-hot core
const flame = new THREE.Group();
[[0.5, 2.2, '#ff5a1f', 0.75], [0.34, 1.6, '#ffb347', 0.9], [0.18, 1.0, '#fff6d0', 1]].forEach(([r, h, c, o]) => {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 20, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.y = h / 2 - 0.1; flame.add(m);
});
flame.rotation.x = Math.PI; flame.position.y = -0.42; flame.scale.setScalar(0.001); rocket.add(flame);
const PAD = new THREE.Vector3(-4.5, 0.75, 1.2);
rocket.position.copy(PAD); lab.add(rocket);
// the glow light lives in the scene (not inside `lab`) so hiding the island never changes the light count
const rocketGlow = new THREE.PointLight('#ff8a2b', 0, 18); scene.add(rocketGlow);
const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.3, 32), std('#3a4670', { metalness: 0.5 })); pad.position.set(PAD.x, 0.15, PAD.z); lab.add(pad);
const padRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.05, 8, 64), bandMat); padRing.rotation.x = Math.PI / 2; padRing.position.set(PAD.x, 0.31, PAD.z); lab.add(padRing);
// hologram scan rings that sweep up the waiting rocket
const holo = [0, 1, 2].map(() => {
  const r = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.025, 8, 64), new THREE.MeshBasicMaterial({ color: '#38e1ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  r.rotation.x = Math.PI / 2; lab.add(r); return r;
});
// exhaust: glowing particles that fade from white-hot to smoke
const EXN = 700, exPos = new Float32Array(EXN * 3), exCol = new Float32Array(EXN * 3), exVel = new Float32Array(EXN * 3), exLife = new Float32Array(EXN), exMax = new Float32Array(EXN);
const exGeo = new THREE.BufferGeometry(); exGeo.setAttribute('position', new THREE.BufferAttribute(exPos, 3)); exGeo.setAttribute('color', new THREE.BufferAttribute(exCol, 3));
const exhaust = new THREE.Points(exGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.6, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
exhaust.frustumCulled = false; lab.add(exhaust);
let exNext = 0;
function emit(n, x, y, z, spread, vy, life) {
  for (let k = 0; k < n; k++) {
    const i = exNext; exNext = (exNext + 1) % EXN;
    exPos.set([x + rand(-0.15, 0.15), y, z + rand(-0.15, 0.15)], i * 3);
    exVel.set([rand(-spread, spread), vy * rand(0.7, 1.2), rand(-spread, spread)], i * 3);
    exLife[i] = exMax[i] = life * rand(0.6, 1);
  }
}

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
// snow reuses the rain drops, drawn as soft dots that fall slowly
const snow = new THREE.Points(rainGeo, new THREE.PointsMaterial({ map: glowTex, color: '#dfe8ff', size: 0.2, transparent: true, opacity: 0, depthWrite: false }));
snow.visible = false; lab.add(snow);
// rainbow: seven arcs that always face the camera
const rainbow = new THREE.Group();
['#ff4d5e', '#ff9a3d', '#ffe14d', '#46e38a', '#3de8ff', '#4d8bff', '#a35bff'].forEach((c, i) =>
  rainbow.add(new THREE.Mesh(new THREE.TorusGeometry(14 - i * 0.45, 0.2, 8, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false }))));
rainbow.visible = false; lab.add(rainbow);
// lightning bolt: a jagged line rebuilt for every strike
const bolt = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f2f8ff', transparent: true, opacity: 0 }));
lab.add(bolt);
function newBolt() {
  const pts = [], x0 = rand(-6, 6), z0 = rand(-6, 4);
  for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(x0 + (i ? rand(-0.9, 0.9) : 0), 18 - i * 1.5, z0 + (i ? rand(-0.9, 0.9) : 0)));
  bolt.geometry.dispose(); bolt.geometry = new THREE.BufferGeometry().setFromPoints(pts);
}


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
// How each world looks and sounds in levels 2–3 (space), so the chosen world carries through the whole game
Object.assign(THEMES.space, { hero: 'Kelly', hello: 'The stars look amazing tonight.', star: '#ffd27a', glow: '#ffb347', tint: '#ffffff',
  nebula: ['#ff4fd8', '#38e1ff', '#7a5cff', '#ff7a3d'], names: ['Kelly', 'Zorbit', 'Nova', 'Kepler', 'Astra', 'Vyom', 'Chandra', 'Pixelon', 'Tara', 'Glorp'] });
Object.assign(THEMES.cyber, { hero: 'Namma', hello: 'Namma Bengaluru never sleeps!', star: '#ff8ae0', glow: '#ff4fd8', tint: '#ffb0ee',
  nebula: ['#ff4fd8', '#ff2d95', '#7a5cff', '#38e1ff'], names: ['Namma', 'Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'Hebbal', 'Malleshwaram', 'Silk Board', 'MG Road'] });
Object.assign(THEMES.ocean, { hero: 'Nemo', hello: 'Watch out for the fish!', star: '#b8f8ff', glow: '#3de8ff', tint: '#8ff0ff',
  nebula: ['#3de8ff', '#1fa3c4', '#46e38a', '#7a5cff'], names: ['Nemo', 'Coral', 'Pearl', 'Marina', 'Kelp', 'Bubbles', 'Tide', 'Lagoon', 'Dory'] });
Object.assign(THEMES.smart, { hero: 'Byte', hello: 'Everything here runs on AI and clean energy.', star: '#e4ffd8', glow: '#7cff8a', tint: '#c6ffd2',
  nebula: ['#7cff8a', '#38e1ff', '#ffe14d', '#5aa2ff'], names: ['Byte', 'Solaris', 'Pixel', 'Volt', 'Quantum', 'Nimbus', 'Echo', 'Grid', 'Cloud'] });
Object.values(THEMES).forEach(th => lab.add(th.props));

export const home = { theme: THEMES.space, themeKey: 'space', rk: { phase: 'idle', t: 0, v: 0 }, rainOn: false, rainLevel: 0, rainTimer: 0, flash: 0, isDay: false, dayT: 0, snow: false, rainbowT: 0, quakeT: 0, strikes: [] };

// Changes colours/props; sky colours are applied by the caller (they live in scene.js)
export function applyHomeTheme(key) {
  const th = THEMES[key] || THEMES.space;
  home.theme = th; home.themeKey = THEMES[key] ? key : 'space';
  islandMat.color.set(th.ground); rimMat.color.set(th.rim); accent.set(th.rim); holo.forEach(r => r.material.color.set(th.rim)); gridMat.color.set(th.rim); rain.material.color.set(th.rain);
  for (const k in THEMES) THEMES[k].props.visible = THEMES[k] === th;
  skySun.visible = skyMoon.visible = !th.up;
  return th;
}

export function launchRocket() {
  if (home.rk.phase !== 'idle') return false;
  home.rk.phase = 'countdown'; home.rk.t = 0; return true;
}
export function setRain(on) { home.rainOn = on; home.snow = false; if (on) home.rainTimer = 15; }
export function setSnow(on) { home.rainOn = on; home.snow = on; if (on) home.rainTimer = 15; }
export function showRainbow() { home.rainbowT = 12; }
export function strikeLightning() { const now = performance.now(); home.strikes.push(now, now + 650, now + 1400); }
export function quake() { home.quakeT = 2.5; }
export function setDay(on) { home.isDay = on; }
export function resetHome() {
  Object.assign(home.rk, { phase: 'idle', t: 0, v: 0 });
  rocket.position.copy(PAD); rocket.rotation.y = 0; flame.scale.setScalar(0.001); rocketGlow.intensity = 0;
  exLife.fill(0); exCol.fill(0);
  home.rainOn = false; home.isDay = false; home.snow = false; home.rainbowT = 0; home.quakeT = 0; home.strikes = []; lab.position.y = 0;
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
    emit(8, PAD.x, 0.35, PAD.z, 3.5, 0.4, 1.6); // billowing cloud at the pad
    if (rk.t > 1.2) { rk.phase = 'flying'; rk.v = 0; rocket.position.x = PAD.x; }
  } else if (rk.phase === 'flying') {
    rk.v += dt * 14; rocket.position.y += rk.v * dt; flame.scale.set(1 + Math.random() * 0.15, 1 + Math.random() * 0.5, 1 + Math.random() * 0.15);
    rocket.rotation.y += dt * 1.4; emit(12, rocket.position.x, rocket.position.y - 0.6, rocket.position.z, 0.9, -7, 1.3);
    view.shake = Math.max(view.shake, 0.15 - rocket.position.y * 0.004);
    if (rocket.position.y > 70) { rk.phase = 'gone'; rk.t = 0; }
  } else if (rk.phase === 'gone') {
    rk.t += dt; rocketGlow.intensity = 0; if (rk.t > 2.5) { rk.phase = 'landing'; rocket.position.y = 25; }
  } else if (rk.phase === 'landing') {
    rocket.position.y = PAD.y + (rocket.position.y - PAD.y) * Math.pow(0.25, dt);
    flame.scale.setScalar(0.5 + Math.random() * 0.2); rocketGlow.intensity = 12; emit(4, rocket.position.x, rocket.position.y - 0.6, rocket.position.z, 0.5, -4, 0.8);
    if (rocket.position.y - PAD.y < 0.03) { rocket.position.y = PAD.y; rocket.rotation.y = 0; rk.phase = 'idle'; flame.scale.setScalar(0.001); rocketGlow.intensity = 0; }
  }
  rocketGlow.position.set(rocket.position.x, rocket.position.y - 0.5, rocket.position.z);
  // camera tilts up to follow the launch, then settles back
  const followTarget = level === 1 && (rk.phase === 'countdown' || rk.phase === 'flying') ? Math.min(rocket.position.y - PAD.y, 28) : 0;
  view.follow += (followTarget - view.follow) * Math.min(1, dt * 2.5);
  // idle life: neon bands breathe, nose light blinks, hologram rings scan up the rocket
  bandMat.color.copy(accent).multiplyScalar(0.7 + 0.5 * Math.sin(t * 2.2));
  noseLight.visible = Math.sin(t * 5) > 0;
  const idle = rk.phase === 'idle';
  holo.forEach((r, i) => { const k = (t * 0.35 + i / holo.length) % 1; r.visible = idle; r.position.set(PAD.x, PAD.y + k * 4.2, PAD.z); r.material.opacity = Math.sin(k * Math.PI) * 0.7; r.scale.setScalar(1 - k * 0.35); });
  nozzleGlow.material.color.setRGB(1, 0.6, 0.25).multiplyScalar(idle ? 0.25 + 0.1 * Math.sin(t * 3) : 1.6);
  for (let i = 0; i < EXN; i++) {
    if (exLife[i] <= 0) continue;
    exLife[i] -= dt; const j = i * 3;
    if (exLife[i] <= 0) { exCol[j] = exCol[j + 1] = exCol[j + 2] = 0; continue; }
    exVel[j] *= 0.97; exVel[j + 2] *= 0.97; exVel[j + 1] = exVel[j + 1] * 0.97 + dt * 1.5; // smoke drifts up
    exPos[j] += exVel[j] * dt; exPos[j + 1] += exVel[j + 1] * dt; exPos[j + 2] += exVel[j + 2] * dt;
    const f = exLife[i] / exMax[i], hot = Math.min(1, Math.max(0, (f - 0.45) / 0.55)), fade = Math.min(1, f * 3);
    exCol[j] = (0.35 + 1.45 * hot) * fade; exCol[j + 1] = (0.3 + hot * hot) * fade; exCol[j + 2] = (0.32 + 0.3 * hot * hot * hot) * fade;
  }
  exGeo.attributes.position.needsUpdate = true; exGeo.attributes.color.needsUpdate = true;
  if (level !== 1) rocketGlow.intensity = 0;

  const th = home.theme;
  if (home.rainOn) { home.rainTimer -= dt; if (home.rainTimer <= 0) home.rainOn = false; }
  const rainTarget = home.rainOn ? 1 : th.up && level === 1 ? 0.25 : 0;
  home.rainLevel += (rainTarget - home.rainLevel) * Math.min(1, dt * 2);
  const wet = home.rainLevel > 0.01;
  rain.visible = wet && !home.snow; snow.visible = wet && home.snow; clouds.visible = wet; snow.material.opacity = home.rainLevel;
  rain.material.opacity = home.rainLevel * 0.7; cloudMat.opacity = th.up ? 0 : home.rainLevel * 0.9;
  if (wet) {
    const v = th.up ? 6 : home.snow ? -3 : -24;
    for (let i = 0; i < RAIN; i++) {
      const k = i * 6; rainArr[k + 1] += v * dt; rainArr[k + 4] += v * dt;
      if (rainArr[k + 4] < 0) { rainArr[k + 1] += 22; rainArr[k + 4] += 22; } else if (rainArr[k + 4] > 22) { rainArr[k + 1] -= 22; rainArr[k + 4] -= 22; }
    }
    rainGeo.attributes.position.needsUpdate = true;
    if (home.rainLevel > 0.6 && !th.up && !home.snow && Math.random() < dt * 0.4) home.flash = 1;
  }
  home.flash *= Math.pow(0.02, dt);
  home.dayT += ((home.isDay ? 1 : 0) - home.dayT) * Math.min(1, dt * 1.5);
  skySun.scale.setScalar(Math.max(0.001, home.dayT)); skyMoon.scale.setScalar(Math.max(0.001, 1 - home.dayT));
  // rainbow fades in and out, always facing the camera
  home.rainbowT = Math.max(0, home.rainbowT - dt);
  rainbow.visible = home.rainbowT > 0;
  if (rainbow.visible) {
    const o = Math.min(1, home.rainbowT / 1.5, (12 - home.rainbowT) / 1.5) * 0.6;
    rainbow.children.forEach(m => { m.material.opacity = o; });
    rainbow.rotation.y = Math.atan2(camera.position.x, camera.position.z);
  }
  // lightning strikes
  const now = performance.now();
  while (home.strikes.length && home.strikes[0] <= now) { home.strikes.shift(); newBolt(); bolt.material.opacity = 1; home.flash = 1; view.shake = Math.max(view.shake, 0.3); }
  bolt.material.opacity *= Math.pow(0.002, dt);
  // earthquake
  if (home.quakeT > 0) { home.quakeT -= dt; view.shake = Math.max(view.shake, 0.6); lab.position.y = Math.sin(t * 45) * 0.12; } else lab.position.y = 0;
  if (lab.visible) th.props.userData.anim?.(t, dt);
}
