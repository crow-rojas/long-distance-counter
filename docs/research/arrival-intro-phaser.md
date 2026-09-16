# Intro de llegada: evidencia primaria para Phaser 3.90

Implementada el 16 de septiembre de 2026. La escena usa su delta para el descenso y la lectura, con `setScroll` y easing de Phaser, en vez de coordinar efectos y timers independientes. El encuadre se recalcula al cambiar tamaño o DPR. Comprobados el final natural, salto, guardados, movimiento reducido, fallo de cielo, reintento de imagen y entrada desde los últimos cinco segundos del contador. Revisadas capturas de escritorio DPR2, móvil emulado DPR3 y viewport horizontal; queda la prueba personal en el celular físico.

Consulta: 2026-09-16. Alcance: fundido del contador, descenso de cámara hasta Chofis, texto y entrega de controles; unos ocho segundos, con opción de saltar.
Método de la investigación previa: páginas oficiales consultadas por HTTP, código instalado `node_modules/phaser` (`package.json`: **3.90.0**) y revisión del arranque de dawn. Esta investigación no evalúa conformidad.
**E** = evidencia verificable; **R** = recomendación para este concepto, pendiente del diseño local. Las páginas Phaser pueden evolucionar; para detalles de versión prevalece el código 3.90.

## Cámara: pan, zoom, follow y bounds

- **E:** `camera.pan(x, y, duration=1000, ease='Linear', force=false, callback, context)` recibe el **centro destino en coordenadas de mundo**, no `scrollX/Y` ni píxeles CSS. Devuelve la cámara; `callback(camera, progress, scrollX, scrollY)` corre cada frame, no solo al terminar. [P1 a P3]
- **E:** `camera.zoomTo(zoom, duration=1000, ease='Linear', force=false, callback, context)` recibe zoom absoluto; su callback real es `(camera, progress, zoom)`. El JSDoc de `Camera#zoomTo` copia erróneamente la firma de pan: `Effects/Zoom.js` confirma los tres argumentos. [P2,P4]
- **E:** Cada efecto tiene una sola ejecución; otra llamada al mismo efecto se ignora mientras corre si `force=false`. Pan y zoom son efectos distintos y pueden coexistir. Finales: `Phaser.Cameras.Scene2D.Events.PAN_COMPLETE` (`'camerapancomplete'`) y `ZOOM_COMPLETE` (`'camerazoomcomplete'`). [P3,P4]
- **R:** Para un descenso breve, usar `pan` y, solo si el encuadre lo requiere, `zoomTo`; easing válido: `'Sine.easeInOut'`. Encadenar etapas con `camera.once(...PAN_COMPLETE, handler)` / `...ZOOM_COMPLETE`; si ambos corren, esperar los finales necesarios. No usar el callback por frame como completion. [P3,P4,P5]
- **E:** `camera.startFollow(target, roundPixels=false, lerpX=1, lerpY=lerpX, offsetX=0, offsetY=offsetX)` **reposiciona inmediatamente** scroll y midpoint, incluso con lerp bajo. Luego interpola por frame. Mientras `panEffect.isRunning`, `preRender()` suspende follow; al acabar, vuelve a aplicarlo. [P2]
- **R:** `camera.stopFollow()` durante la intro y restaurar follow al finalizar; terminar en el encuadre del target y sus offsets/bounds para evitar el salto inicial. Lerp no garantiza una duración de llegada. [P2]
- **E:** `camera.setBounds(x,y,width,height,centerOn=false)` limita scroll y lo ajusta ya en esa llamada; no limita cuerpos ni objetos. `camera.useBounds=false` desactiva temporalmente el límite; `removeBounds()` lo elimina. [P6]
- **E:** `clampX/Y` considera `displayWidth/Height` (viewport dividido por zoom). Si el mundo es menor que el área visible, el desplazamiento queda restringido y los bounds no crean fondo adicional. Pan recalcula `getScroll()` durante el recorrido. [P3,P6]
- **R:** Verificar que inicio y destino quepan con el zoom y viewport actuales; un objetivo fuera de bounds será recortado. Si hace falta mostrar cielo fuera del mundo, ajustar/desactivar bounds solo para esa toma y restaurarlos al finalizar. No derivar coordenadas de cámara de píxeles CSS. [P3,P6]
- **E:** `roundPixels=true` no garantiza ausencia de jitter con zoom fraccionario; `Camera.preRender()` condiciona `renderRoundPixels` a zooms enteros. **R:** evitar prometer nitidez perfecta durante zoom continuo en pixel art. [P2]

## Tiempo, pausa y visibilidad

- **E:** `scene.time.delayedCall(delay, callback, args, callbackScope)` crea un `TimerEvent`; `scene.time.paused=true` congela sus eventos, y `scene.time.timeScale` escala sus deltas. No pausa por sí mismo los tweens ni los efectos de cámara. [P7,P2]
- **E:** Cámara suma el delta recibido en `update(time,delta)`; Clock usa el delta del juego. En cambio, `TweenManager.getDelta()` calcula con `Date.now()`: por defecto `maxLag=500` ms y `lagSkip=33` ms; una ausencia mayor se comprime a 33 ms. No son un reloj único sincronizado. [P3,P4,P7,P8]
- **E:** `tween.pause()/resume()` afecta ese tween; `scene.tweens.pauseAll()/resumeAll()` pausa el manager. En 3.90 estos últimos solo cambian `paused`; no rebasan `prevTime`. Al volver puede entrar tiempo transcurrido o el ajuste de lag. [P8,P9]
- **E:** `visibilitychange`/`document.hidden` distingue ocultamiento; `blur` no implica página oculta. Los navegadores suelen suspender `requestAnimationFrame` y limitar timers en segundo plano; `setTimeout(8000)` no garantiza ocho segundos visibles. [W1]
- **E:** Phaser conecta hidden con `Game.onHidden()` , `loop.pause()` , evento `Phaser.Core.Events.PAUSE`; visible con `onVisible()` , `loop.resume()` , `RESUME`. **Límite:** `TimeStep.pause()` solo registra un timestamp; no equivale a `game.pause()` (que sí establece `isPaused`). `resume()` reajusta delta. No inferir una pausa total solo del nombre del evento. [P10,P11]
- **R:** Tratar ~8 s como presupuesto visual nominal: finales de efectos/tweens para transiciones y `delayedCall` para permanencia del texto. No liberar controles con un timeout de pared paralelo al movimiento. [P3,P4,P7,P8,W1]
- **R:** Para esta intro corta, una política sencilla ante volver de segundo plano es finalizar en el estado jugable mediante la misma salida de “Saltar”. Si se elige reanudar, comprobar cámara/timers/tweens por separado; no asumir que `Clock.paused` los congela juntos. [P7 a P11]

## Audio: unlock y autoplay

- **E:** MDN documenta bloqueo de autoplay también para Web Audio. Interacción previa y políticas del navegador influyen; no existe garantía universal de reproducción. `HTMLMediaElement.play()` devuelve una Promise que puede rechazar con `NotAllowedError`; esa API no es `Phaser.Sound.*.play()`. [W2]
- **E:** `WebAudioSoundManager` detecta inicialmente `context.state === 'suspended'`. `sound.unlock()` registra gestos en `document.body` (`touchstart/end`, `mousedown/up`, `keydown`) y llama `AudioContext.resume()`. Tras resolución, el siguiente update emite `Phaser.Sound.Events.UNLOCKED` y deja `sound.locked=false`. No es desbloqueo síncrono. [P12,P13]
- **E:** `sound.pauseOnBlur` vale `true` por defecto; Web Audio usa `context.suspend()` al perder foco y `resume()` al recuperarlo si está suspendido/interrumpido y no locked. El audio no pertenece al Clock de la escena. [P12,P13]
- **E:** WebKit explica la relación directa gesto , reproducción y recomienda detectar rechazo de `play()`. Sus artículos citados describen iOS 10/Safari 11: evidencia histórica del motor, **no** matriz actual de compatibilidad. Las excepciones de `<video muted playsinline>` no demuestran desbloqueo de Web Audio. [W3,W4]
- **R:** Intro completa y saltable sin audio; nunca esperar `UNLOCKED` para avanzar o habilitar controles. Reutilizar la política de mute/unlock existente, sin nuevo listener paralelo ni reproducción tardía de una señal cuya etapa ya terminó. [P12,P13,W2]

## Reduced motion y salto

- **E:** `window.matchMedia('(prefers-reduced-motion: reduce)').matches` permite consultar la preferencia desde JS; el `MediaQueryList` admite evento `'change'`. CSS por sí solo no modifica `camera.pan/zoomTo`: hay que decidir su ejecución en JS. [W5,W6]
- **R:** Consultar antes del primer movimiento; con `reduce`, omitir descenso/zoom y mostrar el encuadre final con texto estático y acceso a jugar. Si la preferencia cambia durante la intro, usar la misma salida de salto. Evitar sustituirlo por un pan más rápido. [W5 a W7]
- **E:** WCAG 2.3.3 (AAA) contempla desactivar animación no esencial iniciada por interacción. WCAG 2.2.2 (A) exige pausa/stop/hide para movimiento automático que dure **más de 5 s y se presente en paralelo con otro contenido**, salvo esencialidad. Ocho segundos por sí solos no demuestran incumplimiento. [W7,W8]
- **R:** “Saltar” disponible desde el inicio, con activación por toque y teclado; preferir botón HTML nativo con nombre accesible y foco visible. El texto necesario para jugar debe seguir disponible tras saltar; el encuadre puede ser ornamental. [W9]
- **E:** `camera.panEffect.reset()` y `camera.zoomEffect.reset()` cancelan sin emitir completion. **`camera.resetFX()` omite `zoomEffect` en 3.90**. `tween.stop()` emite `onStop`, no `onComplete`; `timer.remove(false)` programa eliminación sin callback. [P2 a P4,P9,P14]
- **R:** Una única salida idempotente para final natural/salto/reduced motion: cancelar únicamente efectos/tweens/timers propios, retirar sus listeners `once` aún pendientes y fijar explícitamente encuadre, texto y controles finales. Cancelar no coloca automáticamente los valores destino. Repetir la limpieza al salir de la escena; sin sistema de cinemáticas. [P2 a P4,P9,P14]

## Fuentes primarias

Páginas web consultadas; los enlaces de código fijan `v3.90.0` y corresponden a archivos inspeccionados en `node_modules/phaser/src`.

- **P1:** [Phaser Camera API](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera).
- **P2:** [Camera.js: pan/zoomTo/preRender/startFollow/resetFX/update](https://github.com/phaserjs/phaser/blob/v3.90.0/src/cameras/2d/Camera.js).
- **P3:** [Effects/Pan.js: start/update/reset](https://github.com/phaserjs/phaser/blob/v3.90.0/src/cameras/2d/effects/Pan.js).
- **P4:** [Effects/Zoom.js: start/update/reset](https://github.com/phaserjs/phaser/blob/v3.90.0/src/cameras/2d/effects/Zoom.js).
- **P5:** [EaseMap.js: nombres admitidos](https://github.com/phaserjs/phaser/blob/v3.90.0/src/math/easing/EaseMap.js).
- **P6:** [BaseCamera.js: getScroll/setBounds/clampX/clampY](https://github.com/phaserjs/phaser/blob/v3.90.0/src/cameras/2d/BaseCamera.js).
- **P7:** [Clock.js](https://github.com/phaserjs/phaser/blob/v3.90.0/src/time/Clock.js); [Phaser Time](https://docs.phaser.io/phaser/concepts/time).
- **P8:** [TweenManager.js: getDelta/pauseAll/resumeAll](https://github.com/phaserjs/phaser/blob/v3.90.0/src/tweens/TweenManager.js); [Phaser Tweens](https://docs.phaser.io/phaser/concepts/tweens).
- **P9:** [BaseTween.js: pause/resume/stop](https://github.com/phaserjs/phaser/blob/v3.90.0/src/tweens/tween/BaseTween.js).
- **P10:** [Game.js: onHidden/onVisible/pause](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/Game.js); [VisibilityHandler.js](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/VisibilityHandler.js).
- **P11:** [TimeStep.js: pause/resume/resetDelta](https://github.com/phaserjs/phaser/blob/v3.90.0/src/core/TimeStep.js).
- **P12:** [WebAudioSoundManager.js: unlock/onBlur/onFocus](https://github.com/phaserjs/phaser/blob/v3.90.0/src/sound/webaudio/WebAudioSoundManager.js).
- **P13:** [BaseSoundManager.js: locked/pauseOnBlur/update](https://github.com/phaserjs/phaser/blob/v3.90.0/src/sound/BaseSoundManager.js); [Phaser Audio](https://docs.phaser.io/phaser/concepts/audio).
- **P14:** [TimerEvent.js: remove](https://github.com/phaserjs/phaser/blob/v3.90.0/src/time/TimerEvent.js).
- **W1:** [MDN Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).
- **W2:** [MDN Autoplay guide: media y Web Audio](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay).
- **W3:** [WebKit: New video policies for iOS (2016)](https://webkit.org/blog/6784/new-video-policies-for-ios/).
- **W4:** [WebKit: Auto-play policy changes for macOS (2017)](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/).
- **W5:** [MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion).
- **W6:** [MDN Window.matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia).
- **W7:** [W3C Understanding WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).
- **W8:** [W3C Understanding WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).
- **W9:** [W3C Understanding WCAG 2.1.1: Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).

## Aplicación a dawn

Revisión del repositorio en `fb0f4e1`, el 16 de septiembre de 2026. Se conserva a continuación la propuesta previa a la implementación; los resultados están al inicio de este documento.

### Qué hay hoy

- `src/main.ts` espera 2200 ms después de la llegada antes de importar el juego. `startGame()` resuelve cuando termina `create()`, que también agrega `body.playing`. Entonces comienza el fundido CSS de 1800 ms, con controles y física ya activos.
- `src/ui/arrival.ts` oculta el contador y muestra el texto de llegada después de 800 ms. La espera de carga y la duración narrativa deben tratarse por separado: una conexión lenta no debe consumir la intro.
- `src/game/game.css` pone el cielo como fondo CSS opaco. No lo carga el Loader de Phaser. Preparar esa imagen antes del fundido evita descubrirla tarde; `HTMLImageElement.decode()` permite esperar la decodificación. Si falla, conservar un degradado y continuar. [MDN: decode](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode).
- `restoreCamera()` ya calcula el encuadre usando DPR, zoom y viewport. El listener de `resize` lo ejecuta salvo durante conversaciones: también tendrá que reconocer la intro.
- El bucle `POST_UPDATE` avanza las plataformas aunque pausemos Arcade Physics. La intro debe detener también ese reloj para que el recorrido empiece en su estado normal.
- Three ya se libera cuando termina el fundido. Mantener esa limpieza: no necesita seguir renderizando mientras Phaser baja la cámara.
- Ya existen el cielo, las islas lejanas, la primera fonda y las poses de Chofis. La plataforma inicial ocupa `x=0..640`, a `y=700`; Chofis aparece en `x=120` y Marin está en `x=430`. Hay suficiente escenario para presentar la entrada sin mostrar el final.

### Secuencia recomendada

Comenzar la carga al llegar a la hora, mientras desaparece el contador. Conservar la pantalla de llegada durante la descarga y el reintento actual si falla el arranque. Los tiempos siguientes comienzan cuando el juego puede mostrarse; son una propuesta de ritmo, pendiente de revisión visual.

| Tiempo aproximado | Lo que ve Chofis |
| --- | --- |
| 0 a 1,5 s | La flor y la portada se desvanecen sobre el cielo de la fonda. HUD y controles de movimiento ocultos. |
| 1,5 a 4 s | La cámara baja suavemente hacia la primera isla. Chofis mantiene sus proporciones normales y la postura de reposo. Marin y la entrada quedan como referencia del camino. |
| 4 a 7,5 s | Texto completo sobre el escenario, con sombra y sin caja: "Llegaste a Chile, pero este cuervo dónde se metió". |
| 7,5 a 8 s | Aparecen los controles y el objetivo existente de buscar la empanada. Una indicación breve puede señalar que Marin está cerca y se puede hablar con ella. |

Usar un recorrido vertical corto, ajustado al alto visible del mundo, y mantener el zoom de juego. El cielo CSS queda fijo; las islas lejanas ya tienen parallax. El encuadre debe llegar al mismo destino que usa `restoreCamera()`, respetando los límites del mapa, para que recuperar el seguimiento no produzca un salto.

Evitar desenfoque, zoom mediante CSS sobre el canvas, sacudidas, flashes y una cámara que recorra los 14.000 píxeles del nivel. No hace falta generar imágenes ni agregar librerías para esta versión. La frase y las etiquetas nuevas irían en `src/game/es.json`, siguiendo `docs/dialogues.md`; la carta y el encuentro final quedan para otro cambio.

### Controles, accesibilidad y guardado

- Mantener visibles y operables solamente Sonido y Saltar intro durante la animación. Saltar intro funciona con tap/clic, Enter sobre el botón y Escape. Los botones ocultos no deben quedar en el orden de tabulación: `opacity: 0` por sí solo conserva foco y eventos. [MDN: opacity](https://developer.mozilla.org/en-US/docs/Web/CSS/opacity).
- Una sola salida de la intro cancela cámara y timers pendientes, limpia teclas y punteros retenidos, restaura física, seguimiento y HUD y enfoca el canvas. Tanto el fin natural como saltar usan esa salida. Un clic no debe filtrarse hacia Marin o una banca.
- Bloquear también los caminos directos de interacción con sprites y el avance de plataformas. No pausar toda la Scene, porque también necesita animar la cámara.
- Con movimiento reducido, mostrar directamente el encuadre final y la frase estática con un botón Jugar. Así puede leer sin un recorrido de cámara ni una espera obligatoria.
- Usar una marca `:intro-seen` junto al guardado actual, escrita al terminar o saltar. Las partidas con progreso válido previo también entran directo a su checkpoint. Preview y juego real conservan sus claves separadas; Reiniciar prueba borra también esta marca. Si el navegador no permite guardar, el juego sigue funcionando.
- Si se oculta la pestaña durante la carga, esperar a que vuelva a estar visible antes de empezar la narrativa. Si se oculta durante la intro, al volver terminar el recorrido de cámara y mostrar la frase estática con Jugar, igual que con movimiento reducido. Así no dependemos de sincronizar cámara, CSS y timers mientras el navegador está suspendido. El fundido CSS puede terminar mientras la pestaña está oculta; la limpieza de Three debe tolerarlo.
- Al girar el teléfono o cambiar DPR, recalcular el encuadre correspondiente al progreso actual de la intro, conservando su fase. Mantener la resolución física y el zoom inverso existentes.
- La música sigue requiriendo el botón Sonido. Saltar o Jugar no activan audio por su cuenta.

### Alcance mínimo de implementación

Coordinar la carga y el fundido desde `main.ts`; conservar `startGame()` como señal de escena lista, no como promesa que espera ocho segundos. La intro vive en la Scene actual, con un estado activo, el movimiento de cámara y una salida compartida. CSS controla la visibilidad de la interfaz; `es.json` contiene los textos. Ajustar `arrival.ts` solo si hace falta coordinar su mensaje con la carga.

No crear un motor de cinemáticas, una Scene adicional ni un formato JSON para programar animaciones. Los tiempos y el recorrido son código pequeño de esta intro.

### Comprobación antes de publicar

1. Primera visita a la hora exacta, llegada con la página ya abierta y visita posterior a la llegada. Probar también carga lenta, fallo de imagen y fallo de chunk.
2. Saltar durante el fundido, la bajada y el texto. Confirmar que la salida se ejecuta una vez y que un timer tardío no recupera el control.
3. Teclas mantenidas, tap y multitouch durante la intro: Chofis no se mueve, no habla, no recoge objetos y no altera las plataformas. Después funcionan movimiento, salto, E y bancas.
4. Volver a una partida, guardado antiguo, JSON dañado, almacenamiento bloqueado y reinicio de preview. El recorrido y la comida se conservan.
5. Desktop DPR 1 y 2, móvil vertical y horizontal, rotación a mitad de intro y movimiento reducido. Capturar inicio, encuadre final y entrega de controles para revisar composición y nitidez.
6. Cambiar de pestaña durante carga, fundido y lectura. Three deja de dibujar al terminar el fundido y no vuelve a arrancar.
7. Reutilizar las pruebas de arranque y el recorrido existente. La prueba del mapa debe saltar la intro mediante su botón real antes de comprobar las 82 conexiones. Toda sesión de navegador va silenciada y se cierra al terminar.
