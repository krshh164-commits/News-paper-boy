import { StreetSegment } from "../objects/StreetSegment";
export class RoadSystem {
  readonly sections: StreetSegment[];
  constructor(count = 10) {
    this.sections = Array.from({ length: count }, (_, i) => new StreetSegment(Number((1 - i / count).toFixed(3)), i));
  }
  update(deltaMs: number, speed: number): void {
    const movement = Math.max(0, deltaMs) / 1000 * speed;
    for (const section of this.sections) {
      let depth = section.depth - movement;
      if (depth <= 0) {
        while (depth <= 0) depth += 1;
        section.recycle(depth);
      } else section.move(depth);
    }
  }
  sortByDepth(): void { this.sections.sort((a, b) => b.depth - a.depth); }
  reset(): void { this.sections.forEach((section, i) => section.reset(Number((1 - i / this.sections.length).toFixed(3)))); }
}

