import './style.css';
import * as THREE from 'three';
import { photo, sky, updateSparkles, renderer, composer, scene, camera, view, NIGHT, DAY, STORM, WHITE, SPACE_BG, bg, bgSmooth, bgTarget, hemi, sunLight, starLight, stars, lowerQuality } from './scene.js';
import { home, updateHome } from './home.js';
import { updateSpace, warmupGroup } from './space.js';
import { updateFx } from './fx.js';
import { updateNature } from './nature.js';
import { state, LEVELS, bindUI } from './game.js';
import { reportError, showFatal } from './ui.js';

addEventListener('error', e => reportError(e.error || e.message));
addEventListener('unhandledrejection', e => reportError(e.reason));

// GPU driver reset / tab out of memory: restore instead of freezing
renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); reportError('WebGL context lost'); setTimeout(() => location.reload(), 1500); });

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const shakeVec = new THREE.Vector3();

let warming = true;
function frame(dt, t) {
  const L = state.level, inSpace = L >= 2;
  updateHome(dt, t, L);
  const fov = updateSpace(dt, t);

  if (inSpace) bgTarget.copy(SPACE_BG[L]); else bgTarget.copy(NIGHT).lerp(DAY, home.dayT).lerp(STORM, home.rainLevel * 0.6);
  bgSmooth.lerp(bgTarget, Math.min(1, dt * 2));
  bg.copy(bgSmooth).lerp(WHITE, home.flash * 0.35); scene.fog.color.copy(bg);
  const u = sky.material.uniforms;
  u.top.value.copy(bg).multiplyScalar(0.45); u.bottom.value.copy(bg).multiplyScalar(1.35); u.glow.value.set(home.theme.rim);
  u.c1.value.set(home.theme.nebula[0]); u.c2.value.set(home.theme.nebula[2]); u.time.value = t;
  u.nebula.value = inSpace ? 0.75 : 0.15 + 0.45 * (1 - home.dayT); u.starAmt.value = inSpace ? 1 : (1 - home.dayT) * (1 - home.rainLevel);
  updateSparkles(dt, t); updateFx(dt, t); if (L === 1) updateNature(dt, t);
  stars.material.opacity = inSpace ? 1 : (1 - home.dayT) * (1 - home.rainLevel * 0.7);
  hemi.intensity = inSpace ? 0.75 : (0.6 + 0.9 * home.dayT) * (1 - 0.4 * home.rainLevel) + home.flash * 3;
  sunLight.intensity = inSpace ? 0.2 : (0.7 + 1.3 * home.dayT) * (1 - 0.5 * home.rainLevel);
  starLight.intensity = inSpace ? 2.4 : 0;

  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const c = LEVELS[L].cam, ease = Math.min(1, dt * 1.5);
  view.r += (c.r * view.zoom - view.r) * ease; view.h += (c.h - view.h) * ease; view.y += (c.y - view.y) * ease;
  view.angle += dt * (0.05 + view.spin); view.spin *= Math.pow(0.35, dt);
  camera.position.set(Math.sin(view.angle) * view.r, view.h, Math.cos(view.angle) * view.r);
  if (!reduceMotion && view.shake > 0.001) camera.position.add(shakeVec.set((Math.random() - 0.5) * view.shake, (Math.random() - 0.5) * view.shake, 0));
  view.shake *= Math.pow(0.1, dt);
  camera.lookAt(0, view.y + view.follow * 0.75, 0);
  if (warming) return;
  composer.render(dt);
  if (photo.cb) { const cb = photo.cb; photo.cb = null; cb(renderer.domElement.toDataURL('image/png')); } // same frame, so the canvas still holds the image
}

// The loop can never die: one bad frame is reported and skipped.
const clock = new THREE.Clock();
let badSince = 0, fpsFrames = 0, fpsTime = 0, slowStreak = 0, lowered = false;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  try { frame(dt, t); badSince = 0; }
  catch (err) {
    const now = performance.now();
    if (!badSince) { badSince = now; reportError(err); }
    // still broken after 5 s of retrying: restart the app by itself (kiosk-safe)
    if (now - badSince > 5000) { renderer.setAnimationLoop(null); showFatal(); setTimeout(() => location.reload(), 3000); }
  }
  // slow laptop? drop resolution once instead of stuttering
  fpsFrames++; fpsTime += dt;
  if (fpsTime >= 2) {
    const fps = fpsFrames / fpsTime; fpsFrames = 0; fpsTime = 0;
    slowStreak = fps < 28 && !document.hidden ? slowStreak + 1 : 0;
    if (slowStreak >= 2 && !lowered) { lowered = true; lowerQuality(); }
  }
});

// Compile every shader now (while the start screen is up) so nothing stalls mid-game.
async function prewarm() {
  const g = warmupGroup(); g.position.set(0, -200, 0); scene.add(g);
  const hidden = []; scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  try {
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
  } catch (err) { reportError(err); }
  finally { hidden.forEach(o => { o.visible = false; }); g.visible = false; warming = false; } // keep g: disposing it would free the compiled shaders
}

try { bindUI(); window.__booted = true; } catch (err) { reportError(err); showFatal(); }
prewarm();
