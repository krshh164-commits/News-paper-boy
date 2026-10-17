export class BestScoreStore {
  private readonly key = "news-paper-boy-best";
  private readonly legacyKey = "paper-route-best";
  constructor(private readonly storage: Storage) {}
  load(): number {
    const current = this.storage.getItem(this.key);
    if (current === null) {
      const legacy = Number(this.storage.getItem(this.legacyKey));
      if (Number.isFinite(legacy) && legacy > 0) {
        const migrated = Math.floor(legacy);
        try { this.storage.setItem(this.key, String(migrated)); } catch { /* read-only storage still returns the saved score */ }
        return migrated;
      }
    }
    const value = Number(current);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  save(score: number): void {
    if (score > this.load()) this.storage.setItem(this.key, String(Math.floor(score)));
  }
}
