import Phaser from "phaser";
import { RiderView, type RiderState } from "./render/RiderView";
import { createGameConfig, GameScene } from "./scenes/GameScene";
import { FeedbackSettings, type SoundCue } from "./systems/FeedbackSystem";
import { GameAudioSystem } from "./systems/GameAudioSystem";
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
const audio = new GameAudioSystem(feedback.value.sound);

game = new Phaser.Game(createGameConfig(app.querySelector<HTMLElement>("#game-canvas")!));

window.addEventListener("paper-route-rider", ((event: CustomEvent<RiderState>) => {
  window.clearTimeout(riderResetTimer);
  rider.setState(event.detail);
  if (event.detail.startsWith("throw")) feedback.play("throw");
  feedback.pulse(event.detail === "fail" ? [70, 40, 110] : 35);
  if (event.detail.startsWith("throw")) riderResetTimer = window.setTimeout(() => {
    if (rider.currentState !== "fail") rider.setState("ride");
  }, 240);
}) as EventListener);
window.addEventListener("paper-route-feedback", ((event: CustomEvent) => {
  if (event.detail.kind === "wrong") feedback.play("wrong");
}) as EventListener);
window.addEventListener("paper-route-paper-arrived", () => {
  feedback.play("success");
  window.setTimeout(() => feedback.play("reward"), 70);
});
window.addEventListener("news-paper-boy-request", () => feedback.play("request"));
window.addEventListener("paper-route-audio", ((event: CustomEvent<{ kind: SoundCue }>) => audio.play(event.detail.kind)) as EventListener);
window.addEventListener("paper-route-run", ((event: CustomEvent<"start" | "stop">) => {
  if (event.detail === "start") { audio.unlock(); audio.start(.14); feedback.play("start"); } else audio.stop();
}) as EventListener);
window.addEventListener("paper-route-speed", ((event: CustomEvent<number>) => audio.setSpeed(event.detail)) as EventListener);
window.addEventListener("paper-route-sound-setting", ((event: CustomEvent<boolean>) => audio.setEnabled(event.detail)) as EventListener);
window.addEventListener("paper-route-rider-reset", () => {
  window.clearTimeout(riderResetTimer);
  rider.reset();
});

window.addEventListener("paper-route-state", ((event: CustomEvent) => {
  if (event.detail.state === "GAME_OVER") {
    window.clearTimeout(riderResetTimer);
    rider.setState("fail");
    audio.gameOver();
  }
}) as EventListener);

window.addEventListener("pagehide", () => {
  audio.destroy(); ui.destroy(); rider.destroy(); game.destroy(true);
});
