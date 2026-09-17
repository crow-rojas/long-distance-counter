# Próximas mejoras de la fonda

Checkpoint del 16 de septiembre de 2026: aventura completa y jugable, cuatro zonas, arte nuevo, conversaciones, objetos, checkpoints y encuentro con Crow. El contador revela el juego el 18 de septiembre a las 06:55 de Chile.

Estas ideas quedan pendientes; no forman parte de esta entrega. El orden es una propuesta para avanzar de a poco con las siguientes mejoras. La dificultad actual queda aprobada por Crow y se mantiene por ahora.

## Primero: darle nuestro toque

- [x] **Reunir todos los diálogos en un solo lugar.** [Guía de textos y variantes](dialogues.md), con el [JSON editable](../src/game/es.json). Los diálogos revisados por Crow ya están incorporados al juego.
- [x] **Incorporar los diálogos escritos por Crow.** Conservar sus chistes y forma de hablar; los criterios para próximos textos están en el catálogo.
- [ ] **Escribir la carta final.** Crow la hará después.
- [x] **UI más mínima y con etiquetas claras.** Objetivo corto, tres dibujos de comida con estado e iconos en los controles e interacciones. Conserva nombres accesibles, tooltips y áreas cómodas para tocar. Saltar intro y el reintento de carga mantienen texto visible.
- [x] **Sentarse en las bancas.** E o un tap desde cerca para sentarse. Moverse, saltar, E o Levantarse para continuar. Las dos bancas usan el dibujo actual de Chofis, con el mundo activo y la misma altura de salto.
- [ ] **Personajes con más vida.** Probar parpadeos, pequeños cambios de postura y reacciones al interactuar. Mantener los diálogos manuales y evitar rebotes constantes; respetar movimiento reducido.

## Después: contar la llegada

- [x] **Inicio con narrativa.** Intro breve con descenso hasta Chofis, texto editable y opción de saltar. Las partidas guardadas entran directamente; movimiento reducido muestra el texto estático.
- [ ] **Final con narrativa.** Preparar el cierre del encuentro con Crow cuando esté lista la carta.
- [x] **Mejor transición del contador al juego.** Fundido entre la flor y el cielo de la fonda, carga desde la llegada y cámara adaptada a móvil y movimiento reducido.
- [ ] **Más assets de Nano Banana.** Priorizar poses para sentarse, parpadear y reaccionar, y elementos concretos que pidan las escenas nuevas. Hacer una lista corta con referencias antes de generar.

## Herramientas para seguir construyendo

- [ ] **Editor simple de niveles.** Colocar y mover plataformas y decoraciones sobre el mapa, con una cuadrícula opcional y un botón para probar. Primera versión local: importar/exportar un archivo y conservar el formato del mapa actual. Sin cuentas ni servidor.

## Antes de la sorpresa

- [ ] Probar una partida completa en el celular de Crow: controles, lectura, sonido y duración, conservando la dificultad actual.
- [ ] Reemplazar la carta provisional y revisar las frases de la pareja.
- [x] Incluir Piano 3 en el deploy por indicación de Crow y conservar [el respaldo de itch.io y la licencia del pack](licenses/alkakrab-piano.md).
- [ ] Comprobar la transición a las 06:55 con la vista de prueba y confirmar que la URL normal siga usando la hora real.

Prueba publicada: [abrir el juego anticipadamente](https://dawn.crowrojas.dev/?t=2026-09-18T09:55:00Z). Usa un guardado separado de la sorpresa con hora real.
