import { TARGET_MS } from "./target";

export type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
  progress: number;
};

const ANCHOR_MS = Date.parse("2026-05-14T00:00:00Z");

// Time travel for manual QA: ?t=ISO offsets `now`. Falls through to real time
// when the query param is missing or invalid.
function readOverride(): number | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("t");
  if (!param) return null;
  const parsed = Date.parse(param);
  return Number.isFinite(parsed) ? parsed - Date.now() : null;
}

const offsetMs = readOverride() ?? 0;

export function compute(now: Date): CountdownState {
  const nowMs = now.getTime() + offsetMs;
  const remaining = TARGET_MS - nowMs;

  if (remaining <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      arrived: true,
      progress: 1,
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const elapsed = nowMs - ANCHOR_MS;
  const span = TARGET_MS - ANCHOR_MS;
  const rawProgress = elapsed / span;
  const progress = Math.max(0, Math.min(1, rawProgress));

  return { days, hours, minutes, seconds, arrived: false, progress };
}
