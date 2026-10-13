export interface Difficulty { speed: number; requestGapMs: number; windowDepth: number }
export function difficultyAt(elapsedMs: number): Difficulty {
  const t = Math.max(0, Math.min(1, elapsedMs / 90_000));
  return {
    speed: Number((0.16 + 0.16 * t).toFixed(3)),
    requestGapMs: Math.round(3200 - 1700 * t),
    windowDepth: Number((0.17 - 0.07 * t).toFixed(3)),
  };
}

