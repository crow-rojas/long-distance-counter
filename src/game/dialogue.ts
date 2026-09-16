import type { FRIENDS } from "./level";
import { STAMPS, type Stamp } from "./progress";
import texts from "./es.json";

export function formatText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{([^{}]+)\}/g, (_match, key: string) => {
    if (!Object.hasOwn(values, key)) throw new Error(`Missing text value: ${key}`);
    return String(values[key]);
  });
}

export function replyFor(name: typeof FRIENDS[number]["name"], stamps: Set<Stamp>): string {
  switch (name) {
    case "Marin":
      return stamps.has("empanada")
        ? texts.dialogos.Marin.conEmpanada
        : texts.dialogos.Marin.sinEmpanada;
    case "Pibble":
      return stamps.has("completo")
        ? texts.dialogos.Pibble.conCompleto
        : texts.dialogos.Pibble.sinCompleto;
    case "Supergirl":
      return stamps.has("terremoto")
        ? texts.dialogos.Supergirl.conTerremoto
        : texts.dialogos.Supergirl.sinTerremoto;
    case "Krypto":
      return texts.dialogos.Krypto;
    case "Tus dibujos":
      return "";
    case "Crow": {
      const missing = STAMPS.filter(food => !stamps.has(food));
      return missing.length
        ? formatText(missing.length === 1 ? texts.dialogos.Crow.faltaUno : texts.dialogos.Crow.faltanVarios,
          { comida: new Intl.ListFormat("es").format(missing.map(food => texts.comida[food])) })
        : texts.dialogos.Crow.completo;
    }
  }
}
