// node scripts/test-browser.mjs http://127.0.0.1:5173 tests/ending.browser.js
(async () => {
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  const url=performance.getEntriesByType("resource").findLast(e=>new URL(e.name).pathname==="/src/game/game.ts").name;
  const module=await import(url);
  const key="chofis-platformer-preview";
  let scene;
  const restart=async()=>{
    module.game.destroy(true);module.game.runDestroy();
    document.querySelector("#fonda").remove();
    document.body.classList.remove("playing");
    await module.startGame();
    module.game.loop.stop();
    scene=module.game.scene.scenes[0];
  };
  const advance=ms=>{for(let n=0;n<ms;n+=16)scene.update(n,16)};
  const enter=(y=650)=>{
    scene.player.body.reset(13475,y);
    scene.player.body.touching.down=y===650;
    scene.update(0,16);
  };
  localStorage.setItem(key,JSON.stringify(["empanada","completo","terremoto"]));
  localStorage.setItem(`${key}:checkpoint`,"39");
  await restart();
  check(!scene.endingPhase && !scene.gate.visible,"Complete food should open the gate without ending early");
  enter(560);
  check(scene.endingPhase==="walking" && !scene.input.keyboard.enabled,"Entrance did not take control");
  check(scene.player.y===560,"Entering in midair snapped Chofis to the ground");
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
  check(localStorage.getItem(`${key}:ending-seen`)==="1" && !localStorage.getItem("chofis-platformer:ending-seen"),"Ending mixed real and preview saves");
  await restart();
  check(scene.won && scene.endingPhase==="finished" && scene.physics.world.isPaused,"Saved ending resumed gameplay");
  check(!document.querySelector("#letter").open && !document.querySelector("#read-letter").hidden,"Saved ending did not offer the envelope");
  document.querySelector("#read-letter").click();
  check(document.querySelector("#letter").open,"Saved letter cannot be reopened");
  document.querySelector("#letter").close();
  await new Promise(resolve=>setTimeout(resolve,20));
  check(scene.physics.world.isPaused && !scene.input.keyboard.enabled,"Closing saved letter released controls");
  // An incomplete or corrupt save must never bypass the food requirement.
  localStorage.setItem(key,'["empanada"]');
  await restart();
  enter();
  check(!scene.endingPhase && scene.player.x<13470 && scene.gate.visible,"Incomplete save bypassed the gate");
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
  return {passed:true,automaticEnding:true,gate:true,resume:true,resize:true,hiddenTab:true,reducedMotion:true,storage:true};
})();
