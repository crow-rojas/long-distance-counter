// With Vite running: corepack pnpm@9 test:browser
// Exercises actual Phaser physics and DOM in a disposable, muted preview session.
(async () => {
  if (!new URLSearchParams(location.search).has("t")) throw Error("Use the arrival preview.");
  // Reuse Vite's loaded URLs, including its HMR queries, rather than importing a second copy.
  const loaded = path => performance.getEntriesByType("resource")
    .findLast(entry=>new URL(entry.name).pathname===path)?.name ?? path;
  const {game} = await import(loaded("/src/game/game.ts"));
  const {default:texts} = await import(loaded("/src/game/es.json"));
  const {formatText} = await import(loaded("/src/game/dialogue.ts"));
  const {BENCHES,PLATFORMS,FRIENDS,ITEMS,CHECKPOINTS,ENDING_GATE_X,createLevel} = await import(loaded("/src/game/level.ts"));
  const {MAP,platformRecords,WORLD_BOTTOM,ENDING_AREA}=createLevel();
  const start=MAP.spawn,marin=FRIENDS.find(f=>f.name==="Marin");
  const scene=game.scene.scenes[0], player=scene.player, body=player.body, world=scene.physics.world;
  document.querySelector("#start-game").click();
  if (scene.introActive) document.querySelector("#skip-intro").click();
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  const foodSlots=[...document.querySelectorAll("#provisions [data-food]")];
  for(const button of document.querySelectorAll("#fonda button")) {
    if (["start-game","exit-game"].includes(button.id)) {check(button.textContent.trim(),"Start/exit need visible labels");continue;}
    check(button.querySelector("svg[aria-hidden=true]") && button.getAttribute("aria-label"),
      `Button ${button.id || button.dataset.control} needs an icon and accessible name`);
  }
  check(foodSlots.length===3 && foodSlots.every(slot=>!slot.classList.contains("collected") && slot.getAttribute("aria-label")),
    "HUD must show three named, initially missing foods");
  const canvasBounds=game.canvas.getBoundingClientRect();
  const density=Math.min(devicePixelRatio || 1,3);
  check(Math.abs(game.canvas.width/canvasBounds.width-density)<.02 &&
    Math.abs(game.canvas.height/canvasBounds.height-density)<.02,
    "Canvas stretches low-resolution pixels on a high-density screen");
  check(scene.music && scene.cache.audio.exists("music"),"Background music was not loaded");
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const root=document.querySelector("#fonda"),originalStyle=root.style.cssText;
  try {
    root.style.width="600px";root.style.height="360px";
    window.dispatchEvent(new Event("resize"));
    check(Math.abs(game.canvas.width-600*density)<1 && Math.abs(game.canvas.height-360*density)<1,
      "Canvas density was lost when resizing");
    check(Math.abs(scene.cameras.main.width/scene.cameras.main.zoom-600/.65)<1,
      "Resize changed the visible world scale");
  } finally {
    root.style.cssText=originalStyle;window.dispatchEvent(new Event("resize"));
  }
  const dprDescriptor=Object.getOwnPropertyDescriptor(window,"devicePixelRatio");
  const visibleWidth=scene.cameras.main.width/scene.cameras.main.zoom;
  try {
    for(const ratio of [1,2,1,3]) {
      Object.defineProperty(window,"devicePixelRatio",{configurable:true,value:ratio});
      scene.events.emit("preupdate",scene.time.now,1000/60);
      check(Math.abs(game.canvas.width/game.canvas.getBoundingClientRect().width-ratio)<.02,
        "Monitor density change kept the old canvas resolution");
      check(Math.abs(scene.cameras.main.width/scene.cameras.main.zoom-visibleWidth)<1,
        "Monitor density change altered the visible world");
      const labels=scene.children.list.flatMap(child=>child.type==="Container"?child.list:[child]).filter(child=>child.type==="Text");
      check(labels.every(label=>label.style.resolution===ratio),"Existing text retained its old density");
    }
  } finally {
    if(dprDescriptor)Object.defineProperty(window,"devicePixelRatio",dprDescriptor);
    else delete window.devicePixelRatio;
    window.dispatchEvent(new Event("resize"));
  }
  check(document.querySelector("#letter > p").textContent===texts.carta.texto,"Letter did not use editable copy");
  check(document.querySelector("#letter-title").textContent===texts.carta.titulo,"Letter title did not use editable copy");
  const sound=document.querySelector("#sound");
  for(let i=0;i<2;i++) { sound.focus(); sound.click(); check(sound.title===(i===0?texts.interfaz.sonido.activado:texts.interfaz.sonido.desactivado) && sound.querySelector("svg") && sound.getAttribute("aria-pressed")===String(i===0),"Sound lost its icon or accessible state"); check(document.activeElement===game.canvas,"Sound kept keyboard focus"); }
  sound.focus();
  try {
    sound.dispatchEvent(new KeyboardEvent("keydown",{code:"ArrowRight",keyCode:39,bubbles:true}));
    await wait(50); check(scene.keys.RIGHT.isDown,"Sound swallowed movement keys");
    sound.dispatchEvent(new KeyboardEvent("keydown",{code:"Space",keyCode:32,bubbles:true}));
    await wait(50); check(!scene.keys.SPACE.isDown,"Space on Sound also jumped");
  } finally {
    sound.dispatchEvent(new KeyboardEvent("keyup",{code:"ArrowRight",keyCode:39,bubbles:true}));
    sound.dispatchEvent(new KeyboardEvent("keyup",{code:"Space",keyCode:32,bubbles:true}));
    scene.input.keyboard.resetKeys(); game.canvas.focus();
  }
  let time=scene.time.now;
  const originalTime=time;
  const press=key=>scene.keys[key].onDown(new KeyboardEvent("keydown"));
  const release=key=>scene.keys[key].onUp(new KeyboardEvent("keyup"));
  const frame=(delta=1000/120)=>{
    time+=delta; scene.time.now=time;
    world.update(time,delta); scene.update(time,delta); scene.events.emit("postupdate",time,delta);
    check(Math.abs(body.width-40.625)<.01 && Math.abs(body.height-58.75)<.01,"Animation changed player collision size");
  };
  const advance=n=>{for(let i=0;i<n;i++)frame()};
  const reset=(x,y)=>{
    scene.input.keyboard.resetKeys(); body.reset(x,y-25); player.setVelocity(0).setAccelerationX(0);
    scene.lastGrounded=-1000; scene.bufferedUntil=0; scene.lastMoving=-1000; advance(30);
  };
  const resetIslands=()=>{
    for(const p of scene.platforms) {
      const [x,y,,kind]=p.definition;
      p.sprite.body.enable=true; p.sprite.body.reset(x,y);
      p.sprite.setVelocity(kind==="moving-x"?65:0,kind==="moving-y"?40:0);
      p.crumbleAt=p.restoreAt=0; p.art.setPosition(x,y).setAlpha(1);
    }
  };
  const close=async()=>{
    document.querySelector("#fonda dialog[open]")?.close();
    for(let i=0;i<20 && scene.focusedFriend && !scene.endingPhase;i++)await wait(25);
    if (!scene.endingPhase) check(!scene.focusedFriend && !world.isPaused && scene.input.keyboard.enabled,"Dialogue did not restore gameplay");
  };
  game.loop.sleep();
  try {
    const worldLabels=scene.children.list.flatMap(child=>child.type==="Container"?child.list:[child]).filter(child=>child.type==="Text");
    check(worldLabels.length===1 && worldLabels[0].text===texts.carteles.fonda,
      "Only Don Crow's sign should remain in the world");
    for(const item of ITEMS) {
      const art=scene.children.list.find(child=>child.getData("mapId")===item.id);
      const pickup=world.staticBodies.entries.find(b=>b.center.x===item.x && b.center.y===item.y && b.width===72);
      check(art && pickup && Math.abs(Math.max(art.displayWidth,art.displayHeight)-100)<.01,
        "Collectible must be larger without changing its pickup reach");
      const tween=scene.tweens.getTweensOf(art)[0];
      check(tween,"Collectible has no idle movement");
      tween.seek(800);
      check(art.y!==item.y && pickup.center.x===item.x && pickup.center.y===item.y,
        "Collectible animation moved its collision area");
      tween.seek(0);
    }
    check(!localStorage.getItem("chofis-platformer-preview:fonda-plaza"),"Use a fresh browser session");
    body.reset(start.x,WORLD_BOTTOM+50);scene.update(time);
    const speech=document.querySelector("#speech");
    check(speech.hidden,"Falling should not announce a tutorial");
    const firstReminder=scene.speechUntil;
    body.reset(start.x,WORLD_BOTTOM+50);time+=100;scene.update(time);
    check(scene.speechUntil===firstReminder,"Repeated falls repeat the tutorial");
    let benchJumpHeight=0;
    for(const bench of BENCHES) {
      const drawing=scene.children.list.find(child=>child.texture?.key==="bench" && child.x===bench.x);
      check(drawing,"Bench drawing is missing");
      reset(bench.x+180,bench.y);drawing.emit("pointerup");
      check(!scene.seatedBench,"Distant bench teleported the player");
      body.reset(bench.x,bench.y-100);drawing.emit("pointerup");
      check(!scene.seatedBench,"Airborne player could sit");
      reset(bench.x,bench.y);
      check(!scene.seatedBench && document.querySelector("#interact").textContent===texts.bancas.sentarse,
        "Bench sat automatically or did not offer interaction");
      check(document.querySelector("#interact").dataset.icon==="sit","Bench has no sitting icon");
      press("E");frame();release("E");advance(2);
      check(scene.seatedBench?.x===bench.x && scene.avatar.isCropped,"E did not seat Chofis");
      check(speech.textContent===formatText(texts.interfaz.subtitulo,{personaje:texts.personajes.Chofis,texto:texts.bancas.frase}),
        "Sitting should show Chofis's line, not a tutorial");
      check(document.querySelector("#interact").dataset.icon==="stand" &&
        document.querySelector("#interact").getAttribute("aria-label")===texts.bancas.levantarse,
        "Seated interaction did not change its icon and accessible action");
      check(Math.abs(scene.avatar.displayWidth-100)<1.3 && Math.abs(scene.avatar.displayHeight-100)<1.3,
        "Sitting stretches Chofis instead of preserving her standing size");
      check(!world.isPaused && scene.input.keyboard.enabled,"Sitting paused the world or disabled input");
      const clock=scene.levelTime;
      advance(120);
      check(scene.levelTime>clock && player.x===bench.x && Math.abs(body.bottom-bench.y)<1,
        "Seated player drifted or stopped the world");
      const seatY=drawing.y-bench.height*28/92;
      check(Math.abs(scene.avatar.y-seatY)<.01,"Sitting pose is not on the resized seat");
      sound.focus();sound.click();sound.click();
      check(scene.seatedBench?.x===bench.x && document.activeElement===game.canvas,"Sound broke sitting or focus");
      press("E");frame();release("E");frame();
      check(!scene.seatedBench && !scene.avatar.isCropped,"E did not stand up");
      drawing.emit("pointerup");frame();
      check(scene.seatedBench?.x===bench.x,"Nearby bench tap did not sit");
      document.querySelector("#interact").focus();document.querySelector("#interact").click();frame();
      check(!scene.seatedBench && document.activeElement===game.canvas,"Stand button kept focus");
      document.querySelector("#interact").click();frame();
      check(scene.seatedBench?.x===bench.x,"Sit button failed");
      press("RIGHT");advance(3);release("RIGHT");
      check(!scene.seatedBench && !scene.avatar.isCropped && body.velocity.x>0,"Walking did not stand up");
      reset(bench.x,bench.y);drawing.emit("pointerup");advance(2);
      press("SPACE");frame();
      check(!scene.seatedBench && body.velocity.y<-650 && body.bottom>=bench.y-2,
        "Bench jump failed or gained artificial height");
      let top=body.bottom;
      for(let i=0;i<110;i++){frame();top=Math.min(top,body.bottom)}
      benchJumpHeight=Math.max(benchJumpHeight,bench.y-top);
      release("SPACE");
      reset(bench.x,bench.y);drawing.emit("pointerup");advance(2);
      scene.touchJump=true;frame();
      check(!scene.seatedBench && body.velocity.y<0,"Touch jump did not stand up");
    }
    reset(start.x,start.y);
    // Exercise create() velocities before resetIslands can replace them.
    const movers=scene.platforms.filter(p=>p.definition[3]?.startsWith("moving"));
    const starts=movers.map(p=>({x:p.sprite.x,y:p.sprite.y}));
    const moved=new Set();
    for(let i=0;i<600;i++) {
      frame();
      movers.forEach((p,index)=>{
        const [x,y,,kind]=p.definition;
        const dx=Math.abs(p.sprite.x-x),dy=Math.abs(p.sprite.y-y);
        check(kind==="moving-x" ? dx<=52 && dy<.01 : dx<.01 && dy<=42,
          `${kind} left its route after create(): ${dx}, ${dy}`);
        check(p.art.alpha>0 && Math.abs(p.art.x-p.sprite.x)<.001 && Math.abs(p.art.y-p.sprite.y)<.001,
          "Moving island artwork stopped following its body");
        if(Math.hypot(p.sprite.x-starts[index].x,p.sprite.y-starts[index].y)>20)moved.add(index);
      });
    }
    check(moved.size===movers.length,"Some moving islands never started moving");
    for(const hz of [30,60,120]) for(let i=0;i<20;i++) {
      frame(1000/hz);
      check(movers.every(p=>Math.abs(p.art.x-p.sprite.x)<.001 && Math.abs(p.art.y-p.sprite.y)<.001),
        `Platform art trails physics at ${hz} Hz`);
    }
    resetIslands(); reset(start.x,start.y);
    for(let i=0;i<40;i++) {
      release(i%2?"RIGHT":"LEFT"); press(i%2?"LEFT":"RIGHT"); frame();
      check(scene.avatar.texture.key==="chofis-run","Quick turn flashed the front sprite");
    }
    release("LEFT"); release("RIGHT"); advance(35);
    check(scene.avatar.texture.key==="chofis-front","Idle pose never returned after stopping");
    const height=hold=>{
      reset(start.x,start.y); press("SPACE"); frame(); if(!hold)release("SPACE");
      let top=body.bottom;
      for(let i=0;i<110;i++){frame();top=Math.min(top,body.bottom)}
      return start.y-top;
    };
    const short=height(false),tall=height(true);
    check(tall>short+60,"Holding jump did not increase its height");
    check(Math.abs(benchJumpHeight-tall)<2,"Sitting changed jump height or difficulty");
    reset(MAP.platforms[0].x+MAP.platforms[0].width-10,start.y); player.setVelocityX(340); press("RIGHT"); advance(13);
    check(!body.touching.down,"Coyote test never left the edge");
    press("SPACE");frame(); check(body.velocity.y < -650,"Coyote jump was lost");
    advance(20);const before=body.velocity.y;release("SPACE");press("SPACE");frame();
    check(body.velocity.y>before,"Unexpected double jump");
    reset(start.x,start.y);scene.lastGrounded=-1000;body.reset(start.x,start.y-40);player.setVelocityY(500);press("SPACE");advance(13);
    check(body.velocity.y<0,"Buffered jump was lost");

    for(const friend of FRIENDS) {
      reset(friend.x,friend.y);
      check(!scene.focusedFriend,"NPC started a conversation from proximity");
      check(scene.tweens.getTweensOf(scene.portraits.get(friend.name)).length===0,"NPC animated from proximity");
    }
    const krypto=FRIENDS.find(f=>f.name==="Krypto"),dog=scene.portraits.get("Krypto");
    reset(krypto.x-70,krypto.y);check(dog.flipX,"Krypto did not face Chofis on his left");
    reset(krypto.x+70,krypto.y);check(!dog.flipX,"Krypto did not face Chofis on his right");
    reset(krypto.x-10,krypto.y);check(!dog.flipX,"Krypto flickered inside the facing dead zone");
    for(const friend of FRIENDS.filter(f=>f.name!=="Tus dibujos" && f.name!=="Crow")) {
      reset(friend.x-60,friend.y);
      const portrait=scene.portraits.get(friend.name),width=portrait.displayWidth,height=portrait.displayHeight;
      scene.talk(friend);
      const gestures=scene.tweens.getTweensOf(portrait);
      check(gestures.length===1 && gestures[0].data.every(track=>track.key==="angle"),
        "Greeting should use a finite tilt without bouncing or stretching");
      gestures[0].seek(0); // Phaser computes duration when the pending tween starts.
      gestures[0].seek(gestures[0].totalDuration+50);
      check(Math.abs(portrait.angle)<.01 && portrait.y===friend.y &&
        portrait.displayWidth===width && portrait.displayHeight===height,"Greeting did not restore the original pose");
      await close();
    }
    reset(marin.x-60,marin.y);press("E");frame();release("E");
    check(document.querySelector("#conversation").open && document.querySelector("#speaker").textContent===texts.personajes.Marin,"E did not open the nearby conversation");
    check(world.isPaused && !scene.input.keyboard.enabled,"Conversation did not pause gameplay");
    scene.useBench(BENCHES[0]);
    check(!scene.seatedBench,"Bench interrupted a dialogue");
    check(scene.portraits.get("Marin").frame.name===1,"Marin did not greet on interaction");
    advance(100);
    check(scene.portraits.get("Marin").frame.name===2 && scene.portraits.get("Marin").flipX,
      "Marin should point left during her conversation");
    await close();
    const originalName=texts.personajes.Marin;
    try {
      texts.personajes.Marin='Marin <3 "Chofis"';
      scene.portraits.get("Marin").emit("pointerup");
      check(document.querySelector("#conversation").open,"Nearby NPC tap failed");
      const speaker=document.querySelector("#speaker");
      check(speaker.textContent===texts.personajes.Marin && speaker.childElementCount===0,"Edited name was treated as HTML or broke character identity");
      await close();
    } finally { texts.personajes.Marin=originalName; }
    reset(start.x,start.y);scene.portraits.get("Marin").emit("pointerup");
    check(!scene.focusedFriend,"An out-of-range NPC tap worked");
    const gallery=FRIENDS.find(f=>f.name==="Tus dibujos");reset(gallery.x,gallery.y);scene.talk(gallery);
    check(scene.tweens.getTweensOf(scene.portraits.get(gallery.name)).length===0,"Gallery art should stay still");
    const galleryDialog=document.querySelector("#gallery"),galleryImage=galleryDialog.querySelector("img");
    check(galleryDialog.open && galleryDialog.querySelectorAll("img").length===1,"Gallery should display one drawing");
    const firstDrawing=galleryImage.src;
    document.querySelector("#next-drawing").click();
    check(galleryDialog.open && galleryImage.src!==firstDrawing && world.isPaused,"Next drawing closed the gallery or resumed gameplay");
    galleryDialog.dispatchEvent(new KeyboardEvent("keydown",{code:"ArrowLeft",bubbles:true}));
    check(galleryImage.src===firstDrawing && galleryImage.alt===texts.galeria.dibujos[0].descripcion,"Keyboard navigation lost the first drawing or alt text");
    const shown = new Set();
    for(const drawing of texts.galeria.dibujos) {
      await galleryImage.decode();
      check(galleryImage.src.endsWith(`/game/${drawing.archivo}`) && galleryImage.alt===drawing.descripcion &&
        galleryImage.naturalWidth>0,"Gallery drawing or description is missing");
      shown.add(galleryImage.src);
      document.querySelector("#next-drawing").click();
    }
    check(shown.size===23 && galleryImage.src===firstDrawing,"Gallery should cycle through all 23 original cutouts");
    document.querySelector("#previous-drawing").click();
    check(galleryImage.src!==firstDrawing,"Previous drawing should wrap to the last");
    await close();
    if(JSON.parse(localStorage.getItem("chofis-platformer-preview:fonda-plaza")??"[]").length<3) {
      const crow=FRIENDS.find(f=>f.name==="Crow");reset(crow.x-50,crow.y);scene.talk(crow);
      check(!document.querySelector("#letter").open && !scene.endingPhase && scene.barrier.body.enable,
        "Locked entrance allowed access before food was collected");
    }

    for(const kind of ["moving-x","moving-y"]) {
      resetIslands();const p=scene.platforms.find(p=>p.definition[3]===kind);
      reset(p.sprite.x+p.definition[2]/2,p.sprite.y);
      const offset=player.x-p.sprite.x;advance(110);
      check(Math.abs(player.x-p.sprite.x-offset)<4 && Math.abs(body.bottom-p.sprite.y)<1,`${kind} did not carry the player: ${player.x-p.sprite.x-offset}, ${body.bottom-p.sprite.y}`);
    }
    resetIslands();const fragile=scene.platforms.find(p=>p.definition[3]==="fragile");
    reset(fragile.sprite.x+fragile.definition[2]/2,fragile.sprite.y);
    check(fragile.crumbleAt>scene.levelTime,"Fragile island did not warn before falling");
    reset(marin.x-60,marin.y);scene.talk(FRIENDS[0]);
    const clock=scene.levelTime,position=scene.platforms[10].sprite.x;
    advance(180);
    check(scene.levelTime===clock && scene.platforms[10].sprite.x===position,"Challenges advanced during dialogue");await close();
    advance(110);check(!fragile.sprite.body.enable,"Fragile island did not fall");
    advance(310);check(fragile.sprite.body.enable,"Fragile island did not regrow");

    // Find a real takeoff timing for every connection in both directions, including moving islands.
    const traverse=(fromIndex,toIndex)=>{
      const from=scene.platforms[fromIndex],to=scene.platforms[toIndex];
      const direction=to.definition[0]+to.definition[2]/2>from.definition[0]+from.definition[2]/2?1:-1;
      const overlapLeft=Math.max(from.definition[0],to.definition[0])+25;
      const overlapRight=Math.min(from.definition[0]+from.definition[2],to.definition[0]+to.definition[2])-25;
      if(to.definition[1]<from.definition[1] && overlapLeft<overlapRight) {
        resetIslands();reset((overlapLeft+overlapRight)/2,from.definition[1]);press("SPACE");
        for(let i=0;i<180;i++) {frame();if(body.touching.down && Math.abs(body.bottom-to.sprite.y)<1)return true;}
      }
      for(const jump of to.definition[1]>from.definition[1] ? [false,true] : [true]) for(const phase of [0,50,130,240,350]) for(const margin of [-8,8,25,45]) {
        resetIslands();reset(start.x,start.y);advance(phase);
        reset(from.sprite.x+(direction>0?from.definition[2]-margin:margin),from.sprite.y);
        if(!body.touching.down)continue;
        const takeoffX=player.x;
        player.setVelocityX(direction*340);press(direction>0?"RIGHT":"LEFT");if(jump)press("SPACE");
        for(let i=0;i<220;i++) {
          const target=Math.max(to.sprite.x+40,Math.min(to.sprite.x+to.definition[2]-40,takeoffX+direction*140));
          if(direction*(player.x-target)>=-18)release(direction>0?"RIGHT":"LEFT");
          frame();
          if(body.touching.down && Math.abs(body.bottom-to.sprite.y)<1 && body.right>to.sprite.x && body.left<to.sprite.x+to.definition[2])return true;
          if(player.y>Math.max(from.definition[1],to.definition[1])+450)break;
        }
      }
      return false;
    };
    const indices=name=>platformRecords.filter(p=>new RegExp(`^${name}-\\d+$`).test(p.id)).map(p=>platformRecords.indexOf(p));
    const idx=id=>platformRecords.findIndex(p=>p.id===id);
    const paths=[
      [...indices("arrival"),idx("plaza-0")],
      [idx("plaza-0"),idx("plaza-1")],
      [idx("terremoto-1"),idx("crow-1")],
      [idx("completo-return-1"),idx("crow-1")],
      [idx("plaza-0"),...indices("empanada")],
      [idx("empanada-11"),...indices("drawings")],
      [idx("plaza-1"),...indices("completo")],
      [idx("plaza-0"),idx("crow-0"),idx("terremoto-0"),idx("empanada-return-2"),...indices("terremoto").slice(1)],
    ];
    let connections=0;
    for(const path of paths) for(let i=0;i<path.length-1;i++) for(const [from,to] of path===paths[0] ? [[path[i],path[i+1]]] : [[path[i],path[i+1]],[path[i+1],path[i]]]) {
      check(traverse(from,to),`Cannot traverse ${platformRecords[from].id} to ${platformRecords[to].id}: ${JSON.stringify(PLATFORMS[from])} to ${JSON.stringify(PLATFORMS[to])}`);connections++;
    }
    for(const path of [
      [idx("empanada-11"),idx("empanada-return-0"),idx("empanada-return-1"),idx("terremoto-2"),idx("empanada-return-2"),idx("terremoto-0"),idx("crow-0"),idx("plaza-0")],
      [idx("completo-9"),...indices("completo-return"),idx("plaza-1")],
      [idx("terremoto-18"),...indices("terremoto-return"),idx("completo-return-1"),idx("completo-return-2"),idx("plaza-1")],
    ]) for(let i=0;i<path.length-1;i++) {
      check(traverse(path[i],path[i+1]),`Cannot descend ${platformRecords[path[i]].id} to ${platformRecords[path[i+1]].id}`);connections++;
    }
    for(const item of ITEMS) {
      reset(item.x,item.y+35);advance(10);
      check(document.querySelector(`#provisions [data-food="${item.id}"]`).classList.contains("collected"),
        "Food HUD did not match collected items");
    }
    check(foodSlots.every(slot=>slot.classList.contains("collected")),"Completed food HUD has missing items");
    check(JSON.parse(localStorage.getItem("chofis-platformer-preview:fonda-plaza")).length===3,"Not all food was collected");
    const foodReminder=scene.speechUntil;
    body.reset(player.x,WORLD_BOTTOM+50);scene.update(time);
    check(scene.speechUntil===foodReminder,"Falling with food should not add an announcement");
    body.reset(player.x,WORLD_BOTTOM+50);time+=100;scene.update(time);
    check(scene.speechUntil===foodReminder,"Food recovery reminder repeats");
    resetIslands();const cp=CHECKPOINTS[5];reset(PLATFORMS[cp][0]+120,PLATFORMS[cp][1]);
    check(localStorage.getItem("chofis-platformer-preview:fonda-plaza:checkpoint")===createLevel().platformRecords[cp].id,"Checkpoint ID was not persisted");
    const spawn={...scene.spawn};body.reset(player.x,WORLD_BOTTOM+50);scene.update(time);
    check(player.x===spawn.x && player.y===spawn.y,"Fall lost the checkpoint");
    reset(ENDING_GATE_X+5,MAP.ending.y);
    check(scene.endingPhase==="walking" && world.isPaused && !document.querySelector("#letter").open,
      "Final entrance did not start an automatic walk before the letter");
    const walkStart=player.x;
    advance(180);
    check(player.x>walkStart && !scene.won,"Chofis did not walk toward Crow");
    advance(450);
    check(document.querySelector("#letter").open && scene.won,"Reunion did not open");await close();frame();
    const endX=player.x;
    press("LEFT");press("SPACE");advance(120);
    check(world.isPaused && player.x===endX && !scene.input.keyboard.enabled,"Closing the letter resumed gameplay");
    check(localStorage.getItem("chofis-platformer-preview:fonda-plaza:ending-seen")==="1","Final scene was not saved");
    scene.openLetter();
    check(document.querySelector("#letter").open,"Envelope did not reopen the letter");await close();
    check(document.querySelector("#objective").textContent===texts.interfaz.objetivoFinal,"Completed game still asks for food");
    return {passed:true,connections,benches:true,quickTurns:true,movingPlatforms:true,fragilePlatforms:true,manualDialogue:true,gallery:true,checkpoints:true,reunion:true,shortJump:Math.round(short),heldJump:Math.round(tall)};
  } finally {
    document.querySelector("#fonda dialog[open]")?.close();await wait(20);
    scene.input.keyboard.resetKeys();scene.time.now=originalTime;
    scene.landingUntil=scene.bufferedUntil=scene.speechUntil=0;scene.lastGrounded=scene.lastMoving=-1000;
    for(const p of scene.portraits.values())p.setData("poseUntil",0);
    game.loop.wake();
  }
})()
