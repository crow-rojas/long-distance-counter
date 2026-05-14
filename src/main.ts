import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});
const arrival = createArrival({
  countdown: document.getElementById("countdown") as HTMLElement,
  arrival: document.getElementById("arrival") as HTMLElement,
});
const pointer = createPointer();

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

startScene(canvas, () => uniforms);

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  uniforms.time = (performance.now() - t0) / 1000;
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
