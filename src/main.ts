import "./style.css";
import { compute } from "./countdown/compute";
import { TARGET_LABEL } from "./countdown/target";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";

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

const sceneHandle = useShader ? startScene(canvas, () => uniforms) : null;

let rafId = 0;
let paused = false;
let revealingGame = false;
let gameStarted = false;

async function revealGame() {
  try {
    const { startGame } = await import("./game/game");
    await startGame();
    gameStarted = true;
    sceneHandle?.enterGame();
  } catch {
    gameStarted = false;
    // A failed chunk request must leave a way to recover on an intermittent connection.
    const message = document.getElementById("arrival")!;
    message.textContent = "Tu sorpresa está lista.";
    const retry = document.createElement("button");
    retry.textContent = "Abrir mi sorpresa";
    retry.style.cssText = "display:block;margin:1rem auto;padding:1rem;pointer-events:auto;font:1rem system-ui;cursor:pointer";
    retry.addEventListener("click", () => location.reload());
    message.append(retry);
  }
}

function tick() {
  if (paused) return;
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
    setTimeout(revealGame, reducedMotion ? 0 : 2200);
  }

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
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
