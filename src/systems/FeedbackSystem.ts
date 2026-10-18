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

export function enginePitchForSpeed(speed: number): number {
  const progress = Math.max(0, Math.min(1, (speed - .14) / .19));
  return 62 + 42 * progress * progress;
}

export class SoundCueLimiter {
  private readonly lastPlayed = new Map<string, number>();
  private readonly cooldowns: Record<string, number> = { throw: 80, wrong: 140, success: 100, reward: 100 };
  allow(kind: string, nowMs: number): boolean {
    const last = this.lastPlayed.get(kind);
    const cooldown = this.cooldowns[kind] ?? 0;
    if (last !== undefined && nowMs - last < cooldown) return false;
    this.lastPlayed.set(kind, nowMs);
    return true;
  }
  reset(): void { this.lastPlayed.clear(); }
}

export type AudioAction =
  | { type: "engine-start"; pitch: number }
  | { type: "engine-pitch"; pitch: number }
  | { type: "engine-stop" }
  | { type: "cue"; cue: SoundCue }
  | { type: "cue-stop"; cue: SoundCue };

export class AudioLifecycle {
  private riding = false;
  private ended = false;
  private pitch = enginePitchForSpeed(.14);
  constructor(private enabled: boolean) {}
  start(speed: number): AudioAction[] {
    this.riding = true;
    this.ended = false;
    this.pitch = enginePitchForSpeed(speed);
    return this.enabled ? [{ type: "engine-start", pitch: this.pitch }] : [];
  }
  updateSpeed(speed: number): AudioAction[] {
    this.pitch = enginePitchForSpeed(speed);
    return this.enabled && this.riding ? [{ type: "engine-pitch", pitch: this.pitch }] : [];
  }
  setEnabled(enabled: boolean): AudioAction[] {
    if (this.enabled === enabled) return [];
    this.enabled = enabled;
    if (!this.riding) return [];
    return enabled ? [{ type: "engine-start", pitch: this.pitch }] : [{ type: "engine-stop" }];
  }
  cue(cue: SoundCue): AudioAction[] { return this.enabled && !this.ended ? [{ type: "cue", cue }] : []; }
  gameOver(): AudioAction[] {
    if (this.ended) return [];
    this.ended = true;
    const wasRiding = this.riding;
    this.riding = false;
    if (!this.enabled) return [];
    return [
      ...(wasRiding ? [{ type: "engine-stop" } as const] : []),
      { type: "cue-stop", cue: "wrong" },
      { type: "cue", cue: "game-over" },
    ];
  }
  stop(): AudioAction[] {
    const wasRiding = this.riding;
    this.riding = false;
    return this.enabled && wasRiding ? [{ type: "engine-stop" }] : [];
  }
}

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
  setSound(sound: boolean): void {
    this.current.sound = sound;
    this.save();
    window.dispatchEvent(new CustomEvent("paper-route-sound-setting", { detail: sound }));
  }
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
