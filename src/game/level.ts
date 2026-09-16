import type { Stamp } from "./progress";

export const WORLD_WIDTH = 14000;
export type PlatformKind = "checkpoint" | "moving-x" | "moving-y" | "fragile";
export type Platform = readonly [x: number, y: number, width: number, kind?: PlatformKind];
// Main route, in traversal order. Moving islands travel ±50px horizontally or ±40px vertically.
export const PLATFORMS: readonly Platform[] = [
  [0,700,640,"checkpoint"], [735,620,220], [1060,535,190], [1340,440,200],
  [1630,355,240], [1980,455,160], [2260,560,200], [2590,650,250,"checkpoint"], [2960,570,180],
  [3260,650,560,"checkpoint"], [3950,600,180,"moving-x"], [4240,530,170], [4520,490,170,"moving-y"],
  [4800,420,180], [5110,510,240,"checkpoint"], [5480,435,160,"moving-x"], [5790,355,180],
  [6080,435,170,"moving-y"], [6360,520,200],
  [6700,630,570,"checkpoint"], [7380,550,170,"fragile"], [7660,465,140,"fragile"],
  [7910,385,170], [8200,465,220,"checkpoint"], [8550,400,140,"fragile"], [8800,320,130,"fragile"],
  [9040,240,220], [9380,350,160,"fragile"], [9680,460,190],
  [10000,560,330,"checkpoint"], [10460,485,160,"moving-x"], [10750,420,140,"fragile"],
  [11020,345,180,"moving-y"], [11330,435,220,"checkpoint"], [11680,370,130,"fragile"],
  [11930,295,150], [12220,380,160,"moving-x"], [12530,475,140,"fragile"], [12800,560,180],
  [13110,650,890,"checkpoint"],
];
export const SIDE_PLATFORMS: readonly Platform[] = [[1630,260,160], [1870,175,240]];
export const CHECKPOINTS = PLATFORMS.flatMap((p,index) => p[3] === "checkpoint" ? [index] : []);
export const ZONES = [
  { name:"Entrada a la fonda", x:0, checkpoint:0 },
  { name:"Islas de los volantines", x:3260, checkpoint:9 },
  { name:"Jardín de copihues", x:6700, checkpoint:19 },
  { name:"Camino a Crow", x:10000, checkpoint:29 },
] as const;
export const FRIENDS = [
  { name:"Marin", image:"marin-poses", x:430, y:700, height:150 },
  { name:"Tus dibujos", image:"marin-bunny", x:1990, y:175, height:105 },
  { name:"Pibble", image:"pibble", x:3590, y:650, height:83 },
  { name:"Supergirl", image:"supergirl", x:6960, y:630, height:155 },
  { name:"Krypto", image:"krypto", x:7150, y:630, height:74 },
  { name:"Crow", image:"crow-poses", x:13700, y:650, height:104 },
] as const;
export const ITEMS: { id: Stamp; x: number; y: number; instruction: string }[] = [
  { id: "empanada", x: 1750, y: 308, instruction: "Busca la empanada" },
  { id: "completo", x: 5880, y: 308, instruction: "Cruza hasta el completo" },
  { id: "terremoto", x: 9150, y: 193, instruction: "Sube por el terremoto" },
];

export function nextStop(stamps: Set<Stamp>) {
  return ITEMS.find(item => !stamps.has(item.id)) ??
    { x: 13700, y: 650, instruction: "Llega hasta Crow" };
}
