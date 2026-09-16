# Arte y sonido: estado actual

Al entrar al juego, la flor de dawn se desvanece y el cielo pasa a azul noche y ciruela desaturado, con niebla y siluetas lejanas que se desplazan más lentamente. Las ramadas, luces, volantines y copihues destacan en primer plano. Chofis usa frames de carrera y salto; los NPC reaccionan solo al hablar con E o un tap desde cerca. El audio sintetizado fue descartado y está archivado fuera del proyecto.

## Documentos de trabajo

La carpeta **`~/Downloads/Chofis/`** reúne el material de producción:

| Ruta dentro de Chofis | Uso |
| --- | --- |
| `nano-banana/PROMPTS-NANO-BANANA.md` | Documento único de prompts, con índice e imágenes. |
| `resultados/` | Trece JPEG generados por el usuario; se conservan intactos. |
| `revision-packs/SELECCION.md` | Análisis de los cuatro packs y selección provisional. |
| `revision-packs/ESCUCHAR.html` | Comparador local de música y efectos. |
| `revision-packs/seleccion/` | Archivos elegidos y licencias disponibles. |
| `originales/` | Dibujos y PDF originales. |
| `assets/` | Recortes, ampliaciones, `generados/` con los nuevos PNG y reserva de sprites. |
| `archivo/` | Prototipos, guías anteriores y capturas históricas. |

Los prompts se mantienen en ese Markdown, sin otra copia editable en el repositorio. La selección musical es técnica y provisional; no equivale a una audición.

## Recursos utilizados

- Música local: Piano 3, recortado desde 3,38 s, entrada de 50 ms, salida de un segundo y volumen ajustado. Se midieron unos 49 ms iniciales bajo −50 dB después del recorte. Se activa desde «Sonido» y continúa al silenciar/reactivar.
- Efectos de Brackeys: `jump` al saltar, `tap` al aterrizar/hablar, `coin` al recoger comida y `power_up` al encontrar a Crow.
- La ramada, el volantín y el copihue generados ya están integrados. La comida sigue usando los stickers originales.
- Supergirl, Krypto y Pibble conservan sus dibujos. El desvío opcional muestra los dibujos originales de Marin diablita y conejita; sus hojas nuevas de poses siguen como reserva.
- Multi Platformer y HALFTONE permanecen en Downloads.

## Escenario v3 integrado

El Markdown principal de Nano Banana contiene cuatro prompts ampliados: cielo difuminado, siluetas lejanas, seis plataformas estables/agrietadas y cuatro objetos decorativos. Cada prompt indica sus propias referencias. Para el cielo se adjunta solo la paleta; los personajes y la ramada se reservan para las plataformas y los objetos.

Los cuatro resultados ya están procesados e integrados: cielo, islas lejanas, plataformas estables/agrietadas y decoración de fonda. Los recortes están en `Chofis/assets/generados/mundo/`, con una lámina de contacto. Las plataformas mantienen su física y recorrido; la imagen y sus marcas se mueven o desaparecen juntas.

## Licencias

Brackeys y Multi Platformer incluyen CC0. Los cuatro WAV de Brackeys se incorporaron con su `LICENSE-Brackeys.txt` en `public/game/audio/`.

La licencia de Game Piano Music pide permiso específico para juegos de código abierto y el repositorio es público. Por eso `public/game/audio/piano.mp3` y `.env.local` están ignorados por Git. `VITE_GAME_MUSIC` habilita la pista en la copia local; sin esa variable el juego solo carga efectos y no pide un archivo ausente. No publicar un build local con esa música hasta resolver el permiso del autor. HALFTONE ofrece su PDF de licencia por separado y sigue sin utilizarse.

La procedencia y limitaciones de los dibujos están en [assets.md](assets.md).
