import { expect, it } from "vitest";
import { replyFor } from "../src/game/dialogue";
import { nextStop } from "../src/game/level";
import type { Stamp } from "../src/game/progress";

it.each<{ collected: Stamp[]; missing: Stamp[] }>([
  { collected: [], missing: ["empanada", "completo", "terremoto"] },
  { collected: ["empanada"], missing: ["completo", "terremoto"] },
  { collected: ["completo"], missing: ["empanada", "terremoto"] },
  { collected: ["terremoto"], missing: ["empanada", "completo"] },
  { collected: ["empanada", "completo"], missing: ["terremoto"] },
  { collected: ["terremoto", "empanada"], missing: ["completo"] },
  { collected: ["completo", "terremoto"], missing: ["empanada"] },
  { collected: ["terremoto", "completo", "empanada"], missing: [] },
])("Crow asks only for missing food with $collected collected", ({ collected, missing }) => {
  const stamps = new Set(collected);
  const reply = replyFor("Crow", stamps);
  expect(reply.length).toBeGreaterThan(0);
  expect(reply.match(/empanada|completo|terremoto/g) ?? []).toEqual(missing);
  if (!missing.length) expect(reply).not.toMatch(/falta/i);
  expect([...stamps]).toEqual(collected);
});

it.each([
  { name: "Marin", food: "empanada", other: "completo" },
  { name: "Pibble", food: "completo", other: "terremoto" },
  { name: "Supergirl", food: "terremoto", other: "empanada" },
] as const)("$name responds to their own food without reciting the next objective", ({ name, food, other }) => {
  const before = replyFor(name, new Set());
  expect(replyFor(name, new Set([other]))).toBe(before);
  const after = replyFor(name, new Set([food]));
  expect(after).not.toBe(before);
  expect(after.toLowerCase()).toContain(food);
  expect(after).not.toMatch(/recoge|recógelo|llega a la fonda/i);
  expect(after).not.toContain(nextStop(new Set([food])).instruction);
  const complete = new Set<Stamp>(["empanada", "completo", "terremoto"]);
  expect(replyFor(name, complete)).toBe(after);
  expect(after).not.toContain(nextStop(complete).instruction);
});
