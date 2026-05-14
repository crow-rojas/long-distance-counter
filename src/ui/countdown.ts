import type { CountdownState } from "../countdown/compute";
import { pad2 } from "../countdown/format";

type Refs = {
  days: HTMLElement;
  time: HTMLElement;
};

export function createCountdownView(refs: Refs) {
  let lastSecondKey = "";

  return {
    update(state: CountdownState): void {
      const key = `${state.days}|${state.hours}|${state.minutes}|${state.seconds}`;
      if (key === lastSecondKey) return;
      lastSecondKey = key;

      refs.days.textContent = String(state.days);
      refs.time.textContent = `${pad2(state.hours)}h · ${pad2(state.minutes)}m · ${pad2(state.seconds)}s`;
    },
  };
}
