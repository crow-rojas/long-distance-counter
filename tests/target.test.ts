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
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(TARGET_UTC_ISO));
    expect(Object.fromEntries(parts.map(({ type, value }) => [type, value]))).toMatchObject({
      year: "2026", month: "09", day: "18", hour: "06", minute: "55", second: "00",
    });
  });

  it("TARGET_LABEL is the display string", () => {
    expect(TARGET_LABEL).toBe("CDMX a SCL, 18/09/26");
  });
});
