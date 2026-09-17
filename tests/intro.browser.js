// With Vite running: node scripts/test-browser.mjs http://127.0.0.1:5173 tests/intro.browser.js
(async () => {
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  const url=performance.getEntriesByType("resource").findLast(entry=>new URL(entry.name).pathname==="/src/game/game.ts").name;
  const module=await import(url);
  const {game}=module, scene=game.scene.scenes[0];
  const start=document.querySelector("#start-game");
  check(scene.atStart && !document.querySelector("#start-screen").hidden && scene.physics.world.isPaused,"Arrival must wait at Start");
  const levelTime=scene.levelTime;
  scene.update(performance.now(),9000);
  check(scene.levelTime===levelTime && !scene.introActive && !scene.soundEnabled && !scene.music.isPlaying,"Start advanced the world or autoplayed sound");
  check(document.querySelector("#start-sound").textContent.includes("altavoz"),"Start lost its manual sound notice");
  start.click();
  const skip=document.querySelector("#skip-intro");
  check(skip && !skip.hidden && scene.physics.world.isPaused,"Fresh arrival has no intro or skip button");
  game.loop.stop();
  const x=scene.player.x, y=scene.player.y;
  scene.keys.RIGHT.isDown=true;scene.touchJump=true;
  scene.talk({name:"Marin",x,y});
  scene.update(performance.now(),16);
  check(scene.player.x===x && scene.player.y===y && !document.querySelector("#conversation").open,
    "Intro accepted movement or interaction");
  skip.click();
  check(!scene.physics.world.isPaused && document.activeElement===game.canvas,"Skipping did not restore physics and focus");
  check(localStorage.getItem("chofis-platformer-preview:fonda-plaza:intro-seen")==="1" &&
    localStorage.getItem("chofis-platformer:fonda-plaza:intro-seen")===null,"Intro completion mixed preview and real saves");
  check(!scene.keys.RIGHT.isDown && !scene.touchJump,"Skipping retained held controls");
  check(!scene.introActive && skip.hidden,"Skipping left the intro active");
  const restart = async () => {
    module.game.destroy(true);module.game.runDestroy();
    document.querySelector("#fonda").remove();
    document.body.classList.remove("playing");
    await module.startGame();
    document.querySelector("#start-game").click();
    module.game.loop.stop();
    return module.game.scene.scenes[0];
  };
  let next=await restart();
  check(!next.introActive && !next.physics.world.isPaused,"Reload repeated a completed intro");
  localStorage.removeItem("chofis-platformer-preview:fonda-plaza:intro-seen");
  localStorage.setItem("chofis-platformer-preview:fonda-plaza:checkpoint","plaza-0");
  next=await restart();
  check(!next.introActive && next.player.x===5620,"Saved map replayed intro or lost its checkpoint");
  localStorage.setItem("chofis-platformer-preview:fonda-plaza:checkpoint"," ");
  localStorage.setItem("chofis-platformer-preview:fonda-plaza","broken");
  next=await restart();
  check(next.introActive,"Malformed save skipped the first intro");
  const advance=ms=>{for(let left=ms;left>0;left-=16)next.update(performance.now(),Math.min(16,left))};
  const clock=next.levelTime, startY=next.cameras.main.scrollY;
  advance(4500);
  check(next.cameras.main.scrollY>startY+100 && !document.querySelector("#intro-text").hidden,
    "Camera never descended or narrative stayed hidden");
  next.events.emit("postupdate",performance.now(),16);
  check(next.levelTime===clock && next.physics.world.isPaused,"Intro advanced the platform clock");
  const root=document.querySelector("#fonda"), elapsed=next.introElapsed;
  root.style.width="390px";root.style.height="844px";
  window.dispatchEvent(new Event("resize"));
  check(next.introActive && next.introElapsed===elapsed,"Resize skipped or restarted the intro");
  check(Math.abs(module.game.canvas.width/root.clientWidth-Math.min(devicePixelRatio,3))<.02,"Intro resize lost resolution");
  advance(7990-next.introElapsed);
  const camera=next.cameras.main, before={x:camera.scrollX,y:camera.scrollY};
  advance(20);
  check(!next.introActive && !next.physics.world.isPaused,"Natural ending never released the game");
  check(Math.abs(camera.scrollX-before.x)<1 && Math.abs(camera.scrollY-before.y)<1,
    "Camera jumped when normal follow resumed");
  advance(1000);
  check(!next.introActive && document.querySelector("#skip-intro").hidden,"Intro returned after finishing");
  localStorage.removeItem("chofis-platformer-preview:fonda-plaza:intro-seen");
  next=await restart();
  // Resume from a hidden tab with readable text instead of running missed animation.
  const hidden=Object.getOwnPropertyDescriptor(document,"hidden");
  try {
    Object.defineProperty(document,"hidden",{configurable:true,value:true});
    document.dispatchEvent(new Event("visibilitychange"));
    const before=next.introElapsed;advance(9000);
    check(next.introElapsed===before,"Hidden tab consumed the narrative");
    Object.defineProperty(document,"hidden",{configurable:true,value:false});
    document.dispatchEvent(new Event("visibilitychange"));
    check(next.introActive && !document.querySelector("#intro-text").hidden &&
      document.querySelector("#skip-intro").textContent==="Jugar","Returning from background lost the text");
    advance(9000);
    check(next.introActive,"Static narrative forced a reading deadline");
    document.querySelector("#skip-intro").dispatchEvent(new KeyboardEvent("keydown",{code:"Escape",bubbles:true}));
    check(!next.introActive,"Escape on the focused skip button did not skip");
  } finally {
    if(hidden)Object.defineProperty(document,"hidden",hidden);
    else delete document.hidden;
  }
  const match=window.matchMedia;
  localStorage.removeItem("chofis-platformer-preview:fonda-plaza:intro-seen");
  try {
    window.matchMedia=query=>{
      const media=match.call(window,query);
      if(query.includes("prefers-reduced-motion"))Object.defineProperty(media,"matches",{value:true});
      return media;
    };
    next=await restart();
    const y=next.cameras.main.scrollY;
    advance(9000);
    check(next.introActive && next.cameras.main.scrollY===y && !document.querySelector("#intro-text").hidden,
      "Reduced motion animated the camera or hid the text");
    const setItem=Storage.prototype.setItem;
    try {
      Storage.prototype.setItem=()=>{throw Error("Storage blocked")};
      document.querySelector("#skip-intro").click();
      check(!next.introActive && !next.physics.world.isPaused,"Unavailable storage blocked play");
    } finally { Storage.prototype.setItem=setItem; }
  } finally { window.matchMedia=match; }
  return {passed:true,introSkip:true,naturalEnding:true,resume:true,resize:true,reducedMotion:true,storage:true};
})();
