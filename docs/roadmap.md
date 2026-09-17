# Próximas mejoras de la fonda

Checkpoint del 16 de septiembre de 2026: aventura completa y jugable, cuatro zonas, arte nuevo, conversaciones, objetos, checkpoints y encuentro con Crow. El contador revela el juego el 18 de septiembre a las 06:55 de Chile.

Estas ideas quedan pendientes; no forman parte de esta entrega. El orden es una propuesta para avanzar de a poco con las siguientes mejoras. La dificultad actual queda aprobada por Crow y se mantiene por ahora.

## Primero: darle nuestro toque

- [x] **Reunir todos los diálogos en un solo lugar.** [Guía de textos y variantes](dialogues.md), con el [JSON editable](../src/game/es.json). Los diálogos revisados por Crow ya están incorporados al juego.
- [x] **Incorporar los diálogos escritos por Crow.** Conservar sus chistes y forma de hablar; los criterios para próximos textos están en el catálogo.
- [ ] **Escribir la carta final.** Crow la hará después.
- [x] **UI más mínima y con etiquetas claras.** Objetivo corto, tres dibujos de comida con estado e iconos en los controles e interacciones. Conserva nombres accesibles, tooltips y áreas cómodas para tocar. Saltar intro y el reintento de carga mantienen texto visible.
- [x] **Sentarse en las bancas.** E o un tap desde cerca para sentarse. Moverse, saltar, E o Levantarse para continuar. Las bancas usan el dibujo actual de Chofis, con el mundo activo y la misma altura de salto.
- [x] **Personajes con más vida.** Krypto mira hacia Chofis; al interactuar, Pibble se balancea, Krypto inclina la cabeza, Supergirl hace un gesto leve y Marin y Crow saludan con sus poses actuales. Gestos breves, sin deformar sprites ni rebotes constantes. Con movimiento reducido se omiten las inclinaciones. Los parpadeos quedan para cuando haya nuevos frames.

## Después: contar la llegada

- [x] **Pantalla de inicio.** Jugar y aviso para activar el sonido manualmente; el mundo permanece pausado hasta empezar.
- [x] **Inicio con narrativa.** Intro breve con descenso hasta Chofis, texto editable y opción de saltar. Las partidas guardadas entran directamente; movimiento reducido muestra el texto estático.
- [x] **Final con narrativa.** Entrada con los tres objetos, caminata automática hacia Crow, poses felices, corazones y carta. La carta termina con Salir, que apaga el sonido, borra el progreso actual y vuelve al inicio. Una partida completada que se recarga antes de salir conserva la carta. El texto de la carta sigue pendiente.
- [x] **Mejor transición del contador al juego.** Fundido entre la flor y el cielo de la fonda, carga desde la llegada y cámara adaptada a móvil y movimiento reducido.
- [ ] **Más assets de Nano Banana.** Priorizar poses para sentarse, parpadear y reaccionar, y elementos concretos que pidan las escenas nuevas. Hacer una lista corta con referencias antes de generar.

## Herramientas para seguir construyendo

- [x] **Editor mínimo de niveles.** Seleccionar y mover elementos, ajustar posición/tamaño, importar/exportar JSON y probar desde la selección. Escritorio, sin cuentas ni servidor. Por indicación de Crow se descartaron biblioteca, historial y paneles adicionales.
- [x] **Rediseñar el mapa con las indicaciones de Crow.** Isla inicial aislada, plaza con Crow protegido en el centro y tres rutas libres: empanada al oeste, completo al este y terremoto arriba. 68 plataformas, bajadas de regreso, bancas y más decoración con los assets existentes. Sin instrucciones secuenciales. El mapa está en `src/game/map.json`; [guía del recorrido](map.md).
- [x] **Ambientación del mapa nuevo.** Picnic junto a Crow y puestos de empanadas, completos y terremotos con los cuatro dibujos v4. Cielo más claro, escenario con más color y controles a juego. Colocación revisada con el chequeo de siluetas y encuadres de desktop y móvil.

## Antes de la sorpresa

- [ ] Probar una partida completa en el celular de Crow: controles, lectura, sonido y duración, conservando la dificultad actual.
- [ ] Reemplazar la carta provisional y revisar las frases de la pareja.
- [x] Incluir Piano 3 en el deploy por indicación de Crow y conservar [el respaldo de itch.io y la licencia del pack](licenses/alkakrab-piano.md).
- [ ] Comprobar la transición a las 06:55 con la vista de prueba y confirmar que la URL normal siga usando la hora real.

Prueba publicada: [abrir el juego anticipadamente](https://dawn.crowrojas.dev/?t=2026-09-18T09:55:00Z). Usa un guardado separado de la sorpresa con hora real.
