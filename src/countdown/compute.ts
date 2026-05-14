import { TARGET_MS } from "./target";

export type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
  progress: number;
};

// Anchor for the progress 0→1 ramp. Picked as the day the spec was written
// (start of the countdown journey). Used only for the `progress` uniform —
// nothing depends on it being exact.
const ANCHOR_MS = Date.parse("2026-05-14T00:00:00Z");

export function compute(now: Date): CountdownState {
  const nowMs = now.getTime();
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
