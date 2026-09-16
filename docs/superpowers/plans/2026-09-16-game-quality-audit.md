# Plan de implementación de la auditoría de la fonda

> Ejecución: agente principal y tres trabajadores con archivos separados. Usar el spec como contrato; conservar las simplificaciones existentes que ya funcionan.

**Objetivo:** aplicar los hallazgos comprobados de textos, nitidez, ciclo de vida y mantenimiento.

**Arquitectura:** la escena continúa en Phaser y la portada en Three.js. Se añade únicamente un módulo de diálogos y un runner de pruebas con Node.

**Stack:** Phaser 3.90, Three 0.170, TypeScript 5.6, Node 22, pnpm 9.15.9; Vite/Vitest con correcciones de seguridad.

**Spec:** [auditoría de la fonda](../specs/2026-09-16-game-quality-audit.md).

## Restricciones

Conservar fecha de llegada, mapa, física, assets, paleta, carta provisional y respaldo de licencia. No nuevas dependencias de runtime ni framework de pruebas de navegador. Todas las sesiones de navegador usan audio silenciado y cierre con plazo.

## 1. Portada y render de fondo

Responsable: trabajador Phaser. Archivos: `src/main.ts`, `src/scene/`, pruebas de arranque que no escriban `tests/platformer.browser.js`.

- [x] Probar fallo de creación de WebGL2 y liberación después de la entrada.
- [x] Sustituir la comprobación permisiva por `try { startScene(...) } catch { /* fondo CSS */ }`.
- [x] Al completar el fundido, llamar `sceneHandle?.stop()`, `pointer.dispose()` y cancelar el RAF del contador. No reanudar tras `visibilitychange`.
- [x] Actualizar DPR de la portada mientras siga activa, incluidos sus uniformes de partículas.
- [x] Eliminar shaders muertos solo tras confirmar que no tienen imports.

## 2. Textos y superficie táctil

Responsable: trabajador editorial. Archivos: `src/game/dialogue.ts`, `src/game/level.ts`, `src/game/game.css`, `tests/dialogue.test.ts`, `docs/dialogues.md`.

- [x] Crear respuestas por personaje y estado con `replyFor(name, stamps)`, usando los nombres de `FRIENDS` y `Set<Stamp>`.
- [x] Probar que Crow solo enumera comida pendiente y que las respuestas de objeto recogido no repiten el objetivo.
- [x] Mover las frases estáticas del mapa al módulo de diálogo. Conservar la carta literal en su lugar.
- [x] Aumentar a 44 px los controles táctiles indicados.
- [x] Documentar textos y variantes para edición de Crow.

## 3. Tooling y cuenta regresiva

Responsable: trabajador de calidad. Archivos: configuración, lockfile, CI, `src/countdown/compute.ts`, sus pruebas y `scripts/test-browser.mjs`.

- [x] Añadir runner con sesión única, audio silenciado, límite de tiempo y cierre en `finally`/señales.
- [x] Exportar `isPreview` desde la interpretación actual de `t`. Probar valores ausentes, vacíos, inválidos y válidos; eliminar `progress`.
- [x] Mantener la comprobación real de `America/Santiago` con `Intl.DateTimeFormat`.
- [x] Actualizar Node/pnpm y las herramientas afectadas; ejecutar instalación congelada, pruebas, build y audit.
- [x] Quitar configuración sin efecto y duplicados comprobados.

## 4. Integración y nitidez

Responsable: principal. Archivos: `src/game/game.ts`, `tests/platformer.browser.js`, scripts de assets y documentación restante.

- [x] Reproducir cambio DPR sin recarga; comprobar `canvas.width / cssWidth`.
- [x] Cambiar a densidad mutable, comprobarla en `PRE_UPDATE` (tras verificar eventos omitidos en Chromium) y refrescar `scale.setZoom(1 / density)`, canvas y textos, incluidos los de containers.
- [x] Mover sincronización de plataformas a `POST_UPDATE` y proyección HTML a `RENDER`.
- [x] Integrar `replyFor` e `isPreview`, hacer explícito el destino del contador de comida y limitar mensajes de caída.
- [x] Recortar carteles y variar accesorios sin alterar posiciones caminables.
- [x] Prevalidar entradas de los scripts y documentar regeneración en scratch antes de copiar.
- [x] Adaptar el test al orden de eventos de Phaser. Verificar sincronización a 30/60/120 Hz.

## 5. Cierre

- [x] Ejecutar pruebas y build; revisar diffs de trabajadores.
- [x] Comprobar escritorio 1×/2×, móvil 3×, cambio de densidad y conversación durante redimensionamiento.
- [x] Verificar runner con éxito, error y timeout; cerrar las sesiones propias.
- [x] Registrar resultados y limitaciones en el spec; publicar el checkpoint por el flujo directo del repo.

Implementación: `b36449c`. [Build y deploy correctos](https://github.com/crow-rojas/long-distance-counter/actions/runs/35135685892).
