import { expect, it } from "vitest";
import authoredDialogue from "../docs/dialogues.md?raw";
import { replyFor } from "../src/game/dialogue";
import { nextStop } from "../src/game/level";
import type { Stamp } from "../src/game/progress";

it("keeps Crow's authored dialogue exactly as written in the review document", () => {
  const rows = authoredDialogue
    .split("## Objetivos del HUD")[0].split("\n").filter(line => line.startsWith("|"))
    .map(line => line.slice(1, line.lastIndexOf("|")).split("|").map(cell => cell.trim()));
  const foods: Stamp[] = ["empanada", "completo", "terremoto"];
  let checked = 0;
  for (const [name, state, text] of rows) {
    if (["Marin", "Pibble", "Supergirl", "Krypto"].includes(name)) {
      const collected = state.startsWith("Con ") ? foods.filter(food => state.includes(food)) : [];
      expect(replyFor(name as "Marin" | "Pibble" | "Supergirl" | "Krypto", new Set(collected))).toBe(text);
      checked++;
    } else if (text === undefined && (name === "Ninguna" || name === "Toda" || foods.some(food => name.toLowerCase().includes(food)))) {
      const collected = name === "Toda" ? foods : foods.filter(food => name.toLowerCase().includes(food));
      expect(replyFor("Crow", new Set(collected))).toBe(state);
      checked++;
    }
  }
  expect(checked).toBe(15);
});

it("omits decorative separators and arrow characters from the interface", () => {
  const sources = import.meta.glob<string>(["../index.html", "../src/game/game.ts", "../src/game/game.css",
    "../src/game/dialogue.ts", "../src/game/level.ts", "../src/countdown/target.ts", "../src/ui/countdown.ts"],
  { query: "?raw", import: "default", eager: true });
  expect(Object.keys(sources)).toHaveLength(7);
  for (const [path, source] of Object.entries(sources)) {
    expect(source, path)
      .not.toMatch(/[\u2013\u2014\u00b7\u2022\u2190-\u21ff\u2794\u279c]|&(?:bull|middot|[lr]arr);/i);
  }
});

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
