import * as THREE from "three";
import vert from "./shaders/drift.vert?raw";
import frag from "./shaders/drift.frag?raw";

const COUNT_DESKTOP = 60;
const COUNT_MOBILE = 32;

function isMobile(): boolean {
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
}

export type DriftHandle = {
  mesh: THREE.Points;
  update(time: number): void;
  dispose(): void;
};

export function createDrift(pixelRatio: number): DriftHandle {
  const N = isMobile() ? COUNT_MOBILE : COUNT_DESKTOP;

  // Position attribute exists for buffer geometry but actual placement is done
  // in the vertex shader from the time + per-particle attributes.
  const positions = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const seeds = new Float32Array(N);
  const baseX = new Float32Array(N);
  const speeds = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0;

    // 4–8 second cycle each
    const cycleSec = 4.5 + Math.random() * 3.5;
    speeds[i] = 1 / cycleSec;
    seeds[i] = Math.random();
    sizes[i] = 3.0 + Math.random() * 4.5;
    // Horizontal column home: roughly within the visible width
    baseX[i] = (Math.random() - 0.5) * 3.4;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aBaseX", new THREE.BufferAttribute(baseX, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Points(geometry, material);

  return {
    mesh,
    update(time) {
      material.uniforms.uTime.value = time;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
