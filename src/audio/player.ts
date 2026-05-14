export type AudioPlayer = {
  toggle(): Promise<boolean>;
  isPlaying(): boolean;
};

export function createAudioPlayer(src: string): AudioPlayer {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "none";
  audio.volume = 0.4;

  let playing = false;

  return {
    async toggle() {
      if (playing) {
        audio.pause();
        playing = false;
        return false;
      }
      try {
        await audio.play();
        playing = true;
        return true;
      } catch {
        playing = false;
        return false;
      }
    },
    isPlaying() {
      return playing;
    },
  };
}
