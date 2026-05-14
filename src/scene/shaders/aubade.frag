precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uArrival;

varying vec2 vUv;

// Dawn palette stops (low→high y)
// 0.039,0.016,0.094  = #0a0418
// 0.122,0.031,0.188  = #1f0830
// 0.290,0.122,0.361  = #4a1f5c
// 0.769,0.290,0.557  = #c44a8e
// 1.000,0.494,0.714  = #ff7eb6
// 1.000,0.714,0.757  = #ffb6c1
vec3 dawnGradient(float y, float arrival) {
  // arrival shifts everything up so dawn "rises"
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
  gl_FragColor = vec4(dawnGradient(vUv.y, uArrival), 1.0);
}
