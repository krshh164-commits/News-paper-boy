import { FeedbackSettings } from "../systems/FeedbackSystem";

export interface GameUIOptions {
  onStart(): void;
  onRestart(): void;
  settings: FeedbackSettings;
}

export class GameUI {
  private startHideTimer = 0;
  private readonly onState = (event: Event): void => {
    const detail = (event as CustomEvent).detail;
    this.score.textContent = String(detail.score);
    this.best.textContent = String(detail.best);
    if (detail.state === "READY") {
      window.clearTimeout(this.startHideTimer);
      this.startPanel.hidden = false;
      this.startPanel.classList.remove("is-running");
    } else if (detail.state === "PLAYING" && !this.startPanel.hidden) {
      this.startPanel.classList.add("is-running");
      this.startHideTimer = window.setTimeout(() => { this.startPanel.hidden = true; }, 320);
    } else if (detail.state === "GAME_OVER") this.startPanel.hidden = true;
    this.gameoverPanel.hidden = detail.state !== "GAME_OVER";
    if (detail.state === "GAME_OVER") {
      this.final.textContent = String(detail.score);
      this.finalBest.textContent = String(detail.best);
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
  private readonly finalBest: HTMLElement;
  private readonly reason: HTMLElement;
  private readonly settings: FeedbackSettings;

  constructor(root: HTMLElement, private readonly options: GameUIOptions) {
    this.settings = options.settings;
    root.innerHTML = `<div class="game-shell"><div id="game-canvas" aria-label="Paper Route Rush game"></div><div class="hud"><span>SCORE <b id="score">0</b></span><span>BEST <b id="best">0</b></span></div><div class="brand">PAPER ROUTE <strong>RUSH</strong></div><div id="delivery-toast" class="delivery-toast" aria-live="polite"></div><div class="panel start-panel" role="button" tabindex="0"><h1>Paper Route Rush</h1><p class="hindi-instruction"><b>← बाएँ या दाएँ →</b><br>स्वाइप करके अख़बार फेंकें</p><p class="tap-instruction">शुरू करने के लिए टैप करें</p></div><div class="panel gameover-panel" role="button" tabindex="0" hidden><small>ROUTE ENDED</small><h2 id="reason">Ride ended</h2><p>Score <b id="final">0</b> · Best <b id="final-best">0</b></p><p class="tap-instruction">फिर से शुरू करने के लिए टैप करें</p></div><div class="settings"><button id="sound" aria-label="Toggle sound">SOUND ON</button><button id="vibration" aria-label="Toggle vibration">VIBE ON</button></div></div>`;
    this.shell = root.querySelector<HTMLElement>(".game-shell")!;
    this.score = root.querySelector<HTMLElement>("#score")!;
    this.best = root.querySelector<HTMLElement>("#best")!;
    this.startPanel = root.querySelector<HTMLElement>(".start-panel")!;
    this.gameoverPanel = root.querySelector<HTMLElement>(".gameover-panel")!;
    this.toast = root.querySelector<HTMLElement>("#delivery-toast")!;
    this.final = root.querySelector<HTMLElement>("#final")!;
    this.finalBest = root.querySelector<HTMLElement>("#final-best")!;
    this.reason = root.querySelector<HTMLElement>("#reason")!;
    this.startPanel.addEventListener("click", options.onStart);
    this.gameoverPanel.addEventListener("click", options.onRestart);
    this.startPanel.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") options.onStart(); });
    this.gameoverPanel.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") options.onRestart(); });
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
    window.clearTimeout(this.startHideTimer);
    window.removeEventListener("paper-route-state", this.onState);
    window.removeEventListener("paper-route-feedback", this.onFeedback);
    this.shell.remove();
  }
}
