# Repository quality audit — tooling, tests, countdown and assets

Audited 2026-09-16 at `aed7122b0fe89d28573a02959dad985932593839`. This is research for the combined cleanup spec, not an implementation. Scope: scripts, tests, countdown/UI/input, entry-point integration, dependencies, Vite/TypeScript and GitHub Pages. Game and Three runtime implementation, desktop visuals and DPR handling belong to the other owners. Runtime references below establish contracts or identify handoffs; they are not proposed parallel edits.

The architecture is already small. The useful work is to make browser QA quiet and disposable, remove unused countdown work, clarify the asset regeneration boundary, and maintain the build tools. No additional framework, runtime layer or asset manager is justified.

## Evidence and limits

- `corepack pnpm@9 test`: **17/17 passed**, four files.
- `corepack pnpm@9 build`: **passed**, including `tsc --noEmit`. Initial JS: 482.65 kB / 124.19 kB gzip; lazy game JS: 1,500.87 kB / 348.38 kB gzip. The build reports the expected >500 kB chunk warning.
- Local versions: Node **22.22.2**, pnpm **9.15.9**, Vite **5.4.21**, Vitest **2.1.9**, TypeScript **5.6.3**, agent-browser **0.27.1**.
- Asset references were enumerated from the actual preload method and inline image URLs without starting Phaser: **38 referenced files exist; no unreferenced public game PNGs**. Pillow decoded every public PNG/JPEG/WebP; all **32 game PNGs** contain opaque and transparent pixels. The four sheets match their 320-pixel frame dimensions. `og.jpg` is a real 1200×630 image.
- Source-module probes confirmed preview parsing behavior and pointer listener cleanup. Separately typechecking `vite.config.ts` also passed.
- `pnpm audit --json` exits 1 with **7 moderate, 4 high and 1 critical** entries. These are advisory entries, not twelve demonstrated production exploits; the same mocker advisory appears against two packages. Relevant maintainer advisories were read.
- No browser was launched, no audio played, and no asset generation was run against the user's originals or existing generated outputs. The prior 82-connection browser result is supplied context, **not a rerun by this audit**. Python extraction algorithms were inspected, not visually revalidated.
- The working tree was clean initially. No matching personal KB exists under `~/claude-sync/projects/`; repository documentation supplies the project context.

## Findings to include in the cleanup spec

### 1. Priority: browser QA has no outer lifecycle owner

**Evidence:** `README.md:78–84`; `tests/platformer.browser.js:1–9,29–41,68–69,125–128,179–195`.

The documented command reuses `chofis-v3`, assumes the preview is already ready, and never closes the browser. The test clicks Sound twice; an assertion after the first click can leave sound enabled. Its finalizer wakes the game loop and leaves the session running. There is no finalizer around the entire script.

The test also modifies the preview's food/checkpoint storage and does not restore it. Reloading, as documented, retains that storage. On subsequent runs, the locked-ending check is conditionally skipped when three items were previously saved. That makes the result dependent on the reused browser's history. The `?t` guard does protect the normal progress namespace under the current game contract; there is no evidence this script writes the real-clock save key.

The parent reports an earlier hung `wait --fn` expecting a Web Audio source's `.loop` to become true. **Do not repeat that predicate.** Phaser 3.90 schedules a separate `loopSource` and starts successive buffer sources; native `AudioBufferSourceNode.loop` is not its loop contract. See [Phaser's versioned implementation](https://github.com/phaserjs/phaser/blob/v3.90.0/src/sound/webaudio/WebAudioSound.js#L382-L433), and its loop rollover at [lines 637–652](https://github.com/phaserjs/phaser/blob/v3.90.0/src/sound/webaudio/WebAudioSound.js#L637-L652).

**Minimal recommendation:** one small Node runner around the installed CLI is warranted by the actual noise/orphan incident. Keep the existing browser assertions and avoid adding Playwright or a second browser framework.

The runner's bounded contract:

1. Accept a local Vite URL and fail clearly if unavailable. Use a unique session such as `fonda-qa-<pid>-<timestamp>`; do not attach to a personal profile, restore persisted state, or reuse `chofis-v3`. Ensure inherited CLI profile/state settings cannot override this isolation.
2. Include **`--args '--mute-audio'` on the first browser launch**, before navigation. Muting the browser preserves the application's audio state assertions even while Sound is toggled. Passing launch flags to an already-running session is not a substitute.
3. Open the arrival preview, then wait for **`body.playing`** with a finite operation timeout. `src/game/game.ts:219–223` sets the class at the end of `create()`, just before resolving startup. Canvas existence is insufficient: Phaser creates it before preload finishes.
4. Pipe `tests/platformer.browser.js` to `eval --stdin`; require successful CLI execution **and** the returned `passed: true`. Give evaluation a finite outer process timeout too. A CLI client's timeout alone must not be treated as proof the browser daemon closed.
5. On success, assertion failure, timeout, SIGINT and SIGTERM, close **only the owned session**, preserve the original failure status, and report any cleanup failure. Bound the close command. Add the CLI's idle timeout as a backstop, not as the main cleanup mechanism. Never use `close --all` or broad process-name kills.
6. Update the README to the runner command and make it the supported path. A fresh disposable browser makes storage restoration and extra test save keys unnecessary. If direct evaluation remains supported, document that it mutates preview progress.

Use Node's existing process APIs for command deadlines and signal handling; no GNU `timeout` dependency on macOS. Cleanup must be verified on failure and interruption, not merely placed after the happy-path command. No program can promise finalizers after SIGKILL or host failure; browser-level muting and an idle expiry address that residual case.

**Acceptance:** one successful run; one forced assertion failure; one impossible readiness predicate with a short deadline; one interrupted run. Each must return an appropriate exit status, remain inaudible, and leave no owned session running. Two simultaneous runs must use different sessions. Verify a repeated run still executes the locked-ending assertion from empty storage. Keep the scope local; hosted production checks need a separate, nonmutating smoke path.

**Sources:** [agent-browser 0.27.1 README](https://github.com/vercel-labs/agent-browser/blob/v0.27.1/README.md) documents isolated sessions, launch arguments, `eval --stdin`, operation timeouts and daemon idle shutdown. Its version-matched `agent-browser skills get core --full` was also read. [Node child processes](https://nodejs.org/docs/latest-v22.x/api/child_process.html) provide process execution, timeouts and termination without another dependency.

### 2. Browser checks need targeted coverage and fewer accidental assumptions

**Evidence:** `tests/platformer.browser.js:6–8,11–27,46–49,125–128,170–178`; `vite.config.ts:16–18`; `tsconfig.json:22`.

The suite is useful because it drives the real physics engine. It is also development-only: it discovers a Vite module URL in resource timing and imports `/src/game/level.ts`. It cannot test `dist` or the deployed site. A missing/evicted resource entry currently degenerates into an unhelpful dynamic-import failure. The JS file is intentionally outside the unit-test pattern and, without `allowJs`, outside TypeScript checking.

The existing density check covers only the current device ratio and a CSS resize. It does not test fresh launches at 1×/2×/3× or a ratio change while the page stays open. The parent owns that runtime change; attach these cases to its acceptance checks. Assert both backing-store dimensions and unchanged visible world scale, then restore device emulation or dispose the session.

**Minimal recommendation:** preserve the source-URL approach for now; add explicit ready-game/module assertions with useful errors. Do not import a second game module using a made-up cache-busting query. Keep the known geometry constants where they specify gameplay; replace incidental array indices with an existing semantic lookup only when the map change requires it. Do not introduce a public testing API or rewrite the suite around mocks.

After the lifecycle runner works, add a small DPR check before the long physics traversal. Full traversal at every ratio is unnecessary unless the change affects physics. Likewise, the existing 82 connections are a map invariant, not proof of mobile usability, rendering quality, audio playback or a complete human playthrough.

**Acceptance:** the runner fails clearly when used against a production preview; it never hangs awaiting a nonexistent source module. Parent-owned DPR checks cover 1×/2×/3× and live changes. Add muted startup smoke checks for the countdown-to-arrival transition and a failed lazy-game request/retry, which the physics script cannot cover.

### 3. CI runs an end-of-life Node; tool dependencies have actionable advisories

**Evidence:** `.github/workflows/deploy.yml:23–36`; `package.json:18–22`; `pnpm-lock.yaml:402,422,440,493,524`.

The workflow explicitly installs Node 20. Its official EOL was **2026-04-30**, before this audit. Local verification uses Node 22.22.2. Move CI to the already-working Node 22 line and document that baseline; no need to jump to the newest Node or pnpm.

The Vite/Vitest advisories require a separate bounded tooling update, not an indiscriminate dependency upgrade:

| Installed path | Upstream evidence and actual scope | Minimum action to evaluate |
| --- | --- | --- |
| Vite 5.4.21 | [`.map` path traversal](https://github.com/vitejs/vite/security/advisories/GHSA-4w7w-66w2-5vf9); [Windows deny-list bypass](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff); [Windows editor/NTLM issue](https://github.com/vitejs/launch-editor/security/advisories/GHSA-v6wh-96g9-6wx3). These concern developer servers; the repository does not enable `server.host`. | Evaluate Vite **6.4.3 or a later patched 6.x** as the smallest major step, with a fresh audit at implementation time. |
| Vitest 2.1.9 / mocker 2.1.9 | [UI/API file access/execution](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) and [mocker redirect path traversal](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9). Current scripts use node tests, not UI, browser mode or the standalone mocker plugin. | Evaluate **4.1.11 or a later patched 4.x**, paired with Vite ≥6. The mocker maintainer explicitly says older 2.x/3.x will not receive that fix. |
| PostCSS 8.5.14 → nanoid 3.3.12 | [PostCSS source-map loading](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849), including [the follow-up fix](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp). Audit also flags invalid-size nanoid generator loops; no application nanoid calls were found. | Refresh permitted transitive resolutions and rerun audit; do not introduce new direct application dependencies to mask transitive findings. |
| esbuild 0.21.5; fflate 0.8.2 under `@types/three` | [esbuild's own serve-mode advisory](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99); [fflate 0.8.3 fix](https://github.com/101arrowz/fflate/releases/tag/v0.8.3). This repo does not use esbuild's standalone server or process uploaded ZIPs. | Vite 6 uses esbuild ≥0.25; refresh compatible fflate resolution if available. No Three runtime upgrade follows from a type-package transitive advisory. |

The audit metadata reports all dependencies as non-dev; use actual `package.json` placement and reachable code when assessing exposure. None of these findings demonstrates a vulnerability in the static Pages runtime.

**Minimal recommendation:** pin `packageManager` to the already-used `pnpm@9.15.9` and align the workflow's pnpm setting if touching tool versions. Keep one Vite/Vitest config. When upgrading Vitest, use `defineConfig` from `vitest/config` rather than carrying forward the old `/// <reference types="vitest" />` convention.

**Acceptance:** frozen install, unit tests, typecheck/build, quiet browser smoke, current audit with any residual exposure explained. These candidate versions were researched, **not installed or validated here**. Keep the runtime libraries and TypeScript unchanged unless a concrete incompatibility appears.

**Sources:** [Node release schedule](https://github.com/nodejs/Release/blob/main/schedule.json); [Vite support policy](https://vite.dev/releases); [Vite 6 migration](https://github.com/vitejs/vite/blob/v6.4.3/docs/guide/migration.md); [Vitest 4 migration](https://github.com/vitest-dev/vitest/blob/v4.1.11/docs/guide/migration.md). Published metadata for [Vite 6.4.3](https://registry.npmjs.org/vite/6.4.3) and [Vitest 4.1.11](https://registry.npmjs.org/vitest/4.1.11) confirms the Node 22 / Vite 6 pairing.

### 4. Preview validity is inconsistent, and its browser branch has no unit coverage

**Evidence:** `src/countdown/compute.ts:16–24`; `src/game/game.ts:34–35`; `tests/compute.test.ts:1–59`; `README.md:17–21,38`.

The countdown requires a nonempty parseable date; the game selects preview storage whenever `t` exists. Isolated module probes produced:

| Query | Countdown clock | Game storage choice |
| --- | --- | --- |
| absent | real | real |
| `?t=` | real | preview |
| `?t=invalid` | real | preview |
| valid ISO target | offset clock | preview |

After the real arrival, an invalid query therefore runs the real clock while reading another save namespace. This does not destroy the real save, but can look like lost progress. Current node tests never exercise `readOverride()` with a browser global.

**Minimal recommendation:** settle one definition with the game owner. The least surprising interpretation of the README is that only a valid override creates a preview. Keep the parsed override/result in the existing countdown module and reuse that validity for storage selection; do not add a clock service or query-parser layer.

**Acceptance:** use existing Vitest global stubs, frozen time and module reset to cover missing, empty, invalid and valid `t`; verify time continues advancing from the override. Restore globals/timers between cases. Coordinate the storage assertion with the game owner. This is a shared contract change, not an independent edit to their file.

### 5. Countdown progress is dead production work

**Evidence:** `src/countdown/compute.ts:9,12,37,47–52`; `tests/compute.test.ts:47–59`; `src/main.ts:83–86`.

`progress` and its May 14 anchor are calculated every animation frame but no production consumer reads them. Repository-wide usage finds only their implementation and tests. The shader receives the arrival controller's separate uniform. The original design mentioned journey progress; the current implementation does not use it.

**Minimal recommendation:** delete `progress`, `ANCHOR_MS`, their arithmetic and the two tests devoted to that unused output. Keep countdown decomposition, clamping at arrival and the tiny existing formatter. Do not preserve obsolete tests merely to keep the count at 17.

Also rename the contradictory test description at `tests/compute.test.ts:30` to “has not arrived 1 ms before target.” If strengthening the target test, use native `Intl.DateTimeFormat` with `America/Santiago` to verify the local 06:55 requirement; the current “Chile time” test checks only hardcoded UTC fields (`tests/target.test.ts:14–22`). No date library is necessary.

**Acceptance:** no production `progress` reference remains; boundary tests still pass, with the new preview cases covering useful behavior instead.

### 6. Asset preparation does not reproduce the deployed selection end to end

**Evidence:** `README.md:54–69`; `docs/assets.md:28,43–60`; all four scripts' metadata headers and save loops.

The checked-in assets are healthy and every game PNG is used. The reproducibility issue is procedural: scripts write to Downloads, the README's cleaning example uses **2×**, while deployed originals use **1×**, and no listed command promotes the selected subset into `public/game/`. The world contact sheet mentioned in the docs is present locally, but `prepare-world.py` never creates it. The music processing settings are documented without a repeatable command.

Extraction dependencies are floating (`scripts/prepare-assets.py:3` and the other scripts' minimum-only versions). Running the same script months later may resolve a different image stack. This is offline authoring uncertainty, not a deploy failure: CI copies committed assets and does not run Python.

There is also a concrete partial-output boundary: `prepare-generated.py:86–99` saves earlier sheets before opening later inputs or validating the batch; `prepare-world.py:65–99` saves the sky and cutouts before all later reads/checks. A missing late input leaves a mixture of old and new derived files. The separate-directory guards protect ordinary source paths; no current loss of originals was demonstrated.

**Minimal recommendation:**

- Document the exact **1×** cleaning step and selected-file promotion step. Run into a fresh scratch destination, validate all outputs, then copy only the selected files after success. Never suggest deleting the user's `Downloads/Chofis` tree or replacing it wholesale.
- Preflight expected input files before the first output write if these scripts are being edited. Keep their source-specific coordinates and threshold comments; they are intentionally tuned extraction recipes.
- Keep existing inline PEP 723 dependencies. If repeatable regeneration is part of the accepted cleanup, use `uv lock --script <file>` and commit adjacent script lockfiles; no Python project/workspace is required.
- Correct the contact-sheet claim or record its separate manual command. Record the existing audio conversion command when recovered; do not invent an exact filter order or re-encode the published music during this cleanup.

**Acceptance:** an incomplete input set fails before promotion and leaves `public/game` and originals unchanged. Successful regeneration to scratch passes each script's checks and a selected-file dimension/transparency check before promotion. A small assertion-based check is sufficient; avoid image snapshots, perceptual diff services or a second test framework.

**Sources:** [uv script locking and reproducibility](https://docs.astral.sh/uv/guides/scripts/#locking-dependencies); [Vite public assets](https://v5.vite.dev/guide/assets.html#the-public-directory) are copied as-is. The scripts' NumPy/SciPy, Pillow, PyMuPDF and OpenCV imports are used; none is an obvious removable dependency.

### 7. Small configuration cleanup, with no deployment rewrite

**Evidence:** `vite.config.ts:9–15`; `src/glsl.d.ts:1–8`; `tsconfig.json:20–22`; `CNAME:1`; `public/CNAME:1`; `.github/workflows/deploy.yml:3–6`.

- `manualChunks: undefined` and its empty containing objects do nothing. Remove them rather than adding arbitrary vendor splitting to silence the chunk warning.
- All active shader imports use `?raw`. Vite already supplies a `*?raw` declaration through `vite/client`; the custom declarations in `src/glsl.d.ts` duplicate it. `assetsInclude` is unnecessary for those raw-string imports. Coordinate deletion with the Three owner and run the build. [Vite raw imports](https://v5.vite.dev/guide/assets.html#importing-asset-as-string), [versioned client types](https://github.com/vitejs/vite/blob/v5.4.21/packages/vite/client.d.ts#L235-L238).
- The workflow only runs after pushes to `main` or manual dispatch. If PRs are used for the cleanup, add a build/test PR trigger and explicitly gate deployment to `main` non-PR events; give the build only read permissions and scope deployment permissions to its job. Avoid a second duplicate workflow. Do not use `pull_request_target` to execute untrusted PR code. Existing tests already run before deployment; this is a missing pre-merge check, not missing deploy validation.
- Two identical CNAME files exist. Root `CNAME` is not a Vite build input. More importantly, GitHub says CNAME files are **ignored and unnecessary for custom Actions publication**; the domain lives in repository Pages settings. Remove the redundant root copy at minimum; keeping `public/CNAME` as a harmless marker is reasonable, but it must not be described as what preserves the domain. [GitHub custom-domain documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
- `vite.config.ts` is outside the project `tsconfig` include. It separately typechecks today, so this is not a present defect. Include it in normal checking if touching configuration; no separate config package is needed.

**Acceptance:** frozen install, tests/build, raw shaders still load, Pages keeps `base: "/"` for its custom domain, and PR events cannot deploy. Do not change DNS or Pages settings as part of file cleanup.

## Cross-owner handoffs and deliberate skips

- **Entry-point fallback:** `src/main.ts:12` accepts WebGL1, but Three r170 requires WebGL2; `startScene()` at line 47 is outside a catch, so renderer startup can prevent the first countdown tick. The [versioned renderer source](https://github.com/mrdoob/three.js/blob/r170/src/renderers/WebGLRenderer.js#L248-L264) requests `webgl2` only. Hand this to the Three owner: test the actual renderer startup/fallback, not just a disposable capability probe. Preserve the existing useful chunk-load retry (`src/main.ts:54–70`).
- **Reduced-motion input:** `src/main.ts:75–77` freezes time but keeps applying changing pointer coordinates. Whether the intended “still” scene should also fix the pointer belongs with the renderer's reduced-motion acceptance. Do not independently restructure the shared loop.
- **Orientation:** the old implementation plan explicitly accepts unavailable permission-gated iOS tilt. Mouse/touch fallback exists. No permission UI or sensor abstraction is justified in this cleanup.
- **Pointer lifecycle:** `dispose()` correctly removes all three listeners in the source probe. The application currently mounts once for the document lifetime; its unused disposal call is not evidence of an accumulating runtime leak. No lifecycle framework.
- **Dependencies:** Phaser, Three and Fraunces are all used. Their size is not a reason to replace engines/fonts. Lazy game import already separates gameplay loading. Do not manufacture manual chunks or raise the warning threshold to claim a performance win.
- **Asset format/size:** keep committed PNG/WebP/audio and preserved licenses. No atlas, CDN, compression service, mass WebP conversion or re-encoding without measured device pressure and visual validation.
- **Licensing:** `docs/licenses/alkakrab-piano.md:31–39` already records the differing source terms and Crow's publication decision. Preserve that evidence; this audit does not reopen the decision or send messages to the author.
- **Historical docs:** the May design/implementation files contain obsolete plans, but README labels them historical and points to current docs. Do not rewrite history as if it described the current runtime. `tests/.gitkeep` is harmless deletion-only cleanup.
- **Testing:** retain Vitest. No coverage quota, DOM framework or broad per-function test expansion. Spend the next checks on quiet lifecycle cleanup, preview semantics, startup failures and the parent's DPR change.

## Suggested bounded implementation order

1. Quiet disposable browser runner and README command; verify failure/timeout/interruption cleanup.
2. Parent runtime fixes plus the matching browser assertions, including readiness and live DPR.
3. Dead countdown progress removal and agreed preview validity tests/contract.
4. Node baseline and narrowly scoped Vite/Vitest security maintenance; recheck browser behavior after the tool upgrade.
5. Asset recipe clarification and no-op config cleanup. Add lockfiles only if reproducible regeneration is included in the accepted scope.

These are independent, reviewable edits after the parent combines the research into the spec. This audit changed no application code, tooling configuration, tests or assets.
