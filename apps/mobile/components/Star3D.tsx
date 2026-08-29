import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

export type Star3DHandle = {
  punch: (strength?: number) => void;
  burst: () => void;
};

type Props = {
  size?: number;
  style?: ViewStyle;
};

type AnimState = {
  spinSpeed: number;
  punchScale: number;
  burstSpin: number;
  hitFlash: number;
  orbitBoost: number;
  yawKick: number;
};

function createRenderer(gl: ExpoWebGLRenderingContext): THREE.WebGLRenderer {
  const fakeCanvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clientHeight: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth,
  };

  const renderer = new THREE.WebGLRenderer({
    canvas: fakeCanvas as unknown as HTMLCanvasElement,
    context: gl as unknown as WebGLRenderingContext,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function createStarGeometry(outer = 1, inner = 0.42, depth = 0.38): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const spikes = 5;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / spikes - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 2,
  });
  geometry.center();
  return geometry;
}

export const Star3D = forwardRef<Star3DHandle, Props>(function Star3D({ size = 180, style }, ref) {
  const anim = useRef<AnimState>({
    spinSpeed: 1,
    punchScale: 1,
    burstSpin: 0,
    hitFlash: 0,
    orbitBoost: 0,
    yawKick: 0,
  });
  const rafRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

  useImperativeHandle(ref, () => ({
    punch(strength = 1) {
      const s = Math.max(1, strength);
      anim.current.spinSpeed = 10 + s * 2.5;
      anim.current.punchScale = 1.18 + s * 0.04;
      anim.current.hitFlash = 1;
      anim.current.orbitBoost = 1;
      anim.current.yawKick = 0.65 + s * 0.2;
    },
    burst() {
      anim.current.spinSpeed = 15;
      anim.current.punchScale = 1.28;
      anim.current.hitFlash = 1;
      anim.current.orbitBoost = 1;
      anim.current.burstSpin = 1.3;
      anim.current.yawKick = 1.5;
    },
  }));

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    disposedRef.current = false;
    const renderer = createRenderer(gl);
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      40,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.15, 4.1);

    scene.add(new THREE.AmbientLight(0xfff3e0, 0.65));

    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(2.5, 3.5, 3.8);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffe082, 0.45);
    fill.position.set(-2.5, -0.5, 2);
    scene.add(fill);

    const sparkleLight = new THREE.PointLight(0xffd54f, 1.5, 10);
    sparkleLight.position.set(0, 1.2, 2.5);
    scene.add(sparkleLight);

    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xffc107,
      metalness: 0.88,
      roughness: 0.22,
      clearcoat: 0.85,
      clearcoatRoughness: 0.15,
      emissive: 0xff8f00,
      emissiveIntensity: 0.18,
    });

    const starGeo = createStarGeometry(1.02, 0.42, 0.42);
    const star = new THREE.Mesh(starGeo, goldMat);
    scene.add(star);

    // Soft golden halo only
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.55, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffd54f,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    glow.position.z = -0.55;
    scene.add(glow);

    // Small subtle golden mini-stars
    const sparkGeo = createStarGeometry(0.14, 0.06, 0.06);
    const sparkMat = new THREE.MeshStandardMaterial({
      color: 0xfff59d,
      metalness: 0.5,
      roughness: 0.35,
      emissive: 0xffc107,
      emissiveIntensity: 0.45,
    });
    const sparks = Array.from({ length: 6 }, (_, i) => {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.userData.phase = (i / 6) * Math.PI * 2;
      mesh.userData.radius = 1.48 + (i % 2) * 0.12;
      mesh.userData.yAmp = 0.28 + (i % 3) * 0.06;
      scene.add(mesh);
      return mesh;
    });

    const clock = new THREE.Clock();

    const render = () => {
      if (disposedRef.current) return;
      rafRef.current = requestAnimationFrame(render);

      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const a = anim.current;

      if (a.yawKick > 0.001) {
        star.rotation.y += a.yawKick;
        a.yawKick *= Math.exp(-dt * 10);
      } else {
        a.yawKick = 0;
      }

      a.spinSpeed += (1 - a.spinSpeed) * Math.min(1, dt * 0.85);
      a.punchScale += (1 - a.punchScale) * Math.min(1, dt * 3.2);
      a.hitFlash = Math.max(0, a.hitFlash - dt * 2.4);
      a.orbitBoost = Math.max(0, a.orbitBoost - dt * 1.5);
      if (a.burstSpin > 0) a.burstSpin = Math.max(0, a.burstSpin - dt * 1.3);

      star.rotation.y += dt * (1.1 * a.spinSpeed + a.burstSpin * 10 + a.hitFlash * 2.2);
      star.rotation.x = Math.sin(t * 0.95) * 0.24;
      star.rotation.z = Math.sin(t * 0.6) * 0.1;
      star.position.y = Math.sin(t * 1.4) * 0.1;
      star.scale.setScalar(a.punchScale);

      goldMat.emissiveIntensity = 0.18 + a.hitFlash * 1.1;
      (glow.material as THREE.MeshBasicMaterial).opacity =
        0.18 + Math.sin(t * 2.2) * 0.06 + a.hitFlash * 0.28;
      glow.scale.setScalar(0.95 + Math.sin(t * 2.2) * 0.08 + a.hitFlash * 0.18);

      const orbitSpeed = 1.15 + a.orbitBoost * 4.5;
      for (const spark of sparks) {
        const phase = spark.userData.phase as number;
        const radius = spark.userData.radius as number;
        const yAmp = spark.userData.yAmp as number;
        const angle = t * orbitSpeed + phase;
        spark.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.3) * yAmp + Math.sin(t * 2 + phase) * 0.04,
          Math.sin(angle) * radius * 0.5
        );
        spark.rotation.y += dt * (2.2 + a.orbitBoost * 5);
        spark.rotation.z += dt * 1.4;
        const s = 0.7 + Math.sin(t * 3 + phase) * 0.2 + a.hitFlash * 0.15;
        spark.scale.setScalar(s);
      }

      camera.position.x = Math.sin(t * 40) * a.hitFlash * 0.03;
      camera.position.y = 0.15 + Math.cos(t * 35) * a.hitFlash * 0.025;

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    render();
  };

  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <GLView style={styles.gl} onContextCreate={onContextCreate} />
    </View>
  );
});

const styles = StyleSheet.create({
  gl: { flex: 1 },
});
