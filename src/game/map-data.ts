import original from "./map.json";
import texts from "./es.json";
import { STAMPS, type Stamp } from "./progress";

export const CHARACTER_NAMES = ["Marin","Tus dibujos","Pibble","Supergirl","Krypto","Crow"] as const;
export type CharacterName = typeof CHARACTER_NAMES[number];
export const PLATFORM_KINDS = ["solid","checkpoint","moving-x","moving-y","fragile"] as const;
export const DECORATIONS = ["ramada","lantern","flowerpot","volantin","copihue","sign","garland"] as const;
type Point = { id:string; x:number; y:number };
export type MapPlatform = Point & { width:number; kind:typeof PLATFORM_KINDS[number]; branch:boolean };
export type MapFriend = Point & { name:CharacterName; image:string; height:number };
export type MapDecoration = Point & {
  image:typeof DECORATIONS[number]; height:number; angle:number; depth:number; alpha:number; originY:number; tint:number;
};
export type MapSign = Point & { textKey:keyof typeof texts.carteles; text:string; board:boolean };
export type MapData = {
  version:1; id:string; width:number; spawn:Point; ending:Point;
  platforms:MapPlatform[]; friends:MapFriend[]; items:(Point & {id:Stamp})[];
  benches:(Point & {height:number})[]; decorations:MapDecoration[]; signs:MapSign[];
};
export type MapEntity = Point | MapPlatform | MapFriend | MapDecoration | MapSign | (Point & {height:number});
export const allEntities = (map:MapData):MapEntity[] =>
  [map.spawn,map.ending,...map.platforms,...map.friends,...map.items,...map.benches,...map.decorations,...map.signs];

// Imports are data only: bounded numbers, known assets, unique IDs and required characters/items.
export function parseMap(value:unknown):MapData {
  const fail=(message:string):never=>{throw Error(message)};
  const record=(v:unknown):Record<string,unknown>=>{
    if (!v || typeof v!=="object" || Array.isArray(v)) fail("El mapa contiene un elemento inválido.");
    return v as Record<string,unknown>;
  };
  const number=(v:unknown,min:number,max:number,label:string):number=>{
    if (typeof v!=="number" || !Number.isFinite(v) || v<min || v>max) fail(`${label}: usa un número entre ${min} y ${max}.`);
    return v as number;
  };
  const string=(v:unknown,max:number,label:string):string=>{
    if (typeof v!=="string" || v.length>max) fail(`${label}: texto inválido.`);
    return v as string;
  };
  const choice=<T extends string>(v:unknown,choices:readonly T[],label:string):T=>{
    if (!choices.includes(v as T)) fail(`${label}: valor desconocido.`);
    return v as T;
  };
  const bool=(v:unknown):boolean=>{
    if (typeof v!=="boolean") fail("El mapa contiene una opción inválida.");
    return v as boolean;
  };
  const data=record(value);
  if (data.version!==1) fail("Esta versión de mapa no es compatible.");
  const id=string(data.id,80,"Nombre del mapa");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail("El nombre del mapa solo admite letras minúsculas, números y guiones.");
  const width=number(data.width,1000,60000,"Ancho del mapa"),ids=new Set<string>();
  const point=(v:unknown):Point=>{
    const p=record(v),id=string(p.id,80,"Identificador");
    if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) fail("Cada elemento necesita un identificador único.");
    ids.add(id);
    return {id,x:number(p.x,0,width,"X"),y:number(p.y,-300,1000,"Y")};
  };
  const list=<T>(key:string,read:(v:Record<string,unknown>)=>T):T[]=>{
    const values=data[key];
    if (!Array.isArray(values) || values.length>1000) fail(`${key}: se admiten hasta 1000 elementos.`);
    return (values as unknown[]).map(v=>read(record(v)));
  };
  const map:MapData={
    version:1,id,width,spawn:point(data.spawn),ending:point(data.ending),
    platforms:list("platforms",p=>({...point(p),width:number(p.width,60,2000,"Ancho"),
      kind:choice(p.kind,PLATFORM_KINDS,"Plataforma"),branch:bool(p.branch)})),
    friends:list("friends",p=>({...point(p),name:choice(p.name,CHARACTER_NAMES,"Personaje"),
      image:choice(p.image,["marin-poses","marin-bunny","pibble","supergirl","krypto","crow-poses"],"Imagen"),
      height:number(p.height,30,350,"Alto")})),
    items:list("items",p=>({...point(p),id:choice(p.id,STAMPS,"Comida")})),
    benches:list("benches",p=>({...point(p),height:number(p.height,30,250,"Alto")})),
    decorations:list("decorations",p=>({...point(p),image:choice(p.image,DECORATIONS,"Decoración"),
      height:number(p.height,20,800,"Alto"),angle:number(p.angle,-180,180,"Ángulo"),
      depth:number(p.depth,-4,4,"Capa"),alpha:number(p.alpha,0,1,"Opacidad"),
      originY:number(p.originY,0,1,"Anclaje"),tint:number(p.tint,0,0xffffff,"Color")})),
    signs:list("signs",p=>({...point(p),textKey:choice(p.textKey,Object.keys(texts.carteles) as MapSign["textKey"][],"Cartel"),
      text:string(p.text,240,"Texto del cartel"),board:bool(p.board)})),
  };
  if (!map.platforms.some(p=>p.kind==="checkpoint" && !p.branch)) fail("Hace falta al menos un checkpoint principal.");
  if (map.platforms.some(p=>p.kind==="checkpoint" && p.branch)) fail("Los checkpoints deben estar en el recorrido principal.");
  if (map.platforms.some(p=>p.x+p.width>width)) fail("Una plataforma queda fuera del ancho del mapa.");
  if (map.friends.length!==CHARACTER_NAMES.length ||
      CHARACTER_NAMES.some(name=>map.friends.filter(f=>f.name===name).length!==1)) fail("Conserva una copia de cada personaje.");
  if (map.items.length!==3 || STAMPS.some(id=>!map.items.some(item=>item.id===id))) fail("Conserva los tres objetos de comida.");
  const crow=map.friends.find(f=>f.name==="Crow")!;
  if (crow.image!=="crow-poses") fail("Crow necesita sus poses para el encuentro final.");
  if (crow.x<map.ending.x+85 || crow.y!==map.ending.y) fail("Crow debe estar a la derecha de la entrada final y a la misma altura.");
  if (map.spawn.x>=map.ending.x) fail("El inicio debe quedar antes de la zona final.");
  return map;
}

export const defaultMap = parseMap(original);
