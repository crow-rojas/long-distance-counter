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
  const ITEMS = MAP.items;
  const WORLD_TOP = Math.min(-350,...MAP.platforms.map(p=>p.y-500));
  const WORLD_BOTTOM = Math.max(1050,...MAP.platforms.map(p=>p.y+350));
  const crow = FRIENDS.find(friend=>friend.name==="Crow")!;
  const finalIsland = MAP.platforms.find(p=>p.y===crow.y && p.x<=crow.x && p.x+p.width>=crow.x);
  const right = Math.max(crow.x+120,finalIsland ? finalIsland.x+finalIsland.width-36 : crow.x+150);
  const ENDING_AREA = {x:MAP.ending.x-24,y:MAP.ending.y-200,width:right-MAP.ending.x+24,height:300};
  return {MAP,platformRecords,PLATFORMS,SIDE_PLATFORMS,CHECKPOINTS,FRIENDS,ITEMS,
    BENCHES:MAP.benches,WORLD_WIDTH:MAP.width,WORLD_TOP,WORLD_BOTTOM,ENDING_AREA,finalIsland,ENDING_GATE_X:MAP.ending.x};
}

// Default exports keep the route checks and dialogue types independent from the editor.
export const {PLATFORMS,SIDE_PLATFORMS,CHECKPOINTS,FRIENDS,ITEMS,BENCHES,WORLD_WIDTH,ENDING_GATE_X} = createLevel();
