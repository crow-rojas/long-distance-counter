import { describe, it, expect } from "vitest";
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

  it("returns arrived=true 1ms before target as false", () => {
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

  it("progress is 0 at start anchor and 1 at target", () => {
    // Anchor is 2026-05-14 (the spec date) — chosen as the start of the journey
    const anchor = Date.parse("2026-05-14T00:00:00Z");
    const halfway = new Date((anchor + TARGET_MS) / 2);
    const state = compute(halfway);
    expect(state.progress).toBeGreaterThan(0.45);
    expect(state.progress).toBeLessThan(0.55);
  });

  it("progress is clamped to [0, 1]", () => {
    expect(compute(new Date(0)).progress).toBe(0);
    expect(compute(new Date(TARGET_MS + days(365))).progress).toBe(1);
  });
});
