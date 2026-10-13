import type { ThrowSide } from "../core/types";
import { DELIVERY_PASS_DEPTH } from "./DeliveryWindow";

export type DeliveryOutcome = "success" | "wrong-side" | "unnecessary";
export type DeliveryEvent = "missed";

export class DeliverySystem {
  private side: ThrowSide | null = null;
  private depth = 1;
  private passDepth = DELIVERY_PASS_DEPTH;
  schedule(side: ThrowSide, startDepth: number, passDepth = DELIVERY_PASS_DEPTH): void {
    if (this.side) throw new Error("A delivery request is already active");
    this.side = side; this.depth = startDepth; this.passDepth = passDepth;
  }
  update(depth: number): DeliveryEvent[] {
    this.depth = depth;
    if (!this.side) return [];
    if (depth <= this.passDepth) { this.side = null; return ["missed"]; }
    return [];
  }
  throw(side: ThrowSide): DeliveryOutcome {
    if (!this.side) return "unnecessary";
    if (side !== this.side) { this.side = null; return "wrong-side"; }
    this.side = null; return "success";
  }
  reset(): void { this.side = null; this.depth = 1; this.passDepth = DELIVERY_PASS_DEPTH; }
  get active(): boolean { return this.side !== null; }
  get targetSide(): ThrowSide | null { return this.side; }
}

