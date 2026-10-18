import {
  AudioLifecycle,
  SOUND_PROFILES,
  SoundCueLimiter,
  type AudioAction,
  type SoundCue,
} from "./FeedbackSystem";

interface ActiveSound { source: AudioScheduledSourceNode; gain: GainNode }
interface EngineNodes { carrier: OscillatorNode; harmonic: OscillatorNode; lfo: OscillatorNode; gain: GainNode }

export class GameAudioSystem {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private engine: EngineNodes | null = null;
  private readonly active = new Map<SoundCue, Set<ActiveSound>>();
  private readonly limiter = new SoundCueLimiter();
  private readonly lifecycle: AudioLifecycle;

  constructor(enabled: boolean) { this.lifecycle = new AudioLifecycle(enabled); }

  unlock(): void {
    const context = this.ensureContext();
    if (context?.state === "suspended") void context.resume();
  }
  start(speed: number): void { this.unlock(); this.apply(this.lifecycle.start(speed)); }
  setSpeed(speed: number): void { this.apply(this.lifecycle.updateSpeed(speed)); }
  setEnabled(enabled: boolean): void {
    if (!enabled) this.stopAllCues();
    this.apply(this.lifecycle.setEnabled(enabled));
  }
  play(cue: SoundCue): void { this.apply(this.lifecycle.cue(cue)); }
  gameOver(): void { this.apply(this.lifecycle.gameOver()); }
  stop(): void { this.apply(this.lifecycle.stop()); }
  destroy(): void {
    this.stop();
    this.stopAllCues();
    const context = this.context;
    this.context = null; this.master = null; this.noise = null;
    if (context && context.state !== "closed") void context.close();
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    try {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = .82;
      this.master.connect(this.context.destination);
      const length = Math.round(this.context.sampleRate * .22);
      this.noise = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
      return this.context;
    } catch {
      this.context = null; this.master = null;
      return null;
    }
  }

  private apply(actions: AudioAction[]): void {
    for (const action of actions) {
      if (action.type === "engine-start") this.startEngine(action.pitch);
      else if (action.type === "engine-pitch") this.updateEnginePitch(action.pitch);
      else if (action.type === "engine-stop") this.stopEngine();
      else if (action.type === "cue-stop") this.stopCue(action.cue);
      else this.playCue(action.cue);
    }
  }

  private startEngine(pitch: number): void {
    const context = this.ensureContext();
    if (!context || !this.master) return;
    if (this.engine) { this.updateEnginePitch(pitch); return; }
    const now = context.currentTime;
    const carrier = context.createOscillator();
    const harmonic = context.createOscillator();
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    const carrierGain = context.createGain();
    const harmonicGain = context.createGain();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    carrier.type = "triangle"; harmonic.type = "sawtooth"; lfo.type = "sine";
    carrier.frequency.setValueAtTime(pitch, now);
    harmonic.frequency.setValueAtTime(pitch * 2.02, now);
    lfo.frequency.setValueAtTime(7.2, now);
    lfoDepth.gain.setValueAtTime(2.8, now);
    carrierGain.gain.value = .72; harmonicGain.gain.value = .16;
    filter.type = "lowpass"; filter.frequency.value = 330; filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.026, now + .28);
    lfo.connect(lfoDepth); lfoDepth.connect(carrier.frequency); lfoDepth.connect(harmonic.frequency);
    carrier.connect(carrierGain).connect(filter);
    harmonic.connect(harmonicGain).connect(filter);
    filter.connect(gain).connect(this.master);
    carrier.start(now); harmonic.start(now); lfo.start(now);
    this.engine = { carrier, harmonic, lfo, gain };
  }

  private updateEnginePitch(pitch: number): void {
    if (!this.engine || !this.context) return;
    const now = this.context.currentTime;
    this.engine.carrier.frequency.setTargetAtTime(pitch, now, .18);
    this.engine.harmonic.frequency.setTargetAtTime(pitch * 2.02, now, .18);
  }

  private stopEngine(): void {
    if (!this.engine || !this.context) return;
    const engine = this.engine;
    const now = this.context.currentTime;
    this.engine = null;
    engine.gain.gain.cancelScheduledValues(now);
    engine.gain.gain.setTargetAtTime(.0001, now, .055);
    for (const oscillator of [engine.carrier, engine.harmonic, engine.lfo]) {
      try { oscillator.stop(now + .24); } catch { /* already stopped */ }
    }
  }

  private playCue(cue: SoundCue): void {
    const context = this.ensureContext();
    if (!context || !this.master || !this.limiter.allow(cue, performance.now())) return;
    if (cue === "throw") { this.playSwish(); return; }
    if (cue === "music" || cue === "missed") return;
    const profile = SOUND_PROFILES[cue];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency, now + profile.duration);
    const volume = cue === "game-over" ? .09 : cue === "wrong" ? .048 : profile.volume;
    gain.gain.setValueAtTime(Math.max(.001, volume), now);
    gain.gain.exponentialRampToValueAtTime(.001, now + profile.duration);
    oscillator.connect(gain).connect(this.master);
    this.track(cue, oscillator, gain);
    oscillator.start(now); oscillator.stop(now + profile.duration + .015);
  }

  private playSwish(): void {
    if (!this.context || !this.master || !this.noise) return;
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noise;
    filter.type = "bandpass"; filter.Q.value = .8;
    filter.frequency.setValueAtTime(1_650, now);
    filter.frequency.exponentialRampToValueAtTime(430, now + .13);
    gain.gain.setValueAtTime(.042, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + .14);
    source.connect(filter).connect(gain).connect(this.master);
    this.track("throw", source, gain);
    source.start(now); source.stop(now + .15);
  }

  private track(cue: SoundCue, source: AudioScheduledSourceNode, gain: GainNode): void {
    const sound = { source, gain };
    const sounds = this.active.get(cue) ?? new Set<ActiveSound>();
    sounds.add(sound); this.active.set(cue, sounds);
    source.addEventListener("ended", () => sounds.delete(sound), { once: true });
  }

  private stopCue(cue: SoundCue): void {
    const sounds = this.active.get(cue);
    if (!sounds || !this.context) return;
    const now = this.context.currentTime;
    for (const sound of sounds) {
      sound.gain.gain.cancelScheduledValues(now);
      sound.gain.gain.setTargetAtTime(.001, now, .012);
      try { sound.source.stop(now + .04); } catch { /* already stopped */ }
    }
    sounds.clear();
  }

  private stopAllCues(): void {
    for (const cue of this.active.keys()) this.stopCue(cue);
    this.limiter.reset();
  }
}
