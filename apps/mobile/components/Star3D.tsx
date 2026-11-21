import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { createExpoThreeRenderer } from '../lib/threeGl';
import { glowTexture, goldMatcap, hullGeometry, inkMaterial, raysTexture, starGeometry } from '../lib/toon3d';
import { Piko } from './ui/Piko';

export type Star3DHandle = {
  /** One tap: `strength` is the tap number, `charge` how full the star is (0–1). */
  punch: (strength?: number, charge?: number) => void;
  /** The last tap: the star bursts into sparkles and coins. */
  burst: () => void;
};

type Props = {
  size?: number;
  style?: ViewStyle;
};

type Particle = {
  mesh: THREE.Object3D;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  ttl: number;
  size: number;
  gravity: number;
};

function shouldUse3D(): boolean {
  if (Platform.OS === 'web') return true;
  return !isRunningInExpoGo();
}

const SPARK_COLORS = [0xffffff, 0xfff3b0, 0xffd54a, 0xffb84d, 0xffc6e0];

/**
 * The daily star: a shiny gold toy star (matcap gold + ink outline, like Piko) in front of
 * turning light rays. Every tap spins it once, sends out a shockwave and a spray of
 * sparkles and charges it brighter; the last tap bursts it into sparkles and coins.
 */
export const Star3D = forwardRef<Star3DHandle, Props>(function Star3D({ size = 180, style }, ref) {
  const fx = useRef({
    charge: 0,
    pop: 1,
    flash: 0,
    spin: 0,
    spinTarget: 0,
    shake: 0,
    queue: [] as Array<{ kind: 'tap' | 'burst'; n: number }>,
  });
  const rafRef = useRef<number | null>(null);
  const disposedRef = useRef(false);
  const [failed, setFailed] = useState(!shouldUse3D());

  useImperativeHandle(ref, () => ({
    punch(strength = 1, charge) {
      const f = fx.current;
      f.charge = charge ?? Math.min(1, f.charge + 0.25);
      f.pop = 1.22 + Math.min(4, strength) * 0.03;
      f.flash = 1;
      f.shake = 0.6;
      f.spinTarget += Math.PI * 2;
      f.queue.push({ kind: 'tap', n: strength });
    },
    burst() {
      const f = fx.current;
      f.charge = 1;
      f.pop = 1.45;
      f.flash = 1.4;
      f.shake = 1;
      f.spinTarget += Math.PI * 4;
      f.queue.push({ kind: 'burst', n: 0 });
    },
  }));

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      disposedRef.current = false;
      const renderer = createExpoThreeRenderer(gl);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
      camera.position.set(0, 0, 5.4);

      // Light rays and a warm halo behind the star.
      const rays = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 4.2),
        new THREE.MeshBasicMaterial({ map: raysTexture(128, 12), transparent: true, depthWrite: false, opacity: 0.55 })
      );
      rays.position.z = -1.4;
      scene.add(rays);
      const halo = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 3.6),
        new THREE.MeshBasicMaterial({ map: glowTexture(64), color: 0xffe27a, transparent: true, depthWrite: false, opacity: 0.55 })
      );
      halo.position.z = -0.9;
      scene.add(halo);

      // The star: pillowy bevel, gold matcap, ink outline.
      const gold = new THREE.MeshMatcapMaterial({ matcap: goldMatcap(128) });
      const starGeo = starGeometry(1, 0.5, 0.3, { thickness: 0.24, size: 0.2, segments: 6 });
      const star = new THREE.Group();
      star.add(new THREE.Mesh(starGeo, gold));
      star.add(new THREE.Mesh(hullGeometry(starGeo), inkMaterial(0.055)));
      scene.add(star);

      // A twinkle that glints on the upper-left tip.
      const twinkle = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.55),
        new THREE.MeshBasicMaterial({ map: glowTexture(64), transparent: true, depthWrite: false, opacity: 0 })
      );
      twinkle.position.set(-0.5, 0.42, 0.45);
      star.add(twinkle);

      // Little stars orbiting while it waits.
      const tinyGeo = starGeometry(0.13, 0.065, 0.04, { thickness: 0.02, size: 0.02, segments: 1 });
      const orbiters = Array.from({ length: 5 }, (_, i) => {
        const m = new THREE.Mesh(tinyGeo, gold);
        m.userData = { phase: (i / 5) * Math.PI * 2, radius: 1.55 + (i % 2) * 0.15 };
        scene.add(m);
        return m;
      });

      // Pools for shockwave rings, sparkles and coins (allocated once).
      const rings = Array.from({ length: 3 }, () => {
        const m = new THREE.Mesh(
          new THREE.RingGeometry(0.92, 1.0, 64),
          new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide })
        );
        m.position.z = 0.2;
        m.visible = false;
        m.userData = { life: 1 };
        scene.add(m);
        return m;
      });
      let ringIx = 0;
      const sparkGeo = starGeometry(0.11, 0.045, 0.03, { thickness: 0.015, size: 0.015, segments: 1 });
      const sparks: Particle[] = Array.from({ length: 40 }, (_, i) => {
        const mesh = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: SPARK_COLORS[i % SPARK_COLORS.length], transparent: true }));
        mesh.visible = false;
        scene.add(mesh);
        return { mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, ttl: 1, size: 1, gravity: 0 };
      });
      let sparkIx = 0;
      const coinGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24);
      coinGeo.rotateX(Math.PI / 2);
      const coinInk = inkMaterial(0.02);
      const coinHull = hullGeometry(coinGeo);
      const coins: Particle[] = Array.from({ length: 12 }, () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(coinGeo, gold));
        g.add(new THREE.Mesh(coinHull, coinInk));
        g.visible = false;
        scene.add(g);
        return { mesh: g, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, ttl: 1, size: 1, gravity: 0 };
      });

      const rand = (a: number, b: number) => a + Math.random() * (b - a);
      const launch = (p: Particle, speed: number, ttl: number, gravity: number, size: number, up = 0) => {
        const a = Math.random() * Math.PI * 2;
        p.mesh.position.set(Math.cos(a) * 0.4, Math.sin(a) * 0.4, rand(0.1, 0.6));
        p.vel.set(Math.cos(a) * speed, Math.sin(a) * speed + up, rand(-0.5, 1.2));
        p.spin.set(rand(-8, 8), rand(-8, 8), rand(-10, 10));
        p.life = 0;
        p.ttl = ttl;
        p.gravity = gravity;
        p.size = size;
        p.mesh.visible = true;
      };
      const ring = (delay = 0) => {
        const r = rings[ringIx++ % rings.length];
        r.userData.life = -delay;
        r.visible = true;
      };
      const spawn = (kind: 'tap' | 'burst') => {
        if (kind === 'tap') {
          ring();
          for (let i = 0; i < 10; i++) launch(sparks[sparkIx++ % sparks.length], rand(2.2, 3.6), rand(0.55, 0.85), 4, rand(0.8, 1.3));
        } else {
          ring();
          ring(0.12);
          for (let i = 0; i < 26; i++) launch(sparks[sparkIx++ % sparks.length], rand(2.8, 5), rand(0.8, 1.2), 5, rand(0.9, 1.6));
          for (const c of coins) launch(c, rand(1.6, 3.2), rand(1.2, 1.5), 7, 1, 2.6);
        }
      };

      const clock = new THREE.Clock();
      const render = () => {
        if (disposedRef.current) return;
        rafRef.current = requestAnimationFrame(render);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
        const f = fx.current;

        while (f.queue.length) spawn(f.queue.shift()!.kind);

        f.pop += (1 - f.pop) * Math.min(1, dt * 7);
        f.flash = Math.max(0, f.flash - dt * 2.6);
        f.shake = Math.max(0, f.shake - dt * 3);
        f.spin += (f.spinTarget - f.spin) * Math.min(1, dt * 5);

        // Star: bob and sway, one full turn per tap (always ends facing front), swell with charge.
        const base = 1 + f.charge * 0.1;
        star.scale.setScalar(base * f.pop);
        star.position.y = Math.sin(t * 1.6) * 0.08;
        star.rotation.y = Math.sin(t * 1.1) * 0.4 + f.spin;
        star.rotation.z = Math.sin(t * 0.7) * 0.06;
        const tremble = f.charge >= 0.7 ? 0.02 * f.charge : 0;
        star.position.x = Math.sin(t * 47) * tremble;
        gold.color.setScalar(1 + f.flash * 0.55 + f.charge * 0.12);
        (twinkle.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.sin(t * 2.3)) ** 8 * 0.9 + f.flash * 0.5;
        twinkle.scale.setScalar(0.6 + Math.max(0, Math.sin(t * 2.3)) ** 8 * 0.8);

        rays.rotation.z -= dt * (0.25 + f.charge * 0.7 + f.flash * 1.5);
        (rays.material as THREE.MeshBasicMaterial).opacity = 0.45 + f.charge * 0.4 + f.flash * 0.15;
        rays.scale.setScalar(1 + f.charge * 0.05 + f.flash * 0.04);
        (halo.material as THREE.MeshBasicMaterial).opacity = 0.45 + f.charge * 0.3 + f.flash * 0.35 + Math.sin(t * 2.2) * 0.05;
        halo.scale.setScalar(1 + f.charge * 0.2 + f.flash * 0.25 + Math.sin(t * 2.2) * 0.04);

        for (const o of orbiters) {
          const a = t * (1.2 + f.charge * 1.5) + (o.userData.phase as number);
          const r = o.userData.radius as number;
          o.position.set(Math.cos(a) * r, Math.sin(a * 1.3) * 0.3, Math.sin(a) * r * 0.45);
          o.rotation.z += dt * 2;
          o.rotation.y += dt * 3;
        }

        for (const r of rings) {
          if (!r.visible) continue;
          r.userData.life += dt / 0.55;
          const k = r.userData.life as number;
          if (k < 0) continue;
          if (k >= 1) {
            r.visible = false;
            continue;
          }
          r.scale.setScalar(1 + k * 1.6);
          (r.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - k);
        }
        const step = (p: Particle) => {
          if (!p.mesh.visible) return;
          p.life += dt;
          const k = p.life / p.ttl;
          if (k >= 1) {
            p.mesh.visible = false;
            return;
          }
          p.vel.y -= p.gravity * dt;
          p.vel.multiplyScalar(1 - dt * 0.8);
          p.mesh.position.addScaledVector(p.vel, dt);
          p.mesh.rotation.x += p.spin.x * dt;
          p.mesh.rotation.y += p.spin.y * dt;
          p.mesh.rotation.z += p.spin.z * dt;
          p.mesh.scale.setScalar(p.size * (k < 0.75 ? 1 : (1 - k) / 0.25));
        };
        sparks.forEach(step);
        coins.forEach(step);

        camera.position.x = Math.sin(t * 50) * f.shake * 0.04;
        camera.position.y = Math.cos(t * 43) * f.shake * 0.035;

        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      render();
    } catch (err) {
      console.warn('[Star3D] WebGL unavailable', err instanceof Error ? err.message : err);
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Piko size={size * 0.7} mood="wow" outfit="none" bob />
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size }, style, { pointerEvents: 'none' }]}>
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
});

const styles = StyleSheet.create({
  gl: { flex: 1 },
});
