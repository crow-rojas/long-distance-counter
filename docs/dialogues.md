# Diálogos de la fonda

Textos para revisión de Crow. Su fuente editable es [src/game/dialogue.ts](../src/game/dialogue.ts); el mapa conserva nombres, imágenes y posiciones en [src/game/level.ts](../src/game/level.ts). No se agregan recuerdos ni anécdotas de pareja.

## Personajes

Las conversaciones se abren con E o un tap desde cerca. La comida recogida determina la variante, sin importar el orden de recogida.

| Personaje | Estado | Texto |
| --- | --- | --- |
| Marin | Sin empanada | La empanada está arriba. Mantén apretado el salto para llegar más alto. |
| Marin | Con empanada | ¡Encontraste la empanada! Los dibujos están un poco más arriba. |
| Pibble | Sin completo | Espera a que la isla se acerque y salta. El completo está al otro lado. |
| Pibble | Con completo | ¡Buen cruce! Ya tienes el completo. |
| Supergirl | Sin terremoto | Las islas con grietas ceden al pisarlas. Prepara el siguiente salto. El terremoto está arriba. |
| Supergirl | Con terremoto | Terremoto en mano. Ojo con las grietas al volver. |
| Krypto | Cualquier progreso | ¡Guau! Las banderitas guardan tu regreso. Si una isla se cae, espera: vuelve a aparecer. |
| Tus dibujos | Cualquier progreso | Sin diálogo: abre la galería “Un rincón para tus dibujos”. |

Krypto no tiene un objeto asociado. Marin, Pibble y Supergirl mantienen su respuesta de objeto recogido cuando ya está toda la comida.

## Crow

Solo enumera lo pendiente, en el orden empanada, completo, terremoto.

| Comida recogida | Respuesta |
| --- | --- |
| Ninguna | Amorcito, nos faltan empanada, completo y terremoto. |
| Empanada | Amorcito, nos faltan completo y terremoto. |
| Completo | Amorcito, nos faltan empanada y terremoto. |
| Terremoto | Amorcito, nos faltan empanada y completo. |
| Empanada y completo | Amorcito, nos falta terremoto. |
| Empanada y terremoto | Amorcito, nos falta completo. |
| Completo y terremoto | Amorcito, nos falta empanada. |
| Toda | Ya está toda la comida, amorcito. |

La última respuesta completa el contrato de `replyFor`; el encuentro actual con Crow y toda la comida abre directamente la carta, sin mostrar esta conversación.

## Objetivos del HUD

Fuente: `ITEMS` y `nextStop` en [src/game/level.ts](../src/game/level.ts). Estas instrucciones acompañan a “Comida para Crow: n/3” y a la flecha de dirección; los NPC no las repiten.

| Próximo destino | Instrucción |
| --- | --- |
| Empanada pendiente | Busca la empanada |
| Completo pendiente | Cruza hasta el completo |
| Terremoto pendiente | Sube por el terremoto |
| Toda la comida recogida | Llega hasta Crow |

La escena muestra `Comida para Crow: n/3 · instrucción ←/→`, con el nombre de la zona encima. Después del abrazo, el encabezado pasa a “México → Chile · juntos al fin” y el objetivo a “La fonda es nuestra, amorcito ♥”.

## Recogida, caídas y carteles

Fuente: `create`, `update`, `say` y `decorations` en [src/game/game.ts](../src/game/game.ts). Estos textos viven en la escena, fuera de `replyFor`.

| Momento | Texto visible | Duración |
| --- | --- | --- |
| Recoger empanada | Chofis: Empanada lista. | 2,5 s |
| Recoger completo | Chofis: Ya tengo el completo. | 2,5 s |
| Recoger terremoto | Chofis: Ya tengo el terremoto. | 2,5 s |
| Primera caída, sin comida | Fonda: Volviste a la bandera. | 3 s |
| Primera caída, con comida | Fonda: Volviste a la bandera. La comida sigue contigo. | 3 s |
| Primera caída con comida, si ya hubo una caída sin comida | Fonda: La comida sigue contigo. | 3 s |
| Caídas después de ambos avisos | Sin mensaje nuevo. | |

Cada aviso de caída aparece una sola vez por sesión de juego; recargar reinicia los avisos. Las recogidas no repiten la siguiente instrucción.

| Cartel | Texto |
| --- | --- |
| Entrada | Salta → |
| Islas móviles | Espera y<br>salta → |
| Jardín | Pisa y<br>salta → |
| Camino a Crow | Sigue las<br>luces → |

Los carteles usan 20 px del mundo y hasta dos líneas. La indicación de la galería sigue siendo “Tus dibujos ↑”; el letrero final, “la fonda de los dos”.

## Carta provisional, conservada literalmente

Fuente: constante `LETTER` en [src/game/game.ts](../src/game/game.ts). Se mantiene en ese archivo; solo Crow debe reemplazarla por su mensaje.

> Chofis, qué ganas tenía de abrazarte. Ya estás aquí. Quiero pasear contigo, probar cosas ricas y tener tus dibujos por toda la casa. Te amo, amorcito. Tu Crow.

El título actual es “Ven acá, amorcito.” y el botón dice “Volver a la fonda”. Tampoco se modifican.

## API e integración

Firma: `replyFor(name: typeof FRIENDS[number]["name"], stamps: Set<Stamp>): string`.

```ts
import { replyFor } from "./dialogue";

replyFor(friend.name, stamps);
```

La función no modifica el progreso ni importa Phaser. `Tus dibujos` devuelve `""` porque la escena abre la galería. `game.ts` utiliza `replyFor(friend.name, stamps)` para las conversaciones normales; resuelve primero las ramas de galería y carta.

Los mensajes del HUD, recogida y caída quedan fuera de este módulo. Las variantes se comprueban en [tests/dialogue.test.ts](../tests/dialogue.test.ts).
