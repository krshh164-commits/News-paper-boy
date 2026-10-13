export class PerspectiveProjector {
  constructor(private width: number, private height: number, private horizonY: number) {}
  project(worldX: number, depth: number) {
    const safeDepth = Math.max(0.1, depth);
    const scale = Math.min(1, 0.1 / safeDepth);
    return {
      x: this.width / 2 + worldX * 400 * scale,
      y: this.horizonY + (this.height - this.horizonY) * scale,
      scale,
    };
  }
}

