# Phaser / Three runtime audit

Audited 2026-09-16 against commit `aed7122`, installed Phaser **3.90.0** and Three **0.170.0**. Scope: runtime APIs, lifecycle, physics, camera, input, audio, density, and transition render cost. Research only; no app edits, subagents, or browser sessions were used for this audit.

The parent agent owns the upcoming **DPR / camera / text density implementation**. Its browser evidence is attributed below; this audit did not repeat that QA. No matching personal project KB exists under `~/claude-sync/projects/`.

## Prioritized findings

| Priority | Finding | Evidence / confidence | Smallest recommended change |
| --- | --- | --- | --- |
| P1 | WebGL1-only support passes the gate, then Three throws before the countdown loop starts | Installed Three source and app call flow; browser fallback not exercised here | Require WebGL2 for Three and catch actual renderer initialization failure, using the existing CSS fallback |
| P1, performance | Three and the countdown RAF continue indefinitely behind opaque game CSS | Source-confirmed; background asset confirmed opaque | Stop/dispose Three and stop countdown/pointer work after the game fade completes |
| P2 | Live DPR changes retain boot density | **Browser-confirmed by parent** | Refresh density, inverse scale zoom, camera sizing, and existing Text resolutions together; monitor DPR changes |
| P2 | Moving-platform art is one physics synchronization behind its body | Executed against installed Arcade World/Body and the actual app method | Move platform control/art update to the existing scene `POST_UPDATE` listener |
| P2 | DOM interaction positioning reads the previous camera render state | Installed lifecycle source; magnitude not browser-measured here | Position the DOM button on scene `RENDER`, using the current camera transform |

P1 performance denotes the first useful performance fix, not a measured inability to reach 60 fps. Parent measured approximately 60 fps at initial desktop DPR2; there is no GPU timing or battery measurement in this report.

### 1. WebGL capability detection can abort the entire application

**Trigger:** a browser/device supplies WebGL1 but cannot create WebGL2. `supportsWebGL()` accepts either context at [src/main.ts:9](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/main.ts:9), then `startScene()` is invoked outside a try/catch at [src/main.ts:47](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/main.ts:47). The first `tick()` is only at line 108. Therefore a Three constructor failure prevents both countdown updates and eventual Phaser startup; the catch inside `revealGame()` never handles this earlier failure.

Three r170's constructor requests only `webgl2` and throws if it is unavailable: [installed WebGLRenderer.js:246](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/three/src/renderers/WebGLRenderer.js:246), lines 246–271; [versioned official source](https://github.com/mrdoob/three.js/blob/r170/src/renderers/WebGLRenderer.js#L246-L271). Its explicit WebGL1 rejection also appears at line 84. This is a capability mismatch, not a requirement to drop Phaser's Canvas/WebGL1 fallback.

**Minimal fix:** test WebGL2 for this Three scene. Also catch failure of the actual `startScene()` call and apply the existing `canvas.style.display = "none"` / `body.no-webgl` fallback before continuing to `tick()`. The separate probe can succeed even when allocating the actual renderer fails; checking only the probe does not cover that case. Existing fallback styling is [src/style.css:131](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/style.css:131).

**Verification:** inject failure for `canvas.getContext("webgl2")` before app initialization while leaving WebGL1/2D available. Assert the countdown changes, fallback CSS is active, and arrival still boots Phaser. Separately make only the real `#canvas` context creation fail while a throwaway probe succeeds. This is a later functional check, not duplicated desktop visual QA.

### 2. The completed transition leaves invisible rendering and pointer work running

[src/game/game.css:1](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.css:1) covers the viewport with `cielo-fonda.webp`, under a translucent gradient, and fades the game root to opacity 1 over 1.8 seconds. The image itself is **opaque**: `sips -g hasAlpha -g pixelWidth -g pixelHeight public/game/cielo-fonda.webp` returned `hasAlpha: no`, 2048 × 1013. Transparent Phaser does not reveal Three through this opaque parent background.

Nevertheless:

- [src/main.ts:54](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/main.ts:54), lines 54–59, calls `enterGame()` after startup rather than scheduling final teardown.
- [src/scene/scene.ts:65](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/scene/scene.ts:65), lines 65–92, always clears and renders the full-screen background and schedules another frame. `fgScene.visible = false` eventually prevents drawing the flower but does **not** stop the background draw, camera work, renderer entry, or RAF.
- [src/scene/shaders/aubade.frag:86](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/scene/shaders/aubade.frag:86), lines 86–117, still contains fog, stars, grain and both sky calculations. It has no application-level early exit once hidden.
- [src/main.ts:73](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/main.ts:73), lines 73–80, continues updating time and pointer uniforms and scheduling a separate RAF after `gameStarted`.
- [src/input/pointer.ts:29](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/input/pointer.ts:29), lines 29–43, registers three listeners and already exposes the cleanup needed.

Three's scene visibility check returns before traversing invisible objects: [installed WebGLRenderer.js:1321](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/three/src/renderers/WebGLRenderer.js:1321), [official r170 source](https://github.com/mrdoob/three.js/blob/r170/src/renderers/WebGLRenderer.js#L1321-L1323). Do not claim the flower keeps issuing draw calls after it becomes invisible; the verified waste is the remaining scene/frame work, full-screen sky rendering, and retained resources.

At 1440 × 900 CSS pixels with DPR2, each renderer has a 2880 × 1800 backing surface: **5,184,000 pixels each**. At Phaser density 3 the Phaser surface alone is 11,664,000 pixels, while Three remains capped at density 2. These are surface-area counts, not measured fragment invocations, GPU memory totals, or frame time.

**Minimal fix:** retain the existing visual transition, then call the existing `sceneHandle.stop()` once the game root becomes opaque (immediate under reduced motion). Stop the countdown RAF and dispose its pointer listeners too. Guard the visibility-change resume path at [src/main.ts:96](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/main.ts:96) so it cannot restart the finished countdown loop. `SceneHandle.stop()` already cancels its RAF, disconnects its ResizeObserver, disposes flower/drift/background resources and the renderer at [src/scene/scene.ts:114](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/scene/scene.ts:114). Reuse it; no new renderer manager is necessary.

Do not stop Three immediately at `startGame()` resolution while the 1.8-second CSS reveal still depends on the image behind it. If using `transitionend`, filter `target` and `propertyName`; account for reduced motion where no transition event fires.

**Small related deletion:** `this.load.image("sky", ...)` at [src/game/game.ts:79](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:79) has no Phaser consumer; the sky is supplied by CSS. Remove this preload while retaining the CSS asset. The image's uncompressed RGBA base level is about 7.9 MiB; WebGL texture creation happens during TextureSource initialization at [installed TextureSource.js:228](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/textures/TextureSource.js:228), lines 228–254. This avoids an unused Phaser texture, not necessarily a second network download—the browser may reuse the CSS request.

**Verification:** count calls on the original Three canvas's WebGL draw methods before startup; after the game fade, its draw count must stop growing while Phaser continues. Hide/show the tab and verify it stays stopped. Verify reduced motion reaches the same terminal state. Assert `game.textures.exists("sky") === false` after removing the unused preload. Do not infer a render-cost improvement just from `fgScene.visible`.

### 3. Boot-time density survives monitor and page-zoom changes

**Parent evidence, received during this audit:**

- Initial desktop viewport 1440 × 900, DPR2: canvas 2880 × 1800, Text resolution 2, approximately 60 fps; screenshot good.
- Boot at DPR1, then use native viewport density change to 1440 × 900 / DPR2 **without reloading**: `devicePixelRatio === 2`, canvas remains 1440 × 900, render density remains 1.

The cause is the `const pixelRatio` at [src/game/game.ts:41](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:41). The resize closure at lines 204–206 reuses it, as do camera zoom at lines 294/306, DOM coordinates at lines 342–343, initial scale configuration at line 488, and Text creation at lines 146, 186, 281, 284 and 288.

Moving from low to high density leaves the game blurry. Moving from high to low density retains unnecessary pixel work. Page zoom can also change `devicePixelRatio`. MDN explicitly describes monitor changes and a rearmed resolution media query: [Window.devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#monitoring_screen_resolution_or_zoom_level_changes).

**Minimal fix, reserved for parent:** one mutable capped density and one refresh path for physical canvas dimensions, inverse scale zoom, camera zoom/follow sizing, DOM projection and existing Text objects. Rearm `matchMedia("(resolution: …dppx)")` on each density change, in addition to size changes; remove its listener during teardown. An unchanged CSS viewport does not justify returning early if density changed. Resize alone is not a dependable DPR-only change signal.

Use Phaser's `setZoom(1 / density)` when updating scale zoom, including when returning to density 1. This explicitly resets CSS sizing: [installed ScaleManager.js:895](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/scale/ScaleManager.js:895), lines 895–901, and [line 1057](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/scale/ScaleManager.js:1057), lines 1057–1062. Merely assigning `scale.zoom` and calling `resize()` can retain old inline CSS dimensions at zoom 1, because `resize()` writes those styles conditionally at lines 874–878.

Refresh already-created Text textures with `Text.setResolution(density)`; changing the density variable affects only future text creation. Include moving-platform arrow Text objects nested in Containers. Three likewise freezes its density at [src/scene/scene.ts:18](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/scene/scene.ts:18), and its ResizeObserver only reuses that value at lines 47–53. If density adaptation is required before arrival, also update Three's renderer, shader resolution, and particle `uPixelRatio` uniforms; after final teardown it needs no updates.

**Verification:** run 1 → 2 → 1 and 2 → 1.25 → 3 transitions without reload, including a DPR-only transition with unchanged CSS dimensions and while a dialogue camera is focused. Check canvas size/CSS size ratio, inverse scale zoom, unchanged visible world extent, nested Text resolution, current interaction position, and real pointer hit testing. Existing [tests/platformer.browser.js:11](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/tests/platformer.browser.js:11), lines 11–28, only captures one initial density and tests a CSS-size change; it does not cover this defect.

### 4. Moving-platform art is synchronized before the sprite receives physics results

[src/game/game.ts:416](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:416), lines 416–424, calls `updatePlatforms()` from scene `update()`. That method reads `sprite.x/y` for reversal checks and positions platform art at [src/game/game.ts:346](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:346), lines 346–368.

Phaser's actual order is:

1. Scene `UPDATE` event: Arcade World advances the bodies.
2. User scene `update()`: body positions are current, but the platform sprites still have their previous coordinates.
3. Scene `POST_UPDATE`: Arcade World copies displacement back to the sprites.
4. Camera pre-render and rendering.

Evidence: [installed Systems.js:356](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/scene/Systems.js:356), [ArcadePhysics.js:142](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/physics/arcade/ArcadePhysics.js:142), and [Body.js:1236](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/physics/arcade/Body.js:1236). Versioned primary sources: [Systems](https://github.com/phaserjs/phaser/blob/v3.90.0/src/scene/Systems.js#L356-L366), [Body](https://github.com/phaserjs/phaser/blob/v3.90.0/src/physics/arcade/Body.js#L1236-L1287).

The avatar already uses the correct post-physics listener at [src/game/game.ts:161](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:161). The platform art does not.

**Executed evidence:** the runnable check below loads the app's real `updatePlatforms()` method with installed Phaser World/Body. One horizontal step produces art/body offsets of 0.541667 world pixels at 120 Hz and 1.083333 at 60 Hz. Its first 30 Hz frame produces 1.625 pixels because floating-point accumulation executes three substeps and retains the remainder; subsequent frames can execute four. The important invariant is `art lag = body displacement this frame`. This does not prove failed jumps or severe visual jitter; it proves a deterministic mismatch that grows with frame displacement.

The existing integration test allows less than two pixels of art drift at 120 Hz ([tests/platformer.browser.js:76](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/tests/platformer.browser.js:76), lines 76–82), so it accepts the defect.

**Minimal fix:** move the single `updatePlatforms(delta)` invocation into the existing `POST_UPDATE` callback, after physics sync, and guard it with `!this.focusedFriend` so dialogues still freeze challenge time. Remove the invocation from `update()`. This also makes reversal decisions use current sprite positions. Retain the 120 Hz physics rate and current one-way collision setup; neither needs replacing to fix synchronization.

**Verification:** run world update → user update → post-update listeners at 30/60/120/144 Hz; assert stable/moving art matches the corresponding sprite after `POST_UPDATE`, allowing only the explicit fragile shake/fall effect. Keep the existing route traversal and moving-platform carry checks after the fix. A test that manually invokes only `scene.update()` and `world.postUpdate()` must also emit the scene post-update hook when testing this change.

### 5. Interaction projection uses a stale, rounded camera world view

`positionInteraction()` is called in `POST_UPDATE` at [src/game/game.ts:161](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:161), then reads `camera.worldView` and current `camera.zoom` at lines 338–343. Camera follow and `worldView` are not updated until `Camera.preRender()`:

- [installed Camera.js:519](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/cameras/2d/Camera.js:519), lines 519–587: follow interpolation, bounds clamp, and rounded world-view rectangle.
- [installed CameraManager.js:603](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/cameras/2d/CameraManager.js:603): pre-render is invoked while rendering.
- [installed Systems.js:380](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/scene/Systems.js:380), lines 380–390: scene `PRE_RENDER` is also **before** camera pre-render; scene `RENDER` is after it.
- [Official Phaser 3.90 camera source](https://github.com/phaserjs/phaser/blob/v3.90.0/src/cameras/2d/Camera.js#L489-L603).

This mixes the previous frame's world-view position with the new zoom during zoom transitions, and trails camera follow during movement. `worldView` is rounded to whole world units, so even after correcting event order it is not the exact camera transform.

**Minimal fix, coordinate with parent's camera slice:** leave avatar synchronization on `POST_UPDATE`, and move only `positionInteraction()` to scene `RENDER`. Project the world anchor using `camera.matrix.transformPoint(worldX - camera.scrollX, worldY - camera.scrollY)` and convert backing pixels to CSS with actual canvas/display scale. Preserve the existing HUD clamping. Do not invoke `camera.preRender()` manually in post-update; that would advance follow interpolation a second time in the same frame.

**Verification:** assert projection after an actual render while moving beside an NPC and while returning from a dialogue zoom. Compare unclamped anchor coordinates against the current camera matrix, then apply the intended clamp and 55px offset. Directly emitting the portrait's `"pointerup"` event, as the existing test does at line 120, validates the conversation callback but cannot validate pointer-coordinate conversion or hit testing.

## Reviewed behavior that should remain

- **The current initial density design is valid Phaser 3.90 usage.** `Scale.NONE` + physical canvas size + inverse scale zoom is supported by `ScaleManager.resize()`: [installed ScaleManager.js:803](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/scale/ScaleManager.js:803), lines 803–881; [official v3.90 source](https://github.com/phaserjs/phaser/blob/v3.90.0/src/scale/ScaleManager.js#L803-L881). Do not replace it with `RESIZE` and assume high-density rendering will be retained.
- **Camera zoom multiplied by density cancels the larger backing viewport.** For CSS width `W`, density `d`, gameplay zoom `z`: visible width is `(W*d)/(z*d) = W/z`. Physics world units do not need DPR multiplication.
- **Phaser already converts pointer coordinates through display scale.** `refresh()` computes `baseSize / canvasBounds` at [installed ScaleManager.js:976](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/scale/ScaleManager.js:976); `transformX/Y` apply it at lines 1270–1287. Do not manually divide Phaser pointer coordinates by DPR a second time. DOM overlay CSS coordinates are a separate conversion.
- **Physics `fps:120` is simulation frequency, not a render-rate promise.** World executes multiple fixed steps as needed at [installed World.js:936](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/physics/arcade/World.js:936), lines 936–1059. The app still runs its input/controller logic once per rendered frame. This is not itself evidence that physics must be rewritten or reduced to 60 Hz.
- **Dynamic immovable platforms are appropriate for the movers.** Group defaults are applied when added ([installed PhysicsGroup.js:217](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/physics/arcade/PhysicsGroup.js:217)); the app sets mover velocities afterwards at line 147. Horizontal carry via friction is implemented by Phaser at [installed ProcessY.js:393](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/physics/arcade/ProcessY.js:393). Making every platform static would break the moving ones.
- **Food pickup sizing is consistent with the static-body API.** `refreshBody()` followed by `body.setSize(72,72)` updates and centers the world-space pickup box; static-body `setSize` also updates the spatial tree ([installed StaticBody.js:646](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/physics/arcade/StaticBody.js:646), lines 646–692).
- **Dialogue pause is intentionally physics-only.** The app disables keyboard/global capture, clears held touch state, pauses physics, and returns early from gameplay update while keeping camera tweens alive ([src/game/game.ts:313](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:313), lines 313–335 and 423). Replacing this with scene pause would also stop the desired camera effects. Pointer capture has release, cancellation and lost-capture cleanup at lines 493–503.
- **Audio unlock and mute paths use supported APIs.** The app checks cache presence, starts muted, gates effects, and retries music on `UNLOCKED` ([src/game/game.ts:89](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:89), lines 89–107 and 372–374). Phaser listens for body gestures at [installed WebAudioSoundManager.js:339](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/sound/webaudio/WebAudioSoundManager.js:339), and clears `locked` before emitting `UNLOCKED` at [installed BaseSoundManager.js:667](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/sound/BaseSoundManager.js:667). Blur/focus suspension/resumption is implemented at WebAudioSoundManager lines 390–412. Keeping a muted loop running preserves its position; no audio refactor is justified by this audit. Actual hardware playback was not tested here.
- **Do not equate focus loss with a full simulation pause.** Phaser's `TimeStep.blur()` only changes `inFocus` ([installed TimeStep.js:444](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/core/TimeStep.js:444)); the app resets input on blur but does not explicitly pause gameplay. No new pause-on-blur feature is recommended without a product requirement.
- **Current one-shot game creation does not require a scene-restart framework.** There is one production `startGame()` caller, guarded by `revealingGame`; retry reloads the page. `game.destroy(true)` is asynchronous, and the app aborts DOM listeners on game `DESTROY` ([src/game/game.ts:507](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/src/game/game.ts:507); [installed Game.js:715](/Users/crowdev/orca/workspaces/long-distance-counter/marlin/node_modules/phaser/src/core/Game.js:715)). Scene restart would require additional listener/sound cleanup, but no current caller restarts the scene. Do not build that lifecycle speculatively.

## Runnable verification

### Source-backed physics reproduction — executed successfully

Run from the repository root. This uses installed dependencies, reads the real app method, and creates no files or browser. It intentionally asserts the **current defect**, so its assertions should be replaced with the corrected post-update invariant when implementing the fix. The Phaser Scene shell is stubbed; Arcade World and Body are real.

```sh
node <<'JS'
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const Body = require('phaser/src/physics/arcade/Body');
const World = require('phaser/src/physics/arcade/World');
const source = fs.readFileSync('src/game/game.ts', 'utf8');
const classSource = source.slice(
  source.indexOf('class Fonda extends'),
  source.indexOf('    game = new Phaser.Game(')
).replaceAll('import.meta.env.DEV', 'false');
const context = {
  Phaser: { Scene: class {}, Math: { Clamp: (n,a,b) => Math.max(a,Math.min(b,n)) } },
  reduced: false
};
vm.createContext(context);
vm.runInContext(ts.transpile(classSource + '\nglobalThis.Fonda=Fonda;',
  { target: ts.ScriptTarget.ES2022 }), context);
for (const hz of [120, 60, 30]) {
  const scene = new context.Fonda();
  const world = new World({ sys: { scale: { width:1440, height:900 } } },
    { fps:120, fixedStep:true, gravity:{x:0,y:0} });
  const sprite = {
    x:100, y:200, angle:0, scaleX:1, scaleY:1,
    displayOriginX:0, displayOriginY:0,
    width:100, height:28, displayWidth:100, displayHeight:28,
    setVelocityX(v) { this.body.velocity.x=v; return this; }
  };
  sprite.body = new Body(world, sprite);
  world.add(sprite.body);
  sprite.body.velocity.x = 65;
  const art = {
    x:100, y:200,
    setPosition(x,y) { this.x=x; this.y=y; return this; },
    setAlpha() { return this; }
  };
  scene.platforms = [{
    sprite, art, definition:[100,200,100,'moving-x'], crumbleAt:0, restoreAt:0
  }];
  world.update(1000/hz, 1000/hz);
  scene.updatePlatforms(1000/hz);
  const steps = world.stepsLastFrame;
  world.postUpdate();
  const lag = sprite.x-art.x;
  assert(Math.abs(lag-65*steps/120) < 1e-8);
  assert(lag > 0);
  console.log({ renderHz:hz, platformArtLagWorldPixels:lag, physicsSteps:steps });
  world.destroy();
}
JS
```

### Follow-up integration checks after assignment

Reuse `tests/platformer.browser.js` for existing gameplay coverage, extending only the missed invariants above. Run `npm test` and `npm run build` after app edits. Those suites/build were not run as part of this research-only assignment; the source reproduction above was.

Any later browser verification must use a fresh uniquely named session, launch with `--args '--mute-audio'`, and close it afterwards. Do not run the existing test header's shared `chofis-v3` session verbatim. Browser mute suppresses output; do not treat silence as evidence that the Web Audio graph failed to start.

## Primary documentation consulted

Fetched official documentation directly over HTTP; browser automation was unnecessary. Installed dependency source is authoritative for version-sensitive behavior. The live Phaser API pages can have newer source line numbers/API additions; the versioned source links above pin conclusions to 3.90.0.

- [Phaser Scale Manager](https://docs.phaser.io/api-documentation/class/scale-scalemanager): NONE/RESIZE behavior, resize/zoom contract.
- [Phaser Camera](https://docs.phaser.io/api-documentation/class/cameras-scene2d-camera): camera pre-render and follow lifecycle.
- [Phaser Arcade World](https://docs.phaser.io/api-documentation/class/physics-arcade-world): fixed-step semantics.
- [Phaser scene concepts](https://docs.phaser.io/phaser/concepts/scenes): scene lifecycle and events.
- [Phaser audio concepts](https://docs.phaser.io/phaser/concepts/audio): user gestures, locked audio and sound configuration.
- [Three r170 WebGLRenderer documentation](https://github.com/mrdoob/three.js/blob/r170/docs/api/en/renderers/WebGLRenderer.html): renderer context, pixel ratio and disposal.
- [Three r170 responsive rendering manual](https://github.com/mrdoob/three.js/blob/r170/manual/en/responsive.html): CSS versus drawing-buffer dimensions and high-density pixel cost.
- [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio): monitor/page-zoom changes and media-query monitoring.

No stylistic refactor, new dependency, engine migration, or licensing change is needed for these findings.
