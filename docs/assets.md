# Assets para la sorpresa de Chofis

La extracción original produce 23 PNG con transparencia. La web incluye 32 PNG entre dibujos originales, hojas de animación y decoraciones, más el cielo en WebP. Las copias de reserva se conservan en `~/Downloads/Chofis/assets/reserva-web/`.

Los originales están en `~/Downloads/Chofis/originales/`. La lámina `contact-sheet.jpg`, el inventario `manifest.json` y los 23 recortes se conservan en `~/Downloads/Chofis/assets/`. La tabla describe el pack completo, no solo los archivos de `public/game/`.

| Grupo | Archivos |
| --- | --- |
| Chofis | `chofis-{left,front,right,angry,happy,sad}.png` |
| Crow | `crow-{left,front,right,angry,happy,sad}.png` |
| Marin | `marin-devil.png`, `marin-school.png`, `marin-bunny.png` |
| Pibble | `pibble.png` |
| Supergirl y Krypto | `supergirl.png`, `krypto.png`, `supergirl-krypto.png` |
| Fiestas Patrias | `sticker-empanada.png`, `sticker-completo.png`, `sticker-crow.png`, `sticker-terremoto.png` |

Los pajaritos usan cuadros de 320 × 320 px, centrados horizontalmente y alineados en los pies. Los originales son poses y expresiones. Ahora Chofis usa además tres frames de carrera y dos de salto extraídos de las imágenes nuevas; el collider permanece fijo e independiente de la ilustración.

Los cuatro stickers provienen de las imágenes originales y máscaras alfa incrustadas en el PDF; se omitieron las copias repetidas. Conservan sus marcas de autor.

Marin se enderezó mediante rotación. Al ser una fotografía de pantalla, conserva perspectiva, textura y algo de contaminación de color en los bordes. Para personajes pequeños es utilizable; una exportación original de sus dibujos daría mejor calidad.

Pibble ya estaba cortado por el encuadre original. No se reconstruyeron las partes que faltan. Funciona especialmente bien como retrato en un diálogo.

Supergirl y Krypto se separaron conservando únicamente las partes visibles. Krypto tapa una parte de la capa de Supergirl: ese hueco permanece en el PNG individual. El archivo conjunto respeta su composición original. Los dibujos de Marin, Supergirl y Krypto son de Chofis, según la información proporcionada.

Se revisaron los recortes visualmente y se verificó que los 23 archivos tienen contenido y transparencia. La separación es por color y máscaras guiadas, sin redibujado generativo.

Los personajes originales de `public/game/` tienen una pasada adicional de limpieza de bordes con `scripts/clean-sprites.py --scale 1`. Los stickers conservan su alfa original. Las copias ampliadas están en `~/Downloads/Chofis/assets/ampliados/`; la web mantiene el tamaño original para no cargar texturas más grandes sin detalle adicional.

## Resultados de Nano Banana

`scripts/prepare-generated.py` procesa los nueve JPEG del usuario. Sus dameros eran píxeles opacos: se eliminaron los fondos conectados y los huecos interiores de la ramada, se limpiaron bordes y se redujo con alfa premultiplicado. No se modifican los JPEG.

| Recurso en la web | Uso |
| --- | --- |
| `chofis-run.png` | Tres frames; se omitió el segundo del JPEG porque trae una silueta duplicada. |
| `chofis-jump.png` | Ascenso y caída. |
| `crow-poses.png` | Reposo, saludo y encuentro final. |
| `marin-poses.png` | Reposo, saludo y gesto de señalar, activados al hablar. |
| `ramada.png` | Un mismo puesto reutilizado en tres islas. |
| `volantin.png`, `copihue.png` | Decoración del cielo y las islas grandes. |

Las hojas de Marin diablita y conejita y todos los frames individuales están preparados en `Chofis/assets/generados/`, como reserva. Supergirl y Krypto mantienen los recortes originales por decisión del usuario.

`scripts/prepare-world.py` procesa los cuatro JPEG v3 y deja 14 recortes transparentes y un cielo WebP en `Chofis/assets/generados/mundo/`:

- Seis islas: pequeñas, medianas y grandes, estables o agrietadas. Las texturas tienen el borde caminable en la fila 112; la imagen se alinea con la colisión existente.
- Cuatro islas lejanas: se eliminaron las líneas divisorias y el fondo blanco. Se usan con menor opacidad y desplazamiento más lento.
- Banca, farol, macetero y letrero: se quitaron también los blancos interiores y el halo blanco exterior del farol.
- Cielo de 2048 px de ancho: aparece con el fundido de entrada y cubre la pantalla sin depender del zoom de conversación.

Los cuatro originales permanecen intactos. La lámina `mundo/contact-sheet.jpg` permite revisar los recortes sobre un fondo oscuro. La selección de columnas y el tratamiento del fondo están ajustados a estas imágenes.

Para regenerar, desde el repositorio:

```sh
uv run scripts/prepare-assets.py
uv run scripts/prepare-generated.py
uv run scripts/prepare-world.py
```
