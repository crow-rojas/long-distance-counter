import { describe, it, expect } from "vitest";
import { TARGET_UTC_ISO, TARGET_LABEL, TARGET_MS } from "../src/countdown/target";

describe("target", () => {
  it("TARGET_UTC_ISO parses to a valid Date", () => {
    const d = new Date(TARGET_UTC_ISO);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });

  it("TARGET_MS matches TARGET_UTC_ISO", () => {
    expect(TARGET_MS).toBe(new Date(TARGET_UTC_ISO).getTime());
  });

  it("target is 06:55 in Chile time on 2026-09-18 (CLST, -03:00)", () => {
    const d = new Date(TARGET_UTC_ISO);
    // 06:55 -03:00 == 09:55 UTC
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(8); // September = 8 (zero-indexed)
    expect(d.getUTCDate()).toBe(18);
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(55);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it("TARGET_LABEL is the display string", () => {
    expect(TARGET_LABEL).toBe("CDMX → SCL · 18 · 09 · 26");
  });
});
