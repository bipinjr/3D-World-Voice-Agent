// Levels 2–3: star, planets, moons, portal, spaceships, black hole, explosions, fireworks, warp.
import * as THREE from 'three';
import { scene, camera, view, glowSprite } from './scene.js';
import { rand, pick, std, canvasTex, easeOutBack, disposeDeep } from './util.js';
import { COLORS, SIZES } from './nlu.js';

const MAX_PLANETS = 6, MAX_SHIPS = 16, MAX_BURSTS = 24;

// ---------- central star (levels 2–3)
export const star = new THREE.Group();
star.add(new THREE.Mesh(new THREE.SphereGeometry(3, 48, 48), new THREE.MeshBasicMaterial({ color: '#ffd27a' })), glowSprite('#ffb347', 16, 0.5));
star.visible = false; scene.add(star);

// ---------- galaxy + nebula backdrop (level 3)
export const deepSpace = new THREE.Group(); deepSpace.visible = false; scene.add(deepSpace);
const galaxy = new THREE.Group(), nebulae = [];
{
  const N = 5000, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), inner = new THREE.Color('#ffd9a0'), outer = new THREE.Color('#7a5cff'), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 0.6) * 40, a = (i % 3) * Math.PI * 2 / 3 + r * 0.22 + rand(-0.4, 0.4);
    pos.set([Math.cos(a) * r + rand(-1.5, 1.5), rand(-1, 1) * (1 - r / 45), Math.sin(a) * r + rand(-1.5, 1.5)], i * 3);
    c.copy(inner).lerp(outer, r / 40); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  galaxy.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })), glowSprite('#ffcf8a', 22, 0.8));
  galaxy.position.set(-70, 35, -130); galaxy.rotation.set(0.9, 0, 0.3);
  deepSpace.add(galaxy);
  for (const [x, y, z, c2] of [[60, 20, -120, '#ff4fd8'], [-20, -10, -140, '#38e1ff'], [100, 40, -60, '#7a5cff'], [-110, 0, -40, '#ff7a3d']]) {
    const n = glowSprite(c2, 110, 0.22); n.position.set(x, y, z); deepSpace.add(n); nebulae.push(n);
  }
}

export function applySpaceTheme(th) {
  planetNames = th.names; orbitColor = th.rim;
  star.children[0].material.color.set(th.star); star.children[1].material.color.set(th.glow);
  galaxy.children[0].material.color.set(th.tint); galaxy.children[1].material.color.set(th.glow);
  nebulae.forEach((n, i) => n.material.color.set(th.nebula[i % th.nebula.length]));
  planets.forEach(p => p.line.material.color.set(th.rim));
}

// ---------- planets
let planetNames = ['Zorbit', 'Nova', 'Kepler', 'Astra', 'Vyom', 'Chandra', 'Pixelon', 'Tara', 'Glorp'], orbitColor = '#38e1ff';
const ORBITS = [8, 11, 14, 17, 20, 23];
export const planets = [];
export const space = { lastPlanet: null, portalOpen: false, bhOn: false };

function planetTexture(hex) {
  return canvasTex(256, 128, (g, w, h) => {
    const base = new THREE.Color(hex); g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      g.globalAlpha = rand(0.3, 0.7); g.fillStyle = '#' + base.clone().offsetHSL(rand(-0.03, 0.03), 0, rand(-0.15, 0.15)).getHexString();
      g.fillRect(0, rand(0, h), w, rand(3, 14));
    }
  });
}
function makeLabel(text) {
  const tex = canvasTex(512, 128, (g, w, h) => {
    g.font = 'bold 60px Outfit, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = 'rgba(5,10,30,.85)'; g.strokeText(text, w / 2, h / 2, w - 20); g.fillStyle = '#fff'; g.fillText(text, w / 2, h / 2, w - 20);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(5.2, 1.3, 1); return s;
}
function orbitLine(r, y) {
  const pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: orbitColor, transparent: true, opacity: 0.22 }));
}
export const alivePlanets = () => planets.filter(p => p.state === 'alive');
export function freshName() {
  const used = new Set(planets.map(p => p.name.toLowerCase()));
  return planetNames.find(n => !used.has(n.toLowerCase())) || 'Planet ' + (planets.length + 1);
}
export function createPlanet({ name, color, size }) {
  while (alivePlanets().length >= MAX_PLANETS) removePlanet(alivePlanets()[0]);
  let finalName = name || freshName();
  while (planets.some(q => q.name.toLowerCase() === finalName.toLowerCase())) finalName += ' 2';
  const colorName = COLORS[color] ? color : pick(['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'gold']);
  const used = new Set(planets.map(p => p.orbit));
  const orbit = ORBITS.find(r => !used.has(r)) ?? rand(9, 22);
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), std('#fff', { map: planetTexture(COLORS[colorName]), emissive: COLORS[colorName], emissiveIntensity: 0.18 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.1, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS[colorName]).offsetHSL(0.1, 0, 0.15), side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
  ring.rotation.x = Math.PI / 2.3; ring.visible = Math.random() < 0.4; mesh.add(ring);
  const label = makeLabel(finalName), halo = glowSprite(COLORS[colorName], 4, 0.4);
  group.add(halo, mesh, label);
  const y = rand(-1, 1.5), line = orbitLine(orbit, y);
  const p = { name: finalName, colorName, size: SIZES[size] ?? rand(0.85, 1.2), sizeNow: 0.3, group, mesh, label, halo, line, orbit, y, speed: rand(1, 2) / orbit, angle: view.angle + rand(-0.4, 0.4), grow: 0, moons: [], state: 'alive', t: 0 };
  group.position.set(Math.sin(p.angle) * orbit, y, Math.cos(p.angle) * orbit);
  scene.add(group, line); planets.push(p); space.lastPlanet = p;
  return p;
}
export function removePlanet(p) {
  const i = planets.indexOf(p); if (i < 0) return;
  planets.splice(i, 1);
  scene.remove(p.group, p.line); disposeDeep(p.group); disposeDeep(p.line);
  p.state = 'gone';
  if (space.lastPlanet === p) space.lastPlanet = alivePlanets().at(-1) || null;
}
export function recolor(p, colorName) {
  if (!COLORS[colorName]) return;
  p.colorName = colorName; p.mesh.material.map?.dispose(); p.mesh.material.map = planetTexture(COLORS[colorName]);
  p.mesh.material.emissive.set(COLORS[colorName]); p.mesh.material.needsUpdate = true; p.halo.material.color.set(COLORS[colorName]);
}
export function addMoon(p) {
  if (p.moons.length >= 3 || p.state !== 'alive') return false;
  const pivot = new THREE.Object3D(); pivot.rotation.z = rand(-0.4, 0.4);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), std('#cfd6e6'));
  moon.position.x = p.size * 1.5 + 0.9 + p.moons.length * 0.7; pivot.add(moon); p.group.add(pivot);
  p.moons.push({ pivot, speed: rand(1, 2) });
  return true;
}
export function explodePlanet(p) {
  if (p.state !== 'alive') return;
  p.state = 'dying'; p.t = 0; p.label.visible = false; scene.remove(p.line);
}

// ---------- explosions & fireworks
const bursts = []; let pendingBursts = [];
function burst(center, color, n = 140, speed = 4.5, life = 2.2, size = 0.28) {
  while (bursts.length >= MAX_BURSTS) killBurst(0);
  const pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) { pos.set([center.x, center.y, center.z], i * 3); vel.push(new THREE.Vector3().randomDirection().multiplyScalar(speed * rand(0.6, 1.3))); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts); bursts.push({ pts, vel, t: 0, life });
}
function killBurst(i) { const b = bursts[i]; scene.remove(b.pts); disposeDeep(b.pts); bursts.splice(i, 1); }
export function fireworks() {
  const now = performance.now();
  if (pendingBursts.length > 14) return;
  for (let i = 0; i < 7; i++) pendingBursts.push(now + i * 330);
}

// ---------- portal (always "visible" so its light never leaves the scene; closed = tiny + dark)
export const portal = new THREE.Group(); portal.position.set(-14, 5, -6);
const portalInner = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64), new THREE.MeshBasicMaterial({
  map: canvasTex(256, 256, g => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, '#7af0ff'); gr.addColorStop(0.6, '#8a3cff'); gr.addColorStop(1, 'rgba(40,0,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
    for (let arm = 0; arm < 4; arm++) { g.beginPath(); for (let t = 0; t <= 1; t += 0.01) { const a = arm * Math.PI / 2 + t * Math.PI * 3, r = t * 120; t ? g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r) : g.moveTo(128, 128); } g.stroke(); }
  }), transparent: true, side: THREE.DoubleSide, depthWrite: false
}));
const portalLight = new THREE.PointLight('#ff4fd8', 0, 25);
portal.add(new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.18, 16, 64), new THREE.MeshBasicMaterial({ color: '#ff4fd8' })), portalInner, portalLight);
portal.scale.setScalar(0.001); scene.add(portal);
let portalScale = 0;

// ---------- spaceships
const ships = [];
function makeShip(col) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.4, 12), std('#dfe7ff', { metalness: 0.5, roughness: 0.3 })); body.rotation.x = Math.PI / 2;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.5), std(col, { emissive: col, emissiveIntensity: 0.4 })); wing.position.z = -0.3;
  const glow = glowSprite(col, 1.8); glow.position.z = -0.8;
  g.add(body, wing, glow); return g;
}
export function launchShips(n) {
  n = Math.min(Math.max(1, n | 0), 8);
  while (ships.length + n > MAX_SHIPS) killShip(0);
  const origin = space.portalOpen ? portal.position.clone() : new THREE.Vector3(rand(-30, 30), 25, -45);
  for (let i = 0; i < n; i++) {
    const g = makeShip(pick(['#38e1ff', '#ff4fd8', '#7cff8a', '#ffc94d'])); g.visible = false; scene.add(g);
    ships.push({ g, t: -i * 0.3, origin, r: 12 + (i % 4) * 1.4, h: 3 + (i % 3) * 2, a0: Math.atan2(origin.x, origin.z) + i * 0.15 });
  }
  return n;
}
function killShip(i) { const s = ships[i]; scene.remove(s.g); disposeDeep(s.g); ships.splice(i, 1); }
function shipPos(s, t) {
  const at = a => new THREE.Vector3(Math.sin(a) * s.r, s.h, Math.cos(a) * s.r);
  if (t < 1.5) { const k = t / 1.5; return s.origin.clone().lerp(at(s.a0), k * k * (3 - 2 * k)); }
  const a = s.a0 + (Math.min(t, 11) - 1.5) * 0.55, p = at(a);
  if (t > 11) p.add(new THREE.Vector3(Math.sin(a) * 0.3, 1, Math.cos(a) * 0.3).multiplyScalar((t - 11) ** 2 * 8));
  return p;
}

// ---------- black hole
export const blackHole = new THREE.Group(); blackHole.position.set(15, 4, -8);
const bhDisk = new THREE.Mesh(new THREE.RingGeometry(2.1, 6.5, 96), new THREE.MeshBasicMaterial({
  map: canvasTex(256, 256, g => {
    const gr = g.createRadialGradient(128, 128, 40, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.35, 'rgba(255,150,60,.9)'); gr.addColorStop(0.7, 'rgba(160,60,255,.5)'); gr.addColorStop(1, 'rgba(80,0,160,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
    for (let i = 0; i < 30; i++) { const a = rand(0, 6.28); g.beginPath(); g.arc(128, 128, rand(50, 120), a, a + rand(0.3, 1.2)); g.stroke(); }
  }), transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
}));
bhDisk.rotation.x = -Math.PI / 2.4;
blackHole.add(new THREE.Mesh(new THREE.SphereGeometry(1.9, 48, 48), new THREE.MeshBasicMaterial({ color: '#000' })), bhDisk, glowSprite('#8a3cff', 14, 0.6));
blackHole.scale.setScalar(0.001); scene.add(blackHole);
let bhScale = 0;
const sucking = [];
function suckInto(obj, delay, onDone) {
  const rel = obj.position.clone().sub(blackHole.position);
  sucking.push({ obj, r0: Math.hypot(rel.x, rel.z), a0: Math.atan2(rel.z, rel.x), y0: rel.y, s0: obj.scale.x, t: -delay, onDone });
}
export function summonBlackHole() {
  space.bhOn = true;
  const victims = alivePlanets();
  victims.forEach((p, i) => { p.state = 'sucked'; p.label.visible = false; scene.remove(p.line); suckInto(p.group, 1 + i * 0.5, () => removePlanet(p)); });
  if (!victims.length) for (let i = 0; i < 6; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.4, 0.9)), std('#7a7f8c', { flatShading: true }));
    const a = rand(0, 6.28); rock.position.copy(blackHole.position).add(new THREE.Vector3(Math.cos(a) * rand(9, 13), rand(-2, 3), Math.sin(a) * rand(9, 13)));
    scene.add(rock); suckInto(rock, 1 + i * 0.35, () => { scene.remove(rock); disposeDeep(rock); });
  }
  if (!alivePlanets().length) space.lastPlanet = null;
  return victims.length;
}

// ---------- warp speed (child of the camera so it fills the view)
const WARPN = 450, warpArr = new Float32Array(WARPN * 6);
for (let i = 0; i < WARPN; i++) { const a = rand(0, 6.28), r = rand(1.5, 14), z = rand(-160, -5); warpArr.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - 2], i * 6); }
const warpGeo = new THREE.BufferGeometry(); warpGeo.setAttribute('position', new THREE.BufferAttribute(warpArr, 3));
const warpLines = new THREE.LineSegments(warpGeo, new THREE.LineBasicMaterial({ color: '#cfeeff', transparent: true, opacity: 0, fog: false }));
camera.add(warpLines);
// wormhole tunnel around the camera during warps
const wormTex = canvasTex(64, 256, g => { for (let i = 0; i < 8; i++) { g.fillStyle = `hsl(${190 + i * 22},100%,62%)`; g.fillRect(0, i * 32, 64, 7); } });
wormTex.wrapS = wormTex.wrapT = THREE.RepeatWrapping; wormTex.repeat.set(6, 5);
const worm = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 220, 32, 1, true), new THREE.MeshBasicMaterial({ map: wormTex, transparent: true, opacity: 0, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
worm.rotation.x = Math.PI / 2; worm.position.z = -100; worm.visible = false; camera.add(worm);
const warp = { t: -1, dur: 3.2 };
export const isWarping = () => warp.t >= 0;
// visuals run in the frame loop; game logic runs on timers so it can never stall
export function startWarp(onMid, onEnd) {
  warp.t = 0;
  const fx = document.querySelector('#flashFx');
  setTimeout(() => { fx.style.opacity = 0.9; setTimeout(() => { fx.style.opacity = 0; }, 250); onMid?.(); }, warp.dur * 500);
  setTimeout(() => { warp.t = -1; warpLines.material.opacity = 0; worm.visible = false; onEnd?.(); }, warp.dur * 1000 + 50);
}

export function resetSpace() {
  space.portalOpen = false; space.bhOn = false;
  [...planets].forEach(removePlanet); space.lastPlanet = null;
  while (ships.length) killShip(0);
  sucking.splice(0).forEach(s => { if (s.obj.parent) { scene.remove(s.obj); disposeDeep(s.obj); } });
  while (bursts.length) killBurst(0);
  pendingBursts = [];
}
export function setSpaceLevel(level) {
  star.visible = level >= 2; deepSpace.visible = level === 3;
  if (level !== 3) { space.portalOpen = false; space.bhOn = false; }
}

// One of each dynamic material, so shaders compile at start-up instead of mid-game.
export function warmupGroup() {
  const g = new THREE.Group();
  const pm = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), std('#fff', { map: planetTexture('#ff4d5e'), emissive: '#ff4d5e', emissiveIntensity: 0.18 }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.1, 8), new THREE.MeshBasicMaterial({ color: '#fff', side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
  const pts = new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3()]), new THREE.PointsMaterial({ color: '#fff', size: 0.3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5), std('#7a7f8c', { flatShading: true }));
  g.add(pm, ring, makeLabel('warm'), new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), std('#cfd6e6')), makeShip('#38e1ff'), rock, pts, orbitLine(2, 0));
  return g;
}

export function updateSpace(dt, t) {
  star.rotation.y += dt * 0.1; galaxy.rotation.y += dt * 0.02;

  for (const p of [...planets]) {
    if (p.state === 'sucked' || p.state === 'gone') continue;
    p.grow = Math.min(1, p.grow + dt * 1.2);
    p.sizeNow += (p.size - p.sizeNow) * Math.min(1, dt * 4);
    if (p.state === 'alive') { p.angle += p.speed * dt; p.group.position.set(Math.sin(p.angle) * p.orbit, p.y, Math.cos(p.angle) * p.orbit); }
    let s = p.sizeNow * easeOutBack(p.grow);
    if (p.state === 'dying') {
      p.t += dt; s *= 1 + p.t * 1.5; p.mesh.material.emissiveIntensity = 0.18 + p.t * 8;
      if (p.t > 0.35) {
        const at = p.group.position.clone(), col = COLORS[p.colorName];
        removePlanet(p); burst(at, col, 260, 7, 1.8, 0.35); burst(at, '#ffd27a', 120, 4, 1.4, 0.25); view.shake = 0.5;
        continue;
      }
    }
    p.mesh.scale.setScalar(Math.max(0.001, s)); p.mesh.rotation.y += dt * 0.4;
    p.label.position.y = p.sizeNow + 1.5; p.halo.scale.setScalar(Math.max(0.001, s * 4.2));
    for (const m of p.moons) m.pivot.rotation.y += m.speed * dt;
  }

  portalScale += ((space.portalOpen ? 1 : 0) - portalScale) * Math.min(1, dt * 3);
  portal.scale.setScalar(Math.max(0.001, portalScale * 3));
  portalInner.rotation.z -= dt * 2; portalLight.intensity = portalScale > 0.01 ? portalScale * (40 + Math.sin(t * 6) * 10) : 0;
  portal.lookAt(camera.position.x, portal.position.y, camera.position.z);

  for (let i = ships.length - 1; i >= 0; i--) {
    const s = ships[i]; s.t += dt;
    if (s.t < 0) continue;
    s.g.visible = true; s.g.position.copy(shipPos(s, s.t)); s.g.lookAt(shipPos(s, s.t + 0.05));
    if (s.t > 14) killShip(i);
  }

  bhScale += ((space.bhOn ? 1 : 0) - bhScale) * Math.min(1, dt * 2);
  blackHole.visible = bhScale > 0.01; blackHole.scale.setScalar(Math.max(0.001, bhScale)); bhDisk.rotation.z += dt * 1.5;
  for (let i = sucking.length - 1; i >= 0; i--) {
    const s = sucking[i]; s.t += dt; if (s.t < 0) continue;
    const k = Math.min(1, s.t / 2.4), r = s.r0 * Math.pow(1 - k, 1.3), a = s.a0 + k * 7, b = blackHole.position;
    s.obj.position.set(b.x + Math.cos(a) * r, b.y + s.y0 * (1 - k), b.z + Math.sin(a) * r);
    s.obj.scale.setScalar(Math.max(0.001, s.s0 * (1 - k))); s.obj.rotation.y += dt * 4;
    if (k >= 1) { sucking.splice(i, 1); s.onDone(); view.shake = Math.max(view.shake, 0.15); }
  }

  const now = performance.now();
  while (pendingBursts.length && pendingBursts[0] <= now) {
    pendingBursts.shift();
    burst(new THREE.Vector3(rand(-12, 12), rand(8, 14), rand(-8, 8)), new THREE.Color().setHSL(Math.random(), 1, 0.6));
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.t += dt;
    const arr = b.pts.geometry.attributes.position.array;
    b.vel.forEach((v, j) => { v.y -= 3 * dt; v.multiplyScalar(0.985); arr[j * 3] += v.x * dt; arr[j * 3 + 1] += v.y * dt; arr[j * 3 + 2] += v.z * dt; });
    b.pts.geometry.attributes.position.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 1 - b.t / b.life);
    if (b.t > b.life) killBurst(i);
  }

  // warp lines; returns the camera field-of-view to use this frame
  if (warp.t < 0) return 55;
  warp.t += dt;
  const power = Math.sin(Math.min(1, warp.t / warp.dur) * Math.PI);
  warpLines.material.opacity = power;
  worm.visible = power > 0.01; worm.material.opacity = power * 0.75; wormTex.offset.y -= dt * 4 * power; worm.rotation.y += dt * 1.5;
  const speed = 220 * power, len = 2 + power * 30;
  for (let i = 0; i < WARPN; i++) {
    const j = i * 6; warpArr[j + 2] += speed * dt; if (warpArr[j + 2] > -1) warpArr[j + 2] = -160;
    warpArr[j + 5] = warpArr[j + 2] - len;
  }
  warpGeo.attributes.position.needsUpdate = true;
  return 55 + 30 * power;
}
