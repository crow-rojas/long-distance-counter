import Phaser from "phaser";
import "./game.css";
import { isPreview } from "../countdown/compute";
import { replyFor, formatText } from "./dialogue";
import texts from "./es.json";
import { setButtonIcon } from "./button-icons";
import { readStamps, readyForCrow } from "./progress";
import { createLevel, type Platform } from "./level";
import { defaultMap, type MapData } from "./map-data";
import { STAMPS } from "./progress";

// Exported for browser integration checks; Phaser remains the only game runtime.
export let game: Phaser.Game;

export async function startGame(options:{map?:MapData; editing?:boolean; sandbox?:boolean; spawn?:{x:number;y:number}; fullBag?:boolean} = {}): Promise<void> {
  const {MAP,platformRecords,BENCHES,CHECKPOINTS,ENDING_GATE_X,FRIENDS,ITEMS,nextStop,PLATFORMS,SIDE_PLATFORMS,WORLD_WIDTH} = createLevel(options.map);
  const root = document.createElement("main");
  root.id = "fonda";
  root.innerHTML = `<div id="platformer"></div>
    <header class="game-hud"><ul id="provisions"></ul><p id="objective" aria-live="polite"></p></header>
    <button id="sound" aria-pressed="false"><svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M11 4 6 8H3v8h3l5 4Z"/>
      <path class="sound-on" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>
      <path class="sound-off" d="m16 9 5 6m0-6-5 6"/>
    </svg></button>
    <p id="intro-text" role="status" hidden></p>
    <button id="skip-intro" hidden></button>
    <button id="reset-preview" hidden></button>
    <p id="speech" role="status" hidden></p>
    <button id="interact" hidden></button>
    <button id="read-letter" hidden></button>
    <dialog id="conversation" aria-labelledby="speaker"><p id="speaker"></p><p id="dialogue-text"></p><button id="close-conversation"></button></dialog>
    <dialog id="gallery" aria-labelledby="gallery-title"><h1 id="gallery-title" tabindex="-1"></h1><div class="drawings"><img src="/game/marin-devil.png"><img src="/game/marin-bunny.png"></div><button id="close-gallery"></button></dialog>
    <p class="keyboard-help"></p>
    <nav class="touch-controls"><div><button data-control="left"></button><button data-control="right"></button></div><button data-control="jump"></button></nav>
    <dialog id="letter" aria-labelledby="letter-title"><h1 id="letter-title" tabindex="-1"></h1><div class="reunion"><img src="/game/chofis-happy.png"><span aria-hidden="true"></span><img src="/game/crow-happy.png"></div><p></p><button id="close-letter"></button></dialog>`;
  // Editable copy is plain text, including quotes, angle brackets and line breaks.
  for (const [selector, text] of Object.entries({
    "#objective": texts.interfaz.cargando,
    "#intro-text": texts.intro.texto,
    "#gallery-title": texts.galeria.titulo,
    ".keyboard-help": texts.interfaz.controles.ayudaTeclado,
    "#letter-title": texts.carta.titulo,
    ".reunion span": texts.carta.corazon,
    "#letter > p": texts.carta.texto,
  })) root.querySelector(selector)!.textContent = text;
  for (const [selector, icon, label] of [
    ["#skip-intro","skip",texts.intro.saltar],
    ["#reset-preview","reset",texts.interfaz.reiniciar],
    ["#interact","talk",texts.interfaz.interaccion.hablar],
    ["#close-conversation","continue",texts.interfaz.interaccion.seguir],
    ["#close-gallery","close",texts.galeria.volver],
    ["#close-letter","close",texts.carta.volver],
    ["#read-letter","letter",texts.final.releer],
    ["[data-control=left]","left",texts.interfaz.controles.moverIzquierda],
    ["[data-control=right]","right",texts.interfaz.controles.moverDerecha],
    ["[data-control=jump]","jump",texts.interfaz.controles.saltar],
  ] as const) setButtonIcon(root.querySelector<HTMLButtonElement>(selector)!,icon,label);
  for (const [selector, attribute, text] of [
    ["#sound", "aria-label", texts.interfaz.sonido.activar],
    ["#sound", "title", texts.interfaz.sonido.desactivado],
    ["#provisions", "aria-label", texts.interfaz.misionInicial],
    ["#reset-preview", "title", `${texts.interfaz.reiniciar} (${texts.interfaz.atajoReiniciar})`],
    ["#interact", "data-prefix", texts.interfaz.interaccion.prefijoTecla],
    ["#close-conversation", "data-prefix", texts.interfaz.interaccion.prefijoTecla],
    [".touch-controls", "aria-label", texts.interfaz.controles.descripcion],
    ["[data-control=left]", "aria-label", texts.interfaz.controles.moverIzquierda],
    ["[data-control=right]", "aria-label", texts.interfaz.controles.moverDerecha],
    ["[data-control=jump]", "aria-label", texts.interfaz.controles.saltar],
    [".drawings img:first-child", "alt", texts.galeria.marinDiablita],
    [".drawings img:last-child", "alt", texts.galeria.marinConejita],
    [".reunion img:first-child", "alt", texts.personajes.Chofis],
    [".reunion img:last-child", "alt", texts.personajes.Crow],
  ]) root.querySelector(selector)!.setAttribute(attribute,text);
  document.body.append(root);
  root.inert = true;
  const sky = new Image();
  sky.src = "/game/cielo-fonda.webp";
  const skyReady = sky.decode().catch(() => {
    root.style.backgroundImage = "linear-gradient(#353444,#62575e)";
  });
  const objective = root.querySelector<HTMLElement>("#objective")!;
  const speech = root.querySelector<HTMLElement>("#speech")!;
  const interact = root.querySelector<HTMLButtonElement>("#interact")!;
  const letter = root.querySelector<HTMLDialogElement>("#letter")!;
  const readLetter = root.querySelector<HTMLButtonElement>("#read-letter")!;
  const conversation = root.querySelector<HTMLDialogElement>("#conversation")!;
  const gallery = root.querySelector<HTMLDialogElement>("#gallery")!;
  const soundButton = root.querySelector<HTMLButtonElement>("#sound")!;
  const introText = root.querySelector<HTMLElement>("#intro-text")!;
  const skipIntro = root.querySelector<HTMLButtonElement>("#skip-intro")!;
  const preview = isPreview;
  const key = (preview ? "chofis-platformer-preview" : "chofis-platformer") + (MAP.id===defaultMap.id ? "" : `:${MAP.id}`);
  let saved: string | null = null;
  let savedCheckpoint: string | null = null;
  let introSeen = !!options.sandbox;
  let endingSeen = false;
  try {
    if (!options.sandbox) {
      saved = localStorage.getItem(key);
      savedCheckpoint = localStorage.getItem(`${key}:checkpoint`);
      introSeen = localStorage.getItem(`${key}:intro-seen`) === "1";
      endingSeen = localStorage.getItem(`${key}:ending-seen`) === "1";
    }
  } catch { /* Storage is optional. */ }
  const stamps = readStamps(options.fullBag ? JSON.stringify(STAMPS) : saved);
  const provisions = root.querySelector("#provisions")!;
  for (const item of ITEMS) {
    const slot = document.createElement("li");
    slot.dataset.food = item.id;
    const image = document.createElement("img");
    image.src = `/game/sticker-${item.id}.png`;
    image.alt = "";
    slot.append(image);
    provisions.append(slot);
  }
  const updateFood = () => {
    for (const item of ITEMS) {
      const slot = provisions.querySelector<HTMLElement>(`[data-food="${item.id}"]`)!;
      const collected = stamps.has(item.id);
      slot.classList.toggle("collected",collected);
      slot.title = formatText(texts.interfaz.progreso.estado,{
        comida:texts.comida[item.id],
        estado:collected ? texts.interfaz.progreso.lista : texts.interfaz.progreso.pendiente,
      });
      slot.setAttribute("aria-label",slot.title);
    }
  };
  updateFood();
  let checkpointIndex = platformRecords.findIndex(p=>p.id===savedCheckpoint);
  // Old releases saved array positions. New saves use IDs so reordering a map is safe.
  if (checkpointIndex<0 && MAP.id===defaultMap.id && savedCheckpoint!==null && /^\d+$/.test(savedCheckpoint)) {
    checkpointIndex=platformRecords.findIndex(p=>p.id===`platform-${Number(savedCheckpoint)}`);
  }
  const hasCheckpoint = CHECKPOINTS.includes(checkpointIndex);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = motion.matches;
  let pixelRatio = Math.min(window.devicePixelRatio || 1,3);
  const held = new Map<number, string>();
  const events = new AbortController();
  let loadFailed = false;

  await new Promise<void>((resolve, reject) => {
    class Fonda extends Phaser.Scene {
      player!: Phaser.Physics.Arcade.Sprite;
      avatar!: Phaser.GameObjects.Image;
      portraits = new Map<string, Phaser.GameObjects.Image>();
      keys!: Record<string, Phaser.Input.Keyboard.Key>;
      spawn = { x: 120, y: 625 };
      lastGrounded = -1000;
      bufferedUntil = 0;
      touchJump = false;
      nearby: typeof FRIENDS[number] | undefined;
      nearbyBench?: typeof BENCHES[number];
      seatedBench?: typeof BENCHES[number];
      speechUntil = 0;
      fallExplained = false;
      foodRecoveryExplained = false;
      lastObjective = "";
      won = false;
      wasGrounded = true;
      landingUntil = 0;
      lastVelocityY = 0;
      facing = 1;
      lastMoving = -1000;
      levelTime = 0;
      lastCheckpoint = -1;
      platforms: { definition: Platform; sprite: Phaser.Physics.Arcade.Image; art: Phaser.GameObjects.Container; crumbleAt: number; restoreAt: number }[] = [];
      focusedFriend?: typeof FRIENDS[number];
      baseZoom = 1;
      soundEnabled = false;
      music?: Phaser.Sound.BaseSound;
      presented = false;
      introActive = false;
      introElapsed = 0;
      introStatic = reduced;
      introEnd = { x:0, y:0 };
      introTravel = 0;
      endingPhase?: "walking" | "together" | "finished";
      endingElapsed = 0;
      endingStartX = ENDING_GATE_X;
      endingStartY = 650;
      endingLanding = 0;
      endingCameraStart = new Phaser.Math.Vector2();
      endingStatic = reduced;
      gate!: Phaser.GameObjects.Container;
      gateLabel!: Phaser.GameObjects.Text;
      hearts: Phaser.GameObjects.Graphics[] = [];

      preload() {
        const images = ["chofis-front", "chofis-happy", "ramada", "volantin", "copihue", ...MAP.decorations.filter(d=>d.image!=="garland").map(d=>d.image), ...FRIENDS.filter(f => !f.image.endsWith("-poses")).map(f => f.image), ...ITEMS.map(i => `sticker-${i.id}`)];
        images.push("bench","lantern","flowerpot","sign");
        for (let i=0;i<4;i++) images.push(`distant-island-${i}`);
        for (const variant of ["stable","fragile"]) for (const size of ["small","medium","large"]) images.push(`island-${variant}-${size}`);
        for (const image of new Set(images)) this.load.image(image, `/game/${image}.png`);
        for (const sheet of ["chofis-run", "chofis-jump", "crow-poses", "marin-poses"]) {
          this.load.spritesheet(sheet, `/game/${sheet}.png`, {frameWidth:320,frameHeight:320});
        }
        for (const name of ["jump", "tap", "coin", "power_up"]) this.load.audio(name, `/game/audio/${name}.wav`);
        this.load.audio("music","/game/audio/piano.mp3");
        this.load.on("loaderror", (file: Phaser.Loader.File) => { if (file.type === "image" || file.type === "spritesheet") loadFailed = true; });
      }

      create() {
        if (loadFailed) { reject(new Error("Artwork failed to load")); return; }
        this.sound.setMute(true);
        if (this.cache.audio.exists("music")) this.music = this.sound.add("music",{loop:true,volume:.65});
        const playMusic = () => {
          if (this.soundEnabled && !this.sound.locked && this.music && !this.music.isPlaying) this.music.play();
        };
        this.sound.on(Phaser.Sound.Events.UNLOCKED,playMusic);
        soundButton.addEventListener("click",() => {
          this.soundEnabled = !this.soundEnabled;
          this.sound.setMute(!this.soundEnabled);
          soundButton.title = this.soundEnabled ? texts.interfaz.sonido.activado : texts.interfaz.sonido.desactivado;
          soundButton.setAttribute("aria-pressed",String(this.soundEnabled));
          soundButton.setAttribute("aria-label",this.soundEnabled ? texts.interfaz.sonido.silenciar : texts.interfaz.sonido.activar);
          playMusic();
          this.game.canvas.focus({preventScroll:true});
        },{signal:events.signal});
        for (const event of ["keydown","keyup"] as const) soundButton.addEventListener(event,e => {
          if (e.code === "Space" || e.code === "Enter") e.stopPropagation();
        },{signal:events.signal});
        if (import.meta.env.DEV && preview && !options.sandbox) {
          const reset = () => {
            try {
              localStorage.removeItem(key);
              localStorage.removeItem(`${key}:checkpoint`);
              localStorage.removeItem(`${key}:intro-seen`);
              localStorage.removeItem(`${key}:ending-seen`);
            } catch { /* Reload also clears in-memory progress. */ }
            location.reload();
          };
          const button = root.querySelector<HTMLButtonElement>("#reset-preview")!;
          button.hidden = false;
          button.addEventListener("click",reset,{signal:events.signal});
          window.addEventListener("keydown",e => {
            if (e.shiftKey && e.code === "KeyR" && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault(); reset();
            }
          },{signal:events.signal});
        }
        this.keys = this.input.keyboard!.addKeys("LEFT,RIGHT,A,D,SPACE,UP,W,E") as typeof this.keys;
        this.physics.world.setBounds(0, -500, WORLD_WIDTH, 2200);
        const ground = this.physics.add.group({allowGravity:false,immovable:true});
        [...PLATFORMS,...SIDE_PLATFORMS].forEach((definition,index) => {
          const [x,y,w,kind] = definition;
          const sprite = this.physics.add.image(x,y,"__WHITE").setOrigin(0,0).setVisible(false);
          ground.add(sprite);
          sprite.setDisplaySize(w,28).setBodySize(sprite.width,sprite.height).setOffset(0,0).setFriction(1,0);
          const body = sprite.body as Phaser.Physics.Arcade.Body;
          body.checkCollision.down = body.checkCollision.left = body.checkCollision.right = false;
          const size = w<=180 ? "small" : w<=280 ? "medium" : "large";
          const image = this.add.image(0,0,`island-${kind==="fragile" ? "fragile" : "stable"}-${size}`);
          // Prepared textures share a walkable edge at row 112; physics stays at y.
          image.setOrigin(0,112/image.height).setDisplaySize(w,Math.min(210,w*.68));
          const markings = this.add.graphics();
          const art = this.add.container(x,y,[image,markings]).setData("mapId",platformRecords[index].id);
          if (kind === "checkpoint") {
            markings.lineStyle(2,0xe8d9ba,.7).lineBetween(65,0,65,-48);
            markings.fillStyle(0xe8d9ba).fillTriangle(65,-48,90,-37,65,-26);
          } else if (kind?.startsWith("moving")) {
            markings.lineStyle(3,0xade2d1,.85).lineBetween(10,7,w-10,7);
            sprite.setVelocity(kind === "moving-x" ? 65 : 0,kind === "moving-y" ? 40 : 0);
          }
          sprite.setData("index",index);
          this.platforms.push({definition,sprite,art,crumbleAt:0,restoreAt:0});
        });
        this.decorations();
        this.lastCheckpoint = hasCheckpoint ? checkpointIndex :
          CHECKPOINTS.filter(index=>PLATFORMS[index][0]<=nextStop(stamps).x).at(-1) ?? CHECKPOINTS[0];
        const checkpoint = PLATFORMS[this.lastCheckpoint];
        this.spawn = options.spawn ?? (!hasCheckpoint && !stamps.size ? {...MAP.spawn} : { x:checkpoint[0]+Math.min(120,checkpoint[2]-25),y:checkpoint[1]-25 });
        this.player = this.physics.add.sprite(this.spawn.x,this.spawn.y,"__WHITE").setOrigin(.5,1).setDisplaySize(40.625,58.75).setVisible(false);
        this.player.setBodySize(this.player.width,this.player.height).setOffset(0,0).setMaxVelocity(340,1100).setDragX(2800);
        this.avatar = this.add.image(this.spawn.x,this.spawn.y,"chofis-front").setOrigin(.5,.9625).setDisplaySize(100,100).setDepth(5);
        this.events.on(Phaser.Scenes.Events.POST_UPDATE,(_time: number, delta: number) => {
          this.avatar.setPosition(this.player.x,this.player.y-(this.seatedBench ? 28 : 0));
          if (this.presented && !options.editing && !this.introActive && !this.focusedFriend) this.updatePlatforms(delta);
        });
        this.events.on(Phaser.Scenes.Events.RENDER,() => this.positionInteraction());
        this.physics.add.collider(this.player,ground,(_player,platform) => {
          if (!this.player.body!.touching.down) return;
          const index = (platform as Phaser.Physics.Arcade.Image).getData("index") as number;
          const island = this.platforms[index];
          if (island.definition[3] === "checkpoint") {
            this.spawn = { x:island.definition[0]+Math.min(120,island.definition[2]-25),y:island.definition[1]-25 };
            if (index !== this.lastCheckpoint) {
              this.lastCheckpoint = index;
              try { if (!options.sandbox) localStorage.setItem(`${key}:checkpoint`,platformRecords[index].id); } catch { /* Session checkpoint still works. */ }
            }
          } else if (island.definition[3] === "fragile" && !island.crumbleAt && !island.restoreAt) {
            island.crumbleAt = this.levelTime+850;
          }
        });
        for (const item of ITEMS) {
          if (stamps.has(item.id)) continue;
          const halo = this.add.circle(item.x,item.y,44,0xffb6d1,.1).setStrokeStyle(1,0xffc3d9,.5);
          const food = this.physics.add.staticImage(item.x,item.y,`sticker-${item.id}`).setData("mapId",item.id);
          food.setScale(65/Math.max(food.width,food.height)).refreshBody();
          // Keep pickup reach consistent even when the drawing is tall or narrow.
          food.body!.setSize(72,72);
          const label = this.add.text(item.x,item.y-62,texts.comida[item.id],{fontFamily:"Georgia",fontSize:"16px",color:"#ffe5ef",resolution:pixelRatio}).setOrigin(.5);
          this.physics.add.overlap(this.player,food,() => {
            food.destroy(); halo.destroy(); label.destroy();
            this.effect("coin",.3);
            if (!reduced) for (let i=0;i<7;i++) {
              const spark = this.add.circle(item.x,item.y,3,0xffd8b5).setDepth(6);
              this.tweens.add({targets:spark,x:item.x+Math.cos(i*Math.PI*2/7)*65,y:item.y+Math.sin(i*Math.PI*2/7)*65,alpha:0,scale:0,duration:450,onComplete:() => spark.destroy()});
            }
            stamps.add(item.id);
            updateFood();
            this.updateGate();
            try { if (!options.sandbox) localStorage.setItem(key,JSON.stringify([...stamps])); } catch { /* Keep this session playable. */ }
            this.say(texts.personajes.Chofis,texts.recogida[item.id],2500);
          });
        }
        this.restoreCamera();
        this.scale.on("resize",() => {
          if (options.editing) return;
          if (this.endingPhase) this.drawEnding();
          else if (this.introActive) this.layoutIntro();
          else if (this.focusedFriend) this.focusCamera(this.focusedFriend,true);
          else this.restoreCamera();
        });
        const resize = () => {
          const density = Math.min(window.devicePixelRatio || 1,3);
          if (density !== pixelRatio) {
            pixelRatio = density;
            // Text lives directly in the scene or in a platform container.
            for (const child of this.children.list) {
              const objects = child instanceof Phaser.GameObjects.Container ? child.list : [child];
              for (const object of objects) if (object instanceof Phaser.GameObjects.Text) object.setResolution(pixelRatio);
            }
          }
          this.scale.resize(Math.round(root.clientWidth*pixelRatio),Math.round(root.clientHeight*pixelRatio));
          this.scale.setZoom(1/pixelRatio);
        };
        window.addEventListener("resize",resize,{signal:events.signal});
        // A density-only change does not reliably send resize or media-query events.
        this.events.on(Phaser.Scenes.Events.PRE_UPDATE,() => {
          if (Math.min(window.devicePixelRatio || 1,3) !== pixelRatio) resize();
        });
        resize();
        this.game.events.on(Phaser.Core.Events.BLUR,() => { held.clear(); this.keys && this.input.keyboard!.resetKeys(); this.bufferedUntil = 0; });
        interact.addEventListener("click",() => this.useInteraction(),{signal:events.signal});
        readLetter.addEventListener("click",() => this.openLetter(),{signal:events.signal});
        for (const dialog of [conversation,gallery,letter]) {
          dialog.querySelector("button")!.addEventListener("click",() => dialog.close(),{signal:events.signal});
          dialog.addEventListener("close",() => this.resumeGameplay(),{signal:events.signal});
          dialog.addEventListener("keydown",e => {
            if (e.code === "KeyE" && !e.repeat) { e.preventDefault(); dialog.close(); }
          },{signal:events.signal});
        }
        this.game.canvas.setAttribute("tabindex","0");
        this.game.canvas.setAttribute("aria-label",texts.interfaz.controles.descripcionJuego);
        this.physics.pause();
        this.input.keyboard!.enabled = false;
        this.input.keyboard!.disableGlobalCapture();
        skipIntro.addEventListener("click",() => this.finishIntro(),{signal:events.signal});
        for (const event of ["keydown","keyup"] as const) skipIntro.addEventListener(event,e => {
          if (e.code === "Space" || e.code === "Enter") e.stopPropagation();
        },{signal:events.signal});
        window.addEventListener("keydown",e => {
          if (e.code === "Escape" && this.introActive) { e.preventDefault(); this.finishIntro(); }
        },{signal:events.signal});
        const staticIntro = () => {
          if (!this.introActive) return;
          this.introStatic = true;
          this.drawIntro();
        };
        document.addEventListener("visibilitychange",() => {
          if (!document.hidden) staticIntro();
        },{signal:events.signal});
        motion.addEventListener("change",() => {
          if (!motion.matches) return;
          staticIntro();
          if (this.endingPhase) {
            this.endingStatic = true;
            this.endingElapsed = Math.max(3000,this.endingElapsed);
            this.drawEnding();
          }
        },{signal:events.signal});
        const show = () => {
          if (document.hidden || this.presented || events.signal.aborted) return;
          this.presented = true;
          root.inert = false;
          if (options.editing) {
            root.classList.add("map-editing");
            this.avatar.setVisible(false);
            this.cameras.main.stopFollow().removeBounds();
            this.add.image(MAP.spawn.x,MAP.spawn.y,"chofis-front").setOrigin(.5,1)
              .setDisplaySize(100,100).setAlpha(.6).setDepth(8).setData("mapId",MAP.spawn.id);
          } else if (endingSeen && readyForCrow(stamps)) this.startEnding(true);
          else if (!introSeen && !stamps.size && !hasCheckpoint) {
            this.introActive = true;
            this.introStatic = motion.matches;
            this.player.body!.reset(this.spawn.x,this.spawn.y);
            root.classList.add("introducing");
            skipIntro.hidden = false;
            this.layoutIntro();
            skipIntro.focus({preventScroll:true});
          } else this.resumeGameplay(false);
          // Commit opacity:0 before changing the class, including warm-cache loads.
          void root.offsetWidth;
          document.body.classList.add("playing");
          document.getElementById("hero")?.setAttribute("aria-hidden","true");
          document.documentElement.lang = "es";
          document.title = texts.interfaz.titulo;
          resolve();
        };
        void skyReady.then(() => {
          if (events.signal.aborted) return;
          document.addEventListener("visibilitychange",show,{signal:events.signal});
          show();
        });
      }

      layoutIntro() {
        this.restoreCamera();
        const camera = this.cameras.main;
        camera.stopFollow();
        this.introEnd = { x:camera.scrollX, y:camera.scrollY };
        this.introTravel = Math.min(360,camera.height/camera.zoom*.35);
        camera.removeBounds();
        this.drawIntro();
      }

      drawIntro() {
        const progress = this.introStatic ? 1 : Phaser.Math.Clamp((this.introElapsed-1500)/2500,0,1);
        this.cameras.main.setScroll(this.introEnd.x,this.introEnd.y-this.introTravel*(1-Phaser.Math.Easing.Sine.InOut(progress)));
        introText.hidden = !this.introStatic && this.introElapsed < 4000;
        setButtonIcon(skipIntro,this.introStatic ? "play" : "skip",this.introStatic ? texts.intro.jugar : texts.intro.saltar);
      }

      finishIntro() {
        if (!this.introActive) return;
        this.introActive = false;
        root.classList.remove("introducing");
        introText.hidden = skipIntro.hidden = true;
        try { if (!options.sandbox) localStorage.setItem(`${key}:intro-seen`,"1"); } catch { /* Playing does not require storage. */ }
        this.resumeGameplay(false);
        this.say(texts.personajes.Fonda,texts.intro.ayuda,5000);
      }

      decorations() {
        const g = this.add.graphics().setDepth(-1);
        // Low-contrast silhouettes move more slowly than the playable islands.
        for (let i=0;i<20;i++) {
          const x=i*850+130, y=420+Math.sin(i*2.3)*210;
          const island = this.add.image(x,y,`distant-island-${i%4}`).setDepth(-5).setScrollFactor(i%2 ? .22 : .14).setAlpha(.28);
          island.setScale(Math.min(430/island.width,240/island.height));
        }
        for (let i=0;i<45;i++) {
          const x = i*310+90, y = 260+Math.sin(i*3.1)*150;
          g.fillStyle(0xffcae6,.35).fillCircle(x,y,1.6);
          g.lineStyle(1,0xffc7df,.18).lineBetween(x-4,y,x+4,y).lineBetween(x,y-4,x,y+4);
        }
        for (const decoration of MAP.decorations) {
          const {x,y,height,image,originY,angle,depth,alpha,tint,id} = decoration;
          if (image === "garland") {
            const lights = this.add.graphics();
            for (let i=0;i<=8;i++) {
              const lx=-160+i*40, ly=Math.sin(i/8*Math.PI)*30;
              if (i) lights.lineStyle(1,0xecc9c1,.45).lineBetween(lx-40,Math.sin((i-1)/8*Math.PI)*30,lx,ly);
              lights.fillStyle(0xffd7a9,.06).fillCircle(lx,ly+5,13);
              lights.fillStyle(0xffdcaf,.85).fillCircle(lx,ly+5,3);
            }
            this.add.container(x,y,[this.add.rectangle(0,15,340,65,0,0),lights])
              .setScale(height/60).setAngle(angle).setDepth(depth).setAlpha(alpha).setData("mapId",id);
          } else {
            const art = this.add.image(x,y,image).setOrigin(.5,originY).setAngle(angle).setDepth(depth).setAlpha(alpha).setTint(tint).setData("mapId",id);
            art.setScale(height/art.height);
            if (image === "lantern") this.add.circle(x,y+height*.8,42*height/100,0xffd394,.07).setDepth(depth-1);
            if (image === "ramada") this.add.ellipse(x,y-height*.33,230*height/300,260*height/300,0xffc397,.055).setDepth(depth-1);
            if (image === "volantin" && !reduced && !options.editing) this.tweens.add({targets:art,y:y-12,angle:angle+15,duration:3600+x/2,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
          }
        }
        FRIENDS.forEach(friend => {
          const image = this.add.image(friend.x,friend.y,friend.image,0).setOrigin(.5,friend.image.endsWith("-poses") ? .9625 : 1);
          image.setDisplaySize(friend.height*image.width/image.height,friend.height).setData("mapId",friend.id);
          if (friend.name === "Tus dibujos") {
            g.fillStyle(0x382a35).fillRoundedRect(friend.x-65,friend.y-123,130,128,5);
            g.lineStyle(3,0xd2ad82).strokeRoundedRect(friend.x-65,friend.y-123,130,128,5);
          }
          this.portraits.set(friend.name,image);
          image.setInteractive({useHandCursor:true}).on("pointerup",() => this.talk(friend));
        });
        // A small wooden entrance, using the same cream and plum as the fonda.
        const posts = this.add.graphics().setDepth(2);
        posts.fillStyle(0x765448).fillRoundedRect(-43,-118,9,118,3).fillRoundedRect(34,-118,9,118,3);
        posts.lineStyle(4,0xe8c6a0).lineBetween(-46,-118,46,-118);
        const bars = this.add.graphics().fillStyle(0xb99069);
        for (const x of [-30,-10,10,30]) bars.fillRoundedRect(x-4,-90,8,90,2);
        bars.fillRect(-34,-68,68,8).fillRect(-34,-27,68,8);
        this.gate = this.add.container(0,0,[bars]);
        this.gateLabel = this.add.text(0,-140,"",{
          fontFamily:"Georgia",fontSize:"16px",color:"#f1d7ae",align:"center",resolution:pixelRatio,
          shadow:{color:"#171320",blur:5,fill:true},
        }).setOrigin(.5,1);
        this.add.container(ENDING_GATE_X,MAP.ending.y,[this.add.rectangle(0,-75,100,150,0,0),posts,this.gate,this.gateLabel])
          .setDepth(2).setData("mapId",MAP.ending.id);
        this.updateGate();
        const heart = Array.from({length:48},(_,i) => {
          const t=i*Math.PI*2/48;
          return new Phaser.Math.Vector2(16*Math.sin(t)**3,-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t)));
        });
        for (let i=0;i<5;i++) this.hearts.push(this.add.graphics().fillStyle(i%2 ? 0xf1d7ae : 0xffb6d1)
          .fillPoints(heart,true).setScale(.55).setDepth(6).setVisible(false));
        for (const bench of BENCHES) {
          this.add.image(bench.x,bench.y,"bench").setOrigin(.5,1).setDepth(-1)
            .setDisplaySize(140,bench.height).setData("mapId",bench.id).setInteractive({useHandCursor:true})
            .on("pointerup",() => this.useBench(bench));
        }
        for (const sign of MAP.signs) {
          const content = sign.text || texts.carteles[sign.textKey];
          const label = this.add.text(0,sign.board ? -81 : 0,content,{
            fontFamily:"Georgia",fontSize:sign.board ? "20px" : sign.textKey==="fonda" ? "27px" : "18px",
            color:sign.board ? "#382938" : "#f1d7ae",align:"center",lineSpacing:3,resolution:pixelRatio,
          }).setOrigin(.5);
          const children:Phaser.GameObjects.GameObject[] = [];
          if (sign.board) children.push(this.add.image(0,0,"sign").setOrigin(.5,1).setDisplaySize(175,135));
          children.push(label);
          this.add.container(sign.x,sign.y,children).setDepth(-1).setData("mapId",sign.id);
        }
      }

      restoreCamera(animate=false) {
        const camera = this.cameras.main;
        camera.panEffect.reset(); camera.zoomEffect.reset();
        this.baseZoom = pixelRatio*Math.min(1.1,Math.max(.65,Math.min(root.clientHeight/850,root.clientWidth/580)));
        camera.setBounds(0,-350,WORLD_WIDTH,1500);
        if (animate && !reduced) camera.zoomTo(this.baseZoom,250,"Sine.easeInOut");
        else camera.setZoom(this.baseZoom);
        camera.startFollow(this.player,false,reduced ? 1 : .14,reduced ? 1 : .1,-this.scale.width*.12/this.baseZoom,this.scale.height*.17/this.baseZoom);
      }

      focusCamera(friend: typeof FRIENDS[number], immediate=false) {
        const camera = this.cameras.main;
        camera.stopFollow();
        camera.removeBounds();
        camera.panEffect.reset(); camera.zoomEffect.reset();
        this.baseZoom = pixelRatio*Math.min(1.1,Math.max(.65,Math.min(root.clientHeight/850,root.clientWidth/580)));
        const zoom = this.baseZoom*(reduced ? 1 : 1.2);
        const x = (this.player.x+friend.x)/2, y=friend.y-70-this.scale.height*.12/zoom;
        if (immediate || reduced) camera.setZoom(zoom).centerOn(x,y);
        else { camera.zoomTo(zoom,300,"Sine.easeInOut"); camera.pan(x,y,300,"Sine.easeInOut"); }
      }

      pauseGameplay(friend: typeof FRIENDS[number]) {
        this.stand();
        this.focusedFriend = friend;
        this.player.setVelocity(0).setAccelerationX(0);
        held.clear(); this.touchJump = false; this.bufferedUntil = 0;
        this.input.keyboard!.resetKeys();
        this.input.keyboard!.enabled = false;
        this.input.keyboard!.disableGlobalCapture();
        this.physics.pause();
        interact.hidden = true; speech.hidden = true;
        root.classList.add("conversing");
        this.focusCamera(friend);
      }

      resumeGameplay(animate=true) {
        if (this.endingPhase) {
          if (this.won) {
            readLetter.hidden = false;
            readLetter.focus({preventScroll:true});
          }
          return;
        }
        this.focusedFriend = undefined;
        held.clear();
        this.input.keyboard!.enabled = true;
        this.input.keyboard!.enableGlobalCapture();
        this.input.keyboard!.resetKeys();
        this.lastGrounded = -1000; this.bufferedUntil = 0; this.touchJump = false;
        this.physics.resume();
        root.classList.remove("conversing");
        this.restoreCamera(animate);
        this.game.canvas.focus({preventScroll:true});
      }

      updateGate() {
        const open = readyForCrow(stamps);
        this.gate.setVisible(!open);
        this.gateLabel.setText(open ? texts.final.entradaAbierta : texts.final.entradaCerrada);
      }

      startEnding(restored=false) {
        if (this.endingPhase || !readyForCrow(stamps)) return;
        const crow = FRIENDS.find(friend => friend.name === "Crow")!;
        this.endingPhase = "walking";
        this.endingStatic = motion.matches;
        this.endingStartX = Phaser.Math.Clamp(this.player.x,ENDING_GATE_X,crow.x-82);
        this.endingStartY = this.player.y;
        this.endingLanding = !restored && !this.endingStatic && Math.abs(this.player.y-crow.y)>5 ? 350 : 0;
        this.endingElapsed = restored ? 5000 : this.endingStatic ? 3000 : 0;
        this.cameras.main.getWorldPoint(this.cameras.main.width/2,this.cameras.main.height/2,this.endingCameraStart);
        this.pauseGameplay(crow);
        this.gateLabel.setVisible(false);
        root.classList.remove("conversing");
        root.classList.add("ending");
        this.cameras.main.panEffect.reset();
        this.cameras.main.zoomEffect.reset();
        for (const portrait of this.portraits.values()) this.tweens.killTweensOf(portrait);
        this.portraits.get("Crow")!.setAngle(0).setFrame(1).setData("poseUntil",0);
        this.avatar.setCrop().setDisplaySize(100,100).setAngle(0);
        this.drawEnding();
        if (restored) this.finishEnding(false);
      }

      drawEnding() {
        const crow = FRIENDS.find(friend => friend.name === "Crow")!;
        const elapsed = Math.max(0,this.endingElapsed-this.endingLanding);
        const progress = this.endingStatic ? 1 : Math.min(1,elapsed/3000);
        const landing = this.endingLanding ? Math.min(1,this.endingElapsed/this.endingLanding) : 1;
        this.player.setPosition(Phaser.Math.Linear(this.endingStartX,crow.x-82,progress),
          Phaser.Math.Linear(this.endingStartY,crow.y,landing));
        this.avatar.setPosition(this.player.x,this.player.y).setFlipX(false);
        if (landing < 1) this.avatar.setTexture("chofis-jump",1);
        else if (progress < 1) this.avatar.setTexture("chofis-run",Math.floor(elapsed/180)%3);
        else {
          this.endingPhase = this.won ? "finished" : "together";
          this.avatar.setTexture("chofis-happy").setAngle(5);
          this.portraits.get("Crow")!.setFrame(2).setFlipX(true).setAngle(-5);
        }
        const camera = this.cameras.main;
        const focus = this.endingStatic ? 1 : Phaser.Math.Easing.Sine.InOut(Math.min(1,this.endingElapsed/2000));
        this.baseZoom = pixelRatio*Math.min(1.1,Math.max(.65,Math.min(root.clientHeight/850,root.clientWidth/580)));
        camera.setZoom(this.baseZoom*(this.endingStatic ? 1.2 : 1+progress*.35))
          .centerOn(Phaser.Math.Linear(this.endingCameraStart.x,(this.player.x+crow.x)/2,focus),
            Phaser.Math.Linear(this.endingCameraStart.y,crow.y-85,focus));
        for (const [i,heart] of this.hearts.entries()) {
          const rise = this.endingStatic ? 0 : Math.min(1,Math.max(0,(elapsed-3000-i*120)/1100));
          heart.setVisible(progress===1).setAlpha(this.endingStatic ? .8 : rise*.8)
            .setPosition(crow.x-41+(i-2)*22,crow.y-118-(i%2)*22-rise*30);
        }
      }

      finishEnding(showLetter=true) {
        if (this.won) return;
        this.won = true;
        this.endingPhase = "finished";
        this.drawEnding();
        objective.textContent = this.lastObjective = texts.interfaz.objetivoFinal;
        this.game.canvas.setAttribute("aria-label",texts.interfaz.zonaFinal);
        try { if (!options.sandbox) localStorage.setItem(`${key}:ending-seen`,"1"); } catch { /* The ending still works without storage. */ }
        readLetter.hidden = false;
        if (showLetter) {
          this.effect("power_up",.3);
          this.openLetter();
        }
      }

      openLetter() {
        if (!this.won || letter.open) return;
        letter.showModal();
        root.querySelector<HTMLElement>("#letter-title")!.focus({preventScroll:true});
      }

      positionInteraction() {
        const target = this.seatedBench ?? this.nearby ?? this.nearbyBench;
        if (options.editing || !target || !this.presented || this.introActive || this.focusedFriend) { interact.hidden = true; return; }
        const camera = this.cameras.main;
        const half = interact.offsetWidth/2+12;
        // The game camera pans and zooms without rotation.
        const origin = camera.getWorldPoint(0,0);
        const x = (target.x-origin.x)*camera.zoom/pixelRatio;
        const y = (target.y-target.height-origin.y)*camera.zoom/pixelRatio;
        interact.style.left = `${Phaser.Math.Clamp(x,half,root.clientWidth-half)}px`;
        interact.style.top = `${Math.max(145,y-55)}px`;
      }

      updatePlatforms(delta: number) {
        this.levelTime += Math.min(delta,50);
        for (const platform of this.platforms) {
          const {sprite,art,definition} = platform;
          const [x,y,,kind] = definition;
          if (kind === "moving-x") {
            if (sprite.x >= x+50) sprite.setVelocityX(-65);
            if (sprite.x <= x-50) sprite.setVelocityX(65);
          } else if (kind === "moving-y") {
            if (sprite.y >= y+40) sprite.setVelocityY(-40);
            if (sprite.y <= y-40) sprite.setVelocityY(40);
          }
          if (platform.crumbleAt && this.levelTime >= platform.crumbleAt) {
            platform.crumbleAt = 0; platform.restoreAt = this.levelTime+2500;
            sprite.body!.enable = false;
          }
          if (platform.restoreAt && this.levelTime >= platform.restoreAt) {
            platform.restoreAt = 0; sprite.body!.enable = true;
          }
          const falling = platform.restoreAt ? Phaser.Math.Clamp((this.levelTime-(platform.restoreAt-2500))/250,0,1) : 0;
          const shake = platform.crumbleAt && !reduced ? Math.sin(this.levelTime/22)*2 : 0;
          art.setPosition(sprite.x+shake,sprite.y+(reduced ? 0 : falling*65)).setAlpha(1-falling);
          if (platform.crumbleAt) art.setAlpha(reduced ? .75 : .7+Math.sin(this.levelTime/70)*.25);
        }
      }

      effect(name: string, volume: number) {
        if (this.soundEnabled && !this.sound.locked && this.cache.audio.exists(name)) this.sound.play(name,{volume});
      }

      say(name: string, text: string, duration=6500) {
        speech.textContent = formatText(texts.interfaz.subtitulo,{personaje:name,texto:text});
        speech.hidden = false;
        this.speechUntil = this.time.now+duration;
      }

      canSit(bench: typeof BENCHES[number]) {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        return this.presented && !this.introActive && !this.focusedFriend && (body.blocked.down || body.touching.down)
          && Math.abs(body.velocity.y)<1 && Math.abs(this.player.x-bench.x)<90
          && Math.abs(body.bottom-bench.y)<12;
      }

      useBench(bench: typeof BENCHES[number]) {
        if (options.editing || !this.presented || this.introActive || this.focusedFriend) return;
        if (this.seatedBench) {
          if (this.seatedBench === bench) this.stand();
          return;
        }
        if (!this.canSit(bench)) return;
        // Keep physics on the ground; sitting must not become a higher jump platform.
        this.player.body!.reset(bench.x,bench.y);
        this.player.setVelocity(0).setAccelerationX(0);
        this.seatedBench = bench;
        this.bufferedUntil = 0;
        this.touchJump = false;
        this.landingUntil = 0;
        this.say(texts.personajes.Fonda,texts.bancas.ayuda,3000);
        this.game.canvas.focus({preventScroll:true});
      }

      stand() {
        if (!this.seatedBench) return;
        this.seatedBench = undefined;
        this.avatar.setCrop();
        this.lastMoving = -1000;
        this.game.canvas.focus({preventScroll:true});
      }

      useInteraction() {
        if (this.seatedBench) this.stand();
        else if (this.nearby) this.talk();
        else if (this.nearbyBench) this.useBench(this.nearbyBench);
      }

      talk(friend = this.nearby) {
        if (options.editing || !friend || !this.presented || this.introActive || this.focusedFriend || Math.abs(friend.x-this.player.x)>=100 || Math.abs(friend.y-this.player.body!.bottom)>=85) return;
        if (friend.name === "Crow") return; // His encounter starts at the entrance, never on tap.
        const portrait = this.portraits.get(friend.name)!;
        this.tweens.killTweensOf(portrait);
        portrait.setY(friend.y).setAngle(0);
        if (friend.image.endsWith("-poses")) {
          portrait.setFrame(1).setData("poseUntil",this.time.now+2200);
        }
        if (!reduced && friend.name !== "Tus dibujos") {
          const angle = {Marin:3,Pibble:6,Supergirl:2,Krypto:8}[friend.name];
          this.tweens.add({
            targets:portrait,angle:angle*(this.player.x < friend.x ? -1 : 1),
            duration:friend.name === "Krypto" ? 280 : 180,
            hold:friend.name === "Krypto" ? 350 : 80,
            yoyo:true,repeat:friend.name === "Pibble" ? 1 : 0,ease:"Sine.easeInOut",
          });
        }
        this.pauseGameplay(friend);
        if (friend.name === "Tus dibujos") {
          gallery.showModal();
          root.querySelector<HTMLElement>("#gallery-title")!.focus({preventScroll:true});
          return;
        }
        this.effect("tap",.5);
        root.querySelector("#speaker")!.textContent = texts.personajes[friend.name];
        root.querySelector("#dialogue-text")!.textContent = replyFor(friend.name,stamps);
        conversation.showModal();
      }

      update(time: number, delta=0) {
        if (options.editing || !this.player || !this.presented) return;
        if (this.endingPhase) {
          if (document.hidden || this.won) return;
          this.endingElapsed += Math.min(delta,50);
          this.drawEnding();
          if (this.endingElapsed >= 5000+this.endingLanding) this.finishEnding();
          return;
        }
        if (this.introActive) {
          if (document.hidden) return;
          if (!this.introStatic) this.introElapsed += Math.min(delta,50);
          this.drawIntro();
          if (this.introElapsed >= 8000) this.finishIntro();
          return;
        }
        for (const friend of FRIENDS) {
          const portrait = this.portraits.get(friend.name)!;
          const until = portrait.getData("poseUntil");
          if (until && time > until) portrait.setFrame(0).setData("poseUntil",0);
          else if (until && portrait.texture.key === "marin-poses" && time > until-1500) portrait.setFrame(2);
          // Krypto's drawing faces right. A dead zone avoids flickering as Chofis crosses him.
          const distance = this.player.x-friend.x;
          if (friend.name === "Krypto" && !this.focusedFriend && Math.abs(distance)>40 &&
              Math.abs(distance)<240 && Math.abs(this.player.body!.bottom-friend.y)<100) {
            portrait.setFlipX(distance<0);
          }
        }
        if (this.focusedFriend) return;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const grounded = body.blocked.down || body.touching.down;
        if (!readyForCrow(stamps) && this.player.x>ENDING_GATE_X-24) {
          this.player.x = ENDING_GATE_X-24;
          this.player.setVelocityX(Math.min(0,body.velocity.x));
        } else if (readyForCrow(stamps) && this.player.x>=ENDING_GATE_X && body.bottom>=MAP.ending.y-220 && body.bottom<=MAP.ending.y+12) {
          this.startEnding();
          return;
        }
        if (grounded && !this.wasGrounded && this.lastVelocityY > 100) {
          this.landingUntil = time+150;
          this.effect("tap",.25);
        }
        this.wasGrounded = grounded;
        this.lastVelocityY = body.velocity.y;
        const touch = new Set(held.values());
        const left = this.keys.LEFT.isDown || this.keys.A.isDown || touch.has("left");
        const right = this.keys.RIGHT.isDown || this.keys.D.isDown || touch.has("right");
        const jumpHeld = this.keys.SPACE.isDown || this.keys.UP.isDown || this.keys.W.isDown || touch.has("jump");
        const jumpPressed = [this.keys.SPACE,this.keys.UP,this.keys.W].some(k => Phaser.Input.Keyboard.JustDown(k)) || this.touchJump;
        this.touchJump = false;
        if (this.seatedBench && (left || right || jumpPressed)) this.stand();
        if (grounded) this.lastGrounded = time;
        if (jumpPressed) this.bufferedUntil = time+120;
        if (this.bufferedUntil > time && time-this.lastGrounded < 100) {
          this.player.setVelocityY(-760);
          this.lastGrounded = -1000;
          this.bufferedUntil = 0;
          this.effect("jump",.18);
        }
        if (!jumpHeld && body.velocity.y < -420) this.player.setVelocityY(-420);
        const direction = Number(right)-Number(left);
        this.player.setAccelerationX(direction*3000);
        if (this.player.x < 25) { this.player.x=25; this.player.setVelocityX(Math.max(0,body.velocity.x)); }
        if (this.player.x > WORLD_WIDTH-25) { this.player.x=WORLD_WIDTH-25; this.player.setVelocityX(Math.min(0,body.velocity.x)); }
        if (direction) this.facing = direction;
        if (direction || Math.abs(body.velocity.x)>35) this.lastMoving = time;
        const moving = time-this.lastMoving < 120;
        if (!grounded) this.avatar.setTexture("chofis-jump",body.velocity.y < 0 ? 0 : 1).setFlipX(this.facing < 0);
        else if (moving) this.avatar.setTexture("chofis-run",reduced ? 0 : Math.floor(time/110)%3).setFlipX(this.facing < 0);
        else this.avatar.setTexture(this.won ? "chofis-happy" : "chofis-front").setFlipX(false);
        const landing = reduced ? 0 : Phaser.Math.Clamp((this.landingUntil-time)/150,0,1);
        const breath = reduced || !grounded || direction ? 0 : Math.sin(time/650)*.012;
        this.avatar.setDisplaySize(100*(1+landing*.12-breath),100*(1-landing*.1+breath+(!grounded && !reduced ? .055 : 0)));
        this.avatar.setAngle(reduced ? 0 : direction*3+(!grounded ? direction*2 : 0));
        if (this.seatedBench) {
          // Tuck the feet from the existing 320px pose onto the bench seat.
          this.avatar.setTexture(this.won ? "chofis-happy" : "chofis-front")
            .setCrop(0,0,320,270).setFlipX(false).setAngle(0);
        }
        if (this.player.y > 1050) {
          this.stand();
          body.reset(this.spawn.x,this.spawn.y);
          this.player.setVelocity(0);
          this.lastGrounded = -1000;
          this.bufferedUntil = 0;
          let reminder = this.fallExplained ? "" : texts.caidas.primeraSinComida;
          if (stamps.size && !this.foodRecoveryExplained) {
            reminder = this.fallExplained ? texts.caidas.conComida : texts.caidas.primeraConComida;
            this.foodRecoveryExplained = true;
          }
          this.fallExplained = true;
          if (reminder) this.say(texts.personajes.Fonda,reminder,3000);
        }
        const next = nextStop(stamps);
        const text = !readyForCrow(stamps) && this.player.x>ENDING_GATE_X-180
          ? replyFor("Crow",stamps)
          : formatText(texts.interfaz.objetivo,{instruccion:next.instruction,direccion:next.x < this.player.x-60 ? texts.interfaz.direccionIzquierda : ""});
        if (text !== this.lastObjective) { objective.textContent=text; this.lastObjective=text; }
        this.nearby = FRIENDS.find(friend => friend.name !== "Crow" && Math.abs(friend.x-this.player.x)<100 && Math.abs(friend.y-body.bottom)<85);
        this.nearbyBench = BENCHES.find(bench => this.canSit(bench));
        interact.hidden = !this.seatedBench && !this.nearby && !this.nearbyBench;
        if (this.seatedBench) setButtonIcon(interact,"stand",texts.bancas.levantarse);
        else if (this.nearby) {
          if (this.nearby.name === "Tus dibujos") setButtonIcon(interact,"gallery",texts.interfaz.interaccion.verDibujos);
          else setButtonIcon(interact,"talk",formatText(texts.interfaz.interaccion.conPersonaje,{personaje:texts.personajes[this.nearby.name]}));
        } else if (this.nearbyBench) setButtonIcon(interact,"sit",texts.bancas.sentarse);
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.useInteraction();
        if (time > this.speechUntil) speech.hidden=true;
      }
    }
    game = new Phaser.Game({
      type: Phaser.AUTO, parent: "platformer", transparent: true,
      // Phaser 3 RESIZE renders at CSS density; use physical pixels and scale the canvas back down.
      scale: { mode: Phaser.Scale.NONE, width: Math.round(root.clientWidth*pixelRatio), height: Math.round(root.clientHeight*pixelRatio), zoom:1/pixelRatio },
      render: { antialias: true, pixelArt: false },
      physics: { default: "arcade", arcade: { gravity: {x:0,y:1900}, fixedStep:true, fps:120 } },
      scene: Fonda,
      callbacks: { postBoot: () => {
        root.querySelectorAll<HTMLButtonElement>("[data-control]").forEach(button => {
          button.addEventListener("pointerdown",event => {
            const scene = game.scene.scenes[0] as Fonda;
            if (!scene.presented || scene.introActive || scene.focusedFriend) return;
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            held.set(event.pointerId,button.dataset.control!);
            if (button.dataset.control === "jump") scene.touchJump=true;
          },{signal:events.signal});
          const release = (event: PointerEvent) => held.delete(event.pointerId);
          button.addEventListener("pointerup",release,{signal:events.signal});
          button.addEventListener("pointercancel",release,{signal:events.signal});
          button.addEventListener("lostpointercapture",release,{signal:events.signal});
        });
      } },
    });
    game.events.once(Phaser.Core.Events.DESTROY,() => events.abort());
  }).catch(error => { game?.destroy(true); root.remove(); throw error; });
}
