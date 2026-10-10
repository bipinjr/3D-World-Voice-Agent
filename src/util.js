import * as THREE from 'three';

export const $ = s => document.querySelector(s);
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...extra });

// Free GPU memory of a removed object. Textures marked userData.shared are kept.
export function disposeDeep(root) {
  root.traverse(o => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) {
      for (const k of ['map', 'emissiveMap']) if (m[k] && !m[k].userData.shared) m[k].dispose();
      m.dispose();
    }
  });
}
