import { expect, it } from "vitest";
import { readStamps, readyForCrow } from "../src/game/progress";
import { nextStop } from "../src/game/level";

it("preserves a real collection across reloads; duplicates or corrupt saves cannot unlock the ending", () => {
  expect([...readStamps(null)]).toEqual([]);
  expect([...readStamps("{broken")]).toEqual([]);
  expect([...readStamps('{"empanada":true}')]).toEqual([]);
  const stamps = readStamps('["empanada","empanada","unknown",null]');
  expect([...stamps]).toEqual(["empanada"]);
  expect(readyForCrow(stamps)).toBe(false);
  stamps.add("completo");
  expect(readyForCrow(stamps)).toBe(false);
  stamps.add("terremoto");
  expect(readyForCrow(readStamps(JSON.stringify([...stamps])))).toBe(true);
});

it("always points to a missing object before directing Chofis to Crow, even when collected out of order", () => {
  const stamps = readStamps('["terremoto"]');
  expect(nextStop(stamps).instruction).toContain("empanada");
  stamps.add("empanada");
  expect(nextStop(stamps).instruction).toContain("completo");
  stamps.add("completo");
  expect(nextStop(stamps).instruction).toContain("Crow");
});
