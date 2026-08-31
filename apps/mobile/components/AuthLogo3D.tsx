import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

export type AuthLogoVariant = 'gem' | 'coin' | 'shield';

type Props = {
  variant?: AuthLogoVariant;
  size?: number;
  style?: ViewStyle;
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

/** 3D auth logos — gem (kid), coin (parent), shield (register). */
export function AuthLogo3D({ variant = 'gem', size = 120, style }: Props) {
  const rafRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

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
      42,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      100
    );
    camera.position.set(0, 0.15, 4.1);

    scene.add(new THREE.AmbientLight(variant === 'gem' ? 0xc4b5fd : 0xffffff, 0.5));

    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(2, 3, 4);
    scene.add(key);

    const rim = new THREE.DirectionalLight(
      variant === 'gem' ? 0xffc107 : variant === 'coin' ? 0xff5252 : 0xffd700,
      0.85
    );
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    const accent = new THREE.PointLight(
      variant === 'gem' ? 0x00e5ff : variant === 'coin' ? 0xff1744 : 0xffc107,
      1.1,
      12
    );
    accent.position.set(0, 0.5, 2);
    scene.add(accent);

    let hero: THREE.Mesh;
    let heroMat: THREE.MeshPhysicalMaterial;
    let ring: THREE.Mesh | null = null;
    const glowColor =
      variant === 'gem' ? 0x7c4dff : variant === 'coin' ? 0xe2231a : 0xffc107;

    if (variant === 'gem') {
      heroMat = new THREE.MeshPhysicalMaterial({
        color: 0x7c4dff,
        metalness: 0.75,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        emissive: 0x512da8,
        emissiveIntensity: 0.35,
      });
      hero = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), heroMat);
      ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35, 0.06, 12, 48),
        new THREE.MeshStandardMaterial({
          color: 0xffc107,
          metalness: 0.9,
          roughness: 0.2,
          emissive: 0xff8f00,
          emissiveIntensity: 0.4,
        })
      );
      ring.rotation.x = Math.PI / 2.8;
      scene.add(ring);
    } else if (variant === 'coin') {
      heroMat = new THREE.MeshPhysicalMaterial({
        color: 0xe2231a,
        metalness: 0.82,
        roughness: 0.18,
        clearcoat: 0.9,
        emissive: 0x7f0000,
        emissiveIntensity: 0.25,
      });
      hero = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.24, 40), heroMat);
      hero.rotation.x = Math.PI / 2.2;
      ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.05, 0.05, 10, 48),
        new THREE.MeshStandardMaterial({
          color: 0xffd700,
          metalness: 0.95,
          roughness: 0.15,
          emissive: 0xff8f00,
          emissiveIntensity: 0.35,
        })
      );
      ring.rotation.x = Math.PI / 2.2;
      scene.add(ring);
    } else {
      heroMat = new THREE.MeshPhysicalMaterial({
        color: 0xffd700,
        metalness: 0.88,
        roughness: 0.15,
        clearcoat: 1,
        emissive: 0xb8860b,
        emissiveIntensity: 0.3,
      });
      hero = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.22), heroMat);
    }

    scene.add(hero);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 48),
      new THREE.MeshBasicMaterial({
        color: glowColor,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
      })
    );
    glow.position.z = -0.6;
    scene.add(glow);

    const clock = new THREE.Clock();

    const render = () => {
      if (disposedRef.current) return;
      rafRef.current = requestAnimationFrame(render);

      const t = clock.getElapsedTime();

      if (variant === 'gem') {
        hero.rotation.y = t * 0.85;
        hero.rotation.x = Math.sin(t * 0.7) * 0.35 + 0.25;
      } else if (variant === 'coin') {
        hero.rotation.z = t * 0.75;
        hero.rotation.y = Math.sin(t * 0.6) * 0.2;
      } else {
        hero.rotation.y = Math.sin(t * 0.5) * 0.25;
        hero.rotation.x = Math.sin(t * 0.7) * 0.12;
      }

      hero.position.y = Math.sin(t * 1.5) * 0.1;

      if (ring) {
        ring.rotation.z = t * 0.5;
        if (variant === 'gem') {
          ring.rotation.x = Math.PI / 2.8 + Math.sin(t * 0.9) * 0.15;
        }
      }

      heroMat.emissiveIntensity =
        (variant === 'gem' ? 0.28 : variant === 'coin' ? 0.22 : 0.26) +
        Math.sin(t * 2.4) * 0.1;
      (glow.material as THREE.MeshBasicMaterial).opacity = 0.14 + Math.sin(t * 2) * 0.06;

      accent.position.x = Math.sin(t * 1.1) * 0.8;
      accent.position.y = Math.cos(t * 0.9) * 0.5;

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
}

/** @deprecated use AuthLogo3D */
export const WelcomeGem3D = AuthLogo3D;

const styles = StyleSheet.create({
  gl: { flex: 1 },
});
