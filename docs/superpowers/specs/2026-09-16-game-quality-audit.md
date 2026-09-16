# Auditoría de la fonda: textos, código y nitidez

## Objetivo

Conservar la fonda que ya le gustó a Crow y corregir los detalles que la hacen sentirse genérica, difícil de mantener o poco cuidada. La investigación precede a los cambios; una preferencia estética no se presenta como un bug ni como prueba de que algo fue hecho con IA.

El equipo revisa tres áreas: textos y presentación, Phaser/Three.js y calidad del repositorio. Los informes con sus fuentes quedan en `docs/research/`. Este documento reúne las decisiones de implementación.

## Criterios de diseño

- Los dibujos de Chofis, Pibble, los objetos chilenos y la relación México-Chile dan identidad al juego. Se conservan.
- Los textos deben decir qué hacer, con frases que Crow pueda personalizar. No se inventan recuerdos, apodos ni anécdotas de la pareja.
- El cielo suave y los colores del escenario se mantienen. Se corrigen problemas de lectura o repetición concretos, sin cambiar toda la dirección artística.
- Las conversaciones siguen requiriendo E o un tap desde cerca. Los efectos deben responder a una acción o ayudar a leer el juego.
- La interfaz conserva botones accesibles y controles táctiles cómodos. Los símbolos no reemplazan instrucciones necesarias.
- Se reutilizan Phaser, Three.js y las herramientas instaladas. No se agrega un framework ni se convierte el juego en un sistema genérico.

## Nitidez y escritorio

La comprobación inicial en una ventana de 1440 × 900 con densidad 2× produce un canvas de 2880 × 1800 y textos internos a 2×. El encuadre muestra 1360 unidades del mundo y la captura conserva el estilo ilustrado.

Se reprodujo un defecto al cambiar de densidad sin recargar: arrancar a 1× y pasar a 2× deja el canvas a 1440 × 900. La resolución debe actualizarse al cambiar de monitor, zoom o tamaño de ventana, manteniendo las mismas unidades de física.

Se conserva el máximo de 3×. Las cámaras, los textos dibujados en canvas y la posición del botón HTML de interacción deben utilizar la densidad vigente. El fondo difuminado sigue siendo intencional; no se aplica un filtro de nitidez a toda la imagen.

## Verificación y límites

- Probar escritorio a 1× y 2×, móvil a 3× y cambios de densidad sin recarga.
- Comprobar giro de pantalla y redimensionamiento durante una conversación.
- Mantener salto variable, transporte en plataformas, grietas, checkpoints, recogida y encuentro final.
- Probar el contador con hora real y la transición usando `?t`.
- Lanzar los navegadores de prueba con audio silenciado y cerrarlos al terminar, también cuando falle una prueba.
- Mantener fuera de esta auditoría el editor de niveles, las nuevas escenas narrativas, sentarse en bancas y generar más ilustraciones. Siguen en el roadmap.

## Decisiones de implementación

### Textos y lectura

El encabezado debe conservar el destino: `Comida para Crow: 0/3`, además del nombre de la zona y la siguiente acción. Las reacciones al recoger comida serán breves; el HUD ya explica qué sigue.

Los textos de los personajes se reunirán en un módulo de diálogo pequeño. Marin explica el salto, Pibble las islas móviles, Supergirl las grietas y Krypto la recuperación. Cada uno tendrá su propia respuesta cuando Chofis ya haya recogido su objeto. Crow solo nombrará la comida pendiente. La carta se conserva literalmente. Un documento mostrará los diálogos y sus variantes para que Crow pueda revisarlos.

La primera caída explicará la vuelta a la bandera. La conservación de comida se mencionará solo si hay comida y una sola vez. Las caídas siguientes no llenarán la pantalla con la misma frase de 6,5 segundos.

Los controles de sonido, interacción y cierre de diálogo tendrán al menos 44 CSS px de alto en móvil. Las pistas importantes ya están disponibles en los diálogos y en el HUD; los carteles se acortarán y su letra crecerá para apoyar esa información. Se retira algún accesorio del puesto intermedio, manteniendo la composición más completa en Crow.

### Phaser y Three.js

En Phaser se compara la densidad vigente antes de cada actualización y solo se redimensiona si cambió. Esto cubre también cambios que no emiten eventos de ventana o medios. El mismo camino actualiza zoom de escala, canvas físico, textos existentes, cámara y botones HTML. La portada hace la misma comparación mientras permanece activa.

El arte de las plataformas se sincronizará en `POST_UPDATE`, después de que Arcade copie la posición física al sprite. El reloj de grietas seguirá detenido durante conversaciones. El botón HTML se proyectará después del render de cámara con `getWorldPoint(0, 0)` y el zoom vigente, sin acceder a matrices privadas ni llamar a `preRender()` dos veces.

La portada intentará crear el renderer real de Three.js y usará el fondo CSS si falla. Three r170 necesita WebGL2; que exista WebGL1 no garantiza que pueda arrancar. El fallo de Three no debe impedir el contador ni el juego.

Una vez terminado el fundido de entrada se liberarán Three, su observador y el seguimiento de puntero, y se detendrá el RAF del contador. Ocultar y volver a mostrar la pestaña no debe reactivarlos. Con movimiento reducido se libera al terminar el arranque, sin esperar una transición inexistente. El cielo se carga como fondo CSS; no necesita otra textura sin uso en Phaser.

### Repositorio y pruebas

El camino recomendado para probar será un runner Node pequeño que use el CLI instalado de agent-browser, una sesión única, `--mute-audio`, espera de `body.playing`, límites de tiempo y cierre en éxito, error o interrupción. No se agrega Playwright. Las pruebas directas de física se conservan y se adaptan al orden real de eventos.

Solo un `t` válido activa la vista previa y su guardado separado. La validez se calculará en el módulo de cuenta regresiva que ya interpreta ese parámetro. Se elimina `progress` y su fecha de anclaje porque no tienen consumidores en producción; se sustituyen sus pruebas por casos de hora previa, inválida y válida.

Se usa Node 22 en CI y `pnpm@9.15.9`. Se actualizan Vite y Vitest a las menores líneas compatibles corregidas indicadas por los avisos actuales, inicialmente Vite 6.4.3 y Vitest 4.1.11, validando instalación congelada, pruebas, build y auditoría. Phaser, Three y TypeScript conservan su versión salvo incompatibilidad demostrada. Los avisos de herramientas locales no se presentan como vulnerabilidades demostradas del sitio estático.

Se retiran configuraciones vacías, declaraciones de imports `?raw` ya cubiertas por Vite y el CNAME duplicado de la raíz. No se modifica DNS ni la configuración de Pages. Las recetas de assets documentarán la limpieza 1× y la promoción desde una carpeta temporal verificada. Los scripts comprobarán que existen sus entradas antes de escribir resultados. Se conservan los originales y el respaldo de licencia de Piano 3.

## Fuentes y reparto

- [Textos, presentación y accesibilidad](../../research/humanizer-game-audit.md): guía humanizer, W3C y Xbox Accessibility Guidelines.
- [Phaser y Three.js](../../research/phaser-runtime-audit.md): documentación y código oficial de las versiones instaladas, y MDN para DPR.
- [Calidad del repo](../../research/repo-quality-audit.md): Node, Vite, Vitest, GitHub Pages y avisos de los mantenedores.

El agente principal implementa densidad, proyección, sincronización y conexión de los diálogos en `game.ts`. Los trabajadores tienen ámbitos separados: portada/Three, textos/estilos, y tooling/cuenta regresiva. Ningún trabajador edita `game.ts`.

## Criterio de cierre

Se conserva el recorrido de 82 conexiones, con arte sincronizado a 30/60/120 Hz y conversaciones manuales. Los cambios de densidad 1 → 2 → 1 y 2 → 3 no alteran la porción visible del mundo. El contador funciona si Three falla, y su trabajo termina cuando aparece el juego. El runner no deja música ni navegadores propios activos. La implementación y las comprobaciones quedan registradas junto al spec.

## Resultados de implementación

- 37 pruebas unitarias pasan: reloj y guardado de preview, zona horaria de Santiago, diálogos, mapa y progreso, arranque sin WebGL2, liberación de Three y partículas al cambiar DPR.
- El recorrido real en Phaser pasa sus 82 conexiones y los controles de salto, conversaciones, galería, comida, checkpoints y carta. La sincronización de plataformas se comprueba a 30/60/120 Hz.
- Escritorio: 1440 × 900 CSS, canvas 2880 × 1800 a 2×; vuelta a 1440 × 900 a 1× sin recargar. Los textos siguen la densidad y el encuadre no cambia.
- Emulación iPhone 15: 393 × 852 CSS, canvas 1179 × 2556. Girar durante una conversación a 852 × 393 mantiene el diálogo dentro de la pantalla y la física pausada.
- Se revisaron capturas de escritorio y móvil: contornos y texto nítidos, cielo suave intencional. Esto no sustituye una partida en un teléfono físico ni reconstruye detalle ausente de las ilustraciones.
- La comprobación nativa de Chromium mostró que un cambio 2× → 1× por emulación podía cambiar `matchMedia().matches` sin despachar `change`. Por eso Phaser usa una comparación escalar en `PRE_UPDATE`; solo reconstruye tamaños cuando cambia la densidad.
- El runner se verificó con éxito, fallo de aserción, timeout de carga/evaluación y señales SIGINT/SIGTERM. Cerró sus sesiones y procesos de Chrome; al terminar la revisión no quedan sesiones de agent-browser activas.
- Los scripts de imágenes pasan la prueba de entradas incompletas: conservan los resultados anteriores en ambos extractores.
- Build de producción correcto y auditoría sin vulnerabilidades conocidas. Se conserva el aviso de tamaño del chunk de Phaser: el juego ya se carga por importación dinámica; dividir el motor no reduce sus bytes necesarios.

La carta sigue provisional. El editor y las nuevas animaciones permanecen en el roadmap; no se añadieron sistemas anticipados para ellos.
