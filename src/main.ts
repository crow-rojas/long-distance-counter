import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";

const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  view.update(compute(new Date()));
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
