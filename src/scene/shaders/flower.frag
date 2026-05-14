precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Soft disc with glow
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  if (d > 0.5) discard;

  float core = smoothstep(0.5, 0.0, d);
  float glow = smoothstep(0.5, 0.2, d) * 0.35;
  float a = (core * 0.75 + glow) * vAlpha;

  gl_FragColor = vec4(vColor, a);
}
