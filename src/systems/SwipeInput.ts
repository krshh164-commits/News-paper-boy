import type { ThrowSide } from "../core/types";

export class SwipeInput {
  private start: { id: number; x: number; y: number } | null = null;
  constructor(private readonly threshold = 48) {}
  begin(id: number, x: number, y: number): void { this.start = { id, x, y }; }
  end(id: number, x: number, y: number): ThrowSide | null {
    const start = this.start;
    if (!start || start.id !== id) return null;
    this.start = null;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) < this.threshold || Math.abs(dx) <= Math.abs(dy)) return null;
    return dx < 0 ? "left" : "right";
  }
  reset(): void { this.start = null; }
}

