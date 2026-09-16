import type { FRIENDS } from "./level";
import { STAMPS, type Stamp } from "./progress";

export function replyFor(name: typeof FRIENDS[number]["name"], stamps: Set<Stamp>): string {
  switch (name) {
    case "Marin":
      return stamps.has("empanada")
        ? "¡Encontraste la empanada! Los dibujos están un poco más arriba."
        : "La empanada está arriba. Mantén apretado el salto para llegar más alto.";
    case "Pibble":
      return stamps.has("completo")
        ? "¡Buen cruce! Ya tienes el completo."
        : "Espera a que la isla se acerque y salta. El completo está al otro lado.";
    case "Supergirl":
      return stamps.has("terremoto")
        ? "Terremoto en mano. Ojo con las grietas al volver."
        : "Las islas con grietas ceden al pisarlas. Prepara el siguiente salto. El terremoto está arriba.";
    case "Krypto":
      return "¡Guau! Las banderitas guardan tu regreso. Si una isla se cae, espera: vuelve a aparecer.";
    case "Tus dibujos":
      return "";
    case "Crow": {
      const missing = STAMPS.filter(food => !stamps.has(food));
      return missing.length
        ? `Amorcito, nos ${missing.length === 1 ? "falta" : "faltan"} ${new Intl.ListFormat("es").format(missing)}.`
        : "Ya está toda la comida, amorcito.";
    }
  }
}
