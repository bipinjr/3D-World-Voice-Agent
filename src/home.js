// Level 1: the home-base island, rocket, weather, day/night and the 4 world themes.
import * as THREE from 'three';
import { scene, camera, view, glowTex, glowSprite } from './scene.js';
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
  // rocky underside with hanging spires, so the island looks like solid ground
  const rockGeo = new THREE.ConeGeometry(6.5, 5, 28, 6), ra = rockGeo.attributes.position;
  for (let i = 0; i < ra.count; i++) if (ra.getY(i) < 2.4) ra.setXYZ(i, ra.getX(i) * rand(0.9, 1.1), ra.getY(i) + rand(-0.25, 0.25), ra.getZ(i) * rand(0.9, 1.1));
  rockGeo.computeVertexNormals();
  const rock = new THREE.Mesh(rockGeo, std('#2a2f45', { flatShading: true, roughness: 0.95 })); rock.rotation.x = Math.PI; rock.position.y = -3.9;
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28, sp = new THREE.Mesh(new THREE.ConeGeometry(rand(0.4, 0.8), rand(1.5, 3), 6), std('#252a3d', { flatShading: true })); sp.rotation.x = Math.PI; sp.position.set(Math.cos(a) * rand(3, 5), -2.2, Math.sin(a) * rand(3, 5)); lab.add(sp); }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(9, 0.08, 8, 96), rimMat); rim.rotation.x = Math.PI / 2;
  lab.add(island, rock, rim);
  // hologram grid on the ground, tinted with the world colour
  const grid = new THREE.Mesh(new THREE.RingGeometry(0.6, 8.9, 96), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = 0.02; lab.add(grid);
}

// ---------- rocket: a real-life multi-stage launcher (PSLV-style) on a steel launch tower
const rocket = new THREE.Group();
const accent = new THREE.Color('#38e1ff'); // world colour, set by applyHomeTheme
const bandMat = new THREE.MeshBasicMaterial({ color: '#38e1ff' }); // pad ring pulses in the world colour
const noseLight = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff3b5c' }));
const nozzleGlow = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: '#ff9a3d' }));
const hullTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#f3f5f9'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,90,110,.35)'; g.lineWidth = 2;
  for (let y = 40; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } // panel seams
  g.fillStyle = '#1b1f2a'; g.fillRect(0, h * 0.86, w, 18);
  [['#ff9933', 0], ['#ffffff', 1], ['#138808', 2]].forEach(([c, i]) => { g.fillStyle = c; g.fillRect(w * 0.5 - 20, h * 0.14 + i * 11, 40, 11); });
  g.save(); g.translate(w * 0.5, h * 0.52); g.rotate(-Math.PI / 2); g.font = 'bold 34px Orbitron, sans-serif'; g.fillStyle = '#1b1f2a'; g.textAlign = 'center'; g.fillText('BHARAT', 0, 12); g.restore();
});
const hull = std('#ffffff', { map: hullTex, roughness: 0.45, metalness: 0.1 }), plain = std('#f3f5f9', { roughness: 0.45, metalness: 0.1 }), dark = std('#20242f', { metalness: 0.7, roughness: 0.35 });
function makeFlame(scale) { // orange outside, yellow middle, white-hot core
  const f = new THREE.Group();
  [[0.5, 2.2, '#ff5a1f', 0.75], [0.34, 1.6, '#ffb347', 0.9], [0.18, 1.0, '#fff6d0', 1]].forEach(([r, h, c, o]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r * scale, h * scale, 20, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.y = (h * scale) / 2 - 0.1; f.add(m);
  });
  f.rotation.x = Math.PI; f.scale.setScalar(0.001); return f;
}
{
  const v2 = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 4.2, 40), hull); core.position.y = 2.1;
  const inter = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.25, 40), dark); inter.position.y = 4.32;
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.3, 40), plain); upper.position.y = 5.1;
  const fairing = new THREE.Mesh(new THREE.LatheGeometry(v2([[0.42, 0], [0.48, 0.15], [0.48, 0.9], [0.4, 1.3], [0.24, 1.65], [0.06, 1.88], [0, 1.92]]), 40), plain); fairing.position.y = 5.75;
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 0.42, 24, 1, true), dark); engine.position.y = -0.2;
  nozzleGlow.rotation.x = Math.PI / 2; nozzleGlow.position.y = -0.4;
  rocket.add(core, inter, upper, fairing, engine, nozzleGlow);
}
const flame = makeFlame(1); flame.position.y = -0.42; rocket.add(flame);
// four strap-on boosters that separate in flight
const boosters = [], boosterHome = [];
for (let i = 0; i < 4; i++) {
  const a = i * Math.PI / 2 + Math.PI / 4, b = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 24), plain); body.position.y = 1.3;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 24), plain); nose.position.y = 2.85;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.12, 24), dark); band.position.y = 0.5;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.25, 16, 1, true), dark); bell.position.y = -0.12;
  const bf = makeFlame(0.55); bf.position.y = -0.25;
  b.add(body, nose, band, bell, bf);
  b.position.set(Math.sin(a) * 0.62, 0.1, Math.cos(a) * 0.62);
  b.userData = { flame: bf, vel: new THREE.Vector3(), spin: new THREE.Vector3(), falling: false };
  rocket.add(b); boosters.push(b); boosterHome.push(b.position.clone());
}
rocket.scale.setScalar(0.8);
const PAD = new THREE.Vector3(-4.5, 0.65, 1.2);
rocket.position.copy(PAD); lab.add(rocket);
// the glow light lives in the scene (not inside `lab`) so hiding the island never changes the light count
const rocketGlow = new THREE.PointLight('#ff8a2b', 0, 18); scene.add(rocketGlow);
const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.3, 40), std('#4a5068', { metalness: 0.4, roughness: 0.6 })); pad.position.set(PAD.x, 0.15, PAD.z); lab.add(pad);
const padRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.05, 8, 64), bandMat); padRing.rotation.x = Math.PI / 2; padRing.position.set(PAD.x, 0.31, PAD.z); lab.add(padRing);
// steel umbilical tower with service arms that swing away at ignition
const tower = new THREE.Group(), steel = std('#c2410c', { metalness: 0.5, roughness: 0.5 }), steelDark = std('#3f3f46', { metalness: 0.6, roughness: 0.4 });
{
  const H = 6.6;
  for (const [x, z] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, H, 0.08), steel); post.position.set(x, H / 2, z); tower.add(post); }
  for (let y = 0.6; y < H; y += 0.6) for (const [x, z, ry] of [[0, -0.35, 0], [0, 0.35, 0], [-0.35, 0, Math.PI / 2], [0.35, 0, Math.PI / 2]]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.05), steel); brace.position.set(x, y, z); brace.rotation.y = ry; tower.add(brace);
  }
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), steelDark); cap.position.y = H; tower.add(cap);
  noseLight.position.y = H + 0.2; tower.add(noseLight);
}
const arms = [2.8, 4.4].map(y => { const pivot = new THREE.Group(); pivot.position.set(-0.35, y, 0); const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.18), steelDark); arm.position.x = -0.5; pivot.add(arm); tower.add(pivot); return pivot; });
tower.position.set(PAD.x + 1.55, 0.3, PAD.z); lab.add(tower);
const NOFLAME = new THREE.Vector3(0.001, 0.001, 0.001);
function separateBoosters() {
  home.rk.sep = true;
  boosters.forEach(b => {
    lab.attach(b);
    const out = b.position.clone().sub(rocket.position).setY(0).normalize();
    b.userData.vel.copy(out.multiplyScalar(3)).setY(home.rk.v * 0.5); b.userData.spin.set(rand(-2, 2), 0, rand(-2, 2));
    b.userData.falling = true; b.userData.flame.scale.copy(NOFLAME);
  });
}
function restoreBoosters() {
  home.rk.sep = false;
  boosters.forEach((b, i) => { rocket.add(b); b.position.copy(boosterHome[i]); b.rotation.set(0, 0, 0); b.scale.set(1, 1, 1); b.visible = true; b.userData.falling = false; });
}
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
const ledgeMat = std('#1a1f33', { metalness: 0.6, roughness: 0.4 });
// stepped skyscraper: tiers with ledges, then an antenna beacon or a custom roof
function building(g, x, z, w, h, mat, edge, roof) {
  const tiers = h > 4.5 ? [0.58, 0.27, 0.15] : h > 2.6 ? [0.68, 0.32] : [1];
  let y = 0, ww = w;
  for (const f of tiers) {
    const th = h * f, geo = new THREE.BoxGeometry(ww, th, ww), b = new THREE.Mesh(geo, mat);
    b.position.set(x, y + th / 2, z); g.add(b);
    if (edge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edge })); e.position.copy(b.position); g.add(e); }
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(ww * 1.08, 0.09, ww * 1.08), ledgeMat); ledge.position.set(x, y + th, z); g.add(ledge);
    y += th; ww *= 0.76;
  }
  if (roof) return roof(g, x, y, z, ww);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.05, 1.1, 6), ledgeMat); ant.position.set(x, y + 0.55, z);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: edge || '#ff3b5c' })); tip.position.set(x, y + 1.13, z);
  g.add(ant, tip); (g.userData.tips ||= []).push(tip);
}
// ring road with glowing lane dashes
function ringRoad(g, lane) {
  const road = new THREE.Mesh(new THREE.RingGeometry(6.2, 7.1, 96), std('#151826', { roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.y = 0.03; g.add(road);
  const dashMat = new THREE.MeshBasicMaterial({ color: lane }), dashGeo = new THREE.BoxGeometry(0.32, 0.02, 0.06);
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, d = new THREE.Mesh(dashGeo, dashMat); d.position.set(Math.cos(a) * 6.65, 0.05, Math.sin(a) * 6.65); d.rotation.y = -a + Math.PI / 2; g.add(d); }
}
// street lamps around the road
function lamps(g, color, n = 12) {
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.05, 1.4, 6);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + 0.13; if (Math.hypot(Math.cos(a) * 7.35 + 4.5, Math.sin(a) * 7.35 - 1.2) < 2) continue;
    const pole = new THREE.Mesh(poleGeo, ledgeMat); pole.position.set(Math.cos(a) * 7.35, 0.7, Math.sin(a) * 7.35);
    const head = glowSprite(color, 0.9, 0.9); head.position.set(pole.position.x, 1.45, pole.position.z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color })); bulb.position.copy(head.position);
    g.add(pole, head, bulb);
  }
}
// vehicles that loop around the ring (flying cars, e-cars, rovers, a submarine…)
function traffic(g, make, n, rMin, rMax, hMin, hMax, speed) {
  const list = [];
  for (let i = 0; i < n; i++) { const v = make(i); g.add(v); list.push({ v, a: rand(0, 6.28), r: rand(rMin, rMax), h: rand(hMin, hMax), s: speed * rand(0.7, 1.3) * (i % 2 ? 1 : -1) }); }
  return (t, dt) => list.forEach(o => {
    o.a += o.s * dt; const p = a => [Math.cos(a) * o.r, o.h, Math.sin(a) * o.r];
    o.v.position.set(...p(o.a)); o.v.lookAt(...p(o.a + Math.sign(o.s) * 0.05));
  });
}
function car(body, front, back, size = 1) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.26 * size, 0.16 * size, 0.6 * size), std(body, { metalness: 0.6, roughness: 0.3 })); g.add(shell);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.2 * size, 0.1 * size, 0.28 * size), std('#9fe8ff', { emissive: '#38e1ff', emissiveIntensity: 0.4 })); cabin.position.y = 0.12 * size; g.add(cabin);
  const f = glowSprite(front, 0.7 * size, 1); f.position.z = 0.34 * size; const b = glowSprite(back, 0.6 * size, 1); b.position.z = -0.34 * size; g.add(f, b);
  return g;
}
function hologram(text, color) {
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = 'rgba(10,0,30,.35)'; c.fillRect(0, 0, w, h); c.strokeStyle = color; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8);
    c.font = 'bold 40px Orbitron, Outfit, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = color; c.shadowBlur = 18; c.fillStyle = '#fff'; c.fillText(text, w / 2, h / 2);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
}
const blinkTips = (g, t) => (g.userData.tips || []).forEach((tip, i) => { tip.visible = Math.sin(t * 3 + i * 1.7) > -0.2; });

function buildSpace() {
  const g = new THREE.Group(), metal = std('#9aa6c4', { metalness: 0.7, roughness: 0.35 });
  const glass = std('#bfe9ff', { metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.55, emissive: '#1a3a7a', emissiveIntensity: 0.7 });
  for (const [x, z, s] of [[1.5, -4.2, 1.7], [-1.4, -5.6, 1.1], [4.6, -3.4, 1]]) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(s * 1.04, s * 1.1, 0.35, 40), metal); base.position.set(x, 0.17, z);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(s, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), glass); dome.position.set(x, 0.35, z);
    g.add(base, dome);
    for (let k = 0; k < 3; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(s * 1.01, 0.035, 6, 40, Math.PI), metal); rib.position.set(x, 0.35, z); rib.rotation.y = k * Math.PI / 3; g.add(rib); }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.1), std('#38e1ff', { emissive: '#38e1ff', emissiveIntensity: 0.8 })); door.position.set(x, 0.55, z + s * 0.95); g.add(door);
  }
  // radar dish on a mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 3.6, 8), metal); mast.position.set(-2.8, 1.8, -3.5);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.75, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), std('#e5e9f5', { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }));
  dish.position.set(-2.8, 3.7, -3.5); dish.rotation.x = -1.1;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: '#ff3b5c' })); beacon.position.set(-2.8, 4.1, -3.5); g.userData.tips = [beacon];
  g.add(mast, dish, beacon);
  // supply crates
  for (const [x, z] of [[3.2, -0.6], [3.7, -0.9], [3.45, -0.4]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), std('#f59e0b', { roughness: 0.6 })); c.position.set(x, 0.2, z); g.add(c); }
  ringRoad(g, '#38e1ff'); lamps(g, '#7af0ff');
  const rovers = traffic(g, () => {
    const r = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.55), std('#e5e9f5', { metalness: 0.4 })); body.position.y = 0.2; r.add(body);
    for (const [x, z] of [[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.2], [0.22, -0.2]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12), ledgeMat); w.rotation.z = Math.PI / 2; w.position.set(x, 0.09, z); r.add(w); }
    const eye = glowSprite('#38e1ff', 0.5, 1); eye.position.set(0, 0.35, 0.28); r.add(eye); return r;
  }, 3, 6.5, 6.8, 0, 0, 0.18);
  g.userData.anim = (t, dt) => { blinkTips(g, t); dish.rotation.z = t * 0.6; rovers(t, dt); };
  return g;
}
function buildCyber() {
  const g = new THREE.Group(), neon = ['#ff4fd8', '#38e1ff', '#ffc94d', '#7cff8a'], lit = ['#ff4fd8', '#38e1ff', '#ffc94d'];
  const mat = new THREE.MeshStandardMaterial({ color: '#2a2040', map: windowsTex(lit), emissive: '#ffffff', emissiveMap: windowsTex(lit), emissiveIntensity: 0.9, roughness: 0.5 });
  [[1, -5, 1.6, 7], [3.5, -3.6, 1.2, 4.5], [-1.6, -6, 1.3, 5.5], [5.6, -1, 1, 3], [-3.2, -4.4, 1, 3.8], [2.2, -1.6, 0.9, 2.5], [6, -4.5, 1.1, 5], [-0.4, -3.2, 0.8, 2]]
    .forEach(([x, z, w, h], i) => building(g, x, z, w, h, mat, neon[i % 4]));
  // neon shops along the front
  const shopMat = new THREE.MeshStandardMaterial({ color: '#1e1636', map: windowsTex(lit), emissive: '#ffffff', emissiveMap: windowsTex(lit), emissiveIntensity: 0.6 });
  [[2.6, 3.6], [3.9, 2.4], [0.9, 4.4], [4.9, 0.9]].forEach(([x, z], i) => building(g, x, z, 0.9, 0.8, shopMat, neon[(i + 1) % 4], (gg, bx, y, bz) => {
    const s = hologram(['CHAI', 'METRO', 'DOSA', 'TECH'][i], neon[i]); s.scale.setScalar(0.5); s.position.set(bx, y + 0.25, bz); gg.add(s);
  }));
  // hologram billboards
  const boards = [['AI • 2040', '#ff4fd8', -0.2, 4.4, -4.1], ['VOICE ON', '#38e1ff', 4.3, 3.6, -2.7], ['NAMMA AI', '#ffc94d', -2.4, 3.2, -3.5]].map(([txt, c, x, y, z]) => { const h = hologram(txt, c); h.position.set(x, y, z); g.add(h); return h; });
  const tex = canvasTex(512, 128, (c, w, h) => {
    c.font = 'bold 50px Orbitron, Outfit, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = '#ff4fd8'; c.shadowBlur = 24; c.fillStyle = '#ff4fd8'; c.fillText('NAMMA BENGALURU', w / 2, h / 2); c.shadowBlur = 0; c.fillStyle = '#fff'; c.fillText('NAMMA BENGALURU', w / 2, h / 2);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  sign.position.set(1, 8.2, -5); g.add(sign);
  ringRoad(g, '#ff4fd8'); lamps(g, '#ff4fd8');
  const cars = traffic(g, i => car('#1e1b2e', '#ffffff', neon[i % 4]), 9, 6.3, 7.2, 1.2, 4.2, 0.35);
  g.userData.anim = (t, dt) => {
    sign.material.opacity = Math.sin(t * 13) > -0.85 ? 1 : 0.3; sign.lookAt(camera.position.x, sign.position.y, camera.position.z);
    boards.forEach((b, i) => { b.lookAt(camera.position.x, b.position.y, camera.position.z); b.material.opacity = Math.sin(t * (7 + i) + i) > -0.9 ? 0.95 : 0.4; });
    blinkTips(g, t); cars(t, dt);
  };
  return g;
}
function buildSmart() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: '#dfeaff', map: windowsTex(['#2f6fd6', '#5aa2ff'], '#e8f0ff'), emissive: '#ffffff', emissiveMap: windowsTex(['#7cc4ff', '#ffe9a8'], '#000000'), emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.25 });
  const garden = (gg, x, y, z, w) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.12, w * 0.95), std('#22c55e', { roughness: 0.9 })); s.position.set(x, y + 0.06, z); gg.add(s);
    for (let k = 0; k < 2; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 6), std('#16a34a', { flatShading: true })); c.position.set(x + (k - 0.5) * w * 0.45, y + 0.33, z); gg.add(c); }
  };
  [[1, -5, 1.5, 5.5], [3.6, -3.4, 1.2, 4], [-1.5, -5.8, 1.2, 4.5], [-3.4, -4, 0.9, 3], [5.8, -1.2, 1, 2.5]].forEach(([x, z, w, h]) => building(g, x, z, w, h, glass, null, garden));
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
  ringRoad(g, '#7cff8a'); lamps(g, '#ffe9a8');
  const cars = traffic(g, i => car(['#f8fafc', '#38bdf8', '#4ade80'][i % 3], '#ffffff', '#ff3b5c', 0.9), 7, 6.4, 6.9, 0.12, 0.12, 0.25);
  g.userData.anim = (t, dt) => { hubs.forEach(({ holder, hub }) => { holder.lookAt(camera.position.x, holder.position.y, camera.position.z); hub.rotation.z += dt * 2; }); halo.rotation.z += dt; cars(t, dt); };
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
  for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(rand(0.3, 0.6), 12, 12), std(pick(['#ff6ad5', '#ff9a3d', '#ffc94d']), { flatShading: true })); const a = rand(0, 6.28); c.position.set(Math.cos(a) * rand(3, 7), 0.2, Math.sin(a) * rand(3, 7)); g.add(c); }
  const fish = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Group(), col = pick(['#ffb020', '#ff6ad5', '#3de8ff', '#ffe14d']);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), std(col, { emissive: col, emissiveIntensity: 0.3 })); body.scale.set(0.5, 0.8, 1.3);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 8), std(col)); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.6;
    f.add(body, tail); g.add(f); fish.push({ f, r: rand(6, 11), h: rand(2, 6), sp: rand(0.3, 0.6) * (i % 2 ? 1 : -1), a: rand(0, 6.28) });
  }
  const sub = traffic(g, () => { // a yellow submarine cruising around the base
    const s = new THREE.Group(), hullS = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.4, 8, 16), std('#facc15', { metalness: 0.3, roughness: 0.4 })); hullS.rotation.x = Math.PI / 2; s.add(hullS);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.5), std('#eab308')); fin.position.y = 0.5; s.add(fin);
    const lamp = glowSprite('#9ff6ff', 1.2, 1); lamp.position.z = 1.2; s.add(lamp); return s;
  }, 1, 11, 11, 4, 4, 0.12);
  const at = (o, a) => new THREE.Vector3(Math.sin(a) * o.r, o.h + Math.sin(a * 3) * 0.4, Math.cos(a) * o.r);
  g.userData.anim = (t, dt) => {
    weeds.forEach((w, i) => { w.rotation.z = Math.sin(t * 1.5 + i) * 0.18; });
    fish.forEach(o => { o.a += o.sp * dt; o.f.position.copy(at(o, o.a)); o.f.lookAt(at(o, o.a + o.sp * 0.1)); });
    sub(t, dt);
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
const SOLAR = ['Jupiter', 'Saturn', 'Mars', 'Venus', 'Earth', 'Neptune', 'Uranus', 'Mercury', 'Pluto']; // planets are named after our solar system
// How each world looks and sounds in levels 2–3 (space), so the chosen world carries through the whole game
Object.assign(THEMES.space, { hero: 'Jupiter', hello: 'The stars look amazing tonight.', star: '#ffd27a', glow: '#ffb347', tint: '#ffffff',
  nebula: ['#ff4fd8', '#38e1ff', '#7a5cff', '#ff7a3d'], names: SOLAR });
Object.assign(THEMES.cyber, { hero: 'Jupiter', hello: 'Namma Bengaluru never sleeps!', star: '#ff8ae0', glow: '#ff4fd8', tint: '#ffb0ee',
  nebula: ['#ff4fd8', '#ff2d95', '#7a5cff', '#38e1ff'], names: SOLAR });
Object.assign(THEMES.ocean, { hero: 'Jupiter', hello: 'Watch out for the fish!', star: '#b8f8ff', glow: '#3de8ff', tint: '#8ff0ff',
  nebula: ['#3de8ff', '#1fa3c4', '#46e38a', '#7a5cff'], names: SOLAR });
Object.assign(THEMES.smart, { hero: 'Jupiter', hello: 'Everything here runs on AI and clean energy.', star: '#e4ffd8', glow: '#7cff8a', tint: '#c6ffd2',
  nebula: ['#7cff8a', '#38e1ff', '#ffe14d', '#5aa2ff'], names: SOLAR });
Object.values(THEMES).forEach(th => lab.add(th.props));
// solid objects cast real shadows, so everything looks grounded
lab.traverse(o => { if (o.isMesh) { o.receiveShadow = true; if (!o.material.transparent) o.castShadow = true; } });

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
  Object.assign(home.rk, { phase: 'idle', t: 0, v: 0 }); restoreBoosters(); arms.forEach(a => { a.rotation.y = 0; });
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
    arms.forEach(a => { a.rotation.y = -1.4 * Math.min(1, rk.t / 0.8); }); // service arms swing clear
    rocket.position.x = PAD.x + (Math.random() - 0.5) * 0.06; view.shake = Math.max(view.shake, 0.08);
    emit(8, PAD.x, 0.35, PAD.z, 3.5, 0.4, 1.6); // billowing cloud at the pad
    if (rk.t > 1.2) { rk.phase = 'flying'; rk.v = 0; rocket.position.x = PAD.x; }
  } else if (rk.phase === 'flying') {
    rk.v += dt * 14; rocket.position.y += rk.v * dt; flame.scale.set(1 + Math.random() * 0.15, 1 + Math.random() * 0.5, 1 + Math.random() * 0.15);
    if (!rk.sep && rocket.position.y - PAD.y > 16) separateBoosters();
    rocket.rotation.y += dt * 1.4; emit(12, rocket.position.x, rocket.position.y - 0.6, rocket.position.z, 0.9, -7, 1.3);
    view.shake = Math.max(view.shake, 0.15 - rocket.position.y * 0.004);
    if (rocket.position.y > 70) { rk.phase = 'gone'; rk.t = 0; }
  } else if (rk.phase === 'gone') {
    rk.t += dt; rocketGlow.intensity = 0; if (rk.t > 2.5) { rk.phase = 'landing'; rocket.position.y = 25; restoreBoosters(); }
  } else if (rk.phase === 'landing') {
    rocket.position.y = PAD.y + (rocket.position.y - PAD.y) * Math.pow(0.25, dt);
    flame.scale.setScalar(0.5 + Math.random() * 0.2); rocketGlow.intensity = 12; emit(4, rocket.position.x, rocket.position.y - 0.6, rocket.position.z, 0.5, -4, 0.8);
    if (rocket.position.y - PAD.y < 0.03) { rocket.position.y = PAD.y; rocket.rotation.y = 0; rk.phase = 'idle'; arms.forEach(a => { a.rotation.y = 0; }); flame.scale.setScalar(0.001); rocketGlow.intensity = 0; }
  }
  rocketGlow.position.set(rocket.position.x, rocket.position.y - 0.5, rocket.position.z);
  const boosting = rk.phase === 'countdown' || (rk.phase === 'flying' && !rk.sep);
  boosters.forEach(b => {
    const d = b.userData;
    if (!d.falling) { d.flame.scale.copy(boosting ? flame.scale : NOFLAME); return; }
    d.vel.y -= 9.8 * dt; b.position.addScaledVector(d.vel, dt); b.rotation.x += d.spin.x * dt; b.rotation.z += d.spin.z * dt;
    if (b.position.y < -20) b.visible = false;
  });
  // camera tilts up to follow the launch, then settles back
  const followTarget = level === 1 && (rk.phase === 'countdown' || rk.phase === 'flying') ? Math.min(rocket.position.y - PAD.y, 28) : 0;
  view.follow += (followTarget - view.follow) * Math.min(1, dt * 2.5);
  // idle life: neon bands breathe, nose light blinks, hologram rings scan up the rocket
  bandMat.color.copy(accent).multiplyScalar(0.7 + 0.5 * Math.sin(t * 2.2));
  noseLight.visible = Math.sin(t * 5) > 0;
  const idle = rk.phase === 'idle';
  holo.forEach((r, i) => { const k = (t * 0.35 + i / holo.length) % 1; r.visible = idle; r.position.set(PAD.x, PAD.y + k * 5.8, PAD.z); r.material.opacity = Math.sin(k * Math.PI) * 0.7; r.scale.setScalar(1 - k * 0.35); });
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
