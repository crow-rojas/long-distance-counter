# Dawn — Countdown a 18-sep-2026 06:55 (Chile)

**Status:** Design approved · awaiting implementation plan
**Date:** 2026-05-14
**Domain:** `dawn.crowrojas.dev`
**Repo:** `long-distance-counter`

## Resumen ejecutivo

Sitio web one-screen, mobile-first, que muestra un countdown hasta el 18 de septiembre de 2026 a las 06:55 hora de Chile — el momento en que un vuelo llega de Ciudad de México a Santiago. El sitio es a la vez un regalo personal y una pieza técnica pública para portfolio.

El concepto se llama **Aubade** (poema o canción al amanecer). El visual es un fragment shader fullscreen que renderiza un cielo de amanecer (violeta profundo → magenta → rosa pálido) con niebla volumétrica fBm, partículas estelares, pétalos abstractos a la deriva, y un arco luminoso que sugiere la trayectoria CDMX→SCL. Sobre eso, tipografía editorial enorme muestra los números del countdown, con letterbox cinematográfico y film grain sutil.

Cuando el countdown cruza T-0, el sitio transiciona a un estado permanente con el copy `she's here.`.

## Decisiones (cerradas en brainstorm)

| Decisión | Valor |
|---|---|
| Fecha objetivo | 2026-09-18 06:55 hora Chile |
| Timezone target | Hora local Chile; verificar al implementar si está en CLT (-04:00) o CLST (-03:00) y hardcodear ISO UTC |
| Audiencia | Público (show off técnico) + ella como destinatario emocional |
| Concepto visual | Aubade — abstract shader, paleta amanecer, sin globo/avión literal |
| Alcance | One-screen, sin scroll |
| Contenido textual | Solo números + `CDMX → SCL · 18 · 09 · 26` + audio toggle |
| Post-llegada | Mensaje permanente `she's here.` reemplaza el countdown |
| Audio | Pad ambiente en loop, toggle visible, OFF por defecto |
| Stack | Vanilla TypeScript + Three.js + Vite + GLSL custom shaders |
| Hosting | GitHub Pages vía GitHub Actions |
| Dominio | `dawn.crowrojas.dev` (CNAME → `<user>.github.io`) |
| Analytics | Ninguno |

## Concepto visual

### Composición

- **Fondo**: gradiente de amanecer renderizado en fragment shader. Stops: `#0a0418` (cenit nocturno) → `#1f0830` → `#4a1f5c` (violeta profundo) → `#c44a8e` (magenta) → `#ff7eb6` (rosa) → `#ffb6c1` (rosa pálido del horizonte). El gradiente vive en el shader, no en CSS, para poder mezclarlo con ruido y partículas en el mismo pass.
- **Niebla volumétrica**: ruido fBm (3 octavas en mobile, 4 en desktop) con scroll lento en el tiempo. Tinta la paleta sin opacarla.
- **Partículas estelares**: puntos blancos finos en la mitad superior, brillo suave.
- **Pétalos abstractos**: formas borrosas alargadas con tonos rosa, drifteando en la mitad inferior con velocidad y rotación variables. No son flores reconocibles; la lectura es ambigua entre "polvo de estrellas" y "pétalos".
- **Arco luminoso**: una curva tenue cruzando el shader a ~28% de la altura, levemente rotada. Sugiere trayectoria sin mostrarla.
- **Film grain**: ruido temporal con blend overlay, opacidad ~12%.
- **Letterbox**: barras superior e inferior negras finas (≈32px en mobile, escala con altura).
- **Vignette**: oscurecimiento radial en bordes.

### Tipografía

- Familia: **Fraunces** (Variable, weight 300) self-hosted vía `@fontsource-variable/fraunces`.
- Jerarquía sobre el shader (centrado vertical):
  - `126` — `6rem` mobile / `9rem` desktop, weight 300, letter-spacing `-0.04em`, `tabular-nums`.
  - `14h · 22m · 03s` — `1rem`, letter-spacing `0.15em`, opacidad 0.85.
  - `CDMX → SCL · 18 · 09 · 26` — `0.65rem` uppercase, letter-spacing `0.35em`, opacidad 0.65, ubicado en el borde inferior (sobre el letterbox bottom).

### Interactividad

- Mouse (desktop) o `deviceorientation` (mobile): produce un `vec2` que va como uniform al shader y desplaza levemente el arco y la niebla.
- Audio toggle: botón circular minimal (♪) en esquina inferior derecha. Click abre/cierra el pad ambiente.
- No hay scroll, no hay clicks adicionales, no hay menú.

### Estado post-llegada

Cuando `arrived === true`:
- El countdown hace fade out (0.8s).
- El shader hace un flash sutil hacia los tonos cálidos del gradiente (uniform `arrival: 0 → 1` durante 1.2s).
- Aparece (fade in) `she's here.` en el mismo lugar donde estaba el countdown, misma familia, misma escala.
- El estado se queda así indefinidamente. Es derivado de `Date.now()`, no persistido — siempre se recalcula.

## Arquitectura

### Estructura de archivos

```
long-distance-counter/
├── index.html
├── public/
│   ├── audio/aubade.opus
│   ├── og.jpg
│   ├── favicon.svg
│   └── CNAME                  # contiene "dawn.crowrojas.dev"
├── src/
│   ├── main.ts                # bootstrap, RAF loop
│   ├── style.css
│   ├── countdown/
│   │   ├── target.ts          # constante ISO UTC del target
│   │   ├── compute.ts         # (now) → CountdownState
│   │   └── format.ts          # zero-pad
│   ├── scene/
│   │   ├── scene.ts           # renderer + ortho cam + fullscreen quad
│   │   ├── shader.ts          # ShaderMaterial + uniforms
│   │   ├── shaders/
│   │   │   ├── aubade.vert
│   │   │   └── aubade.frag
│   │   └── resize.ts
│   ├── audio/
│   │   └── player.ts
│   ├── ui/
│   │   ├── countdown.ts       # update DOM 1Hz
│   │   ├── arrival.ts         # transición a "she's here"
│   │   └── audio-toggle.ts
│   └── input/
│       └── pointer.ts         # mouse + deviceorientation → vec2
├── tests/
│   ├── compute.test.ts
│   └── target.test.ts
├── .github/workflows/deploy.yml
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Módulos e interfaces

**`countdown/target.ts`**
```ts
export const TARGET_UTC_ISO: string;  // p.ej. "2026-09-18T10:55:00Z" si Chile en -04
export const TARGET_LABEL: string;    // "CDMX → SCL · 18 · 09 · 26"
```

**`countdown/compute.ts`**
```ts
export type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
  progress: number;  // 0→1 desde un instante de "inicio" arbitrario al target
};
export function compute(now: Date): CountdownState;
```
Pure function. Sin side effects. Testeable en aislamiento.

**`scene/scene.ts`**
```ts
export type Uniforms = {
  time: number;
  pointer: [number, number];
  arrival: number;     // 0→1
  audioLevel: number;  // 0→1 (futuro)
};
export function startScene(canvas: HTMLCanvasElement, getUniforms: () => Uniforms): {
  stop: () => void;
};
```
No conoce countdown ni audio. Solo recibe uniforms.

**`audio/player.ts`**
```ts
export function createAudioPlayer(src: string): {
  toggle: () => Promise<boolean>;  // true si está sonando
  isPlaying: () => boolean;
};
```

**`ui/arrival.ts`**
```ts
export function onArrive(callback: () => void): void;
```
Se dispara una sola vez cuando `compute(now).arrived` cruza de false a true durante una sesión.

### Flujo de datos

RAF a 60Hz:
1. `state = compute(new Date())`
2. Si `state.seconds` cambió desde último frame → `ui/countdown.ts` actualiza DOM
3. Calcular `uniforms = { time: t, pointer: pointer.get(), arrival: state.arrived ? lerpedArrival : 0, audioLevel: 0 }`
4. Three.js renderiza el quad
5. Si `state.arrived` recién pasó a true → `arrival.onArrive` dispara fade del countdown e inicia lerp de `arrival` uniform

Si la pestaña pierde visibilidad (`document.hidden`), pausamos el RAF para no quemar batería.

### Performance budget

- Bundle JS gz: < 100kb
- First contentful paint: < 1.5s en 4G
- Target fps: 60 en iPhone 12+, degradación a 30 si el dispositivo lo pide
- Detección de GPU baja: si `MAX_FRAGMENT_UNIFORM_VECTORS < 256` o si medimos < 30fps en los primeros segundos, reducimos octavas de fBm de 3 a 2
- Bundle de fuentes: 1 weight (300), subset latin

### Fallbacks

- **Sin WebGL**: detectar al cargar; si no hay contexto, mostrar fallback CSS — gradiente estático del shader + tipografía. El countdown sigue funcionando, sin animación.
- **`prefers-reduced-motion`**: congelar `time` uniform, parar pétalos, dejar el shader como cuadro fijo. Countdown sigue actualizándose.
- **Offline**: como es SPA estática, una vez cargada funciona offline (servicemaker opcional, no obligatorio).

## Edge cases

### Timezone y DST Chile

Chile cambia a CLST (-03:00) en septiembre típicamente. La fecha y modo del cambio para 2026 debe verificarse al implementar contra el calendario oficial (Ministerio de Energía / IERS). El target se hardcodea como ISO UTC inmutable en `target.ts`, con un comentario explicando el supuesto. Si hay duda al momento de implementar, fallback a `-04:00` (CLT).

### Reloj del usuario mal configurado

Out of scope. Sin backend, no hay forma de corregirlo. Aceptado.

### Autoplay móvil

Audio OFF por defecto. El primer click sobre el botón ♪ es el user gesture necesario para iniciar `HTMLAudioElement.play()`. Si play rechaza, mostrar el botón en estado "intentar de nuevo" silenciosamente.

### Reduced motion

Respetar `@media (prefers-reduced-motion: reduce)`. Shader congelado, pétalos parados, countdown sigue.

### Safe areas iOS

`<meta name="viewport" content="..., viewport-fit=cover">` + `env(safe-area-inset-*)` en CSS para que el countdown no quede bajo el notch ni la home bar.

### OpenGraph

`public/og.jpg` 1200x630 — screenshot del hero, generado a mano la primera vez (no auto-generado en build, sería overkill).
- `og:title` = `dawn`
- `og:description` = `a countdown · cdmx → scl`
- `og:image` = `/og.jpg`

## Testing

### Automatizado (Vitest)

- `compute(now)` casos:
  - `now = target - 1ms` → `arrived: false`, segundos correctos
  - `now = target` → `arrived: true`, todos los componentes en 0
  - `now = target + 1d` → `arrived: true`
  - `now` con DST cross (chequeo de que el target en UTC se comporta consistente)
- `format()` zero-pad: `5 → "05"`, `10 → "10"`, `0 → "00"`
- `target.ts` sanity: parsing del ISO da el instante correcto

### Manual

- Real devices: iPhone (Safari), iPad (landscape y portrait), Android Chrome, desktop Chrome, desktop Safari.
- Chequeos:
  - 60fps en mobile (Web Inspector → Timelines)
  - Audio toggle funciona post-bloqueo de autoplay
  - Legibilidad del countdown sobre la paleta rosa más brillante
  - Letterbox no tapa el countdown en aspect ratios extremos
  - Reduced motion respetado
  - Safe areas respetadas (notch, home bar)
- Time travel manual: `?t=2026-09-18T06:54:59-04:00` en querystring fuerza `now` a ese valor para validar la transición de arrival sin esperar al día real.

## Deploy

### GitHub Pages via Actions

`.github/workflows/deploy.yml`:
1. Trigger: push a `main`
2. Setup pnpm + Node 20
3. `pnpm install --frozen-lockfile`
4. `pnpm test`
5. `pnpm build`
6. `actions/upload-pages-artifact@v3` con `dist/`
7. `actions/deploy-pages@v4`

Settings del repo: Pages → Source = "GitHub Actions". HTTPS enforce on.

### DNS

En el proveedor DNS de `crowrojas.dev`:
```
CNAME  dawn.crowrojas.dev  →  crow-rojas.github.io
```

Propagación 5–60 min. `public/CNAME` con contenido `dawn.crowrojas.dev` queda en el repo para que Pages no lo borre.

## Open items para implementación

Cosas no decididas en brainstorm que se resuelven al implementar (no bloquean el plan):

- **Asset de audio**: track ambiente ~30s loopable. Opciones: track royalty-free (Pixabay Music, Free Music Archive, Epidemic Sound CC) o uno generado a mano. Estética buscada: pad atmosférico tipo Nils Frahm / Ben Lukas Boysen / Brian Eno. Definir al implementar.
- **Calendario DST Chile 2026**: verificar contra fuente oficial (Ministerio de Energía Chile) el offset exacto el 18-sep-2026 06:55 hora local. Fallback documentado: CLT (-04:00).
- **Imagen OG**: screenshot manual del hero una vez que la escena esté pulida. Tarea post-launch.
- ~~**Username GitHub**~~: confirmado `crow-rojas` → `crow-rojas.github.io`.

## Fuera de alcance (YAGNI)

- Sin React / R3F (overhead innecesario para single-screen)
- Sin Tailwind (CSS plano alcanza)
- Sin librerías de countdown (lógica de ~20 líneas)
- Sin postprocessing pipelines de Three.js (bloom etc. → al shader directamente)
- Sin analytics
- Sin i18n
- Sin PWA / install prompt
- Sin storage / backend
- Sin créditos visibles ni footer
- Sin galería, playlist, mensajes — solo el countdown
- Sin contar-hacia-arriba post-arribo
