attribute float aSize;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;

varying float vSeed;

void main() {
  vec3 pos = position;

  // Tiny per-particle drift for life
  float drift = 0.4 + aSeed * 0.4;
  pos.x += sin(uTime * drift + aSeed * 10.0) * 0.003;
  pos.y += cos(uTime * drift * 0.7 + aSeed * 12.0) * 0.003;
  pos.z += sin(uTime * drift * 0.9 + aSeed * 7.0) * 0.004;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = aSize * uPixelRatio * (3.5 / max(0.5, -mvPosition.z));

  vSeed = aSeed;
}
