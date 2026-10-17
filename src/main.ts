import Phaser from "phaser";
import { RiderView, type RiderState } from "./render/RiderView";
import { createGameConfig, GameScene } from "./scenes/GameScene";
import { FeedbackSettings, type SoundProfile } from "./systems/FeedbackSystem";
import { GameUI } from "./ui/GameUI";
import "./style.css";

const app = document.querySelector<HTMLElement>("#app")!;
let game: Phaser.Game;
const feedback = new FeedbackSettings(localStorage);
const ui = new GameUI(app, {
  onStart: () => (game.scene.getScene("game") as GameScene).startRun(),
  onRestart: () => (game.scene.getScene("game") as GameScene).restart(),
  settings: feedback,
});
const shell = app.querySelector<HTMLElement>(".game-shell")!;
const rider = new RiderView(shell);
let riderResetTimer = 0;
let audioContext: AudioContext | null = null;
let musicTimer = 0;

function playTone(profile: SoundProfile): void {
  try {
    audioContext ??= new AudioContext();
    void audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(profile.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.endFrequency, now + profile.duration);
    gain.gain.setValueAtTime(profile.volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + profile.duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + profile.duration);
  } catch { /* audio remains optional */ }
}

function startMusic(): void {
  window.clearInterval(musicTimer);
  musicTimer = window.setInterval(() => feedback.play("music"), 520);
}

function stopMusic(): void { window.clearInterval(musicTimer); musicTimer = 0; }

game = new Phaser.Game(createGameConfig(app.querySelector<HTMLElement>("#game-canvas")!));

window.addEventListener("paper-route-rider", ((event: CustomEvent<RiderState>) => {
  window.clearTimeout(riderResetTimer);
  rider.setState(event.detail);
  if (event.detail === "fail") feedback.play("game-over");
  else if (event.detail.startsWith("throw")) feedback.play("throw");
  feedback.pulse(event.detail === "fail" ? [70, 40, 110] : 35);
  if (event.detail.startsWith("throw")) riderResetTimer = window.setTimeout(() => {
    if (rider.currentState !== "fail") rider.setState("ride");
  }, 240);
}) as EventListener);
window.addEventListener("paper-route-feedback", ((event: CustomEvent) => {
  if (event.detail.kind === "success") { feedback.play("success"); window.setTimeout(() => feedback.play("reward"), 80); }
  else if (event.detail.kind === "wrong") feedback.play("wrong");
  else if (event.detail.kind === "missed") feedback.play("missed");
}) as EventListener);
window.addEventListener("news-paper-boy-request", () => feedback.play("request"));
window.addEventListener("paper-route-audio", ((event: CustomEvent<{ profile: SoundProfile }>) => playTone(event.detail.profile)) as EventListener);
window.addEventListener("paper-route-run", ((event: CustomEvent<"start" | "stop">) => {
  if (event.detail === "start") { feedback.play("start"); startMusic(); } else stopMusic();
}) as EventListener);
window.addEventListener("paper-route-rider-reset", () => {
  window.clearTimeout(riderResetTimer);
  rider.reset();
});

window.addEventListener("paper-route-state", ((event: CustomEvent) => {
  if (event.detail.state === "GAME_OVER") {
    window.clearTimeout(riderResetTimer);
    rider.setState("fail");
    stopMusic();
  }
}) as EventListener);

window.addEventListener("pagehide", () => {
  stopMusic(); ui.destroy(); rider.destroy(); game.destroy(true);
});
