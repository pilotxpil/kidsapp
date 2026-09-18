import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

/** Create a Three.js renderer bound to an Expo GL context (three ≤0.162). */
export function createExpoThreeRenderer(gl: ExpoWebGLRenderingContext): THREE.WebGLRenderer {
  const fakeCanvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clientHeight: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth,
    getContext: () => gl,
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
  if ('outputColorSpace' in renderer && 'SRGBColorSpace' in THREE) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}
