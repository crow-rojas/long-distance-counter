import { expect, it } from "vitest";
import { readStamps, readyForCrow } from "../src/game/progress";

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
