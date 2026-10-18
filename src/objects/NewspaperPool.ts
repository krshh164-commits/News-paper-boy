import type { ThrowSide } from "../core/types";
import type { DeliveryOutcome } from "../systems/DeliverySystem";

export function paperFlightTarget(side: ThrowSide, door: { x: number; y: number }, outcome: DeliveryOutcome): { x: number; y: number } {
  if (outcome === "success") return door;
  return { x: side === "left" ? -110 : 830, y: 690 };
}

export class Newspaper {
  active = false;
  side: ThrowSide = "left";
  target = { x: 0, y: 0 };
  progress = 0;
  x = 0;
  y = 0;
  rotation = 0;
  start = { x: 360, y: 910 };
  outcome: DeliveryOutcome = "unnecessary";
  launch(side: ThrowSide, target: { x: number; y: number }, start = { x: 360, y: 910 }, outcome: DeliveryOutcome = "unnecessary"): void {
    this.active = true; this.side = side; this.target.x = target.x; this.target.y = target.y;
    this.start.x = start.x; this.start.y = start.y; this.x = start.x; this.y = start.y; this.progress = 0; this.rotation = 0; this.outcome = outcome;
  }
  complete(): void { this.active = false; }
}
export class NewspaperPool {
  readonly items: Newspaper[];
  constructor(count = 4) { this.items = Array.from({ length: count }, () => new Newspaper()); }
  throw(side: ThrowSide, target: { x: number; y: number }, start = { x: 360, y: 910 }, outcome: DeliveryOutcome = "unnecessary"): Newspaper {
    const item = this.items.find((candidate) => !candidate.active) ?? this.items[0];
    item.launch(side, target, start, outcome); return item;
  }
  update(deltaMs: number): DeliveryOutcome[] {
    const completed: DeliveryOutcome[] = [];
    for (const item of this.items) {
      if (!item.active) continue;
      item.progress = Math.min(1, item.progress + Math.max(0, deltaMs) / 480);
      const t = item.progress;
      const controlX = (360 + item.target.x) / 2;
      const controlY = Math.min(480, item.target.y) - 120;
      const inverse = 1 - t;
      item.x = inverse * inverse * item.start.x + 2 * inverse * t * controlX + t * t * item.target.x;
      item.y = inverse * inverse * item.start.y + 2 * inverse * t * controlY + t * t * item.target.y;
      item.rotation = (item.side === "left" ? -1 : 1) * Math.PI * 4 * t;
      if (t >= 1) { completed.push(item.outcome); item.complete(); }
    }
    return completed;
  }
  reset(): void { this.items.forEach((item) => item.complete()); }
  get activeCount(): number { return this.items.filter((item) => item.active).length; }
}
