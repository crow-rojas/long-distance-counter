import "./style.css";
import texts from "./game/es.json";
import { compute } from "./countdown/compute";
import { TARGET_LABEL } from "./countdown/target";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const labelEl = document.getElementById("label") as HTMLElement;
labelEl.textContent = TARGET_LABEL;

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

let sceneHandle: ReturnType<typeof startScene> | null = null;
try {
  sceneHandle = startScene(canvas, () => uniforms);
} catch {
  canvas.style.display = "none";
  document.body.classList.add("no-webgl");
}

let rafId = 0;
let paused = false;
let revealingGame = false;
let gameStarted = false;
let stopped = false;

function stopCountdown() {
  if (stopped) return;
  stopped = true;
  cancelAnimationFrame(rafId);
  sceneHandle?.stop();
  sceneHandle = null;
  pointer.dispose();
}

async function revealGame() {
  try {
    const { startGame } = await import("./game/game");
    await startGame();
    gameStarted = true;
    sceneHandle?.enterGame();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stopCountdown();
    } else {
      const root = document.getElementById("fonda")!;
      const finish = () => {
        root.removeEventListener("transitionend", onFade);
        clearTimeout(timeout);
        stopCountdown();
      };
      const onFade = (event: TransitionEvent) => {
        if (event.target === root && event.propertyName === "opacity") finish();
      };
      root.addEventListener("transitionend", onFade);
      // game.css fades opacity for 1.5s; also finish if the browser drops the event.
      const timeout = setTimeout(finish, 2000);
    }
  } catch {
    gameStarted = false;
    // A failed chunk request must leave a way to recover on an intermittent connection.
    const message = document.getElementById("arrival")!;
    message.textContent = texts.carga.error;
    const retry = document.createElement("button");
    retry.textContent = texts.carga.reintentar;
    retry.style.cssText = "display:block;margin:1rem auto;padding:1rem;pointer-events:auto;font:1rem system-ui;cursor:pointer";
    retry.addEventListener("click", () => location.reload());
    message.append(retry);
  }
}

function tick() {
  if (paused || stopped) return;
  // Freeze time uniform when reduced motion is set — shader becomes a still
  uniforms.time = reducedMotion ? 0 : (performance.now() - t0) / 1000;
  uniforms.pointer = pointer.get();
  if (gameStarted) {
    rafId = requestAnimationFrame(tick);
    return;
  }

  const state = compute(new Date());
  view.update(state);
  arrival.update(state.arrived);
  uniforms.arrival = arrival.getUniform();

  if (state.arrived && !revealingGame) {
    revealingGame = true;
    void revealGame();
  }

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (stopped) return;
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
    sceneHandle?.pause();
  } else {
    paused = false;
    sceneHandle?.resume();
    tick();
  }
});

tick();
