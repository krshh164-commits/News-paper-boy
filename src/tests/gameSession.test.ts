import { describe, expect, it } from "vitest";
import { DeliverySystem } from "../systems/DeliverySystem";
import { GameSession } from "../core/GameSession";

describe("delivery rules", () => {
  it("accepts the requested-side swipe any time its popup remains active", () => {
    const delivery = new DeliverySystem();
    for (const depth of [.8, .5, .2]) {
      delivery.schedule("left", 1);
      delivery.update(depth);
      expect(delivery.throw("left")).toBe("success");
    }
  });

  it("reports a wrong-side throw without ending the run", () => {
    const delivery = new DeliverySystem();
    delivery.schedule("left", 1);
    delivery.update(.5);
    expect(delivery.throw("right")).toBe("wrong-side");
  });

  it("keeps riding with no delivery bonus after a wrong-side throw", () => {
    localStorage.clear();
    const game = new GameSession(localStorage);
    game.start();
    game.schedule("left");
    const scoreBeforeThrow = game.score;

    expect(game.throw("right")).toBe("wrong-side");
    expect(game.state).toBe("PLAYING");
    expect(game.score).toBe(scoreBeforeThrow);
    expect(game.delivery.active).toBe(false);
  });

  it("treats an expired request as a miss while the run continues", () => {
    const game = new GameSession(localStorage);
    game.start();
    game.schedule("right", .5, .1);

    expect(game.setTargetDepth(.1)).toEqual(["missed"]);
    expect(game.state).toBe("PLAYING");
    expect(game.delivery.active).toBe(false);
  });

  it("fails unnecessary throws and missed requests", () => {
    const delivery = new DeliverySystem();
    expect(delivery.throw("left")).toBe("unnecessary");
    delivery.schedule("right", 1);
    expect(() => delivery.schedule("left", 1)).toThrow();
    expect(delivery.update(0.05)).toContain("missed");
  });

  it("runs, fails, saves best, and completely resets", () => {
    localStorage.clear();
    const game = new GameSession(localStorage);
    game.start();
    game.update(2500);
    game.schedule("right");
    game.setTargetDepth(0.5);
    expect(game.throw("right")).toBe("success");
    expect(game.score).toBe(12);
    game.fail("test");
    expect(game.bestScore).toBe(12);
    game.reset();
    expect(game.snapshot()).toEqual({ state: "READY", score: 0, elapsedMs: 0, activeRequest: false });
    expect(game.bestScore).toBe(12);
  });

  it("immediately starts a clean run when restarted", () => {
    const game = new GameSession(localStorage);
    game.start(); game.update(2000); game.fail("missed"); game.restart();
    expect(game.snapshot()).toEqual({ state: "PLAYING", score: 0, elapsedMs: 0, activeRequest: false });
  });

  it("clears a visible request when a run is reset", () => {
    const game = new GameSession(localStorage);
    game.start();
    game.schedule("left");
    game.reset();
    expect(game.snapshot().activeRequest).toBe(false);
    expect(game.throw("left")).toBe("unnecessary");
  });
});
