attribute float aSize;
attribute vec3 aColor;
attribute float aSeed;

uniform float uTime;
uniform float uPixelRatio;
uniform float uArrival;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Slow rotation around Y. Speeds up subtly as arrival warms.
  float angle = uTime * (0.08 + uArrival * 0.03);
  float c = cos(angle);
  float s = sin(angle);
  pos = vec3(pos.x * c - pos.z * s, pos.y, pos.x * s + pos.z * c);

  // Gentle "breathing" — the flower opens and closes a hair
  float breath = 1.0 + sin(uTime * 0.4) * 0.02;
  pos *= breath;

  // Per-particle organic drift so the form never feels rigid
  float drift = 0.5 + aSeed * 0.5;
  pos.x += sin(uTime * drift + aSeed * 10.0) * 0.010;
  pos.y += cos(uTime * drift * 0.7 + aSeed * 12.0) * 0.010;
  pos.z += sin(uTime * drift * 0.9 + aSeed * 7.0) * 0.012;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Perspective size attenuation
  gl_PointSize = aSize * uPixelRatio * (4.0 / max(0.5, -mvPosition.z));

  vColor = aColor;
  // Subtle per-particle alpha oscillation for shimmer
  vAlpha = 0.65 + sin(uTime * 0.9 + aSeed * 20.0) * 0.20;
}
