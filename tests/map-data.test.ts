import {expect,it} from "vitest";
import {defaultMap,parseMap,allEntities} from "../src/game/map-data";
import {createLevel} from "../src/game/level";

it("round-trips the published map without moving or losing its objects",()=>{
  const map=parseMap(JSON.parse(JSON.stringify(defaultMap)));
  expect(map).toEqual(defaultMap);
  expect(new Set(allEntities(map).map(item=>item.id)).size).toBe(allEntities(map).length);
  expect(createLevel(map).PLATFORMS).toHaveLength(40);
  expect(createLevel(map).SIDE_PLATFORMS).toHaveLength(2);
  const id=map.platforms[9].id;
  map.platforms.unshift({...map.platforms[0],id:"extra",kind:"solid"});
  expect(createLevel(map).platformRecords.findIndex(p=>p.id===id)).toBe(10);
});

it("rejects unsafe assets, duplicate identities and broken required content",()=>{
  for(const change of [
    (m:typeof defaultMap)=>{m.decorations[0].image="https://other.invalid/a.png" as never},
    (m:typeof defaultMap)=>{m.platforms[1].id=m.platforms[0].id},
    (m:typeof defaultMap)=>{m.items.pop()},
    (m:typeof defaultMap)=>{m.friends[1].name="Crow"},
    (m:typeof defaultMap)=>{m.platforms[0].x=Infinity},
    (m:typeof defaultMap)=>{m.ending.x=m.width},
    (m:typeof defaultMap)=>{m.platforms.forEach(p=>p.kind="solid")},
  ]) {
    const map=structuredClone(defaultMap);change(map);
    expect(()=>parseMap(map)).toThrow();
  }
});
