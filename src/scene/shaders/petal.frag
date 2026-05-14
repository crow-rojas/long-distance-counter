precision highp float;

uniform float uTime;
uniform float uSeed;
uniform float uArrival;

varying vec2 vUv;

void main() {
  // uv goes 0..1. Petal grows along the y axis (0 = base, 1 = tip).
  // Center the shape horizontally
  vec2 p = vUv - vec2(0.5, 0.0);

  // Petal silhouette: a teardrop / lance shape that's wider in the middle.
  // shape(y) = sin(pi * y)^0.6 — broad in middle, tapered at base and tip.
  float y = clamp(vUv.y, 0.0, 1.0);
  float halfWidth = pow(sin(y * 3.14159), 0.7) * 0.42;

  float dx = abs(p.x);
  // Soft edge: fully inside when dx < halfWidth, fades to 0 over a tiny band
  float edge = 0.04;
  float inside = smoothstep(halfWidth + edge, halfWidth, dx);

  // Discard outside the silhouette entirely
  if (inside <= 0.001) discard;

  // Color: warm pink at the base, pale rose toward the tip (white-ish like a daisy)
  vec3 cBase = vec3(1.00, 0.45, 0.65);   // saturated rose at base
  vec3 cMid  = vec3(1.00, 0.72, 0.82);   // soft pink
  vec3 cTip  = vec3(1.00, 0.94, 0.96);   // almost white at tip

  vec3 col;
  if (y < 0.6) {
    col = mix(cBase, cMid, smoothstep(0.0, 0.6, y));
  } else {
    col = mix(cMid, cTip, smoothstep(0.6, 1.0, y));
  }

  // Subtle vein down the center for petal "spine"
  float vein = smoothstep(0.015, 0.0, abs(p.x));
  col += vec3(0.1, 0.05, 0.05) * vein * 0.4;

  // Glow at the tip
  float tipGlow = smoothstep(0.78, 1.0, y) * 0.3;
  col += vec3(1.0, 0.9, 0.9) * tipGlow;

  // Subtle breathing per-petal (uSeed gives variation)
  float pulse = 0.85 + 0.15 * sin(uTime * 0.8 + uSeed * 6.28);

  // Arrival shifts colors warmer
  col = mix(col, col + vec3(0.05, 0.04, 0.0), uArrival);

  gl_FragColor = vec4(col, inside * pulse * 0.92);
}
