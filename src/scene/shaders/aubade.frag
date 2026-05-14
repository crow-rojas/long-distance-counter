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

float stars(vec2 uv, float density) {
  vec2 grid = uv * vec2(uResolution.x / 6.0, uResolution.y / 6.0);
  vec2 cell = floor(grid);
  vec2 cellUv = fract(grid) - 0.5;
  float h = hash21(cell);
  float spawn = step(0.985, h);
  float d = length(cellUv);
  float core = smoothstep(0.15, 0.0, d);
  float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + h * 30.0);
  return core * spawn * twinkle * density;
}

float petals(vec2 uv) {
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float seedX = hash21(vec2(fi, 7.13));
    float seedY = hash21(vec2(fi, 13.7));
    float speed = 0.018 + 0.025 * hash21(vec2(fi, 21.3));
    float sway = 0.04 * sin(uTime * (0.4 + 0.6 * hash21(vec2(fi, 5.0))) + fi);
    vec2 center = vec2(
      fract(seedX + sway),
      fract(seedY - uTime * speed)
    );
    vec2 diff = (uv - center) * vec2(1.0, 1.7);
    float r = length(diff);
    float petal = smoothstep(0.035, 0.0, r);
    total += petal * (0.5 + 0.5 * seedX);
  }
  return total;
}

// Luminous arc: a slightly rotated quadratic curve across the upper third.
float arc(vec2 uv) {
  // Rotate uv slightly so the arc tilts
  float a = -0.08;
  vec2 c = uv - vec2(0.5, 0.7);
  vec2 r = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a));
  // y = -k * x^2 along rotated frame; distance from that curve
  float curveY = -2.5 * r.x * r.x;
  float d = abs(r.y - curveY);
  float core = smoothstep(0.004, 0.0, d);
  float glow = smoothstep(0.05, 0.0, d) * 0.4;
  return core + glow;
}

vec3 dawnGradient(float y, float arrival) {
  float yy = clamp(y + arrival * 0.18, 0.0, 1.0);
  vec3 c0 = vec3(0.039, 0.016, 0.094);
  vec3 c1 = vec3(0.122, 0.031, 0.188);
  vec3 c2 = vec3(0.290, 0.122, 0.361);
  vec3 c3 = vec3(0.769, 0.290, 0.557);
  vec3 c4 = vec3(1.000, 0.494, 0.714);
  vec3 c5 = vec3(1.000, 0.714, 0.757);
  vec3 col = c0;
  col = mix(col, c1, smoothstep(0.00, 0.15, yy));
  col = mix(col, c2, smoothstep(0.15, 0.40, yy));
  col = mix(col, c3, smoothstep(0.40, 0.70, yy));
  col = mix(col, c4, smoothstep(0.70, 0.90, yy));
  col = mix(col, c5, smoothstep(0.90, 1.00, yy));
  return col;
}

float vignette(vec2 uv) {
  vec2 d = uv - 0.5;
  return smoothstep(0.85, 0.30, length(d));
}

float grain(vec2 uv) {
  return hash21(uv * uResolution + fract(uTime) * 100.0) - 0.5;
}

void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.04;

  vec3 col = dawnGradient(uv.y, uArrival);

  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.012, uTime * 0.02);
  float fog = fbm(fogUv);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.6;

  float starDensity = smoothstep(0.35, 0.85, uv.y) * (1.0 - uArrival * 0.6);
  col += vec3(1.0, 0.95, 1.0) * stars(uv + parallax * 0.3, starDensity);

  float petalMask = smoothstep(0.95, 0.2, uv.y);
  col += vec3(1.0, 0.75, 0.85) * petals(uv) * 0.55 * petalMask;

  float arcAmount = arc(uv + parallax * 0.5);
  col += vec3(1.0, 0.85, 0.9) * arcAmount * (0.55 + 0.45 * uArrival);

  col *= mix(0.5, 1.0, vignette(uv));

  col += vec3(grain(uv)) * 0.05;

  gl_FragColor = vec4(col, 1.0);
}
