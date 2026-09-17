# Mapa de la fonda

`src/game/map.json` conserva todas las posiciones. La distribución tiene una isla de llegada separada, plaza central y tres rutas que se pueden elegir libremente.

| Recorrido | Plataformas | Regreso |
| --- | --- | --- |
| Llegada | `arrival-*`, hasta `plaza-0` | La intro comienza lejos de Marin. |
| Empanada, oeste | `empanada-*`; Marin y un desvío a `drawings-*` | `empanada-return-*`, bajada a la plaza. |
| Completo, este | `completo-*`; Pibble, islas móviles y descansos | `completo-return-*`, bajada a la plaza. |
| Terremoto, arriba | `terremoto-*`; Supergirl, Krypto y plataformas frágiles | `terremoto-return-*`, enlazando la bajada del completo. |
| Crow | `crow-0` inicia la subida; `crow-1` es su isla elevada, con dos puertas | El acceso se abre con las tres comidas y activa el final. |

La ruta superior comparte unas terrazas con el regreso de la empanada. Las bajadas aprovechan desniveles mayores que el salto; no necesitan teletransporte ni mecanismos nuevos. Hay checkpoints en los descansos. La velocidad, altura de salto y tiempos de las plataformas se conservan.

## Colocación

Primero dejar espacio para saltos, aterrizajes y personajes. Después colocar decoración. Las ramadas se dibujan seis píxeles dentro del piso. Las bancas miden 84 píxeles de alto y se dibujan diez píxeles dentro del piso; la pose sentada se ajusta a esa altura. Ambas conservan su posición lógica. La isla de Crow usa la proporción natural del PNG y las dos puertas apoyan dentro de sus bordes. Los faroles cuelgan de vigas y los copihues caen desde el borde de las islas. Los volantines ocupan cielo libre. Hay 16 copihues y 10 volantines colocados a mano. No se agregan banderas ni macetas automáticamente.

Las variantes de ramada incluyen su comida y tela en la misma imagen. Empanadas viste la ruta de Marin; completos queda junto a Pibble, debajo de la terraza de regreso; terremotos aparece arriba y en su bajada. El picnic de Crow es decoración de fondo, apoyada a su derecha y separada de las dos poses posibles del encuentro y de la puerta. No añade colisiones. El chequeo reserva ese espacio y mantiene despejado el centro.

```sh
uv run scripts/check-map-layout.py
corepack pnpm@9 test:browser
```

La primera comprobación mide el alfa de las imágenes y detecta conflictos visuales, considerando el recorrido de las plataformas móviles, los gestos de los personajes y el balanceo de los volantines. La segunda prueba las conexiones con la física de Phaser. Revisar también encuadres al zoom real: estas comprobaciones no sustituyen una partida humana para evaluar ritmo y legibilidad.
