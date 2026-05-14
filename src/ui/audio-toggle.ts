import type { AudioPlayer } from "../audio/player";

export function bindAudioToggle(button: HTMLButtonElement, player: AudioPlayer): void {
  button.addEventListener("click", async () => {
    const playing = await player.toggle();
    button.setAttribute("aria-pressed", String(playing));
  });
}
