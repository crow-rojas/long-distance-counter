# Diálogos de la fonda

Textos escritos y revisados por Crow. Su implementación está en [src/game/dialogue.ts](../src/game/dialogue.ts); el mapa conserva nombres, imágenes y posiciones en [src/game/level.ts](../src/game/level.ts). Las bromas y referencias personales las aporta Crow.

## Criterios para los próximos textos

Los diálogos de este documento son la referencia para escribir más. Leerlos antes de usar la skill humanizer y conservar las expresiones elegidas por Crow.

- Mezclar cariño con bromas de chat: "mi princesa", "yei", "omgg", "carnal", "AJSD" y "te amooooo". Usarlas cuando encajen, sin repetirlas en cada frase.
- Conservar mayúsculas, repeticiones, emoticones y emojis que escribió Crow. No corregirlos para que suenen formales ni agregar emojis como decoración automática.
- Mantener los chistes de Pibble Martillo e iTownGamePlays en sus conversaciones. Las bromas nuevas y los recuerdos de pareja necesitan contexto de Crow.
- Escribir instrucciones cortas y concretas. Krypto puede ladrar y explicar entre paréntesis; Crow habla con cariño directo.
- Evitar guiones largos, puntos medios, viñetas decorativas y flechas en todo texto visible, controles, carteles y contador. Usar palabras, espacios y puntuación corriente.
- Los cambios de texto conservan el mapa y la dificultad actual. El cuerpo de la carta queda pendiente de Crow.

## Personajes

Las conversaciones se abren con E o un tap desde cerca. La comida recogida determina la variante, sin importar el orden de recogida.


| Personaje   | Estado             | Texto                                                                                             |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------- |
| Marin       | Sin empanada       | ¡Omg! Hola Chofis, la empanada está más adelante, ve por ella 🫪                                  |
| Marin       | Con empanada       | ¡Encontraste la empanada! ¡Yei!                                                                   |
| Pibble      | Sin completo       | Dicen que más adelante está iTownGamePlays, y te va a tocar. ¡Ten cuidado buscando el completo!   |
| Pibble      | Con completo       | Ya tienes el completo, Pibble Martillo estaría orgulloso.                                         |
| Supergirl   | Sin terremoto      | Solo te falta el terremoto, eh? Cuidado con las siguientes grietas, se caen después de un ratito. |
| Supergirl   | Con terremoto      | ¡Conseguiste el terremoto! No te vayas a marear, cuidado con las réplica AJSD                     |
| Krypto      | Cualquier progreso | Woof woof woof woof (las banderas son un checkpoint 🥳)                                           |
| Tus dibujos | Cualquier progreso | Sin diálogo: abre la galería “Un rincón para tus dibujos”.                                        |


Krypto no tiene un objeto asociado. Marin, Pibble y Supergirl mantienen su respuesta de objeto recogido cuando ya está toda la comida.

## Crow

Solo enumera lo pendiente, en el orden empanada, completo, terremoto.


| Comida recogida      | Respuesta                                                 |
| -------------------- | --------------------------------------------------------- |
| Ninguna              | Mi princesa, nos faltan empanada, completo y terremoto :( |
| Empanada             | Mi princesa, nos faltan completo y terremoto :(           |
| Completo             | Mi princesa, nos faltan empanada y terremoto :(           |
| Terremoto            | Mi princesa, nos faltan empanada y completo :(            |
| Empanada y completo  | Mi princesa, nos falta terremoto :(                       |
| Empanada y terremoto | Mi princesa, nos falta completo :(                        |
| Completo y terremoto | Mi princesa, nos falta empanada :(                        |
| Toda                 | Ya está toda la comida, mi princesa te amooooo ❤️         |


La última respuesta completa el contrato de `replyFor`; el encuentro actual con Crow y toda la comida abre directamente la carta, sin mostrar esta conversación.

## Objetivos del HUD

Fuente: `ITEMS` y `nextStop` en [src/game/level.ts](../src/game/level.ts). Estas instrucciones acompañan a “Comida para Crow: n/3” y a la siguiente instrucción; los NPC no las repiten.


| Próximo destino         | Instrucción        |
| ----------------------- | ------------------ |
| Empanada pendiente      | Busca la empanada  |
| Completo pendiente      | Busca el completo  |
| Terremoto pendiente     | Busca el terremoto |
| Toda la comida recogida | Llega hasta Crow   |


La escena muestra `Comida para Crow: n/3. Instrucción`, con el nombre de la zona encima. Si el destino queda atrás, añade "a tu izquierda". Después del abrazo, el encabezado pasa a “De México a Chile, juntos al fin” y el objetivo a “La fonda es nuestra, amorcito”.

## Recogida, caídas y carteles

Fuente: `create`, `update`, `say` y `decorations` en [src/game/game.ts](../src/game/game.ts). Estos textos viven en la escena, fuera de `replyFor`.


| Momento                                                   | Texto visible                                     | Duración |
| --------------------------------------------------------- | ------------------------------------------------- | -------- |
| Recoger empanada                                          | Chofis: Empanada lista, yei                       | 2,5 s    |
| Recoger completo                                          | Chofis: Ya tengo el completo omgg                 | 2,5 s    |
| Recoger terremoto                                         | Chofis: Ya tengo el terremoto carnal              | 2,5 s    |
| Primera caída, sin comida                                 | Fonda: Volviste al checkpoint.                    | 3 s      |
| Primera caída, con comida                                 | Fonda: Volviste al checkpoint, no perdiste nada:) | 3 s      |
| Primera caída con comida, si ya hubo una caída sin comida | Fonda: No perdiste nada:)                         | 3 s      |
| Caídas después de ambos avisos                            | Sin mensaje nuevo.                                |          |


Cada aviso de caída aparece una sola vez por sesión de juego; recargar reinicia los avisos. Las recogidas no repiten la siguiente instrucción.


| Cartel        | Texto              |
| ------------- | ------------------ |
| Entrada       | Salta              |
| Islas móviles | Espera y<br>salta  |
| Jardín        | Pisa y<br>salta    |
| Camino a Crow | Sigue las<br>luces |


Los carteles usan 20 px del mundo y hasta dos líneas. La indicación de la galería sigue siendo “Tus dibujos arriba”; el letrero final, “la fonda de los dos”.

## Carta provisional, conservada literalmente

Fuente: constante `LETTER` en [src/game/game.ts](../src/game/game.ts). Se mantiene en ese archivo; solo Crow debe reemplazarla por su mensaje.

> Chofis, qué ganas tenía de abrazarte. Ya estás aquí. Quiero pasear contigo, probar cosas ricas y tener tus dibujos por toda la casa. Te amo, amorcito. Tu Crow.

El título actual es “Ven acá, mi princesa ❤️” y el botón dice “Volver a la fonda”. Tampoco se modifican.

## API e integración

Firma: `replyFor(name: typeof FRIENDS[number]["name"], stamps: Set<Stamp>): string`.

```ts
import { replyFor } from "./dialogue";

replyFor(friend.name, stamps);
```

La función no modifica el progreso ni importa Phaser. `Tus dibujos` devuelve `""` porque la escena abre la galería. `game.ts` utiliza `replyFor(friend.name, stamps)` para las conversaciones normales; resuelve primero las ramas de galería y carta.

Los mensajes del HUD, recogida y caída quedan fuera de este módulo. Las variantes se comprueban en [tests/dialogue.test.ts](../tests/dialogue.test.ts).
