# Dawn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `dawn.crowrojas.dev` — a one-screen, mobile-first countdown site rendered with a custom GLSL fragment shader, deployed via GitHub Pages on every push to `main`.

**Architecture:** Vanilla TypeScript bootstrapped with Vite. Three.js renders a single full-screen quad with a custom fragment shader (`aubade.frag`) that produces the entire visual: dawn gradient, fBm fog, stars, drifting petals, luminous arc, vignette, film grain. The countdown is plain DOM updated at 1Hz from a pure `compute(now)` function. Audio is a plain `HTMLAudioElement` with a manual toggle. No React, no Tailwind, no postprocessing libraries. Deploy is `pnpm build` → GitHub Pages artifact via GitHub Actions.

**Tech Stack:** TypeScript, Vite 5, Three.js (r170), GLSL, Vitest, pnpm, GitHub Actions, GitHub Pages, `@fontsource-variable/fraunces`.

**Reference spec:** `docs/superpowers/specs/2026-05-14-dawn-design.md`

---

## Conventions

- **All tasks assume `cwd = /Users/crowdev/dev/personal/long-distance-counter`.**
- Use `pnpm` for everything. The lockfile in the repo is the source of truth.
- Each task ends with a commit. Commit messages use conventional prefixes (`feat:`, `chore:`, `test:`, `fix:`).
- The target timestamp is **`2026-09-18T09:55:00Z`** = 06:55 hora Chile in CLST (-03:00). DST in Chile starts the first Saturday of September (Sept 5, 2026), so the country is in CLST on Sept 18, 2026. This is encoded in `src/countdown/target.ts` with a comment.
- The Three.js renderer uses the default WebGL2 context, ortho camera, and a single full-screen quad — no scene graph beyond the mesh.
- DOM IDs used: `#canvas`, `#countdown`, `#days`, `#time`, `#label`, `#arrival`, `#audio-toggle`.

---

## Task 1: Bootstrap Vite + TypeScript

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.ts`, `index.html` (placeholder), `src/main.ts` (placeholder), `src/style.css` (placeholder)

- [ ] **Step 1: Init pnpm + Vite vanilla TypeScript template**

Run:
```bash
pnpm create vite@latest . --template vanilla-ts
```

When prompted "Current directory is not empty. Please choose how to proceed:", select **"Ignore files and continue"**. This preserves `.gitignore`, `README.md`, `docs/`, and `.superpowers/`.

- [ ] **Step 2: Install dependencies**

Run:
```bash
pnpm install
```

- [ ] **Step 3: Replace `package.json` scripts and add prod dependencies**

Edit `package.json` to look exactly like this (keep the `devDependencies` versions Vite already pinned for `typescript` and `vite`, just add the three lines marked):

```json
{
  "name": "dawn",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.170.0",
    "@fontsource-variable/fraunces": "^5.1.0"
  },
  "devDependencies": {
    "typescript": "~5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@types/three": "^0.170.0"
  }
}
```

Then install:
```bash
pnpm install
```

- [ ] **Step 4: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "resolveJsonModule": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create `vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  assetsInclude: ["**/*.vert", "**/*.frag", "**/*.glsl"],
});
```

- [ ] **Step 6: Delete Vite scaffold leftovers**

Run:
```bash
rm -f src/counter.ts src/typescript.svg public/vite.svg src/vite-env.d.ts
```

- [ ] **Step 7: Create minimal `src/main.ts`**

```ts
console.log("dawn");
```

- [ ] **Step 8: Create minimal `src/style.css`**

```css
:root { color-scheme: dark; }
html, body { margin: 0; padding: 0; background: #000; }
```

- [ ] **Step 9: Replace `index.html` with shell**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>dawn</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 10: Verify dev server boots**

Run:
```bash
pnpm dev
```

Expected: prints `Local: http://localhost:5173/`. Visit it in a browser — the page should be black and the console should log `dawn`. Stop with `Ctrl+C`.

- [ ] **Step 11: Verify build works**

Run:
```bash
pnpm build
```

Expected: completes without errors, creates `dist/index.html`.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: bootstrap vite + typescript project"
```

---

## Task 2: Configure Vitest

**Files:**
- Modify: `vite.config.ts`
- Create: `tests/.gitkeep`

- [ ] **Step 1: Add Vitest config to `vite.config.ts`**

Replace the whole file with:

```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    target: "es2022",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  assetsInclude: ["**/*.vert", "**/*.frag", "**/*.glsl"],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

Note: Vitest reads from the `test` field on the Vite config. TypeScript may complain that `test` is not on `UserConfig` — that's fine, Vitest extends it at runtime. If the build fails, add this triple-slash directive at the top of the file:

```ts
/// <reference types="vitest" />
```

- [ ] **Step 2: Create `tests/` directory**

Run:
```bash
mkdir -p tests && touch tests/.gitkeep
```

- [ ] **Step 3: Verify Vitest runs (with no tests it should exit cleanly)**

Run:
```bash
pnpm test
```

Expected: exits with `No test files found` warning but exit code 0. Acceptable for now.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: configure vitest"
```

---

## Task 3: Countdown target constant + sanity test

**Files:**
- Create: `src/countdown/target.ts`
- Create: `tests/target.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/target.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TARGET_UTC_ISO, TARGET_LABEL, TARGET_MS } from "../src/countdown/target";

describe("target", () => {
  it("TARGET_UTC_ISO parses to a valid Date", () => {
    const d = new Date(TARGET_UTC_ISO);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });

  it("TARGET_MS matches TARGET_UTC_ISO", () => {
    expect(TARGET_MS).toBe(new Date(TARGET_UTC_ISO).getTime());
  });

  it("target is 06:55 in Chile time on 2026-09-18 (CLST, -03:00)", () => {
    const d = new Date(TARGET_UTC_ISO);
    // 06:55 -03:00 == 09:55 UTC
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(8); // September = 8 (zero-indexed)
    expect(d.getUTCDate()).toBe(18);
    expect(d.getUTCHours()).toBe(9);
    expect(d.getUTCMinutes()).toBe(55);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it("TARGET_LABEL is the display string", () => {
    expect(TARGET_LABEL).toBe("CDMX → SCL · 18 · 09 · 26");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm test
```

Expected: FAIL with `Cannot find module '../src/countdown/target'`.

- [ ] **Step 3: Create `src/countdown/target.ts`**

```ts
// Target: 18 September 2026, 06:55 hora Chile.
//
// Chilean DST (CLST, UTC-03:00) begins the first Saturday of September.
// In 2026 that is 2026-09-05, so by 2026-09-18 the country is in CLST.
// 06:55 -03:00 == 09:55 UTC.
//
// If this assumption changes (DST law revised, target date moved), update
// TARGET_UTC_ISO and the constants below. Source for DST rule:
// Chilean Ministerio de Energía, "Cambio de hora oficial".
export const TARGET_UTC_ISO = "2026-09-18T09:55:00Z";
export const TARGET_MS = Date.parse(TARGET_UTC_ISO);

export const TARGET_LABEL = "CDMX → SCL · 18 · 09 · 26";
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(countdown): add target constants for 2026-09-18 06:55 Chile"
```

---

## Task 4: Countdown compute pure function

**Files:**
- Create: `src/countdown/compute.ts`
- Create: `tests/compute.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/compute.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { compute } from "../src/countdown/compute";
import { TARGET_MS } from "../src/countdown/target";

const ms = (s: number) => s * 1000;
const minutes = (m: number) => m * 60_000;
const hours = (h: number) => h * 3_600_000;
const days = (d: number) => d * 86_400_000;

describe("compute", () => {
  it("returns positive components before target", () => {
    const now = new Date(TARGET_MS - (days(2) + hours(3) + minutes(4) + ms(5)));
    const state = compute(now);
    expect(state.arrived).toBe(false);
    expect(state.days).toBe(2);
    expect(state.hours).toBe(3);
    expect(state.minutes).toBe(4);
    expect(state.seconds).toBe(5);
  });

  it("returns arrived=true and zeros at exact target", () => {
    const state = compute(new Date(TARGET_MS));
    expect(state.arrived).toBe(true);
    expect(state.days).toBe(0);
    expect(state.hours).toBe(0);
    expect(state.minutes).toBe(0);
    expect(state.seconds).toBe(0);
  });

  it("returns arrived=true 1ms before target as false", () => {
    const state = compute(new Date(TARGET_MS - 1));
    expect(state.arrived).toBe(false);
  });

  it("returns arrived=true 1ms after target", () => {
    const state = compute(new Date(TARGET_MS + 1));
    expect(state.arrived).toBe(true);
  });

  it("returns arrived=true any time after target with zeros", () => {
    const state = compute(new Date(TARGET_MS + days(7)));
    expect(state.arrived).toBe(true);
    expect(state.days).toBe(0);
    expect(state.seconds).toBe(0);
  });

  it("progress is 0 at start anchor and 1 at target", () => {
    // Anchor is 2026-05-14 (the spec date) — chosen as the start of the journey
    const anchor = Date.parse("2026-05-14T00:00:00Z");
    const halfway = new Date((anchor + TARGET_MS) / 2);
    const state = compute(halfway);
    expect(state.progress).toBeGreaterThan(0.45);
    expect(state.progress).toBeLessThan(0.55);
  });

  it("progress is clamped to [0, 1]", () => {
    expect(compute(new Date(0)).progress).toBe(0);
    expect(compute(new Date(TARGET_MS + days(365))).progress).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm test
```

Expected: FAIL with `Cannot find module '../src/countdown/compute'`.

- [ ] **Step 3: Implement `src/countdown/compute.ts`**

```ts
import { TARGET_MS } from "./target";

export type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
  progress: number;
};

// Anchor for the progress 0→1 ramp. Picked as the day the spec was written
// (start of the countdown journey). Used only for the `progress` uniform —
// nothing depends on it being exact.
const ANCHOR_MS = Date.parse("2026-05-14T00:00:00Z");

export function compute(now: Date): CountdownState {
  const nowMs = now.getTime();
  const remaining = TARGET_MS - nowMs;

  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      arrived: true,
      progress: 1,
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const elapsed = nowMs - ANCHOR_MS;
  const span = TARGET_MS - ANCHOR_MS;
  const rawProgress = elapsed / span;
  const progress = Math.max(0, Math.min(1, rawProgress));

  return { days, hours, minutes, seconds, arrived: false, progress };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test
```

Expected: 7 passing in `compute.test.ts`, all previous tests still pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(countdown): add compute(now) → CountdownState pure function"
```

---

## Task 5: Countdown format helper

**Files:**
- Create: `src/countdown/format.ts`
- Create: `tests/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { pad2 } from "../src/countdown/format";

describe("pad2", () => {
  it("pads single digit", () => {
    expect(pad2(5)).toBe("05");
  });

  it("does not pad two digits", () => {
    expect(pad2(10)).toBe("10");
    expect(pad2(99)).toBe("99");
  });

  it("pads zero", () => {
    expect(pad2(0)).toBe("00");
  });

  it("returns three digits unchanged for large numbers", () => {
    expect(pad2(126)).toBe("126");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
pnpm test
```

Expected: FAIL with `Cannot find module '../src/countdown/format'`.

- [ ] **Step 3: Implement `src/countdown/format.ts`**

```ts
export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm test
```

Expected: 4 passing in `format.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(countdown): add pad2 helper"
```

---

## Task 6: HTML shell + CSS layout (still no shader)

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`

- [ ] **Step 1: Replace `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0418" />
    <title>dawn</title>

    <meta property="og:title" content="dawn" />
    <meta property="og:description" content="a countdown · cdmx → scl" />
    <meta property="og:image" content="/og.jpg" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://dawn.crowrojas.dev" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <canvas id="canvas" aria-hidden="true"></canvas>

    <main id="hero">
      <div id="countdown">
        <div id="days">—</div>
        <div id="time">—h · —m · —s</div>
      </div>
      <div id="arrival" hidden>she's here.</div>
    </main>

    <footer>
      <div id="label">CDMX → SCL · 18 · 09 · 26</div>
      <button id="audio-toggle" type="button" aria-label="Toggle ambient audio" aria-pressed="false">♪</button>
    </footer>

    <noscript>
      <p style="position:fixed;inset:0;display:grid;place-items:center;color:#fff;font-family:serif;text-align:center;padding:2rem">
        dawn · a countdown to 2026-09-18 — enable JavaScript to see the full piece.
      </p>
    </noscript>

    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Replace `src/style.css`**

```css
@import "@fontsource-variable/fraunces/wght.css";

:root {
  color-scheme: dark;
  --bg: #0a0418;
  --fg: #fff;
  --letterbox: clamp(20px, 4vh, 48px);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
  font-family: "Fraunces Variable", "Times New Roman", Georgia, serif;
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
}

#canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
}

#hero {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  text-align: center;
  padding-top: var(--letterbox);
  padding-bottom: var(--letterbox);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  pointer-events: none;
}

/* Letterbox bars */
body::before,
body::after {
  content: "";
  position: fixed;
  left: 0;
  right: 0;
  height: var(--letterbox);
  background: #000;
  z-index: 10;
  pointer-events: none;
}
body::before { top: 0; }
body::after  { bottom: 0; }

#countdown {
  transition: opacity 0.8s ease-out;
}

#days {
  font-size: clamp(5rem, 18vw, 9rem);
  font-weight: 300;
  letter-spacing: -0.04em;
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 30px rgba(255, 200, 220, 0.3);
}

#time {
  margin-top: 0.6rem;
  font-size: clamp(0.9rem, 2.6vw, 1.1rem);
  letter-spacing: 0.15em;
  opacity: 0.85;
  font-variant-numeric: tabular-nums;
}

#arrival {
  font-size: clamp(3rem, 10vw, 6rem);
  font-style: italic;
  font-weight: 300;
  letter-spacing: -0.02em;
  opacity: 0;
  transition: opacity 1.2s ease-in;
  text-shadow: 0 0 40px rgba(255, 200, 220, 0.5);
}
#arrival:not([hidden]) { opacity: 1; }

footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: var(--letterbox);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem max(1.2rem, env(safe-area-inset-right)) 1rem max(1.2rem, env(safe-area-inset-left));
  pointer-events: none;
}

#label {
  font-family: system-ui, -apple-system, "Helvetica Neue", sans-serif;
  font-size: 0.65rem;
  letter-spacing: 0.35em;
  text-transform: uppercase;
  opacity: 0.65;
  font-weight: 400;
}

#audio-toggle {
  pointer-events: auto;
  appearance: none;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 0.8rem;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: border-color 0.2s, opacity 0.2s;
  opacity: 0.6;
}
#audio-toggle:hover { opacity: 1; border-color: #fff; }
#audio-toggle[aria-pressed="true"] { opacity: 1; border-color: #fff; }

@media (prefers-reduced-motion: reduce) {
  #countdown, #arrival { transition: none; }
}
```

- [ ] **Step 3: Update `src/main.ts` to wire up basic DOM (no shader yet)**

```ts
import "./style.css";

const days = document.getElementById("days") as HTMLElement;
const time = document.getElementById("time") as HTMLElement;
days.textContent = "0";
time.textContent = "00h · 00m · 00s";
```

- [ ] **Step 4: Verify dev server renders the layout**

Run:
```bash
pnpm dev
```

Visit `http://localhost:5173`. Expected:
- Black background, letterbox bars top and bottom
- Centered countdown showing `0` and `00h · 00m · 00s` in serif Fraunces
- Bottom-left small caps `CDMX → SCL · 18 · 09 · 26`
- Bottom-right circular `♪` button

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): html shell + css layout (letterbox, typography)"
```

---

## Task 7: Wire countdown DOM updates (1Hz, paused-on-hidden)

**Files:**
- Create: `src/ui/countdown.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement `src/ui/countdown.ts`**

```ts
import type { CountdownState } from "../countdown/compute";
import { pad2 } from "../countdown/format";

type Refs = {
  days: HTMLElement;
  time: HTMLElement;
};

export function createCountdownView(refs: Refs) {
  let lastSecondKey = "";

  return {
    update(state: CountdownState): void {
      const key = `${state.days}|${state.hours}|${state.minutes}|${state.seconds}`;
      if (key === lastSecondKey) return;
      lastSecondKey = key;

      refs.days.textContent = String(state.days);
      refs.time.textContent = `${pad2(state.hours)}h · ${pad2(state.minutes)}m · ${pad2(state.seconds)}s`;
    },
  };
}
```

- [ ] **Step 2: Update `src/main.ts` to drive the countdown**

```ts
import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";

const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  view.update(compute(new Date()));
  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
```

- [ ] **Step 3: Verify in dev server**

Run:
```bash
pnpm dev
```

Visit `http://localhost:5173`. Expected:
- Countdown displays real number of days until target (~127 days as of 2026-05-14)
- Time row updates every second
- Switch to another tab for >2 seconds, then return — countdown jumps forward (no error)

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): wire countdown DOM with 1Hz updates and visibility pause"
```

---

## Task 8: Three.js scene scaffold + minimal fragment shader (flat color)

**Files:**
- Create: `src/scene/shaders/aubade.vert`
- Create: `src/scene/shaders/aubade.frag`
- Create: `src/scene/shader.ts`
- Create: `src/scene/scene.ts`
- Modify: `src/main.ts`
- Create: `src/glsl.d.ts` (type declarations for `.vert`/`.frag` imports)

- [ ] **Step 1: Create `src/glsl.d.ts` so Vite can import shaders as strings**

```ts
declare module "*.vert?raw" {
  const src: string;
  export default src;
}
declare module "*.frag?raw" {
  const src: string;
  export default src;
}
```

- [ ] **Step 2: Create `src/scene/shaders/aubade.vert`**

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
```

- [ ] **Step 3: Create `src/scene/shaders/aubade.frag` (placeholder solid pink)**

```glsl
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uArrival;

varying vec2 vUv;

void main() {
  gl_FragColor = vec4(vec3(0.769, 0.290, 0.557), 1.0);
}
```

- [ ] **Step 4: Create `src/scene/shader.ts`**

```ts
import * as THREE from "three";
import vert from "./shaders/aubade.vert?raw";
import frag from "./shaders/aubade.frag?raw";

export type SceneUniforms = {
  time: number;
  pointer: [number, number];
  arrival: number;
};

export function createMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uArrival: { value: 0 },
    },
    depthTest: false,
    depthWrite: false,
  });
}

export function applyUniforms(mat: THREE.ShaderMaterial, u: SceneUniforms): void {
  mat.uniforms.uTime.value = u.time;
  mat.uniforms.uPointer.value.set(u.pointer[0], u.pointer[1]);
  mat.uniforms.uArrival.value = u.arrival;
}

export function setResolution(mat: THREE.ShaderMaterial, w: number, h: number): void {
  mat.uniforms.uResolution.value.set(w, h);
}
```

- [ ] **Step 5: Create `src/scene/scene.ts`**

```ts
import * as THREE from "three";
import { createMaterial, applyUniforms, setResolution, type SceneUniforms } from "./shader";

export type SceneHandle = {
  stop: () => void;
};

export function startScene(
  canvas: HTMLCanvasElement,
  getUniforms: () => SceneUniforms
): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = createMaterial();
  const quad = new THREE.Mesh(geometry, material);
  scene.add(quad);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    setResolution(material, w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }
  resize();

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  let raf = 0;
  let stopped = false;

  function frame() {
    if (stopped) return;
    applyUniforms(material, getUniforms());
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  frame();

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}
```

- [ ] **Step 6: Update `src/main.ts` to start the scene**

```ts
import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { startScene } from "./scene/scene";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

startScene(canvas, () => uniforms);

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  uniforms.time = (performance.now() - t0) / 1000;
  view.update(compute(new Date()));
  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
```

- [ ] **Step 7: Verify in dev server**

Run:
```bash
pnpm dev
```

Visit `http://localhost:5173`. Expected:
- Full-screen pink/magenta canvas behind the typography
- Countdown still ticking on top
- No console errors
- Resize the browser — pink canvas resizes with it

Stop dev server.

- [ ] **Step 8: Run build and tests to verify no regressions**

Run:
```bash
pnpm build && pnpm test
```

Expected: build succeeds, all tests pass.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(scene): bootstrap three.js fullscreen quad with shader material"
```

---

## Task 9: Fragment shader — dawn gradient

**Files:**
- Modify: `src/scene/shaders/aubade.frag`

- [ ] **Step 1: Replace `src/scene/shaders/aubade.frag` with gradient**

```glsl
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uArrival;

varying vec2 vUv;

// Dawn palette stops (low→high y)
// 0.039,0.016,0.094  = #0a0418
// 0.122,0.031,0.188  = #1f0830
// 0.290,0.122,0.361  = #4a1f5c
// 0.769,0.290,0.557  = #c44a8e
// 1.000,0.494,0.714  = #ff7eb6
// 1.000,0.714,0.757  = #ffb6c1
vec3 dawnGradient(float y, float arrival) {
  // arrival shifts everything up so dawn "rises"
  float yy = clamp(y + arrival * 0.18, 0.0, 1.0);

  vec3 c0 = vec3(0.039, 0.016, 0.094);
  vec3 c1 = vec3(0.122, 0.031, 0.188);
  vec3 c2 = vec3(0.290, 0.122, 0.361);
  vec3 c3 = vec3(0.769, 0.290, 0.557);
  vec3 c4 = vec3(1.000, 0.494, 0.714);
  vec3 c5 = vec3(1.000, 0.714, 0.757);

  vec3 col = c0;
  col = mix(col, c1, smoothstep(0.00, 0.15, yy));
  col = mix(col, c2, smoothstep(0.15, 0.40, yy));
  col = mix(col, c3, smoothstep(0.40, 0.70, yy));
  col = mix(col, c4, smoothstep(0.70, 0.90, yy));
  col = mix(col, c5, smoothstep(0.90, 1.00, yy));
  return col;
}

void main() {
  gl_FragColor = vec4(dawnGradient(vUv.y, uArrival), 1.0);
}
```

- [ ] **Step 2: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected: vertical gradient from near-black at top to pale pink at bottom, with the deep magenta band in the middle. Countdown text remains legible on top.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(shader): dawn gradient with arrival shift"
```

---

## Task 10: Fragment shader — fBm fog overlay

**Files:**
- Modify: `src/scene/shaders/aubade.frag`

- [ ] **Step 1: Replace `src/scene/shaders/aubade.frag`**

```glsl
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uArrival;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * valueNoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 dawnGradient(float y, float arrival) {
  float yy = clamp(y + arrival * 0.18, 0.0, 1.0);
  vec3 c0 = vec3(0.039, 0.016, 0.094);
  vec3 c1 = vec3(0.122, 0.031, 0.188);
  vec3 c2 = vec3(0.290, 0.122, 0.361);
  vec3 c3 = vec3(0.769, 0.290, 0.557);
  vec3 c4 = vec3(1.000, 0.494, 0.714);
  vec3 c5 = vec3(1.000, 0.714, 0.757);
  vec3 col = c0;
  col = mix(col, c1, smoothstep(0.00, 0.15, yy));
  col = mix(col, c2, smoothstep(0.15, 0.40, yy));
  col = mix(col, c3, smoothstep(0.40, 0.70, yy));
  col = mix(col, c4, smoothstep(0.70, 0.90, yy));
  col = mix(col, c5, smoothstep(0.90, 1.00, yy));
  return col;
}

void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.04;

  vec3 col = dawnGradient(uv.y, uArrival);

  // fBm fog tint
  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.012, uTime * 0.02);
  float fog = fbm(fogUv);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected: the gradient now has slow, drifting cloud-like patches of tone variation. Move the mouse — the fog drifts subtly with the pointer.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(shader): add fbm volumetric fog overlay"
```

---

## Task 11: Fragment shader — stars in upper half

**Files:**
- Modify: `src/scene/shaders/aubade.frag`

- [ ] **Step 1: Add a `stars()` function and call it from `main()`**

Edit `src/scene/shaders/aubade.frag` — insert this function after `fbm()` and before `dawnGradient()`:

```glsl
float stars(vec2 uv, float density) {
  // Grid-based star field with twinkle
  vec2 grid = uv * vec2(uResolution.x / 6.0, uResolution.y / 6.0);
  vec2 cell = floor(grid);
  vec2 cellUv = fract(grid) - 0.5;
  float h = hash21(cell);
  float spawn = step(0.985, h);
  float d = length(cellUv);
  float core = smoothstep(0.15, 0.0, d);
  float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + h * 30.0);
  return core * spawn * twinkle * density;
}
```

Then replace the `main()` function (everything inside) with:

```glsl
void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.04;

  vec3 col = dawnGradient(uv.y, uArrival);

  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.012, uTime * 0.02);
  float fog = fbm(fogUv);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.6;

  // Stars fade in toward the top of the screen, fade out as arrival completes
  float starDensity = smoothstep(0.35, 0.85, uv.y) * (1.0 - uArrival * 0.6);
  col += vec3(1.0, 0.95, 1.0) * stars(uv + parallax * 0.3, starDensity);

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected: tiny twinkling white stars appear in the upper portion of the gradient (the darker violet band), fading out toward the lighter rose at the bottom.

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(shader): add twinkling stars in upper half"
```

---

## Task 12: Fragment shader — drifting petals

**Files:**
- Modify: `src/scene/shaders/aubade.frag`

- [ ] **Step 1: Add `petals()` function and call it in `main()`**

Edit `src/scene/shaders/aubade.frag` — insert after `stars()`:

```glsl
// Eight drifting blurred ellipses. Each one wraps in y and gets a horizontal
// sway from the time-based sine. Result reads as petals / soft particles.
float petals(vec2 uv) {
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float seedX = hash21(vec2(fi, 7.13));
    float seedY = hash21(vec2(fi, 13.7));
    float speed = 0.018 + 0.025 * hash21(vec2(fi, 21.3));
    float sway = 0.04 * sin(uTime * (0.4 + 0.6 * hash21(vec2(fi, 5.0))) + fi);

    vec2 center = vec2(
      fract(seedX + sway),
      fract(seedY - uTime * speed)
    );

    vec2 diff = (uv - center) * vec2(1.0, 1.7);
    float r = length(diff);
    float petal = smoothstep(0.035, 0.0, r);
    total += petal * (0.5 + 0.5 * seedX);
  }
  return total;
}
```

Then update the `main()` body (replace the whole function):

```glsl
void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.04;

  vec3 col = dawnGradient(uv.y, uArrival);

  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.012, uTime * 0.02);
  float fog = fbm(fogUv);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.6;

  float starDensity = smoothstep(0.35, 0.85, uv.y) * (1.0 - uArrival * 0.6);
  col += vec3(1.0, 0.95, 1.0) * stars(uv + parallax * 0.3, starDensity);

  // Petals — soft pink, in the lower 80% of the screen
  float petalMask = smoothstep(0.95, 0.2, uv.y);
  col += vec3(1.0, 0.75, 0.85) * petals(uv) * 0.55 * petalMask;

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected: soft pink blurred spots drift slowly downward across the lower portion of the screen. Different speeds, slight horizontal sway. The reading should feel ambiguous between "petals" and "particles."

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(shader): add drifting petals/particles"
```

---

## Task 13: Fragment shader — luminous arc + film grain + vignette

**Files:**
- Modify: `src/scene/shaders/aubade.frag`

- [ ] **Step 1: Replace `src/scene/shaders/aubade.frag` entirely (final shader)**

```glsl
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uArrival;

varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * valueNoise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

float stars(vec2 uv, float density) {
  vec2 grid = uv * vec2(uResolution.x / 6.0, uResolution.y / 6.0);
  vec2 cell = floor(grid);
  vec2 cellUv = fract(grid) - 0.5;
  float h = hash21(cell);
  float spawn = step(0.985, h);
  float d = length(cellUv);
  float core = smoothstep(0.15, 0.0, d);
  float twinkle = 0.5 + 0.5 * sin(uTime * 1.5 + h * 30.0);
  return core * spawn * twinkle * density;
}

float petals(vec2 uv) {
  float total = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    float seedX = hash21(vec2(fi, 7.13));
    float seedY = hash21(vec2(fi, 13.7));
    float speed = 0.018 + 0.025 * hash21(vec2(fi, 21.3));
    float sway = 0.04 * sin(uTime * (0.4 + 0.6 * hash21(vec2(fi, 5.0))) + fi);
    vec2 center = vec2(
      fract(seedX + sway),
      fract(seedY - uTime * speed)
    );
    vec2 diff = (uv - center) * vec2(1.0, 1.7);
    float r = length(diff);
    float petal = smoothstep(0.035, 0.0, r);
    total += petal * (0.5 + 0.5 * seedX);
  }
  return total;
}

// Luminous arc: a slightly rotated quadratic curve across the upper third.
float arc(vec2 uv) {
  // Rotate uv slightly so the arc tilts
  float a = -0.08;
  vec2 c = uv - vec2(0.5, 0.7);
  vec2 r = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a));
  // y = -k * x^2 along rotated frame; distance from that curve
  float curveY = -2.5 * r.x * r.x;
  float d = abs(r.y - curveY);
  float core = smoothstep(0.004, 0.0, d);
  float glow = smoothstep(0.05, 0.0, d) * 0.4;
  return core + glow;
}

vec3 dawnGradient(float y, float arrival) {
  float yy = clamp(y + arrival * 0.18, 0.0, 1.0);
  vec3 c0 = vec3(0.039, 0.016, 0.094);
  vec3 c1 = vec3(0.122, 0.031, 0.188);
  vec3 c2 = vec3(0.290, 0.122, 0.361);
  vec3 c3 = vec3(0.769, 0.290, 0.557);
  vec3 c4 = vec3(1.000, 0.494, 0.714);
  vec3 c5 = vec3(1.000, 0.714, 0.757);
  vec3 col = c0;
  col = mix(col, c1, smoothstep(0.00, 0.15, yy));
  col = mix(col, c2, smoothstep(0.15, 0.40, yy));
  col = mix(col, c3, smoothstep(0.40, 0.70, yy));
  col = mix(col, c4, smoothstep(0.70, 0.90, yy));
  col = mix(col, c5, smoothstep(0.90, 1.00, yy));
  return col;
}

float vignette(vec2 uv) {
  vec2 d = uv - 0.5;
  return smoothstep(0.85, 0.30, length(d));
}

float grain(vec2 uv) {
  return hash21(uv * uResolution + fract(uTime) * 100.0) - 0.5;
}

void main() {
  vec2 uv = vUv;
  vec2 parallax = (uPointer - 0.5) * 0.04;

  vec3 col = dawnGradient(uv.y, uArrival);

  vec2 fogUv = uv * vec2(2.5, 4.0) + parallax + vec2(uTime * 0.012, uTime * 0.02);
  float fog = fbm(fogUv);
  col += vec3(0.18, 0.06, 0.20) * (fog - 0.5) * 0.6;

  float starDensity = smoothstep(0.35, 0.85, uv.y) * (1.0 - uArrival * 0.6);
  col += vec3(1.0, 0.95, 1.0) * stars(uv + parallax * 0.3, starDensity);

  float petalMask = smoothstep(0.95, 0.2, uv.y);
  col += vec3(1.0, 0.75, 0.85) * petals(uv) * 0.55 * petalMask;

  float arcAmount = arc(uv + parallax * 0.5);
  col += vec3(1.0, 0.85, 0.9) * arcAmount * (0.55 + 0.45 * uArrival);

  col *= mix(0.5, 1.0, vignette(uv));

  col += vec3(grain(uv)) * 0.05;

  gl_FragColor = vec4(col, 1.0);
}
```

- [ ] **Step 2: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected:
- Soft luminous arc crossing the upper third of the screen, slightly tilted
- Vignette darkens corners
- Subtle film grain noise overlay
- Everything still moves smoothly

Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(shader): add luminous arc, vignette, film grain"
```

---

## Task 14: Pointer + device orientation input

**Files:**
- Create: `src/input/pointer.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement `src/input/pointer.ts`**

```ts
export function createPointer(): {
  get(): [number, number];
  dispose(): void;
} {
  let x = 0.5;
  let y = 0.5;
  let targetX = 0.5;
  let targetY = 0.5;

  const onMouse = (e: MouseEvent) => {
    targetX = e.clientX / window.innerWidth;
    targetY = 1 - e.clientY / window.innerHeight;
  };

  const onTouch = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    targetX = t.clientX / window.innerWidth;
    targetY = 1 - t.clientY / window.innerHeight;
  };

  const onOrient = (e: DeviceOrientationEvent) => {
    // gamma: left/right tilt (-90 to 90). beta: front/back (-180 to 180).
    if (e.gamma == null || e.beta == null) return;
    targetX = 0.5 + Math.max(-1, Math.min(1, e.gamma / 45)) * 0.5;
    targetY = 0.5 + Math.max(-1, Math.min(1, (e.beta - 45) / 45)) * 0.5;
  };

  window.addEventListener("mousemove", onMouse, { passive: true });
  window.addEventListener("touchmove", onTouch, { passive: true });
  window.addEventListener("deviceorientation", onOrient, { passive: true });

  return {
    get() {
      // ease toward target each frame for smoothing
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      return [x, y];
    },
    dispose() {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("deviceorientation", onOrient);
    },
  };
}
```

- [ ] **Step 2: Wire pointer into `src/main.ts`**

Replace `src/main.ts` with:

```ts
import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});
const pointer = createPointer();

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

startScene(canvas, () => uniforms);

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  uniforms.time = (performance.now() - t0) / 1000;
  uniforms.pointer = pointer.get();
  view.update(compute(new Date()));
  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
```

- [ ] **Step 3: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected: moving the mouse causes the arc and fog to shift slightly with the cursor (subtle parallax). On a touch device (or browser device emulation with touch), dragging produces the same effect.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(input): pointer + deviceorientation parallax"
```

---

## Task 15: Arrival transition

**Files:**
- Create: `src/ui/arrival.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement `src/ui/arrival.ts`**

```ts
type ArrivalRefs = {
  countdown: HTMLElement;
  arrival: HTMLElement;
};

export type ArrivalController = {
  update(arrived: boolean): void;
  getUniform(): number;
};

const FADE_MS = 1200;

export function createArrival(refs: ArrivalRefs): ArrivalController {
  let started = false;
  let startedAt = 0;

  function trigger() {
    if (started) return;
    started = true;
    startedAt = performance.now();
    refs.countdown.style.opacity = "0";
    setTimeout(() => {
      refs.arrival.hidden = false;
    }, 800);
  }

  return {
    update(arrived: boolean) {
      if (arrived) trigger();
    },
    getUniform() {
      if (!started) return 0;
      const t = (performance.now() - startedAt) / FADE_MS;
      return Math.max(0, Math.min(1, t));
    },
  };
}
```

- [ ] **Step 2: Wire arrival into `src/main.ts`**

Replace `src/main.ts` with:

```ts
import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});
const arrival = createArrival({
  countdown: document.getElementById("countdown") as HTMLElement,
  arrival: document.getElementById("arrival") as HTMLElement,
});
const pointer = createPointer();

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

startScene(canvas, () => uniforms);

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  uniforms.time = (performance.now() - t0) / 1000;
  uniforms.pointer = pointer.get();

  const state = compute(new Date());
  view.update(state);
  arrival.update(state.arrived);
  uniforms.arrival = arrival.getUniform();

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
```

- [ ] **Step 3: Test arrival manually via query string**

Update `src/countdown/compute.ts` — replace the file with:

```ts
import { TARGET_MS } from "./target";

export type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
  progress: number;
};

const ANCHOR_MS = Date.parse("2026-05-14T00:00:00Z");

// Time travel for manual QA: ?t=ISO offsets `now`. Falls through to real time
// when the query param is missing or invalid.
function readOverride(): number | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("t");
  if (!param) return null;
  const parsed = Date.parse(param);
  return Number.isFinite(parsed) ? parsed - Date.now() : null;
}

const offsetMs = readOverride() ?? 0;

export function compute(now: Date): CountdownState {
  const nowMs = now.getTime() + offsetMs;
  const remaining = TARGET_MS - nowMs;

  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      arrived: true,
      progress: 1,
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const elapsed = nowMs - ANCHOR_MS;
  const span = TARGET_MS - ANCHOR_MS;
  const rawProgress = elapsed / span;
  const progress = Math.max(0, Math.min(1, rawProgress));

  return { days, hours, minutes, seconds, arrived: false, progress };
}
```

- [ ] **Step 4: Verify the tests still pass**

The override only triggers in a browser (`typeof window !== "undefined"`), so Node-side Vitest tests stay deterministic.

Run:
```bash
pnpm test
```

Expected: all existing tests still pass.

- [ ] **Step 5: Verify arrival transition in dev server**

Run:
```bash
pnpm dev
```

Visit `http://localhost:5173/?t=2026-09-18T06:54:55-03:00`. Expected:
- The countdown shows `0` days and approaches 0 seconds
- At the target, the countdown fades out, the dawn shader brightens (palette shifts toward warmer rose), and `she's here.` fades in
- Stays in that state

Then visit `http://localhost:5173/` without the query string — back to the normal future countdown.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): arrival transition with shader uniform ramp and 'she's here.'"
```

---

## Task 16: Audio player + toggle

**Files:**
- Create: `src/audio/player.ts`
- Create: `src/ui/audio-toggle.ts`
- Modify: `src/main.ts`
- Create: `public/audio/.gitkeep` (real audio file gets dropped in later)

- [ ] **Step 1: Implement `src/audio/player.ts`**

```ts
export type AudioPlayer = {
  toggle(): Promise<boolean>;
  isPlaying(): boolean;
};

export function createAudioPlayer(src: string): AudioPlayer {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0.4;

  let playing = false;

  return {
    async toggle() {
      if (playing) {
        audio.pause();
        playing = false;
        return false;
      }
      try {
        await audio.play();
        playing = true;
        return true;
      } catch {
        playing = false;
        return false;
      }
    },
    isPlaying() {
      return playing;
    },
  };
}
```

- [ ] **Step 2: Implement `src/ui/audio-toggle.ts`**

```ts
import type { AudioPlayer } from "../audio/player";

export function bindAudioToggle(button: HTMLButtonElement, player: AudioPlayer): void {
  button.addEventListener("click", async () => {
    const playing = await player.toggle();
    button.setAttribute("aria-pressed", String(playing));
  });
}
```

- [ ] **Step 3: Wire audio into `src/main.ts`**

Replace `src/main.ts` with:

```ts
import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";
import { createAudioPlayer } from "./audio/player";
import { bindAudioToggle } from "./ui/audio-toggle";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});
const arrival = createArrival({
  countdown: document.getElementById("countdown") as HTMLElement,
  arrival: document.getElementById("arrival") as HTMLElement,
});
const pointer = createPointer();
const audio = createAudioPlayer("/audio/aubade.opus");
bindAudioToggle(document.getElementById("audio-toggle") as HTMLButtonElement, audio);

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

startScene(canvas, () => uniforms);

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  uniforms.time = (performance.now() - t0) / 1000;
  uniforms.pointer = pointer.get();

  const state = compute(new Date());
  view.update(state);
  arrival.update(state.arrived);
  uniforms.arrival = arrival.getUniform();

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
```

- [ ] **Step 4: Create placeholder audio directory**

Run:
```bash
mkdir -p public/audio && touch public/audio/.gitkeep
```

The actual `aubade.opus` file will be dropped in during Task 19 (asset polish). For now, clicking the button will fail to load (404) and the button just toggles its `aria-pressed` state silently — that's acceptable.

- [ ] **Step 5: Verify in dev server**

Run:
```bash
pnpm dev
```

Expected:
- `♪` button click toggles `aria-pressed` between `true` and `false`
- No console errors when no audio file exists yet (the play promise rejects silently)

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(audio): create audio player and toggle button (asset pending)"
```

---

## Task 17: WebGL detection + reduced motion fallback

**Files:**
- Modify: `src/main.ts`
- Modify: `src/style.css`
- Modify: `src/scene/scene.ts`

- [ ] **Step 1: Add WebGL detection helper at the top of `src/main.ts`**

Replace `src/main.ts` with:

```ts
import "./style.css";
import { compute } from "./countdown/compute";
import { createCountdownView } from "./ui/countdown";
import { createArrival } from "./ui/arrival";
import { startScene } from "./scene/scene";
import { createPointer } from "./input/pointer";
import { createAudioPlayer } from "./audio/player";
import { bindAudioToggle } from "./ui/audio-toggle";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useShader = supportsWebGL();

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!useShader) {
  canvas.style.display = "none";
  document.body.classList.add("no-webgl");
}

const view = createCountdownView({
  days: document.getElementById("days") as HTMLElement,
  time: document.getElementById("time") as HTMLElement,
});
const arrival = createArrival({
  countdown: document.getElementById("countdown") as HTMLElement,
  arrival: document.getElementById("arrival") as HTMLElement,
});
const pointer = createPointer();
const audio = createAudioPlayer("/audio/aubade.opus");
bindAudioToggle(document.getElementById("audio-toggle") as HTMLButtonElement, audio);

const t0 = performance.now();
const uniforms = {
  time: 0,
  pointer: [0.5, 0.5] as [number, number],
  arrival: 0,
};

if (useShader) {
  startScene(canvas, () => uniforms);
}

let rafId = 0;
let paused = false;

function tick() {
  if (paused) return;
  // Freeze time uniform when reduced motion is set — shader becomes a still
  uniforms.time = reducedMotion ? 0 : (performance.now() - t0) / 1000;
  uniforms.pointer = pointer.get();

  const state = compute(new Date());
  view.update(state);
  arrival.update(state.arrived);
  uniforms.arrival = arrival.getUniform();

  rafId = requestAnimationFrame(tick);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    paused = true;
    cancelAnimationFrame(rafId);
  } else {
    paused = false;
    tick();
  }
});

tick();
```

- [ ] **Step 2: Add CSS fallback gradient when WebGL is unavailable**

Append to `src/style.css`:

```css
/* WebGL fallback — static CSS approximation of the dawn shader */
body.no-webgl {
  background:
    radial-gradient(ellipse at 50% 100%, #ffb6c1 0%, transparent 30%),
    radial-gradient(ellipse at 50% 80%, #ff7eb6 0%, transparent 40%),
    radial-gradient(ellipse at 50% 60%, #c44a8e 0%, transparent 55%),
    radial-gradient(ellipse at 50% 30%, #4a1f5c 0%, transparent 70%),
    linear-gradient(180deg, #0a0418 0%, #1f0830 40%, #4a1f5c 70%, #c44a8e 90%, #ffb6c1 100%);
}
```

- [ ] **Step 3: Verify in dev server**

Run:
```bash
pnpm dev
```

Force-disable WebGL in Chrome DevTools (Rendering panel → "Disable WebGL"), reload. Expected:
- Canvas hidden, body shows a CSS gradient approximation
- Countdown still updates on top

Re-enable WebGL. Toggle `prefers-reduced-motion` in DevTools (Rendering panel → Emulate CSS media feature → reduce). Reload. Expected:
- Shader renders as a still frame (no fog drift, no petals movement, no twinkle)
- Countdown still updates

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(a11y): webgl detection + reduced-motion freeze + css fallback"
```

---

## Task 18: CNAME file + favicon + final HTML polish

**Files:**
- Create: `public/CNAME`
- Create: `public/favicon.svg`
- Modify: `index.html`

- [ ] **Step 1: Create `public/CNAME`**

The file must contain ONLY the hostname with no trailing newline issues. Use `printf`, not `echo` (which adds a newline that GitHub Pages tolerates but it's cleaner without).

Run:
```bash
printf 'dawn.crowrojas.dev' > public/CNAME
```

- [ ] **Step 2: Create `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <radialGradient id="g" cx="50%" cy="100%" r="100%">
      <stop offset="0%" stop-color="#ffb6c1"/>
      <stop offset="40%" stop-color="#c44a8e"/>
      <stop offset="100%" stop-color="#0a0418"/>
    </radialGradient>
  </defs>
  <rect width="32" height="32" fill="url(#g)"/>
  <circle cx="16" cy="20" r="2" fill="#fff" opacity="0.9"/>
</svg>
```

- [ ] **Step 3: Verify `og.jpg` reference will not break build**

The `og.jpg` is a manual asset added post-launch (per spec). For now, create a placeholder file so the build doesn't reference a missing asset in production previews:

```bash
printf 'placeholder' > public/og.jpg
```

This is a 1×1 invalid JPEG but it satisfies the `og:image` reference. A real screenshot replaces it post-launch (manual step, tracked in spec open items).

- [ ] **Step 4: Verify build**

Run:
```bash
pnpm build
```

Expected: build succeeds. Check `dist/` contains `CNAME`, `favicon.svg`, and `og.jpg`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add CNAME, favicon, og.jpg placeholder"
```

---

## Task 19: Audio asset + final integration

**Files:**
- Create: `public/audio/aubade.opus`
- Modify: `public/audio/.gitkeep` (deleted)

- [ ] **Step 1: Acquire ambient pad audio**

Pick one of these royalty-free sources (in order of preference) and download a `~30 second loopable ambient pad` track that matches the brief in the spec (Nils Frahm / Ben Lukas Boysen / Brian Eno vibe — slow attack, no percussion, no melody, just texture):

1. **Pixabay Music** — search "ambient drone pad" or "atmospheric texture" — filter by ≤30s, CC0
2. **Free Music Archive** — search "ambient" + filter by CC BY or CC0
3. **freesound.org** — search "ambient pad loop" — filter by CC0

Save the file. Convert to `.opus` for best size/quality on web (smaller than mp3, modern browsers support it). On macOS with `ffmpeg`:

```bash
ffmpeg -i <input>.mp3 -c:a libopus -b:a 64k -ar 48000 public/audio/aubade.opus
```

Target: < 250kb file size. If `ffmpeg` isn't installed:
```bash
brew install ffmpeg
```

If you can't or don't want to install ffmpeg, save the source as `.mp3` and update `src/main.ts`:
```ts
const audio = createAudioPlayer("/audio/aubade.mp3");
```

- [ ] **Step 2: Remove the placeholder gitkeep**

```bash
rm public/audio/.gitkeep
```

- [ ] **Step 3: Verify audio works in dev**

Run:
```bash
pnpm dev
```

Click the `♪` button. Expected:
- Audio starts playing on first click
- Second click pauses
- `aria-pressed` toggles correctly
- The loop is seamless (no audible click at the boundary)

If the loop is not seamless, that's a sourcing issue — pick a different track or use audio editing software to add a crossfade at the loop boundary.

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(audio): add aubade ambient pad loop"
```

If the audio file is large or you want to keep it out of the repo, add it to a release attachment instead. For this size (≤250kb), commit is fine.

---

## Task 20: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm test

      - run: pnpm build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Enable GitHub Pages with Actions source**

Manually (only once, not scripted):
1. Open https://github.com/crow-rojas/long-distance-counter/settings/pages
2. Under "Build and deployment" → Source, select **"GitHub Actions"**
3. Leave HTTPS enforcement ON

- [ ] **Step 3: Configure DNS**

Manually, in whatever DNS provider holds `crowrojas.dev`:

```
CNAME  dawn  →  crow-rojas.github.io
```

(Just the subdomain `dawn`, since the apex domain is `crowrojas.dev`.) Wait 5–60 min for propagation.

Verify with:
```bash
dig +short dawn.crowrojas.dev CNAME
```

Expected output:
```
crow-rojas.github.io.
```

- [ ] **Step 4: Push to main and watch the workflow**

```bash
git add -A
git commit -m "ci: github actions deploy to pages on push to main"
git push origin main
```

Then:
```bash
gh run watch
```

Expected: build job runs tests + build, deploy job publishes. Total time ~1-2 min.

- [ ] **Step 5: Verify the live site**

Once deploy succeeds:
1. Visit `https://dawn.crowrojas.dev` (or `https://crow-rojas.github.io/long-distance-counter/` if DNS hasn't propagated yet)
2. Confirm the shader renders, countdown ticks, audio toggle works
3. Test `?t=2026-09-18T06:54:55-03:00` to validate arrival transition in production

- [ ] **Step 6: Commit (if any post-deploy fixes)**

If everything works, no commit needed. If you had to tweak something:

```bash
git add -A
git commit -m "fix: <description>"
git push
```

---

## Task 21: OG image generation

**Files:**
- Modify: `public/og.jpg`

- [ ] **Step 1: Take a screenshot of the hero**

Run dev server: `pnpm dev`. Open `http://localhost:5173` in Chrome at 1200×630 viewport (DevTools → device toolbar → custom 1200×630). Use the macOS screenshot shortcut (`Cmd+Shift+4`, then space, click the viewport) or DevTools "Capture screenshot" (cmd-shift-p → "Capture full size screenshot") then crop to 1200×630.

- [ ] **Step 2: Save as `public/og.jpg`**

Quality 85, ~80–150kb. Use Preview.app or ImageMagick:

```bash
magick screenshot.png -resize 1200x630^ -gravity center -extent 1200x630 -quality 85 public/og.jpg
```

- [ ] **Step 3: Verify the preview**

```bash
pnpm build && pnpm preview
```

Test the link preview by pasting `http://localhost:4173` into a Twitter / Slack / iMessage draft — confirm the OG image renders correctly. Use https://www.opengraph.xyz/ for a hosted preview after deploy.

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "chore: real og.jpg from hero screenshot"
git push
```

The deploy workflow runs automatically.

---

## Task 22: Real-device QA pass

**Files:** none

This task is checklist-driven verification on real hardware. Each box becomes a tracked TODO until it passes.

- [ ] **iPhone Safari**: shader renders smooth (~60fps), tilt parallax responds to deviceorientation (may require iOS 13+ permission prompt — that's acceptable as a known limitation; documented elsewhere if we add it)
- [ ] **iPhone Safari**: countdown remains legible against bright pink areas
- [ ] **iPhone Safari**: safe area respected (no text under notch / home indicator) in portrait and landscape
- [ ] **iPhone Safari**: audio toggle plays after user click; survives backgrounding/foregrounding
- [ ] **iPad Safari**: layout works in both portrait and landscape
- [ ] **Android Chrome**: shader renders, performance acceptable (≥30fps)
- [ ] **Desktop Chrome**: 60fps, mouse parallax smooth
- [ ] **Desktop Safari**: 60fps, no shader compile errors
- [ ] **Reduced motion (System Settings)**: shader freezes, countdown still updates
- [ ] **Slow 3G throttle**: FCP < 1.5s, no FOUC on Fraunces (or accept brief swap)
- [ ] **Time travel `?t=...&` query**: arrival transition fires correctly in production
- [ ] **Lighthouse**: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95

Any failures here become a new task. If iOS deviceorientation requires explicit permission (Safari 13+), accept that limitation — it's the documented platform restriction.

- [ ] **Final commit if any tweaks landed**

```bash
git add -A
git commit -m "fix: <specific issue from device QA>"
git push
```

---

## Closing checklist

- [ ] All tasks 1–22 completed
- [ ] `dawn.crowrojas.dev` resolves and serves the live site over HTTPS
- [ ] Spec open items revisited:
  - Audio asset chosen and committed
  - DST assumption (CLST -03:00 on 2026-09-18) verified or documented
  - Real OG image in place
- [ ] No console errors on any tested device
- [ ] `?t=2026-09-18T06:54:55-03:00` exercises the arrival path correctly

When all boxes are checked, the implementation is done. The site sits and counts down until 2026-09-18 09:55 UTC, then permanently displays `she's here.`
