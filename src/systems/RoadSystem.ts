import { StreetSegment } from "../objects/StreetSegment";

export const ROAD_SPAWN_DEPTH = 1;
export const ROAD_EXIT_DEPTH = -.18;
export const ROAD_CYCLE_SPAN = ROAD_SPAWN_DEPTH - ROAD_EXIT_DEPTH;

function startingDepth(index: number, count: number): number {
  return Number((ROAD_SPAWN_DEPTH - index * ROAD_CYCLE_SPAN / count).toFixed(3));
}

export class RoadSystem {
  readonly sections: StreetSegment[];
  constructor(count = 10) {
    this.sections = Array.from({ length: count }, (_, i) => new StreetSegment(startingDepth(i, count), i));
  }
  update(deltaMs: number, speed: number): void {
    const movement = Math.max(0, deltaMs) / 1000 * speed;
    for (const section of this.sections) {
      let depth = section.depth - movement;
      if (depth <= ROAD_EXIT_DEPTH) {
        while (depth <= ROAD_EXIT_DEPTH) depth += ROAD_CYCLE_SPAN;
        section.recycle(depth);
      } else section.move(depth);
    }
  }
  sortByDepth(): void { this.sections.sort((a, b) => b.depth - a.depth); }
  reset(): void { this.sections.forEach((section, i) => section.reset(startingDepth(i, this.sections.length))); }
}

