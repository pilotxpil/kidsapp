import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { useFocusEffect } from 'expo-router';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { createExpoThreeRenderer } from '../../lib/threeGl';
import { INK_HEX as INK, hullGeometry, inkMaterial, starGeometry } from '../../lib/toon3d';
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

/** The 2D Piko's flame tuft (Piko.tsx "lava" outfit) as a chunky extrusion; base at y=0. */
function flameGeometry(inner: boolean) {
  const s = new THREE.Shape();
  if (inner) {
    s.moveTo(0, 0.4);
    s.bezierCurveTo(0.1, 0.275, 0.1, 0.15, 0.025, 0.05);
    s.bezierCurveTo(0, 0.125, -0.025, 0.125, -0.05, 0.05);
    s.bezierCurveTo(-0.1, 0.15, -0.1, 0.275, 0, 0.4);
  } else {
    s.moveTo(0, 0.65);
    s.bezierCurveTo(0.25, 0.4, 0.3, 0.2, 0.15, 0);
    s.bezierCurveTo(0.1, 0.15, 0.025, 0.2, 0, 0.3);
    s.bezierCurveTo(-0.025, 0.2, -0.1, 0.15, -0.15, 0);
    s.bezierCurveTo(-0.3, 0.2, -0.25, 0.4, 0, 0.65);
  }
  const depth = inner ? 0.06 : 0.16;
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function buildPiko(kit: Kit, scenery: Scenery, movers: THREE.Object3D[]) {
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
    // Flame tuft sitting on the top spike: its notch hugs the tip, like the 2D outfit.
    const flame = new THREE.Group();
    flame.add(kit.part(flameGeometry(false), kit.toon(0xff7a1a, { emissive: 0xff4a00, emissiveIntensity: 0.35 }), 0.035));
    const core = new THREE.Mesh(flameGeometry(true), new THREE.MeshBasicMaterial({ color: 0xffd54a }));
    core.position.z = 0.13;
    flame.add(core);
    flame.position.y = -0.33;
    flame.scale.setScalar(1.15);
    flame.userData = { kind: 'flicker', speed: 9, phase: 0 };
    movers.push(flame);
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
      // Cool basalt reads against the orange sky; everything hot glows (unlit materials).
      const ROCK = 0x5a4775;
      const ROCK_DARK = 0x3a2b52;
      const lavaMat = () => new THREE.MeshBasicMaterial({ color: 0xff8a1f });
      add(kit.part(new THREE.CylinderGeometry(1.75, 1.6, 0.36, 11), kit.toon(ROCK)), 0, -0.18);
      const underside = add(kit.part(new THREE.ConeGeometry(1.6, 0.75, 11), kit.toon(ROCK_DARK)), 0, -0.735);
      underside.rotation.x = Math.PI;

      // Lava pools with a hot core, and cracks running between them.
      for (const [x, z, r] of [[0.85, 0.6, 0.3], [-0.35, 0.95, 0.2]] as const) {
        const pool = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.04, 20), lavaMat()), x, 0.005, z);
        pool.userData = { kind: 'glow', speed: 2.5 + r * 4, phase: x };
        movers.push(pool);
        add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, 0.05, 16), new THREE.MeshBasicMaterial({ color: 0xffd54a })), x, 0.01, z);
      }
      for (const [x, z, len, rot] of [[0.35, 0.75, 0.7, 0.25], [0.95, 0.05, 0.6, 1.4], [-0.75, 0.55, 0.55, -0.6]] as const) {
        const crack = add(new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.06), lavaMat()), x, 0.005, z);
        crack.rotation.y = rot;
      }

      // The volcano (left of Piko so it stays visible): a truncated cone with a crater lip,
      // glowing lava and two flows down its face.
      const V = { x: -1.28, z: -0.42, h: 1.15, top: 0.24, base: 0.56 };
      const volcano = add(new THREE.Group(), V.x, V.h / 2, V.z);
      volcano.add(kit.part(new THREE.CylinderGeometry(V.top, V.base, V.h, 14), kit.toon(ROCK)));
      const lip = kit.part(new THREE.TorusGeometry(V.top, 0.065, 8, 20), kit.toon(ROCK_DARK), 0.02);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = V.h / 2;
      volcano.add(lip);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(V.top - 0.05, V.top - 0.05, 0.02, 20), new THREE.MeshBasicMaterial({ color: 0xffc23a }));
      crater.position.y = V.h / 2 + 0.005;
      volcano.add(crater);
      const slope = (V.base - V.top) / V.h;
      // θ = 0 faces +z (the camera); the volcano sits left, so the camera is at θ ≈ 0.15
      for (const [start, width, h] of [[-0.12, 0.3, 0.78], [-0.85, 0.2, 0.45]] as const) {
        // radius follows the cone's slope, just above its surface
        const rTop = V.top + 0.015;
        const flow = new THREE.Mesh(
          new THREE.CylinderGeometry(rTop, rTop + slope * h, h, 6, 1, true, start, width),
          new THREE.MeshBasicMaterial({ color: 0xff8a1f, side: THREE.DoubleSide })
        );
        flow.position.y = V.h / 2 - h / 2;
        volcano.add(flow);
      }

      // Rocks and glowing crystals around the rim.
      for (const [x, z, s] of [[1.25, 0.75, 0.17], [0.15, -1.2, 0.14], [-1.45, 0.35, 0.12]] as const) {
        const rock = add(kit.part(new THREE.IcosahedronGeometry(s, 0), kit.toon(ROCK_DARK), 0.02), x, s * 0.5, z);
        rock.rotation.set(x, z, 0);
      }
      for (const [x, z, s, tilt] of [[1.2, -0.45, 1, -0.25], [1.42, -0.15, 0.7, 0.35], [0.95, -0.7, 0.6, 0.1]] as const) {
        const crystal = add(kit.part(new THREE.OctahedronGeometry(0.15, 0), kit.toon(0xff4f6d, { emissive: 0xff2a4a, emissiveIntensity: 0.45 }), 0.02), x, 0.2 * s, z);
        crystal.scale.set(s, s * 1.9, s);
        crystal.rotation.z = tilt;
      }

      // Smoke puffs and embers rising out of the crater.
      const top = { x: V.x, y: V.h + 0.05, z: V.z };
      for (let i = 0; i < 3; i++) {
        const puff = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 2), kit.toon(0xf6efea, { transparent: true, opacity: 0.8, depthWrite: false })), top.x, top.y, top.z);
        puff.userData = { kind: 'smoke', speed: 0.3, phase: i / 3, x0: top.x, base: top.y };
        movers.push(puff);
      }
      for (let i = 0; i < 6; i++) {
        const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd54a : 0xff7a1a })), top.x, top.y, top.z);
        e.userData = { kind: 'ember', speed: 0.55 + i * 0.1, phase: i * 1.1, x0: top.x, base: top.y };
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
      const piko = buildPiko(kit, world.scenery, movers);
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
            m.position.y = (u.base ?? 1.25) + k * 1.6;
            m.position.x = (u.x0 ?? 0) + Math.sin(k * 6 + (u.phase ?? 0)) * 0.25;
            m.scale.setScalar(1 - k * 0.8);
          } else if (u.kind === 'smoke') {
            const k = (t * u.speed + (u.phase ?? 0)) % 1;
            // drifts up and away from Piko (to the left), swelling as it fades
            m.position.y = (u.base ?? 0) + k * 1.2;
            m.position.x = (u.x0 ?? 0) - k * 0.45 + Math.sin(t * 1.5 + (u.phase ?? 0) * 6) * 0.04;
            m.scale.setScalar(0.55 + k * 1.3);
            ((m as THREE.Mesh).material as THREE.MeshToonMaterial).opacity = 0.85 * Math.min(1, k * 6) * (1 - k);
          } else if (u.kind === 'flicker') {
            m.scale.set(1.15 * (1 + Math.sin(t * u.speed) * 0.04), 1.15 * (1 + Math.sin(t * u.speed * 1.3 + 1) * 0.08), 1.15);
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
