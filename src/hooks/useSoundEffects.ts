import { useCallback, useRef } from "react";

type SoundType = "success" | "error" | "tap";

const FREQUENCIES: Record<SoundType, number[]> = {
  success: [523, 659, 784],
  error: [330, 247],
  tap: [440],
};

const DURATIONS: Record<SoundType, number> = {
  success: 120,
  error: 150,
  tap: 50,
};

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const play = useCallback((type: SoundType) => {
    try {
      const ctx = getCtx();
      const dur = DURATIONS[type];
      const freqs = FREQUENCIES[type];

      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type === "tap" ? "sine" : "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * (dur / 1000));
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * (dur / 1000) + dur / 1000);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * (dur / 1000));
        osc.stop(ctx.currentTime + i * (dur / 1000) + dur / 1000);
      });
    } catch {
      // Audio not available
    }
  }, [getCtx]);

  return { play };
}
