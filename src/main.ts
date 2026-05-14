import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";
import { createAudioPlayer } from "./audio/player";
import { bindAudioToggle } from "./ui/audio-toggle";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useShader = supportsWebGL();

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!useShader) {
  canvas.style.display = "none";
  document.body.classList.add("no-webgl");
}

const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});
const arrival = createArrival({
  countdown: document.getElementById("countdown") as HTMLElement,
  arrival: document.getElementById("arrival") as HTMLElement,
});
const pointer = createPointer();
const audio = createAudioPlayer("/audio/aubade.opus");
bindAudioToggle(document.getElementById("audio-toggle") as HTMLButtonElement, audio);

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

if (useShader) {
  startScene(canvas, () => uniforms);
}

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  // Freeze time uniform when reduced motion is set — shader becomes a still
  uniforms.time = reducedMotion ? 0 : (performance.now() - t0) / 1000;
  uniforms.pointer = pointer.get();

  const state = compute(new Date());
  view.update(state);
  arrival.update(state.arrived);
  uniforms.arrival = arrival.getUniform();

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
