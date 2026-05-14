import * as THREE from "three";
import petalVert from "./shaders/petal.vert?raw";
import petalFrag from "./shaders/petal.frag?raw";
import centerVert from "./shaders/center.vert?raw";
import centerFrag from "./shaders/center.frag?raw";

export type FlowerHandle = {
  group: THREE.Group;
  update(time: number, arrival: number): void;
  dispose(): void;
};

const PETAL_COUNT = 13; // odd count reads as "natural" (Bauhaus daisy = 13ish)
const CENTER_PARTICLES_DESKTOP = 900;
const CENTER_PARTICLES_MOBILE = 500;

function isMobile(): boolean {
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);
}

// Build a single petal mesh: a curved plane with a petal-shaped fragment.
// Petal points along +Y (base at origin, tip at +Y).
function makePetal(seed: number): THREE.Mesh {
  // PlaneGeometry: width × height. Tip toward +y.
  const geom = new THREE.PlaneGeometry(0.30, 0.65, 1, 6);
  // Bend the plane slightly to give it 3D curl. Push vertices in z based on y.
  const pos = geom.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    // y is centered around 0 (PlaneGeometry centers at origin). Normalize 0..1.
    const t = (y + 0.325) / 0.65; // 0 at base, 1 at tip
    // Curl: petals lift up slightly at the tip (positive z)
    const curl = Math.pow(t, 1.5) * 0.10;
    pos.setZ(i, curl);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();

  // Translate geometry so base sits at origin (instead of plane center)
  geom.translate(0, 0.325, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader: petalVert,
    fragmentShader: petalFrag,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uArrival: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geom, material);
}

function makeCenter(pixelRatio: number): THREE.Points {
  const N = isMobile() ? CENTER_PARTICLES_MOBILE : CENTER_PARTICLES_DESKTOP;
  const positions = new Float32Array(N * 3);
  const sizes = new Float32Array(N);
  const seeds = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    // Disc with gaussian-ish density (tight in middle, sparser at edges)
    const t = Math.pow(Math.random(), 0.6); // bias toward center
    const r = t * 0.18; // center radius ~0.18
    const ang = Math.random() * Math.PI * 2;
    const z = (Math.random() - 0.5) * 0.03;

    positions[i * 3]     = Math.cos(ang) * r;
    positions[i * 3 + 1] = Math.sin(ang) * r;
    positions[i * 3 + 2] = z;

    // Smaller particles farther from center
    sizes[i] = 3.0 + (1.0 - t) * 4.0; // center 7, edge 3
    seeds[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader: centerVert,
    fragmentShader: centerFrag,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

export function createFlower(pixelRatio: number): FlowerHandle {
  const group = new THREE.Group();

  // Two rings of petals for a fuller, more "natural" daisy: back layer rotated
  // half a petal-step relative to the front, and slightly smaller / tilted back.
  const petals: THREE.Mesh[] = [];

  // Back petals (slightly smaller, rotated half-step, tilted away)
  for (let i = 0; i < PETAL_COUNT; i++) {
    const angle = (i / PETAL_COUNT) * Math.PI * 2 + Math.PI / PETAL_COUNT;
    const p = makePetal(i / PETAL_COUNT);
    p.scale.set(0.88, 0.88, 1);
    p.rotation.order = "ZYX";
    p.rotation.z = angle;
    p.rotation.x = -0.18; // tilt back so they recede into Z
    p.position.set(0, 0, -0.04);
    petals.push(p);
    group.add(p);
  }

  // Front petals (full size, level, primary visual layer)
  for (let i = 0; i < PETAL_COUNT; i++) {
    const angle = (i / PETAL_COUNT) * Math.PI * 2;
    const p = makePetal(i / PETAL_COUNT + 0.5);
    p.rotation.order = "ZYX";
    p.rotation.z = angle;
    p.rotation.x = -0.06; // slight tilt for depth
    petals.push(p);
    group.add(p);
  }

  // Center disc of particles
  const center = makeCenter(pixelRatio);
  center.position.set(0, 0, 0.02);
  group.add(center);

  return {
    group,
    update(time, arrival) {
      // Rotate the entire flower very slowly around Y
      group.rotation.y = time * 0.07;
      group.rotation.z = Math.sin(time * 0.15) * 0.02;

      // Push uniforms to each petal material and center
      for (const p of petals) {
        const m = p.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = time;
        m.uniforms.uArrival.value = arrival;
      }
      const cm = center.material as THREE.ShaderMaterial;
      cm.uniforms.uTime.value = time;
    },
    dispose() {
      for (const p of petals) {
        p.geometry.dispose();
        (p.material as THREE.ShaderMaterial).dispose();
      }
      center.geometry.dispose();
      (center.material as THREE.ShaderMaterial).dispose();
    },
  };
}
