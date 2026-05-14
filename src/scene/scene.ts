import * as THREE from "three";
import { createMaterial, applyUniforms, setResolution, type SceneUniforms } from "./shader";

export type SceneHandle = {
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

export function startScene(
  canvas: HTMLCanvasElement,
  getUniforms: () => SceneUniforms
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = createMaterial();
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    setResolution(material, w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let raf = 0;
  let stopped = false;
  let paused = false;

  function frame() {
    if (stopped || paused) return;
    applyUniforms(material, getUniforms());
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    pause() {
      if (paused || stopped) return;
      paused = true;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (!paused || stopped) return;
      paused = false;
      frame();
    },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
