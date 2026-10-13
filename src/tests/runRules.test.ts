import { describe, expect, it } from "vitest";
import { SwipeInput } from "../systems/SwipeInput";
import { ScoreSystem } from "../systems/ScoreSystem";
import { difficultyAt } from "../systems/DifficultySystem";
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
    expect(difficultyAt(0)).toEqual({ speed: 0.16, requestGapMs: 3200, windowDepth: 0.17 });
    expect(difficultyAt(999_999)).toEqual({ speed: 0.32, requestGapMs: 1500, windowDepth: 0.1 });
  });

  it("persists only valid best scores", () => {
    localStorage.clear();
    const store = new BestScoreStore(localStorage);
    expect(store.load()).toBe(0);
    store.save(27);
    store.save(20);
    expect(store.load()).toBe(27);
    localStorage.setItem("paper-route-best", "broken");
    expect(store.load()).toBe(0);
  });
});
