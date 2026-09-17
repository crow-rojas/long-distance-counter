# dawn

Contador de CDMX a SCL y una fonda entre estrellas para Chofis.
Llegada: **18 de septiembre de 2026, 06:55 de Chile**.

[dawn.crowrojas.dev](https://dawn.crowrojas.dev)

[Roadmap](docs/roadmap.md) / [Auditoría y spec](docs/superpowers/specs/2026-09-16-game-quality-audit.md) / [Textos para personalizar](docs/dialogues.md).

## Desarrollo

```sh
corepack pnpm@9 install --frozen-lockfile
corepack pnpm@9 dev
```

[Probar el juego](http://localhost:5173/?t=2026-09-18T09:55:00Z).
Para probar los últimos cinco segundos del contador, usa `?t=2026-09-18T09:54:55Z`.
Sin `?t`, o con un valor vacío/inválido, se usa la hora real. Este parámetro es una comodidad de prueba, no control de acceso.

En desarrollo y dentro de esa vista previa, **Reiniciar prueba** o **Shift + R** borran la comida, el checkpoint, la intro vista y el final guardado, y recargan el juego. No borran el progreso del reloj real.

## Juego

La primera llegada presenta una intro de unos ocho segundos después de cargar: fundido, descenso de cámara hasta Chofis, texto y controles. **Saltar intro** o Escape permiten empezar antes. Con movimiento reducido, o al volver de otra pestaña durante la intro, aparece el texto estático y **Jugar**. La música sigue siendo opcional. Las partidas guardadas entran directamente.

Chofis recorre cuatro zonas a lo largo de 14.000 píxeles: entrada, islas de los volantines, jardín de copihues y camino a Crow. Hay 40 plataformas principales, dos del desvío de dibujos y nueve checkpoints. La meta sigue siendo llevar empanada, completo y terremoto hasta Crow.

Las islas con marcas verdes se mueven y transportan al personaje. Las agrietadas avisan durante 850 ms antes de caer y reaparecen 2,5 segundos después. Caerse conserva la comida recogida; el camino funciona en ambos sentidos. El objetivo de duración sigue siendo 8 a 12 minutos en una primera partida, pendiente de comprobar con una persona jugando.

- Moverse: flechas o A/D. Saltar: Espacio, W o flecha arriba; mantener para saltar más alto.
- Hablar: E o un tap en el personaje/botón situado sobre él, cuando Chofis está cerca. Los NPC solo hablan y reaccionan al interactuar.
- Sentarse: E o un tap en una banca cercana, con Chofis en el suelo. Moverse, saltar, pulsar E o tocar Levantarse permite seguir. El mundo sigue activo y la banca no aumenta la altura de salto.
- La cámara se acerca durante la conversación y el texto aparece arriba. E, Escape o Seguir cierran el diálogo. La física y los desafíos se pausan durante las conversaciones, la galería y la carta.
- En móvil aparecen botones de dirección y salto. Con movimiento reducido, se omiten las transiciones de cámara y los efectos decorativos de movimiento.
- Los botones usan iconos con nombres accesibles: direcciones, salto, banca, levantarse, conversación, galería, carta y cierres. Solo Saltar intro y el reintento de carga conservan texto visible. Los nombres y tooltips se editan en `es.json`.
- El objetivo muestra la siguiente instrucción y tres dibujos indican la comida pendiente o recogida. Al recogerla aparece a color con una marca; sus descripciones también funcionan con lectores de pantalla.
- Sonido opcional con el botón de altavoz: efectos CC0 de Brackeys y Piano 3 de AlkaKrab. Empieza en silencio.
- El canvas y sus textos se dibujan según la densidad de pantalla, hasta 3×. El tamaño visible del mapa y las colisiones no cambian; el giro del celular o cambio de densidad del monitor reajusta canvas, textos y cámara sin recargar.
- Chofis tiene tres frames de carrera y dos de salto. Marin saluda y señala al hablar; Crow cambia de expresión. Supergirl, Krypto y Pibble conservan sus dibujos.
- Para escribir más diálogos, leer primero los [criterios y ejemplos de Crow](docs/dialogues.md#criterios-para-los-próximos-textos) y aplicar humanizer respetando sus expresiones.
- Los textos se editan en [es.json](src/game/es.json). La carta final sigue provisional en `carta.texto`; [guía de edición](docs/dialogues.md).

La entrada después de la última banca requiere los tres objetos. Al cruzarla, Chofis aterriza si venía saltando y camina hacia Crow durante tres segundos; ambos muestran sus poses felices, aparecen corazones y dos segundos después se abre la carta. Cerrar la carta deja el encuentro como pantalla final, con sonido y un sobre para releerla. El movimiento no vuelve. Con movimiento reducido se omiten la caminata y el movimiento de cámara y corazones.

El guardado usa `chofis-platformer-preview` en pruebas y `chofis-platformer` con el reloj real. Cada uno guarda el ID del checkpoint en `:checkpoint`, la intro completada o saltada en `:intro-seen` y el final en `:ending-seen`. Se siguen leyendo los índices del mapa original para conservar partidas anteriores. Un final guardado con los tres objetos vuelve al encuentro y al sobre; de lo contrario, recargar retoma el checkpoint. Un mapa con otro `id` usa un guardado separado. Si el navegador bloquea el almacenamiento, la sesión sigue siendo jugable.

## Editor mínimo

Abrir `/editor.html` en escritorio, con Vite o en el sitio construido. El mapa está en [src/game/map.json](src/game/map.json): plataformas, personajes, comida, bancas, decoración, carteles, inicio y entrada final.

- Seleccionar en el lienzo o en la lista. Arrastrar para mover; los campos inferiores ajustan posición y tamaño.
- Rueda para zoom, arrastre con botón derecho para recorrer y botón de encuadre para centrar la selección.
- El botón de reproducir prueba desde la selección. **Con comida** permite probar el final; Escape vuelve al editor.
- El borrador se guarda en este navegador. Descargar el JSON conserva una copia; importar permite recuperarla. Ninguna prueba cambia el progreso de la sorpresa.
- Para incorporar un mapa, reemplazar `src/game/map.json` por el JSON exportado y comprobar el recorrido antes de publicar. El editor no publica cambios.

El MVP no incluye biblioteca, duplicar, borrar ni historial. Esas modificaciones pueden hacerse directamente en el JSON. Los carteles permiten un `text` propio; vacío usa la frase de `es.json` indicada por `textKey`. Los IDs de elementos deben mantenerse al moverlos para conservar los checkpoints.

Comprobación del editor: `node scripts/test-browser.mjs http://127.0.0.1:5173/editor.html tests/editor.browser.js`.

## Dónde está cada cosa

| Carpeta | Contenido |
| --- | --- |
| `src/countdown/`, `src/ui/`, `src/input/` | Contador, transición e interacción con el fondo. |
| `src/scene/` | Cielo y flor originales en Three.js; al jugar, se libera tras el fundido y da paso al cielo CSS. |
| `src/game/` | Juego en Phaser 3: escena, estilos, [mapa](src/game/level.ts) y guardado. |
| `public/game/` | 32 PNG, el cielo WebP y los efectos de sonido con su licencia. |
| `scripts/` | Extracción de dibujos y limpieza de bordes. |
| `tests/` | Pruebas unitarias y comprobación real del juego en navegador. |
| `docs/` | [Notas de los assets](docs/assets.md), [estado de arte y sonido](docs/game-art-and-sound.md) y diseño original. |

Los originales, packs seleccionados, prompts y resultados de Nano Banana viven en **`~/Downloads/Chofis/`**. Su `README.md` es el índice. El proyecto contiene únicamente las imágenes que necesita la web.

## Preparar dibujos

Prueba primero en una carpeta temporal. Estos comandos no reemplazan los recursos publicados:

```sh
asset_scratch=$(mktemp -d "${TMPDIR:-/tmp}/chofis-assets.XXXXXX")
uv run scripts/prepare-assets.py ~/Downloads/Chofis/originales "$asset_scratch/originales"
uv run scripts/clean-sprites.py "$asset_scratch/originales" "$asset_scratch/limpios" --scale 1
uv run scripts/prepare-generated.py ~/Downloads/Chofis/resultados "$asset_scratch/generados"
uv run scripts/prepare-world.py ~/Downloads/Chofis/resultados "$asset_scratch/mundo"
uv run --with pillow scripts/check-asset-preflight.py
```

Revisa transparencia, contornos, alineación de pies y la fila caminable de las islas. Después copia **solo los archivos usados por el juego** desde esa carpeta a `public/game/` y revisa el diff. La limpieza 1× reproduce el tamaño publicado; 2×/4× sirven como copias ampliadas, sin inventar detalle. Los scripts de resultados generados comprueban sus archivos de entrada antes de escribir salidas.

La extracción lee `Chofis/originales/` y escribe 23 PNG en `Chofis/assets/`. También acepta carpetas de origen y destino como argumentos. La limpieza conserva los originales; ampliar no reconstruye detalles perdidos.

El tercer script quita el damero pintado de los primeros nueve JPEG en `Chofis/resultados/` y deja hojas, frames y decoraciones en `Chofis/assets/generados/`. Usa recortes ajustados a estas imágenes; descarta el segundo frame defectuoso de carrera. La web utiliza `chofis-run`, `chofis-jump`, `crow-poses`, `marin-poses`, `ramada`, `volantin` y `copihue`. Las otras dos versiones de Marin quedan preparadas como reserva.

`prepare-world.py` separa las cuatro imágenes v3: cielo, cuatro siluetas lejanas, seis plataformas y cuatro decoraciones. Deja los recursos preparados en `Chofis/assets/generados/mundo/`; sus copias en `public/game/` ya están integradas. Conserva los JPEG originales.

Piano 3 se incluye en el deploy y se carga desde `/game/audio/piano.mp3`, sin depender de variables locales. Usa 128 kbps y +6 dB; se recortaron 3,38 segundos iniciales, con entrada de 50 ms y salida de un segundo. [Fuentes, capturas de itch.io, licencia y decisión de uso](docs/licenses/alkakrab-piano.md).

## Verificación y publicación

```sh
corepack pnpm@9 test
corepack pnpm@9 build
```

Con Vite corriendo y el CLI `agent-browser` instalado:

```sh
corepack pnpm@9 test:browser
node scripts/test-browser.mjs http://127.0.0.1:5173 tests/intro.browser.js
# Otro puerto: corepack pnpm@9 test:browser http://127.0.0.1:5174/
```

El runner abre una sesión nueva silenciada, espera a que termine la carga y la cierra al terminar, también ante error o interrupción. No utiliza tus guardados ni pestañas.

La prueba de intro comprueba bloqueo de controles, salto y final natural, continuidad del encuadre, guardados anteriores, rotación, vuelta de segundo plano y movimiento reducido. La prueba del mapa salta la intro mediante su botón antes de recorrer el mundo.

Comprueba densidad del canvas y textos, cambios de tamaño, recordatorios de caída, el foco y las teclas tras cambiar el sonido, giros rápidos, salto variable, coyote time, salto anticipado, ausencia de doble salto, transporte sobre islas móviles, caída y recuperación de islas frágiles, pausa durante conversaciones, 82 conexiones, las dos bancas, desvío de dibujos, recogida, checkpoints y carta final. La prueba busca un momento de salto viable en las conexiones móviles; no presupone que cualquier momento funcione. Esta comprobación de navegador es local; no forma parte de CI.

GitHub Pages publica al hacer push a `main`. La procedencia de música e imágenes queda documentada en `docs/`.

Diseño inicial: [dawn](docs/superpowers/specs/2026-05-14-dawn-design.md). Referencias de la aventura: [A Short Hike](https://ashorthike.com/), [Unpacking](https://www.unpackinggame.com/) y [Hidden Folks](https://hiddenfolks.com/). Los cuatro prompts de escenario están en el documento principal de `Chofis/nano-banana/`; sus resultados ya están integrados.
