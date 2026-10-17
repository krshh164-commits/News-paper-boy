import { FeedbackSettings } from "../systems/FeedbackSystem";

export interface GameUIOptions {
  onStart(): void;
  onRestart(): void;
  settings: FeedbackSettings;
}

export class GameUI {
  private startHideTimer = 0;
  private tutorialHideTimer = 0;
  private tutorialComplete = false;
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
    if (detail.state === "PLAYING" && !this.tutorialComplete) this.showTutorial();
    if (detail.state !== "PLAYING") this.tutorial.hidden = true;
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
    if (success) this.completeTutorial();
  };
  private readonly shell: HTMLElement;
  private readonly score: HTMLElement;
  private readonly best: HTMLElement;
  private readonly startPanel: HTMLElement;
  private readonly gameoverPanel: HTMLElement;
  private readonly tutorial: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly final: HTMLElement;
  private readonly finalBest: HTMLElement;
  private readonly reason: HTMLElement;
  private readonly settings: FeedbackSettings;

  constructor(root: HTMLElement, private readonly options: GameUIOptions) {
    this.settings = options.settings;
    try { this.tutorialComplete = sessionStorage.getItem("news-paper-boy-tutorial-complete") === "1"; } catch { this.tutorialComplete = false; }
    root.innerHTML = `<div class="game-shell"><div id="game-canvas" aria-label="NEWS PAPER BOY game"></div><div class="hud"><span>SCORE <b id="score">0</b></span><span>BEST <b id="best">0</b></span></div><div class="brand">NEWS PAPER <strong>BOY</strong></div><div id="delivery-toast" class="delivery-toast" aria-live="polite"></div><aside class="gameplay-tutorial" aria-live="polite" hidden><b>← बाएँ स्वाइप करें <i>•</i> दाएँ स्वाइप करें →</b><span>अख़बार सही घर तक पहुँचाएँ</span></aside><div class="panel start-panel" role="button" tabindex="0"><h1>NEWS PAPER <strong>BOY</strong></h1><p class="tap-instruction">शुरू करने के लिए टैप करें</p></div><div class="panel gameover-panel" role="button" tabindex="0" hidden><small>NEWS PAPER BOY</small><h2>ROUTE ENDED</h2><p id="reason">Ride ended</p><p>Score <b id="final">0</b> · Best <b id="final-best">0</b></p><p class="tap-instruction">फिर से शुरू करने के लिए टैप करें</p></div><div class="settings"><button id="help" aria-label="Show swipe help">?</button><button id="sound" aria-label="Toggle sound">SOUND ON</button><button id="vibration" aria-label="Toggle vibration">VIBE ON</button></div></div>`;
    this.shell = root.querySelector<HTMLElement>(".game-shell")!;
    this.score = root.querySelector<HTMLElement>("#score")!;
    this.best = root.querySelector<HTMLElement>("#best")!;
    this.startPanel = root.querySelector<HTMLElement>(".start-panel")!;
    this.gameoverPanel = root.querySelector<HTMLElement>(".gameover-panel")!;
    this.tutorial = root.querySelector<HTMLElement>(".gameplay-tutorial")!;
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
    root.querySelector("#help")!.addEventListener("click", () => {
      if (!this.tutorialComplete || this.tutorial.hidden || this.tutorial.classList.contains("is-complete")) this.showTutorial();
      else this.tutorial.hidden = true;
    });
    window.addEventListener("paper-route-state", this.onState);
    window.addEventListener("paper-route-feedback", this.onFeedback);
    this.updateSettings(root);
  }

  private showTutorial(): void {
    window.clearTimeout(this.tutorialHideTimer);
    this.tutorial.classList.remove("is-complete");
    this.tutorial.hidden = false;
  }

  private completeTutorial(): void {
    this.tutorialComplete = true;
    try { sessionStorage.setItem("news-paper-boy-tutorial-complete", "1"); } catch { /* tutorial still works without storage */ }
    if (this.tutorial.hidden) return;
    this.tutorial.classList.add("is-complete");
    this.tutorialHideTimer = window.setTimeout(() => { this.tutorial.hidden = true; }, 260);
  }

  private updateSettings(root: HTMLElement): void {
    const value = this.settings.value;
    root.querySelector("#sound")!.textContent = `SOUND ${value.sound ? "ON" : "OFF"}`;
    root.querySelector("#vibration")!.textContent = `VIBE ${value.vibration ? "ON" : "OFF"}`;
  }

  destroy(): void {
    window.clearTimeout(this.startHideTimer);
    window.clearTimeout(this.tutorialHideTimer);
    window.removeEventListener("paper-route-state", this.onState);
    window.removeEventListener("paper-route-feedback", this.onFeedback);
    this.shell.remove();
  }
}
