export interface Difficulty { speed: number; requestGapMs: number; windowDepth: number; reactionSeconds: number }
export type RequestSide = "left" | "right";

export function difficultyAt(elapsedMs: number, successfulDeliveries = 0): Difficulty {
  const t = Math.max(0, Math.min(1, elapsedMs / 90_000 + Math.max(0, successfulDeliveries) * .055));
  return {
    speed: Number((0.14 + 0.19 * t).toFixed(3)),
    requestGapMs: Math.round(3600 - 2150 * t),
    windowDepth: Number((0.18 - 0.08 * t).toFixed(3)),
    reactionSeconds: Number((2.65 - 1.15 * t).toFixed(2)),
  };
}

const REQUEST_PATTERN: readonly RequestSide[] = ["left", "right", "right", "left", "right", "left", "left", "right"];
export function requestSideFor(successfulDeliveries: number): RequestSide {
  return REQUEST_PATTERN[Math.max(0, Math.floor(successfulDeliveries)) % REQUEST_PATTERN.length];
}

