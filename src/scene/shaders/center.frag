precision highp float;

uniform float uTime;

varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;

  // Warm magenta center, brighter toward middle of each particle
  float core = smoothstep(0.5, 0.0, d);
  float glow = smoothstep(0.5, 0.18, d) * 0.5;

  // Each particle has its own warmth (some more orange-warm, others magenta)
  float warmth = 0.55 + 0.35 * fract(vSeed * 17.0);
  vec3 col = mix(
    vec3(0.95, 0.30, 0.55),   // hot magenta
    vec3(1.00, 0.55, 0.45),   // warm coral
    warmth
  );

  // Twinkle
  float twinkle = 0.7 + 0.3 * sin(uTime * 2.0 + vSeed * 30.0);

  float a = (core * 0.9 + glow) * twinkle;
  gl_FragColor = vec4(col, a);
}
