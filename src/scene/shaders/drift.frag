precision highp float;

varying float vAlpha;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;

  float core = smoothstep(0.5, 0.0, d);
  float glow = smoothstep(0.5, 0.2, d) * 0.35;

  // Color from warm rose (closer to flower's hue) to pale petal-pink
  float k = fract(vSeed * 13.0);
  vec3 col = mix(
    vec3(1.00, 0.55, 0.72),
    vec3(1.00, 0.86, 0.92),
    k
  );

  float a = (core * 0.80 + glow) * vAlpha;
  gl_FragColor = vec4(col, a);
}
