import type { Stamp } from "./progress";
import texts from "./es.json";
import { defaultMap, parseMap, type MapData } from "./map-data";

export type PlatformKind = "checkpoint" | "moving-x" | "moving-y" | "fragile";
export type Platform = readonly [x:number,y:number,width:number,kind?:PlatformKind];

export function createLevel(data:MapData=defaultMap) {
  const MAP = parseMap(data);
  const platformRecords = [...MAP.platforms.filter(p=>!p.branch),...MAP.platforms.filter(p=>p.branch)];
  const tuple = (p:MapData["platforms"][number]):Platform => [p.x,p.y,p.width,p.kind==="solid" ? undefined : p.kind];
  const PLATFORMS = platformRecords.filter(p=>!p.branch).map(tuple);
  const SIDE_PLATFORMS = platformRecords.filter(p=>p.branch).map(tuple);
  const CHECKPOINTS = PLATFORMS.flatMap((p,i)=>p[3]==="checkpoint" ? [i] : []);
  const FRIENDS = MAP.friends;
  const ITEMS = MAP.items.map(item=>({...item,instruction:texts.objetivos[item.id]}));
  const nextStop = (stamps:Set<Stamp>) => ITEMS.find(item=>!stamps.has(item.id)) ??
    {...FRIENDS.find(friend=>friend.name==="Crow")!,instruction:texts.objetivos.crow};
  return {MAP,platformRecords,PLATFORMS,SIDE_PLATFORMS,CHECKPOINTS,FRIENDS,ITEMS,
    BENCHES:MAP.benches,WORLD_WIDTH:MAP.width,ENDING_GATE_X:MAP.ending.x,nextStop};
}

// Default exports keep the route checks and dialogue types independent from the editor.
export const {PLATFORMS,SIDE_PLATFORMS,CHECKPOINTS,FRIENDS,ITEMS,BENCHES,WORLD_WIDTH,ENDING_GATE_X,nextStop} = createLevel();
