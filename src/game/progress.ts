export const STAMPS = ["empanada", "completo", "terremoto"] as const;
export type Stamp = typeof STAMPS[number];

export function readStamps(raw: string | null): Set<Stamp> {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    return new Set(Array.isArray(value)
      ? value.filter((item): item is Stamp => STAMPS.includes(item))
      : []);
  } catch {
    return new Set();
  }
}

export function readyForCrow(stamps: Set<Stamp>): boolean {
  return STAMPS.every(stamp => stamps.has(stamp));
}
