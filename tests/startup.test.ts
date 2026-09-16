import { afterEach, beforeEach, expect, it, vi } from "vitest";

const scene = vi.hoisted(() => ({
  enterGame: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(),
}));
const startScene = vi.hoisted(() => vi.fn(() => scene));
const startGame = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../src/scene/scene", () => ({ startScene }));
vi.mock("../src/game/game", () => ({ startGame }));

// Only the DOM/GPU boundaries are replaced; main, countdown, arrival and pointer run normally.
class Element extends EventTarget {
  textContent = "";
  style = { opacity: "", display: "", cssText: "" };
  hidden = false;
  classList = new Set<string>();
  children: Element[] = [];
  append(child: Element) { this.children.push(child); }
  getContext() { return {}; }
}

let elements: Record<string, Element>;
let doc: EventTarget & { hidden: boolean };
let win: EventTarget;
let frames: Map<number, FrameRequestCallback>;
let reduced = false;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-18T09:55:01Z"));
  startScene.mockImplementation(() => scene);
  startGame.mockResolvedValue();
  reduced = false;
  elements = Object.fromEntries(["canvas", "label", "days", "time", "countdown", "arrival", "fonda", "body"]
    .map(id => [id, new Element()]));
  doc = Object.assign(new EventTarget(), {
    hidden: false, body: elements.body,
    getElementById: (id: string) => elements[id],
    createElement: () => new Element(),
  });
  win = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: reduced }), innerWidth: 1440, innerHeight: 900,
    location: { search: "" },
  });
  frames = new Map();
  let frameId = 0;
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
  vi.stubGlobal("location", { search: "", reload: vi.fn() });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fade(target: Element, propertyName: string) {
  target.dispatchEvent(Object.assign(new Event("transitionend"), { propertyName }));
}

it("keeps the countdown and game startup working when actual Three initialization throws", async () => {
  vi.setSystemTime(new Date("2026-09-18T09:54:00Z"));
  startScene.mockImplementation(() => { throw new Error("WebGL2 context creation failed"); });
  await import("../src/main");
  expect(elements.body.classList.has("no-webgl")).toBe(true);
  expect(elements.canvas.style.display).toBe("none");
  expect(elements.time.textContent).toContain("01m");
  vi.setSystemTime(new Date("2026-09-18T09:55:01Z"));
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(callback => callback(0));
  await vi.dynamicImportSettled();
  expect(startGame).toHaveBeenCalledOnce();
});

it("keeps rendering through the fade, then disposes once and never resumes after visibility changes", async () => {
  const remove = vi.spyOn(win, "removeEventListener");
  await import("../src/main");
  await vi.dynamicImportSettled();
  expect(scene.enterGame).toHaveBeenCalledOnce();
  expect(scene.stop).not.toHaveBeenCalled();
  fade(elements.fonda, "transform");
  expect(scene.stop).not.toHaveBeenCalled();
  fade(elements.fonda, "opacity");
  expect(scene.stop).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
  expect(remove.mock.calls.map(([event]) => event)).toEqual(
    expect.arrayContaining(["mousemove", "touchmove", "deviceorientation"]));
  doc.hidden = true; doc.dispatchEvent(new Event("visibilitychange"));
  doc.hidden = false; doc.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(3000);
  expect(scene.resume).not.toHaveBeenCalled();
  expect(scene.stop).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
});

it("disposes immediately for reduced motion", async () => {
  reduced = true;
  await import("../src/main");
  await vi.advanceTimersByTimeAsync(0);
  await vi.dynamicImportSettled();
  expect(scene.stop).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
});

it("finishes teardown if the browser never sends transitionend", async () => {
  await import("../src/main");
  await vi.dynamicImportSettled();
  await vi.advanceTimersByTimeAsync(2100);
  expect(scene.stop).toHaveBeenCalledOnce();
  expect(frames.size).toBe(0);
});

it("preserves the reload retry when game startup rejects", async () => {
  startGame.mockRejectedValue(new Error("Chunk unavailable"));
  await import("../src/main");
  await vi.dynamicImportSettled();
  expect(scene.stop).not.toHaveBeenCalled();
  expect(elements.arrival.children).toHaveLength(1);
  elements.arrival.children[0].dispatchEvent(new Event("click"));
  expect(location.reload).toHaveBeenCalledOnce();
  expect(frames.size).toBeGreaterThan(0);
});
