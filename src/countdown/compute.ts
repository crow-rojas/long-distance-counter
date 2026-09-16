import { TARGET_MS } from "./target";

export type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
};

// Time travel for manual QA: ?t=ISO offsets `now`. Falls through to real time
// when the query param is missing or invalid.
function readOverride(): number | null {
  if (typeof window === "undefined") return null;
  const param = new URLSearchParams(window.location.search).get("t");
  if (!param) return null;
  const parsed = Date.parse(param);
  return Number.isFinite(parsed) ? parsed - Date.now() : null;
}

const overrideMs = readOverride();
export const isPreview = overrideMs !== null;
const offsetMs = overrideMs ?? 0;

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
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, arrived: false };
}
