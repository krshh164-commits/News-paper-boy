import Phaser from "phaser";
import { RiderView, type RiderState } from "./render/RiderView";
import { createGameConfig, GameScene } from "./scenes/GameScene";
import { FeedbackSettings } from "./systems/FeedbackSystem";
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

game = new Phaser.Game(createGameConfig(app.querySelector<HTMLElement>("#game-canvas")!));

window.addEventListener("paper-route-rider", ((event: CustomEvent<RiderState>) => {
  window.clearTimeout(riderResetTimer);
  rider.setState(event.detail);
  feedback.play(event.detail === "fail" ? "fail" : "throw");
  feedback.pulse(event.detail === "fail" ? [70, 40, 110] : 35);
  if (event.detail.startsWith("throw")) riderResetTimer = window.setTimeout(() => {
    if (rider.currentState !== "fail") rider.setState("ride");
  }, 240);
}) as EventListener);
window.addEventListener("paper-route-feedback", () => feedback.play("success"));
window.addEventListener("paper-route-rider-reset", () => {
  window.clearTimeout(riderResetTimer);
  rider.reset();
});

window.addEventListener("paper-route-state", ((event: CustomEvent) => {
  if (event.detail.state === "GAME_OVER") {
    window.clearTimeout(riderResetTimer);
    rider.setState("fail");
  }
}) as EventListener);

window.addEventListener("pagehide", () => {
  ui.destroy(); rider.destroy(); game.destroy(true);
});
