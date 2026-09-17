// node scripts/test-browser.mjs http://127.0.0.1:5173/editor.html tests/editor.browser.js
(async()=>{
  const check=(ok,message)=>{if(!ok)throw Error(message)};
  const loaded=path=>performance.getEntriesByType('resource').findLast(e=>new URL(e.name).pathname===path)?.name ?? path;
  const {editor}=await import(loaded('/src/game/editor.ts'));
  const runtime=await import(loaded('/src/game/game.ts'));
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const settled=async()=>{const end=Date.now()+8000;while(editor.busy){if(Date.now()>end)throw Error('Editor timed out');await wait(25)}};
  await settled();
  const list=document.querySelector('#objects');list.value='platform-0';list.dispatchEvent(new Event('change'));
  const x=document.querySelector('[name=x]');x.value='16';x.dispatchEvent(new Event('change'));await settled();
  check(editor.map.platforms[0].x===16 && runtime.game.scene.scenes[0].platforms[0].sprite.x===16,'Inspector and game collider disagree');
  check(JSON.parse(localStorage.getItem('chofis-map-editor-v1')).platforms[0].x===16,'Draft was not saved');
  const original=JSON.stringify(editor.map),invalid=editor.map;invalid.items.pop();
  const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(invalid)],'map.json',{type:'application/json'}));
  const input=document.querySelector('#map-file');input.files=transfer.files;input.dispatchEvent(new Event('change'));await wait(150);await settled();
  check(JSON.stringify(editor.map)===original && document.querySelector('#status').classList.contains('error'),'Invalid import replaced the draft');
  localStorage.setItem('chofis-platformer-preview','["empanada"]');
  document.querySelector('#full-bag').checked=true;document.querySelector('#play').click();await settled();
  check(document.body.classList.contains('testing') && document.querySelectorAll('#provisions .collected').length===3,'Test mode did not load the map and bag');
  document.querySelector('#stop').click();await settled();
  check(runtime.game.scene.scenes[0].physics.world.isPaused && JSON.stringify(editor.map)===original,'Test changed the draft or resumed editor physics');
  check(localStorage.getItem('chofis-platformer-preview')==='["empanada"]','Test changed real preview progress');
  return {passed:true,edit:true,validation:true,localDraft:true,playtest:true,isolatedProgress:true};
})()
