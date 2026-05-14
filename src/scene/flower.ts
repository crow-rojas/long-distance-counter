import * as THREE from "three";
import vert from "./shaders/flower.vert?raw";
import frag from "./shaders/flower.frag?raw";

export type FlowerHandle = {
  mesh: THREE.Points;
  update(time: number, arrival: number): void;
  dispose(): void;
};

const PARTICLE_COUNT_DESKTOP = 3500;
const PARTICLE_COUNT_MOBILE = 1800;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Palette stops, center → edge
const C_CENTER = [1.00, 0.50, 0.70];
const C_MID    = [1.00, 0.62, 0.78];
const C_EDGE   = [1.00, 0.85, 0.85];

function mix3(a: number[], b: number[], k: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function isMobile(): boolean {
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
}

export function createFlower(pixelRatio: number): FlowerHandle {
  const N = isMobile() ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT_DESKTOP;

  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const seeds = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const t = i / N; // 0 (center) → 1 (edge)

    // Phyllotaxis disc
    const ang = i * GOLDEN_ANGLE;
    // sqrt distribution → uniform density on disc
    let r = Math.sqrt(t) * 1.25;

    // Subtle 6-fold petal modulation for that "flower" feel
    const petalMod = 1.0 - Math.abs(Math.cos(ang * 3.0)) * 0.10;
    r *= petalMod;

    // Slight dome shape — center pushed forward, edges curved back
    const dome = (1.0 - t) * 0.18;
    const zJitter = (Math.random() - 0.5) * 0.10;

    positions[i * 3]     = Math.cos(ang) * r;
    positions[i * 3 + 1] = Math.sin(ang) * r;
    positions[i * 3 + 2] = dome + zJitter;

    // Color from center → edge
    let col: [number, number, number];
    if (t < 0.4) {
      col = mix3(C_CENTER, C_MID, t / 0.4);
    } else {
      col = mix3(C_MID, C_EDGE, (t - 0.4) / 0.6);
    }
    colors[i * 3]     = col[0];
    colors[i * 3 + 1] = col[1];
    colors[i * 3 + 2] = col[2];

    // Size: larger near center, with variation
    const baseSize = 4.5 - t * 2.5;
    sizes[i] = baseSize + Math.random() * 1.8;

    seeds[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uArrival: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Points(geometry, material);

  return {
    mesh,
    update(time, arrival) {
      material.uniforms.uTime.value = time;
      material.uniforms.uArrival.value = arrival;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
