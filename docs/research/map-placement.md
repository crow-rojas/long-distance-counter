# Colocación manual del mapa: Phaser 3.90

Consulta web: 2026-09-17. Todas las URLs citadas respondieron HTTP 200; documentación Phaser versionada y código oficial fijado a `v3.90.0`. Las recomendaciones se contrastaron con el mapa local; la aplicación concreta se describe al final.

## Evidencia: cuatro límites diferentes

**Geometría.** [`getBounds()`](https://docs.phaser.io/api-documentation/3.90.0/namespace/gameobjects-components-getbounds) devuelve un rectángulo alineado con los ejes. Su [implementación](https://raw.githubusercontent.com/phaserjs/phaser/v3.90.0/src/gameobjects/components/GetBounds.js) transforma cuatro esquinas considerando tamaño mostrado, origen, rotación y contenedores padres. No examina transparencia: dos rectángulos intersectados son candidatos a revisión, no prueba de solapamiento visible.

**Origen.** [`setOrigin()`](https://docs.phaser.io/api-documentation/3.90.0/namespace/gameobjects-components-origin) relaciona posición y tamaño: `(0.5,1)` sitúa el punto inferior central del marco en `(x,y)`. No garantiza que allí terminen las patas del banco; puede haber margen transparente.

**Colisión.** El [`Body` de Arcade](https://docs.phaser.io/api-documentation/3.90.0/class/physics-arcade-body) tiene dimensiones y desplazamiento propios: `setSize()` y `setOffset()` reciben píxeles fuente, afectados después por escala. `setSize()` centra por defecto; `setOffset()` se refleja en posición durante el siguiente `preUpdate`. `syncBounds` vale `false`: conservar la separación deliberada entre arte y colisión.

**Render y silueta.** El [renderizador WebGL 3.90](https://raw.githubusercontent.com/phaserjs/phaser/v3.90.0/src/renderer/webgl/pipelines/MultiPipeline.js) utiliza desplazamientos del frame, recorte, escala y cámara. Su cuadrilátero tampoco equivale al contorno opaco. Para inspección visual, medir una vez por asset/frame el rectángulo alfa y los puntos reales de apoyo; sombras suaves o resplandores necesitan criterio artístico. Comparar geometrías en coordenadas de mundo, sin mezclar píxeles de pantalla.

## Qué tomar de Tiled y LDtk

[Tiled Object Alignment](https://doc.mapeditor.org/en/stable/manual/objects/) declara el anclaje de objetos tile por tileset; `Unspecified` significa abajo-izquierda salvo mapas isométricos, donde es abajo-centro. Lección aplicable: documentar el significado de `(x,y)` por clase de asset, evitando offsets improvisados por instancia.

[Automapping](https://doc.mapeditor.org/en/stable/manual/automapping/) reconoce patrones de entrada y coloca salidas. [LDtk Auto layers](https://ldtk.io/docs/general/auto-layers/) deriva decoración desde IntGrid; sus [reglas](https://ldtk.io/docs/general/auto-layers/auto-layer-rules/) ejemplifican «suelo aquí y vacío encima → borde superior». Estos mecanismos automatizan correspondencias locales; no demuestran que una ruta sea alcanzable o tenga buen ritmo. Adoptar condiciones de validación equivalentes sobre el JSON existente, sin instalar editores ni generar el recorrido.

## Recomendaciones concretas

1. **Conservar la superficie lógica.** En `game.ts`, cada plataforma tiene un cuerpo invisible de altura 28 y arte separado, cuyo origen usa la fila fuente 112 como borde caminable. Validar apoyos contra `platform.y` y su intervalo horizontal, no contra el fondo de la isla ni los bounds del contenedor, que incluye adornos.

2. **Anclar por contacto.** Guardar para bancos una línea de patas y para faroles el punto de suspensión. Sin rotación, resolver `y = platform.y - (supportY - originY * frameHeight) * scaleY`; transformar el punto completo cuando exista rotación. Comprobar ambas patas dentro de la superficie útil, con margen ajustado al asset. No alterar el `bench.y` lógico que consume `canSit()` para compensar transparencia: corregir el origen visual. Faroles deben tocar una cuerda, viga o soporte visible; si falta, recolocar o retirar.

3. **Hacer explícito el soporte.** Una referencia `supportId` y un offset bastan donde deba persistir la relación al mover plataformas; el editor actual mueve entidades independientemente. Si un adorno acompaña una plataforma móvil, actualizarlo con ella. Permitir excepciones declaradas para volantines y decoración aérea.

4. **Detectar, luego juzgar.** Reutilizar el editor para mostrar cuerpo, bounds y contactos con colores distintos. Advertir por ausencia de soporte, patas fuera del borde e intersecciones candidatas; revisar siluetas antes de rechazarlas. `depth` cambia el orden de dibujo, no elimina una superposición. Revisar también las macetas agregadas automáticamente a checkpoints.

5. **Diseñar tres secuencias.** Empanada: aprendizaje y descansos; completo: movimiento y espera; terremoto: ascenso con frágiles y recuperación. Reservar despegues, aterrizajes, personajes y recompensa antes de decorar. Comprobar ida y regreso con la física real, incluidas fases móviles; capturar cada tramo al zoom jugable. Añadir una comprobación pequeña de apoyos al test existente; la intención y legibilidad requieren recorrido humano.

## Aplicado al mapa

Se mantiene el JSON escrito a mano. `uv run scripts/check-map-layout.py` mide el alfa de los PNG, comprueba apoyos completos, la zona reservada de Crow y el recorrido completo de las plataformas móviles. Revisa por separado los faroles sujetos a vigas y los copihues colgantes. Las macetas automáticas de checkpoint se retiraron para evitar duplicados.

La colocación conserva coordenadas explícitas; no se añadió `supportId` ni generación procedural. Al mover una plataforma en el editor, esta comprobación detecta adornos que hayan perdido su apoyo. Los saltos se prueban con Phaser, y la revisión visual usa encuadres de las distintas zonas a resolución de escritorio.
