import * as THREE from "three";
import { createMaterial, applyUniforms, setResolution, type SceneUniforms } from "./shader";
import { createFlower } from "./flower";
import { createDrift } from "./drift";

export type SceneHandle = {
  enterGame: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
};

export function startScene(
  canvas: HTMLCanvasElement,
  getUniforms: () => SceneUniforms
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
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
  const fgCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  fgCamera.position.set(0, 0.2, 3.2);
  fgCamera.lookAt(0, 0.55, 0);

  const flower = createFlower(pixelRatio);
  // Flower lives in the upper portion of the viewport so the countdown
  // sits cleanly below it.
  flower.group.position.set(0, 0.55, 0);
  flower.group.scale.setScalar(0.85);
  fgScene.add(flower.group);

  // Petals drifting down from the flower
  const drift = createDrift(pixelRatio);
  fgScene.add(drift.mesh);

  let stopped = false;

  function resize() {
    if (stopped) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    setResolution(bgMaterial, w * pixelRatio, h * pixelRatio);
    fgCamera.aspect = w / h;
    fgCamera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  function updateDensity() {
    if (stopped) return;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    flower.setPixelRatio(pixelRatio);
    drift.setPixelRatio(pixelRatio);
    resize();
  }
  updateDensity();

  let raf = 0;
  let paused = false;
  let gameMode = false;

  function frame() {
    if (stopped || paused) return;
    if (Math.min(window.devicePixelRatio || 1, 2) !== pixelRatio) updateDensity();

    const u = getUniforms();
    applyUniforms(bgMaterial, u);
    if (gameMode) {
      bgMaterial.uniforms.uGame.value = THREE.MathUtils.lerp(bgMaterial.uniforms.uGame.value,1,.035);
      if (bgMaterial.uniforms.uGame.value > .999) fgScene.visible = false;
    }
    if (fgScene.visible) {
      const opacity = 1-bgMaterial.uniforms.uGame.value;
      flower.update(u.time,u.arrival,opacity);
      drift.update(u.time,opacity);
    }

    // Subtle camera parallax driven by pointer
    const px = (u.pointer[0] - 0.5) * 0.18;
    const py = 0.2 + (u.pointer[1] - 0.5) * 0.12;
    fgCamera.position.x += (px - fgCamera.position.x) * 0.06;
    fgCamera.position.y += (py - fgCamera.position.y) * 0.06;
    fgCamera.lookAt(0, 0.55, 0);

    renderer.clear();
    renderer.render(bgScene, bgCamera);
    renderer.clearDepth();
    renderer.render(fgScene, fgCamera);

    raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    enterGame() {
      gameMode = true;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        fgScene.visible = false;
        bgMaterial.uniforms.uGame.value = 1;
      }
    },
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
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      flower.dispose();
      drift.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      renderer.dispose();
    },
  };
}
