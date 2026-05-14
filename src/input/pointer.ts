export function createPointer(): {
  get(): [number, number];
  dispose(): void;
} {
  let x = 0.5;
  let y = 0.5;
  let targetX = 0.5;
  let targetY = 0.5;

  const onMouse = (e: MouseEvent) => {
    targetX = e.clientX / window.innerWidth;
    targetY = 1 - e.clientY / window.innerHeight;
  };

  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    targetX = t.clientX / window.innerWidth;
    targetY = 1 - t.clientY / window.innerHeight;
  };

  const onOrient = (e: DeviceOrientationEvent) => {
    // gamma: left/right tilt (-90 to 90). beta: front/back (-180 to 180).
    if (e.gamma == null || e.beta == null) return;
    targetX = 0.5 + Math.max(-1, Math.min(1, e.gamma / 45)) * 0.5;
    targetY = 0.5 + Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * 0.5;
  };

  window.addEventListener("mousemove", onMouse, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("deviceorientation", onOrient, { passive: true });

  return {
    get() {
      // ease toward target each frame for smoothing
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      return [x, y];
    },
    dispose() {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("deviceorientation", onOrient);
    },
  };
}
