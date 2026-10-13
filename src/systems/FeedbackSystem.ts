export interface FeedbackValue { sound: boolean; vibration: boolean }
export class FeedbackSettings {
  private readonly key = "paper-route-settings";
  private current: FeedbackValue;
  constructor(private readonly storage: Storage) {
    try {
      const saved: unknown = JSON.parse(storage.getItem(this.key) ?? "{}");
      const value = saved && typeof saved === "object" ? saved as Partial<FeedbackValue> : {};
      this.current = {
        sound: typeof value.sound === "boolean" ? value.sound : true,
        vibration: typeof value.vibration === "boolean" ? value.vibration : true,
      };
    }
    catch { this.current = { sound: true, vibration: true }; }
  }
  setSound(sound: boolean): void { this.current.sound = sound; this.save(); }
  setVibration(vibration: boolean): void { this.current.vibration = vibration; this.save(); }
  get value(): FeedbackValue { return { ...this.current }; }
  play(kind: "throw" | "success" | "fail"): void {
    if (this.current.sound) window.dispatchEvent(new CustomEvent("paper-route-audio", { detail: { kind } }));
  }
  pulse(pattern: number | number[]): void {
    try { if (this.current.vibration && navigator.vibrate) navigator.vibrate(pattern); } catch { /* vibration is optional */ }
  }
  private save(): void { try { this.storage.setItem(this.key, JSON.stringify(this.current)); } catch { /* storage is optional */ } }
}
