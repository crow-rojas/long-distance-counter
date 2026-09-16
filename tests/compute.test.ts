import { afterEach, describe, it, expect, vi } from "vitest";
import { compute } from "../src/countdown/compute";
import { TARGET_MS } from "../src/countdown/target";

const ms = (s: number) => s * 1000;
const minutes = (m: number) => m * 60_000;
const hours = (h: number) => h * 3_600_000;
const days = (d: number) => d * 86_400_000;

describe("compute", () => {
  it("returns positive components before target", () => {
    const now = new Date(TARGET_MS - (days(2) + hours(3) + minutes(4) + ms(5)));
    const state = compute(now);
    expect(state.arrived).toBe(false);
    expect(state.days).toBe(2);
    expect(state.hours).toBe(3);
    expect(state.minutes).toBe(4);
    expect(state.seconds).toBe(5);
  });

  it("returns arrived=true and zeros at exact target", () => {
    const state = compute(new Date(TARGET_MS));
    expect(state.arrived).toBe(true);
    expect(state.days).toBe(0);
    expect(state.hours).toBe(0);
    expect(state.minutes).toBe(0);
    expect(state.seconds).toBe(0);
  });

  it("has not arrived 1 ms before target", () => {
    const state = compute(new Date(TARGET_MS - 1));
    expect(state.arrived).toBe(false);
  });

  it("returns arrived=true 1ms after target", () => {
    const state = compute(new Date(TARGET_MS + 1));
    expect(state.arrived).toBe(true);
  });

  it("returns arrived=true any time after target with zeros", () => {
    const state = compute(new Date(TARGET_MS + days(7)));
    expect(state.arrived).toBe(true);
    expect(state.days).toBe(0);
    expect(state.seconds).toBe(0);
  });
});

describe("preview clock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.resetModules();
  });

  it.each(["", "?t=", "?t=invalid"])("uses real time for %j", async (search) => {
    vi.stubGlobal("window", { location: { search } });
    vi.resetModules();
    const clock = await import("../src/countdown/compute");
    expect(clock.isPreview).toBe(false);
    expect(clock.compute(new Date(TARGET_MS - 5000))).toEqual({
      days: 0, hours: 0, minutes: 0, seconds: 5, arrived: false,
    });
  });

  it("advances a valid preview from its initial override", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T00:00:00Z"));
    vi.stubGlobal("window", { location: { search: "?t=2026-09-18T09:54:55Z" } });
    vi.resetModules();
    const clock = await import("../src/countdown/compute");
    expect(clock.isPreview).toBe(true);
    expect(clock.compute(new Date()).seconds).toBe(5);
    vi.advanceTimersByTime(2000);
    expect(clock.compute(new Date()).seconds).toBe(3);
    vi.advanceTimersByTime(3000);
    expect(clock.compute(new Date()).arrived).toBe(true);
  });

  it("recognizes a valid preview even when its offset is zero", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(TARGET_MS));
    vi.stubGlobal("window", { location: { search: "?t=2026-09-18T09:55:00Z" } });
    vi.resetModules();
    const clock = await import("../src/countdown/compute");
    expect(clock.isPreview).toBe(true);
    expect(clock.compute(new Date()).arrived).toBe(true);
  });
});
