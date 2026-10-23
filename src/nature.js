// Nature: dreamy trees, rocks, a pond and floating sky islands with waterfalls, plus the nature powers
// (forest, flowers, volcano, tornado, birds, fireflies). Everything lives on the home island (level 1).
import * as THREE from 'three';
import { glowTex, glowSprite, view } from './scene.js';
import { lab } from './home.js';
import { rand, pick, std } from './util.js';

const nature = new THREE.Group(); lab.add(nature);
const FOLIAGE = { space: ['#2dd4bf', '#38e1ff', '#818cf8'], cyber: ['#ff4fd8', '#a35bff', '#f472b6'], ocean: ['#34d399', '#2fbf71', '#22d3ee'], smart: ['#4ade80', '#22c55e', '#a3e635'] };
const leafMats = [0, 1, 2].map(() => std('#4ade80', { emissive: '#4ade80', emissiveIntensity: 0.25, flatShading: true, roughness: 0.65 }));
const trunkMat = std('#6b4f3a', { roughness: 0.9, flatShading: true });
export const rockMat = std('#5b6478', { roughness: 0.95, flatShading: true });
const pineGeos = [0, 1, 2].map(i => new THREE.ConeGeometry(0.62 - i * 0.15, 0.8, 7));
const blobGeos = [0, 1, 2].map(i => new THREE.IcosahedronGeometry(0.46 - i * 0.07, 1));
const trunkGeo = new THREE.CylinderGeometry(0.08, 0.13, 1, 7);
function makeTree(scale = 1) {
  const g = new THREE.Group(), mat = pick(leafMats);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 0.5; g.add(trunk);
  if (Math.random() < 0.5) pineGeos.forEach((geo, i) => { const c = new THREE.Mesh(geo, mat); c.position.y = 1.05 + i * 0.42; g.add(c); });
  else blobGeos.forEach((geo, i) => { const b = new THREE.Mesh(geo, mat); b.position.set(rand(-0.2, 0.2), 1.15 + i * 0.3, rand(-0.2, 0.2)); g.add(b); });
  g.rotation.y = rand(0, 6.28); g.scale.setScalar(scale);
  g.traverse(o => { o.castShadow = true; });
  return g;
}
const polar = (r0, r1) => { const a = rand(0, 6.28), r = rand(r0, r1); return [Math.cos(a) * r, Math.sin(a) * r]; };
const POND = [-1.2, 5.6];
const blocked = (x, z) => Math.hypot(x + 4.5, z - 1.2) < 2.2 || Math.hypot(x - POND[0], z - POND[1]) < 1.7;
function freeSpot(r0, r1, front = false) { for (let i = 0; i < 30; i++) { const [x, z] = polar(r0, r1); if (!blocked(x, z) && (!front || z > 0.4)) return [x, z]; } return [0, 6]; }

// ---------- scenery that is always there
for (let i = 0; i < 14; i++) { const [x, z] = freeSpot(7, 8.4); const t = makeTree(rand(0.75, 1.25)); t.position.set(x, 0, z); nature.add(t); }
for (let i = 0; i < 10; i++) {
  const [x, z] = freeSpot(6.5, 8.6), r = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.25, 0.6)), rockMat);
  r.position.set(x, 0.1, z); r.rotation.set(rand(0, 3), rand(0, 3), 0); r.castShadow = true; nature.add(r);
}
const pond = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), std('#3b82f6', { metalness: 0.4, roughness: 0.08, emissive: '#1e40af', emissiveIntensity: 0.5 }));
pond.rotation.x = -Math.PI / 2; pond.position.set(POND[0], 0.04, POND[1]); pond.receiveShadow = true; nature.add(pond);
for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, s = new THREE.Mesh(new THREE.DodecahedronGeometry(rand(0.12, 0.22)), rockMat); s.position.set(POND[0] + Math.cos(a) * 1.3, 0.08, POND[1] + Math.sin(a) * 1.3); nature.add(s); }
const ripple = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 48), new THREE.MeshBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
ripple.rotation.x = -Math.PI / 2; ripple.position.set(POND[0], 0.06, POND[1]); nature.add(ripple);

// floating sky islands with waterfalls
const floatGround = std('#2e5a3a', { flatShading: true, roughness: 0.8 }), floaters = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.5, 0.4, 9), floatGround);
  const base = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 9), rockMat); base.rotation.x = Math.PI; base.position.y = -1.5;
  top.castShadow = base.castShadow = true; g.add(top, base);
  for (let k = 0; k < 2; k++) { const t = makeTree(rand(0.5, 0.75)); t.position.set(rand(-0.8, 0.8), 0.2, rand(-0.8, 0.8)); g.add(t); }
  const N = 90, pos = new Float32Array(N * 3);
  for (let j = 0; j < N; j++) pos.set([1.45 + rand(-0.15, 0.15), -rand(0, 7), rand(-0.3, 0.3)], j * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, color: '#9fe8ff', size: 0.35, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })));
  lab.add(g); floaters.push({ g, a: i * Math.PI * 2 / 3 + 0.5, r: 30 + i * 2, h: 2 + i * 3, geo, pos, N }); // outside the camera orbit: background, never in front
}

export function applyNatureTheme(key, th) {
  const c = FOLIAGE[key] || FOLIAGE.space;
  leafMats.forEach((m, i) => { m.color.set(c[i]); m.emissive.set(c[i]); });
  floatGround.color.set(th.ground);
}

// ---------- nature powers
const grown = []; // trees and flowers spawned by commands; they grow from nothing
function spawnGrow(obj, delay) { obj.userData.target = obj.scale.x; obj.scale.setScalar(0.001); nature.add(obj); grown.push({ obj, t: -delay }); }
export function growForest() {
  for (let i = 0; i < 14 && grown.length < 80; i++) { const [x, z] = freeSpot(2, 7.6, true), t = makeTree(rand(0.7, 1.3)); t.position.set(x, 0, z); spawnGrow(t, i * 0.12); }
}
const petalGeo = new THREE.SphereGeometry(0.09, 8, 6), stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.4, 5), stemMat = std('#22c55e'), flowerMats = {};
const flowerMat = c => (flowerMats[c] ||= std(c, { emissive: c, emissiveIntensity: 0.5 }));
export function bloomFlowers() {
  for (let i = 0; i < 36 && grown.length < 130; i++) {
    const f = new THREE.Group(), stem = new THREE.Mesh(stemGeo, stemMat); stem.position.y = 0.2; f.add(stem);
    const mat = flowerMat(pick(['#f472b6', '#facc15', '#a78bfa', '#fb7185', '#38bdf8', '#ffffff']));
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(petalGeo, mat), a = k / 5 * 6.28; p.position.set(Math.cos(a) * 0.1, 0.42, Math.sin(a) * 0.1); p.scale.set(1, 0.5, 1); f.add(p); }
    const center = new THREE.Mesh(petalGeo, flowerMat('#fde047')); center.position.y = 0.43; center.scale.setScalar(0.7); f.add(center);
    const [x, z] = freeSpot(1.5, 8.2, true); f.position.set(x, 0, z); f.scale.setScalar(rand(0.9, 1.5)); spawnGrow(f, i * 0.04);
  }
}

// small reusable particle system (positions, colours, velocities, life)
function particles(N, size) {
  const p = { N, next: 0, pos: new Float32Array(N * 3), col: new Float32Array(N * 3), vel: new Float32Array(N * 3), life: new Float32Array(N), max: new Float32Array(N) };
  p.geo = new THREE.BufferGeometry(); p.geo.setAttribute('position', new THREE.BufferAttribute(p.pos, 3)); p.geo.setAttribute('color', new THREE.BufferAttribute(p.col, 3));
  p.pts = new THREE.Points(p.geo, new THREE.PointsMaterial({ map: glowTex, size, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  p.pts.frustumCulled = false; lab.add(p.pts); return p;
}
function emit(p, n, x, y, z, vx, vy, vz, spread, life) {
  for (let k = 0; k < n; k++) {
    const i = p.next; p.next = (p.next + 1) % p.N;
    p.pos.set([x, y, z], i * 3); p.vel.set([vx + rand(-spread, spread), vy * rand(0.7, 1.2), vz + rand(-spread, spread)], i * 3);
    p.life[i] = p.max[i] = life * rand(0.6, 1);
  }
}
function step(p, dt, gravity, paint) {
  for (let i = 0; i < p.N; i++) {
    if (p.life[i] <= 0) continue;
    p.life[i] -= dt; const j = i * 3;
    if (p.life[i] <= 0) { p.col[j] = p.col[j + 1] = p.col[j + 2] = 0; continue; }
    p.vel[j + 1] += gravity * dt;
    p.pos[j] += p.vel[j] * dt; p.pos[j + 1] += p.vel[j + 1] * dt; p.pos[j + 2] += p.vel[j + 2] * dt;
    if (p.pos[j + 1] < 0.05) { p.pos[j + 1] = 0.05; p.vel[j + 1] *= -0.2; p.vel[j] *= 0.8; p.vel[j + 2] *= 0.8; }
    paint(p.col, j, p.life[i] / p.max[i]);
  }
  p.geo.attributes.position.needsUpdate = true; p.geo.attributes.color.needsUpdate = true;
}
function clearParticles(p) { p.life.fill(0); p.col.fill(0); p.geo.attributes.color.needsUpdate = true; }

// volcano rises from the ground and erupts lava
const volcano = new THREE.Group();
{
  const geo = new THREE.CylinderGeometry(0.5, 2.6, 3.2, 12, 4), a = geo.attributes.position;
  for (let i = 0; i < a.count; i++) if (a.getY(i) < 1.55) a.setXYZ(i, a.getX(i) + rand(-0.15, 0.15), a.getY(i) + rand(-0.1, 0.1), a.getZ(i) + rand(-0.15, 0.15)); // rocky, keep the crater rim clean
  geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, std('#3f3a3a', { flatShading: true, roughness: 0.95 })); body.position.y = 1.6; body.castShadow = true;
  const crater = new THREE.Mesh(new THREE.CircleGeometry(0.48, 16), new THREE.MeshBasicMaterial({ color: '#ff6a00' })); crater.rotation.x = -Math.PI / 2; crater.position.y = 3.21;
  const glow = glowSprite('#ff6a00', 4, 0.8); glow.position.y = 3.6;
  volcano.add(body, crater, glow);
}
volcano.position.set(6.2, 0, 4.2); volcano.scale.set(0.75, 0.001, 0.75); volcano.visible = false; lab.add(volcano);
const lava = particles(500, 0.45);
let volT = -1;
export function eruptVolcano() { if (volT < 0) volT = 0; }

// tornado: a spinning funnel that sweeps across the island
const TN = 320, tornPos = new Float32Array(TN * 3), tornGeo = new THREE.BufferGeometry(); tornGeo.setAttribute('position', new THREE.BufferAttribute(tornPos, 3));
const tornado = new THREE.Points(tornGeo, new THREE.PointsMaterial({ map: glowTex, color: '#cbd5e1', size: 0.5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
tornado.frustumCulled = false; tornado.visible = false; lab.add(tornado);
let tornT = -1;
export function summonTornado() { if (tornT < 0) tornT = 0; }

// a V-formation flock of birds with flapping wings
const wingGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.18), new THREE.Vector3(0, 0, -0.18), new THREE.Vector3(-0.6, 0, -0.05)]);
const birdMat = new THREE.MeshBasicMaterial({ color: '#f8fafc', side: THREE.DoubleSide });
const flock = [];
for (let i = 0; i < 11; i++) {
  const b = new THREE.Group(), l = new THREE.Mesh(wingGeo, birdMat), r = new THREE.Mesh(wingGeo, birdMat); r.scale.x = -1; b.add(l, r);
  const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
  b.userData = { l, r, off: new THREE.Vector3(side * row * 0.9, row * 0.15, -row * 0.9), phase: rand(0, 6) };
  b.visible = false; lab.add(b); flock.push(b);
}
let birdT = -1;
export function flyBirds() { birdT = 0; }

// fireflies glowing and wandering over the island
const FN = 90, ffBase = [], ffPos = new Float32Array(FN * 3), ffCol = new Float32Array(FN * 3);
for (let i = 0; i < FN; i++) { const [x, z] = polar(1, 8.5); ffBase.push([x, rand(0.3, 2.5), z, rand(0, 6.28), rand(0.6, 1.4)]); }
const ffGeo = new THREE.BufferGeometry(); ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3)); ffGeo.setAttribute('color', new THREE.BufferAttribute(ffCol, 3));
const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ map: glowTex, size: 0.3, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
fireflies.frustumCulled = false; fireflies.visible = false; lab.add(fireflies);
let ffT = 0;
export function releaseFireflies() { ffT = 25; }

export function resetNature() {
  // shortcut: spawned trees/flowers share geometry, so they are detached, not disposed; the page reloads per visitor anyway
  grown.splice(0).forEach(g => nature.remove(g.obj));
  volT = -1; volcano.visible = false; clearParticles(lava);
  tornT = -1; tornado.visible = false; birdT = -1; flock.forEach(b => { b.visible = false; }); ffT = 0; fireflies.visible = false;
}

const ease = k => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;
export function updateNature(dt, t) {
  for (const f of floaters) {
    f.a += dt * 0.03; f.g.position.set(Math.cos(f.a) * f.r, f.h + Math.sin(t * 0.6 + f.r) * 0.3, Math.sin(f.a) * f.r); f.g.rotation.y += dt * 0.1;
    for (let j = 0; j < f.N; j++) { const k = j * 3 + 1; f.pos[k] -= dt * (3 + (j % 3)); if (f.pos[k] < -7) f.pos[k] = 0; }
    f.geo.attributes.position.needsUpdate = true;
  }
  const rk = (t * 0.5) % 1; ripple.scale.setScalar(0.2 + rk * 0.9); ripple.material.opacity = 0.5 * (1 - rk);
  for (let i = grown.length - 1; i >= 0; i--) {
    const g = grown[i]; if (g.t >= 1) continue; g.t += dt;
    if (g.t > 0) g.obj.scale.setScalar(Math.max(0.001, g.obj.userData.target * ease(Math.min(1, g.t / 0.8))));
  }
  // volcano
  if (volT >= 0) {
    volT += dt;
    volcano.visible = true; volcano.scale.y = 0.75 * (volT < 1.2 ? Math.max(0.001, ease(volT / 1.2)) : volT > 9 ? Math.max(0.001, 1 - (volT - 9) / 1.5) : 1);
    if (volT > 1.2 && volT < 8) { emit(lava, 7, volcano.position.x, 2.5, volcano.position.z, 0, 8, 0, 1.8, 2.2); view.shake = Math.max(view.shake, 0.12); }
    if (volT > 10.5) { volT = -1; volcano.visible = false; }
  }
  step(lava, dt, -9, (c, j, f) => { const fade = Math.min(1, f * 2.5); c[j] = 2 * fade; c[j + 1] = (0.25 + f * 0.6) * fade; c[j + 2] = 0.05 * fade; });
  // tornado
  if (tornT >= 0) {
    tornT += dt; tornado.visible = true;
    tornado.material.opacity = Math.min(1, tornT / 1.2, (9 - tornT) / 1.2) * 0.75;
    const cx = -7 + (tornT / 9) * 14, cz = 3 + Math.sin(tornT * 0.8) * 2.5;
    for (let i = 0; i < TN; i++) {
      const h = (i / TN) * 8, r = 0.25 + h * 0.32 + Math.sin(t * 3 + i) * 0.06, a = t * 7 + i * 2.4;
      tornPos.set([cx + Math.cos(a) * r, h, cz + Math.sin(a) * r], i * 3);
    }
    tornGeo.attributes.position.needsUpdate = true; view.shake = Math.max(view.shake, 0.08);
    if (tornT > 9) { tornT = -1; tornado.visible = false; }
  }
  // birds
  if (birdT >= 0) {
    birdT += dt;
    const a = birdT * 0.45, lead = new THREE.Vector3(Math.cos(a) * 12, 7.5 + Math.sin(birdT) * 0.5 + Math.max(0, birdT - 12) * 4, Math.sin(a) * 12);
    const dir = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), yaw = Math.atan2(dir.x, dir.z);
    flock.forEach(b => {
      const o = b.userData.off, c = Math.cos(yaw), s = Math.sin(yaw);
      b.visible = true; b.position.set(lead.x + o.x * c + o.z * s, lead.y + o.y, lead.z - o.x * s + o.z * c); b.rotation.y = yaw;
      const flap = Math.sin(t * 9 + b.userData.phase) * 0.6; b.userData.l.rotation.z = flap; b.userData.r.rotation.z = -flap;
    });
    if (birdT > 15) { birdT = -1; flock.forEach(b => { b.visible = false; }); }
  }
  // fireflies
  if (ffT > 0) {
    ffT -= dt; fireflies.visible = true; const fade = Math.min(1, ffT / 2, (25 - ffT) / 2);
    ffBase.forEach(([x, y, z, ph, sp], i) => {
      ffPos.set([x + Math.sin(t * sp + ph) * 0.5, y + Math.sin(t * sp * 1.3 + ph) * 0.3, z + Math.cos(t * sp + ph) * 0.5], i * 3);
      const glow = fade * (0.4 + 0.6 * Math.max(0, Math.sin(t * 3 * sp + ph))); ffCol.set([1.6 * glow, 1.8 * glow, 0.4 * glow], i * 3);
    });
    ffGeo.attributes.position.needsUpdate = true; ffGeo.attributes.color.needsUpdate = true;
    if (ffT <= 0) fireflies.visible = false;
  }
}
