import Phaser from "phaser";
import "./editor.css";
import {game,startGame} from "./game";
import {setButtonIcon} from "./button-icons";
import {allEntities,defaultMap,parseMap,type MapData} from "./map-data";

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const DRAFT_KEY=`chofis-map-editor-v1:${defaultMap.id}`;
let map=structuredClone(defaultMap),selected=map.spawn.id,busy=false,testing=false;
let outline:Phaser.GameObjects.Graphics;
const status=(text:string,error=false)=>{$("status").textContent=text;$("status").classList.toggle("error",error)};
try {const saved=localStorage.getItem(DRAFT_KEY);if(saved)map=parseMap(JSON.parse(saved));}catch{/* A damaged draft never replaces the published map. */}
let view={x:map.spawn.x,y:map.spawn.y-180,zoom:.8};
export const editor={get map(){return structuredClone(map)},get busy(){return busy}};
const scene=()=>game.scene.scenes[0];
type Art=Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform & {getBounds():Phaser.Geom.Rectangle;depth:number};
const objects=()=>scene().children.list.filter(o=>o.getData("mapId")) as Art[];
const entity=()=>allEntities(map).find(o=>o.id===selected)!;
const save=()=>{try{localStorage.setItem(DRAFT_KEY,JSON.stringify(map));status("Borrador local. Descarga el JSON para conservarlo.");}catch{status("Descarga el JSON: no se pudo guardar el borrador.",true)}};
function draw() {
  if(testing)return;
  const camera=scene().cameras.main,ratio=game.canvas.width/game.canvas.getBoundingClientRect().width;
  camera.stopFollow().removeBounds().setZoom(view.zoom*ratio).centerOn(view.x,view.y);camera.preRender();outline.clear();
  const object=objects().find(o=>o.getData("mapId")===selected);
  if(object){const b=object.getBounds();outline.lineStyle(2/view.zoom,0xffc3df).strokeRect(b.x,b.y,b.width,b.height);}
}
function inspect() {
  const select=$<HTMLSelectElement>("objects");select.replaceChildren();
  for(const o of allEntities(map)) {
    const label="name" in o ? o.name : "image" in o ? o.image : o.id;
    select.add(new Option(`${label} (${o.x}, ${o.y})`,o.id,false,o.id===selected));
  }
  const form=$("properties");form.replaceChildren();const target=entity();
  for(const [key,label] of [["x","X"],["y","Y"],["width","Ancho"],["height","Alto"]]) {
    if(!(key in target))continue;
    const wrapper=document.createElement("label"),input=document.createElement("input");wrapper.textContent=label;
    input.type="number";input.name=key;input.value=String((target as unknown as Record<string,number>)[key]);wrapper.append(input);form.append(wrapper);
    input.addEventListener("change",()=>void run(async()=>{
      try {const next=structuredClone(map);const item=allEntities(next).find(o=>o.id===selected)!;
        if(key==="x" || key==="y")move(next,selected,key==="x" ? Number(input.value) : item.x,key==="y" ? Number(input.value) : item.y);
        else Object.assign(item,{[key]:Number(input.value)});
        await commit(next);
      } catch(error){inspect();throw error;}
    }));
  }
}
function move(next:MapData,id:string,x:number,y:number) {
  const item=allEntities(next).find(o=>o.id===id)!;
  if(item===next.ending){const crow=next.friends.find(f=>f.name==="Crow")!;crow.x+=x-item.x;crow.y+=y-item.y;}
  if("name" in item && item.name==="Crow")next.ending.y=y;
  item.x=x;item.y=y;
}
async function commit(next:MapData){map=parseMap(next);save();await render();}
async function run(action:()=>void|Promise<void>){if(busy)return;try{await action()}catch(error){status(error instanceof Error ? error.message : "No se pudo aplicar el cambio.",true)}}
async function render(spawn?:{x:number;y:number}) {
  busy=true;document.body.classList.add("busy");
  try {
    if(game){await new Promise<void>(resolve=>{game.events.once(Phaser.Core.Events.DESTROY,resolve);game.destroy(true);game.loop.wake()});$("fonda").remove();}
    document.body.classList.toggle("testing",testing);$("stop").hidden=!testing;
    await startGame({map,editing:!testing,sandbox:true,spawn,fullBag:testing && $<HTMLInputElement>("full-bag").checked});
    document.title="Mapa de la fonda";
    if(!testing){outline=scene().add.graphics().setDepth(100);draw();scene().scale.on("resize",draw);bindCanvas();inspect();}
  } finally {busy=false;document.body.classList.remove("busy");}
}
function bindCanvas(){
  const canvas=game.canvas;
  const world=(e:MouseEvent)=>{const r=canvas.getBoundingClientRect(),ratio=canvas.width/r.width;return scene().cameras.main.getWorldPoint((e.clientX-r.left)*ratio,(e.clientY-r.top)*ratio)};
  let drag:{id:string;x:number;y:number;ox:number;oy:number;pan:boolean;changed:boolean}|undefined;
  canvas.addEventListener("contextmenu",e=>e.preventDefault());
  canvas.addEventListener("wheel",e=>{e.preventDefault();const before=world(e);view.zoom=Phaser.Math.Clamp(view.zoom*Math.exp(-e.deltaY*.0015),.08,2.5);draw();const after=world(e);view.x+=before.x-after.x;view.y+=before.y-after.y;draw()},{passive:false});
  canvas.addEventListener("pointerdown",e=>{
    if(busy)return;const p=world(e);
    if(e.button===0){const hit=objects().filter(o=>o.getBounds().contains(p.x,p.y)).sort((a,b)=>b.depth-a.depth)[0];if(!hit)return;selected=hit.getData("mapId");inspect();draw();}
    const o=entity();drag={id:selected,x:e.clientX,y:e.clientY,ox:e.button===0 ? o.x : view.x,oy:e.button===0 ? o.y : view.y,pan:e.button!==0,changed:false};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove",e=>{
    if(!drag)return;const dx=(e.clientX-drag.x)/view.zoom,dy=(e.clientY-drag.y)/view.zoom;drag.changed ||= Math.hypot(dx,dy)>3;
    if(drag.pan){view.x=drag.ox-dx;view.y=drag.oy-dy;draw();}
    else {const object=objects().find(o=>o.getData("mapId")===drag!.id);if(object){object.x=Math.round(drag.ox+dx);object.y=Math.round(drag.oy+dy);}draw();}
  });
  const finish=(e:PointerEvent)=>{const d=drag;drag=undefined;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!d || d.pan)return;
    void run(async()=>{try{if(e.type==="pointercancel" || !d.changed){await render();return;}const object=objects().find(o=>o.getData("mapId")===d.id)!;const next=structuredClone(map);move(next,d.id,object.x,object.y);await commit(next);}catch(error){await render();throw error;}});
  };
  canvas.addEventListener("pointerup",finish);canvas.addEventListener("pointercancel",finish);
}
function center(){const o=entity();view={x:o.x,y:o.y-100,zoom:Math.max(.65,view.zoom)};draw();}
async function stop(){testing=false;await render();status("Arrastra para mover. Rueda para zoom. Arrastre derecho para recorrer.");}
const actions:Record<string,()=>void|Promise<void>>={
  frame:center,import:()=>{$<HTMLInputElement>("map-file").click()},
  export:()=>{const blob=new Blob([JSON.stringify(map,null,2)+"\n"],{type:"application/json"});const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`${map.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status("JSON descargado. La web publicada sigue igual.")},
  play:async()=>{const o=entity();testing=true;await render({x:o.x+("width" in o ? o.width/2 : 0),y:o.y-25});status("Probando desde la selección. Escape vuelve al editor.")},stop,
};
for(const [id,icon,label] of [["frame","frame","Centrar selección"],["import","upload","Importar JSON"],["export","download","Descargar JSON"],["play","play","Probar desde la selección"],["stop","close","Volver al editor"]] as const){setButtonIcon($<HTMLButtonElement>(id),icon,label);$(id).addEventListener("click",()=>void run(actions[id]));}
$("objects").addEventListener("change",()=>{if(busy)return;selected=$<HTMLSelectElement>("objects").value;inspect();center()});
$("properties").addEventListener("submit",e=>e.preventDefault());
$("map-file").addEventListener("change",()=>void run(async()=>{
  const input=$<HTMLInputElement>("map-file"),file=input.files?.[0];input.value="";if(!file)return;
  if(file.size>2*1024*1024)throw Error("El JSON supera los 2 MB.");
  const next=parseMap(JSON.parse(await file.text()));selected=next.spawn.id;await commit(next);center();
}));
window.addEventListener("keydown",e=>{if(testing && e.code==="Escape"){e.preventDefault();void run(stop)}});
await render();status("Arrastra para mover. Rueda para zoom. Arrastre derecho para recorrer.");
