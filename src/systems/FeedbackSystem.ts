export interface FeedbackValue { sound: boolean; vibration: boolean }
export type SoundCue = "start" | "request" | "throw" | "success" | "reward" | "wrong" | "missed" | "game-over" | "music";
export interface SoundProfile { frequency: number; endFrequency: number; duration: number; wave: OscillatorType; volume: number }
export const SOUND_PROFILES: Record<SoundCue, SoundProfile> = {
  start: { frequency: 440, endFrequency: 660, duration: .12, wave: "sine", volume: .08 },
  request: { frequency: 620, endFrequency: 880, duration: .1, wave: "sine", volume: .065 },
  throw: { frequency: 310, endFrequency: 540, duration: .09, wave: "triangle", volume: .055 },
  success: { frequency: 720, endFrequency: 980, duration: .11, wave: "sine", volume: .075 },
  reward: { frequency: 880, endFrequency: 1320, duration: .16, wave: "square", volume: .055 },
  wrong: { frequency: 230, endFrequency: 170, duration: .12, wave: "triangle", volume: .06 },
  missed: { frequency: 180, endFrequency: 92, duration: .2, wave: "sawtooth", volume: .065 },
  "game-over": { frequency: 150, endFrequency: 58, duration: .3, wave: "triangle", volume: .075 },
  music: { frequency: 392, endFrequency: 440, duration: .08, wave: "sine", volume: .018 },
};
export class FeedbackSettings {
  private readonly key = "news-paper-boy-settings";
  private readonly legacyKey = "paper-route-settings";
  private current: FeedbackValue;
  constructor(private readonly storage: Storage) {
    try {
      const current = storage.getItem(this.key);
      const legacy = current === null ? storage.getItem(this.legacyKey) : null;
      const saved: unknown = JSON.parse(current ?? legacy ?? "{}");
      const value = saved && typeof saved === "object" ? saved as Partial<FeedbackValue> : {};
      this.current = {
        sound: typeof value.sound === "boolean" ? value.sound : true,
        vibration: typeof value.vibration === "boolean" ? value.vibration : true,
      };
      if (current === null && legacy !== null) this.save();
    }
    catch { this.current = { sound: true, vibration: true }; }
  }
  setSound(sound: boolean): void { this.current.sound = sound; this.save(); }
  setVibration(vibration: boolean): void { this.current.vibration = vibration; this.save(); }
  get value(): FeedbackValue { return { ...this.current }; }
  play(kind: SoundCue): void {
    if (this.current.sound) window.dispatchEvent(new CustomEvent("paper-route-audio", { detail: { kind, profile: SOUND_PROFILES[kind] } }));
  }
  pulse(pattern: number | number[]): void {
    try { if (this.current.vibration && navigator.vibrate) navigator.vibrate(pattern); } catch { /* vibration is optional */ }
  }
  private save(): void { try { this.storage.setItem(this.key, JSON.stringify(this.current)); } catch { /* storage is optional */ } }
}
