// Effects that work in every level: aurora, meteor shower, UFO, disco, command pulse.
import * as THREE from 'three';
import { scene, camera, view, glowSprite, sparkles } from './scene.js';
import { rand, std, canvasTex, disposeDeep } from './util.js';

let gen = 0; // bumps on reset so delayed spawns from an old session are dropped

// ---------- aurora: a glowing curtain ringing the sky
const auroraGeo = new THREE.CylinderGeometry(45, 45, 16, 128, 1, true);
const auroraBase = auroraGeo.attributes.position.array.slice();
const aurora = new THREE.Mesh(auroraGeo, new THREE.MeshBasicMaterial({
  map: canvasTex(16, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.35, 'rgba(170,90,255,.9)'); gr.addColorStop(0.7, 'rgba(60,255,170,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }), transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
}));
aurora.position.y = 24; scene.add(aurora);
let auroraT = 0;
export const showAurora = () => { auroraT = 14; };

// ---------- meteor shower
const meteors = [];
export function meteorShower() {
  const g = gen;
  for (let i = 0; i < 24; i++) setTimeout(() => { if (g === gen && meteors.length < 40) spawnMeteor(); }, i * 160);
}
function spawnMeteor() {
  const head = glowSprite('#cfeeff', 1.6, 1);
  const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineBasicMaterial({ color: '#9fe8ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const pos = new THREE.Vector3(rand(-55, 5), rand(35, 55), rand(-40, 20)), vel = new THREE.Vector3(rand(25, 40), rand(-32, -20), rand(-5, 10));
  scene.add(head, trail); meteors.push({ head, trail, pos, vel, t: 0 });
}

// ---------- UFO with a tractor beam
const ufo = new THREE.Group(), ufoLights = [];
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.6, 0.55, 40), std('#c8d2e8', { metalness: 0.8, roughness: 0.25 }));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std('#7af0ff', { transparent: true, opacity: 0.6, emissive: '#38e1ff', emissiveIntensity: 0.6 }));
  dome.position.y = 0.25; ufo.add(disc, dome);
  for (let i = 0; i < 10; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff' }));
    const a = i / 10 * Math.PI * 2; b.position.set(Math.cos(a) * 2.2, -0.05, Math.sin(a) * 2.2); ufo.add(b); ufoLights.push(b);
  }
}
const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 11, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#7af0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beam.position.y = -5.8; ufo.add(beam);
ufo.visible = false; scene.add(ufo);
let ufoT = -1;
const UFO_IN = new THREE.Vector3(-60, 30, -40), UFO_HOVER = new THREE.Vector3(0, 10, 0), UFO_OUT = new THREE.Vector3(80, 50, -60);
export function summonUfo() { if (ufoT < 0) { ufoT = 0; ufo.visible = true; } }

// ---------- disco: sweeping laser beams + colour-cycling sparkles
const lasers = new THREE.Group();
for (let i = 0; i < 8; i++) {
  const geo = new THREE.CylinderGeometry(0.06, 0.6, 40, 8, 1, true); geo.translate(0, 20, 0);
  const l = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(i / 8, 1, 0.6), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.rotation.y = i / 8 * Math.PI * 2; lasers.add(l);
}
lasers.position.y = 0.5; lasers.visible = false; scene.add(lasers);
let discoT = 0; const sparkSaved = new THREE.Color();
export function disco() { if (discoT <= 0) sparkSaved.copy(sparkles.material.color); discoT = 8; }

// ---------- shockwave pulse: visible feedback for every command
const pulseGeo = new THREE.RingGeometry(0.85, 1, 64), pulses = [];
export function pulse(color, y = 0.05) {
  if (pulses.length > 6) return;
  const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = y; scene.add(m); pulses.push({ m, t: 0 });
}

// ---------- camera tricks
export function zoom(dir) { view.zoom = Math.min(1.8, Math.max(0.45, view.zoom * (dir === 'out' ? 1.35 : 0.7))); }
export function spin() { view.spin = 1.6; }

export function resetFx() {
  gen++; auroraT = 0; discoT = 0; lasers.visible = false; ufoT = -1; ufo.visible = false;
  meteors.splice(0).forEach(m => { scene.remove(m.head, m.trail); disposeDeep(m.head); disposeDeep(m.trail); });
  pulses.splice(0).forEach(p => { scene.remove(p.m); p.m.material.dispose(); });
  view.zoom = 1; view.spin = 0;
}

const ease = k => k * k * (3 - 2 * k);
export function updateFx(dt, t) {
  // aurora
  auroraT = Math.max(0, auroraT - dt);
  aurora.visible = auroraT > 0;
  if (aurora.visible) {
    aurora.material.opacity = Math.min(1, auroraT / 2, (14 - auroraT) / 2) * 0.7;
    const p = auroraGeo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const a = Math.atan2(auroraBase[i + 2], auroraBase[i]), s = 1 + 0.08 * Math.sin(a * 6 + t * 1.5);
      p[i] = auroraBase[i] * s; p[i + 2] = auroraBase[i + 2] * s; p[i + 1] = auroraBase[i + 1] + Math.sin(a * 4 + t) * 2;
    }
    auroraGeo.attributes.position.needsUpdate = true;
  }
  // meteors
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]; m.t += dt; m.pos.addScaledVector(m.vel, dt);
    m.head.position.copy(m.pos);
    const arr = m.trail.geometry.attributes.position.array;
    arr.set([m.pos.x, m.pos.y, m.pos.z, m.pos.x - m.vel.x * 0.25, m.pos.y - m.vel.y * 0.25, m.pos.z - m.vel.z * 0.25]);
    m.trail.geometry.attributes.position.needsUpdate = true;
    if (m.t > 2.6) { scene.remove(m.head, m.trail); disposeDeep(m.head); disposeDeep(m.trail); meteors.splice(i, 1); }
  }
  // UFO: fly in, hover with beam, zip away
  if (ufoT >= 0) {
    ufoT += dt;
    if (ufoT < 2) ufo.position.lerpVectors(UFO_IN, UFO_HOVER, ease(ufoT / 2));
    else if (ufoT < 9) ufo.position.set(Math.sin(t * 1.3) * 0.8, UFO_HOVER.y + Math.sin(t * 2) * 0.4, Math.cos(t) * 0.8);
    else ufo.position.lerpVectors(UFO_HOVER, UFO_OUT, ease(Math.min(1, (ufoT - 9) / 1.5)));
    beam.material.opacity = ufoT > 2.3 && ufoT < 9 ? 0.22 + Math.random() * 0.08 : 0;
    ufo.rotation.y += dt * 2;
    ufoLights.forEach((b, i) => b.material.color.setHSL((t * 0.6 + i / 10) % 1, 1, 0.6));
    if (ufoT > 10.6) { ufoT = -1; ufo.visible = false; }
  }
  // disco
  if (discoT > 0) {
    discoT -= dt; lasers.visible = true;
    lasers.rotation.y += dt * 1.8;
    lasers.children.forEach((l, i) => { l.rotation.x = Math.sin(t * 3 + i) * 0.7; l.material.color.setHSL((t * 0.4 + i / 8) % 1, 1, 0.6); });
    sparkles.material.color.setHSL((t * 0.8) % 1, 1, 0.6);
    if (discoT <= 0) { lasers.visible = false; sparkles.material.color.copy(sparkSaved); }
  }
  // pulses
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i]; p.t += dt;
    p.m.scale.setScalar(1 + p.t * 22); p.m.material.opacity = Math.max(0, 0.9 * (1 - p.t / 1.1));
    if (p.t > 1.1) { scene.remove(p.m); p.m.material.dispose(); pulses.splice(i, 1); }
  }
}
