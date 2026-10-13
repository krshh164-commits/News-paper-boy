export class ScoreSystem {
  private elapsedMs = 0;
  private bonus = 0;
  constructor(private readonly pointsPerSecond = 1) {}
  update(deltaMs: number): void { this.elapsedMs += Math.max(0, deltaMs); }
  addDelivery(): void { this.bonus += 10; }
  reset(): void { this.elapsedMs = 0; this.bonus = 0; }
  get score(): number { return Math.floor(this.elapsedMs / 1000 * this.pointsPerSecond) + this.bonus; }
}

