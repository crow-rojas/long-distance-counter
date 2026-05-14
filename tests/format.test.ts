import { describe, it, expect } from "vitest";
import { pad2 } from "../src/countdown/format";

describe("pad2", () => {
  it("pads single digit", () => {
    expect(pad2(5)).toBe("05");
  });

  it("does not pad two digits", () => {
    expect(pad2(10)).toBe("10");
    expect(pad2(99)).toBe("99");
  });

  it("pads zero", () => {
    expect(pad2(0)).toBe("00");
  });

  it("returns three digits unchanged for large numbers", () => {
    expect(pad2(126)).toBe("126");
  });
});
