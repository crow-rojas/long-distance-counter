import Phaser from "phaser";
import "./game.css";
import { isPreview } from "../countdown/compute";
import { replyFor, formatText } from "./dialogue";
import texts from "./es.json";
import { readStamps, readyForCrow } from "./progress";
import { CHECKPOINTS, FRIENDS, ITEMS, nextStop, PLATFORMS, SIDE_PLATFORMS, WORLD_WIDTH, ZONES, type Platform } from "./level";

// Exported for browser integration checks; Phaser remains the only game runtime.
export let game: Phaser.Game;

export async function startGame(): Promise<void> {
  const root = document.createElement("main");
  root.id = "fonda";
  root.innerHTML = `<div id="platformer"></div>
    <header class="game-hud"><span></span><p id="objective" aria-live="polite"></p></header>
    <button id="sound" aria-pressed="false"></button>
    <button id="reset-preview" hidden></button>
    <p id="speech" role="status" hidden></p>
    <button id="interact" hidden></button>
    <dialog id="conversation" aria-labelledby="speaker"><p id="speaker"></p><p id="dialogue-text"></p><button id="close-conversation"></button></dialog>
    <dialog id="gallery" aria-labelledby="gallery-title"><h1 id="gallery-title" tabindex="-1"></h1><div class="drawings"><img src="/game/marin-devil.png"><img src="/game/marin-bunny.png"></div><button id="close-gallery"></button></dialog>
    <p class="keyboard-help"></p>
    <nav class="touch-controls"><div><button data-control="left"></button><button data-control="right"></button></div><button data-control="jump"></button></nav>
    <dialog id="letter" aria-labelledby="letter-title"><h1 id="letter-title" tabindex="-1"></h1><div class="reunion"><img src="/game/chofis-happy.png"><span aria-hidden="true"></span><img src="/game/crow-happy.png"></div><p></p><button id="close-letter"></button></dialog>`;
  // Editable copy is plain text, including quotes, angle brackets and line breaks.
  for (const [selector, text] of Object.entries({
    ".game-hud span": texts.interfaz.misionInicial,
    "#objective": texts.interfaz.cargando,
    "#sound": texts.interfaz.sonido.desactivado,
    "#reset-preview": texts.interfaz.reiniciar,
    "#interact": texts.interfaz.interaccion.hablar,
    "#close-conversation": texts.interfaz.interaccion.seguir,
    "#gallery-title": texts.galeria.titulo,
    "#close-gallery": texts.galeria.volver,
    ".keyboard-help": texts.interfaz.controles.ayudaTeclado,
    "[data-control=left]": texts.interfaz.controles.izquierda,
    "[data-control=right]": texts.interfaz.controles.derecha,
    "[data-control=jump]": texts.interfaz.controles.saltar,
    "#letter-title": texts.carta.titulo,
    ".reunion span": texts.carta.corazon,
    "#letter > p": texts.carta.texto,
    "#close-letter": texts.carta.volver,
  })) root.querySelector(selector)!.textContent = text;
  for (const [selector, attribute, text] of [
    ["#sound", "aria-label", texts.interfaz.sonido.activar],
    ["#reset-preview", "title", texts.interfaz.atajoReiniciar],
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
  const objective = root.querySelector<HTMLElement>("#objective")!;
  const speech = root.querySelector<HTMLElement>("#speech")!;
  const interact = root.querySelector<HTMLButtonElement>("#interact")!;
  const letter = root.querySelector<HTMLDialogElement>("#letter")!;
  const conversation = root.querySelector<HTMLDialogElement>("#conversation")!;
  const gallery = root.querySelector<HTMLDialogElement>("#gallery")!;
  const soundButton = root.querySelector<HTMLButtonElement>("#sound")!;
  const preview = isPreview;
  const key = preview ? "chofis-platformer-preview" : "chofis-platformer";
  let saved: string | null = null;
  let savedCheckpoint: string | null = null;
  try { saved = localStorage.getItem(key); savedCheckpoint = localStorage.getItem(`${key}:checkpoint`); } catch { /* Storage is optional. */ }
  const stamps = readStamps(saved);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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

      preload() {
        const images = ["chofis-front", "chofis-happy", "ramada", "volantin", "copihue", ...FRIENDS.filter(f => !f.image.endsWith("-poses")).map(f => f.image), ...ITEMS.map(i => `sticker-${i.id}`)];
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
          soundButton.textContent = this.soundEnabled ? texts.interfaz.sonido.activado : texts.interfaz.sonido.desactivado;
          soundButton.setAttribute("aria-pressed",String(this.soundEnabled));
          soundButton.setAttribute("aria-label",this.soundEnabled ? texts.interfaz.sonido.silenciar : texts.interfaz.sonido.activar);
          playMusic();
          this.game.canvas.focus({preventScroll:true});
        },{signal:events.signal});
        for (const event of ["keydown","keyup"] as const) soundButton.addEventListener(event,e => {
          if (e.code === "Space" || e.code === "Enter") e.stopPropagation();
        },{signal:events.signal});
        if (import.meta.env.DEV && preview) {
          const reset = () => {
            try {
              localStorage.removeItem(key);
              localStorage.removeItem(`${key}:checkpoint`);
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
          const art = this.add.container(x,y,[image,markings]);
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
        const next = ITEMS.findIndex(item => !stamps.has(item.id));
        this.lastCheckpoint = savedCheckpoint !== null && CHECKPOINTS.includes(Number(savedCheckpoint))
          ? Number(savedCheckpoint) : ZONES[next < 0 ? 3 : next].checkpoint;
        const checkpoint = PLATFORMS[this.lastCheckpoint];
        this.spawn = { x: checkpoint[0]+120, y: checkpoint[1]-25 };
        this.player = this.physics.add.sprite(this.spawn.x,this.spawn.y,"__WHITE").setOrigin(.5,1).setDisplaySize(40.625,58.75).setVisible(false);
        this.player.setBodySize(this.player.width,this.player.height).setOffset(0,0).setMaxVelocity(340,1100).setDragX(2800);
        this.avatar = this.add.image(this.spawn.x,this.spawn.y,"chofis-front").setOrigin(.5,.9625).setDisplaySize(100,100).setDepth(5);
        this.events.on(Phaser.Scenes.Events.POST_UPDATE,(_time: number, delta: number) => {
          this.avatar.setPosition(this.player.x,this.player.y);
          if (!this.focusedFriend) this.updatePlatforms(delta);
        });
        this.events.on(Phaser.Scenes.Events.RENDER,() => this.positionInteraction());
        this.physics.add.collider(this.player,ground,(_player,platform) => {
          if (!this.player.body!.touching.down) return;
          const index = (platform as Phaser.Physics.Arcade.Image).getData("index") as number;
          const island = this.platforms[index];
          if (island.definition[3] === "checkpoint") {
            this.spawn = { x:island.definition[0]+120,y:island.definition[1]-25 };
            if (index !== this.lastCheckpoint) {
              this.lastCheckpoint = index;
              try { localStorage.setItem(`${key}:checkpoint`,String(index)); } catch { /* Session checkpoint still works. */ }
            }
          } else if (island.definition[3] === "fragile" && !island.crumbleAt && !island.restoreAt) {
            island.crumbleAt = this.levelTime+850;
          }
        });
        for (const item of ITEMS) {
          if (stamps.has(item.id)) continue;
          const halo = this.add.circle(item.x,item.y,44,0xffb6d1,.1).setStrokeStyle(1,0xffc3d9,.5);
          const food = this.physics.add.staticImage(item.x,item.y,`sticker-${item.id}`);
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
            try { localStorage.setItem(key,JSON.stringify([...stamps])); } catch { /* Keep this session playable. */ }
            this.say(texts.personajes.Chofis,texts.recogida[item.id],2500);
          });
        }
        this.restoreCamera();
        this.scale.on("resize",() => {
          if (this.focusedFriend) this.focusCamera(this.focusedFriend,true);
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
        interact.addEventListener("click",() => this.talk(),{signal:events.signal});
        for (const dialog of [conversation,gallery,letter]) {
          dialog.querySelector("button")!.addEventListener("click",() => dialog.close(),{signal:events.signal});
          dialog.addEventListener("close",() => this.resumeGameplay(),{signal:events.signal});
          dialog.addEventListener("keydown",e => {
            if (e.code === "KeyE" && !e.repeat) { e.preventDefault(); dialog.close(); }
          },{signal:events.signal});
        }
        this.game.canvas.setAttribute("tabindex","0");
        this.game.canvas.setAttribute("aria-label",texts.interfaz.controles.descripcionJuego);
        this.game.canvas.focus({preventScroll:true});
        document.body.classList.add("playing");
        document.getElementById("hero")!.setAttribute("aria-hidden","true");
        document.documentElement.lang = "es";
        document.title = texts.interfaz.titulo;
        resolve();
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
        FRIENDS.forEach(friend => {
          if (friend.name === "Marin" || friend.name === "Pibble" || friend.name === "Crow") {
            const stall = this.add.image(friend.x,friend.y+5,"ramada").setOrigin(.5,1).setDepth(-1);
            stall.setScale(300/stall.height).setTint(0xe5bdd5);
            const lamp = this.add.image(friend.x+165,friend.y-285,"lantern").setOrigin(.5,0).setDepth(-1);
            lamp.setScale(100/lamp.height);
            this.add.circle(friend.x+165,friend.y-205,42,0xffd394,.07).setDepth(-2);
            if (friend.name !== "Pibble") {
              const pot = this.add.image(friend.x-165,friend.y,"flowerpot").setOrigin(.5,1).setDepth(-1);
              pot.setScale(55/pot.height);
            }
            this.add.ellipse(friend.x,friend.y-95,230,260,0xffc397,.055).setDepth(-2);
            const intervals = friend.name === "Pibble" ? 4 : 8;
            const spacing = 320/intervals;
            for (let bulb=0;bulb<=intervals;bulb++) {
              const x = friend.x-160+bulb*spacing, y=friend.y-310+Math.sin(bulb/intervals*Math.PI)*30;
              if (bulb) g.lineStyle(1,0xecc9c1,.45).lineBetween(x-spacing,friend.y-310+Math.sin((bulb-1)/intervals*Math.PI)*30,x,y);
              g.fillStyle(0xffd7a9,.06).fillCircle(x,y+5,13);
              g.fillStyle(0xffdcaf,.85).fillCircle(x,y+5,3);
            }
          }
          const image = this.add.image(friend.x,friend.y,friend.image,0).setOrigin(.5,friend.image.endsWith("-poses") ? .9625 : 1);
          image.setDisplaySize(friend.height*image.width/image.height,friend.height);
          if (friend.name === "Tus dibujos") {
            g.fillStyle(0x382a35).fillRoundedRect(friend.x-65,friend.y-123,130,128,5);
            g.lineStyle(3,0xd2ad82).strokeRoundedRect(friend.x-65,friend.y-123,130,128,5);
          }
          this.portraits.set(friend.name,image);
          image.setInteractive({useHandCursor:true}).on("pointerup",() => this.talk(friend));
        });
        for (const index of CHECKPOINTS) {
          const [x,y,w] = PLATFORMS[index];
          const flower = this.add.image(x+w-35,y+25,"copihue").setOrigin(.5,.15).setDepth(1);
          flower.setScale(75/flower.height).setAngle(-25).setTint(0xe9bddc);
        }
        for (const [x,y] of [[800,230],[3900,230],[4950,155],[6150,165],[10500,125],[13300,265]]) {
          const kite = this.add.image(x,y,"volantin").setDepth(-2).setAlpha(.7).setAngle(-12);
          kite.setScale(115/kite.height).setTint(0xe8c2ea);
          if (!reduced) this.tweens.add({targets:kite,y:y-12,angle:3,duration:3600+x/2,yoyo:true,repeat:-1,ease:"Sine.easeInOut"});
        }
        for (const [x,y] of [[185,700],[13330,650]]) {
          const bench = this.add.image(x,y,"bench").setOrigin(.5,1).setDepth(-1);
          bench.setScale(140/bench.width);
        }
        const sign = (x:number,y:number,text:string) => {
          this.add.image(x,y,"sign").setOrigin(.5,1).setDisplaySize(175,135).setDepth(-1);
          this.add.text(x,y-81,text,{fontFamily:"Georgia",fontSize:"20px",color:"#382938",align:"center",lineSpacing:3,resolution:pixelRatio}).setOrigin(.5).setDepth(-1);
        };
        sign(550,700,texts.carteles.entrada);
        this.add.text(1740,224,texts.carteles.dibujos,{fontFamily:"Georgia",fontSize:"18px",color:"#eadbc5",shadow:{color:"#182139",blur:5,fill:true},resolution:pixelRatio}).setOrigin(.5);
        sign(3720,650,texts.carteles.islasMoviles);
        sign(6800,630,texts.carteles.grietas);
        sign(10160,560,texts.carteles.luces);
        this.add.text(13700,294,texts.carteles.fonda,{fontFamily:"Georgia",fontSize:"27px",color:"#f1d7ae",resolution:pixelRatio}).setOrigin(.5);
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

      resumeGameplay() {
        this.focusedFriend = undefined;
        this.input.keyboard!.enabled = true;
        this.input.keyboard!.enableGlobalCapture();
        this.input.keyboard!.resetKeys();
        this.lastGrounded = -1000; this.bufferedUntil = 0; this.touchJump = false;
        this.physics.resume();
        root.classList.remove("conversing");
        this.restoreCamera(true);
        this.game.canvas.focus({preventScroll:true});
      }

      positionInteraction() {
        if (!this.nearby || this.focusedFriend) { interact.hidden = true; return; }
        const camera = this.cameras.main;
        const half = interact.offsetWidth/2+12;
        // The game camera pans and zooms without rotation.
        const origin = camera.getWorldPoint(0,0);
        const x = (this.nearby.x-origin.x)*camera.zoom/pixelRatio;
        const y = (this.nearby.y-this.nearby.height-origin.y)*camera.zoom/pixelRatio;
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

      talk(friend = this.nearby) {
        if (!friend || this.focusedFriend || Math.abs(friend.x-this.player.x)>=100 || Math.abs(friend.y-this.player.body!.bottom)>=85) return;
        const portrait = this.portraits.get(friend.name)!;
        this.tweens.killTweensOf(portrait);
        portrait.setY(friend.y);
        if (friend.image.endsWith("-poses")) {
          portrait.setFrame(1).setData("poseUntil",this.time.now+2200);
        }
        if (!reduced) this.tweens.add({targets:portrait,y:friend.y-9,duration:160,yoyo:true,ease:"Sine.easeOut"});
        this.pauseGameplay(friend);
        if (friend.name === "Tus dibujos") {
          gallery.showModal();
          root.querySelector<HTMLElement>("#gallery-title")!.focus({preventScroll:true});
          return;
        }
        if (friend.name === "Crow" && readyForCrow(stamps)) {
          this.effect("power_up",.3);
          portrait.setFrame(2).setData("poseUntil",Infinity);
          this.won = true;
          root.querySelector(".game-hud span")!.textContent = texts.interfaz.zonaFinal;
          objective.textContent = this.lastObjective = texts.interfaz.objetivoFinal;
          this.player.setVelocity(0);
          this.avatar.setTexture("chofis-happy").setFlipX(false).setAngle(0);
          letter.showModal();
          root.querySelector<HTMLElement>("#letter-title")!.focus({preventScroll:true});
          return;
        }
        this.effect("tap",.5);
        root.querySelector("#speaker")!.textContent = texts.personajes[friend.name];
        root.querySelector("#dialogue-text")!.textContent = replyFor(friend.name,stamps);
        conversation.showModal();
      }

      update(time: number) {
        if (!this.player) return;
        for (const portrait of this.portraits.values()) {
          const until = portrait.getData("poseUntil");
          if (until && time > until) portrait.setFrame(0).setData("poseUntil",0);
          else if (until && portrait.texture.key === "marin-poses" && time > until-1500) portrait.setFrame(2);
        }
        if (this.focusedFriend) return;
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        const grounded = body.blocked.down || body.touching.down;
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
        if (this.player.y > 1050) {
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
        let zone: typeof ZONES[number] = ZONES[0];
        for (const candidate of ZONES) if (this.player.x >= candidate.x) zone = candidate;
        const zoneLabel = root.querySelector(".game-hud span")!;
        if (!this.won && zoneLabel.textContent !== zone.name) zoneLabel.textContent = zone.name;
        const text = this.won ? texts.interfaz.objetivoFinal : formatText(texts.interfaz.objetivo,{cantidad:stamps.size,instruccion:next.instruction,direccion:next.x < this.player.x-60 ? texts.interfaz.direccionIzquierda : ""});
        if (text !== this.lastObjective) { objective.textContent=text; this.lastObjective=text; }
        this.nearby = FRIENDS.find(friend => Math.abs(friend.x-this.player.x)<100 && Math.abs(friend.y-body.bottom)<85);
        interact.hidden = !this.nearby;
        if (this.nearby) {
          interact.textContent = this.nearby.name === "Crow" && readyForCrow(stamps) ? texts.interfaz.interaccion.abrazar : this.nearby.name === "Tus dibujos" ? texts.interfaz.interaccion.verDibujos : formatText(texts.interfaz.interaccion.conPersonaje,{personaje:texts.personajes[this.nearby.name]});
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.talk();
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
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            held.set(event.pointerId,button.dataset.control!);
            if (button.dataset.control === "jump") (game.scene.scenes[0] as Fonda).touchJump=true;
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
