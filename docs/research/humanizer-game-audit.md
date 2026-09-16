# Chofis: auditoría de escritura, diseño y sensación de juego

16 de septiembre de 2026 · revisión `aed7122`.

La fonda ya tiene identidad. La mejora con más retorno es explicar mejor la entrega, facilitar la lectura en celular y ajustar las respuestas al progreso. Conservar el estilo que el usuario acaba de aprobar.

## Alcance y evidencia

Investigación para el flujo **investigación → especificación → implementación**. Esta entrega cubre solo investigación y recomendaciones para la siguiente especificación. Revisión editorial, visual y de interacción realizada en una sesión, sin agentes anidados ni cambios de aplicación.

Leídos `game.ts`, `level.ts`, estilos, transición, documentación y pruebas existentes; consultadas las guías locales [humanizer](/Users/crowdev/.agents/skills/humanizer/SKILL.md) y [frontend-design](/Users/crowdev/.codex/plugins/cache/claude-plugins-official/frontend-design/local/skills/frontend-design/SKILL.md). No existe una KB correspondiente a este proyecto en `~/claude-sync/projects/`.

Inspección visual local con guardado de prueba: entrada, puestos intermedios, jardín, Crow y conversación con Marin; viewports 1280×720, 390×844 y 844×390. Para inspeccionar zonas se reposicionó el personaje en memoria: esto no acredita completar el recorrido. La sesión `chofis-humanizer-20260916-marlin` se abrió con `--args '--mute-audio'`, nunca activó sonido y quedó cerrada. También se detuvo su servidor Vite.

Límites: viewports de escritorio redimensionados, sin validación de multitouch, safe areas de un teléfono real, lector de pantalla, contraste medido ni duración de primera partida. No se ejecutó la suite de navegador, que activa sonido en [tests/platformer.browser.js:29](../../tests/platformer.browser.js#L29). No se verificó aquí el render a DPR 3.

## Criterios de investigación

- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing): la propia fuente aclara que es descriptiva, centrada en Wikipedia, y que sus indicadores aparecen también en escritura humana. Se usa para encontrar vaguedad y repetición, nunca para atribuir autoría. Corazones, gradientes, serifas, flechas y botones redondeados no son defectos por sí mismos.
- [W3C, tamaño mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) y [tamaño mejorado](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html): 24×24 CSS px es el mínimo AA, con excepciones; 44×44 es el criterio AAA y una buena meta práctica para controles táctiles. No confundirlos.
- [Xbox XAG 101, texto](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101) y [W3C, contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): evaluar texto según su tamaño final y fondo. Más resolución no agranda las letras. Usar 4,5:1 para texto normal como referencia; no se declara incumplimiento sin medir.
- [Xbox XAG 107, entrada](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107): sostener botones, combinarlos y acertar tiempos son barreras distintas. Un mapa técnicamente transitable no prueba comodidad; validar con la persona antes de cambiar física o dificultad.

## Lo que ya funciona y debe conservarse

- Dibujos originales, stickers de comida, Marin, Supergirl, Krypto, Pibble y Crow; cielo Nano Banana, ramadas, volantines y copihues. Su combinación responde al regalo y al lugar. La galería opcional muestra dibujos reales con alternativas textuales: [game.ts:22](../../src/game/game.ts#L22), [game.ts:239](../../src/game/game.ts#L239).
- Paleta nocturna, fondo de baja intensidad y tipografía Fraunces/Georgia con texto funcional sans serif. La conversación despeja el HUD y encuadra a los personajes: [game.css:32](../../src/game/game.css#L32), [game.ts:301](../../src/game/game.ts#L301). No aplicar una limpieza estética que borre estas decisiones.
- Hablar es voluntario; los diálogos usan `<dialog>`, pausan física y devuelven el foco al canvas. La pausa de Marin se comprobó en navegador: [game.ts:209](../../src/game/game.ts#L209), [game.ts:313](../../src/game/game.ts#L313).
- Salto variable, tolerancia de 100 ms tras abandonar un borde y anticipación de salto de 120 ms; checkpoints y comida conservada al caer: [game.ts:165](../../src/game/game.ts#L165), [game.ts:439](../../src/game/game.ts#L439), [game.ts:462](../../src/game/game.ts#L462). Ya hay comprobaciones específicas en [platformer.browser.js:94](../../tests/platformer.browser.js#L94).
- Controles de movimiento de 57×54 y salto de 72×54 CSS px, nombres accesibles, foco visible y liberación de punteros cancelados: [game.css:7](../../src/game/game.css#L7), [game.css:20](../../src/game/game.css#L20), [game.ts:493](../../src/game/game.ts#L493). Conservar también sonido voluntario y movimiento reducido.

## Cambios priorizados para especificar

### 1. P1: que se entienda la entrega desde el primer momento

“Lleva la comida a Crow” existe en [game.ts:16](../../src/game/game.ts#L16), pero el bucle lo reemplaza por “Entrada a la fonda” en [game.ts:470](../../src/game/game.ts#L470). En la entrada observada queda `0/3 · Sube por las islas y recoge la empanada →`; no aparece el destinatario ni qué cuenta el número.

Mantener una frase breve visible que conecte comida y Crow, y nombrar el contador: por ejemplo, “Comida para Crow: 0/3”. Conservar la instrucción del próximo objeto. No hace falta una cinemática ni justificar la búsqueda con recuerdos inventados. Aceptación: sin hablar con Marin, la jugadora puede identificar destinatario, cantidad y primera acción.

### 2. P1: leer y tocar cómodamente sin cambiar el arte

Los carteles usan 14 px del mundo ([game.ts:279](../../src/game/game.ts#L279)); a 390×844 el zoom produce aproximadamente **9,4 CSS px**. El arreglo reciente de DPR mejora nitidez, no tamaño ([game.ts:294](../../src/game/game.ts#L294), [game.ts:485](../../src/game/game.ts#L485)).

Acortar y agrandar las pistas importantes, o mostrarlas también mediante el texto DOM existente al acercarse; conservar la madera y las ilustraciones. En horizontal, revisar que el diálogo y “Seguir” no tapen a los personajes. Medir contraste sobre capturas representativas antes de oscurecer fondos.

“Sonido” y “Hablar con Marin” midieron 33 px de alto en 390×844; “Seguir”, 42 px. Llevar sus superficies táctiles a 44 px como meta de comodidad, preservando dirección y salto. No son automáticamente fallos AA. Revisar ambos sentidos de pantalla en el celular real: la prueba por ancho no valida `(pointer: coarse)` ni safe areas.

### 3. P1: explicar la recuperación cuando empieza a importar

Las banderas guardan desde la primera isla, pero la explicación está en Krypto, en x=7150: [level.ts:34](../../src/game/level.ts#L34), [game.ts:169](../../src/game/game.ts#L169). Al caer siempre aparece “Otra vez. Los objetos que recogí siguen conmigo”, incluso sin comida ([game.ts:467](../../src/game/game.ts#L467)).

Introducir una sola explicación contextual, por ejemplo “Si te caes, vuelves a esta bandera”, al primer checkpoint útil. Tras caer, informar una vez que conserva la comida cuando efectivamente tiene alguna; evitar la misma frase de 6,5 segundos en cada intento. Mantener recuperación inmediata y sin pérdida. Aceptación: primera caída con cero objetos y caídas repetidas con comida tienen mensajes pertinentes.

### 4. P2: dar una función distinta a cada voz y evitar que recite el HUD

Marin concentra salto, objetivo y galería; Pibble y Supergirl explican obstáculos; Krypto añade recuperación. Esa distribución es útil ([level.ts:30](../../src/game/level.ts#L30)). El problema concreto es que tres personajes comparten “¡Ya lo tienes! [siguiente instrucción]” ([game.ts:410](../../src/game/game.ts#L410)), y Crow enumera toda la comida aunque solo falte una.

Recortar Marin a la ayuda inmediata, dejar la galería al letrero cercano y preparar respuestas breves específicas del estado. Crow debe mencionar solo lo pendiente. Mantener “¡Guau!” y “amorcito”; no fabricar bromas privadas ni biografía.

Además, [game.ts:196](../../src/game/game.ts#L196) atribuye a Chofis una frase que copia `nextStop().instruction`, también presente en el HUD: después de “Empanada lista” aparece una orden en segunda persona dentro de su propia intervención. Dejar la reacción corta y el siguiente paso en el HUD, conservando halo y feedback visual.

Aceptación: revisar variantes sin comida, con comida parcial y completa; ningún NPC reclama algo recogido ni repite literalmente el HUD. Reunir textos actuales y propuestas para revisión de Crow, siguiendo [roadmap.md:9](../roadmap.md#L9).

### 5. P2: variar puestos mediante composición, no generación masiva

Marin, Pibble y Crow reciben el mismo conjunto de ramada, farol, maceta, elipse y nueve luces ([game.ts:239](../../src/game/game.ts#L239)). Es repetición verificable, no evidencia de IA. Probar retirar uno o dos accesorios de los puestos intermedios y reservar el conjunto completo para Crow.

No eliminar los copihues repetidos en checkpoints ni las flechas de plataformas móviles: ayudan a reconocer estados. Tampoco introducir aleatoriedad, nuevos packs o decoración distinta en cada isla. Comparar capturas con el original y conservar la composición actual si la propuesta pierde calidez.

## Límites y siguiente paso

Dejar intacta `LETTER` ([game.ts:6](../../src/game/game.ts#L6)); solo Crow aporta su versión. También conservar la portada “dawn / she's here.”, la flor, paleta, bandas cinematográficas, dibujos, DPR hasta 3× del juego, estructura de cuatro zonas y física actual. El cambio de idioma de portada a juego no prueba genericidad y no justifica traducirla sin una decisión editorial.

No añadir ahora bancas interactivas, editor, voces, más animaciones ni ajustes amplios de dificultad. Los 850 ms de aviso y 2,5 s de recuperación de islas frágiles son parámetros existentes, no tiempos validados con la destinataria ([game.ts:175](../../src/game/game.ts#L175), [game.ts:358](../../src/game/game.ts#L358)). Si una partida real muestra frustración, especificar una ayuda concreta antes de alterar el recorrido.

Siguiente entrega: una especificación breve con los textos por estado, medidas táctiles y comparación visual de los puestos, preservando los elementos anteriores. Después implementar P1 y los P2 elegidos; comprobar teléfono en ambas orientaciones, teclado, pausa, caídas y guardado. Mantener la validación silenciosa y adaptar la comprobación de sonido para que no lo active. Ninguna implementación forma parte de esta auditoría.
