import { describe, expect, it } from "vitest";
import { FeedbackSettings } from "../systems/FeedbackSystem";
import { GameSession } from "../core/GameSession";
import { GameUI } from "../ui/GameUI";

describe("complete game flow", () => {
  it("restarts repeatedly without retaining run state", () => {
    localStorage.clear();
    const game = new GameSession(localStorage);
    for (let i = 0; i < 3; i++) {
      game.start(); game.update(1200); game.fail("test"); game.reset();
      expect(game.snapshot()).toEqual({ state: "READY", score: 0, elapsedMs: 0, activeRequest: false });
    }
    expect(game.bestScore).toBe(1);
  });

  it("persists sound and vibration toggles", () => {
    localStorage.clear();
    const settings = new FeedbackSettings(localStorage);
    settings.setSound(false); settings.setVibration(false);
    expect(new FeedbackSettings(localStorage).value).toEqual({ sound: false, vibration: false });
  });

  it("keeps gameplay usable when saved settings cannot be written", () => {
    const storage = {
      getItem: () => null,
      setItem: () => { throw new Error("storage unavailable"); },
    } as unknown as Storage;
    const settings = new FeedbackSettings(storage);
    expect(() => settings.setSound(false)).not.toThrow();
    expect(() => settings.setVibration(false)).not.toThrow();
  });

  it("keeps delivery direction in-world without a global lane cue", () => {
    const root = document.createElement("main");
    const actions = { start: 0, restart: 0 };
    const ui = new GameUI(root, {
      onStart: () => actions.start++,
      onRestart: () => actions.restart++,
      settings: new FeedbackSettings(localStorage),
    });
    root.querySelector<HTMLButtonElement>("#start")!.click();
    expect(actions.start).toBe(1);
    window.dispatchEvent(new CustomEvent("paper-route-state", { detail: {
      state: "PLAYING", score: 10, best: 10, activeRequest: true, timing: "open", side: "left",
    } }));
    expect(root.querySelector("#delivery-cue")).toBeNull();
    expect(root.querySelector(".start-panel p")?.textContent?.toLowerCase()).not.toContain("green");
    window.dispatchEvent(new CustomEvent("paper-route-feedback", { detail: { kind: "success", points: 10 } }));
    expect(root.querySelector("#delivery-toast")?.textContent).toBe("+10");
    window.dispatchEvent(new CustomEvent("paper-route-state", { detail: {
      state: "GAME_OVER", score: 10, best: 10, activeRequest: false, reason: "missed",
    } }));
    expect((root.querySelector(".gameover-panel") as HTMLElement).hidden).toBe(false);
    expect(root.querySelector("#reason")?.textContent).toBe("missed");
    root.querySelector<HTMLButtonElement>("#restart")!.click();
    expect(actions.restart).toBe(1);
    ui.destroy();
  });
});
