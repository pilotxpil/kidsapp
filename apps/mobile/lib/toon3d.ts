import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Shared bits for the toon-styled three.js scenes (home island, daily star). */
export const INK_HEX = 0x241547;

/** Ink outline: a back-face hull pushed out along smoothed normals → even line width. */
export function inkMaterial(thickness: number) {
  const m = new THREE.MeshBasicMaterial({ color: INK_HEX, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.thickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float thickness;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * thickness;');
  };
  return m;
}

/** Same shape with merged vertices and smooth normals, so the pushed-out hull has no cracks. */
export function hullGeometry(geo: THREE.BufferGeometry) {
  const g = geo.clone();
  g.deleteAttribute('normal');
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  return merged;
}

/** Five-point star extruded with a soft bevel, centred on the origin, tip up. */
export function starGeometry(outer = 1, inner = 0.56, depth = 0.42, bevel = { thickness: 0.2, size: 0.16, segments: 4 }) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / 5 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel.thickness,
    bevelSize: bevel.size,
    bevelSegments: bevel.segments,
    curveSegments: 4,
  });
  g.center();
  return g;
}

/**
 * A shiny gold "matcap" (the look of a lit sphere baked into a texture). It gives metal a
 * convincing shine without an environment map, so it renders the same on every phone.
 */
export function goldMatcap(size = 128): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const light = new THREE.Vector3(-0.45, 0.6, 0.66).normalize();
  const rim = new THREE.Vector3(0.5, -0.55, 0.67).normalize();
  const n = new THREE.Vector3();
  const deep = new THREE.Color(0xc27400);
  const mid = new THREE.Color(0xffc81f);
  const pale = new THREE.Color(0xfff3b0);
  const c = new THREE.Color();
  // THREE.Color works in linear space; the texture is stored as sRGB.
  const srgb = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1;
      const v = (y / (size - 1)) * 2 - 1;
      const d = u * u + v * v;
      const i = (y * size + x) * 4;
      if (d > 1) {
        data.set([194, 116, 0, 255], i);
        continue;
      }
      n.set(u, v, Math.sqrt(1 - d));
      const diff = Math.max(0, n.dot(light));
      // banded gold: deep edges → warm middle → pale top, then a crisp highlight and a warm bounce
      c.copy(deep).lerp(mid, Math.min(1, diff * 1.6));
      c.lerp(pale, Math.max(0, diff - 0.55) * 1.8);
      const spec = Math.pow(Math.max(0, n.dot(light)), 48);
      const bounce = Math.pow(Math.max(0, n.dot(rim)), 6) * 0.35;
      c.r = Math.min(1, c.r + spec + bounce);
      c.g = Math.min(1, c.g + spec + bounce * 0.7);
      c.b = Math.min(1, c.b + spec * 0.9 + bounce * 0.2);
      c.getRGB(srgb, THREE.SRGBColorSpace);
      data.set([srgb.r * 255, srgb.g * 255, srgb.b * 255, 255].map(Math.round), i);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Soft round glow (white centre fading out) for halos and light blobs. */
export function glowTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1;
      const v = (y / (size - 1)) * 2 - 1;
      const a = Math.max(0, 1 - Math.sqrt(u * u + v * v));
      data.set([255, 255, 255, Math.round(255 * a * a)], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

/** Sunburst rays fading towards the edge, for behind a prize. */
export function raysTexture(size = 128, rays = 12): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1;
      const v = (y / (size - 1)) * 2 - 1;
      const r = Math.sqrt(u * u + v * v);
      const ang = Math.atan2(v, u);
      const band = 0.5 + 0.5 * Math.cos(ang * rays);
      const ray = Math.pow(band, 3);
      const fade = Math.max(0, 1 - r) * Math.min(1, r * 4);
      data.set([255, 248, 214, Math.round(255 * ray * fade)], (y * size + x) * 4);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
