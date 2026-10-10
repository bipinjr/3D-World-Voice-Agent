// Renderer, camera, lights, sky. Everything else adds itself to `scene`.
// RULE: the number of lights never changes after start-up (toggling a light's visibility
// forces every shader to recompile, which freezes slow laptops). Dim lights with intensity instead.
import * as THREE from 'three';
import { canvasTex } from './util.js';

export const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#world'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
export const lowerQuality = () => renderer.setPixelRatio(1);

export const scene = new THREE.Scene();
export const NIGHT = new THREE.Color('#070b1a'), DAY = new THREE.Color('#62b6ff'), STORM = new THREE.Color('#2a3550'), WHITE = new THREE.Color('#fff');
export const SPACE_BG = [null, null, new THREE.Color('#040817'), new THREE.Color('#14061f')];
export const bg = NIGHT.clone(), bgSmooth = NIGHT.clone(), bgTarget = new THREE.Color();
scene.background = bg;
scene.fog = new THREE.Fog(bg, 35, 95);

export const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
scene.add(camera);
// camera orbit state, shared by all modules
export const view = { angle: 0, r: 21, h: 8, y: -1.5, shake: 0 };

function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

export const hemi = new THREE.HemisphereLight('#9ecbff', '#1a1033', 0.6);
export const sunLight = new THREE.DirectionalLight('#ffffff', 0.8); sunLight.position.set(8, 15, 6);
export const starLight = new THREE.PointLight('#fff1d6', 0, 0, 0);
scene.add(hemi, sunLight, starLight);

const glowTex = canvasTex(128, 128, g => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
glowTex.userData.shared = true;
export const glowSprite = (color, scale, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(scale); return s;
};

const starPos = [];
for (let i = 0; i < 2200; i++) {
  const r = 160 + Math.random() * 80, th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1);
  starPos.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th));
}
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
export const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#fff', size: 2, sizeAttenuation: false, transparent: true, fog: false }));
scene.add(stars);
