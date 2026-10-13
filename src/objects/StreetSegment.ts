export class StreetSegment {
  variant = 0;
  cycleCount = 0;
  constructor(public depth: number, readonly index = 0) {}
  move(depth: number): void { this.depth = depth; }
  recycle(depth: number): void { this.depth = depth; this.variant = (this.variant + 1) % 5; this.cycleCount++; }
  reset(depth: number): void { this.depth = depth; this.variant = 0; this.cycleCount = 0; }
}

