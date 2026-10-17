import { describe, expect, it } from "vitest";
import * as houseFacade from "../objects/HouseFacade";
import { createHouseArtworkPlan } from "../objects/HouseFacade";

describe("supplied house artwork projection", () => {
  it("provides a perspective plan for image facades", () => {
    expect(typeof (houseFacade as unknown as { createHouseArtworkPlan?: unknown }).createHouseArtworkPlan).toBe("function");
  });

  it("scales a supplied facade uniformly and keeps its door nearest the street", () => {
    const left = createHouseArtworkPlan("courtyard", "left", .5, 0);
    const right = createHouseArtworkPlan("courtyard", "right", .5, 0);
    const far = createHouseArtworkPlan("courtyard", "left", .25, 0);

    expect(left.width).toBe(92);
    expect(left.height).toBeCloseTo(101.64, 1);
    expect(left.x).toBe(-92);
    expect(left.flipX).toBe(false);
    expect(left.door.x + left.door.width / 2).toBeGreaterThan(-46);
    expect(right.x).toBe(0);
    expect(right.flipX).toBe(true);
    expect(right.door.x + right.door.width / 2).toBeLessThan(46);
    expect(left.width / far.width).toBe(2);
    expect(left.height / far.height).toBe(2);
  });
});
