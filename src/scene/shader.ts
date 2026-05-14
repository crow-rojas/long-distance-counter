import * as THREE from "three";
import vert from "./shaders/aubade.vert?raw";
import frag from "./shaders/aubade.frag?raw";

export type SceneUniforms = {
  time: number;
  pointer: [number, number];
  arrival: number;
};

export function createMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uArrival: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
}

export function applyUniforms(mat: THREE.ShaderMaterial, u: SceneUniforms): void {
  mat.uniforms.uTime.value = u.time;
  mat.uniforms.uPointer.value.set(u.pointer[0], u.pointer[1]);
  mat.uniforms.uArrival.value = u.arrival;
}

export function setResolution(mat: THREE.ShaderMaterial, w: number, h: number): void {
  mat.uniforms.uResolution.value.set(w, h);
}
