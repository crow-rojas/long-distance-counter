import type { FRIENDS } from "./level";
import { STAMPS, type Stamp } from "./progress";

export function replyFor(name: typeof FRIENDS[number]["name"], stamps: Set<Stamp>): string {
  switch (name) {
    case "Marin":
      return stamps.has("empanada")
        ? "¡Encontraste la empanada! ¡Yei!"
        : "¡Omg! Hola Chofis, la empanada está más adelante, ve por ella 🫪";
    case "Pibble":
      return stamps.has("completo")
        ? "Ya tienes el completo, Pibble Martillo estaría orgulloso."
        : "Dicen que más adelante está iTownGamePlays, y te va a tocar. ¡Ten cuidado buscando el completo!";
    case "Supergirl":
      return stamps.has("terremoto")
        ? "¡Conseguiste el terremoto! No te vayas a marear, cuidado con las réplica AJSD"
        : "Solo te falta el terremoto, eh? Cuidado con las siguientes grietas, se caen después de un ratito.";
    case "Krypto":
      return "Woof woof woof woof (las banderas son un checkpoint 🥳)";
    case "Tus dibujos":
      return "";
    case "Crow": {
      const missing = STAMPS.filter(food => !stamps.has(food));
      return missing.length
        ? `Mi princesa, nos ${missing.length === 1 ? "falta" : "faltan"} ${new Intl.ListFormat("es").format(missing)} :(`
        : "Ya está toda la comida, mi princesa te amooooo ❤️";
    }
  }
}
