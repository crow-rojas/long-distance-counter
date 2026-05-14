attribute float aSize;
attribute float aSeed;
attribute float aBaseX;
attribute float aSpeed;

uniform float uTime;
uniform float uPixelRatio;

varying float vAlpha;
varying float vSeed;

void main() {
  // t cycles 0 → 1 over (1 / aSpeed) seconds, with per-particle phase.
  float t = fract(uTime * aSpeed + aSeed);

  // Vertical fall: top of flower (y ≈ 1.2) down past screen (y ≈ -1.6).
  float y = 1.2 - t * 2.8;

  // Horizontal sway around base column
  float swayAmp = 0.18 + fract(aSeed * 3.14) * 0.25;
  float swayFreq = 0.55 + fract(aSeed * 7.21) * 0.45;
  float x = aBaseX + sin(uTime * swayFreq + aSeed * 10.0) * swayAmp;

  // Depth drift
  float z = sin(uTime * 0.4 + aSeed * 6.28) * 0.4;

  vec3 pos = vec3(x, y, z);
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  gl_PointSize = aSize * uPixelRatio * (3.4 / max(0.5, -mvPos.z));

  // Fade in near top, fade out near bottom so they appear and disappear gently
  float fadeIn  = smoothstep(0.00, 0.10, t);
  float fadeOut = smoothstep(1.00, 0.82, t);
  vAlpha = fadeIn * fadeOut;
  vSeed = aSeed;
}
