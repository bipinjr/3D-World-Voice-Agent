// Renderer, camera, lights, sky. Everything else adds itself to `scene`.
// RULE: the number of lights never changes after start-up (toggling a light's visibility
// forces every shader to recompile, which freezes slow laptops). Dim lights with intensity instead.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { canvasTex } from './util.js';

export const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#world'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; // cinematic colour grading

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

// Glow: only bright things (neon, sun, portal, fireworks) bloom.
export const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 })); // samples: keep edges smooth
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.45, 0.82);
composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
// slow laptop: drop glow and resolution
export function lowerQuality() { bloom.enabled = false; renderer.setPixelRatio(1); composer.setPixelRatio(1); resize(); }

function resize() {
  const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight);
  renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
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
export const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ map: glowTex, color: '#c4cde6', size: 4, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false })); // round, just under the glow threshold
scene.add(stars);

// Gradient sky dome: deep at the top, glowing horizon in the world's colour
export const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, glow: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 bottom; uniform vec3 glow; varying vec3 vP; void main(){ float h = vP.y; vec3 c = mix(bottom, top, smoothstep(-0.25, 0.7, h)); c += glow * pow(1.0 - abs(h), 6.0) * 0.16; gl_FragColor = vec4(c, 1.0); }',
}));
sky.renderOrder = -1; scene.add(sky);

// Floating light particles that drift upward around the world
const SPARK = 420, sparkPos = new Float32Array(SPARK * 3);
for (let i = 0; i < SPARK; i++) { const a = Math.random() * 6.28, r = 4 + Math.random() * 30; sparkPos.set([Math.cos(a) * r, Math.random() * 22 - 4, Math.sin(a) * r], i * 3); }
const sparkGeo = new THREE.BufferGeometry(); sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
export const sparkles = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ map: glowTex, color: '#38e1ff', size: 0.35, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(sparkles);
export function updateSparkles(dt, t) {
  for (let i = 0; i < SPARK; i++) { const k = i * 3 + 1; sparkPos[k] += dt * (0.3 + (i % 5) * 0.12); if (sparkPos[k] > 18) sparkPos[k] = -4; }
  sparkGeo.attributes.position.needsUpdate = true;
  sparkles.material.opacity = 0.55 + Math.sin(t * 2) * 0.2;
  sparkles.rotation.y += dt * 0.02;
}
