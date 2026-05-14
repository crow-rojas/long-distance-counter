precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uArrival;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * valueNoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Stars over the dark portion of the sky (upper half), denser higher.
float stars(vec2 uv, float density) {
  vec2 grid = uv * vec2(uResolution.x / 5.0, uResolution.y / 5.0);
  vec2 cell = floor(grid);
  vec2 cellUv = fract(grid) - 0.5;
  float h = hash21(cell);
  float spawn = step(0.982, h);
  float d = length(cellUv);
  float core = smoothstep(0.18, 0.0, d);
  float halo = smoothstep(0.45, 0.0, d) * 0.25;
  float twinkle = 0.55 + 0.45 * sin(uTime * 1.4 + h * 30.0);
  return (core + halo) * spawn * twinkle * density;
}

// Real dawn: deep night at the top, magenta band in the middle, soft pink near horizon.
vec3 dawnGradient(float y, float arrival) {
  // y = 1 at top, 0 at bottom. Build top-down.
  float warm = arrival * 0.20;

  vec3 cZenith  = vec3(0.020, 0.012, 0.063);  // deep navy at top
  vec3 cUpper   = vec3(0.090, 0.040, 0.180);  // night purple
  vec3 cMid     = vec3(0.290, 0.122, 0.361);  // violet
  vec3 cLower   = vec3(0.769, 0.290, 0.557);  // magenta band
  vec3 cHorizon = vec3(1.000, 0.620, 0.760);  // warm rose horizon
  vec3 cBelow   = vec3(1.000, 0.820, 0.820);  // pale pink under horizon

  float t = 1.0 - y;  // 0 at top, 1 at bottom
  vec3 col = cZenith;
  col = mix(col, cUpper,   smoothstep(0.00, 0.20, t));
  col = mix(col, cMid,     smoothstep(0.20, 0.45, t));
  col = mix(col, cLower,   smoothstep(0.45, 0.70, t));
  col = mix(col, cHorizon, smoothstep(0.70, 0.90, t));
  col = mix(col, cBelow,   smoothstep(0.90, 1.00, t));

  col += vec3(warm * 0.10, warm * 0.05, warm * 0.04);
  return col;
}

float vignette(vec2 uv) {
  vec2 d = uv - 0.5;
  return smoothstep(0.95, 0.30, length(d));
}

float grain(vec2 uv) {
  return hash21(uv * uResolution + fract(uTime) * 100.0) - 0.5;
}

void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.03;

  vec3 col = dawnGradient(uv.y, uArrival);

  // fBm fog mostly in the middle band
  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.010, uTime * 0.018);
  float fog = fbm(fogUv);
  float fogMask = smoothstep(0.85, 0.40, uv.y) * smoothstep(0.10, 0.45, uv.y);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.7 * fogMask;

  // Stars in the dark upper portion. Fade as dawn arrives.
  float starDensity = smoothstep(0.55, 1.00, uv.y) * (1.0 - uArrival * 0.7);
  col += vec3(1.0, 0.97, 1.0) * stars(uv + parallax * 0.5, starDensity);

  // Subtle warm horizon glow at the bottom
  float horizon = exp(-pow((uv.y - 0.08) * 9.0, 2.0)) * 0.25;
  col += vec3(1.0, 0.55, 0.65) * horizon * (0.6 + uArrival * 0.4);

  col *= mix(0.55, 1.0, vignette(uv));
  col += vec3(grain(uv)) * 0.045;

  gl_FragColor = vec4(col, 1.0);
}
