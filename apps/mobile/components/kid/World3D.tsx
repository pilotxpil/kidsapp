import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { useFocusEffect } from 'expo-router';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createExpoThreeRenderer } from '../../lib/threeGl';
import { useTheme } from '../../lib/theme-context';
import { haptic } from '../../lib/haptics';
import { playStarTapSfx } from '../../lib/sfx';
import type { Scenery } from '../../constants/themes';
import { Piko } from '../ui/Piko';

/**
 * The kid's "game lobby": a toon-shaded 3D Piko standing on a floating island built for the
 * current world. Ink outlines (inverted hull) keep it in the sticker style of the 2D UI.
 * Tap → Piko jumps, spins and plays the world's sound. Falls back to 2D Piko without WebGL.
 */
const INK = 0x241547;

function canUse3D() {
  if (Platform.OS === 'web') return typeof document !== 'undefined';
  return !isRunningInExpoGo();
}

function toonRamp(): THREE.DataTexture {
  const data = new Uint8Array([120, 120, 120, 255, 196, 196, 196, 255, 255, 255, 255, 255]);
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

type Kit = {
  toon: (color: number, extra?: THREE.MeshToonMaterialParameters) => THREE.MeshToonMaterial;
  part: (geo: THREE.BufferGeometry, mat: THREE.Material, outline?: number) => THREE.Group;
};

/** Ink outline: a back-face hull pushed out along smoothed normals → even line width. */
function inkMaterial(thickness: number) {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.thickness = { value: thickness };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float thickness;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * thickness;');
  };
  return m;
}

function hullGeometry(geo: THREE.BufferGeometry) {
  const g = geo.clone();
  g.deleteAttribute('normal');
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const merged = mergeVertices(g, 1e-3);
  merged.computeVertexNormals();
  return merged;
}

function makeKit(ramp: THREE.Texture): Kit {
  const inks = new Map<number, THREE.Material>();
  const ink = (t: number) => {
    const k = Math.round(t * 1000);
    if (!inks.has(k)) inks.set(k, inkMaterial(t));
    return inks.get(k)!;
  };
  return {
    toon: (color, extra) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra }),
    part: (geo, mat, outline = 0.065) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(geo, mat));
      if (outline > 0) g.add(new THREE.Mesh(hullGeometry(geo), ink(outline)));
      return g;
    },
  };
}

function starGeometry(outer = 1, inner = 0.56, depth = 0.42) {
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
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.16, bevelSegments: 4, curveSegments: 4 });
  g.center();
  return g;
}

function buildPiko(kit: Kit, scenery: Scenery) {
  const piko = new THREE.Group();
  piko.add(kit.part(starGeometry(), kit.toon(0xffc93a, { emissive: 0x6a4000, emissiveIntensity: 0.18 }), 0.075));
  const front = 0.43;
  const black = new THREE.MeshBasicMaterial({ color: INK });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), black);
    eye.scale.set(1, 1.35, 0.45);
    eye.position.set(sx * 0.2, 0.06, front);
    piko.add(eye);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), white);
    hi.position.set(sx * 0.2 + 0.035, 0.12, front + 0.04);
    piko.add(hi);
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), new THREE.MeshBasicMaterial({ color: 0xff8fb1, transparent: true, opacity: 0.85 }));
    cheek.position.set(sx * 0.38, -0.1, front + 0.005);
    piko.add(cheek);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 20, Math.PI), black);
  mouth.rotation.z = Math.PI;
  mouth.position.set(0, -0.08, front + 0.01);
  piko.add(mouth);

  // World costume (same as the 2D Piko).
  const hat = new THREE.Group();
  hat.position.set(0, 1.13, 0);
  if (scenery === 'waves') {
    hat.add(kit.part(new THREE.CylinderGeometry(0.3, 0.36, 0.22, 24), kit.toon(0xffffff), 0.03));
    const band = kit.part(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 24), kit.toon(0x1f7aff), 0.02);
    band.position.y = -0.08;
    hat.add(band);
  } else if (scenery === 'lava') {
    const flame = kit.part(new THREE.ConeGeometry(0.24, 0.55, 16), kit.toon(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 0.5 }), 0.04);
    flame.position.y = 0.16;
    hat.add(flame);
  } else if (scenery === 'leaves') {
    const dome = kit.part(new THREE.SphereGeometry(0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), kit.toon(0xd9ae6a), 0.03);
    hat.add(dome);
    const brim = kit.part(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 28), kit.toon(0xb98c4e), 0.02);
    hat.add(brim);
  } else if (scenery === 'sprinkles') {
    hat.add(kit.part(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20, 1, true), kit.toon(0xff7ab8, { side: THREE.DoubleSide }), 0.02));
    for (let i = 0; i < 5; i++) {
      const spike = kit.part(new THREE.ConeGeometry(0.06, 0.18, 8), kit.toon(0xff7ab8), 0.015);
      const a = (i / 5) * Math.PI * 2;
      spike.position.set(Math.cos(a) * 0.28, 0.18, Math.sin(a) * 0.28);
      hat.add(spike);
    }
  }
  if (scenery !== 'stars') piko.add(hat);
  if (scenery === 'stars') {
    const helmet = new THREE.Mesh(
      new THREE.SphereGeometry(1.32, 32, 24),
      new THREE.MeshToonMaterial({ color: 0xb9e6ff, transparent: true, opacity: 0.22, depthWrite: false })
    );
    piko.add(helmet);
  }
  return piko;
}

function buildIsland(kit: Kit, scenery: Scenery, movers: THREE.Object3D[]) {
  const island = new THREE.Group();
  const add = (o: THREE.Object3D, x = 0, y = 0, z = 0) => {
    o.position.set(x, y, z);
    island.add(o);
    return o;
  };
  switch (scenery) {
    case 'waves': {
      add(kit.part(new THREE.CylinderGeometry(1.55, 1.15, 0.5, 28), kit.toon(0xf7d58b)), 0, -0.25);
      add(kit.part(new THREE.CylinderGeometry(2.2, 2.2, 0.1, 40), kit.toon(0x4fb3ff, { transparent: true, opacity: 0.85 }), 0.02), 0, -0.42);
      add(kit.part(new THREE.ConeGeometry(0.16, 0.12, 5), kit.toon(0xff8a65), 0.02), 0.95, 0.06, 0.6);
      for (let i = 0; i < 4; i++) {
        const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.1 + i * 0.03, 12, 10), new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.75 })), -1.4 + i * 0.9, 0, 0.6);
        b.userData = { kind: 'rise', base: -0.4, speed: 0.5 + i * 0.15, phase: i * 1.7 };
        movers.push(b);
      }
      break;
    }
    case 'lava': {
      add(kit.part(new THREE.CylinderGeometry(1.5, 1.05, 0.55, 9), kit.toon(0x9c5a43)), 0, -0.27);
      for (const [x, z, r] of [[0.7, 0.55, 0.32], [-0.5, 0.75, 0.22]] as const) {
        const pool = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 16), new THREE.MeshBasicMaterial({ color: 0xff8a1f })), x, 0.01, z);
        pool.userData = { kind: 'glow', speed: 3 + r * 4, phase: x };
        movers.push(pool);
      }
      const cone = add(kit.part(new THREE.ConeGeometry(0.75, 1.3, 9), kit.toon(0xb06a4e)), -1.35, 0.6, -0.6);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 12), new THREE.MeshBasicMaterial({ color: 0xffb13a }));
      crater.position.y = 0.6;
      cone.add(crater);
      for (let i = 0; i < 5; i++) {
        const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd54a : 0xff7a1a })), -1.35, 1.2, -0.6);
        e.userData = { kind: 'ember', speed: 0.6 + i * 0.12, phase: i * 1.3, x0: -1.35 };
        movers.push(e);
      }
      break;
    }
    case 'leaves': {
      add(kit.part(new THREE.CylinderGeometry(1.5, 1.2, 0.3, 28), kit.toon(0x3fbf6a)), 0, -0.15);
      add(kit.part(new THREE.CylinderGeometry(1.2, 0.8, 0.45, 28), kit.toon(0x8b5a2b)), 0, -0.52);
      for (const [x, z, s] of [[-1.15, -0.4, 1], [1.2, -0.5, 0.8]] as const) {
        add(kit.part(new THREE.CylinderGeometry(0.09, 0.12, 0.8, 8), kit.toon(0x8b5a2b), 0.02), x, 0.4 * s, z);
        add(kit.part(new THREE.SphereGeometry(0.45 * s, 16, 12), kit.toon(0x2fae5a)), x, 0.95 * s, z);
      }
      add(kit.part(new THREE.SphereGeometry(0.1, 10, 8), kit.toon(0xff4fa3), 0.02), 0.85, 0.08, 0.7);
      break;
    }
    case 'stars': {
      add(kit.part(new THREE.SphereGeometry(1.15, 32, 24), kit.toon(0x7a4dff)), 0, -1.1);
      const ring = add(kit.part(new THREE.TorusGeometry(1.65, 0.07, 10, 48), kit.toon(0xffc233), 0.02), 0, -1.1);
      ring.rotation.x = Math.PI / 2.4;
      const moon = add(kit.part(new THREE.SphereGeometry(0.22, 16, 12), kit.toon(0xe8e0ff), 0.03), 1.8, 0.4, 0);
      moon.userData = { kind: 'orbit', r: 1.9, speed: 0.6, y: 0.2 };
      movers.push(moon);
      break;
    }
    case 'sprinkles': {
      add(kit.part(new THREE.CylinderGeometry(1.4, 1.4, 0.6, 32), kit.toon(0xff9ac8)), 0, -0.3);
      add(kit.part(new THREE.CylinderGeometry(1.45, 1.45, 0.12, 32), kit.toon(0xffffff), 0.02), 0, 0.02);
      for (const [x, color] of [[-1.25, 0x7ae7ff], [1.25, 0xb57bff]] as const) {
        add(kit.part(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), kit.toon(0xffffff), 0.015), x, 0.45, -0.3);
        add(kit.part(new THREE.SphereGeometry(0.32, 16, 12), kit.toon(color)), x, 1.0, -0.3);
      }
      add(kit.part(new THREE.SphereGeometry(0.14, 12, 10), kit.toon(0xff3b5c), 0.02), 0.6, 0.22, 0.55);
      break;
    }
  }
  return island;
}

export function World3D({ height = 210 }: { height?: number }) {
  const { world } = useTheme();
  const [failed, setFailed] = useState(!canUse3D());
  const active = useRef(true);
  const jump = useRef({ t: -1, n: 0 });
  const raf = useRef<number | null>(null);
  // Each GL context bumps the generation; loops from older contexts stop themselves.
  const gen = useRef(0);

  useFocusEffect(
    useCallback(() => {
      active.current = true;
      return () => {
        active.current = false;
      };
    }, [])
  );

  useEffect(
    () => () => {
      gen.current += 1;
      if (raf.current != null) cancelAnimationFrame(raf.current);
      raf.current = null;
    },
    []
  );

  const onPress = () => {
    jump.current.t = 0;
    jump.current.n = (jump.current.n % 4) + 1;
    playStarTapSfx(jump.current.n);
    haptic.press();
  };

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const myGen = ++gen.current;
    try {
      const renderer = createExpoThreeRenderer(gl);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
      camera.position.set(0, 1.0, 7.4);
      camera.lookAt(0, -0.15, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      const sun = new THREE.DirectionalLight(0xffffff, 1.6);
      sun.position.set(3, 5, 4);
      scene.add(sun);

      const kit = makeKit(toonRamp());
      const movers: THREE.Object3D[] = [];
      const stage = new THREE.Group();
      const island = buildIsland(kit, world.scenery, movers);
      island.position.y = world.scenery === 'stars' ? -0.62 : -1.05;
      stage.add(island);
      const piko = buildPiko(kit, world.scenery);
      piko.scale.setScalar(0.78);
      stage.add(piko);
      scene.add(stage);

      let last = Date.now();
      let t = 0;
      const loop = () => {
        if (myGen !== gen.current) return;
        raf.current = requestAnimationFrame(loop);
        if (!active.current) return;
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        t += dt;

        let lift = 0;
        let spin = 0;
        let squash = 1;
        if (jump.current.t >= 0) {
          jump.current.t += dt / 0.75;
          const p = jump.current.t;
          if (p >= 1) jump.current.t = -1;
          else {
            lift = Math.sin(p * Math.PI) * 0.95;
            spin = p * Math.PI * 2;
            squash = p < 0.12 ? 1 - Math.sin((p / 0.12) * Math.PI) * 0.12 : 1;
          }
        }
        piko.position.y = 0.32 + Math.sin(t * 2.2) * 0.07 + lift;
        piko.rotation.y = Math.sin(t * 0.9) * 0.35 + spin;
        piko.rotation.z = Math.sin(t * 1.3) * 0.05;
        piko.scale.set(0.78 / Math.sqrt(squash), 0.78 * squash, 0.78);
        stage.rotation.y = Math.sin(t * 0.25) * 0.25;

        for (const m of movers) {
          const u = m.userData as { kind: string; speed: number; phase?: number; base?: number; x0?: number; r?: number; y?: number };
          if (u.kind === 'rise') {
            const k = ((t * u.speed + (u.phase ?? 0)) % 2.4) / 2.4;
            m.position.y = (u.base ?? 0) + k * 2.6;
            m.scale.setScalar(k > 0.85 ? (1 - k) / 0.15 : 1);
          } else if (u.kind === 'ember') {
            const k = ((t * u.speed + (u.phase ?? 0)) % 1.6) / 1.6;
            m.position.y = 1.25 + k * 1.6;
            m.position.x = (u.x0 ?? 0) + Math.sin(k * 6 + (u.phase ?? 0)) * 0.25;
            m.scale.setScalar(1 - k * 0.8);
          } else if (u.kind === 'glow') {
            const k = 0.5 + 0.5 * Math.sin(t * u.speed + (u.phase ?? 0));
            ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setRGB(1, 0.35 + 0.3 * k, 0.05 + 0.08 * k, THREE.SRGBColorSpace);
          } else if (u.kind === 'orbit') {
            m.position.x = Math.cos(t * u.speed) * (u.r ?? 1.8);
            m.position.z = Math.sin(t * u.speed) * (u.r ?? 1.8) * 0.5;
            m.position.y = (u.y ?? 0) + Math.sin(t * u.speed) * 0.3;
          }
        }

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      loop();
    } catch {
      setFailed(true);
    }
  };

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Piko" style={{ height, width: '100%' }}>
      {failed ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Piko size={height * 0.7} mood="cheer" bob />
        </View>
      ) : (
        <GLView key={world.scenery} style={{ flex: 1 }} onContextCreate={onContextCreate} />
      )}
    </Pressable>
  );
}
