export class BestScoreStore {
  private readonly key = "paper-route-best";
  constructor(private readonly storage: Storage) {}
  load(): number {
    const value = Number(this.storage.getItem(this.key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  save(score: number): void {
    if (score > this.load()) this.storage.setItem(this.key, String(Math.floor(score)));
  }
}
