export type StreetSide = "left" | "right";

const HORIZON_X = 360;
const HORIZON_Y = 600;
const ROAD_HALF_WIDTH = 180;
const STREET_DEPTH_HEIGHT = 680;
const BUBBLE_WIDTH = 128;

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export function streetScale(depth: number): number {
  return clamp(1.05 - depth, .025, .98);
}

export function streetGround(scale: number): number {
  return HORIZON_Y + STREET_DEPTH_HEIGHT * clamp(scale, 0, 1);
}

export function roadEdge(side: StreetSide, scale: number): number {
  const direction = side === "left" ? -1 : 1;
  return HORIZON_X + direction * ROAD_HALF_WIDTH * Math.pow(clamp(scale, 0, 1), 1.18);
}

export function facadeScale(scale: number): number {
  const depth = clamp(scale, 0, 1);
  return depth * (1 + .32 * depth);
}

export function requestBubbleLayout(side: StreetSide, doorX: number, doorTop: number, perspective: number, viewportWidth = 720): {
  x: number;
  y: number;
  scale: number;
} {
  const direction = side === "left" ? -1 : 1;
  const scale = clamp(.82 + .18 * perspective, .82, 1);
  const halfWidth = BUBBLE_WIDTH * scale / 2;
  return {
    x: clamp(doorX + direction * halfWidth * .96, halfWidth + 5, viewportWidth - halfWidth - 5),
    y: doorTop - 38 * scale,
    scale,
  };
}

