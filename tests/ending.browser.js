// node scripts/test-browser.mjs http://127.0.0.1:5173 tests/ending.browser.js
(async () => {
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  const url=performance.getEntriesByType("resource").findLast(e=>new URL(e.name).pathname==="/src/game/game.ts").name;
  const module=await import(url);
  const key="chofis-platformer-preview:fonda-plaza";
  const {createLevel}=await import("/src/game/level.ts");
  const {MAP,ENDING_AREA}=createLevel();
  let scene;
  const restart=async()=>{
    module.game.destroy(true);module.game.runDestroy();
    document.querySelector("#fonda").remove();
    document.body.classList.remove("playing");
    await module.startGame();
    document.querySelector("#start-game").click();
    module.game.loop.stop();
    scene=module.game.scene.scenes[0];
  };
  const advance=ms=>{for(let n=0;n<ms;n+=16)scene.update(n,16)};
  const enter=(y=MAP.ending.y)=>{
    scene.player.body.reset(MAP.ending.x+5,y);
    scene.player.body.touching.down=y===MAP.ending.y;
    scene.update(0,16);
  };
  localStorage.setItem(key,JSON.stringify(["empanada","completo","terremoto"]));
  localStorage.setItem(`${key}:checkpoint`,"plaza-0");
  await restart();
  check(!scene.endingPhase && !scene.gate.visible,"Complete food should open the gate without ending early");
  enter(MAP.ending.y-90);
  check(scene.endingPhase==="walking" && !scene.input.keyboard.enabled,"Entrance did not take control");
  check(scene.player.y===MAP.ending.y-90,"Entering in midair snapped Chofis to the ground");
  const hidden=Object.getOwnPropertyDescriptor(document,"hidden");
  try {
    Object.defineProperty(document,"hidden",{configurable:true,value:true});
    advance(7000);
    check(scene.endingElapsed===0,"Background tab consumed the finale");
  } finally {
    if(hidden)Object.defineProperty(document,"hidden",hidden);
    else delete document.hidden;
  }
  advance(1600);
  const x=scene.player.x,elapsed=scene.endingElapsed;
  const root=document.querySelector("#fonda");
  root.style.width="390px";root.style.height="844px";
  window.dispatchEvent(new Event("resize"));
  check(scene.player.x===x && scene.endingElapsed===elapsed,"Resize restarted the walk");
  advance(3800);
  check(scene.won && scene.hearts.every(h=>h.visible) && document.querySelector("#letter").open,"Ending lost hearts or letter");
  check(localStorage.getItem(`${key}:ending-seen`)==="1" && !localStorage.getItem("chofis-platformer:fonda-plaza:ending-seen"),"Ending mixed real and preview saves");
  await restart();
  check(scene.won && scene.endingPhase==="finished" && scene.physics.world.isPaused,"Saved ending resumed gameplay");
  const savedLetter=document.querySelector("#letter");
  check(savedLetter.open && !document.querySelector("#close-letter") && !document.querySelector("#read-letter"),"Saved finale must reopen the letter with only Exit");
  const cancel=new Event("cancel",{cancelable:true});
  savedLetter.dispatchEvent(cancel);
  savedLetter.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyE",bubbles:true}));
  check(cancel.defaultPrevented && savedLetter.open && scene.physics.world.isPaused,"Escape/E must not dismiss the final letter");
  // The hub can be entered from the right or above without teleporting across Crow.
  const crow=MAP.friends.find(f=>f.name==="Crow");
  for(const x of [ENDING_AREA.x+ENDING_AREA.width-10,crow.x]) {
    localStorage.removeItem(`${key}:ending-seen`);await restart();
    scene.player.body.reset(x,crow.y-90);scene.update(0,16);
    check(scene.player.x===x && scene.player.y===crow.y-90,"Finale jumped to the other side on entry");
    advance(6000);
    const right=x>crow.x;
    check(scene.won && scene.avatar.flipX===right && scene.portraits.get("Crow").flipX!==right,
      "Reunion did not face both birds toward each other");
    check(Math.abs(Math.abs(scene.player.x-crow.x)-82)<1,"Reunion spacing changed with entry direction");
  }
  // An incomplete or corrupt save must never bypass the food requirement.
  localStorage.setItem(key,'["empanada"]');
  await restart();
  check(scene.barrier.body.enable && scene.gate.visible,"Incomplete save disabled the barrier");
  scene.player.body.reset(ENDING_AREA.x+ENDING_AREA.width+500,MAP.ending.y);scene.update(0,16);
  check(!scene.endingPhase && scene.player.x>ENDING_AREA.x+ENDING_AREA.width,"Gate blocked the unrelated right route");
  const area=ENDING_AREA,body=scene.player.body;
  for(const [x,y,vx,vy] of [
    [area.x-55,MAP.ending.y,340,0],
    [area.x+area.width+55,MAP.ending.y,-340,0],
    [area.x+area.width/2,area.y-30,0,350],
    [area.x+area.width/2,area.y+area.height+body.height+30,0,-760],
  ]) {
    body.reset(x,y);scene.player.setVelocity(vx,vy).setAccelerationX(0);
    for(let i=0;i<45;i++) {
      scene.physics.world.update(i*1000/120,1000/120);
      check(body.right<=area.x+.5 || body.left>=area.x+area.width-.5 ||
        body.bottom<=area.y+.5 || body.top>=area.y+area.height-.5,"Locked Crow island can be entered from one side");
    }
  }
  localStorage.setItem(key,JSON.stringify(["empanada","completo","terremoto"]));
  localStorage.removeItem(`${key}:ending-seen`);
  const match=window.matchMedia;
  try {
    window.matchMedia=query=>{
      const media=match.call(window,query);
      if(query.includes("prefers-reduced-motion"))Object.defineProperty(media,"matches",{value:true});
      return media;
    };
    await restart();enter();
    const x=scene.player.x,zoom=scene.cameras.main.zoom;
    check(scene.endingPhase==="together","Reduced motion still walked");
    const setItem=Storage.prototype.setItem;
    try {
      Storage.prototype.setItem=()=>{throw Error("Storage blocked")};
      advance(2100);
      check(scene.won && scene.player.x===x && scene.cameras.main.zoom===zoom && document.querySelector("#letter").open,
        "Reduced motion or unavailable storage prevented the ending");
    } finally { Storage.prototype.setItem=setItem; }
  } finally { window.matchMedia=match; }
  const realKey="chofis-platformer:fonda-plaza";
  localStorage.setItem(realKey,"keep-real-game");
  const previous=module.game;
  const exit=document.querySelector("#exit-game");
  check(exit.textContent==="Salir" && exit.previousElementSibling.tagName==="P","Exit must sit below the letter");
  exit.click();exit.click();
  for(let i=0;i<100 && (module.game===previous || !module.game.scene?.scenes[0]?.presented);i++)await new Promise(r=>setTimeout(r,100));
  scene=module.game.scene.scenes[0];
  check(module.game!==previous && scene.atStart && document.querySelectorAll("#fonda").length===1,"Exit did not return to one fresh start screen");
  check(!scene.soundEnabled && !scene.music.isPlaying && scene.sound.getAllPlaying().length===0,`Exit sound state: enabled=${scene.soundEnabled}, playing=${scene.music?.isPlaying}, mute=${scene.sound.mute}`);
  check(["",":checkpoint",":intro-seen",":ending-seen"].every(suffix=>localStorage.getItem(key+suffix)===null),"Exit did not clear the whole current game");
  check(localStorage.getItem(realKey)==="keep-real-game","Preview exit erased the real game");
  document.querySelector("#start-game").click();
  check(scene.introActive && scene.player.x===MAP.spawn.x,"Replay did not start fresh on the arrival island");
  return {passed:true,startExitReplay:true,automaticEnding:true,gate:true,resume:true,resize:true,hiddenTab:true,reducedMotion:true,storage:true};
})();
