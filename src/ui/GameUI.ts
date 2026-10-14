import { FeedbackSettings } from "../systems/FeedbackSystem";

export interface GameUIOptions {
  onStart(): void;
  onRestart(): void;
  settings: FeedbackSettings;
}

export class GameUI {
  private readonly onState = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    this.score.textContent = String(detail.score);
    this.best.textContent = String(detail.best);
    this.startPanel.hidden = detail.state !== "READY";
    this.gameoverPanel.hidden = detail.state !== "GAME_OVER";
    if (detail.state === "GAME_OVER") {
      this.final.textContent = String(detail.score);
      this.reason.textContent = String(detail.reason || "Missed delivery").replaceAll("-", " ");
      this.shell.classList.add("is-failed");
    } else this.shell.classList.remove("is-failed");
  };
  private readonly onFeedback = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    const success = detail.kind === "success";
    this.toast.textContent = success ? `+${detail.points}` : "MISS";
    this.toast.classList.remove("show", "success", "miss");
    void this.toast.offsetWidth;
    this.toast.classList.add("show", success ? "success" : "miss");
  };
  private readonly shell: HTMLElement;
  private readonly score: HTMLElement;
  private readonly best: HTMLElement;
  private readonly startPanel: HTMLElement;
  private readonly gameoverPanel: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly final: HTMLElement;
  private readonly reason: HTMLElement;
  private readonly settings: FeedbackSettings;

  constructor(root: HTMLElement, private readonly options: GameUIOptions) {
    this.settings = options.settings;
    root.innerHTML = `<div class="game-shell"><div id="game-canvas" aria-label="Paper Route Rush game"></div><div class="hud"><span>SCORE <b id="score">0</b></span><span>BEST <b id="best">0</b></span></div><div class="brand">PAPER ROUTE <strong>RUSH</strong></div><div id="delivery-toast" class="delivery-toast" aria-live="polite"></div><div class="panel start-panel"><h1>Paper Route Rush</h1><p>Swipe toward the yellow <b>paper</b> bubble<br>to deliver. Misses won’t end the ride.</p><button id="start">START RUN</button></div><div class="panel gameover-panel" hidden><small>ROUTE ENDED</small><h2 id="reason">Ride ended</h2><p>Score <b id="final">0</b></p><button id="restart">RIDE AGAIN</button></div><div class="settings"><button id="sound" aria-label="Toggle sound">SOUND ON</button><button id="vibration" aria-label="Toggle vibration">VIBE ON</button></div></div>`;
    this.shell = root.querySelector<HTMLElement>(".game-shell")!;
    this.score = root.querySelector<HTMLElement>("#score")!;
    this.best = root.querySelector<HTMLElement>("#best")!;
    this.startPanel = root.querySelector<HTMLElement>(".start-panel")!;
    this.gameoverPanel = root.querySelector<HTMLElement>(".gameover-panel")!;
    this.toast = root.querySelector<HTMLElement>("#delivery-toast")!;
    this.final = root.querySelector<HTMLElement>("#final")!;
    this.reason = root.querySelector<HTMLElement>("#reason")!;
    root.querySelector("#start")!.addEventListener("click", options.onStart);
    root.querySelector("#restart")!.addEventListener("click", options.onRestart);
    root.querySelector("#sound")!.addEventListener("click", () => { this.settings.setSound(!this.settings.value.sound); this.updateSettings(root); });
    root.querySelector("#vibration")!.addEventListener("click", () => { this.settings.setVibration(!this.settings.value.vibration); this.updateSettings(root); });
    window.addEventListener("paper-route-state", this.onState);
    window.addEventListener("paper-route-feedback", this.onFeedback);
    this.updateSettings(root);
  }

  private updateSettings(root: HTMLElement): void {
    const value = this.settings.value;
    root.querySelector("#sound")!.textContent = `SOUND ${value.sound ? "ON" : "OFF"}`;
    root.querySelector("#vibration")!.textContent = `VIBE ${value.vibration ? "ON" : "OFF"}`;
  }

  destroy(): void {
    window.removeEventListener("paper-route-state", this.onState);
    window.removeEventListener("paper-route-feedback", this.onFeedback);
    this.shell.remove();
  }
}
