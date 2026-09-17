import { expect, it } from "vitest";
import texts from "../src/game/es.json";
import { replyFor, formatText } from "../src/game/dialogue";
import type { Stamp } from "../src/game/progress";

it("uses edited JSON values without changing character identity", () => {
  const original = texts.dialogos.Marin.sinEmpanada;
  try {
    texts.dialogos.Marin.sinEmpanada = 'Omg "Chofis" <3\nLlegaste';
    expect(replyFor("Marin", new Set())).toBe(texts.dialogos.Marin.sinEmpanada);
  } finally { texts.dialogos.Marin.sinEmpanada = original; }
});

it("formats values literally and reports missing placeholders", () => {
  expect(formatText('{personaje}: {texto} ({cantidad})', {
    personaje: 'Crow <3', texto: '"Chofis"\n$& {comida}', cantidad: 0,
  })).toBe('Crow <3: "Chofis"\n$& {comida} (0)');
  expect(() => formatText("Hola {nombre}", {})).toThrow("Missing text value: nombre");
});

it("keeps the documented placeholders valid in the editable templates", () => {
  for (const [template, keys] of [
    [texts.dialogos.Crow.faltaUno, ["comida"]],
    [texts.dialogos.Crow.faltanVarios, ["comida"]],
    [texts.interfaz.objetivo, ["instruccion", "direccion"]],
    [texts.interfaz.progreso.estado, ["comida", "estado"]],
    [texts.interfaz.subtitulo, ["personaje", "texto"]],
    [texts.interfaz.interaccion.conPersonaje, ["personaje"]],
  ] as const) {
    expect([...template.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]).sort()).toEqual([...keys].sort());
  }
});

it("omits decorative separators and arrow characters from the interface", () => {
  const excluded = /[\u2013\u2014\u00b7\u2022\u2190-\u21ff\u2794\u279c]|&(?:bull|middot|[lr]arr);/i;
  const sources = import.meta.glob<string>(["../index.html", "../src/game/game.ts", "../src/game/game.css",
    "../src/game/dialogue.ts", "../src/game/es.json", "../src/game/level.ts", "../src/game/button-icons.ts", "../src/countdown/target.ts", "../src/ui/countdown.ts"],
  { query: "?raw", import: "default", eager: true });
  expect(Object.keys(sources)).toHaveLength(9);
  expect(JSON.stringify(texts)).not.toMatch(excluded);
  for (const [path, source] of Object.entries(sources)) {
    expect(source, path).not.toMatch(excluded);
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
  if (missing.length) {
    for (const food of ["empanada", "completo", "terremoto"] as const) {
      expect(reply.includes(texts.comida[food])).toBe(missing.includes(food));
    }
  } else expect(reply).toBe(texts.dialogos.Crow.completo);
  expect([...stamps]).toEqual(collected);
});

it.each([
  { name: "Marin", food: "empanada", other: "completo", before: texts.dialogos.Marin.sinEmpanada, after: texts.dialogos.Marin.conEmpanada },
  { name: "Pibble", food: "completo", other: "terremoto", before: texts.dialogos.Pibble.sinCompleto, after: texts.dialogos.Pibble.conCompleto },
  { name: "Supergirl", food: "terremoto", other: "empanada", before: texts.dialogos.Supergirl.sinTerremoto, after: texts.dialogos.Supergirl.conTerremoto },
] as const)("$name selects the JSON variant for their own food", ({ name, food, other, before, after }) => {
  expect(replyFor(name, new Set())).toBe(before);
  expect(replyFor(name, new Set([other]))).toBe(before);
  expect(replyFor(name, new Set([food]))).toBe(after);
  const complete = new Set<Stamp>(["empanada", "completo", "terremoto"]);
  expect(replyFor(name, complete)).toBe(after);
});
