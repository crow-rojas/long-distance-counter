type ArrivalRefs = {
  countdown: HTMLElement;
  arrival: HTMLElement;
};

export type ArrivalController = {
  update(arrived: boolean): void;
  getUniform(): number;
};

const FADE_MS = 1200;

export function createArrival(refs: ArrivalRefs): ArrivalController {
  let started = false;
  let startedAt = 0;

  function trigger() {
    if (started) return;
    started = true;
    startedAt = performance.now();
    refs.countdown.style.opacity = "0";
    setTimeout(() => {
      refs.arrival.hidden = false;
    }, 800);
  }

  return {
    update(arrived: boolean) {
      if (arrived) trigger();
    },
    getUniform() {
      if (!started) return 0;
      const t = (performance.now() - startedAt) / FADE_MS;
      return Math.max(0, Math.min(1, t));
    },
  };
}
