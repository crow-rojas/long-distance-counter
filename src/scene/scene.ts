import * as THREE from "three";
import { createMaterial, applyUniforms, setResolution, type SceneUniforms } from "./shader";
import { createFlower } from "./flower";

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
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.autoClear = false;

  // --- Background: orthographic fullscreen quad with dawn shader ---
  const bgScene = new THREE.Scene();
  const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bgGeometry = new THREE.PlaneGeometry(2, 2);
  const bgMaterial = createMaterial();
  const bgQuad = new THREE.Mesh(bgGeometry, bgMaterial);
  bgScene.add(bgQuad);

  // --- Foreground: perspective camera with the 3D particle flower ---
  const fgScene = new THREE.Scene();
  const fgCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  fgCamera.position.set(0, 0, 3.6);
  fgCamera.lookAt(0, 0.25, 0);

  const flower = createFlower(pixelRatio);
  flower.mesh.position.set(0, 0.35, 0);
  fgScene.add(flower.mesh);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    setResolution(bgMaterial, w * pixelRatio, h * pixelRatio);
    fgCamera.aspect = w / h;
    fgCamera.updateProjectionMatrix();
  }
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let raf = 0;
  let stopped = false;
  let paused = false;

  function frame() {
    if (stopped || paused) return;

    const u = getUniforms();
    applyUniforms(bgMaterial, u);
    flower.update(u.time, u.arrival);

    // Subtle camera parallax driven by pointer
    const px = (u.pointer[0] - 0.5) * 0.25;
    const py = (u.pointer[1] - 0.5) * 0.2;
    fgCamera.position.x += (px - fgCamera.position.x) * 0.06;
    fgCamera.position.y += (py - fgCamera.position.y) * 0.06;
    fgCamera.lookAt(0, 0.25, 0);

    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
    renderer.render(fgScene, fgCamera);

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
      flower.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      renderer.dispose();
    },
  };
}
