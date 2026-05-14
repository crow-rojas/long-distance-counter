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

void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.04;

  vec3 col = dawnGradient(uv.y, uArrival);

  // fBm fog tint
  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.012, uTime * 0.02);
  float fog = fbm(fogUv);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
