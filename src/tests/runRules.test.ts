import { describe, expect, it } from "vitest";
import { SwipeInput } from "../systems/SwipeInput";
import { ScoreSystem } from "../systems/ScoreSystem";
import { difficultyAt, requestSideFor } from "../systems/DifficultySystem";
import { BestScoreStore } from "../utils/storage";

describe("run rules", () => {
  it("accepts one intentional horizontal swipe and ignores noise", () => {
    const input = new SwipeInput(48);
    input.begin(1, 100, 100);
    expect(input.end(1, 20, 110)).toBe("left");
    expect(input.end(1, 0, 100)).toBeNull();
    input.begin(2, 100, 100);
    expect(input.end(2, 112, 105)).toBeNull();
    input.begin(3, 100, 100);
    expect(input.end(3, 145, 190)).toBeNull();
    input.begin(4, 100, 100);
    expect(input.end(9, 180, 100)).toBeNull();
  });

  it("adds survival points and exactly ten delivery points", () => {
    const score = new ScoreSystem(1);
    score.update(2500);
    score.addDelivery();
    expect(score.score).toBe(12);
    score.reset();
    expect(score.score).toBe(0);
  });

  it("caps speed, request rate, and timing difficulty", () => {
    expect(difficultyAt(0, 0)).toEqual({ speed: 0.14, requestGapMs: 3600, windowDepth: 0.18, reactionSeconds: 2.65 });
    expect(difficultyAt(45_000, 3).reactionSeconds).toBeLessThan(2.2);
    expect(difficultyAt(999_999, 999)).toEqual({ speed: 0.33, requestGapMs: 1450, windowDepth: 0.1, reactionSeconds: 1.5 });
  });

  it("guides the first request then varies sides without strict alternation", () => {
    const sides = Array.from({ length: 8 }, (_, index) => requestSideFor(index));
    expect(sides[0]).toBe("left");
    expect(sides).toContain("right");
    expect(sides.some((side, index) => index > 0 && side === sides[index - 1])).toBe(true);
  });

  it("persists only valid best scores", () => {
    localStorage.clear();
    localStorage.setItem("paper-route-best", "19");
    const store = new BestScoreStore(localStorage);
    expect(store.load()).toBe(19);
    expect(localStorage.getItem("news-paper-boy-best")).toBe("19");
    store.save(27);
    store.save(20);
    expect(store.load()).toBe(27);
    localStorage.setItem("news-paper-boy-best", "broken");
    expect(store.load()).toBe(0);
  });

  it("returns a legacy best score even when migration storage is read-only", () => {
    const storage = {
      getItem: (key: string) => key === "paper-route-best" ? "23" : null,
      setItem: () => { throw new Error("read only"); },
    } as unknown as Storage;
    expect(() => new BestScoreStore(storage).load()).not.toThrow();
    expect(new BestScoreStore(storage).load()).toBe(23);
  });
});
