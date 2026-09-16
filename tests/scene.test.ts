import { afterEach, expect, it, vi } from "vitest";
import type { Scene, ShaderMaterial, Points } from "three";

const renderer = vi.hoisted(() => ({
  setPixelRatio: vi.fn(), setSize: vi.fn(), clear: vi.fn(), clearDepth: vi.fn(),
  render: vi.fn(), dispose: vi.fn(), autoClear: true,
}));
vi.mock("three", async importOriginal => ({
  ...await importOriginal<typeof import("three")>(),
  WebGLRenderer: class { constructor() { return renderer; } },
}));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("updates DPR without media events, catches changes on resume, and never resizes after stop", async () => {
  const matchMedia = () => Object.assign(new EventTarget(), { matches: false });
  const win = { devicePixelRatio: 1, innerWidth: 1440, matchMedia };
  let resize!: () => void;
  const disconnect = vi.fn();
  vi.stubGlobal("window", win);
  vi.stubGlobal("matchMedia", matchMedia);
  vi.stubGlobal("navigator", { userAgent: "test desktop" });
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  let frame!: FrameRequestCallback;
  const raf = vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; });
  vi.stubGlobal("requestAnimationFrame", raf);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const { startScene } = await import("../src/scene/scene");
  const handle = startScene({ clientWidth: 1440, clientHeight: 900 } as HTMLCanvasElement,
    () => ({ time: 0, pointer: [.5, .5], arrival: 0 }));
  const background = renderer.render.mock.calls[0][0] as Scene;
  const foreground = renderer.render.mock.calls[1][0] as Scene;
  const particleMaterials: ShaderMaterial[] = [];
  foreground.traverse(object => {
    if ((object as Points).isPoints) particleMaterials.push((object as Points).material as ShaderMaterial);
  });
  expect(particleMaterials).toHaveLength(2);
  for (const [dpr, density] of [[2, 2], [1, 1], [1.25, 1.25], [3, 2], [1, 1]]) {
    win.devicePixelRatio = dpr;
    frame(0);
    expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(density);
    expect(renderer.setSize).toHaveBeenLastCalledWith(1440, 900, false);
    expect(particleMaterials.map(material => material.uniforms.uPixelRatio.value)).toEqual([density, density]);
    const material = (background.children[0] as Points).material as ShaderMaterial;
    expect(material.uniforms.uResolution.value.toArray()).toEqual([1440*density, 900*density]);
    const sizes = renderer.setSize.mock.calls.length;
    frame(0);
    expect(renderer.setSize).toHaveBeenCalledTimes(sizes);
  }
  handle.pause();
  win.devicePixelRatio = 2;
  const pausedSizes = renderer.setSize.mock.calls.length;
  frame(0);
  expect(renderer.setSize).toHaveBeenCalledTimes(pausedSizes);
  handle.resume();
  expect(renderer.setPixelRatio).toHaveBeenLastCalledWith(2);
  expect(particleMaterials.map(material => material.uniforms.uPixelRatio.value)).toEqual([2, 2]);
  handle.stop();
  handle.stop();
  expect(renderer.dispose).toHaveBeenCalledOnce();
  expect(disconnect).toHaveBeenCalledOnce();
  const renders = renderer.render.mock.calls.length;
  const sizes = renderer.setSize.mock.calls.length;
  win.devicePixelRatio = 1;
  handle.pause(); handle.resume(); resize(); frame(0);
  expect(renderer.render).toHaveBeenCalledTimes(renders);
  expect(renderer.setSize).toHaveBeenCalledTimes(sizes);
});
