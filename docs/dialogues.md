# Textos de la fonda

El archivo editable es [src/game/es.json](../src/game/es.json). Contiene los textos actuales del juego, incluidas las frases de Crow y la carta provisional. Este documento explica cómo editarlo; no mantiene una segunda copia de los diálogos.

## Cómo cambiar un texto

1. Abre `src/game/es.json` y busca la sección correspondiente.
2. Cambia el valor entre comillas, conservando el nombre de la clave y las comas del JSON.
3. Guarda y recarga la vista previa. No se pierde el progreso por cambiar textos.
4. Para publicar, haz commit y push a `main`; GitHub Pages construye la nueva versión.

No hace falta editar TypeScript ni instalar una librería de i18n. El archivo se importa durante el build; cambiar una copia local no modifica por sí solo la web publicada.

| Sección | Qué puedes cambiar |
| --- | --- |
| `dialogos` | Frases de Marin, Pibble, Supergirl, Krypto y Crow, con variantes según comida recogida. |
| `personajes` | Nombres visibles y quién aparece hablando. Las claves identifican personajes y no se renombran. |
| `comida` | Etiquetas de los objetos y sus nombres en la lista que pide Crow. |
| `interfaz` | Título, objetivo, descripciones del progreso, sonido, controles, interacción y textos del final. |
| `objetivos` | Siguiente instrucción para cada objeto y para llegar a Crow. |
| `zonas` | Nombres de las cuatro zonas del mapa; la UI compacta no los muestra. |
| `recogida` | Reacciones de Chofis al recoger comida. |
| `caidas` | Avisos de checkpoint y conservación de comida. |
| `intro` | Frase de llegada, botones Saltar intro/Jugar e indicación de hablar con Marin. |
| `bancas` | Botones para sentarse y levantarse, y la indicación para volver a moverse. |
| `carteles` | Textos de los letreros del mundo. |
| `galeria` | Título, botón y descripciones accesibles de los dibujos. |
| `carta` | `titulo`, `texto`, botón `volver` y corazón entre los personajes. El cuerpo sigue provisional. |
| `final` | Cartel de entrada cerrado/abierto y nombre accesible del sobre para releer la carta. |
| `carga` | Mensaje y botón para reintentar si falla el arranque del juego. |

Las etiquetas no cambian las teclas, nombres de assets, posiciones del mapa, reglas de conversación ni claves del guardado. La portada del contador conserva sus textos en sus archivos actuales; este JSON reúne los textos del juego.

## Variables y saltos de línea

Conserva estos campos entre llaves. Puedes moverlos dentro de la frase:

| Campo del JSON | Variables |
| --- | --- |
| `dialogos.Crow.faltaUno`, `dialogos.Crow.faltanVarios` | `{comida}` contiene solo lo pendiente, con la lista unida en español. |
| `interfaz.objetivo` | `{instruccion}` y `{direccion}`. La dirección queda vacía si el destino está adelante. |
| `interfaz.progreso.estado` | `{comida}` y `{estado}`. Describe cada dibujo como pendiente o recogido. |
| `interfaz.subtitulo` | `{personaje}` y `{texto}`. |
| `interfaz.interaccion.conPersonaje` | `{personaje}`. |

JSON usa `\n` para un salto de línea y `\"` para escribir comillas dentro de una frase. Por ejemplo, un valor válido para `carta.texto` sería:

```json
"Primera línea\n\nSegunda línea con \"comillas\""
```

Los textos se muestran literalmente: `<3`, comillas y emojis funcionan. No admiten HTML ni Markdown. Conviene mantener cortos los botones y los carteles.

El objetivo muestra solo la siguiente instrucción. Los tres dibujos de comida indican el progreso: al recoger uno recupera su color y aparece una marca. Sus descripciones y tooltips usan `interfaz.progreso`. El altavoz conserva las etiquetas de `interfaz.sonido` para lectores de pantalla y el tooltip de su estado.

Los botones usan iconos SVG. Sus nombres siguen en este JSON y se muestran al pasar el cursor o mediante un lector de pantalla. Solo Saltar intro y el reintento de carga conservan texto visible para aclarar su acción. La pista de E aparece en escritorio; en móvil basta tocar. Las direcciones usan `moverIzquierda` y `moverDerecha`; las abreviaturas `izquierda` y `derecha` se conservan, aunque ya no se muestran.

## Cuándo aparece cada variante

Marin, Pibble y Supergirl cambian de respuesta según el objeto correspondiente. Al acercarse a la entrada final sin toda la comida, el objetivo usa `dialogos.Crow.faltaUno` o `faltanVarios` con lo pendiente. `dialogos.Crow.completo` conserva la frase escrita por Crow, aunque la cinemática abre la carta y no muestra ese diálogo. El HUD queda oculto al comenzar el encuentro.

Con los tres objetos, cruzar la entrada final activa la caminata y el encuentro sin tocar a Crow. Después aparece `carta.titulo` y `carta.texto`. Cerrar la carta deja a ambos juntos y un sobre con la etiqueta `final.releer`; no se vuelve al recorrido. El final guardado conserva esta pantalla al recargar.

Las bancas ofrecen `bancas.sentarse` cuando Chofis está cerca y en el suelo. Sentada, el botón cambia a `bancas.levantarse` y aparece `bancas.ayuda` durante tres segundos. También puede levantarse al moverse o saltar; la cámara conserva el encuadre normal.

La primera llegada muestra `intro.texto` al terminar el descenso de cámara. Al finalizar o saltar, `intro.ayuda` indica que se puede hablar con Marin. Las partidas guardadas no repiten esta presentación. Con movimiento reducido, el texto aparece directamente y `intro.jugar` permite continuar sin un tiempo de lectura obligatorio.

La galería abre al interactuar con "Tus dibujos". Los avisos de caída aparecen una vez por sesión cuando corresponden. Recargar reinicia esos avisos, pero conserva comida y checkpoint.

## Criterios para los próximos textos

Los diálogos de `src/game/es.json` son la referencia para escribir más. Leerlos antes de usar la skill humanizer y conservar las expresiones elegidas por Crow.

- Mezclar cariño con bromas de chat: "mi princesa", "yei", "omgg", "carnal", "AJSD" y "te amooooo". Usarlas cuando encajen, sin repetirlas en cada frase.
- Conservar mayúsculas, repeticiones, emoticones y emojis que escribió Crow. No corregirlos para que suenen formales ni agregar emojis como decoración automática.
- Mantener los chistes de Pibble Martillo e iTownGamePlays en sus conversaciones. Las bromas nuevas y los recuerdos de pareja necesitan contexto de Crow.
- Escribir instrucciones cortas y concretas. Krypto puede ladrar y explicar entre paréntesis; Crow habla con cariño directo.
- Evitar guiones largos, puntos medios, viñetas decorativas y flechas de texto en controles, carteles y contador. Usar palabras, espacios y puntuación corriente. Los iconos SVG funcionales de dirección, salto y continuar están aprobados; no son adornos tipográficos.
- Los cambios de texto conservan el mapa y la dificultad actual. El cuerpo de la carta queda pendiente de Crow.

## Comprobación

```sh
corepack pnpm@9 test
corepack pnpm@9 build
```

Las pruebas revisan las variables de las plantillas, los caracteres excluidos de la interfaz y la elección de respuestas según el progreso. No exigen que las frases coincidan con una copia en Markdown. Con Vite abierto, `corepack pnpm@9 test:browser` comprueba también etiquetas, carta, conversaciones y recorrido en una sesión silenciada que se cierra al terminar.
