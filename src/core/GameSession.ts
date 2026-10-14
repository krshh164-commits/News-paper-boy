import type { GamePhase, ThrowSide } from "./types";
import { DeliverySystem, type DeliveryEvent, type DeliveryOutcome } from "../systems/DeliverySystem";
import { DELIVERY_PASS_DEPTH } from "../systems/DeliveryWindow";
import { ScoreSystem } from "../systems/ScoreSystem";
import { BestScoreStore } from "../utils/storage";

export class GameSession {
  state: GamePhase = "READY";
  readonly delivery = new DeliverySystem();
  private readonly scoreSystem = new ScoreSystem(1);
  private readonly store: BestScoreStore;
  private elapsedMs = 0;
  constructor(storage: Storage) { this.store = new BestScoreStore(storage); }
  start(): void { if (this.state === "READY") this.state = "PLAYING"; }
  update(deltaMs: number): void {
    if (this.state !== "PLAYING") return;
    this.elapsedMs += Math.max(0, deltaMs); this.scoreSystem.update(deltaMs);
  }
  schedule(side: ThrowSide, startDepth = 1, passDepth = DELIVERY_PASS_DEPTH): void { this.delivery.schedule(side, startDepth, passDepth); }
  setTargetDepth(depth: number): DeliveryEvent[] {
    const events = this.delivery.update(depth);
    if (events.includes("missed")) this.fail("missed");
    return events;
  }
  throw(side: ThrowSide): DeliveryOutcome {
    const outcome = this.delivery.throw(side);
    if (outcome === "success") this.scoreSystem.addDelivery();
    return outcome;
  }
  fail(_reason: string): void {
    if (this.state === "GAME_OVER") return;
    this.state = "GAME_OVER"; this.store.save(this.score);
  }
  reset(): void { this.state = "READY"; this.elapsedMs = 0; this.scoreSystem.reset(); this.delivery.reset(); }
  restart(): void { this.reset(); this.start(); }
  get score(): number { return this.scoreSystem.score; }
  get bestScore(): number { return Math.max(this.store.load(), this.score); }
  snapshot() { return { state: this.state, score: this.score, elapsedMs: this.elapsedMs, activeRequest: this.delivery.active }; }
}
