export type StreetSide = "left" | "right";

const HORIZON_X = 360;
const HORIZON_Y = 600;
const ROAD_HALF_WIDTH = 180;
const STREET_DEPTH_HEIGHT = 680;
const BUBBLE_WIDTH = 128;
const FAR_SCALE = .05;
const QUADRATIC_WEIGHT = .55;
const FOREGROUND_WEIGHT = .58;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function streetScale(depth: number): number {
  const forwardProgress = Math.max(0, 1 - depth);
  return FAR_SCALE
    + QUADRATIC_WEIGHT * forwardProgress * forwardProgress
    + FOREGROUND_WEIGHT * Math.pow(forwardProgress, 4);
}

export function streetGround(scale: number): number {
  return HORIZON_Y + STREET_DEPTH_HEIGHT * Math.max(0, scale);
}

export function roadEdge(side: StreetSide, scale: number): number {
  const direction = side === "left" ? -1 : 1;
  return HORIZON_X + direction * ROAD_HALF_WIDTH * Math.pow(Math.max(0, scale), 1.18);
}

export function facadeScale(scale: number): number {
  const depth = Math.max(0, scale);
  return depth * (1 + .62 * depth);
}

export function requestBubbleLayout(side: StreetSide, doorX: number, doorTop: number, perspective: number, viewportWidth = 720): {
  x: number;
  y: number;
  scale: number;
} {
  const direction = side === "left" ? -1 : 1;
  const scale = clamp(.82 + .4 * perspective, .84, 1.22);
  const halfWidth = BUBBLE_WIDTH * scale / 2;
  return {
    x: clamp(doorX + direction * halfWidth * .96, halfWidth + 5, viewportWidth - halfWidth - 5),
    y: clamp(doorTop - 38 * scale, 116, 1218),
    scale,
  };
}

